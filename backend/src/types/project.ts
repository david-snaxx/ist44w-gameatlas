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
    /** {@link User} UUIDs for users that may work on this project. */
    memberUserIds: string[];
    /** {@link Asset} UUIDs for assets that are part of this project. */
    assetIds: string[];
    /** {@link Blueprint} UUIDs for blueprints that are part of this project. */
    blueprintIds: string[];
    /** {@link Dialogue} UUIDs for dialogues that are part of this project. */
    dialogueIds: string[];
}

/**
 * Everything in one {@link Project}, the way a backup holds it. `PUT /api/projects/:id/contents` takes one
 * (checked by checkContents() in frontend/src/data/backupFile.js) and answers with what it saved.
 */
export interface ProjectContents {
    blueprints: Blueprint[];
    assets: Asset[];
    dialogues: Dialogue[];
}
