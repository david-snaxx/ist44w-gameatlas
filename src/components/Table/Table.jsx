import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { cx } from '../../utils/cx.js'

function compare(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a ?? '').localeCompare(String(b ?? ''))
}

/**
 * columns: [{ key, label, sortable?, numeric?, mono?, render?(row) }]
 *   numeric: right-aligned monospace numbers. mono: muted monospace (IDs).
 * rows: array of objects. rowKey: the property that uniquely identifies a row.
 * onSelect(key): makes rows clickable; selectedKey highlights one row.
 */
function Table({ columns, rows, rowKey = 'id', selectedKey, onSelect, label }) {
  const [sort, setSort] = useState({ key: null, direction: 'asc' })

  const sortedRows = sort.key
    ? [...rows].sort((a, b) => compare(a[sort.key], b[sort.key]) * (sort.direction === 'asc' ? 1 : -1))
    : rows

  function toggleSort(key) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )
  }

  function handleRowKeyDown(event, key) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(key)
    }
  }

  return (
    <div className="table-wrap">
      <table className="table" aria-label={label}>
        <thead>
          <tr>
            {columns.map((column) => {
              const isSorted = sort.key === column.key
              const SortIcon = !isSorted ? ChevronsUpDown : sort.direction === 'asc' ? ChevronUp : ChevronDown
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={cx(column.numeric && 'table-numeric')}
                  aria-sort={isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  {column.sortable ? (
                    <button type="button" className="table-sort" onClick={() => toggleSort(column.key)}>
                      {column.label}
                      <SortIcon
                        size={14}
                        strokeWidth={1.75}
                        className={cx(!isSorted && 'table-sort-idle')}
                        aria-hidden="true"
                      />
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => {
            const key = row[rowKey]
            return (
              <tr
                key={key}
                className={cx(onSelect && 'table-clickable', key === selectedKey && 'is-selected')}
                tabIndex={onSelect ? 0 : undefined}
                aria-current={key === selectedKey ? 'true' : undefined}
                onClick={onSelect ? () => onSelect(key) : undefined}
                onKeyDown={onSelect ? (event) => handleRowKeyDown(event, key) : undefined}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cx(column.numeric && 'table-numeric', column.mono && 'table-mono')}
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default Table
