# VFX tự làm bằng quy trình pixelfx

Mã nguồn hiệu ứng viết theo hợp đồng của [pixelfx](https://github.com/patch-gg/pixelfx) (MIT). Dùng bộ trợ giúp lửa
`src/fx/fire/_lib.js` của pixelfx (công thức chuyển thể từ hiệu ứng mã nguồn mở của Sprite Fusion, Hugo Duprez, MIT).

| Tệp | Dùng cho | Kích thước | Ghi chú |
|---|---|---|---|
| `hoa-long-quyen.js` | Tiến hóa Hỏa Long Quyển | 56×60, lặp 1,2 s | 2 dải lửa xoắn quanh thân lốc như rồng cuộn cột, vương miện lửa ở đỉnh, đầu rồng bừng sáng |

## Vẽ lại / sửa

Cần bản clone pixelfx và Node. Chép tệp vào `<pixelfx>/src/fx/fire/`, rồi:

```bash
node <pixelfx>/tools/render.mjs fire/hoa-long-quyen --zoom 4
```

```bash
node <pixelfx>/tools/check.mjs fire/hoa-long-quyen
```

```bash
node tools/pixelfx_layers.mjs <pixelfx> fire/hoa-long-quyen hoa-long-quyen
```

Lệnh cuối xuất `fx/pixelfx/hoa-long-quyen_color.png` + `_light.png` + `.json` (định dạng beanfx: lớp màu vẽ thường,
lớp sáng vẽ cộng sáng). Không dùng sheet gộp `--sheet` của pixelfx cho game: trên nền cỏ sáng, quầng sáng gộp sẵn
thành màu đục.
