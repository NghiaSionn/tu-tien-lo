// Vẽ một khung: bản đồ, vật thể sắp theo y, yêu thú, người chơi, công pháp, hiệu ứng beanfx và hạt sáng.
import { VIEW, TILE as T, HUB, FEATURES, ARCH, BOSS, TRIBULATION, SHRINE, BASIC_ATTACK } from '../core/config.js';
import { GRASS, WATER, STONE, TREE, ROCK, BUILDING, FENCE, DIRT } from '../world/map.js';
import { SPR, TIERS, BOSS_WHITE, BOSS_SPR, grassTiles, waterTiles, waterBank, stoneTile, treeSprs, rockSpr, hash } from './sprites.js';
import { createFx } from '../../lib/beanfx.js';
import { skillKind, skillParams, spiritOrbPos, sealOrbPos } from '../systems/combat.js';

const { W, H } = VIEW;
// Chữ trên canvas (12/11, khung 640×360 làm chữ 8px quá nhỏ): đậm, viền tối 2 px để đọc rõ trên mọi nền
const FONT = '"Segoe UI", system-ui, sans-serif';
function txt(ctx, s, x, y, color, size = 10) {
  ctx.font = `bold ${size}px ${FONT}`; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(8,4,16,.9)'; ctx.strokeText(s, x, y);
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}
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
      case 'pulse': if (e.sprite && vis.thx && vis.thx[e.sprite]) { vis.rings.push({ x: e.x, y: e.y - 6, r: e.r * 0.45, to: e.r, life: 0.4, max: 0.4, spr: vis.thx[e.sprite] }); break; }
        if (room && e.fx && vis.FX[e.fx] && vis.quality !== 'low') { spawnFx(vis, e.fx, e.x, e.y, { scale: e.r / e.fxR }); break; }
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

// M5-01: chọn vật thể rừng theo ô (cố định theo toạ độ). Cây/đá chắn đường như cũ; cỏ hoa/sen chỉ trang trí, vẽ dưới nhân vật
const TREE_KINDS = [['tung1', 0.18], ['tung2', 0.36], ['la1', 0.56], ['la2', 0.76], ['tre', 0.86], ['dao1', 0.93], ['dao2', 1]];
const ROCK_KINDS = [['da1', 0.4], ['da2', 0.75], ['da_lon', 0.88], ['goc', 0.95], ['den', 1]];
const DECOR_KINDS = [['co', 0.35], ['duong_xi', 0.6], ['hoa', 0.8], ['soi', 0.93], ['nam', 1]];
const pick = (list, v) => list.find(([, p]) => v < p)[0];
// M5-04 (tối ưu): bản đồ tĩnh -> vẽ sẵn theo khối 16×16 ô (256 px): ô nền + bờ nước + trang trí vào canvas, 2 bản theo
// nhịp sóng nước; cây/đá của khối tính một lần. Mỗi khung chỉ còn vài drawImage thay vì ~1000 ô + quét hash từng ô.
const CH = 16, CPX = CH * T;
// M8-02: ô sân đất (Luyện Võ Trường) và cọc rào gỗ — vẽ bằng code (placeholder tới khi có art tông môn)
let _dirt = null, _fence = null;
function dirtTile() {
  if (_dirt || typeof document === 'undefined') return _dirt;
  const c = document.createElement('canvas'); c.width = c.height = T; const g = c.getContext('2d');
  g.fillStyle = '#b08a5a'; g.fillRect(0, 0, T, T);
  for (let i = 0; i < 18; i++) { const v = hash(i, 3, 11); g.fillStyle = v < 0.5 ? '#9a774a' : '#c49a66'; g.fillRect(Math.floor(hash(i, 1, 12) * T), Math.floor(hash(i, 2, 13) * T), 1 + (v > 0.8), 1); }
  return (_dirt = c);
}
function fenceSpr() {
  if (_fence || typeof document === 'undefined') return _fence;
  const c = document.createElement('canvas'); c.width = T; c.height = 20; const g = c.getContext('2d');
  g.fillStyle = '#3a2618'; g.fillRect(0, 8, 16, 3); g.fillRect(0, 13, 16, 3); g.fillRect(6, 2, 4, 18);
  g.fillStyle = '#8a5a34'; g.fillRect(0, 9, 16, 1); g.fillRect(0, 14, 16, 1); g.fillRect(7, 3, 2, 16);
  g.fillStyle = '#b07a48'; g.fillRect(7, 3, 1, 15);
  return (_fence = c);
}
function groundTile(t, tx, ty, map) {
  if (t === STONE || t === BUILDING) return stoneTile;
  if (t === DIRT) return dirtTile();
  return grassTiles[Math.floor(hash(tx, ty, 5) * grassTiles.length)];
}
function tileObj(map, tx, ty, props) {
  const t = map.tileAt(tx, ty), x = tx * T, y = ty * T;
  if (t === FENCE) {   // M8: mép bắc/nam rào là sprite hang_rao (map.sect.props); chỉ vẽ cọc rào cho mép đông/tây
    if (map.sect && (map.tileAt(tx - 1, ty) === FENCE || map.tileAt(tx + 1, ty) === FENCE)) return null;
    const f = fenceSpr(); return f ? { y: y + T, img: f, x, dy: y + T - f.height } : null;
  }
  if (props && t === TREE) { const img = props[pick(TREE_KINDS, hash(tx, ty, 6))]; return { y: y + T, img, x: x + 8 - img.ax, dy: y + T - 1 - img.ay }; }
  if (props && t === ROCK) { const img = props[pick(ROCK_KINDS, hash(tx, ty, 7))]; return { y: y + T - 2, img, x: x + 8 - img.ax, dy: y + T - 2 - img.ay }; }
  if (t === TREE) { const v = hash(tx, ty, 6); return { y: y + T, img: treeSprs[v < 0.12 ? 2 : v < 0.56 ? 0 : 1], x: x - 2, dy: y + T - 28 }; }
  if (t === ROCK) return { y: y + T - 2, img: rockSpr, x: x + 1, dy: y + 5 };
  return null;
}
function buildChunk(map, cx, cy, phase, props) {
  const c = document.createElement('canvas'); c.width = c.height = CPX;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.translate(-cx * CPX, -cy * CPX);
  const tx0 = cx * CH, ty0 = cy * CH;
  for (let ty = ty0; ty < ty0 + CH; ty++) for (let tx = tx0; tx < tx0 + CH; tx++) {
    const t = map.tileAt(tx, ty), x = tx * T, y = ty * T;
    if (t === WATER) { g.drawImage(waterTiles[(phase + tx + ty) & 1], x, y); if (map.tileAt(tx, ty - 1) !== WATER) g.drawImage(waterBank, x, y); }
    else g.drawImage(groundTile(t, tx, ty, map), x, y);
  }
  // trang trí: cả các ô ngay dưới/bên khối (hình cao ~36 px, rộng ~42 px lấn vào khối này)
  if (props) for (let ty = ty0; ty < ty0 + CH + 3; ty++) for (let tx = tx0 - 3; tx < tx0 + CH + 3; tx++) {
    const t = map.tileAt(tx, ty), d = hash(tx, ty, 8), x = tx * T, y = ty * T;
    let img = null;
    if (t === GRASS && d < 0.05) img = props[pick(DECOR_KINDS, d / 0.05)];
    else if (t === WATER && d < 0.05 && map.tileAt(tx, ty - 1) === WATER) img = props.sen;
    if (img) g.drawImage(img, x + 8 - img.ax, y + T - 1 - img.ay);
  }
  return c;
}
function drawMapCached(ctx, map, camX, camY, time, objs, vis) {
  const props = vis.props;
  if (!vis.mapCache || vis.mapCache.map !== map || vis.mapCache.props !== props) vis.mapCache = { map, props, img: new Map(), objs: new Map() };
  const mc = vis.mapCache, phase = Math.floor(time * 1.5) & 1;
  const ncx = Math.ceil(map.pw / CPX), ncy = Math.ceil(map.ph / CPX);
  const cx0 = Math.max(0, Math.floor(camX / CPX)), cx1 = Math.min(ncx - 1, Math.floor((camX + W - 1) / CPX));
  const cy0 = Math.max(0, Math.floor(camY / CPX)), cy1 = Math.min(ncy - 1, Math.floor((camY + H - 1) / CPX));
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
    const key = cx + ',' + cy + ',' + phase;
    let c = mc.img.get(key);
    if (!c) { c = buildChunk(map, cx, cy, phase, props); mc.img.set(key, c); }
    ctx.drawImage(c, cx * CPX, cy * CPX);
  }
  // cây/đá: khối có vật thể có thể lấn vào màn (cây ×2 cao ~72, rộng ~84 px)
  const ox0 = Math.max(0, Math.floor((camX - 48) / CPX)), ox1 = Math.min(ncx - 1, Math.floor((camX + W + 48) / CPX));
  const oy1 = Math.min(ncy - 1, Math.floor((camY + H + 80) / CPX));
  for (let cy = cy0; cy <= oy1; cy++) for (let cx = ox0; cx <= ox1; cx++) {
    const key = cx + ',' + cy;
    let list = mc.objs.get(key);
    if (!list) {
      list = [];
      for (let ty = cy * CH; ty < cy * CH + CH; ty++) for (let tx = cx * CH; tx < cx * CH + CH; tx++) { const o = tileObj(map, tx, ty, props); if (o) list.push(o); }
      mc.objs.set(key, list);
    }
    for (const o of list) if (o.x < camX + W && o.x + o.img.width > camX && o.dy < camY + H && o.y > camY) objs.push(o);
  }
}
function drawMap(ctx, map, camX, camY, time, objs, vis) {
  if (vis && vis.mapChunks !== false && typeof document !== 'undefined') return drawMapCached(ctx, map, camX, camY, time, objs, vis);
  const props = vis && vis.props, decor = [];
  const tx0 = Math.floor(camX / T), ty0 = Math.floor(camY / T), tx1 = tx0 + Math.ceil(W / T) + 1, ty1 = ty0 + Math.ceil(H / T) + 1;
  for (let ty = ty0; ty <= ty1 + 5; ty++) for (let tx = tx0 - 3; tx <= tx1 + 2; tx++) {   // cây ×2 cao ~72 px, rộng ~84 px: quét rộng hơn để không cụt
    const t = map.tileAt(tx, ty), x = tx * T, y = ty * T;
    if (ty <= ty1) {
      if (t === WATER) {
        ctx.drawImage(waterTiles[(Math.floor(time * 1.5) + tx + ty) & 1], x, y);
        if (map.tileAt(tx, ty - 1) !== WATER) ctx.drawImage(waterBank, x, y);
      } else ctx.drawImage(groundTile(t, tx, ty, map), x, y);
      if (props) {
        const d = hash(tx, ty, 8);
        if (t === GRASS && d < 0.05) decor.push([props[pick(DECOR_KINDS, d / 0.05)], x, y]);
        else if (t === WATER && d < 0.05 && map.tileAt(tx, ty - 1) === WATER) decor.push([props.sen, x, y]);
      }
    }
    if (props && t === TREE) {
      const img = props[pick(TREE_KINDS, hash(tx, ty, 6))];
      objs.push({ y: y + T, img, x: x + 8 - img.ax, dy: y + T - 1 - img.ay });
    } else if (props && t === ROCK) {
      const img = props[pick(ROCK_KINDS, hash(tx, ty, 7))];
      objs.push({ y: y + T - 2, img, x: x + 8 - img.ax, dy: y + T - 2 - img.ay });
    } else if (t === TREE) { const v = hash(tx, ty, 6); objs.push({ y: y + T, img: treeSprs[v < 0.12 ? 2 : v < 0.56 ? 0 : 1], x: x - 2, dy: y + T - 28 }); }
    else if (t === ROCK) objs.push({ y: y + T - 2, img: rockSpr, x: x + 1, dy: y + 5 });
    else if (t === FENCE) { const o = tileObj(map, tx, ty, props); if (o) objs.push(o); }
  }
  if (props) for (const [img, x, y] of decor) ctx.drawImage(img, x + 8 - img.ax, y + T - 1 - img.ay);
}

// M5-02: quái/boss từ sheet (quay mặt phải; lật khi đi sang trái). Chân (pivot) đặt đúng (m.x, m.y)
const SPECIES = ['lang', 'ho', 'bang', 'ma'];
function sheetFrame(ctx, sh, name, x, y, flip, src = sh.img, k = 1) {   // k: phóng nguyên lần (boss ×2)
  const m = sh.meta, f = m.frames[name], [fw, fh] = m.frameSize, [ax, ay] = m.pivot;
  if (!f) return;
  const px = Math.round(x), py = Math.round(y) - (ay + 1) * k + 1;
  if (flip) { ctx.save(); ctx.translate(px, 0); ctx.scale(-1, 1); ctx.drawImage(src, f[0], f[1], fw, fh, -(ax + 1) * k, py, fw * k, fh * k); ctx.restore(); }   // cột pivot ax vẫn rơi đúng px
  else ctx.drawImage(src, f[0], f[1], fw, fh, px - ax * k, py, fw * k, fh * k);
}
function mobState(m, time) {
  if (m.hit > 0) return 'hurt';
  if (m.st === 'windup') return 'atk';
  return 'walk' + ((m.vx || m.vy) ? Math.floor(time * 8 + (m.ph || 0) * 4) % 4 : 0);
}
function mobFlip(m) {
  const vx = m.st === 'windup' || m.st === 'dash' ? (m.dirX || m.vx) : m.vx;
  if (Math.abs(vx) > 0.5) m.faceL = vx < 0;   // chỉ để vẽ
  return !!m.faceL;
}
function drawMobSheet(ctx, sh, m, prefix, time, k = 1) {
  const name = prefix + '_' + mobState(m, time), flip = mobFlip(m);
  if (m.elite) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { ctx.globalAlpha = 0.8; sheetFrame(ctx, sh, name, m.x + dx, m.y + dy, flip, sh.glow); }
  ctx.globalAlpha = 1;
  sheetFrame(ctx, sh, name, m.x, m.y, flip, sh.img, k);
  if (m.hit > 0) { ctx.globalAlpha = 0.55; sheetFrame(ctx, sh, name, m.x, m.y, flip, sh.white, k); ctx.globalAlpha = 1; }
}

function drawBoss(ctx, m, time, vis) {
  const bs = vis && vis.bosses;
  if (bs) {
    const K = BOSS.DRAW_SCALE, top = Math.round(m.y) - 50 * K;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(Math.round(m.x) - 20 * K, Math.round(m.y) - 4, 40 * K, 7);
    if (m.st === 'windup') {   // gồng chiêu: viền trắng sáng quanh thân
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35;
      const name = m.bossKind + '_atk', flip = mobFlip(m);
      for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) sheetFrame(ctx, bs, name, m.x + dx, m.y + dy, flip, bs.white, K);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    drawMobSheet(ctx, bs, m, m.bossKind, time, K);
    if (m.vuln > 0) {   // sơ hở: 3 sao vàng xoay trên đầu
      ctx.fillStyle = '#ffe066';
      for (let i = 0; i < 3; i++) { const a = time * 5 + i * 2.094; ctx.fillRect(Math.round(m.x + Math.cos(a) * 14 * K) - 1, Math.round(top - 4 + Math.sin(a) * 3) - 1, 3, 3); }
    }
    return;
  }
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

function drawMonster(ctx, m, time, vis) {
  if (m.boss) return drawBoss(ctx, m, time, vis);
  const ms = vis && vis.mobs;
  if (ms) {
    const x = Math.round(m.x), y = Math.round(m.y), top = y - 26;
    ctx.fillStyle = m.elite ? 'rgba(60,20,90,.4)' : 'rgba(0,0,0,.25)'; ctx.fillRect(x - 9, y - 2, 18, 3);
    drawMobSheet(ctx, ms, m, SPECIES[m.tier] || 'lang', time);
    if (m.st === 'windup' && !m.elite) { ctx.fillStyle = '#ff4a3a'; ctx.fillRect(x - 1, top - 8, 2, 4); ctx.fillRect(x - 1, top - 3, 2, 1); }
    if (m.burn && m.burn.t > 0 && Math.floor(time * 10 + m.ph) % 3 === 0) { ctx.fillStyle = '#ffb070'; ctx.fillRect(x - 6 + Math.floor(m.ph * 3) % 12, top + 6, 1, 2); }
    if (m.slow && m.slow.t > 0) { ctx.fillStyle = '#b48cff'; ctx.fillRect(x - 8, y, 16, 1); }
    const thx = vis.thx;
    if (m.slow && m.slow.frozen && m.slow.t > 0) {   // M7-12: đóng băng — khối băng (sprite ChatGPT vẽ) phủ lên con quái
      const kb = thx && thx.khoi_bang;
      if (kb) { ctx.globalAlpha = 0.85; ctx.drawImage(kb, x - (kb.width >> 1), y + 1 - kb.height); ctx.globalAlpha = 1; }
      else { ctx.globalAlpha = 0.45; ctx.fillStyle = '#bfe8ff'; ctx.fillRect(x - 8, top + 6, 16, y - top - 6); ctx.globalAlpha = 1; }
    } else if (m.frost > 0 && (vis.runTime ?? 0) - (m.frostAt ?? -99) < 4 && thx && thx.han_an) {   // hàn ấn đang tích (1–2)
      const ha = thx.han_an;
      for (let i = 0; i < m.frost; i++) ctx.drawImage(ha, x - (m.frost * (ha.width + 1)) / 2 + i * (ha.width + 1), top - ha.height - 1);
    }
    if (m.elite || m.hp < m.max) {
      const w = m.elite ? 26 : 14;
      ctx.fillStyle = '#1a1423'; ctx.fillRect(x - w / 2 - 1, top - 1, w + 2, 3);
      ctx.fillStyle = m.elite ? '#c070ff' : '#e2584f'; ctx.fillRect(x - w / 2, top, Math.max(1, Math.round(w * m.hp / m.max)), 1);
    }
    return;
  }
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
    else if (m.boss && m.pat === 'howlDash') {   // M7-13: hú rồi lao — viền lớp trên để thân boss ×2 / tán cây không che
      const prog = 1 - Math.max(0, m.stT) / (m.stMax || 1);
      const ry = 16 + prog * 30;
      ctx.globalAlpha = 0.85; pxRing(ctx, m.x, m.y - 10, ry, Math.round(ry * 6), 0, '#ffd978', 1, 1);
      ctx.globalAlpha = 0.85; pxRing(ctx, m.x, m.y - 10, 52, 320, 0, '#ff4a3a', 1, 1);
    }
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
  } else if (m.pat === 'howl' || m.pat === 'howlDash') {
    ctx.globalAlpha = 0.8; pxRing(ctx, m.x, m.y - 10, 16 + prog * 30, 36, 0, '#ffd978', 2, 1);
    if (m.pat === 'howlDash') { ctx.globalAlpha = 0.9; pxRing(ctx, m.x, m.y - 10, 50, 36, 0, '#ff4a3a', 1, 1); }   // vòng đỏ ngoài: sắp lao
  } else if (m.pat === 'burst' || m.pat === 'prison') {
    // từng hướng đạn sẽ bay: đứng giữa hai tia là né được
    for (let i = 0; i < m.burstN; i++) {
      const a = m.burstA0 + i * 6.283 / m.burstN, c = Math.cos(a), s = Math.sin(a), y0 = m.y - 10;
      ctx.globalAlpha = 0.65; pxLine(ctx, m.x + c * 16, y0 + s * 16, m.x + c * 70, y0 + s * 70, '#d070ff', 1);
      ctx.globalAlpha = 0.95; pxLine(ctx, m.x + c * 16, y0 + s * 16, m.x + c * (16 + 54 * prog), y0 + s * (16 + 54 * prog), '#f4d8ff', 1);
    }
  }
  ctx.globalAlpha = 1;
}

// M7-14: Bia Truyền Thừa ở động phủ (ChatGPT vẽ). Có đoạn chưa đọc -> bản phù văn sáng + nhấp nháy nhẹ; đứng gần -> chữ E
function drawBia(ctx, b, vis, time) {
  const spr = (b.lit && vis.ct.bia_sang) || vis.ct.bia, x = Math.round(b.x), y = Math.round(b.y);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x - 15, y - 2, 30, 4);
  ctx.drawImage(spr, x - (spr.width >> 1), y + 2 - spr.height);
  if (b.lit && Math.floor(time * 2) % 2 === 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25; ctx.drawImage(spr, x - (spr.width >> 1), y + 2 - spr.height); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  if (b.near) txt(ctx, 'E · đọc bia', x, y - spr.height - 4, '#ffd978');
}

// M8-02: công trình tông môn — PLACEHOLDER (khối tường + mái + cửa + tên) tới khi có art vẽ theo concept ảnh 2.
// Nền (b.px, b.py, b.pw, b.ph) là vùng đặc; mái nhô lên trên nền thêm `tall` ô (góc nhìn 3/4).
function drawSectBuilding(ctx, b) {
  const x = b.px, w = b.pw, base = b.py + b.ph, wallH = Math.round(b.ph * 0.55), roofTop = b.py - Math.round((b.tall || 1.5) * T);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + 2, base - 2, w, 4);
  ctx.fillStyle = b.color; ctx.fillRect(x, base - wallH, w, wallH);
  ctx.fillStyle = 'rgba(255,220,150,.18)'; for (let i = 6; i < w - 6; i += 14) ctx.fillRect(x + i, base - wallH + 4, 8, wallH - 8);
  ctx.fillStyle = '#1a1210'; const dx = Math.round(b.doorPx.x - 6); ctx.fillRect(dx, base - Math.min(14, wallH - 2), 12, Math.min(14, wallH - 2));
  ctx.fillStyle = b.roof; ctx.fillRect(x - 4, roofTop, w + 8, base - wallH - roofTop);
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x - 4, roofTop, w + 8, 3);
  ctx.fillStyle = '#0d0b14'; ctx.fillRect(x - 4, base - wallH - 2, w + 8, 2);
  txt(ctx, b.name, Math.round(x + w / 2), roofTop - 3, '#ffd978');
}

// M8: âm dương giữa tụ linh trận sảnh tông môn — vẽ từng điểm ảnh (giữ chất pixel), elip theo góc nhìn 3/4 (khớp hình trận tm_tran:
// tâm cách đỉnh hình trận cy px, bán trục rx×ry), quay theo chiều kim đồng hồ ~1 vòng/14 s; 72 khung xoay dựng sẵn khi cần
const TAIJI = { rx: 25, ry: 14, cy: 55, period: 14, steps: 240 };
const _taiji = new Map();
function taijiFrame(turn, lit) {   // turn: 0..1 vòng
  const k = Math.floor(turn * TAIJI.steps) % TAIJI.steps, key = k + (lit ? 'L' : '');
  let c = _taiji.get(key); if (c) return c;
  const { rx, ry } = TAIJI, W = rx * 2 + 1, H = ry * 2 + 1;
  c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), id = g.createImageData(W, H), d = id.data;
  const a = k / TAIJI.steps * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
  const LIGHT = lit ? [168, 226, 214] : [140, 204, 192], DARK = [12, 66, 72], RIM = lit ? [96, 206, 188] : [56, 150, 142], BACK = [8, 48, 56];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const u0 = (i - rx) / rx, v0 = (j - ry) / ry, r2 = u0 * u0 + v0 * v0;
    let col = null;
    if (r2 <= 1.0) {
      if (r2 > 0.8) col = RIM;
      else {
        const u = (u0 * ca + v0 * sa) / 0.89, v = (-u0 * sa + v0 * ca) / 0.89;   // quay ngược toạ độ = hình quay thuận chiều kim đồng hồ
        const dUp = Math.hypot(u, v + 0.5), dDn = Math.hypot(u, v - 0.5);
        let light = u > 0;
        if (dUp < 0.5) light = true; if (dDn < 0.5) light = false;
        if (dUp < 0.16) light = false; if (dDn < 0.16) light = true;
        col = light ? LIGHT : DARK;
      }
    } else if (r2 <= 1.35) col = BACK;   // nền tối che âm dương vẽ sẵn trong hình trận
    if (!col) continue;
    const o = (j * W + i) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
  }
  g.putImageData(id, 0, 0); _taiji.set(key, c); return c;
}
// M8: linh khí bay lên quanh tụ linh trận khi tọa thiền trong trận (sảnh tông môn)
function updateQiParts(vis, map, on, dt) {
  const P = vis.qiParts || (vis.qiParts = []);
  if (on) for (let n = dt * 46 + Math.random(); n >= 1; n--) {
    const a = Math.random() * Math.PI * 2, r = 0.5 + Math.random() * 0.55;
    P.push({ x: map.cx + Math.cos(a) * 92 * r, y: map.cy + Math.sin(a) * 50 * r, vy: -(18 + Math.random() * 26), sw: Math.random() * 6, life: 0, max: 1.4 + Math.random() * 1.4, big: Math.random() < 0.4 });
  }
  for (const q of P) { q.life += dt; q.y += q.vy * dt; q.x += Math.sin(q.life * 3 + q.sw) * 8 * dt; }
  vis.qiParts = P.filter(q => q.life < q.max);
}
function drawQiParts(ctx, vis) {
  // vẽ đè thường (không cộng sáng): trên nền đá sáng, cộng sáng gần như không thấy
  if (!vis.qiParts || !vis.qiParts.length) return;
  for (const q of vis.qiParts) {
    const f = q.life / q.max, a = Math.min(1, f * 5) * (1 - f) ** 0.7, x = Math.round(q.x), y = Math.round(q.y);
    if (q.big) {   // đốm linh khí: viền xanh đậm + lõi trắng ngọc + vệt đuôi
      ctx.globalAlpha = a * 0.55; ctx.fillStyle = '#1aa898'; ctx.fillRect(x, y + 2, 1, 5); ctx.fillRect(x - 2, y - 1, 5, 3); ctx.fillRect(x - 1, y - 2, 3, 5);
      ctx.globalAlpha = a; ctx.fillStyle = '#46f0d6'; ctx.fillRect(x - 1, y - 1, 3, 3);
      ctx.fillStyle = '#f0fffb'; ctx.fillRect(x, y, 1, 1);
    } else { ctx.globalAlpha = a; ctx.fillStyle = '#3ee6cc'; ctx.fillRect(x, y, 2, 2); ctx.fillStyle = '#dafff6'; ctx.fillRect(x, y, 1, 1); }
  }
  ctx.globalAlpha = 1;
}

// Linh Mạch (M3-04): cột linh quang; mờ + vòng đỏ khi bị phong ấn (boss sống); chữ "E" khi đứng gần
function drawShrine(ctx, run, p, time, vis) {
  const s = run.shrine, sealed = run.scene.monsters.some(m => m.boss && !m.dead);
  const x = Math.round(s.x), y = Math.round(s.y);
  const spr = vis && vis.ct && vis.ct[sealed ? 'linh_mach_phong' : 'linh_mach'];   // cụm linh thạch; phong ấn: xích + bùa
  if (spr) ctx.drawImage(spr, x - Math.round(spr.width / 2), y + 4 - spr.height);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = sealed ? 0.35 : 0.9;
  pxRing(ctx, x, y, SHRINE.R, 30, time, sealed ? '#ff6a6a' : '#7fe3ff', 1, 0.6);
  const np = spr ? (sealed ? 0 : 7) : 18;   // có sprite: chỉ vài hạt linh khí bay lên từ đỉnh tinh thể
  for (let i = 0; i < np; i++) { ctx.fillStyle = i % 3 ? '#7fe3ff' : '#e8fbff'; const k = spr ? ((time * 0.6 + i / np) % 1) : 0; ctx.fillRect(x - 1 + Math.round(Math.sin(time * 4 + i) * (spr ? 6 : 1.5)), spr ? Math.round(y - 30 - k * 26) : y - 2 - i * 2 - ((time * 20) % 2), spr ? 1 : 2, spr ? 1 : 2); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  if (Math.hypot(p.x - s.x, p.y - s.y) < SHRINE.R + 6) {
    txt(ctx, sealed ? 'phong ấn' : 'E: Linh Mạch', x, y - 46, sealed ? '#ff8f8a' : '#e8fbff', 10);
  }
}

// Thiên kiếp tương tác (M3-03): trận thử thách + cảnh báo đúng hình học vùng trúng; lấp dần = sắp đánh
function drawTribulation(ctx, tr, time, top) {
  if (!top) { ctx.globalAlpha = 0.7; pxRing(ctx, tr.cx, tr.cy, tr.R || TRIBULATION.ARENA_R, 90, time * 0.3, '#9a7bff', 2, 1); }
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
  ctx.fillStyle = 'rgba(10,6,20,.7)'; ctx.fillRect(x - 3, y - 14, w + 6, 21);
  const ph = TRIBULATION.PHASES[Math.min(tr.phase, TRIBULATION.PHASES.length - 1)];
  txt(ctx, `Thiên kiếp · ${ph.name} (${Math.min(tr.phase + 1, TRIBULATION.PHASES.length)}/${TRIBULATION.PHASES.length})`, W / 2, y - 3, '#e6dcff', 10);
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
  ctx.fillStyle = 'rgba(10,6,20,.75)'; ctx.fillRect(x - 3, y - 15, w + 6, 23);
  txt(ctx, B.name + (m.enraged ? ' · cuồng nộ' : m.vuln > 0 ? ' · sơ hở' : ''), W / 2, y - 4, m.enraged ? '#ff6a6a' : '#f4e6ff', 11);
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

// M5-02: một khung của sheet nhân vật (ChatGPT vẽ, tools/sprite_clean.py làm sạch); hàng pivot (chân) đặt ở fy - 1
function heroFrame(ctx, hero, name, px, fy, flip = false, src = hero.img) {
  const m = hero.meta, [sx, sy] = m.frames[name] || m.frames.down_walk0, [fw, fh] = m.frameSize, [ax, ay] = m.pivot;
  const x = Math.round(px), y = fy - 1 - ay;
  if (flip) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(src, sx, sy, fw, fh, -ax, y, fw, fh); ctx.restore(); }
  else ctx.drawImage(src, sx, sy, fw, fh, x - ax, y, fw, fh);
}

function drawPlayer(ctx, p, time, medFx, inForm, vis, float = false) {
  const hero = vis && vis.hero;
  if (hero && p.hurtT > 0) p.hurtT -= vis.frameDt || 0;   // chỉ dùng để vẽ
  if (p.inv > 0 && Math.floor(time * 20) % 2) return;
  const x = Math.round(p.x - 6), sy0 = Math.round(p.y), fy = Math.round(p.y) + Math.round(p.bob || 0);   // bob: nhún khi đi trên bậc (M8)
  ctx.fillStyle = 'rgba(0,0,0,.25)'; if (hero) ctx.fillRect(x - 3, sy0 - 2, 18, 3); else ctx.fillRect(x + 1, sy0 - 1, 10, 2);
  if (p.med) {
    // M8: thiền giữa tụ linh trận sảnh tông môn -> bay lơ lửng (nâng lên dần, rồi lên xuống nhẹ); bóng giữ ở đất
    // nâng lên theo đường cong êm (smoothstep ~1,2 s), rồi lơ lửng theo sóng sin chậm (chu kỳ ~3,4 s, biên 2 px) tính trực tiếp từ đồng hồ
    // (không đuổi theo mục tiêu -> không giật); nhân vật vẽ ở toạ độ lẻ có nội suy nên trôi mượt, không khựng theo nấc 1 px
    const dtv = vis && vis.frameDt || 0.016;
    p.liftK = Math.max(0, Math.min(1, (p.liftK || 0) + (float ? dtv : -dtv * 1.5) / 1.2));
    const ease = p.liftK * p.liftK * (3 - 2 * p.liftK);
    p.lift = ease * (8 + Math.sin(time * 1.85) * 2);
    const fl = Math.round(p.lift), fy2 = fy - fl;
    if (fl) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(Math.round(p.x) - 6, sy0 - 2, 12, 3); }
    medFx.x = Math.round(p.x); medFx.y = fy2; medFx.lightGain = fl ? 0.12 : inForm ? 1 : 0.6; medFx.draw(ctx);   // bay giữa trận: hào quang dịu lại để thấy âm dương xoay
    const bob = Math.round(Math.sin(time * 2) * 1.5 + 1.5);
    if (hero && p.lift > 0.05) {   // đang bay: vẽ ở toạ độ lẻ trên lớp nét cao -> trôi liên tục, không nhảy nấc 1 px, không nhoè
      vis.hiDraw = { name: 'sit1', x: p.x, y: fy - p.lift };   // vẽ ở lớp nét cao (main.js #hi): trôi mượt mà không nhoè
    } else if (hero) heroFrame(ctx, hero, Math.sin(time * 2) > 0 ? 'sit1' : 'sit0', p.x, fy2);   // thở: 2 khung
    else ctx.drawImage(SPR.sit, x, fy2 - 14 - bob);
    return;
  }
  p.lift = 0; p.liftK = 0;
  if (hero) {
    const st = p.hurtT > 0 ? 'hurt' : p.cd > BASIC_ATTACK.CD - 0.12 ? 'atk' : 'walk' + (p.moving ? Math.floor(p.anim) % 4 : 0);
    const dir = p.face === 'side' ? (p.flip ? 'left' : 'right') : p.face;   // trái/phải là khung riêng, không lật
    heroFrame(ctx, hero, dir + '_' + st, p.x, fy);
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
    if (skillKind(s) === 'orbit' && s.st.ready > 0) { ctx.globalCompositeOperation = 'lighter'; drawOrbit(ctx, s, s.st, p, vis, true); ctx.globalCompositeOperation = 'source-over'; }
    if (skillKind(s) === 'spirit' || skillKind(s) === 'spiritSeal') drawSpiritOrbs(ctx, s, p, vis, true);
    if (skillKind(s) === 'spiritSeal') drawSeals(ctx, s, vis);
    if (skillKind(s) === 'step') drawAfterimages(ctx, s, vis);
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
// Linh Châu: viên châu hồng trắng sáng; nửa sau vòng (sin < 0) vẽ dưới nhân vật, nửa trước vẽ trên (như kiếm xoay)
function drawSpiritOrbs(ctx, s, p, vis, back) {
  const prm = skillParams(s), st = s.st, n = prm.orbs, r = prm.radius;
  if (st.angle == null) return;
  const spr = vis.ct && vis.ct.linh_chau;
  for (let i = 0; i < n; i++) {
    const [x, y, a] = spiritOrbPos(p, st.angle, i, n, r);
    if ((Math.sin(a) < 0) !== back) continue;
    const bx = Math.round(x), by = Math.round(y);
    if (spr) { ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(spr, bx - (spr.width >> 1), by - (spr.height >> 1)); }
    else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#7a3a6a'; ctx.fillRect(bx - 3, by - 2, 6, 4); ctx.fillRect(bx - 2, by - 3, 4, 6);
      ctx.fillStyle = '#f3a6c8'; ctx.fillRect(bx - 2, by - 2, 4, 4);
      ctx.fillStyle = '#fff4fa'; ctx.fillRect(bx - 1, by - 2, 2, 2);
    }
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#f3a6c8'; ctx.fillRect(bx - 4, by - 1, 8, 2); ctx.fillRect(bx - 1, by - 4, 2, 8);
    ctx.globalAlpha = 1;
  }
  ctx.globalCompositeOperation = 'source-over';
}
// M7-12 Linh Châu Phong Ấn: vòng ấn mờ dần + cặp châu xoay tại chỗ (dùng lại sprite linh châu)
function drawSeals(ctx, s, vis) {
  const ans = s.st.anchors, prm = skillParams(s);
  if (!ans || !ans.length) return;
  const spr = vis.ct && vis.ct.linh_chau, r = prm.anchorR;
  for (const an of ans) {
    const k = Math.min(1, an.t / 0.6);
    const vr = vis.thx && vis.thx.vong_phong_an;
    if (vr) {   // vòng phù văn (sprite ChatGPT vẽ) dưới chân, mờ dần khi sắp tan
      const w = Math.round((r + 6) * 2), h = Math.round(vr.height * w / vr.width);
      ctx.globalAlpha = 0.8 * k; ctx.drawImage(vr, Math.round(an.x - w / 2), Math.round(an.y - 2 - h / 2), w, h);
    } else {
      ctx.globalAlpha = 0.35 * k; ctx.globalCompositeOperation = 'lighter';
      pxRing(ctx, an.x, an.y - 2, r + 4, 16, -an.a * 0.5, '#f3a6c8', 1, 0.55);
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = k;
    for (let i = 0; i < prm.anchorOrbs; i++) {
      const [x, y] = sealOrbPos(an, i, prm.anchorOrbs, r), bx = Math.round(x), by = Math.round(y);
      if (spr) ctx.drawImage(spr, bx - (spr.width >> 1), by - (spr.height >> 1));
      else { ctx.fillStyle = '#f3a6c8'; ctx.fillRect(bx - 2, by - 2, 4, 4); ctx.fillStyle = '#fff4fa'; ctx.fillRect(bx - 1, by - 2, 2, 2); }
    }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
// Phong Ảnh Bộ: tàn ảnh = bóng nhân vật tô xanh ngọc, mờ dần tới lúc nổ
function drawAfterimages(ctx, s, vis) {
  const hero = vis.hero, ims = s.st.images;
  if (!ims || !ims.length) return;
  for (const im of ims) {
    const k = Math.max(0, im.t / im.max);
    ctx.globalAlpha = 0.25 + 0.4 * k;
    if (hero) {
      const dir = im.face === 'side' ? (im.flip ? 'left' : 'right') : (im.face || 'down');
      heroFrame(ctx, hero, dir + '_walk1', im.x, Math.round(im.y), false, hero.wind);
    } else { ctx.fillStyle = '#7ff0c8'; ctx.fillRect(Math.round(im.x) - 5, Math.round(im.y) - 16, 10, 16); }
    ctx.globalAlpha = 0.5 * (1 - k); ctx.globalCompositeOperation = 'lighter';
    pxRing(ctx, im.x, im.y - 8, 6 + 18 * (1 - k), 14, im.t * 9, '#7ff0c8', 1, 0.55);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.globalAlpha = 1;
}

// Kiếm xoay quanh thân (Phi Kiếm/Liệt Diễm): nửa vòng phía sau (sin < 0, cao hơn chân) vẽ ở lớp dưới để nhân vật che,
// nửa phía trước vẽ ở lớp trên. back = true: chỉ vẽ kiếm phía sau
function drawOrbit(ctx, s, st, p, vis, back) {
  for (let i = 0; i < st.ready; i++) {
    const a = st.angle + i * 6.283 / st.ready;
    if ((Math.sin(a) < 0) !== back) continue;
    const bx = p.x + Math.cos(a) * 18, by = p.y - 8 + Math.sin(a) * 12;
    const sw = sharedFx(vis, s.evolved ? 'liet_diem_kiem' : 'phi_kiem', rowFor(a + 1.5708, 16));   // mũi theo chiều xoay
    if (sw) { ctx.globalCompositeOperation = 'source-over'; sw.x = Math.round(bx); sw.y = Math.round(by); sw.draw(ctx); ctx.globalCompositeOperation = 'lighter'; continue; }
    pxLine(ctx, bx - Math.cos(a + 1.57) * 3, by - Math.sin(a + 1.57) * 3, bx + Math.cos(a + 1.57) * 3, by + Math.sin(a + 1.57) * 3, s.evolved ? '#ff9a3c' : '#bff4ff', 1);
    ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(bx), Math.round(by), 1, 1);
  }
}
function drawSkillsOver(ctx, run, p, time, vis) {
  for (const s of run.skills) {
    const k = skillKind(s), prm = skillParams(s), st = s.st;
    ctx.globalCompositeOperation = 'lighter';
    if (k === 'orbit' && st.ready > 0) drawOrbit(ctx, s, st, p, vis, false);
    else if (k === 'spirit' || k === 'spiritSeal') drawSpiritOrbs(ctx, s, p, vis, false);
    else if (k === 'shield' && st.hp > 0 && s.evolved === 'loi_cuong_ho_the' && vis.loiCuong && vis.quality !== 'low') {
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
  vis.runTime = g.run ? g.run.time : 0;   // M7-12: hàn ấn hết hạn theo thời gian trận
  vis.frameNo = (vis.frameNo || 0) + 1; vis.frameDt = g.dtWorld || 0;
  // đo thời gian từng phần (chỉ khi bật vis.prof = {} từ console/công cụ đo; mặc định tắt)
  const PR = vis.prof; let pt = PR ? performance.now() : 0;
  const mark = k => { if (!PR) return; const t = performance.now(); PR[k] = (PR[k] || 0) + t - pt; pt = t; };
  if (PR) PR.frames = (PR.frames || 0) + 1;
  let camX = Math.round(Math.max(0, Math.min(map.pw - W, p.x - W / 2)));
  let camY = Math.round(Math.max(0, Math.min(map.ph - H, p.y - 8 - H / 2)));
  if (vis.shake > 0) { camX += Math.round(rand(-2, 2)); camY += Math.round(rand(-2, 2)); }
  ctx.setTransform(1, 0, 0, 1, -camX, -camY); vis.cam = { x: camX, y: camY };

  const objs = [];
  drawMap(ctx, map, camX, camY, time, objs, vis);
  mark('map');

  if (scene.kind === 'hub') {
    const ct = vis.ct;
    if (g.sect && vis.plaza) ctx.drawImage(vis.plaza.base, Math.round(map.cx - vis.plaza.ax), Math.round(map.cy - vis.plaza.ay));   // M8: bệ pháp đài
    const TR = g.sect && vis.tm && vis.tm.tran ? vis.tm : ct;   // M8: sảnh tông môn dùng tụ linh trận vẽ theo concept ảnh 1 (sprites/tm_tran)
    if (TR === vis.tm && TR.tran) {   // M8: trận đứng yên một chỗ; tọa thiền trong trận thì các đường khắc sáng lên (không nhấp nháy)
      const t = TR.tran, x = Math.round(map.cx - t.width / 2), y = Math.round(map.cy - t.height / 2);
      const on = p.med && g.inForm;
      ctx.drawImage(t, x, y);
      if (on && TR.tranGlow) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(TR.tranGlow, x, y); ctx.globalCompositeOperation = 'source-over'; }
      // âm dương: chỉ xoay khi đang tọa thiền trong trận (chậm, theo chiều kim đồng hồ); không thiền -> đứng yên.
      // Góc giữ lại giữa các lần thiền; vào/ra thiền tăng/giảm tốc dần
      vis.taijiW = (vis.taijiW || 0) + ((on ? 1 : 0) - (vis.taijiW || 0)) * Math.min(1, (g.dtWorld || 0) * 2);
      vis.taijiA = ((vis.taijiA || 0) + vis.taijiW * (g.dtWorld || 0) / TAIJI.period) % 1;
      const tj = taijiFrame(vis.taijiA, on); ctx.drawImage(tj, Math.round(map.cx - tj.width / 2), y + TAIJI.cy - (tj.height >> 1));   // không thiền: đứng yên ở góc đang có (không nhảy hình)
    } else if (TR && TR.tran) {   // tụ linh trận (ChatGPT vẽ): thiền trong trận thì sáng rực, bình thường nhịp sáng nhẹ
      const t = TR.tran, s = TR.tran_sang, on = p.med && g.inForm;
      ctx.drawImage(t, Math.round(map.cx - t.width / 2), Math.round(map.cy - t.height / 2));
      if (s) { ctx.globalAlpha = on ? 0.75 + 0.25 * Math.sin(time * 3) : 0.18 + 0.12 * Math.sin(time * 1.5); ctx.drawImage(s, Math.round(map.cx - s.width / 2), Math.round(map.cy - s.height / 2)); ctx.globalAlpha = 1; }
    } else {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = p.med && g.inForm ? 1 : 0.55;
    pxRing(ctx, map.cx, map.cy, HUB.FORM_R, 28, time * 0.5, '#3fb8d8', 2);
    pxRing(ctx, map.cx, map.cy, HUB.FORM_R * 0.62, 16, -time * 0.8, '#7fe3ff', 2);
    pxRing(ctx, map.cx, map.cy, HUB.FORM_R * 0.28, 8, time * 1.2, '#ffe08a', 2);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    if (g.sect && vis.tm) for (const o of g.sect.props) {   // M8: bậc thang sát đất, dưới nhân vật
      const img = o.flat && vis.tm[o.s]; if (!img) continue;
      const x = Math.round(o.x - img.width / 2), y = Math.round(o.y - img.height);
      if (x < camX + W && x + img.width > camX && y < camY + H && o.y > camY) ctx.drawImage(img, x, y);
    }
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
    if (g.run && g.run.shrine && !g.run.shrine.used) drawShrine(ctx, g.run, p, time, vis);
  }

  mark('ground');
  for (const m of scene.monsters) objs.push({ y: m.y, m });
  objs.push({ y: p.y, player: true });
  if (scene.kind === 'hub' && FEATURES.run && g.portal && vis.pfx) objs.push({ y: g.portal.y, portal: true });
  if (scene.kind === 'hub' && g.bia && vis.ct && vis.ct.bia) objs.push({ y: g.bia.y, bia: true });
  if (scene.kind === 'hub' && g.sect) {   // M8: công trình + đồ vật + cây tông môn (sprite tm_*, xếp theo chân); thiếu sprite -> khối tạm
    const vis1 = (img, fx, fy) => fx - img.width / 2 < camX + W && fx + img.width / 2 > camX && fy - img.height < camY + H && fy > camY - 4;
    for (const b of g.sect.buildings) {
      const img = vis.tm && vis.tm[b.id];
      if (!img) { objs.push({ y: b.py + b.ph, sectB: b }); continue; }
      const f = b.footPx;
      if (vis1(img, f.x, f.y)) objs.push({ y: f.y, img, x: Math.round(f.x - img.width / 2), dy: Math.round(f.y - img.height), label: b.name, door: b.doorPx });
    }
    if (vis.plaza) {   // lớp trước của bệ: từng nhóm điểm ảnh xếp theo chân cột đục của nó (xem main.js)
      const x = Math.round(map.cx - vis.plaza.ax), y0 = Math.round(map.cy - vis.plaza.ay);
      for (const s of vis.plaza.strips) { const dy = y0 + s.y; if (dy < camY + H && dy + s.img.height > camY) objs.push({ y: y0 + s.foot, img: s.img, x: x + s.x, dy, noFade: true }); }
    }
    if (vis.tm) for (const o of g.sect.props) {
      const img = !o.flat && vis.tm[o.s];
      if (img && vis1(img, o.x, o.y)) objs.push({ y: o.y, img, x: Math.round(o.x - img.width / 2), dy: Math.round(o.y - img.height) });
    }
  }
  objs.sort((a, b) => a.y - b.y);
  for (const o of objs) {
    if (o.img) {
      // M5-01: tán cây/đá che nhân vật thì mờ đi để luôn thấy người chơi và cảnh báo phía sau
      const covers = (ux, uy) => o.y > uy && ux > o.x - 2 && ux < o.x + o.img.width + 2 && uy - 16 < o.y && uy > o.dy;
      // cây ×2 tán lớn: cũng mờ khi có quái đứng sau (không để quái/đòn đánh khuất sau tán)
      const hide = covers(p.x, p.y) || (o.img.width > 60 && scene.monsters.some(m => !m.dead && covers(m.x, m.y)));
      if (hide && !o.noFade) ctx.globalAlpha = 0.45;
      ctx.drawImage(o.img, o.x, o.dy);
      ctx.globalAlpha = 1;
      if (o.label && Math.hypot(p.x - o.door.x, p.y - o.door.y) < 96) txt(ctx, o.label, Math.round(o.x + o.img.width / 2), o.dy - 3, '#ffd978');
    }
    else if (o.m) drawMonster(ctx, o.m, time, vis);
    else if (o.portal) {
      // cổng trăng đá (ChatGPT vẽ): vòng xoáy pixelfx thu nhỏ vẽ TRƯỚC, cổng đè lên -> xoáy chỉ lộ qua lòng cổng trống
      const gate = vis.ct && vis.ct.cong, f = vis.pfx.portal;
      f.x = Math.round(g.portal.x); f.y = Math.round(g.portal.y) + (gate ? 2 : 0); f.scale = gate ? 0.66 : 1; f.draw(ctx); f.scale = 1;
      if (gate) ctx.drawImage(gate, Math.round(g.portal.x - gate.width / 2), Math.round(g.portal.y + 6 - gate.height));
    }
    else if (o.bia) drawBia(ctx, g.bia, vis, time);
    else if (o.sectB) drawSectBuilding(ctx, o.sectB);
    else drawPlayer(ctx, p, time, g.medFx, g.inForm, vis, !!(g.sect && p.med && g.inForm && vis.tm && vis.tm.tran));
  }

  mark('objects');
  if (g.run) drawSkillsOver(ctx, g.run, p, time, vis);
  if (scene.kind !== 'hub') drawTelegraphsTop(ctx, scene);
  else if (g.trib && g.trib.interactive) drawTribulation(ctx, g.trib, time, true);
  if (scene.enemyShots) drawEnemyShots(ctx, scene.enemyShots, vis);
  mark('skillsTop');
  if (scene.projectiles) drawProjectiles(ctx, scene, vis.FX, g.dtWorld || 0, vis.quality);
  mark('projectiles');
  for (const s of g.hubShots || []) { s.fx.x = Math.round(s.x); s.fx.y = Math.round(s.y); s.fx.draw(ctx); }
  if (scene.kind === 'hub' && g.sect) { updateQiParts(vis, map, !!(p.med && g.inForm), g.dtWorld || 0); drawQiParts(ctx, vis); }
  for (const fx of vis.fxs) fx.draw(ctx);
  mark('fx');

  ctx.globalCompositeOperation = 'lighter';
  for (const r of vis.rings) {
    ctx.globalAlpha = Math.min(1, r.life / r.max * 1.5);
    if (r.spr) {   // M7-12: sprite nổ (gai băng) — vẽ đè thường, cỡ theo bán kính hiện tại
      const k = (r.r * 2) / r.spr.width, w = Math.round(r.spr.width * k), h = Math.round(r.spr.height * k);
      ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(r.spr, Math.round(r.x - w / 2), Math.round(r.y - h / 2), w, h); ctx.globalCompositeOperation = 'lighter';
    } else pxRing(ctx, r.x, r.y, r.r, Math.max(12, Math.round(r.r * 1.2)), 0, r.color, 2, 0.55);
  }
  for (const c of vis.chains) for (let i = 1; i < c.pts.length; i++) {
    const [x0, y0] = c.pts[i - 1], [x1, y1] = c.pts[i];
    const mx = (x0 + x1) / 2 + rand(-4, 4), my = (y0 + y1) / 2 + rand(-4, 4);
    pxLine(ctx, x0, y0, mx, my, '#b48cff', 2); pxLine(ctx, mx, my, x1, y1, '#b48cff', 2);
    pxLine(ctx, x0, y0, mx, my, '#fff', 1); pxLine(ctx, mx, my, x1, y1, '#fff', 1);
  }
  for (const q of vis.parts) { ctx.globalAlpha = Math.min(1, q.life / q.max * 1.5); ctx.fillStyle = q.color; ctx.fillRect(Math.round(q.x), Math.round(q.y), q.size, q.size); }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  mark('parts');

  for (const q of vis.texts) {
    ctx.globalAlpha = Math.min(1, q.life * 2);
    txt(ctx, q.text, Math.round(q.x), Math.round(q.y), q.color, 10);
  }
  ctx.globalAlpha = 1;
  mark('texts');

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawBossBar(ctx, scene, camX, camY);
  if (vis.banner) {
    const b = vis.banner; ctx.globalAlpha = Math.min(1, b.life * 2);
    ctx.font = `bold 13px ${FONT}`; const bw = ctx.measureText(b.text).width;
    ctx.fillStyle = 'rgba(10,6,20,.6)'; ctx.fillRect(Math.round(W / 2 - bw / 2 - 10), 40, Math.round(bw + 20), 20);
    txt(ctx, b.text, W / 2, 55, b.color, 13);
    ctx.globalAlpha = 1;
  }
  if (g.trib && g.trib.interactive) { ctx.fillStyle = 'rgba(20,10,50,.12)'; ctx.fillRect(0, 0, W, H); drawTribHud(ctx, g.trib); }
  else if (g.trib) { ctx.fillStyle = 'rgba(20,10,50,.35)'; ctx.fillRect(0, 0, W, H); }
  if (vis.flash > 0) { ctx.fillStyle = `rgba(230,220,255,${Math.min(0.7, vis.flash * 3)})`; ctx.fillRect(0, 0, W, H); }
}
