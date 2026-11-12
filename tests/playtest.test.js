// M7-04: nhật ký playtest opt-in tại máy
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlaytestLog, funnel, PLAYTEST, EVENTS } from '../src/systems/playtest.js';

function mem(limit = Infinity) {
  const m = new Map();
  return {
    m,
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { if (String(v).length > limit) throw new Error('QuotaExceededError'); m.set(k, String(v)); },
    removeItem: k => m.delete(k),
  };
}
const RUN = { id: 1, seed: 42 };
let clockMs = 1_000_000;
const mk = (storage, extra = {}) => createPlaytestLog({ storage, build: 'test', platform: 'desktop', now: () => 0, clock: () => clockMs, rand: () => 0.5, ...extra });

test('mặc định tắt: không sinh sự kiện, không ghi gì', () => {
  const s = mem(); const log = mk(s);
  assert.equal(log.enabled, false);
  assert.equal(log.log('run_start', { skill: 'sword_qi' }, RUN), false);
  log.sessionStart({ realm: 1 });
  assert.equal(log.count, 0);
  assert.equal(s.m.size, 0);
});

test('bật: có session_start, chỉ giữ trường trong danh sách trắng', () => {
  const s = mem(); const log = mk(s);
  log.setEnabled(true, () => ({ realm: 3, runs: 2 }));
  log.log('run_start', { skill: 'sword_qi', difficulty: 0, realm: 3, name: 'Nghia', email: 'a@b.c' }, RUN);
  const ev = JSON.parse(log.exportJSON()).events;
  assert.deepEqual(ev.map(e => e.type), ['session_start', 'run_start']);
  assert.equal(ev[1].skill, 'sword_qi');
  assert.equal(ev[1].runId, '1-1');
  assert.equal(ev[1].name, undefined);
  assert.equal(ev[1].email, undefined);
  for (const e of ev) for (const k of Object.keys(e)) {
    assert.ok(['v', 'build', 'tid', 'session', 'day', 't', 'plat', 'type', 'runId', 'seed', ...EVENTS[e.type]].includes(k), k);
  }
});

test('run_end, first_card, miniboss_result chỉ ghi một lần mỗi run; run thứ 2 sinh second_run_start', () => {
  const log = mk(mem());
  log.setEnabled(true);
  log.log('run_start', {}, RUN);
  log.log('first_card', { card: 'a' }, RUN); log.log('first_card', { card: 'b' }, RUN);
  log.log('run_end', { outcome: 'LOSE' }, RUN); log.log('run_end', { outcome: 'LOSE' }, RUN);
  log.log('run_start', {}, { id: 2, seed: 7 });
  const types = JSON.parse(log.exportJSON()).events.map(e => e.type);
  assert.equal(types.filter(t => t === 'run_end').length, 1);
  assert.equal(types.filter(t => t === 'first_card').length, 1);
  assert.equal(types.filter(t => t === 'second_run_start').length, 1);
});

test('tải lại trang: log còn, phiên mới tăng số, đếm ngày từ lúc bật', () => {
  const s = mem();
  const a = mk(s); a.setEnabled(true); a.log('meta_action', { action: 'craft', ok: true });
  a.sessionEnd(); a.sessionEnd();
  clockMs += 86400000 * 1.5;
  const b = mk(s); b.sessionStart({ realm: 1 });
  const ev = JSON.parse(b.exportJSON()).events;
  assert.equal(b.enabled, true);
  assert.equal(ev.filter(e => e.type === 'session_end').length, 1);
  const st = ev.filter(e => e.type === 'session_start');
  assert.deepEqual(st.map(e => [e.sessionNo, e.day]), [[1, 0], [2, 1]]);
  assert.equal(ev[0].tid, b.testId);
});

test('tắt giữa chừng: dừng ghi; xóa log giữ trạng thái bật/tắt', () => {
  const s = mem(); const log = mk(s);
  log.setEnabled(true); log.log('meta_action', { action: 'gacha_pull', ok: true });
  log.setEnabled(false);
  assert.equal(log.log('meta_action', { action: 'craft' }), false);
  const n = log.count;
  assert.ok(n >= 2);
  log.clear();
  assert.equal(log.count, 0);
  assert.equal(mk(s).enabled, false);
});

test('đầy: giữ tối đa MAX_EVENTS, bộ nhớ hết thì bỏ sự kiện cũ, không ném lỗi', () => {
  const log = mk(mem()); log.setEnabled(true);
  for (let i = 0; i < PLAYTEST.MAX_EVENTS + 50; i++) log.log('meta_action', { action: 'x' + i });
  assert.equal(log.count, PLAYTEST.MAX_EVENTS);
  assert.ok(log.dropped >= 50);
  const small = mk(mem(4000)); small.setEnabled(true);
  for (let i = 0; i < 200; i++) small.log('meta_action', { action: 'y' + i });
  assert.ok(small.count > 0 && small.count < 200);
});

test('không đụng khóa save', () => {
  const s = mem(); s.setItem('tutien_save_v1', 'A'); s.setItem('tutien_save_v2', 'B');
  const log = mk(s); log.setEnabled(true); log.log('run_end', { outcome: 'WIN' }, RUN); log.clear();
  assert.equal(s.getItem('tutien_save_v1'), 'A');
  assert.equal(s.getItem('tutien_save_v2'), 'B');
  assert.deepEqual([...s.m.keys()].sort(), [PLAYTEST.KEY, 'tutien_save_v1', 'tutien_save_v2'].sort());
});

test('CSV có header cố định và funnel đếm đúng', () => {
  const log = mk(mem()); log.setEnabled(true);
  log.log('run_start', { skill: 's' }, RUN);
  log.log('first_card', { card: 'c, "x"' }, RUN);
  log.log('miniboss_result', { result: 'killed' }, RUN);
  log.log('run_end', { outcome: 'LOSE', cause: 'boss:slam', evolutions: ['a', 'b'] }, RUN);
  log.log('run_start', {}, { id: 2, seed: 3 });
  const csv = log.exportCSV().split('\n');
  assert.ok(csv[0].startsWith('v,build,tid,session,day,t,plat,type,runId,seed'));
  assert.ok(csv.some(l => l.includes('"c, ""x"""')));
  assert.ok(csv.some(l => l.includes('a|b')));
  const f = funnel(JSON.parse(log.exportJSON()).events);
  assert.equal(f.testers, 1); assert.equal(f.sessions, 1); assert.equal(f.runs, 2);
  assert.equal(f.firstCard, 1); assert.equal(f.miniKilled, 1); assert.equal(f.secondRun, 1);
  assert.deepEqual(f.causes, { 'boss:slam': 1 });
});
