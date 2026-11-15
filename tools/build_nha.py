"""M8-15: công trình lớn đi vào được (ChatGPT vẽ nhà mở mặt trước, docs/concept/nha_<id>_lon_chatgpt.png).
Mỗi nhà: làm sạch (sprite_clean --scale), rồi giống bệ pháp đài (tools/build_be_phap_dai.py):
  - sàn đi được = loang từ hạt giống qua điểm sáng + mở hình thái (cắt nhánh lan lên đồ đạc) + cột bậc thang khoanh tay
  - đặc: mọi điểm ảnh của nhà ngoài sàn/bậc (tường, mái, cột, lan can, đồ đạc)
  - sprites/nha_<id>.png (nền) + nha_<id>_front.png (lớp che, game xếp theo chân cột)
  - src/data/sect_nha.js: {id: {w, h, foot:[x,y] (giữa đáy bậc = điểm đặt), cell, pad, fine, interact:[x,y]}}
Dùng: .venv/Scripts/python.exe tools/build_nha.py [id ...]
"""
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_be_phap_dai import drop_magenta, mask, flood, morph  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
# số đo px trên sprite đã làm sạch: seed = điểm trên sàn; stair = cột bậc [x0,y0,x1,y1]; interact = chỗ đứng bấm E (trước đồ vật chính)
NHA = {
    # (16/11) tách đúng từ concept ảnh 1 (ChatGPT, người phát triển chỉnh: lò luyện đan + nguyên liệu, bậc bên trái)
    'dan_duoc': dict(src='docs/concept/nha_dan_duoc_pixel_chatgpt.png', scale=4.42, floor_all=True, seed=(165, 140), stair=(58, 155, 110, 217), interact=(165, 140),   # (16/11) bản PIXEL ART thật (ChatGPT vẽ lại: màu phẳng, viền đen) — hết nhoè
                     block=[(62, 80, 112, 125), (220, 85, 268, 128), (140, 80, 200, 128), (102, 132, 150, 155), (180, 130, 235, 155)],   # kệ trái/phải, lò đan, 2 bàn
                     floor=[(65, 140), (70, 105), (115, 98), (215, 98), (265, 105), (272, 140), (262, 152), (118, 152), (110, 158), (58, 158)]),
    # (16/11) tách đúng từ concept ảnh 1: lò rèn + ống khói, đe giữa sân, giá thương, thùng quặng, bậc trái
    'luyen_khi': dict(src='docs/concept/nha_luyen_khi_concept_chatgpt.png', scale=4.5, floor_all=True, seed=(178, 160), stair=(30, 152, 78, 212), interact=(178, 160),
                      block=[(95, 103, 118, 122), (88, 135, 116, 156), (148, 120, 205, 150), (228, 105, 288, 150), (200, 70, 265, 120), (15, 80, 92, 136)],   # hộp sắt, thùng quặng, đe, giá thương, lò rèn, chái trái (thùng gỗ nhỏ không chặn: lối thẳng từ bậc tới đe)
                      floor=[(45, 140), (95, 118), (100, 110), (195, 110), (210, 118), (230, 130), (285, 145), (280, 165), (105, 168), (78, 160), (30, 160)]),
    # (16/11) tách đúng từ concept ảnh 1: thư viện, kệ sách, sách mở trên bục, chồng sách, bậc phải
    'tang_kinh': dict(src='docs/concept/nha_tang_kinh_concept_chatgpt.png', scale=4.5, floor_all=True, behind=[(0, 0, 150, 156)],   # bên phải để trống: đường xuống từ tháp
                      seed=(192, 150), stair=(212, 156, 262, 217), interact=(192, 150),
                      block=[(72, 125, 100, 153), (118, 128, 175, 157), (210, 90, 255, 146), (40, 60, 70, 156), (255, 90, 290, 156)],   # sách, bục, kệ phải, vách 2 đầu (hộp nhỏ cạnh bục bỏ chặn: hở lối sang trái)
                      floor=[(55, 140), (70, 132), (200, 132), (240, 140), (265, 152), (270, 160), (205, 162), (200, 156), (55, 156)]),
    # (16/11) tách đúng từ concept ảnh 1: sảnh dài, 5 bảng nhiệm vụ vàng, 2 ghế + bục sách, bậc giữa
    'cong_duc': dict(src='docs/concept/nha_cong_duc_concept_chatgpt.png', scale=4.5, floor_all=True, behind=[(0, 27, 342, 152)], seed=(182, 145), stair=(152, 152, 220, 201), interact=(182, 145),
                     block=[(112, 118, 155, 135), (160, 116, 200, 136), (203, 116, 245, 135)],   # ghế trái, bục sách, ghế phải
                     floor=[(65, 140), (95, 128), (270, 128), (300, 140), (290, 152), (225, 152), (220, 158), (152, 158), (148, 152), (75, 152)]),
    # (16/11) tách đúng từ concept ảnh 1: tháp 4 tầng, tầng trệt mở có bàn thờ truyền thừa phát sáng, bậc dài bên phải
    'truyen_thua': dict(src='docs/concept/nha_truyen_thua_concept_chatgpt.png', scale=3.0, floor_all=True, cut=[(95, 196, 200)], seed=(212, 312), stair=(212, 316, 282, 431), interact=(212, 312),   # cut: số đo bản 4,5 px
                        block=[(174, 262, 256, 300)],   # bàn thờ
                        floor=[(172, 300), (258, 294), (268, 312), (256, 324), (180, 324)]),
}
# (16/11) cỡ nhà: thu theo khối 4,5 px ảnh gốc (bản 3 px to gấp rưỡi và mờ vì chi tiết nhỏ hơn mật độ điểm ảnh game; bản 8,6 px vỡ hạt).
# Số đo trong NHA vẫn ghi theo bản thu 3 px (scale) và được đổi tỉ lệ f = scale*UP/px.
PX = {'dan_duoc': 4.42, 'luyen_khi': 4.5, 'tang_kinh': 4.5, 'cong_duc': 4.5, 'truyen_thua': 4.5}
UP = 1
LUM_MIN, OPEN_R, FOOT, GROW, PAD, C = 85, 2, 8, 4, 8, 4
OBJ_FOOT = 12


def build(id_, cfg):
    tmp = Path(tempfile.mkdtemp()); nf = tmp / 'n.txt'; nf.write_text(id_, encoding='utf-8')
    px = PX.get(id_)
    subprocess.run([sys.executable, str(ROOT / 'tools/sprite_clean.py'), str(ROOT / cfg['src']), '--cols', '1', '--rows', '1', '--names', str(nf),
                    '--out', str(tmp / 'o'), '--scale', str(px or cfg['scale']), '--colors', '96', '--tol', '60'], check=True, capture_output=True,
                   env=dict(os.environ, PYTHONIOENCODING='utf-8'))
    im = Image.open(tmp / 'o.png').convert('RGBA')
    if px:   # phóng nguyên lần + đổi số đo
        im = im.resize((im.width * UP, im.height * UP), Image.NEAREST); f = cfg['scale'] * UP / px
        sc = lambda t: tuple(round(v * f) for v in t)
        cfg = dict(cfg, seed=sc(cfg['seed']), stair=sc(cfg['stair']), interact=sc(cfg['interact']), block=[sc(b) for b in cfg.get('block', [])],
                   floor=[sc(q) for q in cfg['floor']], **({'behind': [sc(b) for b in cfg['behind']]} if 'behind' in cfg else {}))
    a = np.array(im); drop_magenta(a)
    H, W = a.shape[:2]; alpha = a[..., 3] > 0
    lum = 0.3 * a[..., 0] + 0.59 * a[..., 1] + 0.11 * a[..., 2]
    r_, g_, b_ = [a[..., i].astype(int) for i in range(3)]
    tile = alpha & (lum > LUM_MIN) & (g_ > 0.68 * r_) & (b_ > 0.35 * r_)   # đá sàn (kể cả ám vàng đèn); gỗ nâu đỏ có g, b thấp so với r
    if cfg.get('floor_all'): tile = alpha.copy()   # sàn ám vàng rực (tầng tháp): cả đa giác là sàn, đồ đạc chỉ theo block
    # sàn = đa giác khoanh tay (cfg floor) trừ đồ đạc: điểm không phải đá sàn, bỏ nét mảnh (mạch vữa) bằng phép mở -> còn bàn, đỉnh, kệ
    poly = mask(W, H, [cfg['floor']])
    objs = morph(morph(poly & ~tile, OPEN_R, 'erode'), OPEN_R + 1, 'dilate')
    objs |= mask(W, H, rects=cfg.get('block', []))   # đồ đạc khoanh tay (mặt bàn sáng màu lọt lọc màu)
    stair = mask(W, H, rects=[cfg['stair']])
    vis_floor = (poly & ~objs) | stair            # điểm ảnh sàn thật -> nằm dưới người; còn lại (cả đồ đạc) ở lớp che
    # va chạm đồ đạc chỉ ở CHÂN (OBJ_FOOT px cuối mỗi cột của vật): đi ra sau bàn/đỉnh được, phần trên che người
    ofoot = np.zeros_like(objs)
    for x in range(W):
        run = -1
        for y in range(H - 1, -1, -1):
            if not objs[y, x]: run = -1; continue
            if run < 0: run = y
            ofoot[y, x] = y > run - OBJ_FOOT
    floor = flood(poly & ~ofoot, cfg['seed'])
    walk = floor | stair
    # bỏ ngóc ngách hẹp hơn thân nhân vật (hộp chân ±4 px): co 4 px, loang từ hạt giống, giãn lại
    # đúng như game (map.canStand): chân đứng được khi 4 góc hộp (x±4, y và y-5) đều trên sàn; loang các chân đứng được từ hạt giống,
    # rồi vùng đi được = hợp các hộp chân tới được (bỏ ngóc ngách người không vào được)
    def sh(m, dx, dy):
        o = np.zeros_like(m); ys = slice(max(0, dy), H + min(0, dy)); yd = slice(max(0, -dy), H + min(0, -dy))
        xs = slice(max(0, dx), W + min(0, dx)); xd = slice(max(0, -dx), W + min(0, -dx)); o[yd, xd] = m[ys, xs]; return o
    walk |= morph(morph(walk, 1, 'dilate'), 1, 'erode') & poly   # lấp khe 1–2 px (mạch vữa, viền đồ) giữa các mảng sàn
    stand = walk & sh(walk, -4, 0) & sh(walk, 4, 0) & sh(walk, -4, -5) & sh(walk, 4, -5)
    sy, sx = np.where(stand); k2 = np.argmin((sx - cfg['seed'][0]) ** 2 + (sy - cfg['seed'][1]) ** 2)
    reach = flood(stand, (int(sx[k2]), int(sy[k2])))
    box = np.zeros_like(reach)
    for dx in range(-4, 5):
        for dy in range(0, 6): box |= sh(reach, -dx, dy)   # điểm (x+dx, y-dy) thuộc hộp của chân (x, y)
    walk &= box
    if os.environ.get('NHA_DEBUG'):
        for y in range(90, H, 3): print(y, ''.join('R' if reach[y, x] else ('s' if stand[y, x] else ('w' if walk[y, x] else ('#' if ofoot[y, x] else ('.' if poly[y, x] else ' ')))) for x in range(40, 280, 2)))
    Image.fromarray(a).save(ROOT / f'sprites/nha_{id_}.png')
    front = a.copy(); front[vis_floor] = 0
    for cx0, cy, cx1 in cfg.get('cut', []): front[cy, cx0:cx1] = 0   # cắt rời cột/vách ở ngang sàn (lớp che xếp theo chân dải liền): phần trên ra sau người; nền vẫn vẽ hàng đó nên không lộ
    Image.fromarray(front).save(ROOT / f'sprites/nha_{id_}_front.png')
    # nhà lớn: chỉ sàn (loang từ hạt giống, nên góc kín tự thành đặc) + bậc đi được; mọi điểm ảnh khác của nhà đều đặc
    solid = alpha & ~walk   # walk đã gồm phần trên đồ đạc (chỉ chân đặc) và bỏ ngóc ngách kín
    # (16/11) chỗ trong suốt phía SAU nhà (trên đỉnh bậc) cũng đặc: không lọt vào khe kín giữa mái, vách núi và nhà bên cạnh
    behind = np.zeros_like(solid)
    for bx0, by0, bx1, by1 in cfg.get('behind', [(0, 0, W, cfg['stair'][1])]): behind[by0:by1, bx0:bx1] = True   # mặc định: cả phần trên đỉnh bậc
    solid |= behind & ~walk
    sp = np.zeros((H + 2 * PAD, W + 2 * PAD), bool); sp[PAD:PAD + H, PAD:PAD + W] = solid
    HP, WP = sp.shape
    fine = [''.join('#' if sp[j * C:(j + 1) * C, i * C:(i + 1) * C].mean() >= 0.3 else '.' for i in range((WP + C - 1) // C)) for j in range((HP + C - 1) // C)]
    s = cfg['stair']; foot = [(s[0] + s[2]) / 2, s[3]]
    ov = a.copy(); ov[walk & ~solid, 1] = 255; ov[solid, 0] = 255
    bg = Image.new('RGBA', (W, H), (20, 20, 40, 255)); bg.alpha_composite(Image.fromarray(ov))
    bg.resize((W * 2, H * 2), Image.NEAREST).save(ROOT / f'docs/playtest/M8_nha_{id_}_va_cham.png')
    print(id_, W, H, 'sàn px', int(floor.sum()))
    return {'w': W, 'h': H, 'foot': foot, 'cell': C, 'pad': PAD, 'fine': fine, 'interact': list(cfg['interact'])}


def main():
    ids = sys.argv[1:] or list(NHA)
    out = ROOT / 'src/data/sect_nha.js'; data = {}
    if out.exists():
        txt = out.read_text(encoding='utf-8'); data = json.loads(txt[txt.index('{'):txt.rindex('}') + 1])
    for i in ids: data[i] = build(i, NHA[i])
    out.write_text('// SINH TỰ ĐỘNG bởi tools/build_nha.py — đừng sửa tay. Công trình lớn đi vào được (sprites/nha_<id>*.png).\n'
                   '// foot: giữa đáy bậc (điểm đặt trên bản đồ); fine: lưới đặc `cell` px từ góc sprite lùi `pad`; interact: chỗ bấm E (px sprite).\n'
                   f'export const NHA = {json.dumps(data, ensure_ascii=False)};\n', encoding='utf-8')


if __name__ == '__main__':
    main()
