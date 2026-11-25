// Mọi thông số gameplay. Các con số có nhãn [THỬ NGHIỆM] trong GDD là mặc định để playtest, không phải luật cuối.

// M7-04: phiên bản ghi vào log playtest (đổi khi phát hành bản thử mới)
export const BUILD = '0.5.0-m9b';

export const FEATURES = {
  run: true,            // M1: cổng bí cảnh + vòng run roguelite. false = game chạy như v0.1
  manualAttackInRun: true,
  pixelfxAssets: true,  // dùng sheet pixelfx cho cổng bí cảnh. false = cổng vẽ bằng code như cũ
  resultGoals: true,
  draftReroll: true,    // M7-09 [GIẢ THUYẾT H4]: mỗi run có RUN.REROLLS lượt đổi bảng thẻ (miễn phí, không mua được). false = không có nút
  draftSynergy: false,
  sectHub: true,        // M8: sảnh chờ tông môn (đi tới từng khu thay hàng nút). BẬT mặc định từ 14/11 (người phát triển); false hoặc ?sect=0 = động phủ cũ y hệt
  bossRemix: true,      // M7-13 [GIẢ THUYẾT H7]: mỗi boss thêm 1 chiêu phối từ cảnh báo có sẵn, chỉ từ độ khó BOSS.REMIX_MIN_DIFF. false = như cũ
  lore: true,           // M7-14 [GIẢ THUYẾT H8]: Bia Truyền Thừa (phím L) — mẩu truyện mở theo mốc. false = ẩn nút, không báo
  aiDebug: false,       // M10-03: lớp debug AI (trạng thái, ý định, điểm khóa, ngân sách đe dọa). Chỉ dev: ?aidebug=1
  enemySkillsV2: false, // M10-B: kỹ năng mới của quái thường (M10-04 Dã Lang săn theo đàn…). OFF = hành vi cũ. Thử: ?skills2=1 (nên kèm ?tactics=1)
  bossPatternsV2: true,  // (24/11) người phát triển bật mặc định (đợt 1 Tuyệt Kỹ). M10-C: boss 2 pha / nhiều chiêu (M10-09 Lang Vương…). OFF = boss M9/M10-02. Thử: ?boss2=1 (kèm ?tactics=1)
  bossCutscene: true,   // (23/11) cutscene xuất hiện boss (Lang Vương hú trên cao rồi nhảy đáp đất + bảng tên). false = boss hiện ra ngay như cũ
  enemyTactics: false,  // M10-02: bộ chọn chiêu theo tình huống + ngân sách đe dọa (TACTICS). OFF = AI M9 y nguyên; bật mặc định sau GATE M10-A khi người phát triển duyệt. Thử: ?tactics=1
  rooms: false,         // (17/11) người phát triển quay về đấu trường sinh tồn kiểu Pokémon Survival — giữ code để bật lại. M9-B: bí cảnh nhiều phòng kiểu Soul Knight (sơ đồ ngẫu nhiên theo seed, khóa cửa tới khi dọn phòng, minimap). false = đấu trường sinh tồn cũ
  runVariants: true,    // M7-10 [GIẢ THUYẾT H5]: mỗi lượt bốc ngẫu nhiên (theo seed) một biến thể bí cảnh, báo luật ở màn chuẩn bị. false = luôn Bình thường  // M7-09 [GIẢ THUYẾT H4]: thẻ công pháp mới ghép được tiến hóa với công pháp đang có nặng ×RUN.SYNERGY_MULT. Tắt tới khi playtest    // M7-07 [GIẢ THUYẾT H2]: màn kết quả hiện tối đa 2 mục tiêu meta + nút Tọa thiền/Đột phá/Vào bí cảnh mới. false = như cũ
};

// 12/11 (chơi tay): 480×270 -> 640×360 = thu camera 1,33 lần, nhân vật/quái nhỏ lại trên màn, thấy rộng hơn
export const VIEW = { W: 640, H: 360 };
export const TILE = 16;

export const HUB = {
  MW: 80, MH: 60, SEED: 20261110,
  SAFE_TILES: 7,            // bán kính vùng an toàn (ô)
  FORM_R: 34,               // bán kính tụ linh trận (px) — động phủ cũ
  SECT_FORM: { rx: 92, ry: 50 },   // M8: sảnh tông môn — vùng ngồi thiền = elip mặt trận (sprites/tm_tran, 203×120 px)
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
  REGEN: 0.004,                 // M9-A: 0,005 -> 0,004 (game quá dễ). hồi khí huyết mỗi giây trong run (tỉ lệ khí huyết tối đa)
  SPAWN: { MAX_ALIVE: 90, DIST_MIN: 330, DIST_MAX: 410 },   // ngoài khung nhìn 640×360 (nửa chéo ~367)   // nhịp sinh nằm ở DIRECTOR
  ENEMY: { HP_BASE: 18, HP_TIME: 0.005, DMG_BASE: 3.5, DMG_TIME: 0.002, SPEED: 36, SPEED_TIME: 0.045, REALM_SCALE: 0.9 },   // M9-A: đánh đau + nhanh hơn (cũ DMG 3/0,0016, SPEED 34/0,04, HP_TIME 0,0045)
  SEPARATION: { R: 11, BOSS_R: 26, PUSH: 70 },   // (17/11) quái đẩy tách nhau: khoảng cách tối thiểu (px), boss chiếm chỗ rộng, tốc độ đẩy tối đa (px/s)
  CHAIN_BUDGET_PER_TICK: 24,    // tổng số lần nhảy sét tối đa mỗi khung (chặn chuỗi vô hạn)
  MAX_PROJECTILES: 220, MAX_ZONES: 40, MAX_ORBS: 300,
  BURN_MAX_DPS_MULT: 1,         // thiêu đốt không cộng dồn: chỉ giữ dps lớn nhất
  SLOW_MAX: 0.6,
  DRAFT_INPUT_DELAY: 0.25,      // giây khóa input khi vừa mở bảng thẻ (chống bấm nhầm/bấm đúp)
  MAX_ENEMY_SHOTS: 120,
};

// ---------- M9-B: bí cảnh nhiều phòng [THỬ NGHIỆM] ----------
// Sơ đồ: lưới GRID ô, mỗi ô CELL ô gạch chứa tối đa 1 phòng; phòng nối với ô kề bằng hành lang rộng CORRIDOR (cây 2 bên).
// Loại phòng: start (an toàn), combat, elite (tinh anh), mini (Lang Vương, giữa đường chính), reward (rương: hồi máu + linh thạch),
// shrine (Linh Mạch), boss (Ma Ảnh Yêu Vương, phòng xa nhất). Vào phòng chiến đấu: cửa phong ấn tới khi hạ hết các đợt.
// Sức quái tính theo "thời gian quy đổi" T_PER_DEPTH × độ sâu phòng (dùng lại công thức RUN.ENEMY/DIRECTOR như chế độ cũ).
export const ROOMS = {
  GRID: [5, 4], CELL: [58, 40], ROOM_W: [40, 50], ROOM_H: [26, 32], CORRIDOR: 5, BOSS_ROOM: [52, 34],   // (17/11) phòng rộng hơn; phòng 2 boss to nhất
  COUNT: [8, 10], MIN_BOSS_DEPTH: 4,
  WAVES: { combat: [2, 4], elite: 2, mini: 1, boss: 1 },   // combat: phòng độ sâu 1 = 2 đợt, sâu dần +1 (tối đa 4)
  WAVE_N: { base: 3, perDepth: 5, max: 36 }, WAVE_GAP: 0.9, WAVE_OVERLAP: 0.3,   // đợt sau ập tới khi đợt trước còn ≤ 30% (không chờ chết hết)
  SPAWN_SPREAD: 1.2,           // giây: quái một đợt hiện rải trong khoảng này (có vòng báo trước), không bật ra cùng lúc
  HP_PER_DEPTH: 0.26, DMG_PER_DEPTH: 0.32, BOSS_HP: 2.0,   // quái phòng độ sâu d: máu ×(1 + d·HP_PER_DEPTH), sát thương ×(1 + d·DMG_PER_DEPTH); boss máu ×BOSS_HP
  BOSS_TRICKLE: { EVERY: 2.4, MAX: 8 },   // phòng boss/tinh anh: quái thường lai rai kéo tới suốt trận (như đấu trường), tối đa MAX con
  XP_MULT: 2.2,                // chiến ý mỗi con ×: ít quái hơn đấu trường nhưng vẫn đủ cấp để chọn thẻ/tiến hóa
  T_FIRST: 20, T_PER_DEPTH: 95, T_MAX: 340, T_BOSS: { MINI: 210, FINAL: 360 },   // thời gian quy đổi = T_FIRST + (độ sâu − 1) × T_PER_DEPTH: phòng đầu chỉ quái đuổi
  ENTER_INSET: 1.5,            // ô: phải vào sâu bấy nhiêu mới khóa cửa (không khóa khi đứng ở ngưỡng cửa)
  SPAWN_MIN_DIST: 120,         // px: quái mới không hiện sát người chơi (ưu tiên chỗ xa nhất trong vài lần thử)
  REWARD: { HEAL: 0.3, STONES: 30, XP: 30 },
  STALL: { T: 12, MAX: 4 },    // chống kẹt: còn ≤ MAX quái, T giây không hạ được con nào -> đưa chúng lại chỗ đi được trong phòng
  CLEAR_HEAL: 0,               // dọn xong một phòng chiến đấu: hồi bấy nhiêu khí huyết (0 = không; hồi ở phòng thưởng/Linh Mạch)
};

// ---------- Director bí cảnh (M2-01) [THỬ NGHIỆM] ----------
// Độ khó tăng nhờ hành vi (kiểu quái) + bố cục (đợt vây, bầy lao, hàng bắn xa), không chỉ nhân HP.
export const DIRECTOR = {
  SAFE_R: 150,                  // không sinh quái gần người chơi hơn khoảng này
  // giai đoạn: nhịp sinh (giây/con, nội suy tới giai đoạn sau) và tỉ lệ kiểu quái
  PHASES: [
    // M9-A: dày hơn + quái lao/bắn xa tới sớm hơn (cũ 1,3/1,05/0,8/0,55/0,4; lao từ 55 s, bắn từ 110 s)
    { t: 0,   every: 1.2,  mix: { chaser: 1 } },   // đầu lượt chỉ quái đuổi (người mới làm quen)
    { t: 30,  every: 1.12, mix: { chaser: 0.85, charger: 0.15 } },
    { t: 50,  every: 1.0,  mix: { chaser: 0.75, charger: 0.25 } },
    { t: 80,  every: 0.75, mix: { chaser: 0.6, charger: 0.25, ranged: 0.15 } },
    { t: 200, every: 0.5,  mix: { chaser: 0.5, charger: 0.25, ranged: 0.25 } },
    { t: 300, every: 0.36, mix: { chaser: 0.45, charger: 0.25, ranged: 0.3 } },
  ],
  // ngân sách: tổng "cost" quái đang sống không vượt quá BASE + t*PER_SEC (tối đa MAX); MAX_ALIVE là trần cứng
  BUDGET: { BASE: 22, PER_SEC: 0.4, MAX: 180 },   // M9-A (cũ 18/0,3/150)
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
  ELITE: { FIRST: 130, EVERY: 75, MAX_ALIVE: 2, TEXT: 'Ma Ảnh tinh anh xuất hiện!' },
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

// ---------- M10-02: AI chiến thuật [THỬ NGHIỆM] (chỉ khi FEATURES.enemyTactics) ----------
export const TACTICS = {
  THINK: [0.15, 0.3],                 // giây: nhịp đánh giá so le giữa các con (không đánh giá mỗi khung)
  BUDGET: { NORMAL: 2, NORMAL_HIGH: 3, BOSS_HEAVY: 1 },   // trong khung nhìn: tối đa đòn đặc biệt quái thường đang gồng/lao (độ khó Huyền+ dùng NORMAL_HIGH), chiêu boss nặng
  RETRY: 0.35,                        // giây: hết ngân sách -> quái thử gồng lại sau bấy nhiêu
  HEAVY: { slam: 1, zones: 1, prison: 1, burst: 1, howlDash: 1, leap: 1, sweep: 1, cross: 1, bloodDash: 1, comboClaw: 1, quake: 1, hunt: 1, cracks: 1, rageHowl: 1, thunder: 1, eight: 1, runes: 1, chainBolt: 1, clones: 1, doubleSweep: 1, net: 1 },   // chiêu boss tính là "nặng"
  MAX_REPEAT: 2,                      // boss không dùng một chiêu quá 2 lần liên tiếp
  MAX_SUMMONED: 8,                    // sói do Lang Vương gọi còn sống tối đa (không hú thêm)
  SLAM_RANGE_MULT: 1.6,               // Chấn Địa hợp lệ khi người chơi trong TRIGGER × hệ số
  SKILL_CD: { FINAL: { slam: 6, prison: 9, shadow: 8, sweep: 7, cross: 7, summon: 12, thunder: 6, eight: 7, runes: 9, chainBolt: 6, clones: 9, doubleSweep: 10, net: 9 }, MINI: { howl: 8, claw: 3, leap: 6, bloodDash: 6, comboClaw: 5, quake: 8, hunt: 8, cracks: 6, rageHowl: 9 } },   // giây (theo tuổi boss): hồi chiêu riêng, chống spam
  // M10-03: chống chồng đòn bất công
  BUDGET_DURING_HEAVY: 1,             // khi boss đang gồng chiêu nặng hoặc người chơi đang đứng trong vùng cảnh báo: quái thường chỉ 1 đòn đặc biệt trên màn
  ESCAPE: { SPEED_MUL: 0.6, DIRS: 12, MARGIN: 4 },
  NEW_ESCAPE_T: 0.5,                  // M10-08: quái thường chỉ được gồng đòn mới nếu người chơi vẫn còn điểm an toàn trong tầm đi bộ bấy nhiêu giây (16 hướng × 2 tầm)   // vùng mới phải chừa lối thoát: điểm an toàn trong tầm đi bộ (tốc độ × thời gian gồng × hệ số)
  BLINK_WARN: 0.8, BLINK_GRACE: 0.6,  // boss giải kẹt: báo trước điểm hiện ra bấy nhiêu giây; hiện ra xong chưa cắn ngay trong GRACE giây
};

// ---------- M10-04: Dã Lang săn theo đàn [THỬ NGHIỆM] (chỉ khi FEATURES.enemySkillsV2) ----------
// Mỗi THINK giây, sói trong ENGAGE_R quanh người chơi gom thành đàn (≤ PACK_MAX, cách nhau ≤ PACK_R). Trong đàn ≥ 2 con:
// con gần nhất áp sát (press), một con vòng sang bên (flank, hướng lệch ~90°) — chỉ con flank được chồm, mỗi đàn tối đa 1 con chồm cùng lúc.
export const WOLF_PACK = {
  THINK: 0.5, ENGAGE_R: 170, PACK_R: 80, PACK_MAX: 4, MIN_PACK: 2,
  FLANK_R: 55,          // px: điểm vòng sườn cách người chơi
  FLANK_MAX: 4,         // giây: vòng quá lâu chưa tới -> thôi, quay về áp sát
  FLANK_SPEED: 1.25,    // hệ số tốc độ khi vòng sườn
  ORBIT_DA: 0.5, ORBIT_STEP: 0.6, ORBIT_SHRINK: 0.92,   // còn lệch > ORBIT_DA rad: nhắm điểm lệch thêm ORBIT_STEP rad trên vòng bán kính d×SHRINK (đi vòng, khép dần)
  FLANK_ARRIVE: 22,     // px: coi như đã tới điểm sườn
  POUNCE: { TRIGGER: 80, MIN: 26, WINDUP: 0.6, SPEED: 210, TIME: 0.32, DMG: 1.4, HIT_R: 10, RECOVER: 0.6, CD: 3.5 },   // chồm: gồng khóa hướng -> lao ngắn ~67 px
};

// ---------- M10-05: Hỏa Hồ — Hỏa Vĩ [THỬ NGHIỆM] (chỉ khi FEATURES.enemySkillsV2) ----------
// Trong cú lao, Hỏa Hồ rải các đốm lửa dọc đường. Mỗi đốm: ARM giây đầu chỉ là vòng cảnh báo (vô hại) -> cháy tới hết LIFE.
// Không đặt đốm trong SAFE_R quanh người chơi (không sinh dưới chân); người chơi dính lửa tối đa 1 lần mỗi TICK giây.
export const FOX_TRAIL = {
  EVERY: 0.07,        // giây giữa hai đốm trong cú lao (~16 px)
  R: 9,               // px bán kính đốm
  ARM: 0.4,           // giây cảnh báo trước khi đốm bắt đầu cháy
  LIFE: 2.4,          // giây tồn tại (kể cả ARM); hết là xóa sạch
  DMG: 0.35,          // × sát thương Hỏa Hồ, mỗi lần dính
  TICK: 0.6,          // giây: dính lửa nhiều đốm cùng lúc vẫn chỉ tính 1 lần mỗi TICK
  SAFE_R: 20,         // px: không đặt đốm gần người chơi hơn khoảng này (tính lúc đặt)
  MAX_PER_FOX: 7, MAX: 36,   // trần số đốm mỗi cú lao / toàn màn
  FADE: 0.35,         // giây cuối mờ dần (chỉ để vẽ)
};

// ---------- M10-06: Huyền Băng Thú — Tam Băng Tiễn [THỬ NGHIỆM] (chỉ khi FEATURES.enemySkillsV2) ----------
// Khi người chơi đủ xa (≥ MIN_D), gồng lâu hơn rồi bắn quạt 3 tiễn (giữa nhắm người chơi, hai bên lệch ±SPREAD) — đi ngang vào khe là né được.
// Mỗi con có hồi chiêu riêng; trên màn tối đa MAX_ACTIVE con cùng gồng quạt (không phải mọi con đều bắn 3 tia cùng lúc).
export const ICE_FAN = {
  MIN_D: 120,        // px: gần hơn thì bắn 1 tiễn như cũ
  SPREAD: 0.33,      // rad (~19°): ở 150 px hai tiễn cạnh nhau cách ~51 px, khe trống ~39 px
  WINDUP: 0.85,      // giây gồng (tiễn đơn 0,6)
  CD: 6,             // giây hồi chiêu quạt mỗi con (vẫn bắn tiễn đơn trong lúc chờ)
  DMG: 0.85,         // × SHOT_DMG mỗi tiễn
  MAX_ACTIVE: 1,     // con đang gồng quạt trong khung nhìn
};

// ---------- M10-07: Ma Ảnh tinh anh — Ảnh Bộ + Hắc Trảo [THỬ NGHIỆM] (chỉ khi FEATURES.enemySkillsV2) ----------
// Ảnh Bộ: người chơi ở xa -> vòng tím báo điểm đích WARN giây (Ma Ảnh đứng yên), rồi hiện ra cách người chơi LAND_R px (không sát, ô đứng được),
// sau đó sơ hở RECOVER giây và chưa cắn ngay. Hắc Trảo (từ độ khó MIN_DIFF): gồng khóa hướng, quét cung ARC trước mặt bán kính R.
export const ELITE_V2 = {
  BLINK: { MIN_D: 95, MAX_D: 240, LAND_R: 58, MIN_PLAYER: 44, WARN: 0.7, RECOVER: 0.55, BITE_GRACE: 0.8, CD: 7, TRIES: 12 },
  CLAW: { MIN_DIFF: 1, TRIGGER: 46, R: 54, ARC: 2.1, WINDUP: 0.75, DMG: 1.8, RECOVER: 0.6, CD: 5 },   // ARC rad (~120°) tổng; độ khó Linh trở lên
};

// ---------- M10-08: Director phối bầy có vai trò [THỬ NGHIỆM] (chỉ khi FEATURES.enemySkillsV2, chế độ đấu trường) ----------
// Đội hình: cứ EVERY giây (từ FIRST) sinh một đội theo vòng ORDER (chỉ mẫu đã tới mốc `from`), cùng một hướng, ngoài khung nhìn.
// Đội phải vừa ngân sách cost (budgetAt − cost đang sống); chưa vừa thì giữ chỗ: quái lẻ tạm dừng tới khi đội ra. Có boss thì nghỉ.
export const SQUADS = {
  FIRST: 60, EVERY: 38, LEAD: 6, R: 300, BACK: 45, SPREAD: 0.3,   // LEAD: giây trước giờ ra đội đã tạm dừng quái lẻ để dành ngân sách
  ORDER: ['packFlank', 'chargerRanged', 'eliteFodder'],
  TEMPLATES: {
    packFlank:     { from: 40,  units: [['chaser', 4]],                 text: 'Một bầy Dã Lang săn theo đàn!' },
    chargerRanged: { from: 95,  units: [['charger', 2], ['ranged', 2]], text: 'Hỏa Hồ xông lên, Huyền Băng Thú yểm trợ phía sau!' },
    eliteFodder:   { from: 130, units: [['elite', 1], ['chaser', 4]],   text: 'Ma Ảnh dẫn bầy Dã Lang!' },
  },
};
// specialist: chỉ một số con mỗi loài được dùng kỹ năng mới (M10-04…07), và chỉ từ mốc INTRO (giới thiệu dần).
// Gán lúc sinh: còn chỗ (số con "đặc biệt" đang sống < CAP) và đã tới INTRO thì m.spec = true, không thì false (con thường).
export const SPECIALISTS = {
  CAP: { chaser: 6, charger: 4, ranged: 3, elite: 2 },
  INTRO: { chaser: 40, charger: 100, ranged: 150, elite: 130 },   // giây: chồm / Hỏa Vĩ / Tam Băng Tiễn / Ảnh Bộ+Hắc Trảo
};

// ---------- M10-09: Lang Vương 2 pha / 5 chiêu [THỬ NGHIỆM] (chỉ khi FEATURES.bossPatternsV2) ----------
// P1 (máu > PHASE2): Tam Liên Lao, Lang Hú, Liệt Trảo. Chuyển pha đúng 1 lần: thông báo + choáng STAGGER giây (sơ hở).
// P2: thêm Vồ Đầu Đàn và Hú Rồi Lao (chiêu phối, độ khó Linh+), nghỉ giữa chiêu ngắn hơn (GAP × P2_GAP).
// (24/11, người phát triển yêu cầu) Biến hình chuyển pha 2 — cả hai boss, cả AI cũ lẫn bộ chiêu mới.
// Tụt dưới AT máu (bộ chiêu mới: BOSS_V2[kind].PHASE2) -> đứng yên ANIM giây, KHÔNG nhận sát thương; ở BURST (tỉ lệ thời gian đã qua)
// năng lượng bùng nổ (sóng xung kích chỉ là hiệu ứng, không sát thương) + thông báo; xong thì sơ hở STAGGER giây. Sau đó aura pha 2 mãi.
// Lang Vương AI cũ: pha 2 chỉ đổi hình ảnh/aura, không đổi chiêu (không đổi cân bằng).
// Nhịp T (giây, ChatGPT đề xuất): EYES mắt đỏ rực xong · POSE vào tư thế gồng · PILLAR cột năng lượng che (đổi ngoại hình bên trong)
// · BURST bùng nổ · REVEAL lộ ngoại hình pha 2 · END sói dậm đất / ma giơ tay sẵn sàng triệu hồi. AURA_WINDUP: aura còn bấy nhiêu khi gồng chiêu.
export const BOSS_P2 = {
  MINI: { AT: 0.5, ANIM: 2.0, STAGGER: 1.0, AURA_WINDUP: 0.3, TITLE: 'HUYẾT NGUYỆT CUỒNG LANG', TEXT: 'Lang Vương hóa Huyết Nguyệt Cuồng Lang!',
    T: { EYES: 0.4, POSE: 0.8, PILLAR: [0.8, 1.5], BURST: 1.3, REVEAL: 1.5, END: 1.75 } },
  FINAL: { AT: 0.5, ANIM: 2.0, STAGGER: 1.2, AURA_WINDUP: 0.3, TITLE: 'HUYẾT LÔI MA QUÂN', TEXT: 'Ma Ảnh Yêu Vương hiện chân thân — Huyết Lôi Ma Quân!',
    T: { EYES: 0.4, POSE: 0.8, PILLAR: [0.8, 1.5], BURST: 1.3, REVEAL: 1.5, END: 1.7 } },
};

export const BOSS_V2 = {
  MINI: {
    PHASE2: 0.55, STAGGER: 1.0, P2_GAP: 0.75, P2_TEXT: 'Lang Vương nổi giận — coi chừng cú vồ!',
    // Liệt Trảo Hình Quạt: gồng khóa hướng, quét cung ARC (rad) bán kính R trước mặt; sau lưng boss an toàn
    CLAW: { TRIGGER: 85, R: 72, ARC: 2.2, WINDUP: 0.8, DMG: 1.6 },
    // Vồ Đầu Đàn: dấu đáp (vùng tròn R) ở vị trí người chơi + vận tốc × LEAD (dự đoán tối đa MAX_LEAD px), gồng WINDUP, bay AIR giây
    LEAP: { MIN_D: 55, MAX_D: 290, LEAD: 0.55, MAX_LEAD: 60, R: 46, WINDUP: 1.0, AIR: 0.35, SYNC: 0.07, DMG: 1.8 },
    // (24/11) ĐỢT 2 — pha 2 "Huyết Nguyệt Cuồng Lang": ít đứng gồng, nhiều liên hoàn, ép vị trí (docs/design/BOSS_TUYET_KY_DE_XUAT.md)
    BLOOD_DASH: { COUNT: 3, WINDUP: 0.65, SPEED: 440, TIME: 0.5 },            // Huyết Ảnh Tam Xung: 3 lần lao, mỗi lần khóa hướng lại (25/11: lướt 220 px, gấp đôi lao thường)
    COMBO: { CR: 100, L: -0.55, R: 0.55, WL: 0.75, WR: 0.65, BITE_D: 48, BITE_R: 42, BITE_T: 0.9, BITE_DMG: 1.6, GAP: 0.2 },   // Cuồng Nha Liên Kích: quạt lệch trái -> phải -> cắn trước mặt
    QUAKE: { WINDUP: 1.0, N: 4, R0: 52, STEP: 44, W: 11, T0: 1.0, DT: 0.24, GAP: 0.85, DMG: 1.5 },   // Huyết Nguyệt Trấn Địa: vòng sóng nổ dần ra, chừa khe GAP rad (hướng về người chơi)
    HUNT: { GAP: 0.3 },                                                       // Lang Vương Truy Mệnh: Vồ 2 lần liền
    CRACKS: { N: 3, SPREAD: 0.55, L: 270, W: 13, T0: 1.0, DT: 0, DMG: 1.6 },   // Huyết Trảo Phá Địa: giơ vuốt cào, 3 vệt nứt + gai máu hình quạt bật lên CÙNG LÚC với cú cào
    RAGE_HOWL: { MX: 46, MY: -52, R: 110, T: 1.7, N: 3, DT: 0.3, DMG: 1.2 },                   // Cuồng Lang Bạo Khiếu (25/11): tiếng gầm R px quanh MIỆNG sói (lệch MX theo hướng mặt, MY), N nhịp dồn dập (bất tử sau trúng đòn 0,5 s -> tối đa 2 nhịp trúng)
  },
  // ---------- M10-10: Ma Ảnh Yêu Vương 2 pha / 7 chiêu (ĐÚNG 2 pha; cuồng nộ cũ chỉ là trạng thái trong P2) ----------
  // PHASE2 null = giữ ngưỡng hiện có BOSS.FINAL.PHASE2 (không đổi ngưỡng khi chưa duyệt).
  // P1: Hắc Ám Đạn Trận (burst), Hắc Diễm Truy Sát (zones), Chấn Địa (slam), Lao Tù (prison: chỉ remix, sau PRISON_AFTER giây làm quen).
  // P2: thêm Ảnh Độn (shadow), Ma Quang Hoành Tảo (sweep), Thập Tự Hắc Liệt (cross).
  FINAL: {
    PHASE2: null, STAGGER: 1.2, P2_GAP: 0.8, P2_TEXT: 'Ma Ảnh Yêu Vương hiện chân thân — coi chừng tia quét và thập tự!',
    PRISON_AFTER: 25, MAX_HAZARDS: 14,
    // Ảnh Độn: vòng tím báo điểm hiện ra WARN giây (boss đứng yên), cách người chơi MIN_R..MAX_R; hiện ra xong sơ hở, chưa cắn trong GRACE
    SHADOW: { MIN_R: 95, MAX_R: 140, WARN: 0.9, GRACE: 0.8, TRIES: 16 },
    // Ma Quang Hoành Tảo: tia dài L quét nửa vòng (ARC) trong TIME giây sau WINDUP; bắt đầu lệch SAFE_START rad khỏi người chơi.
    // Né: ra khỏi tầm L hoặc sang nửa vòng không bị quét.
    SWEEP: { WINDUP: 1.3, TIME: 1.4, ARC: 3.1416, L: 215, W: 10, SAFE_START: 1.0, DMG: 1.8 },
    // Thập Tự Hắc Liệt: hai dải nổ vuông góc (dài 2×LEN, nửa bề rộng W) giao tại vị trí người chơi lúc khóa; 4 góc chéo an toàn
    CROSS: { WINDUP: 1.4, LEN: 130, W: 14, DMG: 1.8 },
    // (24/11) ĐỢT 2 — pha 2 "Huyết Lôi Ma Quân": vùng sét đỏ nổ theo nhịp — đọc thứ tự, tìm khe, đổi vị trí
    THUNDER: { N: 4, R: 28, SPREAD: 46, T0: 0.9, DT: 0.25, DMG: 1.5 },        // Huyết Lôi Thiên Phạt: 4 điểm sét nổ tuần tự quanh người chơi
    EIGHT: { N: 8, L: 270, W: 10, T: 1.0, DMG: 1.5 },                          // Ma Lôi Bát Phương: 8 tia sét tỏa từ boss, khe giữa các tia
    RUNES: { N: 6, R: 110, W: 80, T0: 1.2, DT: 0.3, DMG: 1.5 },                // Nghịch Chuyển Ma Trận: vành 30..190 quanh boss chia 6 cung, nổ lần lượt
    CHAIN: { N: 5, STEP: 50, ZIG: 28, W: 10, T: 1.0, DMG: 1.6 },               // Huyết Lôi Liên Tỏa: đường sét gấp khúc cắt qua người chơi
    CLONES: { N: 2, D: 115, T: 1.2, SHOTS: 12, DMG: 1.2 },                    // Ma Ảnh Phân Thân: 2 bóng hai bên người chơi, mỗi bóng bắn đạn tỏa có khe
    SWEEP2: { WINDUP: 0.85, GAP: 0.4 },                                        // Diệt Thế Ma Quang: quét 2 nhịp — nhịp 2 quét tiếp NỬA VÒNG CÒN LẠI (phải đổi sang vùng vừa quét)
    NET: { N: 5, SPACING: 54, L: 310, W: 11, T0: 1.2, DT: 0.22, DMG: 1.5 },    // Huyết Lôi Thiên Võng: dải sét song song nổ thành sóng (khe >= 20 px)
  },
};

// M10-11: tên chiêu boss hiện trên thanh máu + trên đầu boss lúc gồng (chỉ khi bossPatternsV2); màu theo loại cảnh báo
// (24/11) TUYỆT KỸ: chuỗi chiêu liên hoàn theo mốc máu (người phát triển: boss là màn khó rèn phản xạ).
// SHIELD: bật khiên miễn nhiễm + choáng khi vỡ — người phát triển 24/11: KHÔNG cần cho bản đầu (giữ code, tắt). Đề xuất ChatGPT: docs/design/BOSS_TUYET_KY_DE_XUAT.md. Chỉ khi bossPatternsV2. Đợt 1: mốc 70 % (bộ chiêu P1).
// START: bật khiên (đứng yên, báo) · GAP: nghỉ giữa hai chiêu (0,3–0,6 s, không sơ hở) · END: chờ đạn/vùng cuối tan rồi mới vỡ khiên
// STUN: choáng sau khi khiên vỡ (sơ hở, nhận BOSS.VULN_MULT sát thương) · CHASE: sói áp sát giữa các đòn
// MARKS: { AT: mốc máu, P2: chỉ khi đã sang pha 2, SUFFIX: hậu tố tên, SEQ: [[chiêu, số lần lao]] }. Đợt 3 (24/11): thêm 40 % / 15 % (pha 2).
export const BOSS_TK = {
  SHIELD: false, START: 1.0, GAP: 0.45,
  MINI: { TEXT: 'Huyết Lang Hộ Thể — HÃY NÉ!', COLOR: '#ff6a3a', CHASE: true, END: 0.4, STUN: 2.3,
    MARKS: [{ AT: 0.7, SEQ: [['dash', 2], ['claw'], ['leap']] },
      // (24/11) đợt 3: mốc pha 2 dùng chiêu pha 2 (không lồng chiêu liên hoàn trong chuỗi)
      { AT: 0.4, P2: true, SUFFIX: ' · Nhị Trọng', SEQ: [['bloodDash'], ['claw'], ['leap'], ['leap']] },
      { AT: 0.15, P2: true, SUFFIX: ' · Tam Trọng', SEQ: [['bloodDash'], ['cracks'], ['leap'], ['quake'], ['rageHowl']] }] },
  FINAL: { TEXT: 'Vạn Ma Phong Thiên — HÃY NÉ!', COLOR: '#d070ff', CHASE: false, END: 1.4, STUN: 2.7,
    MARKS: [{ AT: 0.7, SEQ: [['cross'], ['zones'], ['burst']] },
      { AT: 0.4, P2: true, SUFFIX: ' · Nhị Trọng', SEQ: [['thunder'], ['runes'], ['chainBolt'], ['sweep']] },
      { AT: 0.15, P2: true, SUFFIX: ' · Tam Trọng', SEQ: [['net'], ['runes'], ['thunder'], ['burst'], ['sweep']] }] },
};
// (24/11) TUYỆT CHIÊU mỗi boss (ý tưởng người phát triển, ChatGPT chi tiết hóa — docs/design/BOSS_TUYET_KY_DE_XUAT.md).
// Chỉ pha 2, không miễn nhiễm; AT: mốc máu lần đầu · CD: hồi (giây) · MAX: số lần/trận · DUR: thời lượng · STUN: choáng sau khi xong.
// Lang Vương: R vòng vây, W bề rộng dải lao, SPEED px/s. Yêu Vương: LIGHT bán kính vùng sáng, EYE_R khoảng cách mắt tới người chơi, W bề rộng tia.
export const BOSS_ULT = {
  MINI: { NAME: 'Vạn Lang Ảnh Sát Trận', AT: 0.35, CD: 40, MAX: 2, R: 175, RY: 125, W: 16,   // 24/11: vòng bầu dục 175×125 (khớp màn 640×360)
    SPEED: 1350, DUR: 10, STUN: 2, DMG: 1.6, COLOR: '#ff4a3a' },   // 24/11: vòng 90 -> 120, boss thật trong vòng
  // 24/11 làm lại: mắt khóa chỗ người chơi sau LOCK s -> vòng ma trảo CLAW_R; vùng sáng phụ LIGHT2_R cách LIGHT2_D
  FINAL: { NAME: 'U Minh Vạn Nhãn Kiếp', AT: 0.30, CD: 45, MAX: 2, LIGHT: 70, EYE_R: [110, 135], LOCK: 0.3, CLAW_R: 20, LIGHT2_R: 36, LIGHT2_D: 60, DUR: 11, STUN: 2.5, DMG: 1.6, COLOR: '#ff2a3a' },
};
export const BOSS_SKILL_LABELS = {
  dash: ['Tam Liên Lao', '#ff8a6a'], howl: ['Lang Hú', '#ffd978'], howlDash: ['Hú Rồi Lao', '#ffd978'], claw: ['Liệt Trảo', '#ff8a6a'], leap: ['Vồ Đầu Đàn', '#ffb070'],
  burst: ['Hắc Ám Đạn Trận', '#e0a8ff'], zones: ['Hắc Diễm Truy Sát', '#e0a8ff'], slam: ['Chấn Địa', '#ff8a6a'], prison: ['Ma Ảnh Lao Tù', '#e0a8ff'],
  summon: ['Triệu Ma Ảnh', '#c070ff'], ultMINI: ['Vạn Lang Ảnh Sát Trận', '#ff4a3a'], ultFINAL: ['U Minh Vạn Nhãn Kiếp', '#ff2a3a'],
  bloodDash: ['Huyết Ảnh Tam Xung', '#ff6a4a'], comboClaw: ['Cuồng Nha Liên Kích', '#ff8a5a'], quake: ['Huyết Nguyệt Trấn Địa', '#ff7040'], hunt: ['Lang Vương Truy Mệnh', '#ffa070'], cracks: ['Huyết Trảo Phá Địa', '#ff5a3a'], rageHowl: ['Cuồng Lang Bạo Khiếu', '#ffd070'],
  thunder: ['Huyết Lôi Thiên Phạt', '#ff4a6a'], eight: ['Ma Lôi Bát Phương', '#ff6a8a'], runes: ['Nghịch Chuyển Ma Trận', '#e070ff'], chainBolt: ['Huyết Lôi Liên Tỏa', '#ff5a7a'], clones: ['Ma Ảnh Phân Thân', '#d9a8ff'], doubleSweep: ['Diệt Thế Ma Quang', '#f4d8ff'], net: ['Huyết Lôi Thiên Võng', '#ff4a5a'], shadow: ['Ảnh Độn', '#d9a8ff'], sweep: ['Ma Quang Hoành Tảo', '#f4d8ff'], cross: ['Thập Tự Hắc Liệt', '#ff8a6a'],
};

// (23/11, người phát triển yêu cầu) Trận boss tập trung: boss xuất hiện thì dọn sạch quái thường (tan biến, KHÔNG rơi kinh nghiệm),
// trong lúc boss còn sống director không sinh quái thường (quái lẻ / đợt / đội hình / tinh anh) — quái chỉ đến từ chiêu gọi của boss.
// Đợt sự kiện rơi vào lúc đang đánh boss thì bỏ (không dồn ra sau). Boss chết -> sinh lại bình thường.
export const BOSS_ARENA = { CLEAR_FIELD: true, NO_SPAWN: true };

// Cutscene xuất hiện boss (23/11): mốc thời gian (giây) + sự kiện âm thanh/hiệu ứng. HIGH = độ cao (px) boss đứng trước khi nhảy xuống.
// Lần đầu xem hết; từ lần thứ hai (meta.seenIntro) bấm Space/Enter/Esc/chạm để bỏ qua.
// Mốc thời gian (giây) — xem kịch bản ở src/systems/cutscene.js.
// FADE1..CLIFF: đấu trường ngửa lên trời + tối dần · CLIFF..PAN: cảnh vách sáng dần, camera hạ từ trời xuống mặt vách
// EMERGE..WALK: sói hiện ra từ bóng tối · WALK..LOOK: bước chậm tới mỏm đá · LOOK/INHALE/HOWL/CROUCH/LEAP
// FADE2..ARENA: phóng lên, tối dần · ARENA..LAND: đấu trường sáng dần, camera từ trên cao hạ theo cú rơi · NAME · OUT: về người chơi
// Bước đi (24/11): sprites/boss_walk dựng bằng xương từ 1 khung đứng (tools/wolf_walk_rig.py — 4 chân luân phiên, thân không đổi).
// Quãng đường KHỚP sải chân: thân tiến STRIDE/FRAMES px mỗi khung, đúng bằng tốc độ bàn chân lùi lúc chạm đất -> không trượt.
// STRIDE lấy từ tool in ra. CONTACT: khung chân trước đặt xuống (tiếng dậm + bụi + rung). Thời gian đi = CYCLES chu kỳ.
const LV_WALK = { FRAMES: 12, FPS: 12, STRIDE: 29.03, CYCLES: 6, CONTACT: [3, 9] };
const LV_WALK_SEC = LV_WALK.CYCLES * LV_WALK.FRAMES / LV_WALK.FPS;
const LV_T = (() => {
  const T = { FADE1: 0.7, CLIFF: 1.2, PAN: 3.2, EMERGE: 2.6, WALK: 3.4 };
  T.LOOK = +(T.WALK + LV_WALK_SEC).toFixed(3);
  const d = T.LOOK - 8.9;   // các mốc sau đi bộ giữ nguyên khoảng cách như bản 8,9 giây
  for (const [k, v] of Object.entries({ INHALE: 9.8, HOWL: 10.1, CROUCH: 11.4, LEAP: 11.8, FADE2: 12.2, ARENA: 12.7, LAND: 13.4, NAME: 13.5, OUT: 14.7 })) T[k] = +(v + d).toFixed(3);
  return T;
})();
const lvSteps = [];        // mỗi bàn chân chạm đất: tiếng dậm + rung nhẹ
for (let c = 0; c < LV_WALK.CYCLES; c++) for (const f of LV_WALK.CONTACT) {
  const at = +(LV_T.WALK + (c * LV_WALK.FRAMES + f) / LV_WALK.FPS + 0.02).toFixed(3);
  lvSteps.push([at, { type: 'sfx', name: 'thud' }], [at, { type: 'shake', t: 0.07 }]);
}
export const CUTSCENE = {
  MINI: {
    TITLE: 'LANG VƯƠNG', SUB: 'Chúa tể bầy sói', HIGH: 170, DUR: +(LV_T.OUT + 0.6).toFixed(3), T: LV_T, WALK: LV_WALK,
    FADE_IN: 0.6,   // giây sáng dần sau màn đen
    SKY: 140,       // px trời phía trên ảnh vách khi camera ngửa lên
    TILT: 220,      // px camera đấu trường trượt lên/xuống khi "ngửa lên trời" / "hạ từ trời xuống"
    // vị trí trên ảnh nền vách (tỉ lệ 0..1 của màn 640×360): chỗ sói hiện ra (cạnh gốc cây) -> mỏm đá; mặt đá chếch lên dần về phía mỏm
    CLIFF: { BG: 'cutscene_vach_da', START_X: +(0.69 - (LV_WALK.CYCLES * LV_WALK.FRAMES - 1) * LV_WALK.STRIDE / LV_WALK.FRAMES / 640).toFixed(5), START_Y: 0.53, TIP_X: 0.69, LEDGE_Y: 0.5 },
    EVENTS: [...lvSteps, [LV_T.HOWL + 0.02, { type: 'sfx', name: 'howl' }], [LV_T.HOWL + 0.02, { type: 'shake', t: 0.6 }],
      [LV_T.LAND, { type: 'sfx', name: 'land' }], [LV_T.LAND, { type: 'shake', t: 0.4 }], [LV_T.LAND, { type: 'land' }]],
  },
  // (24/11) Ma Ảnh Yêu Vương — kịch bản ở src/systems/cutscene.js (wraithState). Ảnh nền + 6 tư thế ChatGPT vẽ.
  // 0..ALTAR: đấu trường tối dần, ma ấn hiện, camera tới ma ấn (PAN..FADE1), tối hẳn · ALTAR..SKYPAN: tế đàn sáng dần, camera hạ từ trời
  // FORM khói tụ · EYES mắt lóe · REVEAL hiện chân thân · SPEAK nói (chữ chạy TYPE_TIME giây) · ROAR gầm · CRACK nứt · SHATTER vỡ vụn
  // RISE..RISE+RISE_TIME: trồi lên từ ma ấn ở đấu trường · NAME · OUT về người chơi. Bỏ qua (lần 2) nhảy tới CRACK.
  FINAL: {
    STYLE: 'wraith', TITLE: 'MA ẢNH YÊU VƯƠNG', SUB: 'Chúa tể Ma giới', TITLE_COL: '#ff9ad6', SKIP: 'CRACK', DUR: 14.2,
    LINE: 'Kẻ nào dám xâm phạm lãnh địa của bản vương?', TYPE_TIME: 1.9,
    T: { PAN: 0.3, FADE1: 1.9, ALTAR: 2.4, SKYPAN: 4.2, FORM: 3.2, EYES: 4.5, REVEAL: 5.4, SPEAK: 6.3, ROAR: 9.2, CRACK: 10.4, SHATTER: 10.8, RISE: 11.3, NAME: 12.4, OUT: 13.6 },
    FADE_IN: 0.5, SKY: 120, SHATTER_TIME: 1.0, RISE_TIME: 0.9,
    ALTAR: { BG: 'cutscene_te_dan', X: 0.5, Y: 0.62, SCALE: 3 },   // chân khói của Yêu Vương trên ma ấn giữa tế đàn (tỉ lệ màn 640×360); cảnh cận phóng ×3
    EVENTS: [[0.1, { type: 'sfx', name: 'rumble' }], [0.1, { type: 'shake', t: 0.3 }], [4.5, { type: 'sfx', name: 'eyes' }],
      [5.4, { type: 'sfx', name: 'bossPhase' }], [5.4, { type: 'shake', t: 0.3 }], [9.2, { type: 'sfx', name: 'roar' }], [9.2, { type: 'shake', t: 1.1 }],
      [10.4, { type: 'sfx', name: 'shatter' }], [10.8, { type: 'shake', t: 0.35 }],
      [12.2, { type: 'sfx', name: 'land' }], [12.2, { type: 'shake', t: 0.4 }], [12.2, { type: 'land' }]],
  },
};


// M10-03: tên chiêu cho thống kê nguồn sát thương (run.dmgBy) — khóa = nguồn ghi trong run.js
export const SKILL_NAMES = {
  chaser: 'Dã Lang cắn', charger: 'Hỏa Hồ cắn', 'charger:dash': 'Hỏa Hồ lao', ranged: 'Huyền Băng Thú cắn', 'ranged:shot': 'Băng tiễn',
  elite: 'Ma Ảnh cắn', 'elite:slam': 'Ma Ảnh đập đất', miniboss: 'Lang Vương cắn', 'miniboss:dash': 'Lang Vương lao',
  boss: 'Yêu Vương cắn', 'boss:slam': 'Chấn Địa', 'boss:zone': 'Hắc Diễm', 'boss:prison': 'Ma Ảnh Lao Tù', 'boss:burst': 'Hắc Diễm Đạn', 'boss:prisonShot': 'Đạn Lao Tù', 'chaser:pounce': 'Dã Lang chồm', 'charger:trail': 'Hỏa Vĩ', 'ranged:fan': 'Tam Băng Tiễn', 'elite:claw': 'Hắc Trảo', 'miniboss:claw': 'Liệt Trảo', 'miniboss:leap': 'Vồ Đầu Đàn', 'boss:sweep': 'Ma Quang Hoành Tảo', 'boss:cross': 'Thập Tự Hắc Liệt',
  'miniboss:ult': 'Vạn Lang Ảnh Sát Trận', 'boss:ultEye': 'U Minh Vạn Nhãn Kiếp',
  'miniboss:bite': 'Cuồng Nha Liên Kích', 'miniboss:quake': 'Huyết Nguyệt Trấn Địa', 'miniboss:cracks': 'Huyết Trảo Phá Địa', 'miniboss:rageHowl': 'Cuồng Lang Bạo Khiếu',
  'boss:thunder': 'Huyết Lôi Thiên Phạt', 'boss:eight': 'Ma Lôi Bát Phương', 'boss:runes': 'Nghịch Chuyển Ma Trận', 'boss:chainBolt': 'Huyết Lôi Liên Tỏa', 'boss:clones': 'Ma Ảnh Phân Thân', 'boss:net': 'Huyết Lôi Thiên Võng',
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
    GAP: 1.3, RECOVER: 1.3, ORDER: ['burst', 'zones', 'summon'],
    // (24/11, quyết định 2b) Triệu Ma Ảnh: gồng WINDUP, ma ấn tím báo trước N chỗ quanh boss (cách R, không sát người chơi < MIN_P);
    // hết gồng: ma ảnh (quái đuổi nhuộm tím) trồi lên, tự tan sau LIFE giây (không rơi kinh nghiệm). Tổng quân gọi ≤ TACTICS.MAX_SUMMONED.
    SUMMON: { WINDUP: 1.2, N: 3, N2: 4, R: 64, MIN_P: 60, LIFE: 20 },
    SLAM: { WINDUP: 1.25, R: 48, DMG: 2.0, TRIGGER: 55 },   // M2-04: R64 gần như không chạy kịp khi boss áp sát
    BURST: { WINDUP: 0.85, N: 12, N2: 16, SPEED: 80, LIFE: 3, DMG: 1.2 },
    ZONES: { WINDUP: 1.4, N: 3, N2: 4, R: 26, SPREAD: 55, DMG: 1.6 },   // M2-04: chơi thử chết nhiều nhất vì chiêu này -> gồng lâu hơn, vùng nhỏ hơn
    PHASE2: 0.5, PHASE2_GAP: 0.7,            // dưới 50% máu: nghỉ ngắn hơn, nhiều đạn/vùng hơn
    ENRAGE_AFTER: 150, ENRAGE_GAP: 0.5, ENRAGE_DMG: 1.5, MAX_HAZARDS: 12,
    // M7-13 "Ma Ảnh Lao Tù": N vùng nổ khép vòng bán kính RING quanh người chơi (giữa vòng an toàn), gồng WINDUP;
    // lúc nổ boss bắn BURST_N tia đạn thưa (cảnh báo tia như chiêu bắn). Không cộng dồn với zones cùng lúc.
    REMIX: { ORDER: ['burst', 'prison', 'zones', 'summon'], PRISON: { WINDUP: 1.5, N: 6, RING: 46, R: 24, DMG: 1.6, BURST_N: 8 } },
  },
};

// ---------- Phần thưởng run (M2-03) [THỬ NGHIỆM] ----------
// Thua/rời vẫn nhận theo tiến độ (quái, cấp, thời gian, boss đã hạ); thắng nhân WIN_MULT + vé. Nhân thêm theo cảnh giới.
// M9-D: Tham Ngộ Công Pháp (Tàng Kinh Các) — nâng vĩnh viễn công pháp khởi đầu, lượt sau bắt đầu ở cấp 1 + bậc.
// Giá bậc 1 ≈ một lượt thắng (~300 linh thạch, ~180 linh khí); linh khí cũng là nguồn tu vi -> phải chọn tu luyện hay tham ngộ.
export const MASTERY = {
  MAX: 2,
  COST: [{ linhThach: 150, lingQi: 80 }, { linhThach: 400, lingQi: 200 }],   // giá lên bậc 1, bậc 2
  MIN_REALM: [0, 3],                                                          // bậc 2 cần Luyện Khí tầng 4 (realmLevel ≥ 3)
};

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
  SECT_ARENA_R: 86,          // (cũ) vòng tròn ở sảnh — thay bằng SECT_ARENA (elip phủ cả mặt sàn bệ)
  // M8 (14/11, người phát triển): ở sảnh tông môn thiên kiếp phủ cả mặt sàn bệ pháp đài — trận hình elip rx×ry (lớn nhất còn đứng được),
  // diện tích ~1,4× vòng cũ -> thêm đòn cho khó né hơn: Lôi ấn +extraMarks vòng/đợt, Lôi xà +extraLines dải/đợt, Thiên lôi giữ số ô an toàn
  SECT_ARENA: { rx: 150, ry: 68, extraMarks: 7, extraLines: 4 },   // 14/11 gấp đôi đòn: Lôi ấn 10 vòng, Lôi xà 6 dải mỗi đợt
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

// (24/11) Cutscene biến hình chuyển pha 2 — trận đứng yên như cutscene xuất hiện; lần 2 bỏ qua được (nhảy tới SKIP).
// Người phát triển: MỖI BOSS MỘT CHỮ KÝ RIÊNG, 4 cutscene không lặp hiệu ứng chủ đạo; bản trước ngắn, nhỏ, chưa ấn tượng -> dài hơn, to hơn, rung mạnh.
// ChatGPT đề xuất 2 ngôn ngữ đối lập:
//   Lang Vương "Cuồng Thú Phá Địa" (FX 'quake'): sức mạnh thể chất — từ tâm NỔ RA; góc nhọn, vết nứt, răng cưa; camera rung/giật/nảy;
//     tụ lực theo nhịp tim -> động đất + gai đá trồi -> DẬM ĐẤT (xung kích khổng lồ) -> hú; tên GHÉP TỪ MẢNH ĐÁ.
//   Ma Ảnh Yêu Vương "Ma Giới Đảo Nghịch" (FX 'void'): siêu nhiên — từ ngoài HÚT VÀO tâm; đường cong, xoắn ốc, đồng tâm; camera tĩnh,
//     chỉ giật MỘT lần; thời gian ngưng -> đảo màu -> hố đen nở sau lưng -> gầm: hố đen sụp rồi nổ; tên TỰ VIẾT bằng phù văn.
// T: IN zoom xong · SWAP đổi sprite pha 2 · TITLE chữ tên · OUT zoom về ×1. Các khoảng [đầu, cuối] riêng từng FX.
// SHAKE: [mốc, dài, biên độ px] rung camera của cảnh (giảm dần trong khoảng). POSES: [mốc, tên khung]. FLASH: [mốc, dài, màu, độ đậm].
CUTSCENE.MINI_P2 = {
  STYLE: 'p2', FX: 'quake', BOSS: 'MINI', TITLE: 'HUYẾT NGUYỆT CUỒNG LANG', SUB: 'Lang Vương · cuồng thú phá địa', TITLE_COL: '#ffb070', TITLE_SIZE: 32,
  DUR: 7.2, ZOOM: 2, VIGN: 0.5, DESAT: 0, SKIP: 'TITLE',
  T: { IN: 0.35, BEATS: [0.6, 1.1, 1.6, 2.0], SWAP: 2.2, QUAKE: [2.2, 3.4], SPIKES: [2.35, 3.4], STOMP: 3.4, HOWL: [3.95, 5.0], TITLE: 5.0, OUT: 6.4 },
  POSES: [[0, 'MINI_walk0'], [0.3, 'MINI_atk'], [2.2, 'MINI2_atk'], [3.1, 'MINI2_howl'], [3.4, 'MINI2_atk'], [3.95, 'MINI2_howl'], [5.0, 'MINI2_walk0']],
  FLASH: [[2.2, 0.08, '#ffd9a0', 0.95], [2.28, 0.06, '#ffffff', 0.6], [3.4, 0.1, '#ffffff', 0.95], [3.5, 0.25, '#ff6a2a', 0.55]],
  SHAKE: [[0.6, 0.15, 2], [1.1, 0.15, 2.5], [1.6, 0.15, 3], [2.0, 0.18, 3.5], [2.2, 1.2, 4.5], [3.4, 0.8, 10], [3.950, 0.11, 18.0], [4.075, 0.11, 17.2], [4.200, 0.11, 16.5], [4.325, 0.11, 15.8], [4.450, 0.11, 15.0], [4.575, 0.11, 14.2], [4.700, 0.11, 13.5], [4.825, 0.11, 12.8], [4.950, 0.11, 12.0], [3.95, 1.1, 7]],
  EVENTS: [[0.02, { type: 'sfx', name: 'thud' }], [0.6, { type: 'sfx', name: 'thud' }], [1.1, { type: 'sfx', name: 'thud' }], [1.6, { type: 'sfx', name: 'thud' }],
    [2.0, { type: 'sfx', name: 'thud' }], [2.2, { type: 'sfx', name: 'land' }], [2.2, { type: 'sfx', name: 'rumble' }],
    [3.4, { type: 'sfx', name: 'land' }], [3.4, { type: 'sfx', name: 'rumble' }], [3.4, { type: 'boom', r: 90, color: '#ff7a3a' }],
    [3.95, { type: 'sfx', name: 'howl' }], [5.0, { type: 'sfx', name: 'thud' }], [6.4, { type: 'sfx', name: 'bossPhase' }]],
};
CUTSCENE.FINAL_P2 = {
  STYLE: 'p2', FX: 'void', BOSS: 'FINAL', TITLE: 'HUYẾT LÔI MA QUÂN', SUB: 'Ma Ảnh Yêu Vương · ma giới đảo nghịch', TITLE_COL: '#ff9ad6', TITLE_SIZE: 32,
  DUR: 8.0, ZOOM: 2, VIGN: 0.75, DESAT: 0.85, SKIP: 'TITLE',
  T: { IN: 1.0, PULL: [1.0, 2.6], SWAP: 2.6, INVERT: [2.6, 2.67], RUNES: [1.3, 7.0], SPIRAL: [2.8, 4.4], HOLE: [2.8, 4.4], ROAR: 4.4,
    BURST: [4.4, 5.5], COLOR: 4.4, TITLE: 5.0, OUT: 6.9 },
  POSES: [[0, 'FINAL_walk0'], [1.0, 'FINAL_atk'], [2.6, 'FINAL2_atk'], [4.4, 'FINAL2_roar'], [6.0, 'FINAL2_walk0']],
  FLASH: [[4.4, 0.18, '#ffe0f4', 0.9], [4.58, 0.3, '#ff4a9a', 0.4]],
  SHAKE: [[4.4, 0.55, 11]],
  EVENTS: [[0.05, { type: 'sfx', name: 'rumble' }], [1.0, { type: 'sfx', name: 'eyes' }], [1.8, { type: 'sfx', name: 'eyes' }], [2.6, { type: 'sfx', name: 'bossPhase' }],
    [2.8, { type: 'sfx', name: 'rumble' }], [4.4, { type: 'sfx', name: 'roar' }], [4.4, { type: 'boom', r: 100, color: '#ff6ab0' }],
    [5.0, { type: 'sfx', name: 'eyes' }], [6.9, { type: 'sfx', name: 'rumble' }]],
};

// (24/11) Cutscene NGẮN khi boss tung tuyệt chiêu (ChatGPT storyboard; không lặp hiệu ứng cutscene xuất hiện / pha 2).
// Lang Vương "bầy sói đồng loạt mở mắt": zoom vào boss -> lùi thấy vòng, 7 bóng sói hiện lần lượt -> 8 cặp mắt đỏ cùng mở
//   -> tên chiêu hiện theo vòng cung rồi tan thành 8 vệt đỏ. Yêu Vương "cả thế giới nhắm mắt, chỉ Ma Quân được nhìn":
//   ánh sáng tắt từng vùng -> zoom vào đôi mắt Ma Quân, chớp -> hàng loạt mắt nhỏ mở nhìn người chơi -> vòng sáng nhỏ bật quanh
//   người chơi, tên chiêu lóe từng chữ như đồng tử. Trận đứng yên trong lúc chiếu; lần 2 bỏ qua được (nhảy tới OUT).
// (25/11) người phát triển: sói chạy vòng quanh người chơi cuốn lên lốc xoáy siêu to; lốc tan thì xung quanh là cả bầy phân thân.
// CROUCH gồng · RUN chạy vòng (ω = W0 -> W0 + W1) · GROW lốc cuốn lên · STOP lốc khựng (lặng) · TAN xé tan · EYES 8 cặp mắt trong bụi · BODY cả bầy hiện
CUTSCENE.MINI_ULT = {
  STYLE: 'ult', FX: 'pack', BOSS: 'MINI', TITLE: 'VẠN LANG ẢNH SÁT TRẬN', TITLE_COL: '#ff5a3a', DUR: 5.3, SKIP: 'OUT', W0: 2, W1: 22,
  T: { IN: 0.4, CROUCH: 0.55, RUN: 0.55, GROW: [1.25, 2.15], STOP: 2.85, TAN: [2.97, 3.72], EYES: 3.3, BODY: 3.75, TITLE: 3.85, OUT: 4.85 },
  SHAKE: [[0.5, 0.15, 3], [1.25, 0.6, 3], [1.8, 1.05, 5], [2.97, 0.3, 9], [3.75, 0.4, 6]],
  EVENTS: [[0.02, { type: 'sfx', name: 'thud' }], [0.3, { type: 'sfx', name: 'eyes' }], [0.56, { type: 'sfx', name: 'land' }], [0.85, { type: 'sfx', name: 'land' }], [1.08, { type: 'sfx', name: 'land' }],
    [1.25, { type: 'sfx', name: 'rumble' }], [1.42, { type: 'sfx', name: 'land' }], [1.56, { type: 'sfx', name: 'land' }], [2.05, { type: 'sfx', name: 'rumble' }],
    [2.97, { type: 'sfx', name: 'shatter' }], [3.3, { type: 'sfx', name: 'eyes' }], [3.75, { type: 'sfx', name: 'howl' }], [3.9, { type: 'sfx', name: 'bossPhase' }]],
};
CUTSCENE.FINAL_ULT = {
  STYLE: 'ult', FX: 'eyes', BOSS: 'FINAL', TITLE: 'U MINH VẠN NHÃN KIẾP', TITLE_COL: '#ff2a3a', DUR: 2.2, SKIP: 'OUT',
  T: { DARK: [0, 0.5], EYE: [0.5, 1.0], MANY: [1.0, 1.6], TITLE: 1.35, OUT: 1.6 },
  SHAKE: [[1.6, 0.25, 3]],
  EVENTS: [[0.05, { type: 'sfx', name: 'rumble' }], [0.5, { type: 'sfx', name: 'eyes' }], [1.0, { type: 'sfx', name: 'eyes' }], [1.6, { type: 'sfx', name: 'roar' }]],
};
