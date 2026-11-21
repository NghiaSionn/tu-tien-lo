// M10-01: đo baseline trước khi nâng AI quái/boss. Chỉ đọc — không đổi gameplay.
//   node tools/m10_baseline.mjs [seeds=10] [realm=0]  -> in JSON: thắng theo build/seed, nguồn sát thương, nguồn gây chết, thời gian logic/tick
import { simulate, BUILDS } from './sim.mjs';
const n = +(process.argv[2] || 10), L = +(process.argv[3] || 0);
const out = { realm: L, seeds: n, builds: {}, dmgBy: {}, deathBy: {}, total: { runs: 0, win: 0, lose: 0, timeout: 0 } };
const t0 = performance.now(); let simSec = 0;
for (const b of Object.keys(BUILDS)) {
  const row = { win: 0, lose: 0, timeout: 0, mini: 0, seeds: '', deathT: [], winT: [] };
  for (let s = 1; s <= n; s++) {
    const r = simulate(b, L, 1000 + s);
    simSec += r.time; out.total.runs++;
    if (r.outcome === 'WIN') { row.win++; out.total.win++; row.winT.push(r.time); row.seeds += 'W'; }
    else if (r.outcome === 'LOSE') { row.lose++; out.total.lose++; row.deathT.push(r.time); row.seeds += 'L'; out.deathBy[r.topDmg] = (out.deathBy[r.topDmg] || 0) + 1; }
    else { row.timeout++; out.total.timeout++; row.seeds += 'T'; }
    if (r.bossAt.MINI) row.mini++;
    for (const [k, v] of Object.entries(r.dmgBy)) out.dmgBy[k] = (out.dmgBy[k] || 0) + v;
  }
  out.builds[b] = row;
}
const wall = (performance.now() - t0) / 1000;
out.logicMsPerTick = +(wall * 1000 / (simSec * 30)).toFixed(4);   // sim chạy 30 tick/giây game
const tot = Object.values(out.dmgBy).reduce((a, v) => a + v, 0);
out.dmgShare = Object.fromEntries(Object.entries(out.dmgBy).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v / tot * 100).toFixed(1)]));
delete out.dmgBy;
console.log(JSON.stringify(out, null, 1));
