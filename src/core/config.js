// Mọi thông số gameplay. Các con số có nhãn [THỬ NGHIỆM] trong GDD là mặc định để playtest, không phải luật cuối.

export const FEATURES = {
  run: true,            // M1: cổng bí cảnh + vòng run roguelite. false = game chạy như v0.1
  manualAttackInRun: true,
  pixelfxAssets: true,  // dùng sheet pixelfx cho cổng bí cảnh. false = cổng vẽ bằng code như cũ
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
  SPAWN: { MAX_ALIVE: 90, DIST_MIN: 190, DIST_MAX: 260 },   // nhịp sinh nằm ở DIRECTOR
  ENEMY: { HP_BASE: 18, HP_TIME: 0.0045, DMG_BASE: 3, DMG_TIME: 0.0016, SPEED: 34, SPEED_TIME: 0.04, REALM_SCALE: 0.9 },
  CHAIN_BUDGET_PER_TICK: 24,    // tổng số lần nhảy sét tối đa mỗi khung (chặn chuỗi vô hạn)
  MAX_PROJECTILES: 220, MAX_ZONES: 40, MAX_ORBS: 300,
  BURN_MAX_DPS_MULT: 1,         // thiêu đốt không cộng dồn: chỉ giữ dps lớn nhất
  SLOW_MAX: 0.6,
  DRAFT_INPUT_DELAY: 0.25,      // giây khóa input khi vừa mở bảng thẻ (chống bấm nhầm/bấm đúp)
  MAX_ENEMY_SHOTS: 120,
};

// ---------- Director bí cảnh (M2-01) [THỬ NGHIỆM] ----------
// Độ khó tăng nhờ hành vi (kiểu quái) + bố cục (đợt vây, bầy lao, hàng bắn xa), không chỉ nhân HP.
export const DIRECTOR = {
  SAFE_R: 150,                  // không sinh quái gần người chơi hơn khoảng này
  // giai đoạn: nhịp sinh (giây/con, nội suy tới giai đoạn sau) và tỉ lệ kiểu quái
  PHASES: [
    { t: 0,   every: 1.3,  mix: { chaser: 1 } },
    { t: 60,  every: 1.05, mix: { chaser: 0.8, charger: 0.2 } },
    { t: 120, every: 0.8,  mix: { chaser: 0.6, charger: 0.25, ranged: 0.15 } },
    { t: 240, every: 0.5,  mix: { chaser: 0.5, charger: 0.25, ranged: 0.25 } },
    { t: 360, every: 0.32, mix: { chaser: 0.45, charger: 0.25, ranged: 0.3 } },
  ],
  // ngân sách: tổng "cost" quái đang sống không vượt quá BASE + t*PER_SEC (tối đa MAX); MAX_ALIVE là trần cứng
  BUDGET: { BASE: 18, PER_SEC: 0.3, MAX: 150 },
  // đợt sự kiện; form: ring = vây tròn, pack = một bầy từ một hướng, arc = hàng cung trước mặt
  WAVES: [
    { t: 60,  arch: 'chaser',  n: 8,  form: 'ring', text: 'Bầy Dã Lang vây quanh!' },
    { t: 110, arch: 'charger', n: 4,  form: 'pack', text: 'Hỏa Hồ kéo đến — coi chừng chúng lao!' },
    { t: 170, arch: 'ranged',  n: 5,  form: 'arc',  text: 'Huyền Băng Thú dàn hàng bắn băng tiễn!' },
    { t: 230, arch: 'chaser',  n: 16, form: 'ring', text: 'Vòng vây thứ hai!' },
    { t: 290, arch: 'charger', n: 6,  form: 'pack', text: 'Bầy Hỏa Hồ!' },
    { t: 350, arch: 'ranged',  n: 8,  form: 'arc',  text: 'Mưa băng tiễn!' },
    { t: 410, arch: 'chaser',  n: 22, form: 'ring', text: 'Yêu triều!' },
  ],
  ELITE: { FIRST: 180, EVERY: 90, MAX_ALIVE: 2, TEXT: 'Ma Ảnh tinh anh xuất hiện!' },
  RING_R: 175, PACK_R: 200, ARC_R: 170,
};

// Kiểu quái trong bí cảnh. tier = loài (màu sprite): 0 Dã Lang, 1 Hỏa Hồ, 2 Huyền Băng Thú, 3 Ma Ảnh.
// hp/dmg/speed/xp là hệ số nhân trên công thức chung (RUN.ENEMY). cost dùng cho ngân sách director.
export const ARCH = {
  chaser:  { tier: 0, cost: 1, hp: 1,   dmg: 1,   speed: 1,    xp: 1 },
  // lao: đứng lại gồng (cảnh báo đường lao), rồi lao thẳng theo hướng đã khóa
  charger: { tier: 1, cost: 2, hp: 1.3, dmg: 1,   speed: 0.85, xp: 2,
    TRIGGER: 105, WINDUP: 0.75, DASH_SPEED: 230, DASH_TIME: 0.45, DASH_DMG: 1.6, RECOVER: 0.8, CD: 2.6, HIT_R: 11 },
  // bắn xa: giữ khoảng cách, gồng (cảnh báo đường bắn), bắn băng tiễn theo hướng đã khóa; cây/đá chặn đạn.
  // Chỉ bắn khi đang trong khung nhìn quanh người chơi (ONSCREEN_X/Y, màn 480×270) — không bắn lén từ ngoài màn.
  ranged:  { tier: 2, cost: 2, hp: 0.8, dmg: 1,   speed: 0.8,  xp: 2,
    KEEP_MIN: 95, KEEP_MAX: 150, FIRE_RANGE: 175, WINDUP: 0.6, CD: 2.8, ONSCREEN_X: 215, ONSCREEN_Y: 115, SHOT_SPEED: 105, SHOT_LIFE: 2.4, SHOT_DMG: 1.2, SHOT_R: 6 },
  // tinh anh: trâu, đập đất vùng tròn sau khi gồng (vòng cảnh báo lớn dần)
  elite:   { tier: 3, cost: 8, hp: 10,  dmg: 1.5, speed: 0.9,  xp: 12,
    TRIGGER: 50, WINDUP: 1.0, SLAM_R: 46, SLAM_DMG: 2.2, RECOVER: 0.5, CD: 4.5 },
};
