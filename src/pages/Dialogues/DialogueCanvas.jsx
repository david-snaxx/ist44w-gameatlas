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
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Button from '../../components/Button/Button.jsx'
import Checkbox from '../../components/form/Checkbox.jsx'
import { ADDABLE_NODE_TYPES, createNode, edgeId, NODE_TYPES } from '../../data/dialogueGraph.js'
import { cx } from '../../utils/cx.js'
import { NODE_ICONS } from './nodeIcons.js'
import { nodeTypes } from './nodeTypes.js'
import styles from './DialogueCanvas.module.css'

const MENU_WIDTH = 260
const MENU_HEIGHT = 300

/** Each output leads to exactly one next step, so a new connection replaces the old one from the same output. */
function connectOnce(edges, { source, sourceHandle, target }) {
  const handle = sourceHandle ?? 'next'
  const others = edges.filter((edge) => !(edge.source === source && (edge.sourceHandle ?? 'next') === handle))
  return addEdge({ id: edgeId(source, handle, target), source, sourceHandle: handle, target }, others)
}

/**
 * The dialogue tree canvas. The editor page owns `nodes` and `edges`; React Flow reports every change
 * (dragging, selecting, deleting, typing inside nodes) through the change handlers below.
 */
function DialogueCanvas({ nodes, edges, setNodes, setEdges }) {
  const { fitView, screenToFlowPosition } = useReactFlow()
  const nodesInitialized = useNodesInitialized()
  const hasFittedRef = useRef(false)
  const wrapperRef = useRef(null)
  const menuRef = useRef(null)

  // Fit the whole tree into view once, after React Flow has measured every node
  // (fitting earlier uses zero-size nodes and zooms in far too much)
  useEffect(() => {
    if (!nodesInitialized || hasFittedRef.current) return
    hasFittedRef.current = true
    fitView({ padding: 0.15, maxZoom: 1 })
  }, [nodesInitialized, fitView])
  const [animated, setAnimated] = useState(false)
  // Set when a connection is dropped on empty canvas: { source, sourceHandle, x, y } (screen position)
  const [pendingConnection, setPendingConnection] = useState(null)

  const onNodesChange = useCallback((changes) => setNodes((current) => applyNodeChanges(changes, current)), [setNodes])
  const onEdgesChange = useCallback((changes) => setEdges((current) => applyEdgeChanges(changes, current)), [setEdges])
  const onConnect = useCallback((connection) => setEdges((current) => connectOnce(current, connection)), [setEdges])

  const onConnectEnd = useCallback(
    (event, connectionState) => {
      if (connectionState.isValid || !connectionState.fromNode || connectionState.fromHandle?.type !== 'source') return
      const point = 'changedTouches' in event ? event.changedTouches[0] : event
      const source = connectionState.fromNode.id
      const sourceHandle = connectionState.fromHandle.id ?? 'next'

      // Dropped on a node (not exactly on its handle): connect to that node
      const nodeElement = document.elementFromPoint(point.clientX, point.clientY)?.closest('.react-flow__node')
      const targetId = nodeElement?.getAttribute('data-id')
      const target = nodes.find((node) => node.id === targetId)
      if (target) {
        if (target.id !== source && target.type !== 'start') {
          setEdges((current) => connectOnce(current, { source, sourceHandle, target: target.id }))
        }
        return
      }

      // Dropped on empty canvas: offer to create the next step right there
      setPendingConnection({ source, sourceHandle, x: point.clientX, y: point.clientY })
    },
    [nodes, setEdges],
  )

  // Close the "Add next step" menu on a click outside it
  useEffect(() => {
    if (!pendingConnection) return
    function close(event) {
      if (!menuRef.current.contains(event.target)) setPendingConnection(null)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [pendingConnection])

  /** Adds a node at a screen position (and optionally connects an output to it), then selects it. */
  function addNode(type, screenPoint, connectFrom) {
    const position = screenToFlowPosition(screenPoint)
    const node = { ...createNode(type, nodes, { x: position.x, y: position.y - 14 }), selected: true }
    setNodes((current) => [...current.map((existing) => ({ ...existing, selected: false })), node])
    if (connectFrom) setEdges((current) => connectOnce(current, { ...connectFrom, target: node.id }))
  }

  function addNodeInView(type) {
    const rect = wrapperRef.current.getBoundingClientRect()
    // Nudge each new node a little so repeated clicks don't stack nodes exactly on top of each other
    const nudge = (nodes.length % 6) * 24
    addNode(type, { x: rect.left + rect.width / 2 - 130 + nudge, y: rect.top + rect.height / 3 + nudge })
  }

  const displayEdges = animated ? edges.map((edge) => ({ ...edge, animated: true })) : edges

  return (
    <div ref={wrapperRef} className={styles.canvas}>
      <ReactFlow
        nodes={nodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        isValidConnection={(connection) => connection.source !== connection.target}
        colorMode="dark"
        minZoom={0.3}
        maxZoom={1.75}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />

        <FlowPanel position="top-left" className={cx('glass', styles.toolbar)}>
          <div className={styles.toolbarRow}>
            <span className={styles.toolbarLabel}>Add</span>
            {ADDABLE_NODE_TYPES.map((type) => (
              <Button
                key={type}
                variant="ghost"
                icon={NODE_ICONS[type]}
                title={NODE_TYPES[type].description}
                onClick={() => addNodeInView(type)}
              >
                {NODE_TYPES[type].label}
              </Button>
            ))}
          </div>
          <div className={cx(styles.toolbarRow, styles.toolbarFooter)}>
            <span className={styles.hint}>Drag from a dot to connect. Drop on empty space to add the next step.</span>
            <span className="small muted">Animate flow</span>
            <Checkbox checked={animated} onChange={setAnimated} />
          </div>
        </FlowPanel>
      </ReactFlow>

      {pendingConnection &&
        createPortal(
          <div
            ref={menuRef}
            className={cx('glass', styles.menu)}
            style={{
              left: Math.min(pendingConnection.x, window.innerWidth - MENU_WIDTH - 8),
              top: Math.min(pendingConnection.y, window.innerHeight - MENU_HEIGHT - 8),
            }}
          >
            <p className={styles.menuTitle}>Add next step</p>
            {ADDABLE_NODE_TYPES.map((type) => {
              const Icon = NODE_ICONS[type]
              return (
                <button
                  key={type}
                  type="button"
                  className={styles.menuItem}
                  onClick={() => {
                    const { source, sourceHandle, x, y } = pendingConnection
                    addNode(type, { x, y }, { source, sourceHandle })
                    setPendingConnection(null)
                  }}
                >
                  <Icon size={16} />
                  <span>
                    {NODE_TYPES[type].label}
                    <span className={styles.menuDescription}>{NODE_TYPES[type].description}</span>
                  </span>
                </button>
              )
            })}
          </div>,
          document.body,
        )}
    </div>
  )
}

export default DialogueCanvas
