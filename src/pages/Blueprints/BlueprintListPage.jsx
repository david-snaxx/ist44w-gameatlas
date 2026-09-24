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
  { key: 'name', label: 'Name', sortable: true },
  { key: 'id', label: 'ID', sortable: true, mono: true },
  {
    key: 'description',
    label: 'Description',
    render: (row) => <span className="truncate">{row.description || '—'}</span>,
  },
  { key: 'properties', label: 'Properties', sortable: true, numeric: true },
  { key: 'assets', label: 'Assets', sortable: true, numeric: true },
  { key: 'version', label: 'Version', sortable: true, numeric: true },
]

/** Every blueprint in a table (/blueprints). */
function BlueprintListPage() {
  const blueprints = useBlueprints()
  const assets = useAssets()
  const navigate = useNavigate()

  const rows = blueprints.map((blueprint) => ({
    id: blueprint.id,
    name: blueprint.name,
    description: blueprint.description ?? '',
    properties: countProperties(blueprint.fields),
    assets: assets.filter((asset) => asset.schemaId === blueprint.id).length,
    version: blueprint.version,
  }))

  const newBlueprint = () => navigate('/blueprints/new')
  const newButton = (
    <Button variant="primary" icon={Plus} onClick={newBlueprint}>
      New blueprint
    </Button>
  )

  return (
    <ListPage
      title="Blueprints"
      intro="A blueprint lists the properties every asset of one kind has, like the fields of a class. Asset forms are built from blueprints."
      noun="blueprint"
      crumbs={[{ label: 'Blueprints' }]}
      topBarActions={
        <TopBarActions noun="blueprint" newPath="/blueprints/new" importFile={parseBlueprintFile} />
      }
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
