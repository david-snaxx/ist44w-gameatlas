import { Copy, Download, Eye, Pencil, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import AppShell from '../../components/AppShell/AppShell.jsx'
import Button from '../../components/Button/Button.jsx'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog.jsx'
import EmptyState from '../../components/EmptyState/EmptyState.jsx'
import FormRenderer from '../../components/form/FormRenderer.jsx'
import PropertyRow from '../../components/form/PropertyRow.jsx'
import TextInput from '../../components/form/TextInput.jsx'
import ValidationSummary from '../../components/form/ValidationSummary.jsx'
import JsonPreview from '../../components/JsonPreview/JsonPreview.jsx'
import Notice, { ImportNotice } from '../../components/Notice/Notice.jsx'
import Section from '../../components/Section/Section.jsx'
import UnsavedChangesDialog from '../../components/UnsavedChangesDialog/UnsavedChangesDialog.jsx'
import TopBarActions from '../../components/TopBarActions/TopBarActions.jsx'
import Table from '../../components/Table/Table.jsx'
import { useToast } from '../../components/Toast/useToast.js'
import {
  assetLabel,
  duplicateAssetState,
  labelFieldKey,
  labelForPath,
  linksTo,
  referenceKeysFor,
  replaceReferences,
  toData,
  toExport,
  toFormValues,
  parseAssetFile,
} from '../../data/assetData.js'
import { deleteAsset, saveAssets } from '../../data/assetStore.js'
import { renameAssetInDialogue } from '../../data/dialogueGraph.js'
import { saveDialogues } from '../../data/dialogueStore.js'
import { useAssets } from '../../data/useAssets.js'
import { useDialogues } from '../../data/useDialogues.js'
import { toSnakeCase } from '../../schema/blueprintDraft.js'
import { useBlueprints } from '../../schema/useBlueprints.js'
import { onlyTouchedErrors, validateAssetKey, validateValues } from '../../schema/validation.js'
import { downloadJson } from '../../utils/downloadJson.js'
import { formatDateTime } from '../../utils/formatDate.js'
import { plural } from '../../utils/plural.js'
import { useUnsavedChanges } from '../../utils/useUnsavedChanges.js'
import MissingAsset from './MissingAsset.jsx'

const LIST_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'key', label: 'ID' },
]

// The id of the ID input, so the problem list can jump to it
const KEY_INPUT_ID = 'asset-meta-id'

/**
 * Route component for /blueprints/:blueprintId/assets/new and .../assets/:assetKey/edit.
 * The `key` gives every asset (and every "new asset" visit) a fresh editor with fresh state.
 */
function AssetEditorPage() {
  const { blueprintId, assetKey } = useParams()
  const location = useLocation()

  // location.state is what the page that sent us here passed along (an import or a duplicate), if anything
  const state = location.state ?? {}

  let editorKey = `${blueprintId}/new-${location.key}`
  if (assetKey) {
    editorKey = `${blueprintId}/${assetKey}`
  }

  return (
    <AssetEditor
      key={editorKey}
      blueprintId={blueprintId}
      assetKey={assetKey}
      imported={state.imported}
      origin={state.origin}
      originName={state.originName}
      followName={state.followName}
    />
  )
}

/**
 * imported: { key, data } to start a new asset from (an imported file or a duplicate)
 * origin: 'file' (the default) | 'duplicate'; originName: the name of the asset that was duplicated
 * followName: for duplicates, whether the ID should keep following the name
 */
function AssetEditor({ blueprintId, assetKey, imported, origin, originName, followName }) {
  const isDuplicate = origin === 'duplicate'
  // An imported file keeps its ID; a duplicate's ID follows its name (if it has one)
  const importedKeyIsFixed = Boolean(imported?.key) && !(isDuplicate && followName)
  const blueprints = useBlueprints()
  const assets = useAssets()
  const dialogues = useDialogues()
  const navigate = useNavigate()
  const toast = useToast()

  const blueprint = blueprints.find((candidate) => candidate.id === blueprintId) ?? null
  const fields = blueprint?.fields ?? []

  // The last saved asset (null for a new one). `useState(() => …)` only runs the function the first time.
  const [baseline, setBaseline] = useState(() => findSavedAsset(assets, blueprintId, assetKey))
  const [key, setKey] = useState(() => startingKey(baseline, imported))
  const [values, setValues] = useState(() => startingValues(fields, baseline, imported))
  // keyTouched: the user chose the ID, so stop filling it in from the name. keyShowErrors: show the ID's error.
  const [keyTouched, setKeyTouched] = useState(Boolean(baseline) || importedKeyIsFixed)
  const [keyShowErrors, setKeyShowErrors] = useState(false)
  const [touchedPaths, setTouchedPaths] = useState([])
  const [submitted, setSubmitted] = useState(Boolean(imported) && !isDuplicate)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // ---------- Derived data ----------

  const blueprintAssets = assets.filter((asset) => asset.schemaId === blueprintId)
  let labelKey = null
  if (blueprint) {
    labelKey = labelFieldKey(blueprint)
  }
  const labelField = fields.find((field) => field.key === labelKey)

  const data = toData(fields, values)
  // Compare against the saved data run through the same conversion, so formatting differences don't count
  const savedData = toData(fields, toFormValues(fields, baseline?.data))
  let keyChanged = key !== ''
  if (baseline) {
    keyChanged = key !== baseline.key
  }
  const isDirty = keyChanged || JSON.stringify(data) !== JSON.stringify(savedData)

  // What links can point to: every blueprint's assets
  const referenceKeys = referenceKeysFor(blueprints, assets)
  const referenceOptions = buildReferenceOptions(blueprints, assets)

  // ---------- Validation ----------

  const valueErrors = validateValues(fields, values, '', referenceKeys)
  const keyError = validateAssetKey(key, blueprintAssets, baseline?.id)
  let problemCount = Object.keys(valueErrors).length
  if (keyError) {
    problemCount++
  }

  // Errors show for inputs the user has changed, or for everything after trying to save
  let visibleValueErrors = valueErrors
  if (!submitted) {
    visibleValueErrors = onlyTouchedErrors(valueErrors, touchedPaths)
  }
  let visibleKeyError = null
  if (submitted || keyShowErrors) {
    visibleKeyError = keyError
  }
  const problems = buildProblemList(visibleKeyError, visibleValueErrors, fields)

  // ---------- Leaving with unsaved changes ----------

  // (A hook, so it has to run on every render, before the "not found" return below)
  const { blocker, allowLeaving } = useUnsavedChanges(isDirty)

  // ---------- Not found ----------

  if (!blueprint || (assetKey && !baseline)) {
    return <MissingAsset blueprint={blueprint} blueprintId={blueprintId} assetKey={assetKey} />
  }

  // ---------- Editing ----------

  function changeValues(nextValues, changedPath) {
    setValues(nextValues)
    if (!touchedPaths.includes(changedPath)) {
      setTouchedPaths([...touchedPaths, changedPath])
    }
    // A new asset's ID follows its name until the user edits the ID
    if (!keyTouched && changedPath === labelKey) {
      const name = String(nextValues[labelKey] ?? '')
      setKey(toSnakeCase(name))
      setKeyShowErrors(true)
    }
  }

  function changeKey(nextKey) {
    setKey(nextKey)
    setKeyTouched(true)
    setKeyShowErrors(true)
  }

  // ---------- Saving, discarding, deleting, downloading ----------

  function handleSave() {
    setSubmitted(true)
    if (problemCount > 0) {
      toast.show({ status: 'error', message: `Fix ${plural(problemCount, 'problem')} before saving` })
      return
    }

    const now = new Date().toISOString()
    const saved = {
      id: baseline?.id ?? crypto.randomUUID(),
      key: key,
      schemaId: blueprint.id,
      schemaVersion: blueprint.version,
      data: data,
      createdAt: baseline?.createdAt ?? now,
      updatedAt: now,
    }

    // If the ID changed, keep links in other assets and in dialogues pointing at this asset
    const changedAssets = [saved]
    let changedDialogues = []
    if (baseline && baseline.key !== key) {
      const relinked = relinkAssets(assets, blueprints, saved.id, blueprint.id, baseline.key, key)
      for (const other of relinked) {
        changedAssets.push(other)
      }
      changedDialogues = relinkDialogues(dialogues, blueprint.id, baseline.key, key)
    }

    saveAssets(changedAssets)
    if (changedDialogues.length > 0) {
      saveDialogues(changedDialogues)
    }
    setBaseline(saved)
    setSubmitted(false)
    setTouchedPaths([])
    setKeyTouched(true)
    setKeyShowErrors(false)
    toast.show({ status: 'success', message: savedMessage(changedAssets.length - 1, changedDialogues.length) })

    if (key !== assetKey) {
      // New asset, or its ID changed: move to its new address
      allowLeaving()
      navigate(`/blueprints/${blueprint.id}/assets/${key}/edit`, { replace: true })
    }
  }

  function handleDiscard() {
    setKey(startingKey(baseline, imported))
    setValues(startingValues(fields, baseline, imported))
    setKeyTouched(Boolean(baseline) || importedKeyIsFixed)
    setKeyShowErrors(false)
    setTouchedPaths([])
    setSubmitted(Boolean(imported) && !baseline && !isDuplicate)
  }

  function handleDelete() {
    setConfirmDelete(false)
    allowLeaving()
    deleteAsset(baseline.id)
    toast.show({ status: 'success', message: `Asset "${assetLabel(baseline, blueprint)}" deleted` })
    navigate(`/blueprints/${blueprint.id}/assets`, { replace: true })
  }

  const exportShape = toExport({ key: key, schemaId: blueprint.id, schemaVersion: blueprint.version, data: data })

  function handleDownload() {
    if (problemCount > 0) {
      setSubmitted(true)
      toast.show({ status: 'error', message: `Fix ${plural(problemCount, 'problem')} before downloading` })
      return
    }
    downloadJson(`${key}.json`, exportShape)
    toast.show({ status: 'success', message: 'Asset file downloaded' })
  }

  function handleDuplicate() {
    const state = duplicateAssetState(baseline, blueprint, blueprintAssets)
    navigate(`/blueprints/${blueprint.id}/assets/new`, { state: state })
  }

  function openAsset(id) {
    const asset = blueprintAssets.find((candidate) => candidate.id === id)
    if (asset.key !== assetKey) {
      navigate(`/blueprints/${blueprint.id}/assets/${asset.key}/edit`)
    }
  }

  // ---------- Display ----------

  // The page title: the name being typed, else the ID, else "New asset"
  const currentName = String(values[labelKey] ?? '').trim()
  let title = 'New asset'
  if (currentName) {
    title = currentName
  } else if (key) {
    title = key
  }

  const crumbs = [
    { label: 'Blueprints', to: '/blueprints' },
    { label: blueprint.name, to: `/blueprints/${blueprint.id}/assets` },
  ]
  if (baseline) {
    crumbs.push({ label: title, to: `/blueprints/${blueprint.id}/assets/${baseline.key}` })
    crumbs.push({ label: 'Edit' })
  } else {
    crumbs.push({ label: title })
  }

  const isOutdated = baseline !== null && baseline.schemaVersion < blueprint.version
  // A new asset that started from a file or a copy says so at the top
  const showImportNotice = Boolean(imported) && !baseline

  let formPaneTitle = 'New asset'
  let formPaneActions = null
  if (baseline) {
    formPaneTitle = 'Asset'
    formPaneActions = (
      <>
        <Button variant="ghost" icon={Copy} title="Duplicate asset" onClick={handleDuplicate} />
        <Button
          variant="ghost"
          icon={Eye}
          title="View asset"
          onClick={() => navigate(`/blueprints/${blueprint.id}/assets/${baseline.key}`)}
        />
      </>
    )
  }

  let keyHelp = 'How the game and other assets refer to this one.'
  if (labelField) {
    keyHelp = `How the game and other assets refer to this one. It follows ${labelField.label} until you change it.`
  }

  let form = (
    <FormRenderer
      fields={fields}
      values={values}
      onChange={changeValues}
      errors={visibleValueErrors}
      referenceOptions={referenceOptions}
    />
  )
  if (fields.length === 0) {
    form = (
      <EmptyState message={`The ${blueprint.name} blueprint has no properties yet.`}>
        <Button icon={Pencil} onClick={() => navigate(`/blueprints/${blueprint.id}`)}>
          Edit blueprint
        </Button>
      </EmptyState>
    )
  }

  return (
    <AppShell
      actions={
        <TopBarActions
          noun="asset"
          newPath={`/blueprints/${blueprint.id}/assets/new`}
          importFile={(text) => parseAssetFile(text, blueprint)}
        />
      }
      crumbs={crumbs}
      status={statusText(submitted, problemCount, isDirty, baseline)}
    >
      <div className="panes" style={{ '--panes': '260px minmax(0, 1fr) 340px' }}>
        <Section
          title={blueprint.name}
          actions={
            <Button
              variant="ghost"
              icon={Plus}
              title="New asset"
              onClick={() => navigate(`/blueprints/${blueprint.id}/assets/new`)}
            />
          }
        >
          <AssetList
            blueprint={blueprint}
            blueprintAssets={blueprintAssets}
            selectedId={baseline?.id}
            onSelect={openAsset}
          />
        </Section>

        <Section
          title={formPaneTitle}
          actions={formPaneActions}
          footer={
            <>
              <Button variant="primary" icon={Save} onClick={handleSave}>
                Save asset
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
            {isOutdated && (
              <Notice tone="warning">
                Saved with version {baseline.schemaVersion} of the {blueprint.name} blueprint (now version{' '}
                {blueprint.version}). Saving updates it; values of removed properties are dropped.
              </Notice>
            )}
            {showImportNotice && <ImportNotice isDuplicate={isDuplicate} originName={originName} />}

            <PropertyRow label="ID" required error={visibleKeyError} help={keyHelp}>
              <TextInput
                id={KEY_INPUT_ID}
                placeholder="sword_of_fire"
                value={key}
                onChange={(event) => changeKey(event.target.value)}
              />
            </PropertyRow>

            <hr />

            {form}
          </div>
        </Section>

        <Section
          title="Preview"
          actions={<Button variant="ghost" icon={Download} title="Download asset file" onClick={handleDownload} />}
        >
          <div className="stack">
            <ValidationSummary problems={problems} hiddenCount={problemCount - problems.length} />
            <JsonPreview value={exportShape} />
          </div>
        </Section>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete asset?"
          message={deleteMessage(baseline, blueprint, assets, blueprints)}
          confirmLabel="Delete asset"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
        />
      )}

      <UnsavedChangesDialog blocker={blocker} name={title} />
    </AppShell>
  )
}

/** The left pane: the blueprint's saved assets, with the one being edited highlighted. */
function AssetList({ blueprint, blueprintAssets, selectedId, onSelect }) {
  if (blueprintAssets.length === 0) {
    return <EmptyState message="No saved assets yet." />
  }

  const rows = []
  for (const asset of blueprintAssets) {
    rows.push({ id: asset.id, name: assetLabel(asset, blueprint), key: asset.key })
  }
  return <Table columns={LIST_COLUMNS} rows={rows} selectedId={selectedId} onSelect={onSelect} />
}

// ---------- Helpers ----------

// The saved asset being edited, or null for a new asset (or when the URL's asset doesn't exist)
function findSavedAsset(assets, blueprintId, assetKey) {
  if (!assetKey) {
    return null
  }
  const found = assets.find((asset) => asset.schemaId === blueprintId && asset.key === assetKey)
  return found ?? null
}

// The ID the editor starts with (and goes back to on Discard)
function startingKey(baseline, imported) {
  if (baseline) {
    return baseline.key
  }
  return imported?.key ?? ''
}

// The form values the editor starts with (and goes back to on Discard)
function startingValues(fields, baseline, imported) {
  if (baseline) {
    return toFormValues(fields, baseline.data)
  }
  return toFormValues(fields, imported?.data)
}

// For link dropdowns: { [blueprintId]: [{ value: assetKey, label: assetName }] }
function buildReferenceOptions(blueprints, assets) {
  const options = {}
  for (const blueprint of blueprints) {
    const blueprintOptions = []
    for (const asset of assets) {
      if (asset.schemaId === blueprint.id) {
        blueprintOptions.push({ value: asset.key, label: assetLabel(asset, blueprint) })
      }
    }
    options[blueprint.id] = blueprintOptions
  }
  return options
}

// The list the ValidationSummary shows: the ID's problem first, then one per property
function buildProblemList(keyError, valueErrors, fields) {
  const problems = []
  if (keyError) {
    problems.push({ id: KEY_INPUT_ID, label: 'ID', message: keyError })
  }
  for (const path of Object.keys(valueErrors)) {
    problems.push({ id: `field-${path}`, label: labelForPath(fields, path), message: valueErrors[path] })
  }
  return problems
}

// Other assets whose links pointed at the old key, with those links changed to the new key
function relinkAssets(assets, blueprints, savedId, blueprintId, oldKey, newKey) {
  const changed = []
  for (const other of assets) {
    if (other.id === savedId) {
      continue
    }
    const otherBlueprint = blueprints.find((candidate) => candidate.id === other.schemaId)
    if (!otherBlueprint) {
      continue
    }
    const nextData = replaceReferences(otherBlueprint.fields, other.data, blueprintId, oldKey, newKey)
    if (JSON.stringify(nextData) !== JSON.stringify(other.data)) {
      changed.push({ ...other, data: nextData })
    }
  }
  return changed
}

// Dialogues whose speakers or items pointed at the old key, updated to the new key
function relinkDialogues(dialogues, blueprintId, oldKey, newKey) {
  const changed = []
  for (const dialogue of dialogues) {
    const updated = renameAssetInDialogue(dialogue, blueprintId, oldKey, newKey)
    if (updated) {
      changed.push(updated)
    }
  }
  return changed
}

// "Asset saved", plus which links were updated if the ID changed
function savedMessage(otherAssetCount, dialogueCount) {
  const updated = []
  if (otherAssetCount > 0) {
    updated.push(plural(otherAssetCount, 'other asset'))
  }
  if (dialogueCount > 0) {
    updated.push(plural(dialogueCount, 'dialogue'))
  }

  if (updated.length === 0) {
    return 'Asset saved'
  }
  return `Asset saved. Links in ${updated.join(' and ')} were updated.`
}

// The delete confirmation, warning how many other assets link to this one
function deleteMessage(baseline, blueprint, assets, blueprints) {
  let linkingCount = 0
  for (const other of assets) {
    if (other.id === baseline.id) {
      continue
    }
    const otherBlueprint = blueprints.find((candidate) => candidate.id === other.schemaId)
    if (otherBlueprint && linksTo(otherBlueprint.fields, other.data, blueprint.id, baseline.key)) {
      linkingCount++
    }
  }

  const message = `Delete asset "${assetLabel(baseline, blueprint)}"? This can't be undone.`
  if (linkingCount === 0) {
    return message
  }

  let verb = 'link'
  if (linkingCount === 1) {
    verb = 'links'
  }
  return `${message} ${plural(linkingCount, 'other asset')} ${verb} to it and will show a problem.`
}

// The status bar text
function statusText(submitted, problemCount, isDirty, baseline) {
  if (submitted && problemCount > 0) {
    return plural(problemCount, 'problem')
  }
  if (isDirty) {
    return 'Unsaved changes'
  }
  if (baseline) {
    return `Saved ${formatDateTime(baseline.updatedAt)}`
  }
  return 'Not saved yet'
}

export default AssetEditorPage
