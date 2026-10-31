/*
 * Shared helpers for the attack test scripts.
 *
 * Every script talks to a RUNNING GameAtlas backend over HTTP (no app import), so before running any
 * of them: start MySQL (Windows service MySQL84) and run `npm run dev` in backend/. Point at another
 * host with the GAMEATLAS_URL environment variable.
 *
 * These scripts follow the project's "test fails when the attack works" rule: a failing assertion means
 * the attack got through. They create throwaway accounts (…@attack.test) and clean them up when done.
 */

import { randomUUID } from 'node:crypto'

/** Where the backend is. Override with GAMEATLAS_URL to point somewhere else. */
export const BASE_URL = process.env.GAMEATLAS_URL ?? 'http://localhost:3000'

/** Where the app opens in a browser, for the links printed for browser checks. Override with GAMEATLAS_APP_URL. */
export const APP_URL = process.env.GAMEATLAS_APP_URL ?? 'http://localhost:5173'

/**
 * True when KEEP_ATTACK_DATA=1: scripts with a browser check then leave their throwaway account in place and
 * print how to log in to it, so the check can still be done after the script ends.
 */
export const KEEP_DATA = process.env.KEEP_ATTACK_DATA === '1'

/** A password that always passes the backend's rule (8+ characters, under 72 bytes). */
export const TEST_PASSWORD = 'Attack-Test-123'

/** The message a script prints when the backend isn't reachable, so a down server never looks like a finding. */
export const SERVER_DOWN_MESSAGE =
    `Backend not reachable at ${BASE_URL}. Start MySQL (service MySQL84) and run \`npm run dev\` in backend/, then rerun.`

/** A small, valid blueprint used as the baseline that the asset attacks build on. */
export const ITEM_BLUEPRINT = {
    id: 'item',
    name: 'Item',
    description: 'Baseline blueprint for the attack tests.',
    fields: [
        { key: 'name', label: 'Name', type: 'string', required: true, maxLength: 64 },
        { key: 'power', label: 'Power', type: 'int', min: 0, default: 0 },
        { key: 'ally', label: 'Ally', type: 'reference', targetSchema: 'item' },
    ],
}

/**
 * Sends one request to the backend and reads its answer. Never throws on a non-2xx status.
 * Returns { status, body, rawText, contentType, cookie, setCookies }.
 * options: { body, rawBody, cookie, headers } where `body` is sent as JSON, `rawBody` is sent as-is
 * (for malformed-input tests), and `cookie` is a "connect.sid=…" string to send back.
 */
export async function api(method, path, options = {}) {
    const headers = {}
    if (options.headers) {
        Object.assign(headers, options.headers)
    }

    let payload
    if (options.rawBody !== undefined) {
        payload = options.rawBody
        if (headers['Content-Type'] === undefined) {
            headers['Content-Type'] = 'application/json'
        }
    } else if (options.body !== undefined) {
        headers['Content-Type'] = 'application/json'
        payload = JSON.stringify(options.body)
    }

    if (options.cookie) {
        headers['Cookie'] = options.cookie
    }

    const response = await fetch(`${BASE_URL}${path}`, { method: method, headers: headers, body: payload })

    const rawText = await response.text()
    let body = null
    if (rawText !== '') {
        try {
            body = JSON.parse(rawText)
        } catch {
            body = null
        }
    }

    const setCookies = response.headers.getSetCookie()
    return {
        status: response.status,
        body: body,
        rawText: rawText,
        contentType: response.headers.get('content-type') ?? '',
        setCookies: setCookies,
        cookie: sessionCookieFrom(setCookies),
    }
}

/** Pulls the "connect.sid=…" name=value pair out of a Set-Cookie list, or '' when there isn't one. */
export function sessionCookieFrom(setCookies) {
    for (const raw of setCookies) {
        if (raw.startsWith('connect.sid=')) {
            // keep only the name=value part; drop Path, HttpOnly and the rest after the first ';'
            return raw.split(';')[0]
        }
    }
    return ''
}

/** True when the backend answers GET /api/health at all (any status). Used to skip when it's down. */
export async function isServerUp() {
    try {
        await fetch(`${BASE_URL}/api/health`)
        return true
    } catch {
        return false
    }
}

/** A short random string, so throwaway accounts and projects never collide. */
export function randomSuffix() {
    return randomUUID().slice(0, 8)
}

/**
 * A short, readable summary of a result for assertion messages. Not called `describe`, because node:test has its
 * own `describe` (for grouping tests) and the two would be easy to mix up.
 */
export function summarize(result) {
    let bodyText = result.rawText
    if (bodyText && bodyText.length > 200) {
        bodyText = `${bodyText.slice(0, 200)}…`
    }
    return `status ${result.status}, body ${bodyText}`
}

/**
 * Signs up a throwaway account and returns { email, password, displayName, id, cookie }.
 * `cookie` stays empty until logIn() is called. Throws when signup fails, so a broken setup is obvious.
 */
export async function newAccount(prefix = 'atk') {
    const suffix = randomSuffix()
    const account = {
        email: `${prefix}-${suffix}@attack.test`,
        password: TEST_PASSWORD,
        displayName: `${prefix}-${suffix}`,
        id: '',
        cookie: '',
    }

    const result = await api('POST', '/api/users', {
        body: { email: account.email, password: account.password, displayName: account.displayName },
    })
    if (result.status !== 201) {
        throw new Error(`Setup failed: could not create throwaway account (${summarize(result)}).`)
    }
    account.id = result.body?.id ?? ''
    return account
}

/** Logs an account in and stores its session cookie on the account object. Returns the login result. */
export async function logIn(account) {
    const result = await api('POST', '/api/users/login', {
        body: { email: account.email, password: account.password },
    })
    if (result.cookie) {
        account.cookie = result.cookie
    }
    return result
}

/**
 * Best-effort cleanup for a throwaway account: logs in and deletes it through DELETE /me (which also
 * removes projects nobody else is in), then falls back to the open DELETE /:id route. Never throws.
 */
export async function deleteAccount(account) {
    try {
        const login = await logIn(account)
        if (login.cookie) {
            const deleted = await api('DELETE', '/api/users/me', {
                cookie: login.cookie,
                body: { password: account.password },
            })
            if (deleted.status === 204) {
                return
            }
        }
    } catch {
        // fall through to the open route below
    }

    if (account.id) {
        try {
            await api('DELETE', `/api/users/${account.id}`)
        } catch {
            // nothing more we can do; this is only cleanup
        }
    }
}

/** Creates a non-personal project as the logged-in owner and returns its row. Throws on failure. */
export async function createProject(cookie, name) {
    const result = await api('POST', '/api/projects', { cookie: cookie, body: { name: name, personal: false } })
    if (result.status !== 201) {
        throw new Error(`Setup failed: could not create project (${summarize(result)}).`)
    }
    return result.body
}

/** Saves a blueprint in a project and returns it. Throws on failure. */
export async function createBlueprint(cookie, projectId, blueprint) {
    const body = {
        projectId: projectId,
        id: blueprint.id,
        name: blueprint.name,
        description: blueprint.description,
        fields: blueprint.fields,
    }
    const result = await api('POST', '/api/blueprints', { cookie: cookie, body: body })
    if (result.status !== 201) {
        throw new Error(`Setup failed: could not create blueprint (${summarize(result)}).`)
    }
    return result.body
}

/** Saves an asset in a project and returns it. Throws on failure. */
export async function createAsset(cookie, projectId, asset) {
    const body = { projectId: projectId, key: asset.key, schemaId: asset.schemaId, data: asset.data }
    const result = await api('POST', '/api/assets', { cookie: cookie, body: body })
    if (result.status !== 201) {
        throw new Error(`Setup failed: could not create asset (${summarize(result)}).`)
    }
    return result.body
}

/** A small, valid dialogue (Start → one Line → End) for tests that need one to exist. */
export function simpleDialogue(key, name) {
    return {
        key: key,
        name: name,
        description: '',
        speakerBlueprint: '',
        itemBlueprint: '',
        nodes: [
            { id: 'start', type: 'start', position: { x: 0, y: 0 }, data: {} },
            { id: 'line_1', type: 'line', position: { x: 200, y: 0 }, data: { speaker: '', text: 'Hello.' } },
            { id: 'end_1', type: 'end', position: { x: 400, y: 0 }, data: {} },
        ],
        edges: [
            { id: 'start:next->line_1', source: 'start', sourceHandle: 'next', target: 'line_1' },
            { id: 'line_1:next->end_1', source: 'line_1', sourceHandle: 'next', target: 'end_1' },
        ],
    }
}

/** Saves a dialogue in a project and returns it. Throws on failure. */
export async function createDialogue(cookie, projectId, dialogue) {
    const body = {
        projectId: projectId,
        key: dialogue.key,
        name: dialogue.name,
        description: dialogue.description,
        speakerBlueprint: dialogue.speakerBlueprint,
        itemBlueprint: dialogue.itemBlueprint,
        nodes: dialogue.nodes,
        edges: dialogue.edges,
    }
    const result = await api('POST', '/api/dialogues', { cookie: cookie, body: body })
    if (result.status !== 201) {
        throw new Error(`Setup failed: could not create dialogue (${summarize(result)}).`)
    }
    return result.body
}

/** Prints how to log in to a throwaway account that a script kept (KEEP_ATTACK_DATA=1) for a browser check. */
export function printKeptAccount(account) {
    console.log(`Kept for the browser check. Log in at ${APP_URL}/login as ${account.email} / ${account.password}.`)
    console.log('Delete the account from its Account page when you are done.')
}
