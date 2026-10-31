/*
 * Attack 8 — Cross-site scripting through a stored value.
 *
 * Save an asset whose Name is <img src=x onerror=alert(1)>, the kind of value another user would see
 * rendered, then read it back.
 *
 * What this script checks (the data layer): the payload round-trips unchanged and the backend serves it
 * as an inert JSON string (Content-Type application/json), never as live HTML.
 *
 * NOT scriptable here (needs a browser): confirming that the app shows the text literally and no alert
 * runs. React escapes JSX text by default and the app has no dangerouslySetInnerHTML, so this is
 * expected to be safe — but verify it in the browser (open the asset view) to be sure.
 *
 * PASS = the value round-trips unchanged and is served as JSON.
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
} from './helpers.js'

let serverUp = false
before(async () => {
    serverUp = await isServerUp()
})

/** The script payload, saved as an asset's Name. Short enough to fit the Name's 64-character limit. */
export const XSS_PAYLOAD = '<img src=x onerror=alert(1)>'

test('a script payload is stored and returned as inert JSON text', async (t) => {
    if (!serverUp) {
        t.skip(SERVER_DOWN_MESSAGE)
        return
    }

    const owner = await newAccount('xss')
    try {
        await logIn(owner)
        const project = await createProject(owner.cookie, `xss-${randomSuffix()}`)
        await createBlueprint(owner.cookie, project.id, ITEM_BLUEPRINT)
        const asset = await createAsset(owner.cookie, project.id, {
            key: 'xss_item',
            schemaId: 'item',
            data: { name: XSS_PAYLOAD, power: 0 },
        })

        const readBack = await api('GET', `/api/assets/${asset.id}?projectId=${encodeURIComponent(project.id)}`, {
            cookie: owner.cookie,
        })

        await t.test('the payload comes back unchanged', async () => {
            assert.equal(
                readBack.body?.data?.name,
                XSS_PAYLOAD,
                `The stored value changed on the way back (${JSON.stringify(readBack.body?.data?.name)}).`,
            )
        })

        await t.test('the answer is JSON, not HTML', async () => {
            assert.ok(
                readBack.contentType.includes('application/json'),
                `The asset was served as ${readBack.contentType}, not JSON — it could be executed as HTML.`,
            )
        })

        console.log('Backend stores and returns the payload as an inert JSON string (served as application/json).')
        console.log('BROWSER CHECK (not scriptable here): open this asset in the app and confirm the text shows')
        console.log('literally and no alert fires.')
    } finally {
        await deleteAccount(owner)
    }
})
