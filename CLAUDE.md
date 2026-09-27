# GameAtlas: AI Assistant Context

**Read [`docs/PLAN.md`](docs/PLAN.md) before doing anything non-trivial.** It is the source of truth for
goals, data model, API contract, phases, and past decisions. This file is only a quick summary.

## What this project is
A web app for **Unity** game dev teams. Non-technical members (writers, designers, artists) create
**engine-ready game data** through schema-driven **forms** (flat and nested data) and a **node-graph editor**
(branching dialogue). Documents can **reference each other** across both editors. GameAtlas then generates the
**C# classes, ScriptableObject assets and dialogue runtime** to use that data in Unity. Solo IST 440W capstone by
David Reichart. Hard deadline **2026-12-01**.

**Unity is the target as of 2026-09-17** (PLAN.md §1). This changed the pitch and the outputs, **not the data
model**: stored and exported JSON never mentions Unity, and Unity support is an output layer on top of it
(PLAN.md §5.7). Don't put C#, ScriptableObject or TextMeshPro concerns into `src/schema/` or `src/data/`.

## Current stack (intent, can change; see PLAN.md §3)
- Frontend: React 19 + Vite 8, JavaScript. React Flow (`@xyflow/react` v12) powers the dialogue tree editor.
- Backend (Phase 2+): Spring Boot 4.1, Java 25, MySQL (JSON columns), Flyway.
- Unity (Phase 5+): Unity 6 LTS, C#, TextMeshPro. A UPM package under `unity/`, plus a client-side C# generator in `src/unity/`.
- Right now the repo holds only the frontend, at the repo root: the design system, shared components and the pages. PLAN.md §4 proposes moving it into `frontend/` and adding `backend/` and `unity/`.

## Phases
1. Schema-driven web form: JSON import/export, no backend (Ga.1) — done bar tests
2. MySQL + Spring Boot REST API, document browsing, references (Ga.2) — **current**
3. Schema/form builder for user-defined schemas (Ga.3) — done bar API wiring
4. React Flow dialogue graph editor using the same storage and export (Ga.4) — done bar API wiring
5. Unity integration: C# generation, ScriptableObject importer, dialogue runtime + effect tags (Ga.5)
6. Usability testing, polish, deployment

Check the checkboxes in PLAN.md §7 to see which phase is current.

## Rules to follow when working here
- **Never hand-code forms per schema.** All forms come from a schema definition through the generic `FormRenderer` (`src/components/form/`) and the field-type registry (`src/schema/fieldTypes.js`, PLAN.md §5.2–5.3).
- **The node editor is for dialogue trees only** (user decision, 2026-09-14). Dialogues have their own model (`src/data/dialogueGraph.js`), store and pages, and use dialogue wording (Line, Player choice, Check flag, Action, End). Speakers and items link to assets. The Phase 2 API can still store them as documents of a built-in graph schema.
- **Exported JSON is a contract for engine developers.** Keep it clean: no editor-only data such as node positions. Don't change its shape without updating `docs/export-format.md` and the decision log. It is also **engine-neutral** — the Unity-shaped decisions live in the output layer, not in the export.
- **Vector fields export as `{x,y,z}`** because that is what Unity's `JsonUtility` produces for `Vector2`/`Vector3`. Don't "simplify" it to an array.
- **Dialogue text may contain inline rich-text tags** (PLAN.md §5.8): TMP-native `<b>`, `<i>`, `<color=…>` pass through; GameAtlas effect tags `<wave>`, `<shake>`, `<speed=…>`, `<pause=…>` are parsed by the Unity runtime. They stay inline in the string. Keep the effect set small and fixed.
- **The backend is the authority on validation.** The frontend validates too, for UX.
- **Design for users with zero programming knowledge — and zero Unity knowledge.** Use dropdowns over free-text IDs, inline errors, and no raw JSON by default. Primary users should never have to open the Unity editor; that is the programmer's half of the workflow.
- The user is still learning React and JavaScript (strong in Java, Spring, and SQL). Keep React code idiomatic but simple, and briefly explain non-obvious React patterns.
- **Simple code over polish** (user decisions, 2026-09-23 and 24; PLAN.md §2.7). The code must stay easy for the user to read, so:
  - **No accessibility layer:** no `aria-*` attributes, `role`s, screen-reader-only text, focus management, custom focus rings or keyboard handlers. Native elements (`<button>`, `<select>`, checkbox, `<dialog>`) give basic keyboard use for free; that is enough (STYLE-GUIDELINES §12).
  - **No motion:** no transitions, animations or `prefers-reduced-motion` rules (§8).
  - **Prefer the browser's own controls** over custom widgets: `Select` is a `<select>`, `Checkbox` is a checkbox, `ConfirmDialog` is a `<dialog>`.
  - **Don't add props or CSS for small visual tweaks.** Add a prop only when a caller really needs different behaviour. Icon-only buttons get a `title` (tooltip) and nothing else.
  - **Readable over compact** (user request, 2026-09-24; the whole frontend follows it). The user reads Java/C# comfortably but not dense JavaScript, and the code should be easy for a very junior developer. More lines are fine. Concretely:
    - **No ternaries (`? :`).** Work out anything conditional before the `return` with `if`/`else` and a named variable, or return early. A function that returns different things per case is a chain of `if`s.
    - **`{condition && <Thing />}` only for one plain condition** (a boolean or a value that's set or not). Anything more gets a named variable first (`const showImportNotice = Boolean(imported) && !baseline`).
    - **Loops instead of chained array methods.** Use `for…of` (or a counting `for`) to build arrays, objects and totals — no `reduce`, `Object.fromEntries`, `flatMap`, or `.filter().map()` chains. A single `.find`/`.filter`/`.some`/`.map` with a one-line callback is fine (like C#'s LINQ).
    - **Lists in JSX:** a `.map()` is a one-liner that renders one element or a named component (`{items.map((item) => <LinkListItem key={item.to} item={item} />)}`), or the list is built with a loop before the `return`. Never a `.map()` inside another `.map()`.
    - **Split big components.** Each repeated or self-contained piece of markup is its own small component in the same file with a one-line doc comment (see `StatusBadge`, `SettingRow`, `PropertyPanel`). Data-building logic goes in plain helper functions below the components.
    - **Event handlers:** a one-line arrow that calls one function is fine (`onClick={() => setOpen(true)}`); anything longer is a named `function handleX()` before the `return`.
    - **Class names** are built with strings and `if` (`let className = 'nav-item'; if (isActive) className = 'nav-item is-active'`). There is no `cx` helper.
    - **Explicit object keys** (`{ label: label }`) over shorthand, and no destructuring beyond component props and hook results.
    - Use the `setX((current) => …)` form only when an update can run later or several times before a re-render (the Undo toast, React Flow's change handlers), and say why in a comment; otherwise pass the new value directly.
- Favor MVP scope. Treat anything in PLAN.md's "Stretch / future" list as out of scope unless asked.
- **UI/styling work must follow [`docs/STYLE-GUIDELINES.md`](docs/STYLE-GUIDELINES.md)**, which is the authoritative design system. [`docs/STYLE-GUIDE.md`](docs/STYLE-GUIDE.md) is the filled-in questionnaire it was derived from (for background only). Keep all colors, fonts and spacing in shared CSS variables rather than hard-coding values in components.
- **Shared components have no CSS Modules.** Everything in `src/components/` is styled by global classes in `src/styles/base.css`, **one block per component** that holds every rule for its classes (`display`, `gap`, colors, …), even if that repeats a line from another block (user decision, 2026-09-24). Don't add a `.module.css` there, and don't group selectors from different components together. Small helpers used directly in markup (`.row`, `.between`, `.push-right`, `.stack`, `.muted`, `.subtle`, `.small`, `.truncate`, `.field-error`) live in the Utilities block. Pages keep their own `.module.css` for layout; it loads after `base.css` and so overrides it (STYLE-GUIDELINES §13).
- **User-facing wording:** Schema → "Blueprint", Document → "Asset", Field → "Property", Key → "ID". Frontend modules and components use the UI names (`blueprintStore`, `AssetEditorPage`), but saved/exported data keys (`schemaId`, `schemaVersion`, `fields`, `key`) and future API/database names stay `schema`/`document`/`field`/`key`.
- When a design decision changes, update the relevant PLAN.md section **and** add a line to the decision log (§11).

## Frontend structure so far
- `src/styles/tokens.css` (all design tokens) and `src/styles/base.css` (reset, background glows, utilities, then one block per shared component)
- `src/components/`: reusable components. Every page renders inside `AppShell` (frame with top bar, sidebar and status bar, around a scrolling content zone). The full inventory with props is in STYLE-GUIDELINES.md §7.10; **reuse or extend these before creating new components.**
- **Pages compose shared page-level components, not their own chrome.** A list page returns `<ListPage>` (heading, search toolbar, table, empty states); a missing blueprint/asset/dialogue returns `<MissingRecord>`; the top bar's Import/New pair is `<TopBarActions>`; editors guard leaving with `useUnsavedChanges(isDirty)` from `src/utils/` plus `<UnsavedChangesDialog>`; "opened pre-filled" and out-of-date messages are `<Notice>` / `<ImportNotice>`; downloading a whole collection goes through `downloadCollection()` in `src/utils/downloadJson.js`, which refuses while anything has problems. Don't rebuild these per page.
- **Page layout comes from global classes too.** `.page`, `.page-head`, `.page-intro`, `.page-actions`, `.toolbar`, `.panes`, `.subhead` and `.settings-heading` live in `base.css`'s Page layout block. A side-by-side editor is `<div className="panes" style={{ '--panes': '260px minmax(0, 1fr) 340px' }}>` — the rule in the gutter comes with it. Only add a page `.module.css` when the layout is genuinely unique to that page (the dashboard, settings, the asset view, the graph canvas and nodes, the blueprint property tree).
- **Pages are flat (STYLE-GUIDELINES §6.1).** Every piece of a page is a `Section`: no background, no border box, no radius. Stacked sections are separated by the rule under each title and `--space-6`; side-by-side panes by a vertical rule with `--space-5` either side (the `.panes` class). The only cards left are the dashboard's three entry tiles and the graph canvas's hairline. **Don't add new cards** — use a rule and more space.
- Overlays opened from inside a `Section` (the side panel, the dialogue editor's "Add next step" menu) must use `createPortal` to `document.body`: section bodies scroll and would clip them, and `backdrop-filter` (still on the dashboard cards and every floating layer) traps `position: fixed`. Dropdowns are native `<select>`s, so they need nothing.
- **Forms:** put the input inside `PropertyRow` as a child (`<PropertyRow label="Name" error={error}><TextInput … /></PropertyRow>`). Labels move above inputs by themselves in narrow places. Inputs built by `FormRenderer` get the id `field-<path>`, which is what `ValidationSummary` focuses; give a hand-built input an `id` only when a validation summary needs to jump to it.
- When changing glass, glow or text color tokens, check that text is still easy to read on them (STYLE-GUIDELINES.md §5.6).
- **Opening an editor pre-filled** (import or Duplicate) means navigating to its `/new` route with state `{ imported, origin: 'file' | 'duplicate', originName }`. Use `duplicateAssetState`, `duplicateBlueprintState` and `duplicateDialogueState`. Nothing is saved until the user clicks Save (STYLE-GUIDELINES.md §7.15).
- `src/schema/`: the blueprint (schema) layer. `fieldTypes.js` (type registry), `validation.js` (form values and blueprint definitions), `blueprintDraft.js` (editor drafts with `uid`s ↔ clean saved definitions, tree helpers), `blueprintStore.js` + `useBlueprints()` (localStorage persistence until the Phase 2 API; pages must go through it).
- `src/data/`: the asset (document) layer. `assetStore.js` + `useAssets()` (localStorage until the Phase 2 API; pages must go through it), `assetData.js` (saved data ↔ form values, display names, link renaming, the export shape `{ id, blueprint, blueprintVersion, data }`, file import). Dialogues: `dialogueGraph.js` (node types, validation, export shape, `dialogueLinksToAsset` and `renameAssetInDialogue`), `dialogueStore.js` + `useDialogues()`, `parseDialogueFile` (import with auto-layout). `backup.js`: the backup file format, restore, reset to examples, delete all (each store has a `replace…` function for this).
- Routes live in `src/App.jsx` (`react-router` v8 data router): `/` (home dashboard), `/blueprints` (list), `/blueprints/new` and `/blueprints/:blueprintId` (builder), `/assets` (all assets across blueprints), `/blueprints/:blueprintId/assets` (one blueprint's asset browser), `/blueprints/:blueprintId/assets/:assetKey` (read-only asset view with export), `/blueprints/:blueprintId/assets/new` and `/blueprints/:blueprintId/assets/:assetKey/edit` (asset editor), `/dialogues` (list), `/dialogues/new` and `/dialogues/:dialogueKey` (tree editor), `/settings` (backup, restore, reset), `*` (not found).
- `src/pages/Blueprints/`: the blueprint list and builder (STYLE-GUIDELINES.md §7.11). `src/pages/Assets/`: the all-assets page, per-blueprint asset browser, read-only asset view and editor (§7.12). Use `assetPath(schemaId, key)` from `assetData.js` for an asset's view URL (add `/edit` for the editor). `src/pages/Dialogues/`: the dialogue list and React Flow tree editor (custom nodes in `DialogueNodes.jsx`, registered in `nodeTypes.js`; §10). `src/pages/Dashboard/`: the home dashboard (§7.13). `src/pages/Settings/`: settings with backup and restore (§7.14).

## Commands (frontend, current root)
- Node isn't on the system PATH. WebStorm's bundled Node 20.15.0 is at `C:/Users/snaxx/AppData/Roaming/JetBrains/WebStorm2026.2/node/versions/20.15.0`. Vite 8 wants Node 20.19+ (it still builds, with a warning), and npm skips Vite's Windows engine package on this version. Installing Node 22 or 24 LTS fixes both.
- `.claude/launch.json` defines a `frontend` dev server config that uses WebStorm's Node (for the browser preview).
- `npm run dev`: start Vite dev server
- `npm run build`: production build
- `npm run lint`: ESLint
