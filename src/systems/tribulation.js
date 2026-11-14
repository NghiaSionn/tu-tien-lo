// Thiên kiếp tương tác (M3-03) — thay xổ số 70% khi xung kích đại cảnh giới. Thuần logic, seed cố định:
// thắng/thua do người chơi né, không do RNG độc lập. Ba nhịp, mỗi đòn đều có cảnh báo (gồng) trước khi đánh:
//   1. Lôi ấn: vòng sét rơi vào chỗ đứng + quanh đó -> chạy ra khỏi vòng
//   2. Lôi xà: dải sét quét ngang trận -> rời khỏi dải
//   3. Thiên lôi: sét phủ cả trận trừ vài ô an toàn -> đứng vào ô an toàn
// Sát thương trừ thẳng khí huyết động phủ (meta.hp, theo tỉ lệ khí huyết tối đa). Khí huyết về 0 = thất bại.
import { TRIBULATION as TB } from '../core/config.js';
import { mulberry32 } from '../core/rng.js';

// opts (M8 sảnh tông môn): { ry, extraMarks, extraLines } — trận elip bán trục R×ry (mặc định tròn) và thêm đòn
export function createTrib(seed, cx, cy, R = TB.ARENA_R, opts = {}) {
  return { rng: mulberry32(seed >>> 0), cx, cy, R, RY: opts.ry || R, extraMarks: opts.extraMarks || 0, extraLines: opts.extraLines || 0,
    t: 0, phase: 0, phaseT: 0, spawnT: 0.6, hazards: [], hits: 0, strikes: 0, done: null };
}
const RX = trib => trib.R || TB.ARENA_R, RY = trib => trib.RY || RX(trib);

export const phaseDef = trib => TB.PHASES[trib.phase];
export const totalDuration = () => TB.PHASES.reduce((a, p) => a + p.dur, 0);

function inArena(trib, x, y, margin = 0) { return Math.hypot((x - trib.cx) / (RX(trib) - margin), (y - trib.cy) / (RY(trib) - margin)) <= 1; }
function randomIn(trib, margin) {
  for (let i = 0; i < 20; i++) {
    const a = trib.rng() * Math.PI * 2, r = Math.sqrt(trib.rng());
    const x = trib.cx + Math.cos(a) * r * (RX(trib) - margin), y = trib.cy + Math.sin(a) * r * (RY(trib) - margin);
    if (inArena(trib, x, y, margin)) return [x, y];
  }
  return [trib.cx, trib.cy];
}

function spawn(trib, player) {
  const P = phaseDef(trib);
  if (P.kind === 'marks') {
    // một vòng ngay chỗ đứng + vài vòng ngẫu nhiên
    trib.hazards.push({ kind: 'circle', x: player.x, y: player.y, r: P.r, t: P.windup, max: P.windup, dmg: P.dmg });
    for (let i = 1; i < P.n + trib.extraMarks; i++) { const [x, y] = randomIn(trib, P.r); trib.hazards.push({ kind: 'circle', x, y, r: P.r, t: P.windup, max: P.windup, dmg: P.dmg }); }
  } else if (P.kind === 'lines') {
    for (let i = 0; i < P.lines + trib.extraLines; i++) {
      const a = trib.rng() * Math.PI, off = i === 0 ? 0 : (trib.rng() - 0.5) * RX(trib);
      // dải đi qua (gần) người chơi, xuyên hết trận
      const nx = -Math.sin(a), ny = Math.cos(a), px = player.x + nx * off, py = player.y + ny * off, L = RX(trib) * 2.2;
      trib.hazards.push({ kind: 'line', x0: px - Math.cos(a) * L / 2, y0: py - Math.sin(a) * L / 2, x1: px + Math.cos(a) * L / 2, y1: py + Math.sin(a) * L / 2, w: P.w, t: P.windup, max: P.windup, dmg: P.dmg });
    }
  } else if (P.kind === 'storm') {
    // công bằng: ô an toàn đầu tiên luôn trong tầm chạy tới kịp (≤ REACH px), các ô còn lại ngẫu nhiên
    const safe = [];
    for (let k = 0; k < 20 && !safe.length; k++) {
      const a = trib.rng() * Math.PI * 2, r = 25 + trib.rng() * (P.reach - 25);
      const x = player.x + Math.cos(a) * r, y = player.y + Math.sin(a) * r;
      if (inArena(trib, x, y, P.safeR + 4)) safe.push([x, y]);
    }
    while (safe.length < P.gaps) safe.push(randomIn(trib, P.safeR + 6));
    trib.hazards.push({ kind: 'storm', x: trib.cx, y: trib.cy, r: RX(trib), ry: RY(trib), safe: safe.map(([x, y]) => ({ x, y, r: P.safeR })), t: P.windup, max: P.windup, dmg: P.dmg });
  }
}

export function hazardHits(h, x, y) {
  if (h.kind === 'circle') return Math.hypot(x - h.x, y - h.y) < h.r;
  if (h.kind === 'line') {
    const vx = h.x1 - h.x0, vy = h.y1 - h.y0, l2 = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((x - h.x0) * vx + (y - h.y0) * vy) / l2));
    return Math.hypot(x - (h.x0 + vx * t), y - (h.y0 + vy * t)) < h.w / 2;
  }
  if (h.kind === 'storm') return !h.safe.some(s => Math.hypot(x - s.x, y - s.y) < s.r);
  return false;
}

// Giữ người chơi trong trận thử thách (gọi sau khi di chuyển)
export function clampToArena(trib, p) {
  const dx = p.x - trib.cx, dy = p.y - trib.cy, rx = RX(trib) - 4, ry = RY(trib) - 4, n = Math.hypot(dx / rx, dy / ry);
  if (n > 1) { p.x = trib.cx + dx / n; p.y = trib.cy + dy / n; }
}

// Một bước. onHit(fraction) trừ khí huyết (tỉ lệ max); trả về các đòn vừa đánh để vẽ hiệu ứng.
export function updateTrib(trib, player, dt, onHit) {
  const strikes = [];
  if (trib.done || !(dt > 0)) return strikes;
  trib.t += dt; trib.phaseT += dt;
  for (let i = trib.hazards.length - 1; i >= 0; i--) {
    const h = trib.hazards[i];
    h.t -= dt;
    if (h.t > 0) continue;
    trib.hazards.splice(i, 1);
    const hit = hazardHits(h, player.x, player.y);
    trib.strikes++;
    if (hit) { trib.hits++; onHit(h.dmg); }
    strikes.push({ h, hit });
    if (trib.done) return strikes;
  }
  const P = phaseDef(trib);
  if (trib.phaseT >= P.dur) {
    if (trib.hazards.length) return strikes;            // chờ các đòn đang gồng đánh xong rồi mới qua nhịp
    trib.phase++; trib.phaseT = 0; trib.spawnT = 0.8;
    if (trib.phase >= TB.PHASES.length) trib.done = 'WIN';
    return strikes;
  }
  trib.spawnT -= dt;
  if (trib.spawnT <= 0 && trib.phaseT < P.dur - P.windup) { spawn(trib, player); trib.spawnT = P.every; }
  return strikes;
}
