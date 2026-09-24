import { useState } from 'react'
import { cx } from '../../utils/cx.js'

function compare(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a ?? '').localeCompare(String(b ?? ''))
}

/**
 * A table whose rows can be clicked. Clicking a column header sorts by it; clicking again reverses.
 * columns: [{ key, label, render?(row) }]. render shows something other than row[key]; sorting still uses row[key].
 * rows: objects that each have a unique `id`.
 * onSelect(id): called when a row is clicked. selectedId: highlights that row.
 */
function Table({ columns, rows, selectedId, onSelect }) {
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

  return (
    <table className="table">
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key} onClick={() => toggleSort(column.key)}>
              {column.label}
              {sort.key === column.key && (sort.direction === 'asc' ? ' ↑' : ' ↓')}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sortedRows.map((row) => (
          <tr key={row.id} className={cx(row.id === selectedId && 'is-selected')} onClick={() => onSelect(row.id)}>
            {columns.map((column) => (
              <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default Table
