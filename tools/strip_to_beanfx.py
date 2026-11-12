"""Chuyển dải khung (strip ngang) của một draft beanfx sang định dạng sheet + JSON mà lib/beanfx.js đọc được.

    .venv/Scripts/python tools/strip_to_beanfx.py <strip_color.png> <strip_light.png|-> <tên> <w> <h> <fps> <pivot_x> <pivot_y> [loop]

Ghi fx/<tên>.json, fx/<tên>_color.png, fx/<tên>_light.png (trong suốt nếu '-'), fx/<tên>.png (= màu, dùng khi tắt lớp sáng).
Kiểm tra: số khung khớp bề rộng, không khung nào chạm mép (giống export.check của beanfx).
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
COLS = 10


def to_grid(strip, w, h, n):
    rows = (n + COLS - 1) // COLS
    out = np.zeros((rows * h, COLS * w, 4), np.uint8)
    for i in range(n):
        r, c = divmod(i, COLS)
        out[r * h:(r + 1) * h, c * w:(c + 1) * w] = strip[:, i * w:(i + 1) * w]
    return out


def main():
    color_p, light_p, name, w, h, fps, px, py = sys.argv[1:9]
    loop = len(sys.argv) > 9 and sys.argv[9] == 'loop'
    w, h, fps, px, py = int(w), int(h), int(fps), int(px), int(py)
    col = np.array(Image.open(color_p).convert('RGBA'))
    if col.shape[0] != h or col.shape[1] % w:
        sys.exit(f'kích thước dải {col.shape[1]}x{col.shape[0]} không chia hết cho ô {w}x{h}')
    n = col.shape[1] // w
    lig = np.array(Image.open(light_p).convert('RGBA')) if light_p != '-' else np.zeros_like(col)
    bad = []
    for i in range(n):
        a = col[:, i * w:(i + 1) * w, 3] > 0
        if a[0].any() or a[-1].any() or a[:, 0].any() or a[:, -1].any():
            bad.append(i)
    if bad:
        sys.exit(f'khung chạm mép: {bad}')
    out = ROOT / 'fx'
    gc, gl = to_grid(col, w, h, n), to_grid(lig, w, h, n)
    Image.fromarray(gc).save(out / f'{name}_color.png')
    Image.fromarray(gl).save(out / f'{name}_light.png')
    Image.fromarray(gc).save(out / f'{name}.png')
    frames = [{'filename': f'{name} {i}', 'frame': {'x': (i % COLS) * w, 'y': (i // COLS) * h, 'w': w, 'h': h}, 'rotated': False,
               'trimmed': False, 'spriteSourceSize': {'x': 0, 'y': 0, 'w': w, 'h': h}, 'sourceSize': {'w': w, 'h': h},
               'duration': round(1000 / fps)} for i in range(n)]
    meta = {'app': 'beanfx', 'version': '1', 'image': f'{name}.png', 'format': 'RGBA8888', 'size': {'w': gc.shape[1], 'h': gc.shape[0]},
            'scale': '1', 'frameTags': [{'name': name, 'from': 0, 'to': n - 1, 'direction': 'forward'}],
            'beanfx': {'name': name, 'fps': fps, 'loop': loop, 'end': 'loop' if loop else 'remove', 'frames': n, 'rows': 1,
                       'frameSize': [w, h], 'pivot': [px, py], 'columns': COLS, 'blend_light': 'add', 'light_gain': 1.0,
                       'sheet': f'{name}.png', 'light': f'{name}_light.png', 'color': f'{name}_color.png'}}
    (out / f'{name}.json').write_text(json.dumps({'frames': frames, 'meta': meta}, indent=1), encoding='utf-8')
    print(f'ok: {name} {n} khung {w}x{h} @ {fps} fps -> fx/{name}.json')


if __name__ == '__main__':
    main()
