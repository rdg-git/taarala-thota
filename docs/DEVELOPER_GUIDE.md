# Taarala Thota · Garden of Stars — Developer Guide

A calm, ad-free set of games plus a private "loved ones" shortcut to WhatsApp.
No sign-in, no ads, no tracking, no server: everything a person saves stays in their own phone's browser.
This guide is the starting point for anyone continuing development. Each code file also carries
section-by-section notes right where each part begins.

---

## 1. How it is built (in one minute)

- **Plain HTML, CSS and JavaScript.** No framework and no outside code libraries at run time.
- **Every screen is one painted picture.** Buttons and words are placed on top of the picture, measured
  in the picture's own pixels, so the layout scales to any phone.
- **One small build step** (`build.py`) joins the files in `src/` into `public/app.js` and `public/app.css`,
  writes `public/index.html`, the app description (`manifest.webmanifest`) and the offline helper (`sw.js`).
- **`public/` is the whole website.** Hosting (Cloudflare Pages) just serves that folder.

## 2. Folder map

| Path | What it is |
|---|---|
| `src/` | All source code (edit here, never in `public/app.js`). |
| `public/` | The built website: `index.html`, `app.js`, `app.css`, `img/`, `fonts/`, `icons/`, `_headers`, `sw.js`, `manifest.webmanifest`. |
| `public/_headers` | Security rules and caching rules (read by Cloudflare and by the local test server). |
| `manifest.json` | Size of every picture (width, height). |
| `build.py` | Builds `public/` from `src/`. |
| `tools/` | One-off helpers: `make_fonts.py` (font files), `make_pictures.py` (smaller AVIF copies). |
| `tests/` | Automatic tests and the local test server. |
| `docs/` | This guide. |

### Source files (in the order they are joined)

| File | Responsibility |
|---|---|
| `core.js` | Screens built from pictures, placing things on pictures, navigation (Home/Back), cards and messages, saved-data helper, clock. |
| `helpers.js` | Safety helpers: plain-text output, phone-number check, contact colours, number/word checks for saved data. |
| `contacts.js` | Contacts (kept on the phone), contact photos, the Settings passcode, "erase all app data". |
| `audio.js` | The 432 Hz veena + bansuri music, made live in code (no sound files). |
| `gamekit.js` | Shared by Chess and Checkers: computer player in the background, results history, 60-minute resume rule, Stats. |
| `screens_main.js` | Home, Games menu, Loved Ones. |
| `settings.js` | Settings screen (passcode pages, contacts, backups, erase) and the Privacy & safety page. |
| `backup.js` | Locked backup files, safe restore, 6-day backup reminder. |
| `pwa.js` | Installable app: registers the offline helper, keeps pictures for offline play, "new version ready" card. |
| `bubble.js` | Bubble Pop (3 levels of 2 minutes, accuracy gates 95/98/100 %; bubbles cross in 6.0 / 4.8 / 3.7 s, a new one about every 0.75 s). |
| `mine.js` | Hidden Comets (minesweeper-style; Gentle never loses). |
| `chess_engine.js` | Chess rules (FIDE) and computer player. Verified by `tests/chess_rules.js` (incl. standard perft counts). |
| `checkers_engine.js` | International Checkers rules (FMJD: 10×10, flying kings, maximum capture, draw rules) and computer player. |
| `chess_ui.js`, `checkers_ui.js` | Chess and Checkers screens, moves, move hints and undo (both Easy only), results. |
| `init.js` | Start-up: builds every screen and opens Home; "steady screen" protections (stray touches, back gesture). |
| `sw.js` | Offline helper template (build.py fills in the version and file list). |
| `app.css` | All styles. |

## 3. Build and test

Requirements: Python 3 (with Pillow only for `tools/`), Node.js, Playwright with Chromium (tests only).

```
python3 build.py                 # rebuild public/ after any change in src/
node tests/serve.js              # local website at http://localhost:8765 (applies public/_headers)
node tests/run_all.js            # every automatic test, under the real security rules
```

Open `http://localhost:8765/index.html?test=1` for test mode (only works on your own computer; it adds
`window.MM` helpers used by tests, for example to move the clock forward).

| Test file | Covers |
|---|---|
| `func.js`, `func2.js` | Navigation, every game's main flow, Stats, required screen ids. |
| `chess_rules.js` | Chess rules incl. perft counts, castling, en passant, promotion, draw rules. |
| `contacts.js` | Passcode, contacts, photos, Loved Ones, lock/unlock, forgot passcode, erase. |
| `backup.js` | Backup, restore, tampered / wrong-password / booby-trapped files, reminder. |
| `pictures.js` | Every picture loads (AVIF + WebP fallback), Hidden Comets words and comets. |
| `pwa.js` | Install details, offline play, update card, data kept across updates, button sizes. |
| `security.js` | App works fully under the security rules; outside code, connections and framing are refused. |
| `privacy.js` | No outside addresses contacted, no sign-in code, only `tt:` labels saved. |
| `fill.js` | Screen fill on 6 sizes (small Android to tablet): no side strips where avoidable, nothing tappable or readable cut off. |
| `hints.js` | Move hints on Easy only in Chess and Checkers; moves still work on every level. |
| `steady.js` | Back gesture stays inside the app (asks before leaving on Home), no long-press menus or dragging, bubble speeds. |
| `music_off.js`, `music_firsttap.js`, `audio.js` | Music on/off memory, first-tap start on phones, sound check. |

## 4. How a screen works

```
const S = defScreen('my-screen', 'picture-name', { parent: 'home-view', name: 'My screen' });
addNav(S, { icons: true });                                   // Home + Back
addText(S, 'game-title', 150, 128, 520, 70, 46, 'Hello');     // words: x, y, width, height, font size (picture pixels)
addHot(S, 130, 1010, 260, 380, () => go('games'), 'Play');    // tap area over something painted
S.onShow = () => { /* runs each time the screen appears */ };
```

- Positions are **picture pixels**, measured on the original picture (all are 853 px wide, except Games).
- **Screen fill** (`layoutScreen` in `core.js`): when a phone screen is wider than the picture, the picture zooms in
  instead of leaving dark side strips, trimming at most 16 % of its height. Each screen calculates how much it may
  trim at the top and bottom from its own fixed elements (anything placed with `place()` over the painted picture),
  so painted signs, lanterns and boards are never cut. Full-screen see-through layers are ignored.
  - "Floating" elements (`.gear-btn`, `.privacy-link`, `.game-title`, `.loved-title`) and the round Home/Back/music
    buttons move inwards by the trimmed amount; Settings/Privacy panels (`.sheet`) get shorter.
  - Adding a new floating element near an edge? Add its class to `FLOATING` in `core.js`.
  - On the shortest browser view (iPhone Safari with bars) a thin strip can remain on screens with painted
    content right at the edge; installed (full screen) it disappears. `tests/fill.js` guards all of this.
- A new picture: add the `.webp` to `public/img/`, its size to `manifest.json`, run `tools/make_pictures.py`
  (makes the `.avif` copy), then `build.py`. **Never paint words into pictures**; add them with `addText`.
- Every screen except Home needs Home and Back. Back goes to the screen's `parent`.

## 5. What is saved on the phone

All in the browser's storage for this site, labels starting with `tt:`. Nothing is sent anywhere. No cookies.

| Label | Contents |
|---|---|
| `tt:contacts` | Contacts: id, name, WhatsApp number, circle colour, optional small JPEG photo. |
| `tt:pass` | Passcode **fingerprint** only (PBKDF2-SHA256, salted). The passcode itself is never stored. |
| `tt:passlock` | Wrong-try counter and waiting time. |
| `tt:music` | Music on/off. (`tt:music_pos` in session storage: where the melody was.) |
| `tt:bubble`, `tt:bubble:stats` | Bubble Pop level unlocked; Bubble Pop stats. |
| `tt:<game>:game` | A Chess/Checkers game in progress (resume within 60 min of the last move). |
| `tt:<game>:stats`, `tt:<game>:totals` | Last 10 results; running totals (`<game>` = chess, checkers, minesweeper). |
| `tt:minesweeper:best` | Hidden Comets best times (internal name kept so saved progress keeps working). |
| `tt:lastBackup`, `tt:backupSnooze`, `tt:since` | Backup reminder bookkeeping. |
| `tt:noticeDay` | Day the Settings notice was last shown. |

## 6. Security and privacy model

- **No server, no accounts, no analytics.** There is no central data to steal.
- **Application data vs. hosting data** (stated on the Privacy & safety page, `PRIVACY_POINTS` in `settings.js`):
  everything the app saves stays in the phone's browser and is never sent anywhere. Separately, like any website,
  the hosting service (Cloudflare) handles basic technical information (IP address, browser type, time) when files
  are downloaded; that is outside the app and outside the creator's control, covered by the host's own privacy
  policy. Keep this distinction in any public wording: never claim "no data is processed at all".
- **Strict security rules** (`public/_headers`): the page may only load the app's own files; no outside
  scripts, styles, fonts or connections; no other site may show the app inside its page; no camera,
  microphone or location. Code and styles live in files, so no code is allowed inside the page itself.
- **Plain text only**: anything a person types is set with `textContent` (or escaped), never run as code.
- **Contacts**: Loved Ones shows names/photos without a passcode by design; numbers need the passcode.
  Photos are redrawn by the app into a small JPEG (removes location/camera details).
- **Backups**: AES-GCM 256 with a key from the person's password (PBKDF2-SHA256, 210,000 rounds).
  Never contain the passcode. Restore treats every file as untrusted: size limit, allowed labels only,
  every contact re-checked, only app-made photos kept.
- **Offline helper** (`sw.js`): only handles this app's own files, never personal data.
- **Rule for every change**: no personal names, emails, phone numbers or keys anywhere in the project.

## 7. Steady screen (stray touches)

- No dragging, pinch-zoom, bouncing, text selection or long-press menus (`app.css` "Steady screen" + `setupSteadyScreen` in `init.js`).
  Panels and Loved Ones still scroll; typing boxes behave normally.
- The phone's back swipe / back button goes back one screen inside the app; on Home it asks before leaving.
- The phone's own Home gesture (iPhone swipe up) cannot be blocked by any app. The Privacy & safety page explains
  Guided Access (iPhone) and App pinning (Android) for anyone sharing their phone.

## 8. Updates and offline

- `build.py` gives every release a new version. Phones download it quietly; the person sees
  "A new version is ready" **on Home only** and chooses Update now or Later (never forced, never mid-game).
- Pictures, code and fonts carry a fingerprint in their address (`?v=`), so phones can keep them a year and
  still always get changed files.
- **The website address must never change after launch**: people's saved data belongs to that address.

## 9. Releasing a new version

1. Change code in `src/`, run `python3 build.py`, run `node tests/run_all.js` (all must pass).
   **Update the documentation in the same change**: the section notes in the files you touched and this guide
   (file map, saved-data labels, security model, known gaps) whenever they are affected.
2. Commit on a test branch, open a pull request, check the preview on a real phone.
3. Merge after approval; publish on Cloudflare Pages.

## 10. Known gaps and ideas

- The app icon is temporary (cut from the Home picture).
- The Games picture still shows a small painted mine-ball and flag on the Hidden Comets tile.
- The phone's own Home gesture can't be blocked by a web app (use Guided Access / App pinning).
- Before launch: fill in `OFFICIAL_ADDRESS` in `settings.js` and get a short legal review of the Privacy page wording.
- Possible next features: fingerprint/face unlock for Settings, optional usage counts (would need a privacy review).
