// M10-12: số liệu chiến đấu của một lượt (thuần logic, tất định, rẻ). Chỉ được GHI ra nhật ký playtest khi người chơi đã bật
// (PT opt-in, lưu trên máy, không gửi mạng). Không chứa định danh: chỉ nguồn đòn, thời gian trong lượt, cờ tính năng.
import { inCameraView } from './director.js';

export const TELE = { SAMPLE_EVERY: 10, MAX_FRAMES: 20000 };

export function createTele() {
  return { hits: {}, lastHit: null, threatPeak: 0, peakMonsters: 0, peakShots: 0, boss: {}, frames: [], work: [], tick: 0 };
}

// gọi trong hurtRunPlayer khi người chơi thật sự mất máu
export function teleHit(tele, src) {
  if (!tele) return;
  tele.hits[src] = (tele.hits[src] || 0) + 1;
  tele.lastHit = src;
}

// gọi cuối mỗi tick updateRun: trần quái/đạn, số đòn đặc biệt đang gồng trong khung nhìn, mốc boss (xuất hiện / pha 2 / hạ)
export function teleTick(run, player) {
  const t = run.tele; if (!t) return;
  const sc = run.scene;
  t.peakMonsters = Math.max(t.peakMonsters, sc.monsters.length);
  t.peakShots = Math.max(t.peakShots, sc.enemyShots.length);
  for (const m of sc.monsters) {
    if (!m.boss) continue;
    const b = t.boss[m.bossKind] || (t.boss[m.bossKind] = { start: Math.round(run.time * 10) / 10 });
    if (m.p2 && b.p2 === undefined) b.p2 = Math.round(run.time * 10) / 10;
  }
  for (const [k, key] of [['MINI', 'mini'], ['FINAL', 'final']]) {   // boss chết bị dọn khỏi danh sách ngay -> lấy mốc hạ từ director
    const b = t.boss[k];
    if (b && b.end === undefined && run.dir && run.dir[key] === 'DEAD') b.end = Math.round(run.time * 10) / 10;
  }
  if (++t.tick % TELE.SAMPLE_EVERY) return;
  let n = 0;
  for (const m of sc.monsters) if (!m.dead && (m.st === 'windup' || m.st === 'dash' || m.st === 'sweep' || m.st === 'blink') && inCameraView(sc.map, player, m.x, m.y, 0)) n++;
  n += sc.hazards.length > 0 ? 1 : 0;   // vùng boss đang chờ nổ tính là một mối đe dọa
  t.threatPeak = Math.max(t.threatPeak, n);
}

// trình duyệt: thời gian khung (work = xử lý + vẽ, gap = khoảng giữa hai khung)
export function teleFrame(tele, work, gap) {
  if (!tele || tele.work.length >= TELE.MAX_FRAMES) return;
  tele.work.push(work); tele.frames.push(gap);
}

const q = (a, p) => { if (!a.length) return undefined; const s = a.slice().sort((x, y) => x - y); return Math.round(s[Math.min(s.length - 1, Math.floor(s.length * p))] * 10) / 10; };

// tóm tắt gửi vào nhật ký playtest (danh sách trắng ở playtest.js EVENTS.combat_run)
export function teleSummary(run, flags = {}) {
  const t = run.tele || createTele();
  const boss = {};
  for (const [k, b] of Object.entries(t.boss)) boss[k] = { start: b.start, p2: b.p2, end: b.end, dur: b.end !== undefined ? Math.round((b.end - b.start) * 10) / 10 : undefined };
  const dmg = {};
  for (const [k, v] of Object.entries(run.dmgBy || {})) dmg[k] = Math.round(v);
  return {
    outcome: run.outcome, runTime: Math.round(run.time), startSkill: run.startSkill ?? (run.skills && run.skills[0] && run.skills[0].id), difficulty: run.diff || 0, realm: run.realmLevel,
    deathCause: run.outcome === 'LOSE' ? t.lastHit : undefined,
    hitsBy: { ...t.hits }, dmgBy: dmg, threatPeak: t.threatPeak, peakMonsters: t.peakMonsters, peakShots: t.peakShots, boss,
    flags: { tactics: !!flags.tactics, skillsV2: !!flags.skillsV2, bossV2: !!flags.bossV2 },
    workP50: q(t.work, 0.5), workP95: q(t.work, 0.95), frameP50: q(t.frames, 0.5), frameP95: q(t.frames, 0.95),
  };
}
