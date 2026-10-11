import 'express-session'

/**
 * Tells TypeScript what is in a login session.
 */
declare module 'express-session' {
    interface SessionData {
        /** The logged-in user's ID. */
        userId: string
    }
}
