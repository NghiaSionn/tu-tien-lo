"""M8: dựng sprite tông môn từ 3 sheet ChatGPT (docs/concept/tong_mon_*_chatgpt.png), MỖI MÓN một cỡ đích riêng.
sprite_clean.py chỉ có một độ thu cho cả sheet; ở đây chạy từng món với --scale = cỡ để cao đúng HEIGHT[món] px,
rồi gộp lại thành sprites/tm_cong_trinh|tm_do_vat|tm_cay_da (.png + .json, mỗi món một ô; game cắt sát khi nạp).
Dùng: .venv/Scripts/python.exe tools/build_tong_mon.py
"""
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PY = sys.executable
SHEETS = {
    'tm_cong_trinh': ('docs/concept/tong_mon_cong_trinh_chatgpt.png', 3, 2, 'art/tong_mon/cong_trinh.txt', 64),
    'tm_do_vat': ('docs/concept/tong_mon_do_vat_chatgpt.png', 4, 3, 'art/tong_mon/do_vat.txt', 48),
    'tm_cay_da': ('docs/concept/tong_mon_cay_da_chatgpt.png', 4, 3, 'art/tong_mon/cay_da.txt', 48),
}
# chiều cao đích trong game (px). Nhân vật cao ~25 px; công trình ~90–125 px như concept
HEIGHT = {
    'truyen_thua': 122, 'tang_kinh': 94, 'cong_duc': 88, 'luyen_khi': 104, 'dan_duoc': 98, 'luyen_vo': 80,
    'den_da': 30, 'co_phuon': 42, 'lan_can': 20, 'bac_thang': 28, 'cau_da': 38, 'hang_rao': 20, 'cong_rao': 40,
    'moc_nhan': 28, 'gia_binh_khi': 30, 'bia_lon': 44, 'bia_nho': 30, 'thac_nuoc': 52,
    'anh_dao_lon': 84, 'anh_dao_nho': 56, 'tung_bonsai': 64, 'tung_cao': 84, 'cay_tron': 66, 'tre': 56,
    'bui_cay': 26, 'khom_hoa': 18, 'da_lon': 36, 'da_nho': 20, 'vach_da': 52, 'sen': 22,
}
BASE_SCALE = 4.0   # lần làm sạch đầu (--scale 4) cho ra chiều cao H4 -> scale mới = 4 * H4 / HEIGHT


def run_clean(src, cols, rows, names_grid, out, scale, colors):
    with tempfile.NamedTemporaryFile('w', suffix='.txt', delete=False, encoding='utf-8') as f:
        f.write('\n'.join(' '.join(r) for r in names_grid)); nf = f.name
    env = dict(os.environ, PYTHONIOENCODING='utf-8')
    subprocess.run([PY, str(ROOT / 'tools/sprite_clean.py'), str(ROOT / src), '--cols', str(cols), '--rows', str(rows), '--names', nf,
                    '--out', out, '--scale', f'{scale:.3f}', '--colors', str(colors), '--tol', '60'], check=True, env=env, capture_output=True)
    os.unlink(nf)


def frame_of(out, name):
    meta = json.loads(Path(out + '.json').read_text(encoding='utf-8'))
    im = Image.open(out + '.png').convert('RGBA'); fw, fh = meta['frameSize']; x, y = meta['frames'][name]
    fr = im.crop((x, y, x + fw, y + fh)); bb = fr.getbbox()
    return fr.crop(bb) if bb else fr


def main():
    tmp = Path(tempfile.mkdtemp())
    for sheet, (src, cols, rows, names_file, colors) in SHEETS.items():
        grid = [l.split() for l in (ROOT / names_file).read_text(encoding='utf-8').splitlines() if l.strip()]
        names = [n for r in grid for n in r if n != '-']
        # lần 1: độ thu chuẩn để đo chiều cao
        run_clean(src, cols, rows, grid, str(tmp / (sheet + '_base')), BASE_SCALE, colors)
        parts = {}
        for n in names:
            h4 = frame_of(str(tmp / (sheet + '_base')), n).height
            sc = BASE_SCALE * h4 / HEIGHT[n]
            mask = [[c if c == n else '-' for c in r] for r in grid]
            out = str(tmp / f'{sheet}_{n}')
            run_clean(src, cols, rows, mask, out, sc, colors)
            parts[n] = frame_of(out, n)
            print(f'{sheet}:{n:14s} {parts[n].width:3d}x{parts[n].height:3d}  (scale {sc:.2f})')
        fw = max(p.width for p in parts.values()); fh = max(p.height for p in parts.values())
        sheet_im = Image.new('RGBA', (fw * len(parts), fh), (0, 0, 0, 0)); frames = {}
        for i, (n, p) in enumerate(parts.items()):
            sheet_im.alpha_composite(p, (i * fw + (fw - p.width) // 2, fh - p.height)); frames[n] = [i * fw, 0]
        sheet_im.save(ROOT / 'sprites' / f'{sheet}.png')
        (ROOT / 'sprites' / f'{sheet}.json').write_text(json.dumps({'frameSize': [fw, fh], 'pivot': [fw // 2, fh - 1], 'image': f'{sheet}.png',
            'source': src, 'tool': 'tools/build_tong_mon.py (sprite_clean từng món)', 'frames': frames}, ensure_ascii=False, indent=1), encoding='utf-8')


if __name__ == '__main__':
    main()
