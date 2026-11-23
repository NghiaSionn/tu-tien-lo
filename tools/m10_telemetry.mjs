// M10-12: A/B số liệu chiến đấu — AI cũ (tắt cả 3 cờ) và AI mới (tactics + skillsV2 + bossV2) trên CÙNG seed/build/cảnh giới.
// Bot của tools/sim.mjs (không phải người thật). In bảng Markdown + ghi JSON.
// Dùng: node tools/m10_telemetry.mjs [seeds=6] [cảnh giới=0] [độ khó=0] [file json]
import { writeFileSync } from 'node:fs';
import { simulate, BUILDS } from './sim.mjs';

const SEEDS = +(process.argv[2] || 6), L = +(process.argv[3] || 0), DIFF = +(process.argv[4] || 0), OUT = process.argv[5];
const MODES = { cu: { TACTICS: '0', SKILLS2: '0', BOSS2: '0' }, moi: { TACTICS: '1', SKILLS2: '1', BOSS2: '1' } };
process.env.DIFF = String(DIFF);

const med = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const r1 = v => v === null || v === undefined ? '–' : (Math.round(v * 10) / 10).toString().replace('.', ',');

const res = {};
for (const [mode, env] of Object.entries(MODES)) {
  Object.assign(process.env, env);
  const runs = [];
  let wall = 0, ticks = 0;
  for (const b of Object.keys(BUILDS)) for (let s = 0; s < SEEDS; s++) {
    const t0 = process.hrtime.bigint();
    const r = simulate(b, L, 1001 + s);
    wall += Number(process.hrtime.bigint() - t0) / 1e6; ticks += r.time * 30;
    runs.push({ build: b, seed: 1001 + s, outcome: r.outcome, tele: r.tele });
  }
  const T = runs.map(x => x.tele), lose = T.filter(t => t.outcome === 'LOSE');
  const death = {}, hits = {};
  for (const t of lose) death[t.deathCause || '?'] = (death[t.deathCause || '?'] || 0) + 1;
  for (const t of T) for (const [k, v] of Object.entries(t.hitsBy)) hits[k] = (hits[k] || 0) + v;
  const boss = k => { const B = T.map(t => t.boss[k]).filter(Boolean); const done = B.filter(b => b.dur !== undefined);
    return { met: B.length, killed: done.length, durMed: med(done.map(b => b.dur)), durMean: mean(done.map(b => b.dur)), p2Reached: B.filter(b => b.p2 !== undefined).length }; };
  res[mode] = {
    runs: runs.length, win: T.filter(t => t.outcome === 'WIN').length, lose: lose.length,
    deathCause: death, hitsPerRun: Object.fromEntries(Object.entries(hits).map(([k, v]) => [k, +(v / runs.length).toFixed(2)])),
    threatPeakMean: +mean(T.map(t => t.threatPeak)).toFixed(2), threatPeakMax: Math.max(...T.map(t => t.threatPeak)),
    peakMonsters: Math.max(...T.map(t => t.peakMonsters)), peakShots: Math.max(...T.map(t => t.peakShots)),
    bossMini: boss('MINI'), bossFinal: boss('FINAL'), logicMsPerTick: +(wall / ticks).toFixed(4),
    seeds: Object.fromEntries(Object.keys(BUILDS).map(b => [b, runs.filter(x => x.build === b).map(x => x.outcome[0]).join('')])),
  };
}
if (OUT) writeFileSync(OUT, JSON.stringify({ seeds: SEEDS, realm: L, difficulty: DIFF, ...res }, null, 1));

// ---------- bảng Markdown ----------
const A = res.cu, B = res.moi, lines = [];
lines.push(`### Cảnh giới ${L}, độ khó ${DIFF} — ${A.runs} lượt mỗi chế độ (${SEEDS} seed × ${Object.keys(BUILDS).length} build)`, '');
lines.push('| | AI cũ | AI mới |', '|---|---|---|');
lines.push(`| Thắng | ${A.win}/${A.runs} | ${B.win}/${B.runs} |`);
lines.push(`| Đỉnh đe dọa trong khung nhìn (TB / max) | ${r1(A.threatPeakMean)} / ${A.threatPeakMax} | ${r1(B.threatPeakMean)} / ${B.threatPeakMax} |`);
lines.push(`| Quái / đạn quái cùng lúc (max) | ${A.peakMonsters} / ${A.peakShots} | ${B.peakMonsters} / ${B.peakShots} |`);
for (const [k, name] of [['bossMini', 'Lang Vương'], ['bossFinal', 'Yêu Vương']]) {
  lines.push(`| ${name}: gặp / hạ / vào P2 | ${A[k].met} / ${A[k].killed} / ${A[k].p2Reached} | ${B[k].met} / ${B[k].killed} / ${B[k].p2Reached} |`);
  lines.push(`| ${name}: thời gian trận (trung vị / TB, s) | ${r1(A[k].durMed)} / ${r1(A[k].durMean)} | ${r1(B[k].durMed)} / ${r1(B[k].durMean)} |`);
}
lines.push(`| Logic ms/tick (node) | ${A.logicMsPerTick} | ${B.logicMsPerTick} |`, '');
const bar = (v, max) => '█'.repeat(Math.max(0, Math.round(v / Math.max(1, max) * 20)));
lines.push('**Nguồn gây chết (đòn kết liễu)**', '', '| Nguồn | AI cũ | AI mới | |', '|---|---|---|---|');
const dk = [...new Set([...Object.keys(A.deathCause), ...Object.keys(B.deathCause)])].sort((x, y) => (B.deathCause[y] || 0) + (A.deathCause[y] || 0) - (B.deathCause[x] || 0) - (A.deathCause[x] || 0));
const dmax = Math.max(1, ...dk.map(k => Math.max(A.deathCause[k] || 0, B.deathCause[k] || 0)));
for (const k of dk) lines.push(`| ${k} | ${A.deathCause[k] || 0} | ${B.deathCause[k] || 0} | \`${bar(B.deathCause[k] || 0, dmax)}\` |`);
lines.push('', '**Số lần trúng đòn trung bình mỗi lượt theo kỹ năng**', '', '| Nguồn | AI cũ | AI mới | |', '|---|---|---|---|');
const hk = [...new Set([...Object.keys(A.hitsPerRun), ...Object.keys(B.hitsPerRun)])].sort((x, y) => (B.hitsPerRun[y] || 0) - (B.hitsPerRun[x] || 0));
const hmax = Math.max(1, ...hk.map(k => B.hitsPerRun[k] || 0));
for (const k of hk) lines.push(`| ${k} | ${r1(A.hitsPerRun[k] || 0)} | ${r1(B.hitsPerRun[k] || 0)} | \`${bar(B.hitsPerRun[k] || 0, hmax)}\` |`);
console.log(lines.join('\n'));
