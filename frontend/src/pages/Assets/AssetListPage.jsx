import { Download, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import Badge from '../../components/Badge/Badge.jsx'
import Button from '../../components/Button/Button.jsx'
import EmptyState from '../../components/EmptyState/EmptyState.jsx'
import ListPage from '../../components/ListPage/ListPage.jsx'
import MissingRecord from '../../components/MissingRecord/MissingRecord.jsx'
import TopBarActions from '../../components/TopBarActions/TopBarActions.jsx'
import { useToast } from '../../components/Toast/useToast.js'
import {
  assetLabel,
  assetPath,
  countAssetProblems,
  labelFieldKey,
  parseAssetFile,
  referenceKeysFor,
  toExport,
} from '../../data/assetData.js'
import { useAssets } from '../../data/useAssets.js'
import { useBlueprints } from '../../schema/useBlueprints.js'
import { downloadCollection } from '../../utils/downloadJson.js'
import { formatDateTime } from '../../utils/formatDate.js'

// Property types short enough to show as a table column, and how many of them to show
const COLUMN_TYPES = ['string', 'int', 'float', 'bool', 'enum', 'reference']
const MAX_PROPERTY_COLUMNS = 4

/** The table of every asset made from one blueprint (/blueprints/:blueprintId/assets). */
function AssetListPage() {
  const { blueprintId } = useParams()
  const blueprints = useBlueprints()
  const assets = useAssets()
  const navigate = useNavigate()
  const toast = useToast()
  const [query, setQuery] = useState('')

  const blueprint = blueprints.find((candidate) => candidate.id === blueprintId)

  if (!blueprint) {
    return (
      <MissingRecord
        title="Blueprint not found"
        message={`There's no blueprint with the ID "${blueprintId}".`}
        back={{ to: '/blueprints', label: 'All blueprints' }}
      />
    )
  }

  const assetLabels = assetLabelsByBlueprint(blueprints, assets)
  const propertyColumns = pickPropertyColumns(blueprint)
  const blueprintAssets = assets.filter((asset) => asset.schemaId === blueprint.id)
  const rows = buildRows(blueprintAssets, blueprint, propertyColumns, assetLabels)
  const visibleRows = filterRows(rows, query)
  const columns = buildColumns(propertyColumns, assetLabels)
  const referenceKeys = referenceKeysFor(blueprints, assets)

  function newAsset() {
    navigate(`/blueprints/${blueprint.id}/assets/new`)
  }

  function handleDownload() {
    downloadCollection({
      toast: toast,
      noun: 'asset',
      filename: `${blueprint.id}.assets.json`,
      items: blueprintAssets,
      problems: (asset) => countAssetProblems(asset, blueprint, referenceKeys),
      toExport: toExport,
    })
  }

  function openAsset(id) {
    const row = rows.find((candidate) => candidate.id === id)
    navigate(assetPath(blueprint.id, row.key))
  }

  // The same button appears in the header and in the empty state
  const newButton = (
    <Button variant="primary" icon={Plus} onClick={newAsset}>
      New asset
    </Button>
  )

  let intro = `Everything made from the ${blueprint.name} blueprint.`
  if (blueprint.description) {
    intro = blueprint.description
  }

  return (
    <ListPage
      title={`${blueprint.name} assets`}
      intro={intro}
      noun="asset"
      crumbs={[
        { label: 'Blueprints', to: '/blueprints' },
        { label: blueprint.name, to: `/blueprints/${blueprint.id}` },
        { label: 'Assets' },
      ]}
      topBarActions={
        <TopBarActions
          noun="asset"
          newPath={`/blueprints/${blueprint.id}/assets/new`}
          importFile={(text) => parseAssetFile(text, blueprint)}
        />
      }
      actions={
        <>
          <Button icon={Pencil} onClick={() => navigate(`/blueprints/${blueprint.id}`)}>
            Edit blueprint
          </Button>
          <Button icon={Download} disabled={rows.length === 0} onClick={handleDownload}>
            Download all
          </Button>
          {newButton}
        </>
      }
      search={query}
      onSearch={setQuery}
      columns={columns}
      rows={visibleRows}
      total={rows.length}
      onSelect={openAsset}
      empty={<EmptyState message={`No ${blueprint.name} assets yet.`}>{newButton}</EmptyState>}
    />
  )
}

/** The Blueprint cell: whether the asset was saved with the blueprint's current version. */
function BlueprintStatus({ row }) {
  if (row.outdated) {
    return <Badge tone="warning">Outdated</Badge>
  }
  return <span className="muted">Up to date</span>
}

// Every asset's display name, for showing links by name: { [blueprintId]: { [assetKey]: name } }
function assetLabelsByBlueprint(blueprints, assets) {
  const labels = {}
  for (const blueprint of blueprints) {
    labels[blueprint.id] = {}
  }
  for (const asset of assets) {
    const blueprint = blueprints.find((candidate) => candidate.id === asset.schemaId)
    if (blueprint) {
      labels[blueprint.id][asset.key] = assetLabel(asset, blueprint)
    }
  }
  return labels
}

// Extra columns: the first few simple properties, skipping the one already shown as the name
function pickPropertyColumns(blueprint) {
  const labelKey = labelFieldKey(blueprint)
  const picked = []

  for (const field of blueprint.fields) {
    if (picked.length === MAX_PROPERTY_COLUMNS) {
      break
    }
    if (field.key !== labelKey && COLUMN_TYPES.includes(field.type)) {
      picked.push(field)
    }
  }

  return picked
}

// A property value as table text
function formatCell(field, value, assetLabels) {
  if (value === null || value === undefined || value === '') {
    return '—'
  }
  if (field.type === 'bool') {
    if (value) {
      return 'Yes'
    }
    return 'No'
  }
  if (field.type === 'reference') {
    // Show the linked asset's name; if it's gone, show its ID
    return assetLabels[field.targetSchema]?.[value] ?? value
  }
  return String(value)
}

// Each extra property column is stored on the row under "property:<key>", so it can't clash with name, key, …
function propertyColumnKey(field) {
  return `property:${field.key}`
}

// One table row per asset
function buildRows(blueprintAssets, blueprint, propertyColumns, assetLabels) {
  const rows = []

  for (const asset of blueprintAssets) {
    let outdated = 0
    if (asset.schemaVersion < blueprint.version) {
      outdated = 1
    }

    const row = {
      id: asset.id,
      asset: asset,
      key: asset.key,
      name: assetLabel(asset, blueprint),
      outdated: outdated,
      updated: asset.updatedAt,
    }

    // The search looks at the name, the ID, and the text shown in each property column
    const searchParts = [row.name, row.key]
    for (const field of propertyColumns) {
      const value = asset.data?.[field.key] ?? null
      row[propertyColumnKey(field)] = value
      searchParts.push(formatCell(field, value, assetLabels))
    }
    row.searchText = searchParts.join(' ').toLowerCase()

    rows.push(row)
  }

  return rows
}

// The rows that match the search box
function filterRows(rows, query) {
  const search = query.trim().toLowerCase()
  if (!search) {
    return rows
  }
  return rows.filter((row) => row.searchText.includes(search))
}

function buildColumns(propertyColumns, assetLabels) {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'key', label: 'ID' },
  ]

  for (const field of propertyColumns) {
    const key = propertyColumnKey(field)
    columns.push({
      key: key,
      label: field.label,
      render: (row) => formatCell(field, row[key], assetLabels),
    })
  }

  columns.push({ key: 'outdated', label: 'Blueprint', render: (row) => <BlueprintStatus row={row} /> })
  columns.push({ key: 'updated', label: 'Updated', render: (row) => formatDateTime(row.updated) })
  return columns
}

export default AssetListPage
