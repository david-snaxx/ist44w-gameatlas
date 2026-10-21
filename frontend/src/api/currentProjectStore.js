import {STARTER_ASSETS} from '../data/starterAssets.js'
import {STARTER_DIALOGUES} from '../data/starterDialogues.js'
import {STARTER_BLUEPRINTS} from '../schema/starterBlueprints.js'
import {listBlueprints} from './blueprints.js'
import {createProject, listProjects, replaceProjectContents} from './projects.js'

/*
 * Stores the logged-in user's projects in the app's memory.
 * The user's projects are read with useCurrentProject(), which picks the one a page is about, and are loaded from
 * the database once per page load.
 */

/** The functions to call whenever the answer changes (see subscribe()). */
const listeners = new Set()

/**
 * The answer before the server has given one.
 * Once it has, it takes the form { checked, userId, projects, blueprints, error, lastVisitedId } where:
 * - checked: true once the server has answered
 * - userId: the user these {@link Project}s belong to
 * - projects: the user's Projects, oldest first
 * - blueprints: each Project's {@link Blueprint}s by Project id
 * - error: what went wrong while asking
 * - lastVisitedId: the Project whose pages the user opened last, or null before they've opened any
 */
export const NOT_CHECKED = {
    checked: false,
    userId: null,
    projects: [],
    blueprints: {},
    error: null,
    lastVisitedId: null
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
    if (askingFor !== user.id) {
        return
    }
    askingFor = null
    commit(answer)
}

/**
 * Gets a user's {@link Project}s and each one's {@link Blueprint}s.
 * A user without a personal Project yet (on their first login) gets it first.
 * @param user The logged-in {@link User}.
 */
async function fetchProjects(user) {
    let listed = await listProjects()
    if (!listed.error && !hasPersonalProject(listed.data, user)) {
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
    const created = await createProject(personalProjectName(user), true)
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
 * Whether one of these {@link Project}s is the user's personal one.
 * @param projects The user's Projects.
 * @param user The logged-in {@link User}.
 */
function hasPersonalProject(projects, user) {
    return projects.some((project) => project.personalUserId === user.id)
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
 * Remembers the {@link Project} whose pages the user just opened, so pages without a project in their URL (home,
 * settings) use it too.
 * @param projectId The Project's id.
 */
export function rememberProject(projectId) {
    if (currentProject.lastVisitedId === projectId) {
        return
    }
    commit({...currentProject, lastVisitedId: projectId})
}

/**
 * Adds a {@link Project} the user just made on the server. It's the newest, so it goes last, with no Blueprints yet.
 * @param project The Project as the server answered it.
 */
export function addProject(project) {
    const nextBlueprints = {...currentProject.blueprints}
    nextBlueprints[project.id] = []
    commit({...currentProject, projects: [...currentProject.projects, project], blueprints: nextBlueprints})
}

/**
 * Puts the server's copy of a {@link Project} in place of the old one, e.g. after renaming it.
 * @param project The Project as the server answered it.
 */
export function replaceProject(project) {
    const nextProjects = []
    for (const current of currentProject.projects) {
        if (current.id === project.id) {
            nextProjects.push(project)
        } else {
            nextProjects.push(current)
        }
    }
    commit({...currentProject, projects: nextProjects})
}

/**
 * Takes a {@link Project} out of the answer after the user deleted or left it on the server.
 * @param projectId The Project's id.
 */
export function forgetProject(projectId) {
    const nextProjects = currentProject.projects.filter((project) => project.id !== projectId)
    const nextBlueprints = {...currentProject.blueprints}
    delete nextBlueprints[projectId]

    let lastVisitedId = currentProject.lastVisitedId
    if (lastVisitedId === projectId) {
        lastVisitedId = null
    }
    commit({...currentProject, projects: nextProjects, blueprints: nextBlueprints, lastVisitedId: lastVisitedId})
}

/**
 * Replaces one {@link Project}'s {@link Blueprint}s after the blueprint store loaded or changed them, so the sidebar
 * shows what's saved now in every Project, not just the one open. Does nothing for a Project that isn't the user's.
 * @param projectId The Project's id.
 * @param blueprints Its Blueprints.
 */
export function setProjectBlueprints(projectId, blueprints) {
    if (currentProject.blueprints[projectId] === blueprints) {
        return
    }
    const isUsersProject = currentProject.projects.some((project) => project.id === projectId)
    if (!isUsersProject) {
        return
    }

    const nextBlueprints = {...currentProject.blueprints}
    nextBlueprints[projectId] = blueprints
    commit({...currentProject, blueprints: nextBlueprints})
}

/**
 * A complete answer. Which {@link Project} a page is about is up to useCurrentProject().
 * @param userId Whose Projects these are, or null when nobody is logged in.
 * @param projects All of the user's Projects, oldest first.
 * @param blueprints Each Project's {@link Blueprint}s by Project id.
 * @param error What went wrong while asking, or null.
 */
function answerFor(userId, projects, blueprints, error) {
    return {
        checked: true,
        userId: userId,
        projects: projects,
        blueprints: blueprints,
        error: error,
        lastVisitedId: null,
    }
}
