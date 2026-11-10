// Điều phối: vòng lặp, các cảnh (động phủ / bí cảnh), chuyển trạng thái HUB -> PREPARE -> RUN <-> CARD_DRAFT -> RESULTS -> HUB.
import { VIEW, HUB, PLAYER, BASIC_ATTACK, MEDITATION, HUB_MONSTER as HM, REALM, FEATURES, ITEMS } from './core/config.js';
import { makeInput } from './core/input.js';
import { makeHubMap } from './world/map.js';
import { levelName, maxHp, atk, need, isMajor, realmOf, REALMS, MAX_L } from './progression/realm.js';
import { drawCards, applyCard } from './progression/draft.js';
import * as C from './systems/cultivation.js';
import { createRun, updateRun, endRun, refreshMaxHp } from './systems/run.js';
import { runStats } from './systems/combat.js';
import { spawnHubMonster, updateMonsters, reapMonsters, damageMonster, moveEntity } from './entities/monsters.js';
import { loadSave, writeSave, commitMigration, exportSave, importSave, defaultMeta, KEYS } from './persistence/save.js';
import { loadFx, createFx } from '../lib/beanfx.js';
import { loadPixelfx } from './render/pixelfx.js';
import { makeVis, consumeEvents, updateVis, clearVis, render, spawnFx, burst, floatText, addShake, addFlash, part } from './render/render.js';
import * as UI from './ui/ui.js';
import { EVOLUTIONS } from './data/skills.js';

const { W, H } = VIEW;
const $ = id => document.getElementById(id);
const cv = $('game'), ctx = cv.getContext('2d');
cv.width = W; cv.height = H;
ctx.imageSmoothingEnabled = false;

function fit() {
  let s = Math.min(innerWidth / W, innerHeight / H);
  if (s >= 1) s = Math.floor(s * 2) / 2;
  cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px';
  $('wrap').style.fontSize = Math.max(9, 6.2 * s) + 'px';
}
addEventListener('resize', fit); fit();

// ---------- tài nguyên ----------
const FX = {};
for (const name of ['kiem_khi', 'kiem_trung', 'loi_kiep', 'dot_pha', 'toa_thien']) FX[name] = await loadFx(`fx/${name}.json`);
const vis = makeVis(FX);
const medFx = createFx(FX.toa_thien);
// Sheet pixelfx (tùy chọn): lỗi tải thì quay về hình vẽ bằng code, game vẫn chạy
if (FEATURES.pixelfxAssets) {
  try {
    vis.pfx = { portal: createFx(await loadPixelfx('fx/pixelfx/portal.json')) };
  } catch (e) { console.warn('[pixelfx] dùng hình dự phòng:', e); }
  // VFX tự làm bằng quy trình pixelfx, xuất 2 lớp màu + sáng (tools/pixelfx_layers.mjs)
  try {
    vis.pfxSkills = { tornado: createFx(await loadFx('fx/pixelfx/hoa-long-quyen.json')) };
  } catch (e) { console.warn('[pixelfx] lốc lửa dùng hình dự phòng:', e); }
}

// ---------- thế giới động phủ ----------
const hubMap = makeHubMap();
const hub = { kind: 'hub', map: hubMap, monsters: [], projectiles: null };
const CX = hubMap.cx, CY = hubMap.cy;
const HUB_SPAWN = { x: CX + HUB.RESPAWN.dx, y: CY + HUB.RESPAWN.dy };
const PORTAL = { x: CX + HUB.PORTAL.dx, y: CY + HUB.PORTAL.dy, near: false };
const SAFE = { x: CX, y: CY, r: HUB.SAFE_TILES * 16 };
const saveCtx = { canStand: hubMap.canStand, hubSpawn: HUB_SPAWN };

// ---------- lưu ----------
const storage = {
  getItem: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { console.warn('Không lưu được', k, e); } },
};
const loaded = loadSave(storage, saveCtx);
let meta = loaded.meta;
const startNotes = [];
if (loaded.warnings.length) console.warn('[save]', loaded.source, loaded.warnings);
if (loaded.source === 'v1') {
  const ok = commitMigration(storage, meta, saveCtx);
  startNotes.push(ok ? ['Đã chuyển save cũ sang định dạng mới (bản cũ vẫn được giữ).', 'good'] : ['Không xác minh được save mới; bản cũ vẫn giữ nguyên.', 'bad']);
}
if (loaded.recovered) startNotes.push(['Save hiện tại bị hỏng, đã khôi phục bản trước đó.', 'bad']);
function save() {
  if (view !== 'HUB' && run) meta.hubPos = { ...hubPosBeforeRun };
  else meta.hubPos = { x: p.x, y: p.y };
  writeSave(storage, meta);
}

// ---------- người chơi ----------
const p = { x: meta.hubPos.x, y: meta.hubPos.y, face: 'down', flip: false, fx: 0, fy: 1, moving: false, anim: 0, med: false, cd: 0, inv: 0, inForm: false, dead: false };
let view = 'HUB', paused = false, run = null, hubPosBeforeRun = null;
let time = 0, trib = null, readyNotified = C.isFull(meta), saveT = 0;
const hubShots = [], ev = [];
const applySettings = () => { vis.reduce = meta.settings.reduceEffects; vis.noShake = !meta.settings.screenShake; };
applySettings();

const inForm = () => Math.hypot(p.x - CX, p.y - CY) < HUB.FORM_R;
const inSafe = () => Math.hypot(p.x - SAFE.x, p.y - SAFE.y) < SAFE.r;

// ---------- động phủ: hành động (giữ nguyên hành vi v0.1) ----------
function gainTuvi(v) {
  if (C.gainTuvi(meta, v) && !readyNotified) {
    readyNotified = true;
    UI.log(meta.realmLevel >= MAX_L ? 'Đã tới đỉnh phong của bản thử nghiệm này.' : 'Tu vi viên mãn! Nhấn B để đột phá.', 'gold');
  }
}
function toggleMed() {
  if (trib || view !== 'HUB') return;
  p.med = !p.med;
  if (p.med) UI.log(inForm() ? 'Tọa thiền trong tụ linh trận — tốc độ tu luyện ×3.' : 'Tọa thiền. (Vào tụ linh trận giữa bản đồ sẽ nhanh gấp 3.)');
}
function levelUp() {
  C.levelUp(meta); readyNotified = false;
  spawnFx(vis, 'dot_pha', p.x, p.y, { onHit: () => { addFlash(vis, 0.18); addShake(vis, 0.3); } });
  UI.log(`Đột phá thành công: ${levelName(meta.realmLevel)}!`, 'gold');
  save();
}
function tryBreak() {
  if (view !== 'HUB' || trib || !C.canBreak(meta)) return;
  if (isMajor(meta.realmLevel)) {
    p.med = false;
    trib = { t: 0, next: 0.2 };
    UI.log(`Lôi kiếp giáng xuống! Xung kích ${REALMS[realmOf(meta.realmLevel + 1)]}...`, 'bad');
  } else levelUp();
}
function usePill() {
  if (view !== 'HUB') return;
  const v = C.usePill(meta);
  if (!v) return;
  if (C.isFull(meta) && !readyNotified) { readyNotified = true; UI.log('Tu vi viên mãn! Nhấn B để đột phá.', 'gold'); }
  floatText(vis, p.x, p.y - 20, '+' + v, '#7fe3ff');
  burst(vis, p.x, p.y - 8, 12, 50, '#7fe3ff');
}
function buyPill() { if (view === 'HUB' && C.buyPill(meta)) UI.log('Mua 1 Tụ Khí Đan.'); }
function hubShoot() {
  p.cd = BASIC_ATTACK.CD; p.med = false;
  let dx = p.fx, dy = p.fy, best = BASIC_ATTACK.AIM_RANGE;
  for (const m of hub.monsters) {
    const d = Math.hypot(m.x - p.x, m.y - p.y);
    if (d < best) { best = d; dx = m.x - p.x; dy = (m.y - 4) - (p.y - 8); }
  }
  const l = Math.hypot(dx, dy) || 1;
  hubShots.push({ x: p.x, y: p.y - 8, vx: dx / l * BASIC_ATTACK.SPEED, vy: dy / l * BASIC_ATTACK.SPEED, dist: 0, dmg: atk(meta.realmLevel), fx: createFx(FX.kiem_khi, { heading: Math.atan2(dy, dx) }) });
}
function hurtHubPlayer(d) {
  if (p.inv > 0 || trib) return;
  meta.hp -= d; p.inv = PLAYER.INVULN; p.med = false; addShake(vis, 0.15);
  floatText(vis, p.x, p.y - 20, '-' + d, '#ff8f8a');
  if (meta.hp <= 0) {
    C.deathPenalty(meta);
    p.x = HUB_SPAWN.x; p.y = HUB_SPAWN.y; readyNotified = C.isFull(meta);
    hub.monsters.forEach(m => { m.aggro = false; });
    UI.log('Trọng thương! Được đưa về tụ linh trận, hao tổn 10% tu vi.', 'bad');
    save();
  }
}
function killHubMonster(m) {
  const tv = Math.round(HM.TUVI_BASE * Math.pow(HM.TUVI_GROWTH, m.lvl - 1)), st = 1 + m.lvl;
  gainTuvi(tv); meta.linhThach += st;
  floatText(vis, m.x, m.y - 14, '+' + tv, '#7fe3ff');
  burst(vis, m.x, m.y - 4, 16, 70, ['#9aa0b4', '#f08a3c', '#7fdcec', '#a468e0'][m.tier], 0.6, 2);
  if (Math.random() < HM.PILL_DROP) { meta.pills++; UI.log(`${['Dã Lang', 'Hỏa Hồ', 'Huyền Băng Thú', 'Ma Ảnh'][m.tier]} rơi ra 1 Tụ Khí Đan.`, 'good'); }
}

// ---------- di chuyển dùng chung ----------
function movePlayer(map, dt, speedMult) {
  let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  p.moving = !!(dx || dy);
  if (!p.moving) return false;
  const l = Math.hypot(dx, dy); dx /= l; dy /= l;
  p.fx = dx; p.fy = dy;
  if (Math.abs(dx) > Math.abs(dy)) { p.face = 'side'; p.flip = dx < 0; } else p.face = dy < 0 ? 'up' : 'down';
  moveEntity(map, p, dx * PLAYER.SPEED * speedMult * dt, dy * PLAYER.SPEED * speedMult * dt, null);
  p.anim += dt * 8;
  return true;
}

function updateHub(dt) {
  p.cd -= dt; p.inv -= dt;
  if (trib) {
    trib.t += dt; trib.next -= dt;
    if (trib.next <= 0 && trib.t < REALM.TRIB_DURATION - 0.3) {
      const tx = p.x, ty = p.y;
      spawnFx(vis, 'loi_kiep', tx, ty, { flip: Math.random() < 0.5, onHit: () => { addFlash(vis, 0.22); addShake(vis, 0.25); burst(vis, tx, ty - 6, 10, 90, '#d9c8ff', 0.5, 2); } });
      trib.next = REALM.TRIB_BOLT_EVERY;
    }
    if (trib.t >= REALM.TRIB_DURATION) {
      trib = null;
      if (C.resolveTribulation(meta, Math.random)) { readyNotified = false; afterMajor(); }
      else { readyNotified = false; UI.log('Đột phá thất bại... Tu vi hao tổn 30%. Hãy tích lũy rồi thử lại.', 'bad'); save(); }
    }
  } else {
    if (movePlayer(hubMap, dt, 1)) p.med = false;
    if (keys.attack && p.cd <= 0) hubShoot();
  }
  p.inForm = inForm();
  const mh = maxHp(meta.realmLevel);
  if (p.med) {
    gainTuvi(C.medRate(meta.realmLevel, p.inForm) * dt);
    meta.hp = Math.min(mh, meta.hp + mh * MEDITATION.HEAL * dt);
    medFx.speed = p.inForm ? 1.6 : 1;
    medFx.update(dt);
  } else meta.hp = Math.min(mh, meta.hp + mh * MEDITATION.IDLE_HEAL * dt);

  if (hub.monsters.length < HUB.MAX_MONSTERS) spawnHubMonster(hub, p, Math.random);
  updateMonsters(hub, p, dt, ev, { safe: SAFE, onAttack: m => hurtHubPlayer(m.dmg) });

  for (let i = hubShots.length - 1; i >= 0; i--) {
    const s = hubShots[i];
    s.x += s.vx * dt; s.y += s.vy * dt; s.dist += BASIC_ATTACK.SPEED * dt;
    s.fx.update(dt);
    let dead = s.dist > BASIC_ATTACK.RANGE || hubMap.blocksShot(s.x, s.y + 6);
    for (const m of hub.monsters) {
      if (dead) break;
      if (m.dead || Math.hypot(m.x - s.x, m.y - 4 - s.y) >= 9) continue;
      dead = true;
      damageMonster(m, s.dmg, ev);
      m.kx = s.vx * 0.5; m.ky = s.vy * 0.5;
    }
    if (dead) { spawnFx(vis, 'kiem_trung', s.x, s.y); hubShots.splice(i, 1); }
  }
  reapMonsters(hub, killHubMonster);

  PORTAL.near = FEATURES.run && Math.hypot(p.x - PORTAL.x, p.y - PORTAL.y) < HUB.PORTAL.r;
  if ((saveT += dt) > 3) { saveT = 0; save(); }
}
function afterMajor() {
  spawnFx(vis, 'dot_pha', p.x, p.y, { onHit: () => { addFlash(vis, 0.18); addShake(vis, 0.3); } });
  UI.log(`Đột phá thành công: ${levelName(meta.realmLevel)}!`, 'gold');
  save();
}

// ---------- bí cảnh ----------
function openPrepare() {
  if (!FEATURES.run || view !== 'HUB' || trib || !PORTAL.near) return;
  view = 'PREPARE'; p.med = false; input.clear();
  UI.showPrepare(meta, startRun, () => { view = 'HUB'; });
}
function startRun(skill) {
  hubPosBeforeRun = { x: p.x, y: p.y };
  meta.hubPos = { ...hubPosBeforeRun };
  save();
  run = createRun({ seed: (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0, startSkill: skill, realmLevel: meta.realmLevel });
  p.x = run.scene.map.cx; p.y = run.scene.map.cy; p.inv = 1; p.med = false; p.cd = 0;
  hubShots.length = 0; clearVis(vis); input.clear(); ev.length = 0;
  view = 'RUN'; paused = false;
  UI.setMode('run');
  UI.log('Bước vào bí cảnh. Công pháp tự thi triển khi có yêu thú trong tầm.', 'gold');
}
function runShoot() {
  p.cd = BASIC_ATTACK.CD;
  let dx = p.fx, dy = p.fy, best = BASIC_ATTACK.AIM_RANGE;
  for (const m of run.scene.monsters) {
    const d = Math.hypot(m.x - p.x, m.y - p.y);
    if (d < best && run.scene.map.lineOfSight(p.x, p.y - 8, m.x, m.y - 4)) { best = d; dx = m.x - p.x; dy = (m.y - 4) - (p.y - 8); }
  }
  const l = Math.hypot(dx, dy) || 1, a = Math.atan2(dy, dx);
  run.scene.projectiles.push({ kind: 'bolt', x: p.x, y: p.y - 8, vx: dx / l * BASIC_ATTACK.SPEED, vy: dy / l * BASIC_ATTACK.SPEED, life: BASIC_ATTACK.RANGE / BASIC_ATTACK.SPEED, dmg: 1, pierce: 0, hits: new Set(), heading: a });
}
function updateRunView(dt) {
  p.cd -= dt; p.inv -= dt;
  movePlayer(run.scene.map, dt, runStats(run).moveSpeed);
  if (FEATURES.manualAttackInRun && keys.attack && p.cd <= 0) runShoot();
  updateRun(run, p, dt, ev);
  if (run.status === 'ENDED') { finishRun(); return; }
  if (run.pendingDrafts > 0) openDraft();
}
function openDraft() {
  view = 'CARD_DRAFT'; input.clear();
  const cards = drawCards(run, run.rng);
  const r = run;
  UI.showDraft(r, cards, card => {
    if (run !== r || view !== 'CARD_DRAFT') return;
    const ok = applyCard(r, card, {
      heal: f => { r.hp = Math.min(r.maxHp, r.hp + r.maxHp * f); },
      onMaxHpChange: () => refreshMaxHp(r, false),
    });
    r.pendingDrafts = Math.max(0, r.pendingDrafts - 1);
    if (!ok) UI.log('Thẻ không còn hợp lệ, bỏ qua.', 'bad');
    else if (card.type === 'EVOLUTION') {
      spawnFx(vis, 'dot_pha', p.x, p.y, { onHit: () => { addFlash(vis, 0.15); addShake(vis, 0.2); } });
      UI.log(`Tiến hóa: ${EVOLUTIONS[card.id].name}!`, 'gold');
    }
    view = 'RUN'; input.clear();
  });
}
function pauseRun() {
  if (view !== 'RUN' || paused) return;
  paused = true; input.clear();
  UI.showPause(() => { paused = false; input.clear(); }, () => { paused = false; endRun(run, 'ABANDON'); finishRun(); });
}
function finishRun() {
  view = 'RESULTS'; input.clear();
  const r = run;
  meta.stats.runs++;
  if (r.outcome === 'WIN') meta.stats.wins++;
  meta.stats.bestTime = Math.max(meta.stats.bestTime, Math.floor(r.time));
  meta.stats.bestLevel = Math.max(meta.stats.bestLevel, r.level);
  save();
  UI.showResults(r, returnToHub);
}
function returnToHub() {
  if (view !== 'RESULTS') return;
  run = null;
  p.x = hubPosBeforeRun.x; p.y = hubPosBeforeRun.y; p.inv = 0.5; p.med = false;
  hubPosBeforeRun = null;
  clearVis(vis); input.clear(); ev.length = 0;
  view = 'HUB';
  UI.setMode('hub');
  save();
}

// ---------- cài đặt ----------
function openSettings() {
  if (view !== 'HUB' || trib) return;
  view = 'SETTINGS'; p.med = false; input.clear();
  UI.showSettings(meta, {
    onClose: () => { view = 'HUB'; },
    onSetting: (k, v) => { meta.settings[k] = v; applySettings(); save(); },
    onExport: () => {
      save();
      const blob = new Blob([exportSave(meta)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `tutien_save_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    onImport: text => {
      const r = importSave(text, saveCtx);
      if (!r.ok) { alert('Không nhập được: ' + r.error); return; }
      if (!confirm(`Nhập save: ${levelName(r.meta.realmLevel)}, ${r.meta.linhThach} linh thạch, ${r.meta.pills} đan.\nTiến độ hiện tại sẽ được thay (bản hiện tại vẫn còn trong ô dự phòng).`)) return;
      save();
      meta = r.meta; p.x = meta.hubPos.x; p.y = meta.hubPos.y; readyNotified = C.isFull(meta); applySettings();
      save(); UI.closeModal(); view = 'HUB';
      UI.log('Đã nhập save.', 'good');
    },
    onReset: () => {
      if (!confirm('Xóa toàn bộ tiến độ và chơi lại từ đầu?\n(Bản trước vẫn còn trong ô dự phòng của trình duyệt; save v0.1 cũ không bị xóa.)')) return;
      save();
      meta = defaultMeta(HUB_SPAWN); p.x = HUB_SPAWN.x; p.y = HUB_SPAWN.y; p.med = false; trib = null; readyNotified = false;
      hub.monsters.length = 0; applySettings(); save();
      UI.closeModal(); view = 'HUB';
      UI.log('Bắt đầu lại con đường tu tiên.');
    },
  });
}

// ---------- điều khiển ----------
function onAction(code) {
  if (UI.modalOpen()) return UI.modalKey(code);
  if (view === 'RUN') {
    if (code === 'Escape' || code === 'KeyP') { pauseRun(); return true; }
    return false;
  }
  if (view !== 'HUB') return false;
  if (code === 'KeyT') toggleMed();
  else if (code === 'KeyB') tryBreak();
  else if (code === 'Digit1') usePill();
  else if (code === 'Digit2') buyPill();
  else if (code === 'KeyE') openPrepare();
  else return false;
  return true;
}
const input = makeInput(onAction);
const keys = input.keys;
const bind = (id, fn) => $(id).addEventListener('click', e => { fn(); e.currentTarget.blur(); });
bind('btnMed', toggleMed); bind('btnBreak', tryBreak); bind('btnPill', usePill); bind('btnBuy', buyPill);
bind('btnRun', openPrepare); bind('btnSettings', openSettings); bind('btnPause', pauseRun);
addEventListener('beforeunload', save);
addEventListener('pagehide', save);
addEventListener('blur', () => { if (view === 'RUN') pauseRun(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && view === 'RUN') pauseRun(); });

// ---------- vòng lặp ----------
let last = performance.now(), hudT = 0;
function frame(now) {
  // dấu thời gian rAF có thể sớm hơn `last` ở khung đầu -> dt âm làm hiệu ứng nhảy về khung -1
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
  let worldDt = 0;
  if (view === 'HUB') { time += dt; worldDt = dt; updateHub(dt); }
  else if (view === 'RUN' && !paused) { time += dt; worldDt = dt; updateRunView(dt); }
  consumeEvents(vis, ev);
  updateVis(vis, worldDt);
  if (vis.pfx && view === 'HUB') vis.pfx.portal.update(dt);
  if (vis.pfxSkills && view === 'RUN') vis.pfxSkills.tornado.update(worldDt);
  const scene = run && view !== 'HUB' ? run.scene : hub;
  render(ctx, { scene, player: p, time, vis, medFx, trib, inForm: p.inForm, portal: scene === hub ? PORTAL : null, run: scene === hub ? null : run, hubShots: scene === hub ? hubShots : null, dtWorld: worldDt });
  if ((hudT += dt) > 0.1) { hudT = 0; if (view === 'HUB' || !run) UI.hubHud(meta, p, trib, PORTAL.near); else UI.runHud(run); }
  input.endFrame();
  requestAnimationFrame(frame);
}

for (let i = 0; i < HUB.MAX_MONSTERS; i++) spawnHubMonster(hub, p, Math.random);
UI.setMode('hub');
UI.log('Ngồi vào tụ linh trận và nhấn T để tu luyện.', 'gold');
if (FEATURES.run) UI.log('Cổng bí cảnh ở phía bắc tụ linh trận — đứng gần và nhấn E.');
for (const [m, c] of startNotes) UI.log(m, c);
UI.hubHud(meta, p, trib, false);

// Gỡ lỗi (console): __game.meta, __game.p, __game.run, __game.view ...
window.__game = {
  get meta() { return meta; }, get run() { return run; }, get view() { return view; }, get paused() { return paused; },
  p, hub, keys, KEYS, save, get trib() { return trib; }, PORTAL, vis,
};
requestAnimationFrame(frame);
