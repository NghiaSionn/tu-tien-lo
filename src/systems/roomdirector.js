// M9-B: đạo diễn bí cảnh nhiều phòng. Người chơi bước sâu vào phòng chưa dọn -> phong ấn cửa, ra quái theo đợt;
// hạ hết các đợt -> mở cửa. Phòng thưởng/Linh Mạch kích hoạt ngay khi vào. Thuần logic, chỉ dùng run.rng.
import { TILE as T, ROOMS as R, ARCH, BOSS } from '../core/config.js';
import { roomAt } from '../world/rooms.js';
import { phaseAt } from './director.js';
import { makeRunEnemy, makeBoss } from './director.js';
import { placeShrine } from './shrine.js';

export function createRoomState(dg) {
  return {
    cur: dg.start, active: -1, waveLeft: 0, gapT: 0, queue: [],
    rooms: dg.rooms.map(r => ({ state: r.type === 'start' ? 'cleared' : 'idle', seen: r.id === dg.start, visited: r.id === dg.start })),
    cleared: 1, total: dg.rooms.length,
  };
}

const alive = sc => sc.monsters.some(m => !m.dead);
// quái chế độ phòng: trâu/đau hơn + nhiều chiến ý hơn (ít con hơn đấu trường)
const buff = (m, d) => { m.hp = m.max = Math.round(m.hp * (1 + d * R.HP_PER_DEPTH)); m.dmg = Math.max(1, Math.round(m.dmg * (1 + d * R.DMG_PER_DEPTH))); m.xp *= R.XP_MULT; return m; };
const tDepth = r => Math.min(R.T_MAX, R.T_FIRST + Math.max(0, r.depth - 1) * R.T_PER_DEPTH);
// Lang Vương mạnh theo độ sâu phòng của nó (+40 s), không quá mốc cũ 3:30; Yêu Vương giữ mốc 6:00
const tFor = r => r.type === 'boss' ? R.T_BOSS.FINAL : r.type === 'mini' ? Math.min(R.T_BOSS.MINI, tDepth(r) + 40) : tDepth(r);

function lock(map, r, on) {
  for (const [x, y] of r.doors) { const k = y * map.w + x; if (on) map.blocked.add(k); else map.blocked.delete(k); }
}

// chỗ sinh trong phòng: đứng được, xa người chơi, không dính cửa
function spot(run, r, player) {
  const map = run.scene.map, rng = run.rng;
  let best = null, bd = -1;
  for (let i = 0; i < 30; i++) {
    const x = (r.x0 + 1.5 + rng() * (r.x1 - r.x0 - 2)) * T, y = (r.y0 + 1.5 + rng() * (r.y1 - r.y0 - 2)) * T;
    if (!map.canStand(x, y) || (map.reach && !map.reach[Math.floor(y / T) * map.w + Math.floor(x / T)])) continue;
    const d = Math.hypot(x - player.x, y - player.y);
    if (d >= R.SPAWN_MIN_DIST && rng() < 0.5) return [x, y];
    if (d > bd) { bd = d; best = [x, y]; }   // không đủ xa: lấy chỗ xa nhất đã thử
  }
  return best;
}

function spawnWave(run, r, player, power, ev) {
  const n = Math.min(R.WAVE_N.max, Math.round(R.WAVE_N.base + r.depth * R.WAVE_N.perDepth));
  const mix = phaseAt(run.tEff).mix, rng = run.rng;
  const pick = () => { const e = Object.entries(mix), tot = e.reduce((a, [, w]) => a + w, 0); let v = rng() * tot; for (const [k, w] of e) { v -= w; if (v < 0) return k; } return e[0][0]; };
  let made = 0;
  // quái thường xếp hàng hiện rải trong SPAWN_SPREAD giây, có vòng báo trước ở chỗ sắp hiện
  const q = run.rooms.queue, add = arch => { const s = spot(run, r, player); if (!s) return; q.push({ arch, x: s[0], y: s[1], t: rng() * R.SPAWN_SPREAD }); ev.push({ type: 'boom', x: s[0], y: s[1] - 4, r: 12, color: '#b07cff' }); made++; };
  if (r.type === 'elite' && !run.rooms.eliteDone) { run.rooms.eliteDone = true; add('elite'); }
  const count = r.type === 'elite' ? Math.ceil(n / 2) : r.type === 'mini' || r.type === 'boss' ? 0 : n;
  for (let i = 0; i < count; i++) add(pick());
  if (r.type === 'mini' || r.type === 'boss') {
    const kind = r.type === 'mini' ? 'MINI' : 'FINAL';
    // boss đứng phía bên kia tâm phòng so với người chơi
    let bx = (r.cx + 0.5) * T * 2 - player.x, by = (r.cy + 0.5) * T * 2 - player.y;
    if (!run.scene.map.canStand(bx, by)) { bx = (r.cx + 0.5) * T; by = (r.cy + 0.5) * T; }
    const bm = makeBoss(run, kind, bx, by, power); bm.hp = bm.max = Math.round(bm.hp * R.BOSS_HP);
    run.dir[kind === 'MINI' ? 'mini' : 'final'] = 'ALIVE';
    ev.push({ type: 'announce', x: player.x, y: player.y - 30, text: `${BOSS[kind].name} xuất hiện!`, color: '#ff5a5a' }, { type: 'shake', t: 0.25 }, { type: 'sfx', name: 'boss' });
    made++;
  }
  run.rooms.waveSize = made;
  return made;
}

function enter(run, r, player, power, ev) {
  const rs = run.rooms, st = rs.rooms[r.id], map = run.scene.map;
  run.tEff = tFor(r);
  if (r.type === 'reward') {
    run.hp = Math.min(run.maxHp, run.hp + run.maxHp * R.REWARD.HEAL);
    run.bonusStones = (run.bonusStones || 0) + R.REWARD.STONES;
    run.scene.orbs.push({ x: (r.cx + 0.5) * T, y: (r.cy + 0.5) * T, v: R.REWARD.XP });
    ev.push({ type: 'announce', x: player.x, y: player.y - 30, text: `Rương bí cảnh: hồi ${Math.round(R.REWARD.HEAL * 100)}% khí huyết, +${R.REWARD.STONES} linh thạch`, color: '#ffd978' }, { type: 'sfx', name: 'pickup' });
    clear(run, r, ev, false); return;
  }
  if (r.type === 'shrine') {
    placeShrine(run, (r.cx + 0.5) * T, (r.cy + 0.5) * T);
    ev.push({ type: 'text', x: player.x, y: player.y - 30, text: 'Linh Mạch — đứng gần, nhấn E', color: '#7fe3ff' });
    clear(run, r, ev, false); return;
  }
  st.state = 'active'; rs.active = r.id;
  rs.waveLeft = r.type === 'combat' ? Math.min(R.WAVES.combat[1], R.WAVES.combat[0] + Math.max(0, r.depth - 1)) : R.WAVES[r.type] || 1;
  lock(map, r, true);
  ev.push({ type: 'announce', x: player.x, y: player.y - 30, text: r.type === 'elite' ? 'Phong ấn! Ma Ảnh tinh anh trấn giữ phòng này' : 'Phong ấn! Hạ hết yêu thú để mở cửa', color: '#d9a8ff' }, { type: 'shake', t: 0.12 });
  rs.waveLeft--; spawnWave(run, r, player, power, ev);
}

function clear(run, r, ev, combat = true) {
  const rs = run.rooms;
  rs.rooms[r.id].state = 'cleared'; rs.cleared++;
  if (rs.active === r.id) rs.active = -1;
  lock(run.scene.map, r, false);
  if (combat) {
    run.hp = Math.min(run.maxHp, run.hp + run.maxHp * R.CLEAR_HEAL);
    ev.push({ type: 'announce', x: (r.cx + 0.5) * T, y: (r.cy + 0.5) * T - 30, text: 'Phong ấn tan — cửa đã mở', color: '#9cf2a0' }, { type: 'sfx', name: 'card' });
  }
}

export function updateRoomDirector(run, player, dt, ev, power) {
  const rs = run.rooms, dg = run.scene.map.rooms, tx = Math.floor(player.x / T), ty = Math.floor(player.y / T);
  const here = roomAt(dg, tx, ty);
  if (here >= 0) {
    rs.cur = here;
    if (!rs.rooms[here].visited) { rs.rooms[here].visited = true; }
    for (const n of dg.rooms[here].nb) rs.rooms[n].seen = true;
    rs.rooms[here].seen = true;
  }
  if (rs.active < 0) {
    const deep = roomAt(dg, tx, ty, R.ENTER_INSET);
    if (deep >= 0 && rs.rooms[deep].state === 'idle') enter(run, dg.rooms[deep], player, power, ev);
    return;
  }
  const r = dg.rooms[rs.active];
  for (let i = rs.queue.length - 1; i >= 0; i--) {   // quái trong hàng chờ tới lượt hiện
    const e = rs.queue[i]; if ((e.t -= dt) > 0) continue;
    rs.queue.splice(i, 1);
    buff(makeRunEnemy(run, e.arch, e.x, e.y, power), r.depth);
  }
  if (r.type === 'mini' || r.type === 'boss' || r.type === 'elite') {   // quái thường lai rai trong trận boss/tinh anh
    if ((rs.trickleT = (rs.trickleT ?? R.BOSS_TRICKLE.EVERY) - dt) <= 0 && run.scene.monsters.some(m => !m.dead && (m.boss || m.elite))) {
      rs.trickleT = R.BOSS_TRICKLE.EVERY;
      if (run.scene.monsters.filter(m => !m.dead && !m.boss && !m.elite).length < R.BOSS_TRICKLE.MAX) {
        const s = spot(run, r, player), mix = phaseAt(run.tEff).mix, arch = Object.keys(mix)[Math.floor(run.rng() * Object.keys(mix).length)];
        if (s) { rs.queue.push({ arch, x: s[0], y: s[1], t: 0.6 }); ev.push({ type: 'boom', x: s[0], y: s[1] - 4, r: 12, color: '#b07cff' }); }
      }
    }
  }
  const left = run.scene.monsters.filter(m => !m.dead).length;
  // chống kẹt: còn ít quái mà lâu không hạ được con nào -> đưa chúng tới chỗ đi được gần người chơi
  if (left !== rs.lastLeft) { rs.lastLeft = left; rs.stallT = 0; }
  else if (left > 0 && left <= R.STALL.MAX && !run.scene.monsters.some(m => m.boss && !m.dead) && (rs.stallT = (rs.stallT || 0) + dt) > R.STALL.T) {
    rs.stallT = 0;
    for (const m of run.scene.monsters) { if (m.dead) continue; const s = spot(run, r, player); if (s) { m.x = s[0]; m.y = s[1]; } }
  }
  if (rs.waveLeft > 0 && !rs.queue.length && left <= Math.max(2, (rs.waveSize || 0) * R.WAVE_OVERLAP)) { if ((rs.gapT -= dt) > 0) return; }
  else if (rs.queue.length || left) { rs.gapT = R.WAVE_GAP; return; }
  else if ((rs.gapT -= dt) > 0) return;
  if (rs.waveLeft > 0) { rs.waveLeft--; spawnWave(run, r, player, power, ev); ev.push({ type: 'text', x: player.x, y: player.y - 26, text: 'Đợt yêu thú mới!', color: '#ffb070' }); return; }
  clear(run, r, ev);
}

export const roomsCleared = run => run.rooms ? run.rooms.cleared : 0;
