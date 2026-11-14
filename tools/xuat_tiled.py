"""Dựng sảnh tông môn HIỆN TẠI của game thành file Tiled để người phát triển sửa tiếp trên Tiled.
Vào: JSON từ tools/xuat_tiled.mjs + ảnh chụp map 1:1 từ game (để lấy mẫu ô nước/vách/mây/đất/thác và khối rừng).
Ra (maps/tilesets/): sanh_game.tmx, dia_hinh_game.png/.tsx (ô địa hình lấy từ game + ô đỏ va chạm),
    vat.tsx + vat/*.png (ảnh rời: bệ, trận, thềm, nhà, cây, đèn, rào, cổng, bia, rừng). Cỏ/đá dùng co_da.tsx (terrain Co - Da).
Dùng: node tools/xuat_tiled.mjs > tmp.json ; .venv/Scripts/python.exe tools/xuat_tiled.py tmp.json anh_map_1_1.png
"""
import json
import random
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'maps/tilesets'
GRASS, WATER, STONE, TREE, ROCK, BUILDING, FENCE, DIRT, CLIFF, CLOUD, FALL = range(11)
WALK = {GRASS, STONE, DIRT, BUILDING, FENCE, TREE, ROCK}
# co_da.tsx: ô theo góc (TL, TR, BR, BL), 1 = cỏ, 2 = đá
CO_DA = {(1, 1, 2, 1): 32, (1, 1, 2, 2): 33, (1, 1, 1, 2): 34, (1, 2, 2, 1): 40, (2, 2, 2, 2): 41, (2, 1, 1, 2): 42, (1, 2, 1, 1): 48,
         (2, 2, 1, 1): 49, (2, 1, 1, 1): 50, (1, 2, 2, 2): 35, (2, 1, 2, 2): 36, (2, 2, 2, 1): 43, (2, 2, 1, 2): 44}


def trim(im):
    bb = im.getbbox()
    return im.crop(bb) if bb else im


def sheet_frames(name):
    meta = json.loads((ROOT / f'sprites/{name}.json').read_text(encoding='utf-8'))
    img = Image.open(ROOT / f'sprites/{name}.png').convert('RGBA'); fw, fh = meta['frameSize']
    return {n: trim(img.crop((x, y, x + fw, y + fh))) for n, (x, y) in meta['frames'].items()}


def main(js, cap):
    d = json.loads(Path(js).read_text(encoding='utf-8')); W, H = d['w'], d['h']
    t = np.array(d['tiles']).reshape(H, W); solid = np.array(d['solid']).reshape(H, W)
    shot = Image.open(cap).convert('RGBA'); A = np.array(shot)
    at = lambda x, y: t[y, x] if 0 <= x < W and 0 <= y < H else TREE
    blk = lambda x, y: shot.crop((x * 16, y * 16, x * 16 + 16, y * 16 + 16))

    # ---- tileset địa hình lấy mẫu từ game: mỗi "khóa" (kiểu ô + hàng xóm) một mẫu
    keys, tiles = {}, []
    red = Image.new('RGBA', (16, 16), (230, 40, 40, 150)); tiles.append(red); keys['va_cham'] = 0

    def key_of(x, y):
        k = t[y, x]
        if k == WATER: return ('nuoc', at(x, y - 1) != WATER, (x + y) & 1)
        if k == CLIFF:
            dep = 0
            while dep < 6 and at(x, y - dep - 1) == CLIFF: dep += 1
            top = at(x, y - 1) in WALK or at(x, y - 1) == WATER
            return ('vach', min(2, dep >> 1), top, at(x - 1, y) in WALK, at(x + 1, y) in WALK, (x * 7 + y * 3) % 3)
        if k == FALL: return ('thac', at(x, y - 1) != FALL, at(x, y + 1) != FALL)
        if k == CLOUD: return ('may',)
        if k in (DIRT, FENCE): return ('dat', (x * 5 + y * 3) % 4)
        return None
    cand = {}
    for y in range(H):
        for x in range(W):
            k = key_of(x, y)
            if k is not None: cand.setdefault(k, []).append((x, y))
    for k, cs in cand.items():
        if k[0] == 'may':   # mây: ô phẳng màu nền mây của game (không lấy chỗ có bông mây)
            im = Image.new('RGBA', (16, 16), (0xc3, 0xc6, 0xe4, 255))
        else:   # mẫu điển hình: ô gần trung vị (từng điểm ảnh) của mọi ô cùng khóa nhất -> tránh ô có sen/đồ vật/sói đè
            bl = np.stack([A[y * 16:y * 16 + 16, x * 16:x * 16 + 16, :3].astype(int) for x, y in cs[:400]])
            med = np.median(bl, 0); i = int(np.argmin(np.abs(bl - med).mean((1, 2, 3))))
            im = blk(*cs[i])
        keys[k] = len(tiles); tiles.append(im)
    cols = 8; rows = (len(tiles) + cols - 1) // cols
    ts = Image.new('RGBA', (cols * 16, rows * 16), (0, 0, 0, 0))
    for i, im in enumerate(tiles): ts.paste(im, ((i % cols) * 16, (i // cols) * 16))
    ts.save(OUT / 'dia_hinh_game.png')
    (OUT / 'dia_hinh_game.tsx').write_text(f'''<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.10" tiledversion="1.12.2" name="dia_hinh_game" tilewidth="16" tileheight="16" tilecount="{len(tiles)}" columns="{cols}">
 <image source="dia_hinh_game.png" width="{cols * 16}" height="{rows * 16}"/>
</tileset>
''', encoding='utf-8')
    G_CO, G_DH = 1, 65

    # ---- lớp nen: cỏ/đá bằng co_da (đá ghép viền theo góc), còn lại ô địa hình game
    rnd = random.Random(7)
    isS = lambda x, y: at(x, y) == STONE
    vs = lambda vx, vy: all(isS(vx - dx, vy - dy) for dx in (0, 1) for dy in (0, 1))   # đỉnh (vx, vy) là đá khi cả 4 ô quanh nó là đá
    nen = np.zeros((H, W), int)
    for y in range(H):
        for x in range(W):
            k = t[y, x]; kk = key_of(x, y)
            if kk is not None: nen[y, x] = G_DH + keys[kk]; continue
            if k == STONE:
                c = tuple(2 if vs(*v) else 1 for v in ((x, y), (x + 1, y), (x + 1, y + 1), (x, y + 1)))
                if c == (2, 2, 2, 2): nen[y, x] = G_CO + (16 if rnd.random() < 0.75 else 24) + rnd.randrange(8)
                elif c == (1, 1, 1, 1): nen[y, x] = G_CO + rnd.randrange(8)
                else: nen[y, x] = G_CO + CO_DA.get(c, 41)
            else:
                nen[y, x] = G_CO + (8 if rnd.random() < 0.12 else 0) + rnd.randrange(8)
    va = np.where(solid == 1, G_DH + 0, 0)

    # ---- ảnh rời (collection) cho vật
    (OUT / 'vat').mkdir(exist_ok=True)
    imgs = {}
    def add_img(name, im):
        if name not in imgs: im.save(OUT / f'vat/{name}.png'); imgs[name] = im
        return name
    tm = {}
    for s in ('tm_cong_trinh', 'tm_do_vat', 'tm_cay_da', 'tm_them', 'tm_tran'): tm.update(sheet_frames(s))
    ct, bia = sheet_frames('cong_trinh'), sheet_frames('bia')
    be = Image.open(ROOT / 'sprites/tm_be.png').convert('RGBA'); be.alpha_composite(Image.open(ROOT / 'sprites/tm_be_front.png').convert('RGBA'))
    nen_vat, vat = [], []   # (tên ảnh, x trái, y đáy)
    ax, ay = d['plaza']['anchor']
    nen_vat.append((add_img('be_phap_dai', be), round(d['cx'] - ax), round(d['cy'] - ay) + be.height))
    tr = tm['tran']; nen_vat.append((add_img('tran', tr), round(d['cx'] - tr.width / 2), round(d['cy'] - tr.height / 2) + tr.height))
    for b in d['buildings']:
        if b['them']:
            im = tm[b['them']['kind']]; nen_vat.append((add_img(b['them']['kind'], im), b['them']['x'], b['them']['y'] + im.height))
        im = tm[b['id']]; vat.append((add_img(b['id'], im), round(b['foot']['x'] - im.width / 2), round(b['foot']['y'])))
    for o in d['props']:
        im = tm.get(o['s'])
        if im is None: continue
        (nen_vat if o['flat'] else vat).append((add_img(o['s'], im), round(o['x'] - im.width / 2), round(o['y'])))
    g = ct['cong']; vat.append((add_img('cong_bi_canh', g), round(d['portal']['x'] - g.width / 2), round(d['portal']['y'] + 6)))
    bb = bia['bia']; vat.append((add_img('bia', bb), round(d['bia']['x'] - bb.width / 2), round(d['bia']['y'] + 2)))
    # khối rừng (cây ô TREE trong game là sprite rời): cắt từ ảnh chụp theo từng mảng liền
    seen = np.zeros_like(t, bool); n = 0
    for y0 in range(H):
        for x0 in range(W):
            if t[y0, x0] != TREE or seen[y0, x0]: continue
            st = [(x0, y0)]; cells = []
            while st:
                x, y = st.pop()
                if not (0 <= x < W and 0 <= y < H) or seen[y, x] or t[y, x] != TREE: continue
                seen[y, x] = True; cells.append((x, y)); st += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
            xs = [c[0] for c in cells]; ys = [c[1] for c in cells]
            l, tp, r, bt = min(xs) * 16 - 8, max(0, min(ys) * 16 - 40), (max(xs) + 1) * 16 + 8, (max(ys) + 1) * 16
            l, r = max(0, l), min(W * 16, r)
            n += 1; vat.append((add_img(f'rung_{n}', shot.crop((l, tp, r, bt))), l, bt))
    names = list(imgs)
    mw = max(i.width for i in imgs.values()); mh = max(i.height for i in imgs.values())
    tiles_xml = '\n'.join(f' <tile id="{i}">\n  <image width="{imgs[nm].width}" height="{imgs[nm].height}" source="vat/{nm}.png"/>\n </tile>' for i, nm in enumerate(names))
    (OUT / 'vat.tsx').write_text(f'''<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.10" tiledversion="1.12.2" name="vat" tilewidth="{mw}" tileheight="{mh}" tilecount="{len(names)}" columns="0">
 <grid orientation="orthogonal" width="1" height="1"/>
{tiles_xml}
</tileset>
''', encoding='utf-8')
    G_VAT = G_DH + len(tiles)

    # ---- file map
    oid = [1]
    def objs(lst):
        out = []
        for nm, x, y in lst:
            im = imgs[nm]
            out.append(f'  <object id="{oid[0]}" name="{nm}" gid="{G_VAT + names.index(nm)}" x="{x}" y="{y}" width="{im.width}" height="{im.height}"/>'); oid[0] += 1
        return '\n'.join(out)
    def pt(name, p):
        s = f'  <object id="{oid[0]}" name="{name}" x="{round(p["x"])}" y="{round(p["y"])}">\n   <point/>\n  </object>'; oid[0] += 1; return s
    csv = lambda a: ',\n'.join(','.join(str(v) for v in row) for row in a)
    empty = np.zeros((H, W), int)
    pts = [pt('phap_dai', {'x': d['cx'], 'y': d['cy']}), pt('spawn', d['spawn'])] + [pt(b['id'], b['door']) for b in d['buildings']] + \
          [pt('luyen_vo', d['pen']['door']), pt('cong_bi_canh', d['portal']), pt('bia', d['bia'])]
    P = d['pen']; pts.append(f'  <object id="{oid[0]}" name="san_luyen_vo" x="{P["x"]}" y="{P["y"]}" width="{P["w"]}" height="{P["h"]}"/>'); oid[0] += 1
    lay = lambda i, nm, a, extra='': f' <layer id="{i}" name="{nm}" width="{W}" height="{H}"{extra}>\n  <data encoding="csv">\n{csv(a)}\n</data>\n </layer>'
    tmx = f'''<?xml version="1.0" encoding="UTF-8"?>
<map version="1.10" tiledversion="1.12.2" orientation="orthogonal" renderorder="right-down" width="{W}" height="{H}" tilewidth="16" tileheight="16" infinite="0" nextlayerid="9" nextobjectid="{oid[0] + 10}">
 <tileset firstgid="{G_CO}" source="co_da.tsx"/>
 <tileset firstgid="{G_DH}" source="dia_hinh_game.tsx"/>
 <tileset firstgid="{G_VAT}" source="vat.tsx"/>
{lay(1, 'nen', nen)}
{lay(2, 'trang_tri', empty)}
{lay(3, 'duoi', empty)}
 <objectgroup id="4" name="nen_vat">
{objs(nen_vat)}
 </objectgroup>
 <objectgroup id="5" name="cong_trinh" draworder="topdown">
{objs(vat)}
 </objectgroup>
{lay(6, 'tren', empty)}
{lay(7, 'va_cham', va, ' opacity="0.45"')}
 <objectgroup id="8" name="diem">
{chr(10).join(pts)}
 </objectgroup>
</map>
'''
    (OUT / 'sanh_game.tmx').write_text(tmx, encoding='utf-8')
    print('map', W, H, 'ô địa hình game', len(tiles), 'ảnh vật', len(names), 'vật', len(vat), 'vật nền', len(nen_vat))
    return d, nen, G_CO, G_DH, ts, imgs, nen_vat, vat


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
