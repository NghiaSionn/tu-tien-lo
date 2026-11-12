// Kiểm cú pháp mọi file JS chạy trong trình duyệt (main.js/ui.js không được test nào khác nạp vào).
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : []; });

test('mọi file src/*.js và lib/*.js đúng cú pháp', () => {
  const files = [...walk('src'), ...walk('lib')];
  assert.ok(files.length > 10);
  for (const f of files) {
    try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
    catch (e) { assert.fail(`${f}: ${String(e.stderr).split('\n').slice(0, 4).join(' ')}`); }
  }
});
