"""Sheet Ma Ảnh Yêu Vương trong trận dựng từ các tư thế cutscene (24/11, người phát triển: "con trong cutscene đẹp hơn").

Đọc sprites/boss_intro_final (6 tư thế ChatGPT vẽ, đã cắt đúng cỡ boss trong trận) và ghi sprites/boss_final:
  FINAL_walk0..3  bay lơ lửng: tư thế hiện chân thân (i2), đuôi khói gợn sóng (càng xuống càng lệch) + thân nhấp nhô
  FINAL_atk       gồng chiêu: dang tay (i3)
  FINAL_cast      Triệu Ma Ảnh: chỉ tay + quả cầu ma khí (i5)
  FINAL_hurt      trúng đòn: i2 giật lùi 1 px, đuôi khói lệch
Chạy: .venv/Scripts/python.exe tools/yeu_vuong_sheet.py
"""
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image

SRC = Path('sprites/boss_intro_final')
OUT = Path('sprites/boss_final')
BOB = [0, -1, -2, -1]      # px nhấp nhô theo khung bay
WAVE = 1.6                 # px lệch tối đa ở chót đuôi khói
TAIL_FROM = 0.55           # từ 55% chiều cao trở xuống là đuôi khói


def frame(sheet, meta, name):
    x, y = meta['frames'][name]
    fw, fh = meta['frameSize']
    return np.array(sheet.crop((x, y, x + fw, y + fh)))


def ripple(f, k, wave, phase_rows=0.28):
    h, w = f.shape[:2]
    out = np.zeros_like(f)
    y0 = int(h * TAIL_FROM)
    for y in range(h):
        d = 0
        if y >= y0:
            d = int(round(wave * math.sin(2 * math.pi * k / 4 + y * phase_rows) * (y - y0) / (h - y0)))
        if d >= 0:
            out[y, d:] = f[y, :w - d]
        else:
            out[y, :w + d] = f[y, -d:]
    return out


def shift(f, dx, dy):
    out = np.zeros_like(f)
    h, w = f.shape[:2]
    ys, yd = (slice(0, h - dy), slice(dy, h)) if dy >= 0 else (slice(-dy, h), slice(0, h + dy))
    xs, xd = (slice(0, w - dx), slice(dx, w)) if dx >= 0 else (slice(-dx, w), slice(0, w + dx))
    out[yd, xd] = f[ys, xs]
    return out


def main():
    meta = json.loads(SRC.with_suffix('.json').read_text(encoding='utf-8'))
    sheet = Image.open(SRC.with_suffix('.png')).convert('RGBA')
    fw, fh = meta['frameSize']
    pad = 3   # chỗ cho nhấp nhô lên trên
    H = fh + pad
    base = frame(sheet, meta, 'FINAL_i2')
    frames = {}
    for k in range(4):
        f = ripple(base, k, WAVE)
        g = np.zeros((H, fw, 4), np.uint8); g[pad:] = f
        frames[f'FINAL_walk{k}'] = shift(g, 0, BOB[k])
    for name, src in (('FINAL_atk', 'FINAL_i3'), ('FINAL_cast', 'FINAL_i5')):
        g = np.zeros((H, fw, 4), np.uint8); g[pad:] = frame(sheet, meta, src); frames[name] = shift(g, 0, -1)
    g = np.zeros((H, fw, 4), np.uint8); g[pad:] = ripple(base, 1, WAVE * 1.6); frames['FINAL_hurt'] = shift(g, -1, 0)
    out = Image.new('RGBA', (fw * len(frames), H), (0, 0, 0, 0))
    m = {'frameSize': [fw, H], 'pivot': [meta['pivot'][0], meta['pivot'][1] + pad], 'image': OUT.name + '.png', 'frames': {},
         'source': str(SRC).replace('\\', '/') + '.png', 'tool': 'tools/yeu_vuong_sheet.py'}
    for i, (n, f) in enumerate(frames.items()):
        out.alpha_composite(Image.fromarray(f), (i * fw, 0))
        m['frames'][n] = [i * fw, 0]
    out.save(OUT.with_suffix('.png'))
    OUT.with_suffix('.json').write_text(json.dumps(m, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'{len(frames)} khung {fw}x{H} -> {OUT}.png')


if __name__ == '__main__':
    main()
