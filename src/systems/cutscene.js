// Cutscene xuất hiện boss (23/11, người phát triển yêu cầu). Thuần dòng thời gian: KHÔNG chạm logic trận —
// main.js ngừng gọi updateRun trong lúc cutscene chạy (quái/đạn/đồng hồ đứng yên, người chơi không điều khiển, không ai trúng đòn).
//
// Kịch bản Lang Vương (góp ý lần 3, 24/11: chuyển cảnh phải mượt, sói bước chậm có uy lực):
//   1. Đấu trường: camera ngửa dần lên trời (trượt dọc trục y) rồi tối dần (fade out).
//   2. Cảnh vách đá sáng dần (fade in): mở ở bầu trời/trăng, camera hạ từ từ xuống mặt vách.
//      Sói hiện ra từ bóng tối, bước CHẬM từng bước nặng (mỗi bước: tiếng dậm, bụi, rung nhẹ) tới mỏm đá,
//      nhìn quanh, lấy hơi, ngửa đầu hú, lấy đà, phóng lên — camera ngửa theo, tối dần.
//   3. Đấu trường sáng dần: camera từ trên cao hạ xuống điểm đáp (chỗ trống nhất — director chọn) đúng lúc sói rơi xuống,
//      đáp đất (vòng chấn, bụi), hiện bảng tên, camera về người chơi.
// cutsceneState(c) trả về mọi thứ cần vẽ ở thời điểm c.t (render.js vẽ, không đổi trạng thái).
import { CUTSCENE as CS } from '../core/config.js';

const clamp01 = v => Math.max(0, Math.min(1, v));
const ease = v => { v = clamp01(v); return v * v * (3 - 2 * v); };      // smoothstep
const easeIn = v => { v = clamp01(v); return v * v * v; };              // rơi nhanh dần
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp01((t - a) / (b - a));

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

// Bỏ qua (chỉ khi đã từng xem): nhảy tới lúc tối dần trước khi về đấu trường, bỏ các tiếng/rung trước đó, vẫn có cú đáp đất
export function skipCutscene(c) {
  if (!c || !c.skippable || c.done) return false;
  const T = c.S.T;
  if (c.t < T.FADE2) {
    c.S.EVENTS.forEach(([at], i) => { if (at < T.FADE2 - 1e-6) c.fired.add(i); });
    c.t = T.FADE2;
  }
  return true;
}

// Con sói trên vách: vị trí (tỉ lệ 0..1 của màn hình), khung hình, độ hiện (0 = chìm trong bóng tối), pha bước chân
function cliffActor(c, t) {
  const S = c.S, T = S.T, C = S.CLIFF;
  const tipX = C.TIP_X, y = C.LEDGE_Y;
  if (t < T.EMERGE || t >= T.ARENA) return null;
  if (t < T.WALK) return { x: C.START_X, y: C.START_Y, frame: 'i0', flip: false, show: ease(seg(t, T.EMERGE, T.WALK)), step: -1 };
  if (t < T.LOOK) {   // bước đi KHỚP sải chân: thân chỉ tiến khi đổi khung, đúng STRIDE/FRAMES mỗi khung (bàn chân đang chạm đất đứng yên)
    const Wk = S.WALK, f = Math.min(Math.floor((t - T.WALK) * Wk.FPS), Wk.CYCLES * Wk.FRAMES - 1);
    const k = f / (Wk.CYCLES * Wk.FRAMES - 1);
    const sinceContact = Math.min(...Wk.CONTACT.map(cf => ((f - cf) % Wk.FRAMES + Wk.FRAMES) % Wk.FRAMES));
    return { x: C.START_X + f * Wk.STRIDE / Wk.FRAMES / 640, y: lerp(C.START_Y, y, k), frame: 'w' + (f % Wk.FRAMES), flip: false, show: 1,
      step: sinceContact < 3 ? sinceContact / 3 : -1 };   // bụi tung 3 khung sau khi chân trước đặt xuống
  }
  if (t < T.INHALE) {  // nhìn quanh: quay lại sau lưng rồi nhìn ra vực
    const k = seg(t, T.LOOK, T.INHALE);
    return { x: tipX, y, frame: 'i0', flip: k > 0.3 && k < 0.65, show: 1, step: -1 };
  }
  if (t < T.HOWL) return { x: tipX, y, frame: 'i1', flip: false, show: 1, step: -1 };
  if (t < T.CROUCH) return { x: tipX, y, frame: 'i2', flip: false, show: 1, step: -1 };
  if (t < T.LEAP) return { x: tipX, y, frame: 'i3', flip: false, show: 1, step: -1 };
  // phóng lên cao, vượt khỏi khung phía trên (camera ngửa theo)
  const k = seg(t, T.LEAP, T.ARENA);
  return { x: lerp(tipX, tipX + 0.22, k), y: y - 0.9 * ease(k), frame: 'i4', flip: false, show: 1, step: -1 };
}

export function cutsceneState(c) {
  const S = c.S, T = S.T, t = c.t;
  // màn đen chuyển cảnh: tối dần -> sáng dần (2 lần)
  const fade = t < T.CLIFF ? seg(t, T.FADE1, T.CLIFF) : t < T.FADE2 ? 1 - seg(t, T.CLIFF, T.CLIFF + S.FADE_IN)
    : t < T.ARENA ? seg(t, T.FADE2, T.ARENA) : 1 - seg(t, T.ARENA, T.ARENA + S.FADE_IN);
  // cảnh vách: sky = số px trời phía trên ảnh đang thấy (camera ngửa lên). Mở ở trời, hạ dần xuống; lúc sói phóng thì ngửa theo
  const bg = t >= T.CLIFF && t < T.ARENA ? 1 : 0;
  const sky = Math.round(S.SKY * (t < T.LEAP ? 1 - ease(seg(t, T.CLIFF, T.PAN)) : ease(seg(t, T.LEAP, T.ARENA))));
  // camera đấu trường
  const kOut = ease(seg(t, T.OUT, c.dur));
  let fx = c.px, fy = c.py;
  if (t < T.CLIFF) fy = c.py - S.TILT * ease(seg(t, 0, T.CLIFF));                              // ngửa lên trời
  else if (t >= T.ARENA) {                                                                       // từ trên cao hạ xuống điểm đáp, cuối cảnh về người chơi
    const down = ease(seg(t, T.ARENA, T.LAND));
    fx = lerp(c.bx, c.px, kOut); fy = lerp(c.by - 20 - S.TILT * (1 - down), c.py, kOut);
  }
  // cú rơi xuống đấu trường
  let alt = -1, pose = 4;
  if (t >= T.ARENA && t < T.LAND) alt = S.HIGH * (1 - easeIn(seg(t, T.ARENA, T.LAND)));
  else if (t >= T.LAND) { alt = 0; pose = 5; }
  const letter = ease(t / 0.5) * (1 - kOut);
  const name = ease(seg(t, T.NAME, T.NAME + 0.35)) * (1 - ease(seg(t, T.OUT, T.OUT + 0.4)));
  const howl = t >= T.HOWL && t < T.CROUCH ? seg(t, T.HOWL, T.CROUCH) : -1;   // 0..1 trong lúc hú (vòng sóng âm trên vách)
  const landK = t >= T.LAND ? (t - T.LAND) / 0.6 : -1;                         // 0..1 sau khi đáp (bụi, vòng chấn)
  return { kind: c.kind, faceLeft: c.px < c.bx, focusX: fx, focusY: fy, fade, bg, sky, cliff: cliffActor(c, t), cliffCfg: S.CLIFF,
    alt, pose, letter, name, howl, landK, bx: c.bx, by: c.by, skippable: c.skippable, title: S.TITLE, sub: S.SUB };
}
