TU TIÊN LỘ — THIẾT KẾ SẢNH TÔNG MÔN & BACKLOG M8

Phiên bản thiết kế 1.0 · 13/11/2026 · Dành cho Claude Code

Mục tiêu: Chuyển động phủ hiện tại thành một tông môn tu tiên 2D Pixel Art có thể tự do khám phá, nơi người chơi tương tác với công trình thay vì phải sử dụng hàng loạt nút chức năng trên HUD.

Mình đồng ý với hướng phát triển này, nhưng có một vấn đề cần giải quyết ngay từ thiết kế:

Sảnh tông môn phải tạo cảm giác sống động, không được biến những thao tác đơn giản thành việc đi bộ mất thời gian.

Nếu sau mỗi run, người chơi phải đi qua nửa bản đồ để luyện khí, sang nơi khác để gacha, rồi quay ngược lại cổng bí cảnh, trải nghiệm có thể kém hơn giao diện 10 nút hiện tại.

Vì vậy, mình đề xuất xây dựng một tông môn nhỏ, có mật độ công trình hợp lý, giao thông rõ ràng và mọi tính năng quan trọng đều ở gần nhau.

I. Chốt định hướng thiết kế M8
1. Tên và phong cách tông môn

Tên chính đề xuất: Thanh Huyền Tông (青玄宗)

Tên các phương án khác: Thanh Vân Tông, Huyền Thiên Tông, Vân Kiếm Tông.

Mình chọn Thanh Huyền Tông vì tên này không giới hạn người chơi vào Kiếm Tu hay một nguyên tố cụ thể. Nó phù hợp với thế giới có nhiều công pháp ngũ hành, luyện đan, luyện khí và thiên kiếp.

Tên khu vực xuất hiện khi vào game:

Thanh Huyền Tông — Ngoại Môn

Trong tương lai có thể phát triển thêm nội môn, cấm địa hoặc các phân đường mà không phải đổi tên tông môn.

Phong cách visual:

Kiến trúc tiên hiệp cổ trang, mái ngói xanh đậm, gỗ nâu, đá xanh và hoa văn vàng đồng.

Sân lát đá xen cỏ, cây cổ thụ, đèn linh khí, cờ tông môn, bia đá và những luồng linh khí nhẹ.

Tông màu chính: xanh ngọc, xanh lam, nâu gỗ và vàng ấm.

Giữ 2D pixel top-down, có bóng đổ và lớp vật thể phía trước nhân vật để tạo chiều sâu giả lập 2.5D.

Ban ngày thanh bình, nhưng khu tụ linh trận trở nên hoành tráng khi độ thiên kiếp.

Không cần chuyển renderer, thêm engine 3D hay tăng độ phân giải logic 640×360.

2. Nguyên tắc thiết kế bắt buộc

Nguyên tắc

	

Quyết định




Phạm vi

	

Giữ bản đồ 80×60, cải tạo khu vực trung tâm




Tương tác

	

Đến gần công trình, nhấn E hoặc nút tương tác cảm ứng




Giao diện

	

Bỏ thanh 10 nút khỏi sảnh mới, giữ HUD chỉ số và Pause




Công trình

	

Tái sử dụng toàn bộ logic chức năng M0–M7




Thiên kiếp

	

Vẫn diễn ra tại tụ linh trận, không giảm độ khó




Người chơi mới

	

Hướng dẫn đi đến khu vực, không bắt đọc tutorial dài




NPC

	

Không bắt buộc ở phiên bản đầu; chỉ thêm khi có vai trò rõ




Lưu trữ

	

Giữ nguyên meta/run, cảnh giới, trang bị và thành tựu




Đường lui

	

FEATURES.sectHub = false quay về sảnh cũ




Kiểm thử

	

Không đánh dấu hoàn thành chỉ nhờ test logic

Theo HANDOFF trong repository, cổng bí cảnh hiện đã nằm phía bắc tụ linh trận và có cơ chế đứng gần nhấn E. M8 nên tái sử dụng luồng này làm mẫu cho các công trình khác, thay vì viết một hệ thống tương tác hoàn toàn độc lập. 
GitHub
+1

II. Bố cục Thanh Huyền Tông
1. Sơ đồ tổng thể

Đề xuất chia thành 8 điểm chức năng, đảm nhiệm đủ 10 hành động cũ.

Plain text
                       BẮC
                        ↑
              ┌──────────────────┐
              │   CỔNG BÍ CẢNH   │
              │    (Vào run)     │
              └────────┬─────────┘
                       │
      ┌────────────┐   │   ┌────────────┐
      │ TÀNG KINH  │   │   │ LUYỆN KHÍ  │
      │    CÁC     │   │   │   PHƯỜNG   │
      │            │   │   │            │
      │  Đồ giám   │   │   │ Rèn / nâng │
      │  công pháp │   │   │  trang bị  │
      └─────┬──────┘   │   └─────┬──────┘
            │          │         │
            └──────────┼─────────┘
                       │
 ┌────────────┐        │        ┌────────────┐
 │    BIA     │   ┌────┴────┐   │ TRUYỀN THỪA│
 │ TRUYỀN THỪA│   │ TỤ LINH │   │     CÁC     │
 │            │   │  PHÁP   │   │             │
 │ Cốt truyện │   │   ĐÀI   │   │ Gacha công  │
 │            │   │         │   │ pháp / bảo  │
 └─────┬──────┘   │Tọa thiền│   │ vật         │
       │          │Đột phá  │   └──────┬──────┘
       │          │Lôi kiếp │          │
       │          └────┬────┘          │
       │               │              │
       └───────────────┼──────────────┘
                       │
        ┌──────────────┴────────────┐
        │                           │
 ┌──────┴──────┐             ┌──────┴──────┐
 │ CÔNG ĐỨC    │             │  ĐAN DƯỢC   │
 │   ĐƯỜNG     │             │    PHÒNG     │
 │             │             │              │
 │ Thành tựu   │             │ Dùng đan     │
 │ Phần thưởng │             │ Mua đan      │
 └─────────────┘             └──────────────┘

                       NAM

Sơ đồ thể hiện quan hệ vị trí, không biểu diễn chính xác kích thước hoặc va chạm của công trình.

2. Chức năng từng khu

Khu vực

	

Chức năng

	

Tương tác




Tụ Linh Pháp Đài

	

1. Tọa thiền; 2. Đột phá/độ thiên kiếp

	

E → chọn 1 trong 2




Đan Dược Phòng

	

3. Dùng Tụ Khí Đan; 4. Mua Tụ Khí Đan

	

E → chọn 1 trong 2




Cổng Bí Cảnh

	

5. Vào bí cảnh

	

E → màn chuẩn bị hiện có




Luyện Khí Phường

	

6. Luyện khí và trang bị

	

E → giao diện M4




Truyền Thừa Các

	

7. Gacha bằng vé Cơ Duyên

	

E → giao diện M4




Công Đức Đường

	

8. Thành tựu

	

E → bảng thành tựu




Tàng Kinh Các

	

9. Công Pháp Đồ Giám

	

E → đồ giám M7




Bia Truyền Thừa

	

10. Đọc các đoạn truyện đã mở

	

E → giao diện bia M7

Cài đặt không thuộc 10 chức năng phải đi bộ tới. Pause, âm lượng, giảm hiệu ứng, xuất/nhập save và các chức năng hệ thống phải truy cập nhanh ở bất kỳ đâu.

3. Bố trí tọa độ dự kiến

Dùng tọa độ tile, với gốc bản đồ ở góc trên trái. Trung tâm tụ linh trận tạm lấy (40, 30).

Khu vực

	

Tọa độ tham chiếu




Cổng Bí Cảnh

	

(40, 18)




Tàng Kinh Các

	

(33, 20)




Luyện Khí Phường

	

(47, 20)




Bia Truyền Thừa

	

(29, 30)




Tụ Linh Pháp Đài

	

(40, 30)




Truyền Thừa Các

	

(51, 30)




Công Đức Đường

	

(33, 40)




Đan Dược Phòng

	

(47, 40)

Đây là tọa độ tham chiếu để Claude dựng prototype, không phải vị trí cứng bắt buộc. Claude phải kiểm tra kích thước sprite, chân công trình, vật cản, cửa ra vào và vùng đánh của thiên kiếp trước khi chốt.

Sân chính cần có đường đi thông thoáng, ưu tiên các tuyến rộng 2–3 tile. Không đặt công trình hay NPC trong vùng cần dùng để né thiên kiếp.

4. Khoảng cách đi bộ

Mục tiêu đề xuất khi chạy thử:

Hành trình

	

Mục tiêu




Trở về từ run → Cổng Bí Cảnh

	

≤3 giây




Trở về từ run → Luyện Khí Phường

	

≤5 giây




Trở về từ run → Truyền Thừa Các

	

≤6 giây




Trở về từ run → Tụ Linh Pháp Đài

	

≤5 giây




Từ vị trí trung tâm → bất kỳ khu chức năng

	

≤8 giây

Các số trên là ngưỡng UX cần kiểm thử, không phải thời gian đã đo. Khi nghiệm thu phải đo cả đường đi thật có va chạm, không chỉ đo khoảng cách đường thẳng.

Đề xuất nhân vật trở về từ bí cảnh tại sân phía nam cổng, gần các công trình nâng cấp. Như vậy người chơi có hai lựa chọn hợp lý: vào run tiếp ngay, hoặc đi nâng cấp rồi quay lại cổng.

Không thêm loading riêng khi di chuyển giữa các công trình. Toàn bộ tông môn nên nằm trong cùng khu vực render.

5. Vùng thiên kiếp

Tụ Linh Pháp Đài nằm ở trung tâm một khoảng sân trống. Đây là nơi bắt buộc phải giữ nguyên:

Vị trí đột phá và thiên kiếp.

Ba giai đoạn né lôi kiếp.

VFX hiện tại, cảnh báo trên mặt đất và vùng an toàn.

Điều kiện thành công/thất bại và mức phạt hiện có.

Bán kính sân trống phải được tính theo vùng cảnh báo lớn nhất của các đòn lôi kiếp trong config, cộng khoảng trống để nhân vật né, thay vì ấn định theo bán kính tụ linh trận đang hiển thị.

Trong lúc thiên kiếp, các biển tương tác quanh sân không được che vùng cảnh báo. Công trình không được chặn lối né; NPC trang trí nếu có không được cản đường.

III. Thiết kế tương tác trong tông môn
1. Một hệ thống tương tác dùng chung

Thay vì viết logic riêng cho từng công trình, Claude nên tạo một hệ thống tương tác dựa trên dữ liệu.

Mỗi điểm tương tác có những thông tin như:

JavaScript
{
  id: "alchemy_hall",
  name: "Đan Dược Phòng",
  position: { x: 47, y: 40 },
  radius: 28,
  actions: ["use_pill", "buy_pill"],
  enabled: true
}

Đây là ví dụ cấu trúc đề xuất, không phải API hiện tại của project.

Các action phải gọi lại hàm nghiệp vụ đã tồn tại. Không viết hai hệ thống luyện khí, gacha hay đột phá riêng biệt cho sảnh mới và sảnh cũ.

Quy tắc tương tác:

Người chơi đến gần một điểm tương tác trong phạm vi khoảng 24–32 pixel.

Hiện tên khu vực và lời nhắc E — Tương tác.

Nhấn E trên bàn phím hoặc nút tương tác trên điện thoại.

Công trình một chức năng mở thẳng giao diện hiện có; công trình nhiều chức năng mở menu nhỏ để lựa chọn.

Khi đóng menu, nhân vật tiếp tục hoạt động bình thường.

Khi có hai điểm tương tác gần nhau, chỉ chọn điểm hợp lệ gần nhất. Vị trí đo nên dựa vào chân nhân vật và điểm đứng trước công trình, không phải tâm ảnh công trình.

Phím E không được kích hoạt hai hành động đồng thời, không được mở menu khi đang có modal khác và không được tạo lỗi khi người chơi nhấn liên tục.

2. Có nên thêm NPC?

Đề xuất: Phiên bản M8 đầu tiên không bắt buộc NPC.

Lý do: NPC làm tăng khối lượng asset, animation và xử lý tương tác, trong khi mục tiêu chính đang là thay đổi cách truy cập các chức năng có sẵn.

Có thể thêm hai NPC ở giai đoạn hoàn thiện visual:

NPC

	

Vị trí

	

Vai trò




Luyện Khí Trưởng Lão

	

Luyện Khí Phường

	

Nhân vật đứng trước lò rèn, tạo không khí




Đan Sư

	

Đan Dược Phòng

	

Nhân vật đứng cạnh quầy đan dược

NPC chưa cần hội thoại nhiều nhánh, nhiệm vụ hay AI di chuyển. Chúng có thể chỉ có animation idle, không cản đường đi và không thay thế điểm tương tác chính.

Sau này, nếu muốn phát triển cốt truyện tông môn, có thể nâng cấp NPC thành nhân vật thực sự.

3. Biển tên và chỉ đường

Mình đề xuất hệ thống dẫn đường ba mức.

Khoảng cách

	

Hiển thị




Xa công trình

	

Biển hiệu có tên ngắn trên công trình




Trong khoảng 5–6 tile

	

Hiển thị tên khu vực rõ hơn




Trong phạm vi tương tác

	

E — Tàng Kinh Các hoặc E — Tương tác

Không hiển thị đồng thời tám mũi tên lớn trên màn hình. Làm như vậy sẽ khiến tông môn trông như một bảng điều khiển đầy biểu tượng.

Chỉ nên có một mục tiêu được ghim tại một thời điểm. Nếu mục tiêu nằm ngoài camera, hiển thị mũi tên nhỏ ở rìa màn hình.

4. Thông báo công trình đang có việc

Đây là một trong những cơ chế mình đánh giá rất đáng làm.

Ví dụ:

Điều kiện thực tế

	

Công trình

	

Tín hiệu




Đã đủ tu vi để đột phá

	

Tụ Linh Pháp Đài

	

Biểu tượng vàng




Có đủ vé Cơ Duyên để quay

	

Truyền Thừa Các

	

Biểu tượng vé




Có thành tựu mới đạt hoặc chưa xem

	

Công Đức Đường

	

Chấm sáng




Có đoạn truyện chưa đọc

	

Bia Truyền Thừa

	

Biểu tượng sách




Có thể nâng cấp một món trang bị

	

Luyện Khí Phường

	

Biểu tượng búa, tùy chọn

Trạng thái phải lấy từ dữ liệu game thật. Ví dụ, Truyền Thừa Các chỉ báo sẵn sàng khi số vé đáp ứng chi phí quay, không phải cứ có một vé là sáng nếu giá quay yêu cầu nhiều hơn.

Thông báo nên tắt khi người chơi đã xem hoặc trạng thái không còn hợp lệ.

[GIẢ THUYẾT H8-01] Dấu hiệu công trình có việc sẽ khiến người chơi nhận biết và sử dụng nhiều tính năng meta hơn. Cần xác minh bằng playtest.

IV. HUD mới sau khi bỏ 10 nút

HUD của tông môn và bí cảnh nên có hai bố cục khác nhau, nhưng dùng chung các thành phần hiện có.

1. HUD trong tông môn

Vị trí

	

Nội dung

	

Quyết định




Trên trái

	

Tên nhân vật/cảnh giới, HP, tu vi

	

Giữ




Trên phải

	

Cài đặt/Pause, âm thanh

	

Giữ




Vùng tài nguyên gọn

	

Linh thạch, linh khí, vé, luyện liệu

	

Giữ, thu gọn




Gần nhân vật

	

Lời nhắc tương tác

	

Thêm




Mép màn hình

	

Mũi tên mục tiêu đang ghim

	

Thêm nếu cần




Dưới màn hình

	

Hàng 10 nút chức năng

	

Bỏ trong chế độ tông môn




Góc dưới trái trên mobile

	

Joystick

	

Giữ




Góc dưới phải trên mobile

	

Nút tương tác E

	

Thêm

Đồ giám, thành tựu hay gacha sẽ được mở từ công trình. Nhưng đừng xóa các hàm và phím tắt cũ; chỉ ẩn các nút trong chế độ sảnh mới.

2. HUD trong bí cảnh

Giữ nguyên HUD chiến đấu M7, bao gồm HP, thời gian run, cấp chiến đấu, EXP, hiệu ứng và cảnh báo boss.

Không thêm biển tên công trình hay thông báo meta vào bí cảnh.

M8 là dự án cải tạo tông môn, không phải thiết kế lại giao diện chiến đấu.

3. Pause và cài đặt trên cảm ứng

Trên điện thoại cần có nút Pause/Cài đặt cố định, kích thước vùng chạm tối thiểu 44×44 CSS pixel.

Menu hệ thống phải mở được dù đang ở xa công trình, đang tọa thiền hoặc đang xem bảng tương tác.

Không nên bắt người chơi đến một NPC hay công trình để thay đổi âm lượng, giảm hiệu ứng hoặc xuất save.

4. Phím tắt cũ

Trong sảnh mới, các phím T, B, 1, 2, G, H, J có thể được giữ làm đường tắt phụ cho người chơi quen thuộc.

Tuy nhiên, các phím có ngữ cảnh khác nhau giữa hub và run phải được xử lý đúng, đặc biệt là các lỗi input đã từng xuất hiện ở M7.

Điểm quan trọng: phím tắt là tiện ích bổ sung, không được trở thành cách duy nhất để sử dụng tính năng.

V. Hướng dẫn người mới trong Thanh Huyền Tông

Mình không khuyên giới thiệu cả tám công trình ngay khi người chơi đăng nhập lần đầu.

Người mới chỉ cần hiểu ba việc theo thứ tự: di chuyển, vào bí cảnh và phát triển nhân vật sau run.

Luồng onboarding đề xuất

Bước 1 — Lần đầu xuất hiện tại tông môn

Người chơi xuất hiện ở sân gần cổng bí cảnh. Một dòng hướng dẫn nhỏ:

Chào mừng đến Thanh Huyền Tông. Dùng WASD hoặc joystick để di chuyển.

Cổng bí cảnh có mũi tên nhẹ. Không khóa nhân vật vào một đường đi cố định.

Bước 2 — Tiếp cận cổng bí cảnh

Khi đến gần, hiện:

Nhấn E hoặc nút tương tác để tiến vào bí cảnh.

Sau đó dùng màn chuẩn bị hiện có. Hướng dẫn chọn thẻ đầu tiên của M7 vẫn được sử dụng.

Bước 3 — Sau khi kết thúc run đầu tiên

Đây là thời điểm giới thiệu meta progression.

Màn kết quả vẫn hiển thị tối đa hai mục tiêu. Một trong các mục tiêu có thể dẫn tới Tụ Linh Pháp Đài, Luyện Khí Phường hoặc Truyền Thừa Các, tùy tài nguyên thực tế.

Ví dụ khi có linh khí:

Bạn đã mang linh khí về tông môn. Đến Tụ Linh Pháp Đài để chuyển hóa thành tu vi.

Nếu chưa có linh khí nhưng đủ nguyên liệu rèn, có thể ưu tiên Luyện Khí Phường.

Không hướng dẫn người chơi đến một khu mà họ chưa thể làm gì.

Điều kiện nghiệm thu onboarding

Người mới có thể tìm cổng và vào bí cảnh.

Hướng dẫn xuất hiện tối đa một lần cho mỗi bước tương ứng.

Có thể tắt hướng dẫn.

Reload không làm phát lại toàn bộ onboarding đã hoàn thành.

Người đã chơi M7 không bị reset tiến trình hướng dẫn.

Hướng dẫn hoạt động trên cả bàn phím và cảm ứng.

[GIẢ THUYẾT H8-02] Hướng dẫn theo vị trí sẽ dễ hiểu hơn việc giới thiệu 10 nút chức năng cùng lúc. Chưa có dữ liệu người thật để xác nhận.

VI. EXECUTION BACKLOG — M8: THANH HUYỀN TÔNG

Trạng thái: Chưa triển khai.

Phạm vi: Cải tạo sảnh động phủ thành tông môn có các công trình tương tác, giữ toàn bộ gameplay và save hiện có.

Quy ước: [ ] chưa làm · [~] đang làm · [x] hoàn thành đã nghiệm thu · [!] bị chặn.

P0 = bắt buộc, P1 = ưu tiên cho phiên bản đầy đủ, P2 = có thể hoãn. S/M/L là độ lớn tương đối, không phải số ngày thực hiện.

M8-A — Nền tảng tông môn và vòng chơi tối thiểu

Ưu tiên P0 · Mục tiêu: Đi lại trong sảnh mới, dùng tụ linh trận và vào bí cảnh

M8-01 [ ] Audit tích hợp và chuẩn bị rollback (S, P0)

Mục tiêu: Xác định chính xác các module điều khiển hub, map, input, UI, tương tác và save trước khi sửa.

Phụ thuộc: Không.

Việc cần làm:

Đọc source thực tế, GDD, HANDOFF và TEST_REPORT mới nhất.

Chạy npm test, ghi commit SHA và số lượng test thực tế.

Xác định hàm nghiệp vụ của đủ 10 chức năng.

Tạo checkpoint Git trước khi thay đổi.

Thêm cờ FEATURES.sectHub, mặc định tắt trong giai đoạn xây dựng.

Nghiệm thu:

Có bảng ánh xạ 10 chức năng đến các hàm/module hiện tại.

Có commit baseline và hướng dẫn rollback.

Save v1/v2 không bị chỉnh sửa.

Tắt sectHub thì sảnh cũ vẫn chạy như trước.

M8-02 [ ] Dựng layout tông môn và hệ thống va chạm (L, P0)

Mục tiêu: Biến khu trung tâm bản đồ thành sân tông môn có các vị trí dành sẵn cho tám công trình.

Phụ thuộc: M8-01.

Việc cần làm:

Tạo layout cố định theo tọa độ tile.

Dành chỗ cho các công trình, sân chính và đường đi.

Dùng hình placeholder trước khi có asset hoàn chỉnh.

Bảo đảm không có cây, đá, yêu thú hoặc vật cản ngẫu nhiên xuất hiện giữa đường đi.

Kiểm tra vùng thiên kiếp không bị chặn.

Giữ thế giới 80×60 và hệ thống camera hiện tại.

Đưa sói thử đòn đánh ra ngoài khu sinh hoạt chính hoặc sang một góc luyện tập riêng, nếu cần.

Nghiệm thu:

Có đủ tám vị trí công trình được đánh dấu.

Tất cả điểm tương tác có thể tiếp cận bằng đường đi hợp lệ.

Không có tile bị kẹt hoặc đường cụt bắt buộc.

Người chơi có thể tới mọi công trình bằng phím điều khiển bình thường.

Không có công trình chặn đường né thiên kiếp.

Trở về hub không bị spawn trong vật cản.

M8-03 [ ] Hệ thống tương tác công trình dùng chung (M, P0)

Mục tiêu: Cho phép mọi công trình sử dụng cùng một cơ chế E/nút cảm ứng.

Phụ thuộc: M8-02.

Việc cần làm:

Tạo registry các điểm tương tác.

Tính điểm hợp lệ gần nhất theo vị trí chân nhân vật.

Tạo prompt tên khu và lời nhắc E.

Hỗ trợ công trình có một hoặc nhiều action.

Tích hợp với hệ thống modal/pause hiện có.

Chặn nhấn trùng và tương tác khi đang trong state không hợp lệ.

Nghiệm thu:

Test tối thiểu ba tình huống: một action, hai action và hai điểm đứng gần nhau.

Không mở đồng thời hai modal.

Nhấn E liên tục không kích hoạt action hai lần ngoài ý muốn.

Không kích hoạt công trình khi ngoài phạm vi.

Logic tương tác không hoạt động sai trong bí cảnh hoặc thiên kiếp.

Có automated tests cho chọn mục tiêu và điều kiện tương tác.

M8-04 [ ] Cổng Bí Cảnh (S, P0)

Mục tiêu: Tạo điểm tương tác đầu tiên trong sảnh mới để kiểm chứng toàn bộ vòng chơi.

Phụ thuộc: M8-03.

Việc cần làm:

Chuyển cơ chế cổng hiện có vào registry tương tác.

Bổ sung biển tên và điểm đứng tương tác.

Giữ nguyên màn chuẩn bị, chọn công pháp và độ khó.

Đưa người chơi trở lại sân gần cổng khi kết thúc run.

Nghiệm thu:

Đi tới cổng → E → chuẩn bị → vào run.

Hoàn thành hoặc thất bại → nhận thưởng → trở về đúng vị trí.

Lặp lại ít nhất ba run không mất input, mất camera hoặc nhận thưởng trùng.

Vị trí trở về không bị vật cản và có đường đi tới các công trình khác.

M8-05 [ ] Tụ Linh Pháp Đài (M, P0)

Mục tiêu: Đưa tọa thiền và đột phá về cùng một khu trung tâm.

Phụ thuộc: M8-03, M8-02.

Việc cần làm:

Tạo menu hai lựa chọn: Tọa thiền và Đột phá.

Tái sử dụng các hệ thống tu vi, cảnh giới và lôi kiếp hiện có.

Cho phép tọa thiền bắt đầu/kết thúc đúng trạng thái.

Đóng giao diện tương tác khi bước vào thiên kiếp.

Không thay đổi sát thương hoặc độ khó thiên kiếp.

Nghiệm thu:

Tu vi tăng đúng config khi tọa thiền.

Di chuyển làm gián đoạn thiền như logic hiện tại.

Đột phá tiểu cảnh giới hoạt động.

Đột phá đại cảnh giới mở thiên kiếp tương tác.

Thiên kiếp thành công/thất bại cập nhật trạng thái chính xác.

Không có công trình, NPC hoặc prompt cản cảnh báo và đường né.

GATE M8-A — Sảnh mới chơi được từ đầu đến cuối

Chỉ đạt khi:

Bật sectHub → vào sảnh mới.

Nhân vật di chuyển tự do, không kẹt.

Vào bí cảnh, kết thúc, nhận thưởng và trở về.

Tọa thiền, đột phá và độ kiếp vẫn hoạt động.

Tắt sectHub → sảnh cũ hoạt động với cùng save.

Không có regression blocker, test tự động PASS và đã smoke test trong trình duyệt.

Không chuyển sang M8-B nếu vòng hub → run → hub bị lỗi.

M8-B — Chuyển từng chức năng thành công trình

Ưu tiên P1 · Mỗi task có thể nghiệm thu riêng sau khi có hệ thống tương tác nền

M8-06 [ ] Đan Dược Phòng (S, P1)

Mục tiêu: Đưa hai chức năng Dùng đan và Mua đan về một nơi.

Phụ thuộc: GATE M8-A.

Việc cần làm: Tạo điểm tương tác, menu hai lựa chọn, hiển thị số đan hiện có và chi phí mua từ config.

Nghiệm thu:

Dùng đan giảm số lượng chính xác một lần và nhận đúng hiệu ứng.

Mua thành công khi đủ linh thạch.

Không đủ linh thạch có thông báo rõ.

Không tạo đan hoặc trừ tiền hai lần khi nhấn liên tục.

Dùng lại logic M3/M4, không tạo hệ thống đan mới.

M8-07 [ ] Luyện Khí Phường (M, P1)

Mục tiêu: Cho phép mở giao diện rèn và trang bị bằng cách đến lò luyện khí.

Phụ thuộc: GATE M8-A.

Việc cần làm: Tạo công trình, điểm tương tác, biển tên; kết nối trực tiếp với giao diện luyện khí hiện tại.

Nghiệm thu:

Mở được bảng trang bị với đúng dữ liệu meta.

Trang bị, tháo, nâng cấp hoạt động theo logic hiện có.

Không đủ nguyên liệu có thông báo chính xác.

Đóng bảng và mở lại không mất hoặc nhân đôi vật phẩm.

Reload giữ nguyên trang bị đã thay đổi.

M8-08 [ ] Truyền Thừa Các (M, P1)

Mục tiêu: Biến hệ thống gacha thành một địa điểm đặc trưng trong tông môn.

Phụ thuộc: GATE M8-A.

Việc cần làm: Thêm công trình, biểu tượng truyền thừa, điểm E, mở giao diện gacha hiện tại.

Nghiệm thu:

Hiển thị vé Cơ Duyên, tỷ lệ và bảo hiểm hiện tại.

Quay thành công trừ vé đúng một lần.

Vật phẩm trùng chuyển thành mảnh đúng logic.

Bảo hiểm 30 lượt không bị reset sai.

Không đủ vé không thể quay.

Không thay đổi tỷ lệ gacha ở task này.

M8-09 [ ] Công Đức Đường (S, P1)

Mục tiêu: Đưa bảng thành tựu vào một công trình.

Phụ thuộc: GATE M8-A.

Việc cần làm: Thêm điểm tương tác, biển tên và liên kết tới thành tựu M4.

Nghiệm thu:

Hiển thị đúng các thành tựu đã có.

Trạng thái khóa/hoàn thành được giữ qua reload.

Không nhận lại phần thưởng đã nhận.

Công trình không tạo thêm hệ thống nhiệm vụ mới.

M8-10 [ ] Tàng Kinh Các (S, P1)

Mục tiêu: Đưa Công Pháp Đồ Giám vào một tòa nhà.

Phụ thuộc: GATE M8-A.

Việc cần làm: Tạo điểm tương tác, mở Đồ Giám M7; giữ các manh mối tiến hóa và thông tin công pháp chưa khám phá.

Nghiệm thu:

Hiển thị đúng toàn bộ công pháp và tiến hóa hiện có trong dữ liệu.

Không tiết lộ tên công pháp còn khóa trái với thiết kế M7.

Công pháp đã mở khóa hiển thị trạng thái chính xác.

Có thể đóng/mở nhiều lần mà không mất input.

M8-11 [ ] Bia Truyền Thừa (S, P1)

Mục tiêu: Giữ nguyên hệ thống lore, đưa bia về đúng vị trí trong tông môn mới.

Phụ thuộc: GATE M8-A.

Việc cần làm: Tái sử dụng bia và các đoạn truyện hiện có; cập nhật vị trí, vùng tương tác và hiển thị đoạn chưa đọc.

Nghiệm thu:

Cả bảy đoạn truyện hiện có vẫn truy cập được khi đủ điều kiện.

Trạng thái đã đọc được lưu.

Không mở đoạn truyện sai điều kiện.

Phím E hoặc nút tương tác hoạt động đúng.

GATE M8-B — Đủ toàn bộ 10 chức năng

Chỉ đạt khi:

Tám điểm chức năng hoạt động.

Mười hành động cũ có thể truy cập bằng di chuyển + tương tác.

Không cần hàng 10 nút cũ để hoàn thành vòng gameplay.

Toàn bộ meta state được bảo toàn khi chuyển qua lại giữa hai chế độ hub.

Mỗi công trình có test riêng, bao gồm đường đi, mở/đóng giao diện và ít nhất một tương tác nghiệp vụ hợp lệ.

Không còn công trình placeholder vô hình mà người chơi phải đoán vị trí.

M8-C — Hoàn thiện trải nghiệm và visual

Ưu tiên P0/P1 · Không bổ sung gameplay mới

M8-12 [ ] Thiết kế lại HUD tông môn (M, P1)

Mục tiêu: Bỏ sự rối mắt của 10 nút chức năng.

Phụ thuộc: GATE M8-B.

Việc cần làm:

Ẩn thanh nút cũ khi sectHub bật.

Giữ HP, cảnh giới, tu vi và tài nguyên.

Giữ Cài đặt/Pause truy cập toàn cục.

Bổ sung prompt tương tác theo ngữ cảnh.

Không thay đổi HUD trong run.

Nghiệm thu:

Không còn thanh 10 nút trong sảnh mới.

Các chỉ số quan trọng vẫn nhìn được.

Kiểm tra viewport 360×800, 390×844, 640×360 và 1366×768.

Không có modal, nút hệ thống hoặc thông tin quan trọng bị che.

Chế độ sảnh cũ vẫn hiển thị UI cũ đúng.

M8-13 [ ] Biển hiệu, dẫn đường và thông báo trạng thái (M, P1) [H8-01]

Mục tiêu: Giúp người chơi tìm công trình và nhận biết khi có việc cần làm.

Phụ thuộc: GATE M8-B.

Việc cần làm:

Thêm biển tên tám công trình.

Thêm mũi tên dẫn tới một mục tiêu được ghim.

Thêm thông báo có việc theo trạng thái thật.

Kết nối mục tiêu sau run từ M7 với khu tương ứng.

Nghiệm thu:

Đủ tám biển hiệu, tên không chồng lên nhau khi hiển thị bình thường.

Một thời điểm chỉ có tối đa một mũi tên nhiệm vụ được ghim.

Đủ tu vi hiện thông báo đột phá.

Có đủ vé hiện thông báo tại Truyền Thừa Các.

Có truyện chưa đọc hiện dấu hiệu tại bia.

Thông báo tự cập nhật khi điều kiện thay đổi.

Không hiển thị các dấu hiệu không còn hợp lệ sau reload.

M8-14 [ ] Điều khiển cảm ứng và khả năng tiếp cận (M, P0)

Mục tiêu: Người chơi điện thoại sử dụng toàn bộ tông môn mà không cần bàn phím.

Phụ thuộc: M8-03, M8-12.

Việc cần làm:

Tích hợp nút tương tác gần joystick.

Đảm bảo nút không chồng vùng joystick.

Hỗ trợ menu nhiều action bằng thao tác chạm.

Giữ nút Pause/Cài đặt luôn truy cập được.

Thử xoay màn hình trong hub và khi mở modal.

Nghiệm thu:

Vùng chạm tương tác tối thiểu 44×44 CSS pixel.

Di chuyển bằng joystick và nhấn tương tác không gây xung đột.

Không kích hoạt cùng một action hai lần khi chạm.

Modal mở/đóng đúng với cảm ứng mô phỏng.

Có kết quả trên điện thoại thật trước khi đánh dấu đầy đủ PASS.

Nếu chưa có điện thoại thật: NOT VERIFIED, không tự đóng task.

M8-15 [ ] Art pass và hiệu ứng môi trường (L, P1) [H8-03]

Mục tiêu: Hoàn thiện cảm giác một tông môn tiên hiệp bằng pixel art, không thay renderer.

Phụ thuộc: M8-02, GATE M8-B.

Việc cần làm:

Tích hợp công trình, nền đá, đường đi, biển hiệu.

Sắp xếp lớp vẽ để nhân vật có thể đi phía trước/sau vật thể đúng.

Thêm bóng đổ đơn giản.

Thêm các hiệu ứng môi trường nhẹ, có giới hạn.

Cache các lớp bản đồ tĩnh bằng cơ chế có sẵn.

Giữ các mức đồ họa Cao/Vừa/Thấp.

Nghiệm thu:

Tám khu vực phân biệt rõ về hình ảnh.

Không có sprite lệch chân, cắt mép hoặc chồng sai.

Nhân vật không bị mái nhà che kín ở vị trí tương tác.

Mức Thấp vẫn nhận biết được biển hiệu và thông báo quan trọng.

Trên cùng thiết bị, hiệu năng hub không suy giảm quá 20% so với baseline tương đương nếu không có lý do được ghi nhận.

Không có lỗi lớn về FPS, bộ nhớ hoặc vẽ quá nhiều đối tượng.

M8-16 [ ] Save, rollback và regression (M, P0)

Mục tiêu: Đảm bảo có thể chuyển giữa sảnh cũ và mới mà không mất tiến độ.

Phụ thuộc: M8-06 đến M8-15.

Việc cần làm:

Kiểm tra migrate và load save hiện có.

Kiểm tra vị trí nhân vật nếu lưu tại khu vực mới nhưng tải bằng hub cũ.

Tạo cơ chế đưa nhân vật về điểm đứng hợp lệ nếu vị trí bị chặn.

Kiểm tra toàn bộ 10 chức năng và rollback.

Chạy automated tests và browser smoke tests.

Nghiệm thu:

Save v1/v2 không bị xóa hoặc ghi đè không an toàn.

Cảnh giới, tu vi, linh khí, linh thạch, vé, trang bị, thành tựu, công pháp đã mở khóa không đổi ngoài giao dịch hợp lệ.

Bật/tắt cờ sảnh không nhân tài nguyên hoặc tạo reward trùng.

Ít nhất ba lần đổi chế độ sảnh và reload liên tiếp không làm hỏng save.

Test tự động PASS; báo cáo rõ mọi mục chưa thử bằng tay.

GATE M8-C — Sảnh tông môn sẵn sàng playtest

Có đầy đủ visual, HUD và hệ thống tương tác.

Có thể hoàn thành một vòng hub → run → hub.

Tám công trình dùng được bằng bàn phím.

Touch mô phỏng hoạt động; test điện thoại thật phải được ghi rõ trạng thái.

Không có lỗi P0/P1 chưa được xử lý hoặc chấp thuận.

Sảnh cũ có thể khôi phục bằng feature flag.

Có ảnh/video kiểm thử và báo cáo hiệu năng trên cùng điều kiện so sánh.

Đạt GATE M8-C không đồng nghĩa đã xác nhận người chơi thích sảnh mới.

M8-D — Playtest và quyết định phát hành
M8-17 [ ] Playtest người thật cho sảnh tông môn (M, P0) [H8-01/H8-02/H8-03]

Mục tiêu: Xác minh sảnh mới có thực sự dễ dùng và hấp dẫn hơn sảnh cũ không.

Phụ thuộc: GATE M8-C.

Việc cần làm:

Mời tối thiểu tám người thử, ưu tiên năm người mới.

Cố gắng có ít nhất ba phiên sử dụng điện thoại thật.

Quan sát họ tìm cổng, vào run, trở về và truy cập nâng cấp.

Đo thời gian đi bộ, số lần tìm sai công trình và số lần cần hỗ trợ.

Hỏi người chơi thích sảnh mới hay giao diện nút cũ, và vì sao.

Dùng logger opt-in của M7 khi người thử đồng ý.

Nghiệm thu:

Có tối thiểu tám phiên quan sát hợp lệ.

Có thống kê thời gian từ nhận thưởng đến khi vào run tiếp.

Có thống kê số lần không tìm được công trình.

Có ít nhất ba vấn đề UX quan trọng được phân loại.

Phản hồi được tách thành quan sát thực tế và ý kiến chủ quan.

Nếu không có người chơi thật, task giữ trạng thái BLOCKED.

M8-18 [ ] Chỉnh sửa và phát hành sảnh tông môn (M, P1)

Mục tiêu: Hoàn thiện sảnh mới dựa trên kết quả M8-17.

Phụ thuộc: M8-17.

Việc cần làm:

Sửa các vấn đề UX ưu tiên.

Rút ngắn đường đi nếu người chơi mất nhiều thời gian.

Điều chỉnh biển hiệu, dẫn đường và vị trí công trình.

Kiểm tra lại save, input, FPS.

Cập nhật README, HANDOFF và TEST_REPORT.

Chuyển sectHub thành chế độ mặc định khi đã đủ điều kiện.

Nghiệm thu:

Ít nhất ba vấn đề ưu tiên được sửa hoặc có lý do hoãn rõ ràng.

Không còn lỗi blocker.

Có báo cáo trước/sau cho các vấn đề được đo.

Automated tests PASS tại commit phát hành.

Có commit/tag có thể rollback.

Bản chơi trên GitHub Pages chạy đúng phiên bản phát hành.

GATE M8-D — Quyết định sử dụng sảnh mới làm mặc định

Đề xuất dùng các chỉ tiêu sau làm ngưỡng đánh giá UX thử nghiệm, không coi là benchmark thị trường:

Chỉ số

	

Mục tiêu




Người mới tìm được cổng không cần trợ giúp

	

≥80%




Người thử tìm được ít nhất 3 khu chức năng

	

≥80%




Thời gian đi từ điểm trở về đến cổng

	

≤3 giây khi điều khiển chủ động




Thời gian tới công trình bất kỳ từ trung tâm

	

≤8 giây trong đường đi thông thường




Tỷ lệ người chơi gặp lỗi nghiêm trọng

	

0




Lượt thử nghiệm xác nhận không mất save

	

100%

Nếu mẫu nhỏ, các kết quả này chỉ dùng để quyết định sửa UX, không được diễn giải là bằng chứng thống kê về retention.

Quyết định mở sảnh mặc định thuộc về người phát triển. Claude không tự bật mặc định trước khi có phê duyệt.

VII. ART ASSET LIST — THANH HUYỀN TÔNG

Danh sách này dành riêng cho việc tạo hình ở một chat khác.

Tất cả kích thước bên dưới là kích thước hiển thị trong hệ tọa độ game 640×360, không phải kích thước bắt buộc của ảnh xuất gốc. Khi làm sprite sheet ở tỷ lệ nguồn khác, cần quy đổi nhất quán với pipeline hiện tại.

Kích thước hình vẽ không đồng nghĩa kích thước va chạm. Claude phải xác định hitbox và vị trí chân riêng.

A. Công trình chính

ID

	

Asset

	

Cỡ trong game

	

Yêu cầu visual

	

Ưu tiên




B01

	

Cổng Bí Cảnh

	

80×96 px

	

Cổng đá cổ, phù văn lam tím, trung tâm có không gian phát sáng; ưu tiên tận dụng cổng hiện có

	

P0




B02

	

Tụ Linh Pháp Đài

	

128×128 px

	

Pháp trận trên nền đá tròn, hoa văn ngũ hành, khoảng trống giữa để ngồi thiền và độ kiếp

	

P0




B03

	

Luyện Khí Phường

	

96×96 px

	

Nhà lò rèn cổ trang, mái xanh, lò lửa cam, ống khói và đe rèn

	

P1




B04

	

Truyền Thừa Các

	

96×96 px

	

Điện các nhỏ với mái cong, phù văn vàng, cửa có ánh sáng linh khí

	

P1




B05

	

Đan Dược Phòng

	

80×80 px

	

Nhà gỗ cổ, bình đan, lò luyện đan, bảng hiệu có họa tiết hồ lô

	

P1




B06

	

Công Đức Đường

	

80×80 px

	

Điện nhỏ, bảng công đức, cuộn thư và biểu tượng huy chương

	

P1




B07

	

Tàng Kinh Các

	

96×96 px

	

Tòa nhà thư viện cổ, mái hai tầng, cuộn thư, biểu tượng kinh văn

	

P1




B08

	

Bia Truyền Thừa

	

32×48 px

	

Bia đá cổ có ký tự phát sáng, ưu tiên tận dụng sprite M7

	

P1

Lưu ý: B01, B02 và B08 đã có phiên bản hiện hữu. Chỉ vẽ lại nếu chúng không thể hòa hợp với phong cách mới. Không nên tự tạo asset trùng khi chưa kiểm tra tài nguyên đang có.

B. Nền đất, đường đi và kiến trúc phụ

ID

	

Asset

	

Cỡ mỗi sprite

	

Số biến thể đề xuất




T01

	

Đá lát sân xám xanh

	

16×16 px

	

6




T02

	

Đá lát có vết nứt/rêu

	

16×16 px

	

4




T03

	

Đường đi bằng đá

	

16×16 px

	

8–12, gồm cạnh và góc




T04

	

Cỏ sân tông môn

	

16×16 px

	

4




T05

	

Bậc thềm đá

	

16×16 px

	

3




T06

	

Viền sân và bó vỉa

	

16×16 px

	

6–8




T07

	

Tường đá thấp

	

16×32 px

	

3




T08

	

Hàng rào gỗ hoặc đá

	

32×32 px

	

4




T09

	

Cột đèn linh khí

	

16×32 px

	

2




T10

	

Cổng chính trang trí phía nam

	

96×80 px

	

1, có thể làm sau

Các tile nền phải ghép được mà không tạo đường nối bất thường. Nên thiết kế theo một bộ palette chung, thay vì mỗi công trình sử dụng một bảng màu riêng.

C. Vật thể trang trí

ID

	

Asset

	

Cỡ trong game

	

Số lượng mẫu




P01

	

Cờ Thanh Huyền Tông

	

16×48 px

	

2




P02

	

Biển tên công trình

	

32×32 px

	

1 mẫu khung + 8 ký hiệu




P03

	

Đèn lồng linh khí

	

16×32 px

	

2




P04

	

Chậu linh thảo

	

16×16 px

	

3




P05

	

Bàn đá/ghế đá

	

32×16 px

	

2




P06

	

Giá cuộn thư

	

32×32 px

	

1




P07

	

Lò luyện đan nhỏ

	

32×32 px

	

1




P08

	

Đe và dụng cụ rèn

	

32×32 px

	

1




P09

	

Bình đan dược

	

16×16 px

	

3




P10

	

Cọc luyện kiếm

	

24×32 px

	

1, tùy chọn

Có thể tái sử dụng cây, đá, hoa và các vật trang trí đang có trong dự án. Không cần vẽ lại toàn bộ rừng.

D. NPC tùy chọn

ID

	

Nhân vật

	

Cỡ trong game

	

Animation




N01

	

Luyện Khí Trưởng Lão

	

24×32 px

	

Idle 2–4 frame




N02

	

Đan Sư

	

24×32 px

	

Idle 2–4 frame

Hai NPC này không nằm trong điều kiện nghiệm thu bắt buộc của M8.

Nếu làm animation bốn hướng trong tương lai, chuẩn bị sprite sheet theo từng hướng, với số frame thống nhất.

E. Icon và phản hồi tương tác

ID

	

Asset

	

Cỡ trong game




U01

	

Ký hiệu tương tác E

	

16×16 px




U02

	

Biểu tượng bàn tay cho cảm ứng

	

16×16 px




U03

	

Mũi tên chỉ đường

	

16×16 px




U04

	

Biểu tượng đủ điều kiện đột phá

	

16×16 px




U05

	

Biểu tượng có vé Cơ Duyên

	

16×16 px




U06

	

Biểu tượng truyện mới

	

16×16 px




U07

	

Biểu tượng thành tựu mới

	

16×16 px




U08

	

Biểu tượng có thể rèn đồ

	

16×16 px

Đây là kích thước artwork pixel. Vùng chạm cảm ứng của nút tương tác phải lớn hơn nhiều, tối thiểu 44×44 CSS pixel.

F. Quy tắc giao asset cho người vẽ

Để tránh trường hợp tạo asset đẹp nhưng Claude không tích hợp đúng, mình đề xuất khóa quy chuẩn:

Pixel art sắc nét, không blur, không anti-aliasing mềm.

Viền tối thống nhất, khuyến nghị khoảng một pixel nguồn.

Cùng hướng nhìn top-down hơi chếch để nhìn thấy mặt tiền và mái công trình.

Không trộn công trình vẽ perspective quá mạnh với bản đồ top-down.

Bảng màu chính: xanh ngọc, xanh đá, nâu gỗ, vàng đồng, xám đá.

Có nền trong suốt; nếu dùng nền magenta thuần khi tạo sheet thì phải được xử lý sạch trước khi đưa vào game.

Mỗi sprite có điểm neo chân rõ ràng.

Các công trình phải có cửa hoặc vị trí đứng tương tác dễ nhận biết.

Tách animation/ánh sáng khi cần, không tạo quá nhiều lớp phát sáng độc lập.

Đặt ID asset và tên file thống nhất với bảng trên.

Tương thích quy trình làm sạch sprite và atlas hiện có của dự án.

Thứ tự vẽ nên là: nền sân và đường đi → Luyện Khí Phường/Truyền Thừa Các → Đan Dược Phòng → Công Đức Đường/Tàng Kinh Các → vật trang trí → icon thông báo → NPC nếu còn thời gian.

Không cần chờ có đủ toàn bộ art mới triển khai M8-A. Placeholder là chấp nhận được ở giai đoạn đầu.

VIII. Thứ tự làm thực tế và những việc chưa nên làm

Mình đề xuất ưu tiên theo chuỗi:

M8-01 → M8-02 → M8-03 → M8-04 → M8-05 → GATE A

Sau đó mỗi công trình là một task độc lập. Claude có thể làm M8-07 trước M8-06 nếu asset Luyện Khí Phường đã sẵn sàng, miễn là không vượt qua GATE khi chưa đủ điều kiện.

Khi tất cả công trình hoạt động, mới thực hiện art pass và HUD hoàn chỉnh.

Những việc M8 không được tự mở rộng

Không thêm tông môn thứ hai.

Không tạo bản đồ nội thất riêng cho từng tòa nhà.

Không phát triển NPC có nhiệm vụ hoặc hội thoại phân nhánh.

Không thêm hệ thống tông môn online.

Không thêm công pháp, gacha pool, boss, biome mới.

Không đổi renderer sang Phaser, PixiJS hay 3D.

Không thay đổi khó dễ của thiên kiếp hoặc cân bằng bí cảnh khi chưa có yêu cầu riêng.

Không thay đổi schema save nếu không cần thiết và chưa có migration.

Không đánh dấu các GATE playtest đã đạt khi chưa có kiểm chứng người thật.

IX. Ba giả thuyết cần kiểm chứng

Mã

	

Giả thuyết

	

Cách xác minh




H8-01

	

Thông báo và biển hiệu giúp người chơi tìm, sử dụng công trình tốt hơn

	

Số lần tìm sai, thời gian tìm khu, tỷ lệ truy cập




H8-02

	

Onboarding theo vị trí giúp người mới hiểu game hơn

	

Quan sát người mới tìm cổng, vào run và dùng meta không cần trợ giúp




H8-03

	

Tông môn có chiều sâu visual khiến người chơi cảm thấy thế giới sống động hơn mà không gây khó chịu

	

Phản hồi so sánh, mức dễ đọc, FPS, thời gian thao tác giữa hai chế độ

Mình muốn bổ sung thêm một chỉ số đặc biệt: thời gian từ lúc người chơi nhận thưởng sau run đến lúc họ bắt đầu run tiếp theo.

Nếu sảnh mới khiến thời gian này tăng mạnh nhưng người chơi không cảm thấy thú vị hơn, nghĩa là chúng ta đã đánh đổi tốc độ gameplay để lấy phần trang trí.

Đó là điều cần phát hiện sớm.

X. Hướng dẫn bắt đầu cho Claude Code

Bạn có thể sao chép đoạn yêu cầu dưới đây cùng toàn bộ đặc tả M8 ở trên.

Writing

Bạn đang tiếp tục phát triển dự án Tu Tiên Lộ hiện hữu.

Đọc đầy đủ CLAUDE.md, HANDOFF.md, GDD_TU_TIEN_LO.md, TASKS_TU_TIEN_LO.md, TEST_REPORT.md và đặc tả M8 — Thanh Huyền Tông được cung cấp.

Mục tiêu M8 là chuyển động phủ hiện tại thành sảnh tông môn 2D pixel top-down, nơi người chơi đi tới từng công trình và nhấn E hoặc nút tương tác để sử dụng các chức năng hiện có.

Quy tắc bắt buộc:

Không viết lại gameplay.

Không xóa hoặc reset save.

Không thay đổi hệ thống cảnh giới, tọa thiền, thiên kiếp, bí cảnh, gacha và trang bị.

Giữ renderer và kiến trúc hiện tại.

Tạo cờ FEATURES.sectHub để có thể quay lại sảnh cũ.

Tái sử dụng các hàm nghiệp vụ, không nhân đôi logic chức năng.

Mỗi công trình có thể triển khai và nghiệm thu riêng.

Không tự thêm nội dung ngoài M8.

Không tự đánh dấu GATE đạt khi thiếu browser test, thiết bị thật hoặc playtest theo yêu cầu.

Bắt đầu bằng M8-01.

Hãy audit code, xác nhận 10 chức năng và vị trí các module liên quan, chạy test, tạo checkpoint rồi báo cáo phương án triển khai M8-02 và M8-03.

Không tự làm hàng loạt task trước khi có nghiệm thu GATE M8-A.

Sau mỗi task, báo cáo: các file thay đổi, chức năng đã chạy, test PASS/FAIL, kiểm tra trình duyệt, các vấn đề còn tồn tại và đề xuất task tiếp theo.

XI. Đánh giá cuối cùng

Mình đánh giá việc xây dựng Thanh Huyền Tông là một bước phát triển hợp lý cho Tu Tiên Lộ, đặc biệt nếu bạn muốn game có cảm giác của một thế giới tu tiên thực sự, thay vì chỉ là một giao diện chọn màn chơi.

Tuy nhiên, sảnh này nên được xem là lớp trải nghiệm gắn kết các hệ thống đã có, không phải một hệ thống gameplay lớn mới.

Với quy mô hiện tại, mình khuyên chốt 8 khu chức năng, 10 hành động, một bản đồ, một hệ thống tương tác, không nội thất và chưa cần NPC phức tạp.

Như vậy, Claude Code có thể triển khai từng phần, bạn có thể tạo asset theo từng đợt, và mỗi giai đoạn đều có khả năng quay lại sảnh cũ nếu gặp vấn đề.

Ưu tiên quan trọng nhất của M8 không phải số lượng công trình hay mức độ trang trí, mà là tạo ra một tông môn đẹp, dễ nhớ, dễ sử dụng và không làm gián đoạn vòng chơi roguelite mà chúng ta đã xây dựng.

ChatGPT can make mistakes. Check important info.
Latest response




Thinking effort
High