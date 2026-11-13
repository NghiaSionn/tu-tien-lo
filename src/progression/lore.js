// M7-14: trạng thái Bia Truyền Thừa trong meta.lore = { unlocked: [id], read: [id] }. Thuần logic.
import { LORE } from '../data/lore.js';

export const defaultLore = () => ({ unlocked: [], read: [] });
const st = meta => meta.lore || (meta.lore = defaultLore());

// Mở các đoạn đủ điều kiện (mỗi đoạn đúng 1 lần). Trả về các đoạn vừa mở.
export function unlockLore(meta, ev = null) {
  const s = st(meta), got = [];
  for (const e of LORE) {
    if (s.unlocked.includes(e.id) || !e.when(meta, ev)) continue;
    s.unlocked.push(e.id); got.push(e);
  }
  return got;
}
export const unreadLore = meta => st(meta).unlocked.filter(id => !st(meta).read.includes(id));
export function markLoreRead(meta) { const s = st(meta); s.read = [...s.unlocked]; }
export const loreEntries = meta => LORE.map(e => ({ ...e, open: st(meta).unlocked.includes(e.id), unread: st(meta).unlocked.includes(e.id) && !st(meta).read.includes(e.id) }));

const known = id => LORE.some(e => e.id === id);
export const sanitizeLore = src => {
  if (!src || typeof src !== 'object') return defaultLore();
  const unlocked = Array.isArray(src.unlocked) ? [...new Set(src.unlocked.filter(known))] : [];
  return { unlocked, read: Array.isArray(src.read) ? [...new Set(src.read.filter(id => unlocked.includes(id)))] : [] };
};
