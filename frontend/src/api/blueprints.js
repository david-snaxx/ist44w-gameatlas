import {sendRequest} from './request.js'

/*
 * Calls to backend/src/routes/blueprints.ts.
 * Each answers { data } or { error }.
 */

/**
 * Gets all of a {@link Project}'s {@link Blueprint}s.
 * @param projectId The Project to get all Blueprints from.
 */
export async function listBlueprints(projectId) {
    const path = `/api/blueprints?projectId=${encodeURIComponent(projectId)}`
    return sendRequest('GET', path)
}

/**
 * Posts a new {@link Blueprint} in the database.
 * @param projectId The {@link Project} this Blueprint belongs to.
 * @param blueprint Takes the form { id, name, description?, fields } where:
 * - id: the Blueprint identifier
 * - name: the chosen name of the Blueprint
 * - description: optional; the description of the Blueprint
 * - fields: the list of {@link Field}s that make up a {@link Blueprint}
 */
export async function createBlueprint(projectId, blueprint) {
    const body = {
        projectId: projectId,
        id: blueprint.id,
        name: blueprint.name,
        description: blueprint.description,
        fields: blueprint.fields,
    }
    const path = '/api/blueprints'
    return sendRequest('POST', path, body)
}

/**
 * Updates an existing {@link Blueprint} in the database.
 * @param projectId The {@link Project} this Blueprint belongs to.
 * @param blueprintId The Blueprint to update.
 * @param blueprint Takes the form { id, name, description?, fields } where:
 * - id: the Blueprint identifier
 * - name: the chosen name of the Blueprint
 * - description: optional; the description of the Blueprint
 * - fields: the list of {@link Field}s that make up a {@link Blueprint}
 */
export async function updateBlueprint(projectId, blueprintId, blueprint) {
    const body = {
        projectId: projectId,
        id: blueprint.id,
        name: blueprint.name,
        description: blueprint.description,
        fields: blueprint.fields,
    }
    const path = `/api/blueprints/${blueprintId}`
    return sendRequest('PUT', path, body)
}

/**
 * Deletes a {@link Blueprint} from the database.
 * This will also delete all {@link Asset}s in the database that were made from this Blueprint.
 * @param projectId The {@link Project} this Blueprint belongs to.
 * @param blueprintId The {@link Blueprint} to delete.
 */
export async function deleteBlueprint(projectId, blueprintId) {
    const path = `/api/blueprints/${blueprintId}?projectId=${encodeURIComponent(projectId)}`
    return sendRequest('DELETE', path)
}
