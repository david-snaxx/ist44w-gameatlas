import { Box, Boxes, LayoutDashboard, LayoutList, MessagesSquare, Settings } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { useBlueprints } from '../../schema/useBlueprints.js'
import { cx } from '../../utils/cx.js'

/** The app's main navigation: groups of links, shown in every page's AppShell. */
function AppSidebar() {
  const blueprints = useBlueprints()
  const { pathname } = useLocation()

  const groups = [
    { title: null, items: [{ label: 'Home', icon: LayoutDashboard, to: '/' }] },
    {
      title: 'Assets',
      items: [
        { label: 'All assets', icon: Boxes, to: '/assets' },
        ...blueprints.map((blueprint) => ({
          label: blueprint.name || blueprint.id,
          icon: Box,
          to: `/blueprints/${blueprint.id}/assets`,
        })),
      ],
    },
    { title: 'Dialogues', items: [{ label: 'All dialogues', icon: MessagesSquare, to: '/dialogues' }] },
    { title: 'Blueprints', items: [{ label: 'All blueprints', icon: LayoutList, to: '/blueprints' }] },
    { title: 'General', items: [{ label: 'Settings', icon: Settings, to: '/settings' }] },
  ]

  // The link whose route best (longest) matches the URL is active,
  // so /blueprints/item/assets/sword_of_fire highlights the Item assets link
  const activeTo = groups
    .flatMap((group) => group.items)
    .map((item) => item.to)
    .filter((to) => pathname === to || pathname.startsWith(`${to}/`))
    .sort((a, b) => b.length - a.length)[0]

  return groups.map((group) => (
    <nav key={group.title ?? 'home'}>
      {group.title && <h2 className="nav-title">{group.title}</h2>}
      {group.items.map((item) => (
        <Link key={item.to} to={item.to} className={cx('nav-item', item.to === activeTo && 'is-active')}>
          <item.icon size={16} />
          <span className="truncate">{item.label}</span>
        </Link>
      ))}
    </nav>
  ))
}

export default AppSidebar
