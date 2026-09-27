import { toSnakeCase } from '../schema/blueprintDraft.js'
import { BLUEPRINT_ID_PATTERN, PROPERTY_KEY_PATTERN } from '../schema/validation.js'
import { uniqueKey } from '../utils/uniqueKey.js'
import { referenceKeysFor } from './assetData.js'

/*
 * Dialogue trees.
 *
 * A saved dialogue: { id, key, name, description, speakerBlueprint, itemBlueprint, nodes, edges, createdAt, updatedAt }
 *   nodes: [{ id, type, position: { x, y }, data }]      (the canvas layout is kept, but never exported)
 *   edges: [{ id, source, sourceHandle, target }]        (sourceHandle says which output the connection leaves from)
 *
 * Node types and their outputs:
 *   start      -> "next"                      line   -> "next"   (data: speaker, text)
 *   choice     -> "option:<responseId>" each  (data: options [{ id, text }])
 *   condition  -> "yes" and "no"              (data: flag)
 *   action     -> "next"                      (data: action "giveItem" { item, quantity } or "setFlag" { flag, value })
 *   end        -> nothing
 */

export const NODE_TYPES = {
  start: { label: 'Start', description: 'Where the conversation begins.' },
  line: { label: 'Line', description: 'A character or the narrator says something.' },
  choice: { label: 'Player choice', description: 'The player picks one of several responses.' },
  condition: { label: 'Check flag', description: 'Goes one of two ways depending on a story flag.' },
  action: { label: 'Action', description: 'Gives the player an item or sets a story flag.' },
  end: { label: 'End', description: 'The conversation ends here.' },
}

// Node types the writer can add (there's always exactly one Start)
export const ADDABLE_NODE_TYPES = ['line', 'choice', 'condition', 'action', 'end']

export const ACTION_TYPES = [
  { value: 'giveItem', label: 'Give item' },
  { value: 'setFlag', label: 'Set story flag' },
]

// Story flags follow the same rule as property IDs
const FLAG_PATTERN = PROPERTY_KEY_PATTERN

export function edgeId(source, sourceHandle, target) {
  return `${source}:${sourceHandle}->${target}`
}

// Which output a connection leaves from. Older connections without one leave from "next".
function handleOf(edge) {
  return edge.sourceHandle ?? 'next'
}

// ---------- Creating nodes ----------

/** The first free ID like "line_1", "line_2", … These IDs appear in exported files. */
function nextNodeId(nodes, type) {
  const takenIds = []
  for (const node of nodes) {
    takenIds.push(node.id)
  }

  let number = 1
  while (takenIds.includes(`${type}_${number}`)) {
    number++
  }
  return `${type}_${number}`
}

/** The next free response ID within one choice, e.g. "response_3". */
export function nextResponseId(options) {
  const takenIds = []
  for (const option of options) {
    takenIds.push(option.id)
  }

  let number = 1
  while (takenIds.includes(`response_${number}`)) {
    number++
  }
  return `response_${number}`
}

function defaultNodeData(type) {
  switch (type) {
    case 'line':
      return { speaker: '', text: '' }
    case 'choice':
      return {
        options: [
          { id: 'response_1', text: '' },
          { id: 'response_2', text: '' },
        ],
      }
    case 'condition':
      return { flag: '' }
    case 'action':
      return { action: 'giveItem', item: '', quantity: 1, flag: '', value: true }
    default:
      return {}
  }
}

export function createNode(type, existingNodes, position) {
  return { id: nextNodeId(existingNodes, type), type: type, position: position, data: defaultNodeData(type) }
}

/** What a brand-new dialogue starts with: Start connected to one empty line. */
export function createDialogueGraph() {
  return {
    nodes: [
      { id: 'start', type: 'start', position: { x: 0, y: 60 }, data: {} },
      { id: 'line_1', type: 'line', position: { x: 220, y: 0 }, data: defaultNodeData('line') },
    ],
    edges: [{ id: edgeId('start', 'next', 'line_1'), source: 'start', sourceHandle: 'next', target: 'line_1' }],
  }
}

// ---------- Reading nodes ----------

/** A short name for a node in problem lists, e.g. `Line “Ah, a traveler…”`. */
export function nodeLabel(node) {
  const typeLabel = NODE_TYPES[node.type]?.label ?? node.type

  if (node.type === 'line') {
    const text = node.data.text?.trim()
    if (text) {
      let preview = text
      if (text.length > 28) {
        preview = `${text.slice(0, 28)}…`
      }
      return `${typeLabel} “${preview}”`
    }
  }

  return `${typeLabel} (${node.id})`
}

export function countNodes(nodes, type) {
  let count = 0
  for (const node of nodes) {
    if (node.type === type) {
      count++
    }
  }
  return count
}

// ---------- Canvas <-> storage ----------

/** Strips React Flow's runtime fields (selected, measured, dragging…) so only real content is saved. */
export function toStoredGraph(nodes, edges) {
  const storedNodes = []
  for (const node of nodes) {
    storedNodes.push({
      id: node.id,
      type: node.type,
      position: { x: Math.round(node.position.x), y: Math.round(node.position.y) },
      data: node.data,
    })
  }

  const storedEdges = []
  for (const edge of edges) {
    storedEdges.push({ id: edge.id, source: edge.source, sourceHandle: handleOf(edge), target: edge.target })
  }

  return { nodes: storedNodes, edges: storedEdges }
}

/** Stored nodes -> canvas nodes. Start can't be deleted. */
export function toCanvasNodes(nodes) {
  const canvasNodes = []
  for (const node of nodes) {
    if (node.type === 'start') {
      canvasNodes.push({ ...node, deletable: false })
    } else {
      canvasNodes.push(node)
    }
  }
  return canvasNodes
}

// ---------- Export ----------

/**
 * The engine-facing dialogue file. Every node says where it leads with `next` (or one field per branch);
 * canvas positions and editor-only fields are left out.
 */
export function toDialogueExport(dialogue) {
  const nodes = dialogue.nodes
  const edges = dialogue.edges

  const file = { id: dialogue.key, type: 'dialogue', name: dialogue.name }
  if (dialogue.description?.trim()) {
    file.description = dialogue.description.trim()
  }
  file.speakerBlueprint = dialogue.speakerBlueprint || null
  file.itemBlueprint = dialogue.itemBlueprint || null

  const start = nodes.find((node) => node.type === 'start')
  file.startNode = null
  if (start) {
    file.startNode = findNext(edges, start.id, 'next')
  }

  file.nodes = []
  for (const node of nodes) {
    if (node.type !== 'start') {
      file.nodes.push(exportNode(node, edges))
    }
  }
  return file
}

// The ID of the node that an output leads to, or null when it isn't connected
function findNext(edges, nodeId, handle) {
  for (const edge of edges) {
    if (edge.source === nodeId && handleOf(edge) === handle) {
      return edge.target
    }
  }
  return null
}

// One node in the shape of the exported file
function exportNode(node, edges) {
  const data = node.data ?? {}

  switch (node.type) {
    case 'line':
      return {
        id: node.id,
        type: 'line',
        speaker: data.speaker || null,
        text: data.text ?? '',
        next: findNext(edges, node.id, 'next'),
      }

    case 'choice': {
      const responses = []
      for (const option of data.options ?? []) {
        responses.push({
          id: option.id,
          text: option.text ?? '',
          next: findNext(edges, node.id, `option:${option.id}`),
        })
      }
      return { id: node.id, type: 'choice', responses: responses }
    }

    case 'condition':
      return {
        id: node.id,
        type: 'checkFlag',
        flag: data.flag ?? '',
        ifSet: findNext(edges, node.id, 'yes'),
        ifNotSet: findNext(edges, node.id, 'no'),
      }

    case 'action':
      if (data.action === 'setFlag') {
        return {
          id: node.id,
          type: 'setFlag',
          flag: data.flag ?? '',
          value: Boolean(data.value),
          next: findNext(edges, node.id, 'next'),
        }
      }
      return {
        id: node.id,
        type: 'giveItem',
        item: data.item || null,
        // A missing or unreadable quantity counts as 1
        quantity: Number(data.quantity) || 1,
        next: findNext(edges, node.id, 'next'),
      }

    default:
      return { id: node.id, type: 'end' }
  }
}

// ---------- Validation ----------

/** Name and ID checks. details: { name, key }. Returns { name?, key? }. */
export function validateDialogueDetails(details, otherKeys) {
  const errors = {}
  if (!details.name.trim()) {
    errors.name = 'Enter a name'
  }
  if (!details.key) {
    errors.key = 'Enter an ID'
  } else if (!BLUEPRINT_ID_PATTERN.test(details.key)) {
    errors.key = 'Start with a lowercase letter, then use lowercase letters, numbers or underscores'
  } else if (otherKeys.includes(details.key)) {
    errors.key = 'Another dialogue already uses this ID'
  }
  return errors
}

/**
 * What validateDialogueGraph needs to know about the rest of the project:
 * { blueprintIds: every blueprint ID, assetKeys: { [blueprintId]: [asset keys] } }
 */
export function dialogueCheckContext(blueprints, assets) {
  const blueprintIds = []
  for (const blueprint of blueprints) {
    blueprintIds.push(blueprint.id)
  }
  return { blueprintIds: blueprintIds, assetKeys: referenceKeysFor(blueprints, assets) }
}

/**
 * Checks the tree. Returns a list of problems: [{ id, nodeId, message }] (nodeId is null for dialogue-wide problems).
 * context (optional): { blueprintIds: every blueprint ID, assetKeys: { [blueprintId]: [asset keys] } }
 */
export function validateDialogueGraph(dialogue, context = {}) {
  const blueprintIds = context.blueprintIds ?? []
  const assetKeys = context.assetKeys ?? {}
  const nodes = dialogue.nodes
  const edges = dialogue.edges

  const problems = []

  // node is null for a problem with the whole dialogue
  function addProblem(node, message) {
    const nodeId = node?.id ?? null
    const idPrefix = nodeId ?? 'dialogue'
    problems.push({ id: `${idPrefix}-${problems.length}`, nodeId: nodeId, message: message })
  }

  function checkFlag(node, flag) {
    if (!flag?.trim()) {
      addProblem(node, 'Enter a story flag')
    } else if (!FLAG_PATTERN.test(flag)) {
      addProblem(node, 'Story flags start with a letter, then use letters, numbers or underscores')
    }
  }

  function isConnected(node, handle) {
    return isOutputConnected(nodes, edges, node.id, handle)
  }

  if (dialogue.speakerBlueprint && !blueprintIds.includes(dialogue.speakerBlueprint)) {
    addProblem(null, 'The speaker blueprint no longer exists')
  }
  if (dialogue.itemBlueprint && !blueprintIds.includes(dialogue.itemBlueprint)) {
    addProblem(null, 'The item blueprint no longer exists')
  }
  if (countNodes(nodes, 'end') === 0) {
    addProblem(null, 'Add an End so the conversation can finish')
  }

  const start = nodes.find((node) => node.type === 'start')
  const reachableIds = findReachableIds(start, edges)
  const speakerKeys = assetKeys[dialogue.speakerBlueprint] ?? []
  const itemKeys = assetKeys[dialogue.itemBlueprint] ?? []

  for (const node of nodes) {
    const data = node.data ?? {}

    switch (node.type) {
      case 'start':
        if (!isConnected(node, 'next')) {
          addProblem(node, 'Connect Start to the first line')
        }
        break

      case 'line':
        if (!data.text?.trim()) {
          addProblem(node, 'Write what is said')
        }
        if (data.speaker && !speakerKeys.includes(data.speaker)) {
          addProblem(node, 'That speaker no longer exists')
        }
        if (!isConnected(node, 'next')) {
          addProblem(node, 'Connect this line to what happens next')
        }
        break

      case 'choice': {
        const options = data.options ?? []
        if (options.length === 0) {
          addProblem(node, 'Add at least one response')
        }
        for (let index = 0; index < options.length; index++) {
          const option = options[index]
          const number = index + 1
          if (!option.text?.trim()) {
            addProblem(node, `Response ${number} needs text`)
          }
          if (!isConnected(node, `option:${option.id}`)) {
            addProblem(node, `Response ${number} doesn't lead anywhere`)
          }
        }
        break
      }

      case 'condition':
        checkFlag(node, data.flag)
        if (!isConnected(node, 'yes') || !isConnected(node, 'no')) {
          addProblem(node, 'Connect both “If set” and “If not set”')
        }
        break

      case 'action':
        if (data.action === 'setFlag') {
          checkFlag(node, data.flag)
        } else {
          if (!data.item) {
            addProblem(node, 'Choose an item')
          } else if (!itemKeys.includes(data.item)) {
            addProblem(node, 'That item no longer exists')
          }
          const quantity = Number(data.quantity)
          if (!Number.isInteger(quantity) || quantity < 1) {
            addProblem(node, 'Quantity must be a whole number of 1 or more')
          }
        }
        if (!isConnected(node, 'next')) {
          addProblem(node, 'Connect this action to what happens next')
        }
        break
    }

    if (node.type !== 'start' && start && !reachableIds.includes(node.id)) {
      addProblem(node, 'Nothing leads here from Start')
    }
  }

  return problems
}

// True if this output of the node has a connection to a node that exists
function isOutputConnected(nodes, edges, nodeId, handle) {
  for (const edge of edges) {
    const leavesThisOutput = edge.source === nodeId && handleOf(edge) === handle
    const targetExists = nodes.some((node) => node.id === edge.target)
    if (leavesThisOutput && targetExists) {
      return true
    }
  }
  return false
}

// The IDs of every node that can be reached by following connections from Start (Start included)
function findReachableIds(start, edges) {
  const reachable = []
  if (!start) {
    return reachable
  }

  // A to-do list of nodes to visit (a breadth-first search)
  const toVisit = [start.id]
  while (toVisit.length > 0) {
    const id = toVisit.shift()
    if (reachable.includes(id)) {
      continue
    }
    reachable.push(id)
    for (const edge of edges) {
      if (edge.source === id) {
        toVisit.push(edge.target)
      }
    }
  }
  return reachable
}

// ---------- Importing and duplicating ----------

const COLUMN_WIDTH = 320
const ROW_HEIGHT = 260

// The value if it's a string, otherwise ''
function textOrEmpty(value) {
  if (typeof value === 'string') {
    return value
  }
  return ''
}

/**
 * Lays nodes out in columns by how many steps they are from Start (download files have no positions).
 * Nodes that can't be reached go in one extra column at the end.
 */
function layoutGraph(nodes, edges) {
  // How many steps each reachable node is from Start: { nodeId: steps }
  const depth = new Map()
  depth.set('start', 0)
  const toVisit = ['start']
  while (toVisit.length > 0) {
    const id = toVisit.shift()
    for (const edge of edges) {
      if (edge.source === id && !depth.has(edge.target)) {
        depth.set(edge.target, depth.get(id) + 1)
        toVisit.push(edge.target)
      }
    }
  }

  let deepest = 0
  for (const steps of depth.values()) {
    if (steps > deepest) {
      deepest = steps
    }
  }
  const extraColumn = deepest + 1

  // How many nodes are already in each column
  const rowsUsed = new Map()
  const placed = []
  for (const node of nodes) {
    const column = depth.get(node.id) ?? extraColumn
    const row = rowsUsed.get(column) ?? 0
    rowsUsed.set(column, row + 1)
    placed.push({ ...node, position: { x: column * COLUMN_WIDTH, y: row * ROW_HEIGHT } })
  }
  return placed
}

const FILE_NODE_TYPES = ['line', 'choice', 'checkFlag', 'giveItem', 'setFlag', 'end']

/**
 * Reads a downloaded dialogue file (the shape made by toDialogueExport) back into editor form.
 * Returns { imported: { details, nodes, edges } } or { error } (a message for the user).
 */
export function parseDialogueFile(fileText) {
  let file
  try {
    file = JSON.parse(fileText)
  } catch {
    return { error: "This file couldn't be read as a dialogue." }
  }

  if (Array.isArray(file)) {
    return { error: 'This file holds several dialogues. Import them one at a time, or restore a full backup in Settings.' }
  }
  if (!file || typeof file !== 'object' || file.type !== 'dialogue' || !Array.isArray(file.nodes)) {
    return { error: "This file isn't a GameAtlas dialogue." }
  }

  // Every step needs a known type and its own ID
  const ids = []
  for (const fileNode of file.nodes) {
    if (!fileNode || typeof fileNode.id !== 'string' || !FILE_NODE_TYPES.includes(fileNode.type)) {
      return { error: `This dialogue has a step GameAtlas doesn't know: "${fileNode?.type}".` }
    }
    if (ids.includes(fileNode.id) || fileNode.id === 'start') {
      return { error: `Two steps share the ID "${fileNode.id}".` }
    }
    ids.push(fileNode.id)
  }

  const nodes = [{ id: 'start', type: 'start', data: {} }]
  const edges = []

  // Only connect to steps that exist; anything else stays unconnected and shows up in the checks
  function connect(source, sourceHandle, target) {
    if (typeof target === 'string' && ids.includes(target)) {
      edges.push({ id: edgeId(source, sourceHandle, target), source: source, sourceHandle: sourceHandle, target: target })
    }
  }

  connect('start', 'next', file.startNode)

  for (const fileNode of file.nodes) {
    const id = fileNode.id

    switch (fileNode.type) {
      case 'line':
        nodes.push({ id: id, type: 'line', data: { speaker: textOrEmpty(fileNode.speaker), text: textOrEmpty(fileNode.text) } })
        connect(id, 'next', fileNode.next)
        break

      case 'choice': {
        let responses = []
        if (Array.isArray(fileNode.responses)) {
          responses = fileNode.responses
        }
        const options = []
        for (let index = 0; index < responses.length; index++) {
          const response = responses[index]
          // Responses without an ID get one from their position
          let responseId = `response_${index + 1}`
          if (typeof response?.id === 'string' && response.id) {
            responseId = response.id
          }
          options.push({ id: responseId, text: textOrEmpty(response?.text) })
        }
        nodes.push({ id: id, type: 'choice', data: { options: options } })
        for (let index = 0; index < options.length; index++) {
          connect(id, `option:${options[index].id}`, responses[index]?.next)
        }
        break
      }

      case 'checkFlag':
        nodes.push({ id: id, type: 'condition', data: { flag: textOrEmpty(fileNode.flag) } })
        connect(id, 'yes', fileNode.ifSet)
        connect(id, 'no', fileNode.ifNotSet)
        break

      case 'giveItem': {
        let quantity = 1
        if (Number.isInteger(fileNode.quantity)) {
          quantity = fileNode.quantity
        }
        nodes.push({
          id: id,
          type: 'action',
          data: { action: 'giveItem', item: textOrEmpty(fileNode.item), quantity: quantity, flag: '', value: true },
        })
        connect(id, 'next', fileNode.next)
        break
      }

      case 'setFlag':
        nodes.push({
          id: id,
          type: 'action',
          // Only an explicit false turns the flag off
          data: { action: 'setFlag', item: '', quantity: 1, flag: textOrEmpty(fileNode.flag), value: fileNode.value !== false },
        })
        connect(id, 'next', fileNode.next)
        break

      default:
        nodes.push({ id: id, type: 'end', data: {} })
    }
  }

  return {
    imported: {
      details: {
        name: textOrEmpty(file.name),
        key: textOrEmpty(file.id),
        description: textOrEmpty(file.description),
        speakerBlueprint: textOrEmpty(file.speakerBlueprint),
        itemBlueprint: textOrEmpty(file.itemBlueprint),
      },
      nodes: layoutGraph(nodes, edges),
      edges: edges,
    },
  }
}

/**
 * Navigation state that opens the dialogue editor pre-filled with a copy of `dialogue` (layout included).
 * Nothing is saved until the user saves. The copy's ID follows its name until edited.
 */
export function duplicateDialogueState(dialogue, existingKeys) {
  const name = `${dialogue.name} (copy)`

  let baseKey = toSnakeCase(name)
  if (!baseKey) {
    baseKey = `${dialogue.key}_copy`
  }

  return {
    imported: {
      details: {
        name: name,
        key: uniqueKey(baseKey, existingKeys),
        description: dialogue.description ?? '',
        speakerBlueprint: dialogue.speakerBlueprint ?? '',
        itemBlueprint: dialogue.itemBlueprint ?? '',
      },
      nodes: dialogue.nodes,
      edges: dialogue.edges,
    },
    origin: 'duplicate',
    originName: dialogue.name,
  }
}

// ---------- Keeping links up to date ----------

/**
 * Which of the node's fields points at this asset: 'speaker', 'item', or null for neither.
 * Both the rename and the "is it used?" check go through here so they can't drift apart.
 */
function assetLinkIn(node, dialogue, blueprintId, key) {
  if (node.type === 'line' && dialogue.speakerBlueprint === blueprintId && node.data.speaker === key) {
    return 'speaker'
  }
  if (node.type === 'action' && dialogue.itemBlueprint === blueprintId && node.data.item === key) {
    return 'item'
  }
  return null
}

/** Does this dialogue use the asset, as a speaker or as a given item? */
export function dialogueLinksToAsset(dialogue, blueprintId, key) {
  for (const node of dialogue.nodes) {
    if (assetLinkIn(node, dialogue, blueprintId, key) !== null) {
      return true
    }
  }
  return false
}

/** A copy of the dialogue with links to a renamed asset updated, or null if nothing linked to it. */
export function renameAssetInDialogue(dialogue, blueprintId, fromKey, toKey) {
  let changed = false
  const nodes = []

  for (const node of dialogue.nodes) {
    const linkField = assetLinkIn(node, dialogue, blueprintId, fromKey)
    if (!linkField) {
      nodes.push(node)
      continue
    }
    changed = true
    // A copy of the node whose speaker (or item) is the new key
    const data = { ...node.data, [linkField]: toKey }
    nodes.push({ ...node, data: data })
  }

  if (!changed) {
    return null
  }
  return { ...dialogue, nodes: nodes }
}
