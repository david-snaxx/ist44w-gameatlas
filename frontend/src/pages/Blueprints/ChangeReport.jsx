import { plural } from '../../utils/plural.js'
import styles from './ChangeReport.module.css'

/** A group with more assets than this starts folded, so a long report stays short until it's opened. */
const OPEN_UP_TO = 5

/**
 * The body of the save confirmation: one foldable group per way a blueprint change affects its assets (from
 * describeBlueprintChanges()), each listing the assets and what happens to them. Empty groups are left out.
 */
function ChangeReport({ report }) {
  return (
    <div className={styles.report}>
      <ReportGroup title="will lose values" entries={report.lostValues} />
      <ReportGroup title="will have values converted to a new type" entries={report.changedValues} />
      <ReportGroup title="will get new problems" entries={report.newProblems} />
    </div>
  )
}

/** One way assets are affected: a foldable heading saying how many, then each asset and what happens to it. */
function ReportGroup({ title, entries }) {
  if (entries.length === 0) {
    return null
  }

  const items = []
  for (const entry of entries) {
    items.push(<ReportEntry key={entry.id} entry={entry} />)
  }
  const startsOpen = entries.length <= OPEN_UP_TO

  return (
    <details open={startsOpen}>
      <summary className={styles.summary}>
        {plural(entries.length, 'asset')} {title}
      </summary>
      <ul className={styles.entries}>{items}</ul>
    </details>
  )
}

/** One asset's name, then each of its values the change touches. */
function ReportEntry({ entry }) {
  const details = []
  for (const detail of entry.details) {
    details.push(<li key={detail}>{detail}</li>)
  }

  return (
    <li>
      <span className={styles.assetName}>{entry.name}</span>
      <ul className={styles.details}>{details}</ul>
    </li>
  )
}

export default ChangeReport
