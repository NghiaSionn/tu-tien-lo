# M10-04 — Dã Lang săn theo đàn (Tập Kích Bên Sườn)

**Ngày:** 22/11/2026. **Cờ mới:** `FEATURES.enemySkillsV2` (**mặc định TẮT**; thử: `?tactics=1&skills2=1`, debug thêm `&aidebug=1`). Tắt cờ = sói đuổi + cắn như cũ.
**Tru Bầy** (kỹ năng nâng cao có điều kiện trong bestiary) **chưa làm** — để sau GATE M10-B nếu cần thêm độ khó.

## 1. Cách hoạt động
- **Gom đàn (không tìm đường từng con):** mỗi 0,5 s (`WOLF_PACK.THINK`), sói trong 170 px quanh người chơi được gom tham lam theo khoảng cách thành đàn ≤ 4 con, cách nhau ≤ 80 px. Không gộp hai con đang chồm vào cùng đàn.
- **Phân vai** (đàn ≥ 2): con gần nhất **áp sát** (đuổi + cắn như cũ); một con **vòng sườn** tới điểm cách người chơi 55 px, lệch ±90° so với con áp sát (chọn bên gần nó hơn). Còn lệch góc > 0,5 rad thì **đi vòng quanh người chơi, khép dần** thay vì cắt thẳng vào giữa. Vòng quá 4 s chưa tới thì thôi.
- **Chồm** (chỉ con vòng sườn, đã tới sườn): hết hồi chiêu 3,5 s, cách 26–80 px, thấy người chơi, đàn chưa có con nào đang gồng/chồm, còn ngân sách đe dọa trên màn → **gồng 0,6 s khóa hướng** (cảnh báo đường lao đỏ viền tối như Hỏa Hồ, ngắn hơn) → lao 210 px/s × 0,32 s (~67 px), sát thương ×1,4, rồi hồi 0,6 s.
- **Hồ:** điểm sườn bị hồ chắn → con đó đi như sói thường (theo bản đồ hướng vòng hồ).
- Toàn bộ tham số ở `WOLF_PACK` trong `src/core/config.js`. Tất định (không dùng ngẫu nhiên).

## 2. Thay đổi
| File | Nội dung |
|---|---|
| `src/systems/packs.js` (mới) | `updatePacks`: gom đàn, phân vai, tập đàn đang bận (`scene.packBusy`). |
| `src/entities/archetypes.js` | `wolfAI` (vòng sườn, chồm windup→dash→recover, nguồn `chaser:pounce`). Chỉ chạy khi `io.skillsV2`. |
| `src/systems/run.js` | Gọi `updatePacks` mỗi tick khi bật cờ; `io.skillsV2`. |
| `src/core/config.js` | `FEATURES.enemySkillsV2`, `WOLF_PACK`, tên chiêu `chaser:pounce` = "Dã Lang chồm". |
| `src/render/render.js` | Cảnh báo chồm (lớp dưới + lớp trên tán cây); debug: vai trò + số đàn trên đầu sói, chấm xanh tới điểm sườn, đường trắng tới điểm chồm. |
| `src/main.js`, `tools/sim.mjs` | `?skills2=1`, biến môi trường `SKILLS2=1`. |
| `tests/wolfpack.test.js` (mới) | 7 test. |

## 3. Test — `node --test tests/` → **245/245 PASS** (7 mới)
- Cờ mặc định TẮT; TẮT tường minh giống hệt mặc định, không sói nào có vai trò.
- BẬT: cùng seed → cùng vị trí/vai trò/đàn (tất định).
- **2 hướng tiếp cận:** đàn 3 con cùng từ một phía → ≥ 3/4 seed có hai con vào tới 62 px quanh người chơi từ hai hướng lệch ≥ 50°.
- **Chồm:** khóa hướng suốt lúc gồng; không sát thương trước khi hết gồng; đứng yên thì trúng; **đi bộ ngang lúc gồng thì né được** (3 seed).
- **≤ 1 con chồm mỗi đàn** (7 sói, hai đàn, 20 s, 3 seed) và chỉ con vòng sườn được chồm.
- **Không kẹt hồ:** sói bên kia hồ (4 bản đồ seed) vẫn vòng qua tới người chơi, không bước vào nước.

## 4. Mô phỏng bot (không phải người thật) — BẬT `tactics` + `skills2`
| | Cảnh giới 0 (60 lượt) | Cảnh giới 9 (36 lượt) |
|---|---|---|
| M10-01 baseline | 31/60 (52 %) | 28/36 |
| M10-03 (chỉ tactics) | 34/60 | 30/36 |
| **M10-04 (tactics + đàn sói)** | **27/60 (45 %)** | **29/36** |
| M10-04, cả hai cờ TẮT | **31/60 — trùng từng seed với baseline** (rollback đúng) | — |

- L0 theo seed: kiem_loi LWWWWWWWLW · phi_kiem_hoa LLLLWLWLLW · hoa_phong LLLLWLLLLW · loi_the LWWLWWLWLW · bang_han WLWWWWLLWW · linh_phong LWLLLLLLLL.
- Gây chết L0: Dã Lang cắn 17 · băng tiễn 10 · Yêu Vương cắn 2 · Hỏa Hồ 2 · Lang Vương lao 2. **Không lượt nào chết vì cú chồm** (chồm chỉ 4,3 % sát thương nhận) — sói khó hơn vì **vây từ hai phía**, đúng vai trò "bao vây/ép đường".
- Logic ≈ 0,08 ms/tick (không tăng so với M10-03).

## 5. Trình duyệt (`?tactics=1&skills2=1&aidebug=1`, localhost)
Vào bằng input thật (chơi khách → E → chọn công pháp). Pane trình duyệt đang ẩn nên khung hình chạy bằng hook `__game.step()`; tua thời gian tới 1:00 và giữ máu đầy để chụp.
- `M10_04_vong_suon.png`: 3 đàn (#1–#3), mỗi đàn một con `flank` đang vòng sang bên, còn lại `press`.
- `M10_04_chom.png`: hai đàn khác nhau cùng gồng chồm (ngân sách 2/2) — đường chồm đỏ viền tối + đường debug trắng tới điểm khóa.
- Lưu ý: nhãn chữ debug trong ảnh lệch so với con sói vì lớp chữ độ phân giải cao chỉ vẽ lại theo khung hình thật (rAF), không theo `step()` khi pane ẩn — lỗi của cách chụp, không phải của game.
- Chưa đo thời gian khung lần này (pane ẩn, số đo không đáng tin).

## 6. Rủi ro còn lại
1. **L0 khó hơn baseline** (45 % so với 52 % bot thắng). Người phát triển từng muốn game khó hơn, nhưng cần người thật thử; chỉnh ở `WOLF_PACK` (FLANK_R, POUNCE.CD, PACK_MAX) chứ không bỏ cảnh báo.
2. hoa_phong/linh_phong yếu thêm (1–2/10 ở L0) — lệch build đã có từ M10-01, M10-08/director cần cân lại.
3. Con sói đang chồm vẫn giữ nhãn `flank` nên debug có lúc thấy hai `flank` cùng đàn (một con đang chồm, một con mới được giao) — đúng luật (chỉ một con chồm), chỉ là nhãn.
4. Chưa có Tru Bầy; chưa đo khung hình với pane hiện; chưa có người thật.
