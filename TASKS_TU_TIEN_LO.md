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

### M1-06 [x] Tiến hóa công pháp theo công thức (L)
**Phụ thuộc:** M1-05.  
**Làm:** resolver cho 4 combo thiết kế: Liệt Diễm Kiếm Trận, Lôi Đình Vạn Kiếm, Hỏa Long Quyển, Lôi Cương Hộ Thể; nếu skill phụ chưa có thì làm đủ logic để evolution test end-to-end. Art placeholder cho combo chưa có VFX.

**Nghiệm thu:**
- Cả 4 combo kích hoạt hợp lệ **bằng gameplay bình thường**, không chỉ debug console.
- Tiến hóa không lặp vô hạn / không cộng sai cấp; có chuyển đổi hành vi và hiệu ứng phân biệt.
- Có cách hiện điều kiện tiến hóa trong UI mà không spoil mọi bí mật nếu không muốn.

**GATE M1:** Có thể vào run, di chuyển, đánh, lên cấp, chọn thẻ, tạo ít nhất 3 build, tiến hóa 4 combo, thoát run; không có softlock hoặc memory leak rõ ràng.

> **Kết quả 11/11/2026: ĐẠT.** Cả 4 tiến hóa đã kích hoạt bằng chơi thật, phím thật, trên 127.0.0.1: Lôi Đình Vạn Kiếm (2:56), Hỏa Long Quyển (2:14), Liệt Diễm Kiếm Trận (2:38), Lôi Cương Hộ Thể (4:30). Bộ nhớ: sau mỗi lượt về động phủ, run=null và đạn/vùng/chiến ý/hiệu ứng về 0 (đếm đối tượng; `performance.memory` không đo được). Không softlock. Còn tồn: cân bằng lệch (Kiếm+Lôi vượt trội, khởi đầu Lôi Kích yếu) → M2-04.
>
> *Kết quả 10/11/2026 (cũ): CHƯA ĐẠT ĐỦ.* Vào run, đánh, lên cấp, chọn thẻ, thoát run, chết, tải lại giữa bảng thẻ đều đã thử bằng phím thật. Lôi Đình Vạn Kiếm đã tiến hóa bằng chơi thật (TEST_REPORT M11). 3 tiến hóa còn lại mới xác minh bằng test tự động + bot mô phỏng (`tools/sim.mjs`), **chưa chơi tay**. Chưa đo memory leak. Cân bằng: build Kiếm+Lôi vượt trội.

---

## M2 — COMPLETE RUN VERTICAL SLICE (P1)

### M2-01 [x] Director thời gian và wave/quái (L)
**Phụ thuộc:** M1 Gate.  
**Làm:** sinh quái theo nhịp khó tăng dần, phân 3–4 archetype (chaser, charger, ranged, elite); giữ 4 yêu thú cũ khi phù hợp, thêm warning cho địch lao/bắn.

**Nghiệm thu:**
- Wave tăng độ khó nhờ hành vi + bố cục, không chỉ tăng HP.
- Không spawn địch ngay trên người chơi/điểm không đi được; cap số enemy và cost.
- Run dễ tái hiện bằng seed để debug.

> **Kết quả 11/11/2026: XONG.** `src/systems/director.js` (giai đoạn + đợt + tinh anh + ngân sách cost) và `src/entities/archetypes.js` (lao/bắn xa/tinh anh có pha gồng + cảnh báo). Thông số ở `DIRECTOR`/`ARCH` trong config. 4 loài cũ giữ lại, mỗi loài một kiểu: Dã Lang đuổi, Hỏa Hồ lao, Huyền Băng Thú bắn, Ma Ảnh tinh anh (sprite x2). 13 test mới (tái hiện theo seed, chỗ sinh, ngân sách, né được từng đòn). Chơi thật tới 3:07: thấy đủ 4 kiểu, thông báo đợt, cảnh báo lao/bắn/đập; né được đòn đập tinh anh. Cân bằng: run khó hơn với build yếu -> M2-04.

### M2-02 [x] Mini-boss, boss cuối, telegraph (L)
**Phụ thuộc:** M2-01.  
**Làm:** mini-boss giữa run, boss cuối 2–3 mẫu đòn, HP bar, vùng cảnh báo rõ, reward hook.

**Nghiệm thu:**
- Có thể thắng **bằng thao tác thật** và có thể thua; không cần debug cheat.
- Cảnh báo xuất hiện trước hit đủ lâu, giữ rõ khi bật nhiều VFX; thử giảm hiệu ứng.
- Boss không kẹt map, không tung chiêu ngoài state và không spam spawn sau chết.

> **Kết quả 11/11/2026: XONG CODE, CHƯA ĐỦ NGHIỆM THU.** `src/entities/bosses.js`, thông số `BOSS` trong config. Lang Vương (4:00): lao 3 lần có cảnh báo + tru gọi bầy. Ma Ảnh Yêu Vương (7:00): đạn tỏa tròn (tia báo hướng), vùng hắc diễm quanh người chơi, đập đất khi áp sát; pha 2 dưới 50% máu, cuồng nộ sau 2:30. Thanh máu boss ở cạnh dưới màn, sơ hở sau mỗi chiêu (+50% sát thương), chặn one-shot (1 đòn ≤ 3% máu), chống kẹt (dịch chuyển), boss chết dọn vùng/đạn, mỗi boss sinh 1 lần. Thắng = hạ boss cuối; quá 15 phút = TIMEOUT. Reward hook: `run.rewards`. 12 test mới. Cảnh báo cả 5 chiêu đã xem trong trình duyệt (`docs/m2_02_*.png`, boss sinh bằng console để chụp). Bot hạ được cả 2 boss (Kiếm+Lôi, 8:32).
> **12/11: ĐÓNG.** Chơi trọn run trong trình duyệt (phím thật cho luồng, autopilot phát phím cho di chuyển — xem `docs/playtest_M2-04.md`): thắng Yêu Vương 2 lượt (6:39, 8:39), thua 1 lượt ở boss + 1 lượt trước boss; bật Giảm hiệu ứng bằng chuột thật, cảnh báo vẫn rõ. Sửa từ chơi thử: viền cảnh báo vẽ thêm trên tán cây; thanh máu boss mờ khi che boss; đập đất R64 → R48. Hạn chế: chưa có người thật.
> *(11/11)* **Chưa:** thắng/thua boss bằng **chơi thật trọn một run** — trình duyệt trong phiên này chỉ chạy 2–5 khung/giây (luồng chính rảnh, không có long task; do môi trường), không chơi được 7+ phút. Giảm hiệu ứng: chỉ kiểm bằng đọc code (cảnh báo không phụ thuộc `vis.reduce`), chưa bật thử trong trình duyệt.

### M2-03 [x] Kết quả run + phần thưởng commit một lần (L)
**Phụ thuộc:** M2-02, M0-04.  
**Làm:** `RUNNING -> WIN/LOSE -> REWARD_PENDING -> REWARDED -> HUB`, bảng kết quả, `linhThach`, `lingQi`, `craftMats`, ticket nếu phù hợp; idempotent transaction.

**Nghiệm thu:**
- Thắng/thua có thưởng tương xứng; chết không mất cảnh giới/đồ/công pháp mở khóa.
- Click nhận nhiều lần, reload giữa trao thưởng không nhân đôi tiền/vé.
- Run thứ hai reset hết buff tạm nhưng vẫn giữ meta rewards.

> **Kết quả 11/11/2026: XONG.** `src/progression/rewards.js`, `REWARD` trong config, ADR 0006. Kết thúc run → `meta.pendingReward` (lưu ngay) → nút "Nhận thưởng" cộng + ghi `rewardLog` + xóa pending trong một lần lưu; mở trang còn pending thì tự nhận. Tài nguyên mới: linh khí, luyện liệu, vé Cơ Duyên (HUD động phủ). 10 test mới. Trình duyệt: tải lại giữa bảng kết quả → nhận đúng 1 lần, tải lại tiếp không đổi; bấm đúp + Enter ×2 → cộng 1 lần.

### M2-04 [x] Cân bằng một run hoàn chỉnh (M)
**Phụ thuộc:** M2-01..03.  
**Làm:** run đầu 6–8 phút để test nhanh, sau đó mở mục tiêu 12–15 phút nếu nhịp chơi tốt; điều chỉnh XP, spawn, sát thương, reward, tỷ lệ xuất hiện combo.

**Nghiệm thu:**
- Có nhật ký >= 5 lượt playtest nội bộ với build khác nhau, thời gian, level, lý do chết/thắng; nếu không có người chơi thật thì ghi hạn chế.
- Ít nhất 3 build đủ khả năng hoàn tất khi chơi hợp lý; không một combo vượt trội tuyệt đối trong mọi tình huống.
- Kết thúc lượt thấy được mục tiêu/lựa chọn tiếp theo.

**GATE v0.2:** Từ khởi động game -> hub -> run -> chọn thẻ -> tiến hóa -> boss -> thưởng -> hub -> run lại; không sửa state bằng console; save/reload ổn; ghi review cảm giác chơi.

> **Kết quả 11/11/2026: CÂN BẰNG BẰNG BOT XONG, CHƯA CÓ PLAYTEST NGƯỜI THẬT.** Chi tiết `docs/playtest_M2-04.md`. Run 6–8 phút (Lang Vương 3:30, Yêu Vương 6:00). Bot biết né cảnh báo (12 seed/build): Kiếm+Lôi thắng 10/12, Phi Kiếm+Hỏa 7/12, Lôi+Thể 8/12, Hỏa+Phong 4/12 → **3 build hoàn tất được**, Kiếm+Lôi mạnh nhất nhưng không tuyệt đối. Sửa 2 lỗi gameplay (đạn nhiều tia trượt mục tiêu đơn; Phong Nhận bắn ngược khi chạy). Bảng kết quả có "Bước tiếp theo". Nhật ký 12 lượt bot có build/thời gian/cấp/lý do.
> **12/11:** 4 lượt chơi trong trình duyệt (2 thắng, 2 thua; 4 build) có nhật ký, GATE v0.2 đi trọn vòng hub → run → thẻ → tiến hóa → boss → thưởng → hub → run lại **không sửa state bằng console**. Còn lượt thứ 5 (trình duyệt bị ẩn giữa chừng) và **chưa có người thật**.
> *(11/11)* **Chưa:** ≥ 5 lượt playtest **người thật** (trình duyệt phiên này 2–5 khung/giây); **GATE v0.2 chưa xác minh** bằng chơi thật trọn vòng (hub → run → boss → thưởng → run lại); chưa mở run 12–15 phút.

---

## M3 — META TU TIÊN: THIỀN, CẢNH GIỚI, THIÊN KIẾP (P2)

### M3-01 [x] Hệ `lingQi` -> `cultivationXp` qua tọa thiền (M)
**Phụ thuộc:** M2 Gate.  
**Làm:** tách linh khí từ rewards, chuyển hóa khi thiền, hiệu suất tụ linh trận, thông báo tiến độ và giới hạn AFK, giữ VFX cũ.

**Nghiệm thu:**
- Thiền khi có linh khí tăng tu vi đúng config; khi hết không tạo lợi thế AFK vô hạn.
- Di chuyển ngắt thiền, safe zone làm việc, reload không nhân đôi chuyển hóa.
- Dùng Tụ Khí Đan trong hệ mới có mô tả/giá/phí nhất quán.

### M3-02 [x] Cảnh giới, ngưỡng và phần thưởng mở khóa (M)
**Phụ thuộc:** M3-01.  
**Làm:** giữ đúng 18 bậc, đột phá bậc nhỏ, UI nêu chỉ số/tính năng mới, chỉnh power scaling nếu cần theo playtest.

**Nghiệm thu:**
- Có test biên `L=8->9`, `11->12`, `14->15`, max `L=17`.
- Realm giữ khi kết thúc run/thua/reload, không lẫn runLevel.
- Người mới vẫn build được ít nhất một lối chơi hấp dẫn.

### M3-03 [x] Thiên kiếp tương tác 3 giai đoạn (L)
**Phụ thuộc:** M3-02.  
**Làm:** thay random 70% thuần bằng arena thử thách có telegraph, né, phòng thủ, kết quả; dùng `loi_kiep` và `dot_pha`; có toggle reduced effects.

**Nghiệm thu:**
- Người chơi **tự thao tác** vượt qua được; timing công bằng; thắng/thua không do RNG độc lập quyết định.
- Thua không tụt cảnh giới đang có; thưởng/phạt chính xác; không spam phím để đột phá trùng.
- Không phá save cũ, không gây flashing quá mạnh khi chọn giảm hiệu ứng.

### M3-04 [x] Nút nghỉ/thiền trong bí cảnh [THỬ NGHIỆM] (M)
**Phụ thuộc:** M3-01, M2 Gate.  
**Làm:** 1 điểm linh mạch/đợt nghỉ có lựa chọn trade-off: hồi máu, buff hoặc lấy tài nguyên; không cho người chơi spam hồi máu ngay giữa combat.

**Nghiệm thu:**
- Một điểm nghỉ dùng đúng số lần, không exploit, tương tác dễ hiểu.
- Không làm gián đoạn wave/boss sai trạng thái.

**GATE v0.3a:** Sau một hoặc vài run, người chơi có thể tọa thiền -> đột phá -> độ kiếp bằng tương tác -> mở khóa tính năng -> thử run khác.

> **Kết quả 12/11/2026: ĐÓNG GATE v0.3a ở mức logic** — theo chỉ đạo 12/11 ("không cần test nữa") bỏ kiểm tra trình duyệt. `tests/gate_v03a.test.js` chạy trọn chuỗi: run thắng mang linh khí về → lưu/nạp → tọa thiền tới viên mãn → thiên kiếp tương tác (người né theo cảnh báo thắng; đứng yên thua, giữ cảnh giới) → lên Trúc Cơ, mở Phi Kiếm Trận + độ khó Linh → lưu/nạp → run mới dùng mở khóa. **Chưa ai chơi M3 trong trình duyệt** — rủi ro còn lại là UI/hiển thị (màn chuẩn bị, thiên kiếp, Linh Mạch).
> - M3-01: tọa thiền chuyển hóa linh khí (4/s ×(1+0,15L), ×3 trong trận; 1 linh khí = 1,5 tu vi trong trận, 0,8 ngoài); hết linh khí chỉ còn 10% tốc độ cũ và chỉ trong trận; đầy thì ngừng tiêu. Yêu thú động phủ cho linh khí thay vì tu vi. Tụ Khí Đan = +linh khí (đủ 25% ngưỡng khi thiền trong trận), nút ghi rõ "+N✨". Sửa lỗi báo "viên mãn" không bao giờ hiện.
> - M3-02: 18 bậc giữ nguyên; đột phá ghi "Công a → b · Khí huyết c → d" và mở khóa; Trúc Cơ/Kim Đan/Nguyên Anh mở công pháp khởi đầu mới (Phi Kiếm Trận / Hộ Thể / Hỏa Luân) và độ khó bí cảnh Linh/Huyền/Thiên (quái ×1,3/1,6/1,8, thưởng ×1,5/2/2,8; phím D ở màn chuẩn bị). Save cũ ở cảnh giới cao tự nhận mở khóa. Test biên 8→9, 11→12, 14→15, max 17.
> - M3-03: thiên kiếp ~24 s, 3 nhịp (Lôi ấn: vòng sét; Lôi xà: dải sét; Thiên lôi: phủ trận trừ ô an toàn — luôn có 1 ô trong tầm 80 px), mọi đòn có cảnh báo lấp dần, giữ trong trận quanh tụ linh trận; khí huyết về 0 = thua (giữ cảnh giới, mất 30% tu vi); tải lại giữa chừng = thua (cờ `tribPending`). Seed cố định → kỹ năng quyết định: đứng yên thua mọi seed, bot né theo cảnh báo mất < 0,2 máu ở 20/20 seed. `TRIBULATION.ENABLED=false` quay về lôi kiếp cũ.
> - M3-04: Linh Mạch hiện khi hạ Lang Vương; đứng gần + E: Dưỡng thương (+50% máu) / Hấp thu (+20% sát thương tới hết lượt) / Thu linh khí (+60); một lần; phong ấn khi boss sống; thế giới dừng khi chọn.
> - Test: 102/102 (thêm tribulation, shrine, realm biên, cultivation linh khí).

---

## M4 — TRANG BỊ, SƯU TẬP, GACHA (P2)

### M4-01 [x] Trang bị tối thiểu + luyện khí (L)
**Phụ thuộc:** M3 Gate hoặc ít nhất M2 Gate + meta schema ổn.  
**Làm:** 3–4 slot tối giản, item definitions, stats/affixes có trade-off, craft mats, nâng cấp có cap, equip/unequip, UI.

**Nghiệm thu:**
- Trang bị đổi hành vi gameplay hoặc có trade-off đo được, không chỉ +stat ngẫu nhiên vô hạn.
- Lưu/reload đúng, không trang bị trùng ở nhiều slot sai luật, không trừ tiền âm.

### M4-02 [x] Mở khóa công pháp bằng thành tựu (M)
**Phụ thuộc:** M2 Gate, M0-04.  
**Làm:** kho công pháp vĩnh viễn và unlock conditions (đánh boss, vượt thử thách, tăng cảnh giới); pool draft lấy từ unlock.

**Nghiệm thu:**
- Người chơi mới có sẵn bộ cơ bản đủ chơi; mở khóa mới tạo build mới.
- Unlock persist; có ít nhất một lộ trình **chắc chắn** nhận công pháp quan trọng mà không quay gacha.

### M4-03 [x] Truyền Thừa Các: gacha bằng vé game (L)
**Phụ thuộc:** M4-02, M4-01, M0-04.  
**Làm:** vé kiếm từ run/thành tựu, danh mục phần thưởng, tỷ lệ hiển thị, pity, duplicates -> mảnh, cửa hàng đổi mảnh, lịch sử lượt quay; RNG được test.

**Nghiệm thu:**
- 0 vé không quay được; không phát thưởng khi lỗi lưu; spam click không quay trùng ngoài ý muốn.
- Pity bảo đảm đúng, duplicates đổi mảnh đúng, người chơi chọn đổi mục tiêu, odds hiển thị khớp config.
- Không có đường nạp tiền thật hoặc kỹ năng độc quyền bắt buộc thắng game.

**GATE v0.3b:** Có vòng run kiếm tài nguyên -> nâng đồ/mở công pháp/gacha -> thử lại với build mới, không có lỗ hổng nhân bản vật phẩm.

> **Kết quả 12/11/2026: XONG, GATE v0.3b đóng ở mức logic** (`tests/m4.test.js`, 13 test). ADR 0007. Chưa xem trong trình duyệt (theo chỉ đạo 12/11 "không cần test nữa"); đã kiểm tra cú pháp + liên kết module.
> - M4-01: 4 ô, 8 món một-ưu-một-nhược (Phi Hành Kiếm +1 đạn/−sát thương; Liệt Hỏa Đao; Huyền Quy Giáp; Phong Hành Y; Tụ Linh Châu +EXP; Hỏa Diễm Kính +phạm vi/hồi chiêu chậm; Hồi Xuân Giới hồi máu ×2; Sát Khí Giới +sát thương/nhận thêm 15%). Luyện 8🔩+80💎, nâng chắc chắn tới cấp 5. Bảng Luyện Khí (G).
> - M4-02: 2 công pháp mới hệ Băng (Băng Châm — kim băng làm chậm; Hàn Khí — nổ băng nhịp dài), khóa tới khi đạt thành tựu (hạ Lang Vương / hạ Yêu Vương) — lộ trình chắc chắn; 7 thành tựu thưởng vé/luyện liệu. Bảng Thành Tựu (J).
> - M4-03: Truyền Thừa Các (H): 1🎫/lượt, 70/25/5%, bảo hiểm 30, trùng → mảnh, đổi mảnh lấy đúng mục tiêu, lịch sử, RNG lưu trong save, giao dịch lưu-chắc-chắn, chống bấm dồn. Không có tiền thật.

---

## M5 — VISUAL PSEUDO-2.5D, AUDIO, HIỆU NĂNG (P2)

### M5-01 [~] Art direction prototype một khu (M)
**Phụ thuộc:** M0 Gate, ưu tiên làm song song art concept với M1 nhưng không rewrite game.  
**Làm:** 1 scene rừng tiên hiệp với tụ linh trận, cây nhiều lớp, vật thể che nhân vật có sắp thứ tự y, bóng chân, palette rõ; đối chiếu bản đang chạy.

**Nghiệm thu:**
- Screenshot trước/sau cùng vị trí; art giữ pixel edges, không làm gameplay khó đọc.
- Thử zoom/màn hình rộng/hẹp; không tăng nội bộ resolution bừa bãi.

### M5-02 [~] Character/enemy sprite pipeline (L)
**Phụ thuộc:** M5-01.  
**Làm:** thay dần sprites mã bằng sprite sheet nhất quán khi asset đạt chất lượng, animation đi/đánh/trúng/thiền, giữ fallback prototype; địch có silhouette phân biệt.

**Nghiệm thu:**
- Bốn hướng không méo/lệch pivot; hitbox không phụ thuộc art size; asset license/nguồn rõ.
- FPS không giảm bất thường khi thay art.

### M5-03 [~] VFX ngũ hành + telegraph & accessibility (L)
**Phụ thuộc:** M1-06, M2-02, M5-01.  
**Làm:** dùng beanfx để làm VFX ưu tiên cho 3 build + 4 evolution + boss; cap light/particles; có reduced effects/screen shake controls.

**Nghiệm thu:**
- Các FX xuất/đọc được đúng cấu trúc, không chạm khung sai nếu dùng beanfx export.check.
- Player vẫn phân biệt được attack danger; tắt giảm hiệu ứng hoạt động.

### M5-04 [~] Profiling + stress test + graphics settings (L)
**Phụ thuộc:** M2 Gate, M5-03 (có thể tạo harness sớm).  
**Làm:** stress test target 100 enemy/200 projectile/300 particles, đo frame-time CPU/render và memory, tối ưu pooling/culling/spatial hash; Low/Medium/High.

**Nghiệm thu:**
- Báo cáo có máy/browser, scene, số lượng, FPS median/p1 hoặc frame-time p95, memory; trước/sau tối ưu.
- Mục tiêu: desktop 60 FPS, mobile tầm trung >=30 FPS ổn định ở thiết lập phù hợp. Nếu chưa đạt, ghi bottleneck và tối ưu tiếp, **không tự tuyên bố đạt**.
- Quyết định giữ Canvas hoặc đề xuất PixiJS/Phaser dựa trên số liệu; có migration plan nếu thật sự cần.

### M5-05 [x] SFX/music và cài đặt (M)
**Phụ thuộc:** M2 Gate.  
**Làm:** SFX trúng đòn, thẻ, evolution, boss, thiền, độ kiếp; music ambient; music/sfx volume + mute; hỗ trợ user gesture audio.

**Nghiệm thu:**
- Không phát chồng audio vô hạn; reload giữ settings; mute chuẩn; asset rights phù hợp.

### M5-06 [~] Mobile input + responsive (L)
**Phụ thuộc:** M2 Gate, M1-04, M5-04.  
**Làm:** joystick/touch, responsive HUD/thẻ, safe area, pause khi đổi tab; test trên thiết bị hoặc giả lập.

**Nghiệm thu:**
- Hoàn thành một run bằng cảm ứng, chọn thẻ/boss/menu hoạt động, không scroll trang khi joystick.
- Nếu chưa có thiết bị, ghi `NOT VERIFIED ON REAL DEVICE`, không tuyên bố mobile-ready.

**GATE v0.4:** Một biome đẹp, gameplay vẫn đọc rõ và mượt với quality settings; có audio/cảm ứng thực tế đã test hoặc ghi rõ giới hạn.

> **Kết quả 12/11/2026: GATE v0.4 CHƯA ĐẠT** — phần làm được bằng code/test đã xong, phần cần mắt/tai/máy thật còn mở. Chưa xem trong trình duyệt (theo chỉ đạo 12/11 không test thêm; trình duyệt phiên này bị hãm khung hình/ẩn).
> - M5-01 [~]: cây/đá che nhân vật thì mờ 45% (thấy người chơi + cảnh báo phía sau). **Biome rừng (12/11):** vật thể do ChatGPT vẽ (`docs/concept/rung_vat_the_chatgpt.png` → `sprites/rung.*`, cỡ pixel gốc 6,65: tùng, lá rộng, đào, tre, đá rêu, gốc cây, đèn đá, cỏ, dương xỉ, hoa, sỏi, linh chi, sen); ô nền vẽ lại bằng code theo bảng màu mới (cỏ 8 biến thể có cụm cỏ/hoa, đá lát viên so le, nước 2 sắc + bờ đất mép trên). Cây/đá chắn đường như cũ; cỏ hoa/sen chỉ trang trí, vẽ dưới nhân vật. Ảnh trước/sau cùng vị trí: `docs/m5_01_truoc_sau.png`; trong bí cảnh: `docs/m5_01_bi_canh.png`. Nạp lỗi → hình code cũ.
> - M5-02 [~]: 4 loài có **dáng riêng** (không chỉ khác màu): Dã Lang tai nhọn, Hỏa Hồ đuôi lửa, Huyền Băng Thú sừng + chân trụ, Ma Ảnh bóng ma không chân; boss dùng dáng tương ứng; hitbox không đổi (`docs/m5_02_dang_quai.png`). **Nhân vật (12/11):** ChatGPT vẽ sprite sheet (nền magenta, lưới 6×5: `docs/concept/nhan_vat_sheet_chatgpt.png`) → `tools/sprite_clean.py` làm sạch (tách nền, đo cỡ pixel gốc 4,05 rồi thu nhỏ theo màu đa số, bảng màu chung 24 màu, căn chân) → `sprites/nhan_vat.png/json`: khung 60×46 (người cao ~34 px), 4 hướng × đi 4 + chém + trúng đòn, 2 khung thiền; trái/phải là khung riêng. Nạp lỗi → sprite code cũ; hitbox không đổi. Ảnh `docs/m5_02_nhan_vat.png`, `docs/m5_02_nhan_vat_trong_game.png`. Bản tự vẽ bằng lưới ký tự trước đó bị bỏ (người dùng chê xấu). **Quái + boss (12/11):** ChatGPT vẽ sheet 6×6 (`docs/concept/quai_sheet_chatgpt.png`) → `sprites/quai.*` (4 loài × đi 4 + gồng + trúng đòn, khung 44×29) và `sprites/boss.*` (Lang Vương, Ma Ảnh Yêu Vương, khung 52×53); quay mặt theo hướng đi, tinh anh viền tím, lóe trắng khi trúng; nạp lỗi → hình code cũ; hitbox không đổi. `sprite_clean.py` thêm: gán cụm theo tâm (lưới AI không đều), giữ màu nhấn nhỏ (mắt đỏ), không ăn màu tím thật cạnh nền magenta. Ảnh `docs/m5_02_quai*.png`, `docs/m5_02_boss.png`. **Còn:** chưa chơi trọn lượt cảm nhận tỉ lệ/độ khó đọc khi đông quái.
> - M5-03 [~] (12/11, đợt 1 thêm): **Lôi Vực** (xung sét tím 128×96), **Hỏa Cầu** (đạn 8 hướng + nổ), **Phong Nhận** (lưỡi gió 8 hướng), **Hỏa Long Quyển** (dựng lại từ draft beanfx `loc_gio_v2`, K 0,36, màu lửa, lặp tại chỗ — thay bản pixelfx) — glow vừa, rõ; mỗi draft qua kiểm tra beanfx; sheet trong `fx/`, gắn vào game (đồ họa Thấp/nạp lỗi → hình vẽ code); `tests/fx.test.js` kiểm tra 7 sheet. Ảnh `docs/m5_03_*.png`. Chưa xem trong trình duyệt. Đợt 2 (12/11): **Phi Kiếm Trận + Liệt Diễm** (kiếm 16 hướng, bay và xoay quanh thân; vùng lửa), **Băng Châm** (8 hướng), **Hàn Khí** (vòng gai băng nổ), **Hỏa Luân** (vòng lưỡi lửa, nửa sau tối hơn), **hắc diễm của boss** (nổ + đạn; cảnh báo vẫn vẽ code). → Mọi công pháp + tiến hóa + chiêu boss đã có VFX beanfx; Kiếm Khí/Lôi Kích/Lôi Đình dùng 5 VFX beanfx gốc. Chưa xem trong trình duyệt.
> - M5-03 [~]: VFX beanfx **Lôi Cương Hộ Thể** (draft `vfx/drafts/loi_cuong_ho_the`, K=0,36) đã gắn vào game, 2 lớp quanh thân; công cụ `tools/strip_to_beanfx.py` chuyển dải khung draft sang sheet + JSON beanfx, kiểm tra không chạm mép. Đồ họa Thấp/nạp lỗi → vòng vẽ code. **Còn:** VFX cho 3 build cơ bản, 3 tiến hóa còn lại (Hỏa Long Quyển đang dùng bản pixelfx), boss, công pháp Băng.
> - M5-04 [~]: `node tools/bench.mjs` — logic mỗi khung (Node v26, Windows): 100 quái/200 đạn trung vị 0,98 ms, p95 2,2 ms, p99 3,4 ms; 200 quái/220 đạn trung vị 2,1 ms, p95 3,3 ms → logic không phải điểm nghẽn, **chưa cần spatial hash**, giữ Canvas 2D. Trong game: overlay F3 / `?perf` (FPS, 1% thấp, thời gian xử lý trung vị/p95, số quái/đạn/hạt), cảnh stress `?stress=1` (100 quái + 200 đạn + 300 hạt), mức đồ họa Cao/Vừa/Thấp (trần hạt 400/220/90; Thấp tắt VFX beanfx Lôi Cương; **cảnh báo không bao giờ bị cắt**). Đo trong trình duyệt 12/11 (sau khi sửa treo trang + thêm trần fx): stress trung vị 7–9 ms, p95 20–29 ms, chỉ vẽ 5,2/13,5 ms → **chưa đạt**, không tuyên bố 60 FPS; bước sau: profile phần vẽ (200 đạn beanfx + 100 quái).
> - M5-05 [x]: âm thanh tổng hợp WebAudio (không file, không vướng bản quyền): trúng, nhặt chiến ý, thẻ, tiến hóa, boss xuất hiện, bị đánh, thiền, sét thiên kiếp, thắng/thua; nhạc nền ngũ cung tự sinh rất nhỏ. Mở sau cử chỉ đầu tiên; trần 10 tiếng + khoảng nghỉ mỗi loại; âm lượng hiệu ứng/nhạc + tắt tiếng (M) lưu trong save. Test bằng AudioContext giả. **Chưa nghe thật** trong trình duyệt.
> - M5-06 [~]: joystick ảo nổi (nửa trái khung game), nút E, chặn cuộn trang (`touch-action: none`, `overscroll-behavior`), nút/thẻ to hơn, HUD thu gọn ở màn hẹp; tự bật trên `pointer: coarse` hoặc `?touch=1`; tạm dừng khi đổi tab đã có. **NOT VERIFIED ON REAL DEVICE** — không tuyên bố mobile-ready.

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
| 2026-11-11 | (ngoài backlog) | DONE | Thử pixelfx: cổng bí cảnh + viên chiến ý; nhặt chiến ý bằng phím thật PASS; 300 viên 60 FPS; `npm test` 44/44 | ADR 0004; sửa lỗi `dt` âm làm đứng game |
| 2026-11-11 | (ngoài backlog, trước M5-03) | DONE | Bỏ viên chiến ý pixelfx theo yêu cầu, giữ cổng. VFX Hỏa Long Quyển tự làm bằng quy trình pixelfx: 3 vòng sửa, check.mjs pass, xem trong game (dựng tiến hóa bằng console), 60 FPS | ADR 0004; `docs/vfx_hoa_long_quyen.png` |
| 2026-11-11 | (ngoài backlog, trước M5-03) | DONE | Chốt beanfx chính, pixelfx phụ. Chạy 2 draft tu tiên mẫu của beanfx; dùng lại Lôi aura thu nhỏ K=0,36 quanh nhân vật 25 px (chưa gắn vào game) | ADR 0005; `vfx/drafts/` |
| 2026-11-11 | M1-06 / Gate M1 | PARTIAL | Chơi thật (127.0.0.1, phím thật): **Hỏa Long Quyển tiến hóa ở 2:14, cấp 10** (khởi đầu Hỏa Cầu). Lôi Cương Hộ Thể: lượt khởi đầu Lôi Kích **thua ở 2:19** (Hộ Thể mới cấp 3) — khởi đầu Lôi quá yếu ở Luyện Khí 1; đang thử lại với khởi đầu Kiếm Khí, chưa xong. Liệt Diễm Kiếm Trận chưa chơi tay. Bộ nhớ: dùng `performance.memory` không đo được (trình duyệt trả số làm tròn 3 MB); đếm đối tượng thay thế: sau mỗi lượt về động phủ, run=null, đạn/vùng/chiến ý/hiệu ứng đều về 0 | Còn: Lôi Cương, Liệt Diễm bằng chơi thật; cân nhắc buff khởi đầu Lôi Kích |
| 2026-11-11 | M1-06 / Gate M1 | PARTIAL | Lôi Cương Hộ Thể, lượt chơi thật thứ 2 (khởi đầu Kiếm Khí): thua ở 4:22, cấp 18, **Hộ Thể dừng ở cấp 4/5**. Đủ 4 ô công pháp thì thẻ nâng Hộ Thể phải tranh với 3 công pháp khác và bị động, nên ra rất thưa (4 lần trong 17 lần lên cấp). Liệt Diễm Kiếm Trận vẫn chưa chơi tay | Đề xuất: tăng trọng số thẻ nâng cấp cho công pháp gốc khi đã có công pháp phụ của một công thức tiến hóa (cân bằng M2-04) |
| 2026-11-11 | M1-06 / Gate M1 | DONE | Thêm `EVO_BASE_UPGRADE_MULT = 3` (draft.js, [THỬ NGHIỆM]): thẻ nâng công pháp gốc nặng ×3 khi đã có công pháp phụ của công thức; test mới, 45/45 PASS. Chơi thật lại: **Liệt Diễm Kiếm Trận tiến hóa ở 2:38, cấp 9**; **Lôi Cương Hộ Thể tiến hóa ở 4:30, cấp 16** (khởi đầu Kiếm Khí, đã có Lôi Đình Vạn Kiếm; khiên 45/45 hoạt động), rời bí cảnh ở 4:54 bình thường. Bot sau chỉnh: Lôi Cương 2/4 (Kiếm+Lôi) và 3/4 (Lôi+Thể, trước 1/4 và 2/4); Liệt Diễm 4/4 ở 145–160 s | Gate M1 ĐẠT. Còn: cân bằng (M2-04) |
| 2026-11-11 | M2-01 | DONE | Director thời gian: 5 giai đoạn (nhịp sinh 1,3 → 0,32 s/con, tỉ lệ kiểu quái đổi dần), 7 đợt đội hình (vây tròn / bầy lao / hàng cung bắn xa) có thông báo trên màn và log, tinh anh từ 3:00 rồi mỗi 90 s (tối đa 2), ngân sách cost 18 + 0,3/s (trần 150) + trần cứng 90 con. Kiểu quái: Hỏa Hồ gồng 0,75 s (đường đỏ tới điểm cuối) rồi lao; Huyền Băng Thú giữ khoảng cách, gồng 0,6 s (đường ngắm) rồi bắn băng tiễn — chỉ bắn khi đang trong màn, cây/đá chặn; Ma Ảnh tinh anh x10 máu, gồng 1 s (vòng đỏ + lấp tím đúng bán kính trúng) rồi đập. Hướng/vùng đòn khóa khi bắt đầu gồng. Thêm thống kê `run.dmgBy` theo nguồn sát thương (`DMG=1 node tools/sim.mjs`). Bot tìm ra lỗi: băng tiễn hạ gục người chơi làm mảng đạn bị dọn giữa vòng lặp → đã sửa + test. Chơi thật (127.0.0.1, phím thật) tới 3:07, cấp 15, Lôi Đình Vạn Kiếm 2:16; console sạch. 58/58 test PASS | Bot sau M2-01: Kiếm+Lôi 3/4 thắng; 3 build còn lại 0/4, chết 188–394 s (trước 156–480 s). Bot không biết né cảnh báo nên đánh giá thấp người chơi; cân bằng ở M2-04 |
| 2026-11-11 | M2-02 | PARTIAL | Boss: Lang Vương 4:00 (lao ×3 có đường cảnh báo, nhắm lại mỗi lần; tru gọi 4 Dã Lang) và Ma Ảnh Yêu Vương 7:00 (đạn tỏa 12/16 tia có tia báo hướng; 3/5 vùng hắc diễm R30 quanh người chơi; đập đất R64 khi áp sát). Sơ hở 1,3–1,4 s sau mỗi chiêu (+50% sát thương, sao vàng + chữ "sơ hở"), 1 đòn ≤ 3% máu, boss không bị đẩy lùi, chỉ chịu nửa làm chậm, kẹt 2 s thì dịch chuyển. Khi boss sống: quái thường sinh thưa ×2, không có tinh anh. Thắng = hạ boss cuối (không còn thắng theo đồng hồ); trần 15 phút → TIMEOUT. Thanh máu boss + vạch pha 2. Reward hook `run.rewards` cho M2-03; bảng kết quả ghi "Đã hạ: …". 70/70 test PASS. Bot: Lang Vương bị hạ sau 35–118 s; Kiếm+Lôi hạ Yêu Vương 1/4 lượt (8:32) | Chưa chơi thật trọn run tới boss (trình duyệt phiên này 2–5 khung/giây); chưa bật thử giảm hiệu ứng; cân bằng (bot chết nhiều vì băng tiễn) → M2-04 |
| 2026-11-11 | M2-03 | DONE | Thưởng theo tiến độ: linh thạch = 0,1/quái + 2/cấp + 3/phút; linh khí 6/phút; luyện liệu 1/tinh anh; boss: Lang Vương +25💎 +20✨ +2🔩, Yêu Vương +80💎 +60✨ +5🔩 +1🎫; thắng ×1,5; lần đầu thắng +1🎫; +10%/tầng cảnh giới. Giao dịch REWARD_PENDING → REWARDED idempotent (id run + rewardLog 30), save vẫn v2 (chỉ thêm trường, sanitize kẹp giá trị). Bảng kết quả có mục "Mang về động phủ"; HUD động phủ thêm ✨ 🔩 🎫. 80/80 test PASS. Trình duyệt 127.0.0.1: pending được lưu trước khi hiện bảng; tải lại giữa bảng → tự nhận 1 lần + log; tải lại lần 2 không đổi; bấm đúp + Enter ×2 → +3 đúng 1 lần, save khớp, console sạch. Bot: thua 61–196💎, thắng 453💎 + 2🎫 (bản đầu 150–1000💎, quá nhiều so với đan 25💎 → đã giảm) | Linh khí/luyện liệu/vé chưa có chỗ dùng (M3/M4/M6). Cân bằng kinh tế xem lại ở M2-04 |
| 2026-11-11 | M2-04 | PARTIAL | Bot mới biết né cảnh báo + `--summary`; công cụ `tools/dps.mjs`. Sửa lỗi: Kiếm Khí cấp 3+ / Hỏa Cầu cấp 4+ tỏa quạt góc cố định nên trượt khi chỉ 1 mục tiêu (boss: 1/3 lưỡi, 0/2 cầu) → góc thu hẹp theo khoảng cách + test; Phong Nhận ngắm yêu thú gần nhất. Chỉnh số: Kiếm Khí cấp 5 giảm, Phi Kiếm Trận nạp nhanh, Lôi Kích mạnh hơn, Hỏa Luân rộng hơn, Liệt Diễm/Hỏa Long/Lôi Cương tăng, Lôi Đình giảm nhẹ; run 6–8 phút (boss 3:30/6:00, đợt dồn trước 5:30); Lang Vương lao nhẹ hơn + gồng 0,75 s; Yêu Vương máu ×70, hắc diễm ×1,6. Bảng kết quả thêm "Bước tiếp theo". Bot né (12 seed): 10/12 · 7/12 · 4/12 · 8/12 (trước 4/8 · 1/8 · 1/8 · 0/8). 81/81 test PASS | Chưa playtest người thật (trình duyệt 2–5 khung/giây), GATE v0.2 chưa xác minh; Hỏa+Phong yếu nhất; cảnh giới 9 quá dễ (7–8/8) |
| 2026-11-12 | M2-02 / M2-04 / GATE v0.2 | DONE (M2-02), PARTIAL (M2-04) | `?loop=timer` (vòng lặp setInterval khi môi trường hãm rAF) + `tools/autopilot.js` (phát phím). 4 lượt trong trình duyệt: Kiếm+Lôi thắng 6:39; Phi Kiếm+Hỏa (giảm hiệu ứng) thua 6:35 vì đập đất; Hỏa+Phong thắng 8:39; Lôi+Thể thua 4:29. Sửa: viền cảnh báo trên tán cây, thanh máu boss mờ khi che, đập đất R48/gồng 1,25 s, hắc diễm gồng 1,4 s R26, nhãn sát thương tách `boss:slam`, Lôi Đình giảm nhẹ, Hỏa Long tăng. Bot (16 seed): 15/16 · 14/16 · 8/16 · 11/16 | Lượt 5 chưa chơi (trang bị ẩn); chưa người thật |
| 2026-11-12 | M3-01..04 | PARTIAL | Linh khí → tu vi khi thiền; thiên kiếp tương tác 3 nhịp; mở khóa đại cảnh giới + độ khó bí cảnh; Linh Mạch. 102/102 test PASS. Bot độ khó: cảnh giới 9 Linh thắng 1–5/6, 12 Huyền 0–5/6 | Chưa kiểm tra trong trình duyệt (trang bị ẩn); GATE v0.3a chưa xác minh |
| 2026-11-12 | M2-04 + GATE v0.3a | DONE (có hạn chế) | theo chỉ đạo 12/11 ("không cần test nữa") bỏ kiểm tra trình duyệt: M2-04 đóng với 4 lượt trình duyệt (thay vì 5); M3 đóng bằng test tích hợp chuỗi GATE v0.3a. 105/105 test PASS | Chưa người thật; M3 chưa xem trong trình duyệt |
| 2026-11-12 | M4-01..03 + GATE v0.3b | DONE (logic) | Trang bị/luyện khí, thành tựu mở công pháp Băng, Truyền Thừa Các bằng vé game. 118/118 test PASS (13 test M4 gồm tỉ lệ 20000 lượt, bảo hiểm, trùng→mảnh, đổi mảnh, giao dịch, chuỗi GATE v0.3b) | Chưa xem trong trình duyệt (theo chỉ đạo 12/11 "không cần test nữa"); đã kiểm tra cú pháp + liên kết module. |
| 2026-11-12 | M5-01..06 | PARTIAL (M5-05 DONE) | Dáng quái riêng; VFX beanfx Lôi Cương + công cụ chuyển strip→beanfx; bench logic (100/200: 0,98 ms trung vị); overlay F3, ?stress=1, mức đồ họa; âm thanh tổng hợp + cài đặt; joystick ảo; cây mờ khi che. 123/123 test PASS | GATE v0.4 chưa đạt: chưa đo vẽ, chưa nghe, chưa máy thật, chưa làm lại biome/sprite nhân vật/VFX còn lại |
| 2026-11-12 | M5-03 đợt 1 | DONE (chưa xem trình duyệt) | 4 VFX beanfx: Lôi Vực, Hỏa Cầu (bay+nổ), Phong Nhận, Hỏa Long Quyển (từ loc_gio_v2). Ánh sáng mean 0,06–0,11, cover 16–48%; kiểm tra beanfx sạch. 131/131 test PASS | Còn 5 công pháp + boss |
| 2026-11-12 | M5-03 đợt 2 | DONE (chưa xem trình duyệt) | 8 sheet beanfx: phi_kiem, liet_diem_kiem (16 hướng), liet_diem_vung, bang_cham (8 hướng), han_khi, hoa_luan, hac_diem_no, hac_diem_dan; kiểm tra beanfx sạch; gắn vào game (fx dùng chung theo tên+hàng cho kiếm xoay/vùng lửa/đạn boss; đồ họa Thấp → hình code). 139/139 test PASS | M5-03 còn: xem trong trình duyệt; M5-01/02/04/06 như trước |
| 2026-11-12 | M5-03 xem trình duyệt | DONE | Xem trong game (127.0.0.1, `?loop=timer&perf`, dựng chiêu/boss bằng console): các VFX hiện đúng, ~62 FPS, ~1 ms/khung. Sửa: bỏ số sát thương nhịp thiêu đốt/vùng lửa (`quiet`), gai Hàn Khí thấp lại; kiếm đuổi quái trước đây không dùng sheet beanfx (nhánh vẽ code đứng trước) — đã sửa và xem lại. Nổ hắc diễm xem cận cảnh đạt. 139/139 test PASS | Không |
| 2026-11-12 | M5-04 đo trong trình duyệt | PARTIAL | Cảnh stress đo được lần đầu trong trình duyệt. Tìm và sửa 2 lỗi: (1) `?stress=1` ở đồ họa Vừa/Thấp treo trang vì vòng bơm hạt chờ 300 trong khi trần là 220/90; (2) fx sự kiện (tia trúng, nổ, xung) không có trần, lên 880 fx → 45 ms/khung và tăng dần — thêm `FX_CAP` 160/100/50, đầy thì bỏ fx mới, nổ/xung về hình code; fx đột phá/lôi kiếp không bị cắt. Sau sửa: trung vị 7–9 ms, p95 20–29 ms (chỉ vẽ 5,2/13,5 ms). Mức Thấp: kiếm/Hỏa Cầu về hình code (xem trong game). 140/140 test PASS | p95 vẫn > 16,7 ms; chưa profile chi tiết phần vẽ; pane hãm rAF nên chưa có FPS thật; chưa đo mobile |
| 2026-11-12 | M5-02 sprite nhân vật | DONE (nhân vật) | Concept ChatGPT (project GameWeb) → sheet 16×24, 19 khung: đi/đánh/trúng đòn × 3 hướng + thiền; khung trúng đòn qua `hurtT` (chỉ để vẽ), khung đánh khi vừa phóng kiếm khí. Xem trong trình duyệt: mọi khung + lật trái đúng. 141/141 test PASS | Quái chưa có sheet; chưa chơi thử cảm nhận tỉ lệ nhân vật/quái |
| 2026-11-12 | M5-02 làm lại nhân vật | DONE (nhân vật) | Bản tự vẽ bị chê xấu → ChatGPT vẽ sheet pixel + `tools/sprite_clean.py` làm sạch; 26 khung, xem trong game (bí cảnh có quái). 141/141 test PASS | Quái (12×10) giờ trông quá nhỏ so với nhân vật ~34 px → cần làm sprite quái cùng quy trình; game tự dừng khi pane ẩn nên chưa chơi trọn lượt |
| 2026-11-12 | M5-02 sprite quái + boss | DONE | 4 loài + 2 boss từ sheet ChatGPT, làm sạch bằng `sprite_clean.py` (cỡ pixel 4,1 như nhân vật). Xem trong game (bí cảnh, đủ loài + tinh anh + 2 boss, đang đánh và đứng yên): quay mặt đúng, cảnh báo đòn vẫn rõ. 142/142 test PASS | Chưa chơi trọn lượt; biome rừng chưa làm lại |
| 2026-11-12 | M5-01 biome rừng | DONE | Vật thể ChatGPT + ô nền code mới; ảnh trước/sau cùng vị trí; xem trong động phủ và bí cảnh (quái vẫn nổi rõ trên nền). 143/143 test PASS | Chưa đo FPS sau khi thêm vật thể; chưa thử màn hẹp/zoom |
| 2026-11-12 | Camera + tỉ lệ (chơi tay) | DONE | Người dùng chơi tay: cây nhỏ ngang người, người quá to. Khung nhìn 480×270 → 640×360 (thu camera 1,33×); cây ×2 (~70 px, gấp đôi người); sân bí cảnh 44→56 ô; quái lẻ sinh 330–410 px và luôn ngoài khung camera thật (`inCameraView`, sửa lỗi quái hiện trước mặt khi đứng sát rìa sân); đội hình đợt ×1,33; quái tầm xa ONSCREEN 295/155; tán cây lớn mờ khi có quái phía sau. Autopilot chơi 2 phút: không lỗi JS, không quái lẻ hiện trong màn, 0/6 phát bắn từ ngoài màn, 32 quái: 1,8/3,9 ms. Sim 8 seed: kiem_loi 8/8, phi_kiem_hoa 8/8, hoa_phong 6/8, loi_the 6/8. 144/144 test PASS | Chưa chơi tới boss sau đổi camera; chữ vẽ trên canvas nhỏ hơn (8px ở 640×360) |
| 2026-11-12 | M5 đồng bộ hình còn lại | DONE | ChatGPT vẽ 2 sheet: công trình (cổng trăng đá, tụ linh trận thường/sáng, Linh Mạch thường/phong ấn → `sprites/cong_trinh.*`) và 21 biểu tượng công pháp/tiến hóa/bị động/hồi linh (`sprites/bieu_tuong.*`). Cổng: vòng xoáy pixelfx thu 0,66 vẽ trước, cổng đè lên → xoáy lộ qua lòng cổng; tụ linh trận sáng khi thiền trong trận; Linh Mạch đổi bản xích bùa khi boss còn sống. UI: thẻ chuẩn bị/lên cấp, ô HUD, bảng kết quả dùng biểu tượng pixel (thiếu sheet → emoji). `sprite_clean.py`: thêm `--fringe`, chỉ bóc viền hồng sáng (giữ tím của hệ Lôi). Xem trong trình duyệt: động phủ, màn chuẩn bị, HUD bí cảnh, Linh Mạch. Dọn HANDOFF dòng cũ. 144/144 test PASS | Chưa xem Linh Mạch bản phong ấn và tụ linh trận lúc thiền trong trình duyệt |

---

## F. PROMPT KHỞI ĐỘNG DÁN VÀO CLAUDE CODE

```text
Bạn đang tiếp tục dự án Tu Tiên Lộ có sẵn, KHÔNG được tạo game mới từ đầu.
Hãy đọc HANDOFF.md, GDD_TU_TIEN_LO.md và TASKS_TU_TIEN_LO.md trước.
Nhiệm vụ: thực hiện từ Milestone M0, đúng dependency, chỉ đánh dấu DONE nếu đã kiểm thử. Giữ nguyên các gameplay/asset hiện hữu khi refactor; luôn bảo toàn localStorage tutien_save_v1 và tạo rollback trước sửa lớn. Không tự chuyển engine, không tự làm online hoặc gacha trả tiền.

Bắt đầu bằng audit project và baseline chạy được (M0-01), sau đó thực hiện M0-02. Nếu đủ quyền/công cụ thì tạo test report, checkpoint và commit. Cuối phiên báo cáo task, file sửa, test thực tế, bug còn lại, bước tiếp theo. KHÔNG khẳng định test trên browser/mobile nếu chưa thực sự chạy.
```
