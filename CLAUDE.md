# CLAUDE CODE — HƯỚNG DẪN DỰ ÁN TU TIÊN LỘ

**Đây là dự án hiện hữu. KHÔNG tạo lại từ đầu.**

## Đọc theo thứ tự

1. `HANDOFF.md`: trạng thái code/game và những gì đã test đến 10/11/2026.
2. `GDD_TU_TIEN_LO.md`: thiết kế game mục tiêu, phân biệt quyết định đã chốt với giả thuyết thử nghiệm.
3. `TASKS_TU_TIEN_LO.md`: thứ tự công việc, dependency, acceptance criteria, báo cáo.
4. Source code thực tế: kiểm tra và xác nhận trước khi sửa.

## Quy tắc bắt buộc

- Làm **M0 trước**, sau đó M1 → M2 → M3 → M4 → M5. M6 chỉ là tương lai.
- Giữ **2D pixel top-down + pseudo-2.5D**, không tự rewrite thành 3D/HD-2D hay chuyển renderer khi chưa có benchmark.
- Giữ gameplay hiện có: 18 bậc, tọa thiền/tụ linh trận, đột phá/lôi kiếp, kiếm khí, quái, beanfx VFX. Refactor có rollback.
- Hệ thống mục tiêu gồm **meta tu tiên vĩnh viễn** và **run roguelite có EXP/thẻ tạm thời**. Không trộn chúng trong save.
- **Bảo vệ `localStorage` khóa `tutien_save_v1`**, migrate có backup; không được xóa tiến độ người chơi.
- Không tự làm multiplayer, login, pay-to-win, quảng cáo, nạp tiền hay paid gacha.
- Test chức năng bằng input thật trong browser nếu có công cụ; không nói đã kiểm thử khi chưa thực sự test.
- Thay đổi cân bằng ở config; art phải rõ gameplay; đẹp nhưng không đánh đổi lag/telegraph.
- Mỗi task: cập nhật checklist trong `TASKS_TU_TIEN_LO.md`, ghi test/các lỗi còn lại và handoff mới.

## Việc phải làm ngay khi bắt đầu

**M0-01:** Audit cấu trúc dự án, xác minh source/launch, tạo checkpoint/backup, thống kê asset/cấu hình. **M0-02:** Test lại các chức năng hiện hữu bao gồm những mục HANDOFF chưa xác minh. **Chưa được bắt đầu viết gacha ở bước này.**

Khi một milestone xong, báo cáo phạm vi thực tế, demo/ảnh nếu có, lỗi còn tồn tại, và chờ chỉ đạo nếu chuẩn bị thực hiện thay đổi kiến trúc có chi phí lớn.
