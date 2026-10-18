import { useEffect, useSyncExternalStore } from 'react'
import { useCurrentProject } from '../api/useCurrentProject.js'
import { getBlueprintCache, loadBlueprints, subscribe } from './blueprintStore.js'

// Shared objects, so a page that renders again gets the same ones back
const NO_BLUEPRINTS = []
const LOADING = { status: 'loading', blueprints: NO_BLUEPRINTS, error: null }

/** The current project's blueprints; empty while loading and when nobody is logged in (see useBlueprintsStatus()). */
export function useBlueprints() {
  return useBlueprintCache().blueprints
}

/**
 * One blueprint by its ID: { status, blueprint, error }. `status` is 'loading', 'found', 'missing' (also for a new
 * blueprint, which has no ID yet) or 'failed' (`error` says why).
 */
export function useBlueprint(id) {
  const cache = useBlueprintCache()

  if (cache.status !== 'ready') {
    return { status: cache.status, blueprint: null, error: cache.error }
  }
  const blueprint = cache.blueprints.find((candidate) => candidate.id === id)
  if (!blueprint) {
    return { status: 'missing', blueprint: null, error: null }
  }
  return { status: 'found', blueprint: blueprint, error: null }
}

/** Whether the current project's blueprints have arrived: { status: 'loading' | 'ready' | 'failed', error }. */
export function useBlueprintsStatus() {
  const cache = useBlueprintCache()
  return { status: cache.status, error: cache.error }
}

/** The current project's blueprints as this page should see them: { status, blueprints, error }. Starts the load. */
function useBlueprintCache() {
  const currentProject = useCurrentProject()
  const cache = useSyncExternalStore(subscribe, getBlueprintCache)

  let projectId = null
  if (currentProject.project) {
    projectId = currentProject.project.id
  }

  // Runs again when the project changes
  useEffect(() => {
    if (currentProject.checked) {
      loadBlueprints(projectId)
    }
  }, [currentProject.checked, projectId])

  if (!currentProject.checked) {
    return LOADING
  }
  if (projectId === null) {
    let error = currentProject.error
    if (!error) {
      error = 'Log in to see your blueprints.'
    }
    return { status: 'failed', blueprints: NO_BLUEPRINTS, error: error }
  }
  // The store can briefly still hold another project's blueprints
  if (cache.projectId !== projectId) {
    return LOADING
  }
  return cache
}
