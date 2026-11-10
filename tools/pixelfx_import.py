"""Nhập sprite sheet đã xuất từ pixelfx (https://github.com/patch-gg/pixelfx, MIT) vào fx/pixelfx/.

Sheet được xuất bằng công cụ của pixelfx (chạy trong bản clone của repo đó):

    node tools/render.mjs pickups/xp-orb --sheet --out <thư mục>
    node tools/render.mjs pickups/xp-orb --sheet --out <thư mục> --opts '{"palette":[...]}'
    node tools/render.mjs arcane/portal --sheet --out <thư mục>

rồi chạy:

    .venv/Scripts/python tools/pixelfx_import.py <ten> <duong/dan/sheet.json> [--xp-orb]

--xp-orb: viên chiến ý gốc bay theo hình số 8 quanh tâm (lệch tới ±25 px). Game cần đầu viên nằm đúng chỗ
viên chiến ý, nên mỗi khung được cắt một ô 32×32 lấy đầu viên làm tâm. Vị trí đầu viên tính đúng theo công thức
`at(t)` trong src/fx/pickups/xp-orb.js của pixelfx.
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "fx" / "pixelfx"
CROP = 32
MIN_ALPHA = 10   # alpha nhỏ hơn mức này coi như trong suốt
FLOOR = 5   # số px phía trên mặt sàn (pivot) bị xóa ở bản xp-orb


def xp_orb_head(t, duration=1.8):
    a = t / duration * math.tau
    return 16 * math.sin(a), -20 + 9 * math.sin(a) * math.cos(a) - 1.2 * math.cos(a * 2)


def unpremultiply(img):
    """Ánh sáng trong sheet pixelfx lưu kiểu đã nhân alpha (rgb nhỏ, alpha nhỏ) nên vẽ thường sẽ làm TỐI nền.
    Chia rgb cho alpha để phần quầng sáng thành màu sáng, trong suốt nhẹ."""
    a = np.asarray(img).astype(np.float32)
    al = a[..., 3:4]
    al = np.where(al < MIN_ALPHA, 0, al)               # bỏ lớp sáng gần như vô hình (thành khung mờ hình chữ nhật)
    semi = (al > 0) & (al < 255)
    rgb = np.where(semi, np.clip(a[..., :3] * 255.0 / np.maximum(al, 1), 0, 255), a[..., :3])
    return Image.fromarray(np.concatenate([rgb, al], -1).round().astype(np.uint8), "RGBA")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    orb = "--xp-orb" in sys.argv
    if len(args) != 2:
        print(__doc__)
        sys.exit(1)
    name, src = args[0], Path(args[1])
    js = json.loads(src.read_text(encoding="utf-8"))
    meta = js["meta"]["pixelfx"]
    sheet = unpremultiply(Image.open(src.with_name(js["meta"]["image"])).convert("RGBA"))
    OUT.mkdir(parents=True, exist_ok=True)

    if not orb:
        sheet.save(OUT / f"{name}.png")
        js["meta"]["image"] = f"{name}.png"
        (OUT / f"{name}.json").write_text(json.dumps(js, indent=1), encoding="utf-8")
        print(f"{name}: {meta['frames']} khung {meta['frameSize']} (giữ nguyên, khử nhân alpha)")
        return

    ox, oy = meta["pivot"]
    frames = js["frames"]
    cols = math.ceil(math.sqrt(len(frames)))
    rows = math.ceil(len(frames) / cols)
    out = Image.new("RGBA", (cols * CROP, rows * CROP))
    entries = []
    for i, f in enumerate(frames):
        r = f["frame"]
        cell = sheet.crop((r["x"], r["y"], r["x"] + r["w"], r["y"] + r["h"]))
        floor = np.asarray(cell).copy()
        floor[oy - FLOOR:, :, 3] = 0                     # bỏ bóng và vệt sáng trên sàn dưới viên
        cell = Image.fromarray(floor, "RGBA")
        hx, hy = xp_orb_head(i / meta["fps"])
        x0, y0 = round(ox + hx) - CROP // 2, round(oy + hy) - CROP // 2
        piece = cell.crop((x0, y0, x0 + CROP, y0 + CROP))
        cx, cy = (i % cols) * CROP, (i // cols) * CROP
        out.paste(piece, (cx, cy))
        entries.append({**f, "filename": f"{name} {i}", "frame": {"x": cx, "y": cy, "w": CROP, "h": CROP},
                        "spriteSourceSize": {"x": 0, "y": 0, "w": CROP, "h": CROP}, "sourceSize": {"w": CROP, "h": CROP}})
    out.save(OUT / f"{name}.png")
    js["frames"] = entries
    js["meta"]["image"] = f"{name}.png"
    js["meta"]["size"] = {"w": cols * CROP, "h": rows * CROP}
    js["meta"]["pixelfx"] = {**meta, "frameSize": [CROP, CROP], "pivot": [CROP // 2, CROP // 2], "columns": cols,
                             "derived": "cắt theo đầu viên (tools/pixelfx_import.py --xp-orb)"}
    (OUT / f"{name}.json").write_text(json.dumps(js, indent=1), encoding="utf-8")
    print(f"{name}: {len(frames)} khung {CROP}x{CROP} (cắt theo đầu viên)")


if __name__ == "__main__":
    main()
