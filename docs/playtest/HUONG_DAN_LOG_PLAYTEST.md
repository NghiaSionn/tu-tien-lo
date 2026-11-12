# Hướng dẫn log playtest (M7-04)

## Cho người chơi thử
1. Mở game → **Cài đặt** (góc phải trên, ở động phủ) → mục **Ghi playtest (tùy chọn)** → tích **Bật ghi playtest**.
2. Chơi bình thường.
3. Khi xong: Cài đặt → **Xuất log (.json)** → gửi file cho người phát triển (Zalo, Discord, email… tùy bạn).
4. Góp ý: **Sao chép tóm tắt góp ý** (chép sẵn cảnh giới, số lượt, mã thử và 3 câu hỏi), dán vào tin nhắn hoặc **Mở trang góp ý** (GitHub Issues — cần tài khoản GitHub).

Log mặc định **tắt**, chỉ nằm trong trình duyệt của bạn (khóa `tutien_playtest_v1`), **không tự gửi đi đâu**, không có tên/email/IP/clipboard. Tắt lúc nào cũng được; **Xóa log** không ảnh hưởng tiến độ chơi.

## Dữ liệu ghi

Mỗi sự kiện: `v` (schema), `build`, `tid` (mã thử ngẫu nhiên tạo khi bật lần đầu), `session` (phiên thứ mấy), `day` (ngày thứ mấy kể từ lúc bật, không phải ngày giờ thật), `t` (ms từ đầu phiên), `plat` (touch/desktop), `type`, và với sự kiện trong bí cảnh: `runId`, `seed`.

| type | trường thêm |
|---|---|
| session_start | sessionNo, day, realm, runs |
| run_start | skill, difficulty, realm, runInSession |
| second_run_start | runInSession (=2) |
| first_card, card_picked | card, cardType, level, time |
| evolution | evo, time |
| miniboss_result | result (killed / died / abandoned), time |
| run_end | outcome, time, level, kills, cause (nguồn sát thương lớn nhất khi thua), evolutions, difficulty |
| meta_action | action (breakthrough, trib_start, trib_win, trib_fail, pill_use, pill_buy, craft, upgrade, equip, unequip, gacha_pull, gacha_shop), ok, realm |
| session_end | duration (giây), runsInSession — ghi khi đóng/rời trang (pagehide); trình duyệt di động có thể không kịp ghi |

Trường ngoài danh sách trắng bị bỏ khi ghi. Giới hạn 3000 sự kiện; quá thì bỏ sự kiện cũ nhất (số đã bỏ ghi ở `dropped`). Bộ nhớ trình duyệt đầy cũng bỏ bớt sự kiện cũ, không làm lỗi game.

## Phân tích

```bash
node tools/playtest_funnel.mjs docs/playtest/logs/
```

In funnel: phiên → vào bí cảnh → chọn thẻ đầu → hạ mini boss → thắng boss cuối → tự vào lượt 2, nguyên nhân thua, ngày quay lại.

## Hạn chế
- **D1/D7 không đo được đầy đủ:** không có server, nên chỉ biết người chơi quay lại nếu họ xuất log **sau** các lần chơi sau (trường `day`). Người không xuất lại = không biết, không phải "không quay lại".
- Log nằm theo trình duyệt + thiết bị; đổi máy/xóa dữ liệu trình duyệt/chế độ ẩn danh = mã thử mới.
- `session_end` có thể thiếu trên di động (trang bị hệ điều hành đóng).
- Mẫu playtest nhỏ (8–12 người): chỉ dùng để tìm điểm ma sát, không suy ra tỉ lệ giữ chân.

## Kiểm thử M7-04 (13/11/2026, browser pane, 127.0.0.1:8123)

| Kiểm tra | Kết quả |
|---|---|
| Mặc định: không có khóa `tutien_playtest_v1` | PASS |
| Bật trong Cài đặt → session_start, hiện mã thử + số sự kiện | PASS — ảnh `m7_04/cai_dat_playtest.jpg` |
| Một run bằng autopilot: run_start, first_card ×1, card_picked, evolution, miniboss_result=killed ×1 | PASS |
| Rời run → run_end ×1; lượt 2 → second_run_start | PASS |
| Quay gacha → meta_action gacha_pull ok | PASS |
| Tải lại → session_end (356 s, 2 lượt) + session_start #2, log còn nguyên | PASS |
| Tắt → mua đan không sinh sự kiện | PASS |
| Xóa log → 0 sự kiện, vẫn tắt, save v2 còn, cảnh giới không đổi | PASS (hộp xác nhận được giả lập bằng console) |
| Sao chép tóm tắt góp ý | PASS — đã ghi vào clipboard |
| Nút Xuất log .json/.csv trong trình duyệt | NOT VERIFIED — không bấm để tránh tải file về máy; nội dung xuất có test tự động |
| `npm test` | 158/158 PASS (+8 test log, +1 test cú pháp toàn bộ src) |
