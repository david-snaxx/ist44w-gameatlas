import { ReactFlowProvider, useReactFlow } from '@xyflow/react'
import { Copy, Download, RotateCcw, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import AppShell from '../../components/AppShell/AppShell.jsx'
import AppSidebar from '../../components/AppSidebar/AppSidebar.jsx'
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx'
import Button from '../../components/Button/Button.jsx'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog.jsx'
import PropertyRow from '../../components/form/PropertyRow.jsx'
import Select from '../../components/form/Select.jsx'
import TextArea from '../../components/form/TextArea.jsx'
import TextInput from '../../components/form/TextInput.jsx'
import ValidationSummary from '../../components/form/ValidationSummary.jsx'
import JsonPreview from '../../components/JsonPreview/JsonPreview.jsx'
import MissingRecord from '../../components/MissingRecord/MissingRecord.jsx'
import { ImportNotice } from '../../components/Notice/Notice.jsx'
import Section from '../../components/Section/Section.jsx'
import UnsavedChangesDialog from '../../components/UnsavedChangesDialog/UnsavedChangesDialog.jsx'
import TopBarActions from '../../components/TopBarActions/TopBarActions.jsx'
import { useToast } from '../../components/Toast/useToast.js'
import { assetLabel } from '../../data/assetData.js'
import {
  createDialogueGraph,
  duplicateDialogueState,
  nodeLabel,
  toCanvasNodes,
  toDialogueExport,
  toStoredGraph,
  validateDialogueDetails,
  validateDialogueGraph,
  parseDialogueFile,
} from '../../data/dialogueGraph.js'
import { deleteDialogue, saveDialogues } from '../../data/dialogueStore.js'
import { useAssets } from '../../data/useAssets.js'
import { useDialogues } from '../../data/useDialogues.js'
import { toSnakeCase } from '../../schema/blueprintDraft.js'
import { useBlueprints } from '../../schema/useBlueprints.js'
import { downloadJson } from '../../utils/downloadJson.js'
import { formatDateTime } from '../../utils/formatDate.js'
import { plural } from '../../utils/plural.js'
import { useUnsavedChanges } from '../../utils/useUnsavedChanges.js'
import DialogueCanvas from './DialogueCanvas.jsx'
import { DialogueEditorContext } from './DialogueEditorContext.js'

const pickDetails = (dialogue) => ({
  name: dialogue.name,
  key: dialogue.key,
  description: dialogue.description ?? '',
  speakerBlueprint: dialogue.speakerBlueprint ?? '',
  itemBlueprint: dialogue.itemBlueprint ?? '',
})

// Everything that counts as "a change", as one comparable string
const snapshot = (details, nodes, edges) => JSON.stringify({ details, graph: toStoredGraph(nodes, edges) })

const preferredBlueprint = (blueprints, preferredId) =>
  blueprints.some((blueprint) => blueprint.id === preferredId) ? preferredId : (blueprints[0]?.id ?? '')

/**
 * Route component for /dialogues/new and /dialogues/:dialogueKey.
 * ReactFlowProvider lets the editor (not just the canvas) use React Flow's helpers, e.g. to center a node.
 * The `key` gives every dialogue (and every "new dialogue" visit) a fresh editor.
 */
function DialogueEditorPage() {
  const { dialogueKey } = useParams()
  const location = useLocation()
  return (
    <ReactFlowProvider key={dialogueKey ?? `new-${location.key}`}>
      <DialogueEditor
        dialogueKey={dialogueKey}
        imported={location.state?.imported}
        origin={location.state?.origin}
        originName={location.state?.originName}
      />
    </ReactFlowProvider>
  )
}

/**
 * imported: { details, nodes, edges } to start a new dialogue from (an imported file or a duplicate)
 * origin: 'file' | 'duplicate'; originName: the name of the dialogue that was duplicated
 */
function DialogueEditor({ dialogueKey, imported, origin, originName }) {
  const isDuplicate = origin === 'duplicate'
  const isFromFile = Boolean(imported) && !isDuplicate
  // An imported file's ID is kept as-is; a duplicate's ID keeps following its name
  const importedKeyIsFixed = isFromFile && Boolean(imported?.details?.key)
  const dialogues = useDialogues()
  const blueprints = useBlueprints()
  const assets = useAssets()
  const navigate = useNavigate()
  const toast = useToast()
  const { setCenter } = useReactFlow()

  // The starting point, worked out once when the editor opens
  const [initial] = useState(() => {
    const saved = dialogueKey ? (dialogues.find((dialogue) => dialogue.key === dialogueKey) ?? null) : null
    const blankDetails = {
      name: '',
      key: '',
      description: '',
      speakerBlueprint: preferredBlueprint(blueprints, 'entity'),
      itemBlueprint: preferredBlueprint(blueprints, 'item'),
    }
    const blankGraph = createDialogueGraph()
    const graph = saved ?? imported ?? blankGraph
    const details = saved ? pickDetails(saved) : imported ? { ...blankDetails, ...imported.details } : blankDetails
    const nodes = toCanvasNodes(graph.nodes)
    // A saved dialogue starts out unchanged; an imported or duplicated one counts as unsaved changes
    const json = saved
      ? snapshot(details, nodes, graph.edges)
      : snapshot(blankDetails, toCanvasNodes(blankGraph.nodes), blankGraph.edges)
    return { saved, details, nodes, edges: graph.edges, json }
  })

  const [baseline, setBaseline] = useState(initial.saved)
  const [details, setDetails] = useState(initial.details)
  const [nodes, setNodes] = useState(initial.nodes)
  const [edges, setEdges] = useState(initial.edges)
  const [savedJson, setSavedJson] = useState(initial.json)
  const [keyTouched, setKeyTouched] = useState(Boolean(initial.saved) || importedKeyIsFixed)
  const [detailsTouched, setDetailsTouched] = useState({})
  const [submitted, setSubmitted] = useState(isFromFile)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // ---------- Derived data ----------

  const isDirty = snapshot(details, nodes, edges) !== savedJson
  const stored = toStoredGraph(nodes, edges)

  const blueprintIds = blueprints.map((blueprint) => blueprint.id)
  const assetKeys = Object.fromEntries(
    blueprints.map((blueprint) => [
      blueprint.id,
      assets.filter((asset) => asset.schemaId === blueprint.id).map((asset) => asset.key),
    ]),
  )
  const assetOptionsFor = (blueprintId) => {
    const blueprint = blueprints.find((candidate) => candidate.id === blueprintId)
    if (!blueprint) return null
    return assets
      .filter((asset) => asset.schemaId === blueprint.id)
      .map((asset) => ({ value: asset.key, label: assetLabel(asset, blueprint), hint: asset.key }))
  }
  const blueprintOptions = blueprints.map((blueprint) => ({ value: blueprint.id, label: blueprint.name, hint: blueprint.id }))

  const graphProblems = validateDialogueGraph({ ...details, nodes, edges }, { blueprintIds, assetKeys })
  const problemsByNode = {}
  for (const problem of graphProblems) {
    if (problem.nodeId) (problemsByNode[problem.nodeId] ??= []).push(problem)
  }

  const otherKeys = dialogues.filter((dialogue) => dialogue.id !== baseline?.id).map((dialogue) => dialogue.key)
  const detailErrors = validateDialogueDetails(details, otherKeys)
  const detailError = (name) => (submitted || detailsTouched[name] ? detailErrors[name] : undefined)
  const detailProblemCount = Object.keys(detailErrors).length

  const editorContext = {
    speakerOptions: assetOptionsFor(details.speakerBlueprint),
    itemOptions: assetOptionsFor(details.itemBlueprint),
    problemsByNode,
  }

  // ---------- Leaving with unsaved changes ----------

  const { blocker, allowLeaving } = useUnsavedChanges(isDirty)

  if (dialogueKey && !baseline) {
    return (
      <MissingRecord
        title="Dialogue not found"
        message={`There's no dialogue with the ID "${dialogueKey}".`}
        back={{ to: '/dialogues', label: 'All dialogues' }}
        crumbs={[{ label: 'Dialogues', to: '/dialogues' }]}
      />
    )
  }

  // ---------- Details ----------

  function changeDetails(name, changes) {
    setDetails((current) => ({ ...current, ...changes }))
    setDetailsTouched((current) => ({ ...current, [name]: true }))
  }

  function changeName(name) {
    // The ID follows the name until the user edits the ID
    changeDetails('name', keyTouched ? { name } : { name, key: toSnakeCase(name) })
    if (!keyTouched) setDetailsTouched((current) => ({ ...current, key: true }))
  }

  // ---------- Problems ----------

  const problems = [
    ...['name', 'key']
      .filter((name) => detailError(name))
      .map((name) => ({ id: `dialogue-${name}`, label: name === 'name' ? 'Name' : 'ID', message: detailErrors[name] })),
    ...graphProblems.map((problem) => {
      const node = nodes.find((candidate) => candidate.id === problem.nodeId)
      return { ...problem, label: node ? nodeLabel(node) : 'Dialogue' }
    }),
  ]
  const hiddenProblemCount = detailProblemCount - problems.filter((problem) => problem.id.startsWith('dialogue-')).length

  /** Selects a node and centers the view on it. */
  function showNode(nodeId) {
    const node = nodes.find((candidate) => candidate.id === nodeId)
    if (!node) return
    setNodes((current) => current.map((candidate) => ({ ...candidate, selected: candidate.id === nodeId })))
    const width = node.measured?.width ?? 260
    const height = node.measured?.height ?? 120
    setCenter(node.position.x + width / 2, node.position.y + height / 2, { zoom: 1, duration: 300 })
  }

  function selectProblem(problem) {
    if (problem.nodeId) showNode(problem.nodeId)
    else document.getElementById(problem.id)?.focus()
  }

  // ---------- Saving, discarding, deleting, downloading ----------

  function handleSave() {
    setSubmitted(true)
    if (detailProblemCount > 0) {
      toast.show({ status: 'error', message: `Fix ${plural(detailProblemCount, 'problem')} before saving` })
      return
    }

    const cleanDetails = { ...details, description: details.description.trim() }
    const now = new Date().toISOString()
    const saved = {
      id: baseline?.id ?? crypto.randomUUID(),
      ...cleanDetails,
      ...stored,
      createdAt: baseline?.createdAt ?? now,
      updatedAt: now,
    }
    saveDialogues([saved])
    setBaseline(saved)
    setDetails(cleanDetails)
    setSavedJson(snapshot(cleanDetails, nodes, edges))
    setSubmitted(false)
    setDetailsTouched({})
    setKeyTouched(true)
    toast.show({
      status: 'success',
      message:
        graphProblems.length > 0
          ? `Dialogue saved. Fix ${plural(graphProblems.length, 'problem')} before it can be downloaded.`
          : 'Dialogue saved',
    })

    if (saved.key !== dialogueKey) {
      // New dialogue, or its ID changed: move to its new address
      allowLeaving()
      navigate(`/dialogues/${saved.key}`, { replace: true })
    }
  }

  function handleDiscard() {
    const source = baseline
      ? { details: pickDetails(baseline), nodes: toCanvasNodes(baseline.nodes), edges: baseline.edges }
      : initial
    setDetails(source.details)
    setNodes(source.nodes)
    setEdges(source.edges)
    setKeyTouched(Boolean(baseline) || importedKeyIsFixed)
    setDetailsTouched({})
    setSubmitted(!baseline && isFromFile)
  }

  function handleDelete() {
    setConfirmDelete(false)
    allowLeaving()
    deleteDialogue(baseline.id)
    toast.show({ status: 'success', message: `Dialogue "${baseline.name}" deleted` })
    navigate('/dialogues', { replace: true })
  }

  const exportShape = toDialogueExport({ ...details, ...stored })

  function handleDownload() {
    const count = detailProblemCount + graphProblems.length
    if (count > 0) {
      setSubmitted(true)
      toast.show({ status: 'error', message: `Fix ${plural(count, 'problem')} before downloading` })
      return
    }
    downloadJson(`${details.key}.dialogue.json`, exportShape)
    toast.show({ status: 'success', message: 'Dialogue file downloaded' })
  }

  // ---------- Display ----------

  const title = details.name.trim() || baseline?.name || 'New dialogue'
  const savedText = isDirty ? 'Unsaved changes' : baseline ? `Saved ${formatDateTime(baseline.updatedAt)}` : 'Not saved yet'
  const status =
    submitted && detailProblemCount > 0
      ? plural(detailProblemCount, 'problem')
      : `${savedText}${graphProblems.length > 0 ? ` · ${plural(graphProblems.length, 'problem')}` : ''}`

  return (
    <AppShell
      actions={<TopBarActions noun="dialogue" newPath="/dialogues/new" importFile={parseDialogueFile} />}
      sidebar={<AppSidebar />}
      breadcrumbs={<Breadcrumbs items={[{ label: 'Dialogues', to: '/dialogues' }, { label: title }]} />}
      status={status}
    >
      {/* React 19 lets a context object be used directly as its provider */}
      <DialogueEditorContext value={editorContext}>
        <div className="panes" style={{ '--panes': 'minmax(0, 1fr) 340px' }}>
          <Section title="Dialogue tree" bodyClassName="flush canvas">
            <DialogueCanvas nodes={nodes} edges={edges} setNodes={setNodes} setEdges={setEdges} />
          </Section>

          <Section
            title={baseline ? 'Dialogue' : 'New dialogue'}
            actions={
              <>
                {baseline && (
                  <Button
                    variant="ghost"
                    icon={Copy}
                    aria-label={`Duplicate ${baseline.name}`}
                    title="Duplicate dialogue"
                    onClick={() =>
                      navigate('/dialogues/new', {
                        state: duplicateDialogueState(baseline, dialogues.map((dialogue) => dialogue.key)),
                      })
                    }
                  />
                )}
                <Button
                  variant="ghost"
                  icon={Download}
                  aria-label="Download dialogue file"
                  title="Download dialogue file"
                  onClick={handleDownload}
                />
              </>
            }
            footer={
              <>
                <Button variant="primary" icon={Save} onClick={handleSave}>
                  Save
                </Button>
                <Button icon={RotateCcw} disabled={!isDirty} onClick={handleDiscard}>
                  Discard
                </Button>
                {baseline && (
                  <Button
                    variant="danger"
                    icon={Trash2}
                    className="push-right"
                    aria-label="Delete dialogue"
                    title="Delete dialogue"
                    onClick={() => setConfirmDelete(true)}
                  />
                )}
              </>
            }
          >
            <div className="stack">
              {imported && !baseline && (
                <ImportNotice isDuplicate={isDuplicate} originName={originName} />
              )}
              <PropertyRow id="dialogue-name" label="Name" required layout="stacked" error={detailError('name')}>
                {(inputProps) => (
                  <TextInput
                    {...inputProps}
                    placeholder="e.g. Merchant greeting"
                    value={details.name}
                    onChange={(event) => changeName(event.target.value)}
                  />
                )}
              </PropertyRow>
              <PropertyRow
                id="dialogue-key"
                label="ID"
                required
                layout="stacked"
                error={detailError('key')}
                help="How the game finds this dialogue. It follows the name until you change it."
              >
                {(inputProps) => (
                  <TextInput
                    {...inputProps}
                    mono
                    placeholder="merchant_greeting"
                    value={details.key}
                    onChange={(event) => {
                      setKeyTouched(true)
                      changeDetails('key', { key: event.target.value })
                    }}
                  />
                )}
              </PropertyRow>
              <PropertyRow id="dialogue-description" label="Description" layout="stacked">
                {(inputProps) => (
                  <TextArea
                    {...inputProps}
                    placeholder="When does this conversation happen?"
                    value={details.description}
                    onChange={(event) => changeDetails('description', { description: event.target.value })}
                  />
                )}
              </PropertyRow>
              <PropertyRow
                id="dialogue-speakers"
                label="Speakers come from"
                layout="stacked"
                help="Lines pick their speaker from this blueprint's assets."
              >
                {(inputProps) => (
                  <Select
                    {...inputProps}
                    options={[{ value: '', label: 'No speakers (narrator only)' }, ...blueprintOptions]}
                    value={details.speakerBlueprint}
                    onChange={(speakerBlueprint) => changeDetails('speakerBlueprint', { speakerBlueprint })}
                  />
                )}
              </PropertyRow>
              <PropertyRow
                id="dialogue-items"
                label="Items come from"
                layout="stacked"
                help="“Give item” actions pick from this blueprint's assets."
              >
                {(inputProps) => (
                  <Select
                    {...inputProps}
                    options={[{ value: '', label: 'No items' }, ...blueprintOptions]}
                    value={details.itemBlueprint}
                    onChange={(itemBlueprint) => changeDetails('itemBlueprint', { itemBlueprint })}
                  />
                )}
              </PropertyRow>

              <h2 className="subhead">Checks</h2>
              <ValidationSummary problems={problems} hiddenCount={hiddenProblemCount} onSelect={selectProblem} />
              <JsonPreview value={exportShape} />
            </div>
          </Section>
        </div>
      </DialogueEditorContext>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete dialogue?"
        message={`Delete dialogue "${baseline?.name}"? This can't be undone.`}
        confirmLabel="Delete dialogue"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />

      <UnsavedChangesDialog blocker={blocker} name={title} />
    </AppShell>
  )
}

export default DialogueEditorPage
