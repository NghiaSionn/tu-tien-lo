# M10-07 — Ma Ảnh tinh anh đột kích: Ảnh Bộ + Hắc Trảo

**Ngày:** 22/11/2026.

**Cờ:** dùng chung `FEATURES.enemySkillsV2`, **mặc định TẮT**. Muốn thử thì dùng `?tactics=1&skills2=1`. Khi tắt cờ, Ma Ảnh chỉ đập đất như cũ.

**Bộ kỹ năng:** tính cả đập đất, Ma Ảnh có **đủ 3 kỹ năng**:
- đập đất (có từ trước);
- **Ảnh Bộ** — mọi độ khó;
- **Hắc Trảo** — chỉ từ độ khó **Linh** trở lên (`CLAW.MIN_DIFF = 1`, cùng mốc với chiêu phối của boss).

## 1. Cách hoạt động

### Ảnh Bộ

**Điều kiện kích hoạt** (đủ tất cả):
- Người chơi cách Ma Ảnh 95–240 px.
- Ma Ảnh nhìn thấy người chơi.
- Hết hồi chiêu 7 s.
- Còn ngân sách đe dọa.

**Chọn điểm hiện ra:**
- Cách người chơi 58 px, lệch ngang so với hướng Ma Ảnh đang tới.
- Phải là ô quái đứng được (không nước).
- Phải cách người chơi ít nhất 44 px.
- Thử tối đa 12 vị trí; không tìm được thì không dùng Ảnh Bộ.

**Diễn biến:**
1. Ma Ảnh **đứng yên 0,7 s**. Ở điểm đích hiện vòng tím viền tối lấp dần, có đường chấm nối từ Ma Ảnh tới (dùng chung hình báo trước với boss giải kẹt M10-03).
2. Ma Ảnh hiện ra ở điểm đích.
3. **Sơ hở 0,55 s**, và chưa cắn hay đập trong tổng cộng 1,35 s kể từ lúc hiện ra.

### Hắc Trảo

**Điều kiện kích hoạt:**
- Người chơi cách < 46 px.
- Độ khó ≥ Linh.
- Hết hồi chiêu 5 s.
- Chiêu trước đó không phải Hắc Trảo, nên Hắc Trảo luân phiên với đập đất.

**Diễn biến:**
1. **Gồng 0,75 s, khóa hướng.** Cảnh báo là hình quạt 120°, bán kính 54 px, lấp tím dần, viền đỏ có viền tối.
2. Quét một lần: sát thương ×1,8.
3. Hồi 0,6 s.

**Cách né:** lùi khỏi bán kính, hoặc vòng ra sau lưng Ma Ảnh.

**Nguồn sát thương** ghi là `elite:claw` = "Hắc Trảo". Toàn bộ tham số nằm ở `ELITE_V2` trong `src/core/config.js`. Mọi lựa chọn ngẫu nhiên (vị trí Ảnh Bộ) dùng `run.rng`, nên tất định theo seed.

## 2. Thay đổi

| File | Nội dung |
|---|---|
| `src/entities/archetypes.js` | Trạng thái `blink` (Ảnh Bộ), `blinkSpot`, `m.sk` = `slam`/`claw` để biết chiêu nào sẽ nổ khi hết gồng, `inClaw` (hình học quạt). |
| `src/systems/run.js` | `io.diff`. |
| `src/core/config.js` | Thêm `ELITE_V2` và tên chiêu "Hắc Trảo". |
| `src/render/render.js` | Hình quạt Hắc Trảo (lớp dưới và lớp trên tán cây), điểm khóa trong lớp debug. Ảnh Bộ dùng `drawBlinkWarn` sẵn có. |
| `tools/sim.mjs` | Bot né Hắc Trảo bằng cách lùi khỏi bán kính. |
| `tests/elite_v2.test.js` (mới) | 7 test. |

## 3. Test

`node --test tests/` → **264/264 PASS** (7 test mới):
- **Cờ TẮT:** Ma Ảnh không dùng Ảnh Bộ hay Hắc Trảo, kể cả ở độ khó Thiên.
- **Ảnh Bộ** (4 seed):
  - Đứng yên đúng thời gian báo trước, không dịch chuyển sớm.
  - Hiện ra ở ô đứng được, cách người chơi ≥ 44 px.
  - Vào trạng thái sơ hở ngay khi hiện ra.
  - Người chơi đứng sát chỗ hiện ra cũng **không bị đánh** trong 1,35 s.
- **Hồi chiêu:** không Ảnh Bộ lại trước 7 s.
- **Không hiện ra trên nước:** 5 bản đồ seed, 6 Ma Ảnh vây quanh hồ, 30 s — mọi lần hiện ra đều trên ô đứng được.
- **Hắc Trảo** (độ khó Linh):
  - Hướng khóa suốt lúc gồng.
  - Đứng trước mặt thì trúng đúng 1 lần, sau khi hết gồng.
  - Lùi thẳng ra sau trong lúc gồng thì né được.
  - Kiểm tra hình học: đứng sau lưng, ngoài tầm hoặc ngang hông ngoài cung 120° đều không trúng.
- **Độ khó Phàm:** không có Hắc Trảo.
- **Độ khó Linh, lượt thật** (3 seed): Ma Ảnh dùng **đủ 3 kỹ năng**, và mọi nguồn sát thương đều có tên chiêu.

## 4. Mô phỏng bot (không phải người chơi thật)

Bật cả `tactics` và `skills2`. Bot né đủ cảnh báo.

| | Phàm, cảnh giới 0 (60 lượt) | Phàm, cảnh giới 9 (36 lượt) | Linh, cảnh giới 9 (36 lượt) |
|---|---|---|---|
| Tắt hết cờ | 31/60 (trùng từng seed với baseline M10-01) | 28/36 | 13/36 |
| M10-06 | 31/60 | 26/36 | — |
| **M10-07 bật cờ** | **30/60** | **25/36** | **8/36** |

**Nhận xét:**
- **Ở độ khó Phàm:** Ma Ảnh gây 9–10 % sát thương nhận (cắn + đập đất) và gây chết 2/60 lượt. Ảnh Bộ chủ yếu làm Ma Ảnh áp sát nhanh hơn, không gây sát thương trực tiếp.
- **Ở độ khó Linh (cảnh giới 9):** bật cờ làm bot thắng ít hơn rõ rệt (13 → 8/36). Nhưng Hắc Trảo chỉ chiếm 2,1 % sát thương và không gây chết lượt nào. Phần khó tăng chủ yếu đến từ đàn sói, quạt tiễn và Hỏa Vĩ (M10-04…06) cộng dồn với quái mạnh hơn ở độ khó Linh: Dã Lang gây chết 17/28 lượt thua.
- **Độ khó Linh ở cảnh giới 0** không có ý nghĩa: tắt cờ chỉ thắng 5/60, bật cờ 3/60, vì Linh cần Trúc Cơ. Tôi đã bỏ số liệu này khỏi docs.
- **Logic:** khoảng 0,11 ms/tick ở Phàm; 0,19 (tắt) → 0,26 (bật) ms/tick ở Linh vì nhiều quái hơn. Vẫn rất nhỏ so với 16,7 ms của một khung hình.

## 5. Trình duyệt

**Cách chạy:** `?tactics=1&skills2=1`, localhost, pane hiển thị, game chạy theo thời gian thật (rAF). Vào game bằng input thật (chơi khách → E → chọn công pháp). Độ khó Linh đang khóa với tài khoản khách, nên để chụp Hắc Trảo tôi đặt `run.diff = 1` bằng hook. Tôi cũng tua thời gian, giữ máu đầy, và hạ máu Lang Vương xuống 1 để Ma Ảnh xuất hiện (tinh anh không xuất hiện khi boss còn sống). Để chụp Ảnh Bộ, tôi dịch người chơi ra xa 150 px.

**Ảnh:**
- `M10_07_anh_bo.png`: hai vòng tím báo điểm Ma Ảnh sắp hiện ra, sát người chơi (bên phải), kèm đường chấm từ Ma Ảnh.
- `M10_07_hac_trao.png`: hình quạt đỏ trước mặt Ma Ảnh ở giữa đàn sói.

**Khung hình theo thời gian thật**, sau khi Lang Vương chết, có 3 Ma Ảnh cùng Yêu Vương: p50 16,7 ms, p95 18 ms, max 29,5 ms.

**Sự cố khi thử:** trang có lúc treo hơn 45 s. Nguyên nhân là **công cụ chụp ảnh của tôi**, không phải game: receiver nhận ảnh chạy đơn luồng nên bị kẹt kết nối, và script chụp chờ mãi. Tôi đã đổi sang server đa luồng. Logic game được chạy lại cùng điều kiện trong Node (8 seed × 150 s) và không có giá trị bất thường nào; game chạy thời gian thật cũng mượt.

## 6. Rủi ro còn lại

1. Vòng báo Ảnh Bộ khá nhỏ (r = 22) và có thể lẫn với vòng của boss giải kẹt, vì dùng chung hình. Nếu người chơi thật thấy khó đọc, có thể đổi màu hoặc thêm bóng Ma Ảnh mờ ở điểm đích.
2. Hắc Trảo chỉ có từ Linh, nên người chơi Phàm chỉ gặp 2 kỹ năng.
3. Hình quạt có thể bị thân Ma Ảnh và quái đông che. Lớp trên tán cây vẫn có viền.
4. Độ khó Linh đang khó với bot (8/36 ở cảnh giới 9). Cần người thật chơi trước khi bật mặc định, và cân lại ở M10-08 (director chia vai trò).
5. Chưa có người chơi thật.
