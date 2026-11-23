// M10-12: số liệu chiến đấu — đúng, tất định, chỉ ghi khi người chơi bật, không định danh, không đụng save
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, updateRun, hurtRunPlayer } from '../src/systems/run.js';
import { makeBoss } from '../src/systems/director.js';
import { teleSummary, teleFrame, TELE } from '../src/systems/telemetry.js';
import { createPlaytestLog, PLAYTEST, EVENTS } from '../src/systems/playtest.js';
import { BOSS } from '../src/core/config.js';

const DT = 1 / 30;
const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), keys: () => [...m.keys()] }; };

function play(seed, on, sec, inv = true) {
  const r = createRun({ seed, startSkill: 'sword_qi', realmLevel: 0 }); r.tactics = on; r.skillsV2 = on; r.bossV2 = on;
  const p = { x: r.scene.map.cx, y: r.scene.map.cy, inv: 0, dead: false };
  for (let i = 0; i < sec / DT && r.status === 'RUNNING'; i++) {
    const a = i / 90; p.x = r.scene.map.cx + Math.cos(a) * 60; p.y = r.scene.map.cy + Math.sin(a) * 40;
    p.inv = inv ? 1 : Math.max(0, p.inv - DT);
    updateRun(r, p, DT, []); if (inv) r.hp = r.maxHp; r.pendingDrafts = 0;
  }
  return r;
}

test('đếm trúng đòn theo nguồn khớp với sát thương; nguyên nhân chết = đòn kết liễu', () => {
  const r = createRun({ seed: 1, startSkill: 'sword_qi', realmLevel: 0 }), p = { x: 0, y: 0, inv: 0, dead: false };
  hurtRunPlayer(r, p, 5, [], 'chaser'); p.inv = 0;
  hurtRunPlayer(r, p, 5, [], 'ranged:shot'); p.inv = 0;
  hurtRunPlayer(r, p, 1e6, [], 'boss:sweep');
  const s = teleSummary(r);
  assert.deepEqual(s.hitsBy, { chaser: 1, 'ranged:shot': 1, 'boss:sweep': 1 });
  assert.equal(s.outcome, 'LOSE'); assert.equal(s.deathCause, 'boss:sweep');
  for (const k of Object.keys(s.hitsBy)) assert.ok(s.dmgBy[k] > 0);
});

test('tất định: cùng seed -> cùng tóm tắt (cả AI cũ và mới)', () => {
  for (const on of [false, true]) assert.deepEqual(teleSummary(play(7, on, 120, false)), teleSummary(play(7, on, 120, false)));
});

test('mốc boss: thời điểm xuất hiện, vào P2 (bộ chiêu mới), bị hạ và thời gian trận', () => {
  const r = createRun({ seed: 3, startSkill: 'sword_qi', realmLevel: 0 }); r.bossV2 = true; r.tactics = true;
  r.scene.monsters.length = 0; r.time = BOSS.MINI.AT; r.dir.mini = 'ALIVE';
  const p = { x: r.scene.map.cx, y: r.scene.map.cy, inv: 1, dead: false };
  const b = makeBoss(r, 'MINI', p.x + 100, p.y, 1);
  for (let i = 0; i < 30 * 40 && !b.dead; i++) {
    b.hp = Math.max(1, Math.round(b.max * (1 - i / (30 * 30))));
    if (i === 30 * 30) { b.hp = 0; b.dead = true; }
    p.inv = 1; updateRun(r, p, DT, []); r.hp = r.maxHp; r.pendingDrafts = 0;
  }
  updateRun(r, p, DT, []);
  const s = teleSummary(r).boss.MINI;
  assert.ok(s && s.start !== undefined && s.p2 > s.start && s.end >= s.p2, JSON.stringify(s));
  assert.ok(Math.abs(s.dur - (s.end - s.start)) < 0.11);
});

test('AI mới giữ đỉnh đe dọa trong khung nhìn thấp hơn AI cũ (cùng seed, người chơi bất tử)', () => {
  let cu = 0, moi = 0;
  for (const seed of [11, 12]) { cu += teleSummary(play(seed, false, 300)).threatPeak; moi += teleSummary(play(seed, true, 300)).threatPeak; }
  assert.ok(moi < cu, `mới ${moi} / cũ ${cu}`);
});

test('nhật ký: combat_run chỉ ghi khi người chơi bật; danh sách trắng; không định danh; khóa riêng, không đụng save', () => {
  const st = mem(), log = createPlaytestLog({ storage: st, now: () => 0, clock: () => 0, rand: () => 0.5 });
  const r = play(5, true, 30, false);
  const sum = { ...teleSummary(r, { tactics: true, skillsV2: true, bossV2: true }), name: 'Nguyễn A', email: 'x@y.z', uid: 'abc' };
  assert.equal(log.log('combat_run', sum, r), false, 'chưa bật thì không ghi');
  assert.equal(st.getItem(PLAYTEST.KEY), null);
  log.setEnabled(true);
  assert.equal(log.log('combat_run', sum, r), true);
  assert.equal(log.log('combat_run', sum, r), false, 'mỗi lượt một lần');
  const ev = JSON.parse(log.exportJSON()).events.find(e => e.type === 'combat_run');
  for (const k of ['name', 'email', 'uid']) assert.equal(ev[k], undefined, 'lọt trường ' + k);
  for (const k of Object.keys(ev)) assert.ok(EVENTS.combat_run.includes(k) || ['v', 'build', 'tid', 'session', 'day', 't', 'plat', 'type', 'runId', 'seed'].includes(k), 'trường lạ ' + k);
  assert.ok(ev.hitsBy && ev.flags && ev.flags.bossV2 === true);
  assert.deepEqual(st.keys(), [PLAYTEST.KEY], 'chỉ ghi khóa nhật ký riêng');
  assert.ok(!st.keys().some(k => k.startsWith('tutien_save')));
  // CSV: trường object thành JSON (không thành [object Object])
  const csv = log.exportCSV();
  assert.ok(!csv.includes('[object Object]')); assert.ok(csv.includes('hitsBy'));
});

test('thời gian khung trình duyệt có trần (không phình bộ nhớ) và tính p50/p95', () => {
  const r = createRun({ seed: 1, startSkill: 'sword_qi', realmLevel: 0 });
  for (let i = 0; i < TELE.MAX_FRAMES + 500; i++) teleFrame(r.tele, i % 10, 16 + (i % 3));
  assert.equal(r.tele.work.length, TELE.MAX_FRAMES);
  const s = teleSummary(r);
  assert.ok(s.workP50 >= 4 && s.workP50 <= 5 && s.workP95 === 9, JSON.stringify([s.workP50, s.workP95]));
  assert.ok(s.frameP95 === 18);
});
