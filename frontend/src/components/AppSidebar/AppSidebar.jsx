import { Box, Boxes, LayoutDashboard, LayoutList, MessagesSquare, Settings } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { useBlueprints } from '../../schema/useBlueprints.js'

/** The app's main navigation: groups of links, shown in every page's AppShell. */
function AppSidebar() {
  const blueprints = useBlueprints()
  const { pathname } = useLocation()

  // Each link is a plain object: { label, icon, to }
  const homeLink = { label: 'Home', icon: LayoutDashboard, to: '/' }

  const assetLinks = [{ label: 'All assets', icon: Boxes, to: '/assets' }]
  for (const blueprint of blueprints) {
    // A blueprint from a hand-edited backup might have no name, so fall back to its ID
    const label = blueprint.name || blueprint.id
    assetLinks.push({ label: label, icon: Box, to: `/blueprints/${blueprint.id}/assets` })
  }

  const dialogueLinks = [{ label: 'All dialogues', icon: MessagesSquare, to: '/dialogues' }]
  const blueprintLinks = [{ label: 'All blueprints', icon: LayoutList, to: '/blueprints' }]
  const generalLinks = [{ label: 'Settings', icon: Settings, to: '/settings' }]

  const allLinks = [homeLink, ...assetLinks, ...dialogueLinks, ...blueprintLinks, ...generalLinks]
  const activeTo = findActiveRoute(allLinks, pathname)

  // <> ... </> is a "fragment": it groups several elements without adding a wrapper element to the page
  return (
    <>
      <nav>
        <SidebarLink link={homeLink} activeTo={activeTo} />
      </nav>
      <SidebarGroup title="Assets" links={assetLinks} activeTo={activeTo} />
      <SidebarGroup title="Dialogues" links={dialogueLinks} activeTo={activeTo} />
      <SidebarGroup title="Blueprints" links={blueprintLinks} activeTo={activeTo} />
      <SidebarGroup title="General" links={generalLinks} activeTo={activeTo} />
    </>
  )
}

/**
 * Picks the link to highlight: the one whose route is the longest match for the current URL.
 * For example, /blueprints/item/assets/sword_of_fire matches both "/blueprints" and
 * "/blueprints/item/assets", and the longer one (the Item link) wins.
 */
function findActiveRoute(links, pathname) {
  let bestRoute = null

  for (const link of links) {
    const isMatch = pathname === link.to || pathname.startsWith(link.to + '/')
    if (!isMatch) {
      continue
    }
    if (bestRoute === null || link.to.length > bestRoute.length) {
      bestRoute = link.to
    }
  }

  return bestRoute
}

/** A small uppercase title with its links under it. */
function SidebarGroup({ title, links, activeTo }) {
  return (
    <nav>
      <h2 className="nav-title">{title}</h2>
      {links.map((link) => (
        <SidebarLink key={link.to} link={link} activeTo={activeTo} />
      ))}
    </nav>
  )
}

/** One link: an icon and a label, highlighted when it's the page being shown. */
function SidebarLink({ link, activeTo }) {
  let className = 'nav-item'
  if (link.to === activeTo) {
    className = 'nav-item is-active'
  }

  // A component name in JSX must start with a capital letter, so copy the icon into one
  const Icon = link.icon

  return (
    <Link to={link.to} className={className}>
      <Icon size={16} />
      <span className="truncate">{link.label}</span>
    </Link>
  )
}

export default AppSidebar
