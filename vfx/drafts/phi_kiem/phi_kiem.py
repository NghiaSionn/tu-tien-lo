"""Phi kiếm (flying sword) — Phi Kiếm Trận và tiến hóa Liệt Diễm Kiếm Trận, cho Tu Tiên Lộ. 3/4 top-down.

Brief: 28x28, 16 hướng (kiếm bay đuổi quái đổi hướng liên tục), 4 khung @ 24 fps lặp; glow vừa; rõ.
Cấu tạo kiếm thẳng (nghiên cứu kiếm Trung Hoa "jian"): mũi nhọn, lưỡi thẳng hai cạnh có sống giữa, chắn tay (hộ thủ)
ngang hẹp, chuôi ngắn, núm chuôi; tỉ lệ lưỡi : chuôi ~ 3 : 1. Phi kiếm tiên hiệp bay mũi trước, kéo vệt khí phía sau.
  phi_kiem        lưỡi bạc lõi trắng 1 px, hộ thủ vàng, vệt khí kiếm xanh ngọc (hệ Kiếm) chớp đứt quãng
  liet_diem_kiem  lưỡi nung đỏ-cam lõi vàng trắng, vệt lửa phía sau nguội dần (hệ Hỏa) — tiến hóa
Ánh sáng chỉ ở sống lưỡi và mũi kiếm (lóe), vệt khí/lửa có quầng nhẹ.
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

W = H = 28
PX, PY = 14, 14
FRAMES, FPS = 4, 24
SEED = 4
# 0 viền, 1 thép tối, 2 thép sáng, 3 trắng, 4 vàng hộ thủ, 5 chuôi tối, 6 khí đậm, 7 khí nhạt
PAL_KIEM = ["#14202e", "#5f7c99", "#bfe6ff", "#ffffff", "#e0b24a", "#5a3a1a", "#2fa9b8", "#9ff2f0"]
RAMP_KIEM = ["#0f3a48", "#5fd8e8", "#d8fbff", "#ffffff"]
PAL_HOA = ["#3a0d08", "#b8300e", "#ffb43a", "#fff2c0", "#e0b24a", "#5a3a1a", "#c4400e", "#ff8a2a"]
RAMP_HOA = ["#5a1004", "#f07020", "#ffd890", "#ffffff"]


def make_render(fire):
    def render(a, f, seed=SEED):
        x, y = fxlib.grid(W, H, PX, PY)
        u, v = fk.rot(x, y, a)
        m = fxlib.empty(W, H)
        L = np.zeros((H, W))
        c = tt.C(x, y)
        ph = f / FRAMES
        # vệt phía sau (khí kiếm hoặc lửa)
        if fire:
            fk.trail_puffs(m, x, y, u, v, -4.0, 2.2, ph, n=2, gap=0.9, shrink=0.75,
                           tones=[(2, 1), (7, 6), (6, 0)], wob=0.5, amp=0.25, seed=seed)
        else:
            for k, vv in enumerate((-1.0, 1.0)):
                d, t, _ = fxlib.stroke(u, v, [(-4.5, vv * 0.6), (-9.0, vv * 1.5)], 1.0, 0.3)
                gap = (np.floor(t * 4 - f) % 4) != 0
                m[(d < 0) & gap & (m < 6)] = 7 if k == (f % 2) else 6
        # lưỡi: mũi ở u = 8, gốc ở u = -1; rộng 2 px, sống giữa trắng
        dB, tB, sB = fxlib.stroke(u, v, [(-1.0, 0.0), (8.2, 0.0)], 2.6, 0.2)
        blade = dB < 0
        m[blade] = 1
        m[blade & (sB < 0)] = 2                      # nửa trên-trái sáng hơn (ánh sáng từ trên trái)
        m[blade & (np.abs(sB) < 0.45) & (tB < 0.92)] = 3 if not fire else 3
        # hộ thủ ngang + chuôi + núm
        dG, _, _ = fxlib.stroke(u, v, [(-1.6, -2.6), (-1.6, 2.6)], 1.3, 1.3)
        m[dG < 0] = 4
        dH, _, _ = fxlib.stroke(u, v, [(-2.4, 0), (-4.6, 0)], 1.3, 1.3)
        m[dH < 0] = 5
        m = fk.rim(m, 0)
        # ánh sáng: sống lưỡi (lõi mảnh) + mũi lóe xoay vòng
        tip = (math.cos(a) * 8, math.sin(a) * 8)
        base = (math.cos(a) * 0, math.sin(a) * 0)
        light.glow_line(L, c, base, tip, 2.0, 0.16)
        light.glow(L, c, *tip, 4.0, 0.35 * (0.6 + 0.4 * light.flicker(1, f, seed)))
        light.glow(L, c, math.cos(a) * -6, math.sin(a) * -6, 5.0, 0.12 if fire else 0.08)
        return m, L
    return render


def main():
    r1 = tt.run(HERE, "phi_kiem", make_render(False), PAL_KIEM, RAMP_KIEM, W, H, (PX, PY), FRAMES, FPS, True, dirs=16, src=__file__)
    r2 = tt.run(HERE, "liet_diem_kiem", make_render(True), PAL_HOA, RAMP_HOA, W, H, (PX, PY), FRAMES, FPS, True, dirs=16, src=__file__)
    return r1 or r2


if __name__ == "__main__":
    sys.exit(main())
