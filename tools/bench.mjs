// Đo thời gian LOGIC mỗi khung của cảnh stress (M5-04): 100 quái + 200 đạn (+ vùng/đạn quái), chạy đúng code game.
// Không đo phần vẽ (cần canvas trình duyệt) — phần vẽ đo bằng overlay trong game (F3) với ?stress=1.
//   node tools/bench.mjs
import { createRun, updateRun } from '../src/systems/run.js';
import { makeRunEnemy } from '../src/systems/director.js';
import { RUN } from '../src/core/config.js';

function scene(nMon, nProj) {
  const r = createRun({ seed: 7, startSkill: 'sword_qi', realmLevel: 0 });
  r.scene.map.tiles.fill(0);
  r.skills = [{ id: 'sword_qi', level: 5, evolved: 'loi_dinh_van_kiem', st: {} }, { id: 'fire_orb', level: 5, evolved: null, st: {} },
    { id: 'thunder_field', level: 5, evolved: null, st: {} }, { id: 'sword_array', level: 5, evolved: 'liet_diem_kiem_tran', st: {} }];
  const p = { x: r.scene.map.cx, y: r.scene.map.cy, fx: 1, fy: 0, inv: 1e9 };
  r.time = 200; r.dir.spawnT = 1e9; r.dir.waveIdx = 99; r.dir.eliteT = 1e9; r.dir.mini = r.dir.final = 'DEAD';
  const archs = ['chaser', 'chaser', 'charger', 'ranged'];
  for (let i = 0; i < nMon; i++) {
    const a = i / nMon * 6.283, d = 60 + (i % 7) * 18;
    const m = makeRunEnemy(r, archs[i % 4], p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 1);
    m.hp = m.max = 1e12;
  }
  for (let i = 0; i < nProj; i++) {
    const a = i * 0.37;
    r.scene.projectiles.push({ kind: 'bolt', x: p.x, y: p.y - 8, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 99, dmg: 0.0001, pierce: 999, hits: new Set(), heading: a });
  }
  return { r, p };
}

function measure(nMon, nProj, frames = 600) {
  const { r, p } = scene(nMon, nProj);
  const dt = 1 / 60, ts = [];
  for (let i = 0; i < 60; i++) updateRun(r, p, dt, []);          // làm nóng JIT
  for (let i = 0; i < frames; i++) {
    // giữ số lượng ổn định (đạn hết hạn/biến mất thì bơm lại)
    while (r.scene.projectiles.length < nProj) { const a = Math.random() * 6.283; r.scene.projectiles.push({ kind: 'bolt', x: p.x, y: p.y - 8, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 99, dmg: 0.0001, pierce: 999, hits: new Set(), heading: a }); }
    const ev = [];
    const t0 = performance.now();
    updateRun(r, p, dt, ev);
    ts.push(performance.now() - t0);
  }
  ts.sort((a, b) => a - b);
  const q = f => ts[Math.min(ts.length - 1, Math.floor(ts.length * f))];
  return { nMon: r.scene.monsters.length, nProj: r.scene.projectiles.length, med: q(0.5), p95: q(0.95), p99: q(0.99), max: ts[ts.length - 1] };
}

console.log(`Node ${process.version} · ${process.platform} · logic/khung (ms), 600 khung`);
for (const [m, pr] of [[30, 40], [100, 200], [100, Math.min(200, RUN.MAX_PROJECTILES)], [200, 220]]) {
  const r = measure(m, pr);
  console.log(`${String(r.nMon).padStart(3)} quái ${String(r.nProj).padStart(3)} đạn: trung vị ${r.med.toFixed(2)} · p95 ${r.p95.toFixed(2)} · p99 ${r.p99.toFixed(2)} · max ${r.max.toFixed(2)}`);
}
