"""Phong Nhận (Wind Blade) — lưỡi gió hình trăng khuyết bay thẳng xuyên quái, cho Tu Tiên Lộ. 3/4 top-down.

Brief: 32x32, 8 hướng, 6 khung @ 24 fps lặp; lam ngọc tới trắng (hệ Phong, GDD); glow vừa; rõ.
Hình (nghiên cứu "lưỡi gió/phong nhận" trong tranh tiên hiệp và gió thật): một cung trăng khuyết lồi về phía trước, mép
trước sắc có lõi trắng 1 px, thân mỏng dần về hai mũi; phía sau 2–3 sợi gió mảnh rung và đứt quãng (khí bị xé), vài hạt
bụi lá nhỏ quay theo. Không có quả cầu sáng: chỉ mép lưỡi và mũi có ánh sáng.
"""
import math
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "kit"))
import export as ex  # noqa: E402
import facing as fc  # noqa: E402
import fxkit as fk  # noqa: E402
import fxlib  # noqa: E402
import light  # noqa: E402
import pfx  # noqa: E402

NAME = "phong_nhan"
W = H = 32
PX, PY = 16, 16
FRAMES, FPS = 6, 24
SEED = 3
PAL = ["#0f3d3a", "#1f8f7a", "#4fd6b0", "#a8f5df", "#ffffff"]
RAMP = ["#0f4a44", "#4fd6b0", "#c8fff0", "#ffffff"]
G = light.GLOW["medium"]


class C:
    def __init__(self, x, y):
        self.x, self.y = x, y


def arc_pts(u0, span, bow, n=9, wob=0.0):
    """điểm cung trăng khuyết trong hệ (u dọc đường bay, v ngang): giữa ở u0, hai mũi lùi về sau bow"""
    pts = []
    for i in range(n):
        t = i / (n - 1) * 2 - 1                       # -1..1
        pts.append((u0 - bow * t * t + wob * math.sin(i), span * t))
    return pts


def to_world(pts, a):
    c, s = math.cos(a), math.sin(a)
    return [(u * c - v * s, u * s + v * c) for u, v in pts]


def render(a, f, seed=SEED):
    x, y = fxlib.grid(W, H, PX, PY)
    m = fxlib.empty(W, H)
    L = np.zeros((H, W))
    cx = C(x, y)
    ph = f / FRAMES * math.tau
    pulse = 0.5 + 0.5 * math.sin(ph)
    # thân lưỡi: cung dày ở giữa mỏng ở mũi (vẽ 2 lớp: thân màu, mép trước sáng)
    span = 8.5 + 0.6 * pulse
    body = to_world(arc_pts(3.0, span, 5.0), a)
    d, t, _ = fxlib.stroke(x, y, body, 3.4, 0.6)
    taper = 1 - np.abs(t * 2 - 1)                      # 0 ở hai mũi, 1 ở giữa
    on = d < 0
    m[on] = 1
    m[on & (d < -0.6 * taper)] = 2
    edge = to_world(arc_pts(4.2, span * 0.92, 4.6), a)  # mép trước
    de, te, _ = fxlib.stroke(x, y, edge, 1.0, 0.3)
    m[(de < 0) & (m < 3)] = 3
    m[(de < -0.15) & (np.abs(te - 0.5) < 0.32)] = 4    # lõi trắng giữa mép
    # sợi gió phía sau: 3 đường mảnh, đứt quãng theo pha (khí bị xé)
    for k, vv in enumerate((-4.5, 0.0, 4.5)):
        L0 = 5 + 3 * ((k + f) % 3)
        p0 = to_world([(-1.5 - 0.5 * k, vv * 0.9)], a)[0]
        p1 = to_world([(-1.5 - L0, vv * 1.15 + 0.8 * math.sin(ph + k))], a)[0]
        ds, ts, _ = fxlib.stroke(x, y, [p0, p1], 0.9, 0.4)
        gap = (np.floor(ts * 4 + f) % 3) != 0
        m[(ds < 0) & gap & (m < 2)] = 2 if k == 1 else 1
    # bụi lá quay theo (2 điểm, chớp)
    for j in range(2):
        u = -3 - ((f * 2 + j * 5) % 9)
        v = (6 if j else -6) + math.sin(ph * 2 + j) * 1.5
        px, py = to_world([(u, v)], a)[0]
        fxlib.Pen(PX, PY).put(m, px, py, 3 if light.flicker(j, f, seed) > 0.5 else 2)
    m = fk.rim(m, 0)
    # ánh sáng: dọc mép trước (lõi + quầng), mũi chớp
    for p0, p1 in zip(edge[:-1], edge[1:]):
        light.glow_line(L, cx, p0, p1, 2.2, 0.07 * (0.8 + 0.2 * pulse))
    light.glow(L, cx, *to_world([(3.5, 0)], a)[0], 6.0, 0.25)
    light.glow(L, cx, *to_world([(1.0, 0)], a)[0], 6.0 * G["pool_r"] * 0.7, 0.25 * G["pool_k"] * 0.5)
    for j, tip in enumerate((edge[0], edge[-1])):
        light.glow(L, cx, *tip, 3.0, 0.22 * light.flicker(j + 5, f, seed))
    col = pfx.paint(m, PAL)
    return col, pfx.tint(np.repeat(np.clip(L, 0, 1)[..., None], 3, -1), RAMP), L


def main():
    from PIL import Image
    out = HERE / "out"
    out.mkdir(parents=True, exist_ok=True)
    rows_c, rows_l, rows_f, sums, flat = [], [], [], [], []
    for a in fc.headings(8):
        rc, rl, rf = [], [], []
        for f in range(FRAMES):
            col, lc, L = render(a, f)
            rc.append(col); rl.append(lc); rf.append(pfx.composite(col, lc)); sums.append(L); flat.append(col)
        rows_c.append(rc); rows_l.append(rl); rows_f.append(rf)
    ex.write(out / "sheets", NAME, rows_f, FPS, (PX, PY), True, light=rows_l, color=rows_c,
             extra=dict(fc.meta("3/4", W, H, (PX, PY), directions=8), glow="medium"))
    bad = []
    for r in range(8):
        bad += [f"row {r}: {b}" for b in ex.check(rows_c[r], rows_l[r], True, src=__file__)]
    cover, mean = [], []
    for col, L in zip(flat, sums):
        ys, xs = np.nonzero(col[..., 3])
        box = np.clip(L[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 0, 1)
        cover.append((box > 0.03).mean()); mean.append(box[box > 0.03].mean())
    print(f"light: cover {np.median(cover):.0%}, mean {np.median(mean):.3f}")
    grid = np.concatenate([np.concatenate([pfx.composite(c, l, "#5da552") for c, l in zip(rc, rl)], 1) for rc, rl in zip(rows_c, rows_l)], 0)
    Image.fromarray(grid).resize((grid.shape[1] * 4, grid.shape[0] * 4), Image.NEAREST).save(out / f"{NAME}_4x.png")
    print("\n".join(bad) or f"ok: {NAME} 8 hướng x {FRAMES}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
