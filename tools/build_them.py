"""M8-15a: thềm đá dưới công trình (ChatGPT vẽ: docs/concept/tong_mon_them_chatgpt.png, 2 ô: ngang | vuông).
Làm sạch từng ô một độ thu riêng (sprite_clean), gộp thành sprites/tm_them.png + .json (frames them_ngang, them_vuong).
Dùng: .venv/Scripts/python.exe tools/build_them.py
"""
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = 'docs/concept/tong_mon_them_chatgpt.png'
ITEMS = [('them_ngang', 'them_ngang -', 4.9), ('them_vuong', '- them_vuong', 5.0)]


def main():
    tmp = Path(tempfile.mkdtemp()); parts = {}
    for name, grid, sc in ITEMS:
        nf = tmp / f'{name}.txt'; nf.write_text(grid, encoding='utf-8'); out = tmp / name
        subprocess.run([sys.executable, str(ROOT / 'tools/sprite_clean.py'), str(ROOT / SRC), '--cols', '2', '--rows', '1', '--names', str(nf),
                        '--out', str(out), '--scale', str(sc), '--colors', '48', '--tol', '60'], check=True, capture_output=True,
                       env=dict(os.environ, PYTHONIOENCODING='utf-8'))
        meta = json.loads((tmp / f'{name}.json').read_text(encoding='utf-8')); fw, fh = meta['frameSize']; x, y = meta['frames'][name]
        im = Image.open(tmp / f'{name}.png').convert('RGBA').crop((x, y, x + fw, y + fh))
        a = np.array(im); r, g, b = [a[..., i].astype(int) for i in range(3)]
        a[(r - g > 40) & (b - g > 30), 3] = 0   # viền ám magenta
        im = Image.fromarray(a); im = im.crop(im.getbbox()); parts[name] = im
        print(name, im.size)
    fw = max(p.width for p in parts.values()); fh = max(p.height for p in parts.values())
    sheet = Image.new('RGBA', (fw * len(parts), fh), (0, 0, 0, 0)); frames = {}
    for i, (n, p) in enumerate(parts.items()):
        sheet.alpha_composite(p, (i * fw, 0)); frames[n] = [i * fw, 0]
    sheet.save(ROOT / 'sprites/tm_them.png')
    (ROOT / 'sprites/tm_them.json').write_text(json.dumps({'frameSize': [fw, fh], 'pivot': [fw // 2, fh - 1], 'image': 'tm_them.png', 'source': SRC,
                                                           'tool': 'tools/build_them.py', 'frames': frames}, ensure_ascii=False, indent=1), encoding='utf-8')


if __name__ == '__main__':
    main()
