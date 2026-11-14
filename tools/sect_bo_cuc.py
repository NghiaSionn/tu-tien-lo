"""M8 bố cục sảnh mới theo concept ảnh 1 (docs/concept/tong_mon_chatgpt.png) — khung 120×68 ô (1 ô concept = 13,93 px).
Toạ độ đọc trực tiếp trên lưới phủ concept. Script dựng lưới loại ô và ảnh xem trước (chồng lên concept + bản riêng) để duyệt
trước khi đưa vào game. Loại ô: . cỏ, = đường đá, ~ nước, d sân đất, ^ vách núi (đặc), T rừng (đặc), B chỗ công trình, P bệ pháp đài,
G cổng, X ngoài đảo (mây).
Dùng: .venv/Scripts/python.exe tools/sect_bo_cuc.py  -> docs/playtest/M8_bo_cuc_*.png + docs/bo_cuc_sanh.json
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
NX, NY = 120, 68
# đảo đi được (đa giác, ô): mép vách trái ~x10, phải ~x112, đáy ~y60, đỉnh giáp rừng ~y14
ISLAND = [(12, 14), (40, 13), (52, 10), (70, 10), (78, 6), (106, 6), (112, 14), (114, 30), (112, 40), (116, 50), (110, 58), (96, 62),
          (84, 60), (72, 62), (60, 62), (46, 60), (40, 58), (26, 58), (16, 56), (10, 46), (8, 34), (10, 22)]
FOREST = [(40, 0), (78, 0), (78, 6), (70, 10), (52, 10), (40, 13)]          # rừng tím sau cổng (đặc, chỉ để nhìn)
WATER = [
    [(37, 19), (47, 19), (48, 23), (44, 25), (38, 24)],                       # ao + thác nhỏ cạnh tháp
    [(26, 56), (40, 55), (56, 57), (66, 58), (80, 58), (84, 60), (72, 62), (46, 61), (30, 60)],   # suối nam (dưới cầu -> 2 thác)
]
DIRT = [((95, 50), 15, 7)]                                                    # Luyện Võ Trường: elip tâm, bán trục x, y
PATH_W = 4
PATHS = [
    [(60.5, 19), (60.5, 25)],                                                 # cổng -> bệ
    [(48, 29), (40, 27), (35, 24)],                                           # bệ tây bắc -> bậc tháp Truyền Thừa
    [(47, 33), (40, 35), (34, 37)],                                           # bệ tây -> Tàng Kinh Các
    [(50, 38), (44, 43), (38, 48), (32, 53)],                                 # bệ tây nam -> Công Đức Đường
    [(58, 45), (52, 48), (46, 52), (40, 55), (34, 56)],                       # bậc nam -> cầu đá
    [(60.5, 45), (60.5, 50)],                                                 # bậc nam -> vườn bia
    [(64, 45), (70, 46), (76, 47), (82, 48)],                                 # bậc nam -> cổng rào Luyện Võ
    [(72, 34), (80, 36), (88, 38)],                                           # bệ đông -> Đan Dược Phòng
    [(72, 28), (76, 25), (80, 22)],                                           # bệ đông bắc -> Luyện Khí Phường
]
PLAZA = dict(c=(60.5, 33), rx=14, ry=9)                                       # bệ pháp đài (sprite hiện có, đặt lại)
GATE = dict(x=(57, 64), y=(11, 19))
# chỗ dành cho công trình (khung ô x0,y0,x1,y1) + điểm chân bậc (đường nối vào)
BUILDINGS = {
    'truyen_thua': dict(box=(17, 0, 36, 21), foot=(35, 24), name='Truyền Thừa Các (tháp)'),
    'tang_kinh': dict(box=(10, 21, 34, 37), foot=(34, 37), name='Tàng Kinh Các'),
    'cong_duc': dict(box=(14, 40, 40, 52), foot=(32, 53), name='Công Đức Đường'),
    'luyen_khi': dict(box=(78, 4, 110, 21), foot=(80, 22), name='Luyện Khí Phường'),
    'dan_duoc': dict(box=(86, 21, 114, 37), foot=(88, 38), name='Đan Dược Phòng'),
    'luyen_vo_choi': dict(box=(98, 39, 108, 46), foot=(98, 46), name='chòi Luyện Võ'),
}
BIA = dict(box=(50, 43, 66, 56))
BRIDGE = dict(box=(29, 54, 42, 59))
FALLS = [(5, 4, 9, 26), (31, 59, 37, 68), (80, 58, 86, 68)]                   # thác nước (vẽ trang trí, đặc)
COLORS = {'.': (78, 150, 70), '=': (190, 182, 170), '~': (70, 150, 210), 'd': (196, 160, 105), '^': (95, 95, 120), 'T': (60, 50, 100),
          'B': (170, 70, 70), 'P': (220, 220, 235), 'G': (150, 90, 200), 'X': (225, 230, 245), 'b': (130, 130, 130), 'W': (150, 210, 250)}


def poly(img_draw, pts, v): img_draw.polygon([(x, y) for x, y in pts], fill=v)


def build():
    L = Image.new('L', (NX, NY), ord('X')); d = ImageDraw.Draw(L)
    poly(d, ISLAND, ord('.'))
    poly(d, FOREST, ord('T'))
    for (cx, cy), rx, ry in DIRT: d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=ord('d'))
    for line in PATHS: d.line(line, fill=ord('='), width=PATH_W, joint='curve')
    for w in WATER: poly(d, w, ord('~'))
    c = PLAZA['c']; d.ellipse([c[0] - PLAZA['rx'], c[1] - PLAZA['ry'], c[0] + PLAZA['rx'], c[1] + PLAZA['ry']], fill=ord('P'))
    d.rectangle([GATE['x'][0], GATE['y'][0], GATE['x'][1], GATE['y'][1]], fill=ord('G'))
    for b in BUILDINGS.values(): d.rectangle(b['box'], fill=ord('B'))
    d.rectangle(BIA['box'], fill=ord('b'))
    d.rectangle(BRIDGE['box'], fill=ord('='))
    for f in FALLS: d.rectangle(f, fill=ord('W'))
    g = np.array(L)
    # vách núi: ô ngoài đảo kề ô đảo (viền dày 2) -> đặc, vẽ đá
    inside = g != ord('X')
    near = np.zeros_like(inside)
    for dy in range(-2, 3):
        for dx in range(-2, 3): near |= np.roll(np.roll(inside, dy, 0), dx, 1)
    g[(~inside) & near] = ord('^')
    # mảnh đất đi được không nối với bệ (dải cỏ sau suối...) -> vách núi (concept: mép vách ngay dưới suối)
    walk = np.isin(g, [ord(c) for c in '.=dPbBG'])
    seen = np.zeros_like(walk); st = [(int(PLAZA['c'][0]), int(PLAZA['c'][1]))]
    while st:
        x, y = st.pop()
        if not (0 <= x < NX and 0 <= y < NY) or seen[y, x] or not walk[y, x]: continue
        seen[y, x] = True; st += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    g[walk & ~seen] = ord('^')
    return g


def main():
    g = build()
    rows = [''.join(chr(v) for v in r) for r in g]
    NL = chr(10)
    (ROOT / 'src/data/sect_bocuc.js').write_text('// SINH TỰ ĐỘNG bởi tools/sect_bo_cuc.py — bố cục sảnh theo concept ảnh 1 (lưới ô). Đừng sửa tay.' + NL
        + '// . cỏ, = đường đá, ~ nước, d sân đất, ^ vách núi, T rừng, B chỗ công trình, P bệ, G cổng, X mây, b vườn bia, W thác' + NL
        + 'export const BOCUC = ' + json.dumps({"nx": NX, "ny": NY, "rows": rows, "buildings": BUILDINGS, "plaza": PLAZA, "gate": GATE}, ensure_ascii=False) + ';' + NL,
        encoding='utf-8')
    (ROOT / 'docs/bo_cuc_sanh.json').write_text(json.dumps({'nx': NX, 'ny': NY, 'rows': rows, 'buildings': BUILDINGS, 'plaza': PLAZA,
                                                            'gate': GATE, 'paths': PATHS, 'falls': FALLS}, ensure_ascii=False, indent=1), encoding='utf-8')
    k = 12
    rgb = np.zeros((NY, NX, 3), np.uint8)
    for ch, col in COLORS.items(): rgb[g == ord(ch)] = col
    im = Image.fromarray(rgb).resize((NX * k, NY * k), Image.NEAREST); d = ImageDraw.Draw(im)
    try: font = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 18)
    except OSError: font = None
    lab = lambda xy, t: d.text(xy, t, fill=(255, 255, 255), font=font, stroke_width=2, stroke_fill=(0, 0, 0))
    for n, b in BUILDINGS.items():
        x0, y0, x1, y1 = b['box']; lab((x0 * k + 6, y0 * k + 6), b['name'])
    lab((BIA['box'][0] * k + 6, BIA['box'][1] * k + 6), 'Vườn bia'); lab((GATE['x'][0] * k - 30, GATE['y'][0] * k - 26), 'Cổng bí cảnh')
    lab((PLAZA['c'][0] * k - 80, PLAZA['c'][1] * k - 10), 'Bệ Tụ Linh Pháp Đài'); lab((88 * k, 50 * k), 'Luyện Võ Trường')
    lab((BRIDGE['box'][0] * k, BRIDGE['box'][1] * k - 24), 'Cầu đá'); lab((45 * k, 21 * k), 'Ao + thác nhỏ')
    lab((1 * k, 27 * k), 'Thác'); lab((32 * k, 64 * k), 'Thác'); lab((81 * k, 64 * k), 'Thác'); lab((50 * k, 2 * k), 'Rừng (không vào)')
    for b in BUILDINGS.values():
        fx, fy = b['foot']; d.ellipse([fx * k - 5, fy * k - 5, fx * k + 5, fy * k + 5], fill=(255, 230, 0))
    im.save(ROOT / 'docs/playtest/M8_bo_cuc_luoi.png')
    con = Image.open(ROOT / 'docs/concept/tong_mon_chatgpt.png').convert('RGB')
    ov = Image.blend(con, Image.fromarray(rgb).resize(con.size, Image.NEAREST), 0.45)
    ov.save(ROOT / 'docs/playtest/M8_bo_cuc_chong.png')
    cw = 720; ch = round(con.height * cw / con.width); both = Image.new('RGB', (cw * 2 + 10, ch), (20, 20, 30))
    both.paste(con.resize((cw, ch)), (0, 0)); both.paste(im.resize((cw, ch)), (cw + 10, 0)); both.save(ROOT / 'docs/playtest/M8_bo_cuc_so_sanh.png')
    walk = np.isin(g, [ord(c) for c in '.=dP~b']).sum()
    print('ô đi được (gồm nước/bia để kiểm):', walk, '/', NX * NY)


if __name__ == '__main__':
    main()
