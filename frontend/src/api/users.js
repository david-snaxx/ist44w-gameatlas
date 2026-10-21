import {sendRequest} from './request.js'

/*
 * Calls to backend/src/routes/users.ts.
 * Each answers { data } or { error }.
 */

/**
 * Posts a new {@link User} to the database.
 * The new user's `data` comes back without the password hash.
 * @param email The email to log in with. Only one account may use it.
 * @param password The password, at least 8 characters long.
 * @param displayName The name shown in the app.
 */
export function signUp(email, password, displayName) {
    const path = '/api/users'
    const body = {
        email: email,
        password: password,
        displayName: displayName
    }
    return sendRequest('POST', path, body)
}

/**
 * Logs the current {@link User} out.
 * The server ends the session and clears the session cookie.
 */
export function logOut() {
    const path = '/api/users/logout'
    return sendRequest('POST', path)
}

/**
 * Logs a {@link User} in and starts their session.
 * The browser keeps the session cookie the server sends back.
 * @param email The email the account was made with.
 * @param password The account's password.
 */
export function logIn(email, password) {
    const path = '/api/users/login'
    const body = {
        email: email,
        password: password
    }
    return sendRequest('POST', path, body)
}

/**
 * Gets the logged-in {@link User}.
 * Fails with a 401 when nobody is logged in.
 */
export function getMe() {
    const path = '/api/users/me'
    return sendRequest('GET', path)
}

/**
 * Changes the logged-in {@link User}'s email and display name.
 * The updated user's `data` comes back without the password hash. Fails with a 409 when the email is taken.
 * @param email The new email to log in with.
 * @param displayName The new name shown in the app.
 */
export function updateMe(email, displayName) {
    const path = '/api/users/me'
    const body = {
        email: email,
        displayName: displayName
    }
    return sendRequest('PUT', path, body)
}

/**
 * Deletes the logged-in {@link User}'s account and logs them out in every browser.
 * Projects nobody else is in are deleted with it. Fails with a 403 when the password is wrong.
 * @param password The account's password, asked again to confirm.
 */
export function deleteMe(password) {
    const path = '/api/users/me'
    const body = {
        password: password
    }
    return sendRequest('DELETE', path, body)
}
