"""Liệt Diễm — vùng lửa nhỏ còn cháy trên đất nơi phi kiếm lửa trúng, cho Tu Tiên Lộ. 3/4 top-down.

Brief: 40x28, 1 hướng, 12 khung @ 20 fps lặp (0,6 s); glow vừa; rõ. Bán kính thiết kế 16 px, game scale = z.r / 16.
Lửa thật trên nền (nghiên cứu): vết cháy sẫm hình elip dưới, vài lưỡi lửa mọc lên, mỗi lưỡi lắc và "đứt ngọn" theo nhịp
riêng, lõi vàng ở chân, đỏ ở ngọn, tàn lửa bay lên rồi tắt. Không có viền đen quanh lửa (thân lửa tô theo nhiệt).
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

W, H = 40, 28
PX, PY = 20, 18
FRAMES, FPS = 12, 20
R = 16.0
FLAT = 0.45
SEED = 9
# 0 vết cháy, 1 đỏ sẫm, 2 đỏ, 3 cam, 4 vàng, 5 trắng-vàng
PAL = ["#2a1410", "#7a1a08", "#c4400e", "#f07a20", "#ffc860", "#fff2c0"]
RAMP = ["#5a1004", "#f07020", "#ffd890", "#ffffff"]
TONGUES = [(-9, 1, 6.5), (-3, -1, 9.0), (3, 0.5, 8.0), (9, -0.5, 6.0), (0, 2.5, 5.0)]   # (x, y, cao)


def render(a, f, seed=SEED):
    x, y = fxlib.grid(W, H, PX, PY)
    m = fxlib.empty(W, H)
    L = np.zeros((H, W))
    c = tt.C(x, y)
    t = f / FRAMES * math.tau
    # vết cháy dưới đất (lốm đốm ở mép)
    g = np.hypot(x / R, y / (R * FLAT))
    m[(g < 0.85) & (fk.bayer(m) < 0.3 + 0.45 * (g < 0.6))] = 0
    # lưỡi lửa: giọt ngược, chân rộng, ngọn đung đưa; dải nhiệt từ chân (vàng) lên ngọn (đỏ)
    for i, (tx, ty, th) in enumerate(TONGUES):
        hgt = th * (0.75 + 0.25 * math.sin(t * (1 + i % 2) + i * 1.7))
        lean = 1.2 * math.sin(t + i)
        rel_y = (ty - y) / max(hgt, 0.1)                     # 0 ở chân, 1 ở ngọn
        cxs = tx + lean * np.clip(rel_y, 0, 1)
        half = 2.4 * (1 - np.clip(rel_y, 0, 1)) ** 0.8 + 0.3
        on = (rel_y > -0.15) & (rel_y < 1) & (np.abs(x - cxs) < half)
        heat = np.clip(rel_y, 0, 1) + 0.25 * (np.abs(x - cxs) / np.maximum(half, 0.1))
        m[on & (heat >= 0.75)] = np.maximum(m[on & (heat >= 0.75)], 2)
        m[on & (heat < 0.75)] = 3
        m[on & (heat < 0.45)] = 4
        m[on & (heat < 0.18)] = 5
        light.glow(L, c, tx, ty - hgt * 0.3, 4.0, 0.16)
    # ngọn đứt: một mẩu lửa nhỏ bay lên mỗi lưỡi, lệch pha
    for i, (tx, ty, th) in enumerate(TONGUES[:4]):
        ph = ((f / FRAMES) + i * 0.27) % 1.0
        yy = ty - th - ph * 6
        xx = tx + 1.5 * math.sin(t + i)
        if ph < 0.8:
            fxlib.Pen(PX, PY).put(m, xx, yy, 3 if ph < 0.4 else 2)
            light.glow(L, c, xx, yy, 2.5, 0.12 * (1 - ph))
    # quầng phẳng trên đất
    light.glow_ring(L, c, 0, 0, 0, R * 1.0, 0.05, flat=FLAT)
    return m, L


def main():
    return tt.run(HERE, "liet_diem_vung", render, PAL, RAMP, W, H, (PX, PY), FRAMES, FPS, True, src=__file__,
                  extra=dict(radius=R, note="game: scale = bán kính vùng / 16"))


if __name__ == "__main__":
    sys.exit(main())
