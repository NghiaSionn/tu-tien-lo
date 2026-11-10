// Vẽ một khung: bản đồ, vật thể sắp theo y, yêu thú, người chơi, công pháp, hiệu ứng beanfx và hạt sáng.
import { VIEW, TILE as T, HUB, FEATURES } from '../core/config.js';
import { WATER, STONE, TREE, ROCK } from '../world/map.js';
import { SPR, TIERS, BEAST_WHITE, grassTiles, waterTiles, stoneTile, treeSprs, rockSpr, hash } from './sprites.js';
import { createFx } from '../../lib/beanfx.js';
import { skillKind, skillParams } from '../systems/combat.js';
import { drawFrame } from './pixelfx.js';

const { W, H } = VIEW;
const rand = (a, b) => a + Math.random() * (b - a);
const MAX_PARTS = 400, MAX_TEXTS = 60;

// ---------- hiệu ứng tạm (chỉ để nhìn, không ảnh hưởng logic) ----------
export function makeVis(FX) {
  return { FX, parts: [], texts: [], fxs: [], chains: [], rings: [], flash: 0, shake: 0, reduce: false };
}

export function part(vis, x, y, vx, vy, life, color, size = 1) {
  if (vis.parts.length >= MAX_PARTS) vis.parts.shift();
  vis.parts.push({ x, y, vx, vy, life, max: life, color, size });
}
export function burst(vis, x, y, n, speed, color, life = 0.6, size = 1) {
  if (vis.reduce) n = Math.ceil(n / 3);
  for (let i = 0; i < n; i++) { const a = rand(0, 6.283), v = rand(speed * 0.3, speed); part(vis, x, y, Math.cos(a) * v, Math.sin(a) * v, rand(life * 0.5, life), color, size); }
}
export function floatText(vis, x, y, text, color) {
  if (vis.texts.length >= MAX_TEXTS) vis.texts.shift();
  vis.texts.push({ x, y, text, color, life: 0.9 });
}
export function spawnFx(vis, name, x, y, opts = {}) {
  const fx = createFx(vis.FX[name], { x: Math.round(x), y: Math.round(y), ...opts });
  vis.fxs.push(fx);
  return fx;
}
export function addShake(vis, t) { if (!vis.noShake) vis.shake = Math.max(vis.shake, t); }
export function addFlash(vis, t) { vis.flash = Math.max(vis.flash, vis.reduce ? t * 0.3 : t); }

const TIER_COLORS = TIERS.map(t => t.c);

// Biến sự kiện từ logic thành hình
export function consumeEvents(vis, ev) {
  for (const e of ev) {
    switch (e.type) {
      case 'text': floatText(vis, e.x, e.y, e.text, e.color); break;
      case 'fx': spawnFx(vis, e.name, e.x, e.y, { scale: e.scale || 1, flip: !!e.flip }); break;
      case 'shake': addShake(vis, e.t); break;
      case 'chain': vis.chains.push({ pts: e.pts, life: 0.18 }); break;
      case 'boom': vis.rings.push({ x: e.x, y: e.y, r: e.r * 0.4, to: e.r, life: 0.3, max: 0.3, color: e.color, fill: true }); burst(vis, e.x, e.y, 10, 60, e.color, 0.4); break;
      case 'pulse': vis.rings.push({ x: e.x, y: e.y - 4, r: 6, to: e.r, life: 0.35, max: 0.35, color: e.color }); break;
      case 'death': burst(vis, e.x, e.y - 4, 12, 70, TIER_COLORS[e.tier] || '#fff', 0.6, 2); break;
      case 'shieldBreak': burst(vis, e.x, e.y - 8, 18, 80, '#ffd978', 0.5, 2); addShake(vis, 0.15); break;
    }
  }
  ev.length = 0;
}

export function updateVis(vis, dt) {
  vis.flash -= dt; vis.shake -= dt;
  for (let i = vis.parts.length - 1; i >= 0; i--) { const q = vis.parts[i]; q.x += q.vx * dt; q.y += q.vy * dt; if ((q.life -= dt) <= 0) vis.parts.splice(i, 1); }
  for (let i = vis.texts.length - 1; i >= 0; i--) { const q = vis.texts[i]; q.y -= 18 * dt; if ((q.life -= dt) <= 0) vis.texts.splice(i, 1); }
  for (let i = vis.fxs.length - 1; i >= 0; i--) if (vis.fxs[i].update(dt).done) vis.fxs.splice(i, 1);
  for (let i = vis.chains.length - 1; i >= 0; i--) if ((vis.chains[i].life -= dt) <= 0) vis.chains.splice(i, 1);
  for (let i = vis.rings.length - 1; i >= 0; i--) { const r = vis.rings[i]; r.r += (r.to - r.r) * Math.min(1, dt * 12); if ((r.life -= dt) <= 0) vis.rings.splice(i, 1); }
}

export function clearVis(vis) { vis.parts.length = vis.texts.length = vis.fxs.length = vis.chains.length = vis.rings.length = 0; vis.flash = vis.shake = 0; }

// ---------- vẽ ----------
function pxRing(ctx, x, y, r, n, rot, col, size, flat = 0.6) {
  ctx.fillStyle = col;
  for (let i = 0; i < n; i++) { const a = rot + i / n * 6.283; ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * flat), size, size); }
}
function pxLine(ctx, x0, y0, x1, y1, col, size) {
  const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) || 1;
  ctx.fillStyle = col;
  for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), size, size);
}

function drawMap(ctx, map, camX, camY, time, objs) {
  const tx0 = Math.floor(camX / T), ty0 = Math.floor(camY / T), tx1 = tx0 + Math.ceil(W / T) + 1, ty1 = ty0 + Math.ceil(H / T) + 1;
  for (let ty = ty0; ty <= ty1 + 2; ty++) for (let tx = tx0 - 1; tx <= tx1; tx++) {
    const t = map.tileAt(tx, ty), x = tx * T, y = ty * T;
    if (ty <= ty1) {
      if (t === WATER) ctx.drawImage(waterTiles[(Math.floor(time * 1.5) + tx + ty) & 1], x, y);
      else if (t === STONE) ctx.drawImage(stoneTile, x, y);
      else ctx.drawImage(grassTiles[Math.floor(hash(tx, ty, 5) * 4)], x, y);
    }
    if (t === TREE) { const v = hash(tx, ty, 6); objs.push({ y: y + T, img: treeSprs[v < 0.12 ? 2 : v < 0.56 ? 0 : 1], x: x - 2, dy: y + T - 28 }); }
    else if (t === ROCK) objs.push({ y: y + T - 2, img: rockSpr, x: x + 1, dy: y + 5 });
  }
}

function drawMonster(ctx, m, time) {
  const hop = (m.vx || m.vy) ? Math.abs(Math.sin(time * 9 + m.ph)) * 2 : 0;
  const mx = Math.round(m.x - 6), my = Math.round(m.y - 9 - hop);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(mx + 1, Math.round(m.y) - 1, 10, 2);
  ctx.drawImage(m.hit > 0 ? BEAST_WHITE : TIERS[m.tier].spr, mx, my);
  if (m.burn && m.burn.t > 0 && Math.floor(time * 10 + m.ph) % 3 === 0) { ctx.fillStyle = '#ffb070'; ctx.fillRect(mx + 2 + Math.floor(m.ph * 3) % 8, my - 1, 1, 2); }
  if (m.slow && m.slow.t > 0) { ctx.fillStyle = '#b48cff'; ctx.fillRect(mx, my + 9, 12, 1); }
  if (m.hp < m.max) {
    ctx.fillStyle = '#1a1423'; ctx.fillRect(mx, my - 4, 12, 3);
    ctx.fillStyle = '#e2584f'; ctx.fillRect(mx + 1, my - 3, Math.max(1, Math.round(10 * m.hp / m.max)), 1);
  }
}

function drawPlayer(ctx, p, time, medFx, inForm) {
  if (p.inv > 0 && Math.floor(time * 20) % 2) return;
  const x = Math.round(p.x - 6), fy = Math.round(p.y);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + 1, fy - 1, 10, 2);
  if (p.med) {
    medFx.x = Math.round(p.x); medFx.y = fy; medFx.lightGain = inForm ? 1 : 0.6; medFx.draw(ctx);
    ctx.drawImage(SPR.sit, x, fy - 14 - Math.round(Math.sin(time * 2) * 1.5 + 1.5));
    return;
  }
  const spr = SPR[p.face][p.moving ? Math.floor(p.anim) % 4 : 0];
  if (p.face === 'side' && p.flip) { ctx.save(); ctx.translate(x + 12, fy - 16); ctx.scale(-1, 1); ctx.drawImage(spr, 0, 0); ctx.restore(); }
  else ctx.drawImage(spr, x, fy - 16);
}

function drawPortal(ctx, x, y, time, active) {
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = active ? 1 : 0.7;
  for (let k = 0; k < 3; k++) pxRing(ctx, x, y - 12, 9 + k * 3.5, 14 + k * 4, time * (1.5 - k * 0.4) * (k % 2 ? -1 : 1), ['#d9c8ff', '#9a7bff', '#5a3ad0'][k], 2, 1.25);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(30,10,60,.55)'; ctx.fillRect(x - 5, y - 20, 10, 16);
}

// Công pháp đang hoạt động quanh người chơi (vòng lửa, phi kiếm, khiên, lốc)
function drawSkillsUnder(ctx, run, p, time) {
  for (const s of run.skills) {
    const k = skillKind(s), prm = skillParams(s);
    if (k === 'ring') {
      ctx.globalCompositeOperation = 'lighter';
      pxRing(ctx, p.x, p.y - 2, prm.radius, 26, time * 2.5, '#ff8a3c', 2, 0.55);
      pxRing(ctx, p.x, p.y - 2, prm.radius - 3, 18, -time * 3, '#ffd06a', 1, 0.55);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}
function drawSkillsOver(ctx, run, p, time) {
  for (const s of run.skills) {
    const k = skillKind(s), prm = skillParams(s), st = s.st;
    ctx.globalCompositeOperation = 'lighter';
    if (k === 'orbit' && st.ready > 0) {
      for (let i = 0; i < st.ready; i++) {
        const a = st.angle + i * 6.283 / st.ready, bx = p.x + Math.cos(a) * 18, by = p.y - 8 + Math.sin(a) * 12;
        pxLine(ctx, bx - Math.cos(a + 1.57) * 3, by - Math.sin(a + 1.57) * 3, bx + Math.cos(a + 1.57) * 3, by + Math.sin(a + 1.57) * 3, s.evolved ? '#ff9a3c' : '#bff4ff', 1);
        ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(bx), Math.round(by), 1, 1);
      }
    } else if (k === 'shield' && st.hp > 0) {
      ctx.globalAlpha = 0.35 + 0.25 * (st.hp / (st.cap || 1));
      pxRing(ctx, p.x, p.y - 9, 13, 28, time, s.evolved ? '#d9c8ff' : '#ffd978', 1, 1.15);
      ctx.globalAlpha = 1;
    } else if (k === 'tornado' && st.pos) {
      for (const [tx, ty] of st.pos) for (let j = 0; j < 5; j++) pxRing(ctx, tx, ty - j * 6, prm.radius * (0.4 + j * 0.14), 10, time * 6 + j, j < 2 ? '#ff6a2a' : '#ffb070', 2, 0.45);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}

function drawProjectiles(ctx, scene, FX, dt) {
  for (const q of scene.projectiles) {
    const x = Math.round(q.x), y = Math.round(q.y);
    if (q.kind === 'bolt') {
      if (!q.fxObj) q.fxObj = createFx(FX.kiem_khi, { heading: q.heading });
      q.fxObj.update(dt); q.fxObj.x = x; q.fxObj.y = y; q.fxObj.draw(ctx);
      if (q.evo && q.evo.chains) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#d9c8ff'; ctx.fillRect(x - 1 + ((x * 7) % 3) - 1, y - 2, 1, 4); ctx.globalCompositeOperation = 'source-over'; }
    } else {
      ctx.globalCompositeOperation = 'lighter';
      if (q.kind === 'homing') {
        const c = Math.cos(q.heading), s = Math.sin(q.heading);
        pxLine(ctx, x - c * 5, y - s * 5, x + c * 3, y + s * 3, q.color, 1);
        ctx.fillStyle = '#fff'; ctx.fillRect(x + Math.round(c * 3), y + Math.round(s * 3), 1, 1);
      } else if (q.kind === 'orb') {
        ctx.fillStyle = 'rgba(255,120,40,.6)'; ctx.fillRect(x - 3, y - 3, 7, 7);
        ctx.fillStyle = '#ffd06a'; ctx.fillRect(x - 2, y - 2, 5, 5);
        ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 1, 2, 2);
      } else if (q.kind === 'blade') {
        const c = Math.cos(q.heading + 1.57), s = Math.sin(q.heading + 1.57);
        pxLine(ctx, x - c * 5, y - s * 5, x + c * 5, y + s * 5, '#7ff0c8', 2);
        pxLine(ctx, x - c * 3, y - s * 3, x + c * 3, y + s * 3, '#e6fff6', 1);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}

// g: { scene, player, time, meta, run, vis, medFx, trib, inForm, portal }
export function render(ctx, g) {
  const { scene, player: p, time, vis } = g, map = scene.map;
  let camX = Math.round(Math.max(0, Math.min(map.pw - W, p.x - W / 2)));
  let camY = Math.round(Math.max(0, Math.min(map.ph - H, p.y - 8 - H / 2)));
  if (vis.shake > 0) { camX += Math.round(rand(-2, 2)); camY += Math.round(rand(-2, 2)); }
  ctx.setTransform(1, 0, 0, 1, -camX, -camY);

  const objs = [];
  drawMap(ctx, map, camX, camY, time, objs);

  if (scene.kind === 'hub') {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = p.med && g.inForm ? 1 : 0.55;
    pxRing(ctx, map.cx, map.cy, HUB.FORM_R, 28, time * 0.5, '#3fb8d8', 2);
    pxRing(ctx, map.cx, map.cy, HUB.FORM_R * 0.62, 16, -time * 0.8, '#7fe3ff', 2);
    pxRing(ctx, map.cx, map.cy, HUB.FORM_R * 0.28, 8, time * 1.2, '#ffe08a', 2);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (FEATURES.run && g.portal && !vis.pfx) drawPortal(ctx, g.portal.x, g.portal.y, time, g.portal.near);
  } else {
    // chiến ý (EXP) và vùng lửa nằm dưới mặt đất
    ctx.globalCompositeOperation = 'lighter';
    for (const z of scene.zones) { ctx.globalAlpha = Math.min(1, z.t); pxRing(ctx, z.x, z.y, z.r, 16, time * 3, '#ff6a2a', 2, 0.5); }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    for (const o of scene.orbs) {
      if (vis.pfx) {
        const a = vis.pfx.orbs[o.v >= 3 ? 2 : o.v >= 2 ? 1 : 0];
        drawFrame(ctx, a, Math.floor(time * a.meta.fps) + (o.ph || 0), o.x, o.y - 2);
        continue;
      }
      const c = o.v >= 3 ? '#ffd978' : o.v >= 2 ? '#7fe3ff' : '#9cf2a0';
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = c; ctx.fillRect(Math.round(o.x) - 1, Math.round(o.y + Math.sin(time * 5 + o.x) * 1) - 1, 3, 3);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalCompositeOperation = 'source-over';
    if (g.run) drawSkillsUnder(ctx, g.run, p, time);
  }

  for (const m of scene.monsters) objs.push({ y: m.y, m });
  objs.push({ y: p.y, player: true });
  if (scene.kind === 'hub' && FEATURES.run && g.portal && vis.pfx) objs.push({ y: g.portal.y, portal: true });
  objs.sort((a, b) => a.y - b.y);
  for (const o of objs) {
    if (o.img) ctx.drawImage(o.img, o.x, o.dy);
    else if (o.m) drawMonster(ctx, o.m, time);
    else if (o.portal) { const f = vis.pfx.portal; f.x = Math.round(g.portal.x); f.y = Math.round(g.portal.y); f.draw(ctx); }
    else drawPlayer(ctx, p, time, g.medFx, g.inForm);
  }

  if (g.run) drawSkillsOver(ctx, g.run, p, time);
  if (scene.projectiles) drawProjectiles(ctx, scene, vis.FX, g.dtWorld || 0);
  for (const s of g.hubShots || []) { s.fx.x = Math.round(s.x); s.fx.y = Math.round(s.y); s.fx.draw(ctx); }
  for (const fx of vis.fxs) fx.draw(ctx);

  ctx.globalCompositeOperation = 'lighter';
  for (const r of vis.rings) { ctx.globalAlpha = Math.min(1, r.life / r.max * 1.5); pxRing(ctx, r.x, r.y, r.r, Math.max(12, Math.round(r.r * 1.2)), 0, r.color, 2, 0.55); }
  for (const c of vis.chains) for (let i = 1; i < c.pts.length; i++) {
    const [x0, y0] = c.pts[i - 1], [x1, y1] = c.pts[i];
    const mx = (x0 + x1) / 2 + rand(-4, 4), my = (y0 + y1) / 2 + rand(-4, 4);
    pxLine(ctx, x0, y0, mx, my, '#b48cff', 2); pxLine(ctx, mx, my, x1, y1, '#b48cff', 2);
    pxLine(ctx, x0, y0, mx, my, '#fff', 1); pxLine(ctx, mx, my, x1, y1, '#fff', 1);
  }
  for (const q of vis.parts) { ctx.globalAlpha = Math.min(1, q.life / q.max * 1.5); ctx.fillStyle = q.color; ctx.fillRect(Math.round(q.x), Math.round(q.y), q.size, q.size); }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  ctx.font = '8px monospace'; ctx.textAlign = 'center';
  for (const q of vis.texts) {
    ctx.globalAlpha = Math.min(1, q.life * 2);
    ctx.fillStyle = '#000'; ctx.fillText(q.text, Math.round(q.x) + 1, Math.round(q.y) + 1);
    ctx.fillStyle = q.color; ctx.fillText(q.text, Math.round(q.x), Math.round(q.y));
  }
  ctx.globalAlpha = 1;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (g.trib) { ctx.fillStyle = 'rgba(20,10,50,.35)'; ctx.fillRect(0, 0, W, H); }
  if (vis.flash > 0) { ctx.fillStyle = `rgba(230,220,255,${Math.min(0.7, vis.flash * 3)})`; ctx.fillRect(0, 0, W, H); }
}
