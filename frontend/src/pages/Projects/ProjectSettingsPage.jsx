import { Download, LogOut, Pencil, Trash2, Upload, UserMinus, UserPlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { forgetProject, replaceProject } from '../../api/currentProjectStore.js'
import { addMember, deleteProject, listMembers, removeMember, renameProject } from '../../api/projects.js'
import { useCurrentProject } from '../../api/useCurrentProject.js'
import { useCurrentUser } from '../../api/useCurrentUser.js'
import AppShell from '../../components/AppShell/AppShell.jsx'
import BackupPreview from '../../components/BackupPreview/BackupPreview.jsx'
import Badge from '../../components/Badge/Badge.jsx'
import Button from '../../components/Button/Button.jsx'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog.jsx'
import PropertyRow from '../../components/form/PropertyRow.jsx'
import TextInput from '../../components/form/TextInput.jsx'
import LoadingRecord from '../../components/LoadingRecord/LoadingRecord.jsx'
import Section from '../../components/Section/Section.jsx'
import SettingRow from '../../components/SettingRow/SettingRow.jsx'
import { useToast } from '../../components/Toast/useToast.js'
import { createBackup, deleteAllData, describeContents, parseBackupFile, restoreData } from '../../data/backup.js'
import { useAssets } from '../../data/useAssets.js'
import { useDialogues } from '../../data/useDialogues.js'
import { useBlueprints } from '../../schema/useBlueprints.js'
import { downloadJson } from '../../utils/downloadJson.js'
import { formatDateTime } from '../../utils/formatDate.js'
import { plural } from '../../utils/plural.js'

/** One project's own settings (/projects/:projectId/settings): details, backup and restore, members, deleting it. */
function ProjectSettingsPage() {
  const { projectId } = useParams()
  const currentProject = useCurrentProject()
  const currentUser = useCurrentUser()
  // The members as { id, email, displayName }; null until the server has answered
  const [members, setMembers] = useState(null)
  const [membersError, setMembersError] = useState(null)

  useEffect(() => {
    // Set by the cleanup below, so an answer that arrives after the page has closed is ignored
    let ignore = false

    async function load() {
      const result = await listMembers(projectId)
      if (ignore) {
        return
      }
      if (result.error) {
        setMembersError(result.error)
        return
      }
      setMembers(result.data)
    }

    load()
    return () => {
      ignore = true
    }
  }, [projectId])

  if (!currentProject.project || !currentUser.user) {
    return <LoadingRecord error={currentProject.error} />
  }
  const project = currentProject.project

  return (
    <AppShell crumbs={[{ label: project.name }, { label: 'Settings' }]} status={statusText(project, members)}>
      <div className="page">
        <header className="page-head">
          <div>
            <h1>Project settings</h1>
            <p className="page-intro">Everything about {project.name}: its details, backups and members.</p>
          </div>
        </header>

        <DetailsSection project={project} members={members} membersError={membersError} />
        <BackupSection project={project} />
        <MembersSection
          project={project}
          userId={currentUser.user.id}
          members={members}
          membersError={membersError}
          onChange={setMembers}
        />
        <DeleteProjectSection project={project} />
      </div>
    </AppShell>
  )
}

/** The project's name (which can be changed here), when it was made, what kind it is, and who is in it. */
function DetailsSection({ project, members, membersError }) {
  const toast = useToast()
  const [name, setName] = useState(project.name)
  // Shown under the name box when it's left empty
  const [problem, setProblem] = useState(null)
  // True while the rename waits for the server, so it can't be sent twice
  const [sending, setSending] = useState(false)

  async function handleRename(event) {
    // Without this the browser reloads the page when the form is submitted
    event.preventDefault()

    const trimmed = name.trim()
    if (trimmed === '') {
      setProblem('Enter a name')
      return
    }
    setProblem(null)

    setSending(true)
    const result = await renameProject(project.id, trimmed)
    setSending(false)

    if (result.error) {
      toast.show({ status: 'error', message: result.error })
      return
    }

    // The sidebar and this page read the project from the store, so they show the new name at once
    replaceProject(result.data)
    setName(result.data.name)
    toast.show({ status: 'success', message: 'Project renamed' })
  }

  const isUnchanged = name.trim() === project.name

  let kind = 'Shared: every member can open it and change everything in it.'
  if (project.personalUserId !== null) {
    kind = "Personal: only you can open it. It can't be shared, left or deleted."
  }

  return (
    <Section title="Details">
      <form onSubmit={handleRename}>
        <PropertyRow label="Name" error={problem}>
          <div className="row">
            <TextInput value={name} onChange={(event) => setName(event.target.value)} />
            <Button type="submit" icon={Pencil} disabled={sending || isUnchanged}>
              Rename
            </Button>
          </div>
        </PropertyRow>
      </form>
      <DetailRow label="Created" value={formatDateTime(project.createdAt)} />
      <DetailRow label="Kind" value={kind} />
      <DetailRow label="Members" value={<MemberNames members={members} error={membersError} />} />
    </Section>
  )
}

/** One label and value, laid out like the account page's rows. */
function DetailRow({ label, value }) {
  return (
    <div className="value-row">
      <span className="muted">{label}</span>
      <div className="value">{value}</div>
    </div>
  )
}

/** The members' names in one line, or why they aren't there yet. */
function MemberNames({ members, error }) {
  if (error) {
    return <span className="muted">{error}</span>
  }
  if (!members) {
    return <span className="muted">Loading…</span>
  }

  const names = []
  for (const member of members) {
    names.push(member.displayName)
  }
  return <span>{names.join(', ')}</span>
}

/** Download the project as a backup file, put one back, or empty the project. */
function BackupSection({ project }) {
  const blueprints = useBlueprints()
  const assets = useAssets()
  const dialogues = useDialogues()
  const toast = useToast()
  const fileInputRef = useRef(null)
  // A backup file the user picked, waiting for them to confirm: { backup, fileName }
  const [pendingBackup, setPendingBackup] = useState(null)
  // The confirmation dialog currently open: { title, message, confirmLabel, run }, where run() does the work
  const [confirmation, setConfirmation] = useState(null)
  // True while a restore or delete waits for the server, so the buttons can't send it twice
  const [sending, setSending] = useState(false)

  const current = { blueprints: blueprints, assets: assets, dialogues: dialogues }

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
      message: `The ${describeContents(current)} in "${project.name}" will be deleted. The project and its members stay. This can't be undone.`,
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
    <>
      <Section title="Back up and restore">
        <SettingRow
          title="Download a backup"
          text="One file with every blueprint, asset and dialogue in this project, including dialogue layouts."
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

        <SettingRow title="Delete all data" text="Removes every blueprint, asset and dialogue. The project and its members stay.">
          <Button variant="danger" icon={Trash2} disabled={sending} onClick={askToDeleteAll}>
            Delete everything
          </Button>
        </SettingRow>
      </Section>

      {confirmation && (
        <ConfirmDialog
          title={confirmation.title}
          message={confirmation.message}
          confirmLabel={confirmation.confirmLabel}
          onCancel={() => setConfirmation(null)}
          onConfirm={handleConfirm}
        />
      )}
    </>
  )
}

/** Everyone in the project, with ways to add someone, remove someone, or leave. */
function MembersSection({ project, userId, members, membersError, onChange }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [email, setEmail] = useState('')
  // Shown under the email box when it's left empty
  const [problem, setProblem] = useState(null)
  // The confirmation dialog currently open: { title, message, confirmLabel, run }, where run() does the work
  const [confirmation, setConfirmation] = useState(null)
  // True while a change waits for the server, so the buttons can't send it twice
  const [sending, setSending] = useState(false)

  if (membersError) {
    return (
      <Section title="Members">
        <p className="muted">{membersError}</p>
      </Section>
    )
  }
  if (!members) {
    return (
      <Section title="Members">
        <p className="muted">Loading…</p>
      </Section>
    )
  }

  const isPersonal = project.personalUserId !== null
  const isOnlyMember = members.length === 1

  async function handleAdd(event) {
    // Without this the browser reloads the page when the form is submitted
    event.preventDefault()

    const trimmed = email.trim()
    if (trimmed === '') {
      setProblem('Enter their email')
      return
    }
    setProblem(null)

    setSending(true)
    const result = await addMember(project.id, trimmed)
    setSending(false)

    if (result.error) {
      // The server says things like "No account uses that email"
      toast.show({ status: 'error', message: result.error })
      return
    }
    onChange([...members, result.data])
    setEmail('')
    toast.show({ status: 'success', message: `${result.data.displayName} added` })
  }

  function askToRemove(member) {
    async function remove() {
      const result = await removeMember(project.id, member.id)
      if (result.error) {
        toast.show({ status: 'error', message: result.error })
        return
      }
      onChange(members.filter((candidate) => candidate.id !== member.id))
      toast.show({ status: 'success', message: `${member.displayName} removed` })
    }

    setConfirmation({
      title: `Remove ${member.displayName} from "${project.name}"?`,
      message: `${member.displayName} (${member.email}) won't be able to open this project any more. You can add them again later.`,
      confirmLabel: 'Remove member',
      run: remove,
    })
  }

  function askToLeave() {
    async function leave() {
      const result = await removeMember(project.id, userId)
      if (result.error) {
        toast.show({ status: 'error', message: result.error })
        return
      }
      // Off the project's pages first, so they don't show "Project not found" once it's forgotten
      await navigate('/', { replace: true })
      forgetProject(project.id)
      toast.show({ status: 'success', message: `You left "${project.name}"` })
    }

    setConfirmation({
      title: `Leave "${project.name}"?`,
      message: "You won't be able to open this project any more, unless a member adds you again.",
      confirmLabel: 'Leave project',
      run: leave,
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

  const rows = []
  for (const member of members) {
    rows.push(
      <MemberRow
        key={member.id}
        member={member}
        isYou={member.id === userId}
        canLeave={!isPersonal && !isOnlyMember}
        sending={sending}
        onRemove={() => askToRemove(member)}
        onLeave={askToLeave}
      />,
    )
  }

  let note = null
  if (isPersonal) {
    note = <p className="small muted">This is your personal project, so nobody else can join it and you can't leave it.</p>
  } else if (isOnlyMember) {
    note = <p className="small muted">You're the only member, so you can't leave. Delete the project below instead.</p>
  }

  return (
    <>
      <Section title="Members">
        <div className="stack">
          <p className="small muted">Every member can open this project and change everything in it, including these settings.</p>
          <div>{rows}</div>
          {note}
          {!isPersonal && (
            <AddMemberForm
              email={email}
              problem={problem}
              sending={sending}
              onEmailChange={setEmail}
              onSubmit={handleAdd}
            />
          )}
        </div>
      </Section>

      {confirmation && (
        <ConfirmDialog
          title={confirmation.title}
          message={confirmation.message}
          confirmLabel={confirmation.confirmLabel}
          onCancel={() => setConfirmation(null)}
          onConfirm={handleConfirm}
        />
      )}
    </>
  )
}

/** One member: their name (with a "You" badge for the logged-in user) and email, then Remove, or Leave for you. */
function MemberRow({ member, isYou, canLeave, sending, onRemove, onLeave }) {
  let title = member.displayName
  let button = (
    <Button icon={UserMinus} disabled={sending} onClick={onRemove}>
      Remove
    </Button>
  )
  if (isYou) {
    title = (
      <>
        {member.displayName} <Badge>You</Badge>
      </>
    )
    button = (
      <Button icon={LogOut} disabled={sending || !canLeave} onClick={onLeave}>
        Leave project
      </Button>
    )
  }

  return (
    <SettingRow title={title} text={member.email}>
      {button}
    </SettingRow>
  )
}

/** The email box and button that add an existing account to the project. */
function AddMemberForm({ email, problem, sending, onEmailChange, onSubmit }) {
  return (
    <form onSubmit={onSubmit}>
      <PropertyRow label="Add a member" error={problem} help="The email they signed up with.">
        <div className="row">
          <TextInput type="email" value={email} onChange={(event) => onEmailChange(event.target.value)} />
          <Button type="submit" icon={UserPlus} disabled={sending}>
            Add member
          </Button>
        </div>
      </PropertyRow>
    </form>
  )
}

/** Deleting the whole project for everyone. A personal project can only be emptied, so its button is disabled. */
function DeleteProjectSection({ project }) {
  const blueprints = useBlueprints()
  const assets = useAssets()
  const dialogues = useDialogues()
  const navigate = useNavigate()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  // True while the delete waits for the server, so it can't be sent twice
  const [sending, setSending] = useState(false)

  const isPersonal = project.personalUserId !== null
  const current = { blueprints: blueprints, assets: assets, dialogues: dialogues }

  async function handleConfirm() {
    setConfirming(false)
    setSending(true)
    const result = await deleteProject(project.id)
    setSending(false)

    if (result.error) {
      toast.show({ status: 'error', message: result.error })
      return
    }

    // Off the project's pages first, so they don't show "Project not found" once it's forgotten
    await navigate('/', { replace: true })
    forgetProject(project.id)
    toast.show({ status: 'success', message: `Project "${project.name}" deleted` })
  }

  let text = "Deletes the project and everything in it, for every member. This can't be undone."
  if (isPersonal) {
    text = "Your personal project can't be deleted. Use Delete everything above to empty it instead."
  }

  return (
    <>
      <Section title="Delete project">
        <SettingRow title="Delete this project" text={text}>
          <Button variant="danger" icon={Trash2} disabled={sending || isPersonal} onClick={() => setConfirming(true)}>
            Delete project
          </Button>
        </SettingRow>
      </Section>

      {confirming && (
        <ConfirmDialog
          title={`Delete the project "${project.name}"?`}
          message={`"${project.name}" and its ${describeContents(current)} will be deleted for every member. This can't be undone.`}
          confirmLabel="Delete project"
          onCancel={() => setConfirming(false)}
          onConfirm={handleConfirm}
        />
      )}
    </>
  )
}

// The status bar text: what kind of project it is, and how many members it has once they're loaded
function statusText(project, members) {
  if (project.personalUserId !== null) {
    return 'Personal project'
  }
  if (!members) {
    return 'Shared project'
  }
  return `Shared project · ${plural(members.length, 'member')}`
}

export default ProjectSettingsPage
