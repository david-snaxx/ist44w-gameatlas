/*
 * Attack 2 — Brute force a password.
 *
 * Send a few hundred wrong passwords in a row against one real account.
 *
 * PASS = the server starts refusing attempts somewhere in that chain (a 429 or 503 instead of the
 * usual 401), i.e. rate limiting or a lockout kicks in.
 * A FAILING assertion means every attempt was processed — no throttling.
 *
 * Tune the count with BRUTE_FORCE_ATTEMPTS (default 300). Each attempt runs one bcrypt compare on the
 * server, so a few hundred take a little while.
 */

import test, { before } from 'node:test'
import assert from 'node:assert/strict'
import { api, isServerUp, SERVER_DOWN_MESSAGE, newAccount, deleteAccount } from './helpers.js'

let serverUp = false
before(async () => {
    serverUp = await isServerUp()
})

test('repeated wrong passwords get throttled', async (t) => {
    if (!serverUp) {
        t.skip(SERVER_DOWN_MESSAGE)
        return
    }

    const attempts = Number(process.env.BRUTE_FORCE_ATTEMPTS ?? '300')
    const target = await newAccount('bruteforce')
    try {
        let blockedAt = 0
        let lastStatus = 0
        for (let i = 1; i <= attempts; i++) {
            const result = await api('POST', '/api/users/login', {
                body: { email: target.email, password: `wrong-password-${i}` },
            })
            lastStatus = result.status
            // a throttled server answers 429 (too many requests) or 503 instead of 401
            if (result.status === 429 || result.status === 503) {
                blockedAt = i
                break
            }
        }

        let blockedText = 'never'
        if (blockedAt > 0) {
            blockedText = `attempt ${blockedAt}`
        }
        console.log(`Tried up to ${attempts} wrong passwords; last status ${lastStatus}; first blocked at ${blockedText}.`)

        assert.ok(
            blockedAt > 0,
            `The server never started refusing wrong passwords across ${attempts} attempts — no rate limiting or lockout.`,
        )
    } finally {
        await deleteAccount(target)
    }
})
