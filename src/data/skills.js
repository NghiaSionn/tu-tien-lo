// Định nghĩa công pháp (dữ liệu thuần). dmg là hệ số nhân với công của cảnh giới (atk(L)).
// implemented:false = mới có thiết kế, chưa vào pool thẻ.
// Mọi con số là [THỬ NGHIỆM], chỉnh ở đây.

export const ELEMENTS = {
  kiem: { name: 'Kiếm', color: '#7fe3ff' },
  hoa: { name: 'Hỏa', color: '#ff8a3c' },
  loi: { name: 'Lôi', color: '#b48cff' },
  phong: { name: 'Phong', color: '#7ff0c8' },
  bang: { name: 'Băng', color: '#bfe8ff' },
  the: { name: 'Thể', color: '#ffd978' },
  linh: { name: 'Linh', color: '#f3a6c8' },
};

export const SKILLS = {
  sword_qi: {
    name: 'Kiếm Khí', element: 'kiem', kind: 'bolt', icon: '⚔', implemented: true, maxLevel: 5,
    desc: 'Phóng kiếm khí vào yêu thú gần nhất trong tầm nhìn.',
    levels: [
      { cd: 0.8, dmg: 1.0, count: 1, pierce: 0, speed: 240, range: 140 },
      { cd: 0.8, dmg: 1.25, count: 1, pierce: 0, speed: 240, range: 140 },
      { cd: 0.8, dmg: 1.25, count: 2, pierce: 0, speed: 240, range: 150 },
      { cd: 0.75, dmg: 1.25, count: 2, pierce: 1, speed: 260, range: 150 },
      { cd: 0.65, dmg: 1.4, count: 3, pierce: 1, speed: 260, range: 160 },
    ],
    levelText: ['Một lưỡi kiếm khí tự ngắm', 'Sát thương +25%', 'Thêm 1 lưỡi kiếm', 'Xuyên qua 1 yêu thú', 'Thêm 1 lưỡi, hồi chiêu nhanh hơn'],
  },
  sword_array: {
    name: 'Phi Kiếm Trận', element: 'kiem', kind: 'orbit', icon: '🗡', implemented: true, maxLevel: 5,
    desc: 'Phi kiếm xoay quanh thân, thấy yêu thú thì lao tới rồi hồi lại.',
    levels: [
      { blades: 2, reload: 2.0, dmg: 1.0, speed: 200, range: 120, contact: 0 },
      { blades: 3, reload: 2.0, dmg: 1.0, speed: 200, range: 120, contact: 0 },
      { blades: 3, reload: 1.7, dmg: 1.3, speed: 210, range: 130, contact: 0 },
      { blades: 4, reload: 1.7, dmg: 1.3, speed: 210, range: 130, contact: 0 },
      { blades: 5, reload: 1.4, dmg: 1.4, speed: 220, range: 140, contact: 0.4 },
    ],
    levelText: ['2 phi kiếm', 'Thêm 1 phi kiếm', 'Sát thương +33%, nạp nhanh hơn', 'Thêm 1 phi kiếm', 'Thêm 1 phi kiếm, kiếm đang xoay cũng gây sát thương'],
  },
  fire_orb: {
    name: 'Hỏa Cầu', element: 'hoa', kind: 'orb', icon: '🔥', implemented: true, maxLevel: 5,
    desc: 'Cầu lửa bay chậm, nổ khi trúng và thiêu đốt yêu thú quanh đó.',
    levels: [
      { cd: 1.4, dmg: 1.4, count: 1, radius: 20, burn: 0.35, burnTime: 2, speed: 150, range: 150 },
      { cd: 1.4, dmg: 1.4, count: 1, radius: 26, burn: 0.35, burnTime: 2, speed: 150, range: 150 },
      { cd: 1.4, dmg: 1.4, count: 1, radius: 26, burn: 0.6, burnTime: 3, speed: 150, range: 150 },
      { cd: 1.4, dmg: 1.4, count: 2, radius: 26, burn: 0.6, burnTime: 3, speed: 160, range: 160 },
      { cd: 1.15, dmg: 1.8, count: 2, radius: 32, burn: 0.7, burnTime: 3, speed: 160, range: 160 },
    ],
    levelText: ['Nổ nhỏ + thiêu đốt', 'Vùng nổ rộng hơn', 'Thiêu đốt mạnh và lâu hơn', 'Thêm 1 cầu lửa', 'Nổ to hơn, sát thương +33%'],
  },
  fire_ring: {
    name: 'Hỏa Luân', element: 'hoa', kind: 'ring', icon: '⭕', implemented: true, maxLevel: 5,
    desc: 'Vòng lửa quanh người, đốt yêu thú áp sát.',
    levels: [
      { radius: 26, tick: 0.5, dmg: 0.35, burn: 0.2, burnTime: 1.5, push: 0 },
      { radius: 32, tick: 0.5, dmg: 0.35, burn: 0.2, burnTime: 1.5, push: 0 },
      { radius: 32, tick: 0.5, dmg: 0.5, burn: 0.2, burnTime: 1.5, push: 0 },
      { radius: 34, tick: 0.5, dmg: 0.5, burn: 0.4, burnTime: 2, push: 0 },
      { radius: 40, tick: 0.45, dmg: 0.55, burn: 0.4, burnTime: 2, push: 40 },
    ],
    levelText: ['Vòng lửa sát thân', 'Vòng rộng hơn', 'Sát thương +43%', 'Thiêu đốt gấp đôi', 'Vòng rộng, đẩy lùi yêu thú'],
  },
  thunder_strike: {
    name: 'Lôi Kích', element: 'loi', kind: 'strike', icon: '⚡', implemented: true, maxLevel: 5,
    desc: 'Sét giáng thẳng xuống yêu thú, nhảy sang con gần bên và làm chậm.',
    levels: [
      { cd: 1.3, dmg: 1.6, targets: 1, chains: 0, chainRange: 60, slow: 0.3, slowTime: 1, range: 170 },
      { cd: 1.3, dmg: 1.6, targets: 1, chains: 1, chainRange: 60, slow: 0.3, slowTime: 1, range: 170 },
      { cd: 1.3, dmg: 2.1, targets: 1, chains: 1, chainRange: 60, slow: 0.3, slowTime: 1, range: 170 },
      { cd: 1.25, dmg: 2.0, targets: 1, chains: 2, chainRange: 65, slow: 0.3, slowTime: 1, range: 180 },
      { cd: 1.25, dmg: 2.0, targets: 2, chains: 3, chainRange: 70, slow: 0.35, slowTime: 1.2, range: 190 },
    ],
    levelText: ['Một tia sét', 'Nhảy sang 1 yêu thú', 'Sát thương +33%', 'Nhảy 2 lần, hồi chiêu nhanh hơn', 'Hai tia sét, nhảy 3 lần'],
  },
  thunder_field: {
    name: 'Lôi Vực', element: 'loi', kind: 'pulse', icon: '🌀', implemented: true, maxLevel: 5,
    desc: 'Vùng điện quanh người phóng xung theo nhịp, làm chậm mọi yêu thú trong vùng.',
    levels: [
      { interval: 2.2, radius: 48, dmg: 0.7, slow: 0.25, slowTime: 1.2 },
      { interval: 2.2, radius: 56, dmg: 0.7, slow: 0.25, slowTime: 1.2 },
      { interval: 2.2, radius: 56, dmg: 1.0, slow: 0.25, slowTime: 1.2 },
      { interval: 1.7, radius: 58, dmg: 1.0, slow: 0.3, slowTime: 1.2 },
      { interval: 1.7, radius: 66, dmg: 1.1, slow: 0.4, slowTime: 1.4 },
    ],
    levelText: ['Xung điện theo nhịp', 'Vùng rộng hơn', 'Sát thương +43%', 'Nhịp nhanh hơn', 'Vùng rộng, làm chậm mạnh'],
  },
  wind_blade: {
    name: 'Phong Nhận', element: 'phong', kind: 'line', icon: '🍃', implemented: true, maxLevel: 5,
    desc: 'Lưỡi gió bay thẳng theo hướng nhìn, xuyên qua nhiều yêu thú.',
    levels: [
      { cd: 1.2, dmg: 0.9, count: 1, pierce: 3, speed: 320, range: 200 },
      { cd: 1.2, dmg: 1.1, count: 1, pierce: 3, speed: 320, range: 200 },
      { cd: 1.2, dmg: 1.1, count: 2, pierce: 3, speed: 320, range: 200 },
      { cd: 1.0, dmg: 1.1, count: 2, pierce: 6, speed: 340, range: 220 },
      { cd: 1.0, dmg: 1.2, count: 4, pierce: 6, speed: 340, range: 220 },
    ],
    levelText: ['Lưỡi gió xuyên 3 yêu thú', 'Sát thương +22%', 'Thêm lưỡi gió phía sau', 'Xuyên 6, nhanh hơn', 'Bốn hướng'],
  },
  body_aura: {
    name: 'Hộ Thể Cương Khí', element: 'the', kind: 'shield', icon: '🛡', implemented: true, maxLevel: 5,
    desc: 'Khiên cương khí hút sát thương; vỡ thì tự hồi sau một lúc.',
    levels: [
      { cap: 0.2, recharge: 7 },
      { cap: 0.25, recharge: 7 },
      { cap: 0.25, recharge: 5.5 },
      { cap: 0.3, recharge: 6 },
      { cap: 0.4, recharge: 5 },
    ],
    levelText: ['Khiên 20% khí huyết', 'Khiên 25%', 'Hồi khiên nhanh hơn', 'Khiên 30%', 'Khiên 40%, hồi nhanh'],
  },
  // ---- chỉ có thiết kế, chưa triển khai (không vào pool) ----
  wind_step: { name: 'Phong Ảnh Bộ', element: 'phong', kind: 'dash', icon: '💨', implemented: false, maxLevel: 5, desc: 'Lướt né, để lại tàn ảnh.', levels: [], levelText: [] },
  ice_needle: { name: 'Băng Châm', element: 'bang', kind: 'bolt', icon: '❄', implemented: false, maxLevel: 5, desc: 'Đạn băng bắn nhanh, làm chậm.', levels: [], levelText: [] },
  ice_nova: { name: 'Hàn Khí', element: 'bang', kind: 'nova', icon: '✳', implemented: false, maxLevel: 5, desc: 'Nổ băng quanh thân, hồi chiêu dài.', levels: [], levelText: [] },
  spirit_orb: { name: 'Linh Châu', element: 'linh', kind: 'orbit', icon: '🔮', implemented: false, maxLevel: 5, desc: 'Linh châu xoay quanh, đánh tầm gần.', levels: [], levelText: [] },
};

// Tiến hóa: công pháp chính đạt cấp tối đa + có công pháp phụ + đã sống đủ lâu trong run. Không cần gacha.
export const EVOLUTIONS = {
  liet_diem_kiem_tran: {
    name: 'Liệt Diễm Kiếm Trận', base: 'sword_array', needAny: ['fire_orb', 'fire_ring'], minRunTime: 90,
    element: 'hoa', kind: 'orbit', icon: '🔥',
    desc: 'Phi kiếm bốc lửa: trúng đâu thiêu đốt và để lại vùng lửa.',
    params: { blades: 6, reload: 1.4, dmg: 1.4, speed: 230, range: 150, contact: 0.5, burn: 0.6, burnTime: 3, patch: { radius: 16, time: 2.2, dps: 0.45 } },
    hint: 'Phi Kiếm Trận cấp tối đa + một công pháp hệ Hỏa',
  },
  loi_dinh_van_kiem: {
    name: 'Lôi Đình Vạn Kiếm', base: 'sword_qi', needAny: ['thunder_strike', 'thunder_field'], minRunTime: 90,
    element: 'loi', kind: 'bolt', icon: '⚡',
    desc: 'Kiếm khí mang sét: trúng mục tiêu thì sét nhảy sang yêu thú gần đó.',
    params: { cd: 0.6, dmg: 1.3, count: 3, pierce: 1, speed: 280, range: 170, chains: 2, chainRange: 70, chainDmg: 0.6, slow: 0.3, slowTime: 0.8 },
    hint: 'Kiếm Khí cấp tối đa + một công pháp hệ Lôi',
  },
  hoa_long_quyen: {
    name: 'Hỏa Long Quyển', base: 'fire_ring', needAny: ['wind_blade'], minRunTime: 90,
    element: 'hoa', kind: 'tornado', icon: '🌪',
    desc: 'Hai cột lốc lửa quay quanh người, hút yêu thú vào và đốt theo nhịp.',
    params: { count: 2, orbit: 54, spin: 1.3, radius: 22, pull: 34, pullRadius: 46, tick: 0.35, dmg: 0.45, burn: 0.5, burnTime: 2 },
    hint: 'Hỏa Luân cấp tối đa + Phong Nhận',
  },
  loi_cuong_ho_the: {
    name: 'Lôi Cương Hộ Thể', base: 'body_aura', needAny: ['thunder_field', 'thunder_strike'], minRunTime: 90,
    element: 'loi', kind: 'shield', icon: '🛡',
    desc: 'Khiên tích điện: định kỳ phóng sét quanh thân; khi vỡ thì nổ sét lớn.',
    params: { cap: 0.45, recharge: 5, nova: { every: 3, radius: 62, dmg: 1.2, slow: 0.35, slowTime: 1 }, breakNova: { radius: 80, dmg: 2.5 } },
    hint: 'Hộ Thể Cương Khí cấp tối đa + một công pháp hệ Lôi',
  },
};

// Thẻ bị động
export const PASSIVES = {
  than_phap: { name: 'Thân Pháp', icon: '👣', maxLevel: 5, per: 0.08, stat: 'moveSpeed', text: lv => `Tốc độ di chuyển +${8 * lv}%` },
  linh_luc: { name: 'Linh Lực', icon: '✦', maxLevel: 5, per: 0.10, stat: 'damage', text: lv => `Sát thương +${10 * lv}%` },
  ngung_than: { name: 'Ngưng Thần', icon: '⌛', maxLevel: 5, per: 0.06, stat: 'cooldown', text: lv => `Hồi chiêu -${6 * lv}%` },
  hap_linh: { name: 'Hấp Linh', icon: '🧲', maxLevel: 3, per: 0.35, stat: 'magnet', text: lv => `Tầm hút chiến ý +${35 * lv}%` },
  ho_mach: { name: 'Hộ Mạch', icon: '❤', maxLevel: 5, per: 0.12, stat: 'maxHp', text: lv => `Khí huyết tối đa +${12 * lv}%` },
  tu_khi: { name: 'Tụ Khí', icon: '◎', maxLevel: 3, per: 0.12, stat: 'area', text: lv => `Phạm vi chiêu +${12 * lv}%` },
};

// Thẻ dự phòng khi không còn thẻ hợp lệ nào (chống kẹt game)
export const FALLBACK_CARD = { id: 'fallback_heal', type: 'FALLBACK', name: 'Hồi Linh', icon: '✚', desc: 'Hồi 35% khí huyết.', heal: 0.35 };
