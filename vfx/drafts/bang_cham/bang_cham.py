"""Băng Châm (Ice Needle) — kim băng bắn nhanh làm chậm, cho Tu Tiên Lộ. 3/4 top-down.

Brief: 24x24, 8 hướng, 4 khung @ 24 fps lặp; xanh băng nhạt tới trắng (hệ Băng, GDD); glow vừa; rõ.
Băng thật (nghiên cứu): tinh thể có mặt cắt phẳng, một mặt sáng hẳn (phản chiếu) và một mặt tối, cạnh sáng cứng; kim băng
mảnh, nhọn hai đầu kiểu gai, phía sau rơi vụn sương lấp lánh (chớp tắt) — không có quầng lửa. Ánh sáng: mũi + vụn sương.
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

W = H = 24
PX, PY = 12, 12
FRAMES, FPS = 4, 24
SEED = 6
# 0 viền, 1 băng tối, 2 băng, 3 băng nhạt, 4 trắng
PAL = ["#12304a", "#2f6f9f", "#7fc8f0", "#d6f4ff", "#ffffff"]
RAMP = ["#123a5a", "#7fc8f0", "#e0f8ff", "#ffffff"]


def render(a, f, seed=SEED):
    x, y = fxlib.grid(W, H, PX, PY)
    u, v = fk.rot(x, y, a)
    m = fxlib.empty(W, H)
    L = np.zeros((H, W))
    c = tt.C(x, y)
    # thân kim: hình thoi dài (nhọn hai đầu), mũi trước dài hơn; hai mặt cắt: trên sáng, dưới tối
    head, tail, wid = 7.0, -5.0, 1.9
    k = np.where(u >= 0, u / head, u / tail)
    on = (k <= 1) & (k >= 0) & (np.abs(v) <= wid * (1 - k)) | ((np.abs(u) < 0.6) & (np.abs(v) <= wid))
    m[on] = 2
    m[on & (v < -0.2)] = 3
    m[on & (v > 0.5)] = 1
    ridge = on & (np.abs(v + 0.1) < 0.55) & (u > -2.5) & (u < head - 1)
    m[ridge] = 4                                                       # cạnh sáng cứng dọc sống
    m = fk.rim(m, 0)
    # vụn sương phía sau: các điểm trôi lùi, chớp tắt lệch nhịp
    rng = np.random.default_rng(seed)
    for j in range(5):
        du = -5 - ((j * 2.3 + f * 1.5) % 4.5)
        dv = rng.uniform(-2.0, 2.0)
        px_, py_ = du * math.cos(a) - dv * math.sin(a), du * math.sin(a) + dv * math.cos(a)
        tw = light.flicker(j, f, seed)
        fxlib.Pen(PX, PY).put(m, px_, py_, 4 if tw > 0.6 else 3 if tw > 0.3 else 2)
        light.glow(L, c, px_, py_, 2.2, 0.12 * tw)
    tip = (math.cos(a) * head * 0.8, math.sin(a) * head * 0.8)
    light.glow(L, c, *tip, 3.5, 0.3)
    light.glow_line(L, c, (math.cos(a) * -3, math.sin(a) * -3), tip, 2.0, 0.08)
    return m, L


def main():
    return tt.run(HERE, "bang_cham", render, PAL, RAMP, W, H, (PX, PY), FRAMES, FPS, True, dirs=8, src=__file__)


if __name__ == "__main__":
    sys.exit(main())
