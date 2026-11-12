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
| M12 | 3 tiến hóa còn lại bằng chơi thật | chơi thật, mọi lựa chọn thẻ bằng phím thật, 127.0.0.1 | PASS — Hỏa Long Quyển 2:14 (cấp 10, khởi đầu Hỏa Cầu); Liệt Diễm Kiếm Trận 2:38 (cấp 9, sau khi thêm `EVO_BASE_UPGRADE_MULT`); Lôi Cương Hộ Thể 4:30 (cấp 16, khởi đầu Kiếm Khí, khiên 45/45). Hai lượt Lôi Cương trước đó thua (2:19; 4:22 với Hộ Thể 4/5) vì thẻ nâng Hộ Thể quá hiếm → đã chỉnh trọng số | không lỗi; console sạch |
| M13 | Tự tạm dừng khi mất tiêu điểm | sự kiện giả `blur` khi đang RUN | PASS — hiện bảng "Tạm dừng"; Esc chơi tiếp. Rời tab thật (đổi tab) NOT VERIFIED | không lỗi |
| M13b | Mất tiêu điểm khi đang chọn thẻ | sự kiện giả `blur` + `visibilitychange`, rồi phím thật "2" | PASS — bảng thẻ vẫn dùng được, chọn đúng 1 thẻ, chơi tiếp | không lỗi |
| M14 | Tải lại trang khi đang ở bảng chọn thẻ | điều hướng lại trang giữa bảng thẻ | PASS — về động phủ, không còn bảng nào mở, điều khiển dùng được ngay (S ×20 đi 22 px), meta giữ. Run không được lưu (theo thiết kế, ADR 0001) | không lỗi |
| M15 | Space bắn tay trong bí cảnh | khởi đầu Lôi Kích (không có đạn tự động); phím thật Space | PASS — tạo đạn kiếm khí thường theo hồi chiêu 0,35 s | không lỗi |

### 3.3 FPS (đo nhẹ, không phải stress test)

| Cảnh | Số lượng | Thời gian khung trung vị | p95 | Ghi chú |
|---|---|---|---|---|
| Động phủ | 45 yêu thú | 16,70 ms | 16,80 ms | 60 FPS |
| Bí cảnh 0:23 | 6 yêu thú, 0 đạn | 16,70 ms | 16,80 ms | tải nhẹ |
| Bí cảnh đông (100 quái / 200 đạn / 300 hạt) | 12/11, pane trình duyệt của Claude desktop (Chrome 156, Windows 11, 8 luồng), `?stress=1&perf&loop=timer` | Thời gian xử lý mỗi khung (logic + vẽ), trung vị/p95: Cao 9,2/29,2 ms, Vừa 7,3/20,4 ms, Thấp 7,7/21,8 ms; chỉ vẽ (tạm dừng) 5,2/13,5 ms; heap ~14 MB | CHƯA ĐẠT p95 < 16,7 ms | Trước sửa: fx không trần lên 880 → 45 ms/khung và tăng dần; Vừa/Thấp treo trang (vòng bơm hạt không dừng). FPS trong pane không tin được (rAF bị hãm) |

---

## 3b. Thử pixelfx (2026-11-11, ADR 0004)

Chạy trên `http://127.0.0.1:8123` (bộ nhớ lưu riêng, không đụng save thật ở `localhost:8123`).

| # | Bước | Cách | Kết quả | Console |
|---|---|---|---|---|
| P1 | Cổng bí cảnh dùng sheet pixelfx | đặt vị trí; quan sát | PASS — cổng tím xoáy, vẽ đúng thứ tự trước/sau nhân vật | — |
| P2 | Lỗi vỡ vòng lặp khi tải trang | quan sát | **FAIL rồi PASS** — khung đầu có `dt` âm làm hiệu ứng nhảy về khung −1, game đứng hình. Sửa: kẹp `dt ≥ 0` trong `src/main.js` | hết lỗi sau khi sửa |
| P3 | Viên chiến ý pixelfx trong bí cảnh | chơi thật | PASS — đốm sáng có đuôi, 3 màu theo giá trị, nhìn rõ trên cỏ | không lỗi |
| P4 | Nhặt chiến ý sau khi đổi hình | phím thật S ×50, D ×40 | PASS — nhặt 3 viên, lên cấp 2, bảng thẻ mở | không lỗi |
| P5 | 300 viên chiến ý cùng lúc | thiết lập bằng console | PASS — khung trung vị 16,70 ms, p95 16,80 ms | không lỗi |
| P6 | Tắt `FEATURES.pixelfxAssets` / tải sheet lỗi | — | NOT VERIFIED trong trình duyệt (đường dự phòng là hình vẽ bằng code cũ) | — |

Test tự động: thêm `tests/pixelfx.test.js`. Sau khi bỏ viên chiến ý pixelfx: `npm test` 43/43 PASS.

**11/11/2026:** người chơi giữ cổng, bỏ viên chiến ý pixelfx; viên chiến ý về lại hình vẽ bằng code (giống commit `afd7e78`).

Ảnh trước/sau: `docs/pixelfx_truoc_sau.png`.

---

## 3c. M2-01 — Director + kiểu quái (2026-11-11)

Test tự động mới: `tests/director.test.js` (13 test): nhịp/ngân sách đơn điệu; cùng seed + cùng input → cùng diễn biến; quái mới đứng được và cách người chơi ≥ 150 px; không vượt trần; cả 4 kiểu xuất hiện đúng thời điểm; đợt vây phủ nhiều hướng; Hỏa Hồ/Huyền Băng Thú/tinh anh không gây sát thương trong lúc cảnh báo, né thì không trúng, đứng yên thì trúng; cây chặn băng tiễn; quái bắn xa ngoài màn không bắn; chết vì băng tiễn không lỗi.

| # | Hạng mục | Cách test | Kết quả |
|---|---|---|---|
| D1 | Một run có director, chơi thật | 127.0.0.1, phím thật, khởi đầu Kiếm Khí, tới 3:07 (cấp 15) rồi rời bí cảnh | PASS — 1:00 thông báo "Bầy Dã Lang vây quanh!" + vòng 8 con; Hỏa Hồ gồng lao thấy lúc 1:14, Huyền Băng Thú từ ~2:00, Ma Ảnh tinh anh 3:00. Console sạch. Về động phủ đúng |
| D2 | Cảnh báo Hỏa Hồ | ảnh chụp lúc gồng (`docs/m2_01_canh_bao_hoa_ho.jpg`) | PASS — đường đỏ cam tới điểm cuối đường lao, dấu "!" trên đầu |
| D3 | Cảnh báo Huyền Băng Thú | ảnh lúc gồng | PASS sau khi chỉnh — bản đầu đường ngắm quá mờ và quái có thể bắn từ gần mép màn (cách 134 px theo chiều dọc). Đã làm đường ngắm sáng hơn + lấp dần và chỉ cho bắn khi ở trong khung nhìn |
| D4 | Cảnh báo + né đòn đập tinh anh | chơi thật: thấy vòng, chạy ra ngoài bằng phím thật | PASS — không nhận sát thương từ tinh anh (`dmgBy` không có `elite`). Ảnh vòng mới: `docs/m2_01_canh_bao_tinh_anh_bang_tien.png` (lượt thử ngắn, quái được sinh bằng console chỉ để chụp hình) |
| D5 | Sát thương theo nguồn tới 3:07 | `run.dmgBy` | đuổi 102, Hỏa Hồ lao 24, băng tiễn 6, tinh anh 0 — đuổi vây vẫn là nguồn chính |

Chưa test: sống qua các đợt sau 3:07 (yêu triều 6:50), 2 tinh anh cùng lúc, FPS khi 90 quái + băng tiễn.

---

## 3d. M2-02 — Boss (2026-11-11)

Test tự động mới: `tests/boss.test.js` (12 test): mini-boss ra đúng giờ, một lần, hạ rồi không sinh lại, reward hook ghi 1 lần; hạ boss cuối → WIN một lần, dọn vùng/đạn, vùng đang gồng không nổ sau khi boss chết; TIMEOUT không phải WIN; chặn one-shot + sơ hở; Lang Vương lao 3 lần, không đánh lúc cảnh báo; tru gọi bầy; đạn tỏa chỉ bắn sau gồng, đúng số tia, pha 2 nhiều hơn; vùng hắc diễm: đứng yên trúng, rời vùng không trúng; đập đất khi áp sát; không ra chiêu khi đang sơ hở; bị cây vây kín thì dịch chuyển; không bị đẩy lùi, nửa làm chậm.

| # | Hạng mục | Cách test | Kết quả |
|---|---|---|---|
| B1 | Màn chuẩn bị, đồng hồ | trình duyệt 127.0.0.1 | PASS — mô tả "Lang Vương chặn đường lúc 4:00; Ma Ảnh Yêu Vương xuất hiện lúc 7:00 — hạ nó để vượt bí cảnh"; đồng hồ đếm tới 7:00 |
| B2 | Cảnh báo 5 chiêu + thanh máu | boss sinh bằng console (chỉ để chụp), tạm dừng đúng lúc gồng | PASS — lao (`docs/m2_02_lang_vuong_lao.png`), tru (`…_tru.png`), đạn tỏa (`docs/m2_02_yeu_vuong_dan_toa.png`), hắc diễm (`…_hac_diem.png`), sơ hở (`…_so_ho.png`); thanh máu dưới màn có tên + vạch 50% |
| B3 | Thắng/thua boss bằng chơi thật trọn run | — | **NOT VERIFIED** — trình duyệt trong phiên chỉ chạy 2–5 khung/giây (đo bằng requestAnimationFrame, cả ở động phủ; không có long task), nên không chơi được 7+ phút. Đã xác minh bằng test + bot (bot Kiếm+Lôi hạ Yêu Vương lúc 8:32; các bot khác chết → thua được) |
| B4 | Giảm hiệu ứng | đọc code | Cảnh báo không phụ thuộc `vis.reduce` (chỉ giảm hạt và chớp sáng). **Chưa bật thử trong trình duyệt** |

Ghi chú: thanh máu boss nằm sát dòng hướng dẫn phím ở cạnh dưới; đọc được nhưng nên xem lại khi làm UI (M5).

---

## 3e. M2-03 — Phần thưởng run (2026-11-11)

Test tự động mới: `tests/rewards.test.js` (10 test): thua có thưởng theo tiến độ; thắng > thua, boss cộng thêm, vé lần đầu chỉ 1 lần; cảnh giới cao nhiều hơn; nhận nhiều lần chỉ cộng 1 lần, stage lại run đã nhận bị từ chối; không đụng cảnh giới/tu vi/đan/công pháp; tải lại giữa trao thưởng không nhân đôi; bản dự phòng cũ không nhận lại; save sửa bậy bị kẹp; save cũ đọc được; run thứ hai sạch nhưng meta giữ thưởng.

| # | Hạng mục | Cách test | Kết quả |
|---|---|---|---|
| R1 | Pending được lưu trước khi hiện bảng | 127.0.0.1, vào run, rời bằng nút | PASS — `tutien_save_v2.meta.pendingReward` có id run, +3 linh thạch; bảng hiện "Mang về động phủ" |
| R2 | Tải lại giữa bảng kết quả | điều hướng lại trang khi đang ở bảng | PASS — mở lại ở động phủ, log "Đã nhận phần thưởng bí cảnh còn treo: 💎 3 linh thạch", 0 → 3; tải lại lần 2: vẫn 3, không còn pending |
| R3 | Bấm nhận nhiều lần | bấm đúp nút "Nhận thưởng" + Enter ×2 | PASS — 3 → 6 (đúng +3 một lần), save khớp, `rewardLog` 2 id, console sạch |
| R4 | HUD tài nguyên mới | nhìn HUD động phủ | PASS — ✨ 🔩 🎫 hiện số. (HUD cập nhật chậm vài giây vì trình duyệt phiên này chỉ 2–5 khung/giây) |

Chưa test bằng tay: thắng run thật để thấy vé Cơ Duyên (chưa chơi tới boss, xem §3d B3).

---

## 3f. M2-04 — Cân bằng (2026-11-11)

Chi tiết và nhật ký 12 lượt: `docs/playtest_M2-04.md`. Test mới trong `tests/run.test.js`: một mục tiêu thì mọi lưỡi Kiếm Khí cấp 5 và cả 2 Hỏa Cầu cấp 5 đều trúng (ở 40/90/140 px).

| # | Hạng mục | Cách test | Kết quả |
|---|---|---|---|
| C1 | Bảng kết quả có bước tiếp theo | trình duyệt 127.0.0.1, vào run Lôi Kích rồi rời | PASS — "Bước tiếp theo: Lần sau: trụ tới 3:30 để gặp Lang Vương"; màn chuẩn bị ghi mốc 3:30/6:00 |
| C2 | ≥ 5 lượt playtest người thật | — | **NOT DONE** — trình duyệt phiên này 2–5 khung/giây; thay bằng 12 lượt bot có nhật ký (có ghi hạn chế) |
| C3 | GATE v0.2 trọn vòng bằng chơi thật | — | **NOT VERIFIED** |

---

## 4. Bot mô phỏng (`node tools/sim.mjs`) — không phải người chơi thật

Bot né quái, nhặt chiến ý và chọn thẻ theo danh sách ưu tiên của từng build. Dùng để xem xu hướng cân bằng và xác minh tiến hóa đến được bằng bốc thẻ bình thường. Lần chạy cuối (2026-11-11, sau khi thêm `EVO_BASE_UPGRADE_MULT = 3`), cảnh giới 0, 4 seed mỗi build:

| Build | Thắng (sống 8 phút) | Thời gian sống | Tiến hóa đạt được |
|---|---|---|---|
| Kiếm + Lôi | 3/4 | 393–480 s | Lôi Đình Vạn Kiếm 3/4 (100–103 s), Lôi Cương Hộ Thể 2/4 (424–438 s) |
| Phi Kiếm + Hỏa | 0/4 | 303–372 s | Liệt Diễm Kiếm Trận 4/4 (145–160 s) |
| Hỏa + Phong | 1/4 | 291–480 s | Hỏa Long Quyển 4/4 (147–398 s) |
| Lôi + Thể | 0/4 | 156–433 s | Lôi Cương Hộ Thể 3/4 (118–197 s) |

Nhận xét: build Kiếm + Lôi vẫn mạnh hơn hẳn. Cân bằng chi tiết thuộc M2-04.

**Sau M2-01** (director + kiểu quái), cùng cấu hình:

| Build | Thắng | Thời gian sống |
|---|---|---|
| Kiếm + Lôi | 3/4 | 428–480 s |
| Phi Kiếm + Hỏa | 0/4 | 249–301 s |
| Hỏa + Phong | 0/4 | 188–394 s |
| Lôi + Thể | 0/4 | 208–292 s |

Bot không đọc cảnh báo (chỉ né theo khoảng cách) nên chết sớm hơn người chơi biết né. Xem nguồn sát thương: `DMG=1 node tools/sim.mjs <build> 0 4`.

---

## 5. Lỗi và giới hạn còn lại

1. Cân bằng: Kiếm + Lôi vượt trội; Lôi + Thể yếu (số liệu bot). Chưa có playtest người thật.
2. Có boss (M2-02) nhưng chưa chơi thật trọn run tới boss; chưa có phần thưởng run (M2-03).
3. Chiến ý (viên EXP) nhỏ và khó thấy trên nền cỏ. Bản pixelfx (§3b) đã bị loại, trả về hình cũ.
4. Chưa test bằng tay 3 tiến hóa còn lại, đổi tab thật, xuất/nhập/chơi lại từ giao diện.
5. Không có điều khiển cảm ứng.
6. Trình duyệt có thể giữ bản cũ trong bộ nhớ đệm nếu chạy bằng `python -m http.server`; nên dùng `python tools/serve.py` (tắt cache).
