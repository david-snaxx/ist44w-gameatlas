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
    if (stored === null) return STARTER_ASSETS
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : STARTER_ASSETS
  } catch {
    return STARTER_ASSETS
  }
}

function commit(next) {
  assets = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage can be unavailable (e.g. a private window). Keep working in memory.
  }
  listeners.forEach((listener) => listener())
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getAssets() {
  return assets
}

/** Adds new assets and replaces existing ones (matched by `id`) in one change. */
export function saveAssets(changedAssets) {
  const changedById = new Map(changedAssets.map((asset) => [asset.id, asset]))
  const existingIds = new Set(assets.map((asset) => asset.id))
  commit([
    ...assets.map((asset) => changedById.get(asset.id) ?? asset),
    ...changedAssets.filter((asset) => !existingIds.has(asset.id)),
  ])
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
  commit(assets.map((asset) => (asset.schemaId === fromSchemaId ? { ...asset, schemaId: toSchemaId } : asset)))
}
