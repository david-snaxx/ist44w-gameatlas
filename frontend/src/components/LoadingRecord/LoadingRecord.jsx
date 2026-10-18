import AppShell from '../AppShell/AppShell.jsx'
import EmptyState from '../EmptyState/EmptyState.jsx'
import Section from '../Section/Section.jsx'

/**
 * The page shown while a record (asset, blueprint, dialogue) is still loading, or couldn't be loaded.
 * error: null while loading; otherwise the server's message
 */
function LoadingRecord({ error }) {
  if (!error) {
    return (
      <AppShell crumbs={[{ label: 'Loading…' }]}>
        <div className="page">
          <p className="muted">Loading…</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell crumbs={[{ label: "Couldn't load" }]}>
      <div className="page">
        <Section title="Couldn't load this page">
          <EmptyState message={error} />
        </Section>
      </div>
    </AppShell>
  )
}

export default LoadingRecord
