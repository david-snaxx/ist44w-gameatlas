# GameAtlas: Style Guidelines

> **This is the authoritative design system for GameAtlas.** Humans and AI assistants follow it for all UI work.
> It was derived from the filled-in questionnaire in [`STYLE-GUIDE.md`](STYLE-GUIDE.md) on 2026-09-14, and
> **simplified on 2026-09-23 and 24**: no accessibility layer (§12), no motion (§8), the browser's own form controls
> (§7.3), and one CSS block per component (§13). Every value lives in one token file (`src/styles/tokens.css`),
> so changes there apply app-wide. Resolved interpretations and still-open questions are in
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
| One small retro accent (the pixel wordmark) | Pixel fonts for body text, chiptune gimmicks |
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
| `--color-bg-raised` | `#2d2d2f` | Table header, hovered table rows, notices, settings tiles |
| `--color-bg-input` | `#323234` | Filled inputs and dropdowns, secondary buttons |
| `--color-bg-input-hover` | `#38383a` | Secondary button hover |
| `--color-border` | `#3a3a3c` | Default 1px borders and dividers |
| `--color-hover-overlay` | `rgb(255 255 255 / 0.05)` | Hover on translucent surfaces (sidebar links) |
| `--color-text` | `#e6e6e6` | Primary text |
| `--color-text-muted` | `#a8a8a8` | Secondary text, labels, status bar |
| `--color-text-subtle` | `#969696` | Timestamps, hints. **Only on frame, content zone or page backgrounds, never on inputs** (too faint there). Lightened from `#8c8c8c` so it stays readable on glass |

### 3.2 Accent (brand)

The chosen accent `#335284` is dark. It works as a **fill behind white text**, but it's **hard to read as text
or thin lines on the dark UI**. So the accent comes in two roles:

| Token | Value | Use |
|---|---|---|
| `--color-accent` | `#335284` | Primary button fill, checked checkboxes |
| `--color-accent-hover` | `#3d5a88` | Primary button hover |
| `--color-accent-text` | `#8aa8dc` | Links, active nav text/icon, selected graph edges |
| `--color-accent-soft` | `rgb(51 82 132 / 0.28)` | Selected rows, active sidebar item |
| `--color-on-accent` | `#ffffff` | Text/icons on accent, success, error and info fills |

### 3.3 Status colors

The chosen status colors are used as **fills**. Lighter **text tints** are derived for inline messages and icons.

| Status | Fill (with text on it) | Text/icon tint on dark UI |
|---|---|---|
| Success | `--color-success` `#1f525d` + white text | `--color-success-text` `#5fa8b5` |
| Warning | `--color-warning` `#fec67b` + `--color-on-warning` `#1b1b1c` text | `--color-warning-text` `#fec67b` |
| Error | `--color-error` `#9e3234` + white text | `--color-error-text` `#e0797b` |
| Info | `--color-info` `#527592` + white text | `--color-info-text` `#8daac4` |

- Inline error messages use `--color-error-text` under the input (the `.field-error` class). Don't put error text *inside* an input, and don't restyle the input itself.

### 3.4 Color coding

**None.** Blueprints, property types, graph node types and vector axes all use neutral styling. If color coding
is ever wanted, add tokens for it then (the unused placeholder tokens were removed on 2026-09-24). See §14.

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
| Section title | 13px / 600, uppercase, muted | UI |
| Page title (H1) | 20px (`--text-h1`) / 600 / 1.3 | UI |
| H2 (headings inside a section) | 16px (`--text-h2`) / 600 | UI |
| JSON preview, the ID under an asset's name | 13px / 400 | Mono |
| Wordmark "GameAtlas" | 14px / 400 | Wordmark |

Headings use the UI font. Keep sizes tool-like: nothing larger than 20px inside the app, **except** dashboard stat
figures (`--text-stat`, 28px/600).

IDs (`sword_of_fire`) in inputs and tables use the normal UI font.

---

## 5. Spacing, shape, depth

### 5.1 Spacing (comfortable density, 4px grid)
`--space-1: 4px` · `--space-2: 8px` · `--space-3: 12px` · `--space-4: 16px` · `--space-5: 24px` · `--space-6: 32px`

| Size token | Value | Use |
|---|---|---|
| `--control-height` | 30px | Inputs, buttons, selects |
| `--row-height` | 36px | Table rows |
| `--section-header-height` | 32px | Section headers |
| `--topbar-height` | 40px | Top bar |
| `--statusbar-height` | 28px | Status bar |
| `--sidebar-width` | 240px | Sidebar (and the wordmark cell above it) |
| `--label-width` | 200px | Property label column |

- Space under a section title: `--space-4`. Between stacked sections: `--space-6`. Between side-by-side panes: `--space-5` either side of the rule. Gap between property rows: `--space-3`. Page padding inside the content zone: `--space-5`.

### 5.2 Radius (subtle)
- `--radius-sm: 4px` for inputs, dropdowns, buttons, badges
- `--radius-md: 6px` for graph nodes, the graph canvas, dashboard cards, toasts, the "Add next step" menu, dialogs
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
| Inputs | Filled background, no border |
| Floating layers (toasts, slide-out panel, dialogs, the graph toolbar and menu) | Floating glass + `--shadow-float` |

### 5.4 Glass

Glass comes in **three** tiers, from the back of the page to the front. Note that the middle tier is now
almost unused: pages are flat, so glass belongs to the app frame and to things that float above the page.

| Tier | Tokens | Used for |
|---|---|---|
| **Shell glass** | `--glass-chrome-bg` `rgb(22 22 23 / 0.45)` (frame), `--glass-content-bg` `rgb(37 37 38 / 0.4)` (content zone). Translucency only, **no `backdrop-filter`** | `AppShell`: the frame and the content zone |
| **Card glass** | `--glass-panel-bg` `rgb(37 37 38 / 0.62)`, `--glass-panel-blur` `blur(24px) saturate(130%)` | **Only** the dashboard's three section cards (§7.13). Don't reintroduce it elsewhere |
| **Floating glass** (`.glass` class in `base.css`) | `--glass-bg` `rgb(37 37 38 / 0.72)`, `--glass-blur` `blur(16px) saturate(140%)`, `--glass-border` `rgb(255 255 255 / 0.08)`, `--shadow-float` `0 8px 24px rgb(0 0 0 / 0.45)` | Side panel, toasts, dialogs, the graph toolbar and "Add next step" menu |

- **Solid content stays solid:** inputs, code blocks, table headers, graph nodes and the graph canvas stay opaque, so content is always readable.
- **Portals are required.** Anything that floats over the page and is opened from inside a section (the side panel, the graph's "Add next step" menu) must render into `document.body` with `createPortal`. `SidePanel` already does this. Two reasons: section bodies scroll (`overflow: auto`) and would clip an overlay, and `backdrop-filter` — still used by the dashboard cards and every floating layer — makes an element the containing block for `position: fixed` children. The shell deliberately has no `backdrop-filter` for the same reason. Dropdowns are the browser's own `<select>`, so they need nothing.

### 5.5 Retro touch
The retro/pixel personality is limited to two crisp details:
1. **Wordmark** "GameAtlas" set in the Silkscreen pixel font.
2. **Hard corners on small things:** 4px max radius on controls and no pill shapes anywhere. The only circles are graph handles.

### 5.6 Background glows
Soft, organically shaped color glows sit behind everything so the glass has something to show.
- A fixed `body::before` layer (in `base.css`): six overlapping, offset radial-gradient ellipses, rotated -8° and blurred 48px.
- Palette colors only: `--glow-accent` (accent, 40%), `--glow-teal` (success fill, 38%) and `--glow-info` (info fill, 22%).
- Static, with no animation.
- **Readability:** before raising glow opacity or lowering any glass opacity, check that text is still easy to read over the brightest glow; `--color-text-subtle` is the first to suffer.

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
- **Sidebar:** `AppSidebar`: groups of links with 16px icons, each group under a small uppercase title. A **Home** link (the dashboard) comes first, without a title. **Assets** has All assets and one link per blueprint (to its asset browser), **Dialogues** has All dialogues, **Blueprints** has All blueprints, and **General** has Settings. Hover uses `--color-hover-overlay`. The link whose route best matches the URL is active (`--color-accent-soft` background, `--color-accent-text` text), so an asset editor highlights its blueprint under Assets.
- **Content zone:** one large rounded glass area between the top bar and status bar. It scrolls on its own. Pages sit inside it with `--space-5` padding, divided into flat sections (§6.1).
- **Status bar:** breadcrumbs on the left in 12px muted text, aligned with the wordmark (separator `›`). Optional short status text on the right, such as "Saved" or "3 problems". Breadcrumbs appear on every page deeper than the home page.
- **Asset editor = three panes:** asset list | form | preview (built, §7.12). Resizable and collapsible panes with sizes remembered in `localStorage` are **(planned)**.

### 6.1 Sections (how pages are built)

**Pages are flat.** A page is not a tray of cards; it is one surface divided by rules. Everything inside the
content zone — stacked blocks on a settings or list page, and the side-by-side panes of an editor — is a
`Section` with **no background, no border box and no radius**. What tells two sections apart is a 1px
`--color-border` rule and the space around it, nothing else.

| Section has | Looks like |
|---|---|
| A title | 13px/600 uppercase muted label, at least 32px tall, with a rule under it. Ghost icon buttons sit at the right of the same row |
| A body | `--space-4` under the title rule, no side padding of its own, and it scrolls when it needs to. It is a **size container**, so `PropertyRow` can stack its labels |
| A footer (optional) | A rule, then the bar of buttons that must stay visible while the body scrolls (Save / Discard / Delete) |

- **Stacked sections** sit `--space-6` apart. Their title rules give the page its rhythm.
- **Side-by-side panes** are separated by a **vertical** 1px rule in the gutter, with `--space-5` of padding
  either side of it. The outermost edges get no padding — the page's own padding already provides it.
  The pattern is the global `.panes` class; a page only sets its column widths
  (`style={{ '--panes': '260px minmax(0, 1fr) 340px' }}`).
- **Don't repeat the page heading as a section title.** On the list pages the table sits directly under the
  heading with no section around it, because the `<h1>` already says "All assets".

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
- Icon-only buttons have a `title`, which shows as a tooltip saying what they do.
- Disabled: 45% opacity, `cursor: not-allowed`.

### 7.2 Property rows (form fields)
- **Label on the left, input on the right:** a two-column grid with a **200px** label column. Labels are left-aligned, muted, 13px/500, and vertically centered with the input.
- **In places narrower than 520px, labels move above inputs automatically** (a CSS container query in `base.css`). Section bodies, the side panel body and graph node bodies are size containers, so the side panel, the dialogue pane and graph nodes always show stacked labels without any prop.
- Required: a plain `*` after the label.
- Help text (optional): 12px subtle text under the input.
- Error: 12px `--color-error-text` under the input, replacing the help text.
- **Validation runs as you type**, but only for properties the user has changed, or for everything after Save. A summary ("2 problems") at the top of the preview pane lists property names; clicking one moves focus to its input (inputs built by `FormRenderer` have the id `field-<path>`).
- Inputs don't stretch across the whole row: text inputs, textareas and dropdowns are max **480px**, number inputs **120px** (each vector axis is a number input).

### 7.3 Inputs
- **Filled style** (the `.input` class): `--color-bg-input` background, no border, `--radius-sm`, 30px tall, 14px text. Focus uses the browser's own focus outline.
- **Checkboxes** for booleans (`Checkbox`): the browser's own checkbox, 16px, tinted with `accent-color: --color-accent`.
- **Enum / Reference** (`Select`): the browser's own `<select>`, with the filled input look. It shows labels only (no search box, no IDs). A `placeholder` adds an empty first choice such as "Choose an asset…".
- **Vector2/Vector3:** number inputs side by side (like Unity), each after a plain `X`/`Y`/`Z` letter.

### 7.4 Tables (asset lists)
- Sit directly on a list page or inside a section. Sticky header row on `--color-bg-raised`, 12px/600 muted uppercase labels.
- 36px rows, 1px `--color-border` bottom dividers, hover `--color-bg-raised`, selected `--color-accent-soft`. Clicking a row opens it.
- Every column sorts: clicking a header sorts ascending (`↑` after the label), clicking again sorts descending (`↓`).
- All cells are left-aligned in the normal UI font.

### 7.5 Slide-out side panel
Used for creating or editing small things (e.g. adding a property in the Blueprint builder).
- Sits on the right over the page: 400px wide, full height, floating glass. A light dim (25% black) covers the page behind it.
- Header with a title and a ghost close button (Lucide `x`); footer with Cancel (secondary) and the primary action, right-aligned.
- Closes with its close button, Cancel, or a click outside it.
- **Modals** (`ConfirmDialog`, the browser's own `<dialog>`; Esc cancels) are only for destructive confirmations: "Delete asset 'Sword of Fire'? This can't be undone."

### 7.6 Toasts
- All action feedback uses toasts: **bottom-right**, stacked, floating glass, 320px wide, `--radius-md`.
- A 3px left edge in the status fill color, a short message, and a ghost close button.
- Auto-dismiss after 4s; errors stay until dismissed. Include an Undo action where possible.

### 7.7 Empty states
Plain text and one button, centered in the section: a muted line ("No assets yet.") and a button ("Create asset"). No illustrations.

### 7.8 Icons
- **Lucide** (`lucide-react`), **16px** in controls and **14px** inline, default stroke width, color inherited from text: `<Save size={16} />`.
- Icons sit next to text. An icon-only button gets a `title` (§7.1).

### 7.9 Wordmark
Styled text "GameAtlas" in the Silkscreen font, `--color-text`, in the top-left of the frame above the sidebar (`.shell-brand` in `AppShell`). It will be replaced by a real logo later.

### 7.10 Component inventory
**Reuse or extend these before creating anything new.** All live in `src/components/`.

| Component | Purpose and props |
|---|---|
| `AppShell` | The page frame, with the sidebar built in. `actions` (top bar), `crumbs: [{ label, to? }]` and `status` (status bar), `children` (content zone) |
| `AppSidebar` | The app's sidebar (§6). No props; `AppShell` renders it |
| `Section` | A flat piece of a page (§6.1): `title` and optional `actions` above a rule, a scrolling body (a size container), optional `footer` above a rule. No fill, border or radius |
| `SegmentedControl` | Switch between a few views: `options: [{ value, label }]`, `value`, `onChange(value)` |
| `Button` | `variant` (primary / secondary / ghost / danger), `icon`, plus any `<button>` prop (`onClick`, `disabled`, `title`, `className`) |
| `form/PropertyRow` | One labelled property: `label`, `required`, `help`, `error`, and the input as `children` |
| `form/TextInput`, `TextArea`, `NumberInput` | Thin wrappers that add the `.input` look; they take the normal element props (`value`, `onChange`, `placeholder`, `id`, …) |
| `form/Select` | The browser's `<select>`: `options: [{ value, label }]`, `value`, `onChange(value)`, optional `placeholder`, `disabled`, `id` |
| `form/Checkbox` | `checked`, `onChange(checked)` |
| `form/VectorInput` | `axes` (e.g. `['x', 'y', 'z']`), `value: { x, y, z }`, `onChange(value)`, `id` for the first box |
| `form/FormRenderer` | Builds a whole form from blueprint properties: `fields`, `values`, `onChange(values, path)`, `errors` by path, `referenceOptions` by blueprint ID. Groups render indented behind a divider line |
| `form/FieldInput`, `form/ListInput` | The input for one property type (its id is `field-<path>`); a list of values with add/remove |
| `form/ValidationSummary` | "N problems" list whose items move focus to their input: `problems: [{ id, label, message }]`, `hiddenCount` for problems not shown yet, optional `onSelect(problem)` to do something else (e.g. center a dialogue node) |
| `form/ValueRenderer` | Read-only counterpart of `FormRenderer`: `fields`, saved `data`, `resolveLink(blueprintId, key) → { label, to } \| null`. Label/value rows, indented groups, comma-separated lists and vectors, links to linked assets |
| `Table` | Sortable columns, clickable rows. `columns: [{ key, label, render? }]`, `rows` (each with a unique `id`), `onSelect(id)`, optional `selectedId` |
| `JsonPreview` | "Show JSON" toggle, then plain formatted JSON with Copy and Hide. `alwaysVisible` skips the toggle (for a dedicated file tab) |
| `SidePanel` | Slide-out panel (portal). Render it only while open: `title`, `onClose`, `footer`, `children` |
| `ConfirmDialog` | Destructive confirmation (the browser's `<dialog>`). Render it only while open: `title`, `message`, `confirmLabel`, `onConfirm`, `onCancel` |
| `Toast/ToastProvider` + `useToast()` | `toast.show({ status, message, action? })` |
| `Badge` | `tone` (neutral / success / warning / error) |
| `LinkList` | Links with an icon, a label and an optional hint under it: `items: [{ icon, label, hint?, to }]`, `emptyMessage` |
| `EmptyState` | A centered muted `message` and one button as `children` (§7.7) |
| `Notice` + `ImportNotice` | A short explanation above a form: `tone` (info / warning) and children. `ImportNotice` is the "opened pre-filled" wording every editor shows (§7.15) |

**Whole-page components.** These own the `AppShell` themselves, so a page that uses one returns it directly:

| Component | Purpose |
|---|---|
| `ListPage` | The shape of every "all the X" page: heading with buttons, optional search toolbar, and a table that falls back to an empty state. The page keeps its own data and search state and passes filtered `rows` plus `total`; `ListPage` shows the count in the status bar and the "No X match." state (§7.12) |
| `MissingRecord` | The page shown when a URL points at something that isn't there: `title`, `message`, `back: { to, label }`. Used for missing blueprints, assets and dialogues, and for unknown routes |
| `TopBarActions` | The Import / New pair in the top bar: `noun`, `newPath`, `importFile(text) → { imported } \| { error }`. On success it opens the editor pre-filled through navigation state (§7.15) |
| `UnsavedChangesDialog` | The "discard unsaved changes?" prompt, driven by the blocker from `useUnsavedChanges()` |

### 7.11 Page pattern: blueprint builder
The first real page (`pages/Blueprints/`) sets the pattern for editor pages:
- **Two panes:** the thing being edited (left, with General settings then the property list) and a **Preview** pane (right) whose header `SegmentedControl` switches between "Asset form" (a working `FormRenderer`, nothing saved) and "Blueprint file" (`JsonPreview alwaysVisible`).
- **Property rows:** 36px bordered rows showing the label (with required `*`), the ID in muted text, a neutral type `Badge`, and ghost icon buttons for move up, move down, duplicate and remove. Clicking the row edits it. Rows with problems get an error border and an "N problems" note. Groups show their properties indented behind a 2px divider, with "Add property to …" underneath.
- **Editing happens in the side panel** with stacked labels. The ID follows the label (camelCase) until edited. Errors appear once a setting is touched, or for everything after "Add property" / "Apply changes" is clicked.
- **Pane footer:** Save (primary), Discard changes (disabled when nothing changed), and Delete (danger, pushed right, behind a confirmation that mentions blueprints linking to it).
- **Removing a property** is instant, with an Undo toast rather than a confirmation (nothing is saved until Save).
- **Status bar:** "Unsaved changes", "Saved · version N", or "N problems" after a failed save.
- **Leaving with unsaved changes** asks "Discard unsaved changes?"; closing the tab shows the browser's own warning.

### 7.12 Page pattern: asset browser, asset view and asset editor
`pages/Assets/`, the data-entry pages writers and designers use most.

**Asset browser** (`/blueprints/:id/assets`)
- Page header: "{Blueprint} assets" (H1), the blueprint's description, and Edit blueprint, Download all, and New asset (primary).
- A search box, then a sortable, clickable table: **Name** (the asset's `name` text property, or its ID), **ID**, up to **four** simple properties as extra columns (links show the linked asset's name, on/off shows Yes/No, empty shows "—"), **Blueprint** ("Up to date" or a warning `Badge` "Outdated"), and **Updated**.
- Empty states: "No {Blueprint} assets yet." with New asset, and "No assets match." while searching.

**All assets** (`/assets`)
- The same layout as the asset browser, but across every blueprint, so its columns are the ones all assets share: **Name**, **ID**, **Blueprint**, **Status** (error "N problems", warning "Outdated", or success "Ready"; sorting puts problems first) and **Updated**.
- Toolbar: a search box and a blueprint filter (`Select`). The download button reads "Download all" or "Download these" when filtered, and writes `assets.json` (or `<blueprint>.assets.json` for one blueprint).
- New assets are created from a blueprint's own browser, so this page has no "New asset" button; its empty state links there instead.

**Asset view** (`/blueprints/:id/assets/:key`, opened from the browser)
- Read-only; nothing on the page changes data.
- **Header:** "{Blueprint} asset" eyebrow (12px caps, muted), the asset name (H1), its ID in mono, and badges: warning "Outdated", then success "Ready to export" or error "N problems". Buttons: Edit (secondary) and **Export asset** (primary, downloads `{id}.json`).
- **Problems:** if the saved data no longer passes the current blueprint, a warning notice lists them with an "Edit it" link, and Export explains that the problems must be fixed first.
- **Two columns:** a Properties section (`ValueRenderer`; empty values show "Not set" in muted text, and links go to the linked asset's view) | a 360px column with Details (ID, blueprint and version, created, updated), **Linked from** (assets and dialogues that reference it, each a link with an icon and a subtle hint), and Asset file (`JsonPreview` of the export).
- The status bar shows "Updated {date}".

**Asset editor** (`/blueprints/:id/assets/:key/edit` and `/new`)
- Its breadcrumbs end in "{asset} › Edit" (the asset name links back to the view), and the form pane header has a View (eye) button.
- **Three panes:** the blueprint's assets (260px: name and ID, current asset selected, + button) | the form | Preview (340px).
- **Form pane:** notices first (warning: saved with an older blueprint version; info: imported from a file), then the asset's **ID** (follows the name until edited), a divider, and the `FormRenderer` form. Footer: Save asset, Discard changes, Delete (danger, pushed right).
- **Preview pane:** `ValidationSummary`, then `JsonPreview` of the export shape (hidden until "Show JSON"). Its header has a download button. While required values are still empty and untouched, the summary says "Some properties still need values before this can be saved."
- **Links** list the target blueprint's assets by name. With no assets, the dropdown is disabled and reads "No assets to link to yet".
- **Status bar:** "Unsaved changes", "Saved {date}", "Not saved yet", or "N problems" after a failed save.
- Renaming an asset's ID updates links to it and says so in the save toast. Deleting mentions how many assets link to it.

### 7.13 Page pattern: home dashboard
`pages/Dashboard/`, at `/`. It's an overview inside `AppShell`. The future login page will be a separate full-screen page outside `AppShell` with its own look, so the two stay visually distinct.
- **Greeting:** the date as a 12px caps eyebrow, "Good morning / afternoon / evening" (H1), and a muted one-line subtitle.
- **Section cards:** three equal glass cards (Assets, Dialogues, Blueprints). Each has a 36px icon chip (`--color-accent-soft` background, `--color-accent-text` icon), a title and description, a big count (`--text-stat`) with its unit, a muted detail line, and a footer with a status badge ("N to fix" warning or "All ready" success) and/or an "All … →" link. The Assets card lists each blueprint with its asset count instead of a footer link.
- **Lower columns (1.4 : 1):** **Recently updated** (`LinkList` of the six newest assets and dialogues, with the date in each hint) | **Quick create** (a two-column grid of input-colored link tiles: New dialogue, New {blueprint} for up to four blueprints, New blueprint) above **Needs attention** (`LinkList` whose hints say what's wrong, a count badge in the header, and "Everything is ready to export." when empty).
- **Status bar:** "N items need attention" or "Everything is ready to export".

### 7.14 Page pattern: settings
`pages/Settings/`, at `/settings` (sidebar → General).
- A single column (max 880px): H1 "Settings" with a muted intro, then stacked sections.
- **Setting rows:** a bold 14px title and a muted 13px explanation on the left, one button on the right, separated by 1px dividers.
- **Your data:** three count tiles (`--color-bg-raised`, 20px numbers, linking to each section) and a short note that data lives in this browser only, with its size. The status bar repeats the size.
- **Back up and restore:** Download backup (primary). "Choose backup file" (secondary) reads the file and shows a preview box (file name, date and contents) with Cancel and a danger "Restore this backup". Nothing changes until the confirmation dialog.
- **Start over:** Reset to examples (secondary) and Delete everything (danger), each behind a confirmation that says exactly what will be replaced or deleted.

### 7.15 Pattern: import and duplicate
- **Import** buttons live in the top bar of each section's pages ("Import blueprint", "Import asset", "Import dialogue").
- **Duplicate** is a Copy-icon button: a ghost icon button in editor pane headers (blueprint builder, asset editor, dialogue editor) and a labelled secondary "Duplicate" button on the asset view.
- Both open the section's `/new` editor **pre-filled and unsaved**. An info notice at the top says where the data came from: "Imported from a file. Review it, then save." or "Copy of “{name}”. Change what you need, then save."
- Imported data shows all its problems immediately and keeps its ID. Duplicates get " (copy)" names and unique IDs that keep following the name until edited, and only show problems as usual.
- **Download all** (asset browser, dialogue list) refuses with an error toast while any item has problems.

---

## 8. Motion

**None** (decision of 2026-09-23). There are no transitions or animations: hover and state changes are
instant, and panels, dialogs, dropdowns and toasts simply appear. The only moving thing is the optional
animated edge flow in the dialogue editor (§10), which React Flow draws itself.

---

## 9. JSON preview

- Lives in the **right preview pane**, **hidden until the user clicks "Show JSON"** (a ghost button with the Lucide `braces` icon). The validation summary stays visible either way.
- Plain formatted JSON: `--font-mono` 13px on `--color-bg-app`, `--radius-sm`, with **Copy** (shows a toast) and **Hide** ghost buttons above it. No syntax colors and no tree view (both removed on 2026-09-23).
- The preview always shows the **export shape**: never editor-only data.

---

## 10. Dialogue editor (Phase 4)

The node editor is **only for dialogue trees** (`pages/Dialogues/`, built with React Flow).

- **Wording:** Dialogue, Line, Speaker (none = Narrator), Player choice with Responses, Check flag (If set / If not set), Action (Give item / Set story flag), Story flag, End.
- **Page** (`/dialogues/:key`): the "Dialogue tree" canvas pane | a 340px "Dialogue" pane with Name, ID, Description, "Speakers come from" and "Items come from" (blueprint pickers), **Checks** (`ValidationSummary`; clicking a problem selects and centers its node), and the file JSON preview. Footer: Save, Discard, and a danger delete icon button. The header has a download button.
- **Saving vs. downloading:** incomplete dialogues can be saved (the status bar adds "· N problems"); downloading requires every check to pass.
- **Canvas:** React Flow's own dark theme (`colorMode="dark"`) with a 16px dot grid, inside a 1px `--color-border` edge with `--radius-md`. `DialogueCanvas.module.css` only recolors the connections through React Flow's `--xy-*` variables.
- **Nodes:** `--color-bg-panel` card, `--radius-md`, 1px `--color-border` (error border when the node has problems), 260px wide (Start 150px, End 180px). A **header** holds a 14px Lucide icon, the node type name (13px/600) and a ghost delete button; nodes are dragged by the header. The node's problems are listed at its bottom in 12px error text.
  - Selected node: 2px `--color-accent-text` outline.
- **Editing happens directly inside the node** using the same input components as forms; labels stack above inputs by themselves (node bodies are size containers). Nodes grow in height to fit.
- **Edges:** smooth bezier curves in `--color-edge` (`#5a5a5d`), `--color-accent-text` when selected or being drawn. **Each output has at most one connection** (a new one replaces it); inputs accept many. **Animated flow is off by default** and switched on with a checkbox in the canvas toolbar.
- **Handles:** 10px circles in React Flow's default colors. The input sits on the header's left edge. Outputs sit on the right edge of the header (Start, Line, Action) or of each output row (each player response; "If set" / "If not set").
- **Adding nodes:** a glass toolbar (top-left) adds a Line, Player choice, Check flag, Action or End in the middle of the view. Dropping a connection on empty canvas opens an "Add next step" menu there (a click outside closes it); dropping it on a node connects to that node. A small hint in the toolbar explains this.
- **Navigation:** drag the empty canvas to pan; scroll or pinch to zoom (30%–175%). Delete or Backspace removes selected nodes and connections; Start can't be deleted.
- **Controls** (bottom-left): zoom in, zoom out, fit view.
- **Minimap** (bottom-right): node rectangles and the visible area; drag or scroll it to move around.

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

**Deliberately out of scope** (decision of 2026-09-23). GameAtlas is a solo capstone prototype whose owner is
learning React, so the code carries no accessibility layer:

- No `aria-*` attributes, `role`s or screen-reader-only text.
- No focus management (trapping, restoring or moving focus) and no custom focus ring; the browser's default focus outline is what shows.
- No keyboard handling beyond what the browser's own elements already do. Using native `<button>`, `<select>`, checkbox and `<dialog>` elements keeps basic keyboard use working for free.
- No `prefers-reduced-motion` rules (there is no motion anyway, §8).
- Labels are plain text next to inputs, not linked to them.

Don't add these back unless the project's scope changes; record that in PLAN.md's decision log if it does.

---

## 13. Implementation rules

- **Plain CSS + CSS variables.** No Tailwind, no component library.
  ```
  src/styles/tokens.css     # every token in this document, on :root
  src/styles/base.css       # the reset, utilities, and every shared component's styling, as global classes
  src/components/<Name>/<Name>.jsx        # no stylesheet of its own
  src/pages/<Area>/<Page>.module.css      # page layout only, scoped
  src/utils/cx.js           # joins class names: cx('btn', isOn && 'is-active')
  ```

**Shared components have no CSS Modules** (decision of 2026-09-17). Every component in `src/components/`
is styled by global classes in `base.css`. Pages keep their own `.module.css` for layout, which loads after
`base.css` and therefore wins on equal specificity.

**One block per component** (decision of 2026-09-24). `base.css` is laid out as: reset and background glows,
utilities, then one block per shared component (AppShell, AppSidebar, Page layout, Section, Button, …). A
block holds **every** rule for its classes — `display`, `gap`, colors, sizes — even when that repeats a line
from another block, so reading one block tells you everything about a component. Don't group selectors from
different components into shared rules.

| In `base.css` | Meaning | Example |
|---|---|---|
| `.thing` | a component | `.btn`, `.badge`, `.section`, `.drawer` |
| `.thing-part` | a part of it | `.section-head`, `.drawer-foot`, `.prop-label` |
| `.thing-variant` | a variant chosen by a prop | `.btn-primary`, `.badge-error`, `.toast-info` |
| `.is-state` | a state | `.is-active`, `.is-selected` |
| `.row` `.between` `.push-right` `.stack` `.muted` `.subtle` `.small` `.truncate` `.field-error` | utilities | used directly in markup |

- Components use tokens (`var(--space-3)`), **never raw hex colors**. Raw px is only acceptable for 1px borders and small fixed component geometry (e.g. the checkbox size).
- **Keep it simple.** No transitions or animations (§8) and no accessibility layer (§12). Prefer the browser's own controls over custom widgets, and don't add a prop or a CSS rule for a small visual tweak.
- `tokens.css`, `base.css` and the two font packages are imported once, in `main.jsx`.
- Overlays opened from inside a section render through `createPortal` (§5.4).
- Dependencies this guide adds: `lucide-react`, `@fontsource/jetbrains-mono`, `@fontsource/silkscreen`.

---

## 14. Decisions & open questions

### Resolved (2026-09-14, simplified 2026-09-23 and 24)
1. **Accent has two roles:** `#335284` for fills, `#8aa8dc` for text and links. Status colors likewise have fill and text versions (§3).
2. **Retro/pixel is limited to small details:** the pixel wordmark and no pill shapes (§5.5).
3. **Glass everywhere, over background glows:** three glass tiers (§5.4) over static color glows (§5.6). `--color-text-subtle` was lightened so it stays readable.
4. **App shell:** the top bar, sidebar and bottom status bar form one frame around a rounded, independently scrolling content zone; breadcrumbs live in the status bar (§6).
5. **Full width vs. readability:** panes are full width, inputs have max widths, and labels stack in narrow sections (§6.1, §7.2).
6. **JSON preview:** plain formatted text with Copy and Hide (§9). The highlighted Code view and the Tree view were removed on 2026-09-23.
7. **Errors as you type,** but only for properties the user has changed (or after Save), so a new form doesn't open covered in red (§7.2).
8. **Graph navigation:** drag to pan, wheel to zoom toward the cursor, with zoom controls and a minimap viewport (§10).
9. **Simple code over polish** (2026-09-23 and 24): no accessibility layer (§12), no motion (§8), the browser's own `<select>`, checkbox and `<dialog>` instead of custom widgets (§7.3), and one CSS block per component (§13).

### Still open
1. **Color coding:** should graph node types (and maybe vector X/Y/Z labels) get colors? No tokens are reserved for it (§3.4).
2. **Logo:** the Silkscreen wordmark is a placeholder until a real logo exists.
3. **Pane resizing and collapsing** in the asset editor, and remembering sizes, are planned but not designed in detail.

### Next pages to build
✔ Blueprint list and builder (§7.11), the asset browser and editor (§7.12), and the dialogue list and tree editor
(§10), 2026-09-14. ✔ Asset view (§7.12) and home dashboard (§7.13), settings with backup and restore (§7.14), and import, duplicate and "Download all" everywhere (§7.15), 2026-09-17. Next: a login page (full-screen, outside `AppShell`, with its own look) and whatever the Phase 2 API needs (loading and error states).
