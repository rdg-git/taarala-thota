# Taarala Thota · Garden of Stars — Developer Guide

A calm, ad-free set of games plus a private "loved ones" shortcut to WhatsApp.
No sign-in, no ads, no personal tracking: everything a person saves stays in their own phone's browser. The only server code
is one small function that receives anonymous feedback (section 6).
The only outside service is anonymous visit counting (Cloudflare Web Analytics), with an off switch (section 6).
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
| `functions/api/feedback.js` | The only server code: receives anonymous feedback and stores it in the `FEEDBACK_DB` database (Cloudflare D1). Runs on Cloudflare Pages Functions. |
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
| `settings.js` | Settings screen (passcode pages, contacts, backups, erase) and the Privacy & Safety page. |
| `backup.js` | Locked backup files, safe restore, 6-day backup reminder. |
| `visits.js` | Anonymous visit counting (Cloudflare Web Analytics): loaded only when allowed, only on the official address; the on/off switch used on Privacy & Safety and in Settings; Global Privacy Control respected. |
| `tour.js` | "Take A Tour": a playing walkthrough on the real screens (pretend finger, captions, player bar with pause, 5-second back/forward, drag bar, speed and music). Started from the card at the top of Privacy & Safety and under App update in Settings. Looks only: a cover blocks taps, nothing is saved, and it returns to where it started. Scenes are listed in `TOUR_SCENES`; `?tourrec` (test mode) hides the player bar for recording the video. |
| `pwa.js` | Installable app: registers the offline helper, keeps pictures for offline play, "new version ready" card. |
| `bubble.js` | Bubble Pop (3 levels of 2 minutes, all open; accuracy goals 95/98/100 % earn a gold star; bubbles cross in 6.0 / 4.8 / 3.7 s, a new one about every 0.75 s). |
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
| `tt:welcome` | The one-time welcome note was seen (visit counting starts only after this). Reset by "Erase All". |
| `tt:count` | Visit counting choice (`"off"` = don't count). In backups; kept by "Forgot Passcode"; reset by "Erase All". |
| `tt:music` | Music on/off. (`tt:music_pos` in session storage: where the melody was.) |
| `tt:bubble`, `tt:bubble:stats` | Bubble Pop: level Continue plays next and completed levels (stars); Bubble Pop stats. |
| `tt:<game>:game` | A Chess/Checkers game in progress (resume within 60 min of the last move). |
| `tt:<game>:stats`, `tt:<game>:totals` | Last 10 results; running totals (`<game>` = chess, checkers, minesweeper). |
| `tt:minesweeper:best` | Hidden Comets best times (internal name kept so saved progress keeps working). |
| `tt:lastBackup`, `tt:backupSnooze`, `tt:since` | Backup reminder bookkeeping. |
| `tt:noticeDay` | Day the Settings notice was last shown. |

## 6. Security and privacy model

- **No accounts, and no server for personal data.** There is no central store of people's data to steal.
- **Anonymous feedback** (`functions/api/feedback.js`, screen in `settings.js`): one box, opened from Privacy & Safety and
  Settings. Only the message and the app release are sent. Stored: time, release, source (app/preview), message. Never
  stored: name, email, IP, browser details. Accepted only from the app's own addresses; at most 10,000 characters; at most
  300 messages a day in total. Setup: a Cloudflare D1 database (`taarala-feedback`) bound to the Pages project as
  `FEEDBACK_DB` (Production and Preview). Read messages in the Cloudflare dashboard: D1 → taarala-feedback → Console:
  `SELECT * FROM feedback ORDER BY id DESC;`
- **Anonymous visit counting** (`visits.js`): Cloudflare Web Analytics counts visits, referrers, countries and device types
  (by Cloudflare's description: no cookies or phone storage, no fingerprinting, no unique-visitor tracking). No in-app events
  are ever sent. The app loads the counting code itself and only when allowed: never on test previews or local machines,
  never when the person switched it off (switch on Privacy & Safety and in Settings, every change confirmed), never when the
  browser sends Global Privacy Control. `WA_TOKEN` in `visits.js` holds the Cloudflare site token (public). Do not also turn on
  Cloudflare's automatic Web Analytics for the Pages project: it would ignore the switch.
- **Application data vs. hosting data** (stated on the Privacy & Safety page, `PRIVACY_POINTS` in `settings.js`):
  everything the app saves stays in the phone's browser and is never sent anywhere. Separately, like any website,
  the hosting service (Cloudflare) handles basic technical information (IP address, browser type, time) when files
  are downloaded; that is outside the app and outside the creator's control, covered by the host's own privacy
  policy. Keep this distinction in any public wording: never claim "no data is processed at all".
- **Strict security rules** (`public/_headers`): the page may only load the app's own files; no outside
  scripts, styles, fonts or connections (one exception: Cloudflare's visit-counting script and its counting address); no other site may show the app inside its page; no camera,
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
  Exception: Settings and Privacy & Safety allow two-finger zoom (`allowZoom` in `init.js`).
  Panels and Loved Ones still scroll; typing boxes behave normally.
- The phone's back swipe / back button goes back one screen inside the app; on Home it asks before leaving.
- The phone's own Home gesture (iPhone swipe up) cannot be blocked by any app. The Privacy & Safety page explains
  Guided Access (iPhone) and App pinning (Android) for anyone sharing their phone.

## 8. Updates and offline

- `build.py` gives every release a new version. Phones download it quietly; the person sees
  "A new version is ready" **on Home only** and chooses Update Now or Later (never forced, never mid-game).
- Pictures, code and fonts carry a fingerprint in their address (`?v=`), so phones can keep them a year and
  still always get changed files.
- **The website address must never change after launch**: people's saved data belongs to that address.

## 9. Releasing a new version

1. Change code in `src/`, run `python3 build.py`, run `node tests/run_all.js` (all must pass).
   **Update the documentation in the same change**: the section notes in the files you touched and this guide
   (file map, saved-data labels, security model, known gaps) whenever they are affected.
2. Commit on a test branch, open a pull request, check the preview on a real phone.
3. Merge after approval; publish on Cloudflare Pages.

## 10. Known limitations, risks and ideas

Found in the security and quality review (28 Oct 2026). Each item says what remains and why.

**Accepted by design (disclosed)**
- **Contact numbers are protected by the app's screens, not encrypted.** The passcode stops anyone seeing or changing
  numbers inside the app, but they are stored readable in the browser's storage. Someone with technical skills and
  access to the unlocked device could read them with browser developer tools (easy on a computer, hard on a phone).
  Encrypting them would mean asking for the passcode on every call from Loved Ones, which defeats the purpose.
- **No recovery without a backup.** Nothing is stored anywhere else, so cleared browser data cannot be recovered
  except from the person's own backup file (6-day reminder; Privacy & Safety point 11).
- **The phone's own Home gesture can't be blocked** by a web app; Guided Access / App pinning are explained instead.
- **One-time picture download (about 5 MB)** on the first visit so every game works offline; it counts toward mobile
  data. Explained on the Privacy & Safety page.

**Open, worth improving**
- **Automated tests run in Chromium only** (Chrome, Edge, Android). iPhone Safari is checked by hand on a real phone.
- **Two-finger zoom is off on game screens** (steady screen). It is allowed on Settings and Privacy & Safety only, so
  people who need larger text can zoom there. A "larger text" setting would help further.
- **Security rules allow inline styles** (`style-src 'unsafe-inline'`; scripts are still strictly limited to the app's
  own files). Low risk; tightening needs every style attribute moved into the stylesheet.

**Done before launch** (October 2026)
- Privacy & Safety wording self-reviewed against what the app does (not a legal review). `OFFICIAL_ADDRESS` is
  taarala-thota.pages.dev.
- New painted app icon (public/icons, all sizes); the Hidden Comets tile on the Games picture shows a comet and a star.
- README, product documentation (docs/), tour video (docs/media) and LICENSE (all rights reserved).
- Daily tamper check added (see below).
- Still to do at launch: GitHub branch protection and secret scanning; delete the old test site.

**Daily tamper check** (`.github/workflows/live-check.yml` + `tools/live_check.py`): once a day GitHub compares every
file on the live site with the approved release on `main`. If anything differs or is missing, the job fails and GitHub
emails the owner. Run it by hand from GitHub → Actions → "Daily live check" → Run workflow. A failure right after a
merge can just mean Cloudflare is still publishing: run it again a few minutes later.

**Small tidy-ups**
- `tests/update_ui.js` and `tests/update_badge.js` overlap and could be merged.

**Ideas**
- Fingerprint / face unlock for Settings; a "larger text" setting; friendly challenges between people in Loved Ones
  (needs a server and a fresh privacy review); optional usage counts (would need a privacy review).
