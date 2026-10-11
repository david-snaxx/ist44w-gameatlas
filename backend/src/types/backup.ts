import type {Asset} from './asset.ts'
import type {Blueprint} from './blueprint.ts'
import type {Dialogue} from './dialogue.ts'

/**
 * A backup containing everything GameAtlas stores.
 * This may be a JSON file that a user saves to their device.
 */
export interface Backup {
    app: 'GameAtlas'
    type: 'backup'
    /** Version number at time of export for importing older backups. */
    formatVersion: number
    /** ISO 8601 creation time. */
    createdAt: string
    /** All {@link Blueprint} objects the user has access to. */
    blueprints: Blueprint[]
    /** All {@link Asset} objects the user has access to. */
    assets: Asset[]
    /** All {@link Dialogue} objects the user has access to. */
    dialogues: Dialogue[]
}
