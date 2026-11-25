"""Tư thế tuyệt chiêu của 2 boss pha 2 (24-25/11) — cắt từ ảnh ChatGPT (1 hàng 4 khung, nền trắng) thành sheet game.

  boss_mini2_lao     Huyết Nguyệt Cuồng Lang: LAO_gong, LAO_bat, LAO_bay, LAO_dap (quay phải; game lật ngang khi cần)
  boss_mini2_dam     Huyết Nguyệt Cuồng Lang: DAM_chom (chồm dậy), DAM_dam (dậm đất), DAM_gio (giơ vuốt), DAM_cao (cào)
  boss_final2_thi    Huyết Lôi Ma Quân: THI_khep, THI_dang, THI_cao, THI_chi
Các bước: loang nền từ mép ảnh (lông trắng có viền đen bao kín nên không bị ăn) -> tách từng khung theo cột trống ->
thu nhỏ: mỗi ô lấy màu xuất hiện nhiều nhất trong phần đục (không nội suy) -> đưa về bảng màu của sheet cũ cùng boss ->
căn chân trên cùng một đường đất (khung bay giữ độ cao thật trong ảnh), căn ngang theo tâm khung bao.
meta.eyes[khung] = điểm mắt đỏ sáng (render phát sáng).
Chạy: .venv/Scripts/python.exe tools/boss_pose_sheet.py
"""
import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SETS = [
    dict(src='docs/concept/lang_vuong_p2_lao_chatgpt.png', out='sprites/boss_mini2_lao', pal='sprites/boss_mini2.png',
         names=['LAO_gong', 'LAO_bat', 'LAO_bay', 'LAO_dap'], scale=10.8, ground=True,
         eyes=[[(489, 382)], [(1101, 272)], [(1740, 197)], [(2380, 386)]]),
    dict(src='docs/concept/lang_vuong_p2_dam_cao_chatgpt.png', out='sprites/boss_mini2_dam', pal='sprites/boss_mini2.png',
         names=['DAM_chom', 'DAM_dam', 'DAM_gio', 'DAM_cao'], scale=10.0, ground=True,
         eyes=[[(374, 107)], [(1072, 417)], [(1713, 241)], [(2350, 364)]]),
    dict(src='docs/concept/yeu_vuong_p2_thi_trien_chatgpt.png', out='sprites/boss_final2_thi', pal='sprites/boss_final2.png',
         names=['THI_khep', 'THI_dang', 'THI_cao', 'THI_chi'], scale=10.2, ground=False,
         eyes=[[(295, 201), (342, 201)], [(922, 201), (966, 201)], [(1549, 148), (1590, 148)], [(2169, 207), (2217, 201)]]),
]
BG_TOL = 26          # khác nền (trắng) quá mức này thì coi là thân khi loang
PAD = 3


def flood_bg(rgb):
    """Mặt nạ nền: loang 4 hướng từ mép ảnh qua các điểm gần màu nền (trắng)."""
    h, w, _ = rgb.shape
    near = (255 - rgb.astype(int)).max(-1) < BG_TOL
    bg = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if near[y, x] and not bg[y, x]:
                bg[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if near[y, x] and not bg[y, x]:
                bg[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and near[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True; q.append((ny, nx))
    return bg


def pockets(rgb, body, core=None):
    """Mảng nền trắng bị thân bao kín (giữa cánh / giữa chân): cụm gần trắng tuyền đủ lớn -> nền. core: vùng giữ (lõi ngực)."""
    white = body & (rgb.min(-1) >= 244)
    h, w = body.shape
    seen = np.zeros((h, w), bool); kill = np.zeros((h, w), bool)
    for y0, x0 in zip(*np.nonzero(white)):
        if seen[y0, x0]:
            continue
        q = deque([(y0, x0)]); seen[y0, x0] = True; pts = []
        while q:
            y, x = q.popleft(); pts.append((y, x))
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < h and 0 <= nx < w and white[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True; q.append((ny, nx))
        if len(pts) >= 60:
            ys, xs = zip(*pts)
            if core is not None and core[int(np.mean(ys)), int(np.mean(xs))]:
                continue
            for y, x in pts:
                kill[y, x] = True
    return kill


def drop_small(mask, keep_frac=0.02):
    """Bỏ vụn: giữ cụm >= 2 % cụm lớn nhất (tàn máu rời, nhiễu)."""
    h, w = mask.shape
    lab = np.zeros((h, w), int); sizes = [0]
    for y0, x0 in zip(*np.nonzero(mask)):
        if lab[y0, x0]:
            continue
        k = len(sizes); sizes.append(0); lab[y0, x0] = k; q = deque([(y0, x0)])
        while q:
            y, x = q.popleft(); sizes[k] += 1
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = k; q.append((ny, nx))
    big = max(sizes)
    ok = np.array([s >= big * keep_frac for s in sizes]); ok[0] = False
    return ok[lab]


def split_cols(mask, n):
    """n khung: chia theo n nhóm cột có nội dung (khe trống lớn nhất)."""
    col = mask.any(0); w = len(col); runs, x = [], 0
    while x < w:
        if col[x]:
            x0 = x
            while x < w and col[x]:
                x += 1
            runs.append([x0, x])
        else:
            x += 1
    gaps = sorted(range(len(runs) - 1), key=lambda i: runs[i + 1][0] - runs[i][1], reverse=True)[:n - 1]
    out, cur = [], list(runs[0])
    for i in range(len(runs) - 1):
        if i in gaps:
            out.append(cur); cur = list(runs[i + 1])
        else:
            cur[1] = runs[i + 1][1]
    out.append(cur)
    return out


def shrink(rgb, alpha, scale):
    h, w = alpha.shape
    nh, nw = int(np.ceil(h / scale)), int(np.ceil(w / scale))
    out = np.zeros((nh, nw, 4), np.uint8)
    for j in range(nh):
        for i in range(nw):
            y0, y1, x0, x1 = int(j * scale), min(h, int((j + 1) * scale)), int(i * scale), min(w, int((i + 1) * scale))
            if y1 <= y0 or x1 <= x0:
                continue
            a = alpha[y0:y1, x0:x1]
            if a.mean() < 0.5:
                continue
            px = rgb[y0:y1, x0:x1][a]
            # màu xuất hiện nhiều nhất (gộp 5 bit mỗi kênh) trong phần đục
            key = (px.astype(int) >> 3) @ np.array([1024, 32, 1])
            k = np.bincount(key).argmax()
            out[j, i, :3] = np.median(px[key == k], axis=0); out[j, i, 3] = 255
    return out


def nearest_palette(img, pal):
    on = img[..., 3] > 0
    d = ((img[on][:, None, :3].astype(int) - pal[None]) ** 2).sum(-1)
    img[on, :3] = pal[d.argmin(1)]
    return img


def run(cfg):
    rgb = np.array(Image.open(ROOT / cfg['src']).convert('RGB'))
    body = drop_small(~flood_bg(rgb))
    groups = split_cols(body, len(cfg['names']))
    core = None
    if not cfg['ground']:      # Ma Quân: giữ lõi ngực trắng hồng (giữa thân, 30-60 % chiều cao)
        core = np.zeros(body.shape, bool)
        for x0, x1 in groups:
            ys = np.nonzero(body[:, x0:x1].any(1))[0]; y0, y1 = ys.min(), ys.max()
            core[y0 + int((y1 - y0) * 0.3):y0 + int((y1 - y0) * 0.62), x0 + int((x1 - x0) * 0.35):x0 + int((x1 - x0) * 0.65)] = True
    body &= ~pockets(rgb, body, core)
    pal_img = np.array(Image.open(ROOT / cfg['pal']).convert('RGBA'))
    pal = np.unique(pal_img[pal_img[..., 3] > 0][:, :3], axis=0).astype(int)
    ground = max(np.nonzero(body[:, x0:x1].any(1))[0].max() for x0, x1 in groups[:1] + groups[-1:]) if cfg['ground'] else None
    frames, tops = [], []
    for (x0, x1) in groups:
        sub = body[:, x0:x1]; ys = np.nonzero(sub.any(1))[0]; y0, y1 = ys.min(), ys.max() + 1
        small = nearest_palette(shrink(rgb[y0:y1, x0:x1], sub[y0:y1], cfg['scale']), pal)
        lift = int(round((ground + 1 - y1) / cfg['scale'])) if cfg['ground'] else 0      # độ cao rời đất
        frames.append((small, max(0, lift))); tops.append(y0)
    fw = max(f.shape[1] for f, _ in frames) + PAD * 2
    fh = max(f.shape[0] + l for f, l in frames) + PAD + 1
    px, py = fw // 2, fh - 1
    sheet = np.zeros((fh, fw * len(frames), 4), np.uint8); meta_frames, eyes = {}, {}
    for i, ((f, lift), name) in enumerate(zip(frames, cfg['names'])):
        ox, oy = i * fw + (fw - f.shape[1]) // 2, fh - f.shape[0] - lift
        sheet[oy:oy + f.shape[0], ox:ox + f.shape[1]] = f
        meta_frames[name] = [i * fw, 0]
        gx, gy = groups[i][0], tops[i]           # mắt: toạ độ trong ảnh gốc -> trong khung (đo tay trên ảnh ChatGPT)
        eyes[name] = [[int(round((ex - gx) / cfg['scale'])) + (fw - f.shape[1]) // 2, int(round((ey - gy) / cfg['scale'])) + (fh - f.shape[0] - lift)] for ex, ey in cfg['eyes'][i]]
    out = ROOT / cfg['out']
    Image.fromarray(sheet).save(str(out) + '.png')
    meta = dict(frameSize=[fw, fh], pivot=[px, py], image=out.name + '.png', frames=meta_frames, eyes=eyes, source=cfg['src'], tool='tools/boss_pose_sheet.py', scale=cfg['scale'])
    (out.parent / (out.name + '.json')).write_text(json.dumps(meta, ensure_ascii=False), encoding='utf-8')
    print(out.name, 'khung', (fw, fh), 'neo', (px, py), [(n, f.shape[:2], l) for (f, l), n in zip(frames, cfg['names'])], eyes)


if __name__ == '__main__':
    for c in SETS:
        run(c)
