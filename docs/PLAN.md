# GameAtlas — Project Plan

> **Living document.** This plan comes from the IST 440W Project Brief (v0.3), the Project Specs, and the
> Literature Review. It is **not binding**. The tech stack, data formats, and scope below can all change as
> the project moves along. When a decision changes, update the relevant section and add a line to the
> [Decision Log](#11-decision-log) so humans and AI assistants stay in sync.

| | |
|---|---|
| **Owner** | David Reichart (solo developer) |
| **Course** | IST 440W capstone |
| **Start** | 2026-08-24 |
| **Hard deadline** | 2026-12-01 |
| **Plan written** | 2026-09-14 |
| **Last revised** | 2026-09-17 — pivoted to targeting **Unity** explicitly (see [§1](#1-what-gameatlas-is-the-one-paragraph-version), [§5.7](#57-unity-output-layer-phase-5), Phase 5) |
| **Engine target** | Unity 6 LTS |
| **Budgeted effort** | ~5 hrs/week (Brief estimate). This is tight, see [Risks](#10-risks--mitigations) |

---

## 1. What GameAtlas is (the one-paragraph version)

GameAtlas is a web app where **non-technical members of a Unity game team** (writers, designers, artists) create
**engine-ready game data** (items, entities, dialogue trees) through friendly forms and a node-graph editor
instead of hand-editing raw JSON or clicking through Unity's Inspector. Programmers define (or help define)
**blueprints** (schemas). Everyone else fills in **assets** (documents) that must conform to them. Everything
lives on one shared server, so the team has a **single source of truth** — and GameAtlas turns that data into
**C# classes, ScriptableObject assets and a dialogue runtime** that drop straight into a Unity project.

### Why Unity specifically (decision of 2026-09-17)

GameAtlas used to be pitched as engine-agnostic. It now **targets Unity explicitly**. Naming the engine is what
makes the last mile possible: a generic tool can only hand you a JSON file and wish you luck, while a Unity-targeted
tool can generate the C# data classes, build the `.asset` files, and ship a runtime that plays the dialogue back.
That turns "a nicer JSON editor" into a pipeline.

The trade is narrower reach for a finishable product and a sharper story. It also gives usability testing
(Phase 6) a population that can actually be recruited: "Unity developers" is a group you can find, "game
developers in general" is not a sampling frame.

### The gap it fills
| Tool | Good at | Missing |
|---|---|---|
| **Unity's own ScriptableObjects + Inspector** (the real incumbent) | Type-safe, lives in the project, no export step | A programmer must hand-write every data class; editing means opening Unity; no search or browsing across assets; `.asset` files merge badly |
| **Charon** | Form-based custom schemas, typed fields, cloud storage | No non-linear/branching data; no XML |
| **Drafft** | Visual node-graph editor for dialogue | Can't import schemas; poor document browsing |
| **Yarn Spinner** | Text-first dialogue, playthrough testing | Custom syntax to learn; can't import schemas |

**GameAtlas's differentiator:** one app that covers **flat** (form), **hierarchical** (nested form), and
**branching** (graph) data, with **references between them**, and that **emits Unity C# and ScriptableObjects
from the same definitions**. For example, a dialogue node's `speaker` points to an `Entity` document, and a
choice can `give` an `Item` document. That removes "app-hopping", the errors from re-typing data in several
tools, and the hand-written `[Serializable]` class that normally sits between the data and the game.

### Who it's for (priority order)
1. **Writers / Designers / Artists on a Unity team.** Primary users. Every UI decision should favor them. Assume **zero programming knowledge** — including zero Unity knowledge. They should never need to open the editor.
2. **Testing users.** They validate usability. Metrics: task speed and perceived reliability.
3. **Unity programmers.** They care about **correct, predictable JSON**, **C# that compiles**, and a stable contract — not the UI. They are the ones who install the package and wire the data into the game.

---

## 2. Guiding principles

1. **Schema-driven from day one.** Even the "static" Phase 1 form must be drawn by a *generic renderer* from a
   hard-coded schema definition, never hand-written JSX per field. This one decision makes Phase 3 (form
   builder) mostly "build a UI that outputs the object we already render."
2. **One document format for both editors.** Form and graph documents share the same storage, API, list/browse UI,
   and export path. A graph is just a document whose schema `kind` is `graph`.
3. **Hide complexity, prevent errors.** Validate as the user types. Use dropdowns for enums and references,
   never free-text IDs. Users should never see raw JSON unless they ask for it.
4. **Export is a contract.** The downloaded JSON shape is what engine devs build against. Keep it clean
   (no editor-only data mixed in), documented, and stable.
5. **Unity-first, engine-neutral core.** Targeting Unity changes the *outputs and the pitch*, not the *data model*.
   Stored and exported JSON never mentions Unity, C#, or ScriptableObjects. Unity support is an **output layer**
   (§5.7) that reads blueprints and assets the same way any other consumer would. This keeps the contract clean,
   keeps `toExport()` unchanged, leaves Godot/Unreal open as future work — and means that if the Unity package
   slips, there is still a complete working app rather than a half-integrated one.
6. **MVP over polish.** Solo dev, fixed deadline. Get each phase working end-to-end before styling it.

---

## 3. Tech stack (current intent, changeable)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | **React 19 + Vite 8** (JavaScript) | Already scaffolded in this repo. Stay in JS to keep the learning curve down; TypeScript is an option later. |
| Styling | Plain CSS + CSS Modules + design tokens | No UI library. All rules in `docs/STYLE-GUIDELINES.md`; tokens in `src/styles/tokens.css`. Icons: `lucide-react`. Fonts: `@fontsource/jetbrains-mono`, `@fontsource/silkscreen`. |
| Node.js | **22 or 24 LTS** (recommended) | Only WebStorm's bundled Node 20.15 is installed right now; Vite 8 needs 20.19+. |
| Routing | `react-router` (v8) | Added early with the blueprint builder. Uses a data router (`createBrowserRouter`) so pages can block navigation when changes are unsaved. |
| Graph UI | **React Flow** (`@xyflow/react` v12) | The dialogue tree editor. Themed through its `--xy-*` CSS variables; every node is a custom component. |
| Form state | Plain React state (`useState`/`useReducer`) | Good enough for a generic renderer and good for learning React. Reconsider `react-hook-form` only if it gets painful. |
| Frontend tests | Vitest + React Testing Library | Mainly for the renderer and validation. |
| Backend | **Spring Boot 4.1 / Java 25 LTS** | Java 25 is installed. Use Spring Web, Spring Data JPA, Validation. |
| Database | **MySQL 8+** | Store schema definitions and document data in **`JSON` columns**, not one table per schema. |
| Migrations | Flyway | Keep the DB schema in version control. |
| Backend tests | JUnit 5 + MockMvc (+ Testcontainers if Docker is available) | |
| Local DB | Docker Compose MySQL container, or a native MySQL install | Docker isn't on PATH right now. |
| Hosting (end) | Static frontend host + container/JVM host + managed MySQL | Decide in Phase 6. Internet deployment is preferred. |
| **Engine target** | **Unity 6 LTS**, C#, TextMeshPro | One LTS version, stated in the package README. Don't chase Unity releases mid-project. |
| **Code generation** | Client-side string templates over the field-type registry | Runs in the browser, no backend needed, works offline. Each field type gains a `csharpType` and a literal/attribute hint (§5.7). |
| **JSON inside Unity** | `JsonUtility` for the runtime path; `com.unity.nuget.newtonsoft-json` for the editor importer | `JsonUtility` can't parse top-level arrays, dictionaries, or string-valued enums. Newtonsoft is a first-party UPM package, so it's a safe dependency for editor-only code. |
| **Unity package** | UPM package under `unity/`, installed by Git URL | Runtime (dialogue player + rich-text effects) and Editor (JSON → ScriptableObject importer) assemblies. |

**Swap-friendly notes:** Postgres (which you already know) could replace MySQL with almost no design change
(`JSONB` instead of `JSON`). The Spring Boot API could be replaced by any REST backend without changing the frontend
as long as the [API contract](#6-rest-api-contract) is kept. Because the core stays engine-neutral (§2.5), a Godot
or Unreal output layer would be a **sibling** of the Unity one, not a rewrite.

---

## 4. Repository layout (target)

```
gameatlas/
├── CLAUDE.md              # Short AI-assistant context; points here
├── docs/
│   ├── PLAN.md               # This file
│   ├── STYLE-GUIDELINES.md   # ✔ Design system (authoritative for all UI)
│   ├── STYLE-GUIDE.md        # ✔ Filled-in style questionnaire (background only)
│   ├── export-format.md      # (Phase 2+) Public JSON export contract for engine devs
│   └── unity-integration.md  # (Phase 5) Install the package, generate C#, import assets, play dialogue
├── frontend/              # Move the current Vite app here (src/, index.html, package.json, ...)
│   └── src/
│       ├── styles/        # ✔ tokens.css (design tokens) + base.css (reset, glass, background glows)
│       ├── components/    # ✔ Shared UI: AppShell, SidebarNav, Panel, Button, Table, Toast, SidePanel, …
│       │   └── form/      # ✔ Input components, PropertyRow, FieldInput, ListInput, FormRenderer, ValidationSummary
│       ├── schema/        # ✔ Field-type registry, validation, blueprint drafts, blueprintStore (localStorage until Phase 2)
│       ├── data/          # ✔ Assets and dialogues: stores (localStorage until Phase 2), data ↔ form values, dialogue graph model, export/import
│       ├── pages/         # ✔ Route-level screens: Blueprints (list + builder), Dashboard (home), Settings, Assets (browser + view + editor), Dialogues (list + tree editor), StyleShowcase, NotFound
│       ├── utils/         # ✔ Small helpers (cx)
│       ├── unity/         # (Phase 5) C# code generation: type mapping + templates (pure functions, no UI)
│       └── api/           # (Phase 2) fetch wrappers for the REST API
├── backend/               # (Phase 2) Spring Boot project from start.spring.io
│   └── src/main/java/.../gameatlas/
│       ├── schema/        # Schema entity, repo, service, controller
│       ├── document/      # Document entity, repo, service, controller
│       └── validation/    # Validates document data against schema definition
├── unity/                 # (Phase 5) UPM package, installed into a Unity project by Git URL
│   └── com.gameatlas.core/
│       ├── package.json
│       ├── Runtime/       # Dialogue player, effect tag parser, TMP effect renderer
│       └── Editor/        # JSON → ScriptableObject importer
└── docker-compose.yml     # (Phase 2) Local MySQL
```

✔ marks what exists today. The Vite app still sits at the repo root; moving it into `frontend/` is cheap now and
gets more expensive later, so do it before Phase 2 adds `backend/`.

`unity/` holds a **Unity package, not a Unity project**. Keep a throwaway test project outside this repo (or
gitignored) and add the package to it by local path while developing.

---

## 5. Core data model

These are the most important design decisions in the project. Everything else builds on them.

### 5.1 Concepts

- **Schema:** the *definition* of a document type (e.g. "Item": `name` string, `damage` int, `rarity` enum).
- **Document:** one *instance* of a schema (e.g. "Sword of Fire").
- **Field type:** a supported data type with its own input component, validation rule, and export shape.
- **Reference:** a field whose value points to another document, limited to a target schema.
- **In the UI** these are called **Blueprint** (schema), **Asset** (document), **Property** (field) and **ID** (key). Code, API and database keep the internal names.

### 5.2 Schema definition (internal format)

```json
{
  "id": "item",
  "name": "Item",
  "kind": "form",
  "version": 1,
  "fields": [
    { "key": "name",        "label": "Name",        "type": "string",  "required": true, "maxLength": 64 },
    { "key": "description", "label": "Description", "type": "text" },
    { "key": "damage",      "label": "Damage",      "type": "int",     "min": 0 },
    { "key": "weight",      "label": "Weight (kg)", "type": "float",   "min": 0 },
    { "key": "stackable",   "label": "Stackable",   "type": "bool",    "default": false },
    { "key": "rarity",      "label": "Rarity",      "type": "enum",    "options": ["common", "rare", "epic"] },
    { "key": "gripOffset",  "label": "Grip Offset", "type": "vector3" },
    { "key": "droppedBy",   "label": "Dropped By",  "type": "reference", "targetSchema": "entity" },
    { "key": "tags",        "label": "Tags",        "type": "list",    "itemType": { "type": "string" } },
    { "key": "stats",       "label": "Stats",       "type": "object",  "fields": [ /* nested fields */ ] }
  ]
}
```

A custom format (instead of raw JSON Schema) is easier for the form builder to read and write.
This format is implemented: `toDefinition()` in `src/schema/blueprintDraft.js` produces it. Saved files leave out
empty settings, settings that don't apply to the type, `required: false` and editor-only `uid`s. Property IDs start
with a letter and may use camelCase; blueprint IDs are `snake_case`. **Stretch goal:**
generate standard JSON Schema from it for engine-side validation.

### 5.3 Field type registry

| Type | Input UI | Component (✔ built, in `src/components/form/`) | Stored/exported as | Phase |
|---|---|---|---|---|
| `string` | text input | ✔ `TextInput` | `"..."` | 1 |
| `text` | textarea | ✔ `TextArea` | `"..."` | 1 |
| `int` | number input, step 1 | ✔ `NumberInput integer` | `42` | 1 |
| `float` | number input | ✔ `NumberInput` | `4.5` | 1 |
| `bool` | toggle switch | ✔ `Toggle` | `true` | 1 |
| `enum` | dropdown | ✔ `Select` | `"rare"` | 1 |
| `vector2` | 2 number boxes | ✔ `VectorInput dimensions={2}` | `{"x":0,"y":0}` | 1 |
| `vector3` | 3 number boxes | ✔ `VectorInput` | `{"x":0,"y":0,"z":0}` | 1 |
| `color` | color picker | — | `"#RRGGBB"` (or RGBA object) | stretch |
| `reference` | searchable dropdown of documents from `targetSchema` | ✔ `Select searchable` | `"<document key>"` | 2–3 |
| `list` | repeatable rows of `itemType` | — | `[...]` | 3 |
| `object` | nested fieldset (hierarchical data) | — | `{...}` | 3 |

On the frontend, each type should be **one entry in a registry**: `{ component, validate(value, field), defaultValue(field) }`.
Adding a type then means adding one entry, with no changes to the renderer. The renderer wraps each input in
`PropertyRow`, which already handles the label, required marker, help text and error message.

> **Resolved 2026-09-17:** the vector export shape stays `{"x":…,"y":…,"z":…}`. That is exactly how Unity's
> `JsonUtility` serializes `Vector2`/`Vector3`, so a generated `public Vector3 gripOffset;` field deserializes
> with no converter and no custom code. `[x,y,z]` would have needed one.
>
> When `color` is built, note that Unity's `Color` is four **floats 0–1** (`{r,g,b,a}`), not `#RRGGBB`. Either
> export `{r,g,b,a}` to match, or generate a `string` field plus a parse helper. Decide it then and log it.

### 5.4 Document

```json
{
  "id": "0b6c…uuid",
  "key": "sword_of_fire",
  "schemaId": "item",
  "schemaVersion": 1,
  "data": { "name": "Sword of Fire", "damage": 12, "rarity": "epic", "gripOffset": {"x":0,"y":0.1,"z":0} },
  "createdAt": "…",
  "updatedAt": "…"
}
```

- **`key`** is a human-readable ID, unique per schema. Engines and references use it. The UUID `id` is internal.
- **Export** (implemented as `toExport()` in `src/data/assetData.js`) writes one object per asset:
  `{ "id": "<key>", "blueprint": "<schemaId>", "blueprintVersion": <schemaVersion>, "data": { ... } }`.
  Values stay nested under `data`, so a property named `id` can't clash with the asset's ID. Numbers are numbers;
  empty optional numbers, choices and links are `null`. "Download all" writes an array of these objects.
  Editor-only metadata (internal `id`, timestamps) is never included.

### 5.5 Dialogue trees (Phase 4)

**Original sketch** (superseded by the implemented format further down):

```json
{
  "startNode": "n1",
  "nodes": [
    { "id": "n1", "type": "line",   "speaker": "old_merchant", "text": "Looking to buy?" },
    { "id": "n2", "type": "choice", "options": [
        { "text": "Yes",  "next": "n3", "condition": null },
        { "text": "No",   "next": "n4" } ] },
    { "id": "n3", "type": "action", "giveItem": "sword_of_fire", "next": "n4" },
    { "id": "n4", "type": "end" }
  ],
  "editor": { "positions": { "n1": {"x":0,"y":0} } }
}
```

- `speaker` → reference to an `entity` document; `giveItem` → reference to an `item` document. **This is the form↔graph bridge.**
- Canvas layout (`editor.positions`) is stored, but **removed on export**.
- Custom (user-defined) graph shapes are **out of scope**. They're a possible future extension.

**Implemented (2026-09-14).** The node editor is **only for dialogue trees**. Dialogues have their own model
(`src/data/dialogueGraph.js`), store and pages (`/dialogues`). Node types: Start, Line, Player choice, Check flag,
Action (give item / set story flag) and End. The downloaded file (`toDialogueExport()`):

```json
{
  "id": "merchant_greeting", "type": "dialogue", "name": "Merchant greeting",
  "speakerBlueprint": "entity", "itemBlueprint": "item",
  "startNode": "line_1",
  "nodes": [
    { "id": "line_1", "type": "line", "speaker": "old_merchant", "text": "Ah, a traveler!", "next": "choice_1" },
    { "id": "choice_1", "type": "choice", "responses": [
        { "id": "response_1", "text": "Show me what you have.", "next": "condition_1" },
        { "id": "response_2", "text": "Not today.", "next": "line_4" } ] },
    { "id": "condition_1", "type": "checkFlag", "flag": "met_merchant", "ifSet": "line_2", "ifNotSet": "action_2" },
    { "id": "action_1", "type": "giveItem", "item": "healing_potion", "quantity": 1, "next": "end_1" },
    { "id": "action_2", "type": "setFlag", "flag": "met_merchant", "value": true, "next": "line_3" },
    { "id": "end_1", "type": "end" }
  ]
}
```
- `speaker` (null means the narrator) and `item` are asset IDs from the dialogue's `speakerBlueprint` and `itemBlueprint`.
- Saved dialogues also keep canvas positions and connections (`nodes[].position`, `edges`). These are never exported.
- Incomplete dialogues can be saved, but can't be downloaded until every check passes.
- In the Phase 2 API, dialogues can still live in the `documents` table under a built-in schema with `kind: "graph"`.

### 5.6 Database tables

```
schemas   (id VARCHAR PK, name, kind ENUM('form','graph'), version INT,
           definition JSON, created_at, updated_at)

documents (id CHAR(36) PK, schema_id FK→schemas.id, doc_key VARCHAR,
           schema_version INT, data JSON, created_at, updated_at,
           UNIQUE(schema_id, doc_key))
```

Storing data as JSON avoids one table per schema and avoids an entity-attribute-value (EAV) design. The
backend validates `data` against the schema's `definition` on every write. **Never trust the frontend alone.**

### 5.7 Unity output layer (Phase 5)

Three pieces, each independently useful and each shippable on its own. Build them in this order so that
cutting the last one still leaves something demoable.

**(a) C# class generation** — pure frontend, no backend, no Unity needed to build it. Every field type gains a
C# mapping in the registry, and a template walks a blueprint:

| GameAtlas type | C# | Notes |
|---|---|---|
| `string` | `string` | |
| `text` | `string` | emit `[TextArea]` |
| `int` | `int` | emit `[Range(min,max)]` when both bounds are set |
| `float` | `float` | same |
| `bool` | `bool` | |
| `enum` | generated `enum` + `string` field | **Gotcha:** `JsonUtility` reads enums as ints, not names. Generate `public string rarity;` plus a typed accessor that parses it, so both the `JsonUtility` and Newtonsoft paths work. |
| `vector2` / `vector3` | `Vector2` / `Vector3` | export shape already matches (§5.3) |
| `reference` | `string` (the asset ID) | optionally a generated lookup helper on the database class |
| `list` | `List<T>` | `JsonUtility` handles `List<T>` **fields** fine (just not at the top level) |
| `object` | nested `[Serializable]` class | named `<Blueprint><Property>`, e.g. `ItemStats` |

The existing export shape `{ id, blueprint, blueprintVersion, data }` maps onto a wrapper class with no
translation, which is a happy accident worth keeping:

```csharp
// Generated by GameAtlas from blueprint "item" (version 3). Do not edit by hand.
using System;
using System.Collections.Generic;
using UnityEngine;

namespace GameAtlas.Data {
    public enum ItemRarity { Common, Rare, Epic }

    [Serializable]
    public class Item {
        public string name;
        [TextArea] public string description;
        public int damage;
        public float weight;
        public bool stackable;
        public string rarity;              // ItemRarity
        public Vector3 gripOffset;
        public string droppedBy;           // entity ID
        public List<string> tags;
        public ItemStats stats;

        public ItemRarity Rarity => Enum.Parse<ItemRarity>(rarity, true);
    }

    [Serializable]
    public class ItemRecord {            // matches one exported asset exactly
        public string id;
        public string blueprint;
        public int blueprintVersion;
        public Item data;
    }
}
```

**(b) ScriptableObject importer** — editor-only C#. Point it at an exported `item.assets.json` and it creates or
updates one `.asset` per record. This is the piece that earns the Unity pivot: hand-authoring ScriptableObjects
is the exact chore the primary users can't do today. Uses Newtonsoft, because `assets.json` is a top-level array.

**(c) Dialogue runtime** — a `DialoguePlayer` that loads an exported dialogue, walks `nodes` from `startNode`,
raises events for lines and choices, and calls back for flag checks and item grants so the game keeps ownership
of its own state. Plus the effect tag renderer (§5.8).

Generation is **client-side**. A `GET /api/schemas/{id}/csharp` endpoint is possible later but buys nothing now,
and generating in the browser keeps the feature working before the backend exists.

### 5.8 Dialogue text effect tags (Phase 5)

Line and response text may carry inline rich-text tags. They stay **inline in the `text` string** rather than
being lifted into separate range data, because a tag's meaning is its position in the sentence — pulling them
out makes the export harder to read, harder to diff, and harder to edit anywhere but GameAtlas.

Two classes of tag:

1. **TMP-native**, passed through untouched: `<b>`, `<i>`, `<color=#RRGGBB>`.
2. **GameAtlas effect tags**, stripped from the string by the runtime before TextMeshPro sees it and turned into
   per-character effects: `<wave>`, `<shake>`, `<speed=0.5>`, `<pause=0.4>`.

```
Ah, a <color=#e5c07b>traveler</color>! <pause=0.4>You look <shake>tired</shake>.
```

Keep the effect set **small and fixed**. A configurable, general-purpose effect system is a trap and is not in
scope. Three things follow from this design:

- **GameAtlas validates the tags.** Unknown tag, unclosed tag, or a bad numeric argument is an inline error on
  that node, handled by the same validation path as every other dialogue problem, and blocks download like any
  other problem does.
- **GameAtlas previews them.** The dialogue editor animates the line as the player will see it. This is pure
  frontend, it demos far better than a JSON blob, and **it ships whether or not the Unity package does.**
- **The grammar is part of the export contract** and gets documented in `docs/export-format.md`, so an engine
  that isn't Unity can still parse it.

---

## 6. REST API contract

Base path `/api`. JSON in and out. In dev, Vite proxies `/api` → `http://localhost:8080`, so CORS isn't needed.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/schemas` | List schemas |
| GET | `/api/schemas/{id}` | Get one schema |
| POST | `/api/schemas` | Create schema (Phase 3; seeded in Phase 2) |
| PUT | `/api/schemas/{id}` | Update schema (bumps `version`) |
| DELETE | `/api/schemas/{id}` | Delete (reject if documents exist, or require confirm) |
| GET | `/api/documents?schemaId=item&q=sword` | List/search documents |
| GET | `/api/documents/{id}` | Get one document |
| POST | `/api/documents` | Create (validated against schema) |
| PUT | `/api/documents/{id}` | Update (validated) |
| DELETE | `/api/documents/{id}` | Delete |
| GET | `/api/documents/{id}/export` | Clean engine-ready JSON (download) |
| GET | `/api/schemas/{id}/export` | All documents of a schema as one JSON file (stretch) |
| POST | `/api/documents/import` | Import an existing JSON file as a document (validated) |

Validation errors return `400` with field-level detail the form can show inline:
```json
{ "errors": [ { "path": "stats.damage", "message": "Must be ≥ 0" } ] }
```

**C# generation is deliberately not an endpoint.** It runs in the browser from data the frontend already has
(§5.7), so it works before the backend exists and keeps working offline. `GET /api/schemas/{id}/csharp` is an
easy addition later if a build pipeline ever needs to fetch generated source directly.

---

## 7. Phased roadmap

Dates assume the 12/1 deadline and are targets. Each phase ends with a **demoable, end-to-end** result.

> **Order change (2026-09-14):** the blueprint builder (Phase 3's main deliverable) was built first. It needed the
> generic form renderer, field-type registry and validation for its live preview, so those Phase 1 items are done
> too. Blueprints are saved in the browser (localStorage) until Phase 2 adds the API.

> **Re-dated 2026-09-17.** The frontend ran well ahead of schedule: Phases 1, 3 and 4 are done apart from the
> items that are really "swap localStorage for the API", which now fold into Phase 2. That freed the calendar for
> the Unity work, which becomes **Phase 5 (Ga.5)**; hardening and deployment move to **Phase 6**. Ga.1–Ga.4 keep
> their Project Brief numbering, so the course deliverables still line up.

### Phase 0: Setup (Week of 9/14)
- [x] `git init` (branch `main`)
- [ ] First commit; push to a private GitHub repo (no commits or remote yet as of 2026-09-14)
- [ ] Move the Vite app into `frontend/`; confirm `npm run dev` still works
- [x] Remove Vite template content (hero image, counter, logos, demo CSS, public icons)
- [x] Add `CLAUDE.md` and `docs/PLAN.md`
- [x] Design system: `docs/STYLE-GUIDELINES.md`, design tokens, shared components, `AppShell`, and the style showcase page
- [ ] Short React warm-up: components, props, state, lists and keys, controlled inputs (react.dev "Learn" tutorial)

### Phase 1: Web-form document editor, frontend only (9/14 → 10/4) · Deliverable **Ga.1**
Goal: a form that creates **and reads back** correctly formatted JSON, with no backend.
- [x] Example schemas: starter `Item` and `Entity` blueprints (`src/schema/starterBlueprints.js`) that use every field type
- [x] Field-type registry: `src/schema/fieldTypes.js` (labels, defaults, settings) + `FieldInput` (the input for each type)
- [x] `FormRenderer({ fields, values, onChange, errors })`, fully generic (already used by the builder's live preview)
- [x] Client-side validation (`src/schema/validation.js`) with inline error messages
- [x] **Export:** download one asset file from the editor, or "Download all" for a blueprint from the asset browser
- [x] **Import:** load a `.json` asset file → check it belongs to this blueprint → fill the form (errors for bad files)
- [x] Read-only JSON preview of the export shape, next to a clickable validation summary
- [x] Asset editor page inside `AppShell` with the three-pane layout (`/blueprints/:id/assets/:key/edit`, STYLE-GUIDELINES §7.12)
- [x] Read-only asset view with a per-asset **Export asset** button, "Linked from" list and file preview (`/blueprints/:id/assets/:key`)
- [ ] Vitest tests for validation and import/export round-trip
- **Done when:** a non-programmer can fill in the form, download JSON, re-upload it, and get the same form back. Invalid input can't be exported.

### Phase 2: Database + REST integration (9/18 → 10/18) · Deliverable **Ga.2**
Goal: documents are saved on a server and can be browsed and reopened.
> This phase now also absorbs the "save through the API" checkboxes left open in Phases 3 and 4.
- [ ] Generate Spring Boot project in `backend/` (Web, Data JPA, Validation, MySQL driver, Flyway)
- [ ] Local MySQL (Docker Compose or native); Flyway migration for `schemas` and `documents`
- [ ] Seed the Phase 1 schema(s) into `schemas` (e.g. `Item`, `Entity`)
- [ ] Document CRUD endpoints + server-side validation against the schema definition (Java port of the field registry)
- [ ] Export endpoint (clean JSON)
- [x] Frontend pages for **Document list → Document editor** (`/blueprints/:id/assets` and `/blueprints/:id/assets/:key`)
- [ ] Frontend `api/` module; loading and error states; save/delete with confirmation; swap `blueprintStore`'s localStorage calls for API calls
- [ ] `reference` field type (dropdown populated from `/api/documents?schemaId=…`). ✔ Already works against locally stored assets, including "That asset no longer exists" checks and link updates when an asset's ID changes; switch the source to the API
- [ ] Write `docs/export-format.md`
- [ ] Backend tests: validation service unit tests + controller tests
- **Done when:** a document created in the browser survives a page reload and server restart, can be browsed, edited, exported, and can reference another document.

### Phase 3: Schema (form) builder (done early; API wiring in Phase 2) · Deliverable **Ga.3**
Goal: users create their own schemas, and the resulting forms behave exactly like the built-in ones.
- [x] Schema builder page (`/blueprints/new`, `/blueprints/:id`): name the schema, add/remove/reorder/duplicate fields, choose type, label, required, help text, and type-specific settings (min/max, max length, defaults, enum options, link target, list item type)
- [x] **Live preview** on the side, rendered by the same `FormRenderer`, plus a blueprint file tab
- [x] Import and download blueprint files
- [ ] Save via `POST/PUT /api/schemas` (for now `blueprintStore` saves to localStorage; `version` already increments on change)
- [x] `list` and `object` field types (hierarchical data)
- [ ] Decide and implement a policy for editing a schema that already has documents (simplest: allow adding optional fields; warn on breaking changes; show "outdated" badge on documents). ✔ So far: assets saved with an older blueprint version show an "Outdated" badge and an editor notice; saving drops values of removed properties. Warnings on breaking changes are not built
- [ ] Starter templates: Item and Entity (✔ done), Quest
- [x] ID validation: blueprint IDs are `snake_case` and unique; property IDs start with a letter and are unique at their level
- **Done when:** a user builds a new schema from scratch, creates documents with it, and exports them, all without touching code.

### Phase 4: Graph editor (done early; API wiring in Phase 2) · Deliverable **Ga.4**
Goal: branching dialogue data in the same app, using the same storage and export path.
- [x] Add `@xyflow/react` (v12); dialogues are their own section (`/dialogues`), not a user-built blueprint
- [x] Custom nodes: Start, Line, Player choice, Check flag, Action (give item / set story flag), End, edited inline with the shared input components
- [x] Convert canvas `nodes/edges` ↔ stored graph and the export file (pure functions in `src/data/dialogueGraph.js`; tests still to write)
- [x] Speakers and given items link to assets of blueprints chosen per dialogue (**form↔graph bridge**); renaming an asset updates dialogues too
- [x] Graph validation: Start connected, every output connected, nodes reachable from Start, text/flags/items filled in, links resolve, at least one End
- [ ] Save/load through the API (for now `dialogueStore` uses localStorage; ✔ downloads already strip canvas positions)
- [x] Dialogues have their own browser (`/dialogues`) instead of appearing in the asset browser
- [x] Import dialogue files (laid out automatically in columns from Start) and "Download all" (`dialogues.json`)
- **Done when:** a writer builds a branching conversation whose speaker is an Entity document, saves it, reopens it with the layout intact, and exports clean JSON.

### Phase 5: Unity integration (10/19 → 11/15) · Deliverable **Ga.5**
Goal: data authored in GameAtlas reaches a running Unity game without anyone hand-writing a data class.

> **Not in Project Brief v0.3.** This phase comes from the 2026-09-17 decision to target Unity explicitly.
> It is ordered by risk: (a) is pure frontend, (b) needs Unity but is editor-only, (c) is the largest and is
> the first thing to cut. Each sub-goal is demoable on its own.

**(a) C# generation — frontend only, no Unity required**
- [ ] Add C# mapping to the field-type registry (`csharpType`, attribute hints, enum handling — §5.7)
- [ ] `src/unity/` generator: pure functions, blueprint → `.cs` source string (nested classes for `object`, `List<T>` for `list`, generated `enum` types)
- [ ] "Generate C#" on the blueprint page: preview tab next to the blueprint file tab, and download `.cs`
- [ ] "Download all scripts" across blueprints, plus the generated dialogue model classes
- [ ] Tests: generated source is stable for the starter blueprints (snapshot); round-trip a record through the documented shape

**(b) Unity package + ScriptableObject importer**
- [ ] UPM package skeleton `unity/com.gameatlas.core` (Runtime + Editor assembly definitions, Newtonsoft dependency)
- [ ] Editor importer: exported `assets.json` → one ScriptableObject `.asset` per record, updating existing assets by ID rather than duplicating them
- [ ] Reference fields resolve to the referenced asset where possible, and report unresolved IDs instead of failing silently
- [ ] `docs/unity-integration.md`: install by Git URL, generate, import, use

**(c) Dialogue runtime and effect tags**
- [ ] Effect tag syntax, validation and inline errors in the dialogue editor (§5.8) — **frontend only; ships regardless of the rest of this phase**
- [ ] Animated live preview of a line in the editor
- [ ] `DialoguePlayer`: walk nodes from `startNode`, events for lines/choices, callbacks for flag checks and item grants
- [ ] TMP effect renderer: parse and strip GameAtlas tags, map to character indices after `ForceMeshUpdate`, animate vertices for `wave`/`shake`; honor `speed` and `pause` in the typewriter
- [ ] Sample scene in the package showing a full conversation

- **Done when:** a user builds a blueprint in the browser, fills in assets and a dialogue, downloads the JSON and
  the generated C#, drops both into a fresh Unity project with the package installed, and plays the conversation —
  writing no data classes and no parsing code.

### Phase 6: Hardening, usability testing, deployment (11/16 → 12/1)
> Thanksgiving is 11/26. Treat this week as reduced capacity.
- [ ] Usability sessions with testing users (see §8) — recruit **Unity developers and the writers/artists who work with them**
- [ ] Fix the top issues found; minimum-viable visual polish
- [ ] Deploy (frontend static host + backend + managed MySQL); environment config via env vars
- [ ] Optional: simple auth, so schemas are tied to an account/team
- [ ] Final README, demo script, capstone documentation updates

### Stretch / future (explicitly out of scope unless ahead of schedule)
XML export · JSON Schema generation · bulk export per schema/project · projects/workspaces · auth and teams ·
real-time collaboration · user-defined graph shapes · dialogue "playthrough" preview (like Yarn Spinner) ·
**Godot / Unreal output layers** · an in-Unity browser window (UIToolkit) that pulls from the API directly ·
publishing the package to the Asset Store or OpenUPM · pre-parsed effect ranges in the export ·
Electron desktop build · undo/redo · document version history.

---

## 8. Testing & success criteria

**Functional (per deliverable):** each phase's "Done when" above.

**Correctness (engine devs):**
- Exported JSON parses and matches `docs/export-format.md`
- Server rejects invalid documents even if the frontend is bypassed
- Import → export round-trips without data loss

**Unity integration (Phase 5):**
- Generated C# **compiles in a fresh Unity 6 project with zero errors and zero warnings** for every starter blueprint
- Exported JSON → importer → ScriptableObjects → read back in play mode gives the same values that were typed into the form (the round-trip test that matters most)
- A dialogue with every node type plays to an End node without exceptions
- Every effect tag GameAtlas accepts renders; every tag it rejects would have broken the runtime

**Usability (writers/designers, testing users).** Brief metrics: *usage speed* and *perceived reliability*.
- Timed tasks, e.g. "Create 5 Item documents" in GameAtlas vs. hand-editing JSON in a text editor; "Build a 6-node dialogue with 2 choices"
- Count of errors or invalid files produced (target: 0 invalid exports)
- Short post-test survey: System Usability Scale (SUS) + "How confident are you the file is correct?" (1–5)
- **Primary success bar:** a participant with no programming experience completes core tasks without help.
- **Unity-specific comparison:** time to get 5 items into a Unity project via GameAtlas vs. authoring ScriptableObjects by hand in the Inspector. This is the headline number for the capstone writeup, and it is the comparison the Unity pivot exists to make.

---

## 9. Suggested weekly rhythm (~5 hrs)
- ~1 hr: learning (React docs, React Flow examples; from Phase 5, Unity scripting and TextMeshPro) *targeted at this week's task*
- ~3 hrs: build one vertical slice
- ~1 hr: tests, commit, update checklist in this file, note any decisions in the log

Use AI assistants for boilerplate (Spring entities/controllers, field components, Flyway SQL) and for explaining
React concepts. Keep architectural decisions in this document.

---

## 10. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| React/React Flow learning curve | Slips Phase 1 and Phase 4 | Learn just-in-time per task; keep components simple; lean on React Flow examples |
| ~5 hrs/week vs. 4 deliverables in 11 weeks | Most likely cause of missed deadline | Schema-driven renderer from day one (makes Phase 3 cheap); cut stretch items first; if needed, drop `list`/`object` types or graph validation depth before dropping a deliverable |
| Duplicated validation logic in JS and Java drifts | Frontend accepts what backend rejects | Shared test fixtures (same valid/invalid JSON cases run in both test suites); backend is authoritative |
| Schema changes break existing documents | Data loss/confusion | `schemaVersion` on documents; additive-only changes in MVP; warn on breaking edits |
| Hosting cost/knowledge unknown | Deployment delays | Pick hosting by end of Phase 3; do a throwaway deploy of a "hello" backend early |
| MySQL-specific unfamiliarity | Minor | JSON column + JPA keeps SQL surface small; Postgres is a viable swap |
| Tooling: installed Node (20.15) is below Vite 8's minimum | Build warnings; npm skips Vite's native Windows package | Install Node 22/24 LTS, then delete `node_modules` and run `npm install` |
| Glass/glow styling hurts readability as colors get tuned | Accessibility regressions | Re-check WCAG AA whenever glass or glow tokens change (STYLE-GUIDELINES §5.6) |
| Phase 5 adds a **third codebase in a third language** (C#/Unity) with its own toolchain | Phase 5 slips and takes Phase 6 with it | Phase 5 is layered by risk: (a) generation is frontend-only, (b) the importer is editor-only, (c) the runtime is last and is the designated cut. Any one of them alone is a demo. |
| TMP character-index mapping for effect tags | Effects render on the wrong characters or throw | Small fixed effect set; strip GameAtlas tags *before* TMP, map indices *after* `ForceMeshUpdate`; if it fights back, ship color/bold only and document the rest as future work |
| Unity version churn | Package breaks on a version bump | Target one LTS (Unity 6), state it in the package README, don't upgrade mid-project |
| Targeting Unity narrows the market claim in the capstone writeup | Weaker "general tool" framing | Frame it as the honest trade it is: the core is engine-neutral (§2.5) and Unity is the first supported target, chosen because it makes the last mile real. Depth beats breadth in a capstone. |
| Unity work crowds out tests, which still don't exist | Ga.1–Ga.4 regress silently while attention is on C# | Write the Vitest suite during Phase 2, before Phase 5 starts — not after |

---

## 11. Decision log

Add new entries at the bottom. Format: `date · decision · why`.

- 2026-09-14 · Phase order follows Project Brief v0.3 (frontend form first, then backend), not the earlier Lit Review order (backend first) · Brief is the more recent document.
- 2026-09-14 · Phase 1 form is rendered from a schema definition object, not hand-coded · Makes Phase 3 builder mostly a UI over existing machinery.
- 2026-09-14 · Store schema definitions and document data in JSON columns · One generic table pair supports arbitrary user schemas.
- 2026-09-14 · Custom internal schema format (not raw JSON Schema) · Simpler for the builder; JSON Schema export can come later.
- 2026-09-14 · Documents referenced by human-readable `key`, unique per schema · Readable in exported JSON and engine code.
- 2026-09-14 · Phase 4 supports one fixed dialogue graph shape · Matches Brief scope; custom graph schemas deferred.
- 2026-09-14 · Frontend stays JavaScript (not TypeScript) for now · Existing scaffold; reduces learning load. Revisit if schema typing bugs pile up.
- 2026-09-14 · Visual design system defined in `docs/STYLE-GUIDELINES.md`: dark-only, JetBrains-style panels, glass floating layers, accent `#335284`, plain CSS + CSS Modules + tokens, Lucide icons · Derived from the style questionnaire.
- 2026-09-14 · User-facing terms: Blueprint (schema), Asset (document), Property (field), ID (key); code/API names unchanged · Friendlier for non-technical users without renaming internals.
- 2026-09-14 · Panels use translucent glass over subtle background glows; `--color-text-subtle` lightened to #969696 to keep AA contrast · User request after reviewing the style showcase.
- 2026-09-14 · App layout is a reusable `AppShell`: top bar + sidebar form one frame, and pages live in a rounded, independently scrolling glass content zone · User request; every page shares one layout.
- 2026-09-14 · Breadcrumbs moved to a bottom status bar in `AppShell`; frame gets 8px top / 12px right padding · User request (IDE-style status bar).
- 2026-09-14 · Blueprint builder built before the Phase 1 asset form, together with `FormRenderer`, the field-type registry and validation · User wanted the schema builder first; its live preview needs the renderer anyway.
- 2026-09-14 · Blueprints persist in localStorage behind `src/schema/blueprintStore.js` (read with `useBlueprints()`) until the Phase 2 API · No backend yet; pages won't change when the store switches to API calls.
- 2026-09-14 · `react-router` added now (routes `/blueprints`, `/blueprints/new`, `/blueprints/:id`, `/dev/styles`) · More than one page exists; the data router enables the unsaved-changes guard.
- 2026-09-14 · Asset browser (`/blueprints/:id/assets`) and asset editor (`/blueprints/:id/assets/:key`) built, with assets in localStorage behind `src/data/assetStore.js` · Completes the Phase 1 form deliverable (Ga.1) on top of the blueprint builder.
- 2026-09-14 · Export shape is `{ id, blueprint, blueprintVersion, data }` with values nested under `data` · Avoids clashes between property keys and the asset's own ID; engines can check the blueprint version.
- 2026-09-14 · Changing an asset's ID updates links to it in other assets; changing a blueprint's ID moves its assets; deleting a blueprint deletes its assets · Keeps references and ownership consistent without manual fixes.
- 2026-09-14 · Frontend code uses the UI names (`blueprintStore`, `AssetEditorPage`); saved/exported data keys (`schemaId`, `schemaVersion`, `fields`, `key`) and future API/DB names stay schema/document/field/key · Matches what the code already does; keeps the data contract stable.
- 2026-09-14 · The graph editor is strictly a **dialogue tree** editor with its own model, store and pages (`/dialogues`) · User decision; dialogue-specific wording and node types instead of a generic graph schema.
- 2026-09-14 · Dialogue node types: Start, Line, Player choice, Check flag, Action (give item / set story flag), End; each output has at most one connection · Covers branching, story flags and rewards while staying simple for writers.
- 2026-09-14 · Dialogues can be saved with problems, but not downloaded · Large trees take several sessions to write; the engine only ever receives valid files.
- 2026-09-14 · An asset's main address (`/blueprints/:id/assets/:key`) is now a read-only view with an Export button; editing moved to `…/:key/edit`, and the asset browser opens the view · User request; most visits are to look something up, and viewing can't accidentally change data.
- 2026-09-17 · `/` is a home dashboard (section cards with counts, recently updated, quick create, needs attention) inside `AppShell`; a future login page will be a separate full-screen page with its own look · User request; gives every section an entry point and surfaces what can't be exported yet.
- 2026-09-17 · Dialogue files can be imported (auto-laid-out, since downloads have no positions) and downloaded all at once; "Download all" for assets and dialogues is blocked while any item has problems · User request; completes the brief's "retrieval should function identically" for the graph editor, and keeps engine files valid.
- 2026-09-17 · Duplicate (assets, blueprints, dialogues) opens the relevant `/new` editor pre-filled via navigation state `{ imported, origin: 'duplicate', originName }`; nothing is saved until Save. Copies get " (copy)" names and unique IDs that follow the name; duplicating a blueprint doesn't copy its assets · User request; faster data entry without surprise saves.
- 2026-09-17 · Added an "All assets" page (`/assets`) alongside All dialogues and All blueprints; assets are still created from a blueprint's own browser · User request; gives the sidebar's Assets section a matching overview.
- 2026-09-17 · **GameAtlas targets Unity explicitly.** The pitch, competitor framing, success metrics and deliverables change from "any engine" to "Unity-first" · User decision. Naming an engine is what makes the last mile possible — C# generation, ScriptableObject import and a dialogue runtime — turning a JSON editor into a pipeline. It also sharpens the lit-review gap analysis (the real incumbent is Unity's own Inspector) and gives Phase 6 usability testing a population that can actually be recruited.
- 2026-09-17 · The stored and exported JSON stays **engine-neutral**; Unity support is an output layer (§5.7) · Narrow the positioning and the outputs, not the data model. Keeps `toExport()` and the export contract unchanged, leaves Godot/Unreal as sibling work, and means a slipped Unity package still leaves a complete app.
- 2026-09-17 · Vector export shape stays `{x,y,z}` · Resolves the open question in §5.3: it is exactly how Unity's `JsonUtility` serializes `Vector2`/`Vector3`, so generated fields need no converter.
- 2026-09-17 · C# generation runs **client-side**, not as an API endpoint · Works before the backend exists and offline; the field-type registry already holds everything it needs.
- 2026-09-17 · Dialogue text carries **inline** rich-text tags: TMP-native ones pass through, GameAtlas effect tags (`<wave>`, `<shake>`, `<speed=…>`, `<pause=…>`) are stripped and applied by the runtime · A tag's meaning is its position in the sentence, so lifting them into separate range data would hurt readability and diffing. GameAtlas validates them and previews them live; the grammar goes in `docs/export-format.md`. The effect set stays small and fixed.
- 2026-09-17 · New **Phase 5 "Unity integration" (Ga.5)**; hardening/testing/deployment becomes Phase 6 · Ga.1–Ga.4 keep their Project Brief numbering. Phase 5 is ordered by risk so its last part (the TMP effect renderer) is the designated cut.
- 2026-09-23 · **Deleted the showcase's static graph mock** (`GraphSection`, 534 lines) · It was written before Phase 4 as a preview of the node editor ("the real one will use React Flow"); the real editor now exists at `/dialogues` and owns the node styling, so the mock only risked drifting from it. Also removed the unused `nodeOutputs()` helper (dialogue validation writes its own per-output messages) and the unused `--frame-gap` token, and un-exported seven helpers that were only used inside their own module.
- 2026-09-23 · **Page layout classes moved into `base.css` too** (`.panes`, `.stack`, `.subhead`, `.divider`, `.empty-box`, `.canvas`, `.toolbar-filter`), so the three editors' identical pane grids are written once; a page sets only its column widths, inline as `--panes`. Four page stylesheets deleted; the five that remain are genuinely page-specific (dashboard, settings, asset view, property tree, graph canvas/nodes) plus the dev-only showcase · User request to reduce the number of CSS files.
- 2026-09-23 · **Pages compose shared page-level components** instead of repeating chrome: `ListPage` (the four list pages), `MissingRecord` (six not-found blocks, including the 404 route), `TopBarActions` (three near-identical files), `Notice`/`ImportNotice`, `useUnsavedChanges` + `UnsavedChangesDialog` (three identical guards) and `downloadCollection` (three copies of the same guard). The shared page-shell CSS moved to `base.css` · User request to simplify. Also normalized `parseBlueprintFile` to return `{ imported }` like the asset and dialogue parsers, so no adapter is needed.
- 2026-09-17 · **Shared components have no CSS Modules**; all component styling moved into global classes in `src/styles/base.css`, with shared shapes (flex rows, columns, gaps, text roles) written once as grouped selectors · User request to cut duplication. 25 stylesheets became 1, and a look is now defined once and reused by name; pages keep scoped modules for layout. Deliberate trade: slightly less per-component variation, and no scoping, so class names carry a `.thing-part` / `.is-state` convention instead.
- 2026-09-17 · **Pages are flat.** The `Panel` glass card is replaced by a `Section` with no fill, border or radius; stacked sections are separated by the rule under their title, side-by-side panes by a vertical rule in the gutter (STYLE-GUIDELINES §6.1) · User request to simplify. Only two exceptions survive: the dashboard's three entry cards, and the graph canvas's hairline (its dot grid needs an edge). Nested cards inside a glass content zone were doing the same job twice.
- 2026-09-17 · Settings page (`/settings`) with backup (one file of all stored data, format `{ app, type: "backup", formatVersion, createdAt, blueprints, assets, dialogues }`), restore (replace-all after confirmation), reset to examples and delete all · User request; data only lives in localStorage until Phase 2, so backups are the safety net.

---

## 12. Source documents
- *Project Brief* v0.3 (IST 440W): scope, phases, deliverables Ga.1–Ga.4, constraints, cost
- *Project Specs*: stakeholder analysis, market analysis, constraints, assumptions
- *Literature Review*: problem statement, competitor analysis (Charon, Drafft, Yarn Spinner), approach

> **All three predate the Unity decision of 2026-09-17** and describe an engine-agnostic tool. This plan is the
> current source of truth. When the capstone documents are revised, the parts that need rewriting are the problem
> statement and target user (now Unity teams), the competitor analysis (add Unity's own ScriptableObject/Inspector
> workflow as the incumbent), the success metrics (§8 now includes the Unity round-trip and the hand-authoring
> time comparison), and the deliverable list (Ga.5 is new).
