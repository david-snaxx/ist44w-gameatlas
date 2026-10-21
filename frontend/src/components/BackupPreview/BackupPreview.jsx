import { RotateCcw } from 'lucide-react'
import { describeContents } from '../../data/backupFile.js'
import { formatDateTime } from '../../utils/formatDate.js'
import Button from '../Button/Button.jsx'

/**
 * A backup file the user picked, with what's in it, waiting for them to restore it or cancel.
 * pendingBackup: { backup, fileName }. sending: true while a request is on its way (disables the buttons).
 */
function BackupPreview({ pendingBackup, sending, onCancel, onRestore }) {
  const backup = pendingBackup.backup
  let made = 'Date unknown'
  if (backup.createdAt) {
    made = `Made ${formatDateTime(backup.createdAt)}`
  }

  return (
    <div className="backup-preview">
      <div className="backup-preview-text">
        <p>{pendingBackup.fileName}</p>
        <p className="backup-preview-detail">
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

export default BackupPreview
