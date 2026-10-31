/*
 * Attack 16 — Break the links between items by renaming and deleting what they point at.
 *
 * GameAtlas links records together: an asset's reference property points at another asset; a blueprint's
 * reference property points at another blueprint; a dialogue names a speaker/item blueprint and, in its
 * nodes, speaker and given-item asset keys. This renames and deletes the linked-to side and checks the
 * other side holds up.
 *
 * PASS = a rename carries its links along (no dangling old IDs), a delete leaves reads working (a now-broken
 * link is a reported problem, never a 500), and a rename into a name already in use is refused with nothing
 * corrupted. Each case is its own subtest, on its own project so they stay independent.
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
    ITEM_BLUEPRINT,
    randomSuffix,
    summarize,
} from './helpers.js'

let serverUp = false
before(async () => {
    serverUp = await isServerUp()
})

test('links survive renames and degrade gracefully on deletes', async (t) => {
    if (!serverUp) {
        t.skip(SERVER_DOWN_MESSAGE)
        return
    }

    const owner = await newAccount('links')
    try {
        await logIn(owner)

        await t.test('renaming an asset carries every link to it', async () => {
            const project = await createProject(owner.cookie, `links-asset-rename-${randomSuffix()}`)
            await createBlueprint(owner.cookie, project.id, ITEM_BLUEPRINT)
            const blade = await createAsset(owner.cookie, project.id, { key: 'blade', schemaId: 'item', data: { name: 'Blade', power: 2 } })
            const scabbard = await createAsset(owner.cookie, project.id, {
                key: 'scabbard',
                schemaId: 'item',
                data: { name: 'Scabbard', power: 0, ally: 'blade' },
            })
            const dialogue = await createDialogue(owner.cookie, project.id, dialogueLinkingAsset('blade_talk', 'blade'))

            const rename = await api('PUT', `/api/assets/${blade.id}`, {
                cookie: owner.cookie,
                body: { projectId: project.id, key: 'great_blade', data: { name: 'Blade', power: 2 } },
            })
            assert.equal(rename.status, 200, `Renaming the asset failed (${summarize(rename)}).`)

            const pid = encodeURIComponent(project.id)
            const scabbardBack = await api('GET', `/api/assets/${scabbard.id}?projectId=${pid}`, { cookie: owner.cookie })
            assert.equal(scabbardBack.body?.data?.ally, 'great_blade', `A link from another asset didn't follow the rename (ally is ${JSON.stringify(scabbardBack.body?.data?.ally)}).`)

            const dialogueBack = await api('GET', `/api/dialogues/${dialogue.id}?projectId=${pid}`, { cookie: owner.cookie })
            const speaker = speakerOf(dialogueBack.body, 'line_1')
            const item = itemOf(dialogueBack.body, 'action_1')
            assert.equal(speaker, 'great_blade', `The dialogue speaker didn't follow the rename (${JSON.stringify(speaker)}).`)
            assert.equal(item, 'great_blade', `The dialogue given-item didn't follow the rename (${JSON.stringify(item)}).`)
        })

        await t.test('renaming a blueprint carries every link to it', async () => {
            const project = await createProject(owner.cookie, `links-bp-rename-${randomSuffix()}`)
            await createBlueprint(owner.cookie, project.id, { id: 'entity', name: 'Entity', description: '', fields: [{ key: 'name', label: 'Name', type: 'string', required: true }] })
            await createBlueprint(owner.cookie, project.id, {
                id: 'item',
                name: 'Item',
                description: '',
                fields: [
                    { key: 'name', label: 'Name', type: 'string', required: true },
                    { key: 'dropped_by', label: 'Dropped by', type: 'reference', targetSchema: 'entity' },
                ],
            })
            const dialogue = await createDialogue(owner.cookie, project.id, speakerBlueprintDialogue('entity_talk', 'entity'))

            const rename = await api('PUT', '/api/blueprints/entity', {
                cookie: owner.cookie,
                body: { projectId: project.id, id: 'creature', name: 'Entity', description: '', fields: [{ key: 'name', label: 'Name', type: 'string', required: true }] },
            })
            assert.equal(rename.status, 200, `Renaming the blueprint failed (${summarize(rename)}).`)

            const pid = encodeURIComponent(project.id)
            const itemBack = await api('GET', `/api/blueprints/item?projectId=${pid}`, { cookie: owner.cookie })
            const droppedBy = (itemBack.body?.fields ?? []).find((field) => field.key === 'dropped_by')
            assert.equal(droppedBy?.targetSchema, 'creature', `A blueprint link didn't follow the rename (targetSchema is ${JSON.stringify(droppedBy?.targetSchema)}).`)

            const dialogueBack = await api('GET', `/api/dialogues/${dialogue.id}?projectId=${pid}`, { cookie: owner.cookie })
            assert.equal(dialogueBack.body?.speakerBlueprint, 'creature', `The dialogue's speaker blueprint didn't follow the rename (${JSON.stringify(dialogueBack.body?.speakerBlueprint)}).`)
        })

        await t.test('deleting a linked-to asset leaves reads working', async () => {
            const project = await createProject(owner.cookie, `links-asset-delete-${randomSuffix()}`)
            await createBlueprint(owner.cookie, project.id, ITEM_BLUEPRINT)
            const blade = await createAsset(owner.cookie, project.id, { key: 'blade', schemaId: 'item', data: { name: 'Blade', power: 2 } })
            const scabbard = await createAsset(owner.cookie, project.id, {
                key: 'scabbard',
                schemaId: 'item',
                data: { name: 'Scabbard', power: 0, ally: 'blade' },
            })
            const dialogue = await createDialogue(owner.cookie, project.id, dialogueLinkingAsset('blade_talk', 'blade'))

            const pid = encodeURIComponent(project.id)
            const del = await api('DELETE', `/api/assets/${blade.id}?projectId=${pid}`, { cookie: owner.cookie })
            assert.equal(del.status, 204, `Deleting the asset failed (${summarize(del)}).`)

            const scabbardBack = await api('GET', `/api/assets/${scabbard.id}?projectId=${pid}`, { cookie: owner.cookie })
            assert.notEqual(scabbardBack.status, 500, `Reading an asset whose link now dangles crashed (${summarize(scabbardBack)}).`)

            const dialogueBack = await api('GET', `/api/dialogues/${dialogue.id}?projectId=${pid}`, { cookie: owner.cookie })
            assert.notEqual(dialogueBack.status, 500, `Reading a dialogue whose speaker was deleted crashed (${summarize(dialogueBack)}).`)
        })

        await t.test('deleting a blueprint a dialogue points at leaves reads working', async () => {
            const project = await createProject(owner.cookie, `links-bp-delete-${randomSuffix()}`)
            await createBlueprint(owner.cookie, project.id, { id: 'entity', name: 'Entity', description: '', fields: [{ key: 'name', label: 'Name', type: 'string', required: true }] })
            const dialogue = await createDialogue(owner.cookie, project.id, speakerBlueprintDialogue('entity_talk', 'entity'))

            const pid = encodeURIComponent(project.id)
            const del = await api('DELETE', `/api/blueprints/entity?projectId=${pid}`, { cookie: owner.cookie })
            assert.equal(del.status, 204, `Deleting the blueprint failed (${summarize(del)}).`)

            const dialogueBack = await api('GET', `/api/dialogues/${dialogue.id}?projectId=${pid}`, { cookie: owner.cookie })
            assert.notEqual(dialogueBack.status, 500, `Reading a dialogue whose speaker blueprint was deleted crashed (${summarize(dialogueBack)}).`)
        })

        await t.test('renaming an asset onto another asset\'s ID is refused', async () => {
            const project = await createProject(owner.cookie, `links-collide-${randomSuffix()}`)
            await createBlueprint(owner.cookie, project.id, ITEM_BLUEPRINT)
            const blade = await createAsset(owner.cookie, project.id, { key: 'blade', schemaId: 'item', data: { name: 'Blade', power: 2 } })
            const shield = await createAsset(owner.cookie, project.id, { key: 'shield', schemaId: 'item', data: { name: 'Shield', power: 0 } })

            const collide = await api('PUT', `/api/assets/${blade.id}`, {
                cookie: owner.cookie,
                body: { projectId: project.id, key: 'shield', data: { name: 'Blade', power: 2 } },
            })
            console.log(`Renaming blade onto shield's ID: status ${collide.status}.`)
            assert.ok(collide.status === 400 || collide.status === 409, `A clashing rename was not refused (${summarize(collide)}).`)

            const pid = encodeURIComponent(project.id)
            const bladeBack = await api('GET', `/api/assets/${blade.id}?projectId=${pid}`, { cookie: owner.cookie })
            const shieldBack = await api('GET', `/api/assets/${shield.id}?projectId=${pid}`, { cookie: owner.cookie })
            assert.equal(bladeBack.body?.key, 'blade', `The renamed asset's ID changed anyway (${JSON.stringify(bladeBack.body?.key)}).`)
            assert.equal(shieldBack.body?.key, 'shield', `The clashed-with asset changed (${JSON.stringify(shieldBack.body?.key)}).`)
        })
    } finally {
        await deleteAccount(owner)
    }
})

/** A dialogue whose speaker and given item both point at one asset of the Item blueprint. */
function dialogueLinkingAsset(key, assetKey) {
    return {
        key: key,
        name: 'Links to an asset',
        description: '',
        speakerBlueprint: 'item',
        itemBlueprint: 'item',
        nodes: [
            { id: 'start', type: 'start', position: { x: 0, y: 0 }, data: {} },
            { id: 'line_1', type: 'line', position: { x: 200, y: 0 }, data: { speaker: assetKey, text: 'Hello.' } },
            { id: 'action_1', type: 'action', position: { x: 400, y: 0 }, data: { action: 'giveItem', item: assetKey, quantity: 1, flag: '', value: true } },
            { id: 'end_1', type: 'end', position: { x: 600, y: 0 }, data: {} },
        ],
        edges: [
            { id: 'start:next->line_1', source: 'start', sourceHandle: 'next', target: 'line_1' },
            { id: 'line_1:next->action_1', source: 'line_1', sourceHandle: 'next', target: 'action_1' },
            { id: 'action_1:next->end_1', source: 'action_1', sourceHandle: 'next', target: 'end_1' },
        ],
    }
}

/** A dialogue that names a speaker blueprint (so a blueprint rename/delete should reach it). */
function speakerBlueprintDialogue(key, blueprintId) {
    return {
        key: key,
        name: 'Names a speaker blueprint',
        description: '',
        speakerBlueprint: blueprintId,
        itemBlueprint: '',
        nodes: [
            { id: 'start', type: 'start', position: { x: 0, y: 0 }, data: {} },
            { id: 'line_1', type: 'line', position: { x: 200, y: 0 }, data: { speaker: '', text: 'Hello.' } },
            { id: 'end_1', type: 'end', position: { x: 400, y: 0 }, data: {} },
        ],
        edges: [
            { id: 'start:next->line_1', source: 'start', sourceHandle: 'next', target: 'line_1' },
            { id: 'line_1:next->end_1', source: 'line_1', sourceHandle: 'next', target: 'end_1' },
        ],
    }
}

/** The speaker key stored on a dialogue's line node, or undefined. */
function speakerOf(dialogue, nodeId) {
    const node = (dialogue?.nodes ?? []).find((candidate) => candidate.id === nodeId)
    return node?.data?.speaker
}

/** The given-item key stored on a dialogue's action node, or undefined. */
function itemOf(dialogue, nodeId) {
    const node = (dialogue?.nodes ?? []).find((candidate) => candidate.id === nodeId)
    return node?.data?.item
}
