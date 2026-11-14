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
// M8 (16/11): sảnh dùng ẢNH CONCEPT làm nền cố định (sprites/tm_nen.png, tools/sect_nen.py) — khung 120×68 ô = ảnh 1920×1088.
// Lưới va chạm dò tay trên ảnh (data/sect_bocuc.js). Công trình, cây, bia, rào, cổng đều là phần vẽ trong ảnh: không có sprite
// riêng (paint), chỉ có điểm bấm E (door) và khối đặc chính (body). Bệ pháp đài vẫn là sprite; tâm bệ = tâm bản đồ.
import { BOCUC } from './sect_bocuc.js';
const CX0 = Math.floor(BOCUC.plaza.c[0]), CY0 = Math.floor(BOCUC.plaza.c[1]);
export const SECT = {
  // bản đồ ôm sát ảnh (camera không lộ ra ngoài ảnh); chỉ thêm vài cột để tâm bản đồ = tâm bệ (cột thêm vẽ kéo dài mép ảnh)
  W: BOCUC.nx, H: BOCUC.ny, MW: Math.max(BOCUC.nx, 2 * CX0), MH: Math.max(BOCUC.ny, 2 * CY0),
  PADL: Math.max(BOCUC.nx, 2 * CX0) / 2 - CX0, PADT: Math.max(BOCUC.ny, 2 * CY0) / 2 - CY0,   // tâm bản đồ = tâm bệ
  ROWS: BOCUC.rows,
  BG: BOCUC.bg,
  PATH_W: 4, PATHS: [],
  BUILDINGS: Object.entries(BOCUC.buildings).map(([id, b]) => ({ id, name: b.name, paint: true, door: b.door, body: b.body })),
  PEN: { id: 'luyen_vo', name: 'Luyện Võ Trường', ...BOCUC.pen },
  PORTAL: BOCUC.portal,
  BIA: BOCUC.bia,
  PROPS: [],
};
