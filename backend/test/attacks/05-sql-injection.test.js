/*
 * Attack 5 — SQL injection.
 *
 * Put classic SQL payloads everywhere a value reaches a query: the login form, a sign-up display name,
 * a project name, an asset value, an asset ID, and the URL itself (a query parameter and a path part).
 *
 * PASS = the payloads never log anyone in, text values are stored exactly as typed, IDs and URLs with
 * a payload find nothing (400/404), and every table still works afterwards.
 * Each case is its own subtest, so the report shows every place a payload got through.
 */

import test, { before } from 'node:test'
import assert from 'node:assert/strict'
import {
    api,
    isServerUp,
    SERVER_DOWN_MESSAGE,
    newAccount,
    deleteAccount,
    logIn,
    createProject,
    createBlueprint,
    createAsset,
    ITEM_BLUEPRINT,
    TEST_PASSWORD,
    randomSuffix,
    summarize,
} from './helpers.js'

let serverUp = false
before(async () => {
    serverUp = await isServerUp()
})

/** Tries to make a WHERE clause always true. */
const OR_PAYLOAD = "' OR '1'='1"

/** Tries to end the query and run a second one that deletes the users table. */
const DROP_PAYLOAD = "'; DROP TABLE users; --"

test('SQL payloads are treated as plain text and tables stay intact', async (t) => {
    if (!serverUp) {
        t.skip(SERVER_DOWN_MESSAGE)
        return
    }

    const owner = await newAccount('sqli')
    try {
        await logIn(owner)
        const project = await createProject(owner.cookie, `sqli-${randomSuffix()}`)
        await createBlueprint(owner.cookie, project.id, ITEM_BLUEPRINT)
        const pid = encodeURIComponent(project.id)

        for (const payload of [OR_PAYLOAD, DROP_PAYLOAD]) {
            await t.test(`login with ${payload} as email and password`, async () => {
                const attempt = await api('POST', '/api/users/login', { body: { email: payload, password: payload } })
                assert.notEqual(attempt.status, 200, `A SQL payload in the login form authenticated (${summarize(attempt)}).`)
            })
        }

        await t.test('a display name is stored exactly as typed', async () => {
            const account = {
                email: `sqli-name-${randomSuffix()}@attack.test`,
                password: TEST_PASSWORD,
                id: '',
            }
            const signup = await api('POST', '/api/users', {
                body: { email: account.email, password: account.password, displayName: DROP_PAYLOAD },
            })
            account.id = signup.body?.id ?? ''
            try {
                assert.equal(signup.status, 201, `Sign-up with a payload display name failed (${summarize(signup)}).`)
                assert.equal(
                    signup.body.displayName,
                    DROP_PAYLOAD,
                    `The display name was not stored as typed (got ${JSON.stringify(signup.body.displayName)}).`,
                )
            } finally {
                await deleteAccount(account)
            }
        })

        await t.test('a project name is stored exactly as typed', async () => {
            const payloadProject = await createProject(owner.cookie, DROP_PAYLOAD)
            console.log(`Stored project name: ${JSON.stringify(payloadProject.name)}`)
            assert.equal(
                payloadProject.name,
                DROP_PAYLOAD,
                `The project name was not stored as typed (got ${JSON.stringify(payloadProject.name)}).`,
            )
        })

        await t.test('an asset value is stored exactly as typed', async () => {
            const asset = await createAsset(owner.cookie, project.id, {
                key: 'sqli_item',
                schemaId: 'item',
                data: { name: OR_PAYLOAD, power: 0 },
            })
            const readBack = await api('GET', `/api/assets/${asset.id}?projectId=${pid}`, { cookie: owner.cookie })
            console.log(`Stored asset value: ${JSON.stringify(readBack.body?.data?.name)}`)
            assert.equal(
                readBack.body?.data?.name,
                OR_PAYLOAD,
                `The asset value was not stored as typed (got ${JSON.stringify(readBack.body?.data?.name)}).`,
            )
        })

        await t.test('an asset ID with a payload is refused', async () => {
            const result = await api('POST', '/api/assets', {
                cookie: owner.cookie,
                body: { projectId: project.id, key: DROP_PAYLOAD, schemaId: 'item', data: { name: 'X', power: 0 } },
            })
            assert.equal(result.status, 400, `An asset ID with a SQL payload was not refused (${summarize(result)}).`)
        })

        await t.test('a payload as the projectId in the URL finds nothing', async () => {
            const result = await api('GET', `/api/assets?projectId=${encodeURIComponent(OR_PAYLOAD)}`, {
                cookie: owner.cookie,
            })
            assert.equal(result.status, 404, `A payload projectId did not answer 404 (${summarize(result)}).`)
        })

        await t.test('a payload as the blueprint ID in the URL path finds nothing', async () => {
            const result = await api('GET', `/api/blueprints/${encodeURIComponent(OR_PAYLOAD)}?projectId=${pid}`, {
                cookie: owner.cookie,
            })
            assert.equal(result.status, 404, `A payload blueprint ID did not answer 404 (${summarize(result)}).`)
        })

        await t.test('a payload as the asset ID in the URL path finds nothing', async () => {
            const result = await api('GET', `/api/assets/${encodeURIComponent(OR_PAYLOAD)}?projectId=${pid}`, {
                cookie: owner.cookie,
            })
            assert.equal(result.status, 404, `A payload asset ID did not answer 404 (${summarize(result)}).`)
        })

        await t.test('every table still works afterwards', async () => {
            const check = await newAccount('sqli-check')
            try {
                await logIn(check)
                const me = await api('GET', '/api/users/me', { cookie: check.cookie })
                assert.equal(me.status, 200, `The users table may be damaged: a fresh login failed (${summarize(me)}).`)
                const projects = await api('GET', '/api/projects', { cookie: check.cookie })
                assert.equal(projects.status, 200, `The projects table may be damaged (${summarize(projects)}).`)
            } finally {
                await deleteAccount(check)
            }

            const assets = await api('GET', `/api/assets?projectId=${pid}`, { cookie: owner.cookie })
            assert.equal(assets.status, 200, `The assets table may be damaged (${summarize(assets)}).`)
        })
    } finally {
        await deleteAccount(owner)
    }
})
