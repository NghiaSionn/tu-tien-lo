# M10-11 — VFX / SFX / UI boss

**Ngày:** 23/11/2026.

**Cờ:** chỉ hiện khi bật `FEATURES.bossPatternsV2` (`?boss2=1`), cờ này vẫn **mặc định TẮT**. Bộ chiêu boss cũ không thay đổi gì.

**Asset:** dùng lại asset có sẵn, **không vẽ sprite mới**. Bóng boss lấy từ khung `_atk` + bản trắng của sheet boss sẵn có. Âm thanh tổng hợp bằng WebAudio, không dùng file âm thanh.

## 1. Thay đổi

| Hạng mục | Nội dung |
|---|---|
| **Tên chiêu** | `BOSS_SKILL_LABELS`: 12 tên kèm màu, cho cả 5 chiêu Lang Vương và 7 chiêu Yêu Vương. Khi boss gồng / Ảnh Độn / quét, tên chiêu hiện (1) **trên đầu boss** và (2) **trên thanh máu**, dạng dòng "⚠ tên chiêu". 7 chiêu boss cuối có 7 tên khác nhau. |
| **Dấu pha** | Thanh máu ghi "· Pha 1" / "· Pha 2", đổi màu chữ và màu thanh khi sang P2. Vạch chuyển pha đặt đúng ngưỡng: Lang Vương V2 55 %, Yêu Vương 50 %. |
| **Bóng boss ở điểm đích** | Bóng trắng mờ, nhịp đập nhẹ, của chính boss tại (1) điểm Ảnh Độn sắp hiện ra / boss giải kẹt và (2) điểm đáp Vồ Đầu Đàn. Mục đích: dễ phân biệt với vòng tím của Ma Ảnh tinh anh, và dễ thấy dấu vồ khi đông quái (rủi ro đã ghi ở M10-09 và M10-10). |
| **Âm báo boss** | `bossWarn` (trầm, ngắn, khác tiếng quái thường) mỗi lần boss ra chiêu, **khoảng nghỉ 0,8 s**. `bossPhase` khi chuyển pha, khoảng nghỉ 2 s. Vẫn chịu trần 10 tiếng cùng lúc của `sfx.js`. |
| **Flash toàn màn** | **Không thêm.** Chuyển pha chỉ rung nhẹ 0,2 s, giống trước. |
| **Đồ họa Thấp** | Mọi cảnh báo, nhãn tên chiêu và bóng boss **không phụ thuộc mức đồ họa**: Thấp vẫn vẽ đủ, chỉ VFX trang trí của người chơi bị giảm. |

**Files thay đổi:**
- `src/core/config.js` (`BOSS_SKILL_LABELS`)
- `src/audio/sfx.js` (`bossWarn`, `bossPhase`, `GAP`)
- `src/entities/bosses.js` (cờ `m.v2`, sự kiện âm thanh)
- `src/render/render.js` (`drawBossGhost`, `drawBossLabel`, thanh máu)
- `tests/boss_ui_v2.test.js` (mới)

## 2. Test

`node --test tests/` → **290/290 PASS** (4 test mới):
- Mọi chiêu trong `MINI_V2` / `FINAL_V2` đều có tên và màu; 7 tên boss cuối khác nhau.
- **Bật cờ:**
  - Lang Vương và Yêu Vương đều được đánh dấu `v2`.
  - Mỗi lần ra chiêu có sự kiện `bossWarn`.
  - Có **đúng 1** `bossPhase`.
- **Tắt cờ:** không có âm mới, không đánh dấu `v2`.
- **Âm thanh** (AudioContext giả): 10 lần `bossWarn` dồn trong 0,5 s chỉ phát **1 tiếng**; `GAP.bossWarn` ≥ 0,6 s, `GAP.bossPhase` ≥ 1,5 s.

## 3. Trình duyệt

**Cách thử:**
- URL `?tactics=1&skills2=1&boss2=1`, chạy trên localhost.
- Vào game bằng input thật: chơi khách → E → chọn công pháp.
- Pane bị ẩn nên game chạy bằng `__game.step()`.
- Dùng hook để: tua tới 5:56, đặt độ khó Linh, giữ máu Yêu Vương 25–45 %, dịch người chơi lại gần hoặc ra xa boss.

**Ảnh chụp:**
- `M10_11_nhan_chieu.png` (đồ họa Cao): nhãn **"Thập Tự Hắc Liệt"** màu cam ngay trên đầu Yêu Vương, hai dải thập tự viền đỏ.
- `M10_11_do_hoa_thap.png` (đồ họa **Thấp**): cảnh báo Ma Quang Hoành Tảo vẫn đủ — viền chấm nửa vòng, vạch tia xuất phát, mũi tên.

**Chưa xác minh được bằng hình** (pane ẩn, cửa sổ thu nhỏ làm trang ngừng vẽ):
- **Dòng tên chiêu và chữ pha trên thanh máu:** khung nền đã vẽ, nhưng chữ không có trong ảnh. Tên boss trên thanh máu cũng mất y như vậy trong mọi ảnh chụp bằng `step()` ở M10-09 và M10-10, trong khi vẫn hiện ở ảnh chụp thời gian thực của M10-03. Dòng mới dùng cùng hàm `txt` ở cùng chỗ, nên khả năng cao là do cách chụp. **Cần xem lại khi chơi thật.**
- **Bóng boss ở điểm Ảnh Độn:** ảnh chụp bị lệch khung — boss sát mép bản đồ, điểm đích nằm ngoài màn.

**Nghe âm thanh:** không nghe được trong môi trường thử. Chỉ xác minh bằng test sự kiện và khoảng nghỉ.

## 4. Nghiệm thu theo kế hoạch

| Tiêu chí | Tình trạng |
|---|---|
| Người chơi phân biệt được ít nhất 5/7 chiêu boss cuối khi xem đoạn ghi hình | **NOT VERIFIED.** Cần người xem thật và video. Hỗ trợ đã có: tên chiêu hiện chữ + hình cảnh báo riêng cho từng chiêu (tia tỏa / vòng nổ / vòng đập / vòng khép / bóng + vòng tím / nửa vòng + mũi tên / dải chữ thập). |
| Đồ họa Thấp vẫn có dấu báo | Có (ảnh + code không phụ thuộc mức đồ họa). |
| Không flash toàn màn liên tục | Không thêm flash. |

## 5. Rủi ro còn lại

1. Nhãn trên đầu boss có thể chồng thông báo đợt quái hoặc số sát thương khi đông.
2. Bóng boss màu trắng mờ có thể khó thấy trên nền đá sáng.
3. Chưa nghe thử âm `bossWarn` / `bossPhase` bằng tai, cần người phát triển nghe.
4. Hiệu năng không đo lại vì chỉ thêm vẽ. Đo ở M10-12.
5. Chữ trên thanh máu chưa thấy trong ảnh (mục 3).
