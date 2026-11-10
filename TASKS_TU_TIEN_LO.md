# EXECUTION BACKLOG — TU TIÊN LỘ

> **Ngày:** 10/11/2026 | **Liên kết thiết kế:** `GDD_TU_TIEN_LO.md` | **Nguồn hiện trạng:** `HANDOFF.md`  
> **Người thực hiện:** Claude Code trong repository dự án hiện hữu.  
> **Quy tắc quan trọng:** thực hiện **tuần tự theo milestone**. Không triển khai gacha hoặc MMORPG trước khi `v0.2` có vòng run thực sự chơi được.

## A. LỆNH CHO CLAUDE CODE — đọc trước khi sửa code

1. Đọc **toàn bộ** `HANDOFF.md`, `GDD_TU_TIEN_LO.md`, file code và cấu trúc thư mục thực tế; xác minh tài liệu có khớp source không.
2. Kiểm tra git. Nếu chưa có repo, tạo git trong project với `.gitignore` phù hợp (bỏ `.venv`, cache, file tạm); **không được tự ý xóa file chưa commit**. Tạo commit/snapshot baseline trước refactor nếu môi trường cho phép; nếu không, backup nguyên trạng.
3. Chạy game bằng `python -m http.server 8123` (hoặc launch config hiện hữu), thực hiện smoke tests baseline; ghi lỗi và screenshot/video nếu công cụ hỗ trợ.
4. Chỉ làm **một nhóm task cùng lúc**. Trước khi sửa: đọc acceptance criteria. Sau khi sửa: chạy tests + thử thực tế + cập nhật task.
5. Không rewrite toàn game sang Phaser/PixiJS/3D; không xóa VFX beanfx, tụ linh trận, 18 bậc cảnh giới hay cơ chế save cũ. Migration trước khi đổi schema.
6. Chỉ đánh dấu `[x]` khi **thực sự test và đạt**. Nếu chưa có browser/device thực, ghi `BLOCKED / NOT VERIFIED`, **không suy diễn pass từ code**.
7. Mọi thông số gameplay phải để config/data. Đảm bảo feature mới có thể tắt qua cờ (feature flag) khi chưa ổn để gameplay cũ còn chạy.
8. Không thêm dependency lớn nếu chưa giải thích vì sao cần; ưu tiên JS module thuần. Nếu thêm thư viện, ghi lý do/giấy phép/bundle impact.
9. Mỗi phiên làm xong ghi `CHANGELOG_DEV.md` hoặc phần **Nhật ký triển khai** cuối file: đã làm, file sửa, test pass/fail, bug tồn, bước tiếp theo. **Không tự nhận toàn dự án đã hoàn thành.**
10. Khi phân vân giữa việc làm thêm 10 tính năng và hoàn thiện một vòng chơi, **ưu tiên một vòng chơi có thể trải nghiệm được**.

### Quy ước task

- `[ ]` chưa làm | `[x]` hoàn thành và đã test | `[~]` đang làm | `[!]` bị chặn.
- Độ ưu tiên: **P0** phải làm trước; **P1** cho vertical slice; **P2** sau khi v0.2 chạy tốt; **P3** tương lai.
- Quy mô `S/M/L` là độ lớn tương đối, **không phải ước lượng thời gian**.
- Thứ tự dependency ghi rõ trong từng task. Sau mỗi milestone có **Gate**: không sang mốc tiếp nếu còn test nghiêm trọng fail.

---

## M0 — BẢO TOÀN PROTOTYPE & CHẤT LƯỢNG NỀN (P0)

### M0-01 [x] Audit, snapshot, baseline (S)
**Phụ thuộc:** không.  
**Làm:** kiểm tra source thực tế, git/backup, xác thực chạy trên local server, console lỗi, các file trong `fx`, giấy phép MIT, launch config.

**Nghiệm thu:**
- Có baseline có thể rollback; danh sách file và màn hình hiện tại; ghi SHA/commit nếu có.
- Có hướng dẫn start game; không xóa tài sản/cấu hình cũ.
- Các vấn đề được đánh dấu `VERIFIED` hoặc `NOT VERIFIED` rõ ràng.

### M0-02 [x] Regression test chức năng đã có (M)
**Phụ thuộc:** M0-01.  
**Làm:** test WASD/mũi tên, Space/J, T, B, 1, 2, hub/safe zone, địch/trúng/collision, UI nút, VFX 5 loại; thử chết -> respawn, mua đan, reload save (các mục handoff ghi chưa test).

**Nghiệm thu:**
- Viết `TEST_REPORT.md` với bảng bước test/kết quả/console lỗi.
- Không thay đổi cân bằng trước khi xác định baseline.
- Lỗi hiện hữu được lập task hoặc ghi rõ lý do chặn.

### M0-03 [x] Tối thiểu bộ test logic + debug harness (M)
**Phụ thuộc:** M0-01.  
**Làm:** chuẩn bị runner test nhẹ (Node built-in test nếu phù hợp), PRNG seed-injectable cho code mới, game-state inspect/debug và bộ test regression nền. Hạn chế thêm tooling không cần thiết.

**Nghiệm thu:**
- Có một lệnh chạy test trong README/project docs; tối thiểu tests cho tính tu vi/cảnh giới, HP, tiền không âm, loading save.
- Có log failure hữu ích, không viết test chỉ kiểm tra file tồn tại.

### M0-04 [x] Thiết kế schema save v2 + migration an toàn (M)
**Phụ thuộc:** M0-02, M0-03.  
**Làm:** tách meta/run state, migration từ `tutien_save_v1` sang version mới, valid/default, backup/export/import nếu khả thi.

**Nghiệm thu:**
- Dùng save v1 mẫu vẫn giữ `L`, `tuvi`, HP, linh thạch, đan, vị trí.
- Reload v2 thành công, save hỏng không gây crash hoặc âm thầm xóa hết.
- Không ghi đè v1 khi chưa xác minh migration; có test dữ liệu biên/độc hại.

### M0-05 [x] Refactor module theo lát cắt (L)
**Phụ thuộc:** M0-01..04.  
**Làm:** tách ít nhất core/state/config, combat/entities, progression, render/VFX, UI, persistence; giữ entry `index.html`, giữ asset beanfx hoạt động.

**Nghiệm thu:**
- Gameplay baseline vẫn chạy và test không regression.
- `game.js` không tiếp tục là nơi duy nhất chứa toàn bộ tính năng mới; không tạo vòng import.
- Các hệ thống mới có interface/hàm rõ ràng và data config.

**GATE M0:** Chỉ tiếp tục khi baseline chơi được, save cũ không mất, test runner hoạt động, không có regression blocker.

> **Kết quả 10/11/2026: ĐẠT.** Baseline commit `0032429` (tag `baseline-v0.1`). Save v1 migrate trong trình duyệt thật, `tutien_save_v1` giữ nguyên. `npm test` 41/41. Regression động phủ chạy lại bằng phím thật trên code mới (TEST_REPORT §3.1). Chi tiết: `TEST_REPORT.md`, ADR 0001.

---

## M1 — COMBAT + THẺ NÂNG CẤP: PROOF OF FUN (P1)

### M1-01 [x] Run state machine và cổng vào/ra bí cảnh (M)
**Phụ thuộc:** M0 Gate.  
**Làm:** state `HUB -> PREPARE -> RUN -> CARD_DRAFT -> RUN -> RESULTS -> HUB`; placeholder arena dùng asset/map cũ; trả nhân vật và camera đúng vị trí; quản lý pause.

**Nghiệm thu:**
- Vào/thoát run nhiều lần không chồng state, mất input hoặc spawn trùng quái.
- `runState` mới mỗi lượt; `metaState` giữ lại; điều khiển cũ còn dùng ở hub.

### M1-02 [x] Chiến đấu tự động/hybrid có thể cấu hình (M)
**Phụ thuộc:** M1-01.  
**Làm:** cooldown auto skill ưu tiên, mục tiêu gần nhất hợp lệ; bản đầu giữ kiếm khí và manual Space/J; ưu tiên cảm giác điều khiển và readability.

**Nghiệm thu:**
- Kỹ năng tấn công đúng cooldown, không spam ngoài tầm/qua vật cản ngoài ý muốn.
- Người chơi chủ yếu di chuyển vẫn chiến đấu được; manual không bị hỏng.
- Không tấn công trong hub khi không bật chế độ đúng.

### M1-03 [x] EXP theo run + xử lý tăng nhiều cấp (M)
**Phụ thuộc:** M1-01, M0-03.  
**Làm:** `runXp`, `runLevel`, công thức config, drop/nhặt EXP, queue level-up; render HUD XP.

**Nghiệm thu:**
- EXP của run không làm tăng `cultivationXp` trực tiếp.
- Thêm đủ XP cho 3 cấp một lúc -> có đúng 3 lần lựa chọn, không mất hay nhân đôi.
- Kết thúc run reset level/xp, không reset realm.

### M1-04 [x] Draft 1 trong 3 thẻ (L)
**Phụ thuộc:** M1-03.  
**Làm:** data-driven pool, eligibility, unique card selection, UI đầy đủ tên/icon/cấp/mô tả, click/tap/phím, paused world, xử lý pool thiếu thẻ.

**Nghiệm thu:**
- Chỉ chọn đúng **1** thẻ cho mỗi lần lên cấp; click đúp không nhận 2 lần.
- Thẻ max cấp/không đủ điều kiện không hiển thị; pool thiếu 3 vẫn không softlock.
- Quái/projectile/timer dừng khi chọn và resume đúng; UI không bị khóa do blur/reload.

### M1-05 [x] Skill definitions + 3 lối build đầu (L)
**Phụ thuộc:** M1-02..04.  
**Làm:** thiết kế đủ 12 công pháp trong data; triển khai tối thiểu bộ Kiếm/Hỏa/Lôi hoạt động có cấp nâng khác nhau; skill data tách logic render, có cap DoT/chain.

**Nghiệm thu:**
- Ít nhất 3 build khác biệt rõ về nhịp đánh, khoảng cách hoặc trạng thái địch.
- Không có NaN/Infinity, projectiles không trôi vô hạn, trạng thái đốt/giật không stack vô hạn.
- Có automated tests cho cooldown, damage, effect cap.

### M1-06 [~] Tiến hóa công pháp theo công thức (L)
**Phụ thuộc:** M1-05.  
**Làm:** resolver cho 4 combo thiết kế: Liệt Diễm Kiếm Trận, Lôi Đình Vạn Kiếm, Hỏa Long Quyển, Lôi Cương Hộ Thể; nếu skill phụ chưa có thì làm đủ logic để evolution test end-to-end. Art placeholder cho combo chưa có VFX.

**Nghiệm thu:**
- Cả 4 combo kích hoạt hợp lệ **bằng gameplay bình thường**, không chỉ debug console.
- Tiến hóa không lặp vô hạn / không cộng sai cấp; có chuyển đổi hành vi và hiệu ứng phân biệt.
- Có cách hiện điều kiện tiến hóa trong UI mà không spoil mọi bí mật nếu không muốn.

**GATE M1:** Có thể vào run, di chuyển, đánh, lên cấp, chọn thẻ, tạo ít nhất 3 build, tiến hóa 4 combo, thoát run; không có softlock hoặc memory leak rõ ràng.

> **Kết quả 10/11/2026: CHƯA ĐẠT ĐỦ.** Vào run, đánh, lên cấp, chọn thẻ, thoát run, chết, tải lại giữa bảng thẻ đều đã thử bằng phím thật. Lôi Đình Vạn Kiếm đã tiến hóa bằng chơi thật (TEST_REPORT M11). 3 tiến hóa còn lại mới xác minh bằng test tự động + bot mô phỏng (`tools/sim.mjs`), **chưa chơi tay**. Chưa đo memory leak. Cân bằng: build Kiếm+Lôi vượt trội.

---

## M2 — COMPLETE RUN VERTICAL SLICE (P1)

### M2-01 [ ] Director thời gian và wave/quái (L)
**Phụ thuộc:** M1 Gate.  
**Làm:** sinh quái theo nhịp khó tăng dần, phân 3–4 archetype (chaser, charger, ranged, elite); giữ 4 yêu thú cũ khi phù hợp, thêm warning cho địch lao/bắn.

**Nghiệm thu:**
- Wave tăng độ khó nhờ hành vi + bố cục, không chỉ tăng HP.
- Không spawn địch ngay trên người chơi/điểm không đi được; cap số enemy và cost.
- Run dễ tái hiện bằng seed để debug.

### M2-02 [ ] Mini-boss, boss cuối, telegraph (L)
**Phụ thuộc:** M2-01.  
**Làm:** mini-boss giữa run, boss cuối 2–3 mẫu đòn, HP bar, vùng cảnh báo rõ, reward hook.

**Nghiệm thu:**
- Có thể thắng **bằng thao tác thật** và có thể thua; không cần debug cheat.
- Cảnh báo xuất hiện trước hit đủ lâu, giữ rõ khi bật nhiều VFX; thử giảm hiệu ứng.
- Boss không kẹt map, không tung chiêu ngoài state và không spam spawn sau chết.

### M2-03 [ ] Kết quả run + phần thưởng commit một lần (L)
**Phụ thuộc:** M2-02, M0-04.  
**Làm:** `RUNNING -> WIN/LOSE -> REWARD_PENDING -> REWARDED -> HUB`, bảng kết quả, `linhThach`, `lingQi`, `craftMats`, ticket nếu phù hợp; idempotent transaction.

**Nghiệm thu:**
- Thắng/thua có thưởng tương xứng; chết không mất cảnh giới/đồ/công pháp mở khóa.
- Click nhận nhiều lần, reload giữa trao thưởng không nhân đôi tiền/vé.
- Run thứ hai reset hết buff tạm nhưng vẫn giữ meta rewards.

### M2-04 [ ] Cân bằng một run hoàn chỉnh (M)
**Phụ thuộc:** M2-01..03.  
**Làm:** run đầu 6–8 phút để test nhanh, sau đó mở mục tiêu 12–15 phút nếu nhịp chơi tốt; điều chỉnh XP, spawn, sát thương, reward, tỷ lệ xuất hiện combo.

**Nghiệm thu:**
- Có nhật ký >= 5 lượt playtest nội bộ với build khác nhau, thời gian, level, lý do chết/thắng; nếu không có người chơi thật thì ghi hạn chế.
- Ít nhất 3 build đủ khả năng hoàn tất khi chơi hợp lý; không một combo vượt trội tuyệt đối trong mọi tình huống.
- Kết thúc lượt thấy được mục tiêu/lựa chọn tiếp theo.

**GATE v0.2:** Từ khởi động game -> hub -> run -> chọn thẻ -> tiến hóa -> boss -> thưởng -> hub -> run lại; không sửa state bằng console; save/reload ổn; ghi review cảm giác chơi.

---

## M3 — META TU TIÊN: THIỀN, CẢNH GIỚI, THIÊN KIẾP (P2)

### M3-01 [ ] Hệ `lingQi` -> `cultivationXp` qua tọa thiền (M)
**Phụ thuộc:** M2 Gate.  
**Làm:** tách linh khí từ rewards, chuyển hóa khi thiền, hiệu suất tụ linh trận, thông báo tiến độ và giới hạn AFK, giữ VFX cũ.

**Nghiệm thu:**
- Thiền khi có linh khí tăng tu vi đúng config; khi hết không tạo lợi thế AFK vô hạn.
- Di chuyển ngắt thiền, safe zone làm việc, reload không nhân đôi chuyển hóa.
- Dùng Tụ Khí Đan trong hệ mới có mô tả/giá/phí nhất quán.

### M3-02 [ ] Cảnh giới, ngưỡng và phần thưởng mở khóa (M)
**Phụ thuộc:** M3-01.  
**Làm:** giữ đúng 18 bậc, đột phá bậc nhỏ, UI nêu chỉ số/tính năng mới, chỉnh power scaling nếu cần theo playtest.

**Nghiệm thu:**
- Có test biên `L=8->9`, `11->12`, `14->15`, max `L=17`.
- Realm giữ khi kết thúc run/thua/reload, không lẫn runLevel.
- Người mới vẫn build được ít nhất một lối chơi hấp dẫn.

### M3-03 [ ] Thiên kiếp tương tác 3 giai đoạn (L)
**Phụ thuộc:** M3-02.  
**Làm:** thay random 70% thuần bằng arena thử thách có telegraph, né, phòng thủ, kết quả; dùng `loi_kiep` và `dot_pha`; có toggle reduced effects.

**Nghiệm thu:**
- Người chơi **tự thao tác** vượt qua được; timing công bằng; thắng/thua không do RNG độc lập quyết định.
- Thua không tụt cảnh giới đang có; thưởng/phạt chính xác; không spam phím để đột phá trùng.
- Không phá save cũ, không gây flashing quá mạnh khi chọn giảm hiệu ứng.

### M3-04 [ ] Nút nghỉ/thiền trong bí cảnh [THỬ NGHIỆM] (M)
**Phụ thuộc:** M3-01, M2 Gate.  
**Làm:** 1 điểm linh mạch/đợt nghỉ có lựa chọn trade-off: hồi máu, buff hoặc lấy tài nguyên; không cho người chơi spam hồi máu ngay giữa combat.

**Nghiệm thu:**
- Một điểm nghỉ dùng đúng số lần, không exploit, tương tác dễ hiểu.
- Không làm gián đoạn wave/boss sai trạng thái.

**GATE v0.3a:** Sau một hoặc vài run, người chơi có thể tọa thiền -> đột phá -> độ kiếp bằng tương tác -> mở khóa tính năng -> thử run khác.

---

## M4 — TRANG BỊ, SƯU TẬP, GACHA (P2)

### M4-01 [ ] Trang bị tối thiểu + luyện khí (L)
**Phụ thuộc:** M3 Gate hoặc ít nhất M2 Gate + meta schema ổn.  
**Làm:** 3–4 slot tối giản, item definitions, stats/affixes có trade-off, craft mats, nâng cấp có cap, equip/unequip, UI.

**Nghiệm thu:**
- Trang bị đổi hành vi gameplay hoặc có trade-off đo được, không chỉ +stat ngẫu nhiên vô hạn.
- Lưu/reload đúng, không trang bị trùng ở nhiều slot sai luật, không trừ tiền âm.

### M4-02 [ ] Mở khóa công pháp bằng thành tựu (M)
**Phụ thuộc:** M2 Gate, M0-04.  
**Làm:** kho công pháp vĩnh viễn và unlock conditions (đánh boss, vượt thử thách, tăng cảnh giới); pool draft lấy từ unlock.

**Nghiệm thu:**
- Người chơi mới có sẵn bộ cơ bản đủ chơi; mở khóa mới tạo build mới.
- Unlock persist; có ít nhất một lộ trình **chắc chắn** nhận công pháp quan trọng mà không quay gacha.

### M4-03 [ ] Truyền Thừa Các: gacha bằng vé game (L)
**Phụ thuộc:** M4-02, M4-01, M0-04.  
**Làm:** vé kiếm từ run/thành tựu, danh mục phần thưởng, tỷ lệ hiển thị, pity, duplicates -> mảnh, cửa hàng đổi mảnh, lịch sử lượt quay; RNG được test.

**Nghiệm thu:**
- 0 vé không quay được; không phát thưởng khi lỗi lưu; spam click không quay trùng ngoài ý muốn.
- Pity bảo đảm đúng, duplicates đổi mảnh đúng, người chơi chọn đổi mục tiêu, odds hiển thị khớp config.
- Không có đường nạp tiền thật hoặc kỹ năng độc quyền bắt buộc thắng game.

**GATE v0.3b:** Có vòng run kiếm tài nguyên -> nâng đồ/mở công pháp/gacha -> thử lại với build mới, không có lỗ hổng nhân bản vật phẩm.

---

## M5 — VISUAL PSEUDO-2.5D, AUDIO, HIỆU NĂNG (P2)

### M5-01 [ ] Art direction prototype một khu (M)
**Phụ thuộc:** M0 Gate, ưu tiên làm song song art concept với M1 nhưng không rewrite game.  
**Làm:** 1 scene rừng tiên hiệp với tụ linh trận, cây nhiều lớp, vật thể che nhân vật có sắp thứ tự y, bóng chân, palette rõ; đối chiếu bản đang chạy.

**Nghiệm thu:**
- Screenshot trước/sau cùng vị trí; art giữ pixel edges, không làm gameplay khó đọc.
- Thử zoom/màn hình rộng/hẹp; không tăng nội bộ resolution bừa bãi.

### M5-02 [ ] Character/enemy sprite pipeline (L)
**Phụ thuộc:** M5-01.  
**Làm:** thay dần sprites mã bằng sprite sheet nhất quán khi asset đạt chất lượng, animation đi/đánh/trúng/thiền, giữ fallback prototype; địch có silhouette phân biệt.

**Nghiệm thu:**
- Bốn hướng không méo/lệch pivot; hitbox không phụ thuộc art size; asset license/nguồn rõ.
- FPS không giảm bất thường khi thay art.

### M5-03 [ ] VFX ngũ hành + telegraph & accessibility (L)
**Phụ thuộc:** M1-06, M2-02, M5-01.  
**Làm:** dùng beanfx để làm VFX ưu tiên cho 3 build + 4 evolution + boss; cap light/particles; có reduced effects/screen shake controls.

**Nghiệm thu:**
- Các FX xuất/đọc được đúng cấu trúc, không chạm khung sai nếu dùng beanfx export.check.
- Player vẫn phân biệt được attack danger; tắt giảm hiệu ứng hoạt động.

### M5-04 [ ] Profiling + stress test + graphics settings (L)
**Phụ thuộc:** M2 Gate, M5-03 (có thể tạo harness sớm).  
**Làm:** stress test target 100 enemy/200 projectile/300 particles, đo frame-time CPU/render và memory, tối ưu pooling/culling/spatial hash; Low/Medium/High.

**Nghiệm thu:**
- Báo cáo có máy/browser, scene, số lượng, FPS median/p1 hoặc frame-time p95, memory; trước/sau tối ưu.
- Mục tiêu: desktop 60 FPS, mobile tầm trung >=30 FPS ổn định ở thiết lập phù hợp. Nếu chưa đạt, ghi bottleneck và tối ưu tiếp, **không tự tuyên bố đạt**.
- Quyết định giữ Canvas hoặc đề xuất PixiJS/Phaser dựa trên số liệu; có migration plan nếu thật sự cần.

### M5-05 [ ] SFX/music và cài đặt (M)
**Phụ thuộc:** M2 Gate.  
**Làm:** SFX trúng đòn, thẻ, evolution, boss, thiền, độ kiếp; music ambient; music/sfx volume + mute; hỗ trợ user gesture audio.

**Nghiệm thu:**
- Không phát chồng audio vô hạn; reload giữ settings; mute chuẩn; asset rights phù hợp.

### M5-06 [ ] Mobile input + responsive (L)
**Phụ thuộc:** M2 Gate, M1-04, M5-04.  
**Làm:** joystick/touch, responsive HUD/thẻ, safe area, pause khi đổi tab; test trên thiết bị hoặc giả lập.

**Nghiệm thu:**
- Hoàn thành một run bằng cảm ứng, chọn thẻ/boss/menu hoạt động, không scroll trang khi joystick.
- Nếu chưa có thiết bị, ghi `NOT VERIFIED ON REAL DEVICE`, không tuyên bố mobile-ready.

**GATE v0.4:** Một biome đẹp, gameplay vẫn đọc rõ và mượt với quality settings; có audio/cảm ứng thực tế đã test hoặc ghi rõ giới hạn.

---

## M6 — LATER / KHÔNG ĐƯỢC TỰ LÀM (P3)

- [ ] `M6-01` Thêm bí cảnh/biome/boss sau khi build loop được playtest tốt.
- [ ] `M6-02` Meta progression nâng cao: thầy dạy công pháp, thiên phú, crafting nhiều nhánh.
- [ ] `M6-03` Account và cloud save với backend authoritative (Cloudflare Workers/D1 hoặc Supabase cần quyết định riêng).
- [ ] `M6-04` Bảng xếp hạng/chat/tông môn/world boss/PvP, chỉ khi thiết kế anti-cheat/server scalability.
- [ ] `M6-05` Monetization/ads/payment: **chưa được phép code**, cần brief riêng về kinh tế game và pháp lý.

---

## B. CẤU TRÚC MỖI LẦN CLAUDE BÁO CÁO

Sau mỗi nhóm task, trả về đúng format dễ kiểm tra:

```md
### Báo cáo phiên triển khai
- Task ID: M1-03
- Trạng thái: DONE / PARTIAL / BLOCKED
- Đã thay đổi: ...
- File tạo/sửa: ...
- Cách chạy: ...
- Test tự động: lệnh + PASS/FAIL và số lượng
- Test bằng gameplay thật: các bước đã bấm + kết quả
- Save migration / regression: PASS/FAIL/NOT VERIFIED
- FPS nếu ảnh hưởng render: cấu hình thiết bị + kết quả/NOT MEASURED
- Bug / giới hạn còn lại: ...
- Bước tiếp theo theo dependency: ...
```

**Bắt buộc:** không đổi tick `[ ] -> [x]` khi còn mục `NOT VERIFIED` ở điều kiện bắt buộc của task đó.

## C. CHECKLIST NGHIỆM THU XUYÊN SUỐT

- [ ] Mất save cũ = **blocker**.
- [ ] Run reward nhận lặp = **blocker**.
- [ ] Thẻ chọn 2 lần/mất cấp/softlock = **blocker**.
- [ ] VFX che telegraph boss = **blocker đối với bản phát hành**.
- [ ] Tăng trưởng sức mạnh gây tràn số/NaN = **blocker**.
- [ ] Đổi renderer khiến bản chơi cũ không chạy = **blocker**.
- [ ] Asset nguồn/IP không có quyền sử dụng = **blocker**.
- [ ] Console lỗi nghiêm trọng/collision kẹt vĩnh viễn = **blocker**.

## D. QUYẾT ĐỊNH KỸ THUẬT CẦN GHI LẠI (ADR)

Tạo thư mục `docs/adr/` hoặc phần ghi chú khi có quyết định ảnh hưởng lớn:

1. Quyết định `runState/metaState` + save schema.
2. Chế độ auto-attack/hybrid và kết quả thử cảm giác.
3. Mô hình XP/draft/evolution, nhất là khi có nhiều level-up cùng tick.
4. Thiên kiếp tương tác và cơ chế phạt.
5. Các cơ chế gacha, pity, dupe, odds và kiểm thử công bằng.
6. Quyết định giữ Canvas 2D hay chuyển render WebGL dựa benchmark.

---

## E. NHẬT KÝ TRIỂN KHAI

> Claude Code điền sau từng phiên; chỉ ghi điều có bằng chứng.

| Ngày | Task ID | Trạng thái | Kiểm thử | Ghi chú |
|---|---|---|---|---|
| 2026-11-10 | — | SPEC WRITTEN | Chưa chạy code | GDD và backlog được soạn từ HANDOFF và các quyết định đã thảo luận |
| 2026-11-10 | M0-01 | DONE | git init, commit `0032429` + tag `baseline-v0.1`; chạy local OK, console sạch | `.gitignore` bỏ `.venv/`, `backups/`; save trình duyệt sao ra `backups/` |
| 2026-11-10 | M0-02 | DONE | 13 bước baseline PASS, 1 FAIL nhỏ (phím bấm nhanh bị bỏ qua, đã sửa ở M0-05); mobile NOT VERIFIED | `TEST_REPORT.md` §1 |
| 2026-11-10 | M0-03 | DONE | `npm test` 41/41 PASS | `node:test`, không dependency; `mulberry32` có seed; `window.__game` |
| 2026-11-10 | M0-04 | DONE | 8 test save PASS; migrate thật trong trình duyệt PASS | save v2 + bak + corrupt; v1 chỉ đọc; xuất/nhập JSON (UI chưa thử tay) |
| 2026-11-10 | M0-05 | DONE | Regression động phủ trên code mới bằng phím thật PASS; 0 vòng import | `src/` 17 module; `game.js` cũ chuyển `legacy/game_v0.1.js` (không dùng) |
| 2026-11-10 | M1-01 | DONE | Vào/thoát nhiều lần bằng phím thật; test 5 run liên tiếp | Tự tạm dừng khi blur: PASS (sự kiện giả); đổi tab thật NOT VERIFIED |
| 2026-11-10 | M1-02 | DONE | Test hồi chiêu, tầm nhìn; Space tay trong run và động phủ PASS | ADR 0002 |
| 2026-11-10 | M1-03 | DONE | Test 3 cấp cùng lúc PASS; EXP không chạm meta | ADR 0003 |
| 2026-11-10 | M1-04 | DONE | Bấm đúp chỉ nhận 1 thẻ; thế giới dừng khi chọn; pool cạn có thẻ dự phòng; tải lại và blur giữa bảng thẻ không kẹt | blur là sự kiện giả |
| 2026-11-10 | M1-05 | DONE | 12 công pháp trong data, 8 đã chạy; test NaN/cap/cooldown PASS | Cân bằng chưa đều (bot) |
| 2026-11-10 | M1-06 | PARTIAL | 4 tiến hóa có test + bot đạt được; 1/4 chơi tay (Lôi Đình Vạn Kiếm) | Còn chơi tay 3 tiến hóa |

---

## F. PROMPT KHỞI ĐỘNG DÁN VÀO CLAUDE CODE

```text
Bạn đang tiếp tục dự án Tu Tiên Lộ có sẵn, KHÔNG được tạo game mới từ đầu.
Hãy đọc HANDOFF.md, GDD_TU_TIEN_LO.md và TASKS_TU_TIEN_LO.md trước.
Nhiệm vụ: thực hiện từ Milestone M0, đúng dependency, chỉ đánh dấu DONE nếu đã kiểm thử. Giữ nguyên các gameplay/asset hiện hữu khi refactor; luôn bảo toàn localStorage tutien_save_v1 và tạo rollback trước sửa lớn. Không tự chuyển engine, không tự làm online hoặc gacha trả tiền.

Bắt đầu bằng audit project và baseline chạy được (M0-01), sau đó thực hiện M0-02. Nếu đủ quyền/công cụ thì tạo test report, checkpoint và commit. Cuối phiên báo cáo task, file sửa, test thực tế, bug còn lại, bước tiếp theo. KHÔNG khẳng định test trên browser/mobile nếu chưa thực sự chạy.
```
