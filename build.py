#!/usr/bin/env python3
# Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
"""Builds public/index.html from the pieces in src/.
Run:  python3 build.py
Everything the app needs is inside this project: no outside scripts, styles or fonts."""
import json, hashlib, os

STAMP = 'Taarala Thota (Garden of Stars) \u00a9 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.'
# each source file starts with the copyright line; it is taken out when joining and written once at the top of each built file
def src(n): return open(os.path.join('src', n), encoding='utf-8').read().replace('// ' + STAMP + '\n', '').replace('/* ' + STAMP + ' */\n', '')

# picture sizes [width, height]
pic = json.load(open('manifest.json'))
# short fingerprint of every picture: when a picture changes, its address changes, so phones fetch the new one
ver = {}
for n in pic:
    for ext in ('webp', 'avif'):
        p = os.path.join('public', 'img', n + '.' + ext)
        if os.path.exists(p): ver.setdefault(n, {})[ext] = hashlib.md5(open(p, 'rb').read()).hexdigest()[:8]
        else: print('note: missing picture', n + '.' + ext)

# fonts kept inside the app (public/fonts). Only fonts that are present are declared.
# weight ranges match what the app used before (Caveat 500-700, Fraunces 400-600), so text looks the same
FONTS = [  # (family, file, weight range, style)
    ('Caveat', 'caveat.woff', '500 700', 'normal'),
    ('Fraunces', 'fraunces.woff', '400 600', 'normal'),
    ('Fraunces', 'fraunces-italic.woff', '400 400', 'italic'),
]
font_css = ''
for fam, f, w, st in FONTS:
    p = os.path.join('public', 'fonts', f)
    if os.path.exists(p):
        h = hashlib.md5(open(p, 'rb').read()).hexdigest()[:8]
        font_css += "@font-face{font-family:'%s';src:url('fonts/%s?v=%s') format('woff');font-weight:%s;font-style:%s;font-display:swap;}\n" % (fam, f, h, w, st)
    else:
        print('note: font file missing, system font used instead:', f)

head = '''<!DOCTYPE html>
<!-- ''' + STAMP + ''' -->
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Taarala Thota">  <!-- Home Screen label: kept short, phones cut long names -->
<meta name="theme-color" content="#05060f">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="referrer" content="no-referrer">
<title>Taarala Thota · Garden of Stars</title>'''

APP_RELEASE = json.load(open(os.path.join('src', 'whats_new.json'), encoding='utf-8'))[0]['date']
js = '\n'.join([
    '// ' + STAMP,
    "const APP_RELEASE = '%s';   // this version's release label (newest entry in src/whats_new.json)" % APP_RELEASE,
    src('core.js').replace('/*PIC_JSON*/{}', json.dumps(pic)).replace('/*VER_JSON*/{}', json.dumps(ver)),
    src('helpers.js'), src('contacts.js'), src('audio.js'), src('gamekit.js'), src('screens_main.js'), src('settings.js'), src('backup.js'), src('pwa.js'), src('bubble.js'), src('mine.js'),
    src('chess_engine.js'), src('checkers_engine.js'), src('chess_ui.js'), src('checkers_ui.js'), src('qr.js'), src('init.js'),
    'detectAvif(bootApp);'
])
# code and styles live in their own files, so the strict security rules can forbid any code inside the page
css = '/* ' + STAMP + ' */\n' + font_css + src('app.css')
def write(name, text):
    open(os.path.join('public', name), 'w', encoding='utf-8', newline='\n').write(text)
    return name + '?v=' + hashlib.md5(text.encode('utf-8')).hexdigest()[:8]
css_url, js_url = write('app.css', css), write('app.js', js + '\n')
html = head + '\n<link rel="stylesheet" href="' + css_url + '">\n<script src="' + js_url + '" defer></script>\n</head>\n<body>\n</body>\n</html>\n'
os.makedirs('public', exist_ok=True)
open(os.path.join('public', 'index.html'), 'w', encoding='utf-8', newline='\n').write(html)
print('wrote public/index.html', len(html.encode('utf-8')), 'bytes')

# ---- installable app: manifest + offline helper (service worker) ----
# The page is kept as './' (not 'index.html'): Cloudflare redirects index.html to ./, and browsers refuse to show a redirected page from the offline copy.
manifest = {
    'name': 'Taarala Thota \u00b7 Garden of Stars', 'short_name': 'Taarala Thota',
    'description': 'A calm, ad-free garden of games and a private loved-ones shortcut. No sign-in, no ads and no tracking in the app; everything you save stays on your phone.',
    'start_url': './', 'scope': './', 'display': 'standalone', 'orientation': 'portrait',
    'background_color': '#05060f', 'theme_color': '#05060f',
    'icons': [{'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
              {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
              {'src': 'icons/icon-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}]}
open(os.path.join('public', 'manifest.webmanifest'), 'w', encoding='utf-8', newline='\n').write(json.dumps(manifest, indent=1, ensure_ascii=False))
core = ['./', css_url, js_url, 'manifest.webmanifest', 'icons/icon-192.png', 'icons/apple-touch-icon.png']
core += ["fonts/%s?v=%s" % (f, hashlib.md5(open(os.path.join('public', 'fonts', f), 'rb').read()).hexdigest()[:8]) for _, f, _, _ in FONTS if os.path.exists(os.path.join('public', 'fonts', f))]
assets = sorted('img/%s.%s?v=%s' % (n, ext, h) for n in ver for ext, h in ver[n].items())
version = hashlib.sha256((html + css + js + json.dumps(core) + json.dumps(assets) + json.dumps(manifest)).encode('utf-8')).hexdigest()[:12]
# release notes: src/whats_new.json (newest first; "date" is the release label, e.g. 2026-10-30, or 2026-10-30b for a
# second release that day). All entries travel inside the new version's offline helper, so "What's new" can show every
# release the person hasn't installed yet, even if they skipped some. All entries also become CHANGELOG.md.
releases = json.load(open(os.path.join('src', 'whats_new.json'), encoding='utf-8'))
notes = [{'release': str(r['date']), 'notes': [str(n) for n in r['notes']][:8]} for r in releases]   # every release, newest first
with open('CHANGELOG.md', 'w', encoding='utf-8', newline='\n') as ch:
    ch.write('# Changelog\n\nWhat changed in each release of Taarala Thota (Garden of Stars), newest first.\n'
             'Before updating, the app\u2019s "What\u2019s new" shows the entries newer than the version on the phone.\n')
    for r in releases: ch.write('\n## ' + r['date'] + '\n\n' + ''.join('- ' + n + '\n' for n in r['notes']))
version = hashlib.sha256((version + json.dumps(notes)).encode('utf-8')).hexdigest()[:12]
sw = '// ' + STAMP + '\n' + src('sw.js').replace('__NOTES__', json.dumps(notes, ensure_ascii=False)).replace('__VERSION__', version).replace('__CORE__', json.dumps(core)).replace('__ASSETS__', json.dumps(assets))
open(os.path.join('public', 'sw.js'), 'w', encoding='utf-8', newline='\n').write(sw)
print('wrote public/sw.js (version %s, %d core files, %d pictures)' % (version, len(core), len(assets)))
