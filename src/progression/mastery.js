// M9-D: Tham Ngộ Công Pháp (Tàng Kinh Các) — tiêu linh thạch + linh khí mang về từ bí cảnh để nâng vĩnh viễn công pháp khởi đầu:
// lượt sau công pháp đó bắt đầu ở cấp 1 + bậc tham ngộ. Dữ liệu meta (vĩnh viễn), không trộn với runState.
import { MASTERY as M, RUN } from '../core/config.js';
import { SKILLS } from '../data/skills.js';
import { canPay } from './gear.js';

export const masteryLevel = (meta, id) => (meta.mastery && meta.mastery[id]) | 0;
export const masteryCost = lv => M.COST[lv] || null;           // giá để lên bậc lv+1
export const masteryMinRealm = lv => M.MIN_REALM[lv] ?? 0;

// Cấp khởi đầu của công pháp trong lượt mới (không vượt maxLevel − 1 để vẫn còn thẻ nâng)
export function startLevel(meta, id) {
  const max = SKILLS[id] ? SKILLS[id].maxLevel : 5;
  return Math.min(max - 1, 1 + masteryLevel(meta, id));
}

export function canMaster(meta, id) {
  if (!RUN.START_SKILLS.includes(id)) return { ok: false, reason: 'không phải công pháp khởi đầu' };
  const lv = masteryLevel(meta, id);
  if (lv >= M.MAX) return { ok: false, reason: 'đã tham ngộ tối đa' };
  if ((meta.realmLevel | 0) < masteryMinRealm(lv)) return { ok: false, reason: `cần cảnh giới cao hơn`, needRealm: masteryMinRealm(lv) };
  const cost = masteryCost(lv);
  if (!canPay(meta, cost)) return { ok: false, reason: 'thiếu linh thạch / linh khí', cost };
  return { ok: true, cost };
}

// Sửa trực tiếp meta (dùng trong transact để ghi an toàn). Trả về { ok, level, cost } hoặc { ok:false, reason }
export function buyMastery(meta, id) {
  const c = canMaster(meta, id);
  if (!c.ok) return c;
  for (const [k, v] of Object.entries(c.cost)) meta[k] -= v;
  meta.mastery = { ...(meta.mastery || {}), [id]: masteryLevel(meta, id) + 1 };
  return { ok: true, level: meta.mastery[id], cost: c.cost };
}

// Làm sạch khi đọc save: chỉ công pháp khởi đầu, bậc nguyên 0..MAX
export function sanitizeMastery(src) {
  const out = {};
  if (!src || typeof src !== 'object') return out;
  for (const id of RUN.START_SKILLS) {
    const v = src[id];
    if (typeof v === 'number' && Number.isFinite(v)) { const n = Math.max(0, Math.min(M.MAX, Math.floor(v))); if (n) out[id] = n; }
  }
  return out;
}
