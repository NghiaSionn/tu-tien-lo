// Vẽ một khung: bản đồ, vật thể sắp theo y, yêu thú, người chơi, công pháp, hiệu ứng beanfx và hạt sáng.
import { VIEW, TILE as T, HUB, FEATURES, ARCH, BOSS, WOLF_PACK, FOX_TRAIL, ICE_FAN, ELITE_V2, BOSS_V2, BOSS_P2, BOSS_TK, BOSS_ULT, BOSS_SKILL_LABELS, TRIBULATION, SHRINE, BASIC_ATTACK } from '../core/config.js';
import { GRASS, WATER, STONE, TREE, ROCK, BUILDING, FENCE, DIRT, CLIFF, CLOUD, FALL } from '../world/map.js';
import { SPR, TIERS, BOSS_WHITE, BOSS_SPR, grassTiles, waterTiles, waterBank, stoneTile, treeSprs, rockSpr, hash } from './sprites.js';
import { createFx } from '../../lib/beanfx.js';
import { skillKind, skillParams, spiritOrbPos, sealOrbPos } from '../systems/combat.js';

const { W, H } = VIEW;
// Chữ trên canvas (12/11, khung 640×360 làm chữ 8px quá nhỏ): đậm, viền tối 2 px để đọc rõ trên mọi nền
const FONT = '"Segoe UI", system-ui, sans-serif';
// M8: chữ trên canvas game (640×360) bị phóng to nên mờ -> nếu có hàng đợi (main.js), gom lại để vẽ ở lớp nét cao #hi
// theo độ phân giải màn hình (giữ toạ độ thế giới qua transform + độ mờ lúc gọi)
let TEXT_Q = null;
export function setTextQueue(q) { TEXT_Q = q; }
export function drawTextQueue(hc, q, k) {
  hc.textAlign = 'center'; hc.lineJoin = 'round';
  for (const t of q) {
    const m = t.m; hc.setTransform(m.a * k, m.b * k, m.c * k, m.d * k, m.e * k, m.f * k); hc.globalAlpha = t.al;
    hc.font = `bold ${t.size}px ${FONT}`; hc.lineWidth = 3; hc.strokeStyle = 'rgba(8,4,16,.9)'; hc.strokeText(t.s, t.x, t.y);
    hc.fillStyle = t.color; hc.fillText(t.s, t.x, t.y);
  }
  hc.globalAlpha = 1; hc.setTransform(1, 0, 0, 1, 0, 0);
}
function txt(ctx, s, x, y, color, size = 10) {
  if (TEXT_Q && ctx.canvas && ctx.canvas.id === 'game') { TEXT_Q.push({ s, x, y, color, size, m: ctx.getTransform(), al: ctx.globalAlpha }); return; }
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
      case 'ultEnd': burst(vis, e.x, e.y - 30, 30, 120, BOSS_ULT[e.kind].COLOR, 0.8, 2); addShake(vis, 0.25); break;   // (24/11) tuyệt chiêu kết thúc
      case 'tkBreak': burst(vis, e.x, e.y - 44, 34, 150, BOSS_TK[e.kind].COLOR, 0.8, 2); burst(vis, e.x, e.y - 44, 16, 90, '#ffffff', 0.5, 2); addShake(vis, 0.3); break;   // (24/11) khiên Tuyệt Kỹ vỡ
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

// M10-03: cảnh báo đòn của quái = đỏ có viền tối bên dưới -> nổi trên cỏ/nước/VFX người chơi (vàng/xanh) ở mọi mức đồ họa
const TG_DARK = '#1a0608';
function tgLine(ctx, x0, y0, x1, y1, col, size) { const a = ctx.globalAlpha; ctx.globalAlpha = a * 0.7; pxLine(ctx, x0 - 1, y0 - 1, x1 - 1, y1 - 1, TG_DARK, size + 2); ctx.globalAlpha = a; pxLine(ctx, x0, y0, x1, y1, col, size); }
function tgRing(ctx, x, y, r, n, col, size, flat) { const a = ctx.globalAlpha; ctx.globalAlpha = a * 0.7; pxRing(ctx, x - 1, y - 1, r, n, 0, TG_DARK, size + 2, flat); ctx.globalAlpha = a; pxRing(ctx, x, y, r, n, 0, col, size, flat); }

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
// (16/11) Chuồng Linh Thú: mép đông/tây = 2 thanh gỗ dọc (màu rào ChatGPT vẽ) nối các trụ sprite tru_rao
let _rail = null;
function railSpr() {
  if (_rail || typeof document === 'undefined') return _rail;
  const c = document.createElement('canvas'); c.width = T; c.height = T + 6; const g = c.getContext('2d');
  for (const x0 of [4, 10]) { g.fillStyle = '#5a2e12'; g.fillRect(x0, 0, 3, T + 6); g.fillStyle = '#c2782c'; g.fillRect(x0, 0, 2, T + 6); g.fillStyle = '#e8a64a'; g.fillRect(x0, 0, 1, T + 6); }
  return (_rail = c);
}
function penRailSegs(posts, post) {
  const out = [], n = posts.length, ph = post.height, pw = post.width;
  for (let i = 0; i < n; i++) {
    const a = posts[i], b = posts[(i + 1) % n];
    if (a.gate) continue;
    const x0 = Math.floor(Math.min(a.x, b.x) - pw), y0 = Math.floor(Math.min(a.y, b.y) - ph), x1 = Math.ceil(Math.max(a.x, b.x) + pw), y1 = Math.ceil(Math.max(a.y, b.y) + 1);
    const c = document.createElement('canvas'); c.width = x1 - x0; c.height = y1 - y0; const g = c.getContext('2d');
    if (!b.gate) for (const [off, col] of [[ph - 18, '#5a2e12'], [ph - 17, '#c2782c'], [ph - 10, '#5a2e12'], [ph - 9, '#c2782c'], [ph - 16, '#e8a64a'], [ph - 8, '#e8a64a']]) {
      const len = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)), steps = Math.ceil(len); g.fillStyle = col;
      for (let k = 0; k <= steps; k++) { const t = k / steps; g.fillRect(Math.round(a.x + (b.x - a.x) * t - x0), Math.round(a.y + (b.y - a.y) * t - ph + off - y0), 1, off % 2 ? 1 : 2); }
    }
    g.drawImage(post, Math.round(a.x - pw / 2 - x0), Math.round(a.y - ph - y0));
    out.push({ img: c, x: x0, dy: y0, y: Math.max(a.y, b.gate ? a.y : b.y) });
  }
  return out;
}
// (16/11) bóng dưới vật: hình bóng của sprite ép dẹt theo chiều cao, làm mềm mép, đặt ngay dưới chân (không đổ lệch sang bên)
const _shadow = new WeakMap();
// (16/11) bóng nhà: chỉ phần chân (từ đỉnh cầu thang xuống) của hình nhà, làm mềm, xóa cột cầu thang -> viền tối quanh bệ đá
const _baseShadow = new WeakMap();
function baseShadow(img, stair, stairs = null) {
  let c = _baseShadow.get(img); if (c) return c;
  const pad = 6, w = img.width, h = img.height, y0 = stair ? Math.max(0, stair[1] - 12) : stairs ? Math.round(h * 0.45) : Math.round(h * 0.6);
  c = document.createElement('canvas'); c.width = w + pad * 2; c.height = h + pad * 2; const g = c.getContext('2d');
  g.filter = 'blur(3px)'; for (const [dx, dy] of [[0, 0], [-2, 0], [2, 0], [0, 2]]) g.drawImage(img, 0, y0, w, h - y0, pad + dx, pad + y0 + dy, w, h - y0); g.filter = 'none';   // nới ra 2 px rồi làm mềm
  g.globalCompositeOperation = 'source-in'; g.fillStyle = '#14182c'; g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-out';
  if (stairs) {   // nhiều lối bậc (bệ pháp đài): xoá mềm từng vùng
    const m = document.createElement('canvas'); m.width = c.width; m.height = c.height; const mg = m.getContext('2d'); mg.fillStyle = '#000';
    for (const [a1, b1, c1, d1] of stairs) mg.fillRect(pad + a1 - 8, pad + b1 - 4, c1 - a1 + 16, d1 - b1 + 16);
    g.filter = 'blur(6px)'; g.drawImage(m, 0, 0); g.drawImage(m, 0, 0); g.filter = 'none';
  }
  if (stair) {   // né cầu thang: xoá bằng khối làm mềm (mép chuyển dần, không cắt vuông)
    const m = document.createElement('canvas'); m.width = c.width; m.height = c.height; const mg = m.getContext('2d');
    mg.fillStyle = '#000'; mg.fillRect(pad + stair[0] - 14, pad + stair[1] - 4, stair[2] - stair[0] + 28, c.height);   // gồm cả lan can hai bên bậc (bóng lan can tạo vệt dọc)
    g.filter = 'blur(6px)'; g.drawImage(m, 0, 0); g.drawImage(m, 0, 0); g.drawImage(m, 0, 0); g.filter = 'none';
  }
  _baseShadow.set(img, c); return c;
}
const _alphaMap = new WeakMap();
function alphaAt(img, x, y) {   // (17/11) độ đục 1 điểm ảnh của sprite (đã cache) — dò nhân vật có bị nhà che không
  let a = _alphaMap.get(img);
  if (!a) { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data; a = new Uint8Array(c.width * c.height); for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3]; _alphaMap.set(img, a); }
  x = Math.floor(x); y = Math.floor(y); return x < 0 || y < 0 || x >= img.width || y >= img.height ? 0 : a[y * img.width + x];
}
// (17/11) cỏ/hoa trang trí ngay trước chân nhà/bệ: vẽ ở lớp vật thể (xếp theo chân) để đè lên nền nhà thay vì bị nền che
function nhaRects(map, vis) {
  const r = [];
  if (vis.nha) for (const b of map.sect.nhaAll || []) { const n = b.nha, v = n && vis.nha[n.id]; if (v) r.push({ x: n.x, y: n.y, img: v.base }); }
  if (vis.plaza) r.push({ x: Math.round(map.cx - vis.plaza.ax), y: Math.round(map.cy - vis.plaza.ay), img: vis.plaza.base });
  return r;
}
function decorOverNha(map, props, tx, ty, img, rects) {   // 0: không chạm nhà; 1: chân trên nền nhà (bỏ); 2: chân trên đất, hình lấn lên nhà (vẽ ở lớp vật thể)
  const x0 = tx * T + 8 - img.ax, y0 = ty * T + T - 1 - img.ay, fx = tx * T + 8, fy = ty * T + T - 1;
  let hit = 0;
  for (const r of rects) {
    if (x0 >= r.x + r.img.width || x0 + img.width <= r.x || y0 >= r.y + r.img.height || y0 + img.height <= r.y) continue;
    if (alphaAt(r.img, fx - r.x, fy - r.y) > 40) return 1;
    hit = 2;
  }
  return hit;
}
// (17/11) cánh hoa đào rơi lả tả quanh tán cây hoa đào: mỗi cây vài cánh, vòng đời lặp theo thời gian (không cấp phát, không trạng thái)
const PETAL_C = ['#ffd3e6', '#ffb3d1', '#f58fbc', '#fff0f6'];
function drawPetals(ctx, props, tm, camX, camY, time) {
  for (const o of props) {
    if (o.s !== 'anh_dao_lon' && o.s !== 'anh_dao_nho') continue;
    const img = tm[o.s]; if (!img) continue;
    const w = img.width, top = o.y - img.height;
    if (o.x + w < camX - 20 || o.x - w > camX + W + 20 || top > camY + H || o.y + 40 < camY) continue;
    const n = o.s === 'anh_dao_lon' ? 11 : 6;
    for (let i = 0; i < n; i++) {
      const h = hash(Math.round(o.x), Math.round(o.y), 300 + i), h2 = hash(Math.round(o.x), i, 310), life = 4 + h2 * 3;
      const t = ((time / life) + h) % 1;   // 0..1 trong vòng đời
      const x = o.x - w * 0.45 + h2 * w * 0.9 + t * 44 + Math.sin(time * 1.6 + h * 9) * 5;
      const y = top + img.height * (0.2 + 0.3 * h) + t * (img.height * 0.6 + 26);
      ctx.globalAlpha = Math.min(1, t * 6, (1 - t) * 3) * 0.95;
      const flip = Math.sin(time * 4 + h * 20) > 0, px = Math.round(x), py = Math.round(y);   // cánh 3×2 / 2×2 lật theo gió, viền sẫm 1 px dưới để nổi trên nền hồng
      ctx.fillStyle = '#b4527e'; ctx.fillRect(px, py + (flip ? 2 : 2), flip ? 3 : 2, 1);
      ctx.fillStyle = PETAL_C[i & 3]; ctx.fillRect(px, py, flip ? 3 : 2, 2);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(px, py, 1, 1);
    }
  }
  ctx.globalAlpha = 1;
}
// (17/11) người chơi đứng sau nhà (lớp che có chân thấp hơn người phủ lên thân) -> cả nhà vẽ mờ như tán cây
function behindNha(p, n, v) {
  if (!(p.x > n.x && p.x < n.x + v.base.width && p.y > n.y - 8 && p.y < n.y + v.base.height * 0.5)) return false;   // chỉ vùng mái phía sau (sàn trong nhà ở nửa dưới -> không mờ)
  for (const s of v.strips) { if (n.y + s.foot <= p.y) continue; for (const oy of [3, 10, 18]) if (alphaAt(s.img, p.x - n.x - s.x, p.y - oy - n.y - s.y) > 100) return true; }
  return false;
}
// (17/11) nhãn tên khu sảnh: theo mẫu Tụ Linh Pháp Đài — một màu, cỡ 11, không đổi màu/phóng to khi lại gần; dòng trạng thái nhỏ bên dưới
function sectLabel(ctx, name, st, x, y) {
  txt(ctx, name, Math.round(x), Math.round(y), '#fff6c8', 11);
  if (st) txt(ctx, st.s, Math.round(x), Math.round(y + 10), '#cfc6b0', 8);
}
const _bbox = new WeakMap();
function opaqueBox(img) {   // khung điểm ảnh đục của sprite (cache) -> căn nhãn đúng giữa phần nhìn thấy, không theo khung ảnh
  let b = _bbox.get(img); if (b) return b;
  let x0 = img.width, x1 = 0, y0 = img.height;
  for (let y = 0; y < img.height; y += 2) for (let x = 0; x < img.width; x += 2) if (alphaAt(img, x, y) > 100) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; }
  b = { cx: (x0 + x1) / 2, top: y0 }; _bbox.set(img, b); return b;
}
function castShadow(img) {
  let c = _shadow.get(img); if (c) return c;
  const w = img.width, h = img.height, f = 0.26, pad = 4;   // bóng nằm ngay dưới vật: hình bóng ép dẹt, mép làm mềm
  c = document.createElement('canvas'); c.width = w + pad * 2; c.height = Math.max(2, Math.ceil(h * f)) + pad * 2; const g = c.getContext('2d');
  g.filter = 'blur(2px)'; g.drawImage(img, pad, pad, w, Math.max(2, Math.ceil(h * f))); g.filter = 'none';
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#14182c'; g.fillRect(0, 0, c.width, c.height);
  _shadow.set(img, c); return c;
}
// (17/11) sương mù/mây trôi động trên biển mây: dải sương mềm lớn trôi ngang chậm, dày dần ra xa mép đảo; vài làn mỏng trôi qua mép vách
let _fogPuff = null, _fogDeep = null, _fogC = null, _fogM = null;
function puffSpr(core, mid, edge) {   // làn sương: elip dẹt, mép tan rất mềm (không lõi đặc)
  const c = document.createElement('canvas'); c.width = 128; c.height = 48; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 62);
  gr.addColorStop(0, core); gr.addColorStop(0.35, mid); gr.addColorStop(0.7, edge); gr.addColorStop(1, edge.replace(/[\d.]+\)$/, '0)'));
  g.setTransform(1, 0, 0, 0.375, 0, 0); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return c;
}
function fogPuff() {
  if (_fogPuff || typeof document === 'undefined') return _fogPuff;
  _fogDeep = puffSpr('rgba(150,152,205,.7)', 'rgba(160,162,212,.45)', 'rgba(170,172,218,.15)');   // bóng lõm giữa các đụn mây (tạo khối)
  return (_fogPuff = puffSpr('rgba(250,251,255,.85)', 'rgba(240,242,253,.55)', 'rgba(230,233,250,.2)'));
}
// ô mây ngay trên mép đảo không có vách (rừng phía bắc): tán cây vẽ lấn lên đó -> không phủ sương
const fogOk = d => d === CLOUD || d === CLIFF || d === FALL;
// (17/11) sương mù biển mây: lớp bóng xám tím (khối) + 2 lớp trắng trôi (xa chậm, gần nhanh), toạ độ lẻ + làm mịn.
// Vẽ vào canvas riêng rồi nhân với mặt nạ ô mây phóng mịn (1 px/ô -> nội suy) => mép sương tan mềm qua chân vách, không thành đường thẳng.
function drawFogFx(ctx, map, camX, camY, time) {
  const img = fogPuff(); if (!img) return;
  if (!_fogC) { _fogC = document.createElement('canvas'); _fogC.width = W; _fogC.height = H; _fogM = document.createElement('canvas'); }
  const tx0 = Math.floor(camX / T) - 1, ty0 = Math.floor(camY / T) - 1, tw = Math.ceil(W / T) + 3, th = Math.ceil(H / T) + 3;
  if (_fogM.width !== tw || _fogM.height !== th) { _fogM.width = tw; _fogM.height = th; }
  const mg = _fogM.getContext('2d'), md = mg.createImageData(tw, th); let any = false;
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) if ((map.tileAt(tx0 + x, ty0 + y) === CLOUD && fogOk(map.tileAt(tx0 + x, ty0 + y + 1))) || (map.tileAt(tx0 + x, ty0 + y) === FALL && (map.tileAt(tx0 + x - 1, ty0 + y) === CLOUD || map.tileAt(tx0 + x + 1, ty0 + y) === CLOUD))) { md.data[(y * tw + x) * 4 + 3] = 255; any = true; }
  if (!any) return;
  mg.putImageData(md, 0, 0);
  const g = _fogC.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H); g.imageSmoothingEnabled = true;
  for (const [cw, ch, sp0, a0, sc0, seed, spr] of [[120, 34, 2, 0.32, 1.9, 140, _fogDeep], [96, 26, 3, 0.34, 1.5, 160, img], [72, 20, 7, 0.4, 1.0, 180, img]]) {
    const cols = Math.ceil(W / cw) + 3, rows = Math.ceil(H / ch) + 3;
    for (let j = -2; j < rows; j++) for (let i = -2; i < cols; i++) {
      const gy = Math.floor(camY / ch) + j, gi = Math.floor(camX / cw) + i, h = hash(gi, gy, seed), sc = sc0 * (0.8 + hash(gi, gy, seed + 2) * 0.5);
      const w = 128 * sc, hh = 48 * sc;
      const x = gi * cw + ((time * sp0 * (0.7 + h * 0.6) + h * cw) % cw) + (gy & 1) * cw / 2 - w / 2 - camX;
      const y = gy * ch + hash(gi, gy, seed + 1) * ch * 0.8 + Math.sin(time * 0.3 + h * 6.28) * 2.5 - hh / 2 - camY;
      if (x > W || x + w < 0 || y > H || y + hh < 0) continue;
      g.globalAlpha = a0 * (0.75 + 0.25 * Math.sin(time * 0.25 + h * 6.28)); g.drawImage(spr, x, y, w, hh);
    }
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'destination-in';
  g.drawImage(_fogM, tx0 * T - camX, ty0 * T - camY, tw * T, th * T);   // nội suy song tuyến: mép mờ dần ~1 ô
  g.globalCompositeOperation = 'source-over';
  ctx.drawImage(_fogC, camX, camY);
  drawFallMist(ctx, map, camX, camY, time, img);
}
// (17/11) thác trời (chân thác lơ lửng trên biển mây): chân thác + vách tan dần vào một đụn sương dày, phập phồng -> như thác đổ mãi xuống dưới mây
function drawFallMist(ctx, map, camX, camY, time, img) {
  const tx0 = Math.floor(camX / T) - 6, ty0 = Math.floor(camY / T) - 3, tx1 = tx0 + Math.ceil(W / T) + 12, ty1 = ty0 + Math.ceil(H / T) + 6;
  const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    if (map.tileAt(tx, ty) !== FALL || map.tileAt(tx, ty + 1) !== CLOUD || map.tileAt(tx - 1, ty) === FALL) continue;   // ô trái nhất của chân thác
    let n = 1; while (map.tileAt(tx + n, ty) === FALL) n++;
    const cx = tx * T + n * T / 2, yb = ty * T + T, wd = (n + 4) * T;
    // nền sương dày, mép tan mềm (ảnh elip gradient): che hẳn chân thác + chân vách hai bên
    for (const [dy, sx, sy, a] of [[-6, 1.25, 1.5, 0.95], [-20, 1.0, 1.2, 0.85], [6, 1.5, 1.3, 0.9]]) {
      const w = wd * sx, h = 48 * sy; ctx.globalAlpha = a; ctx.drawImage(img, cx - w / 2, yb + dy - h / 2, w, h);
    }
    // đụn sương cuộn chậm phía trên
    for (let k = 0; k < 5; k++) {
      const h = hash(tx, k, 190), ph = time * (0.35 + h * 0.3) + h * 6.28, w = 60 + h * 40 + Math.sin(ph) * 8, hh = w * 0.45;
      const x = cx + (k - 2) * (wd / 6) + Math.sin(ph * 0.7) * 6, y = yb - 14 - (k & 1) * 10 + Math.sin(ph) * 3;
      ctx.globalAlpha = 0.5 + 0.3 * (0.5 + 0.5 * Math.sin(ph * 1.3)); ctx.drawImage(img, x - w / 2, y - hh / 2, w, hh);
    }
    ctx.globalAlpha = 1;
  }
  ctx.imageSmoothingEnabled = sm;
}
function fenceSpr() {
  if (_fence || typeof document === 'undefined') return _fence;
  const c = document.createElement('canvas'); c.width = T; c.height = 20; const g = c.getContext('2d');
  g.fillStyle = '#3a2618'; g.fillRect(0, 8, 16, 3); g.fillRect(0, 13, 16, 3); g.fillRect(6, 2, 4, 18);
  g.fillStyle = '#8a5a34'; g.fillRect(0, 9, 16, 1); g.fillRect(0, 14, 16, 1); g.fillRect(7, 3, 2, 16);
  g.fillStyle = '#b07a48'; g.fillRect(7, 3, 1, 15);
  return (_fence = c);
}
// M8 (15/11): vách núi rìa đảo + biển mây (tạm vẽ bằng code, sẽ thay art)
const _edge = {};
function edgeTile(kind, v) {
  const key = kind + v; if (_edge[key] || typeof document === 'undefined') return _edge[key];
  const c = document.createElement('canvas'); c.width = c.height = T; const g = c.getContext('2d');
  if (kind === 'cliff') {
    g.fillStyle = '#5d5e78'; g.fillRect(0, 0, T, T);
    for (let i = 0; i < 7; i++) { const x = Math.floor(hash(i, v, 41) * 13), y = Math.floor(hash(i, v, 42) * 13), w = 3 + Math.floor(hash(i, v, 43) * 5);
      g.fillStyle = '#73748f'; g.fillRect(x, y, w, 2); g.fillStyle = '#44455c'; g.fillRect(x, y + 2, w, 1); }
    g.fillStyle = '#3c3d52'; g.fillRect(Math.floor(hash(v, 1, 44) * 15), 0, 1, T);
  } else {
    g.fillStyle = '#c9cbe6'; g.fillRect(0, 0, T, T);
    for (let i = 0; i < 4; i++) { g.fillStyle = i & 1 ? '#e4e5f5' : '#b7b9d9'; g.fillRect(Math.floor(hash(i, v, 45) * 12), Math.floor(hash(i, v, 46) * 13), 5, 3); }
  }
  return (_edge[key] = c);
}
// M9-B: tán rừng tối dày đặc giữa các phòng (thay cho hàng nghìn sprite cây): nền xanh thẫm + đốm lá sáng/tối theo ô
const CANOPY = ['#132218', '#18291c', '#1d3322', '#26402a', '#0e1a12'];
function paintCanopy(g, tx, ty, x, y) {
  g.fillStyle = CANOPY[0]; g.fillRect(x, y, T, T);
  for (let i = 0; i < 5; i++) {
    const h = hash(tx * 3 + i, ty * 5 - i, 171), px = x + Math.floor(h * 14), py = y + Math.floor(hash(tx, ty * 7 + i, 172) * 14), r = 2 + Math.floor(hash(tx + i, ty, 173) * 3);
    g.fillStyle = CANOPY[1 + (i % 3)]; g.fillRect(px - r, py - r + 1, r * 2, r * 2 - 2); g.fillRect(px - r + 1, py - r, r * 2 - 2, r * 2);
  }
  if (hash(tx, ty, 174) < 0.3) { g.fillStyle = CANOPY[4]; g.fillRect(x + Math.floor(hash(tx, ty, 175) * 12), y + Math.floor(hash(tx, ty, 176) * 12), 4, 3); }
}
// M9-B: cửa phòng đang phong ấn — màn linh lực tím, vạch phù văn chạy
function drawRoomSeals(ctx, map, camX, camY, time) {
  if (!map.blocked || !map.blocked.size) return;
  const W0 = map.w;
  for (const k of map.blocked) {
    const tx = k % W0, ty = (k - tx) / W0, x = tx * T, y = ty * T;
    if (x + T < camX || x > camX + W || y + T < camY - 32 || y > camY + H) continue;
    const a = 0.62 + 0.18 * Math.sin(time * 4 + tx + ty);
    ctx.fillStyle = `rgba(110,40,200,${a})`; ctx.fillRect(x, y - 10, T, T + 10);   // màn cao hơn ô: thấy rõ như bức tường linh lực
    ctx.fillStyle = `rgba(200,140,255,${a * 0.8})`; ctx.fillRect(x, y - 10, T, 2); ctx.fillRect(x, y + T - 2, T, 2);
    ctx.fillStyle = '#f2e2ff';
    for (let i = 0; i < 3; i++) { const o = Math.floor((time * 20 + i * 9 + (tx + ty) * 5) % (T + 10)); ctx.fillRect(x + 3 + ((i * 5 + tx * 3) % 10), y - 10 + o, 2, 3); }
  }
}
// (17/11) trang trí riêng 2 phòng boss, vẽ trên nền (dưới nhân vật):
// - Đàn tế Ma Ảnh Yêu Vương: pháp trận tím 3 vòng + 8 phù văn quay chậm, phập phồng; đèn ma trơi trên 4 cột đá
// - Hang Lang Vương: xương thú, vết cào, vệt máu khô rải trên sân đất
function drawBossRoomFloor(ctx, map, camX, camY, time, vis) {
  const dg = map.rooms; if (!dg) return;
  for (const r of dg.rooms) {
    if (r.type !== 'boss' && r.type !== 'mini') continue;
    const cx = (r.cx + 0.5) * T, cy = (r.cy + 0.5) * T, w = (r.x1 - r.x0 + 1) * T, h = (r.y1 - r.y0 + 1) * T;
    if (cx + w / 2 < camX || cx - w / 2 > camX + W || cy + h / 2 < camY || cy - h / 2 > camY + H) continue;
    if (r.type === 'boss') {
      const P = vis && vis.pb && vis.pb.phap_tran;
      if (P) {   // (17/11) pháp trận ChatGPT vẽ: nền đá khắc + lớp phù văn sáng phập phồng (cộng sáng) + khí tím bốc lên
        const x = Math.round(cx - P.width / 2), y = Math.round(cy - P.height / 2);
        ctx.drawImage(P, x, y);
        const G = vis.pb.phap_tran_glow, pul = 0.5 + 0.5 * Math.sin(time * 1.8);
        if (G) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + 0.4 * pul; ctx.drawImage(G, x, y); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
        for (let i = 0; i < 26; i++) {   // hạt khí tím bay lên từ rãnh khắc
          const h = hash(i, r.id, 191), a = h * 6.283, rr = 0.25 + hash(i, 3, 192) * 0.7, t = (time * (0.25 + h * 0.2) + hash(i, 5, 193)) % 1;
          const px = cx + Math.cos(a) * rr * P.width / 2, py = cy + Math.sin(a) * rr * P.height / 2 - t * 40;
          ctx.globalAlpha = Math.min(1, t * 4, (1 - t) * 2) * 0.8; ctx.fillStyle = i & 1 ? '#c98cff' : '#f0dcff'; ctx.fillRect(Math.round(px), Math.round(py), 2, 2);
        }
        ctx.globalAlpha = 1;
        continue;
      }
      const pul = 0.5 + 0.5 * Math.sin(time * 1.6);
      const K = ((r.x1 - r.x0 + 1) / 2 - 3) * T / 288;   // pháp trận to theo phòng
      ctx.save(); ctx.translate(cx, cy); ctx.scale(K, 0.55 * K);   // nhìn nghiêng 3/4: vòng dẹt
      for (const [rad, a, lw] of [[150, 0.35, 2], [118, 0.5, 2], [70, 0.55, 3]]) {
        ctx.globalAlpha = a * (0.7 + 0.3 * pul); ctx.strokeStyle = '#a45cff'; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(0, 0, rad, 0, 6.283); ctx.stroke();
      }
      ctx.globalAlpha = 0.5; ctx.strokeStyle = '#d6a8ff'; ctx.lineWidth = 1.5; ctx.beginPath();   // ngôi sao 8 cánh nối vòng giữa
      for (let i = 0; i <= 8; i++) { const a = time * 0.15 + i * 3 * Math.PI / 4, x = Math.cos(a) * 118, y = Math.sin(a) * 118; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      for (let i = 0; i < 8; i++) {   // phù văn trên vòng ngoài
        const a = -time * 0.25 + i * Math.PI / 4, x = Math.cos(a) * 134, y = Math.sin(a) * 134;
        ctx.globalAlpha = 0.55 + 0.35 * Math.sin(time * 3 + i); ctx.fillStyle = '#e9d2ff';
        ctx.fillRect(x - 4, y - 6, 8, 2); ctx.fillRect(x - 1, y - 6, 2, 12); ctx.fillRect(x - 4, y + 2, 8, 2);
      }
      ctx.restore(); ctx.globalAlpha = 1;
    }
  }
}
const GLOW_PB = { cot_phu_van: 0.12, lu_lua_ma: 0.25, chan_nen: 0.15, tinh_the_ma: 0.45 };   // vị trí quầng sáng (phần chiều cao từ đỉnh)
// (17/11) cột đá phù văn ở đàn tế Yêu Vương (vẽ code, 26×58): đế, thân chạm 3 đai, phù văn tím, mũ đá, tinh thể tím trên đỉnh
let _pillar = null;
function pillarSpr() {
  if (_pillar || typeof document === 'undefined') return _pillar;
  const c = document.createElement('canvas'); c.width = 26; c.height = 58; const g = c.getContext('2d');
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  R(1, 50, 24, 8, '#3d3a4a'); R(2, 49, 22, 7, '#7c7790'); R(2, 49, 22, 2, '#a29db6');   // đế
  R(5, 16, 16, 34, '#5b5670'); R(6, 16, 12, 34, '#8a849f'); R(6, 16, 3, 34, '#aaa4bf');   // thân
  for (const yy of [22, 34, 44]) { R(4, yy, 18, 3, '#4a4560'); R(5, yy, 16, 1, '#b4aec8'); }   // đai
  R(10, 26, 6, 6, '#3a2a5a'); R(11, 27, 4, 4, '#b07cff'); R(12, 28, 2, 2, '#f0e0ff');   // phù văn
  R(10, 37, 6, 5, '#3a2a5a'); R(11, 38, 4, 3, '#9a5cff');
  R(3, 12, 20, 5, '#4a4560'); R(3, 12, 20, 2, '#b4aec8');   // mũ
  R(10, 2, 6, 10, '#6a2ccf'); R(11, 1, 4, 11, '#b07cff'); R(12, 3, 2, 6, '#f2e4ff');   // tinh thể
  return (_pillar = c);
}
// M9-B: minimap góc phải: ô phòng đã thấy (mờ) / đã vào (sáng), phòng hiện tại viền vàng, biểu tượng loại phòng
const ROOM_ICON = { boss: '#ff5a5a', mini: '#ff9a5a', elite: '#c98cff', reward: '#ffd978', shrine: '#7fe3ff' };
function drawMinimap(ctx, run) {
  const dg = run.scene.map.rooms, rs = run.rooms; if (!dg || !rs) return;
  const cw = 16, ch = 11, gap = 4, allGX = 5, allGY = 4, mw = allGX * (cw + gap) + gap, mh = allGY * (ch + gap) + gap, x0 = W - mw - 6, y0 = 30;
  ctx.fillStyle = 'rgba(8,6,18,.72)'; ctx.fillRect(x0, y0, mw, mh);
  ctx.strokeStyle = 'rgba(255,233,160,.35)'; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, y0 + 0.5, mw - 1, mh - 1);
  const pos = r => [x0 + gap + r.gx * (cw + gap), y0 + gap + r.gy * (ch + gap)];
  ctx.fillStyle = 'rgba(200,190,230,.55)';
  for (const [a, b] of dg.edges) {
    if (!(rs.rooms[a].seen && rs.rooms[b].seen) || !(rs.rooms[a].visited || rs.rooms[b].visited)) continue;
    const [ax, ay] = pos(dg.rooms[a]), [bx, by] = pos(dg.rooms[b]);
    if (ay === by) ctx.fillRect(Math.min(ax, bx) + cw, ay + ch / 2 - 1, gap, 2); else ctx.fillRect(ax + cw / 2 - 1, Math.min(ay, by) + ch, 2, gap);
  }
  for (const r of dg.rooms) {
    const st = rs.rooms[r.id]; if (!st.seen) continue;
    const [x, y] = pos(r);
    ctx.fillStyle = st.visited ? (st.state === 'cleared' ? 'rgba(170,165,200,.9)' : 'rgba(120,110,150,.9)') : 'rgba(70,65,95,.75)'; ctx.fillRect(x, y, cw, ch);
    const ic = ROOM_ICON[r.type];
    if (ic && (st.visited || r.type === 'boss')) { ctx.fillStyle = ic; ctx.fillRect(x + cw / 2 - 2, y + ch / 2 - 2, 4, 4); }
    if (r.id === rs.cur) { ctx.strokeStyle = '#ffe9a0'; ctx.lineWidth = 1; ctx.strokeRect(x - 0.5, y - 0.5, cw + 1, ch + 1); }
  }
}
function groundTile(t, tx, ty, map) {
  if (t === CLIFF) return edgeTile('cliff', Math.floor(hash(tx, ty, 47) * 4));
  if (t === CLOUD) return edgeTile('cloud', Math.floor(hash(tx, ty, 48) * 4));
  if (t === STONE || t === BUILDING) return stoneTile;
  if (t === DIRT) return dirtTile();
  return grassTiles[Math.floor(hash(tx, ty, 5) * grassTiles.length)];
}
function tileObj(map, tx, ty, props) {
  const t = map.tileAt(tx, ty), x = tx * T, y = ty * T;
  if (map.deep && tx >= 0 && ty >= 0 && tx < map.w && ty < map.h && map.deep[ty * map.w + tx]) return null;   // M9-B: rừng sâu tô tán, không vẽ cây
  if (map.pillarTile && map.pillarTile.has(ty * map.w + tx)) { if (!map.pillars.has(ty * map.w + tx)) return null; const img = pillarSpr(); return { y: y + 2 * T, img, x: x + T - img.width / 2, dy: y + 2 * T - img.height }; }   // cột đá phù văn đàn tế
  if (t === FENCE) {   // M8: mép bắc/nam rào là sprite hang_rao (map.sect.props); chỉ vẽ cọc rào cho mép đông/tây
    if (map.sect && (map.sect.pen?.ring || map.tileAt(tx - 1, ty) === FENCE || map.tileAt(tx + 1, ty) === FENCE)) return null;   // rào bo tròn vẽ riêng
    const f = map.sect && map.sect.pen && map.sect.pen.art ? railSpr() : fenceSpr(); return f ? { y: y + T, img: f, x, dy: y + T - f.height } : null;
  }
  if (props && t === TREE) { const img = props[pick(TREE_KINDS, hash(tx, ty, 6))]; return { y: y + T, img, x: x + 8 - img.ax, dy: y + T - 1 - img.ay }; }
  if (props && t === ROCK) { const img = props[pick(ROCK_KINDS, hash(tx, ty, 7))]; return { y: y + T - 2, img, x: x + 8 - img.ax, dy: y + T - 2 - img.ay }; }
  if (t === TREE) { const v = hash(tx, ty, 6); return { y: y + T, img: treeSprs[v < 0.12 ? 2 : v < 0.56 ? 0 : 1], x: x - 2, dy: y + T - 28 }; }
  if (t === ROCK) return { y: y + T - 2, img: rockSpr, x: x + 1, dy: y + 5 };
  return null;
}
// ---------- M8 (15/11): địa hình sảnh tông môn vẽ bằng code (đường đá viền bo góc, vách núi, mây, thác) ----------
const isWalkT = t => t === GRASS || t === STONE || t === DIRT || t === BUILDING || t === FENCE || t === TREE || t === ROCK;
const PATHC = { base: '#bdb6ae', hi: '#d6d0c8', lo: '#9a948e', joint: '#837d78', curb: '#6d6863' };
function paintPath(g, map, tx, ty, x, y) {   // đá cuội: từng viên không đều + mép giáp cỏ có bờ đá và bo góc
  g.fillStyle = PATHC.joint; g.fillRect(x, y, T, T);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    const h = hash(tx * 7 + c, ty * 5 + r, 51), w = 4 + Math.floor(h * 3), sx = x + c * 5 + ((r & 1) ? 2 : 0) + Math.floor(h * 2) - 1, sy = y + r * 4;
    g.fillStyle = h < 0.3 ? PATHC.lo : PATHC.base; g.fillRect(sx, sy, w, 3);
    g.fillStyle = PATHC.hi; g.fillRect(sx, sy, w - 1, 1);
  }
  const gr = (dx, dy) => { const t = map.tileAt(tx + dx, ty + dy); return t === GRASS || t === TREE || t === ROCK; };
  const n = gr(0, -1), s = gr(0, 1), w = gr(-1, 0), e = gr(1, 0);
  g.fillStyle = PATHC.curb;
  if (n) g.fillRect(x, y, T, 2); if (s) g.fillRect(x, y + T - 2, T, 2); if (w) g.fillRect(x, y, 2, T); if (e) g.fillRect(x + T - 2, y, 2, T);
  const gt = grassTiles[0];   // bo góc: hai cạnh kề là cỏ -> phủ tam giác cỏ ở góc
  const corner = (cx0, cy0, sx, sy) => { for (let i = 0; i < 6; i++) g.drawImage(gt, cx0 + (sx > 0 ? 0 : 0), 0, 6 - i, 1, x + (sx > 0 ? T - (6 - i) : 0), y + (sy > 0 ? T - 1 - i : i), 6 - i, 1); };
  if (n && w) corner(0, 0, -1, -1); if (n && e) corner(0, 0, 1, -1); if (s && w) corner(0, 0, -1, 1); if (s && e) corner(0, 0, 1, 1);
}
// M8 (16/11): cỏ + đá phiến theo concept bằng tileset sprites/tm_co_da.png (ChatGPT vẽ, maps/tilesets/co_da.tsx). Đá ghép theo GÓC:
// đỉnh ô là đá khi >= 2 trong 4 ô quanh đỉnh là đá -> ô có góc đá/cỏ lẫn lộn dùng ô viền, góc trong; đường tự bo cong theo lưới
let CODA = null;
export function setCoDa(img) { CODA = img; }
const CODA_IDX = { '1121': 32, '1122': 33, '1112': 34, '1221': 40, '2222': 41, '2112': 42, '1211': 48, '2211': 49, '2111': 50, '1222': 35, '2122': 36, '2221': 43, '2212': 44 };
function paintCoDa(g, map, tx, ty, x, y) {
  const st = (a, b) => map.tileAt(a, b) === STONE || (map.pillarTile && map.pillarTile.has(b * map.w + a)) ? 1 : 0;   // cột đàn tế đứng trên nền đá
  const v = (a, b) => (st(a - 1, b - 1) + st(a, b - 1) + st(a - 1, b) + st(a, b) >= 2 ? '2' : '1');
  const k = v(tx, ty) + v(tx + 1, ty) + v(tx + 1, ty + 1) + v(tx, ty + 1), h = hash(tx, ty, 71);
  let id;
  if (k === '2222') id = (h < 0.75 ? 16 : 24) + Math.floor(hash(tx, ty, 72) * 8);
  else if (k === '1111') id = st(tx, ty) ? 16 + Math.floor(h * 8) : (h < 0.1 ? 8 : 0) + Math.floor(hash(tx, ty, 72) * 8);
  else id = CODA_IDX[k] ?? 41;
  g.drawImage(CODA, (id & 7) * T, (id >> 3) * T, T, T, x, y, T, T);
}
// M8 (16/11): vách núi, suối, thác theo concept bằng tileset sprites/tm_vach_nuoc.png (ChatGPT vẽ). Hàng: 0 mặt vách, 1 mép trên vách
// (cỏ rủ), 2 chân vách tan vào mây (0-3) / cạnh trái (4) / cạnh phải (7), 3 nước, 4 bờ suối (trên 0-1, dưới 2-3, trái 4, phải 5, sen 6-7),
// 5 thác (đỉnh 0, thân 4 khung 1-4, chân bọt 5-6)
let VN = null;
export function setVachNuoc(img) {   // (17/11) thân thác (ô 40–47) kéo màu về gần màu suối: thác là nước suối đổ xuống, không xanh nhạt lạc tông
  VN = img;
  if (typeof document === 'undefined' || !img || !img.width) return;
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 5 * T, 8 * T, T), a = d.data;
  for (let i = 0; i < a.length; i += 4) { const l = (a[i] + a[i + 1] + a[i + 2]) / 765, k = 0.75 * (1 - Math.max(0, l - 0.72) / 0.28);   // giữ vệt sáng trắng
    a[i] += (-48) * k; a[i + 1] += (-30) * k; a[i + 2] += (-28) * k; }
  g.putImageData(d, 0, 5 * T); VN = c;
}
const vnTile = (g, id, x, y) => g.drawImage(VN, (id & 7) * T, (id >> 3) * T, T, T, x, y, T, T);
// M8 (16/11): sân đất Luyện Võ — nền đất + viền: mép giáp rào/cỏ có dải đất sẫm và vệt cỏ lấn vào, góc bo tròn
function paintDirtYard(g, map, tx, ty, x, y) {
  g.drawImage(dirtTile(), x, y);
  const o = (dx, dy) => map.tileAt(tx + dx, ty + dy) !== DIRT;
  const n = o(0, -1), s = o(0, 1), w = o(-1, 0), e = o(1, 0);
  g.fillStyle = 'rgba(92,58,30,.55)';
  if (n) g.fillRect(x, y, T, 3); if (s) g.fillRect(x, y + T - 3, T, 3); if (w) g.fillRect(x, y, 3, T); if (e) g.fillRect(x + T - 3, y, 3, T);
  g.fillStyle = 'rgba(60,110,40,.9)';
  for (let i = 0; i < 3; i++) { const h = hash(tx, ty, 91 + i), k = Math.floor(h * 14);
    if (n) g.fillRect(x + k, y, 2, 1 + (i & 1)); if (s) g.fillRect(x + k, y + T - 1 - (i & 1), 2, 1 + (i & 1));
    if (w) g.fillRect(x, y + k, 1 + (i & 1), 2); if (e) g.fillRect(x + T - 1 - (i & 1), y + k, 1 + (i & 1), 2); }
}
// (17/11) mép vách bậc thang: góc lồi của đất (dưới + bên là vách) cắt cong -> mặt đá lộ theo cung; góc lõm (vách có đất trên + bên) phủ cỏ theo cung
const CR = 7;   // bán kính bo (px)
function roundLandCorner(g, map, tx, ty, x, y) {
  const cf = (dx, dy) => { const t = map.tileAt(tx + dx, ty + dy); return t === CLIFF; };
  if (!cf(0, 1)) return;
  for (const dx of [-1, 1]) {
    if (!cf(dx, 0) || !cf(dx, 1)) continue;
    const cx = dx < 0 ? x + CR : x + T - CR, cy = y + T - CR;
    g.save(); g.beginPath(); g.rect(dx < 0 ? x : x + T - CR, y + T - CR, CR, CR); g.arc(cx, cy, CR, 0, 6.283, true); g.clip('evenodd');
    vnTile(g, 8 + Math.floor(hash(tx, ty + 1, 82) * 8), x, y + T - 4); g.restore();   // lấp góc bằng phần mép trên của ô vách
    g.fillStyle = '#3f7a35';
    for (let i = 0; i <= 8; i++) { const a = (dx < 0 ? Math.PI / 2 : 0) + i / 8 * Math.PI / 2; const px = Math.round(cx + Math.cos(a) * (CR - 0.5)), py = Math.round(cy + Math.sin(a) * (CR - 0.5)); g.fillRect(px - (dx < 0 ? 0 : 1), py - 1, 2, 2); }
  }
}
function paintCliffVN(g, map, tx, ty, x, y) {   // (17/11) chỉ dùng ô mặt vách (0-7, mép chung) + ô mép trên (8-15); mép giáp mây/cỏ/đáy vẽ phủ theo đường cong
  const up = map.tileAt(tx, ty - 1), v = Math.floor(hash(tx, ty, 82) * 8);
  vnTile(g, isWalkT(up) || up === WATER ? 8 + v : v, x, y);
  const cl = (dx, dy) => map.tileAt(tx + dx, ty + dy) === CLOUD, wk = (dx, dy) => isWalkT(map.tileAt(tx + dx, ty + dy));
  const wav = (k, s) => Math.max(1, Math.round(3.5 + 2.5 * Math.sin(k / 7 + s * 1.3) + 1.5 * Math.sin(k / 3.1 + s)));
  // giáp mây trái/phải: mây gợn sóng liên tục
  for (const dx of [-1, 1]) if (cl(dx, 0)) for (let r = 0; r < T; r++) {
    const w = wav(ty * T + r, tx); g.fillStyle = '#c3c6e4'; g.fillRect(dx < 0 ? x : x + T - w, y + r, w, 1);
    g.fillStyle = 'rgba(150,150,196,.7)'; g.fillRect(dx < 0 ? x + w : x + T - w - 1, y + r, 1, 1);
  }
  // chân vách tan vào mây: các hàng cuối mờ dần sang màu mây theo đường gợn
  if (cl(0, 1)) for (let c = 0; c < T; c++) {
    const hgt = wav(tx * T + c, ty) + 2; g.fillStyle = 'rgba(195,198,228,.55)'; g.fillRect(x + c, y + T - hgt - 3, 1, 3);
    g.fillStyle = '#c3c6e4'; g.fillRect(x + c, y + T - hgt, 1, hgt);
  }
  // cạnh vách giáp cỏ (đảo bậc thang): cỏ phủ mép bên + bóng tối, góc trên bo tròn
  for (const dx of [-1, 1]) if (wk(dx, 0)) {
    for (let r = 0; r < T; r++) { const w = 2 + ((hash(tx, ty * T + r, 93) * 2) | 0); const gx = dx < 0 ? x : x + T - w;
      g.fillStyle = '#4f8a3c'; g.fillRect(gx, y + r, w, 1); g.fillStyle = 'rgba(30,25,50,.45)'; g.fillRect(dx < 0 ? x + w : x + T - w - 1, y + r, 1, 1); }
    if (wk(0, -1)) {   // góc lõm: đất ở trên và bên -> cỏ phủ thành cung tròn nối mép trên với mép bên
      const cx = dx < 0 ? x : x + T, R = CR + 2;
      g.fillStyle = '#4f8a3c'; g.beginPath(); g.moveTo(cx, y); g.arc(cx, y, R, dx < 0 ? 0 : Math.PI / 2, dx < 0 ? Math.PI / 2 : Math.PI); g.closePath(); g.fill();
      g.fillStyle = 'rgba(30,25,50,.4)'; for (let i = 0; i <= 8; i++) { const a = (dx < 0 ? 0 : Math.PI / 2) + i / 8 * Math.PI / 2; g.fillRect(Math.round(cx + Math.cos(a) * R) - (dx < 0 ? 0 : 1), Math.round(y + Math.sin(a) * R), 1, 1); }
    }
  }
}
// (17/11) bờ nước: ô bờ cũ của tileset (trên/dưới/trái/phải); ô góc (nếu có trong tileset: hàng 6–7) cho góc ngoài/trong
const VN_CORNER = { out: { nw: 48, ne: 49, sw: 50, se: 51 }, inn: { nw: 56, ne: 57, sw: 58, se: 59 } };
let VN_HAS_CORNER = false;
export function setVachNuocCorners(ok) { VN_HAS_CORNER = ok; }
function paintWaterVN(g, map, tx, ty, x, y) {
  const land = (dx, dy) => { const t = map.tileAt(tx + dx, ty + dy); return isWalkT(t) || t === CLIFF; }, v = Math.floor(hash(tx, ty, 83) * 2);
  const n = land(0, -1), s = land(0, 1), w = land(-1, 0), e = land(1, 0);
  let id;
  if (VN_HAS_CORNER && n && w) id = VN_CORNER.out.nw; else if (VN_HAS_CORNER && n && e) id = VN_CORNER.out.ne;
  else if (VN_HAS_CORNER && s && w) id = VN_CORNER.out.sw; else if (VN_HAS_CORNER && s && e) id = VN_CORNER.out.se;
  else if (n) id = 32 + v; else if (s) id = 34 + v; else if (w) id = 36; else if (e) id = 37;
  else if (map.tileAt(tx, ty + 1) === FALL) id = 24 + Math.floor(hash(tx, ty, 85) * 8);   // (17/11) ô nước ngay trên đỉnh thác: nước tràn trọn bề ngang, không vẽ góc bờ cỏ đè lên thác
  else if (VN_HAS_CORNER && land(-1, -1)) id = VN_CORNER.inn.nw; else if (VN_HAS_CORNER && land(1, -1)) id = VN_CORNER.inn.ne;
  else if (VN_HAS_CORNER && land(-1, 1)) id = VN_CORNER.inn.sw; else if (VN_HAS_CORNER && land(1, 1)) id = VN_CORNER.inn.se;
  else id = 24 + Math.floor(hash(tx, ty, 85) * 8);
  vnTile(g, id, x, y);
}
function paintCliff(g, map, tx, ty, x, y) {   // mặt vách dọc: nhìn 3/4 thấy mặt đá dưới mép đảo; càng xuống càng tối
  let depth = 0; while (depth < 6 && map.tileAt(tx, ty - depth - 1) === CLIFF) depth++;
  const top = isWalkT(map.tileAt(tx, ty - 1)) || map.tileAt(tx, ty - 1) === WATER;
  const shade = [['#7d7e9a', '#6a6b86', '#565771'], ['#717290', '#5e5f7a', '#4c4d66'], ['#666784', '#54556f', '#43445b']][Math.min(2, depth >> 1)];
  g.fillStyle = shade[1]; g.fillRect(x, y, T, T);
  for (let i = 0; i < 3; i++) { const cx0 = x + Math.floor(hash(tx, ty, 52 + i) * 14); g.fillStyle = shade[2]; g.fillRect(cx0, y, 1, T); g.fillStyle = shade[0]; g.fillRect(cx0 + 1, y, 1, T); }
  if (hash(tx, ty, 55) < 0.5) { const ly = y + 4 + Math.floor(hash(tx, ty, 56) * 8); g.fillStyle = shade[0]; g.fillRect(x, ly, T, 1); g.fillStyle = shade[2]; g.fillRect(x, ly + 1, T, 1); }
  if (top) {   // mép đảo: viền cỏ rủ xuống + bóng
    g.fillStyle = '#3f7a35'; g.fillRect(x, y, T, 3);
    for (let i = 0; i < 4; i++) g.fillRect(x + Math.floor(hash(tx, ty, 57 + i) * 15), y + 3, 1, 1 + Math.floor(hash(tx, ty, 61 + i) * 3));
    g.fillStyle = 'rgba(20,20,40,.35)'; g.fillRect(x, y + 3, T, 2);
  }
  const side = (dx) => isWalkT(map.tileAt(tx + dx, ty));
  if (side(-1)) { g.fillStyle = '#3c3d52'; g.fillRect(x, y, 1, T); } if (side(1)) { g.fillStyle = '#3c3d52'; g.fillRect(x + T - 1, y, 1, T); }
}
function paintCloud(g, tx, ty, x, y) { g.fillStyle = '#c3c6e4'; g.fillRect(x, y, T, T); }
function cloudPuffs(g, map, tx0, ty0) {   // dải mây: cụm nhiều bông dẹt chồng nhau, bóng tím nhạt dưới (vẽ cả lề để không đứt mép khối)
  for (let ty = ty0 - 4; ty < ty0 + CH + 4; ty++) for (let tx = tx0 - 5; tx < tx0 + CH + 5; tx++) {
    if (map.tileAt(tx, ty) !== CLOUD || hash(tx, ty, 63) > 0.035) continue;
    const n = 3 + Math.floor(hash(tx, ty, 64) * 3), bx = tx * T + 8, by = ty * T + 8, sc = 0.8 + hash(tx, ty, 65) * 0.8;
    const blobs = Array.from({ length: n }, (_, i) => ({ x: bx + (i - n / 2) * 14 * sc + hash(tx, ty, 70 + i) * 8, y: by + hash(tx, ty, 80 + i) * 6, r: (9 + hash(tx, ty, 90 + i) * 9) * sc }));
    g.fillStyle = 'rgba(150,150,196,.6)'; for (const b of blobs) { g.beginPath(); g.ellipse(b.x + 2, b.y + 4, b.r * 1.3, b.r * 0.75, 0, 0, 6.283); g.fill(); }
    g.fillStyle = '#eceefa'; for (const b of blobs) { g.beginPath(); g.ellipse(b.x, b.y, b.r * 1.3, b.r * 0.75, 0, 0, 6.283); g.fill(); }
    g.fillStyle = '#ffffff'; for (const b of blobs) { g.beginPath(); g.ellipse(b.x - b.r * 0.3, b.y - b.r * 0.25, b.r * 0.7, b.r * 0.35, 0, 0, 6.283); g.fill(); }
  }
}
function buildChunk(map, cx, cy, phase, props) {
  const c = document.createElement('canvas'); c.width = c.height = CPX;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.translate(-cx * CPX, -cy * CPX);
  const tx0 = cx * CH, ty0 = cy * CH;
  for (let ty = ty0; ty < ty0 + CH; ty++) for (let tx = tx0; tx < tx0 + CH; tx++) {
    const t = map.tileAt(tx, ty), x = tx * T, y = ty * T;
    if (t === WATER && !((map.sect || map.kind === 'arena') && VN)) { g.drawImage(waterTiles[(phase + tx + ty) & 1], x, y); if (map.tileAt(tx, ty - 1) !== WATER) g.drawImage(waterBank, x, y); }
    else if ((map.sect || map.rooms) && t === DIRT) paintDirtYard(g, map, tx, ty, x, y);   // M9-B: sân đất hang Lang Vương dùng chung kiểu sân chuồng
    else if ((map.sect || map.kind === 'arena') && VN && t === WATER) paintWaterVN(g, map, tx, ty, x, y);   // (17/11) bí cảnh dùng chung nước/bờ/góc của sảnh
    else if (map.sect && VN && (t === CLIFF || t === FALL)) paintCliffVN(g, map, tx, ty, x, y);
    else if ((map.sect || (map.rooms && (t === STONE || t === GRASS))) && CODA && (t === STONE || t === GRASS || t === BUILDING || t === FENCE || t === DIRT)) { paintCoDa(g, map, tx, ty, x, y); if (VN && map.sect) roundLandCorner(g, map, tx, ty, x, y); }   // M9-B: bí cảnh phòng dùng bộ cỏ/đá bo mép như sảnh
    else if (map.sect && t === STONE) paintPath(g, map, tx, ty, x, y);
    else if (map.sect && (t === CLIFF || t === FALL)) paintCliff(g, map, tx, ty, x, y);
    else if (map.sect && t === CLOUD) paintCloud(g, tx, ty, x, y);
    else if (map.deep && map.deep[ty * map.w + tx]) paintCanopy(g, tx, ty, x, y);   // M9-B: rừng sâu giữa các phòng
    else if (CODA && map.pillarTile && map.pillarTile.has(ty * map.w + tx)) paintCoDa(g, map, tx, ty, x, y);   // nền đá dưới cột đàn tế
    else g.drawImage(groundTile(t, tx, ty, map), x, y);
  }
  // (17/11) bỏ bông mây vẽ sẵn: sương mù/mây trôi vẽ động mỗi khung (drawFogFx)
  // trang trí: cả các ô ngay dưới/bên khối (hình cao ~36 px, rộng ~42 px lấn vào khối này)
  if (props) for (let ty = ty0; ty < ty0 + CH + 3; ty++) for (let tx = tx0 - 3; tx < tx0 + CH + 3; tx++) {
    const t = map.tileAt(tx, ty), d = hash(tx, ty, 8), x = tx * T, y = ty * T;
    let img = null;
    if (t === GRASS && d < 0.05) img = props[pick(DECOR_KINDS, d / 0.05)];
    else if (t === WATER && d < 0.05 && map.tileAt(tx, ty - 1) === WATER && !((map.sect || map.kind === 'arena') && VN)) img = props.sen;   // sảnh: sen vẽ trên gợn nước (drawWaterFx)
    if (img && map.sect && map._nhaRects && t === GRASS && decorOverNha(map, props, tx, ty, img, map._nhaRects)) continue;
    if (img) g.drawImage(img, x + 8 - img.ax, y + T - 1 - img.ay);
  }
  return c;
}
function drawMapCached(ctx, map, camX, camY, time, objs, vis) {
  const props = vis.props;
  if (map.sect && !map._nhaRects && (vis.nha || vis.plaza)) { map._nhaRects = nhaRects(map, vis); vis.mapCache = null; }   // (17/11) cỏ chạm nhà vẽ ở lớp vật thể
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
  let name = prefix + '_' + mobState(m, time); const flip = mobFlip(m);
  if (m.pat === 'summon' && m.st === 'windup' && sh.meta.frames[prefix + '_cast']) name = prefix + '_cast';   // (24/11) Triệu Ma Ảnh: tư thế chỉ tay + cầu ma khí
  if (m.elite) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { ctx.globalAlpha = 0.8; sheetFrame(ctx, sh, name, m.x + dx, m.y + dy, flip, sh.glow); }
  ctx.globalAlpha = 1;
  if (m.shade) {   // (24/11) ma ảnh Yêu Vương gọi: viền tím, thân bóng tối; mờ dần 2 giây cuối trước khi tan
    const fade = Math.min(1, (m.life ?? 9) / 2);
    ctx.globalAlpha = 0.9 * fade; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1]]) sheetFrame(ctx, sh, name, m.x + dx, m.y + dy, flip, sh.glow, k);
    ctx.globalAlpha = 0.85 * fade; ctx.filter = 'brightness(0.35)'; sheetFrame(ctx, sh, name, m.x, m.y, flip, sh.img, k); ctx.filter = 'none';
    ctx.globalAlpha = 0.35 * fade; sheetFrame(ctx, sh, name, m.x, m.y, flip, sh.glow, k); ctx.globalAlpha = 1;
  } else sheetFrame(ctx, sh, name, m.x, m.y, flip, sh.img, k);
  if (m.hit > 0) { ctx.globalAlpha = 0.55; sheetFrame(ctx, sh, name, m.x, m.y, flip, sh.white, k); ctx.globalAlpha = 1; }
}

// M10-11: bóng mờ boss ở điểm sắp hiện ra (Ảnh Độn / giải kẹt) hoặc điểm đáp (Vồ Đầu Đàn) — dễ phân biệt với vòng quái thường
function bossGhostAt(m) {
  if (m.st === 'blink' && m.blinkX !== undefined) return [m.blinkX, m.blinkY, 1 - Math.max(0, m.stT) / (m.stMax || 1)];
  if (m.pat === 'leap' && (m.st === 'windup' || m.st === 'leap') && m.leapX !== undefined) return [m.leapX, m.leapY, m.st === 'leap' ? 1 : 1 - Math.max(0, m.stT) / (m.stMax || 1)];
  return null;
}
function drawBossGhost(ctx, m, time, vis) {
  const g = bossGhostAt(m); if (!g) return;
  const [gx, gy, prog] = g, bs = bossSheet(m, vis), pulse = 0.18 + 0.12 * prog + 0.05 * Math.sin(time * 12);
  ctx.globalAlpha = pulse;
  if (bs) sheetFrame(ctx, bs, m.bossKind + '_atk', gx, gy, mobFlip(m), bs.white, BOSS.DRAW_SCALE);
  else { const spr = BOSS_WHITE[m.bossKind], w = spr.width * 3, h = spr.height * 3; ctx.drawImage(spr, Math.round(gx - w / 2), Math.round(gy - h + 3), w, h); }
  ctx.globalAlpha = 1;
}
function drawBossLabel(ctx, m) {   // M10-11: tên chiêu trên đầu boss trong lúc gồng (chỉ bộ chiêu mới)
  if (!m.v2 || !(m.st === 'windup' || m.st === 'blink' || m.st === 'sweep')) return;
  const L = BOSS_SKILL_LABELS[m.patLabel] || BOSS_SKILL_LABELS[m.pat]; if (!L) return;   // (24/11) chiêu liên hoàn / Tam Xung: tên riêng
  txt(ctx, L[0], Math.round(m.x), Math.round(m.y) - 50 * BOSS.DRAW_SCALE - 6, L[1], 10);
}

// ---------- (24/11) biến hình chuyển pha 2 + ngoại hình/aura pha 2 (ChatGPT đề xuất, phương án B) ----------
// Lang Vương -> "Huyết Nguyệt Cuồng Lang" (sprites/boss_mini2), Ma Ảnh Yêu Vương -> "Huyết Lôi Ma Quân" (sprites/boss_final2).
// Nhịp (giây, BOSS_P2[kind].T): mắt đỏ rực trước -> rung/tà khí cuộn -> tư thế gồng + cột năng lượng che (PILLAR) -> bùng nổ (BURST)
// -> lộ ngoại hình mới (REVEAL) -> sói dậm đất / ma giơ tay sẵn sàng triệu hồi (END). Aura pha 2 là lớp riêng, giảm còn
// AURA_WINDUP khi boss gồng chiêu để không che cảnh báo. Mắt đỏ kéo vệt khi di chuyển / quay đầu.
const P2_COL = { MINI: ['#ffd978', '#ff7a3a', '#ff2a2a'], FINAL: ['#ff9ad6', '#e070ff', '#ff3a6a'] };
const h01 = i => { const v = Math.sin(i * 91.7 + 17.3) * 43758.5453; return v - Math.floor(v); };
const p2Elapsed = m => (m.stMax || 1) - Math.max(0, m.stT);
// vị trí thế giới của điểm (ex, ey) trong khung sprite (tính cả lật hình)
function framePt(sh, x, y, flip, ex, ey, K) {
  const [ax, ay] = sh.meta.pivot, py = Math.round(y) - (ay + 1) * K + 1;
  return [flip ? Math.round(x) + (ax - ex) * K + K / 2 : Math.round(x) - ax * K + ex * K + K / 2, py + ey * K + K / 2];
}
function eyeOf(sh, name) { const e = sh && sh.meta.eyes && (sh.meta.eyes[name] || sh.meta.eyes[name.replace(/\d+$/, '')]); return e && e.length ? e : null; }
// Mắt đỏ: chấm sáng + vệt kéo theo các vị trí trước (chỉ để vẽ, lưu trên m._eyeH)
function drawEyes(ctx, m, time, pts, power = 1) {
  if (!pts.length) return;
  const H = m._eyeH || (m._eyeH = []);
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  H.push([cx, cy, time]); while (H.length && time - H[0][2] > 0.18) H.shift();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 1; i < H.length; i++) {   // vệt: nối các vị trí cũ -> mới, mờ dần
    const a = i / H.length; ctx.strokeStyle = '#ff2a2a'; ctx.globalAlpha = 0.55 * a * power; ctx.lineWidth = 1 + 2 * a;
    ctx.beginPath(); ctx.moveTo(H[i - 1][0], H[i - 1][1]); ctx.lineTo(H[i][0], H[i][1]); ctx.stroke();
  }
  const pul = 0.75 + 0.25 * Math.sin(time * 8);
  for (const [ex, ey] of pts) {
    ctx.globalAlpha = 0.35 * pul * power; ctx.fillStyle = '#ff3a2a'; ctx.beginPath(); ctx.arc(ex, ey, 5, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 0.9 * power; ctx.fillStyle = '#ffd0c0'; ctx.fillRect(Math.round(ex) - 1, Math.round(ey) - 1, 2, 2);
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}
// Hiệu ứng nền biến hình: hạt tụ về thân, cột năng lượng (chỉ trong PILLAR), sóng xung kích sau BURST, bụi dậm đất (sói)
function drawTransformFx(ctx, m, time, back) {
  const P = BOSS_P2[m.bossKind], T = P.T, t = p2Elapsed(m), C = P2_COL[m.bossKind], K = BOSS.DRAW_SCALE, x = m.x, cy = m.y - 22 * K;
  if (back) {
    if (t < T.BURST) for (let i = 0; i < 34; i++) {   // tụ năng lượng / tà khí cuộn vào thân
      const ph = (t * 0.9 + h01(i)) % 1, a = h01(i + 3) * 6.283 + ph * 2.2, r = (1 - ph) * 130;
      ctx.globalAlpha = ph * 0.9 * Math.min(1, t / T.EYES); ctx.fillStyle = C[i % 3];
      ctx.fillRect(Math.round(x + Math.cos(a) * r) - 1, Math.round(cy + Math.sin(a) * r * 0.7) - 1, 3, 3);
    }
    if (t >= T.BURST) for (const [d, w] of [[0, 3], [0.15, 2]]) {   // sóng xung kích (chỉ hiệu ứng)
      const g = Math.min(1, Math.max(0, (t - T.BURST) / 0.6 - d)); if (g <= 0 || g >= 1) continue;
      ctx.globalAlpha = 0.9 * (1 - g); tgRing(ctx, x, m.y, 20 + g * 170, 72, C[w === 3 ? 1 : 0], w, 0.45);
    }
    if (m.bossKind === 'MINI' && t >= T.END) {   // dậm đất: vòng bụi
      const g = Math.min(1, (t - T.END) / 0.25); ctx.globalAlpha = 0.8 * (1 - g); tgRing(ctx, x, m.y, 14 + g * 50, 40, '#e8dcc8', 2, 0.35);
    }
    ctx.globalAlpha = 1; return;
  }
  const [p0, p1] = T.PILLAR;
  if (t >= p0 && t < p1) {   // cột năng lượng che boss đúng lúc đổi ngoại hình
    const g = (t - p0) / (p1 - p0), a = Math.sin(Math.PI * g), w = Math.round(14 + 26 * a), x0 = Math.round(x - w / 2);
    ctx.globalAlpha = 0.75 * a; ctx.fillStyle = C[1]; ctx.fillRect(x0, 0, w, Math.round(m.y));
    ctx.globalAlpha = 0.9 * a; ctx.fillStyle = '#fff6e8'; ctx.fillRect(x0 + Math.round(w / 3), 0, Math.max(2, Math.round(w / 3)), Math.round(m.y));
    if (m.bossKind === 'FINAL') for (let i = 0; i < 4; i++) {   // sét hội tụ về ngực
      const a0 = h01(Math.floor(t * 12) + i * 5) * 6.283, r = 60; let px = x + Math.cos(a0) * r, py = cy + Math.sin(a0) * r * 0.7;
      ctx.strokeStyle = '#ffc8f0'; ctx.lineWidth = 1; ctx.globalAlpha = 0.9 * a; ctx.beginPath(); ctx.moveTo(px, py);
      for (let j = 1; j <= 4; j++) { px += (x - px) / (5 - j) + (h01(i * 13 + j + Math.floor(t * 12)) - 0.5) * 8; py += (cy - py) / (5 - j); ctx.lineTo(px, py); }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}
// Tư thế + thân trong lúc biến hình
function drawTransformBody(ctx, m, time, vis) {
  const P = BOSS_P2[m.bossKind], T = P.T, t = p2Elapsed(m), K = BOSS.DRAW_SCALE, flip = mobFlip(m), fin = m.bossKind === 'FINAL';
  const sh1 = fin ? vis.bossFinal : vis.bosses, sh2 = fin ? vis.bossFinal2 : vis.bossMini2;
  let sh, name;
  if (t < T.POSE) { sh = sh1; name = fin ? 'FINAL_walk0' : 'MINI_walk0'; }
  else if (t < T.REVEAL) { sh = sh1; name = fin ? 'FINAL_atk' : 'MINI_atk'; }
  else if (t < T.END) { sh = sh2 || sh1; name = sh2 ? (fin ? 'FINAL2_roar' : 'MINI2_howl') : name; }
  else { sh = sh2 || sh1; name = sh2 ? (fin ? 'FINAL2_cast' : 'MINI2_atk') : (fin ? 'FINAL_cast' : 'MINI_atk'); }
  if (!sh || !sh.meta.frames[name]) { sh = sh1; name = fin ? 'FINAL_walk0' : 'MINI_walk0'; }
  if (!sh) return;
  const shake = t >= T.EYES && t < T.REVEAL ? Math.round(rand(-1, 1) * (1 + 2 * (t - T.EYES) / (T.REVEAL - T.EYES))) : 0;
  const x = m.x + shake, y = m.y;
  if (fin && t < T.EYES) {   // Yêu Vương: ánh sáng quanh thân tắt, chỉ còn đôi mắt
    ctx.globalAlpha = 0.5 * t / T.EYES; ctx.fillStyle = '#05020c'; ctx.beginPath(); ctx.ellipse(x, y - 25 * K, 46 * K, 36 * K, 0, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
  }
  const dim = t < T.POSE ? (fin ? 0.25 : 0.55) : 1;
  if (dim < 1) ctx.filter = 'brightness(' + dim + ')';
  sheetFrame(ctx, sh, name, x, y, flip, sh.img, K);
  ctx.filter = 'none';
  if (t >= T.EYES && t < T.REVEAL && sh.rage) {   // vệt đỏ hiện trên thân / vương miện lóe đỏ
    ctx.globalAlpha = 0.06 + 0.16 * Math.max(0, Math.sin(time * 14)); sheetFrame(ctx, sh, name, x, y, flip, sh.rage, K); ctx.globalAlpha = 1;   // chớp đỏ nhẹ, không nhuộm cả thân
  }
  if (t >= T.REVEAL && t < T.REVEAL + 0.2) { ctx.globalAlpha = 0.8 * (1 - (t - T.REVEAL) / 0.2); sheetFrame(ctx, sh, name, x, y, flip, sh.white, K); ctx.globalAlpha = 1; }
  // mắt đỏ rực từ nhịp đầu
  const e = eyeOf(sh, name);
  const pts = e ? e.map(([ex, ey]) => framePt(sh, x, y, flip, ex, ey, K)) : [[x + (flip ? -1 : 1) * 17 * K, y - 21 * K]];
  drawEyes(ctx, m, time, fin && e && e.length > 4 ? pts.slice(0, 4) : pts, 1.4);
}
// Lang Vương pha 2: sheet dựng xương (12 khung đi + gồng + hú), bước theo tốc độ chạy; aura lửa dọc bờm/lưng/đuôi
function drawWolfP2(ctx, m, time, sh, vis) {
  const K = BOSS.DRAW_SCALE, x = Math.round(m.x), y = Math.round(m.y), pul = 0.5 + 0.5 * Math.sin(time * 5), pose = wolfP2Pose(m, vis, time);   // (25/11) tư thế gồng / bật / bay / đáp
  const flip = pose && pose.flip !== undefined ? pose.flip : m.ult ? m.x > m.ult.cx : mobFlip(m);
  const dt = Math.min(0.1, Math.max(0, time - (m._lt ?? time))); m._lt = time;
  const sp = Math.hypot(m.vx || 0, m.vy || 0);
  m._wph = ((m._wph || 0) + dt * Math.min(24, sp / (29.03 / 12))) % 12;   // khung/giây = tốc độ / (sải ÷ 12 khung): chân không trượt
  const name = pose ? pose.name : m.st === 'windup' ? 'MINI2_atk' : 'MINI2_walk' + (sp > 1 ? Math.floor(m._wph) : 0);
  if (pose) sh = pose.sh;
  const auraK = m.st === 'windup' ? BOSS_P2.MINI.AURA_WINDUP : 1;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - 20 * K, y - 4, 40 * K, 7);   // sói thật: có bóng
  // lớp aura phía sau: vòng đỏ dưới chân + viền lửa
  ctx.globalAlpha = (0.45 + 0.25 * pul) * auraK; tgRing(ctx, x, y, 22 * K, 44, '#ff4a2a', 2, 0.35);
  ctx.globalAlpha = (0.5 + 0.3 * pul) * auraK;
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [-2, -2], [2, -2]]) sheetFrame(ctx, sh, name, x + dx, y + dy, flip, sh.rage, K);
  ctx.globalAlpha = 1;
  if (m.st === 'windup') { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35; for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) sheetFrame(ctx, sh, name, x + dx, y + dy, flip, sh.white, K); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
  sheetFrame(ctx, sh, name, x, y, flip, sh.img, K);
  if (m.hit > 0) { ctx.globalAlpha = 0.55; sheetFrame(ctx, sh, name, x, y, flip, sh.white, K); ctx.globalAlpha = 1; }
  // lửa chạy dọc bờm, lưng, đuôi (không bao kín thân)
  const line = [[-22, -15], [-14, -22], [-6, -26], [2, -27], [10, -26], [16, -24]];   // đuôi -> bờm (px sprite tính từ pivot, mặt quay phải)
  for (let i = 0; i < 20; i++) {
    const [lx, ly] = line[i % line.length], ph = (time * (0.9 + h01(i) * 0.6) + h01(i + 40)) % 1;
    const px = Math.round(x + (flip ? -1 : 1) * (lx + (h01(i + 9) - 0.5) * 6) * K / 2 * 2), py = Math.round(y + ly * K - ph * 14 * K);
    ctx.globalAlpha = Math.min(1, ph * 5) * (1 - ph) * auraK; ctx.fillStyle = i % 3 === 0 ? '#ffd978' : i % 3 === 1 ? '#ff7a3a' : '#ff2a2a';
    ctx.fillRect(px - 1, py, 3, 3); ctx.globalAlpha *= 0.5; ctx.fillRect(px, py + 3, 1, 3);
  }
  ctx.globalAlpha = 1;
  const e = eyeOf(sh, name); if (e) drawEyes(ctx, m, time, e.map(([ex, ey]) => framePt(sh, x, y, flip, ex, ey, K)), auraK < 1 ? 0.6 : 1);
}

// (24/11) Ma Ảnh Yêu Vương trong trận: hồn ma nên KHÔNG có bóng đen dưới chân — thay bằng vòng ma ấn xoay.
// Luôn bay lơ lửng (8 khung), viền tà khí phập phồng, lửa tà khí bốc lên, mắt + ngọc phát sáng, bóng mờ kéo theo khi di chuyển.
// Pha 2 "Huyết Lôi Ma Quân" (sprites/boss_final2): cánh khói + lõi ma ấn, viền đỏ hồng, vòng phù văn thứ hai, sét trên sừng/vai,
// mắt đỏ kéo vệt. Aura giảm còn AURA_WINDUP khi gồng chiêu.
function drawWraithBoss(ctx, m, time, sh1, vis) {
  const p2 = m.p2 && m.st !== 'phase' && vis.bossFinal2, P = p2 ? 'FINAL2' : 'FINAL', pose = p2 ? wraithP2Pose(m, vis) : null;   // (25/11) tư thế thi triển
  const sh = pose ? pose.sh : p2 ? vis.bossFinal2 : sh1;
  const K = BOSS.DRAW_SCALE, flip = mobFlip(m), x = Math.round(m.x), y = Math.round(m.y), M = sh.meta;
  const name = pose ? pose.name : m.hit > 0 ? P + '_hurt' : m.st === 'windup' ? (m.pat === 'summon' ? P + '_cast' : P + '_atk')
    : P + '_walk' + (Math.floor(time * 7 + (m.ph || 0) * 8) % (M.float || 8));
  const pul = 0.5 + 0.5 * Math.sin(time * 3), auraK = m.st === 'windup' ? BOSS_P2.FINAL.AURA_WINDUP : 1, rim = m.p2 ? sh.rage : sh.glow;
  const tr = m._trail || (m._trail = []);
  if (!tr.length || time - tr[tr.length - 1].t > 0.07) { tr.push({ x, y, name, flip, t: time }); if (tr.length > 5) tr.shift(); }
  const moving = tr.length > 1 && Math.hypot(tr[0].x - x, tr[0].y - y) > 6;
  // dưới chân: vòng ma ấn xoay chậm (hồn ma không có bóng); pha 2 thêm vòng phù văn đỏ xoay ngược
  ctx.globalAlpha = (0.55 + 0.25 * pul) * auraK; tgRing(ctx, x, y - 2, 17 * K, 44, m.p2 ? '#ff9ad6' : '#d890ff', 2, 0.35);
  if (m.p2) { ctx.fillStyle = '#ff5a8a'; for (let i = 0; i < 8; i++) { const a = -time * 1.3 + i * 0.785; ctx.globalAlpha = 0.7 * auraK; ctx.fillRect(Math.round(x + Math.cos(a) * 25 * K) - 1, Math.round(y - 2 + Math.sin(a) * 25 * K * 0.35) - 1, 3, 3); } ctx.globalAlpha = (0.4 + 0.2 * pul) * auraK; tgRing(ctx, x, y - 2, 25 * K, 56, '#ff5a8a', 1, 0.35); }
  if (moving) for (let i = 0; i < tr.length - 1; i++) { ctx.globalAlpha = (0.1 + 0.08 * i) * auraK; const sn = sh.meta.frames[tr[i].name] ? tr[i].name : name; sheetFrame(ctx, sh, sn, tr[i].x, tr[i].y, tr[i].flip, rim, K); }
  // viền tà khí phập phồng quanh thân
  ctx.globalAlpha = ((m.p2 ? 0.55 : 0.45) + 0.3 * pul) * auraK;
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [-2, -2], [2, -2]]) sheetFrame(ctx, sh, name, x + dx, y + dy, flip, rim, K);
  if (m.st === 'windup') { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45; for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 2]]) sheetFrame(ctx, sh, name, x + dx, y + dy, flip, sh.white, K); ctx.globalCompositeOperation = 'source-over'; }
  ctx.globalAlpha = 1;
  sheetFrame(ctx, sh, name, x, y, flip, sh.img, K);
  if (m.hit > 0) { ctx.globalAlpha = 0.55; sheetFrame(ctx, sh, name, x, y, flip, sh.white, K); }
  // lửa / khói tà khí bốc lên ở hai bên mép thân
  for (let i = 0; i < (m.p2 ? 40 : 26); i++) {
    const ph = (time * ((m.p2 ? 0.7 : 0.45) + h01(i) * 0.4) + h01(i + 40)) % 1, side = i % 2 ? 1 : -1;
    const px = Math.round(x + side * (12 + h01(i + 7) * 12) * K + Math.sin(time * 3 + i) * 3), py = Math.round(y - 3 * K - ph * 36 * K);
    const a = Math.min(1, ph * 5) * (1 - ph) * auraK;
    ctx.globalAlpha = a; ctx.fillStyle = m.p2 ? (i % 3 === 0 ? '#ff5a8a' : i % 3 === 1 ? '#ff9ad6' : '#c040ff') : (i % 3 === 0 ? '#ff7ad8' : i % 3 === 1 ? '#e090ff' : '#9a40d8');
    ctx.fillRect(px - 2, py, 4, 4); ctx.globalAlpha = a * 0.65; ctx.fillRect(px - 1, py + 4, 3, 4); ctx.globalAlpha = a * 0.35; ctx.fillRect(px, py + 8, 2, 4);
  }
  ctx.globalAlpha = 1;
  if (m.p2 && auraK === 1 && Math.floor(time * 2.5) % 3 === 0) {   // pha 2: sét đỏ hồng chạy trên sừng / vai, phát từng đợt
    const seed = Math.floor(time * 2.5);
    for (const [ox, oy] of [[-12, -50], [12, -50], [-16, -36], [16, -36]]) {
      if (h01(seed + ox) < 0.45) continue;
      let px = x + (flip ? -ox : ox) * K, py = y + oy * K;
      for (const [col, w] of [['#2a0a3a', 3], ['#ffc8f0', 1]]) {
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.globalAlpha = 0.9; ctx.beginPath(); let qx = px, qy = py; ctx.moveTo(qx, qy);
        for (let j = 1; j <= 4; j++) { qx = px + Math.sign(ox) * j * 4 * K + (h01(seed * 7 + j + ox) - 0.5) * 8; qy = py - j * 3 * K + (h01(seed * 11 + j) - 0.5) * 6; ctx.lineTo(qx, qy); }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  // mắt: pha 1 phát sáng tại chỗ; pha 2 đỏ rực kéo vệt (lấy 2–4 điểm trên cùng = mắt + ngọc vương miện)
  const eyes = M.eyes && M.eyes[name];
  if (eyes && eyes.length) {
    const pts = eyes.map(([ex, ey]) => framePt(sh, x, y, flip, ex, ey, K));
    if (m.p2) drawEyes(ctx, m, time, pts.sort((a, b) => a[1] - b[1]).slice(0, 4), auraK < 1 ? 0.5 : 1);
    else {
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#ff3a3a';
      for (const [ex, ey] of pts) { ctx.globalAlpha = 0.25 + 0.25 * pul; ctx.fillRect(ex - K / 2 - 1, ey - K / 2 - 1, K + 2, K + 2); }
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  ctx.globalAlpha = 1;
  if (m.vuln > 0) {   // sơ hở: 3 sao vàng xoay trên đầu
    const top = y - 50 * K; ctx.fillStyle = '#ffe066';
    for (let i = 0; i < 3; i++) { const a = time * 5 + i * 2.094; ctx.fillRect(Math.round(x + Math.cos(a) * 14 * K) - 1, Math.round(top - 4 + Math.sin(a) * 3) - 1, 3, 3); }
  }
}
// (24/11) Yêu Vương trong trận dùng sheet dựng từ tư thế cutscene (tools/yeu_vuong_sheet.py); thiếu thì về sheet boss cũ
function bossSheet(m, vis) { return (vis && m.bossKind === 'FINAL' && vis.bossFinal) || (vis && vis.bosses); }
// ---------- (24/11) TUYỆT CHIÊU: hình ảnh (vẽ sau lớp vật thể, trước đạn) ----------
// Lang Vương: vòng vây chấm đỏ, 7 sói bóng CÙNG CỠ boss (hơi trong) + boss thật ở vị trí 0; sói sắp lao mắt sáng, sói lao kèm bóng mờ.
// Yêu Vương: bóng tối chừa vùng sáng quanh người chơi (+ vùng sáng phụ), mắt đỏ, vòng ma trảo vẽ LẠI trên bóng tối, ma trảo trồi.
// ULT_CUT: cutscene tuyệt chiêu đang chiếu (hé dần sói, mắt mở).
let ULT_CUT = null;
function wolfEyes(sh, pose, x, y, flip, K) {   // vị trí mắt theo meta sprite (eyes), không có thì ước lượng
  const e = eyeOf(sh, pose);
  return e ? e.map(([ex, ey]) => framePt(sh, x, y, flip, ex, ey, K)) : [[x + (flip ? -1 : 1) * 17 * K, y - 21 * K]];
}
// Tư thế sói k trong vòng tại u.t (25/11, sheet boss_mini2_lao): gồng -> bật -> bay -> đáp; rảnh = null (dáng đứng cũ).
function ultWolfPose(u, k) {
  for (const d of u.dashes) if (d.k === k) {
    const t = u.t - d.fire;
    if (t >= -0.4 && t < 0) return { name: 'LAO_gong', d, k: 0 };
    if (t >= 0 && t < d.dur) { const p = t / d.dur; return { name: p < 0.16 ? 'LAO_bat' : p > 0.9 ? 'LAO_dap' : 'LAO_bay', d, k: p }; }
    if (t >= d.dur && t < d.dur + 0.6) return { name: 'LAO_dap', d, k: 1, after: t - d.dur };
  }
  return null;
}
// Huyết Ảnh Trảm (beanfx lv_huyet_anh): vệt máu theo sau sói. Đang lao: khung đầy cắt tới chỗ sói; lao xong: 8 khung tan.
function drawHuyetAnh(ctx, vis, d, t) {
  const fx = p2Fx(vis, 'lv_huyet_anh'); if (!fx) return false;
  const prog = t / d.dur, dx = d.x1 - d.x0, dy = d.y1 - d.y0, len = Math.hypot(dx, dy);
  const f = prog < 1 ? 5 : 6 + Math.floor((t - d.dur) * 24);
  if (prog < 0 || f >= vis.FX.lv_huyet_anh.meta.frames) return true;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(d.x0), Math.round(d.y0) - 20); ctx.rotate(Math.atan2(dy, dx)); ctx.scale(len / 244, 2);
  if (prog < 1) { ctx.beginPath(); ctx.rect(-8, -30, 244 * prog - 12 * 244 / len, 60); ctx.clip(); }   // cắt ngang thân sói
  fx.frame = f; fx.x = 0; fx.y = 0; fx.scale = 1; fx.lightGain = 0.35; fx.draw(ctx); ctx.restore();   // sáng vừa để vệt giữ màu đỏ trên nền cỏ
  return true;
}
let DARK_BUF = null;
function drawUlt(ctx, scene, p, time, vis, camX, camY) {
  const m = scene.monsters.find(q => q.boss && !q.dead && q.ult); if (!m) return;
  const u = m.ult, U = BOSS_ULT[m.bossKind], K = BOSS.DRAW_SCALE, cut = ULT_CUT;
  if (m.bossKind === 'MINI') {
    const fin = cut ? 1 : Math.min(1, Math.max(0, (U.DUR - u.t) / 1.2));
    ctx.fillStyle = U.COLOR;   // vòng vây
    const n = Math.round(u.R * 0.8);
    for (let i = 0; i < n; i++) { if ((i + Math.floor(time * 8)) % 3 === 0) continue; const a = i / n * 6.283; ctx.globalAlpha = 0.7 * fin * (cut ? Math.min(1, cut.reveal / 7) : 1); ctx.fillRect(Math.round(u.cx + Math.cos(a) * u.R) - 1, Math.round(u.cy + Math.sin(a) * (u.RY || u.R)) - 1, 2, 2); }   // bầu dục
    const st = (vis && vis.bossMini2) || (vis && vis.bosses), lao = vis && vis.bossMini2Lao, stand = st && (st.meta.frames.MINI2_walk0 ? 'MINI2_walk0' : Object.keys(st.meta.frames)[0]);
    const wolf = (sh, pose, x, y, flip, a) => { if (!sh) return; ctx.globalAlpha = a; sheetFrame(ctx, sh, pose, x, y, flip, sh.img, K);
      if (sh.rage) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.12; sheetFrame(ctx, sh, pose, x, y, flip, sh.rage, K); ctx.globalCompositeOperation = 'source-over'; } };   // ánh đỏ nhẹ (đậm quá thành hồng nhạt)
    const eyes = (sh, pose, x, y, flip, hot, a) => { ctx.globalCompositeOperation = 'lighter';
      for (const [ex, ey] of wolfEyes(sh, pose, x, y, flip, K)) {
        ctx.globalAlpha = (hot ? 0.95 : 0.75) * a; ctx.fillStyle = hot ? '#fff0e0' : '#ff3a2a'; ctx.fillRect(Math.round(ex) - 1, Math.round(ey) - 1, 3, 2);
        ctx.globalAlpha = (hot ? 0.5 : 0.25) * a; ctx.fillStyle = U.COLOR; ctx.beginPath(); ctx.arc(ex, ey, hot ? 7 : 4, 0, 6.283); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over'; };
    if (!cut) for (const d of u.dashes) drawHuyetAnh(ctx, vis, d, u.t - d.fire);   // vệt máu dưới lớp sói
    const eyesOn = !cut || cut.eyesOn;
    for (let k = 1; k < u.clones.length; k++) {   // k = 0 là boss thật (vẽ như boss)
      if (cut && k > cut.reveal) continue;
      const c = u.clones[k], P = cut || !lao ? null : ultWolfPose(u, k), flying = P && P.name !== 'LAO_gong';
      if (flying && !P.after) continue;   // đang lao: vẽ ở dưới
      const charging = !cut && c.hot > u.t && c.hot - u.t < 1.0, gong = P && P.name === 'LAO_gong', flip = gong ? P.d.x1 < P.d.x0 : c.x > u.cx;
      const pop = cut ? Math.min(1, (cut.t - (cut.T.RING[0] + (k - 1) * 0.07)) / 0.12) : 1;   // hiện bằng vài khung mờ
      const back = P && P.after !== undefined ? Math.max(0, (P.after - 0.3) / 0.3) : 1;       // lao xong: hiện lại ở chỗ cũ dần
      const sh = gong ? lao : st, pose = gong ? 'LAO_gong' : stand, a = (charging ? 0.95 : 0.72) * fin * Math.max(0, pop) * back;
      if (a > 0) { wolf(sh, pose, c.x, c.y, flip, a); if (eyesOn && sh) eyes(sh, pose, c.x, c.y, flip, charging, fin * back); }
    }
    if (!cut) for (const d of u.dashes) {   // sói bóng lao: hình chính + 3 bóng mờ, đáp xuống rồi mờ dần ở cuối đường
      if (d.k === 0) continue;
      const t = u.t - d.fire; if (t < 0 || t > d.dur + 0.45) continue;
      const flip = d.x1 < d.x0, P = lao ? ultWolfPose(u, d.k) : null, sh = P ? lao : st, pose = P ? P.name : stand, k = Math.min(1, t / d.dur), out = t > d.dur ? Math.max(0, 1 - (t - d.dur) / 0.45) : 1;
      for (let j = t > d.dur ? 0 : 3; j >= 0; j--) { const kk = Math.max(0, k - j * 0.07); wolf(sh, pose, d.x0 + (d.x1 - d.x0) * kk, d.y0 + (d.y1 - d.y0) * kk, flip, (j ? 0.22 : 0.92) * out); }
      if (sh) eyes(sh, pose, d.x0 + (d.x1 - d.x0) * k, d.y0 + (d.y1 - d.y0) * k, flip, true, out);
    }
    ctx.globalAlpha = 1;
    return;
  }
  // ---- Yêu Vương: bóng tối + mắt đỏ + ma trảo ----
  if (cut) return;   // cutscene tự vẽ bóng tối của nó
  const fin = Math.min(1, Math.max(0, (U.DUR - u.t) / 1.2));   // cutscene đã tắt sáng sẵn -> vào trận tối ngay, không chớp sáng
  // bóng tối vẽ trên lớp riêng rồi KHOÉT từng vùng sáng (destination-out): các vùng sáng chồng nhau vẫn sáng
  if (!DARK_BUF) { DARK_BUF = document.createElement('canvas'); DARK_BUF.width = W; DARK_BUF.height = H; }
  const dg = DARK_BUF.getContext('2d'); dg.globalCompositeOperation = 'source-over'; dg.clearRect(0, 0, W, H); dg.fillStyle = '#05010a'; dg.fillRect(0, 0, W, H); dg.globalCompositeOperation = 'destination-out';
  for (const [lx, ly, lr, la] of [[p.x, p.y - 8, U.LIGHT + 14, 1], ...u.lights.map(l => [l.x, l.y, l.r + 10, Math.min(1, (u.t - l.from) / 0.2) * Math.min(1, Math.max(0, (l.until - u.t) / 0.3))])]) {
    const g = dg.createRadialGradient(lx - camX, ly - camY, lr * 0.7, lx - camX, ly - camY, lr); g.addColorStop(0, `rgba(0,0,0,${la})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    dg.fillStyle = g; dg.beginPath(); dg.arc(lx - camX, ly - camY, lr, 0, 6.2832); dg.fill();
  }
  ctx.globalAlpha = 0.92 * fin; ctx.drawImage(DARK_BUF, camX, camY);
  // dáng Ma Quân mờ trong bóng tối + đôi mắt đỏ (tư thế thi triển: khép -> dang -> giơ cao, chỉ tay mỗi khi một con mắt mở)
  const thi = vis && vis.bossFinal2Thi;
  if (thi) {
    const pose = wraithUltPose(u, U), bx = Math.round(m.x), by = Math.round(m.y), flip = p.x < m.x;
    ctx.globalAlpha = 0.34 * fin; sheetFrame(ctx, thi, pose, bx, by, flip, thi.img, K);
    ctx.globalCompositeOperation = 'lighter';
    for (const [ex, ey] of wolfEyes(thi, pose, bx, by, flip, K)) { ctx.globalAlpha = (0.7 + 0.3 * Math.sin(time * 8)) * fin; ctx.fillStyle = '#ff2a3a'; ctx.fillRect(Math.round(ex) - 1, Math.round(ey) - 1, 4, 2); ctx.globalAlpha = 0.3 * fin; ctx.beginPath(); ctx.arc(ex, ey, 6, 0, 6.283); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
  }
  for (const l of u.lights) {   // viền vàng: chỗ trú (không có ma trảo)
    ctx.globalAlpha = 0.75 * Math.min(1, (u.t - l.from) / 0.2) * Math.min(1, Math.max(0, (l.until - u.t) / 0.3)); tgRing(ctx, l.x, l.y, l.r, 48, '#ffe8a0', 2, 1);
  }
  ctx.globalAlpha = 1;
  for (const h of scene.hazards) if (h.src === 'boss:ultEye') {   // vòng ma trảo vẽ xuyên bóng tối
    const prog = 1 - Math.max(0, h.t) / (h.max || 1);
    ctx.globalAlpha = 0.3; ctx.fillStyle = '#a02060'; ctx.beginPath(); ctx.arc(h.x, h.y, h.r * prog, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 0.95; tgRing(ctx, h.x, h.y, h.r, 40, '#ff3a6a', 2, 1);
  }
  ctx.globalAlpha = 1;
  // Ma Trảo Phá Thổ (beanfx yv_ma_trao): vết nứt 4 khung trước lúc nổ, móng bật lên ở khung 4 = đúng lúc gây sát thương
  const hasFx = !!p2Fx(vis, 'yv_ma_trao');
  for (const e of u.eyes) if (e.locked && !e.clawed && e.fire - u.t < 4 / 24) p2FxAt(ctx, vis, 'yv_ma_trao', Math.floor((u.t - (e.fire - 4 / 24)) * 24), e.zx, e.zy, 1.25);
  for (const c of u.claws) if (hasFx) p2FxAt(ctx, vis, 'yv_ma_trao', 4 + Math.floor((u.t - c.at) * 24), c.x, c.y, 1.25);
    else drawClawCode(ctx, c, u.t);
  for (const e of u.eyes) {   // mắt đỏ; vệt chấm từ mắt tới chỗ nó đang nhìn
    const left = e.fire - u.t, hot = left < 0.25 && left > -0.05, closing = u.t > e.fire ? Math.max(0, 1 - (u.t - e.fire) / 0.35) : 1;
    const tx = e.locked ? e.zx : p.x, ty = e.locked ? e.zy : p.y;
    ctx.fillStyle = '#ff4a6a'; ctx.globalAlpha = 0.45 * closing;
    for (let s = 0.15; s < 0.95; s += 0.08) ctx.fillRect(Math.round(e.x + (tx - e.x) * s), Math.round(e.y + (ty - e.y) * s), 2, 2);
    const h2 = Math.max(1, Math.round(3 * closing * Math.min(1, (u.t - e.open) / 0.15)));
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.6 * closing; ctx.fillStyle = hot ? '#ffffff' : '#ff2a3a'; ctx.beginPath(); ctx.arc(e.x, e.y, 9, 0, 6.283); ctx.fill();
    ctx.globalAlpha = closing; ctx.fillStyle = hot ? '#ffffff' : '#ff6060';
    for (const dx of [-5, 3]) ctx.fillRect(Math.round(e.x + dx), Math.round(e.y - h2 / 2), 3, h2);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.globalAlpha = 1;
}
function wraithUltPose(u, U) {
  if (u.t < 0.35 || u.t > U.DUR - 0.8) return 'THI_khep';
  if (u.t < 0.9) return 'THI_dang';
  return u.eyes.some(e => u.t - e.open < 0.4) ? 'THI_chi' : 'THI_cao';
}
function drawClawCode(ctx, c, t) {   // dự phòng khi thiếu sheet / đồ họa Thấp: 5 móng đen tím nhọn mọc từ đất rồi rút
  const k = (t - c.at) / 0.5, hgt = (k < 0.3 ? k / 0.3 : 1 - (k - 0.3) / 0.7) * 26;
  for (let i = 0; i < 5; i++) {
    const ox = (i - 2) * 6, lean = (i - 2) * 2, x0 = c.x + ox, y0 = c.y + 4;
    ctx.globalAlpha = 0.95; ctx.fillStyle = '#2a0a26'; ctx.beginPath(); ctx.moveTo(x0 - 3, y0); ctx.lineTo(x0 + 3, y0); ctx.lineTo(x0 + lean, y0 - hgt * (0.7 + 0.3 * (i % 2))); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff3a6a'; ctx.fillRect(Math.round(x0 + lean) - 1, Math.round(y0 - hgt * (0.7 + 0.3 * (i % 2))), 2, 2);
  }
  ctx.globalAlpha = 1;
}
// (25/11) Tư thế mới của boss pha 2 trong trận (ngoài tuyệt chiêu): { sh, name } hoặc null (dùng dáng cũ).
function wolfP2Pose(m, vis, time) {
  const lao = vis && vis.bossMini2Lao; if (!lao) return null;
  if (m.ult) { const P = ultWolfPose(m.ult, 0); return P ? { sh: lao, name: P.name, flip: P.d.x1 < P.d.x0 } : null; }
  const air = m.st === 'dash' || m.st === 'leap';
  if (m._air && !air) m._landT = time;
  m._air = air;
  if (m.st === 'leap') return { sh: lao, name: 'LAO_bay', flip: m.leapX < m.lx0 };
  if (m.st === 'dash') return { sh: lao, name: m.stT > BOSS.MINI.DASH.TIME * 0.75 ? 'LAO_bat' : 'LAO_bay', flip: m.dirX < 0 };
  if (m.st === 'windup' && (m.pat === 'dash' || m.pat === 'leap')) return { sh: lao, name: 'LAO_gong', flip: m.pat === 'leap' ? m.leapX < m.x : m.dirX < 0 };
  if (m._landT !== undefined && time - m._landT < 0.3) return { sh: lao, name: 'LAO_dap' };
  return null;
}
const THI_POSE = { thunder: 'THI_chi', clones: 'THI_chi', chainBolt: 'THI_chi', zones: 'THI_chi', cross: 'THI_chi', runes: 'THI_cao', net: 'THI_cao', eight: 'THI_cao', prison: 'THI_cao', burst: 'THI_dang', sweep: 'THI_dang', slam: 'THI_dang' };
function wraithP2Pose(m, vis) {
  const thi = vis && vis.bossFinal2Thi; if (!thi || m.hit > 0) return null;
  if (m.ult) return { sh: thi, name: ULT_CUT ? (ULT_CUT.t < 0.25 ? 'THI_khep' : ULT_CUT.t < 0.5 ? 'THI_dang' : 'THI_cao') : wraithUltPose(m.ult, BOSS_ULT.FINAL) };
  if (m.st === 'sweep') return { sh: thi, name: 'THI_dang' };
  if (m.st !== 'windup' || !THI_POSE[m.pat]) return null;
  return { sh: thi, name: 1 - Math.max(0, m.stT) / (m.stMax || 1) < 0.25 ? 'THI_khep' : THI_POSE[m.pat] };   // thu vuốt rồi bung
}
// (24/11) Cutscene tuyệt chiêu — lớp màn hình (sau zoom). pack: tên chiêu theo vòng cung quanh tâm vòng rồi tan thành 8 vệt đỏ.
// eyes: ánh sáng tắt từng vùng -> đôi mắt Ma Quân (chớp) -> mắt nhỏ mở nhìn người chơi -> vòng sáng quanh người chơi; tên lóe từng chữ.
const ULT_EYES_POS = Array.from({ length: 26 }, (_, i) => [24 + h01(i + 400) * (W - 48), 40 + h01(i + 430) * (H - 80)]);
const ULT_DARK = Array.from({ length: 12 }, (_, i) => [h01(i + 460) * W, h01(i + 470) * H, i / 12]);
function drawUltScreen(ctx, c, vis, time) {
  const z = P2_ZOOM ? P2_ZOOM.z : 1, col = c.titleCol || '#ff4a3a';
  if (c.fx === 'pack') {
    const g = ctx.createRadialGradient(W / 2, H / 2, 90, W / 2, H / 2, W * 0.65); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(40,0,0,0.7)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (c.t >= c.T.EYES && c.t < c.T.EYES + 0.12) { ctx.globalAlpha = 0.25; ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }   // 8 cặp mắt cùng mở
    if (c.titleT >= 0) {   // tên theo vòng cung phía trên tâm vòng
      const ring = c.ring, [cx, cy] = ring && ring.cx !== undefined ? p2Map(ring.cx, ring.cy) : [W / 2, H / 2];
      const chars = [...c.title_], R = Math.max(40, Math.min(90, cy - 46)), out = c.outK;   // cung luôn nằm trong màn hình
      ctx.font = `bold 18px ${FONT}`;
      chars.forEach((ch, i) => {
        const a = -Math.PI * 0.85 + (i + 0.5) / chars.length * Math.PI * 0.7, show = Math.min(1, (c.titleT - i * 0.025) / 0.08); if (show <= 0) return;
        const fly = out > 0 ? out * 120 : 0, x = cx + Math.cos(a) * (R + fly), y = cy + Math.sin(a) * (R + fly);
        ctx.globalAlpha = show * (out > 0 ? 1 - out : 1);
        txt(ctx, ch, Math.round(x), Math.round(y), col, 18);
      });
      if (out > 0) {   // tan thành 8 vệt đỏ hướng ra ngoài
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + 0.2, r0 = R * 0.6 + out * 140, r1 = r0 + 40 * (1 - out); ctx.globalAlpha = 0.8 * (1 - out); pxLine(ctx, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, col, 2); }
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = 1;
    }
    return;
  }
  // ---- eyes ----
  const [pxs, pys] = p2Map(c.px, c.py - 8), lightR = (BOSS_ULT.FINAL.LIGHT + 14) * z * c.lightK;
  ctx.fillStyle = '#05010a';
  if (c.dark < 1) {   // tắt sáng từng vùng
    for (const [x, y, d] of ULT_DARK) { const k = Math.max(0, Math.min(1, (c.dark - d * 0.6) / 0.4)); if (k <= 0) continue; ctx.globalAlpha = 0.93; ctx.beginPath(); ctx.arc(x, y, k * 170, 0, 6.283); ctx.fill(); }
  } else {
    ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.rect(0, 0, W, H);
    if (lightR > 1) { ctx.moveTo(pxs + lightR, pys); ctx.arc(pxs, pys, lightR, 0, 6.2832); }
    ctx.fill('evenodd');
  }
  ctx.globalAlpha = 1;
  const eye = (x, y, s, a, hot) => {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.55 * a; ctx.fillStyle = hot ? '#ffffff' : '#ff2a3a'; ctx.beginPath(); ctx.arc(x, y, 6 * s, 0, 6.283); ctx.fill();
    ctx.globalAlpha = a; ctx.fillStyle = hot ? '#ffffff' : '#ff6060'; ctx.fillRect(Math.round(x - 2 * s), Math.round(y - s), Math.max(2, Math.round(3 * s)), Math.max(1, Math.round(2 * s)));
    ctx.globalCompositeOperation = 'source-over';
  };
  if (c.bossEyes) {   // đôi mắt Ma Quân (chớp một lần)
    const sh = vis && (vis.bossFinal2 || vis.bossFinal), pose = sh && Object.keys(sh.meta.frames).find(k => /walk0$/.test(k));
    const es = sh && pose ? wolfEyes(sh, pose, c.bx, c.by, false, BOSS.DRAW_SCALE) : [[c.bx - 6, c.by - 60], [c.bx + 6, c.by - 60]];
    for (const [ex, ey] of es.slice(0, 2)) { const [x, y] = p2Map(ex, ey); eye(x, y, c.blink ? 0.3 : 1.6, c.many >= 0 ? 1 - c.many : 1, false); }
  }
  if (c.many >= 0) {   // mắt nhỏ mở dần, nhìn về người chơi; rút vào bóng tối khi vòng sáng mở
    ULT_EYES_POS.forEach(([x, y], i) => {
      const k = Math.min(1, (c.many - i / ULT_EYES_POS.length * 0.7) / 0.15); if (k <= 0) return;
      const dx = pxs - x, dy = pys - y, l = Math.hypot(dx, dy) || 1;
      eye(x + dx / l * 1.5, y + dy / l * 1.5, 0.8, k * (1 - c.lightK), false);
    });
  }
  if (c.titleT >= 0) {   // tên lóe từng chữ như đồng tử rồi tắt
    const chars = [...c.title_]; ctx.font = `bold 20px ${FONT}`;
    const ws = chars.map(ch => ctx.measureText(ch).width), tot = ws.reduce((a, b) => a + b, 0); let x = W / 2 - tot / 2;
    chars.forEach((ch, i) => {
      const k = c.titleT - i * 0.035, a = k < 0 ? 0 : k < 0.08 ? 1 : Math.max(0.35, 1 - (k - 0.08) * 1.5);
      if (a > 0) { if (k < 0.08) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + ws[i] / 2, H * 0.3 - 6, 10, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
        ctx.globalAlpha = a; txt(ctx, ch, Math.round(x + ws[i] / 2), Math.round(H * 0.3), k < 0.08 ? '#ffffff' : col, 20); }
      x += ws[i];
    });
    ctx.globalAlpha = 1;
  }
}
// (24/11) Ma Ảnh Phân Thân: bóng giả mờ tím, nhấp nháy, không có lõi ngực đỏ (boss thật có); vòng báo nơi đạn sẽ tỏa
function drawClones(ctx, m, time, vis) {
  const bs = bossSheet(m, vis), K = BOSS.DRAW_SCALE, prog = 1 - Math.max(0, m.stT) / (m.stMax || 1);
  for (const c of m.clones) {
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(time * 14 + c.x);
    if (bs) { const pose = m.bossKind + (bs.meta.frames[m.bossKind + '_atk'] ? '_atk' : ''); sheetFrame(ctx, bs, bs.meta.frames[pose] ? pose : m.bossKind, c.x, c.y, false, bs.glow || bs.white || bs.img, K); }
    ctx.globalAlpha = 0.9; tgRing(ctx, c.x, c.y - 10, 10 + 16 * prog, 32, '#d9a8ff', 2, 1);
  }
  ctx.globalAlpha = 1;
}
// (24/11) khiên Tuyệt Kỹ: vỏ 12 cạnh xoay, cạnh sáng/tối xen kẽ, nở ra lúc bật (tkOn), nhấp nháy theo nhịp; màu theo BOSS_TK
function drawTkShield(ctx, m, time) {
  const TK = BOSS_TK[m.bossKind], K = BOSS.DRAW_SCALE, cx = Math.round(m.x), cy = Math.round(m.y - 22 * K);
  const grow = m.st === 'tkOn' ? Math.min(1, 1 - m.stT / m.stMax + 0.25) : 1, rx = 27 * K * grow, ry = 30 * K * grow, n = 12, rot = time * 0.9;
  const pul = 0.75 + 0.25 * Math.sin(time * 8);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.1 * pul; ctx.fillStyle = TK.COLOR; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 6.283); ctx.fill();
  for (let i = 0; i < n; i++) {
    const a0 = rot + i / n * 6.283, a1 = rot + (i + 1) / n * 6.283;
    ctx.globalAlpha = (i % 2 ? 0.45 : 0.85) * pul; ctx.strokeStyle = i % 2 ? TK.COLOR : '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(Math.round(cx + Math.cos(a0) * rx), Math.round(cy + Math.sin(a0) * ry)); ctx.lineTo(Math.round(cx + Math.cos(a1) * rx), Math.round(cy + Math.sin(a1) * ry)); ctx.stroke();
    if (i % 3 === 0) { ctx.globalAlpha = 0.9 * pul; ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(cx + Math.cos(a0) * rx) - 1, Math.round(cy + Math.sin(a0) * ry) - 1, 3, 3); }   // đinh phù văn ở đỉnh
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function drawBoss(ctx, m, time, vis) {
  drawBossGhost(ctx, m, time, vis);
  drawBossLabel(ctx, m);
  const bs = bossSheet(m, vis), K = BOSS.DRAW_SCALE;
  if (m.st === 'phase' && bs) {   // biến hình chuyển pha 2
    drawTransformFx(ctx, m, time, true); drawTransformBody(ctx, m, time, vis); drawTransformFx(ctx, m, time, false);
    return;
  }
  if (bs && m.bossKind === 'FINAL' && bs.meta.float) return drawWraithBoss(ctx, m, time, bs, vis);
  if (m.bossKind === 'MINI' && m.p2 && vis && vis.bossMini2) {
    drawWolfP2(ctx, m, time, vis.bossMini2, vis);
  } else if (bs) {
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(Math.round(m.x) - 20 * K, Math.round(m.y) - 4, 40 * K, 7);
    if (m.st === 'windup') {   // gồng chiêu: viền trắng sáng quanh thân
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35;
      const name = m.bossKind + (m.pat === 'summon' && bs.meta.frames[m.bossKind + '_cast'] ? '_cast' : '_atk'), flip = mobFlip(m);
      for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) sheetFrame(ctx, bs, name, m.x + dx, m.y + dy, flip, bs.white, K);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    drawMobSheet(ctx, bs, m, m.bossKind, time, K);
  }
  if (bs) {
    if (m.vuln > 0) {   // sơ hở: 3 sao vàng xoay trên đầu
      const top = Math.round(m.y) - 50 * K; ctx.fillStyle = '#ffe066';
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
  if (m.boss) {   // (23/11) đang cutscene: vẽ bản cutscene thay
    if (m.introHide) return;
    drawBoss(ctx, m, time, vis);
    if (m.tk && !m.tk.quiet && BOSS_TK.SHIELD) drawTkShield(ctx, m, time);
    if (m.clones) drawClones(ctx, m, time, vis);   // (24/11) Ma Ảnh Phân Thân   // (24/11) Tuyệt Kỹ: khiên miễn nhiễm phủ lên thân
    return;
  }
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
  for (const h of scene.hazards || []) { ctx.globalAlpha = 0.5; if (h.x0 !== undefined) stripOutline(ctx, h, '#ff4a3a', 1); else pxRing(ctx, h.x, h.y, h.r, Math.max(40, Math.round(h.r * 1.8)), 0, '#ff4a3a', 1, 1); }
  for (const m of scene.monsters) if (!m.dead && m.boss && m.pat === 'sweep' && (m.st === 'windup' || m.st === 'sweep')) { ctx.globalAlpha = 0.6; sweepOutline(ctx, m, '#ff4a3a', 1, 0); }   // M10-10
  for (const m of scene.monsters) {
    if (m.dead || m.st !== 'windup') continue;
    let L = 0;
    if (m.arch === 'charger') L = ARCH.charger.DASH_SPEED * ARCH.charger.DASH_TIME;
    else if (m.arch === 'chaser') L = WOLF_PACK.POUNCE.SPEED * WOLF_PACK.POUNCE.TIME;   // M10-04: sói chồm
    else if (m.boss && m.pat === 'dash') L = BOSS.MINI.DASH.SPEED * BOSS.MINI.DASH.TIME;
    else if (m.arch === 'elite' && m.sk === 'claw') { ctx.globalAlpha = 0.5; clawOutline(ctx, m, '#ff4a3a', 1); }   // M10-07
    else if (m.boss && m.pat === 'claw') { ctx.globalAlpha = 0.6; clawOutline(ctx, m, '#ff4a3a', 1, 0, BOSS_V2.MINI.CLAW); }   // M10-09: thân boss ×2 hay che quạt
    else if (m.arch === 'elite') { ctx.globalAlpha = 0.5; pxRing(ctx, m.x, m.y, ARCH.elite.SLAM_R, 60, 0, '#ff4a3a', 1, 1); }
    else if (m.boss && m.pat === 'howlDash') {   // M7-13: hú rồi lao — viền lớp trên để thân boss ×2 / tán cây không che
      const prog = 1 - Math.max(0, m.stT) / (m.stMax || 1);
      const ry = 16 + prog * 30;
      ctx.globalAlpha = 0.85; pxRing(ctx, m.x, m.y - 10, ry, Math.round(ry * 6), 0, '#ffd978', 1, 1);
      ctx.globalAlpha = 0.85; pxRing(ctx, m.x, m.y - 10, 52, 320, 0, '#ff4a3a', 1, 1);
    }
    else if (m.arch === 'ranged') { const A = ARCH.ranged, R = A.SHOT_SPEED * A.SHOT_LIFE * 0.6; ctx.globalAlpha = 0.5; for (const [dx, dy] of fanDirs(m)) pxLine(ctx, m.x, m.y - 6, m.x + dx * R, m.y - 6 + dy * R, '#ff4a3a', 1); }   // M10-03: đường bắn cũng không bị tán cây che
    if (L) { ctx.globalAlpha = 0.5; pxLine(ctx, m.x, m.y - 3, m.x + m.dirX * L, m.y - 3 + m.dirY * L, '#ff4a3a', 1); }
  }
  for (const f of scene.fireTrails || []) { ctx.globalAlpha = 0.4 * Math.min(1, (f.life - f.t) / FOX_TRAIL.FADE); pxRing(ctx, f.x, f.y, f.r, 24, 0, '#ff4a3a', 1, 0.6); }   // M10-05: viền vệt lửa không bị tán cây che
  for (const m of scene.monsters) if (!m.dead && m.st === 'blink') { ctx.globalAlpha = 0.8; pxRing(ctx, m.blinkX, m.blinkY, 22, 60, 0, '#d9a8ff', 1, 0.6); }
  ctx.globalAlpha = 1;
}

// M10-07: viền hình quạt Hắc Trảo (cung + hai cạnh) theo hướng đã khóa
function clawOutline(ctx, m, col, size, off = 0, C = ELITE_V2.CLAW) {   // C: { R, ARC } (M10-09: dùng chung cho Liệt Trảo của Lang Vương)
  const a0 = Math.atan2(m.dirY, m.dirX), n = 36;
  ctx.fillStyle = col;
  for (let i = 0; i <= n; i++) { const a = a0 - C.ARC / 2 + C.ARC * i / n; ctx.fillRect(Math.round(m.x + Math.cos(a) * C.R) + off, Math.round(m.y + Math.sin(a) * C.R) + off, size, size); }
  for (const s of [-1, 1]) { const a = a0 + s * C.ARC / 2; pxLine(ctx, m.x + off, m.y + off, m.x + Math.cos(a) * C.R + off, m.y + Math.sin(a) * C.R + off, col, size); }
}

// M10-06: các hướng bắn của Huyền Băng Thú đang gồng (1 hoặc 3 tia)
function fanDirs(m) {
  if (!m.fan) return [[m.dirX, m.dirY]];
  return [0, -ICE_FAN.SPREAD, ICE_FAN.SPREAD].map(a => { const c = Math.cos(a), s = Math.sin(a); return [m.dirX * c - m.dirY * s, m.dirX * s + m.dirY * c]; });
}

// M10-05: Hỏa Vĩ — đốm đang "nạp" = vòng đỏ viền tối + lấp cam dần (vô hại); đang cháy = đốm cam/vàng lập lòe + viền đỏ; cuối đời mờ dần
function drawFireTrails(ctx, scene) {
  for (const f of scene.fireTrails || []) {
    const fade = Math.min(1, (f.life - f.t) / FOX_TRAIL.FADE), rx = f.r, ry = Math.round(f.r * 0.6);
    if (f.t < f.arm) {
      const prog = f.t / f.arm;
      ctx.globalAlpha = 0.25; ctx.fillStyle = '#ff8a3a'; ctx.beginPath(); ctx.ellipse(f.x, f.y, rx * prog, ry * prog, 0, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 0.9; tgRing(ctx, f.x, f.y, rx, 28, '#ff4a3a', 1, 0.6);
    } else {
      ctx.globalAlpha = 0.4 * fade; ctx.fillStyle = '#ff6a1a'; ctx.beginPath(); ctx.ellipse(f.x, f.y, rx, ry, 0, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 0.55 * fade; ctx.fillStyle = '#ffc860'; ctx.beginPath(); ctx.ellipse(f.x, f.y, rx * 0.5, ry * 0.5, 0, 0, 6.283); ctx.fill();
      const fr = Math.floor(f.t * 12);   // lửa lập lòe: vị trí theo đốm + khung, tất định
      for (let k = 0; k < 5; k++) {
        const h = (Math.imul((Math.round(f.x) * 73856093) ^ (Math.round(f.y) * 19349663) ^ ((fr + k * 7) * 83492791), 2654435761) >>> 0);
        const px = Math.round(f.x + ((h & 15) - 7.5) * rx / 8), py = Math.round(f.y + (((h >> 4) & 7) - 3.5) * ry / 4);
        ctx.globalAlpha = 0.9 * fade; ctx.fillStyle = (h >> 8) & 1 ? '#fff0a0' : '#ff9a3a'; ctx.fillRect(px, py - 2 - ((h >> 9) & 3), 1, 2 + ((h >> 11) & 1));
      }
      ctx.globalAlpha = 0.85 * fade; tgRing(ctx, f.x, f.y, rx, 28, '#ff4a3a', 1, 0.6);
    }
  }
  ctx.globalAlpha = 1;
}

function drawTelegraphs(ctx, scene) {
  drawFireTrails(ctx, scene);
  // vùng nguy hiểm của boss (đập đất, hắc diễm): vòng đỏ đúng bán kính trúng + lấp tím dần tới lúc nổ
  for (const h of scene.hazards || []) {
    const prog = 1 - Math.max(0, h.t) / (h.max || 1);
    if (h.x0 !== undefined) {   // M10-10 Thập Tự Hắc Liệt: dải chữ nhật, lấp tím từ giữa ra theo bề rộng
      const ux = h.x1 - h.x0, uy = h.y1 - h.y0, L = Math.hypot(ux, uy) || 1, nx = -uy / L, ny = ux / L, w = h.r * prog;
      ctx.globalAlpha = 0.22; ctx.fillStyle = '#c070ff'; ctx.beginPath();
      ctx.moveTo(h.x0 + nx * w, h.y0 + ny * w); ctx.lineTo(h.x1 + nx * w, h.y1 + ny * w); ctx.lineTo(h.x1 - nx * w, h.y1 - ny * w); ctx.lineTo(h.x0 - nx * w, h.y0 - ny * w); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.9; stripOutline(ctx, h, TG_DARK, 3, -1); stripOutline(ctx, h, '#ff4a3a', 2, 0);
      ctx.globalAlpha = 1; continue;
    }
    if (h.ring) { drawRingHazard(ctx, h, prog); continue; }   // (24/11) vành khuyên / cung (Trấn Địa, Ma Trận)
    ctx.globalAlpha = 0.22; ctx.fillStyle = '#c070ff';
    ctx.beginPath(); ctx.arc(h.x, h.y, h.r * prog, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 0.9; tgRing(ctx, h.x, h.y, h.r, Math.max(40, Math.round(h.r * 1.8)), '#ff4a3a', 2, 1);
    ctx.globalAlpha = 1;
  }
  for (const m of scene.monsters) {
    if (!m.dead && m.st === 'blink') { drawBlinkWarn(ctx, m); continue; }
    if (!m.dead && m.boss && m.st === 'sweep') { drawSweepBeam(ctx, m); continue; }   // M10-10
    if (m.dead || (m.st !== 'windup' && m.st !== 'rest')) continue;
    if (m.boss) { drawBossTelegraph(ctx, m); continue; }
    if (m.st !== 'windup') continue;
    const A = ARCH[m.arch], prog = 1 - Math.max(0, m.stT) / (m.stMax || 1);
    if (m.arch === 'charger' || m.arch === 'chaser') {   // M10-04: sói chồm dùng chung kiểu cảnh báo đường lao (ngắn hơn)
      const L = m.arch === 'chaser' ? WOLF_PACK.POUNCE.SPEED * WOLF_PACK.POUNCE.TIME : A.DASH_SPEED * A.DASH_TIME, x0 = m.x, y0 = m.y - 3;
      ctx.globalAlpha = 0.7; tgLine(ctx, x0, y0, x0 + m.dirX * L, y0 + m.dirY * L, '#ff4a3a', 2);
      ctx.globalAlpha = 0.9; pxLine(ctx, x0, y0, x0 + m.dirX * L * prog, y0 + m.dirY * L * prog, '#ffb070', 1);
      ctx.fillStyle = '#ff4a3a'; ctx.fillRect(Math.round(x0 + m.dirX * L) - 2, Math.round(y0 + m.dirY * L) - 2, 4, 4);
    } else if (m.arch === 'ranged') {
      const L = A.SHOT_SPEED * A.SHOT_LIFE * 0.6, x0 = m.x, y0 = m.y - 6;
      for (const [dx, dy] of fanDirs(m)) {   // M10-06: Tam Băng Tiễn vẽ đủ 3 hướng; khe giữa các đường là chỗ né
        ctx.globalAlpha = 0.75; tgLine(ctx, x0, y0, x0 + dx * L, y0 + dy * L, '#ff4a3a', 1);   // M10-03: đỏ như mọi đòn quái (xanh dễ lẫn với Băng của người chơi), đầu băng sáng lấp dần
        ctx.globalAlpha = 0.95; pxLine(ctx, x0, y0, x0 + dx * L * prog, y0 + dy * L * prog, '#e8fbff', 1);
      }
      ctx.fillStyle = '#e8fbff'; const g = 1 + Math.round(prog * 2); ctx.fillRect(Math.round(x0) - g, Math.round(y0) - g, g * 2, g * 2);
    } else if (m.arch === 'elite' && m.sk === 'claw') {   // M10-07: Hắc Trảo — hình quạt trước mặt, lấp tím dần, viền đỏ viền tối
      const C = ELITE_V2.CLAW, a0 = Math.atan2(m.dirY, m.dirX);
      ctx.globalAlpha = 0.25; ctx.fillStyle = '#c070ff';
      ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.arc(m.x, m.y, C.R * prog, a0 - C.ARC / 2, a0 + C.ARC / 2); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.9; clawOutline(ctx, m, TG_DARK, 3, -1); clawOutline(ctx, m, '#ff4a3a', 1);
    } else if (m.arch === 'elite') {
      ctx.globalAlpha = 0.25; ctx.fillStyle = '#c070ff';
      ctx.beginPath(); ctx.arc(m.x, m.y, A.SLAM_R * prog, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 0.9; tgRing(ctx, m.x, m.y, A.SLAM_R, 80, '#ff4a3a', 2, 1);
    }
    ctx.globalAlpha = 1;
  }
}
// M10-03: boss giải kẹt — vòng tím lấp dần ở điểm sắp hiện ra + đường chấm nối từ boss
function drawBlinkWarn(ctx, m) {
  const prog = 1 - Math.max(0, m.stT) / (m.stMax || 1);
  ctx.globalAlpha = 0.25; ctx.fillStyle = '#b070ff'; ctx.beginPath(); ctx.ellipse(m.blinkX, m.blinkY, 22 * prog, 13 * prog, 0, 0, 6.283); ctx.fill();
  ctx.globalAlpha = 0.9; tgRing(ctx, m.blinkX, m.blinkY, 22, 60, '#d9a8ff', 2, 0.6);
  const n = 10; ctx.fillStyle = '#d9a8ff'; ctx.globalAlpha = 0.6;
  for (let i = 1; i < n; i++) if (i % 2) ctx.fillRect(Math.round(m.x + (m.blinkX - m.x) * i / n), Math.round(m.y + (m.blinkY - m.y) * i / n), 2, 2);
  ctx.globalAlpha = 1;
}

// M10-03: lớp debug AI (?aidebug=1): trạng thái/chiêu trên đầu, đường tới điểm khóa, vùng còn bao lâu nổ, ngân sách đe dọa
function drawAIDebug(ctx, scene, camX, camY, p) {
  const lock = m => {
    if (m.st === 'blink') return [m.blinkX, m.blinkY];
    if (m.arch === 'chaser' && (m.st === 'windup' || m.st === 'dash')) { const P = WOLF_PACK.POUNCE; return [m.x + m.dirX * P.SPEED * P.TIME, m.y + m.dirY * P.SPEED * P.TIME]; }
    if (m.st !== 'windup' && m.st !== 'dash' && m.st !== 'rest') return null;
    const A = m.boss ? BOSS[m.bossKind].DASH : ARCH[m.arch];
    if ((m.arch === 'charger' || (m.boss && m.pat === 'dash')) && A) { const L = (A.DASH_SPEED || A.SPEED) * (A.DASH_TIME || A.TIME); return [m.x + m.dirX * L, m.y + m.dirY * L]; }
    if (m.arch === 'elite' && m.sk === 'claw') return [m.x + m.dirX * ELITE_V2.CLAW.R, m.y + m.dirY * ELITE_V2.CLAW.R];
    if (m.boss && m.pat === 'claw') return [m.x + m.dirX * BOSS_V2.MINI.CLAW.R, m.y + m.dirY * BOSS_V2.MINI.CLAW.R];   // M10-09
    if (m.boss && m.pat === 'leap' && m.leapX !== undefined) return [m.leapX, m.leapY];
    if (m.arch === 'ranged') { const R = ARCH.ranged; return [m.x + m.dirX * R.SHOT_SPEED * R.SHOT_LIFE * 0.6, m.y + m.dirY * R.SHOT_SPEED * R.SHOT_LIFE * 0.6]; }
    return null;
  };
  for (const m of scene.monsters) {
    if (m.dead || m.x < camX - 20 || m.x > camX + VIEW.W + 20 || m.y < camY - 20 || m.y > camY + VIEW.H + 40) continue;
    const busy = m.st && m.st !== 'move';
    if (!busy && !m.boss && !m.role) continue;
    if (m.role === 'flank' && m.st === 'move' && p) {   // M10-04: điểm sườn con sói đang vòng tới (chấm xanh)
      const fx = p.x + Math.cos(m.flankA) * WOLF_PACK.FLANK_R, fy = p.y + Math.sin(m.flankA) * WOLF_PACK.FLANK_R;
      ctx.globalAlpha = 0.8; ctx.fillStyle = '#7fe3ff';
      for (let i = 1; i < 8; i += 2) ctx.fillRect(Math.round(m.x + (fx - m.x) * i / 8), Math.round(m.y + (fy - m.y) * i / 8), 2, 2);
      ctx.fillRect(Math.round(fx) - 2, Math.round(fy) - 2, 5, 5);
    }
    const L = lock(m);
    if (L) { ctx.globalAlpha = 0.9; pxLine(ctx, m.x, m.y, L[0], L[1], '#ffffff', 1); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(L[0]) - 2, Math.round(L[1]) - 2, 5, 5); }
    const tag = (m.role && m.arch === 'chaser' ? m.role + '#' + m.packId + ' ' : '') + m.st + (m.boss && m.pat ? ':' + m.pat : '') + (m.stT > 0 && busy ? ' ' + m.stT.toFixed(1) : '');
    ctx.globalAlpha = 1; txt(ctx, tag, Math.round(m.x), Math.round(m.y - (m.boss ? 44 : 20)), busy ? '#ffe066' : '#c8f0ff', 7);
  }
  for (const h of scene.hazards || []) txt(ctx, Math.max(0, h.t).toFixed(1), Math.round(h.x), Math.round(h.y + 3), '#ffb0b0', 7);
  const t = scene.aiThreat;
  const line = t ? `AI chiến thuật · đòn ${t.normal}/${t.normalCap} · boss nặng ${t.bossHeavy} · vùng ${scene.hazards.length} · đạn ${scene.enemyShots.length} · lửa ${(scene.fireTrails || []).length}${t.onHazard ? ' · ĐỨNG TRONG VÙNG' : ''}` : `AI M9 (tắt chiến thuật) · vùng ${(scene.hazards || []).length} · đạn ${(scene.enemyShots || []).length}`;
  ctx.globalAlpha = 1; txt(ctx, line, camX + VIEW.W / 2, camY + 40, '#ffe066', 8);   // trên cùng giữa: không đè thanh máu boss
}

// M10-10: tia Ma Quang đang quét — vùng đã quét mờ, tia sáng dày W
function drawSweepBeam(ctx, m) {
  const S = BOSS_V2.FINAL.SWEEP, a = m.swA0 + m.swDir * S.ARC * (m.swK || 0), c = Math.cos(a), s = Math.sin(a);
  ctx.globalAlpha = 0.6; sweepOutline(ctx, m, '#ff4a3a', 1, 0);
  ctx.globalAlpha = 0.45; pxLine(ctx, m.x, m.y - 10, m.x + c * S.L, m.y - 10 + s * S.L, '#7a2cff', Math.round(S.W * 1.4));
  ctx.globalAlpha = 0.95; pxLine(ctx, m.x, m.y - 10, m.x + c * S.L, m.y - 10 + s * S.L, '#f4d8ff', 3);
  ctx.globalAlpha = 1;
}

// M10-10: viền dải nổ (2 cạnh dài + 2 đầu)
// (24/11) vùng vành khuyên / cung: lấp tím dày dần theo tiến độ, viền đỏ 2 cung + 2 đầu (nếu không trọn vòng)
function drawRingHazard(ctx, h, prog) {
  const full = h.span >= 6.28, a1 = h.a0 + Math.min(h.span, 6.2832), w = h.r * prog;
  ctx.globalAlpha = 0.24; ctx.fillStyle = h.color || '#c070ff'; ctx.beginPath();
  ctx.arc(h.x, h.y, h.R + w, h.a0, a1); ctx.arc(h.x, h.y, Math.max(0, h.R - w), a1, h.a0, true); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 0.9; ctx.fillStyle = '#ff4a3a';
  const n = Math.max(24, Math.round((h.R + h.r) * Math.min(h.span, 6.2832) / 3));
  for (const rr of [h.R - h.r, h.R + h.r]) for (let i = 0; i <= n; i++) { const a = h.a0 + (a1 - h.a0) * i / n; ctx.fillRect(Math.round(h.x + Math.cos(a) * rr) - 1, Math.round(h.y + Math.sin(a) * rr) - 1, 2, 2); }
  if (!full) for (const a of [h.a0, a1]) pxLine(ctx, h.x + Math.cos(a) * (h.R - h.r), h.y + Math.sin(a) * (h.R - h.r), h.x + Math.cos(a) * (h.R + h.r), h.y + Math.sin(a) * (h.R + h.r), '#ff4a3a', 2);
  ctx.globalAlpha = 1;
}
function stripOutline(ctx, h, col, size, off = 0) {
  const ux = h.x1 - h.x0, uy = h.y1 - h.y0, L = Math.hypot(ux, uy) || 1, nx = -uy / L * h.r, ny = ux / L * h.r;
  pxLine(ctx, h.x0 + nx + off, h.y0 + ny + off, h.x1 + nx + off, h.y1 + ny + off, col, size);
  pxLine(ctx, h.x0 - nx + off, h.y0 - ny + off, h.x1 - nx + off, h.y1 - ny + off, col, size);
  pxLine(ctx, h.x0 + nx + off, h.y0 + ny + off, h.x0 - nx + off, h.y0 - ny + off, col, size);
  pxLine(ctx, h.x1 + nx + off, h.y1 + ny + off, h.x1 - nx + off, h.y1 - ny + off, col, size);
}
// M10-10: viền nửa vòng Ma Quang Hoành Tảo (cung + 2 bán kính đầu/cuối)
function sweepOutline(ctx, m, col, size, off = 0) {
  const S = BOSS_V2.FINAL.SWEEP, a0 = m.swA0, a1 = m.swA0 + m.swDir * S.ARC, n = 60;
  ctx.fillStyle = col;
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; ctx.fillRect(Math.round(m.x + Math.cos(a) * S.L) + off, Math.round(m.y + Math.sin(a) * S.L) + off, size, size); }
  for (const a of [a0, a1]) pxLine(ctx, m.x + off, m.y + off, m.x + Math.cos(a) * S.L + off, m.y + Math.sin(a) * S.L + off, col, size);
}

function drawBossTelegraph(ctx, m) {
  const B = BOSS[m.bossKind], prog = m.st === 'rest' ? 0 : 1 - Math.max(0, m.stT) / (m.stMax || 1);
  if (m.pat === 'sweep') {   // M10-10 Ma Quang Hoành Tảo: nửa vòng sẽ bị quét + mũi tên chiều quét + vạch tia xuất phát
    const S = BOSS_V2.FINAL.SWEEP;
    ctx.globalAlpha = 0.14; ctx.fillStyle = '#c070ff';
    ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.arc(m.x, m.y, S.L * prog, Math.min(m.swA0, m.swA0 + m.swDir * S.ARC), Math.max(m.swA0, m.swA0 + m.swDir * S.ARC)); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.9; sweepOutline(ctx, m, TG_DARK, 3, -1); sweepOutline(ctx, m, '#ff4a3a', 1, 0);
    const am = m.swA0 + m.swDir * 0.35, ar = S.L * 0.6;   // mũi tên nhỏ trên cung cho biết chiều quét
    ctx.fillStyle = '#ffd978'; ctx.globalAlpha = 0.95;
    for (let i = 0; i < 6; i++) { const a = m.swA0 + m.swDir * 0.35 * i / 6; ctx.fillRect(Math.round(m.x + Math.cos(a) * ar), Math.round(m.y + Math.sin(a) * ar), 2, 2); }
    const tx = m.x + Math.cos(am) * ar, ty = m.y + Math.sin(am) * ar, bx = -Math.sin(am) * m.swDir, by = Math.cos(am) * m.swDir;
    pxLine(ctx, tx, ty, tx - bx * 6 + Math.cos(am) * 4, ty - by * 6 + Math.sin(am) * 4, '#ffd978', 2); pxLine(ctx, tx, ty, tx - bx * 6 - Math.cos(am) * 4, ty - by * 6 - Math.sin(am) * 4, '#ffd978', 2);
    pxLine(ctx, m.x, m.y - 10, m.x + Math.cos(m.swA0) * S.L, m.y - 10 + Math.sin(m.swA0) * S.L, '#f4d8ff', 1);
    ctx.globalAlpha = 1; return;
  }
  if (m.pat === 'claw' && m.st === 'windup') {   // M10-09 Liệt Trảo: quạt lấp tím dần + viền đỏ viền tối, sau lưng trống
    const C = BOSS_V2.MINI.CLAW, a0 = Math.atan2(m.dirY, m.dirX);
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#c070ff';
    ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.arc(m.x, m.y, C.R * prog, a0 - C.ARC / 2, a0 + C.ARC / 2); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.9; clawOutline(ctx, m, TG_DARK, 3, -1, C); clawOutline(ctx, m, '#ff4a3a', 1, 0, C);
    ctx.globalAlpha = 1; return;
  }
  if (m.pat === 'leap' && m.st === 'windup' && m.leapX !== undefined) {   // M10-09 Vồ Đầu Đàn: đường chấm tới dấu đáp (vòng đáp vẽ như vùng nổ)
    ctx.fillStyle = '#ffd978'; ctx.globalAlpha = 0.85;
    for (let i = 1; i < 12; i += 2) ctx.fillRect(Math.round(m.x + (m.leapX - m.x) * i / 12), Math.round(m.y + (m.leapY - m.y) * i / 12) - 1, 2, 2);
    ctx.globalAlpha = 1; return;
  }
  if (m.pat === 'dash') {
    const L = B.DASH.SPEED * B.DASH.TIME, x0 = m.x, y0 = m.y - 4;
    ctx.globalAlpha = 0.7; tgLine(ctx, x0, y0, x0 + m.dirX * L, y0 + m.dirY * L, '#ff4a3a', 3);
    ctx.globalAlpha = 0.95; pxLine(ctx, x0, y0, x0 + m.dirX * L * prog, y0 + m.dirY * L * prog, '#ffd978', 1);
    ctx.fillStyle = '#ff4a3a'; ctx.fillRect(Math.round(x0 + m.dirX * L) - 3, Math.round(y0 + m.dirY * L) - 3, 6, 6);
  } else if (m.pat === 'summon' && m.sumSpots) {   // (24/11) Triệu Ma Ảnh: ma ấn tím xoay ở từng chỗ sắp trồi lên + sợi tà khí từ boss lan tới
    for (const [x, y] of m.sumSpots) {
      const R = 13 + prog * 5;
      ctx.globalAlpha = 0.25 + 0.3 * prog; ctx.fillStyle = '#2a0f3a'; ctx.beginPath(); ctx.ellipse(x, y, R, R * 0.45, 0, 0, 6.283); ctx.fill();   // vũng tà khí
      ctx.globalAlpha = 0.55 + 0.4 * prog; tgRing(ctx, x, y, R, 24, '#c070ff', 2, 0.45);
      if (prog > 0.6 && Math.floor(prog * 12) % 2) { ctx.globalAlpha = 0.8; tgRing(ctx, x, y, R * 0.55, 14, '#f0c8ff', 1, 0.45); }   // sắp trồi lên: nhấp nháy
      ctx.globalAlpha = 0.9; ctx.fillStyle = '#f0c8ff';
      for (let i = 0; i < 4; i++) { const a = i * 1.571 + prog * 4; ctx.fillRect(Math.round(x + Math.cos(a) * R) - 1, Math.round(y + Math.sin(a) * R * 0.45) - 1, 2, 2); }
      ctx.globalAlpha = 0.35; pxLine(ctx, m.x, m.y - 10, m.x + (x - m.x) * prog, m.y - 10 + (y - m.y + 10) * prog, '#c070ff', 1);
    }
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
  if (b.near) txt(ctx, b.label || 'E · đọc bia', x, y - spr.height + 10, '#fff6c8', 11);   // (17/11) cùng kiểu nhãn Tụ Linh Pháp Đài, hạ xuống tầm mắt
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
  if (!top) {   // viền trận (tròn hoặc elip ở sảnh tông môn)
    const rx = tr.R || TRIBULATION.ARENA_R, ry = tr.RY || rx; ctx.globalAlpha = 0.7; ctx.fillStyle = '#9a7bff';
    for (let i = 0; i < 120; i++) { const a = i / 120 * 6.283 + time * 0.3; if (i % 3 !== 2) ctx.fillRect(Math.round(tr.cx + Math.cos(a) * rx) - 1, Math.round(tr.cy + Math.sin(a) * ry) - 1, 2, 2); }
  }
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
      if (!top) { ctx.globalAlpha = 0.1 + 0.2 * prog; ctx.fillStyle = '#c070ff'; ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r, h.ry || h.r, 0, 0, 6.283); ctx.fill(); }
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
// ---------- (23/11) cutscene xuất hiện boss ----------
// Tư thế 0..5: đứng oai / lấy hơi / hú / lấy đà / bổ nhào / đáp đất. Có sheet boss_intro (ChatGPT vẽ) thì dùng `${kind}_i${pose}`,
// chưa có thì tạm lấy khung có sẵn. Boss đứng trên mây yêu khí đen tím trên cao rồi nhảy xuống điểm đáp.
const CUT_FALLBACK = ['walk0', 'walk1', 'atk', 'walk3', 'atk', 'atk'];
function drawCutBoss(ctx, c, vis, time) {
  if (c.style === 'wraith') return drawCutWraithWorld(ctx, c, vis, time);
  if (c.style === 'p2') return drawP2CutBoss(ctx, c, vis, time);   // (24/11) cutscene pha 2
  if (c.style === 'ult') return;   // (24/11) tuyệt chiêu: boss + vòng sói vẽ thật trong trận (drawUlt)
  const K = BOSS.DRAW_SCALE, intro = vis.bossIntro, bs = vis.bosses;
  const name = intro && intro.meta.frames[`${c.kind}_i${c.pose}`] ? `${c.kind}_i${c.pose}` : `${c.kind}_${CUT_FALLBACK[c.pose]}`;
  const sh = intro && intro.meta.frames[name] ? intro : bs;
  if (c.alt < 0) return;   // còn ở cảnh vách đá (chưa rơi xuống đấu trường)
  const fx = Math.round(c.bx), fy = Math.round(c.by - c.alt), hi = c.alt / 110;
  // bóng ở điểm đáp: nhỏ, nhạt khi boss còn cao; đậm dần khi rơi xuống
  ctx.globalAlpha = 0.18 + 0.32 * (1 - Math.min(1, hi)); ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(fx, Math.round(c.by), 34 * (1 - 0.45 * Math.min(1, hi)), 9 * (1 - 0.45 * Math.min(1, hi)), 0, 0, 6.283); ctx.fill();
  ctx.globalAlpha = 1;
  if (sh) sheetFrame(ctx, sh, name, fx, fy, c.faceLeft, sh.img, K);
  else { const spr = BOSS_SPR[c.kind], w = spr.width * 3, h = spr.height * 3; ctx.drawImage(spr, fx - w / 2, fy - h, w, h); }
  // đáp đất: vòng chấn + bụi
  if (c.landK >= 0 && c.landK < 1) {
    const k = c.landK, r = 20 + k * 80;
    ctx.globalAlpha = 0.8 * (1 - k); pxRing(ctx, fx, Math.round(c.by), r, Math.round(r * 1.8), 0, '#e8dcc8', 3, 0.35);
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283, d = 18 + k * 60; ctx.globalAlpha = 0.5 * (1 - k); ctx.fillStyle = '#cbbf9f'; ctx.fillRect(Math.round(fx + Math.cos(a) * d), Math.round(c.by + Math.sin(a) * d * 0.35 - k * 10), 4, 4); }
  }
  ctx.globalAlpha = 1;
}
// Cảnh vách đá trên cao (màn hình). Ảnh nền ChatGPT vẽ (vis.cutBg[kind]); chưa có ảnh thì vẽ tạm trời đêm + vách đá.
// c.sky: số px trời phía trên ảnh đang thấy (camera ngửa lên) — vẽ dải trời nối tiếp màu mép trên ảnh + sao.
// Sói: cùng sprite/cỡ với khi đánh nhau; hiện ra từ bóng tối (show), mỗi bước chân chạm đất tung bụi.
const SKY_STARS = Array.from({ length: 40 }, (_, i) => [(i * 157) % 640, (i * 83) % 150, i % 3]);
function skyTopColor(img) {   // màu trung bình 4 hàng trên cùng của ảnh nền (tính một lần)
  if (img._top) return img._top;
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 4; const g = cv.getContext('2d');
  g.drawImage(img, 0, 0, img.width, Math.max(4, Math.round(img.height / 90)), 0, 0, 64, 4);
  const d = g.getImageData(0, 0, 64, 4).data; let r = 0, gg = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
  const n = d.length / 4; return (img._top = `rgb(${Math.round(r / n)},${Math.round(gg / n)},${Math.round(b / n)})`);
}
function drawCliffScene(ctx, c, vis, time) {
  if (c.bg <= 0) return;
  const C = c.cliffCfg, img = vis.cutBg && vis.cutBg[c.kind];
  const sx = vis.shake > 0 ? Math.round(rand(-3, 3)) : 0, sy = vis.shake > 0 ? Math.round(rand(-2, 2)) : 0;
  ctx.save(); ctx.translate(sx, c.sky + sy);
  // trời phía trên ảnh (chỉ thấy khi camera ngửa lên)
  if (c.sky > 0) {
    const top = img ? skyTopColor(img) : '#0c0a24', g = ctx.createLinearGradient(0, -c.sky, 0, 0);   // nối liền màu mép trên của ảnh
    g.addColorStop(0, '#04041a'); g.addColorStop(1, top); ctx.fillStyle = g; ctx.fillRect(-4, -c.sky - 4, W + 8, c.sky + 6);
    for (const [x, y, k] of SKY_STARS) { if (y > c.sky + 2) continue; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 2 + x); ctx.fillStyle = '#e8e4ff'; ctx.fillRect(x, -y, k ? 1 : 2, k ? 1 : 2); }
    ctx.globalAlpha = 1;
  }
  if (img) {
    ctx.drawImage(img, 0, 0, W, H);
    if (c.sky > 0) {   // mép trên ảnh hòa vào dải trời (không lộ đường nối)
      const top = skyTopColor(img), g2 = ctx.createLinearGradient(0, -2, 0, 48);
      g2.addColorStop(0, top); g2.addColorStop(1, top.replace('rgb(', 'rgba(').replace(')', ',0)'));
      ctx.fillStyle = g2; ctx.fillRect(-4, -2, W + 8, 50);
    }
  } else {
    const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0c0a24'); gr.addColorStop(1, '#2a2350');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f2ecd0'; ctx.beginPath(); ctx.arc(W * 0.84, H * 0.18, 26, 0, 6.283); ctx.fill();
    const ly = H * C.LEDGE_Y, tx = W * (C.TIP_X + 0.06);
    ctx.fillStyle = '#4a4560'; ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(tx, ly); ctx.lineTo(tx - 20, ly + 30); ctx.lineTo(tx - 50, H); ctx.lineTo(0, H); ctx.fill();
  }
  // sương trôi dưới vực cho cảnh có chiều sâu
  for (let i = 0; i < 6; i++) { const x = ((i * 137 + time * 14) % (W + 160)) - 80; ctx.globalAlpha = 0.12; ctx.fillStyle = '#c8c0ff'; ctx.beginPath(); ctx.ellipse(x, H * 0.86 + (i % 3) * 10, 70, 9, 0, 0, 6.283); ctx.fill(); }
  ctx.globalAlpha = 1;
  const a = c.cliff;
  if (a && a.show > 0) {
    const x = Math.round(a.x * W), y = Math.round(a.y * H), K = BOSS.DRAW_SCALE;
    const sh = a.frame[0] === 'i' ? vis.bossIntro : a.frame[0] === 'w' ? vis.bossWalk : vis.bosses, name = `${c.kind}_${a.frame}`;
    ctx.globalAlpha = 0.4 * a.show; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x, y, 30, 6, 0, 0, 6.283); ctx.fill();
    // hiện ra từ bóng tối: bóng đen sáng dần thành sói (canvas filter; trình duyệt không hỗ trợ thì chỉ mờ dần)
    ctx.globalAlpha = Math.sqrt(a.show); if (a.show < 1) ctx.filter = `brightness(${(0.12 + 0.88 * a.show).toFixed(2)})`;
    if (sh && sh.meta.frames[name]) sheetFrame(ctx, sh, name, x, y, a.flip, sh.img, K);
    ctx.filter = 'none';
    // bước chân nặng: bụi tung hai bên chân vừa chạm đất
    if (a.step >= 0 && a.step < 0.45) {
      const k = a.step / 0.45;
      for (let i = 0; i < 6; i++) { const d = 6 + k * 18, side = i < 3 ? -1 : 1; ctx.globalAlpha = 0.55 * (1 - k); ctx.fillStyle = '#b9b2cf';
        ctx.fillRect(Math.round(x + side * (d + (i % 3) * 5)), Math.round(y - 2 - k * (6 + (i % 3) * 4)), 3, 3); }
    }
    ctx.globalAlpha = 1;
    if (c.howl >= 0) {   // tiếng hú: vòng sóng âm từ đầu sói lan ra bầu trời
      const hx = x + 22, hy = y - 52;
      for (let i = 0; i < 3; i++) { const k = (c.howl * 2.2 + i / 3) % 1, r = 12 + k * 150; ctx.globalAlpha = 0.85 * (1 - k); tgRing(ctx, hx, hy, r, Math.round(r * 2.2), '#fff6dc', 3, 1); }
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}
// ---------- (24/11) cutscene Ma Ảnh Yêu Vương ----------
const sh01 = i => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };   // số giả ngẫu nhiên cố định (không đổi trạng thái)
// Đấu trường (tọa độ thế giới): gió cuốn về ma ấn, ma ấn, cột khói, Yêu Vương trồi lên, vòng nổ
function drawCutWraithWorld(ctx, c, vis, time) {
  const bx = Math.round(c.bx), by = Math.round(c.by);
  if (c.wind >= 0) for (let i = 0; i < 40; i++) {   // gió tà khí cuốn xoáy vào ma ấn
    const ph = (time * 0.7 + i / 40) % 1, a = i * 2.4 + ph * 1.6, r = 280 * (1 - ph);
    ctx.globalAlpha = 0.6 * c.wind * ph; ctx.fillStyle = i % 3 ? '#4a1f66' : '#b070e0';
    ctx.fillRect(Math.round(bx + Math.cos(a) * r), Math.round(by + Math.sin(a) * r * 0.6), 4, 1);
  }
  if (c.seal > 0) {   // ma ấn: vũng tối + hai vòng phù văn xoay ngược chiều
    const R = 44 * c.seal;
    ctx.globalAlpha = 0.45 * c.seal; ctx.fillStyle = '#12051f'; ctx.beginPath(); ctx.ellipse(bx, by, R, R * 0.45, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 0.9 * c.seal; tgRing(ctx, bx, by, R, 40, '#c070ff', 2, 0.45);
    ctx.globalAlpha = 0.7 * c.seal; tgRing(ctx, bx, by, R * 0.62, 28, '#ff6ad0', 1, 0.45);
    ctx.fillStyle = '#f0c8ff';
    for (let i = 0; i < 8; i++) { const a = i * 0.785 + time * 0.9; ctx.globalAlpha = c.seal; ctx.fillRect(Math.round(bx + Math.cos(a) * R * 0.82) - 1, Math.round(by + Math.sin(a) * R * 0.82 * 0.45) - 1, 3, 2); }
    for (let i = 0; i < 6; i++) { const a = -i * 1.047 - time * 1.4; ctx.fillRect(Math.round(bx + Math.cos(a) * R * 0.4), Math.round(by + Math.sin(a) * R * 0.4 * 0.45), 2, 2); }
  }
  if (c.pillar >= 0) {   // cột khói tà khí phun lên từ ma ấn
    const k = c.pillar, grow = Math.min(1, k * 3), fadeOut = 1 - Math.max(0, (k - 0.7) / 0.3);
    for (let i = 0; i < 16; i++) {
      const y = by - ((i * 11 + time * 70) % 176) * grow, w = (22 + 6 * Math.sin(time * 6 + i)) * (1 - (by - y) / 260);
      ctx.globalAlpha = 0.55 * fadeOut; ctx.fillStyle = i % 2 ? '#2a1040' : '#6a2f96';
      ctx.beginPath(); ctx.ellipse(bx + Math.sin(time * 3 + i) * 4, y, Math.max(4, w), 7, 0, 0, 6.283); ctx.fill();
    }
  }
  if (c.rise >= 0) {   // trồi lên từ ma ấn (tư thế chỉ tay ra lệnh)
    const sh = vis.bossIntroF, name = 'FINAL_i5', y = Math.round(by + (1 - c.rise) * 34);
    ctx.globalAlpha = 0.45 * c.rise; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(bx, by, 30, 8, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = c.rise;
    if (sh && sh.meta.frames[name]) sheetFrame(ctx, sh, name, bx, y, c.faceLeft, sh.img, BOSS.DRAW_SCALE);
    else { const spr = BOSS_SPR.FINAL, w = spr.width * 3, h = spr.height * 3; ctx.drawImage(spr, bx - w / 2, y - h, w, h); }
  }
  if (c.landK >= 0 && c.landK < 1) {   // ma ấn nổ: vòng sóng tím + mảnh tà khí
    const k = c.landK, r = 24 + k * 100;
    ctx.globalAlpha = 0.85 * (1 - k); tgRing(ctx, bx, by, r, Math.round(r * 1.8), '#c070ff', 3, 0.45);
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283, d = 20 + k * 70; ctx.globalAlpha = 0.6 * (1 - k); ctx.fillStyle = '#e0a8ff'; ctx.fillRect(Math.round(bx + Math.cos(a) * d), Math.round(by + Math.sin(a) * d * 0.4 - k * 14), 3, 3); }
  }
  ctx.globalAlpha = 1;
}
// Cảnh tế đàn: vẽ vào bộ đệm (để lúc vỡ kính cắt mảnh từ chính khung hình cuối)
let ALT_BUF = null;
function drawAltarScene(c, vis, time) {
  if (!ALT_BUF) { ALT_BUF = document.createElement('canvas'); ALT_BUF.width = W; ALT_BUF.height = H; }
  const g = ALT_BUF.getContext('2d'), A = c.altarCfg, img = vis.cutBg && vis.cutBg.FINAL;
  g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false; g.globalAlpha = 1; g.fillStyle = '#05020c'; g.fillRect(0, 0, W, H);
  const sx = vis.shake > 0 ? Math.round(rand(-3, 3)) : 0, sy = vis.shake > 0 ? Math.round(rand(-3, 3)) : 0;
  g.save(); g.translate(sx, c.sky + sy);
  if (c.sky > 0) {   // trời phía trên ảnh khi camera ngửa lên (liền màu mép trên ảnh)
    const top = img ? skyTopColor(img) : '#1a0820', gr = g.createLinearGradient(0, -c.sky, 0, 0);
    gr.addColorStop(0, '#05020c'); gr.addColorStop(1, top); g.fillStyle = gr; g.fillRect(-4, -c.sky - 4, W + 8, c.sky + 6);
  }
  if (img) {
    g.drawImage(img, 0, 0, W, H);
    if (c.sky > 0) { const top = skyTopColor(img), g2 = g.createLinearGradient(0, -2, 0, 48); g2.addColorStop(0, top); g2.addColorStop(1, top.replace('rgb(', 'rgba(').replace(')', ',0)')); g.fillStyle = g2; g.fillRect(-4, -2, W + 8, 50); }
  } else { g.fillStyle = '#2a1036'; g.fillRect(0, 0, W, H); g.fillStyle = '#b01828'; g.beginPath(); g.arc(W / 2, H * 0.22, 60, 0, 6.283); g.fill(); }
  const a = c.actor;
  if (a) {
    const x = Math.round(A.X * W), y = Math.round(A.Y * H + a.bob), sh = vis.bossIntroF, name = 'FINAL_i' + a.pose, K = A.SCALE || BOSS.DRAW_SCALE;   // cảnh cận: phóng to hơn lúc đánh
    // tà khí bốc lên quanh thân + ma ấn dưới chân sáng theo
    g.globalAlpha = 0.35 * a.show; g.fillStyle = '#c070ff'; g.beginPath(); g.ellipse(x, Math.round(A.Y * H) + 2, 23 * K, 5 * K, 0, 0, 6.283); g.fill();
    for (let i = 0; i < 14; i++) { const ph = (time * 0.5 + i / 14) % 1; g.globalAlpha = 0.7 * a.show * (1 - ph); g.fillStyle = i % 2 ? '#e0a8ff' : '#7a3aa8'; g.fillRect(Math.round(x + (sh01(i) - 0.5) * 45 * K), Math.round(y - ph * 60 * K), 2, 3); }
    g.globalAlpha = Math.sqrt(a.show); if (a.show < 1) g.filter = 'brightness(' + (0.15 + 0.85 * a.show).toFixed(2) + ')';
    if (sh && sh.meta.frames[name]) sheetFrame(g, sh, name, x, y, false, sh.img, K);
    g.filter = 'none';
    if (a.flash > 0 && sh && sh.meta.frames[name]) { g.globalAlpha = 0.8 * a.flash; sheetFrame(g, sh, name, x, y, false, sh.white, K); }
    if (c.roar >= 0) {   // tiếng gầm: sóng tà khí đỏ tím lan ra từ đầu
      for (let i = 0; i < 4; i++) { const k = (c.roar * 2.6 + i / 4) % 1, r = 14 + k * 260; g.globalAlpha = 0.85 * (1 - k); tgRing(g, x, y - 44 * K, r, Math.round(r * 2.4), i % 2 ? '#ff5a8a' : '#d070ff', 3, 0.8); }
    }
  }
  g.restore(); g.globalAlpha = 1;
  return ALT_BUF;
}
const CRACK_O = [W * 0.5, H * 0.4];
const CRACKS = Array.from({ length: 12 }, (_, i) => {   // vết nứt: tia gấp khúc từ điểm vỡ
  const pts = [[0, 0]]; let a = i / 12 * 6.283 + (sh01(i) - 0.5) * 0.4, x = 0, y = 0;
  for (let j = 0; j < 5; j++) { a += (sh01(i * 7 + j) - 0.5) * 0.7; const l = 30 + sh01(i * 13 + j) * 50; x += Math.cos(a) * l; y += Math.sin(a) * l; pts.push([x, y]); }
  return pts;
});
const SHARDS = (() => {   // mảnh kính: lưới 8×5 ô, mỗi ô 2 tam giác; bay ra từ điểm vỡ rồi rơi
  const out = [], cw = W / 8, ch = H / 5;
  for (let r = 0; r < 5; r++) for (let q = 0; q < 8; q++) {
    const x0 = q * cw, y0 = r * ch, j = (r * 8 + q) * 2, flip = (q + r) % 2;
    const tris = flip ? [[[x0, y0], [x0 + cw, y0], [x0, y0 + ch]], [[x0 + cw, y0], [x0 + cw, y0 + ch], [x0, y0 + ch]]]
      : [[[x0, y0], [x0 + cw, y0], [x0 + cw, y0 + ch]], [[x0, y0], [x0 + cw, y0 + ch], [x0, y0 + ch]]];
    tris.forEach((p, n) => {
      const cx = (p[0][0] + p[1][0] + p[2][0]) / 3, cy = (p[0][1] + p[1][1] + p[2][1]) / 3, dx = cx - CRACK_O[0], dy = cy - CRACK_O[1], d = Math.hypot(dx, dy) || 1, sp = 60 + sh01(j + n) * 160;
      out.push({ p, cx, cy, vx: dx / d * sp, vy: dy / d * sp - 80 - sh01(j + n + 5) * 80, rot: (sh01(j + n + 9) - 0.5) * 6, delay: d / 900 });
    });
  }
  return out;
})();
function drawWraithScreen(ctx, c, vis, time) {
  if (c.dark > 0) {   // trời sập tối: phủ tím đen + viền tối khép vào
    ctx.globalAlpha = c.dark; ctx.fillStyle = '#0d0418'; ctx.fillRect(0, 0, W, H);
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, W * 0.62); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.globalAlpha = Math.min(1, c.dark * 1.4); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  }
  if (c.bg > 0) {
    ctx.drawImage(drawAltarScene(c, vis, time), 0, 0);
    if (c.roar >= 0) { ctx.globalAlpha = 0.18 * (1 - (c.roar * 4) % 1); ctx.fillStyle = '#ff2a4a'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    if (c.crack > 0) {   // vết nứt lan ra
      for (const pts of CRACKS) {
        const n = Math.max(1, Math.ceil(c.crack * (pts.length - 1)));
        for (const [col, wdt] of [['#000', 3], ['#fff', 1]]) {
          ctx.strokeStyle = col; ctx.lineWidth = wdt; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(CRACK_O[0], CRACK_O[1]);
          for (let i = 1; i <= n; i++) ctx.lineTo(CRACK_O[0] + pts[i][0], CRACK_O[1] + pts[i][1]);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }
  } else if (c.shatter >= 0 && ALT_BUF) {   // vỡ vụn: mảnh kính (cắt từ khung tế đàn cuối) văng ra rồi rơi, lộ đấu trường phía sau
    const tt = c.shatter * 1.0;
    for (const s of SHARDS) {
      const k = Math.max(0, tt - s.delay); if (k <= 0) { ctx.save(); ctx.beginPath(); ctx.moveTo(...s.p[0]); ctx.lineTo(...s.p[1]); ctx.lineTo(...s.p[2]); ctx.closePath(); ctx.clip(); ctx.drawImage(ALT_BUF, 0, 0); ctx.restore(); continue; }
      const dx = s.vx * k, dy = s.vy * k + 700 * k * k;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k * 1.3);
      ctx.translate(s.cx + dx, s.cy + dy); ctx.rotate(s.rot * k); ctx.translate(-s.cx, -s.cy);
      ctx.beginPath(); ctx.moveTo(...s.p[0]); ctx.lineTo(...s.p[1]); ctx.lineTo(...s.p[2]); ctx.closePath(); ctx.clip();
      ctx.drawImage(ALT_BUF, 0, 0); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    }
    if (c.shatter < 0.25) { ctx.globalAlpha = 0.8 * (1 - c.shatter / 0.25); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }
}

// ---------- (24/11) cutscene biến hình pha 2 — mỗi boss một chữ ký (ChatGPT đề xuất) ----------
const P2_SHEET = (vis, n) => (n.startsWith('MINI2') ? vis.bossMini2 : n.startsWith('MINI_') ? vis.bosses : n.startsWith('FINAL2') ? vis.bossFinal2 : vis.bossFinal);
let P2_EYES = [], P2_ZOOM = null, P2_CAM = { camX: 0, camY: 0 }, ZBUF = null;
const easeP2 = v => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); };   // smoothstep (render.js không có ease của cutscene.js)
const p2Map = (wx, wy) => {   // thế giới -> màn hình (tính cả zoom cận)
  const sx = wx - P2_CAM.camX, sy = wy - P2_CAM.camY;
  return P2_ZOOM ? [(sx - P2_ZOOM.sx) * P2_ZOOM.z, (sy - P2_ZOOM.sy) * P2_ZOOM.z] : [sx, sy];
};
// Cuồng Thú Phá Địa: vết nứt răng cưa phân nhánh lan từ chân sói, ánh đỏ rỉ qua khe (mặt đất nhìn nghiêng: y dẹt)
const QUAKE_CRACKS = Array.from({ length: 9 }, (_, i) => {
  const pts = [[0, 0]]; let a = i / 9 * 6.283 + (h01(i) - 0.5) * 0.5, x = 0, y = 0;
  for (let j = 0; j < 6; j++) { a += (h01(i * 9 + j) - 0.5) * 0.9; const l = 9 + h01(i * 5 + j) * 10; x += Math.cos(a) * l; y += Math.sin(a) * l * 0.45; pts.push([x, y]); }
  const br = 2 + Math.floor(h01(i + 30) * 3), ba = a + (h01(i + 40) > 0.5 ? 0.8 : -0.8);
  return { pts, br, branch: [[0, 0], [Math.cos(ba) * 10, Math.sin(ba) * 4.5], [Math.cos(ba + 0.4) * 19, Math.sin(ba + 0.4) * 8.5]] };
});
function drawGroundCracks(ctx, x, y, k, time, S = 1.8) {
  const glow = 0.55 + 0.45 * Math.sin(time * 9);
  const line = (pts, n, ox, oy) => { ctx.beginPath(); ctx.moveTo(x + ox * S + pts[0][0] * S, y + oy * S + pts[0][1] * S); for (let i = 1; i <= n; i++) ctx.lineTo(x + ox * S + pts[i][0] * S, y + oy * S + pts[i][1] * S); ctx.stroke(); };
  for (const cr of QUAKE_CRACKS) {
    const n = Math.max(1, Math.min(cr.pts.length - 1, Math.ceil(k * (cr.pts.length - 1))));
    ctx.lineCap = 'square';
    ctx.globalAlpha = 0.9; ctx.strokeStyle = '#1a0606'; ctx.lineWidth = 4; line(cr.pts, n, 0, 0);
    ctx.globalAlpha = 0.9 * glow; ctx.strokeStyle = '#ff3a1a'; ctx.lineWidth = 2; line(cr.pts, n, 0, 0);
    if (n > cr.br) { const [bx, by] = cr.pts[cr.br]; ctx.globalAlpha = 0.9; ctx.strokeStyle = '#1a0606'; ctx.lineWidth = 2; line(cr.branch, 2, bx, by); ctx.globalAlpha = 0.7 * glow; ctx.strokeStyle = '#ff6a2a'; ctx.lineWidth = 1; line(cr.branch, 2, bx, by); }
  }
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 * k * glow; ctx.fillStyle = '#ff3a1a'; ctx.beginPath(); ctx.ellipse(x, y, (40 * k + 6) * S, (16 * k + 3) * S, 0, 0, 6.283); ctx.fill();
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}
// gai đá trồi lên thành vòng quanh sói khi động đất; vỡ tung lúc dậm đất
function drawEarthSpikes(ctx, x, y, k, brk) {
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * 6.283 + h01(i + 70) * 0.3, r = 52 + h01(i + 71) * 26, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.45;
    const h = (16 + h01(i + 72) * 18) * k * (brk >= 0 ? 1 - brk : 1), w = 6 + h01(i + 73) * 5;
    if (h <= 1) continue;
    ctx.globalAlpha = 1; ctx.fillStyle = '#3a2a22'; ctx.beginPath(); ctx.moveTo(px - w, py); ctx.lineTo(px + (h01(i) - 0.5) * 4, py - h); ctx.lineTo(px + w, py); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8a7258'; ctx.beginPath(); ctx.moveTo(px - w * 0.6, py); ctx.lineTo(px + (h01(i) - 0.5) * 4, py - h); ctx.lineTo(px - w * 0.1, py); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ff4a1a'; ctx.lineWidth = 1; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(px, py - 2); ctx.lineTo(px + (h01(i) - 0.5) * 3, py - h * 0.6); ctx.stroke();
    if (brk >= 0) for (let j = 0; j < 3; j++) { const da = a + (h01(i * 3 + j) - 0.5), d = brk * (40 + h01(i + j) * 50); ctx.globalAlpha = 1 - brk; ctx.fillStyle = '#6a5040'; ctx.fillRect(Math.round(px + Math.cos(da) * d), Math.round(py - h - brk * 30 + Math.sin(da) * d * 0.4 + 60 * brk * brk), 4, 3); }
  }
  ctx.globalAlpha = 1;
}
// sóng xung kích răng cưa + đá vụn bắn ra (từ tâm nổ ra ngoài)
function drawJaggedRing(ctx, x, y, k, R = 120, n = 28) {
  const r = 12 + k * R;
  for (const [col, w] of [['#2a0a04', 6], ['#ff8a3a', 3]]) {
    ctx.globalAlpha = 0.95 * (1 - k); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
    for (let i = 0; i <= n; i++) { const a = i / n * 6.283, rr = r * (i % 2 ? 0.84 : 1.12); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.45; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.stroke();
  }
  for (let i = 0; i < 30; i++) {   // đá vụn
    const a = h01(i + 60) * 6.283, sp = (50 + h01(i + 61) * 90) * R / 120, px = x + Math.cos(a) * sp * k * 1.4, py = y + Math.sin(a) * sp * k * 0.6 - (120 * k - 160 * k * k) * (0.6 + h01(i));
    const sz = 3 + Math.floor(h01(i + 62) * 4);
    ctx.globalAlpha = 1 - k * 0.8; ctx.fillStyle = '#5a4a40'; ctx.fillRect(Math.round(px) - 2, Math.round(py) - 2, sz, sz - 1); ctx.fillStyle = '#a89070'; ctx.fillRect(Math.round(px) - 2, Math.round(py) - 2, sz - 2, 1);
  }
  ctx.globalAlpha = 1;
}
// Ma Giới Đảo Nghịch: vòng phù văn mảnh xoay ngược chiều nhau quanh thân (đồng tâm)
function drawRuneRings(ctx, cx, cy, k, t) {
  const a = Math.min(1, k * 4) * (k > 0.85 ? (1 - k) / 0.15 : 1);
  [[34, 1, 12], [50, -1, 16], [66, 1, 20]].forEach(([r, dir, n], j) => {
    ctx.globalAlpha = 0.55 * a; ctx.strokeStyle = j === 1 ? '#ff6ab0' : '#d890ff'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.86, 0, 0, 6.283); ctx.stroke();
    const rot = t * 0.9 * dir;
    for (let i = 0; i < n; i++) {   // phù văn: ký hiệu nhỏ ghép bằng pixel
      const an = rot + i / n * 6.283, px = Math.round(cx + Math.cos(an) * r), py = Math.round(cy + Math.sin(an) * r * 0.86), g = Math.floor(h01(i + j * 31) * 4);
      ctx.globalAlpha = 0.9 * a; ctx.fillStyle = '#ffe0f4';
      if (g === 0) { ctx.fillRect(px - 1, py - 2, 1, 5); ctx.fillRect(px - 2, py, 3, 1); }
      else if (g === 1) { ctx.fillRect(px - 2, py - 2, 4, 1); ctx.fillRect(px - 1, py - 1, 1, 3); }
      else if (g === 2) { ctx.fillRect(px - 2, py - 1, 1, 3); ctx.fillRect(px + 1, py - 1, 1, 3); ctx.fillRect(px - 1, py, 2, 1); }
      else { ctx.fillRect(px - 1, py - 2, 3, 1); ctx.fillRect(px - 1, py + 1, 3, 1); ctx.fillRect(px, py - 1, 1, 2); }
    }
  });
  ctx.globalAlpha = 1;
}
// sét hồng chạy theo đường xoắn ốc vào lõi ngực (từ ngoài hút vào)
function drawSpiralBolts(ctx, cx, cy, k, time) {
  const seed = Math.floor(time * 14);
  for (let b = 0; b < 4; b++) {
    const a0 = b / 4 * 6.283 + time * 1.5;
    for (const [col, w] of [['#3a0a3a', 3], ['#ffc8f0', 1]]) {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.globalAlpha = 0.9 * (1 - k * 0.3); ctx.beginPath();
      for (let j = 0; j <= 10; j++) { const u = j / 10, r = 90 * (1 - u) + 4, an = a0 + u * 3.2, jit = (h01(seed * 13 + b * 11 + j) - 0.5) * 6 * (1 - u);
        const px = cx + Math.cos(an) * r + jit, py = cy + Math.sin(an) * r * 0.86 + jit; j ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}
// Boss trong cảnh (thế giới) + lớp hiệu ứng theo chữ ký từng boss; lưu vị trí mắt cho lớp màn hình
// (24/11) VFX beanfx của cutscene pha 2: chọn khung theo thời gian cảnh (tất định, bỏ qua được); thiếu sheet -> vẽ bằng code
const P2_FX = {};
function p2Fx(vis, name) {
  const a = vis.FX && vis.FX[name];
  if (!a || vis.quality === 'low') return null;
  return P2_FX[name] || (P2_FX[name] = createFx(a));
}
// vẽ khung f (có sheet -> true dù f ngoài khoảng, để không rơi về hình code); không có sheet -> false
function p2FxAt(ctx, vis, name, f, x, y, scale) {
  const fx = p2Fx(vis, name); if (!fx) return false;
  if (f < 0 || f >= vis.FX[name].meta.frames) return true;
  fx.frame = f; fx.x = Math.round(x); fx.y = Math.round(y); fx.scale = scale; fx.draw(ctx);
  return true;
}
// (24/11) lớp MẶT ĐẤT của cảnh Lang Vương pha 2: vết nứt động đất, bóng, sheet dậm đất, gai đá, bụi.
// Gọi ngay sau lớp nền -> cây, quái và chính boss đè lên (VFX nằm dưới đất, không phủ lên nhân vật).
export function drawP2Ground(ctx, c, vis, time) {
  if (!c || c.style !== 'p2' || c.fx !== 'quake') return;
  const K = BOSS.DRAW_SCALE, x = Math.round(c.bx), y = Math.round(c.by);
  const lvOn = c.T && c.t >= c.T.STOMP && !!p2Fx(vis, 'lv_pha_dia');   // từ cú dậm trở đi sheet tự vẽ khe dung nham + gai + bụi
  if (c.quake > 0 && !lvOn) {   // động đất: khe nứt đỏ lan từ chân sói ra xa (toạ độ thế giới, zoom ×2 thành cỡ cũ)
    const glow = 0.6 + 0.4 * Math.sin(time * 11);
    for (let i = 0; i < 12; i++) {
      let a = i / 12 * 6.283 + h01(i + 140) * 0.4, px = x, py = y; const pts = [[px, py]];
      for (let j = 0; j < 9; j++) { a += (h01(i * 17 + j) - 0.5) * 0.8; const l = (26 + h01(i * 9 + j) * 34) / 2; px += Math.cos(a) * l; py += Math.sin(a) * l * 0.55; pts.push([px, py]); }
      const n = Math.max(1, Math.ceil(c.quake * (pts.length - 1)));
      for (const [col, w, al] of [['#140404', 2.5, 0.85], ['#ff3a1a', 1, 0.9 * glow]]) { ctx.globalAlpha = al; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let j = 1; j <= n; j++) ctx.lineTo(pts[j][0], pts[j][1]); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
  }
  if (c.crack > 0 && !lvOn) drawGroundCracks(ctx, x, y, c.crack, time);
  ctx.globalAlpha = 0.35; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x, y, 20 * K, 4 * K, 0, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
  if (c.crack > 0 && c.crack < 1) for (let i = 0; i < 16; i++) {   // bụi đá bị ép xuống quanh chân
    const ph = (time * 1.5 + h01(i + 90)) % 1, a = h01(i + 91) * 6.283, r = 14 + ph * 30;
    ctx.globalAlpha = 0.6 * (1 - ph); ctx.fillStyle = '#b8a890'; ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.4 - (1 - ph) * 6), 2, 2);
  }
  ctx.globalAlpha = 1;
  // dậm đất beanfx (lv_pha_dia): khung va chạm 4 trùng mốc STOMP, 1,5 lần cỡ thế giới
  const lvFx = c.T ? p2FxAt(ctx, vis, 'lv_pha_dia', Math.floor((c.t - c.T.STOMP) * 24) + 4, x, y, 1.5) : false;
  if (c.spikes > 0 && !lvOn) drawEarthSpikes(ctx, x, y, c.spikes, c.spikesBreak);
  if (c.stomp >= 0 && !lvFx) { drawJaggedRing(ctx, x, y, Math.min(1, c.stomp * 1.3), 230, 40); if (c.stomp > 0.15) drawJaggedRing(ctx, x, y, Math.min(1, (c.stomp - 0.15) * 1.3), 150, 30); }
  if (c.dust > 0 && !lvFx) for (let i = 0; i < 22; i++) {   // mây bụi sau cú dậm
    const a = h01(i + 120) * 6.283, r = 30 + (1 - c.dust) * 140 + h01(i + 121) * 40;
    ctx.globalAlpha = 0.35 * c.dust; ctx.fillStyle = i % 2 ? '#a08a70' : '#6a5a48'; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.4, 18, 8, 0, 0, 6.283); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function drawP2CutBoss(ctx, c, vis, time) {
  const sh = P2_SHEET(vis, c.pose) || vis.bosses; if (!sh || !sh.meta.frames[c.pose]) return;
  const K = BOSS.DRAW_SCALE, x = Math.round(c.bx), y = Math.round(c.by), flip = c.boss === 'MINI' ? c.faceLeft : false, p2 = /^(MINI2|FINAL2)_/.test(c.pose), cy = y - 22 * K;
  if (c.fx === 'void') {
    if (c.runes >= 0) drawRuneRings(ctx, x, cy, c.runes, c.runesT);
    if (c.pull >= 0) for (let i = 0; i < 26; i++) {   // khói tím co ngược vào ma ấn trên ngực
      const u = Math.max(0, Math.min(1, (c.pullT - h01(i + 7) * 0.4) / 0.6)); if (u <= 0 || u >= 1) continue;
      const a = h01(i) * 6.283 + u * 1.2, r = (1 - u * u) * 110;
      ctx.globalAlpha = 0.6 * (1 - u * 0.5); ctx.fillStyle = i % 2 ? '#6a24a0' : '#2a0a3a'; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, 6 * (1 - u) + 2, 3 * (1 - u) + 1.5, a, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // VFX quanh thân vẽ TRƯỚC -> boss đè lên (sóng hú của sói, sét xoắn của Ma Quân)
  if (c.fx === 'quake' && c.howlRings >= 0) { const hx = x + (flip ? -1 : 1) * 18 * K, hy = y - 30 * K + 8;   // tiếng hú: sóng khí beanfx (lv_ho_khi)
    if (!p2FxAt(ctx, vis, 'lv_ho_khi', Math.floor((c.t - c.T.HOWL[0]) * 24) % 12, hx, hy, 1.5))   // vòng lặp 12 khung: 1 đợt / 3 khung
      for (let i = 0; i < 3; i++) { const kk = (c.howlRings * 2.2 + i / 3) % 1; drawJaggedRing(ctx, hx, hy, kk, 160, 24); }   // dự phòng: vòng răng cưa
    ctx.globalAlpha = 1; }
  if (c.fx === 'void' && c.spiral >= 0) drawSpiralBolts(ctx, x, cy, c.spiral, time);
  if (p2 && sh.rage) { ctx.globalAlpha = 0.55 + 0.25 * Math.sin(time * 6); for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [-2, -2], [2, -2]]) sheetFrame(ctx, sh, c.pose, x + dx, y + dy, flip, sh.rage, K); }
  ctx.globalAlpha = 1;
  sheetFrame(ctx, sh, c.pose, x, y, flip, sh.img, K);
  if (c.fx === 'quake') {
    ctx.globalAlpha = 1;
  }
  if (c.fx === 'void') {
    if (p2) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + 0.25 * Math.sin(time * 7); ctx.fillStyle = '#ff4a9a'; ctx.beginPath(); ctx.arc(x, cy + 4, 7, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
  }
  const e = eyeOf(sh, c.pose);
  P2_EYES = e ? e.map(([ex, ey]) => framePt(sh, x, y, flip, ex, ey, K)).sort((a, b) => a[1] - b[1]).slice(0, c.boss === 'FINAL' ? 4 : 2)
    : [[x + (flip ? -1 : 1) * 17 * K, y - 21 * K]];
}
// Zoom cận nguyên khối: chép khung hình rồi phóng phần quanh boss lên toàn màn (giữ nét pixel)
// (24/11) khúc xạ tiếng hú: trong dải quanh mỗi đợt sóng khí, chép lại khung hình phóng lệch ra ngoài -> cảnh vật bị nén cong
// như không khí bị đẩy. Khớp sheet lv_ho_khi v2: cứ 3 khung (24 fps) một đợt, sống 9 khung, R = (8 + 104·ease2.2) × 1,5.
let ZBUF2 = null, vis_q = 'high';
function howlRefract(ctx, c, camX, camY, sx, sy, z) {
  const cv = ctx.canvas, K = BOSS.DRAW_SCALE;
  const hx = ((c.bx + (c.faceLeft ? -1 : 1) * 18 * K) - camX - sx) * z, hy = ((c.by - 30 * K + 8) - camY - sy) * z;
  let copied = false;
  const fh = (c.t - c.T.HOWL[0]) * 24;
  for (let w0 = Math.floor(fh / 3) * 3; w0 > fh - 9; w0 -= 3) {
    const u = (fh - w0) / 9; if (u < 0 || u >= 1) continue;
    if (!copied) { if (!ZBUF2) ZBUF2 = document.createElement('canvas'); if (ZBUF2.width !== cv.width || ZBUF2.height !== cv.height) { ZBUF2.width = cv.width; ZBUF2.height = cv.height; }
      const g2 = ZBUF2.getContext('2d'); g2.setTransform(1, 0, 0, 1, 0, 0); g2.clearRect(0, 0, cv.width, cv.height); g2.drawImage(cv, 0, 0); copied = true; }
    const Rs = (8 + 104 * (1 - (1 - u) ** 2.2)) * 1.5 * z, s = 1 + 0.07 * (1 - u) ** 1.5, band = 14 + 8 * u;
    ctx.save(); ctx.beginPath();
    ctx.ellipse(hx, hy, Rs + 4, (Rs + 4) * 0.75, 0, 0, 6.283); ctx.ellipse(hx, hy, Math.max(1, Rs - band), Math.max(1, Rs - band) * 0.75, 0, 0, 6.283);
    ctx.clip('evenodd'); ctx.imageSmoothingEnabled = false;
    ctx.translate(hx, hy); ctx.scale(s, s); ctx.translate(-hx, -hy);
    ctx.drawImage(ZBUF2, 0, 0, cv.width, cv.height, 0, 0, W, H);
    ctx.restore();
  }
}
function zoomScreen(ctx, c, camX, camY) {
  const cv = ctx.canvas, r = cv.width / W, z = c.zoom, K = BOSS.DRAW_SCALE;
  if (!ZBUF) ZBUF = document.createElement('canvas');
  if (ZBUF.width !== cv.width || ZBUF.height !== cv.height) { ZBUF.width = cv.width; ZBUF.height = cv.height; }
  const zg = ZBUF.getContext('2d'); zg.setTransform(1, 0, 0, 1, 0, 0); zg.clearRect(0, 0, cv.width, cv.height); zg.drawImage(cv, 0, 0);
  const w = W / z, h = H / z, cx = (c.zx ?? c.bx) - camX, cy = (c.zy ?? c.by - 22 * K) - camY;   // (24/11) zx/zy: zoom vào điểm bất kỳ
  const sx = Math.round(Math.max(0, Math.min(W - w, cx - w / 2))), sy = Math.round(Math.max(0, Math.min(H - h, cy - h / 2)));
  ctx.save(); ctx.imageSmoothingEnabled = false;
  if (c.shake > 0) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.translate(Math.round((h01(c.shakeSeed) - 0.5) * 2 * c.shake), Math.round((h01(c.shakeSeed + 77) - 0.5) * 2 * c.shake)); const zs = Math.max(1.04, 1 + 2.3 * c.shake / H); ctx.translate(W / 2, H / 2); ctx.scale(zs, zs); ctx.translate(-W / 2, -H / 2); }   // động đất / cú giật; phóng đủ để không lộ viền đen
  ctx.drawImage(ZBUF, sx * r, sy * r, w * r, h * r, 0, 0, W, H);
  ctx.restore();
  if (c.fx === 'quake' && c.howlRings >= 0 && c.T && vis_q !== 'low') howlRefract(ctx, c, camX, camY, sx, sy, z);
  return { sx, sy, z };
}
// vị trí từng chữ của tên (căn giữa)
function titleLayout(ctx, s, size) {
  ctx.font = `bold ${size}px ${FONT}`;
  const ws = [...s].map(ch => ctx.measureText(ch).width), tot = ws.reduce((a, b) => a + b, 0);
  let x = W / 2 - tot / 2;
  return [...s].map((ch, i) => { const cx = x + ws[i] / 2; x += ws[i]; return [ch, cx]; });
}
const VOID_SPECKS_ = 0;
const VOID_SPECKS = Array.from({ length: 80 }, (_, i) => [h01(i + 200) * W, 20 + h01(i + 300) * (H - 40)]);
function drawP2Screen(ctx, c, vis, time) {
  const K = BOSS.DRAW_SCALE, z = P2_ZOOM ? P2_ZOOM.z : 1, [ox, oy] = p2Map(c.bx, c.by - 22 * K), fin = c.fx === 'void';
  if (c.desat > 0) { ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = c.desat; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
  if (fin && (c.freeze > 0 || c.burst >= 0)) {   // thời gian ngưng: hạt bụi đứng yên giữa không trung -> bị hút về tâm -> bắn vọt ra khi gầm
    const pk = c.pull >= 0 ? easeP2(c.pull) : (c.pullT >= 0.8 ? 1 : 0), bk = c.burst >= 0 ? c.burst : -1;
    for (let i = 0; i < VOID_SPECKS.length; i++) {
      let [sx, sy] = VOID_SPECKS[i]; sx += (ox - sx) * 0.45 * pk; sy += (oy - sy) * 0.45 * pk;
      if (bk >= 0) { const a = Math.atan2(sy - oy, sx - ox), d = bk * bk * 400; sx += Math.cos(a) * d; sy += Math.sin(a) * d; }
      ctx.globalAlpha = (bk >= 0 ? 1 - bk : c.freeze) * 0.75; ctx.fillStyle = i % 5 ? '#e8e0ff' : '#ff9ad6';
      ctx.fillRect(Math.round(sx), Math.round(sy), bk >= 0 ? 3 : 2, bk >= 0 ? 1 : 2);
    }
    ctx.globalAlpha = 1;
  }
  if (c.howlRings >= 0) for (let i = 0; i < 30; i++) {   // tàn lửa bay lên khi hú
    const ph = (time * 0.8 + h01(i + 160)) % 1; ctx.globalAlpha = (1 - ph) * 0.9; ctx.fillStyle = i % 3 ? '#ff7a2a' : '#ffd070';
    ctx.fillRect(Math.round(h01(i + 161) * W), Math.round(H - ph * H * 0.9), 2, 3);
  }
  if (fin && c.pull >= 0) for (let i = 0; i < 5; i++) {   // không gian co lại: vòng gợn hút vào ngực
    const k = (c.pullT * 0.9 + i / 5) % 1, r = (1 - k) * 380 + 10; ctx.globalAlpha = 0.35 * k; ctx.strokeStyle = '#c8a8ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(ox, oy, r, r * 0.8, 0, 0, 6.283); ctx.stroke();
  }
  // hố đen beanfx (yv_ho_den): đoạn HOLE kéo giãn khung 0..25, khung 26 (sụp-nổ) trùng mốc ROAR rồi chạy 24 khung/s
  let yvFx = false;
  if (fin && c.T && c.t >= c.T.HOLE[0]) {
    const T = c.T, f = c.t < T.ROAR ? Math.floor((c.t - T.HOLE[0]) / (T.ROAR - T.HOLE[0]) * 26) : 26 + Math.floor((c.t - T.ROAR) * 24);
    yvFx = p2FxAt(ctx, vis, 'yv_ho_den', f, ox, oy, 2.2 * z);
    if (yvFx && (c.hole > 0 || c.burst >= 0)) { const sh2 = P2_SHEET(vis, c.pose); if (sh2 && sh2.meta.frames[c.pose]) { const [fx1, fy1] = p2Map(c.bx, c.by); ctx.globalAlpha = 0.8; for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2]]) sheetFrame(ctx, sh2, c.pose, fx1 + dx, fy1 + dy, false, sh2.rage || sh2.glow, K * z); ctx.globalAlpha = 1; sheetFrame(ctx, sh2, c.pose, fx1, fy1, false, sh2.img, K * z); } }
  }
  if (fin && c.hole > 0 && !yvFx) {   // hố đen nở sau lưng Ma Quân, viền hồng; Ma Quân vẽ lại phía trên
    const R = c.hole * 170, g = ctx.createRadialGradient(ox, oy, R * 0.2, ox, oy, R * 1.25);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.72, 'rgba(8,0,16,0.95)'); g.addColorStop(0.86, 'rgba(255,80,170,0.85)'); g.addColorStop(1, 'rgba(120,20,160,0)');
    ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ox, oy, R * 1.25, 0, 6.283); ctx.fill();
    for (let i = 0; i < 40; i++) { const a = h01(i + 180) * 6.283 + time * (1.5 + h01(i) * 1.5), rr = R * (0.95 + 0.4 * ((time * 0.7 + h01(i + 181)) % 1)); ctx.globalAlpha = 0.7; ctx.fillStyle = i % 2 ? '#ffc8f0' : '#c070ff'; ctx.fillRect(Math.round(ox + Math.cos(a) * rr), Math.round(oy + Math.sin(a) * rr), 2, 2); }
    const sh2 = P2_SHEET(vis, c.pose); if (sh2 && sh2.meta.frames[c.pose]) { const [fx1, fy1] = p2Map(c.bx, c.by); ctx.globalAlpha = 0.8; for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2]]) sheetFrame(ctx, sh2, c.pose, fx1 + dx, fy1 + dy, false, sh2.rage || sh2.glow, K * z); ctx.globalAlpha = 1; sheetFrame(ctx, sh2, c.pose, fx1, fy1, false, sh2.img, K * z); }
    ctx.globalAlpha = 1;
  }
  if (fin && c.burst >= 0 && !yvFx) {   // hố đen nổ: sóng hồng trắng lan khắp màn
    const k = c.burst;
    for (const [d, w, col] of [[0, 6, '#ffe0f4'], [0.1, 3, '#ff6ab0'], [0.2, 2, '#c070ff']]) { const kk = Math.max(0, k - d); if (kk <= 0) continue; ctx.globalAlpha = 0.9 * (1 - kk); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(ox, oy, 20 + kk * 520, (20 + kk * 520) * 0.8, 0, 0, 6.283); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  if (c.invert) { ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }   // đảo màu 2 khung
  if (c.vign > 0) {
    const g = ctx.createRadialGradient(ox, oy, 70, ox, oy, W * 0.66); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, fin ? 'rgba(10,0,20,0.92)' : 'rgba(20,4,0,0.8)');
    ctx.globalAlpha = c.vign; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  }
  if (c.eyes > 0) {   // mắt: sói đỏ như than cháy (quầng tròn), ma đỏ như dao (vệt ngang mảnh)
    const pul = 0.7 + 0.3 * Math.sin(time * 9);
    ctx.globalCompositeOperation = 'lighter';
    for (const [wx, wy] of P2_EYES) {
      const [ex, ey] = p2Map(wx, wy);
      if (fin) { ctx.globalAlpha = 0.6 * pul * c.eyes; ctx.fillStyle = '#ff2a4a'; ctx.fillRect(Math.round(ex - 26 * z), Math.round(ey), Math.round(52 * z), 1); ctx.globalAlpha = 0.3 * pul * c.eyes; ctx.fillRect(Math.round(ex - 10 * z), Math.round(ey) - 1, Math.round(20 * z), 3); }
      else { ctx.globalAlpha = 0.45 * pul * c.eyes; ctx.fillStyle = '#ff5a1a'; ctx.beginPath(); ctx.arc(ex, ey, 6 * z, 0, 6.283); ctx.fill(); }
      ctx.globalAlpha = 0.95 * c.eyes; ctx.fillStyle = '#ffe0d0'; ctx.fillRect(Math.round(ex) - 1, Math.round(ey) - 1, 3, 2);
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  if (c.flash) { ctx.globalAlpha = c.flash.a; ctx.fillStyle = c.flash.col; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  if (c.title > 0 || (c.titleOut > 0 && c.titleOut < 1)) {
    const y = Math.round(H * 0.72), TS = c.titleSize || 26, L = titleLayout(ctx, c.title_, TS), tt = c.titleT, out = c.titleOut;
    if (!fin) {   // tên ghép từ mảnh đá bay lên; lúc thoát vỡ vụn rơi xuống
      L.forEach(([ch, cx], i) => {
        const at = 0.12 + i * 0.03, e = easeP2((tt - at + 0.35) / 0.35);
        if (e <= 0) return;
        const fall = out * out, dy = (1 - e) * 90 + fall * (180 + h01(i) * 120), rot = (1 - e) * (h01(i + 3) - 0.5) * 2.4 + fall * (h01(i + 5) - 0.5) * 4;
        ctx.save(); ctx.globalAlpha = Math.min(1, e * 2) * (1 - out); ctx.translate(Math.round(cx), Math.round(y + dy)); ctx.rotate(rot);
        txt(ctx, ch, 0, 0, '#d8c4a4', TS); ctx.restore();
        if (e < 1) { ctx.globalAlpha = 0.7 * (1 - e); ctx.fillStyle = '#8a7a64'; ctx.fillRect(Math.round(cx + (h01(i + 8) - 0.5) * 10), Math.round(y + dy + 10), 3, 2); ctx.globalAlpha = 1; }
      });
      if (tt > 0.9 && out < 1) { ctx.globalAlpha = Math.min(1, (tt - 0.9) * 4) * (1 - out); txt(ctx, c.sub, W / 2, y + 20, '#ffb070', 11); ctx.globalAlpha = 1; }
    } else {   // phù văn tự viết từng nét bằng ánh sáng hồng; tan thành khói
      L.forEach(([ch, cx], i) => {
        const at = i * 0.05, u = tt - at; if (u < 0) return;
        const hot = Math.max(0, 1 - u / 0.25);
        ctx.globalAlpha = (1 - out) * Math.min(1, u * 6);
        txt(ctx, ch, Math.round(cx), Math.round(y - out * 14), hot > 0.3 ? '#ffffff' : c.titleCol, TS);
        if (hot > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6 * hot; ctx.fillStyle = '#ff6ab0'; ctx.beginPath(); ctx.arc(cx, y - 8, 9, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
      });
      const wl = Math.min(1, tt / (L.length * 0.05 + 0.1)), x0 = L[0][1] - 10, x1 = L[L.length - 1][1] + 10;   // nét gạch phù văn chạy dưới tên
      ctx.globalAlpha = (1 - out) * 0.9; ctx.fillStyle = c.titleCol; ctx.fillRect(Math.round(x0), y + 8, Math.round((x1 - x0) * wl), 2);
      if (wl >= 1) { ctx.globalAlpha = (1 - out); txt(ctx, c.sub, W / 2, y + 22, '#f4e6ff', 11); }
      if (out > 0) for (let i = 0; i < 40; i++) { ctx.globalAlpha = (1 - out) * 0.6; ctx.fillStyle = i % 2 ? '#6a24a0' : '#c070ff'; ctx.beginPath(); ctx.arc(W / 2 + (h01(i) - 0.5) * 280, y - out * (20 + h01(i + 4) * 40), 3 + out * 6, 0, 6.283); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
  }
}

// màn hình: dải đen điện ảnh + bảng tên + nhắc bỏ qua
function drawCutOverlay(ctx, c, vis, time) {
  if (c.style === 'wraith') drawWraithScreen(ctx, c, vis, time); else if (c.style === 'p2') drawP2Screen(ctx, c, vis, time); else if (c.style === 'ult') drawUltScreen(ctx, c, vis, time); else
  drawCliffScene(ctx, c, vis, time);
  if (c.fade > 0) { ctx.globalAlpha = c.fade; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }   // màn đen chuyển cảnh
  const bh = Math.round(34 * c.letter);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
  if (c.name > 0) {
    const y = Math.round(H * 0.72);
    ctx.globalAlpha = 0.6 * c.name; ctx.fillStyle = '#0b0614'; ctx.fillRect(0, y - 26, W, 44);
    ctx.globalAlpha = c.name; ctx.fillStyle = '#c9a24a';
    const w = Math.round(150 + 60 * c.name); ctx.fillRect(W / 2 - w, y - 26, w * 2, 1); ctx.fillRect(W / 2 - w, y + 17, w * 2, 1);
    txt(ctx, c.title, W / 2, y, c.titleCol || '#ffd978', 26);
    txt(ctx, c.sub, W / 2, y + 13, '#f4e6ff', 11);
    ctx.globalAlpha = 1;
  }
  if (c.line) txt(ctx, c.line, W / 2, H - 13, '#f4d8ff', 12);   // (24/11) lời thoại Yêu Vương trong dải đen dưới
  if (c.skippable && c.letter > 0.6) { ctx.globalAlpha = 0.8; txt(ctx, 'Space · bỏ qua', W - 52, H - 12, '#cfc6e6', 9); ctx.globalAlpha = 1; }
}

function drawBossBar(ctx, scene, camX, camY) {
  const m = scene.monsters.find(q => q.boss && !q.dead);
  if (!m) return;
  // boss hoặc người chơi đứng sát mép dưới -> thanh mờ đi để không che (M2-04, chơi thử)
  const sy = m.y - camY, sx = m.x - camX;
  ctx.globalAlpha = sy > H - 48 && sx > (W - 260) / 2 && sx < (W + 260) / 2 ? 0.35 : 1;
  const B = BOSS[m.bossKind], w = 220, x = Math.round((W - w) / 2), y = H - 20;
  ctx.fillStyle = 'rgba(10,6,20,.75)'; ctx.fillRect(x - 3, y - 15, w + 6, 23);
  const phase = m.v2 ? (m.p2 ? ' · Pha 2' : ' · Pha 1') : '';   // M10-11: dấu pha (chỉ bộ chiêu mới)
  if (m.ult) txt(ctx, B.name + ' · ' + BOSS_ULT[m.bossKind].NAME.toUpperCase(), W / 2, y - 4, BOSS_ULT[m.bossKind].COLOR, 11);   // (24/11) tuyệt chiêu
  else if (m.tk && !m.tk.quiet) txt(ctx, B.name + (BOSS_TK.SHIELD ? ' · MIỄN NHIỄM — HÃY NÉ!' : ' · LIÊN HOÀN — HÃY NÉ!'), W / 2, y - 4, BOSS_TK[m.bossKind].COLOR, 11);   // (24/11) Tuyệt Kỹ
  else txt(ctx, B.name + phase + (m.enraged ? ' · cuồng nộ' : m.vuln > 0 ? (m.tkStun ? ' · KHIÊN VỠ' : ' · sơ hở') : ''), W / 2, y - 4, m.enraged ? '#ff6a6a' : m.vuln > 0 && m.tkStun ? '#ffe066' : m.p2 ? '#ffc8a0' : '#f4e6ff', 11);
  ctx.fillStyle = '#2a1830'; ctx.fillRect(x, y, w, 5);
  ctx.fillStyle = m.bossKind === 'FINAL' ? (m.p2 ? '#e040c0' : '#c040ff') : (m.p2 ? '#ff7040' : '#e2584f'); ctx.fillRect(x, y, Math.max(0, Math.round(w * m.hp / m.max)), 5);
  const P2 = m.v2 ? ((BOSS_V2[m.bossKind] && BOSS_V2[m.bossKind].PHASE2) ?? B.PHASE2) : B.PHASE2;
  if (P2) { ctx.fillStyle = '#fff'; ctx.fillRect(x + Math.round(w * P2), y - 1, 1, 7); }
  const TKc = m.v2 && BOSS_TK[m.bossKind];   // (24/11) vạch mốc Tuyệt Kỹ (vàng; đã qua thì mờ) + thanh khiên phủ khi đang miễn nhiễm
  if (TKc) for (const k of TKc.MARKS) { ctx.fillStyle = m.tkDone && m.tkDone[k.AT] ? '#6a5a40' : '#ffd060'; ctx.fillRect(x + Math.round(w * k.AT), y - 2, 2, 9); }
  if (m.tk && !m.tk.quiet && BOSS_TK.SHIELD) { ctx.globalAlpha *= 0.55 + 0.25 * Math.sin(Date.now() / 90); ctx.fillStyle = BOSS_TK[m.bossKind].COLOR; for (let i = 0; i < w; i += 6) ctx.fillRect(x + i, y, 3, 5); ctx.globalAlpha = 1; }
  const L = m.v2 && (m.st === 'windup' || m.st === 'blink' || m.st === 'sweep' || m.st === 'dash' || m.st === 'rest' || m.st === 'tkGap' || m.st === 'leap') && (BOSS_SKILL_LABELS[m.patLabel] || (m.st !== 'tkGap' && BOSS_SKILL_LABELS[m.pat]));   // (24/11) chiêu liên hoàn: giữ tên suốt chuỗi   // M10-11: tên chiêu đang gồng ngay trên thanh máu
  if (L) { ctx.fillStyle = 'rgba(10,6,20,.75)'; ctx.fillRect(x + 40, y - 30, w - 80, 13); txt(ctx, '⚠ ' + L[0], W / 2, y - 20, L[1], 10); }
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
  ctx.fillStyle = 'rgba(10,14,30,.28)'; if (hero) { ctx.beginPath(); ctx.ellipse(x + 6, sy0, 8, 3, 0, 0, 6.283); ctx.fill(); } else ctx.fillRect(x + 1, sy0 - 1, 10, 2);   // (16/11) bóng tròn dưới chân
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
  const fo = g.cut ? { x: g.cut.focusX, y: g.cut.focusY + 8 } : p;   // (23/11) cutscene: camera theo điểm nhìn của cảnh
  let camX = Math.round(Math.max(0, Math.min(map.pw - W, fo.x - W / 2)));
  let camY = Math.round(Math.max(0, Math.min(map.ph - H, fo.y - 8 - H / 2)));
  if (vis.shake > 0) { camX += Math.round(rand(-2, 2)); camY += Math.round(rand(-2, 2)); }
  ctx.setTransform(1, 0, 0, 1, -camX, -camY); vis.cam = { x: camX, y: camY };

  const objs = [];
  drawMap(ctx, map, camX, camY, time, objs, vis);
  mark('map');

  if (scene.kind === 'hub') {
    const ct = vis.ct;
    if (g.sect && vis.tm) for (const b of g.sect.buildings) {   // M8-15a: thềm đá dưới công trình (sát đất, dưới mọi vật)
      const t = b.them, img = t && vis.tm[t.kind];
      if (img && t.x < camX + W && t.x + t.w > camX && t.y < camY + H && t.y + t.h > camY) ctx.drawImage(img, t.x, t.y);
    }
    vis.hiSprites = [];
    if ((g.sect || map.kind === 'arena') && VN) {   // (16/11) gợn nước chạy mượt (17/11: cả bí cảnh): mỗi ô 2 vệt sáng trôi ngang theo thời gian, sáng tắt dần
      const tx0 = Math.floor(camX / T), ty0 = Math.floor(camY / T);
      for (let ty = ty0; ty <= ty0 + Math.ceil(H / T); ty++) for (let tx = tx0; tx <= tx0 + Math.ceil(W / T); tx++) {
        if (map.tileAt(tx, ty) !== WATER) continue;
        const L = (dx, dy) => { const t = map.tileAt(tx + dx, ty + dy); return t !== WATER && t !== FALL; }, M = 7;
        const x0 = L(-1, 0) ? M : 0, x1 = L(1, 0) ? T - M : T, y0 = L(0, -1) ? M : 0, y1 = L(0, 1) ? T - M : T;
        for (let i = 0; i < 2; i++) {
          const h1 = hash(tx, ty, 120 + i), h2 = hash(tx, ty, 130 + i), a = 0.5 + 0.5 * Math.sin(time * 1.6 + h1 * 6.28), len = 4 + Math.floor(h2 * 3);
          const py = y0 + 2 + Math.floor(h2 * Math.max(1, y1 - y0 - 4)), span = Math.max(1, x1 - x0 - len);
          let px = x0 + ((h1 * span + time * 5) % span);
          const cx = (dx, dy) => L(dx, dy) && (dx < 0 ? px < M : px + len > T - M) && (dy < 0 ? py < M : py > T - M);   // chừa góc chéo có đất
          if (cx(-1, -1) || cx(1, -1) || cx(-1, 1) || cx(1, 1)) continue;
          px = tx * T + Math.round(px);
          ctx.globalAlpha = 0.18 + 0.3 * a; ctx.fillStyle = '#e9fbff'; ctx.fillRect(px, ty * T + py, len, 1);
          ctx.fillStyle = 'rgba(40,110,160,.3)'; ctx.fillRect(px + 1, ty * T + py + 1, len - 1, 1);
        }
      }
      ctx.globalAlpha = 1;
      // vật nổi trên mặt nước (sen, chân cầu): vòng gợn lan ra quanh vật rồi vẽ vật đè lên trên
      const ring = (cx, cy, rx, ry, seed) => { for (let k = 0; k < 2; k++) { const t = ((time * 0.45 + seed + k * 0.5) % 1);
        ctx.globalAlpha = 0.75 * (1 - t); ctx.strokeStyle = '#f2fdff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(Math.round(cx) + 0.5, Math.round(cy) + 0.5, rx + t * 9, ry + t * 4, 0, 0, 6.283); ctx.stroke(); } ctx.globalAlpha = 1; };
      for (let ty = ty0; ty <= ty0 + Math.ceil(H / T) + 1; ty++) for (let tx = tx0 - 1; tx <= tx0 + Math.ceil(W / T) + 1; tx++) {
        if (map.tileAt(tx, ty) !== WATER || hash(tx, ty, 8) >= 0.08 || !vis.props || !vis.props.sen) continue;
        let open = true; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (map.tileAt(tx + dx, ty + dy) !== WATER) open = false;
        if (map.tileAt(tx - 1, ty - 2) !== WATER || map.tileAt(tx, ty - 2) !== WATER || map.tileAt(tx + 1, ty - 2) !== WATER) open = false;   // hình sen cao ~1 ô: phía trên cũng phải là nước
        if (open && g.sect && g.sect.props.some(o => o.s === 'cau_da' && Math.abs(o.x - (tx * T + 8)) < 48 && Math.abs(o.y - (ty * T + 8)) < 40)) open = false;   // không đè lên cầu đá
        if (!open) continue;   // (17/11) sen chỉ ở giữa mặt nước: các ô quanh là nước -> lá sen không lấn lên bờ cỏ
        const img = vis.props.sen, x = tx * T, y = ty * T, ph = time * 0.9 + hash(tx, ty, 141) * 6.28;
        ring(x + 8, y + T - 3, 11, 4, hash(tx, ty, 140));
        // lá sen trôi êm: lên xuống 1 px + lắc ngang 0,6 px ở toạ độ lẻ -> vẽ ở lớp nét cao (#hi), không nhảy nấc điểm ảnh
        (vis.hiSprites || (vis.hiSprites = [])).push({ img, x: x + 8 - img.ax + Math.sin(ph * 0.7) * 0.6, y: y + T - 1 - img.ay + Math.sin(ph) * 1.0 });
      }
      if (g.sect) for (const o of g.sect.props) if (o.s === 'cau_da' && vis.tm && vis.tm.cau_da) {
        const img = vis.tm.cau_da; if (o.x < camX - 40 || o.x > camX + W + 40 || o.y < camY - 20 || o.y > camY + H + 40) continue;
        ring(o.x - img.width * 0.3, o.y - 3, 5, 2, 0.2); ring(o.x + img.width * 0.3, o.y - 3, 5, 2, 0.7);
      }
    }
    if (g.sect) {   // thác nước chảy (ô FALL): dải nước dọc chạy xuống + bọt ở chân thác
      const tx0 = Math.floor(camX / T), ty0 = Math.floor(camY / T);
      for (let ty = ty0; ty <= ty0 + Math.ceil(H / T); ty++) for (let tx = tx0; tx <= tx0 + Math.ceil(W / T); tx++) {
        if (map.tileAt(tx, ty) !== FALL) continue;
        const x = tx * T, y = ty * T, off = Math.floor(time * 40) % 8;
        if (VN) { const top = map.tileAt(tx, ty - 1) !== FALL, bot = map.tileAt(tx, ty + 1) !== FALL && map.tileAt(tx, ty + 1) !== CLOUD && ty < map.h - 1;   // thác bằng tileset: đỉnh / thân 4 khung / chân bọt
          const id = 41 + (tx & 3), sx = (id & 7) * T, sy = (id >> 3) * T, o = Math.floor((time * 30 + hash(tx, 0, 77) * 16) % T);   // thân thác cuộn xuống liên tục 30 px/s (ô đã liền trên-dưới)
          if (o > 0) ctx.drawImage(VN, sx, sy + T - o, T, o, x, y, T, o);
          ctx.drawImage(VN, sx, sy, T, T - o, x, y + o, T, T - o);
          if (top) {   // đỉnh thác: mép nước tràn qua (màu nước suối) + dải bọt trắng gợn
            for (let c = 0; c < T; c++) { const k = tx * T + c, hb = 2 + Math.round(1.5 + 1.5 * Math.sin(k / 3 + time * 3)); ctx.fillStyle = '#4b8fb5'; ctx.fillRect(x + c, y, 1, 2); ctx.fillStyle = '#e8f8ff'; ctx.fillRect(x + c, y + 2, 1, hb); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x + c, y + 2 + hb, 1, 1); }
          }
          if (bot) {   // chân thác: bọt trắng cuộn tan vào mây
            for (let i = 0; i < 6; i++) { const ph = time * 2.2 + i * 1.7 + tx, r = 2.5 + 1.8 * Math.sin(ph), bx = x + ((i * 5 + tx * 3) % T), by = y + T - 4 - (i & 1) * 3;
              ctx.fillStyle = i & 1 ? 'rgba(255,255,255,.85)' : 'rgba(225,240,255,.8)'; ctx.beginPath(); ctx.ellipse(bx, by, r + 1.5, r, 0, 0, 6.283); ctx.fill(); }
          }
          continue; }
        ctx.fillStyle = '#5fb4e6'; ctx.fillRect(x, y, T, T);
        for (let i = 0; i < 4; i++) { const sx = x + i * 4 + Math.floor(hash(tx, i, 66) * 2); ctx.fillStyle = (i & 1) ? '#9bd8f5' : '#cdeffc';
          for (let k = -1; k < 3; k++) ctx.fillRect(sx, y + ((off + k * 8 + i * 3) & 15) - 2, 2, 5); }
        if (map.tileAt(tx, ty - 1) !== FALL) { ctx.fillStyle = '#e8f8ff'; ctx.fillRect(x, y, T, 2); }
        if (map.tileAt(tx, ty + 1) !== FALL) { ctx.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 4; i++) ctx.fillRect(x - 2 + Math.floor(hash(tx, Math.floor(time * 6) + i, 67) * 18), y + T - 4 + (i & 1) * 2, 4, 2); }
      }
    }
    if (g.sect && vis.tm) {   // (17/11) đổ bóng VẼ TRƯỚC nền nhà/bệ (bóng nằm dưới, không phủ lên sàn): bóng hắt (bóng hình vật xô nghiêng lên phải, mờ) dưới công trình, cây, đồ vật
      ctx.globalAlpha = 0.45;
      const cast = (img, x, footY) => { const sh = castShadow(img); const top = footY - sh.height + 7; if (x - 4 < camX + W && x + sh.width > camX && top < camY + H && top + sh.height > camY) ctx.drawImage(sh, x - 4, top); };   // đáy bóng lấn 3 px dưới chân
      for (const o of g.sect.props) { const img = !o.flat && vis.tm[o.s]; if (img && img.width > 6) cast(img, Math.round(o.x - img.width / 2), Math.round(o.y)); }
      { const ring = g.sect.pen && g.sect.pen.ring;   // (17/11) rào chuồng cũng đổ bóng (mỗi đoạn trụ + thanh gỗ)
        if (ring && vis.tm.tru_rao) { if (!vis.penRail) vis.penRail = penRailSegs(ring.posts, vis.tm.tru_rao); for (const s of vis.penRail) cast(s.img, s.x, s.y); } }
      ctx.fillStyle = '#141626';   // (17/11) vật nhỏ (đèn đá, bia nhỏ, khóm hoa): thêm bóng tiếp đất elip mềm dưới chân — bóng hắt quá mỏng để thấy
      for (const o of g.sect.props) { const img = !o.flat && vis.tm[o.s]; if (!img || img.width > 48 || o.x < camX - 40 || o.x > camX + W + 40 || o.y < camY - 10 || o.y > camY + H + 20) continue;
        const rx = Math.max(5, img.width * 0.42); for (const [k, a] of [[1.3, 0.16], [1, 0.22], [0.65, 0.28]]) { ctx.globalAlpha = a; ctx.beginPath(); ctx.ellipse(o.x + 2, o.y - 1, rx * k, 2.6 * k, 0, 0, 6.283); ctx.fill(); } }
      ctx.globalAlpha = 0.45;
      if (vis.plaza) {   // (17/11) bóng quanh bệ pháp đài, né 4 lối bậc
        const P0 = vis.plaza; if (!P0.shadow) P0.shadow = baseShadow(P0.base, null, (P0.stairs || []).map(z => z.r));
        const bx = Math.round(map.cx - P0.ax), by = Math.round(map.cy - P0.ay); ctx.globalAlpha = 0.6; ctx.drawImage(P0.shadow, bx - 6 + 3, by - 6 + 6); ctx.globalAlpha = 0.45;
      }
      if (vis.nha) for (const b of g.sect.nhaAll || []) { const n = b.nha, v = n && vis.nha[n.id]; if (!v) continue; const sh = baseShadow(v.base, n.stair);   // nhà: bóng quanh bệ đá, né cầu thang
        if (n.x - 6 < camX + W && n.x + sh.width > camX && n.y < camY + H && n.y + sh.height > camY) { ctx.globalAlpha = 0.6; ctx.drawImage(sh, n.x - 6 + 3, n.y - 6 + 6); ctx.globalAlpha = 0.45; } }
      ctx.globalAlpha = 1;
    }
    if (g.sect && vis.nha) for (const b of g.sect.nhaAll) { const n = b.nha, v = n && vis.nha[n.id]; if (v && !behindNha(p, n, v)) ctx.drawImage(v.base, n.x, n.y); }   // M8-15: nền nhà lớn (đứng sau nhà: vẽ mờ ở lớp vật thể)
    if (g.sect && g.sect.gate && FEATURES.run && g.portal && vis.pfx) {   // xoáy bí cảnh trong lòng cổng (cổng là nhà lớn: nền đã vẽ, vòng cổng ở lớp che)
      const f = vis.pfx.portal, rg = g.sect.gate.ring; f.x = Math.round(rg.x); f.y = Math.round(rg.y + 30); f.scale = 0.95; f.draw(ctx); f.scale = 1;
    }
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
    if (g.sect) drawFogFx(ctx, map, camX, camY, time);   // (17/11) sương mù trôi quanh đảo (biết đang ở trên cao)
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
    if (map.kind === 'arena' && !map.rooms) {   // (17/11) đổ bóng cây/đá bí cảnh: bóng hắt mờ + bóng tiếp đất (như sảnh)
      const tx0 = Math.floor(camX / T) - 3, ty0 = Math.floor(camY / T) - 1, tx1 = tx0 + Math.ceil(W / T) + 6, ty1 = ty0 + Math.ceil(H / T) + 6;
      ctx.fillStyle = '#141626';
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        const o = tileObj(map, tx, ty, vis.props); if (!o) continue;
        const sh = castShadow(o.img), fx = o.x + o.img.width / 2;
        ctx.globalAlpha = 0.4; ctx.drawImage(sh, Math.round(o.x) - 4, Math.round(o.y) - sh.height + 7);
        const rx = Math.max(6, o.img.width * 0.32);
        for (const [k, a] of [[1.2, 0.12], [0.8, 0.18]]) { ctx.globalAlpha = a; ctx.beginPath(); ctx.ellipse(fx + 2, o.y - 1, rx * k, 3 * k, 0, 0, 6.283); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
    }
    if (scene.kind === 'run') drawBossRoomFloor(ctx, map, camX, camY, time, vis);   // (17/11)
    if (scene.kind === 'run' && map.decor && vis.pb) {   // (17/11) đổ bóng vật trang trí phòng boss: bóng hắt (như sảnh) + bóng tiếp đất elip
      for (const d of map.decor) {
        const img = vis.pb[d.s]; if (!img || d.px < camX - 80 || d.px > camX + W + 80 || d.py < camY - 10 || d.py > camY + H + 80) continue;
        const sh = castShadow(img); ctx.globalAlpha = 0.45; ctx.drawImage(sh, Math.round(d.px - img.width / 2) - 4, Math.round(d.py) - sh.height + 7);
        ctx.fillStyle = '#141626'; const rx = Math.max(6, img.width * 0.4);
        for (const [k, a] of [[1.25, 0.14], [1, 0.2], [0.65, 0.26]]) { ctx.globalAlpha = a; ctx.beginPath(); ctx.ellipse(d.px + 2, d.py - 1, rx * k, 3 * k, 0, 0, 6.283); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
    }
    drawTelegraphs(ctx, scene);
    if (g.run && g.run.shrine && !g.run.shrine.used) drawShrine(ctx, g.run, p, time, vis);
  }

  if (g.cut) drawP2Ground(ctx, g.cut, vis, time);   // (24/11) VFX mặt đất cutscene pha 2: dưới cây / quái / boss
  mark('ground');
  for (const m of scene.monsters) objs.push({ y: m.y, m });
  objs.push({ y: p.y, player: true });
  if (scene.kind === 'hub' && FEATURES.run && g.portal && vis.pfx && !(g.sect && g.sect.gate)) objs.push({ y: g.portal.y, portal: true });
  if (scene.kind === 'hub' && g.bia && vis.ct && vis.ct.bia) objs.push({ y: g.bia.y, bia: true });
  if (scene.kind === 'run' && map.decor && vis.pb) for (const d of map.decor) {   // M9-B: vật trang trí phòng boss (ChatGPT vẽ), xếp theo chân
    const img = vis.pb[d.s]; if (!img) continue;
    const x = Math.round(d.px - img.width / 2), dy = Math.round(d.py - img.height);
    if (x < camX + W && x + img.width > camX && dy < camY + H && d.py > camY) {
      objs.push({ y: d.py, img, x, dy });
      if (GLOW_PB[d.s]) { const gy = dy + img.height * GLOW_PB[d.s], a = 0.18 + 0.12 * Math.sin(time * 3 + d.px * 0.1);   // quầng lửa ma / tinh thể phập phồng
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.fillStyle = '#9a4cff'; ctx.beginPath(); ctx.ellipse(d.px, gy, 14, 10, 0, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    }
  }
  if (scene.kind === 'hub' && g.sect) {   // M8: công trình + đồ vật + cây tông môn (sprite tm_*, xếp theo chân); thiếu sprite -> khối tạm
    const vis1 = (img, fx, fy) => fx - img.width / 2 < camX + W && fx + img.width / 2 > camX && fy - img.height < camY + H && fy > camY - 4;
    for (const b of g.sect.buildings) {
      if (b.nha) continue;   // nhà lớn vẽ riêng (nền + lớp che)
      const img = vis.tm && vis.tm[b.id];
      if (!img) { objs.push({ y: b.py + b.ph, sectB: b }); continue; }
      const f = b.footPx;
      if (vis1(img, f.x, f.y)) objs.push({ y: f.y, img, x: Math.round(f.x - img.width / 2), dy: Math.round(f.y - img.height), label: b.name, door: b.doorPx, id: b.id });
    }
    if (vis.nha) for (const b of g.sect.nhaAll) {   // M8-15: lớp che nhà lớn + tên khu trên mái
      const n = b.nha, v = n && vis.nha[n.id]; if (!v) continue;
      if (behindNha(p, n, v)) objs.push({ y: n.y + v.base.height, img: v.base, x: n.x, dy: n.y, noFade: true, fade: true });   // cả nhà vẽ mờ đè lên người
      else for (const s of v.strips) { const dy = n.y + s.y; if (dy < camY + H && dy + s.img.height > camY && n.x + s.x < camX + W && n.x + s.x + s.img.width > camX) objs.push({ y: n.y + s.foot, img: s.img, x: n.x + s.x, dy, noFade: true }); }
      if (b.name && Math.hypot(p.x - b.doorPx.x, p.y - b.doorPx.y) < 140) {
        const st = g.sectStatus && g.sectStatus(b.id), bb = opaqueBox(v.base);
        sectLabel(ctx, b.name, st, n.x + bb.cx, Math.max(n.y + bb.top + 16, b.doorPx.y - 120));   // giữa phần nhìn thấy của nhà, ngang mái; tháp cao: không quá 120 px trên cửa (tầm mắt)
      }
    }
    if (vis.plaza) {   // lớp trước của bệ: từng nhóm điểm ảnh xếp theo chân cột đục của nó (xem main.js)
      const x = Math.round(map.cx - vis.plaza.ax), y0 = Math.round(map.cy - vis.plaza.ay);
      for (const s of vis.plaza.strips) { const dy = y0 + s.y; if (dy < camY + H && dy + s.img.height > camY) objs.push({ y: y0 + s.foot, img: s.img, x: x + s.x, dy, noFade: true }); }
    }
    const ring = g.sect.pen && g.sect.pen.ring;
    if (ring && vis.tm && vis.tm.tru_rao) {   // (16/11) rào bo tròn chuồng linh thú: mỗi đoạn = trụ gỗ đầu vàng + 2 thanh gỗ nối sang trụ kế, xếp theo chân thấp hơn
      if (!vis.penRail) vis.penRail = penRailSegs(ring.posts, vis.tm.tru_rao);
      for (const s of vis.penRail) if (s.x < camX + W && s.x + s.img.width > camX && s.dy < camY + H && s.y > camY) objs.push(s);
    }
    if (vis.props && map._nhaRects) {   // (17/11) cỏ/hoa ngay trước nhà: vẽ ở lớp vật thể (đè lên nền nhà)
      if (!map._decorOver) { map._decorOver = [];
        for (let ty = 0; ty < map.h; ty++) for (let tx = 0; tx < map.w; tx++) { const d = hash(tx, ty, 8); if (map.tileAt(tx, ty) !== GRASS || d >= 0.05) continue;
          const im = vis.props[pick(DECOR_KINDS, d / 0.05)]; if (im && decorOverNha(map, vis.props, tx, ty, im, map._nhaRects) === 2) map._decorOver.push({ y: ty * T + T - 1, img: im, x: tx * T + 8 - im.ax, dy: ty * T + T - 1 - im.ay, noFade: true }); } }
      for (const o of map._decorOver) if (o.x < camX + W && o.x + o.img.width > camX && o.dy < camY + H && o.y > camY) objs.push(o);
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
      if ((hide && !o.noFade) || o.fade) ctx.globalAlpha = 0.45;
      ctx.drawImage(o.img, o.x, o.dy);
      ctx.globalAlpha = 1;
      if (o.label && Math.hypot(p.x - o.door.x, p.y - o.door.y) < 96) {   // M8-03: đứng ở cửa -> "E · tên khu"
        const act = g.interact && g.interact.name === o.label;   // tên khu cố định trên mái; đang đứng ở cửa thì sáng hơn
        const lx = Math.round(o.x + o.img.width / 2), st = g.sectStatus && g.sectStatus(o.id);
        txt(ctx, o.label, lx, o.dy - (st ? 12 : 3), act ? '#fff6c8' : '#ffd978', act ? 11 : 10);
        if (st) txt(ctx, st.s, lx, o.dy - 2, st.hot ? '#ffe9a0' : '#cfc6b0', 8);   // M8-13: trạng thái khu
      }
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

  if (scene.kind === 'run') drawRoomSeals(ctx, map, camX, camY, time);   // M9-B: màn phong ấn cửa phòng — vẽ trên cây để luôn thấy rõ
  if (scene.kind === 'hub' && g.sect && vis.tm && vis.quality !== 'low') drawPetals(ctx, g.sect.props, vis.tm, camX, camY, time);   // (17/11) cánh hoa đào rơi
  mark('objects');
  if (g.run) drawSkillsOver(ctx, g.run, p, time, vis);
  if (scene.kind !== 'hub') drawTelegraphsTop(ctx, scene);
  ULT_CUT = g.cut && g.cut.style === 'ult' ? g.cut : null;
  if (scene.kind === 'run') drawUlt(ctx, scene, p, time, vis, camX, camY);   // (24/11) tuyệt chiêu boss
  if (g.cut) drawCutBoss(ctx, g.cut, vis, time);   // (23/11) cutscene boss: trên cây/vật thể
  if (FEATURES.aiDebug && scene.kind === 'run') drawAIDebug(ctx, scene, camX, camY, p);
  else if (g.trib && g.trib.interactive) drawTribulation(ctx, g.trib, time, true);
  if (scene.enemyShots) drawEnemyShots(ctx, scene.enemyShots, vis);
  mark('skillsTop');
  if (scene.projectiles) drawProjectiles(ctx, scene, vis.FX, g.dtWorld || 0, vis.quality);
  mark('projectiles');
  for (const s of g.hubShots || []) { s.fx.x = Math.round(s.x); s.fx.y = Math.round(s.y); s.fx.draw(ctx); }
  if (scene.kind === 'hub' && g.interact && (g.interact.id === 'phap_dai' || g.interact.id === 'portal'))   // tên cố định ngay trên vật thể
    txt(ctx, g.interact.name, Math.round(g.sect && g.sect.gate && g.interact.id === 'portal' ? g.sect.gate.ring.x : g.interact.x), Math.round(g.interact.id === 'portal' ? g.interact.y - 62 : map.cy - 74), '#fff6c8', 11);
  if (scene.kind === 'hub' && g.sect && Math.hypot(p.x - g.sect.pen.doorPx.x, p.y - g.sect.pen.doorPx.y) < 96) {   // Luyện Võ Trường: tên trên cổng rào
    const st = g.sectStatus && g.sectStatus('luyen_vo'), gt = g.sect.props.find(o => o.s === 'cong_chuong'), gi = gt && vis.tm && vis.tm.cong_chuong;
    if (gi) { const bb = opaqueBox(gi); sectLabel(ctx, g.sect.pen.name, st, gt.x - gi.width / 2 + bb.cx, gt.y - gi.height + bb.top + 14); }   // giữa cổng chuồng
    else { const d = g.sect.pen.doorPx; sectLabel(ctx, g.sect.pen.name, st, d.x, d.y - 36); }
  }
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
  if (g.cut && (g.cut.style === 'p2' || g.cut.style === 'ult')) { P2_CAM = { camX, camY }; vis_q = vis.quality; P2_ZOOM = g.cut.zoom > 1.001 ? zoomScreen(ctx, g.cut, camX, camY) : null; }   // (24/11) zoom cận cutscene pha 2
  if (g.run && g.run.rooms && scene.kind === 'run') drawMinimap(ctx, g.run);   // M9-B
  if (g.cut) drawCutOverlay(ctx, g.cut, vis, time); else drawBossBar(ctx, scene, camX, camY);
  if (vis.banner && !g.cut) {   // cutscene: không chen dòng thông báo
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
