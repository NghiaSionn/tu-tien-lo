// M7-08: Công Pháp Đồ Giám dựng từ dữ liệu
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCodex, newDiscoveries } from '../src/progression/codex.js';
import { SKILLS, EVOLUTIONS } from '../src/data/skills.js';
import { KEYS, loadSave, writeSave, memoryStorage, defaultMeta } from '../src/persistence/save.js';
import { makeHubMap } from '../src/world/map.js';

const map = makeHubMap();
const ctx = { canStand: map.canStand, hubSpawn: { x: map.cx, y: map.cy + 26 } };

test('đủ 12 công pháp và 6 tiến hóa (M7-12 thêm 2), lấy từ dữ liệu', () => {
  const c = buildCodex(defaultMeta(ctx.hubSpawn));
  assert.equal(c.skills.length, Object.values(SKILLS).filter(d => d.implemented).length);
  assert.equal(c.skills.length, 12);
  assert.equal(c.evolutions.length, Object.keys(EVOLUTIONS).length);
  assert.equal(c.evolutions.length, 6);
});

test('công pháp khóa: giấu tên, nêu cách mở; mở rồi thì hiện tên', () => {
  const m = defaultMeta(ctx.hubSpawn);
  const lock = buildCodex(m).skills.find(s => s.id === 'wind_step');
  assert.equal(lock.state, 'locked'); assert.equal(lock.name, undefined);
  assert.match(lock.how, /Lịch Luyện/);
  assert.match(buildCodex(m).skills.find(s => s.id === 'ice_needle').how, /Truyền Thừa Các/);
  m.unlocks.skills.push('wind_step');
  const open = buildCodex(m).skills.find(s => s.id === 'wind_step');
  assert.equal(open.state, 'open'); assert.equal(open.name, 'Phong Ảnh Bộ');
});

test('tiến hóa chưa khám phá: chỉ có manh mối, không lộ tên hay công thức', () => {
  const m = defaultMeta(ctx.hubSpawn);
  const u = buildCodex(m).evolutions.find(e => e.id === 'loi_dinh_van_kiem');
  assert.equal(u.state, 'unknown'); assert.equal(u.name, undefined); assert.equal(u.recipe, undefined);
  assert.doesNotMatch(u.clue, /Kiếm Khí|Lôi Kích|Lôi Vực/);
  m.stats.evos.push('loi_dinh_van_kiem');
  const f = buildCodex(m).evolutions.find(e => e.id === 'loi_dinh_van_kiem');
  assert.equal(f.state, 'found'); assert.equal(f.name, 'Lôi Đình Vạn Kiếm'); assert.ok(f.recipe);
});

test('công pháp mở theo cảnh giới chỉ là "khởi đầu được" khi đủ cảnh giới', () => {
  const m = defaultMeta(ctx.hubSpawn);
  const sa = buildCodex(m).skills.find(s => s.id === 'sword_array');
  assert.equal(sa.state, 'open'); assert.equal(sa.start, false); assert.match(sa.startAt, /Trúc Cơ/);
  m.realmLevel = 9;
  assert.equal(buildCodex(m).skills.find(s => s.id === 'sword_array').start, true);
});

test('khám phá lần đầu và lưu qua save; save v1 cũ migrate vẫn dựng được', () => {
  assert.deepEqual(newDiscoveries(['a'], ['a', 'hoa_long_quyen', 'khong_ton_tai']), ['hoa_long_quyen']);
  const st = memoryStorage({});
  const m = defaultMeta(ctx.hubSpawn); m.stats.evos.push('hoa_long_quyen'); m.unlocks.skills.push('spirit_orb');
  writeSave(st, m);
  const back = loadSave(st, ctx).meta;
  const c = buildCodex(back);
  assert.equal(c.evolutions.find(e => e.id === 'hoa_long_quyen').state, 'found');
  assert.equal(c.skills.find(s => s.id === 'spirit_orb').state, 'open');
  const v1 = loadSave(memoryStorage({ [KEYS.V1]: '{"L":3,"tuvi":40.5,"hp":120,"stones":77,"pills":4,"x":700,"y":520}' }), ctx).meta;
  const c1 = buildCodex(v1);
  assert.equal(c1.counts.found, 0); assert.equal(c1.counts.total, 12);
});
