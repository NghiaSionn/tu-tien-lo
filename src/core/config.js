// Mọi thông số gameplay. Các con số có nhãn [THỬ NGHIỆM] trong GDD là mặc định để playtest, không phải luật cuối.

// M7-04: phiên bản ghi vào log playtest (đổi khi phát hành bản thử mới)
export const BUILD = '0.4.0-m7';

export const FEATURES = {
  run: true,            // M1: cổng bí cảnh + vòng run roguelite. false = game chạy như v0.1
  manualAttackInRun: true,
  pixelfxAssets: true,  // dùng sheet pixelfx cho cổng bí cảnh. false = cổng vẽ bằng code như cũ
  resultGoals: true,
  draftReroll: true,    // M7-09 [GIẢ THUYẾT H4]: mỗi run có RUN.REROLLS lượt đổi bảng thẻ (miễn phí, không mua được). false = không có nút
  draftSynergy: false,
  sectHub: false,       // M8: sảnh chờ tông môn (đi tới từng khu thay hàng nút). Đang xây — mặc định TẮT; false = động phủ cũ y hệt
  bossRemix: true,      // M7-13 [GIẢ THUYẾT H7]: mỗi boss thêm 1 chiêu phối từ cảnh báo có sẵn, chỉ từ độ khó BOSS.REMIX_MIN_DIFF. false = như cũ
  lore: true,           // M7-14 [GIẢ THUYẾT H8]: Bia Truyền Thừa (phím L) — mẩu truyện mở theo mốc. false = ẩn nút, không báo
  runVariants: true,    // M7-10 [GIẢ THUYẾT H5]: mỗi lượt bốc ngẫu nhiên (theo seed) một biến thể bí cảnh, báo luật ở màn chuẩn bị. false = luôn Bình thường  // M7-09 [GIẢ THUYẾT H4]: thẻ công pháp mới ghép được tiến hóa với công pháp đang có nặng ×RUN.SYNERGY_MULT. Tắt tới khi playtest    // M7-07 [GIẢ THUYẾT H2]: màn kết quả hiện tối đa 2 mục tiêu meta + nút Tọa thiền/Đột phá/Vào bí cảnh mới. false = như cũ
};

// 12/11 (chơi tay): 480×270 -> 640×360 = thu camera 1,33 lần, nhân vật/quái nhỏ lại trên màn, thấy rộng hơn
export const VIEW = { W: 640, H: 360 };
export const TILE = 16;

export const HUB = {
  MW: 80, MH: 60, SEED: 20261110,
  SAFE_TILES: 7,            // bán kính vùng an toàn (ô)
  FORM_R: 34,               // bán kính tụ linh trận (px)
  RESPAWN: { dx: 0, dy: 26 },
  PORTAL: { dx: 0, dy: -88, r: 22 },   // cổng bí cảnh, tính từ tâm trận
  BIA: { dx: -64, dy: -62, r: 24 },    // M7-14: Bia Truyền Thừa (vùng cỏ trống quanh trận), đứng trong r rồi E để đọc
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

// M3-01: tọa thiền CHUYỂN HÓA linh khí (mang về từ bí cảnh) thành tu vi. Hết linh khí thì chỉ còn dòng rất nhỏ trong tụ linh trận.
export const MEDITATION = {
  BASE: 2, PER_L: 0.15, FORMATION_MULT: 3, HEAL: 0.05, IDLE_HEAL: 0.008,
  CONVERT: 4,                 // linh khí chuyển hóa mỗi giây ×(1 + PER_L·L), ×FORMATION_MULT trong tụ linh trận [THỬ NGHIỆM]
  YIELD: 1.5, YIELD_OUTSIDE: 0.8,   // tu vi nhận được trên 1 linh khí: trong trận / ngoài trận
  TRICKLE: 0.1,               // hết linh khí: tu vi = TRICKLE × tốc độ cũ (BASE…), CHỈ trong tụ linh trận (chống AFK vô hạn)
};

// Tụ Khí Đan (M3-01): ngưng tụ linh khí — dùng thì +linh khí, đủ để thiền trong tụ linh trận được PILL_FRACTION ngưỡng tu vi bậc hiện tại
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
  ARENA_W: 56, ARENA_H: 56,   // nới theo khung nhìn 640×360 (cũ 44×44 với 480×270)
  TIME_LIMIT: 900,              // trần an toàn: chưa hạ boss cuối sau 15 phút -> kết thúc 'TIMEOUT' (thắng = hạ boss, BOSS.FINAL)
  START_SKILLS: ['sword_qi', 'fire_orb', 'thunder_strike'],
  MAX_ACTIVE: 4, MAX_PASSIVE: 4,
  REROLLS: 1, SYNERGY_MULT: 1.3,   // M7-09 [THỬ NGHIỆM]
  XP_BASE: 4, XP_GROWTH: 1.13, XP_LINEAR: 1,
  MAGNET: 56, PICKUP: 10, ORB_SPEED: 160,
  REGEN: 0.005,                 // hồi khí huyết mỗi giây trong run (tỉ lệ khí huyết tối đa)
  SPAWN: { MAX_ALIVE: 90, DIST_MIN: 330, DIST_MAX: 410 },   // ngoài khung nhìn 640×360 (nửa chéo ~367)   // nhịp sinh nằm ở DIRECTOR
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
    { t: 55,  every: 1.05, mix: { chaser: 0.8, charger: 0.2 } },
    { t: 110, every: 0.8,  mix: { chaser: 0.6, charger: 0.25, ranged: 0.15 } },
    { t: 210, every: 0.55, mix: { chaser: 0.5, charger: 0.25, ranged: 0.25 } },
    { t: 300, every: 0.4,  mix: { chaser: 0.45, charger: 0.25, ranged: 0.3 } },
  ],
  // ngân sách: tổng "cost" quái đang sống không vượt quá BASE + t*PER_SEC (tối đa MAX); MAX_ALIVE là trần cứng
  BUDGET: { BASE: 18, PER_SEC: 0.3, MAX: 150 },
  // đợt sự kiện; form: ring = vây tròn, pack = một bầy từ một hướng, arc = hàng cung trước mặt.
  // M2-04: run 6–8 phút (Lang Vương 3:30, Yêu Vương 6:00) nên các đợt dồn về trước 6:00
  WAVES: [
    { t: 55,  arch: 'chaser',  n: 8,  form: 'ring', text: 'Bầy Dã Lang vây quanh!' },
    { t: 100, arch: 'charger', n: 4,  form: 'pack', text: 'Hỏa Hồ kéo đến — coi chừng chúng lao!' },
    { t: 150, arch: 'ranged',  n: 5,  form: 'arc',  text: 'Huyền Băng Thú dàn hàng bắn băng tiễn!' },
    { t: 250, arch: 'chaser',  n: 14, form: 'ring', text: 'Vòng vây thứ hai!' },
    { t: 290, arch: 'charger', n: 6,  form: 'pack', text: 'Bầy Hỏa Hồ!' },
    { t: 330, arch: 'ranged',  n: 7,  form: 'arc',  text: 'Mưa băng tiễn — Yêu Vương sắp tới!' },
  ],
  ELITE: { FIRST: 165, EVERY: 90, MAX_ALIVE: 2, TEXT: 'Ma Ảnh tinh anh xuất hiện!' },
  RING_R: 235, PACK_R: 265, ARC_R: 225,   // ×1,33 theo khung nhìn 640×360: đội hình hiện sát mép màn như cũ
};

// M7-10 [GIẢ THUYẾT H5][THỬ NGHIỆM]: biến thể bí cảnh — cùng rừng/quái/boss, khác luật. Mọi hệ số cố định (không cộng dồn theo thời gian).
// Bốc theo seed của lượt (luồng ngẫu nhiên riêng, không làm lệch run.rng). weight: tỉ lệ bốc.
// mods: xp (chiến ý nhặt), enemySpeed (quái thường, không gồm boss), spawnEvery (nhịp sinh lẻ, <1 = dày hơn),
//       waveForm/waveN (đổi đội hình + số con các đợt), eliteFirst/eliteEvery/eliteMax (tinh anh),
//       reward (nhân mọi phần thưởng), winReward (nhân thêm khi thắng)
export const RUN_VARIANTS = {
  thuong:     { name: 'Bình thường', weight: 2, mods: {}, rules: ['Bí cảnh như mọi khi.'] },
  linh_trieu: { name: 'Linh Triều', weight: 1, mods: { xp: 1.4, enemySpeed: 1.15 },
    rules: ['Chiến ý nhặt được ×1,4 — lên cấp nhanh hơn', 'Yêu thú chạy nhanh hơn 15%'] },
  ma_anh:     { name: 'Ma Ảnh Xâm Lấn', weight: 1, mods: { eliteFirst: 100, eliteEvery: 0.6, eliteMax: 3, winReward: 1.3 },
    rules: ['Tinh anh Ma Ảnh tới sớm (1:40) và dày hơn, tối đa 3 con', 'Vượt bí cảnh: thưởng ×1,3 (tinh anh rơi thêm luyện liệu)'] },
  phong_linh: { name: 'Phong Linh Loạn Lưu', weight: 1, mods: { spawnEvery: 0.9, waveForm: 'ring', waveN: 1, reward: 1.15 },   // 13/11 sim: 0,85/1,2 -> Hỏa+Phong 5/16 (gốc 11/16) — quá gắt
    rules: ['Mọi đợt yêu thú đều vây tròn từ bốn phía', 'Yêu thú lẻ kéo tới dày hơn 10%', 'Thưởng ×1,15'] },
};

// Kiểu quái trong bí cảnh. tier = loài (màu sprite): 0 Dã Lang, 1 Hỏa Hồ, 2 Huyền Băng Thú, 3 Ma Ảnh.
// hp/dmg/speed/xp là hệ số nhân trên công thức chung (RUN.ENEMY). cost dùng cho ngân sách director.
export const ARCH = {
  chaser:  { tier: 0, cost: 1, hp: 1,   dmg: 1,   speed: 1,    xp: 1 },
  // lao: đứng lại gồng (cảnh báo đường lao), rồi lao thẳng theo hướng đã khóa
  charger: { tier: 1, cost: 2, hp: 1.3, dmg: 1,   speed: 0.85, xp: 2,
    TRIGGER: 105, WINDUP: 0.75, DASH_SPEED: 230, DASH_TIME: 0.45, DASH_DMG: 1.6, RECOVER: 0.8, CD: 2.6, HIT_R: 11 },
  // bắn xa: giữ khoảng cách, gồng (cảnh báo đường bắn), bắn băng tiễn theo hướng đã khóa; cây/đá chặn đạn.
  // Chỉ bắn khi đang trong khung nhìn quanh người chơi (ONSCREEN_X/Y, màn 640×360) — không bắn lén từ ngoài màn.
  ranged:  { tier: 2, cost: 2, hp: 0.8, dmg: 1,   speed: 0.8,  xp: 2,
    KEEP_MIN: 95, KEEP_MAX: 150, FIRE_RANGE: 175, WINDUP: 0.6, CD: 2.8, ONSCREEN_X: 295, ONSCREEN_Y: 155, SHOT_SPEED: 105, SHOT_LIFE: 2.4, SHOT_DMG: 1.2, SHOT_R: 6 },
  // tinh anh: trâu, đập đất vùng tròn sau khi gồng (vòng cảnh báo lớn dần)
  elite:   { tier: 3, cost: 8, hp: 10,  dmg: 1.5, speed: 0.9,  xp: 12,
    TRIGGER: 50, WINDUP: 1.0, SLAM_R: 46, SLAM_DMG: 2.2, RECOVER: 0.5, CD: 4.5 },
};

// ---------- Boss (M2-02) [THỬ NGHIỆM] ----------
// hp/dmg/speed nhân trên công thức quái thường tại thời điểm xuất hiện (RUN.ENEMY, grade 2). Mọi chiêu có pha gồng + cảnh báo;
// sau mỗi chiêu boss "sơ hở" RECOVER giây, nhận thêm sát thương VULN_MULT. Một đòn không quá HIT_CAP máu tối đa.
export const BOSS = {
  HIT_CAP: 0.03, VULN_MULT: 1.5, STUCK_TIME: 2, TELEPORT_R: 110,
  // 12/11 (chơi tay: boss phải to): sprite vẽ ×2 (~100 px). Thân to -> trúng đòn rộng hơn, nhắm vào giữa thân, cắn từ xa hơn
  DRAW_SCALE: 2, BODY: { hitR: 14, aimY: 24, reach: 20 },
  TRICKLE_MULT: 2,              // khi boss còn sống, quái thường sinh thưa hơn bấy nhiêu lần; không có tinh anh
  REMIX_MIN_DIFF: 1,            // M7-13: chiêu phối chỉ có từ độ khó Linh (Phàm giữ nguyên để người mới học chiêu gốc)
  MINI: {
    AT: 210, name: 'Lang Vương', tier: 0, hp: 40, dmg: 1.4, speed: 0.95, xp: 40, size: 3,
    GAP: 1.6, RECOVER: 1.4, ORDER: ['dash', 'dash', 'howl'],
    DASH: { WINDUP: 0.75, SPEED: 260, TIME: 0.42, REST: 0.35, COUNT: 3, DMG: 1.3, HIT_R: 22 },   // 16 -> 22: thân ×2
    HOWL: { WINDUP: 0.9, N: 4, R: 40 },
    // M7-13 "Hú bầy rồi lao": hú (cảnh báo vòng 0,9 s) xong nối ngay COUNT cú lao (mỗi cú vẫn gồng + đường cảnh báo DASH.WINDUP)
    REMIX: { ORDER: ['dash', 'howlDash', 'dash', 'howl'], HOWL_DASH: { COUNT: 2 } },
  },
  FINAL: {
    AT: 360, name: 'Ma Ảnh Yêu Vương', tier: 3, hp: 70, dmg: 1.6, speed: 0.8, xp: 0, size: 3,
    GAP: 1.3, RECOVER: 1.3, ORDER: ['burst', 'zones'],
    SLAM: { WINDUP: 1.25, R: 48, DMG: 2.0, TRIGGER: 55 },   // M2-04: R64 gần như không chạy kịp khi boss áp sát
    BURST: { WINDUP: 0.85, N: 12, N2: 16, SPEED: 80, LIFE: 3, DMG: 1.2 },
    ZONES: { WINDUP: 1.4, N: 3, N2: 4, R: 26, SPREAD: 55, DMG: 1.6 },   // M2-04: chơi thử chết nhiều nhất vì chiêu này -> gồng lâu hơn, vùng nhỏ hơn
    PHASE2: 0.5, PHASE2_GAP: 0.7,            // dưới 50% máu: nghỉ ngắn hơn, nhiều đạn/vùng hơn
    ENRAGE_AFTER: 150, ENRAGE_GAP: 0.5, ENRAGE_DMG: 1.5, MAX_HAZARDS: 12,
    // M7-13 "Ma Ảnh Lao Tù": N vùng nổ khép vòng bán kính RING quanh người chơi (giữa vòng an toàn), gồng WINDUP;
    // lúc nổ boss bắn BURST_N tia đạn thưa (cảnh báo tia như chiêu bắn). Không cộng dồn với zones cùng lúc.
    REMIX: { ORDER: ['burst', 'prison', 'zones'], PRISON: { WINDUP: 1.5, N: 6, RING: 46, R: 24, DMG: 1.6, BURST_N: 8 } },
  },
};

// ---------- Phần thưởng run (M2-03) [THỬ NGHIỆM] ----------
// Thua/rời vẫn nhận theo tiến độ (quái, cấp, thời gian, boss đã hạ); thắng nhân WIN_MULT + vé. Nhân thêm theo cảnh giới.
export const REWARD = {
  STONE: { PER_KILL: 0.1, PER_LEVEL: 2, PER_MIN: 3 },      // linh thạch (1 viên đan = 25)
  LINGQI_PER_MIN: 6,                                        // linh khí (sẽ đổi ra tu vi khi tọa thiền, M3)
  MATS_PER_ELITE: 1,                                        // luyện liệu (luyện khí, M4)
  BOSS: {
    MINI:  { linhThach: 25,  lingQi: 20, craftMats: 2, tickets: 0 },
    FINAL: { linhThach: 80,  lingQi: 60, craftMats: 5, tickets: 1 },
  },
  WIN_MULT: 1.5,
  FIRST_CLEAR_TICKETS: 1,                                   // lần đầu hạ Yêu Vương
  REALM_MULT: 0.1,                                          // +10% mỗi tầng cảnh giới
  LOG_KEEP: 30,                                             // nhớ id các run đã nhận gần nhất (chống nhận trùng)
};

// ---------- Thiên kiếp tương tác (M3-03) [THỬ NGHIỆM] ----------
// Khoảng 24 giây, 3 nhịp. dmg = tỉ lệ khí huyết tối đa mỗi đòn trúng. Thua: giữ cảnh giới, mất FAIL_KEEP tu vi như cũ.
export const TRIBULATION = {
  ENABLED: true,             // false = quay về lôi kiếp xổ số cũ (REALM.MAJOR_CHANCE) — đường rollback
  ARENA_R: 96,               // trận thử thách quanh tụ linh trận; người chơi bị giữ trong vòng
  SECT_ARENA_R: 88,          // M8: sảnh tông môn — vòng vừa mặt sàn bệ pháp đài (bệ thu nhỏ 14/11, người phát triển chọn thu vòng theo)
  PHASES: [
    { name: 'Lôi ấn',   kind: 'marks', dur: 8, every: 1.1, n: 3, r: 22, windup: 1.2, dmg: 0.16 },
    { name: 'Lôi xà',   kind: 'lines', dur: 8, every: 1.5, lines: 2, w: 16, windup: 1.2, dmg: 0.18 },
    { name: 'Thiên lôi', kind: 'storm', dur: 8, every: 2.4, gaps: 3, safeR: 22, reach: 80, windup: 1.6, dmg: 0.28 },
  ],
  FAIL_KEEP: 0.7, FAIL_HP: 0.3,
};

// ---------- Mở khóa theo đại cảnh giới + độ khó bí cảnh (M3-02) [THỬ NGHIỆM] ----------
// Đại cảnh giới mở biến thể (công pháp khởi đầu mới) và độ khó bí cảnh mới — không khóa lối chơi đầu.
export const REALM_UNLOCKS = {
  9:  { skills: ['sword_array'], tier: 1, text: 'Khởi đầu bằng Phi Kiếm Trận · bí cảnh độ khó Linh' },
  12: { skills: ['body_aura'],   tier: 2, text: 'Khởi đầu bằng Hộ Thể Cương Khí · bí cảnh độ khó Huyền' },
  15: { skills: ['fire_ring'],   tier: 3, text: 'Khởi đầu bằng Hỏa Luân · bí cảnh độ khó Thiên' },
};
// enemy: nhân máu/sát thương quái + boss; reward: nhân linh thạch/linh khí/luyện liệu
export const DIFFICULTY = [
  { name: 'Phàm',  enemy: 1,   reward: 1 },
  { name: 'Linh',  enemy: 1.3, reward: 1.5 },
  { name: 'Huyền', enemy: 1.6, reward: 2.0 },
  { name: 'Thiên', enemy: 1.8, reward: 2.8 },
];

// ---------- Linh Mạch — điểm nghỉ trong bí cảnh (M3-04) [THỬ NGHIỆM] ----------
// Hiện ra khi hạ Lang Vương. Một lần mỗi run, chọn 1 trong 3; bị phong ấn (không dùng được) khi có boss đang sống.
export const SHRINE = { R: 20, HEAL: 0.5, DMG_BUFF: 0.2, QI: 60 };

// ---------- Truyền Thừa Các (M4-03) — chỉ dùng vé Cơ Duyên kiếm trong game, KHÔNG có tiền thật ----------
// Tỉ lệ hiển thị nguyên văn trong UI. Bảo hiểm: lượt thứ PITY không ra Cực phẩm thì chắc chắn Cực phẩm.
export const GACHA = {
  COST: 1,
  RATES: { common: 0.70, rare: 0.25, epic: 0.05 },
  PITY: 30,
  DUP_SHARDS: { rare: 5, epic: 15 },                   // trùng -> Bí Kíp Tàn Thiên (mảnh)
  SHOP: { item: 20, skill: 40 },                        // đổi mảnh lấy đúng món/công pháp mình chọn
  COMMON: [{ kind: 'craftMats', n: 5 }, { kind: 'linhThach', n: 100 }, { kind: 'lingQi', n: 60 }],
  EPIC_SKILLS: ['ice_needle', 'ice_nova'],
  HISTORY: 50,
};
