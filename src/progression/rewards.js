// Phần thưởng run (M2-03). Thuần logic.
//   RUNNING -> WIN/LOSE/ABANDON/TIMEOUT -> REWARD_PENDING (meta.pendingReward, đã lưu) -> REWARDED (claimReward, đã lưu) -> HUB
// Nhận đúng một lần: claimReward cộng tài nguyên và xóa pending trong CÙNG một lần ghi save; id run đã nhận nằm trong
// meta.rewardLog nên bấm lại / tải lại trang / stage lại cùng run đều không cộng thêm.
import { REWARD, DIFFICULTY } from '../core/config.js';
import { runSummary, applySummary } from './achievements.js';

export const OUTCOMES = ['WIN', 'LOSE', 'ABANDON', 'TIMEOUT'];
export const AMOUNT_KEYS = ['linhThach', 'lingQi', 'craftMats', 'tickets'];

export function computeRunReward(run, meta) {
  const min = run.time / 60, S = REWARD.STONE;
  const bosses = run.rewards.map(r => r.kind);
  const r = {
    linhThach: run.kills * S.PER_KILL + run.level * S.PER_LEVEL + min * S.PER_MIN,
    lingQi: min * REWARD.LINGQI_PER_MIN + (run.bonusQi || 0),   // + Linh Mạch (M3-04)
    craftMats: (run.eliteKills || 0) * REWARD.MATS_PER_ELITE,
    tickets: 0,
  };
  for (const b of bosses) for (const k of AMOUNT_KEYS) r[k] += REWARD.BOSS[b][k];
  const win = run.outcome === 'WIN';
  const dm = DIFFICULTY[run.diff || 0].reward;
  const mult = (win ? REWARD.WIN_MULT : 1) * (1 + meta.realmLevel * REWARD.REALM_MULT) * dm;
  const firstClear = win && !meta.firstClear;
  return {
    id: run.uid, outcome: run.outcome, bosses, firstClear, summary: runSummary(run),   // M4-02: thống kê cộng khi nhận
    linhThach: Math.round(r.linhThach * mult),
    lingQi: Math.round(r.lingQi * mult),
    craftMats: Math.round(r.craftMats * (win ? REWARD.WIN_MULT : 1) * dm),
    tickets: r.tickets + (firstClear ? REWARD.FIRST_CLEAR_TICKETS : 0),
  };
}

// Ghi phần thưởng chờ nhận. Không ghi đè một phần thưởng khác đang chờ (phải nhận nó trước) và không stage run đã nhận.
export function stageReward(meta, reward) {
  if (!reward || !reward.id || meta.rewardLog.includes(reward.id)) return false;
  if (meta.pendingReward && meta.pendingReward.id !== reward.id) return false;
  meta.pendingReward = { ...reward, bosses: [...reward.bosses], summary: reward.summary ? { ...reward.summary, evos: [...reward.summary.evos] } : null };
  return true;
}

// Nhận phần thưởng đang chờ (nếu có). Trả về phần đã cộng, hoặc null nếu không có gì để nhận.
export function claimReward(meta) {
  const r = meta.pendingReward;
  if (!r) return null;
  meta.pendingReward = null;
  if (meta.rewardLog.includes(r.id)) return null;
  for (const k of AMOUNT_KEYS) meta[k === 'tickets' ? 'coDuyenTicket' : k] += r[k];
  if (r.firstClear) meta.firstClear = true;
  applySummary(meta, r.summary);                       // M4-02: thống kê vĩnh viễn — cùng lần ghi với phần thưởng
  meta.rewardLog.push(r.id);
  if (meta.rewardLog.length > REWARD.LOG_KEEP) meta.rewardLog.splice(0, meta.rewardLog.length - REWARD.LOG_KEEP);
  return r;
}

export const rewardText = r => [
  r.linhThach && `💎 ${r.linhThach} linh thạch`, r.lingQi && `✨ ${r.lingQi} linh khí`,
  r.craftMats && `🔩 ${r.craftMats} luyện liệu`, r.tickets && `🎫 ${r.tickets} vé Cơ Duyên`,
].filter(Boolean).join(' · ') || 'không có';
