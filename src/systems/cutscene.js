// Cutscene xuất hiện boss (23/11, người phát triển yêu cầu). Thuần dòng thời gian: KHÔNG chạm logic trận —
// main.js ngừng gọi updateRun trong lúc cutscene chạy (quái/đạn/đồng hồ đứng yên, người chơi không điều khiển, không ai trúng đòn).
//
// Kịch bản Lang Vương (người phát triển góp ý lần 2):
//   1. "camera bay lên trời": cảnh vách đá trên cao (ảnh nền riêng) trượt từ trên xuống phủ màn hình.
//   2. Trên vách: sói bước ra từ mép trái tới mỏm đá, nhìn quanh, lấy hơi, ngửa đầu hú, lấy đà, phóng khỏi vách.
//   3. "camera hạ xuống": nền vách trượt lên, lộ đấu trường đúng chỗ đáp (chỗ trống nhất — director chọn); sói rơi từ trên cao xuống,
//      đáp đất (vòng chấn, bụi), hiện bảng tên, camera về người chơi.
// state(c) trả về mọi thứ cần vẽ ở thời điểm c.t (render.js vẽ, không đổi trạng thái).
import { CUTSCENE as CS } from '../core/config.js';

const clamp01 = v => Math.max(0, Math.min(1, v));
const ease = v => { v = clamp01(v); return v * v * (3 - 2 * v); };      // smoothstep
const easeIn = v => { v = clamp01(v); return v * v * v; };              // rơi nhanh dần
const lerp = (a, b, k) => a + (b - a) * k;

// boss: {x, y} điểm đáp (vị trí boss đã sinh); player: {x, y}; seen: đã xem lần nào chưa (cho bỏ qua)
export function createCutscene(kind, boss, player, seen = false) {
  const S = CS[kind];
  if (!S) return null;
  return { kind, S, t: 0, dur: S.DUR, bx: boss.x, by: boss.y, px: player.x, py: player.y, skippable: !!seen, fired: new Set(), done: false };
}

// Tiến thời gian; trả về các sự kiện (âm thanh / hiệu ứng) vừa tới mốc — mỗi mốc phát đúng một lần
export function stepCutscene(c, dt) {
  if (!c || c.done) return [];
  c.t += dt;
  const out = [];
  c.S.EVENTS.forEach(([at, ev], i) => { if (c.t >= at && !c.fired.has(i)) { c.fired.add(i); out.push({ ...ev }); } });
  if (c.t >= c.dur) c.done = true;
  return out;
}

// Bỏ qua (chỉ khi đã từng xem): nhảy tới lúc hạ xuống đấu trường, bỏ các tiếng/rung trước đó, vẫn có cú đáp đất
export function skipCutscene(c) {
  if (!c || !c.skippable || c.done) return false;
  const T = c.S.T;
  if (c.t < T.DESCEND) {
    c.S.EVENTS.forEach(([at], i) => { if (at < T.DESCEND - 1e-6) c.fired.add(i); });
    c.t = T.DESCEND;
  }
  return true;
}

// Vị trí con sói trên vách (tọa độ màn hình W×H theo tỉ lệ 0..1 của config CLIFF) + tư thế
function cliffActor(c, t) {
  const S = c.S, T = S.T, C = S.CLIFF;
  const tipX = C.TIP_X, y = C.LEDGE_Y;
  if (t < T.WALK) return null;
  if (t < T.LOOK) {   // bước ra: khung đi bộ (cùng sprite với khi đánh nhau) từ ngoài mép trái tới mỏm đá
    const k = ease((t - T.WALK) / (T.LOOK - T.WALK));
    return { x: lerp(C.START_X, tipX, k), y: lerp(C.START_Y ?? y, y, k), frame: 'walk' + (Math.floor(t * 8) % 4), flip: false };
  }
  if (t < T.INHALE) {  // nhìn quanh: quay trái rồi quay phải
    const k = (t - T.LOOK) / (T.INHALE - T.LOOK);
    return { x: tipX, y, frame: 'i0', flip: k > 0.25 && k < 0.6 };
  }
  if (t < T.HOWL) return { x: tipX, y, frame: 'i1', flip: false };
  if (t < T.CROUCH) return { x: tipX, y, frame: 'i2', flip: false };
  if (t < T.LEAP) return { x: tipX, y, frame: 'i3', flip: false };
  if (t < T.DESCEND) {  // phóng khỏi vách: vọt lên rồi lao xuống ra khỏi khung bên phải
    const k = (t - T.LEAP) / (T.DESCEND - T.LEAP);
    return { x: lerp(tipX, tipX + 0.38, k), y: y - 0.22 * Math.sin(Math.PI * Math.min(1, k * 1.3)) + 0.55 * easeIn(k), frame: 'i4', flip: false };
  }
  return null;
}

export function cutsceneState(c) {
  const S = c.S, T = S.T, t = c.t;
  // nền vách đá: 0 = chưa phủ (đấu trường), 1 = phủ kín. Trượt từ trên xuống (UP) rồi trượt lên (DESCEND)
  let bg = 0, bgY = -1;
  if (t >= T.UP && t < T.DESCEND) { bg = ease((t - T.UP) / (T.WALK - T.UP)); bgY = bg - 1; }
  else if (t >= T.DESCEND && t < T.FALL) { const k = ease((t - T.DESCEND) / (T.FALL - T.DESCEND)); bg = 1 - k; bgY = -k; }
  // camera đấu trường: người chơi lúc đầu; sau khi hạ xuống nhìn điểm đáp; cuối cảnh về người chơi
  const atLand = t >= T.DESCEND ? 1 : 0, kOut = ease((t - T.OUT) / (c.dur - T.OUT));
  const fx = lerp(c.px, c.bx, atLand * (1 - kOut)), fy = lerp(c.py, c.by - 20, atLand * (1 - kOut));
  // cú rơi xuống đấu trường
  let alt = -1, pose = 4;
  if (t >= T.FALL && t < T.LAND) { alt = S.HIGH * (1 - easeIn((t - T.FALL) / (T.LAND - T.FALL))); pose = 4; }
  else if (t >= T.LAND) { alt = 0; pose = 5; }
  const letter = ease(t / 0.35) * (1 - kOut);
  const name = ease((t - T.NAME) / 0.35) * (1 - ease((t - T.OUT) / 0.4));
  const howl = t >= T.HOWL && t < T.CROUCH ? (t - T.HOWL) / (T.CROUCH - T.HOWL) : -1;   // 0..1 trong lúc hú (vòng sóng âm trên vách)
  const landK = t >= T.LAND ? (t - T.LAND) / 0.6 : -1;                                    // 0..1 sau khi đáp (bụi, vòng chấn)
  return { kind: c.kind, faceLeft: c.px < c.bx, focusX: fx, focusY: fy, bg, bgY, cliff: cliffActor(c, t), cliffCfg: S.CLIFF,
    alt, pose, letter, name, howl, landK, bx: c.bx, by: c.by, skippable: c.skippable, title: S.TITLE, sub: S.SUB };
}
