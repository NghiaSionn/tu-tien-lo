"""(17/11) Xoá viền tím/hồng sẫm còn sót từ nền #FF00FF quanh sprite (ChatGPT vẽ trên magenta).
Điểm ảnh magenta (r ≈ b, g thấp hơn hẳn): sát mép trong suốt -> xoá; nằm trong -> lấy màu trung bình các điểm không magenta quanh nó.
Cánh hoa đào hồng (r >> b) không bị đụng. Dùng: python tools/clean_magenta.py sprites/tm_cay_da.png [...]"""
import sys
import numpy as np
from PIL import Image


def is_mag(a):
    r, g, b, al = (a[..., i].astype(int) for i in range(4))
    return (al > 0) & (abs(r - b) < 40) & (g < np.minimum(r, b) - 35) & (np.maximum(r, b) > 70)


def clean(path):
    a = np.array(Image.open(path).convert('RGBA'))
    for _ in range(3):
        m = is_mag(a)
        if not m.any(): break
        al = a[..., 3] > 0
        H, W = m.shape
        edge = np.zeros_like(m)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sh = np.zeros_like(al); sh[max(dy, 0):H + min(dy, 0), max(dx, 0):W + min(dx, 0)] = al[max(-dy, 0):H + min(-dy, 0), max(-dx, 0):W + min(-dx, 0)]
            edge |= ~sh
        edge &= m
        a[edge, 3] = 0
        for y, x in zip(*np.where(m & ~edge)):
            nb = a[max(0, y - 1):y + 2, max(0, x - 1):x + 2].reshape(-1, 4)
            ok = nb[(nb[:, 3] > 0) & ~is_mag(nb[None])[0]]
            if len(ok): a[y, x, :3] = ok[:, :3].mean(0)
            else: a[y, x, 3] = 0
    left = is_mag(a).sum()
    Image.fromarray(a).save(path)
    print(path, 'còn', left)


for p in sys.argv[1:]: clean(p)
