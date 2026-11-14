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
# Toạ độ đo trên lưới 120×68 phủ concept (1 ô = 13,93 px concept). (16/11) người phát triển chọn VỀ ĐÚNG TỈ LỆ ẢNH: khung = lưới concept,
# không phóng (SX = SY = 1). Đường đá KHÔNG vẽ tay nữa mà DÒ TỪ ẢNH: điểm ảnh xám nhạt ít bão hoà (đá lát) -> đóng/mở hình thái
# (lấp mạch vữa, bỏ đốm đèn/bia mảnh) -> ô có > 50 % là đá; giữ mảng >= 12 ô, chỉ trong đảo (bỏ mây sáng ngoài rìa).
C_OLD = (60.5, 33)
SX, SY = 1, 1
NX, NY = 120, 68
C = (60.5, 33)


def tf(p): return (C[0] + (p[0] - C_OLD[0]) * SX, C[1] + (p[1] - C_OLD[1]) * SY)
def tfs(pts): return [tf(q) for q in pts]
def tfbox(b): x0, y0 = tf(b[:2]); x1, y1 = tf(b[2:]); return (round(x0), round(y0), round(x1), round(y1))


ISLAND = [(12, 14), (40, 13), (52, 10), (70, 10), (78, 6), (106, 6), (112, 14), (114, 30), (112, 40), (116, 50), (110, 58), (96, 62),
          (84, 60), (72, 62), (60, 62), (46, 60), (40, 58), (26, 58), (16, 56), (10, 46), (8, 34), (10, 22)]
FOREST = [(40, 0), (78, 0), (78, 6), (70, 10), (52, 10), (40, 13)]          # rừng tím sau cổng (đặc, chỉ để nhìn)
WATER = [   # khoanh theo ảnh concept (16/11)
    [(40, 20), (45, 19.5), (48, 22), (47.5, 26.5), (44, 27.5), (41, 25)],     # ao + thác nhỏ cạnh tháp
    [(29, 57.5), (38, 57.5), (44, 59.5), (52, 61), (62, 61.5), (70, 61), (78, 60), (84, 59.5), (87, 61), (78, 62.5), (70, 63),
     (60, 63.5), (50, 63), (42, 62), (30, 61)],                               # suối nam: dưới cầu đá -> men mép nam -> thác phải
]
# Luyện Võ Trường: rào chữ nhật, cổng rào cạnh bắc lệch trái (đầu đường đông nam) + sân đất elip
PEN = dict(x=82, y=44, w=26, h=13, gate=[83, 86], door=[84.5, 43.2])
DIRT = [((95, 50.5), 15, 7.5)]
PLAZA = dict(c=C, rx=14, ry=9)
GATE = dict(x=(57, 64), y=(11, 19))
BUILDINGS = {
    'truyen_thua': dict(box=(17, 0, 36, 21), foot=(35, 24), name='Truyền Thừa Các (tháp)'),
    'tang_kinh': dict(box=(10, 21, 34, 37), foot=(34, 37), name='Tàng Kinh Các'),
    'cong_duc': dict(box=(14, 40, 40, 52), foot=(32, 53), name='Công Đức Đường'),
    'luyen_khi': dict(box=(78, 4, 110, 21), foot=(80, 22), name='Luyện Khí Phường'),
    'dan_duoc': dict(box=(86, 21, 114, 37), foot=(88, 38), name='Đan Dược Phòng'),
    'luyen_vo_choi': dict(box=(98, 39, 108, 46), foot=(98, 46), name='chòi Luyện Võ'),
}
BIA = dict(box=(52, 46, 66, 55))
BRIDGE = dict(box=(33, 54, 38, 60))
FALLS = [(5, 5, 9, 22), (31, 61, 36, 68), (81, 61, 87, 68)]   # thác trái (vách tây), thác dưới cầu, thác phải
F = {k: v['foot'] for k, v in BUILDINGS.items()}
PATHS = []   # đường dò từ ảnh (trace_paths)


def trace_paths(island):
    from PIL import ImageFilter
    im = Image.open(ROOT / 'docs/concept/tong_mon_chatgpt.png').convert('RGB').resize((NX * 16, NY * 16), Image.BOX)
    hsv = np.array(im.convert('HSV')).astype(float) / 255
    m = Image.fromarray((((hsv[..., 1] < 0.16) & (hsv[..., 2] > 0.55)) * 255).astype(np.uint8))
    m = m.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))     # đóng: lấp mạch vữa
    m = m.filter(ImageFilter.MinFilter(9)).filter(ImageFilter.MaxFilter(9))     # mở: bỏ đốm nhỏ
    P = (np.array(m) > 0).reshape(NY, 16, NX, 16).mean((1, 3)) > 0.5
    P &= island
    seen = np.zeros_like(P); keep = np.zeros_like(P)
    for y in range(NY):
        for x in range(NX):
            if not P[y, x] or seen[y, x]: continue
            st = [(x, y)]; cs = []
            while st:
                cx, cy = st.pop()
                if 0 <= cx < NX and 0 <= cy < NY and P[cy, cx] and not seen[cy, cx]:
                    seen[cy, cx] = True; cs.append((cx, cy)); st += [(cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)]
            if len(cs) >= 12:
                for cx, cy in cs: keep[cy, cx] = True
    return keep


COLORS = {'.': (78, 150, 70), '=': (190, 182, 170), '~': (70, 150, 210), 'd': (196, 160, 105), '^': (95, 95, 120), 'T': (60, 50, 100),
          'B': (170, 70, 70), 'P': (220, 220, 235), 'G': (150, 90, 200), 'X': (225, 230, 245), 'b': (130, 130, 130), 'W': (150, 210, 250)}


def poly(img_draw, pts, v): img_draw.polygon([(x, y) for x, y in pts], fill=v)


def build():
    L = Image.new('L', (NX, NY), ord('X')); d = ImageDraw.Draw(L)
    poly(d, ISLAND, ord('.'))
    poly(d, FOREST, ord('T'))
    for (cx, cy), rx, ry in DIRT: d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=ord('d'))
    for b in BUILDINGS.values(): d.rectangle(b['box'], fill=ord('B'))   # chỗ chừa nhà (cỏ) — đường vẽ đè lên để tới chân bậc
    for w in WATER: poly(d, w, ord('~'))
    isl = Image.new('L', (NX, NY), 0); poly(ImageDraw.Draw(isl), ISLAND, 255)
    g0 = np.array(L); g0[trace_paths(np.array(isl) > 0) & (g0 != ord('~'))] = ord('='); L = Image.fromarray(g0); d = ImageDraw.Draw(L)
    c = PLAZA['c']; d.ellipse([c[0] - PLAZA['rx'], c[1] - PLAZA['ry'], c[0] + PLAZA['rx'], c[1] + PLAZA['ry']], fill=ord('P'))
    d.rectangle([GATE['x'][0], GATE['y'][0], GATE['x'][1], GATE['y'][1]], fill=ord('G'))
    d.rectangle(BIA['box'], fill=ord('b'))
    for f in FALLS: d.rectangle(f, fill=ord('W'))
    g = np.array(L)
    # vách núi: ô ngoài đảo kề ô đảo (viền dày 2) -> đặc, vẽ đá
    inside = g != ord('X')
    near = np.zeros_like(inside)
    for dy in range(-2, 3):
        for dx in range(-2, 3): near |= np.roll(np.roll(inside, dy, 0), dx, 1)
    g[(~inside) & near] = ord('^')
    # mặt vách phía nam (nhìn 3/4 thấy vách dưới mép đảo): mỗi cột kéo vách xuống thêm 5 ô dưới ô đảo thấp nhất
    for x in range(NX):
        ys = np.where(inside[:, x])[0]
        if ys.size:
            for y in range(ys.max() + 1, min(NY, ys.max() + 7)):
                if g[y, x] == ord('X'): g[y, x] = ord('^')
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
        + 'export const BOCUC = ' + json.dumps({"nx": NX, "ny": NY, "rows": rows, "buildings": BUILDINGS, "plaza": PLAZA, "gate": GATE, "tf": {"c_old": C_OLD, "c": C, "sx": SX, "sy": SY}, "pen": PEN}, ensure_ascii=False) + ';' + NL,
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
    lab((PLAZA['c'][0] * k - 80, PLAZA['c'][1] * k - 10), 'Bệ Tụ Linh Pháp Đài'); lab((tf((88, 50))[0] * k, tf((88, 50))[1] * k), 'Luyện Võ Trường')
    lab((BRIDGE['box'][0] * k, BRIDGE['box'][1] * k - 24), 'Cầu đá'); lab((tf((45, 21))[0] * k, tf((45, 21))[1] * k), 'Ao + thác nhỏ')
    for f in FALLS: lab((f[0] * k, f[3] * k - 30), 'Thác')
    lab((tf((50, 2))[0] * k, 2 * k), 'Rừng (không vào)')
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
