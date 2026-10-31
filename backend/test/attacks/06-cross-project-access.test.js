/*
 * Attack 6 — Reach another project's data.
 *
 * As user Bob, try to read, edit and delete user Alice's project, assets, blueprints, dialogues and
 * members — by naming Alice's project, and by naming Bob's own project with Alice's record IDs. Bob
 * also tries to add himself to one of Alice's projects and to replace a whole project of hers.
 *
 * PASS = every attempt answers 404 (the server never admits Alice's project exists), and Alice's data is
 * untouched afterwards. Each attempt is its own subtest, so the report lists every one that got through.
 * Reads run first and deletes last. If a delete wrongly works, a later attempt may pass only because the
 * thing is gone, so the last subtest checks that all of Alice's data is still there.
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
    createDialogue,
    simpleDialogue,
    ITEM_BLUEPRINT,
    randomSuffix,
    summarize,
} from './helpers.js'

let serverUp = false
before(async () => {
    serverUp = await isServerUp()
})

/** Runs one of Bob's requests as its own subtest, which passes only when the server answers 404. */
async function expectNotFound(t, label, sendRequest) {
    await t.test(`Bob can't ${label}`, async () => {
        const result = await sendRequest()
        console.log(`Bob tried to ${label}: status ${result.status}.`)
        assert.equal(result.status, 404, `Bob was able to ${label} (${summarize(result)}).`)
    })
}

test("one user cannot reach another user's project data", async (t) => {
    if (!serverUp) {
        t.skip(SERVER_DOWN_MESSAGE)
        return
    }

    const alice = await newAccount('alice')
    const bob = await newAccount('bob')
    try {
        await logIn(alice)
        await logIn(bob)

        // Alice fills a project with one of everything
        const projectA = await createProject(alice.cookie, `alice-${randomSuffix()}`)
        await createBlueprint(alice.cookie, projectA.id, ITEM_BLUEPRINT)
        const assetA = await createAsset(alice.cookie, projectA.id, {
            key: 'alice_item',
            schemaId: 'item',
            data: { name: 'Alice Item', power: 1 },
        })
        const dialogueA = await createDialogue(alice.cookie, projectA.id, simpleDialogue('alice_talk', 'Alice Talk'))

        // A second project of Alice's, used only for "Bob adds himself", so that attempt can't affect the others
        const projectA2 = await createProject(alice.cookie, `alice-members-${randomSuffix()}`)

        // Bob's own project, used for the "my project, Alice's record ID" attempts
        const projectB = await createProject(bob.cookie, `bob-${randomSuffix()}`)

        const aId = encodeURIComponent(projectA.id)
        const bId = encodeURIComponent(projectB.id)
        const asBob = { cookie: bob.cookie }

        // Reads
        await expectNotFound(t, "list Alice's assets", () => api('GET', `/api/assets?projectId=${aId}`, asBob))
        await expectNotFound(t, "read Alice's asset", () => api('GET', `/api/assets/${assetA.id}?projectId=${aId}`, asBob))
        await expectNotFound(t, "list Alice's blueprints", () => api('GET', `/api/blueprints?projectId=${aId}`, asBob))
        await expectNotFound(t, "read Alice's blueprint", () => api('GET', `/api/blueprints/item?projectId=${aId}`, asBob))
        await expectNotFound(t, "list Alice's dialogues", () => api('GET', `/api/dialogues?projectId=${aId}`, asBob))
        await expectNotFound(t, "read Alice's dialogue", () =>
            api('GET', `/api/dialogues/${dialogueA.id}?projectId=${aId}`, asBob),
        )
        await expectNotFound(t, "list Alice's members", () => api('GET', `/api/projects/${projectA.id}/members`, asBob))
        await expectNotFound(t, "read Alice's asset via his own project", () =>
            api('GET', `/api/assets/${assetA.id}?projectId=${bId}`, asBob),
        )
        await expectNotFound(t, "read Alice's dialogue via his own project", () =>
            api('GET', `/api/dialogues/${dialogueA.id}?projectId=${bId}`, asBob),
        )

        // Edits
        const hackedAsset = { projectId: projectA.id, key: 'alice_item', data: { name: 'hacked', power: 9 } }
        await expectNotFound(t, "edit Alice's asset", () =>
            api('PUT', `/api/assets/${assetA.id}`, { cookie: bob.cookie, body: hackedAsset }),
        )

        const hackedAssetViaB = { projectId: projectB.id, key: 'alice_item', data: { name: 'hacked', power: 9 } }
        await expectNotFound(t, "edit Alice's asset via his own project", () =>
            api('PUT', `/api/assets/${assetA.id}`, { cookie: bob.cookie, body: hackedAssetViaB }),
        )

        const hackedBlueprint = {
            projectId: projectA.id,
            id: 'item',
            name: 'Hacked',
            description: '',
            fields: ITEM_BLUEPRINT.fields,
        }
        await expectNotFound(t, "edit Alice's blueprint", () =>
            api('PUT', '/api/blueprints/item', { cookie: bob.cookie, body: hackedBlueprint }),
        )

        const hackedDialogue = simpleDialogue('alice_talk', 'Hacked')
        hackedDialogue.projectId = projectA.id
        await expectNotFound(t, "edit Alice's dialogue", () =>
            api('PUT', `/api/dialogues/${dialogueA.id}`, { cookie: bob.cookie, body: hackedDialogue }),
        )

        const hackedDialogueViaB = simpleDialogue('alice_talk', 'Hacked')
        hackedDialogueViaB.projectId = projectB.id
        await expectNotFound(t, "edit Alice's dialogue via his own project", () =>
            api('PUT', `/api/dialogues/${dialogueA.id}`, { cookie: bob.cookie, body: hackedDialogueViaB }),
        )

        await expectNotFound(t, "rename Alice's project", () =>
            api('PUT', `/api/projects/${projectA.id}`, { cookie: bob.cookie, body: { name: 'hacked' } }),
        )

        await t.test("Bob can't add himself as a member of Alice's project", async () => {
            const result = await api('POST', `/api/projects/${projectA2.id}/members`, {
                cookie: bob.cookie,
                body: { email: bob.email },
            })
            console.log(`Bob tried to add himself to Alice's project: status ${result.status}.`)
            assert.equal(result.status, 404, `Bob added himself to Alice's project (${summarize(result)}).`)

            const members = await api('GET', `/api/projects/${projectA2.id}/members`, { cookie: alice.cookie })
            const memberIds = []
            for (const member of members.body ?? []) {
                memberIds.push(member.id)
            }
            assert.ok(!memberIds.includes(bob.id), "Bob is now in the member list of Alice's project.")
        })

        // Deletes, with the ones that remove the most saved for last
        await expectNotFound(t, "delete Alice's asset via his own project", () =>
            api('DELETE', `/api/assets/${assetA.id}?projectId=${bId}`, asBob),
        )
        await expectNotFound(t, "delete Alice's asset", () => api('DELETE', `/api/assets/${assetA.id}?projectId=${aId}`, asBob))
        await expectNotFound(t, "delete Alice's dialogue via his own project", () =>
            api('DELETE', `/api/dialogues/${dialogueA.id}?projectId=${bId}`, asBob),
        )
        await expectNotFound(t, "delete Alice's dialogue", () =>
            api('DELETE', `/api/dialogues/${dialogueA.id}?projectId=${aId}`, asBob),
        )
        await expectNotFound(t, "delete Alice's blueprint", () => api('DELETE', `/api/blueprints/item?projectId=${aId}`, asBob))

        const emptyContents = { blueprints: [], assets: [], dialogues: [] }
        await expectNotFound(t, "replace everything in Alice's project", () =>
            api('PUT', `/api/projects/${projectA.id}/contents`, { cookie: bob.cookie, body: emptyContents }),
        )
        await expectNotFound(t, "delete Alice's project", () => api('DELETE', `/api/projects/${projectA.id}`, asBob))

        await t.test("Alice's data is untouched", async () => {
            const asset = await api('GET', `/api/assets/${assetA.id}?projectId=${aId}`, { cookie: alice.cookie })
            assert.equal(asset.status, 200, `Alice's asset went missing (${summarize(asset)}).`)
            assert.equal(asset.body?.data?.name, 'Alice Item', `Alice's asset was changed (${JSON.stringify(asset.body?.data)}).`)

            const blueprint = await api('GET', `/api/blueprints/item?projectId=${aId}`, { cookie: alice.cookie })
            assert.equal(blueprint.status, 200, `Alice's blueprint went missing (${summarize(blueprint)}).`)
            assert.equal(blueprint.body?.name, 'Item', `Alice's blueprint was changed (name ${JSON.stringify(blueprint.body?.name)}).`)

            const dialogue = await api('GET', `/api/dialogues/${dialogueA.id}?projectId=${aId}`, { cookie: alice.cookie })
            assert.equal(dialogue.status, 200, `Alice's dialogue went missing (${summarize(dialogue)}).`)
            assert.equal(dialogue.body?.name, 'Alice Talk', `Alice's dialogue was changed (name ${JSON.stringify(dialogue.body?.name)}).`)

            const projects = await api('GET', '/api/projects', { cookie: alice.cookie })
            let projectName = null
            for (const project of projects.body ?? []) {
                if (project.id === projectA.id) {
                    projectName = project.name
                }
            }
            assert.equal(projectName, projectA.name, `Alice's project was renamed or deleted (now ${JSON.stringify(projectName)}).`)
        })
    } finally {
        await deleteAccount(alice)
        await deleteAccount(bob)
    }
})
