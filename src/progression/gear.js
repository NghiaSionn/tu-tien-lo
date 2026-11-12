// Luyện khí + mặc/tháo trang bị (M4-01). Thuần logic trên meta. Mọi hàm kiểm tra trước rồi mới trừ — không bao giờ âm tiền.
// meta.items: { [itemId]: level 1..5 } (sở hữu mỗi món một bản; trùng từ Truyền Thừa Các -> mảnh)
// meta.equipped: { weapon, armor, talisman, ring } — id món đã sở hữu, đúng ô; một món chỉ ở ô của nó.
import { ITEMS_DEF, SLOTS, CRAFT, MAX_ITEM_LEVEL } from '../data/items.js';

const canPay = (meta, cost) => Object.entries(cost).every(([k, v]) => (meta[k] || 0) >= v);
const pay = (meta, cost) => { for (const [k, v] of Object.entries(cost)) meta[k] -= v; };

export function craftItem(meta, id) {
  if (!ITEMS_DEF[id]) return { ok: false, reason: 'không có món này' };
  if (meta.items[id]) return { ok: false, reason: 'đã có' };
  if (!canPay(meta, CRAFT.make)) return { ok: false, reason: 'thiếu nguyên liệu' };
  pay(meta, CRAFT.make);
  meta.items[id] = 1;
  return { ok: true };
}

export function upgradeItem(meta, id) {
  const lv = meta.items[id];
  if (!lv) return { ok: false, reason: 'chưa có' };
  if (lv >= MAX_ITEM_LEVEL) return { ok: false, reason: 'đã tối đa' };
  const cost = CRAFT.upgrade(lv);
  if (!canPay(meta, cost)) return { ok: false, reason: 'thiếu nguyên liệu' };
  pay(meta, cost);
  meta.items[id] = lv + 1;
  return { ok: true };
}

export function equip(meta, id) {
  const d = ITEMS_DEF[id];
  if (!d || !meta.items[id]) return { ok: false, reason: 'chưa có' };
  meta.equipped[d.slot] = id;
  return { ok: true };
}

export function unequip(meta, slot) {
  if (!(slot in SLOTS)) return { ok: false, reason: 'ô lạ' };
  meta.equipped[slot] = null;
  return { ok: true };
}

// Làm sạch dữ liệu đồ từ save: chỉ món biết trước, cấp 1..5, ô hợp lệ, món đang mặc phải sở hữu và đúng ô
export function sanitizeGear(src) {
  const items = {}, equipped = { weapon: null, armor: null, talisman: null, ring: null };
  if (src && src.items && typeof src.items === 'object')
    for (const [id, lv] of Object.entries(src.items)) if (ITEMS_DEF[id] && Number.isFinite(lv)) items[id] = Math.max(1, Math.min(MAX_ITEM_LEVEL, Math.floor(lv)));
  if (src && src.equipped && typeof src.equipped === 'object')
    for (const slot of Object.keys(equipped)) { const id = src.equipped[slot]; if (typeof id === 'string' && items[id] && ITEMS_DEF[id].slot === slot) equipped[slot] = id; }
  return { items, equipped };
}
