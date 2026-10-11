import AppShell from '../AppShell/AppShell.jsx'
import EmptyState from '../EmptyState/EmptyState.jsx'
import TextInput from '../form/TextInput.jsx'
import Table from '../Table/Table.jsx'
import { plural } from '../../utils/plural.js'

/**
 * The shape every "all the X" page has: a heading with buttons, an optional search
 * toolbar, and a table that falls back to an empty state.
 *
 * The page keeps its own data and search state and passes already-filtered `rows`,
 * plus `total` (how many there are before filtering) so the empty states can tell
 * "nothing yet" from "nothing matches".
 *
 * noun: the thing being listed, e.g. "asset" — used for the count and the search placeholder
 * onSearch: shows a search box when given
 * toolbarExtra: more filters shown next to the search box
 * empty: what to show when there are none at all (usually an <EmptyState>)
 */
function ListPage({
  title,
  intro,
  actions,
  topBarActions,
  crumbs,
  noun,
  search,
  onSearch,
  toolbarExtra,
  total,
  columns,
  rows,
  onSelect,
  empty,
}) {
  // The search box only makes sense once there is something to search
  const showToolbar = total > 0 && Boolean(onSearch)

  let content
  if (total === 0) {
    content = empty
  } else if (rows.length === 0) {
    content = <EmptyState message={`No ${noun}s match.`} />
  } else {
    content = <Table columns={columns} rows={rows} onSelect={onSelect} />
  }

  return (
    <AppShell actions={topBarActions} crumbs={crumbs} status={plural(total, noun)}>
      <div className="page">
        <header className="page-head">
          <div>
            <h1>{title}</h1>
            <p className="page-intro">{intro}</p>
          </div>
          <div className="page-actions">{actions}</div>
        </header>

        {showToolbar && (
          <div className="toolbar">
            <TextInput
              type="search"
              placeholder={`Search ${noun}s…`}
              value={search}
              onChange={(event) => onSearch(event.target.value)}
            />
            {toolbarExtra}
          </div>
        )}

        {content}
      </div>
    </AppShell>
  )
}

export default ListPage
