// M7-04: nhật ký playtest tại máy. Mặc định TẮT, người chơi tự bật trong Cài đặt.
// - Lưu riêng khóa PLAYTEST.KEY, không đụng save (tutien_save_v1 / v2).
// - Không gửi network. Chỉ xuất file khi người chơi bấm.
// - Mỗi sự kiện chỉ giữ các trường trong danh sách trắng; không tên, email, IP, clipboard, thời gian tuyệt đối.
export const PLAYTEST = { KEY: 'tutien_playtest_v1', SCHEMA: 1, MAX_EVENTS: 3000 };

// type -> các trường payload được phép
export const EVENTS = {
  session_start: ['sessionNo', 'day', 'realm', 'runs'],
  run_start: ['skill', 'difficulty', 'realm', 'runInSession'],
  second_run_start: ['runInSession'],
  first_card: ['card', 'cardType', 'level', 'time'],
  card_picked: ['card', 'cardType', 'level', 'time'],
  evolution: ['evo', 'time'],
  miniboss_result: ['result', 'time'],
  run_end: ['outcome', 'time', 'level', 'kills', 'cause', 'evolutions', 'difficulty'],
  meta_action: ['action', 'ok', 'realm'],
  session_end: ['duration', 'runsInSession'],
};
const CSV_COLS = ['v', 'build', 'tid', 'session', 'day', 't', 'plat', 'type', 'runId', 'seed',
  ...[...new Set(Object.values(EVENTS).flat())].filter(k => !['sessionNo', 'day'].includes(k))];
const DAY = 86400000;

// storage: giống localStorage; now(): ms tăng dần trong phiên; clock(): Date.now (chỉ để tính "ngày thứ mấy", không ghi ra)
export function createPlaytestLog({ storage, build = 'dev', platform = 'desktop', now = () => performance.now(), clock = () => Date.now(), rand = Math.random } = {}) {
  let st = read();
  const t0 = now();
  let session = 0, day = 0, started = false, ended = false, runsInSession = 0;
  const once = new Set();

  function read() {
    try {
      const s = JSON.parse(storage.getItem(PLAYTEST.KEY));
      if (s && Array.isArray(s.events)) return s;
    } catch (e) { /* hỏng -> làm lại từ đầu, chỉ ảnh hưởng log, không đụng save */ }
    return { schemaVersion: PLAYTEST.SCHEMA, enabled: false, tid: null, firstDay: null, sessions: 0, events: [], dropped: 0 };
  }
  function write() {
    for (let k = 0; k < 4; k++) {
      try { storage.setItem(PLAYTEST.KEY, JSON.stringify(st)); return true; }
      catch (e) {                                             // bộ nhớ đầy: bỏ bớt sự kiện cũ nhất rồi thử lại
        const n = Math.max(1, Math.ceil(st.events.length * 0.25));
        if (!st.events.length) return false;
        st.events.splice(0, n); st.dropped += n;
      }
    }
    return false;
  }
  function startSession(extra) {
    if (started || !st.enabled) return;
    started = true;
    st.sessions = (st.sessions || 0) + 1; session = st.sessions;
    day = Math.max(0, Math.floor((clock() - st.firstDay) / DAY));
    push('session_start', { sessionNo: session, day, ...extra });
  }
  function push(type, payload = {}, run = null) {
    const allow = EVENTS[type];
    const e = { v: PLAYTEST.SCHEMA, build, tid: st.tid, session, day, t: Math.round(now() - t0), plat: platform, type };
    if (run) { e.runId = `${session}-${run.id}`; e.seed = run.seed; }
    for (const k of allow) if (payload[k] !== undefined) e[k] = payload[k];
    st.events.push(e);
    if (st.events.length > PLAYTEST.MAX_EVENTS) { const n = st.events.length - PLAYTEST.MAX_EVENTS; st.events.splice(0, n); st.dropped += n; }
    write();
    return true;
  }
  const api = {
    get enabled() { return st.enabled; },
    get count() { return st.events.length; },
    get testId() { return st.tid; },
    get dropped() { return st.dropped; },
    // ctx: hàm trả trường cho session_start (realm, runs) khi bật giữa chừng
    setEnabled(on, ctx = () => ({})) {
      st.enabled = !!on;
      if (on && !st.tid) { st.tid = 'T' + Math.floor(rand() * 36 ** 6).toString(36).padStart(6, '0'); st.firstDay = clock(); }
      write();
      if (on) startSession(ctx());
    },
    sessionStart(extra = {}) { startSession(extra); },
    log(type, payload = {}, run = null) {
      if (!st.enabled || !EVENTS[type]) return false;
      if (!started) startSession({});
      if (type === 'run_start') {
        runsInSession++;
        push('run_start', { ...payload, runInSession: runsInSession }, run);
        if (runsInSession === 2) push('second_run_start', { runInSession: 2 }, run);
        return true;
      }
      if (type === 'run_end' || type === 'first_card' || type === 'miniboss_result') {
        const key = `${type}:${run ? run.id : ''}`;                 // mỗi run chỉ một lần
        if (once.has(key)) return false;
        once.add(key);
      }
      return push(type, payload, run);
    },
    sessionEnd() {
      if (ended || !started || !st.enabled) return false;
      ended = true;
      return push('session_end', { duration: Math.round((now() - t0) / 1000), runsInSession });
    },
    clear() { st.events = []; st.dropped = 0; write(); },
    exportJSON() {
      return JSON.stringify({ schemaVersion: PLAYTEST.SCHEMA, build, testId: st.tid, sessions: st.sessions, dropped: st.dropped, events: st.events }, null, 1);
    },
    exportCSV() {
      const q = v => v === undefined || v === null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
      return [CSV_COLS.join(','), ...st.events.map(e => CSV_COLS.map(c => q(Array.isArray(e[c]) ? e[c].join('|') : e[c])).join(','))].join('\n');
    },
  };
  return api;
}

// Tóm tắt funnel từ file xuất (dùng chung cho tools/playtest_funnel.mjs và test)
export function funnel(events) {
  const by = type => events.filter(e => e.type === type);
  const testers = new Set(events.map(e => e.tid));
  const sessions = new Set(by('session_start').map(e => `${e.tid}:${e.session}`));
  const runs = by('run_start'), ends = by('run_end');
  const count = (list, f) => list.filter(f).length;
  return {
    testers: testers.size,
    sessions: sessions.size,
    sessionsWithRun: new Set(runs.map(e => `${e.tid}:${e.session}`)).size,
    runs: runs.length,
    firstCard: by('first_card').length,
    miniKilled: count(by('miniboss_result'), e => e.result === 'killed'),
    finalWin: count(ends, e => e.outcome === 'WIN'),
    runEnd: ends.length,
    secondRun: by('second_run_start').length,
    causes: ends.filter(e => e.outcome === 'LOSE').reduce((m, e) => (m[e.cause || '?'] = (m[e.cause || '?'] || 0) + 1, m), {}),
    returnDays: [...testers].map(t => Math.max(0, ...by('session_start').filter(e => e.tid === t).map(e => e.day || 0))),
  };
}
