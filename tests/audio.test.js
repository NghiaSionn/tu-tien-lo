// M5-05: âm thanh tổng hợp — không phát chồng vô hạn, tắt tiếng chuẩn, chưa mở khóa thì im
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unlockAudio, applyAudioSettings, play, audioState, MAX_VOICES, SOUND_NAMES, _resetForTest } from '../src/audio/sfx.js';
import { sanitizeMeta } from '../src/persistence/save.js';

// AudioContext giả: đủ API mà sfx.js dùng; đồng hồ do test điều khiển; nguồn không bao giờ tự kết thúc
function FakeCtx() {
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ connect() {}, gain: param(), frequency: param(), type: '' });
  const ctx = {
    currentTime: 0, sampleRate: 8000, destination: node(),
    createGain: node, createBiquadFilter: node,
    createOscillator: () => ({ ...node(), start() {}, stop() {}, onended: null }),
    createBufferSource: () => ({ ...node(), buffer: null, start() {}, stop() {}, onended: null }),
    createBuffer: (c, len) => ({ getChannelData: () => new Float32Array(len) }),
  };
  FakeCtx.last = ctx;
  return ctx;
}

test('chưa có cử chỉ người dùng (chưa mở khóa) thì không phát', () => {
  _resetForTest();
  assert.equal(play('hit'), false);
  assert.equal(audioState().unlocked, false);
});

test('mỗi loại có khoảng nghỉ; tổng số tiếng cùng lúc có trần', () => {
  _resetForTest(); unlockAudio(FakeCtx); applyAudioSettings({ sfx: 1, music: 0, mute: false });
  const ctx = FakeCtx.last;
  assert.equal(play('hit'), true);
  assert.equal(play('hit'), false, 'cùng khung: bị chặn');
  let played = 0;
  for (let i = 0; i < 500; i++) { ctx.currentTime += 0.2; for (const n of SOUND_NAMES) if (play(n)) played++; }
  assert.ok(audioState().voices <= MAX_VOICES + 6, 'số tiếng ' + audioState().voices);   // một công thức có thể tạo vài nốt
  assert.ok(played < 500 * SOUND_NAMES.length);
});

test('tắt tiếng / âm lượng 0 thì không phát', () => {
  _resetForTest(); unlockAudio(FakeCtx);
  applyAudioSettings({ sfx: 1, music: 1, mute: true });
  FakeCtx.last.currentTime = 10; assert.equal(play('card'), false);
  applyAudioSettings({ mute: false, sfx: 0 });
  FakeCtx.last.currentTime = 20; assert.equal(play('card'), false);
  applyAudioSettings({ sfx: 0.5 });
  FakeCtx.last.currentTime = 30; assert.equal(play('card'), true);
});

test('cài đặt âm thanh/đồ họa lưu qua save và bị kẹp khi sửa bậy', () => {
  const ctx = { canStand: () => true, hubSpawn: { x: 1, y: 1 } };
  const m = sanitizeMeta({ settings: { sfx: 3, music: -1, mute: true, quality: 'ultra' } }, ctx);
  assert.deepEqual([m.settings.sfx, m.settings.music, m.settings.mute, m.settings.quality], [1, 0, true, 'high']);
  const ok = sanitizeMeta({ settings: { sfx: 0.25, music: 0.5, quality: 'low' } }, ctx);
  assert.deepEqual([ok.settings.sfx, ok.settings.music, ok.settings.mute, ok.settings.quality], [0.25, 0.5, false, 'low']);
});

// ---- M5-06: joystick ảo -> 4 phím (logic dùng chung với bàn phím) ----
import { dirsFromVector } from '../src/ui/touch.js';
test('joystick: vùng chết, 8 hướng, kéo xa vẫn đúng hướng', () => {
  assert.deepEqual(dirsFromVector(3, 2, 40), { up: false, down: false, left: false, right: false });
  assert.deepEqual(dirsFromVector(40, 0, 40), { right: true, left: false, down: false, up: false });
  assert.deepEqual(dirsFromVector(-30, -30, 40), { right: false, left: true, down: false, up: true });
  assert.deepEqual(dirsFromVector(0, 400, 40), { right: false, left: false, down: true, up: false });
});
