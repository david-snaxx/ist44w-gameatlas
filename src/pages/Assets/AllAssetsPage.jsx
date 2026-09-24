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
  {
    key: 'statusOrder',
    label: 'Status',
    render: (row) =>
      row.problems > 0 ? (
        <Badge tone="error">{plural(row.problems, 'problem')}</Badge>
      ) : row.outdated ? (
        <Badge tone="warning">Outdated</Badge>
      ) : (
        <Badge tone="success">Ready</Badge>
      ),
  },
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

  const blueprintById = Object.fromEntries(blueprints.map((blueprint) => [blueprint.id, blueprint]))
  const referenceKeys = referenceKeysFor(blueprints, assets)

  const rows = assets
    .filter((asset) => blueprintById[asset.schemaId])
    .map((asset) => {
      const blueprint = blueprintById[asset.schemaId]
      const problems = countAssetProblems(asset, blueprint, referenceKeys)
      const outdated = asset.schemaVersion < blueprint.version
      return {
        id: asset.id,
        asset,
        key: asset.key,
        name: assetLabel(asset, blueprint),
        blueprintId: blueprint.id,
        blueprintName: blueprint.name,
        problems,
        outdated,
        // Sorts problems first, then outdated, then ready
        statusOrder: problems > 0 ? 0 : outdated ? 1 : 2,
        updated: asset.updatedAt,
        searchText: `${assetLabel(asset, blueprint)} ${asset.key} ${blueprint.name}`.toLowerCase(),
      }
    })

  const search = query.trim().toLowerCase()
  const visibleRows = rows.filter(
    (row) => (!blueprintFilter || row.blueprintId === blueprintFilter) && (!search || row.searchText.includes(search)),
  )
  const isFiltered = Boolean(blueprintFilter || search)

  return (
    <ListPage
      title="All assets"
      intro="Every asset in the project. To add one, open the blueprint it belongs to."
      noun="asset"
      crumbs={[{ label: 'Assets' }]}
      actions={
        <Button
          icon={Download}
          disabled={visibleRows.length === 0}
          onClick={() =>
            downloadCollection({
              toast,
              noun: 'asset',
              filename: blueprintFilter ? `${blueprintFilter}.assets.json` : 'assets.json',
              items: visibleRows,
              problems: (row) => row.problems,
              toExport: (row) => toExport(row.asset),
            })
          }
        >
          Download {isFiltered ? 'these' : 'all'}
        </Button>
      }
      search={query}
      onSearch={setQuery}
      toolbarExtra={
        <Select
          options={[
            { value: '', label: 'All blueprints' },
            ...blueprints.map((blueprint) => ({ value: blueprint.id, label: blueprint.name })),
          ]}
          value={blueprintFilter}
          onChange={setBlueprintFilter}
        />
      }
      columns={COLUMNS}
      rows={visibleRows}
      total={rows.length}
      onSelect={(id) => {
        const row = visibleRows.find((candidate) => candidate.id === id)
        navigate(assetPath(row.blueprintId, row.key))
      }}
      empty={
        <EmptyState message={blueprints.length > 0 ? 'No assets yet.' : 'No blueprints yet, so there are no assets.'}>
          <Button
            icon={blueprints.length > 0 ? Plus : LayoutList}
            onClick={() => navigate(blueprints.length > 0 ? `/blueprints/${blueprints[0].id}/assets` : '/blueprints')}
          >
            {blueprints.length > 0 ? `Add a ${blueprints[0].name}` : 'All blueprints'}
          </Button>
        </EmptyState>
      }
    />
  )
}

export default AllAssetsPage
