# M9-D — Nối vòng lặp tông môn: Tham Ngộ Công Pháp (Tàng Kinh Các)

**Ngày:** 23/11/2026.

## 1. Vòng lặp trước và sau

Phần thưởng bí cảnh đổi được ra gì ở mỗi công trình:

| Công trình | Trước M9-D | Sau M9-D |
|---|---|---|
| Luyện Khí Phường | Luyện / nâng pháp bảo bằng 🔩 + 💎 (M4-01). Đã vĩnh viễn và có tác dụng trong bí cảnh. | Giữ nguyên |
| Đan Dược Phòng | Mua / dùng Tụ Khí Đan bằng 💎 → tu vi | Giữ nguyên |
| Truyền Thừa Các | Vé Cơ Duyên 🎫 (không nạp tiền) | Giữ nguyên |
| **Tàng Kinh Các** | Chỉ xem Đồ giám, **không tiêu được gì** | **Tham Ngộ Công Pháp**: tiêu 💎 + ✨ để nâng vĩnh viễn công pháp khởi đầu |

## 2. Tham Ngộ Công Pháp

- **Phạm vi:** 3 công pháp khởi đầu (Kiếm Khí, Hỏa Cầu, Lôi Kích). Mỗi công pháp có tối đa **2 bậc**.
- **Hiệu quả vĩnh viễn:** lượt sau, công pháp đó **bắt đầu ở cấp 1 + bậc** (cấp 2 hoặc 3), không vượt cấp tối đa − 1 để trong lượt vẫn còn thẻ nâng. **Tác dụng thấy ngay ở lượt kế tiếp.**
- **Giá** (`MASTERY` trong config):
  - bậc 1: **150 💎 + 80 ✨**, tương đương khoảng một lượt thắng;
  - bậc 2: **400 💎 + 200 ✨**, cần **Luyện Khí tầng 4** trở lên.
- **Đánh đổi:** linh khí cũng là nguồn tu vi khi tọa thiền, nên người chơi phải chọn giữa đột phá cảnh giới và tham ngộ công pháp.
- **An toàn dữ liệu:**
  - `meta.mastery` nằm trong meta vĩnh viễn, không trộn với runState;
  - được làm sạch khi đọc save: chỉ nhận 3 công pháp khởi đầu, bậc là số nguyên 0..2;
  - việc mua đi qua `transact()`: ghi thất bại thì hủy thao tác, không mất gì;
  - bấm đúp không mua hai lần.
- **Giao diện:**
  - Tàng Kinh Các → E → "Tham ngộ công pháp" (vẫn còn "Đồ giám").
  - Mỗi dòng hiện: bậc, cấp khởi đầu lượt sau, cấp ở bậc kế, giá, lý do không mua được.
  - Biển hiệu ghi "Tham ngộ n/6", **chuyển màu vàng** khi đủ tiền nâng.
- **Mặc định:** sim, test cũ và save chưa tham ngộ đều bắt đầu ở cấp 1 như trước.

**Files:**
- `src/progression/mastery.js` (mới)
- `src/core/config.js` (`MASTERY`)
- `src/persistence/save.js` (`mastery` trong meta, làm sạch)
- `src/systems/run.js` (`createRun({ startLevel })`)
- `src/main.js` (menu Tàng Kinh Các, `openMastery`, `startLevel` khi vào bí cảnh, biển hiệu)
- `src/ui/ui.js` (`showMastery`, thêm icon ✨ cho giá)
- `tests/mastery.test.js` (mới)

## 3. Test

`node --test tests/` → **310/310 PASS** (6 test mới):

- **Mua bậc 1:** trừ đúng 💎 và ✨; bậc tăng; lượt sau bắt đầu ở cấp 2; công pháp khác không đổi.
- **Các trường hợp bị từ chối** (không trừ gì): thiếu tiền, chưa đủ cảnh giới cho bậc 2, đã tối đa, không phải công pháp khởi đầu.
- **Giới hạn cấp:** cấp khởi đầu không vượt cấp tối đa − 1.
- **Lưu / đọc:** bậc được giữ qua save; giá trị lạ bị làm sạch; save cũ chưa có `mastery` vẫn đọc được.
- **Cảm nhận được ở lượt sau:** cùng seed, 60 s đầu, Kiếm Khí bắt đầu cấp 3 hạ **nhiều quái hơn** so với cấp 1.
- **Không đổi hành vi cũ:** `createRun` mặc định vẫn cấp 1 cho cả 3 công pháp.

## 4. Trình duyệt (input thật)

Các bước: chơi khách → đứng ở cửa Tàng Kinh Các (dịch nhân vật bằng hook) → **E** → bảng chọn có "Tham ngộ công pháp / Đồ giám / Đóng" → **phím 1**.

Bảng "Tàng Kinh Các — Tham Ngộ Công Pháp" hiển thị:
- 3 công pháp, mỗi dòng ghi bậc 0/2, "Lượt sau bắt đầu ở cấp 1 (bậc kế: cấp 2)";
- nút "Tham ngộ 0→1 · 150💎 80✨" bị khóa với lý do "thiếu linh thạch / linh khí" (bản khách chỉ có 115💎 / 95✨).

Tôi **không tự cộng tài nguyên để bấm mua**, để giữ nguyên bản chơi khách. Đường mua có test tự động (mục 3).

## 5. Rủi ro còn lại

- **Cân bằng** (giá, số bậc) là giả thuyết, cần người thật chơi nhiều lượt (F-4).
- Công pháp mở khóa thêm (từ Truyền Thừa / đại cảnh giới) **chưa** tham ngộ được, theo chủ ý: phạm vi nhỏ, tránh lấn sang M6-02 "thiên phú / thầy dạy".
