import { Copy, Download, LayoutList, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import AppShell from '../../components/AppShell/AppShell.jsx'
import Button from '../../components/Button/Button.jsx'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog.jsx'
import EmptyState from '../../components/EmptyState/EmptyState.jsx'
import FormRenderer from '../../components/form/FormRenderer.jsx'
import PropertyRow from '../../components/form/PropertyRow.jsx'
import TextArea from '../../components/form/TextArea.jsx'
import TextInput from '../../components/form/TextInput.jsx'
import JsonPreview from '../../components/JsonPreview/JsonPreview.jsx'
import MissingRecord from '../../components/MissingRecord/MissingRecord.jsx'
import { ImportNotice } from '../../components/Notice/Notice.jsx'
import Section from '../../components/Section/Section.jsx'
import UnsavedChangesDialog from '../../components/UnsavedChangesDialog/UnsavedChangesDialog.jsx'
import TopBarActions from '../../components/TopBarActions/TopBarActions.jsx'
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl.jsx'
import SidePanel from '../../components/SidePanel/SidePanel.jsx'
import { useToast } from '../../components/Toast/useToast.js'
import {
  addField,
  countProperties,
  createField,
  duplicateBlueprintState,
  duplicateField,
  EMPTY_BLUEPRINT,
  findField,
  moveField,
  removeField,
  replaceField,
  toDefinition,
  toDraft,
  toSnakeCase,
  usesBlueprint,
  parseBlueprintFile,
} from '../../schema/blueprintDraft.js'
import { deleteAssetsOfBlueprint, moveAssetsToBlueprint } from '../../data/assetStore.js'
import { retargetDialogueBlueprint } from '../../data/dialogueStore.js'
import { useAssets } from '../../data/useAssets.js'
import { deleteBlueprint, saveBlueprint } from '../../schema/blueprintStore.js'
import { useBlueprints } from '../../schema/useBlueprints.js'
import {
  countProblems,
  onlyTouchedErrors,
  validateBlueprint,
  validateFieldDefinition,
  validateValues,
} from '../../schema/validation.js'
import { downloadJson } from '../../utils/downloadJson.js'
import { plural } from '../../utils/plural.js'
import { useUnsavedChanges } from '../../utils/useUnsavedChanges.js'
import PropertyEditor from './PropertyEditor.jsx'
import PropertyList from './PropertyList.jsx'

const PREVIEW_TABS = [
  { value: 'form', label: 'Asset form' },
  { value: 'file', label: 'Blueprint file' },
]

/**
 * Route component for /blueprints/new and /blueprints/:blueprintId.
 * The `key` makes React build a brand-new BlueprintBuilder (with fresh state) whenever the URL
 * points at a different blueprint, instead of reusing the old one's state.
 */
function BlueprintBuilderPage() {
  const { blueprintId } = useParams()
  const location = useLocation()

  // location.state is what the page that sent us here passed along (an import or a duplicate), if anything
  const state = location.state ?? {}

  let editorKey = `new-${location.key}`
  if (blueprintId) {
    editorKey = blueprintId
  }

  return (
    <BlueprintBuilder
      key={editorKey}
      blueprintId={blueprintId}
      importedDefinition={state.imported}
      origin={state.origin}
      originName={state.originName}
    />
  )
}

/**
 * importedDefinition: a definition to start a new blueprint from (an imported file or a duplicate)
 * origin: 'file' (the default) | 'duplicate'; originName: the name of the blueprint that was duplicated
 */
function BlueprintBuilder({ blueprintId, importedDefinition, origin, originName }) {
  const isDuplicate = origin === 'duplicate'
  // An imported file's ID is kept as-is; a duplicate's ID keeps following its name
  const importedIdIsFixed = Boolean(importedDefinition?.id) && !isDuplicate
  const blueprints = useBlueprints()
  const assets = useAssets()
  const navigate = useNavigate()
  const toast = useToast()

  // The last saved definition (null for a blueprint that hasn't been saved yet).
  // `useState(() => …)` only runs the function the first time.
  const [baseline, setBaseline] = useState(() => findSavedBlueprint(blueprints, blueprintId))
  // The blueprint being edited (see schema/blueprintDraft.js for draft vs. definition)
  const [draft, setDraft] = useState(() => startingDraft(baseline, importedDefinition))
  const [idTouched, setIdTouched] = useState(Boolean(baseline) || importedIdIsFixed)
  const [metaTouched, setMetaTouched] = useState({})
  const [showAllErrors, setShowAllErrors] = useState(Boolean(importedDefinition) && !isDuplicate)
  // The side panel: null when closed, otherwise { mode, parentUid, field, keyTouched, touched, showErrors }
  const [editor, setEditor] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [previewTab, setPreviewTab] = useState('form')
  const [sampleValues, setSampleValues] = useState({})
  const [touchedPaths, setTouchedPaths] = useState([])

  // ---------- Derived data (recalculated on every render) ----------

  const definition = toDefinition(draft)
  let isDirty = draft.name !== '' || draft.fields.length > 0
  if (baseline) {
    // Both sides go through the same conversion, so only real changes count
    const savedJson = JSON.stringify(toDefinition(toDraft(baseline)))
    isDirty = JSON.stringify(definition) !== savedJson
  }

  // Blueprints a link property can point to: the other blueprints, and this one (by the ID being typed)
  const linkTargets = findLinkTargets(blueprints, baseline, draft)
  const linkTargetIds = []
  const blueprintOptions = []
  const blueprintNames = {}
  for (const target of linkTargets) {
    const label = target.name || target.id
    linkTargetIds.push(target.id)
    blueprintOptions.push({ value: target.id, label: label })
    blueprintNames[target.id] = label
  }

  const otherIds = []
  for (const blueprint of blueprints) {
    if (blueprint.id !== baseline?.id) {
      otherIds.push(blueprint.id)
    }
  }

  const errors = validateBlueprint(draft, { otherIds: otherIds, blueprintIds: linkTargetIds })
  const problemCount = countProblems(errors)

  // ---------- Leaving with unsaved changes ----------

  // In-app navigation (sidebar, breadcrumbs, back button) asks for confirmation.
  // (A hook, so it has to run on every render, before the "not found" return below.)
  const { blocker, allowLeaving } = useUnsavedChanges(isDirty)

  if (blueprintId && !baseline) {
    return (
      <MissingRecord
        title="Blueprint not found"
        message={`There's no blueprint with the ID "${blueprintId}".`}
        back={{ to: '/blueprints', label: 'All blueprints' }}
      />
    )
  }

  // ---------- Name, ID and description ----------

  // The error for "name" or "id", once it's been touched or the user tried to save
  function metaError(name) {
    if (showAllErrors || metaTouched[name]) {
      return errors.blueprint?.[name]
    }
    return undefined
  }

  function changeName(name) {
    const nextDraft = { ...draft, name: name }
    const nextTouched = { ...metaTouched, name: true }
    // The ID follows the name until the user edits the ID themselves
    if (!idTouched) {
      nextDraft.id = toSnakeCase(name)
      nextTouched.id = true
    }
    setDraft(nextDraft)
    setMetaTouched(nextTouched)
  }

  function changeId(id) {
    setDraft({ ...draft, id: id })
    setIdTouched(true)
    setMetaTouched({ ...metaTouched, id: true })
  }

  function changeDescription(description) {
    setDraft({ ...draft, description: description })
  }

  // ---------- Properties ----------

  function setFields(fields) {
    setDraft({ ...draft, fields: fields })
  }

  // Opens the side panel for a new property, at the top level (parentUid null) or inside a group
  function openAddProperty(parentUid) {
    setEditor({
      mode: 'add',
      parentUid: parentUid,
      field: createField('string'),
      keyTouched: false,
      touched: {},
      showErrors: false,
    })
  }

  function addTopLevelProperty() {
    openAddProperty(null)
  }

  function openEditProperty(uid) {
    const found = findField(draft.fields, uid)
    if (!found) {
      return
    }
    setEditor({
      mode: 'edit',
      parentUid: null,
      field: found.field,
      keyTouched: true,
      touched: {},
      showErrors: Boolean(errors[uid]),
    })
  }

  function moveProperty(uid, direction) {
    setFields(moveField(draft.fields, uid, direction))
  }

  function duplicateProperty(uid) {
    setFields(duplicateField(draft.fields, uid))
  }

  function removeProperty(uid) {
    const previousFields = draft.fields
    const removed = findField(previousFields, uid).field
    setFields(removeField(previousFields, uid))

    // Undo can be clicked seconds later, after other edits. The "current =>" form of setDraft
    // gets the newest draft, so only the property list is put back.
    function undo() {
      setDraft((current) => ({ ...current, fields: previousFields }))
    }

    toast.show({
      status: 'success',
      message: `Property "${removed.label || 'Untitled property'}" removed`,
      action: { label: 'Undo', onClick: undo },
    })
  }

  let editorErrors = {}
  if (editor) {
    editorErrors = validateFieldDefinition(editor.field, {
      siblings: editorSiblings(editor, draft.fields),
      blueprintIds: linkTargetIds,
      // A new group gets its properties after it's added, so don't require them yet
      checkChildren: editor.mode === 'edit',
    })
  }

  function applyEditor() {
    if (Object.keys(editorErrors).length > 0) {
      setEditor({ ...editor, showErrors: true })
      return
    }
    if (editor.mode === 'add') {
      setFields(addField(draft.fields, editor.parentUid, editor.field))
    } else {
      setFields(replaceField(draft.fields, editor.field.uid, editor.field))
    }
    setEditor(null)
  }

  // ---------- Saving, discarding, deleting, exporting ----------

  function handleSave() {
    setShowAllErrors(true)
    if (problemCount > 0) {
      toast.show({ status: 'error', message: `Fix ${plural(problemCount, 'problem')} before saving` })
      return
    }

    // The version goes up by one every time a changed blueprint is saved
    let version = 1
    if (baseline) {
      version = baseline.version
      if (isDirty) {
        version++
      }
    }
    const saved = { ...definition, version: version }
    saveBlueprint(saved, baseline?.id)

    // Assets and dialogues follow their blueprint when its ID changes
    if (baseline && baseline.id !== saved.id) {
      moveAssetsToBlueprint(baseline.id, saved.id)
      retargetDialogueBlueprint(baseline.id, saved.id)
    }

    setBaseline(saved)
    setDraft({ ...draft, version: saved.version })
    setShowAllErrors(false)
    setMetaTouched({})
    toast.show({ status: 'success', message: 'Blueprint saved' })

    if (saved.id !== blueprintId) {
      // New blueprint, or its ID changed: move to its new address
      allowLeaving()
      navigate(`/blueprints/${saved.id}`, { replace: true })
    }
  }

  function handleDiscard() {
    setDraft(startingDraft(baseline, importedDefinition))
    setIdTouched(Boolean(baseline) || importedIdIsFixed)
    setShowAllErrors(false)
    setMetaTouched({})
  }

  function handleDelete() {
    setConfirmDelete(false)
    allowLeaving()
    deleteBlueprint(baseline.id)
    deleteAssetsOfBlueprint(baseline.id)
    toast.show({ status: 'success', message: `Blueprint "${baseline.name}" deleted` })
    navigate('/blueprints', { replace: true })
  }

  function handleExport() {
    if (problemCount > 0) {
      setShowAllErrors(true)
      toast.show({ status: 'error', message: `Fix ${plural(problemCount, 'problem')} before exporting` })
      return
    }
    downloadJson(`${definition.id}.blueprint.json`, definition)
    toast.show({ status: 'success', message: 'Blueprint file downloaded' })
  }

  function handleDuplicate() {
    const existingIds = []
    for (const blueprint of blueprints) {
      existingIds.push(blueprint.id)
    }
    navigate('/blueprints/new', { state: duplicateBlueprintState(baseline, existingIds) })
  }

  // ---------- Preview ----------

  // Only show errors for values the user has changed in the preview
  const previewErrors = onlyTouchedErrors(validateValues(draft.fields, sampleValues), touchedPaths)

  function changeSampleValues(nextValues, changedPath) {
    setSampleValues(nextValues)
    if (!touchedPaths.includes(changedPath)) {
      setTouchedPaths([...touchedPaths, changedPath])
    }
  }

  function resetSampleValues() {
    setSampleValues({})
    setTouchedPaths([])
  }

  let preview
  if (previewTab === 'file') {
    preview = (
      <>
        <p className="small muted">The file programmers load into the game engine. It updates as you edit.</p>
        <JsonPreview value={definition} alwaysVisible />
      </>
    )
  } else if (draft.fields.length === 0) {
    preview = <EmptyState message="Add a property to see the asset form." />
  } else {
    preview = (
      <>
        <div className="row between small muted">
          <p>The form teammates fill in for each asset. Try it out; nothing here is saved.</p>
          <Button variant="ghost" icon={RotateCcw} onClick={resetSampleValues}>
            Reset
          </Button>
        </div>
        <FormRenderer fields={draft.fields} values={sampleValues} onChange={changeSampleValues} errors={previewErrors} />
      </>
    )
  }

  // ---------- Display ----------

  let pageName = 'New blueprint'
  if (draft.name) {
    pageName = draft.name
  } else if (baseline?.name) {
    pageName = baseline.name
  }

  let paneTitle = 'New blueprint'
  let savedBlueprintActions = null
  if (baseline) {
    paneTitle = 'Blueprint'
    savedBlueprintActions = (
      <>
        <Button
          variant="ghost"
          icon={LayoutList}
          title="View assets"
          onClick={() => navigate(`/blueprints/${baseline.id}/assets`)}
        />
        <Button variant="ghost" icon={Copy} title="Duplicate blueprint" onClick={handleDuplicate} />
      </>
    )
  }

  let propertyList = (
    <EmptyState message="No properties yet. Properties are the pieces of data every asset of this blueprint has.">
      <Button icon={Plus} onClick={addTopLevelProperty}>
        Add property
      </Button>
    </EmptyState>
  )
  if (draft.fields.length > 0) {
    propertyList = (
      <PropertyList
        fields={draft.fields}
        errors={errors}
        blueprintNames={blueprintNames}
        onEdit={openEditProperty}
        onAdd={openAddProperty}
        onMove={moveProperty}
        onDuplicate={duplicateProperty}
        onRemove={removeProperty}
      />
    )
  }

  // A new blueprint that started from a file or a copy says so at the top
  const showImportNotice = Boolean(importedDefinition) && !baseline

  let fieldsError = null
  if (showAllErrors) {
    fieldsError = errors.blueprint?.fields
  }

  return (
    <AppShell
      actions={<TopBarActions noun="blueprint" newPath="/blueprints/new" importFile={parseBlueprintFile} />}
      crumbs={[{ label: 'Blueprints', to: '/blueprints' }, { label: pageName }]}
      status={statusText(showAllErrors, problemCount, isDirty, draft.version)}
    >
      <div className="panes" style={{ '--panes': 'minmax(0, 1fr) minmax(360px, 0.85fr)' }}>
        <Section
          title={paneTitle}
          actions={
            <>
              {savedBlueprintActions}
              <Button variant="ghost" icon={Download} title="Download blueprint file" onClick={handleExport} />
            </>
          }
          footer={
            <>
              <Button variant="primary" icon={Save} onClick={handleSave}>
                Save blueprint
              </Button>
              <Button icon={RotateCcw} disabled={!isDirty} onClick={handleDiscard}>
                Discard changes
              </Button>
              {baseline && (
                <Button variant="danger" icon={Trash2} className="push-right" onClick={() => setConfirmDelete(true)}>
                  Delete
                </Button>
              )}
            </>
          }
        >
          <div className="stack">
            {showImportNotice && (
              <ImportNotice isDuplicate={isDuplicate} originName={originName} extra=" Its assets aren't copied." />
            )}

            <div className="subhead">
              <h2>General</h2>
            </div>
            <PropertyRow
              label="Name"
              required
              error={metaError('name')}
              help="What this kind of asset is called, e.g. Item or Quest."
            >
              <TextInput placeholder="e.g. Item" value={draft.name} onChange={(event) => changeName(event.target.value)} />
            </PropertyRow>
            <PropertyRow
              label="ID"
              required
              error={metaError('id')}
              help="Used in exported files and links. It follows the name until you change it."
            >
              <TextInput placeholder="item" value={draft.id} onChange={(event) => changeId(event.target.value)} />
            </PropertyRow>
            <PropertyRow label="Description" help="Optional. Tells teammates what it's for.">
              <TextArea value={draft.description} onChange={(event) => changeDescription(event.target.value)} />
            </PropertyRow>

            <div className="subhead">
              <h2>
                Properties <span className="subtle">{countProperties(draft.fields)}</span>
              </h2>
              <Button variant="ghost" icon={Plus} onClick={addTopLevelProperty}>
                Add property
              </Button>
            </div>
            {fieldsError && <p className="field-error">{fieldsError}</p>}
            {propertyList}
          </div>
        </Section>

        <Section
          title="Preview"
          actions={<SegmentedControl options={PREVIEW_TABS} value={previewTab} onChange={setPreviewTab} />}
        >
          {preview}
        </Section>
      </div>

      {editor && (
        <PropertyPanel
          editor={editor}
          setEditor={setEditor}
          draftFields={draft.fields}
          errors={editorErrors}
          blueprintOptions={blueprintOptions}
          onApply={applyEditor}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete blueprint?"
          message={deleteMessage(baseline, blueprints, assets)}
          confirmLabel="Delete blueprint"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
        />
      )}

      <UnsavedChangesDialog blocker={blocker} name={draft.name || 'this blueprint'} />
    </AppShell>
  )
}

/** The side panel for adding or editing one property. */
function PropertyPanel({ editor, setEditor, draftFields, errors, blueprintOptions, onApply }) {
  let title = 'Edit property'
  let applyLabel = 'Apply changes'
  if (editor.mode === 'add') {
    applyLabel = 'Add property'
    title = 'New property'
    // Adding inside a group: say which one
    if (editor.parentUid) {
      const parent = findField(draftFields, editor.parentUid)?.field
      if (parent) {
        title = `New property in ${parent.label || 'group'}`
      }
    }
  }

  function close() {
    setEditor(null)
  }

  return (
    <SidePanel
      title={title}
      onClose={close}
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" onClick={onApply}>
            {applyLabel}
          </Button>
        </>
      }
    >
      <PropertyEditor editor={editor} setEditor={setEditor} errors={errors} blueprintOptions={blueprintOptions} />
    </SidePanel>
  )
}

// ---------- Helpers ----------

// The saved blueprint for this URL, or null for a new one (or when the URL's blueprint doesn't exist)
function findSavedBlueprint(blueprints, blueprintId) {
  if (!blueprintId) {
    return null
  }
  const found = blueprints.find((blueprint) => blueprint.id === blueprintId)
  return found ?? null
}

// The draft the builder starts with (and goes back to on Discard)
function startingDraft(baseline, importedDefinition) {
  if (baseline) {
    return toDraft(baseline)
  }
  if (importedDefinition) {
    return toDraft(importedDefinition)
  }
  return toDraft(EMPTY_BLUEPRINT)
}

// Every blueprint a link can point to, as { id, name }: the others, plus this one if it has an ID yet
function findLinkTargets(blueprints, baseline, draft) {
  const targets = []
  for (const blueprint of blueprints) {
    if (blueprint.id !== baseline?.id && blueprint.id) {
      targets.push(blueprint)
    }
  }
  if (draft.id) {
    targets.push({ id: draft.id, name: draft.name })
  }
  return targets
}

// The properties next to the one in the side panel (its ID must be different from theirs)
function editorSiblings(editor, draftFields) {
  if (editor.mode === 'edit') {
    return findField(draftFields, editor.field.uid)?.siblings ?? []
  }
  if (editor.parentUid) {
    // Adding inside a group: the group's own properties
    return findField(draftFields, editor.parentUid)?.field.fields ?? []
  }
  return draftFields
}

// The delete confirmation, mentioning its assets and any blueprints that link to it
function deleteMessage(baseline, blueprints, assets) {
  let assetCount = 0
  for (const asset of assets) {
    if (asset.schemaId === baseline.id) {
      assetCount++
    }
  }

  const linkingNames = []
  for (const blueprint of blueprints) {
    if (blueprint.id !== baseline.id && usesBlueprint(blueprint.fields, baseline.id)) {
      linkingNames.push(blueprint.name)
    }
  }

  let message = `Delete blueprint "${baseline.name}"`
  if (assetCount > 0) {
    message = `${message} and its ${plural(assetCount, 'asset')}`
  }
  message = `${message}? This can't be undone.`

  if (linkingNames.length > 0) {
    let verb = 'link'
    if (linkingNames.length === 1) {
      verb = 'links'
    }
    message = `${message} ${linkingNames.join(', ')} ${verb} to it and will need updating.`
  }
  return message
}

// The status bar text
function statusText(showAllErrors, problemCount, isDirty, version) {
  if (showAllErrors && problemCount > 0) {
    return plural(problemCount, 'problem')
  }
  if (isDirty) {
    return 'Unsaved changes'
  }
  return `Saved · version ${version}`
}

export default BlueprintBuilderPage
