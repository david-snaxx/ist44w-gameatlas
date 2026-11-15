import {fileURLToPath} from 'node:url'

/** backend/.env, found relative to this file so it works from any folder. */
const ENV_FILE = fileURLToPath(new URL('../.env', import.meta.url))

/**
 * Loads backend/.env into process.env, if it exists; a variable already in the environment wins. Done here rather
 * than with --env-file, which in watch mode makes Node restart on any file read in backend/ (CLAUDE.md).
 */
function loadEnvFile() {
    try {
        process.loadEnvFile(ENV_FILE)
    } catch (error) {
        const isMissing = error instanceof Error && 'code' in error && error.code === 'ENOENT'
        if (!isMissing) {
            throw error
        }
    }
}

loadEnvFile()

/**
 * The password backend/sql/init.sql gives the app's MySQL user, so a fresh clone runs without a .env. Local only:
 * that user can only log in from the same computer.
 */
const LOCAL_DB_PASSWORD = 'GameAtlas-local-1'

/** A setting from the environment, or `fallback` when it isn't set or is empty (as in a copied .env.example). */
function setting(name: string, fallback: string): string {
    const value = process.env[name]
    if (value === undefined || value === '') {
        return fallback
    }
    return value
}

/** Every setting the backend reads, in one place. `.env.example` lists the same names. */
export const config = {
    port: Number(setting('PORT', '3000')),
    // Signs the login cookie. The fallback is for local development only; a deployed server must set its own.
    sessionSecret: setting('SESSION_SECRET', 'local-development-only'),
    db: {
        host: setting('DB_HOST', 'localhost'),
        port: Number(setting('DB_PORT', '3306')),
        database: setting('DB_NAME', 'gameatlas'),
        user: setting('DB_USER', 'gameatlas'),
        password: setting('DB_PASSWORD', LOCAL_DB_PASSWORD),
    },
}
