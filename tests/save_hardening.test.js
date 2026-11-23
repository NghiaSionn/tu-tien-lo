// M9-C: gia cố save — mã kiểm tra, bản từ phiên bản mới hơn, bản ngày trước, lỗi ghi, khôi phục dự phòng. Không đụng tutien_save_v1.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSave, writeSave, importSave, listBackups, restoreBackup, defaultMeta, memoryStorage, KEYS, VERSION, checksum, parseWrapped } from '../src/persistence/save.js';

const ctx = { hubSpawn: { x: 100, y: 100 }, canStand: () => true };
const DAY = 86400000, T0 = 20000 * DAY + 3600000;
const metaWith = (o = {}) => ({ ...defaultMeta(ctx.hubSpawn), ...o });

test('bản lưu có mã kiểm tra; sửa tay/hỏng nội dung -> coi là hỏng, khôi phục bản trước, cất bản hỏng', () => {
  const st = memoryStorage();
  writeSave(st, metaWith({ linhThach: 10 }), T0);
  writeSave(st, metaWith({ linhThach: 20 }), T0 + 1000);
  const v = JSON.parse(st.getItem(KEYS.V2));
  assert.equal(v.sum, checksum(JSON.stringify(v.meta)));
  v.meta.linhThach = 999999;   // sửa tay nhưng vẫn là JSON hợp lệ
  st.setItem(KEYS.V2, JSON.stringify(v));
  const r = loadSave(st, ctx);
  assert.equal(r.source, 'v2_bak'); assert.equal(r.meta.linhThach, 10); assert.ok(r.recovered);
  assert.ok(st.getItem(KEYS.V2_CORRUPT).includes('999999'));
});

test('save cũ chưa có mã kiểm tra vẫn đọc bình thường (tương thích ngược, cả bản trên mây)', () => {
  const st = memoryStorage({ [KEYS.V2]: JSON.stringify({ version: VERSION, savedAt: 1, meta: metaWith({ linhThach: 7 }) }) });
  const r = loadSave(st, ctx);
  assert.equal(r.source, 'v2'); assert.equal(r.meta.linhThach, 7);
  assert.equal(parseWrapped(st.getItem(KEYS.V2), ctx).meta.linhThach, 7);
});

test('save do phiên bản game mới hơn ghi: không bị coi là hỏng, cất nguyên văn ở ô riêng, không mất khi bản cũ ghi đè', () => {
  const futureRaw = JSON.stringify({ version: VERSION + 1, savedAt: 5, meta: { realmLevel: 17, newField: 1 } });
  const st = memoryStorage({ [KEYS.V2]: futureRaw });
  const r = loadSave(st, ctx);
  assert.ok(r.future); assert.equal(st.getItem(KEYS.V2_CORRUPT), null, 'không xếp vào bản hỏng');
  assert.equal(st.getItem(KEYS.V2_FUTURE), futureRaw);
  writeSave(st, r.meta, T0); writeSave(st, r.meta, T0 + 1);
  assert.equal(st.getItem(KEYS.V2_FUTURE), futureRaw, 'bản mới hơn vẫn còn nguyên sau khi ghi đè');
  assert.equal(importSave(futureRaw, ctx).ok, false);
  assert.ok(listBackups(st, ctx).some(b => b.key === KEYS.V2_FUTURE && !b.ok));
});

test('ghi đè lên bản mới hơn (chưa từng đọc) cũng tự cất trước', () => {
  const futureRaw = JSON.stringify({ version: VERSION + 3, savedAt: 9, meta: { realmLevel: 5 } });
  const st = memoryStorage({ [KEYS.V2]: futureRaw });
  writeSave(st, metaWith(), T0);
  assert.equal(st.getItem(KEYS.V2_FUTURE), futureRaw);
});

test('bản "ngày trước": giữ bản cuối của ngày hôm trước, không đổi khi lưu nhiều lần trong ngày', () => {
  const st = memoryStorage();
  writeSave(st, metaWith({ linhThach: 1 }), T0);
  writeSave(st, metaWith({ linhThach: 2 }), T0 + 3600000);   // cùng ngày
  assert.equal(st.getItem(KEYS.V2_DAILY), null);
  writeSave(st, metaWith({ linhThach: 3 }), T0 + DAY);       // sang ngày mới
  assert.equal(JSON.parse(st.getItem(KEYS.V2_DAILY)).meta.linhThach, 2);
  writeSave(st, metaWith({ linhThach: 4 }), T0 + DAY + 60000);
  assert.equal(JSON.parse(st.getItem(KEYS.V2_DAILY)).meta.linhThach, 2, 'trong ngày không xoay');
  writeSave(st, metaWith({ linhThach: 5 }), T0 + 2 * DAY);
  assert.equal(JSON.parse(st.getItem(KEYS.V2_DAILY)).meta.linhThach, 4);
});

test('bộ nhớ đầy: lỗi ghi bản sao lưu không chặn bản chính; lỗi ghi bản chính ném ra và giữ nguyên bản cũ', () => {
  const base = memoryStorage();
  writeSave(base, metaWith({ linhThach: 1 }), T0);
  const dump = base.dump();
  const failOn = keys => { const s = memoryStorage(dump); const set = s.setItem; s.setItem = (k, v) => { if (keys.includes(k)) throw new Error('QuotaExceededError'); set(k, v); }; return s; };
  const a = failOn([KEYS.V2_BAK, KEYS.V2_DAILY, KEYS.V1_BACKUP]);
  writeSave(a, metaWith({ linhThach: 2 }), T0 + DAY);
  assert.equal(loadSave(a, ctx).meta.linhThach, 2);
  const b = failOn([KEYS.V2]);
  assert.throws(() => writeSave(b, metaWith({ linhThach: 3 }), T0 + DAY));
  assert.equal(loadSave(b, ctx).meta.linhThach, 1, 'bản cũ còn nguyên');
});

test('danh sách / khôi phục dự phòng: liệt kê ô đọc được, khôi phục đúng nội dung, từ chối khóa không phải ô dự phòng', () => {
  const st = memoryStorage({ [KEYS.V1]: JSON.stringify({ L: 3, tuvi: 10, hp: 50, stones: 40, pills: 2, x: 100, y: 100 }) });
  writeSave(st, metaWith({ linhThach: 11 }), T0);
  writeSave(st, metaWith({ linhThach: 12 }), T0 + DAY);
  writeSave(st, metaWith({ linhThach: 13 }), T0 + DAY + 1);
  const list = listBackups(st, ctx);
  const keys = list.map(b => b.key);
  for (const k of [KEYS.V2_BAK, KEYS.V2_DAILY, KEYS.V1_BACKUP, KEYS.V1]) assert.ok(keys.includes(k), 'thiếu ' + k);
  assert.equal(list.find(b => b.key === KEYS.V2_BAK).linhThach, 12);
  assert.equal(restoreBackup(st, KEYS.V2_DAILY, ctx).meta.linhThach, 11);
  assert.equal(restoreBackup(st, KEYS.V1, ctx).meta.realmLevel, 3);
  assert.equal(restoreBackup(st, 'tutien_playtest_v1', ctx).ok, false);
  assert.equal(restoreBackup(st, KEYS.V2, ctx).ok, false, 'khóa chính không phải ô dự phòng');
});

test('tutien_save_v1 không bao giờ bị ghi hay xóa qua mọi thao tác', () => {
  const v1 = JSON.stringify({ L: 2, tuvi: 5, hp: 40, stones: 9, pills: 1, x: 100, y: 100 });
  const st = memoryStorage({ [KEYS.V1]: v1 });
  const seen = [];
  const set = st.setItem; st.setItem = (k, v) => { seen.push(k); set(k, v); };
  const r = loadSave(st, ctx);
  for (let i = 0; i < 5; i++) writeSave(st, r.meta, T0 + i * DAY);
  listBackups(st, ctx); restoreBackup(st, KEYS.V1_BACKUP, ctx);
  assert.equal(st.getItem(KEYS.V1), v1);
  assert.ok(!seen.includes(KEYS.V1), 'đã ghi vào tutien_save_v1');
  assert.equal(st.getItem(KEYS.V1_BACKUP), v1);
});
