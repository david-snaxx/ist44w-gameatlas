import { CircleAlert, CircleCheck, Plus, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import Button from '../../components/Button/Button.jsx'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog.jsx'
import NumberInput from '../../components/form/NumberInput.jsx'
import PropertyRow from '../../components/form/PropertyRow.jsx'
import Select from '../../components/form/Select.jsx'
import TextArea from '../../components/form/TextArea.jsx'
import TextInput from '../../components/form/TextInput.jsx'
import Toggle from '../../components/form/Toggle.jsx'
import VectorInput from '../../components/form/VectorInput.jsx'
import JsonPreview from '../../components/JsonPreview/JsonPreview.jsx'
import Section from '../../components/Section/Section.jsx'
import Table from '../../components/Table/Table.jsx'
import { useToast } from '../../components/Toast/useToast.js'
import ShowcaseSection from './ShowcaseSection.jsx'
import { ENTITY_OPTIONS, RARITY_OPTIONS, SAMPLE_ASSETS } from './showcaseData.js'
import styles from './AssetEditorSection.module.css'

const LABELS = {
  name: 'Name',
  id: 'ID',
  description: 'Description',
  damage: 'Damage',
  weight: 'Weight',
  rarity: 'Rarity',
  gripOffset: 'Grip offset',
  iconSize: 'Icon size',
}

// Number inputs are kept as strings while editing so a half-typed "-" or "" is allowed
function toFormValues(asset) {
  return {
    name: asset.name,
    id: asset.id,
    description: asset.description,
    damage: String(asset.damage),
    weight: String(asset.weight),
    stackable: asset.stackable,
    rarity: asset.rarity,
    droppedBy: asset.droppedBy,
    gripOffset: { x: 0, y: 0.1, z: 0 },
    iconSize: { x: 64, y: 64 },
  }
}

function validate(values) {
  const errors = {}
  if (!values.name.trim()) errors.name = 'Enter a name'
  else if (values.name.length > 64) errors.name = 'Use 64 characters or fewer'

  if (!values.id) errors.id = 'Enter an ID'
  else if (!/^[a-z0-9_]+$/.test(values.id)) errors.id = 'Use lowercase letters, numbers and underscores'

  if (values.damage !== '') {
    const damage = Number(values.damage)
    if (!Number.isInteger(damage)) errors.damage = 'Use a whole number'
    else if (damage < 0) errors.damage = 'Must be 0 or more'
  }

  if (values.weight !== '' && Number(values.weight) < 0) errors.weight = 'Must be 0 or more'
  if (!values.rarity) errors.rarity = 'Choose a rarity'

  for (const key of ['gripOffset', 'iconSize']) {
    if (Object.values(values[key]).some((axis) => axis === '')) errors[key] = 'Enter a number for every axis'
  }
  return errors
}

// What the exported JSON would look like
function toExport(values) {
  const number = (text) => (text === '' ? null : Number(text))
  return {
    id: values.id,
    name: values.name,
    description: values.description,
    damage: number(values.damage),
    weight: number(values.weight),
    stackable: values.stackable,
    rarity: values.rarity || null,
    gripOffset: values.gripOffset,
    iconSize: values.iconSize,
    droppedBy: values.droppedBy || null,
  }
}

const LIST_COLUMNS = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'id', label: 'ID', mono: true },
]

export function AssetEditorSection() {
  const toast = useToast()
  const [assets, setAssets] = useState(SAMPLE_ASSETS)
  const [selectedId, setSelectedId] = useState(SAMPLE_ASSETS[0].id)
  const [values, setValues] = useState(() => toFormValues(SAMPLE_ASSETS[0]))
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const errors = validate(values)
  // Errors show as you type, but only for properties the user has changed (or after Save)
  const visibleErrors = Object.entries(errors).filter(([key]) => submitted || touched[key])
  const errorFor = (key) => (submitted || touched[key] ? errors[key] : undefined)

  function update(key, value) {
    setValues((current) => ({ ...current, [key]: value }))
    setTouched((current) => ({ ...current, [key]: true }))
  }

  function selectAsset(id) {
    const asset = assets.find((item) => item.id === id)
    setSelectedId(id)
    setValues(toFormValues(asset))
    setTouched({})
    setSubmitted(false)
  }

  function handleSave() {
    setSubmitted(true)
    const count = Object.keys(errors).length
    if (count > 0) {
      toast.show({ status: 'error', message: `Fix ${count} ${count === 1 ? 'problem' : 'problems'} before saving` })
      return
    }
    toast.show({ status: 'success', message: 'Asset saved' })
  }

  function handleDelete() {
    const remaining = assets.filter((asset) => asset.id !== selectedId)
    setConfirmOpen(false)
    setAssets(remaining)
    toast.show({ status: 'success', message: `Asset "${values.name}" deleted` })
    if (remaining.length > 0) selectAsset(remaining[0].id)
  }

  return (
    <ShowcaseSection
      id="asset-editor"
      title="Asset editor"
      intro="The three-pane layout: asset list, form (labels on the left), and preview. Try clearing Name, typing capitals in ID, or a negative damage."
    >
      <div className={styles.editor}>
        <Section
          title="Items"
          bodyClassName="flush"
          actions={<Button variant="ghost" icon={Plus} aria-label="New asset" title="New asset" />}
        >
          <Table
            label="Item assets"
            columns={LIST_COLUMNS}
            rows={assets}
            selectedKey={selectedId}
            onSelect={selectAsset}
          />
        </Section>

        <Section title="Asset" bodyClassName={styles.formBody}>
          <form
            className={styles.form}
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              handleSave()
            }}
          >
            <h2 className={styles.formHeading}>General</h2>
            <PropertyRow id="asset-name" label="Name" required error={errorFor('name')}>
              {(inputProps) => (
                <TextInput {...inputProps} value={values.name} onChange={(event) => update('name', event.target.value)} />
              )}
            </PropertyRow>
            <PropertyRow
              id="asset-id"
              label="ID"
              required
              error={errorFor('id')}
              help="Used by the game to find this asset."
            >
              {(inputProps) => (
                <TextInput {...inputProps} mono value={values.id} onChange={(event) => update('id', event.target.value)} />
              )}
            </PropertyRow>
            <PropertyRow id="asset-description" label="Description">
              {(inputProps) => (
                <TextArea
                  {...inputProps}
                  placeholder="What players read in the inventory"
                  value={values.description}
                  onChange={(event) => update('description', event.target.value)}
                />
              )}
            </PropertyRow>
            <PropertyRow id="asset-rarity" label="Rarity" required error={errorFor('rarity')}>
              {(inputProps) => (
                <Select
                  {...inputProps}
                  options={RARITY_OPTIONS}
                  value={values.rarity}
                  onChange={(rarity) => update('rarity', rarity)}
                />
              )}
            </PropertyRow>

            <h2 className={styles.formHeading}>Combat</h2>
            <PropertyRow id="asset-damage" label="Damage" error={errorFor('damage')}>
              {(inputProps) => (
                <NumberInput
                  {...inputProps}
                  integer
                  value={values.damage}
                  onChange={(event) => update('damage', event.target.value)}
                />
              )}
            </PropertyRow>
            <PropertyRow id="asset-weight" label="Weight (kg)" error={errorFor('weight')}>
              {(inputProps) => (
                <NumberInput {...inputProps} value={values.weight} onChange={(event) => update('weight', event.target.value)} />
              )}
            </PropertyRow>
            <PropertyRow id="asset-stackable" label="Stackable">
              {(inputProps) => (
                <Toggle {...inputProps} checked={values.stackable} onChange={(stackable) => update('stackable', stackable)} />
              )}
            </PropertyRow>
            <PropertyRow id="asset-dropped-by" label="Dropped by" help="Links to an Entity asset.">
              {(inputProps) => (
                <Select
                  {...inputProps}
                  searchable
                  placeholder="Choose an entity…"
                  options={ENTITY_OPTIONS}
                  value={values.droppedBy}
                  onChange={(droppedBy) => update('droppedBy', droppedBy)}
                />
              )}
            </PropertyRow>

            <h2 className={styles.formHeading}>Presentation</h2>
            <PropertyRow id="asset-grip-offset" label="Grip offset" error={errorFor('gripOffset')}>
              {(inputProps) => (
                <VectorInput
                  {...inputProps}
                  aria-labelledby="asset-grip-offset-label"
                  value={values.gripOffset}
                  onChange={(gripOffset) => update('gripOffset', gripOffset)}
                />
              )}
            </PropertyRow>
            <PropertyRow id="asset-icon-size" label="Icon size" error={errorFor('iconSize')}>
              {(inputProps) => (
                <VectorInput
                  {...inputProps}
                  dimensions={2}
                  aria-labelledby="asset-icon-size-label"
                  value={values.iconSize}
                  onChange={(iconSize) => update('iconSize', iconSize)}
                />
              )}
            </PropertyRow>
            <PropertyRow id="asset-locked" label="Locked by blueprint">
              {(inputProps) => <TextInput {...inputProps} mono disabled value="item" />}
            </PropertyRow>

            <div className={styles.formActions}>
              <Button type="submit" variant="primary" icon={Save}>
                Save
              </Button>
              <Button onClick={() => selectAsset(selectedId)}>Discard changes</Button>
              <Button variant="danger" icon={Trash2} className="push-right" onClick={() => setConfirmOpen(true)}>
                Delete
              </Button>
            </div>
          </form>
        </Section>

        <Section title="Preview" bodyClassName={styles.previewBody}>
          {visibleErrors.length === 0 ? (
            <p className={styles.summaryOk}>
              <CircleCheck size={16} strokeWidth={1.75} aria-hidden="true" />
              No problems
            </p>
          ) : (
            <div className={styles.summary}>
              <p className={styles.summaryTitle}>
                <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
                {visibleErrors.length} {visibleErrors.length === 1 ? 'problem' : 'problems'}
              </p>
              <ul className={styles.summaryList}>
                {visibleErrors.map(([key, message]) => (
                  <li key={key}>
                    <button
                      type="button"
                      className={styles.summaryLink}
                      onClick={() => document.getElementById(`asset-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`)?.focus()}
                    >
                      {LABELS[key]}
                    </button>
                    <span className={styles.summaryMessage}>: {message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <JsonPreview value={toExport(values)} />
        </Section>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete asset?"
        message={`Delete asset '${values.name || values.id}'? This can't be undone.`}
        confirmLabel="Delete asset"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </ShowcaseSection>
  )
}
