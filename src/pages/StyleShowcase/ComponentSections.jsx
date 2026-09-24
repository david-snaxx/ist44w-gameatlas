import { Copy, Download, MoreHorizontal, Pencil, Plus, Save, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'
import Badge from '../../components/Badge/Badge.jsx'
import Button from '../../components/Button/Button.jsx'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog.jsx'
import EmptyState from '../../components/EmptyState/EmptyState.jsx'
import PropertyRow from '../../components/form/PropertyRow.jsx'
import Select from '../../components/form/Select.jsx'
import TextInput from '../../components/form/TextInput.jsx'
import Toggle from '../../components/form/Toggle.jsx'
import Section from '../../components/Section/Section.jsx'
import SidePanel from '../../components/SidePanel/SidePanel.jsx'
import Table from '../../components/Table/Table.jsx'
import { useToast } from '../../components/Toast/useToast.js'
import ShowcaseSection from './ShowcaseSection.jsx'
import { PROPERTY_TYPE_OPTIONS, RARITY_OPTIONS, SAMPLE_ASSETS } from './showcaseData.js'
import styles from './Showcase.module.css'

export function ButtonsSection() {
  return (
    <ShowcaseSection
      id="buttons"
      title="Buttons"
      intro="One primary action per view. Danger is always behind a confirmation. Icon-only buttons have a tooltip."
    >
      <div>
        <h3 className={styles.subheading}>Variants</h3>
        <div className={styles.row}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </div>
      </div>
      <div>
        <h3 className={styles.subheading}>With icons</h3>
        <div className={styles.row}>
          <Button variant="primary" icon={Save}>Save asset</Button>
          <Button icon={Upload}>Import</Button>
          <Button icon={Download}>Export</Button>
          <Button variant="ghost" icon={Plus}>Add property</Button>
          <Button variant="danger" icon={Trash2}>Delete</Button>
        </div>
      </div>
      <div>
        <h3 className={styles.subheading}>Icon only</h3>
        <div className={styles.row}>
          <Button variant="ghost" icon={Pencil} aria-label="Rename" title="Rename" />
          <Button variant="ghost" icon={Copy} aria-label="Duplicate" title="Duplicate" />
          <Button variant="ghost" icon={MoreHorizontal} aria-label="More actions" title="More actions" />
          <Button icon={Plus} aria-label="New asset" title="New asset" />
        </div>
      </div>
      <div>
        <h3 className={styles.subheading}>Disabled</h3>
        <div className={styles.row}>
          <Button variant="primary" disabled>Primary</Button>
          <Button disabled>Secondary</Button>
          <Button variant="ghost" disabled>Ghost</Button>
          <Button variant="danger" disabled>Danger</Button>
        </div>
      </div>
    </ShowcaseSection>
  )
}

const rarityLabel = (value) => RARITY_OPTIONS.find((option) => option.value === value)?.label ?? '—'

const TABLE_COLUMNS = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'id', label: 'ID', sortable: true, mono: true },
  { key: 'rarity', label: 'Rarity', sortable: true, render: (row) => <Badge>{rarityLabel(row.rarity)}</Badge> },
  { key: 'damage', label: 'Damage', sortable: true, numeric: true },
  { key: 'weight', label: 'Weight (kg)', sortable: true, numeric: true },
  { key: 'updated', label: 'Updated', sortable: true, mono: true },
]

export function TablesSection() {
  const [selectedId, setSelectedId] = useState('moonlit_bow')

  return (
    <ShowcaseSection
      id="tables"
      title="Tables"
      intro="Asset lists. Click a column header to sort, click a row to select it (Enter works too)."
    >
      <Section title="Items" bodyClassName="flush">
        <Table
          label="Item assets"
          columns={TABLE_COLUMNS}
          rows={SAMPLE_ASSETS}
          selectedKey={selectedId}
          onSelect={setSelectedId}
        />
      </Section>
      <div>
        <h3 className={styles.subheading}>Empty state</h3>
        <Section title="Quests" className={styles.emptySection}>
          <EmptyState message="No assets yet.">
            <Button variant="primary" icon={Plus}>Create asset</Button>
          </EmptyState>
        </Section>
      </div>
    </ShowcaseSection>
  )
}

const EMPTY_PROPERTY = { label: '', key: '', type: 'string', required: false }

export function FeedbackSection() {
  const toast = useToast()
  const [panelOpen, setPanelOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [property, setProperty] = useState(EMPTY_PROPERTY)

  const keyError =
    property.key && !/^[a-z0-9_]+$/.test(property.key) ? 'Use lowercase letters, numbers and underscores' : null

  function closePanel() {
    setPanelOpen(false)
    setProperty(EMPTY_PROPERTY)
  }

  return (
    <ShowcaseSection
      id="feedback"
      title="Feedback & overlays"
      intro="Badges, toasts (bottom-right), the slide-out side panel for small edits, and the confirmation dialog."
    >
      <div>
        <h3 className={styles.subheading}>Badges</h3>
        <div className={styles.row}>
          <Badge>Neutral</Badge>
          <Badge tone="accent">Accent</Badge>
          <Badge tone="success">Saved</Badge>
          <Badge tone="warning">Outdated</Badge>
          <Badge tone="error">Invalid</Badge>
          <Badge tone="info">Draft</Badge>
        </div>
      </div>

      <div>
        <h3 className={styles.subheading}>Toasts</h3>
        <div className={styles.row}>
          <Button
            onClick={() =>
              toast.show({
                status: 'success',
                message: 'Asset saved',
                action: { label: 'Undo', onClick: () => toast.show({ status: 'info', message: 'Changes undone' }) },
              })
            }
          >
            Success
          </Button>
          <Button onClick={() => toast.show({ status: 'info', message: '3 assets imported' })}>Info</Button>
          <Button
            onClick={() =>
              toast.show({ status: 'warning', message: 'Blueprint changed. 2 assets need updating.' })
            }
          >
            Warning
          </Button>
          <Button
            onClick={() =>
              toast.show({ status: 'error', message: "Couldn't save. Check your connection and try again." })
            }
          >
            Error
          </Button>
        </div>
      </div>

      <div>
        <h3 className={styles.subheading}>Side panel & confirmation</h3>
        <div className={styles.row}>
          <Button variant="ghost" icon={Plus} onClick={() => setPanelOpen(true)}>
            Add property
          </Button>
          <Button variant="danger" icon={Trash2} onClick={() => setDialogOpen(true)}>
            Delete asset
          </Button>
        </div>
      </div>

      <SidePanel
        open={panelOpen}
        title="New property"
        onClose={closePanel}
        footer={
          <>
            <Button onClick={closePanel}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!property.label || !property.key || Boolean(keyError)}
              onClick={() => {
                toast.show({ status: 'success', message: `Property "${property.label}" added` })
                closePanel()
              }}
            >
              Add property
            </Button>
          </>
        }
      >
        <PropertyRow id="new-property-label" label="Label" required layout="stacked" help="Shown next to the input.">
          {(inputProps) => (
            <TextInput
              {...inputProps}
              placeholder="e.g. Damage"
              value={property.label}
              onChange={(event) => setProperty({ ...property, label: event.target.value })}
            />
          )}
        </PropertyRow>
        <PropertyRow
          id="new-property-key"
          label="ID"
          required
          layout="stacked"
          error={keyError}
          help="Used in the exported file."
        >
          {(inputProps) => (
            <TextInput
              {...inputProps}
              mono
              placeholder="damage"
              value={property.key}
              onChange={(event) => setProperty({ ...property, key: event.target.value })}
            />
          )}
        </PropertyRow>
        <PropertyRow id="new-property-type" label="Type" layout="stacked">
          {(inputProps) => (
            <Select
              {...inputProps}
              options={PROPERTY_TYPE_OPTIONS}
              value={property.type}
              onChange={(type) => setProperty({ ...property, type })}
            />
          )}
        </PropertyRow>
        <PropertyRow id="new-property-required" label="Required" layout="stacked">
          {(inputProps) => (
            <Toggle
              {...inputProps}
              checked={property.required}
              onChange={(required) => setProperty({ ...property, required })}
            />
          )}
        </PropertyRow>
      </SidePanel>

      <ConfirmDialog
        open={dialogOpen}
        title="Delete asset?"
        message="Delete asset 'Sword of Fire'? This can't be undone."
        confirmLabel="Delete asset"
        onCancel={() => setDialogOpen(false)}
        onConfirm={() => {
          setDialogOpen(false)
          toast.show({ status: 'success', message: 'Asset deleted' })
        }}
      />
    </ShowcaseSection>
  )
}
