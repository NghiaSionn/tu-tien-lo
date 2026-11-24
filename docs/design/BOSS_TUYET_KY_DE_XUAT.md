# Đề xuất chiêu boss + Tuyệt Kỹ miễn nhiễm (24/11/2026)

Nguồn: người phát triển chốt định hướng 24/11 — trận boss là màn KHÓ, rèn phản xạ, nhiều chiêu để né; pha 2 đổi kiểu
tấn công dồn dập hơn; có giai đoạn boss MIỄN NHIỄM theo mốc máu, người chơi phải né hết chuỗi chiêu mới được đánh.
Quyết định 24/11: bật bộ chiêu V2 (`bossPatternsV2`) làm nền; miễn nhiễm theo mốc máu; hỏi ChatGPT trước (bản dưới là tóm tắt đề xuất của ChatGPT).

Ràng buộc: người chơi chỉ né bằng đi bộ 82 px/s (0,5 s = 41 px, 1 s = 82 px), hitbox 4 px, bất tử 0,5 s sau trúng đòn.
Khó vì đọc chiêu + chọn vị trí, KHÔNG khó vì đòn không thể né bằng tốc độ hiện có.

## Lang Vương — boss săn đuổi áp sát

| Pha | Chiêu | Ghi chú |
|---|---|---|
| P1 (100–50 %) | Tam Liên Lang Xung, Lang Khiếu Triệu Bầy, Khiếu Xung, Liệt Trảo, Vồ Đầu Đàn (giữ) | lần lao 2–3 gồng 0,55 s; tối đa 2 sói con tấn công cùng lúc |
| P1 | **Lang Nha Liên Trảo** (mới) | 2 nhát quét trái/phải luân phiên, hở sau lưng/sườn; 0,7 s + 0,5 s |
| P2 (50–0 %) | Huyết Ảnh Tam Xung | 3 lần lao răng cưa, 0,65 s mỗi lần |
| P2 | Cuồng Nha Liên Kích | quạt trái → quạt phải → vồ trước mặt (0,7 → 0,55 → 0,8 s) |
| P2 | Huyết Nguyệt Trấn Địa | dậm đất, vòng sóng lan ra có khe hở (1,0 s) |
| P2 | Lang Vương Truy Mệnh | đánh dấu người chơi, áp sát rồi vồ chỗ đã khóa (0,85 s) |
| P2 | Huyết Trảo Phá Địa | 3 vệt nứt hình quạt nổ lần lượt, né vào khe (1,0 s) |
| P2 | Cuồng Lang Bạo Khiếu | hú, vòng nguy hiểm quanh boss (1,1 s) |

**Tuyệt Kỹ — Huyết Lang Hộ Thể** (70 / 40 / 15 %): 8 s → 10 s → 12 s, chuỗi lao → trảo → vồ → (trấn địa, phá địa, hú cuối).
Bắt đầu: hú ngắn + biểu tượng khiên đỏ trên thanh máu. Kết thúc: khiên vỡ, choáng 2–2,5 s, +25 % sát thương nhận.

## Ma Ảnh Yêu Vương — boss kiểm soát không gian

| Pha | Chiêu | Ghi chú |
|---|---|---|
| P1 | Vạn Ma Tán Đạn, Hắc Diễm Phần Địa, Ma Khí Chấn Địa, Lục Ma Lao Tù, Ma Ảnh Triệu Hoán (≤ 2), Ảnh Độn, Ma Quang Hoành Tảo, Thập Tự Hắc Liệt | Lao Tù và Thập Tự không cùng lúc |
| P2 | Huyết Lôi Thiên Phạt | 4 điểm sét tuần tự quanh người chơi (0,9 s) |
| P2 | Ma Lôi Bát Phương | 8 tia sét tỏa từ boss, có khe (1,0 s) |
| P2 | Nghịch Chuyển Ma Trận | vòng phù văn chia cung, sáng lần lượt rồi nổ (1,2 s) |
| P2 | Huyết Lôi Liên Tỏa | đường sét gấp khúc nối các điểm (1,0 s) |
| P2 | Ma Ảnh Phân Thân | 2 bóng giả, boss thật có lõi ngực đỏ; mỗi bóng bắn đợt đạn có khe (1,2 s) |
| P2 | Diệt Thế Ma Quang | quét tia 2 nhịp, có dừng giữa nhịp (1,4 s) |
| P2 | Huyết Lôi Thiên Võng | dải sét song song nổ thành sóng, bám hành lang trống (1,2 s) |

**Tuyệt Kỹ — Vạn Ma Phong Thiên** (70 / 40 / 15 %): 8 s (Thập Tự → Hắc Diễm → đạn tỏa) → 10 s (Thiên Phạt → Ma Trận → Hoành Tảo)
→ 12 s (Thiên Võng → Ma Trận → Thiên Phạt + đạn có khe → Ma Quang kết liễu). Kết thúc: lõi ngực nứt, choáng 2,5–3 s, +25 %.

## Quy tắc chống bất công

- Mọi đòn có đường thoát liên tục từ vị trí người chơi lúc bắt đầu cảnh báo; hành lang an toàn ≥ 20–28 px.
- Nghỉ 0,3–0,6 s không có sát thương mới giữa các đòn nặng; P1 tối đa 2 nguồn nguy hiểm cùng lúc, P2 tối đa 3.
- Khóa mục tiêu trước khi kích hoạt, không đổi dấu ở giây cuối; không dựa vào bất tử 0,5 s để sống.
- Khiên: không hồi máu; không bật mốc khiên chồng khi chuỗi đang chạy; qua nhiều mốc trong một đòn thì xếp hàng đợi.
- 70 % dùng bộ chiêu P1; 50 % cutscene pha 2 (không tuyệt kỹ); 40 % và 15 % dùng bộ chiêu P2.
- Kiểm bằng mô phỏng vị trí + đường chạy hợp lệ (đặc biệt quét 180°, đường sét, vòng nổ liên tiếp).
- ChatGPT khuyên làm thử Tuyệt Kỹ 70 % cho mỗi boss trước, đo tỉ lệ né, rồi mới làm 40 % / 15 %.
