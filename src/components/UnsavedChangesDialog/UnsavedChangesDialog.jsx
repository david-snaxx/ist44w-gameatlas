import ConfirmDialog from '../ConfirmDialog/ConfirmDialog.jsx'

/** The "you have unsaved changes" prompt every editor shows. blocker comes from useUnsavedChanges(). */
function UnsavedChangesDialog({ blocker, name }) {
  return (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      title="Discard unsaved changes?"
      message={`Your changes to "${name}" haven't been saved.`}
      confirmLabel="Discard changes"
      onCancel={() => blocker.reset?.()}
      onConfirm={() => blocker.proceed?.()}
    />
  )
}

export default UnsavedChangesDialog
