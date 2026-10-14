/*
 * Calls to the user part of the REST API (backend/src/routes/users.ts).
 *
 * The addresses are relative, so the browser only ever talks to the page's own address: Vite passes
 * anything starting with /api on to the backend during development (vite.config.js). That means no
 * CORS setup, and the login cookie the server sets is sent back automatically.
 *
 * Both calls answer { user } when it worked, or { error } with a message to show the person.
 * The user is the shape in backend/src/types/users.ts, minus the password hash:
 * { id, email, displayName, createdAt, projectIds }.
 */

/** Signs up. The backend refuses an email that's already registered. */
export function signUp(email, password, displayName) {
  return postJson('/api/users', { email: email, password: password, displayName: displayName })
}

/**
 * Ends the session: the server forgets it and clears the cookie, so the next call to /api/users/me
 * answers 401 again. There's nothing to send and nothing to read back, so only a failure matters.
 */
export function logOut() {
  return postJson('/api/users/logout', {})
}

/** Logs in. On success the browser keeps the session cookie the server sends back. */
export function logIn(email, password) {
  return postJson('/api/users/login', { email: email, password: password })
}

/**
 * Sends `body` as JSON and reads the answer.
 *
 * The server says what went wrong in a { message } field, so a failure passes that straight through
 * instead of inventing wording here. Two things can go wrong before that: the server isn't running
 * (fetch itself fails), or the answer isn't JSON at all.
 */
async function postJson(path, body) {
  let response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    return { error: "Couldn't reach the server. Is the backend running?" }
  }

  let data
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    let message = 'Something went wrong. Please try again.'
    if (data && typeof data.message === 'string') {
      message = data.message
    }
    return { error: message }
  }

  return { user: data }
}
