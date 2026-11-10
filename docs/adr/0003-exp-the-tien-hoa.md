# ADR 0003 — EXP trong run, bốc thẻ và tiến hóa

Ngày: 2026-11-10. Trạng thái: thử nghiệm (số liệu trong `src/core/config.js`, `src/data/skills.js`, `src/progression/draft.js`).

## EXP

- Yêu thú chết rơi viên chiến ý; người chơi lại gần thì viên bay về (tầm hút 56 px), chạm thì nhặt.
- `addRunXp` cộng EXP và mỗi cấp tăng `pendingDrafts` thêm 1, trong một vòng lặp có giới hạn. Nhảy nhiều cấp cùng lúc = xếp hàng đủ số lượt chọn, không mất, không nhân đôi.
- Công thức `xpToNext(level) = round(4 × 1.13^(level-1) + (level-1))`.

## Bốc thẻ

- Pool lấy từ dữ liệu: công pháp mới (khi còn ô, tối đa 4), nâng cấp công pháp đang có (chưa max, chưa tiến hóa), bị động (tối đa 4 loại), tiến hóa (khi đủ điều kiện).
- Chọn tối đa 3 thẻ không trùng theo trọng số: nâng cấp 2.0, công pháp mới 1.0, bị động 0.7, tiến hóa 100 (gần như chắc chắn vào bảng).
- Pool ít hơn 3 thì hiện đúng số còn lại; rỗng thì có thẻ dự phòng "Hồi Linh" (hồi 35% máu). Không bao giờ kẹt.
- `applyCard` kiểm lại tính hợp lệ (cấp hiện tại phải đúng cấp trước của thẻ) nên áp lại thẻ cũ bị từ chối. Giao diện còn khóa thêm: một cờ `done` mỗi bảng + 0,25 s đầu không nhận input.
- Khi bảng mở: không cập nhật run (thời gian, AI, đạn, hồi chiêu đều dừng).
- Rng của bốc thẻ là rng có seed của run.

## Tiến hóa

| Tiến hóa | Công pháp chính (cấp 5) | Cần thêm một trong | Đổi hành vi |
|---|---|---|---|
| Lôi Đình Vạn Kiếm | Kiếm Khí | Lôi Kích, Lôi Vực | 3 lưỡi, trúng thì sét nhảy 2 lần + làm chậm |
| Liệt Diễm Kiếm Trận | Phi Kiếm Trận | Hỏa Cầu, Hỏa Luân | 6 phi kiếm lửa, thiêu đốt, để lại vùng lửa |
| Hỏa Long Quyển | Hỏa Luân | Phong Nhận | Vòng lửa thành 2 cột lốc quay quanh, hút yêu thú |
| Lôi Cương Hộ Thể | Hộ Thể Cương Khí | Lôi Vực, Lôi Kích | Khiên phóng sét theo nhịp, vỡ thì nổ sét lớn |

Điều kiện chung: sống ít nhất 90 s trong run ([THỬ NGHIỆM], thay cho "qua mini-boss" tới khi M2 có mini-boss). Không cần gacha.

GDD ghi "Kiếm Khí + Hỏa → Liệt Diễm Kiếm Trận" và "Kiếm Khí + Lôi → Lôi Đình Vạn Kiếm" cùng một gốc. Để hai tiến hóa không tranh nhau một công pháp, Liệt Diễm Kiếm Trận lấy gốc là Phi Kiếm Trận (đúng mô tả "phi kiếm đốt kẻ địch").

Thẻ của công pháp gốc ghi gợi ý ("★ Tiến hóa: … + một công pháp hệ Hỏa"); không liệt kê toàn bộ công thức ở chỗ khác.

## Giới hạn chống bùng nổ

- Thiêu đốt và làm chậm không cộng dồn: giữ giá trị lớn nhất, làm chậm tối đa 60%.
- Sét nhảy: tối đa 24 lần nhảy mỗi khung trên toàn bộ run.
- Tối đa 220 đạn, 40 vùng lửa, 300 viên chiến ý (vượt thì gộp).
