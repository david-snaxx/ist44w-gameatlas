import AppShell from '../AppShell/AppShell.jsx'
import AppSidebar from '../AppSidebar/AppSidebar.jsx'
import Breadcrumbs from '../Breadcrumbs/Breadcrumbs.jsx'
import Button from '../Button/Button.jsx'
import EmptyState from '../EmptyState/EmptyState.jsx'
import TextInput from '../form/TextInput.jsx'
import Section from '../Section/Section.jsx'
import Table from '../Table/Table.jsx'
import { plural } from '../../utils/plural.js'

/**
 * The shape every "all the X" page has: a heading with buttons, an optional search
 * toolbar, and a table that falls back to an empty state.
 *
 * The page keeps its own data and search state and passes already-filtered `rows`,
 * plus `total` (how many there are before filtering) so the count and the empty states
 * can tell "nothing yet" from "nothing matches".
 *
 * noun: the thing being listed, e.g. "asset" — used for counts and placeholders
 * empty: what to show when there are none at all (usually an <EmptyState>)
 * onClearFilters: resets search and any extra filters; defaults to clearing the search
 */
function ListPage({
  title,
  intro,
  actions,
  topBarActions,
  crumbs = [],
  status,
  noun,
  nounPlural = `${noun}s`,
  search,
  onSearch,
  toolbarExtra,
  onClearFilters,
  total,
  columns,
  rows,
  onSelect,
  tableLabel,
  empty,
}) {
  const count = (value) => plural(value, noun, nounPlural)

  return (
    <AppShell
      actions={topBarActions}
      sidebar={<AppSidebar />}
      breadcrumbs={<Breadcrumbs items={crumbs} />}
      status={status ?? count(total)}
    >
      <div className="page">
        <header className="page-head">
          <div>
            <h1>{title}</h1>
            {intro && <p className="page-intro">{intro}</p>}
          </div>
          {actions && <div className="page-actions">{actions}</div>}
        </header>

        {total > 0 && (onSearch || toolbarExtra) && (
          <div className="toolbar">
            {onSearch && (
              <TextInput
                type="search"
                className="toolbar-search"
                aria-label={`Search ${nounPlural}`}
                placeholder={`Search ${nounPlural}…`}
                value={search}
                onChange={(event) => onSearch(event.target.value)}
              />
            )}
            {toolbarExtra}
            <span className="small muted">
              {rows.length === total ? count(total) : `${rows.length} of ${count(total)}`}
            </span>
          </div>
        )}

        <Section bodyClassName="flush">
          {total === 0 ? (
            empty
          ) : rows.length === 0 ? (
            <EmptyState message={`No ${nounPlural} match these filters.`}>
              <Button onClick={onClearFilters ?? (() => onSearch(''))}>Clear filters</Button>
            </EmptyState>
          ) : (
            <Table label={tableLabel ?? title} columns={columns} rows={rows} onSelect={onSelect} />
          )}
        </Section>
      </div>
    </AppShell>
  )
}

export default ListPage
