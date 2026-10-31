/*
 * Attack 10 — Very large requests (overload by size of one request, not by count).
 *
 * Send one asset body well over the 100 KB limit, and one project-contents body over the 20 MB limit.
 *
 * PASS = each is cleanly rejected (413, or 400), the server keeps answering health, and nothing is saved.
 * Each check is its own subtest, so one failure doesn't hide the others.
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

test('oversized requests are rejected and the server stays up', async (t) => {
    if (!serverUp) {
        t.skip(SERVER_DOWN_MESSAGE)
        return
    }

    const owner = await newAccount('large')
    try {
        await logIn(owner)
        const project = await createProject(owner.cookie, `large-${randomSuffix()}`)
        await createBlueprint(owner.cookie, project.id, ITEM_BLUEPRINT)
        const pid = encodeURIComponent(project.id)

        await t.test('a 200 KB asset is refused', async () => {
            const bigName = 'A'.repeat(200 * 1024)
            const bigAsset = await api('POST', '/api/assets', {
                cookie: owner.cookie,
                body: { projectId: project.id, key: 'too_big', schemaId: 'item', data: { name: bigName, power: 0 } },
            })
            console.log(`200 KB asset POST: status ${bigAsset.status}.`)
            assert.ok(
                bigAsset.status === 413 || bigAsset.status === 400,
                `A 200 KB request was not cleanly rejected (${summarize(bigAsset)}).`,
            )
        })

        await t.test('a 21 MB project restore is refused', async () => {
            const hugePad = 'A'.repeat(21 * 1024 * 1024)
            const hugeBody = JSON.stringify({ blueprints: [], assets: [], dialogues: [], pad: hugePad })
            const hugeContents = await api('PUT', `/api/projects/${project.id}/contents`, {
                cookie: owner.cookie,
                rawBody: hugeBody,
            })
            console.log(`21 MB contents PUT: status ${hugeContents.status}.`)
            assert.ok(
                hugeContents.status === 413 || hugeContents.status === 400,
                `A 21 MB request was not cleanly rejected (${summarize(hugeContents)}).`,
            )
        })

        await t.test('the server still answers', async () => {
            const health = await api('GET', '/api/health')
            assert.equal(
                health.status,
                200,
                `The server stopped answering health after the large requests (${summarize(health)}).`,
            )
        })

        await t.test('the oversized asset was not saved', async () => {
            const list = await api('GET', `/api/assets?projectId=${pid}`, { cookie: owner.cookie })
            const savedKeys = []
            for (const asset of list.body ?? []) {
                savedKeys.push(asset.key)
            }
            assert.ok(!savedKeys.includes('too_big'), 'The oversized asset was saved despite the size limit.')
        })
    } finally {
        await deleteAccount(owner)
    }
})
