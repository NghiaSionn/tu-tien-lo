# M10-06 — Huyền Băng Thú: Tam Băng Tiễn

**Ngày:** 22/11/2026.

**Cờ:** dùng chung `FEATURES.enemySkillsV2`, **mặc định TẮT**. Muốn thử thì dùng `?tactics=1&skills2=1`. Khi tắt cờ, Huyền Băng Thú bắn 1 tiễn như cũ.

**Phạm vi:** kế hoạch cho phép ưu tiên một chiêu, nên M10-06 chỉ làm **Tam Băng Tiễn**. **Băng Ấn** (vùng làm chậm) **chưa làm**, vì vậy chưa có hiệu ứng chậm cần trần.

## 1. Cách hoạt động

**Điều kiện bắn quạt** (tất cả phải đúng):
- Người chơi cách Huyền Băng Thú **≥ 120 px**.
- Hết hồi chiêu quạt 6 s riêng của con đó.
- Trong khung nhìn chưa có con nào khác đang gồng quạt (`MAX_ACTIVE` = 1).

**Diễn biến:**
- Gồng **0,85 s** (tiễn đơn gồng 0,6 s). Cảnh báo vẽ **đủ 3 đường đỏ viền tối** theo hướng đã khóa.
- Bắn 3 tiễn: tiễn giữa nhắm người chơi, hai tiễn bên lệch ±0,33 rad (~19°). Mỗi tiễn gây ×0,85 sát thương tiễn đơn.
- Ở khoảng cách 150 px, hai tiễn cạnh nhau cách nhau khoảng 51 px, nên đi ngang vào khe là né được.

**Các trường hợp khác:**
- Nếu không đủ điều kiện, con đó bắn tiễn đơn như cũ. Không phải mọi con đều bắn 3 tia cùng lúc.
- Vẫn giữ các luật cũ: chỉ bắn khi thấy người chơi (LOS) và đang trên màn; cây và đá chặn tiễn; tổng số đạn không vượt `RUN.MAX_ENEMY_SHOTS`.
- Sát thương ghi nguồn `ranged:fan` = "Tam Băng Tiễn".

Toàn bộ tham số ở `ICE_FAN` trong `src/core/config.js`. Cơ chế tất định.

## 2. Thay đổi

| File | Nội dung |
|---|---|
| `src/entities/archetypes.js` | Quyết định quạt hay đơn lúc bắt đầu gồng (`m.fan`), đếm chỗ trống bằng `fanSlots`, khi nhả gồng thì bắn 3 tiễn theo hướng đã khóa. |
| `src/core/config.js` | Thêm `ICE_FAN` và tên chiêu "Tam Băng Tiễn". |
| `src/render/render.js` | `fanDirs`: cảnh báo 3 đường ở cả lớp dưới lẫn lớp trên tán cây. |
| `tools/sim.mjs` | Bot né từng đường của quạt. |
| `tests/icefan.test.js` (mới) | 7 test. |

## 3. Test

`node --test tests/` → **257/257 PASS** (7 test mới):
- **Cờ TẮT:** đứng xa vẫn chỉ bắn 1 tiễn.
- **Cờ BẬT, đứng xa:**
  - Hướng khóa suốt lúc gồng, bắn đúng 3 tiễn.
  - Không trúng trước khi hết gồng; đứng yên thì trúng tiễn giữa.
- **Góc tiễn:** đúng 0 / −SPREAD / +SPREAD so với hướng đã khóa.
- **Né khe:** đi ngang 0,35 s trong lúc gồng thì không trúng tiễn nào (3 seed).
- **Đứng gần hơn 120 px:** vẫn bắn tiễn đơn.
- **Địa hình:** cây/đá chặn tiễn quạt.
- **Giới hạn:** 16 Huyền Băng Thú vây quanh, 30 s, 2 seed → trong khung nhìn không lúc nào có quá 1 con gồng quạt, và không vượt trần đạn.

## 4. Mô phỏng bot (không phải người chơi thật)

Bật cả `tactics` và `skills2`; bot né đủ mọi cảnh báo, kể cả quạt.

| | Cảnh giới 0 (60 lượt) | Cảnh giới 9 (36 lượt) |
|---|---|---|
| M10-01 baseline | 31/60 | 28/36 |
| M10-05 (sói + Hỏa Vĩ) | 35/60 | 28/36 |
| **M10-06 (+ Tam Băng Tiễn)** | **31/60** | **26/36** |
| Tắt hết cờ | **31/60, trùng từng seed với baseline** | — |

**Kết quả L0 theo build:**

| Build | Kết quả theo seed |
|---|---|
| kiem_loi | WWWWWWWWWW |
| phi_kiem_hoa | LWLLWLLWLL |
| hoa_phong | LLWWLLLLLL |
| loi_the | LWWWLWWWWW |
| bang_han | WLWWLLWWWW |
| linh_phong | LLLLLLWLLL |

**Nguồn sát thương:**
- Tam Băng Tiễn chiếm **10,6 %** sát thương nhận (L0) và **12,2 %** (L9).
- Tổng băng tiễn (quạt + đơn) là 20–23 %, tương đương trước đây. Quạt thay một phần tiễn đơn chứ không cộng thêm.

**Nguồn gây chết ở L0:** Dã Lang 12 · Ma Ảnh 4 · Lang Vương lao 4 · băng tiễn đơn 3 · **Tam Băng Tiễn 2** · Yêu Vương cắn 2.

**Hiệu năng:** logic ≈ 0,11 ms/tick.

**Nhận xét:** quạt là kỹ năng đầu tiên trong M10-B làm bot khó hơn rõ: L0 giảm từ 35 xuống 31/60, L9 từ 28 xuống 26/36. Bot né từng đường nhưng vẫn có lúc trúng khi phải né đồng thời sói và Hỏa Hồ.

## 5. Trình duyệt

**Cách thử:** `?tactics=1&skills2=1`, localhost. Vào game bằng input thật (chơi khách → E → chọn công pháp). Để chụp ảnh, tôi tua thời gian tới 3:20, giữ máu đầy và cho chạy bằng `__game.step()`.

**Kết quả:**
- Ảnh `M10_06_tam_bang_tien.png`: Huyền Băng Thú (bên phải) đang gồng, có 3 đường đỏ viền tối xòe về phía người chơi.
- Trong khoảng 7 s game có 8 Huyền Băng Thú, và 32 khung hình có quạt đang gồng — luôn chỉ 1 con.
- Chưa đo thời gian khung hình.

## 6. Rủi ro còn lại

1. Khi quái đông, 3 đường đỏ chồng lên đường lao của Hỏa Hồ và sói, nên khó tách được đường nào là của con nào. Đây là việc cho M10-08 (director chia vai trò) và cho người thật đánh giá.
2. Khe giữa các tiễn hẹp lại khi người chơi đứng gần ngưỡng 120 px (khe khoảng 28 px). Vẫn né được nhưng khó hơn; nếu cần thì tăng `MIN_D` hoặc `SPREAD`.
3. Chưa có Băng Ấn, chưa có người chơi thật, chưa đo khung hình.
