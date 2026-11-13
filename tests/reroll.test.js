// M7-09: đổi bảng thẻ 1 lần/run + ưu tiên nhẹ thẻ ghép tiến hóa (cờ)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun } from '../src/systems/run.js';
import { drawCards, rerollDraft, applyCard, candidates, pairsWithOwned } from '../src/progression/draft.js';
import { SKILLS, PASSIVES } from '../src/data/skills.js';
import { RUN } from '../src/core/config.js';
import { mulberry32 } from '../src/core/rng.js';

const mk = (seed, extra = {}) => createRun({ seed, startSkill: 'sword_qi', realmLevel: 0, ...extra });
const keys = cards => cards.map(c => c.key).join(',');

test('mỗi run có đúng RUN.REROLLS lượt; hết lượt trả null, không đổi gì', () => {
  const run = mk(7);
  assert.equal(run.rerolls, RUN.REROLLS);
  const first = drawCards(run, run.rng);
  const a = rerollDraft(run, run.rng, first);
  assert.ok(a && a.length);
  assert.equal(run.rerolls, 0); assert.equal(run.rerollsUsed, 1);
  assert.equal(rerollDraft(run, run.rng, a), null);
  assert.equal(run.rerolls, 0); assert.equal(run.rerollsUsed, 1);
});

test('đổi bảng tránh thẻ vừa thấy nếu pool còn thẻ khác', () => {
  const run = mk(11);
  const first = drawCards(run, run.rng);
  const next = rerollDraft(run, run.rng, first);
  for (const c of next) assert.ok(!first.some(f => f.key === c.key), c.key);
});

test('cùng seed + cùng thao tác (kể cả đổi bảng) => cùng thẻ', () => {
  const play = () => { const r = mk(99); const a = drawCards(r, r.rng); const b = rerollDraft(r, r.rng, a); return keys(a) + '|' + keys(b) + '|' + keys(drawCards(r, r.rng)); };
  assert.equal(play(), play());
});

test('pool cạn: vẫn ra thẻ dự phòng, đổi bảng không lỗi', () => {
  const run = mk(3);
  run.skills = Object.keys(SKILLS).filter(id => !SKILLS[id].locked).slice(0, RUN.MAX_ACTIVE).map(id => ({ id, level: SKILLS[id].maxLevel, evolved: null, st: {} }));
  for (const [id, d] of Object.entries(PASSIVES).slice(0, RUN.MAX_PASSIVE)) run.passives[id] = d.maxLevel;
  const c = drawCards(run, run.rng);
  assert.equal(c.length, 1); assert.equal(c[0].type, 'FALLBACK');
  const r = rerollDraft(run, run.rng, c);
  assert.equal(r[0].type, 'FALLBACK');
});

test('ưu tiên ghép tiến hóa chỉ nhân trọng số thẻ công pháp mới ghép được, khi cờ bật', () => {
  const run = mk(5);                           // có Kiếm Khí -> Lôi Kích/Lôi Vực ghép được Lôi Đình Vạn Kiếm
  assert.ok(pairsWithOwned(run, 'thunder_strike')); assert.ok(!pairsWithOwned(run, 'fire_orb'));
  const off = Object.fromEntries(candidates(run, false).map(c => [c.key, c.w]));
  const on = Object.fromEntries(candidates(run, true).map(c => [c.key, c.w]));
  assert.equal(on['new:thunder_strike'], off['new:thunder_strike'] * RUN.SYNERGY_MULT);
  assert.equal(on['new:fire_orb'], off['new:fire_orb']);
  assert.equal(on['pas:linh_luc'], off['pas:linh_luc']);
});

test('1000 run ngẫu nhiên × 30 lần chọn (có đổi bảng): không thẻ khóa/đã max/trùng, thẻ chọn luôn áp dụng được', () => {
  for (let seed = 1; seed <= 1000; seed++) {
    const pick = mulberry32(seed * 7 + 1);
    const run = mk(seed, { unlocked: seed % 2 ? ['wind_step'] : [] });
    run.time = 200;                              // đủ lâu để tiến hóa xuất hiện
    for (let n = 0; n < 30; n++) {
      let cards = drawCards(run, run.rng);
      if (pick() < 0.2) cards = rerollDraft(run, run.rng, cards) || cards;
      assert.equal(new Set(cards.map(c => c.key)).size, cards.length, `trùng thẻ seed ${seed}`);
      for (const c of cards) {
        if (c.type === 'NEW_SKILL' || c.type === 'UPGRADE_SKILL') {
          const d = SKILLS[c.id];
          assert.ok(!d.locked || run.unlocked.includes(c.id), `thẻ khóa ${c.id} seed ${seed}`);
          const s = run.skills.find(k => k.id === c.id);
          assert.ok(!s || (!s.evolved && s.level < d.maxLevel), `thẻ đã max ${c.id} seed ${seed}`);
        }
        if (c.type === 'PASSIVE') assert.ok((run.passives[c.id] || 0) < PASSIVES[c.id].maxLevel, `bị động max ${c.id}`);
      }
      const c = cards[Math.floor(pick() * cards.length)];
      assert.ok(applyCard(run, c, { heal: () => {}, onMaxHpChange: () => {} }), `không áp dụng được ${c.key} seed ${seed}`);
    }
    assert.ok(run.rerollsUsed <= RUN.REROLLS);
  }
});
