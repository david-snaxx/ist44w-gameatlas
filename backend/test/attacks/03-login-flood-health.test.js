/*
 * Attack 3 — Slow the server down with many logins at once.
 *
 * Fire many login attempts for a real email all at once (a wrong password still makes the server run a
 * full bcrypt compare), and measure how long GET /api/health takes before and during the flood.
 *
 * PASS = health stays responsive during the flood AND extra logins are refused (like brute force).
 * The two checks are separate subtests, so a slow health check doesn't hide whether logins were refused.
 *
 * Tune with FLOOD_COUNT (default 100) and FLOOD_HEALTH_LIMIT_MS (default 1000).
 */

import test, { before } from 'node:test'
import assert from 'node:assert/strict'
import { api, isServerUp, SERVER_DOWN_MESSAGE, newAccount, deleteAccount } from './helpers.js'

let serverUp = false
before(async () => {
    serverUp = await isServerUp()
})

/** The median time, in whole milliseconds, of `samples` back-to-back GET /api/health calls. */
async function medianHealthMs(samples) {
    const times = []
    for (let i = 0; i < samples; i++) {
        const start = performance.now()
        await api('GET', '/api/health')
        times.push(performance.now() - start)
    }
    times.sort((a, b) => a - b)
    return Math.round(times[Math.floor(times.length / 2)])
}

test('health stays fast and extra logins are refused during a flood', async (t) => {
    if (!serverUp) {
        t.skip(SERVER_DOWN_MESSAGE)
        return
    }

    const floodCount = Number(process.env.FLOOD_COUNT ?? '100')
    const healthLimitMs = Number(process.env.FLOOD_HEALTH_LIMIT_MS ?? '1000')
    const target = await newAccount('flood')
    try {
        const baselineMs = await medianHealthMs(5)

        // start all the logins at once, then measure health while they are still in flight
        const logins = []
        for (let i = 0; i < floodCount; i++) {
            logins.push(api('POST', '/api/users/login', { body: { email: target.email, password: `wrong-${i}` } }))
        }
        const duringMs = await medianHealthMs(5)

        const results = await Promise.all(logins)
        let refused = 0
        for (const result of results) {
            if (result.status === 429 || result.status === 503) {
                refused++
            }
        }

        console.log(`Health median: ${baselineMs} ms idle vs ${duringMs} ms during ${floodCount} concurrent logins.`)
        console.log(`Logins refused (429/503): ${refused}/${floodCount}.`)

        await t.test('health stays fast during the flood', async () => {
            assert.ok(
                duringMs <= healthLimitMs,
                `GET /api/health slowed to ${duringMs} ms during the flood (idle ${baselineMs} ms), over the ${healthLimitMs} ms limit.`,
            )
        })

        await t.test('extra logins are refused', async () => {
            assert.ok(
                refused > 0,
                `No logins were refused during the flood — nothing limits many simultaneous attempts.`,
            )
        })
    } finally {
        await deleteAccount(target)
    }
})
