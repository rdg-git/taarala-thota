# Running the tests on your own computer

The automatic tests open the app in a real browser (Chromium, through Playwright) under the same security rules as the
live site. Everything runs on your own computer; nothing is sent anywhere.

## 1. Install once

You need **Python 3** (to build the app) and **Node.js 18 or newer** (to run the tests). Then, in the repository folder:

```
npm install --no-save playwright@1.63.0
npx playwright install chromium
```

- The first line puts Playwright in a local `node_modules/` folder (ignored by git, never uploaded). `--no-save` means
  no package files are added to the repository. The version is the one the tests were last run with.
- The second line downloads Playwright's own copy of Chromium (about 150 MB, stored outside the repository).

## 2. Build, then run every test

```
python3 build.py
node tests/run_all.js
```

`run_all.js` starts the local test server (`tests/serve.js`, http://localhost:8765) by itself, runs each test file in
turn, and prints `ok` or `XX` per file, ending with `ALL TEST FILES PASSED`. A full run takes a few minutes.
On Windows, use `python` (or `py`) instead of `python3` if that's how Python is installed.

## 3. Running one test, or a different browser

```
node tests/serve.js          # in one terminal: the local test server
node tests/fill.js           # in another terminal: one test file
```

By default the tests use Playwright's own Chromium. To use another Chromium-based browser, set `CHROMIUM_PATH` to its
program file first (PowerShell: `$env:CHROMIUM_PATH = "C:\path\to\chrome.exe"`; macOS/Linux: `export CHROMIUM_PATH=/path/to/chromium`).

## 4. What each file is for

Every test file starts with a one-line note saying what it checks. Most are part of `run_all.js`. A few are manual
helpers that print numbers or screenshots to look at rather than pass/fail: `audio.js`, `soak.js`, `undo_multi.js`,
`shots.js`, `shots2.js`. The table in `docs/DEVELOPER_GUIDE.md` (section 3) gives the main ones by area.

## 5. Documentation check

`python3 tools/check_doc_words.py` checks that the Markdown copy of the product documentation has exactly the PDF's
words (needs `pip install pypdf==6.17.0`). It also runs automatically on every pull request
(`.github/workflows/doc-words.yml`) and must pass before merging.
