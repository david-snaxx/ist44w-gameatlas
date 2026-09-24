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
import MissingRecord from '../../components/MissingRecord/MissingRecord.jsx'
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
import { validateAssetKey, validateValues } from '../../schema/validation.js'
import { downloadJson } from '../../utils/downloadJson.js'
import { formatDateTime } from '../../utils/formatDate.js'
import { plural } from '../../utils/plural.js'
import { useUnsavedChanges } from '../../utils/useUnsavedChanges.js'

const LIST_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'key', label: 'ID' },
]

/**
 * Route component for /blueprints/:blueprintId/assets/new and .../assets/:assetKey.
 * The `key` gives every asset (and every "new asset" visit) a fresh editor with fresh state.
 */
function AssetEditorPage() {
  const { blueprintId, assetKey } = useParams()
  const location = useLocation()
  return (
    <AssetEditor
      key={`${blueprintId}/${assetKey ?? `new-${location.key}`}`}
      blueprintId={blueprintId}
      assetKey={assetKey}
      imported={location.state?.imported}
      origin={location.state?.origin}
      originName={location.state?.originName}
      followName={location.state?.followName}
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
  const importedKeyIsFixed = Boolean(imported?.key) && !(isDuplicate && followName)
  const blueprints = useBlueprints()
  const assets = useAssets()
  const dialogues = useDialogues()
  const navigate = useNavigate()
  const toast = useToast()

  const blueprint = blueprints.find((candidate) => candidate.id === blueprintId) ?? null
  const fields = blueprint?.fields ?? []

  // The last saved asset (null for a new one)
  const [baseline, setBaseline] = useState(() =>
    assetKey ? (assets.find((asset) => asset.schemaId === blueprintId && asset.key === assetKey) ?? null) : null,
  )
  const [key, setKey] = useState(() => baseline?.key ?? imported?.key ?? '')
  const [values, setValues] = useState(() => toFormValues(fields, baseline?.data ?? imported?.data))
  // keyTouched: the user chose the ID, so stop filling it in from the name. keyShowErrors: show the ID's error.
  const [keyTouched, setKeyTouched] = useState(Boolean(baseline) || importedKeyIsFixed)
  const [keyShowErrors, setKeyShowErrors] = useState(false)
  const [touchedPaths, setTouchedPaths] = useState([])
  const [submitted, setSubmitted] = useState(Boolean(imported) && !isDuplicate)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // ---------- Derived data ----------

  const blueprintAssets = assets.filter((asset) => asset.schemaId === blueprintId)
  const labelKey = blueprint ? labelFieldKey(blueprint) : null
  const labelField = fields.find((field) => field.key === labelKey)

  const data = toData(fields, values)
  // Compare against the saved data run through the same conversion, so formatting differences don't count
  const savedData = toData(fields, toFormValues(fields, baseline?.data))
  const isDirty = (baseline ? key !== baseline.key : key !== '') || JSON.stringify(data) !== JSON.stringify(savedData)

  // What links can point to: every blueprint's assets
  const assetsByBlueprint = Object.fromEntries(
    blueprints.map((candidate) => [candidate.id, assets.filter((asset) => asset.schemaId === candidate.id)]),
  )
  const referenceKeys = Object.fromEntries(
    Object.entries(assetsByBlueprint).map(([id, list]) => [id, list.map((asset) => asset.key)]),
  )
  const referenceOptions = Object.fromEntries(
    blueprints.map((candidate) => [
      candidate.id,
      assetsByBlueprint[candidate.id].map((asset) => ({
        value: asset.key,
        label: assetLabel(asset, candidate),
      })),
    ]),
  )

  // ---------- Validation ----------

  const valueErrors = validateValues(fields, values, '', referenceKeys)
  const keyError = validateAssetKey(key, blueprintAssets, baseline?.id)
  const problemCount = Object.keys(valueErrors).length + (keyError ? 1 : 0)

  // Errors show for inputs the user has changed, or for everything after trying to save
  const visibleValueErrors = submitted
    ? valueErrors
    : Object.fromEntries(
        Object.entries(valueErrors).filter(([path]) =>
          touchedPaths.some((touched) => path === touched || path.startsWith(`${touched}.`)),
        ),
      )
  const visibleKeyError = submitted || keyShowErrors ? keyError : null
  const problems = [
    ...(visibleKeyError ? [{ id: 'asset-meta-id', label: 'ID', message: visibleKeyError }] : []),
    ...Object.entries(visibleValueErrors).map(([path, message]) => ({
      id: `field-${path}`,
      label: labelForPath(fields, path),
      message,
    })),
  ]

  // ---------- Leaving with unsaved changes ----------

  const { blocker, allowLeaving } = useUnsavedChanges(isDirty)

  // ---------- Not found ----------

  if (!blueprint || (assetKey && !baseline)) {
    return (
      <MissingRecord
        title={blueprint ? 'Asset not found' : 'Blueprint not found'}
        message={
          blueprint
            ? `There's no ${blueprint.name} asset with the ID "${assetKey}".`
            : `There's no blueprint with the ID "${blueprintId}".`
        }
        back={
          blueprint
            ? { to: `/blueprints/${blueprint.id}/assets`, label: `All ${blueprint.name} assets` }
            : { to: '/blueprints', label: 'All blueprints' }
        }
      />
    )
  }

  // ---------- Editing ----------

  function changeValues(nextValues, changedPath) {
    setValues(nextValues)
    setTouchedPaths((current) => (current.includes(changedPath) ? current : [...current, changedPath]))
    // A new asset's ID follows its name until the user edits the ID
    if (!keyTouched && changedPath === labelKey) {
      setKey(toSnakeCase(String(nextValues[labelKey] ?? '')))
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
      key,
      schemaId: blueprint.id,
      schemaVersion: blueprint.version,
      data,
      createdAt: baseline?.createdAt ?? now,
      updatedAt: now,
    }

    // If the ID changed, keep other assets' links pointing at this asset
    const changedAssets = [saved]
    if (baseline && baseline.key !== key) {
      for (const other of assets) {
        const otherBlueprint = blueprints.find((candidate) => candidate.id === other.schemaId)
        if (other.id === saved.id || !otherBlueprint) continue
        const nextData = replaceReferences(otherBlueprint.fields, other.data, blueprint.id, baseline.key, key)
        if (JSON.stringify(nextData) !== JSON.stringify(other.data)) changedAssets.push({ ...other, data: nextData })
      }
    }

    // ...and dialogue speakers/items pointing at it
    const changedDialogues =
      baseline && baseline.key !== key
        ? dialogues.map((dialogue) => renameAssetInDialogue(dialogue, blueprint.id, baseline.key, key)).filter(Boolean)
        : []

    saveAssets(changedAssets)
    if (changedDialogues.length > 0) saveDialogues(changedDialogues)
    setBaseline(saved)
    setSubmitted(false)
    setTouchedPaths([])
    setKeyTouched(true)
    setKeyShowErrors(false)
    const updatedLinks = [
      ...(changedAssets.length > 1 ? [plural(changedAssets.length - 1, 'other asset')] : []),
      ...(changedDialogues.length > 0 ? [plural(changedDialogues.length, 'dialogue')] : []),
    ]
    toast.show({
      status: 'success',
      message: updatedLinks.length > 0 ? `Asset saved. Links in ${updatedLinks.join(' and ')} were updated.` : 'Asset saved',
    })

    if (key !== assetKey) {
      // New asset, or its ID changed: move to its new address
      allowLeaving()
      navigate(`/blueprints/${blueprint.id}/assets/${key}/edit`, { replace: true })
    }
  }

  function handleDiscard() {
    setKey(baseline?.key ?? imported?.key ?? '')
    setValues(toFormValues(fields, baseline?.data ?? imported?.data))
    setKeyTouched(Boolean(baseline) || importedKeyIsFixed)
    setKeyShowErrors(false)
    setTouchedPaths([])
    setSubmitted(Boolean(imported && !baseline) && !isDuplicate)
  }

  function handleDelete() {
    setConfirmDelete(false)
    allowLeaving()
    deleteAsset(baseline.id)
    toast.show({ status: 'success', message: `Asset "${assetLabel(baseline, blueprint)}" deleted` })
    navigate(`/blueprints/${blueprint.id}/assets`, { replace: true })
  }

  const exportShape = toExport({ key, schemaId: blueprint.id, schemaVersion: blueprint.version, data })

  function handleDownload() {
    if (problemCount > 0) {
      setSubmitted(true)
      toast.show({ status: 'error', message: `Fix ${plural(problemCount, 'problem')} before downloading` })
      return
    }
    downloadJson(`${key}.json`, exportShape)
    toast.show({ status: 'success', message: 'Asset file downloaded' })
  }

  // ---------- Display ----------

  const currentName = String(values[labelKey] ?? '').trim()
  const title = currentName || key || 'New asset'

  const linkedFrom = baseline
    ? assets.filter((other) => {
        const otherBlueprint = blueprints.find((candidate) => candidate.id === other.schemaId)
        return other.id !== baseline.id && otherBlueprint && linksTo(otherBlueprint.fields, other.data, blueprint.id, baseline.key)
      })
    : []
  const deleteMessage =
    `Delete asset "${baseline ? assetLabel(baseline, blueprint) : ''}"? This can't be undone.` +
    (linkedFrom.length > 0
      ? ` ${plural(linkedFrom.length, 'other asset')} ${linkedFrom.length === 1 ? 'links' : 'link'} to it and will show a problem.`
      : '')

  const isOutdated = baseline && baseline.schemaVersion < blueprint.version

  const status =
    submitted && problemCount > 0
      ? plural(problemCount, 'problem')
      : isDirty
        ? 'Unsaved changes'
        : baseline
          ? `Saved ${formatDateTime(baseline.updatedAt)}`
          : 'Not saved yet'

  const listRows = blueprintAssets.map((asset) => ({ id: asset.id, name: assetLabel(asset, blueprint), key: asset.key }))

  return (
    <AppShell
      actions={
        <TopBarActions
          noun="asset"
          newPath={`/blueprints/${blueprint.id}/assets/new`}
          importFile={(text) => parseAssetFile(text, blueprint)}
        />
      }
      crumbs={[
        { label: 'Blueprints', to: '/blueprints' },
        { label: blueprint.name, to: `/blueprints/${blueprint.id}/assets` },
        { label: title, ...(baseline ? { to: `/blueprints/${blueprint.id}/assets/${baseline.key}` } : {}) },
        ...(baseline ? [{ label: 'Edit' }] : []),
      ]}
      status={status}
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
          {listRows.length > 0 ? (
            <Table
              columns={LIST_COLUMNS}
              rows={listRows}
              selectedId={baseline?.id}
              onSelect={(id) => {
                const asset = blueprintAssets.find((candidate) => candidate.id === id)
                if (asset.key !== assetKey) navigate(`/blueprints/${blueprint.id}/assets/${asset.key}/edit`)
              }}
            />
          ) : (
            <EmptyState message="No saved assets yet." />
          )}
        </Section>

        <Section
          title={baseline ? 'Asset' : 'New asset'}
          actions={
            baseline && (
              <>
                <Button
                  variant="ghost"
                  icon={Copy}
                  title="Duplicate asset"
                  onClick={() =>
                    navigate(`/blueprints/${blueprint.id}/assets/new`, {
                      state: duplicateAssetState(baseline, blueprint, blueprintAssets),
                    })
                  }
                />
                <Button
                  variant="ghost"
                  icon={Eye}
                  title="View asset"
                  onClick={() => navigate(`/blueprints/${blueprint.id}/assets/${baseline.key}`)}
                />
              </>
            )
          }
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
            {imported && !baseline && (
              <ImportNotice isDuplicate={isDuplicate} originName={originName} />
            )}

            <PropertyRow
              label="ID"
              required
              error={visibleKeyError}
              help={
                labelField
                  ? `How the game and other assets refer to this one. It follows ${labelField.label} until you change it.`
                  : 'How the game and other assets refer to this one.'
              }
            >
              <TextInput
                id="asset-meta-id"
                placeholder="sword_of_fire"
                value={key}
                onChange={(event) => changeKey(event.target.value)}
              />
            </PropertyRow>

            <hr />

            {fields.length > 0 ? (
              <FormRenderer
                fields={fields}
                values={values}
                onChange={changeValues}
                errors={visibleValueErrors}
                referenceOptions={referenceOptions}
              />
            ) : (
              <EmptyState message={`The ${blueprint.name} blueprint has no properties yet.`}>
                <Button icon={Pencil} onClick={() => navigate(`/blueprints/${blueprint.id}`)}>
                  Edit blueprint
                </Button>
              </EmptyState>
            )}
          </div>
        </Section>

        <Section
          title="Preview"
          actions={
            <Button
              variant="ghost"
              icon={Download}
              title="Download asset file"
              onClick={handleDownload}
            />
          }
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
          message={deleteMessage}
          confirmLabel="Delete asset"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
        />
      )}

      <UnsavedChangesDialog blocker={blocker} name={title} />
    </AppShell>
  )
}

export default AssetEditorPage
