import { Download, RotateCcw, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import AppShell from '../../components/AppShell/AppShell.jsx'
import Button from '../../components/Button/Button.jsx'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog.jsx'
import Section from '../../components/Section/Section.jsx'
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
import { formatDateTime } from '../../utils/formatDate.js'
import styles from './SettingsPage.module.css'

/** General settings (/settings): what's stored, backup and restore, and starting over. */
function SettingsPage() {
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

  const current = { blueprints: blueprints, assets: assets, dialogues: dialogues }
  const storedSize = new Blob([JSON.stringify(current)]).size

  function downloadBackup() {
    const createdAt = new Date().toISOString()
    const date = createdAt.slice(0, 10) // just "2026-09-24"
    downloadJson(`gameatlas-backup-${date}.json`, createBackup(current, createdAt))
    toast.show({ status: 'success', message: 'Backup downloaded' })
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
      const result = await restoreData(pendingBackup.backup)
      if (result.error) {
        toast.show({ status: 'error', message: result.error })
        return
      }
      setPendingBackup(null)
      toast.show({ status: 'success', message: 'Backup restored' })
    }

    setConfirmation({
      title: 'Replace everything with this backup?',
      message: `Your ${describeContents(current)} will be replaced by the backup's ${describeContents(pendingBackup.backup)}. This can't be undone, so download a backup of your current data first if you might need it.`,
      confirmLabel: 'Replace everything',
      run: restore,
    })
  }

  function askToReset() {
    async function reset() {
      const result = await resetToExampleData()
      if (result.error) {
        toast.show({ status: 'error', message: result.error })
        return
      }
      toast.show({ status: 'success', message: 'Example data restored' })
    }

    setConfirmation({
      title: 'Reset to example data?',
      message: `Your ${describeContents(current)} will be replaced by the example blueprints, assets and dialogue. This can't be undone.`,
      confirmLabel: 'Reset data',
      run: reset,
    })
  }

  function askToDeleteAll() {
    async function deleteEverything() {
      const result = await deleteAllData()
      if (result.error) {
        toast.show({ status: 'error', message: result.error })
        return
      }
      toast.show({ status: 'success', message: 'All data deleted' })
    }

    setConfirmation({
      title: 'Delete all data?',
      message: `Your ${describeContents(current)} will be deleted. This can't be undone.`,
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
          <p className="page-intro">Back up your work, restore it, or start over.</p>
        </header>

        <Section title="Your data">
          <div className={styles.counts}>
            <CountTile count={blueprints.length} noun="blueprint" to="/blueprints" />
            <CountTile count={assets.length} noun="asset" to="/assets" />
            <CountTile count={dialogues.length} noun="dialogue" to="/dialogues" />
          </div>
          <p className="small muted">
            Everything is saved on the server, in your project. Download a backup now and then to keep a copy of your
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

          <SettingRow title="Restore from a backup" text="Replaces everything in your project with the contents of a backup file.">
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

/** One setting: a title and explanation on the left, its button (the children) on the right. */
function SettingRow({ title, text, children }) {
  return (
    <div className={styles.setting}>
      <div>
        <h2 className={styles.settingTitle}>{title}</h2>
        <p className={styles.settingText}>{text}</p>
      </div>
      {children}
    </div>
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

/** The backup file the user picked, with what's in it, waiting for them to restore it or cancel. */
function BackupPreview({ pendingBackup, sending, onCancel, onRestore }) {
  const backup = pendingBackup.backup
  let made = 'Date unknown'
  if (backup.createdAt) {
    made = `Made ${formatDateTime(backup.createdAt)}`
  }

  return (
    <div className={styles.preview}>
      <div className={styles.previewText}>
        <p>{pendingBackup.fileName}</p>
        <p className={styles.settingText}>
          {made} · {describeContents(backup)}
        </p>
      </div>
      <div className="row">
        <Button disabled={sending} onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" icon={RotateCcw} disabled={sending} onClick={onRestore}>
          Restore this backup
        </Button>
      </div>
    </div>
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
