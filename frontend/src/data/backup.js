import { getCurrentProject } from '../api/currentProjectStore.js'
import { replaceProjectContents } from '../api/projects.js'
import { replaceBlueprints } from '../schema/blueprintStore.js'
import { STARTER_BLUEPRINTS } from '../schema/starterBlueprints.js'
import { replaceAssets } from './assetStore.js'
import { replaceDialogues } from './dialogueStore.js'
import { STARTER_ASSETS } from './starterAssets.js'
import { STARTER_DIALOGUES } from './starterDialogues.js'

/*
 * Restoring, resetting and deleting everything in the current project. The backup file format lives in
 * backupFile.js, passed on from here so the Settings page imports from one place.
 */
export { createBackup, describeContents, parseBackupFile } from './backupFile.js'

/**
 * Replaces everything in the current project with `data` ({ blueprints, assets, dialogues }), all or nothing, and
 * puts the server's answer into the stores. Answers { data } or { error }.
 */
export async function restoreData(data) {
  const project = getCurrentProject().project
  if (!project) {
    return { error: 'Log in to change your project.' }
  }

  const contents = { blueprints: data.blueprints, assets: data.assets, dialogues: data.dialogues }
  const result = await replaceProjectContents(project.id, contents)
  if (result.error) {
    return result
  }

  const saved = result.data
  replaceBlueprints(project.id, saved.blueprints)
  replaceAssets(project.id, saved.assets)
  replaceDialogues(project.id, saved.dialogues)
  return result
}

export function resetToExampleData() {
  return restoreData({ blueprints: STARTER_BLUEPRINTS, assets: STARTER_ASSETS, dialogues: STARTER_DIALOGUES })
}

export function deleteAllData() {
  return restoreData({ blueprints: [], assets: [], dialogues: [] })
}
