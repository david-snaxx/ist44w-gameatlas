import type { Asset } from './asset.ts';
import type { Blueprint } from './blueprint.ts';
import type { Dialogue } from './dialogue.ts';

/**
 * A collection of data that is restricted to certain {@link User}s.
 * Includes {@link Asset}s, {@link Blueprint}s, and {@link Dialogue}s.
 */
export interface Project {
    /** The internal UUID. */
    id: string;
    /** The display name. */
    name: string;
    /** ISO 8601 creation time. */
    createdAt: Date;
    /** The {@link User} whose personal project this is, or null for a shared one. A personal one can't be joined, left or deleted. */
    personalUserId: string | null;
    /** {@link User} UUIDs for users that may work on this project. */
    memberUserIds: string[];
    /** {@link Asset} UUIDs for assets that are part of this project. */
    assetIds: string[];
    /** {@link Blueprint} UUIDs for blueprints that are part of this project. */
    blueprintIds: string[];
    /** {@link Dialogue} UUIDs for dialogues that are part of this project. */
    dialogueIds: string[];
}

/** One member of a {@link Project}, as the members routes answer: a {@link User}'s public details. */
export interface ProjectMember {
    id: string;
    email: string;
    displayName: string;
}

/** Everything in one {@link Project}, as a backup holds it. What `PUT /api/projects/:id/contents` takes and answers. */
export interface ProjectContents {
    blueprints: Blueprint[];
    assets: Asset[];
    dialogues: Dialogue[];
}
