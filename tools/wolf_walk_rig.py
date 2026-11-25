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
  (26/11) MINI2 vẽ chân MỚI bằng xương 2 khúc ('ik'): trước đây kéo nghiêng chân có sẵn, chân trước xa luôn duỗi ra trước
  và hở đất nên đi trông què. Nay 4 chân có vị trí đứng cân dưới vai / hông, gối và khuỷu gập khi vung, đuôi ve vẩy, thân nhún đều.
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
        # khớp trên (x, y), x bàn chân lúc đứng, pha, gần/xa, sau/trước — toạ độ khung gốc
        'ik': {'hind_far': ((27.0, 24.5), 27.5, 0.50, False, True), 'fore_far': ((40.5, 23.5), 41.0, 0.75, False, False),
               'hind_near': ((23.0, 24.5), 22.5, 0.00, True, True), 'fore_near': ((34.5, 24.0), 35.5, 0.25, True, False)},
        'tail_x': 16,
        'extras': ['MINI2_atk', 'MINI2_howl'],
        'eyes': {'MINI2_walk': [[56, 13]], 'MINI2_stand': [[56, 13]], 'MINI2_atk': [[51, 12]], 'MINI2_howl': [[54, 6]]},   # mắt đỏ (đo trên sheet ra) -> render kéo vệt
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


INK = (2, 0, 2, 255)
NEAR = {'base': (226, 197, 217), 'shade': (167, 134, 183), 'hi': (246, 220, 217), 'paw': (251, 238, 226)}
FAR = {'base': (108, 78, 132), 'shade': (83, 56, 105), 'hi': (127, 97, 152), 'paw': (164, 131, 177)}
IK_LIFT = 3.2


def capsule(X, Y, a, b, w0, w1):
    """khoảng cách có dấu tới khúc xương thuôn a -> b (bề rộng w0 -> w1); < 0 là bên trong"""
    (ax, ay), (bx, by) = a, b
    dx, dy = bx - ax, by - ay
    u = np.clip(((X - ax) * dx + (Y - ay) * dy) / (dx * dx + dy * dy or 1e-9), 0, 1)
    return np.hypot(X - ax - u * dx, Y - ay - u * dy) - (w0 + (w1 - w0) * u) / 2


def ik_leg(fr, joint, fx, ph, near, hind, pad, ground, bob):     # ph None = đứng yên, bàn chân sát đất
    """một chân 2 khúc: hông/vai -> khuỷu -> cổ chân + bàn chân"""
    h, w = fr.shape[:2]
    X, Y = np.meshgrid(np.arange(w) + 0.5 - pad, np.arange(h) + 0.5)
    dx, _ = foot(ph) if ph is not None else (0.0, 0.0)
    u = (ph - STANCE) / (1 - STANCE) if ph is not None and ph >= STANCE else -1
    lift = IK_LIFT * math.sin(math.pi * u) if u >= 0 else 0.0
    gy = ground - (0 if near else 1)                      # chân xa đứng cao hơn 1 px (nhìn 3/4)
    foot_p = (fx + dx, gy - 1.2 - lift)
    j = (joint[0], joint[1] + bob)
    ankle = (foot_p[0] - (1.4 if hind else 0.8), foot_p[1] - 1.6)
    mx, my = (j[0] + ankle[0]) / 2, (j[1] + ankle[1]) / 2
    knee = (mx - 2.4 - lift * 0.25, my + 1.0 - lift * 0.3) if hind else (mx + 0.7 + lift * 0.75, my + 0.2 - lift * 0.25)
    k = 1.0 if near else 0.86
    d = np.minimum(capsule(X, Y, j, knee, (6.8 if hind else 6.4) * k, 4.3 * k), capsule(X, Y, knee, ankle, 4.4 * k, 3.8 * k))
    paw = np.hypot((X - foot_p[0] - 1.0) / (3.5 * k), (Y - foot_p[1]) / 1.75) - 1      # bàn chân dẹt, hơi chìa ra trước
    paw_on = (paw < 0) & (Y < gy + 0.1)
    on = ((d < 0) & (Y < gy)) | paw_on
    C = NEAR if near else FAR
    a = np.pad(on, 1)
    ring = (a[:-2, 1:-1] | a[2:, 1:-1] | a[1:-1, :-2] | a[1:-1, 2:]) & ~on & ((Y > joint[1] + 2.4 + bob) | (hind & (X < joint[0] - 1) & (Y > joint[1] - 2.2 + bob)))
    fr[ring] = INK
    cx = np.where(Y < knee[1], j[0] + (knee[0] - j[0]) * np.clip((Y - j[1]) / max(0.5, knee[1] - j[1]), 0, 1),
                  knee[0] + (ankle[0] - knee[0]) * np.clip((Y - knee[1]) / max(0.5, ankle[1] - knee[1]), 0, 1))
    off = X - cx
    for mask, col in [(on, C['base']), (on & (off < -0.9 * k), C['shade']), (on & (off > 1.0 * k) & (Y > joint[1] + 3), C['hi']), (paw_on, C['paw'])]:
        fr[mask] = (*col, 255)
    # kẽ móng
    for q in (0.6, 2.6):
        xi, yi = int(math.floor(foot_p[0] + q + pad)), int(math.floor(foot_p[1] + 0.6))
        if 0 <= yi < h and 0 <= xi < w and paw_on[yi, xi]:
            fr[yi, xi] = (*C['shade'], 255)


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
    STAND = 4 if R.get('ik') else 0          # đứng thở: 4 khung, bốn chân chạm đất
    sheet = Image.new('RGBA', (fw * (FRAMES + len(extras) + STAND), fh), (0, 0, 0, 0))
    span = H - 1 - LEG_TOP
    for i in range(FRAMES + STAND):
        t = i / FRAMES
        fr = np.zeros((fh, fw, 4), np.uint8)
        bob = 1 if any(((t - LEGS[n][2]) % 1) < 0.17 for n in ('fore_near', 'fore_far')) else 0
        IK = R.get('ik')
        still = i >= FRAMES
        if still:
            t, bob = (i - FRAMES) / STAND, 1 if i - FRAMES in (1, 2) else 0

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

        if IK:
            for n in ('hind_far', 'fore_far', None, 'hind_near', 'fore_near'):
                if n is None:
                    for x in range(W):                  # thân + đuôi ve vẩy (cột càng xa gốc đuôi càng lệch)
                        sway = int(round(1.3 * math.sin(2 * math.pi * t - x * 0.16) * max(0, R['tail_x'] - x) / R['tail_x'])) if x < R['tail_x'] else 0
                        for y in np.nonzero(body[:, x, 3])[0]:
                            ny = y + bob + sway
                            if 0 <= ny < fh:
                                fr[ny, x + pad] = body[y, x]
                else:
                    jt, fx, ph, near, hind = IK[n]
                    ik_leg(fr, jt, fx, None if still else (t - ph) % 1, near, hind, pad, H, bob)
                    if n == 'hind_near':                # khóa vàng trên đai nằm trên đùi
                        for y, x in zip(*np.nonzero((body[..., 3] > 0) & (body[..., 0] > 180) & (body[..., 1] > 130) & (body[..., 2] < 120))):
                            if 22 <= y <= 27 and 23 <= x <= 29:
                                fr[y + bob, x + pad] = body[y, x]
        else:
            for n in ('hind_far', 'fore_far'):
                leg(n)
            put(body, body[..., 3] > 0, lambda y: 0, lambda y: 0, bob)
            for n in ('hind_near', 'fore_near'):
                leg(n)
        sheet.alpha_composite(Image.fromarray(fr), ((i + len(extras) if still else i) * fw, 0))
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
    for j in range(STAND):
        meta['frames'][R['prefix'].replace('walk', 'stand') + str(j)] = [(FRAMES + len(extras) + j) * fw, 0]
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
