import { ReactFlowProvider, useReactFlow } from '@xyflow/react'
import { Copy, Download, RotateCcw, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import AppShell from '../../components/AppShell/AppShell.jsx'
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
  dialogueCheckContext,
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

/**
 * Route component for /dialogues/new and /dialogues/:dialogueKey.
 * ReactFlowProvider lets the editor (not just the canvas) use React Flow's helpers, e.g. to center a node.
 * The `key` gives every dialogue (and every "new dialogue" visit) a fresh editor.
 */
function DialogueEditorPage() {
  const { dialogueKey } = useParams()
  const location = useLocation()

  // location.state is what the page that sent us here passed along (an import or a duplicate), if anything
  const state = location.state ?? {}

  let editorKey = `new-${location.key}`
  if (dialogueKey) {
    editorKey = dialogueKey
  }

  return (
    <ReactFlowProvider key={editorKey}>
      <DialogueEditor
        dialogueKey={dialogueKey}
        imported={state.imported}
        origin={state.origin}
        originName={state.originName}
      />
    </ReactFlowProvider>
  )
}

/**
 * imported: { details, nodes, edges } to start a new dialogue from (an imported file or a duplicate)
 * origin: 'file' | 'duplicate'; originName: the name of the dialogue that was duplicated
 *
 * The dialogue is kept in three pieces of state: `details` (name, ID, description and the two
 * blueprints), and the canvas's `nodes` and `edges`.
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

  // The starting point, worked out once when the editor opens. `useState(() => …)` only runs the function the first time.
  const [initial] = useState(() => startingState(dialogueKey, dialogues, blueprints, imported))

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

  const graphProblems = validateDialogueGraph(combineDialogue(details, nodes, edges), dialogueCheckContext(blueprints, assets))

  const otherKeys = []
  for (const dialogue of dialogues) {
    if (dialogue.id !== baseline?.id) {
      otherKeys.push(dialogue.key)
    }
  }
  const detailErrors = validateDialogueDetails(details, otherKeys)
  const detailProblemCount = Object.keys(detailErrors).length

  // What every node on the canvas needs (see DialogueEditorContext.js)
  const editorContext = {
    speakerOptions: assetOptionsFor(blueprints, assets, details.speakerBlueprint),
    itemOptions: assetOptionsFor(blueprints, assets, details.itemBlueprint),
    problemsByNode: groupProblemsByNode(graphProblems),
  }

  // ---------- Leaving with unsaved changes ----------

  // (A hook, so it has to run on every render, before the "not found" return below)
  const { blocker, allowLeaving } = useUnsavedChanges(isDirty)

  if (dialogueKey && !baseline) {
    return (
      <MissingRecord
        title="Dialogue not found"
        message={`There's no dialogue with the ID "${dialogueKey}".`}
        back={{ to: '/dialogues', label: 'All dialogues' }}
      />
    )
  }

  // ---------- Details ----------

  // The error for "name" or "key", once it's been touched or the user tried to save
  function detailError(name) {
    if (submitted || detailsTouched[name]) {
      return detailErrors[name]
    }
    return undefined
  }

  // Merges `changes` into the details (e.g. { description: '…' }) and marks the setting as touched
  function changeDetails(settingName, changes) {
    setDetails({ ...details, ...changes })
    setDetailsTouched({ ...detailsTouched, [settingName]: true })
  }

  function changeName(name) {
    const nextDetails = { ...details, name: name }
    const nextTouched = { ...detailsTouched, name: true }
    // The ID follows the name until the user edits the ID
    if (!keyTouched) {
      nextDetails.key = toSnakeCase(name)
      nextTouched.key = true
    }
    setDetails(nextDetails)
    setDetailsTouched(nextTouched)
  }

  function changeKey(key) {
    setKeyTouched(true)
    changeDetails('key', { key: key })
  }

  // ---------- Problems ----------

  const problems = []
  if (detailError('name')) {
    problems.push({ id: 'dialogue-name', label: 'Name', message: detailErrors.name })
  }
  if (detailError('key')) {
    problems.push({ id: 'dialogue-key', label: 'ID', message: detailErrors.key })
  }
  const hiddenProblemCount = detailProblemCount - problems.length
  for (const problem of graphProblems) {
    const node = nodes.find((candidate) => candidate.id === problem.nodeId)
    let label = 'Dialogue'
    if (node) {
      label = nodeLabel(node)
    }
    problems.push({ ...problem, label: label })
  }

  /** Selects a node and centers the view on it. */
  function showNode(nodeId) {
    const node = nodes.find((candidate) => candidate.id === nodeId)
    if (!node) {
      return
    }

    const nextNodes = []
    for (const candidate of nodes) {
      nextNodes.push({ ...candidate, selected: candidate.id === nodeId })
    }
    setNodes(nextNodes)

    // React Flow measures each node once it's drawn; before that, guess a typical size
    const width = node.measured?.width ?? 260
    const height = node.measured?.height ?? 120
    setCenter(node.position.x + width / 2, node.position.y + height / 2, { zoom: 1, duration: 300 })
  }

  // Clicking a problem: jump to its node, or for the name and ID, to the input
  function selectProblem(problem) {
    if (problem.nodeId) {
      showNode(problem.nodeId)
      return
    }
    const input = document.getElementById(problem.id)
    if (input) {
      input.focus()
    }
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
      name: cleanDetails.name,
      key: cleanDetails.key,
      description: cleanDetails.description,
      speakerBlueprint: cleanDetails.speakerBlueprint,
      itemBlueprint: cleanDetails.itemBlueprint,
      nodes: stored.nodes,
      edges: stored.edges,
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

    // A dialogue with problems can be saved (big trees take several sessions), but not downloaded
    let message = 'Dialogue saved'
    if (graphProblems.length > 0) {
      message = `Dialogue saved. Fix ${plural(graphProblems.length, 'problem')} before it can be downloaded.`
    }
    toast.show({ status: 'success', message: message })

    if (saved.key !== dialogueKey) {
      // New dialogue, or its ID changed: move to its new address
      allowLeaving()
      navigate(`/dialogues/${saved.key}`, { replace: true })
    }
  }

  function handleDiscard() {
    if (baseline) {
      setDetails(pickDetails(baseline))
      setNodes(toCanvasNodes(baseline.nodes))
      setEdges(baseline.edges)
    } else {
      setDetails(initial.details)
      setNodes(initial.nodes)
      setEdges(initial.edges)
    }
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

  const exportShape = toDialogueExport(combineDialogue(details, stored.nodes, stored.edges))

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

  function handleDuplicate() {
    const existingKeys = []
    for (const dialogue of dialogues) {
      existingKeys.push(dialogue.key)
    }
    navigate('/dialogues/new', { state: duplicateDialogueState(baseline, existingKeys) })
  }

  // ---------- Display ----------

  let title = 'New dialogue'
  if (details.name.trim()) {
    title = details.name.trim()
  } else if (baseline?.name) {
    title = baseline.name
  }

  // A new dialogue that started from a file or a copy says so at the top
  const showImportNotice = Boolean(imported) && !baseline

  let paneTitle = 'New dialogue'
  let duplicateButton = null
  if (baseline) {
    paneTitle = 'Dialogue'
    duplicateButton = <Button variant="ghost" icon={Copy} title="Duplicate dialogue" onClick={handleDuplicate} />
  }

  // The "… come from" dropdowns: any blueprint, or none
  const speakerSourceOptions = [{ value: '', label: 'No speakers (narrator only)' }]
  const itemSourceOptions = [{ value: '', label: 'No items' }]
  for (const blueprint of blueprints) {
    const option = { value: blueprint.id, label: blueprint.name }
    speakerSourceOptions.push(option)
    itemSourceOptions.push(option)
  }

  return (
    <AppShell
      actions={<TopBarActions noun="dialogue" newPath="/dialogues/new" importFile={parseDialogueFile} />}
      crumbs={[{ label: 'Dialogues', to: '/dialogues' }, { label: title }]}
      status={statusText(submitted, detailProblemCount, isDirty, baseline, graphProblems.length)}
    >
      {/* React 19 lets a context object be used directly as its provider */}
      <DialogueEditorContext value={editorContext}>
        <div className="panes" style={{ '--panes': 'minmax(0, 1fr) 340px' }}>
          <Section title="Dialogue tree">
            <DialogueCanvas nodes={nodes} edges={edges} setNodes={setNodes} setEdges={setEdges} />
          </Section>

          <Section
            title={paneTitle}
            actions={
              <>
                {duplicateButton}
                <Button variant="ghost" icon={Download} title="Download dialogue file" onClick={handleDownload} />
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
                    title="Delete dialogue"
                    onClick={() => setConfirmDelete(true)}
                  />
                )}
              </>
            }
          >
            <div className="stack">
              {showImportNotice && <ImportNotice isDuplicate={isDuplicate} originName={originName} />}
              <PropertyRow label="Name" required error={detailError('name')}>
                <TextInput
                  id="dialogue-name"
                  placeholder="e.g. Merchant greeting"
                  value={details.name}
                  onChange={(event) => changeName(event.target.value)}
                />
              </PropertyRow>
              <PropertyRow
                label="ID"
                required
                error={detailError('key')}
                help="How the game finds this dialogue. It follows the name until you change it."
              >
                <TextInput
                  id="dialogue-key"
                  placeholder="merchant_greeting"
                  value={details.key}
                  onChange={(event) => changeKey(event.target.value)}
                />
              </PropertyRow>
              <PropertyRow label="Description">
                <TextArea
                  placeholder="When does this conversation happen?"
                  value={details.description}
                  onChange={(event) => changeDetails('description', { description: event.target.value })}
                />
              </PropertyRow>
              <PropertyRow label="Speakers come from" help="Lines pick their speaker from this blueprint's assets.">
                <Select
                  options={speakerSourceOptions}
                  value={details.speakerBlueprint}
                  onChange={(value) => changeDetails('speakerBlueprint', { speakerBlueprint: value })}
                />
              </PropertyRow>
              <PropertyRow label="Items come from" help="“Give item” actions pick from this blueprint's assets.">
                <Select
                  options={itemSourceOptions}
                  value={details.itemBlueprint}
                  onChange={(value) => changeDetails('itemBlueprint', { itemBlueprint: value })}
                />
              </PropertyRow>

              <h2 className="subhead">Checks</h2>
              <ValidationSummary problems={problems} hiddenCount={hiddenProblemCount} onSelect={selectProblem} />
              <JsonPreview value={exportShape} />
            </div>
          </Section>
        </div>
      </DialogueEditorContext>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete dialogue?"
          message={`Delete dialogue "${baseline.name}"? This can't be undone.`}
          confirmLabel="Delete dialogue"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
        />
      )}

      <UnsavedChangesDialog blocker={blocker} name={title} />
    </AppShell>
  )
}

// ---------- Helpers ----------

// The details part of a saved dialogue
function pickDetails(dialogue) {
  return {
    name: dialogue.name,
    key: dialogue.key,
    description: dialogue.description ?? '',
    speakerBlueprint: dialogue.speakerBlueprint ?? '',
    itemBlueprint: dialogue.itemBlueprint ?? '',
  }
}

// The dialogue as one object, from the editor's separate pieces of state
function combineDialogue(details, nodes, edges) {
  return {
    name: details.name,
    key: details.key,
    description: details.description,
    speakerBlueprint: details.speakerBlueprint,
    itemBlueprint: details.itemBlueprint,
    nodes: nodes,
    edges: edges,
  }
}

// Everything that counts as "a change", as one string that can be compared with ===
function snapshot(details, nodes, edges) {
  return JSON.stringify({ details: details, graph: toStoredGraph(nodes, edges) })
}

// The blueprint a new dialogue starts with: the preferred one if it exists, else the first, else none
function preferredBlueprint(blueprints, preferredId) {
  const exists = blueprints.some((blueprint) => blueprint.id === preferredId)
  if (exists) {
    return preferredId
  }
  if (blueprints.length > 0) {
    return blueprints[0].id
  }
  return ''
}

/**
 * What the editor starts with: a saved dialogue, an imported one, or a blank one.
 * Returns { saved, details, nodes, edges, json }, where json is the snapshot that counts as "no changes".
 */
function startingState(dialogueKey, dialogues, blueprints, imported) {
  let saved = null
  if (dialogueKey) {
    saved = dialogues.find((dialogue) => dialogue.key === dialogueKey) ?? null
  }

  const blankDetails = {
    name: '',
    key: '',
    description: '',
    speakerBlueprint: preferredBlueprint(blueprints, 'entity'),
    itemBlueprint: preferredBlueprint(blueprints, 'item'),
  }
  const blankGraph = createDialogueGraph()

  let graph = blankGraph
  let details = blankDetails
  if (saved) {
    graph = saved
    details = pickDetails(saved)
  } else if (imported) {
    graph = imported
    // The imported details replace the blank ones, one by one
    details = { ...blankDetails, ...imported.details }
  }
  const nodes = toCanvasNodes(graph.nodes)

  // A saved dialogue starts out unchanged; an imported or duplicated one counts as unsaved changes
  let json = snapshot(blankDetails, toCanvasNodes(blankGraph.nodes), blankGraph.edges)
  if (saved) {
    json = snapshot(details, nodes, graph.edges)
  }

  return { saved: saved, details: details, nodes: nodes, edges: graph.edges, json: json }
}

// Dropdown options for picking one of a blueprint's assets, or null when no blueprint is chosen
function assetOptionsFor(blueprints, assets, blueprintId) {
  const blueprint = blueprints.find((candidate) => candidate.id === blueprintId)
  if (!blueprint) {
    return null
  }

  const options = []
  for (const asset of assets) {
    if (asset.schemaId === blueprint.id) {
      options.push({ value: asset.key, label: assetLabel(asset, blueprint) })
    }
  }
  return options
}

// The graph's problems sorted by node: { [nodeId]: [problem, …] }. Dialogue-wide problems are left out.
function groupProblemsByNode(problems) {
  const byNode = {}
  for (const problem of problems) {
    if (!problem.nodeId) {
      continue
    }
    if (!byNode[problem.nodeId]) {
      byNode[problem.nodeId] = []
    }
    byNode[problem.nodeId].push(problem)
  }
  return byNode
}

// The status bar text, e.g. "Saved Sep 13, 2026, 1:20 PM · 2 problems"
function statusText(submitted, detailProblemCount, isDirty, baseline, graphProblemCount) {
  if (submitted && detailProblemCount > 0) {
    return plural(detailProblemCount, 'problem')
  }

  let text = 'Not saved yet'
  if (isDirty) {
    text = 'Unsaved changes'
  } else if (baseline) {
    text = `Saved ${formatDateTime(baseline.updatedAt)}`
  }

  if (graphProblemCount > 0) {
    text = `${text} · ${plural(graphProblemCount, 'problem')}`
  }
  return text
}

export default DialogueEditorPage
