# ADR 0006 — Phần thưởng run được ghi "chờ nhận" rồi nhận đúng một lần

Ngày: 2026-11-11. Trạng thái: đã làm (M2-03).

## Bối cảnh

Run không được lưu (ADR 0001). Nếu cộng thưởng thẳng vào meta lúc kết thúc run thì: tải lại trang trước khi lưu → mất thưởng;
cộng ở nút "Nhận" thì bấm nhiều lần / bấm + Enter có thể cộng trùng. Cần một luồng chịu được cả hai.

## Quyết định

Luồng: `RUNNING → WIN / LOSE / ABANDON / TIMEOUT → REWARD_PENDING → REWARDED → HUB` (`src/progression/rewards.js`).

1. Kết thúc run: tính thưởng thuần từ run (`computeRunReward`), ghi vào `meta.pendingReward` kèm `id` duy nhất của run
   (`run.uid`), **lưu ngay** (REWARD_PENDING).
2. Nhận (`claimReward`): cộng tài nguyên, đẩy `id` vào `meta.rewardLog` (giữ 30 id gần nhất), xóa `pendingReward` — cả ba
   trong **cùng một lần ghi save** (một `setItem`, nguyên tử). Gọi lại khi không còn pending → không làm gì.
3. Mở trang mà còn `pendingReward` (tải lại lúc đang ở bảng kết quả) → nhận ngay một lần, báo trong log.
4. `stageReward` từ chối id đã có trong `rewardLog` và không ghi đè pending của run khác.

Save vẫn **phiên bản 2**: chỉ thêm trường (`lingQi`, `craftMats`, `coDuyenTicket`, `firstClear`, `pendingReward`,
`rewardLog`); `sanitizeMeta` điền mặc định cho save cũ và kẹp giá trị sửa bậy. Không đụng `tutien_save_v1`.

## Hệ quả

- Bấm nhiều lần, tải lại giữa chừng, nạp lại bản `v2_bak` cũ đều không nhân đôi (có test).
- Thua/rời vẫn nhận theo tiến độ; thắng ×1,5 + vé Cơ Duyên; lần đầu hạ Yêu Vương thêm 1 vé. Số liệu ở `REWARD` (config).
- `localStorage` sửa được bằng console — đây không phải chống gian lận (GDD), chỉ chống lỗi.
- Linh khí và luyện liệu chưa có chỗ dùng (M3 tọa thiền đổi linh khí, M4 luyện khí); vé Cơ Duyên dành cho gacha
  bằng vé trong game (M6, không có tiền thật).
