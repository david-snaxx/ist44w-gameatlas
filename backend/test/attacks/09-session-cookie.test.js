/*
 * Attack 9 — Session cookie attacks.
 *
 * Reuse a login cookie after logging out and after deleting the account, and send forged/tampered
 * cookies. Also check the login cookie's own flags.
 *
 * PASS = every stale, forged or unsigned cookie is treated as not-logged-in (401), and the login
 * cookie is HttpOnly (not readable by page scripts) and signed.
 * Each check is its own subtest (run in order, since some depend on logging out first).
 */

import test, { before } from 'node:test'
import assert from 'node:assert/strict'
import { api, isServerUp, SERVER_DOWN_MESSAGE, newAccount, deleteAccount, logIn, summarize } from './helpers.js'

let serverUp = false
before(async () => {
    serverUp = await isServerUp()
})

test('stale, forged and unsigned session cookies are rejected', async (t) => {
    if (!serverUp) {
        t.skip(SERVER_DOWN_MESSAGE)
        return
    }

    const owner = await newAccount('session')
    let deletedAlready = false
    try {
        const login = await logIn(owner)
        assert.equal(login.status, 200, `Setup: login failed (${summarize(login)}).`)

        // sanity: the cookie works while logged in (nothing below means anything if it doesn't)
        const me = await api('GET', '/api/users/me', { cookie: owner.cookie })
        assert.equal(me.status, 200, `Setup: the session cookie did not work (${summarize(me)}).`)

        await t.test('the login cookie is HttpOnly and signed', async () => {
            const rawCookie = login.setCookies.find((cookie) => cookie.startsWith('connect.sid='))
            assert.ok(rawCookie, 'Login did not set a connect.sid cookie.')
            assert.match(rawCookie, /HttpOnly/i, 'The session cookie is not HttpOnly — page scripts could read it.')
            assert.ok(
                rawCookie.includes('connect.sid=s%3A') || rawCookie.includes('connect.sid=s:'),
                'The session cookie is not signed (no "s:" prefix).',
            )
        })

        await t.test('the old cookie stops working after logout', async () => {
            await api('POST', '/api/users/logout', { cookie: owner.cookie })
            const afterLogout = await api('GET', '/api/users/me', { cookie: owner.cookie })
            assert.equal(afterLogout.status, 401, `The old cookie still worked after logout (${summarize(afterLogout)}).`)
        })

        await t.test('a made-up signed cookie is refused', async () => {
            const forged = 'connect.sid=s%3Aforged-session-id.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
            const forgedResult = await api('GET', '/api/users/me', { cookie: forged })
            assert.equal(forgedResult.status, 401, `A forged cookie was accepted (${summarize(forgedResult)}).`)
        })

        await t.test('an unsigned cookie is refused', async () => {
            const unsigned = 'connect.sid=not-even-signed'
            const unsignedResult = await api('GET', '/api/users/me', { cookie: unsigned })
            assert.equal(unsignedResult.status, 401, `An unsigned cookie was accepted (${summarize(unsignedResult)}).`)
        })

        await t.test('the cookie stops working once the account is deleted', async () => {
            const relogin = await logIn(owner)
            assert.equal(relogin.status, 200, `Setup: re-login failed (${summarize(relogin)}).`)
            const freshCookie = owner.cookie
            const del = await api('DELETE', '/api/users/me', { cookie: freshCookie, body: { password: owner.password } })
            assert.equal(del.status, 204, `Setup: account delete failed (${summarize(del)}).`)
            deletedAlready = true

            const afterDelete = await api('GET', '/api/users/me', { cookie: freshCookie })
            assert.equal(
                afterDelete.status,
                401,
                `The cookie still worked after the account was deleted (${summarize(afterDelete)}).`,
            )
        })
    } finally {
        if (!deletedAlready) {
            await deleteAccount(owner)
        }
    }
})
