import {sendRequest} from './request.js'

/*
 * Calls to backend/src/routes/projects.ts.
 * Each answers { data } or { error }.
 */

/**
 * Gets all of a logged-in user's {@link Project}s they are a member of.
 */
export async function listProjects() {
    const path = '/api/projects'
    return sendRequest('GET', path)
}

/**
 * Posts a new {@link Project} in the database.
 * The user who triggered this post will be the only member.
 * @param projectName The name of the project
 */
export async function createProject(projectName) {
    const path = '/api/projects'
    return sendRequest('POST', path, {name: projectName})
}

/**
 * Replaces everything in an existing {@link Project}: its Blueprints, Assets and Dialogues.
 * It's all or nothing: when anything in `contents` is wrong, nothing changes.
 * @param projectId The Project whose contents to replace.
 * @param contents Takes the form { blueprints, assets, dialogues } where:
 * - blueprints: the {@link Blueprint}s of this project.
 * - assets: the {@link Asset}s of this project
 * - dialogues: the {@link Dialogue}s of this project.
 */
export async function replaceProjectContents(projectId, contents) {
    const path = `/api/projects/${projectId}/contents`
    return sendRequest('PUT', path, contents)
}
