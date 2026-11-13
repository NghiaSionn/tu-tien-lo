// M8: bố cục Thanh Huyền Tông — bám concept ảnh 1 (docs/concept/tong_mon_chatgpt.png, docs/M8_QUYET_DINH.md),
// rộng gấp 2 bản M8-02 (44×32 -> 88×64 ô; đi từ pháp đài tới mỗi khu ~4–6 s với PLAYER.SPEED 82).
// Toạ độ theo Ô (16 px) trong khung W×H; bản đồ = khung + PAD ô rừng mỗi phía (chỉ để nhìn, viền khung là hàng cây kín).
// Tâm khung = tâm Tụ Linh Pháp Đài (thiên kiếp diễn ra ở đây). Chỉ là dữ liệu — world/map.js dựng thành lưới ô.
//
// foot: [x, y] = điểm giữa-đáy sprite (chân vật), toạ độ ô thực (x.5 = giữa ô). base/solid: [w, h] ô đặc ngay trên chân
// (nền công trình / gốc cây), tính từ ô round(x - w/2), các hàng round(y) - h .. round(y) - 1. Sprite: sprites/tm_*.
export const SECT = {
  W: 88, H: 64, PAD: 10,
  PLAZA_R: 8.5,                 // nửa bề rộng bệ pháp đài bát giác (ô), bệ nâng cao: vách nam + lan can — thiên kiếp cần ARENA_R 96 px + lề (≈ 6,5 ô) trống
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
  PEN: { id: 'luyen_vo', name: 'Luyện Võ Trường', x: 56, y: 40, w: 24, h: 14, gate: [60, 62], door: [61.5, 39.2] },
  PORTAL: [44, 10],             // chân cổng bí cảnh (bắc, cuối đường thẳng từ pháp đài)
  BIA: [44, 48],                // Bia Truyền Thừa (bia động phủ hiện có) giữa vườn bia phía nam
  PATHS: [
    [[44, 24], [44, 10]],                         // bắc → cổng bí cảnh
    [[39, 27], [33, 21], [20, 17]],               // tây bắc → Truyền Thừa Các
    [[36, 32], [13, 33]],                         // tây → Tàng Kinh Các
    [[44, 46.5], [30, 46.5], [18, 49]],           // bậc nam → tây nam → Công Đức Đường
    [[49, 27], [55, 21], [68, 17]],               // đông bắc → Luyện Khí Phường
    [[52, 32], [75, 33]],                         // đông → Đan Dược Phòng
    [[44, 46.5], [54, 45], [56, 38], [61.5, 38.5]], // bậc nam → đông nam → cổng rào Luyện Võ Trường
    [[44, 38], [44, 48]],                         // nam: xuống bậc thang bệ → vườn bia
    [[18, 49], [22, 53], [27.5, 57], [27.5, 63]], // Công Đức Đường → cầu đá qua suối
  ],
  STREAM: { y: 58, h: 2, bridge: [26, 28] },      // suối ngang phía nam; cầu đá (cau_da) chỗ đường tây nam
  POND: { x: 29, y: 12, w: 5, h: 3 },             // ao nhỏ giữa tháp và cổng (ảnh 1)
  // đồ vật/cây: [sprite, x, y, solid?[w,h], flat?] — flat: vẽ sát đất (bậc thang) dưới nhân vật, không đặc
  PROPS: [
    // bậc thềm trước mỗi công trình + hai đầu pháp đài
    ['bac_thang', 20, 17.6, 0, 1], ['bac_thang', 13, 33.6, 0, 1], ['bac_thang', 18, 49.6, 0, 1], ['bac_thang', 68, 17.6, 0, 1], ['bac_thang', 75, 33.6, 0, 1],
    ['bac_thang', 44, 24, 0, 1], ['bac_thang', 44, 12.4, 0, 1],
    // cờ phướn quanh pháp đài
    ['co_phuon', 41.5, 24, [1, 1]], ['co_phuon', 46.5, 24, [1, 1]], ['co_phuon', 41.5, 41, [1, 1]], ['co_phuon', 46.5, 41, [1, 1]],
    ['co_phuon', 36.5, 29, [1, 1]], ['co_phuon', 36.5, 36, [1, 1]], ['co_phuon', 51.5, 29, [1, 1]], ['co_phuon', 51.5, 36, [1, 1]],
    ['co_phuon', 40.5, 9, [1, 1]], ['co_phuon', 47.5, 9, [1, 1]],
    // đèn đá dọc đường
    ['den_da', 41.5, 14, [1, 1]], ['den_da', 46.5, 14, [1, 1]], ['den_da', 41.5, 19, [1, 1]], ['den_da', 46.5, 19, [1, 1]],
    ['den_da', 31.5, 25, [1, 1]], ['den_da', 24.5, 16, [1, 1]], ['den_da', 26.5, 30, [1, 1]], ['den_da', 18.5, 30, [1, 1]],
    ['den_da', 30.5, 48, [1, 1]], ['den_da', 24.5, 51, [1, 1]], ['den_da', 57.5, 25, [1, 1]], ['den_da', 64.5, 15, [1, 1]],
    ['den_da', 62.5, 30, [1, 1]], ['den_da', 69.5, 30, [1, 1]], ['den_da', 41.5, 48, [1, 1]], ['den_da', 46.5, 48, [1, 1]],
    ['den_da', 24.5, 57, [1, 1]], ['den_da', 30.5, 57, [1, 1]],
    // vườn bia
    ['bia_lon', 38.5, 51, [2, 1]], ['bia_nho', 50, 51, [2, 1]], ['bia_nho', 35, 50, [2, 1]],
    // cầu đá + thác hai đầu suối + sen
    ['cau_da', 27.5, 60.3], ['thac_nuoc', 3.5, 61], ['thac_nuoc', 84.5, 61],
    ['sen', 12, 59.6], ['sen', 38, 59.4], ['sen', 58, 59.6], ['sen', 72, 59.4], ['sen', 31, 14.6],
    // Luyện Võ Trường: chòi, mộc nhân, giá binh khí, cờ
    ['luyen_vo', 74.5, 45, [4, 2]], ['moc_nhan', 62.5, 46, [1, 1]], ['moc_nhan', 66.5, 46, [1, 1]], ['moc_nhan', 64.5, 50, [1, 1]],
    ['gia_binh_khi', 68, 43, [2, 1]], ['co_phuon', 57.5, 42, [1, 1]], ['co_phuon', 78.5, 52, [1, 1]],
    // vách đá phía bắc (nền núi sau cổng)
    ['vach_da', 8, 5, [4, 2]], ['vach_da', 26, 4, [4, 2]], ['vach_da', 62, 4, [4, 2]], ['vach_da', 80, 5, [4, 2]],
    // cây (ảnh 1: anh đào hồng, tùng, tre, cây tròn) — gốc đặc
    ['anh_dao_lon', 9, 14, [2, 1]], ['anh_dao_lon', 32, 9, [2, 1]], ['anh_dao_lon', 81, 22, [2, 1]], ['anh_dao_lon', 34, 54, [2, 1]],
    ['anh_dao_lon', 54, 53, [2, 1]], ['anh_dao_lon', 6, 41, [2, 1]], ['anh_dao_lon', 82, 37, [2, 1]],
    ['anh_dao_nho', 26, 37, [1, 1]], ['anh_dao_nho', 61, 28, [1, 1]], ['anh_dao_nho', 12, 55, [1, 1]], ['anh_dao_nho', 56, 11, [1, 1]],
    ['anh_dao_nho', 5, 29, [1, 1]],
    ['tung_cao', 36, 6, [1, 1]], ['tung_cao', 52, 6, [1, 1]], ['tung_cao', 4, 22, [1, 1]], ['tung_cao', 84, 12, [1, 1]], ['tung_cao', 16, 7, [1, 1]],
    ['tung_bonsai', 27, 25, [2, 1]], ['tung_bonsai', 63, 24, [2, 1]], ['tung_bonsai', 10, 24, [2, 1]],
    ['cay_tron', 4, 50, [2, 1]], ['cay_tron', 74, 8, [2, 1]], ['cay_tron', 48, 55, [2, 1]], ['cay_tron', 84, 30, [2, 1]],
    ['tre', 3, 10, [2, 1]], ['tre', 85, 46, [2, 1]], ['tre', 22, 40, [2, 1]], ['tre', 66, 55, [2, 1]],
    ['bui_cay', 24, 12, [2, 1]], ['bui_cay', 58, 15, [2, 1]], ['bui_cay', 31, 49, [2, 1]], ['bui_cay', 9, 47, [2, 1]], ['bui_cay', 52, 47, [2, 1]],
    ['da_lon', 33.5, 17, [2, 1]], ['da_lon', 57, 30, [2, 1]], ['da_lon', 16, 56, [2, 1]], ['da_nho', 25, 43, [2, 1]], ['da_nho', 70, 26, [2, 1]],
    ['da_nho', 8, 34, [2, 1]], ['da_nho', 51, 14, [2, 1]],
    ['khom_hoa', 39, 45], ['khom_hoa', 49, 46], ['khom_hoa', 42, 53], ['khom_hoa', 47, 53], ['khom_hoa', 15, 20], ['khom_hoa', 70, 21],
    ['khom_hoa', 30, 34], ['khom_hoa', 58, 34], ['khom_hoa', 16, 38], ['khom_hoa', 78, 27], ['khom_hoa', 37, 15], ['khom_hoa', 51, 18],
  ],
};
