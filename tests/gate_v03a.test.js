// GATE v0.3a ở mức logic: run -> mang linh khí về -> tọa thiền -> đột phá tầng nhỏ -> thiên kiếp tương tác -> mở khóa -> run khác
// (Không thay cho chơi trong trình duyệt — theo chỉ đạo 12/11 bỏ bước kiểm tra trình duyệt cho M3.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, endRun } from '../src/systems/run.js';
import { computeRunReward, stageReward, claimReward } from '../src/progression/rewards.js';
import { meditateTick, canBreak, levelUp, failTribulation } from '../src/systems/cultivation.js';
import { isMajor, need } from '../src/progression/realm.js';
import { createTrib, updateTrib, clampToArena, hazardHits } from '../src/systems/tribulation.js';
import { defaultMeta, sanitizeMeta, writeSave, loadSave, memoryStorage } from '../src/persistence/save.js';
import { TRIBULATION as TB, PLAYER } from '../src/core/config.js';

const ctx = { canStand: () => true, hubSpawn: { x: 640, y: 480 } };

function dodge(trib, p, dt) {   // người chơi né theo cảnh báo (giống tests/tribulation.test.js)
  const unsafe = (x, y, h) => h.kind === 'circle' ? Math.hypot(x - h.x, y - h.y) < h.r + 4 : h.kind === 'storm' ? !h.safe.some(s => Math.hypot(x - s.x, y - s.y) < s.r - 4) : hazardHits({ ...h, w: h.w + 8 }, x, y);
  const risk = (x, y) => { const d = Math.hypot(x - p.x, y - p.y), ar = d / PLAYER.SPEED; let s = Math.hypot(x - trib.cx, y - trib.cy) > TB.ARENA_R - 8 ? 100 : 0;
    for (const h of trib.hazards) { if (unsafe(x, y, h)) s += 10; for (const f of [0.33, 0.66]) if (Math.abs(h.t - ar * f) < 0.15 && unsafe(p.x + (x - p.x) * f, p.y + (y - p.y) * f, h)) s += 10; } return s + d * 0.01; };
  if (!trib.hazards.some(h => unsafe(p.x, p.y, h))) { p.goal = null; return; }
  if (!p.goal || risk(...p.goal) >= 5) { let bs = Infinity; for (const R of [15, 30, 45, 65, 85]) for (let k = 0; k < 32; k++) { const a = k / 32 * 6.283, x = p.x + Math.cos(a) * R, y = p.y + Math.sin(a) * R, sc = risk(x, y); if (sc < bs) { bs = sc; p.goal = [x, y]; } } }
  const dx = p.goal[0] - p.x, dy = p.goal[1] - p.y, d = Math.hypot(dx, dy); if (d > 0.5) { const sp = PLAYER.SPEED * dt; p.x += dx / d * Math.min(sp, d); p.y += dy / d * Math.min(sp, d); }
}

test('chuỗi GATE v0.3a: run -> thiền -> đột phá -> thiên kiếp (né) -> mở khóa -> run mới dùng mở khóa', () => {
  const st = memoryStorage();
  let meta = defaultMeta(ctx.hubSpawn);
  meta.realmLevel = 8;                                  // Luyện Khí 9: lần đột phá kế là đại cảnh giới
  // 1. một run thắng mang linh khí về
  const r = createRun({ seed: 5, startSkill: 'sword_qi', realmLevel: meta.realmLevel });
  Object.assign(r, { time: 420, kills: 700, level: 33, eliteKills: 3 }); r.rewards = [{ kind: 'MINI', t: 250 }, { kind: 'FINAL', t: 420 }];
  endRun(r, 'WIN');
  stageReward(meta, computeRunReward(r, meta)); claimReward(meta); writeSave(st, meta);
  meta = loadSave(st, ctx).meta;
  assert.ok(meta.lingQi > 0);
  // 2. tọa thiền trong tụ linh trận tới viên mãn (thêm linh khí từ vài run nữa nếu thiếu)
  while (!canBreak(meta)) { if (meta.lingQi <= 0) meta.lingQi += 500; meditateTick(meta, 1 / 30, true); }
  assert.equal(meta.cultivationXp, need(8));
  assert.ok(isMajor(meta.realmLevel));
  // 3. thiên kiếp tương tác: người chơi né theo cảnh báo
  const trib = createTrib(12345, 640, 480), p = { x: 640, y: 492 };
  meta.tribPending = true;
  let hp = 1;
  for (let i = 0; i < 60 * 60 && !trib.done; i++) { dodge(trib, p, 1 / 60); clampToArena(trib, p); updateTrib(trib, p, 1 / 60, f => { hp -= f; if (hp <= 0) trib.done = 'LOSE'; }); }
  assert.equal(trib.done, 'WIN');
  // 4. thắng -> lên Trúc Cơ, mở khóa
  meta.tribPending = false;
  const up = levelUp(meta);
  assert.equal(meta.realmLevel, 9); assert.equal(up.granted.length, 1);
  assert.ok(meta.unlocks.skills.includes('sword_array')); assert.equal(meta.unlocks.tier, 1);
  writeSave(st, meta); meta = loadSave(st, ctx).meta;
  assert.equal(meta.realmLevel, 9); assert.ok(meta.unlocks.skills.includes('sword_array'));
  // 5. run khác dùng công pháp khởi đầu + độ khó vừa mở
  const r2 = createRun({ seed: 6, startSkill: 'sword_array', realmLevel: meta.realmLevel, difficulty: meta.unlocks.tier });
  assert.equal(r2.diff, 1); assert.deepEqual(r2.skills.map(s => s.id), ['sword_array']); assert.equal(r2.level, 1);
});

test('đứng yên khi độ kiếp thì thua: giữ cảnh giới, mất 30% tu vi', () => {
  const meta = defaultMeta(ctx.hubSpawn); meta.realmLevel = 8; meta.cultivationXp = need(8);
  const trib = createTrib(12345, 640, 480), p = { x: 640, y: 492 };
  let hp = 1;
  for (let i = 0; i < 60 * 60 && !trib.done; i++) updateTrib(trib, p, 1 / 60, f => { hp -= f; if (hp <= 0) trib.done = 'LOSE'; });
  assert.equal(trib.done, 'LOSE');
  failTribulation(meta);
  assert.equal(meta.realmLevel, 8); assert.equal(meta.cultivationXp, Math.floor(need(8) * 0.7));
});

test('tải lại giữa lúc thiền: linh khí và tu vi lưu cùng nhau, không nhân đôi', () => {
  const st = memoryStorage();
  const meta = defaultMeta(ctx.hubSpawn); meta.lingQi = 30;
  for (let i = 0; i < 20; i++) meditateTick(meta, 1 / 30, true);
  writeSave(st, meta);
  const back = loadSave(st, ctx).meta;
  // sanitize làm tròn xuống: không bao giờ nhiều hơn trước khi lưu
  assert.ok(back.lingQi <= meta.lingQi && back.cultivationXp <= meta.cultivationXp + 1e-9);
  assert.ok(back.lingQi + back.cultivationXp / 1.5 <= 30 + 1e-6);
  void sanitizeMeta;
});
