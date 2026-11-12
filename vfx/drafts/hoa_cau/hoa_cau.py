"""Hỏa Cầu (Fire Orb) — đạn cầu lửa bay chậm + nổ khi trúng, cho Tu Tiên Lộ. 3/4 top-down.

Brief:
  travel  32x32, 8 hướng, 8 khung @ 24 fps lặp — đầu lửa lổn nhổn theo dải nhiệt (trắng, vàng, cam, đỏ, viền sẫm),
          vệt lửa phía sau nhỏ dần, nguội dần và vỡ thành chấm (nghiên cứu lửa: lõi nóng nhạt nhất, mép rách tối).
  impact  48x48, 1 hướng, 8 khung @ 24 fps một lần — lõi lóe, đĩa sáng + tia + vòng, bùng rỗng, rồi khói 3 tông bay lên
          và tàn lửa rơi; bán kính nổ thiết kế 16 px, game phát scale = bán kính nổ / 16 (20–32 px).
Màu Hỏa cam/đỏ (GDD); glow vừa; rõ. Chỉ lõi, đầu đạn, lóe nổ và tàn lửa có ánh sáng.
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

SEED = 5
# 0 viền sẫm, 1 đỏ, 2 cam, 3 vàng, 4 vàng nhạt, 5 trắng; 6–8 khói
PAL = ["#3a0d08", "#a3260c", "#e8601c", "#ffb43a", "#fff2c0", "#ffffff", "#3b3540", "#5c5560", "#837b86"]
RAMP = ["#5a1004", "#e8601c", "#ffd27a", "#ffffff"]
G = light.GLOW["medium"]


class C:  # lưới cho light.*
    def __init__(self, x, y):
        self.x, self.y = x, y


# ---------------- đạn bay ----------------
TW = TH = 32
TPX, TPY = 16, 16
TFRAMES, TFPS = 8, 24


def travel(a, f, seed=SEED):
    x, y = fxlib.grid(TW, TH, TPX, TPY)
    u, v = fk.rot(x, y, a)
    m = fxlib.empty(TW, TH)
    ph = f / TFRAMES
    # vệt lửa: puff i ở s = i + phase, lặp liền mạch
    fk.trail_puffs(m, x, y, u, v, 4.0, 3.2, ph, n=3, gap=1.0, shrink=0.72,
                   tones=[(3, 2), (2, 1), (1, 0), (0, 0)], wob=0.7, amp=0.22, seed=seed)
    # đầu lửa: lổn nhổn, xoay mép theo pha
    d = fk.lumpy(u, v, 4.0, 0.0, 4.2, amp=0.18, seed=seed, ph=ph * math.tau, lobes=5)
    fk.heat_bands(m, d, (5, 4, 3, 2, 1), (0.28, 0.5, 0.7, 0.88, 1.0))
    m = fk.rim(m, 0)
    L = np.zeros((TH, TW))
    c = C(x, y)
    hx, hy = math.cos(a) * 4.0, math.sin(a) * 4.0
    flick = 0.85 + 0.15 * math.sin(f * math.tau / TFRAMES * 2)
    light.glow(L, c, hx, hy, 4.5, 0.5 * flick)                                   # lõi
    light.glow(L, c, hx, hy, 4.5 * G["pool_r"], 0.5 * G["pool_k"] * 0.6 * flick)  # quầng
    light.glow(L, c, hx - math.cos(a) * 5, hy - math.sin(a) * 5, 4, 0.12)        # đuôi gần
    return m, L


# ---------------- nổ ----------------
IW = IH = 48
IPX, IPY = 24, 28
IFRAMES, IFPS = 8, 24
R = 16.0


def impact(f, seed=SEED):
    X, Y = fxlib.grid(IW, IH, IPX, IPY)
    m = fxlib.empty(IW, IH)
    L = np.zeros((IH, IW))
    c = C(X, Y)
    if f <= 5:
        fk.hit_burst(m, X, Y, f, (1, 2, 3, 5), (6, 7, 8), 0, r=R, flat=0.8, seed=seed)
    else:   # tàn: vài tàn lửa rơi + chấm khói cuối, để không tắt phụt
        rng = np.random.default_rng(seed + 31)
        for j in range(5 - 2 * (f - 6)):
            ax, ay = rng.uniform(-R, R), rng.uniform(-R * 0.6, R * 0.3)
            fxlib.Pen(IPX, IPY).put(m, ax, ay + (f - 5) * 1.5, (3, 2, 1)[min(f - 6, 2)] if j % 2 else 7)
    # ánh sáng: lóe lõi (0–2), quầng nổ, tàn lửa chớp
    light.flash_at(L, c, f, 0, 0, 0, 8, 0.6, life=3)
    light.flash_at(L, c, f, 1, 0, 0, R * 1.1, 0.35, life=4)
    light.flash_at(L, c, f, 1, 0, 0, R * 1.1 * G["pool_r"] * 0.6, 0.12, life=4)
    for j in range(8):
        aj = math.tau * j / 8 + 0.2
        rr = R * (1.05 + 0.1 * max(0, f - 3))
        if 3 <= f <= 5 and (j + f) % 3:
            light.glow(L, c, rr * math.cos(aj), rr * 0.8 * 0.8 * math.sin(aj), 2.5, 0.25 * light.flicker(j, f, seed))
    return m, L


def colorize(m, L):
    return pfx.paint(m, PAL), pfx.tint(np.repeat(np.clip(L, 0, 1)[..., None], 3, -1), RAMP)


def measure(cols, sums):
    cover, mean = [], []
    for col, L in zip(cols, sums):
        ys, xs = np.nonzero(col[..., 3])
        if not len(ys):
            continue
        box = np.clip(L[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 0, 1)
        cover.append((box > 0.03).mean()); mean.append(box[box > 0.03].mean() if (box > 0.03).any() else 0)
    return np.median(cover), np.median(mean)


def main():
    from PIL import Image
    out = HERE / "out"
    out.mkdir(parents=True, exist_ok=True)
    bad = []
    # đạn bay: 8 hàng hướng
    rows_c, rows_l, rows_f, sums, flatc = [], [], [], [], []
    for a in fc.headings(8):
        rc, rl, rf = [], [], []
        for f in range(TFRAMES):
            m, L = travel(a, f)
            col, lc = colorize(m, L)
            rc.append(col); rl.append(lc); rf.append(pfx.composite(col, lc)); sums.append(L); flatc.append(col)
        rows_c.append(rc); rows_l.append(rl); rows_f.append(rf)
    ex.write(out / "sheets", "hoa_cau_bay", rows_f, TFPS, (TPX, TPY), True, light=rows_l, color=rows_c,
             extra=dict(fc.meta("3/4", TW, TH, (TPX, TPY), directions=8), glow="medium"))
    for r in range(8):
        bad += [f"bay row {r}: {b}" for b in ex.check(rows_c[r], rows_l[r], True, src=__file__)]
    cv, mn = measure(flatc, sums)
    print(f"bay light: cover {cv:.0%}, mean {mn:.3f}")
    grid = np.concatenate([np.concatenate([pfx.composite(c, l, "#5da552") for c, l in zip(rc, rl)], 1) for rc, rl in zip(rows_c, rows_l)], 0)
    Image.fromarray(grid).resize((grid.shape[1] * 4, grid.shape[0] * 4), Image.NEAREST).save(out / "hoa_cau_bay_4x.png")
    # nổ
    ic, il, iff, isum = [], [], [], []
    for f in range(IFRAMES):
        m, L = impact(f)
        col, lc = colorize(m, L)
        ic.append(col); il.append(lc); iff.append(pfx.composite(col, lc)); isum.append(L)
    ex.write(out / "sheets", "hoa_cau_no", iff, IFPS, (IPX, IPY), False, light=il, color=ic,
             extra=dict(view="3/4", directions=1, glow="medium", radius=R, note="game: scale = bán kính nổ / 16"))
    bad += [f"nổ: {b}" for b in ex.check(ic, il, False, src=__file__)]
    bad += [f"nổ seed: {b}" for b in ex.check_seeds(lambda f, sd: colorize(*impact(f, seed=sd))[0], IFRAMES)]
    cv, mn = measure(ic, isum)
    print(f"nổ light: cover {cv:.0%}, mean {mn:.3f}")
    strip = np.concatenate([pfx.composite(c, l, "#5da552") for c, l in zip(ic, il)], 1)
    Image.fromarray(strip).resize((strip.shape[1] * 4, strip.shape[0] * 4), Image.NEAREST).save(out / "hoa_cau_no_4x.png")
    pfx.gif([pfx.composite(c, l, "#5da552") for c, l in zip(ic, il)], out / "hoa_cau_no.gif", IFPS, bg="#5da552")
    print("\n".join(bad) or "ok: hoa_cau_bay (8 hướng x 8) + hoa_cau_no (8)")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
