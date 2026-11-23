// Boss (M2-02): Lang Vương (mini-boss giữa run) và Ma Ảnh Yêu Vương (boss cuối). Máy trạng thái:
//   move (đuổi, đếm GAP) -> windup (gồng, có cảnh báo) -> [dash ×n] -> recover (sơ hở, nhận thêm sát thương) -> move
// Chiêu chỉ bắt đầu từ 'move'; boss chết thì không còn gì chạy (run.js dọn vùng/đạn). Chỉ dùng io.rng (seed của run).
import { BOSS, RUN, HUB_MONSTER as HM, TACTICS as TC, BOSS_V2, PLAYER } from '../core/config.js';
import { selectBossSkill, keepEscape, hazardDist } from '../systems/tactics.js';

export const bossDef = m => BOSS[m.bossKind];

// io: { map, shots, hazards, ev, rng, onAttack(m, dmg), summon(m, n, r), player, time }
export function bossAI(m, player, dx, dy, d, dt, io) {
  const B = bossDef(m);
  if (m.vuln > 0) m.vuln -= dt;
  m.age += dt;
  if (m.bossKind === 'FINAL' && !m.enraged && m.age >= B.ENRAGE_AFTER) {
    m.enraged = true; m.dmg = Math.round(m.dmg * B.ENRAGE_DMG);
    io.ev.push({ type: 'announce', x: m.x, y: m.y, text: `${B.name} cuồng nộ!`, color: '#ff5a5a' });
  }
  const V = io.bossV2 ? BOSS_V2[m.bossKind] : null;   // M10-09: bộ chiêu 2 pha mới (null = boss cũ)
  const phase2 = V ? m.hp <= m.max * (V.PHASE2 ?? B.PHASE2) : (m.bossKind === 'FINAL' && m.hp <= m.max * B.PHASE2);   // M10-10: FINAL giữ ngưỡng BOSS.FINAL.PHASE2
  if (V) {   // M10-11: m.v2 -> thanh máu hiện pha + tên chiêu
    m.v2 = true;
    // ước lượng vận tốc người chơi (cho Vồ Đầu Đàn dự đoán), làm mượt
    if (m.ppx !== undefined && dt > 0) { m.pvx = (m.pvx || 0) * 0.8 + (player.x - m.ppx) / dt * 0.2; m.pvy = (m.pvy || 0) * 0.8 + (player.y - m.ppy) / dt * 0.2; }
    m.ppx = player.x; m.ppy = player.y;
    // chuyển P1 -> P2 đúng một lần, chỉ giữa hai chiêu (không cắt đòn đang ra): thông báo + choáng (sơ hở)
    if (phase2 && !m.p2 && (m.st === 'move' || m.st === 'recover')) {
      m.p2 = true; m.st = 'recover'; m.stT = V.STAGGER; m.vuln = V.STAGGER; m.vx = m.vy = 0;
      io.ev.push({ type: 'announce', x: m.x, y: m.y, text: V.P2_TEXT, color: '#ff8a5a' }, { type: 'shake', t: 0.2 }, { type: 'sfx', name: 'bossPhase' });   // M10-11: tiếng chuyển pha
      return true;
    }
  }

  if (m.st === 'windup') {
    m.vx = m.vy = 0; m.stT -= dt;
    if (m.stT > 0) return true;
    return release(m, player, B, io, phase2);
  }
  if (m.st === 'dash') {
    m.vx = m.dirX * B.DASH.SPEED; m.vy = m.dirY * B.DASH.SPEED; m.stT -= dt;
    if (!m.dashHit && d < B.DASH.HIT_R) { m.dashHit = true; io.onAttack(m, m.dmg * B.DASH.DMG); }
    if (m.stT <= 0) {
      m.dashLeft--;
      if (m.dashLeft > 0) { m.st = 'rest'; m.stT = B.DASH.REST; }
      else toRecover(m, B, io);
    }
    return true;
  }
  if (m.st === 'leap') {          // M10-09 Vồ Đầu Đàn: bay theo đường thẳng tới dấu đáp (vùng nổ tự gây sát thương đúng lúc đáp)
    m.vx = m.vy = 0; m.stT -= dt;
    const k = Math.min(1, 1 - Math.max(0, m.stT) / V_AIR(m));
    m.x = m.lx0 + (m.leapX - m.lx0) * k; m.y = m.ly0 + (m.leapY - m.ly0) * k;
    if (m.stT <= 0) { m.x = m.lastX = m.leapX; m.y = m.lastY = m.leapY; toRecover(m, B, io); }
    return true;
  }
  if (m.st === 'sweep') {         // M10-10 Ma Quang Hoành Tảo: tia quét nửa vòng, trúng tối đa 1 lần
    const S = BOSS_V2.FINAL.SWEEP;
    m.vx = m.vy = 0; m.stT -= dt;
    const k0 = m.swK || 0, k1 = Math.min(1, 1 - Math.max(0, m.stT) / S.TIME); m.swK = k1;
    const a0 = m.swA0 + m.swDir * S.ARC * k0, a1 = m.swA0 + m.swDir * S.ARC * k1;
    if (!m.dashHit && sweepHits(m, player, a0, a1, S)) { m.dashHit = true; io.onAttack(m, m.dmg * S.DMG, 'boss:sweep'); }
    if (m.stT <= 0) toRecover(m, B, io);
    return true;
  }
  if (m.st === 'rest') {           // nghỉ ngắn giữa các lần lao: gồng lại, nhắm lại
    m.vx = m.vy = 0; m.stT -= dt;
    if (m.stT <= 0) aimDash(m, player, B);
    return true;
  }
  if (m.st === 'blink') {          // M10-03 (bật cờ): giải kẹt có báo trước — vòng tím ở điểm hiện ra, hết giờ mới dịch chuyển
    m.vx = m.vy = 0; m.stT -= dt;
    if (m.stT <= 0) {
      io.ev.push({ type: 'pulse', x: m.x, y: m.y, r: 30, color: '#d9a8ff' }, { type: 'pulse', x: m.blinkX, y: m.blinkY, r: 30, color: '#d9a8ff' });
      m.x = m.lastX = m.blinkX; m.y = m.lastY = m.blinkY;
      m.st = 'move'; m.atkCd = Math.max(m.atkCd || 0, TC.BLINK_GRACE);
      if (m.blinkSkill) { m.blinkSkill = false; m.atkCd = Math.max(m.atkCd, B.RECOVER + BOSS_V2.FINAL.SHADOW.GRACE); toRecover(m, B, io); }   // M10-10 Ảnh Độn: hiện ra xong sơ hở
    }
    return true;
  }
  if (m.st === 'recover') {
    m.vx = m.vy = 0; m.stT -= dt;
    if (m.stT <= 0) { m.st = 'move'; m.gapT = B.GAP * (m.enraged ? B.ENRAGE_GAP : phase2 ? ((V && V.P2_GAP) || B.PHASE2_GAP || 1) : 1); }   // cuồng nộ = trạng thái trong P2, không phải pha 3
    return true;
  }

  // move: đuổi; cắn khi sát; hết GAP thì ra chiêu
  m.vx = dx / d * m.speed; m.vy = dy / d * m.speed;
  if (d < HM.ATTACK_RANGE + (m.reach || 6)) { m.vx = m.vy = 0; if (m.atkCd <= 0) { m.atkCd = HM.ATTACK_CD; io.onAttack(m, m.dmg); } }
  if (unstick(m, d, dt, io, player)) return true;
  m.gapT -= dt;
  if (m.gapT > 0) return true;
  let pat = (io.tactics || V) ? selectBossSkill(m, B, d, io, player, phase2) : pickPattern(m, B, d);   // M10-02: chọn theo tình huống khi bật cờ (M10-09: luôn dùng selector cho bộ chiêu mới)
  if (pat === 'leap' && !startLeap(m, player, io, B, V)) pat = 'dash';   // không có dấu đáp hợp lệ / hết lối né -> lao thường
  if (!pat) { m.gapT = 0.4; return true; }
  if (V) { m.v2 = true; io.ev.push({ type: 'sfx', name: 'bossWarn' }); }   // M10-11: tiếng báo boss ra chiêu (khoảng nghỉ 0,8 s trong sfx.js)   // M10-03: chưa có chiêu hợp lệ -> đuổi tiếp, xét lại sau
  m.pat = pat;
  if (io.log) io.log(m.bossKind, pat);   // M10: telemetry chiêu boss (cả AI cũ và mới)
  if (pat === 'dash') { m.dashLeft = B.DASH.COUNT; aimDash(m, player, B); }
  else if (pat === 'claw') {   // M10-09 Liệt Trảo: khóa hướng lúc bắt đầu gồng
    const l = Math.hypot(dx, dy) || 1; m.dirX = dx / l; m.dirY = dy / l; windup(m, V.CLAW.WINDUP);
  }
  else if (pat === 'leap') { /* startLeap đã đặt dấu đáp + gồng */ }
  else if (pat === 'shadow') {   // M10-10 Ảnh Độn: báo điểm hiện ra (trạng thái blink có cảnh báo), hiện ra xong sơ hở
    const spot = shadowSpot(m, player, io);
    if (spot) { m.st = 'blink'; m.stT = m.stMax = V.SHADOW.WARN; m.blinkX = spot[0]; m.blinkY = spot[1]; m.blinkSkill = true; m.vx = m.vy = 0; io.ev.push({ type: 'pulse', x: m.x, y: m.y, r: 30, color: '#d9a8ff' }); }
    else m.gapT = 0.4;
  }
  else if (pat === 'sweep') {    // M10-10 Ma Quang Hoành Tảo: khóa góc bắt đầu (lệch khỏi người chơi) + chiều quét
    const S = V.SWEEP, ap = Math.atan2(dy, dx);
    m.swDir = io.rng() < 0.5 ? 1 : -1; m.swA0 = ap - m.swDir * S.SAFE_START; m.swK = 0; m.dashHit = false;
    windup(m, S.WINDUP);
  }
  else if (pat === 'cross') {    // M10-10 Thập Tự Hắc Liệt: 2 dải vuông góc giao tại vị trí người chơi lúc khóa (có kiểm lối né)
    const C = V.CROSS, rot = io.rng() < 0.5 ? 0 : Math.PI / 4, zs = [];
    for (const a of [rot, rot + Math.PI / 2]) {
      const ux = Math.cos(a), uy = Math.sin(a);
      zs.push({ x: player.x, y: player.y, x0: player.x - ux * C.LEN, y0: player.y - uy * C.LEN, x1: player.x + ux * C.LEN, y1: player.y + uy * C.LEN, r: C.W, t: C.WINDUP, dmg: m.dmg * C.DMG, owner: m, src: 'boss:cross' });
    }
    const before = io.hazards.length;
    placeZones(io, B, player, zs, C.WINDUP);
    if (io.hazards.length - before < 2) {   // không đủ lối né / đầy vùng -> bỏ, đổi sang đạn tỏa
      io.hazards.length = before; m.pat = 'burst'; windup(m, B.BURST.WINDUP); m.burstN = B.BURST.N2; m.burstA0 = io.rng() * Math.PI * 2 / m.burstN;
    } else windup(m, C.WINDUP);
  }
  else if (pat === 'howl' || pat === 'howlDash') windup(m, B.HOWL.WINDUP);
  else if (pat === 'summon') {   // (24/11) Triệu Ma Ảnh: chọn chỗ + ma ấn báo trước; đủ quân rồi / không có chỗ -> đổi sang đạn tỏa
    const S = B.SUMMON, room = TC.MAX_SUMMONED - summonedCount(io);
    const spots = room > 0 ? summonSpots(m, player, io, Math.min(room, phase2 ? S.N2 : S.N), S) : [];
    if (spots.length) { m.sumSpots = spots; windup(m, S.WINDUP); io.ev.push({ type: 'pulse', x: m.x, y: m.y - 10, r: 40, color: '#c070ff' }); }
    else { m.pat = 'burst'; windup(m, B.BURST.WINDUP); m.burstN = phase2 ? B.BURST.N2 : B.BURST.N; m.burstA0 = io.rng() * Math.PI * 2 / m.burstN; }
  }
  else if (pat === 'prison') {   // M7-13 Ma Ảnh Lao Tù: vòng vùng nổ quanh người chơi + đạn thưa khi nổ
    const P = B.REMIX.PRISON;
    windup(m, P.WINDUP);
    m.burstN = P.BURST_N; m.burstA0 = io.rng() * Math.PI * 2 / m.burstN;
    const a0 = io.rng() * Math.PI * 2, zs = [];
    for (let i = 0; i < P.N; i++) {
      const a = a0 + i * Math.PI * 2 / P.N;
      zs.push({ x: player.x + Math.cos(a) * P.RING, y: player.y + Math.sin(a) * P.RING, r: P.R, t: P.WINDUP, dmg: m.dmg * P.DMG, owner: m, src: 'boss:prison' });
    }
    placeZones(io, B, player, zs, P.WINDUP);
  }
  else if (pat === 'slam') {
    windup(m, B.SLAM.WINDUP);
    addHazard(io, B, { x: m.x, y: m.y, r: B.SLAM.R, t: B.SLAM.WINDUP, dmg: m.dmg * B.SLAM.DMG, owner: m, src: 'boss:slam' });
  } else if (pat === 'burst') {
    windup(m, B.BURST.WINDUP);
    m.burstN = phase2 ? B.BURST.N2 : B.BURST.N; m.burstA0 = io.rng() * Math.PI * 2 / m.burstN;
  } else if (pat === 'zones') {
    windup(m, B.ZONES.WINDUP);
    const n = phase2 ? B.ZONES.N2 : B.ZONES.N, zs = [];
    for (let i = 0; i < n; i++) {
      const a = io.rng() * Math.PI * 2, r = i === 0 ? 0 : B.ZONES.SPREAD * (0.5 + io.rng() * 0.6);
      zs.push({ x: player.x + Math.cos(a) * r, y: player.y + Math.sin(a) * r, r: B.ZONES.R, t: B.ZONES.WINDUP, dmg: m.dmg * B.ZONES.DMG, owner: m, src: 'boss:zone' });
    }
    placeZones(io, B, player, zs, B.ZONES.WINDUP);
  }
  return true;
}

// (24/11) Triệu Ma Ảnh: số quân đang được gọi; chỗ trồi lên quanh boss (đứng được, không sát người chơi, không chồng nhau)
function summonedCount(io) { return io.scene ? io.scene.monsters.filter(o => o.summoned && !o.dead).length : 0; }
function summonSpots(m, player, io, n, S) {
  const out = [], a0 = io.rng() * Math.PI * 2;
  for (let i = 0; i < n * 4 && out.length < n; i++) {
    const a = a0 + i * Math.PI * 2 / n + (i >= n ? io.rng() : 0), r = S.R * (i >= n ? 0.6 + io.rng() * 0.6 : 1);
    const x = m.x + Math.cos(a) * r, y = m.y + Math.sin(a) * r;
    if (!io.map.canStand(x, y) || Math.hypot(x - player.x, y - player.y) < S.MIN_P || out.some(([ox, oy]) => Math.hypot(ox - x, oy - y) < 20)) continue;
    out.push([x, y]);
  }
  return out;
}

function pickPattern(m, B, d) {
  if (m.bossKind === 'FINAL' && d < B.SLAM.TRIGGER) return 'slam';
  const order = m.remix && B.REMIX ? B.REMIX.ORDER : B.ORDER;   // M7-13: chuỗi chiêu có chiêu phối
  const p = order[m.patIdx % order.length]; m.patIdx++;
  return p;
}

function windup(m, t) { m.st = 'windup'; m.stT = t; m.stMax = t; m.vx = m.vy = 0; }
function aimDash(m, player, B) {
  const ax = player.x - m.x, ay = player.y - m.y, l = Math.hypot(ax, ay) || 1;
  m.dirX = ax / l; m.dirY = ay / l; m.dashHit = false;
  windup(m, B.DASH.WINDUP);
}
function toRecover(m, B, io) {
  m.st = 'recover'; m.stT = B.RECOVER; m.vuln = B.RECOVER;
  io.ev.push({ type: 'text', x: m.x, y: m.y - 34, text: 'sơ hở!', color: '#ffe066' });
}

function release(m, player, B, io, phase2) {
  if (m.pat === 'dash') { m.st = 'dash'; m.stT = B.DASH.TIME; return true; }
  if (m.pat === 'claw') {   // M10-09: quét cung theo hướng đã khóa
    const C = BOSS_V2.MINI.CLAW, dx = player.x - m.x, dy = player.y - m.y, d = Math.hypot(dx, dy);
    if (d < C.R + PLAYER.HITBOX && (d < 8 || (dx * m.dirX + dy * m.dirY) / d >= Math.cos(C.ARC / 2))) io.onAttack(m, m.dmg * C.DMG, 'miniboss:claw');
    io.ev.push({ type: 'shake', t: 0.12 });
    toRecover(m, B, io); return true;
  }
  if (m.pat === 'sweep') { m.st = 'sweep'; m.stT = BOSS_V2.FINAL.SWEEP.TIME; m.swK = 0; return true; }   // M10-10
  if (m.pat === 'leap') { m.st = 'leap'; m.stT = BOSS_V2.MINI.LEAP.AIR; m.lx0 = m.x; m.ly0 = m.y; return true; }
  if (m.pat === 'howlDash') {   // M7-13: hú xong -> chuỗi lao (mỗi cú vẫn gồng + cảnh báo đường lao)
    io.summon(m, B.HOWL.N, B.HOWL.R);
    io.ev.push({ type: 'pulse', x: m.x, y: m.y, r: 60, color: '#ffd978' });
    m.pat = 'dash'; m.dashLeft = B.REMIX.HOWL_DASH.COUNT; aimDash(m, player, B);
    return true;
  }
  if (m.pat === 'summon') {   // (24/11) ma ảnh trồi lên đúng các ma ấn đã báo
    if (io.summonAt) io.summonAt(m.sumSpots || [], B.SUMMON.LIFE);
    for (const [x, y] of m.sumSpots || []) io.ev.push({ type: 'pulse', x, y, r: 26, color: '#c070ff' });
    m.sumSpots = null;
  } else if (m.pat === 'howl') {
    io.summon(m, B.HOWL.N, B.HOWL.R);
    io.ev.push({ type: 'pulse', x: m.x, y: m.y, r: 60, color: '#ffd978' });
  } else if (m.pat === 'burst' || m.pat === 'prison') {
    for (let i = 0; i < m.burstN; i++) {
      if (io.shots.length >= RUN.MAX_ENEMY_SHOTS) break;
      const a = m.burstA0 + i * Math.PI * 2 / m.burstN;
      io.shots.push({ x: m.x, y: m.y - 10, vx: Math.cos(a) * B.BURST.SPEED, vy: Math.sin(a) * B.BURST.SPEED, life: B.BURST.LIFE, dmg: m.dmg * B.BURST.DMG, kind: 'dark', src: m.pat === 'prison' ? 'boss:prisonShot' : 'boss:burst' });
    }
  }
  // slam / zones: vùng tự nổ trong run.js (updateHazards) đúng lúc hết gồng
  toRecover(m, B, io);
  return true;
}

// M10-03 (bật cờ): vùng mới phải chừa lối thoát (tính cả vùng đang có); tắt cờ = đặt hết như cũ
function placeZones(io, B, player, zs, time) {
  for (const h of io.tactics ? keepEscape(io.map, player, io.hazards, zs, time) : zs) addHazard(io, B, h);
}

const V_AIR = () => BOSS_V2.MINI.LEAP.AIR;
// M10-10 Ma Quang Hoành Tảo: tia (dày W) quét từ góc a0 tới a1 trong tick này có chạm người chơi không
function sweepHits(m, player, a0, a1, S) {
  const dx = player.x - m.x, dy = player.y - m.y, d = Math.hypot(dx, dy);
  if (d > S.L + PLAYER.HITBOX) return false;
  if (d < 10) return true;
  const ap = Math.atan2(dy, dx), wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const lo = Math.min(0, wrap(a1 - a0)), hi = Math.max(0, wrap(a1 - a0)), rel = wrap(ap - a0), pad = Math.atan2(S.W + PLAYER.HITBOX, d);
  return rel >= lo - pad && rel <= hi + pad;
}
// M10-10 Ảnh Độn: điểm hiện ra quanh người chơi (MIN_R..MAX_R), đứng được
function shadowSpot(m, player, io) {
  const S = BOSS_V2.FINAL.SHADOW;
  for (let i = 0; i < S.TRIES; i++) {
    const a = io.rng() * Math.PI * 2, r = S.MIN_R + io.rng() * (S.MAX_R - S.MIN_R);
    const x = player.x + Math.cos(a) * r, y = player.y + Math.sin(a) * r;
    if (io.map.canStand(x, y) && (!io.map.monStand || io.map.monStand(x, y))) return [x, y];
  }
  return null;
}
// M10-09 Vồ Đầu Đàn: dấu đáp ở vị trí dự đoán (giới hạn MAX_LEAD), phải đứng được và còn lối né; vùng nổ = sát thương lúc đáp
function startLeap(m, player, io, B, V) {
  const L = V.LEAP;
  let lx = (m.pvx || 0) * L.LEAD, ly = (m.pvy || 0) * L.LEAD;
  const ll = Math.hypot(lx, ly); if (ll > L.MAX_LEAD) { lx *= L.MAX_LEAD / ll; ly *= L.MAX_LEAD / ll; }
  for (const k of [1, 0.5, 0]) {
    const x = player.x + lx * k, y = player.y + ly * k;
    if (!(io.map.monStand ? io.map.monStand(x, y) : io.map.canStand(x, y))) continue;
    const before = io.hazards.length;
    const T = L.WINDUP + L.AIR + L.SYNC;   // nổ đúng lúc boss chạm đất (boss bắt đầu bay chậm 1 tick sau khi hết gồng)
    placeZones(io, B, player, [{ x, y, r: L.R, t: T, dmg: m.dmg * L.DMG, owner: m, src: 'miniboss:leap' }], T);
    if (io.hazards.length === before) return false;   // bị bỏ vì bịt lối né / đầy vùng
    m.leapX = x; m.leapY = y; windup(m, L.WINDUP);
    return true;
  }
  return false;
}

function addHazard(io, B, h) {
  const V = io.bossV2 && h.owner && BOSS_V2[h.owner.bossKind];   // M10-10: Yêu Vương V2 có thêm dải thập tự
  if (io.hazards.length >= ((V && V.MAX_HAZARDS) || B.MAX_HAZARDS || 12)) return;
  h.max = h.t; io.hazards.push(h);
}

// Kẹt sau cây/đá quá lâu khi đang đuổi -> dịch chuyển tới chỗ đứng được quanh người chơi
function unstick(m, d, dt, io, player) {
  const moved = Math.hypot(m.x - m.lastX, m.y - m.lastY);
  m.lastX = m.x; m.lastY = m.y;
  if (d < 30 || moved > 0.5 * dt * m.speed) { m.stuckT = 0; return false; }
  m.stuckT += dt;
  if (m.stuckT < BOSS.STUCK_TIME) return false;
  m.stuckT = 0;
  for (let i = 0; i < 24; i++) {
    const a = io.rng() * Math.PI * 2, r = BOSS.TELEPORT_R;
    const x = player.x + Math.cos(a) * r, y = player.y + Math.sin(a) * r;
    if (io.map.canStand(x, y)) {
      if (io.tactics) {   // M10-03: báo trước điểm hiện ra (vẽ trong render), chưa dịch chuyển ngay
        m.st = 'blink'; m.stT = m.stMax = TC.BLINK_WARN; m.blinkX = x; m.blinkY = y; m.vx = m.vy = 0;
        io.ev.push({ type: 'pulse', x: m.x, y: m.y, r: 24, color: '#d9a8ff' });
        return true;
      }
      io.ev.push({ type: 'pulse', x: m.x, y: m.y, r: 30, color: '#d9a8ff' });
      m.x = x; m.y = y; m.lastX = x; m.lastY = y;
      io.ev.push({ type: 'pulse', x, y, r: 30, color: '#d9a8ff' });
      return false;
    }
  }
  return false;
}

// Vùng nguy hiểm có cảnh báo: đếm ngược, hết giờ thì nổ một lần
export function updateHazards(scene, player, dt, ev, onHit) {
  const hz = scene.hazards;
  for (let i = hz.length - 1; i >= 0; i--) {
    const h = hz[i];
    h.t -= dt;
    if (h.t > 0) continue;
    hz.splice(i, 1);
    ev.push({ type: 'boom', x: h.x, y: h.y, r: h.r, color: '#c070ff' });
    if (!player.dead && hazardDist(h, player.x, player.y) < h.r) { onHit(h.dmg, h); if (hz.length === 0) return; }   // chết -> endRun đã dọn mảng
  }
}

export function initBoss(m, kind, remix = false) {
  m.remix = !!remix;   // M7-13: có chiêu phối (theo cờ + độ khó, quyết lúc sinh boss)
  m.boss = true; m.bossKind = kind; m.arch = kind === 'MINI' ? 'miniboss' : 'boss';
  m.st = 'move'; m.stT = 0; m.gapT = BOSS[kind].GAP; m.patIdx = 0; m.vuln = 0; m.age = 0;
  m.hitCap = Math.max(1, Math.round(m.max * BOSS.HIT_CAP));
  m.lastX = m.x; m.lastY = m.y; m.stuckT = 0; m.dirX = 1; m.dirY = 0;
  m.hitR = BOSS.BODY.hitR; m.aimY = BOSS.BODY.aimY; m.reach = BOSS.BODY.reach;   // thân to (vẽ ×2)
  return m;
}
