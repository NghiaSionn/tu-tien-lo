# BASELINE M7 — Audit 13/11/2026 (M7-01)

Chỉ audit, **không sửa code/balance** trong M7-01. Lỗi tìm được chuyển sang M7-02 (UI) và M7-11 (cân bằng).

## Cấu hình

| Mục | Giá trị |
|---|---|
| Commit | `2035580` (main, trùng GitHub Pages) |
| Node | v26.13.0 |
| Server | `python -m http.server 8123` → `http://127.0.0.1:8123/?loop=timer` |
| Browser | Browser pane của Claude desktop (Chromium), desktop + giả lập 360×800, 390×844, 1366×768 |
| Đồ họa | Cao (mặc định) |
| Save | Origin 127.0.0.1:8123 là save thử nghiệm; origin GitHub Pages của pane có save người chơi (cảnh giới 4) — **không đụng** |

## Lệnh và kết quả máy

| Lệnh | Kết quả |
|---|---|
| `npm test` | **146/146 pass**, 0 fail, 2,6 s (khớp con số ghi nhận trước) |
| `node tools/sim.mjs --summary 0 8` | kiem_loi 8/8 · phi_kiem_hoa 7/8 · hoa_phong 6/8 · loi_the 8/8 (bot biết né, cảnh giới 0) |
| `tools/autopilot.js` | dùng cho luồng 1 (bot tự chơi trong browser thật) |

Chú thích: PASS = chạy đúng bằng input thật; FAIL = sai/hỏng; NOT VERIFIED = chưa kiểm được; *(console)* = trạng thái được dựng bằng console để tới được màn cần test, không phải chơi thật.

## 1. Hub → run → thẻ → boss → thưởng → hub

| Bước | Kết quả | Ghi chú |
|---|---|---|
| Vào cổng, chuẩn bị, bắt đầu run | PASS | Người chơi được dịch tới cổng *(console)*; vào run bằng phím thật |
| Chọn thẻ khi lên cấp | PASS | autopilot chọn thẻ qua UI |
| Boss 1 Lang Vương | PASS | Hạ lúc 4:14 |
| Boss cuối Ma Ảnh Yêu Vương | **FAIL (cân bằng/bot)** | Autopilot thua lúc 6:27, boss còn 39% HP; sim thắng 8/8 → lệch sim vs browser, chuyển M7-11 |
| Màn kết quả, nhận thưởng | PASS | Bấm Enter 2 lần → thưởng nhận **đúng 1 lần** |
| Thành tựu mở sau run | PASS | |
| Đóng kết quả bằng Space | **FAIL** | Space bị input game nuốt (xem lỗi B1); Enter vẫn được |
| Full run không cheat trên desktop | NOT VERIFIED | Chưa có người chơi tay trọn run trong audit này |

## 2. Tọa thiền → đột phá → thiên kiếp

| Bước | Kết quả | Ghi chú |
|---|---|---|
| Tọa thiền trong tụ linh trận (T) | PASS | Phím thật |
| Tiểu đột phá (B) | PASS | Phím thật |
| Bắt đầu thiên kiếp | PASS | Cảnh giới/tu vi dựng *(console)* |
| Phạt khi thất bại | PASS | Giữ 70% tu vi, không tụt cảnh giới, save không hỏng |
| Độ khó cảm nhận | **FAIL (UX)** | Đứng yên ~2 s mất 212/300 HP (Lôi ấn 3 dấu × 16%, cảnh báo 1,2 s) — quá gắt cho người mới |
| Thông báo kết quả | FAIL (minor) | Dòng log tắt quá nhanh, dễ không thấy |
| Chữ HUD thiên kiếp ở màn hẹp | NOT VERIFIED | Có thể tràn khung, chưa chụp được lúc đang kiếp |

## 3. Linh Mạch (giữa run)

| Bước | Kết quả | Ghi chú |
|---|---|---|
| Gặp Linh Mạch, mở lựa chọn | PASS | |
| Chọn +20% sát thương, có hiệu lực | PASS | |
| Biểu tượng lựa chọn | FAIL (minor) | Vẫn là emoji, chưa dùng icon pixel |

## 4. Luyện khí

| Bước | Kết quả | Ghi chú |
|---|---|---|
| Mở bằng nút / G | PASS | |
| Luyện khi đủ nguyên liệu | PASS | |
| Thiếu nguyên liệu | PASS (logic) / FAIL (UX, minor) | Không trừ gì, nhưng nút không disable, không báo lý do |
| 360×800 | FAIL (major) | Modal vừa ngang, không cuộn ngang; nút "Luyện" chỉ **68×17 px** (cần ~44×44); nút touch "E" đè lên danh sách — ảnh `m7_01/360x800_luyen_khi.jpg` |

## 5. Truyền Thừa Các (gacha vé trong game)

| Bước | Kết quả | Ghi chú |
|---|---|---|
| Quay bằng click | PASS | Vé giảm, lịch sử ghi |
| Hiển thị tỉ lệ + bảo hiểm | PASS | |
| Quay bằng Space | **FAIL** | Lỗi B1 |
| Đổi mảnh | NOT VERIFIED | Chưa đủ mảnh trong save thử |

## 6. Thành tựu

| Bước | Kết quả | Ghi chú |
|---|---|---|
| Mở bằng chuột | PASS | Danh sách đúng |
| Mở/đóng bằng J | **FAIL** | Lỗi B1 |
| Mở khóa công pháp từ thành tựu | PASS | Sau run (luồng 1) |

## 7. Viewport (ảnh trong `docs/playtest/m7_01/`)

| Viewport | Kết quả | Ghi chú |
|---|---|---|
| 1366×768 | PASS | Canvas 1280×720 căn giữa, không cuộn ngang, HUD/nút gọn — `1366x768_dong_phu.jpg` |
| 390×844 dọc | FAIL (major) | Game là dải 390×219 giữa màn, ~70% màn trống; HUD chiếm ~nửa dải; hàng nút che đáy; nút E đè cảnh — `390x844_dong_phu.jpg` |
| 360×800 dọc | FAIL (major) | Như trên, nặng hơn — `360x800_dong_phu.jpg`, `360x800_luyen_khi.jpg` |
| Điện thoại thật | NOT VERIFIED | Cần máy thật (M7-03) |

## Danh sách lỗi

### Blocker
- Không có lỗi mất save, crash hay thưởng trùng trong phạm vi đã thử.

### Major
- **B1 — Phím game nuốt phím tắt UI.** `src/core/input.js` gán `Space`/`KeyJ` = attack và WASD = di chuyển, xử lý rồi `return` sớm nên không tới `onAction`/`modalKey`. Hỏng: J mở/đóng thành tựu (`main.js:557`, `ui.js:300`), Space quay gacha (`ui.js:287`), D đổi độ khó ở màn chuẩn bị (`ui.js:124`), Space đóng kết quả (`ui.js:208`). → M7-02.
- **B2 — Màn dọc điện thoại không chơi được thoải mái.** Letterbox nhỏ, HUD + nút che cảnh. Cần lời nhắc xoay ngang hoặc layout dọc. → M7-02 (quyết định thiết kế, hỏi trước nếu tốn kém).
- **B3 — Nút modal quá nhỏ cho cảm ứng** (Luyện 68×17 px). → M7-02.
- **B4 — Thiên kiếp quá gắt cho người mới** (mất ~70% HP trong 2 s đứng yên). Đổi số ở config, cần đo lại. → M7-11/M7-02.
- **B5 — Autopilot thua boss cuối trong browser dù sim thắng 8/8.** Có thể do bot browser kém hơn bot sim hoặc chênh lệch sim/game; cần điều tra trước khi chỉnh balance. → M7-11.

### Minor
- Luyện khí: thiếu nguyên liệu không có phản hồi, nút không disable.
- Linh Mạch: icon lựa chọn còn emoji.
- Thiên kiếp: dòng kết quả tắt quá nhanh; chữ HUD có thể tràn ở màn hẹp (chưa xác nhận).

## Chưa xác minh (chuyển M7-02/M7-03)
Full run tay không cheat; đổi mảnh gacha; pause/settings ở 3 viewport; HUD thiên kiếp ở màn hẹp; điện thoại thật, âm thanh, joystick; FPS trên máy tầm trung.

## Thay đổi trong M7-01
Không sửa code, không đổi balance. Chỉ thêm tài liệu này, ảnh chụp, và cập nhật TASKS/HANDOFF.
