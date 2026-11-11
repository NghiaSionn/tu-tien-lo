// Director bí cảnh (M2-01): quyết định sinh quái gì, ở đâu, khi nào. Thuần logic, chỉ dùng run.rng -> cùng seed + cùng
// input thì cùng kết quả. Thông số ở DIRECTOR / ARCH trong config.
import { TILE as T, RUN, DIRECTOR as D, ARCH, BOSS } from '../core/config.js';
import { makeMonster } from '../entities/monsters.js';
import { initBoss } from '../entities/bosses.js';

export const createDirector = () => ({ spawnT: 0, waveIdx: 0, eliteT: D.ELITE.FIRST, mini: 'PENDING', final: 'PENDING' });   // boss: PENDING -> ALIVE -> DEAD

// Giai đoạn hiện tại + nhịp sinh nội suy tới giai đoạn sau
export function phaseAt(t) {
  let i = 0;
  while (i + 1 < D.PHASES.length && t >= D.PHASES[i + 1].t) i++;
  const a = D.PHASES[i], b = D.PHASES[i + 1];
  const every = b ? a.every + (b.every - a.every) * (t - a.t) / (b.t - a.t) : a.every;
  return { index: i, every, mix: a.mix };
}

export const budgetAt = t => Math.min(D.BUDGET.MAX, D.BUDGET.BASE + t * D.BUDGET.PER_SEC);
export const aliveCost = scene => scene.monsters.reduce((a, m) => a + (m.dead || m.boss ? 0 : (ARCH[m.arch]?.cost ?? 1)), 0);
export const aliveBoss = scene => scene.monsters.find(m => m.boss && !m.dead) || null;

function pickArch(mix, rng) {
  const ent = Object.entries(mix), total = ent.reduce((a, [, w]) => a + w, 0);
  let r = rng() * total;
  for (const [k, w] of ent) { r -= w; if (r < 0) return k; }
  return ent[ent.length - 1][0];
}

// Chỗ sinh hợp lệ: trong đấu trường, đứng được, cách người chơi ít nhất SAFE_R
export function validSpawn(map, player, x, y) {
  return x >= T * 2 && y >= T * 2 && x <= map.pw - T * 2 && y <= map.ph - T * 2 && map.canStand(x, y) &&
    Math.hypot(x - player.x, y - player.y) >= D.SAFE_R;
}

// Tạo một con theo kiểu; sức mạnh theo thời gian + cảnh giới như M1, rồi nhân hệ số kiểu
export function makeRunEnemy(run, arch, x, y, realmPower) {
  const A = ARCH[arch], E = RUN.ENEMY, t = run.time, rng = run.rng;
  const grade = Math.max(0, Math.min(3, Math.floor(t / 120) - (rng() < 0.35 ? 1 : 0)));
  const scale = Math.pow(realmPower, E.REALM_SCALE);
  const hp = Math.round(E.HP_BASE * (1 + t * E.HP_TIME) * (1 + grade * 0.6) * scale * A.hp);
  const dmg = Math.max(1, Math.round(E.DMG_BASE * (1 + t * E.DMG_TIME) * (1 + grade * 0.4) * scale * A.dmg));
  const lvl = 1 + grade * 3 + Math.floor(t / 60);
  const m = makeMonster(x, y, lvl, { tier: A.tier, hp, dmg, speed: (E.SPEED + t * E.SPEED_TIME + grade * 3) * A.speed, aggro: true, xp: (1 + grade) * A.xp, ph: rng() * 6 });
  m.arch = arch; m.st = 'move'; m.stT = 0; m.skCd = 0.5 + rng() * 1.5; m.dirX = 0; m.dirY = 0;
  if (arch === 'elite') m.elite = true;
  run.scene.monsters.push(m);
  return m;
}

function spawnAt(run, player, arch, x, y, power) {
  if (run.scene.monsters.length >= RUN.SPAWN.MAX_ALIVE || !validSpawn(run.scene.map, player, x, y)) return null;
  return makeRunEnemy(run, arch, x, y, power);
}

// Boss: sức mạnh theo công thức quái thường ở grade 2, nhân hệ số BOSS[kind]
export function makeBoss(run, kind, x, y, realmPower) {
  const B = BOSS[kind], E = RUN.ENEMY, t = run.time;
  const scale = Math.pow(realmPower, E.REALM_SCALE);
  const hp = Math.round(E.HP_BASE * (1 + t * E.HP_TIME) * 2.2 * scale * B.hp);
  const dmg = Math.max(1, Math.round(E.DMG_BASE * (1 + t * E.DMG_TIME) * 1.8 * scale * B.dmg));
  const m = makeMonster(x, y, 10 + Math.floor(t / 60), { tier: B.tier, hp, dmg, speed: (E.SPEED + t * E.SPEED_TIME) * B.speed, aggro: true, xp: B.xp, ph: 0 });
  run.scene.monsters.push(initBoss(m, kind));
  return m;
}

// Quái được boss gọi ra: quanh boss, đứng được, không sát người chơi
export function summonAround(run, player, cx, cy, n, R, power) {
  let made = 0;
  for (let i = 0; i < n * 4 && made < n; i++) {
    if (run.scene.monsters.length >= RUN.SPAWN.MAX_ALIVE) break;
    const a = run.rng() * Math.PI * 2, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
    if (!run.scene.map.canStand(x, y) || Math.hypot(x - player.x, y - player.y) < 40) continue;
    makeRunEnemy(run, 'chaser', x, y, power).summoned = true; made++;
  }
  return made;
}

// Một con lẻ quanh người chơi (ngoài tầm nhìn gần)
function spawnAround(run, player, arch, power) {
  const S = RUN.SPAWN, rng = run.rng;
  for (let i = 0; i < 16; i++) {
    const a = rng() * Math.PI * 2, r = S.DIST_MIN + rng() * (S.DIST_MAX - S.DIST_MIN);
    const m = spawnAt(run, player, arch, player.x + Math.cos(a) * r, player.y + Math.sin(a) * r, power);
    if (m) return m;
  }
  return null;
}

// Boss xuất hiện gần hơn quái thường (trong/sát mép màn) để người chơi thấy ngay. Không được thì thử lại khung sau.
function spawnBoss(run, player, kind, power) {
  const rng = run.rng, map = run.scene.map;
  for (let i = 0; i < 24; i++) {
    const a = rng() * Math.PI * 2, r = D.SAFE_R + rng() * 40;
    const x = player.x + Math.cos(a) * r, y = player.y + Math.sin(a) * r;
    if (validSpawn(map, player, x, y)) return makeBoss(run, kind, x, y, power);
  }
  return null;
}

// Đợt theo đội hình. Trả về số con thật sự sinh ra.
export function spawnWave(run, player, w, power) {
  const rng = run.rng, n = w.n;
  let made = 0;
  if (w.form === 'ring') {
    const a0 = rng() * 6.283;
    for (let i = 0; i < n; i++) {
      const a = a0 + i * 6.283 / n;
      for (const r of [D.RING_R, D.RING_R + 24, D.RING_R + 48]) if (spawnAt(run, player, w.arch, player.x + Math.cos(a) * r, player.y + Math.sin(a) * r, power)) { made++; break; }
    }
  } else {
    // pack: dồn một cụm; arc: trải cung 100° trước hướng người chơi đang nhìn
    const face = Math.atan2(player.fy || 0, player.fx || 1);
    const base = w.form === 'arc' ? face : rng() * 6.283, R = w.form === 'arc' ? D.ARC_R : D.PACK_R;
    for (let i = 0; i < n; i++) {
      const spread = w.form === 'arc' ? (i / Math.max(1, n - 1) - 0.5) * 1.75 : (rng() - 0.5) * 0.5;
      for (let k = 0; k < 6; k++) {
        const a = base + spread + (k ? (rng() - 0.5) * 0.4 : 0), r = R + (w.form === 'pack' ? rng() * 30 : 0) + k * 14;
        if (spawnAt(run, player, w.arch, player.x + Math.cos(a) * r, player.y + Math.sin(a) * r, power)) { made++; break; }
      }
    }
  }
  return made;
}

export function updateDirector(run, player, dt, ev, power) {
  const dir = run.dir, sc = run.scene, t = run.time;
  const ph = phaseAt(t);
  for (const kind of ['MINI', 'FINAL']) {
    const key = kind === 'MINI' ? 'mini' : 'final';
    if (dir[key] === 'PENDING' && t >= BOSS[kind].AT && spawnBoss(run, player, kind, power)) {
      dir[key] = 'ALIVE';
      ev.push({ type: 'announce', x: player.x, y: player.y - 30, text: `${BOSS[kind].name} xuất hiện!`, color: '#ff5a5a' }, { type: 'shake', t: 0.25 });
    }
  }
  const boss = aliveBoss(sc);
  dir.spawnT -= dt;
  while (dir.spawnT <= 0) {
    dir.spawnT += ph.every * (boss ? BOSS.TRICKLE_MULT : 1);
    const arch = pickArch(ph.mix, run.rng);
    if (aliveCost(sc) + ARCH[arch].cost <= budgetAt(t)) spawnAround(run, player, arch, power);
  }
  while (dir.waveIdx < D.WAVES.length && t >= D.WAVES[dir.waveIdx].t) {
    const w = D.WAVES[dir.waveIdx++];
    if (spawnWave(run, player, w, power) > 0) ev.push({ type: 'announce', x: player.x, y: player.y - 30, text: w.text, color: '#ffb070' });
  }
  if (t >= dir.eliteT && !boss) {
    dir.eliteT += D.ELITE.EVERY;
    const alive = sc.monsters.filter(m => m.elite && !m.dead).length;
    if (alive < D.ELITE.MAX_ALIVE && spawnAround(run, player, 'elite', power))
      ev.push({ type: 'announce', x: player.x, y: player.y - 30, text: D.ELITE.TEXT, color: '#d9a8ff' });
  }
}
