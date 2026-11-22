# M10-05 — Hỏa Hồ truy kích: Hỏa Vĩ (vệt lửa sau cú lao)

**Ngày:** 22/11/2026.

**Cờ:** dùng chung `FEATURES.enemySkillsV2` với M10-04, **mặc định TẮT**. Muốn thử thì dùng `?tactics=1&skills2=1`. Khi tắt, Hỏa Hồ lao như cũ và không để lại lửa.

**Chưa làm:** **Giả Động Tác**. Đây là biến thể tùy chọn, theo kế hoạch chỉ có từ độ khó Linh trở lên.

## 1. Cách hoạt động

**Rải lửa:**
- Trong cú lao, cứ 0,07 s Hỏa Hồ rải một đốm lửa (bán kính 9 px) tại chỗ nó đang đứng.
- Mỗi cú lao tối đa 7 đốm; toàn màn tối đa 36 đốm.

**Không sinh dưới chân:**
- Không đặt đốm khi người chơi đang cách chỗ đó < 29 px (SAFE_R + R).
- Mỗi đốm có **0,4 s cảnh báo vô hại** (vòng đỏ viền tối, lấp cam dần) trước khi cháy.

**Cháy:**
- Đốm cháy tới hết 2,4 s rồi tự xóa; 0,35 s cuối thì mờ dần.
- Sát thương mỗi lần dính = ×0,35 sát thương của Hỏa Hồ.
- Đứng trên nhiều đốm cùng lúc vẫn chỉ trúng **1 lần mỗi 0,6 s**.

**Dọn dẹp và ghi nhận:**
- Kết thúc lượt thì xóa hết lửa.
- Nguồn sát thương ghi là `charger:trail` = "Hỏa Vĩ".

Toàn bộ tham số nằm trong `FOX_TRAIL` (`src/core/config.js`). Cơ chế tất định, không dùng ngẫu nhiên.

## 2. Thay đổi

| File | Nội dung |
|---|---|
| `src/systems/firetrail.js` (mới) | `dropTrail` (rải đốm có trần và khoảng an toàn), `updateFireTrails` (già đi, xóa, nhịp TICK). |
| `src/entities/archetypes.js` | Hỏa Hồ đang lao + bật cờ → `dropTrail`. |
| `src/systems/run.js` | `scene.fireTrails`, cập nhật mỗi tick, `endRun` dọn sạch. |
| `src/core/config.js` | `FOX_TRAIL`, tên chiêu "Hỏa Vĩ". |
| `src/render/render.js` | Vẽ đốm: lúc nạp là vòng đỏ viền tối + lấp cam; lúc cháy là đốm cam/vàng lập lòe tất định + viền đỏ. Lớp trên tán cây có viền mờ. Dòng debug có thêm "lửa n". |
| `tools/sim.mjs` | Bot né vệt lửa và **né đường chồm của Dã Lang** (M10-04 trước đây quên phần này, xem mục 4). |
| `tests/firetrail.test.js` (mới) | 5 test. |

## 3. Test

`node --test tests/` → **250/250 PASS** (5 test mới):
- **Cờ TẮT:** Hỏa Hồ lao không để lại lửa.
- **Cờ BẬT:** cú lao để lại 2–7 đốm. Không đốm nào sinh trong vòng an toàn quanh người chơi, cả khi người chơi đứng yên lẫn khi né ngang (3 seed).
- **Thời gian cháy:**
  - Vô hại trong 0,4 s cảnh báo.
  - Đứng trên 4 đốm chồng nhau vẫn chỉ trúng tối đa 1 lần mỗi 0,6 s.
  - Hết 2,4 s thì xóa sạch.
- **Trần toàn màn:** 14 Hỏa Hồ trong 20 s không vượt 36 đốm; `endRun` dọn hết.
- **Tất định và tên nguồn:** cùng seed cho cùng vệt lửa. Mọi nguồn sát thương đều có tên chiêu. Đứng trên đốm đang cháy trong lượt thật thì ghi nguồn `charger:trail`.

## 4. Mô phỏng bot (không phải người chơi thật)

**Sửa bot:** trước đây bot không biết né đường chồm của sói (M10-04) lẫn vệt lửa. Với bot cũ: L0 26/60, và Hỏa Vĩ chiếm 11,7 % sát thương nhận vì bot đi thẳng vào lửa. Bot giờ né cả hai, giống cách nó né các cảnh báo khác. Vì vậy **số 27/60 ghi ở M10-04 là quá thấp** — bot chưa né cú chồm.

| | Cảnh giới 0 (60 lượt) | Cảnh giới 9 (36 lượt) |
|---|---|---|
| M10-01 baseline | 31/60 | 28/36 |
| M10-03 (chỉ tactics) | 34/60 | 30/36 |
| M10-04 (bot chưa né chồm) | 27/60 | 29/36 |
| **M10-05 (tactics + sói + Hỏa Vĩ, bot né đủ)** | **35/60** | **28/36** |
| Tắt hết cờ | **31/60, trùng từng seed với baseline** | — |

**Chi tiết L0 theo build:**

| Build | Kết quả theo seed |
|---|---|
| kiem_loi | WWWWWWWWWW |
| phi_kiem_hoa | WWLLLLWWLW |
| hoa_phong | LWLWWLLLLL |
| loi_the | LWWWWWWWWL |
| bang_han | WWWWLLWWWW |
| linh_phong | LLLLLLWLLL |

**Nhận xét:**
- Ở cả L0 và L9, **không lượt nào chết vì Hỏa Vĩ**. Hỏa Vĩ chỉ chiếm 3,1 % sát thương nhận (L0) và 2,9 % (L9). Cú chồm của sói chiếm 1,6 % (L0).
- Khi bot biết né, kỹ năng mới **không làm game khó hơn rõ rệt**. Phần khó nằm ở việc phải để ý thêm cảnh báo. Với bot hoàn hảo thì đó không phải áp lực thật, nên cần người thật thử.
- Logic ≈ 0,11 ms/tick (trước đó ≈ 0,08–0,09). Mức tăng một phần do máy đang chạy song song nhiều việc. Vẫn rất nhỏ so với 16,7 ms mỗi khung.

## 5. Trình duyệt

**Cách chạy:** `?tactics=1&skills2=1`, localhost. Vào game bằng input thật (chơi khách → E → chọn công pháp). Để chụp ảnh, tôi tua thời gian tới 2:30, giữ máu đầy và cho chạy bằng hook `__game.step()`, vì pane trình duyệt lúc ẩn lúc hiện.

**Kết quả:**
- `M10_05_hoa_vi.png`: các đốm lửa phía trên đàn sói, gồm đốm đang nạp (vòng đỏ) và đốm đang cháy (cam lập lòe + viền đỏ).
- Lần này chưa đo thời gian khung hình.

## 6. Rủi ro còn lại

1. **Đốm lửa nhỏ** (khoảng 18×11 px ở 640×360) nên khó thấy khi quái đông. Nếu người thật thấy khó đọc, có thể tăng `FOX_TRAIL.R` hoặc làm viền dày 2 px.
2. Hỏa Hồ lao ít: khoảng 7 lần mỗi phút với 13 con, vì đường lao phải thấy người chơi và còn ngân sách. Vì vậy vệt lửa không xuất hiện thường xuyên.
3. Đang trong thời gian bất tử sau khi trúng đòn mà vẫn đứng trong lửa thì nhịp TICK vẫn trôi. Điều này có lợi cho người chơi, không phải lỗi bất công.
4. Chưa có Giả Động Tác, chưa có người chơi thật thử, chưa đo khung hình.
