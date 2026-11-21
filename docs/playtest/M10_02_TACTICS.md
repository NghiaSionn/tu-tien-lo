# M10-02: Bộ chọn chiêu theo tình huống và feature flag

**Ngày:** 22/11/2026. **Cờ:** `FEATURES.enemyTactics = false`, **mặc định TẮT** cho đến khi duyệt GATE M10-A. Để thử trong trình duyệt, thêm `?tactics=1` vào URL.
Khi TẮT, AI giữ nguyên như M9 (boss xoay vòng theo `ORDER`, quái gồng tự do). Test xác nhận snapshot của hai trường hợp TẮT mặc định và TẮT tường minh giống hệt nhau.

## 1. Thay đổi
| File | Nội dung |
|---|---|
| `src/systems/tactics.js` (mới) | `threatScan` đếm đòn đặc biệt đang gồng hoặc lao trong khung nhìn. `claimSpecial` giữ một chỗ trong ngân sách. `thinkTick` cho mỗi quái suy nghĩ so le 0,15–0,3 s. `BOSS_SKILLS` là registry chiêu: mỗi chiêu có điều kiện `valid` và trọng số theo khoảng cách hoặc pha. `selectBossSkill` lọc chiêu hợp lệ, xét hồi chiêu, chống lặp và tôn trọng ngân sách boss nặng, rồi bốc ngẫu nhiên có trọng số bằng `run.rng`. |
| `src/core/config.js` | Thêm `FEATURES.enemyTactics: false` và khối `TACTICS`: THINK, BUDGET (NORMAL 2, NORMAL_HIGH 3 từ độ khó ≥ 2, BOSS_HEAVY 1), RETRY 0,35 s, HEAVY, MAX_REPEAT 2, MAX_SUMMONED 8, SLAM_RANGE_MULT 1,6, SKILL_CD (slam 6 s, prison 9 s, howl 8 s). |
| `src/entities/bosses.js` | Khi bật cờ, chiêu boss lấy từ `selectBossSkill`. Khi tắt, dùng `pickPattern` cũ. Ghi log từng chiêu đã dùng. |
| `src/entities/archetypes.js` | Khi bật cờ, Hỏa Hồ, Ma Ảnh và Huyền Băng Thú chỉ quyết định ở nhịp suy nghĩ và chỉ gồng khi còn ngân sách. Hết ngân sách thì thử lại sau RETRY. |
| `src/systems/run.js` | Mỗi tick, `io` mang thêm `tactics`, `threat` (quét đầu tick) và `log`. Thống kê chiêu ghi vào `run.skillsUsed`. |
| `src/main.js` | Thêm cờ URL `?tactics=1`. |
| `tools/sim.mjs` | Thêm biến môi trường `TACTICS=1|0`. Kết quả mô phỏng có thêm `skillsUsed`. |
| `tests/tactics.test.js` (mới) | 6 test, xem mục 2. |

Phạm vi không đổi: cloud save/Firebase, renderer, `rooms`, độ khó thiên kiếp.

## 2. Test
`node --test tests/` cho kết quả **225/225 PASS**, trong đó có 6 test mới:
1. Cờ mặc định là TẮT, và TẮT tường minh cho kết quả giống hệt mặc định.
2. Khi BẬT: cùng seed và cùng input cho ra cùng chuỗi chiêu và cùng trạng thái quái (tất định). Lang Vương có ra chiêu.
3. Người chơi đứng sát Yêu Vương 90 s: số lần đập đất không vượt `ceil(90/6)+1`, không chiêu nào lặp 3 lần liên tiếp, và boss dùng ít nhất 2 chiêu khác nhau.
4. Chiêu không hợp lệ không bao giờ được chọn: không có Lao Tù khi không remix, không hú gọi khi đàn đã đủ 8.
5. Ngân sách: trong khung nhìn có tối đa NORMAL+1 đòn đặc biệt cùng lúc (cộng 1 cho quái gồng sát mép rồi trôi vào). Số đạn và số vùng không vượt trần.
6. Đối chứng khi TẮT: AI cũ có lúc vượt ngân sách. Điều này chứng minh ngân sách thật sự có tác dụng.

## 3. Mô phỏng bot (không phải người thật): BẬT so với baseline M10-01
Dữ liệu: `m10_02_tactics_on_L0.json`, `m10_02_tactics_on_L9.json`.

### Cảnh giới 0 (10 seed × 6 build)
| Build | Baseline (TẮT) | BẬT |
|---|---|---|
| kiem_loi | WLWWWWWLLW | WWWWWWWWWW |
| phi_kiem_hoa | LWLWWLWLLW | WWLWWWLWWL |
| hoa_phong | LLLWLLLLLL | LLWLLLLLWL |
| loi_the | TLWWLWWWWW | LWWWWLWWLW |
| bang_han | WLWWWWLWWW | WWWWWWLWWW |
| linh_phong | LLLLWLWLLW | LLLWLWLLLL |
| **Thắng** | **31/60** | **37/60** |

- Nguồn gây chết, baseline: Dã Lang 12 · băng tiễn 6 · Lang Vương lao 5 · boss cắn 2 · đập đất 2 · Hỏa Hồ 1.
- Nguồn gây chết khi BẬT: Dã Lang 10 · băng tiễn 8 · Lang Vương lao 3 · tinh anh 2. **Không còn lượt nào chết vì đập đất.**

### Cảnh giới 9 (6 seed × 6 build)
- Thắng **28/36 → 29/36**.

### Logic
- Thời gian logic tăng từ ≈ 0,082 lên ≈ 0,092 ms/tick ở L0, và giữ nguyên 0,084 ms/tick ở L9.

## 4. Trình duyệt (`?tactics=1`, localhost, đồ họa Cao)
- Đã chơi bằng input thật. Có lúc 85 quái cùng màn, nhưng tối đa chỉ **2 quái thường cùng gồng trong khung nhìn**.
- Thời gian khung: p50 1,8 ms, p95 11,4 ms.
- Lang Vương ra chiêu: `dash` ×3, `howl` ×2. Chuỗi chiêu không còn xoay vòng cố định.

## 5. Rủi ro còn lại
1. **Khi BẬT, game dễ hơn**: L0 tăng từ 52 % lên 62 % thắng, vì ngân sách giới hạn số đòn cùng lúc. Điều này đúng mục tiêu "không chết oan". Độ khó sẽ được bù bằng chiêu mới từ M10-04 đến M10-10, không phải bằng cách bỏ ngân sách. Không giảm thiên kiếp.
2. Cảnh báo vẫn khó đọc khi quái đông. Phần này để cho M10-03.
3. Boss dịch chuyển giải kẹt vẫn chưa có cảnh báo trước.
4. Khung giật đơn lẻ 160–250 ms (đã thấy ở M10-01) chưa khoanh vùng.
5. Lệch sức mạnh giữa các build: hoa_phong và linh_phong yếu.
6. Chưa có người chơi thật, chưa đo trên điện thoại, chưa thử độ khó Linh trở lên (remix, Lao Tù) bằng sim.
