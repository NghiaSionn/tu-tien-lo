# TU TIÊN LỘ — M10: YÊU THÚ DỊ BIẾN & BOSS CHIẾN THUẬT

**Ngày lập:** 16/11/2026  
**Trạng thái:** KẾ HOẠCH, chưa triển khai · Cập nhật yêu cầu: **cả hai boss chỉ có 2 pha**, không thêm pha thứ ba.  
**Phạm vi:** Đấu trường sinh tồn (`FEATURES.rooms = false`), 2D pixel top-down 640×360, JS ES module / Canvas 2D; nâng AI, bộ kỹ năng và nhịp giao tranh.  
**Không thuộc phạm vi:** biome/phòng mới, multiplayer, thay renderer, làm linh thú, cân bằng lại meta/gacha, mua bán, thay schema save không cần thiết.

## A. Đối chiếu code hiện có — KHÔNG làm lại

Nguồn kiểm tra: `src/entities/archetypes.js`, `src/entities/monsters.js`, `src/entities/bosses.js`, `src/systems/director.js`, `src/core/config.js` trên nhánh `main` GitHub; Claude Code phải audit lại HEAD trước khi sửa.

- `chaser` (Dã Lang) đuổi và cắn; `charger` (Hỏa Hồ) gồng 0,75 s rồi lao; `ranged` (Huyền Băng Thú) giữ khoảng cách và bắn băng tiễn; `elite` (Ma Ảnh tinh anh) đập đất AOE sau 1 s.
- Mini-boss `MINI` (Lang Vương): dash, howl, howlDash. Boss cuối `FINAL` (Ma Ảnh Yêu Vương): burst, zones, slam, prison, pha 2 và enrage. `bossAI` chọn phần lớn qua ORDER; nếu boss cuối sát người chơi thì ưu tiên slam. Có windup, recover và `vuln` đã tồn tại.
- Có tách bầy, điều hướng quanh hồ/flow field, director theo phase/wave/cost, seed RNG, trần quái/đạn/vùng; chưa cần thay các nền tảng này.
- Mức thắng bot 46–50% và 219 test là số do chủ dự án báo cáo, không phải đánh giá playtest người thật; benchmark desktop ~3,5 ms/khung với 46 quái theo báo cáo, cần đo lại cùng điều kiện.

## B. Mục tiêu thiết kế và quy tắc không thương lượng

1. **Thông minh ≠ gian lận.** AI được xét vị trí, khoảng cách, chuyển động gần đây của người chơi, vị trí đồng minh, cooldown, địa hình; không khóa mục tiêu vô hạn sau khi gồng. Đòn nguy hiểm phải được báo trước và có hướng/vùng cố định khi đã khóa.
2. **Độ khó đến từ quyết định, không phải spam sát thương.** Mỗi loài có vai trò riêng. Khuyến khích mục tiêu ưu tiên, điều hướng, lựa chọn vị trí và nhận biết pha boss.
3. **Đọc được ở 640×360, kể cả đồ họa Thấp.** Màu/cấu trúc của cảnh báo phải phân biệt với VFX người chơi. Không chồng quá nhiều báo nguy hiểm cùng lúc.
4. **Nhiều kỹ năng nhưng không dùng đồng thời tất cả.** Đặt ngân sách nguy hiểm chung theo màn hình. Boss chỉ tung chuỗi phối hợp khi có ô/vùng né khả dụng.
5. **Data/config-driven + deterministic.** Toàn bộ tham số trong `src/core/config.js` hoặc module config tham chiếu. Dùng `run.rng`, không `Math.random` hoặc `Date.now` cho quyết định gameplay.
6. **Giữ đường lui.** Cờ ví dụ `FEATURES.enemyTactics`, `FEATURES.enemySkillsV2`, `FEATURES.bossPatternsV2` mặc định OFF đến khi đạt GATE; OFF phải giữ hành vi M9. `rooms=false` luôn là mặc định.
7. **Tách bí cảnh / hub.** Không làm sói trong tông môn biết kỹ năng bí cảnh trừ khi có quyết định riêng. Giữ save v1/v2, Firebase Auth/Firestore, cơ chế thưởng một lần và dữ liệu meta.
8. **Không làm AI chi phí cao cho từng con mỗi frame.** Suy nghĩ quyết định theo nhịp (staggered), dùng shared flow field, kiểm tra LOS có giới hạn, cấm pathfinding từng quái.

## C. Bestiary M10 — kế hoạch kỹ năng

Mỗi loài: 1 vai trò chiến thuật + kỹ năng hiện có + 1 kỹ năng mới cốt lõi. Các kỹ năng bổ sung thứ hai là tùy chọn sau GATE.

| Quái | Vai trò | Giữ | Mới ưu tiên | Nâng cao có điều kiện | Counterplay |
| --- | --- | --- | --- | --- | --- |
| **Dã Lang** | Bao vây/ép đường | Cắn khi sát | **Tập Kích Bên Sườn**: 2–3 con trong đàn phân vai, một con vòng sang bên và một con áp sát; chỉ một con được nhảy chồm sau khi gồng | **Tru Bầy**: tăng tốc ngắn cho đàn trong vùng, có âm/bong bóng cảnh báo | Phá đội hình hoặc né đường nhảy đã khóa; tránh đứng giữa hai hướng |
| **Hỏa Hồ** | Truy kích/chặn đường | Lao thẳng có gồng | **Hỏa Vĩ**: sau cú lao, để lại 1 vệt lửa ngắn tồn tại hữu hạn; không đặt ngay dưới chân người chơi | **Giả Động Tác**: đổi vị trí trước gồng, không đổi hướng sau khi khóa | Né ngang đường lao rồi tránh vệt lửa |
| **Huyền Băng Thú** | Khống chế không gian từ xa | Ngắm bắn một băng tiễn | **Tam Băng Tiễn**: quạt ba viên có khe trống, chỉ khi đủ xa, cảnh báo 3 hướng | **Băng Ấn**: đánh dấu vùng đất gây chậm có thời hạn, trần số vùng | Tiến gần để phá thế giữ khoảng cách, đi qua khe đạn hoặc rời vòng chậm |
| **Ma Ảnh tinh anh** | Áp lực khu vực/đột kích | Đập đất có báo vòng | **Ảnh Bộ**: dịch vị trí ngắn qua bóng có dấu hiện vị trí đích trước khi xuất hiện | **Hắc Trảo**: quét cung trước mặt sau gồng, chỉ từ độ khó cao | Nhìn bóng báo đích và đứng ngoài cung/vòng; tận dụng recover |

**Quan trọng:** Không cho toàn bộ Dã Lang dùng nhảy chồm, không cho mọi Hỏa Hồ để vệt lửa và không cho tất cả Huyền Băng Thú bắn ba tia cùng lúc. Director phải định lượng theo `specialistBudget` và giới hạn số tấn công đang gồng trên vùng nhìn thấy.

### Elite modifier (có thể dành mốc sau)

- **Cuồng Bạo**: di chuyển nhanh hơn sau khi thấp máu, có dấu hiệu đỏ; không tăng vô hạn sát thương.
- **Hộ Giáp**: tạo khiên định kỳ, có thời gian phá và cooldown; không bất tử.
- **Triệu Đàn**: gọi số lượng đệ tử có giới hạn; áp dụng cost budget.

Giai đoạn đầu chỉ triển khai **một modifier cho Ma Ảnh tinh anh**, sau đó playtest trước khi nhân lên các loài khác. Một elite có tối đa 1 modifier để không phá khả năng đọc trên màn hình.

## D. Thiết kế Boss

### D1. Lang Vương (mini-boss, xuất hiện ~3:30)

**Vai trò:** Bậc thầy bầy đàn, trừng phạt chạy thẳng, dạy người chơi đọc hướng lao.

**Bộ 5 hành vi/chiêu mục tiêu:**
1. `Tam Liên Lao` (giữ): dash liên tiếp, có đường cảnh báo từng lần.
2. `Lang Hú` (giữ): triệu hồi đàn trong ngân sách.
3. `Hú Rồi Lao` (giữ, độ khó Linh+): phối chiêu với gồng lại.
4. `Liệt Trảo Hình Quạt` (**mới**): quét cung trước mặt sau gồng, trống phía sau boss; không xoay cung sau khi khóa.
5. `Vồ Đầu Đàn` (**mới**): nhảy vào **vị trí dự đoán có giới hạn** theo tốc độ hiện tại của người chơi, hiện dấu đáp trước; có điểm an toàn và recover.

**Pha:**
- P1, HP >55%: giới thiệu dash, hú và quét trảo; không nối 2 kỹ năng nặng.
- P2, HP ≤55%: thêm vồ và một số chuỗi kết hợp; chỉ một chuỗi nặng mỗi vòng, giữ cửa sổ sơ hở.

**Nguyên tắc:** Không để minion chặn kín mọi đường thoát khi boss dùng Vồ Đầu Đàn. Trong 640×360 luôn có đường thoát nếu người chơi phản ứng đúng lúc.

### D2. Ma Ảnh Yêu Vương (boss cuối, xuất hiện ~6:00)

**Vai trò:** Kiểm soát địa hình, buộc đổi vị trí, phân biệt vùng nguy hiểm và khoảng trống.

**Bộ 7 chiêu mục tiêu:**
1. `Hắc Ám Đạn Trận` (`burst` hiện có): đạn tỏa tròn có khe.
2. `Hắc Diễm Truy Sát` (`zones` hiện có): vùng nổ quanh vị trí đã khóa.
3. `Chấn Địa` (`slam` hiện có): đập gần, cần cooldown chống spam khi người chơi đứng sát.
4. `Ma Ảnh Lao Tù` (`prison` hiện có): vòng nổ với khoảng an toàn rõ ràng.
5. `Ảnh Độn` (**mới**): dịch chuyển có bóng đánh dấu tại điểm xuất hiện; không telefrag hoặc gây sát thương ngay khi hiện.
6. `Ma Quang Hoành Tảo` (**mới**): quét tia theo cung/sweep đủ chậm và có vùng bắt đầu an toàn; hiển thị hướng quét trước khi khởi phát.
7. `Thập Tự Hắc Liệt` (**mới**): hai dải nổ vuông góc khóa trước, để lại khoảng trống rõ; không sử dụng cùng lúc Lao Tù nếu làm mất hết vùng né.

**Pha (CHỐT 2 PHA, không thêm pha thứ ba):**
- **P1 — từ 100% HP tới ngưỡng chuyển pha đang được định nghĩa trong config:** dùng Hắc Ám Đạn Trận (`burst`), Hắc Diễm Truy Sát (`zones`), Chấn Địa (`slam`), và có thể đưa Lao Tù (`prison`) vào sau một khoảng làm quen nếu config hiện tại cho phép. Mục tiêu: dạy quy luật cảnh báo, vùng an toàn và khoảng nghỉ.
- **P2 — từ ngưỡng chuyển pha đến 0% HP:** mở/đẩy tần suất hợp lý của Lao Tù, Ảnh Độn, Ma Quang Hoành Tảo, Thập Tự Hắc Liệt; chọn chuỗi kỹ năng theo vị trí người chơi và threat budget. Tăng độ phức tạp *cách phối hợp* chứ không tự ý cộng sát thương thô. Giữ cơ chế `enrage` cũ như **một trạng thái/cường hóa nằm trong P2**, **không** biến thành phase 3.
- **Ngưỡng HP:** giữ ngưỡng chuyển pha hiện có ở HEAD/config, chỉ thay đổi sau khi chủ dự án duyệt và có báo cáo playtest. Không hardcode ngưỡng HP mới trong M10.
- **Tính liên tục:** boss vẫn có đủ 7 chiêu trong hệ thống, nhưng mỗi lượt không bắt buộc phải trình diễn mọi chiêu; có telemetry cho chiêu đã dùng và đảm bảo chiêu được mở đúng pha.

**Bảo vệ:** Không chọn `slam` lặp vô hạn chỉ do người chơi đứng gần; weighted selector có chống lặp 2 lần liên tiếp, kiểm tra cooldown và điều kiện an toàn. Không lạm dụng teleport giải kẹt hiện tại như một chiêu không có báo trước.

## E. Bộ chọn hành vi thông minh (AI Tactical Selector)

- **States:** `move → evaluate → windup → execute → recover → move`; có `stagger/interrupt` nếu thực sự hỗ trợ, nhưng không cần viết lại state machine đang có.
- **Tín hiệu:** khoảng cách, LOS, thời gian đứng yên của người chơi, vận tốc gần đây, đồng đội lân cận, cooldown, pha boss, khoảng cách mép hồ, số hazard/shot còn hoạt động, attack budget.
- **Quy tắc chọn:** ưu tiên skill hợp tình huống bằng điểm có trọng số, chống lặp, giữ seed. Sau `windup`, khóa vị trí/hướng mục tiêu. Nếu skill không có đường né hợp lệ thì chọn chiêu nhẹ hoặc di chuyển.
- **Chi phí CPU:** đánh giá chiến thuật theo nhịp 0,15–0,3 s (so le giữa quái), không mỗi frame; director theo ngân sách dùng chung; tận dụng hệ thống điều hướng hiện có.
- **Threat budget ban đầu [THỬ NGHIỆM]:** trong camera đồng thời tối đa 2 đòn đặc biệt của quái thường đang gồng (3 từ độ khó Huyền/Thiên), 1 chiêu boss nặng và tối đa 1 đòn khống chế khu vực lớn. Thử cảm giác thực chiến trước khi chốt số.
- **Telegaph ban đầu [THỬ NGHIỆM]:** quái thường 0,6–0,9 s, tinh anh 0,8–1,2 s, boss 0,9–1,6 s tùy chiều rộng vùng né, tốc độ di chuyển, input. Không giảm chỉ để tăng tỷ lệ chết.
- **Độ khó:** Phàm giới thiệu từng kỹ năng; Linh thêm biến thể; Huyền/Thiên thêm combo và áp lực, không tự động nhân sát thương mọi kỹ năng.

## F. TASKS M10

### M10-A — Nền tảng AI & fairness

**M10-01 — Audit/đo baseline** | P0 | S | phụ thuộc: không  
Việc làm: chạy test, sim, bench; kiểm tra config hành vi hiện có, điểm trùng code, FPS desktop/máy thật nếu có, số đòn trúng và nguồn gây chết. Chốt commit checkpoint.  
Nghiệm thu: báo cáo SHA, test PASS/FAIL, thời gian khung p50/p95, phân bố win/build/seed, cảnh quay các kỹ năng cũ, không thay gameplay ở task này.

**M10-02 — Tactical selector + feature flags** | P0 | L | phụ thuộc: M10-01  
Việc làm: selector theo tình huống, state/tags tối thiểu, skill registry, weighted selection, shared threat budget, cooldown; giữ `bossAI`/`archetypeAI` đường cũ khi OFF.  
Nghiệm thu: cùng seed+input ra cùng chuỗi chiêu; skill không hợp lệ không được chọn; boss không lặp `slam` vô hạn; OFF hành vi tương đương baseline; kiểm thử không vượt shot/hazard cap.

**M10-03 — Telegraph & anti-unfair overlap** | P0 | M | phụ thuộc: M10-02  
Việc làm: chuẩn hóa vùng/hướng đã khóa, cảnh báo rõ ở Low/Medium/High, chống chồng nguy hiểm không còn lối thoát; debug overlay (AI state, intent, lock point, active threat count), có thể bật trong dev.  
Nghiệm thu: không sát thương trước lúc cảnh báo kết thúc; tránh được bằng di chuyển bình thường trong tình huống kiểm thử; hướng đã khóa không quay theo người chơi; không sinh đạn tấn công từ ngoài màn trái quy định; damage attribution có tên chiêu.

**GATE M10-A:** Selector deterministic + flag rollback chạy đúng, cảnh báo và budget làm việc; baseline test còn PASS; không được tiến nếu làm hỏng flow field/separation hoặc nhập nhằng run/hub.

### M10-B — Bốn loài quái có vai trò riêng

**M10-04 — Dã Lang săn theo đàn** | P0 | M | phụ thuộc: GATE A  
Việc làm: vai trò pack/ambusher, Tập Kích Bên Sườn, nhảy chồm có báo; không tính đường đi từng con.  
Nghiệm thu: video + test về 2 hướng tiếp cận, né thành công, không >1 chồm của cùng nhóm đang gồng, không làm đàn kẹt hồ.

**M10-05 — Hỏa Hồ truy kích có vùng cản** | P0 | M | phụ thuộc: GATE A  
Việc làm: Hỏa Vĩ sau dash, cap vệt lửa và thời gian tồn tại, biến thể chỉ từ mức Linh khi phù hợp.  
Nghiệm thu: vệt có cảnh báo/biên rõ, không sinh ngay dưới chân khi không có khả năng phản ứng, hết giờ xóa sạch, không trùng damage nhiều lần ngoài nhịp cấu hình.

**M10-06 — Huyền Băng Thú bắn và khống chế** | P0 | M | phụ thuộc: GATE A  
Việc làm: Tam Băng Tiễn và/hoặc Băng Ấn, ưu tiên một chiêu để nghiệm thu trước; giữ LOS và hạn chế bắn ngoài màn.  
Nghiệm thu: khe đạn né được; cây/đá chặn đúng loại đạn cần chặn; slow có cap, hiệu ứng xóa đúng, không spam 3 tia x số lượng đông vượt `RUN.MAX_ENEMY_SHOTS`.

**M10-07 — Ma Ảnh tinh anh đột kích** | P1 | M | phụ thuộc: GATE A  
Việc làm: Ảnh Bộ với dấu báo vị trí, Hắc Trảo nếu đủ thời gian; cooldown hạn chế dịch chuyển, không xuất hiện sát trùng người chơi.  
Nghiệm thu: đủ 3 kỹ năng khi tính cả đập đất; có recover; không teleport vào vùng không đứng được; elite không gây đòn ngay khi xuất hiện.

**M10-08 — Director phối bầy có vai trò** | P0 | M | phụ thuộc: M10-04…07  
Việc làm: 3 mẫu đội hình `pack+flank`, `charger+ranged`, `elite+fodder`; specialist cap và ngân sách theo cảnh; giới thiệu kỹ năng dần.  
Nghiệm thu: mỗi mẫu spawn đúng nhịp, số lượng/tổng cost không vượt cap, không có trường hợp các kỹ năng đồng thời chiếm toàn bộ vùng né trong test, baseline trận boss vẫn kiểm soát được.

**GATE M10-B:** Từng loài phân biệt được bằng hành vi, không chỉ màu; có ít nhất một cách phản ứng rõ ràng cho mỗi chiêu; 3 đội hình hoạt động; không tăng thời gian xử lý gameplay >20% p95 ở cùng stress scenario mà không có phê duyệt.

### M10-C — Boss nhiều chiêu và thật sự biết phối hợp

**M10-09 — Lang Vương 2 pha/5 chiêu** | P0 | L | phụ thuộc: GATE B, M10-02/03  
Việc làm: quét trảo, vồ dự đoán khóa trước, pha 55%, selector theo tầm và trạng thái đàn, giới hạn summon.  
Nghiệm thu: đủ tối thiểu 5 kiểu hành vi nêu ở D1; mỗi pha có khác biệt; mỗi chiêu có windup, vùng né và recover; ít nhất 1 trận thắng/thua được quay video; boss không kẹt/khóa người chơi vào chỗ chết vô lối.

**M10-10 — Ma Ảnh Yêu Vương 2 pha/7 chiêu** | P0 | L | phụ thuộc: M10-09, GATE B  
Việc làm: Ảnh Độn, Ma Quang Hoành Tảo, Thập Tự Hắc Liệt; giữ đúng **2 pha** theo config hiện tại; thêm selector và cooldown chống lặp slam; đảm bảo prison + burst không chồng sai. `enrage` chỉ là trạng thái trong pha 2, không tạo pha 3.  
Nghiệm thu: đủ 7 chiêu có nhận dạng hình ảnh; đúng **1 lần chuyển P1 → P2** tại ngưỡng HP được cấu hình, tuyệt đối không có P3; mọi chiêu chỉ mở ở pha hợp lệ; combo không gây vùng né bằng 0; end boss cleanup đúng, nhận thưởng đúng một lần; không chết vì đòn đã hủy sau boss chết.

**M10-11 — VFX/SFX/UI boss** | P1 | M | phụ thuộc: M10-09/10  
Việc làm: dùng lại asset/VFX hiện có tối đa; dấu pha, tên chiêu lớn trong các màn thử; âm thanh cảnh báo không chồng quá mức; sprite mới chỉ vẽ khi thật cần.  
Nghiệm thu: người chơi có thể phân biệt ít nhất 5/7 chiêu boss cuối khi xem đoạn ghi hình sau được giải thích luật cơ bản; mức đồ họa Thấp vẫn có dấu báo; không tạo flash toàn màn liên tục.

**GATE M10-C:** Tối thiểu một lượt chơi tay đầy đủ có quay phim; **mỗi boss đúng 2 pha (P1/P2)**, bộ kỹ năng cần thiết hoạt động theo điều kiện từng pha, mọi đòn có đáp án né; không phá save/reward/bản đồ; test/regression đạt; thiếu người thật ghi `NOT VERIFIED` cho mức độ hấp dẫn.

### M10-D — Cân bằng, đo đạc, phát hành

**M10-12 — Telemetry combat & benchmark** | P0 | M | phụ thuộc: GATE C  
Việc làm: trong log opt-in ghi deathCause, hitBySkill, activeThreatPeak, bossPhase, runTime, build, seed và feature flags; test desktop và điện thoại nếu có; so A/B cờ cũ/mới trên cùng seed/build.  
Nghiệm thu: biểu đồ/tables nguồn chết, số lần trúng theo kỹ năng, boss fight duration, p50/p95 frame time, số quái và đạn; dữ liệu không gửi mạng nếu chưa được người chơi đồng ý; không log định danh không cần thiết.

**M10-13 — QA và playtest thật** | P0 | M | phụ thuộc: M10-12  
Việc làm: người phát triển chơi ≥3 build, ít nhất 5 tester (nên có mobile), ghi xem họ hiểu lý do chết không; sửa chiêu gây chết oan/đòn không đọc được, không tối ưu riêng cho bot.  
Nghiệm thu: ≥5 phiên hợp lệ hoặc ghi `BLOCKED`; ≥80% tester có thể nêu chiêu/nguồn sát thương gây ra lần chết quan sát được; không chiêu nào vừa chưa cảnh báo vừa gây sát thương trong test; các crash/blocker = 0; giữ backlog tuning đề xuất.

**M10-14 — Release candidate và rollback** | P1 | S | phụ thuộc: GATE D  
Việc làm: chỉ bật cờ theo duyệt của chủ dự án, cập nhật GDD/HANDOFF/TASKS/TEST_REPORT, changelog và rollback.  
Nghiệm thu: toàn bộ automated tests tại HEAD PASS, ghi build SHA, save v1/v2 và cloud không regression, có video playtest và công tắc trở lại AI M9.

**GATE M10-D:** Sự công bằng được xác nhận qua quan sát, không chỉ tỷ lệ thắng bot; p95 hiệu năng không vượt giới hạn thiết kế trên thiết bị mục tiêu; kết quả pass/fail minh bạch và người phát triển phê duyệt trước khi bật mặc định.

## G. Thước đo cân bằng [đều là giả thuyết phải playtest]

| Đo lường | Cách sử dụng / mục tiêu thử nghiệm |
| --- | --- |
| Win rate bot | Chỉ dùng phát hiện regression trên seed/build cố định; **không** ép về đúng 50%. Bot né tốt hơn người mới. |
| Nguyên nhân chết | Mỗi chết phải truy về loại quái + tên chiêu; sự cố không biết chiêu nào = bug quan sát. |
| Time-to-first-hit | Xem đòn mới có gây trúng quá sớm trước khi người chơi học kỹ năng hay không. |
| Skill usage | Boss có dùng đủ chiêu không hay luôn spam slam; không được chọn một hành vi >60% nếu không phải cố ý thiết kế pha. |
| Dodgeable window | Dùng công thức khoảng cách tới vùng an toàn / tốc độ di chuyển thực tế + dư thời gian input; mục tiêu cảnh báo 0,6–1,6 s là điểm đầu để tune, không phải quy chuẩn cứng. |
| Sim / stress | Cùng seed, cùng các build ít nhất 32 seed/build; 46 quái đo so baseline và stress 100 quái/200 đạn/300 hạt; ghi p50/p95 riêng logic/render và GC. |
| Mobile | Đo ít nhất một điện thoại thật trước khi tuyên bố tối ưu mobile; nếu không có đánh `NOT VERIFIED`. |

## H. Phụ thuộc & trình tự thực hiện

`M10-01 → M10-02 → M10-03 → GATE A → [M10-04,05,06,07] → M10-08 → GATE B → M10-09 → M10-10 → M10-11 → GATE C → M10-12 → M10-13 → GATE D → M10-14`

**Dừng sau từng GATE để người phát triển xem gameplay.** Không tự bật các biến thể khó trên bản online. Nếu đã có kỹ năng trong HEAD, đánh dấu “đã có”, bổ sung test/điều phối cần thiết chứ không viết lại.

## I. Prompt gửi Claude Code

> Đọc `CLAUDE.md`, `GDD_TU_TIEN_LO.md`, `HANDOFF.md`, `TASKS_TU_TIEN_LO.md`, `TEST_REPORT.md`, cùng file M10 này. Kiểm tra source HEAD thực tế vì tài liệu bàn giao có thể lạc hậu. Bắt đầu `M10-01` audit/baseline; không tự thực hiện thêm task hoặc bật mặc định AI mới trước khi tôi duyệt. Không đụng cloud save/Firebase, không đổi renderer, không bật `rooms`, không giảm độ khó thiên kiếp. Giữ AI M9 làm rollback. Mỗi task báo files thay đổi, clip/screenshot trong browser, test, benchmark, kết quả seed và rủi ro còn tồn tại. Không ghi PASS cho playtest người thật khi chưa có người thật.