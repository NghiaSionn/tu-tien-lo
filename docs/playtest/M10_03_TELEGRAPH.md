# M10-03: Cảnh báo đòn và chống chồng đòn bất công

**Ngày:** 22/11/2026.

**Cờ:** phần hành vi (lối thoát, ngân sách lúc boss gồng, báo trước giải kẹt, boss không bắn từ ngoài màn) chỉ chạy khi `FEATURES.enemyTactics` bật. Cờ này vẫn **TẮT mặc định**; thử bằng `?tactics=1`.

**Bật luôn:** hai thay đổi không đổi luật chơi nên áp dụng cho mọi người:
- Cảnh báo vẽ rõ hơn.
- Nguồn sát thương ghi theo tên chiêu.

**Lớp debug:** `?aidebug=1` (chỉ dùng khi phát triển).

## 1. Thay đổi

| File | Nội dung |
|---|---|
| `src/systems/tactics.js` | `hasEscape` / `keepEscape`: vùng mới phải chừa ít nhất một điểm an toàn mà người chơi đi bộ tới kịp trước khi nổ (tính cả việc đứng yên). Nếu không có, bỏ bớt vùng xa nhất. `threatScan`: khi boss đang gồng chiêu nặng hoặc người chơi đứng trong vùng, quái thường chỉ được 1 đòn đặc biệt trên màn. `burst` / `prison` chỉ hợp lệ khi boss nằm trong khung nhìn. Khi không còn chiêu hợp lệ, selector trả `null` để boss đuổi tiếp và xét lại sau 0,4 s, không bị ép ra chiêu. |
| `src/entities/bosses.js` | Hắc Diễm và Lao Tù đi qua `keepEscape`. Giải kẹt có thêm trạng thái `blink`: vòng tím báo trước 0,8 s ở điểm sắp hiện ra, xong mới dịch chuyển, và không cắn trong 0,6 s đầu. Đạn boss ghi nguồn `boss:burst` / `boss:prisonShot`. |
| `src/entities/archetypes.js` | Băng tiễn ghi nguồn `ranged:shot`, đập đất của Ma Ảnh ghi `elite:slam` (trước là `shot` và `elite:windup`). |
| `src/systems/run.js` | `onAttack` nhận tên chiêu. Lưu `scene.aiThreat` để lớp debug đọc. |
| `src/core/config.js` | `TACTICS.BUDGET_DURING_HEAVY`, `ESCAPE`, `BLINK_WARN`, `BLINK_GRACE`. Bảng `SKILL_NAMES` (khóa nguồn → tên chiêu tiếng Việt). Cờ `FEATURES.aiDebug`. |
| `src/render/render.js` | Mọi cảnh báo của quái dùng màu đỏ, có viền tối 1 px bên dưới nên nổi trên cỏ, nước và VFX của người chơi. Đường bắn của Huyền Băng Thú đổi từ xanh sang đỏ vì xanh dễ lẫn với Băng của người chơi. Lớp trên (không bị tán cây che) có thêm đường bắn và vòng điểm hiện ra của boss. Lớp debug hiện trạng thái/chiêu và thời gian còn lại trên đầu quái, đường trắng tới điểm khóa, số giây trước khi vùng nổ, và dòng ngân sách đe dọa. |
| `src/main.js` | Cờ URL `?aidebug=1`. |
| `tests/telegraph.test.js` (mới) | 13 test, xem mục 2. |

**Mức đồ họa:** cảnh báo không phụ thuộc vào mức đồ họa. Thấp, Vừa và Cao vẽ giống hệt nhau; chỉ VFX của người chơi bị giảm.

## 2. Test

`node --test tests/` → **238/238 PASS** (13 test mới).

**Hỏa Hồ lao, Ma Ảnh đập đất, Huyền Băng Thú bắn** — cả ba loại đều kiểm tra 3 điều:
- Không có sát thương trước khi hết thời gian gồng.
- Hướng đã khóa không đổi trong suốt lúc gồng.
- Đứng yên thì trúng, còn đi bộ ra khỏi đường hoặc vùng (tốc độ người chơi bình thường) thì **không trúng**.

**Các test khác:**
- Người chơi đi vòng quanh Hỏa Hồ đang gồng: hướng lao vẫn giữ nguyên tới lúc lao.
- `keepEscape` bỏ bớt vùng khi vùng bịt kín người chơi, và giữ nguyên khi người chơi còn đường.
- Yêu Vương (remix bật), 6 seed × 60 s: **mỗi lần thả Hắc Diễm hoặc Lao Tù đều còn lối thoát**.
- Boss ngoài màn không bao giờ chọn Hắc Diễm Đạn hoặc Lao Tù.
- Giải kẹt: boss đứng yên trong thời gian báo trước, hiện ra cách người chơi ≥ 110 px, và không cắn trong thời gian ân hạn.
- Khi boss đang gồng chiêu nặng hoặc người chơi đứng trong vùng, ngân sách quái thường giảm còn 1.
- Mọi nguồn sát thương đều có tên chiêu trong `SKILL_NAMES` (AI cũ và AI mới, 3 mốc thời gian).

## 3. Mô phỏng bot (không phải người chơi thật)

| Bản | Cảnh giới 0 (60 lượt) | Cảnh giới 9 (36 lượt) |
|---|---|---|
| M10-01 baseline (AI cũ) | 31/60 | 28/36 |
| **M10-03, cờ TẮT** | **31/60 — từng seed giống hệt baseline** | — |
| M10-02, cờ BẬT | 37/60 | 29/36 |
| **M10-03, cờ BẬT** | **34/60** | **30/36** |

- **Rollback đúng:** với cờ TẮT, chuỗi thắng/thua theo seed của cả 6 build trùng 100 % với M10-01. Chỉ có tên khóa `shot` đổi thành `ranged:shot`.
- **Cờ BẬT, L0, chuỗi theo seed:**

  | Build | Kết quả theo seed |
  |---|---|
  | kiem_loi | WWWWWWWLWW |
  | phi_kiem_hoa | WLLLWWLWWL |
  | hoa_phong | LLLLLLLWWL |
  | loi_the | LWWWWLWWLL |
  | bang_han | WWWWWWLWWW |
  | linh_phong | LLLWLWWLLL |

  - Nguồn gây chết: Dã Lang 12 · băng tiễn 6 · Lang Vương lao 3 · Yêu Vương cắn 3 · Ma Ảnh 2.
  - **Không lượt nào chết vì Chấn Địa hay Hắc Diễm.**
- **So với M10-02:** L0 thấp hơn 3 lượt thắng (37 → 34). Lý do: boss không còn bị ép ra chiêu khi ngoài màn, nên đuổi sát hơn và cắn nhiều hơn.
- **Logic:** 0,083–0,097 ms/tick. Hai bản sim chạy song song cùng lúc với trình duyệt nên số này có nhiễu; bản TẮT cũng đo được 0,095.

## 4. Trình duyệt

Điều kiện: `?tactics=1&aidebug=1`, localhost, đồ họa Cao. Vào game bằng input thật (chơi khách → E → chọn công pháp). Để chụp ảnh, tôi tua thời gian bằng hook test và giữ máu đầy.

**Ảnh chụp:**
- `M10_03_quai_thuong.png` — 4:10: hai Huyền Băng Thú cùng gồng (ngân sách 2/2). Đường bắn đỏ có viền tối, đường debug trắng tới điểm khóa, Lang Vương ở trạng thái `windup:dash`.
- `M10_03_hac_diem.png` — Yêu Vương thả 3 vùng Hắc Diễm. Dòng debug hiện "đòn 1/1 · boss nặng 1 · ĐỨNG TRONG VÙNG", nghĩa là quái thường bị giảm còn 1 đòn trong lúc người chơi phải né.
- `M10_03_chan_dia.png` — Chấn Địa đang gồng (vòng đỏ quanh boss) cùng với một Hỏa Hồ đang gồng lao.

**Thời gian khung:** 8 s với 88 quái, có bật lớp debug. Khoảng cách giữa hai khung p50 16,7 ms, p95 16,8 ms, max 17 ms — giữ đều 60 FPS, không có khung giật trong lần đo này.

## 5. Rủi ro còn lại

1. Vòng Chấn Địa bị thân boss (vẽ ×2) che một phần ở phía trên. Lớp trên vẫn có viền, nhưng nên làm vòng dày hơn khi vẽ lại art boss ở M10-09/10.
2. Hàm lối thoát chỉ xét điểm đến chứ không xét đường đi: nếu có đạn hoặc đường lao chắn đường thì vẫn có thể trúng. Hiện chưa có tổ hợp nào như vậy trong sim.
3. Lớp trên không vẽ màn kết thúc của đường lao Lang Vương (`rest`). Chỉ là vấn đề hình ảnh.
4. Mới đo trên desktop; chưa có người chơi thật, chưa đo trên điện thoại, chưa chạy sim ở độ khó Linh trở lên.
5. Khung giật 160–250 ms của M10-01 không xuất hiện trong lần đo này, nhưng chưa khoanh vùng được nguyên nhân (để cho M10-12).

## 6. GATE M10-A

| Tiêu chí | Kết quả |
|---|---|
| Selector chạy tất định | Đạt (test M10-02) |
| Rollback khi tắt cờ | Đạt (sim trùng từng seed) |
| Cảnh báo và ngân sách hoạt động | Đạt (test + ảnh) |
| Test baseline còn PASS | Đạt (238/238) |
| Flow field và tách bầy không hỏng | Đạt (`monster_nav` PASS) |

**Chờ người phát triển duyệt GATE M10-A** trước khi bật AI mới mặc định hoặc sang M10-04.
