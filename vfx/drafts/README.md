# Draft beanfx dùng lại cho Tu Tiên Lộ

Các draft mẫu tu tiên của [beanfx](https://github.com/baenv/beanfx) (MIT, thư mục `drafts/` của repo) được vẽ quanh
một thân người cao ~80 px. Nhân vật game chỉ 25 px, nên **không phóng nhỏ ảnh** mà chép draft rồi nhân mọi kích thước
hình học với hệ số `K` và vẽ lại (nét vẫn 1 px).

| Draft ở đây | Gốc | K | Khung | Dùng cho |
|---|---|---|---|---|
| `loi_cuong_ho_the/` | `aura_thunder_v3` (commit `f0e354e`) | 0,36 | 96×96, lặp 2 s | Tiến hóa Lôi Cương Hộ Thể (chưa gắn vào game) |

Chạy (mỗi draft có `kit/` riêng của beanfx):

```bash
cd vfx/drafts/loi_cuong_ho_the
../../../.venv/Scripts/python -I loi_cuong_ho_the.py
```

Kết quả ở `out/medium/` (lớp sau, lớp trước, lớp sáng). Ảnh xem trước quanh nhân vật game:
`docs/beanfx_loi_cuong_thu_nho.png`.
