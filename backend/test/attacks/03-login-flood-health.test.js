/*
 * Attack 3 — Slow the server down with many logins at once.
 *
 * Two floods, each against its own real account, measuring how long GET /api/health takes before and during each:
 * - Wrong passwords, all at once. A wrong password still makes the server run a full bcrypt compare.
 * - The right password, a few at a time. Each login that gets through runs bcrypt and starts a new session (a row
 *   in MySQL), and sending them in small waves gets past anything that only limits a burst.
 *
 * PASS = health stays responsive during each flood AND extra logins are refused in each.
 * Each check is its own subtest, so a slow health check doesn't hide whether logins were refused.
 *
 * Tune with FLOOD_COUNT (default 100), FLOOD_WAVE_SIZE (right-password logins sent at once, default 5) and
 * FLOOD_HEALTH_LIMIT_MS (default 1000).
 */

import test, { before } from 'node:test'
import assert from 'node:assert/strict'
import { api, isServerUp, SERVER_DOWN_MESSAGE, newAccount, logIn, deleteAccount } from './helpers.js'

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

/**
 * Sends `count` logins for one account, `waveSize` at a time, and counts how many succeeded (200) and how many
 * were refused (429/503). `passwordFor(i)` gives the password for attempt number i.
 */
async function sendLogins(account, count, waveSize, passwordFor) {
    const counts = { succeeded: 0, refused: 0 }
    let sent = 0
    while (sent < count) {
        const wave = []
        while (wave.length < waveSize && sent < count) {
            wave.push(api('POST', '/api/users/login', { body: { email: account.email, password: passwordFor(sent) } }))
            sent++
        }
        for (const result of await Promise.all(wave)) {
            if (result.status === 200) {
                counts.succeeded++
            }
            if (result.status === 429 || result.status === 503) {
                counts.refused++
            }
        }
    }
    return counts
}

/** Runs sendLogins() and measures health while its logins are still in flight. Answers { duringMs, succeeded, refused }. */
async function floodLogins(account, count, waveSize, passwordFor) {
    // not awaited yet: the first wave is already sent, so health is measured during the flood
    const flood = sendLogins(account, count, waveSize, passwordFor)
    const duringMs = await medianHealthMs(5)
    const counts = await flood
    return { duringMs: duringMs, succeeded: counts.succeeded, refused: counts.refused }
}

test('health stays fast and extra logins are refused during a flood', async (t) => {
    if (!serverUp) {
        t.skip(SERVER_DOWN_MESSAGE)
        return
    }

    const floodCount = Number(process.env.FLOOD_COUNT ?? '100')
    const waveSize = Number(process.env.FLOOD_WAVE_SIZE ?? '5')
    const healthLimitMs = Number(process.env.FLOOD_HEALTH_LIMIT_MS ?? '1000')
    const wrongTarget = await newAccount('flood')
    const rightTarget = await newAccount('flood-right')
    // log in before the attack: once the login limiters block these accounts, cleanup deletes them through this session
    await logIn(wrongTarget)
    await logIn(rightTarget)
    try {
        const baselineMs = await medianHealthMs(5)
        console.log(`Health median when idle: ${baselineMs} ms.`)

        const wrong = await floodLogins(wrongTarget, floodCount, floodCount, (i) => `wrong-${i}`)
        console.log(`Wrong passwords, all ${floodCount} at once: health ${wrong.duringMs} ms; refused ${wrong.refused}/${floodCount}.`)

        await t.test('health stays fast during the wrong-password flood', async () => {
            assert.ok(
                wrong.duringMs <= healthLimitMs,
                `GET /api/health slowed to ${wrong.duringMs} ms during the flood (idle ${baselineMs} ms), over the ${healthLimitMs} ms limit.`,
            )
        })

        await t.test('extra wrong-password logins are refused', async () => {
            assert.ok(
                wrong.refused > 0,
                `No logins were refused during the flood — nothing limits many simultaneous attempts.`,
            )
        })

        const right = await floodLogins(rightTarget, floodCount, waveSize, () => rightTarget.password)
        console.log(
            `Right password, ${floodCount} in waves of ${waveSize}: health ${right.duringMs} ms; ` +
            `succeeded ${right.succeeded}, refused ${right.refused}/${floodCount}.`,
        )

        await t.test('health stays fast during the right-password flood', async () => {
            assert.ok(
                right.duringMs <= healthLimitMs,
                `GET /api/health slowed to ${right.duringMs} ms during the flood (idle ${baselineMs} ms), over the ${healthLimitMs} ms limit.`,
            )
        })

        await t.test('extra right-password logins are refused', async () => {
            assert.ok(
                right.refused > 0,
                `All ${right.succeeded} right-password logins went through, ${waveSize} at a time — nothing limits ` +
                `how often one account can log in, and each login starts a new session.`,
            )
        })
    } finally {
        await deleteAccount(wrongTarget)
        await deleteAccount(rightTarget)
    }
})
