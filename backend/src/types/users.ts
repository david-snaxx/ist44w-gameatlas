/**
 * User account data.
 * Includes the {@link Project}s that this user has access to.
 */
export interface User {
    /** The internal UUID. */
    id: string;
    /** The unique email address tied to this account */
    email: string;
    /** The bcrypt password hash. */
    passwordHash: string;
    /** The name displayed in the UI. */
    displayName: string;
    /** ISO 8601 creation time. */
    createdAt: Date;
    /** {@link Project} UUIDs for projects this user may interact with. */
    projectIds: string[];
}
