import { ArrowRight, Box, LayoutList, MessagesSquare } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import AppShell from '../../components/AppShell/AppShell.jsx'
import Badge from '../../components/Badge/Badge.jsx'
import LinkList from '../../components/LinkList/LinkList.jsx'
import Section from '../../components/Section/Section.jsx'
import { assetLabel, assetPath, countAssetProblems, referenceKeysFor } from '../../data/assetData.js'
import { countNodes, dialogueCheckContext, validateDialogueGraph } from '../../data/dialogueGraph.js'
import { useAssets } from '../../data/useAssets.js'
import { useDialogues } from '../../data/useDialogues.js'
import { countProperties } from '../../schema/blueprintDraft.js'
import { useBlueprints } from '../../schema/useBlueprints.js'
import { formatDateTime } from '../../utils/formatDate.js'
import { plural } from '../../utils/plural.js'
import styles from './DashboardPage.module.css'

const MAX_LIST_ITEMS = 6
const MAX_QUICK_ASSET_LINKS = 4

/** The home page (/): an overview of every section, with shortcuts. */
function DashboardPage() {
  const blueprints = useBlueprints()
  const assets = useAssets()
  const dialogues = useDialogues()
  // Read the clock once when the page opens (reading it during every render would make renders unpredictable)
  const [now] = useState(() => new Date())

  // ---------- Status of every asset and dialogue ----------

  const assetStatus = buildAssetStatus(assets, blueprints)
  const dialogueStatus = buildDialogueStatus(dialogues, blueprints, assets)

  let assetsToFix = 0
  for (const status of assetStatus) {
    if (status.problems > 0) {
      assetsToFix++
    }
  }

  let dialoguesToFix = 0
  let totalLines = 0
  let totalChoices = 0
  for (const status of dialogueStatus) {
    if (status.problems > 0) {
      dialoguesToFix++
    }
    totalLines += countNodes(status.dialogue.nodes, 'line')
    totalChoices += countNodes(status.dialogue.nodes, 'choice')
  }

  let totalProperties = 0
  for (const blueprint of blueprints) {
    totalProperties += countProperties(blueprint.fields)
  }

  // ---------- Lists ----------

  const needsAttention = listNeedsAttention(assetStatus, dialogueStatus)
  const recentlyUpdated = listRecentlyUpdated(assetStatus, dialogues)

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
          <p className={styles.subtitle}>Here's your game data at a glance.</p>
        </header>

        <div className={styles.cards}>
          <SectionCard
            icon={Box}
            title="Assets"
            description="The items, characters and other data your game uses."
            value={assets.length}
            noun="asset"
            toFix={assetsToFix}
          >
            <BlueprintLinks blueprints={blueprints} assets={assets} />
          </SectionCard>

          <SectionCard
            icon={MessagesSquare}
            title="Dialogues"
            description="Conversations between characters and the player."
            value={dialogues.length}
            noun="dialogue"
            detail={`${plural(totalLines, 'line')} · ${plural(totalChoices, 'player choice')}`}
            toFix={dialoguesToFix}
            link={{ to: '/dialogues', label: 'All dialogues' }}
          />

          <SectionCard
            icon={LayoutList}
            title="Blueprints"
            description="The properties each kind of asset has."
            value={blueprints.length}
            noun="blueprint"
            detail={plural(totalProperties, 'property', 'properties')}
            link={{ to: '/blueprints', label: 'All blueprints' }}
          />
        </div>

        <div className={styles.columns}>
          <Section title="Recently updated">
            <LinkList items={recentlyUpdated} emptyMessage="Nothing has been saved yet." />
          </Section>

          <div className={styles.stack}>
            <Section title="Quick create">
              <QuickCreate blueprints={blueprints} />
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
 * One of the big cards linking to a section of the app: a count, a detail line, and a footer
 * with how many need fixing and/or a link. `toFix` left out means the card has no status badge.
 */
function SectionCard({ icon, title, description, value, noun, detail, toFix, link, children }) {
  // A component name in JSX must start with a capital letter, so copy the icon into one
  const Icon = icon

  let unit = `${noun}s`
  if (value === 1) {
    unit = noun
  }

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

      <div className={styles.cardFooter}>
        <CardStatus toFix={toFix} />
        {link && (
          <Link to={link.to} className={styles.footerLink}>
            {link.label}
            <ArrowRight size={14} />
          </Link>
        )}
      </div>
    </section>
  )
}

/** The badge in a card's footer: how many need fixing, or that everything is ready. */
function CardStatus({ toFix }) {
  if (toFix === undefined) {
    // An empty span keeps the footer link on the right
    return <span />
  }
  if (toFix > 0) {
    return <Badge tone="warning">{toFix} to fix</Badge>
  }
  return <Badge tone="success">All ready</Badge>
}

/** Inside the Assets card: All assets, then one link per blueprint with its asset count. */
function BlueprintLinks({ blueprints, assets }) {
  if (blueprints.length === 0) {
    return (
      <p className={styles.cardDetail}>
        <Link to="/blueprints/new">Create a blueprint</Link> to start adding assets.
      </p>
    )
  }

  const links = []
  for (const blueprint of blueprints) {
    let count = 0
    for (const asset of assets) {
      if (asset.schemaId === blueprint.id) {
        count++
      }
    }
    links.push(
      <CountLink key={blueprint.id} to={`/blueprints/${blueprint.id}/assets`} label={blueprint.name} count={count} />,
    )
  }

  return (
    <div>
      <CountLink to="/assets" label="All assets" count={assets.length} />
      {links}
    </div>
  )
}

/** A link with a count next to it, e.g. "Item   4 →". */
function CountLink({ to, label, count }) {
  return (
    <Link to={to} className={styles.blueprintLink}>
      <span className={styles.blueprintName}>{label}</span>
      <span className="muted">{count}</span>
      <ArrowRight size={14} />
    </Link>
  )
}

/** Shortcuts to start something new: a dialogue, an asset of the first few blueprints, a blueprint. */
function QuickCreate({ blueprints }) {
  const items = [{ icon: MessagesSquare, label: 'New dialogue', to: '/dialogues/new' }]
  for (const blueprint of blueprints.slice(0, MAX_QUICK_ASSET_LINKS)) {
    items.push({ icon: Box, label: `New ${blueprint.name}`, to: `/blueprints/${blueprint.id}/assets/new` })
  }
  items.push({ icon: LayoutList, label: 'New blueprint', to: '/blueprints/new' })

  return (
    <div className={styles.quickGrid}>
      {items.map((item) => (
        <QuickLink key={item.to} item={item} />
      ))}
    </div>
  )
}

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

// Assets with problems or saved with an older blueprint, then dialogues with problems (as LinkList items)
function listNeedsAttention(assetStatus, dialogueStatus) {
  const items = []

  for (const status of assetStatus) {
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
      hint: `${status.blueprint.name} asset · ${reason}`,
      to: assetPath(status.asset.schemaId, status.asset.key),
    })
  }

  for (const status of dialogueStatus) {
    if (status.problems > 0) {
      items.push({
        icon: MessagesSquare,
        label: status.dialogue.name,
        hint: `Dialogue · ${plural(status.problems, 'problem')}`,
        to: `/dialogues/${status.dialogue.key}`,
      })
    }
  }

  return items
}

// The most recently saved assets and dialogues, newest first (as LinkList items)
function listRecentlyUpdated(assetStatus, dialogues) {
  const items = []
  for (const status of assetStatus) {
    items.push({
      icon: Box,
      label: assetLabel(status.asset, status.blueprint),
      hint: `${status.blueprint.name} asset`,
      updatedAt: status.asset.updatedAt,
      to: assetPath(status.asset.schemaId, status.asset.key),
    })
  }
  for (const dialogue of dialogues) {
    items.push({
      icon: MessagesSquare,
      label: dialogue.name,
      hint: 'Dialogue',
      updatedAt: dialogue.updatedAt,
      to: `/dialogues/${dialogue.key}`,
    })
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
