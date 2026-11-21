# M10-01 — Audit & baseline (trước khi nâng AI quái/boss)

**Ngày:** 22/11/2026 · **Checkpoint:** `c63ab01` (HEAD lúc đo, nhánh `main`, đã push) · **Không đổi gameplay trong task này.**
Kế hoạch: `docs/TASKS_M10_ENEMY_AI_TU_TIEN_LO.md`. Số liệu thô: `docs/playtest/m10_baseline_L0.json`, `m10_baseline_L9.json`. Ảnh kỹ năng cũ: `docs/playtest/M10_01_ky_nang_cu.png`.

## 1. Test tự động
- `node --test tests/` → **219/219 PASS** (≈ 16 s).

## 2. Mô phỏng bot (tools/m10_baseline.mjs, bot "biết né cảnh báo", bản đấu trường, độ khó Phàm, biến thể Bình thường)
Đây là bot, **không phải người chơi thật**.

### Cảnh giới 0 — 10 seed × 6 build = 60 lượt
| Build | Thắng | Thua | Hết giờ | Hạ Lang Vương | Kết quả theo seed 1001–1010 |
|---|---|---|---|---|---|
| kiem_loi | 7 | 3 | 0 | 8 | WLWWWWWLLW |
| phi_kiem_hoa | 5 | 5 | 0 | 10 | LWLWWLWLLW |
| hoa_phong | 1 | 9 | 0 | 10 | LLLWLLLLLL |
| loi_the | 7 | 2 | 1 | 10 | TLWWLWWWWW |
| bang_han | 8 | 2 | 0 | 8 | WLWWWWLWWW |
| linh_phong | 3 | 7 | 0 | 8 | LLLLWLWLLW |
| **Tổng** | **31 (52 %)** | 28 | 1 | 54 | |

- Thắng trung bình lúc ~7:10 (Yêu Vương ra 6:00). Chết sớm (< 1:40) ở 5 lượt: kiem_loi ×2, bang_han ×1, linh_phong ×2.
- **Nguồn gây chết** (đòn gây nhiều sát thương nhất ở lượt thua): Dã Lang cắn 12 · băng tiễn 6 · Lang Vương lao 5 · boss cắn 2 · boss đập đất 2 · Hỏa Hồ cắn 1.
- **Tỉ lệ sát thương nhận theo nguồn:** Dã Lang 28,5 % · băng tiễn 21 % · Lang Vương lao 8,8 % · Yêu Vương đập đất 7,6 % · tinh anh cắn 7,3 % · Yêu Vương cắn 7 % · Hỏa Hồ lao 6,2 % · Lang Vương cắn 5,3 % · vùng hắc diễm 3,9 % · Hỏa Hồ cắn 3 % · tinh anh đập đất 1,4 %.

### Cảnh giới 9 — 6 seed × 6 build = 36 lượt
- **Thắng 28/36 (78 %)**. hoa_phong 3/6, linh_phong 3/6, các build khác 5–6/6.
- Gây chết: băng tiễn 3 · Dã Lang 2 · Yêu Vương đập đất 2 · tinh anh 1. Sát thương: băng tiễn 23,5 % · Dã Lang 22,6 % · Yêu Vương cắn 11,4 % · đập đất 11,2 %.

### Logic
- Chỉ phần logic (không vẽ), Node: **≈ 0,08 ms/tick** trung bình cả lượt.

## 3. Thời gian khung trong trình duyệt (desktop, đồ họa Cao, localhost, logic + vẽ, 300 khung mỗi mốc, người chơi bất tử để đo)
| Mốc | Quái | Đạn quái | p50 | p95 | max |
|---|---|---|---|---|---|
| ~0:05 | 7 | 0 | 0,4 ms | 1,4 ms | 10,8 ms |
| ~3:20 (có Lang Vương) | 43 | 1 | 0,7 ms | 6,3 ms | **251 ms** |
| ~5:30 | 87 | 5 | 1,2 ms | 8,1 ms | **160 ms** |

- p95 < 16,7 ms ở cả 3 mốc. Có **khung giật đơn lẻ 160–250 ms** — nghi do mở bảng thẻ (DOM) hoặc dựng khối bản đồ mới khi camera chạy xa; cần khoanh vùng ở M10-12. Chưa đo máy thật/điện thoại.

## 4. Audit code AI hiện có (không đổi gì)
**archetypes.js (80 dòng)** — máy trạng thái `move → windup → (dash) → recover`:
- `chaser` (Dã Lang): chỉ đuổi + cắn (`HUB_MONSTER.ATTACK_RANGE/CD`), không có kỹ năng.
- `charger` (Hỏa Hồ): thấy người chơi (LOS, < 260 px) và `d < TRIGGER` → gồng `WINDUP` khóa hướng → lao `DASH_TIME` → recover.
- `ranged` (Huyền Băng Thú): giữ khoảng `KEEP_MIN..MAX`, đi vòng ngang; bắn khi trong khung nhìn + LOS; tiễn khóa hướng lúc bắt đầu gồng.
- `elite` (Ma Ảnh): `d < TRIGGER` → gồng 1 s → đập vòng `SLAM_R` (sát thương áp dụng thẳng khi hết gồng, không qua `hazards`).

**bosses.js (169 dòng)**:
- Chọn chiêu = **xoay vòng theo `ORDER`** (`patIdx++`), không xét tình huống. Remix (M7-13) chỉ từ độ khó Linh.
- Lang Vương: `dash ×3` (mỗi lần gồng + nhắm lại), `howl` (gọi 4 sói), `howlDash`.
- Yêu Vương: `burst` (đạn tròn có góc lệch ngẫu nhiên), `zones` (vùng nổ quanh người chơi), `prison` (chỉ remix), `slam` **luôn được chọn nếu người chơi < `SLAM.TRIGGER`** → có thể đập liên tục khi người chơi đứng sát (chỉ cách nhau `GAP`). Phase 2 dưới `PHASE2 = 50 %`: nghỉ ngắn hơn, nhiều đạn/vùng hơn. Cuồng nộ sau `ENRAGE_AFTER = 150 s`.
- `unstick`: kẹt 2 s → dịch chuyển quanh người chơi **không cảnh báo trước** (chỉ có vòng tím lúc biến/hiện). Dùng `canStand` (luật người chơi) dù quái giờ đi theo `monStand`.

**monsters.js / director.js**: tách bầy (lưới 32 px), bản đồ hướng vòng hồ, quái xuyên cây; director theo phase/wave/ngân sách cost; trần quái 90, đạn quái 120, vùng boss 12.

**Tất định (seed):** AI bí cảnh dùng `run.rng`. `Math.random` chỉ còn ở lang thang của quái động phủ (hub) — không ảnh hưởng bí cảnh.

**Ghi nhận nguồn sát thương:** đã có khóa theo kiểu + trạng thái (`chaser`, `charger:dash`, `shot`, `boss:zone`, `miniboss:dash`…) — đủ để M10-03 gắn tên chiêu.

## 5. Vấn đề phát hiện (đầu vào cho M10-02/03)
1. **Không có ngân sách đe dọa chung:** số quái gồng cùng lúc không bị giới hạn; 19 Huyền Băng Thú + 18 Hỏa Hồ có thể cùng gồng trong một khung (đếm được ở mốc 5:20).
2. **Cảnh báo khó đọc khi đông:** trong ảnh chụp, đường lao đỏ 1 px và vòng đập đất bị quái + tia sét của người chơi che (ô 3, 5, 6 trong ảnh). Cần tương phản/độ dày rõ hơn ở M10-03.
3. **Đập đất của Yêu Vương có thể bị spam** khi người chơi đứng sát (luật `d < SLAM.TRIGGER` ưu tiên tuyệt đối).
4. **Chọn chiêu boss cố định theo vòng** — người chơi học thuộc được thứ tự, không phản ứng theo vị trí.
5. **Dịch chuyển giải kẹt không cảnh báo** — trái nguyên tắc "không chết oan" nếu boss hiện sát người chơi lúc đang cắn.
6. **Build mạnh/yếu lệch:** hoa_phong 1/10 và linh_phong 3/10 ở cảnh giới 0; Dã Lang + băng tiễn chiếm ~50 % sát thương.
7. **Khung giật 160–250 ms** (mục 3).

## 6. Chưa làm / chưa đo
- Chưa có người chơi thật, chưa đo máy thật/điện thoại, chưa đo đồ họa Vừa/Thấp.
- Chưa có độ khó Linh trở lên trong sim (remix, Lao Tù).
- Không đổi gameplay, không thêm cờ — đúng phạm vi M10-01.
