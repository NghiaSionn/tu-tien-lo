// M8-02: bố cục Thanh Huyền Tông (theo concept ảnh 1 — docs/concept/tong_mon_chatgpt.png, docs/M8_QUYET_DINH.md).
// Toạ độ theo Ô (16 px) trong khung tông môn W×H; khung đặt giữa bản đồ động phủ 80×60, tâm khung = tâm bản đồ
// (= tâm Tụ Linh Pháp Đài, nơi thiên kiếp diễn ra). Chỉ là dữ liệu — world/map.js dựng thành lưới ô.
export const SECT = {
  W: 44, H: 32,                 // ô; gốc khung trên bản đồ = (40 - W/2, 30 - H/2)
  PLAZA_R: 7.5,                 // bán kính quảng trường đá quanh tâm (ô) — thiên kiếp cần ≥ 6 ô (ARENA_R 96 px)
  PATH_W: 2,                    // bề rộng đường lát đá (ô)
  // công trình: nền đặc (x, y, w, h) + cửa (điểm đứng tương tác, ngay dưới mép nền). color/roof: placeholder trước khi có art
  BUILDINGS: [
    { id: 'truyen_thua', name: 'Truyền Thừa Các', x: 5, y: 1, w: 6, h: 6, door: [8, 7.6], color: '#7a4e2a', roof: '#2c3e6b', tall: 3 },
    { id: 'tang_kinh', name: 'Tàng Kinh Các', x: 2, y: 11, w: 7, h: 4, door: [5.5, 15.6], color: '#6b4a2c', roof: '#2f4a7a', tall: 1.6 },
    { id: 'cong_duc', name: 'Công Đức Đường', x: 3, y: 20, w: 8, h: 4, door: [7, 24.6], color: '#7a3b2a', roof: '#2c3e6b', tall: 1.6 },
    { id: 'luyen_khi', name: 'Luyện Khí Phường', x: 32, y: 2, w: 8, h: 5, door: [36, 7.6], color: '#5b4636', roof: '#3a3f55', tall: 1.8 },
    { id: 'dan_duoc', name: 'Đan Dược Phòng', x: 35, y: 11, w: 7, h: 4, door: [38.5, 15.6], color: '#4f5a3a', roof: '#2f4a7a', tall: 1.6 },
  ],
  // Luyện Võ Trường: sân đất có rào (sói luyện đòn ở trong, không ra ngoài), cổng rào mở phía bắc
  PEN: { id: 'luyen_vo', name: 'Luyện Võ Trường', x: 30, y: 19, w: 12, h: 9, gate: [34, 36], door: [35, 18.4] },
  PORTAL: [22, 5.5],            // chân cổng bí cảnh (phía bắc, cuối đường thẳng từ quảng trường)
  BIA: [22, 25.2],              // vườn bia (phía nam)
  // đường lát đá (đa tuyến, toạ độ ô): mỗi khu một nhánh ngắn ra quảng trường
  PATHS: [
    [[22, 5], [22, 10]],                      // bắc → cổng
    [[8, 8], [12, 9], [16, 11]],              // tây bắc → Truyền Thừa Các
    [[5, 16], [15, 16]],                      // tây → Tàng Kinh Các
    [[7, 25], [14, 25], [17, 21]],            // tây nam → Công Đức Đường (đi dưới mép nhà, không đâm vào góc tường)
    [[36, 8], [32, 9], [28, 11]],             // đông bắc → Luyện Khí Phường
    [[38, 16], [29, 16]],                     // đông → Đan Dược Phòng
    [[35, 18], [31, 19], [28, 20]],           // đông nam → cổng rào Luyện Võ Trường
    [[22, 23], [22, 31]],                     // nam → vườn bia → cầu đá
  ],
  STREAM: { y: 28, h: 2, bridge: [20, 24] },  // suối ngang phía nam, cầu đá đúng chỗ đường nam đi qua
  // cây trang trí trong tông môn (ô) — không nằm trên đường; viền khung là hàng cây kín (sảnh có giới hạn)
  TREES: [[2, 3], [13, 3], [15, 6], [29, 3], [42, 8], [12, 13], [31, 13], [2, 18], [13, 19], [18, 26], [26, 26], [41, 17], [1, 26], [25, 3], [18, 3]],
  ROCKS: [[10, 18], [30, 7], [27, 25], [14, 27]],
};
