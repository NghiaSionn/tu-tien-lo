// M7-07 [GIẢ THUYẾT H2]: sau mỗi lượt, chỉ ra tối đa 2 mục tiêu meta gần nhất, tính từ dữ liệu có sẵn.
// Thuần logic: không đổi meta, không tạo thưởng mới. meta truyền vào là trạng thái SAU khi nhận thưởng lượt.
import { MEDITATION, REALM_UNLOCKS } from '../core/config.js';
import { need, levelName, isMajor, MAX_L } from './realm.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { SKILLS } from '../data/skills.js';
import { claimReward } from './rewards.js';
import { evaluateAchievements } from './achievements.js';

// Trả về [{ kind, text, cur, max, action }]; action ∈ 'break' | 'meditate' | 'run' | null
export function metaGoals(meta) {
  const out = [];
  const L = meta.realmLevel, n = need(L), xp = Math.floor(meta.cultivationXp);
  if (L < MAX_L) {
    const next = levelName(L + 1);
    const unlock = REALM_UNLOCKS[L + 1];
    const tail = unlock ? ` — mở ${unlock.text}` : '';
    if (xp >= n) {
      out.push({ kind: 'realm', state: 'ready', text: `Tu vi viên mãn: ${isMajor(L) ? 'độ thiên kiếp' : 'đột phá'} lên ${next}${tail}.`, cur: xp, max: n, action: 'break' });
    } else {
      const fromQi = Math.floor(meta.lingQi * MEDITATION.YIELD);   // tọa thiền trong tụ linh trận
      if (xp + fromQi >= n) out.push({ kind: 'realm', state: 'enough_qi', text: `Đủ linh khí để tu vi viên mãn: tọa thiền trong Tụ Linh Trận rồi đột phá lên ${next}${tail}.`, cur: xp, max: n, action: 'meditate' });
      else {
        const missQi = Math.ceil((n - xp - fromQi) / MEDITATION.YIELD);
        out.push({ kind: 'realm', state: 'short', text: `Tu vi ${xp}/${n} tới ${next}: còn thiếu khoảng ${missQi} linh khí — mang về từ bí cảnh${fromQi > 0 ? ', và tọa thiền số đang có' : ''}.`, cur: xp + fromQi, max: n, action: fromQi > 0 ? 'meditate' : 'run' });
      }
    }
  }
  // thành tựu gần xong nhất (ưu tiên cái mở công pháp)
  let best = null;
  for (const a of ACHIEVEMENTS) {
    if (!a.prog || meta.achievements.includes(a.id)) continue;
    const [cur, max] = a.prog(meta.stats, meta);
    const ratio = Math.min(1, cur / max) + (a.reward.skill ? 0.15 : 0);
    if (!best || ratio > best.ratio) best = { a, cur, max, ratio };
  }
  if (best) {
    const r = best.a.reward;
    const what = r.skill && SKILLS[r.skill] ? `mở công pháp ${SKILLS[r.skill].name}` : 'nhận vé Cơ Duyên';
    out.push({ kind: 'achievement', id: best.a.id, text: `Thành tựu ${best.a.name} (${best.a.desc}): ${Math.min(best.cur, best.max)}/${best.max} — ${what}.`, cur: Math.min(best.cur, best.max), max: best.max, action: 'run' });
  }
  return out.slice(0, 2);
}

// Bản xem trước: bản sao meta sau khi nhận phần thưởng đang chờ + thành tựu vừa đạt (đúng logic thật, không đụng meta thật)
export function previewAfterClaim(meta) {
  const m = JSON.parse(JSON.stringify(meta));
  claimReward(m);
  evaluateAchievements(m);
  return m;
}
