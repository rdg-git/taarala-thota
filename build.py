#!/usr/bin/env python3
"""Builds public/index.html from the pieces in src/.
Run:  python3 build.py
Everything the app needs is inside this project: no outside scripts, styles or fonts."""
import json, hashlib, os

def src(n): return open(os.path.join('src', n), encoding='utf-8').read()

# picture sizes [width, height]; Hard Hidden-Comets reuses the Medium picture
pic = json.load(open('manifest.json'))
pic['ms-hard'] = pic['ms-medium']
# short fingerprint of every picture: when a picture changes, its address changes, so phones fetch the new one
ver = {}
for n in pic:
    p = os.path.join('public', 'img', n + '.webp')
    if os.path.exists(p): ver[n] = hashlib.md5(open(p, 'rb').read()).hexdigest()[:8]
ver['ms-hard'] = ver.get('ms-medium', '')

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
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Taarala Thota">
<meta name="theme-color" content="#FFF8E7">
<meta name="referrer" content="no-referrer">
<title>Taarala Thota</title>'''

js = '\n'.join([
    src('core.js').replace('/*PIC_JSON*/{}', json.dumps(pic)).replace('/*VER_JSON*/{}', json.dumps(ver)),
    src('helpers.js'), src('contacts.js'), src('audio.js'), src('gamekit.js'), src('screens_main.js'), src('settings.js'), src('bubble.js'), src('mine.js'),
    src('chess_engine.js'), src('checkers_engine.js'), src('chess_ui.js'), src('checkers_ui.js'), src('init.js'),
    'bootApp();'
])
html = head + '\n<style>\n' + font_css + src('app.css') + '\n</style>\n</head>\n<body>\n<script>\n' + js + '\n</script>\n</body>\n</html>\n'
os.makedirs('public', exist_ok=True)
open(os.path.join('public', 'index.html'), 'w', encoding='utf-8', newline='\n').write(html)
print('wrote public/index.html', len(html.encode('utf-8')), 'bytes')
