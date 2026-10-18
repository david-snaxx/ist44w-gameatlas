import {STARTER_ASSETS} from '../data/starterAssets.js'
import {STARTER_DIALOGUES} from '../data/starterDialogues.js'
import {STARTER_BLUEPRINTS} from '../schema/starterBlueprints.js'
import {listBlueprints} from './blueprints.js'
import {createProject, listProjects, replaceProjectContents} from './projects.js'

/*
 * Stores the logged-in user's projects in the app's memory.
 * The user's projects are read with useCurrentProject() and loaded from the database once per page load.
 */

/** The functions to call whenever the answer changes (see subscribe()). */
const listeners = new Set()

/**
 * The answer before the server has given one.
 * Once it has, it takes the form { checked, userId, projects, project, blueprints, error } where:
 * - checked: true once the server has answered
 * - userId: the user these {@link Project}s belong to
 * - projects: the user's Projects
 * - project: the Project the user works in
 * - blueprints: each Project's {@link Blueprint}s by Project id
 * - error: what went wrong while asking
 */
export const NOT_CHECKED = {
    checked: false,
    userId: null,
    projects: [],
    project: null,
    blueprints: {},
    error: null
}

/** The current answer (see {@link NOT_CHECKED}). */
let currentProject = NOT_CHECKED

/** Whose projects are on their way, so components asking at once share one request. */
let askingFor = null

/**
 * Replaces the answer and notifies every subscriber, so the pages re-render.
 * @param next The new answer.
 */
function commit(next) {
    currentProject = next
    for (const listener of listeners) {
        listener()
    }
}

/**
 * Adds a function to call whenever the answer changes, and returns the function that removes it again.
 * useSyncExternalStore (in useCurrentProject()) calls both.
 * @param listener The function to call.
 */
export function subscribe(listener) {
    listeners.add(listener)
    return function unsubscribe() {
        listeners.delete(listener)
    }
}

/** Gets the current answer. It's the same object until the answer changes, which useSyncExternalStore needs. */
export function getCurrentProject() {
    return currentProject
}

/**
 * Asks the server for a user's {@link Project}s, once per page load.
 * @param user The logged-in {@link User}, or null when nobody is logged in.
 */
export function loadCurrentProject(user) {
    if (!user) {
        // An answer still on its way is no longer wanted
        askingFor = null
        if (!currentProject.checked || currentProject.userId !== null) {
            commit(answerFor(null, [], {}, null))
        }
        return
    }

    if (askingFor === user.id) {
        return
    }
    if (currentProject.checked && currentProject.userId === user.id) {
        return
    }
    askingFor = user.id
    askServer(user)
}

/**
 * Fetches a user's projects and keeps the answer, unless someone else logged in meanwhile.
 * @param user The logged-in {@link User}.
 */
async function askServer(user) {
    const answer = await fetchProjects(user)

    // Someone else logged in, or nobody, while this was on its way
    if (askingFor !== user.iLd) {
        return
    }
    askingFor = null
    commit(answer)
}

/**
 * Gets a user's {@link Project}s and each one's {@link Blueprint}s.
 * A user with no Projects yet (their first login) gets their personal Project first.
 * @param user The logged-in {@link User}.
 */
async function fetchProjects(user) {
    let listed = await listProjects()
    if (!listed.error && listed.data.length === 0) {
        const filled = await createPersonalProject(user)
        if (filled.error) {
            return answerFor(user.id, [], {}, filled.error)
        }
        // Again, now that the project's ID lists are filled in
        listed = await listProjects()
    }
    if (listed.error) {
        return answerFor(user.id, [], {}, listed.error)
    }

    const projects = listed.data
    const blueprints = {}
    let error = null
    for (const project of projects) {
        const result = await listBlueprints(project.id)
        if (result.error) {
            blueprints[project.id] = []
            error = result.error
        } else {
            blueprints[project.id] = result.data
        }
    }
    return answerFor(user.id, projects, blueprints, error)
}

/**
 * Posts a user's personal {@link Project} and fills it with the starter examples.
 * Answers { data } or { error }.
 * @param user The {@link User} the Project is for.
 */
async function createPersonalProject(user) {
    const created = await createProject(personalProjectName(user))
    if (created.error) {
        return created
    }
    const examples = {
        blueprints: STARTER_BLUEPRINTS,
        assets: STARTER_ASSETS,
        dialogues: STARTER_DIALOGUES
    }
    return replaceProjectContents(created.data.id, examples)
}

/**
 * The name of a user's personal {@link Project}, e.g. "David (personal)".
 * Display names are at most 64 characters, so this fits a project name's 120.
 * @param user The {@link User} the Project is for.
 */
function personalProjectName(user) {
    return `${user.displayName} (personal)`
}

/**
 * A complete answer, working in the first (oldest) {@link Project}.
 * @param userId Whose Projects these are, or null when nobody is logged in.
 * @param projects All of the user's Projects, oldest first.
 * @param blueprints Each Project's {@link Blueprint}s by Project id.
 * @param error What went wrong while asking, or null.
 */
function answerFor(userId, projects, blueprints, error) {
    let project = null
    if (projects.length > 0) {
        project = projects[0]
    }
    return {
        checked: true,
        userId: userId,
        projects: projects,
        project: project,
        blueprints: blueprints,
        error: error,
    }
}
