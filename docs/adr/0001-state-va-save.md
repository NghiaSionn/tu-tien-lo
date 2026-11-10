# ADR 0001 — Tách metaState / runState và save v2

Ngày: 2026-11-10. Trạng thái: đã áp dụng.

## Bối cảnh

v0.1 lưu một object phẳng `{ L, tuvi, hp, stones, pills, x, y }` vào `tutien_save_v1`. GDD yêu cầu tiến trình vĩnh viễn (cảnh giới, tài nguyên, mở khóa) tách hẳn khỏi tiến trình trong lượt (cấp chiến đấu, thẻ), và tuyệt đối không mất save cũ.

## Quyết định

- **metaState** (`src/persistence/save.js`, `defaultMeta`): `realmLevel, cultivationXp, hp, linhThach, pills, hubPos, unlocks, settings, stats`. Chỉ phần này được lưu.
- **runState** (`src/systems/run.js`, `createRun`): tạo mới mỗi lượt, **không bao giờ lưu**. Tải lại trang giữa run = mất lượt đó, quay về động phủ, meta còn nguyên. Lý do: chưa có phần thưởng run (M2), lưu giữa run mở ra nhiều đường nhân bản phần thưởng. Khi M2-03 có phần thưởng, phần thưởng sẽ commit một lần theo trạng thái `REWARD_PENDING -> REWARDED`.
- **viewState** nằm trong `src/main.js`: `HUB | PREPARE | RUN | CARD_DRAFT | RESULTS | SETTINGS` + cờ `paused`.
- Khóa localStorage:
  - `tutien_save_v1`: chỉ đọc, không bao giờ ghi/xóa.
  - `tutien_save_v1_backup`: chép nguyên văn v1 một lần khi migrate.
  - `tutien_save_v2`: `{ version: 2, savedAt, meta }`.
  - `tutien_save_v2_bak`: bản v2 tốt liền trước, xoay mỗi lần lưu.
  - `tutien_save_v2_corrupt`: bản v2 hỏng gần nhất, giữ để cứu.
- Thứ tự đọc: v2 → v2_bak → v1 (migrate) → mới. Migrate có xác minh: ghi v2 rồi đọc lại và so sánh.
- Mọi trường đi qua `sanitizeMeta`: dựng object mới từ trường biết trước, kẹp số về khoảng hợp lệ, vị trí không đứng được thì về tụ linh trận.
- Có xuất/nhập JSON trong Cài đặt (nhận cả định dạng v1).

## Hệ quả

- Quay về code v0.1 (`git checkout baseline-v0.1`) vẫn chạy với `tutien_save_v1`, nhưng mất mọi tiến độ kể từ lúc migrate (v0.1 không đọc v2).
- localStorage sửa được bằng console: không phải chống gian lận.
