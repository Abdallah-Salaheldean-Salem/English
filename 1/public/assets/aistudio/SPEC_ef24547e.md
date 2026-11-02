# English Writing Recovery: app spec

Personal daily-practice app built from the English Writing Recovery Plan. One self-contained page, published as a private artifact. Source: `src/` concatenated by `build.py`.

## Modules
| File | Responsibility |
| --- | --- |
| `logic.js` | Pure plan rules: dates, sentence splitting, step flows, gates, next action, error rates, review prompts. Tested headlessly by `test_logic.js`. |
| `content.js`, `models.json` | Fixed material: topics, combining sets, books, phases, verbatim public-domain model paragraphs. |
| `store.js` | One in-memory state, one write in flight per document, database or browser-only fallback. |
| `app_core.js` | Timer, session engine, autosave, error logging, Claude calls. |
| `app_focus.js` | Full-screen session steps. |
| `app_views.js` | Today, Plan, Errors, Writing, Progress, Setup, charts. |
| `app_events.js` | Input guards, event wiring, export, boot. |
| `e2e.js` | Headless walkthrough of all flows in browser-only mode. |

## Data contracts (artifact database, owner read and write only)
- `state/app`: `{startDate, phase, phaseStarted:{n:date}, weekStart, restDays[], anchorRoutine, anchorPlace, noDelete, pauseLimit, reviewsPerWeek, sound, form, publishPlace, top3[], books{}}`
- `sessions/<id>`: `{id, kind, phase, date, status:'active'|'done', startedAt, finishedAt, step, stepElapsed, seconds, words, data, marks[], reviewed, reviewedAt}`. `kind` is one of phase1, short, franklin1, franklin2, franklin3, combining, summary, paragraph, piece, drill. `data.sprint` = `{words, maxPause, paused, interrupted, seconds}`.
- `pieces/<id>`: `{id, phase, form, title, status, createdAt, finishedAt, plan{point,reader,notes}, text, versions[], checks{}, feedback[], postedUrl, publishedUrl, words, marks[], reviewed, reviewedAt}`. Stages: Phase 2 plan, draft, revise, done. Phase 3 adds feedback, revise2. Phase 4 adds publish.
- `errors/<id>`: `{id, type, wrote, correct, by:'self'|'claude'|'plan', date, dates[]}`. One row per distinct wrong form; `dates.length` is the occurrence count.
- `reading/<date>`, `critiques/<id>`, `models/<id>`.
- A mark: `{quote, at, type, hint, by, fixed, fix, tries, note, errId}`. No field holds a suggested correction from Claude.

## Decisions where the plan left room
1. Drills are an ordered queue, not fixed weekdays, so a missed day never orphans a Franklin rebuild. The rebuild waits at least one calendar day after the notes.
2. Default week is Sunday start with a Friday and Saturday weekend (Egypt). Saturday and Sunday is one setting away.
3. "Without stopping" means no pause over 60 s, no pause button, no reload mid-write. Configurable.
4. "4 to 5 most frequent errors identified" means 4 error types seen at least twice.
5. Gate 2 error rate is measured on the most recent 900+ words Claude marked in Phase 2, per type, against the top 3 frozen when Phase 2 starts.
6. Phase 3 Franklin is one sitting (8/12/5 minutes), so the week holds exactly 2 drills and 3 piece days as the plan says.
7. Claude review: one draft a week by default, self-check first, quotes must match the draft exactly, and repairs are judged without revealing the answer.
8. Model passages are verbatim public domain. Paul Graham is linked, and any passage can be added by paste because that text is not his own.

## Known limits
- No push reminders from a page. A scheduled task can send one.
- Blocking paste and delete is friction, not security. A phone keyboard's own suggestions cannot be disabled by a page.
- Claude calls and the database work only inside the Claude viewer, signed in. Elsewhere the app runs on browser storage and offers a copy-paste review request.

## If this becomes a native or multi-user app
Keep `logic.js` and the contracts unchanged. Replace `store.js` with a real backend, move Claude calls behind a server, and put per-user data under `data/users/<id>`.
