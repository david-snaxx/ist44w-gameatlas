/*
 * Who is logged in, shared by the whole app.
 *
 * The browser can't work this out on its own: the session cookie is httpOnly, so JavaScript can't
 * read it. The only way to know is to ask the server (GET /api/users/me), which answers with the
 * user or 401. This asks once and keeps the answer, so the sidebar and the account page agree
 * without each making their own request.
 *
 * Components read it with useCurrentUser(). This mirrors blueprintStore.js, which does the same job
 * for blueprints.
 */

const listeners = new Set()

// checked: has the server answered yet? Until it has, nothing should claim nobody is logged in.
let currentUser = { checked: false, user: null }

// The request that is in the air, so several components starting at once only cause one
let asking = null

// Replaces the answer and tells every subscriber (so the pages re-render)
function commit(next) {
  currentUser = next
  for (const listener of listeners) {
    listener()
  }
}

export function subscribe(listener) {
  listeners.add(listener)
  return function unsubscribe() {
    listeners.delete(listener)
  }
}

export function getCurrentUser() {
  return currentUser
}

/**
 * Asks the server who is logged in, once per page load.
 *
 * The sidebar is rebuilt on every page, so this is called again on each one. Asking the server every
 * time would be a round trip per click for an answer that hasn't changed, so once there is an answer
 * this does nothing. The login page keeps it right with setCurrentUser().
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

async function askServer() {
  try {
    const response = await fetch('/api/users/me')
    if (response.ok) {
      const user = await response.json()
      commit({ checked: true, user: user })
    } else {
      // 401 is the ordinary "nobody is logged in" answer, not a failure
      commit({ checked: true, user: null })
    }
  } catch {
    // The backend isn't running. Count that as logged out so the app doesn't wait forever.
    commit({ checked: true, user: null })
  }
  asking = null
}

/**
 * Remembers the user the login page was just handed, so the sidebar shows their name straight away
 * instead of asking the server for something it already knows.
 */
export function setCurrentUser(user) {
  commit({ checked: true, user: user })
}

/** Forgets the user after logging out, so the sidebar and every open page update together. */
export function clearCurrentUser() {
  commit({ checked: true, user: null })
}
