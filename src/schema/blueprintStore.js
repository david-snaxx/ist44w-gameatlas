import { STARTER_BLUEPRINTS } from './starterBlueprints.js'

/*
 * Where saved blueprints live until the backend exists (PLAN.md Phase 2): the browser's localStorage.
 *
 * Components read blueprints with useBlueprints(). Every change goes through saveBlueprint() or
 * deleteBlueprint(), which notify subscribers so the sidebar, list and builder all update together.
 * Later these functions can call the REST API instead, without changing any page.
 */

const STORAGE_KEY = 'gameatlas.blueprints.v1'
const listeners = new Set()
let blueprints = load()

function load() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === null) return STARTER_BLUEPRINTS
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : STARTER_BLUEPRINTS
  } catch {
    return STARTER_BLUEPRINTS
  }
}

function commit(next) {
  blueprints = next
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

// Returns the same array until something changes, which is what useSyncExternalStore needs
export function getBlueprints() {
  return blueprints
}

/** Adds or replaces a blueprint. Pass previousId when the blueprint's ID was changed. */
export function saveBlueprint(definition, previousId = definition.id) {
  const index = blueprints.findIndex((blueprint) => blueprint.id === previousId)
  commit(
    index === -1
      ? [...blueprints, definition]
      : blueprints.map((blueprint, i) => (i === index ? definition : blueprint)),
  )
}

export function deleteBlueprint(id) {
  commit(blueprints.filter((blueprint) => blueprint.id !== id))
}

/** Replaces every blueprint at once (restoring a backup, resetting). */
export function replaceBlueprints(nextBlueprints) {
  commit(nextBlueprints)
}
