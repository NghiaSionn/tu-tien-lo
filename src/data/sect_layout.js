// M8: bố cục Thanh Huyền Tông — bám concept ảnh 1 (docs/concept/tong_mon_chatgpt.png, docs/M8_QUYET_DINH.md),
// rộng gấp 2 bản M8-02 (44×32 -> 88×64 ô); bệ pháp đài là sprite ChatGPT (M8-02d).
// Toạ độ theo Ô (16 px) trong khung W×H; bản đồ = khung + PAD ô rừng mỗi phía (chỉ để nhìn, viền khung là hàng cây kín).
// Tâm khung = tâm Tụ Linh Pháp Đài (thiên kiếp diễn ra ở đây). Chỉ là dữ liệu — world/map.js dựng thành lưới ô.
//
// foot: [x, y] = điểm giữa-đáy sprite (chân vật), toạ độ ô thực (x.5 = giữa ô). base/solid: [w, h] ô đặc ngay trên chân
// (nền công trình / gốc cây), tính từ ô round(x - w/2), các hàng round(y) - h .. round(y) - 1. Sprite: sprites/tm_*.
// M8-15a: thềm đá dưới công trình (sprites/tm_them, tools/build_them.py). Số đo px trên sprite: foot = hàng đặt chân công trình
// (ngay sau mép trước mặt thềm), inner = chiếu nghỉ trước cửa đi được [x0,y0,x1,y1] (hai bên công trình trên thềm không ra được vì nền nhà chắn -> để đặc), stair = cột bậc thang đi được. Còn lại trong khung thềm là đặc.
export const THEM = {
  them_ngang: { w: 177, h: 89, foot: 56, inner: [62, 50, 112, 60], stair: [62, 54, 112, 89] },
  them_vuong: { w: 110, h: 98, foot: 62, inner: [33, 56, 79, 66], stair: [33, 60, 79, 98] },
};
// M8 (15/11): sảnh theo concept ảnh 1 — lưới ô sinh từ tools/sect_bo_cuc.py (data/sect_bocuc.js), khung 120×68 ô.
// Bản đồ = khung + đệm mây; đệm chọn để TÂM BỆ PHÁP ĐÀI (ô 60.5, 33 trong khung) trùng tâm bản đồ (thiên kiếp, tụ linh trận dùng tâm bản đồ).
// Công trình: tạm dùng sprite nhỏ cũ + thềm, đặt sao cho chân bậc thềm đúng điểm `foot` của bố cục (đầu đường); sẽ thay bằng nhà
// tách đúng từ concept. PATHS/STREAM/POND không dùng nữa (đã nằm trong lưới).
import { BOCUC } from './sect_bocuc.js';
const BF = BOCUC.buildings, them = id => (id === 'truyen_thua' ? 'them_vuong' : 'them_ngang');
const footOf = id => { const [x, y] = BF[id].foot, t = THEM[them(id)]; return [x, y - (t.h - t.foot) / 16]; };
export const SECT = {
  W: BOCUC.nx, H: BOCUC.ny, PADL: 10, PADT: 11, MW: BOCUC.nx + 20, MH: BOCUC.ny + 20,   // tâm bản đồ = ô (60, 33) của khung
  ROWS: BOCUC.rows,
  PATH_W: 4, PATHS: [],
  BUILDINGS: [
    { id: 'truyen_thua', name: 'Truyền Thừa Các', foot: footOf('truyen_thua'), base: [4, 3], them: them('truyen_thua') },
    { id: 'tang_kinh', name: 'Tàng Kinh Các', foot: footOf('tang_kinh'), base: [6, 3], them: them('tang_kinh') },
    { id: 'cong_duc', name: 'Công Đức Đường', foot: footOf('cong_duc'), base: [7, 3], them: them('cong_duc') },
    { id: 'luyen_khi', name: 'Luyện Khí Phường', foot: footOf('luyen_khi'), base: [6, 3], them: them('luyen_khi') },
    { id: 'dan_duoc', name: 'Đan Dược Phòng', foot: footOf('dan_duoc'), base: [7, 3], them: them('dan_duoc') },
  ],
  // Luyện Võ Trường: sân đất (elip trong lưới) + rào chữ nhật bên trong, cổng rào phía bắc lệch trái (đầu đường đông nam)
  PEN: { id: 'luyen_vo', name: 'Luyện Võ Trường', x: 82, y: 44, w: 26, h: 13, gate: [83, 86], door: [84.5, 43.2] },
  PORTAL: [60.5, 17.5],
  BIA: [60.5, 50.5],
  PROPS: [
    ['co_phuon', 55.5, 18, [1, 1]], ['co_phuon', 65.5, 18, [1, 1]],
    ['den_da', 57.5, 22, [1, 1]], ['den_da', 63.5, 22, [1, 1]], ['den_da', 41.5, 30, [1, 1]], ['den_da', 37.5, 38.5, [1, 1]],
    ['den_da', 46.5, 47, [1, 1]], ['den_da', 74.5, 44, [1, 1]], ['den_da', 79.5, 32, [1, 1]], ['den_da', 75.5, 24, [1, 1]],
    ['den_da', 35.5, 52, [1, 1]], ['den_da', 44.5, 55, [1, 1]], ['den_da', 55.5, 47, [1, 1]], ['den_da', 66.5, 47, [1, 1]],
    ['bia_nho', 54.5, 53.5, [2, 1]], ['bia_nho', 66, 54, [2, 1]],
    ['cau_da', 35.5, 58.2],
    ['luyen_vo', 103.5, 47, [4, 2]], ['moc_nhan', 90.5, 49, [1, 1]], ['moc_nhan', 94.5, 49, [1, 1]], ['moc_nhan', 92.5, 52, [1, 1]],
    ['gia_binh_khi', 98, 46, [2, 1]], ['co_phuon', 84.5, 45, [1, 1]], ['co_phuon', 106.5, 55, [1, 1]],
    ['anh_dao_lon', 46, 16, [2, 1]], ['anh_dao_lon', 14, 34, [2, 1]], ['anh_dao_lon', 12, 50, [2, 1]], ['anh_dao_lon', 106, 24, [2, 1]],
    ['anh_dao_lon', 74, 51, [2, 1]], ['anh_dao_lon', 47, 54, [2, 1]], ['anh_dao_lon', 69, 56, [2, 1]], ['anh_dao_nho', 38, 46, [1, 1]],
    ['tung_cao', 14, 16, [1, 1]], ['tung_cao', 108, 16, [1, 1]], ['tung_bonsai', 52, 16, [2, 1]], ['tung_bonsai', 70, 18, [2, 1]],
    ['cay_tron', 100, 58, [2, 1]], ['cay_tron', 22, 56, [2, 1]], ['bui_cay', 44, 40, [2, 1]], ['bui_cay', 76, 40, [2, 1]],
    ['da_lon', 50, 23, [2, 1]], ['da_nho', 70, 41, [2, 1]], ['khom_hoa', 58, 56], ['khom_hoa', 63, 57], ['khom_hoa', 52, 42], ['khom_hoa', 70, 30],
    ['sen', 41, 22.5], ['sen', 55, 60.5],
  ],
};
