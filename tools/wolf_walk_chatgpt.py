"""Bước đi Lang Vương (26/11): thân GIỮ NGUYÊN từ khung gốc, chân lấy từ sheet ChatGPT vẽ (docs/concept/lang_vuong_p1_buoc_di_chatgpt.png, 2x4).

Thứ tự chân trong sheet ChatGPT không phải một chu kỳ đi đúng (chân xa gần như đứng, vài khung lặp) -> tách nửa SAU và nửa TRƯỚC của từng khung,
xếp lại thành chu kỳ 5 tư thế cho mỗi nửa, nửa trước chậm hơn nửa sau khoảng 1/5 chu kỳ (dáng đi bốn chân: chân sau đặt xuống rồi tới chân trước cùng bên).
Ghi đè 12 khung MINI2_walk* trong sprites/boss_mini2 và thêm MINI2_stand0..1 (đứng, bốn chân chạm đất). Sau đó chạy tools/boss_p1_pose.py để đổi màu cho pha 1.
Chạy: tools/wolf_walk_rig.py MINI2 -> tools/wolf_walk_chatgpt.py -> tools/boss_p1_pose.py
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import boss_pose_sheet as B  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'docs/concept/lang_vuong_p1_buoc_di_chatgpt.png'
S, DX, DY = 7.98, 2, 3          # cỡ ô điểm ảnh + lệch, dò theo bóng thân khung gốc (khớp 99 %)
HIP, CUT, TAIL_X = 30, 25, 14   # cột chia nửa sau / trước; hàng bắt đầu lấy chân; đuôi giữ của khung gốc
HIND = [1, 8, 4, 5, 7]          # tư thế chân sau theo chu kỳ (số khung trong sheet)
FORE = [5, 1, 2, 3, 4]          # tư thế chân trước
FRAMES, STRIDE = 12, 20.0
# bảng màu pha 2 (pha 1 do boss_p1_pose.py đổi)
INK, DEEP, DARK, MID, SHADE, FUR, PAW = [(2, 0, 2), (54, 27, 62), (83, 56, 105), (108, 78, 132), (167, 134, 183), (227, 201, 219), (251, 238, 226)]


def colour(px):
    r, g, b = (float(v) for v in px)
    lum = 0.3 * r + 0.59 * g + 0.11 * b
    if r > 190 and 110 < g < 215 and b < 135:
        return (246, 192, 92)                                   # khóa vàng
    if lum < 52:
        return INK
    if lum < 80:
        return DEEP if b < 80 else DARK
    if lum < 118:
        return DARK if lum < 98 else MID
    if lum < 165:
        return SHADE
    return FUR


def cells():
    rgb = np.array(Image.open(SRC).convert('RGB'))
    body = B.drop_small(~B.flood_bg(rgb))
    H, W = body.shape
    for r in range(2):
        for c in range(4):
            yield rgb[r * H // 2:(r + 1) * H // 2, c * W // 4:(c + 1) * W // 4], body[r * H // 2:(r + 1) * H // 2, c * W // 4:(c + 1) * W // 4]


def shrink(cr, cb, w, h, by0, bx0):
    ys, xs = np.nonzero(cb)
    ox, oy = xs.min() + DX, ys.min() + DY
    out = np.zeros((h, w, 4), np.uint8)
    for j in range(CUT, h):
        for i in range(w):
            y0, x0 = int(round((j - by0) * S + oy)), int(round((i - bx0) * S + ox))
            y1, x1 = int(round(y0 + S)), int(round(x0 + S))
            if y0 < 0 or x0 < 0 or y1 > cb.shape[0] or x1 > cb.shape[1] or cb[y0:y1, x0:x1].mean() < 0.55:
                continue
            q = cr[y0 + 1:y1 - 1, x0 + 1:x1 - 1].reshape(-1, 3)
            m = np.median(q, axis=0)
            white = (q.min(1) > 246).mean()
            if white > 0.7:
                continue                                        # túi nền trắng lọt giữa hai chân
            out[j, i, :3] = colour(m)
            out[j, i, 3] = 255
    return out


def polish(o):
    """bỏ điểm lẻ; tô khối chân sáng: cạnh sau đậm hơn, bàn chân sáng"""
    h, w = o.shape[:2]
    for _ in range(2):
        a = np.pad(o[..., 3] > 0, 1)
        nb = a[:-2, 1:-1].astype(int) + a[2:, 1:-1] + a[1:-1, :-2] + a[1:-1, 2:]
        o[(nb <= 1) & (o[..., 3] > 0)] = 0
    fur = (o[..., :3] == FUR).all(-1) & (o[..., 3] > 0)
    for y, x in zip(*np.nonzero(fur)):
        if x + 1 < w and not fur[y, x - 1] and fur[y, x + 1] and y < h - 3:
            o[y, x, :3] = SHADE if y % 3 else (198, 168, 201)
        elif y >= h - 4 and y < h - 1:
            o[y, x, :3] = PAW
    mid = (o[..., :3] == MID).all(-1) & (o[..., 3] > 0)
    for y, x in zip(*np.nonzero(mid)):
        if not mid[y, x - 1] and x + 1 < w and mid[y, x + 1]:
            o[y, x, :3] = DARK
    return o


def main():
    cut = json.loads((ROOT / 'docs/concept/lang_vuong_pha2_cat.json').read_text(encoding='utf-8'))
    sh = np.array(Image.open(ROOT / 'docs/concept/lang_vuong_pha2_cat.png').convert('RGBA'))
    (x, y), (w, h) = cut['frames']['MINI2_base'], cut['frameSize']
    base = sh[y:y + h, x:x + w].copy()
    on = base[..., 3] > 0
    by0, bx0 = np.nonzero(on)[0].min(), np.nonzero(on)[1].min()
    legs = [polish(shrink(cr, cb, w, h, by0, bx0)) for cr, cb in cells()]
    for k, x0 in ((1, 39), (2, 43), (4, 42), (5, 41), (6, 42)):     # chân trước phía XA: ChatGPT tô sáng vài khung -> đưa về màu tối
        o = legs[k - 1]
        for yy, xx in zip(*np.nonzero(o[..., 3])):
            if yy >= 29 and xx >= x0:
                c = tuple(int(v) for v in o[yy, xx, :3])
                if c in (FUR, PAW):
                    o[yy, xx, :3] = SHADE if yy >= h - 4 else MID
                elif c in (SHADE, (198, 168, 201)):
                    o[yy, xx, :3] = MID if yy >= h - 4 else DARK
    body = base.copy()
    body[CUT:, TAIL_X + 1:] = 0                                   # thân trên + đuôi của khung gốc
    body[32:, :] = 0                                              # dưới chóp đuôi

    def compose(hind, fore, bob):
        fr = np.zeros((h + 1, w, 4), np.uint8)
        for src, x0, x1 in ((legs[hind - 1], TAIL_X + 1, HIP), (legs[fore - 1], HIP, w)):
            m = src[:, x0:x1, 3] > 0
            fr[:h, x0:x1][m] = src[:, x0:x1][m]
        b = np.zeros_like(fr)
        b[bob:bob + h] = body
        m = b[..., 3] > 0
        fr[m] = b[m]
        fr[~B.drop_small(fr[..., 3] > 0, 0.03)] = 0               # vụn rời (mép cắt)
        return fr

    meta = json.loads((ROOT / 'sprites/boss_mini2.json').read_text(encoding='utf-8'))
    sheet = np.array(Image.open(ROOT / 'sprites/boss_mini2.png').convert('RGBA'))
    fw, fh = meta['frameSize']
    pad = 8
    frames = []
    for i in range(FRAMES):
        t = i / FRAMES
        hi, fo = HIND[int(t * 5 + 1e-9)], FORE[int(((t - 0.25) % 1) * 5 + 1e-9)]          # chân trước đặt xuống sau chân sau cùng bên 1/4 chu kỳ
        bob = 1 if i % 6 in (2, 3) else 0                         # nhún nhẹ hai lần mỗi chu kỳ
        frames.append((f'MINI2_walk{i}', compose(hi, fo, bob)))
    frames += [('MINI2_stand0', compose(6, 5, 0)), ('MINI2_stand1', compose(6, 5, 1))]
    n_old = sheet.shape[1] // fw
    for name, _ in frames:
        if name not in meta['frames']:
            meta['frames'][name] = [n_old * fw, 0]
            n_old += 1
    big = np.zeros((fh, n_old * fw, 4), np.uint8)
    big[:, :sheet.shape[1]] = sheet
    for name, fr in frames:
        fx = meta['frames'][name][0]
        big[:, fx:fx + fw] = 0
        big[:min(fh, h + 1), fx + pad:fx + pad + w] = fr[:fh]
    meta['eyes']['MINI2_stand'] = meta['eyes']['MINI2_walk']
    meta['tool'] = 'tools/wolf_walk_rig.py + tools/wolf_walk_chatgpt.py'
    Image.fromarray(big).save(ROOT / 'sprites/boss_mini2.png')
    (ROOT / 'sprites/boss_mini2.json').write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding='utf-8')
    print('khung', len(meta['frames']), 'STRIDE', STRIDE)


if __name__ == '__main__':
    main()
