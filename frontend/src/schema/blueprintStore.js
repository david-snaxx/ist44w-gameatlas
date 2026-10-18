import * as blueprintsApi from '../api/blueprints.js'

/*
 * The current project's blueprints, loaded from the server once per page load and kept in memory. Read them with
 * useBlueprints() and change them only through the functions below, which wait for the server's answer.
 */

const listeners = new Set()

/**
 * What's in memory. `projectId` is null when there's no project (nobody is logged in), and `status` is 'loading',
 * 'ready' or 'failed' (`error` says why).
 */
let cache = { projectId: null, status: 'loading', blueprints: [], error: null }

/** The project whose list is on its way, so pages asking at once share one request. */
let loadingFor = null

/** Replaces what's in memory and notifies every subscriber, so the pages re-render. */
function commit(next) {
  cache = next
  for (const listener of listeners) {
    listener()
  }
}

/** Replaces just the list. */
function commitBlueprints(nextBlueprints) {
  commit({ projectId: cache.projectId, status: cache.status, blueprints: nextBlueprints, error: cache.error })
}

export function subscribe(listener) {
  listeners.add(listener)
  // useSyncExternalStore calls the returned function to stop listening
  return function unsubscribe() {
    listeners.delete(listener)
  }
}

// Each returns the same object until something changes, which is what useSyncExternalStore needs
export function getBlueprints() {
  return cache.blueprints
}

export function getBlueprintCache() {
  return cache
}

/** Loads a project's blueprints, once per page load and again for a different project. null empties the list. */
export function loadBlueprints(projectId) {
  if (projectId === null) {
    loadingFor = null
    if (cache.projectId !== null) {
      commit({ projectId: null, status: 'ready', blueprints: [], error: null })
    }
    return
  }

  if (loadingFor === projectId) {
    return
  }
  if (cache.projectId === projectId && cache.status === 'ready') {
    return
  }
  loadingFor = projectId
  // Don't keep showing another project's blueprints meanwhile
  if (cache.projectId !== projectId) {
    commit({ projectId: projectId, status: 'loading', blueprints: [], error: null })
  }
  load(projectId)
}

/** Fetches the project's list into memory, unless another project was asked for meanwhile. */
async function load(projectId) {
  const result = await blueprintsApi.listBlueprints(projectId)
  if (loadingFor !== projectId) {
    return
  }
  loadingFor = null

  if (result.error) {
    commit({ projectId: projectId, status: 'failed', blueprints: [], error: result.error })
    return
  }
  commit({ projectId: projectId, status: 'ready', blueprints: result.data, error: null })
}

/**
 * Saves a blueprint and waits for the server; `previousId` is its saved ID, or null for a new one. The server's
 * answer replaces it in the list. A rename reloads the list, since the server also moved other blueprints' links.
 * Answers { data } or { error }.
 */
export async function saveBlueprint(definition, previousId) {
  const projectId = cache.projectId
  if (projectId === null) {
    return { error: 'Log in to save blueprints.' }
  }

  let result
  if (previousId) {
    result = await blueprintsApi.updateBlueprint(projectId, previousId, definition)
  } else {
    result = await blueprintsApi.createBlueprint(projectId, definition)
  }
  // Ignore a refusal, or an answer for a project that's no longer current
  if (result.error || cache.projectId !== projectId) {
    return result
  }
  commitBlueprints(withBlueprint(cache.blueprints, previousId, result.data))

  const isRenamed = Boolean(previousId) && previousId !== result.data.id
  if (isRenamed) {
    // If this fails the save still worked; other blueprints show the old links until the next page load
    const reloaded = await blueprintsApi.listBlueprints(projectId)
    if (!reloaded.error && cache.projectId === projectId) {
      commitBlueprints(reloaded.data)
    }
  }
  return result
}

/** Deletes a blueprint (the server deletes its assets too) and waits for the answer. Answers { data } or { error }. */
export async function deleteBlueprint(id) {
  const projectId = cache.projectId
  if (projectId === null) {
    return { error: 'Log in to delete blueprints.' }
  }

  const result = await blueprintsApi.deleteBlueprint(projectId, id)
  if (result.error || cache.projectId !== projectId) {
    return result
  }
  commitBlueprints(cache.blueprints.filter((blueprint) => blueprint.id !== id))
  return result
}

/** Puts a project's whole list in memory at once: the server's answer after replacing the whole project. */
export function replaceBlueprints(projectId, nextBlueprints) {
  loadingFor = null
  commit({ projectId: projectId, status: 'ready', blueprints: nextBlueprints, error: null })
}

/** A copy of the list with `saved` in place of blueprint `previousId`, or added at the end. */
function withBlueprint(blueprints, previousId, saved) {
  const next = []
  let found = false
  for (const blueprint of blueprints) {
    if (previousId && blueprint.id === previousId) {
      next.push(saved)
      found = true
    } else {
      next.push(blueprint)
    }
  }
  if (!found) {
    next.push(saved)
  }
  return next
}
