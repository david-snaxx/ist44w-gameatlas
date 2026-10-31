/*
 * Attack 18 — Prototype-pollution-style keys.
 *
 * Send __proto__ / constructor / toString where the code looks a value up in a plain object: a blueprint
 * property's type, a property's ID (and assets of that blueprint), an asset's data keys, and a dialogue node's
 * type. A lookup like FIELD_TYPES[type] finds Object.prototype for "__proto__", so a bad value can look valid.
 *
 * PASS = each is treated as ordinary input — a clean 4xx or stored inertly — never a 500, valid assets of
 * a blueprint with built-in-named properties are accepted, and a normal record made afterwards still behaves
 * (nothing on the prototype got polluted). Each case is its own subtest.
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
    simpleDialogue,
    ITEM_BLUEPRINT,
    randomSuffix,
    summarize,
} from './helpers.js'

let serverUp = false
before(async () => {
    serverUp = await isServerUp()
})

/** Fails only when the server answered 5xx, which means the payload crashed it instead of being handled. */
function assertNoServerError(result, label) {
    assert.ok(result.status < 500, `${label}: the server crashed with ${result.status} (${summarize(result)}).`)
}

test('prototype-style keys are handled, never crash the server', async (t) => {
    if (!serverUp) {
        t.skip(SERVER_DOWN_MESSAGE)
        return
    }

    const owner = await newAccount('proto')
    try {
        await logIn(owner)
        const project = await createProject(owner.cookie, `proto-${randomSuffix()}`)
        await createBlueprint(owner.cookie, project.id, ITEM_BLUEPRINT)
        const pid = encodeURIComponent(project.id)

        await t.test('a property whose type is "__proto__"', async () => {
            const body = {
                projectId: project.id,
                id: 'proto_type_bp',
                name: 'Proto Type',
                description: '',
                fields: [{ key: 'ok', label: 'OK', type: '__proto__' }],
            }
            const result = await api('POST', '/api/blueprints', { cookie: owner.cookie, body: body })
            console.log(`Property type "__proto__": status ${result.status}.`)
            assertNoServerError(result, 'property type "__proto__"')
        })

        await t.test('a property whose type is "constructor"', async () => {
            const body = {
                projectId: project.id,
                id: 'ctor_type_bp',
                name: 'Ctor Type',
                description: '',
                fields: [{ key: 'ok', label: 'OK', type: 'constructor' }],
            }
            const result = await api('POST', '/api/blueprints', { cookie: owner.cookie, body: body })
            console.log(`Property type "constructor": status ${result.status}.`)
            assertNoServerError(result, 'property type "constructor"')
        })

        await t.test('properties whose IDs are "constructor" and "toString"', async () => {
            const body = {
                projectId: project.id,
                id: 'builtin_names_bp',
                name: 'Built-in Names',
                description: '',
                fields: [
                    { key: 'constructor', label: 'Constructor', type: 'string' },
                    { key: 'toString', label: 'To string', type: 'int' },
                ],
            }
            const result = await api('POST', '/api/blueprints', { cookie: owner.cookie, body: body })
            console.log(`Property IDs "constructor" and "toString": status ${result.status}.`)
            assertNoServerError(result, 'property IDs "constructor" and "toString"')
        })

        // Neither property is required, so an asset leaving both empty is valid. Reading data.toString on an
        // empty asset finds JavaScript's built-in function instead of "no value", which is what this checks.
        await t.test('an asset leaving the built-in-named properties empty is accepted', async () => {
            const body = { projectId: project.id, key: 'builtin_empty', schemaId: 'builtin_names_bp', data: {} }
            const result = await api('POST', '/api/assets', { cookie: owner.cookie, body: body })
            console.log(`Asset leaving "constructor" and "toString" empty: status ${result.status}.`)
            assert.equal(
                result.status,
                201,
                `A valid asset with those properties left empty was refused (${summarize(result)}).`,
            )
        })

        await t.test('an asset filling in the built-in-named properties keeps the values', async () => {
            const body = {
                projectId: project.id,
                key: 'builtin_filled',
                schemaId: 'builtin_names_bp',
                data: { constructor: 'abc', toString: 3 },
            }
            const result = await api('POST', '/api/assets', { cookie: owner.cookie, body: body })
            console.log(`Asset filling in "constructor" and "toString": status ${result.status}.`)
            assert.equal(result.status, 201, `A valid asset with those properties filled in was refused (${summarize(result)}).`)

            const readBack = await api('GET', `/api/assets/${result.body.id}?projectId=${pid}`, { cookie: owner.cookie })
            assert.equal(readBack.body?.data?.constructor, 'abc', 'The "constructor" value changed on the way back.')
            assert.equal(readBack.body?.data?.toString, 3, 'The "toString" value changed on the way back.')
        })

        await t.test('an asset with "__proto__" and "constructor" data keys', async () => {
            // written by hand: an object literal with __proto__ sets the prototype instead of an own key
            const rawBody =
                `{"projectId":${JSON.stringify(project.id)},"key":"proto_asset","schemaId":"item",` +
                `"data":{"name":"X","power":0,"__proto__":{"polluted":true},"constructor":{"polluted":true}}}`
            const result = await api('POST', '/api/assets', { cookie: owner.cookie, rawBody: rawBody })
            console.log(`Asset with prototype data keys: status ${result.status}.`)
            assertNoServerError(result, 'asset with prototype data keys')

            if (result.status === 201) {
                const readBack = await api('GET', `/api/assets/${result.body.id}?projectId=${pid}`, { cookie: owner.cookie })
                assertNoServerError(readBack, 'reading the asset with prototype data keys')
            }
        })

        await t.test('a dialogue node whose type is "__proto__"', async () => {
            const dialogue = simpleDialogue('proto_talk', 'Proto Talk')
            dialogue.nodes.push({ id: 'proto_node', type: '__proto__', position: { x: 800, y: 0 }, data: {} })
            const saved = await api('POST', '/api/dialogues', { cookie: owner.cookie, body: { ...dialogue, projectId: project.id } })
            console.log(`Saving a dialogue with a "__proto__" node: status ${saved.status}.`)
            assertNoServerError(saved, 'saving a dialogue with a "__proto__" node')

            if (saved.status === 201) {
                const readBack = await api('GET', `/api/dialogues/${saved.body.id}?projectId=${pid}`, { cookie: owner.cookie })
                console.log(`Reading it back: status ${readBack.status}.`)
                assertNoServerError(readBack, 'reading a dialogue with a "__proto__" node')
            }
        })

        await t.test('a normal record still works afterwards (nothing got polluted)', async () => {
            const normal = await createAsset(owner.cookie, project.id, { key: 'clean_item', schemaId: 'item', data: { name: 'Clean', power: 1 } })
            const readBack = await api('GET', `/api/assets/${normal.id}?projectId=${pid}`, { cookie: owner.cookie })
            assert.equal(readBack.status, 200, `A normal asset couldn't be read after the payloads (${summarize(readBack)}).`)
            assert.equal(readBack.body?.data?.polluted, undefined, 'A normal asset came back carrying a "polluted" property — the prototype was polluted.')

            const health = await api('GET', '/api/health')
            assert.equal(health.status, 200, `The server stopped answering after the payloads (${summarize(health)}).`)
        })
    } finally {
        await deleteAccount(owner)
    }
})
