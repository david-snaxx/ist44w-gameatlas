import { ArrowRight, Box, CircleCheck, LayoutList, MessagesSquare } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import AppShell from '../../components/AppShell/AppShell.jsx'
import AppSidebar from '../../components/AppSidebar/AppSidebar.jsx'
import Badge from '../../components/Badge/Badge.jsx'
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx'
import LinkList from '../../components/LinkList/LinkList.jsx'
import Section from '../../components/Section/Section.jsx'
import { assetLabel, assetPath, countAssetProblems, referenceKeysFor } from '../../data/assetData.js'
import { countNodes, validateDialogueGraph } from '../../data/dialogueGraph.js'
import { useAssets } from '../../data/useAssets.js'
import { useDialogues } from '../../data/useDialogues.js'
import { countProperties } from '../../schema/blueprintDraft.js'
import { useBlueprints } from '../../schema/useBlueprints.js'
import { formatDateTime } from '../../utils/formatDate.js'
import { plural } from '../../utils/plural.js'
import styles from './DashboardPage.module.css'

const MAX_LIST_ITEMS = 6
const MAX_QUICK_ASSET_LINKS = 4

function greetingFor(date) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/** One of the big cards linking to a section of the app. */
function SectionCard({ icon: Icon, title, description, value, unit, detail, toFix, link, children }) {
  const titleId = `dashboard-${title.toLowerCase()}`
  return (
    <section className={styles.card} aria-labelledby={titleId}>
      <div className={styles.cardHeader}>
        <span className={styles.iconChip}>
          <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div>
          <h2 id={titleId} className={styles.cardTitle}>
            {title}
          </h2>
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
        {toFix === undefined ? (
          <span />
        ) : toFix > 0 ? (
          <Badge tone="warning">{toFix} to fix</Badge>
        ) : (
          <Badge tone="success">All ready</Badge>
        )}
        {link && (
          <Link to={link.to} className={styles.footerLink}>
            {link.label}
            <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  )
}

/** The home page (/): an overview of every section, with shortcuts. */
function DashboardPage() {
  const blueprints = useBlueprints()
  const assets = useAssets()
  const dialogues = useDialogues()
  // Read the clock once when the page opens (reading it during every render would make renders unpredictable)
  const [now] = useState(() => new Date())

  const blueprintById = Object.fromEntries(blueprints.map((blueprint) => [blueprint.id, blueprint]))
  const referenceKeys = referenceKeysFor(blueprints, assets)

  // ---------- Status of every asset and dialogue ----------

  const assetStatus = assets
    .filter((asset) => blueprintById[asset.schemaId])
    .map((asset) => {
      const blueprint = blueprintById[asset.schemaId]
      return {
        asset,
        blueprint,
        problems: countAssetProblems(asset, blueprint, referenceKeys),
        outdated: asset.schemaVersion < blueprint.version,
      }
    })

  const dialogueStatus = dialogues.map((dialogue) => ({
    dialogue,
    problems: validateDialogueGraph(dialogue, {
      blueprintIds: blueprints.map((blueprint) => blueprint.id),
      assetKeys: referenceKeys,
    }).length,
  }))

  const assetsToFix = assetStatus.filter((status) => status.problems > 0).length
  const dialoguesToFix = dialogueStatus.filter((status) => status.problems > 0).length
  const totalLines = dialogues.reduce((total, dialogue) => total + countNodes(dialogue.nodes, 'line'), 0)
  const totalChoices = dialogues.reduce((total, dialogue) => total + countNodes(dialogue.nodes, 'choice'), 0)
  const totalProperties = blueprints.reduce((total, blueprint) => total + countProperties(blueprint.fields), 0)

  // ---------- Lists ----------

  const needsAttention = [
    ...assetStatus
      .filter((status) => status.problems > 0 || status.outdated)
      .map(({ asset, blueprint, problems }) => ({
        id: asset.id,
        icon: Box,
        label: assetLabel(asset, blueprint),
        hint: `${blueprint.name} asset · ${problems > 0 ? plural(problems, 'problem') : 'saved with an older blueprint'}`,
        tone: problems > 0 ? 'error' : 'warning',
        to: assetPath(asset.schemaId, asset.key),
      })),
    ...dialogueStatus
      .filter((status) => status.problems > 0)
      .map(({ dialogue, problems }) => ({
        id: dialogue.id,
        icon: MessagesSquare,
        label: dialogue.name,
        hint: `Dialogue · ${plural(problems, 'problem')}`,
        tone: 'error',
        to: `/dialogues/${dialogue.key}`,
      })),
  ]

  const recentlyUpdated = [
    ...assetStatus.map(({ asset, blueprint }) => ({
      id: asset.id,
      icon: Box,
      label: assetLabel(asset, blueprint),
      hint: `${blueprint.name} asset`,
      updatedAt: asset.updatedAt,
      to: assetPath(asset.schemaId, asset.key),
    })),
    ...dialogues.map((dialogue) => ({
      id: dialogue.id,
      icon: MessagesSquare,
      label: dialogue.name,
      hint: 'Dialogue',
      updatedAt: dialogue.updatedAt,
      to: `/dialogues/${dialogue.key}`,
    })),
  ]
    // ISO dates sort correctly as plain text
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_LIST_ITEMS)
    .map((item) => ({ ...item, meta: formatDateTime(item.updatedAt) }))

  const quickCreate = [
    { id: 'dialogue', icon: MessagesSquare, label: 'New dialogue', to: '/dialogues/new' },
    ...blueprints.slice(0, MAX_QUICK_ASSET_LINKS).map((blueprint) => ({
      id: `asset-${blueprint.id}`,
      icon: Box,
      label: `New ${blueprint.name}`,
      to: `/blueprints/${blueprint.id}/assets/new`,
    })),
    { id: 'blueprint', icon: LayoutList, label: 'New blueprint', to: '/blueprints/new' },
  ]

  const status =
    needsAttention.length === 0
      ? 'Everything is ready to export'
      : `${needsAttention.length === 1 ? '1 item needs' : `${needsAttention.length} items need`} attention`

  return (
    <AppShell sidebar={<AppSidebar />} breadcrumbs={<Breadcrumbs items={[{ label: 'Home' }]} />} status={status}>
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
            unit={assets.length === 1 ? 'asset' : 'assets'}
            toFix={assetsToFix}
          >
            {blueprints.length > 0 ? (
              <ul className={styles.blueprintLinks}>
                <li>
                  <Link to="/assets" className={styles.blueprintLink}>
                    <span className={styles.blueprintName}>All assets</span>
                    <span className={styles.count}>{assets.length}</span>
                    <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
                  </Link>
                </li>
                {blueprints.map((blueprint) => (
                  <li key={blueprint.id}>
                    <Link to={`/blueprints/${blueprint.id}/assets`} className={styles.blueprintLink}>
                      <span className={styles.blueprintName}>{blueprint.name}</span>
                      <span className={styles.count}>
                        {assets.filter((asset) => asset.schemaId === blueprint.id).length}
                      </span>
                      <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.cardDetail}>
                <Link to="/blueprints/new" className={styles.inlineLink}>
                  Create a blueprint
                </Link>{' '}
                to start adding assets.
              </p>
            )}
          </SectionCard>

          <SectionCard
            icon={MessagesSquare}
            title="Dialogues"
            description="Conversations between characters and the player."
            value={dialogues.length}
            unit={dialogues.length === 1 ? 'dialogue' : 'dialogues'}
            detail={`${plural(totalLines, 'line')} · ${plural(totalChoices, 'player choice')}`}
            toFix={dialoguesToFix}
            link={{ to: '/dialogues', label: 'All dialogues' }}
          />

          <SectionCard
            icon={LayoutList}
            title="Blueprints"
            description="The properties each kind of asset has."
            value={blueprints.length}
            unit={blueprints.length === 1 ? 'blueprint' : 'blueprints'}
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
              <div className={styles.quickGrid}>
                {quickCreate.map((item) => (
                  <Link key={item.id} to={item.to} className={styles.quickLink}>
                    <item.icon size={16} strokeWidth={1.75} aria-hidden="true" />
                    <span className={styles.quickLabel}>{item.label}</span>
                  </Link>
                ))}
              </div>
            </Section>

            <Section
              title="Needs attention"
              actions={needsAttention.length > 0 && <Badge tone="warning">{needsAttention.length}</Badge>}
            >
              {needsAttention.length > 0 ? (
                <>
                  <LinkList items={needsAttention.slice(0, MAX_LIST_ITEMS)} />
                  {needsAttention.length > MAX_LIST_ITEMS && (
                    <p className={styles.more}>and {needsAttention.length - MAX_LIST_ITEMS} more</p>
                  )}
                </>
              ) : (
                <p className={styles.allClear}>
                  <CircleCheck size={16} strokeWidth={1.75} aria-hidden="true" />
                  Everything is ready to export.
                </p>
              )}
            </Section>
          </div>
        </div>

        <p className={styles.devNote}>
          Working on GameAtlas itself? The{' '}
          <Link to="/dev/styles" className={styles.inlineLink}>
            style showcase
          </Link>{' '}
          shows every color and component.
        </p>
      </div>
    </AppShell>
  )
}

export default DashboardPage
