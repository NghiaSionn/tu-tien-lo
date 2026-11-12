# ADR 0007 — Trang bị, thành tựu và Truyền Thừa Các (M4)

Ngày: 2026-11-12. Trạng thái: đã làm. Chưa xem trong trình duyệt (theo chỉ đạo "không cần test nữa").

## Quyết định

**Trang bị (M4-01)** — `src/data/items.js`, `src/progression/gear.js`
- 4 ô: vũ khí, giáp, pháp bảo, nhẫn; 8 món, mỗi món **một ưu một nhược** đo được (ví dụ Phi Hành Kiếm +1 đạn nhưng −sát
  thương; Sát Khí Giới +sát thương nhưng nhận thêm 15%).
- Sở hữu mỗi món một bản (`meta.items[id] = cấp`). Luyện 8🔩 + 80💎; nâng cấp chắc chắn, tối đa cấp 5, chi phí tăng dần.
  Không RNG, không phá đồ. Kiểm tra đủ rồi mới trừ — không âm.
- Chỉ số đồ cộng vào run qua `gearMods(meta)` -> `createRun({ gear })` -> `runStats`.

**Thành tựu (M4-02)** — `src/data/achievements.js`, `src/progression/achievements.js`
- Thống kê vĩnh viễn (`stats.kills/minis/evos/bestDiffWin`) đi **kèm phần thưởng chờ nhận** nên chỉ cộng một lần (ADR 0006).
- Công pháp khóa (`locked: true`): Băng Châm (hạ Lang Vương lần đầu), Hàn Khí (hạ Yêu Vương lần đầu) — **lộ trình chắc chắn**.
  Đã mở thì vào pool thẻ và thành công pháp khởi đầu.

**Truyền Thừa Các (M4-03)** — `src/progression/gacha.js`, `GACHA` trong config
- **Chỉ vé Cơ Duyên kiếm trong game.** Không có tiền thật, không bán vé, không quảng cáo (có test quét chữ).
- Tỉ lệ công bố trong UI đúng như config: Thường 70% (tài nguyên), Hiếm 25% (trang bị), Cực phẩm 5% (trang bị cực phẩm /
  công pháp Băng). **Bảo hiểm 30 lượt** chắc chắn Cực phẩm.
- Trùng -> mảnh (5 / 15). **Đổi mảnh lấy đúng món mình chọn** (trang bị 20, công pháp 40) — lộ trình chắc chắn thứ hai.
- RNG lưu trong save (`meta.gacha.seed`, LCG): kết quả tất định theo trạng thái, tải lại không quay lại được.
- Mỗi thao tác tốn tài nguyên chạy **giao dịch**: làm trên bản sao -> ghi save -> đọc lại khớp mới áp dụng; lưu lỗi thì không
  phát/không trừ gì. Chống bấm dồn 300 ms. Lịch sử 50 lượt.

## Hệ quả / còn mở
- Tỉ lệ, bảo hiểm, giá đổi là [THỬ NGHIỆM] — chưa có số liệu người chơi.
- Hai công pháp Băng dùng lại kiểu đạn/xung có sẵn và vẽ tạm (M5 làm VFX riêng).
- Chưa có ngoại trang/biến thể trong pool (cần art, M5).
