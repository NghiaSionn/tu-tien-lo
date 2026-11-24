"""Dựng chu kỳ bước đi Lang Vương bằng "xương" từ MỘT khung đứng (24/11).

Lý do: sheet 8 khung ChatGPT vẽ không phải chu kỳ đi thật (chân lẫn nhau, gần như chỉ 1 chân đổi, thân/đầu đổi
từng khung -> giật). Ở đây giữ nguyên thân + đầu của khung gốc, tách 4 chân và tự tính chuyển động từng chân theo
dáng đi bốn chân (lateral walk): sau trái -> trước trái -> sau phải -> trước phải, mỗi chân lệch 1/4 chu kỳ.
  - Pha chạm đất (STANCE): bàn chân lùi đều từ trước ra sau ĐÚNG bằng tốc độ thân tiến -> không trượt chân.
  - Pha vung (1-STANCE): bàn chân nhấc lên (LIFT px) và vung nhanh về trước.
  - Chân xoay quanh khớp trên (lệch theo hàng: hàng trên đứng yên, bàn chân lệch nhiều nhất) -> giống gập chân pixel art.
  - Thân nhún 1 px lúc chân trước vừa đặt xuống (cảm giác nặng).
In ra STRIDE (px màn hình mỗi chu kỳ, với game vẽ boss ×2) để đặt vào config.

Chạy: .venv/Scripts/python.exe tools/wolf_walk_rig.py MINI MINI2
  MINI  -> sprites/boss_walk   (cutscene Lang Vương, khung gốc docs/concept/lang_vuong_khung_goc_buoc_di.png)
  MINI2 -> sprites/boss_mini2  (24/11 Lang Vương pha 2 "Huyết Nguyệt Cuồng Lang": 12 khung đi + gồng + hú)
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

FRAMES = 12
STANCE = 0.62          # tỉ lệ chu kỳ bàn chân chạm đất
REACH = 4.5            # px (sprite): bàn chân lệch tối đa ra trước/sau so với vị trí gốc
LIFT = 2               # px: nhấc chân khi vung
DRAW_SCALE = 2         # BOSS.DRAW_SCALE trong game
# Mỗi bộ xương: khung gốc (file, hoặc (sheet đã cắt không đuôi, tên khung)), nơi ghi, tiền tố tên khung, cột pivot,
# hàng bắt đầu chân, mắt đỏ cố định (None = khung gốc đã có), vùng x từng chân (tên: (x0, x1, pha lệch)).
# far = chân phía xa (vẽ sau thân). Đuôi nằm ngoài các vùng chân. extras: khung thêm (gồng/hú) từ sheet đã cắt, cùng pivot.
RIGS = {
    'MINI': {
        'src': 'docs/concept/lang_vuong_khung_goc_buoc_di.png', 'out': 'sprites/boss_walk', 'prefix': 'MINI_w', 'pivot_x': 29,
        'leg_top': 22, 'eye': (38, 12),
        'legs': {'hind_near': (11, 18, 0.00), 'fore_near': (26, 32, 0.25), 'hind_far': (19, 25, 0.50), 'fore_far': (33, 40, 0.75)},
    },
    'MINI2': {
        'src': ('docs/concept/lang_vuong_pha2_cat', 'MINI2_base'), 'out': 'sprites/boss_mini2', 'prefix': 'MINI2_walk', 'pivot_x': 29,
        'leg_top': 27, 'eye': None,
        'legs': {'hind_near': (13, 21, 0.00), 'fore_near': (30, 39, 0.25), 'hind_far': (22, 29, 0.50), 'fore_far': (40, 51, 0.75)},
        'extras': ['MINI2_atk', 'MINI2_howl'],
        'eyes': {'MINI2_walk': [[56, 13]], 'MINI2_atk': [[51, 12]], 'MINI2_howl': [[54, 6]]},   # mắt đỏ (đo trên sheet ra) -> render kéo vệt
    },
}


def foot(ph):
    """(dx, lift) của bàn chân ở pha 0..1 (0 = vừa đặt xuống ở phía trước)."""
    if ph < STANCE:
        u = ph / STANCE
        return REACH * (1 - 2 * u), 0.0
    u = (ph - STANCE) / (1 - STANCE)
    e = u * u * (3 - 2 * u)
    return REACH * (-1 + 2 * e), LIFT * math.sin(math.pi * u)


def load_frame(src):
    if isinstance(src, str):
        return np.array(Image.open(src).convert('RGBA')), None
    path, name = src
    meta = json.loads(Path(path + '.json').read_text(encoding='utf-8'))
    sh = np.array(Image.open(path + '.png').convert('RGBA'))
    (x, y), (fw, fh) = meta['frames'][name], meta['frameSize']
    return sh[y:y + fh, x:x + fw].copy(), (meta, sh)


def build(kind):
    R = RIGS[kind]
    LEG_TOP, LEGS, OUT = R['leg_top'], R['legs'], Path(R['out'])
    base, cut = load_frame(R['src'])
    H, W = base.shape[:2]
    if R['eye']:
        base[R['eye'][1], R['eye'][0]] = (214, 40, 40, 255)
    body = base.copy()
    legs = {}
    for name, (x0, x1, _) in LEGS.items():
        m = np.zeros((H, W), bool)
        m[LEG_TOP:, x0:x1 + 1] = base[LEG_TOP:, x0:x1 + 1, 3] > 0
        legs[name] = m
        body[m] = 0
    pad = 8   # khung rộng thêm để chân vung không bị cắt
    fw, fh = W + pad * 2, H + 1
    extras = R.get('extras', [])
    sheet = Image.new('RGBA', (fw * (FRAMES + len(extras)), fh), (0, 0, 0, 0))
    span = H - 1 - LEG_TOP
    for i in range(FRAMES):
        t = i / FRAMES
        fr = np.zeros((fh, fw, 4), np.uint8)
        bob = 1 if any(((t - LEGS[n][2]) % 1) < 0.17 for n in ('fore_near', 'fore_far')) else 0

        def put(src, mask, dxrow, dyrow, dy0=0):
            ys, xs = np.nonzero(mask)
            for y, x in zip(ys, xs):
                ny, nx = y + dy0 + dyrow(y), x + pad + dxrow(y)
                if 0 <= ny < fh and 0 <= nx < fw:
                    fr[ny, nx] = src[y, x]

        def leg(name):
            dx, lift = foot((t - LEGS[name][2]) % 1)
            k = lambda y: (y - LEG_TOP) / span
            put(base, legs[name], lambda y: int(round(dx * k(y))), lambda y: -int(round(lift * k(y))))

        for n in ('hind_far', 'fore_far'):
            leg(n)
        put(body, body[..., 3] > 0, lambda y: 0, lambda y: 0, bob)
        for n in ('hind_near', 'fore_near'):
            leg(n)
        sheet.alpha_composite(Image.fromarray(fr), (i * fw, 0))
    meta = {'frameSize': [fw, fh], 'pivot': [pad + R['pivot_x'], fh - 2], 'image': OUT.name + '.png',
            'frames': {f"{R['prefix']}{i}": [i * fw, 0] for i in range(FRAMES)},
            'source': str(R['src']), 'tool': 'tools/wolf_walk_rig.py'}
    for j, name in enumerate(extras):
        cm, csh = cut
        (x, y), (cw, ch) = cm['frames'][name], cm['frameSize']
        g = np.zeros((fh, fw, 4), np.uint8)
        g[:ch, pad:pad + cw] = csh[y:y + ch, x:x + cw]
        sheet.alpha_composite(Image.fromarray(g), ((FRAMES + j) * fw, 0))
        meta['frames'][name] = [(FRAMES + j) * fw, 0]
    if R.get('eyes'):
        meta['eyes'] = R['eyes']
    sheet.save(OUT.with_suffix('.png'))
    OUT.with_suffix('.json').write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding='utf-8')
    stride = 2 * REACH / STANCE * DRAW_SCALE
    contacts = sorted(round(LEGS[n][2] * FRAMES) for n in ('fore_near', 'fore_far'))
    print(f'{kind}: {len(meta["frames"])} khung {fw}x{fh} -> {OUT}.png ; STRIDE = {stride:.2f} px màn hình/chu kỳ ; chân trước chạm đất ở khung {contacts}')


if __name__ == '__main__':
    for k in (sys.argv[1:] or ['MINI']):
        build(k)
