// Sprite vẽ bằng code (giữ nguyên v0.1). Cần DOM canvas.
import { TILE as T, HUB } from '../core/config.js';
import { hash as rawHash } from '../core/rng.js';

export const hash = (x, y, s) => rawHash(x, y, s, HUB.SEED);

export function makeSprite(rows, pal) {
  const c = document.createElement('canvas');
  c.width = Math.max(...rows.map(r => r.length)); c.height = rows.length;
  const g = c.getContext('2d');
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
  return c;
}
export function makeCanvas(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  fn((x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); }, g);
  return c;
}

const PAL = { k: '#1a1423', h: '#2b2233', s: '#f2c9a0', w: '#e8eef5', b: '#4a7bd0', d: '#2f4f94', r: '#c8443c', g: '#3a2f2a' };
const HEAD_F = ['....kkkk....', '...khhhhk...', '..khhhhhhk..', '..khsssshk..', '..kskssksk..', '..kssssssk..'];
const HEAD_B = ['....kkkk....', '...khhhhk...', '..khhhhhhk..', '..khhhhhhk..', '..khhhhhhk..', '..khhhhhhk..'];
const BODY_F = ['...kwwwwk...', '..kwwbbwwk..', '.kwwwbbwwwk.', '.kswrrrrwsk.', '.kkwwbbwwkk.', '..kwwbbwwk..', '..kwwwwwwk..'];
const BODY_B = ['...kwwwwk...', '..kwwwwwwk..', '.kwwwwwwwwk.', '.kswrrrrwsk.', '.kkwwwwwwkk.', '..kwwwwwwk..', '..kwwwwwwk..'];
const LEGS = [
  ['..kddkkddk..', '..kggkkggk..', '...kk..kk...'],
  ['..kddkkddk..', '..kggk.kk...', '...kk.......'],
  ['..kddkkddk..', '..kggkkggk..', '...kk..kk...'],
  ['..kddkkddk..', '...kk.kggk..', '.......kk...'],
];
const SIDE = ['....kkkk....', '...khhhhk...', '..khhhhhhk..', '..khhhsssk..', '..khhssksk..', '..khhssssk..',
  '...kwwwwk...', '...kwwbwk...', '..kwwwbwwk..', '..kwwrrrsk..', '..kwwwbwkk..', '...kwwbwk...', '...kwwwwk...'];
const SIDE_LEGS = [
  ['...kddddk...', '...kggggk...', '....kkkk....'],
  ['..kddkddk...', '..kggkkggk..', '...kk..kk...'],
];
const SIT = [...HEAD_F, '...kwwwwk...', '..kwwbbwwk..', '.kwwwbbwwwk.', '.kswrrrrwsk.', 'kkwwwbbwwwkk', 'kddwwsswwddk', 'kddddddddddk', '.kkkkkkkkkk.'];

export const SPR = {
  down: LEGS.map(l => makeSprite([...HEAD_F, ...BODY_F, ...l], PAL)),
  up: LEGS.map(l => makeSprite([...HEAD_B, ...BODY_B, ...l], PAL)),
  side: [0, 1, 0, 1].map(i => makeSprite([...SIDE, ...SIDE_LEGS[i]], PAL)),
  sit: makeSprite(SIT, PAL),
};

const BEAST = ['..kk....kk..', '.kcck..kcck.', '.kccckkccck.', 'kcccccccccck', 'kcwkccccwkck', 'kcccccccccck', 'kcccdkkdccck', '.kddddddddk.', '..kkkkkkkk..'];
export const TIERS = [
  { name: 'Dã Lang', c: '#9aa0b4', d: '#646a80' },
  { name: 'Hỏa Hồ', c: '#f08a3c', d: '#b0531f' },
  { name: 'Huyền Băng Thú', c: '#7fdcec', d: '#3f8fb0' },
  { name: 'Ma Ảnh', c: '#a468e0', d: '#5f3596' },
];
// M5-02: mỗi loài một dáng (không chỉ khác màu) — 12x10, chân ở hàng dưới cùng (pivot giữa đáy), hitbox không đổi
const SHAPES = [
  [ // Dã Lang: tai nhọn, mõm thon — đuổi cắn
    '..k......k..', '.kck....kck.', '.kcckkkkcck.', 'kcccccccccck', 'kcwkccccwkck',
    'kcccccccccck', '.kccdkkdcck.', '..kcddddck..', '...kddddk...', '....kkkk....'],
  [ // Hỏa Hồ: tai to, mõm trắng, đuôi lửa bên phải — lao
    '.k......k...', 'kck....kck..', 'kcck..kcck..', 'kccckkccck..', 'kcwkcckwck.y',
    '.kcccccck.yk', '.kcwwwwck.yk', '..kcwwck.yyk', '..kcddck.yk.', '...kkkk..k..'],
  [ // Huyền Băng Thú: thân rộng, sừng băng, chân trụ — bắn xa
    'w.k......k.w', 'wkck....kckw', 'kccckkkkccck', 'kcccccccccck', 'kcwkccccwkck',
    'kcccccccccck', 'kcccddddccck', 'kddddddddddk', 'kdk.kddk.kdk', 'kk...kk...kk'],
  [ // Ma Ảnh: bóng ma không chân, đáy lượn sóng — tinh anh
    '...kkkkkk...', '..kcccccck..', '.kcccccccck.', 'kccwkccwkcck', 'kccwwccwwcck',
    'kcccccccccck', 'kccddccddcck', 'kcdkcddkcdck', 'kdk.kddk.kdk', 'k....kk....k'],
];
TIERS.forEach((t, i) => {
  t.spr = makeSprite(SHAPES[i], { k: '#1a1423', c: t.c, d: t.d, w: '#ffffff', y: '#ffd06a' });
  t.white = makeSprite(SHAPES[i], { k: '#fff', c: '#fff', d: '#fff', w: '#fff', y: '#fff' });
});
export const BEAST_WHITE = makeSprite(BEAST, { k: '#fff', c: '#fff', d: '#fff', w: '#fff' });
// Boss (M2-02): cùng dáng yêu thú, vẽ phóng ×3; Lang Vương bạc có vương miện vàng, Ma Ảnh Yêu Vương đen tím mắt đỏ
const CROWN = ['..y.y.y.y...', '..yyyyyyy...'];
export const BOSS_SPR = {
  MINI: makeSprite([...CROWN, ...SHAPES[0]], { k: '#1a1423', c: '#d6d9e6', d: '#7a7f96', w: '#ffe066', y: '#ffd040' }),
  FINAL: makeSprite(['............', '............', ...SHAPES[3]], { k: '#0c0614', c: '#4a2a6a', d: '#22103a', w: '#ff4040' }),
};

// Ô nền
// M5-01: ô nền vẽ lại theo bảng màu của sprite ChatGPT (cỏ tươi, viền đậm). Ô phải lặp liền mạch nên vẽ bằng code:
// mọi chi tiết (cụm cỏ, hoa, viên đá) nằm trong ô, không chạm mép.
const G = { base: '#5fa64c', shade: '#5b9f49', dark: '#3f7d38', mid: '#6fb653', light: '#8fcd63' };
function tuft(px, x, y) {   // cụm cỏ chữ V: gốc đậm, ngọn sáng
  px(x, y, G.dark); px(x - 1, y - 1, G.dark); px(x + 1, y - 1, G.dark); px(x, y - 1, G.mid);
  px(x - 1, y - 2, G.light); px(x + 1, y - 2, G.light);
}
export const grassTiles = [0, 1, 2, 3, 4, 5, 6, 7].map(v => makeCanvas(T, T, px => {
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const blk = hash(x >> 2, y >> 2, 40 + v), r = hash(x, y, 10 + v);
    px(x, y, r < 0.05 ? G.dark : r > 0.94 ? G.mid : blk < 0.35 ? G.shade : G.base);
  }
  const n = 1 + Math.floor(hash(v, 0, 50) * 3);
  for (let i = 0; i < n; i++) tuft(px, 2 + Math.floor(hash(v, i, 51) * 12), 3 + Math.floor(hash(v, i, 52) * 11));
  if (v === 7) {   // hoa dại (1/8 số ô): trắng/vàng/hồng, tâm đậm
    const cols = [['#f6f2e0', '#e8c060'], ['#f6e27a', '#c89a30'], ['#f3a6c8', '#c86090']];
    for (let i = 0; i < 1; i++) {
      const [c1, c2] = cols[Math.floor(hash(v, i, 53) * 3)], x = 3 + Math.floor(hash(v, i, 54) * 10), y = 3 + Math.floor(hash(v, i, 55) * 10);
      px(x - 1, y, c1); px(x + 1, y, c1); px(x, y - 1, c1); px(x, y + 1, c1); px(x, y, c2);
    }
  }
}));
export const waterTiles = [0, 1].map(v => makeCanvas(T, T, px => {
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) px(x, y, hash(x >> 2, (y + v) >> 2, 60) < 0.3 ? '#3673ba' : '#3a78c0');
  for (let i = 0; i < 3; i++) {
    const y = 3 + i * 5, x = (i * 5 + v * 4) % 11 + 1;
    for (let k = 0; k < 3; k++) px(x + k, y, '#7fb6e8');
    px(x + 1, y - 1, '#b8dcf6');
  }
}));
// bờ nước (mép trên giáp đất): dải đất tối + bóng xuống nước — cho cảm giác mặt nước thấp hơn bờ (3/4)
export const waterBank = makeCanvas(T, 4, px => {
  for (let x = 0; x < T; x++) { px(x, 0, '#4a3a26'); px(x, 1, hash(x, 0, 61) < 0.5 ? '#5c4630' : '#4a3a26'); px(x, 2, '#25507f'); px(x, 3, '#2c5f96'); }
});
// đá lát: 2 hàng viên đá so le, mạch vữa tối, mặt sáng trên-trái, tối dưới-phải, chút rêu
export const stoneTile = makeCanvas(T, T, px => {
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const row = y >> 3, off = row ? 4 : 0, bx = (x + off) & 7, by = y & 7;
    let c = '#b3ab9a';
    if (bx === 0 || by === 0) c = '#7d766a';
    else if (bx === 1 || by === 1) c = '#c8c0ae';
    else if (bx === 7 || by === 7) c = '#958d7d';
    else if (hash(x, y, 20) < 0.07) c = '#a39b8a';
    if (c !== '#7d766a' && hash(x, y, 21) < 0.02) c = '#7f9a5a';
    px(x, y, c);
  }
});
function makeTree(v, pink) {
  const cols = pink ? ['#8a3e63', '#d9779f', '#f3a6c8', '#fbd3e2'] : ['#1f4a2c', '#2f7a3e', '#45a052', '#6fc56a'];
  return makeCanvas(20, 28, px => {
    for (let y = 18; y < 28; y++) for (let x = 8; x < 12; x++) px(x, y, x === 8 || y === 27 ? '#3a2416' : '#6b4226');
    for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) {
      const d = Math.hypot(x + 0.5 - 10, y + 0.5 - 10);
      if (d > 9.5) continue;
      let c = cols[1];
      if (d > 8.5) c = '#14301d';
      else if (Math.hypot(x - 7, y - 6) < 4) c = cols[3];
      else if (y > 12 && d > 5.5) c = cols[0];
      else if (hash(x, y, 30 + v) < 0.3) c = cols[2];
      if (pink && d > 8.5) c = '#5a2440';
      px(x, y, c);
    }
  });
}
export const treeSprs = [makeTree(0), makeTree(1), makeTree(2, true)];
export const rockSpr = makeCanvas(14, 10, px => {
  for (let y = 0; y < 10; y++) for (let x = 0; x < 14; x++) {
    const d = Math.hypot((x + 0.5 - 7) / 7, (y + 0.5 - 5.5) / 4.8);
    if (d > 1) continue;
    px(x, y, d > 0.82 ? '#3d3a45' : (x < 7 && y < 5) ? '#b5b1bd' : y > 6 ? '#6c6877' : '#8f8b9a');
  }
});


export const BOSS_WHITE = Object.fromEntries(Object.entries({ MINI: [...CROWN, ...SHAPES[0]], FINAL: ['............', '............', ...SHAPES[3]] })
  .map(([k, rows]) => [k, makeSprite(rows, { k: '#fff', c: '#fff', d: '#fff', w: '#fff', y: '#fff' })]));
