"""Tư thế Lang Vương PHA 1 (26/11): đổi màu các tư thế pha 2 đã có (cùng dáng, cùng cỡ) về lông trắng xám của pha 1.

Một con sói cho cả trận lẫn cutscene (người phát triển yêu cầu đồng bộ 26/11): khung cũ MINI_* là bí danh trong JSON.
Nguồn: boss_mini2_lao (gồng/bật/bay/đáp), boss_mini2_dam (giơ vuốt/cào), boss_mini2 (hú) -> sprites/boss_mini1_pose.
Đỏ (bờm, chóp đuôi, vết ấn) -> trắng tím nhạt / xám tím theo độ sáng; vàng (vương miện, đai) giữ nguyên; thân -> bảng màu boss_walk.
Chạy: .venv/Scripts/python.exe tools/boss_p1_pose.py
"""
import colorsys
import json
import re
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PICK = [('boss_mini2_lao', 'LAO_gong', 'P1_gong'), ('boss_mini2_lao', 'LAO_bat', 'P1_bat'), ('boss_mini2_lao', 'LAO_bay', 'P1_bay'),
        ('boss_mini2_lao', 'LAO_dap', 'P1_dap'), ('boss_mini2_dam', 'DAM_gio', 'P1_gio'), ('boss_mini2_dam', 'DAM_cao', 'P1_cao'), ('boss_mini2', 'MINI2_howl', 'P1_hu'),
        ('boss_mini2', 'MINI2_atk', 'P1_atk')] + [('boss_mini2', f'MINI2_walk{i}', f'P1_walk{i}') for i in range(12)]
# tên khung cũ (trận, cutscene) -> khung mới: cả game dùng MỘT con sói
ALIAS = {**{f'MINI_w{i}': f'P1_walk{i}' for i in range(12)}, **{f'MINI_walk{i}': f'P1_walk{i * 3}' for i in range(4)}, 'MINI_atk': 'P1_atk', 'MINI_hurt': 'P1_walk0',
         'MINI_i0': 'P1_walk0', 'MINI_i1': 'P1_gong', 'MINI_i2': 'P1_hu', 'MINI_i3': 'P1_gong', 'MINI_i4': 'P1_bay', 'MINI_i5': 'P1_dap'}
MANE = [(40, '#4c427f'), (75, '#8577a0'), (110, '#b4a4c4'), (170, '#d8c8da'), (256, '#f5eadd')]      # đỏ theo độ sáng -> lông
FUR = [(14, '#020102'), (45, '#140815'), (70, '#332643'), (95, '#4c427f'), (125, '#695784'), (150, '#85749a'), (172, '#9e8fb3'), (190, '#b7a6c4'), (214, '#e1cfd8'), (232, '#fbede0'), (256, '#fcf7f1')]


def hexc(s):
    return np.array([int(s[i:i + 2], 16) for i in (1, 3, 5)], np.uint8)


def remap(px):
    r, g, b = (int(v) for v in px)
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    lum = 0.3 * r + 0.59 * g + 0.11 * b
    if s > 0.28 and 0.06 < h < 0.17 and v > 0.4:          # vàng
        return px
    red = s > 0.5 and (h > 0.88 or h < 0.06) and v > 0.25
    table = MANE if red else FUR
    k = v * 190 if red else lum
    for lim, c in table:
        if k < lim:
            return hexc(c)
    return px


def main():
    frames = []
    for sheet, src, dst in PICK:
        meta = json.loads((ROOT / f'sprites/{sheet}.json').read_text(encoding='utf-8'))
        im = np.array(Image.open(ROOT / f'sprites/{sheet}.png').convert('RGBA'))
        x, y = meta['frames'][src][:2]
        w, h = meta['frameSize']
        cell = im[y:y + h, x:x + w].copy()
        on = cell[..., 3] > 0
        cell[on, :3] = np.array([remap(p) for p in cell[on][:, :3]])
        ev = meta['eyes'].get(src) or meta['eyes'].get(re.sub(r'\d+$', '', src)) or []
        for ex, ey in ev[:1]:                                   # mắt hổ phách
            if cell[ey, ex, 3]:
                cell[ey, ex, :3] = hexc('#ffc23a')
        frames.append((dst, cell, meta['pivot'], ev))
    left = max(p[0] for _, _, p, _ in frames)
    top = max(p[1] for _, _, p, _ in frames)
    right = max(c.shape[1] - p[0] for _, c, p, _ in frames)
    bot = max(c.shape[0] - p[1] for _, c, p, _ in frames)
    fw, fh = left + right, top + bot
    sheet = np.zeros((fh, fw * len(frames), 4), np.uint8)
    mf, eyes = {}, {}
    for i, (name, c, p, e) in enumerate(frames):
        ox, oy = i * fw + left - p[0], top - p[1]
        sheet[oy:oy + c.shape[0], ox:ox + c.shape[1]] = c
        mf[name] = [i * fw, 0]
        eyes[name] = [[ex + left - p[0], ey + top - p[1]] for ex, ey in e]
    for a, b in ALIAS.items():
        mf[a] = mf[b]
        eyes[a] = eyes[b]
    Image.fromarray(sheet).save(ROOT / 'sprites/boss_mini1_pose.png')
    (ROOT / 'sprites/boss_mini1_pose.json').write_text(json.dumps(dict(frameSize=[fw, fh], pivot=[left, top], image='boss_mini1_pose.png', frames=mf, eyes=eyes,
        source='sprites/boss_mini2*.png', tool='tools/boss_p1_pose.py'), ensure_ascii=False), encoding='utf-8')
    print(fw, fh, left, top, len(mf))


if __name__ == '__main__':
    main()
