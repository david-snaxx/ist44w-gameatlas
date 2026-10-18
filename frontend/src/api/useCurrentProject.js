import {useEffect, useSyncExternalStore} from 'react'
import {getCurrentProject, loadCurrentProject, NOT_CHECKED, subscribe} from './currentProjectStore.js'
import {useCurrentUser} from './useCurrentUser.js'

/**
 * Gets the logged-in user's {@link Project}s, and asks the server for them again when a different user logs in.
 * Returns { checked, project, projects, blueprints, error } where:
 *  * - checked: true once the server has answered
 *  * - projects: the user's Projects
 *  * - project: the Project the user works in
 *  * - blueprints: each Project's {@link Blueprint}s
 *  * - error: what went wrong while asking
 */
export function useCurrentProject() {
    const currentUser = useCurrentUser()
    const currentProject = useSyncExternalStore(subscribe, getCurrentProject)

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
    if (!currentUser.checked || currentProject.userId !== userId) {
        return NOT_CHECKED
    }
    return currentProject
}
