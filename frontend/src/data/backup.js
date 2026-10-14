import { replaceBlueprints } from '../schema/blueprintStore.js'
import { STARTER_BLUEPRINTS } from '../schema/starterBlueprints.js'
import { replaceAssets } from './assetStore.js'
import { replaceDialogues } from './dialogueStore.js'
import { STARTER_ASSETS } from './starterAssets.js'
import { STARTER_DIALOGUES } from './starterDialogues.js'

/*
 * Restoring, resetting and deleting everything: the parts of backups that change the stores.
 * The backup file itself (its format, reading it, and the checks on a whole set) is plain logic in backupFile.js,
 * which the backend imports too. It's passed on from here so the Settings page keeps one place to import from.
 */
export { createBackup, describeContents, parseBackupFile } from './backupFile.js'

/** Replaces everything with the given data: { blueprints, assets, dialogues }. */
export function restoreData(data) {
  replaceBlueprints(data.blueprints)
  replaceAssets(data.assets)
  replaceDialogues(data.dialogues)
}

export function resetToExampleData() {
  restoreData({ blueprints: STARTER_BLUEPRINTS, assets: STARTER_ASSETS, dialogues: STARTER_DIALOGUES })
}

export function deleteAllData() {
  restoreData({ blueprints: [], assets: [], dialogues: [] })
}
