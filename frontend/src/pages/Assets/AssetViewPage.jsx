import { Box, Copy, Download, MessagesSquare, Pencil } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import AppShell from '../../components/AppShell/AppShell.jsx'
import Badge from '../../components/Badge/Badge.jsx'
import Button from '../../components/Button/Button.jsx'
import EmptyState from '../../components/EmptyState/EmptyState.jsx'
import ValueRenderer from '../../components/form/ValueRenderer.jsx'
import JsonPreview from '../../components/JsonPreview/JsonPreview.jsx'
import LinkList from '../../components/LinkList/LinkList.jsx'
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
import MissingAsset from './MissingAsset.jsx'
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
  let asset = null
  if (blueprint) {
    asset = assets.find((candidate) => candidate.schemaId === blueprint.id && candidate.key === assetKey)
  }

  if (!blueprint || !asset) {
    return <MissingAsset blueprint={blueprint} blueprintId={blueprintId} assetKey={assetKey} />
  }

  const name = assetLabel(asset, blueprint)
  const isOutdated = asset.schemaVersion < blueprint.version
  const referenceKeys = referenceKeysFor(blueprints, assets)
  const problems = listProblems(asset, blueprint, referenceKeys)
  const linkedFrom = findLinksTo(asset, blueprint, assets, blueprints, dialogues)
  const exportShape = toExport(asset)
  const editPath = `${assetPath(blueprint.id, asset.key)}/edit`

  // For ValueRenderer: where a link property points, or null if that asset is gone
  function resolveLink(targetSchema, key) {
    const targetBlueprint = blueprints.find((candidate) => candidate.id === targetSchema)
    const target = assets.find((candidate) => candidate.schemaId === targetSchema && candidate.key === key)
    if (!targetBlueprint || !target) {
      return null
    }
    return { label: assetLabel(target, targetBlueprint), to: assetPath(targetSchema, key) }
  }

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

  function handleDuplicate() {
    const blueprintAssets = assets.filter((candidate) => candidate.schemaId === blueprint.id)
    const state = duplicateAssetState(asset, blueprint, blueprintAssets)
    navigate(`/blueprints/${blueprint.id}/assets/new`, { state: state })
  }

  let properties = <EmptyState message={`The ${blueprint.name} blueprint has no properties.`} />
  if (blueprint.fields.length > 0) {
    properties = <ValueRenderer fields={blueprint.fields} data={asset.data} resolveLink={resolveLink} />
  }

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
              <ExportStatus problemCount={problems.length} />
            </div>
          </div>
          <div className="page-actions">
            <Button icon={Copy} onClick={handleDuplicate}>
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

        {problems.length > 0 && <ProblemsNotice problems={problems} editPath={editPath} />}

        <div className={styles.columns}>
          <Section title="Properties">{properties}</Section>

          <div className={styles.side}>
            <Section title="Details">
              <AssetDetails asset={asset} blueprint={blueprint} isOutdated={isOutdated} />
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

/** The badge next to the asset's ID: how many problems it has, or that it's ready to export. */
function ExportStatus({ problemCount }) {
  if (problemCount > 0) {
    return <Badge tone="error">{plural(problemCount, 'problem')}</Badge>
  }
  return <Badge tone="success">Ready to export</Badge>
}

/** A warning that lists what no longer matches the blueprint, with a link to the editor. */
function ProblemsNotice({ problems, editPath }) {
  return (
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
  )
}

/** ID, blueprint (and version), created and updated, as label | value pairs. */
function AssetDetails({ asset, blueprint, isOutdated }) {
  let versionText = ` · version ${asset.schemaVersion}`
  if (isOutdated) {
    versionText = `${versionText} (now ${blueprint.version})`
  }

  return (
    <div className={styles.details}>
      <span className="muted">ID</span>
      <span>{asset.key}</span>

      <span className="muted">Blueprint</span>
      <span>
        <Link to={`/blueprints/${blueprint.id}/assets`}>{blueprint.name}</Link>
        <span className="subtle">{versionText}</span>
      </span>

      <span className="muted">Created</span>
      <span>{formatDateTime(asset.createdAt)}</span>

      <span className="muted">Updated</span>
      <span>{formatDateTime(asset.updatedAt)}</span>
    </div>
  )
}

// Problems the saved data has against the blueprint as it is now (e.g. after the blueprint changed)
function listProblems(asset, blueprint, referenceKeys) {
  const values = toFormValues(blueprint.fields, asset.data)
  const errors = validateValues(blueprint.fields, values, '', referenceKeys)

  const problems = []
  for (const path of Object.keys(errors)) {
    problems.push({ path: path, label: labelForPath(blueprint.fields, path), message: errors[path] })
  }
  return problems
}

// Everything that points at this asset: other assets that link to it, and dialogues that use it
function findLinksTo(asset, blueprint, assets, blueprints, dialogues) {
  const links = []

  for (const other of assets) {
    if (other.id === asset.id) {
      continue
    }
    const otherBlueprint = blueprints.find((candidate) => candidate.id === other.schemaId)
    if (!otherBlueprint) {
      continue
    }
    if (linksTo(otherBlueprint.fields, other.data, blueprint.id, asset.key)) {
      links.push({
        icon: Box,
        label: assetLabel(other, otherBlueprint),
        hint: `${otherBlueprint.name} · ${other.key}`,
        to: assetPath(other.schemaId, other.key),
      })
    }
  }

  for (const dialogue of dialogues) {
    if (dialogueLinksToAsset(dialogue, blueprint.id, asset.key)) {
      links.push({
        icon: MessagesSquare,
        label: dialogue.name,
        hint: `Dialogue · ${dialogue.key}`,
        to: `/dialogues/${dialogue.key}`,
      })
    }
  }

  return links
}

export default AssetViewPage
