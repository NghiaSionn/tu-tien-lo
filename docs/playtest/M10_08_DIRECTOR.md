# M10-08 — Director phối bầy có vai trò (+ số liệu GATE M10-B)

**Ngày:** 22/11/2026.

**Cờ:** dùng chung `FEATURES.enemySkillsV2`, **mặc định TẮT**, chỉ ở chế độ đấu trường. Thử bằng `?tactics=1&skills2=1`. Khi tắt cờ, director chạy y như cũ.

## 1. Thay đổi so với M10-04…07

### Ba mẫu đội hình (`SQUADS`)
- Đội đầu ra ở 60 s, sau đó cứ 38 s một đội, xoay vòng theo thứ tự sau (chỉ dùng mẫu đã tới mốc mở):

  | Mẫu | Thành phần | Mở từ |
  |---|---|---|
  | **packFlank** | 4 Dã Lang cùng một hướng | 40 s |
  | **chargerRanged** | 2 Hỏa Hồ tiền tuyến + 2 Huyền Băng Thú lùi sau 45 px | 95 s |
  | **eliteFodder** | 1 Ma Ảnh + 4 Dã Lang | 130 s |

- Cả đội sinh **cùng một hướng**, cách người chơi khoảng 300 px, **ngoài khung nhìn**.
- Đội phải **vừa ngân sách cost** (`budgetAt − cost đang sống`). Từ 6 s trước giờ ra đội (`LEAD`), quái lẻ tạm dừng để dành ngân sách. Có boss thì không ra đội.
- Khi bật cờ, **Ma Ảnh chỉ đến theo đội eliteFodder** (tinh anh kèm quái đệm), không còn xuất hiện lẻ theo giờ.

### Specialist cap + giới thiệu dần (`SPECIALISTS`)
- Lúc sinh, mỗi con được gán `m.spec = true` nếu **đã tới mốc giới thiệu** của loài đó **và còn chỗ**. Chỉ con `spec` mới dùng được kỹ năng M10-04…07:

  | Loài | Kỹ năng | Tối đa cùng lúc | Từ |
  |---|---|---|---|
  | Dã Lang | chồm / vòng sườn | 6 | 40 s |
  | Hỏa Hồ | Hỏa Vĩ | 4 | 100 s |
  | Huyền Băng Thú | Tam Băng Tiễn | 3 | 150 s |
  | Ma Ảnh | Ảnh Bộ / Hắc Trảo | 2 | 130 s |

- Những con khác đánh như cũ. Đúng yêu cầu của kế hoạch: *"không cho toàn bộ Dã Lang dùng nhảy chồm…"*.

### Chống bịt kín lối né (`TACTICS.NEW_ESCAPE_T` = 0,5 s)
- Mỗi tick, AI tính các **hình nguy hiểm** đang có cảnh báo, theo đúng hình học trúng đòn:
  - vùng boss;
  - vệt lửa;
  - đường lao, chồm, bắn (khi đang lao chỉ tính phần đường còn lại);
  - vòng đập đất và Hắc Trảo.
- Trước khi một quái thường **bắt đầu gồng** đòn mới (lao, chồm, bắn đơn hoặc quạt, đập đất, Hắc Trảo), AI thêm hình của đòn đó vào và kiểm tra: người chơi còn **điểm an toàn đứng được trong tầm đi bộ 0,5 s** không (16 hướng × 2 tầm, hoặc đứng yên nếu chỗ đang đứng đã an toàn)?
- Nếu hết lối né: con đó **không gồng** và thử lại sau `RETRY`.
- Đây là phần mở rộng của M10-03: lúc đó mới chỉ áp dụng cho vùng nổ của boss.

### Công cụ
- `tools/m10_perf.mjs`: đo thời gian logic mỗi tick, AI cũ và AI mới trên **cùng kịch bản stress**, chạy xen kẽ.

## 2. Files

| File | Nội dung |
|---|---|
| `src/core/config.js` | `SQUADS`, `SPECIALISTS`, `TACTICS.NEW_ESCAPE_T` |
| `src/systems/director.js` | `nextSquad`, `squadCost`, `trySquad`, giữ chỗ ngân sách, gán `m.spec`, tắt Ma Ảnh lẻ khi bật cờ, nhật ký `dir.squads` |
| `src/systems/tactics.js` | `dangerShapes`, `safeWith`, `seg`, `fanSegs`; `claimSpecial(io, m, player, extra)` kiểm tra lối thoát |
| `src/entities/archetypes.js` | Mỗi đòn mới truyền hình của nó cho `claimSpecial`; quạt / Ảnh Bộ / Hắc Trảo chỉ cho specialist |
| `src/systems/packs.js`, `src/systems/firetrail.js` | Chồm / vòng sườn và Hỏa Vĩ chỉ cho specialist |
| `tests/squads.test.js` (mới) | 7 test |
| 3 file test M10-05…07 | Gán `spec = true` cho quái tự tạo trong test (để thử cơ chế, không phụ thuộc cap) |
| `tools/m10_perf.mjs` (mới) | Benchmark |

## 3. Test

`node --test tests/` → **271/271 PASS** (7 test mới):
- **Tắt cờ:** không có đội, không gán specialist.
- **Đội hình** (3 seed):
  - Đội đầu ra từ 60 s; hai đội cách nhau ≥ 37 s.
  - Không đội nào ra trước mốc mở hoặc khi boss còn sống.
  - **Đủ cả 3 mẫu.**
- **Ngân sách:** mọi đội đều `cost trước + cost đội ≤ ngân sách` lúc sinh, và mọi thành viên sinh cách người chơi > 250 px.
- **Specialist:**
  - Số specialist đang sống mỗi loài không vượt cap; không có specialist trước mốc.
  - Con thường không bao giờ chồm, vòng sườn, bắn quạt, Ảnh Bộ hay Hắc Trảo.
- **Lối thoát:** 4 seed × 2 độ khó (Phàm, Linh), chạy tới sau Yêu Vương.
  - **5.065 lần** quái bắt đầu gồng khi người chơi đang trong vùng cảnh báo → **lần nào người chơi cũng còn chỗ né**.
  - Người chơi đi mù theo vòng cố định (xuyên cả cây vì test đặt tọa độ thẳng) có 80.830 khung đứng trong cảnh báo; chỉ **31 khung (0,04 %)** bị bịt kín. Đó là do người đi tiếp vào chỗ hẹp sau khi đòn đã khóa, không phải do đòn mới.
- **Tất định:** cùng seed cho cùng chuỗi đội và cùng specialist.

## 4. GATE M10-B — hiệu năng (cùng kịch bản stress)

**Cách đo:** `tools/m10_perf.mjs`, 4 seed × 3 lần lặp xen kẽ, 400 s mỗi lượt, tối đa 91 quái, 144.000 tick mỗi chế độ. Số liệu thô ở `docs/playtest/m10_08_perf.json`.

| ms/tick (chỉ logic) | AI cũ (tắt cờ) | AI mới (tactics + skills2) | Tăng |
|---|---|---|---|
| trung bình | 0,282 | 0,322 | +14,1 % |
| p50 | 0,257 | 0,309 | |
| **p95** | **0,680** | **0,743** | **+9,3 %** (ngưỡng 20 %) |
| p99 | 1,12 | 1,37 | |

→ **Đạt** điều kiện hiệu năng của GATE M10-B. Ngân sách khung hình là 16,7 ms.

## 5. Mô phỏng bot (không phải người chơi thật)

Bật cả `tactics` và `skills2`; bot né đủ cảnh báo.

| | Phàm, cảnh giới 0 (60) | Phàm, cảnh giới 9 (36) | Linh, cảnh giới 9 (36) |
|---|---|---|---|
| Tắt hết cờ | 31/60 (trùng từng seed với M10-01) | 28/36 | 13/36 |
| M10-07 | 30/60 | 25/36 | 8/36 |
| **M10-08** | **34/60** | **33/36** | **9/36** |

- **Kết quả theo seed, Phàm cảnh giới 0:**
  - kiem_loi: WWWWWWWWWW
  - phi_kiem_hoa: WLWWLLLLWW
  - hoa_phong: WWLLLLWLLW
  - loi_the: WWLWWWWWLL
  - bang_han: LWWWWLLWWW
  - linh_phong: LLLLLLWLLL
- **Nguồn gây chết ở L0:** Dã Lang cắn 18 · băng tiễn 7 · Ma Ảnh 1. **Không lượt nào chết vì boss.** Hạ Lang Vương 53/60 lượt (baseline 54/60), nên **trận boss vẫn kiểm soát được**.
- **Game dễ hơn M10-07**, vì ba thay đổi:
  - cap specialist: không còn mọi con đều dùng kỹ năng;
  - Ma Ảnh ít hơn (chỉ đến theo đội);
  - kiểm tra lối thoát chặn những tổ hợp đòn bất công.

  Đây là đúng mục tiêu "khó vì quyết định, không vì dồn đòn". Muốn khó hơn thì chỉnh trong config:
  - tăng `SPECIALISTS.CAP`;
  - giảm `SQUADS.EVERY`;
  - thêm mẫu đội.
- **Ở độ khó Linh** game vẫn rất khó với bot (9/36). Gây chết chủ yếu là Dã Lang cắn (17).

## 6. Trình duyệt

**Cách thử:** `?tactics=1&skills2=1`, localhost. Vào bằng input thật (chơi khách → E → chọn công pháp). Pane bị ẩn nên game chạy bằng `__game.step()`; tôi tua thời gian tới 0:57 và giữ máu đầy.

**Nhật ký đội trong lượt:**

| Thời điểm | Mẫu | Số con | Cost đội | Cost đang sống trước đó / ngân sách |
|---|---|---|---|---|
| 60 s | packFlank | 4 | 4 | 8/46 |
| 98 s | chargerRanged | 4 | 8 | 10/61 |
| 136 s | eliteFodder | 5 | 12 | 8/76 |

- Ở 62 s có 6 Dã Lang specialist (đúng cap).
- `M10_08_doi_soi.png`: đội 4 Dã Lang áp sát cùng một hướng, có cảnh báo chồm.
- Ảnh hai đội còn lại không rõ vì kỹ năng người chơi đã hạ gần hết đội khi họ vào màn, nên tôi không lưu.

## 7. Rủi ro còn lại / việc cho GATE M10-B

1. **Bot thắng nhiều hơn** (Phàm L9 33/36). Nếu người phát triển muốn game khó hơn, có thể chỉnh trong config như mục 5 (không giảm thiên kiếp).
2. Phần chống bịt kín chỉ đảm bảo **tại lúc bắt đầu gồng**. Người chơi tự đi vào chỗ hẹp sau đó vẫn có thể bị kẹt (0,04 % khung ở bot đi mù).
3. Đòn của boss (Lang Vương lao, Yêu Vương) không qua bước kiểm tra lối thoát của quái thường. Vùng nổ của Yêu Vương đã có kiểm tra riêng từ M10-03.
4. Thông báo đội dùng chung kiểu thông báo đợt quái. Có thể trùng lúc với thông báo đợt của biến thể bí cảnh.
5. **Tiêu chí "phân biệt loài bằng hành vi, không chỉ màu"** cần **người thật** đánh giá. Chưa có playtest người thật, chưa đo trên điện thoại.

**GATE M10-B** — chờ người phát triển duyệt:

| Tiêu chí | Trạng thái |
|---|---|
| 3 đội hình hoạt động | Đạt |
| Mỗi chiêu có cách phản ứng rõ | Có (mục "Né" trong báo cáo M10-04…07) |
| Hiệu năng p95 +9,3 % (ngưỡng 20 %) | Đạt |
| Phân biệt loài bằng hành vi | Cần người thật |
