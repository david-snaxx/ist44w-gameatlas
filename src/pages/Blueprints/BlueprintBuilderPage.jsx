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
import { countProblems, validateBlueprint, validateFieldDefinition, validateValues } from '../../schema/validation.js'
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
  return (
    <BlueprintBuilder
      key={blueprintId ?? `new-${location.key}`}
      blueprintId={blueprintId}
      importedDefinition={location.state?.imported}
      origin={location.state?.origin}
      originName={location.state?.originName}
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

  // The last saved definition (null for a blueprint that hasn't been saved yet)
  const [baseline, setBaseline] = useState(() =>
    blueprintId ? (blueprints.find((blueprint) => blueprint.id === blueprintId) ?? null) : null,
  )
  // The blueprint being edited (see schema/blueprintDraft.js for draft vs. definition)
  const [draft, setDraft] = useState(() => toDraft(baseline ?? importedDefinition ?? EMPTY_BLUEPRINT))
  const [idTouched, setIdTouched] = useState(Boolean(baseline) || importedIdIsFixed)
  const [metaTouched, setMetaTouched] = useState({})
  const [showAllErrors, setShowAllErrors] = useState(Boolean(importedDefinition) && !isDuplicate)
  // The side panel: null when closed, otherwise { mode, parentUid, field, keyTouched, touched, showErrors }
  const [editor, setEditor] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [previewTab, setPreviewTab] = useState('form')
  const [sampleValues, setSampleValues] = useState({})
  const [touchedPaths, setTouchedPaths] = useState([])
  // Set just before navigating away on purpose (after saving or deleting), so the unsaved-changes guard lets it through

  // ---------- Derived data (recalculated on every render) ----------

  const definition = toDefinition(draft)
  const definitionJson = JSON.stringify(definition)
  const baselineJson = baseline ? JSON.stringify(toDefinition(toDraft(baseline))) : null
  const isDirty = baseline ? definitionJson !== baselineJson : draft.name !== '' || draft.fields.length > 0

  const otherBlueprints = blueprints.filter((blueprint) => blueprint.id !== baseline?.id)
  const otherIds = otherBlueprints.map((blueprint) => blueprint.id)
  const linkTargets = [...otherBlueprints, { id: draft.id, name: draft.name }].filter((blueprint) => blueprint.id)
  const blueprintOptions = linkTargets.map((blueprint) => ({
    value: blueprint.id,
    label: blueprint.name || blueprint.id,
  }))
  const blueprintNames = Object.fromEntries(blueprintOptions.map((option) => [option.value, option.label]))

  const errors = validateBlueprint(draft, { otherIds, blueprintIds: linkTargets.map((blueprint) => blueprint.id) })
  const problemCount = countProblems(errors)

  // ---------- Leaving with unsaved changes ----------

  // In-app navigation (sidebar, breadcrumbs, back button) asks for confirmation
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

  const metaError = (name) => (showAllErrors || metaTouched[name] ? errors.blueprint?.[name] : undefined)

  function changeName(name) {
    // The ID follows the name until the user edits the ID themselves
    setDraft((current) => ({ ...current, name, ...(idTouched ? {} : { id: toSnakeCase(name) }) }))
    setMetaTouched((current) => ({ ...current, name: true, ...(idTouched ? {} : { id: true }) }))
  }

  function changeId(id) {
    setDraft((current) => ({ ...current, id }))
    setIdTouched(true)
    setMetaTouched((current) => ({ ...current, id: true }))
  }

  // ---------- Properties ----------

  const updateFields = (transform) => setDraft((current) => ({ ...current, fields: transform(current.fields) }))

  function openAddProperty(parentUid = null) {
    setEditor({ mode: 'add', parentUid, field: createField('string'), keyTouched: false, touched: {}, showErrors: false })
  }

  function openEditProperty(uid) {
    const found = findField(draft.fields, uid)
    if (!found) return
    setEditor({
      mode: 'edit',
      parentUid: null,
      field: found.field,
      keyTouched: true,
      touched: {},
      showErrors: Boolean(errors[uid]),
    })
  }

  function removeProperty(uid) {
    const previousFields = draft.fields
    const { field } = findField(previousFields, uid)
    updateFields((fields) => removeField(fields, uid))
    toast.show({
      status: 'success',
      message: `Property "${field.label || 'Untitled property'}" removed`,
      action: { label: 'Undo', onClick: () => updateFields(() => previousFields) },
    })
  }

  function getEditorErrors() {
    if (!editor) return {}
    const siblings =
      editor.mode === 'add'
        ? editor.parentUid
          ? (findField(draft.fields, editor.parentUid)?.field.fields ?? [])
          : draft.fields
        : (findField(draft.fields, editor.field.uid)?.siblings ?? [])
    return validateFieldDefinition(editor.field, {
      siblings,
      blueprintIds: linkTargets.map((blueprint) => blueprint.id),
      // A new group gets its properties after it's added, so don't require them yet
      checkChildren: editor.mode === 'edit',
    })
  }
  const editorErrors = getEditorErrors()

  function applyEditor() {
    if (Object.keys(editorErrors).length > 0) {
      setEditor((current) => ({ ...current, showErrors: true }))
      return
    }
    if (editor.mode === 'add') updateFields((fields) => addField(fields, editor.parentUid, editor.field))
    else updateFields((fields) => replaceField(fields, editor.field.uid, editor.field))
    setEditor(null)
  }

  const editorParent = editor?.parentUid ? findField(draft.fields, editor.parentUid)?.field : null
  const editorTitle = !editor
    ? ''
    : editor.mode === 'edit'
      ? 'Edit property'
      : editorParent
        ? `New property in ${editorParent.label || 'group'}`
        : 'New property'

  // ---------- Saving, discarding, deleting, exporting ----------

  function handleSave() {
    setShowAllErrors(true)
    if (problemCount > 0) {
      toast.show({ status: 'error', message: `Fix ${plural(problemCount, 'problem')} before saving` })
      return
    }
    const saved = { ...definition, version: baseline ? baseline.version + (isDirty ? 1 : 0) : 1 }
    saveBlueprint(saved, baseline?.id)
    // Assets follow their blueprint when its ID changes
    if (baseline && baseline.id !== saved.id) {
      moveAssetsToBlueprint(baseline.id, saved.id)
      retargetDialogueBlueprint(baseline.id, saved.id)
    }
    setBaseline(saved)
    setDraft((current) => ({ ...current, version: saved.version }))
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
    setDraft(toDraft(baseline ?? importedDefinition ?? EMPTY_BLUEPRINT))
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

  const linkedFrom = baseline
    ? blueprints.filter((blueprint) => blueprint.id !== baseline.id && usesBlueprint(blueprint.fields, baseline.id))
    : []
  const assetCount = baseline ? assets.filter((asset) => asset.schemaId === baseline.id).length : 0
  const deleteMessage =
    `Delete blueprint "${baseline?.name}"${assetCount > 0 ? ` and its ${plural(assetCount, 'asset')}` : ''}? This can't be undone.` +
    (linkedFrom.length > 0
      ? ` ${linkedFrom.map((blueprint) => blueprint.name).join(', ')} ${linkedFrom.length === 1 ? 'links' : 'link'} to it and will need updating.`
      : '')

  // ---------- Preview ----------

  const previewErrors = validateValues(draft.fields, sampleValues)
  // Only show errors for values the user has changed in the preview
  const visiblePreviewErrors = Object.fromEntries(
    Object.entries(previewErrors).filter(([path]) =>
      touchedPaths.some((touched) => path === touched || path.startsWith(`${touched}.`)),
    ),
  )

  function changeSampleValues(nextValues, changedPath) {
    setSampleValues(nextValues)
    setTouchedPaths((current) => (current.includes(changedPath) ? current : [...current, changedPath]))
  }

  // ---------- Status bar ----------

  const status =
    showAllErrors && problemCount > 0
      ? plural(problemCount, 'problem')
      : isDirty
        ? 'Unsaved changes'
        : `Saved · version ${draft.version}`

  return (
    <AppShell
      actions={<TopBarActions noun="blueprint" newPath="/blueprints/new" importFile={parseBlueprintFile} />}
      crumbs={[{ label: 'Blueprints', to: '/blueprints' }, { label: draft.name || baseline?.name || 'New blueprint' }]}
      status={status}
    >
      <div className="panes" style={{ '--panes': 'minmax(0, 1fr) minmax(360px, 0.85fr)' }}>
        <Section
          title={baseline ? 'Blueprint' : 'New blueprint'}
          actions={
            <>
              {baseline && (
                <Button
                  variant="ghost"
                  icon={LayoutList}
                  title="View assets"
                  onClick={() => navigate(`/blueprints/${baseline.id}/assets`)}
                />
              )}
              {baseline && (
                <Button
                  variant="ghost"
                  icon={Copy}
                  title="Duplicate blueprint"
                  onClick={() =>
                    navigate('/blueprints/new', {
                      state: duplicateBlueprintState(baseline, blueprints.map((blueprint) => blueprint.id)),
                    })
                  }
                />
              )}
              <Button
                variant="ghost"
                icon={Download}
                title="Download blueprint file"
                onClick={handleExport}
              />
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
            {importedDefinition && !baseline && (
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
              <TextArea
                value={draft.description}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              />
            </PropertyRow>

            <div className="subhead">
              <h2>
                Properties <span className="subtle">{countProperties(draft.fields)}</span>
              </h2>
              <Button variant="ghost" icon={Plus} onClick={() => openAddProperty()}>
                Add property
              </Button>
            </div>
            {showAllErrors && errors.blueprint?.fields && (
              <p className="field-error">{errors.blueprint.fields}</p>
            )}
            {draft.fields.length > 0 ? (
              <PropertyList
                fields={draft.fields}
                errors={errors}
                blueprintNames={blueprintNames}
                onEdit={openEditProperty}
                onAdd={openAddProperty}
                onMove={(uid, direction) => updateFields((fields) => moveField(fields, uid, direction))}
                onDuplicate={(uid) => updateFields((fields) => duplicateField(fields, uid))}
                onRemove={removeProperty}
              />
            ) : (
              <EmptyState message="No properties yet. Properties are the pieces of data every asset of this blueprint has.">
                <Button icon={Plus} onClick={() => openAddProperty()}>
                  Add property
                </Button>
              </EmptyState>
            )}
          </div>
        </Section>

        <Section
          title="Preview"
          actions={
            <SegmentedControl options={PREVIEW_TABS} value={previewTab} onChange={setPreviewTab} />
          }
        >
          {previewTab === 'form' ? (
            draft.fields.length === 0 ? (
              <EmptyState message="Add a property to see the asset form." />
            ) : (
              <>
                <div className="row between small muted">
                  <p>The form teammates fill in for each asset. Try it out; nothing here is saved.</p>
                  <Button
                    variant="ghost"
                    icon={RotateCcw}
                    onClick={() => {
                      setSampleValues({})
                      setTouchedPaths([])
                    }}
                  >
                    Reset
                  </Button>
                </div>
                <FormRenderer
                  fields={draft.fields}
                  values={sampleValues}
                  onChange={changeSampleValues}
                  errors={visiblePreviewErrors}
                />
              </>
            )
          ) : (
            <>
              <div className="row between small muted">
                <p>The file programmers load into the game engine. It updates as you edit.</p>
              </div>
              <JsonPreview value={definition} alwaysVisible />
            </>
          )}
        </Section>
      </div>

      {editor && (
        <SidePanel
          title={editorTitle}
          onClose={() => setEditor(null)}
          footer={
            <>
              <Button onClick={() => setEditor(null)}>Cancel</Button>
              <Button variant="primary" onClick={applyEditor}>
                {editor.mode === 'add' ? 'Add property' : 'Apply changes'}
              </Button>
            </>
          }
        >
          <PropertyEditor editor={editor} setEditor={setEditor} errors={editorErrors} blueprintOptions={blueprintOptions} />
        </SidePanel>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete blueprint?"
          message={deleteMessage}
          confirmLabel="Delete blueprint"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
        />
      )}

      <UnsavedChangesDialog blocker={blocker} name={draft.name || 'this blueprint'} />
    </AppShell>
  )
}

export default BlueprintBuilderPage
