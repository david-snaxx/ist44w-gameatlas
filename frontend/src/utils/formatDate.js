// "2026-09-12T09:45:00.000Z" -> "Sep 12, 2026, 9:45 AM" (in the viewer's language and time zone)
export function formatDateTime(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
