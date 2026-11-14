"""M8: bệ Tụ Linh Pháp Đài (ChatGPT vẽ: docs/concept/tong_mon_be_phap_dai_4loi_chatgpt.png
     -> tools/sprite_clean.py --scale 2.85 --colors 96 --tol 60 -> sprites/tm_be.png).
Sinh từ sprite:
  - (trước đó tools/fix_be_san.py tô lại mặt sàn cho liền)
  - xoá điểm ám magenta còn sót (viền + khe lan can) ngay trên sprites/tm_be.png
  - mặt sàn: LOANG từ tâm qua điểm ảnh sáng (dừng ở viền tối), cắt nhánh mảnh lan lên lan can/trụ bằng phép mở hình thái học
    + bậc nam, lối bắc, 2 cánh đông/tây khoanh tay (đo trên sprite 1.9, trong khe giữa má bậc/trụ)
  - va chạm MỊN 4 px: vật nằm PHÍA BẮC mặt sàn (lan can bắc, trụ, bệ cờ, lan can trên cánh) chỉ đặc ở chân (FOOT px cuối mỗi dải đục
    theo cột) -> đứng sau được và bị che; vật PHÍA NAM (vách, lan can nam, đèn, trụ dưới cánh) đặc cả khối; vải cờ bắc trên không
  - sprites/tm_be_front.png: phần không phải sàn/bậc (lớp che, game xếp theo chân cột)
  - src/data/sect_plaza.js: lưới ô 16 px (cho test / BFS) + lưới mịn 4 px (cho di chuyển) + vị trí 4 cây cờ
Độ thu 2.85 (= 1.9 × 1.5, người phát triển chọn 14/11): mặt sàn nhỏ hơn vòng thiên kiếp mặc định -> ở sảnh tông môn dùng
TRIBULATION.SECT_ARENA_R (config) vừa mặt sàn; test sect_map kiểm vòng đó đứng được.
Dùng: .venv/Scripts/python.exe tools/build_be_phap_dai.py
"""
import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
LUM_MIN, OPEN_R = 80, 3         # loang: điểm sáng hơn LUM_MIN; mở hình thái bán kính OPEN_R
K = 1.9 / 2.85                  # số đo tay dưới đây làm trên bản 1.9; nhân K cho bản 2.85
k1 = lambda v: tuple(round(c * K, 1) for c in v)
MIRROR = 609 * K                # trục đối xứng x' = MIRROR - x
# vùng đi được khoanh tay: bậc nam, lối bắc, cánh tây (chiếu nghỉ + dải bậc xuống, chừa trụ khắc chữ)
RECTS = [k1(r) for r in [(260, 335, 350, 473), (270, 96, 336, 150)]]
WING_W = [k1(p) for p in [(165, 216), (58, 216), (6, 262), (6, 300), (42, 300), (42, 262), (72, 262), (72, 281), (165, 281)]]   # nối vào sàn dưới vải cờ nam
WING_E = [(MIRROR - x, y) for x, y in WING_W]
F = 1.6 / 2.85                  # các khung dưới đo trên bản 1.6
sc = lambda v: tuple(round(c * F, 1) for c in v)
AIR = [sc(r) for r in [(128, 0, 215, 150), (518, 0, 593, 150)]]            # vải cờ phía bắc: trên không, không chặn
KEEP = [sc(r) for r in [(112, 268, 198, 410), (540, 268, 626, 410)]]       # cờ phía nam treo trên cánh: giữ ở lớp che
BANNERS = [sc(b) for b in [(124, 0, 219, 190, 190), (514, 0, 597, 190, 190), (112, 268, 198, 472, 472), (540, 268, 626, 472, 472)]]
FLOOR_BOTTOM = 341 * K        # mép nam mặt sàn (chỗ bắt đầu bậc nam)
PILLARS = [k1(r) for r in [(38, 250, 76, 335)]]   # trụ khắc chữ đầu cánh tây (đối xứng sang đông) — nguồn che duy nhất cần tránh
PILLARS += [(MIRROR - r[2], r[1], MIRROR - r[0], r[3]) for r in PILLARS]
OCC = (3, 14)                   # thân nhân vật quanh chân: ±5 px ngang, 22 px lên — chỗ ngoài mặt sàn mà lớp che đè lên thân thì cấm đứng
GROW = 6                        # nới vùng đặc ra ngoài (không lấn mặt sàn): nhân vật không áp sát trụ/đèn/vách -> bớt bị lớp che đè
PAD = 8                         # lưới mịn rộng hơn sprite PAD px mỗi phía để phần nới ở mép ảnh không bị cụt
FOOT = 10                       # px chân đặc của vật phía bắc
T, C = 16, 4                    # ô bản đồ, ô mịn


def drop_magenta(a):
    r, g, b = [a[..., i].astype(int) for i in range(3)]
    m = (r - g > 45) & (b - g > 45) & (np.abs(r - b) < 90)
    a[m, 3] = 0
    return int(m.sum())


def mask(W, H, polys=(), rects=()):
    im = Image.new('L', (W, H), 0); d = ImageDraw.Draw(im)
    for p in polys: d.polygon(p, fill=255)
    for r in rects: d.rectangle(r, fill=255)
    return np.array(im) > 0


def flood(ok, seed):
    H, W = ok.shape; out = np.zeros_like(ok); q = deque([seed]); out[seed[1], seed[0]] = True
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < W and 0 <= ny < H and ok[ny, nx] and not out[ny, nx]: out[ny, nx] = True; q.append((nx, ny))
    return out


def morph(m, r, op):
    f = ImageFilter.MinFilter(2 * r + 1) if op == 'erode' else ImageFilter.MaxFilter(2 * r + 1)
    return np.array(Image.fromarray((m * 255).astype(np.uint8)).filter(f)) > 127


def main():
    path = ROOT / 'sprites/tm_be.png'
    a = np.array(Image.open(path).convert('RGBA')); print('xoá điểm magenta:', drop_magenta(a)); Image.fromarray(a).save(path)
    H, W = a.shape[:2]; alpha = a[..., 3] > 0
    lum = 0.3 * a[..., 0] + 0.59 * a[..., 1] + 0.11 * a[..., 2]
    seed = (W // 2, int(H * 0.53))
    raw = flood(alpha & (lum > LUM_MIN), seed)
    er = morph(raw, OPEN_R, 'erode'); ey, ex = np.where(er)
    k = np.argmin((ex - seed[0]) ** 2 + (ey - seed[1]) ** 2); seed = (int(ex[k]), int(ey[k]))   # hạt giống gần tâm còn sau phép co
    floor = morph(flood(er, seed), OPEN_R, 'dilate') & raw
    walk = floor | mask(W, H, [WING_W, WING_E], RECTS)
    ys, xs = np.where(floor & ~mask(W, H, rects=RECTS))   # tâm mặt sàn (bỏ bậc dính vào vùng loang) = tâm tụ linh trận
    ax, ay = float(MIRROR + 1) / 2, (ys.min() + FLOOR_BOTTOM) / 2   # đáy sàn đo tay (vùng loang dính mặt má bậc nên không dùng max)
    air = mask(W, H, rects=AIR)
    # cờ phía nam: chỉ giữ ĐIỂM ẢNH CỜ (vải kem/vàng, cán vàng, hoa văn xanh, ngọc + viền tối sát chúng), không lấy cả khung
    # (khung chữ nhật cũ ôm cả sàn đá cánh -> sàn đè lên nhân vật như cùng lớp với cờ)
    r_, g_, b_ = [a[..., i].astype(int) for i in range(3)]
    inK = mask(W, H, rects=KEEP)
    tint = alpha & ((r_ - b_ > 18) | ((b_ - r_ > 35) & (b_ > 110))) & inK
    # cờ = màu cờ + viền tối sát màu cờ (nối núm tròn/ngọc vào thân cờ); giữ các mảng liền >= 30 px -> bỏ vụn rêu/vệt vàng trên sàn
    cand = tint | (morph(tint, 2, 'dilate') & alpha & (lum < 90) & inK)
    keep = np.zeros_like(cand); seen = np.zeros_like(cand)
    for y0, x0 in zip(*np.where(cand)):
        if seen[y0, x0]: continue
        comp = flood(cand & ~seen, (x0, y0)); seen |= comp
        if comp.sum() >= 30: keep |= comp
    front = a.copy(); front[walk & ~keep] = 0
    Image.fromarray(front).save(ROOT / 'sprites/tm_be_front.png')
    # đặc từng điểm ảnh: phía nam đỉnh vùng đi được của cột -> đặc cả khối; phía bắc -> chỉ FOOT px cuối của dải đục
    solid = np.zeros((H, W), bool); south = np.zeros((H, W), bool); body = alpha & ~walk & ~air
    for x in range(W):
        wy = np.where(walk[:, x])[0]; top = wy.min() if wy.size else H
        run_end = -1
        for y in range(H - 1, -1, -1):
            if not body[y, x]: run_end = -1; continue
            if run_end < 0: run_end = y
            south[y, x] = y > top
            solid[y, x] = y > top or y > run_end - FOOT
    # nới vùng đặc GROW px ra ngoài (trên khung đệm PAD), không phủ mặt sàn loang (giữ chỗ né thiên kiếp)
    # chỉ nới quanh khối PHÍA NAM (vách, đèn, má bậc, trụ dưới cánh, bệ cờ nam); chân lan can bắc giữ nguyên (đứng sau thì bị che là đúng)
    sp = np.zeros((H + 2 * PAD, W + 2 * PAD), bool); sp[PAD:PAD + H, PAD:PAD + W] = solid
    ss = np.zeros_like(sp); ss[PAD:PAD + H, PAD:PAD + W] = south
    fl = np.zeros_like(sp); fl[PAD:PAD + H, PAD:PAD + W] = walk   # không nới vào sàn/bậc/cánh (bệ nhỏ: cánh chỉ còn ~2 thân người)
    solidP = sp | (morph(ss, GROW, 'dilate') & ~fl)
    # cấm đứng ngoài mặt sàn ở chỗ lớp che (trụ khắc chữ đầu cánh, đèn, má bậc) đè lên thân nhân vật: điểm ảnh lớp trước q có chân cột
    # key(q) nằm DƯỚI chân nhân vật mà q rơi vào thân (±OCC[0] ngang, OCC[1] lên) -> chân đó cấm. Cờ không tính (vải treo, che là đúng)
    fa = front[..., 3] > 0; key = np.full((H, W), -1)
    for x in range(W):
        bot = -1
        for y in range(H - 1, -1, -1):
            if fa[y, x]:
                if bot < 0: bot = y
                key[y, x] = bot
            else: bot = -1
    occ = np.zeros_like(sp); ox_, oy_ = OCC
    # chỉ xét trụ khắc chữ: lan can/má bậc dốc của cánh có chân cột thấp nhưng nằm phía sau người -> xét chúng sẽ bịt lối xuống cánh
    for y, x in zip(*np.where(fa & ~keep & ~air & mask(W, H, rects=PILLARS))):
        y1 = min(y + oy_, key[y, x] - 2)
        if y1 >= y: occ[PAD + y:PAD + y1 + 1, PAD + max(0, x - ox_):PAD + x + ox_ + 1] = True
    solidP |= occ & ~fl
    solid = solidP[PAD:PAD + H, PAD:PAD + W]
    # lưới mịn C px tính từ góc sprite lùi PAD + lưới ô 16 px quanh tâm (cho test)
    HP, WP = solidP.shape; fw, fh = (WP + C - 1) // C, (HP + C - 1) // C
    fine = []
    for j in range(fh):
        fine.append(''.join('#' if solidP[j * C:(j + 1) * C, i * C:(i + 1) * C].mean() >= 0.3 else '.' for i in range(fw)))
    gx0, gy0 = int(np.floor(-ax / T)), int(np.floor(-ay / T)); gx1, gy1 = int(np.ceil((W - ax) / T)), int(np.ceil((H - ay) / T))
    rows = []
    for ty in range(gy0, gy1):
        r = ''
        for tx in range(gx0, gx1):
            x0, y0 = int(round(ax + tx * T)), int(round(ay + ty * T))
            xs_, ys_ = slice(max(0, x0), min(W, x0 + T)), slice(max(0, y0), min(H, y0 + T))
            cx, cy = min(W - 1, max(0, x0 + T // 2)), min(H - 1, max(0, y0 + T // 2))
            sf = solid[ys_, xs_].mean() if solid[ys_, xs_].size else 0
            r += '.' if walk[cy, cx] and sf < 0.5 else ('#' if sf >= 0.25 else ' ')
        rows.append(r)
    data = {'scale': 1, 'anchor': [ax, ay], 'banners': BANNERS, 'x0': gx0, 'y0': gy0, 'rows': rows, 'cell': C, 'pad': PAD, 'fine': fine}
    js = ('// SINH TỰ ĐỘNG bởi tools/build_be_phap_dai.py — đừng sửa tay. Bệ Tụ Linh Pháp Đài (sprites/tm_be*.png).\n'
          '// anchor: tâm mặt sàn trong sprite (= tâm bản đồ). rows: lưới ô 16 px quanh tâm, ô (x0 + i, y0 + j); "#" đặc, "." sàn/bậc, " " ngoài.\n'
          '// fine: lưới mịn `cell` px tính từ góc trên-trái sprite lùi `pad` px (sprite đặt tại tâm bản đồ - anchor, làm tròn) — "#" đặc; dùng cho di chuyển.\n'
          f'export const PLAZA = {json.dumps(data, ensure_ascii=False)};\n')
    (ROOT / 'src/data/sect_plaza.js').write_text(js, encoding='utf-8')
    print('sprite', W, 'x', H, 'tâm', (ax, ay), 'sàn y', ys.min(), ys.max(), 'nửa sàn dọc', (ys.max() + 1 - ys.min()) / 2, 'ngang', (xs.max() + 1 - xs.min()) / 2)
    print('\n'.join(rows))
    # ảnh kiểm tra: xanh = đi được, đỏ = đặc
    ov = a.copy(); ov[walk & ~solid, 1] = 255; ov[solid, 0] = 255
    bg = Image.new('RGBA', (W, H), (20, 20, 40, 255)); bg.alpha_composite(Image.fromarray(ov))
    bg.resize((W * 2, H * 2), Image.NEAREST).save(ROOT / 'docs/playtest/M8_be_va_cham.png')


if __name__ == '__main__':
    main()
