// Boss (M2-02): Lang Vương (mini-boss giữa run) và Ma Ảnh Yêu Vương (boss cuối). Máy trạng thái:
//   move (đuổi, đếm GAP) -> windup (gồng, có cảnh báo) -> [dash ×n] -> recover (sơ hở, nhận thêm sát thương) -> move
// Chiêu chỉ bắt đầu từ 'move'; boss chết thì không còn gì chạy (run.js dọn vùng/đạn). Chỉ dùng io.rng (seed của run).
import { BOSS, RUN, HUB_MONSTER as HM, TACTICS as TC, BOSS_V2, BOSS_P2, BOSS_TK, BOSS_ULT, PLAYER } from '../core/config.js';
import { selectBossSkill, keepEscape, hazardDist } from '../systems/tactics.js';

export const bossDef = m => BOSS[m.bossKind];

// io: { map, shots, hazards, ev, rng, onAttack(m, dmg), summon(m, n, r), player, time }
export function bossAI(m, player, dx, dy, d, dt, io) {
  const B = bossDef(m);
  if (m.vuln > 0) m.vuln -= dt;
  if (m.immT > 0) m.immT -= dt;
  if (m.tkStun && !(m.vuln > 0)) m.tkStun = 0;
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
  }
  // (24/11) chuyển P1 -> P2 đúng một lần, chỉ giữa hai chiêu (không cắt đòn đang ra): biến hình (không nhận sát thương) -> bùng nổ -> sơ hở
  const P = BOSS_P2[m.bossKind];
  if (m.st === 'phase') {
    m.vx = m.vy = 0; m.stT -= dt; m.shield = Math.max(0, m.stT);
    const el = m.stMax - m.stT;
    if (!m.p2Beat && el >= 0.3) { m.p2Beat = true; io.ev.push({ type: 'sfx', name: 'thud' }); }   // nhịp tim thứ hai
    if (!m.p2End && el >= P.T.END) {   // sói dậm đất / ma giơ tay: rung nhẹ
      m.p2End = true; io.ev.push({ type: 'shake', t: 0.2 }, { type: 'pulse', x: m.x, y: m.y, r: 50, color: m.bossKind === 'FINAL' ? '#ff9ad6' : '#e8dcc8' });
      if (m.bossKind === 'MINI') io.ev.push({ type: 'sfx', name: 'land' });
    }
    if (!m.p2Burst && el >= P.T.BURST) {
      m.p2Burst = true;
      io.ev.push({ type: 'announce', x: m.x, y: m.y, text: V ? V.P2_TEXT : P.TEXT, color: m.bossKind === 'FINAL' ? '#ff9ad6' : '#ff8a5a' },
        { type: 'shake', t: 0.5 }, { type: 'boom', x: m.x, y: m.y - 20, r: 70, color: m.bossKind === 'FINAL' ? '#e070ff' : '#ff7a3a' },
        { type: 'pulse', x: m.x, y: m.y - 10, r: 120, color: m.bossKind === 'FINAL' ? '#ff9ad6' : '#ffd978' }, { type: 'sfx', name: m.bossKind === 'FINAL' ? 'roar' : 'howl' });
    }
    if (m.stT <= 0) { const st = V ? V.STAGGER : P.STAGGER; m.shield = 0; m.st = 'recover'; m.stT = st; m.vuln = st; }
    return true;
  }
  const p2now = V ? phase2 : m.hp <= m.max * P.AT;
  if (p2now && m.hp > 0 && !m.p2 && (m.st === 'move' || m.st === 'recover')) {
    m.p2 = true; m.st = 'phase'; m.stT = m.stMax = P.ANIM; m.shield = P.ANIM; m.vx = m.vy = 0; m.p2Burst = m.p2Beat = m.p2End = false;
    io.ev.push({ type: 'shake', t: 0.25 }, { type: 'sfx', name: 'bossPhase' }, { type: 'sfx', name: 'thud' }, { type: 'bossPhase2', kind: m.bossKind, x: m.x, y: m.y });   // M10-11: tiếng chuyển pha
    return true;
  }

  // (24/11) TUYỆT KỸ miễn nhiễm theo mốc máu (BOSS_TK): bật khiên -> chuỗi chiêu cố định phải né hết -> khiên vỡ, choáng
  const TK = V && BOSS_TK[m.bossKind];
  if (m.st === 'tkOn' || m.st === 'tkGap') {
    m.stT -= dt;
    if (m.st === 'tkGap' && m.tk.chase && d > 40) { m.vx = dx / d * m.speed * 1.3; m.vy = dy / d * m.speed * 1.3; } else m.vx = m.vy = 0;   // sói áp sát giữa các đòn
    if (m.stT > 0) return true;
    if (m.st === 'tkGap' && io.hazards.some(h => h.owner === m)) return true;   // (24/11) chờ vùng nổ của chiêu trước nổ hết: từng nhịp rõ ràng, không chồng đòn
    return tkNext(m, player, dx, dy, d, io, B, V, phase2);
  }
  if (TK && m.hp > 0 && !m.tk && (m.st === 'move' || m.st === 'recover')) {
    m.tkDone = m.tkDone || {};
    const mk = TK.MARKS.find(k => !m.tkDone[k.AT] && m.hp <= m.max * k.AT && (k.P2 ? m.p2 : !m.p2));
    if (mk) {
      m.tkDone[mk.AT] = true;
      m.tk = { seq: mk.SEQ, i: 0, chase: !!TK.CHASE, at: mk.AT };
      m.st = 'tkOn'; m.stT = m.stMax = BOSS_TK.START; m.shield = BOSS_TK.SHIELD ? 1e9 : 0; m.vuln = 0; m.vx = m.vy = 0;
      io.ev.push({ type: 'announce', x: m.x, y: m.y, text: TK.TEXT.replace(' — ', (mk.SUFFIX || '') + ' — '), color: TK.COLOR }, { type: 'shake', t: 0.3 },
        { type: 'pulse', x: m.x, y: m.y - 14, r: 70, color: TK.COLOR }, { type: 'sfx', name: m.bossKind === 'FINAL' ? 'roar' : 'howl' }, { type: 'tkStart', kind: m.bossKind, x: m.x, y: m.y });
      if (io.log) io.log(m.bossKind, 'tk' + Math.round(mk.AT * 100));
      return true;
    }
  }

  // (24/11) TUYỆT CHIÊU: pha 2, giữa hai chiêu, không trùng Tuyệt Kỹ; tối đa MAX lần, hồi CD giây
  const UL = V && BOSS_ULT[m.bossKind];
  if (m.st === 'ult') { m.vx = m.vy = 0; return updateUlt(m, player, dt, io, B, UL); }
  if (UL && m.p2 && m.hp > 0 && !m.tk && (m.st === 'move' || m.st === 'recover') && (m.ultN || 0) < UL.MAX
    && m.hp <= m.max * UL.AT && m.age - (m.ultAt ?? -1e9) >= UL.CD) {
    if (startUlt(m, player, io, UL)) return true;
    m.ultAt = m.age - UL.CD + 3;   // không dựng được vòng (sát vật cản): thử lại sau 3 s
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
    if (m.stT <= 0) { m.swEnd = m.swA0 + m.swDir * S.ARC; m.swDirPrev = m.swDir; toRecover(m, B, io); }   // nhịp 2 Diệt Thế Ma Quang quét ngược từ đây
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
  return startPattern(m, pat, player, dx, dy, d, io, B, V, phase2);
}

// ---------- (24/11) TUYỆT CHIÊU (ultimate) mỗi boss — docs/design/BOSS_TUYET_KY_DE_XUAT.md ----------
// Lang Vương "Vạn Lang Ảnh Sát Trận": vòng 8 sói (1 boss thật + 7 phân thân cùng cỡ) nhốt người chơi, từng đợt lao xuyên vòng
// (dải có vệt báo); đợt cuối boss thật cũng lao. Né = đọc hướng lao, bước ngang.
// Yêu Vương "U Minh Vạn Nhãn Kiếp" (làm lại 24/11 cho khác hẳn sói): bóng tối (render), mắt đỏ mở trong bóng tối, 0,3 s sau
// KHÓA chỗ người chơi đứng -> vòng tròn ma trảo trồi lên từ đất ở đó. Né = bước ra khỏi vòng (không phải né đường thẳng);
// có đợt mở vùng sáng phụ làm chỗ trú. Kịch bản = danh sách sự kiện sinh sẵn (tất định theo io.rng). Boss VẪN nhận sát thương.
// Mở đầu: sự kiện bossUlt -> main.js chiếu cutscene ngắn (CUTSCENE.*_ULT), trận đứng yên trong lúc chiếu.
const ULT_WOLF = [   // [giây, phân thân k (góc k·45° + gốc; k = 0 là BOSS THẬT), đích (k + 4 = xuyên tâm, khác = dây cung), báo trước, tốc độ]
  [1.2, 2, 6, 0.95], [2.7, 1, 5, 0.9], [3.1, 3, 7, 0.9], [4.2, 2, 6, 0.85], [4.6, 4, 8, 0.85],
  [5.7, 5, 8, 0.8], [6.1, 1, 4, 0.8], [6.5, 3, 6, 0.8], [7.2, 2, 7, 0.8], [7.6, 0, 4, 0.8], [8.0, 6, 10, 0.75, 1600],
];
const ULT_CLAW = [   // [giây, báo trước, bù vị trí so với chỗ khóa [dx, dy] (khung xoay ngẫu nhiên), có vùng sáng phụ]
  [1.2, 1.2, [0, 0]],
  [2.9, 1.1, [0, 0]], [3.35, 1.1, [0, 0]],
  [4.6, 1.0, [-22, 0]], [4.6, 1.0, [22, 0]], [5.1, 1.0, [0, 0]],
  [6.3, 1.1, [0, 0]], [6.3, 1.1, [34, 26]], [6.3, 1.1, [34, -26]], [6.3, 0, null, 'light'],
  [8.0, 0.9, [0, 0]], [8.35, 0.9, [0, 0]], [8.7, 0.9, [0, 0]], [9.05, 0.9, [0, 0]],
];
function startUlt(m, player, io, U) {
  const u = { t: 0, a0: io.rng() * Math.PI * 2, ev: [], i: 0, clones: [], dashes: [], eyes: [], claws: [], lights: [], R: U.R };
  if (m.bossKind === 'MINI') {   // tâm vòng = người chơi; thu nhỏ vòng nếu sói rơi vào chỗ không đứng được
    let s = 1;   // vòng bầu dục R × RY; thu nhỏ đều nếu sói rơi ra ngoài bản đồ
    for (; s >= 0.5; s -= 0.08) {
      let ok = true;
      for (let k = 0; k < 8 && ok; k++) { const a = u.a0 + k * Math.PI / 4, x = player.x + Math.cos(a) * U.R * s, y = player.y + Math.sin(a) * U.RY * s; ok = x > 24 && y > 40 && x < (io.map.pw || 1e9) - 24 && y < (io.map.ph || 1e9) - 16; }   // sói bóng đè lên cây được: chỉ cần trong bản đồ
      if (ok) break;
    }
    if (s < 0.5) return false;
    u.R = U.R * s; u.RY = U.RY * s; u.cx = player.x; u.cy = player.y;
    for (let k = 0; k < 8; k++) { const a = u.a0 + k * Math.PI / 4; u.clones.push({ x: u.cx + Math.cos(a) * u.R, y: u.cy + Math.sin(a) * u.RY, a, hot: -1, real: k === 0 }); }
    m.x = m.lastX = u.clones[0].x; m.y = m.lastY = u.clones[0].y;   // boss thật vào vị trí 0 trên vòng (giữa đám phân thân)
    for (const [at, k, to, tele, sp] of ULT_WOLF) u.ev.push({ at, kind: 'dash', k: k % 8, to: to % 8, tele, sp: sp || U.SPEED });
  } else {
    for (const [at, tele, off, light] of ULT_CLAW) u.ev.push({ at, kind: light ? 'light' : 'eye', tele, off });
  }
  u.ev.sort((a, b) => a.at - b.at);
  m.ult = u; m.st = 'ult'; m.vx = m.vy = 0; m.vuln = 0;
  io.ev.push({ type: 'announce', x: m.x, y: m.y, text: U.NAME + ' — HÃY NÉ!', color: U.COLOR }, { type: 'shake', t: 0.3 },
    { type: 'ultStart', kind: m.bossKind }, { type: 'bossUlt', kind: m.bossKind });
  if (io.log) io.log(m.bossKind, 'ult');
  return true;
}
function updateUlt(m, player, dt, io, B, U) {
  const u = m.ult; u.t += dt;
  if (m.bossKind === 'MINI') {
    const dx = player.x - u.cx, dy = player.y - u.cy, q = Math.hypot(dx / u.R, dy / u.RY), lim = 1 - 10 / u.RY;   // vòng vây bầu dục: chạm biên bị đẩy vào trong
    if (q > lim && u.t < U.DUR - 1.2) { player.x = u.cx + dx / q * lim; player.y = u.cy + dy / q * lim; }
    for (const ds of u.dashes) if (ds.k === 0 && u.t >= ds.fire) {   // boss thật lao thật (thân di chuyển), xong đứng ở đầu kia
      const k = Math.min(1, (u.t - ds.fire) / ds.dur); m.x = ds.x0 + (ds.x1 - ds.x0) * k; m.y = ds.y0 + (ds.y1 - ds.y0) * k; m.lastX = m.x; m.lastY = m.y;
      m.dirX = Math.sign(ds.x1 - ds.x0) || 1;
    }
  }
  while (u.i < u.ev.length && u.ev[u.i].at <= u.t) {
    const e = u.ev[u.i++], late = u.t - e.at;
    if (e.kind === 'dash') {   // sói k lao tới phía đối diện (qua tâm hoặc dây cung), dải rộng W
      const c = u.clones[e.k], to = u.clones[e.to], ux = to.x - c.x, uy = to.y - c.y, l = Math.hypot(ux, uy) || 1, ex = to.x + ux / l * 16, ey = to.y + uy / l * 16;
      addHazard(io, B, { x: (c.x + ex) / 2, y: (c.y + ey) / 2, x0: c.x, y0: c.y, x1: ex, y1: ey, r: U.W / 2, t: e.tele - late, dmg: m.dmg * U.DMG, owner: m, src: 'miniboss:ult', color: U.COLOR });
      const dur = (l + 16) / e.sp;   // (25/11) lướt cực nhanh; sói qua GIỮA đường đúng lúc dải gây sát thương (hình khớp đòn)
      c.hot = u.t + e.tele - late; u.dashes.push({ x0: c.x, y0: c.y, x1: ex, y1: ey, fire: c.hot - dur / 2, hit: c.hot, dur, k: e.k });
      io.ev.push({ type: 'sfx', name: 'bossWarn' });
    } else if (e.kind === 'eye') {   // mắt mở ngoài vùng sáng; khóa vị trí sau LOCK giây
      const a = u.a0 + u.eyes.length * 2.4, r = U.EYE_R[0] + io.rng() * (U.EYE_R[1] - U.EYE_R[0]);
      u.eyes.push({ x: player.x + Math.cos(a) * r, y: player.y + Math.sin(a) * r, open: u.t, lockAt: u.t + U.LOCK - late, fire: u.t + e.tele - late, off: e.off, rot: u.a0 + io.rng() * 0.6, locked: false });
      io.ev.push({ type: 'sfx', name: 'eyes' });
    } else if (e.kind === 'light') {   // vùng sáng phụ: chỗ trú (không có ma trảo của đợt này), xa các vùng sắp nổ
      const a = u.a0 + Math.PI + 0.3, x = player.x + Math.cos(a) * U.LIGHT2_D, y = player.y + Math.sin(a) * U.LIGHT2_D;
      u.lights.push({ x, y, r: U.LIGHT2_R, from: u.t, until: u.t + 1.6 });
    }
  }
  for (const eye of u.eyes) if (!eye.locked && u.t >= eye.lockAt) {   // khóa: vòng ma trảo tại chỗ người chơi (+ bù theo khung xoay)
    eye.locked = true;
    const [ox, oy] = eye.off, c = Math.cos(eye.rot), s = Math.sin(eye.rot);
    let x = player.x + ox * c - oy * s, y = player.y + ox * s + oy * c;
    for (const l of u.lights) {   // (25/11) chỗ trú phải an toàn thật: vòng ma trảo không được chạm vùng sáng phụ
      const ddx = x - l.x, ddy = y - l.y, dd = Math.hypot(ddx, ddy), min = l.r + U.CLAW_R + PLAYER.HITBOX + 2;
      if (dd < min) { const a = dd > 0.5 ? Math.atan2(ddy, ddx) : u.a0; x = l.x + Math.cos(a) * min; y = l.y + Math.sin(a) * min; }
    }
    eye.zx = x; eye.zy = y;
    addHazard(io, B, { x, y, r: U.CLAW_R, t: Math.max(0.1, eye.fire - u.t), dmg: m.dmg * U.DMG, owner: m, src: 'boss:ultEye', color: U.COLOR });
  }
  for (const eye of u.eyes) if (eye.locked && !eye.clawed && u.t >= eye.fire) { eye.clawed = true; u.claws.push({ x: eye.zx, y: eye.zy, at: u.t }); }
  u.eyes = u.eyes.filter(e => u.t < e.fire + 0.35);
  u.claws = u.claws.filter(c => u.t < c.at + 0.5);
  u.lights = u.lights.filter(l => u.t < l.until);
  if (u.t >= U.DUR) {   // kết thúc: tan vòng / sáng lại, boss choáng (sơ hở)
    m.ult = null; m.st = 'recover'; m.stT = U.STUN; m.vuln = U.STUN; m.ultN = (m.ultN || 0) + 1; m.ultAt = m.age;
    io.ev.push({ type: 'announce', x: m.x, y: m.y, text: 'Phá giải! — TẤN CÔNG!', color: '#ffe066' }, { type: 'ultEnd', kind: m.bossKind, x: m.x, y: m.y }, { type: 'shake', t: 0.25 });
  }
  return true;
}

// ---------- (24/11) ĐỢT 2: chiêu pha 2 (docs/design/BOSS_TUYET_KY_DE_XUAT.md) ----------
// Phần lớn dựng từ vùng nổ có cảnh báo (tròn / dải / vành-cung) nổ lệch giờ; chiêu liên hoàn chạy bằng bộ chuỗi của Tuyệt Kỹ (quiet).
const unitV = (dx, dy) => { const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
const zSeg = (x0, y0, x1, y1, w, t, dmg, m, src, color) => ({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, x0, y0, x1, y1, r: w, t, dmg, owner: m, src, color });
const zRing = (x, y, R, w, a0, span, t, dmg, m, src, color) => ({ ring: true, x, y, R, r: w, a0, span, t, dmg, owner: m, src, color });
function chain(m, label, seq, gap, chase, player, dx, dy, d, io, B, V, phase2) {
  m.tk = { seq, i: 0, quiet: true, chase, gap, label };
  return tkNext(m, player, dx, dy, d, io, B, V, phase2);
}
function comboClawAt(m, dx, dy, off, wt) {   // quạt lệch trái / phải (dùng hình học Liệt Trảo)
  const [ux, uy] = unitV(dx, dy), c = Math.cos(off), s = Math.sin(off);
  m.pat = 'claw'; m.dirX = ux * c - uy * s; m.dirY = ux * s + uy * c; windup(m, wt); return true;
}
const P2_PATS = {
  // ---- Lang Vương ----
  bloodDash(m, player, dx, dy, d, io, B, V) {   // Huyết Ảnh Tam Xung
    m.pat = 'dash'; m.patLabel = 'bloodDash'; m.dashLeft = V.BLOOD_DASH.COUNT; m.dashWind = V.BLOOD_DASH.WINDUP; aimDash(m, player, B); return true;
  },
  comboClaw(m, player, dx, dy, d, io, B, V, phase2) { return chain(m, 'comboClaw', [['clawL'], ['clawR'], ['bite']], V.COMBO.GAP, true, player, dx, dy, d, io, B, V, phase2); },
  clawL(m, player, dx, dy, d, io, B, V) { return comboClawAt(m, dx, dy, V.COMBO.L, V.COMBO.WL); },
  clawR(m, player, dx, dy, d, io, B, V) { return comboClawAt(m, dx, dy, V.COMBO.R, V.COMBO.WR); },
  bite(m, player, dx, dy, d, io, B, V) {   // nhát cắn trước mặt kết thúc chuỗi
    const C = V.COMBO, [ux, uy] = unitV(dx, dy);
    placeZones(io, B, player, [{ x: m.x + ux * C.BITE_D, y: m.y + uy * C.BITE_D, r: C.BITE_R, t: C.BITE_T, dmg: m.dmg * C.BITE_DMG, owner: m, src: 'miniboss:bite' }], C.BITE_T);
    windup(m, C.BITE_T); return true;
  },
  quake(m, player, dx, dy, d, io, B, V) {   // Huyết Nguyệt Trấn Địa: vòng sóng nổ dần ra, khe lệch khỏi hướng người chơi
    const Q = V.QUAKE, ap = Math.atan2(dy, dx), gc = ap + (io.rng() < 0.5 ? -1 : 1) * (0.9 + io.rng() * 0.6), zs = [];
    for (let i = 0; i < Q.N; i++) zs.push(zRing(m.x, m.y, Q.R0 + i * Q.STEP, Q.W, gc + Q.GAP / 2, Math.PI * 2 - Q.GAP, Q.T0 + i * Q.DT, m.dmg * Q.DMG, m, 'miniboss:quake', '#ff6a3a'));
    placeZones(io, B, player, zs, Q.T0); windup(m, Q.WINDUP);
    io.ev.push({ type: 'shake', t: 0.15 }); return true;
  },
  hunt(m, player, dx, dy, d, io, B, V, phase2) { return chain(m, 'hunt', [['leap'], ['leap']], V.HUNT.GAP, false, player, dx, dy, d, io, B, V, phase2); },
  cracks(m, player, dx, dy, d, io, B, V) {   // Huyết Trảo Phá Địa: 3 vệt nứt hình quạt nổ lần lượt
    const K = V.CRACKS, ap = Math.atan2(dy, dx), side = io.rng() < 0.5 ? -1 : 1, zs = [];
    for (let i = 0; i < K.N; i++) {
      const a = ap + side * (i - (K.N - 1) / 2) * K.SPREAD, c = Math.cos(a), s = Math.sin(a);
      zs.push(zSeg(m.x + c * 18, m.y + s * 18, m.x + c * K.L, m.y + s * K.L, K.W, K.T0 + i * K.DT, m.dmg * K.DMG, m, 'miniboss:cracks', '#ff5a3a'));
    }
    placeZones(io, B, player, zs, K.T0); windup(m, K.T0); return true;
  },
  rageHowl(m, player, dx, dy, d, io, B, V) {   // Cuồng Lang Bạo Khiếu: vòng nổ lớn quanh thân
    const H = V.RAGE_HOWL;
    addHazard(io, B, { x: m.x, y: m.y, r: H.R, t: H.T, dmg: m.dmg * H.DMG, owner: m, src: 'miniboss:rageHowl', color: '#ffb050' });
    windup(m, H.T); return true;
  },
  // ---- Ma Ảnh Yêu Vương / Huyết Lôi Ma Quân ----
  thunder(m, player, dx, dy, d, io, B, V) {   // Huyết Lôi Thiên Phạt: điểm đầu ngay chỗ người chơi, 3 điểm quanh đó nổ tiếp
    const T = V.THUNDER, a0 = io.rng() * Math.PI * 2, zs = [{ x: player.x, y: player.y, r: T.R, t: T.T0, dmg: m.dmg * T.DMG, owner: m, src: 'boss:thunder', color: '#ff4a6a' }];
    for (let k = 1; k < T.N; k++) { const a = a0 + k * Math.PI * 2 / (T.N - 1); zs.push({ x: player.x + Math.cos(a) * T.SPREAD, y: player.y + Math.sin(a) * T.SPREAD, r: T.R, t: T.T0 + k * T.DT, dmg: m.dmg * T.DMG, owner: m, src: 'boss:thunder', color: '#ff4a6a' }); }
    placeZones(io, B, player, zs, T.T0); windup(m, T.T0); return true;
  },
  eight(m, player, dx, dy, d, io, B, V) {   // Ma Lôi Bát Phương: 8 tia sét tỏa từ boss, lệch nửa khe khỏi người chơi
    const E = V.EIGHT, a0 = Math.atan2(dy, dx) + Math.PI / E.N, zs = [];
    for (let i = 0; i < E.N; i++) { const a = a0 + i * Math.PI * 2 / E.N, c = Math.cos(a), s = Math.sin(a); zs.push(zSeg(m.x + c * 16, m.y + s * 16, m.x + c * E.L, m.y + s * E.L, E.W, E.T, m.dmg * E.DMG, m, 'boss:eight', '#ff6a8a')); }
    placeZones(io, B, player, zs, E.T); windup(m, E.T); return true;
  },
  runes(m, player, dx, dy, d, io, B, V) {   // Nghịch Chuyển Ma Trận: vành quanh boss chia N cung, nổ lần lượt theo chiều quay
    const R = V.RUNES, span = Math.PI * 2 / R.N, dir = io.rng() < 0.5 ? 1 : -1, a0 = Math.atan2(dy, dx) - span / 2, zs = [];
    for (let k = 0; k < R.N; k++) zs.push(zRing(m.x, m.y, R.R, R.W, a0 + dir * k * span, span - 0.02, R.T0 + k * R.DT, m.dmg * R.DMG, m, 'boss:runes', '#e070ff'));
    placeZones(io, B, player, zs, R.T0); windup(m, R.T0); return true;
  },
  chainBolt(m, player, dx, dy, d, io, B, V) {   // Huyết Lôi Liên Tỏa: đường sét gấp khúc cắt ngang chỗ người chơi
    const C = V.CHAIN, [ux, uy] = unitV(dx, dy), px = -uy, py = ux, pts = [], zs = [];
    for (let k = 0; k <= C.N; k++) { const s = (k - C.N / 2) * C.STEP, z = (k % 2 ? 1 : -1) * C.ZIG; pts.push([player.x + px * s + ux * z, player.y + py * s + uy * z]); }
    for (let k = 0; k < C.N; k++) zs.push(zSeg(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], C.W, C.T, m.dmg * C.DMG, m, 'boss:chainBolt', '#ff5a7a'));
    placeZones(io, B, player, zs, C.T); windup(m, C.T); return true;
  },
  clones(m, player, dx, dy, d, io, B, V) {   // Ma Ảnh Phân Thân: 2 bóng hai bên người chơi (boss thật đứng yên gồng)
    const C = V.CLONES, [ux, uy] = unitV(dx, dy), out = [];
    for (const sgn of [1, -1]) { const x = player.x - uy * C.D * sgn, y = player.y + ux * C.D * sgn; if (io.map.canStand(x, y)) out.push({ x, y }); }
    if (!out.length) { m.pat = 'burst'; windup(m, B.BURST.WINDUP); m.burstN = B.BURST.N2; m.burstA0 = io.rng() * Math.PI * 2 / m.burstN; return true; }
    m.clones = out; for (const c of out) io.ev.push({ type: 'pulse', x: c.x, y: c.y, r: 30, color: '#d9a8ff' });
    windup(m, C.T); return true;
  },
  doubleSweep(m, player, dx, dy, d, io, B, V, phase2) { return chain(m, 'doubleSweep', [['sweep'], ['sweepBack']], V.SWEEP2.GAP, false, player, dx, dy, d, io, B, V, phase2); },
  sweepBack(m, player, dx, dy, d, io, B, V) {   // nhịp 2: quét tiếp nửa vòng còn lại, cùng chiều, bắt đầu từ chỗ vừa dừng
    m.pat = 'sweep'; m.swA0 = m.swEnd ?? Math.atan2(dy, dx); m.swDir = m.swDirPrev || 1; m.swK = 0; m.dashHit = false;
    windup(m, V.SWEEP2.WINDUP); return true;
  },
  net(m, player, dx, dy, d, io, B, V) {   // Huyết Lôi Thiên Võng: dải sét song song vuông góc hướng boss->người chơi, nổ lần lượt từ phía boss ra
    const N = V.NET, [ux, uy] = unitV(dx, dy), px = -uy, py = ux, zs = [], off0 = (io.rng() - 0.5) * N.SPACING * 0.5;
    for (let k = 0; k < N.N; k++) {
      const o = (k - (N.N - 1) / 2) * N.SPACING + off0, cx = player.x + ux * o, cy = player.y + uy * o;
      zs.push(zSeg(cx - px * N.L / 2, cy - py * N.L / 2, cx + px * N.L / 2, cy + py * N.L / 2, N.W, N.T0 + k * N.DT, m.dmg * N.DMG, m, 'boss:net', '#ff4a5a'));
    }
    placeZones(io, B, player, zs, N.T0); windup(m, N.T0); return true;
  },
};

// Tuyệt Kỹ: chiêu kế trong chuỗi; hết chuỗi -> chờ đạn/vùng cuối tan (END) -> khiên vỡ, choáng STUN (sơ hở, nhận thêm sát thương)
function tkNext(m, player, dx, dy, d, io, B, V, phase2) {
  const TK = BOSS_TK[m.bossKind], tk = m.tk;
  if (tk.i < tk.seq.length) {
    const [pat, n] = tk.seq[tk.i++];
    startPattern(m, pat, player, dx, dy, d, io, B, V, phase2, n);   // Vồ không đặt được dấu -> lao (như chiêu thường)
    if (m.st !== 'windup' && m.st !== 'blink') { m.st = 'tkGap'; m.stT = 0.2; }   // chiêu không ra được -> sang chiêu kế
    return true;
  }
  if (!BOSS_TK.SHIELD || tk.quiet) { m.tk = null; toRecover(m, B, io); return true; }   // không khiên: hết chuỗi -> sơ hở bình thường
  if (!tk.ending) { tk.ending = true; m.st = 'tkGap'; m.stT = m.stMax = TK.END; m.vx = m.vy = 0; tk.chase = false; return true; }
  m.tk = null; m.shield = 0;
  m.st = 'recover'; m.stT = TK.STUN; m.vuln = TK.STUN; m.tkStun = TK.STUN;
  io.ev.push({ type: 'announce', x: m.x, y: m.y, text: 'KHIÊN VỠ — TẤN CÔNG!', color: '#ffe066' }, { type: 'shake', t: 0.35 },
    { type: 'boom', x: m.x, y: m.y - 20, r: 60, color: TK.COLOR }, { type: 'sfx', name: 'shatter' }, { type: 'tkBreak', kind: m.bossKind, x: m.x, y: m.y });
  return true;
}

// Bắt đầu một chiêu (gọi từ 'move' và từ chuỗi Tuyệt Kỹ). n: số lần lao (Tuyệt Kỹ đặt riêng).
function startPattern(m, pat, player, dx, dy, d, io, B, V, phase2, n) {
  if (pat === 'leap' && !startLeap(m, player, io, B, V)) pat = 'dash';   // không có dấu đáp hợp lệ / hết lối né -> lao thường
  if (!pat) { m.gapT = 0.4; return true; }
  if (V) { m.v2 = true; io.ev.push({ type: 'sfx', name: 'bossWarn' }); }   // M10-11: tiếng báo boss ra chiêu (khoảng nghỉ 0,8 s trong sfx.js)   // M10-03: chưa có chiêu hợp lệ -> đuổi tiếp, xét lại sau
  m.pat = pat; m.patLabel = (m.tk && m.tk.label) || null;   // (24/11) tên hiển thị của chiêu liên hoàn
  if (io.log) io.log(m.bossKind, pat);   // M10: telemetry chiêu boss (cả AI cũ và mới)
  if (P2_PATS[pat]) return P2_PATS[pat](m, player, dx, dy, d, io, B, V, phase2);   // (24/11) đợt 2: chiêu pha 2 mới
  if (pat === 'dash') { m.dashLeft = n || B.DASH.COUNT; m.dashWind = 0; aimDash(m, player, B); }
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
  windup(m, m.dashWind || B.DASH.WINDUP);
}
function toRecover(m, B, io) {
  if (m.tk) { m.st = 'tkGap'; m.stT = m.stMax = m.tk.gap ?? BOSS_TK.GAP; m.vx = m.vy = 0; return; }   // Tuyệt Kỹ / chiêu liên hoàn: không sơ hở giữa chuỗi
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
  if (m.pat === 'clones') {   // (24/11) Ma Ảnh Phân Thân: mỗi bóng bắn một vòng đạn tỏa (khe giữa các viên), rồi tan
    const C = BOSS_V2.FINAL.CLONES;
    for (const c of m.clones || []) {
      const a0 = io.rng() * Math.PI * 2 / C.SHOTS;
      io.ev.push({ type: 'pulse', x: c.x, y: c.y - 10, r: 26, color: '#d9a8ff' });
      for (let i = 0; i < C.SHOTS; i++) {
        if (io.shots.length >= RUN.MAX_ENEMY_SHOTS) break;
        const a = a0 + i * Math.PI * 2 / C.SHOTS;
        io.shots.push({ x: c.x, y: c.y - 10, vx: Math.cos(a) * B.BURST.SPEED, vy: Math.sin(a) * B.BURST.SPEED, life: B.BURST.LIFE, dmg: m.dmg * C.DMG, kind: 'dark', src: 'boss:clones' });
      }
    }
    m.clones = null; toRecover(m, B, io); return true;
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
    if (h.ring) ev.push({ type: 'pulse', x: h.x, y: h.y, r: h.R + h.r, color: h.color || '#ff6a6a' });   // vành / cung nổ
    else ev.push({ type: 'boom', x: h.x, y: h.y, r: h.r, color: h.color || '#c070ff' });
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
