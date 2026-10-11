import { Handle, Position, useReactFlow, useUpdateNodeInternals } from '@xyflow/react'
import { Plus, X } from 'lucide-react'
import { useEffect } from 'react'
import Button from '../../components/Button/Button.jsx'
import Checkbox from '../../components/form/Checkbox.jsx'
import NumberInput from '../../components/form/NumberInput.jsx'
import PropertyRow from '../../components/form/PropertyRow.jsx'
import Select from '../../components/form/Select.jsx'
import TextArea from '../../components/form/TextArea.jsx'
import TextInput from '../../components/form/TextInput.jsx'
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl.jsx'
import { ACTION_TYPES, NODE_TYPES, nextResponseId } from '../../data/dialogueGraph.js'
import { useDialogueEditor } from './DialogueEditorContext.js'
import { NODE_ICONS } from './nodeIcons.js'
import styles from './DialogueNodes.module.css'

/*
 * Custom React Flow nodes. React Flow renders these with { id, data, selected }.
 * Inputs change node data with updateNodeData(id, changes), which merges the changes into the node's
 * data and flows back to the editor page's state.
 * The "nodrag"/"nowheel" classes stop typing, selecting text and scrolling from dragging or zooming the canvas.
 */

/** The shared frame: header (icon, type, delete button, handles), body, and the node's problems. */
function NodeShell({ id, type, selected, hasInput = true, output, children }) {
  const { problemsByNode } = useDialogueEditor()
  const { deleteElements } = useReactFlow()
  const problems = problemsByNode[id] ?? []
  const Icon = NODE_ICONS[type]
  const label = NODE_TYPES[type].label

  const classNames = [styles.node, styles[type]]
  if (selected) {
    classNames.push(styles.selected)
  }
  if (problems.length > 0) {
    classNames.push(styles.invalid)
  }

  return (
    <div className={classNames.join(' ')}>
      <div className={styles.header}>
        {hasInput && <Handle type="target" position={Position.Left} className={styles.handle} />}
        <Icon size={14} />
        <span className={styles.title}>{label}</span>
        {type !== 'start' && (
          <Button
            variant="ghost"
            icon={X}
            title="Delete"
            className="nodrag"
            onClick={() => deleteElements({ nodes: [{ id: id }] })}
          />
        )}
        {output && <Handle type="source" position={Position.Right} id={output} className={styles.handle} />}
      </div>
      {children && <div className={`nodrag nowheel ${styles.body}`}>{children}</div>}
      {problems.length > 0 && (
        <div className={styles.problems}>
          {problems.map((problem) => (
            <p key={problem.id} className="field-error">
              {problem.message}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

export function StartNode({ id, selected }) {
  return <NodeShell id={id} type="start" selected={selected} hasInput={false} output="next" />
}

export function LineNode({ id, data, selected }) {
  const { updateNodeData } = useReactFlow()
  const { speakerOptions } = useDialogueEditor()

  // No speaker blueprint chosen for the dialogue: everything is said by the narrator
  let speakerSelect = <Select disabled options={[]} value="" onChange={() => {}} placeholder="Narrator" />
  if (speakerOptions) {
    speakerSelect = (
      <Select
        options={[{ value: '', label: 'Narrator' }, ...speakerOptions]}
        value={data.speaker ?? ''}
        onChange={(speaker) => updateNodeData(id, { speaker: speaker })}
      />
    )
  }

  return (
    <NodeShell id={id} type="line" selected={selected} output="next">
      <PropertyRow label="Speaker">{speakerSelect}</PropertyRow>
      <PropertyRow label="Text">
        <TextArea
          placeholder="What do they say?"
          value={data.text ?? ''}
          onChange={(event) => updateNodeData(id, { text: event.target.value })}
        />
      </PropertyRow>
    </NodeShell>
  )
}

export function ChoiceNode({ id, data, selected }) {
  const { updateNodeData, setEdges } = useReactFlow()
  const updateNodeInternals = useUpdateNodeInternals()
  const options = data.options ?? []

  // Each response has its own output handle; when responses are added or removed, React Flow must re-measure them
  useEffect(() => {
    updateNodeInternals(id)
  }, [id, options.length, updateNodeInternals])

  function setOptions(nextOptions) {
    updateNodeData(id, { options: nextOptions })
  }

  function changeResponseText(optionId, text) {
    const nextOptions = []
    for (const option of options) {
      if (option.id === optionId) {
        nextOptions.push({ ...option, text: text })
      } else {
        nextOptions.push(option)
      }
    }
    setOptions(nextOptions)
  }

  function removeResponse(optionId) {
    setOptions(options.filter((option) => option.id !== optionId))
    // Also remove the connection that leaves from this response's output
    setEdges((edges) => withoutEdgesFrom(edges, id, `option:${optionId}`))
  }

  function addResponse() {
    setOptions([...options, { id: nextResponseId(options), text: '' }])
  }

  const rows = []
  for (let index = 0; index < options.length; index++) {
    const option = options[index]
    rows.push(
      <ResponseRow
        key={option.id}
        option={option}
        number={index + 1}
        onChangeText={changeResponseText}
        onRemove={removeResponse}
      />,
    )
  }

  return (
    <NodeShell id={id} type="choice" selected={selected}>
      <p className="small muted">Responses</p>
      {rows}
      <Button variant="ghost" icon={Plus} onClick={addResponse}>
        Add response
      </Button>
    </NodeShell>
  )
}

/** One player response: its text, a remove button, and its own output dot on the node's edge. */
function ResponseRow({ option, number, onChangeText, onRemove }) {
  return (
    <div className={styles.outputRow}>
      <TextInput
        placeholder={`Response ${number}`}
        value={option.text}
        onChange={(event) => onChangeText(option.id, event.target.value)}
      />
      <Button variant="ghost" icon={X} title="Remove response" onClick={() => onRemove(option.id)} />
      <Handle type="source" position={Position.Right} id={`option:${option.id}`} className={styles.handle} />
    </div>
  )
}

export function ConditionNode({ id, data, selected }) {
  const { updateNodeData } = useReactFlow()
  const branchClass = `${styles.outputRow} ${styles.branch}`

  return (
    <NodeShell id={id} type="condition" selected={selected}>
      <PropertyRow label="Story flag">
        <TextInput
          placeholder="met_merchant"
          value={data.flag ?? ''}
          onChange={(event) => updateNodeData(id, { flag: event.target.value })}
        />
      </PropertyRow>
      <div className={branchClass}>
        If set
        <Handle type="source" position={Position.Right} id="yes" className={styles.handle} />
      </div>
      <div className={branchClass}>
        If not set
        <Handle type="source" position={Position.Right} id="no" className={styles.handle} />
      </div>
    </NodeShell>
  )
}

export function ActionNode({ id, data, selected }) {
  const { updateNodeData } = useReactFlow()

  // The action's own settings depend on which kind of action it is
  let settings = <GiveItemSettings id={id} data={data} />
  if (data.action === 'setFlag') {
    settings = <SetFlagSettings id={id} data={data} />
  }

  return (
    <NodeShell id={id} type="action" selected={selected} output="next">
      <SegmentedControl
        options={ACTION_TYPES}
        value={data.action ?? 'giveItem'}
        onChange={(action) => updateNodeData(id, { action: action })}
      />
      {settings}
    </NodeShell>
  )
}

/** "Set story flag": which flag, and whether it's turned on or off. */
function SetFlagSettings({ id, data }) {
  const { updateNodeData } = useReactFlow()

  return (
    <>
      <PropertyRow label="Story flag">
        <TextInput
          placeholder="met_merchant"
          value={data.flag ?? ''}
          onChange={(event) => updateNodeData(id, { flag: event.target.value })}
        />
      </PropertyRow>
      <PropertyRow label="Turn the flag on" help="Off clears the flag.">
        <Checkbox checked={Boolean(data.value)} onChange={(value) => updateNodeData(id, { value: value })} />
      </PropertyRow>
    </>
  )
}

/** "Give item": which item (from the dialogue's item blueprint), and how many. */
function GiveItemSettings({ id, data }) {
  const { updateNodeData } = useReactFlow()
  const { itemOptions } = useDialogueEditor()

  function changeQuantity(text) {
    // An empty box is kept as '' until a number is typed
    let quantity = ''
    if (text !== '') {
      quantity = Number(text)
    }
    updateNodeData(id, { quantity: quantity })
  }

  // No item blueprint chosen for the dialogue: there's nothing to pick from yet
  let itemSelect = (
    <Select disabled options={[]} value="" onChange={() => {}} placeholder="Choose an item blueprint first" />
  )
  if (itemOptions) {
    itemSelect = (
      <Select
        placeholder="Choose an item…"
        options={itemOptions}
        value={data.item ?? ''}
        onChange={(item) => updateNodeData(id, { item: item })}
      />
    )
  }

  return (
    <>
      <PropertyRow label="Item">{itemSelect}</PropertyRow>
      <PropertyRow label="Quantity">
        <NumberInput min={1} value={data.quantity ?? ''} onChange={(event) => changeQuantity(event.target.value)} />
      </PropertyRow>
    </>
  )
}

export function EndNode({ id, selected }) {
  return (
    <NodeShell id={id} type="end" selected={selected}>
      <p className="small muted">The conversation ends.</p>
    </NodeShell>
  )
}

// The edges, minus any that leave from this node's given output
function withoutEdgesFrom(edges, nodeId, handle) {
  const kept = []
  for (const edge of edges) {
    const leavesThisOutput = edge.source === nodeId && edge.sourceHandle === handle
    if (!leavesThisOutput) {
      kept.push(edge)
    }
  }
  return kept
}
