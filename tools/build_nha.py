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
    'dan_duoc': dict(src='docs/concept/nha_dan_duoc_lon_chatgpt.png', scale=4.4, seed=(130, 160), stair=(97, 168, 163, 229), interact=(130, 158),
                     block=[(50, 134, 106, 166), (154, 134, 210, 166)],   # cả bàn + đồ trên bàn là MỘT vật (chỉ chân đặc)
                     floor=[(90, 104), (172, 104), (215, 140), (218, 168), (165, 170), (97, 170), (42, 168), (45, 140)]),
}
LUM_MIN, OPEN_R, FOOT, GROW, PAD, C = 85, 2, 8, 4, 8, 4
OBJ_FOOT = 12


def build(id_, cfg):
    tmp = Path(tempfile.mkdtemp()); nf = tmp / 'n.txt'; nf.write_text(id_, encoding='utf-8')
    subprocess.run([sys.executable, str(ROOT / 'tools/sprite_clean.py'), str(ROOT / cfg['src']), '--cols', '1', '--rows', '1', '--names', str(nf),
                    '--out', str(tmp / 'o'), '--scale', str(cfg['scale']), '--colors', '96', '--tol', '60'], check=True, capture_output=True,
                   env=dict(os.environ, PYTHONIOENCODING='utf-8'))
    a = np.array(Image.open(tmp / 'o.png').convert('RGBA')); drop_magenta(a)
    H, W = a.shape[:2]; alpha = a[..., 3] > 0
    lum = 0.3 * a[..., 0] + 0.59 * a[..., 1] + 0.11 * a[..., 2]
    r_, g_, b_ = [a[..., i].astype(int) for i in range(3)]
    tile = alpha & (lum > LUM_MIN) & (g_ > 0.68 * r_) & (b_ > 0.5 * r_)   # đá sàn (kể cả ám vàng đèn); gỗ nâu đỏ có g, b thấp so với r
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
        for y in range(100, 172, 3): print(y, ''.join('R' if reach[y, x] else ('s' if stand[y, x] else ('w' if walk[y, x] else ('#' if ofoot[y, x] else ('.' if poly[y, x] else ' ')))) for x in range(36, 224, 2)))
    Image.fromarray(a).save(ROOT / f'sprites/nha_{id_}.png')
    front = a.copy(); front[vis_floor] = 0
    Image.fromarray(front).save(ROOT / f'sprites/nha_{id_}_front.png')
    # nhà lớn: chỉ sàn (loang từ hạt giống, nên góc kín tự thành đặc) + bậc đi được; mọi điểm ảnh khác của nhà đều đặc
    solid = alpha & ~walk   # walk đã gồm phần trên đồ đạc (chỉ chân đặc) và bỏ ngóc ngách kín
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
