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
