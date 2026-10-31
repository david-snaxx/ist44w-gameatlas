/*
 * Attack 13 — Many users loading at once.
 *
 * Put a shared project with a few assets in front of 10, then 50, then 200 logged-in users, each
 * hammering the asset list for 30 seconds.
 *
 * PASS = the server keeps answering health after every phase and not every request failed.
 * The script also reports requests, errors, throughput (req/s) and the slowest response per phase.
 * Each phase is its own subtest, so one failing phase doesn't stop the later ones.
 *
 * This one is heavy: setting up 200 accounts plus three 30s phases and cleanup takes a few minutes.
 * Dial it down with LOAD_USER_COUNTS (default "10,50,200") and LOAD_DURATION_MS (default 30000).
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
    randomSuffix,
    summarize,
} from './helpers.js'

let serverUp = false
before(async () => {
    serverUp = await isServerUp()
})

/** Parses "10,50,200" into [10, 50, 200], dropping anything that isn't a positive whole number. */
function parseCounts(text) {
    const counts = []
    for (const part of text.split(',')) {
        const n = Number(part.trim())
        if (Number.isInteger(n) && n > 0) {
            counts.push(n)
        }
    }
    return counts
}

/**
 * Runs one load phase: every worker loops GET on `path` until `durationMs` is up.
 * Returns { total, errors, rps, slowestMs }.
 */
async function runLoadPhase(workers, path, durationMs) {
    const deadline = Date.now() + durationMs
    let total = 0
    let errors = 0
    let slowestMs = 0

    async function hammer(cookie) {
        while (Date.now() < deadline) {
            const start = performance.now()
            try {
                const result = await api('GET', path, { cookie: cookie })
                const elapsed = performance.now() - start
                if (elapsed > slowestMs) {
                    slowestMs = elapsed
                }
                total++
                if (result.status !== 200) {
                    errors++
                }
            } catch {
                total++
                errors++
            }
        }
    }

    const runners = []
    for (const worker of workers) {
        runners.push(hammer(worker.cookie))
    }
    await Promise.all(runners)

    const seconds = durationMs / 1000
    return { total: total, errors: errors, rps: Math.round(total / seconds), slowestMs: Math.round(slowestMs) }
}

test('the server survives many users loading the asset list at once', async (t) => {
    if (!serverUp) {
        t.skip(SERVER_DOWN_MESSAGE)
        return
    }

    const counts = parseCounts(process.env.LOAD_USER_COUNTS ?? '10,50,200')
    const durationMs = Number(process.env.LOAD_DURATION_MS ?? '30000')
    let maxUsers = 0
    for (const count of counts) {
        if (count > maxUsers) {
            maxUsers = count
        }
    }

    const owner = await newAccount('loadowner')
    const workers = []
    try {
        await logIn(owner)
        const project = await createProject(owner.cookie, `load-${randomSuffix()}`)
        await createBlueprint(owner.cookie, project.id, ITEM_BLUEPRINT)
        for (let i = 0; i < 5; i++) {
            await createAsset(owner.cookie, project.id, { key: `load_item_${i}`, schemaId: 'item', data: { name: `Item ${i}`, power: i } })
        }

        console.log(`Setting up ${maxUsers} users (this is the slow part)…`)
        for (let i = 0; i < maxUsers; i++) {
            const worker = await newAccount('loaduser')
            await logIn(worker)
            const added = await api('POST', `/api/projects/${project.id}/members`, { cookie: owner.cookie, body: { email: worker.email } })
            if (added.status !== 201) {
                throw new Error(`Setup failed: could not add a member (${summarize(added)}).`)
            }
            workers.push(worker)
        }

        const listPath = `/api/assets?projectId=${encodeURIComponent(project.id)}`
        for (const count of counts) {
            await t.test(`${count} users`, async () => {
                const phase = await runLoadPhase(workers.slice(0, count), listPath, durationMs)
                console.log(
                    `[${count} users / ${durationMs / 1000}s] requests: ${phase.total}, errors: ${phase.errors}, ` +
                        `throughput: ${phase.rps} req/s, slowest: ${phase.slowestMs} ms`,
                )

                const health = await api('GET', '/api/health')
                console.log(`[${count} users] health after phase: status ${health.status}`)
                assert.equal(
                    health.status,
                    200,
                    `The server stopped answering health after the ${count}-user phase (${summarize(health)}).`,
                )
                assert.ok(
                    phase.total > 0 && phase.errors < phase.total,
                    `Every request failed in the ${count}-user phase (errors ${phase.errors}/${phase.total}).`,
                )
            })
        }
    } finally {
        // workers leave the project as they are deleted; the owner (last member) deletes the project
        for (const worker of workers) {
            await deleteAccount(worker)
        }
        await deleteAccount(owner)
    }
})
