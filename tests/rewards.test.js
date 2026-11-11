// M2-03: phần thưởng run — tính theo tiến độ, nhận đúng một lần, an toàn khi tải lại
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRunReward, stageReward, claimReward } from '../src/progression/rewards.js';
import { createRun, endRun } from '../src/systems/run.js';
import { defaultMeta, sanitizeMeta, loadSave, writeSave, memoryStorage, KEYS } from '../src/persistence/save.js';
import { REWARD } from '../src/core/config.js';

const ctx = { canStand: () => true, hubSpawn: { x: 100, y: 100 } };
const freshMeta = () => defaultMeta(ctx.hubSpawn);
let n = 0;
function fakeRun(o = {}) {
  const r = createRun({ seed: 7 + n++, startSkill: 'sword_qi', realmLevel: 0 });
  Object.assign(r, { time: 300, kills: 400, level: 20, eliteKills: 2 }, o);
  endRun(r, o.outcome || 'LOSE');
  return r;
}

test('thua vẫn có thưởng theo tiến độ; tiến độ cao hơn thưởng nhiều hơn', () => {
  const m = freshMeta();
  const early = computeRunReward(fakeRun({ time: 30, kills: 20, level: 3, eliteKills: 0 }), m);
  const late = computeRunReward(fakeRun(), m);
  assert.ok(early.linhThach > 0 && early.lingQi > 0);
  assert.ok(late.linhThach > early.linhThach && late.lingQi > early.lingQi && late.craftMats > early.craftMats);
  assert.equal(late.tickets, 0, 'thua không có vé');
});

test('thắng có thưởng rõ hơn thua cùng tiến độ; boss cộng thêm; lần đầu thắng có vé thêm', () => {
  const m = freshMeta();
  const lose = computeRunReward(fakeRun(), m);
  const winRun = fakeRun({ outcome: 'WIN' });
  winRun.rewards = [{ kind: 'MINI', t: 250 }, { kind: 'FINAL', t: 480 }];
  const win = computeRunReward(winRun, m);
  assert.ok(win.linhThach > lose.linhThach * REWARD.WIN_MULT);
  assert.equal(win.tickets, REWARD.BOSS.FINAL.tickets + REWARD.FIRST_CLEAR_TICKETS);
  assert.equal(win.firstClear, true);
  assert.deepEqual(win.bosses, ['MINI', 'FINAL']);
  stageReward(m, win); claimReward(m);
  const again = fakeRun({ outcome: 'WIN' }); again.rewards = [{ kind: 'FINAL', t: 480 }];
  assert.equal(computeRunReward(again, m).tickets, REWARD.BOSS.FINAL.tickets, 'vé lần đầu chỉ một lần');
});

test('cảnh giới cao nhận nhiều linh thạch hơn', () => {
  const r = fakeRun(), lo = freshMeta(), hi = freshMeta(); hi.realmLevel = 9;
  assert.ok(computeRunReward(r, hi).linhThach > computeRunReward(r, lo).linhThach);
});

test('nhận nhiều lần chỉ cộng một lần; stage lại run đã nhận bị từ chối', () => {
  const m = freshMeta(), rw = computeRunReward(fakeRun(), m);
  assert.equal(stageReward(m, rw), true);
  assert.equal(stageReward(m, rw), true, 'stage lại cùng run khi chưa nhận: vẫn một phần');
  const before = m.linhThach;
  assert.ok(claimReward(m));
  assert.equal(claimReward(m), null);
  assert.equal(claimReward(m), null);
  assert.equal(m.linhThach, before + rw.linhThach);
  assert.equal(stageReward(m, rw), false);
  assert.equal(claimReward(m), null);
  assert.equal(m.linhThach, before + rw.linhThach);
});

test('thưởng không đụng cảnh giới, tu vi, đan, công pháp đã mở', () => {
  const m = freshMeta(); m.realmLevel = 3; m.cultivationXp = 50; m.pills = 4; m.unlocks.skills = ['wind_blade'];
  const snap = JSON.stringify([m.realmLevel, m.cultivationXp, m.pills, m.unlocks]);
  stageReward(m, computeRunReward(fakeRun(), m)); claimReward(m);
  assert.equal(JSON.stringify([m.realmLevel, m.cultivationXp, m.pills, m.unlocks]), snap);
});

test('tải lại giữa trao thưởng: pending còn trong save, nhận một lần, tải lại tiếp không nhân đôi', () => {
  const st = memoryStorage();
  let m = freshMeta(); m.linhThach = 10;
  const rw = computeRunReward(fakeRun({ outcome: 'WIN' }), m);
  stageReward(m, rw); writeSave(st, m);                       // REWARD_PENDING đã lưu, rồi "đóng trang"
  m = loadSave(st, ctx).meta;
  assert.equal(m.pendingReward.id, rw.id); assert.equal(m.linhThach, 10);
  claimReward(m); writeSave(st, m);                            // lần mở trang này nhận
  for (let i = 0; i < 3; i++) {                                // tải lại nhiều lần
    m = loadSave(st, ctx).meta;
    assert.equal(m.pendingReward, null);
    assert.equal(claimReward(m), null);
    writeSave(st, m);
  }
  assert.equal(m.linhThach, 10 + rw.linhThach);
  assert.equal(m.coDuyenTicket, rw.tickets);
  assert.ok(st.getItem(KEYS.V2_BAK), 'vẫn xoay vòng bản dự phòng');
});

test('bản dự phòng cũ còn pending nhưng id đã nhận -> không nhận lại', () => {
  const m = freshMeta(), rw = computeRunReward(fakeRun(), m);
  stageReward(m, rw);
  const stale = JSON.parse(JSON.stringify(m));                  // giống bản v2_bak trước khi nhận
  claimReward(m);
  stale.rewardLog = [...m.rewardLog];                           // log đi cùng meta hiện hành
  assert.equal(claimReward(stale), null);
});

test('save bị sửa bậy: phần thưởng chờ nhận bị kẹp/loại', () => {
  const w = [];
  const bad = sanitizeMeta({ realmLevel: 1, pendingReward: { id: 'x', outcome: 'WIN', linhThach: -50, lingQi: 1e12, craftMats: 'a', tickets: 3, bosses: ['FINAL', 'HACK'] },
    lingQi: -3, coDuyenTicket: 1e15, rewardLog: ['a', 5, 'b'.repeat(100)] }, ctx, w);
  assert.equal(bad.pendingReward.linhThach, 0); assert.equal(bad.pendingReward.lingQi, 1e6); assert.equal(bad.pendingReward.craftMats, 0);
  assert.deepEqual(bad.pendingReward.bosses, ['FINAL']);
  assert.equal(bad.lingQi, 0); assert.ok(bad.coDuyenTicket <= 1e6);
  assert.deepEqual(bad.rewardLog, ['a']);
  assert.equal(sanitizeMeta({ pendingReward: { id: 'y', outcome: 'CHEAT' } }, ctx, w).pendingReward, null);
  assert.equal(sanitizeMeta({ pendingReward: 'abc' }, ctx, w).pendingReward, null);
});

test('save cũ (trước M2-03) đọc được, các trường mới về mặc định', () => {
  const m = sanitizeMeta({ realmLevel: 2, linhThach: 77, pills: 3 }, ctx);
  assert.equal(m.linhThach, 77);
  assert.equal(m.lingQi, 0); assert.equal(m.craftMats, 0); assert.equal(m.coDuyenTicket, 0);
  assert.equal(m.pendingReward, null); assert.deepEqual(m.rewardLog, []); assert.equal(m.firstClear, false);
});

test('run thứ hai bắt đầu sạch (không mang công pháp/cấp/thưởng tạm) nhưng meta giữ phần đã nhận', () => {
  const m = freshMeta();
  const r1 = fakeRun({ outcome: 'WIN' });
  r1.skills.push({ id: 'fire_orb', level: 3, evolved: null, st: {} }); r1.passives.linh_luc = 2;
  stageReward(m, computeRunReward(r1, m)); claimReward(m);
  const got = m.linhThach;
  const r2 = createRun({ seed: 99, startSkill: 'sword_qi', realmLevel: m.realmLevel });
  assert.equal(r2.level, 1); assert.equal(r2.kills, 0); assert.deepEqual(r2.passives, {});
  assert.deepEqual(r2.skills.map(s => s.id), ['sword_qi']); assert.deepEqual(r2.rewards, []);
  assert.notEqual(r2.uid, r1.uid);
  assert.equal(m.linhThach, got);
});
