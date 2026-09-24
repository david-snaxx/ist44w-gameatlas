import { Link } from 'react-router'
import AppShell from '../AppShell/AppShell.jsx'
import AppSidebar from '../AppSidebar/AppSidebar.jsx'
import Breadcrumbs from '../Breadcrumbs/Breadcrumbs.jsx'
import EmptyState from '../EmptyState/EmptyState.jsx'
import Section from '../Section/Section.jsx'

/**
 * The whole page shown when a URL points at something that isn't there: a blueprint, an
 * asset, a dialogue, or any unknown route.
 *
 * title: e.g. "Asset not found". message: why. back: { to, label } for the way out.
 * crumbs: the trail before the final "Not found" step.
 */
function MissingRecord({ title, message, back, crumbs = [] }) {
  return (
    <AppShell
      sidebar={<AppSidebar />}
      breadcrumbs={<Breadcrumbs items={[...crumbs, { label: 'Not found' }]} />}
    >
      <div className="page">
        <Section title={title} className="missing">
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
