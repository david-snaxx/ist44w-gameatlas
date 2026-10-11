import { useState } from 'react'

/**
 * A table whose rows can be clicked. Clicking a column header sorts by it; clicking again reverses.
 * columns: [{ key, label, render?(row) }]. render shows something other than row[key]; sorting still uses row[key].
 * rows: objects that each have a unique `id`.
 * onSelect(id): called when a row is clicked. selectedId: highlights that row.
 */
function Table({ columns, rows, selectedId, onSelect }) {
  // Which column the table is sorted by (null = the order the rows came in), and which way
  const [sortKey, setSortKey] = useState(null)
  const [sortAscending, setSortAscending] = useState(true)

  function handleHeaderClick(key) {
    if (key === sortKey) {
      // The same header again: reverse the order
      setSortAscending(!sortAscending)
    } else {
      setSortKey(key)
      setSortAscending(true)
    }
  }

  const sortedRows = sortRows(rows, sortKey, sortAscending)

  return (
    <table className="table">
      <thead>
        <tr>
          {columns.map((column) => (
            <HeaderCell
              key={column.key}
              column={column}
              sortKey={sortKey}
              sortAscending={sortAscending}
              onClick={handleHeaderClick}
            />
          ))}
        </tr>
      </thead>
      <tbody>
        {sortedRows.map((row) => (
          <TableRow key={row.id} row={row} columns={columns} isSelected={row.id === selectedId} onSelect={onSelect} />
        ))}
      </tbody>
    </table>
  )
}

/** A column header. The sorted column shows ↑ (ascending) or ↓ (descending) after its label. */
function HeaderCell({ column, sortKey, sortAscending, onClick }) {
  let arrow = ''
  if (column.key === sortKey) {
    if (sortAscending) {
      arrow = ' ↑'
    } else {
      arrow = ' ↓'
    }
  }

  return (
    <th onClick={() => onClick(column.key)}>
      {column.label}
      {arrow}
    </th>
  )
}

/** One row: a cell per column. */
function TableRow({ row, columns, isSelected, onSelect }) {
  let className = ''
  if (isSelected) {
    className = 'is-selected'
  }

  return (
    <tr className={className} onClick={() => onSelect(row.id)}>
      {columns.map((column) => (
        <td key={column.key}>{cellContent(column, row)}</td>
      ))}
    </tr>
  )
}

// What a cell shows: the column's own render function if it has one, otherwise the row's value
function cellContent(column, row) {
  if (column.render) {
    return column.render(row)
  }
  return row[column.key]
}

// A sorted copy of the rows (the original array is left as it is)
function sortRows(rows, sortKey, sortAscending) {
  if (sortKey === null) {
    return rows
  }

  const sorted = [...rows]
  sorted.sort(function compareRows(a, b) {
    const order = compareValues(a[sortKey], b[sortKey])
    if (sortAscending) {
      return order
    }
    return -order
  })
  return sorted
}

// Negative if a comes first, positive if b comes first, 0 if they're equal (like Java's compareTo)
function compareValues(a, b) {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }
  return String(a ?? '').localeCompare(String(b ?? ''))
}

export default Table
