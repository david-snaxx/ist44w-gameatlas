import * as assetsApi from '../api/assets.js'

/*
 * The current project's assets, loaded from the server once per page load and kept in memory. Read them with
 * useAssets() and change them only through the functions below, which wait for the server's answer.
 * Each asset is { id, key, schemaId, schemaVersion, data, createdAt, updatedAt } (PLAN.md §5.4).
 */

const listeners = new Set()

/**
 * What's in memory. `projectId` is null when there's no project (nobody is logged in), and `status` is 'loading',
 * 'ready' or 'failed' (`error` says why).
 */
let cache = { projectId: null, status: 'loading', assets: [], error: null }

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
function commitAssets(nextAssets) {
  commit({ projectId: cache.projectId, status: cache.status, assets: nextAssets, error: cache.error })
}

export function subscribe(listener) {
  listeners.add(listener)
  // useSyncExternalStore calls the returned function to stop listening
  return function unsubscribe() {
    listeners.delete(listener)
  }
}

// Each returns the same object until something changes, which is what useSyncExternalStore needs
export function getAssets() {
  return cache.assets
}

export function getAssetCache() {
  return cache
}

/** Loads a project's assets, once per page load and again for a different project. null empties the list. */
export function loadAssets(projectId) {
  if (projectId === null) {
    loadingFor = null
    if (cache.projectId !== null) {
      commit({ projectId: null, status: 'ready', assets: [], error: null })
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
  // Don't keep showing another project's assets meanwhile
  if (cache.projectId !== projectId) {
    commit({ projectId: projectId, status: 'loading', assets: [], error: null })
  }
  load(projectId)
}

/** Fetches the project's list into memory, unless another project was asked for meanwhile. */
async function load(projectId) {
  const result = await assetsApi.listAssets(projectId)
  if (loadingFor !== projectId) {
    return
  }
  loadingFor = null

  if (result.error) {
    commit({ projectId: projectId, status: 'failed', assets: [], error: result.error })
    return
  }
  commit({ projectId: projectId, status: 'ready', assets: result.data, error: null })
}

/**
 * Saves { id?, key, schemaId, data } (no `id` for a new asset) and waits for the server, whose answer replaces it in
 * the list. A rename reloads the list, since the server also moved links in other assets. Answers { data } or { error }.
 */
export async function saveAsset(asset) {
  const projectId = cache.projectId
  if (projectId === null) {
    return { error: 'Log in to save assets.' }
  }

  const previous = cache.assets.find((candidate) => candidate.id === asset.id)
  let result
  if (asset.id) {
    result = await assetsApi.updateAsset(projectId, asset.id, asset)
  } else {
    result = await assetsApi.createAsset(projectId, asset)
  }
  // Ignore a refusal, or an answer for a project that's no longer current
  if (result.error || cache.projectId !== projectId) {
    return result
  }
  commitAssets(withAsset(cache.assets, result.data))

  const isRenamed = previous !== undefined && previous.key !== asset.key
  if (isRenamed) {
    // If this fails the save still worked; other assets show the old links until the next page load
    const reloaded = await assetsApi.listAssets(projectId)
    if (!reloaded.error && cache.projectId === projectId) {
      commitAssets(reloaded.data)
    }
  }
  return result
}

/** Deletes an asset and waits for the server; only then does it leave the list. Answers { data } or { error }. */
export async function deleteAsset(id) {
  const projectId = cache.projectId
  if (projectId === null) {
    return { error: 'Log in to delete assets.' }
  }

  const result = await assetsApi.deleteAsset(projectId, id)
  if (result.error || cache.projectId !== projectId) {
    return result
  }
  commitAssets(cache.assets.filter((asset) => asset.id !== id))
  return result
}

/** Puts a project's whole list in memory at once: the server's answer after replacing the whole project. */
export function replaceAssets(projectId, nextAssets) {
  loadingFor = null
  commit({ projectId: projectId, status: 'ready', assets: nextAssets, error: null })
}

/** Takes a deleted blueprint's assets out of memory, matching what the server already did. */
export function deleteAssetsOfBlueprint(schemaId) {
  commitAssets(cache.assets.filter((asset) => asset.schemaId !== schemaId))
}

/** Moves assets in memory to a renamed blueprint's new ID, matching what the server already did. */
export function moveAssetsToBlueprint(fromSchemaId, toSchemaId) {
  const next = []
  for (const asset of cache.assets) {
    if (asset.schemaId === fromSchemaId) {
      next.push({ ...asset, schemaId: toSchemaId })
    } else {
      next.push(asset)
    }
  }
  commitAssets(next)
}

/** A copy of the list with `saved` in place of the asset with the same id, or added at the end. */
function withAsset(assets, saved) {
  const next = []
  let found = false
  for (const asset of assets) {
    if (asset.id === saved.id) {
      next.push(saved)
      found = true
    } else {
      next.push(asset)
    }
  }
  if (!found) {
    next.push(saved)
  }
  return next
}
