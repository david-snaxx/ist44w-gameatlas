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
 * Fails with a 409 when `isPersonal` is true and the user already has a personal Project.
 * @param projectName The name of the project
 * @param isPersonal Whether it's the user's personal Project, which nobody can join, leave or delete.
 */
export async function createProject(projectName, isPersonal = false) {
    const path = '/api/projects'
    const body = {
        name: projectName,
        personal: isPersonal
    }
    return sendRequest('POST', path, body)
}

/**
 * Renames a {@link Project}. The renamed Project comes back as `data`.
 * @param projectId The Project to rename.
 * @param name The new name, at most 120 characters.
 */
export async function renameProject(projectId, name) {
    const path = `/api/projects/${projectId}`
    return sendRequest('PUT', path, {name: name})
}

/**
 * Deletes a {@link Project} for every member, with all its Blueprints, Assets and Dialogues.
 * Fails with a 409 for a personal Project.
 * @param projectId The Project to delete.
 */
export async function deleteProject(projectId) {
    const path = `/api/projects/${projectId}`
    return sendRequest('DELETE', path)
}

/**
 * Gets a {@link Project}'s members in the order they joined, each as { id, email, displayName }.
 * @param projectId The Project whose members to get.
 */
export async function listMembers(projectId) {
    const path = `/api/projects/${projectId}/members`
    return sendRequest('GET', path)
}

/**
 * Adds the account with this email to a {@link Project}. The new member comes back as `data` ({ id, email, displayName }).
 * Fails with a 404 when no account uses the email, and a 409 when it's already a member or the Project is personal.
 * @param projectId The Project to add to.
 * @param email The new member's email.
 */
export async function addMember(projectId, email) {
    const path = `/api/projects/${projectId}/members`
    return sendRequest('POST', path, {email: email})
}

/**
 * Takes a member out of a {@link Project}; pass the logged-in user's own id to leave it.
 * Fails with a 409 for a personal Project, and for the last member, who has to delete the Project instead.
 * @param projectId The Project to remove from.
 * @param userId The member to remove.
 */
export async function removeMember(projectId, userId) {
    const path = `/api/projects/${projectId}/members/${userId}`
    return sendRequest('DELETE', path)
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
