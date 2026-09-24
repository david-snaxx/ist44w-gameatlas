import { FileText, Layers, MessageSquare, MousePointerClick, Palette, Plus, Shapes, Table2, Type, Upload } from 'lucide-react'
import { useState } from 'react'
import AppShell from '../../components/AppShell/AppShell.jsx'
import AppSidebar from '../../components/AppSidebar/AppSidebar.jsx'
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx'
import Button from '../../components/Button/Button.jsx'
import SidebarNav from '../../components/SidebarNav/SidebarNav.jsx'
import { AssetEditorSection } from './AssetEditorSection.jsx'
import { ButtonsSection, FeedbackSection, TablesSection } from './ComponentSections.jsx'
import { ColorsSection, IconsSection, SurfacesSection, TypographySection } from './FoundationSections.jsx'
import styles from './Showcase.module.css'

const SECTIONS = [
  { id: 'colors', label: 'Colors', icon: Palette },
  { id: 'typography', label: 'Typography', icon: Type },
  { id: 'surfaces', label: 'Spacing & surfaces', icon: Layers },
  { id: 'buttons', label: 'Buttons', icon: MousePointerClick },
  { id: 'asset-editor', label: 'Asset editor', icon: FileText },
  { id: 'tables', label: 'Tables', icon: Table2 },
  { id: 'feedback', label: 'Feedback & overlays', icon: MessageSquare },
  { id: 'icons', label: 'Icons', icon: Shapes },
]

/**
 * Every design token and component on one page, for tuning the look.
 * Follows docs/STYLE-GUIDELINES.md.
 */
function StyleShowcase() {
  const [activeId, setActiveId] = useState(SECTIONS[0].id)

  return (
    <AppShell
      breadcrumbs={<Breadcrumbs items={[{ label: 'Developer' }, { label: 'Style showcase' }]} />}
      status={`${SECTIONS.length} sections`}
      actions={
        <>
          <Button variant="ghost" icon={Upload}>
            Import
          </Button>
          <Button variant="primary" icon={Plus}>
            New asset
          </Button>
        </>
      }
      sidebar={
        <AppSidebar>
          <SidebarNav title="Showcase sections" items={SECTIONS} activeId={activeId} onSelect={setActiveId} />
        </AppSidebar>
      }
    >
      <div className={styles.sections}>
        <ColorsSection />
        <TypographySection />
        <SurfacesSection />
        <ButtonsSection />
        <AssetEditorSection />
        <TablesSection />
        <FeedbackSection />
        <IconsSection />
      </div>
    </AppShell>
  )
}

export default StyleShowcase
