import { Handle, Position, useReactFlow, useUpdateNodeInternals } from '@xyflow/react'
import { CircleAlert, Plus, X } from 'lucide-react'
import { useEffect } from 'react'
import Button from '../../components/Button/Button.jsx'
import NumberInput from '../../components/form/NumberInput.jsx'
import PropertyRow from '../../components/form/PropertyRow.jsx'
import Select from '../../components/form/Select.jsx'
import TextArea from '../../components/form/TextArea.jsx'
import TextInput from '../../components/form/TextInput.jsx'
import Toggle from '../../components/form/Toggle.jsx'
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl.jsx'
import { ACTION_TYPES, NODE_TYPES, nextResponseId } from '../../data/dialogueGraph.js'
import { cx } from '../../utils/cx.js'
import { useDialogueEditor } from './DialogueEditorContext.js'
import { NODE_ICONS } from './nodeIcons.js'
import styles from './DialogueNodes.module.css'

/*
 * Custom React Flow nodes. React Flow renders these with { id, data, selected }.
 * Inputs change node data with updateNodeData(id, changes), which flows back to the editor page's state.
 * The "nodrag"/"nowheel" classes stop typing, selecting text and scrolling from dragging or zooming the canvas.
 */

/** The shared frame: header (icon, type, delete button, handles), body, and the node's problems. */
function NodeShell({ id, type, selected, hasInput = true, output, children }) {
  const { problemsByNode } = useDialogueEditor()
  const { deleteElements } = useReactFlow()
  const problems = problemsByNode[id] ?? []
  const Icon = NODE_ICONS[type]
  const label = NODE_TYPES[type].label

  return (
    <div className={cx(styles.node, styles[type], selected && styles.selected, problems.length > 0 && styles.invalid)}>
      <div className={styles.header}>
        {hasInput && <Handle type="target" position={Position.Left} className={styles.handle} />}
        <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
        <span className={styles.title}>{label}</span>
        {type !== 'start' && (
          <button
            type="button"
            className={cx('nodrag', styles.remove)}
            aria-label={`Delete ${label.toLowerCase()} ${id}`}
            title="Delete"
            onClick={() => deleteElements({ nodes: [{ id }] })}
          >
            <X size={14} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
        {output && <Handle type="source" position={Position.Right} id={output} className={styles.handle} />}
      </div>
      {children && <div className={cx('nodrag', 'nowheel', styles.body)}>{children}</div>}
      {problems.length > 0 && (
        <ul className={styles.problems}>
          {problems.map((problem) => (
            <li key={problem.id}>
              <CircleAlert size={12} strokeWidth={1.75} aria-hidden="true" />
              {problem.message}
            </li>
          ))}
        </ul>
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

  return (
    <NodeShell id={id} type="line" selected={selected} output="next">
      <PropertyRow id={`${id}-speaker`} label="Speaker" layout="stacked">
        {(inputProps) =>
          speakerOptions ? (
            <Select
              {...inputProps}
              searchable
              options={[{ value: '', label: 'Narrator' }, ...speakerOptions]}
              value={data.speaker ?? ''}
              onChange={(speaker) => updateNodeData(id, { speaker })}
            />
          ) : (
            <Select {...inputProps} disabled options={[]} value="" onChange={() => {}} placeholder="Narrator" />
          )
        }
      </PropertyRow>
      <PropertyRow id={`${id}-text`} label="Text" layout="stacked">
        {(inputProps) => (
          <TextArea
            {...inputProps}
            placeholder="What do they say?"
            value={data.text ?? ''}
            onChange={(event) => updateNodeData(id, { text: event.target.value })}
          />
        )}
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

  const setOptions = (nextOptions) => updateNodeData(id, { options: nextOptions })

  function removeOption(optionId) {
    setOptions(options.filter((option) => option.id !== optionId))
    setEdges((edges) => edges.filter((edge) => !(edge.source === id && edge.sourceHandle === `option:${optionId}`)))
  }

  return (
    <NodeShell id={id} type="choice" selected={selected}>
      <p className={styles.fieldLabel}>Responses</p>
      {options.map((option, index) => (
        <div key={option.id} className={styles.outputRow}>
          <TextInput
            aria-label={`Response ${index + 1}`}
            placeholder={`Response ${index + 1}`}
            value={option.text}
            onChange={(event) =>
              setOptions(options.map((current) => (current.id === option.id ? { ...current, text: event.target.value } : current)))
            }
          />
          <Button
            variant="ghost"
            icon={X}
            className={styles.smallButton}
            aria-label={`Remove response ${index + 1}`}
            title="Remove response"
            onClick={() => removeOption(option.id)}
          />
          <Handle type="source" position={Position.Right} id={`option:${option.id}`} className={styles.handle} />
        </div>
      ))}
      <Button variant="ghost" icon={Plus} onClick={() => setOptions([...options, { id: nextResponseId(options), text: '' }])}>
        Add response
      </Button>
    </NodeShell>
  )
}

export function ConditionNode({ id, data, selected }) {
  const { updateNodeData } = useReactFlow()

  return (
    <NodeShell id={id} type="condition" selected={selected}>
      <PropertyRow id={`${id}-flag`} label="Story flag" layout="stacked">
        {(inputProps) => (
          <TextInput
            {...inputProps}
            mono
            placeholder="met_merchant"
            value={data.flag ?? ''}
            onChange={(event) => updateNodeData(id, { flag: event.target.value })}
          />
        )}
      </PropertyRow>
      <div className={cx(styles.outputRow, styles.branch)}>
        If set
        <Handle type="source" position={Position.Right} id="yes" className={styles.handle} />
      </div>
      <div className={cx(styles.outputRow, styles.branch)}>
        If not set
        <Handle type="source" position={Position.Right} id="no" className={styles.handle} />
      </div>
    </NodeShell>
  )
}

export function ActionNode({ id, data, selected }) {
  const { updateNodeData } = useReactFlow()
  const { itemOptions } = useDialogueEditor()

  return (
    <NodeShell id={id} type="action" selected={selected} output="next">
      <SegmentedControl
        label="Action"
        options={ACTION_TYPES}
        value={data.action ?? 'giveItem'}
        onChange={(action) => updateNodeData(id, { action })}
      />
      {data.action === 'setFlag' ? (
        <>
          <PropertyRow id={`${id}-flag`} label="Story flag" layout="stacked">
            {(inputProps) => (
              <TextInput
                {...inputProps}
                mono
                placeholder="met_merchant"
                value={data.flag ?? ''}
                onChange={(event) => updateNodeData(id, { flag: event.target.value })}
              />
            )}
          </PropertyRow>
          <PropertyRow id={`${id}-value`} label="Turn the flag on" layout="stacked" help="Off clears the flag.">
            {(inputProps) => (
              <Toggle {...inputProps} checked={Boolean(data.value)} onChange={(value) => updateNodeData(id, { value })} />
            )}
          </PropertyRow>
        </>
      ) : (
        <>
          <PropertyRow id={`${id}-item`} label="Item" layout="stacked">
            {(inputProps) =>
              itemOptions ? (
                <Select
                  {...inputProps}
                  searchable
                  placeholder="Choose an item…"
                  options={itemOptions}
                  value={data.item ?? ''}
                  onChange={(item) => updateNodeData(id, { item })}
                />
              ) : (
                <Select
                  {...inputProps}
                  disabled
                  options={[]}
                  value=""
                  onChange={() => {}}
                  placeholder="Choose an item blueprint first"
                />
              )
            }
          </PropertyRow>
          <PropertyRow id={`${id}-quantity`} label="Quantity" layout="stacked">
            {(inputProps) => (
              <NumberInput
                {...inputProps}
                integer
                min={1}
                value={data.quantity ?? ''}
                onChange={(event) =>
                  updateNodeData(id, { quantity: event.target.value === '' ? '' : Number(event.target.value) })
                }
              />
            )}
          </PropertyRow>
        </>
      )}
    </NodeShell>
  )
}

export function EndNode({ id, selected }) {
  return (
    <NodeShell id={id} type="end" selected={selected}>
      <p className={styles.endText}>The conversation ends.</p>
    </NodeShell>
  )
}
