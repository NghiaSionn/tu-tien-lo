# Tu Tiên Lộ

Game web pixel 2D top-down, tu tiên + roguelite. HTML + JS module thuần, không dependency.

## Chạy game

```bash
python tools/serve.py
```

Mở http://localhost:8123. Server này tắt cache để trình duyệt luôn tải code mới (`python -m http.server 8123` vẫn chạy được nhưng dễ dính bản cũ trong cache).

## Chạy test

```bash
npm test
```

(tương đương `node --test tests/`, cần Node 18+).

## Mô phỏng cân bằng

```bash
node tools/sim.mjs
```

## Tài liệu

- `HANDOFF.md`: trạng thái hiện tại.
- `GDD_TU_TIEN_LO.md`: thiết kế mục tiêu.
- `TASKS_TU_TIEN_LO.md`: backlog và nhật ký triển khai.
- `TEST_REPORT.md`: kết quả kiểm thử.
- `docs/adr/`: các quyết định kỹ thuật.
