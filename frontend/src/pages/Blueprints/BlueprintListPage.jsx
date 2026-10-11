import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router'
import Button from '../../components/Button/Button.jsx'
import EmptyState from '../../components/EmptyState/EmptyState.jsx'
import ListPage from '../../components/ListPage/ListPage.jsx'
import TopBarActions from '../../components/TopBarActions/TopBarActions.jsx'
import { useAssets } from '../../data/useAssets.js'
import { countProperties, parseBlueprintFile } from '../../schema/blueprintDraft.js'
import { useBlueprints } from '../../schema/useBlueprints.js'

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'id', label: 'ID' },
  { key: 'description', label: 'Description' },
  { key: 'properties', label: 'Properties' },
  { key: 'assets', label: 'Assets' },
  { key: 'version', label: 'Version' },
]

/** Every blueprint in a table (/blueprints). */
function BlueprintListPage() {
  const blueprints = useBlueprints()
  const assets = useAssets()
  const navigate = useNavigate()

  const rows = []
  for (const blueprint of blueprints) {
    let assetCount = 0
    for (const asset of assets) {
      if (asset.schemaId === blueprint.id) {
        assetCount++
      }
    }

    rows.push({
      id: blueprint.id,
      name: blueprint.name,
      // A dash stands in for an empty description
      description: blueprint.description || '—',
      properties: countProperties(blueprint.fields),
      assets: assetCount,
      version: blueprint.version,
    })
  }

  // The same button appears in the header and in the empty state
  const newButton = (
    <Button variant="primary" icon={Plus} onClick={() => navigate('/blueprints/new')}>
      New blueprint
    </Button>
  )

  return (
    <ListPage
      title="Blueprints"
      intro="A blueprint lists the properties every asset of one kind has, like the fields of a class. Asset forms are built from blueprints."
      noun="blueprint"
      crumbs={[{ label: 'Blueprints' }]}
      topBarActions={<TopBarActions noun="blueprint" newPath="/blueprints/new" importFile={parseBlueprintFile} />}
      actions={newButton}
      columns={COLUMNS}
      rows={rows}
      total={rows.length}
      onSelect={(id) => navigate(`/blueprints/${id}`)}
      empty={<EmptyState message="No blueprints yet.">{newButton}</EmptyState>}
    />
  )
}

export default BlueprintListPage
