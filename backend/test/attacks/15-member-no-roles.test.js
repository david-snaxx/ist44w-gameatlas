/*
 * Attack 15 — A collaborator in a shared project does project-owner things.
 *
 * There are no member roles yet: every member can do everything. A second member (Bob), invited to one of
 * Alice's shared projects, tries the owner/admin-level actions a role field should gate: rename the project,
 * remove the owner, delete the project, and wipe all its contents. Ordinary content editing (assets,
 * blueprints, dialogues) is legitimate collaboration and is NOT tested here.
 *
 * PASS = each admin action by a plain member is refused (4xx) and nothing changes.
 * Roles are deliberately future work (PLAN.md's stretch list), so every case is a `todo`: it still runs and
 * prints, but shows as ⚠ instead of counting as a failure. Each action runs on its own project.
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

/** Node's `todo` option for every case here: a known, accepted limitation rather than a failure. */
const FUTURE_RULE = { todo: 'roles are future work (PLAN.md stretch list): every member may do this today' }

test('a plain member cannot do owner-level actions on a shared project', async (t) => {
    if (!serverUp) {
        t.skip(SERVER_DOWN_MESSAGE)
        return
    }

    const owner = await newAccount('owner')
    const member = await newAccount('member')
    try {
        await logIn(owner)
        await logIn(member)

        await t.test("a member can't rename a shared project", FUTURE_RULE, async () => {
            const project = await sharedProject(owner, member, 'rename')
            const result = await api('PUT', `/api/projects/${project.id}`, {
                cookie: member.cookie,
                body: { name: 'Renamed by a member' },
            })
            console.log(`Member tried to rename the project: status ${result.status}.`)
            assert.ok(result.status >= 400, `A member renamed a shared project (${summarize(result)}).`)
            assert.equal(await projectName(owner.cookie, project.id), project.name, 'The project was renamed by a member.')
        })

        await t.test("a member can't remove the owner", FUTURE_RULE, async () => {
            const project = await sharedProject(owner, member, 'remove-owner')
            const result = await api('DELETE', `/api/projects/${project.id}/members/${owner.id}`, {
                cookie: member.cookie,
            })
            console.log(`Member tried to remove the owner: status ${result.status}.`)
            assert.ok(result.status >= 400, `A member removed the project owner (${summarize(result)}).`)

            const members = await api('GET', `/api/projects/${project.id}/members`, { cookie: owner.cookie })
            const memberIds = []
            for (const one of members.body ?? []) {
                memberIds.push(one.id)
            }
            assert.ok(memberIds.includes(owner.id), 'The owner was removed from their own project by a member.')
        })

        await t.test("a member can't delete a shared project", FUTURE_RULE, async () => {
            const project = await sharedProject(owner, member, 'delete')
            const result = await api('DELETE', `/api/projects/${project.id}`, { cookie: member.cookie })
            console.log(`Member tried to delete the project: status ${result.status}.`)
            assert.ok(result.status >= 400, `A member deleted a shared project (${summarize(result)}).`)
            assert.ok(await projectExists(owner.cookie, project.id), 'A member deleted the shared project.')
        })

        await t.test("a member can't wipe all of a project's contents", FUTURE_RULE, async () => {
            const project = await sharedProject(owner, member, 'wipe')
            const result = await api('PUT', `/api/projects/${project.id}/contents`, {
                cookie: member.cookie,
                body: { blueprints: [], assets: [], dialogues: [] },
            })
            console.log(`Member tried to wipe the project: status ${result.status}.`)
            assert.ok(result.status >= 400, `A member wiped a shared project's contents (${summarize(result)}).`)

            const pid = encodeURIComponent(project.id)
            const assets = await api('GET', `/api/assets?projectId=${pid}`, { cookie: owner.cookie })
            assert.ok((assets.body ?? []).length > 0, "A member emptied the shared project's assets.")
        })
    } finally {
        // owner first removes the projects where they are still a member; member cleans up any left to them
        await deleteAccount(owner)
        await deleteAccount(member)
    }
})

/** A fresh shared project owned by `owner`, seeded with one of everything, with `member` added to it. */
async function sharedProject(owner, member, label) {
    const project = await createProject(owner.cookie, `collab-${label}-${randomSuffix()}`)
    await createBlueprint(owner.cookie, project.id, ITEM_BLUEPRINT)
    await createAsset(owner.cookie, project.id, { key: 'seed_item', schemaId: 'item', data: { name: 'Seed', power: 1 } })
    await createDialogue(owner.cookie, project.id, simpleDialogue('seed_talk', 'Seed Talk'))

    const added = await api('POST', `/api/projects/${project.id}/members`, {
        cookie: owner.cookie,
        body: { email: member.email },
    })
    if (added.status !== 201) {
        throw new Error(`Setup failed: could not add the member (${summarize(added)}).`)
    }
    return project
}

/** The project's current name as the owner sees it, or null when it's gone. */
async function projectName(cookie, projectId) {
    const projects = await api('GET', '/api/projects', { cookie: cookie })
    for (const project of projects.body ?? []) {
        if (project.id === projectId) {
            return project.name
        }
    }
    return null
}

/** True when the owner can still see the project in their list. */
async function projectExists(cookie, projectId) {
    const name = await projectName(cookie, projectId)
    return name !== null
}
