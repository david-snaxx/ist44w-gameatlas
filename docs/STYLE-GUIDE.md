# GameAtlas: Style Direction Questionnaire

> **How to fill this in**
> - Tick options with `[x]`, or write free text after **Answer:**.
> - **Leave anything blank** if you don't care. The AI uses the *Default* listed for that question.
> - "Why it matters" notes explain what each answer changes, so you can skip the ones that don't matter to you.
> - Nothing here is permanent. Colors, fonts and spacing will live in one theme file (CSS variables), so changing them later is cheap.
> - The most important sections are **1, 2, 3, 5 and 13**. If you only have 10 minutes, do those.

**Context reminder:** GameAtlas is a *data-entry tool* used for long sessions by writers, designers and artists
with no programming background. It has forms, lists of documents, a schema builder, and a node-graph editor.

---

## 1. Personality & vibe

**1.1 Pick 3–5 adjectives for how the app should feel.**
- [x] Calm
- [ ] Minimal
- [x] Friendly
- [ ] Playful
- [x] Professional
- [ ] Technical
- [ ] Cozy
- [ ] Bold
- [ ] Sleek
- [x] Retro / pixel
- [ ] Fantasy / game-flavored
- [ ] Editorial
- Other: 

*Default:* Calm, minimal, friendly, professional.

**1.2 Where on this spectrum?**
- [ ] **Neutral productivity tool** (like Linear, Notion, Airtable). The UI stays out of the way.
- [ ] **Creative tool** (like Figma, Miro, Framer). Neutral, with more color and personality.
- [x] **Game-dev flavored** (like the Godot/Unity editors, itch.io). Darker, denser, a bit gamey.
- [ ] **Themed / stylized** (fantasy parchment, sci-fi HUD, pixel art). Strong visual identity.

*Default:* Creative tool.

**1.3 Apps or websites whose look you like** (links or names, plus what you like about each):
Answer:
- Jetbrains IDEs (Intellij, Rider, etc.): I like the shell/frame and the flexible rounded panels for each functional window component
- Apple operating systems: I like the usage of transparency and the associated glassy/blur effects.

**1.4 Apps or styles you *don't* want it to look like:**
Answer:
- Amazon.com: User interface feels too cluttered
- www.coolmathgames.com/: User interface feels just a little too modern
---

## 2. Theme (light / dark)

**2.1 Which themes?**
- [ ] Light only  
- [x] Dark only  
- [ ] Both, following the OS setting  
- [ ] Both, with a toggle in the app

**2.2 If both, which is the default / designed first?**
- [ ] Light  
- [x] Dark

*Default:* Both, following the OS setting, designed dark-first. Game devs skew dark, and the graph canvas looks better dark.

---

## 3. Color

**3.1 Primary brand/accent color** (buttons, links, selection, focus rings). A hex code, a color name, or "pick for me":
Answer: #335284

*Why it matters:* this color appears on every page. Everything else is mostly neutral grey.

**3.2 How much color overall?**
- [ ] Almost monochrome. Accent only on primary buttons and focus.
- [x] Moderate. Accent plus soft tinted backgrounds for selected and active states.
- [ ] Colorful. Multiple accent colors, colored section headers, and so on.

*Default:* Moderate.

**3.3 Neutral greys should be:**
- [ ] Cool (blue-ish) 
- [x] Pure grey  
- [ ] Warm (beige/brown-ish)

*Default:* Cool.

**3.4 Color-code things by category?** (tick any)
- [ ] Each **schema** gets a color (e.g. Items = gold, Entities = green)
- [ ] Each **graph node type** gets a color (line, choice, action, end)
- [ ] Each **field type** gets a small colored badge in the schema builder
- [x] No color coding. Keep it neutral initially.

*Default:* Node types and schemas yes, field types no.

**3.5 Status colors** (leave blank for standard green/amber/red/blue):
- Success: #1f525d
- Warning: #fec67b
- Error: #9e3234
- Info: #527592

---

## 4. Typography

**4.1 Main UI font**
- [x] System font (fastest, native look)
- [ ] Inter (clean, very common in modern tools)
- [ ] Geist / IBM Plex Sans / Nunito / other: 

*Default:* Inter, with system fonts as fallback.

**4.2 Headings**
- [x] Same font as the UI
- [ ] Different, more characterful font (name one or say "pick for me"): 

**4.3 Monospace font** (document keys like `sword_of_fire`, the JSON preview)
- [ ] System monospace  
- [x] JetBrains Mono  
- [ ] Other: 

*Default:* JetBrains Mono.

**4.4 Base text size**
- [ ] Small (13px, dense, tool-like)  
- [x] Medium (14–15px) 
- [ ] Large (16px+, very readable)

*Default:* 14px.

---

## 5. Layout & navigation

**5.1 Main navigation**
- [ ] **Left sidebar** listing schemas, documents and graphs (like Notion or VS Code)
- [ ] **Top bar** with the main sections
- [x] **Both.** Top bar for app-level items, sidebar for the schema/document tree.

*Default:* Left sidebar, collapsible.

**5.2 Document editor layout**
- [ ] Single centered column (the form only)
- [ ] Form + right-hand panel (JSON preview, validation summary, references)
- [x] Three-pane: document list | form | preview

*Default:* Form + collapsible right-hand panel.

**5.3 Content width on big screens**
- [ ] Narrow and centered (~720px)  
- [ ] Medium (~1100px)  
- [x] Full width

*Default:* Forms narrow; lists and graph full width.

**5.4 Target screens**
- [x] Desktop only (min ~1024px)  
- [ ] Desktop + tablet  
- [ ] Must also work on phones

*Default:* Desktop only, degrading gracefully on smaller screens.

**5.5 Show breadcrumbs** (e.g. `Items › Sword of Fire`)?
- [x] Yes  
- [ ] No

---

## 6. Density & spacing

**6.1 How tightly packed?**
- [ ] **Compact.** More fields on screen, like a pro editor.
- [x] **Comfortable.** A balance.
- [ ] **Spacious.** Airy and friendly, but more scrolling.

*Default:* Comfortable.

---

## 7. Shape & depth

**7.1 Corner roundness**
- [ ] Sharp (0–2px)  
- [x] Subtle (4–6px)  
- [ ] Rounded (8–12px)  
- [ ] Pill / very round (16px+)

*Default:* Subtle (6px).

**7.2 How are surfaces separated?**
- [ ] Thin borders  
- [ ] Soft shadows  
- [ ] Background shade differences only  
- [x] Mix

*Default:* Borders and background shades, with shadows only for popovers and modals.

---

## 8. Components

**8.1 Form field labels**
- [ ] Above the input  
- [x] Left of the input (two columns)  
- [ ] Floating label inside the input

*Default:* Above.

**8.2 Input style**
- [ ] Outlined box  
- [x] Filled (shaded background)  
- [ ] Underline only

*Default:* Outlined.

**8.3 Required fields are marked with**
- [x] Red asterisk `*`  
- [ ] "(required)" text  
- [ ] Mark *optional* fields instead

**8.4 Validation errors appear**
- [x] Inline under the field, as you type
- [ ] Inline, but only after leaving the field or pressing Save
- [x] Plus a summary list at the top or in the side panel

*Default:* Inline after leaving the field, plus a summary in the side panel.

**8.5 Booleans use**  
- [x] Toggle switches  
- [ ] Checkboxes

**8.6 Vector2/Vector3 inputs**
- [x] Side by side with small X / Y / Z labels (like Unity's inspector)
- [ ] Stacked vertically

*Default:* Side by side, with colored X/Y/Z labels (red/green/blue, like game engines).

**8.7 Document lists appear as**
- [x] Table rows (sortable columns)  
- [ ] Cards / grid  
- [ ] Simple list  
- [ ] Switchable

*Default:* Table.

**8.8 Creating or editing something small (e.g. a new field in the builder) happens in**
- [ ] A modal dialog  
- [x] A slide-out side panel  
- [ ] Inline, in place

*Default:* Inline or side panel. Avoid modals except for confirmations.

**8.9 Button styles.** How many visual levels?
- [ ] Two (primary + secondary)
- [x] Three (primary + secondary + ghost/text)
- [x] Plus a distinct red "danger" style for delete

*Default:* Three, plus danger.

**8.10 Feedback after actions** (saved, deleted, and so on)
- [x] Toast pop-ups in a corner  
- [ ] Inline status text ("Saved ✓")  
- [ ] Both

---

## 9. Icons & imagery

**9.1 Icons**
- [x] Lucide (clean outline, very common)  
- [ ] Heroicons  
- [ ] Phosphor  
- [ ] Minimal, mostly text  
- [ ] Other: 

*Default:* Lucide.

**9.2 Empty states** (e.g. "No documents yet")
- [x] Plain text + button  
- [ ] Small illustration or icon + text + button

**9.3 Logo / wordmark.** Do you have one, or should the name be styled as text?
Answer: Just use styled text for now and a proper logo will be created later.

---

## 10. Motion

**10.1 Animations**
- [ ] None  
- [x] Subtle (hover fades, panels sliding ~150ms)  
- [ ] Expressive

*Default:* Subtle, and animations turn off when the OS "reduce motion" setting is on.

---

## 11. Graph editor (Phase 4, can be filled in later)

**11.1 Canvas background**  
- [x] Dots  
- [ ] Grid lines  
- [ ] Plain

**11.2 Node look**
- [x] Card with a colored header strip for the node type
- [ ] Fully colored node
- [ ] Neutral card with a small colored icon/badge

**11.3 Edges (connections)**  
- [x] Smooth curves  
- [ ] Right-angle steps  
- [ ] Straight lines
- Animated flow on edges?  - [x] Yes, togglable  - [ ] No

**11.4 Editing a node's details happens**
- [x] Directly inside the node  
- [ ] In a side panel when the node is selected  
- [ ] Both (short text in node, full details in panel)

**11.5 Show a minimap?**  
- [x] Yes  
- [ ] No

*Defaults:* dots, card with colored header strip, smooth curves, not animated, both, minimap yes.

---

## 12. JSON preview

**12.1 Style**
- [x] Syntax-highlighted code block  
- [ ] Plain monospace text  
- [x] Collapsible tree view

**12.2 Visibility**
- [ ] Always visible  
- [x] Hidden behind a "Show JSON" toggle  
- [ ] Separate tab

*Default:* Highlighted code, hidden behind a toggle (users are non-technical).

---

## 13. Wording & tone

*Why it matters:* the wrong word ("schema", "instance") can confuse a writer faster than bad visuals.

**13.1 What should users see these concepts called?**
| Internal term | Pick or write your own |
|---|---|
| Schema | [ ] Schema  [ ] Template  [ ] Type  [x] Blueprint  [ ] Other: |
| Document | [ ] Document  [ ] Entry  [ ] Record  [x] Asset  [ ] Other: |
| Field | [ ] Field  [x] Property  [ ] Attribute  [ ] Other: |
| Key (e.g. `sword_of_fire`) | [ ] Key  [x] ID  [ ] Identifier  [ ] Other: |
| Graph | [x] Graph  [ ] Dialogue  [ ] Flow  [ ] Other: |

**13.2 Voice**
- [x] Neutral and concise ("Document saved")
- [ ] Friendly ("Nice! Your item is saved.")
- [ ] Slightly playful / game-themed

*Default:* Neutral and concise, with friendly error messages that say how to fix the problem.

---

## 14. Accessibility

**14.1 Contrast target**  
- [x] WCAG AA (standard)  
- [ ] WCAG AAA (stricter, fewer color options)  
- [ ] Don't care

**14.2 Keyboard shortcuts** (e.g. Ctrl+S to save)?  
- [ ] Yes, key ones  
- [x] Not needed

*Default:* AA, with key shortcuts.

---

## 15. Technical styling approach

*Why it matters:* this decides how styles are written, not how things look. Pick what you'd enjoy maintaining.

- [x] **Plain CSS + CSS variables (+ CSS Modules per component).** No new dependencies; closest to the HTML/CSS you already know. *(AI recommendation)*
- [ ] **Tailwind CSS.** Utility classes in JSX; fast to build, but markup gets busy.
- [ ] **Component library** (e.g. Mantine or Chakra). Ready-made inputs, modals and tables. Fastest, but looks more generic and takes more effort to restyle.
- [ ] No preference, pick for me.

---

## 16. Pages to generate first

Tick what you want built (in rough priority):
- [ ] App shell (sidebar/top bar + page area + theme)
- [ ] Home / dashboard (list of schemas, recent documents)
- [ ] Document editor, the Phase 1 form (all field types, import/export JSON)
- [ ] Document list for a schema
- [ ] Schema builder (Phase 3)
- [ ] Graph editor shell (Phase 4)
- [ ] Style/component showcase page (every button, input and color in one place, useful for tuning the look)

Anything else:
Answer:

---

## 17. Anything else

Screenshots, mood board links, colors from your game, pet peeves, "must have" details:
Answer:
