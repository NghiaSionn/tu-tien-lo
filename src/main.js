// Điều phối: vòng lặp, các cảnh (động phủ / bí cảnh), chuyển trạng thái HUB -> PREPARE -> RUN <-> CARD_DRAFT -> RESULTS -> HUB.
import { VIEW, HUB, PLAYER, BASIC_ATTACK, MEDITATION, HUB_MONSTER as HM, REALM, FEATURES, ITEMS } from './core/config.js';
import { makeInput } from './core/input.js';
import { makeHubMap, makeSectMap } from './world/map.js';
import { levelName, maxHp, atk, need, isMajor, realmOf, REALMS, MAX_L, grantUnlocks } from './progression/realm.js';
import { drawCards, applyCard, rerollDraft } from './progression/draft.js';
import * as C from './systems/cultivation.js';
import { createTrib, updateTrib, clampToArena, phaseDef } from './systems/tribulation.js';
import { TRIBULATION } from './core/config.js';
import { createRun, updateRun, endRun, refreshMaxHp } from './systems/run.js';
import { runStats } from './systems/combat.js';
import { spawnHubMonster, updateMonsters, reapMonsters, damageMonster, moveEntity, makeMonster } from './entities/monsters.js';
import { loadSave, writeSave, commitMigration, exportSave, importSave, defaultMeta, KEYS } from './persistence/save.js';
import { loadFx, createFx } from '../lib/beanfx.js';
import { loadPixelfx } from './render/pixelfx.js';
import { makeVis, consumeEvents, updateVis, clearVis, render, spawnFx, burst, floatText, addShake, addFlash, part, PART_CAP } from './render/render.js';
import * as UI from './ui/ui.js';
import { EVOLUTIONS } from './data/skills.js';
import { computeRunReward, stageReward, claimReward, rewardText } from './progression/rewards.js';
import { shrineReady, useShrine, nearShrine, shrineSealed, CHOICES as SHRINE_CHOICES } from './systems/shrine.js';
import { gearMods } from './data/items.js';
import { craftItem, upgradeItem, equip, unequip } from './progression/gear.js';
import { evaluateAchievements } from './progression/achievements.js';
import { pull, shopBuy } from './progression/gacha.js';
import * as Audio from './audio/sfx.js';
import { makeRunEnemy } from './systems/director.js';
import { setupTouch } from './ui/touch.js';
import { createPlaytestLog } from './systems/playtest.js';
import { BUILD } from './core/config.js';
import { metaGoals, previewAfterClaim } from './progression/goals.js';
import { newDiscoveries } from './progression/codex.js';
import { pickVariant, variantOf } from './systems/variants.js';
import { shouldTip, tipText, markSeen, skipAll, replayTutorial } from './progression/tutorial.js';
import { unlockLore, loreEntries, markLoreRead } from './progression/lore.js';
import { SKILLS as SKILL_DEFS } from './data/skills.js';

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
// M7-02: điện thoại dọc -> nhắc xoay ngang (CSS hiện #rotate). Đang trong bí cảnh thì tự tạm dừng để không chết sau lớp phủ.
const portraitMq = window.matchMedia ? matchMedia('(orientation: portrait) and (max-width: 900px)') : null;
function onOrient() { if (portraitMq && portraitMq.matches && !document.body.classList.contains('rotate-ok') && typeof pauseRun === 'function') pauseRun(); }
portraitMq && portraitMq.addEventListener && portraitMq.addEventListener('change', onOrient);
document.getElementById('rotateOk')?.addEventListener('click', () => document.body.classList.add('rotate-ok'));

// ---------- tài nguyên ----------
const FX = {};
for (const name of ['kiem_khi', 'kiem_trung', 'loi_kiep', 'dot_pha', 'toa_thien']) FX[name] = await loadFx(`fx/${name}.json`);
// M5-03: VFX beanfx Lôi Cương Hộ Thể (draft vfx/drafts/loi_cuong_ho_the, K=0,36) — lớp sau + lớp trước/sáng; lỗi nạp thì vẽ vòng cũ
// M5-03 đợt 1: Lôi Vực, Hỏa Cầu (bay 8 hướng + nổ), Phong Nhận (8 hướng), Hỏa Long Quyển (dựng lại từ loc_gio_v2)
// đợt 2: Phi Kiếm Trận, Liệt Diễm (kiếm + vùng lửa), Băng Châm, Hàn Khí, Hỏa Luân, hắc diễm của boss
for (const name of ['loi_cuong_back', 'loi_cuong_front', 'loi_vuc', 'hoa_cau_bay', 'hoa_cau_no', 'phong_nhan', 'hoa_long_quyen_v2',
  'phi_kiem', 'liet_diem_kiem', 'liet_diem_vung', 'bang_cham', 'han_khi', 'hoa_luan', 'hac_diem_no', 'hac_diem_dan']) { try { FX[name] = await loadFx(`fx/${name}.json`); } catch (e) { console.warn('[fx]', name, e); } }
const vis = makeVis(FX);
const medFx = createFx(FX.toa_thien);
// M5-02: sprite sheet ChatGPT vẽ, tools/sprite_clean.py làm sạch (docs/concept/). Lỗi nạp thì dùng sprite code cũ.
// white/glow: bóng trắng (lóe trúng đòn) và bóng tím (viền tinh anh) dựng sẵn từ sheet
async function loadSheet(name) {
  const meta = await (await fetch(`sprites/${name}.json`)).json();
  const img = new Image(); img.src = 'sprites/' + meta.image; await img.decode();
  const tint = col => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); return c; };
  return { img, meta, white: tint('#ffffff'), glow: tint('#c070ff'), wind: tint('#7ff0c8') };   // wind: tàn ảnh Phong Ảnh Bộ
}
for (const [key, name] of [['hero', 'nhan_vat'], ['mobs', 'quai'], ['bosses', 'boss'], ['rung', 'rung'], ['congTrinh', 'cong_trinh'], ['icons', 'bieu_tuong'], ['tienHoa', 'tien_hoa'], ['bia', 'bia'],
  ...(FEATURES.sectHub || /[?&]sect=1/.test(location.search) ? [['tmCt', 'tm_cong_trinh'], ['tmDv', 'tm_do_vat'], ['tmCd', 'tm_cay_da']] : [])]) {
  try { vis[key] = await loadSheet(name); } catch (e) { console.warn('[sprite] dùng hình cũ:', name, e); }
}
// công trình động phủ (cổng, tụ linh trận, Linh Mạch) + VFX tiến hóa M7-12: cắt sát nội dung từng khung
function cropFrames(sheet) {
  const { img, meta } = sheet, [fw, fh] = meta.frameSize, out = {};
  for (const [n, [sx, sy]] of Object.entries(meta.frames)) {
    const c = document.createElement('canvas'); c.width = fw; c.height = fh; const g = c.getContext('2d'); g.drawImage(img, sx, sy, fw, fh, 0, 0, fw, fh);
    const d = g.getImageData(0, 0, fw, fh).data; let x0 = fw, y0 = fh, x1 = 0, y1 = 0;
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (d[(y * fw + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1; o.getContext('2d').drawImage(c, -x0, -y0);
    out[n] = o;
  }
  return out;
}
if (vis.tienHoa) vis.thx = cropFrames(vis.tienHoa);   // han_an, khoi_bang, vong_phong_an, bang_no
if (vis.congTrinh) vis.ct = cropFrames(vis.congTrinh);
if (vis.bia) vis.ct = { ...(vis.ct || {}), ...cropFrames(vis.bia) };   // M7-14: bia, bia_sang
// M8: công trình/đồ vật/cây tông môn (concept ảnh 1, tools/build_tong_mon.py)
if (vis.tmCt || vis.tmDv || vis.tmCd) vis.tm = Object.assign({}, ...[vis.tmCt, vis.tmDv, vis.tmCd].filter(Boolean).map(cropFrames));
// biểu tượng công pháp cho UI (thay emoji); thiếu sheet thì UI giữ emoji
if (vis.icons) UI.setIcons('sprites/' + vis.icons.meta.image, vis.icons.meta, vis.icons.img.width, vis.icons.img.height);
// lần đầu mở trên web (GitHub Pages) mất vài giây tải ~130 file: chữ "Đang tải…" che màn đen tới đây
document.getElementById('loading')?.remove();
// M5-01: vật thể rừng (cây, đá, cỏ hoa...) cắt thành canvas riêng: vật che nhân vật dùng kích thước ảnh để làm mờ
if (vis.rung) {
  // cây vẽ ×2 (pixel gấp đôi): chơi tay thấy cây ngang nhân vật là sai tỉ lệ -> cây ~70 px, gấp đôi người
  const { img, meta } = vis.rung, [fw, fh] = meta.frameSize, [ax, ay] = meta.pivot;
  const BIG = new Set(['tung1', 'tung2', 'la1', 'la2', 'dao1', 'dao2', 'tre']);
  vis.props = {};
  for (const [n, [sx, sy]] of Object.entries(meta.frames)) {
    const k = BIG.has(n) ? 2 : 1, c = document.createElement('canvas'); c.width = fw * k; c.height = fh * k;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(img, sx, sy, fw, fh, 0, 0, fw * k, fh * k);
    c.ax = ax * k + (k - 1); c.ay = ay * k + (k - 1);   // pivot (chân) theo tỉ lệ
    vis.props[n] = c;
  }
}
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
// M5-03: Hỏa Long Quyển bằng beanfx (thay bản pixelfx, ADR 0005); bản pixelfx còn làm dự phòng
if (FX.hoa_long_quyen_v2) vis.pfxSkills = { ...(vis.pfxSkills || {}), tornado: createFx(FX.hoa_long_quyen_v2) };

// ---------- thế giới động phủ ----------
// M8: ?sect=1 / ?sect=0 ghi đè FEATURES.sectHub cho lần mở này (thử sảnh tông môn khi cờ mặc định còn tắt)
{ const q = new URLSearchParams(location.search).get('sect'); if (q === '1' || q === '0') FEATURES.sectHub = q === '1'; }
const hubMap = FEATURES.sectHub ? makeSectMap() : makeHubMap();   // M8-02: sảnh tông môn (cờ) hoặc động phủ cũ
const SECT_MAP = hubMap.sect || null;
const hub = { kind: 'hub', map: hubMap, monsters: [], projectiles: null };
const CX = hubMap.cx, CY = hubMap.cy;
const HUB_SPAWN = { x: CX + HUB.RESPAWN.dx, y: CY + HUB.RESPAWN.dy };
const PORTAL = SECT_MAP ? { ...SECT_MAP.portal, near: false } : { x: CX + HUB.PORTAL.dx, y: CY + HUB.PORTAL.dy, near: false };
const BIA = SECT_MAP ? { ...SECT_MAP.bia, near: false, lit: false } : { x: CX + HUB.BIA.dx, y: CY + HUB.BIA.dy, near: false, lit: false };   // M7-14 (M8: vườn bia phía nam)
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
// M3-02: save cũ đã ở đại cảnh giới cao vẫn nhận đủ mở khóa
grantUnlocks(meta);
// M4-02: save cũ đã thắng/đạt cảnh giới nhận thành tựu tương ứng (idempotent)
for (const a of evaluateAchievements(meta)) startNotes.push([`Thành tựu: ${a.name}!`, 'gold']);
// M3-03: tải lại/đóng trang giữa lúc độ kiếp -> tính là thất bại (không né được hình phạt bằng cách tải lại)
if (meta.tribPending) {
  C.failTribulation(meta);
  writeSave(storage, meta);
  startNotes.push(['Độ kiếp bị gián đoạn — tính là thất bại: giữ cảnh giới, tu vi hao tổn 30%.', 'bad']);
}
// M2-03: phần thưởng run còn treo (đóng/tải lại trang lúc đang ở bảng kết quả) -> nhận ngay, đúng một lần
if (meta.pendingReward) {
  const evosBefore = [...meta.stats.evos];
  const got = claimReward(meta);
  writeSave(storage, meta);
  if (got) startNotes.push([`Đã nhận phần thưởng bí cảnh còn treo: ${rewardText(got)}.`, 'good']);
  for (const id of newDiscoveries(evosBefore, meta.stats.evos)) startNotes.push([`Đồ Giám: lần đầu khám phá tiến hóa ${EVOLUTIONS[id].name}! (K để xem)`, 'gold']);
}
// M7-04: nhật ký playtest opt-in (mặc định tắt, khóa riêng, không gửi mạng). setItem để ném lỗi để log tự bỏ bớt khi đầy.
const PT = createPlaytestLog({
  storage: { getItem: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, setItem: (k, v) => localStorage.setItem(k, v) },
  build: BUILD, platform: window.matchMedia && matchMedia('(pointer: coarse)').matches ? 'touch' : 'desktop',
});
PT.sessionStart({ realm: meta.realmLevel, runs: meta.stats.runs });
addEventListener('pagehide', () => PT.sessionEnd());
const metaAct = (action, ok = true) => PT.log('meta_action', { action, ok: !!ok, realm: meta.realmLevel });
function save() {
  if (view !== 'HUB' && run) meta.hubPos = { ...hubPosBeforeRun };
  else meta.hubPos = { x: p.x, y: p.y };
  writeSave(storage, meta);
}

// ---------- người chơi ----------
const p = { x: meta.hubPos.x, y: meta.hubPos.y, face: 'down', flip: false, fx: 0, fy: 1, moving: false, anim: 0, med: false, cd: 0, inv: 0, inForm: false, dead: false };
let view = 'HUB', paused = false, run = null, hubPosBeforeRun = null;
let time = 0, trib = null, readyNotified = C.isFull(meta), saveT = 0, dryNotified = false;
const hubShots = [], ev = [];
const applySettings = () => { vis.reduce = meta.settings.reduceEffects; vis.noShake = !meta.settings.screenShake; vis.quality = meta.settings.quality; Audio.applyAudioSettings(meta.settings); };
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
function notifyFull() {
  if (!C.isFull(meta) || readyNotified) return;
  readyNotified = true;
  UI.log(meta.realmLevel >= MAX_L ? 'Đã tới đỉnh phong của bản thử nghiệm này.' : isMajor(meta.realmLevel) ? 'Tu vi viên mãn! Nhấn B để độ thiên kiếp.' : 'Tu vi viên mãn! Nhấn B để đột phá.', 'gold');
}
function toggleMed() {
  if (trib || view !== 'HUB') return;
  p.med = !p.med;
  if (!p.med) return;
  dryNotified = false;
  Audio.play('med');
  if (meta.lingQi <= 0) UI.log(inForm() ? 'Không còn linh khí — chỉ hấp thu được rất chậm. Vào bí cảnh (E) mang linh khí về, hoặc dùng Tụ Khí Đan.' : 'Không còn linh khí. Vào bí cảnh mang linh khí về; thiền trong tụ linh trận mới hấp thu được.', 'bad');
  else UI.log(inForm() ? `Tọa thiền trong tụ linh trận — chuyển hóa ${Math.floor(meta.lingQi)} linh khí, nhanh ×3 và lời hơn.` : `Tọa thiền — chuyển hóa linh khí. (Trong tụ linh trận nhanh ×3, mỗi linh khí cho nhiều tu vi hơn.)`);
}
// M3-02: nêu chỉ số và tính năng mới sau đột phá (một dòng, không chuỗi popup)
function realmUpNotes(r) {
  UI.log(`Công ${atk(r.from)} → ${atk(r.to)} · Khí huyết ${maxHp(r.from)} → ${maxHp(r.to)}.`, 'good');
  for (const u of r.granted) UI.log(`Mở khóa: ${u.text}.`, 'gold');
  checkAchievements();
}
// M4-02: thành tựu (idempotent) — gọi sau khi nhận thưởng run / đột phá
function checkAchievements() {
  for (const a of evaluateAchievements(meta)) {
    const r = a.reward;
    UI.log(`Thành tựu: ${a.name}!${r.skill ? ` Mở công pháp ${SKILL_DEFS[r.skill].name}.` : ''}${r.tickets ? ` +${r.tickets}🎫` : ''}${r.craftMats ? ` +${r.craftMats}🔩` : ''}`, 'gold');
  }
}

// ---------- M4: giao dịch có lưu chắc chắn ----------
// Thao tác trên bản sao; ghi save rồi đọc lại khớp mới thay meta. Lưu lỗi -> không phát/không trừ gì (nghiệm thu M4-03).
function transact(fn) {
  const draft = JSON.parse(JSON.stringify(meta));
  const out = fn(draft);
  if (!out || out.ok === false) return out;
  draft.hubPos = view !== 'HUB' && run ? { ...hubPosBeforeRun } : { x: p.x, y: p.y };
  let ok = false;
  try { const raw = writeSave(storage, draft); ok = storage.getItem(KEYS.V2) === raw; } catch (e) { ok = false; }
  if (!ok) { UI.log('Không lưu được — thao tác bị hủy, không mất gì.', 'bad'); return { ok: false, reason: 'lỗi lưu' }; }
  meta = draft;
  return out;
}
function openForge(note = '') {
  if (view !== 'HUB' || trib) return;
  UI.showForge(meta, (a, id) => {
    const fn = { craft: m => craftItem(m, id), upgrade: m => upgradeItem(m, id), equip: m => equip(m, id), unequip: m => unequip(m, id) }[a];
    const r = transact(fn);
    metaAct(a, !(r && r.ok === false));
    openForge(r && r.ok === false ? `Không được: ${r.reason}.` : '');
  }, note);
}
let lastPullAt = 0;
function openGacha(last = null, note = '') {
  if (view !== 'HUB' || trib) return;
  UI.showGacha(meta, (a, id, t) => {
    if (a === 'pull') {
      const now = performance.now();
      if (now - lastPullAt < 300) return;            // chống bấm dồn: một lượt mỗi lần bấm
      lastPullAt = now;
      let res = null;
      const r = transact(m => { res = pull(m); return res ? { ok: true } : { ok: false, reason: 'hết vé' }; });
      metaAct('gacha_pull', r && r.ok !== false && res);
      if (r && r.ok !== false && res) { UI.log(`Truyền Thừa Các: ${res.name}${res.dup ? ` (trùng → +${res.shards} mảnh)` : ''}.`, res.rarity === 'epic' ? 'gold' : 'good'); openGacha(res); }
      else openGacha(null, r ? `Không quay được: ${r.reason}.` : '');
    } else if (a === 'shop') {
      const r = transact(m => shopBuy(m, t, id));
      metaAct('gacha_shop', !(r && r.ok === false));
      openGacha(null, r && r.ok === false ? `Không đổi được: ${r.reason}.` : 'Đã đổi.');
    }
  }, last, note);
}
function levelUp() {
  const r = C.levelUp(meta); readyNotified = false;
  spawnFx(vis, 'dot_pha', p.x, p.y, { onHit: () => { addFlash(vis, 0.18); addShake(vis, 0.3); } });
  UI.log(`Đột phá thành công: ${levelName(meta.realmLevel)}!`, 'gold');
  realmUpNotes(r);
  save();
  loreCheck();
}
function tryBreak() {
  if (view !== 'HUB' || trib || !C.canBreak(meta)) return;
  if (isMajor(meta.realmLevel) && TRIBULATION.ENABLED) {
    // M3-03: thiên kiếp tương tác trong trận quanh tụ linh trận. Đánh dấu trước khi bắt đầu: tải lại giữa chừng = thất bại
    p.med = false; p.x = CX; p.y = CY + 12;
    trib = createTrib((meta.realmLevel * 7919 + meta.stats.runs * 104729 + Math.floor(meta.cultivationXp)) >>> 0, CX, CY);
    trib.interactive = true; trib.shownPhase = -1;
    meta.tribPending = true; save(); metaAct('trib_start');
    UI.log(`Thiên kiếp giáng xuống! Xung kích ${REALMS[realmOf(meta.realmLevel + 1)]} — né các vùng sét đã đánh dấu, đứng vào ô an toàn khi Thiên lôi phủ trận.`, 'bad');
  } else if (isMajor(meta.realmLevel)) {
    p.med = false;
    trib = { t: 0, next: 0.2 };
    UI.log(`Lôi kiếp giáng xuống! Xung kích ${REALMS[realmOf(meta.realmLevel + 1)]}...`, 'bad');
  } else { levelUp(); metaAct('breakthrough'); }
}
function usePill() {
  if (view !== 'HUB') return;
  const v = C.usePill(meta);
  if (!v) return;
  metaAct('pill_use');
  UI.log(`Tụ Khí Đan hóa thành ${v} linh khí — tọa thiền (T) để chuyển hóa thành tu vi.`, 'good');
  floatText(vis, p.x, p.y - 20, '+' + v + ' ✨', '#7fe3ff');
  burst(vis, p.x, p.y - 8, 12, 50, '#7fe3ff');
}
function buyPill() { if (view === 'HUB' && C.buyPill(meta)) { UI.log('Mua 1 Tụ Khí Đan.'); metaAct('pill_buy'); } }
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
  meta.hp -= d; p.inv = PLAYER.INVULN; p.hurtT = 0.2; p.med = false; addShake(vis, 0.15);
  floatText(vis, p.x, p.y - 20, '-' + d, '#ff8f8a');
  if (meta.hp <= 0) {
    C.deathPenalty(meta);
    p.x = HUB_SPAWN.x; p.y = HUB_SPAWN.y; readyNotified = C.isFull(meta);
    hub.monsters.forEach(m => { m.aggro = false; });
    UI.log('Trọng thương! Được đưa về tụ linh trận, hao tổn 10% tu vi.', 'bad');
    save();
  }
}
// M8-02: Luyện Võ Trường — tối đa PEN_WOLVES sói cấp thấp, sinh và bị giữ trong sân rào (không lang thang vào tông môn)
const PEN_WOLVES = 4;
function penMonsters() {
  const P = SECT_MAP.pen, x0 = P.px + 24, y0 = P.py + 28, x1 = P.px + P.pw - 24, y1 = P.py + P.ph - 12;
  for (const m of hub.monsters) { if (m.dead) continue; m.x = Math.max(x0, Math.min(x1, m.x)); m.y = Math.max(y0, Math.min(y1, m.y)); }
  if (hub.monsters.length >= PEN_WOLVES || Math.random() > 0.01) return;
  const x = x0 + Math.random() * (x1 - x0), y = y0 + Math.random() * (y1 - y0);
  if (hubMap.canStand(x, y) && Math.hypot(x - p.x, y - p.y) > 40) hub.monsters.push(makeMonster(x, y, 1, { ph: Math.random() * 6 }));
}
function killHubMonster(m) {
  const tv = Math.round(HM.TUVI_BASE * Math.pow(HM.TUVI_GROWTH, m.lvl - 1)), st = 1 + m.lvl;
  meta.lingQi += tv; meta.linhThach += st;      // M3-01: yêu thú động phủ cho linh khí (thiền mới thành tu vi)
  floatText(vis, m.x, m.y - 14, '+' + tv + ' ✨', '#7fe3ff');
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
  if (trib && trib.interactive) updateInteractiveTrib(dt);
  else if (trib) {
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
    const r = C.meditateTick(meta, dt, p.inForm);
    if (r.gained > 0) notifyFull();
    if (meta.lingQi <= 0 && r.used > 0 && !dryNotified) { dryNotified = true; UI.log('Linh khí đã cạn. Vào bí cảnh để mang thêm về.', 'bad'); }
    meta.hp = Math.min(mh, meta.hp + mh * MEDITATION.HEAL * dt);
    medFx.speed = p.inForm ? 1.6 : 1;
    medFx.update(dt);
  } else meta.hp = Math.min(mh, meta.hp + mh * MEDITATION.IDLE_HEAL * dt);

  if (SECT_MAP) penMonsters();   // M8-02: sói chỉ ở trong rào Luyện Võ Trường
  else if (hub.monsters.length < HUB.MAX_MONSTERS) spawnHubMonster(hub, p, Math.random);
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
  BIA.near = FEATURES.lore && Math.hypot(p.x - BIA.x, p.y - BIA.y) < HUB.BIA.r;
  BIA.lit = !!(meta.lore && meta.lore.unlocked.some(id => !meta.lore.read.includes(id)));
  if ((saveT += dt) > 3) { saveT = 0; save(); }
}
function updateInteractiveTrib(dt) {
  movePlayer(hubMap, dt, 1);
  clampToArena(trib, p);
  const mh = maxHp(meta.realmLevel);
  const strikes = updateTrib(trib, p, dt, f => {
    meta.hp -= f * mh; p.inv = 0.3; p.hurtT = 0.2; addShake(vis, 0.2);
    floatText(vis, p.x, p.y - 20, '-' + Math.round(f * mh), '#ff8f8a');
    if (meta.hp <= 0) { meta.hp = 0; trib.done = 'LOSE'; }
  });
  for (const { h } of strikes) {
    const pts = h.kind === 'circle' ? [[h.x, h.y]] : h.kind === 'line' ? [[h.x0 * 0.7 + h.x1 * 0.3, h.y0 * 0.7 + h.y1 * 0.3], [(h.x0 + h.x1) / 2, (h.y0 + h.y1) / 2], [h.x0 * 0.3 + h.x1 * 0.7, h.y0 * 0.3 + h.y1 * 0.7]]
      : [0, 1, 2, 3, 4].map(i => [CX + Math.cos(i * 1.257) * 55, CY + Math.sin(i * 1.257) * 40]);
    for (const [x, y] of pts) spawnFx(vis, 'loi_kiep', x, y, { flip: Math.random() < 0.5 });
    Audio.play('strike');
    addFlash(vis, h.kind === 'storm' ? 0.2 : 0.08);
  }
  if (!trib.done && trib.phase !== trib.shownPhase) {
    trib.shownPhase = trib.phase;
    ev.push({ type: 'announce', x: p.x, y: p.y, text: `Thiên kiếp · ${phaseDef(trib).name} (${trib.phase + 1}/${TRIBULATION.PHASES.length})`, color: '#d9c8ff' });
  }
  if (!trib.done) return;
  const won = trib.done === 'WIN';
  trib = null; meta.tribPending = false; readyNotified = false;
  metaAct(won ? 'trib_win' : 'trib_fail');
  if (won) { const r = C.levelUp(meta); afterMajor(); realmUpNotes(r); }
  else { C.failTribulation(meta); UI.log('Độ kiếp thất bại — giữ cảnh giới, tu vi hao tổn 30%. Hồi phục rồi thử lại.', 'bad', 14000); save(); }
}
function afterMajor() {
  spawnFx(vis, 'dot_pha', p.x, p.y, { onHit: () => { addFlash(vis, 0.18); addShake(vis, 0.3); } });
  UI.log(`Đột phá thành công: ${levelName(meta.realmLevel)}!`, 'gold', 12000);
  save();
  loreCheck();
}

// ---------- bí cảnh ----------
// M7-10: seed (và biến thể) của lượt tới bốc lúc mở cổng, giữ nguyên tới khi lượt đó bắt đầu — đóng/mở lại cổng không đổi được biến thể
let nextRunSeed = null;
function openPrepare() {
  if (!FEATURES.run || view !== 'HUB' || trib || !PORTAL.near) return;
  view = 'PREPARE'; p.med = false; input.clear();
  if (tipShown === 'portal') tipSeen('portal');   // đã tìm được cổng
  if (nextRunSeed == null) nextRunSeed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
  const vid = pickVariant(nextRunSeed);
  UI.showPrepare(meta, startRun, () => { view = 'HUB'; }, { id: vid, ...variantOf(vid) });
}
function startRun(skill, difficulty = 0) {
  meta.lastDifficulty = difficulty;
  hubPosBeforeRun = { x: p.x, y: p.y };
  meta.hubPos = { ...hubPosBeforeRun };
  save();
  const seed = nextRunSeed ?? ((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0);
  nextRunSeed = null;
  run = createRun({ seed, variant: pickVariant(seed), startSkill: skill, realmLevel: meta.realmLevel, difficulty, unlocked: meta.unlocks.skills, gear: gearMods(meta) });
  p.x = run.scene.map.cx; p.y = run.scene.map.cy; p.inv = 1; p.med = false; p.cd = 0;
  hubShots.length = 0; clearVis(vis); input.clear(); ev.length = 0;
  view = 'RUN'; paused = false;
  PT.log('run_start', { skill, difficulty, realm: meta.realmLevel, variant: run.variant }, run);
  UI.setVariant(run.variant === 'thuong' ? '' : variantOf(run.variant).name);
  UI.hideTip(); tipShown = null;
  showTipIf('move', 12000);                       // tự tắt sau 12 s, xa trước mọi boss (3:30)
  if (run.variant !== 'thuong') UI.log(`Biến thể: ${variantOf(run.variant).name} — ${variantOf(run.variant).rules.join('; ')}.`, 'gold', 10000);
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
  if (run.dir.mini === 'DEAD') PT.log('miniboss_result', { result: 'killed', time: Math.round(run.time) }, run);   // một lần mỗi run
  if (run.shrine && !run.shrineLogged) { run.shrineLogged = true; UI.log('Linh Mạch hiện ra nơi Lang Vương ngã xuống — đứng gần và nhấn E (một lần, chọn 1 trong 3).', 'gold'); }
  if (run.status === 'ENDED') { finishRun(); return; }
  if (run.pendingDrafts > 0) openDraft();
}
function openDraft(given = null) {
  view = 'CARD_DRAFT'; input.clear();
  if (tipShown) { UI.hideTip(); tipShown = null; }   // không để 2 gợi ý cùng lúc
  const cardTip = shouldTip(meta, 'card') ? { text: tipText('card', isTouch()), onOff: tipsOff } : null;
  const cards = given || drawCards(run, run.rng);
  const r = run;
  // M7-09: đổi bảng thẻ (miễn phí, RUN.REROLLS lượt/run); thế giới vẫn dừng vì view vẫn là CARD_DRAFT
  const onReroll = () => {
    if (run !== r || view !== 'CARD_DRAFT') return;
    const next = rerollDraft(r, r.rng, cards);
    if (!next) { openDraft(cards); return; }
    PT.log('reroll', { level: r.level, time: Math.round(r.time), left: r.rerolls }, r);
    openDraft(next);
  };
  UI.showDraft(r, cards, card => {
    if (run !== r || view !== 'CARD_DRAFT') return;
    if (cardTip && shouldTip(meta, 'card')) { markSeen(meta, 'card'); save(); }
    const ok = applyCard(r, card, {
      heal: f => { r.hp = Math.min(r.maxHp, r.hp + r.maxHp * f); },
      onMaxHpChange: () => refreshMaxHp(r, false),
    });
    r.pendingDrafts = Math.max(0, r.pendingDrafts - 1);
    Audio.play('card');
    if (ok) {
      const c = { card: card.id, cardType: card.type, level: r.level, time: Math.round(r.time) };
      PT.log('first_card', c, r); PT.log('card_picked', c, r);
      if (card.type === 'EVOLUTION') PT.log('evolution', { evo: card.id, time: c.time }, r);
    }
    if (!ok) UI.log('Thẻ không còn hợp lệ, bỏ qua.', 'bad');
    else if (card.type === 'EVOLUTION') {
      spawnFx(vis, 'dot_pha', p.x, p.y, { onHit: () => { addFlash(vis, 0.15); addShake(vis, 0.2); } });
      UI.log(`Tiến hóa: ${EVOLUTIONS[card.id].name}!`, 'gold'); Audio.play('evolve');
    }
    view = 'RUN'; input.clear();
  }, FEATURES.draftReroll ? onReroll : null, cardTip);
}
// M3-04: Linh Mạch — thế giới dừng khi đang chọn (như bảng thẻ); một lần mỗi run
function openShrine() {
  if (view !== 'RUN' || paused || !run) return;
  if (nearShrine(run, p) && shrineSealed(run)) { UI.log('Linh Mạch bị phong ấn khi yêu vương còn sống.', 'bad'); return; }
  if (!shrineReady(run, p)) return;
  view = 'SHRINE'; input.clear();
  const r = run;
  UI.showShrine(SHRINE_CHOICES, id => {
    if (run !== r || view !== 'SHRINE') return;
    if (useShrine(r, id)) UI.log(`Linh Mạch: ${SHRINE_CHOICES.find(c => c.id === id).name}.`, 'gold');
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
  // REWARD_PENDING: ghi phần thưởng chờ nhận vào save trước khi hiện bảng
  const reward = computeRunReward(r, meta);
  if (meta.pendingReward && meta.pendingReward.id !== reward.id) claimReward(meta);   // phòng hờ: không để mất phần cũ
  stageReward(meta, reward);
  save();
  if (r.dir.mini === 'ALIVE') PT.log('miniboss_result', { result: r.outcome === 'LOSE' ? 'died' : 'abandoned', time: Math.round(r.time) }, r);
  const cause = r.outcome === 'LOSE' ? Object.entries(r.dmgBy).sort((a, b) => b[1] - a[1])[0]?.[0] : undefined;
  const maxed = r.skills.filter(s => s.evolved || s.level >= SKILL_DEFS[s.id].maxLevel).length;   // độ hoàn thiện build
  PT.log('run_end', { outcome: r.outcome, time: Math.round(r.time), level: r.level, kills: r.kills, cause, evolutions: [...r.evolutions], difficulty: r.diff, variant: r.variant, rerolls: r.rerollsUsed || 0, maxed, skills: r.skills.length }, r);
  Audio.play(r.outcome === 'WIN' ? 'win' : 'lose');
  const extra = FEATURES.resultGoals ? { goals: metaGoals(previewAfterClaim(meta)), onNext: a => claimAndReturn(a) } : null;
  UI.showResults(r, reward, () => claimAndReturn(), meta, extra);
}
// REWARDED -> HUB: cộng tài nguyên + xóa pending trong cùng một lần lưu; gọi lại lần nữa không cộng thêm
function claimAndReturn(next = null) {
  if (view !== 'RESULTS') return;
  const evosBefore = [...meta.stats.evos], outcome = run && run.outcome;
  const got = claimReward(meta);
  if (got) UI.log(`Mang về: ${rewardText(got)}.`, 'good');
  for (const id of newDiscoveries(evosBefore, meta.stats.evos)) UI.log(`Đồ Giám: lần đầu khám phá tiến hóa ${EVOLUTIONS[id].name}! (K để xem)`, 'gold', 10000);
  checkAchievements();
  returnToHub();
  loreCheck({ outcome });
  // M7-07: đi tiếp ngay sau khi đã nhận thưởng (nhận vẫn một lần — claimReward ở trên)
  metaAct('results:' + (next || 'hub'));
  if (next === 'meditate') { p.x = CX; p.y = CY + 12; if (!p.med) toggleMed(); }
  else if (next === 'break') tryBreak();
  else if (next === 'codex') openCodex();
  else if (next === 'run') { p.x = PORTAL.x; p.y = PORTAL.y + 10; PORTAL.near = true; openPrepare(); }
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
// góp ý: trang issue của repo công khai; không gắn dữ liệu nào vào URL
const FEEDBACK_URL = 'https://github.com/NghiaSionn/tu-tien-lo/issues/new';
function download(text, name, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
// ---------- M7-14: Bia Truyền Thừa ----------
function loreCheck(ev = null) {
  if (!FEATURES.lore) return;
  const got = unlockLore(meta, ev);
  if (!got.length) return;
  save();
  UI.log(got.length === 1 ? `Bia Truyền Thừa khắc thêm: "${got[0].title}" (L để đọc).` : `Bia Truyền Thừa khắc thêm ${got.length} đoạn (L để đọc).`, 'gold', 10000);
}
function openLore() {
  if (!FEATURES.lore || view !== 'HUB' || trib) return;
  const entries = loreEntries(meta);
  markLoreRead(meta); save(); metaAct('lore_open');
  UI.showLore(entries);
}
function openCodex() {
  if (view !== 'HUB' || trib) return;
  metaAct('codex');
  UI.showCodex(meta);
}
// ---------- M7-06: gợi ý người mới ----------
let tipShown = null, tipTimer = 0;
const isTouch = () => document.body.classList.contains('touch');
function tipSeen(id) { if (tipShown === id) { UI.hideTip(); tipShown = null; } markSeen(meta, id); save(); }
function tipsOff() { UI.hideTip(); tipShown = null; skipAll(meta); save(); metaAct('tip_off'); }
function showTipIf(id, autoHideMs = 0) {
  if (!shouldTip(meta, id)) return false;
  tipShown = id; clearTimeout(tipTimer);
  UI.showTip(tipText(id, isTouch()), () => { tipSeen(id); metaAct('tip_ok:' + id); }, tipsOff);
  if (autoHideMs) { markSeen(meta, id); save(); tipTimer = setTimeout(() => { if (tipShown === id) { UI.hideTip(); tipShown = null; } }, autoHideMs); }
  return true;
}
function openSettings() {
  if (view !== 'HUB' || trib) return;
  view = 'SETTINGS'; p.med = false; input.clear();
  UI.showSettings(meta, {
    onClose: () => { view = 'HUB'; if (!tipShown) showTipIf('portal'); },
    onSetting: (k, v) => { meta.settings[k] = v; applySettings(); save(); },
    onExport: () => { save(); download(exportSave(meta), `tutien_save_${new Date().toISOString().slice(0, 10)}.json`, 'application/json'); },
    // M7-04
    pt: PT,
    feedbackUrl: FEEDBACK_URL,
    onReplayTutorial: () => { replayTutorial(meta); save(); metaAct('tip_replay'); },
    onPlaytest: on => { PT.setEnabled(on, () => ({ realm: meta.realmLevel, runs: meta.stats.runs })); UI.log(on ? 'Đã bật ghi playtest (chỉ lưu trên máy này).' : 'Đã tắt ghi playtest.', 'good'); },
    onPtExport: kind => download(kind === 'csv' ? PT.exportCSV() : PT.exportJSON(), `tutien_playtest_${PT.testId || 'chua_bat'}.${kind}`, kind === 'csv' ? 'text/csv' : 'application/json'),
    onPtClear: () => { if (confirm('Xóa toàn bộ log playtest trên máy này? (Không ảnh hưởng tiến độ chơi.)')) PT.clear(); },
    feedbackText: () => [
      `Tu Tiên Lộ — góp ý (bản ${BUILD})`,
      `Mã thử: ${PT.testId || '(chưa bật log)'} · Thiết bị: ${matchMedia('(pointer: coarse)').matches ? 'cảm ứng' : 'máy tính'}`,
      `Cảnh giới: ${levelName(meta.realmLevel)} · Số lượt bí cảnh: ${meta.stats.runs} · Thắng: ${meta.stats.wins} · Trụ lâu nhất: ${Math.floor(meta.stats.bestTime / 60)}:${String(meta.stats.bestTime % 60).padStart(2, '0')}`,
      '1. Điểm vui nhất?', '2. Điểm khó hiểu nhất?', '3. Muốn mở khóa gì tiếp?',
    ].join('\n'),
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
  if (code === 'KeyM') { meta.settings.mute = !meta.settings.mute; applySettings(); save(); UI.log(meta.settings.mute ? 'Đã tắt tiếng (M).' : 'Đã bật tiếng (M).'); return true; }
  if (code === 'F3') { PERF.on = !PERF.on; return true; }
  if (UI.modalOpen()) return UI.modalKey(code);
  if (view === 'RUN') {
    if (code === 'Escape' || code === 'KeyP') { pauseRun(); return true; }
    if (code === 'KeyE') { openShrine(); return true; }
    return false;
  }
  if (view !== 'HUB') return false;
  if (code === 'KeyT') toggleMed();
  else if (code === 'KeyB') tryBreak();
  else if (code === 'Digit1') usePill();
  else if (code === 'Digit2') buyPill();
  else if (code === 'KeyE') { if (BIA.near) openLore(); else openPrepare(); }   // M7-14: đứng cạnh bia thì E = đọc bia
  else if (code === 'KeyG') openForge();
  else if (code === 'KeyH') openGacha();
  else if (code === 'KeyJ') UI.showAchievements(meta);
  else if (code === 'KeyK') openCodex();
  else if (code === 'KeyL') openLore();
  else return false;
  return true;
}
const input = makeInput(onAction);
setupTouch(document.getElementById('game'), input, onAction);   // M5-06: chỉ bật trên thiết bị cảm ứng / ?touch=1
const keys = input.keys;
const bind = (id, fn) => $(id).addEventListener('click', e => { fn(); e.currentTarget.blur(); });
bind('btnMed', toggleMed); bind('btnBreak', tryBreak); bind('btnPill', usePill); bind('btnBuy', buyPill);
bind('btnRun', openPrepare); bind('btnSettings', openSettings); bind('btnPause', pauseRun);
bind('btnForge', () => openForge()); bind('btnGacha', () => openGacha()); bind('btnAch', () => { if (view === 'HUB' && !trib) UI.showAchievements(meta); }); bind('btnCodex', openCodex); bind('btnLore', openLore);
if (!FEATURES.lore) document.getElementById('btnLore').hidden = true;
// M5-05: trình duyệt chỉ cho phát âm sau cử chỉ người dùng -> mở ở lần bấm/chạm đầu tiên
const firstGesture = () => { Audio.unlockAudio(); Audio.applyAudioSettings(meta.settings); Audio.startMusic(); removeEventListener('keydown', firstGesture); removeEventListener('pointerdown', firstGesture); };
addEventListener('keydown', firstGesture); addEventListener('pointerdown', firstGesture);
addEventListener('beforeunload', save);
addEventListener('pagehide', save);
addEventListener('blur', () => { if (view === 'RUN') pauseRun(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && view === 'RUN') pauseRun(); });

// ---------- vòng lặp ----------
const TIMER_LOOP = new URLSearchParams(location.search).get('loop') === 'timer';
let last = performance.now(), hudT = 0;
// M5-04: overlay hiệu năng (F3) — thời gian xử lý mỗi khung (update + vẽ) và khoảng giữa các khung
const PERF = { on: new URLSearchParams(location.search).has('perf'), work: [], gap: [], el: null };
function perfFrame(work, gap) {
  PERF.work.push(work); PERF.gap.push(gap);
  if (PERF.work.length > 240) { PERF.work.shift(); PERF.gap.shift(); }
  if (!PERF.on) { if (PERF.el) PERF.el.hidden = true; return; }
  if (!PERF.el) { PERF.el = document.createElement('div'); PERF.el.id = 'perf'; document.getElementById('game').parentNode.appendChild(PERF.el); }
  if (PERF.work.length % 15) return;
  const q = (a, f) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * f))]; };
  const sc = run && view !== 'HUB' ? run.scene : hub;
  PERF.el.hidden = false;
  PERF.el.textContent = `FPS ~${(1000 / q(PERF.gap, 0.5)).toFixed(0)} (1% thấp ~${(1000 / q(PERF.gap, 0.99)).toFixed(0)}) · xử lý ${q(PERF.work, 0.5).toFixed(1)}/${q(PERF.work, 0.95).toFixed(1)} ms (trung vị/p95) · quái ${sc.monsters.length} · đạn ${(sc.projectiles || []).length} · hạt ${vis.parts.length} · ${meta.settings.quality}${STRESS ? ' · STRESS' : ''}`;
}
// M5-04: cảnh stress (?stress=1): trong bí cảnh giữ 100 quái + 200 đạn + 300 hạt để đo (không dùng khi chơi)
const STRESS = new URLSearchParams(location.search).get('stress') === '1';
function stressTopUp() {
  if (!STRESS || !run || view !== 'RUN') return;
  const sc = run.scene;
  run.dir.spawnT = 1e9; run.hp = run.maxHp;
  while (sc.monsters.length < 100) { const a = Math.random() * 6.283, d = 40 + Math.random() * 160; const m = makeRunEnemy(run, ['chaser', 'charger', 'ranged'][sc.monsters.length % 3], p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 1); m.hp = m.max = 1e12; }
  while (sc.projectiles.length < 200) { const a = Math.random() * 6.283; sc.projectiles.push({ kind: 'bolt', x: p.x, y: p.y - 8, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, life: 1.5, dmg: 0.0001, pierce: 999, hits: new Set(), heading: a }); }
  // trần hạt theo mức đồ họa (Vừa 220, Thấp 90) < 300: không chặn thì vòng lặp không bao giờ dừng -> treo trang
  const partTarget = Math.min(300, (PART_CAP[vis.quality] || 300) - 10);
  while (vis.parts.length < partTarget) burst(vis, p.x + (Math.random() - 0.5) * 300, p.y + (Math.random() - 0.5) * 160, 10, 60, '#ffd06a', 1.2, 1);
}

let lastFrameAt = 0;
function frame(now) {
  const t0 = performance.now();
  // dấu thời gian rAF có thể sớm hơn `last` ở khung đầu -> dt âm làm hiệu ứng nhảy về khung -1
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
  stressTopUp();
  let worldDt = 0;
  if (view === 'HUB') { time += dt; worldDt = dt; updateHub(dt); }
  else if (view === 'RUN' && !paused) { time += dt; worldDt = dt; updateRunView(dt); }
  for (const e of ev) {
    if (e.type === 'announce') UI.log(e.text, 'bad');
    else if (e.type === 'sfx') Audio.play(e.name);
    else if (e.type === 'death') Audio.play('hit');
  }
  consumeEvents(vis, ev);
  updateVis(vis, worldDt);
  if (vis.pfx && view === 'HUB') vis.pfx.portal.update(dt);
  if (vis.pfxSkills && view === 'RUN') vis.pfxSkills.tornado.update(worldDt);
  const scene = run && view !== 'HUB' ? run.scene : hub;
  render(ctx, { scene, player: p, time, vis, medFx, trib, inForm: p.inForm, portal: scene === hub ? PORTAL : null, bia: scene === hub && FEATURES.lore ? BIA : null, sect: scene === hub ? SECT_MAP : null, run: scene === hub ? null : run, hubShots: scene === hub ? hubShots : null, dtWorld: worldDt });
  if ((hudT += dt) > 0.1) { hudT = 0; if (view === 'HUB' || !run) UI.hubHud(meta, p, trib, PORTAL.near); else UI.runHud(run); }
  input.endFrame();
  const t1 = performance.now();
  perfFrame(t1 - t0, lastFrameAt ? t1 - lastFrameAt : 16.7); lastFrameAt = t1;
  if (!TIMER_LOOP) requestAnimationFrame(frame);
}

if (!SECT_MAP) for (let i = 0; i < HUB.MAX_MONSTERS; i++) spawnHubMonster(hub, p, Math.random);   // M8-02: tông môn chỉ có sói trong rào
UI.setMode('hub');
UI.log('Ngồi vào tụ linh trận và nhấn T để tu luyện.', 'gold');
if (FEATURES.run) UI.log('Cổng bí cảnh ở phía bắc tụ linh trận — đứng gần và nhấn E.');
if (FEATURES.run) setTimeout(() => { if (view === 'HUB') showTipIf('portal'); }, 600);
loreCheck();   // M7-14: save cũ đã qua mốc -> khắc ngay các đoạn tương ứng (một lần)   // M7-06: chờ setupTouch gắn class cảm ứng
for (const [m, c] of startNotes) UI.log(m, c);
UI.hubHud(meta, p, trib, false);

// Gỡ lỗi (console): __game.meta, __game.p, __game.run, __game.view ...
window.__game = {
  get meta() { return meta; }, get run() { return run; }, get view() { return view; }, get paused() { return paused; },
  p, hub, keys, KEYS, save, get trib() { return trib; }, PORTAL, vis,
};
// Dev: ?loop=timer chạy vòng lặp bằng setInterval thay cho requestAnimationFrame (môi trường test hãm rAF còn 2–5 khung/giây).
// Logic, dt (kẹp 0,05 s) và input giữ nguyên — chỉ đổi cái gọi frame(). Không dùng khi chơi bình thường.
if (TIMER_LOOP) setInterval(() => frame(performance.now()), 1000 / 60);
else requestAnimationFrame(frame);
