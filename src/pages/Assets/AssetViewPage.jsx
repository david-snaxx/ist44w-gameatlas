import { Box, Copy, Download, MessagesSquare, Pencil } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import AppShell from '../../components/AppShell/AppShell.jsx'
import Badge from '../../components/Badge/Badge.jsx'
import Button from '../../components/Button/Button.jsx'
import EmptyState from '../../components/EmptyState/EmptyState.jsx'
import ValueRenderer from '../../components/form/ValueRenderer.jsx'
import JsonPreview from '../../components/JsonPreview/JsonPreview.jsx'
import LinkList from '../../components/LinkList/LinkList.jsx'
import MissingRecord from '../../components/MissingRecord/MissingRecord.jsx'
import Notice from '../../components/Notice/Notice.jsx'
import Section from '../../components/Section/Section.jsx'
import TopBarActions from '../../components/TopBarActions/TopBarActions.jsx'
import { useToast } from '../../components/Toast/useToast.js'
import {
  assetLabel,
  assetPath,
  duplicateAssetState,
  labelForPath,
  linksTo,
  referenceKeysFor,
  toExport,
  toFormValues,
  parseAssetFile,
} from '../../data/assetData.js'
import { dialogueLinksToAsset } from '../../data/dialogueGraph.js'
import { useAssets } from '../../data/useAssets.js'
import { useDialogues } from '../../data/useDialogues.js'
import { useBlueprints } from '../../schema/useBlueprints.js'
import { validateValues } from '../../schema/validation.js'
import { downloadJson } from '../../utils/downloadJson.js'
import { formatDateTime } from '../../utils/formatDate.js'
import { plural } from '../../utils/plural.js'
import styles from './AssetViewPage.module.css'

/** A read-only page for one saved asset, with an export button (/blueprints/:blueprintId/assets/:assetKey). */
function AssetViewPage() {
  const { blueprintId, assetKey } = useParams()
  const blueprints = useBlueprints()
  const assets = useAssets()
  const dialogues = useDialogues()
  const navigate = useNavigate()
  const toast = useToast()

  const blueprint = blueprints.find((candidate) => candidate.id === blueprintId)
  const asset = blueprint && assets.find((candidate) => candidate.schemaId === blueprint.id && candidate.key === assetKey)

  if (!blueprint || !asset) {
    return (
      <MissingRecord
        title={blueprint ? 'Asset not found' : 'Blueprint not found'}
        message={
          blueprint
            ? `There's no ${blueprint.name} asset with the ID "${assetKey}".`
            : `There's no blueprint with the ID "${blueprintId}".`
        }
        back={
          blueprint
            ? { to: `/blueprints/${blueprint.id}/assets`, label: `All ${blueprint.name} assets` }
            : { to: '/blueprints', label: 'All blueprints' }
        }
      />
    )
  }

  const name = assetLabel(asset, blueprint)
  const isOutdated = asset.schemaVersion < blueprint.version

  // Problems the saved data has against the blueprint as it is now (e.g. after the blueprint changed)
  const referenceKeys = referenceKeysFor(blueprints, assets)
  const problems = Object.entries(
    validateValues(blueprint.fields, toFormValues(blueprint.fields, asset.data), '', referenceKeys),
  ).map(([path, message]) => ({ path, label: labelForPath(blueprint.fields, path), message }))

  function resolveLink(targetSchema, key) {
    const targetBlueprint = blueprints.find((candidate) => candidate.id === targetSchema)
    const target = assets.find((candidate) => candidate.schemaId === targetSchema && candidate.key === key)
    return targetBlueprint && target ? { label: assetLabel(target, targetBlueprint), to: assetPath(targetSchema, key) } : null
  }

  // Everything that points at this asset
  const linkedFrom = [
    ...assets
      .filter((other) => other.id !== asset.id)
      .map((other) => ({ other, otherBlueprint: blueprints.find((candidate) => candidate.id === other.schemaId) }))
      .filter(({ other, otherBlueprint }) => otherBlueprint && linksTo(otherBlueprint.fields, other.data, blueprint.id, asset.key))
      .map(({ other, otherBlueprint }) => ({
        icon: Box,
        label: assetLabel(other, otherBlueprint),
        hint: `${otherBlueprint.name} · ${other.key}`,
        to: assetPath(other.schemaId, other.key),
      })),
    ...dialogues
      .filter((dialogue) => dialogueLinksToAsset(dialogue, blueprint.id, asset.key))
      .map((dialogue) => ({
        icon: MessagesSquare,
        label: dialogue.name,
        hint: `Dialogue · ${dialogue.key}`,
        to: `/dialogues/${dialogue.key}`,
      })),
  ]

  const exportShape = toExport(asset)

  function handleExport() {
    if (problems.length > 0) {
      toast.show({
        status: 'error',
        message: `Fix ${plural(problems.length, 'problem')} before exporting. Use Edit to fix them.`,
      })
      return
    }
    downloadJson(`${asset.key}.json`, exportShape)
    toast.show({ status: 'success', message: 'Asset file downloaded' })
  }

  const editPath = `${assetPath(blueprint.id, asset.key)}/edit`

  return (
    <AppShell
      actions={
        <TopBarActions
          noun="asset"
          newPath={`/blueprints/${blueprint.id}/assets/new`}
          importFile={(text) => parseAssetFile(text, blueprint)}
        />
      }
      crumbs={[
        { label: 'Blueprints', to: '/blueprints' },
        { label: blueprint.name, to: `/blueprints/${blueprint.id}/assets` },
        { label: name },
      ]}
      status={`Updated ${formatDateTime(asset.updatedAt)}`}
    >
      <div className="page">
        <header className="page-head">
          <div className={styles.titleBlock}>
            <p className={styles.eyebrow}>{blueprint.name} asset</p>
            <h1>{name}</h1>
            <div className="row">
              <code className="muted">{asset.key}</code>
              {isOutdated && <Badge tone="warning">Outdated</Badge>}
              {problems.length > 0 ? (
                <Badge tone="error">{plural(problems.length, 'problem')}</Badge>
              ) : (
                <Badge tone="success">Ready to export</Badge>
              )}
            </div>
          </div>
          <div className="page-actions">
            <Button
              icon={Copy}
              onClick={() =>
                navigate(`/blueprints/${blueprint.id}/assets/new`, {
                  state: duplicateAssetState(
                    asset,
                    blueprint,
                    assets.filter((candidate) => candidate.schemaId === blueprint.id),
                  ),
                })
              }
            >
              Duplicate
            </Button>
            <Button icon={Pencil} onClick={() => navigate(editPath)}>
              Edit
            </Button>
            <Button variant="primary" icon={Download} onClick={handleExport}>
              Export asset
            </Button>
          </div>
        </header>

        {problems.length > 0 && (
          <Notice tone="warning">
            <p>
              This asset doesn't match its blueprint anymore, so it can't be exported yet.{' '}
              <Link to={editPath}>Edit it</Link> to fix:
            </p>
            <ul className={styles.problemList}>
              {problems.map((problem) => (
                <li key={problem.path}>
                  <strong>{problem.label}</strong>: {problem.message}
                </li>
              ))}
            </ul>
          </Notice>
        )}

        <div className={styles.columns}>
          <Section title="Properties">
            {blueprint.fields.length > 0 ? (
              <ValueRenderer fields={blueprint.fields} data={asset.data} resolveLink={resolveLink} />
            ) : (
              <EmptyState message={`The ${blueprint.name} blueprint has no properties.`} />
            )}
          </Section>

          <div className={styles.side}>
            <Section title="Details">
              <div className={styles.details}>
                <span className="muted">ID</span>
                <span>{asset.key}</span>
                <span className="muted">Blueprint</span>
                <span>
                  <Link to={`/blueprints/${blueprint.id}/assets`}>{blueprint.name}</Link>
                  <span className="subtle">
                    {' '}
                    · version {asset.schemaVersion}
                    {isOutdated ? ` (now ${blueprint.version})` : ''}
                  </span>
                </span>
                <span className="muted">Created</span>
                <span>{formatDateTime(asset.createdAt)}</span>
                <span className="muted">Updated</span>
                <span>{formatDateTime(asset.updatedAt)}</span>
              </div>
            </Section>

            <Section title="Linked from">
              <LinkList items={linkedFrom} emptyMessage="Nothing links to this asset yet." />
            </Section>

            <Section title="Asset file">
              <p className="subtle">What “Export asset” downloads.</p>
              <JsonPreview value={exportShape} />
            </Section>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

export default AssetViewPage
