import express from 'express';
import type { Request, Response } from 'express';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { db } from '../db.ts';
import { withTransaction } from '../projectAccess.ts';

// region Express Routing
// The limiters and their settings sit above the router because a const, unlike a function, can't be used before its line

/** How long the login limiters remember logins, counted from the first one in each count. */
const LOGIN_WINDOW_MINUTES = 10;
/** Successful logins allowed for one account from one IP address within the window. Each one starts a session. */
const MAX_SUCCESSFUL_LOGINS = 10;
/** Failed logins allowed for one account from one IP address within the window. */
const MAX_FAILED_LOGINS = 10;

/**
 * Answers POST /login with 429 once one IP address has logged into one account MAX_SUCCESSFUL_LOGINS times within
 * the window. A login still being checked counts until it fails, so no more than that many run at once either.
 */
const limitSuccessfulLogins = rateLimit({
    windowMs: LOGIN_WINDOW_MINUTES * 60 * 1000,
    limit: MAX_SUCCESSFUL_LOGINS,
    skipFailedRequests: true,
    keyGenerator: loginKey,
    message: { message: `Too many logins for this account. Try again in ${LOGIN_WINDOW_MINUTES} minutes.` },
    identifier: 'logins', // its name in the RateLimit headers, next to the other limiter's
    standardHeaders: 'draft-8', // a RateLimit header and Retry-After, instead of the older X-RateLimit-* ones
    legacyHeaders: false,
});

/**
 * Answers POST /login with 429 once one IP address has failed MAX_FAILED_LOGINS times on one account within the
 * window. Each attempt counts when it arrives and stops counting if it succeeds, so a burst is cut off too.
 */
const limitFailedLogins = rateLimit({
    windowMs: LOGIN_WINDOW_MINUTES * 60 * 1000,
    limit: MAX_FAILED_LOGINS,
    skipSuccessfulRequests: true,
    keyGenerator: loginKey,
    message: { message: `Too many failed logins. Try again in ${LOGIN_WINDOW_MINUTES} minutes.` },
    identifier: 'failed-logins',
    standardHeaders: 'draft-8',
    legacyHeaders: false,
});

export const usersRouter = express.Router();
usersRouter.post('/', postUser);
usersRouter.get('/me', getMe);
usersRouter.put('/me', putMe);
usersRouter.delete('/me', deleteMe);
// limitSuccessfulLogins goes first, so a refusal from it isn't counted as a failed login by limitFailedLogins
usersRouter.post('/login', limitSuccessfulLogins, limitFailedLogins, postLogin);
usersRouter.post('/logout', postLogout);
// endregion

// region Endpoints
/**
 * POST /users
 * Signs up a new user. Starts no session: the user logs in afterwards.
 */
async function postUser(request: Request, response: Response) {
    const { email, password, displayName } = request.body ?? {};
    if (!email || !password || !displayName) {
        return response.status(400).json({ message: 'email, password and displayName are required' });
    }
    const emailError = validateEmail(email);
    if (emailError) {
        return response.status(400).json({ message: emailError });
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
 * PUT /users/me
 * Body: { email, displayName }. Changes only the logged-in user. 409 when the email is taken by another account.
 */
async function putMe(request: Request, response: Response) {
    const userId = request.session.userId;
    if (!userId) {
        return response.status(401).json({ message: 'Log in first' });
    }

    const { email, displayName } = request.body ?? {};
    const detailsError = validateDetails(email, displayName);
    if (detailsError) {
        return response.status(400).json({ message: detailsError });
    }

    let found = false;
    try {
        found = await updateDetails(userId, email, displayName);
    } catch (error) {
        if (isDuplicateEmail(error)) {
            return response.status(409).json({ message: 'That email is already registered' });
        }
        throw error;
    }

    if (!found) {
        // The account was deleted while this session was still open
        return response.status(401).json({ message: 'Log in first' });
    }
    response.json(await getUserById(userId));
}

/**
 * DELETE /users/me
 * Body: { password }. Deletes the logged-in user's account, leaves their projects (deleting any left without
 * members), and logs them out everywhere.
 */
async function deleteMe(request: Request, response: Response) {
    const userId = request.session.userId;
    if (!userId) {
        return response.status(401).json({ message: 'Log in first' });
    }

    const { password } = request.body ?? {};
    if (typeof password !== 'string') {
        return response.status(400).json({ message: 'password must be a string' });
    }

    const selectQuery = `SELECT password_hash AS passwordHash FROM users WHERE id = ?`;
    const [rows] = await db.query<RowDataPacket[]>(selectQuery, [userId]);
    const row = rows[0];
    if (!row) {
        // The account was deleted while this session was still open
        return response.status(401).json({ message: 'Log in first' });
    }
    const passwordMatches = await bcrypt.compare(password, row.passwordHash);
    if (!passwordMatches) {
        return response.status(403).json({ message: 'Wrong password' });
    }

    await withTransaction(async (connection) => {
        const projectIds = await lockProjectIdsOfUser(connection, userId);
        for (const projectId of projectIds) {
            await leaveProject(connection, projectId, userId);
        }
        await connection.query(`DELETE FROM users WHERE id = ?`, [userId]);
        await deleteSessionsOfUser(connection, userId);
    });

    // The row is gone already; this drops express-session's copy, so nothing saves it again
    await destroySession(request);
    response.clearCookie(SESSION_COOKIE_NAME);
    response.status(204).end();
}

/**
 * POST /users/login
 * Checks the email and password, then starts a fresh session holding the user's ID. The two login limiters run first.
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
/**
 * What the login limiters count a login attempt under: the caller's IP address plus the account the email logs into
 * (or the email itself when no account has it). Keyed per account, so one attacker can't lock everyone out.
 */
async function loginKey(request: Request): Promise<string> {
    // ipKeyGenerator groups an IPv6 address with its neighbours, which one attacker can easily switch between
    const ip = ipKeyGenerator(request.ip ?? '');
    const email = request.body?.email;
    if (typeof email !== 'string') {
        return ip;
    }

    // MySQL matches emails ignoring case and accents, so "Victim@…" and "vìctim@…" log into the same account.
    // Keying on the account it finds stops each spelling from getting a fresh count.
    const selectQuery = `SELECT id FROM users WHERE email = ?`;
    const [rows] = await db.query<RowDataPacket[]>(selectQuery, [email]);
    const row = rows[0];
    if (!row) {
        return `${ip} ${email}`;
    }
    return `${ip} ${row.id}`;
}

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
/** The longest email users.email (VARCHAR(254)) holds, which is also the longest an email address can be. */
const MAX_EMAIL_LENGTH = 254;

/**
 * What's wrong with an email, or null when it's fine: at most MAX_EMAIL_LENGTH characters, no spaces, and something
 * before an @ followed by a dot with something on both sides of it (a@b.c is the shortest that passes).
 */
function validateEmail(email: unknown): string | null {
    if (typeof email !== 'string') {
        return 'email must be a string';
    }
    if (email.length > MAX_EMAIL_LENGTH) {
        return `email must be ${MAX_EMAIL_LENGTH} characters or fewer`;
    }
    // \s also catches tabs and line breaks
    if (/\s/.test(email)) {
        return "email can't contain spaces";
    }

    const atIndex = email.indexOf('@');
    const lastDotIndex = email.lastIndexOf('.');
    const hasNameBeforeAt = atIndex > 0;
    const hasDotAfterAt = lastDotIndex > atIndex + 1;
    const hasTextAfterDot = lastDotIndex < email.length - 1;
    if (!hasNameBeforeAt || !hasDotAfterAt || !hasTextAfterDot) {
        return 'email needs an @ and a dot, like name@example.com';
    }
    return null;
}

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

/** What's wrong with the email and display name sent to PUT /me, or null when both are fine. */
function validateDetails(email: unknown, displayName: unknown): string | null {
    if (!email || !displayName) {
        return 'email and displayName are required';
    }
    const emailError = validateEmail(email);
    if (emailError) {
        return emailError;
    }
    return validateDisplayName(displayName);
}

/**
 * Saves a user's email and display name; false when there's no such user. Throws MySQL's ER_DUP_ENTRY when the
 * email is taken. projectIds never changes here: the project routes manage it.
 */
async function updateDetails(userId: string, email: string, displayName: string): Promise<boolean> {
    const updateQuery = `UPDATE users SET email = ?, display_name = ? WHERE id = ?`;
    const [result] = await db.query<ResultSetHeader>(updateQuery, [email, displayName.trim(), userId]);
    return result.affectedRows > 0;
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

/**
 * A user's project IDs, read with the user's row locked until the caller's transaction ends, so a project can't be
 * added to the list meanwhile. Empty when there's no such user.
 */
async function lockProjectIdsOfUser(connection: PoolConnection, userId: string): Promise<string[]> {
    const selectQuery = `SELECT project_ids AS projectIds FROM users WHERE id = ? FOR UPDATE`;
    const [rows] = await connection.query<RowDataPacket[]>(selectQuery, [userId]);
    const row = rows[0];
    if (!row) {
        return [];
    }
    return row.projectIds as string[];
}

/**
 * Takes a user out of a project's members, in the caller's transaction. A project left with no members is deleted,
 * and its blueprints, assets and dialogues go with it through their foreign keys.
 */
async function leaveProject(connection: PoolConnection, projectId: string, userId: string): Promise<void> {
    // FOR UPDATE: two members leaving at the same moment each wait for the other, so neither keeps the other in the list
    const selectQuery = `SELECT member_user_ids AS memberUserIds FROM projects WHERE id = ? FOR UPDATE`;
    const [rows] = await connection.query<RowDataPacket[]>(selectQuery, [projectId]);
    const row = rows[0];
    if (!row) {
        return;
    }

    const kept: string[] = [];
    for (const memberId of row.memberUserIds as string[]) {
        if (memberId !== userId) {
            kept.push(memberId);
        }
    }

    if (kept.length === 0) {
        await connection.query(`DELETE FROM projects WHERE id = ?`, [projectId]);
        return;
    }
    const updateQuery = `UPDATE projects SET member_user_ids = ? WHERE id = ?`;
    await connection.query(updateQuery, [JSON.stringify(kept), projectId]);
}

/** Ends every login session a user has, in any browser, in the caller's transaction. */
async function deleteSessionsOfUser(connection: PoolConnection, userId: string): Promise<void> {
    // `data` is the whole session saved as JSON text, so the user's ID sits inside it
    const deleteQuery = `DELETE FROM sessions WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.userId')) = ?`;
    await connection.query(deleteQuery, [userId]);
}
// endregion