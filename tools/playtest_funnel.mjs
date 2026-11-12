// M7-04: đọc các file log playtest người chơi xuất (.json) và in funnel cơ bản.
// Dùng: node tools/playtest_funnel.mjs log1.json log2.json ...   (hoặc một thư mục chứa các file .json)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { funnel } from '../src/systems/playtest.js';

const files = process.argv.slice(2).flatMap(p => statSync(p).isDirectory() ? readdirSync(p).filter(f => f.endsWith('.json')).map(f => join(p, f)) : [p]);
if (!files.length) { console.log('Dùng: node tools/playtest_funnel.mjs <file.json|thư mục> ...'); process.exit(1); }

const events = [];
for (const f of files) {
  try {
    const d = JSON.parse(readFileSync(f, 'utf8'));
    if (!Array.isArray(d.events)) throw new Error('không có events');
    events.push(...d.events);
  } catch (e) { console.warn(`Bỏ qua ${f}: ${e.message}`); }
}
const f = funnel(events);
const pct = (n, d) => d ? ` (${Math.round(n / d * 100)}%)` : '';
console.log(`${files.length} file · ${f.testers} người thử · ${events.length} sự kiện`);
console.log('');
console.log(`Phiên chơi               ${f.sessions}`);
console.log(`Phiên có vào bí cảnh     ${f.sessionsWithRun}${pct(f.sessionsWithRun, f.sessions)}`);
console.log(`Lượt bí cảnh             ${f.runs}`);
console.log(`Chọn thẻ đầu tiên        ${f.firstCard}${pct(f.firstCard, f.runs)}`);
console.log(`Hạ mini boss             ${f.miniKilled}${pct(f.miniKilled, f.runs)}`);
console.log(`Thắng boss cuối          ${f.finalWin}${pct(f.finalWin, f.runs)}`);
console.log(`Kết thúc lượt (run_end)  ${f.runEnd}${pct(f.runEnd, f.runs)}`);
console.log(`Tự vào lượt thứ 2        ${f.secondRun}${pct(f.secondRun, f.sessionsWithRun)} (mẫu số: phiên có vào bí cảnh)`);
console.log('');
console.log('Thua vì:', Object.entries(f.causes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}×${v}`).join(', ') || '-');
console.log('Quay lại sau (ngày lớn nhất mỗi người, chỉ có khi người chơi xuất log sau nhiều ngày):', f.returnDays.join(', ') || '-');
console.log('\nLưu ý: mẫu nhỏ, không suy rộng retention. Xem docs/playtest/HUONG_DAN_LOG_PLAYTEST.md');
