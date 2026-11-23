# M10-12 — Telemetry chiến đấu & benchmark A/B

**Ngày:** 23/11/2026. **Không đổi gameplay.** Chỉ thêm việc thu số liệu và công cụ đo.

## 1. Thu số liệu trong lượt (`src/systems/telemetry.js`)

`run.tele` luôn được tạo. Chi phí rất nhỏ (lấy mẫu đe dọa mỗi 10 tick) và tất định. Nhưng số liệu **chỉ được ghi ra** khi người chơi đã **bật "Ghi playtest" trong Cài đặt**. Đó là nhật ký M7-04 có sẵn: mặc định TẮT, lưu ở khóa riêng `tutien_playtest_v1`, **không gửi mạng**, chỉ xuất file khi người chơi bấm.

Sự kiện mới `combat_run` (một lần mỗi lượt), chỉ gồm các trường trong danh sách trắng:

| Trường | Ý nghĩa |
|---|---|
| `deathCause` | **Đòn kết liễu** (nguồn của cú đánh cuối), chính xác hơn trường `cause` cũ là "nguồn gây nhiều sát thương nhất" |
| `hitsBy` / `dmgBy` | Số lần trúng / sát thương theo từng kỹ năng (khóa = tên chiêu, xem `SKILL_NAMES`) |
| `threatPeak` | Đỉnh số đòn đặc biệt đang gồng/lao trong khung nhìn (+1 nếu có vùng boss chờ nổ) |
| `peakMonsters` / `peakShots` | Số quái / đạn quái nhiều nhất cùng lúc |
| `boss` | Với mỗi boss: thời điểm xuất hiện, vào P2, bị hạ, thời gian trận |
| `runTime`, `startSkill`, `difficulty`, `realm`, `outcome` | Bối cảnh lượt chơi |
| `flags` | `tactics` / `skillsV2` / `bossV2` đang bật hay tắt (để so A/B) |
| `workP50/P95`, `frameP50/P95` | Trình duyệt: thời gian xử lý mỗi khung và khoảng giữa hai khung, tối đa 20.000 khung mỗi lượt |

**Không có định danh:** không tên, không email, không uid. Seed và mã thử ngẫu nhiên có từ M7-04. CSV xuất các trường object dưới dạng JSON.

**Files:**
- `src/systems/telemetry.js` (mới)
- `src/systems/run.js`: `teleHit`, `teleTick`
- `src/systems/playtest.js`: sự kiện `combat_run`, xuất CSV
- `src/main.js`: ghi `combat_run` khi kết thúc lượt; ghi thời gian khung khi đang bật log
- `tools/sim.mjs`: trả `tele`
- `tools/m10_telemetry.mjs` (mới): A/B
- `tests/telemetry.test.js` (mới)

## 2. Test

`node --test tests/` → **296/296 PASS** (6 test mới):
- Đếm số lần trúng theo nguồn; nguyên nhân chết đúng là đòn kết liễu.
- Tất định: cùng seed cho cùng bản tóm tắt, cả AI cũ lẫn AI mới.
- Mốc boss xuất hiện / P2 / bị hạ / thời gian trận ghi đúng.
- AI mới có đỉnh đe dọa thấp hơn AI cũ trên cùng seed.
- **Nhật ký:**
  - chưa bật thì không ghi gì, kể cả khóa lưu;
  - bật rồi thì `combat_run` chỉ ghi một lần mỗi lượt;
  - trường lạ (`name`, `email`, `uid`) bị lọc;
  - **chỉ ghi khóa `tutien_playtest_v1`, không đụng `tutien_save*`**;
  - CSV không có `[object Object]`.
- Thời gian khung có trần 20.000 và tính p50/p95 đúng.

## 3. Trình duyệt (input thật)

Các bước đã làm:
1. Chơi khách → **Cài đặt** → trước khi bật, khóa `tutien_playtest_v1` **không tồn tại**.
2. Bấm **"Bật ghi playtest"** → chỉ có `session_start`.
3. Bấm E, chọn Kiếm Khí, chơi khoảng 20 s (game chạy bằng `step()`), rồi Esc → **"Rời bí cảnh"**.
4. Nhật ký có đủ `run_start`, `first_card`, `card_picked`, **`combat_run`**, `run_end`.

`combat_run` ghi được: `outcome: ABANDON`, `runTime: 20`, `hitsBy: {chaser: 4}`, `dmgBy: {chaser: 16}`, cờ cả ba đều `true`, `peakMonsters: 11`, `workP50/P95 = 0,4/1,1 ms`.

- Khóa localStorage sau khi chơi: `tutien_save_v2`, `tutien_save_v2_bak`, `tutien_playtest_v1`. Không có khóa lạ.
- Sau khi thử, tôi đã **tắt lại** "Ghi playtest".
- Lưu ý: vì chạy bằng `step()` (pane ẩn), `frameP50/P95` lúc này là khoảng giữa các lần gọi `step`, **không phải FPS thật**.

## 4. Benchmark khung hình

**Số liệu đo thật** (theo thời gian thực, pane hiển thị, desktop, đồ họa Cao, localhost):

| Lần đo | Khoảng giữa hai khung |
|---|---|
| M10-03 | p50 16,7 ms / p95 16,8 ms, 88 quái |
| M10-07 | p50 16,7 ms / p95 18,0 ms / max 29,5 ms, 3 Ma Ảnh + Yêu Vương |

Cả hai đều giữ khoảng 60 FPS.

**Logic** (`tools/m10_perf.mjs`, Node, cùng kịch bản stress): p95 tăng +18,1 % (0,601 → 0,710 ms) khi bật cả 3 cờ (M10-10).

**Điện thoại: NOT VERIFIED.** Chưa có thiết bị. Khi người thử trên điện thoại bật "Ghi playtest", số liệu `frameP50/P95` sẽ được ghi theo từng lượt.

## 5. A/B: AI cũ (tắt 3 cờ) và AI mới (bật cả 3) — cùng seed / build / cảnh giới

**Cách chạy:** `node tools/m10_telemetry.mjs 6 <cảnh giới> <độ khó>`. Đây là bot, không phải người thật. Số liệu thô nằm ở `docs/playtest/m10_12_ab_*.json`. Lưu ý: AI cũ không có cơ chế "vào P2" mới, nên cột P2 của AI cũ luôn bằng 0.

### Cảnh giới 0, độ khó 0 — 36 lượt mỗi chế độ (6 seed × 6 build)

| | AI cũ | AI mới |
|---|---|---|
| Thắng | 18/36 | 16/36 |
| Đỉnh đe dọa trong khung nhìn (TB / max) | 6,8 / 15 | 3,4 / 4 |
| Quái / đạn quái cùng lúc (max) | 55 / 35 | 45 / 24 |
| Lang Vương: gặp / hạ / vào P2 | 35 / 34 / 0 | 34 / 32 / 34 |
| Lang Vương: thời gian trận (trung vị / TB, s) | 40,4 / 43,1 | 42,4 / 45,5 |
| Yêu Vương: gặp / hạ / vào P2 | 27 / 18 / 0 | 27 / 16 / 24 |
| Yêu Vương: thời gian trận (trung vị / TB, s) | 85,6 / 97,1 | 66,6 / 79,3 |
| Logic ms/tick (node) | 0.0811 | 0.0894 |

**Nguồn gây chết (đòn kết liễu)**

| Nguồn | AI cũ | AI mới | |
|---|---|---|---|
| chaser | 5 | 4 | `████████████████` |
| boss:sweep | 0 | 5 | `████████████████████` |
| elite | 2 | 2 | `████████` |
| boss:slam | 3 | 0 | `` |
| ranged:shot | 1 | 2 | `████████` |
| boss:zone | 1 | 1 | `████` |
| charger:dash | 2 | 0 | `` |
| miniboss | 1 | 1 | `████` |
| boss:burst | 1 | 0 | `` |
| elite:slam | 1 | 0 | `` |
| miniboss:dash | 0 | 1 | `████` |
| chaser:pounce | 0 | 1 | `████` |
| boss:cross | 0 | 1 | `████` |
| boss | 0 | 1 | `████` |
| charger | 0 | 1 | `████` |

**Số lần trúng đòn trung bình mỗi lượt theo kỹ năng**

| Nguồn | AI cũ | AI mới | |
|---|---|---|---|
| chaser | 8,3 | 8,6 | `████████████████████` |
| ranged:shot | 3,5 | 2,2 | `█████` |
| charger | 0,8 | 1,1 | `███` |
| charger:trail | 0 | 1 | `██` |
| boss | 0,7 | 0,8 | `██` |
| ranged:fan | 0 | 0,8 | `██` |
| boss:sweep | 0 | 0,7 | `██` |
| miniboss | 0,8 | 0,7 | `██` |
| elite | 1 | 0,7 | `██` |
| charger:dash | 1,1 | 0,6 | `█` |
| miniboss:claw | 0 | 0,4 | `█` |
| miniboss:dash | 1,2 | 0,3 | `█` |
| boss:zone | 0,4 | 0,2 | `` |
| boss:burst | 0,3 | 0,1 | `` |
| boss:slam | 0,4 | 0,1 | `` |
| chaser:pounce | 0 | 0,1 | `` |
| boss:cross | 0 | 0,1 | `` |
| elite:slam | 0,2 | 0 | `` |


### Cảnh giới 9, độ khó 0 — 36 lượt mỗi chế độ (6 seed × 6 build)

| | AI cũ | AI mới |
|---|---|---|
| Thắng | 28/36 | 30/36 |
| Đỉnh đe dọa trong khung nhìn (TB / max) | 6,4 / 10 | 3,5 / 4 |
| Quái / đạn quái cùng lúc (max) | 48 / 20 | 38 / 23 |
| Lang Vương: gặp / hạ / vào P2 | 35 / 35 / 0 | 35 / 35 / 35 |
| Lang Vương: thời gian trận (trung vị / TB, s) | 35,7 / 41,6 | 29 / 34,9 |
| Yêu Vương: gặp / hạ / vào P2 | 34 / 28 / 0 | 34 / 30 / 33 |
| Yêu Vương: thời gian trận (trung vị / TB, s) | 72,5 / 78 | 65,4 / 74,8 |
| Logic ms/tick (node) | 0.0845 | 0.0834 |

**Nguồn gây chết (đòn kết liễu)**

| Nguồn | AI cũ | AI mới | |
|---|---|---|---|
| chaser | 2 | 2 | `████████████████████` |
| ranged:shot | 1 | 2 | `████████████████████` |
| boss:slam | 2 | 0 | `` |
| boss:sweep | 0 | 2 | `████████████████████` |
| charger | 1 | 0 | `` |
| boss:burst | 1 | 0 | `` |
| boss:zone | 1 | 0 | `` |

**Số lần trúng đòn trung bình mỗi lượt theo kỹ năng**

| Nguồn | AI cũ | AI mới | |
|---|---|---|---|
| chaser | 5,7 | 5,6 | `████████████████████` |
| ranged:shot | 3 | 2 | `███████` |
| charger:trail | 0 | 1,3 | `█████` |
| boss | 1 | 0,8 | `███` |
| charger | 0,4 | 0,6 | `██` |
| ranged:fan | 0 | 0,6 | `██` |
| miniboss | 0,5 | 0,5 | `██` |
| boss:sweep | 0 | 0,5 | `██` |
| elite | 0,8 | 0,4 | `█` |
| miniboss:dash | 0,6 | 0,4 | `█` |
| charger:dash | 0,6 | 0,3 | `█` |
| boss:burst | 0,2 | 0,2 | `█` |
| boss:zone | 0,3 | 0,1 | `` |
| miniboss:claw | 0 | 0,1 | `` |
| elite:slam | 0,1 | 0,1 | `` |
| boss:slam | 0,6 | 0 | `` |
| chaser:pounce | 0 | 0 | `` |


### Cảnh giới 9, độ khó 1 — 36 lượt mỗi chế độ (6 seed × 6 build)

| | AI cũ | AI mới |
|---|---|---|
| Thắng | 13/36 | 10/36 |
| Đỉnh đe dọa trong khung nhìn (TB / max) | 6,7 / 16 | 3,1 / 4 |
| Quái / đạn quái cùng lúc (max) | 53 / 32 | 46 / 21 |
| Lang Vương: gặp / hạ / vào P2 | 33 / 30 / 0 | 30 / 27 / 30 |
| Lang Vương: thời gian trận (trung vị / TB, s) | 39,8 / 48,1 | 39,1 / 44,9 |
| Yêu Vương: gặp / hạ / vào P2 | 24 / 13 / 0 | 17 / 10 / 13 |
| Yêu Vương: thời gian trận (trung vị / TB, s) | 67,8 / 74,9 | 68,1 / 69,1 |
| Logic ms/tick (node) | 0.0808 | 0.0829 |

**Nguồn gây chết (đòn kết liễu)**

| Nguồn | AI cũ | AI mới | |
|---|---|---|---|
| chaser | 9 | 7 | `████████████████` |
| boss | 3 | 2 | `████` |
| ranged:shot | 1 | 4 | `█████████` |
| charger:dash | 3 | 1 | `██` |
| miniboss:dash | 2 | 2 | `████` |
| elite | 1 | 2 | `████` |
| boss:slam | 2 | 1 | `██` |
| boss:sweep | 0 | 3 | `███████` |
| boss:zone | 1 | 0 | `` |
| boss:prison | 1 | 0 | `` |
| charger | 0 | 1 | `██` |
| chaser:pounce | 0 | 1 | `██` |
| miniboss | 0 | 1 | `██` |
| boss:prisonShot | 0 | 1 | `██` |

**Số lần trúng đòn trung bình mỗi lượt theo kỹ năng**

| Nguồn | AI cũ | AI mới | |
|---|---|---|---|
| chaser | 9 | 8,8 | `████████████████████` |
| ranged:shot | 3,3 | 2,3 | `█████` |
| charger | 1,1 | 1,6 | `████` |
| elite | 0,8 | 0,8 | `██` |
| ranged:fan | 0 | 0,7 | `██` |
| charger:dash | 0,9 | 0,6 | `█` |
| miniboss | 1 | 0,6 | `█` |
| charger:trail | 0 | 0,6 | `█` |
| miniboss:dash | 0,9 | 0,5 | `█` |
| boss | 0,4 | 0,4 | `█` |
| chaser:pounce | 0 | 0,4 | `█` |
| miniboss:claw | 0 | 0,3 | `█` |
| boss:sweep | 0 | 0,3 | `█` |
| boss:zone | 0,1 | 0,1 | `` |
| elite:claw | 0 | 0,1 | `` |
| boss:prisonShot | 0 | 0,1 | `` |
| boss:slam | 0,2 | 0,1 | `` |
| boss:burst | 0 | 0,1 | `` |
| elite:slam | 0,1 | 0 | `` |
| boss:prison | 0,2 | 0 | `` |

## 6. Đọc số liệu

1. **AI mới giảm mạnh số đòn chồng nhau.** Đỉnh đe dọa trong khung nhìn trung bình giảm khoảng một nửa (≈ 6,5 → 3,3), và tối đa từ 10–16 xuống **4**. Ngân sách đe dọa (M10-02/03/08) hoạt động đúng.
2. **Tỉ lệ thắng gần như giữ nguyên**, nhưng chết vì những đòn khác:

   | Cảnh giới / độ khó | AI cũ | AI mới |
   |---|---|---|
   | Cảnh giới 0, Phàm | 18/36 | 16/36 |
   | Cảnh giới 9, Phàm | 28/36 | 30/36 |
   | Cảnh giới 9, Linh | 13/36 | 10/36 |

3. **Ma Quang Hoành Tảo là đòn kết liễu nhiều nhất** ở cảnh giới 0 với AI mới (5/20 lượt thua), trong khi chỉ chiếm khoảng 0,7 lần trúng mỗi lượt. Đòn này ít trúng nhưng thường là đòn cuối, nên nên ưu tiên đưa cho người thật xem xét (M10-13).
4. **Trận Yêu Vương ngắn hơn:** trung vị 85,6 → 66,6 s ở cảnh giới 0, do có sơ hở sau mỗi chiêu và choáng khi chuyển pha. **Trận Lang Vương gần như không đổi** (khoảng 40 s).
5. **Đạn quái cùng lúc giảm** (35 → 24 ở cảnh giới 0) nhờ Tam Băng Tiễn thay tiễn đơn và giới hạn quạt.
6. **Logic khoảng 0,08–0,09 ms/tick** cho cả hai chế độ trong kịch bản sim này (kịch bản stress riêng: +18 % p95, xem M10-10).

## 7. Nghiệm thu M10-12

| Yêu cầu | Tình trạng |
|---|---|
| Bảng / biểu đồ nguồn chết, số lần trúng theo kỹ năng, thời gian trận boss | Có (mục 5, kèm thanh chữ ` █ `) |
| p50/p95 thời gian khung, số quái và đạn | Có (mục 4, mục 5) |
| Không gửi mạng khi người chơi chưa đồng ý | Đúng: cả hệ thống không gửi mạng; chỉ ghi khi người chơi bật |
| Không ghi định danh không cần thiết | Đúng (test lọc trường) |
| Đo trên điện thoại | **NOT VERIFIED** |
| So A/B cờ cũ/mới cùng seed/build | Có (`tools/m10_telemetry.mjs`) |

## 8. Rủi ro còn lại
- `threatPeak` đếm cả vùng nổ boss như một mối đe dọa; đây là chỉ số so sánh, không phải ngân sách thật của game.
- Đo khung hình trên trình duyệt chỉ đúng khi tab hiển thị. Nếu tab ẩn, rAF bị trình duyệt hãm.
- Chưa có số liệu từ người thật. Việc đó thuộc M10-13.
