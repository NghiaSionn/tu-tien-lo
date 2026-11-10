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
TIERS.forEach(t => { t.spr = makeSprite(BEAST, { k: '#1a1423', c: t.c, d: t.d, w: '#ffffff' }); });
export const BEAST_WHITE = makeSprite(BEAST, { k: '#fff', c: '#fff', d: '#fff', w: '#fff' });

// Ô nền
export const grassTiles = [0, 1, 2, 3].map(v => makeCanvas(T, T, px => {
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const r = hash(x, y, 10 + v);
    px(x, y, r < 0.06 ? '#4a8f45' : r > 0.95 ? '#7cc264' : '#5da552');
  }
  if (v === 3) { px(5, 6, '#f6e27a'); px(11, 10, '#f3a6c8'); }
}));
export const waterTiles = [0, 1].map(v => makeCanvas(T, T, px => {
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) px(x, y, '#3f7fc4');
  for (let i = 0; i < 3; i++) { const y = 3 + i * 5, x = (i * 5 + v * 4) % 12; for (let k = 0; k < 4; k++) px(x + k, y, '#7fb6e8'); }
}));
export const stoneTile = makeCanvas(T, T, px => {
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const edge = x === 0 || y === 0;
    px(x, y, edge ? '#857f72' : hash(x, y, 20) < 0.08 ? '#9a9486' : '#aea898');
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

