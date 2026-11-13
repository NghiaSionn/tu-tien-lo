# M8-01 — Audit tích hợp + điểm khôi phục (13/11/2026)

Thiết kế: `docs/chatgpt_tong_mon_M8_2026-11-13.md`. Quyết định đã chốt: `docs/M8_QUYET_DINH.md` (phong cách = concept ảnh 2, bố cục = ảnh 1).

## Baseline
| Mục | Giá trị |
|---|---|
| Commit trước M8 | `0776e63` — **tag `pre-m8`** (đã push) |
| `npm test` | 198/198 PASS |
| Cờ mới | `FEATURES.sectHub = false` trong `src/core/config.js` (chưa nối vào code — tắt thì game y hệt trước) |
| Save | Không đổi định dạng. Khóa `tutien_save_v2` / v1 không bị đụng |

**Khôi phục:**
- Toàn bộ: `git checkout pre-m8` (xem) hoặc `git revert <commit M8>` (giữ lịch sử).
- Trong game: đặt `FEATURES.sectHub = false` → động phủ cũ.

## Ánh xạ 10 chức năng (tất cả ở `src/main.js` trừ khi ghi khác)
| # | Chức năng | Hàm gọi | Điều kiện chặn hiện có | Phím | Nút | Khu M8 (bố cục ảnh 1) |
|---|---|---|---|---|---|---|
| 1 | Tọa thiền | `toggleMed()` (dùng `C.meditateTick` mỗi khung, mạnh hơn trong `inForm()` — bán kính `HUB.FORM_R` quanh tâm) | `trib`, `view !== 'HUB'` | T | btnMed | Tụ Linh Pháp Đài (giữa) |
| 2 | Đột phá / độ thiên kiếp | `tryBreak()` → `levelUp()` hoặc `createTrib()` (trận quanh `CX,CY`, `TRIBULATION.ARENA_R = 96`) | `trib`, `!C.canBreak` | B | btnBreak | Tụ Linh Pháp Đài |
| 3 | Dùng đan | `usePill()` → `C.usePill` | `view !== 'HUB'` | 1 | btnPill | Đan Dược Phòng (đông) |
| 4 | Mua đan | `buyPill()` → `C.buyPill` | — | 2 | btnBuy | Đan Dược Phòng |
| 5 | Vào bí cảnh | `openPrepare()` → `UI.showPrepare` → `startRun()`; về: `claimAndReturn()` → `returnToHub()` (về `hubPosBeforeRun`) | `!PORTAL.near` (`HUB.PORTAL.r = 22`), `trib` | E | btnRun (chỉ hiện gần cổng) | Cổng Bí Cảnh (bắc) |
| 6 | Luyện khí | `openForge()` → `UI.showForge` + `transact()` (`progression/gear.js`) | `trib`, `view` | G | btnForge | Luyện Khí Phường (đông bắc) |
| 7 | Truyền Thừa Các (gacha vé) | `openGacha()` → `UI.showGacha` + `pull`/`shopBuy` (`progression/gacha.js`) | `trib`, chống bấm dồn 300 ms | H | btnGacha | Truyền Thừa Các (tháp, tây bắc) |
| 8 | Thành tựu | `UI.showAchievements(meta)` | `trib` | J | btnAch | Công Đức Đường (tây nam) |
| 9 | Đồ giám | `openCodex()` → `UI.showCodex` (`progression/codex.js`) | `trib` | K | btnCodex | Tàng Kinh Các (tây) |
| 10 | Bia Truyền Thừa | `openLore()` → `UI.showLore` (`progression/lore.js`); vật thể `BIA` + `BIA.near` (r 24) | `!FEATURES.lore`, `trib` | L, E cạnh bia | btnLore | Vườn Bia (nam) |
| — | Cài đặt | `openSettings()` | `trib` | — | btnSettings (góc) | Giữ nút góc (thiết kế ChatGPT: HUD giữ Cài đặt/Pause) |

**Tương tác "đi tới + E" đã có:**
- `onAction('KeyE')` ở động phủ: đứng cạnh bia thì `openLore()`, còn lại thì `openPrepare()` (tự kiểm `PORTAL.near`).
- Nút E cảm ứng (`ui/touch.js`) gọi `onAction('KeyE')`.
- Mọi bảng dùng chung `UI.open` / `closeModal` / `modalKey` (một modal tại một thời điểm), nên đã có sẵn "không mở 2 modal".

## Bản đồ, va chạm, vẽ, quái (sảnh hiện tại)
- **`world/map.js` → `makeHubMap()`**:
  - 80×60 ô 16 px, sinh theo seed;
  - đá trong bán kính 4,5 ô quanh tâm, cỏ tới 8 ô, ngoài đó nước/cây/đá ngẫu nhiên.
  - Va chạm: tile WATER/TREE/ROCK đặc (`solidPx`, `canStand` hộp 8×5 quanh chân).
  - Chưa có loại tile "công trình".
- **Vẽ** (`render/render.js`):
  - nền theo chunk 16×16 có cache (`drawMapCached`);
  - cây/đá là đối tượng xếp theo `y` (`tileObj`);
  - cổng/bia/người chơi/quái cũng xếp chung danh sách `objs` theo `y` → công trình mới thêm cùng cách.
  - Tile lạ sẽ được vẽ như cỏ: cần nhánh cho loại mới.
- **Quái động phủ**: `spawnHubMonster` (`entities/monsters.js`), tối đa `HUB.MAX_MONSTERS = 45`, cách tâm ≥ `NO_SPAWN_TILES = 10` ô, cấp tăng theo khoảng cách → sẽ lọt vào khu tông môn nếu tông môn rộng hơn 10 ô.
- **Hồi sinh / vị trí lưu**:
  - `HUB_SPAWN` = tâm + (0, 26);
  - `saveCtx.canStand` dùng `hubMap`: vị trí lưu nằm trong vật cản của map mới thì tự về `HUB_SPAWN`. Không mất dữ liệu, chỉ đổi chỗ đứng.
- **Thiên kiếp**: `clampToArena` giữ người chơi trong bán kính 96 px quanh tâm → **quảng trường giữa phải trống ≥ 6 ô bán kính**.

## Phương án M8-02 (layout + va chạm) — đề xuất, chờ duyệt
1. **Map và dữ liệu bố cục**
   - `makeSectMap()` mới trong `world/map.js`, chỉ dùng khi `FEATURES.sectHub` (map cũ giữ nguyên).
   - Vẫn 80×60. Rừng/núi sinh ngẫu nhiên **chỉ ở ngoài** một khung tông môn khoảng 44×32 ô quanh tâm; bên trong dựng theo **bố cục cố định** mô tả bằng lưới chữ (ASCII) trong file dữ liệu mới `src/data/sect_layout.js`.
   - Ký hiệu: `.` cỏ, `#` đường đá, `B` nền công trình (tile mới **BUILDING**: đặc, không vẽ nền đá/cây, sprite vẽ đè), `~` nước/suối, `T` cây trang trí, `f` hàng rào (đặc).
2. **Vị trí các khu theo ảnh 1**
   - Cổng ở bắc.
   - Tây: Truyền Thừa Các (tây bắc), Tàng Kinh Các, Công Đức Đường (tây nam).
   - Đông: Luyện Khí Phường (đông bắc), Đan Dược Phòng, Luyện Võ Trường có rào (đông nam).
   - Nam: vườn bia + suối/cầu.
   - Quảng trường Tụ Linh Pháp Đài ở giữa, bán kính trống ≥ 7 ô (thiên kiếp 96 px + lề).
   - Mỗi khu cách quảng trường khoảng 8–12 ô (2–3 giây đi bộ, tốc độ 82 px/s).
3. **Công trình và quái**
   - Công trình là danh sách `{id, tên, ô gốc, cỡ, điểm đứng tương tác}` trong cùng file dữ liệu.
   - Trước khi có art, vẽ **placeholder**: khối màu + tên khu bằng `txt`.
   - Sói động phủ chỉ sinh **trong rào Luyện Võ Trường** (cấp thấp) hoặc ngoài khung tông môn.
4. **Test tự động (node)**
   - flood-fill từ `HUB_SPAWN`: tới được mọi điểm đứng tương tác và cổng;
   - không ô kẹt;
   - quảng trường đủ trống cho thiên kiếp;
   - `HUB_SPAWN` đứng được;
   - tắt cờ thì `makeHubMap()` trả đúng map cũ.

## Phương án M8-03 (hệ tương tác dùng chung) — đề xuất
1. **Registry**: `src/systems/interact.js` (thuần logic), `{id, name, x, y, r, actions: [{id, label, key?, run, enabled(meta)}]}`.
   - `nearestInteract(list, foot)` chọn điểm gần nhất trong bán kính, hòa thì ưu tiên điểm đang nhắm.
   - Đưa sẵn cổng và bia hiện có vào registry. Tắt cờ thì `onAction('KeyE')` giữ nguyên như cũ.
2. **Lời nhắc**: chữ "E · Tên khu" trên công trình (như "E · đọc bia").
   - Khu có ≥ 2 hành động (Pháp Đài: Tọa thiền/Đột phá; Đan phòng: Dùng/Mua đan) → E mở bảng chọn nhỏ (phím 1/2 hoặc chạm), dùng chung `UI.open`.
3. **Chặn**: chỉ khi `view === 'HUB'`, không `trib`, không modal mở; khóa 250 ms chống bấm dồn (như bảng thẻ).
4. **Test**: một hành động, hai hành động, hai điểm sát nhau, ngoài phạm vi, đang thiên kiếp/modal, bấm E liên tục.

## Rủi ro đã thấy
- **Mất tiện lợi so với 10 nút** (ChatGPT cũng cảnh báo) → giữ khoảng cách ngắn. Phím tắt cũ vẫn chạy song song (bàn phím) trong lúc thử.
- **Art:** công trình chưa có sprite → giai đoạn đầu là placeholder; vẽ thật theo đợt trong chat "Vẽ concept art nhân vật".
- **Map chunk cache:** xây cache theo map hiện hành; đổi map khi bật/tắt cờ cần tải lại trang (cờ là config, không bật giữa chừng).
