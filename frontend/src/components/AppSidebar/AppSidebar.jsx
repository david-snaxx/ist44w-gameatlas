import {
  Box,
  Boxes,
  CircleUser,
  LayoutDashboard,
  LayoutList,
  LogIn,
  LogOut,
  MessagesSquare,
  Plus,
  Settings,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { addProject } from '../../api/currentProjectStore.js'
import { clearCurrentUser } from '../../api/currentUserStore.js'
import { createProject } from '../../api/projects.js'
import { logOut } from '../../api/users.js'
import { useCurrentProject } from '../../api/useCurrentProject.js'
import { useCurrentUser } from '../../api/useCurrentUser.js'
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog.jsx'
import PropertyRow from '../form/PropertyRow.jsx'
import TextInput from '../form/TextInput.jsx'
import { useToast } from '../Toast/useToast.js'

// Projects whose section is folded. Kept outside the components so it survives moving between pages.
const foldedProjectIds = new Set()

/** The main navigation in every page's AppShell: Home, one foldable section per project, New project, then General. */
function AppSidebar() {
  const currentProject = useCurrentProject()
  const currentUser = useCurrentUser()
  const { pathname } = useLocation()

  // Each link is a plain object: { label, icon, to }
  const homeLink = { label: 'Home', icon: LayoutDashboard, to: '/' }
  const generalLinks = [{ label: 'Settings', icon: Settings, to: '/settings' }]

  // Every link, so the best match for the URL can be highlighted
  const allLinks = [homeLink, ...generalLinks]
  const sections = []
  for (const project of currentProject.projects) {
    const section = buildProjectSection(project, currentProject.blueprints[project.id])
    sections.push(section)
    for (const link of section.links) {
      allLinks.push(link)
    }
  }
  const activeTo = findActiveRoute(allLinks, pathname)
  // Only once the user's projects are in, so the new one joins the list instead of racing it
  const showNewProject = Boolean(currentUser.user) && currentProject.checked

  // <> ... </> is a "fragment": it groups several elements without adding a wrapper element to the page
  return (
    <>
      <nav>
        <SidebarLink link={homeLink} activeTo={activeTo} />
      </nav>
      {sections.map((section) => (
        <ProjectSection key={section.project.id} section={section} activeTo={activeTo} pathname={pathname} />
      ))}
      {currentProject.error && <p className="nav-note">{currentProject.error}</p>}
      {showNewProject && <NewProjectButton />}
      <SidebarGroup title="General" links={generalLinks} activeTo={activeTo} />
      <AccountLink />
    </>
  )
}

/** One project's links in the sidebar's three groups, plus all of them (`links`) for findActiveRoute(). */
function buildProjectSection(project, blueprints = []) {
  const projectPath = `/projects/${project.id}`
  const assetLinks = [{ label: 'All assets', icon: Boxes, to: `${projectPath}/assets` }]
  for (const blueprint of blueprints) {
    assetLinks.push({ label: blueprint.name, icon: Box, to: `${projectPath}/blueprints/${blueprint.id}/assets` })
  }
  const dialogueLinks = [{ label: 'All dialogues', icon: MessagesSquare, to: `${projectPath}/dialogues` }]
  const blueprintLinks = [{ label: 'All blueprints', icon: LayoutList, to: `${projectPath}/blueprints` }]

  return {
    project: project,
    assetLinks: assetLinks,
    dialogueLinks: dialogueLinks,
    blueprintLinks: blueprintLinks,
    links: [...assetLinks, ...dialogueLinks, ...blueprintLinks],
  }
}

/**
 * The link to highlight: the longest route matching the URL. /projects/<id>/blueprints/item/assets/sword_of_fire
 * matches ".../blueprints" and ".../blueprints/item/assets", and the longer one wins.
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

/**
 * Asks for a name in a dialog, then makes a new, empty project. It appears in the sidebar once the server has made
 * it, without leaving the page.
 */
function NewProjectButton() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  // Shown under the name box when it's left empty
  const [problem, setProblem] = useState(null)
  // True while the server is making the project, so it can't be sent twice
  const [sending, setSending] = useState(false)

  function handleOpen() {
    setName('')
    setProblem(null)
    setOpen(true)
  }

  async function handleCreate() {
    const trimmed = name.trim()
    if (trimmed === '') {
      setProblem('Enter a name')
      return
    }
    setProblem(null)

    setSending(true)
    const result = await createProject(trimmed)
    setSending(false)

    if (result.error) {
      // The server says what's wrong (e.g. a name that's too long); the dialog stays open to fix it
      toast.show({ status: 'error', message: result.error })
      return
    }

    addProject(result.data)
    setOpen(false)
    toast.show({ status: 'success', message: `Project "${result.data.name}" created` })
  }

  return (
    <nav>
      <button type="button" className="nav-item" onClick={handleOpen}>
        <Plus size={16} />
        <span className="truncate">New project</span>
      </button>
      {open && (
        <ConfirmDialog
          title="New project"
          message="An empty project with you as its only member. You can add others in its settings."
          confirmLabel="Create project"
          confirmVariant="primary"
          confirmIcon={Plus}
          confirmDisabled={sending}
          onConfirm={handleCreate}
          onCancel={() => setOpen(false)}
        >
          <PropertyRow label="Name" error={problem}>
            <TextInput value={name} onChange={(event) => setName(event.target.value)} />
          </PropertyRow>
        </ConfirmDialog>
      )}
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
 * One project: its name with a cog leading to its settings, and its Assets, Dialogues and Blueprints groups. It's a
 * native <details>, so the browser does the folding; this only remembers which sections are folded.
 */
function ProjectSection({ section, activeTo, pathname }) {
  const projectId = section.project.id
  const settingsTo = `/projects/${projectId}/settings`

  let settingsClassName = 'nav-project-settings'
  if (pathname === settingsTo) {
    settingsClassName = 'nav-project-settings is-active'
  }

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
      <summary className="nav-project-name">
        {/* A link inside the <summary> opens its page without folding the section */}
        <Link to={settingsTo} className={settingsClassName} title="Project settings">
          <Settings size={14} />
        </Link>
        {section.project.name}
      </summary>
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
