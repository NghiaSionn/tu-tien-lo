# Báo cáo kiểm thử — Tu Tiên Lộ

Ngày: 2026-11-10. Người chạy: Claude Code.
Môi trường: Windows 11, trình duyệt Chromium trong Claude desktop (khung 690×846, devicePixelRatio 1, 8 luồng CPU), Node 26.13, Python 3.12.

## Cách đọc

- **Phím thật**: bấm phím/chuột qua công cụ điều khiển trình duyệt (sự kiện bàn phím của hệ điều hành).
- **Sự kiện giả**: `dispatchEvent(new KeyboardEvent(...))` trong trang. Đi qua đúng bộ xử lý phím của game nhưng không phải bàn phím thật.
- **Thiết lập bằng console**: chỉ dùng để dựng tình huống (đặt vị trí, số linh thạch, tu vi đầy). Hành động được kiểm thì vẫn bấm bằng phím thật.
- Công cụ chỉ bấm phím rất nhanh (xuống và lên cùng lúc), không giữ phím được. Vì vậy di chuyển được thử bằng cách bấm liên tục nhiều lần.

---

## 1. Baseline v0.1 (trước khi sửa code, commit `0032429`, tag `baseline-v0.1`)

| # | Bước | Cách | Kết quả | Console |
|---|---|---|---|---|
| B1 | Chạy `python -m http.server 8123`, mở trang | thật | PASS — trang hiện, HUD đúng | không lỗi |
| B2 | Đi WASD / mũi tên | sự kiện giả (giữ 0,3–0,5 s) | PASS — D 0,5 s đi 42 px (≈82 px/s); W, S, mũi tên đúng hướng | không lỗi |
| B3 | Đi bằng phím thật | phím thật, bấm nhanh 30 lần | **FAIL** — không nhúc nhích. Phím nhấn-thả trong cùng một khung bị bỏ qua (lỗi nhỏ có sẵn, đã sửa ở M0-05) | không lỗi |
| B4 | Va chạm | sự kiện giả, giữ W/S 6 s | PASS — dừng ở vật cản (đi 150 px thay vì 492 px) | không lỗi |
| B5 | T tọa thiền bật/tắt | phím thật | PASS — log đúng câu, `med` bật/tắt | không lỗi |
| B6 | Space phóng kiếm khí, giết quái | sự kiện giả (giữ Space) | PASS — quái cấp 2 (39 HP) chết sau 4 phát; +3 linh thạch, +10 tu vi | không lỗi |
| B7 | **Chết → hồi sinh** (HANDOFF ghi chưa test) | thiết lập: đặt cạnh quái cấp 6; để quái đánh thật | PASS — về (640, 506), máu đầy, log "Trọng thương…" | không lỗi |
| B8 | **Mua đan** phím 2 (HANDOFF ghi chưa test) | thiết lập 60 linh thạch; phím thật ×3 | PASS — 60→35→10, lần 3 bị từ chối, đan 1→3 | không lỗi |
| B9 | Dùng đan phím 1 / nút "Dùng đan" | phím thật + click thật | PASS — +15 tu vi mỗi viên (25% của 60) | không lỗi |
| B10 | Nút "Tọa thiền" | click thật | PASS | không lỗi |
| B11 | B đột phá nhỏ | thiết lập tu vi đầy; phím thật | PASS — lên Luyện Khí 2, máu 125 | không lỗi |
| B12 | **Tải lại trang giữ save** (HANDOFF ghi chưa test) | thiết lập số liệu; điều hướng lại trang | PASS — L, linh thạch, đan, vị trí giữ nguyên; tu vi được lưu lúc đóng trang | không lỗi |
| B13 | Quái không vào vùng an toàn | quan sát sau hồi sinh | PASS — không quái nào đuổi trong vùng | không lỗi |
| B14 | Cảm ứng điện thoại | — | NOT VERIFIED — game chưa có điều khiển cảm ứng | — |

Bản sao save thật của trình duyệt trước khi test: `backups/browser_save_v1_2026-11-10.json` (thư mục `backups/` không đưa vào git).

---

## 2. Test logic tự động (`npm test` = `node --test tests/`)

Kết quả lần chạy cuối: **41 test, 41 PASS, 0 FAIL.**

| Tệp | Nội dung chính |
|---|---|
| `tests/realm.test.js` (3) | Công thức baseline giữ nguyên; tên 18 bậc; biên đại cảnh giới L=8→9, 11→12, 14→15, đỉnh L=17; không NaN/Infinity, tăng đơn điệu |
| `tests/cultivation.test.js` (7) | Tu vi không vượt ngưỡng, bỏ qua NaN/âm; mua đan không làm linh thạch âm; dùng đan đúng 25%, không dùng khi đầy/hết; đột phá; lôi kiếp kiểu cũ với rng tiêm vào, thất bại không tụt cảnh giới; chết mất 10%; tốc độ thiền |
| `tests/save.test.js` (8) | Migrate v1→v2 giữ L, tu vi, HP, linh thạch, đan, vị trí; v1 không bị ghi đè, có `v1_backup`; v2_bak xoay vòng; v2 hỏng → phục hồi từ bak và giữ bản hỏng; v2 hỏng không bak → lùi v1; v1 hỏng → bắt đầu mới, giữ khóa; dữ liệu độc hại (`1e9`, `"NaN"`, âm, `__proto__`) bị kẹp; xuất/nhập JSON |
| `tests/run.test.js` (23) | Bản đồ động phủ trùng từng ô với v0.1 (checksum); EXP 3 cấp cùng lúc → đúng 3 lượt chọn; EXP run không chạm meta; bốc thẻ không trùng, cố định theo seed; áp thẻ cũ lần 2 bị từ chối; thẻ max/thẻ chưa triển khai không hiện; pool cạn → thẻ dự phòng; pool < 3; 4 tiến hóa: chỉ khi đủ điều kiện, đúng một lần; hồi chiêu Kiếm Khí; không nhắm qua cây; đạn không trôi vô hạn; thiêu đốt/làm chậm không cộng dồn; sét nhảy có ngân sách mỗi khung; mọi công pháp 1–5 và 4 tiến hóa chạy 20 s không NaN; khiên; vào/ra run 5 lần không chồng quái; quái sinh ở chỗ đứng được; chết trong run → LOSE |

---

## 3. Bản sau refactor + M1 (code trong `src/`, trên server `tools/serve.py`)

### 3.1 Save và động phủ

| # | Bước | Cách | Kết quả | Console |
|---|---|---|---|---|
| R1 | Mở bản mới với save v1 có sẵn | thật | PASS — tự migrate; `tutien_save_v1` giữ nguyên từng ký tự; tạo `tutien_save_v1_backup` và `tutien_save_v2`; log "Đã chuyển save cũ…" | không lỗi |
| R2 | Đi bằng phím thật (bấm nhanh) | phím thật W ×40 | PASS — đi 50 px (sau khi sửa lỗi B3) | không lỗi |
| R3 | T tọa thiền trong trận | phím thật | PASS — +6,0/s hiển thị đúng | không lỗi |
| R4 | B đột phá nhỏ | phím thật (tu vi đầy do thiền thật) | PASS — Luyện Khí 2, save v2 cập nhật ngay | không lỗi |
| R5 | Space bắn, giết quái ở động phủ | thiết lập vị trí; phím thật Space ×65 | PASS — quái cấp 3 chết, +4 linh thạch, tu vi kẹp ở 83 | không lỗi |
| R6 | Chết → hồi sinh | thiết lập vị trí cạnh quái cấp 7 | PASS — về trận, mất 10% tu vi (83→74), máu đầy | không lỗi |
| R7 | Mua đan ×3, dùng đan, dùng khi đầy | thiết lập 60 linh thạch; phím thật 2,2,2,1,1 | PASS — 60→35→10, lần 3 từ chối; đan +9; dùng khi đầy bị chặn, nút mờ | không lỗi |
| R8 | Lôi kiếp L8→9, bấm B lại khi đang độ kiếp | thiết lập L8 đầy; phím thật B ×2 | PASS — sét beanfx, lên Trúc Cơ sơ kỳ đúng một bậc | không lỗi |
| R9 | Cài đặt: bật "Giảm hiệu ứng", tải lại | click thật + tải lại | PASS — lưu và đọc lại đúng | không lỗi |
| R10 | Esc đóng cài đặt ngay sau khi bấm ô tích | phím thật | **FAIL rồi PASS** — lúc đầu Esc bị bỏ qua vì tiêu điểm nằm ở ô tích; đã sửa `src/core/input.js`, thử lại PASS | không lỗi |
| R11 | Tải lại trang | điều hướng lại | PASS — đọc từ `tutien_save_v2`, cảnh giới/cài đặt giữ | không lỗi |
| R12 | Nhấn E khi xa cổng | phím thật | PASS — không mở gì | không lỗi |
| R13 | Xuất / nhập save qua giao diện | — | NOT VERIFIED trong trình duyệt (cần hộp chọn tệp/tải tệp). Logic xuất/nhập có test tự động | — |
| R14 | Nút "Chơi lại từ đầu" | — | NOT VERIFIED — dùng hộp `confirm()` của trình duyệt, công cụ không bấm được | — |

### 3.2 Bí cảnh (M1)

| # | Bước | Cách | Kết quả | Console |
|---|---|---|---|---|
| M1 | Đến cổng, nút "Vào bí cảnh (E)" hiện | phím thật W ×88 | PASS | không lỗi |
| M2 | E mở bảng chuẩn bị, Esc hủy, E mở lại | phím thật | PASS — về HUB, không kẹt | không lỗi |
| M3 | Chọn Kiếm Khí bằng chuột | click thật | PASS — vào đấu trường, HUD bí cảnh hiện, HUD động phủ ẩn | không lỗi |
| M4 | Tự đánh khi có quái | quan sát | PASS — quái chết, rơi chiến ý | không lỗi |
| M5 | Lên cấp → bảng 3 thẻ; thế giới dừng | phím thật | PASS — thời gian và vị trí mọi yêu thú không đổi sau 2 s | không lỗi |
| M6 | Bấm "3" hai lần liền | phím thật `3 3` | PASS — chỉ nhận 1 thẻ (Hỏa Luân cấp 1) | không lỗi |
| M7 | Esc khi đang chọn thẻ | phím thật | PASS — bị bỏ qua, không đóng bảng thẻ | không lỗi |
| M8 | Esc tạm dừng / tiếp tục | phím thật | PASS — thời gian đứng yên khi dừng, chạy tiếp khi tiếp tục | không lỗi |
| M9 | Rời bí cảnh → kết quả → Enter ×2 | click + phím thật | PASS — bảng kết quả đúng; về động phủ đúng vị trí cũ (640, 412); Enter thứ hai không gây gì | không lỗi |
| M10 | Chết trong bí cảnh | chơi thật ở Luyện Khí 1 (trước khi chỉnh độ khó) | PASS về luồng — "Trọng thương, rời bí cảnh"; cảnh giới, tu vi không đổi. Độ khó lúc đó quá cao (chết ở 0:45), đã chỉnh | không lỗi |
| M11 | **Tiến hóa Lôi Đình Vạn Kiếm bằng chơi bình thường** | chơi thật 3 phút 10 giây, mọi lựa chọn thẻ bằng phím thật | PASS — Kiếm Khí cấp 5 lúc 2:26, thẻ TIẾN HÓA hiện lúc 2:56, chọn được, log "Tiến hóa: Lôi Đình Vạn Kiếm!", sét nhảy hoạt động | không lỗi |
| M12 | 3 tiến hóa còn lại bằng chơi thật | — | NOT VERIFIED bằng tay. Đã xác minh bằng test tự động và bot mô phỏng (mục 4) | — |
| M13 | Tự tạm dừng khi mất tiêu điểm | sự kiện giả `blur` khi đang RUN | PASS — hiện bảng "Tạm dừng"; Esc chơi tiếp. Rời tab thật (đổi tab) NOT VERIFIED | không lỗi |
| M13b | Mất tiêu điểm khi đang chọn thẻ | sự kiện giả `blur` + `visibilitychange`, rồi phím thật "2" | PASS — bảng thẻ vẫn dùng được, chọn đúng 1 thẻ, chơi tiếp | không lỗi |
| M14 | Tải lại trang khi đang ở bảng chọn thẻ | điều hướng lại trang giữa bảng thẻ | PASS — về động phủ, không còn bảng nào mở, điều khiển dùng được ngay (S ×20 đi 22 px), meta giữ. Run không được lưu (theo thiết kế, ADR 0001) | không lỗi |
| M15 | Space bắn tay trong bí cảnh | khởi đầu Lôi Kích (không có đạn tự động); phím thật Space | PASS — tạo đạn kiếm khí thường theo hồi chiêu 0,35 s | không lỗi |

### 3.3 FPS (đo nhẹ, không phải stress test)

| Cảnh | Số lượng | Thời gian khung trung vị | p95 | Ghi chú |
|---|---|---|---|---|
| Động phủ | 45 yêu thú | 16,70 ms | 16,80 ms | 60 FPS |
| Bí cảnh 0:23 | 6 yêu thú, 0 đạn | 16,70 ms | 16,80 ms | tải nhẹ |
| Bí cảnh đông (100 quái / 200 đạn / 300 hạt) | — | NOT MEASURED | — | thuộc M5-04 |

---

## 4. Bot mô phỏng (`node tools/sim.mjs`) — không phải người chơi thật

Bot né quái, nhặt chiến ý và chọn thẻ theo danh sách ưu tiên của từng build. Dùng để xem xu hướng cân bằng và xác minh tiến hóa đến được bằng bốc thẻ bình thường. Lần chạy cuối, cảnh giới 0, 4 seed mỗi build:

| Build | Thắng (sống 8 phút) | Thời gian sống | Tiến hóa đạt được |
|---|---|---|---|
| Kiếm + Lôi | 3/4 | 393–480 s | Lôi Đình Vạn Kiếm 3/4 (100–117 s), Lôi Cương Hộ Thể 1/4 |
| Phi Kiếm + Hỏa | 0/4 | 268–382 s | Liệt Diễm Kiếm Trận 4/4 (123–215 s) |
| Hỏa + Phong | 1/4 | 346–480 s | Hỏa Long Quyển 4/4 (169–398 s) |
| Lôi + Thể | 0/4 | 189–389 s | Lôi Cương Hộ Thể 2/4 (132–263 s) |

Nhận xét: build Kiếm + Lôi vẫn mạnh hơn hẳn. Cân bằng chi tiết thuộc M2-04.

---

## 5. Lỗi và giới hạn còn lại

1. Cân bằng: Kiếm + Lôi vượt trội; Lôi + Thể yếu (số liệu bot). Chưa có playtest người thật.
2. Chưa có boss, phần thưởng run (M2). "Thắng" hiện chỉ là sống đủ 8 phút.
3. Chiến ý (viên EXP) nhỏ và khó thấy trên nền cỏ.
4. Chưa test bằng tay 3 tiến hóa còn lại, đổi tab thật, xuất/nhập/chơi lại từ giao diện.
5. Không có điều khiển cảm ứng.
6. Trình duyệt có thể giữ bản cũ trong bộ nhớ đệm nếu chạy bằng `python -m http.server`; nên dùng `python tools/serve.py` (tắt cache).
