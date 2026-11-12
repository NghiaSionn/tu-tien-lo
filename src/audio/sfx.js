// Âm thanh (M5-05): tổng hợp bằng WebAudio, không dùng file âm thanh nào (không vướng bản quyền).
// - Chỉ bật sau cử chỉ người dùng đầu tiên (chính sách autoplay của trình duyệt).
// - Chống phát chồng vô hạn: trần MAX_VOICES tiếng cùng lúc + mỗi loại có khoảng nghỉ tối thiểu (GAP).
// - Âm lượng hiệu ứng / nhạc / tắt tiếng lấy từ meta.settings (lưu qua tải lại).
export const MAX_VOICES = 10;
export const GAP = { hit: 0.05, pickup: 0.06, card: 0.15, evolve: 0.5, boss: 1, warn: 0.25, med: 0.8, strike: 0.08, hurt: 0.12, win: 2, lose: 2, ui: 0.08 };

let ac = null, master = null, sfxBus = null, musicBus = null, voices = 0, music = null;
const last = {};
let settings = { sfx: 0.7, music: 0.4, mute: false };

// ctx tiêm vào được (test); mặc định AudioContext của trình duyệt
export function unlockAudio(Ctx) {
  if (ac) return;
  const C = Ctx || (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext));
  if (!C) return;
  ac = new C();
  master = ac.createGain(); master.connect(ac.destination);
  sfxBus = ac.createGain(); sfxBus.connect(master);
  musicBus = ac.createGain(); musicBus.connect(master);
  applyAudioSettings(settings);
}

export function applyAudioSettings(s) {
  settings = { ...settings, sfx: s.sfx ?? settings.sfx, music: s.music ?? settings.music, mute: s.mute ?? settings.mute };
  if (!ac) return;
  master.gain.value = settings.mute ? 0 : 1;
  sfxBus.gain.value = settings.sfx;
  musicBus.gain.value = settings.music * 0.35;
}

// một nốt: dạng sóng, tần số đầu/cuối, thời lượng, âm lượng; noise = nhiễu lọc dải
function tone(type, f0, f1, dur, vol, delay = 0, noise = false) {
  const t = ac.currentTime + delay;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let src;
  if (noise) {
    const len = Math.ceil(ac.sampleRate * dur), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    src = ac.createBufferSource(); src.buffer = buf;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    src.connect(bp); bp.connect(g);
  } else {
    src = ac.createOscillator(); src.type = type;
    src.frequency.setValueAtTime(f0, t); src.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    src.connect(g);
  }
  g.connect(sfxBus);
  voices++; src.onended = () => { voices = Math.max(0, voices - 1); };
  src.start(t); src.stop(t + dur + 0.02);
}

const RECIPES = {
  hit: () => tone('square', 520, 260, 0.06, 0.05),
  pickup: () => tone('sine', 880, 1320, 0.07, 0.04),
  card: () => { tone('triangle', 660, 990, 0.12, 0.08); tone('triangle', 990, 1320, 0.12, 0.06, 0.06); },
  evolve: () => { for (let i = 0; i < 4; i++) tone('triangle', 440 * (1 + i * 0.25), 660 * (1 + i * 0.25), 0.3, 0.08, i * 0.08); },
  boss: () => { tone('sawtooth', 110, 55, 1.0, 0.12); tone('', 300, 80, 0.8, 0.08, 0, true); },
  warn: () => tone('square', 300, 300, 0.09, 0.04),
  med: () => { tone('sine', 220, 220, 1.2, 0.05); tone('sine', 330, 330, 1.2, 0.03); },
  strike: () => { tone('', 2400, 300, 0.35, 0.12, 0, true); tone('square', 180, 60, 0.25, 0.06); },
  hurt: () => tone('sawtooth', 200, 90, 0.12, 0.07),
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.35, 0.08, i * 0.12)),
  lose: () => [392, 330, 262].forEach((f, i) => tone('triangle', f, f * 0.98, 0.4, 0.07, i * 0.15)),
  ui: () => tone('sine', 700, 700, 0.04, 0.03),
};
export const SOUND_NAMES = Object.keys(RECIPES);

// Phát một âm; trả về false nếu bị bỏ qua (chưa mở khóa, tắt tiếng, quá nhiều tiếng, chưa hết khoảng nghỉ)
export function play(name) {
  if (!ac || settings.mute || settings.sfx <= 0 || !RECIPES[name]) return false;
  const now = ac.currentTime;
  if (voices >= MAX_VOICES || now - (last[name] ?? -9) < (GAP[name] ?? 0.05)) return false;
  last[name] = now;
  RECIPES[name]();
  return true;
}

// Nhạc nền: ngũ cung chậm tự sinh, rất nhỏ (ambient tu tiên). Một vòng lặp duy nhất.
const SCALE = [196, 220, 262, 294, 330, 392, 440];
export function startMusic() {
  if (!ac || music) return;
  music = setInterval(() => {
    if (!ac || settings.mute || settings.music <= 0) return;
    const t = ac.currentTime, f = SCALE[Math.floor(Math.random() * SCALE.length)];
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = f / (Math.random() < 0.5 ? 2 : 1);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 4.1);
  }, 1600);
}

export const audioState = () => ({ unlocked: !!ac, voices, ...settings });
export function _resetForTest() { if (music) clearInterval(music); ac = master = sfxBus = musicBus = music = null; voices = 0; for (const k in last) delete last[k]; }
