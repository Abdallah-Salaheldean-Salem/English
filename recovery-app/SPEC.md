# English Writing Recovery: app spec

Personal daily-practice app built from the English Writing Recovery Plan. It replaces the two AI Studio apps (Recovery Studio and Unaided Studio) with one app. It is one self-contained page, published as a private artifact. Source: `src/` concatenated by `build.py` into `dist/english-writing-recovery.html`.

Version 2, 4 November 2026. Changes from v1 are marked **(v2)**.

## Modules
| File | Responsibility |
| --- | --- |
| `logic.js` | Pure plan rules: dates, sentence splitting, step flows, drill queue, gates, piece stages, error log, error rates, review prompts and validation. Tested headlessly by `test/test_logic.js`. |
| `content.js`, `models.json` | Fixed material: error types, plan error rows, phases, gate text, rules table, revision checklist, books, forms, topics, combining sets, links, and public-domain model paragraphs. |
| `migrate.js` **(v2)** | Pure import of either retired studio's Export file, or of a raw localStorage dump of their keys. Re-importing adds nothing twice. Tested by `test/test_logic.js`. |
| `store.js` | One in-memory state, one write in flight per document, artifact database or browser-only fallback. |
| `app_core.js` | DOM helper, timer, session engine, sprint tracking, autosave, error logging, Claude calls. |
| `app_focus.js` | Full-screen session steps, guarded writing surface. |
| `app_views.js` | Today, Plan, Writing, Errors, Progress, Setup, first run, charts, piece workspace. |
| `app_events.js` | Routing, import and export, boot. |
| `index.html`, `style.css` **(v2)** | Page shell and styles. Light and dark themes. Phone layout below 900 px. |
| `desktop_bridge.js`, `desktop_shim.js` **(v2)** | Desktop build only: the local API and its mapping onto `window.claude`. |
| `pwa_bridge.js`, `pwa/` **(v2)** | Phone app build only: IndexedDB storage, direct API calls, service worker, manifest, icons. |
| `tools/make_icons.py` **(v2)** | Draws every icon size (Pillow). |
| `test/e2e.js` | Headless walkthrough of all flows, twice: browser-only mode, then a mocked Claude viewer (db and Claude). Uses Playwright's fake clock to run real 15-minute sprints. |

## Runtime capabilities **(v2)**
- `db` with rules `[{path: "", read: "owner", write: "owner"}]`: only the owner reads or writes. Checked after publish: an Editor-level read returns nothing.
- `sample`: Claude review and repair checks, on the viewer's own Claude usage.
- `downloads`: JSON backup export.

## Data contracts (artifact database, owner read and write only)
- `state/app`: `{startDate, phase, phaseStarted:{n:date}, weekStart, restDays[], anchorRoutine, anchorPlace, noDelete, pauseLimit, reviewsPerWeek, sound, form:'essay'|'story', publishPlace, top3[], books{id:{read,notes}}}`
- `sessions/<id>`: `{id, kind, phase, date, status:'active'|'done', startedAt, finishedAt, step, stepElapsed, seconds, words, data, marks[], reviewed, reviewedAt, reviewMode?, reviewedWords?, imported?}`. `kind` is one of phase1, short, franklin1, franklin2, franklin3, combining, summary, paragraph, piece, drill. `data.sprint` = `{words, maxPause, paused, interrupted, seconds}`, where `words` counts only words written inside the time limit.
  - `data` by kind **(v2)**: phase1/short `{topic, modelId, copied, text, fewer}`; franklin1/3 `{modelId, notes[], shuffled}`; franklin2 `{notesId, modelId, notes[], shuffled, order[], text, kept[], keptAll, diffs[2], orderRight}`; combining `{setId, ways[3]}`; summary `{article, link, text}`; paragraph `{point, notes[], draft, links[], close}`; drill `{type, text}`; piece `{pieceId, minutes, wordsBefore}`.
- `pieces/<id>`: `{id, phase, form, title, status, createdAt, finishedAt, plan{point,reader,notes}, text, versions[], checks{}, feedback[{by,notes,date}], postedUrl, publishedUrl, words, marks[], reviewed, reviewedAt}`. Stages: Phase 2 plan, draft, revise, done. Phase 3 adds feedback and revise2. Phase 4 adds publish.
- `errors/<id>`: `{id, type, wrote, correct, by:'self'|'claude'|'plan'|'ai', date, dates[], sources?[], origType?}`. One row per distinct wrong form (id = hash of type and normalised wording); `dates.length` is the occurrence count. `ai` marks rows imported from the old Gemini review **(v2)**. `sources` holds import keys so a re-import never double-counts.
- `reading/<date>` `{date, minutes, book, note}`, `critiques/<id>` `{id, date, title, where, link}`, `models/<id>` `{id, author, title, year, form, source, text, words}`.
- A mark: `{quote, at, type, hint, by:'self'|'claude'|'ai', fixed, fix, tries, note, errId, lastHint?}`. No field holds a suggested correction from Claude. `fix` is always the writer's own repair.
- Error types are a fixed list (`ERROR_TYPES`) so counts and the top 3 stay comparable. Claude must use it; anything else becomes `Other`.

## Decisions where the plan left room
1. Drills are an ordered queue, not fixed weekdays, so a missed day never orphans a Franklin rebuild. Phase 2 order: notes, combining, rebuild, summary, paragraph. The rebuild waits at least one calendar day and one other drill after the notes. Every second rebuild is a shuffle week.
2. Default week is Sunday start with a Friday and Saturday weekend (Egypt). Saturday or Monday start is one setting away. Phase 1 rests at weekends; from Phase 2 the 60-minute piece runs on weekend days.
3. "Without stopping" means no pause over 60 s inside the 15-minute window, no pause button, no reload mid-write. Deleting and pasting are off during the timed write. Configurable.
4. "4 to 5 most frequent errors identified" means 4 error types seen at least twice.
5. Gate 2 error rate is measured on the most recent 900+ words Claude marked in Phase 2, per type, against the top 3 frozen when Phase 2 starts.
6. Phase 3 Franklin is one sitting (8/12/5 minutes), so the week holds exactly 2 drills and 3 piece days as the plan says. Phase 4 holds one rebuild a week.
7. Claude review: one draft a week by default, self-check first, quotes must match the draft exactly, and repairs are judged without revealing the answer. One review per item.
8. Model passages are public domain (published before 1929) and link to their Project Gutenberg text. Paul Graham is linked, not copied. Any passage can be added by paste.
9. **(v2)** Gates follow the plan text exactly. Gate 1: 15 phase-1 sessions, one clean 150-word sprint, 4 recurring error types. Gate 2: 6 rebuilds keeping every idea, 8 weekend pieces done, top-3 rate at most 1 per 300 words. Gate 3: 3 done pieces of 800+ words, each with 2+ readers, and 5 critiques written. The Recovery Studio's 14-day streak, 2% rate and 4-piece gates were not carried over.
10. **(v2)** A "short" session is 10 minutes of writing for a full day. It keeps the habit but does not count toward the 15 sessions; its sprint can still meet the 150-word gate only if 150 words fit in 10 minutes.
11. **(v2)** An error type seen three times becomes a drill: study your own rows, write 6 sentences with the correct form, self-check.

## Known limits
- No push reminders from a page. A scheduled task can send one.
- Blocking paste and delete is friction, not security. A phone keyboard's own suggestions cannot be disabled by a page.
- Claude calls and the database work only inside the Claude viewer, signed in. Elsewhere the app runs on browser storage and offers a copy-paste review request.
- **(v2)** Data from the old studios lives in their own browser storage, which this page cannot read. Bring it across with each studio's Export button, then Setup → Import.
- **(v2)** The model passages were entered from standard editions and not machine-checked against Gutenberg (the build environment could not reach it). Each links to its source for checking.

## If this becomes a native or multi-user app
Keep `logic.js`, `migrate.js` and the contracts unchanged. Replace `store.js` with a real backend, move Claude calls behind a server, and put per-user data under `data/users/<id>`.

## Windows desktop app **(v2)**
`desktop/EnglishWritingRecovery.exe`, built by `desktop/build.cmd` with the C# compiler that ships with Windows (.NET Framework 4.8). Building it needs no downloads. Electron was tried first and dropped, because its 110 MB runtime would take hours on the build machine's connection.
- `desktop/Launcher.cs`: embeds `desktop/app.html`, serves it and a small API on `http://localhost:<47811-47899>/<random 128-bit token>/`, and opens it in a Microsoft Edge app window with its own profile. Single instance; a second launch opens another window. It exits when the window closes and the page stops pinging, or after 10 idle minutes.
- API: `api/all`, `api/write?p=`, `api/remove?p=`, `api/key` (GET has / POST set), `api/key/clear`, `api/ask` (passes the Anthropic Messages response back unchanged), `api/save?name=` (writes to Documents, returns the path), `api/open-data`, `api/ping`. Paths use the database grammar; `.` and `..` segments are refused.
- Data: `%APPDATA%\EnglishWritingRecovery\data\<collection>\<id>.json`, written atomically, plus `backups\<date>\` copies kept for 14 days. The API key is DPAPI-encrypted (current user) in `anthropic-key.bin` and is used only by the exe. Model: `claude-sonnet-5-5`.
- `src/desktop_bridge.js` defines `window.desktop` over that API; `src/desktop_shim.js` maps it onto `window.claude.use('db' | 'sample' | 'downloads')`, so the app code is the same as the artifact's. `build.py` writes `desktop/app.html` with both, a strict CSP (`connect-src 'self'`) and the icon.
- `test/launcher_mock.js` serves the same API in memory; `test/e2e.js` runs every flow against it as its third mode.

## Phone app (installable PWA) **(v2)**
`build.py` writes `pwa/`: `index.html`, `manifest.webmanifest`, `sw.js` (cache name = hash of the page), icons and `.nojekyll`. Hosted as static files on GitHub Pages from the `gh-pages` branch; all paths are relative.
- `src/pwa_bridge.js` defines `window.desktop` (kind `phone`) on the phone: documents in IndexedDB database `ewr` (store `docs`, key = document path), the API key in store `secrets`, `navigator.storage.persist()` requested. `desktop_shim.js` maps it onto `window.claude`, as on the PC.
- Claude: direct `fetch` to `api.anthropic.com/v1/messages` with the `anthropic-dangerous-direct-browser-access` header and the person's own key. The CSP allows only that host besides fonts.
- Backups: the share sheet where the phone offers one, otherwise a download.
- Service worker: page network-first (updates arrive on the next open with signal), everything else cache-first, fonts cached as they load. Opens offline.
- The phone's data is separate from the PC exe and from the Claude artifact; Export and Import move it.
- Security note: GitHub Pages serves every Pages site of one account from the same origin, so another Pages site on the same account could read this app's storage, the key included. Keep only trusted sites on that account's Pages, or remove the key when not needed.

### Touch and phone layout (all builds)
Tap targets of at least 44 px on touch screens, 16 px form text (no zoom on focus in iPhone Safari), hover styles only where a real pointer exists, the session screen sized to the visible viewport (`--vvh`) so its footer sits above the keyboard, the tab bar hidden while typing and restored 350 ms after focus leaves (so a tap never lands on a shifted layout), and the error log as cards below 600 px.

## Build and test
```
python3 build.py          # writes dist/english-writing-recovery.html
node test/test_logic.js   # 21 groups: dates, queue, gates, pieces, error log, review validation, import
node test/e2e.js          # every flow in four modes (browser-only, Claude viewer, PC launcher, phone app at iPhone size), plus phone app install and offline open
python3 tools/make_icons.py   # only when the icon changes
desktop\build.cmd         # on Windows: compiles desktop\EnglishWritingRecovery.exe
```
