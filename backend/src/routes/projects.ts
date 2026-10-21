import express from 'express';
import type { Request, Response } from 'express';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { db } from '../db.ts';
import {
    addToProjectList,
    findProject,
    isDuplicateKey,
    openProject,
    PROJECT_COLUMNS,
    removeFromProjectList,
    withTransaction,
} from '../projectAccess.ts';
import type { Asset } from '../types/asset.ts';
import type { Blueprint } from '../types/blueprint.ts';
import type { Dialogue } from '../types/dialogue.ts';
import type { ProjectContents, ProjectMember } from '../types/project.ts';
import { findAssets } from './assets.ts';
import { cleanBlueprint, findBlueprints } from './blueprints.ts';
import { asText, findDialogues } from './dialogues.ts';
import { checkContents } from '../../../frontend/src/data/backupFile.js';

// region Express Routing
export const projectsRouter = express.Router();
projectsRouter.get('/', getProjectRoot);
projectsRouter.get('/:id', getProject);
projectsRouter.get('/:id/members', getMembers);
projectsRouter.post('/', postProject);
projectsRouter.post('/:id/members', postMember);
projectsRouter.put('/:id', putProject);
projectsRouter.put('/:id/contents', putProjectContents);
projectsRouter.delete('/:id', deleteProject);
projectsRouter.delete('/:id/members/:userId', deleteMember);
// endregion

// region Endpoints
/**
 * GET /projects
 * Every project the logged-in user is a member of, oldest first.
 */
async function getProjectRoot(request: Request, response: Response) {
    const userId = request.session.userId;
    if (!userId) {
        return response.status(401).json({ message: 'Log in first' });
    }

    // created_at only holds whole seconds, so name and id break ties
    const selectQuery = `SELECT ${PROJECT_COLUMNS} FROM projects
                         WHERE JSON_CONTAINS(member_user_ids, ?)
                         ORDER BY created_at, name, id`;
    const [rows] = await db.query<RowDataPacket[]>(selectQuery, [JSON.stringify(userId)]);
    response.json(rows);
}

/**
 * GET /projects/:id
 */
async function getProject(request: Request<{ id: string }>, response: Response) {
    const userId = request.session.userId;
    if (!userId) {
        return response.status(401).json({ message: 'Log in first' });
    }

    const project = await findProject(request.params.id);
    if (!project || !project.memberUserIds.includes(userId)) {
        return response.status(404).json({ message: 'Project not found' });
    }
    response.json(project);
}

/**
 * POST /projects
 * Body: { name, personal? }. Starts an empty project with the logged-in user as its first member. `personal: true`
 * makes it their personal project; 409 when they already have one.
 */
async function postProject(request: Request, response: Response) {
    const userId = request.session.userId;
    if (!userId) {
        return response.status(401).json({ message: 'Log in first' });
    }

    const { name, personal } = request.body ?? {};
    const nameError = validateName(name);
    if (nameError) {
        return response.status(400).json({ message: nameError });
    }
    if (personal !== undefined && typeof personal !== 'boolean') {
        return response.status(400).json({ message: 'personal must be true or false' });
    }
    let personalUserId: string | null = null;
    if (personal === true) {
        personalUserId = userId;
    }

    const id = randomUUID();
    const insertQuery = `INSERT INTO projects (id, name, created_at, personal_user_id, member_user_ids, blueprint_ids,
                                               asset_ids, dialogue_ids)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const emptyList = JSON.stringify([]);

    try {
        await withTransaction(async (connection) => {
            await connection.query(insertQuery, [
                id,
                name.trim(),
                new Date(),
                personalUserId,
                JSON.stringify([userId]),
                emptyList,
                emptyList,
                emptyList,
            ]);
            await addProjectToUser(connection, userId, id);
        });
    } catch (error) {
        // The only UNIQUE key a new project can break is one_personal_project_per_user
        if (isDuplicateKey(error)) {
            return response.status(409).json({ message: 'You already have a personal project' });
        }
        throw error;
    }

    response.status(201).json(await findProject(id));
}

/**
 * PUT /projects/:id
 * Renames a project.
 */
async function putProject(request: Request<{ id: string }>, response: Response) {
    const userId = request.session.userId;
    if (!userId) {
        return response.status(401).json({ message: 'Log in first' });
    }

    const { name } = request.body ?? {};
    const nameError = validateName(name);
    if (nameError) {
        return response.status(400).json({ message: nameError });
    }

    const project = await findProject(request.params.id);
    if (!project || !project.memberUserIds.includes(userId)) {
        return response.status(404).json({ message: 'Project not found' });
    }

    const updateQuery = `UPDATE projects SET name = ? WHERE id = ?`;
    await db.query(updateQuery, [name.trim(), request.params.id]);
    response.json(await findProject(request.params.id));
}

/**
 * PUT /projects/:id/contents
 * Body: { blueprints, assets, dialogues } in their saved shapes. Replaces everything in the project at once, or
 * nothing when checkContents() finds a problem. Its body limit is raised in app.ts.
 */
async function putProjectContents(request: Request<{ id: string }>, response: Response) {
    const access = await openProject(request, request.params.id);
    if (!access.project) {
        return response.status(access.status).json({ message: access.message });
    }
    const project = access.project;

    const problem = checkContents(request.body);
    if (problem) {
        return response.status(400).json({ message: problem });
    }
    const contents = request.body as ProjectContents;

    const now = new Date();
    await withTransaction(async (connection) => {
        await deleteContents(connection, project.id);
        const blueprintRowIds = await insertBlueprints(connection, project.id, contents.blueprints, now);
        const assetIds = await insertAssets(connection, project.id, contents.assets, blueprintRowIds, now);
        const dialogueIds = await insertDialogues(connection, project.id, contents.dialogues, now);

        const updateQuery = `UPDATE projects SET blueprint_ids = ?, asset_ids = ?, dialogue_ids = ? WHERE id = ?`;
        await connection.query(updateQuery, [
            JSON.stringify(Array.from(blueprintRowIds.values())),
            JSON.stringify(assetIds),
            JSON.stringify(dialogueIds),
            project.id,
        ]);
    });

    const saved: ProjectContents = {
        blueprints: await findBlueprints(project.id),
        assets: await findAssets(project.id, null),
        dialogues: await findDialogues(project.id),
    };
    response.json(saved);
}

/**
 * DELETE /projects/:id
 * Deletes the project for every member. Its blueprints, assets and dialogues go with it through their foreign keys.
 * 409 for a personal project, which can only be emptied.
 */
async function deleteProject(request: Request<{ id: string }>, response: Response) {
    const userId = request.session.userId;
    if (!userId) {
        return response.status(401).json({ message: 'Log in first' });
    }

    const project = await findProject(request.params.id);
    if (!project || !project.memberUserIds.includes(userId)) {
        return response.status(404).json({ message: 'Project not found' });
    }
    if (project.personalUserId !== null) {
        return response.status(409).json({ message: "A personal project can't be deleted, only emptied" });
    }

    await withTransaction(async (connection) => {
        for (const memberId of project.memberUserIds) {
            await removeProjectFromUser(connection, memberId, project.id);
        }
        const deleteQuery = `DELETE FROM projects WHERE id = ?`;
        await connection.query<ResultSetHeader>(deleteQuery, [project.id]);
    });

    response.status(204).end();
}

/**
 * GET /projects/:id/members
 * The project's members, in the order they joined: [{ id, email, displayName }].
 */
async function getMembers(request: Request<{ id: string }>, response: Response) {
    const access = await openProject(request, request.params.id);
    if (!access.project) {
        return response.status(access.status).json({ message: access.message });
    }

    response.json(await findMembers(access.project.memberUserIds));
}

/**
 * POST /projects/:id/members
 * Body: { email }. Adds the account with that email to the project and answers it as a member (201). 404 when no
 * account uses the email; 409 when it's already a member, or the project is someone's personal one.
 */
async function postMember(request: Request<{ id: string }>, response: Response) {
    const access = await openProject(request, request.params.id);
    if (!access.project) {
        return response.status(access.status).json({ message: access.message });
    }
    const project = access.project;

    const { email } = request.body ?? {};
    if (typeof email !== 'string' || email.trim() === '') {
        return response.status(400).json({ message: 'email is required' });
    }
    if (project.personalUserId !== null) {
        return response.status(409).json({ message: "Members can't be added to a personal project" });
    }

    const member = await findMemberByEmail(email.trim());
    if (!member) {
        return response.status(404).json({ message: 'No account uses that email' });
    }

    const outcome = await withTransaction(async (connection) => {
        const memberIds = await lockMemberIds(connection, project.id);
        if (memberIds === null) {
            return 'project gone';
        }
        if (memberIds.includes(member.id)) {
            return 'already a member';
        }
        await addToProjectList(connection, project.id, 'member_user_ids', member.id);
        await addProjectToUser(connection, member.id, project.id);
        return 'added';
    });

    if (outcome === 'project gone') {
        return response.status(404).json({ message: 'Project not found' });
    }
    if (outcome === 'already a member') {
        return response.status(409).json({ message: `${member.displayName} is already a member` });
    }
    response.status(201).json(member);
}

/**
 * DELETE /projects/:id/members/:userId
 * Takes a member out of the project; members leave by removing themselves. 404 when they aren't a member; 409 for a
 * personal project, and for the last member, who has to delete the project instead.
 */
async function deleteMember(request: Request<{ id: string; userId: string }>, response: Response) {
    const access = await openProject(request, request.params.id);
    if (!access.project) {
        return response.status(access.status).json({ message: access.message });
    }
    const project = access.project;
    const userId = request.params.userId;

    if (project.personalUserId !== null) {
        return response.status(409).json({ message: 'Nobody can leave a personal project' });
    }

    const outcome = await withTransaction(async (connection) => {
        const memberIds = await lockMemberIds(connection, project.id);
        if (memberIds === null || !memberIds.includes(userId)) {
            return 'not a member';
        }
        if (memberIds.length === 1) {
            return 'last member';
        }
        await removeFromProjectList(connection, project.id, 'member_user_ids', userId);
        await removeProjectFromUser(connection, userId, project.id);
        return 'removed';
    });

    if (outcome === 'not a member') {
        return response.status(404).json({ message: "That account isn't a member of this project" });
    }
    if (outcome === 'last member') {
        return response.status(409).json({ message: "The last member can't leave. Delete the project instead." });
    }
    response.status(204).end();
}
// endregion

// region Helpers
/** The user columns a {@link ProjectMember} shows: never the password hash. */
const MEMBER_COLUMNS = 'id, email, display_name AS displayName';

const MAX_PROJECT_NAME_LENGTH = 120;

/** What's wrong with a project name, or null when it's fine. */
function validateName(name: unknown): string | null {
    if (typeof name !== 'string') {
        return 'name must be a string';
    }
    const trimmed = name.trim();
    if (trimmed === '') {
        return "name can't be blank";
    }
    if (trimmed.length > MAX_PROJECT_NAME_LENGTH) {
        return `name must be ${MAX_PROJECT_NAME_LENGTH} characters or fewer`;
    }
    return null;
}

/** Adds the project to a user's own list of projects. Runs in the caller's transaction. */
async function addProjectToUser(connection: PoolConnection, userId: string, projectId: string): Promise<void> {
    const updateQuery = `UPDATE users SET project_ids = JSON_ARRAY_APPEND(project_ids, '$', ?) WHERE id = ?`;
    await connection.query(updateQuery, [projectId, userId]);
}

/** Takes the project back out of a user's list. Runs in the caller's transaction. */
async function removeProjectFromUser(connection: PoolConnection, userId: string, projectId: string): Promise<void> {
    const selectQuery = `SELECT project_ids AS projectIds FROM users WHERE id = ?`;
    const [rows] = await connection.query<RowDataPacket[]>(selectQuery, [userId]);
    const row = rows[0];
    if (!row) {
        return;
    }

    const kept: string[] = [];
    for (const current of row.projectIds as string[]) {
        if (current !== projectId) {
            kept.push(current);
        }
    }

    const updateQuery = `UPDATE users SET project_ids = ? WHERE id = ?`;
    await connection.query(updateQuery, [JSON.stringify(kept), userId]);
}

/** These users as {@link ProjectMember}s, in the order of `userIds`. An ID with no user behind it is left out. */
async function findMembers(userIds: string[]): Promise<ProjectMember[]> {
    if (userIds.length === 0) {
        return [];
    }
    // mysql2 turns the array into a comma-separated list for IN (?)
    const selectQuery = `SELECT ${MEMBER_COLUMNS} FROM users WHERE id IN (?)`;
    const [rows] = await db.query<RowDataPacket[]>(selectQuery, [userIds]);

    const members: ProjectMember[] = [];
    for (const userId of userIds) {
        const row = rows.find((candidate) => candidate.id === userId);
        if (row) {
            members.push(row as ProjectMember);
        }
    }
    return members;
}

/** The account with this email as a {@link ProjectMember}, or undefined. The email's column ignores case. */
async function findMemberByEmail(email: string): Promise<ProjectMember | undefined> {
    const selectQuery = `SELECT ${MEMBER_COLUMNS} FROM users WHERE email = ?`;
    const [rows] = await db.query<RowDataPacket[]>(selectQuery, [email]);
    return rows[0] as ProjectMember | undefined;
}

/**
 * A project's member IDs, read with its row locked until the caller's transaction ends, so two member changes at
 * once wait for each other instead of one overwriting the other. null when the project is gone.
 */
async function lockMemberIds(connection: PoolConnection, projectId: string): Promise<string[] | null> {
    const selectQuery = `SELECT member_user_ids AS memberUserIds FROM projects WHERE id = ? FOR UPDATE`;
    const [rows] = await connection.query<RowDataPacket[]>(selectQuery, [projectId]);
    const row = rows[0];
    if (!row) {
        return null;
    }
    return row.memberUserIds as string[];
}

/** Deletes every blueprint, asset and dialogue in a project. Runs in the caller's transaction. */
async function deleteContents(connection: PoolConnection, projectId: string): Promise<void> {
    // Assets first, since they point at their blueprints
    await connection.query(`DELETE FROM assets WHERE project_id = ?`, [projectId]);
    await connection.query(`DELETE FROM blueprints WHERE project_id = ?`, [projectId]);
    await connection.query(`DELETE FROM dialogues WHERE project_id = ?`, [projectId]);
}

/**
 * Inserts each blueprint as a new row, keeping its version. Returns the new row UUIDs by snake_case ID, in insert
 * order. Runs in the caller's transaction.
 */
async function insertBlueprints(
    connection: PoolConnection,
    projectId: string,
    blueprints: Blueprint[],
    now: Date,
): Promise<Map<string, string>> {
    const insertQuery = `INSERT INTO blueprints (id, project_id, schema_key, name, description, kind, version, fields, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, 'form', ?, ?, ?, ?)`;
    const rowIds = new Map<string, string>();

    for (const sent of blueprints) {
        const blueprint = cleanBlueprint({
            id: sent.id,
            name: sent.name.trim(),
            description: sent.description,
            version: sent.version,
            fields: sent.fields,
        });
        const rowId = randomUUID();
        await connection.query(insertQuery, [
            rowId,
            projectId,
            blueprint.id,
            blueprint.name,
            blueprint.description ?? null, // a clean blueprint has no description when it's empty
            blueprint.version,
            JSON.stringify(blueprint.fields),
            now,
            now,
        ]);
        rowIds.set(blueprint.id, rowId);
    }
    return rowIds;
}

/**
 * Inserts each asset as a new row under its blueprint's new row, keeping its schemaVersion and timestamps.
 * Returns the new UUIDs. Runs in the caller's transaction.
 */
async function insertAssets(
    connection: PoolConnection,
    projectId: string,
    assets: Asset[],
    blueprintRowIds: Map<string, string>,
    now: Date,
): Promise<string[]> {
    const insertQuery = `INSERT INTO assets (id, project_id, blueprint_id, asset_key, schema_version, data, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const ids: string[] = [];

    for (const asset of assets) {
        const id = randomUUID();
        await connection.query(insertQuery, [
            id,
            projectId,
            blueprintRowIds.get(asset.schemaId), // checkContents() made sure the blueprint is in the set
            asset.key,
            asset.schemaVersion,
            JSON.stringify(asset.data),
            timestampOr(asset.createdAt, now),
            timestampOr(asset.updatedAt, now),
        ]);
        ids.push(id);
    }
    return ids;
}

/** Inserts each dialogue as a new row, keeping its timestamps. Returns the new UUIDs. Runs in the caller's transaction. */
async function insertDialogues(
    connection: PoolConnection,
    projectId: string,
    dialogues: Dialogue[],
    now: Date,
): Promise<string[]> {
    const insertQuery = `INSERT INTO dialogues (id, project_id, dialogue_key, name, description, speaker_blueprint,
                                                item_blueprint, nodes, edges, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const ids: string[] = [];

    for (const dialogue of dialogues) {
        const id = randomUUID();
        await connection.query(insertQuery, [
            id,
            projectId,
            dialogue.key,
            dialogue.name.trim(),
            asText(dialogue.description),
            asText(dialogue.speakerBlueprint),
            asText(dialogue.itemBlueprint),
            JSON.stringify(dialogue.nodes),
            JSON.stringify(dialogue.edges),
            timestampOr(dialogue.createdAt, now),
            timestampOr(dialogue.updatedAt, now),
        ]);
        ids.push(id);
    }
    return ids;
}

/** The time a saved timestamp (ISO 8601 text) names, or `fallback` when it's missing or isn't a date. */
function timestampOr(value: unknown, fallback: Date): Date {
    if (typeof value !== 'string') {
        return fallback;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return fallback;
    }
    return date;
}
// endregion
