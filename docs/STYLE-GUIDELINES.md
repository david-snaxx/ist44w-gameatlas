# GameAtlas: Style Guidelines

> **This is the authoritative design system for GameAtlas.** Humans and AI assistants follow it for all UI work.
> It was derived from the filled-in questionnaire in [`STYLE-GUIDE.md`](STYLE-GUIDE.md) on 2026-09-14 and refined
> while reviewing the style showcase. Every value lives in one token file (`src/styles/tokens.css`), so changes
> there apply app-wide. Resolved interpretations and still-open questions are in
> [§14](#14-decisions--open-questions). Items marked **(planned)** are described here but not built yet.

---

## 1. Design direction in one paragraph

GameAtlas is a **dark, calm, professional game-dev tool**. It borrows its **structure from JetBrains IDEs**: one
continuous app frame (top bar, sidebar and a bottom status bar) wrapped around a rounded content zone that holds
the page. It borrows **translucent glass from Apple's operating systems** for the frame, content zone and floating
layers, all set over soft, organically shaped color glows. **Pages inside that frame are flat** — rules and space
divide them into sections, not cards (§6.1). A **light retro/pixel touch** gives
it personality without costing professionalism. Color is used **moderately**. Neutrals are **pure grey**, a single
**deep blue accent** (`#335284`) marks primary actions and selection, and nothing else is color-coded yet. Keep it
**uncluttered** (not Amazon) and **not trendy or flashy** (not coolmathgames).

### Personality checklist
| Do | Don't |
|---|---|
| Quiet grey surfaces, one accent | Rainbow UI, gradients on components, neon glows |
| One frame around a rounded content zone (IDE-like) | Pages with no structure — or structure faked with nested cards |
| Flat pages divided by rules and space | Cards inside cards |
| Glass layers over subtle, blurred background glows | Busy, sharp or high-contrast backgrounds behind text |
| Crisp 1px borders, tidy alignment | Heavy drop shadows on static content |
| One small retro accent (wordmark, focus ring) | Pixel fonts for body text, chiptune gimmicks |
| Neutral, concise copy | Jokes, exclamation marks, marketing tone |

---

## 2. Theme

- **Dark only.** There's no light theme and no toggle. Set `color-scheme: dark` on `:root`.
- Design every screen directly in the dark palette. Don't invert a light design.

---

## 3. Color

### 3.1 Surfaces & text (pure grey)

| Token | Value | Use |
|---|---|---|
| `--color-bg-app` | `#1b1b1c` | Page background (under the glows), code blocks |
| `--color-bg-panel` | `#252526` | Graph nodes; solid fallback for card glass |
| `--color-bg-raised` | `#2d2d2f` | Table header, hovered table rows, validation summary box, floating-glass fallback |
| `--color-bg-input` | `#323234` | Filled inputs, toggles (off), vector boxes, secondary buttons |
| `--color-bg-input-hover` | `#38383a` | Input and secondary button hover |
| `--color-border` | `#3a3a3c` | Default 1px borders and dividers |
| `--color-border-strong` | `#4a4a4d` | Focused input border, graph handles |
| `--color-hover-overlay` | `rgb(255 255 255 / 0.05)` | Hover on translucent surfaces (sidebar links) |
| `--color-text` | `#e6e6e6` | Primary text (11:1 or better on every surface) |
| `--color-text-muted` | `#a8a8a8` | Secondary text, labels, placeholders, status bar (5.4:1 on inputs) |
| `--color-text-subtle` | `#969696` | Timestamps, hints. **Only on frame, content zone or page backgrounds, never on inputs** (fails there). Lightened from `#8c8c8c` so it passes on glass (4.7:1 worst case) |

### 3.2 Accent (brand)

The chosen accent `#335284` is dark. It works as a **fill behind white text** (7.8:1), but it's **unreadable
as text or thin lines on the dark UI** (2.0:1). So the accent comes in two roles:

| Token | Value | Use |
|---|---|---|
| `--color-accent` | `#335284` | Primary button fill, toggle "on" fill, accent badges |
| `--color-accent-hover` | `#3d5a88` | Primary button hover |
| `--color-accent-text` | `#8aa8dc` | Links, active nav text/icon, JSON keys, selected graph edges, focus ring (5.2:1 or better) |
| `--color-accent-soft` | `rgb(51 82 132 / 0.28)` | Selected rows, active sidebar item, active dropdown option |
| `--color-on-accent` | `#ffffff` | Text/icons on accent, success, error and info fills |

### 3.3 Status colors

The chosen status colors are used as **fills**. Lighter **text tints** are derived for inline messages and icons.

| Status | Fill (with text on it) | Text/icon tint on dark UI |
|---|---|---|
| Success | `--color-success` `#1f525d` + white text (8.7:1) | `--color-success-text` `#5fa8b5` |
| Warning | `--color-warning` `#fec67b` + `--color-on-warning` `#1b1b1c` text (11.1:1) | `--color-warning-text` `#fec67b` |
| Error | `--color-error` `#9e3234` + white text (7.1:1) | `--color-error-text` `#e0797b` |
| Info | `--color-info` `#527592` + white text (4.9:1) | `--color-info-text` `#8daac4` |

- The required-property asterisk and inline error messages use `--color-error-text` on the page background (4.8:1 or better). Don't put error text *inside* an input.
- An input with an error gets a 1px `--color-error-text` border.

### 3.4 Color coding

**None for now.** Blueprints, property types, graph node types and vector axes all use neutral styling. When color
coding is added, it goes in the named tokens that already exist (`--color-node-line`, `--color-node-choice`,
`--color-node-action`, `--color-node-end`), which currently all point to `--color-bg-raised`. See §14.

---

## 4. Typography

| Token | Value |
|---|---|
| `--font-ui` | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` |
| `--font-mono` | `"JetBrains Mono", ui-monospace, Consolas, monospace` |
| `--font-wordmark` | `"Silkscreen", var(--font-mono)` (the retro touch) |

JetBrains Mono and Silkscreen are self-hosted npm packages (`@fontsource/jetbrains-mono`, `@fontsource/silkscreen`),
imported once in `main.jsx`. Never load fonts from a CDN.

| Role | Size / weight / line-height | Font |
|---|---|---|
| Base / body / inputs | **14px** (`--text-base`) / 400 / 1.45 | UI |
| Small: hints, badges, table header, status bar, breadcrumbs, sidebar title | 12px (`--text-xs`) | UI |
| Property label, buttons | 13px (`--text-sm`) / 500 | UI |
| Section title | 13px / 600, uppercase, `letter-spacing: 0.04em`, muted | UI |
| Page title (H1) | 20px (`--text-h1`) / 600 / 1.3 | UI |
| H2 (headings inside a section) | 16px (`--text-h2`) / 600 | UI |
| IDs (`sword_of_fire`), JSON, numbers in tables | 13px / 400 | Mono |
| Wordmark "GameAtlas" | 14px / 400 | Wordmark |

Headings use the UI font. Keep sizes tool-like: nothing larger than 20px inside the app, **except** dashboard stat
figures (`--text-stat`, 28px/600, tabular numbers).

---

## 5. Spacing, shape, depth

### 5.1 Spacing (comfortable density, 4px grid)
`--space-1: 4px` · `--space-2: 8px` · `--space-3: 12px` · `--space-4: 16px` · `--space-5: 24px` · `--space-6: 32px`

| Size token | Value | Use |
|---|---|---|
| `--control-height` | 30px | Inputs, buttons, selects |
| `--row-height` | 36px | Table rows |
| `--section-header-height` | 32px | Section headers, sidebar title |
| `--topbar-height` | 40px | Top bar |
| `--statusbar-height` | 28px | Status bar |
| `--sidebar-width` | 240px | Sidebar (and the wordmark cell above it) |
| `--label-width` | 200px | Property label column |

- Space under a section title: `--space-4`. Between stacked sections: `--space-6`. Between side-by-side panes: `--space-5` either side of the rule. Gap between property rows: `--space-3`. Page padding inside the content zone: `--space-5`.

### 5.2 Radius (subtle)
- `--radius-sm: 4px` for inputs, buttons, badges, toggles, dropdown options
- `--radius-md: 6px` for graph nodes, the graph canvas, dashboard cards, toasts, dropdown menus, slide-out panel, dialogs
- `--radius-lg: 10px` for the app content zone only
- **Sections have no radius**, because they have no box to round.

### 5.3 Separation (mix)
| Layer | How it's separated |
|---|---|
| Frame (top bar + sidebar + status bar) | One continuous translucent surface (`--glass-chrome-bg`), with no borders or gaps between its parts |
| Frame → content zone | `--glass-content-bg` + 1px `--glass-border` + `--radius-lg` |
| Content zone → section | **Nothing.** Sections are flat and transparent (§7.2) |
| Section → section, stacked | A 1px `--color-border` rule under each section title, plus `--space-6` between them |
| Section → section, side by side | A 1px `--color-border` vertical rule in the gutter, `--space-5` either side |
| Inside a section | 1px `--color-border` dividers |
| Inputs | Filled background, no visible border until hover/focus |
| Floating layers (menus, popovers, toasts, slide-out panel, dialogs) | Floating glass + `--shadow-float` |

### 5.4 Glass

Glass comes in **three** tiers, from the back of the page to the front. Note that the middle tier is now
almost unused: pages are flat, so glass belongs to the app frame and to things that float above the page.

| Tier | Tokens | Used for |
|---|---|---|
| **Shell glass** | `--glass-chrome-bg` `rgb(22 22 23 / 0.45)` (frame), `--glass-content-bg` `rgb(37 37 38 / 0.4)` (content zone). Translucency only, **no `backdrop-filter`** | `AppShell`: the frame and the content zone |
| **Card glass** | `--glass-panel-bg` `rgb(37 37 38 / 0.62)`, `--glass-panel-blur` `blur(24px) saturate(130%)` | **Only** the dashboard's three section cards (§7.13). Don't reintroduce it elsewhere |
| **Floating glass** (`.glass` class in `base.css`) | `--glass-bg` `rgb(37 37 38 / 0.72)`, `--glass-blur` `blur(16px) saturate(140%)`, `--glass-border` `rgb(255 255 255 / 0.08)`, `--shadow-float` `0 8px 24px rgb(0 0 0 / 0.45)` | Side panel, dropdowns, popovers, toasts, dialogs, graph minimap and controls |

- **Solid content stays solid:** inputs, code blocks, table headers, graph nodes and the graph canvas (`--color-canvas-bg`, 72%) stay opaque or nearly opaque, so content is always readable.
- **Portals are required.** Anything that overlays the page and is opened from inside a section (dropdown lists, side panels) must render into `document.body` with `createPortal`. `Select` and `SidePanel` already do this. Two reasons: section bodies scroll (`overflow: auto`) and would clip an overlay, and `backdrop-filter` — still used by the dashboard cards and every floating layer — makes an element the containing block for `position: fixed` children. The shell deliberately has no `backdrop-filter` for the same reason.
- **Fallbacks** when `backdrop-filter` isn't supported: dashboard cards use `--color-bg-panel`, floating glass uses `--color-bg-raised`.

### 5.5 Retro touch
The retro/pixel personality is limited to a few crisp details:
1. **Wordmark** "GameAtlas" set in the Silkscreen pixel font.
2. **Focus ring:** a hard 2px solid `--color-accent-text` outline with a 2px offset. No soft glow.
3. **Hard corners on small things:** 4px max radius on controls, square-cornered toggle switches, and no pill shapes anywhere. The only circles are graph handles.
4. **Primary button press:** moves down 1px (`translateY(1px)`), with no bouncy easing.

### 5.6 Background glows
Soft, organically shaped color glows sit behind everything so the glass has something to show.
- A fixed `body::before` layer (in `base.css`): six overlapping, offset radial-gradient ellipses, rotated -8° and blurred 48px.
- Palette colors only: `--glow-accent` (accent, 40%), `--glow-teal` (success fill, 38%) and `--glow-info` (info fill, 22%).
- Static, with no animation.
- **Contrast rule:** every text color was checked on each glass tier over the strongest glow overlap. **Re-check WCAG AA before raising glow opacity or lowering any glass opacity**; `--color-text-subtle` is the first to fail.

---

## 6. Layout

Desktop only, **minimum 1024px** wide. Below that, the page scrolls horizontally rather than rearranging.
Every page renders inside **`AppShell`**.

```
  FRAME: one translucent surface around the content zone, with no dividers. 8px top padding.

  GAMEATLAS                                                   Import  [New asset]
  (brand, 240px)       (top bar, 40px: global actions)
                     ╭──────────────────────────────────────────────────────────╮
  SIDEBAR            │ CONTENT ZONE: rounded glass (radius-lg), scrolls itself  │
  Blueprints ▸       │  ┌──────────────┬─────────────────────┬──────────────┐  │
   ▸ Items           │  │ Asset list   │ Asset form          │ Preview      │  │
   ▸ Entities        │  │ (pane)       │ (pane, flexible)    │ (pane)       │  │
  Graphs ▸           │  └──────────────┴─────────────────────┴──────────────┘  │
                     ╰──────────────────────────────────────────────────────────╯ ← 12px right padding
  Items › Sword of Fire                                   3 problems (status bar, 28px)
```

- **Frame:** the top bar, sidebar and status bar are one continuous translucent surface with no borders between them. It has 8px of padding at the top and 12px on the right. The frame never scrolls; only the content zone and the sidebar (if its list is long) do.
- **Top bar:** the wordmark sits above the sidebar. Global actions are right-aligned with the content zone's edge. The top bar holds no page-specific controls.
- **Sidebar:** `AppSidebar`, built from `SidebarNav` sections: a small uppercase title and a list of links with 16px icons. A **Home** link (the dashboard) comes first, without a section title. **Assets** has All assets and one link per blueprint (to its asset browser), **Dialogues** has All dialogues, **Blueprints** has All blueprints, **General** has Settings, and **Developer** links to the style showcase. Pages can add their own section above Developer. Hover uses `--color-hover-overlay`. The link whose route best matches the URL is active (`--color-accent-soft` background, `--color-accent-text` text), so an asset editor highlights its blueprint under Assets.- **Content zone:** one large rounded glass area between the top bar and status bar. It scrolls on its own. Pages sit inside it with `--space-5` padding, divided into flat sections (§6.1).
- **Status bar:** breadcrumbs on the left in 12px muted text, aligned with the wordmark (separator `›`, last item in primary text). Optional short status text on the right, such as "Saved" or "3 problems". Breadcrumbs appear on every page deeper than the home page.
- **Asset editor = three panes:** asset list | form | preview (built, §7.12). Resizable and collapsible panes with sizes remembered in `localStorage` are **(planned)**.

### 6.1 Sections (how pages are built)

**Pages are flat.** A page is not a tray of cards; it is one surface divided by rules. Everything inside the
content zone — stacked blocks on a settings or list page, and the side-by-side panes of an editor — is a
`Section` with **no background, no border box and no radius**. What tells two sections apart is a 1px
`--color-border` rule and the space around it, nothing else.

| Section has | Looks like |
|---|---|
| A title (optional) | 13px/600 uppercase muted label, at least 32px tall, with a rule under it. Small ghost icon buttons sit at the right of the same row |
| A body | `--space-4` under the title rule, no side padding of its own, and it scrolls when it needs to. It is a **size container**, so `PropertyRow` can stack its labels |
| A footer (optional) | A rule, then the bar of buttons that must stay visible while the body scrolls (Save / Discard / Delete) |

- **Stacked sections** sit `--space-6` apart. Their title rules give the page its rhythm.
- **Side-by-side panes** are separated by a **vertical** 1px rule in the gutter, with `--space-5` of padding
  either side of it. The outermost edges get no padding — the page's own padding already provides it.
  The pattern is in `Assets.module.css`, `Blueprints.module.css` and `Dialogues.module.css`; copy it rather
  than inventing a new one.
- **Don't repeat the page heading as a section title.** On the list pages the table sits in an untitled
  section, because the `<h1>` above it already says "All assets".

**Three deliberate exceptions**, and no others:

1. **The dashboard's three section cards** (§7.13) keep card glass, a border and `--radius-md`. They are the
   app's entry points and are meant to look different from the flat content below them.
2. **The graph canvas** keeps a hairline border and `--radius-md`. It is a viewport onto the dialogue tree,
   not a card, and without an edge its dot grid would bleed into the page.
3. **Floating layers** (dropdowns, side panel, toasts, dialogs) are of course still boxes — they float.

If you find yourself wanting a card for anything else, use a rule and more space instead.

---

## 7. Components

### 7.1 Buttons
| Variant | Look | Use |
|---|---|---|
| Primary | `--color-accent` fill, white text | One per view: Save, Create |
| Secondary (default) | `--color-bg-input` fill, primary text, hover `--color-bg-input-hover` | Cancel, Import, Export |
| Ghost | Transparent, muted text → primary text + `--color-bg-raised` on hover | Toolbar icon buttons, "Add property" |
| Danger | `--color-error` fill, white text | Delete (always behind a confirmation) |

- 30px tall, `--radius-sm`, 0 `--space-3` padding, 13px/500 text, optional 16px Lucide icon on the left.
- Icon-only buttons are 30px square and must have `aria-label` and `title`.
- Disabled: 45% opacity, `cursor: not-allowed`.

### 7.2 Property rows (form fields)
- **Label on the left, input on the right:** a two-column grid with a **200px** label column. Labels are left-aligned, muted, 13px/500, and vertically centered with the input.
- **In sections narrower than 520px, labels move above inputs automatically** (a CSS container query in `PropertyRow.module.css`; every `Section` body is a size container). Side panels and graph nodes always use `layout="stacked"`.
- Required: a red asterisk after the label (`--color-error-text`), plus a screen-reader-only "(required)".
- Help text (optional): 12px subtle text under the input.
- Error: 12px `--color-error-text` under the input with a 14px Lucide `circle-alert` icon, replacing the help text. The input gets an error border.
- **Validation runs as you type**, but only for properties the user has changed, or for everything after Save. A summary box ("2 problems") at the top of the preview pane lists clickable property names that move focus to the property.
- Inputs don't stretch across the whole row: text inputs and dropdowns are max **480px**, number inputs **120px**, textareas max **640px**, vector boxes **110px** each.

### 7.3 Inputs
- **Filled style:** `--color-bg-input` background, transparent 1px border, `--radius-sm`, 30px tall, 14px text.
- Hover: `--color-bg-input-hover`. Focus: `--color-border-strong` border **plus** the retro focus ring (§5.5).
- Placeholder: `--color-text-muted`.
- **Toggle switches** for booleans: a 32×18px square-cornered track, `--color-bg-input` with an inset border when off, `--color-accent` when on, and a 12px knob sliding over 150ms.
- **Enum / Reference:** a select-style button that opens a floating-glass dropdown list (rendered through a portal). Reference dropdowns add a search box and show the asset name plus its ID in muted mono text. Keyboard: arrows, Enter, Esc, Tab. The list closes on outside click, scroll, wheel or resize.
- **Vector2/Vector3:** number boxes side by side (like Unity), each with a neutral inset `X`/`Y`/`Z` label (muted mono, 12px) separated by a 1px divider. The whole box shows the focus ring.
- **IDs** (`sword_of_fire`) are always shown in `--font-mono`.

### 7.4 Tables (asset lists)
- Sit inside a section, usually with the section body padding removed. Sticky header row on `--color-bg-raised`, 12px/600 muted uppercase labels.
- 36px rows, 1px `--color-border` bottom dividers, hover `--color-bg-raised`, selected `--color-accent-soft`.
- Sortable columns: clicking a header toggles ascending/descending with a 14px Lucide `chevron-up`/`chevron-down`; unsorted sortable columns show a faint `chevrons-up-down`.
- Selectable rows are focusable and respond to Enter and Space.
- Numbers right-aligned in mono. The ID column uses mono muted text.

### 7.5 Slide-out side panel
Used for creating or editing small things (e.g. adding a property in the Blueprint builder).
- Slides in from the right over the page: 400px wide, full height, floating glass, `--radius-md` on the left corners, 150ms. A light dim (25% black) covers the page behind it.
- Header with a title and a ghost close button (Lucide `x`); footer with Cancel (secondary) and the primary action, right-aligned.
- Closes on Esc or when clicking outside, and returns focus to whatever opened it.
- **Modals** (`ConfirmDialog`, a native `<dialog>`) are only for destructive confirmations: "Delete asset 'Sword of Fire'? This can't be undone."

### 7.6 Toasts
- All action feedback uses toasts: **bottom-right**, stacked, floating glass, 320px wide, `--radius-md`.
- A 3px left edge in the status fill color, a 16px Lucide status icon in the status text tint, and a short message.
- Auto-dismiss after 4s; errors stay until dismissed. Include an Undo action where possible.

### 7.7 Empty states
Plain text and one button, centered in the section: a muted line ("No assets yet.") and a button ("Create asset"). No illustrations.

### 7.8 Icons
- **Lucide** (`lucide-react`), **16px** in controls and **14px** inline, `strokeWidth={1.75}`, color inherited from text.
- Icons are decorative (`aria-hidden="true"`) unless they're the only content of a button, which then needs `aria-label` and `title`.

### 7.9 Wordmark
Styled text "GameAtlas" in the Silkscreen font, `--color-text`, in the top-left of the frame above the sidebar. It will be replaced by a real logo later.

### 7.10 Component inventory
**Reuse or extend these before creating anything new.** All live in `src/components/`.

| Component | Purpose |
|---|---|
| `AppShell` | The page frame. Props: `actions` (top bar), `sidebar`, `breadcrumbs` and `status` (status bar), `children` (content zone) |
| `AppSidebar` | The app's sidebar (Blueprints and Developer sections). `children` adds a page-specific section |
| `SidebarNav` | Titled list of sidebar links. `items: [{ id, label, icon?, to?, href? }]` (`to` is an app route), `activeId`, `onSelect` |
| `Section` | A flat piece of a page (§6.1): optional `title`/`actions` header above a rule, a scrolling body, optional `footer` above a rule. No fill, border or radius. Its body is a size container |
| `SegmentedControl` | Switch between a few views: `options: [{ value, label }]`, `value`, `onChange` |
| `Button` | `variant` (primary / secondary / ghost / danger), `icon` |
| `form/PropertyRow` | Label, help and error wiring for one property. Children can be a function receiving the input's props. `layout="stacked"` |
| `form/TextInput`, `TextArea`, `NumberInput`, `Toggle`, `Select`, `VectorInput` | One input per property type (see PLAN.md §5.3) |
| `form/FormRenderer` | Builds a whole form from blueprint properties: `fields`, `values`, `onChange(values, path)`, `errors` by path. Groups render indented behind a divider line |
| `form/FieldInput`, `form/ListInput` | The input for one property type; a list of values with add/remove |
| `form/ValidationSummary` | "N problems" list whose items move focus to their input: `problems: [{ id, label, message }]`, `hiddenCount` for problems not shown yet, optional `onSelect(problem)` to do something else (e.g. center a dialogue node) |
| `form/ValueRenderer` | Read-only counterpart of `FormRenderer`: `fields`, saved `data`, `resolveLink(blueprintId, key) → { label, to } \| null`. Label/value rows, indented groups, list chips, X/Y/Z vector chips, links to linked assets |
| `Table` | Sortable columns, selectable rows. `columns: [{ key, label, sortable?, numeric?, mono?, render? }]` |
| `JsonPreview` | "Show JSON" toggle with Code and Tree views and a copy button. `alwaysVisible` skips the toggle (for a dedicated file tab) |
| `SidePanel` | Slide-out panel (portal) |
| `ConfirmDialog` | Destructive confirmation (native `<dialog>`) |
| `Toast/ToastProvider` + `useToast()` | `toast.show({ status, message, action? })` |
| `Badge` | `tone` (neutral / accent / success / warning / error / info) |
| `Breadcrumbs` | `items: [{ label, to? }]`; the last item is the current page |
| `LinkList` | Links with an icon, label, optional hint (`tone: 'error' \| 'warning'` colors it) and right-aligned meta text: `items: [{ id, icon, label, hint?, tone?, meta?, to }]`, `emptyMessage` |
| `EmptyState`, `Wordmark` | As described above |
| `Notice` + `ImportNotice` | A short explanation above a form: `tone` (info / warning) and children. `ImportNotice` is the "opened pre-filled" wording every editor shows (§7.15) |

**Whole-page components.** These own the `AppShell` themselves, so a page that uses one returns it directly:

| Component | Purpose |
|---|---|
| `ListPage` | The shape of every "all the X" page: heading with buttons, optional search toolbar, and a table that falls back to an empty state. The page keeps its own data and search state and passes filtered `rows` plus `total`; `ListPage` renders the count, the "nothing matches" state and the Clear filters button (§7.12) |
| `MissingRecord` | The page shown when a URL points at something that isn't there: `title`, `message`, `back: { to, label }`, `crumbs`. Used for missing blueprints, assets and dialogues, and for unknown routes |
| `TopBarActions` | The Import / New pair in the top bar: `noun`, `newPath`, `importFile(text) → { imported } \| { error }`. On success it opens the editor pre-filled through navigation state (§7.15) |
| `UnsavedChangesDialog` | The "discard unsaved changes?" prompt, driven by the blocker from `useUnsavedChanges()` |

The showcase covers tokens, form controls, tables and overlays. Dialogue node styling is not mocked there: the real editor at `/dialogues` is the reference (§10).

### 7.11 Page pattern: blueprint builder
The first real page (`pages/Blueprints/`) sets the pattern for editor pages:
- **Two panes:** the thing being edited (left, with General settings then the property list) and a **Preview** pane (right) whose header `SegmentedControl` switches between "Asset form" (a working `FormRenderer`, nothing saved) and "Blueprint file" (`JsonPreview alwaysVisible`).
- **Property rows:** 36px bordered rows showing the label (with required `*`), the ID in mono, a neutral type `Badge`, and ghost icon buttons for move up, move down, duplicate and remove. Clicking the row edits it. Rows with problems get an error border and an "N problems" note. Groups show their properties indented behind a 2px divider, with "Add property to …" underneath.
- **Editing happens in the side panel** with stacked labels. The ID follows the label (camelCase) until edited. Errors appear once a setting is touched, or for everything after "Add property" / "Apply changes" is clicked.
- **Pane footer:** Save (primary), Discard changes (disabled when nothing changed), and Delete (danger, pushed right, behind a confirmation that mentions blueprints linking to it).
- **Removing a property** is instant, with an Undo toast rather than a confirmation (nothing is saved until Save).
- **Status bar:** "Unsaved changes", "Saved · version N", or "N problems" after a failed save.
- **Leaving with unsaved changes** asks "Discard unsaved changes?"; closing the tab shows the browser's own warning.

### 7.12 Page pattern: asset browser, asset view and asset editor
`pages/Assets/`, the data-entry pages writers and designers use most.

**Asset browser** (`/blueprints/:id/assets`)
- Page header: "{Blueprint} assets" (H1), the blueprint's description, and Edit blueprint, Download all, and New asset (primary).
- A search box (max 320px) with "N of M assets", then an untitled section with a sortable, clickable table: **Name** (the asset's `name` text property, or its ID), **ID**, up to **four** simple properties as extra columns (links show the linked asset's name, on/off shows Yes/No, empty shows "—"), **Blueprint** ("Up to date" or a warning `Badge` "Outdated"), and **Updated**.
- Empty states: "No {Blueprint} assets yet." with New asset, and "No assets match …" with Clear search.

**All assets** (`/assets`)
- The same layout as the asset browser, but across every blueprint, so its columns are the ones all assets share: **Name**, **ID**, **Blueprint**, **Status** (error "N problems", warning "Outdated", or success "Ready"; sorting puts problems first) and **Updated**.
- Toolbar: a search box, a blueprint filter (`Select`), and the result count. The download button reads "Download all" or "Download these" when filtered, and writes `assets.json` (or `<blueprint>.assets.json` for one blueprint).
- New assets are created from a blueprint's own browser, so this page has no "New asset" button; its empty state links there instead.

**Asset view** (`/blueprints/:id/assets/:key`, opened from the browser)
- Read-only; nothing on the page changes data.
- **Header:** "{Blueprint} asset" eyebrow (12px caps, muted), the asset name (H1), its ID in mono, and badges: warning "Outdated", then success "Ready to export" or error "N problems". Buttons: Edit (secondary) and **Export asset** (primary, downloads `{id}.json`).
- **Problems:** if the saved data no longer passes the current blueprint, a warning notice lists them with an "Edit it" link, and Export explains that the problems must be fixed first.
- **Two columns:** a Properties section (`ValueRenderer`; empty values show "Not set" in subtle italics, and links go to the linked asset's view) | a 360px column with Details (ID, blueprint and version, created, updated), **Linked from** (assets and dialogues that reference it, each a link with an icon and a subtle hint), and Asset file (`JsonPreview` of the export).
- The status bar shows "Updated {date}".

**Asset editor** (`/blueprints/:id/assets/:key/edit` and `/new`)
- Its breadcrumbs end in "{asset} › Edit" (the asset name links back to the view), and the form pane header has a View (eye) button.
- **Three panes:** the blueprint's assets (260px: name and ID, current asset selected, + button) | the form | Preview (340px).
- **Form pane:** notices first (warning: saved with an older blueprint version; info: imported from a file), then the asset's **ID** (mono, follows the name until edited), a divider, and the `FormRenderer` form. Footer: Save asset, Discard changes, Delete (danger, pushed right).
- **Preview pane:** `ValidationSummary`, then `JsonPreview` of the export shape (hidden until "Show JSON"). Its header has a download button. While required values are still empty and untouched, the summary says "Some properties still need values before this can be saved."
- **Links** list the target blueprint's assets by name with the ID as a hint. With no assets, the dropdown is disabled and reads "No {Blueprint} assets yet".
- **Status bar:** "Unsaved changes", "Saved {date}", "Not saved yet", or "N problems" after a failed save.
- Renaming an asset's ID updates links to it and says so in the save toast. Deleting mentions how many assets link to it.

### 7.13 Page pattern: home dashboard
`pages/Dashboard/`, at `/`. It's an overview inside `AppShell`. The future login page will be a separate full-screen page outside `AppShell` with its own look, so the two stay visually distinct.
- **Greeting:** the date as a 12px caps eyebrow, "Good morning / afternoon / evening" (H1), and a muted one-line subtitle.
- **Section cards:** three equal glass cards (Assets, Dialogues, Blueprints). Each has a 36px icon chip (`--color-accent-soft` background, `--color-accent-text` icon), a title and description, a big count (`--text-stat`) with its unit, a muted detail line, and a footer with a status badge ("N to fix" warning or "All ready" success) and/or an "All … →" link. The Assets card lists each blueprint with its asset count instead of a footer link.
- **Lower columns (1.4 : 1):** **Recently updated** (`LinkList` of the six newest assets and dialogues, dates on the right) | **Quick create** (a two-column grid of input-colored link tiles: New dialogue, New {blueprint} for up to four blueprints, New blueprint) above **Needs attention** (`LinkList` with error/warning hints, a count badge in the header, and "Everything is ready to export." when empty).
- **Status bar:** "N items need attention" or "Everything is ready to export". A small subtle footnote links to the style showcase.

### 7.14 Page pattern: settings
`pages/Settings/`, at `/settings` (sidebar → General).
- A single column (max 880px): H1 "Settings" with a muted intro, then stacked sections.
- **Setting rows:** a bold 14px title and a muted 13px explanation on the left, one button on the right, separated by 1px dividers.
- **Your data:** three count tiles (`--color-bg-raised`, 20px numbers, linking to each section) and an info note that data lives in this browser only, with its size. The status bar repeats the size.
- **Back up and restore:** Download backup (primary). "Choose backup file" (secondary) reads the file and shows a preview box (file name in mono, date and contents) with Cancel and a danger "Restore this backup". Nothing changes until the confirmation dialog.
- **Start over:** Reset to examples (secondary) and Delete everything (danger), each behind a confirmation that says exactly what will be replaced or deleted.

### 7.15 Pattern: import and duplicate
- **Import** buttons live in the top bar of each section's pages ("Import blueprint", "Import asset", "Import dialogue").
- **Duplicate** is a Copy-icon button: a ghost icon button in editor pane headers (blueprint builder, asset editor, dialogue editor) and a labelled secondary "Duplicate" button on the asset view.
- Both open the section's `/new` editor **pre-filled and unsaved**. An info notice at the top says where the data came from: "Imported from a file. Review it, then save." or "Copy of “{name}”. Change what you need, then save."
- Imported data shows all its problems immediately and keeps its ID. Duplicates get " (copy)" names and unique IDs that keep following the name until edited, and only show problems as usual.
- **Download all** (asset browser, dialogue list) refuses with an error toast while any item has problems.

---

## 8. Motion

- **Subtle:** `--duration-fast: 150ms`, `--ease: cubic-bezier(0.2, 0, 0, 1)`.
- Animate hover color fades, dropdown and toast entrances, the side panel slide-in, the toggle knob and tree/chevron rotation.
- Don't animate page transitions or table rows, and never use bounce or spring effects. The only looping animation is the optional graph edge flow (§10).
- `@media (prefers-reduced-motion: reduce)` turns all durations to `0ms`.

---

## 9. JSON preview

- Lives in the **right preview pane**, **hidden until the user clicks "Show JSON"** (a ghost button with the Lucide `braces` icon). The validation summary stays visible either way.
- Two views, switched by a small segmented control: **Code** (syntax highlighted) and **Tree** (collapsible, first two levels open).
- Code view: `--font-mono` 13px on `--color-bg-app`, `--radius-sm`, with Copy and Hide icon buttons in the toolbar above it.
- Syntax colors are derived from the palette: keys `--color-accent-text`, strings `--color-success-text`, numbers `--color-warning-text`, booleans/null `--color-info-text`, punctuation `--color-text-subtle`.
- Tree view: disclosure chevrons, keys in mono, collapsed objects show `{3}` and arrays `[5]` in subtle text.
- The preview always shows the **export shape**: never editor-only data.

---

## 10. Dialogue editor (Phase 4)

The node editor is **only for dialogue trees** (`pages/Dialogues/`, built with React Flow).

- **Wording:** Dialogue, Line, Speaker (none = Narrator), Player choice with Responses, Check flag (If set / If not set), Action (Give item / Set story flag), Story flag, End.
- **Page** (`/dialogues/:key`): the "Dialogue tree" canvas pane | a 340px "Dialogue" pane with Name, ID, Description, "Speakers come from" and "Items come from" (blueprint pickers), **Checks** (`ValidationSummary`; clicking a problem selects and centers its node), and the file JSON preview. Footer: Save, Discard, and a danger delete icon button. The header has a download button.
- **Saving vs. downloading:** incomplete dialogues can be saved (the status bar adds "· N problems"); downloading requires every check to pass.
- **Canvas:** `--color-canvas-bg` with a **dot** pattern (`--color-canvas-dot`, 16px grid), themed through React Flow's `--xy-*` CSS variables in `DialogueCanvas.module.css`.
- **Nodes:** `--color-bg-panel` card, `--radius-md`, 1px `--color-border` (error border when the node has problems), 260px wide (Start 150px, End 180px). A **28px header strip** holds a 14px Lucide icon, the node type name (13px/600) and a delete button; nodes are dragged by the header. The node's problems are listed at its bottom in 12px error text.
  - Header strip color per node type comes from `--color-node-start`, `--color-node-line`, `--color-node-choice`, `--color-node-condition`, `--color-node-action` and `--color-node-end`, all neutral for now (§3.4).
  - Selected node: 2px `--color-accent-text` outline.
- **Editing happens directly inside the node** using the same input components as forms, with stacked labels. Nodes grow in height to fit.
- **Edges:** smooth bezier curves, 1.5px `--color-edge` (`#5a5a5d`), `--color-accent-text` when selected or being drawn. **Each output has at most one connection** (a new one replaces it); inputs accept many. **Animated flow is off by default** and toggled from the canvas toolbar.
- **Handles:** 10px circles, `--color-bg-input` fill with a `--color-border-strong` border, `--color-accent-text` on hover. The input sits on the header's left edge. Outputs sit on the right edge of the header (Start, Line, Action) or of each output row (each player response; "If set" / "If not set").
- **Adding nodes:** a glass toolbar (top-left) adds a Line, Player choice, Check flag, Action or End in the middle of the view. Dropping a connection on empty canvas opens an "Add next step" menu there; dropping it on a node connects to that node. A small hint at the bottom explains this.
- **Navigation:** drag the empty canvas to pan; scroll or pinch to zoom (30%–175%). Delete or Backspace removes selected nodes and connections; Start can't be deleted.
- **Controls** (glass, bottom-left): zoom in, zoom out, fit view.
- **Minimap** (glass, bottom-right): node rectangles and the visible area; drag or scroll it to move around.

---

## 11. Wording & tone

### 11.1 User-facing terms (UI only; code, API and database keep internal names)
| Internal (code/API/DB) | Shown to users |
|---|---|
| Schema | **Blueprint** |
| Document | **Asset** |
| Field | **Property** |
| Key (`sword_of_fire`) | **ID** |
| Graph | **Graph** |

Use sentence case everywhere: "New blueprint", "Add property", not "New Blueprint".

Property types are shown as: **Short text**, **Long text**, **Whole number**, **Decimal number**, **On / off**,
**Choice list**, **Vector 2**, **Vector 3**, **Link to asset**, **List** and **Group**, each with a one-line
description (defined in `src/schema/fieldTypes.js`). The exported JSON is called the **blueprint file**.

### 11.2 Voice
Neutral and concise. Say what happened, or what to do.
| Situation | Write | Don't write |
|---|---|---|
| Save success | "Asset saved" | "Nice! Your asset was saved successfully!" |
| Validation | "Must be 0 or more" | "Invalid input" |
| ID format | "Use lowercase letters, numbers and underscores" | "Key regex mismatch" |
| Save blocked | "Fix 2 problems before saving" | "Validation failed" |
| Delete confirm | "Delete asset 'Sword of Fire'? This can't be undone." | "Are you sure?" |
| Load failure | "Couldn't load assets. Check your connection and try again." | "Error 500" |

- Never show technical terms (JSON Schema, UUID, HTTP codes, stack traces) outside the JSON preview.

---

## 12. Accessibility

- Meet **WCAG 2.2 AA**: 4.5:1 for text, 3:1 for UI boundaries and focus rings. All token pairings in this document were checked, including on every glass tier over the background glows.
- No custom keyboard shortcuts, **but** everything must work with Tab, Enter, Space, arrow keys (dropdowns) and Esc, and every focused element shows the focus ring.
- Every input has a real `<label>`. Help and error messages are linked with `aria-describedby`; invalid inputs set `aria-invalid`. Toasts use `role="status"` (errors use `role="alert"`).
- Never rely on color alone. Errors always have an icon and text.

---

## 13. Implementation rules

- **Plain CSS + CSS variables.** No Tailwind, no component library.
  ```
  src/styles/tokens.css     # every token in this document, on :root
  src/styles/base.css       # the reset AND every shared component's styling, as global classes
  src/components/<Name>/<Name>.jsx        # no stylesheet of its own
  src/pages/<Area>/<Area>.module.css      # page layout only, scoped
  src/utils/cx.js           # joins class names: cx('btn', isOn && 'is-active')
  ```

**Shared components have no CSS Modules** (decision of 2026-09-17). Every component in `src/components/`
is styled by global classes in `base.css`, so a look is defined once and reused by name instead of being
re-typed per component. Pages keep their own `.module.css` for layout, which loads after `base.css` and
therefore wins on equal specificity — that is how a page sizes a shared control (`className={styles.filter}`
on a `Select`).

| In `base.css` | Meaning | Example |
|---|---|---|
| `.thing` | a component | `.btn`, `.badge`, `.section`, `.drawer` |
| `.thing-part` | a part of it | `.section-head`, `.toast-close`, `.value-label` |
| `.thing-variant` | a variant chosen by a prop | `.btn-primary`, `.badge-error`, `.toast-info` |
| `.is-state` | a state | `.is-active`, `.is-invalid`, `.is-selected`, `.is-disabled` |
| `.muted` `.mono` `.truncate` `.caps` `.row` `.col` | utilities | used directly in markup |

`base.css` §3 holds the shared shapes: one rule lists every class that is a centred flex row, another every
class that is a column, and gaps are grouped by size. A component's own rule then sets **only what makes it
different**. When adding a component, add its selector to those groups rather than repeating
`display: flex; align-items: center; gap: …` — and prefer reusing an existing look over inventing a
near-identical one.

- Components use tokens (`var(--space-3)`), **never raw hex colors**. Raw px is only acceptable for 1px borders and small fixed component geometry (e.g. the toggle track).
- `tokens.css`, `base.css` and the two font packages are imported once, in `main.jsx`.
- Overlays opened from inside a section render through `createPortal` (§5.4).
- Dependencies this guide adds: `lucide-react`, `@fontsource/jetbrains-mono`, `@fontsource/silkscreen`.
- Dark scrollbars: thin, `--color-border-strong` thumb on transparent track.
- **Style showcase:** `src/pages/StyleShowcase/` shows every token and component. It lives at `/dev/styles` (sidebar → Developer). Add new components and tokens to it, and check new UI against it.

---

## 14. Decisions & open questions

### Resolved (reviewed in the style showcase, 2026-09-14)
1. **Accent has two roles:** `#335284` for fills, `#8aa8dc` for text, links and focus rings. Status colors likewise have fill and text versions (§3).
2. **Retro/pixel is limited to small details:** the pixel wordmark, a hard focus ring, square toggles and no pill shapes (§5.5).
3. **Glass everywhere, over background glows:** three glass tiers (§5.4) over static color glows (§5.6). `--color-text-subtle` was lightened to keep AA contrast.
4. **App shell:** the top bar, sidebar and bottom status bar form one frame around a rounded, independently scrolling content zone; breadcrumbs live in the status bar (§6).
5. **Full width vs. readability:** panes are full width, inputs have max widths, and labels stack in narrow sections (§6.1, §7.2).
6. **JSON preview:** both highlighted Code and collapsible Tree views, behind a switch (§9).
7. **Errors as you type,** but only for properties the user has changed (or after Save), so a new form doesn't open covered in red (§7.2).
8. **Graph navigation:** drag to pan, wheel to zoom toward the cursor, with zoom controls and a minimap viewport (§10).

### Still open
1. **Color coding:** should graph node types (and maybe vector X/Y/Z labels) get colors when Phase 4 starts? The tokens are ready (§3.4).
2. **Logo:** the Silkscreen wordmark is a placeholder until a real logo exists.
3. **Pane resizing and collapsing** in the asset editor, and remembering sizes, are planned but not designed in detail.

### Next pages to build
✔ Blueprint list and builder (§7.11), the asset browser and editor (§7.12), and the dialogue list and tree editor
(§10), 2026-09-14. ✔ Asset view (§7.12) and home dashboard (§7.13), settings with backup and restore (§7.14), and import, duplicate and "Download all" everywhere (§7.15), 2026-09-17. Next: a login page (full-screen, outside `AppShell`, with its own look) and whatever the Phase 2 API needs (loading and error states).
