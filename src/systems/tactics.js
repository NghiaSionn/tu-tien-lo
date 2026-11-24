// M10-02: bộ chọn hành vi theo tình huống (tactical selector) + ngân sách đe dọa dùng chung.
// Chỉ chạy khi FEATURES.enemyTactics bật; tắt = AI M9 y nguyên (xoay vòng ORDER, quái gồng tự do).
// Tất định: chỉ dùng io.rng (= run.rng). Không pathfinding riêng từng con, quyết định theo nhịp so le.
import { TACTICS as TC, BOSS, PLAYER, ARCH, WOLF_PACK as WP, ICE_FAN as IF, ELITE_V2 as EV, BOSS_V2 } from '../core/config.js';
import { inCameraView } from './director.js';

// M10-10: khoảng cách từ điểm tới lõi vùng nổ (tròn: tâm; dải: đoạn x0,y0–x1,y1). Trúng khi < h.r
export function hazardDist(h, x, y) {
  if (h.x0 === undefined) return Math.hypot(x - h.x, y - h.y);
  const vx = h.x1 - h.x0, vy = h.y1 - h.y0, l2 = vx * vx + vy * vy || 1, k = Math.max(0, Math.min(1, ((x - h.x0) * vx + (y - h.y0) * vy) / l2));
  return Math.hypot(x - h.x0 - vx * k, y - h.y0 - vy * k);
}

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
  // M10-03: boss đang gồng chiêu nặng, hoặc người chơi đang đứng trong vùng sắp nổ -> quái thường chỉ được thêm ít đòn (không dồn vào lúc đang phải né)
  const onHazard = scene.hazards.some(h => hazardDist(h, player.x, player.y) < h.r + PLAYER.HITBOX);
  let normalCap = diff >= 2 ? TC.BUDGET.NORMAL_HIGH : TC.BUDGET.NORMAL;
  if (bossHeavy > 0 || onHazard) normalCap = Math.min(normalCap, TC.BUDGET_DURING_HEAVY);
  return { normal, bossHeavy, normalCap, onHazard, hazards: scene.hazards.length, shots: scene.enemyShots.length, dangers: dangerShapes(scene, player) };
}

// Quái thường được phép bắt đầu gồng đòn đặc biệt không (còn ngân sách trên màn). Nếu được, giữ chỗ ngay.
// extra: hình nguy hiểm đòn mới sẽ thêm (M10-08) — không được bịt kín mọi lối né của người chơi.
export function claimSpecial(io, m, player, extra = []) {
  const t = io.threat; if (!t) return true;
  const inView = inCameraView(io.map, player, m.x, m.y, 0);   // ngân sách chỉ tính trong màn (không bắn từ ngoài màn đã có luật riêng)
  if (inView && t.normal >= t.normalCap) return false;
  if (extra.length && t.dangers && !safeWith(io.map, player, t.dangers, extra)) return false;
  if (t.dangers) for (const s of extra) t.dangers.push(s);
  if (inView) t.normal++;
  return true;
}

// ---------- M10-08: hình nguy hiểm đang hiện cảnh báo (đúng hình học trúng đòn) ----------
// đoạn {x0,y0,x1,y1,w} hoặc tròn {x,y,r}. Chỉ lấy trong tầm 320 px quanh người chơi.
const segD = (px, py, s) => { const vx = s.x1 - s.x0, vy = s.y1 - s.y0, l2 = vx * vx + vy * vy || 1, k = Math.max(0, Math.min(1, ((px - s.x0) * vx + (py - s.y0) * vy) / l2)); return Math.hypot(px - s.x0 - vx * k, py - s.y0 - vy * k); };
const hits = (s, x, y) => s.r !== undefined ? Math.hypot(x - s.x, y - s.y) < s.r : segD(x, y, s) < s.w;
export const seg = (m, dx, dy, L, w) => ({ x0: m.x, y0: m.y, x1: m.x + dx * L, y1: m.y + dy * L, w });
export const fanSegs = (m, dx, dy, fan) => (fan ? [0, -IF.SPREAD, IF.SPREAD] : [0]).map(a => { const c = Math.cos(a), s = Math.sin(a); return seg(m, dx * c - dy * s, dx * s + dy * c, 250, ARCH.ranged.SHOT_R + PLAYER.HITBOX); });
// H-1a (24/11): phần cung CÒN LẠI của tia Ma Quang Hoành Tảo (đang gồng: cả nửa vòng; đang quét: từ góc hiện tại tới góc cuối)
// thành quạt các đoạn dài L, cách nhau STEP rad — quái thường gồng đòn mới phải chừa lối thoát ngoài vùng quét. Không đổi chiêu của boss.
const SWEEP_STEP = 0.2;
export function sweepSegs(m) {
  const S = BOSS_V2.FINAL.SWEEP, k0 = m.st === 'sweep' ? (m.swK || 0) : 0, out = [];
  const n = Math.max(1, Math.ceil(S.ARC * (1 - k0) / SWEEP_STEP));
  for (let i = 0; i <= n; i++) {
    const a = m.swA0 + m.swDir * S.ARC * (k0 + (1 - k0) * i / n);
    out.push(seg(m, Math.cos(a), Math.sin(a), S.L, S.W + PLAYER.HITBOX));
  }
  return out;
}
export function dangerShapes(scene, player) {
  const out = [], near = (x, y) => Math.abs(x - player.x) < 320 && Math.abs(y - player.y) < 320;
  for (const h of scene.hazards) if (near(h.x, h.y)) out.push(h.x0 !== undefined ? { x0: h.x0, y0: h.y0, x1: h.x1, y1: h.y1, w: h.r + PLAYER.HITBOX } : { x: h.x, y: h.y, r: h.r + PLAYER.HITBOX });
  for (const f of scene.fireTrails || []) if (near(f.x, f.y)) out.push({ x: f.x, y: f.y, r: f.r + PLAYER.HITBOX });
  for (const m of scene.monsters) {
    if (m.dead || (m.st !== 'windup' && m.st !== 'dash' && m.st !== 'sweep') || !near(m.x, m.y)) continue;
    const dash = (sp, time, w) => out.push(seg(m, m.dirX, m.dirY, m.st === 'dash' ? Math.min(sp * time, sp * Math.max(0, m.stT)) : sp * time, w));
    if (m.arch === 'charger') dash(ARCH.charger.DASH_SPEED, ARCH.charger.DASH_TIME, ARCH.charger.HIT_R + PLAYER.HITBOX);
    else if (m.arch === 'chaser') dash(WP.POUNCE.SPEED, WP.POUNCE.TIME, WP.POUNCE.HIT_R + PLAYER.HITBOX);
    else if (m.boss && m.pat === 'dash') dash(BOSS.MINI.DASH.SPEED, BOSS.MINI.DASH.TIME, BOSS.MINI.DASH.HIT_R);
    else if (m.arch === 'ranged' && m.st === 'windup') out.push(...fanSegs(m, m.dirX, m.dirY, m.fan));
    else if (m.arch === 'elite' && m.st === 'windup') out.push({ x: m.x, y: m.y, r: (m.sk === 'claw' ? EV.CLAW.R : ARCH.elite.SLAM_R) + PLAYER.HITBOX });
    else if (m.boss && m.pat === 'claw' && m.st === 'windup') out.push({ x: m.x, y: m.y, r: BOSS_V2.MINI.CLAW.R + PLAYER.HITBOX });   // M10-09
    else if (m.boss && (m.st === 'sweep' || (m.st === 'windup' && m.pat === 'sweep')) && m.swDir) out.push(...sweepSegs(m));   // H-1a: tia Hoành Tảo
  }
  return out;
}
// Còn điểm an toàn (đứng được, ngoài mọi hình) trong tầm đi bộ NEW_ESCAPE_T giây không, sau khi thêm `extra`
export function safeWith(map, player, dangers, extra) {
  const all = dangers.concat(extra), bad = (x, y) => all.some(s => hits(s, x, y));
  if (!bad(player.x, player.y)) return true;
  const reach = PLAYER.SPEED * TC.NEW_ESCAPE_T;
  for (const f of [0.5, 1]) for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2, x = player.x + Math.cos(a) * reach * f, y = player.y + Math.sin(a) * reach * f;
    if ((!map.canStand || map.canStand(x, y)) && !bad(x, y)) return true;
  }
  return false;
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
// M10-03: chiêu bắn đạn từ thân boss chỉ khi boss trong khung nhìn (không bắn từ ngoài màn)
const ONCAM = c => !c.io.map || !c.player || inCameraView(c.io.map, c.player, c.m.x, c.m.y, 0);
const PRISON_ON = c => c.io.hazards.some(h => h.src === 'boss:prison');   // M10-10: Lao Tù và Thập Tự không chồng nhau; đạn tỏa không ra khi Lao Tù đang chờ nổ
const CROSS_ON = c => c.io.hazards.some(h => h.src === 'boss:cross');
const SUMMONED = ctx => ctx.io.scene ? ctx.io.scene.monsters.filter(o => o.summoned && !o.dead).length : 0;
export const BOSS_SKILLS = {
  MINI: [
    { id: 'dash', valid: () => true, w: c => c.d > 70 ? 3 : 1.5 },
    { id: 'howl', valid: c => SUMMONED(c) < TC.MAX_SUMMONED, w: c => c.d < 90 ? 0.8 : 1.6 },
    { id: 'howlDash', valid: c => c.remix && SUMMONED(c) < TC.MAX_SUMMONED, w: c => c.d > 90 ? 2 : 1 },
  ],
  // M10-09 (bossPatternsV2): Lang Vương 5 chiêu, chọn theo tầm + số sói đàn + pha
  MINI_V2: [
    { id: 'dash', valid: () => true, w: c => c.d > 90 ? 3 : 1.2 },
    { id: 'howl', valid: c => SUMMONED(c) + BOSS.MINI.HOWL.N <= TC.MAX_SUMMONED, w: c => SUMMONED(c) < 3 ? 2.2 : 0.6 },   // đàn gọi ra không vượt MAX_SUMMONED
    { id: 'claw', valid: c => c.d < BOSS_V2.MINI.CLAW.TRIGGER, w: () => 3.5 },
    { id: 'howlDash', valid: c => c.phase2 && c.remix && SUMMONED(c) + BOSS.MINI.HOWL.N <= TC.MAX_SUMMONED, w: () => 1.2 },
    { id: 'leap', valid: c => c.phase2 && c.d > BOSS_V2.MINI.LEAP.MIN_D && c.d < BOSS_V2.MINI.LEAP.MAX_D, w: () => 2.5 },
  ],
  // M10-10 (bossPatternsV2): Yêu Vương 7 chiêu; P1 burst/zones/slam/prison(remix, sau làm quen), P2 thêm shadow/sweep/cross
  FINAL_V2: [
    { id: 'burst', valid: c => ONCAM(c) && !PRISON_ON(c), w: c => c.d > 80 ? 2.2 : 1 },
    { id: 'zones', valid: c => c.io.hazards.length + (c.phase2 ? BOSS.FINAL.ZONES.N2 : BOSS.FINAL.ZONES.N) <= BOSS_V2.FINAL.MAX_HAZARDS, w: c => c.d > 120 ? 2 : 1.2 },
    { id: 'slam', valid: c => c.d < BOSS.FINAL.SLAM.TRIGGER * TC.SLAM_RANGE_MULT, w: c => c.d < BOSS.FINAL.SLAM.TRIGGER ? 3.5 : 1 },
    { id: 'prison', valid: c => c.remix && ONCAM(c) && (c.phase2 || (c.m.age || 0) >= BOSS_V2.FINAL.PRISON_AFTER) && !CROSS_ON(c) && c.io.hazards.length + BOSS.FINAL.REMIX.PRISON.N <= BOSS_V2.FINAL.MAX_HAZARDS, w: c => c.phase2 ? 1.6 : 0.7 },
    { id: 'shadow', valid: c => c.phase2 && (c.d > 150 || c.d < 40), w: c => c.d > 150 ? 2 : 1.2 },
    { id: 'sweep', valid: c => c.phase2 && ONCAM(c) && c.d < BOSS_V2.FINAL.SWEEP.L - 20, w: c => c.d < 120 ? 2.4 : 1.4 },
    { id: 'cross', valid: c => c.phase2 && !PRISON_ON(c) && !CROSS_ON(c) && c.io.hazards.length + 2 <= BOSS_V2.FINAL.MAX_HAZARDS, w: c => c.d > 70 ? 2.2 : 1.2 },
    { id: 'summon', valid: c => SUMMONED(c) < TC.MAX_SUMMONED, w: c => SUMMONED(c) < 2 ? 1.8 : 0.5 },   // (24/11) Triệu Ma Ảnh
  ],
  FINAL: [
    { id: 'burst', valid: c => ONCAM(c), w: c => c.d > 80 ? 2.5 : 1.2 },
    { id: 'zones', valid: c => c.io.hazards.length + (c.phase2 ? BOSS.FINAL.ZONES.N2 : BOSS.FINAL.ZONES.N) <= (BOSS.FINAL.MAX_HAZARDS || 12), w: c => c.d > 120 ? 2.2 : 1.4 },
    { id: 'slam', valid: c => c.d < BOSS.FINAL.SLAM.TRIGGER * TC.SLAM_RANGE_MULT, w: c => c.d < BOSS.FINAL.SLAM.TRIGGER ? 4 : 1 },
    { id: 'prison', valid: c => c.remix && ONCAM(c) && c.io.hazards.length + BOSS.FINAL.REMIX.PRISON.N <= (BOSS.FINAL.MAX_HAZARDS || 12), w: c => c.phase2 ? 2 : 0.8 },
    { id: 'summon', valid: c => SUMMONED(c) < TC.MAX_SUMMONED, w: c => SUMMONED(c) < 2 ? 1.8 : 0.5 },   // (24/11) Triệu Ma Ảnh
  ],
};

// Chọn chiêu: lọc hợp lệ + hết hồi chiêu + chống lặp (không quá TC.MAX_REPEAT lần liên tiếp), bốc theo trọng số.
export function selectBossSkill(m, B, d, io, player, phase2) {
  const list = (io.bossV2 && BOSS_SKILLS[m.bossKind + '_V2']) || BOSS_SKILLS[m.bossKind]; if (!list) return null;
  m.skillCd = m.skillCd || {}; m.skillHist = m.skillHist || [];
  const ctx = { m, B, d, phase2, remix: !!m.remix, io, player };
  const now = m.age || 0;
  const rep = id => { const h = m.skillHist; let n = 0; for (let i = h.length - 1; i >= 0 && h[i] === id; i--) n++; return n; };
  let cands = list.filter(s => s.valid(ctx) && !(m.skillCd[s.id] > now) && rep(s.id) < TC.MAX_REPEAT);
  if (io.threat && io.threat.bossHeavy >= TC.BUDGET.BOSS_HEAVY) cands = cands.filter(s => !TC.HEAVY[s.id]);
  if (!cands.length) cands = list.filter(s => s.valid(ctx) && rep(s.id) < TC.MAX_REPEAT);   // hết lựa chọn: bỏ qua hồi chiêu, vẫn chống lặp
  if (!cands.length) return null;   // M10-03: không chiêu nào hợp lệ (vd boss ngoài màn, vùng đã đầy) -> boss chờ, không ép chiêu
  const ws = cands.map(s => Math.max(0, s.w(ctx)));
  let r = io.rng() * ws.reduce((a, v) => a + v, 0), pick = cands[cands.length - 1];
  for (let i = 0; i < cands.length; i++) { r -= ws[i]; if (r < 0) { pick = cands[i]; break; } }
  m.skillHist.push(pick.id); if (m.skillHist.length > 8) m.skillHist.shift();
  const cd = (TC.SKILL_CD[m.bossKind] || {})[pick.id]; if (cd) m.skillCd[pick.id] = now + cd;
  return pick.id;
}

// ---------- M10-03: lối thoát ----------
// Có điểm đứng được, ngoài mọi vùng (cũ + mới), trong tầm đi bộ trước khi vùng nổ không? Xét cả đứng yên.
export function hasEscape(map, player, zones, time) {
  const reach = PLAYER.SPEED * time * TC.ESCAPE.SPEED_MUL, M = PLAYER.HITBOX + TC.ESCAPE.MARGIN;
  const safe = (x, y) => zones.every(h => hazardDist(h, x, y) >= h.r + M);
  if (safe(player.x, player.y)) return true;
  for (const f of [0.5, 1]) for (let i = 0; i < TC.ESCAPE.DIRS; i++) {
    const a = i * Math.PI * 2 / TC.ESCAPE.DIRS, x = player.x + Math.cos(a) * reach * f, y = player.y + Math.sin(a) * reach * f;
    if (safe(x, y) && (!map.canStand || map.canStand(x, y))) return true;
  }
  return false;
}
// Bỏ bớt vùng mới (xa người chơi trước) tới khi còn lối thoát. Trả về danh sách vùng được giữ.
export function keepEscape(map, player, existing, fresh, time) {
  const keep = fresh.slice();
  while (keep.length && !hasEscape(map, player, existing.concat(keep), time)) {
    let k = 0, far = -1;
    for (let i = 0; i < keep.length; i++) { const d = Math.hypot(keep[i].x - player.x, keep[i].y - player.y); if (d > far) { far = d; k = i; } }
    keep.splice(k, 1);
  }
  return keep;
}
