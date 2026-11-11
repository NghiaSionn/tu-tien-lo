# Nhật ký cân bằng M2-04 (2026-11-11, cập nhật 2026-11-12)

## Playtest trong trình duyệt (2026-11-12)

**Cách chơi:** trang game thật trên `127.0.0.1:8123/?loop=timer` (`?loop=timer` chỉ đổi cái gọi vòng lặp sang `setInterval`,
vì môi trường hãm `requestAnimationFrame` còn 2–5 khung/giây; logic/dt/input không đổi). Các bước luồng (vào cổng E, chọn công
pháp, nhận thưởng Enter, cài đặt bằng chuột) bấm bằng **phím/chuột thật**. Di chuyển + chọn thẻ trong trận do
`tools/autopilot.js` **phát sự kiện bàn phím** (WASD, phím số) qua đúng đường input của game; autopilot chỉ đọc trạng thái,
không sửa state. Đây là bot điều khiển bằng phím, **không phải người chơi thật**.

| # | Build (khởi đầu) | Kết quả | Thời gian | Cấp | Lang Vương | Tiến hóa | Lý do / ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | Kiếm + Lôi (Kiếm Khí) | **THẮNG** | 6:39 | 32 | hạ trước 4:01 | Lôi Đình Vạn Kiếm, Lôi Cương Hộ Thể | +382💎 +180✨ +15🔩 +2🎫 (lần đầu); vùng hắc diễm bị **tán cây che** → đã thêm lớp viền cảnh báo trên cây |
| 2 | Phi Kiếm + Hỏa (Hỏa Cầu), **bật Giảm hiệu ứng** | THUA | 6:35 | 31 | hạ | Liệt Diễm, Hỏa Long Quyển | chết vì "vùng" của Yêu Vương (112 sát thương) — tách nhãn thì là **đập đất R64** → giảm còn R48, gồng 1,25 s. Cảnh báo vẫn rõ khi giảm hiệu ứng (`docs/m2_04_giam_hieu_ung_lang_vuong.jpg`); **thanh máu boss che boss** ở mép dưới → làm mờ |
| 3 | Hỏa + Phong (Hỏa Cầu) | **THẮNG** | 8:39 | 35 | hạ | Hỏa Long Quyển | trận boss 2:39 (kịp cuồng nộ) — build đánh boss chậm nhất |
| 4 | Lôi + Thể (Lôi Kích) | THUA | 4:29 | 22 | chết khi đánh | Lôi Cương Hộ Thể | đầu run rất yếu (2:04 mới cấp 7, 9 máu); chết vì đuổi vây + đòn lao Lang Vương |
| 5 | — | chưa chơi | | | | | trang bị ẩn (cửa sổ không hiển thị) nên game tự dừng |

Mỗi lượt: hub → cổng → chọn công pháp → chọn thẻ → (tiến hóa) → boss → bảng kết quả → nhận thưởng → hub → lượt sau.
Không sửa state bằng console (console chỉ nạp autopilot và đọc trạng thái). Lưu/tải lại giữa các lượt ổn.

**Cảm giác chơi (ghi theo quan sát màn hình + số liệu):** nhịp 6–8 phút vừa; đợt vây và Hỏa Hồ lao tạo áp lực rõ; Lang Vương
đọc được; Yêu Vương là điểm khó nhất, cảnh báo đọc được nhưng dễ bị che (cây, thanh máu) — đã sửa hai chỗ đó. Lôi + Thể đầu run
yếu, Hỏa + Phong đánh boss chậm.


## Hạn chế — đọc trước

- **Không có playtest của người thật** trong M2-04. Trình duyệt của phiên làm việc chỉ chạy 2–5 khung/giây (đo bằng
  `requestAnimationFrame`, cả ở động phủ, không có long task) nên không chơi tay trọn một run 6–8 phút được.
- Mọi số liệu dưới đây là **bot mô phỏng** (`tools/sim.mjs`) và **bia đo DPS** (`tools/dps.mjs`), chạy đúng code game
  (không giao diện). Bot chọn thẻ theo danh sách ưu tiên của build, né quái, nhặt chiến ý; bản mới **biết né cảnh báo**
  (rời đường lao, vùng nổ, đạn đang bay). Bot không biết dùng địa hình, không chủ động áp sát, không ưu tiên đánh boss.
- Lượt chơi tay cuối cùng (M2-01, khởi đầu Kiếm Khí, tới 3:07, cấp 15) là bằng chứng người thật gần nhất.

Lệnh tái hiện:

```
node tools/sim.mjs --summary 0 12          # bot biết né, cảnh giới 0
NAIVE=1 node tools/sim.mjs --summary 0 8   # bot cũ không né cảnh báo
node tools/sim.mjs --summary 9 8           # cảnh giới 9 (Trúc Cơ)
node tools/dps.mjs                         # sát thương/giây từng công pháp lên bia đứng yên
```

## Trước khi chỉnh (sau M2-03)

| Bot | Kiếm+Lôi | Phi Kiếm+Hỏa | Hỏa+Phong | Lôi+Thể |
|---|---|---|---|---|
| Không né cảnh báo (8 seed) | thắng 1/8 | 0/8 | 0/8 | 0/8 |
| Biết né cảnh báo (8 seed) | 4/8 | 1/8 | 1/8 | 0/8 |

Run kéo dài 8:30–10:00. Chết nhiều nhất: đòn lao Lang Vương, vùng hắc diễm, băng tiễn.

## Phát hiện

1. **Lỗi: đạn nhiều tia trượt khi chỉ có 1 mục tiêu.** Kiếm Khí cấp 3+ (2–3 lưỡi) và Hỏa Cầu cấp 4+ (2 cầu) tỏa quạt
   với góc cố định; ở 60 px lệch ngang 9–13 px > vùng trúng 8–9 px. Đánh boss chỉ trúng 1/3 lưỡi Kiếm Khí và **0/2 Hỏa
   Cầu**. Sửa: góc tỏa thu hẹp theo khoảng cách (lệch ≤ 5 px tại mục tiêu), có test.
2. **Phong Nhận bắn theo hướng đi** → khi vừa chạy vừa đánh thì bắn ngược ra sau. Đổi: ngắm yêu thú gần nhất.
3. **Phi Kiếm Trận nạp phi kiếm lần lượt** nên cấp 5 chỉ 1,3 lần công/giây (Kiếm Khí 6,6). Rút thời gian nạp.
4. Hỏa Luân / Hỏa Long Quyển tầm quá gần cho lối chơi thả diều.
5. Bot cũ đứng yên khi vùng nổ rơi đúng tâm (lỗi bot, không phải game) — đã sửa trong bot.

## Đã chỉnh (đều ở dữ liệu/config)

| Hạng mục | Trước | Sau |
|---|---|---|
| Kiếm Khí cấp 5 | cd 0,65, ×1,4, 3 lưỡi | cd 0,72, ×1,2 |
| Phi Kiếm Trận nạp/phi kiếm | 2,0 → 1,4 s | 1,0 → 0,5 s; sát thương 1,1 → 1,6 |
| Lôi Kích | ×1,6–2,0, cd 1,3–1,25 | ×2,0–3,0, cd 1,2–1,0 |
| Hỏa Luân bán kính | 26–40 | 30–50 |
| Liệt Diễm Kiếm Trận | nạp 1,4, ×1,4 | nạp 0,42, ×1,8 |
| Lôi Đình Vạn Kiếm | cd 0,6, ×1,3 | cd 0,7, ×1,25 |
| Hỏa Long Quyển | 2 lốc, quỹ đạo 54, ×0,45 | 3 lốc, quỹ đạo 66, hút 58, ×1,0 |
| Lôi Cương Hộ Thể xung | 3 s, ×1,2 | 2,5 s, ×2,0 |
| Nhịp run | Lang Vương 4:00, Yêu Vương 7:00, 7 đợt tới 6:50 | **3:30 / 6:00**, 6 đợt tới 5:30, tinh anh từ 2:45 |
| Lang Vương lao | gồng 0,65 s, ×1,6 | gồng 0,75 s, ×1,3, nghỉ 0,35 s |
| Yêu Vương | máu ×110, hắc diễm ×2,0, pha 2: 5 vùng | máu ×70, ×1,6, pha 2: 4 vùng |
| Bảng kết quả | — | thêm **Bước tiếp theo** (mục tiêu lần sau, gợi ý mua đan) |

DPS sau chỉnh (lần công/giây, cấp 5, bia đơn / cụm 8): Kiếm Khí 4,8/9,7 · Phi Kiếm Trận 3,3/3,3 · Hỏa Cầu 4,0/26 ·
Lôi Kích 3,0/17 · Liệt Diễm ★ 7,1/9,4 · Lôi Đình ★ 5,4/21 · Hỏa Long ★ 2,4/16,7 · Lôi Cương ★ 0,8/3,2 (phòng thủ).

## Sau khi chỉnh

Bot biết né cảnh báo, cảnh giới 0, 12 seed/build:

| Build | Thắng | Hạ Lang Vương | Tiến hóa | Thắng lúc (trung vị) | Chết vì (nhiều nhất) |
|---|---|---|---|---|---|
| Kiếm + Lôi | 10/12 | 12/12 | 12/12 | 7:01 | vùng hắc diễm |
| Phi Kiếm + Hỏa | 7/12 | 12/12 | 12/12 | 6:56 | vùng hắc diễm |
| Hỏa + Phong | 4/12 | 11/12 | 12/12 | 8:04 | vùng hắc diễm, tinh anh |
| Lôi + Thể | 8/12 | 12/12 | 10/12 | 7:44 | vùng hắc diễm |

Bot không né cảnh báo (8 seed): 3/8 · 1/8 · 0/8 · 2/8 — run vẫn thua được khi chơi ẩu.
Cảnh giới 9 (8 seed): 7/8 · 8/8 · 7/8 · 8/8 — tu luyện ngoài động phủ làm bí cảnh dễ đi rõ (đúng ý đồ meta; có thể
quá dễ, cần độ khó bí cảnh theo cảnh giới ở M3/M4).

Thưởng trung vị: thua ~170💎, thắng ~390💎 (+2🎫 lần đầu), cảnh giới 9 ~730💎.

## Nhật ký 12 lượt (bot biết né, cảnh giới 0)

| # | Build | Seed | Kết quả | Thời gian | Cấp | Lang Vương | Tiến hóa | Lý do | Công pháp cuối |
|---|---|---|---|---|---|---|---|---|---|
| 1 | kiem_loi | 1 | WIN | 7:03 | 33 | 4:17 | loi_dinh_van_kiem 1:42, loi_cuong_ho_the 4:37 | hạ Yêu Vương lúc 7:03 | loi_dinh_van_kiem:5 thunder_strike:5 loi_cuong_ho_the:5 sword_array:5 |
| 2 | kiem_loi | 2 | WIN | 6:24 | 32 | 3:56 | loi_dinh_van_kiem 2:11, liet_diem_kiem_tran 6:00 | hạ Yêu Vương lúc 6:24 | loi_dinh_van_kiem:5 fire_orb:2 thunder_strike:5 liet_diem_kiem_tran:5 |
| 3 | kiem_loi | 3 | WIN | 6:49 | 33 | 4:14 | loi_dinh_van_kiem 1:37 | hạ Yêu Vương lúc 6:49 | loi_dinh_van_kiem:5 fire_orb:5 thunder_strike:5 thunder_field:3 |
| 4 | phi_kiem_hoa | 1 | LOSE | 6:51 | 28 | 4:02 | liet_diem_kiem_tran 2:32 | chết, đòn nặng nhất: vùng hắc diễm | fire_orb:5 fire_ring:4 liet_diem_kiem_tran:5 thunder_strike:3 |
| 5 | phi_kiem_hoa | 2 | WIN | 6:51 | 32 | 3:55 | liet_diem_kiem_tran 1:46, loi_cuong_ho_the 5:24 | hạ Yêu Vương lúc 6:51 | fire_orb:5 liet_diem_kiem_tran:5 loi_cuong_ho_the:5 thunder_strike:2 |
| 6 | phi_kiem_hoa | 3 | WIN | 7:07 | 33 | 3:59 | liet_diem_kiem_tran 1:39 | hạ Yêu Vương lúc 7:07 | fire_orb:5 liet_diem_kiem_tran:5 fire_ring:4 thunder_strike:4 |
| 7 | hoa_phong | 1 | WIN | 8:23 | 35 | 4:14 | hoa_long_quyen 2:17 | hạ Yêu Vương lúc 8:23 | fire_orb:5 hoa_long_quyen:5 sword_qi:5 wind_blade:5 |
| 8 | hoa_phong | 2 | LOSE | 6:19 | 30 | 4:49 | hoa_long_quyen 2:30 | chết, đòn nặng nhất: tinh anh | fire_orb:5 hoa_long_quyen:5 wind_blade:3 body_aura:4 |
| 9 | hoa_phong | 3 | LOSE | 6:24 | 31 | 4:28 | hoa_long_quyen 2:24 | chết, đòn nặng nhất: vùng hắc diễm | fire_orb:5 hoa_long_quyen:5 wind_blade:4 thunder_field:5 |
| 10 | loi_the | 1 | WIN | 8:41 | 34 | 4:43 | loi_cuong_ho_the 1:36 | hạ Yêu Vương lúc 8:41 | thunder_strike:5 loi_cuong_ho_the:5 thunder_field:5 sword_array:5 |
| 11 | loi_the | 2 | WIN | 7:32 | 34 | 4:24 | loi_dinh_van_kiem 3:56 | hạ Yêu Vương lúc 7:32 | thunder_strike:5 loi_dinh_van_kiem:5 thunder_field:5 fire_ring:5 |
| 12 | loi_the | 3 | WIN | 7:44 | 33 | 4:51 | loi_cuong_ho_the 1:30 | hạ Yêu Vương lúc 7:44 | thunder_strike:5 loi_cuong_ho_the:5 sword_array:3 thunder_field:5 |

## Còn mở

- Kiếm + Lôi vẫn mạnh nhất (10/12) nhưng không tuyệt đối (thua 2/12; không né cảnh báo chỉ 3/8). Hỏa + Phong yếu nhất (4/12).
- Vùng hắc diễm của Yêu Vương là nguồn chết số 1 của bot ở mọi build; cần người thật thử xem có quá khó đọc khi đông quái không.
- Chưa mở run 12–15 phút (task cho phép khi nhịp 6–8 phút ổn — cần playtest người thật trước).
- Cảnh giới cao làm bí cảnh quá dễ → cần bí cảnh khó hơn theo cảnh giới (M3/M4).
