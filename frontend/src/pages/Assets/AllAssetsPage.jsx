import { Download, LayoutList, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import Badge from '../../components/Badge/Badge.jsx'
import Button from '../../components/Button/Button.jsx'
import EmptyState from '../../components/EmptyState/EmptyState.jsx'
import Select from '../../components/form/Select.jsx'
import ListPage from '../../components/ListPage/ListPage.jsx'
import { useToast } from '../../components/Toast/useToast.js'
import { assetLabel, assetPath, countAssetProblems, referenceKeysFor, toExport } from '../../data/assetData.js'
import { useAssets } from '../../data/useAssets.js'
import { useBlueprints } from '../../schema/useBlueprints.js'
import { downloadCollection } from '../../utils/downloadJson.js'
import { formatDateTime } from '../../utils/formatDate.js'
import { plural } from '../../utils/plural.js'

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'key', label: 'ID' },
  { key: 'blueprintName', label: 'Blueprint' },
  // Sorting uses statusOrder (problems first, then outdated, then ready); the cell shows a badge
  { key: 'statusOrder', label: 'Status', render: (row) => <StatusBadge row={row} /> },
  { key: 'updated', label: 'Updated', render: (row) => formatDateTime(row.updated) },
]

/** Every asset from every blueprint in one table (/assets). */
function AllAssetsPage() {
  const blueprints = useBlueprints()
  const assets = useAssets()
  const navigate = useNavigate()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [blueprintFilter, setBlueprintFilter] = useState('')

  const referenceKeys = referenceKeysFor(blueprints, assets)
  const rows = buildRows(assets, blueprints, referenceKeys)
  const visibleRows = filterRows(rows, query, blueprintFilter)
  const isFiltered = blueprintFilter !== '' || query.trim() !== ''

  function handleDownload() {
    let filename = 'assets.json'
    if (blueprintFilter) {
      filename = `${blueprintFilter}.assets.json`
    }
    downloadCollection({
      toast: toast,
      noun: 'asset',
      filename: filename,
      items: visibleRows,
      problems: (row) => row.problems,
      toExport: (row) => toExport(row.asset),
    })
  }

  function openAsset(id) {
    const row = visibleRows.find((candidate) => candidate.id === id)
    navigate(assetPath(row.blueprintId, row.key))
  }

  let downloadLabel = 'Download all'
  if (isFiltered) {
    downloadLabel = 'Download these'
  }

  const filterOptions = [{ value: '', label: 'All blueprints' }]
  for (const blueprint of blueprints) {
    filterOptions.push({ value: blueprint.id, label: blueprint.name })
  }

  return (
    <ListPage
      title="All assets"
      intro="Every asset in the project. To add one, open the blueprint it belongs to."
      noun="asset"
      crumbs={[{ label: 'Assets' }]}
      actions={
        <Button icon={Download} disabled={visibleRows.length === 0} onClick={handleDownload}>
          {downloadLabel}
        </Button>
      }
      search={query}
      onSearch={setQuery}
      toolbarExtra={<Select options={filterOptions} value={blueprintFilter} onChange={setBlueprintFilter} />}
      columns={COLUMNS}
      rows={visibleRows}
      total={rows.length}
      onSelect={openAsset}
      empty={<NoAssetsYet blueprints={blueprints} />}
    />
  )
}

/** The Status cell: problems, outdated, or ready to export. */
function StatusBadge({ row }) {
  if (row.problems > 0) {
    return <Badge tone="error">{plural(row.problems, 'problem')}</Badge>
  }
  if (row.outdated) {
    return <Badge tone="warning">Outdated</Badge>
  }
  return <Badge tone="success">Ready</Badge>
}

/** What the page shows when there are no assets at all: a way to go and make one. */
function NoAssetsYet({ blueprints }) {
  const navigate = useNavigate()

  if (blueprints.length === 0) {
    return (
      <EmptyState message="No blueprints yet, so there are no assets.">
        <Button icon={LayoutList} onClick={() => navigate('/blueprints')}>
          All blueprints
        </Button>
      </EmptyState>
    )
  }

  const firstBlueprint = blueprints[0]
  return (
    <EmptyState message="No assets yet.">
      <Button icon={Plus} onClick={() => navigate(`/blueprints/${firstBlueprint.id}/assets`)}>
        Add a {firstBlueprint.name}
      </Button>
    </EmptyState>
  )
}

// One table row per asset (assets whose blueprint no longer exists are left out)
function buildRows(assets, blueprints, referenceKeys) {
  const rows = []

  for (const asset of assets) {
    const blueprint = blueprints.find((candidate) => candidate.id === asset.schemaId)
    if (!blueprint) {
      continue
    }

    const name = assetLabel(asset, blueprint)
    const problems = countAssetProblems(asset, blueprint, referenceKeys)
    const outdated = asset.schemaVersion < blueprint.version

    rows.push({
      id: asset.id,
      asset: asset,
      key: asset.key,
      name: name,
      blueprintId: blueprint.id,
      blueprintName: blueprint.name,
      problems: problems,
      outdated: outdated,
      statusOrder: statusOrder(problems, outdated),
      updated: asset.updatedAt,
      searchText: `${name} ${asset.key} ${blueprint.name}`.toLowerCase(),
    })
  }

  return rows
}

// Sorting by this number puts problems first, then outdated assets, then ready ones
function statusOrder(problems, outdated) {
  if (problems > 0) {
    return 0
  }
  if (outdated) {
    return 1
  }
  return 2
}

// The rows that match the search box and the blueprint filter
function filterRows(rows, query, blueprintFilter) {
  const search = query.trim().toLowerCase()
  const visible = []

  for (const row of rows) {
    if (blueprintFilter && row.blueprintId !== blueprintFilter) {
      continue
    }
    if (search && !row.searchText.includes(search)) {
      continue
    }
    visible.push(row)
  }

  return visible
}

export default AllAssetsPage
