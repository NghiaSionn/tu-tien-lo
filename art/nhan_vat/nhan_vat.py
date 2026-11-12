"""Sprite nhân vật chính Tu Tiên Lộ — vẽ theo concept docs/concept/nhan_vat_chinh_chatgpt.jpg (ChatGPT, 12/11/2026).

Lấy từ concept (bản chibi top-down): đầu to, búi tóc cài trâm ngọc xanh, ruy băng xanh lam, áo bào trắng nhiều lớp
cổ chéo xanh lam, đai xanh khóa vàng, ngọc bội xanh ngọc, vạt và gấu áo xanh lam, giày đen. Bảng màu concept: trắng ngà,
xanh lam, xanh ngọc, đen, vàng nhạt.

Khung 16x24, pivot (8, 23) = giữa hai bàn chân. Hướng: down, up, side (nhìn phải; game lật cho trái).
Mỗi hướng: walk0..3 (walk0 = đứng), atk (vung kiếm), hurt (trúng đòn). Thêm sit (tọa thiền, mắt nhắm).
Xuất: sprites/nhan_vat.png (1x), sprites/nhan_vat.json, docs/m5_02_nhan_vat.png (ảnh 6x trên nền cỏ + so với concept).
Chạy: python art/nhan_vat/nhan_vat.py   (cần pillow)
"""
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
FW, FH = 16, 24
PIVOT = (8, 23)

PAL = {
    'k': '#1c1626',  # viền
    'h': '#2a2338',  # tóc
    'H': '#4b4163',  # tóc sáng
    's': '#f4cfa8',  # da
    'S': '#d7a27f',  # da tối
    'w': '#f3f0e8',  # áo trắng ngà
    'W': '#c8d0de',  # áo bóng
    'b': '#4672c4',  # xanh lam
    'd': '#2c4a8e',  # xanh lam đậm
    'j': '#74d4b8',  # ngọc
    'y': '#e6c35c',  # vàng
    'n': '#24202c',  # giày
    'B': '#dfe8f5',  # lưỡi kiếm
    'r': '#e05a4a',  # đỏ (trúng đòn: má)
}

# ---------- nửa trên (hàng 0..21) ----------
DOWN = [
    "......kkkk......",
    ".....khjjhk.....",
    ".....khhhhk.....",
    "....kkhhhhkk....",
    "...khhHHhhhhk...",
    "..khhHhhhhhhhk..",
    "..khhhhhhhhhhk..",
    "..khhsshhsshhk..",
    "..khsksssskshk..",
    "..khsssssssshk..",
    "..kkhSssssShkk..",
    "...kkwbwwbwkk...",
    "..kwwwbwwbwwwk..",
    ".kwwwwwbbwwwwwk.",
    ".kwwkdyyyydkwwk.",
    ".kswkdddjddkwsk.",
    ".kkwwwwjwwwwwkk.",
    "..kwwwwbbwwwwk..",
    "..kwwwwbbwwwwk..",
    "..kWwwwbbwwwWk..",
    "..kbbbbddbbbbk..",
    "...kkkkkkkkkk...",
]
UP = [
    "......kkkk......",
    ".....khbbhk.....",
    ".....khhhhk.....",
    "....kkhhhhkk....",
    "...khhHHhhhhk...",
    "..khhHhhhhhhhk..",
    "..khhhhhhhhhhk..",
    "..khhhhhhhhhhk..",
    "..khhhhhhhhhhk..",
    "..khhHhhhhhhhk..",
    "..kkhhhhhhhhkk..",
    "...kkwhhhhwkk...",
    "..kwwwhhhhwwwk..",
    ".kwwwwwhhwwwwwk.",
    ".kwwkddyyddkwwk.",
    ".kswkddddddkwsk.",
    ".kkwwwwwwwwwwkk.",
    "..kwwwwwwwwwwk..",
    "..kwwwwwwwwwwk..",
    "..kWwwwwwwwwWk..",
    "..kbbbbbbbbbbk..",
    "...kkkkkkkkkk...",
]
SIDE = [
    ".....kkkk.......",
    "....khjjhk......",
    "....khhhhk......",
    "...kkhhhhkk.....",
    "..khhHHhhhhk....",
    ".khhHhhhhhhhk...",
    ".khhhhhhhhhhk...",
    ".kbhhhhhssssk...",
    ".kbhhhhhsksssk..",
    "..khhhhhsssssk..",
    "..kkhhhhSsssk...",
    "...khhkwwbwk....",
    "...khkwwwbwwk...",
    "..khkwwwwbwwk...",
    "..kkwwddyyddk...",
    "...kwwwwwjwsk...",
    "...kwwwwwjwwk...",
    "...kwwwwwwbwk...",
    "...kwwwwwwbwk...",
    "...kWwwwwwbWk...",
    "...kbbbbbbddk...",
    "....kkkkkkkk....",
]
# ---------- chân (hàng 22..23) theo khung đi ----------
FEET = {
    'down': [["....knnkknnk....", "....kkkkkkkk...."],
             ["....kkkkknnk....", "........kkkk...."],
             ["....knnkknnk....", "....kkkkkkkk...."],
             ["....knnkkkkk....", "....kkkk........"]],
    'side': [["......knnnk.....", "......kkkkk....."],
             ["....knnk.knnk...", "....kkkk.kkkk..."],
             ["......knnnk.....", "......kkkkk....."],
             [".....knnkknnk...", ".....kkkkkkkk..."]],
}
FEET['up'] = FEET['down']
UPPER = {'down': DOWN, 'up': UP, 'side': SIDE}

SIT = [
    "......kkkk......",
    ".....khjjhk.....",
    ".....khhhhk.....",
    "....kkhhhhkk....",
    "...khhHHhhhhk...",
    "..khhHhhhhhhhk..",
    "..khhhhhhhhhhk..",
    "..khhsshhsshhk..",
    "..khsSSssSSshk..",
    "..khsssssssshk..",
    "..kkhSssssShkk..",
    "...kkwbwwbwkk...",
    "..kwwwbwwbwwwk..",
    ".kwwwwwbbwwwwwk.",
    ".kwwkdyyyydkwwk.",
    "kwwwkssddsskwwwk",
    "kwwwwwwjjwwwwwwk",
    "kbbwwwwwwwwwwbbk",
    ".kbbbbnnnnbbbbk.",
    "..kkkkkkkkkkkk..",
]

# vung kiếm: lớp chồng lên khung đứng (toạ độ, ký tự)
ATK = {
    'down': [(13, 16, 'y'), (13, 17, 'B'), (13, 18, 'B'), (13, 19, 'B'), (13, 20, 'B'), (13, 21, 'B'), (14, 16, 'k'),
             (12, 17, 'k'), (14, 17, 'k'), (12, 18, 'k'), (14, 18, 'k'), (12, 19, 'k'), (14, 19, 'k'), (12, 20, 'k'),
             (14, 20, 'k'), (12, 21, 'k'), (14, 21, 'k'), (13, 22, 'k')],
    'up': [(13, 6, 'B'), (13, 7, 'B'), (13, 8, 'B'), (13, 9, 'B'), (13, 10, 'y'), (12, 6, 'k'), (14, 6, 'k'),
           (12, 7, 'k'), (14, 7, 'k'), (12, 8, 'k'), (14, 8, 'k'), (12, 9, 'k'), (14, 9, 'k'), (13, 5, 'k'),
           (14, 10, 'k'), (14, 11, 'k'), (13, 11, 's')],
    'side': [(12, 15, 's'), (13, 15, 'y'), (14, 15, 'B'), (15, 15, 'B'), (12, 14, 'k'), (13, 14, 'k'), (14, 14, 'k'),
             (15, 14, 'k'), (12, 16, 'k'), (13, 16, 'k'), (14, 16, 'k'), (15, 16, 'k'), (11, 15, 'w')],
}
# trúng đòn: mắt nhắm (><) + má đỏ, ngả người 1 px
HURT_FACE = {
    'down': [(4, 8, 'k'), (5, 8, 's'), (5, 7, 'k'), (10, 8, 's'), (11, 8, 'k'), (10, 7, 'k'), (4, 9, 'r'), (11, 9, 'r')],
    'up': [],
    'side': [(9, 8, 's'), (9, 7, 'k'), (10, 8, 'k'), (11, 9, 'r')],
}


def grid_to_img(rows, w=FW, h=FH, top=0):
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    px = img.load()
    for y, row in enumerate(rows):
        assert len(row) == w, (len(row), row)
        for x, ch in enumerate(row):
            if ch != '.':
                px[x, y + top] = hexrgb(PAL[ch])
    return img


def hexrgb(c):
    c = c.lstrip('#')
    return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16), 255)


def overlay(img, pts):
    px = img.load()
    for x, y, ch in pts:
        px[x, y] = hexrgb(PAL[ch])
    return img


def shift(img, dx, dy):
    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    out.paste(img, (dx, dy))
    return out


def frames():
    out = {}
    for d in ('down', 'up', 'side'):
        for i in range(4):
            rows = UPPER[d] + FEET[d][i]
            img = grid_to_img(rows)
            if i in (1, 3):  # nhún: thân hạ 1 px khi một chân nhấc (giữ chân tại chỗ)
                body = shift(grid_to_img(UPPER[d] + ["." * FW] * 2), 0, 1)
                feet = grid_to_img(["." * FW] * 22 + FEET[d][i])
                img = Image.alpha_composite(feet, body)
            out[f'{d}_walk{i}'] = img
        out[f'{d}_atk'] = overlay(grid_to_img(UPPER[d] + FEET[d][0]), ATK[d])
        hurt = overlay(grid_to_img(UPPER[d] + ["." * FW] * 2), HURT_FACE[d])
        hurt = shift(hurt, -1 if d == 'side' else 0, 0)   # ngả ra sau (ngang), không nhấc khỏi chân
        out[f'{d}_hurt'] = Image.alpha_composite(grid_to_img(["." * FW] * 22 + FEET[d][0]), hurt)
    out['sit'] = grid_to_img(SIT, top=FH - len(SIT))
    return out


def check(fr):
    errs = []
    for name, img in fr.items():
        a = img.getchannel('A')
        bbox = a.getbbox()
        if not bbox:
            errs.append(f'{name}: rỗng')
            continue
        if bbox[3] != FH:
            errs.append(f'{name}: chân không chạm đáy khung (pivot sai) bbox={bbox}')
    return errs


def main():
    fr = frames()
    errs = check(fr)
    for e in errs:
        print('LỖI', e)
    names = list(fr)
    sheet = Image.new('RGBA', (FW * len(names), FH), (0, 0, 0, 0))
    meta = {'frameSize': [FW, FH], 'pivot': list(PIVOT), 'image': 'nhan_vat.png', 'frames': {},
            'source': 'art/nhan_vat/nhan_vat.py', 'concept': 'docs/concept/nhan_vat_chinh_chatgpt.jpg'}
    for i, n in enumerate(names):
        sheet.paste(fr[n], (i * FW, 0))
        meta['frames'][n] = [i * FW, 0]
    out = ROOT / 'sprites'
    out.mkdir(exist_ok=True)
    sheet.save(out / 'nhan_vat.png')
    (out / 'nhan_vat.json').write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding='utf-8')
    preview(fr, names)
    print(f'{len(names)} khung -> sprites/nhan_vat.png; lỗi: {len(errs)}')
    return 1 if errs else 0


def preview(fr, names):
    k = 6
    cols = 6
    rows = (len(names) + cols - 1) // cols
    cw, ch = (FW + 6) * k, (FH + 6) * k
    bg = Image.new('RGBA', (cw * cols, ch * rows), (86, 140, 72, 255))
    px = bg.load()
    for y in range(bg.height):  # nền cỏ ca rô nhẹ như game
        for x in range(bg.width):
            if ((x // k) * 7 + (y // k) * 13) % 11 == 0:
                px[x, y] = (96, 152, 80, 255)
    for i, n in enumerate(names):
        img = fr[n].resize((FW * k, FH * k), Image.NEAREST)
        shadow = Image.new('RGBA', (12 * k, 2 * k), (0, 0, 0, 64))
        x0, y0 = (i % cols) * cw + 3 * k, (i // cols) * ch + 3 * k
        bg.alpha_composite(shadow, (x0 + 2 * k, y0 + (FH - 1) * k))
        bg.alpha_composite(img, (x0, y0))
    bg.convert('RGB').save(ROOT / 'docs' / 'm5_02_nhan_vat.png')


if __name__ == '__main__':
    sys.exit(main())
