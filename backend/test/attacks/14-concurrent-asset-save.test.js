/*
 * Attack 14 — Two people saving the same asset.
 *
 * Load one asset in two sessions (two browser tabs), then save a different change from each at the
 * same time. Each save sends the `updatedAt` its tab loaded, as the asset editor does.
 *
 * PASS = the second save is refused because someone saved in between (409/412), so the first change
 * isn't silently lost.
 * A FAILING assertion means both overlapping saves were accepted — last write wins and one change is
 * lost.
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

test('overlapping saves of one asset do not silently lose a change', async (t) => {
    if (!serverUp) {
        t.skip(SERVER_DOWN_MESSAGE)
        return
    }

    const owner = await newAccount('concurrent')
    try {
        // session 1 is owner.cookie; log in again for an independent session 2 (a second tab)
        await logIn(owner)
        const cookie1 = owner.cookie
        const login2 = await api('POST', '/api/users/login', { body: { email: owner.email, password: owner.password } })
        const cookie2 = login2.cookie
        assert.ok(cookie2, 'Setup: the second login did not return a cookie.')

        const project = await createProject(cookie1, `concurrent-${randomSuffix()}`)
        await createBlueprint(cookie1, project.id, ITEM_BLUEPRINT)
        const asset = await createAsset(cookie1, project.id, { key: 'shared_item', schemaId: 'item', data: { name: 'Original', power: 0 } })
        const pid = encodeURIComponent(project.id)

        // both sessions load the asset
        const load1 = await api('GET', `/api/assets/${asset.id}?projectId=${pid}`, { cookie: cookie1 })
        const load2 = await api('GET', `/api/assets/${asset.id}?projectId=${pid}`, { cookie: cookie2 })
        assert.equal(load1.status, 200, `Setup: session 1 could not load the asset (${summarize(load1)}).`)
        assert.equal(load2.status, 200, `Setup: session 2 could not load the asset (${summarize(load2)}).`)

        // both save a different change at the same time, each from the copy it loaded
        const change1 = { projectId: project.id, key: 'shared_item', data: { name: 'Change from tab 1', power: 1 }, updatedAt: load1.body.updatedAt }
        const change2 = { projectId: project.id, key: 'shared_item', data: { name: 'Change from tab 2', power: 2 }, updatedAt: load2.body.updatedAt }
        const save1 = api('PUT', `/api/assets/${asset.id}`, { cookie: cookie1, body: change1 })
        const save2 = api('PUT', `/api/assets/${asset.id}`, { cookie: cookie2, body: change2 })
        const [result1, result2] = await Promise.all([save1, save2])
        console.log(`Save from tab 1: status ${result1.status}; save from tab 2: status ${result2.status}.`)

        let conflicts = 0
        for (const result of [result1, result2]) {
            if (result.status === 409 || result.status === 412) {
                conflicts++
            }
        }

        const final = await api('GET', `/api/assets/${asset.id}?projectId=${pid}`, { cookie: cookie1 })
        console.log(`Final saved value: ${JSON.stringify(final.body?.data)}.`)

        assert.ok(
            conflicts > 0,
            `Both overlapping saves were accepted (statuses ${result1.status}/${result2.status}) — last write wins and the first change is silently lost.`,
        )
    } finally {
        await deleteAccount(owner)
    }
})
