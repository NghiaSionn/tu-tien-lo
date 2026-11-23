// Cutscene xuất hiện boss (23/11, người phát triển yêu cầu). Thuần dòng thời gian: KHÔNG chạm logic trận —
// main.js ngừng gọi updateRun trong lúc cutscene chạy (quái/đạn/đồng hồ đứng yên, người chơi không điều khiển, không ai trúng đòn).
// state(c) trả về mọi thứ cần vẽ ở thời điểm c.t: điểm camera nhìn, độ cao boss trên điểm đáp, tư thế, dải đen, bảng tên, rung.
import { CUTSCENE as CS } from '../core/config.js';

const clamp01 = v => Math.max(0, Math.min(1, v));
const ease = v => { v = clamp01(v); return v * v * (3 - 2 * v); };      // smoothstep
const easeIn = v => { v = clamp01(v); return v * v * v; };              // rơi nhanh dần

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

// Bỏ qua (chỉ khi đã từng xem): nhảy tới đoạn trả camera, vẫn phát hiệu ứng đáp đất để boss "đã ở đó"
export function skipCutscene(c) {
  if (!c || !c.skippable || c.done) return false;
  const T = c.S.T;
  if (c.t < T.LAND) {
    c.S.EVENTS.forEach(([at], i) => { if (at < T.LAND - 1e-6) c.fired.add(i); });   // bỏ tiếng hú/rung trước đó, chỉ giữ cú đáp
    c.t = T.LAND;
  }
  return true;
}

export function cutsceneState(c) {
  const S = c.S, T = S.T, t = c.t;
  // camera: người chơi -> boss (CAM_IN), giữ, rồi boss -> người chơi ở cuối (CAM_OUT)
  const kIn = ease((t - 0) / T.CAM_IN), kOut = ease((t - T.OUT) / (c.dur - T.OUT));
  const fx = c.px + (c.bx - c.px) * kIn * (1 - kOut), fy = c.py + (c.by - S.HIGH * 0.5 - c.py) * kIn * (1 - kOut);
  // độ cao boss trên điểm đáp: đứng trên cao tới lúc nhảy, rơi nhanh dần tới LAND
  let alt = S.HIGH, pose = 0;
  if (t < T.INHALE) pose = 0;
  else if (t < T.HOWL) pose = 1;
  else if (t < T.CROUCH) pose = 2;
  else if (t < T.LEAP) pose = 3;
  else if (t < T.LAND) { pose = 4; alt = S.HIGH * (1 - easeIn((t - T.LEAP) / (T.LAND - T.LEAP))); }
  else { pose = 5; alt = 0; }
  if (t >= T.LAND) alt = 0;
  const letter = ease(t / 0.35) * (1 - ease((t - T.OUT) / (c.dur - T.OUT)));
  const name = ease((t - T.NAME) / 0.35) * (1 - ease((t - T.OUT) / 0.4));
  const howl = t >= T.HOWL && t < T.CROUCH ? (t - T.HOWL) / (T.CROUCH - T.HOWL) : -1;   // 0..1 trong lúc hú (vòng sóng âm)
  const landK = t >= T.LAND ? (t - T.LAND) / 0.6 : -1;                                    // 0..1 sau khi đáp (bụi, vòng chấn)
  return { kind: c.kind, faceLeft: c.px < c.bx, focusX: fx, focusY: fy, alt, pose, letter, name, howl, landK, bx: c.bx, by: c.by, skippable: c.skippable, title: S.TITLE, sub: S.SUB };
}
