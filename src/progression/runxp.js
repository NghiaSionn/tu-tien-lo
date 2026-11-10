// EXP trong run (chiến ý). Tách hẳn khỏi tu vi/cảnh giới.
import { RUN } from '../core/config.js';

export const xpToNext = level => Math.round(RUN.XP_BASE * Math.pow(RUN.XP_GROWTH, level - 1) + RUN.XP_LINEAR * (level - 1));

// Cộng EXP; mỗi cấp tăng thêm một lượt chọn thẻ vào hàng đợi. Trả về số cấp vừa lên.
export function addRunXp(run, amount) {
  if (!(amount > 0) || !Number.isFinite(amount)) return 0;
  run.xp += amount;
  let gained = 0;
  for (let guard = 0; guard < 1000; guard++) {
    const n = xpToNext(run.level);
    if (run.xp < n) break;
    run.xp -= n;
    run.level++;
    run.pendingDrafts++;
    gained++;
  }
  return gained;
}
