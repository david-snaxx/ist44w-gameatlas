import {useEffect, useSyncExternalStore} from 'react'
import {getCurrentUser, loadCurrentUser, subscribe} from './currentUserStore.js'

/**
 * Gets the logged-in user, and asks the server the first time it's used on a page load.
 * Answers { checked, user } where:
 * - checked: false until the server has answered
 * - user: the logged-in {@link User}
 */
export function useCurrentUser() {
    const currentUser = useSyncExternalStore(subscribe, getCurrentUser)
    useEffect(() => {
        loadCurrentUser()
    }, [])
    return currentUser
}
