// Một lượt bí cảnh (runState). Tạo mới mỗi lượt, không bao giờ được lưu; metaState chỉ được đọc (cảnh giới -> sức mạnh).
import { RUN, PLAYER, BOSS } from '../core/config.js';
import { mulberry32 } from '../core/rng.js';
import { makeArenaMap } from '../world/map.js';
import { power, atk, maxHp } from '../progression/realm.js';
import { addRunXp } from '../progression/runxp.js';
import { updateMonsters, reapMonsters } from '../entities/monsters.js';
import { archetypeAI, updateEnemyShots } from '../entities/archetypes.js';
import { createDirector, updateDirector, summonAround } from './director.js';
import { updateHazards } from '../entities/bosses.js';
import { runStats, updateSkills, updateProjectiles, updateZones, absorbDamage } from './combat.js';

let runCounter = 0;

export function createRun({ seed, startSkill, realmLevel }) {
  const map = makeArenaMap(RUN.ARENA_W, RUN.ARENA_H, seed);
  const run = {
    id: ++runCounter, uid: `${Date.now().toString(36)}-${seed}-${runCounter}`, seed, eliteKills: 0, rng: mulberry32(seed), status: 'RUNNING', time: 0,
    level: 1, xp: 0, pendingDrafts: 0, skills: [{ id: startSkill, level: 1, evolved: null, st: {} }],
    passives: {}, evolutions: [], kills: 0, damageTaken: 0, dmgBy: {}, dir: createDirector(), outcome: null,
    rewards: [],                 // M2-02 reward hook: { kind: 'MINI' | 'FINAL', t } — M2-03 trao thưởng một lần
    realmLevel, baseMaxHp: maxHp(realmLevel), hp: 0, maxHp: 0,
  };
  run.scene = { kind: 'run', map, monsters: [], projectiles: [], zones: [], orbs: [], enemyShots: [], hazards: [] };
  refreshMaxHp(run, true);
  return run;
}

export function refreshMaxHp(run, full) {
  const old = run.maxHp;
  run.maxHp = Math.round(run.baseMaxHp * runStats(run).maxHp);
  run.hp = full ? run.maxHp : Math.min(run.maxHp, run.hp + Math.max(0, run.maxHp - old));
}

export function makeCtx(run, player, ev) {
  return {
    run, scene: run.scene, player, ev, rng: run.rng, time: run.time,
    stats: runStats(run), atk: atk(run.realmLevel), maxHp: run.maxHp, chainBudget: RUN.CHAIN_BUDGET_PER_TICK,
  };
}

// Sát thương vào người chơi trong run: qua khiên trước. Trả về sát thương thực nhận.
export function hurtRunPlayer(run, player, dmg, ev, src = 'other') {
  if (player.inv > 0 || run.status !== 'RUNNING') return 0;
  const ctx = makeCtx(run, player, ev);
  const left = absorbDamage(ctx, dmg);
  player.inv = PLAYER.INVULN;
  if (left <= 0) { ev.push({ type: 'text', x: player.x, y: player.y - 20, text: 'chặn', color: '#ffd978' }); return 0; }
  run.hp -= left; run.damageTaken += left;
  run.dmgBy[src] = (run.dmgBy[src] || 0) + left;     // thống kê nguồn sát thương (cân bằng/debug)
  ev.push({ type: 'text', x: player.x, y: player.y - 20, text: '-' + Math.round(left), color: '#ff8f8a' }, { type: 'shake', t: 0.12 });
  if (run.hp <= 0) { run.hp = 0; endRun(run, 'LOSE'); }
  return left;
}

export function endRun(run, outcome) {
  if (run.status !== 'RUNNING') return false;
  run.status = 'ENDED';
  run.outcome = outcome;
  run.scene.projectiles.length = 0;
  run.scene.enemyShots.length = 0;
  run.scene.hazards.length = 0;
  return true;
}

// Một bước thời gian của run (chỉ gọi khi đang RUN, không gọi khi chọn thẻ/tạm dừng)
export function updateRun(run, player, dt, ev, realmPowerOverride) {
  if (run.status !== 'RUNNING') return;
  run.time += dt;
  run.hp = Math.min(run.maxHp, run.hp + run.maxHp * RUN.REGEN * dt);
  const sc = run.scene;
  updateDirector(run, player, dt, ev, realmPowerOverride ?? power(run.realmLevel));
  const ctx = makeCtx(run, player, ev);
  updateSkills(ctx, dt);
  updateProjectiles(ctx, dt);
  updateZones(ctx, dt);
  const onAttack = (m, dmg) => hurtRunPlayer(run, player, dmg, ev, (m.arch || 'chaser') + (m.st === 'move' ? '' : ':' + m.st));
  const pw = realmPowerOverride ?? power(run.realmLevel);
  const io = { map: sc.map, shots: sc.enemyShots, hazards: sc.hazards, ev, onAttack, rng: run.rng,
    summon: (m, n, r) => summonAround(run, player, m.x, m.y, n, r, pw) };
  updateMonsters(sc, player, dt, ev, { safe: null, onAttack, ai: (m, pl, dx, dy, d, t) => archetypeAI(m, pl, dx, dy, d, t, io) });
  updateEnemyShots(sc, player, dt, dmg => hurtRunPlayer(run, player, dmg, ev, 'shot'));
  updateHazards(sc, player, dt, ev, dmg => hurtRunPlayer(run, player, dmg, ev, 'boss:zone'));
  if (run.status !== 'RUNNING') return;
  let finalDown = false;
  reapMonsters(sc, m => {
    run.kills++;
    if (m.elite) run.eliteKills++;
    if (m.boss) {
      const B = BOSS[m.bossKind];
      run.dir[m.bossKind === 'MINI' ? 'mini' : 'final'] = 'DEAD';
      run.rewards.push({ kind: m.bossKind, t: Math.round(run.time) });
      sc.hazards.length = 0;                               // boss chết: không còn vùng nào nổ sau đó
      for (let i = sc.enemyShots.length - 1; i >= 0; i--) if (sc.enemyShots[i].kind === 'dark') sc.enemyShots.splice(i, 1);
      ev.push({ type: 'announce', x: m.x, y: m.y, text: `Đã hạ ${B.name}!`, color: '#ffd978' }, { type: 'boom', x: m.x, y: m.y, r: 50, color: '#ffd978' }, { type: 'shake', t: 0.3 });
      if (m.bossKind === 'FINAL') finalDown = true;
    }
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
  if (finalDown) { endRun(run, 'WIN'); return; }
  if (run.time >= RUN.TIME_LIMIT) endRun(run, 'TIMEOUT');
}
