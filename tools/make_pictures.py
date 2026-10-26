#!/usr/bin/env python3
"""Makes the smaller AVIF copy of every picture in public/img (the WebP files stay as the fallback).
Usage: python3 tools/make_pictures.py      (needs Pillow with AVIF support)
Quality 62 was chosen after a side-by-side check: same look, about a third smaller."""
import glob, os
from PIL import Image
for f in sorted(glob.glob(os.path.join(os.path.dirname(__file__), '..', 'public', 'img', '*.webp'))):
    out = f[:-5] + '.avif'
    Image.open(f).convert('RGB').save(out, 'AVIF', quality=62, speed=4)
    print('wrote', os.path.basename(out))
