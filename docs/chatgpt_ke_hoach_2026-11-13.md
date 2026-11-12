
…
Show more
Worked for 8m 21s
ChatGPT said:
TU TIÊN LỘ — Kế hoạch phát triển tiếp theo

Đề xuất ngày 13/11/2026 | Giai đoạn 13/11/2026 – 13/01/2027 | Định hướng v0.5 → v0.6

Sau khi đối chiếu báo cáo với repository công khai và nghiên cứu các game cùng thể loại, mình đề xuất:

Trong 1–2 tháng tới, Tu Tiên Lộ nên ưu tiên biến những hệ thống đã có thành một trải nghiệm khiến người chơi muốn chơi lượt thứ hai, thay vì tiếp tục mở rộng số lượng hệ thống.

Dự án đã có nền tảng rất tốt về mặt kỹ thuật đối với một prototype cá nhân. Nhưng hiện vẫn chưa có bằng chứng đủ mạnh cho thấy game thực sự giữ chân được người chơi.

I. Đánh giá hiện trạng

Mình đã kiểm tra repository Tu Tiên Lộ, tài liệu TASKS, HANDOFF và giao diện HTML của bản chơi thử. Repository xác nhận cấu trúc module, công cụ mô phỏng, kiểm thử và các milestone đã triển khai. 
GitHub
+2

Mình chưa thực hiện được một lượt chơi tương tác đầy đủ trên bản web, nên chưa thể tự xác nhận cảm giác điều khiển, giao diện động hay chất lượng âm thanh. Các chỉ số 146 test và hiệu năng 3,7/6,4 ms hiện được lấy từ báo cáo Claude Code bạn cung cấp.

Những điểm đáng chú ý

Hạng mục

	

Đánh giá




Core combat và roguelite

	

Đủ tính năng để bắt đầu kiểm thử người thật




Công pháp và tiến hóa

	

Có chiều sâu ban đầu, nhưng 4 tiến hóa còn khá ít




Tọa thiền, đột phá, thiên kiếp

	

Có bản sắc riêng, nên giữ và đánh giá trải nghiệm




Trang bị, thành tựu, gacha

	

Đã có logic, chưa đủ kiểm chứng về UX và giá trị




Đồ họa và hiệu năng desktop

	

Có kết quả khả quan




Chơi trên điện thoại

	

Chưa được xác nhận




Khả năng chơi lại và retention

	

Chưa có dữ liệu người chơi thực tế

Có hai điểm cần phản biện.

Thứ nhất: Bot thắng 15/16 lượt với Kiếm + Lôi không chứng minh build đó cân bằng. Nó có thể đơn giản là build thuận lợi cho thuật toán né đòn của bot. Nếu đưa ra quyết định cân bằng chỉ dựa vào mô phỏng, rất dễ làm sai trải nghiệm của người chơi thật.

Thứ hai: 146 test tự động đều qua không có nghĩa giao diện đã sẵn sàng phát hành. Trong backlog hiện tại, GATE v0.4 vẫn chưa đạt vì thiếu thử nghiệm thiết bị thật và đánh giá cảm nhận. 
GitHub

Vì vậy mình không khuyên Claude Code tự động triển khai thêm một biome hoặc boss mới ngay.

II. Kết quả nghiên cứu game cùng thể loại

Game

	

Cơ chế đáng học

	

Áp dụng vào Tu Tiên Lộ




Vampire Survivors

	

Achievement mở khóa nội dung; chọn nâng cấp, reroll, skip và banish

	

Tạo mục tiêu mở khóa rõ ràng, giúp người chơi kiểm soát build




Brotato

	

Trang bị và lựa chọn ngẫu nhiên có xét build hiện tại; nhịp chơi theo wave

	

Giảm lựa chọn vô dụng, tăng đa dạng lượt chơi mà không cần nhiều asset




Hades

	

Mỗi lượt chơi gắn với nâng cấp vĩnh viễn và tiến triển cốt truyện

	

Thất bại vẫn có ý nghĩa, thêm câu chuyện tu tiên giữa các lượt




Idle Immortal Mountain

	

Thiền, tích lũy tu vi, chuẩn bị đột phá và xây dựng động phủ

	

Làm tiến trình tu tiên thư giãn, tạo tương phản với chiến đấu căng thẳng

Nguồn đối chiếu: 
steamcommunity.com
+5

Bốn bài học mình rút ra

1. Người chơi cần biết mình đang theo đuổi điều gì. Vampire Survivors đặt nhiều nội dung phía sau những thành tựu cụ thể. Tu Tiên Lộ đã có 7 thành tựu, nên việc hiển thị mục tiêu kế tiếp có thể đem lại lợi ích lớn với chi phí thấp hơn việc tạo thêm boss.

2. Ngẫu nhiên phải tạo ra lựa chọn có ý nghĩa. Brotato không chọn toàn bộ phần thưởng hoàn toàn độc lập với trang bị hiện tại. Với Tu Tiên Lộ, nên thử tăng khả năng xuất hiện thẻ liên quan đến công pháp người chơi đã chọn, nhưng không được bảo đảm build tối ưu trong mọi lượt.

3. Thất bại vẫn nên tạo ra tiến triển. Hades kết hợp những lượt chơi thất bại với nội dung truyện và phát triển nhân vật. Tu Tiên Lộ có thể học theo bằng một số sự kiện nhỏ tại động phủ sau khi trở về, không cần hệ thống NPC phức tạp.

4. Tọa thiền nên là khoảng nghỉ có mục đích. Không nên biến tọa thiền thành việc phải AFK thật lâu mới tiếp tục chơi. Thay vào đó, cho người chơi thấy rõ họ sẽ đột phá khi nào, còn thiếu tài nguyên gì và đột phá sẽ mở khóa điều gì.

Đây là những nguyên tắc thiết kế được suy ra từ các hệ thống đã tồn tại ở game tham chiếu, không phải bằng chứng rằng chúng chắc chắn sẽ tăng retention của Tu Tiên Lộ.

III. Thứ tự đầu tư đề xuất

Thứ tự

	

Hạng mục

	

Chi phí tương đối

	

Tác động kỳ vọng




1

	

Sửa onboarding, HUD, lỗi thiết bị

	

Thấp–vừa

	

Rất cao




2

	

Thu thập hành vi và phản hồi thật

	

Thấp–vừa

	

Rất cao




3

	

Mục tiêu sau mỗi lượt, gợi ý mở khóa

	

Thấp

	

Cao




4

	

Reroll thẻ và cải thiện lựa chọn build

	

Thấp–vừa

	

Cao




5

	

Biến thể wave/sự kiện trong rừng hiện tại

	

Vừa

	

Cao




6

	

Thêm tiến hóa cho công pháp còn thiếu

	

Vừa

	

Cao




7

	

Truyện ngắn và dấu tích tu tiên

	

Thấp–vừa

	

Trung bình, cần thử nghiệm




8

	

Biome mới, boss mới

	

Cao

	

Chưa nên ưu tiên

Theo mình, khoản đầu tư có khả năng hiệu quả nhất lúc này là cải thiện 10 phút chơi đầu tiên và lý do bắt đầu lượt chơi tiếp theo.

Một lưu ý về quản lý backlog: M6-01 đến M6-05 trong TASKS cũ đã được dành cho nội dung mở rộng và các tính năng chưa được phép tự triển khai. Mình sẽ giữ nguyên các mã đó, dùng M7-xx cho toàn bộ kế hoạch mới để tránh xung đột. 
GitHub

IV. Backlog nhiệm vụ M7 — 8 tuần

Mình đã viết đầy đủ tài liệu theo cách đánh mã task, phụ thuộc, độ ưu tiên, nghiệm thu và GATE của TASKS cũ.

TASKS_TU_TIEN_LO_M7_2026-11-13.md

18 task · 4 GATE · 9 giả thuyết cần kiểm thử

 Tải file TASKS M7 cho Claude Code

Đây là backlog bổ sung, không thay thế TASKS_TU_TIEN_LO.md hiện tại.

Dưới đây là kế hoạch và điều kiện nghiệm thu trọng tâm để bạn kiểm soát Claude Code.

M7-A — Đóng GATE v0.4 và kiểm tra trải nghiệm thật

Tuần 1–2 · Ưu tiên P0 · Bắt buộc

M7-01 — Audit baseline và kiểm tra trạng thái game (S, P0)

Phụ thuộc: không.

Mục tiêu: Xác minh repository hiện tại, số test thực tế, luồng gameplay và các hệ thống M3/M4. Claude sẽ chạy test, kiểm tra các màn hình, ghi lỗi và đối chiếu phiên bản.

Nghiệm thu: Có commit SHA, số test PASS thực tế, ít nhất 6 luồng gameplay được đánh dấu PASS/FAIL/NOT VERIFIED và báo cáo lỗi theo mức nghiêm trọng.

M7-02 — Hoàn thiện UX các hệ thống đã có (M, P0)

Phụ thuộc: M7-01.

Mục tiêu: Kiểm tra và sửa giao diện thiên kiếp, Linh Mạch, luyện khí, gacha, thành tựu và kết quả run.

Nghiệm thu: Các modal mở/đóng 3 lần liên tiếp không lỗi; thao tác được ở viewport 360×800, 390×844 và 1366×768; không bị cắt nội dung quan trọng, không nhân đôi phần thưởng.

M7-03 — Kiểm thử điện thoại, âm thanh và hiệu năng (M, P0)

Phụ thuộc: M7-01, M7-02.

Mục tiêu: Xác minh các chức năng chưa được kiểm tra trên thiết bị thật.

Nghiệm thu: Chơi trọn run trên desktop và tối thiểu 2 điện thoại thật; đo thời gian khung hình p50/p95 và FPS; thử âm thanh, mute, joystick, pause, reload và save. Mục tiêu ở gameplay thông thường là 60 FPS desktop và tối thiểu 30 FPS trên điện thoại tầm trung ở cấu hình phù hợp.

M7-04 — Công cụ thu thập dữ liệu playtest (M, P0)

Phụ thuộc: M7-01.

Mục tiêu: Biết người chơi đã làm gì, dừng ở đâu, có thử build khác hay không.

Nghiệm thu: Ghi được những sự kiện như vào run, chọn thẻ đầu, tiến hóa, kết thúc run, bắt đầu run thứ hai; xuất JSON/CSV; không thu thông tin cá nhân, chỉ ghi khi tester đồng ý và không gửi dữ liệu ngầm.

M7-05 — Playtest người thật lần đầu (M, P0)

Phụ thuộc: M7-02 đến M7-04.

Mục tiêu: Tìm nguyên nhân khiến người chơi chưa hiểu game hoặc không muốn tiếp tục.

Nghiệm thu: Tối thiểu 8 phiên playtest hợp lệ, trong đó có ít nhất 5 người mới và 3 phiên cảm ứng. Báo cáo 5 vấn đề thường gặp nhất và ít nhất 3 vấn đề cần ưu tiên sửa.

GATE M7-A: Chỉ đạt khi game không còn lỗi chặn trải nghiệm, các giao diện chính đã kiểm tra, có bằng chứng chạy thật trên điện thoại và dữ liệu playtest ban đầu. Nếu thiếu tester hoặc máy thật, không được tự đánh dấu hoàn thành.

M7-B — Cải thiện khả năng giữ chân với chi phí thấp

Tuần 3–4 · Ưu tiên P1 · Trọng tâm v0.5

M7-06 — Hướng dẫn tân thủ theo ngữ cảnh (M, P1) [GIẢ THUYẾT H1]

Phụ thuộc: GATE M7-A.

Mục tiêu: Người mới biết cách vào bí cảnh, di chuyển, chiến đấu và chọn thẻ mà không cần người phát triển hướng dẫn.

Nghiệm thu: Tối đa 3 gợi ý có thể bỏ qua; đo thời gian đến thẻ đầu; mục tiêu thử nghiệm ít nhất 7/10 người mới vào run không cần trợ giúp.

M7-07 — Mục tiêu tiếp theo sau mỗi lượt chơi (S, P1) [GIẢ THUYẾT H2]

Phụ thuộc: M7-05.

Mục tiêu: Sau khi chết hoặc thắng, người chơi thấy rõ điều họ có thể làm tiếp: tọa thiền, đột phá, mở khóa công pháp hoặc vào bí cảnh mới.

Nghiệm thu: Có tối đa 2 mục tiêu phù hợp trạng thái meta, các nút dẫn đúng nơi, không nhân thưởng; kiểm tra ít nhất 8/10 người thử có thể xác định mục tiêu tiếp theo mà không được gợi ý.

M7-08 — Công Pháp Đồ Giám (M, P1) [GIẢ THUYẾT H3]

Phụ thuộc: M7-07.

Mục tiêu: Biến việc khám phá kỹ năng và công thức tiến hóa thành mục tiêu sưu tầm.

Nghiệm thu: Hiển thị đúng 12 công pháp và 4 tiến hóa đã có, trạng thái chưa mở khóa/đã khám phá, manh mối tiến hóa; tự đọc dữ liệu kỹ năng thay vì hardcode trùng lặp.

M7-09 — Reroll thẻ và cải thiện lựa chọn build (M, P1) [GIẢ THUYẾT H4]

Phụ thuộc: M7-08.

Mục tiêu: Giảm tình trạng người chơi bị kẹt vì liên tục nhận lựa chọn không phù hợp.

Nghiệm thu: Thử nghiệm 1 reroll mỗi run, kiểm tra 1.000 lượt draft theo seed không xuất hiện thẻ sai điều kiện, không reroll quá số lần; có feature flag để so sánh trước/sau.

M7-10 — Biến thể bí cảnh từ nội dung hiện có (M, P1) [GIẢ THUYẾT H5]

Phụ thuộc: M7-05, M7-09.

Mục tiêu: Tăng tính bất ngờ mà không phải vẽ thêm bản đồ mới.

Nghiệm thu: Ít nhất 2 biến thể hoạt động hoàn chỉnh, có luật và đánh đổi rõ ràng, chẳng hạn nhiều EXP nhưng yêu thú nhanh hơn; không phá hệ thống thưởng, có test hiệu năng và seed.

M7-11 — Cân bằng dựa trên bot và người thật (M, P1)

Phụ thuộc: M7-09, M7-10.

Mục tiêu: Phát hiện build quá mạnh, quá yếu hoặc quá khó dùng trong thực tế.

Nghiệm thu: Tổng hợp ít nhất 24 run từ tối thiểu 8 người, đồng thời chạy các build trên ít nhất 32 seed bằng bot phù hợp. Có báo cáo tỷ lệ thắng, tiến hóa, nguyên nhân chết và những thay đổi config đã thực hiện.

GATE M7-B: Có một bản v0.5 mà người mới hiểu được, lựa chọn nâng cấp có ý nghĩa và người chơi có lý do bắt đầu lượt tiếp theo. Mục tiêu thử nghiệm là ít nhất 50% người có đủ thời gian quan sát tự nguyện bắt đầu run thứ hai; nếu mẫu nhỏ hoặc chưa đạt, phải phân tích nguyên nhân, không tự tuyên bố retention tốt.

M7-C — Mở rộng nội dung nhỏ, chỉ khi gameplay đã được xác nhận hấp dẫn

Tuần 5–6 · Ưu tiên P2 · Cần duyệt sau GATE M7-B

Đây là phần mình muốn cho Claude làm có điều kiện, không mặc định triển khai.

M7-12 — Thêm hai tiến hóa công pháp (L, P2) [GIẢ THUYẾT H6]

Phụ thuộc: GATE M7-B và M7-11.

Đề xuất:

Cực Hàn Băng Trận: Băng Châm + Hàn Khí, tạo vùng băng và khống chế có giới hạn.

Linh Châu Phong Ấn: Linh Châu + Phong Ảnh Bộ, tạo cơ chế tàn ảnh phối hợp linh châu.

Nghiệm thu: Hai tiến hóa có hành vi chiến đấu mới, không chỉ tăng sát thương; kích hoạt được bằng gameplay thông thường, có VFX và test, không gây tăng tải bất thường. Đồ giám tự cập nhật từ 4 lên 6 công thức.

M7-13 — Biến thể đòn đánh boss và elite (M, P2) [GIẢ THUYẾT H7]

Phụ thuộc: M7-11.

Mục tiêu: Giảm cảm giác lặp lại khi gặp Lang Vương và Ma Ảnh Yêu Vương.

Nghiệm thu: Mỗi boss có ít nhất một biến thể phối hợp chiêu ở độ khó phù hợp; vẫn có cảnh báo rõ, né được, không gây sát thương sau khi boss chết. Không tạo boss mới.

M7-14 — Bia Truyền Thừa và mẩu truyện ngắn (S/M, P2) [GIẢ THUYẾT H8]

Phụ thuộc: GATE M7-B và phản hồi cho thấy người chơi quan tâm cốt truyện.

Mục tiêu: Khi người chơi thất bại, đánh boss hoặc đột phá, có thể khám phá thêm một phần thế giới tu tiên.

Nghiệm thu: 5–8 đoạn truyện ngắn, mỗi đoạn xuất hiện một lần theo sự kiện, có thể bỏ qua, lưu được qua reload, không cần thêm NPC hay hệ thống nhiệm vụ lớn.

GATE M7-C: Chỉ nghiệm thu nếu nội dung mới tạo ra sự khác biệt thực sự khi chơi, có phản hồi từ người thật, không gây regression. Nếu gameplay cơ bản vẫn chưa hấp dẫn thì hoãn toàn bộ mốc này.

M7-D — Open playtest, đo phản hồi và quyết định mở rộng

Tuần 7–8 · Ưu tiên P1 · Phát hành thử v0.6

M7-15 — Phát hành bản thử và nhận phản hồi (S, P1)

Phụ thuộc: GATE M7-B; GATE M7-C nếu có phát triển nội dung.

Mục tiêu: Có một bản web dễ chia sẻ và một cách gửi phản hồi đơn giản.

Nghiệm thu: Mục tiêu mời ít nhất 20 người thử; tối thiểu 12 phiên phản hồi hợp lệ; form hoạt động trên desktop/mobile, có ghi phiên bản build và không yêu cầu đăng nhập vào game.

M7-16 — Phân tích hành vi và tỷ lệ chơi lại (M, P1) [GIẢ THUYẾT H9]

Phụ thuộc: M7-04, M7-15.

Mục tiêu: Biết người chơi rời game ở bước nào và điều gì khiến họ muốn quay lại.

Nghiệm thu: Báo cáo funnel vào bí cảnh, chọn thẻ đầu, kết thúc lượt, bắt đầu lượt thứ hai; phân loại desktop/mobile, người mới/người quay lại. D1/D7 chỉ được ghi khi thực sự theo dõi đủ ngày trên cùng thiết bị và người chơi đồng ý.

M7-17 — Sửa các vấn đề ưu tiên và phát hành v0.6 (M, P1)

Phụ thuộc: M7-16.

Mục tiêu: Chuyển phản hồi thành cải thiện đã được xác minh.

Nghiệm thu: Ít nhất 3 vấn đề được xử lý hoặc giải thích rõ vì sao chưa xử lý; toàn bộ automated test tại commit phát hành PASS; save, phần thưởng, desktop/mobile không có lỗi nghiêm trọng; có changelog và bản rollback.

M7-18 — Quyết định có nên mở M6-01 (S, P1)

Phụ thuộc: M7-16, M7-17.

Mục tiêu: Quyết định nên làm thêm biome/boss, tăng độ đa dạng build hay tiếp tục cải thiện gameplay hiện tại.

Nghiệm thu: Có tài liệu quyết định dựa trên dữ liệu và phản hồi, so sánh chi phí/lợi ích của ba hướng. M6-01 đến M6-05 vẫn khóa nếu chưa được bạn duyệt riêng.

GATE M7-D: Có kết quả playtest, báo cáo người chơi, danh sách thay đổi đã nghiệm thu và quyết định phát triển tiếp theo. Không tự động chuyển sang multiplayer, server, monetization hoặc nội dung quy mô lớn.

V. Đo retention thế nào cho đúng?

Mình đề xuất theo dõi các chỉ số dưới đây, nhưng cần tách mục tiêu thiết kế với kết quả thực tế.

Chỉ số

	

Cách hiểu

	

Đích thử nghiệm ban đầu




First Run Rate

	

Người mở game rồi vào bí cảnh

	

≥80% người mới trong playtest có hướng dẫn tối thiểu




First Card Rate

	

Người vào run và chọn được thẻ đầu

	

≥90% số người bắt đầu run




Second Run Rate

	

Người tự nguyện chơi run thứ hai sau run đầu

	

≥50% người đủ điều kiện quan sát




D1 Retention

	

Quay lại đúng ngày kế tiếp

	

Chưa đặt ngưỡng cứng




D7 Retention

	

Quay lại đúng ngày thứ bảy

	

Chưa đặt ngưỡng cứng

Các tỷ lệ 80%, 90%, 50% là đích thử nghiệm do mình đề xuất, chưa phải benchmark thị trường.

Theo báo cáo GameAnalytics 2026, median retention của game mobile trong bộ dữ liệu năm 2025 ở khoảng 22% D1 và dưới 4% D7. Nhưng Tu Tiên Lộ là web game, người thử nghiệm còn rất ít, nên không thể áp dụng trực tiếp những số đó làm tiêu chí PASS/FAIL. 
GameAnalytics
+1

Một lưu ý quan trọng: vì game chạy trên GitHub Pages, không có backend và không có tài khoản, việc theo dõi người chơi qua nhiều thiết bị sẽ không chính xác. Giải pháp giai đoạn này là lưu thống kê cục bộ khi được cho phép, xuất log tự nguyện và kết hợp khảo sát trực tiếp.

Mẫu phản hồi nên sử dụng

Phiếu khảo sát thử nghiệm

Sao chép
Bạn đã chơi được bao nhiêu lượt bí cảnh?
Điều gì khiến bạn thích nhất khi chơi?
Điều gì gây khó hiểu hoặc khó chịu nhất?
Bạn có muốn chơi thêm lượt nữa không? Vì sao?
Bạn muốn mở khóa công pháp, trang bị hay nội dung gì tiếp theo?

Không cần khảo sát quá dài. Phản hồi hữu ích nhất thường xuất hiện khi quan sát người chơi thực sự bị kẹt, bỏ qua một hệ thống hoặc tự nói ra lý do họ muốn thử lượt tiếp theo.

VI. Lịch thực hiện đề xuất

Tuần 1–2 — M7-A

13–26/11

QA, thiết bị thật, UX, công cụ phản hồi và playtest baseline.

Tuần 3–4 — M7-B

27/11–10/12

Onboarding, mục tiêu tiếp theo, đồ giám, reroll và biến thể run.

Tuần 5–6 — M7-C

11–24/12

Nội dung tùy điều kiện: hai tiến hóa, biến thể boss, lore.

Tuần 7–8 — M7-D

25/12–07/01

Beta, thu thập phản hồi, sửa lỗi và quyết định roadmap tiếp theo. Dành đến 13/01 để hoàn tất theo dõi D7 nếu có đủ cohort.

Nếu chỉ thực hiện một tháng, mình khuyên hoàn thành M7-A và M7-B, không cố nhồi toàn bộ M7-C/D.

VII. Lệnh gửi Claude Code

Bạn chỉ cần đặt file mới trong thư mục gốc dự án, cùng cấp với TASKS_TU_TIEN_LO.md và CLAUDE.md.

Writing

Đọc kỹ toàn bộ tài liệu dự án hiện tại, đặc biệt:

CLAUDE.md

HANDOFF.md

GDD_TU_TIEN_LO.md

TASKS_TU_TIEN_LO.md

TEST_REPORT.md

TASKS_TU_TIEN_LO_M7_2026-11-13.md

File M7 là backlog bổ sung, không thay thế các task đã có. Giữ nguyên mọi luật cố định của dự án.

Bắt đầu thực hiện M7-01.

Trước hết, xác minh commit HEAD, chạy test, kiểm tra gameplay và đối chiếu các hệ thống hiện có với báo cáo ngày 13/11/2026.

Sau khi hoàn thành M7-01, hãy báo cáo:

Các hệ thống đã xác minh thực tế.

Số test PASS/FAIL tại HEAD.

Những bug hoặc vấn đề UX tìm thấy.

Những điểm chưa thể kiểm tra, đặc biệt trên thiết bị thật.

Danh sách task ưu tiên tiếp theo và điều kiện để bắt đầu.

Không tự thực hiện M7-02 trở đi cho đến khi tôi duyệt. Tuyệt đối không tự mở các task M6-01 đến M6-05, không thay renderer, không tạo backend, không làm multiplayer hoặc monetization.

Không đánh dấu task hoàn thành khi mới kiểm thử logic hoặc bot mà chưa đáp ứng đầy đủ tiêu chí nghiệm thu.

Kết luận

Với tình trạng hiện tại, mình nghĩ điều Tu Tiên Lộ thiếu nhất không còn là công nghệ hay số lượng hệ thống, mà là dữ liệu chứng minh người chơi thật thích vòng lặp gameplay nào.

Mình sẽ ưu tiên ba mục tiêu trong hai tháng:

Người mới có thể hiểu và tận hưởng trận chiến đầu tiên mà không cần hướng dẫn trực tiếp.

Người chơi kết thúc một run và có một lý do cụ thể, hấp dẫn để thử run tiếp.

Những lựa chọn công pháp, trang bị, cảnh giới và đột phá tạo ra cảm giác tiến bộ khác biệt, không phải chỉ cộng thêm chỉ số.

Nếu đạt được ba điều đó, việc thêm bí cảnh thứ hai, boss mới hay hàng chục công pháp mới sẽ có cơ sở rõ ràng hơn rất nhiều.

File M7 đã được thiết kế để Claude Code kiểm chứng từng giả thuyết thay vì chỉ liên tục thêm tính năng. Đây là hướng mình khuyên áp dụng cho giai đoạn tiếp theo của Tu Tiên Lộ.

TASKS_TU_TIEN_LO_M7_2026-11-13.md
Document
ChatGPT can make mistakes. Check important info.
Latest response




Thinking effort
High