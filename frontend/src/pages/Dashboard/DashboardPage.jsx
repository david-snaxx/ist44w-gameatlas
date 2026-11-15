import { ArrowRight, Box, LayoutList, MessagesSquare } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { listAssets } from '../../api/assets.js'
import { listDialogues } from '../../api/dialogues.js'
import { useCurrentProject } from '../../api/useCurrentProject.js'
import AppShell from '../../components/AppShell/AppShell.jsx'
import Badge from '../../components/Badge/Badge.jsx'
import PropertyRow from '../../components/form/PropertyRow.jsx'
import Select from '../../components/form/Select.jsx'
import LinkList from '../../components/LinkList/LinkList.jsx'
import LoadingRecord from '../../components/LoadingRecord/LoadingRecord.jsx'
import Section from '../../components/Section/Section.jsx'
import { assetLabel, assetPath, countAssetProblems, referenceKeysFor } from '../../data/assetData.js'
import { countNodes, dialogueCheckContext, validateDialogueGraph } from '../../data/dialogueGraph.js'
import { countProperties } from '../../schema/blueprintDraft.js'
import { formatDateTime } from '../../utils/formatDate.js'
import { ownValue } from '../../utils/ownValue.js'
import { plural } from '../../utils/plural.js'
import styles from './DashboardPage.module.css'

const MAX_LIST_ITEMS = 6
const MAX_QUICK_ASSET_LINKS = 4

/** The home page (/): an overview of every one of the user's projects, with shortcuts. */
function DashboardPage() {
  const currentProject = useCurrentProject()
  const projects = currentProject.projects
  // Every project's assets and dialogues ({ data } or { error }), and the project list they were loaded for
  const [loaded, setLoaded] = useState({ projects: null, result: null })
  // The project Quick create makes things in; null means the one the user visited last
  const [quickProjectId, setQuickProjectId] = useState(null)
  // Read the clock once when the page opens (reading it during every render would make renders unpredictable)
  const [now] = useState(() => new Date())

  useEffect(() => {
    // Set by the cleanup below, so an answer that arrives after the page closed (or the project list changed) is ignored
    let ignore = false

    async function load() {
      const result = await loadEveryProject(projects)
      if (ignore) {
        return
      }
      setLoaded({ projects: projects, result: result })
    }

    if (projects.length > 0) {
      load()
    }
    return () => {
      ignore = true
    }
  }, [projects])

  // Every link on the page goes into a project, so wait until they're known
  if (!currentProject.project) {
    return <LoadingRecord error={currentProject.error} />
  }
  // Not loaded yet, or loaded for a project list that has changed since
  if (loaded.projects !== projects) {
    return <LoadingRecord error={null} />
  }
  if (loaded.result.error) {
    return <LoadingRecord error={loaded.result.error} />
  }

  const overviews = buildOverviews(loaded.result.data, currentProject.blueprints)
  const totals = countTotals(overviews)
  // With one project, its name in every hint would only repeat the subtitle
  const showProjectNames = overviews.length > 1

  const needsAttention = listNeedsAttention(overviews, showProjectNames)
  const recentlyUpdated = listRecentlyUpdated(overviews, showProjectNames)
  const quickOverview = findQuickOverview(overviews, quickProjectId, currentProject.project.id)

  let subtitle = `Here's the game data in ${overviews[0].project.name} at a glance.`
  if (showProjectNames) {
    subtitle = `Here's the game data in your ${plural(overviews.length, 'project')} at a glance.`
  }

  let attentionBadge = null
  if (needsAttention.length > 0) {
    attentionBadge = <Badge tone="warning">{needsAttention.length}</Badge>
  }

  return (
    <AppShell crumbs={[{ label: 'Home' }]} status={statusText(needsAttention.length)}>
      <div className={styles.page}>
        <header>
          <p className={styles.eyebrow}>
            {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1>{greetingFor(now)}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </header>

        <div className={styles.cards}>
          <SectionCard
            icon={Box}
            title="Assets"
            description="The items, characters and other data your game uses."
            value={totals.assets}
            noun="asset"
            toFix={totals.assetsToFix}
          >
            <ProjectLinks overviews={overviews} page="assets" />
          </SectionCard>

          <SectionCard
            icon={MessagesSquare}
            title="Dialogues"
            description="Conversations between characters and the player."
            value={totals.dialogues}
            noun="dialogue"
            detail={`${plural(totals.lines, 'line')} · ${plural(totals.choices, 'player choice')}`}
            toFix={totals.dialoguesToFix}
          >
            <ProjectLinks overviews={overviews} page="dialogues" />
          </SectionCard>

          <SectionCard
            icon={LayoutList}
            title="Blueprints"
            description="The properties each kind of asset has."
            value={totals.blueprints}
            noun="blueprint"
            detail={plural(totals.properties, 'property', 'properties')}
          >
            <ProjectLinks overviews={overviews} page="blueprints" />
          </SectionCard>
        </div>

        <div className={styles.columns}>
          <Section title="Recently updated">
            <LinkList items={recentlyUpdated} emptyMessage="Nothing has been saved yet." />
          </Section>

          <div className={styles.stack}>
            <Section title="Quick create">
              <div className="stack">
                {showProjectNames && (
                  <QuickCreateProject overviews={overviews} value={quickOverview.project.id} onChange={setQuickProjectId} />
                )}
                <QuickCreate projectId={quickOverview.project.id} blueprints={quickOverview.blueprints} />
              </div>
            </Section>

            <Section title="Needs attention" actions={attentionBadge}>
              <NeedsAttention items={needsAttention} />
            </Section>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

/**
 * One of the big cards: a count, a detail line, the links inside it, and a footer with how many need fixing.
 * `toFix` left out means the card has no footer.
 */
function SectionCard({ icon, title, description, value, noun, detail, toFix, children }) {
  // A component name in JSX must start with a capital letter, so copy the icon into one
  const Icon = icon

  let unit = `${noun}s`
  if (value === 1) {
    unit = noun
  }

  const hasStatus = toFix !== undefined

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.iconChip}>
          <Icon size={18} />
        </span>
        <div>
          <h2 className={styles.cardTitle}>{title}</h2>
          <p className={styles.cardDescription}>{description}</p>
        </div>
      </div>

      <p className={styles.stat}>
        <span className={styles.statValue}>{value}</span>
        <span className={styles.statUnit}>{unit}</span>
      </p>
      {detail && <p className={styles.cardDetail}>{detail}</p>}
      {children}

      {hasStatus && (
        <div className={styles.cardFooter}>
          <CardStatus toFix={toFix} />
        </div>
      )}
    </section>
  )
}

/** The badge in a card's footer: how many need fixing, or that everything is ready. */
function CardStatus({ toFix }) {
  if (toFix > 0) {
    return <Badge tone="warning">{toFix} to fix</Badge>
  }
  return <Badge tone="success">All ready</Badge>
}

/** Inside a card: one link per project to its 'assets', 'dialogues' or 'blueprints' page, with how many it has. */
function ProjectLinks({ overviews, page }) {
  const links = []
  for (const overview of overviews) {
    const project = overview.project
    links.push(
      <CountLink key={project.id} to={`/projects/${project.id}/${page}`} label={project.name} count={countOf(overview, page)} />,
    )
  }
  return <div>{links}</div>
}

/** A link with a count next to it, e.g. "My game   4 →". */
function CountLink({ to, label, count }) {
  return (
    <Link to={to} className={styles.countLink}>
      <span className={styles.countLabel}>{label}</span>
      <span className="muted">{count}</span>
      <ArrowRight size={14} />
    </Link>
  )
}

/** Above Quick create when there are several projects: which project the new things go into. */
function QuickCreateProject({ overviews, value, onChange }) {
  const options = []
  for (const overview of overviews) {
    options.push({ value: overview.project.id, label: overview.project.name })
  }
  return (
    <PropertyRow label="Project">
      <Select options={options} value={value} onChange={onChange} />
    </PropertyRow>
  )
}

/** Shortcuts to start something new: a dialogue, an asset of the first few blueprints, a blueprint. */
function QuickCreate({ projectId, blueprints }) {
  const items = [{ icon: MessagesSquare, label: 'New dialogue', to: `/projects/${projectId}/dialogues/new` }]
  for (const blueprint of blueprints.slice(0, MAX_QUICK_ASSET_LINKS)) {
    items.push({ icon: Box, label: `New ${blueprint.name}`, to: `/projects/${projectId}/blueprints/${blueprint.id}/assets/new` })
  }
  items.push({ icon: LayoutList, label: 'New blueprint', to: `/projects/${projectId}/blueprints/new` })

  return (
    <div className={styles.quickGrid}>
      {items.map((item) => (
        <QuickLink key={item.to} item={item} />
      ))}
    </div>
  )
}

/** One Quick create tile: an icon and what it makes. */
function QuickLink({ item }) {
  const Icon = item.icon
  return (
    <Link to={item.to} className={styles.quickLink}>
      <Icon size={16} />
      {item.label}
    </Link>
  )
}

/** The first few things that need attention, and how many more there are. */
function NeedsAttention({ items }) {
  if (items.length === 0) {
    return <p className={styles.allClear}>Everything is ready to export.</p>
  }

  const hiddenCount = items.length - MAX_LIST_ITEMS
  return (
    <>
      <LinkList items={items.slice(0, MAX_LIST_ITEMS)} />
      {hiddenCount > 0 && <p className={styles.more}>and {hiddenCount} more</p>}
    </>
  )
}

// ---------- Helpers ----------

// Fetches every project's assets and dialogues: { data: [{ project, assets, dialogues }] } or { error }
async function loadEveryProject(projects) {
  const contents = []
  for (const project of projects) {
    const assets = await listAssets(project.id)
    if (assets.error) {
      return { error: assets.error }
    }
    const dialogues = await listDialogues(project.id)
    if (dialogues.error) {
      return { error: dialogues.error }
    }
    contents.push({ project: project, assets: assets.data, dialogues: dialogues.data })
  }
  return { data: contents }
}

// Each project with its data and how its assets and dialogues are doing:
// [{ project, blueprints, assets, dialogues, assetStatus, dialogueStatus }]
function buildOverviews(contents, blueprintsByProject) {
  const overviews = []
  for (const content of contents) {
    let blueprints = ownValue(blueprintsByProject, content.project.id)
    if (!blueprints) {
      blueprints = []
    }
    // Links and speakers only point inside their own project, so each project is checked on its own
    overviews.push({
      project: content.project,
      blueprints: blueprints,
      assets: content.assets,
      dialogues: content.dialogues,
      assetStatus: buildAssetStatus(content.assets, blueprints),
      dialogueStatus: buildDialogueStatus(content.dialogues, blueprints, content.assets),
    })
  }
  return overviews
}

// The counts on the cards, added up over every project
function countTotals(overviews) {
  const totals = { assets: 0, assetsToFix: 0, dialogues: 0, dialoguesToFix: 0, lines: 0, choices: 0, blueprints: 0, properties: 0 }

  for (const overview of overviews) {
    totals.assets += overview.assets.length
    totals.dialogues += overview.dialogues.length
    totals.blueprints += overview.blueprints.length

    for (const status of overview.assetStatus) {
      if (status.problems > 0) {
        totals.assetsToFix++
      }
    }
    for (const status of overview.dialogueStatus) {
      if (status.problems > 0) {
        totals.dialoguesToFix++
      }
      totals.lines += countNodes(status.dialogue.nodes, 'line')
      totals.choices += countNodes(status.dialogue.nodes, 'choice')
    }
    for (const blueprint of overview.blueprints) {
      totals.properties += countProperties(blueprint.fields)
    }
  }

  return totals
}

// How many of one kind of thing a project has, for its link on the card of that kind
function countOf(overview, page) {
  if (page === 'assets') {
    return overview.assets.length
  }
  if (page === 'dialogues') {
    return overview.dialogues.length
  }
  return overview.blueprints.length
}

// The project Quick create is for: the one picked in its dropdown, else the one visited last
function findQuickOverview(overviews, pickedId, lastVisitedId) {
  const picked = overviews.find((overview) => overview.project.id === pickedId)
  if (picked) {
    return picked
  }
  const lastVisited = overviews.find((overview) => overview.project.id === lastVisitedId)
  if (lastVisited) {
    return lastVisited
  }
  return overviews[0]
}

function greetingFor(date) {
  const hour = date.getHours()
  if (hour < 12) {
    return 'Good morning'
  }
  if (hour < 18) {
    return 'Good afternoon'
  }
  return 'Good evening'
}

// Every asset with its blueprint and how it's doing: [{ asset, blueprint, problems, outdated }]
function buildAssetStatus(assets, blueprints) {
  const referenceKeys = referenceKeysFor(blueprints, assets)
  const statuses = []

  for (const asset of assets) {
    const blueprint = blueprints.find((candidate) => candidate.id === asset.schemaId)
    // An asset whose blueprint no longer exists can't be checked, so it's left out
    if (!blueprint) {
      continue
    }
    statuses.push({
      asset: asset,
      blueprint: blueprint,
      problems: countAssetProblems(asset, blueprint, referenceKeys),
      outdated: asset.schemaVersion < blueprint.version,
    })
  }

  return statuses
}

// Every dialogue and its number of problems: [{ dialogue, problems }]
function buildDialogueStatus(dialogues, blueprints, assets) {
  const context = dialogueCheckContext(blueprints, assets)
  const statuses = []
  for (const dialogue of dialogues) {
    statuses.push({ dialogue: dialogue, problems: validateDialogueGraph(dialogue, context).length })
  }
  return statuses
}

// A list item's hint, starting with its project's name when the user has several projects
function hintFor(overview, text, showProjectNames) {
  if (showProjectNames) {
    return `${overview.project.name} · ${text}`
  }
  return text
}

// In every project: assets with problems or saved with an older blueprint, then dialogues with problems (as LinkList items)
function listNeedsAttention(overviews, showProjectNames) {
  const items = []

  for (const overview of overviews) {
    const projectId = overview.project.id

    for (const status of overview.assetStatus) {
      if (status.problems === 0 && !status.outdated) {
        continue
      }
      let reason = 'saved with an older blueprint'
      if (status.problems > 0) {
        reason = plural(status.problems, 'problem')
      }
      items.push({
        icon: Box,
        label: assetLabel(status.asset, status.blueprint),
        hint: hintFor(overview, `${status.blueprint.name} asset · ${reason}`, showProjectNames),
        to: assetPath(projectId, status.asset.schemaId, status.asset.key),
      })
    }

    for (const status of overview.dialogueStatus) {
      if (status.problems > 0) {
        items.push({
          icon: MessagesSquare,
          label: status.dialogue.name,
          hint: hintFor(overview, `Dialogue · ${plural(status.problems, 'problem')}`, showProjectNames),
          to: `/projects/${projectId}/dialogues/${status.dialogue.key}`,
        })
      }
    }
  }

  return items
}

// The most recently saved assets and dialogues of every project, newest first (as LinkList items)
function listRecentlyUpdated(overviews, showProjectNames) {
  const items = []

  for (const overview of overviews) {
    const projectId = overview.project.id

    for (const status of overview.assetStatus) {
      items.push({
        icon: Box,
        label: assetLabel(status.asset, status.blueprint),
        hint: hintFor(overview, `${status.blueprint.name} asset`, showProjectNames),
        updatedAt: status.asset.updatedAt,
        to: assetPath(projectId, status.asset.schemaId, status.asset.key),
      })
    }
    for (const dialogue of overview.dialogues) {
      items.push({
        icon: MessagesSquare,
        label: dialogue.name,
        hint: hintFor(overview, 'Dialogue', showProjectNames),
        updatedAt: dialogue.updatedAt,
        to: `/projects/${projectId}/dialogues/${dialogue.key}`,
      })
    }
  }

  items.sort(newestFirst)
  const newest = items.slice(0, MAX_LIST_ITEMS)

  // Add when each one was saved to its hint
  for (const item of newest) {
    item.hint = `${item.hint} · ${formatDateTime(item.updatedAt)}`
  }
  return newest
}

// For sorting: the item saved last comes first. ISO dates ("2026-09-12T…") sort correctly as plain text.
function newestFirst(a, b) {
  return b.updatedAt.localeCompare(a.updatedAt)
}

// The status bar text
function statusText(attentionCount) {
  if (attentionCount === 0) {
    return 'Everything is ready to export'
  }
  if (attentionCount === 1) {
    return '1 item needs attention'
  }
  return `${attentionCount} items need attention`
}

export default DashboardPage
