// M8: bố cục Thanh Huyền Tông — bám concept ảnh 1 (docs/concept/tong_mon_chatgpt.png, docs/M8_QUYET_DINH.md),
// rộng gấp 2 bản M8-02 (44×32 -> 88×64 ô); bệ pháp đài là sprite ChatGPT (M8-02d).
// Toạ độ theo Ô (16 px) trong khung W×H; bản đồ = khung + PAD ô rừng mỗi phía (chỉ để nhìn, viền khung là hàng cây kín).
// Tâm khung = tâm Tụ Linh Pháp Đài (thiên kiếp diễn ra ở đây). Chỉ là dữ liệu — world/map.js dựng thành lưới ô.
//
// foot: [x, y] = điểm giữa-đáy sprite (chân vật), toạ độ ô thực (x.5 = giữa ô). base/solid: [w, h] ô đặc ngay trên chân
// (nền công trình / gốc cây), tính từ ô round(x - w/2), các hàng round(y) - h .. round(y) - 1. Sprite: sprites/tm_*.
export const SECT = {
  W: 88, H: 64, PAD: 10,
  // Tụ Linh Pháp Đài: sprite bệ đá nâng cao ChatGPT vẽ (sprites/tm_be*.png), va chạm sinh sẵn ở data/sect_plaza.js
  // (tools/build_be_phap_dai.py). Bệ chiếm ~x 24–64, y 16–48; 4 lối lên: bắc (chân y ~22), bậc nam (chân y ~48),
  // cánh tây (chân x ~24, y 34–36), cánh đông (chân x ~64, y 34–36)
  PATH_W: 3,                    // bề rộng đường lát đá (ô)
  // 5 công trình có chức năng (cửa = điểm đứng tương tác, ngay dưới bậc thềm)
  BUILDINGS: [
    { id: 'truyen_thua', name: 'Truyền Thừa Các', foot: [20, 16], base: [4, 3] },
    { id: 'tang_kinh', name: 'Tàng Kinh Các', foot: [13, 32], base: [6, 3] },
    { id: 'cong_duc', name: 'Công Đức Đường', foot: [18, 48], base: [7, 3] },
    { id: 'luyen_khi', name: 'Luyện Khí Phường', foot: [68, 16], base: [6, 3] },
    { id: 'dan_duoc', name: 'Đan Dược Phòng', foot: [75, 32], base: [7, 3] },
  ],
  // Luyện Võ Trường: sân đất có rào (sói luyện đòn ở trong), cổng rào phía bắc; chòi luyện võ trong góc
  PEN: { id: 'luyen_vo', name: 'Luyện Võ Trường', x: 64, y: 44, w: 22, h: 13, gate: [67, 69], door: [68.5, 43.2] },
  PORTAL: [44, 10],             // chân cổng bí cảnh (bắc, cuối đường thẳng từ lối bắc của bệ)
  BIA: [44, 55],                // Bia Truyền Thừa (bia động phủ hiện có) giữa vườn bia, dưới chân bậc nam
  PATHS: [
    [[44, 22], [44, 10]],                         // lối bắc của bệ → cổng bí cảnh
    [[44, 15], [30, 15], [20, 17]],               // rẽ tây → Truyền Thừa Các
    [[44, 15], [58, 15], [68, 17]],               // rẽ đông → Luyện Khí Phường
    [[44, 47.5], [44, 55]],                         // chân bậc nam → vườn bia
    [[44, 51], [30, 51], [18, 49]],               // chân bậc nam → tây → Công Đức Đường
    [[25, 35], [13, 33]],                         // cánh tây → Tàng Kinh Các
    [[63, 35], [75, 33]],                         // cánh đông → Đan Dược Phòng
    [[44, 51], [58, 51], [62, 43], [68.5, 42.5]], // chân bậc nam → đông → cổng rào Luyện Võ Trường
    [[18, 49], [22, 53], [27.5, 57], [27.5, 63]], // Công Đức Đường → cầu đá qua suối
  ],
  STREAM: { y: 60, h: 2, bridge: [26, 28] },      // suối ngang phía nam; cầu đá (cau_da) chỗ đường tây nam
  POND: { x: 22, y: 20, w: 5, h: 3 },             // ao nhỏ dưới tháp (ảnh 1)
  // đồ vật/cây: [sprite, x, y, solid?[w,h], flat?] — flat: vẽ sát đất (bậc thang) dưới nhân vật, không đặc
  PROPS: [
    // bậc thềm trước mỗi công trình + trước cổng
    ['bac_thang', 20, 17.6, 0, 1], ['bac_thang', 13, 33.6, 0, 1], ['bac_thang', 18, 49.6, 0, 1], ['bac_thang', 68, 17.6, 0, 1], ['bac_thang', 75, 33.6, 0, 1],
    ['bac_thang', 44, 12.4, 0, 1],
    // cờ phướn hai bên cổng
    ['co_phuon', 40.5, 9, [1, 1]], ['co_phuon', 47.5, 9, [1, 1]],
    // đèn đá dọc đường
    ['den_da', 41.5, 20, [1, 1]], ['den_da', 46.5, 20, [1, 1]], ['den_da', 32.5, 12, [1, 1]], ['den_da', 24.5, 12.5, [1, 1]], ['den_da', 24.5, 19.5, [1, 1]],
    ['den_da', 55.5, 12, [1, 1]], ['den_da', 63.5, 12.5, [1, 1]], ['den_da', 17.5, 31, [1, 1]], ['den_da', 17.5, 38.5, [1, 1]],
    ['den_da', 33.5, 54, [1, 1]], ['den_da', 70.5, 31, [1, 1]], ['den_da', 70.5, 38.5, [1, 1]], ['den_da', 24.5, 59.5, [1, 1]], ['den_da', 30.5, 59.5, [1, 1]],
    ['den_da', 40.5, 57, [1, 1]], ['den_da', 47.5, 57, [1, 1]],
    // vườn bia
    ['bia_lon', 38.5, 56, [2, 1]], ['bia_nho', 50, 56, [2, 1]], ['bia_nho', 36, 54.5, [2, 1]],
    // cầu đá + thác hai đầu suối + sen
    ['cau_da', 27.5, 62.3], ['thac_nuoc', 3.5, 63], ['thac_nuoc', 84.5, 63],
    ['sen', 12, 61.6], ['sen', 38, 61.4], ['sen', 58, 61.6], ['sen', 72, 61.4], ['sen', 24, 22.6],
    // Luyện Võ Trường: chòi, mộc nhân, giá binh khí, cờ
    ['luyen_vo', 80.5, 48, [4, 2]], ['moc_nhan', 69.5, 49, [1, 1]], ['moc_nhan', 73.5, 49, [1, 1]], ['moc_nhan', 71.5, 52, [1, 1]],
    ['gia_binh_khi', 76, 47, [2, 1]], ['co_phuon', 65.5, 46, [1, 1]], ['co_phuon', 83.5, 55, [1, 1]],
    // vách đá phía bắc (nền núi sau cổng)
    ['vach_da', 8, 5, [4, 2]], ['vach_da', 26, 4, [4, 2]], ['vach_da', 62, 4, [4, 2]], ['vach_da', 80, 5, [4, 2]],
    // cây (ảnh 1: anh đào hồng, tùng, tre, cây tròn) — gốc đặc
    ['anh_dao_lon', 9, 14, [2, 1]], ['anh_dao_lon', 32, 9, [2, 1]], ['anh_dao_lon', 81, 22, [2, 1]], ['anh_dao_lon', 34, 57, [2, 1]],
    ['anh_dao_lon', 54, 57, [2, 1]], ['anh_dao_lon', 6, 41, [2, 1]], ['anh_dao_lon', 82, 37, [2, 1]],
    ['anh_dao_nho', 18, 40, [1, 1]], ['anh_dao_nho', 69, 27, [1, 1]], ['anh_dao_nho', 12, 55, [1, 1]], ['anh_dao_nho', 56, 11, [1, 1]], ['anh_dao_nho', 5, 29, [1, 1]],
    ['tung_cao', 36, 6, [1, 1]], ['tung_cao', 52, 6, [1, 1]], ['tung_cao', 4, 22, [1, 1]], ['tung_cao', 84, 12, [1, 1]], ['tung_cao', 16, 7, [1, 1]],
    ['tung_bonsai', 65, 25, [2, 1]], ['tung_bonsai', 10, 24, [2, 1]],
    ['cay_tron', 4, 50, [2, 1]], ['cay_tron', 74, 8, [2, 1]], ['cay_tron', 53, 58, [2, 1]], ['cay_tron', 84, 30, [2, 1]],
    ['tre', 3, 10, [2, 1]], ['tre', 85.5, 41, [2, 1]], ['tre', 26, 42, [2, 1]], ['tre', 66, 58, [2, 1]],
    ['bui_cay', 21, 10, [2, 1]], ['bui_cay', 58, 12, [2, 1]], ['bui_cay', 30, 55, [2, 1]], ['bui_cay', 9, 47, [2, 1]],
    ['da_lon', 36, 12, [2, 1]], ['da_lon', 77, 38, [2, 1]], ['da_lon', 16, 56, [2, 1]], ['da_nho', 28, 44, [2, 1]], ['da_nho', 70, 26, [2, 1]],
    ['da_nho', 8, 34, [2, 1]], ['da_nho', 51, 12, [2, 1]],
    ['khom_hoa', 40, 52], ['khom_hoa', 48, 53], ['khom_hoa', 15, 20], ['khom_hoa', 70, 21], ['khom_hoa', 78, 27], ['khom_hoa', 26, 23.5],
    ['khom_hoa', 60, 21], ['khom_hoa', 10, 40], ['khom_hoa', 76, 40],
  ],
};
