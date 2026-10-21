import { replaceProjectContents } from '../api/projects.js'
import { replaceBlueprints } from '../schema/blueprintStore.js'
import { STARTER_BLUEPRINTS } from '../schema/starterBlueprints.js'
import { replaceAssets } from './assetStore.js'
import { replaceDialogues } from './dialogueStore.js'
import { STARTER_ASSETS } from './starterAssets.js'
import { STARTER_DIALOGUES } from './starterDialogues.js'

/*
 * Restoring, resetting and deleting everything in one project. The backup file format lives in backupFile.js,
 * passed on from here so the Settings page imports from one place.
 */
export { createBackup, describeContents, parseBackupFile } from './backupFile.js'

/**
 * Replaces everything in a project with `data` ({ blueprints, assets, dialogues }), all or nothing, and puts the
 * server's answer into the stores. Answers { data } or { error }.
 */
export async function restoreData(projectId, data) {
  const contents = { blueprints: data.blueprints, assets: data.assets, dialogues: data.dialogues }
  const result = await replaceProjectContents(projectId, contents)
  if (result.error) {
    return result
  }

  const saved = result.data
  replaceBlueprints(projectId, saved.blueprints)
  replaceAssets(projectId, saved.assets)
  replaceDialogues(projectId, saved.dialogues)
  return result
}

/** Replaces everything in a project with the example blueprints, assets and dialogue. Answers { data } or { error }. */
export function resetToExampleData(projectId) {
  return restoreData(projectId, { blueprints: STARTER_BLUEPRINTS, assets: STARTER_ASSETS, dialogues: STARTER_DIALOGUES })
}

/** Deletes every blueprint, asset and dialogue in a project. Answers { data } or { error }. */
export function deleteAllData(projectId) {
  return restoreData(projectId, { blueprints: [], assets: [], dialogues: [] })
}
