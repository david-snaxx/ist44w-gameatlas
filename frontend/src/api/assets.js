import {sendRequest} from './request.js'

/*
 * Calls to backend/src/routes/assets.ts.
 * Each answers { data } or { error }.
 */

/**
 * Gets all of a {@link Project}'s {@link Asset}s.
 * @param projectId The Project to get all Assets from.
 */
export async function listAssets(projectId) {
    const path = `/api/assets?projectId=${encodeURIComponent(projectId)}`
    return sendRequest('GET', path)
}

/**
 * Posts a new {@link Asset} to the database.
 * @param projectId The {@link Project} this Asset belongs to.
 * @param asset Takes the form { key, schemaId, data } where:
 * - key: the Asset identifier, unique among its Blueprint's Assets
 * - schemaId: the {@link Blueprint} id this Asset uses as its definition
 * - data: the Asset's property values ({@link AssetData})
 */
export async function createAsset(projectId, asset) {
    const body = {
        projectId: projectId,
        key: asset.key,
        schemaId: asset.schemaId,
        data: asset.data
    }
    const path = '/api/assets'
    return sendRequest('POST', path, body)
}

/**
 * Updates an existing {@link Asset} in the database.
 * @param projectId The {@link Project} this Asset belongs to.
 * @param assetId The Asset to update.
 * @param asset Takes the form { key, data } where:
 * - key: the Asset identifier, unique among its Blueprint's Assets
 * - data: the Asset's property values ({@link AssetData})
 */
export async function updateAsset(projectId, assetId, asset) {
    const body = {
        projectId: projectId,
        key: asset.key,
        data: asset.data
    }
    const path = `/api/assets/${assetId}`
    return sendRequest('PUT', path, body)
}

/**
 * Deletes an {@link Asset} from the database.
 * @param projectId The {@link Project} this Asset belongs to.
 * @param assetId The {@link Asset} to delete.
 */
export async function deleteAsset(projectId, assetId) {
    const path = `/api/assets/${assetId}?projectId=${encodeURIComponent(projectId)}`
    return sendRequest('DELETE', path)
}
