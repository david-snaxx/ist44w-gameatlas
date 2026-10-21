import MissingRecord from '../../components/MissingRecord/MissingRecord.jsx'

/**
 * The page shown when an asset's URL doesn't lead anywhere: either the blueprint in the URL
 * doesn't exist (blueprint is null), or the blueprint exists but has no asset with that ID.
 */
function MissingAsset({ projectId, blueprint, blueprintId, assetKey }) {
  if (!blueprint) {
    return (
      <MissingRecord
        title="Blueprint not found"
        message={`There's no blueprint with the ID "${blueprintId}".`}
        back={{ to: `/projects/${projectId}/blueprints`, label: 'All blueprints' }}
      />
    )
  }

  return (
    <MissingRecord
      title="Asset not found"
      message={`There's no ${blueprint.name} asset with the ID "${assetKey}".`}
      back={{ to: `/projects/${projectId}/blueprints/${blueprint.id}/assets`, label: `All ${blueprint.name} assets` }}
    />
  )
}

export default MissingAsset
