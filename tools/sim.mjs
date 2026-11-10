// Mô phỏng run không giao diện để cân bằng sơ bộ. Bot tự né (chạy khỏi yêu thú, nhặt chiến ý) và chọn thẻ theo ưu tiên.
// Đây KHÔNG phải playtest của người thật; chỉ dùng để thấy xu hướng.
//
//   node tools/sim.mjs                 # mọi build, cảnh giới 0 và 9, 3 seed
//   node tools/sim.mjs sword_qi 0 5
import { createRun, updateRun, refreshMaxHp } from '../src/systems/run.js';
import { drawCards, applyCard } from '../src/progression/draft.js';
import { runStats } from '../src/systems/combat.js';
import { moveEntity } from '../src/entities/monsters.js';
import { PLAYER, RUN } from '../src/core/config.js';

const BUILDS = {
  kiem_loi: { start: 'sword_qi', want: ['evo:loi_dinh_van_kiem', 'up:sword_qi', 'new:thunder_strike', 'new:sword_qi', 'up:thunder_strike', 'pas:linh_luc', 'pas:ngung_than', 'new:body_aura'] },
  phi_kiem_hoa: { start: 'fire_orb', want: ['evo:liet_diem_kiem_tran', 'new:sword_array', 'up:sword_array', 'up:fire_orb', 'pas:linh_luc', 'pas:ngung_than', 'new:fire_ring'] },
  hoa_phong: { start: 'fire_orb', want: ['evo:hoa_long_quyen', 'new:fire_ring', 'up:fire_ring', 'new:wind_blade', 'up:fire_orb', 'pas:tu_khi', 'pas:linh_luc'] },
  loi_the: { start: 'thunder_strike', want: ['evo:loi_cuong_ho_the', 'new:body_aura', 'up:body_aura', 'new:thunder_field', 'up:thunder_strike', 'up:thunder_field', 'pas:ho_mach'] },
};

export function simulate(buildName, L, seed, maxTime = RUN.DURATION) {
  const b = BUILDS[buildName];
  const run = createRun({ seed, startSkill: b.start, realmLevel: L });
  const p = { x: run.scene.map.cx, y: run.scene.map.cy, fx: 1, fy: 0, inv: 0, dead: false };
  const ev = [], dt = 1 / 30;
  const evoAt = {};
  while (run.status === 'RUNNING' && run.time < maxTime) {
    // né: vector rời xa yêu thú gần (trọng số 1/d²) + kéo về chiến ý gần nhất + kéo nhẹ về tâm
    let vx = 0, vy = 0;
    for (const m of run.scene.monsters) {
      const dx = p.x - m.x, dy = p.y - m.y, d2 = dx * dx + dy * dy;
      if (d2 < 90 * 90) { vx += dx / d2 * 40; vy += dy / d2 * 40; }
    }
    let best = null, bd = 1e9;
    for (const o of run.scene.orbs) { const d = Math.hypot(o.x - p.x, o.y - p.y); if (d < bd) { bd = d; best = o; } }
    if (best && bd < 160) { vx += (best.x - p.x) / bd * 0.6; vy += (best.y - p.y) / bd * 0.6; }
    vx += (run.scene.map.cx - p.x) * 0.0015; vy += (run.scene.map.cy - p.y) * 0.0015;
    const l = Math.hypot(vx, vy);
    if (l > 0.05) {
      p.fx = vx / l; p.fy = vy / l;
      const sp = PLAYER.SPEED * runStats(run).moveSpeed * dt;
      moveEntity(run.scene.map, p, p.fx * sp, p.fy * sp, null);
    }
    p.inv -= dt;
    updateRun(run, p, dt, ev);
    ev.length = 0;
    while (run.pendingDrafts > 0 && run.status === 'RUNNING') {
      const cards = drawCards(run, run.rng);
      const rank = c => { const i = b.want.findIndex(w => c.key === w || (w.startsWith('up:') && c.key === w)); return i < 0 ? 99 : i; };
      cards.sort((a, c) => rank(a) - rank(c));
      applyCard(run, cards[0], { heal: f => { run.hp = Math.min(run.maxHp, run.hp + run.maxHp * f); }, onMaxHpChange: () => refreshMaxHp(run, false) });
      if (cards[0].type === 'EVOLUTION') evoAt[cards[0].id] = Math.round(run.time);
      run.pendingDrafts--;
    }
  }
  return { build: buildName, L, seed, outcome: run.outcome || 'TIMEOUT', time: Math.round(run.time), level: run.level, kills: run.kills, evo: evoAt, skills: run.skills.map(s => (s.evolved || s.id) + ':' + s.level).join(' ') };
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('sim.mjs')) {
  const [bArg, lArg, nArg] = process.argv.slice(2);
  const builds = bArg && BUILDS[bArg] ? [bArg] : Object.keys(BUILDS);
  const Ls = lArg != null ? [+lArg] : [0, 9];
  const n = +(nArg || 3);
  for (const bn of builds) for (const L of Ls) for (let s = 1; s <= n; s++) {
    const r = simulate(bn, L, 1000 + s);
    console.log(`${bn.padEnd(13)} L${String(L).padEnd(2)} seed${s} ${r.outcome.padEnd(7)} ${String(r.time).padStart(3)}s  cấp ${String(r.level).padStart(2)}  giết ${String(r.kills).padStart(4)}  tiến hóa ${JSON.stringify(r.evo)}  | ${r.skills}`);
  }
}
