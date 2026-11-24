"""Sheet Ma Ảnh Yêu Vương trong trận dựng từ các tư thế cutscene (24/11, người phát triển: "con trong cutscene đẹp hơn").

Bước 1 — vá lỗ: điểm ảnh trong suốt bị thân bao kín (ChatGPT vẽ, cắt ra bị hở) được tô bằng màu trung bình các điểm đục kề bên.
          Ghi đè luôn sprites/boss_intro_final.png (cutscene dùng chung) — chạy lại nhiều lần không đổi kết quả.
Bước 2 — ghi sprites/boss_final:
  FINAL_walk0..7  bay lơ lửng: tư thế hiện chân thân (i2), đuôi khói gợn sóng (càng xuống càng lệch), thân nhấp nhô theo đường cos
  FINAL_atk       gồng chiêu: dang tay (i3)
  FINAL_cast      Triệu Ma Ảnh: chỉ tay + quả cầu ma khí (i5)
  FINAL_hurt      trúng đòn: giật lùi 1 px, đuôi khói lệch mạnh
  meta.eyes[tên khung] = các điểm mắt đỏ (render phát sáng)
Chạy: .venv/Scripts/python.exe tools/yeu_vuong_sheet.py
"""
import json
import math
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

SRC = Path('sprites/boss_intro_final')
OUT = Path('sprites/boss_final')
FLOAT = 8                  # số khung bay
BOB = 2                    # px nhấp nhô
WAVE = 1.6                 # px lệch tối đa ở chót đuôi khói
TAIL_FROM = 0.55           # từ 55% chiều cao trở xuống là đuôi khói


def fill_holes(f):
    """Tô các điểm trong suốt không thông ra mép khung (lỗ kín trong thân)."""
    a = f[..., 3] > 0
    h, w = a.shape
    out = np.zeros((h, w), bool)
    q = deque((i, j) for i in range(h) for j in (0, w - 1) if not a[i, j])
    q.extend((i, j) for j in range(w) for i in (0, h - 1) if not a[i, j])
    for i, j in q:
        out[i, j] = True
    while q:
        i, j = q.popleft()
        for u, v in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
            if 0 <= u < h and 0 <= v < w and not a[u, v] and not out[u, v]:
                out[u, v] = True
                q.append((u, v))
    holes = ~a & ~out
    n = int(holes.sum())
    while holes.any():   # tô dần từ mép lỗ vào trong
        nxt = holes.copy()
        for i, j in np.argwhere(holes):
            nb = [f[u, v, :3] for u, v in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)) if 0 <= u < h and 0 <= v < w and f[u, v, 3] > 0]
            if nb:
                f[i, j, :3] = np.mean(nb, 0).astype(np.uint8)
                f[i, j, 3] = 255
                nxt[i, j] = False
        if (nxt == holes).all():
            break
        holes = nxt
    return n


def drop_specks(f, keep=0.04):
    """Bỏ mảnh vụn rời khỏi thân (cụm điểm đục nhỏ hơn keep × cụm lớn nhất), vd mẩu khói lơ lửng dưới chân."""
    a = f[..., 3] > 0
    h, w = a.shape
    lab = np.zeros((h, w), int)
    sizes = [0]
    for i in range(h):
        for j in range(w):
            if a[i, j] and not lab[i, j]:
                n = len(sizes); sizes.append(0); q = deque([(i, j)]); lab[i, j] = n
                while q:
                    u, v = q.popleft(); sizes[n] += 1
                    for du in (-1, 0, 1):
                        for dv in (-1, 0, 1):
                            y, x = u + du, v + dv
                            if 0 <= y < h and 0 <= x < w and a[y, x] and not lab[y, x]:
                                lab[y, x] = n; q.append((y, x))
    big = max(sizes)
    gone = 0
    for n, sz in enumerate(sizes):
        if n and sz < big * keep:
            f[lab == n, 3] = 0; gone += sz
    return gone


def ripple(f, ph, wave, phase_rows=0.28):
    h, w = f.shape[:2]
    out = np.zeros_like(f)
    y0 = int(h * TAIL_FROM)
    for y in range(h):
        d = 0
        if y >= y0:
            d = int(round(wave * math.sin(2 * math.pi * ph + y * phase_rows) * (y - y0) / (h - y0)))
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


def eyes(f):
    """Điểm mắt đỏ ở nửa trên khung (để render phát sáng)."""
    h = f.shape[0]
    r, g, b, a = (f[..., i].astype(int) for i in range(4))
    pts = np.argwhere((a > 0) & (r > 170) & (g < 90) & (b < 110))
    return [[int(x), int(y)] for y, x in pts if y < h * 0.45]


def main():
    meta = json.loads(SRC.with_suffix('.json').read_text(encoding='utf-8'))
    sheet = np.array(Image.open(SRC.with_suffix('.png')).convert('RGBA'))
    fw, fh = meta['frameSize']
    fixed = specks = 0
    for x, y in meta['frames'].values():   # bước 1: vá lỗ ngay trên sheet cutscene
        cell = sheet[y:y + fh, x:x + fw].copy()
        fixed += fill_holes(cell)
        specks = drop_specks(cell)
        sheet[y:y + fh, x:x + fw] = cell
    Image.fromarray(sheet).save(SRC.with_suffix('.png'))
    frame = lambda n: sheet[meta['frames'][n][1]:meta['frames'][n][1] + fh, meta['frames'][n][0]:meta['frames'][n][0] + fw].copy()

    pad = BOB + 1
    H = fh + pad
    base = frame('FINAL_i2')
    frames = {}

    def put(f, dy=0, dx=0):
        g = np.zeros((H, fw, 4), np.uint8)
        g[pad:] = f
        return shift(g, dx, dy)

    for k in range(FLOAT):
        ph = k / FLOAT
        frames[f'FINAL_walk{k}'] = put(ripple(base, ph, WAVE), -int(round(BOB * (1 - math.cos(2 * math.pi * ph)) / 2)))
    frames['FINAL_atk'] = put(frame('FINAL_i3'), -1)
    frames['FINAL_cast'] = put(frame('FINAL_i5'), -1)
    frames['FINAL_hurt'] = put(ripple(base, 0.25, WAVE * 1.8), 0, -1)
    out = Image.new('RGBA', (fw * len(frames), H), (0, 0, 0, 0))
    m = {'frameSize': [fw, H], 'pivot': [meta['pivot'][0], meta['pivot'][1] + pad], 'image': OUT.name + '.png', 'frames': {}, 'eyes': {},
         'float': FLOAT, 'source': str(SRC).replace('\\', '/') + '.png', 'tool': 'tools/yeu_vuong_sheet.py'}
    for i, (n, f) in enumerate(frames.items()):
        out.alpha_composite(Image.fromarray(f), (i * fw, 0))
        m['frames'][n] = [i * fw, 0]
        m['eyes'][n] = eyes(f)
    out.save(OUT.with_suffix('.png'))
    OUT.with_suffix('.json').write_text(json.dumps(m, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'vá {fixed} điểm lỗ; {len(frames)} khung {fw}x{H} -> {OUT}.png; mắt: ' + ', '.join(f'{k}:{len(v)}' for k, v in m['eyes'].items()))


if __name__ == '__main__':
    main()
