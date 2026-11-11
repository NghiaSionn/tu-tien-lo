// Đo sát thương mỗi giây của từng công pháp (một mình) lên bia đứng yên — công cụ cân bằng, không phải test.
//   node tools/dps.mjs            # cấp 1 và 5, bia đơn + cụm 8 bia; đơn vị: "lần công" mỗi giây (chia atk)
import { createRun, makeCtx } from '../src/systems/run.js';
import { updateSkills, updateProjectiles, updateZones } from '../src/systems/combat.js';
import { makeMonster, updateMonsters, reapMonsters } from '../src/entities/monsters.js';
import { SKILLS, EVOLUTIONS } from '../src/data/skills.js';

function bench(skill, layout, secs = 20) {
  const r = createRun({ seed: 5, startSkill: 'sword_qi', realmLevel: 0 });
  r.scene.map.tiles.fill(0);
  r.skills = [{ evolved: null, st: {}, ...skill }];
  const p = { x: r.scene.map.cx, y: r.scene.map.cy, fx: 1, fy: 0, inv: 9 };
  const pts = layout === 'single' ? [[60, 0]] : Array.from({ length: 8 }, (_, i) => [50 + (i % 4) * 10, (i < 4 ? -8 : 8)]);
  for (const [dx, dy] of pts) { const m = makeMonster(p.x + dx, p.y + dy, 1, { hp: 1e9 }); m.speed = 0; r.scene.monsters.push(m); }
  const dt = 1 / 60, ev = [];
  for (let t = 0; t < secs; t += dt) {
    r.time += dt; const ctx = makeCtx(r, p, ev);
    updateSkills(ctx, dt); updateProjectiles(ctx, dt); updateZones(ctx, dt);
    updateMonsters(r.scene, p, dt, ev, { safe: null, onAttack: () => {} });
    for (const m of r.scene.monsters) { m.x = p.x + pts[r.scene.monsters.indexOf(m)][0]; m.y = p.y + pts[r.scene.monsters.indexOf(m)][1]; }
    ev.length = 0;
  }
  const dealt = r.scene.monsters.reduce((a, m) => a + (1e9 - m.hp), 0);
  return dealt / secs / makeCtx(r, p, []).atk;
}

const rows = [];
for (const [id, d] of Object.entries(SKILLS)) {
  if (!d.implemented || d.kind === 'shield') continue;
  rows.push([d.name, 1, bench({ id, level: 1 }, 'single'), bench({ id, level: 1 }, 'pack'), bench({ id, level: 5 }, 'single'), bench({ id, level: 5 }, 'pack')]);
}
for (const [id, e] of Object.entries(EVOLUTIONS)) {
  rows.push([e.name + ' ★', 5, NaN, NaN, bench({ id: e.base, level: 5, evolved: id }, 'single'), bench({ id: e.base, level: 5, evolved: id }, 'pack')]);
}
console.log('công pháp                 C1 đơn  C1 cụm8   C5 đơn  C5 cụm8   (lần công / giây)');
for (const [n, , a, b, c, d] of rows) console.log(`${n.padEnd(24)} ${isNaN(a) ? '    -' : a.toFixed(2).padStart(5)}  ${isNaN(b) ? '    -' : b.toFixed(2).padStart(6)}   ${c.toFixed(2).padStart(6)}  ${d.toFixed(2).padStart(6)}`);
