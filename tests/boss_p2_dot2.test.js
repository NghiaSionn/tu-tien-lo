// (24/11) Đợt 2: chiêu pha 2 mới (docs/design/BOSS_TUYET_KY_DE_XUAT.md). Ép từng chiêu ra riêng ở pha 2:
// có cảnh báo; ở MỖI lần boss bắt đầu gồng (kể cả từng nhịp của chiêu liên hoàn) luôn còn chỗ an toàn chạy tới kịp
// trước vùng nổ sớm nhất (xét mọi vùng cùng lúc — chặt hơn thực tế vì vùng nổ lệch giờ); chiêu chạy hết không lỗi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, updateRun } from '../src/systems/run.js';
import { makeBoss } from '../src/systems/director.js';
import { BOSS_SKILLS, dangerShapes, hits } from '../src/systems/tactics.js';
import { BOSS, PLAYER, BOSS_SKILL_LABELS, SKILL_NAMES } from '../src/core/config.js';

const DT = 1 / 30;
const MINI_P2 = ['bloodDash', 'comboClaw', 'quake', 'hunt', 'cracks', 'rageHowl'];
const FINAL_P2 = ['thunder', 'eight', 'runes', 'chainBolt', 'clones', 'doubleSweep', 'net'];

function spotOK(map, x, y) {
  for (let a = 0; a < 16; a++) for (const r of [0, 60, 120, 180]) {
    const px = x + Math.cos(a * 0.3927) * r, py = y + Math.sin(a * 0.3927) * r;
    if (!map.monStand(px, py) || !map.canStand(px, py)) return false;
  }
  return true;
}
function arena(kind, seed) {
  for (let k = 0; k < 60; k++) {
    const r = createRun({ seed: seed * 100 + k, startSkill: 'sword_qi', realmLevel: 0 }), map = r.scene.map;
    for (let j = 0; j < 600; j++) {
      const x = map.cx + ((j * 37) % 500) - 250, y = map.cy + ((j * 53) % 400) - 200;
      if (spotOK(map, x, y)) return { r, s: { x, y } };
    }
  }
  throw new Error('không có chỗ trống');
}
// ép boss chỉ dùng chiêu `id` ở pha 2; trả về danh sách lần gồng + vùng/đạn đã tạo
function force(kind, id, seed, dist = 90) {
  const key = kind + '_V2', saved = BOSS_SKILLS[key];
  BOSS_SKILLS[key] = [{ id, p2: true, valid: () => true, w: () => 1 }];
  try {
    const { r, s } = arena(kind, seed);
    r.bossV2 = true; r.scene.monsters.length = 0; r.time = BOSS[kind].AT + 1;
    if (kind === 'FINAL') { r.dir.mini = 'DEAD'; r.dir.final = 'ALIVE'; } else r.dir.mini = 'ALIVE';
    const p = { x: s.x, y: s.y, inv: 1, dead: false, fx: 1, fy: 0 };
    const b = makeBoss(r, kind, p.x + dist, p.y, 1);
    b.hp = Math.round(b.max * 0.4); b.p2 = true; b.tkDone = { 0.7: true }; b.gapT = 0;
    const checks = [], srcs = new Set();
    let prev = '', maxHz = 0, shots = 0;
    for (let i = 0; i < 30 * 7 && r.status === 'RUNNING'; i++) {
      for (const m of r.scene.monsters) if (!m.boss) m.dead = true;
      p.inv = 1; updateRun(r, p, DT, []); r.hp = r.maxHp; r.pendingDrafts = 0;
      for (const h of r.scene.hazards) srcs.add(h.src);
      maxHz = Math.max(maxHz, r.scene.hazards.length); shots = Math.max(shots, r.scene.enemyShots.length);
      const k = b.st + ':' + b.pat + ':' + (b.tk ? b.tk.i : '');
      if ((b.st === 'windup' || b.st === 'blink') && k !== prev) {
        const ds = dangerShapes(r.scene, p);
        const tMin = Math.min(b.stT, ...r.scene.hazards.map(h => h.t));
        const reach = PLAYER.SPEED * tMin * 0.8;
        let ok = !ds.some(sh => hits(sh, p.x, p.y));
        for (let j = 0; j < 32 && !ok; j++) for (const fr of [0.25, 0.5, 0.75, 1]) {
          const a = j / 32 * Math.PI * 2, x = p.x + Math.cos(a) * reach * fr, y = p.y + Math.sin(a) * reach * fr;
          if (r.scene.map.canStand(x, y) && !ds.some(sh => hits(sh, x, y))) { ok = true; break; }
        }
        checks.push({ pat: b.pat, label: b.patLabel, ok, reach: Math.round(reach), shapes: ds.length });
      }
      prev = k;
    }
    return { checks, srcs, maxHz, shots, b };
  } finally { BOSS_SKILLS[key] = saved; }
}

test('đợt 2: 13 chiêu pha 2 có trong bộ chọn, chỉ ở pha 2, có tên + màu', () => {
  for (const [key, ids] of [['MINI_V2', MINI_P2], ['FINAL_V2', FINAL_P2]]) for (const id of ids) {
    const s = BOSS_SKILLS[key].find(o => o.id === id);
    assert.ok(s && s.p2, key + ' thiếu ' + id);
    assert.equal(s.valid({ m: {}, d: 80, phase2: false, io: { hazards: [], map: null }, player: null }), false, id + ' không được dùng ở pha 1');
    assert.ok(BOSS_SKILL_LABELS[id] && /^#[0-9a-f]{6}$/i.test(BOSS_SKILL_LABELS[id][1]), 'tên/màu ' + id);
  }
});

for (const [kind, ids] of [['MINI', MINI_P2], ['FINAL', FINAL_P2]]) for (const id of ids) {
  test(`đợt 2 ${kind} ${id}: có cảnh báo, mỗi nhịp gồng còn chỗ an toàn chạy tới kịp`, () => {
    for (const seed of [1, 2]) {
      const f = force(kind, id, seed, id === 'hunt' ? 140 : 90);
      assert.ok(f.checks.length >= 1, `${id} seed ${seed}: chưa ra chiêu`);
      for (const c of f.checks) assert.ok(c.ok, `${id} seed ${seed}: nhịp ${c.pat} không còn chỗ an toàn trong ${c.reach} px (${c.shapes} hình)`);
      for (const s of f.srcs) if (s) assert.ok(SKILL_NAMES[s], 'thiếu tên nguồn sát thương ' + s);
      if (['quake', 'cracks', 'rageHowl', 'thunder', 'eight', 'runes', 'chainBolt', 'net'].includes(id)) assert.ok(f.maxHz > 0, id + ' tạo vùng cảnh báo');
      if (id === 'clones') assert.ok(f.shots > 0, 'bóng bắn đạn');
    }
  });
}

test('đợt 2: chiêu liên hoàn chạy đủ nhịp rồi sơ hở (Cuồng Nha 3 nhịp, Truy Mệnh 2 Vồ, Diệt Thế 2 nhịp quét)', () => {
  const pats = (f) => f.checks.map(c => c.pat).join(',');
  const a = force('MINI', 'comboClaw', 3);
  assert.ok(/claw,claw,bite/.test(pats(a)), pats(a));
  const b = force('FINAL', 'doubleSweep', 3);
  assert.ok(/sweep,sweep/.test(pats(b)), pats(b));
  const c = force('MINI', 'hunt', 3, 140);
  assert.ok(/leap,(leap|dash)/.test(pats(c)), pats(c));
});
