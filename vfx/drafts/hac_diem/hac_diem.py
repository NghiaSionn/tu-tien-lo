"""Hắc diễm — chiêu của Ma Ảnh Yêu Vương (boss cuối) và tinh anh Ma Ảnh, cho Tu Tiên Lộ. 3/4 top-down.

  hac_diem_no   96x72, 10 khung @ 24 fps một lần: nổ lửa tím-đen khi vùng hắc diễm / đập đất nổ. Bán kính thiết kế 30 px,
                game scale = bán kính vùng / 30 (26–48 px). Nhịp: lõi lóe tím trắng, đĩa lửa + tia + vòng, bùng rỗng, khói
                đen tím bốc lên vỡ chấm, tàn rơi (khung nổ chuẩn của beanfx hit_burst, màu hắc diễm).
  hac_diem_dan  16x16, 6 khung @ 24 fps lặp: viên lửa tím lõi sáng viền đen, mép lửa xoáy — đạn tỏa của Yêu Vương.
Glow vừa; rõ. Cảnh báo (vòng đỏ, tia báo hướng) vẫn do game vẽ bằng code — luôn rõ hơn hiệu ứng này.
Màu: tím/đen (hắc) với lõi hồng trắng, tách khỏi đỏ của cảnh báo và cam của lửa người chơi.
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

SEED = 13
# 0 viền đen, 1 tím sẫm, 2 tím, 3 tím hồng, 4 hồng trắng, 5 trắng; 6–8 khói
PAL = ["#0c0614", "#3a1460", "#7a30c0", "#c070ff", "#f4d8ff", "#ffffff", "#140c1c", "#2a1a38", "#463254"]
RAMP = ["#2a0c48", "#a050f0", "#f0c8ff", "#ffffff"]

NW, NH = 96, 72
NPX, NPY = 48, 44
NR = 30.0


def no(a, f, seed=SEED):
    X, Y = fxlib.grid(NW, NH, NPX, NPY)
    m = fxlib.empty(NW, NH)
    L = np.zeros((NH, NW))
    c = tt.C(X, Y)
    if f <= 5:
        fk.hit_burst(m, X, Y, f, (1, 2, 3, 5), (6, 7, 8), 0, r=NR, flat=0.6, seed=seed)
    else:
        rng = np.random.default_rng(seed + 5)
        for j in range(9 - 2 * (f - 6)):
            ax, ay = rng.uniform(-NR, NR), rng.uniform(-NR * 0.5, NR * 0.2)
            fxlib.Pen(NPX, NPY).put(m, ax, ay - (f - 5) * 1.5, 8 if j % 2 else 2)
    light.flash_at(L, c, f, 0, 0, 0, 10, 0.6, life=3)
    light.flash_at(L, c, f, 1, 0, 0, NR * 1.0, 0.32, life=4)
    light.flash_at(L, c, f, 1, 0, 0, NR * 1.6, 0.08, life=5)
    return m, L


DW = DH = 16
DPX, DPY = 8, 8


def dan(a, f, seed=SEED):
    x, y = fxlib.grid(DW, DH, DPX, DPY)
    m = fxlib.empty(DW, DH)
    L = np.zeros((DH, DW))
    c = tt.C(x, y)
    ph = f / 6 * math.tau
    d = fk.lumpy(x, y, 0, 0, 4.4, amp=0.22, seed=seed, ph=ph, lobes=4)
    fk.heat_bands(m, d, (5, 4, 3, 2, 1), (0.22, 0.42, 0.62, 0.84, 1.0))
    m = fk.rim(m, 0)
    light.glow(L, c, 0, 0, 3.5, 0.3)
    light.glow(L, c, 0, 0, 7.0, 0.1)
    return m, L


def main():
    r1 = tt.run(HERE, "hac_diem_no", no, PAL, RAMP, NW, NH, (NPX, NPY), 10, 24, False, src=__file__,
                extra=dict(radius=NR, note="game: scale = bán kính vùng / 30"))
    r2 = tt.run(HERE, "hac_diem_dan", dan, PAL, RAMP, DW, DH, (DPX, DPY), 6, 24, True, src=__file__)
    return r1 or r2


if __name__ == "__main__":
    sys.exit(main())
