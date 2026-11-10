// Tu Tiên Lộ — prototype chơi một mình. Bản đồ và nhân vật vẽ bằng code; hiệu ứng là sprite sheet beanfx trong fx/
// (vẽ lại bằng vfx/make_fx.py), phát bằng lib/beanfx.js.
import { loadFx, createFx } from './lib/beanfx.js';

(async () => {
'use strict';

// ---------- Hằng số ----------
const W = 480, H = 270, T = 16, MW = 80, MH = 60;
const CX = MW / 2 * T, CY = MH / 2 * T;      // tâm tụ linh trận
const SAFE = 7 * T;                           // bán kính vùng an toàn
const FORM_R = 34;                            // bán kính tụ linh trận
const SAVE_KEY = 'tutien_save_v1';
const MAX_MONSTERS = 45;
const PILL_COST = 25;
const MAJOR_CHANCE = 0.7;

const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
cv.width = W; cv.height = H;
ctx.imageSmoothingEnabled = false;
const $ = id => document.getElementById(id);

function fit() {
  let s = Math.min(innerWidth / W, innerHeight / H);
  if (s >= 1) s = Math.floor(s * 2) / 2;
  cv.style.width = W * s + 'px';
  cv.style.height = H * s + 'px';
  $('wrap').style.fontSize = Math.max(9, 6.2 * s) + 'px';
}
addEventListener('resize', fit); fit();

// ---------- Cảnh giới ----------
const REALMS = ['Luyện Khí', 'Trúc Cơ', 'Kim Đan', 'Nguyên Anh'];
const STAGES = ['Sơ kỳ', 'Trung kỳ', 'Hậu kỳ'];
const MAX_L = 17;
const realmOf = L => L < 9 ? 0 : 1 + Math.floor((L - 9) / 3);
const levelName = L => L < 9 ? `Luyện Khí · Tầng ${L + 1}` : `${REALMS[realmOf(L)]} · ${STAGES[(L - 9) % 3]}`;
const isMajor = L => L < MAX_L && realmOf(L + 1) !== realmOf(L);
const power = L => (1 + 0.25 * L) * Math.pow(1.6, realmOf(L));
const maxHp = L => Math.round(100 * power(L));
const atk = L => Math.round(12 * power(L));
const need = L => Math.round(60 * Math.pow(1.38, L));

// ---------- Ngẫu nhiên có hạt giống (để bản đồ luôn giống nhau) ----------
const SEED = 20261110;
function hash(x, y, s = 0) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s + SEED, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const rand = (a, b) => a + Math.random() * (b - a);

// ---------- Bản đồ ----------
const GRASS = 0, WATER = 1, STONE = 2, TREE = 3, ROCK = 4;
const map = new Uint8Array(MW * MH);
for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
  const d = Math.hypot(x + 0.5 - MW / 2, y + 0.5 - MH / 2);
  let t = GRASS;
  if (x === 0 || y === 0 || x === MW - 1 || y === MH - 1) t = TREE;
  else if (d < 4.5) t = STONE;
  else if (d < 8) t = GRASS;
  else if (noise(x / 8, y / 8, 1) < 0.3) t = WATER;
  else if (hash(x, y, 2) < (noise(x / 6, y / 6, 3) > 0.55 ? 0.3 : 0.04)) t = TREE;
  else if (hash(x, y, 4) < 0.015) t = ROCK;
  map[y * MW + x] = t;
}
const tileAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= MW || ty >= MH) ? TREE : map[ty * MW + tx];
const solidPx = (px, py) => { const t = tileAt(Math.floor(px / T), Math.floor(py / T)); return t === WATER || t === TREE || t === ROCK; };
// x,y là vị trí bàn chân; hộp va chạm nhỏ quanh chân
const canStand = (x, y) => !solidPx(x - 4, y - 5) && !solidPx(x + 4, y - 5) && !solidPx(x - 4, y) && !solidPx(x + 4, y);

// ---------- Vẽ sprite từ chuỗi ký tự ----------
function makeSprite(rows, pal) {
  const c = document.createElement('canvas');
  c.width = Math.max(...rows.map(r => r.length)); c.height = rows.length;
  const g = c.getContext('2d');
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
  return c;
}
function makeCanvas(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  fn((x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); }, g);
  return c;
}

const PAL = { k: '#1a1423', h: '#2b2233', s: '#f2c9a0', w: '#e8eef5', b: '#4a7bd0', d: '#2f4f94', r: '#c8443c', g: '#3a2f2a' };
const HEAD_F = ['....kkkk....', '...khhhhk...', '..khhhhhhk..', '..khsssshk..', '..kskssksk..', '..kssssssk..'];
const HEAD_B = ['....kkkk....', '...khhhhk...', '..khhhhhhk..', '..khhhhhhk..', '..khhhhhhk..', '..khhhhhhk..'];
const BODY_F = ['...kwwwwk...', '..kwwbbwwk..', '.kwwwbbwwwk.', '.kswrrrrwsk.', '.kkwwbbwwkk.', '..kwwbbwwk..', '..kwwwwwwk..'];
const BODY_B = ['...kwwwwk...', '..kwwwwwwk..', '.kwwwwwwwwk.', '.kswrrrrwsk.', '.kkwwwwwwkk.', '..kwwwwwwk..', '..kwwwwwwk..'];
const LEGS = [
  ['..kddkkddk..', '..kggkkggk..', '...kk..kk...'],
  ['..kddkkddk..', '..kggk.kk...', '...kk.......'],
  ['..kddkkddk..', '..kggkkggk..', '...kk..kk...'],
  ['..kddkkddk..', '...kk.kggk..', '.......kk...'],
];
const SIDE = ['....kkkk....', '...khhhhk...', '..khhhhhhk..', '..khhhsssk..', '..khhssksk..', '..khhssssk..',
  '...kwwwwk...', '...kwwbwk...', '..kwwwbwwk..', '..kwwrrrsk..', '..kwwwbwkk..', '...kwwbwk...', '...kwwwwk...'];
const SIDE_LEGS = [
  ['...kddddk...', '...kggggk...', '....kkkk....'],
  ['..kddkddk...', '..kggkkggk..', '...kk..kk...'],
];
const SIT = [...HEAD_F, '...kwwwwk...', '..kwwbbwwk..', '.kwwwbbwwwk.', '.kswrrrrwsk.', 'kkwwwbbwwwkk', 'kddwwsswwddk', 'kddddddddddk', '.kkkkkkkkkk.'];

const SPR = {
  down: LEGS.map(l => makeSprite([...HEAD_F, ...BODY_F, ...l], PAL)),
  up: LEGS.map(l => makeSprite([...HEAD_B, ...BODY_B, ...l], PAL)),
  side: [0, 1, 0, 1].map(i => makeSprite([...SIDE, ...SIDE_LEGS[i]], PAL)),
  sit: makeSprite(SIT, PAL),
};

const BEAST = ['..kk....kk..', '.kcck..kcck.', '.kccckkccck.', 'kcccccccccck', 'kcwkccccwkck', 'kcccccccccck', 'kcccdkkdccck', '.kddddddddk.', '..kkkkkkkk..'];
const TIERS = [
  { name: 'Dã Lang', c: '#9aa0b4', d: '#646a80' },
  { name: 'Hỏa Hồ', c: '#f08a3c', d: '#b0531f' },
  { name: 'Huyền Băng Thú', c: '#7fdcec', d: '#3f8fb0' },
  { name: 'Ma Ảnh', c: '#a468e0', d: '#5f3596' },
];
TIERS.forEach(t => { t.spr = makeSprite(BEAST, { k: '#1a1423', c: t.c, d: t.d, w: '#ffffff' }); });
const BEAST_WHITE = makeSprite(BEAST, { k: '#fff', c: '#fff', d: '#fff', w: '#fff' });

// Ô nền
const grassTiles = [0, 1, 2, 3].map(v => makeCanvas(T, T, px => {
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const r = hash(x, y, 10 + v);
    px(x, y, r < 0.06 ? '#4a8f45' : r > 0.95 ? '#7cc264' : '#5da552');
  }
  if (v === 3) { px(5, 6, '#f6e27a'); px(11, 10, '#f3a6c8'); }
}));
const waterTiles = [0, 1].map(v => makeCanvas(T, T, px => {
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) px(x, y, '#3f7fc4');
  for (let i = 0; i < 3; i++) { const y = 3 + i * 5, x = (i * 5 + v * 4) % 12; for (let k = 0; k < 4; k++) px(x + k, y, '#7fb6e8'); }
}));
const stoneTile = makeCanvas(T, T, px => {
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const edge = x === 0 || y === 0;
    px(x, y, edge ? '#857f72' : hash(x, y, 20) < 0.08 ? '#9a9486' : '#aea898');
  }
});
function makeTree(v, pink) {
  const cols = pink ? ['#8a3e63', '#d9779f', '#f3a6c8', '#fbd3e2'] : ['#1f4a2c', '#2f7a3e', '#45a052', '#6fc56a'];
  return makeCanvas(20, 28, px => {
    for (let y = 18; y < 28; y++) for (let x = 8; x < 12; x++) px(x, y, x === 8 || y === 27 ? '#3a2416' : '#6b4226');
    for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) {
      const d = Math.hypot(x + 0.5 - 10, y + 0.5 - 10);
      if (d > 9.5) continue;
      let c = cols[1];
      if (d > 8.5) c = '#14301d';
      else if (Math.hypot(x - 7, y - 6) < 4) c = cols[3];
      else if (y > 12 && d > 5.5) c = cols[0];
      else if (hash(x, y, 30 + v) < 0.3) c = cols[2];
      if (pink && d > 8.5) c = '#5a2440';
      px(x, y, c);
    }
  });
}
const treeSprs = [makeTree(0), makeTree(1), makeTree(2, true)];
const rockSpr = makeCanvas(14, 10, px => {
  for (let y = 0; y < 10; y++) for (let x = 0; x < 14; x++) {
    const d = Math.hypot((x + 0.5 - 7) / 7, (y + 0.5 - 5.5) / 4.8);
    if (d > 1) continue;
    px(x, y, d > 0.82 ? '#3d3a45' : (x < 7 && y < 5) ? '#b5b1bd' : y > 6 ? '#6c6877' : '#8f8b9a');
  }
});

// ---------- Trạng thái ----------
function fresh() { return { L: 0, tuvi: 0, hp: maxHp(0), stones: 0, pills: 1, x: CX, y: CY + 26 }; }
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && Number.isFinite(s.L) && s.L >= 0 && s.L <= MAX_L && canStand(s.x, s.y)) return Object.assign(fresh(), s);
  } catch (e) { /* bỏ qua bản lưu hỏng */ }
  return null;
}
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ L: S.L, tuvi: S.tuvi, hp: S.hp, stones: S.stones, pills: S.pills, x: p.x, y: p.y })); } catch (e) { /* không lưu được thì thôi */ }
}
let S = load() || fresh();
const p = { x: S.x, y: S.y, face: 'down', flip: false, fx: 0, fy: 1, moving: false, anim: 0, med: false, cd: 0, inv: 0 };
let time = 0, flash = 0, shake = 0, trib = null, readyNotified = false, saveT = 0;
const monsters = [], shots = [], parts = [], texts = [], fxs = [];
const keys = {};

// ---------- Nhật ký ----------
function log(msg, cls = '') {
  const el = document.createElement('div');
  el.textContent = msg; el.className = cls;
  const box = $('log'); box.appendChild(el);
  while (box.children.length > 5) box.firstChild.remove();
  setTimeout(() => { el.style.opacity = 0; }, 6000);
  setTimeout(() => el.remove(), 7200);
}

// ---------- Hiệu ứng ----------
function part(x, y, vx, vy, life, color, size = 1, add = true) { parts.push({ x, y, vx, vy, life, max: life, color, size, add }); }
function burst(x, y, n, speed, color, life = 0.6, size = 1) {
  for (let i = 0; i < n; i++) { const a = rand(0, 6.283), v = rand(speed * 0.3, speed); part(x, y, Math.cos(a) * v, Math.sin(a) * v, rand(life * 0.5, life), color, size); }
}
function floatText(x, y, text, color) { texts.push({ x, y, text, color, life: 0.9 }); }
// Hiệu ứng beanfx: mỗi cái là một sprite sheet màu cộng một sheet ánh sáng
const FX = {};
for (const name of ['kiem_khi', 'kiem_trung', 'loi_kiep', 'dot_pha', 'toa_thien']) FX[name] = await loadFx(`fx/${name}.json`);
const medFx = createFx(FX.toa_thien);
function spawnFx(name, x, y, opts = {}) {
  const fx = createFx(FX[name], { x: Math.round(x), y: Math.round(y), ...opts });
  fxs.push(fx);
  return fx;
}
function addBolt(tx, ty) {
  spawnFx('loi_kiep', tx, ty, { flip: Math.random() < 0.5, onHit: () => { flash = 0.22; shake = 0.25; burst(tx, ty - 6, 10, 90, '#d9c8ff', 0.5, 2); } });
}

// ---------- Hành động ----------
const inFormation = () => Math.hypot(p.x - CX, p.y - CY) < FORM_R;
const medRate = () => 2 * (1 + 0.15 * S.L) * (inFormation() ? 3 : 1);

function gainTuvi(v) {
  const n = need(S.L);
  if (S.tuvi >= n) return;
  S.tuvi = Math.min(n, S.tuvi + v);
  if (S.tuvi >= n && !readyNotified) {
    readyNotified = true;
    log(S.L >= MAX_L ? 'Đã tới đỉnh phong của bản thử nghiệm này.' : 'Tu vi viên mãn! Nhấn B để đột phá.', 'gold');
  }
}
function toggleMed() {
  if (trib) return;
  p.med = !p.med;
  if (p.med) log(inFormation() ? 'Tọa thiền trong tụ linh trận — tốc độ tu luyện ×3.' : 'Tọa thiền. (Vào tụ linh trận giữa bản đồ sẽ nhanh gấp 3.)');
}
function levelUp() {
  S.L++; S.tuvi = 0; S.hp = maxHp(S.L); readyNotified = false;
  spawnFx('dot_pha', p.x, p.y, { onHit: () => { flash = 0.18; shake = 0.3; } });
  log(`Đột phá thành công: ${levelName(S.L)}!`, 'gold');
  save();
}
function tryBreak() {
  if (trib || S.L >= MAX_L || S.tuvi < need(S.L)) return;
  if (isMajor(S.L)) {
    p.med = false;
    trib = { t: 0, dur: 2.6, next: 0.2 };
    log(`Lôi kiếp giáng xuống! Xung kích ${REALMS[realmOf(S.L + 1)]}...`, 'bad');
  } else levelUp();
}
function usePill() {
  if (S.pills <= 0 || S.L >= MAX_L || S.tuvi >= need(S.L)) return;
  S.pills--;
  const v = Math.round(need(S.L) * 0.25);
  gainTuvi(v);
  floatText(p.x, p.y - 20, '+' + v, '#7fe3ff');
  burst(p.x, p.y - 8, 12, 50, '#7fe3ff');
}
function buyPill() {
  if (S.stones < PILL_COST) return;
  S.stones -= PILL_COST; S.pills++;
  log('Mua 1 Tụ Khí Đan.');
}
function shoot() {
  p.cd = 0.35; p.med = false;
  let dx = p.fx, dy = p.fy, best = 130;
  for (const m of monsters) {           // tự ngắm quái gần nhất
    const d = Math.hypot(m.x - p.x, m.y - p.y);
    if (d < best) { best = d; dx = m.x - p.x; dy = (m.y - 4) - (p.y - 8); }
  }
  const l = Math.hypot(dx, dy) || 1;
  shots.push({ x: p.x, y: p.y - 8, vx: dx / l * 230, vy: dy / l * 230, dist: 0, dmg: atk(S.L), fx: createFx(FX.kiem_khi, { heading: Math.atan2(dy, dx) }) });
}
function hurtPlayer(d) {
  if (p.inv > 0 || trib) return;
  S.hp -= d; p.inv = 0.5; p.med = false; shake = 0.15;
  floatText(p.x, p.y - 20, '-' + d, '#ff8f8a');
  if (S.hp <= 0) {
    S.tuvi = Math.floor(S.tuvi * 0.9); S.hp = maxHp(S.L);
    p.x = CX; p.y = CY + 26; readyNotified = S.tuvi >= need(S.L);
    monsters.forEach(m => { m.aggro = false; });
    log('Trọng thương! Được đưa về tụ linh trận, hao tổn 10% tu vi.', 'bad');
    save();
  }
}

// ---------- Yêu thú ----------
function spawnMonster() {
  for (let i = 0; i < 20; i++) {
    const tx = 1 + Math.floor(Math.random() * (MW - 2)), ty = 1 + Math.floor(Math.random() * (MH - 2));
    const x = tx * T + 8, y = ty * T + 12;
    const dc = Math.hypot(x - CX, y - CY) / T;
    if (dc < 10 || !canStand(x, y) || Math.hypot(x - p.x, y - p.y) < 14 * T) continue;
    const lvl = Math.max(1, Math.min(13, 1 + Math.floor((dc - 10) / 3.2)));
    const hp = Math.round(30 * Math.pow(1.3, lvl - 1));
    monsters.push({ x, y, lvl, tier: lvl <= 3 ? 0 : lvl <= 6 ? 1 : lvl <= 10 ? 2 : 3, hp, max: hp, dmg: Math.round(6 * Math.pow(1.28, lvl - 1)),
      vx: 0, vy: 0, think: 0, aggro: false, atkCd: 0, hit: 0, kx: 0, ky: 0, ph: Math.random() * 6 });
    return;
  }
}
function killMonster(m) {
  const tv = Math.round(8 * Math.pow(1.3, m.lvl - 1)), st = 1 + m.lvl;
  gainTuvi(tv); S.stones += st;
  floatText(m.x, m.y - 14, '+' + tv, '#7fe3ff');
  burst(m.x, m.y - 4, 16, 70, TIERS[m.tier].c, 0.6, 2);
  if (Math.random() < 0.15) { S.pills++; log(`${TIERS[m.tier].name} rơi ra 1 Tụ Khí Đan.`, 'good'); }
}
function moveEntity(e, dx, dy, noSafe) {
  const ok = (x, y) => canStand(x, y) && !(noSafe && Math.hypot(x - CX, y - CY) < SAFE);
  if (dx && ok(e.x + dx, e.y)) e.x += dx;
  if (dy && ok(e.x, e.y + dy)) e.y += dy;
}

// ---------- Cập nhật ----------
function update(dt) {
  time += dt;
  p.cd -= dt; p.inv -= dt; flash -= dt; shake -= dt;

  if (trib) {
    trib.t += dt; trib.next -= dt;
    if (trib.next <= 0 && trib.t < trib.dur - 0.3) { addBolt(p.x, p.y); trib.next = 0.38; }
    if (trib.t >= trib.dur) {
      trib = null;
      if (Math.random() < MAJOR_CHANCE) levelUp();
      else {
        S.tuvi = Math.floor(S.tuvi * 0.7); S.hp = Math.max(1, Math.round(maxHp(S.L) * 0.3)); readyNotified = false;
        log('Đột phá thất bại... Tu vi hao tổn 30%. Hãy tích lũy rồi thử lại.', 'bad');
      }
    }
  } else {
    let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    p.moving = !!(dx || dy);
    if (p.moving) {
      p.med = false;
      const l = Math.hypot(dx, dy); dx /= l; dy /= l;
      p.fx = dx; p.fy = dy;
      if (Math.abs(dx) > Math.abs(dy)) { p.face = 'side'; p.flip = dx < 0; } else p.face = dy < 0 ? 'up' : 'down';
      moveEntity(p, dx * 82 * dt, dy * 82 * dt, false);
      p.anim += dt * 8;
    }
    if (keys.attack && p.cd <= 0) shoot();
  }

  const mh = maxHp(S.L);
  if (p.med) {
    gainTuvi(medRate() * dt);
    S.hp = Math.min(mh, S.hp + mh * 0.05 * dt);
    medFx.speed = inFormation() ? 1.6 : 1;
    medFx.update(dt);
  } else S.hp = Math.min(mh, S.hp + mh * 0.008 * dt);

  // Yêu thú
  if (monsters.length < MAX_MONSTERS) spawnMonster();
  const playerSafe = Math.hypot(p.x - CX, p.y - CY) < SAFE;
  for (let i = monsters.length - 1; i >= 0; i--) {
    const m = monsters[i];
    m.hit -= dt; m.atkCd -= dt; m.think -= dt;
    const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy) || 1;
    if (playerSafe || d > 170) m.aggro = false; else if (d < 80) m.aggro = true;
    if (m.aggro) {
      const sp = 38 + m.lvl * 1.5;
      m.vx = dx / d * sp; m.vy = dy / d * sp;
      if (d < 11) { m.vx = m.vy = 0; if (m.atkCd <= 0) { m.atkCd = 0.9; hurtPlayer(m.dmg); } }
    } else if (m.think <= 0) {
      m.think = rand(1, 3);
      if (Math.random() < 0.5) m.vx = m.vy = 0; else { const a = rand(0, 6.283); m.vx = Math.cos(a) * 18; m.vy = Math.sin(a) * 18; }
    }
    moveEntity(m, (m.vx + m.kx) * dt, (m.vy + m.ky) * dt, true);
    m.kx *= 0.85; m.ky *= 0.85;
  }

  // Kiếm khí
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    s.x += s.vx * dt; s.y += s.vy * dt; s.dist += 230 * dt;
    s.fx.update(dt);
    let dead = s.dist > 150;
    const t = tileAt(Math.floor(s.x / T), Math.floor((s.y + 6) / T));
    if (t === TREE || t === ROCK) dead = true;
    for (let j = monsters.length - 1; j >= 0 && !dead; j--) {
      const m = monsters[j];
      if (Math.hypot(m.x - s.x, m.y - 4 - s.y) < 9) {
        dead = true;
        m.hp -= s.dmg; m.hit = 0.12; m.aggro = true;
        m.kx = s.vx * 0.5; m.ky = s.vy * 0.5;
        floatText(m.x, m.y - 12, '-' + s.dmg, '#fff');
        if (m.hp <= 0) { killMonster(m); monsters.splice(j, 1); }
      }
    }
    if (dead) { spawnFx('kiem_trung', s.x, s.y); shots.splice(i, 1); }
  }

  for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.x += q.vx * dt; q.y += q.vy * dt; if ((q.life -= dt) <= 0) parts.splice(i, 1); }
  for (let i = texts.length - 1; i >= 0; i--) { const q = texts[i]; q.y -= 18 * dt; if ((q.life -= dt) <= 0) texts.splice(i, 1); }
  for (let i = fxs.length - 1; i >= 0; i--) if (fxs[i].update(dt).done) fxs.splice(i, 1);

  if ((saveT += dt) > 3) { saveT = 0; save(); }
}

// ---------- Vẽ ----------
function pxRing(x, y, r, n, rot, col, size) {
  ctx.fillStyle = col;
  for (let i = 0; i < n; i++) { const a = rot + i / n * 6.283; ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.6), size, size); }
}

function render() {
  let camX = Math.round(Math.max(0, Math.min(MW * T - W, p.x - W / 2)));
  let camY = Math.round(Math.max(0, Math.min(MH * T - H, p.y - 8 - H / 2)));
  if (shake > 0) { camX += Math.round(rand(-2, 2)); camY += Math.round(rand(-2, 2)); }
  ctx.setTransform(1, 0, 0, 1, -camX, -camY);

  const tx0 = Math.floor(camX / T), ty0 = Math.floor(camY / T), tx1 = tx0 + Math.ceil(W / T) + 1, ty1 = ty0 + Math.ceil(H / T) + 1;
  const objs = [];
  for (let ty = ty0; ty <= ty1 + 2; ty++) for (let tx = tx0 - 1; tx <= tx1; tx++) {
    const t = tileAt(tx, ty), x = tx * T, y = ty * T;
    if (ty <= ty1) {
      if (t === WATER) ctx.drawImage(waterTiles[(Math.floor(time * 1.5) + tx + ty) & 1], x, y);
      else if (t === STONE) ctx.drawImage(stoneTile, x, y);
      else ctx.drawImage(grassTiles[Math.floor(hash(tx, ty, 5) * 4)], x, y);
    }
    if (t === TREE) { const v = hash(tx, ty, 6); objs.push({ y: y + T, img: treeSprs[v < 0.12 ? 2 : v < 0.56 ? 0 : 1], x: x - 2, dy: y + T - 28 }); }
    else if (t === ROCK) objs.push({ y: y + T - 2, img: rockSpr, x: x + 1, dy: y + 5 });
  }

  // Tụ linh trận
  ctx.globalCompositeOperation = 'lighter';
  const glow = p.med && inFormation() ? 1 : 0.55;
  ctx.globalAlpha = glow;
  pxRing(CX, CY, FORM_R, 28, time * 0.5, '#3fb8d8', 2);
  pxRing(CX, CY, FORM_R * 0.62, 16, -time * 0.8, '#7fe3ff', 2);
  pxRing(CX, CY, FORM_R * 0.28, 8, time * 1.2, '#ffe08a', 2);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

  // Vật thể sắp theo y
  for (const m of monsters) objs.push({ y: m.y, m });
  objs.push({ y: p.y, player: true });
  objs.sort((a, b) => a.y - b.y);
  for (const o of objs) {
    if (o.img) ctx.drawImage(o.img, o.x, o.dy);
    else if (o.m) {
      const m = o.m, hop = (m.vx || m.vy) ? Math.abs(Math.sin(time * 9 + m.ph)) * 2 : 0;
      const mx = Math.round(m.x - 6), my = Math.round(m.y - 9 - hop);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(mx + 1, Math.round(m.y) - 1, 10, 2);
      ctx.drawImage(m.hit > 0 ? BEAST_WHITE : TIERS[m.tier].spr, mx, my);
      if (m.hp < m.max) {
        ctx.fillStyle = '#1a1423'; ctx.fillRect(mx, my - 4, 12, 3);
        ctx.fillStyle = '#e2584f'; ctx.fillRect(mx + 1, my - 3, Math.max(1, Math.round(10 * m.hp / m.max)), 1);
      }
    } else {
      if (p.inv > 0 && Math.floor(time * 20) % 2) continue;
      const x = Math.round(p.x - 6), fy = Math.round(p.y);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + 1, fy - 1, 10, 2);
      if (p.med) {
        medFx.x = Math.round(p.x); medFx.y = fy; medFx.lightGain = inFormation() ? 1 : 0.6; medFx.draw(ctx);
        ctx.drawImage(SPR.sit, x, fy - 14 - Math.round(Math.sin(time * 2) * 1.5 + 1.5));
      }
      else {
        const spr = SPR[p.face][p.moving ? Math.floor(p.anim) % 4 : 0];
        if (p.face === 'side' && p.flip) { ctx.save(); ctx.translate(x + 12, fy - 16); ctx.scale(-1, 1); ctx.drawImage(spr, 0, 0); ctx.restore(); }
        else ctx.drawImage(spr, x, fy - 16);
      }
    }
  }

  // Hiệu ứng beanfx, rồi tới hạt sáng (cộng sáng)
  for (const s of shots) { s.fx.x = Math.round(s.x); s.fx.y = Math.round(s.y); s.fx.draw(ctx); }
  for (const fx of fxs) fx.draw(ctx);
  ctx.globalCompositeOperation = 'lighter';
  for (const q of parts) { ctx.globalAlpha = Math.min(1, q.life / q.max * 1.5); ctx.fillStyle = q.color; ctx.fillRect(Math.round(q.x), Math.round(q.y), q.size, q.size); }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  ctx.font = '8px monospace'; ctx.textAlign = 'center';
  for (const q of texts) {
    ctx.globalAlpha = Math.min(1, q.life * 2);
    ctx.fillStyle = '#000'; ctx.fillText(q.text, Math.round(q.x) + 1, Math.round(q.y) + 1);
    ctx.fillStyle = q.color; ctx.fillText(q.text, Math.round(q.x), Math.round(q.y));
  }
  ctx.globalAlpha = 1;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (trib) { ctx.fillStyle = 'rgba(20,10,50,.35)'; ctx.fillRect(0, 0, W, H); }
  if (flash > 0) { ctx.fillStyle = `rgba(230,220,255,${Math.min(0.7, flash * 3)})`; ctx.fillRect(0, 0, W, H); }
}

// ---------- HUD ----------
function hud() {
  const n = need(S.L), mh = maxHp(S.L), full = S.tuvi >= n;
  $('realm').textContent = levelName(S.L);
  $('hpTxt').textContent = `${Math.ceil(S.hp)} / ${mh}`;
  $('hpFill').style.width = S.hp / mh * 100 + '%';
  $('tvTxt').textContent = `${Math.floor(S.tuvi)} / ${n}` + (p.med ? `  (+${medRate().toFixed(1)}/s)` : '');
  $('tvFill').style.width = S.tuvi / n * 100 + '%';
  $('tvFill').classList.toggle('full', full);
  $('atkTxt').textContent = atk(S.L);
  $('stoneTxt').textContent = S.stones;
  $('pillTxt').textContent = S.pills;
  $('btnMed').classList.toggle('on', p.med);
  const canBreak = full && S.L < MAX_L && !trib;
  $('btnBreak').classList.toggle('ready', canBreak);
  $('btnBreak').disabled = !canBreak;
  $('btnBreak').textContent = isMajor(S.L) ? `Độ kiếp ${Math.round(MAJOR_CHANCE * 100)}% (B)` : 'Đột phá (B)';
  $('btnPill').disabled = S.pills <= 0 || full;
  $('btnBuy').disabled = S.stones < PILL_COST;
}

// ---------- Điều khiển ----------
const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'attack', KeyJ: 'attack' };
addEventListener('keydown', e => {
  if (KEYMAP[e.code]) { keys[KEYMAP[e.code]] = true; e.preventDefault(); return; }
  if (e.repeat) return;
  if (e.code === 'KeyT') toggleMed();
  else if (e.code === 'KeyB') tryBreak();
  else if (e.code === 'Digit1') usePill();
  else if (e.code === 'Digit2') buyPill();
});
addEventListener('keyup', e => { if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
addEventListener('beforeunload', save);
const bind = (id, fn) => $(id).addEventListener('click', e => { fn(); e.currentTarget.blur(); });
bind('btnMed', toggleMed); bind('btnBreak', tryBreak); bind('btnPill', usePill); bind('btnBuy', buyPill);
bind('reset', () => {
  if (!confirm('Xóa toàn bộ tiến độ và chơi lại từ đầu?')) return;
  S = fresh(); p.x = S.x; p.y = S.y; p.med = false; trib = null; readyNotified = false; monsters.length = 0; save();
  log('Bắt đầu lại con đường tu tiên.');
});

// ---------- Vòng lặp ----------
let last = performance.now(), hudT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt); render();
  if ((hudT += dt) > 0.1) { hudT = 0; hud(); }
  requestAnimationFrame(frame);
}
for (let i = 0; i < MAX_MONSTERS; i++) spawnMonster();
readyNotified = S.tuvi >= need(S.L);
log('Ngồi vào tụ linh trận và nhấn T để tu luyện.', 'gold');
log('Yêu thú ở ngoài vùng trận. Càng đi xa, chúng càng mạnh.');
hud();
window.__game = { get S() { return S; }, p, monsters, shots, fxs, update };   // để tiện gỡ lỗi
requestAnimationFrame(frame);
})();
