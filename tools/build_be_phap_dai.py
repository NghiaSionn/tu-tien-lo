"""M8: bệ Tụ Linh Pháp Đài (ChatGPT vẽ: docs/concept/tong_mon_be_phap_dai_4loi_chatgpt.png -> sprite_clean --scale 1.8 --colors 96 -> sprites/tm_be.png).
Từ sprite + đa giác mặt sàn/bậc thang (đo tay trên sprite, toạ độ px sprite) sinh:
  - sprites/tm_be_front.png: chỉ phần KHÔNG phải mặt sàn/bậc (lan can, vách, cột cờ, đèn) — game cắt thành dải xếp theo y để che nhân vật đúng
  - src/data/sect_plaza.js: lưới ô đặc quanh tâm pháp đài (tâm bản đồ) cho va chạm
Độ thu 1.8 (bệ ~89% bản 1.6, người phát triển thấy to quá) vẫn để mặt sàn đủ cho thiên kiếp (giữ người chơi trong ARENA_R - 4 = 92 px).
Cũng xoá điểm ảnh ám magenta còn sót (viền + khe lan can) thẳng trên sprites/tm_be.png.
Dùng: .venv/Scripts/python.exe tools/build_be_phap_dai.py
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SCALE = 1
F = 1.6 / 1.8                  # các số đo dưới đây đo trên bản làm sạch --scale 1.6; nhân F cho bản --scale 1.8
ANCHOR = (364, 283.5)          # tâm mặt sàn trong sprite (px sprite) = tâm bản đồ / tụ linh trận
FLOOR = [(314, 171), (418, 171), (525, 214), (546, 243), (546, 318), (429, 396), (304, 396), (182, 318), (182, 243), (204, 214)]
STAIRS = [(304, 394, 421, 590), (318, 110, 411, 176), (0, 250, 184, 309), (544, 250, 724, 309)]   # (x0, y0, x1, y1): bậc nam, lối bắc, cánh tây, cánh đông
AIR = [(128, 0, 215, 150), (518, 0, 593, 150)]   # vải cờ phía bắc: lơ lửng trên cao, không chặn đường đi phía sau
KEEP = [(112, 268, 198, 410), (540, 268, 626, 410)]   # cờ phía nam treo trên cánh đông/tây: giữ ở lớp trước (che người đi trên cánh)
# 4 cây cờ (x0, y0, x1, y1, chân): cả vải + cán + bệ xếp theo CHÂN bệ cờ (vải treo hở bên dưới nên không tự nối xuống chân được)
BANNERS = [(124, 0, 219, 190, 190), (514, 0, 597, 190, 190), (112, 268, 198, 472, 472), (540, 268, 626, 472, 472)]
sc = lambda v: tuple(round(c * F, 1) for c in v)
BANNERS = [sc(b) for b in BANNERS]
ANCHOR, FLOOR = sc(ANCHOR), [sc(p) for p in FLOOR]
STAIRS, AIR, KEEP = [sc(r) for r in STAIRS], [sc(r) for r in AIR], [sc(r) for r in KEEP]


def drop_magenta(a):
    # nền magenta lọt qua khe lan can / viền lem: hồng-tím (r, b cao hơn g nhiều, r ~ b) -> trong suốt. Bệ không có màu tím thật
    r, g, b = [a[..., i].astype(int) for i in range(3)]
    m = (r - g > 45) & (b - g > 45) & (np.abs(r - b) < 90)
    a[m, 3] = 0
    return int(m.sum())
T = 16


def main():
    spr = Image.open(ROOT / 'sprites/tm_be.png').convert('RGBA'); W, H = spr.size
    a0 = np.array(spr); print('xoá điểm magenta:', drop_magenta(a0)); spr = Image.fromarray(a0); spr.save(ROOT / 'sprites/tm_be.png')
    walk = Image.new('L', (W, H), 0); d = ImageDraw.Draw(walk)
    d.polygon(FLOOR, fill=255)
    for r in STAIRS: d.rectangle(r, fill=255)
    walk = np.array(walk) > 0
    air = Image.new('L', (W, H), 0); da = ImageDraw.Draw(air)
    for r in AIR: da.rectangle(r, fill=255)
    air = np.array(air) > 0
    keep = Image.new('L', (W, H), 0); dk = ImageDraw.Draw(keep)
    for r in KEEP: dk.rectangle(r, fill=255)
    keep = np.array(keep) > 0
    a = np.array(spr); alpha = a[..., 3] > 0
    front = a.copy(); front[walk & ~keep] = 0
    Image.fromarray(front).save(ROOT / 'sprites/tm_be_front.png')
    # lưới ô (16 px game) quanh tâm: ô đặc nếu tâm ô không thuộc sàn/bậc và phần đục (trừ vải cờ trên không) chiếm >= 15% ô
    ax, ay = ANCHOR
    gx0, gy0 = int(np.floor(-ax * SCALE / T)), int(np.floor(-ay * SCALE / T))
    gx1, gy1 = int(np.ceil((W - ax) * SCALE / T)), int(np.ceil((H - ay) * SCALE / T))
    rows = []
    for ty in range(gy0, gy1):
        r = ''
        for tx in range(gx0, gx1):
            sx0, sy0 = ax + tx * T / SCALE, ay + ty * T / SCALE; n = T // SCALE
            xs, ys = slice(max(0, int(sx0)), min(W, int(sx0) + n)), slice(max(0, int(sy0)), min(H, int(sy0) + n))
            cx, cy = min(W - 1, max(0, int(sx0 + n / 2))), min(H - 1, max(0, int(sy0 + n / 2)))   # ô lấn mép ảnh: lấy điểm gần nhất
            on_walk = 0 <= cx < W and 0 <= cy < H and walk[cy, cx]
            cover = (alpha[ys, xs] & ~air[ys, xs]).mean() if alpha[ys, xs].size else 0
            r += '.' if on_walk else ('#' if cover >= 0.15 else ' ')   # 15%: trụ/chân cờ phủ ít ô vẫn đặc
        rows.append(r)
    js = ('// SINH TỰ ĐỘNG bởi tools/build_be_phap_dai.py — đừng sửa tay. Bệ Tụ Linh Pháp Đài (sprites/tm_be*.png).\n'
          '// rows: lưới ô quanh tâm bản đồ, ô (x0 + i, y0 + j) tính theo ô từ tâm; "#" đặc, "." mặt sàn/bậc (đi được), " " ngoài bệ.\n'
          f'export const PLAZA = {json.dumps({"scale": SCALE, "anchor": list(ANCHOR), "banners": BANNERS, "x0": gx0, "y0": gy0, "rows": rows}, ensure_ascii=False, indent=1)};\n')
    (ROOT / 'src/data/sect_plaza.js').write_text(js, encoding='utf-8')
    print('lưới', gx1 - gx0, 'x', gy1 - gy0, 'ô; từ', (gx0, gy0)); print('\n'.join(rows))


if __name__ == '__main__':
    main()
