"""Làm sạch sprite sheet do AI vẽ (ChatGPT) thành sheet pixel dùng được trong game.

Đầu vào: ảnh lưới cols x rows, nền một màu phẳng (mặc định magenta #FF00FF), mỗi ô một tư thế.
Các bước:
  1. Tách nền: pixel gần màu nền -> trong suốt; viền lem màu nền (anti-alias) -> bỏ nếu ám nền rõ.
  2. Cắt theo lưới, lấy khung bao nội dung từng ô (bỏ vụn nhỏ hơn MIN_BLOB pixel).
  3. Đo cỡ "pixel gốc" s của ảnh AI (dò chu kỳ biên màu) hoặc dùng --scale; thu nhỏ: mỗi khối s x s lấy màu
     xuất hiện nhiều nhất trong phần đục (đục >= 50% thì giữ). Không dùng nội suy -> không nhòe.
  4. Lượng tử hóa MỘT bảng màu chung cho mọi khung (--colors) để các khung đồng nhất.
  5. Căn: chân (đáy khung bao) cùng một hàng; tâm ngang = trung vị cột đục ở 40% dưới (bỏ qua kiếm chìa ra).
  6. Xuất sheet 1 hàng + JSON {frameSize, pivot, frames{name:[x,y]}} và ảnh xem trước 6x trên nền cỏ.

Dùng:
  python tools/sprite_clean.py SRC.png --cols 6 --rows 5 --names names.txt --out sprites/nhan_vat [--scale S] [--colors 24]
names: mỗi ô một tên theo thứ tự hàng rồi cột; '-' = bỏ ô đó.
"""
import argparse
import json
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image

MIN_BLOB = 40


def key_background(rgb, bg, tol):
    d = np.abs(rgb.astype(int) - np.array(bg)).sum(-1)
    alpha = d > tol
    # viền lem: hồng tím (r, b cao hơn g nhiều) NẰM SÁT nền -> bỏ. Chỉ xét sát nền để không ăn màu tím thật của
    # sprite (Ma Ảnh); lặp 2 lượt vì viền lem có thể dày 2 pixel
    if bg == (255, 0, 255):
        r, g, b = [rgb[..., i].astype(int) for i in range(3)]
        fringe = (r - g > 90) & (b - g > 90) & (np.abs(r - b) < 70)
        for _ in range(2):
            bgm = ~alpha
            near = np.zeros_like(bgm)
            near[1:] |= bgm[:-1]; near[:-1] |= bgm[1:]; near[:, 1:] |= bgm[:, :-1]; near[:, :-1] |= bgm[:, 1:]
            alpha &= ~(fringe & near)
    return alpha


def label_components(mask):
    """Gán nhãn các cụm đục (4 lân cận) trên toàn ảnh. Trả (nhãn HxW, [(tâm y, tâm x, số px, bbox)]) — nhãn 0 = nền."""
    from collections import deque
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32)
    info = [None]
    ys0, xs0 = np.nonzero(mask)
    for y, x in zip(ys0.tolist(), xs0.tolist()):
        if lab[y, x]:
            continue
        k = len(info)
        q = deque([(y, x)]); lab[y, x] = k
        ys, xs = [], []
        while q:
            cy, cx = q.popleft(); ys.append(cy); xs.append(cx)
            for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = k; q.append((ny, nx))
        info.append((sum(ys) / len(ys), sum(xs) / len(xs), len(ys), (min(xs), min(ys), max(xs) + 1, max(ys) + 1)))
    return lab, info


def estimate_scale(rgb, alpha):
    """Chu kỳ biên màu theo chiều ngang/dọc trong vùng đục: s cho điểm cao nhất = cỡ pixel gốc."""
    diff_x = (np.abs(np.diff(rgb.astype(int), axis=1)).sum(-1) > 60) & alpha[:, 1:] & alpha[:, :-1]
    diff_y = (np.abs(np.diff(rgb.astype(int), axis=0)).sum(-1) > 60) & alpha[1:, :] & alpha[:-1, :]
    best, score = None, -1
    for s in np.arange(3.0, 9.01, 0.05):
        sc = 0
        for d, ax in ((diff_x, 1), (diff_y, 0)):
            pos = np.nonzero(d)[ax].astype(float)
            ph = (pos % s) / s * 2 * np.pi
            sc += np.abs(np.exp(1j * ph).mean()) * len(pos)
        if sc > score:
            best, score = s, sc
    return float(best)


def downscale(rgb, alpha, s, ox, oy):
    h, w = alpha.shape
    tw, th = int((w - ox) // s), int((h - oy) // s)
    out = np.zeros((th, tw, 4), np.uint8)
    for ty in range(th):
        y0, y1 = int(round(oy + ty * s)), int(round(oy + (ty + 1) * s))
        for tx in range(tw):
            x0, x1 = int(round(ox + tx * s)), int(round(ox + (tx + 1) * s))
            a = alpha[y0:y1, x0:x1]
            if a.size == 0 or a.mean() < 0.5:
                continue
            # bỏ mép khối (dễ lẫn màu láng giềng), lấy màu đa số ở lõi
            m = max(1, int(s * 0.2))
            core = rgb[y0 + m:y1 - m, x0 + m:x1 - m][a[m:a.shape[0] - m, m:a.shape[1] - m]]
            if len(core) == 0:
                core = rgb[y0:y1, x0:x1][a]
            q = (core // 8).astype(np.int32)
            keys = q[:, 0] * 1024 + q[:, 1] * 32 + q[:, 2]
            k = Counter(keys.tolist()).most_common(1)[0][0]
            sel = core[keys == k]
            out[ty, tx, :3] = sel.mean(0).astype(np.uint8)
            out[ty, tx, 3] = 255
    return out


def best_phase(rgb, alpha, s):
    """Pha lưới (ox, oy) để biên khối trùng biên màu nhiều nhất."""
    diff_x = (np.abs(np.diff(rgb.astype(int), axis=1)).sum(-1) > 60) & alpha[:, 1:]
    diff_y = (np.abs(np.diff(rgb.astype(int), axis=0)).sum(-1) > 60) & alpha[1:, :]
    px = np.nonzero(diff_x)[1] + 1
    py = np.nonzero(diff_y)[0] + 1
    def ph(pos):
        best, sc = 0.0, -1
        for o in np.arange(0, s, 0.25):
            v = np.sum(np.abs(((pos - o) % s) - 0) < 0.6) + np.sum(np.abs(((pos - o) % s) - s) < 0.6)
            if v > sc:
                best, sc = o, v
        return best
    return ph(px), ph(py)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('--cols', type=int, required=True); ap.add_argument('--rows', type=int, required=True)
    ap.add_argument('--names', required=True); ap.add_argument('--out', required=True)
    ap.add_argument('--scale', type=float, default=0); ap.add_argument('--colors', type=int, default=24)
    ap.add_argument('--bg', default='ff00ff'); ap.add_argument('--tol', type=int, default=150)
    ap.add_argument('--preview', default='')
    a = ap.parse_args()
    bg = tuple(int(a.bg[i:i + 2], 16) for i in (0, 2, 4))
    names = Path(a.names).read_text(encoding='utf-8').split()
    img = np.array(Image.open(a.src).convert('RGB'))
    alpha = key_background(img, bg, a.tol)
    H, W = alpha.shape
    cw, ch = W / a.cols, H / a.rows
    s = a.scale or estimate_scale(img, alpha)
    print(f'cỡ pixel gốc s = {s:.2f}')
    frames = {}
    # cụm thuộc ô nào thì xét theo tâm của cụm (lưới AI vẽ không đều tuyệt đối: chân/đuôi có thể lấn sang ô bên)
    lab, cinfo = label_components(alpha)
    cells = {}
    for k, inf in enumerate(cinfo):
        if not inf or inf[2] < MIN_BLOB:
            continue
        r, c = min(a.rows - 1, int(inf[0] // ch)), min(a.cols - 1, int(inf[1] // cw))
        cells.setdefault(r * a.cols + c, []).append(k)
    for i, n in enumerate(names):
        if n == '-':
            continue
        ks = cells.get(i)
        if not ks:
            print('ô rỗng', n); continue
        bx0 = min(cinfo[k][3][0] for k in ks); by0 = min(cinfo[k][3][1] for k in ks)
        bx1 = max(cinfo[k][3][2] for k in ks); by1 = max(cinfo[k][3][3] for k in ks)
        pad = int(s * 2)
        bx0, by0 = max(0, bx0 - pad), max(0, by0 - pad)
        bx1, by1 = min(W, bx1 + pad), min(H, by1 + pad)
        crop = img[by0:by1, bx0:bx1]
        crop_a = np.isin(lab[by0:by1, bx0:bx1], ks)
        ox, oy = best_phase(crop, crop_a, s)
        frames[n] = downscale(crop, crop_a, s, ox, oy)
    # bảng màu chung
    allpx = np.concatenate([f[f[..., 3] > 0][:, :3] for f in frames.values()])
    pal_img = Image.fromarray(allpx.reshape(-1, 1, 3)).quantize(colors=a.colors, method=Image.Quantize.MEDIANCUT)
    pal = np.array(pal_img.getpalette()[:a.colors * 3]).reshape(-1, 3)
    for n, f in frames.items():
        op = f[..., 3] > 0
        px = f[op][:, :3].astype(int)
        d2 = ((px[:, None, :] - pal[None]) ** 2).sum(-1)
        idx = np.argmin(d2, 1)
        q = pal[idx]
        # điểm nhấn nhỏ (mắt đỏ, ngọc) bị median-cut nuốt: lệch xa mọi màu bảng -> giữ màu gốc
        far = np.sqrt(d2[np.arange(len(idx)), idx]) > 70
        q[far] = px[far]
        f[op, :3] = q
        # bỏ pixel đục đứng một mình (vụn)
        al = f[..., 3] > 0
        nb = np.zeros_like(al, int)
        nb[1:] += al[:-1]; nb[:-1] += al[1:]; nb[:, 1:] += al[:, :-1]; nb[:, :-1] += al[:, 1:]
        f[al & (nb == 0), 3] = 0
    # căn chân + tâm
    info = {}
    for n, f in frames.items():
        ys, xs = np.nonzero(f[..., 3])
        bottom = ys.max()
        h = bottom - ys.min() + 1
        low = ys >= bottom - int(h * 0.4)
        cx = int(np.median(xs[low]))
        info[n] = (cx, bottom)
    info = {n: (int(cx), int(b)) for n, (cx, b) in info.items()}
    left = max(cx for cx, _ in info.values())
    right = max(f.shape[1] - cx for (cx, _), f in zip(info.values(), frames.values()))
    up = max(b for _, b in info.values()) + 1
    fw, fh = int(left + right), int(up)
    fw += fw % 2
    sheet = Image.new('RGBA', (fw * len(frames), fh), (0, 0, 0, 0))
    meta = {'frameSize': [fw, fh], 'pivot': [left, fh - 1], 'image': Path(a.out).name + '.png', 'frames': {},
            'source': a.src, 'tool': 'tools/sprite_clean.py', 'scale': round(s, 2), 'colors': a.colors}
    for i, (n, f) in enumerate(frames.items()):
        cx, bottom = info[n]
        sheet.alpha_composite(Image.fromarray(f), (i * fw + left - cx, fh - 1 - bottom))
        meta['frames'][n] = [i * fw, 0]
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out.with_suffix('.png'))
    out.with_suffix('.json').write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'{len(frames)} khung {fw}x{fh}, pivot {meta["pivot"]} -> {out.with_suffix(".png")}')
    if a.preview:
        k, cols = 6, 6
        rows = (len(frames) + cols - 1) // cols
        cwp, chp = (fw + 4) * k, (fh + 4) * k
        bgimg = Image.new('RGBA', (cwp * cols, chp * rows), (86, 140, 72, 255))
        for i in range(len(frames)):
            fr = sheet.crop((i * fw, 0, (i + 1) * fw, fh)).resize((fw * k, fh * k), Image.NEAREST)
            x0, y0 = (i % cols) * cwp + 2 * k, (i // cols) * chp + 2 * k
            sh = Image.new('RGBA', (int(fw * 0.6) * k, 2 * k), (0, 0, 0, 64))
            bgimg.alpha_composite(sh, (x0 + left * k - sh.width // 2, y0 + (fh - 2) * k))
            bgimg.alpha_composite(fr, (x0, y0))
        bgimg.convert('RGB').save(a.preview)


if __name__ == '__main__':
    main()
