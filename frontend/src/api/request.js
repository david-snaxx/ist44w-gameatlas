/*
 * Interface to send requests directly to the backend REST api.
 */

/** The error shown when the backend can't be reached, e.g. because it's down or restarting. */
const SERVER_UNREACHABLE = "Couldn't reach the server. It may be down or restarting, so try again in a moment."

/**
 * Sends a request to the backend and reads its answer.
 * Answers { data } when it worked (null for a 204), or { error } with the server's message.
 * Field problems also come back as `errors` ([{ path, message }]), with `error` set to the first message.
 * @param method The HTTP method
 * @param path The api path to call
 * @param body Optional; JSON request body
 */
export async function sendRequest(method, path, body) {
    const options = {
        method: method,
        headers: {}
    }
    if (body !== undefined) {
        options.headers['Content-Type'] = 'application/json'
        options.body = JSON.stringify(body)
    }

    let response
    try {
        response = await fetch(path, options)
    } catch {
        return {
            error: SERVER_UNREACHABLE
        }
    }

    // not all responses (like 204) have a json response
    let data
    try {
        data = await response.json()
    } catch {
        data = null
    }

    if (response.ok) {
        return {data: data}
    }
    // the backend always answers in JSON, so a failure without any came from something in between,
    // e.g. Vite's proxy answering 502 because the backend is down
    if (data === null) {
        return {
            error: SERVER_UNREACHABLE
        }
    }
    return failureFrom(data)
}

/**
 * Turns a failed answer's body into { error }, plus `errors` when the server listed field problems.
 * @param data The failed answer's body
 */
function failureFrom(data) {
    // multiple errors
    if (data && Array.isArray(data.errors) && data.errors.length > 0) {
        return {
            error: data.errors[0].message,
            errors: data.errors
        }
    }
    // single error
    if (data && typeof data.message === 'string') {
        return {
            error: data.message
        }
    }
    return {
        error: 'Unknown issue, something went wrong.'
    }
}
