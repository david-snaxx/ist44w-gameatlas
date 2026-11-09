/*
 * Attack 1 — Alter someone else's account without logging in.
 *
 * With no session cookie, try to list users (GET /api/users), read one (GET /api/users/:id),
 * change their details (PUT /api/users/:id) and delete them (DELETE /api/users/:id).
 *
 * PASS = every one of those requests is refused (401/403), or answers 404 because the route doesn't exist.
 * The server only offers the /me versions, which act on the logged-in user, so 404 is the expected answer.
 * Each route is its own subtest, so the report lists every route that let the request through.
 */

import test, { before } from 'node:test'
import assert from 'node:assert/strict'
import { api, isServerUp, SERVER_DOWN_MESSAGE, newAccount, deleteAccount, summarize } from './helpers.js'

let serverUp = false
before(async () => {
    serverUp = await isServerUp()
})

/** True when the server refused the request (401/403) or has no such route (404). */
function isRefused(status) {
    return status === 401 || status === 403 || status === 404
}

test('account routes refuse unauthenticated callers', async (t) => {
    if (!serverUp) {
        t.skip(SERVER_DOWN_MESSAGE)
        return
    }

    const victim = await newAccount('victim')
    try {
        await t.test('GET /api/users (list every user)', async () => {
            const list = await api('GET', '/api/users')
            assert.ok(
                isRefused(list.status),
                `GET /api/users should require login but returned ${summarize(list)}.`,
            )
        })

        await t.test('GET /api/users/:id (read one user)', async () => {
            const read = await api('GET', `/api/users/${victim.id}`)
            assert.ok(
                isRefused(read.status),
                `GET /api/users/:id should require login but returned ${summarize(read)}.`,
            )
        })

        await t.test('PUT /api/users/:id (change their email)', async () => {
            const change = await api('PUT', `/api/users/${victim.id}`, {
                body: { email: `hacked-${Date.now()}@attack.test`, displayName: 'hacked' },
            })
            assert.ok(
                isRefused(change.status),
                `PUT /api/users/:id changed an account with no login (${summarize(change)}).`,
            )
        })

        await t.test('DELETE /api/users/:id (delete the account)', async () => {
            const remove = await api('DELETE', `/api/users/${victim.id}`)
            assert.ok(
                isRefused(remove.status),
                `DELETE /api/users/:id deleted an account with no login (${summarize(remove)}).`,
            )
        })
    } finally {
        await deleteAccount(victim)
    }
})
