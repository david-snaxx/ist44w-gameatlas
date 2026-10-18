import { useEffect, useSyncExternalStore } from 'react'
import { useCurrentProject } from '../api/useCurrentProject.js'
import { getAssetCache, loadAssets, subscribe } from './assetStore.js'

// Shared objects, so a page that renders again gets the same ones back
const NO_ASSETS = []
const LOADING = { status: 'loading', assets: NO_ASSETS, error: null }

/** The current project's assets, of every blueprint; empty while loading and when nobody is logged in. */
export function useAssets() {
  return useAssetCache().assets
}

/**
 * One asset by its blueprint's ID and its own: { status, asset, error }. `status` is 'loading', 'found', 'missing'
 * (also for a new asset, which has no ID yet) or 'failed' (`error` says why).
 */
export function useAsset(schemaId, key) {
  const cache = useAssetCache()

  if (cache.status !== 'ready') {
    return { status: cache.status, asset: null, error: cache.error }
  }
  const asset = cache.assets.find((candidate) => candidate.schemaId === schemaId && candidate.key === key)
  if (!asset) {
    return { status: 'missing', asset: null, error: null }
  }
  return { status: 'found', asset: asset, error: null }
}

/** The current project's assets as this page should see them: { status, assets, error }. Starts the load. */
function useAssetCache() {
  const currentProject = useCurrentProject()
  const cache = useSyncExternalStore(subscribe, getAssetCache)

  let projectId = null
  if (currentProject.project) {
    projectId = currentProject.project.id
  }

  // Runs again when the project changes
  useEffect(() => {
    if (currentProject.checked) {
      loadAssets(projectId)
    }
  }, [currentProject.checked, projectId])

  if (!currentProject.checked) {
    return LOADING
  }
  if (projectId === null) {
    let error = currentProject.error
    if (!error) {
      error = 'Log in to see your assets.'
    }
    return { status: 'failed', assets: NO_ASSETS, error: error }
  }
  // The store can briefly still hold another project's assets
  if (cache.projectId !== projectId) {
    return LOADING
  }
  return cache
}
