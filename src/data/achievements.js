// Thành tựu (M4-02). Điều kiện đọc từ meta.stats (cập nhật khi nhận thưởng run / đột phá).
// Một số thành tựu mở công pháp — đây là lộ trình CHẮC CHẮN, không cần Truyền Thừa Các.
export const ACHIEVEMENTS = [
  { id: 'first_mini', name: 'Trảm Lang', desc: 'Hạ Lang Vương lần đầu', test: s => s.minis >= 1, reward: { skill: 'ice_needle', tickets: 1 } },
  { id: 'first_win', name: 'Phá Bí Cảnh', desc: 'Hạ Ma Ảnh Yêu Vương lần đầu', test: s => s.wins >= 1, reward: { skill: 'ice_nova', tickets: 1 } },
  { id: 'kills_1000', name: 'Vạn Yêu Lục', desc: 'Hạ tổng cộng 1000 yêu thú trong bí cảnh', test: s => s.kills >= 1000, reward: { tickets: 1, craftMats: 10 } },
  { id: 'evo_3', name: 'Ngộ Đạo', desc: 'Tiến hóa 3 công thức khác nhau (qua nhiều lượt)', test: s => s.evos.length >= 3, reward: { tickets: 2 } },
  { id: 'truc_co', name: 'Trúc Cơ', desc: 'Đạt Trúc Cơ', test: (s, m) => m.realmLevel >= 9, reward: { tickets: 2, craftMats: 10 } },
  { id: 'win_linh', name: 'Linh Cảnh', desc: 'Thắng bí cảnh độ khó Linh trở lên', test: s => s.bestDiffWin >= 1, reward: { tickets: 2, craftMats: 15 } },
  { id: 'kim_dan', name: 'Kết Đan', desc: 'Đạt Kim Đan', test: (s, m) => m.realmLevel >= 12, reward: { tickets: 3 } },
];
