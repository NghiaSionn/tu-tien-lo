// Công pháp trong run: hồi chiêu, chọn mục tiêu, đạn, vùng, khiên, tiến hóa. Thuần logic; hình ảnh đi qua danh sách sự kiện `ev`.
import { RUN } from '../core/config.js';
import { SKILLS, EVOLUTIONS, PASSIVES } from '../data/skills.js';
import { damageMonster, applyBurn, applySlow, moveEntity } from '../entities/monsters.js';

const TAU = Math.PI * 2;

// Chỉ số từ thẻ bị động
export function runStats(run) {
  const st = { damage: 1, cooldown: 1, area: 1, moveSpeed: 1, magnet: 1, maxHp: 1 };
  for (const [id, lv] of Object.entries(run.passives)) {
    const p = PASSIVES[id];
    if (p.stat === 'cooldown') st.cooldown *= Math.max(0.4, 1 - p.per * lv);
    else st[p.stat] += p.per * lv;
  }
  st.damage += run.shrineDmg || 0;            // M3-04: Linh Mạch
  const g = run.gear;                          // M4-01: trang bị (đã cộng sẵn ở gearMods)
  st.extraProj = 0; st.xp = 1; st.regen = 1; st.dmgTaken = 1;
  if (g) {
    st.damage = Math.max(0.2, st.damage + g.damage); st.moveSpeed = Math.max(0.4, st.moveSpeed + g.moveSpeed);
    st.maxHp = Math.max(0.3, st.maxHp + g.maxHp); st.area += g.area; st.magnet += g.magnet;
    st.cooldown *= g.cooldownMul; st.extraProj = g.extraProj; st.xp += g.xp; st.regen = g.regenMul; st.dmgTaken += g.dmgTaken;
  }
  return st;
}

export function skillParams(s) {
  return s.evolved ? EVOLUTIONS[s.evolved].params : SKILLS[s.id].levels[s.level - 1];
}
export const skillKind = s => s.evolved ? EVOLUTIONS[s.evolved].kind : SKILLS[s.id].kind;
export const skillName = s => s.evolved ? EVOLUTIONS[s.evolved].name : SKILLS[s.id].name;
export const skillElement = s => s.evolved ? EVOLUTIONS[s.evolved].element : SKILLS[s.id].element;

// Mục tiêu hợp lệ gần nhất trong tầm (và trong tầm nhìn nếu los)
// Ít mục tiêu hơn số đạn: tỏa quạt nhưng thu hẹp theo khoảng cách để mọi viên vẫn trúng (lệch ngang tối đa ~5 px tại mục tiêu).
// Trước đây góc tỏa cố định làm 2/3 lưỡi Kiếm Khí và cả 2 Hỏa Cầu trượt khi chỉ có 1 mục tiêu (boss).
export const fanStep = (dist, maxStep) => Math.min(maxStep, 5 / Math.max(dist, 1));

export function nearestTargets(ctx, x, y, range, n, los = true, exclude = null) {
  const list = [];
  for (const m of ctx.scene.monsters) {
    if (m.dead || (exclude && exclude.has(m))) continue;
    const d = Math.hypot(m.x - x, m.y - y);
    if (d > range) continue;
    if (los && !ctx.scene.map.lineOfSight(x, y - 8, m.x, m.y - 4)) continue;
    list.push([d, m]);
  }
  list.sort((a, b) => a[0] - b[0]);
  return list.slice(0, n).map(e => e[1]);
}

function hitMonster(ctx, m, dmg, color) {
  const killed = damageMonster(m, dmg * ctx.stats.damage, ctx.ev, color);
  if (killed) m.killedBy = 'skill';
  return killed;
}

// Sét nhảy: có ngân sách mỗi khung để không bao giờ thành chuỗi vô hạn
export function chainLightning(ctx, from, chains, range, dmg, slow, slowTime) {
  const hit = new Set([from]);
  let cur = from;
  const pts = [[from.x, from.y - 6]];
  for (let i = 0; i < chains && ctx.chainBudget > 0; i++) {
    const nx = nearestTargets(ctx, cur.x, cur.y, range, 1, false, hit)[0];
    if (!nx) break;
    ctx.chainBudget--;
    hit.add(nx);
    hitMonster(ctx, nx, dmg, '#d9c8ff');
    if (slow) applySlow(nx, slow, slowTime);
    pts.push([nx.x, nx.y - 6]);
    cur = nx;
  }
  if (pts.length > 1) ctx.ev.push({ type: 'chain', pts });
  return hit.size - 1;
}

function pushProjectile(ctx, p) {
  const list = ctx.scene.projectiles;
  if (list.length >= RUN.MAX_PROJECTILES) list.shift();
  list.push(p);
}

function explode(ctx, x, y, p) {
  const r = p.radius * ctx.stats.area;
  for (const m of ctx.scene.monsters) {
    if (m.dead || Math.hypot(m.x - x, m.y - 4 - y) > r + 4) continue;
    hitMonster(ctx, m, p.dmg * ctx.atk, '#ffb070');
    applyBurn(m, p.burn * ctx.atk * ctx.stats.damage, p.burnTime);
  }
  ctx.ev.push({ type: 'boom', x, y, r, color: '#ff9a3c', fx: 'hoa_cau_no', fxR: 16 });
}

// ---------------- từng loại công pháp ----------------
const KINDS = {
  bolt(ctx, s, p, dt) {
    s.st.cd = (s.st.cd ?? 0) - dt;
    if (s.st.cd > 0) return;
    const pl = ctx.player;
    const count = p.count + (ctx.stats.extraProj || 0);           // M4-01: Phi Hành Kiếm +1 đạn
    const ts = nearestTargets(ctx, pl.x, pl.y, p.range, count);
    if (!ts.length) { s.st.cd = 0; return; }
    for (let i = 0; i < count; i++) {
      const m = ts[i % ts.length];
      let dx = m.x - pl.x, dy = (m.y - 4) - (pl.y - 8);
      const spread = ts.length < count ? (i - (count - 1) / 2) * fanStep(Math.hypot(dx, dy), 0.22) : 0;
      const a = Math.atan2(dy, dx) + spread;
      dx = Math.cos(a); dy = Math.sin(a);
      pushProjectile(ctx, { kind: 'bolt', x: pl.x, y: pl.y - 8, vx: dx * p.speed, vy: dy * p.speed, life: p.range / p.speed * 1.4, dmg: p.dmg, pierce: p.pierce, hits: new Set(), fx: 'kiem_khi', heading: a, evo: s.evolved ? p : null, slow: p.slow, slowTime: p.slowTime, ice: !!p.slow });
    }
    s.st.cd = p.cd * ctx.stats.cooldown;
    ctx.ev.push({ type: 'cast', skill: s.id });
  },

  orbit(ctx, s, p, dt) {
    const st = s.st;
    if (st.ready == null) { st.ready = p.blades; st.reloadT = 0; st.launchCd = 0; st.angle = 0; }
    st.ready = Math.min(st.ready, p.blades);
    st.angle += dt * 3;
    if (st.ready < p.blades) { st.reloadT += dt; if (st.reloadT >= p.reload * ctx.stats.cooldown) { st.ready++; st.reloadT = 0; } }
    st.launchCd -= dt;
    const pl = ctx.player;
    // kiếm đang xoay: sát thương va chạm (cấp 5 / tiến hóa)
    if (p.contact > 0 && st.ready > 0) {
      for (let i = 0; i < st.ready; i++) {
        const a = st.angle + i * TAU / st.ready, bx = pl.x + Math.cos(a) * 18, by = pl.y - 8 + Math.sin(a) * 12;
        for (const m of ctx.scene.monsters) {
          if (m.dead || Math.hypot(m.x - bx, m.y - 4 - by) > 9) continue;
          const tag = 'orb:' + s.id;
          if ((m.tags[tag] ?? -1) > ctx.time) continue;
          m.tags[tag] = ctx.time + 0.4;
          hitMonster(ctx, m, p.contact * ctx.atk);
          if (p.burn) applyBurn(m, p.burn * ctx.atk * ctx.stats.damage, p.burnTime);
        }
      }
    }
    if (st.ready <= 0 || st.launchCd > 0) return;
    const t = nearestTargets(ctx, pl.x, pl.y, p.range, 3);
    if (!t.length) return;
    const m = t[Math.floor(ctx.rng() * t.length)];
    const a = st.angle;
    st.ready--; st.launchCd = 0.12;
    pushProjectile(ctx, { kind: 'homing', x: pl.x + Math.cos(a) * 18, y: pl.y - 8 + Math.sin(a) * 12, vx: Math.cos(a) * p.speed * 0.5, vy: Math.sin(a) * p.speed * 0.5, speed: p.speed, target: m, life: 2.2, dmg: p.dmg, pierce: 0, hits: new Set(), evo: s.evolved ? p : null, color: s.evolved ? '#ff9a3c' : '#bff4ff' });
  },

  orb(ctx, s, p, dt) {
    s.st.cd = (s.st.cd ?? 0) - dt;
    if (s.st.cd > 0) return;
    const pl = ctx.player;
    const count = p.count + (ctx.stats.extraProj || 0);
    const ts = nearestTargets(ctx, pl.x, pl.y, p.range, count);
    if (!ts.length) { s.st.cd = 0; return; }
    for (let i = 0; i < count; i++) {
      const m = ts[i % ts.length];
      const a = Math.atan2((m.y - 4) - (pl.y - 8), m.x - pl.x) + (ts.length < count ? (i - (count - 1) / 2) * fanStep(Math.hypot(m.x - pl.x, m.y - pl.y), 0.3) : 0);
      pushProjectile(ctx, { kind: 'orb', x: pl.x, y: pl.y - 8, vx: Math.cos(a) * p.speed, vy: Math.sin(a) * p.speed, life: p.range / p.speed * 1.2, p, hits: new Set() });
    }
    s.st.cd = p.cd * ctx.stats.cooldown;
  },

  ring(ctx, s, p, dt) {
    s.st.t = (s.st.t ?? 0) - dt;
    if (s.st.t > 0) return;
    s.st.t = p.tick;
    const pl = ctx.player, r = p.radius * ctx.stats.area;
    for (const m of ctx.scene.monsters) {
      if (m.dead) continue;
      const dx = m.x - pl.x, dy = m.y - pl.y, d = Math.hypot(dx, dy);
      if (d > r + 4) continue;
      hitMonster(ctx, m, p.dmg * ctx.atk, '#ffb070');
      applyBurn(m, p.burn * ctx.atk * ctx.stats.damage, p.burnTime);
      if (p.push && d > 0) { m.kx += dx / d * p.push * 3; m.ky += dy / d * p.push * 3; }
    }
  },

  strike(ctx, s, p, dt) {
    s.st.cd = (s.st.cd ?? 0) - dt;
    if (s.st.cd > 0) return;
    const pl = ctx.player;
    const ts = nearestTargets(ctx, pl.x, pl.y, p.range, Math.max(p.targets, 4), false);
    if (!ts.length) { s.st.cd = 0; return; }
    const picks = [];
    while (picks.length < p.targets && ts.length) picks.push(ts.splice(Math.floor(ctx.rng() * Math.min(ts.length, 3)), 1)[0]);
    for (const m of picks) {
      ctx.ev.push({ type: 'fx', name: 'loi_kiep', x: m.x, y: m.y, scale: 0.5, flip: ctx.rng() < 0.5 });
      hitMonster(ctx, m, p.dmg * ctx.atk, '#d9c8ff');
      applySlow(m, p.slow, p.slowTime);
      if (p.chains) chainLightning(ctx, m, p.chains, p.chainRange, p.dmg * 0.6 * ctx.atk, p.slow, p.slowTime);
    }
    s.st.cd = p.cd * ctx.stats.cooldown;
  },

  pulse(ctx, s, p, dt) {
    s.st.t = (s.st.t ?? p.interval * 0.5) - dt;
    if (s.st.t > 0) return;
    s.st.t = p.interval * ctx.stats.cooldown;
    const pl = ctx.player, r = p.radius * ctx.stats.area;
    let n = 0;
    for (const m of ctx.scene.monsters) {
      if (m.dead || Math.hypot(m.x - pl.x, m.y - pl.y) > r) continue;
      hitMonster(ctx, m, p.dmg * ctx.atk, '#d9c8ff'); applySlow(m, p.slow, p.slowTime); n++;
    }
    ctx.ev.push({ type: 'pulse', x: pl.x, y: pl.y, r, color: p.color || '#b48cff', hits: n, fx: p.color ? 'han_khi' : 'loi_vuc', fxR: 46 });
  },

  line(ctx, s, p, dt) {
    s.st.cd = (s.st.cd ?? 0) - dt;
    if (s.st.cd > 0) return;
    const pl = ctx.player;
    // chỉ bắn khi có yêu thú trong tầm (không bắn vào khoảng không ở động phủ/đầu run)
    const near = nearestTargets(ctx, pl.x, pl.y, p.range, 1, false);
    if (!near.length) { s.st.cd = 0; return; }
    // M2-04: ngắm về yêu thú gần nhất (trước đây theo hướng đi -> khi vừa chạy vừa đánh thì bắn ngược ra sau)
    const base = Math.atan2((near[0].y - 4) - (pl.y - 8), near[0].x - pl.x);
    const dirs = p.count >= 4 ? [0, 1, 2, 3].map(i => base + i * TAU / 4) : p.count >= 2 ? [base, base + Math.PI] : [base];
    for (const a of dirs) pushProjectile(ctx, { kind: 'blade', x: pl.x, y: pl.y - 8, vx: Math.cos(a) * p.speed, vy: Math.sin(a) * p.speed, life: p.range / p.speed, dmg: p.dmg, pierce: p.pierce, hits: new Set(), heading: a });
    s.st.cd = p.cd * ctx.stats.cooldown;
  },

  shield(ctx, s, p, dt) {
    const st = s.st, cap = p.cap * ctx.maxHp;
    if (st.hp == null) { st.hp = cap; st.rechargeT = 0; st.novaT = 0; }
    st.cap = cap;
    if (st.hp <= 0) {
      st.rechargeT += dt;
      if (st.rechargeT >= p.recharge * ctx.stats.cooldown) { st.hp = cap; st.rechargeT = 0; }
    } else st.hp = Math.min(st.hp, cap);
    if (p.nova && st.hp > 0) {
      st.novaT -= dt;
      if (st.novaT <= 0) {
        st.novaT = p.nova.every * ctx.stats.cooldown;
        novaAt(ctx, ctx.player.x, ctx.player.y, p.nova.radius * ctx.stats.area, p.nova.dmg, p.nova.slow, p.nova.slowTime);
      }
    }
  },

  tornado(ctx, s, p, dt) {
    const st = s.st, pl = ctx.player;
    st.angle = (st.angle ?? 0) + p.spin * dt;
    st.t = (st.t ?? 0) - dt;
    const tick = st.t <= 0;
    if (tick) st.t = p.tick;
    st.pos = [];
    for (let i = 0; i < p.count; i++) {
      const a = st.angle + i * TAU / p.count;
      const tx = pl.x + Math.cos(a) * p.orbit, ty = pl.y + Math.sin(a) * p.orbit * 0.75;
      st.pos.push([tx, ty]);
      const r = p.radius * ctx.stats.area, pr = p.pullRadius * ctx.stats.area;
      for (const m of ctx.scene.monsters) {
        if (m.dead) continue;
        const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy);
        if (d < pr && d > 3 && !m.boss) moveEntity(ctx.scene.map, m, dx / d * p.pull * dt, dy / d * p.pull * dt, null);
        if (tick && d < r + 4) { hitMonster(ctx, m, p.dmg * ctx.atk, '#ffb070'); applyBurn(m, p.burn * ctx.atk * ctx.stats.damage, p.burnTime); }
      }
    }
  },
};

function novaAt(ctx, x, y, r, dmg, slow, slowTime) {
  for (const m of ctx.scene.monsters) {
    if (m.dead || Math.hypot(m.x - x, m.y - y) > r) continue;
    hitMonster(ctx, m, dmg * ctx.atk, '#d9c8ff');
    if (slow) applySlow(m, slow, slowTime);
  }
  ctx.ev.push({ type: 'pulse', x, y, r, color: '#d9c8ff' });
}

// Khiên hút sát thương. Trả về phần sát thương còn lại đi vào khí huyết.
export function absorbDamage(ctx, dmg) {
  const s = ctx.run.skills.find(k => skillKind(k) === 'shield');
  if (!s || !(s.st.hp > 0)) return dmg;
  const used = Math.min(s.st.hp, dmg);
  s.st.hp -= used;
  if (s.st.hp <= 0) {
    s.st.hp = 0; s.st.rechargeT = 0;
    const p = skillParams(s);
    if (p.breakNova) novaAt(ctx, ctx.player.x, ctx.player.y, p.breakNova.radius * ctx.stats.area, p.breakNova.dmg);
    ctx.ev.push({ type: 'shieldBreak', x: ctx.player.x, y: ctx.player.y });
  }
  return dmg - used;
}

export function updateSkills(ctx, dt) {
  for (const s of ctx.run.skills) KINDS[skillKind(s)](ctx, s, skillParams(s), dt);
}

// Đạn: di chuyển, va vật cản, trúng yêu thú (xuyên/nổ/sét nhảy)
export function updateProjectiles(ctx, dt) {
  const list = ctx.scene.projectiles, map = ctx.scene.map;
  for (let i = list.length - 1; i >= 0; i--) {
    const q = list[i];
    if (q.kind === 'homing') {
      if (!q.target || q.target.dead) q.target = nearestTargets(ctx, q.x, q.y, 120, 1, false)[0] || null;
      if (q.target) {
        const dx = q.target.x - q.x, dy = (q.target.y - 4) - q.y, d = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, dt * 8);
        q.vx += (dx / d * q.speed - q.vx) * k; q.vy += (dy / d * q.speed - q.vy) * k;
      }
      q.heading = Math.atan2(q.vy, q.vx);
    }
    q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt;
    let dead = q.life <= 0 || !Number.isFinite(q.x) || !Number.isFinite(q.y);
    if (!dead && q.kind !== 'blade' && q.kind !== 'homing' && map.blocksShot(q.x, q.y + 6)) dead = true;
    for (const m of ctx.scene.monsters) {
      if (dead) break;
      if (m.dead || q.hits.has(m) || Math.hypot(m.x - q.x, m.y - 4 - q.y) > (q.kind === 'orb' ? 8 : 9)) continue;
      q.hits.add(m);
      if (q.kind === 'orb') { explode(ctx, q.x, q.y, q.p); dead = true; q.exploded = true; break; }
      hitMonster(ctx, m, q.dmg * ctx.atk, q.kind === 'blade' ? '#c8ffe8' : '#fff');
      if (q.slow) applySlow(m, q.slow, q.slowTime);
      const e = q.evo;
      if (e && e.chains) chainLightning(ctx, m, e.chains, e.chainRange, e.chainDmg * ctx.atk, e.slow, e.slowTime);
      if (e && e.burn) applyBurn(m, e.burn * ctx.atk * ctx.stats.damage, e.burnTime);
      if (e && e.patch) addZone(ctx, { x: m.x, y: m.y, r: e.patch.radius * ctx.stats.area, t: e.patch.time, dps: e.patch.dps, tick: 0 });
      ctx.ev.push({ type: 'fx', name: 'kiem_trung', x: q.x, y: q.y });
      if (q.pierce-- <= 0) dead = true;
    }
    if (dead) {
      if (q.kind === 'orb' && !q.exploded) explode(ctx, q.x, q.y, q.p);
      list.splice(i, 1);
    }
  }
}

function addZone(ctx, z) {
  const zs = ctx.scene.zones;
  if (zs.length >= RUN.MAX_ZONES) zs.shift();
  zs.push(z);
}

export function updateZones(ctx, dt) {
  const zs = ctx.scene.zones;
  for (let i = zs.length - 1; i >= 0; i--) {
    const z = zs[i];
    z.t -= dt; z.tick -= dt;
    if (z.tick <= 0) {
      z.tick = 0.25;
      for (const m of ctx.scene.monsters) if (!m.dead && Math.hypot(m.x - z.x, m.y - z.y) < z.r) hitMonster(ctx, m, z.dps * 0.25 * ctx.atk, '#ffb070');
    }
    if (z.t <= 0) zs.splice(i, 1);
  }
}
