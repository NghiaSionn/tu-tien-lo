# Bàn giao: Tu Tiên Lộ

Game web pixel 2D top-down, tu tiên + roguelite, chơi một mình trong trình duyệt. Chưa có phần online.

Cập nhật: 2026-11-11, sau phiên M0 + M1 và thử pixelfx. Bản trước của file này (v0.1) nằm trong git ở tag `baseline-v0.1`.

| | |
|---|---|
| Trạng thái | M0 xong (gate đạt). M1 xong, **gate M1 đạt**. **M2-01 xong** (director + 4 kiểu quái có cảnh báo). Tiếp: M2-02 boss |
| Test tự động | `npm test`: 58/58 PASS |
| Kiểm thử tay | `TEST_REPORT.md` |
| Quyết định kỹ thuật | `docs/adr/0001…0005` (0005: beanfx chính, pixelfx phụ) |
| Rollback | `git checkout baseline-v0.1` (code v0.1 nguyên trạng) |

---

## 1. Chạy

```bash
python tools/serve.py
```

Mở http://localhost:8123. `tools/serve.py` tắt cache; dùng `python -m http.server 8123` vẫn chạy nhưng trình duyệt dễ giữ bản cũ. Trong Claude Code desktop: `.claude/launch.json` (tên `tutien`).

```bash
npm test
```

```bash
node tools/sim.mjs
```

(bot mô phỏng run để xem xu hướng cân bằng; không thay được playtest người thật).

**Điều khiển**

| Phím | Ở động phủ | Ở bí cảnh |
|---|---|---|
| WASD / mũi tên | di chuyển | di chuyển |
| Space / J | kiếm khí thường | kiếm khí thường (thêm vào công pháp tự động) |
| T | tọa thiền | — |
| B | đột phá / độ kiếp | — |
| 1 / 2 | dùng / mua Tụ Khí Đan | chọn thẻ 1 / 2 (3) khi bảng thẻ mở |
| E | mở bảng vào bí cảnh khi đứng gần cổng | — |
| Esc / P | đóng bảng | tạm dừng / tiếp tục |
| Enter | — | về động phủ ở bảng kết quả |

---

## 2. Cấu trúc

```
index.html              Khung trang, HUD động phủ + HUD bí cảnh, bảng (modal), CSS
src/
  main.js               Vòng lặp, trạng thái HUB/PREPARE/RUN/CARD_DRAFT/RESULTS/SETTINGS, nối mọi thứ
  core/config.js        MỌI thông số gameplay + cờ FEATURES (run, manualAttackInRun)
  core/rng.js           mulberry32 có seed; hash/noise sinh bản đồ
  core/input.js         Bàn phím; phím bấm rất nhanh vẫn được tính 1 khung
  world/map.js          Bản đồ động phủ (giống hệt v0.1, có test checksum) + đấu trường; va chạm, tầm nhìn
  progression/realm.js  18 bậc cảnh giới, công thức baseline
  progression/runxp.js  EXP trong run, hàng đợi lượt chọn thẻ
  progression/draft.js  Bốc 1/3 thẻ, áp thẻ đúng 1 lần, điều kiện tiến hóa
  systems/cultivation.js Tu vi, đột phá, lôi kiếp kiểu cũ, đan, chết (thuần logic)
  systems/run.js        Một lượt bí cảnh: chiến ý, máu, kết thúc, thống kê sát thương theo nguồn (dmgBy)
  systems/director.js   M2-01: sinh quái theo giai đoạn/đợt/tinh anh, ngân sách cost, chỗ sinh hợp lệ
  systems/combat.js     8 công pháp + 4 tiến hóa: hồi chiêu, mục tiêu, đạn, vùng, khiên, sét nhảy
  entities/monsters.js  Yêu thú: sinh (động phủ), AI đuổi, thiêu đốt/làm chậm
  entities/archetypes.js M2-01: Hỏa Hồ lao, Huyền Băng Thú bắn, Ma Ảnh tinh anh đập; pha gồng + băng tiễn
  data/skills.js        Dữ liệu 12 công pháp, 4 tiến hóa, 6 bị động, thẻ dự phòng
  persistence/save.js   Save v2, migrate v1, sao lưu, xuất/nhập
  render/sprites.js     Sprite vẽ bằng code (giữ nguyên v0.1)
  render/render.js      Vẽ khung + hiệu ứng tạm
  render/pixelfx.js     Nạp sheet pixelfx, phát bằng trình phát beanfx
  ui/ui.js              HUD, bảng chuẩn bị/thẻ/tạm dừng/kết quả/cài đặt
tests/                  node:test (realm, cultivation, save, run, director)
tools/serve.py          Server dev không cache
tools/sim.mjs           Bot mô phỏng run
tools/pixelfx_import.py Nhập sheet gộp của pixelfx (khử nhân alpha)
tools/pixelfx_layers.mjs Xuất hiệu ứng pixelfx thành 2 lớp màu + sáng (định dạng beanfx)
vfx/pixelfx/            Mã nguồn VFX tự làm theo quy trình pixelfx
vfx/drafts/             Draft beanfx tu tiên dùng lại, đã thu nhỏ theo nhân vật 25 px (chưa gắn vào game)
fx/pixelfx/             Sheet pixelfx (cổng, Hỏa Long Quyển) + LICENSE/NOTICE
lib/beanfx.js, fx/, vfx/ Hiệu ứng beanfx (không đổi từ v0.1)
legacy/game_v0.1.js     Code v0.1 một file, KHÔNG còn được nạp; giữ để đối chiếu
docs/adr/               Quyết định kỹ thuật
```

Không có dependency, không bundler. 20 module, không có vòng import.

---

## 3. Gameplay hiện có

### 3.1 Động phủ (giữ nguyên v0.1)
Bản đồ 80×60, tụ linh trận, vùng an toàn, 45 yêu thú theo khoảng cách, tọa thiền (×3 trong trận), 18 bậc cảnh giới, đột phá, lôi kiếp kiểu cũ (2,6 s, 70%), Tụ Khí Đan, chết mất 10% tu vi. Mọi công thức như v0.1, nay nằm trong `src/core/config.js`.

Thêm: **cổng bí cảnh** phía bắc tụ linh trận; nút **Cài đặt** (giảm hiệu ứng, rung màn hình, xuất/nhập save, chơi lại).

### 3.2 Bí cảnh (mới, M1)
- Đứng gần cổng → E → chọn công pháp khởi đầu (Kiếm Khí / Hỏa Cầu / Lôi Kích) → vào đấu trường 44×44 ô.
- Quái do **director** sinh (M2-01, `DIRECTOR` trong config): nhịp nhanh dần qua 5 giai đoạn; đợt đội hình có thông báo (1:00 vây tròn, 1:50 bầy Hỏa Hồ, 2:50 hàng cung Huyền Băng Thú, 3:50, 4:50, 5:50, 6:50 "Yêu triều"); Ma Ảnh tinh anh từ 3:00 rồi mỗi 90 s. Không sinh trong 150 px quanh người chơi; ngân sách cost + trần 90 con. Mạnh dần theo thời gian và cảnh giới. Sống đủ **8 phút** = thắng (tạm, M2-02 sẽ thay bằng boss).
- 4 kiểu quái, mỗi loài một kiểu (màu = hành vi): **Dã Lang** đuổi cắn; **Hỏa Hồ** gồng 0,75 s (đường đỏ tới điểm cuối) rồi lao; **Huyền Băng Thú** giữ khoảng cách, gồng 0,6 s (đường ngắm) rồi bắn băng tiễn (cây/đá chặn, chỉ bắn khi trong màn); **Ma Ảnh tinh anh** to x2, máu x10, gồng 1 s (vòng đỏ đúng bán kính) rồi đập đất. Hướng/vùng khóa khi bắt đầu gồng → né bằng cách rời đường/vòng.
- Công pháp tự thi triển khi có mục tiêu trong tầm và trong tầm nhìn (cây/đá chặn).
- Quái chết rơi **chiến ý**; đủ EXP → game dừng, bảng **chọn 1 trong 3 thẻ**. Lên nhiều cấp cùng lúc thì lần lượt chọn đủ.
- Tối đa 4 công pháp chủ động + 4 bị động.
- **Tiến hóa** khi công pháp chính cấp 5 + có công pháp phụ + đã sống 90 s: Lôi Đình Vạn Kiếm, Liệt Diễm Kiếm Trận, Hỏa Long Quyển, Lôi Cương Hộ Thể (bảng chi tiết ở ADR 0003).
- Chết hoặc rời bí cảnh → bảng kết quả → về đúng chỗ cũ ở động phủ. **Cảnh giới, tu vi, đồ không đổi; chưa có phần thưởng** (M2-03).
- Run không được lưu: tải lại trang giữa run = về động phủ.

Công pháp đã chạy: Kiếm Khí, Phi Kiếm Trận, Hỏa Cầu, Hỏa Luân, Lôi Kích, Lôi Vực, Phong Nhận, Hộ Thể Cương Khí. Chỉ có dữ liệu thiết kế, chưa vào pool: Phong Ảnh Bộ, Băng Châm, Hàn Khí, Linh Châu.

### 3.3 Hiệu ứng
**pixelfx** (ADR 0004, cờ `FEATURES.pixelfxAssets`): cổng bí cảnh dùng sheet xuất từ pixelfx. **Hỏa Long Quyển** dùng VFX tự làm theo quy trình pixelfx (`vfx/pixelfx/hoa-long-quyen.js`, xuất 2 lớp bằng `tools/pixelfx_layers.mjs`). Viên chiến ý đã thử pixelfx nhưng trả về hình cũ theo yêu cầu. Ảnh trước/sau: `docs/pixelfx_truoc_sau.png`.

5 hiệu ứng beanfx cũ vẫn dùng (kiếm khí, kiếm trúng, lôi kiếp — cũng dùng cho Lôi Kích ở tỉ lệ 0,5 —, đột phá — cũng dùng khi tiến hóa —, tọa thiền). Các công pháp mới đang vẽ tạm bằng code (vòng lửa, lốc, khiên, phi kiếm, cầu lửa, lưỡi gió, sét nhảy).

---

## 4. Save

Chi tiết: ADR 0001.

- `tutien_save_v1`: **chỉ đọc**, không bao giờ ghi/xóa.
- Lần đầu mở bản mới: đọc v1 → migrate → ghi `tutien_save_v2`, đọc lại để xác minh, chép v1 nguyên văn sang `tutien_save_v1_backup`.
- Mỗi lần lưu: bản v2 trước xoay sang `tutien_save_v2_bak`. v2 hỏng → giữ ở `tutien_save_v2_corrupt` và phục hồi từ bak, rồi tới v1.
- Chỉ lưu metaState: cảnh giới, tu vi, máu, linh thạch, đan, vị trí động phủ, cài đặt, thống kê run.
- Quay về code v0.1 vẫn chạy với v1 nhưng mất tiến độ kể từ lúc migrate.

Save trên trình duyệt của máy này lúc kết thúc phiên: đã đưa về đúng giá trị v1 gốc (Luyện Khí 1, 0 linh thạch, 1 đan). Bản sao v1 gốc: `backups/browser_save_v1_2026-11-10.json` (không có trong git).

---

## 5. Đã kiểm thử (tóm tắt — đầy đủ trong `TEST_REPORT.md`)

- Baseline v0.1: đi, va chạm, T, B, 1, 2, Space, **chết → hồi sinh, mua đan, tải lại trang** đều PASS.
- Bản mới, bằng phím thật: migrate save, đi, tọa thiền, đột phá, lôi kiếp, đánh quái, chết, mua/dùng đan, cài đặt, tải lại trang.
- Bí cảnh, bằng phím thật: vào/hủy/vào lại, tự đánh, chọn thẻ (bấm đúp chỉ nhận 1), thế giới dừng khi chọn, tạm dừng, rời bí cảnh, chết trong bí cảnh, tải lại giữa bảng thẻ, Space tay, **cả 4 tiến hóa bằng chơi thật**: Lôi Đình Vạn Kiếm 2:56, Hỏa Long Quyển 2:14, Liệt Diễm Kiếm Trận 2:38, Lôi Cương Hộ Thể 4:30.
- Bộ nhớ: sau mỗi lượt về động phủ, run=null, đạn/vùng/chiến ý/hiệu ứng về 0 (đếm đối tượng).
- M2-01, chơi thật tới 3:07: đủ 4 kiểu quái, thông báo đợt, cảnh báo lao/bắn/đập, né được đòn đập tinh anh (TEST_REPORT §3c).
- FPS: 60 (16,7 ms/khung) ở động phủ và đầu bí cảnh. Stress test 100 quái/200 đạn/300 hạt **chưa đo**.

---

## 6. Hạn chế và lỗi còn mở

1. Trọng số `EVO_BASE_UPGRADE_MULT = 3` (thẻ nâng công pháp gốc khi đã có công pháp phụ) là [THỬ NGHIỆM]; xem lại ở M2-04. Khởi đầu Lôi Kích yếu ở Luyện Khí 1.
2. Cân bằng chưa đều (bot, sau M2-01): Kiếm + Lôi thắng 3/4 lượt; 3 build còn lại 0/4, chết ở phút 3–6,5. Đuổi vây vẫn là nguồn sát thương chính. Chỉnh ở M2-04 (`DMG=1 node tools/sim.mjs` để xem nguồn). Chỉnh ở M2-04.
3. Chưa có boss, mini-boss, phần thưởng run (M2). "Thắng" = sống 8 phút.
4. Viên chiến ý nhỏ, khó thấy trên cỏ (bản pixelfx đã thử và bị loại; cần hướng khác).
5. Không có điều khiển cảm ứng (M5-06).
6. Chưa thử tay: xuất/nhập save và "Chơi lại" trong Cài đặt (có test logic), đổi tab thật khi đang run.
7. Lôi kiếp vẫn là RNG 70% (sẽ thay ở M3-03).
8. Chiêu mới vẽ tạm bằng code (trừ Hỏa Long Quyển); làm tiếp bằng quy trình pixelfx ở M5-03.
9. Save thật trên `localhost:8123` giờ là tiến độ người chơi; test nên chạy ở `127.0.0.1:8123` (bộ nhớ lưu riêng).

---

## 7. Bước tiếp theo (theo `TASKS_TU_TIEN_LO.md`)

1. M2-02: mini-boss + boss cuối.
2. M2-03: phần thưởng run commit một lần.
3. M2-04: cân bằng một run hoàn chỉnh.

---

## 8. Giấy phép

- `vfx/kit/`, `lib/beanfx.js`: từ [baenv/beanfx](https://github.com/baenv/beanfx), MIT, có LICENSE.
- `fx/pixelfx/`: xuất từ [patch-gg/pixelfx](https://github.com/patch-gg/pixelfx) commit `044e12a`, MIT; LICENSE và NOTICE (ghi công Hugo Duprez, Hollow Crown) đi kèm.
- Mọi hình ảnh khác và 5 hiệu ứng trong `fx/` là vẽ mới cho dự án này.
