// Autopilot playtest (chỉ dùng khi test, không nạp trong game). Chạy trong trang game:
//   const A = await import('/tools/autopilot.js'); A.start({ build: 'kiem_loi' });
// Chỉ ĐỌC trạng thái (__game) và phát sự kiện bàn phím (keydown/keyup) qua đúng đường input của game — không sửa state.
// Di chuyển: né quái gần + né cảnh báo (đường lao, vùng nổ, đạn bay tới) + nhặt chiến ý (giống tools/sim.mjs).
// Chọn thẻ: bấm phím số theo ưu tiên của build (đọc tên thẻ trên bảng). Không tự vào/rời run, không tự nhận thưởng.
import { ARCH, BOSS } from '../src/core/config.js';

const PRIORITY = {
  kiem_loi: ['Lôi Đình Vạn Kiếm', 'Kiếm Khí', 'Lôi Kích', 'Linh Lực', 'Ngưng Thần', 'Hộ Thể Cương Khí', 'Lôi Cương Hộ Thể'],
  phi_kiem_hoa: ['Liệt Diễm Kiếm Trận', 'Phi Kiếm Trận', 'Hỏa Cầu', 'Linh Lực', 'Ngưng Thần', 'Hỏa Luân'],
  hoa_phong: ['Hỏa Long Quyển', 'Hỏa Luân', 'Phong Nhận', 'Hỏa Cầu', 'Tụ Khí', 'Linh Lực'],
  loi_the: ['Lôi Cương Hộ Thể', 'Hộ Thể Cương Khí', 'Lôi Vực', 'Lôi Kích', 'Hộ Mạch'],
};
const KEYS = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' };
const held = {};
let timer = null, opts = null, picks = 0;

const send = (type, code) => dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
function hold(dir, on) {
  if (!!held[dir] === on) return;
  held[dir] = on; send(on ? 'keydown' : 'keyup', KEYS[dir]);
}
const releaseAll = () => { for (const d in KEYS) hold(d, false); };

function segDist(px, py, x0, y0, x1, y1) {
  const vx = x1 - x0, vy = y1 - y0, l2 = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, ((px - x0) * vx + (py - y0) * vy) / l2));
  return [Math.hypot(px - (x0 + vx * t), py - (y0 + vy * t)), x0 + vx * t, y0 + vy * t];
}

function steer(run, p) {
  let vx = 0, vy = 0;
  const away = (x, y, w) => {
    let dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy);
    if (d < 2) { dx = -p.fy || 1; dy = p.fx; d = Math.hypot(dx, dy) || 1; }
    vx += dx / d * w; vy += dy / d * w;
  };
  for (const m of run.scene.monsters) {
    const dx = p.x - m.x, dy = p.y - m.y, d2 = dx * dx + dy * dy;
    if (d2 < 90 * 90) { vx += dx / d2 * 40; vy += dy / d2 * 40; }
  }
  if (!opts.naive) {
    for (const h of run.scene.hazards) if (Math.hypot(p.x - h.x, p.y - h.y) < h.r + 12) away(h.x, h.y, 4);
    for (const m of run.scene.monsters) {
      if (m.st !== 'windup' && m.st !== 'dash' && m.st !== 'rest') continue;
      let L = 0;
      if (m.arch === 'charger') L = ARCH.charger.DASH_SPEED * ARCH.charger.DASH_TIME;
      else if (m.boss && m.pat === 'dash') L = BOSS.MINI.DASH.SPEED * BOSS.MINI.DASH.TIME;
      else if (m.arch === 'ranged' && m.st === 'windup') L = 200;
      else if (m.arch === 'elite' && m.st === 'windup' && Math.hypot(p.x - m.x, p.y - m.y) < ARCH.elite.SLAM_R + 12) away(m.x, m.y, 4);
      if (L) { const [d, cx, cy] = segDist(p.x, p.y, m.x, m.y, m.x + m.dirX * L, m.y + m.dirY * L); if (d < 20) away(cx, cy, 4); }
    }
    for (const s of run.scene.enemyShots) {
      const sp = Math.hypot(s.vx, s.vy) || 1;
      const [d, cx, cy] = segDist(p.x, p.y - 7, s.x, s.y, s.x + s.vx / sp * 70, s.y + s.vy / sp * 70);
      if (d < 12) away(cx, cy + 7, 3);
    }
  }
  let best = null, bd = 1e9;
  for (const o of run.scene.orbs) { const d = Math.hypot(o.x - p.x, o.y - p.y); if (d < bd) { bd = d; best = o; } }
  if (best && bd < 160) { vx += (best.x - p.x) / bd * 0.6; vy += (best.y - p.y) / bd * 0.6; }
  vx += (run.scene.map.cx - p.x) * 0.0015; vy += (run.scene.map.cy - p.y) * 0.0015;
  const l = Math.hypot(vx, vy);
  if (l < 0.05) return releaseAll();
  const nx = vx / l, ny = vy / l;
  hold('right', nx > 0.38); hold('left', nx < -0.38); hold('down', ny > 0.38); hold('up', ny < -0.38);
}

function pickCard() {
  const cards = [...document.querySelectorAll('#modal .card')];
  if (!cards.length) return;
  const pri = PRIORITY[opts.build] || [];
  const score = c => {
    const t = c.innerText;
    if (/TIẾN HÓA/.test(t)) return -1;
    const i = pri.findIndex(n => t.includes(n));
    return i < 0 ? 50 + (/Nâng cấp/.test(t) ? 0 : 10) : i;
  };
  let bi = 0; cards.forEach((c, i) => { if (score(c) < score(cards[bi])) bi = i; });
  send('keydown', 'Digit' + (bi + 1)); send('keyup', 'Digit' + (bi + 1));
  picks++;
}

let draftSeenAt = 0;
function tick() {
  const g = window.__game;
  if (!g || !g.run || g.view === 'HUB' || g.view === 'RESULTS') { releaseAll(); return; }
  if (g.view === 'CARD_DRAFT') {
    releaseAll();
    if (!opts.pickCards) return;
    const now = performance.now();
    if (!draftSeenAt) draftSeenAt = now;
    if (now - draftSeenAt > 400) { pickCard(); draftSeenAt = 0; }   // chờ quá thời gian khóa input của bảng thẻ
    return;
  }
  draftSeenAt = 0;
  if (g.view !== 'RUN' || g.paused) { releaseAll(); return; }
  steer(g.run, g.p);
}

export function start(o = {}) {
  stop();
  opts = { build: 'kiem_loi', naive: false, pickCards: true, ...o };
  picks = 0;
  timer = setInterval(tick, 50);
  return opts;
}
export function stop() { if (timer) clearInterval(timer); timer = null; releaseAll(); }
export const status = () => ({ running: !!timer, picks, ...opts });
