"""Hỏa Luân (Fire Ring) — vòng lửa quanh thân đốt yêu thú áp sát, cho Tu Tiên Lộ. 3/4 top-down, lặp.

Brief: 112x72, 1 hướng, 12 khung @ 20 fps lặp (0,6 s); cam/đỏ (hệ Hỏa); glow vừa; rõ. Bán kính thiết kế 40 px, game
scale = bán kính thật / 40 (30–50 px). Pivot = chân người thi triển.
Hình: vòng lửa nằm trên đất (elip dẹt 3/4), các lưỡi lửa nhỏ dựng lên dọc vòng, mỗi lưỡi lắc theo nhịp riêng; vòng quay
chậm. Nửa sau (phía trên màn hình, sau người) tối và thấp hơn, nửa trước sáng hơn — để đọc là "quanh" người, không phải
"trước" người. Ánh sáng: dọc vòng (quầng phẳng) + ngọn lửa nửa trước.
"""
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "kit"))
sys.path.insert(1, str(HERE.parent / "common"))
import fxlib  # noqa: E402
import light  # noqa: E402
import numpy as np  # noqa: E402
import tt  # noqa: E402

W, H = 112, 72
PX, PY = 56, 42
FRAMES, FPS = 12, 20
R = 40.0
FLAT = 0.5
N = 20
SEED = 12
PAL = ["#3a0d08", "#7a1a08", "#c4400e", "#f07a20", "#ffc860", "#fff2c0"]
RAMP = ["#5a1004", "#f07020", "#ffd890", "#ffffff"]


def render(a, f, seed=SEED):
    x, y = fxlib.grid(W, H, PX, PY)
    m = fxlib.empty(W, H)
    L = np.zeros((H, W))
    c = tt.C(x, y)
    t = f / FRAMES * math.tau
    # vòng nền trên đất: dải than hồng
    g = np.hypot(x, y / FLAT)
    ring = np.abs(g - R) < 2.2
    m[ring & (y < 0)] = 1
    m[ring & (y >= 0)] = 2
    # lưỡi lửa: sau trước vẽ theo độ sâu (y tăng = gần hơn)
    tongues = []
    for i in range(N):
        ang = i / N * math.tau + f / FRAMES * (math.tau / N)          # quay đúng 1 khoảng lưỡi mỗi vòng lặp: liền mạch
        bx, by = math.cos(ang) * R, math.sin(ang) * R * FLAT
        front = math.sin(ang)                                           # -1 sau, +1 trước
        hgt = (9.0 + 4.0 * front) * (0.7 + 0.3 * math.sin(t * 2 + i * 2.1))
        tongues.append((by, bx, hgt, front, i))
    for by, bx, hgt, front, i in sorted(tongues):
        rel = (by - y) / max(hgt, 0.1)
        lean = 0.8 * math.sin(t + i)
        cx = bx + lean * np.clip(rel, 0, 1)
        half = 2.8 * (1 - np.clip(rel, 0, 1)) ** 0.8 + 0.3
        on = (rel > -0.1) & (rel < 1) & (np.abs(x - cx) < half)
        heat = np.clip(rel, 0, 1) + 0.3 * np.abs(x - cx) / np.maximum(half, 0.1)
        hot = front > -0.2
        m[on] = 2
        m[on & (heat < 0.7)] = 3 if hot else 2
        m[on & (heat < 0.4)] = 4 if hot else 3
        m[on & (heat < 0.15) & (front > 0.3)] = 5
        if front > 0:
            light.glow(L, c, bx, by - hgt * 0.4, 3.5, 0.16 * front)
    light.glow_ring(L, c, 0, 0, R, 4.0, 0.08, flat=FLAT)
    return m, L


def main():
    return tt.run(HERE, "hoa_luan", render, PAL, RAMP, W, H, (PX, PY), FRAMES, FPS, True, src=__file__,
                  extra=dict(radius=R, note="game: scale = bán kính thật / 40"))


if __name__ == "__main__":
    sys.exit(main())
