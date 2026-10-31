/*
 * Attack 17 — Two people creating the same ID at once.
 *
 * Fire two identical create requests at the same moment (two tabs, or two teammates) for an asset ID, a
 * blueprint ID, a dialogue ID, and a personal project. A UNIQUE key in the database backs each one.
 * A race depends on timing, so each one runs RACE_ROUNDS times (default 5), each round with a new ID.
 *
 * PASS = in every round exactly one request wins (201) and the other is refused cleanly (409 from the
 * database, or 400 from the app's own "already uses this ID" check), never two rows and never a 500.
 * Each kind is its own subtest, and its failure message says how many rounds went wrong.
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
    simpleDialogue,
    ITEM_BLUEPRINT,
    randomSuffix,
} from './helpers.js'

let serverUp = false
before(async () => {
    serverUp = await isServerUp()
})

/** How many times each race runs. Override with RACE_ROUNDS. */
const ROUNDS = Number(process.env.RACE_ROUNDS ?? '5')

/** Properties for the raced blueprint: no links, so nothing else has to exist in its project. */
const PLAIN_FIELDS = [{ key: 'name', label: 'Name', type: 'string', required: true }]

test('racing two identical creates leaves exactly one row', async (t) => {
    if (!serverUp) {
        t.skip(SERVER_DOWN_MESSAGE)
        return
    }

    const owner = await newAccount('race')
    try {
        await logIn(owner)

        await t.test('two assets with the same ID', async () => {
            const project = await createProject(owner.cookie, `race-asset-${randomSuffix()}`)
            await createBlueprint(owner.cookie, project.id, ITEM_BLUEPRINT)
            const pid = encodeURIComponent(project.id)

            const problems = []
            for (let round = 1; round <= ROUNDS; round++) {
                const key = `same_key_${round}`
                const body = { projectId: project.id, key: key, schemaId: 'item', data: { name: 'X', power: 0 } }
                const results = await raceTwice(() => api('POST', '/api/assets', { cookie: owner.cookie, body: body }))

                const list = await api('GET', `/api/assets?projectId=${pid}`, { cookie: owner.cookie })
                recordRound(problems, 'asset', round, results, countWithKey(list.body, key))
            }
            assertNoProblems(problems, 'asset')
        })

        await t.test('two blueprints with the same ID', async () => {
            const project = await createProject(owner.cookie, `race-blueprint-${randomSuffix()}`)
            const pid = encodeURIComponent(project.id)

            const problems = []
            for (let round = 1; round <= ROUNDS; round++) {
                const id = `same_bp_${round}`
                const body = { projectId: project.id, id: id, name: 'Same', description: '', fields: PLAIN_FIELDS }
                const results = await raceTwice(() => api('POST', '/api/blueprints', { cookie: owner.cookie, body: body }))

                const list = await api('GET', `/api/blueprints?projectId=${pid}`, { cookie: owner.cookie })
                recordRound(problems, 'blueprint', round, results, countWithId(list.body, id))
            }
            assertNoProblems(problems, 'blueprint')
        })

        await t.test('two dialogues with the same ID', async () => {
            const project = await createProject(owner.cookie, `race-dialogue-${randomSuffix()}`)
            const pid = encodeURIComponent(project.id)

            const problems = []
            for (let round = 1; round <= ROUNDS; round++) {
                const key = `same_talk_${round}`
                const body = { ...simpleDialogue(key, 'Same Talk'), projectId: project.id }
                const results = await raceTwice(() => api('POST', '/api/dialogues', { cookie: owner.cookie, body: body }))

                const list = await api('GET', `/api/dialogues?projectId=${pid}`, { cookie: owner.cookie })
                recordRound(problems, 'dialogue', round, results, countWithKey(list.body, key))
            }
            assertNoProblems(problems, 'dialogue')
        })

        await t.test('two personal projects for one user', async () => {
            const problems = []
            // A user can only ever have one personal project, so each round needs a new account
            for (let round = 1; round <= ROUNDS; round++) {
                const racer = await newAccount('race-personal')
                try {
                    await logIn(racer)
                    const body = { name: `${racer.displayName} (personal)`, personal: true }
                    const results = await raceTwice(() => api('POST', '/api/projects', { cookie: racer.cookie, body: body }))

                    const projects = await api('GET', '/api/projects', { cookie: racer.cookie })
                    recordRound(problems, 'personal project', round, results, countPersonal(projects.body, racer.id))
                } finally {
                    await deleteAccount(racer)
                }
            }
            assertNoProblems(problems, 'personal project')
        })
    } finally {
        await deleteAccount(owner)
    }
})

/** Sends the same request twice at the same moment and returns both answers. */
function raceTwice(sendRequest) {
    return Promise.all([sendRequest(), sendRequest()])
}

/**
 * Prints one round's statuses and adds a line to `problems` when it went wrong: anything but exactly one 201
 * and one clean refusal (400 or 409), or anything but one saved row.
 */
function recordRound(problems, label, round, results, rowCount) {
    let created = 0
    const others = []
    for (const result of results) {
        if (result.status === 201) {
            created++
        } else if (result.status !== 400 && result.status !== 409) {
            others.push(result.status)
        }
    }
    console.log(`Racing two ${label} creates, round ${round}: statuses ${results[0].status} and ${results[1].status}, ${rowCount} saved.`)

    if (others.length > 0) {
        problems.push(`round ${round} answered ${JSON.stringify(others)} (a crash, not a clean refusal)`)
    } else if (created !== 1) {
        problems.push(`round ${round} let ${created} of the 2 creates through`)
    } else if (rowCount !== 1) {
        problems.push(`round ${round} left ${rowCount} saved`)
    }
}

/** Fails with a summary when any round of a race went wrong. */
function assertNoProblems(problems, label) {
    assert.equal(
        problems.length,
        0,
        `Racing two ${label} creates went wrong in ${problems.length} of ${ROUNDS} rounds: ${problems.join('; ')}.`,
    )
}

/** How many rows in a list have this `key`. */
function countWithKey(rows, key) {
    let total = 0
    for (const row of rows ?? []) {
        if (row.key === key) {
            total++
        }
    }
    return total
}

/** How many rows in a list have this `id`. */
function countWithId(rows, id) {
    let total = 0
    for (const row of rows ?? []) {
        if (row.id === id) {
            total++
        }
    }
    return total
}

/** How many of a user's projects are their personal project. */
function countPersonal(projects, userId) {
    let total = 0
    for (const project of projects ?? []) {
        if (project.personalUserId === userId) {
            total++
        }
    }
    return total
}
