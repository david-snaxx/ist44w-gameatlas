import AppShell from '../AppShell/AppShell.jsx'
import EmptyState from '../EmptyState/EmptyState.jsx'
import TextInput from '../form/TextInput.jsx'
import Table from '../Table/Table.jsx'
import { plural } from '../../utils/plural.js'

/**
 * Every "all the X" page: a heading with buttons, an optional search toolbar, and a table or empty state.
 * rows: already filtered by the page; total: how many before filtering ("nothing yet" vs "nothing matches")
 * noun: e.g. "asset", for the count and search placeholder
 * onSearch: shows a search box when given; toolbarExtra: more filters beside it
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
