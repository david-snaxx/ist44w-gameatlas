import express from 'express';
import type { Request, Response } from 'express';
import type {ResultSetHeader, RowDataPacket} from 'mysql2';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '../db.ts';

// region Express Routing
export const usersRouter = express.Router();
usersRouter.get('/', getUserRoot);
usersRouter.get('/me', getMe);
usersRouter.post('/login', postLogin);
usersRouter.post('/logout', postLogout);
usersRouter.get('/:id', getUser);
usersRouter.post('/', postUser);
usersRouter.put('/:id', putUser);
usersRouter.delete('/:id', deleteUser);
// endregion

// region Endpoints
/**
 * GET /users
 * For testing only: shows every user's email to anyone. Remove before deploying.
 */
async function getUserRoot(request: Request, response: Response) {
    const selectQuery = `SELECT ${PUBLIC_COLUMNS} FROM users`
    const [rows] = await db.query<RowDataPacket[]>(selectQuery);
    response.json(rows);
}

/**
 * GET /users/:id
 */
async function getUser(request: Request<{ id: string }>, response: Response) {
    const user = await getUserById(request.params.id);
    if (!user) {
        return response.status(404).json({ message: 'User not found' });
    }
    response.json(user);
}

/**
 * POST /users
 */
async function postUser(request: Request, response: Response) {
    const { email, password, displayName } = request.body ?? {};
    if (!email || !password || !displayName) {
        return response.status(400).json({ message: 'email, password and displayName are required' });
    }
    if (typeof email !== 'string') {
        return response.status(400).json({ message: 'email must be a string' });
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
        return response.status(400).json({ message: passwordError });
    }
    const displayNameError = validateDisplayName(displayName);
    if (displayNameError) {
        return response.status(400).json({ message: displayNameError });
    }
    const id = randomUUID();

    const passwordHash = await bcrypt.hash(password, 10);
    const insertQuery = `INSERT INTO users (id, email, password_hash, display_name, created_at, project_ids)
                        VALUES (?, ?, ?, ?, ?, ?)`;
    try {
        await db.query(insertQuery, [id, email, passwordHash, displayName.trim(), new Date(), JSON.stringify([])]);
    } catch (error) {
        if (isDuplicateEmail(error)) {
            return response.status(409).json({ message: 'That email is already registered' });
        }
        throw error;
    }

    response.status(201).json(await getUserById(id));
}

/**
 * PUT /users/:id
 */
async function putUser(request: Request<{ id: string }>, response: Response) {
    const { email, displayName } = request.body ?? {};
    if (!email || !displayName) {
        return response.status(400).json({ message: 'email and displayName are required' });
    }
    if (typeof email !== 'string') {
        return response.status(400).json({ message: 'email must be a string' });
    }
    const displayNameError = validateDisplayName(displayName);
    if (displayNameError) {
        return response.status(400).json({ message: displayNameError });
    }

    // only the user's own details change here, projectIds is managed by the project routes
    const updateQuery = `UPDATE users SET email = ?, display_name = ? WHERE id = ?`;
    let affectedRows = 0;
    try {
        const [result] = await db.query<ResultSetHeader>(updateQuery, [email, displayName.trim(), request.params.id]);
        affectedRows = result.affectedRows;
    } catch (error) {
        if (isDuplicateEmail(error)) {
            return response.status(409).json({ message: 'That email is already registered' });
        }
        throw error;
    }

    if (affectedRows === 0) {
        return response.status(404).json({ message: 'User not found' });
    }
    response.json(await getUserById(request.params.id));
}

/**
 * DELETE /users/:id
 */
async function deleteUser(request: Request<{ id: string }>, response: Response) {
    const deleteQuery = `DELETE FROM users WHERE id = ?`;
    const [result] = await db.query<ResultSetHeader>(deleteQuery, [request.params.id]);

    if (result.affectedRows === 0) {
        return response.status(404).json({ message: 'User not found' });
    }
    response.status(204).end();
}

/**
 * GET /users/me
 * The logged-in user, without the password hash. 401 when nobody is logged in.
 */
async function getMe(request: Request, response: Response) {
    const userId = request.session.userId;
    if (!userId) {
        return response.status(401).json({ message: 'Log in first' });
    }

    const user = await getUserById(userId);
    if (!user) {
        // The account was deleted while this session was still open
        return response.status(401).json({ message: 'Log in first' });
    }
    response.json(user);
}

/**
 * POST /users/login
 * Checks the email and password, then starts a fresh session holding the user's ID.
 */
async function postLogin(request: Request, response: Response) {
    const { email, password } = request.body ?? {};
    if (!email || !password) {
        return response.status(400).json({ message: 'email and password are required' });
    }
    if (typeof email !== 'string') {
        return response.status(400).json({ message: 'email must be a string' });
    }
    if (typeof password !== 'string') {
        return response.status(400).json({ message: 'password must be a string' });
    }

    const selectQuery = `SELECT id, password_hash AS passwordHash FROM users WHERE email = ?`;
    const [rows] = await db.query<RowDataPacket[]>(selectQuery, [email]);
    const row = rows[0];

    let passwordMatches = false;
    if (row) {
        passwordMatches = await bcrypt.compare(password, row.passwordHash);
    }
    if (!passwordMatches) {
        return response.status(401).json({ message: 'Wrong email or password' });
    }

    await regenerateSession(request);
    request.session.userId = row.id;
    response.json(await getUserById(row.id));
}

/**
 * POST /users/logout
 * Ends the session on the server and clears the browser's session cookie.
 */
async function postLogout(request: Request, response: Response) {
    await destroySession(request);
    response.clearCookie(SESSION_COOKIE_NAME);
    response.status(204).end();
}
// endregion

// region Helpers
/** express-session's default name for the session cookie. */
const SESSION_COOKIE_NAME = 'connect.sid';

/** Replaces the request's session with a fresh, empty one. Wraps express-session's callback in a Promise. */
function regenerateSession(request: Request): Promise<void> {
    return new Promise((resolve, reject) => {
        request.session.regenerate((error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}

/** Deletes the request's session (its row in the sessions table). Wraps express-session's callback in a Promise. */
function destroySession(request: Request): Promise<void> {
    return new Promise((resolve, reject) => {
        request.session.destroy((error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}

const MIN_PASSWORD_LENGTH = 8;
const MAX_DISPLAY_NAME_LENGTH = 64;

/** What's wrong with a password, or null when it's fine. */
function validatePassword(password: unknown): string | null {
    if (typeof password !== 'string') {
        return 'password must be a string';
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
        return `password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }
    if (bcrypt.truncates(password)) {
        return 'password is too long';
    }
    return null;
}

/** What's wrong with a display name, or null when it's fine. */
function validateDisplayName(displayName: unknown): string | null {
    if (typeof displayName !== 'string') {
        return 'displayName must be a string';
    }
    const trimmed = displayName.trim();
    if (trimmed === '') {
        return "displayName can't be blank";
    }
    if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
        return `displayName must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer`;
    }
    return null;
}

/** True when MySQL refused a write because the UNIQUE index on users.email already has this email. */
function isDuplicateEmail(error: unknown): boolean {
    if (!(error instanceof Error) || !('code' in error)) {
        return false;
    }
    return error.code === 'ER_DUP_ENTRY';
}

/** The user columns that are safe to send: everything except the password hash. */
const PUBLIC_COLUMNS = 'id, email, display_name AS displayName, created_at AS createdAt, project_ids AS projectIds';

/** One user's public columns by ID, or undefined when there's no such user. */
async function getUserById(id: string) {
    const selectQuery = `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`;
    const [rows] = await db.query<RowDataPacket[]>(selectQuery, [id]);
    return rows[0];
}
// endregion