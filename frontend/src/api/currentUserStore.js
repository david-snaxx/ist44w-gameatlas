import {getMe} from './users.js'

/*
 * Stores the logged-in user in the app's memory.
 * The user is read with useCurrentUser() and loaded from the server once per page load.
 * The session cookie is httpOnly, so asking the server is the only way to know who is logged in.
 */

/** The functions to call whenever the answer changes (see subscribe()). */
const listeners = new Set()

/**
 * The current answer. Takes the form { checked, user } where:
 * - checked: false until the server has answered
 * - user: the logged-in {@link User}, or null when nobody is logged in
 */
let currentUser = {
    checked: false,
    user: null
}

/** The request on its way, so components asking at once share one. */
let asking = null

/**
 * Replaces the answer and notifies every subscriber, so the pages re-render.
 * @param next The new answer.
 */
function commit(next) {
    currentUser = next
    for (const listener of listeners) {
        listener()
    }
}

/**
 * Adds a function to call whenever the answer changes, and returns the function that removes it again.
 * useSyncExternalStore (in useCurrentUser()) calls both.
 * @param listener The function to call.
 */
export function subscribe(listener) {
    listeners.add(listener)
    return function unsubscribe() {
        listeners.delete(listener)
    }
}

/** Gets the current answer. It's the same object until the answer changes, which useSyncExternalStore needs. */
export function getCurrentUser() {
    return currentUser
}

/**
 * Asks the server who is logged in, once per page load.
 * After the first answer it does nothing.
 */
export function loadCurrentUser() {
    if (asking) {
        return asking
    }
    if (currentUser.checked) {
        return Promise.resolve()
    }
    asking = askServer()
    return asking
}

/** Asks GET /api/users/me who is logged in, and keeps the answer. */
async function askServer() {
    const result = await getMe()
    // A 401 means nobody is logged in; an unreachable backend counts as that too, so the app doesn't wait forever
    let user = null
    if (!result.error) {
        user = result.data
    }
    commit({
        checked: true,
        user: user
    })
    asking = null
}

/**
 * Remembers the user the login page was just handed, without asking the server again.
 * @param user The logged-in {@link User}.
 */
export function setCurrentUser(user) {
    commit({
        checked: true,
        user: user
    })
}

/** Forgets the user after logging out. */
export function clearCurrentUser() {
    commit({
        checked: true,
        user: null
    })
}
