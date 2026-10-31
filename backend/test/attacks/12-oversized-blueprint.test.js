/*
 * Attack 12 — Very big (but technically valid) blueprints.
 *
 * A normal-sized control first, then a blueprint with thousands of properties, and blueprints with an
 * object property nested inside another, level after level. The extreme ones go through the backup restore
 * route, which accepts 20 MB: the normal save would refuse them at its 100 KB limit, which attack 10 covers.
 *
 * PASS = each one is either saved or refused with a clear 4xx message, never a 500, and the server keeps
 * answering. Each case is its own subtest.
 * BROWSER CHECK: run with KEEP_ATTACK_DATA=1 to keep the account, then open the printed links and check the
 * blueprint pages still work.
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
    printKeptAccount,
    APP_URL,
    KEEP_DATA,
    randomSuffix,
    summarize,
} from './helpers.js'

let serverUp = false
before(async () => {
    serverUp = await isServerUp()
})

test('huge blueprints are saved or refused cleanly, never crash the server', async (t) => {
    if (!serverUp) {
        t.skip(SERVER_DOWN_MESSAGE)
        return
    }

    const owner = await newAccount('bigbp')
    const savedLinks = []
    try {
        await logIn(owner)
        const project = await createProject(owner.cookie, `bigbp-${randomSuffix()}`)
        const wideProject = await createProject(owner.cookie, `bigbp-wide-${randomSuffix()}`)
        const deepProject = await createProject(owner.cookie, `bigbp-deep-${randomSuffix()}`)

        await t.test('a large but normal blueprint saves (500 properties, normal save)', async () => {
            const body = {
                projectId: project.id,
                id: 'control_bp',
                name: 'Control',
                description: '',
                fields: wideFields(500),
            }
            const result = await timedRequest('500 properties', () =>
                api('POST', '/api/blueprints', { cookie: owner.cookie, body: body }),
            )
            assert.equal(result.status, 201, `A normal-sized blueprint was refused (${summarize(result)}).`)
            savedLinks.push(blueprintLink(project.id, 'control_bp'))
        })

        await t.test('3,000 properties (restore) are saved or refused cleanly', async () => {
            const blueprint = { id: 'wide_bp', name: 'Wide', description: '', version: 1, fields: wideFields(3000) }
            const contents = { blueprints: [blueprint], assets: [], dialogues: [] }
            const result = await timedRequest('3,000 properties', () =>
                api('PUT', `/api/projects/${wideProject.id}/contents`, { cookie: owner.cookie, body: contents }),
            )
            assertNoServerError(result, '3,000 properties')
            if (result.status === 200) {
                savedLinks.push(blueprintLink(wideProject.id, 'wide_bp'))
            }
        })

        // MySQL refuses JSON nested more than 100 deep, and each level here adds two (an object and its list)
        await t.test('60 levels deep (normal save) is saved or refused cleanly', async () => {
            const rawBody =
                `{"projectId":"${project.id}","id":"deep_60","name":"Deep 60","description":"",` +
                `"fields":${deepFieldsJson(60)}}`
            const result = await timedRequest('60 levels deep', () =>
                api('POST', '/api/blueprints', { cookie: owner.cookie, rawBody: rawBody }),
            )
            assertNoServerError(result, '60 levels deep')
            if (result.status === 201) {
                savedLinks.push(blueprintLink(project.id, 'deep_60'))
            }
        })

        await t.test('10,000 levels deep (restore) is saved or refused cleanly', async () => {
            const blueprintJson =
                `{"id":"deep_10000","name":"Deep 10000","description":"","version":1,` +
                `"fields":${deepFieldsJson(10000)}}`
            const rawBody = `{"blueprints":[${blueprintJson}],"assets":[],"dialogues":[]}`
            const result = await timedRequest('10,000 levels deep', () =>
                api('PUT', `/api/projects/${deepProject.id}/contents`, { cookie: owner.cookie, rawBody: rawBody }),
            )
            assertNoServerError(result, '10,000 levels deep')
            if (result.status === 200) {
                savedLinks.push(blueprintLink(deepProject.id, 'deep_10000'))
            }
        })

        await t.test('the server still answers', async () => {
            const health = await api('GET', '/api/health')
            assert.equal(health.status, 200, `The server stopped answering after the huge blueprints (${summarize(health)}).`)
        })

        if (KEEP_DATA) {
            printKeptAccount(owner)
            console.log('BROWSER CHECK: open each saved blueprint and its "new asset" form, and check both still work:')
            for (const link of savedLinks) {
                console.log(`  ${link}`)
                console.log(`  ${link}/assets/new`)
            }
        } else {
            console.log('Run with KEEP_ATTACK_DATA=1 to keep these blueprints for the browser check.')
        }
    } finally {
        if (!KEEP_DATA) {
            await deleteAccount(owner)
        }
    }
})

/** Fails when the server answered with a 5xx error, which means it crashed on the request instead of refusing it. */
function assertNoServerError(result, label) {
    assert.ok(
        result.status < 500,
        `${label}: the server answered ${result.status} instead of saving it or giving a clear refusal (${summarize(result)}).`,
    )
}

/** Sends one request, prints its status and how long it took, and returns the server's answer. */
async function timedRequest(label, sendRequest) {
    const start = performance.now()
    const result = await sendRequest()
    const elapsedMs = Math.round(performance.now() - start)
    console.log(`${label}: status ${result.status} in ${elapsedMs} ms.`)
    return result
}

/** `count` simple whole-number properties. */
function wideFields(count) {
    const fields = []
    for (let i = 0; i < count; i++) {
        fields.push({ key: `p${i}`, label: `Property ${i}`, type: 'int', min: 0 })
    }
    return fields
}

/**
 * The JSON text of a property list with `depth` object properties nested inside each other around one text
 * property. Written as text because JSON.stringify itself runs out of stack long before 10,000 levels.
 */
function deepFieldsJson(depth) {
    const open = '{"key":"group","label":"Group","type":"object","fields":['.repeat(depth)
    const leaf = '{"key":"leaf","label":"Leaf","type":"string"}'
    const close = ']}'.repeat(depth)
    return `[${open}${leaf}${close}]`
}

/** The builder page of a blueprint in the app. */
function blueprintLink(projectId, blueprintId) {
    return `${APP_URL}/projects/${projectId}/blueprints/${blueprintId}`
}
