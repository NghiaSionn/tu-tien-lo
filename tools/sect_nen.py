"""M8 (16/11): sảnh dùng ẢNH CONCEPT làm nền cố định (docs/concept/tong_mon_chatgpt.png, người phát triển chọn x1,15).
Ảnh phóng lên 1920×1088 = đúng khung 120×68 ô 16 px (1 ô = 13,93 px concept). Bệ pháp đài vẫn là sprite (che bệ vẽ trong ảnh).
Va chạm dò tay trên lưới ô của ảnh (toạ độ ô = nhãn trên ảnh lưới docs/playtest/M8_nen_luoi_*.png):
  WALK: đa giác mặt đất đi được (cỏ, đường, sân); SOLID: vật đè lên trong đó (nhà, cây, bia, ao, rào...) — mọi vật vẽ trong ảnh
  đặc trọn hình chiếu nên người chơi không bao giờ đứng sau mái/tán (chưa có lớp che; bước sau tách lớp che từ chính ảnh).
Ra: sprites/tm_nen.webp, src/data/sect_bocuc.js (BOCUC: rows, buildings, plaza, pen, bg), ảnh duyệt docs/playtest/M8_nen_*.png
Dùng: .venv/Scripts/python.exe tools/sect_nen.py
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SRC = 'docs/concept/tong_mon_chatgpt.png'
NX, NY, T = 120, 68, 16
C = (61, 34)                     # tâm bệ vẽ trong ảnh (ô) = tâm bản đồ; bệ sprite đặt tại đây
WALK = [
    [(8, 24), (36, 24), (36, 18), (56, 18), (56, 13), (65, 13), (65, 18), (75, 18), (75, 13), (80, 13), (80, 14), (101, 14), (106, 14),
     (114, 20), (113, 32), (109, 38), (109, 56), (103, 58), (84, 58), (80, 60), (66, 60), (62, 59), (48, 59), (40, 60), (39, 61),
     (28, 61), (28, 57), (16, 57), (13, 52), (8, 50)],
    [(29, 19), (35, 19), (35, 24), (29, 24)],                                  # bậc tháp Truyền Thừa
]
SOLID = [
    (9, 24, 36, 33), (15, 33, 27, 36), (12, 36, 27, 38), (33, 36, 37, 38),      # Tàng Kinh Các + sách + lan can trước
    (14, 40, 40, 50), (16, 51, 26, 53), (33, 51, 40, 53),                      # Công Đức Đường + lan can hai bên bậc
    (8, 24, 13, 52),                                                           # cây + vách rìa tây
    (88, 15, 93, 19), (85, 18, 88, 20), (98, 14, 104, 19), (83, 20, 100, 22), (70, 19, 77, 22), (75, 10, 83, 17),   # + chái nhỏ trái   # Luyện Khí: đe, thùng quặng, giá binh khí, tường sân
    (85, 21, 113, 30), (98, 30, 103, 34), (88, 29, 96, 32), (104, 29, 111, 32), (89, 32, 94, 35), (105, 32, 110, 35), (96, 36, 113, 38),   # Đan Dược
    (97, 40, 106, 47), (91, 41, 97, 45),                                       # chòi + giá binh khí Luyện Võ
    (104, 15, 112, 23), (74, 42, 80, 47), (66, 46, 73, 53), (45, 50, 50, 55),  # cây hoa đào
    (57, 44, 64, 53), (65, 49, 70, 56), (49, 47, 55, 55),                      # bia đá
    (41, 20, 50, 25),                                                          # ao cạnh tháp
]
# Luyện Võ Trường: rào vẽ trong ảnh ~ chữ nhật x 81..108, y 41..57, cổng ở cạnh tây (x 80..82, y 47..52)
PEN = dict(x=82, y=42, w=26, h=15, gate=[0, -1], door=[79.5, 49.5], west_gate=[47, 52])
BUILDINGS = {   # door: chỗ đứng bấm E (trước đồ vật chính / cửa); body: khối đặc chính (ô)
    'truyen_thua': dict(door=[32, 21.5], body=(16, 0, 35, 18), name='Truyền Thừa Các'),
    'tang_kinh': dict(door=[29, 35.5], body=(9, 24, 36, 33), name='Tàng Kinh Các'),
    'cong_duc': dict(door=[29.5, 52.5], body=(14, 40, 40, 50), name='Công Đức Đường'),
    'luyen_khi': dict(door=[90.5, 19.7], body=(76, 4, 106, 13), name='Luyện Khí Phường'),
    'dan_duoc': dict(door=[100.5, 35.5], body=(85, 21, 113, 30), name='Đan Dược Phòng'),
}
PORTAL, BIA = [60.5, 17.5], [60.5, 54.5]
# bệ vẽ trong ảnh bị bệ sprite che; phần lộ ra ngoài sprite (cờ, lan can sau) xoá bằng màu đá đường trong vùng này (ô)
ERASE = []   # (16/11) thử xoá bằng mẫu lặp trông xấu -> tạm để bệ vẽ lộ ra quanh sprite


def build_rows():
    L = Image.new('L', (NX, NY), ord('^')); d = ImageDraw.Draw(L)
    for p in WALK: d.polygon(p, fill=ord('.'))
    for r in SOLID: d.rectangle((r[0], r[1], r[2] - 1, r[3] - 1), fill=ord('^'))
    P = PEN   # rào: viền chữ nhật đặc, chừa cổng tây
    for x in range(P['x'], P['x'] + P['w']):
        for y in (P['y'], P['y'] + P['h'] - 1): L.putpixel((x, y), ord('^'))
    for y in range(P['y'], P['y'] + P['h']):
        for x in (P['x'], P['x'] + P['w'] - 1):
            if not (x == P['x'] and P['west_gate'][0] <= y <= P['west_gate'][1]): L.putpixel((x, y), ord('^'))
    g = np.array(L)
    g[0, :] = g[-1, :] = g[:, 0] = g[:, -1] = ord('^')
    # ô đi được không nối với bệ (ngóc ngách sau vật) -> đặc
    seen = np.zeros(g.shape, bool); st = [C]
    while st:
        x, y = st.pop()
        if not (0 <= x < NX and 0 <= y < NY) or seen[y, x] or g[y, x] != ord('.'): continue
        seen[y, x] = True; st += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    g[(g == ord('.')) & ~seen] = ord('^')
    return g


def main():
    con = Image.open(ROOT / SRC).convert('RGBA')
    bg = con.resize((NX * T, NY * T), Image.NEAREST)
    a = np.array(bg)
    g = build_rows()
    # mẫu đá đường để xoá bệ vẽ: lặp một mảng đường thật (ô 40..44, 39..41) phủ vùng ERASE ngoài hình bệ sprite
    tile = a[39 * T:41 * T, 36 * T:40 * T].copy()
    be = np.array(Image.open(ROOT / 'sprites/tm_be.png').convert('RGBA'))[..., 3] > 0
    bh, bw = be.shape; ax, ay = 276, 218   # neo bệ (sprite tm_be, xem src/data/sect_plaza.js)
    ox, oy = C[0] * T - ax, C[1] * T - ay
    for x0, y0, x1, y1 in ERASE:
        for py in range(y0 * T, y1 * T):
            for px in range(x0 * T, x1 * T):
                sx, sy = px - ox, py - oy
                if 0 <= sx < bw and 0 <= sy < bh and be[sy, sx]: continue
                a[py, px] = tile[py % tile.shape[0], px % tile.shape[1]]
    Image.fromarray(a).convert('RGB').save(ROOT / 'sprites/tm_nen.webp', quality=92, method=6)   # ~1 MB (PNG 4 MB); ảnh vẽ tay nên nén mất ít không thấy
    rows = [''.join(chr(v) for v in r) for r in g]
    data = {'nx': NX, 'ny': NY, 'rows': rows, 'plaza': {'c': C}, 'buildings': BUILDINGS, 'pen': PEN, 'portal': PORTAL, 'bia': BIA,
            'bg': {'img': 'tm_nen.webp', 'w': NX * T, 'h': NY * T, 'src': SRC}}
    (ROOT / 'src/data/sect_bocuc.js').write_text('// SINH TỰ ĐỘNG bởi tools/sect_nen.py — sảnh nền ảnh concept, lưới va chạm 120×68 ô. Đừng sửa tay.\n'
        '// . đi được, ^ đặc (vật vẽ trong ảnh / vách / mây)\nexport const BOCUC = ' + json.dumps(data, ensure_ascii=False) + ';\n', encoding='utf-8')
    # ảnh duyệt: đặc tô đỏ mờ, cửa (E) chấm vàng, lưới 5 ô
    ov = Image.fromarray(a).convert('RGBA'); lay = Image.new('RGBA', ov.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    for y in range(NY):
        for x in range(NX):
            if g[y, x] == ord('^'): d.rectangle((x * T, y * T, x * T + T - 1, y * T + T - 1), fill=(255, 0, 0, 90))
    for i in range(0, NX + 1, 5): d.line([(i * T, 0), (i * T, NY * T)], fill=(255, 255, 0, 120))
    for j in range(0, NY + 1, 5): d.line([(0, j * T), (NX * T, j * T)], fill=(255, 255, 0, 120))
    f = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 11)
    for i in range(0, NX, 5):
        for j in range(0, NY, 5): d.text((i * T + 2, j * T + 1), f'{i},{j}', fill='white', font=f, stroke_width=2, stroke_fill='black')
    for b in BUILDINGS.values():
        x, y = b['door']; d.ellipse((x * T - 6, y * T - 6, x * T + 6, y * T + 6), fill=(255, 230, 0, 255))
    for x, y in (PORTAL, BIA, PEN['door']): d.ellipse((x * T - 6, y * T - 6, x * T + 6, y * T + 6), fill=(0, 255, 255, 255))
    ov.alpha_composite(lay)
    ov.convert('RGB').save(ROOT / 'docs/playtest/M8_nen_va_cham.png')
    for n, box in [('nw', (0, 0, 980, 560)), ('ne', (940, 0, 1920, 560)), ('sw', (0, 528, 980, 1088)), ('se', (940, 528, 1920, 1088))]:
        ov.crop(box).convert('RGB').save(ROOT / f'docs/playtest/M8_nen_luoi_{n}.png')
    print('ô đi được', int((g == ord('.')).sum()), '/', NX * NY)


if __name__ == '__main__':
    main()
