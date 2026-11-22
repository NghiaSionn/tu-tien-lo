// Mô phỏng run không giao diện để cân bằng. Bot tự né, nhặt chiến ý và chọn thẻ theo ưu tiên từng build.
// Đây KHÔNG phải playtest của người thật; chỉ dùng để thấy xu hướng.
//
// Bot mặc định "biết né cảnh báo" (rời đường lao, vùng nổ, đạn đang bay tới) — gần người chơi hợp lý.
// NAIVE=1: bot cũ chỉ chạy khỏi quái gần (không đọc cảnh báo).
//
//   node tools/sim.mjs                     # mọi build, cảnh giới 0 và 9, 3 seed, từng lượt
//   node tools/sim.mjs kiem_loi 0 5        # một build
//   node tools/sim.mjs --summary 0 10      # bảng tổng hợp mọi build, cảnh giới 0, 10 seed
//   DMG=1 node tools/sim.mjs ...           # in sát thương nhận theo nguồn
//   REROLL=1 ...                           # M7-09: bot đổi bảng thẻ khi không có thẻ nào trong danh sách muốn
//   SYNERGY=1 ...                          # M7-09: bật FEATURES.draftSynergy (ưu tiên nhẹ thẻ ghép tiến hóa)
//   VARIANT=linh_trieu ...                 # M7-10: ép biến thể bí cảnh (mặc định: Bình thường, để so với kết quả cũ)
//   ROOMS=1 ...                            # M9-B: bí cảnh nhiều phòng — bot đi hết các phòng (boss cuối cùng), dùng Linh Mạch
import { createRun, updateRun, refreshMaxHp } from '../src/systems/run.js';
import { drawCards, applyCard, rerollDraft } from '../src/progression/draft.js';
import { runStats } from '../src/systems/combat.js';
import { moveEntity } from '../src/entities/monsters.js';
import { PLAYER, ARCH, BOSS, FEATURES, WOLF_PACK, ICE_FAN, ELITE_V2, BOSS_V2 } from '../src/core/config.js';
if (process.env.SYNERGY) FEATURES.draftSynergy = true;
const REROLL = !!process.env.REROLL;
import { computeRunReward } from '../src/progression/rewards.js';
import { roomAt } from '../src/world/rooms.js';
import { useShrine, shrineReady } from '../src/systems/shrine.js';
const ROOMS_MODE = !!process.env.ROOMS;

// M9-B: tìm đường theo ô (BFS 8 hướng không cắt góc) tới đích; trả về điểm ảnh của ô cách vài bước trên đường đi
const _path = { key: '', way: null, t: 0 };
function pathStep(run, p, gx, gy) {
  const map = run.scene.map, W = map.w, H = map.h, T = 16, sx = Math.floor(p.x / T), sy = Math.floor(p.y / T), tx = Math.floor(gx / T), ty = Math.floor(gy / T);
  const key = tx + ',' + ty;
  if (_path.key !== key || run.time - _path.t > 0.5 || !_path.way) {
    _path.key = key; _path.t = run.time;
    const prev = new Int32Array(W * H).fill(-1), q = new Int32Array(W * H); let h = 0, n = 0;
    const s0 = sy * W + sx; prev[s0] = s0; q[n++] = s0;
    const ok = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !map.solidTile(x, y);
    while (h < n) { const c = q[h++], cx = c % W, cy = (c - cx) / W; if (cx === tx && cy === ty) break;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = cx + dx, ny = cy + dy, k = ny * W + nx; if (!ok(nx, ny) || prev[k] >= 0) continue;
        if (dx && dy && (!ok(cx + dx, cy) || !ok(cx, cy + dy))) continue;
        prev[k] = c; q[n++] = k; } }
    const t0 = ty * W + tx; if (prev[t0] < 0) { _path.way = null; return [gx, gy]; }
    const way = []; for (let k = t0; k !== s0; k = prev[k]) way.push(k); way.reverse(); _path.way = way;
  }
  const way = _path.way; if (!way || !way.length) return [gx, gy];
  // bỏ các ô đã đi qua, nhắm ô thứ 2 phía trước
  let i = 0; while (i < way.length && Math.hypot((way[i] % W + 0.5) * T - p.x, (Math.floor(way[i] / W) + 0.5) * T - p.y) < 10) i++;
  const k = way[Math.min(way.length - 1, i + 1)]; return [(k % W + 0.5) * T, (Math.floor(k / W) + 0.5) * T];
}
// M9-B: điểm đến kế tiếp của bot trong chế độ phòng: đi hết phòng chưa dọn (gần nhất trước), boss sau cùng
function roomTarget(run, p) {
  const d = run.scene.map.rooms, rs = run.rooms, T = 16, tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
  const cur = roomAt(d, tx, ty);
  if (rs.active >= 0) { const r = d.rooms[rs.active]; return [(r.cx + 0.5) * T, (r.cy + 0.5) * T, 0.004]; }
  if (run.shrine && !run.shrine.used) return [run.shrine.x, run.shrine.y, 1];
  const from = cur >= 0 ? cur : rs.cur;
  // BFS trên cây phòng
  const prev = new Map([[from, -1]]), q = [from];
  for (let i = 0; i < q.length; i++) for (const n of d.rooms[q[i]].nb) if (!prev.has(n)) { prev.set(n, q[i]); q.push(n); }
  const todo = q.filter(id => rs.rooms[id].state !== 'cleared' && d.rooms[id].type !== 'boss');
  const goal = todo.length ? todo[0] : d.boss;
  if (goal === from) { const r = d.rooms[from]; return [(r.cx + 0.5) * T, (r.cy + 0.5) * T, 1]; }
  let step = goal; while (prev.get(step) !== from) step = prev.get(step);
  const nr = d.rooms[step];
  if (cur < 0) return [(nr.cx + 0.5) * T, (nr.cy + 0.5) * T, 1];   // trong hành lang: đi thẳng vào phòng kế
  const c = d.corridors.find(k => (k.a === from && k.b === nr.id) || (k.b === from && k.a === nr.id));
  const mx = (c.x0 + c.x1 + 1) / 2 * T, my = (c.y0 + c.y1 + 1) / 2 * T, r0 = d.rooms[from];
  // căn thẳng hàng cửa trước khi đi (tránh kẹt vào góc tường)
  const horiz = c.y1 - c.y0 + 1 === 4 && c.x1 - c.x0 + 1 !== 4 ? true : r0.gy === nr.gy;
  if (horiz && Math.abs(p.y - my) > 6) return [p.x, my, 1];
  if (!horiz && Math.abs(p.x - mx) > 6) return [mx, p.y, 1];
  return [mx, my, 1];
}

export const BUILDS = {
  kiem_loi: { start: 'sword_qi', want: ['evo:loi_dinh_van_kiem', 'up:sword_qi', 'new:thunder_strike', 'new:sword_qi', 'up:thunder_strike', 'pas:linh_luc', 'pas:ngung_than', 'new:body_aura'] },
  phi_kiem_hoa: { start: 'fire_orb', want: ['evo:liet_diem_kiem_tran', 'new:sword_array', 'up:sword_array', 'up:fire_orb', 'pas:linh_luc', 'pas:ngung_than', 'new:fire_ring'] },
  hoa_phong: { start: 'fire_orb', want: ['evo:hoa_long_quyen', 'new:fire_ring', 'up:fire_ring', 'new:wind_blade', 'up:fire_orb', 'pas:tu_khi', 'pas:linh_luc'] },
  loi_the: { start: 'thunder_strike', want: ['evo:loi_cuong_ho_the', 'new:body_aura', 'up:body_aura', 'new:thunder_field', 'up:thunder_strike', 'up:thunder_field', 'pas:ho_mach'] },
  // M7-12: 2 build tiến hóa mới (công pháp khóa -> mở sẵn trong sim)
  bang_han: { start: 'ice_needle', unlock: ['ice_needle', 'ice_nova'], want: ['evo:cuc_han_bang_tran', 'up:ice_needle', 'new:ice_nova', 'up:ice_nova', 'pas:linh_luc', 'pas:ngung_than', 'new:sword_qi'] },
  linh_phong: { start: 'sword_qi', unlock: ['spirit_orb', 'wind_step'], want: ['evo:linh_chau_phong_an', 'new:spirit_orb', 'up:spirit_orb', 'new:wind_step', 'up:sword_qi', 'up:wind_step', 'pas:linh_luc', 'pas:ho_mach'] },
};

const NAIVE = !!process.env.NAIVE;

// khoảng cách điểm -> đoạn thẳng, kèm điểm gần nhất
function segDist(px, py, x0, y0, x1, y1) {
  const vx = x1 - x0, vy = y1 - y0, l2 = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, ((px - x0) * vx + (py - y0) * vy) / l2));
  return [Math.hypot(px - (x0 + vx * t), py - (y0 + vy * t)), x0 + vx * t, y0 + vy * t];
}

// Lực né cảnh báo: mạnh hơn hẳn lực né quái thường
function dodge(run, p) {
  let vx = 0, vy = 0;
  const away = (x, y, w) => {
    let dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy);
    if (d < 2) { dx = -p.fy || 1; dy = p.fx; d = Math.hypot(dx, dy) || 1; }   // đứng ngay tâm: chạy ngang hướng đang đi
    vx += dx / d * w; vy += dy / d * w;
  };
  for (const h of run.scene.hazards) if (Math.hypot(p.x - h.x, p.y - h.y) < h.r + 12) away(h.x, h.y, 4);
  for (const f of run.scene.fireTrails || []) if (Math.hypot(p.x - f.x, p.y - f.y) < f.r + 10) away(f.x, f.y, 3);   // M10-05: tránh vệt lửa (đang nạp hay đang cháy)
  for (const m of run.scene.monsters) {
    if (m.st !== 'windup' && m.st !== 'dash' && m.st !== 'rest') continue;
    let L = 0;
    if (m.arch === 'charger') L = ARCH.charger.DASH_SPEED * ARCH.charger.DASH_TIME;
    else if (m.arch === 'chaser') L = WOLF_PACK.POUNCE.SPEED * WOLF_PACK.POUNCE.TIME;   // M10-04: sói chồm
    else if (m.boss && m.pat === 'dash') L = BOSS.MINI.DASH.SPEED * BOSS.MINI.DASH.TIME;
    else if (m.arch === 'ranged' && m.st === 'windup') L = 200;
    else if (m.boss && m.pat === 'claw' && m.st === 'windup' && Math.hypot(p.x - m.x, p.y - m.y) < BOSS_V2.MINI.CLAW.R + 14) away(m.x, m.y, 4);   // M10-09: lùi khỏi quạt
    else if (m.arch === 'elite' && m.st === 'windup' && Math.hypot(p.x - m.x, p.y - m.y) < (m.sk === 'claw' ? ELITE_V2.CLAW.R : ARCH.elite.SLAM_R) + 12) away(m.x, m.y, 4);   // M10-07: Hắc Trảo né bằng lùi khỏi bán kính
    if (L) for (const a of m.fan ? [0, -ICE_FAN.SPREAD, ICE_FAN.SPREAD] : [0]) {   // M10-06: quạt 3 tia -> né từng đường
      const c = Math.cos(a), s = Math.sin(a), ux = m.dirX * c - m.dirY * s, uy = m.dirX * s + m.dirY * c;
      const [d, cx, cy] = segDist(p.x, p.y, m.x, m.y, m.x + ux * L, m.y + uy * L);
      if (d < 20) away(cx, cy, 4);
    }
  }
  for (const s of run.scene.enemyShots) {
    const sp = Math.hypot(s.vx, s.vy) || 1, ux = s.vx / sp, uy = s.vy / sp;
    const [d, cx, cy] = segDist(p.x, p.y - 7, s.x, s.y, s.x + ux * 70, s.y + uy * 70);
    if (d < 12) away(cx, cy + 7, 3);
  }
  return [vx, vy];
}

export function simulate(buildName, L, seed, maxTime = 720) {
  const b = BUILDS[buildName];
  const run = createRun({ variant: process.env.VARIANT || 'thuong', unlocked: b.unlock || [], seed, startSkill: b.start, realmLevel: L, difficulty: +(process.env.DIFF || 0), mode: ROOMS_MODE ? 'rooms' : 'arena' });
  if (process.env.TACTICS !== undefined) run.tactics = process.env.TACTICS === '1';   // M10-02: TACTICS=1 bật AI chiến thuật, TACTICS=0 ép tắt
  if (process.env.SKILLS2 !== undefined) run.skillsV2 = process.env.SKILLS2 === '1';
  if (process.env.BOSS2 !== undefined) run.bossV2 = process.env.BOSS2 === '1';   // M10-C: BOSS2=1 bật boss 2 pha nhiều chiêu   // M10-B: SKILLS2=1 bật kỹ năng mới quái thường (M10-04…)
  const p = { x: run.scene.map.cx, y: run.scene.map.cy, fx: 1, fy: 0, inv: 0, dead: false };
  const ev = [], dt = 1 / 30;
  const evoAt = {};
  while (run.status === 'RUNNING' && run.time < maxTime) {
    // né: rời xa yêu thú gần (1/d²) + cảnh báo + kéo về chiến ý + kéo nhẹ về tâm
    let vx = 0, vy = 0;
    for (const m of run.scene.monsters) {
      const dx = p.x - m.x, dy = p.y - m.y, d2 = dx * dx + dy * dy;
      if (d2 < 90 * 90) { vx += dx / d2 * 40; vy += dy / d2 * 40; }
    }
    if (!NAIVE) { const [ax, ay] = dodge(run, p); vx += ax; vy += ay; }
    let best = null, bd = 1e9;
    for (const o of run.scene.orbs) { const d = Math.hypot(o.x - p.x, o.y - p.y); if (d < bd) { bd = d; best = o; } }
    if (best && bd < 160) { vx += (best.x - p.x) / bd * 0.6; vy += (best.y - p.y) / bd * 0.6; }
    if (ROOMS_MODE) {
      let [gx, gy, w] = roomTarget(run, p);
      if (w >= 1) [gx, gy] = pathStep(run, p, gx, gy);
      const dd = Math.hypot(gx - p.x, gy - p.y) || 1;
      if (w >= 1) { vx += (gx - p.x) / dd * w; vy += (gy - p.y) / dd * w; } else { vx += (gx - p.x) * w * 0.4; vy += (gy - p.y) * w * 0.4; }
      if (shrineReady(run, p)) useShrine(run, run.hp < run.maxHp * 0.6 ? 'heal' : 'power');
    } else { vx += (run.scene.map.cx - p.x) * 0.0015; vy += (run.scene.map.cy - p.y) * 0.0015; }
    const l = Math.hypot(vx, vy);
    if (l > 0.05) {
      p.fx = vx / l; p.fy = vy / l;
      const sp = PLAYER.SPEED * runStats(run).moveSpeed * dt;
      moveEntity(run.scene.map, p, p.fx * sp, p.fy * sp, null);
    }
    p.inv -= dt;
    if (process.env.TRACE && Math.floor(run.time * 30) % 300 === 0) console.log('t', Math.round(run.time), 'tile', Math.floor(p.x / 16), Math.floor(p.y / 16), 'room', run.rooms && run.rooms.cur, 'active', run.rooms && run.rooms.active, 'alive', run.scene.monsters.filter(m => !m.dead).length, 'tgt', ROOMS_MODE ? roomTarget(run, p).map(v => Math.round(v / 16 * 10) / 10) : '');
    updateRun(run, p, dt, ev);
    ev.length = 0;
    while (run.pendingDrafts > 0 && run.status === 'RUNNING') {
      let cards = drawCards(run, run.rng);
      const rank = c => { const i = b.want.findIndex(w => c.key === w); return i < 0 ? 99 : i; };
      if (REROLL && cards.every(c => rank(c) === 99)) cards = rerollDraft(run, run.rng, cards) || cards;
      cards.sort((a, c) => rank(a) - rank(c));
      applyCard(run, cards[0], { heal: f => { run.hp = Math.min(run.maxHp, run.hp + run.maxHp * f); }, onMaxHpChange: () => refreshMaxHp(run, false) });
      if (cards[0].type === 'EVOLUTION') evoAt[cards[0].id] = Math.round(run.time);
      run.pendingDrafts--;
    }
  }
  if (!run.outcome) run.outcome = 'TIMEOUT';
  const top = Object.entries(run.dmgBy).sort((a, c) => c[1] - a[1])[0];
  return { build: buildName, L, seed, outcome: run.outcome, time: Math.round(run.time), level: run.level, kills: run.kills, evo: evoAt,
    skills: run.skills.map(s => (s.evolved || s.id) + ':' + s.level).join(' '), dmgBy: run.dmgBy, topDmg: top ? top[0] : '-',
    bossAt: Object.fromEntries(run.rewards.map(x => [x.kind, x.t])), skillsUsed: run.skillsUsed, reward: computeRunReward(run, { realmLevel: L, firstClear: false }) };
}

const med = a => { if (!a.length) return '-'; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const fmt = s => s === '-' ? '-' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function summary(L, n) {
  const rows = [];
  for (const bn of Object.keys(BUILDS)) {
    const rs = []; for (let s = 1; s <= n; s++) rs.push(simulate(bn, L, 1000 + s));
    const deaths = rs.filter(r => r.outcome === 'LOSE');
    const causes = {}; for (const r of deaths) causes[r.topDmg] = (causes[r.topDmg] || 0) + 1;
    rows.push({ build: bn, win: rs.filter(r => r.outcome === 'WIN').length, n,
      mini: rs.filter(r => r.bossAt.MINI).length, timeMed: med(rs.map(r => r.time)), deathMed: med(deaths.map(r => r.time)),
      winAt: med(rs.filter(r => r.outcome === 'WIN').map(r => r.time)), lvl: med(rs.map(r => r.level)),
      evo: rs.filter(r => Object.keys(r.evo).length).length, stone: med(rs.map(r => r.reward.linhThach)),
      cause: Object.entries(causes).sort((a, c) => c[1] - a[1]).map(([k, v]) => `${k}×${v}`).join(' ') || '-' });
  }
  return rows;
}

if (process.argv[1] && process.argv[1].endsWith('sim.mjs')) {
  const args = process.argv.slice(2);
  if (args[0] === '--summary') {
    const L = +(args[1] ?? 0), n = +(args[2] ?? 8);
    console.log(`Bot ${NAIVE ? 'không né cảnh báo' : 'biết né cảnh báo'} · cảnh giới ${L} · ${n} seed/build`);
    console.log('build         thắng  hạ LV  tiến hóa  t trung vị  chết trung vị  thắng lúc  cấp  💎   chết vì');
    for (const r of summary(L, n))
      console.log(`${r.build.padEnd(13)} ${String(r.win).padStart(2)}/${r.n}  ${String(r.mini).padStart(2)}/${r.n}  ${String(r.evo).padStart(2)}/${r.n}     ${fmt(r.timeMed).padStart(5)}       ${fmt(r.deathMed).padStart(5)}        ${fmt(r.winAt).padStart(5)}    ${String(r.lvl).padStart(2)}  ${String(r.stone).padStart(3)}  ${r.cause}`);
  } else {
    const [bArg, lArg, nArg] = args;
    const builds = bArg && BUILDS[bArg] ? [bArg] : Object.keys(BUILDS);
    const Ls = lArg != null ? [+lArg] : [0, 9];
    const n = +(nArg || 3);
    for (const bn of builds) for (const L of Ls) for (let s = 1; s <= n; s++) {
      const r = simulate(bn, L, 1000 + s);
      console.log(`${bn.padEnd(13)} L${String(L).padEnd(2)} seed${s} ${r.outcome.padEnd(7)} ${String(r.time).padStart(3)}s  cấp ${String(r.level).padStart(2)}  giết ${String(r.kills).padStart(4)}  boss ${JSON.stringify(r.bossAt)}  thưởng ${r.reward.linhThach}💎 ${r.reward.tickets}🎫  tiến hóa ${JSON.stringify(r.evo)}  | ${r.skills}` + (process.env.DMG ? '\n    dmg ' + JSON.stringify(Object.fromEntries(Object.entries(r.dmgBy).map(([k, v]) => [k, Math.round(v)]))) : ''));
    }
  }
}
