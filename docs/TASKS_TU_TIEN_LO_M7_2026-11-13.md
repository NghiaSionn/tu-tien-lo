EXECUTION BACKLOG M7 — TU TIÊN LỘ

Ngày lập: 13/11/2026 | Kỳ: 13/11/2026–13/01/2027 | Nguồn hiện trạng: Báo cáo Claude Code 13/11/2026, repository NghiaSionn/tu-tien-lo, HANDOFF.md, TASKS_TU_TIEN_LO.md, TEST_REPORT.md.
Mục tiêu sản phẩm: Chứng minh vòng lặp “vào bí cảnh → chọn build → kết thúc → phát triển meta → tự nguyện chơi lại” hấp dẫn người chơi thật, trước khi mở rộng nội dung.
Quyền hạn: Claude Code được sửa trong phạm vi task được duyệt; không tự mở M6-01..05. Chưa có bằng chứng playtest thật đạt chuẩn. Các thông số chỉ là mục tiêu thử nghiệm, không được báo cáo như dữ liệu thực tế.

A. LỆNH CHO CLAUDE CODE — PHẢI ĐỌC TRƯỚC KHI SỬA
Đọc CLAUDE.md, GDD_TU_TIEN_LO.md, TASKS_TU_TIEN_LO.md, HANDOFF.md, TEST_REPORT.md, source hiện hành và các ADR. Đối chiếu báo cáo 13/11 với commit HEAD và chạy npm test; không coi 146/146 test là kết quả đang có nếu HEAD khác.
Tạo branch hoặc commit baseline; ghi commit SHA, OS/browser, test count, FPS đo được và vấn đề tồn tại. Không xóa/đổi schema save vì tiện làm UI.
Bảo vệ tutien_save_v1, giữ migration/backup save v2, tách meta và run. Kiểm thử reload giữa trao thưởng, gacha, độ kiếp, luyện khí.
Không rewrite 3D, không đổi Canvas 2D/renderer, không thêm framework/back-end/account/online/PvP/leaderboard/paid gacha/ads. Thay đổi kiến trúc lớn phải trình người phát triển duyệt và kèm số liệu benchmark.
Giữ 2D pixel top-down pseudo-2.5D, hiệu ứng beanfx, âm thanh hiện tại. Giữ khả năng giảm hiệu ứng; không che telegraph boss.
Thông số thay đổi phải ở config/data và có thể rollback bằng feature flag; test determinism seed và hồi quy.
Đề xuất mốc sau chỉ khi GATE trước đạt. Nếu không có thiết bị thực hoặc chưa có người test, báo BLOCKED / NOT VERIFIED, không tick hoàn thành vì bot đã PASS.
Với task có nhãn [GIẢ THUYẾT], phải có quan sát/metric ủng hộ hoặc bác bỏ; kết quả âm tính vẫn được coi là hoàn thành thí nghiệm, không lén biến giả thuyết thành tính năng vĩnh viễn.
Tạo docs/playtest/ chứa hướng dẫn thử, phiếu ghi chú, báo cáo tổng hợp đã loại thông tin cá nhân. Chỉ thu feedback và thống kê khi người thử đồng ý; không tự động gửi dữ liệu từ GitHub Pages.
Mỗi phiên cập nhật CHANGELOG_DEV.md hoặc nhật ký task: file thay đổi, commit, kiểm thử tự động/thực tế, ảnh/chứng cứ, blockers, quyết định tiếp theo.
Quy ước
[ ] chưa làm | [~] đang làm | [x] hoàn thành đã xác minh | [!] blocked.
P0 bắt buộc để nghiệm thu; P1 tối ưu vòng chơi; P2 nội dung nhỏ có điều kiện; P3 tương lai, cần duyệt.
S/M/L chỉ là quy mô tương đối, không phải cam kết thời gian.
Mốc M7-A/B/C/D nằm trong chương trình M7; các mã thực thi chỉ là M7-xx để không trùng M6-01..05 đã tồn tại và bị khóa trong TASKS cũ.
GATE có tiêu chí khả năng vận hành và tiêu chí đo học hỏi. Kết quả không như kỳ vọng có thể khiến hướng thiết kế bị thay đổi, không phải lý do báo sai số liệu.
M7-A — ĐÓNG GATE v0.4, ĐO BASELINE THỰC TẾ (Tuần 1–2, P0)
M7-01 [ ] Audit baseline + đối chiếu UI với logic hiện có (S, P0)

Mục tiêu: Xác lập bản thật đang phát hành, tránh nhiệm vụ bị trùng với M3–M5 và chốt danh sách lỗi UX.
Phụ thuộc: Không; đọc HEAD/ADR và tất cả tài liệu hiện hành.
Làm: Chạy npm test, node tools/sim.mjs, mở game/console, kiểm tra 6 luồng: hub→run→thẻ→boss→thưởng→hub; tọa thiền→đột phá→thiên kiếp; Linh Mạch; luyện khí; Truyền Thừa Các; thành tựu. Chụp trạng thái trước/sau ở desktop và viewport hẹp. Kiểm tra ghi nhận mới nhất 146 test so với HEAD.
Nghiệm thu: Có docs/playtest/BASELINE_M7.md ghi commit SHA, lệnh, số test thực, cấu hình, ít nhất 6 bảng kết quả PASS/FAIL/NOT VERIFIED; danh sách lỗi theo mức blocker/major/minor; không phát sinh thay đổi balance chưa đo.

M7-02 [ ] Kiểm thử UI tương tác M3/M4 và xử lý lỗi blocking (M, P0)

Mục tiêu: Người mới tương tác được với những hệ thống đã có.
Phụ thuộc: M7-01.
Làm: Kiểm tra HUD, modal thiên kiếp, Linh Mạch, luyện khí, quay gacha, đổi mảnh, danh sách thành tựu, pause/settings, kết quả run; ưu tiên text không bị cắt ở 360×800, 390×844, 1366×768 CSS px. Giữ nguyên xác suất gacha, công thức và save.
Nghiệm thu: Mỗi modal mở/đóng 3 lần liên tiếp không khóa input, không nhận thưởng trùng; tất cả hành động chính click/tap được, nút quan trọng tối thiểu ~44×44 CSS px nơi có thể; không cuộn ngang do layout; không có lỗi console loại nghiêm trọng; screenshot + checklist ở ba viewport.

M7-03 [ ] Kiểm thử máy thật, âm thanh, tải và save (M, P0)

Mục tiêu: Đóng các khoảng trống của GATE v0.4 bằng phép thử thực tế.
Phụ thuộc: M7-01, M7-02.
Làm: Chơi trọn run trên desktop và tối thiểu 2 điện thoại thật (ưu tiên một Android tầm trung); thử joystick, thẻ, menu, boss, âm thanh WebAudio sau tương tác đầu, mute/volume, chuyển tab, mất focus, reload, save/export/import. Đo FPS/p95 frametime trong gameplay điển hình và riêng stress 100/200/300 ở High/Low.
Nghiệm thu: Có model máy, browser, màn hình, thời lượng ít nhất 10 phút/thiết bị, FPS/frametime p50/p95, crash/long-task; mục tiêu gameplay thường: desktop p95 frametime ≤16,7ms; điện thoại tầm trung ở Low p95 ≤33,3ms. Nếu không đạt phải có bottleneck và lựa chọn giảm chất lượng, không được đổi renderer tự động. Không mất save/khóa UI; giảm flash/rung và mute hoạt động. Nếu thiếu máy thật ghi [!], không tự đóng gate.

M7-04 [ ] Ghi sự kiện playtest tại máy + công cụ xuất phản hồi (M, P0)

Mục tiêu: Thu dữ liệu thật với chi phí thấp, không cần backend.
Phụ thuộc: M7-01.
Làm: Thêm bộ log local, mặc định tắt, opt-in rõ ràng, có giới hạn dung lượng và nút xuất JSON/CSV; không gửi network ngầm. Các event: session_start, run_start, first_card, card_picked, evolution, miniboss_result, run_end, meta_action, second_run_start, session_end. Mỗi event dùng schemaVersion, buildVersion, client-generated test id, relative timestamp, platform class, runId, seed và payload whitelist; không lưu tên, email, IP, clipboard hay thông tin riêng tư. Nút Feedback mở form/issue ngoài trang hoặc sao chép bản tổng kết người chơi chủ động gửi.
Nghiệm thu: Test bật/tắt, xóa log, xuất file, reload, dung lượng đầy; tắt opt-in = không sinh event; không thay đổi save v2; sự kiện run_end một lần; lệnh phân tích từ file xuất in funnel cơ bản; JSON không chứa thông tin cá nhân; tài liệu hướng dẫn rõ hạn chế đo D1/D7 khi người dùng không xuất log.

M7-05 [ ] Baseline playtest người thật (M, P0)

Mục tiêu: Tìm những nguyên nhân khiến người chơi ngừng chơi trước khi thêm nội dung.
Phụ thuộc: M7-02..04 và thiết bị thực sẵn có.
Làm: Mời mục tiêu 10–12 người (tối thiểu 8 người có dữ liệu dùng được), trong đó ít nhất 5 chưa biết game và ít nhất 3 lượt test cảm ứng thật. Không hướng dẫn thao tác trừ lúc bị kẹt; ghi thời gian tới hành động đầu tiên, lần chọn thẻ đầu, boss, lý do chết/dừng, liệu có tự nguyện bắt đầu run thứ hai hay không. Phỏng vấn 3 câu: “điểm vui nhất?”, “điểm khó hiểu nhất?”, “muốn mở khóa gì tiếp?”.
Nghiệm thu: BASELINE_PLAYTEST.md với ≥8 phiên hợp lệ, ≥5 người mới, ≥3 phiên touch, ít nhất 5 video/ghi chú quan sát (nếu có đồng ý), top 5 friction, bảng funnel mẫu số rõ ràng; 3 vấn đề ưu tiên được chuyển thành issue/task. Không suy rộng retention từ cỡ mẫu này.

GATE M7-A / v0.4: 6 luồng UI xác minh trên browser, ít nhất 1 full run không cheat trên desktop và ≥2 thiết bị thật, không có bug mất save/phần thưởng trùng/crash/blocker; có ≥8 playtest thật và dữ liệu phản hồi. Nếu thiếu thiết bị hay tester: GATE NOT VERIFIED, chỉ được làm sửa lỗi/thiết kế không phụ thuộc; không tự mở rộng nội dung M6.

M7-B — CẢI THIỆN FIRST-SESSION VÀ LÝ DO CHƠI LẠI (Tuần 3–4, P1)
M7-06 [ ] Onboarding ngắn, theo ngữ cảnh [GIẢ THUYẾT H1] (M, P1)

Mục tiêu: Tăng tỷ lệ người mới vào bí cảnh và hiểu thẻ nâng cấp mà không cần hướng dẫn bằng lời.
Phụ thuộc: GATE M7-A và M7-05.
Làm: Thử tối đa 3 gợi ý không chặn ở hub/cổng, di chuyển và màn thẻ đầu; có nút bỏ qua; hiển thị điều khiển riêng touch/desktop; không mở popup liên tiếp và không che cảnh báo boss.
Nghiệm thu: Người mới có thể mở run và chọn thẻ đầu mà không đọc tài liệu; test hiển thị 3 kích thước màn; cờ tutorial persist; ≥8 người mới được đo hành vi; báo cáo tỷ lệ vào run và thời gian đến thẻ đầu trước/sau hoặc lý do chưa so sánh được. Đích thử nghiệm, không phải kết quả đã đạt: ≥7/10 người mới vào run không cần trợ giúp.

M7-07 [ ] Kết quả run dẫn sang mục tiêu tiếp theo [GIẢ THUYẾT H2] (S, P1)

Mục tiêu: Biến màn nhận thưởng thành lời mời chơi tiếp có lý do.
Phụ thuộc: M7-05 và M7-04.
Làm: Hiện tiến độ tới đột phá/công pháp/thành tựu gần nhất; tối đa 2 mục tiêu cá nhân hóa bằng dữ liệu meta; thêm nút rõ “Tọa thiền”, “Xem công pháp”, “Vào bí cảnh mới”. Không tạo thưởng mới/nghịch lý kinh tế, không tự động chạy run.
Nghiệm thu: Nút đi đúng màn và không cộng thưởng hai lần; test 3 trạng thái chưa đủ linh khí/đủ đột phá/đã mở khóa; 8/10 người thử có thể trả lời “lượt tiếp tôi muốn làm gì” mà không được gợi ý. Đo second_run_start; chưa kết luận tăng tỷ lệ nếu không có đối chứng.

M7-08 [ ] Sổ công pháp & gợi ý tiến hóa [GIẢ THUYẾT H3] (M, P1)

Mục tiêu: Kích thích thử build khác bằng khám phá, không bắt đi xem wiki.
Phụ thuộc: M7-07; dữ liệu 12 công pháp, 4 tiến hóa đã có.
Làm: Màn “Công Pháp Đồ Giám” tự lấy dữ liệu từ src/data/skills.js; hiện kỹ năng sở hữu/chưa mở, tiến hóa đã khám phá, manh mối tiến hóa chưa khám phá và 1–2 ô kỹ năng chưa có công thức; thông báo khi khám phá lần đầu. Không tiết lộ hết lời giải nếu chưa thử nghiệm.
Nghiệm thu: Đúng 12 công pháp và 4 tiến hóa hiện hữu; dữ liệu không nhân bản hardcode ở UI; không lộ công pháp chưa đủ cảnh giới; unlock persist qua save; có test biên ở save migrate; người chơi phân biệt được “chưa unlock” với “chưa khám phá”.

M7-09 [ ] Một lần reroll + điều chỉnh pool thẻ có kiểm soát [GIẢ THUYẾT H4] (M, P1)

Mục tiêu: Giảm cảm giác “run chết vì không ra thẻ” mà không xóa yếu tố ngẫu nhiên.
Phụ thuộc: M7-08, M7-04.
Làm: Thử 1 reroll miễn phí mỗi run sau khi mở khóa, hoặc 1 reroll cố định từ đầu cho nhóm thử; weighted pool có ưu tiên nhẹ thẻ tương thích nhưng không bảo đảm combo; tính hợp lệ theo unlock/cap; feature flag bật/tắt để so sánh. Không thêm thanh toán/reroll bằng tiền.
Nghiệm thu: Seed giống nhau + cờ giống nhau cho draft tái lập; một reroll không thể dùng 2 lần; pool thiếu xử lý an toàn; 1000 draft seed không ra thẻ locked/maxed/duplicate sai luật; log reroll/độ hoàn thiện build; đánh giá trải nghiệm con người trước khi khóa trọng số.

M7-10 [ ] Biến thể bí cảnh bằng config, không thêm biome [GIẢ THUYẾT H5] (M, P1)

Mục tiêu: Các run có khác biệt thật với chi phí art thấp.
Phụ thuộc: M7-05, M7-09.
Làm: Thêm 2–3 biến thể có đánh đổi rõ ràng, ví dụ “Linh Triều” (nhiều EXP hơn nhưng quái nhanh hơn), “Ma Ảnh Xâm Lấn” (nhiều elite hơn nhưng thêm phần thưởng khi vượt), “Phong Linh Loạn Lưu” (nhịp wave và hướng bao vây khác). Dùng lại rừng, 4 quái, 2 boss, VFX sẵn có. Có thể chọn biến thể tại màn PREPARE hoặc xoay ngẫu nhiên theo seed; ghi tên và luật trước khi vào.
Nghiệm thu: ≥2 biến thể hoạt động end-to-end, không buff vô hạn, không spawn lên người, không thay cơ chế thưởng một lần; mỗi biến thể có bài test seed/fps và log kết quả; người thử có thể nói được hai run khác nhau ở điểm nào.

M7-11 [ ] Cân bằng dựa trên bot và người thật (M, P1)

Mục tiêu: Không dùng tỷ lệ thắng của bot né giỏi để kết luận build mạnh/yếu.
Phụ thuộc: M7-05, M7-09, M7-10.
Làm: Ghi ít nhất 24 run của người thật từ ≥8 tester (có thể gom từ M7-A/B), tách novice/experienced và input touch/desktop; chạy mô phỏng trên ≥32 seeds cho từng build được đánh giá bằng bot hiện hành và bot NAIVE; đối chiếu thời gian chết, boss, DPS, tiến hóa, cảm nhận khó/chán; sửa config có changelog, không đổi thuật toán AI chỉ vì bot win rate.
Nghiệm thu: BALANCE_M7.md ghi mẫu số của từng build, seed/config, win/death, tỷ lệ evo thực; mọi khác biệt >30 điểm phần trăm win-rate giữa các build cùng độ khó được đánh dấu cần xem xét (không tự coi là sai vì mẫu nhỏ). Không tăng tỉ lệ thắng bằng cách giảm tất cả độ khó mà không thử lại.

GATE M7-B / v0.5: Không còn P0 UX; hoàn chỉnh onboarding, goal screen, đồ giám, reroll/biến thể có feature flag; dữ liệu ≥8 người mới và ≥20 lượt thật hoặc giải thích lý do chưa đạt; báo cáo 5 giả thuyết H1–H5 SUPPORTED / REJECTED / INCONCLUSIVE. Mục tiêu định hướng: ≥50% người đủ thời gian được quan sát tự nguyện bắt đầu run thứ hai; không coi đây là ngưỡng thống kê đáng tin khi mẫu nhỏ. Nếu gameplay còn nhàm/chưa rõ, quay lại sửa M7-B thay vì mở M7-C.

M7-C — NỘI DUNG NHỎ CÓ ĐIỀU KIỆN (Tuần 5–6, P2)

Chỉ bắt đầu nếu GATE M7-B đạt và người phát triển duyệt danh mục. Không được tự động biến M6-01 thành nhiệm vụ đang làm.

M7-12 [ ] Hai tiến hóa mới từ kỹ năng hiện có [GIẢ THUYẾT H6] (L, P2)

Mục tiêu: Mở ra hai lối chơi mới mà không tăng mạnh số lượng công pháp cơ bản.
Phụ thuộc: GATE M7-B, M7-08, M7-11.
Làm: Thiết kế thử “Cực Hàn Băng Trận” (Băng Châm + Hàn Khí: băng lan/vùng khống chế có cap) và “Linh Châu Phong Ấn” (Linh Châu + Phong Ảnh Bộ: linh châu hỗ trợ tàn ảnh, thay đổi vị trí/nhịp đánh), hoặc thay theo feedback cho build ít người chọn. Định nghĩa trigger, behavior, cap, VFX reused/nhỏ, icon/tooltip, tránh trùng effect 4 combo cũ.
Nghiệm thu: Đúng 2 công thức, có thay đổi hành vi nhìn thấy được (không chỉ +% dmg), đi được qua draft thông thường trong ít nhất một seed được ghi nhận mỗi công thức; tests resolver + collision + save + cap hiệu ứng; đồ giám cập nhật 4→6 tự động; đo p95 khi 100/200/300 ở 3 graphic levels; thử với ≥6 người và ghi phản hồi phân biệt hai build.

M7-13 [ ] Cải tiến nhịp 2 boss và elite cũ [GIẢ THUYẾT H7] (M, P2)

Mục tiêu: Tăng sự đa dạng thử thách mà không sản xuất boss mới.
Phụ thuộc: GATE M7-B và M7-11.
Làm: Thiết kế 1 biến thể phối chiêu cho mỗi boss từ các telegraph đã có, chỉ kích hoạt ở difficulty phù hợp; 1 đợt elite kẹp giữa các pha nếu dữ liệu cho thấy đoạn rỗng. Không tạo one-shot không báo trước; không thêm boss thứ ba.
Nghiệm thu: 2 biến thể tấn công được xác minh bằng screenshot/video và tests; ít nhất 0,5 giây cảnh báo cho chiêu mới hoặc thời gian phù hợp được đo/trình người phát triển duyệt; không đòn nổ sau khi boss chết, không mất FPS/nghẽn input; người thử hiểu vì sao trúng đòn.

M7-14 [ ] Mẩu truyện tu tiên phản hồi sau run [GIẢ THUYẾT H8] (S/M, P2)

Mục tiêu: Tạo cảm giác thế giới tiến triển khi thắng/thua như Hades, nhưng chi phí thấp.
Phụ thuộc: GATE M7-B, có tín hiệu người chơi muốn có thêm bối cảnh/truyện.
Làm: Đặt “Bia Truyền Thừa” ở động phủ hoặc nhật ký ngắn; viết 5–8 đoạn lore kích hoạt lần đầu theo sự kiện rõ ràng (run đầu, lần đầu thất bại, hạ Lang Vương, hạ Yêu Vương, Trúc Cơ, unlock tiến hóa). Không thêm NPC/questline/voice; người chơi có thể bỏ qua.
Nghiệm thu: Trigger mỗi đoạn đúng 1 lần theo meta, không softlock, không tự bật che HUD chiến đấu; save/reload không mất hoặc lặp; văn bản ≤80 từ mỗi đoạn; ít nhất 5 người đọc thử và chấm độ hiểu/ngắn gọn. Nếu phản hồi không tích cực, giữ ở feature flag off.

GATE M7-C / Content: Chỉ pass nếu 2 tiến hóa mới tạo cách chơi khác biệt và đi được theo gameplay, build cũ không regression; boss variant có thể né được, VFX và save ổn; có bằng chứng đo/nhận xét người thật. Nếu M7-B không đạt, hủy hoặc hoãn M7-C và dùng thời gian sửa vòng loop.

M7-D — OPEN PLAYTEST NHỎ, TỔNG KẾT, QUYẾT ĐỊNH M6 (Tuần 7–8, P1)
M7-15 [ ] Open playtest có hướng dẫn và feedback dễ gửi (S, P1)

Mục tiêu: Có cơ hội nhận phản hồi ngoài nhóm phát triển.
Phụ thuộc: GATE M7-B; M7-C nếu được làm.
Làm: Bản build gh-pages versioned, changelog tiếng Việt ngắn, link feedback rõ trong Settings/Results, form 3–5 câu (vấn đề, thiết bị, phút đã chơi, thích/không thích, có muốn chơi tiếp); có tùy chọn báo lỗi và đính kèm file log do người chơi quyết định. Soạn lời mời thử trung lập, không hứa thưởng.
Nghiệm thu: Ít nhất 20 người thử mục tiêu tuyển, tối thiểu 12 phiên phản hồi hợp lệ để báo cáo; link game mở được không đăng nhập; feedback gửi được bằng desktop/mobile; kiểm tra không chứa ID nhạy cảm hay dữ liệu cá nhân tự thu; mỗi báo cáo có phiên bản build.

M7-16 [ ] Báo cáo funnel, replay, returning players [GIẢ THUYẾT H9] (M, P1)

Mục tiêu: Đo retention ở mức có thể với game GitHub Pages không backend.
Phụ thuộc: M7-04, M7-05, M7-15.
Làm: Tổng hợp log tự nguyện và survey theo nhóm người mới/quay lại, desktop/mobile. Công thức công khai: first_run_rate = số người vào run / số người mở game có log, first_card_rate = số người nhận thẻ đầu / số người vào run, second_run_rate = số người tự nguyện bắt đầu run 2 / số người hoàn tất run 1 và còn thời gian chơi. D1/D7 strict return chỉ với những participant opt-in có cùng thiết bị và đủ ngày theo dõi; không suy ra từ lượt tải trang hoặc số sự kiện. Báo cáo độ lệch mẫu và missing data.
Nghiệm thu: Có CSV/Markdown tổng hợp, số mẫu rõ, ít nhất 3 biểu hiện dropout và 3 nhận định cần điều chỉnh; D1/D7 chỉ ghi khi cohort có quan sát đủ 1/7 ngày; phân biệt measured với not measurable. Không so sánh trực tiếp D1/D7 web beta nhỏ với median app mobile như cùng phân phối.

M7-17 [ ] Sửa ba vấn đề quan trọng nhất + phát hành v0.6 (M, P1)

Mục tiêu: Để mỗi vòng feedback tạo ra thay đổi có thể kiểm chứng.
Phụ thuộc: M7-16 và ít nhất GATE M7-B.
Làm: Chọn ba vấn đề có tác động lớn nhất theo tần suất × mức nghiêm trọng × chi phí, sửa trong code hiện tại; regression tests toàn bộ, migration save, manual run và test thiết bị; cập nhật task status, changelog, version tag.
Nghiệm thu: 3 issue có before → fix → after hoặc ghi rõ chưa xử lý vì sao; npm test PASS tại HEAD, save v1/v2 và reward idempotency PASS; 1 run desktop + 1 mobile thực tế không blocker; có release notes và rollback commit; không phát hành nếu mất save.

M7-18 [ ] Decision memo: có đáng mở M6-01 (biome/boss) không? (S, P1)

Mục tiêu: Tránh đổ công vào nội dung mới khi loop chưa đủ hấp dẫn.
Phụ thuộc: M7-16, M7-17.
Làm: So sánh 3 phương án: (A) cải thiện first 5 minutes, (B) thêm 2 build/affix theo kiểu data-driven, (C) xin duyệt mở M6-01 làm biome/boss mới. Ghi dự toán S/M/L, bằng chứng feedback, 3 rủi ro và đề xuất có/không.
Nghiệm thu: docs/playtest/DECISION_M6.md có hướng ưu tiên, tiêu chí thành công, dữ liệu và bất định; M6-01..05 vẫn [ ] và bị khóa, trừ khi người phát triển phê duyệt bằng yêu cầu riêng.

GATE M7-D / v0.6: Báo cáo ít nhất 12 phản hồi dùng được, mục tiêu ≥20 người test (thiếu phải ghi lý do), 3 lỗi/điểm nghẽn được triage; không mất dữ liệu, có bản phát hành và quyết định tiếp theo. D1/D7 chỉ báo nếu cohort đủ ngày theo dõi; số ít không được dùng để tuyên bố product-market fit. Không tự mở multiplayer/login/monetization/M6-01.

B. BẢNG GIẢ THUYẾT — PHẢI CÓ KẾT LUẬN SAU PLAYTEST
Mã	Giả thuyết cần thử	Tín hiệu đo	Điều gì có thể bác bỏ
H1	Hướng dẫn 3 bước giảm kẹt ở phút đầu	first-run start, first-card time, can use without coaching	Người chơi vẫn không hiểu hoặc tips làm phiền
H2	Hiện mục tiêu kế tiếp tăng replay	second-run rate, câu trả lời tự phát	Người chơi thấy mục tiêu như nghĩa vụ hoặc không quan tâm
H3	Đồ giám tạo hứng khám phá build	mở đồ giám, thử khác build	Người chơi xem nhưng không đổi cách chơi
H4	1 reroll cải thiện cảm giác công bằng	lựa chọn vô ích, build completion, win	Game trở nên dễ quá hoặc tất cả build giống nhau
H5	Affix/wave variation giảm lặp	lý do replay, mức phân biệt hai run	Chỉ đổi số quái, người chơi không nhận ra
H6	2 tiến hóa làm run khác biệt	tỷ lệ được chọn, cảm nhận lối chơi	VFX khác nhưng chiến thuật không khác
H7	Boss remix làm thử thách thú vị	hit lý giải được, replay, thời gian boss	Quá rối, tăng chết oan, giảm readability
H8	Lore ngắn giúp người chơi gắn bó	tỷ lệ đọc/chọn skip, trả lời phỏng vấn	Người chơi chỉ muốn đánh tiếp, lore gây chậm nhịp
H9	Người chơi muốn trở lại sau ngày đầu	D1/D7 opt-in nếu quan sát được, phỏng vấn	Replay trong 1 session cao nhưng không ai quay lại

Cảnh báo thống kê: Cỡ mẫu 8–20 người phù hợp phát hiện UX và định hướng, không đủ chứng minh chênh lệch retention nhỏ. Giá trị 50% replay và 7/10 onboarding là đích thiết kế tạm, không phải chuẩn ngành. Bản web không cần đăng nhập nên phép đo cross-device không đáng tin; hãy báo rõ lựa chọn opt-in và thiên lệch mẫu.

C. QUY TẮC TRIỂN KHAI THEO 8 TUẦN
Tuần	Chỉ làm	Kết quả dự kiến
1	M7-01..03	UI, thiết bị, âm thanh và baseline được xác minh
2	M7-04..05	Log opt-in + playtest ban đầu + GATE A
3	M7-06..08	Onboarding, next goal, đồ giám
4	M7-09..11	Reroll, biến thể run, cân bằng người thật + GATE B
5–6	M7-12..14 nếu GATE B đạt và được duyệt	Hai tiến hóa, điều chỉnh boss, lore thử nghiệm + GATE C
7	M7-15..16	Beta phản hồi, funnel, theo dõi quay lại
8	M7-17..18	Sửa ưu tiên, phát hành v0.6, quyết định M6 + GATE D

Cách cắt nếu chỉ có 1 tháng: M7-01..11. Hoãn M7-C và M7-D; phát hành v0.5 sau GATE B, không cam kết nội dung mới.

D. MẪU BÁO CÁO SAU MỖI TASK
Task/commit: M7-xx / SHA
Đã sửa: tệp/chức năng/config
Tests: npm test PASS/FAIL (số lượng thật), smoke UI, thiết bị/browser
Số liệu: FPS p50/p95, crash, playtest n=, build/seed/case
Giả thuyết: SUPPORTED / REJECTED / INCONCLUSIVE, vì sao
Rủi ro: data loss, visual readability, UX, balance
Trạng thái: DONE / PARTIAL / BLOCKED / NOT VERIFIED
Gate kế tiếp: đạt/chưa đạt, những bằng chứng còn thiếu
E. TÀI LIỆU THAM KHẢO (ĐỐI CHIẾU, KHÔNG PHẢI TEMPLATE ĐỂ SAO CHÉP)
Source dự án: 
https://github.com/NghiaSionn/tu-tien-lo ; https://nghiasionn.github.io/tu-tien-lo/
Vampire Survivors: achievements and unlocks: https://steamcommunity.com/app/1794680/discussions/0/3276941718960217018/ ; level-up decisions: https://vampire.survivors.wiki/w/Level_up
Brotato item shop weighted by context: https://brotato.wiki.spellsandguns.com/Shop ; wave design: https://brotato.wiki.spellsandguns.com/Waves
Hades developer design goals: https://blog.playstation.com/2021/08/05/the-origins-of-hades-out-next-week-on-ps5-ps4/
Idle cultivation: https://store.steampowered.com/app/5387930/Idle_Immortal_Mountain/
GameAnalytics benchmark caveats: https://www.gameanalytics.com/reports/2026-mobile-pc-gaming-benchmarks ; retention definition: https://docs.gameanalytics.com/events-metrics-and-filtering/metrics/
F. PROMPT BẮT ĐẦU CHO CLAUDE CODE

Đọc CLAUDE.md, HANDOFF.md, GDD_TU_TIEN_LO.md, TASKS_TU_TIEN_LO.md, TEST_REPORT.md và file mới TASKS_TU_TIEN_LO_M7_2026-11-13.md. Đây là backlog bổ sung, không thay thế M0–M6. Bắt đầu M7-01, chỉ audit baseline, kiểm tra HEAD, chạy test và xác minh UI, viết báo cáo, chưa triển khai M7-02 trở đi và không làm M6-01..05. Giữ tất cả luật cố định và save v1/v2. Sau M7-01 cung cấp commit SHA, test số thực, screenshot/UX checklist, blocker và đề xuất ưu tiên để chủ dự án duyệt trước khi code tiếp.