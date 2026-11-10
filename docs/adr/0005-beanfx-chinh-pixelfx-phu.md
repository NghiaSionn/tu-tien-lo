# ADR 0005 — beanfx là công cụ VFX chính, pixelfx chỉ hỗ trợ

Ngày: 2026-11-11. Trạng thái: đã chốt với người chơi.

## Bối cảnh

VFX Hỏa Long Quyển làm bằng quy trình pixelfx (ADR 0004) đẹp nhưng "không đúng concept": người chơi muốn **beanfx làm
chính**, vì beanfx đã có sẵn bộ skill tu tiên (Phật Nộ Hỏa Liên, Vạn Kiếm Quy Tông, Lôi aura, Lốc gió, Băng vũ…).

## Kiểm tra bộ skill tu tiên có sẵn của beanfx

- 20 draft trong `drafts/` của repo beanfx chạy được bằng `.venv` của dự án (numpy + pillow).
- Đặt cạnh nhân vật game ở tỉ lệ 1x (`docs/beanfx_mau_trong_game.png`):
  - Draft vẽ quanh thân người ~80 px; nhân vật game 25 px nên aura/vòng chân **to gấp ~3 lần**.
  - Nhiều draft (Phật Nộ Hỏa Liên, Vạn Kiếm Quy Tông, Phi Long Tại Thiên…) **vẽ sẵn người thi triển** màu vàng,
    trùng với nhân vật game.
  - Các chiêu "cỡ màn hình" (Phật Nộ Hỏa Liên 240×240) thì vừa màn 480×270, hợp làm tuyệt kỹ.
- **Dùng lại được** theo đúng cách beanfx gọi là "reuse an earlier draft": chép draft, nhân kích thước hình học với
  `K`, vẽ lại (không phóng nhỏ ảnh). Thử với Lôi aura → `vfx/drafts/loi_cuong_ho_the/` (K = 0,36): ôm vừa nhân vật,
  đọc ra ngay Lôi Cương Hộ Thể (`docs/beanfx_loi_cuong_thu_nho.png`). Chưa gắn vào game.

## Quyết định

1. **beanfx là công cụ chính** cho VFX công pháp/tiến hóa/độ kiếp:
   - Ưu tiên dùng lại draft có sẵn khi gần ý (đổi `K`, bỏ người thi triển vẽ sẵn, đổi bảng màu).
   - Không có draft gần thì vẽ mới bằng skill `/beanfx` với brief: tên chiêu, mô tả, góc nhìn 3/4 top-down,
     kích thước theo nhân vật 25 px, người thi triển = nhân vật game (beanfx `rig.py`), ảnh tham khảo.
2. **pixelfx chỉ hỗ trợ**: hiệu ứng chung không phải chiêu thức (cổng, sau này: poof, loot-beam, thời tiết) và làm
   **tài liệu tham khảo kỹ thuật** (beanfx chính nó cũng cho phép reuse từ pixelfx khi được yêu cầu).
3. Hỏa Long Quyển (pixelfx) giữ tạm trong game tới khi có bản beanfx; ứng viên gốc: `loc_gio_v2` (lốc gió) đổi
   bảng màu lửa + phần lưỡi lửa.

## Để vẽ được skill "y như vậy" ở cỡ game

- Cài plugin beanfx trong Claude Code: `/plugin marketplace add baenv/beanfx` rồi `/plugin install beanfx@beanfx`,
  sau đó `/beanfx <mô tả | ảnh>`.
- Xuất nhân vật game thành sprite sheet + `casters/<ten>/rig.json` để beanfx vẽ chiêu quanh đúng nhân vật
  (chưa làm).
- Mỗi chiêu cần một brief ngắn: tên, cảm giác, màu, thời lượng, một hoặc vài ảnh/clip tham khảo.
