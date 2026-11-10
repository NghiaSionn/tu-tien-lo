# GAME DESIGN DOCUMENT — TU TIÊN LỘ

> **Phiên bản GDD:** 1.0 — 10/11/2026  
> **Tình trạng:** Thiết kế định hướng đã chốt; các con số cân bằng là **giả thuyết cần playtest**, không được coi là thông số bất biến.  
> **Tài liệu kỹ thuật gốc:** `HANDOFF.md` (10/11/2026).  
> **Backlog triển khai:** `TASKS_TU_TIEN_LO.md`.  
> **Mục tiêu giao cho Claude Code:** nâng cấp prototype đang chạy, **không tạo dự án mới từ đầu**.

---

## 0. Cách đọc và thứ tự ưu tiên

1. **Quyết định đã chốt** trong GDD có ưu tiên cao hơn ý tưởng minh họa.
2. `HANDOFF.md` là **nguồn sự thật về trạng thái code hiện tại**; GDD này mô tả **trạng thái đích**, không khẳng định các tính năng mới đã có.
3. Các mục có nhãn **[THỬ NGHIỆM]** phải được cấu hình bằng dữ liệu để dễ thay đổi sau test, không hard-code như luật chơi cuối cùng.
4. `TASKS_TU_TIEN_LO.md` quyết định thứ tự thực hiện, tiêu chí hoàn thành và phạm vi từng mốc.
5. Nếu có xung đột giữa một tính năng mới và việc bảo toàn gameplay/save cũ, **ưu tiên không làm mất dữ liệu và không phá bản chơi được**.
6. Không tự quyết định các tính năng ngoài phạm vi (monetization trả tiền, multiplayer, thay engine) nếu chưa có bằng chứng kỹ thuật hoặc chỉ đạo bổ sung.

## 1. High concept

**Tên:** Tu Tiên Lộ (tạm giữ).  
**Thể loại:** Browser 2D pixel action survival roguelite + tu tiên RPG progression.  
**Camera:** top-down, cảm giác chiều sâu giả lập (pseudo-2.5D), **không phải 3D thật / HD-2D 3D bắt buộc**.  
**Nền tảng ưu tiên:** desktop browser (bàn phím), hỗ trợ mobile browser sau khi core hoàn thiện.  
**Chế độ giai đoạn hiện tại:** chơi đơn, offline logic trong browser; online là lộ trình về sau.  
**Tương đồng tham khảo:** PokéSurvivor ở nhịp giao tranh thời gian thực, lên cấp chọn 1/3 nâng cấp; cảm giác build đa dạng như survivor roguelite. **Không sao chép IP, Pokémon, sprite, code, giao diện hay thương hiệu của game tham khảo.**

### Tầm nhìn

Người chơi là một tu sĩ khám phá bí cảnh, chiến đấu với yêu thú, xây dựng một bộ công pháp ngẫu nhiên trong mỗi lượt chơi, đem tài nguyên trở lại động phủ để tọa thiền, rèn pháp bảo, mở khóa bí kíp và độ thiên kiếp. **Mỗi lượt chơi nên có quyết định mới; mỗi lần quay về nên có tiến triển hữu ích.**

### Ba trụ cột thiết kế

1. **Build biến hóa:** chọn thẻ nâng cấp, tương tác giữa ngũ hành, tiến hóa chiêu thức; build khác nhau phải làm **khác cách chơi**, không chỉ đổi màu hoặc +% sát thương.
2. **Tu tiên có bản sắc:** tọa thiền, tụ linh trận, cảnh giới, độ lôi kiếp là hệ thống chính chứ không bị bỏ đi khi thêm roguelite.
3. **Đẹp, rõ, mượt:** pixel art đồng nhất; môi trường sâu và huyền ảo; kỹ năng ấn tượng nhưng tín hiệu né đòn, hitbox và FPS phải đọc được trong trận đông quái.

### Chỉ số đánh giá thành công của gameplay (không phải KPI cam kết)

- Người mới hiểu điều khiển + mục tiêu sau vài phút đầu.
- Lựa chọn thẻ có đánh đổi; ít nhất 3 build trong vertical slice cảm nhận khác biệt.
- Kết thúc lượt đầu, người chơi hiểu vì sao thử lượt tiếp theo đáng giá.
- Hệ thống tu vi/cảnh giới không khuyến khích đứng AFK vô hạn là phương pháp tốt nhất.
- Không có chiến thắng buộc phải phụ thuộc vào một vật phẩm gacha siêu hiếm.

## 2. Các quyết định đã chốt / chưa chốt

| Vấn đề | Trạng thái | Quy tắc |
|---|---|---|
| Góc nhìn và style | **ĐÃ CHỐT** | 2D pixel top-down cao cấp + pseudo-2.5D: layering, chiều cao, bóng, glow chọn lọc, sương có kiểm soát |
| Gameplay chính | **ĐÃ CHỐT** | Action survival real-time, EXP chiến đấu -> chọn 1/3 thẻ -> build/tiến hóa -> boss |
| Cấu trúc thế giới | **ĐÃ CHỐT THEO ĐỊNH HƯỚNG** | Thế giới/hub tu luyện lâu dài + các bí cảnh theo lượt; có thể làm giản lược ở bản đầu |
| Tiến trình đôi | **ĐÃ CHỐT** | Cảnh giới/đồ/mở khóa **vĩnh viễn**; cấp chiến đấu/thẻ **reset theo lượt** |
| Tọa thiền, lôi kiếp | **ĐÃ CHỐT** | Giữ lại, biến thành lựa chọn/thử thách có gameplay; không chỉ chờ và tung xúc xắc 70% |
| Gacha | **ĐÃ CHỐT VỀ VAI TRÒ** | Dùng vé/tài nguyên kiếm được trong game để mở bộ sưu tập; không gate thắng game bằng tỉ lệ cực thấp |
| Gacha trả tiền | **CHƯA CHỐT / NGOÀI PHẠM VI** | Không triển khai thanh toán hoặc tiền thật |
| Chi tiết số lượng / thời lượng | **[THỬ NGHIỆM]** | Run mục tiêu 12–15 phút, vertical slice trước đó có thể 6–8 phút; cân bằng theo playtest |
| Chế độ tấn công | **[THỬ NGHIỆM]** | Ưu tiên tự động tung kỹ năng khi có mục tiêu; giữ chế độ đánh tay/tuỳ chọn khi cần; test cảm giác |
| Tông màu chủ đạo | **CHƯA CHỐT TUYỆT ĐỐI** | Nền tiên hiệp huyền ảo xanh ngọc/vàng, bí cảnh nguy hiểm tím/lạnh/đỏ; không khóa game vào chỉ một mood |
| Engine/renderer | **CHƯA CHỐT** | Giữ code chạy trước; benchmark Canvas 2D; chỉ đổi renderer/engine khi có kết quả đo |
| Online/PvP/tông môn | **TƯƠNG LAI** | Không ở vertical slice và không được ngầm phụ thuộc server |

## 3. Trạng thái hiện tại — phải bảo toàn

Theo `HANDOFF.md` (10/11/2026), prototype đang có:

- HTML + JS module thuần, `index.html`, `game.js` khoảng 545 dòng, Canvas nội bộ **480×270**, pixelated.
- Bản đồ cố định bằng seed `20261110`, **80×60 tile, mỗi tile 16px**; nước/cây/đá chặn đường; tụ linh trận ở tâm; vùng an toàn.
- Nhân vật áo trắng đai đỏ sprite vẽ bằng mã, 4 hướng/4 frame đi bộ, có ngồi thiền.
- **18 bậc**: Luyện Khí 1–9, Trúc Cơ sơ/trung/hậu, Kim Đan sơ/trung/hậu, Nguyên Anh sơ/trung/hậu.
- Công thức cũ `need(L)=round(60*1.38^L)`, `power(L)=(1+0.25L)*1.6^(đại cảnh giới)`; giữ như **baseline** để so sánh, không mặc định là cân bằng mới.
- Thiền cũ: `2*(1+0.15L)` tu vi/giây, ×3 ở tụ linh trận, hồi 5% HP/giây; tự đứng dậy khi di chuyển/bị đánh. Chưa sửa ngay cho tới khi có vòng tiến trình mới.
- Lôi kiếp cũ: 2,6 giây, `MAJOR_CHANCE=70%`, thất bại trừ 30% tu vi; sẽ **thay bằng thử thách tương tác**, có đường chuyển tiếp an toàn.
- 4 yêu thú theo cấp, tối đa 45 con; kiếm khí auto-target gần nhất 130px **khi nhấn Space/J**; linh thạch, Tụ Khí Đan.
- Lưu `localStorage` khóa **`tutien_save_v1`** mỗi 3 giây và khi có sự kiện quan trọng.
- `window.__game` được dùng debug.
- Hiệu ứng beanfx hiện hữu: `kiem_khi`, `kiem_trung`, `loi_kiep`, `dot_pha`, `toa_thien`; giữ giấy phép MIT tương ứng.
- **Đã test thủ công** đi lại, ngồi thiền, đánh quái, đột phá nhỏ, độ kiếp có/không thành công, VFX. **Chưa test** chết/hồi sinh, mua đan, load save, cảm ứng mobile.
- **Chưa phải git repo** theo HANDOFF; việc đầu tiên nên là tạo checkpoint/backups và xác minh trạng thái git thực tế.

**Không được gọi tính năng trong GDD là 'đã có' chỉ vì nó xuất hiện ở đây.**

## 4. Cấu trúc trải nghiệm

### 4.1 Hub/động phủ (tái sử dụng bản đồ hiện tại)

- Khu an toàn ở tụ linh trận: tọa thiền, đột phá, chuẩn bị, nhân vật/NPC chức năng (chưa cần NPC art hoàn chỉnh).
- Lối vào **Bí Cảnh**: chọn độ khó, công pháp xuất phát, trang bị đem theo; vào một run độc lập.
- Các menu chức năng: `Công pháp`, `Trang bị`, `Luyện khí`, `Truyền Thừa Các (gacha)`, `Cảnh giới`, `Bí cảnh`, `Cài đặt`.
- Ở bản đầu chỉ cần bảng UI đơn giản; art UI polished ở mốc sau.

### 4.2 Bí cảnh (run/instance)

1. Chọn bộ xuất phát: một công pháp chủ động khởi đầu, trang bị đã sở hữu, độ khó mở khóa.
2. Vào bí cảnh ở **cấp chiến đấu 1**. Bị bao vây bởi địch tăng theo thời gian và cường độ.
3. Nhặt **chiến ý/EXP** từ yêu thú. Đủ EXP -> **tạm dừng game**, bốc 3 thẻ hợp lệ -> chọn 1 -> áp dụng ngay -> tiếp tục.
4. Build lớn dần: kỹ năng mới, tăng bậc, cộng hưởng, tiến hóa. Địch có loại cận chiến, bắn xa, lao tới, tinh anh, boss.
5. Các mốc cao trào: elite/mini-boss, rương lựa chọn, boss cuối.
6. Thắng hoặc chết: hiện bảng kết quả, trao thưởng, trở về hub; **reset cấp chiến đấu và nâng cấp trong run**, giữ tiến trình vĩnh viễn.

**[THỬ NGHIỆM] Nhịp run:**

| Thời điểm (run hoàn chỉnh) | Mục đích |
|---|---|
| 0–2 phút | Onboarding chiến đấu, 1–2 thẻ đầu, thấy hướng build |
| 2–4 phút | Bắt đầu cộng hưởng, quái đặc biệt |
| Khoảng phút 4–5 | Elite/mini-boss, phần thưởng hoặc biến cố |
| 5–9 phút | Tăng độ dày, yêu thú với hành vi khác |
| 9–12 phút | Thêm cơ hội tiến hóa công pháp, áp lực chiến thuật |
| 12–15 phút | Boss cuối, tổng kết + phần thưởng |

**Vertical slice nhỏ trước:** có thể dùng 6–8 phút để kiểm chứng vòng lặp, sau đó mới mở rộng 12–15 phút. Tránh làm người chơi mất thời gian chờ khi đã áp đảo quái.

### 4.3 Sơ đồ tiến trình

```
[Hub: chuẩn bị / tọa thiền / trang bị / mở khóa]
           |
           v
[Chọn bí cảnh + độ khó + công pháp khởi đầu]
           |
           v
[Run: đánh yêu thú -> EXP -> chọn thẻ -> cộng hưởng/tiến hóa]
           |
         [Boss]
        /      \
     Thắng    Thất bại
        \      /
           v
[Nhận thưởng hữu ích -> Hub]
           |
[Tăng tu vi, luyện khí, mở khóa, chuẩn bị thiên kiếp]
           |
           +----> Run mới / bí cảnh khó hơn
```

## 5. Hai loại tiến trình — tuyệt đối không trộn

### 5.1 Cấp chiến đấu theo run (`runLevel`)

- Khởi tạo **1** ở mỗi run, tăng bằng `runXp` từ đánh quái, hoàn toàn tách khỏi `cultivationXp`/tu vi.
- Mỗi lần lên cấp cho **1 lựa chọn 1/3 thẻ**. Khi EXP nhảy nhiều cấp, **xếp hàng** các lần chọn thẻ, không bỏ sót hoặc cấp trùng.
- Các thẻ xuất hiện phải hợp lệ theo trạng thái (chưa max, điều kiện phù hợp, chưa sở hữu trùng loại nếu bị cấm). Có fallback nếu pool ít hơn 3.
- Khi chọn thẻ, thời gian gameplay dừng (AI, projectile, cooldown, đếm giờ run), UI vẫn tương tác.
- Cuối run reset: `runLevel`, `runXp`, nâng cấp tạm, skill evolution tạm, buff tạm, quái và projectile.
- **[THỬ NGHIỆM]** EXP curve được đặt trong data, không khóa cứng quá sớm. Cần tối ưu tần suất lên cấp tạo cảm giác tiến triển đều, tránh spam menu.

### 5.2 Tiến trình vĩnh viễn (`metaProgress`)

Lưu lâu dài: `realmLevel` (tương thích L cũ), `cultivationXp`, tài nguyên, nguyên liệu, trang bị và nâng cấp của chúng, công pháp đã mở khóa, kho thành tựu, vé gacha/mảnh, bí cảnh đã mở/độ khó, tùy chọn game, kỷ lục.

- **Không để cộng dồn vô hạn các hệ số sát thương** làm mất gameplay. Sức mạnh vĩnh viễn thiên về **mở lựa chọn / mở hệ thống / mở biến thể**, bonus chỉ số có soft cap và scaling bí cảnh.
- Không thiết kế item/bí kíp quá hiếm thành nút thắt bắt buộc phải có mới qua boss.
- Người chơi thất bại vẫn có thưởng nhỏ có ích; thưởng thắng hơn nhưng không đến mức khiến các lượt thua vô giá trị.
- Không thưởng AFK tốt hơn chơi chủ động (xem tọa thiền).

## 6. Hệ thống công pháp/thẻ

### 6.1 Nguyên tắc

- Thẻ là **lựa chọn nâng cấp trong run**, không mặc định là thẻ đánh theo lượt.
- **Mở khóa công pháp vĩnh viễn** = đưa công pháp vào kho khả dụng/khởi đầu/điều kiện tiến hóa, không tự động có công pháp max cấp trong mọi run.
- Người chơi có **số ô công pháp chủ động giới hạn** [THỬ NGHIỆM]; ô bị động và vật phẩm trang bị quản lý riêng. Không khóa số ô theo cảnh giới một cách khiến người mới không thể build (nếu mở khóa ô theo cảnh giới, vẫn phải đảm bảo đủ lối chơi từ đầu).
- Mọi lựa chọn cần mô tả rõ `Tên`, `Hệ`, `Loại`, `Cấp`, `Hiệu ứng`, `Điều kiện`, `Tỉ lệ xuất hiện nếu có`, không mô tả mơ hồ như '+rất nhiều sức mạnh'.
- Cân bằng dựa trên cơ chế: tầm bắn, tốc độ, số projectile, đốt/chậm/giật, xuyên, AoE, vùng nguy hiểm, hiệu ứng khi diệt quái; **không chỉ cộng stat**.
- Tránh chuỗi hiệu ứng vô hạn (nổ lan -> giết -> nổ lan). Mỗi loại chain phải có ngân sách tối đa/tick hoặc cooldown riêng.

### 6.2 Bộ công pháp cho vertical slice (đề xuất 12 bản ghi)

| ID | Công pháp | Nhóm | Đặc tính khi dùng |
|---|---|---|---|
| `sword_qi` | Kiếm Khí | Kiếm | Đạn tự tìm mục tiêu; tận dụng VFX cũ |
| `sword_array` | Phi Kiếm Trận | Kiếm | Phi kiếm xoay rồi phóng tới quái |
| `fire_orb` | Hỏa Cầu | Hỏa | Đạn nổ nhỏ, áp dụng Thiêu Đốt |
| `fire_ring` | Hỏa Luân | Hỏa | Vòng lửa gần người, chống áp sát |
| `thunder_strike` | Lôi Kích | Lôi | Tia sét ưu tiên mục tiêu, có chain ít mục tiêu |
| `thunder_field` | Lôi Vực | Lôi | Vùng điện đánh theo nhịp, làm chậm nhẹ |
| `wind_blade` | Phong Nhận | Phong | Lưỡi gió xuyên tuyến, tốc độ cao |
| `wind_step` | Phong Ảnh Bộ | Phong | Lướt/né hoặc để lại tàn ảnh; không làm hỏng controls |
| `ice_needle` | Băng Châm | Thủy/Băng | Đạn bắn nhanh làm chậm |
| `ice_nova` | Hàn Khí | Thủy/Băng | AoE chống áp sát, cooldown dài |
| `body_aura` | Hộ Thể Cương Khí | Thể | Khiên hoặc giảm sát thương có cooldown |
| `spirit_orb` | Linh Châu | Linh | Vật thể xoay quanh, đánh ở khoảng cách gần |

**Lưu ý:** Đây là **danh sách thiết kế để triển khai dần**, không phải yêu cầu tạo 12 bộ VFX polished ngay trong một commit. Trong vertical slice phải có **3 phong cách build phân biệt** (Kiếm/Hỏa/Lôi), các kỹ năng khác có thể art placeholder đúng tỉ lệ.

### 6.3 Cấp kỹ năng

- Kỹ năng thường có nhiều cấp [THỬ NGHIỆM: 3–5], mỗi cấp mở tính năng hoặc thay đổi hành vi có thể cảm nhận, không chỉ +5% sát thương.
- Thẻ `NEW_SKILL`, `UPGRADE_SKILL`, `PASSIVE`, `EVOLUTION` là các loại khác nhau để UI/logic phân biệt.
- Thẻ hiếm có thể tạo biến thể gameplay nhưng **độ hiếm không thay thế cân bằng**; không ép build chỉ chơi được nếu random đúng thẻ cực hiếm.
- Reroll/banish/lock slot là cơ chế có thể bổ sung **sau** khi nền tảng thẻ ổn định, chưa phải v0.2 bắt buộc.

### 6.4 Tiến hóa/cộng hưởng (ít nhất 4 công thức hoạt động ở vertical slice)

| Công thức | Kết quả | Thay đổi hành vi |
|---|---|---|
| Kiếm Khí + Hỏa | **Liệt Diễm Kiếm Trận** | Phi kiếm đốt kẻ địch, tạo vùng lửa nhỏ khi trúng |
| Kiếm Khí + Lôi | **Lôi Đình Vạn Kiếm** | Kiếm khí kích phát dây điện có giới hạn chain |
| Hỏa + Phong | **Hỏa Long Quyển** | Lốc hút quái nhẹ và gây sát thương cháy theo nhịp |
| Lôi + Hộ Thể | **Lôi Cương Hộ Thể** | Khiên tích điện rồi phản kích có cooldown |

Điều kiện tiến hóa [THỬ NGHIỆM]: có kỹ năng chính đạt cấp quy định + sở hữu yếu tố phụ + đã qua mốc mini-boss hoặc rương đặc biệt; không gacha-gate. Tiến hóa **đổi hành vi và VFX**, không chỉ cộng 30% sát thương.

### 6.5 Tự động chiến đấu / điều khiển

- Thiết kế thử nghiệm ưu tiên **tự động tung công pháp** theo cooldown và AI chọn mục tiêu; người chơi chủ yếu di chuyển/né, dùng 1–2 kỹ năng chủ động đặc biệt nếu có.
- `Space/J` hiện tại vẫn phải hoạt động ở chế độ hub hoặc khi bật manual/tính năng tương thích; không được xóa điều khiển cũ đột ngột.
- Auto-target cần fallback hợp lý khi không có mục tiêu, và phải phân biệt địch trong tầm với địch sau vật cản.
- Nếu auto-attack gây cảm giác thiếu tương tác, thử hỗn hợp: tấn công cơ bản tự động + active skill có quyết định thời điểm.

## 7. Tu luyện, cảnh giới, tọa thiền

### 7.1 Giữ 18 bậc gốc

- Luyện Khí 1–9, Trúc Cơ sơ/trung/hậu, Kim Đan sơ/trung/hậu, Nguyên Anh sơ/trung/hậu.
- Các bậc nhỏ tăng sức mạnh/thuộc tính vừa phải; **đại cảnh giới mở hệ thống/nhánh năng lực/biến thể**.
- Không bắt buộc chia quá nhiều kỹ năng khởi đầu khóa sau cảnh giới, để bảo đảm lượt chơi đầu vui ngay.
- Mọi ngưỡng tu vi/scaling phải config; so sánh với baseline trước khi sửa công thức.

### 7.2 Tọa thiền ở hub

**Ý tưởng mới:** tu sĩ mang `lingQi` (linh khí/tinh hoa) kiếm từ run/boss/khám phá về tụ linh trận. Tọa thiền **chuyển linh khí thành `cultivationXp`**. Khi nguồn tích lũy cạn, tốc độ nhận tu vi cực thấp hoặc dừng (tùy test), tránh AFK vô hạn tối ưu.

- Tụ linh trận cho hiệu suất chuyển hóa cao hơn vị trí ngoài trận; đã có VFX `toa_thien` và vòng trận cũ.
- Không đứng yên chờ quá lâu: ưu tiên thời gian ngắn, tương tác rõ; có nút 'chuyển hóa nhanh' nếu cần accessibility hoặc giảm lặp.
- Tụ Khí Đan từ prototype chuyển thành vật phẩm hỗ trợ **chuyển hóa/tăng tu vi**; phải định nghĩa lại trong UI, không để tên/hiệu ứng cũ sai với hệ thống mới.
- Di chuyển hoặc bị đánh vẫn ngắt thiền khi phù hợp; hub là vùng an toàn nên không bị quái làm phiền.

### 7.3 Tọa thiền trong bí cảnh

- Là **điểm nghỉ/tương tác có lựa chọn** (sau đợt hoặc tại linh mạch), không thể spam giữa lúc đang chạy né địch để hồi 5% HP/giây mãi.
- Có thể hồi phục/chọn buff tạm/đổi rủi ro lấy thưởng; một lần sử dụng theo điểm.
- Nếu giữ hồi máu phải có ngân sách/hạn chế rõ ràng để không vô hiệu hóa boss.

## 8. Đột phá và độ lôi kiếp

### 8.1 Tiểu cảnh giới

- Khi `cultivationXp` đạt ngưỡng và người chơi chủ động bấm Đột Phá, có hiệu ứng ngắn, đảm bảo tiến trình/lưu.
- Cho thấy chỉ số và tính năng được mở, không biến thành chuỗi popup kéo dài.

### 8.2 Đại cảnh giới: sự kiện chơi tương tác

**Thay thế lâu dài** cơ chế 2,6 giây, 70% RNG thuần của prototype bằng **Thiên Kiếp**.

- Người chơi **chủ động lựa thời điểm** thử khi đủ tu vi; có thể chuẩn bị Độ Kiếp Đan/pháp bảo kháng lôi.
- Một thử thách ngắn **[THỬ NGHIỆM: 20–30 giây]**, 3 nhịp: (1) dấu vùng sét -> né; (2) chuỗi sét + phòng thủ hoặc di chuyển; (3) cao trào trụ vững/bộc phát.
- **Tất cả đòn nguy hiểm có telegraph rõ** trước khi đánh, thời gian phản ứng hợp lý; không dùng flash quá mạnh/nhấp nháy gây khó chịu.
- Kết quả phụ thuộc chủ yếu vào **kỹ năng, trang bị chuẩn bị, mức độ thử thách**. Có thể tồn tại RNG về mẫu đòn nhưng **không dùng một cú xổ số 70% quyết định thành bại**.
- **Thắng:** lên đại cảnh giới, phục hồi hợp lý, mở nội dung/nhánh năng lực, dùng VFX `dot_pha`.
- **Thua:** không tụt cảnh giới đang có; mất **một phần chi phí chuẩn bị** hoặc cần hồi phục/nghỉ một nhịp, được thử lại sau khi chuẩn bị; tránh phạt khiến người chơi phải cày nhiều run giống hệt.
- Có thể có thành tựu 'độ kiếp không trúng sét', nhưng **không khóa tiến trình bắt buộc** sau thành tựu kỹ năng quá khó.

**Đường triển khai an toàn:** giữ hệ thống cũ khi feature mới chưa hoàn thiện; khi có thiên kiếp tương tác và test pass mới thay đường gọi `MAJOR_CHANCE`; giữ VFX cũ làm cao trào. Không loại bỏ lôi kiếp chỉ vì chuyển game sang roguelite.

## 9. Trang bị, luyện khí, gacha và meta economy

### 9.1 Phần thưởng run

- Thưởng `linhThach` (tiền cơ bản), `lingQi` (nguyên liệu tu luyện), `craftMats` (luyện khí), `coDuyenTicket` (vé gacha), phần thưởng thành tựu.
- Thua vẫn nhận **phần thưởng tương xứng với tiến độ**; thắng nhận bonus rõ ràng.
- Phần thưởng có thể lấy từ boss, lần đầu hoàn thành, thử thách; không ép ngồi farm một loại quái yếu trong hub là tối ưu.
- Tách `loot generated in run` với `awardCommitted` để **không nhận thưởng hai lần** khi reload/ấn kết thúc lặp.

### 9.2 Trang bị và luyện khí

**[THỬ NGHIỆM] Slots ít và rõ:** vũ khí, áo giáp, pháp bảo, nhẫn. Mỗi slot có 1–2 thuộc tính tạo cách chơi; nâng cấp theo **giới hạn rõ**.

- Ví dụ: Kiếm Phi Hành thêm số đạn nhưng giảm tốc độ; Pháp Bảo Hỏa tăng vùng cháy nhưng yếu khi gặp quái kháng Hỏa.
- Có nguyên liệu từ boss/độ khó; nâng cấp **chắc chắn hoặc có pity/bảo toàn**, không bắt ép phá hủy vật phẩm hiếm bằng RNG.
- Không bắt buộc dựng inventory grid phức tạp ở vòng đầu; UI danh sách đơn giản đủ.

### 9.3 Gacha: Truyền Thừa Các

- **Chỉ dùng tài nguyên/vé kiếm được trong gameplay ở giai đoạn này**. Không có hệ thống tiền thật, nạp tiền, quảng cáo bắt buộc hoặc leaderboard cạnh tranh bằng vật phẩm trả tiền.
- Phần thưởng nên thiên về **mở khóa công pháp/biến thể/pháp bảo/ngoại trang**, không phải sức mạnh bắt buộc để qua bí cảnh.
- **Công bố xác suất** khi triển khai. Cần cơ chế **bảo hiểm/pity**, vật phẩm trùng đổi thành `biKipShards`, và **đổi mục tiêu** bằng mảnh/chuỗi thành tựu; số lượt bảo hiểm/chance **chưa chốt**, không tự quảng bá tỉ lệ tưởng tượng.
- Dùng PRNG có seed hoặc injectable RNG trong test để kiểm tra phân phối, pity, duplicate, save/load, không exploit.
- Chỉ triển khai gacha sau khi build/combat/run rewards đã vui; thiết kế cơ chế ngẫu nhiên **không thay cho nội dung**.

### 9.4 Mục tiêu giữ chân lành mạnh

- **Khám phá build mới**, thử công pháp vừa mở, vượt boss/độ khó mới, sưu tầm trang bị có cơ chế khác nhau.
- Thành tựu mở khóa **sân chơi mới**, không chỉ trả điểm thưởng vô hạn.
- Không dùng năng lượng chờ để ngăn chơi, thời hạn FOMO bắt buộc, spam thông báo hoặc thiết kế lặp có chủ đích để ép mua lượt.

## 10. Bí cảnh, yêu thú, boss

### 10.1 Dùng lại AI hiện hữu, mở rộng từng bước

- Giữ 4 loài cũ làm nền: Dã Lang, Hỏa Hồ, Huyền Băng Thú, Ma Ảnh; nâng hành vi trước khi tạo thêm 20 sprite.
- Địch cần các archetype phân biệt: `chaser`, `charger`, `ranged`, `area_denier`, `elite`, `boss`.
- Mỗi archetype có **telegraph**, thời gian hồi/đòn, thông số config và counterplay.
- **Không tăng khó chỉ bằng HP ×10 và số lượng ×10.**

### 10.2 Boss vertical slice

- 1 mini-boss (giữa run) và 1 boss cuối, có ít nhất 2–3 mẫu đòn có cảnh báo rõ.
- Boss có thanh HP, hiệu ứng trúng đòn, thời điểm dễ tấn công; không thể one-shot bằng combo không giới hạn.
- Rớt phần thưởng/nguồn mở khóa hữu ích; sau thắng hiện kết quả trong 1 luồng UI nhất quán.

## 11. Art direction và công nghệ render

### 11.1 Đã chốt: `Cinematic Xianxia Pixel Art`

- **2D Pixel Art sắc nét, top-down**, giả chiều sâu bằng các lớp trước/sau, chiều cao tường/cây, bóng chân, parallax hạn chế, diễn hoạt ánh sáng; không yêu cầu dựng model 3D.
- Phong cảnh: rừng trúc, cổ thụ, hồ linh khí, thạch trận, vách núi, động phủ; các biome có bảng màu riêng.
- Nền cảnh không cạnh tranh với projectile/hitbox; tách màu thường và màu nguy hiểm.
- Công pháp ngũ hành có nhận diện: Kiếm — xanh ngọc; Hỏa — cam/đỏ; Lôi — tím/trắng; Phong — lam ngọc; Băng — xanh nhạt. **Không chỉ dùng màu** để nhận diện (thêm hình dạng/chuyển động).
- Nhân vật/hitbox dễ đọc giữa hàng chục địch. Tập trung làm **một khu rừng + một trận pháp + một arena boss đẹp** trước khi làm nhiều vùng.

### 11.2 Pixel scale

- Baseline render **480×270 internal**, tile logic **16px**; **không tự tăng độ phân giải vô tội vạ**.
- Có thể thử sprite nhân vật **24×32 hoặc 32×32 px** nếu kiểm tra tỷ lệ thế giới/đọc animation đạt; đây **không phải** lệnh bắt buộc thay tất cả sprite 16px.
- `image-rendering: pixelated`, zoom nguyên tỉ lệ khi có thể; UI sử dụng CSS overlay rõ nét thay vì nhồi chữ tiny vào Canvas.
- Phải test scaling/resolution thực tế trên màn hình rộng/hẹp và devicePixelRatio cao.

### 11.3 VFX/lighting

- Tận dụng **beanfx** với 5 hiệu ứng cũ; giữ color/light pass, đăng ký theo data. Không buộc tất cả VFX làm lại.
- Glow/additive compositing **có ngân sách**, tránh shadowBlur đắt cho từng hạt, flash toàn màn liên tục, và overdraw vượt kiểm soát.
- VFX dùng pool/cap, culling ngoài camera, texture atlas/spritesheet; ưu tiên nhiều hiệu ứng ít draw call.
- **Telegraph nguy hiểm luôn rõ hơn hiệu ứng trang trí**. Có `Reduce Effects` / tắt screen shake / giảm flash trong Settings.
- Độ kiếp: mây tối, tia sét tím, vòng cảnh báo, chấn động nhẹ, cột sáng vàng; màn hình vẫn phân biệt được vùng an toàn.

### 11.4 Renderer quyết định bằng benchmark

- Giữ Canvas 2D baseline có thể chạy; xây performance overlay và stress scene **trước** khi đề nghị chuyển engine.
- Chỉ cân nhắc **PixiJS/WebGL** (giữ logic hiện hữu) hay **Phaser** (cần gameplay framework) khi profiling chứng minh bottleneck render và phân tích migration rõ.
- Không rewrite toàn bộ `game.js` sang một engine mới chỉ vì nhìn hiện đại hơn. CPU AI/va chạm cũng phải được tối ưu riêng.

### 11.5 Mục tiêu hiệu năng [THỬ NGHIỆM]

- Desktop phổ thông: **mục tiêu 60 FPS** (ngân sách ~16,7 ms/frame), kể cả trong combat đông.
- Mobile tầm trung: **mục tiêu 30 FPS ổn định**, cố hướng 60 FPS trên máy đủ mạnh; thêm chế độ đồ họa Low/Medium/High.
- Stress test tối thiểu để đo: **100 quái + 200 projectile + 300 particle** đồng thời trên một cảnh thử nghiệm. Đây là **test mục tiêu**, không phải số lượng gameplay bắt buộc.
- Theo dõi median/1% low FPS, frame-time, memory và long frames khi spawn/despawn, không chỉ nhìn FPS khi đứng hub.
- Nếu không đạt, dùng profiling để giảm chi phí update AI (spatial hash/grid), collision, draws, allocations, update ngoài camera, pooling, quality scaler; **không hy sinh telegraph**.

## 12. UX/UI, điều khiển và accessibility

### UI tối thiểu

- Trong run: HP, level chiến đấu, thanh EXP, thời gian, 4–6 ô kỹ năng hiển thị cooldown/trạng thái (số ô cuối là [THỬ NGHIỆM]), số tài nguyên tạm, cảnh báo boss.
- Màn hình chọn thẻ: **3 lựa chọn**, tên rõ, icon, mô tả cụ thể, khác biệt nâng cấp mới/cấp tiếp theo, phím 1/2/3 hoặc click/tap; game pause chính xác.
- Hub: cảnh giới/tu vi, linh khí để chuyển hóa, nút Tọa Thiền, Đột Phá, Bí Cảnh, Kho đồ, Công pháp, Truyền Thừa Các.
- Màn hình cuối run: thắng/thua, build đã dùng, boss, tài nguyên nhận, mở khóa mới, nút quay hub/chơi lại.
- Menu `Cài đặt`: âm lượng, mức hiệu ứng, screen shake, flash, auto/manual nếu triển khai.

### Input

- Desktop: WASD/mũi tên di chuyển; Space/J giữ tương thích tấn công; T tọa thiền trong hub; B đột phá; phím 1/2 trong hub theo logic cũ được rà soát tránh đụng hotkeys UI.
- Mobile: joystick ảo / vùng chạm cho di chuyển và nút tương tác, UI có vùng chạm đủ lớn; không làm input giả để đánh dấu hoàn thành.
- Khi mở modal, phải khóa input di chuyển/đánh và khôi phục trạng thái chính xác khi đóng. Khi mất focus/ẩn tab nên pause hoặc throttle đúng cách.

## 13. Kiến trúc dữ liệu và lưu tiến độ

### 13.1 Module hóa tăng dần (sơ đồ gợi ý, không áp đặt đúng tên file)

```
index.html
src/
  main.js                 # bootstrap, game loop, điều phối scene
  core/                   # time, RNG, input, state machine, event bus, config
  world/                  # map, camera, collisions, safe zone, hub
  entities/               # player, monster, projectile, combat, boss
  progression/            # realm/cultivation, run XP, card draft, evolutions
  systems/                # meditation, tribulation, drops, equipment, gacha
  ui/                     # HUD, modal, run result, inventory, settings
  render/                 # tiles/sprites/effects/lighting/perf controls
  persistence/            # save schema, migrate, backup/export, validation
  data/                   # skills, synergies, enemies, progression, loot
  tests/                  # logic tests; integration/smoke tests
lib/beanfx.js
fx/...
vfx/...
HANDOFF.md
GDD_TU_TIEN_LO.md
TASKS_TU_TIEN_LO.md
```

**Quan trọng:** Đây là mục tiêu kiến trúc. Claude Code phải refactor **từng phần**, giữ build chạy được; không được phá public API debug/logic hiện có nếu chưa bổ sung cách tương đương.

### 13.2 State rõ ràng

- `metaState`: realm, tu vi, tài nguyên, unlock, equipment, achievements, settings.
- `runState`: runId, seed, level, xp, remainingTime, cards selected, runtime entities, awards pending, status.
- `viewState`: hub/run/cardDraft/tribulation/runResults, pause/modal/input locks.
- Data-driven definitions: `SkillDef`, `UpgradeDef`, `EvolutionRecipe`, `EnemyDef`, `ItemDef`, `LootTable`; logic combat độc lập UI.
- Ưu tiên deterministic seed cho unit tests và repro bug; tránh mỗi module tự `Math.random` khó debug.

### 13.3 Save/migration

- **Không xóa/tự ghi đè khóa `tutien_save_v1` trước khi có migration xác minh**.
- Tạo schema version mới (ví dụ `tutien_save_v2`) hoặc wrapper có version, **nhập dữ liệu cũ**: `L`, `tuvi`, `hp`, linh thạch, đan, vị trí; giá trị mới dùng default an toàn.
- Validate phiên bản, giá trị, vị trí hợp lệ; backup dữ liệu v1 khi chuyển; có manual export/import JSON để tránh mất save trong thử nghiệm (cần kiểm soát dữ liệu đầu vào).
- Thưởng run commit **idempotent**: bấm nhận lại/reload không nhân đôi tài nguyên.
- Nếu save mới lỗi, ưu tiên cảnh báo và phục hồi backup thay vì xóa sạch âm thầm.
- `localStorage` có thể sửa qua console: **KHÔNG coi là anti-cheat**. Nếu online về sau, server xác nhận tất cả phần thưởng và chỉ số quan trọng.

## 14. Âm thanh và cảm giác tác động

- Ưu tiên SFX ngắn: kiếm phóng, trúng, nhận EXP, chọn thẻ, skill evolve, boss telegraph, tu luyện, sét kiếp, đột phá.
- Âm lượng tách Music/SFX, có mute; browser audio thường cần user gesture để bật.
- Screen shake nhỏ, hit stop ngắn có cap và tùy chọn giảm; cảm giác tấn công đến từ animation + hit feedback, không chỉ hạt sáng.

## 15. Phạm vi phát triển theo phiên bản

### `v0.2 — Core Roguelite Vertical Slice` (**ƯU TIÊN CAO NHẤT**)

- Có checkpoint + regression cũ; module hóa tối thiểu đủ để thêm hệ thống.
- Từ hub vào một bí cảnh thử; loop quái/EXP, lên cấp chọn thẻ; ít nhất 3 kiểu build phân biệt.
- Mục tiêu dữ liệu: 12 công pháp trong thiết kế, **triển khai đủ để có build hoạt động**; ít nhất **4 tiến hóa có logic** trước khi tuyên bố v0.2 hoàn thành.
- Có mini-boss + boss cuối, màn hình kết quả, tài nguyên cấp cho meta, trở về hub.
- Chưa cần gacha/đồ đủ sâu; cần prototype combat **vui và có thể chơi lại**.

### `v0.3 — Tu Tiên Meta & Thiên Kiếp`

- Hoàn thiện tọa thiền tiêu thụ linh khí, cảnh giới vĩnh viễn, thiên kiếp tương tác, ràng buộc thất bại hợp lý.
- Mở khóa công pháp theo thành tựu, có ít nhất một đường deterministic nhận kỹ năng chủ đạo.
- Luyện khí / trang bị bản đầu, phần thưởng bí cảnh, bảng tiến trình rõ.

### `v0.4 — Collection & Visual Polish`

- Truyền Thừa Các gacha bằng vé game, pity + duplicates + mảnh đổi, UI minh bạch.
- Tăng số build/bí cảnh có đánh đổi; visual pseudo-2.5D ở một biome hoàn chỉnh; âm thanh, accessibility, mobile controls.
- Benchmark CPU/GPU và điều chỉnh renderer dựa trên số liệu.

### Tương lai (không tự triển khai)

- `v1+` online bán phần (account, cloud saves, rankings, chat); rồi multiplayer realtime/tông môn/world boss/PvP nếu có người chơi và ngân sách vận hành.
- Bất kỳ gacha trả tiền/quảng cáo/monetization nào cần chốt thiết kế riêng và xem xét tuân thủ luật/đối tượng người chơi.

## 16. Kiểm thử và số liệu sau phát hành

### Test chức năng bắt buộc

- Save cũ -> v2 không mất chỉ số; load/reload đúng; save lỗi xử lý có cảnh báo.
- Lên nhiều cấp trong một tick: không mất lựa chọn; thẻ không chọn được sau khi đã chọn; pool hợp lệ.
- Evolution kích hoạt đúng một lần, không stacking lỗi; DoT/chain có cap; damage không âm/NaN.
- Vào/ra bí cảnh, chết/thắng, award chỉ một lần; run reset nhưng cảnh giới/công pháp mở khóa được giữ.
- Tọa thiền không bị exploit AFK vô hạn; dùng đan không âm tài nguyên.
- Độ kiếp telegraph + thắng/thua; không tụt bậc; UI/screen shake có thể giảm.
- 100 quái/200 đạn/300 particle stress test; responsive desktop/mobile; canvas không mờ.
- Browser reload/blur giữa modal/boss/run không bị softlock hoặc nhân bản vật phẩm.

### Chỉ số nên đo khi có người chơi thật

- `first_run_complete_rate`, `second_run_start_rate`, `D1 retention`, `D7 retention`.
- Chọn công pháp nào, combo nào ít chọn; số lần chết và nguyên nhân; tỷ lệ pass boss; phiên chơi trung vị; FPS p50/p95 frame-time.
- Trong bản offline chỉ log local/debug nếu cần, không tự ý cài analytics bên ngoài và thu dữ liệu cá nhân.

## 17. Definition of Done cho một phiên bản

Một mốc chỉ được đánh dấu `DONE` khi:

1. Code chạy từ local web server không lỗi console nghiêm trọng.
2. Các test logic/smoke liên quan pass **và có kết quả ghi vào báo cáo**.
3. Có thể chơi từ bắt đầu đến kết thúc use case mục tiêu **bằng input thật**, không chỉ sửa `window.__game`.
4. Save cũ được bảo toàn/migration có test; không nhận thưởng trùng.
5. FPS đã đo ở ít nhất desktop; nếu mốc có mobile thì đo trên điện thoại thật/giả lập với ghi chú hạn chế.
6. Cập nhật `TASKS_TU_TIEN_LO.md` trạng thái và `HANDOFF.md` theo trạng thái **thực tế**; ghi rõ điều gì chưa làm, bug còn mở.

---

## 18. Các điều chưa chốt — không tự biến thành yêu cầu cứng

- Mood cuối: sáng tiên cảnh hay đen tối huyền bí. Có thể phân chia theo biome; cần art prototype so sánh.
- Auto-attack hoàn toàn hay hybrid active skill; phải thử cảm giác trước.
- Chính xác số ô kỹ năng, cấp max kỹ năng, trọng số độ hiếm, EXP curve, drop rate, chỉ số trang bị, số vé gacha, pity.
- Run 12 hay 15 phút, số wave, mức HP boss, số bản đồ, độ khó.
- Chọn Canvas 2D/PixiJS/Phaser sau benchmark.
- Thanh toán, quảng cáo, tính năng online, giao dịch người chơi.

**Bất cứ số nào trong các mục trên đều là default thử nghiệm để đo và điều chỉnh.**
