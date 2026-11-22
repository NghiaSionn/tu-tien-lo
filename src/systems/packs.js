// M10-04: Dã Lang săn theo đàn (chỉ khi FEATURES.enemySkillsV2 / run.skillsV2).
// Không tìm đường từng con: mỗi WOLF_PACK.THINK giây gom sói gần người chơi thành đàn (tham lam theo khoảng cách),
// phân vai: con gần nhất áp sát (press), một con vòng sang sườn lệch ~90° (flank). Chỉ con flank được chồm,
// và mỗi đàn chỉ một con đang gồng/chồm. Hồ chắn đường tới điểm sườn -> thôi vòng, đi theo bản đồ hướng như sói thường.
import { WOLF_PACK as WP } from '../core/config.js';

const isWolf = m => !m.dead && m.arch === 'chaser' && !m.boss;
const busySt = m => m.st === 'windup' || m.st === 'dash';

// Gọi mỗi tick trước updateMonsters. st: đối tượng giữ nhịp (run).
export function updatePacks(scene, player, st, dt) {
  // đàn nào đang có con gồng/chồm (tính lại mỗi tick theo packId hiện tại)
  const busy = new Set();
  for (const m of scene.monsters) if (isWolf(m) && m.packId && busySt(m)) busy.add(m.packId);
  scene.packBusy = busy;
  st.packT = (st.packT || 0) - dt;
  if (st.packT > 0) return;
  st.packT = WP.THINK;

  const near = [];
  for (const m of scene.monsters) {
    if (!isWolf(m)) continue;
    const d = Math.hypot(m.x - player.x, m.y - player.y);
    if (d < WP.ENGAGE_R) { m.packD = d; near.push(m); }
    else if (!busySt(m) && m.st !== 'recover') { m.role = null; m.packId = 0; }
  }
  near.sort((a, b) => a.packD - b.packD);
  for (const m of near) m.packTmp = 0;
  let seq = 0;
  for (const lead of near) {
    if (lead.packTmp) continue;
    const id = ++seq, mem = [lead]; lead.packTmp = id;
    let hasBusy = busySt(lead);
    for (const o of near) {
      if (mem.length >= WP.PACK_MAX) break;
      if (o.packTmp || Math.hypot(o.x - lead.x, o.y - lead.y) > WP.PACK_R) continue;
      if (busySt(o) && hasBusy) continue;   // không gộp hai con đang chồm vào cùng một đàn
      if (busySt(o)) hasBusy = true;
      o.packTmp = id; mem.push(o);
    }
    assignRoles(mem, id, player);
  }
  // packId mới -> tính lại tập đàn bận
  scene.packBusy = new Set();
  for (const m of near) if (busySt(m)) scene.packBusy.add(m.packId);
}

function assignRoles(mem, id, player) {
  for (const m of mem) m.packId = id;
  if (mem.length < WP.MIN_PACK) { for (const m of mem) if (!busySt(m) && m.st !== 'recover') m.role = null; return; }
  const press = mem[0];
  if (!busySt(press) && press.st !== 'recover') press.role = 'press';
  // giữ con flank cũ nếu vẫn trong đàn và chưa quá giờ; không thì chọn con rảnh kế tiếp
  let fl = mem.find(m => m !== press && m.role === 'flank' && (m.flankT || 0) < WP.FLANK_MAX && m.st === 'move');
  if (!fl) fl = mem.find(m => m !== press && m.st === 'move');
  for (const m of mem) {
    if (m === press || busySt(m) || m.st === 'recover') continue;
    if (m === fl) {
      if (m.role !== 'flank') { m.role = 'flank'; m.flankT = 0; }
      // hướng sườn: lệch ±90° so với hướng con áp sát, chọn bên gần con flank hơn
      const a0 = Math.atan2(press.y - player.y, press.x - player.x), am = Math.atan2(m.y - player.y, m.x - player.x);
      const c1 = a0 + Math.PI / 2, c2 = a0 - Math.PI / 2, diff = a => Math.abs(Math.atan2(Math.sin(a - am), Math.cos(a - am)));
      m.flankA = diff(c1) <= diff(c2) ? c1 : c2;
    } else m.role = 'press';
  }
}
