import {useEffect, useSyncExternalStore} from 'react'
import {useParams} from 'react-router'
import {getCurrentProject, loadCurrentProject, NOT_CHECKED, subscribe} from './currentProjectStore.js'
import {useCurrentUser} from './useCurrentUser.js'

/**
 * Gets the logged-in user's {@link Project}s and the one this page is about, and asks the server for them again when
 * a different user logs in.
 * Returns { checked, project, missing, projects, blueprints, error } where:
 * - checked: true once the server has answered
 * - project: the Project in the URL (/projects/:projectId/…); on pages without one, the last Project the user
 *   visited, or their oldest. null while loading, or when the URL's Project isn't one of the user's.
 * - missing: true when the URL names a Project that isn't one of the user's
 * - projects: the user's Projects, oldest first
 * - blueprints: each Project's {@link Blueprint}s by Project id
 * - error: what went wrong while asking
 */
export function useCurrentProject() {
    const currentUser = useCurrentUser()
    const answer = useSyncExternalStore(subscribe, getCurrentProject)
    // undefined on pages whose route has no :projectId
    const {projectId} = useParams()

    // logged-in user changes
    useEffect(() => {
        if (currentUser.checked) {
            loadCurrentProject(currentUser.user)
        }
    }, [currentUser])

    // store can briefly still hold the previous user's answer
    let userId = null
    if (currentUser.user) {
        userId = currentUser.user.id
    }
    if (!currentUser.checked || answer.userId !== userId) {
        return {...NOT_CHECKED, project: null, missing: false}
    }

    const project = pickProject(answer, projectId)
    // An empty list means the projects couldn't be loaded (`error` says why), not that this one is missing
    const missing = Boolean(projectId) && project === null && answer.projects.length > 0

    return {
        checked: true,
        project: project,
        missing: missing,
        projects: answer.projects,
        blueprints: answer.blueprints,
        error: answer.error,
    }
}

/**
 * The {@link Project} a page is about: the one in its URL, else the last one visited, else the oldest. null when the
 * URL's isn't one of the user's, or they have none.
 * @param answer The store's answer.
 * @param urlProjectId The URL's :projectId, or undefined.
 */
function pickProject(answer, urlProjectId) {
    if (urlProjectId) {
        return findProject(answer.projects, urlProjectId)
    }
    const lastVisited = findProject(answer.projects, answer.lastVisitedId)
    if (lastVisited) {
        return lastVisited
    }
    if (answer.projects.length > 0) {
        return answer.projects[0]
    }
    return null
}

/**
 * The {@link Project} with this id, or null.
 * @param projects The user's Projects.
 * @param id The id to look for (may be null).
 */
function findProject(projects, id) {
    const found = projects.find((project) => project.id === id)
    if (!found) {
        return null
    }
    return found
}
