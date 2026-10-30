#!/usr/bin/env python3
# Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
"""DAILY TAMPER CHECK: does the live site match the approved release?
Compares every file in public/ (the approved, merged version on the main branch) with the same file on the live site.
If anything differs or is missing, it prints what and exits with an error, so the GitHub job fails and GitHub emails
the owner. Run by .github/workflows/live-check.yml once a day; can also be run by hand:
    python3 tools/live_check.py                     (checks https://taarala-thota.pages.dev)
    LIVE_BASE=http://localhost:8765 python3 tools/live_check.py
A difference right after a merge can simply mean Cloudflare is still publishing: run it again a few minutes later.
"""
import hashlib, os, sys, urllib.request

BASE = os.environ.get('LIVE_BASE', 'https://taarala-thota.pages.dev').rstrip('/')
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public')
SKIP = {'_headers'}                     # host settings: used by Cloudflare, never served as a file

def fetch(path):
    req = urllib.request.Request(BASE + '/' + path, headers={'User-Agent': 'taarala-thota-live-check', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()

problems, checked = [], 0
for folder, _, files in os.walk(ROOT):
    for name in sorted(files):
        rel = os.path.relpath(os.path.join(folder, name), ROOT).replace(os.sep, '/')
        if rel in SKIP: continue
        url_path = '' if rel == 'index.html' else rel        # the host serves the page itself at the site address
        want = hashlib.sha256(open(os.path.join(folder, name), 'rb').read()).hexdigest()
        try: got = hashlib.sha256(fetch(url_path)).hexdigest()
        except Exception as e:
            problems.append('MISSING  %s (%s)' % (rel, e)); continue
        checked += 1
        if got != want: problems.append('CHANGED  ' + rel)

if problems:
    print('The live site does NOT match the approved release (%s):' % BASE)
    for p in problems: print('  ' + p)
    sys.exit(1)
print('OK: all %d files on %s match the approved release.' % (checked, BASE))
