import { STARTER_ASSETS } from './starterAssets.js'

/*
 * Where saved assets live until the backend exists (PLAN.md Phase 2): the browser's localStorage.
 * Same pattern as schema/blueprintStore.js: read with useAssets(), change only through these functions.
 *
 * Each asset: { id, key, schemaId, schemaVersion, data, createdAt, updatedAt } (PLAN.md §5.4)
 *   id: internal unique ID (never shown)       key: the user-facing ID, unique per blueprint
 *   schemaId/schemaVersion: the blueprint (and its version) the asset was last saved with
 */

const STORAGE_KEY = 'gameatlas.assets.v1'
const listeners = new Set()
let assets = load()

function load() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === null) {
      return STARTER_ASSETS
    }
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) {
      return STARTER_ASSETS
    }
    return parsed
  } catch {
    return STARTER_ASSETS
  }
}

// Replaces the list, saves it, and tells every subscriber (so the pages re-render)
function commit(next) {
  assets = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage can be unavailable (e.g. a private window). Keep working in memory.
  }
  for (const listener of listeners) {
    listener()
  }
}

export function subscribe(listener) {
  listeners.add(listener)
  // useSyncExternalStore calls the returned function to stop listening
  return function unsubscribe() {
    listeners.delete(listener)
  }
}

export function getAssets() {
  return assets
}

/** Adds new assets and replaces existing ones (matched by `id`) in one change. */
export function saveAssets(changedAssets) {
  const next = []

  // Existing assets keep their place; a changed one is swapped in
  for (const asset of assets) {
    const changed = changedAssets.find((candidate) => candidate.id === asset.id)
    if (changed) {
      next.push(changed)
    } else {
      next.push(asset)
    }
  }

  // Assets that didn't exist yet go at the end
  for (const asset of changedAssets) {
    const alreadyExists = assets.some((existing) => existing.id === asset.id)
    if (!alreadyExists) {
      next.push(asset)
    }
  }

  commit(next)
}

export function deleteAsset(id) {
  commit(assets.filter((asset) => asset.id !== id))
}

/** Replaces every asset at once (restoring a backup, resetting). */
export function replaceAssets(nextAssets) {
  commit(nextAssets)
}

export function deleteAssetsOfBlueprint(schemaId) {
  commit(assets.filter((asset) => asset.schemaId !== schemaId))
}

/** Keeps assets attached to a blueprint whose ID was changed. */
export function moveAssetsToBlueprint(fromSchemaId, toSchemaId) {
  const next = []
  for (const asset of assets) {
    if (asset.schemaId === fromSchemaId) {
      next.push({ ...asset, schemaId: toSchemaId })
    } else {
      next.push(asset)
    }
  }
  commit(next)
}
