// M10-05: Hỏa Vĩ — vệt lửa Hỏa Hồ để lại trong cú lao (chỉ khi FEATURES.enemySkillsV2 / run.skillsV2).
// Đốm lửa: ARM giây đầu là cảnh báo vô hại, sau đó cháy tới LIFE rồi xóa. Có trần mỗi cú lao và toàn màn,
// không đặt sát người chơi, sát thương tối đa 1 lần mỗi TICK dù đứng trên nhiều đốm.
import { FOX_TRAIL as F, PLAYER } from '../core/config.js';

// Gọi mỗi tick khi Hỏa Hồ đang lao (st 'dash'). m.trailT / m.trailN đặt lại khi bắt đầu lao.
export function dropTrail(scene, m, player, dt) {
  const trails = scene.fireTrails || (scene.fireTrails = []);
  m.trailT = (m.trailT ?? 0) - dt;
  if (m.trailT > 0) return;
  m.trailT = F.EVERY;
  if ((m.trailN || 0) >= F.MAX_PER_FOX || trails.length >= F.MAX) return;
  if (Math.hypot(player.x - m.x, player.y - m.y) < F.SAFE_R + F.R) return;   // không sinh dưới chân người chơi
  if (scene.map.monStand && !scene.map.monStand(m.x, m.y)) return;
  trails.push({ x: m.x, y: m.y, r: F.R, t: 0, life: F.LIFE, arm: F.ARM, dmg: m.dmg * F.DMG });
  m.trailN = (m.trailN || 0) + 1;
}

// Già đi + gây sát thương. hit(dmg) trả sát thương thực nhận; st giữ nhịp TICK (run).
export function updateFireTrails(scene, player, dt, st, hit) {
  const trails = scene.fireTrails;
  if (!trails || !trails.length) return;
  st.trailCd = Math.max(0, (st.trailCd || 0) - dt);
  let touching = null;
  for (let i = trails.length - 1; i >= 0; i--) {
    const f = trails[i];
    f.t += dt;
    if (f.t >= f.life) { trails.splice(i, 1); continue; }
    if (f.t >= f.arm && !touching && !player.dead && Math.hypot(player.x - f.x, player.y - f.y) < f.r + PLAYER.HITBOX) touching = f;
  }
  if (touching && st.trailCd <= 0) { st.trailCd = F.TICK; hit(touching.dmg); }
}
