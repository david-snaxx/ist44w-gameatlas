import { Link } from 'react-router'
import AppShell from '../AppShell/AppShell.jsx'
import EmptyState from '../EmptyState/EmptyState.jsx'
import Section from '../Section/Section.jsx'

/**
 * The whole page shown when a URL points at something that isn't there: a blueprint, an
 * asset, a dialogue, or any unknown route.
 *
 * title: e.g. "Asset not found". message: why. back: { to, label } for the way out.
 */
function MissingRecord({ title, message, back }) {
  return (
    <AppShell crumbs={[{ label: 'Not found' }]}>
      <div className="page">
        <Section title={title}>
          <EmptyState message={message}>
            <Link to={back.to} className="btn btn-secondary">
              {back.label}
            </Link>
          </EmptyState>
        </Section>
      </div>
    </AppShell>
  )
}

export default MissingRecord
