"""M7-12: gộp sprite đã làm sạch (art/tien_hoa_moi/*.png từ tools/sprite_clean.py) vào game.

1. Icon 2 tiến hóa mới -> thêm vào sprites/bieu_tuong.png/.json (cùng cỡ ô 48x41, thêm một hàng mới nếu cần).
2. Sprite VFX (hàn ấn, khối băng, vòng phong ấn, gai băng nổ) -> sprites/tien_hoa.png/.json
   (mỗi khung một ô, game cắt sát nội dung khi nạp như sheet công trình).
Lọc bỏ pixel tím/magenta sót (vệt nền) ở khối băng và gai băng (hai hình chỉ có màu băng).
Chạy lại được nhiều lần: icon đã có trong bieu_tuong.json thì ghi đè đúng ô cũ.
Dùng: .venv/Scripts/python.exe tools/merge_tien_hoa.py
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / 'art' / 'tien_hoa_moi'
SPR = ROOT / 'sprites'


def frames_of(name):
    meta = json.loads((ART / f'{name}.json').read_text(encoding='utf-8'))
    img = Image.open(ART / f'{name}.png').convert('RGBA')
    fw, fh = meta['frameSize']
    return {n: img.crop((x, y, x + fw, y + fh)) for n, (x, y) in meta['frames'].items()}


def drop_magenta(im):
    a = np.array(im)
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    bad = (r > g + 40) & (b > g + 20) & (a[..., 3] > 0)
    a[bad, 3] = 0
    return Image.fromarray(a), int(bad.sum())


def merge_icons():
    meta = json.loads((SPR / 'bieu_tuong.json').read_text(encoding='utf-8'))
    sheet = Image.open(SPR / 'bieu_tuong.png').convert('RGBA')
    fw, fh = meta['frameSize']
    new = frames_of('a')
    cols = sheet.width // fw
    used = {tuple(v) for v in meta['frames'].values()}
    slots = [(c * fw, r * fh) for r in range(sheet.height // fh + 2) for c in range(cols)]
    for n, im in new.items():
        assert im.size == (fw, fh), (n, im.size)
        pos = tuple(meta['frames'][n]) if n in meta['frames'] else next(s for s in slots if s not in used)
        used.add(pos)
        if pos[1] + fh > sheet.height:                      # thêm hàng
            grown = Image.new('RGBA', (sheet.width, pos[1] + fh), (0, 0, 0, 0)); grown.paste(sheet, (0, 0)); sheet = grown
        sheet.paste(Image.new('RGBA', (fw, fh), (0, 0, 0, 0)), pos)
        sheet.alpha_composite(im, pos)
        meta['frames'][n] = list(pos)
    sheet.save(SPR / 'bieu_tuong.png')
    (SPR / 'bieu_tuong.json').write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding='utf-8')
    print('icons:', list(new), 'sheet', sheet.size)


def build_fx():
    parts = {}
    for name in ('d', 'b', 'c'):
        parts.update(frames_of(name))
    for n in ('khoi_bang', 'bang_no'):
        parts[n], k = drop_magenta(parts[n])
        print(f'{n}: bỏ {k} pixel tím')
    fw = max(im.width for im in parts.values()); fh = max(im.height for im in parts.values())
    sheet = Image.new('RGBA', (fw * len(parts), fh), (0, 0, 0, 0))
    frames = {}
    for i, (n, im) in enumerate(parts.items()):
        x = i * fw + (fw - im.width) // 2; y = fh - im.height
        sheet.alpha_composite(im, (x, y)); frames[n] = [i * fw, 0]
    sheet.save(SPR / 'tien_hoa.png')
    meta = {'frameSize': [fw, fh], 'pivot': [fw // 2, fh - 1], 'image': 'tien_hoa.png', 'source': 'docs/concept/tien_hoa_moi_chatgpt.png',
            'tool': 'tools/sprite_clean.py + tools/merge_tien_hoa.py', 'frames': frames}
    (SPR / 'tien_hoa.json').write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding='utf-8')
    print('fx:', list(frames), 'sheet', sheet.size)


if __name__ == '__main__':
    merge_icons()
    build_fx()
