"""Subsets the CJK fonts to the glyphs actually used in reel.html.
Usage: python3 subset_fonts.py <dir with full NotoSerifJP-600/900, NotoSerifKR-600, NotoSansJP-900 .ttf>
Writes fonts/*.sub.ttf (requires fonttools: pip install fonttools)."""
import os, sys, subprocess
here = os.path.dirname(os.path.abspath(__file__))
src = sys.argv[1]
text = open(os.path.join(here, 'reel.html'), encoding='utf-8').read()
chars = ''.join(sorted(set(c for c in text if ord(c) > 0x7f))) + ''.join(chr(c) for c in range(0x20, 0x7f))
for name in ['NotoSerifJP-600', 'NotoSerifJP-900', 'NotoSerifKR-600', 'NotoSansJP-900']:
    subprocess.run(['pyftsubset', os.path.join(src, name + '.ttf'), '--text=' + chars,
                    '--output-file=' + os.path.join(here, 'fonts', name + '.sub.ttf'), '--layout-features=*'], check=True)
    print(name, os.path.getsize(os.path.join(here, 'fonts', name + '.sub.ttf')), 'bytes')
