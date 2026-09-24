import {
  Box,
  Braces,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Copy,
  Download,
  FileText,
  Folder,
  GitBranch,
  Info,
  Layers,
  MessageSquare,
  Package,
  Pencil,
  Plus,
  Save,
  Search,
  Settings,
  Trash2,
  TriangleAlert,
  Upload,
  User,
  Workflow,
  X,
} from 'lucide-react'
import Wordmark from '../../components/Wordmark/Wordmark.jsx'
import { cx } from '../../utils/cx.js'
import ShowcaseSection from './ShowcaseSection.jsx'
import { COLOR_GROUPS } from './showcaseData.js'
import styles from './Showcase.module.css'

function readToken(token) {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim()
}

export function ColorsSection() {
  return (
    <ShowcaseSection
      id="colors"
      title="Colors"
      intro="Dark only, pure grey neutrals, one blue accent. Values are read live from src/styles/tokens.css, so edits there show up here."
    >
      {COLOR_GROUPS.map((group) => (
        <div key={group.title}>
          <h3 className={styles.subheading}>{group.title}</h3>
          <div className={styles.swatchGrid}>
            {group.colors.map((color) => (
              <div key={color.token} className={styles.swatch}>
                <div
                  className={styles.swatchChip}
                  style={
                    color.kind === 'fill'
                      ? { background: `var(${color.token})`, color: color.on ? `var(${color.on})` : undefined }
                      : { background: 'var(--color-bg-panel)', color: `var(${color.token})` }
                  }
                >
                  {(color.kind === 'text' || color.on) && 'Aa'}
                </div>
                <div className={styles.swatchText}>
                  <span className={styles.swatchName}>{color.token}</span>
                  <span className={styles.swatchValue}>{readToken(color.token)}</span>
                  <span className={styles.swatchUse}>{color.use}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </ShowcaseSection>
  )
}

const TYPE_SAMPLES = [
  { role: 'Page title (H1)', meta: '20px / 600', sample: <h1>Sword of Fire</h1> },
  { role: 'H2', meta: '16px / 600', sample: <h2>Combat properties</h2> },
  {
    role: 'Body',
    meta: '14px / 400',
    sample: <p>Writers and designers fill in properties; GameAtlas makes sure the result is engine-ready.</p>,
  },
  { role: 'Property label', meta: '13px / 500', sample: <span className={styles.labelSample}>Damage</span> },
  { role: 'Section title', meta: '13px / 600 caps', sample: <span className={styles.sectionTitleSample}>Preview</span> },
  { role: 'Small', meta: '12px / 400', sample: <span className={styles.smallSample}>Updated 2 hours ago</span> },
  {
    role: 'Mono (IDs, JSON)',
    meta: '13px JetBrains Mono',
    sample: <code>sword_of_fire · {'{ "damage": 12 }'}</code>,
  },
  { role: 'Link', meta: 'accent text', sample: <a href="#typography">Open blueprint</a> },
  { role: 'Wordmark', meta: 'Silkscreen', sample: <Wordmark /> },
]

export function TypographySection() {
  return (
    <ShowcaseSection id="typography" title="Typography" intro="System UI font, JetBrains Mono for IDs and JSON, a pixel font only for the wordmark.">
      <div>
        {TYPE_SAMPLES.map((row) => (
          <div key={row.role} className={styles.typeRow}>
            <div className={styles.typeInfo}>
              <span>{row.role}</span>
              <span className={styles.typeMeta}>{row.meta}</span>
            </div>
            <div>{row.sample}</div>
          </div>
        ))}
      </div>
    </ShowcaseSection>
  )
}

const SPACES = ['--space-1', '--space-2', '--space-3', '--space-4', '--space-5', '--space-6']

export function SurfacesSection() {
  return (
    <ShowcaseSection
      id="surfaces"
      title="Spacing & surfaces"
      intro="A 4px spacing grid, subtle corners, and translucent glass for the app frame and floating layers over soft background glows. Pages themselves are flat: rules and space separate their sections, not cards."
    >
      <div className={styles.twoColumns}>
        <div>
          <h3 className={styles.subheading}>Spacing</h3>
          <div className={styles.stack}>
            {SPACES.map((token) => (
              <div key={token} className={styles.spaceRow}>
                <span className={styles.swatchName}>{token}</span>
                <span className={styles.spaceBar} style={{ width: `var(${token})` }} />
                <span className={styles.swatchValue}>{readToken(token)}</span>
              </div>
            ))}
          </div>

          <h3 className={cx(styles.subheading, styles.spacedHeading)}>Radius</h3>
          <div className={styles.row}>
            <div className={styles.radiusBox} style={{ borderRadius: 'var(--radius-sm)' }}>
              radius-sm
            </div>
            <div className={styles.radiusBox} style={{ borderRadius: 'var(--radius-md)' }}>
              radius-md
            </div>
          </div>
        </div>

        <div>
          <h3 className={styles.subheading}>Layering</h3>
          <div className={styles.layerApp}>
            <span className={styles.layerLabel}>bg-app (frame)</span>
            <div className={styles.layerPanel}>
              <span className={styles.layerLabel}>bg-panel</span>
              <div className={styles.layerRaised}>
                <span className={styles.layerLabel}>bg-raised</span>
                <div className={styles.layerInput}>bg-input</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className={styles.subheading}>Floating glass</h3>
        <div className={styles.glassStage}>
          <p className={styles.glassStageText}>
            Busy content behind a floating layer. Busy content behind a floating layer. Busy content behind a
            floating layer.
          </p>
          <div className={cx('glass', styles.glassCard)}>
            <h2>Glass card</h2>
            <p className={styles.mutedText}>
              The stronger glass, for the top bar, menus, toasts, the side panel and the minimap. The dashboard's
              section cards use a lighter version, and are the only cards left in the app.
            </p>
          </div>
        </div>
      </div>
    </ShowcaseSection>
  )
}

const ICONS = {
  Save, Plus, Pencil, Trash2, Copy, Upload, Download, Search, Braces, Settings, ChevronRight, ChevronDown,
  X, Check, CircleAlert, CircleCheck, TriangleAlert, Info, FileText, Folder, Layers, Workflow, GitBranch,
  MessageSquare, Package, Box, User,
}

export function IconsSection() {
  return (
    <ShowcaseSection id="icons" title="Icons" intro="Lucide, 16px in controls and 14px inline, stroke width 1.75, color inherited from text.">
      <div className={styles.iconGrid}>
        {Object.entries(ICONS).map(([name, Icon]) => (
          <div key={name} className={styles.iconCell}>
            <div className={styles.iconSizes}>
              <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
              <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
            </div>
            <span className={styles.swatchValue}>{name}</span>
          </div>
        ))}
      </div>
    </ShowcaseSection>
  )
}
