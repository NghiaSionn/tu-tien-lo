// Hành vi kiểu quái trong bí cảnh (M2-01). Mọi đòn nguy hiểm đều có pha gồng (st = 'windup') để renderer vẽ cảnh báo
// trước khi đánh; hướng/vùng đòn khóa lúc bắt đầu gồng nên người chơi né được bằng cách rời khỏi đường/vùng đó.
// Không dùng Math.random: chạy lại cùng seed cho cùng kết quả.
import { RUN, ARCH, HUB_MONSTER as HM, WOLF_PACK as WP } from '../core/config.js';
import { bossAI } from './bosses.js';
import { claimSpecial, thinkTick } from '../systems/tactics.js';
import { dropTrail } from '../systems/firetrail.js';

// Trả về true nếu đã tự xử lý vận tốc/tấn công (updateMonsters bỏ qua AI đuổi mặc định).
// io: { map, onAttack(m, dmg), shots }
export function archetypeAI(m, player, dx, dy, d, dt, io) {
  if (m.boss) return bossAI(m, player, dx, dy, d, dt, io);
  const A = ARCH[m.arch];
  if (m.arch === 'chaser') return io.skillsV2 ? wolfAI(m, player, dx, dy, d, dt, io) : false;   // M10-04: sói theo đàn chỉ khi bật cờ
  if (!A) return false;
  m.skCd -= dt;
  if (m.st === 'windup') {
    m.vx = m.vy = 0; m.stT -= dt;
    if (m.stT > 0) return true;
    if (m.arch === 'charger') { m.st = 'dash'; m.stT = A.DASH_TIME; m.dashHit = false; m.trailT = 0; m.trailN = 0; }
    else if (m.arch === 'ranged') {
      if (io.shots && io.shots.length < RUN.MAX_ENEMY_SHOTS)
        io.shots.push({ x: m.x, y: m.y - 6, vx: m.dirX * A.SHOT_SPEED, vy: m.dirY * A.SHOT_SPEED, life: A.SHOT_LIFE, dmg: m.dmg * A.SHOT_DMG, src: 'ranged:shot' });
      m.st = 'move'; m.skCd = A.CD;
    } else if (m.arch === 'elite') {
      if (Math.hypot(player.x - m.x, player.y - m.y) < A.SLAM_R) io.onAttack(m, m.dmg * A.SLAM_DMG, 'elite:slam');
      io.ev && io.ev.push({ type: 'boom', x: m.x, y: m.y - 2, r: A.SLAM_R, color: '#c070ff' }, { type: 'shake', t: 0.1 });
      m.st = 'recover'; m.stT = A.RECOVER;
    }
    return true;
  }
  if (m.st === 'dash') {
    m.vx = m.dirX * A.DASH_SPEED; m.vy = m.dirY * A.DASH_SPEED; m.stT -= dt;
    if (!m.dashHit && d < A.HIT_R) { m.dashHit = true; io.onAttack(m, m.dmg * A.DASH_DMG); }
    if (io.skillsV2 && m.arch === 'charger' && io.scene) dropTrail(io.scene, m, player, dt);   // M10-05: Hỏa Vĩ
    if (m.stT <= 0) { m.st = 'recover'; m.stT = A.RECOVER; }
    return true;
  }
  if (m.st === 'recover') {
    m.vx = m.vy = 0; m.stT -= dt;
    if (m.stT <= 0) { m.st = 'move'; m.skCd = A.CD; }
    return true;
  }
  // st === 'move'
  // M10-02 (bật cờ): chỉ xét ra chiêu theo nhịp so le + phải còn ngân sách đe dọa trên màn; hết thì thử lại sau TACTICS.RETRY
  const tac = io.tactics, think = !tac || thinkTick(m, dt, io.rng);
  const may = () => !tac || claimSpecial(io, m, player) || ((m.skCd = io.retry), false);
  const sees = think && d < 260 && io.map.lineOfSight(m.x, m.y - 6, player.x, player.y - 6);
  if (m.arch === 'charger' && m.skCd <= 0 && d < A.TRIGGER && d > 24 && sees && may()) return startWindup(m, dx / d, dy / d, A.WINDUP);
  if (m.arch === 'elite' && think && m.skCd <= 0 && d < A.TRIGGER && may()) return startWindup(m, 0, 0, A.WINDUP);
  if (m.arch === 'ranged') {
    const onScreen = Math.abs(dx) < A.ONSCREEN_X && Math.abs(dy) < A.ONSCREEN_Y;
    if (m.skCd <= 0 && d < A.FIRE_RANGE && sees && onScreen && may()) {
      const ax = player.x - m.x, ay = (player.y - 6) - (m.y - 6), l = Math.hypot(ax, ay) || 1;
      return startWindup(m, ax / l, ay / l, A.WINDUP);
    }
    let ux = dx / d, uy = dy / d;
    if (think) m.seesP = sees;   // (bật cờ) giữ kết quả nhìn thấy giữa các nhịp suy nghĩ
    const seen = tac ? m.seesP : sees;
    if (!seen || !onScreen || d > A.KEEP_MAX) { m.vx = ux * m.speed; m.vy = uy * m.speed; }
    else if (d < A.KEEP_MIN) { m.vx = -ux * m.speed; m.vy = -uy * m.speed; }
    else { const s = m.ph > 3 ? 1 : -1; m.vx = -uy * s * m.speed * 0.5; m.vy = ux * s * m.speed * 0.5; }
    return true;
  }
  // charger/elite khi không gồng: đuổi + cắn gần như yêu thú thường
  m.vx = dx / d * m.speed; m.vy = dy / d * m.speed;
  if (d < HM.ATTACK_RANGE) { m.vx = m.vy = 0; if (m.atkCd <= 0) { m.atkCd = HM.ATTACK_CD; io.onAttack(m, m.dmg); } }
  return true;
}

// M10-04: Dã Lang. Vai trò do packs.js gán. flank: chạy tới điểm sườn rồi chồm (gồng khóa hướng -> lao ngắn).
// Mọi vai trò khác / không làm gì đặc biệt -> trả false để updateMonsters đuổi + cắn như cũ (kể cả vòng hồ theo bản đồ hướng).
function wolfAI(m, player, dx, dy, d, dt, io) {
  const P = WP.POUNCE;
  m.skCd -= dt;
  if (m.st === 'windup') {
    m.vx = m.vy = 0; m.stT -= dt;
    if (m.stT <= 0) { m.st = 'dash'; m.stT = P.TIME; m.dashHit = false; }
    return true;
  }
  if (m.st === 'dash') {
    m.vx = m.dirX * P.SPEED; m.vy = m.dirY * P.SPEED; m.stT -= dt;
    if (!m.dashHit && d < P.HIT_R) { m.dashHit = true; io.onAttack(m, m.dmg * P.DMG, 'chaser:pounce'); }
    if (m.stT <= 0) { m.st = 'recover'; m.stT = P.RECOVER; }
    return true;
  }
  if (m.st === 'recover') {
    m.vx = m.vy = 0; m.stT -= dt;
    if (m.stT <= 0) { m.st = 'move'; m.skCd = P.CD; m.role = 'press'; }
    return true;
  }
  if (m.role !== 'flank') return false;
  m.flankT = (m.flankT || 0) + dt;
  if (m.flankT > WP.FLANK_MAX) { m.role = 'press'; return false; }
  // còn lệch góc nhiều -> đi vòng quanh người chơi (giữ khoảng cách, khép dần) thay vì cắt thẳng vào giữa
  const am = Math.atan2(m.y - player.y, m.x - player.x), da = Math.atan2(Math.sin(m.flankA - am), Math.cos(m.flankA - am));
  const orbit = Math.abs(da) > WP.ORBIT_DA;
  const ang = orbit ? am + Math.sign(da) * WP.ORBIT_STEP : m.flankA, rad = orbit ? Math.max(WP.FLANK_R + 10, d * WP.ORBIT_SHRINK) : WP.FLANK_R;
  const tx = player.x + Math.cos(ang) * rad, ty = player.y + Math.sin(ang) * rad;
  const ex = tx - m.x, ey = ty - m.y, td = Math.hypot(ex, ey);
  if (orbit || td > WP.FLANK_ARRIVE) {
    if (io.map.waterBetween && io.map.waterBetween(m.x, m.y, tx, ty)) return false;   // hồ chắn điểm sườn: đi như sói thường (vòng hồ)
    m.vx = ex / td * m.speed * WP.FLANK_SPEED; m.vy = ey / td * m.speed * WP.FLANK_SPEED;
    return true;
  }
  // đã tới sườn: chồm nếu hết hồi chiêu, đúng tầm, thấy người chơi, đàn chưa có con nào đang chồm, còn ngân sách trên màn
  const busy = io.scene && io.scene.packBusy;
  if (m.skCd <= 0 && d < P.TRIGGER && d > P.MIN && !(busy && busy.has(m.packId))
      && io.map.lineOfSight(m.x, m.y - 6, player.x, player.y - 6) && (!io.threat || claimSpecial(io, m, player))) {
    if (busy) busy.add(m.packId);
    return startWindup(m, dx / d, dy / d, P.WINDUP);
  }
  return false;
}

function startWindup(m, dx, dy, time) {
  m.st = 'windup'; m.stT = time; m.stMax = time; m.dirX = dx; m.dirY = dy; m.vx = m.vy = 0;
  return true;
}

// Băng tiễn của quái: bay thẳng, cây/đá chặn, trúng người chơi thì biến mất
export function updateEnemyShots(scene, player, dt, onHit) {
  const shots = scene.enemyShots, R = ARCH.ranged.SHOT_R;
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    let gone = s.life <= 0 || scene.map.blocksShot(s.x, s.y + 6);
    if (!gone && !player.dead && Math.hypot(player.x - s.x, (player.y - 7) - s.y) < R) {
      onHit(s.dmg, s); gone = true;
      if (shots[i] !== s) return;            // trúng đòn chí mạng -> run kết thúc đã dọn mảng đạn
    }
    if (gone) shots.splice(i, 1);
  }
}
