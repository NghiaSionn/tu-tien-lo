// Tu luyện ở động phủ: tu vi, đột phá, đan dược, chết. Thuần logic trên metaState; trả về sự kiện để UI hiển thị.
import { REALM, MEDITATION, ITEMS } from '../core/config.js';
import { MAX_L, isMajor, maxHp, need } from '../progression/realm.js';

export const medRate = (L, inFormation) => MEDITATION.BASE * (1 + MEDITATION.PER_L * L) * (inFormation ? MEDITATION.FORMATION_MULT : 1);

// Cộng tu vi, không vượt ngưỡng của bậc hiện tại. Trả về true khi vừa đầy.
export function gainTuvi(meta, v) {
  const n = need(meta.realmLevel);
  if (!(v > 0) || meta.cultivationXp >= n) return false;
  meta.cultivationXp = Math.min(n, meta.cultivationXp + v);
  return meta.cultivationXp >= n;
}

export const isFull = meta => meta.cultivationXp >= need(meta.realmLevel);
export const canBreak = meta => meta.realmLevel < MAX_L && isFull(meta);

export function levelUp(meta) {
  meta.realmLevel = Math.min(MAX_L, meta.realmLevel + 1);
  meta.cultivationXp = 0;
  meta.hp = maxHp(meta.realmLevel);
}

// Kết quả lôi kiếp kiểu cũ (RNG). rng tiêm vào để test.
export function resolveTribulation(meta, rng) {
  if (rng() < REALM.MAJOR_CHANCE) { levelUp(meta); return true; }
  meta.cultivationXp = Math.floor(meta.cultivationXp * REALM.TRIB_FAIL_KEEP);
  meta.hp = Math.max(1, Math.round(maxHp(meta.realmLevel) * REALM.TRIB_FAIL_HP));
  return false;
}

export function usePill(meta) {
  if (meta.pills <= 0 || meta.realmLevel >= MAX_L || isFull(meta)) return 0;
  meta.pills--;
  const v = Math.round(need(meta.realmLevel) * ITEMS.PILL_FRACTION);
  gainTuvi(meta, v);
  return v;
}

export function buyPill(meta) {
  if (meta.linhThach < ITEMS.PILL_COST) return false;
  meta.linhThach -= ITEMS.PILL_COST;
  meta.pills++;
  return true;
}

export function deathPenalty(meta) {
  meta.cultivationXp = Math.floor(meta.cultivationXp * REALM.DEATH_KEEP);
  meta.hp = maxHp(meta.realmLevel);
}

export { isMajor };
