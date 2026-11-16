"""M9-B: vật trang trí 2 phòng boss (ChatGPT vẽ trên nền #FF00FF, lưới 4×3) -> sprites/pb_<bộ>.png + .json.
Chạy sprite_clean từng món với độ thu riêng để cao đúng HEIGHT[món] px (như tools/build_tong_mon.py).
    python tools/build_phong_boss.py [lang|yeu]
"""
import sys
from pathlib import Path
import build_tong_mon as B

ROOT = Path(__file__).resolve().parent.parent
B.SHEETS = {
    'pb_lang': ('docs/concept/phong_lang_vuong_chatgpt.png', 4, 3, 'art/phong_boss/lang.txt', 40),
    'pb_yeu': ('docs/concept/phong_yeu_vuong_chatgpt.png', 4, 3, 'art/phong_boss/yeu.txt', 40),
}
B.HEIGHT = {
    # hang Lang Vương (nhân vật cao ~25 px)
    'dau_lau_soi': 34, 'dong_xuong': 14, 'xuong_suon': 30, 'giao_gay': 34, 'da_cao': 34, 'totem_soi': 52,
    'ho_lua': 22, 'da_soi': 22, 'goc_cay_cao': 40, 'o_rom_soi': 22, 'co_rach': 48, 'da_xuong': 22,
    # đàn tế Yêu Vương
    'cot_phu_van': 68, 'cot_gay': 34, 'lu_lua_ma': 40, 'tuong_ma': 52, 'ban_te': 30, 'chan_nen': 38,
    'xich_sat': 20, 'dong_dau_lau': 24, 'tinh_the_ma': 34, 'phuon_den': 56, 'da_ri_khi': 22, 'bia_phu_van': 44,
}
only = sys.argv[1:]
if only: B.SHEETS = {k: v for k, v in B.SHEETS.items() if k.split('_')[1] in only}
B.main()
