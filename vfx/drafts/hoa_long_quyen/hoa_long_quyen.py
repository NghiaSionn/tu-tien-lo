"""Hỏa Long Quyển (Fire Dragon Whirl) — cột lốc lửa đứng tại chỗ, lặp, cho Tu Tiên Lộ (tiến hóa Hỏa Luân + Phong Nhận).

Dùng lại draft beanfx `loc_gio_v2` (theo yêu cầu: "dùng lại khi gần ý", ADR 0005): giữ cách vẽ phễu bằng các dải xoắn
1 px (lõi sáng, viền 1 px màu; nửa sau mờ hơn để có chiều sâu), độ lệch trục lan dần lên trên và ánh sáng kiểu pixelfx
(lõi dọc trục + quầng rộng + quầng phẳng dưới chân). Đổi:
  - thu nhỏ hình học K = 0,36 (thân người 80 px -> nhân vật 25 px); nét vẫn 1 px;
  - đứng tại chỗ và lặp liền mạch (bản gốc bay sang phải, một lần): dải trôi lên đúng một chu kỳ mỗi vòng lặp, xoay 2 vòng;
  - màu lửa (đỏ sẫm, đỏ, cam, vàng nhạt, trắng) thay gió bạc hà; lá + bụi thay bằng tàn lửa bốc lên và lụi.
Brief: 48x56, 1 hướng, 24 khung @ 24 fps lặp (1 s); glow vừa; rõ. Game vẽ ở tâm mỗi cột lốc (pivot = chân phễu).
"""
import math
import sys
from pathlib import Path
from types import SimpleNamespace

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "kit"))
import export as ex  # noqa: E402
import light  # noqa: E402
import pfx  # noqa: E402
from fxlib import stroke  # noqa: E402

NAME = "hoa_long_quyen_v2"
K = 0.36
W, H = 48, 56
PX, PY = 24, 48
FRAMES, FPS = 24, 24
TOP = 82 * K                  # chiều cao phễu
FLAT = 0.36
N_BANDS = 7
SEED = 11
TAU = math.tau
PAL = ["#4a0e04", "#b8300e", "#f07020", "#ffc860", "#ffffff"]
RAMP = ["#5a1004", "#f07020", "#ffd890", "#ffffff"]

ys, xs = np.mgrid[0:H, 0:W].astype(float)
GX, GY = xs + 0.5, ys + 0.5
C = SimpleNamespace(x=GX, y=GY)


def h01(i, salt=0):
    return (math.sin(i * 12.9898 + salt * 78.233) * 43758.5453) % 1.0


def radius(u):
    """phễu: chân hẹp, miệng rộng (loc_gio_v2, nhân K)"""
    return (5 + 23 * max(u, 0.0) ** 1.25) * K


def sway(u, t):
    """trục cong nhẹ, chỗ cong trôi lên; lặp theo t"""
    return 3.0 * K * 2 * math.sin(u * math.pi * 1.2 - t * TAU) * u


def arc_pts(cy, r, a0, span, cx, climb=0.0, n=10):
    return [(cx + r * math.cos(a0 + span * k / n), cy - climb * k / n + r * FLAT * math.sin(a0 + span * k / n),
             math.sin(a0 + span * k / n)) for k in range(n + 1)]


FRONT = [(0.2, 3), (0.95, 2)]
FRONT_HOT = [(0.2, 4), (0.95, 3), (1.6, 2)]
BACK = [(0.2, 1)]


def _runs(m, pts, w, table, keep):
    band = np.full(m.shape, -1, np.int8)
    n = len(pts) - 1
    for i in range(n):
        p, q = pts[i], pts[i + 1]
        if not keep((p[2] + q[2]) / 2):
            continue
        t0, t1 = i / n, (i + 1) / n
        w0, w1 = w * math.sin(math.pi * t0) + 0.2, w * math.sin(math.pi * t1) + 0.2
        d, _, _ = stroke(GX, GY, [p[:2], q[:2]], w0, w1)
        seg = np.full(d.shape, -1, np.int8)
        for lim, s in reversed(table):
            seg[d < lim] = s
        np.maximum(band, seg, out=band)
    m[band >= 0] = band[band >= 0]


def draw_funnel(m, t, hot):
    spin = -2 * TAU * t                     # 2 vòng mỗi vòng lặp
    layers = []
    for i in range(N_BANDS):
        s = ((i + N_BANDS * t) % N_BANDS) / N_BANDS     # mỗi dải trôi lên đúng một chu kỳ: lặp liền
        grow = min(1.0, s / 0.15, (1 - s) / 0.15)
        u = 0.06 + 0.94 * s
        h = TOP * u
        r = radius(u)
        a0 = spin + i * 2.4 + 0.5 * h01(i, 3)
        span = (2.4 + 1.6 * h01(i, 5)) * grow
        if span < 0.4:
            continue
        cx = PX + sway(u, t)
        layers.append((arc_pts(PY - h, r, a0, -span, cx, climb=(4 + 10 * u) * K * span / 4), 0.4 + 0.7 * u))
    for pts, w in layers:
        _runs(m, pts, w * 0.6, BACK, lambda d: d <= -0.15)
    for pts, w in layers:
        _runs(m, pts, w, FRONT_HOT if hot else FRONT, lambda d: d > -0.15)
    return layers


def render(f, seed=SEED):
    t = f / FRAMES
    m = np.full((H, W), -1, np.int8)
    L = np.zeros((H, W))
    # nhịp "phì" lửa 2 lần mỗi vòng: dải nóng (trắng) lóe trong 3 khung
    hot = (f % 12) < 3
    layers = draw_funnel(m, t, hot)
    # vòng lửa mặt đất dưới chân: chấm cách quãng xoay
    for k in range(10):
        a = TAU * k / 10 - 2 * TAU * t
        x, y = PX + 9 * K * 2 * math.cos(a), PY + 9 * K * 2 * FLAT * math.sin(a)
        if (k + f) % 3:
            m[int(y), int(x)] = 2 if math.sin(a) > 0 else 1
    # tàn lửa bốc lên: mỗi tàn lặp theo vòng, lụi dần (vàng -> cam -> đỏ)
    rng = np.random.default_rng(seed)
    for j in range(9):
        ph = (t + j / 9 + 0.1 * rng.random()) % 1.0
        ang = rng.uniform(0, TAU)
        rr = radius(ph) + 2
        x = PX + rr * math.cos(ang + ph * 3) + sway(ph, t)
        y = PY - 3 - ph * TOP * 1.05
        if 1 <= x < W - 1 and 1 <= y < H - 1:
            m[int(y), int(x)] = 4 if ph < 0.3 else 3 if ph < 0.6 else 1
            light.glow(L, C, x, y, 2.5, 0.18 * (1 - ph) * light.flicker(j, f, seed))
    # ánh sáng phễu (loc_gio_v2): lõi dọc trục + quầng rộng + quầng phẳng chân; mỗi dải trước một ánh nhẹ
    k = 1.25 if hot else 1.0
    top = (PX + sway(0.85, t), PY - TOP * 0.85)
    light.glow_line(L, C, (PX, PY - 2), top, 6 * K * 1.6, 0.2 * k)
    light.glow_line(L, C, (PX, PY - 4), top, 26 * K, 0.08 * k)
    light.glow_ring(L, C, PX, PY, 0, 34 * K, 0.08 * k, flat=FLAT)
    for pts, _ in layers:
        front = [p for p in pts if p[2] > 0.3]
        for p, q in zip(front, front[1:]):
            light.glow_line(L, C, p[:2], q[:2], 2.5, 0.04 * k)
    col = pfx.paint(m, PAL)
    return col, pfx.tint(np.repeat(np.clip(L, 0, 1)[..., None], 3, -1), RAMP), L


def main():
    from PIL import Image
    out = HERE / "out"
    out.mkdir(parents=True, exist_ok=True)
    cols, lights, finals, sums = [], [], [], []
    for f in range(FRAMES):
        c, lc, L = render(f)
        cols.append(c); lights.append(lc); sums.append(L); finals.append(pfx.composite(c, lc))
    ex.write(out / "sheets", NAME, finals, FPS, (PX, PY), True, light=lights, color=cols,
             extra=dict(view="3/4", directions=1, glow="medium", source="drafts/loc_gio_v2 (beanfx) K=0.36, lửa, lặp tại chỗ"))
    bad = ex.check(cols, lights, True, src=__file__)
    bad += ex.check_seeds(lambda f, sd: render(f, seed=sd)[0], FRAMES)
    cover, mean = [], []
    for c, L in zip(cols, sums):
        ys_, xs_ = np.nonzero(c[..., 3])
        box = np.clip(L[ys_.min():ys_.max() + 1, xs_.min():xs_.max() + 1], 0, 1)
        cover.append((box > 0.03).mean()); mean.append(box[box > 0.03].mean())
    print(f"light: cover {np.median(cover):.0%}, mean {np.median(mean):.3f} (nguồn sáng: cover cao là bình thường)")
    strip = np.concatenate([pfx.composite(c, l, "#5da552") for c, l in zip(cols, lights)][:12], 1)
    Image.fromarray(strip).resize((strip.shape[1] * 4, strip.shape[0] * 4), Image.NEAREST).save(out / f"{NAME}_4x.png")
    pfx.gif([pfx.composite(c, l, "#5da552") for c, l in zip(cols, lights)], out / f"{NAME}.gif", FPS, bg="#5da552")
    print("\n".join(bad) or f"ok: {NAME} {FRAMES} khung {W}x{H} @ {FPS} fps lặp")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
