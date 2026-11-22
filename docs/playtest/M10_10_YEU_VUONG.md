# M10-10 — Ma Ảnh Yêu Vương 2 pha / 7 chiêu

**Ngày:** 22/11/2026.

**Cờ:** dùng chung `FEATURES.bossPatternsV2`, **mặc định TẮT**. Muốn thử thì dùng `?tactics=1&skills2=1&boss2=1`. Khi tắt cờ, Yêu Vương giữ nguyên như cũ.

## 1. Pha và bộ chiêu

**Pha:**
- Có **đúng 2 pha**.
- Ngưỡng chuyển pha **giữ nguyên giá trị hiện có** (`BOSS.FINAL.PHASE2` = 50 %). `BOSS_V2.FINAL.PHASE2 = null` nghĩa là "dùng giá trị cũ"; không đặt ngưỡng mới.
- Chuyển pha diễn ra **1 lần**, chỉ giữa hai chiêu. Khi chuyển có thông báo "Ma Ảnh Yêu Vương hiện chân thân — coi chừng tia quét và thập tự!", kèm **choáng 1,2 s (sơ hở)**.
- **Cuồng nộ** (sau 150 s) vẫn là cơ chế cũ, chỉ là trạng thái trong P2. **Không có P3.**

**Bộ chiêu:**

| # | Chiêu | Pha | Cảnh báo / cách né |
|---|---|---|---|
| 1 | Hắc Ám Đạn Trận (`burst`) | P1 + P2 | Tia báo hướng đạn; đứng giữa hai tia. Không ra khi Lao Tù đang chờ nổ. |
| 2 | Hắc Diễm Truy Sát (`zones`) | P1 + P2 | Vòng nổ có lối thoát (M10-03). |
| 3 | Chấn Địa (`slam`) | P1 + P2 | Hồi chiêu 6 s, chống spam khi đứng sát (M10-02). |
| 4 | Ma Ảnh Lao Tù (`prison`, chỉ remix / độ khó Linh+) | P1 **sau 25 s làm quen**, P2 | Đứng giữa vòng. Không ra cùng lúc với Thập Tự. |
| 5 | **Ảnh Độn** (`shadow`, mới) | **P2** | Xem mục 1.1. |
| 6 | **Ma Quang Hoành Tảo** (`sweep`, mới) | **P2** | Xem mục 1.2. |
| 7 | **Thập Tự Hắc Liệt** (`cross`, mới) | **P2** | Xem mục 1.3. |

### 1.1 Ảnh Độn
- Vòng tím kèm đường chấm báo điểm Yêu Vương sắp hiện ra, trong **0,9 s**; trong thời gian này boss đứng yên.
- Điểm hiện ra cách người chơi **95–140 px** và phải là ô đứng được.
- Hiện ra xong thì **sơ hở**, không cắn trong RECOVER + 0,8 s.

### 1.2 Ma Quang Hoành Tảo
- **Báo trước 1,1 s:** viền nửa vòng bán kính 180 px, có mũi tên vàng chỉ chiều quét và vạch tia xuất phát.
- **Tia không bắt đầu trên người người chơi:** góc xuất phát lệch khỏi người chơi 1 rad.
- **Quét nửa vòng trong 1,4 s**, trúng tối đa 1 lần.
- **Cách né:** ra khỏi tầm 180 px, hoặc đứng ở nửa vòng không bị quét.

### 1.3 Thập Tự Hắc Liệt
- Hai **dải nổ vuông góc** (dài 260 px, rộng 28 px), giao nhau tại vị trí người chơi lúc khóa. Có xoay 0° hoặc 45°.
- Dải lấp tím từ giữa ra, nổ sau **1,4 s**.
- **Cách né:** bước theo đường chéo vào một trong 4 góc.
- Phải **qua kiểm tra lối thoát**. Nếu bị bịt thì đổi sang đạn tỏa.
- Không ra cùng lúc với Lao Tù.

### Chọn chiêu và sau chiêu
- **Selector:** dùng `FINAL_V2`, chọn theo tầm, pha, vùng đang có; có hồi chiêu (Ảnh Độn 8 s, Hoành Tảo / Thập Tự 7 s) và chống lặp 3 lần liên tiếp.
- **Chiêu nặng:** Hoành Tảo và Thập Tự tính là chiêu nặng (`TACTICS.HEAVY`).
- **Sau mỗi chiêu** boss đều sơ hở (`RECOVER`).

### Hạ tầng mới
- **Vùng nổ dạng dải:** `hazardDist`, dùng chung cho sát thương, kiểm tra lối thoát (M10-03), hình nguy hiểm (M10-08), cách vẽ và bot né.
- **Trần vùng nổ** của Yêu Vương V2 tăng lên 14 vì thêm 2 dải thập tự.

## 2. Files

| File | Thay đổi |
|---|---|
| `src/entities/bosses.js` | Pha 2 dùng ngưỡng cũ; chiêu `shadow` (dùng trạng thái `blink` có báo, thêm `blinkSkill` để vào sơ hở), `sweep` (trạng thái `sweep`, `sweepHits`), `cross` (2 dải qua `placeZones`); `updateHazards` dùng `hazardDist`; trần vùng theo V2 |
| `src/systems/tactics.js` | `hazardDist`; `FINAL_V2`; `PRISON_ON` / `CROSS_ON`; kiểm tra lối thoát và hình nguy hiểm hiểu được dải |
| `src/core/config.js` | `BOSS_V2.FINAL`, `HEAVY` / `SKILL_CD`, tên chiêu |
| `src/render/render.js` | Dải nổ (`stripOutline`, lấp theo bề rộng), nửa vòng + mũi tên + vạch xuất phát (`sweepOutline`), tia đang quét (`drawSweepBeam`), viền ở lớp trên tán cây |
| `tools/sim.mjs` | Bot né dải (điểm gần nhất) và ra khỏi tầm tia |
| `tools/m10_perf.mjs` | Đo cả `bossV2` |
| `tests/boss_final_v2.test.js` (mới) | 8 test |

## 3. Test

`node --test tests/` → **286/286 PASS** (8 test mới):

- **Cờ tắt:** không có 3 chiêu mới, không có thông báo chuyển pha mới.
- **Chuyển pha** (3 seed, chạy quá 150 s để có cuồng nộ):
  - **đúng 1 lần chuyển pha**, cuồng nộ không tạo pha 3;
  - 3 chiêu mới không bao giờ ra ở P1;
  - Lao Tù ở P1 chỉ ra sau 25 s.
- **Đủ chiêu** (độ khó Linh, 4 seed):
  - **đủ 7 chiêu**;
  - không chiêu nào ra 3 lần liên tiếp;
  - mọi nguồn sát thương đều có tên.
- **Thập Tự:**
  - 2 dải vuông góc, đi qua vị trí người chơi;
  - không bao giờ cùng lúc với Lao Tù;
  - đứng giữa thì trúng, và chỉ trúng sau khi gồng xong;
  - bước theo phân giác ra góc thì né được.
- **Hoành Tảo:**
  - tia xuất phát lệch khỏi người chơi ≥ 1 rad;
  - đứng yên thì trúng, chỉ trúng sau khi gồng xong;
  - ra khỏi tầm hoặc đứng ở nửa vòng bên kia thì không trúng.
- **Ảnh Độn:**
  - đứng yên đủ thời gian báo trước;
  - hiện ra ở ô đứng được, cách người chơi 95–140 px;
  - sau đó vào trạng thái sơ hở, không cắn ngay.
- **Lối thoát:** mọi lần thả vùng (≥ 15 lần, gồm cả Thập Tự và Lao Tù) người chơi đều còn đường thoát.
- **Boss chết khi đang có vùng nổ:**
  - dọn sạch vùng nổ và đạn tối;
  - không gây sát thương sau khi chết;
  - thưởng Yêu Vương đúng 1 lần, kết quả WIN.

## 4. Mô phỏng bot (không phải người chơi thật)

**Thiết lập:** bật cả 3 cờ. Lần chạy có `boss2` cho cả Lang Vương lẫn Yêu Vương.

| | Phàm, cảnh giới 0 (60 lượt) | Phàm, cảnh giới 9 (36 lượt) | Linh, cảnh giới 9 (36 lượt) |
|---|---|---|---|
| M10-09 (chỉ Lang Vương mới) | 33/60 | 32/36 | 11/36 |
| **M10-10** | **29/60** | **30/36** | **10/36** |

**Chiêu Yêu Vương đã dùng** (18 lượt, cảnh giới 9):

| Chiêu | Số lần |
|---|---|
| burst | 112 |
| zones | 88 |
| slam | 37 |
| **sweep** | **33** |
| **cross** | **28** |
| **shadow** | **9** |

**Sát thương bot nhận từ Yêu Vương:**
- Ma Quang Hoành Tảo **8,9–10,7 %**, nhiều nhất trong các chiêu của boss;
- cắn 9–10 %;
- Thập Tự chỉ 0–1,3 %.

**Nguồn gây chết ở Phàm cảnh giới 0:** Dã Lang 19, **Yêu Vương 4** (3 lần cắn, 1 lần Hoành Tảo), băng tiễn 3. Yêu Vương khó hơn rõ, và đòn khó né nhất là tia quét.

**Hiệu năng:** dùng `tools/m10_perf.mjs`, cùng kịch bản stress, 72.000 tick mỗi chế độ, gồm cả `bossV2`.

| | AI cũ | AI mới |
|---|---|---|
| p95 | 0,601 ms | 0,710 ms |

→ **+18,1 %**, vẫn dưới ngưỡng 20 % nhưng **đã sát ngưỡng**. Trung bình tăng +16 %.

## 5. Trình duyệt

**Cách chạy:**
- Flag: `?tactics=1&skills2=1&boss2=1`, localhost.
- Vào game bằng input thật: chơi khách → E → chọn công pháp.
- Game chạy bằng `__game.step()`.

**Hook dùng để chụp ảnh:**
- tua thời gian tới 5:56;
- `run.diff = 1`;
- bỏ qua Lang Vương;
- giữ máu đầy;
- giữ máu Yêu Vương trong khoảng 25–45 % để vào P2;
- dịch người chơi khi đứng quá sát boss.

**Ảnh:**
- `M10_10_chuyen_pha.png`: Yêu Vương choáng sau khi chuyển pha.
- `M10_10_hoanh_tao_bao.png`: cảnh báo nửa vòng — viền chấm đỏ, vạch tia xuất phát, mũi tên vàng chỉ chiều quét.
- `M10_10_hoanh_tao.png`: tia tím đang quét qua.
- `M10_10_thap_tu.png`: hai dải chéo 45° viền đỏ, giao nhau ở vị trí người chơi.
- `M10_10_anh_don.png`: Yêu Vương đứng yên, vòng tím báo điểm hiện ra.

Chiêu ghi nhận trong lượt: burst ×2, zones, sweep, cross, shadow.

**Lỗi ghi nhận lúc thử:** một lần lượt chơi kết thúc thua vì máy chậm, script giữ máu không chạy kịp. Đây là lỗi của cách thử, không phải lỗi game.

**Video:** chưa có (**NOT VERIFIED**). Cần người phát triển quay.

## 6. Rủi ro còn lại

1. **Ma Quang Hoành Tảo là đòn gây sát thương cao nhất của boss** với bot (khoảng 10 %). Lý do là né phải hiểu "sang nửa vòng bên kia" hoặc chạy xa 180 px. Nếu người thật thấy bất công, có thể chỉnh trong config:
   - giảm `L`;
   - tăng `WINDUP` hoặc `TIME`;
   - tăng `SAFE_START`.
2. **Hiệu năng +18,1 %, sát ngưỡng 20 %.** Thêm kỹ năng ở M10-11+ có thể vượt ngưỡng, nên đo lại mỗi lần thêm.
3. **Vòng báo Ảnh Độn nhỏ (r = 22), dễ lẫn** với vòng giải kẹt. M10-11 nên thêm bóng mờ của Yêu Vương ở điểm hiện ra.
4. **Nửa vòng Hoành Tảo chỉ là viền chấm**, có thể khó thấy khi đông quái. Lớp trên tán cây vẫn có viền.
5. Tia Hoành Tảo chưa nằm trong "hình nguy hiểm" của quái thường (M10-08), nên quái thường vẫn có thể gồng đòn trong lúc tia đang quét.
6. Chưa có video, chưa có người chơi thật, chưa đo trên điện thoại.

## 7. GATE M10-C (sau M10-11) — tình trạng hiện tại

| Tiêu chí | Tình trạng |
|---|---|
| Mỗi boss đúng 2 pha | Đạt (test) |
| Bộ kỹ năng mở theo pha | Đạt (test) |
| Mọi đòn có đáp án né | Đạt (test né từng chiêu) |
| Save / reward / map không hỏng | Đạt (test thưởng 1 lần, 286/286 PASS) |
| Lượt chơi tay đầy đủ có quay phim | **Chưa có (NOT VERIFIED)** |
| Mức độ hấp dẫn | **NOT VERIFIED** |
