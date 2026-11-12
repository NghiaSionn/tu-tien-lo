// Trang bị (M4-01). 4 ô: weapon (vũ khí), armor (giáp), talisman (pháp bảo), ring (nhẫn).
// Mỗi món có một ưu và một nhược đo được; nâng cấp làm ưu mạnh hơn / nhược nhẹ đi, tối đa cấp 5, chắc chắn thành công.
// mods(lv) trả về các hệ số cộng vào chỉ số run (xem gearMods). Mọi số [THỬ NGHIỆM].
export const SLOTS = { weapon: 'Vũ khí', armor: 'Giáp', talisman: 'Pháp bảo', ring: 'Nhẫn' };
export const MAX_ITEM_LEVEL = 5;

export const ITEMS_DEF = {
  phi_hanh_kiem: {
    name: 'Phi Hành Kiếm', slot: 'weapon', icon: '🗡', rarity: 'rare',
    text: lv => `+1 đạn cho công pháp bắn đạn (Kiếm Khí, Hỏa Cầu, Băng Châm) · sát thương −${20 - lv * 3}%`,
    mods: lv => ({ extraProj: 1, damage: -(0.20 - lv * 0.03) }),
  },
  liet_hoa_dao: {
    name: 'Liệt Hỏa Đao', slot: 'weapon', icon: '🔪', rarity: 'rare',
    text: lv => `Sát thương +${15 + lv * 3}% · tốc độ di chuyển −10%`,
    mods: lv => ({ damage: 0.15 + lv * 0.03, moveSpeed: -0.10 }),
  },
  huyen_giap: {
    name: 'Huyền Quy Giáp', slot: 'armor', icon: '🛡', rarity: 'rare',
    text: lv => `Khí huyết +${20 + lv * 5}% · tốc độ di chuyển −8%`,
    mods: lv => ({ maxHp: 0.20 + lv * 0.05, moveSpeed: -0.08 }),
  },
  phong_hanh_y: {
    name: 'Phong Hành Y', slot: 'armor', icon: '🥋', rarity: 'rare',
    text: lv => `Tốc độ di chuyển +${12 + lv * 2}% · khí huyết −15%`,
    mods: lv => ({ moveSpeed: 0.12 + lv * 0.02, maxHp: -0.15 }),
  },
  tu_linh_chau: {
    name: 'Tụ Linh Châu', slot: 'talisman', icon: '🔮', rarity: 'rare',
    text: lv => `Chiến ý (EXP) +${10 + lv * 3}% · tầm hút +40% · sát thương −5%`,
    mods: lv => ({ xp: 0.10 + lv * 0.03, magnet: 0.40, damage: -0.05 }),
  },
  hoa_diem_kinh: {
    name: 'Hỏa Diễm Kính', slot: 'talisman', icon: '🪞', rarity: 'epic',
    text: lv => `Phạm vi chiêu +${20 + lv * 4}% · hồi chiêu chậm hơn 12%`,
    mods: lv => ({ area: 0.20 + lv * 0.04, cooldownMul: 1.12 }),
  },
  hoi_xuan_gioi: {
    name: 'Hồi Xuân Giới', slot: 'ring', icon: '💍', rarity: 'rare',
    text: lv => `Hồi khí huyết trong bí cảnh ×${(2 + lv * 0.3).toFixed(1)} · sát thương −8%`,
    mods: lv => ({ regenMul: 2 + lv * 0.3, damage: -0.08 }),
  },
  sat_khi_gioi: {
    name: 'Sát Khí Giới', slot: 'ring', icon: '💀', rarity: 'epic',
    text: lv => `Sát thương +${12 + lv * 3}% · nhận sát thương +15%`,
    mods: lv => ({ damage: 0.12 + lv * 0.03, dmgTaken: 0.15 }),
  },
};

// Luyện khí: chế món mới / nâng cấp. Chi phí chắc chắn, không RNG, không phá đồ.
export const CRAFT = {
  make: { craftMats: 8, linhThach: 80 },
  upgrade: lv => ({ craftMats: 3 + lv * 3, linhThach: 40 * lv }),   // từ lv lên lv+1
};

// Cộng dồn hiệu ứng của các món đang mặc -> hệ số cho run (createRun nhận object này)
export function gearMods(meta) {
  const g = { damage: 0, moveSpeed: 0, maxHp: 0, area: 0, magnet: 0, xp: 0, extraProj: 0, regenMul: 1, cooldownMul: 1, dmgTaken: 0 };
  for (const slot of Object.keys(SLOTS)) {
    const id = meta.equipped && meta.equipped[slot];
    const lv = id && meta.items[id];
    if (!lv || !ITEMS_DEF[id] || ITEMS_DEF[id].slot !== slot) continue;
    for (const [k, v] of Object.entries(ITEMS_DEF[id].mods(lv))) {
      if (k === 'regenMul' || k === 'cooldownMul') g[k] *= v; else g[k] += v;
    }
  }
  return g;
}
