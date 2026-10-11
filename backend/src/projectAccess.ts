import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { Request } from 'express';
import { db } from './db.ts';
import type { Project } from './types/project.ts';

/**
 * Everything in GameAtlas belongs to a {@link Project}, so the asset, blueprint and dialogue routes all
 * start the same way: is someone logged in, did they name a project, and are they a member of it?
 * That check lives here instead of being written out in each of those files.
 *
 * The four rules these helpers exist for are in PLAN.md §5.6.
 */

/** SQL columns that make up a {@link Project}. */
const PROJECT_COLUMNS = `id, name, created_at AS createdAt, member_user_ids AS memberUserIds,
                         blueprint_ids AS blueprintIds, asset_ids AS assetIds, dialogue_ids AS dialogueIds`;

/** The JSON array columns on a project that list what it contains. */
export type ProjectList = 'blueprint_ids' | 'asset_ids' | 'dialogue_ids';

/**
 * What a route learns when it asks for the project a request is working in.
 * `project` is null when the caller may not use it, and then `status` and `message` are the answer to send.
 */
export interface ProjectAccess {
    project: Project | null;
    status: number;
    message: string;
}

/**
 * Finds the project a request named and checks the caller is allowed to use it.
 * `projectId` comes from the query string on GET and DELETE, and from the body on POST and PUT.
 *
 * A project the caller isn't a member of answers 404, not 403, so nobody can use the difference to
 * find out which project IDs exist.
 */
export async function openProject(request: Request, projectId: unknown): Promise<ProjectAccess> {
    const userId = request.session.userId;
    if (!userId) {
        return { project: null, status: 401, message: 'Log in first' };
    }
    if (typeof projectId !== 'string' || projectId === '') {
        return { project: null, status: 400, message: 'projectId is required' };
    }

    const project = await findProject(projectId);
    if (!project || !project.memberUserIds.includes(userId)) {
        return { project: null, status: 404, message: 'Project not found' };
    }
    return { project: project, status: 200, message: '' };
}

/**
 * Returns a single project by its UUID, or undefined when there is none.
 * Pass `connection` to read it inside a transaction; without one it uses the shared pool.
 */
export async function findProject(id: string, connection?: PoolConnection): Promise<Project | undefined> {
    const selectQuery = `SELECT ${PROJECT_COLUMNS} FROM projects WHERE id = ?`;
    const runner: Pool | PoolConnection = connection ?? db;
    const [rows] = await runner.query<RowDataPacket[]>(selectQuery, [id]);
    return rows[0] as Project | undefined;
}

/**
 * Runs `work` inside a transaction: either everything in it is saved, or none of it is.
 * Writes that belong together go in one of these, such as adding a blueprint and adding its ID to the
 * project's list (PLAN.md §5.6 rule 2).
 */
export async function withTransaction<T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> {
    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
        const result = await work(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        // Hand the connection back to the pool whether the work succeeded or not
        connection.release();
    }
}

/**
 * Adds an ID to one of a project's lists. Call it inside {@link withTransaction}, in the same
 * transaction as the row it is about.
 *
 * MySQL's JSON_ARRAY_APPEND does the change in the database, so two routes appending at the same
 * moment can't overwrite each other by each writing back a whole list they read a moment ago.
 */
export async function addToProjectList(
    connection: PoolConnection,
    projectId: string,
    list: ProjectList,
    id: string,
): Promise<void> {
    // `list` is one of three fixed names from ProjectList, never anything a caller typed
    const updateQuery = `UPDATE projects SET ${list} = JSON_ARRAY_APPEND(${list}, '$', ?) WHERE id = ?`;
    await connection.query(updateQuery, [id, projectId]);
}

/** Removes an ID from one of a project's lists. Call it inside {@link withTransaction}, like its opposite above. */
export async function removeFromProjectList(
    connection: PoolConnection,
    projectId: string,
    list: ProjectList,
    id: string,
): Promise<void> {
    const selectQuery = `SELECT ${list} AS ids FROM projects WHERE id = ?`;
    const [rows] = await connection.query<RowDataPacket[]>(selectQuery, [projectId]);
    const row = rows[0];
    if (!row) {
        return;
    }

    const kept: string[] = [];
    for (const current of row.ids as string[]) {
        if (current !== id) {
            kept.push(current);
        }
    }

    const updateQuery = `UPDATE projects SET ${list} = ? WHERE id = ?`;
    await connection.query(updateQuery, [JSON.stringify(kept), projectId]);
}

/**
 * Returns true when MySQL refused to write because a UNIQUE index already has this value.
 * The blueprint and dialogue routes use it to turn a repeated ID into a 409, the way the user routes
 * turn a repeated email into one.
 */
export function isDuplicateKey(error: unknown): boolean {
    if (!(error instanceof Error) || !('code' in error)) {
        return false;
    }
    return error.code === 'ER_DUP_ENTRY';
}
