/*
 * Attack 11 — Corrupt uploads.
 *
 * Three kinds, each sent to a project that already holds a valid blueprint, asset and dialogue:
 *   - restores that aren't JSON at all (a cut-off backup, an image renamed to .json)
 *   - restores that are valid JSON but broken inside (lists that aren't lists, an asset whose blueprint
 *     isn't in the backup, a repeated ID, a dialogue leading to a missing step or with a step replaced by null)
 *   - dialogues saved straight through the API with a broken structure
 *
 * PASS = every one is refused with 400 and the project's contents don't change.
 * Each case is its own subtest. The browser's own import checks need real files: see files/ and the README.
 * Run with KEEP_ATTACK_DATA=1 to keep anything broken that got saved, and open it in the app.
 */

import test, { before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
    api,
    isServerUp,
    SERVER_DOWN_MESSAGE,
    newAccount,
    deleteAccount,
    logIn,
    createProject,
    simpleDialogue,
    printKeptAccount,
    ITEM_BLUEPRINT,
    APP_URL,
    KEEP_DATA,
    randomSuffix,
    summarize,
} from './helpers.js'

let serverUp = false
before(async () => {
    serverUp = await isServerUp()
})

/** The same broken files as in ./files, which are also there for importing by hand in the browser. */
const CUT_OFF_BACKUP = readFileSync(new URL('./files/cut-off-backup.json', import.meta.url), 'utf8')
const IMAGE_BYTES = readFileSync(new URL('./files/image-renamed.json', import.meta.url))

/** Restore bodies that aren't JSON at all. */
const NOT_JSON = [
    { label: 'A backup cut off partway through', body: CUT_OFF_BACKUP },
    { label: 'An image renamed to .json', body: IMAGE_BYTES },
]

/** Restore bodies that are valid JSON but broken inside. Each starts from a valid set and breaks one thing. */
const BROKEN_SETS = [
    { label: 'A backup whose lists are not lists', set: setWithWrongTypes() },
    { label: "A backup with an asset whose blueprint isn't in it", set: setWithMissingBlueprint() },
    { label: 'A backup with two blueprints sharing one ID', set: setWithRepeatedBlueprint() },
    { label: 'A backup with a dialogue leading to a missing step', set: setWithDialogue(danglingDialogue('greeting')) },
    { label: 'A backup with a dialogue step replaced by null', set: setWithDialogue(nullStepDialogue('greeting')) },
]

/** Dialogues with a broken structure, saved straight through the API. */
const BROKEN_DIALOGUES = [
    { label: 'A dialogue leading to a missing step', dialogue: danglingDialogue('dangling_step') },
    { label: 'A dialogue with a step replaced by null', dialogue: nullStepDialogue('null_step') },
]

test('corrupt uploads are refused and change nothing', async (t) => {
    if (!serverUp) {
        t.skip(SERVER_DOWN_MESSAGE)
        return
    }

    const owner = await newAccount('corrupt')
    try {
        await logIn(owner)
        const project = await createProject(owner.cookie, `corrupt-${randomSuffix()}`)
        const contentsPath = `/api/projects/${project.id}/contents`

        // A valid set first: it gives "nothing changed" something to compare, and proves the sets below
        // are only refused for what was broken in them
        const seeded = await api('PUT', contentsPath, { cookie: owner.cookie, body: validSet() })
        assert.equal(seeded.status, 200, `Setup: a valid set was refused (${summarize(seeded)}).`)

        for (const upload of NOT_JSON) {
            await t.test(`${upload.label} is refused`, async () => {
                await expectRefusedAndUnchanged(owner.cookie, project.id, upload.label, () =>
                    api('PUT', contentsPath, { cookie: owner.cookie, rawBody: upload.body }),
                )
            })
        }

        for (const broken of BROKEN_SETS) {
            await t.test(`${broken.label} is refused`, async () => {
                await expectRefusedAndUnchanged(owner.cookie, project.id, broken.label, () =>
                    api('PUT', contentsPath, { cookie: owner.cookie, body: broken.set }),
                )
            })
        }

        for (const broken of BROKEN_DIALOGUES) {
            await t.test(`${broken.label} is refused`, async () => {
                const body = { ...broken.dialogue, projectId: project.id }
                await expectRefusedAndUnchanged(owner.cookie, project.id, broken.label, () =>
                    api('POST', '/api/dialogues', { cookie: owner.cookie, body: body }),
                )
            })
        }

        if (KEEP_DATA) {
            printKeptAccount(owner)
            console.log('BROWSER CHECK: open each dialogue that was saved above and see whether the editor still works:')
            console.log(`  ${APP_URL}/projects/${project.id}/dialogues`)
        } else {
            console.log('Run with KEEP_ATTACK_DATA=1 to keep any broken dialogue that got saved and open it in the app.')
        }
    } finally {
        if (!KEEP_DATA) {
            await deleteAccount(owner)
        }
    }
})

/**
 * Sends one corrupt upload, then checks it was refused with 400 and the project still has as many blueprints,
 * assets and dialogues as before.
 */
async function expectRefusedAndUnchanged(cookie, projectId, label, sendRequest) {
    const countsBefore = await contentCounts(cookie, projectId)
    const result = await sendRequest()
    const countsAfter = await contentCounts(cookie, projectId)
    console.log(`${label}: status ${result.status}.`)

    assert.equal(result.status, 400, `${label} was not refused with 400 (${summarize(result)}).`)
    assert.deepEqual(
        countsAfter,
        countsBefore,
        `${label} changed the project (before ${JSON.stringify(countsBefore)}, after ${JSON.stringify(countsAfter)}).`,
    )
}

/** How many blueprints, assets and dialogues a project currently has. */
async function contentCounts(cookie, projectId) {
    const pid = encodeURIComponent(projectId)
    const blueprints = await api('GET', `/api/blueprints?projectId=${pid}`, { cookie: cookie })
    const assets = await api('GET', `/api/assets?projectId=${pid}`, { cookie: cookie })
    const dialogues = await api('GET', `/api/dialogues?projectId=${pid}`, { cookie: cookie })
    return {
        blueprints: (blueprints.body ?? []).length,
        assets: (assets.body ?? []).length,
        dialogues: (dialogues.body ?? []).length,
    }
}

/** A valid project set (one blueprint, asset and dialogue) in the shape the restore route takes. A new copy each call. */
function validSet() {
    return {
        blueprints: [{ id: 'item', name: 'Item', description: '', version: 1, fields: ITEM_BLUEPRINT.fields }],
        assets: [{ key: 'sword', schemaId: 'item', schemaVersion: 1, data: { name: 'Sword', power: 3 } }],
        dialogues: [simpleDialogue('greeting', 'Greeting')],
    }
}

/** A set whose blueprints, assets and dialogues aren't lists. */
function setWithWrongTypes() {
    return { blueprints: 'oops', assets: [], dialogues: [] }
}

/** A valid set whose asset names a blueprint that isn't in the set. */
function setWithMissingBlueprint() {
    const set = validSet()
    set.assets[0].schemaId = 'ghost_blueprint'
    return set
}

/** A valid set with its blueprint listed twice under the same ID. */
function setWithRepeatedBlueprint() {
    const set = validSet()
    set.blueprints.push(validSet().blueprints[0])
    return set
}

/** A valid set with its dialogue swapped for `dialogue`. */
function setWithDialogue(dialogue) {
    const set = validSet()
    set.dialogues = [dialogue]
    return set
}

/** A dialogue whose Line leads to a step that isn't in it (as if that step was deleted from the file). */
function danglingDialogue(key) {
    const dialogue = simpleDialogue(key, 'Missing step')
    dialogue.edges[1].target = 'ghost_step'
    return dialogue
}

/** A dialogue whose Line step was replaced by null. */
function nullStepDialogue(key) {
    const dialogue = simpleDialogue(key, 'Null step')
    dialogue.nodes[1] = null
    return dialogue
}
