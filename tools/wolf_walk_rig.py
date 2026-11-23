"""Dựng chu kỳ bước đi Lang Vương bằng "xương" từ MỘT khung đứng (24/11).

Lý do: sheet 8 khung ChatGPT vẽ không phải chu kỳ đi thật (chân lẫn nhau, gần như chỉ 1 chân đổi, thân/đầu đổi
từng khung -> giật). Ở đây giữ nguyên thân + đầu của khung gốc, tách 4 chân và tự tính chuyển động từng chân theo
dáng đi bốn chân (lateral walk): sau trái -> trước trái -> sau phải -> trước phải, mỗi chân lệch 1/4 chu kỳ.
  - Pha chạm đất (STANCE): bàn chân lùi đều từ trước ra sau ĐÚNG bằng tốc độ thân tiến -> không trượt chân.
  - Pha vung (1-STANCE): bàn chân nhấc lên (LIFT px) và vung nhanh về trước.
  - Chân xoay quanh khớp trên (lệch theo hàng: hàng trên đứng yên, bàn chân lệch nhiều nhất) -> giống gập chân pixel art.
  - Thân nhún 1 px lúc chân trước vừa đặt xuống (cảm giác nặng).
In ra STRIDE (px màn hình mỗi chu kỳ, với game vẽ boss ×2) để đặt vào config CUTSCENE.MINI.WALK.

Chạy: .venv/Scripts/python.exe tools/wolf_walk_rig.py  (đọc docs/concept/lang_vuong_khung_goc_buoc_di.png, ghi sprites/boss_walk.png/.json)
"""
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image

SRC = Path('docs/concept/lang_vuong_khung_goc_buoc_di.png')
OUT = Path('sprites/boss_walk')
FRAMES = 12
STANCE = 0.62          # tỉ lệ chu kỳ bàn chân chạm đất
REACH = 4.5            # px (sprite): bàn chân lệch tối đa ra trước/sau so với vị trí gốc
LIFT = 2               # px: nhấc chân khi vung
LEG_TOP = 22           # hàng bắt đầu của chân (trên đó là thân)
DRAW_SCALE = 2         # BOSS.DRAW_SCALE trong game
EYE = (38, 12)         # mắt đỏ (khung gốc không có -> vẽ cố định cho khỏi chớp)
# vùng x của từng chân trong khung gốc (đuôi ở x < 11 không phải chân); far = chân phía xa (vẽ sau thân)
LEGS = {  # tên: (x0, x1, pha lệch, far)
    'hind_near': (11, 18, 0.00, False),
    'fore_near': (26, 32, 0.25, False),
    'hind_far': (19, 25, 0.50, True),
    'fore_far': (33, 40, 0.75, True),
}


def foot(ph):
    """(dx, lift) của bàn chân ở pha 0..1 (0 = vừa đặt xuống ở phía trước)."""
    if ph < STANCE:
        u = ph / STANCE
        return REACH * (1 - 2 * u), 0.0
    u = (ph - STANCE) / (1 - STANCE)
    e = u * u * (3 - 2 * u)
    return REACH * (-1 + 2 * e), LIFT * math.sin(math.pi * u)


def main():
    base = np.array(Image.open(SRC).convert('RGBA'))
    H, W = base.shape[:2]
    # mắt đỏ cố định
    base[EYE[1], EYE[0]] = (214, 40, 40, 255)
    body = base.copy()
    legs = {}
    for name, (x0, x1, _, _) in LEGS.items():
        m = np.zeros((H, W), bool)
        m[LEG_TOP:, x0:x1 + 1] = base[LEG_TOP:, x0:x1 + 1, 3] > 0
        legs[name] = m
        body[m] = 0
    pad = 8   # khung rộng thêm để chân vung không bị cắt
    fw, fh = W + pad * 2, H + 1
    sheet = Image.new('RGBA', (fw * FRAMES, fh), (0, 0, 0, 0))
    span = H - 1 - LEG_TOP
    for i in range(FRAMES):
        t = i / FRAMES
        fr = np.zeros((fh, fw, 4), np.uint8)
        # thân nhún 1 px ngay sau khi chân trước (gần hoặc xa) đặt xuống
        bob = 1 if any(((t - LEGS[n][2]) % 1) < 0.17 for n in ('fore_near', 'fore_far')) else 0

        def put(src, mask, dxrow, dyrow, dy0=0):
            ys, xs = np.nonzero(mask)
            for y, x in zip(ys, xs):
                ny, nx = y + dy0 + dyrow(y), x + pad + dxrow(y)
                if 0 <= ny < fh and 0 <= nx < fw:
                    fr[ny, nx] = src[y, x]

        def leg(name):
            ph = (t - LEGS[name][2]) % 1
            dx, lift = foot(ph)
            k = lambda y: (y - LEG_TOP) / span                       # 0 ở khớp trên, 1 ở bàn chân
            put(base, legs[name], lambda y: int(round(dx * k(y))), lambda y: -int(round(lift * k(y))), bob * 0)

        for n in ('hind_far', 'fore_far'):
            leg(n)
        put(body, body[..., 3] > 0, lambda y: 0, lambda y: 0, bob)
        for n in ('hind_near', 'fore_near'):
            leg(n)
        sheet.alpha_composite(Image.fromarray(fr), (i * fw, 0))
    meta = {'frameSize': [fw, fh], 'pivot': [pad + 29, fh - 2], 'image': OUT.name + '.png',
            'frames': {f'MINI_w{i}': [i * fw, 0] for i in range(FRAMES)},
            'source': str(SRC).replace('\\', '/'), 'tool': 'tools/wolf_walk_rig.py'}
    sheet.save(OUT.with_suffix('.png'))
    OUT.with_suffix('.json').write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding='utf-8')
    stride = 2 * REACH / STANCE * DRAW_SCALE
    contacts = sorted(round(LEGS[n][2] * FRAMES) for n in ('fore_near', 'fore_far'))
    print(f'{FRAMES} khung {fw}x{fh} -> {OUT}.png ; STRIDE = {stride:.2f} px màn hình/chu kỳ ; chân trước chạm đất ở khung {contacts}')


if __name__ == '__main__':
    main()
