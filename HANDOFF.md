# Bàn giao: Tu Tiên Lộ

Game web pixel 2D top-down, tu tiên + roguelite, chơi một mình trong trình duyệt. Chưa có phần online.

Cập nhật: 2026-11-13, sau M7-02 (sửa UI; audit M7-01 ở `docs/playtest/BASELINE_M7.md`). Bản trước của file này (v0.1) nằm trong git ở tag `baseline-v0.1`.

| | |
|---|---|
| Trạng thái | M0 xong (gate đạt). M1 xong, **gate M1 đạt**. **M2 xong** (GATE v0.2 đi trọn trong trình duyệt bằng autopilot phát phím). **M3 xong**, GATE v0.3a đóng ở mức logic. **M4 xong**, GATE v0.3b đóng ở mức logic. **M5 gần xong phần nhìn** (12/11): VFX beanfx cho mọi công pháp/tiến hóa/boss; sprite nhân vật, quái, boss, vật thể rừng, cổng, tụ linh trận, Linh Mạch và biểu tượng công pháp do ChatGPT vẽ + `tools/sprite_clean.py`; khung nhìn 640×360; âm thanh tổng hợp; mức đồ họa; joystick ảo — GATE v0.4 chưa đạt (p95 cảnh stress, máy thật, nghe thật). M3–M5 chưa xem trong trình duyệt |
| Test tự động | `npm test`: 209/209 PASS (14/11, sau M8-02d) |
| Kiểm thử tay | `TEST_REPORT.md` |
| Quyết định kỹ thuật | `docs/adr/0001…0007` (0005: beanfx chính; 0006: thưởng run nhận một lần; 0007: trang bị/thành tựu/Truyền Thừa Các) |
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
  progression/rewards.js M2-03: tính thưởng run, chờ nhận -> nhận đúng 1 lần
  systems/cultivation.js Tu vi, đột phá, lôi kiếp kiểu cũ, đan, chết (thuần logic)
  systems/run.js        Một lượt bí cảnh: chiến ý, máu, kết thúc, thống kê sát thương theo nguồn (dmgBy)
  systems/director.js   M2-01: sinh quái theo giai đoạn/đợt/tinh anh, ngân sách cost, chỗ sinh hợp lệ
  systems/combat.js     8 công pháp + 4 tiến hóa: hồi chiêu, mục tiêu, đạn, vùng, khiên, sét nhảy
  entities/monsters.js  Yêu thú: sinh (động phủ), AI đuổi, thiêu đốt/làm chậm
  entities/bosses.js    M2-02: Lang Vương, Ma Ảnh Yêu Vương — máy trạng thái chiêu, vùng nguy hiểm, chống kẹt
  entities/archetypes.js M2-01: Hỏa Hồ lao, Huyền Băng Thú bắn, Ma Ảnh tinh anh đập; pha gồng + băng tiễn
  data/skills.js        Dữ liệu 12 công pháp, 4 tiến hóa, 6 bị động, thẻ dự phòng
  persistence/save.js   Save v2, migrate v1, sao lưu, xuất/nhập
  render/sprites.js     Sprite vẽ bằng code (giữ nguyên v0.1)
  render/render.js      Vẽ khung + hiệu ứng tạm
  render/pixelfx.js     Nạp sheet pixelfx, phát bằng trình phát beanfx
  ui/ui.js              HUD, bảng chuẩn bị/thẻ/tạm dừng/kết quả/cài đặt
tests/                  node:test (realm, cultivation, save, run, director, boss, rewards, tribulation, shrine, gate_v03a, m4)
tools/serve.py          Server dev không cache
tools/sim.mjs           Bot mô phỏng run (biết né cảnh báo; --summary; NAIVE=1; DMG=1)
tools/dps.mjs           Đo sát thương/giây từng công pháp lên bia đứng yên
tools/bench.mjs         Đo thời gian logic mỗi khung cảnh stress (100 quái/200 đạn)
tools/autopilot.js      Playtest trong trình duyệt: phát phím WASD/số theo trạng thái (không sửa state)
tools/strip_to_beanfx.py Chuyển dải khung draft beanfx -> sheet + JSON cho lib/beanfx.js
src/audio/sfx.js        Âm thanh tổng hợp WebAudio + nhạc nền
src/ui/touch.js         Joystick ảo cảm ứng
tools/pixelfx_import.py Nhập sheet gộp của pixelfx (khử nhân alpha)
tools/pixelfx_layers.mjs Xuất hiệu ứng pixelfx thành 2 lớp màu + sáng (định dạng beanfx)
vfx/pixelfx/            Mã nguồn VFX tự làm theo quy trình pixelfx
vfx/drafts/             Draft beanfx các VFX công pháp/boss (đã gắn vào game, xem vfx/drafts/README.md)
sprites/                Sheet sprite ChatGPT vẽ, đã làm sạch: nhan_vat, quai, boss, rung, cong_trinh, bieu_tuong (+ .json)
docs/concept/           Ảnh gốc ChatGPT (concept + sheet nền magenta) để làm sạch lại khi cần
tools/sprite_clean.py   Làm sạch sheet AI: tách nền, thu về lưới pixel gốc, bảng màu chung, căn chân
art/*/names.txt         Tên từng ô của sheet ChatGPT (đầu vào sprite_clean)
fx/pixelfx/             Sheet pixelfx (cổng, Hỏa Long Quyển) + LICENSE/NOTICE
lib/beanfx.js, fx/, vfx/ Hiệu ứng beanfx (không đổi từ v0.1)
legacy/game_v0.1.js     Code v0.1 một file, KHÔNG còn được nạp; giữ để đối chiếu
docs/adr/               Quyết định kỹ thuật
```

Không có dependency, không bundler. 22 module, không có vòng import.

---

## 3. Gameplay hiện có

### 3.1 Động phủ (giữ nguyên v0.1)
Bản đồ 80×60, tụ linh trận, vùng an toàn, 45 yêu thú theo khoảng cách, tọa thiền (×3 trong trận), 18 bậc cảnh giới, đột phá, lôi kiếp kiểu cũ (2,6 s, 70%), Tụ Khí Đan, chết mất 10% tu vi. Mọi công thức như v0.1, nay nằm trong `src/core/config.js`.

Thêm: **cổng bí cảnh** phía bắc tụ linh trận; nút **Cài đặt** (giảm hiệu ứng, rung màn hình, xuất/nhập save, chơi lại).

### 3.2 Bí cảnh (mới, M1)
- Đứng gần cổng → E → chọn công pháp khởi đầu (Kiếm Khí / Hỏa Cầu / Lôi Kích) → vào đấu trường 44×44 ô.
- **M5:** âm thanh (M tắt tiếng; âm lượng trong Cài đặt), mức đồ họa Cao/Vừa/Thấp, overlay hiệu năng F3, cảnh stress `?stress=1`, joystick ảo trên thiết bị cảm ứng (`?touch=1` để thử trên máy tính), cây mờ khi che nhân vật, 4 loài quái có dáng riêng, mọi công pháp, tiến hóa và chiêu boss dùng VFX beanfx (`vfx/drafts/README.md`; đồ họa Thấp → hình vẽ code). `?loop=timer` khi môi trường hãm requestAnimationFrame.
- **M4:** ở động phủ có **Luyện Khí (G)** — 4 ô trang bị, 8 món một-ưu-một-nhược, luyện/nâng bằng luyện liệu + linh thạch, chắc chắn; **Thành Tựu (J)** — 7 thành tựu, hai cái mở công pháp hệ Băng (Băng Châm, Hàn Khí); **Truyền Thừa Các (H)** — quay bằng vé Cơ Duyên kiếm trong game, tỉ lệ công khai, bảo hiểm 30 lượt, trùng → mảnh đổi đúng món muốn. Không có tiền thật.
- **M3 (meta tu tiên):** tọa thiền **chuyển hóa linh khí** mang về từ bí cảnh thành tu vi (nhanh ×3 và lời hơn trong tụ linh trận; hết linh khí gần như dừng). Tụ Khí Đan cho linh khí. Đột phá đại cảnh giới = **thiên kiếp tương tác** ~24 s quanh tụ linh trận (né vòng sét, dải sét, đứng vào ô an toàn), thua giữ cảnh giới, mất 30% tu vi. Đại cảnh giới mở công pháp khởi đầu mới + độ khó bí cảnh (phím D ở màn chuẩn bị). Trong bí cảnh, hạ Lang Vương thì hiện **Linh Mạch** (E, chọn 1 trong 3, một lần).
- Quái do **director** sinh (M2-01, `DIRECTOR` trong config): nhịp nhanh dần qua 5 giai đoạn; đợt đội hình có thông báo (0:55 vây tròn, 1:40 bầy Hỏa Hồ, 2:30 hàng cung Huyền Băng Thú, 4:10, 4:50, 5:30); Ma Ảnh tinh anh từ 2:45 rồi mỗi 90 s (M2-04: run 6–8 phút). Không sinh trong 150 px quanh người chơi; ngân sách cost + trần 90 con. Mạnh dần theo thời gian và cảnh giới.
- **Boss** (M2-02, `BOSS` trong config): **Lang Vương** lúc 3:30 (lao 3 lần, mỗi lần có đường cảnh báo; tru gọi 4 Dã Lang). **Ma Ảnh Yêu Vương** lúc 6:00 (đạn tỏa tròn có tia báo hướng — đứng giữa hai tia; vùng hắc diễm quanh người chơi; đập đất khi áp sát; pha 2 dưới 50% máu; cuồng nộ sau 2:30). **Hạ Yêu Vương = thắng.** Quá 15 phút = "hết thời gian". Sau mỗi chiêu boss sơ hở 1,3 s (sao vàng, +50% sát thương). 1 đòn ≤ 3% máu boss. Thanh máu boss ở cạnh dưới màn. Khi boss sống, quái thường thưa hơn, không có tinh anh. `run.rewards` ghi boss đã hạ (hook cho M2-03).
- 4 kiểu quái, mỗi loài một kiểu (màu = hành vi): **Dã Lang** đuổi cắn; **Hỏa Hồ** gồng 0,75 s (đường đỏ tới điểm cuối) rồi lao; **Huyền Băng Thú** giữ khoảng cách, gồng 0,6 s (đường ngắm) rồi bắn băng tiễn (cây/đá chặn, chỉ bắn khi trong màn); **Ma Ảnh tinh anh** to x2, máu x10, gồng 1 s (vòng đỏ đúng bán kính) rồi đập đất. Hướng/vùng khóa khi bắt đầu gồng → né bằng cách rời đường/vòng.
- Công pháp tự thi triển khi có mục tiêu trong tầm và trong tầm nhìn (cây/đá chặn).
- Quái chết rơi **chiến ý**; đủ EXP → game dừng, bảng **chọn 1 trong 3 thẻ**. Lên nhiều cấp cùng lúc thì lần lượt chọn đủ.
- Tối đa 4 công pháp chủ động + 4 bị động.
- **Tiến hóa** khi công pháp chính cấp 5 + có công pháp phụ + đã sống 90 s: Lôi Đình Vạn Kiếm, Liệt Diễm Kiếm Trận, Hỏa Long Quyển, Lôi Cương Hộ Thể (bảng chi tiết ở ADR 0003).
- Chết, rời, thắng hay hết giờ → bảng kết quả có mục **Mang về động phủ** (M2-03, `REWARD` trong config): linh thạch, linh khí, luyện liệu theo tiến độ (quái, cấp, thời gian, tinh anh, boss); thắng ×1,5 + vé Cơ Duyên, lần đầu hạ Yêu Vương thêm 1 vé. Nút "Nhận thưởng" cộng đúng một lần rồi về chỗ cũ ở động phủ. Cảnh giới, tu vi, đan không đổi. Linh khí/luyện liệu/vé **chưa có chỗ dùng** (M3/M4/M6).
- Run không được lưu: tải lại trang giữa run = về động phủ.

Công pháp đã chạy: Kiếm Khí, Phi Kiếm Trận, Hỏa Cầu, Hỏa Luân, Lôi Kích, Lôi Vực, Phong Nhận, Hộ Thể Cương Khí, Băng Châm và Hàn Khí (mở bằng thành tựu, M4-02), Phong Ảnh Bộ (tàn ảnh gió khi di chuyển; mở bằng thành tựu 'Lịch Luyện': vào bí cảnh 5 lần) và Linh Châu (châu xoay sát thân; mở bằng 'Trảm Yêu': hạ 300 yêu thú). Đủ 12 công pháp của GDD §6.2.

### 3.3 Hiệu ứng
**pixelfx** (ADR 0004, cờ `FEATURES.pixelfxAssets`): cổng bí cảnh dùng sheet xuất từ pixelfx. **Hỏa Long Quyển** dùng VFX tự làm theo quy trình pixelfx (`vfx/pixelfx/hoa-long-quyen.js`, xuất 2 lớp bằng `tools/pixelfx_layers.mjs`). Viên chiến ý đã thử pixelfx nhưng trả về hình cũ theo yêu cầu. Ảnh trước/sau: `docs/pixelfx_truoc_sau.png`.

5 hiệu ứng beanfx cũ vẫn dùng (kiếm khí, kiếm trúng, lôi kiếp — cũng dùng cho Lôi Kích ở tỉ lệ 0,5 —, đột phá — cũng dùng khi tiến hóa —, tọa thiền). Các công pháp mới đang vẽ tạm bằng code (vòng lửa, lốc, khiên, phi kiếm, cầu lửa, lưỡi gió, sét nhảy).

---

## 4. Save

Chi tiết: ADR 0001.

- `tutien_save_v1`: **chỉ đọc**, không bao giờ ghi/xóa.
- Lần đầu mở bản mới: đọc v1 → migrate → ghi `tutien_save_v2`, đọc lại để xác minh, chép v1 nguyên văn sang `tutien_save_v1_backup`.
- Mỗi lần lưu: bản v2 trước xoay sang `tutien_save_v2_bak`. v2 hỏng → giữ ở `tutien_save_v2_corrupt` và phục hồi từ bak, rồi tới v1.
- Chỉ lưu metaState: cảnh giới, tu vi, máu, linh thạch, đan, vị trí động phủ, cài đặt, thống kê run; từ M2-03 thêm linh khí, luyện liệu, vé Cơ Duyên, `pendingReward` (thưởng chờ nhận) và `rewardLog` (id run đã nhận). Vẫn là v2 (chỉ thêm trường, save cũ đọc được). Thưởng nhận một lần: ADR 0006.
- Quay về code v0.1 vẫn chạy với v1 nhưng mất tiến độ kể từ lúc migrate.

Save trên trình duyệt của máy này lúc kết thúc phiên: đã đưa về đúng giá trị v1 gốc (Luyện Khí 1, 0 linh thạch, 1 đan). Bản sao v1 gốc: `backups/browser_save_v1_2026-11-10.json` (không có trong git).

---

## 5. Đã kiểm thử (tóm tắt — đầy đủ trong `TEST_REPORT.md`)

- Baseline v0.1: đi, va chạm, T, B, 1, 2, Space, **chết → hồi sinh, mua đan, tải lại trang** đều PASS.
- Bản mới, bằng phím thật: migrate save, đi, tọa thiền, đột phá, lôi kiếp, đánh quái, chết, mua/dùng đan, cài đặt, tải lại trang.
- Bí cảnh, bằng phím thật: vào/hủy/vào lại, tự đánh, chọn thẻ (bấm đúp chỉ nhận 1), thế giới dừng khi chọn, tạm dừng, rời bí cảnh, chết trong bí cảnh, tải lại giữa bảng thẻ, Space tay, **cả 4 tiến hóa bằng chơi thật**: Lôi Đình Vạn Kiếm 2:56, Hỏa Long Quyển 2:14, Liệt Diễm Kiếm Trận 2:38, Lôi Cương Hộ Thể 4:30.
- Bộ nhớ: sau mỗi lượt về động phủ, run=null, đạn/vùng/chiến ý/hiệu ứng về 0 (đếm đối tượng).
- M2-03: 10 test thưởng; trình duyệt: tải lại giữa bảng kết quả và bấm nhận nhiều lần đều chỉ cộng 1 lần.
- M2-02: 12 test boss; cảnh báo 5 chiêu đã xem trong trình duyệt. **Chưa chơi thật trọn run tới boss** (trình duyệt phiên 11/11 chỉ 2–5 khung/giây).
- M2-01, chơi thật tới 3:07: đủ 4 kiểu quái, thông báo đợt, cảnh báo lao/bắn/đập, né được đòn đập tinh anh (TEST_REPORT §3c).
- FPS: ~62 ở động phủ và bí cảnh thường (12/11, khung 640×360, 32 quái: 1,8/3,9 ms mỗi khung). Stress 100 quái/200 đạn/300 hạt sau tối ưu (bản đồ cache theo khối 16×16 ô): Cao 3,7/6,4 ms trung vị/p95 — đạt trên desktop; chưa đo điện thoại. Đo theo phần: đặt `__game.vis.prof = {}` rồi đọc lại.

---

## 6. Hạn chế và lỗi còn mở

1. **Chưa có người thật chơi.** 4 lượt trong trình duyệt do autopilot phát phím (`tools/autopilot.js`, xem `docs/playtest_M2-04.md`); thiếu lượt 5. Môi trường test hãm `requestAnimationFrame` → mở game với `?loop=timer`. Khi trang bị ẩn, game tự dừng (đúng thiết kế) nên không test được.
2. Cân bằng (bot biết né, 16 seed): Kiếm + Lôi 15/16, Phi Kiếm + Hỏa 14/16, Lôi + Thể 11/16, Hỏa + Phong 8/16. Đầu run Lôi + Thể yếu; Hỏa + Phong đánh boss chậm. Cảnh giới cao có độ khó bí cảnh tự chọn (M3-02).
3. **M3 chưa ai xem trong trình duyệt** (bỏ theo chỉ đạo 12/11): màn chuẩn bị có độ khó/công pháp mở khóa, tọa thiền với linh khí, Linh Mạch, thiên kiếp tương tác. Logic đã có test (gồm chuỗi GATE v0.3a). Rủi ro còn lại: hiển thị/UI.
4. Viên chiến ý nhỏ, khó thấy trên cỏ (bản pixelfx đã thử và bị loại; cần hướng khác).
5. Không có điều khiển cảm ứng (M5-06).
6. Chưa thử tay: xuất/nhập save và "Chơi lại" trong Cài đặt (có test logic), đổi tab thật khi đang run.
7. Thiên kiếp tương tác thay xổ số 70% (`TRIBULATION.ENABLED`); đường cũ còn trong code để rollback.
8. VFX beanfx M5-03 đã xem trong trình duyệt (12/11, 127.0.0.1, `?loop=timer&perf`): Hỏa Luân, Hỏa Cầu bay/nổ, Lôi Vực, Phong Nhận, Hàn Khí, lốc Hỏa Long Quyển, vùng lửa Liệt Diễm, đạn hắc diễm của boss hiện đúng, ~62 FPS, xử lý ~1 ms/khung. Sửa khi xem: số sát thương nhịp thiêu đốt/vùng lửa không in nữa (chồng thành cột che quái), gai Hàn Khí thấp lại, kiếm đuổi quái (Phi Kiếm/Liệt Diễm) trước đây luôn rơi vào nhánh vẽ code do thứ tự nhánh sai — nay dùng sheet beanfx. Nổ hắc diễm của boss xem cận cảnh: lóe lửa tím rồi khói tím đen, rõ trên đá và cỏ. Cảnh stress đo trong trình duyệt (`TEST_REPORT.md`): đã sửa treo trang ở đồ họa Vừa/Thấp và thêm trần fx `FX_CAP`; p95 vẫn 20–29 ms, chưa đạt.
9. Save thật trên `localhost:8123` giờ là tiến độ người chơi; test nên chạy ở `127.0.0.1:8123` (bộ nhớ lưu riêng).
10. **Bản chơi thử công khai** (12/11): **https://nghiasionn.github.io/tu-tien-lo/** — GitHub Pages từ nhánh `main` của repo **công khai** https://github.com/NghiaSionn/tu-tien-lo (có `.nojekyll`). Cùng ngày từng chuyển riêng tư rồi công khai lại theo yêu cầu (Pages phải bật lại sau khi đổi). Cập nhật = commit + `git push`, Pages tự build ~1 phút. Mã nguồn và tài liệu ai cũng xem được; muốn giấu thì cần repo riêng chỉ chứa bản chơi (hỏi người dùng trước, người dùng không muốn cài esbuild). Bản artifact cũ (không tự cập nhật): https://claude.ai/artifact/274WT7qoWw42kA2GX11jkt.

---

## 7. Bước tiếp theo (theo `TASKS_TU_TIEN_LO.md`)

0. **M7 (13/11):** M7-01 audit xong → `docs/playtest/BASELINE_M7.md` (6 luồng + viewport, ảnh `docs/playtest/m7_01/`). Lỗi major chuyển M7-02: phím Space/J/D/WASD trong `src/core/input.js` nuốt phím tắt UI (J thành tựu, Space gacha/đóng kết quả, D độ khó); màn dọc điện thoại là dải letterbox nhỏ bị HUD/nút che; nút modal 68×17 px; thiên kiếp quá gắt. M7-11: autopilot thua boss cuối trong browser dù sim 8/8. **M7-02 xong 13/11** (`docs/playtest/M7_02.md`): các lỗi UI trên đã sửa trừ thua boss cuối (để M7-11 đo); thiên kiếp gắt: người phát triển quyết định 13/11 giữ nguyên độ khó, không giảm; màn dọc có lời nhắc xoay ngang, chưa có bố cục dọc riêng. **M7-04 xong 13/11**: log playtest opt-in trong Cài đặt (khóa riêng `tutien_playtest_v1`, không gửi mạng), người thử tự xuất file; phân tích bằng `node tools/playtest_funnel.mjs <thư mục>`; hướng dẫn `docs/playtest/HUONG_DAN_LOG_PLAYTEST.md`. Còn M7-03 (điện thoại thật) và M7-05 (≥8 người thử thật) — cần người phát triển. `tests/syntax.test.js` kiểm cú pháp mọi file src (main.js không có test nào khác nạp).
**M7-07 (13/11, phần làm):** màn kết quả có 2 mục tiêu meta + nút Đột phá/Tọa thiền/Vào bí cảnh mới (`FEATURES.resultGoals`, `src/progression/goals.js`); M7-B làm trước M7-05 vì chưa có người thử — mọi giả thuyết H còn INCONCLUSIVE tới khi playtest.
**M7-08 (13/11, phần làm):** Công Pháp Đồ Giám (phím K, `src/progression/codex.js`) dựng từ dữ liệu; tiến hóa khám phá lấy từ `meta.stats.evos`. **M7-09 (13/11, phần làm):** đổi bảng thẻ 1 lần/run (phím R, `FEATURES.draftReroll` bật), ưu tiên ghép tiến hóa (`FEATURES.draftSynergy` tắt tới khi playtest); sim `REROLL=1`/`SYNERGY=1`. **M7-10 (13/11, phần làm):** biến thể bí cảnh bốc ngẫu nhiên theo seed (người phát triển chọn), `RUN_VARIANTS` + `src/systems/variants.js`, sim `VARIANT=`. **M7-06 (13/11, phần làm):** 3 gợi ý người mới (`src/progression/tutorial.js`, `meta.tutorial` trong save). Phần làm của M7-B (06–10) xong hết; M7-11 cân bằng và mọi kết luận H1–H5 cần người thử (M7-05).
**M7-14 (13/11, phần làm, duyệt trước GATE B):** Bia Truyền Thừa (phím L, `src/data/lore.js`, `meta.lore`); tấm bia trong động phủ (`sprites/bia.*`, `HUB.BIA`, E cạnh bia để đọc) do ChatGPT vẽ. Lưu ý test browser: khung xem trước đôi khi mở tab `localhost:8123` (save thật) — luôn chuyển sang `127.0.0.1` và đóng tab localhost.
**M7-12 (13/11, phần làm, duyệt trước GATE B):** 2 tiến hóa mới `cuc_han_bang_tran` (kind frost) và `linh_chau_phong_an` (kind spiritSeal); sim có build `bang_han`, `linh_phong` (công pháp khóa mở sẵn qua `unlock`). Icon/VFX riêng do ChatGPT vẽ: `sprites/tien_hoa.*` (hàn ấn, khối băng, vòng phong ấn, gai băng nổ) + 2 icon trong `sprites/bieu_tuong.*`; dựng lại bằng `tools/merge_tien_hoa.py`. Lưu ý browser pane: trang game đôi khi kẹt lúc tải lần đầu sau navigate — `location.reload()` là chạy. Bot thua boss cuối trong trình duyệt: người phát triển bảo dừng điều tra; nghi do autopilot đi 8 hướng phím + 50 ms/quyết định.
**M7-13 (13/11, phần làm, duyệt trước GATE B):** chiêu phối boss (`BOSS.MINI/FINAL.REMIX`, `howlDash`, `prison` trong `src/entities/bosses.js`), chỉ từ độ khó Linh, cờ `FEATURES.bossRemix`. M7-C (12–14) phần làm xong hết; còn M7-11 cân bằng và M7-D cần người thử thật.
**Hướng mới (13/11, CHƯA DUYỆT):** sảnh chờ thành tông môn đi bộ (Thanh Huyền Tông) thay hàng 10 nút. Báo cáo gửi ChatGPT: `docs/BAO_CAO_2026-11-13_M7.md`; ChatGPT trả lời (bố cục 8 khu, tương tác E, HUD, onboarding, backlog M8-01..18, danh sách art): `docs/chatgpt_tong_mon_M8_2026-11-13.md`; concept ảnh (vẽ trong chat khác "Vẽ concept art tông môn"): `docs/concept/tong_mon_chatgpt.png`. Đã chốt (13/11): phong cách art = concept ảnh 2 (`docs/concept/tong_mon_chatgpt_2.png`, vẽ trong chat "Vẽ concept art nhân vật" — vẽ tiếp asset tông môn ở chat đó), bố cục = ảnh 1 (`docs/concept/tong_mon_chatgpt.png`); chi tiết `docs/M8_QUYET_DINH.md`. **M8-01 xong 13/11** (`docs/playtest/M8_01_AUDIT.md`): tag `pre-m8` (khôi phục), cờ `FEATURES.sectHub = false`, bảng 10 chức năng → hàm, phương án M8-02 (map tông môn cố định + tile BUILDING + test flood-fill) và M8-03 (registry tương tác `src/systems/interact.js`). **M8-02 xong 13/11** (`docs/playtest/M8_02.md`): bản đồ tông môn theo bố cục ảnh 1 (`src/data/sect_layout.js`, `makeSectMap`), công trình placeholder, sói trong rào; cờ vẫn tắt, thử `?sect=1`. **M8-02b xong 14/11** (`docs/playtest/M8_02b.md`): tông môn rộng gấp 2 (khung 88×64, bản đồ riêng 108×84), công trình/đồ vật/cây là sprite `tm_*` tách từ ảnh 1 (bám concept, trừ cổng và tụ linh trận giữ nguyên), `map.solidTile` + mặt nạ solid cho gốc cây/đồ vật. **M8-02d** (14/11): bệ pháp đài là hình lớn ChatGPT vẽ (`sprites/tm_be.png` + lớp che `tm_be_front.png` cắt dải 16 px xếp theo y trong `render.js`), va chạm sinh sẵn `src/data/sect_plaza.js` bởi `tools/build_be_phap_dai.py` (đa giác mặt sàn + bậc đo tay trên sprite). Cách làm này (mảng địa hình vẽ sẵn + lưới va chạm sinh tự động) dùng tiếp cho thềm công trình, vách núi, bờ suối. (Bản M8-02c vách/lan can vẽ bằng code đã bỏ.) **14/11: `sw.js`** (service worker, chỉ bản https/GitHub Pages): mọi file cùng trang luôn kiểm tra lại máy chủ (`cache: 'no-cache'`) -> cập nhật web là người chơi thấy ngay, không phải chờ 10 phút / Ctrl+F5. **14/11: `?tuvi=full`** (thử thiên kiếp bằng tay): đổ đầy tu vi, tự lên tầng nhỏ tới mốc đại cảnh giới gần nhất rồi dừng trước thiên kiếp — có sửa save của người mở link. **14/11: `FEATURES.sectHub` BẬT mặc định** (người phát triển duyệt; `?sect=0` quay về động phủ cũ). **M8-03 xong 14/11** (`docs/playtest/M8_03.md`): đi tới khu + E (`systems/interact.js`, `SECT_POINTS` trong main.js). Kế tiếp M8-04 (registry tương tác E).
1. Đóng GATE v0.4 cần trình duyệt chạy đủ khung hình + máy thật: đo `?stress=1` với F3 (Cao/Thấp), nghe âm thanh, thử joystick trên điện thoại, chụp trước/sau biome.
2. Còn làm M5: VFX beanfx đã đủ cho mọi công pháp, tiến hóa và chiêu boss (2 đợt, `vfx/drafts/README.md`, đã xem trong trình duyệt); sprite nhân vật đã có (ChatGPT vẽ sheet → `tools/sprite_clean.py` làm sạch → `sprites/nhan_vat.*`), sprite quái + boss đã có (`sprites/quai.*`, `sprites/boss.*`, cùng quy trình); biome rừng đã làm lại (`sprites/rung.*` + ô nền mới, `docs/m5_01_truoc_sau.png`). Khung nhìn giờ 640×360 (thu camera), cây ×2, sân bí cảnh 56×56; quái lẻ luôn sinh ngoài khung camera (`inCameraView`).
3. Nên có: xem nhanh M3/M4 trong trình duyệt.

---

## 8. Giấy phép

- `vfx/kit/`, `lib/beanfx.js`: từ [baenv/beanfx](https://github.com/baenv/beanfx), MIT, có LICENSE.
- `fx/pixelfx/`: xuất từ [patch-gg/pixelfx](https://github.com/patch-gg/pixelfx) commit `044e12a`, MIT; LICENSE và NOTICE (ghi công Hugo Duprez, Hollow Crown) đi kèm.
- Mọi hình ảnh khác và 5 hiệu ứng trong `fx/` là vẽ mới cho dự án này.
