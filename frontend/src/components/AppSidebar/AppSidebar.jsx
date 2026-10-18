import { Box, Boxes, CircleUser, LayoutDashboard, LayoutList, LogIn, LogOut, MessagesSquare, Settings } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { clearCurrentUser } from '../../api/currentUserStore.js'
import { logOut } from '../../api/users.js'
import { useCurrentProject } from '../../api/useCurrentProject.js'
import { useCurrentUser } from '../../api/useCurrentUser.js'
import { useBlueprints } from '../../schema/useBlueprints.js'
import { useToast } from '../Toast/useToast.js'

// Projects whose section is folded. Kept outside the components so it survives moving between pages.
const foldedProjectIds = new Set()

/** The main navigation in every page's AppShell: Home, one foldable section per project, then General. */
function AppSidebar() {
  const currentProject = useCurrentProject()
  const blueprints = useBlueprints()
  const { pathname } = useLocation()

  // Each link is a plain object: { label, icon, to }
  const homeLink = { label: 'Home', icon: LayoutDashboard, to: '/' }
  const generalLinks = [{ label: 'Settings', icon: Settings, to: '/settings' }]

  // Every link, so the best match for the URL can be highlighted
  const allLinks = [homeLink, ...generalLinks]
  const sections = []
  for (const project of currentProject.projects) {
    // The current project uses the blueprint store, so a save shows at once; others show what the page loaded
    let projectBlueprints = currentProject.blueprints[project.id]
    if (currentProject.project && project.id === currentProject.project.id) {
      projectBlueprints = blueprints
    }
    const section = buildProjectSection(project, projectBlueprints)
    sections.push(section)
    for (const link of section.links) {
      allLinks.push(link)
    }
  }
  const activeTo = findActiveRoute(allLinks, pathname)

  // <> ... </> is a "fragment": it groups several elements without adding a wrapper element to the page
  return (
    <>
      <nav>
        <SidebarLink link={homeLink} activeTo={activeTo} />
      </nav>
      {sections.map((section) => (
        <ProjectSection key={section.project.id} section={section} activeTo={activeTo} />
      ))}
      {currentProject.error && <p className="nav-note">{currentProject.error}</p>}
      <SidebarGroup title="General" links={generalLinks} activeTo={activeTo} />
      <AccountLink />
    </>
  )
}

/**
 * One project's links in the sidebar's three groups, plus all of them (`links`) for findActiveRoute(). Until there's
 * a project picker, every project's links go to the same pages.
 */
function buildProjectSection(project, blueprints = []) {
  const assetLinks = [{ label: 'All assets', icon: Boxes, to: '/assets' }]
  for (const blueprint of blueprints) {
    assetLinks.push({ label: blueprint.name, icon: Box, to: `/blueprints/${blueprint.id}/assets` })
  }
  const dialogueLinks = [{ label: 'All dialogues', icon: MessagesSquare, to: '/dialogues' }]
  const blueprintLinks = [{ label: 'All blueprints', icon: LayoutList, to: '/blueprints' }]

  return {
    project: project,
    assetLinks: assetLinks,
    dialogueLinks: dialogueLinks,
    blueprintLinks: blueprintLinks,
    links: [...assetLinks, ...dialogueLinks, ...blueprintLinks],
  }
}

/**
 * The link to highlight: the longest route matching the URL. /blueprints/item/assets/sword_of_fire matches
 * "/blueprints" and "/blueprints/item/assets", and the longer one wins.
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

/** The logged-in user's name, linking to the account page (or a Log in link); nothing until the server answers. */
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

    // Before anything asks the server again
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

/**
 * One project: its name and its Assets, Dialogues and Blueprints groups. It's a native <details>, so the browser
 * does the folding; this only remembers which sections are folded.
 */
function ProjectSection({ section, activeTo }) {
  const projectId = section.project.id

  // The browser already opened or closed it; remember which for the next page
  function handleToggle(event) {
    if (event.currentTarget.open) {
      foldedProjectIds.delete(projectId)
    } else {
      foldedProjectIds.add(projectId)
    }
  }

  return (
    <details className="nav-project" open={!foldedProjectIds.has(projectId)} onToggle={handleToggle}>
      <summary className="nav-project-name">{section.project.name}</summary>
      <div className="nav-project-groups">
        <SidebarGroup title="Assets" links={section.assetLinks} activeTo={activeTo} />
        <SidebarGroup title="Dialogues" links={section.dialogueLinks} activeTo={activeTo} />
        <SidebarGroup title="Blueprints" links={section.blueprintLinks} activeTo={activeTo} />
      </div>
    </details>
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
