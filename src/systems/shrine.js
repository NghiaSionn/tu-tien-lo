// Linh Mạch (M3-04): điểm nghỉ có lựa chọn đánh đổi trong bí cảnh. Thuần logic.
// Một lần mỗi run; không dùng được khi boss đang sống (không thể hồi máu giữa trận boss).
import { SHRINE } from '../core/config.js';

export const CHOICES = [
  { id: 'heal', name: 'Dưỡng thương', text: () => `Hồi ${Math.round(SHRINE.HEAL * 100)}% khí huyết ngay` },
  { id: 'power', name: 'Hấp thu linh mạch', text: () => `+${Math.round(SHRINE.DMG_BUFF * 100)}% sát thương tới hết lượt` },
  { id: 'qi', name: 'Thu linh khí', text: () => `Mang về thêm ${SHRINE.QI} linh khí (trước hệ số thưởng)` },
];

export function placeShrine(run, x, y) {
  if (run.shrine) return run.shrine;                 // một Linh Mạch mỗi run
  const map = run.scene.map;
  let px = x, py = y;
  for (let i = 0; i < 24 && !map.canStand(px, py); i++) { const a = i * 0.9, r = 8 + i * 4; px = x + Math.cos(a) * r; py = y + Math.sin(a) * r; }
  if (!map.canStand(px, py)) { px = map.cx; py = map.cy; }
  run.shrine = { x: px, y: py, used: false };
  return run.shrine;
}

export const bossAlive = run => run.scene.monsters.some(m => m.boss && !m.dead);
export const shrineSealed = run => !!run.shrine && !run.shrine.used && bossAlive(run);
export const nearShrine = (run, p) => !!run.shrine && !run.shrine.used && Math.hypot(p.x - run.shrine.x, p.y - run.shrine.y) < SHRINE.R;
export const shrineReady = (run, p) => run.status === 'RUNNING' && nearShrine(run, p) && !bossAlive(run);

// Áp dụng lựa chọn. Trả về false nếu không hợp lệ (đã dùng, boss sống, lựa chọn lạ) — không đổi gì.
export function useShrine(run, choiceId) {
  if (!run.shrine || run.shrine.used || bossAlive(run) || run.status !== 'RUNNING') return false;
  if (choiceId === 'heal') run.hp = Math.min(run.maxHp, run.hp + run.maxHp * SHRINE.HEAL);
  else if (choiceId === 'power') run.shrineDmg = SHRINE.DMG_BUFF;
  else if (choiceId === 'qi') run.bonusQi = (run.bonusQi || 0) + SHRINE.QI;
  else return false;
  run.shrine.used = choiceId;
  return true;
}
