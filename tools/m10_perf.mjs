// M10-08 / GATE M10-B: đo thời gian xử lý gameplay (logic, không vẽ) mỗi tick — AI cũ (tắt cờ) và AI mới (tactics + skillsV2)
// trên CÙNG kịch bản stress: cùng seed, người chơi bất tử đi vòng cố định tới sau Yêu Vương, chạy xen kẽ nhiều lần để giảm nhiễu.
// Dùng: node tools/m10_perf.mjs [lặp=3] [seeds=4]
import { createRun, updateRun } from '../src/systems/run.js';

const REPS = +(process.argv[2] || 3), SEEDS = +(process.argv[3] || 4), DT = 1 / 30, SEC = 400;

function one(seed, on) {
  const r = createRun({ seed, startSkill: 'sword_qi', realmLevel: 0 }); r.tactics = on; r.skillsV2 = on;
  const p = { x: r.scene.map.cx, y: r.scene.map.cy, inv: 1, dead: false, fx: 1, fy: 0 };
  const ms = [];
  let mons = 0;
  for (let i = 0; i < SEC / DT && r.status === 'RUNNING'; i++) {
    const a = r.time / 6; p.x = r.scene.map.cx + Math.cos(a) * 70; p.y = r.scene.map.cy + Math.sin(a) * 50; p.inv = 1;
    const t0 = process.hrtime.bigint();
    updateRun(r, p, DT, []);
    ms.push(Number(process.hrtime.bigint() - t0) / 1e6);
    r.hp = r.maxHp; r.pendingDrafts = 0;
    mons = Math.max(mons, r.scene.monsters.length);
  }
  return { ms, mons };
}
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };

const all = { off: [], on: [] }, peak = { off: 0, on: 0 };
one(999, true); one(999, false);   // khởi động JIT
for (let k = 0; k < REPS; k++) for (let s = 1; s <= SEEDS; s++) for (const mode of k % 2 ? ['on', 'off'] : ['off', 'on']) {
  const r = one(s, mode === 'on'); all[mode].push(...r.ms); peak[mode] = Math.max(peak[mode], r.mons);
}
const out = {};
for (const m of ['off', 'on']) out[m] = { ticks: all[m].length, mean: +(all[m].reduce((a, v) => a + v, 0) / all[m].length).toFixed(4), p50: +q(all[m], 0.5).toFixed(4), p95: +q(all[m], 0.95).toFixed(4), p99: +q(all[m], 0.99).toFixed(4), max: +q(all[m], 1).toFixed(3), peakMonsters: peak[m] };
out.p95Increase = +((out.on.p95 / out.off.p95 - 1) * 100).toFixed(1);
out.meanIncrease = +((out.on.mean / out.off.mean - 1) * 100).toFixed(1);
console.log(JSON.stringify(out, null, 1));
