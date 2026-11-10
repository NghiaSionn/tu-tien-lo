// Một lượt bí cảnh (runState). Tạo mới mỗi lượt, không bao giờ được lưu; metaState chỉ được đọc (cảnh giới -> sức mạnh).
import { RUN, PLAYER } from '../core/config.js';
import { mulberry32 } from '../core/rng.js';
import { makeArenaMap } from '../world/map.js';
import { power, atk, maxHp } from '../progression/realm.js';
import { addRunXp } from '../progression/runxp.js';
import { spawnRunMonster, updateMonsters, reapMonsters } from '../entities/monsters.js';
import { runStats, updateSkills, updateProjectiles, updateZones, absorbDamage } from './combat.js';

let runCounter = 0;

export function createRun({ seed, startSkill, realmLevel }) {
  const map = makeArenaMap(RUN.ARENA_W, RUN.ARENA_H, seed);
  const run = {
    id: ++runCounter, seed, rng: mulberry32(seed), status: 'RUNNING', time: 0,
    level: 1, xp: 0, pendingDrafts: 0, skills: [{ id: startSkill, level: 1, evolved: null, st: {} }],
    passives: {}, evolutions: [], kills: 0, damageTaken: 0, spawnT: 0, outcome: null,
    realmLevel, baseMaxHp: maxHp(realmLevel), hp: 0, maxHp: 0,
  };
  run.scene = { kind: 'run', map, monsters: [], projectiles: [], zones: [], orbs: [] };
  refreshMaxHp(run, true);
  return run;
}

export function refreshMaxHp(run, full) {
  const old = run.maxHp;
  run.maxHp = Math.round(run.baseMaxHp * runStats(run).maxHp);
  run.hp = full ? run.maxHp : Math.min(run.maxHp, run.hp + Math.max(0, run.maxHp - old));
}

export const spawnInterval = t => Math.max(RUN.SPAWN.MIN_EVERY, RUN.SPAWN.START_EVERY - (RUN.SPAWN.START_EVERY - RUN.SPAWN.MIN_EVERY) * Math.min(1, t / RUN.SPAWN.RAMP));

export function makeCtx(run, player, ev) {
  return {
    run, scene: run.scene, player, ev, rng: run.rng, time: run.time,
    stats: runStats(run), atk: atk(run.realmLevel), maxHp: run.maxHp, chainBudget: RUN.CHAIN_BUDGET_PER_TICK,
  };
}

// Sát thương vào người chơi trong run: qua khiên trước. Trả về sát thương thực nhận.
export function hurtRunPlayer(run, player, dmg, ev) {
  if (player.inv > 0 || run.status !== 'RUNNING') return 0;
  const ctx = makeCtx(run, player, ev);
  const left = absorbDamage(ctx, dmg);
  player.inv = PLAYER.INVULN;
  if (left <= 0) { ev.push({ type: 'text', x: player.x, y: player.y - 20, text: 'chặn', color: '#ffd978' }); return 0; }
  run.hp -= left; run.damageTaken += left;
  ev.push({ type: 'text', x: player.x, y: player.y - 20, text: '-' + Math.round(left), color: '#ff8f8a' }, { type: 'shake', t: 0.12 });
  if (run.hp <= 0) { run.hp = 0; endRun(run, 'LOSE'); }
  return left;
}

export function endRun(run, outcome) {
  if (run.status !== 'RUNNING') return false;
  run.status = 'ENDED';
  run.outcome = outcome;
  run.scene.projectiles.length = 0;
  return true;
}

// Một bước thời gian của run (chỉ gọi khi đang RUN, không gọi khi chọn thẻ/tạm dừng)
export function updateRun(run, player, dt, ev, realmPowerOverride) {
  if (run.status !== 'RUNNING') return;
  run.time += dt;
  run.hp = Math.min(run.maxHp, run.hp + run.maxHp * RUN.REGEN * dt);
  const sc = run.scene;
  run.spawnT -= dt;
  while (run.spawnT <= 0) {
    run.spawnT += spawnInterval(run.time);
    if (sc.monsters.length < RUN.SPAWN.MAX_ALIVE) spawnRunMonster(sc, player, run, run.rng, realmPowerOverride ?? power(run.realmLevel));
  }
  const ctx = makeCtx(run, player, ev);
  updateSkills(ctx, dt);
  updateProjectiles(ctx, dt);
  updateZones(ctx, dt);
  updateMonsters(sc, player, dt, ev, { safe: null, onAttack: m => hurtRunPlayer(run, player, m.dmg, ev) });
  reapMonsters(sc, m => {
    run.kills++;
    ev.push({ type: 'death', x: m.x, y: m.y, tier: m.tier });
    if (sc.orbs.length < RUN.MAX_ORBS) sc.orbs.push({ x: m.x, y: m.y - 2, v: m.xp });
    else sc.orbs[run.kills % sc.orbs.length].v += m.xp;      // quá nhiều: gộp vào viên có sẵn
  });
  // chiến ý: hút về người chơi rồi nhặt
  const mag = RUN.MAGNET * ctx.stats.magnet;
  for (let i = sc.orbs.length - 1; i >= 0; i--) {
    const o = sc.orbs[i], dx = player.x - o.x, dy = (player.y - 6) - o.y, d = Math.hypot(dx, dy);
    if (d < RUN.PICKUP) { addRunXp(run, o.v); sc.orbs.splice(i, 1); continue; }
    if (d < mag) { const sp = RUN.ORB_SPEED * dt * (1.5 - d / mag); o.x += dx / d * sp; o.y += dy / d * sp; }
  }
  if (run.time >= RUN.DURATION) endRun(run, 'WIN');
}
