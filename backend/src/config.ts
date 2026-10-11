/** Reads a setting from the environment (backend/.env during development), or uses the fallback when it isn't set. */
function setting(name: string, fallback: string): string {
  const value = process.env[name]
  if (value === undefined) {
    return fallback
  }
  return value
}

/** Every setting the backend reads, in one place. `.env.example` lists the same names. */
export const config = {
  port: Number(setting('PORT', '3000')),
  // Signs the login cookie so it can't be forged. The fallback is only for local development:
  // a deployed server must set its own long random SESSION_SECRET.
  sessionSecret: setting('SESSION_SECRET', 'local-development-only'),
  db: {
    host: setting('DB_HOST', 'localhost'),
    port: Number(setting('DB_PORT', '3306')),
    database: setting('DB_NAME', 'gameatlas'),
    user: setting('DB_USER', 'gameatlas'),
    password: setting('DB_PASSWORD', ''),
  },
}
