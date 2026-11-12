// Truyền Thừa Các (M4-03): quay bằng vé Cơ Duyên kiếm trong game. Thuần logic, rng tiêm vào (test được phân phối/pity).
// Trùng -> mảnh (shards); cửa hàng đổi mảnh lấy đúng thứ mình chọn. Không có đường tiền thật.
import { GACHA as G } from '../core/config.js';
import { ITEMS_DEF } from '../data/items.js';
import { SKILLS } from '../data/skills.js';

export const POOL = {
  common: G.COMMON.map(c => ({ type: 'res', ...c })),
  rare: Object.keys(ITEMS_DEF).filter(id => ITEMS_DEF[id].rarity === 'rare').map(id => ({ type: 'item', id })),
  epic: [...Object.keys(ITEMS_DEF).filter(id => ITEMS_DEF[id].rarity === 'epic').map(id => ({ type: 'item', id })), ...G.EPIC_SKILLS.map(id => ({ type: 'skill', id }))],
};

// RNG lưu trong save (LCG): kết quả quay tất định theo trạng thái, tải lại không đổi được kết quả đã quay
export function metaRng(meta) {
  return () => { meta.gacha.seed = (Math.imul(meta.gacha.seed, 1664525) + 1013904223) >>> 0; return meta.gacha.seed / 4294967296; };
}

export function rollRarity(meta, rng) {
  if (meta.gacha.pity >= G.PITY - 1) return 'epic';
  const r = rng();
  return r < G.RATES.epic ? 'epic' : r < G.RATES.epic + G.RATES.rare ? 'rare' : 'common';
}

export const entryName = e => e.type === 'item' ? ITEMS_DEF[e.id].name : e.type === 'skill' ? SKILLS[e.id].name
  : `${e.n} ${{ craftMats: 'luyện liệu', linhThach: 'linh thạch', lingQi: 'linh khí' }[e.kind]}`;

// Một lượt quay. Trả về null nếu không đủ vé (không đổi gì).
export function pull(meta, rng = metaRng(meta)) {
  if (meta.coDuyenTicket < G.COST) return null;
  meta.coDuyenTicket -= G.COST;
  const rarity = rollRarity(meta, rng);
  const list = POOL[rarity], e = list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
  let dup = false, shards = 0;
  if (e.type === 'res') meta[e.kind] += e.n;
  else if (e.type === 'item') { if (meta.items[e.id]) { dup = true; shards = G.DUP_SHARDS[rarity]; } else meta.items[e.id] = 1; }
  else if (e.type === 'skill') { if (meta.unlocks.skills.includes(e.id)) { dup = true; shards = G.DUP_SHARDS[rarity]; } else meta.unlocks.skills.push(e.id); }
  meta.shards += shards;
  meta.gacha.pity = rarity === 'epic' ? 0 : meta.gacha.pity + 1;
  meta.gacha.pulls++;
  const res = { rarity, ...e, name: entryName(e), dup, shards };
  meta.gacha.history.unshift({ r: rarity, n: res.name, d: dup ? 1 : 0 });
  if (meta.gacha.history.length > G.HISTORY) meta.gacha.history.length = G.HISTORY;
  return res;
}

// Đổi mảnh lấy đúng mục tiêu (lộ trình chắc chắn thứ hai, ngoài thành tựu)
export function shopBuy(meta, type, id) {
  if (type === 'item') {
    if (!ITEMS_DEF[id] || meta.items[id]) return { ok: false, reason: 'đã có hoặc không tồn tại' };
    if (meta.shards < G.SHOP.item) return { ok: false, reason: 'thiếu mảnh' };
    meta.shards -= G.SHOP.item; meta.items[id] = 1; return { ok: true };
  }
  if (type === 'skill') {
    if (!G.EPIC_SKILLS.includes(id) || meta.unlocks.skills.includes(id)) return { ok: false, reason: 'đã mở hoặc không tồn tại' };
    if (meta.shards < G.SHOP.skill) return { ok: false, reason: 'thiếu mảnh' };
    meta.shards -= G.SHOP.skill; meta.unlocks.skills.push(id); return { ok: true };
  }
  return { ok: false, reason: 'loại lạ' };
}
