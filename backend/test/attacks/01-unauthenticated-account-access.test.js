/*
 * Attack 1 — Alter someone else's account without logging in.
 *
 * With no session cookie, try to list users (GET /api/users), read one (GET /api/users/:id),
 * change their details (PUT /api/users/:id) and delete them (DELETE /api/users/:id).
 *
 * PASS = every one of those requests is refused (401/403).
 * Each route is its own subtest, so the report lists every route that let the request through.
 */

import test, { before } from 'node:test'
import assert from 'node:assert/strict'
import { api, isServerUp, SERVER_DOWN_MESSAGE, newAccount, deleteAccount, summarize } from './helpers.js'

let serverUp = false
before(async () => {
    serverUp = await isServerUp()
})

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
                list.status === 401 || list.status === 403,
                `GET /api/users should require login but returned ${summarize(list)}.`,
            )
        })

        await t.test('GET /api/users/:id (read one user)', async () => {
            const read = await api('GET', `/api/users/${victim.id}`)
            assert.ok(
                read.status === 401 || read.status === 403,
                `GET /api/users/:id should require login but returned ${summarize(read)}.`,
            )
        })

        await t.test('PUT /api/users/:id (change their email)', async () => {
            const change = await api('PUT', `/api/users/${victim.id}`, {
                body: { email: `hacked-${Date.now()}@attack.test`, displayName: 'hacked' },
            })
            assert.ok(
                change.status === 401 || change.status === 403,
                `PUT /api/users/:id changed an account with no login (${summarize(change)}).`,
            )
        })

        await t.test('DELETE /api/users/:id (delete the account)', async () => {
            const remove = await api('DELETE', `/api/users/${victim.id}`)
            assert.ok(
                remove.status === 401 || remove.status === 403,
                `DELETE /api/users/:id deleted an account with no login (${summarize(remove)}).`,
            )
        })
    } finally {
        await deleteAccount(victim)
    }
})
