# English Writing Recovery

One app for the English Writing Recovery Plan. It replaces the two AI Studio studios in `../1` and `../2`. Six months at about 30 minutes a day, in four phases: timed unaided writing, Franklin rebuilds, sentence combining, finished pieces, and publishing. Claude marks problems after a draft is done and never rewrites anything; you do the repair.

## Run it

**Windows:** run `desktop/EnglishWritingRecovery.exe`. It opens the app in its own Edge window. Data is saved in `%APPDATA%\EnglishWritingRecovery`, with a dated copy kept each day for 14 days. For Claude reviews, paste your own Anthropic API key in Setup; Windows encrypts it for your user account. The exe is not code-signed, so SmartScreen may ask once: More info → Run anyway.

**In Claude:** `dist/english-writing-recovery.html` is published as a private Claude artifact with its own storage and Claude review.

**Any browser:** open `dist/english-writing-recovery.html`. Data stays in that browser, and reviews are copy and paste.

## Build and test

```
python3 build.py          # src/ -> dist/english-writing-recovery.html and desktop/app.html
node test/test_logic.js   # plan rules, gates, queue, error log, review validation, import
node test/e2e.js          # every flow in three modes (needs Playwright): browser-only, Claude viewer, desktop launcher
desktop\build.cmd         # on Windows: compiles desktop\EnglishWritingRecovery.exe with the built-in C# compiler
```

`SPEC.md` has the modules, data contracts, the decisions where the plan left room, and known limits.

## Moving data from the old studios

Press Export in Recovery Studio or Unaided Studio, then use Setup → Import. Importing the same file twice adds nothing twice.
