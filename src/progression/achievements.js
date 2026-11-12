// Thành tựu + thống kê vĩnh viễn (M4-02). Thuần logic. evaluateAchievements idempotent (id đã đạt nằm trong meta.achievements).
import { ACHIEVEMENTS } from '../data/achievements.js';

// Tóm tắt một run để ghi thống kê — đi kèm phần thưởng chờ nhận nên chỉ được cộng đúng một lần (khi nhận thưởng)
export const runSummary = run => ({
  kills: run.kills | 0, mini: run.rewards.some(r => r.kind === 'MINI') ? 1 : 0,
  evos: [...new Set(run.evolutions)], winDiff: run.outcome === 'WIN' ? (run.diff || 0) : -1,
});

export function applySummary(meta, s) {
  if (!s) return;
  const st = meta.stats;
  st.kills += s.kills; st.minis += s.mini;
  for (const e of s.evos) if (!st.evos.includes(e)) st.evos.push(e);
  if (s.winDiff > st.bestDiffWin) st.bestDiffWin = s.winDiff;
}

export function evaluateAchievements(meta) {
  const got = [];
  for (const a of ACHIEVEMENTS) {
    if (meta.achievements.includes(a.id) || !a.test(meta.stats, meta)) continue;
    meta.achievements.push(a.id);
    const r = a.reward;
    if (r.tickets) meta.coDuyenTicket += r.tickets;
    if (r.craftMats) meta.craftMats += r.craftMats;
    if (r.skill && !meta.unlocks.skills.includes(r.skill)) meta.unlocks.skills.push(r.skill);
    got.push(a);
  }
  return got;
}
