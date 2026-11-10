// Mọi thông số gameplay. Các con số có nhãn [THỬ NGHIỆM] trong GDD là mặc định để playtest, không phải luật cuối.

export const FEATURES = {
  run: true,            // M1: cổng bí cảnh + vòng run roguelite. false = game chạy như v0.1
  manualAttackInRun: true,
  pixelfxAssets: true,  // dùng sheet pixelfx (cổng bí cảnh, viên chiến ý). false = hình vẽ bằng code như cũ
};

export const VIEW = { W: 480, H: 270 };
export const TILE = 16;

export const HUB = {
  MW: 80, MH: 60, SEED: 20261110,
  SAFE_TILES: 7,            // bán kính vùng an toàn (ô)
  FORM_R: 34,               // bán kính tụ linh trận (px)
  RESPAWN: { dx: 0, dy: 26 },
  PORTAL: { dx: 0, dy: -88, r: 22 },   // cổng bí cảnh, tính từ tâm trận
  MAX_MONSTERS: 45,
  NO_SPAWN_TILES: 10,
  NO_SPAWN_NEAR_PLAYER_TILES: 14,
};

export const PLAYER = { SPEED: 82, HITBOX: 4, INVULN: 0.5 };

export const REALM = {
  MAX_L: 17,
  NEED_BASE: 60, NEED_GROWTH: 1.38,
  POWER_PER_L: 0.25, POWER_REALM: 1.6,
  HP_BASE: 100, ATK_BASE: 12,
  MAJOR_CHANCE: 0.7,          // lôi kiếp cũ, giữ tới khi M3-03 thay bằng thử thách
  TRIB_DURATION: 2.6, TRIB_BOLT_EVERY: 0.38,
  TRIB_FAIL_KEEP: 0.7, TRIB_FAIL_HP: 0.3,
  DEATH_KEEP: 0.9,
};

export const MEDITATION = { BASE: 2, PER_L: 0.15, FORMATION_MULT: 3, HEAL: 0.05, IDLE_HEAL: 0.008 };

export const ITEMS = { PILL_COST: 25, PILL_FRACTION: 0.25, START_PILLS: 1 };

export const BASIC_ATTACK = { CD: 0.35, SPEED: 230, RANGE: 150, AIM_RANGE: 130 };

export const HUB_MONSTER = {
  HP_BASE: 30, HP_GROWTH: 1.3, DMG_BASE: 6, DMG_GROWTH: 1.28,
  SPEED_BASE: 38, SPEED_PER_LVL: 1.5, WANDER: 18,
  AGGRO_IN: 80, AGGRO_OUT: 170, ATTACK_RANGE: 11, ATTACK_CD: 0.9,
  TUVI_BASE: 8, TUVI_GROWTH: 1.3, PILL_DROP: 0.15, MAX_LVL: 13, LVL_PER_TILES: 3.2,
};

// ---------- Run (bí cảnh) [THỬ NGHIỆM] ----------
export const RUN = {
  ARENA_W: 44, ARENA_H: 44,
  DURATION: 480,                // 8 phút sống sót = thắng (placeholder tới khi M2 có boss)
  START_SKILLS: ['sword_qi', 'fire_orb', 'thunder_strike'],
  MAX_ACTIVE: 4, MAX_PASSIVE: 4,
  XP_BASE: 4, XP_GROWTH: 1.13, XP_LINEAR: 1,
  MAGNET: 56, PICKUP: 10, ORB_SPEED: 160,
  REGEN: 0.005,                 // hồi khí huyết mỗi giây trong run (tỉ lệ khí huyết tối đa)
  SPAWN: { START_EVERY: 1.3, MIN_EVERY: 0.25, RAMP: 420, MAX_ALIVE: 90, DIST_MIN: 190, DIST_MAX: 260 },
  ENEMY: { HP_BASE: 18, HP_TIME: 0.0045, DMG_BASE: 3, DMG_TIME: 0.0016, SPEED: 34, SPEED_TIME: 0.04, REALM_SCALE: 0.9 },
  CHAIN_BUDGET_PER_TICK: 24,    // tổng số lần nhảy sét tối đa mỗi khung (chặn chuỗi vô hạn)
  MAX_PROJECTILES: 220, MAX_ZONES: 40, MAX_ORBS: 300,
  BURN_MAX_DPS_MULT: 1,         // thiêu đốt không cộng dồn: chỉ giữ dps lớn nhất
  SLOW_MAX: 0.6,
  DRAFT_INPUT_DELAY: 0.25,      // giây khóa input khi vừa mở bảng thẻ (chống bấm nhầm/bấm đúp)
};
