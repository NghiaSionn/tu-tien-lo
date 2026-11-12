"""Lôi Vực (Thunder Field) — một xung điện tỏa ra quanh thân người thi triển, 3/4 top-down, one-shot.

Brief: vai trò = công pháp tự thi triển theo nhịp (~2 s) trong bí cảnh Tu Tiên Lộ; góc nhìn 3/4 top-down, 1 hướng;
128x96, 16 khung @ 30 fps (0,53 s), một lần; tím/trắng (hệ Lôi), ánh sáng tím; pixel sắc nét, glow vừa, rõ;
nhịp: lóe ở chân (0–2) -> vòng sét lởm chởm nở ra (2–9) -> tan thành vài tia lửa (10–15).
Bán kính cuối R = 46 px; game phát với scale = bán kính thật / 46 (lôi vực 48–66 px).

Hình thật của sét (nghiên cứu): kênh sáng gấp khúc, lõi trắng 1 px viền màu, nhánh ngắn rẽ ra rồi tắt rất nhanh,
tia lửa văng; tia tái đánh dọc kênh cũ — ở đây vòng sét được "gập" lại mỗi 2 khung cho cảm giác lách tách.
"""
import json
import math
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "kit"))
import export as ex  # noqa: E402
import fxlib  # noqa: E402
import light  # noqa: E402
import pfx  # noqa: E402

NAME = "loi_vuc"
W, H = 128, 96
PX, PY = 64, 52            # chân người thi triển
FRAMES, FPS = 16, 30
R_END = 46.0
FLAT = 0.6                 # 3/4: vòng trên mặt đất dẹt theo trục dọc
SEED = 7
PAL = ["#2a1450", "#5a2ea0", "#9a6cf0", "#d9c8ff", "#ffffff"]
RAMP = ["#3a1a80", "#9a6cf0", "#e6dcff", "#ffffff"]
GLOW = light.GLOW["medium"]


def ease_out(t):
    return 1 - (1 - t) ** 3


def radius(f):
    t = min(1.0, max(0.0, (f - 1) / 9))
    return 7 + (R_END - 7) * ease_out(t)


def life(f):
    """độ mạnh của vòng: lóe nhanh, giữ, rồi tắt"""
    if f <= 2:
        return 0.6 + 0.2 * f
    if f <= 8:
        return 1.0
    return max(0.0, 1 - (f - 8) / 6)


def ring_pts(rng, R, a0, a1, jag):
    n = max(3, int(abs(a1 - a0) * R / 4))
    pts = []
    for i in range(n + 1):
        a = a0 + (a1 - a0) * i / n
        r = R + (rng.uniform(-jag, jag) if 0 < i < n else 0)
        pts.append((math.cos(a) * r, math.sin(a) * r * FLAT))
    return pts


def draw_bolt(m, x, y, pts, hot):
    """lõi trắng 1 px, viền 1 px màu; hot 0..1 hạ tông khi tắt dần"""
    d, _, _ = fxlib.stroke(x, y, pts, 1.0)
    core, edge = (4, 2) if hot > 0.66 else (3, 2) if hot > 0.33 else (2, 1)
    m[(d < 0.45) & (m < core)] = core
    m[(d >= 0.45) & (d < 1.25) & (m < edge)] = edge


def render(f, seed=SEED):
    x, y = fxlib.grid(W, H, PX, PY)
    m = fxlib.empty(W, H)
    L = np.zeros((H, W))
    k = life(f)
    R = radius(f)
    rng = np.random.default_rng(seed * 1000 + f // 2)        # gập lại mỗi 2 khung: lách tách
    srng = np.random.default_rng(seed * 7 + 3)               # tia lửa: cố định theo seed

    # 1. lóe ở chân (khung 0–3): lõi nhỏ sáng
    if f <= 3:
        a = 1 - f / 4
        rr = 3 + f
        m[(np.hypot(x, y / FLAT) < rr * 0.5) & (m < 4)] = 4
        m[(np.hypot(x, y / FLAT) < rr) & (m < 2)] = 2
        light.glow(L, type("c", (), {"x": x, "y": y})(), 0, 0, 10, 0.55 * a)

    # 2. vòng mặt đất mờ (bóng của vùng điện) — dấu chấm cách quãng
    if 2 <= f <= 12 and k > 0:
        dr = np.abs(np.hypot(x, y / FLAT) - (R - 1.5))
        dots = fxlib.checker(x.astype(int), y.astype(int), f % 2)
        m[(dr < 0.7) & dots & (m < 1)] = 1

    # 3. vòng sét: các cung gấp khúc + nhánh ngắn vào trong
    if f >= 2 and k > 0:
        arcs = 9
        keep = 1.0 if f <= 8 else max(0.0, 1 - (f - 8) / 5)
        for i in range(arcs):
            if rng.random() > keep:
                continue
            a0 = i / arcs * math.tau + rng.uniform(-0.15, 0.15)
            a1 = a0 + math.tau / arcs * rng.uniform(0.55, 0.95)
            pts = ring_pts(rng, R, a0, a1, 2.2)
            draw_bolt(m, x, y, pts, k)
            cx = type("c", (), {"x": x, "y": y})()
            for p0, p1 in zip(pts[:-1], pts[1:]):
                light.glow_line(L, cx, p0, p1, 2.6, 0.14 * k)                          # lõi (đoạn ngắn cộng dồn ở chỗ nối -> k nhỏ)
                light.glow_line(L, cx, p0, p1, 2.6 * GLOW["pool_r"], 0.14 * GLOW["pool_k"] * k * 0.4)  # quầng
            if rng.random() < 0.55 and f <= 9:                                        # nhánh vào trong
                j = rng.integers(1, len(pts) - 1)
                bx, by = pts[j]
                ln = rng.uniform(4, 8)
                ang = math.atan2(-by / FLAT, -bx) + rng.uniform(-0.5, 0.5)
                mid = (bx + math.cos(ang) * ln * 0.5 + rng.uniform(-1.5, 1.5), by + math.sin(ang) * ln * 0.5 * FLAT)
                end = (bx + math.cos(ang) * ln, by + math.sin(ang) * ln * FLAT)
                draw_bolt(m, x, y, [(bx, by), mid, end], k * 0.6)

    # 4. tia lửa văng ra ngoài vòng, sống 3–5 khung, chớp tắt lệch nhịp
    cx = type("c", (), {"x": x, "y": y})()
    for i in range(14):
        f0 = 3 + int(srng.integers(0, 8))
        lf = 3 + int(srng.integers(0, 3))
        ang = srng.uniform(0, math.tau)
        sp = srng.uniform(1.6, 3.0)
        age = f - f0
        if not (0 <= age < lf):
            continue
        rr = radius(f0) + sp * age
        sx, sy = math.cos(ang) * rr, math.sin(ang) * rr * FLAT - age * 0.6
        tw = light.flicker(i, f, seed)
        fxlib.Pen(PX, PY).put(m, sx, sy, 4 if tw > 0.5 else 3)
        light.flash_at(L, cx, f, f0, sx, sy, 4.5, 0.45 * tw, life=lf)

    # 5. tàn cuối: vài điểm tím trên vòng (để không "tắt phụt")
    if f >= 13:
        for i in range(4 - (f - 13)):
            ang = (i * 1.7 + f * 0.3) % math.tau
            fxlib.Pen(PX, PY).put(m, math.cos(ang) * R, math.sin(ang) * R * FLAT, 1)

    col = pfx.paint(m, PAL)
    Lc = pfx.tint(np.repeat(np.clip(L, 0, 1)[..., None], 3, -1), RAMP)
    return col, Lc, L


def main():
    from PIL import Image
    out = HERE / "out"
    out.mkdir(parents=True, exist_ok=True)
    cols, lights, finals, sums = [], [], [], []
    for f in range(FRAMES):
        c, lc, L = render(f)
        cols.append(c); lights.append(lc); sums.append(L)
        finals.append(pfx.composite(c, lc))
    meta = ex.write(out / "sheets", NAME, finals, FPS, (PX, PY), False, light=lights, color=cols,
                    extra=dict(view="3/4", directions=1, glow="medium", radius=R_END,
                               note="game: scale = bán kính thật / 46"))
    prev_dark = [pfx.composite(c, l, "#101018") for c, l in zip(cols, lights)]
    prev_mid = [pfx.composite(c, l, "#5da552") for c, l in zip(cols, lights)]
    Image.fromarray(np.concatenate(prev_mid, 1)).resize((W * FRAMES * 4, H * 4), Image.NEAREST).save(out / f"{NAME}_4x_mid.png")
    Image.fromarray(np.concatenate(prev_dark, 1)).save(out / f"{NAME}_1x_dark.png")
    pfx.gif(prev_mid, out / f"{NAME}.gif", FPS, bg="#5da552")
    pfx.contact(out / "contact.png", [pfx.composite(c, l) for c, l in zip(cols, lights)], FPS)
    cover, mean = [], []
    for c, L in zip(cols, sums):
        ys, xs = np.nonzero(c[..., 3])
        box = np.clip(L[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 0, 1)
        cover.append((box > 0.03).mean()); mean.append(box[box > 0.03].mean() if (box > 0.03).any() else 0)
    print(f"light: cover {np.median(cover):.0%}, mean {np.median(mean):.3f} (medium 0.06–0.10)")
    bad = ex.check(cols, lights, False, src=__file__)
    bad += ex.check_seeds(lambda f, sd: render(f, seed=sd)[0], FRAMES)
    print("\n".join(bad) or f"ok: {FRAMES} frames {W}x{H} @ {FPS} fps -> {out / 'sheets'}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
