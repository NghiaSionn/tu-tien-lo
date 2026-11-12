# Draft beanfx của Tu Tiên Lộ

VFX công pháp vẽ bằng bộ kit [beanfx](https://github.com/baenv/beanfx) (MIT). Mỗi draft có `kit/` riêng (chép từ skill
beanfx 0.3.0, không tự cập nhật). Draft mẫu tu tiên của beanfx vẽ quanh thân người ~80 px; nhân vật game chỉ 25 px, nên
khi dùng lại **không phóng nhỏ ảnh** mà nhân mọi kích thước hình học với `K` và vẽ lại (nét vẫn 1 px).

| Draft | Gốc | Khung | Trong game | Ảnh |
|---|---|---|---|---|
| `loi_cuong_ho_the/` | `aura_thunder_v3`, K 0,36 | 96×96, lặp 2 s, lớp sau + trước | Khiên Lôi Cương Hộ Thể (`fx/loi_cuong_*`, qua `tools/strip_to_beanfx.py`) | `docs/beanfx_loi_cuong_thu_nho.png` |
| `loi_vuc/` | vẽ mới | 128×96, 16 khung @30, một lần | Xung Lôi Vực (`fx/loi_vuc`, scale = bán kính / 46) | `docs/m5_03_loi_vuc.png` |
| `hoa_cau/` | vẽ mới | bay 32×32 × 8 hướng × 8 @24 lặp; nổ 48×48 × 8 @24 | Đạn + nổ Hỏa Cầu (`fx/hoa_cau_bay`, `fx/hoa_cau_no`, scale nổ = bán kính / 16) | `docs/m5_03_hoa_cau_*.png` |
| `phong_nhan/` | vẽ mới | 32×32 × 8 hướng × 6 @24 lặp | Lưỡi gió Phong Nhận (`fx/phong_nhan`) | `docs/m5_03_phong_nhan.png` |
| `hoa_long_quyen/` | `loc_gio_v2`, K 0,36, đổi màu lửa, lặp tại chỗ | 48×56, 24 khung @24 lặp | Cột lốc Hỏa Long Quyển (`fx/hoa_long_quyen_v2`, thay bản pixelfx) | `docs/m5_03_hoa_long_quyen.png` |

Chạy một draft (Windows cần `PYTHONUTF8=1` vì kit đọc file nguồn có tiếng Việt):

```bash
cd vfx/drafts/hoa_cau
PYTHONUTF8=1 ../../../.venv/Scripts/python hoa_cau.py
cp out/sheets/*.json out/sheets/*.png ../../../fx/
```

Mỗi lần chạy in số đo ánh sáng (cover, mean — mức vừa 0,06–0,10) và các kiểm tra của beanfx (màu/sáng chạm mép, khung
rỗng, đuôi một lần không tắt phụt, vòng lặp không giật, ngẫu nhiên có seed); thoát 1 nếu có lỗi. `out/` không vào git.
`tests/fx.test.js` kiểm tra sheet trong `fx/` đọc được bằng `lib/beanfx.js`.
