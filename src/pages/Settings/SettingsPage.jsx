import { Download, FileArchive, Info, RotateCcw, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import AppShell from '../../components/AppShell/AppShell.jsx'
import AppSidebar from '../../components/AppSidebar/AppSidebar.jsx'
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx'
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

const formatSize = (bytes) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`)

/** General settings (/settings): what's stored, backup and restore, and starting over. */
function SettingsPage() {
  const blueprints = useBlueprints()
  const assets = useAssets()
  const dialogues = useDialogues()
  const toast = useToast()
  const fileInputRef = useRef(null)
  // A backup file the user picked, waiting for them to confirm: { backup, fileName }
  const [pendingBackup, setPendingBackup] = useState(null)
  // The confirmation dialog currently open: { title, message, confirmLabel, run }
  const [confirmation, setConfirmation] = useState(null)

  const current = { blueprints, assets, dialogues }
  const storedSize = new Blob([JSON.stringify(current)]).size

  function downloadBackup() {
    const createdAt = new Date().toISOString()
    downloadJson(`gameatlas-backup-${createdAt.slice(0, 10)}.json`, createBackup(current, createdAt))
    toast.show({ status: 'success', message: 'Backup downloaded' })
  }

  async function chooseBackupFile(event) {
    const file = event.target.files?.[0]
    event.target.value = '' // so picking the same file again still triggers a change
    if (!file) return
    const result = parseBackupFile(await file.text())
    if (result.error) {
      setPendingBackup(null)
      toast.show({ status: 'error', message: result.error })
      return
    }
    setPendingBackup({ backup: result.backup, fileName: file.name })
  }

  function askToRestore() {
    setConfirmation({
      title: 'Replace everything with this backup?',
      message: `Your ${describeContents(current)} will be replaced by the backup's ${describeContents(pendingBackup.backup)}. This can't be undone, so download a backup of your current data first if you might need it.`,
      confirmLabel: 'Replace everything',
      run: () => {
        restoreData(pendingBackup.backup)
        setPendingBackup(null)
        toast.show({ status: 'success', message: 'Backup restored' })
      },
    })
  }

  function askToReset() {
    setConfirmation({
      title: 'Reset to example data?',
      message: `Your ${describeContents(current)} will be replaced by the example blueprints, assets and dialogue. This can't be undone.`,
      confirmLabel: 'Reset data',
      run: () => {
        resetToExampleData()
        toast.show({ status: 'success', message: 'Example data restored' })
      },
    })
  }

  function askToDeleteAll() {
    setConfirmation({
      title: 'Delete all data?',
      message: `Your ${describeContents(current)} will be deleted. This can't be undone.`,
      confirmLabel: 'Delete everything',
      run: () => {
        deleteAllData()
        toast.show({ status: 'success', message: 'All data deleted' })
      },
    })
  }

  const counts = [
    { label: blueprints.length === 1 ? 'blueprint' : 'blueprints', value: blueprints.length, to: '/blueprints' },
    { label: assets.length === 1 ? 'asset' : 'assets', value: assets.length, to: '/assets' },
    { label: dialogues.length === 1 ? 'dialogue' : 'dialogues', value: dialogues.length, to: '/dialogues' },
  ]

  return (
    <AppShell
      sidebar={<AppSidebar />}
      breadcrumbs={<Breadcrumbs items={[{ label: 'Settings' }]} />}
      status={`${formatSize(storedSize)} saved in this browser`}
    >
      <div className={styles.page}>
        <header>
          <h1>Settings</h1>
          <p className={styles.intro}>Back up your work, restore it, or start over.</p>
        </header>

        <Section title="Your data">
          <div className={styles.counts}>
            {counts.map((count) => (
              <Link key={count.label} to={count.to} className={styles.count}>
                <span className={styles.countValue}>{count.value}</span>
                <span className={styles.countLabel}>{count.label}</span>
              </Link>
            ))}
          </div>
          <p className={styles.note}>
            <Info size={16} strokeWidth={1.75} aria-hidden="true" />
            Everything is saved in this browser only ({formatSize(storedSize)}). Clearing your browser data or switching
            computers loses it, so download a backup regularly.
          </p>
        </Section>

        <Section title="Back up and restore">
          <div className={styles.row}>
            <div>
              <h2 className={styles.rowTitle}>Download a backup</h2>
              <p className={styles.rowText}>
                One file with every blueprint, asset and dialogue, including dialogue layouts. Keep it somewhere safe.
              </p>
            </div>
            <Button variant="primary" icon={Download} onClick={downloadBackup}>
              Download backup
            </Button>
          </div>

          <div className={styles.row}>
            <div>
              <h2 className={styles.rowTitle}>Restore from a backup</h2>
              <p className={styles.rowText}>Replaces everything in GameAtlas with the contents of a backup file.</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".json,application/json" hidden onChange={chooseBackupFile} />
            <Button icon={Upload} onClick={() => fileInputRef.current.click()}>
              Choose backup file
            </Button>
          </div>

          {pendingBackup && (
            <div className={styles.preview}>
              <FileArchive size={20} strokeWidth={1.75} aria-hidden="true" />
              <div className={styles.previewText}>
                <p className={styles.previewName}>{pendingBackup.fileName}</p>
                <p className={styles.rowText}>
                  {pendingBackup.backup.createdAt ? `Made ${formatDateTime(pendingBackup.backup.createdAt)}` : 'Date unknown'} ·{' '}
                  {describeContents(pendingBackup.backup)}
                </p>
              </div>
              <div className={styles.previewActions}>
                <Button onClick={() => setPendingBackup(null)}>Cancel</Button>
                <Button variant="danger" icon={RotateCcw} onClick={askToRestore}>
                  Restore this backup
                </Button>
              </div>
            </div>
          )}
        </Section>

        <Section title="Start over">
          <div className={styles.row}>
            <div>
              <h2 className={styles.rowTitle}>Reset to example data</h2>
              <p className={styles.rowText}>
                Replaces everything with the example Item and Entity blueprints, their assets and the Merchant greeting
                dialogue. Handy for demos.
              </p>
            </div>
            <Button icon={RotateCcw} onClick={askToReset}>
              Reset to examples
            </Button>
          </div>
          <div className={styles.row}>
            <div>
              <h2 className={styles.rowTitle}>Delete all data</h2>
              <p className={styles.rowText}>Removes every blueprint, asset and dialogue so you can start from nothing.</p>
            </div>
            <Button variant="danger" icon={Trash2} onClick={askToDeleteAll}>
              Delete everything
            </Button>
          </div>
        </Section>
      </div>

      <ConfirmDialog
        open={Boolean(confirmation)}
        title={confirmation?.title}
        message={confirmation?.message}
        confirmLabel={confirmation?.confirmLabel}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => {
          confirmation.run()
          setConfirmation(null)
        }}
      />
    </AppShell>
  )
}

export default SettingsPage
