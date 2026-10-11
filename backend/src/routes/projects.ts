import express from 'express';
import type { Request, Response } from 'express';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { db } from '../db.ts';
import { findProject, withTransaction } from '../projectAccess.ts';

// region Express Routing
export const projectsRouter = express.Router();
projectsRouter.get('/', getProjectRoot);
projectsRouter.get('/:id', getProject);
projectsRouter.post('/', postProject);
projectsRouter.put('/:id', putProject);
projectsRouter.delete('/:id', deleteProject);
// endregion

// region Endpoints
/**
 * GET /projects
 * Every project the logged-in user is a member of.
 */
async function getProjectRoot(request: Request, response: Response) {
    const userId = request.session.userId;
    if (!userId) {
        return response.status(401).json({ message: 'Log in first' });
    }

    // JSON_CONTAINS asks MySQL whether the user's ID is in the project's member list
    const selectQuery = `SELECT ${PROJECT_COLUMNS} FROM projects
                         WHERE JSON_CONTAINS(member_user_ids, ?)`;
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
 * Starts an empty project with the logged-in user as its first member.
 */
async function postProject(request: Request, response: Response) {
    const userId = request.session.userId;
    if (!userId) {
        return response.status(401).json({ message: 'Log in first' });
    }

    const { name } = request.body ?? {};
    const nameError = validateName(name);
    if (nameError) {
        return response.status(400).json({ message: nameError });
    }

    const id = randomUUID();
    const insertQuery = `INSERT INTO projects (id, name, created_at, member_user_ids, blueprint_ids, asset_ids, dialogue_ids)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const emptyList = JSON.stringify([]);

    // The project and the member's own list of projects are one change, so they share a transaction
    await withTransaction(async (connection) => {
        await connection.query(insertQuery, [
            id,
            name.trim(),
            new Date(),
            JSON.stringify([userId]),
            emptyList,
            emptyList,
            emptyList,
        ]);
        await addProjectToUser(connection, userId, id);
    });

    response.status(201).json(await findProject(id));
}

/**
 * PUT /projects/:id
 * Renames a project. Its member and content lists are managed by the routes that change them.
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
 * DELETE /projects/:id
 * Deletes the project and everything in it. The blueprint, asset and dialogue rows go with it through
 * their foreign keys, so only the members' own project lists need tidying up here.
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

    await withTransaction(async (connection) => {
        for (const memberId of project.memberUserIds) {
            await removeProjectFromUser(connection, memberId, project.id);
        }
        const deleteQuery = `DELETE FROM projects WHERE id = ?`;
        await connection.query<ResultSetHeader>(deleteQuery, [project.id]);
    });

    response.status(204).end();
}
// endregion

// region Helpers
/** SQL columns that make up a project. */
const PROJECT_COLUMNS = `id, name, created_at AS createdAt, member_user_ids AS memberUserIds,
                         blueprint_ids AS blueprintIds, asset_ids AS assetIds, dialogue_ids AS dialogueIds`;

const MAX_PROJECT_NAME_LENGTH = 120;

/**
 * Returns a string message describing project name errors, or null if no errors exist.
 */
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
// endregion
