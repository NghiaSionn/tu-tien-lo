// Tu luyện ở động phủ: tu vi, đột phá, đan dược, chết. Thuần logic trên metaState; trả về sự kiện để UI hiển thị.
import { REALM, MEDITATION, ITEMS, TRIBULATION } from '../core/config.js';
import { MAX_L, isMajor, maxHp, need, grantUnlocks } from '../progression/realm.js';

export const medRate = (L, inFormation) => MEDITATION.BASE * (1 + MEDITATION.PER_L * L) * (inFormation ? MEDITATION.FORMATION_MULT : 1);
// M3-01: tốc độ chuyển hóa linh khí và hiệu suất (tu vi / 1 linh khí)
export const convertRate = (L, inFormation) => MEDITATION.CONVERT * (1 + MEDITATION.PER_L * L) * (inFormation ? MEDITATION.FORMATION_MULT : 1);
export const yieldOf = inFormation => inFormation ? MEDITATION.YIELD : MEDITATION.YIELD_OUTSIDE;
export const trickleRate = (L, inFormation) => inFormation ? medRate(L, true) * MEDITATION.TRICKLE : 0;

// Một nhịp tọa thiền: tiêu linh khí -> tu vi (không vượt ngưỡng, không đốt linh khí thừa khi đã đầy).
// Hết linh khí: dòng rất nhỏ trong trận, ngoài trận không gì. Trả về { gained, used }.
export function meditateTick(meta, dt, inFormation) {
  const n = need(meta.realmLevel), room = n - meta.cultivationXp;
  if (!(dt > 0) || room <= 0) return { gained: 0, used: 0 };
  if (meta.lingQi > 0) {
    const y = yieldOf(inFormation);
    const used = Math.min(meta.lingQi, convertRate(meta.realmLevel, inFormation) * dt, room / y);
    meta.lingQi = Math.max(0, meta.lingQi - used);
    const gained = Math.min(room, used * y);
    meta.cultivationXp += gained;
    return { gained, used };
  }
  const gained = Math.min(room, trickleRate(meta.realmLevel, inFormation) * dt);
  meta.cultivationXp += gained;
  return { gained, used: 0 };
}

// Cộng tu vi, không vượt ngưỡng của bậc hiện tại. Trả về true khi vừa đầy.
export function gainTuvi(meta, v) {
  const n = need(meta.realmLevel);
  if (!(v > 0) || meta.cultivationXp >= n) return false;
  meta.cultivationXp = Math.min(n, meta.cultivationXp + v);
  return meta.cultivationXp >= n;
}

export const isFull = meta => meta.cultivationXp >= need(meta.realmLevel);
export const canBreak = meta => meta.realmLevel < MAX_L && isFull(meta);

// Trả về { from, to, granted } để UI nêu chỉ số/tính năng mới (M3-02)
export function levelUp(meta) {
  const from = meta.realmLevel;
  meta.realmLevel = Math.min(MAX_L, meta.realmLevel + 1);
  meta.cultivationXp = 0;
  meta.hp = maxHp(meta.realmLevel);
  return { from, to: meta.realmLevel, granted: grantUnlocks(meta) };
}

// Kết quả lôi kiếp kiểu cũ (RNG). rng tiêm vào để test.
export function resolveTribulation(meta, rng) {
  if (rng() < REALM.MAJOR_CHANCE) { levelUp(meta); return true; }
  meta.cultivationXp = Math.floor(meta.cultivationXp * REALM.TRIB_FAIL_KEEP);
  meta.hp = Math.max(1, Math.round(maxHp(meta.realmLevel) * REALM.TRIB_FAIL_HP));
  return false;
}

// M3-01: Tụ Khí Đan cho linh khí (chuyển hóa khi tọa thiền), không cộng tu vi thẳng nữa
export const pillQi = L => Math.round(need(L) * ITEMS.PILL_FRACTION / MEDITATION.YIELD);
// M3-03: thua thiên kiếp tương tác (hoặc bị gián đoạn) — giữ cảnh giới, mất một phần tu vi, khí huyết thấp
export function failTribulation(meta) {
  meta.cultivationXp = Math.floor(meta.cultivationXp * TRIBULATION.FAIL_KEEP);
  meta.hp = Math.max(1, Math.round(maxHp(meta.realmLevel) * TRIBULATION.FAIL_HP));
  meta.tribPending = false;
}

export function usePill(meta) {
  if (meta.pills <= 0 || meta.realmLevel >= MAX_L) return 0;
  meta.pills--;
  const v = pillQi(meta.realmLevel);
  meta.lingQi += v;
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
