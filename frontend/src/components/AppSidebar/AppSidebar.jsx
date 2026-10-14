import { Box, Boxes, CircleUser, LayoutDashboard, LayoutList, LogIn, LogOut, MessagesSquare, Settings } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { clearCurrentUser } from '../../api/currentUserStore.js'
import { logOut } from '../../api/users.js'
import { useCurrentUser } from '../../api/useCurrentUser.js'
import { useToast } from '../Toast/useToast.js'
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
      <AccountLink />
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

/**
 * Who is logged in, at the foot of the sidebar: their display name, leading to the account page.
 * When nobody is logged in it offers the way in instead. It shows nothing at all until the server
 * has answered, so it never says the wrong thing first.
 */
function AccountLink() {
  const currentUser = useCurrentUser()
  const { pathname } = useLocation()

  if (!currentUser.checked) {
    return null
  }

  if (!currentUser.user) {
    return (
      <nav className="nav-foot">
        <Link to="/login" className="nav-item">
          <LogIn size={16} />
          <span className="truncate">Log in</span>
        </Link>
      </nav>
    )
  }

  let className = 'nav-item'
  if (pathname === '/account') {
    className = 'nav-item is-active'
  }

  return (
    <nav className="nav-foot">
      <Link to="/account" className={className}>
        <CircleUser size={16} />
        <span className="truncate">{currentUser.user.displayName}</span>
      </Link>
      <LogOutButton />
    </nav>
  )
}

/** Ends the session and sends the person back to the login page. */
function LogOutButton() {
  const navigate = useNavigate()
  const toast = useToast()
  const [sending, setSending] = useState(false)

  async function handleLogOut() {
    setSending(true)
    const result = await logOut()
    setSending(false)

    if (result.error) {
      toast.show({ status: 'error', message: result.error })
      return
    }

    // The cookie is gone, so tell the rest of the app before anything asks the server again
    clearCurrentUser()
    toast.show({ status: 'success', message: 'Logged out' })
    navigate('/login')
  }

  return (
    <button type="button" className="nav-item" disabled={sending} onClick={handleLogOut}>
      <LogOut size={16} />
      <span className="truncate">Log out</span>
    </button>
  )
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
