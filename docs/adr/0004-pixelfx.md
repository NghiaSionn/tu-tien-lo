# ADR 0004 — Dùng pixelfx làm kho hiệu ứng phụ

Ngày: 2026-11-11. Trạng thái: thử nghiệm (1 hiệu ứng: cổng bí cảnh).

## Bối cảnh

[pixelfx](https://github.com/patch-gg/pixelfx) (MIT) có 244 hiệu ứng pixel art viết bằng code. Cùng mô hình lớp màu + lớp sáng như beanfx, xuất được sprite sheet Aseprite JSON.

Hạn chế khi ghép vào game:
- Vẽ cho nhân vật 24×38 px trên màn 320×180; nhân vật của ta 12×25 px trên 480×270 nên nhiều hiệu ứng to quá.
- Hiệu ứng trạng thái vẽ dính lên hình nhân vật mẫu của họ.
- Code chạy trực tiếp vẽ vào bộ đệm pixel riêng (`putImageData`), khác renderer canvas `drawImage` của ta.

## Quyết định

- **Chỉ dùng sheet đã xuất sẵn**, không chạy code pixelfx trong game. Sheet nằm ở `fx/pixelfx/` kèm LICENSE, NOTICE và README ghi commit nguồn (`044e12a`).
- Phát bằng trình phát beanfx sẵn có: `src/render/pixelfx.js` đổi `meta.pixelfx` thành `meta.beanfx` rồi gọi `fromJson`.
- Nhập qua `tools/pixelfx_import.py`:
  - **Khử nhân alpha**: lớp sáng trong sheet pixelfx lưu kiểu đã nhân alpha, vẽ thường sẽ làm tối nền.
  - Bỏ pixel alpha < 10 (khung mờ hình chữ nhật).
  - `--xp-orb`: viên chiến ý gốc bay hình số 8, lệch tới ±25 px; cắt lại 32×32 theo đầu viên (đúng công thức `at(t)` của pixelfx) và xóa bóng trên sàn.
- Chỉ lấy hiệu ứng **đứng một mình** (cổng, chiến ý, sau này: poof, loot-beam, thời tiết). Chiêu tu tiên đặc trưng vẫn tự vẽ bằng beanfx.
- Cờ `FEATURES.pixelfxAssets` trong `src/core/config.js`; tải lỗi thì tự quay về hình vẽ bằng code.

## Đang dùng

| Sheet | Nguồn | Dùng cho |
|---|---|---|
| `portal` | `arcane/portal` | Cổng bí cảnh ở động phủ (vẽ theo thứ tự y cùng nhân vật) |
| ~~`xp-orb-green/blue/gold`~~ | `pickups/xp-orb` | **Đã bỏ** 11/11/2026: người chơi không thích, viên chiến ý về lại hình vẽ bằng code. Bản pixelfx còn trong commit `8de085b` |

Ảnh trước/sau: `docs/pixelfx_truoc_sau.png`.

## Xuất thêm hiệu ứng

Cần bản clone pixelfx và Node:

```bash
node <pixelfx>/tools/render.mjs <nhom/ten> --sheet --out <thu-muc>
```

```bash
.venv/Scripts/python tools/pixelfx_import.py <ten> <thu-muc>/<nhom>/<ten>/<ten>.json
```
