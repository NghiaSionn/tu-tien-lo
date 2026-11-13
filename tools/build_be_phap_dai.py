"""M8: bệ Tụ Linh Pháp Đài (ChatGPT vẽ: docs/concept/tong_mon_be_phap_dai_4loi_chatgpt.png -> sprite_clean --scale 1.6 --colors 96 -> sprites/tm_be.png).
Từ sprite + đa giác mặt sàn/bậc thang (đo tay trên sprite, toạ độ px sprite) sinh:
  - sprites/tm_be_front.png: chỉ phần KHÔNG phải mặt sàn/bậc (lan can, vách, cột cờ, đèn) — game cắt thành dải xếp theo y để che nhân vật đúng
  - src/data/sect_plaza.js: lưới ô đặc quanh tâm pháp đài (tâm bản đồ) cho va chạm
Độ thu 1.6 chọn để mặt sàn (góc nhìn 3/4, dẹt theo chiều dọc) đủ cho thiên kiếp (ARENA_R 96 px + lề) mà vẽ 1:1.
Dùng: .venv/Scripts/python.exe tools/build_be_phap_dai.py
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SCALE = 1
ANCHOR = (364, 283.5)          # tâm mặt sàn trong sprite (px sprite) = tâm bản đồ / tụ linh trận
FLOOR = [(314, 171), (418, 171), (525, 214), (546, 243), (546, 318), (429, 396), (304, 396), (182, 318), (182, 243), (204, 214)]
STAIRS = [(304, 394, 421, 590), (318, 110, 411, 176), (0, 250, 184, 309), (544, 250, 724, 309)]   # (x0, y0, x1, y1): bậc nam, lối bắc, cánh tây, cánh đông
AIR = [(128, 0, 215, 150), (518, 0, 593, 150)]   # vải cờ phía bắc: lơ lửng trên cao, không chặn đường đi phía sau
T = 16


def main():
    spr = Image.open(ROOT / 'sprites/tm_be.png').convert('RGBA'); W, H = spr.size
    walk = Image.new('L', (W, H), 0); d = ImageDraw.Draw(walk)
    d.polygon(FLOOR, fill=255)
    for r in STAIRS: d.rectangle(r, fill=255)
    walk = np.array(walk) > 0
    air = Image.new('L', (W, H), 0); da = ImageDraw.Draw(air)
    for r in AIR: da.rectangle(r, fill=255)
    air = np.array(air) > 0
    a = np.array(spr); alpha = a[..., 3] > 0
    front = a.copy(); front[walk] = 0
    Image.fromarray(front).save(ROOT / 'sprites/tm_be_front.png')
    # lưới ô (16 px game) quanh tâm: ô đặc nếu tâm ô không thuộc sàn/bậc và phần đục chiếm >= 35% ô
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
            r += '.' if on_walk else ('#' if cover >= 0.35 else ' ')
        rows.append(r)
    js = ('// SINH TỰ ĐỘNG bởi tools/build_be_phap_dai.py — đừng sửa tay. Bệ Tụ Linh Pháp Đài (sprites/tm_be*.png).\n'
          '// rows: lưới ô quanh tâm bản đồ, ô (x0 + i, y0 + j) tính theo ô từ tâm; "#" đặc, "." mặt sàn/bậc (đi được), " " ngoài bệ.\n'
          f'export const PLAZA = {json.dumps({"scale": SCALE, "anchor": list(ANCHOR), "x0": gx0, "y0": gy0, "rows": rows}, ensure_ascii=False, indent=1)};\n')
    (ROOT / 'src/data/sect_plaza.js').write_text(js, encoding='utf-8')
    print('lưới', gx1 - gx0, 'x', gy1 - gy0, 'ô; từ', (gx0, gy0)); print('\n'.join(rows))


if __name__ == '__main__':
    main()
