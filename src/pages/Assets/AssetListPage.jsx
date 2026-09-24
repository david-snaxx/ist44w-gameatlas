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

/** A property value as table text. assetLabels: { [blueprintId]: { [assetKey]: name } } for links. */
function formatCell(field, value, assetLabels) {
  if (value === null || value === undefined || value === '') return '—'
  if (field.type === 'bool') return value ? 'Yes' : 'No'
  if (field.type === 'reference') return assetLabels[field.targetSchema]?.[value] ?? value
  return String(value)
}

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

  const assetLabels = Object.fromEntries(
    blueprints.map((candidate) => [
      candidate.id,
      Object.fromEntries(
        assets.filter((asset) => asset.schemaId === candidate.id).map((asset) => [asset.key, assetLabel(asset, candidate)]),
      ),
    ]),
  )

  // Extra columns: the first few simple properties, skipping the one already shown as the name
  const labelKey = labelFieldKey(blueprint)
  const propertyColumns = blueprint.fields
    .filter((field) => field.key !== labelKey && COLUMN_TYPES.includes(field.type))
    .slice(0, MAX_PROPERTY_COLUMNS)

  const blueprintAssets = assets.filter((asset) => asset.schemaId === blueprint.id)
  const rows = blueprintAssets.map((asset) => {
    const row = {
      id: asset.id,
      asset,
      key: asset.key,
      name: assetLabel(asset, blueprint),
      outdated: asset.schemaVersion < blueprint.version ? 1 : 0,
      updated: asset.updatedAt,
    }
    for (const field of propertyColumns) row[`property:${field.key}`] = asset.data?.[field.key] ?? null
    row.searchText = [
      row.name,
      row.key,
      ...propertyColumns.map((field) => formatCell(field, row[`property:${field.key}`], assetLabels)),
    ]
      .join(' ')
      .toLowerCase()
    return row
  })

  const search = query.trim().toLowerCase()
  const visibleRows = search ? rows.filter((row) => row.searchText.includes(search)) : rows

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'key', label: 'ID' },
    ...propertyColumns.map((field) => ({
      key: `property:${field.key}`,
      label: field.label,
      render: (row) => formatCell(field, row[`property:${field.key}`], assetLabels),
    })),
    {
      key: 'outdated',
      label: 'Blueprint',
      render: (row) => (row.outdated ? <Badge tone="warning">Outdated</Badge> : <span className="muted">Up to date</span>),
    },
    { key: 'updated', label: 'Updated', render: (row) => formatDateTime(row.updated) },
  ]

  const referenceKeys = referenceKeysFor(blueprints, assets)
  const newAsset = () => navigate(`/blueprints/${blueprint.id}/assets/new`)
  const newButton = (
    <Button variant="primary" icon={Plus} onClick={newAsset}>
      New asset
    </Button>
  )

  return (
    <ListPage
      title={`${blueprint.name} assets`}
      intro={blueprint.description || `Everything made from the ${blueprint.name} blueprint.`}
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
          <Button
            icon={Download}
            disabled={rows.length === 0}
            onClick={() =>
              downloadCollection({
                toast,
                noun: 'asset',
                filename: `${blueprint.id}.assets.json`,
                items: blueprintAssets,
                problems: (asset) => countAssetProblems(asset, blueprint, referenceKeys),
                toExport,
              })
            }
          >
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
      onSelect={(id) => {
        const row = rows.find((candidate) => candidate.id === id)
        navigate(assetPath(blueprint.id, row.key))
      }}
      empty={<EmptyState message={`No ${blueprint.name} assets yet.`}>{newButton}</EmptyState>}
    />
  )
}

export default AssetListPage
