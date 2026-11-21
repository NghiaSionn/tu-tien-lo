// M10-02: bộ chọn hành vi theo tình huống (tactical selector) + ngân sách đe dọa dùng chung.
// Chỉ chạy khi FEATURES.enemyTactics bật; tắt = AI M9 y nguyên (xoay vòng ORDER, quái gồng tự do).
// Tất định: chỉ dùng io.rng (= run.rng). Không pathfinding riêng từng con, quyết định theo nhịp so le.
import { TACTICS as TC, BOSS } from '../core/config.js';
import { inCameraView } from './director.js';

// ---------- ngân sách đe dọa (đầu mỗi tick, run.js gọi) ----------
// Đếm đòn đặc biệt của quái thường đang gồng/lao trong khung nhìn + chiêu boss nặng đang gồng.
export function threatScan(scene, player, diff = 0) {
  let normal = 0, bossHeavy = 0;
  for (const m of scene.monsters) {
    if (m.dead || (m.st !== 'windup' && m.st !== 'dash')) continue;
    if (!inCameraView(scene.map, player, m.x, m.y, 0)) continue;
    if (m.boss) { if (TC.HEAVY[m.pat]) bossHeavy++; }
    else normal++;
  }
  return { normal, bossHeavy, normalCap: diff >= 2 ? TC.BUDGET.NORMAL_HIGH : TC.BUDGET.NORMAL, hazards: scene.hazards.length, shots: scene.enemyShots.length };
}

// Quái thường được phép bắt đầu gồng đòn đặc biệt không (còn ngân sách trên màn). Nếu được, giữ chỗ ngay.
export function claimSpecial(io, m, player) {
  const t = io.threat; if (!t) return true;
  if (!inCameraView(io.map, player, m.x, m.y, 0)) return true;   // ngoài màn không tính (không bắn từ ngoài màn đã có luật riêng)
  if (t.normal >= t.normalCap) return false;
  t.normal++; return true;
}

// Nhịp suy nghĩ so le: true khi tới lượt con này đánh giá chiến thuật
export function thinkTick(m, dt, rng) {
  if (m.tacT === undefined) m.tacT = rng() * TC.THINK[1];
  m.tacT -= dt;
  if (m.tacT > 0) return false;
  m.tacT = TC.THINK[0] + rng() * (TC.THINK[1] - TC.THINK[0]);
  return true;
}

// ---------- registry chiêu boss ----------
// valid(ctx): có dùng được không; w(ctx): trọng số theo tình huống. ctx: { m, B, d, phase2, remix, io, player }
const SUMMONED = ctx => ctx.io.scene ? ctx.io.scene.monsters.filter(o => o.summoned && !o.dead).length : 0;
export const BOSS_SKILLS = {
  MINI: [
    { id: 'dash', valid: () => true, w: c => c.d > 70 ? 3 : 1.5 },
    { id: 'howl', valid: c => SUMMONED(c) < TC.MAX_SUMMONED, w: c => c.d < 90 ? 0.8 : 1.6 },
    { id: 'howlDash', valid: c => c.remix && SUMMONED(c) < TC.MAX_SUMMONED, w: c => c.d > 90 ? 2 : 1 },
  ],
  FINAL: [
    { id: 'burst', valid: () => true, w: c => c.d > 80 ? 2.5 : 1.2 },
    { id: 'zones', valid: c => c.io.hazards.length + (c.phase2 ? BOSS.FINAL.ZONES.N2 : BOSS.FINAL.ZONES.N) <= (BOSS.FINAL.MAX_HAZARDS || 12), w: c => c.d > 120 ? 2.2 : 1.4 },
    { id: 'slam', valid: c => c.d < BOSS.FINAL.SLAM.TRIGGER * TC.SLAM_RANGE_MULT, w: c => c.d < BOSS.FINAL.SLAM.TRIGGER ? 4 : 1 },
    { id: 'prison', valid: c => c.remix && c.io.hazards.length + BOSS.FINAL.REMIX.PRISON.N <= (BOSS.FINAL.MAX_HAZARDS || 12), w: c => c.phase2 ? 2 : 0.8 },
  ],
};

// Chọn chiêu: lọc hợp lệ + hết hồi chiêu + chống lặp (không quá TC.MAX_REPEAT lần liên tiếp), bốc theo trọng số.
export function selectBossSkill(m, B, d, io, player, phase2) {
  const list = BOSS_SKILLS[m.bossKind]; if (!list) return null;
  m.skillCd = m.skillCd || {}; m.skillHist = m.skillHist || [];
  const ctx = { m, B, d, phase2, remix: !!m.remix, io, player };
  const now = m.age || 0;
  const rep = id => { const h = m.skillHist; let n = 0; for (let i = h.length - 1; i >= 0 && h[i] === id; i--) n++; return n; };
  let cands = list.filter(s => s.valid(ctx) && !(m.skillCd[s.id] > now) && rep(s.id) < TC.MAX_REPEAT);
  if (io.threat && io.threat.bossHeavy >= TC.BUDGET.BOSS_HEAVY) cands = cands.filter(s => !TC.HEAVY[s.id]);
  if (!cands.length) cands = list.filter(s => s.valid(ctx) && rep(s.id) < TC.MAX_REPEAT);   // hết lựa chọn: bỏ qua hồi chiêu, vẫn chống lặp
  if (!cands.length) return list[0].id;
  const ws = cands.map(s => Math.max(0, s.w(ctx)));
  let r = io.rng() * ws.reduce((a, v) => a + v, 0), pick = cands[cands.length - 1];
  for (let i = 0; i < cands.length; i++) { r -= ws[i]; if (r < 0) { pick = cands[i]; break; } }
  m.skillHist.push(pick.id); if (m.skillHist.length > 8) m.skillHist.shift();
  const cd = (TC.SKILL_CD[m.bossKind] || {})[pick.id]; if (cd) m.skillCd[pick.id] = now + cd;
  return pick.id;
}
