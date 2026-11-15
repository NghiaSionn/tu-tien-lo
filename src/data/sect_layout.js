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
const BF = BOCUC.buildings, TF = BOCUC.tf,
  // toạ độ đo trên concept (lưới 120×68) -> khung đã phóng quanh tâm bệ (tools/sect_bo_cuc.py: tf)
  tf = ([x, y, ...r]) => [TF.c[0] + (x - TF.c_old[0]) * TF.sx, TF.c[1] + (y - TF.c_old[1]) * TF.sy, ...r],
  tfx = x => Math.round(TF.c[0] + (x - TF.c_old[0]) * TF.sx), tfy = y => Math.round(TF.c[1] + (y - TF.c_old[1]) * TF.sy), them = id => (id === 'truyen_thua' ? 'them_vuong' : 'them_ngang');
const footOf = id => { const [x, y] = BF[id].foot, t = THEM[them(id)]; return [x, y - (t.h - t.foot) / 16]; };
// đồ trong/quanh Luyện Võ Trường đi theo rào (rào đặt lại dưới ngã ba nam: BOCUC.pen), dời theo ô concept
const PEN_PROPS = new Set(['luyen_vo', 'moc_nhan', 'gia_binh_khi']), PEN_DY = (BOCUC.pen.y - tfy(44)) / TF.sy;
export const SECT = {
  W: BOCUC.nx, H: BOCUC.ny, MW: BOCUC.nx + 20, MH: BOCUC.ny + 20,
  PADL: (BOCUC.nx + 20) / 2 - Math.floor(BOCUC.plaza.c[0]), PADT: (BOCUC.ny + 20) / 2 - Math.floor(BOCUC.plaza.c[1]),   // tâm bản đồ = tâm bệ
  ROWS: BOCUC.rows,
  PATH_W: 4, PATHS: [],
  BUILDINGS: [
    { id: 'truyen_thua', name: 'Truyền Thừa Các', nha: 'truyen_thua', at: [35, 24.5] },   // (16/11) tháp tách từ concept
    { id: 'tang_kinh', name: 'Tàng Kinh Các', nha: 'tang_kinh', at: [30.8, 38] },   // (16/11) nhà lớn tách từ concept
    { id: 'cong_duc', name: 'Công Đức Đường', nha: 'cong_duc', at: [28, 55.5] },   // (16/11) nhà lớn tách từ concept
    { id: 'luyen_khi', name: 'Luyện Khí Phường', nha: 'luyen_khi', at: [84, 22] },   // (16/11) nhà lớn tách từ concept
    { id: 'dan_duoc', name: 'Đan Dược Phòng', nha: 'dan_duoc', at: [93.2, 38] },   // (16/11) nhà lớn tách từ concept, đi vào được; at = chân bậc (ô)
  ],
  // Luyện Võ Trường: sân đất (elip trong lưới) + rào chữ nhật bên trong, cổng rào phía bắc lệch trái (đầu đường đông nam)
  // (16/11) Chuồng Linh Thú bo tròn như concept: elip tâm c, bán trục rx/ry (ô); cổng ở góc trên trái; trụ cờ ở các góc (rad)
  PEN: { id: 'luyen_vo', name: 'Chuồng Linh Thú', ...BOCUC.pen, door: [85, 40.3], ring: { c: [95.5, 49.8], rx: 16.5, ry: 9.6, gate: [86, 42], flags: [0.55, 2.6, 1.57, 5.6] },
    path: [[85.6, 41.6], [85.4, 44.5], [85.8, 48], [87.6, 50], [91, 51.2], [95, 51.6], [97.8, 51.6]] },
  GATE: { nha: 'cong_bi_canh', at: [60.5, 21] },   // (16/11) cổng bí cảnh tách từ concept: chân bậc (ô); PORTAL = chỗ đứng bấm E trên bệ
  PORTAL: null,
  BIA: tf([60.5, 53.4]),   // bia lớn giữa vườn bia (concept: chân bia ~ (60.6, 53.9))
  // (16/11) cây, đèn, bia đặt theo ĐÚNG vị trí đo trên ảnh concept (chân vật = đáy hình trong ảnh, đơn vị ô concept)
  PROPS: [
    // đèn đá
    ['den_da', 50.6, 44.9, [1, 1]], ['den_da', 40.8, 52.1, [1, 1]], ['den_da', 39.1, 56.9, [1, 1]], ['den_da', 36.8, 37.3, [1, 1]],
    ['den_da', 38.5, 26, [1, 1]], ['den_da', 54.2, 20.2, [1, 1]], ['den_da', 66.2, 19.9, [1, 1]], ['den_da', 82.8, 26.7, [1, 1]],
    ['den_da', 69, 44.1, [1, 1]], ['den_da', 82.3, 57, [1, 1]], ['den_da', 85.4, 39.1, [1, 1]], ['den_da', 24.1, 57.4, [1, 1]],
    ['den_da', 48.5, 60.3, [1, 1]],
    // bia nhỏ hai bên bia lớn, tảng đá
    ['bia_nho', 52.4, 55.3, [2, 1]], ['bia_nho', 68, 56.1, [2, 1]], ['da_lon', 43, 44.7, [2, 1]],
    ['cau_da', 34.5, 60.4],
    // cây: hoa đào, tùng, cây tròn
    ['anh_dao_lon', 46, 58.8, [2, 1]], ['anh_dao_nho', 56.2, 51.6, [1, 1]], ['anh_dao_lon', 70.5, 55.2, [2, 1]], ['anh_dao_lon', 77.6, 48.2, [2, 1]],
    ['anh_dao_lon', 41.5, 18.8, [2, 1]], ['anh_dao_lon', 108, 23.2, [2, 1]], ['anh_dao_lon', 11.5, 38, [2, 1]], ['anh_dao_lon', 11.5, 51.5, [2, 1]],
    ['cay_tron', 41.2, 47.8, [2, 1]], ['tung_cao', 11, 21, [1, 1]], ['tung_cao', 108, 12, [1, 1]], ['tung_bonsai', 50.5, 18.5, [2, 1]],
    ['tung_bonsai', 72, 17.5, [2, 1]], ['cay_tron', 111, 56, [2, 1]], ['cay_tron', 13.5, 53, [2, 1]], ['bui_cay', 76, 39, [2, 1]],
    ['khom_hoa', 58, 56.5], ['khom_hoa', 63, 57], ['khom_hoa', 52, 42], ['khom_hoa', 70, 30],
    // (16/11) Chuồng Linh Thú (thay Luyện Võ Trường): chuồng mái ngói, máng ăn, máng nước, ụ rơm, ổ rơm, cột đèn (sprites/tm_chuong)
    // xếp theo mẫu bố cục ChatGPT (docs/concept/chuong_linh_thu_bo_cuc_chatgpt.png): chuồng giữa sau, ụ rơm trái chuồng, giếng nước phải,
    // ổ rơm phải trước, máng ăn trái trước, cột đèn giữa trước, cây hoa đào góc trái, cờ trên rào, khóm hoa rải
    ['chuong_thu', 97.6, 50.2, [11, 2]],   // chuồng giữa sau (điểm nhấn)
    ['u_rom', 90.6, 46.6, [3, 1]], ['anh_dao_nho', 104.4, 45.2, [1, 1]], ['mang_nuoc', 106.6, 49.2, [3, 1]],
    ['anh_dao_lon', 83.4, 55, [2, 1]], ['mang_an', 89.8, 56.4, [3, 1]], ['cot_den', 96, 56.9, [1, 1]], ['o_rom', 103.4, 56.2, [3, 1]],
    ['khom_hoa', 92.8, 54.6], ['khom_hoa', 100, 54.8], ['khom_hoa', 108.4, 53.4], ['khom_hoa', 81.4, 49.4], ['khom_hoa', 92.4, 44.6], ['khom_hoa', 101.6, 57.6]
  ].map(([n, x, y, ...r]) => [n, ...tf([x, y + (PEN_PROPS.has(n) || (n === 'co_phuon' && x > 80) ? PEN_DY : 0)]), ...r]),
};
