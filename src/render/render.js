// Vẽ một khung: bản đồ, vật thể sắp theo y, yêu thú, người chơi, công pháp, hiệu ứng beanfx và hạt sáng.
import { VIEW, TILE as T, HUB, FEATURES, ARCH, BOSS, TRIBULATION, SHRINE } from '../core/config.js';
import { WATER, STONE, TREE, ROCK } from '../world/map.js';
import { SPR, TIERS, BOSS_WHITE, BOSS_SPR, grassTiles, waterTiles, stoneTile, treeSprs, rockSpr, hash } from './sprites.js';
import { createFx } from '../../lib/beanfx.js';
import { skillKind, skillParams } from '../systems/combat.js';

const { W, H } = VIEW;
const rand = (a, b) => a + Math.random() * (b - a);
const MAX_PARTS = 400, MAX_TEXTS = 60;
// M5-04: trần hạt theo mức đồ họa (cảnh báo nguy hiểm KHÔNG bị cắt ở mức nào)
export const PART_CAP = { high: 400, medium: 220, low: 90 };
// trần fx sinh từ sự kiện chiến đấu (tia trúng đòn, nổ, xung). Đầy thì bỏ fx mới; nổ/xung về hình vẽ code.
// Không áp cho fx đột phá/lôi kiếp (có onHit). Cảnh stress không trần từng lên 880 fx -> 45 ms/khung.
export const FX_CAP = { high: 160, medium: 100, low: 50 };

// ---------- hiệu ứng tạm (chỉ để nhìn, không ảnh hưởng logic) ----------
export function makeVis(FX) {
  return { FX, parts: [], texts: [], fxs: [], chains: [], rings: [], flash: 0, shake: 0, reduce: false, banner: null };
}

export function part(vis, x, y, vx, vy, life, color, size = 1) {
  if (vis.parts.length >= (PART_CAP[vis.quality] || MAX_PARTS)) vis.parts.shift();
  vis.parts.push({ x, y, vx, vy, life, max: life, color, size });
}
export function burst(vis, x, y, n, speed, color, life = 0.6, size = 1) {
  if (vis.reduce || vis.quality === 'low') n = Math.ceil(n / 3); else if (vis.quality === 'medium') n = Math.ceil(n / 1.6);
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

// M5-03: một fx dùng chung cho nhiều thứ cùng loại (kiếm xoay, vùng lửa, đạn boss) theo (tên, hàng hướng);
// cập nhật đúng một lần mỗi khung. null khi đồ họa Thấp hoặc chưa nạp -> nơi gọi vẽ hình code.
function sharedFx(vis, name, row = 0) {
  if (vis.quality === 'low' || !vis.FX[name]) return null;
  vis.shared = vis.shared || {};
  const key = name + ':' + row;
  let e = vis.shared[key];
  if (!e) e = vis.shared[key] = { fx: createFx(vis.FX[name], { row }), at: -1 };
  if (e.at !== vis.frameNo) { e.at = vis.frameNo; e.fx.update(vis.frameDt || 0); }
  return e.fx;
}
const rowFor = (heading, n) => ((Math.round(heading / 6.283185307 * n) % n) + n) % n;

// Biến sự kiện từ logic thành hình
export function consumeEvents(vis, ev) {
  const cap = FX_CAP[vis.quality] || FX_CAP.high;
  for (const e of ev) {
    const room = vis.fxs.length < cap;
    switch (e.type) {
      case 'text': floatText(vis, e.x, e.y, e.text, e.color); break;
      case 'fx': if (room) spawnFx(vis, e.name, e.x, e.y, { scale: e.scale || 1, flip: !!e.flip }); break;
      case 'shake': addShake(vis, e.t); break;
      case 'chain': vis.chains.push({ pts: e.pts, life: 0.18 }); break;
      case 'boom': if (!e.fx && e.color === '#c070ff') { e.fx = 'hac_diem_no'; e.fxR = 30; }
        if (room && e.fx && vis.FX[e.fx] && vis.quality !== 'low') { spawnFx(vis, e.fx, e.x, e.y, { scale: e.r / e.fxR }); break; }
        vis.rings.push({ x: e.x, y: e.y, r: e.r * 0.4, to: e.r, life: 0.3, max: 0.3, color: e.color, fill: true }); burst(vis, e.x, e.y, 10, 60, e.color, 0.4); break;
      case 'pulse': if (room && e.fx && vis.FX[e.fx] && vis.quality !== 'low') { spawnFx(vis, e.fx, e.x, e.y, { scale: e.r / e.fxR }); break; }
        vis.rings.push({ x: e.x, y: e.y - 4, r: 6, to: e.r, life: 0.35, max: 0.35, color: e.color }); break;
      case 'death': burst(vis, e.x, e.y - 4, 12, 70, TIER_COLORS[e.tier] || '#fff', 0.6, 2); break;
      case 'announce': vis.banner = { text: e.text, color: e.color || '#ffd978', life: 2.6 }; break;
      case 'shieldBreak': burst(vis, e.x, e.y - 8, 18, 80, '#ffd978', 0.5, 2); addShake(vis, 0.15); break;
    }
  }
  ev.length = 0;
}

export function updateVis(vis, dt) {
  vis.flash -= dt; vis.shake -= dt;
  if (vis.banner && (vis.banner.life -= dt) <= 0) vis.banner = null;
  for (let i = vis.parts.length - 1; i >= 0; i--) { const q = vis.parts[i]; q.x += q.vx * dt; q.y += q.vy * dt; if ((q.life -= dt) <= 0) vis.parts.splice(i, 1); }
  for (let i = vis.texts.length - 1; i >= 0; i--) { const q = vis.texts[i]; q.y -= 18 * dt; if ((q.life -= dt) <= 0) vis.texts.splice(i, 1); }
  for (let i = vis.fxs.length - 1; i >= 0; i--) if (vis.fxs[i].update(dt).done) vis.fxs.splice(i, 1);
  for (let i = vis.chains.length - 1; i >= 0; i--) if ((vis.chains[i].life -= dt) <= 0) vis.chains.splice(i, 1);
  for (let i = vis.rings.length - 1; i >= 0; i--) { const r = vis.rings[i]; r.r += (r.to - r.r) * Math.min(1, dt * 12); if ((r.life -= dt) <= 0) vis.rings.splice(i, 1); }
}

export function clearVis(vis) { vis.parts.length = vis.texts.length = vis.fxs.length = vis.chains.length = vis.rings.length = 0; vis.flash = vis.shake = 0; vis.banner = null; }

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

function drawBoss(ctx, m, time) {
  const spr = BOSS_SPR[m.bossKind], S = 3, w = spr.width * S, h = spr.height * S;
  const hop = (m.vx || m.vy) && m.st === 'move' ? Math.abs(Math.sin(time * 6)) * 3 : 0;
  const bx = Math.round(m.x - w / 2), by = Math.round(m.y - h + 3 - hop);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(Math.round(m.x - w / 2 + 4), Math.round(m.y) - 3, w - 8, 5);
  if (m.st === 'windup') { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35; ctx.drawImage(BOSS_WHITE[m.bossKind], bx - 3, by - 3, w + 6, h + 6); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  ctx.drawImage(m.hit > 0 ? BOSS_WHITE[m.bossKind] : spr, bx, by, w, h);
  if (m.vuln > 0) {   // sơ hở: 3 sao vàng xoay trên đầu
    ctx.fillStyle = '#ffe066';
    for (let i = 0; i < 3; i++) { const a = time * 5 + i * 2.094; ctx.fillRect(Math.round(m.x + Math.cos(a) * 12) - 1, Math.round(by - 4 + Math.sin(a) * 3) - 1, 3, 3); }
  }
}

function drawMonster(ctx, m, time) {
  if (m.boss) return drawBoss(ctx, m, time);
  const hop = (m.vx || m.vy) && m.st !== 'dash' ? Math.abs(Math.sin(time * 9 + m.ph)) * 2 : 0;
  if (m.elite) {
    // tinh anh: sprite x2, bóng lớn, thanh máu luôn hiện
    const ex = Math.round(m.x - 12), ey = Math.round(m.y - 18 - hop);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(ex + 2, Math.round(m.y) - 2, 20, 3);
    ctx.drawImage(m.hit > 0 ? TIERS[m.tier].white : TIERS[m.tier].spr, ex, ey - 2, 24, 20);
    ctx.fillStyle = '#1a1423'; ctx.fillRect(ex - 2, ey - 5, 28, 3);
    ctx.fillStyle = '#c070ff'; ctx.fillRect(ex - 1, ey - 4, Math.max(1, Math.round(26 * m.hp / m.max)), 1);
    return;
  }
  const mx = Math.round(m.x - 6), my = Math.round(m.y - 10 - hop);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(mx + 1, Math.round(m.y) - 1, 10, 2);
  ctx.drawImage(m.hit > 0 ? TIERS[m.tier].white : TIERS[m.tier].spr, mx, my);
  if (m.st === 'windup') { ctx.fillStyle = '#ff4a3a'; ctx.fillRect(mx + 5, my - 8, 2, 4); ctx.fillRect(mx + 5, my - 3, 2, 1); }
  if (m.burn && m.burn.t > 0 && Math.floor(time * 10 + m.ph) % 3 === 0) { ctx.fillStyle = '#ffb070'; ctx.fillRect(mx + 2 + Math.floor(m.ph * 3) % 8, my - 1, 1, 2); }
  if (m.slow && m.slow.t > 0) { ctx.fillStyle = '#b48cff'; ctx.fillRect(mx, my + 9, 12, 1); }
  if (m.hp < m.max) {
    ctx.fillStyle = '#1a1423'; ctx.fillRect(mx, my - 4, 12, 3);
    ctx.fillStyle = '#e2584f'; ctx.fillRect(mx + 1, my - 3, Math.max(1, Math.round(10 * m.hp / m.max)), 1);
  }
}

// Cảnh báo đòn (dưới chân quái, vẽ đúng hình học của vùng/đường trúng). Không nhấp nháy mạnh; phần sáng lấp dần = sắp đánh.
// Lớp trên (sau cây/sprite): chỉ viền cảnh báo, mờ hơn — để tán cây không che mất vùng nguy hiểm (M2-04, chơi thử)
function drawTelegraphsTop(ctx, scene) {
  for (const h of scene.hazards || []) { ctx.globalAlpha = 0.5; pxRing(ctx, h.x, h.y, h.r, Math.max(40, Math.round(h.r * 1.8)), 0, '#ff4a3a', 1, 1); }
  for (const m of scene.monsters) {
    if (m.dead || m.st !== 'windup') continue;
    let L = 0;
    if (m.arch === 'charger') L = ARCH.charger.DASH_SPEED * ARCH.charger.DASH_TIME;
    else if (m.boss && m.pat === 'dash') L = BOSS.MINI.DASH.SPEED * BOSS.MINI.DASH.TIME;
    else if (m.arch === 'elite') { ctx.globalAlpha = 0.5; pxRing(ctx, m.x, m.y, ARCH.elite.SLAM_R, 60, 0, '#ff4a3a', 1, 1); }
    if (L) { ctx.globalAlpha = 0.35; pxLine(ctx, m.x, m.y - 3, m.x + m.dirX * L, m.y - 3 + m.dirY * L, '#ff4a3a', 1); }
  }
  ctx.globalAlpha = 1;
}

function drawTelegraphs(ctx, scene) {
  // vùng nguy hiểm của boss (đập đất, hắc diễm): vòng đỏ đúng bán kính trúng + lấp tím dần tới lúc nổ
  for (const h of scene.hazards || []) {
    const prog = 1 - Math.max(0, h.t) / (h.max || 1);
    ctx.globalAlpha = 0.22; ctx.fillStyle = '#c070ff';
    ctx.beginPath(); ctx.arc(h.x, h.y, h.r * prog, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 0.9; pxRing(ctx, h.x, h.y, h.r, Math.max(40, Math.round(h.r * 1.8)), 0, '#ff4a3a', 2, 1);
    ctx.globalAlpha = 1;
  }
  for (const m of scene.monsters) {
    if (m.dead || (m.st !== 'windup' && m.st !== 'rest')) continue;
    if (m.boss) { drawBossTelegraph(ctx, m); continue; }
    if (m.st !== 'windup') continue;
    const A = ARCH[m.arch], prog = 1 - Math.max(0, m.stT) / (m.stMax || 1);
    if (m.arch === 'charger') {
      const L = A.DASH_SPEED * A.DASH_TIME, x0 = m.x, y0 = m.y - 3;
      ctx.globalAlpha = 0.45; pxLine(ctx, x0, y0, x0 + m.dirX * L, y0 + m.dirY * L, '#ff4a3a', 2);
      ctx.globalAlpha = 0.9; pxLine(ctx, x0, y0, x0 + m.dirX * L * prog, y0 + m.dirY * L * prog, '#ffb070', 1);
      ctx.fillStyle = '#ff4a3a'; ctx.fillRect(Math.round(x0 + m.dirX * L) - 2, Math.round(y0 + m.dirY * L) - 2, 4, 4);
    } else if (m.arch === 'ranged') {
      const L = A.SHOT_SPEED * A.SHOT_LIFE * 0.6, x0 = m.x, y0 = m.y - 6;
      ctx.globalAlpha = 0.6; pxLine(ctx, x0, y0, x0 + m.dirX * L, y0 + m.dirY * L, '#9fe8ff', 1);
      ctx.globalAlpha = 0.95; pxLine(ctx, x0, y0, x0 + m.dirX * L * prog, y0 + m.dirY * L * prog, '#e8fbff', 1);
      ctx.fillStyle = '#e8fbff'; const g = 1 + Math.round(prog * 2); ctx.fillRect(Math.round(x0) - g, Math.round(y0) - g, g * 2, g * 2);
    } else if (m.arch === 'elite') {
      ctx.globalAlpha = 0.25; ctx.fillStyle = '#c070ff';
      ctx.beginPath(); ctx.arc(m.x, m.y, A.SLAM_R * prog, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 0.85; pxRing(ctx, m.x, m.y, A.SLAM_R, 80, 0, '#ff4a3a', 2, 1);
    }
    ctx.globalAlpha = 1;
  }
}
function drawBossTelegraph(ctx, m) {
  const B = BOSS[m.bossKind], prog = m.st === 'rest' ? 0 : 1 - Math.max(0, m.stT) / (m.stMax || 1);
  if (m.pat === 'dash') {
    const L = B.DASH.SPEED * B.DASH.TIME, x0 = m.x, y0 = m.y - 4;
    ctx.globalAlpha = 0.5; pxLine(ctx, x0, y0, x0 + m.dirX * L, y0 + m.dirY * L, '#ff4a3a', 3);
    ctx.globalAlpha = 0.95; pxLine(ctx, x0, y0, x0 + m.dirX * L * prog, y0 + m.dirY * L * prog, '#ffd978', 1);
    ctx.fillStyle = '#ff4a3a'; ctx.fillRect(Math.round(x0 + m.dirX * L) - 3, Math.round(y0 + m.dirY * L) - 3, 6, 6);
  } else if (m.pat === 'howl') {
    ctx.globalAlpha = 0.8; pxRing(ctx, m.x, m.y - 10, 16 + prog * 30, 36, 0, '#ffd978', 2, 1);
  } else if (m.pat === 'burst') {
    // từng hướng đạn sẽ bay: đứng giữa hai tia là né được
    for (let i = 0; i < m.burstN; i++) {
      const a = m.burstA0 + i * 6.283 / m.burstN, c = Math.cos(a), s = Math.sin(a), y0 = m.y - 10;
      ctx.globalAlpha = 0.65; pxLine(ctx, m.x + c * 16, y0 + s * 16, m.x + c * 70, y0 + s * 70, '#d070ff', 1);
      ctx.globalAlpha = 0.95; pxLine(ctx, m.x + c * 16, y0 + s * 16, m.x + c * (16 + 54 * prog), y0 + s * (16 + 54 * prog), '#f4d8ff', 1);
    }
  }
  ctx.globalAlpha = 1;
}

// Linh Mạch (M3-04): cột linh quang; mờ + vòng đỏ khi bị phong ấn (boss sống); chữ "E" khi đứng gần
function drawShrine(ctx, run, p, time) {
  const s = run.shrine, sealed = run.scene.monsters.some(m => m.boss && !m.dead);
  const x = Math.round(s.x), y = Math.round(s.y);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = sealed ? 0.35 : 0.9;
  pxRing(ctx, x, y, SHRINE.R, 30, time, sealed ? '#ff6a6a' : '#7fe3ff', 1, 0.6);
  for (let i = 0; i < 18; i++) { ctx.fillStyle = i % 3 ? '#7fe3ff' : '#e8fbff'; ctx.fillRect(x - 1 + Math.round(Math.sin(time * 4 + i) * 1.5), y - 2 - i * 2 - ((time * 20) % 2), 2, 2); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  if (Math.hypot(p.x - s.x, p.y - s.y) < SHRINE.R + 6) {
    ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(sealed ? 'phong ấn' : 'E: Linh Mạch', x + 1, y - 42);
    ctx.fillStyle = sealed ? '#ff8f8a' : '#e8fbff'; ctx.fillText(sealed ? 'phong ấn' : 'E: Linh Mạch', x, y - 43);
  }
}

// Thiên kiếp tương tác (M3-03): trận thử thách + cảnh báo đúng hình học vùng trúng; lấp dần = sắp đánh
function drawTribulation(ctx, tr, time, top) {
  if (!top) { ctx.globalAlpha = 0.7; pxRing(ctx, tr.cx, tr.cy, TRIBULATION.ARENA_R, 90, time * 0.3, '#9a7bff', 2, 1); }
  for (const h of tr.hazards) {
    const prog = 1 - Math.max(0, h.t) / (h.max || 1);
    if (h.kind === 'circle') {
      if (!top) { ctx.globalAlpha = 0.22; ctx.fillStyle = '#c070ff'; ctx.beginPath(); ctx.arc(h.x, h.y, h.r * prog, 0, 6.283); ctx.fill(); }
      ctx.globalAlpha = top ? 0.5 : 0.9; pxRing(ctx, h.x, h.y, h.r, 44, 0, '#ff4a3a', top ? 1 : 2, 1);
    } else if (h.kind === 'line') {
      const dx = h.x1 - h.x0, dy = h.y1 - h.y0, l = Math.hypot(dx, dy), nx = -dy / l * h.w / 2, ny = dx / l * h.w / 2;
      if (!top) {
        ctx.globalAlpha = 0.12 + 0.18 * prog; ctx.fillStyle = '#c070ff';
        ctx.beginPath(); ctx.moveTo(h.x0 + nx, h.y0 + ny); ctx.lineTo(h.x1 + nx, h.y1 + ny); ctx.lineTo(h.x1 - nx, h.y1 - ny); ctx.lineTo(h.x0 - nx, h.y0 - ny); ctx.fill();
      }
      ctx.globalAlpha = top ? 0.45 : 0.9;
      pxLine(ctx, h.x0 + nx, h.y0 + ny, h.x1 + nx, h.y1 + ny, '#ff4a3a', 1); pxLine(ctx, h.x0 - nx, h.y0 - ny, h.x1 - nx, h.y1 - ny, '#ff4a3a', 1);
    } else if (h.kind === 'storm') {
      if (!top) { ctx.globalAlpha = 0.1 + 0.2 * prog; ctx.fillStyle = '#c070ff'; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, 6.283); ctx.fill(); }
      for (const s of h.safe) {   // ô an toàn: vòng xanh sáng, đứng vào đây
        if (!top) { ctx.globalAlpha = 0.35; ctx.fillStyle = '#9cf2a0'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill(); }
        ctx.globalAlpha = top ? 0.6 : 1; pxRing(ctx, s.x, s.y, s.r, 36, -time * 2, '#e6ffe8', 2, 1);
      }
    }
  }
  ctx.globalAlpha = 1;
}
function drawTribHud(ctx, tr) {
  const total = TRIBULATION.PHASES.reduce((a, p) => a + p.dur, 0), w = 200, x = Math.round((W - w) / 2), y = 56;
  ctx.fillStyle = 'rgba(10,6,20,.7)'; ctx.fillRect(x - 3, y - 10, w + 6, 17);
  ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#e6dcff';
  const ph = TRIBULATION.PHASES[Math.min(tr.phase, TRIBULATION.PHASES.length - 1)];
  ctx.fillText(`Thiên kiếp · ${ph.name} (${Math.min(tr.phase + 1, TRIBULATION.PHASES.length)}/${TRIBULATION.PHASES.length})`, W / 2, y - 2);
  ctx.fillStyle = '#2a1830'; ctx.fillRect(x, y + 1, w, 3);
  ctx.fillStyle = '#b48cff'; ctx.fillRect(x, y + 1, Math.round(w * Math.min(1, tr.t / total)), 3);
}

// Thanh máu boss (màn hình, cạnh dưới): tên, máu, vạch pha 2
function drawBossBar(ctx, scene, camX, camY) {
  const m = scene.monsters.find(q => q.boss && !q.dead);
  if (!m) return;
  // boss hoặc người chơi đứng sát mép dưới -> thanh mờ đi để không che (M2-04, chơi thử)
  const sy = m.y - camY, sx = m.x - camX;
  ctx.globalAlpha = sy > H - 48 && sx > (W - 260) / 2 && sx < (W + 260) / 2 ? 0.35 : 1;
  const B = BOSS[m.bossKind], w = 220, x = Math.round((W - w) / 2), y = H - 20;
  ctx.fillStyle = 'rgba(10,6,20,.75)'; ctx.fillRect(x - 3, y - 11, w + 6, 19);
  ctx.font = '8px monospace'; ctx.textAlign = 'center';
  ctx.fillStyle = m.enraged ? '#ff6a6a' : '#f4e6ff'; ctx.fillText(B.name + (m.enraged ? ' · cuồng nộ' : m.vuln > 0 ? ' · sơ hở' : ''), W / 2, y - 3);
  ctx.fillStyle = '#2a1830'; ctx.fillRect(x, y, w, 5);
  ctx.fillStyle = m.bossKind === 'FINAL' ? '#c040ff' : '#e2584f'; ctx.fillRect(x, y, Math.max(0, Math.round(w * m.hp / m.max)), 5);
  if (B.PHASE2) { ctx.fillStyle = '#fff'; ctx.fillRect(x + Math.round(w * B.PHASE2), y - 1, 1, 7); }
  ctx.globalAlpha = 1;
}

function drawEnemyShots(ctx, shots, vis) {
  const dark = sharedFx(vis, 'hac_diem_dan');
  for (const s of shots) {
    const x = Math.round(s.x), y = Math.round(s.y);
    if (s.kind === 'dark' && dark) { dark.x = x; dark.y = y; dark.draw(ctx); continue; }
    if (s.kind === 'dark') {
      ctx.fillStyle = '#0c0614'; ctx.fillRect(x - 3, y - 3, 7, 7);
      ctx.fillStyle = '#c040ff'; ctx.fillRect(x - 2, y - 2, 5, 5);
      ctx.fillStyle = '#ffd0ff'; ctx.fillRect(x - 1, y - 1, 3, 3);
      continue;
    }
    ctx.fillStyle = '#1a1423'; ctx.fillRect(x - 3, y - 2, 6, 4); ctx.fillRect(x - 2, y - 3, 4, 6);
    ctx.fillStyle = '#7fdcec'; ctx.fillRect(x - 2, y - 1, 4, 2); ctx.fillRect(x - 1, y - 2, 2, 4);
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 1, 2, 2);
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
// M5-03: khiên Lôi Cương bằng VFX beanfx (2 lớp quanh thân). vis.quality 'low' hoặc chưa nạp -> vòng vẽ bằng code
function loiCuongFx(vis) {
  if (vis.quality === 'low' || !vis.FX.loi_cuong_back || !vis.FX.loi_cuong_front) return null;
  if (!vis.loiCuong) vis.loiCuong = { back: createFx(vis.FX.loi_cuong_back), front: createFx(vis.FX.loi_cuong_front) };
  return vis.loiCuong;
}
function drawSkillsUnder(ctx, run, p, time, vis, dt) {
  for (const s of run.skills) {
    if (s.evolved === 'loi_cuong_ho_the' && s.st.hp > 0) {
      const f = loiCuongFx(vis);
      if (f) { f.back.update(dt); f.front.update(dt); f.back.x = f.front.x = Math.round(p.x); f.back.y = f.front.y = Math.round(p.y); f.back.draw(ctx); }
    }
    const k = skillKind(s), prm = skillParams(s);
    const rf = k === 'ring' ? sharedFx(vis, 'hoa_luan') : null;
    if (rf) { rf.x = Math.round(p.x); rf.y = Math.round(p.y); rf.scale = prm.radius / 40; rf.draw(ctx); rf.scale = 1; }
    else if (k === 'ring') {
      ctx.globalCompositeOperation = 'lighter';
      pxRing(ctx, p.x, p.y - 2, prm.radius, 26, time * 2.5, '#ff8a3c', 2, 0.55);
      pxRing(ctx, p.x, p.y - 2, prm.radius - 3, 18, -time * 3, '#ffd06a', 1, 0.55);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}
function drawSkillsOver(ctx, run, p, time, vis) {
  for (const s of run.skills) {
    const k = skillKind(s), prm = skillParams(s), st = s.st;
    ctx.globalCompositeOperation = 'lighter';
    if (k === 'orbit' && st.ready > 0) {
      for (let i = 0; i < st.ready; i++) {
        const a = st.angle + i * 6.283 / st.ready, bx = p.x + Math.cos(a) * 18, by = p.y - 8 + Math.sin(a) * 12;
        const sw = sharedFx(vis, s.evolved ? 'liet_diem_kiem' : 'phi_kiem', rowFor(a + 1.5708, 16));   // mũi theo chiều xoay
        if (sw) { ctx.globalCompositeOperation = 'source-over'; sw.x = Math.round(bx); sw.y = Math.round(by); sw.draw(ctx); ctx.globalCompositeOperation = 'lighter'; continue; }
        pxLine(ctx, bx - Math.cos(a + 1.57) * 3, by - Math.sin(a + 1.57) * 3, bx + Math.cos(a + 1.57) * 3, by + Math.sin(a + 1.57) * 3, s.evolved ? '#ff9a3c' : '#bff4ff', 1);
        ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(bx), Math.round(by), 1, 1);
      }
    } else if (k === 'shield' && st.hp > 0 && s.evolved === 'loi_cuong_ho_the' && vis.loiCuong && vis.quality !== 'low') {
      ctx.globalCompositeOperation = 'source-over';
      vis.loiCuong.front.draw(ctx);
    } else if (k === 'shield' && st.hp > 0) {
      ctx.globalAlpha = 0.35 + 0.25 * (st.hp / (st.cap || 1));
      pxRing(ctx, p.x, p.y - 9, 13, 28, time, s.evolved ? '#d9c8ff' : '#ffd978', 1, 1.15);
      ctx.globalAlpha = 1;
    } else if (k === 'tornado' && st.pos && vis.pfxSkills) {
      ctx.globalCompositeOperation = 'source-over';
      const f = vis.pfxSkills.tornado;
      for (const [tx, ty] of st.pos) { f.x = Math.round(tx); f.y = Math.round(ty + 4); f.draw(ctx); }
    } else if (k === 'tornado' && st.pos) {
      for (const [tx, ty] of st.pos) for (let j = 0; j < 5; j++) pxRing(ctx, tx, ty - j * 6, prm.radius * (0.4 + j * 0.14), 10, time * 6 + j, j < 2 ? '#ff6a2a' : '#ffb070', 2, 0.45);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}

function drawProjectiles(ctx, scene, FX, dt, quality) {
  const rich = quality !== 'low';
  for (const q of scene.projectiles) {
    const x = Math.round(q.x), y = Math.round(q.y);
    if (q.kind === 'bolt') {
      if (!q.fxObj) q.fxObj = createFx(q.ice && quality !== 'low' && FX.bang_cham ? FX.bang_cham : FX.kiem_khi, { heading: q.heading });
      q.fxObj.update(dt); q.fxObj.x = x; q.fxObj.y = y; q.fxObj.draw(ctx);
      if (q.evo && q.evo.chains) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#d9c8ff'; ctx.fillRect(x - 1 + ((x * 7) % 3) - 1, y - 2, 1, 4); ctx.globalCompositeOperation = 'source-over'; }
    } else {
      ctx.globalCompositeOperation = 'lighter';
      if (q.kind === 'homing' && !(rich && FX.phi_kiem)) {   // hình code khi đồ họa Thấp / chưa nạp sheet
        const c = Math.cos(q.heading), s = Math.sin(q.heading);
        pxLine(ctx, x - c * 5, y - s * 5, x + c * 3, y + s * 3, q.color, 1);
        ctx.fillStyle = '#fff'; ctx.fillRect(x + Math.round(c * 3), y + Math.round(s * 3), 1, 1);
      } else if (q.kind === 'homing' && rich && FX.phi_kiem) {   // kiếm đuổi quái: đổi hàng khi đổi hướng
        ctx.globalCompositeOperation = 'source-over';
        const name = q.evo ? 'liet_diem_kiem' : 'phi_kiem', row = rowFor(q.heading || 0, 16);
        if (!q.fxObj || q.fxRow !== row) { q.fxObj = createFx(FX[name], { row }); q.fxRow = row; }
        q.fxObj.update(dt); q.fxObj.x = x; q.fxObj.y = y; q.fxObj.draw(ctx);
      } else if (q.kind === 'orb' && rich && FX.hoa_cau_bay) {   // M5-03: VFX beanfx, 8 hướng
        ctx.globalCompositeOperation = 'source-over';
        if (!q.fxObj) q.fxObj = createFx(FX.hoa_cau_bay, { heading: Math.atan2(q.vy, q.vx) });
        q.fxObj.update(dt); q.fxObj.x = x; q.fxObj.y = y; q.fxObj.draw(ctx);
      } else if (q.kind === 'blade' && rich && FX.phong_nhan) {
        ctx.globalCompositeOperation = 'source-over';
        if (!q.fxObj) q.fxObj = createFx(FX.phong_nhan, { heading: q.heading });
        q.fxObj.update(dt); q.fxObj.x = x; q.fxObj.y = y; q.fxObj.draw(ctx);
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
  vis.frameNo = (vis.frameNo || 0) + 1; vis.frameDt = g.dtWorld || 0;
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
    if (g.trib && g.trib.interactive) drawTribulation(ctx, g.trib, time, false);
  } else {
    // chiến ý (EXP) và vùng lửa nằm dưới mặt đất
    ctx.globalCompositeOperation = 'lighter';
    const zf = sharedFx(vis, 'liet_diem_vung');
    if (zf) ctx.globalCompositeOperation = 'source-over';
    for (const z of scene.zones) {
      ctx.globalAlpha = Math.min(1, z.t);
      if (zf) { zf.x = Math.round(z.x); zf.y = Math.round(z.y); zf.scale = z.r / 16; zf.draw(ctx); }
      else pxRing(ctx, z.x, z.y, z.r, 16, time * 3, '#ff6a2a', 2, 0.5);
    }
    if (zf) { zf.scale = 1; ctx.globalCompositeOperation = 'lighter'; }
    ctx.globalAlpha = 1;
    for (const o of scene.orbs) {
      const c = o.v >= 3 ? '#ffd978' : o.v >= 2 ? '#7fe3ff' : '#9cf2a0';
      ctx.fillStyle = c; ctx.fillRect(Math.round(o.x) - 1, Math.round(o.y + Math.sin(time * 5 + o.x) * 1) - 1, 3, 3);
    }
    ctx.globalCompositeOperation = 'source-over';
    if (g.run) drawSkillsUnder(ctx, g.run, p, time, vis, g.dtWorld || 0);
    drawTelegraphs(ctx, scene);
    if (g.run && g.run.shrine && !g.run.shrine.used) drawShrine(ctx, g.run, p, time);
  }

  for (const m of scene.monsters) objs.push({ y: m.y, m });
  objs.push({ y: p.y, player: true });
  if (scene.kind === 'hub' && FEATURES.run && g.portal && vis.pfx) objs.push({ y: g.portal.y, portal: true });
  objs.sort((a, b) => a.y - b.y);
  for (const o of objs) {
    if (o.img) {
      // M5-01: tán cây/đá che nhân vật thì mờ đi để luôn thấy người chơi và cảnh báo phía sau
      const hide = o.y > p.y && p.x > o.x - 2 && p.x < o.x + o.img.width + 2 && p.y - 16 < o.y && p.y > o.dy;
      if (hide) ctx.globalAlpha = 0.45;
      ctx.drawImage(o.img, o.x, o.dy);
      ctx.globalAlpha = 1;
    }
    else if (o.m) drawMonster(ctx, o.m, time);
    else if (o.portal) { const f = vis.pfx.portal; f.x = Math.round(g.portal.x); f.y = Math.round(g.portal.y); f.draw(ctx); }
    else drawPlayer(ctx, p, time, g.medFx, g.inForm);
  }

  if (g.run) drawSkillsOver(ctx, g.run, p, time, vis);
  if (scene.kind !== 'hub') drawTelegraphsTop(ctx, scene);
  else if (g.trib && g.trib.interactive) drawTribulation(ctx, g.trib, time, true);
  if (scene.enemyShots) drawEnemyShots(ctx, scene.enemyShots, vis);
  if (scene.projectiles) drawProjectiles(ctx, scene, vis.FX, g.dtWorld || 0, vis.quality);
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
  drawBossBar(ctx, scene, camX, camY);
  if (vis.banner) {
    const b = vis.banner; ctx.globalAlpha = Math.min(1, b.life * 2);
    ctx.font = '9px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(10,6,20,.6)'; ctx.fillRect(W / 2 - b.text.length * 3 - 6, 38, b.text.length * 6 + 12, 13);
    ctx.fillStyle = '#000'; ctx.fillText(b.text, W / 2 + 1, 48);
    ctx.fillStyle = b.color; ctx.fillText(b.text, W / 2, 47);
    ctx.globalAlpha = 1;
  }
  if (g.trib && g.trib.interactive) { ctx.fillStyle = 'rgba(20,10,50,.12)'; ctx.fillRect(0, 0, W, H); drawTribHud(ctx, g.trib); }
  else if (g.trib) { ctx.fillStyle = 'rgba(20,10,50,.35)'; ctx.fillRect(0, 0, W, H); }
  if (vis.flash > 0) { ctx.fillStyle = `rgba(230,220,255,${Math.min(0.7, vis.flash * 3)})`; ctx.fillRect(0, 0, W, H); }
}
