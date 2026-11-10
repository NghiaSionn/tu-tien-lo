"""Hiệu ứng của Tu Tiên Lộ, vẽ bằng bộ kit beanfx (vfx/kit, MIT, https://github.com/baenv/beanfx).

Mỗi hiệu ứng là một hàm render(f) trả về (bản đồ sắc độ, lớp sáng). File này xuất sprite sheet màu, sheet ánh sáng
và JSON kiểu Aseprite vào thư mục fx/ để game phát bằng lib/beanfx.js.

    .venv/Scripts/python vfx/make_fx.py            # vẽ lại tất cả
    .venv/Scripts/python vfx/make_fx.py loi_kiep   # chỉ vẽ một hiệu ứng

| tên         | ô       | khung | fps | kiểu      | dùng cho                         |
|-------------|---------|-------|-----|-----------|----------------------------------|
| kiem_khi    | 32x32   | 6x16  | 18  | lặp       | đạn kiếm khí, 16 hướng           |
| kiem_trung  | 32x32   | 8     | 24  | một lần   | kiếm khí trúng mục tiêu          |
| loi_kiep    | 96x184  | 16    | 24  | một lần   | sét lôi kiếp đánh xuống nhân vật |
| dot_pha     | 128x144 | 30    | 24  | một lần   | đột phá cảnh giới                |
| toa_thien   | 64x64   | 24    | 12  | lặp       | linh khí tụ về khi tọa thiền     |
"""
import math
import sys
from pathlib import Path
from types import SimpleNamespace

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "kit"))
import export as ex  # noqa: E402
import fxlib  # noqa: E402
import light  # noqa: E402
import pfx  # noqa: E402
from fxkit import hsh, rot  # noqa: E402

OUT = HERE.parent / "fx"
PREVIEW = HERE / "preview"
TAU = math.tau

# bảng màu: 0 đậm (hơi trong) -> 3 trắng nóng
CYAN = ["#2f8fd0b0", "#6fd0ff", "#c8f4ff", "#ffffff"]
CYAN_LIGHT = ["#0c3a5a", "#3aa8e0", "#bfefff", "#ffffff"]
VIOLET = ["#5a3ad0b0", "#9a7bff", "#d9ccff", "#ffffff"]
VIOLET_LIGHT = ["#24106a", "#7a52f0", "#d2c2ff", "#ffffff"]
GOLD = ["#c8781eb0", "#f0b43c", "#ffe696", "#ffffff"]
GOLD_LIGHT = ["#5a2c08", "#e09a2a", "#ffe9a8", "#ffffff"]


def grid(w, h):
    y, x = np.mgrid[0:h, 0:w].astype(float)
    return x, y, SimpleNamespace(x=x, y=y)


def blank(x):
    return np.full(x.shape, -1, np.int16), np.zeros(x.shape)


def ease_out(t):
    t = min(max(t, 0.0), 1.0)
    return 1 - (1 - t) ** 3


def ease_in(t):
    t = min(max(t, 0.0), 1.0)
    return t * t


def dot(m, x, y, s):
    xi, yi = int(round(x)), int(round(y))
    if 0 <= yi < m.shape[0] and 0 <= xi < m.shape[1]:
        m[yi, xi] = s


# ---------------------------------------------------------------- kiếm khí (đạn, 16 hướng)
G32 = grid(32, 32)


def kiem_khi(f, a):
    X, Y, C = G32
    m, L = blank(X)
    ph = f / 6
    u, v = rot(X - 16, Y - 16, a)
    for i in (-1, 0, 1):                                   # vệt gió kéo theo sau
        ln = 6 + 2.5 * math.sin(TAU * (ph + i / 3))
        head = -3.5 - abs(i) * 1.2
        on = (np.abs(v - i * 4.5) < 0.62) & (u < head) & (u > head - ln)
        on &= np.sin(u * 1.3 + TAU * ph + i) > -0.35
        m[on] = 0
        m[on & (u > head - 3)] = 1
    wob = 0.35 * math.sin(TAU * ph)                        # lưỡi liềm: phần giữa hai đường tròn lệch tâm
    outer = np.hypot(u + 3, v)
    inner = np.hypot(u + 6.2 + wob, v)
    on = (outer < 7.0) & (inner > 7.1)
    m[on] = 1
    m[on & (inner < 8.0)] = 0
    m[on & (outer > 5.0)] = 2
    m[on & (outer > 5.9) & (np.abs(v) < 4.5)] = 3
    cx, cy = 16 + 2 * math.cos(a), 16 + 2 * math.sin(a)
    light.glow(L, C, cx, cy, 11, 0.38 + 0.06 * math.sin(TAU * ph))
    light.glow(L, C, cx, cy, 5, 0.45)
    return m, L


# ---------------------------------------------------------------- kiếm khí trúng đích
def kiem_trung(f):
    X, Y, C = G32
    m, L = blank(X)
    n = 8
    t = f / (n - 1)
    d = np.hypot(X - 16, Y - 16)
    if f == 0:
        m[d < 5.2] = 2
        m[d < 4.2] = 3
    elif f == 1:
        m[d < 6.8] = 1
        m[d < 6.0] = 2
        m[d < 3.5] = 3
    if 2 <= f <= 5:                                        # vòng sóng vỡ dần
        k = (f - 1) / 5
        r = 6 + 6 * ease_out(k)
        ang = np.arctan2(Y - 16, X - 16)
        on = (np.abs(d - r) < 0.9 - 0.4 * k) & (np.sin(ang * 5 + f) > -0.6 + 1.4 * k)
        m[on] = 2 if f <= 3 else 1
    for i in range(7):                                     # tia lửa văng ra
        th = TAU * (i + hsh(i, 3) * 0.7) / 7
        r0 = 3 + 9.5 * ease_out(t) * (0.7 + 0.3 * hsh(i, 4))
        cs, sn = math.cos(th), math.sin(th)
        if f == n - 1:
            if i % 3 == 0:
                dot(m, 16 + r0 * cs, 16 + r0 * sn, 1)
            continue
        ln = 5.5 * (1 - t) ** 1.2 * (0.7 + 0.5 * hsh(i, 5))
        p0, p1 = (16 + r0 * cs, 16 + r0 * sn), (16 + (r0 + ln) * cs, 16 + (r0 + ln) * sn)
        d2, _, _ = fxlib.stroke(X, Y, [p0, p1], 1.5 * (1 - t) + 0.9, 0.6)
        m[d2 < 0] = 3 if t < 0.3 else 2 if t < 0.65 else 1
    light.glow(L, C, 16, 16, 13, 0.8 * (1 - t) ** 2)
    light.glow(L, C, 16, 16, 6, 0.6 * (1 - t) ** 3)
    return m, L


# ---------------------------------------------------------------- lôi kiếp
GL = grid(96, 184)
LK_PIVOT = (48, 166)


def _polyline(rng, x0, y0, x1, y1, n, jit):
    return [(x0 + (x1 - x0) * i / n + (rng.uniform(-jit, jit) if 0 < i < n else 0.0), y0 + (y1 - y0) * i / n)
            for i in range(n + 1)]


def _bolt():
    rng = np.random.default_rng(11)
    main = _polyline(rng, 64, 5, 48, 164, 14, 9)
    f1 = _polyline(rng, *main[4], main[4][0] - 24, main[4][1] + 34, 3, 4)
    f2 = _polyline(rng, *main[8], main[8][0] + 20, main[8][1] + 30, 3, 4)
    return main, (f1, f2)


BOLT, FORKS = _bolt()
BOLT_D, BOLT_T, _ = fxlib.stroke(GL[0], GL[1], BOLT, 0, 0)
FORK_DT = [fxlib.stroke(GL[0], GL[1], p, 0, 0)[:2] for p in FORKS]
LK_POWER = [0.3, 0.45, 1.0, 0.9, 0.15, 0.7, 0.55]


def _along(pts, k):
    j = min(int(k * (len(pts) - 1)), len(pts) - 2)
    u = k * (len(pts) - 1) - j
    return pts[j][0] + (pts[j + 1][0] - pts[j][0]) * u, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * u


def loi_kiep(f):
    X, Y, C = GL
    m, L = blank(X)
    px, py = LK_PIVOT
    D, T = BOLT_D, BOLT_T
    fade = max(0.0, (f - 7) / 8)
    power = LK_POWER[f] if f < 7 else 0.3 * (1 - fade) ** 2
    e = np.hypot(X - px, (Y - py) / 0.45)
    ang = np.arctan2((Y - py) / 0.45, X - px)

    if 2 <= f <= 10:                                       # vòng chấn động trên mặt đất
        k = (f - 2) / 8
        r = 8 + 18 * ease_out(k)
        wd = 2.2 - 1.5 * k
        on = (e <= r) & (e > r - wd) & (np.sin(ang * 7 + f) > -0.7 + 1.6 * k)
        m[on] = 2 if k < 0.3 else 1 if k < 0.7 else 0

    if f == 0:                                             # tia tiên đạo dò xuống
        on = (D < 0.6) & (T < 0.55)
        m[on] = 1
    elif f == 1:
        m[D < 0.6] = 1
        m[(D < 0.6) & (T > 0.7)] = 2
    elif f in (2, 3):                                      # cú đánh chính, lõi trắng
        hw = 2.6 if f == 2 else 2.0
        m[D < hw + 0.6] = 0
        m[D < hw] = 1
        m[D < hw - 0.6] = 2
        m[D < hw - 1.3] = 3
        for fd, ft in FORK_DT:
            on = fd < 1.2 * (1 - ft * 0.7)
            m[on] = 2
            m[on & (fd < 0.5)] = 3
        if f == 2:
            m[e < 13] = 2
            m[e < 8] = 3
        else:
            m[e < 15] = 1
            m[e < 10] = 2
    elif f == 4:                                           # một khung tối giữa hai cú
        m[(D < 0.6) & (np.sin(T * 40) > 0)] = 0
    elif f in (5, 6):                                      # đánh lại theo kênh cũ, yếu hơn
        hw = 1.5 if f == 5 else 1.1
        m[D < hw + 0.6] = 1
        m[D < hw] = 2
        m[D < hw - 0.7] = 3
        if f == 5:
            fd, ft = FORK_DT[1]
            m[fd < 0.6 * (1 - ft * 0.5)] = 1
    else:                                                  # tàn dư tan thành đốm
        if f <= 11:
            on = (D < 0.6) & (np.sin(T * 55 + 1.7) > -0.2 + 1.3 * fade)
            m[on] = 1 if fade < 0.4 else 0
        for i in range(24):
            life = 1.0 if i < 3 else 0.35 + 0.6 * hsh(i, 2)
            if fade > life:
                continue
            x, y = _along(BOLT, 0.12 + 0.86 * hsh(i, 1))
            x += (hsh(i, 3) - 0.5) * 10 * fade
            y += 6 * fade
            dot(m, x, y, 2 if fade < life * 0.4 else 1 if fade < life * 0.8 else 0)
            light.glow(L, C, x, y, 3, 0.22 * (1 - fade))

    if 2 <= f <= 11:                                       # tia lửa bắn lên từ chỗ sét đánh
        tt = f - 2
        for i in range(9):
            x = px + (hsh(i, 6) - 0.5) * 5.5 * tt
            y = 164 - (2.5 + 3 * hsh(i, 7)) * tt + 0.32 * tt * tt
            if y <= py and tt <= 6 + 4 * hsh(i, 8):
                dot(m, x, y, 3 if tt < 3 else 2 if tt < 6 else 1)

    own = np.zeros_like(L)                                 # ánh sáng dọc tia sét: lõi hẹp và quầng rộng
    lo = int(0.55 * 14) if f == 0 else 14
    for j in range(1, lo):
        seg = np.zeros_like(L)
        light.glow_line(seg, C, BOLT[j], BOLT[j + 1], 4, 0.7)
        if j >= 2:
            light.glow_line(seg, C, BOLT[j], BOLT[j + 1], 11, 0.28)
        np.maximum(own, seg, out=own)
    L += own * power
    if f in (2, 3):
        for p in FORKS:
            for j in range(len(p) - 1):
                light.glow_line(L, C, p[j], p[j + 1], 6, 0.3)
    if f >= 1:
        dg = np.hypot(X - px, (Y - 164) / 0.6) / 30
        L += np.where(dg < 1, (1 - np.minimum(dg, 1)) ** 2 * 0.75 * power, 0.0)
    return m, L


# ---------------------------------------------------------------- đột phá
GD = grid(128, 144)
DP_PIVOT = (64, 112)


def dot_pha(f):
    X, Y, C = GD
    m, L = blank(X)
    px, py = DP_PIVOT
    e = np.hypot(X - px, (Y - py) / 0.45)
    ang = np.arctan2((Y - py) / 0.45, X - px)

    for f0, rmax, dur in ((3, 54, 14), (7, 40, 13)):       # hai vòng sóng lan trên mặt đất
        if f0 <= f <= f0 + dur:
            k = (f - f0) / dur
            r = 8 + (rmax - 8) * ease_out(k)
            wd = 3.2 - 2.4 * k
            on = (e <= r) & (e > r - wd) & (np.sin(ang * 9 + f * 0.8 + f0) > -0.8 + 1.7 * k * k)
            m[on] = 2 if k < 0.35 else 1 if k < 0.7 else 0
            if k < 0.25:
                m[on & (e > r - wd * 0.45)] = 3
            light.glow_ring(L, C, px, py, r - wd / 2, 6, 0.3 * (1 - k), flat=0.45)

    if f < 3:                                              # tụ khí dưới chân
        r = 4 + 3 * f
        m[e < r] = 1
        m[e < r * 0.6] = 2
        light.glow(L, C, px, py - 4, 20 + 6 * f, 0.3 + 0.15 * f)

    if 4 <= f <= 21:                                       # cột sáng xông lên
        k = (f - 4) / 17
        top = py - 96 * ease_out(min(1.0, k * 2.2))
        hw0 = 8 * (1 - ease_in(k)) + 0.8
        dx = np.abs(X - px)
        tt = np.clip((py - Y) / (py - top + 1e-6), 0, 1)
        hw = hw0 * (1 - 0.55 * tt)
        on = (Y <= py) & (Y >= top) & (dx <= hw)
        if k > 0.55:                                       # tan dần thành từng đoạn
            on &= np.sin(Y * 0.8 - f * 1.5) > (k - 0.55) / 0.45 * 1.8 - 1
        m[on] = 0
        m[on & (dx <= hw * 0.72)] = 1
        m[on & (dx <= hw * 0.45)] = 2
        m[on & (dx <= hw * 0.2 + 0.5)] = 3
        power = (1 - k) ** 1.2
        light.glow_line(L, C, (px, py), (px, top), 16, 0.4 * power)
        light.glow_line(L, C, (px, py), (px, top), 6, 0.5 * power)

    if f in (3, 4):                                        # đỉnh trắng quanh thân
        d = np.hypot(X - px, (Y - (py - 10)) / 1.25)
        r = 15 if f == 3 else 19
        m[(d >= r) & (d < r + 1.5)] = 1
        m[d < r] = 2
        if f == 3:
            m[d < r - 4] = 3
        light.glow(L, C, px, py - 10, 40, 0.9 if f == 3 else 0.6)

    for i in range(28):                                    # đốm linh khí bay lên
        f0, life = (16, 14) if i < 4 else (4 + int(10 * hsh(i, 1)), 12 + int(8 * hsh(i, 2)))
        age = f - f0
        if not 0 <= age < life:
            continue
        a0 = TAU * hsh(i, 3)
        r = 6 + 36 * hsh(i, 4)
        x = px + r * math.cos(a0) + 2 * math.sin(age * 0.5 + i)
        y = py + r * math.sin(a0) * 0.45 - (1.3 + 1.8 * hsh(i, 5)) * age - 0.03 * age * age
        u = age / life
        s = 3 if u < 0.25 else 2 if u < 0.55 else 1 if u < 0.8 else 0
        if i % 4 == 0 and u < 0.5:
            for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                dot(m, x + ox, y + oy, s - 1)
        dot(m, x, y, s)
        light.glow(L, C, x, y, 4, 0.3 * (1 - u))
    return m, L


# ---------------------------------------------------------------- tọa thiền (lặp)
GT = grid(64, 64)
TT_PIVOT = (32, 44)


def toa_thien(f):
    X, Y, C = GT
    m, L = blank(X)
    px, py = TT_PIVOT
    ph = f / 24
    e = np.hypot(X - px, (Y - py) / 0.45)
    ang = np.arctan2((Y - py) / 0.45, X - px)
    wave = np.sin(ang * 6 + TAU * ph)                      # vòng đứt nét xoay đúng một nhịp mỗi vòng lặp
    on = np.abs(e - 17) < 0.7
    m[on & (wave > 0.15)] = 0
    m[on & (wave > 0.8)] = 1
    light.glow_ring(L, C, px, py, 17, 4, 0.10 + 0.04 * math.sin(TAU * ph), flat=0.45)
    for i in range(12):                                    # đốm linh khí xoáy vào và bốc lên ngực
        for back, drop in ((0.04, 1), (0.0, 0)):
            u = (ph + i / 12 + 0.37 * hsh(i, 1) - back) % 1.0
            r = 25 * (1 - u) ** 1.3 + 2
            a = TAU * hsh(i, 2) + 3.0 * u
            x, y = px + r * math.cos(a), py + r * math.sin(a) * 0.45 - (1 + 13 * u)
            s = 0 if u < 0.15 else 1 if u < 0.5 else 2 if u < 0.85 else 3
            if drop and u < 0.6:
                continue
            dot(m, x, y, max(0, s - drop))
            if not drop:
                light.glow(L, C, x, y, 3.5, 0.12 + 0.3 * u)
    light.glow(L, C, px, py - 9, 15, 0.16 + 0.05 * math.sin(TAU * ph))
    return m, L


# ---------------------------------------------------------------- xuất
def build(name, fps, pivot, loop, render, n, pal, ramp, rows=1, **kw):
    cols, lts, fins = [], [], []
    for r in range(rows):
        cr, lr, fr = [], [], []
        for f in range(n):
            m, L = render(f, TAU * r / rows) if rows > 1 else render(f)
            col = pfx.paint(m, pal)
            lt = pfx.tint(np.repeat(np.clip(L, 0, 1)[..., None], 3, -1), ramp)
            cr.append(col)
            lr.append(lt)
            fr.append(pfx.composite(col, lt))
        cols.append(cr)
        lts.append(lr)
        fins.append(fr)
    one = rows == 1
    frames, lights, colors = (fins[0], lts[0], cols[0]) if one else (fins, lts, cols)
    ex.write(OUT, name, frames, fps, pivot, loop, light=lights, color=colors, **kw)
    bad = ex.check(frames, light=lights, loop=loop)

    PREVIEW.mkdir(exist_ok=True)                           # dải xem trước trên nền cỏ, phóng 3 lần
    step = max(1, n // 8)
    strip = np.concatenate([pfx.composite(cols[0][i], lts[0][i], "#5da552") for i in range(0, n, step)], axis=1)
    Image.fromarray(strip).resize((strip.shape[1] * 3, strip.shape[0] * 3), Image.NEAREST).save(PREVIEW / f"{name}.png")
    print(f"{name}: {rows}x{n} khung" + ("  ok" if not bad else "\n  " + "\n  ".join(bad)))
    return not bad


EFFECTS = {
    "kiem_khi": lambda: build("kiem_khi", 18, (16, 16), True, kiem_khi, 6, CYAN, CYAN_LIGHT, rows=16),
    "kiem_trung": lambda: build("kiem_trung", 24, (16, 16), False, kiem_trung, 8, CYAN, CYAN_LIGHT),
    "loi_kiep": lambda: build("loi_kiep", 24, LK_PIVOT, False, loi_kiep, 16, VIOLET, VIOLET_LIGHT,
                              states={"leader": [0, 1], "strike": [2, 6], "fade": [7, 15]},
                              hits=[ex.hit(2, 24, freeze=0.04, shake=3, shake_time=0.2)]),
    "dot_pha": lambda: build("dot_pha", 24, DP_PIVOT, False, dot_pha, 30, GOLD, GOLD_LIGHT,
                             states={"charge": [0, 2], "burst": [3, 21], "fade": [22, 29]},
                             hits=[ex.hit(3, 24, freeze=0.06, shake=4, shake_time=0.25)]),
    "toa_thien": lambda: build("toa_thien", 12, TT_PIVOT, True, toa_thien, 24, CYAN, CYAN_LIGHT),
}

if __name__ == "__main__":
    names = sys.argv[1:] or list(EFFECTS)
    ok = all([EFFECTS[n]() for n in names])
    sys.exit(0 if ok else 1)
