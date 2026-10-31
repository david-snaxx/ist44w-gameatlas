# Attack test scripts

Security "try to break it" scripts for GameAtlas (Phase 6). Each script runs one attack against a
**running** backend and follows the project's rule:

> **The test FAILS when the attack succeeds, and PASSES when the attack is blocked.**

So a failing assertion is a finding, not a bug in the test. Each script's header comment says exactly
what "PASS" means for that attack.

Inside a script, each case is its own **subtest** (`t.test(...)`), so one failing case doesn't stop the
others from running: the report lists every case that got through, not just the first.

## Before you run anything

These scripts talk to a live backend over HTTP — they do **not** import the app. Start both of its
dependencies first:

1. **MySQL** — start the `MySQL84` Windows service.
2. **The backend** — in `backend/`:

   ```bash
   npm run dev
   ```

If the backend isn't reachable, every script **skips** with a message instead of failing, so a down
server never looks like a finding.

By default the scripts hit `http://localhost:3000`. Point them elsewhere with `GAMEATLAS_URL`.

## Running them

Run them with Node's own test runner (Node 24), from inside `backend/`.

All of them:

```bash
node --test "test/attacks/*.test.js"
```

Just one:

```bash
node --test test/attacks/05-sql-injection.test.js
```

The measurement scripts print their numbers (timings, throughput, statuses) as they go. With the test
runner those lines appear under the test as diagnostics; run a single file with `node` directly if you
want the plain output:

```bash
node test/attacks/13-many-users-load.test.js
```

## Throwaway accounts and cleanup

Every script creates its own throwaway accounts (emails ending `@attack.test`) and deletes them, plus
any project they made, when it finishes — even if an assertion fails (cleanup runs in a `finally`). If a
run is killed partway through, a few `@attack.test` accounts may be left behind; they're harmless and
you can remove them from the Settings/account pages or the database. The one exception on purpose is
`KEEP_ATTACK_DATA=1` (below), which keeps the account for a browser check.

## The scripts

| # | File | Attack | PASS means |
|---|------|--------|------------|
| 1 | `01-unauthenticated-account-access.test.js` | Read/change/delete an account with no login | All four account routes refuse (401/403) |
| 2 | `02-password-brute-force.test.js` | A few hundred wrong passwords | The server starts refusing (429/503) |
| 3 | `03-login-flood-health.test.js` | Many logins at once, measure health | Health stays fast and extra logins are refused |
| 4 | `04-malformed-email-signup.test.js` | Over-long / spaces / symbols / no-@ emails | Each gets a clear 400 (not 500, not accepted) |
| 5 | `05-sql-injection.test.js` | SQL payloads in login, display name, project name, asset value, asset ID and the URL | Text stored as typed, IDs/URLs find nothing, tables intact |
| 6 | `06-cross-project-access.test.js` | Read/edit/delete another user's assets, blueprints, dialogues, members and project; add himself as a member | Every attempt answers 404, data untouched |
| 7 | `07-invalid-asset-bypass.test.js` | Invalid assets straight to the API (incl. a missing blueprint, data that isn't an object) | Each refused with 400, nothing saved |
| 8 | `08-stored-xss-payload.test.js` | Store `<img onerror=…>` as a value | Round-trips as inert JSON text (+ browser check) |
| 9 | `09-session-cookie.test.js` | Reuse/forge session cookies | Stale/forged/unsigned cookies all rejected |
| 10 | `10-large-requests.test.js` | Bodies over the 100 KB / 20 MB limits | Cleanly rejected, server up, nothing saved |
| 11 | `11-corrupt-files.test.js` | Restores that aren't JSON or are broken inside; dialogues with a missing or null step | Each refused with 400, project unchanged (+ hand-test files) |
| 12 | `12-oversized-blueprint.test.js` | 3,000 properties; 60 and 10,000 levels of nesting | Saved or a clear 4xx, never a 500; server stays up (+ browser check) |
| 13 | `13-many-users-load.test.js` | 10/50/200 users loading at once | Server stays up; reports req/s and slowest |
| 14 | `14-concurrent-asset-save.test.js` | Two tabs saving one asset at once | Second save refused; first change not lost |
| 15 | `15-member-no-roles.test.js` | A plain member renames/deletes/wipes a shared project or removes the owner | Each owner-level action refused; data unchanged (all `todo`, see below) |
| 16 | `16-reference-integrity.test.js` | Rename/delete an asset or blueprint that others link to | Renames carry links along; deletes never make a read 500 |
| 17 | `17-duplicate-id-race.test.js` | Two identical creates at once (asset, blueprint, dialogue, personal project), 5 rounds each | Every round: one 201, one clean 400/409; never two rows or a 500 |
| 18 | `18-prototype-pollution.test.js` | `__proto__` / `constructor` / `toString` as a property type, property ID, data key or node type | Handled or cleanly refused, never a 500; valid assets accepted; nothing polluted |

Script **15** checks the *future* role rule (a plain member shouldn't be able to do owner-level things).
Roles are deliberately on PLAN.md's stretch list, so every case is marked `todo`: it still runs and prints
what the member managed to do, but shows as ⚠ and counts under "todo" instead of "fail". Write it up as a
known, accepted limitation.

### Three scripts have a manual browser step

Scripts **8 (XSS)**, **11 (corrupt uploads)** and **12 (oversized blueprint)** check everything they can
from a script. The piece a Node script can't check is called out in each file as a `BROWSER CHECK`: that
the app *renders* the value as plain text with no script running (8), that a broken dialogue which got
saved doesn't break the editor (11), and that the big blueprints' pages still open (12).

Normally a script deletes its throwaway account when it ends, which would take the data with it. Run 11 or
12 with `KEEP_ATTACK_DATA=1` to keep it: the script then prints the account's login and the links to open.
Delete the account from its Account page when you're done.

```bash
KEEP_ATTACK_DATA=1 node --test test/attacks/12-oversized-blueprint.test.js
```

(In PowerShell: `$env:KEEP_ATTACK_DATA = '1'` first, then the `node --test …` line, and
`Remove-Item Env:KEEP_ATTACK_DATA` afterwards so later runs clean up again.)

### Hand-test files for script 11

`files/` holds broken files made from the app's own starter data, for trying the browser's import checks
by hand. Script 11 also sends the first two to the server.

| File | Where to try it | Safe result |
|------|-----------------|-------------|
| `cut-off-backup.json` | A project's settings (cog beside its name) → **Choose backup file** | "This file couldn't be read as a backup."; nothing changes |
| `image-renamed.json` | **Choose backup file**, and **Import dialogue** / **Import asset** in the top bar | A clear "couldn't be read" message each time |
| `dialogue-missing-step.json` | Dialogues → **Import dialogue** | Opens in the editor with the link to the deleted step left unconnected; nothing is saved until Save |
| `backup-broken-dialogue.json` | **Choose backup file** in a **new, empty project** (a restore replaces everything in the project) | Refused with a clear message. If it's accepted instead, open the "merchant_greeting" dialogue and see whether the editor still works |

## Tuning knobs (environment variables)

| Variable | Used by | Default |
|----------|---------|---------|
| `GAMEATLAS_URL` | all | `http://localhost:3000` |
| `GAMEATLAS_APP_URL` | 11, 12 (printed links) | `http://localhost:5173` |
| `KEEP_ATTACK_DATA` | 11, 12 (`1` keeps the account for the browser check) | off |
| `BRUTE_FORCE_ATTEMPTS` | 2 | `300` |
| `FLOOD_COUNT` | 3 | `100` |
| `FLOOD_HEALTH_LIMIT_MS` | 3 | `1000` |
| `LOAD_USER_COUNTS` | 13 | `10,50,200` |
| `LOAD_DURATION_MS` | 13 | `30000` |
| `RACE_ROUNDS` | 17 | `5` |

Script 13 is the slow one: with the defaults, setting up 200 accounts, three 30-second phases and
cleanup takes a few minutes. Lower `LOAD_USER_COUNTS` / `LOAD_DURATION_MS` for a quick pass.
