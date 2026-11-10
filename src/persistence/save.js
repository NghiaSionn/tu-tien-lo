// Lưu tiến độ. Chỉ lưu metaState (tiến trình vĩnh viễn); runState không bao giờ được lưu (ADR 0001).
//
// Khóa localStorage:
//   tutien_save_v1          bản v0.1 — CHỈ ĐỌC, không bao giờ ghi hay xóa
//   tutien_save_v1_backup   bản sao nguyên văn v1 lúc migrate lần đầu (ghi một lần)
//   tutien_save_v2          bản hiện hành
//   tutien_save_v2_bak      bản v2 tốt liền trước (xoay vòng mỗi lần lưu)
//   tutien_save_v2_corrupt  bản v2 hỏng gần nhất, giữ lại để cứu dữ liệu
import { REALM, ITEMS } from '../core/config.js';
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
    hubPos: { x: hubSpawn.x, y: hubSpawn.y },
    unlocks: { skills: [] },
    settings: { reduceEffects: false, screenShake: true },
    stats: { runs: 0, wins: 0, bestTime: 0, bestLevel: 0 },
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
  const pos = src.hubPos;
  if (pos && ctx.canStand(num(pos.x), num(pos.y))) out.hubPos = { x: pos.x, y: pos.y };
  else if (pos) warnings.push('vị trí không hợp lệ, đưa về tụ linh trận');
  if (src.unlocks && Array.isArray(src.unlocks.skills)) out.unlocks = { skills: src.unlocks.skills.filter(s => typeof s === 'string').slice(0, 64) };
  if (src.settings && typeof src.settings === 'object') {
    out.settings = { reduceEffects: src.settings.reduceEffects === true, screenShake: src.settings.screenShake !== false };
  }
  if (src.stats && typeof src.stats === 'object') {
    out.stats = {
      runs: int(src.stats.runs, 0, 1e9, 0), wins: int(src.stats.wins, 0, 1e9, 0),
      bestTime: Math.max(0, num(src.stats.bestTime) || 0), bestLevel: int(src.stats.bestLevel, 0, 1e6, 0),
    };
  }
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
