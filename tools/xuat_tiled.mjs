// Xuất sảnh tông môn HIỆN TẠI của game ra JSON trung gian để tools/xuat_tiled.py dựng file Tiled (.tmx).
// Dùng: node tools/xuat_tiled.mjs > <tmp>/sanh_game.json
import { makeSectMap } from '../src/world/map.js';
import { HUB } from '../src/core/config.js';
import { PLAZA } from '../src/data/sect_plaza.js';

const m = makeSectMap(), S = m.sect, T = 16;
const tiles = [], solid = [];
for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { tiles.push(m.tileAt(x, y)); solid.push(m.solidTile(x, y) ? 1 : 0); }
const out = {
  w: m.w, h: m.h, tile: T, cx: m.cx, cy: m.cy, tiles, solid,
  plaza: { anchor: PLAZA.anchor, scale: PLAZA.scale },
  spawn: { x: m.cx + HUB.RESPAWN.dx, y: m.cy + HUB.RESPAWN.dy },
  buildings: S.buildings.map(b => ({ id: b.id, name: b.name, foot: b.footPx, door: b.doorPx, them: b.them && { kind: b.them.kind, x: b.them.x, y: b.them.y } })),
  props: S.props.map(o => ({ s: o.s, x: o.x, y: o.y, flat: o.flat })),
  pen: { name: S.pen.name, x: S.pen.px, y: S.pen.py, w: S.pen.pw, h: S.pen.ph, door: S.pen.doorPx },
  portal: S.portal, bia: S.bia,
};
process.stdout.write(JSON.stringify(out));
