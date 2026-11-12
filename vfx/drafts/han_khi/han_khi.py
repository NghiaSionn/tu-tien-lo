"""Hàn Khí (Frost Nova) — nổ hàn khí quanh thân theo nhịp dài, làm chậm mạnh, cho Tu Tiên Lộ. 3/4 top-down, một lần.

Brief: 128x96, 16 khung @ 30 fps (0,53 s); xanh băng tới trắng (hệ Băng); glow vừa; rõ. Bán kính cuối R = 46 px,
game scale = bán kính thật / 46 (60–82 px). Nhịp: hơi lạnh tụ ở chân (0–2) -> vòng gai băng mọc dựng lên theo vòng
lan (3–8, mỗi gai là tinh thể có mặt sáng/tối, cạnh trắng) -> gai vỡ thành mảnh văng + sương mỏng (9–13) -> vài
mảnh lấp lánh (14–15). Ánh sáng: lõi lạnh ở chân, đỉnh gai lóe khi mọc, mảnh vỡ chớp.
"""
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "kit"))
sys.path.insert(1, str(HERE.parent / "common"))
import fxkit as fk  # noqa: E402
import fxlib  # noqa: E402
import light  # noqa: E402
import numpy as np  # noqa: E402
import tt  # noqa: E402

W, H = 128, 96
PX, PY = 64, 54
FRAMES, FPS = 16, 30
R_END = 46.0
FLAT = 0.6
SEED = 8
PAL = ["#12304a", "#2f6f9f", "#7fc8f0", "#d6f4ff", "#ffffff"]
RAMP = ["#123a5a", "#7fc8f0", "#e0f8ff", "#ffffff"]
N_SPIKES = 18


def ring_r(f):
    t = min(1.0, max(0.0, (f - 2) / 7))
    return 8 + (R_END - 8) * (1 - (1 - t) ** 2.5)


def spike(m, x, y, bx, by, hgt, wid):
    """gai băng dựng đứng: tam giác, mặt trái sáng, mặt phải tối, sống trắng"""
    rel = (by - y) / max(hgt, 0.1)
    half = wid * (1 - rel)
    on = (rel >= 0) & (rel <= 1) & (np.abs(x - bx) <= half)
    m[on & (x <= bx)] = 3
    m[on & (x > bx)] = 1
    m[on & (np.abs(x - bx) < 0.6) & (rel < 0.85)] = 4
    return on


def render(a, f, seed=SEED):
    x, y = fxlib.grid(W, H, PX, PY)
    m = fxlib.empty(W, H)
    L = np.zeros((H, W))
    c = tt.C(x, y)
    rng = np.random.default_rng(seed)
    R = ring_r(f)
    # 0–3: lõi lạnh ở chân
    if f <= 3:
        rr = 3 + f * 1.5
        g = np.hypot(x, y / FLAT)
        m[g < rr] = 2
        m[g < rr * 0.5] = 4
        light.glow(L, c, 0, 0, 10, 0.4 * (1 - f / 5))
    # vòng sương mặt đất (chấm) theo vòng lan
    if 2 <= f <= 12:
        dr = np.abs(np.hypot(x, y / FLAT) - R)
        m[(dr < 0.8) & fxlib.checker(x.astype(int), y.astype(int), f % 2) & (m < 1)] = 2 if f < 9 else 1
    # dải băng mặt đất dưới chân gai (3–9): elip dày 3 px, mép trong sáng
    if 3 <= f <= 9:
        dr = np.hypot(x, y / FLAT) - R
        band = (dr > -3.0) & (dr < 0.8)
        m[band & (m < 2)] = 2
        m[band & (dr < -2.0) & (m < 3)] = 3
        light.glow_ring(L, c, 0, 0, R, 3.0, 0.06, flat=FLAT)
    # gai băng: mọc khi vòng lan qua, giữ, rồi vỡ
    order = sorted(range(N_SPIKES), key=lambda i: math.sin(i * math.tau / N_SPIKES))   # sau trước, trước sau (độ sâu)
    for i in order:
        ang = i / N_SPIKES * math.tau + rng.uniform(-0.12, 0.12)
        size = rng.uniform(0.75, 1.15)
        born = 3 + int(2 * rng.random())
        bx, by = math.cos(ang) * R, math.sin(ang) * R * FLAT
        if born <= f <= 9:
            grow = min(1.0, (f - born + 1) / 2)
            hgt, wid = 8 * size * grow, 2.4 * size   # trong game phóng tới ×1,8: giữ gai thấp để không che quái
            spike(m, x, y, bx, by, hgt, wid)
            if f - born < 2:
                light.glow(L, c, bx, by - hgt, 3.5, 0.32)                 # đỉnh gai lóe khi mọc
            light.glow(L, c, bx, by - hgt * 0.5, 3.5, 0.1)
        elif 10 <= f <= 15:                                            # vỡ: mảnh văng ra + rơi
            age = f - 9
            for j in range(3):
                sa = ang + (j - 1) * 0.5
                sp = 1.6 + 0.6 * j
                sx = bx + math.cos(sa) * sp * age
                sy = by - 5 * size + math.sin(sa) * sp * age * FLAT + 0.35 * age * age
                if age <= 6 - j:
                    fxlib.Pen(PX, PY).put(m, sx, sy, (4, 3, 2, 2, 1, 1)[min(age, 5)])
                    light.flash_at(L, c, f, 10, sx, sy, 3.0, 0.25 * light.flicker(i * 3 + j, f, seed), life=4)
    # sương mỏng sau khi vỡ: chấm thưa trên vòng
    if 10 <= f <= 15:
        dr = np.abs(np.hypot(x, y / FLAT) - R * 0.95)
        m[(dr < 2.5) & (fk.bayer(m) < 0.12 * (15 - f) / 5) & (m < 1)] = 1
    return m, L


def main():
    return tt.run(HERE, "han_khi", render, PAL, RAMP, W, H, (PX, PY), FRAMES, FPS, False, src=__file__,
                  extra=dict(radius=R_END, note="game: scale = bán kính thật / 46"))


if __name__ == "__main__":
    sys.exit(main())
