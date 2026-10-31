# GameAtlas Attack Test Report

**Run date:** 2026-10-30 · **Author:** David Reichart (IST 440W capstone)

This report covers the "try to crash it" attack tests for GameAtlas. Each test deliberately attacks the running
platform and checks for the *safe* result, so a failing test is a weakness found, not a broken test. The scripts
are in [``](../backend/test/attacks/), and each case inside a script is reported on its own.

## Test environment

| | |
|---|---|
| Operating system | Windows 11 Pro |
| Backend | Node 24.21, Express 5, on `http://localhost:3000` |
| Database | MySQL 8.4 (Windows service `MySQL84`, strict SQL mode) |
| Frontend | React 19 + Vite 8 dev server on `http://localhost:5173` (used for the browser checks) |
| Command | `node --test --test-concurrency=1 "test/attacks/*.test.js"` (inside `../..`, one file at a time) |
| Settings | Defaults: 300 brute-force attempts, 100 simultaneous logins, 10/50/200 users × 30 s, 5 race rounds |

**Results:** 18 scripts and 101 individual checks: **74 passed, 23 failed, 4 marked todo** (script 15). The scripted
run took 2 minutes 35 seconds. The browser checks for scripts 08, 11 and 12 were done afterwards in the running
frontend, with the test data kept (`KEEP_ATTACK_DATA=1`). Every throwaway account the tests made was deleted
afterwards.

## Summary

| # | Test | Result | Checks passed |
|---|------|--------|---------------|
| 01 | Unauthenticated Account Access | Fail | 0 / 4 |
| 02 | Password Brute Force | Fail | 0 / 1 |
| 03 | Login Flood | Fail | 1 / 2 |
| 04 | Malformed Sign-up Emails | Fail | 0 / 4 |
| 05 | SQL Injection | **Pass** | 10 / 10 |
| 06 | Cross-Project Access | **Pass** | 24 / 24 |
| 07 | Bypassing the Frontend (Invalid Assets) | Fail | 5 / 6 |
| 08 | Stored Cross-Site Scripting | **Pass** | 2 / 2, browser check passed |
| 09 | Session Cookie Attacks | **Pass** | 5 / 5 |
| 10 | Oversized Requests | **Pass** | 4 / 4 |
| 11 | Corrupt Uploads | Fail | 5 / 9, browser check failed |
| 12 | Oversized Blueprints | Fail | 3 / 5, browser check passed |
| 13 | Many Users at Once (Load Test) | **Pass** | 3 / 3 |
| 14 | Two People Saving One Asset | Fail | 0 / 1 |
| 15 | Member Without Owner Rights (Roles) | Fail (accepted limitation) | 0 / 4, all todo |
| 16 | Reference Integrity (Renames and Deletes) | **Pass** | 5 / 5 |
| 17 | Duplicate-ID Race | Fail | 2 / 4 |
| 18 | Prototype-Style Keys | Fail | 5 / 8 |

---

## 01 Unauthenticated Account Access

### Method
With no login cookie at all, the script targeted a throwaway "victim" account and sent four requests to the
account routes: list every user (`GET /api/users`), read the victim (`GET /api/users/:id`), change the victim's
email (`PUT /api/users/:id`) and delete the victim (`DELETE /api/users/:id`).

### Desired Result
Every one of the four requests is refused (401 or 403), so a visitor who isn't logged in can't read, change or
delete anyone's account.

### Pass/Fail
**Fail.** All four requests went through without a login: the list returned every account's email (200), the
victim's account was read (200), its email was changed (200) and the account was deleted (204).

### Application Measures
These four routes in `../../src/routes/users.ts` were only added for testing during development, and the
frontend never calls them. It uses the `/me` routes, which only ever act on the logged-in user's own session.
**Recommendation:** remove the four routes before deployment (already on the Phase 6 checklist in PLAN.md). A
removed route answers 404 (unknown address), so this script's check should then accept 404 as well as 401/403.

---

## 02 Password Brute Force

### Method
The script created a throwaway account and sent up to 300 login attempts in a row, each with a different wrong
password, watching for the server to start refusing attempts (429 Too Many Requests or 503) instead of answering
"wrong email or password" every time.

### Desired Result
The server starts refusing attempts somewhere in the 300, through rate limiting or a temporary lockout, so a
password can't be guessed by trying thousands of them.

### Pass/Fail
**Fail.** All 300 wrong passwords were checked and answered 401. The server never started refusing, and the 300
guesses took 13.7 seconds (about 22 guesses a second from one machine).

### Application Measures
Today guessing is only slowed down: passwords must be at least 8 characters, they are stored as bcrypt hashes
(slow to check on purpose), and login answers the same message for an unknown email and a wrong password.
**Recommendation:** add rate limiting to `POST /api/users/login`, for example with the `express-rate-limit`
package. Count failed attempts per IP address and email (successful logins don't count), and after a small number
(for example 10 in 15 minutes) answer 429 "Too many attempts, try again later" without checking the password.

---

## 03 Login Flood

### Method
The script started 100 login attempts for one real account at the same moment. Each one has a wrong password, but
the server still runs a full bcrypt password comparison for it, which is deliberately slow. While they were in
flight it measured how long `GET /api/health` took (median of 5), and compared that with the time when idle.

### Desired Result
The rest of the server stays responsive (health answers within 1,000 ms during the flood) and at least some of the
extra logins are refused, so one attacker can't slow the app down for everyone.

### Pass/Fail
**Fail.** The server stayed responsive (health took 1 ms idle and 2 ms during the flood), but none of the 100
logins were refused (0 / 100).

### Application Measures
The part that passed comes from the password library: `bcryptjs` compares passwords in small chunks and lets other
requests be answered in between, so the flood didn't freeze the server. **Recommendation:** the rate limiter from
test 02 also fixes this test. It refuses extra attempts before they reach bcrypt, which protects against floods far
larger than this test's 100.

---

## 04 Malformed Sign-up Emails

### Method
The script tried to sign up four times with a badly formed email: one 262 characters long (the `users.email`
column holds 254), one made only of spaces, one made only of symbols (`!#$%^&*()`), and one with no `@` sign.

### Desired Result
Each attempt gets a clear 400 message saying what's wrong. None is accepted (201), and none crashes the request
(500).

### Pass/Fail
**Fail.** The 262-character email crashed the request with a 500: MySQL (in strict mode) refused a value too long
for its column, and nothing turned that into a clear message. The spaces-only, symbols-only and no-`@` emails were
all accepted and created accounts (201).

### Application Measures
Sign-up only checks that an email was sent and is text, and the database's unique index stops two accounts sharing
an email. **Recommendation:** add a `validateEmail()` to `users.ts` next to `validatePassword()`. It should trim
the email, refuse anything longer than 254 characters, and require a simple shape (text, `@`, text, a dot, text,
no spaces), answering 400 with a clear message. Use it in sign-up and in `PUT /api/users/me`, and show the same
message on the sign-up page.

---

## 05 SQL Injection

### Method
The script sent two classic SQL injection strings, `' OR '1'='1` (makes a condition always true) and
`'; DROP TABLE users; --` (tries to run a second command), everywhere a value reaches a database query:

- the login form's email and password
- a sign-up display name
- a project name
- an asset's text value
- an asset ID
- the `projectId` in the URL's query string
- a blueprint ID and an asset ID in the URL's path

Afterwards it signed up a new account, logged in, listed projects and loaded the asset list to confirm the tables
were intact.

### Desired Result
No payload logs anyone in. Text values are stored exactly as typed. IDs and URLs containing a payload find nothing
(400 or 404). Every table still works afterwards.

### Pass/Fail
**Pass**

### Application Measures
- **Placeholders:** every query in the backend uses mysql2's `?` placeholders (`db.query(sql, [values])`), so a
  value always travels to MySQL as data and never becomes part of the SQL command. The one place a column name is
  put into SQL (`projectAccess.ts`) takes it from a fixed list in the code, never from a request.
- **ID format:** IDs must be lowercase snake_case (`BLUEPRINT_ID_PATTERN` in the shared `validation.js`), so a
  payload is refused as an ID with 400.
- **URLs:** a payload in a URL simply matches no row and answers 404.

---

## 06 Cross-Project Access

### Method
User Alice made a project holding a blueprint, an asset and a dialogue (plus a second, separate project). User Bob,
who is not a member, then made 24 attempts on her data:

- **Reads:** list and read her assets, blueprints, dialogues and members.
- **Edits:** change her asset, blueprint, dialogue and project name, and add himself as a member.
- **Deletes:** delete her asset, dialogue, blueprint and project, and replace her whole project's contents.

Several attempts named **Bob's own project** together with Alice's record IDs, to see whether the server checks
that a record belongs to the project named. Afterwards the script read everything back as Alice.

### Desired Result
Every attempt answers 404, so the server never even confirms that Alice's project exists, and all of Alice's data
is unchanged.

### Pass/Fail
**Pass**

### Application Measures
- **Membership check on every route:** each project, asset, blueprint, dialogue and member route starts with
  `openProject()` (`../../src/projectAccess.ts`). It checks the login session and that the caller is a member of
  the project named.
- **404, not 403:** a non-member gets 404, so nobody can find out which project IDs exist.
- **Project and ID together:** records are always looked up by project *and* ID
  (`WHERE a.project_id = ? AND a.id = ?`), so naming your own project together with someone else's record ID finds
  nothing.

---

## 07 Bypassing the Frontend (Invalid Assets)

### Method
As a logged-in project member, the script skipped the app's form and sent six assets straight to
`POST /api/assets` that the form would never produce:

- missing the required Name
- Power written as text instead of a whole number
- a link to an asset that doesn't exist
- a blueprint that doesn't exist
- data that is text instead of an object
- an extra property the blueprint never declared

### Desired Result
Each asset is refused with 400 and nothing is saved, because the server, not the browser, is the authority on
what valid data is.

### Pass/Fail
**Fail.** Five of the six were refused with 400 and not saved. The asset with an extra, undeclared property
(`injected`) was accepted (201) and saved, so arbitrary data reaches the database and the exported asset file.

### Application Measures
The five that were refused were stopped by the backend running the same validation code as the form:
`routes/assets.ts` imports `../../../frontend/src/schema/validation.js` and `assetData.js` directly, so required
properties, value types, link targets and the blueprint itself are all checked on the server.
**Recommendation:** have the asset check refuse, with 400 "unknown property", any data key the blueprint doesn't
declare. The form only ever sends declared properties, so this changes nothing for real users.

---

## 08 Stored Cross-Site Scripting

### Method
The script saved an asset whose Name is `<img src=x onerror=alert(1)>`, read it back through the API and checked
how the server serves it. If a page ever turned that text into real HTML, the image would fail to load and run the
script for every user who views it.

**Browser check:** the same text was also saved as a project name, as a dialogue's name and line text, and as the
account's display name. The asset view, the asset list, the dialogue editor and the account page (each with the
sidebar) were then opened in the running app, and each page was searched for any `img` element with `src="x"` or
any `onerror` attribute.

### Desired Result
The value comes back unchanged and is served as JSON, and the app shows it as plain text everywhere, with no image
element created and no script run.

### Pass/Fail
**Pass**

### Application Measures
- **What the browser check found:** on all four pages the payload appeared as plain text (4 to 6 times per page),
  with no image element created and no script run.
- **React escapes text:** React shows any text it puts on the page as plain characters, so `<img …>` appears as
  those characters.
- **No raw-HTML rendering:** no component uses `dangerouslySetInnerHTML`, which is the one way around that escaping.
- **JSON answers:** the API answers with `application/json`, which a browser never runs as a page.
- **Export unchanged:** the text is still saved and exported exactly as typed, which the export format requires.

---

## 09 Session Cookie Attacks

### Method
The script logged in and inspected the login cookie, then tried to get in with cookies that shouldn't work:

- the old cookie after logging out
- a made-up cookie in the signed format
- an unsigned cookie
- a cookie from before the account was deleted

### Desired Result
The login cookie is HttpOnly (page scripts can't read it) and signed, and every stale, made-up or unsigned cookie
is treated as logged out (401).

### Pass/Fail
**Pass**

### Application Measures
Login uses `express-session` (`../../src/app.ts`):

- **The cookie:** it only holds a random session ID, signed with `SESSION_SECRET` (the `s:` prefix) and marked
  `httpOnly` and `sameSite: 'lax'`. The session itself is a row in MySQL.
- **Stale cookies point at nothing:**
  - logging out deletes the session row
  - logging in starts a fresh session (`regenerate`, which prevents session fixation)
  - deleting an account deletes all of that user's session rows
- **Bad signatures are ignored:** a cookie with a wrong or missing signature counts as no login.
- **Before deployment:** `SESSION_SECRET` must be set to a long random value and the cookie marked `secure`
  (Phase 6 checklist).

---

## 10 Oversized Requests

### Method
The script sent a 200 KB asset (the normal limit is 100 KB) and a 21 MB project restore (that route's limit is
20 MB), then checked that the server still answers and that the oversized asset wasn't saved.

### Desired Result
Both requests are refused cleanly (413 or 400), the server keeps running, and nothing is saved.

### Pass/Fail
**Pass**

### Application Measures
- **Size limits before any route runs:** `express.json()` refuses any request body over 100 KB. The project
  restore route (`PUT /api/projects/:id/contents`) has its own parser with a 20 MB limit, for whole backups.
- **A clear answer instead of a crash:** the error handler in `app.ts` turns an oversized body into a 413 JSON
  answer ("This is more data than the server accepts at once.").

---

## 11 Corrupt Uploads

### Method
The script filled a project with a valid blueprint, asset and dialogue, then sent nine corrupt uploads, counting the
project's contents before and after each:

- **Restores that aren't JSON:** a backup cut off partway through, and a PNG image renamed to `.json` (both kept
  in `files`).
- **Restores that are valid JSON but broken inside:**
  - lists that aren't lists
  - an asset whose blueprint isn't in the backup
  - two blueprints sharing one ID
  - a dialogue leading to a step that doesn't exist
  - a dialogue with a step replaced by `null`
- **Dialogues saved straight through the API:** one leading to a missing step, and one with a step replaced by
  `null`.

**Browser check:** with the test data kept, the project's dialogue list, the editor for each broken dialogue that
was saved, and the home dashboard were opened in the running app.

### Desired Result
Every corrupt upload is refused with 400 and the project's contents don't change, so a damaged file can't put
records into the project that the app can't open.

### Pass/Fail
**Fail.** The five uploads that weren't JSON, or had broken lists, blueprints or assets, were refused with 400 and
changed nothing. But all four broken dialogues were accepted: both restores (200, replacing the project's contents)
and both direct saves (201).

In the browser, the dialogue with a `null` step crashed three pages with "Unexpected Application Error: Cannot read
properties of null (reading 'type')":

- the project's **Dialogues list**
- that dialogue's **editor**
- the **home dashboard**, while it shows that project

So any project member can make those pages unusable for everyone in the project. The dialogue leading to a missing
step opened normally: the editor dropped the broken link and listed it under Checks.

### Application Measures
What blocked the five refused uploads:
- Express refuses a body that isn't JSON (400).
- `checkContents()` (`../../../frontend/src/data/backupFile.js`, run by both the restore route and the Settings page) refuses
  wrong types, assets without their blueprint and repeated IDs before anything is written.
- A restore runs in one transaction, so a refused one changes nothing.

**Recommendations:**
1. **Check a dialogue's structure on save.** Add this check to the shared `dialogueGraph.js`:
   - every step is an object with a text ID and a known type
   - step IDs are unique
   - every connection starts and ends at a step that exists

   Unfinished trees stay allowed. Run the check in `checkContents()` and in the dialogue `POST`/`PUT` routes, so
   both paths refuse a broken dialogue with 400.
2. **Contain any crash that gets through.** Give the routes an error page (`errorElement` in `App.jsx`), so a
   record that still can't be shown breaks only its own page, with a friendly message, rather than the whole list
   and the home page.

---

## 12 Oversized Blueprints

### Method
The script sent four blueprints that are technically valid but very large:

- a 500-property blueprint through the normal save, as a control
- a 3,000-property blueprint through the project restore route, which accepts 20 MB
- a blueprint nested 60 levels deep (an object property inside an object property, over and over) through the
  normal save
- a blueprint nested 10,000 levels deep through the restore route

It then checked that the server still answers.

**Browser check:** with the test data kept, the 500- and 3,000-property blueprints were opened in the builder, and
their new-asset forms were opened, in the running app.

### Desired Result
Each blueprint is either saved or refused with a clear 4xx message, never a 500. The server keeps answering, and
any blueprint that saved still opens in the app.

### Pass/Fail
**Fail.** Both large-but-flat blueprints saved (in 28 ms and 113 ms) and opened in the browser: the builder listed
all 3,000 properties and the asset form showed 3,002 fields. Both deep blueprints crashed with a 500 instead of a
clear refusal:

- **60 levels:** MySQL refuses to store JSON nested more than 100 deep, and each level here adds two.
- **10,000 levels:** the shared blueprint checks ran out of call stack ("Maximum call stack size exceeded").

The server kept answering after both.

### Application Measures
What held:
- The 100 KB normal limit and the 20 MB restore limit cap how big a blueprint can get.
- Express 5 turns an error inside a route into a 500 answer rather than a crashed server, which is why the server
  stayed up.

**Recommendation:** add a maximum nesting depth to the shared blueprint checks in `validation.js` (for example 10
levels of groups and lists).
- Check the depth first, with a simple loop rather than recursion, so a too-deep blueprint is refused with a clear
  400 ("Groups can be nested at most 10 deep") before the recursive checks or MySQL ever see it.
- The builder would show the same message, since it runs the same code.

---

## 13 Many Users at Once (Load Test)

### Method
The script made a shared project with 5 assets and 200 throwaway member accounts, all logged in. Then, for 30
seconds per phase, 10, 50 and finally all 200 users loaded the project's asset list over and over (each user sends
its next request as soon as the last one answers). It recorded requests, errors, requests per second and the
slowest response, and checked the server's health after each phase.

### Desired Result
The server keeps answering after every phase and serves the requests without errors. The timings are the
measurement this test produces.

### Pass/Fail
**Pass**

### Application Measures
Measured results (no errors in any phase, and health answered 200 after each):

| Users | Requests in 30 s | Errors | Requests / second | Slowest response |
|------:|-----------------:|-------:|------------------:|-----------------:|
| 10 | 85,184 | 0 | 2,839 | 24 ms |
| 50 | 91,744 | 0 | 3,058 | 79 ms |
| 200 | 114,063 | 0 | 3,802 | 120 ms |

Why it held:
- **Short requests:** each one is a single query for the project's assets through a shared MySQL connection pool.
- **No waiting around:** Node keeps serving other requests while it waits for MySQL.
- **Queue instead of fail:** the pool makes requests wait their turn when all its connections are busy, so more
  users meant slightly slower answers (slowest 120 ms at 200 users), not errors.

The load came from one Node process on the same machine as the server, so these numbers show the server is stable
at this scale. They are not its upper limit.

---

## 14 Two People Saving One Asset

### Method
The script logged one account in twice (like two browser tabs or two teammates). Both sessions loaded the same
asset, and then both saved a different change at the same moment.

### Desired Result
The second save is refused (409 or 412) because the asset changed after it was loaded, so the first person's
change isn't silently overwritten.

### Pass/Fail
**Fail.** Both saves were accepted (200 and 200). The asset kept whichever save the server handled last, and the
other person's change was silently lost.

### Application Measures
**Recommendation:** add optimistic locking, the same idea as JPA's `@Version`:
- The editor sends back the `updatedAt` time it loaded.
- `PUT /api/assets/:id` saves only when that still matches (`UPDATE … WHERE id = ? AND updated_at = ?`).
  Otherwise it answers 409 "Someone else saved this asset since you opened it", and the editor offers to reload.
- Blueprints and dialogues would follow the same pattern.

This script would then also send the `updatedAt` each tab loaded.

---

## 15 Member Without Owner Rights (Roles)

### Method
Alice added Bob as a member of a shared project with content. Bob then tried four owner-level actions, each on its
own project: rename the project, remove Alice from it, delete it, and wipe all its contents. GameAtlas deliberately
has no roles yet (every member may do everything; roles are on the PLAN.md §7 stretch list), so these cases are
marked `todo`: they run and report, but don't count as failures.

### Desired Result
Each owner-level action by a plain member is refused and nothing changes.

### Pass/Fail
**Fail (accepted limitation).** A plain member could rename the project (200), remove the owner (204), delete the
project (204) and wipe its contents (200). GameAtlas deliberately has no roles in its first version, so these are
recorded as known limitations, not defects.

### Application Measures
Until roles exist, two rules limit the risk:
- Only someone a member adds by email can join a project.
- Nobody can join, leave or delete a personal project.

**Recommendation (future work):** give each project an owner, for example an `owner_user_id` column on `projects`.
Only the owner could rename, delete, restore or empty the project, or remove other members. Members could still
edit content and leave.

---

## 16 Reference Integrity (Renames and Deletes)

### Method
GameAtlas records link to each other, so the script renamed and deleted the records others point at:

- renamed an asset that another asset and a dialogue (as speaker and as given item) link to
- renamed a blueprint that another blueprint's link property and a dialogue's speaker blueprint name
- deleted a linked-to asset and a linked-to blueprint, then read the records that pointed at them
- tried to rename an asset onto another asset's ID

### Desired Result
Renames carry every link along, reading a record whose link now points nowhere never crashes (500), and a rename
onto an ID that's already taken is refused with nothing changed.

### Pass/Fail
**Pass**

### Application Measures
- **Renames move their links in the same transaction**, so a link never points at an old ID:
  - `renameLinksToAsset` (`routes/assets.ts`) rewrites links in other assets, and dialogue speakers and given items.
  - `renameLinksToBlueprint` (`routes/blueprints.ts`) moves links in other blueprints and dialogues.
- **Clashing renames are refused:** the shared `validateAssetKey()` rejects an ID that's already in use (400) before
  anything changes.
- **Reads don't follow links:** they return the stored data as it is. A link to a deleted record is reported as a
  problem the next time that record is saved (as test 07 shows), rather than causing an error.

---

## 17 Duplicate-ID Race

### Method
The script sent two identical create requests at the same moment, like two tabs or two teammates clicking Save
together. It did this for an asset ID, a blueprint ID, a dialogue ID and a user's personal project, 5 rounds each
with a new ID per round, and counted the rows saved after each round.

### Desired Result
In every round exactly one request wins (201) and the other is refused cleanly (409 from the database's unique key,
or 400 from the app's own "already uses this ID" check). Exactly one row is saved, and nothing answers 500.

### Pass/Fail
**Fail.** The asset and personal-project races were handled correctly in all 5 rounds: one 201, one 409, one row.
The blueprint and dialogue races answered 500 in 5 of 5 rounds each, and the server log showed a MySQL deadlock
(`ER_LOCK_DEADLOCK`). Only one row was saved each time, so no data was duplicated, but the second person got
"Something went wrong on the server."

### Application Measures
What held:
- **No duplicate rows possible:** MySQL `UNIQUE` keys cover each kind of ID (an asset ID per blueprint, a blueprint
  or dialogue ID per project, one personal project per user).
- **A clean 409:** `isDuplicateKey()` turns MySQL's duplicate error into 409.

The likely cause of the deadlock is lock order:
1. Each create inserts its row. Because of the foreign key, that takes a shared lock on the project's row.
2. It then updates the project's ID list, which needs an exclusive lock on that same row.
3. Two creates at once each hold the shared lock and wait for the other.

**Recommendation:**
- **Lock the project row first,** with `SELECT … FROM projects WHERE id = ? FOR UPDATE` at the start of the create
  transaction (PLAN.md §5.6 rule 1, which isn't built yet). The second create then waits its turn and gets the clean
  409.
- **As a safety net,** `withTransaction()` could retry once when MySQL reports a deadlock.

---

## 18 Prototype-Style Keys

### Method
In JavaScript every plain object inherits built-in members such as `__proto__`, `constructor` and `toString`, so
looking a user-supplied name up in an object can find one of those instead of "nothing". The script used those names
where GameAtlas looks values up:

- property types `__proto__` and `constructor`
- property IDs `constructor` and `toString`, then one asset of that blueprint left empty and one filled in
- an asset with `__proto__` and `constructor` keys in its data
- a dialogue step of type `__proto__`

Finally it saved a normal asset to check that nothing had leaked onto other objects.

### Desired Result
Each is treated as ordinary input: saved, or refused with a clear 4xx, never a 500. Valid assets are accepted, and
the normal asset afterwards is unaffected.

### Pass/Fail
**Fail.** Two cases broke:
- **Built-in property types:** a type of `__proto__` or `constructor` crashed the blueprint save with a 500
  (`TYPE_SETTINGS[field.type].includes is not a function` at `validation.js` line 289).
- **Empty `toString` property:** an asset that left a non-required whole-number property named `toString` empty
  was wrongly refused with "Enter a number".

The other five cases passed: the built-in-named properties saved and kept their values when filled in, prototype
keys in asset data were stored as plain data, and nothing leaked onto other objects.

### Application Measures
What held:
- **Parsed JSON is plain data:** a `__proto__` key in a request stays an ordinary key and can't change other
  objects.
- **The restore check is already safe:** it looks types up with `Object.keys(FIELD_TYPES).includes(type)`
  (`backupFile.js`).

**Recommendations:**
- **Look up types safely:** in the shared `validation.js`, `blueprintDraft.js` and `fieldTypes.js`, use
  `Object.hasOwn(FIELD_TYPES, type)` (and the same for `TYPE_SETTINGS`) instead of `FIELD_TYPES[type]`. A built-in
  name then counts as an unknown type and is refused with 400.
- **Read values safely:** read an asset's value only when its data holds that key itself
  (`Object.hasOwn(values, field.key)`), so an empty `toString` counts as empty.
- **Alternative:** refuse built-in names such as `constructor` and `toString` as property IDs.

---

## Not covered by this run

- **Hand-test files:** the files for script 11 (`files`) are meant to be imported through
  the browser's file picker, which wasn't done in this run.
- **Platform dependency:** other browsers, phone-width screens, running the backend on Node 20 and stopping MySQL
  while the app is open are checked by hand, not by these scripts, and aren't part of this report.
- **Timings:** scripts 02, 03 and 13 measure from the same machine as a local server. A deployed server reached
  over a network would give different numbers.
