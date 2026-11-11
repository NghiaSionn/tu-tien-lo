// Hành vi kiểu quái trong bí cảnh (M2-01). Mọi đòn nguy hiểm đều có pha gồng (st = 'windup') để renderer vẽ cảnh báo
// trước khi đánh; hướng/vùng đòn khóa lúc bắt đầu gồng nên người chơi né được bằng cách rời khỏi đường/vùng đó.
// Không dùng Math.random: chạy lại cùng seed cho cùng kết quả.
import { RUN, ARCH, HUB_MONSTER as HM } from '../core/config.js';

// Trả về true nếu đã tự xử lý vận tốc/tấn công (updateMonsters bỏ qua AI đuổi mặc định).
// io: { map, onAttack(m, dmg), shots }
export function archetypeAI(m, player, dx, dy, d, dt, io) {
  const A = ARCH[m.arch];
  if (!A || m.arch === 'chaser') return false;
  m.skCd -= dt;
  if (m.st === 'windup') {
    m.vx = m.vy = 0; m.stT -= dt;
    if (m.stT > 0) return true;
    if (m.arch === 'charger') { m.st = 'dash'; m.stT = A.DASH_TIME; m.dashHit = false; }
    else if (m.arch === 'ranged') {
      if (io.shots && io.shots.length < RUN.MAX_ENEMY_SHOTS)
        io.shots.push({ x: m.x, y: m.y - 6, vx: m.dirX * A.SHOT_SPEED, vy: m.dirY * A.SHOT_SPEED, life: A.SHOT_LIFE, dmg: m.dmg * A.SHOT_DMG });
      m.st = 'move'; m.skCd = A.CD;
    } else if (m.arch === 'elite') {
      if (Math.hypot(player.x - m.x, player.y - m.y) < A.SLAM_R) io.onAttack(m, m.dmg * A.SLAM_DMG);
      io.ev && io.ev.push({ type: 'boom', x: m.x, y: m.y - 2, r: A.SLAM_R, color: '#c070ff' }, { type: 'shake', t: 0.1 });
      m.st = 'recover'; m.stT = A.RECOVER;
    }
    return true;
  }
  if (m.st === 'dash') {
    m.vx = m.dirX * A.DASH_SPEED; m.vy = m.dirY * A.DASH_SPEED; m.stT -= dt;
    if (!m.dashHit && d < A.HIT_R) { m.dashHit = true; io.onAttack(m, m.dmg * A.DASH_DMG); }
    if (m.stT <= 0) { m.st = 'recover'; m.stT = A.RECOVER; }
    return true;
  }
  if (m.st === 'recover') {
    m.vx = m.vy = 0; m.stT -= dt;
    if (m.stT <= 0) { m.st = 'move'; m.skCd = A.CD; }
    return true;
  }
  // st === 'move'
  const sees = d < 260 && io.map.lineOfSight(m.x, m.y - 6, player.x, player.y - 6);
  if (m.arch === 'charger' && m.skCd <= 0 && d < A.TRIGGER && d > 24 && sees) return startWindup(m, dx / d, dy / d, A.WINDUP);
  if (m.arch === 'elite' && m.skCd <= 0 && d < A.TRIGGER) return startWindup(m, 0, 0, A.WINDUP);
  if (m.arch === 'ranged') {
    const onScreen = Math.abs(dx) < A.ONSCREEN_X && Math.abs(dy) < A.ONSCREEN_Y;
    if (m.skCd <= 0 && d < A.FIRE_RANGE && sees && onScreen) {
      const ax = player.x - m.x, ay = (player.y - 6) - (m.y - 6), l = Math.hypot(ax, ay) || 1;
      return startWindup(m, ax / l, ay / l, A.WINDUP);
    }
    let ux = dx / d, uy = dy / d;
    if (!sees || !onScreen || d > A.KEEP_MAX) { m.vx = ux * m.speed; m.vy = uy * m.speed; }
    else if (d < A.KEEP_MIN) { m.vx = -ux * m.speed; m.vy = -uy * m.speed; }
    else { const s = m.ph > 3 ? 1 : -1; m.vx = -uy * s * m.speed * 0.5; m.vy = ux * s * m.speed * 0.5; }
    return true;
  }
  // charger/elite khi không gồng: đuổi + cắn gần như yêu thú thường
  m.vx = dx / d * m.speed; m.vy = dy / d * m.speed;
  if (d < HM.ATTACK_RANGE) { m.vx = m.vy = 0; if (m.atkCd <= 0) { m.atkCd = HM.ATTACK_CD; io.onAttack(m, m.dmg); } }
  return true;
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
      onHit(s.dmg); gone = true;
      if (shots[i] !== s) return;            // trúng đòn chí mạng -> run kết thúc đã dọn mảng đạn
    }
    if (gone) shots.splice(i, 1);
  }
}
