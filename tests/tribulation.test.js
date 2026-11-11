// M3-03: thiên kiếp tương tác — kỹ năng quyết định, không phải xổ số
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTrib, updateTrib, clampToArena, hazardHits, totalDuration } from '../src/systems/tribulation.js';
import { TRIBULATION as TB, PLAYER } from '../src/core/config.js';

const CX = 640, CY = 480;
// chạy trọn thiên kiếp; brain(trib, p, dt) điều khiển; trả về tổng sát thương (tỉ lệ máu) và trib
function play(seed, brain) {
  const trib = createTrib(seed, CX, CY), p = { x: CX, y: CY + 10, fx: 0, fy: 1 };
  let taken = 0;
  for (let i = 0; i < 60 * 60 && !trib.done; i++) {
    const dt = 1 / 60;
    if (brain) brain(trib, p, dt);
    clampToArena(trib, p);
    updateTrib(trib, p, dt, f => { taken += f; });
  }
  return { taken, trib };
}

// "Người chơi" nhìn cảnh báo: thử nhiều điểm quanh mình, chọn điểm an toàn (có biên 4 px) mà đường đi tới đó không cắt
// qua vùng sắp nổ trước khi tới nơi; giữ mục tiêu tới khi tới; đi với tốc độ thật của nhân vật.
function dodger(trib, p, dt) {
  const sp = PLAYER.SPEED * dt, V = PLAYER.SPEED;
  const unsafeAt = (x, y, h) => {
    if (h.kind === 'circle') return Math.hypot(x - h.x, y - h.y) < h.r + 4;
    if (h.kind === 'storm') return !h.safe.some(s => Math.hypot(x - s.x, y - s.y) < s.r - 4);
    return hazardHits({ ...h, w: h.w + 8 }, x, y);
  };
  // điểm (x,y) có bị đòn nào nổ trúng trong lúc ta đi tới/đứng đó không
  const pathRisk = (x, y) => {
    const d = Math.hypot(x - p.x, y - p.y), arrive = d / V;
    let s = Math.hypot(x - CX, y - CY) > TB.ARENA_R - 8 ? 100 : 0;
    for (const h of trib.hazards) {
      if (unsafeAt(x, y, h)) s += 10;                                  // đích nằm trong vùng
      for (const f of [0.33, 0.66]) {                                  // đi ngang vùng đúng lúc nó nổ
        const tx = p.x + (x - p.x) * f, ty = p.y + (y - p.y) * f;
        if (Math.abs(h.t - arrive * f) < 0.15 && unsafeAt(tx, ty, h)) s += 10;
      }
    }
    return s + d * 0.01;
  };
  const hereBad = trib.hazards.some(h => unsafeAt(p.x, p.y, h));
  if (!hereBad) { p.goal = null; return; }
  if (!p.goal || pathRisk(p.goal[0], p.goal[1]) >= 5) {
    let best = null, bs = Infinity;
    for (const R of [15, 30, 45, 65, 85]) for (let k = 0; k < 32; k++) {
      const a = k / 32 * Math.PI * 2, x = p.x + Math.cos(a) * R, y = p.y + Math.sin(a) * R;
      const sc = pathRisk(x, y);
      if (sc < bs) { bs = sc; best = [x, y]; }
    }
    p.goal = best;
  }
  const dx = p.goal[0] - p.x, dy = p.goal[1] - p.y, d = Math.hypot(dx, dy);
  if (d > 0.5) { p.x += dx / d * Math.min(sp, d); p.y += dy / d * Math.min(sp, d); }
}

test('đủ 3 nhịp, ~24 giây, rồi kết thúc WIN về mặt kịch bản', () => {
  const { trib } = play(1, dodger);
  assert.equal(trib.done, 'WIN'); assert.equal(trib.phase, TB.PHASES.length);
  assert.ok(trib.t >= totalDuration() && trib.t < totalDuration() + 4, 't=' + trib.t);
});

test('đứng yên thì trúng nhiều, tổng sát thương đủ làm thất bại', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const { taken } = play(seed, null);
    assert.ok(taken >= 1, `seed ${seed}: đứng yên chỉ mất ${taken.toFixed(2)} máu`);
  }
});

test('né theo cảnh báo với tốc độ nhân vật thì vượt được (mọi seed thử)', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const { taken } = play(seed, dodger);
    assert.ok(taken < 0.5, `seed ${seed}: né vẫn mất ${taken.toFixed(2)}`);
  }
});

test('kết quả không phụ thuộc may rủi: cùng seed + cùng thao tác -> cùng kết quả', () => {
  const a = play(7, dodger), b = play(7, dodger);
  assert.equal(a.taken, b.taken); assert.equal(a.trib.hits, b.trib.hits);
});

test('đòn chỉ đánh sau khi hết gồng (có cảnh báo trước)', () => {
  const trib = createTrib(3, CX, CY), p = { x: CX, y: CY };
  let firstHitAt = -1, firstSpawnAt = -1;
  for (let i = 0; i < 600 && firstHitAt < 0; i++) {
    updateTrib(trib, p, 1 / 60, () => { if (firstHitAt < 0) firstHitAt = trib.t; });
    if (firstSpawnAt < 0 && trib.hazards.length) firstSpawnAt = trib.t;
  }
  assert.ok(firstSpawnAt >= 0 && firstHitAt - firstSpawnAt >= TB.PHASES[0].windup - 0.02);
});

test('bị giữ trong trận thử thách', () => {
  const trib = createTrib(1, CX, CY), p = { x: CX + 500, y: CY };
  clampToArena(trib, p);
  assert.ok(Math.hypot(p.x - CX, p.y - CY) <= TB.ARENA_R);
});

test('đã xong thì không chạy tiếp, không đánh thêm', () => {
  const { trib } = play(2, dodger);
  let n = 0; updateTrib(trib, { x: CX, y: CY }, 1, () => n++);
  assert.equal(n, 0);
});
