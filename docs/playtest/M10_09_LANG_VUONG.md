# M10-09 — Lang Vương 2 pha / 5 chiêu

**Ngày:** 22/11/2026.

**Cờ mới:** `FEATURES.bossPatternsV2`, **mặc định TẮT**. Thử bằng `?tactics=1&skills2=1&boss2=1`; với sim dùng `BOSS2=1`. Khi tắt cờ, Lang Vương giữ nguyên như M9/M10-02. Cờ này chưa động tới Yêu Vương; Yêu Vương là việc của M10-10.

## 1. Bộ chiêu

| # | Chiêu | Pha | Cảnh báo / cách né | Sau chiêu |
|---|---|---|---|---|
| 1 | **Tam Liên Lao** (giữ) | P1 + P2 | Đường lao đỏ cho từng cú; né ngang | Sơ hở 1,4 s |
| 2 | **Lang Hú** (giữ) | P1 + P2 | Vòng vàng lớn dần. Chỉ hú khi số sói đàn còn sống + 4 ≤ 8, nên đàn không bao giờ quá 8 con | Sơ hở |
| 3 | **Liệt Trảo Hình Quạt** (mới) | P1 + P2 | Gồng 0,8 s, khóa hướng, quét quạt ~126° bán kính 72 px; lấp tím dần, viền đỏ viền tối. Né bằng cách lùi khỏi tầm hoặc vòng ra sau lưng | Sơ hở |
| 4 | **Hú Rồi Lao** (giữ, độ khó Linh+) | **chỉ P2** | Như hú, rồi các cú lao có đường cảnh báo | Sơ hở |
| 5 | **Vồ Đầu Đàn** (mới) | **chỉ P2** | Xem chi tiết bên dưới | Sơ hở 1,4 s |

**Chi tiết Vồ Đầu Đàn:**
- **Dấu đáp:** vòng nổ bán kính 34 px, đặt tại vị trí người chơi cộng vận tốc × 0,55 s. Phần dự đoán tối đa 60 px.
- **Điều kiện để dấu đáp hợp lệ:**
  - ô đứng được;
  - qua kiểm tra lối né của M10-03.

  Nếu không hợp lệ, Lang Vương lao thường thay vì vồ.
- **Thời gian:** gồng 1 s, có đường chấm vàng nối từ boss tới dấu đáp, rồi bay 0,35 s.
- **Sát thương:** chỉ gây đúng lúc chạm đất.
- **Cách né:** rời khỏi vòng.

**Chuyển pha:**
- Ở **55 % máu**, đúng **1 lần**.
- Chỉ diễn ra giữa hai chiêu, không cắt ngang đòn đang ra.
- Có thông báo "Lang Vương nổi giận — coi chừng cú vồ!" và Lang Vương **choáng 1 s (sơ hở)**.

**Khác biệt P2:**
- thêm Vồ và Hú Rồi Lao;
- nghỉ giữa chiêu chỉ còn 75 %.

**Selector chọn chiêu** (dùng selector M10-02, danh sách `MINI_V2`), dựa vào:
- **tầm:** gần thì ưu tiên Liệt Trảo, 55–230 px thì Vồ, xa thì lao;
- **số sói đàn:** đàn ít con thì ưu tiên hú;
- **hồi chiêu:** Liệt Trảo 3 s, Vồ 6 s, Hú 8 s;
- **chống lặp:** không chiêu nào 3 lần liên tiếp;
- Vồ tính là chiêu nặng (`TACTICS.HEAVY`).

Toàn bộ tham số nằm ở `BOSS_V2.MINI` trong `src/core/config.js`.

## 2. Files

| File | Thay đổi |
|---|---|
| `src/entities/bosses.js` | Pha 2 + choáng chuyển pha; ước lượng vận tốc người chơi; chiêu `claw` (khóa hướng, kiểm tra hình quạt) và `leap` (`startLeap` + trạng thái `leap` bay tới dấu đáp; dấu đáp là một vùng nổ, nên dùng lại sẵn cảnh báo, kiểm tra lối né, sát thương và dọn dẹp khi boss chết); dùng selector khi bật cờ |
| `src/systems/tactics.js` | Danh sách `MINI_V2`; giới hạn triệu hồi; thêm quạt Liệt Trảo vào hình nguy hiểm (M10-08) |
| `src/core/config.js` | `FEATURES.bossPatternsV2`, `BOSS_V2`, `HEAVY.leap`, `SKILL_CD.MINI`, tên chiêu "Liệt Trảo" / "Vồ Đầu Đàn" |
| `src/render/render.js` | Quạt Liệt Trảo ở lớp dưới và lớp trên tán cây; đường chấm tới dấu vồ; điểm khóa trong lớp debug |
| `src/systems/run.js`, `src/main.js`, `tools/sim.mjs` | Cờ `bossV2`, `?boss2=1`, `BOSS2=1`; bot biết lùi khỏi quạt |
| `tests/boss_mini_v2.test.js` (mới) | 7 test |

## 3. Test

`node --test tests/` → **278/278 PASS** (7 test mới):
- **Cờ tắt:** không có Liệt Trảo, không có Vồ, không chuyển pha.
- **Chuyển pha** (3 seed):
  - đúng **1** thông báo chuyển pha;
  - ở P1 (máu > 55 %) không bao giờ có Vồ hay Hú Rồi Lao;
  - ở P2 có Vồ.
- **Đủ bộ chiêu:** độ khó Linh, 3 seed, đủ **5 kiểu hành vi** (dash, howl, claw, howlDash, leap); không chiêu nào 3 lần liên tiếp.
- **Liệt Trảo:**
  - hướng khóa;
  - đứng trước mặt thì trúng;
  - lùi trong lúc gồng thì không trúng;
  - sau chiêu có sơ hở (`vuln`).
- **Vồ Đầu Đàn** (3 seed × đứng yên / né):
  - dấu đáp cách người chơi ≤ 60 px và là ô đứng được;
  - boss đáp đúng dấu;
  - đứng trong dấu thì trúng, và **chỉ trúng lúc đáp**;
  - rời vòng thì không trúng.
- **Triệu hồi và kẹt** (80 s): sói đàn không quá 8 con; boss không bị kẹt xa người chơi.
- **Tất định:** cùng seed cho cùng chuỗi chiêu.

**Sửa trong lúc test:**
- Dấu vồ nổ sớm khoảng 2 khung so với lúc boss chạm đất. Tôi thêm `LEAP.SYNC` = 0,07 s để khớp.
- Hạ `LEAP.MIN_D` từ 70 xuống 55 px, vì Lang Vương đuổi sát nên hiếm khi có tầm 70 px.

## 4. Mô phỏng bot (không phải người chơi thật)

Bật cả 3 cờ: `tactics` + `skills2` + `boss2`.

| | Phàm, cảnh giới 0 (60) | Phàm, cảnh giới 9 (36) | Linh, cảnh giới 9 (36) |
|---|---|---|---|
| M10-08 (chưa có boss mới) | 34/60 · hạ Lang Vương 53 | 33/36 · 35 | 9/36 · 27 |
| **M10-09** | **33/60 · hạ Lang Vương 54** | **32/36 · 35** | **11/36 · 27** |

**Số lần dùng chiêu** (18 lượt Phàm cảnh giới 0): Lao 62, Liệt Trảo 38, Hú 38, **Vồ 14**.

**Sát thương Lang Vương gây cho bot:**
- cắn 5 %, lao 3–5 %, Liệt Trảo 1–4 %;
- **Vồ 0 %**: bot né mọi cú vồ, vì dấu đáp là vùng nổ có cảnh báo 1,35 s.

**Nguồn gây chết ở Phàm cảnh giới 0:** Dã Lang 18, Yêu Vương cắn 2, băng tiễn 2, Lang Vương 2.

→ **Trận boss vẫn kiểm soát được.** Tỉ lệ hạ Lang Vương giữ nguyên. Bot không phải người: với bot, độ khó thêm vào gần như bằng 0. Để biết với người thật thì cần playtest.

**Logic:** khoảng 0,10 ms/tick (không tăng so với M10-08).

## 5. Trình duyệt

**Cách thử:** `?tactics=1&skills2=1&boss2=1`, localhost. Vào bằng input thật (chơi khách → E → chọn công pháp). Pane bị ẩn nên game chạy bằng `__game.step()`. Để chụp ảnh, tôi dùng hook:
- tua tới 3:28 và đặt `run.diff = 1` (độ khó Linh đang khóa với tài khoản khách);
- giữ máu đầy;
- hạ máu Lang Vương xuống 50 % để vào P2;
- dịch người chơi ra xa 130 px để có tầm vồ.

**Ảnh:**
- `M10_09_liet_trao.png`: quạt đỏ viền tối phía trước Lang Vương.
- `M10_09_chuyen_pha.png`: thông báo "Lang Vương nổi giận — coi chừng cú vồ!" + "sơ hở!".
- `M10_09_vo_dau_dan.png`: Lang Vương gồng vồ. **Vòng đáp khó thấy** vì bị đàn sói và tán cây che.

**Chiêu ghi nhận trong lượt:** claw, dash, howl, leap.

**Video:** chưa có. Tiêu chí "ít nhất 1 trận thắng/thua được quay video" **NOT VERIFIED**: tôi không quay video được, cần người phát triển quay khi chơi thử.

## 6. Rủi ro còn lại

1. **Vòng đáp Vồ khó đọc khi quái đông.** Vòng chỉ là viền đỏ + lấp tím như vùng nổ Yêu Vương, và lớp trên tán cây chỉ có viền mờ. Nên làm rõ hơn ở M10-11 (VFX/UI boss), ví dụ bóng Lang Vương ở điểm đáp hoặc viền dày hơn.
2. **Liệt Trảo bị thân boss (vẽ ×2) che một phần.** Lớp trên vẫn có viền đỏ.
3. **Với bot, boss gần như không khó hơn.** Cần người thật đánh giá; có thể chỉnh trong `BOSS_V2.MINI`.
4. **Chưa có video**, chưa có người chơi thật, chưa đo trên điện thoại.
