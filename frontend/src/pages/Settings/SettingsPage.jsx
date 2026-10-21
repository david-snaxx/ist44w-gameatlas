import { Download, RotateCcw, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { useCurrentProject } from '../../api/useCurrentProject.js'
import AppShell from '../../components/AppShell/AppShell.jsx'
import BackupPreview from '../../components/BackupPreview/BackupPreview.jsx'
import Button from '../../components/Button/Button.jsx'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog.jsx'
import LoadingRecord from '../../components/LoadingRecord/LoadingRecord.jsx'
import Section from '../../components/Section/Section.jsx'
import SettingRow from '../../components/SettingRow/SettingRow.jsx'
import { useToast } from '../../components/Toast/useToast.js'
import {
  createBackup,
  deleteAllData,
  describeContents,
  parseBackupFile,
  resetToExampleData,
  restoreData,
} from '../../data/backup.js'
import { useAssets } from '../../data/useAssets.js'
import { useDialogues } from '../../data/useDialogues.js'
import { useBlueprints } from '../../schema/useBlueprints.js'
import { downloadJson } from '../../utils/downloadJson.js'
import styles from './SettingsPage.module.css'

/**
 * General settings (/settings): what's stored, backup and restore, and starting over, for the last project visited
 * (or the oldest).
 */
function SettingsPage() {
  const currentProject = useCurrentProject()
  const blueprints = useBlueprints()
  const assets = useAssets()
  const dialogues = useDialogues()
  const toast = useToast()
  const fileInputRef = useRef(null)
  // A backup file the user picked, waiting for them to confirm: { backup, fileName }
  const [pendingBackup, setPendingBackup] = useState(null)
  // The confirmation dialog currently open: { title, message, confirmLabel, run }, where run() does the work
  const [confirmation, setConfirmation] = useState(null)
  // True while a restore, reset or delete waits for the server, so the buttons can't send it twice
  const [sending, setSending] = useState(false)

  // Everything here acts on one project, so wait until it's known
  if (!currentProject.project) {
    return <LoadingRecord error={currentProject.error} />
  }
  const project = currentProject.project

  const current = { blueprints: blueprints, assets: assets, dialogues: dialogues }
  const storedSize = new Blob([JSON.stringify(current)]).size

  function downloadBackup() {
    const createdAt = new Date().toISOString()
    const date = createdAt.slice(0, 10) // just "2026-09-24"
    downloadJson(`gameatlas-backup-${date}.json`, createBackup(current, createdAt))
    toast.show({ status: 'success', message: `Backup of "${project.name}" downloaded` })
  }

  // The hidden file input reports the file the user picked
  async function chooseBackupFile(event) {
    const file = event.target.files?.[0]
    event.target.value = '' // so picking the same file again still triggers a change
    if (!file) {
      return
    }

    const result = parseBackupFile(await file.text())
    if (result.error) {
      setPendingBackup(null)
      toast.show({ status: 'error', message: result.error })
      return
    }
    setPendingBackup({ backup: result.backup, fileName: file.name })
  }

  function askToRestore() {
    async function restore() {
      const result = await restoreData(project.id, pendingBackup.backup)
      if (result.error) {
        toast.show({ status: 'error', message: result.error })
        return
      }
      setPendingBackup(null)
      toast.show({ status: 'success', message: `Backup restored to "${project.name}"` })
    }

    setConfirmation({
      title: `Replace everything in "${project.name}" with this backup?`,
      message: `The ${describeContents(current)} in "${project.name}" will be replaced by the backup's ${describeContents(pendingBackup.backup)}. This can't be undone, so download a backup of this project first if you might need it.`,
      confirmLabel: 'Replace everything',
      run: restore,
    })
  }

  function askToReset() {
    async function reset() {
      const result = await resetToExampleData(project.id)
      if (result.error) {
        toast.show({ status: 'error', message: result.error })
        return
      }
      toast.show({ status: 'success', message: `"${project.name}" reset to example data` })
    }

    setConfirmation({
      title: `Reset "${project.name}" to example data?`,
      message: `The ${describeContents(current)} in "${project.name}" will be replaced by the example blueprints, assets and dialogue. This can't be undone.`,
      confirmLabel: 'Reset data',
      run: reset,
    })
  }

  function askToDeleteAll() {
    async function deleteEverything() {
      const result = await deleteAllData(project.id)
      if (result.error) {
        toast.show({ status: 'error', message: result.error })
        return
      }
      toast.show({ status: 'success', message: `Everything in "${project.name}" deleted` })
    }

    setConfirmation({
      title: `Delete everything in "${project.name}"?`,
      message: `The ${describeContents(current)} in "${project.name}" will be deleted. This can't be undone.`,
      confirmLabel: 'Delete everything',
      run: deleteEverything,
    })
  }

  // Closes the dialog, then waits for the server while the work runs
  async function handleConfirm() {
    const run = confirmation.run
    setConfirmation(null)
    setSending(true)
    await run()
    setSending(false)
  }

  return (
    <AppShell crumbs={[{ label: 'Settings' }]} status={`${formatSize(storedSize)} of data`}>
      <div className={styles.page}>
        <header>
          <h1>Settings</h1>
          <p className="page-intro">
            Back up, restore or reset {project.name}. Everything here acts on the project you opened last.
          </p>
        </header>

        <Section title="Your data">
          <div className={styles.counts}>
            <CountTile count={blueprints.length} noun="blueprint" to={`/projects/${project.id}/blueprints`} />
            <CountTile count={assets.length} noun="asset" to={`/projects/${project.id}/assets`} />
            <CountTile count={dialogues.length} noun="dialogue" to={`/projects/${project.id}/dialogues`} />
          </div>
          <p className="small muted">
            Everything is saved on the server, in this project. Download a backup now and then to keep a copy of your
            own.
          </p>
        </Section>

        <Section title="Back up and restore">
          <SettingRow
            title="Download a backup"
            text="One file with every blueprint, asset and dialogue, including dialogue layouts. Keep it somewhere safe."
          >
            <Button variant="primary" icon={Download} onClick={downloadBackup}>
              Download backup
            </Button>
          </SettingRow>

          <SettingRow title="Restore from a backup" text="Replaces everything in this project with the contents of a backup file.">
            {/* The real file picker is hidden; the button below opens it */}
            <input ref={fileInputRef} type="file" accept=".json,application/json" hidden onChange={chooseBackupFile} />
            <Button icon={Upload} disabled={sending} onClick={() => fileInputRef.current.click()}>
              Choose backup file
            </Button>
          </SettingRow>

          {pendingBackup && (
            <BackupPreview
              pendingBackup={pendingBackup}
              sending={sending}
              onCancel={() => setPendingBackup(null)}
              onRestore={askToRestore}
            />
          )}
        </Section>

        <Section title="Start over">
          <SettingRow
            title="Reset to example data"
            text="Replaces everything with the example Item and Entity blueprints, their assets and the Merchant greeting dialogue. Handy for demos."
          >
            <Button icon={RotateCcw} disabled={sending} onClick={askToReset}>
              Reset to examples
            </Button>
          </SettingRow>
          <SettingRow
            title="Delete all data"
            text="Removes every blueprint, asset and dialogue so you can start from nothing."
          >
            <Button variant="danger" icon={Trash2} disabled={sending} onClick={askToDeleteAll}>
              Delete everything
            </Button>
          </SettingRow>
        </Section>
      </div>

      {confirmation && (
        <ConfirmDialog
          title={confirmation.title}
          message={confirmation.message}
          confirmLabel={confirmation.confirmLabel}
          onCancel={() => setConfirmation(null)}
          onConfirm={handleConfirm}
        />
      )}
    </AppShell>
  )
}

/** A tile with how many there are of something, linking to its list. */
function CountTile({ count, noun, to }) {
  let label = `${noun}s`
  if (count === 1) {
    label = noun
  }

  return (
    <Link to={to} className={styles.count}>
      <span className={styles.countValue}>{count}</span>
      <span className={styles.countLabel}>{label}</span>
    </Link>
  )
}

// A size in bytes as short text: "512 B" or "6.8 KB"
function formatSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  const kilobytes = bytes / 1024
  return `${kilobytes.toFixed(1)} KB`
}

export default SettingsPage
