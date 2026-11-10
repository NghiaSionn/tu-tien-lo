# Bàn giao: Tu Tiên Lộ (prototype)

Game web pixel 2D top-down, thể loại tu tiên, chơi một mình trong trình duyệt. Đây là bản prototype đầu tiên, chưa có phần online.

Cập nhật: 2026-11-10.

---

## 1. Chạy game

Game tải sprite sheet bằng `fetch`, nên **phải chạy qua server**. Mở thẳng `index.html` bằng double-click sẽ không chạy.

```bash
python -m http.server 8123
```

Rồi mở http://localhost:8123.

Trong Claude Code desktop, cấu hình server đã có sẵn ở `.claude/launch.json` (tên `tutien`, cổng 8123).

**Điều khiển:**

| Phím | Tác dụng |
|---|---|
| WASD / mũi tên | Di chuyển |
| Space (hoặc J) | Phóng kiếm khí, tự ngắm yêu thú gần nhất trong 130px |
| T | Bật/tắt tọa thiền |
| B | Đột phá khi tu vi đầy |
| 1 | Dùng Tụ Khí Đan (+25% tu vi cần cho bậc hiện tại) |
| 2 | Mua đan, giá 25 linh thạch |

Các nút trên màn hình làm cùng việc. Nút "Chơi lại từ đầu" ở góc phải trên xóa tiến độ.

---

## 2. Cấu trúc thư mục

```
GameWeb_TuTien/
├── index.html          Khung trang, HUD (bảng chỉ số, nhật ký, nút), CSS
├── game.js             Toàn bộ logic và đồ họa của game (ES module, ~545 dòng)
├── lib/
│   ├── beanfx.js       Trình phát sprite sheet beanfx (lấy nguyên từ repo beanfx)
│   └── beanfx.LICENSE  Giấy phép MIT của beanfx
├── fx/                 Sprite sheet hiệu ứng đã xuất (game đọc thư mục này)
│   └── <tên>.json, <tên>.png, <tên>_color.png, <tên>_light.png
├── vfx/
│   ├── make_fx.py      Script vẽ 5 hiệu ứng, xuất ra fx/
│   ├── kit/            Bộ kit vẽ của beanfx (Python, MIT, có LICENSE)
│   └── preview/        Ảnh xem trước các khung hiệu ứng trên nền cỏ, phóng 3 lần
├── .venv/              Python có numpy và pillow, chỉ dùng để vẽ hiệu ứng
└── .claude/launch.json Cấu hình server xem thử
```

Không dùng framework hay bundler. Game là HTML + JS thuần, canvas 480×270 phóng to theo cửa sổ (nét pixel giữ sắc nhờ `image-rendering: pixelated`).

Dự án **chưa phải git repo**.

---

## 3. Những gì đã có trong game

### 3.1 Bản đồ
- 80×60 ô, mỗi ô 16px. Sinh bằng noise với hạt giống cố định (`SEED = 20261110`), nên lần nào cũng giống nhau.
- Loại ô: cỏ, nước, nền đá (giữa bản đồ), cây (xanh và anh đào hồng), đá tảng. Nước, cây, đá chặn đường.
- Viền bản đồ là hàng cây.
- **Tụ linh trận** ở giữa: ba vòng xoay phát sáng. Ngồi thiền trong vòng (bán kính 34px) thì tu vi tăng ×3.
- **Vùng an toàn** bán kính 7 ô quanh trận: yêu thú không vào được, và đứng trong đó thì chúng thôi đuổi.

### 3.2 Nhân vật
- Sprite vẽ bằng chuỗi ký tự trong code: áo trắng, đai đỏ, 4 hướng, 4 khung đi bộ, tư thế ngồi thiền (có nhấp nhô thở).
- Tốc độ 82px/giây.

### 3.3 Cảnh giới (18 bậc)

| Chỉ số `L` | Tên |
|---|---|
| 0–8 | Luyện Khí tầng 1–9 |
| 9–11 | Trúc Cơ sơ / trung / hậu kỳ |
| 12–14 | Kim Đan sơ / trung / hậu kỳ |
| 15–17 | Nguyên Anh sơ / trung / hậu kỳ (17 là đỉnh của bản này) |

Công thức (trong `game.js`):
- Tu vi cần để lên bậc: `need(L) = round(60 × 1.38^L)`
- Hệ số sức mạnh: `power(L) = (1 + 0.25L) × 1.6^(đại cảnh giới)`
- Máu tối đa `100 × power`, công `12 × power`

**Đột phá:**
- Bậc nhỏ (trong cùng đại cảnh giới): thành công ngay.
- Lên đại cảnh giới (Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh): phải **độ lôi kiếp** 2,6 giây, sét đánh liên tục, tỉ lệ thành công 70% (`MAJOR_CHANCE`). Thất bại thì mất 30% tu vi và máu còn 30%.

### 3.4 Tu luyện
- Tọa thiền: `2 × (1 + 0.15L)` tu vi/giây, ×3 trong tụ linh trận; hồi 5% máu/giây. Di chuyển hoặc bị đánh thì đứng dậy.
- Không thiền vẫn hồi 0,8% máu/giây.

### 3.5 Yêu thú
- Tối đa 45 con, hết thì sinh thêm. Không sinh trong bán kính 10 ô quanh trận, và không sinh gần người chơi (14 ô).
- Cấp 1–13, tăng dần theo khoảng cách tới trận. 4 loại theo cấp:

| Cấp | Tên | Màu |
|---|---|---|
| 1–3 | Dã Lang | xám |
| 4–6 | Hỏa Hồ | cam |
| 7–10 | Huyền Băng Thú | băng lam |
| 11–13 | Ma Ảnh | tím |

- Đi lang thang; thấy người chơi trong 80px thì đuổi, xa quá 170px thì bỏ.
- Máu `30 × 1.3^(cấp−1)`, sát thương `6 × 1.28^(cấp−1)`, đánh mỗi 0,9 giây.
- Giết được: tu vi `8 × 1.3^(cấp−1)`, linh thạch `1 + cấp`, 15% rơi 1 Tụ Khí Đan.

### 3.6 Chết
Máu về 0 thì được đưa về tụ linh trận, mất 10% tu vi, hồi đầy máu.

### 3.7 Lưu tiến độ
- Tự lưu vào `localStorage` (khóa `tutien_save_v1`) mỗi 3 giây, khi đột phá, khi chết và khi đóng trang.
- Lưu: cảnh giới, tu vi, máu, linh thạch, số đan, vị trí. Bản lưu hỏng hoặc vị trí không hợp lệ thì bắt đầu mới.

### 3.8 Gỡ lỗi
`window.__game` cho phép đọc và chỉnh trạng thái từ console:

```js
__game.S.tuvi = 1e6        // đầy tu vi để thử đột phá
__game.S.L = 8             // nhảy lên Luyện Khí tầng 9 (ngay trước lôi kiếp)
__game.update(1 / 24)      // chạy thêm một bước
```

Có `S`, `p` (người chơi), `monsters`, `shots`, `fxs`, `update`.

---

## 4. Hiệu ứng beanfx

### 4.1 beanfx là gì
[beanfx](https://github.com/baenv/beanfx) (MIT, tác giả bien) là plugin cho Claude Code: mô tả hiệu ứng bằng chữ, nó viết code Python vẽ hiệu ứng pixel-art và xuất sprite sheet. Mỗi hiệu ứng có **lớp màu** và **lớp ánh sáng** vẽ cộng sáng (additive) lên trên. Trang demo: https://beanfx.vhbien000.workers.dev/

### 4.2 Cách đã dùng
- Repo có sẵn 20 hiệu ứng mẫu, nhưng chúng quá to so với nhân vật 16px của game (160–320px, nhiều cái vẽ cả nhân vật thi triển), nên **không dùng hiệu ứng mẫu**.
- Thay vào đó đã chép bộ kit vẽ (`vfx/kit/`) và trình phát (`lib/beanfx.js`) vào dự án, rồi viết 5 hiệu ứng mới đúng cỡ trong `vfx/make_fx.py`.
- **Chưa cài plugin `/beanfx`** vào Claude Code. Muốn tự mô tả hiệu ứng bằng chữ thì cài theo hướng dẫn trong README của beanfx.

### 4.3 Năm hiệu ứng

| Tên | Ô | Khung | fps | Kiểu | Dùng khi |
|---|---|---|---|---|---|
| `kiem_khi` | 32×32 | 16 hướng × 6 | 18 | lặp | Đạn kiếm khí: lưỡi liềm xanh lam có vệt gió |
| `kiem_trung` | 32×32 | 8 | 24 | một lần | Kiếm khí trúng quái, cây hoặc đá |
| `loi_kiep` | 96×184 | 16 | 24 | một lần | Sét tím độ kiếp: tia dò, cú đánh có nhánh, đánh lại, tàn dư |
| `dot_pha` | 128×144 | 30 | 24 | một lần | Đột phá: chớp trắng, cột sáng vàng, hai vòng sóng, đốm bay lên |
| `toa_thien` | 64×64 | 24 | 12 | lặp | Linh khí xoáy vào người khi tọa thiền |

Cả 5 qua bộ kiểm tra `export.check` của beanfx (không chạm mép ô, không có khung rỗng, hiệu ứng một lần tan dần chứ không biến mất đột ngột).

`loi_kiep` và `dot_pha` có **hit**: tới khung chạm, game rung màn hình và chớp sáng. `toa_thien` phát nhanh hơn (×1,6) và sáng hơn khi ngồi trong tụ linh trận.

### 4.4 Vẽ lại hoặc sửa hiệu ứng

```bash
.venv/Scripts/python vfx/make_fx.py
```

```bash
.venv/Scripts/python vfx/make_fx.py loi_kiep
```

- Mỗi hiệu ứng là một hàm `render(f)` trả về bản đồ sắc độ (chỉ số màu 0–3, −1 là trống) và lớp sáng.
- Bảng màu ở đầu file (`CYAN`, `VIOLET`, `GOLD` và ramp ánh sáng tương ứng).
- Thêm hiệu ứng mới: viết hàm vẽ, thêm vào `EFFECTS`, rồi trong `game.js` thêm tên vào danh sách tải `FX` và gọi `spawnFx('ten', x, y)`.
- Lệnh trả mã thoát 1 nếu hiệu ứng không qua kiểm tra, kèm lý do.

### 4.5 Thứ vẫn vẽ bằng code (chưa chuyển sang beanfx)
- Vòng tụ linh trận giữa bản đồ.
- Hạt sáng: tia khi dùng đan, xác quái nổ khi chết, tia lửa nhỏ quanh sét.
- Chữ số sát thương bay lên.

---

## 5. Đã kiểm tra

Đã chạy trong trình duyệt, console không có lỗi:
- Di chuyển, tọa thiền (cả trong và ngoài trận), tu vi tăng đúng tốc độ.
- Phóng kiếm khí, trúng và giết quái, nhận tu vi và linh thạch.
- Đột phá bậc nhỏ, độ kiếp thành công (Luyện Khí 9 → Trúc Cơ) và **thất bại** (Trúc Cơ hậu kỳ → Kim Đan).
- Hiệu ứng beanfx hiện đúng chỗ, đúng hướng.

**Chưa kiểm tra:**
- Bị đánh chết và hồi sinh ở trận.
- Mua đan bằng nút/phím (logic đơn giản nhưng chưa bấm thử).
- Tải lại trang để xem tiến độ có được giữ không.
- Màn hình điện thoại: **chưa có điều khiển cảm ứng**, chỉ chơi được bằng bàn phím.

---

## 6. Hạn chế đã biết

- Chỉ chơi một mình, lưu trong trình duyệt; xóa dữ liệu trình duyệt là mất tiến độ, và dễ sửa số bằng console.
- Chưa có âm thanh (beanfx hỗ trợ âm thanh cho hiệu ứng, chưa dùng).
- Cân bằng chỉ chỉnh sơ: quái cấp cao ở rìa bản đồ có thể quá mạnh hoặc quá yếu so với tốc độ lên cấp.
- Toàn bộ code game nằm trong một file `game.js`; khi thêm tính năng lớn nên tách ra module (bản đồ, thực thể, HUD, hiệu ứng).

---

## 7. Hướng đi tiếp theo

Lộ trình đã thống nhất từ đầu có 3 giai đoạn; hiện đang ở cuối giai đoạn 1.

**Giai đoạn 1: chơi một mình (đang làm)**
- Nội dung chơi: công pháp/kỹ năng (ngũ hành), trang bị, luyện đan, boss, thêm vùng bản đồ.
- Thêm hiệu ứng beanfx cho kỹ năng mới; chuyển tụ linh trận sang beanfx.
- Điều khiển cảm ứng cho điện thoại.
- Âm thanh.

**Giai đoạn 2: bán online**
- Đăng nhập, lưu tiến độ trên server, bảng xếp hạng, chat thế giới.
- Gợi ý: Cloudflare Workers + D1 (cùng hạ tầng với trang beanfx) hoặc Supabase.

**Giai đoạn 3: online thật**
- Thấy người chơi khác di chuyển, tông môn, PvP, boss thế giới.
- Gợi ý: Colyseus (Node.js) hoặc Cloudflare Durable Objects. Lúc này mọi tính toán quan trọng (sát thương, tu vi, rơi đồ) phải chuyển lên server để chống hack.

Nếu chuyển engine cho giai đoạn sau: Phaser 3 hoặc PixiJS. Sprite sheet trong `fx/` theo định dạng Aseprite nên engine nào cũng đọc được.

---

## 8. Giấy phép và nguồn

- `vfx/kit/` và `lib/beanfx.js`: từ [baenv/beanfx](https://github.com/baenv/beanfx), giấy phép MIT, giữ nguyên file LICENSE.
- Mọi hình ảnh khác (bản đồ, nhân vật, yêu thú) và 5 hiệu ứng trong `fx/` là vẽ mới cho dự án này, không dùng asset bên ngoài.
