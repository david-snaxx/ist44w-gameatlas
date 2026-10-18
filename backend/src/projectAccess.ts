import type {Pool, PoolConnection, RowDataPacket} from 'mysql2/promise';
import type {Request} from 'express';
import {db} from './db.ts';
import type {Project} from './types/project.ts';

/*
 * What the asset, blueprint and dialogue routes share: checking the caller may use a {@link Project}, and keeping
 * the project's ID lists in step (PLAN.md §5.6).
 */

/** SQL columns of a {@link Project}. */
const PROJECT_COLUMNS = `id, name, created_at AS createdAt, member_user_ids AS memberUserIds,
                         blueprint_ids AS blueprintIds, asset_ids AS assetIds, dialogue_ids AS dialogueIds`;

/** The JSON array columns on a project that list what it contains. */
export type ProjectList = 'blueprint_ids' | 'asset_ids' | 'dialogue_ids';

/** The result of {@link openProject}: a null `project` means answer with `status` and `message`. */
export interface ProjectAccess {
    project: Project | null;
    status: number;
    message: string;
}

/**
 * Finds the project a request named and checks the caller is a member. A non-member gets 404, not 403, so the
 * answer doesn't reveal which project IDs exist.
 */
export async function openProject(request: Request, projectId: unknown): Promise<ProjectAccess> {
    const userId = request.session.userId;
    if (!userId) {
        return {project: null, status: 401, message: 'Log in first'};
    }
    if (typeof projectId !== 'string' || projectId === '') {
        return {project: null, status: 400, message: 'projectId is required'};
    }

    const project = await findProject(projectId);
    if (!project || !project.memberUserIds.includes(userId)) {
        return {project: null, status: 404, message: 'Project not found'};
    }
    return {project: project, status: 200, message: ''};
}

/** One project by its UUID, or undefined. Pass `connection` to read it inside a transaction. */
export async function findProject(id: string, connection?: PoolConnection): Promise<Project | undefined> {
    const selectQuery = `SELECT ${PROJECT_COLUMNS}
                         FROM projects
                         WHERE id = ?`;
    const runner: Pool | PoolConnection = connection ?? db;
    const [rows] = await runner.query<RowDataPacket[]>(selectQuery, [id]);
    return rows[0] as Project | undefined;
}

/** Runs `work` in a transaction: everything in it is saved, or nothing is. */
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
        connection.release();
    }
}

/**
 * Adds an ID to one of a project's lists, inside the same transaction as its row. JSON_ARRAY_APPEND changes the
 * list in the database, so two appends at once can't overwrite each other.
 */
export async function addToProjectList(
    connection: PoolConnection,
    projectId: string,
    list: ProjectList,
    id: string,
): Promise<void> {
    // `list` is one of three fixed names from ProjectList, never anything a caller typed
    const updateQuery = `UPDATE projects
                         SET ${list} = JSON_ARRAY_APPEND(${list}, '$', ?)
                         WHERE id = ?`;
    await connection.query(updateQuery, [id, projectId]);
}

/** Removes an ID from one of a project's lists, inside the same transaction as its row. */
export async function removeFromProjectList(
    connection: PoolConnection,
    projectId: string,
    list: ProjectList,
    id: string,
): Promise<void> {
    const selectQuery = `SELECT ${list} AS ids
                         FROM projects
                         WHERE id = ?`;
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

    const updateQuery = `UPDATE projects
                         SET ${list} = ?
                         WHERE id = ?`;
    await connection.query(updateQuery, [JSON.stringify(kept), projectId]);
}

/** True when MySQL refused a write because a UNIQUE index already has this value. */
export function isDuplicateKey(error: unknown): boolean {
    if (!(error instanceof Error) || !('code' in error)) {
        return false;
    }
    return error.code === 'ER_DUP_ENTRY';
}
