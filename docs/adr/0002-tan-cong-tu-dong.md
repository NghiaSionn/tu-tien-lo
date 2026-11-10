# ADR 0002 — Tấn công tự động / hybrid trong bí cảnh

Ngày: 2026-11-10. Trạng thái: thử nghiệm.

## Quyết định

- Trong bí cảnh, mọi công pháp tự thi triển theo hồi chiêu khi có mục tiêu hợp lệ. Người chơi chủ yếu di chuyển và chọn thẻ.
- Chọn mục tiêu: yêu thú gần nhất trong tầm; đạn và kiếm cần **tầm nhìn** (cây và đá chặn, nước không chặn). Lôi Kích đánh từ trời nên không cần tầm nhìn.
- Không có mục tiêu thì công pháp giữ trạng thái "sẵn sàng" chứ không bắn vào khoảng không.
- Space/J vẫn phóng kiếm khí thường (hồi chiêu 0,35 s) cả ở động phủ lẫn bí cảnh (`FEATURES.manualAttackInRun`). Ở động phủ không có công pháp tự động.
- Phím nhấn rất nhanh vẫn được tính ít nhất một khung (`src/core/input.js`), sửa lỗi v0.1 bỏ qua phím bấm nhanh.

## Kết quả thử cảm giác (chưa đủ)

Một lượt chơi thật 3 phút: tự đánh đủ để sống khi chỉ di chuyển nhặt chiến ý. Chưa có người chơi thật đánh giá. Cần thử thêm ở M2-04 xem có thiếu tương tác không; phương án dự phòng là thêm 1 chiêu chủ động có quyết định thời điểm.
