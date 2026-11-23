# M9-C — Gia cố save

**Ngày:** 23/11/2026.

**Phạm vi:** không đổi khóa `tutien_save_v1`. Khóa này chỉ được đọc, không bao giờ ghi hay xóa (có test riêng).

**Đã có từ trước (M1, M9):**
- `schemaVersion` 2;
- `tutien_save_v2_bak` xoay vòng;
- cất bản hỏng (`_corrupt`), sao lưu v1 (`_v1_backup`), sao lưu trước khi tải bản từ mây (`_cloud_bak`);
- xuất/nhập save JSON trong Cài đặt;
- migrate v1 có xác minh.

M9-C bổ sung những chỗ còn thiếu dưới đây.

## 1. Thay đổi

| Rủi ro trước đây | Gia cố |
|---|---|
| Save vẫn là JSON hợp lệ nhưng nội dung sai (hỏng, sửa tay) vẫn được coi là tốt. | Mỗi bản v2 có `sum` (băm FNV-1a của meta). Sai mã → coi là hỏng, cất sang `_corrupt`, khôi phục `_bak`. Save cũ chưa có `sum` (kể cả bản trên mây) vẫn đọc bình thường. |
| Mở nhầm bản game cũ (cache GitHub Pages) khi save do bản mới hơn ghi → save bị coi là hỏng, rồi **bị ghi đè mất**. | Version lớn hơn → không coi là hỏng; cất nguyên văn vào **`tutien_save_v2_future`** trước bất kỳ lần ghi nào; hiện thông báo "tải lại để cập nhật game". Nhập save của bản mới hơn → từ chối, có lời giải thích. |
| Chỉ có 1 bản sao lưu (bản liền trước), nên mất tiến độ cả buổi là không cứu được. | Thêm **`tutien_save_v2_daily`**: bản lưu cuối của ngày trước, xoay khi sang ngày mới, không đổi khi lưu nhiều lần trong ngày. |
| Bộ nhớ trình duyệt đầy → `setItem` ném lỗi → có thể làm vòng lặp game dừng. | Ghi bản sao lưu lỗi thì bỏ qua, không chặn bản chính. Ghi bản chính lỗi thì `save()` bắt lỗi, game chạy tiếp, báo "Không lưu được… hãy Xuất save" tối đa 1 lần/phút, bản cũ giữ nguyên. |
| Không có cách khôi phục ô dự phòng bằng giao diện. | **Cài đặt → Dữ liệu → "Khôi phục bản dự phòng…"** liệt kê các ô đọc được (cảnh giới · số lượt · linh thạch · giờ lưu), mỗi ô có nút **Khôi phục** và hỏi xác nhận. Bản hiện tại vẫn được giữ ở "Bản lưu liền trước". |

**Các ô liệt kê trong mục khôi phục:**
- Bản lưu liền trước;
- Bản cuối của ngày trước;
- Bản trên máy trước khi tải từ mây;
- Bản từng bị hỏng;
- Bản v0.1 gốc / Save v0.1;
- Bản từ phiên bản mới hơn (chỉ hiển thị, không khôi phục được).

**Files:**
- `src/persistence/save.js`: `checksum`, `listBackups`, `restoreBackup`, các khóa mới; `writeSave(storage, meta, now)`
- `src/main.js`: `save()` chịu lỗi, thông báo khi gặp save từ bản mới hơn, nối khôi phục vào giao diện
- `src/ui/ui.js`: mục khôi phục
- `tests/save_hardening.test.js` (mới)

## 2. Test

`node --test tests/` → **304/304 PASS** (8 test mới):

- **Mã kiểm tra:** sửa tay linh thạch trong save → phát hiện, khôi phục `_bak`, bản hỏng được cất.
- **Tương thích ngược:** save cũ chưa có `sum` đọc bình thường, cả qua `parseWrapped` (đường bản trên mây).
- **Save từ phiên bản mới hơn:**
  - không bị xếp vào bản hỏng;
  - được cất nguyên văn;
  - vẫn còn nguyên sau 2 lần ghi đè;
  - nhập bị từ chối;
  - có hiện trong danh sách dự phòng.
- **Ghi đè lên bản mới hơn chưa từng đọc:** vẫn tự cất trước.
- **Bản "ngày trước":** lưu nhiều lần trong ngày thì không đổi; sang ngày mới thì giữ đúng bản cuối của ngày trước.
- **Bộ nhớ đầy:**
  - lỗi ghi ô sao lưu → bản chính vẫn được ghi;
  - lỗi ghi bản chính → ném lỗi và bản cũ còn nguyên.
- **Khôi phục:**
  - đủ các ô được liệt kê;
  - khôi phục đúng nội dung (cả v1);
  - từ chối khóa không phải ô dự phòng, kể cả khóa chính và khóa nhật ký playtest.
- **`tutien_save_v1`:** không bao giờ bị ghi, kể cả qua load, nhiều lần ghi, liệt kê hay khôi phục.

## 3. Trình duyệt (input thật)

Các bước: chơi khách → Cài đặt → mở "Khôi phục bản dự phòng…".

**Danh sách hiện:** "Bản lưu liền trước: Luyện Khí · Tầng 1 · 3 lượt · 109 linh thạch · 18:14 23/11/26", kèm nút **Khôi phục**.

**Kiểm tra mã kiểm tra:** bấm "Rung màn hình" 2 lần (tắt rồi bật lại) để kích hoạt việc lưu.
- `tutien_save_v2` có `sum` khớp nội dung;
- `_bak` cũng có `sum`;
- cài đặt trở về như cũ.

**Chưa bấm Khôi phục thật** để khỏi đổi tiến độ của bản chơi khách. Đường khôi phục đã có test tự động.

## 4. Rủi ro còn lại

- `sum` chỉ để **phát hiện hỏng**, không phải chống gian lận (ai cũng tính lại được). Chống gian lận cần máy chủ, xem M6-04.
- Chưa thử khi bộ nhớ trình duyệt đầy thật hoặc ở chế độ ẩn danh Safari. Phần này nằm trong F-2 (kiểm thử máy thật).
