// Boss (M2-02): Lang Vương (mini-boss giữa run) và Ma Ảnh Yêu Vương (boss cuối). Máy trạng thái:
//   move (đuổi, đếm GAP) -> windup (gồng, có cảnh báo) -> [dash ×n] -> recover (sơ hở, nhận thêm sát thương) -> move
// Chiêu chỉ bắt đầu từ 'move'; boss chết thì không còn gì chạy (run.js dọn vùng/đạn). Chỉ dùng io.rng (seed của run).
import { BOSS, RUN, HUB_MONSTER as HM } from '../core/config.js';

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
  const phase2 = m.bossKind === 'FINAL' && m.hp <= m.max * B.PHASE2;

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
  if (m.st === 'rest') {           // nghỉ ngắn giữa các lần lao: gồng lại, nhắm lại
    m.vx = m.vy = 0; m.stT -= dt;
    if (m.stT <= 0) aimDash(m, player, B);
    return true;
  }
  if (m.st === 'recover') {
    m.vx = m.vy = 0; m.stT -= dt;
    if (m.stT <= 0) { m.st = 'move'; m.gapT = B.GAP * (m.enraged ? B.ENRAGE_GAP : phase2 ? B.PHASE2_GAP : 1); }
    return true;
  }

  // move: đuổi; cắn khi sát; hết GAP thì ra chiêu
  m.vx = dx / d * m.speed; m.vy = dy / d * m.speed;
  if (d < HM.ATTACK_RANGE + (m.reach || 6)) { m.vx = m.vy = 0; if (m.atkCd <= 0) { m.atkCd = HM.ATTACK_CD; io.onAttack(m, m.dmg); } }
  unstick(m, d, dt, io, player);
  m.gapT -= dt;
  if (m.gapT > 0) return true;
  const pat = pickPattern(m, B, d);
  m.pat = pat;
  if (pat === 'dash') { m.dashLeft = B.DASH.COUNT; aimDash(m, player, B); }
  else if (pat === 'howl' || pat === 'howlDash') windup(m, B.HOWL.WINDUP);
  else if (pat === 'prison') {   // M7-13 Ma Ảnh Lao Tù: vòng vùng nổ quanh người chơi + đạn thưa khi nổ
    const P = B.REMIX.PRISON;
    windup(m, P.WINDUP);
    m.burstN = P.BURST_N; m.burstA0 = io.rng() * Math.PI * 2 / m.burstN;
    const a0 = io.rng() * Math.PI * 2;
    for (let i = 0; i < P.N; i++) {
      const a = a0 + i * Math.PI * 2 / P.N;
      addHazard(io, B, { x: player.x + Math.cos(a) * P.RING, y: player.y + Math.sin(a) * P.RING, r: P.R, t: P.WINDUP, dmg: m.dmg * P.DMG, owner: m, src: 'boss:prison' });
    }
  }
  else if (pat === 'slam') {
    windup(m, B.SLAM.WINDUP);
    addHazard(io, B, { x: m.x, y: m.y, r: B.SLAM.R, t: B.SLAM.WINDUP, dmg: m.dmg * B.SLAM.DMG, owner: m, src: 'boss:slam' });
  } else if (pat === 'burst') {
    windup(m, B.BURST.WINDUP);
    m.burstN = phase2 ? B.BURST.N2 : B.BURST.N; m.burstA0 = io.rng() * Math.PI * 2 / m.burstN;
  } else if (pat === 'zones') {
    windup(m, B.ZONES.WINDUP);
    const n = phase2 ? B.ZONES.N2 : B.ZONES.N;
    for (let i = 0; i < n; i++) {
      const a = io.rng() * Math.PI * 2, r = i === 0 ? 0 : B.ZONES.SPREAD * (0.5 + io.rng() * 0.6);
      addHazard(io, B, { x: player.x + Math.cos(a) * r, y: player.y + Math.sin(a) * r, r: B.ZONES.R, t: B.ZONES.WINDUP, dmg: m.dmg * B.ZONES.DMG, owner: m, src: 'boss:zone' });
    }
  }
  return true;
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
  if (m.pat === 'howlDash') {   // M7-13: hú xong -> chuỗi lao (mỗi cú vẫn gồng + cảnh báo đường lao)
    io.summon(m, B.HOWL.N, B.HOWL.R);
    io.ev.push({ type: 'pulse', x: m.x, y: m.y, r: 60, color: '#ffd978' });
    m.pat = 'dash'; m.dashLeft = B.REMIX.HOWL_DASH.COUNT; aimDash(m, player, B);
    return true;
  }
  if (m.pat === 'howl') {
    io.summon(m, B.HOWL.N, B.HOWL.R);
    io.ev.push({ type: 'pulse', x: m.x, y: m.y, r: 60, color: '#ffd978' });
  } else if (m.pat === 'burst' || m.pat === 'prison') {
    for (let i = 0; i < m.burstN; i++) {
      if (io.shots.length >= RUN.MAX_ENEMY_SHOTS) break;
      const a = m.burstA0 + i * Math.PI * 2 / m.burstN;
      io.shots.push({ x: m.x, y: m.y - 10, vx: Math.cos(a) * B.BURST.SPEED, vy: Math.sin(a) * B.BURST.SPEED, life: B.BURST.LIFE, dmg: m.dmg * B.BURST.DMG, kind: 'dark' });
    }
  }
  // slam / zones: vùng tự nổ trong run.js (updateHazards) đúng lúc hết gồng
  toRecover(m, B, io);
  return true;
}

function addHazard(io, B, h) {
  if (io.hazards.length >= (B.MAX_HAZARDS || 12)) return;
  h.max = h.t; io.hazards.push(h);
}

// Kẹt sau cây/đá quá lâu khi đang đuổi -> dịch chuyển tới chỗ đứng được quanh người chơi
function unstick(m, d, dt, io, player) {
  const moved = Math.hypot(m.x - m.lastX, m.y - m.lastY);
  m.lastX = m.x; m.lastY = m.y;
  if (d < 30 || moved > 0.5 * dt * m.speed) { m.stuckT = 0; return; }
  m.stuckT += dt;
  if (m.stuckT < BOSS.STUCK_TIME) return;
  m.stuckT = 0;
  for (let i = 0; i < 24; i++) {
    const a = io.rng() * Math.PI * 2, r = BOSS.TELEPORT_R;
    const x = player.x + Math.cos(a) * r, y = player.y + Math.sin(a) * r;
    if (io.map.canStand(x, y)) {
      io.ev.push({ type: 'pulse', x: m.x, y: m.y, r: 30, color: '#d9a8ff' });
      m.x = x; m.y = y; m.lastX = x; m.lastY = y;
      io.ev.push({ type: 'pulse', x, y, r: 30, color: '#d9a8ff' });
      return;
    }
  }
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
    if (!player.dead && Math.hypot(player.x - h.x, player.y - h.y) < h.r) { onHit(h.dmg, h); if (hz.length === 0) return; }   // chết -> endRun đã dọn mảng
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
