// Yêu thú: sinh, AI đuổi/lang thang, trạng thái thiêu đốt/làm chậm. Dùng chung cho động phủ và bí cảnh.
import { TILE as T, HUB, HUB_MONSTER as HM, RUN } from '../core/config.js';

export const TIER_NAMES = ['Dã Lang', 'Hỏa Hồ', 'Huyền Băng Thú', 'Ma Ảnh'];
export const tierOfLvl = lvl => lvl <= 3 ? 0 : lvl <= 6 ? 1 : lvl <= 10 ? 2 : 3;

export function makeMonster(x, y, lvl, o = {}) {
  const hp = o.hp ?? Math.round(HM.HP_BASE * Math.pow(HM.HP_GROWTH, lvl - 1));
  return {
    x, y, lvl, tier: o.tier ?? tierOfLvl(lvl), hp, max: hp,
    dmg: o.dmg ?? Math.round(HM.DMG_BASE * Math.pow(HM.DMG_GROWTH, lvl - 1)),
    speed: o.speed ?? (HM.SPEED_BASE + lvl * HM.SPEED_PER_LVL),
    vx: 0, vy: 0, think: 0, aggro: !!o.aggro, alwaysAggro: !!o.aggro, atkCd: 0, hit: 0, kx: 0, ky: 0,
    ph: o.ph ?? 0, xp: o.xp ?? 1, burn: null, slow: null, tags: {}, dead: false, killedBy: null,
  };
}

// Động phủ: cấp theo khoảng cách tới tụ linh trận (giữ đúng v0.1)
export function spawnHubMonster(scene, player, rng) {
  const map = scene.map;
  for (let i = 0; i < 20; i++) {
    const tx = 1 + Math.floor(rng() * (map.w - 2)), ty = 1 + Math.floor(rng() * (map.h - 2));
    const x = tx * T + 8, y = ty * T + 12;
    const dc = Math.hypot(x - map.cx, y - map.cy) / T;
    if (dc < HUB.NO_SPAWN_TILES || !map.canStand(x, y) || Math.hypot(x - player.x, y - player.y) < HUB.NO_SPAWN_NEAR_PLAYER_TILES * T) continue;
    const lvl = Math.max(1, Math.min(HM.MAX_LVL, 1 + Math.floor((dc - HUB.NO_SPAWN_TILES) / HM.LVL_PER_TILES)));
    scene.monsters.push(makeMonster(x, y, lvl, { ph: rng() * 6 }));
    return true;
  }
  return false;
}

// Sinh quái trong bí cảnh: xem systems/director.js (M2-01)

export function moveEntity(map, e, dx, dy, safe) {
  const ok = (x, y) => map.canStand(x, y) && !(safe && Math.hypot(x - safe.x, y - safe.y) < safe.r);
  if (dx && ok(e.x + dx, e.y)) e.x += dx;
  if (dy && ok(e.x, e.y + dy)) e.y += dy;
}

export function applyBurn(m, dps, time) {
  if (!(dps > 0) || !(time > 0)) return;
  if (m.burn && m.burn.t > 0) { m.burn.dps = Math.max(m.burn.dps, dps); m.burn.t = Math.max(m.burn.t, time); }
  else m.burn = { dps, t: time, acc: 0 };
}

export function applySlow(m, f, time) {
  if (!(f > 0) || !(time > 0)) return;
  const v = Math.min(RUN.SLOW_MAX, f);
  if (m.slow && m.slow.t > 0) { m.slow.f = Math.max(m.slow.f, v); m.slow.t = Math.max(m.slow.t, time); }
  else m.slow = { f: v, t: time };
}

// Gây sát thương; đánh dấu chết (dọn ở cuối khung để không xóa mảng khi đang duyệt)
export function damageMonster(m, dmg, ev, color = '#fff') {
  if (m.dead || !(dmg > 0) || !Number.isFinite(dmg)) return false;
  const d = Math.max(1, Math.round(dmg));
  m.hp -= d; m.hit = 0.12; m.aggro = true;
  if (ev) ev.push({ type: 'text', x: m.x, y: m.y - 12, text: '-' + d, color });
  if (m.hp <= 0) { m.dead = true; return true; }
  return false;
}

// AI + trạng thái. opts: { safe, onAttack(m, dmg), ai?(m, player, dx, dy, d, dt) -> true nếu đã tự xử lý }
export function updateMonsters(scene, player, dt, ev, opts) {
  const map = scene.map, safe = opts.safe;
  const playerSafe = safe && Math.hypot(player.x - safe.x, player.y - safe.y) < safe.r;
  for (const m of scene.monsters) {
    if (m.dead) continue;
    m.hit -= dt; m.atkCd -= dt; m.think -= dt;
    if (m.burn && m.burn.t > 0) {
      m.burn.t -= dt; m.burn.acc += m.burn.dps * dt;
      if (m.burn.acc >= 1) { const d = Math.floor(m.burn.acc); m.burn.acc -= d; damageMonster(m, d, ev, '#ffb070'); if (m.dead) continue; }
    }
    if (m.slow && m.slow.t > 0) m.slow.t -= dt;
    const slowF = m.slow && m.slow.t > 0 ? 1 - m.slow.f : 1;
    const dx = player.x - m.x, dy = player.y - m.y, d = Math.hypot(dx, dy) || 1;
    if (m.alwaysAggro) m.aggro = !player.dead;
    else if (playerSafe || d > HM.AGGRO_OUT) m.aggro = false; else if (d < HM.AGGRO_IN) m.aggro = true;
    if (m.aggro && opts.ai && opts.ai(m, player, dx, dy, d, dt)) { /* kiểu quái tự xử lý (archetypes.js) */ }
    else if (m.aggro) {
      m.vx = dx / d * m.speed; m.vy = dy / d * m.speed;
      if (d < HM.ATTACK_RANGE) { m.vx = m.vy = 0; if (m.atkCd <= 0) { m.atkCd = HM.ATTACK_CD; opts.onAttack(m, m.dmg); } }
    } else if (m.think <= 0) {
      m.think = 1 + Math.random() * 2;
      if (Math.random() < 0.5) m.vx = m.vy = 0; else { const a = Math.random() * 6.283; m.vx = Math.cos(a) * HM.WANDER; m.vy = Math.sin(a) * HM.WANDER; }
    }
    moveEntity(map, m, (m.vx * slowF + m.kx) * dt, (m.vy * slowF + m.ky) * dt, safe);
    m.kx *= 0.85; m.ky *= 0.85;
  }
}

// Dọn yêu thú đã chết, gọi onKill một lần cho mỗi con
export function reapMonsters(scene, onKill) {
  let w = 0;
  for (const m of scene.monsters) { if (m.dead) onKill(m); else scene.monsters[w++] = m; }
  scene.monsters.length = w;
}
