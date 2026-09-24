import { Box, Boxes, LayoutDashboard, LayoutList, MessagesSquare, Palette, Settings } from 'lucide-react'
import { useLocation } from 'react-router'
import { useBlueprints } from '../../schema/useBlueprints.js'
import SidebarNav from '../SidebarNav/SidebarNav.jsx'

/**
 * The app's main navigation, shared by every page's AppShell.
 * Each link's id is its route. The link whose route best matches the current URL is active,
 * so /blueprints/item/assets/sword_of_fire highlights the Item assets link.
 * children: extra navigation for the current page (shown above the Developer section).
 */
function AppSidebar({ children }) {
  const blueprints = useBlueprints()
  const { pathname } = useLocation()

  const homeItems = [{ id: '/', label: 'Home', icon: LayoutDashboard, to: '/' }]
  const assetItems = [
    { id: '/assets', label: 'All assets', icon: Boxes, to: '/assets' },
    ...blueprints.map((blueprint) => ({
      id: `/blueprints/${blueprint.id}/assets`,
      label: blueprint.name || blueprint.id,
      icon: Box,
      to: `/blueprints/${blueprint.id}/assets`,
    })),
  ]
  const dialogueItems = [{ id: '/dialogues', label: 'All dialogues', icon: MessagesSquare, to: '/dialogues' }]
  const blueprintItems = [{ id: '/blueprints', label: 'All blueprints', icon: LayoutList, to: '/blueprints' }]
  const generalItems = [{ id: '/settings', label: 'Settings', icon: Settings, to: '/settings' }]
  const developerItems = [{ id: '/dev/styles', label: 'Style showcase', icon: Palette, to: '/dev/styles' }]

  const activeId = [...homeItems, ...assetItems, ...dialogueItems, ...blueprintItems, ...generalItems, ...developerItems]
    .map((item) => item.id)
    .filter((id) => pathname === id || pathname.startsWith(`${id}/`))
    .sort((a, b) => b.length - a.length)[0]

  return (
    <>
      <SidebarNav label="Home" items={homeItems} activeId={activeId} />
      <SidebarNav title="Assets" items={assetItems} activeId={activeId} />
      <SidebarNav title="Dialogues" items={dialogueItems} activeId={activeId} />
      <SidebarNav title="Blueprints" items={blueprintItems} activeId={activeId} />
      {children}
      <SidebarNav title="General" items={generalItems} activeId={activeId} />
      <SidebarNav title="Developer" items={developerItems} activeId={activeId} />
    </>
  )
}

export default AppSidebar
