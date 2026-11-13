// Lưu tiến độ. Chỉ lưu metaState (tiến trình vĩnh viễn); runState không bao giờ được lưu (ADR 0001).
//
// Khóa localStorage:
//   tutien_save_v1          bản v0.1 — CHỈ ĐỌC, không bao giờ ghi hay xóa
//   tutien_save_v1_backup   bản sao nguyên văn v1 lúc migrate lần đầu (ghi một lần)
//   tutien_save_v2          bản hiện hành
//   tutien_save_v2_bak      bản v2 tốt liền trước (xoay vòng mỗi lần lưu)
//   tutien_save_v2_corrupt  bản v2 hỏng gần nhất, giữ lại để cứu dữ liệu
import { REALM, ITEMS, REWARD } from '../core/config.js';
import { defaultTutorial, sanitizeTutorial } from '../progression/tutorial.js';
import { defaultLore, sanitizeLore } from '../progression/lore.js';
import { OUTCOMES, AMOUNT_KEYS } from '../progression/rewards.js';
import { sanitizeGear } from '../progression/gear.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { EVOLUTIONS } from '../data/skills.js';
import { maxHp, need } from '../progression/realm.js';

export const KEYS = {
  V1: 'tutien_save_v1', V1_BACKUP: 'tutien_save_v1_backup',
  V2: 'tutien_save_v2', V2_BAK: 'tutien_save_v2_bak', V2_CORRUPT: 'tutien_save_v2_corrupt',
};
export const VERSION = 2;
const MAX_MONEY = 1e9, MAX_PILLS = 1e6;

export function defaultMeta(hubSpawn) {
  return {
    realmLevel: 0, cultivationXp: 0, hp: maxHp(0), linhThach: 0, pills: ITEMS.START_PILLS,
    lingQi: 0, craftMats: 0, coDuyenTicket: 0, firstClear: false,     // M2-03
    pendingReward: null, rewardLog: [],                                 // phần thưởng run chờ nhận / id run đã nhận
    tribPending: false,                                                 // M3-03: đang độ kiếp (tải lại giữa chừng = thất bại)
    items: {}, equipped: { weapon: null, armor: null, talisman: null, ring: null },   // M4-01
    achievements: [], shards: 0,                                        // M4-02 / M4-03 (Bí Kíp Tàn Thiên)
    gacha: { seed: 20261112, pity: 0, pulls: 0, history: [] },
    hubPos: { x: hubSpawn.x, y: hubSpawn.y },
    unlocks: { skills: [], tier: 0 },
    lastDifficulty: 0,
    settings: { reduceEffects: false, screenShake: true, quality: 'high', sfx: 0.7, music: 0.4, mute: false },   // M5-04/05
    stats: { runs: 0, wins: 0, bestTime: 0, bestLevel: 0, kills: 0, minis: 0, evos: [], bestDiffWin: -1 },
    tutorial: defaultTutorial(),                                        // M7-06
    lore: defaultLore(),                                                // M7-14
  };
}

const num = v => (typeof v === 'number' && Number.isFinite(v)) ? v : NaN;
const int = (v, lo, hi, dflt) => { const n = num(v); return Number.isNaN(n) ? dflt : Math.min(hi, Math.max(lo, Math.floor(n))); };

// Dựng meta mới hoàn toàn từ các trường biết trước: giá trị lạ/độc hại bị bỏ, số sai bị kẹp về khoảng hợp lệ.
export function sanitizeMeta(src, ctx, warnings = []) {
  const d = defaultMeta(ctx.hubSpawn);
  if (!src || typeof src !== 'object') { warnings.push('meta trống, dùng mặc định'); return d; }
  const L = int(src.realmLevel, 0, REALM.MAX_L, 0);
  if (L !== src.realmLevel) warnings.push(`realmLevel ${JSON.stringify(src.realmLevel)} -> ${L}`);
  const xp = num(src.cultivationXp);
  const cx = Number.isNaN(xp) ? 0 : Math.min(need(L), Math.max(0, xp));
  if (cx !== src.cultivationXp) warnings.push(`cultivationXp ${JSON.stringify(src.cultivationXp)} -> ${cx}`);
  const hpRaw = num(src.hp), mh = maxHp(L);
  const hp = Number.isNaN(hpRaw) || hpRaw <= 0 ? mh : Math.min(mh, hpRaw);
  const out = {
    ...d, realmLevel: L, cultivationXp: cx, hp,
    linhThach: int(src.linhThach, 0, MAX_MONEY, 0),
    pills: int(src.pills, 0, MAX_PILLS, 0),
  };
  out.lingQi = int(src.lingQi, 0, MAX_MONEY, 0);
  out.craftMats = int(src.craftMats, 0, MAX_MONEY, 0);
  out.coDuyenTicket = int(src.coDuyenTicket, 0, MAX_PILLS, 0);
  out.firstClear = src.firstClear === true;
  out.tribPending = src.tribPending === true;
  Object.assign(out, sanitizeGear(src));
  out.achievements = Array.isArray(src.achievements) ? [...new Set(src.achievements.filter(a => ACHIEVEMENTS.some(x => x.id === a)))] : [];
  out.shards = int(src.shards, 0, 1e6, 0);
  const g = src.gacha && typeof src.gacha === 'object' ? src.gacha : {};
  out.gacha = { seed: int(g.seed, 0, 4294967295, 20261112), pity: int(g.pity, 0, 1000, 0), pulls: int(g.pulls, 0, 1e9, 0),
    history: Array.isArray(g.history) ? g.history.filter(h => h && typeof h.n === 'string' && typeof h.r === 'string').slice(0, 50).map(h => ({ r: h.r, n: h.n.slice(0, 40), d: h.d ? 1 : 0 })) : [] };
  if (Array.isArray(src.rewardLog)) out.rewardLog = src.rewardLog.filter(s => typeof s === 'string' && s.length <= 64).slice(-REWARD.LOG_KEEP);
  out.pendingReward = sanitizeReward(src.pendingReward, warnings);
  const pos = src.hubPos;
  if (pos && ctx.canStand(num(pos.x), num(pos.y))) out.hubPos = { x: pos.x, y: pos.y };
  else if (pos) warnings.push('vị trí không hợp lệ, đưa về tụ linh trận');
  if (src.unlocks && Array.isArray(src.unlocks.skills)) out.unlocks = { skills: src.unlocks.skills.filter(s => typeof s === 'string').slice(0, 64), tier: int(src.unlocks.tier, 0, 3, 0) };
  out.lastDifficulty = int(src.lastDifficulty, 0, 3, 0);
  out.tutorial = sanitizeTutorial(src.tutorial);
  out.lore = sanitizeLore(src.lore);               // M7-14   // M7-06: save cũ chưa có -> mặc định (người đã chơi không thấy gợi ý vì runs > 0)
  if (src.settings && typeof src.settings === 'object') {
    const vol = (v, d) => { const n = num(v); return Number.isNaN(n) ? d : Math.min(1, Math.max(0, n)); };
    out.settings = { reduceEffects: src.settings.reduceEffects === true, screenShake: src.settings.screenShake !== false,
      quality: ['high', 'medium', 'low'].includes(src.settings.quality) ? src.settings.quality : 'high',
      sfx: vol(src.settings.sfx, 0.7), music: vol(src.settings.music, 0.4), mute: src.settings.mute === true };
  }
  if (src.stats && typeof src.stats === 'object') {
    out.stats = {
      runs: int(src.stats.runs, 0, 1e9, 0), wins: int(src.stats.wins, 0, 1e9, 0),
      bestTime: Math.max(0, num(src.stats.bestTime) || 0), bestLevel: int(src.stats.bestLevel, 0, 1e6, 0),
      kills: int(src.stats.kills, 0, 1e9, 0), minis: int(src.stats.minis, 0, 1e9, 0),
      evos: Array.isArray(src.stats.evos) ? [...new Set(src.stats.evos.filter(e => EVOLUTIONS[e]))] : [],
      bestDiffWin: int(src.stats.bestDiffWin, -1, 3, -1),
    };
  }
  return out;
}

function sanitizeReward(r, warnings) {
  if (r == null) return null;
  if (typeof r !== 'object' || typeof r.id !== 'string' || !r.id || r.id.length > 64 || !OUTCOMES.includes(r.outcome)) {
    warnings.push('phần thưởng chờ nhận không hợp lệ, bỏ qua'); return null;
  }
  const out = { id: r.id, outcome: r.outcome, firstClear: r.firstClear === true,
    bosses: Array.isArray(r.bosses) ? r.bosses.filter(b => b === 'MINI' || b === 'FINAL').slice(0, 4) : [] };
  for (const k of AMOUNT_KEYS) out[k] = int(r[k], 0, 1e6, 0);
  const s = r.summary;
  out.summary = s && typeof s === 'object' ? { kills: int(s.kills, 0, 1e5, 0), mini: s.mini ? 1 : 0, evos: Array.isArray(s.evos) ? s.evos.filter(e => EVOLUTIONS[e]).slice(0, 8) : [], winDiff: int(s.winDiff, -1, 3, -1) } : null;
  return out;
}

// v0.1 lưu: { L, tuvi, hp, stones, pills, x, y }
export function migrateV1(v1, ctx, warnings = []) {
  return sanitizeMeta({
    realmLevel: v1.L, cultivationXp: v1.tuvi, hp: v1.hp, linhThach: v1.stones, pills: v1.pills,
    hubPos: { x: v1.x, y: v1.y },
  }, ctx, warnings);
}

const wrap = meta => ({ version: VERSION, savedAt: Date.now(), meta });

function parse(raw) {
  if (raw == null) return { missing: true };
  try { return { value: JSON.parse(raw) }; } catch (e) { return { error: 'JSON hỏng: ' + e.message }; }
}

function readV2(storage, key, ctx, warnings) {
  const p = parse(storage.getItem(key));
  if (p.missing) return null;
  if (p.error) { warnings.push(`${key}: ${p.error}`); return { bad: true }; }
  const v = p.value;
  if (!v || typeof v !== 'object' || v.version !== VERSION || !v.meta) { warnings.push(`${key}: sai định dạng/phiên bản`); return { bad: true }; }
  return { meta: sanitizeMeta(v.meta, ctx, warnings) };
}

// Đọc save theo thứ tự v2 -> v2_bak -> v1 -> mới. Không xóa khóa nào.
export function loadSave(storage, ctx) {
  const warnings = [];
  const cur = readV2(storage, KEYS.V2, ctx, warnings);
  if (cur && cur.meta) return { meta: cur.meta, source: 'v2', warnings };
  if (cur && cur.bad) {
    try { storage.setItem(KEYS.V2_CORRUPT, storage.getItem(KEYS.V2)); } catch (e) { warnings.push('không chép được bản hỏng'); }
    const bak = readV2(storage, KEYS.V2_BAK, ctx, warnings);
    if (bak && bak.meta) return { meta: bak.meta, source: 'v2_bak', warnings, recovered: true };
  }
  const p1 = parse(storage.getItem(KEYS.V1));
  if (!p1.missing) {
    if (p1.error || !p1.value || typeof p1.value !== 'object') {
      warnings.push('tutien_save_v1 hỏng, giữ nguyên khóa và bắt đầu mới');
    } else {
      const meta = migrateV1(p1.value, ctx, warnings);
      return { meta, source: 'v1', warnings, migrated: true, recovered: !!(cur && cur.bad) };
    }
  }
  return { meta: defaultMeta(ctx.hubSpawn), source: 'new', warnings, recovered: !!(cur && cur.bad) };
}

// Ghi v2. Lần đầu sau migrate: chép nguyên văn v1 sang v1_backup. Bản v2 cũ (nếu còn đọc được) xoay sang v2_bak.
export function writeSave(storage, meta) {
  const raw = JSON.stringify(wrap(meta));
  const v1 = storage.getItem(KEYS.V1);
  if (v1 != null && storage.getItem(KEYS.V1_BACKUP) == null) storage.setItem(KEYS.V1_BACKUP, v1);
  const prev = storage.getItem(KEYS.V2);
  if (prev != null && parse(prev).value?.version === VERSION) storage.setItem(KEYS.V2_BAK, prev);
  storage.setItem(KEYS.V2, raw);
  return raw;
}

// Migrate có xác minh: ghi v2 rồi đọc lại; chỉ coi là xong khi đọc lại khớp.
export function commitMigration(storage, meta, ctx) {
  writeSave(storage, meta);
  const back = readV2(storage, KEYS.V2, ctx, []);
  const ok = !!back?.meta && JSON.stringify(back.meta) === JSON.stringify(sanitizeMeta(meta, ctx));
  return ok;
}

export const exportSave = meta => JSON.stringify(wrap(meta), null, 2);

export function importSave(text, ctx) {
  const warnings = [];
  if (typeof text !== 'string' || text.length > 200000) return { ok: false, error: 'tệp quá lớn hoặc không phải văn bản' };
  const p = parse(text);
  if (p.error) return { ok: false, error: p.error };
  const v = p.value;
  if (v && v.version === VERSION && v.meta) return { ok: true, meta: sanitizeMeta(v.meta, ctx, warnings), warnings };
  if (v && 'L' in v && 'tuvi' in v) return { ok: true, meta: migrateV1(v, ctx, warnings), warnings };
  return { ok: false, error: 'không nhận ra định dạng save' };
}

export function memoryStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), dump: () => Object.fromEntries(m) };
}
