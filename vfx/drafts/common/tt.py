"""Phần dùng chung cho các draft VFX Tu Tiên Lộ: xuất sheet beanfx, ảnh xem trước 4x trên nền cỏ của game, đo ánh sáng,
chạy các kiểm tra của beanfx. Mỗi draft vẫn import kit beanfx của chính nó (đặt kit trên sys.path trước khi import file này).

    render(a, f, seed) -> (shade map, L)   a = góc hướng (radians) hoặc None khi 1 hướng
    tt.run(HERE, name, render, pal, ramp, w, h, pivot, frames, fps, loop, dirs=1, extra={})
"""
import sys
from pathlib import Path

import numpy as np

import export as ex
import facing as fc
import pfx

GRASS = "#5da552"


class C:
    """lưới cho light.*"""
    def __init__(self, x, y):
        self.x, self.y = x, y


def colorize(m, L, pal, ramp):
    return pfx.paint(m, pal), pfx.tint(np.repeat(np.clip(L, 0, 1)[..., None], 3, -1), ramp)


def measure(cols, sums):
    cover, mean = [], []
    for col, L in zip(cols, sums):
        ys, xs = np.nonzero(col[..., 3])
        if not len(ys):
            continue
        box = np.clip(L[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 0, 1)
        lit = box > 0.03
        cover.append(lit.mean()); mean.append(box[lit].mean() if lit.any() else 0)
    return float(np.median(cover)), float(np.median(mean))


def run(here, name, render, pal, ramp, w, h, pivot, frames, fps, loop, dirs=1, extra=None, src=None):
    from PIL import Image
    out = Path(here) / "out"
    out.mkdir(parents=True, exist_ok=True)
    heads = fc.headings(dirs) if dirs > 1 else [None]
    rows_c, rows_l, rows_f, sums, flat = [], [], [], [], []
    for a in heads:
        rc, rl, rf = [], [], []
        for f in range(frames):
            m, L = render(a, f)
            col, lc = colorize(m, L, pal, ramp)
            rc.append(col); rl.append(lc); rf.append(pfx.composite(col, lc)); sums.append(L); flat.append(col)
        rows_c.append(rc); rows_l.append(rl); rows_f.append(rf)
    meta = dict(fc.meta("3/4", w, h, pivot, directions=dirs), glow="medium") if dirs > 1 else dict(view="3/4", directions=1, glow="medium")
    meta.update(extra or {})
    ex.write(out / "sheets", name, rows_f if dirs > 1 else rows_f[0], fps, pivot, loop,
             light=rows_l if dirs > 1 else rows_l[0], color=rows_c if dirs > 1 else rows_c[0], extra=meta)
    bad = []
    for r in range(len(heads)):
        bad += [(f"row {r}: " if dirs > 1 else "") + b for b in ex.check(rows_c[r], rows_l[r], loop, src=src)]
    bad += ex.check_seeds(lambda f, sd: colorize(*render(heads[0], f, sd), pal, ramp)[0], frames)
    cv, mn = measure(flat, sums)
    grid = np.concatenate([np.concatenate([pfx.composite(c, l, GRASS) for c, l in zip(rc, rl)], 1)
                           for rc, rl in zip(rows_c, rows_l)], 0)
    s = 4 if grid.shape[1] * 4 <= 6000 else 2
    Image.fromarray(grid).resize((grid.shape[1] * s, grid.shape[0] * s), Image.NEAREST).save(out / f"{name}_{s}x.png")
    if dirs == 1:
        pfx.gif([pfx.composite(c, l, GRASS) for c, l in zip(rows_c[0], rows_l[0])], out / f"{name}.gif", fps, bg=GRASS)
    print(f"{name}: light cover {cv:.0%}, mean {mn:.3f} (vừa 0,06–0,10)")
    print("\n".join(bad) or f"ok: {name} {len(heads)} hướng x {frames} khung {w}x{h} @ {fps} fps {'lặp' if loop else 'một lần'}")
    return 1 if bad else 0
