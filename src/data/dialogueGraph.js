import { toSnakeCase } from '../schema/blueprintDraft.js'
import { BLUEPRINT_ID_PATTERN, PROPERTY_KEY_PATTERN } from '../schema/validation.js'
import { uniqueKey } from '../utils/uniqueKey.js'

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

const FLAG_PATTERN = PROPERTY_KEY_PATTERN

export const edgeId = (source, sourceHandle, target) => `${source}:${sourceHandle}->${target}`

// ---------- Creating nodes ----------

/** The next free readable node ID, e.g. "line_3". These IDs appear in exported files. */
function nextNodeId(nodes, type) {
  const taken = new Set(nodes.map((node) => node.id))
  let number = 1
  while (taken.has(`${type}_${number}`)) number++
  return `${type}_${number}`
}

/** The next free response ID within one choice, e.g. "response_3". */
export function nextResponseId(options) {
  const taken = new Set(options.map((option) => option.id))
  let number = 1
  while (taken.has(`response_${number}`)) number++
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
  return { id: nextNodeId(existingNodes, type), type, position, data: defaultNodeData(type) }
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
  const type = NODE_TYPES[node.type]?.label ?? node.type
  if (node.type === 'line' && node.data.text?.trim()) {
    const text = node.data.text.trim()
    return `${type} “${text.length > 28 ? `${text.slice(0, 28)}…` : text}”`
  }
  return `${type} (${node.id})`
}

export function countNodes(nodes, type) {
  return nodes.filter((node) => node.type === type).length
}

// ---------- Canvas <-> storage ----------

/** Strips React Flow's runtime fields (selected, measured, dragging…) so only real content is saved. */
export function toStoredGraph(nodes, edges) {
  return {
    nodes: nodes.map(({ id, type, position, data }) => ({
      id,
      type,
      position: { x: Math.round(position.x), y: Math.round(position.y) },
      data,
    })),
    edges: edges.map(({ id, source, sourceHandle, target }) => ({ id, source, sourceHandle: sourceHandle ?? 'next', target })),
  }
}

/** Stored nodes -> canvas nodes. Start can't be deleted. */
export function toCanvasNodes(nodes) {
  return nodes.map((node) => (node.type === 'start' ? { ...node, deletable: false } : node))
}

// ---------- Export ----------

/**
 * The engine-facing dialogue file. Every node says where it leads with `next` (or one field per branch);
 * canvas positions and editor-only fields are left out.
 */
export function toDialogueExport(dialogue) {
  const { nodes, edges } = dialogue
  const nextOf = (nodeId, handle) =>
    edges.find((edge) => edge.source === nodeId && (edge.sourceHandle ?? 'next') === handle)?.target ?? null
  const start = nodes.find((node) => node.type === 'start')

  const exportNode = (node) => {
    const data = node.data ?? {}
    switch (node.type) {
      case 'line':
        return { id: node.id, type: 'line', speaker: data.speaker || null, text: data.text ?? '', next: nextOf(node.id, 'next') }
      case 'choice':
        return {
          id: node.id,
          type: 'choice',
          responses: (data.options ?? []).map((option) => ({
            id: option.id,
            text: option.text ?? '',
            next: nextOf(node.id, `option:${option.id}`),
          })),
        }
      case 'condition':
        return { id: node.id, type: 'checkFlag', flag: data.flag ?? '', ifSet: nextOf(node.id, 'yes'), ifNotSet: nextOf(node.id, 'no') }
      case 'action':
        return data.action === 'setFlag'
          ? { id: node.id, type: 'setFlag', flag: data.flag ?? '', value: Boolean(data.value), next: nextOf(node.id, 'next') }
          : {
              id: node.id,
              type: 'giveItem',
              item: data.item || null,
              quantity: Number(data.quantity) || 1,
              next: nextOf(node.id, 'next'),
            }
      default:
        return { id: node.id, type: 'end' }
    }
  }

  const file = { id: dialogue.key, type: 'dialogue', name: dialogue.name }
  if (dialogue.description?.trim()) file.description = dialogue.description.trim()
  file.speakerBlueprint = dialogue.speakerBlueprint || null
  file.itemBlueprint = dialogue.itemBlueprint || null
  file.startNode = start ? nextOf(start.id, 'next') : null
  file.nodes = nodes.filter((node) => node.type !== 'start').map(exportNode)
  return file
}

// ---------- Validation ----------

/** Name and ID checks. Returns { name?, key? }. */
export function validateDialogueDetails({ name, key }, otherKeys) {
  const errors = {}
  if (!name.trim()) errors.name = 'Enter a name'
  if (!key) errors.key = 'Enter an ID'
  else if (!BLUEPRINT_ID_PATTERN.test(key)) {
    errors.key = 'Start with a lowercase letter, then use lowercase letters, numbers or underscores'
  } else if (otherKeys.includes(key)) {
    errors.key = 'Another dialogue already uses this ID'
  }
  return errors
}

/**
 * Checks the tree. Returns a list of problems: [{ id, nodeId, message }] (nodeId is null for dialogue-wide problems).
 * blueprintIds: every blueprint ID. assetKeys: { [blueprintId]: [asset keys] }.
 */
export function validateDialogueGraph(dialogue, { blueprintIds = [], assetKeys = {} } = {}) {
  const { nodes, edges, speakerBlueprint, itemBlueprint } = dialogue
  const problems = []
  const add = (node, message) => problems.push({ id: `${node?.id ?? 'dialogue'}-${problems.length}`, nodeId: node?.id ?? null, message })
  const nodeIds = new Set(nodes.map((node) => node.id))
  const isConnected = (node, handle) =>
    edges.some((edge) => edge.source === node.id && (edge.sourceHandle ?? 'next') === handle && nodeIds.has(edge.target))

  if (speakerBlueprint && !blueprintIds.includes(speakerBlueprint)) add(null, 'The speaker blueprint no longer exists')
  if (itemBlueprint && !blueprintIds.includes(itemBlueprint)) add(null, 'The item blueprint no longer exists')
  if (!nodes.some((node) => node.type === 'end')) add(null, 'Add an End so the conversation can finish')

  // Which nodes can be reached by following connections from Start
  const start = nodes.find((node) => node.type === 'start')
  const reachable = new Set()
  const queue = start ? [start.id] : []
  while (queue.length > 0) {
    const id = queue.shift()
    if (reachable.has(id)) continue
    reachable.add(id)
    for (const edge of edges) if (edge.source === id) queue.push(edge.target)
  }

  const checkFlag = (node, flag) => {
    if (!flag?.trim()) add(node, 'Enter a story flag')
    else if (!FLAG_PATTERN.test(flag)) add(node, 'Story flags start with a letter, then use letters, numbers or underscores')
  }

  for (const node of nodes) {
    const data = node.data ?? {}
    switch (node.type) {
      case 'start':
        if (!isConnected(node, 'next')) add(node, 'Connect Start to the first line')
        break
      case 'line':
        if (!data.text?.trim()) add(node, 'Write what is said')
        if (data.speaker && !(assetKeys[speakerBlueprint] ?? []).includes(data.speaker)) {
          add(node, 'That speaker no longer exists')
        }
        if (!isConnected(node, 'next')) add(node, 'Connect this line to what happens next')
        break
      case 'choice': {
        const options = data.options ?? []
        if (options.length === 0) add(node, 'Add at least one response')
        options.forEach((option, index) => {
          if (!option.text?.trim()) add(node, `Response ${index + 1} needs text`)
          if (!isConnected(node, `option:${option.id}`)) add(node, `Response ${index + 1} doesn't lead anywhere`)
        })
        break
      }
      case 'condition':
        checkFlag(node, data.flag)
        if (!isConnected(node, 'yes') || !isConnected(node, 'no')) add(node, 'Connect both “If set” and “If not set”')
        break
      case 'action':
        if (data.action === 'setFlag') {
          checkFlag(node, data.flag)
        } else {
          if (!data.item) add(node, 'Choose an item')
          else if (!(assetKeys[itemBlueprint] ?? []).includes(data.item)) add(node, 'That item no longer exists')
          const quantity = Number(data.quantity)
          if (!Number.isInteger(quantity) || quantity < 1) add(node, 'Quantity must be a whole number of 1 or more')
        }
        if (!isConnected(node, 'next')) add(node, 'Connect this action to what happens next')
        break
    }
    if (node.type !== 'start' && start && !reachable.has(node.id)) add(node, 'Nothing leads here from Start')
  }

  return problems
}

// ---------- Importing and duplicating ----------

const COLUMN_WIDTH = 320
const ROW_HEIGHT = 260
const text = (value) => (typeof value === 'string' ? value : '')

/**
 * Lays nodes out in columns by how many steps they are from Start (download files have no positions).
 * Nodes that can't be reached go in one extra column at the end.
 */
function layoutGraph(nodes, edges) {
  const depth = new Map([['start', 0]])
  const queue = ['start']
  while (queue.length > 0) {
    const id = queue.shift()
    for (const edge of edges) {
      if (edge.source === id && !depth.has(edge.target)) {
        depth.set(edge.target, depth.get(id) + 1)
        queue.push(edge.target)
      }
    }
  }
  const extraColumn = Math.max(0, ...depth.values()) + 1
  const rowsUsed = new Map()
  return nodes.map((node) => {
    const column = depth.get(node.id) ?? extraColumn
    const row = rowsUsed.get(column) ?? 0
    rowsUsed.set(column, row + 1)
    return { ...node, position: { x: column * COLUMN_WIDTH, y: row * ROW_HEIGHT } }
  })
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

  const ids = new Set()
  for (const fileNode of file.nodes) {
    if (!fileNode || typeof fileNode.id !== 'string' || !FILE_NODE_TYPES.includes(fileNode.type)) {
      return { error: `This dialogue has a step GameAtlas doesn't know: "${fileNode?.type}".` }
    }
    if (ids.has(fileNode.id) || fileNode.id === 'start') return { error: `Two steps share the ID "${fileNode.id}".` }
    ids.add(fileNode.id)
  }

  const nodes = [{ id: 'start', type: 'start', data: {} }]
  const edges = []
  // Only connect to steps that exist; anything else stays unconnected and shows up in the checks
  const connect = (source, sourceHandle, target) => {
    if (typeof target === 'string' && ids.has(target)) {
      edges.push({ id: edgeId(source, sourceHandle, target), source, sourceHandle, target })
    }
  }
  connect('start', 'next', file.startNode)

  for (const fileNode of file.nodes) {
    const { id } = fileNode
    switch (fileNode.type) {
      case 'line':
        nodes.push({ id, type: 'line', data: { speaker: text(fileNode.speaker), text: text(fileNode.text) } })
        connect(id, 'next', fileNode.next)
        break
      case 'choice': {
        const responses = Array.isArray(fileNode.responses) ? fileNode.responses : []
        const options = responses.map((response, index) => ({
          id: typeof response?.id === 'string' && response.id ? response.id : `response_${index + 1}`,
          text: text(response?.text),
        }))
        nodes.push({ id, type: 'choice', data: { options } })
        options.forEach((option, index) => connect(id, `option:${option.id}`, responses[index]?.next))
        break
      }
      case 'checkFlag':
        nodes.push({ id, type: 'condition', data: { flag: text(fileNode.flag) } })
        connect(id, 'yes', fileNode.ifSet)
        connect(id, 'no', fileNode.ifNotSet)
        break
      case 'giveItem':
        nodes.push({
          id,
          type: 'action',
          data: {
            action: 'giveItem',
            item: text(fileNode.item),
            quantity: Number.isInteger(fileNode.quantity) ? fileNode.quantity : 1,
            flag: '',
            value: true,
          },
        })
        connect(id, 'next', fileNode.next)
        break
      case 'setFlag':
        nodes.push({
          id,
          type: 'action',
          data: { action: 'setFlag', item: '', quantity: 1, flag: text(fileNode.flag), value: fileNode.value !== false },
        })
        connect(id, 'next', fileNode.next)
        break
      default:
        nodes.push({ id, type: 'end', data: {} })
    }
  }

  return {
    imported: {
      details: {
        name: text(file.name),
        key: text(file.id),
        description: text(file.description),
        speakerBlueprint: text(file.speakerBlueprint),
        itemBlueprint: text(file.itemBlueprint),
      },
      nodes: layoutGraph(nodes, edges),
      edges,
    },
  }
}

/**
 * Navigation state that opens the dialogue editor pre-filled with a copy of `dialogue` (layout included).
 * Nothing is saved until the user saves. The copy's ID follows its name until edited.
 */
export function duplicateDialogueState(dialogue, existingKeys) {
  const name = `${dialogue.name} (copy)`
  return {
    imported: {
      details: {
        name,
        key: uniqueKey(toSnakeCase(name) || `${dialogue.key}_copy`, existingKeys),
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
  if (node.type === 'line' && dialogue.speakerBlueprint === blueprintId && node.data.speaker === key) return 'speaker'
  if (node.type === 'action' && dialogue.itemBlueprint === blueprintId && node.data.item === key) return 'item'
  return null
}

/** Does this dialogue use the asset, as a speaker or as a given item? */
export function dialogueLinksToAsset(dialogue, blueprintId, key) {
  return dialogue.nodes.some((node) => assetLinkIn(node, dialogue, blueprintId, key) !== null)
}

/** A copy of the dialogue with links to a renamed asset updated, or null if nothing linked to it. */
export function renameAssetInDialogue(dialogue, blueprintId, fromKey, toKey) {
  let changed = false
  const nodes = dialogue.nodes.map((node) => {
    const field = assetLinkIn(node, dialogue, blueprintId, fromKey)
    if (!field) return node
    changed = true
    return { ...node, data: { ...node.data, [field]: toKey } }
  })
  return changed ? { ...dialogue, nodes } : null
}
