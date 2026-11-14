"""M8: tô lại bát giác giữa mặt sàn bệ pháp đài cho liền với vòng đá ngoài (bản ChatGPT để giữa nhạt, kẻ ô sáng -> trông như tấm kính
tách rời, người phát triển góp ý 14/11). Chạy SAU sprite_clean và TRƯỚC tools/build_be_phap_dai.py; ghi đè sprites/tm_be.png.
Cách làm: trên CẢ mặt sàn (loang như build_be_phap_dai; vòng ngoài cũng kẻ sáng) — lấy số liệu màu từ vòng ngoài, (đo tay, px sprite --scale 2.85): đường kẻ sáng -> màu mạch đá tối của vòng ngoài; phần còn lại
chuyển màu (trung bình/độ lệch từng kênh) theo mặt đá vòng ngoài.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
INNER = [(132, 136), (275, 136), (296, 152), (296, 190), (275, 200), (132, 200), (111, 190), (111, 152)]
RING = [(150, 104), (257, 104), (312, 128), (318, 165), (300, 212), (260, 226), (148, 226), (106, 212), (90, 165), (96, 128)]


def poly(W, H, p):
    im = Image.new('L', (W, H), 0); ImageDraw.Draw(im).polygon(p, fill=255); return np.array(im) > 0


def main():
    path = ROOT / 'sprites/tm_be.png'
    im = Image.open(path).convert('RGBA'); a = np.array(im).astype(float); H, W = a.shape[:2]
    rgb = a[..., :3]; lum = rgb @ [0.3, 0.59, 0.11]
    import sys; sys.path.insert(0, str(ROOT / 'tools')); from build_be_phap_dai import flood, morph, LUM_MIN, OPEN_R
    alpha = a[..., 3] > 0; seed = (W // 2, int(H * 0.53))
    raw = flood(alpha & (lum > LUM_MIN), seed)
    floor = morph(flood(morph(raw, OPEN_R, 'erode'), seed), OPEN_R, 'dilate') & raw
    inner = morph(floor, 2, 'erode') & (np.arange(H)[:, None] < 232)   # cả mặt sàn (trừ mép sát lan can, trừ bậc nam)
    ring = poly(W, H, RING) & ~poly(W, H, INNER) & alpha
    med = np.array(Image.fromarray(lum.astype(np.uint8)).filter(ImageFilter.MedianFilter(5))).astype(float)
    r_seam = ring & (lum < med - 22); r_face = ring & ~r_seam
    seam_col = np.median(rgb[r_seam], 0)
    i_seam = inner & (lum > med + 10); i_face = inner & ~i_seam
    mu_i, sd_i = rgb[i_face].mean(0), rgb[i_face].std(0) + 1e-3
    mu_r, sd_r = rgb[r_face].mean(0), rgb[r_face].std(0)
    out = rgb.copy()
    out[i_face] = (rgb[i_face] - mu_i) / sd_i * sd_r + mu_r
    out[i_seam] = seam_col
    # không để mặt đá tối hơn ngưỡng loang mặt sàn (build_be_phap_dai LUM_MIN) -> vết tối sẽ đục lỗ vùng đi được
    l2 = out @ [0.3, 0.59, 0.11]; low = inner & (l2 < 95); out[low] += (95 - l2[low])[:, None]
    a[..., :3] = np.clip(out, 0, 255)
    Image.fromarray(a.astype(np.uint8)).save(path)
    print('mạch', int(i_seam.sum()), 'mặt', int(i_face.sum()), 'màu mạch', seam_col.round())


if __name__ == '__main__':
    main()
