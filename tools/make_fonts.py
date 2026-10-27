#!/usr/bin/env python3
# Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
"""Rebuilds public/fonts/*.woff from the official Google Fonts downloads (SIL Open Font License).
Usage: python3 tools/make_fonts.py <folder with Caveat/ and Fraunces/ from fonts.google.com>
Keeps only Latin letters and the weights the app uses, so the files stay small."""
import io, os, sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset
src_dir = sys.argv[1]
out = os.path.join(os.path.dirname(__file__), '..', 'public', 'fonts')
U = list(range(0x0000, 0x0100)) + [0x0131, 0x0152, 0x0153, 0x02BB, 0x02BC, 0x02C6, 0x02DA, 0x02DC, 0x0304, 0x0308, 0x0329] + \
    list(range(0x2000, 0x2070)) + [0x2074, 0x20AC, 0x2122, 0x2191, 0x2193, 0x2212, 0x2215, 0xFEFF, 0xFFFD]
JOBS = [
    ('Caveat/Caveat-VariableFont_wght.ttf', {'wght': (500, 700)}, 'caveat.woff'),
    ('Fraunces/Fraunces-VariableFont_SOFT,WONK,opsz,wght.ttf', {'wght': (400, 600), 'SOFT': 0, 'WONK': 1}, 'fraunces.woff'),
    ('Fraunces/Fraunces-Italic-VariableFont_SOFT,WONK,opsz,wght.ttf', {'wght': 400, 'SOFT': 0, 'WONK': 1}, 'fraunces-italic.woff'),
]
for src, limits, name in JOBS:
    f = instancer.instantiateVariableFont(TTFont(os.path.join(src_dir, src)), limits)
    buf = io.BytesIO(); f.save(buf); buf.seek(0); f = TTFont(buf)
    o = subset.Options(); o.flavor = 'woff'; o.layout_features = ['*']; o.name_IDs = ['*']; o.name_languages = ['*']; o.notdef_outline = True
    s = subset.Subsetter(o); s.populate(unicodes=U); s.subset(f)
    f.flavor = 'woff'; f.save(os.path.join(out, name)); print('wrote', name)
