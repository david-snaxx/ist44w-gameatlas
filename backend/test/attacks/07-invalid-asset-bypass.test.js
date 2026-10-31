/*
 * Attack 7 — Bypass the frontend and send invalid assets straight to the API.
 *
 * As a logged-in member, POST assets that the UI would never allow: a missing required property, a
 * wrong value type, a link to an asset that doesn't exist, a blueprint that doesn't exist, data that
 * isn't an object at all, and an extra property the blueprint never declared.
 *
 * PASS = each is refused with 400 and nothing is saved.
 * Each case is its own subtest, so the report names every invalid asset that was accepted.
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
    ITEM_BLUEPRINT,
    randomSuffix,
    summarize,
} from './helpers.js'

let serverUp = false
before(async () => {
    serverUp = await isServerUp()
})

/** The invalid assets to send. `schemaId` is the blueprint each claims to belong to. */
const CASES = [
    {
        label: 'missing the required Name',
        key: 'missing_required',
        schemaId: 'item',
        data: { power: 5 },
    },
    {
        label: 'Power that is text instead of a whole number',
        key: 'wrong_type',
        schemaId: 'item',
        data: { name: 'X', power: 'not a number' },
    },
    {
        label: 'a link to an asset that does not exist',
        key: 'bad_ref',
        schemaId: 'item',
        data: { name: 'X', power: 0, ally: 'does_not_exist' },
    },
    {
        label: 'a blueprint that does not exist',
        key: 'no_blueprint',
        schemaId: 'no_such_blueprint',
        data: { name: 'X', power: 0 },
    },
    {
        label: 'data that is text instead of an object',
        key: 'data_not_object',
        schemaId: 'item',
        data: 'hello',
    },
    {
        label: 'an extra property the blueprint never declared',
        key: 'extra_key',
        schemaId: 'item',
        data: { name: 'X', power: 0, injected: { evil: true } },
    },
]

test('the API rejects invalid assets and saves nothing', async (t) => {
    if (!serverUp) {
        t.skip(SERVER_DOWN_MESSAGE)
        return
    }

    const owner = await newAccount('bypass')
    try {
        await logIn(owner)
        const project = await createProject(owner.cookie, `bypass-${randomSuffix()}`)
        await createBlueprint(owner.cookie, project.id, ITEM_BLUEPRINT)
        const pid = encodeURIComponent(project.id)

        for (const testCase of CASES) {
            await t.test(`an asset with ${testCase.label} is refused`, async () => {
                const body = { projectId: project.id, key: testCase.key, schemaId: testCase.schemaId, data: testCase.data }
                const result = await api('POST', '/api/assets', { cookie: owner.cookie, body: body })
                console.log(`Asset with ${testCase.label}: status ${result.status}.`)
                assert.equal(result.status, 400, `An asset with ${testCase.label} was accepted (${summarize(result)}).`)

                const list = await api('GET', `/api/assets?projectId=${pid}`, { cookie: owner.cookie })
                const savedKeys = []
                for (const asset of list.body ?? []) {
                    savedKeys.push(asset.key)
                }
                assert.ok(!savedKeys.includes(testCase.key), `The invalid asset "${testCase.key}" was saved.`)
            })
        }
    } finally {
        await deleteAccount(owner)
    }
})
