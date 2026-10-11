import '@xyflow/react/dist/style.css'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  Panel as FlowPanel,
  MiniMap,
  ReactFlow,
  useNodesInitialized,
  useReactFlow,
} from '@xyflow/react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Button from '../../components/Button/Button.jsx'
import Checkbox from '../../components/form/Checkbox.jsx'
import { ADDABLE_NODE_TYPES, createNode, edgeId, NODE_TYPES } from '../../data/dialogueGraph.js'
import { NODE_ICONS } from './nodeIcons.js'
import { nodeTypes } from './nodeTypes.js'
import styles from './DialogueCanvas.module.css'

const MENU_WIDTH = 260
const MENU_HEIGHT = 300

/**
 * The dialogue tree canvas. The editor page owns `nodes` and `edges`; React Flow reports every change
 * (dragging, selecting, deleting, typing inside nodes) through the change handlers below.
 */
function DialogueCanvas({ nodes, edges, setNodes, setEdges }) {
  const { fitView, screenToFlowPosition } = useReactFlow()
  const nodesInitialized = useNodesInitialized()
  const hasFittedRef = useRef(false)
  const wrapperRef = useRef(null)
  const [animated, setAnimated] = useState(false)
  // Set when a connection is dropped on empty canvas: { source, sourceHandle, x, y } (screen position)
  const [pendingConnection, setPendingConnection] = useState(null)

  // Fit the whole tree into view once, after React Flow has measured every node
  // (fitting earlier uses zero-size nodes and zooms in far too much)
  useEffect(() => {
    if (!nodesInitialized || hasFittedRef.current) {
      return
    }
    hasFittedRef.current = true
    fitView({ padding: 0.15, maxZoom: 1 })
  }, [nodesInitialized, fitView])

  // React Flow reports changes (moving, selecting, deleting, measuring…) and we apply them to our state.
  // The "current =>" form of setNodes gets the newest list, which matters because React Flow can
  // report several changes before the page has re-rendered.
  function handleNodesChange(changes) {
    setNodes((current) => applyNodeChanges(changes, current))
  }

  function handleEdgesChange(changes) {
    setEdges((current) => applyEdgeChanges(changes, current))
  }

  // The user dragged from an output and let go on another node's input
  function handleConnect(connection) {
    setEdges((current) => connectOnce(current, connection.source, connection.sourceHandle, connection.target))
  }

  // The user let go of a connection anywhere: on a node's body (connect to it) or on empty canvas (offer a menu)
  function handleConnectEnd(event, connectionState) {
    // A normal drop on an input is handled by handleConnect; only drags that start from an output count here
    if (connectionState.isValid || !connectionState.fromNode || connectionState.fromHandle?.type !== 'source') {
      return
    }

    // Touch screens report the finger's position differently from a mouse
    let point = event
    if ('changedTouches' in event) {
      point = event.changedTouches[0]
    }
    const source = connectionState.fromNode.id
    const sourceHandle = connectionState.fromHandle.id ?? 'next'

    // Dropped on a node (not exactly on its input dot): connect to that node
    const target = findNodeAt(point, nodes)
    if (target) {
      if (target.id !== source && target.type !== 'start') {
        setEdges(connectOnce(edges, source, sourceHandle, target.id))
      }
      return
    }

    // Dropped on empty canvas: offer to create the next step right there
    setPendingConnection({ source: source, sourceHandle: sourceHandle, x: point.clientX, y: point.clientY })
  }

  // A node can't connect to itself
  function isValidConnection(connection) {
    return connection.source !== connection.target
  }

  /** Adds a node at a screen position, selects it, and (if given) connects an output to it. */
  function addNode(type, screenPoint, connectFrom) {
    const position = screenToFlowPosition(screenPoint)
    // Moved up a little so the node's header lines up with the pointer
    const node = createNode(type, nodes, { x: position.x, y: position.y - 14 })
    node.selected = true

    const nextNodes = []
    for (const existing of nodes) {
      nextNodes.push({ ...existing, selected: false })
    }
    nextNodes.push(node)
    setNodes(nextNodes)

    if (connectFrom) {
      setEdges(connectOnce(edges, connectFrom.source, connectFrom.sourceHandle, node.id))
    }
  }

  // From the toolbar: add a node in the middle of what's visible
  function addNodeInView(type) {
    const rect = wrapperRef.current.getBoundingClientRect()
    // Nudge each new node a little so repeated clicks don't stack nodes exactly on top of each other
    const nudge = (nodes.length % 6) * 24
    addNode(type, { x: rect.left + rect.width / 2 - 130 + nudge, y: rect.top + rect.height / 3 + nudge })
  }

  // From the "Add next step" menu: add the node where the connection was dropped, connected to it
  function addNextStep(type) {
    const pending = pendingConnection
    addNode(type, { x: pending.x, y: pending.y }, { source: pending.source, sourceHandle: pending.sourceHandle })
    setPendingConnection(null)
  }

  // With "Animate flow" on, every connection shows moving dashes
  let displayEdges = edges
  if (animated) {
    displayEdges = []
    for (const edge of edges) {
      displayEdges.push({ ...edge, animated: true })
    }
  }

  return (
    <div ref={wrapperRef} className={styles.canvas}>
      <ReactFlow
        nodes={nodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onConnectEnd={handleConnectEnd}
        isValidConnection={isValidConnection}
        colorMode="dark"
        minZoom={0.3}
        maxZoom={1.75}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />

        <FlowPanel position="top-left" className={`glass ${styles.toolbar}`}>
          <div className={styles.toolbarRow}>
            <span className={styles.toolbarLabel}>Add</span>
            {ADDABLE_NODE_TYPES.map((type) => (
              <AddNodeButton key={type} type={type} onAdd={addNodeInView} />
            ))}
          </div>
          <div className={`${styles.toolbarRow} ${styles.toolbarFooter}`}>
            <span className={styles.hint}>Drag from a dot to connect. Drop on empty space to add the next step.</span>
            <span className="small muted">Animate flow</span>
            <Checkbox checked={animated} onChange={setAnimated} />
          </div>
        </FlowPanel>
      </ReactFlow>

      {pendingConnection && (
        <AddStepMenu
          x={pendingConnection.x}
          y={pendingConnection.y}
          onChoose={addNextStep}
          onClose={() => setPendingConnection(null)}
        />
      )}
    </div>
  )
}

/** A toolbar button that adds one type of node. */
function AddNodeButton({ type, onAdd }) {
  return (
    <Button variant="ghost" icon={NODE_ICONS[type]} title={NODE_TYPES[type].description} onClick={() => onAdd(type)}>
      {NODE_TYPES[type].label}
    </Button>
  )
}

/** The "Add next step" menu that opens where a connection was dropped. A click outside it closes it. */
function AddStepMenu({ x, y, onChoose, onClose }) {
  const menuRef = useRef(null)

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!menuRef.current.contains(event.target)) {
        onClose()
      }
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)

    // React runs the returned function when the menu closes
    return function stopListening() {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
    }
  }, [onClose])

  // Keep the whole menu on screen
  const left = Math.min(x, window.innerWidth - MENU_WIDTH - 8)
  const top = Math.min(y, window.innerHeight - MENU_HEIGHT - 8)

  // Rendered into document.body, so the canvas can't clip it
  return createPortal(
    <div ref={menuRef} className={`glass ${styles.menu}`} style={{ left: left, top: top }}>
      <p className={styles.menuTitle}>Add next step</p>
      {ADDABLE_NODE_TYPES.map((type) => (
        <AddStepMenuItem key={type} type={type} onChoose={onChoose} />
      ))}
    </div>,
    document.body,
  )
}

/** One choice in the "Add next step" menu: the node type's icon, name and description. */
function AddStepMenuItem({ type, onChoose }) {
  const Icon = NODE_ICONS[type]
  return (
    <button type="button" className={styles.menuItem} onClick={() => onChoose(type)}>
      <Icon size={16} />
      <span>
        {NODE_TYPES[type].label}
        <span className={styles.menuDescription}>{NODE_TYPES[type].description}</span>
      </span>
    </button>
  )
}

// ---------- Helpers ----------

/**
 * Each output leads to exactly one next step, so a new connection replaces any old one from the same output.
 * Returns the new list of edges.
 */
function connectOnce(edges, source, sourceHandle, target) {
  const handle = sourceHandle ?? 'next'

  const others = []
  for (const edge of edges) {
    const edgeHandle = edge.sourceHandle ?? 'next'
    const leavesSameOutput = edge.source === source && edgeHandle === handle
    if (!leavesSameOutput) {
      others.push(edge)
    }
  }

  const newEdge = { id: edgeId(source, handle, target), source: source, sourceHandle: handle, target: target }
  return addEdge(newEdge, others)
}

// The node under a point on the screen, or undefined if the point is on empty canvas
function findNodeAt(point, nodes) {
  const element = document.elementFromPoint(point.clientX, point.clientY)
  if (!element) {
    return undefined
  }
  // React Flow draws each node in an element with class "react-flow__node" and the node's ID in data-id
  const nodeElement = element.closest('.react-flow__node')
  if (!nodeElement) {
    return undefined
  }
  const nodeId = nodeElement.getAttribute('data-id')
  return nodes.find((node) => node.id === nodeId)
}

export default DialogueCanvas
