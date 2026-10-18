import type {Asset} from './asset.ts'
import type {Blueprint} from './blueprint.ts'
import type {Dialogue} from './dialogue.ts'

/** A backup of everything in one project: a JSON file the user saves to their device. */
export interface Backup {
    app: 'GameAtlas'
    type: 'backup'
    /** Version number at time of export for importing older backups. */
    formatVersion: number
    /** ISO 8601 creation time. */
    createdAt: string
    /** The project's {@link Blueprint}s. */
    blueprints: Blueprint[]
    /** The project's {@link Asset}s. */
    assets: Asset[]
    /** The project's {@link Dialogue}s. */
    dialogues: Dialogue[]
}
