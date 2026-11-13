// Giao diện DOM: HUD động phủ, HUD bí cảnh, các bảng (chuẩn bị, chọn thẻ, kết quả, tạm dừng, cài đặt), nhật ký.
import { RUN, ITEMS, BOSS, TRIBULATION, DIFFICULTY, REALM_UNLOCKS } from '../core/config.js';
import { levelName, maxHp, atk, need, isMajor, MAX_L } from '../progression/realm.js';
import { xpToNext } from '../progression/runxp.js';
import { canBreak, isFull, convertRate, yieldOf, trickleRate, pillQi } from '../systems/cultivation.js';
import { SKILLS, ELEMENTS, PASSIVES } from '../data/skills.js';
import { elementName, evolutionHint } from '../progression/draft.js';
import { skillName, skillElement, skillKind, skillParams } from '../systems/combat.js';
import { REALM } from '../core/config.js';

const $ = id => document.getElementById(id);
// Biểu tượng pixel (sprites/bieu_tuong.png, ChatGPT vẽ). ic(id, emoji, em): ô có sheet -> ảnh nét pixel cỡ em; không thì emoji
let ICONS = null;
export function setIcons(url, meta, w, h) { ICONS = { url, meta, w, h }; }
function ic(id, emoji, em = 1.6) {
  const f = ICONS && ICONS.meta.frames[id];
  if (!f) return emoji;
  const [fw, fh] = ICONS.meta.frameSize, k = em / fw;
  return `<i class="pxi" style="width:${em}em;height:${(fh * k).toFixed(3)}em;background-image:url(${ICONS.url});background-size:${(ICONS.w * k).toFixed(3)}em ${(ICONS.h * k).toFixed(3)}em;background-position:${(-f[0] * k).toFixed(3)}em ${(-f[1] * k).toFixed(3)}em"></i>`;
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtTime = t => { t = Math.max(0, Math.floor(t)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

export function log(msg, cls = '', ms = 6000) {
  const el = document.createElement('div');
  el.textContent = msg; el.className = cls;
  const box = $('log'); box.appendChild(el);
  while (box.children.length > 5) box.firstChild.remove();
  setTimeout(() => { el.style.opacity = 0; }, ms);
  setTimeout(() => el.remove(), ms + 1200);
}

export function setMode(mode) { document.body.dataset.mode = mode; }

export function hubHud(meta, p, trib, nearPortal) {
  const L = meta.realmLevel, n = need(L), mh = maxHp(L), full = isFull(meta);
  $('realm').textContent = levelName(L);
  $('hpTxt').textContent = `${Math.ceil(meta.hp)} / ${mh}`;
  $('hpFill').style.width = meta.hp / mh * 100 + '%';
  const rate = p.med && !full ? (meta.lingQi > 0 ? convertRate(L, p.inForm) * yieldOf(p.inForm) : trickleRate(L, p.inForm)) : 0;
  $('tvTxt').textContent = `${Math.floor(meta.cultivationXp)} / ${n}` + (p.med ? `  (+${rate.toFixed(1)}/s${meta.lingQi > 0 ? '' : ', hết linh khí'})` : '');
  $('tvFill').style.width = meta.cultivationXp / n * 100 + '%';
  $('tvFill').classList.toggle('full', full);
  $('atkTxt').textContent = atk(L);
  $('stoneTxt').textContent = meta.linhThach;
  $('pillTxt').textContent = meta.pills;
  $('lqTxt').textContent = Math.floor(meta.lingQi); $('matTxt').textContent = meta.craftMats; $('ticketTxt').textContent = meta.coDuyenTicket;
  $('btnMed').classList.toggle('on', p.med);
  const ok = canBreak(meta) && !trib;
  $('btnBreak').classList.toggle('ready', ok);
  $('btnBreak').disabled = !ok;
  $('btnBreak').textContent = isMajor(L) ? (TRIBULATION.ENABLED ? 'Độ thiên kiếp (B)' : `Độ kiếp ${Math.round(REALM.MAJOR_CHANCE * 100)}% (B)`) : 'Đột phá (B)';
  $('btnPill').disabled = meta.pills <= 0 || L >= MAX_L;
  $('btnPill').textContent = `Dùng đan (1) · +${pillQi(L)}✨`;
  $('btnBuy').disabled = meta.linhThach < ITEMS.PILL_COST;
  $('btnRun').hidden = !nearPortal;
}

function skillCdFrac(s) {
  const k = skillKind(s), p = skillParams(s), st = s.st;
  if (k === 'orbit') return st.ready == null ? 0 : 1 - (st.ready / p.blades);
  if (k === 'shield') return st.hp > 0 ? 0 : Math.min(1, 1 - (st.rechargeT || 0) / p.recharge);
  if (k === 'ring' || k === 'tornado') return 0;
  const total = p.cd ?? p.interval ?? 1;
  return Math.max(0, Math.min(1, (st.cd ?? st.t ?? 0) / total));
}

export function runHud(run) {
  $('rLevel').textContent = run.level;
  const n = xpToNext(run.level);
  $('rXpFill').style.width = Math.min(100, run.xp / n * 100) + '%';
  // đếm ngược tới boss cuối; khi boss đã ra thì hiện tên
  $('rTime').textContent = run.dir.final === 'PENDING' ? fmtTime(Math.max(0, BOSS.FINAL.AT - run.time)) : '☠ Yêu Vương';
  $('rHpTxt').textContent = `${Math.ceil(run.hp)} / ${run.maxHp}`;
  $('rHpFill').style.width = run.hp / run.maxHp * 100 + '%';
  const sh = run.skills.find(s => skillKind(s) === 'shield');
  $('rShield').style.width = sh && sh.st.cap ? Math.min(100, sh.st.hp / run.maxHp * 100) + '%' : '0%';
  $('rKills').textContent = run.kills;
  const box = $('rSkills');
  const sig = run.skills.map(s => s.id + s.level + (s.evolved || '')).join('|') + '#' + Object.entries(run.passives).map(e => e.join(':')).join('|');
  if (box.dataset.sig !== sig) {
    box.dataset.sig = sig;
    box.innerHTML = run.skills.map((s, i) => {
      const el = ELEMENTS[skillElement(s)];
      return `<div class="slot${s.evolved ? ' evo' : ''}" style="--c:${el.color}" title="${esc(skillName(s))}"><span>${ic(s.evolved || s.id, SKILLS[s.id].icon, 1.9)}</span><b>${s.evolved ? '★' : s.level}</b><i data-i="${i}"></i></div>`;
    }).join('') + Object.entries(run.passives).map(([id, lv]) => `<div class="slot pas" title="${esc(PASSIVES[id].name)}"><span>${ic(id, PASSIVES[id].icon, 1.9)}</span><b>${lv}</b></div>`).join('');
  }
  box.querySelectorAll('i[data-i]').forEach(el => { el.style.height = skillCdFrac(run.skills[+el.dataset.i]) * 100 + '%'; });
}

// ---------- bảng (modal) ----------
let modalKeys = null;
export function modalKey(code) { return modalKeys ? modalKeys(code) : false; }
export const modalOpen = () => !$('modal').hidden;

function open(html, keys) {
  const m = $('modal');
  m.innerHTML = `<div class="sheet">${html}</div>`;
  m.hidden = false;
  modalKeys = keys;
}
export function closeModal() { $('modal').hidden = true; $('modal').innerHTML = ''; modalKeys = null; }

// M3-02: công pháp khởi đầu = mặc định + đã mở khóa theo đại cảnh giới; độ khó tới mức đã mở (phím D đổi)
export const startSkillIds = meta => [...RUN.START_SKILLS, ...meta.unlocks.skills.filter(id => SKILLS[id] && SKILLS[id].implemented && !RUN.START_SKILLS.includes(id))].slice(0, 6);
export function showPrepare(meta, onPick, onCancel) {
  const ids = startSkillIds(meta), opts = ids.map(id => SKILLS[id]);
  const maxTier = meta.unlocks.tier || 0;
  let diff = Math.min(meta.lastDifficulty || 0, maxTier);
  const nextLock = Object.entries(REALM_UNLOCKS).find(([L]) => meta.realmLevel < +L);
  const diffHtml = () => DIFFICULTY.map((d, i) => `<button class="${i === diff ? '' : 'ghost'}" data-diff="${i}" ${i > maxTier ? 'disabled' : ''}>${esc(d.name)}${i ? ` · quái ×${d.enemy} · thưởng ×${d.reward}` : ''}</button>`).join('');
  open(`<h2>Bí Cảnh · Rừng Linh Thú</h2>
    <p class="sub">${esc(levelName(meta.realmLevel))} · Công ${atk(meta.realmLevel)} · Khí huyết ${maxHp(meta.realmLevel)}</p>
    <p class="sub">${esc(BOSS.MINI.name)} chặn đường lúc ${fmtTime(BOSS.MINI.AT)}; ${esc(BOSS.FINAL.name)} xuất hiện lúc ${fmtTime(BOSS.FINAL.AT)} — hạ nó để vượt bí cảnh. Đánh yêu thú lấy chiến ý, đủ thì chọn công pháp mới. Chết trong bí cảnh không mất tu vi hay cảnh giới.</p>
    <h3>Độ khó (D)</h3><div class="row diff">${diffHtml()}</div>
    ${nextLock ? `<p class="sub">Đột phá ${esc(levelName(+nextLock[0]))} để mở: ${esc(nextLock[1].text)}.</p>` : ''}
    <h3>Chọn công pháp khởi đầu</h3>
    <div class="cards">${opts.map((d, i) => `<button class="card" data-i="${i}" style="--c:${ELEMENTS[d.element].color}">
      <span class="key">${i + 1}</span><span class="ic">${ic(ids[i], d.icon, 2.2)}</span><b>${esc(d.name)}</b><em>${esc(ELEMENTS[d.element].name)}</em><p>${esc(d.desc)}</p></button>`).join('')}</div>
    <div class="row"><button class="ghost" data-act="cancel">Hủy (Esc)</button></div>`,
  code => {
    const i = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5 }[code];
    if (i != null && i < ids.length) { pick(i); return true; }
    if (code === 'KeyD') { setDiff(diff >= maxTier ? 0 : diff + 1); return true; }
    if (code === 'Escape') { closeModal(); onCancel(); return true; }
    return false;
  });
  const pick = i => { closeModal(); onPick(ids[i], diff); };
  const setDiff = d => { diff = d; const row = $('modal').querySelector('.diff'); row.innerHTML = diffHtml(); bindDiff(); };
  const bindDiff = () => $('modal').querySelectorAll('[data-diff]').forEach(b => b.addEventListener('click', () => { if (+b.dataset.diff <= maxTier) setDiff(+b.dataset.diff); }));
  bindDiff();
  $('modal').querySelectorAll('.card').forEach(b => b.addEventListener('click', () => pick(+b.dataset.i)));
  $('modal').querySelector('[data-act=cancel]').addEventListener('click', () => { closeModal(); onCancel(); });
}

// M3-04: Linh Mạch — chọn 1 trong 3, một lần
export function showShrine(choices, onPick) {
  let done = false;
  const pick = i => { if (done || !choices[i]) return; done = true; closeModal(); onPick(choices[i].id); };
  open(`<h2>Linh Mạch</h2><p class="sub">Linh khí trào lên từ lòng đất. Chỉ hấp thu được một lần.</p>
    <div class="cards">${choices.map((c, i) => `<button class="card" data-i="${i}" style="--c:#7fe3ff"><span class="key">${i + 1}</span><span class="ic">${ic(['fallback_heal', 'linh_luc', 'hap_linh'][i], ['✚', '⚔', '✨'][i], 2.2)}</span><b>${esc(c.name)}</b><p>${esc(c.text())}</p></button>`).join('')}</div>`,
  code => { const i = { Digit1: 0, Digit2: 1, Digit3: 2 }[code]; if (i != null) { pick(i); return true; } return false; });
  $('modal').querySelectorAll('.card').forEach(b => b.addEventListener('click', () => pick(+b.dataset.i)));
}

// Bảng chọn thẻ: một lần chọn duy nhất; khóa input ngắn khi vừa mở để không bấm nhầm/bấm đúp.
export function showDraft(run, cards, onPick, onReroll = null) {
  let done = false;
  const openedAt = performance.now();
  const pick = i => {
    if (done || i < 0 || i >= cards.length) return;
    if (performance.now() - openedAt < RUN.DRAFT_INPUT_DELAY * 1000) return;
    done = true;
    closeModal();
    onPick(cards[i]);
  };
  // M7-09: đổi bảng — cùng khóa input ngắn như chọn thẻ
  const reroll = () => {
    if (done || !onReroll || !(run.rerolls > 0)) return;
    if (performance.now() - openedAt < RUN.DRAFT_INPUT_DELAY * 1000) return;
    done = true; closeModal(); onReroll();
  };
  const typeName = { NEW_SKILL: 'Công pháp mới', UPGRADE_SKILL: 'Nâng cấp', PASSIVE: 'Bị động', EVOLUTION: 'TIẾN HÓA', FALLBACK: 'Dự phòng' };
  open(`<h2>Lên cấp ${run.level - run.pendingDrafts + 1}</h2>
    <p class="sub">Chọn 1 trong ${cards.length}${run.pendingDrafts > 1 ? ` · còn ${run.pendingDrafts - 1} lượt chọn` : ''}</p>
    <div class="cards">${cards.map((c, i) => `<button class="card t-${c.type}" data-i="${i}" style="--c:${c.element ? ELEMENTS[c.element].color : '#ffd978'}">
      <span class="key">${i + 1}</span><span class="ic">${ic(c.id, c.icon, 2.2)}</span><b>${esc(c.name)}</b>
      <em>${esc(typeName[c.type])}${c.element ? ' · ' + esc(elementName(c.element)) : ''}${c.level !== '' ?` · ${c.type === 'EVOLUTION' ? 'MAX' : 'Cấp ' + c.level}` : ''}</em>
      <p>${esc(c.desc)}</p>${c.hint ? `<small>${esc(c.hint)}</small>` : ''}</button>`).join('')}</div>
    ${onReroll ? `<div class="row"><button class="ghost" data-act="reroll" ${run.rerolls > 0 ? '' : 'disabled'}>${run.rerolls > 0 ? `Đổi bảng thẻ (R) · còn ${run.rerolls}` : 'Đã dùng lượt đổi bảng'}</button></div>` : ''}`,
  code => {
    const i = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[code];
    if (i != null) { pick(i); return true; }
    if (code === 'KeyR') { reroll(); return true; }
    return false;
  });
  $('modal').querySelector('[data-act=reroll]')?.addEventListener('click', reroll);
  $('modal').querySelectorAll('.card').forEach(b => b.addEventListener('click', () => pick(+b.dataset.i)));
}

export function showPause(onResume, onLeave) {
  open(`<h2>Tạm dừng</h2><p class="sub">Trận đấu đang dừng. Rời bí cảnh sẽ kết thúc lượt này.</p>
    <div class="row"><button data-act="resume">Tiếp tục (Esc)</button><button class="ghost" data-act="leave">Rời bí cảnh</button></div>`,
  code => { if (code === 'Escape' || code === 'KeyP') { closeModal(); onResume(); return true; } return false; });
  $('modal').querySelector('[data-act=resume]').addEventListener('click', () => { closeModal(); onResume(); });
  $('modal').querySelector('[data-act=leave]').addEventListener('click', () => { closeModal(); onLeave(); });
}

// M2-04: kết thúc lượt luôn chỉ ra mục tiêu tiếp theo
export function nextGoal(run, reward, meta) {
  const down = new Set(run.rewards.map(r => r.kind)), out = [];
  if (run.outcome === 'WIN') out.push(meta && meta.stats.wins > 1 ? 'Thử build khác, hoặc thắng nhanh hơn.' : 'Lần đầu vượt bí cảnh! Thử build khác ở lượt sau.');
  else if (down.has('MINI') || run.time >= BOSS.MINI.AT) out.push(`Lần sau: trụ tới ${fmtTime(BOSS.FINAL.AT)} và hạ ${BOSS.FINAL.name} (thưởng ×1,5 + vé Cơ Duyên).`);
  else out.push(`Lần sau: trụ tới ${fmtTime(BOSS.MINI.AT)} để gặp ${BOSS.MINI.name}.`);
  if (meta && meta.linhThach + (reward ? reward.linhThach : 0) >= ITEMS.PILL_COST) out.push('Đủ linh thạch mua Tụ Khí Đan (phím 2) để tu luyện nhanh hơn — cảnh giới cao vào bí cảnh mạnh hơn.');
  return out;
}

// extra (M7-07, FEATURES.resultGoals): { goals: [{text,cur,max,action}], onNext(action) } — nút đi tiếp; nhận thưởng vẫn đúng một lần
export function showResults(run, reward, onClose, meta, extra = null) {
  const title = { WIN: `Hạ ${BOSS.FINAL.name}, vượt qua bí cảnh!`, LOSE: 'Trọng thương, rời bí cảnh', ABANDON: 'Đã rời bí cảnh', TIMEOUT: 'Hết thời gian, bí cảnh khép lại' }[run.outcome];
  const downs = run.rewards.map(r => BOSS[r.kind].name);
  const skills = run.skills.map(s => `${ic(s.evolved || s.id, SKILLS[s.id].icon, 1.3)} ${esc(skillName(s))}${s.evolved ? ' ★' : ' cấp ' + s.level}`).join('<br>');
  const pas = Object.entries(run.passives).map(([id, lv]) => `${ic(id, PASSIVES[id].icon, 1.3)} ${esc(PASSIVES[id].name)} ${lv}`).join(' · ');
  let closed = false;
  const close = () => { if (closed) return; closed = true; closeModal(); onClose(); };
  const goals = extra && extra.goals || [];
  const acts = new Set(goals.map(g => g.action));
  const nextBtns = !extra ? [] : [
    acts.has('break') && ['break', 'Nhận · đột phá (B)', 'KeyB'],
    acts.has('meditate') && ['meditate', 'Nhận · tọa thiền (T)', 'KeyT'],
    ['run', 'Nhận · vào bí cảnh mới (E)', 'KeyE'],
    ['codex', 'Nhận · đồ giám (K)', 'KeyK'],
  ].filter(Boolean);
  const go = a => { if (closed) return; closed = true; closeModal(); extra.onNext(a); };
  const goalHtml = goals.map(g => `<div class="goal"><span>${esc(g.text)}</span><div class="bar"><i style="width:${Math.round(Math.min(1, g.cur / g.max) * 100)}%"></i></div></div>`).join('');
  open(`<h2 class="${run.outcome === 'WIN' ? 'win' : 'lose'}">${title}</h2>
    <div class="stats"><div><b>${fmtTime(run.time)}</b>thời gian</div><div><b>${run.level}</b>cấp chiến đấu</div><div><b>${run.kills}</b>yêu thú</div><div><b>${run.evolutions.length}</b>tiến hóa</div></div>
    ${downs.length ? `<p class="sub">Đã hạ: ${downs.map(esc).join(', ')}</p>` : ''}
    <h3>Công pháp</h3><p>${skills}</p>${pas ? `<p class="sub">${pas}</p>` : ''}
    <h3>Mang về động phủ</h3>
    <div class="stats reward">${[['💎', 'linhThach', 'linh thạch'], ['✨', 'lingQi', 'linh khí'], ['🔩', 'craftMats', 'luyện liệu'], ['🎫', 'tickets', 'vé Cơ Duyên']]
      .map(([ic, k, name]) => `<div><b>${ic} +${reward ? reward[k] : 0}</b>${name}</div>`).join('')}</div>
    ${reward && reward.firstClear ? '<p class="sub">Lần đầu hạ Yêu Vương: thêm vé Cơ Duyên.</p>' : ''}
    <p class="sub">${run.outcome === 'WIN' ? 'Thắng: thưởng ×1,5.' : 'Thưởng theo tiến độ đã đạt.'} Cảnh giới, tu vi, đồ không đổi.</p>
    <h3>Bước tiếp theo</h3><p class="sub">${(goals.length ? nextGoal(run, reward, meta).slice(0, 1) : nextGoal(run, reward, meta)).map(esc).join('<br>')}</p>${goalHtml}
    <div class="row">${nextBtns.map(([a, t]) => `<button class="ghost" data-next="${a}">${t}</button>`).join('')}<button data-act="close">Nhận thưởng · về động phủ (Enter)</button></div>`,
  code => {
    if (code === 'Enter' || code === 'Escape' || code === 'Space') { close(); return true; }
    const b = nextBtns.find(x => x[2] === code);
    if (b) { go(b[0]); return true; }
    return false;
  });
  $('modal').querySelectorAll('[data-next]').forEach(b => b.addEventListener('click', () => go(b.dataset.next)));
  $('modal').querySelector('[data-act=close]').addEventListener('click', close);
}

export function showSettings(meta, h) {
  const s = meta.settings;
  open(`<h2>Cài đặt</h2>
    <label class="opt"><input type="checkbox" id="optReduce" ${s.reduceEffects ? 'checked' : ''}> Giảm hiệu ứng (ít hạt, chớp nhẹ)</label>
    <label class="opt"><input type="checkbox" id="optShake" ${s.screenShake ? 'checked' : ''}> Rung màn hình</label>
    <label class="opt">Đồ họa <select id="optQuality">${[['high', 'Cao'], ['medium', 'Vừa'], ['low', 'Thấp (máy yếu/điện thoại)']].map(([v, n]) => `<option value="${v}" ${s.quality === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <h3>Âm thanh</h3>
    <label class="opt">Hiệu ứng <input type="range" id="optSfx" min="0" max="1" step="0.05" value="${s.sfx}"></label>
    <label class="opt">Nhạc nền <input type="range" id="optMusic" min="0" max="1" step="0.05" value="${s.music}"></label>
    <label class="opt"><input type="checkbox" id="optMute" ${s.mute ? 'checked' : ''}> Tắt tiếng (M)</label>
    <h3>Dữ liệu</h3>
    <p class="sub">Tiến độ lưu trong trình duyệt này. Nên xuất bản sao trước khi xóa dữ liệu trình duyệt.</p>
    <div class="row"><button data-act="export">Xuất save (.json)</button><button data-act="import">Nhập save…</button><input type="file" id="importFile" accept="application/json,.json" hidden></div>
    <h3>Ghi playtest (tùy chọn)</h3>
    <p class="sub">Mặc định tắt. Khi bật, game ghi các mốc chơi (vào bí cảnh, chọn thẻ, boss, kết quả, đột phá…) <b>chỉ trên máy này</b> — không gửi đi đâu, không có tên, email hay IP. Muốn giúp người phát triển: bấm Xuất rồi tự gửi file.</p>
    <label class="opt"><input type="checkbox" id="optPt" ${h.pt.enabled ? 'checked' : ''}> Bật ghi playtest</label>
    <p class="sub" id="ptInfo"></p>
    <div class="row"><button data-act="ptJson">Xuất log (.json)</button><button data-act="ptCsv">Xuất log (.csv)</button><button class="ghost" data-act="ptClear">Xóa log</button></div>
    <div class="row"><button data-act="feedback">Sao chép tóm tắt góp ý</button><a class="btnlink" href="${h.feedbackUrl}" target="_blank" rel="noopener">Mở trang góp ý ↗</a></div>
    <textarea id="fbText" readonly hidden rows="6"></textarea>
    <div class="row"><button class="ghost danger" data-act="reset">Chơi lại từ đầu</button><button data-act="close">Đóng (Esc)</button></div>`,
  code => { if (code === 'Escape') { closeModal(); h.onClose(); return true; } return false; });
  const m = $('modal');
  m.querySelector('#optReduce').addEventListener('change', e => h.onSetting('reduceEffects', e.target.checked));
  m.querySelector('#optShake').addEventListener('change', e => h.onSetting('screenShake', e.target.checked));
  m.querySelector('#optQuality').addEventListener('change', e => h.onSetting('quality', e.target.value));
  m.querySelector('#optSfx').addEventListener('change', e => h.onSetting('sfx', +e.target.value));
  m.querySelector('#optMusic').addEventListener('change', e => h.onSetting('music', +e.target.value));
  m.querySelector('#optMute').addEventListener('change', e => h.onSetting('mute', e.target.checked));
  m.querySelector('[data-act=export]').addEventListener('click', h.onExport);
  const file = m.querySelector('#importFile');
  m.querySelector('[data-act=import]').addEventListener('click', () => file.click());
  file.addEventListener('change', async () => { const f = file.files[0]; if (f) h.onImport(await f.text()); });
  m.querySelector('[data-act=reset]').addEventListener('click', h.onReset);
  // M7-04: nhật ký playtest
  const ptInfo = () => { m.querySelector('#ptInfo').textContent = h.pt.testId ? `Mã thử: ${h.pt.testId} · ${h.pt.count} sự kiện${h.pt.dropped ? ` (đã bỏ ${h.pt.dropped} sự kiện cũ vì đầy)` : ''}${h.pt.enabled ? '' : ' · đang tắt'}` : 'Chưa bật lần nào.'; };
  ptInfo();
  m.querySelector('#optPt').addEventListener('change', e => { h.onPlaytest(e.target.checked); ptInfo(); });
  m.querySelector('[data-act=ptJson]').addEventListener('click', () => h.onPtExport('json'));
  m.querySelector('[data-act=ptCsv]').addEventListener('click', () => h.onPtExport('csv'));
  m.querySelector('[data-act=ptClear]').addEventListener('click', () => { h.onPtClear(); ptInfo(); });
  m.querySelector('[data-act=feedback]').addEventListener('click', async () => {
    const text = h.feedbackText(), ta = m.querySelector('#fbText');
    ta.value = text; ta.hidden = false;
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) { ta.select(); }
    m.querySelector('[data-act=feedback]').textContent = ok ? 'Đã sao chép ✓' : 'Chép tay ô bên dưới';
  });
  m.querySelector('[data-act=close]').addEventListener('click', () => { closeModal(); h.onClose(); });
}

export { fmtTime, evolutionHint };

// ================= M4: Luyện Khí, Truyền Thừa Các, Thành Tựu (bảng danh sách đơn giản) =================
import { ITEMS_DEF, SLOTS, CRAFT, MAX_ITEM_LEVEL } from '../data/items.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { GACHA } from '../core/config.js';
import { canPay } from '../progression/gear.js';
import { buildCodex } from '../progression/codex.js';

const costText = c => Object.entries(c).map(([k, v]) => `${v}${{ craftMats: '🔩', linhThach: '💎' }[k]}`).join(' ');
const resLine = meta => `💎 ${meta.linhThach} · 🔩 ${meta.craftMats} · ✨ ${Math.floor(meta.lingQi)} · 🎫 ${meta.coDuyenTicket} · 📜 ${meta.shards} mảnh`;

// act(kind, ...args) do main.js xử lý (kiểm tra + lưu chắc chắn), rồi gọi lại hàm này để vẽ lại
// M7-08: Công Pháp Đồ Giám — dữ liệu từ buildCodex (không chép tay ở đây)
export function showCodex(meta, onClose = () => {}) {
  const c = buildCodex(meta);
  const sk = c.skills.map(s => s.state === 'locked'
    ? `<div class="card cx lock" style="--c:${s.color}"><span class="ic">?</span><b>???</b><em>Hệ ${esc(s.elementName)} · chưa mở</em><p>Mở bằng ${esc(s.how)}.</p></div>`
    : `<div class="card cx" style="--c:${s.color}"><span class="ic">${ic(s.id, s.icon, 2)}</span><b>${esc(s.name)}</b><em>Hệ ${esc(s.elementName)} · tối đa cấp ${s.maxLevel}</em><p>${esc(s.desc)}</p>
       <small>${s.start ? 'Khởi đầu được' : s.startAt ? `Gặp trong bí cảnh · khởi đầu từ ${esc(s.startAt)}` : 'Gặp trong bí cảnh (thẻ)'}${s.evo ? ' · ★ có tiến hóa' : ''}</small></div>`).join('');
  const ev = c.evolutions.map(e => e.state === 'found'
    ? `<div class="card cx t-EVOLUTION" style="--c:${e.color}"><span class="ic">${ic(e.id, e.icon, 2)}</span><b>${esc(e.name)}</b><em>Đã khám phá</em><p>${esc(e.desc)}</p><small>${esc(e.recipe)}</small></div>`
    : `<div class="card cx unk" style="--c:${e.color}"><span class="ic">?</span><b>Tiến hóa chưa khám phá</b><p>${esc(e.clue)}</p></div>`).join('')
    + Array.from({ length: c.teaser }, () => `<div class="card cx lock"><span class="ic">…</span><b>Công thức chưa ghi lại</b><p>Còn công pháp chưa có tiến hóa — sẽ xuất hiện ở bản sau.</p></div>`).join('');
  open(`<h2>Công Pháp Đồ Giám</h2>
    <p class="sub">Công pháp ${c.counts.open}/${c.counts.total} đã mở · Tiến hóa ${c.counts.found}/${c.counts.evoTotal} đã khám phá. Chưa mở = cần điều kiện để vào bí cảnh; chưa khám phá = đã có, tự tìm ra cách hợp nhất trong bí cảnh.</p>
    <h3>Công pháp</h3><div class="cards">${sk}</div>
    <h3>Tiến hóa</h3><div class="cards">${ev}</div>
    <div class="row"><button class="ghost" data-act="close">Đóng (Esc)</button></div>`,
  code => { if (code === 'Escape' || code === 'KeyK') { closeModal(); onClose(); return true; } return false; });
  $('modal').querySelector('[data-act=close]').addEventListener('click', () => { closeModal(); onClose(); });
}

export function showForge(meta, act, note = '') {
  const rows = Object.entries(SLOTS).map(([slot, sname]) => {
    const items = Object.entries(ITEMS_DEF).filter(([, d]) => d.slot === slot);
    return `<h3>${esc(sname)} — đang mặc: ${meta.equipped[slot] ? esc(ITEMS_DEF[meta.equipped[slot]].name) : 'trống'}</h3>` + items.map(([id, d]) => {
      const lv = meta.items[id], on = meta.equipped[slot] === id;
      // M7-02: không đủ nguyên liệu -> nút mờ + ghi rõ thiếu gì
      const need = c => canPay(meta, c) ? '' : ` disabled title="Thiếu nguyên liệu"`;
      const btns = !lv ? `<button data-a="craft" data-id="${id}"${need(CRAFT.make)}>Luyện · ${costText(CRAFT.make)}</button>`
        : `${on ? `<button class="ghost" data-a="unequip" data-id="${slot}">Tháo</button>` : `<button data-a="equip" data-id="${id}">Mặc</button>`}
           ${lv < MAX_ITEM_LEVEL ? `<button data-a="upgrade" data-id="${id}"${need(CRAFT.upgrade(lv))}>Nâng ${lv}→${lv + 1} · ${costText(CRAFT.upgrade(lv))}</button>` : '<span class="sub">tối đa</span>'}`;
      return `<div class="itemrow"><span>${d.icon} <b>${esc(d.name)}</b>${lv ? ` cấp ${lv}` : ' <span class="sub">(chưa có)</span>'}<br><span class="sub">${esc(d.text(lv || 1))}</span></span><span>${btns}</span></div>`;
    }).join('');
  }).join('');
  open(`<h2>Luyện Khí</h2><p class="sub">${resLine(meta)}</p><p class="sub">Mỗi món một ưu một nhược. Nâng cấp chắc chắn thành công, tối đa cấp ${MAX_ITEM_LEVEL}. Luyện liệu kiếm từ tinh anh và boss.</p>
    ${canPay(meta, CRAFT.make) ? '' : `<p class="sub warn">Chưa đủ nguyên liệu để luyện món mới (cần ${costText(CRAFT.make)}). Hạ tinh anh và boss trong bí cảnh để kiếm 🔩.</p>`}
    ${note ? `<p class="note">${esc(note)}</p>` : ''}${rows}<div class="row"><button class="ghost" data-a="close">Đóng (Esc)</button></div>`,
  code => { if (code === 'Escape' || code === 'KeyG') { closeModal(); return true; } return false; });
  $('modal').querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => b.dataset.a === 'close' ? closeModal() : act(b.dataset.a, b.dataset.id)));
}

export function showGacha(meta, act, last = null, note = '') {
  const R = GACHA.RATES, pct = v => (v * 100).toFixed(v < 0.1 ? 1 : 0) + '%';
  const shopItems = Object.entries(ITEMS_DEF).filter(([id]) => !meta.items[id]);
  const shopSkills = GACHA.EPIC_SKILLS.filter(id => !meta.unlocks.skills.includes(id));
  open(`<h2>Truyền Thừa Các</h2><p class="sub">${resLine(meta)}</p>
    <p class="sub">Chỉ dùng vé Cơ Duyên kiếm được khi chơi (thắng bí cảnh, thành tựu) — không bán, không nạp tiền.
    Tỉ lệ: Thường ${pct(R.common)} (tài nguyên) · Hiếm ${pct(R.rare)} (trang bị) · Cực phẩm ${pct(R.epic)} (trang bị cực phẩm / công pháp Băng).
    Bảo hiểm: tối đa ${GACHA.PITY} lượt chắc chắn có Cực phẩm (còn ${GACHA.PITY - meta.gacha.pity}). Trùng → ${GACHA.DUP_SHARDS.rare}/${GACHA.DUP_SHARDS.epic} mảnh.</p>
    ${last ? `<p><b>${{ common: 'Thường', rare: 'Hiếm', epic: 'Cực phẩm' }[last.rarity]}:</b> ${esc(last.name)}${last.dup ? ` (trùng → +${last.shards} mảnh)` : ''}</p>` : ''}${note ? `<p>${esc(note)}</p>` : ''}
    <div class="row" style="justify-content:flex-start"><button data-a="pull" ${meta.coDuyenTicket < GACHA.COST ? 'disabled' : ''}>Quay 1 lượt · ${GACHA.COST}🎫 (Space)</button></div>
    <h3>Đổi mảnh (chọn đúng thứ mình muốn)</h3>
    ${shopSkills.map(id => `<div class="itemrow"><span>${SKILLS[id].icon} ${esc(SKILLS[id].name)} <span class="sub">công pháp</span></span><button data-a="shop" data-t="skill" data-id="${id}" ${meta.shards < GACHA.SHOP.skill ? 'disabled' : ''}>${GACHA.SHOP.skill} mảnh</button></div>`).join('')}
    ${shopItems.map(([id, d]) => `<div class="itemrow"><span>${d.icon} ${esc(d.name)} <span class="sub">trang bị</span></span><button data-a="shop" data-t="item" data-id="${id}" ${meta.shards < GACHA.SHOP.item ? 'disabled' : ''}>${GACHA.SHOP.item} mảnh</button></div>`).join('') || ''}
    <h3>Lịch sử (${meta.gacha.pulls} lượt)</h3><p class="sub">${meta.gacha.history.slice(0, 12).map(h => `${{ common: '·', rare: '◆', epic: '★' }[h.r] || '·'} ${esc(h.n)}${h.d ? ' (trùng)' : ''}`).join(' &nbsp; ') || 'chưa quay'}</p>
    <div class="row"><button class="ghost" data-a="close">Đóng (Esc)</button></div>`,
  code => {
    if (code === 'Escape' || code === 'KeyH') { closeModal(); return true; }
    if (code === 'Space') { act('pull'); return true; }
    return false;
  });
  $('modal').querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => b.dataset.a === 'close' ? closeModal() : act(b.dataset.a, b.dataset.id, b.dataset.t)));
}

export function showAchievements(meta) {
  open(`<h2>Thành Tựu</h2><p class="sub">Một số thành tựu mở công pháp mới — lộ trình chắc chắn, không cần Truyền Thừa Các.</p>
    ${ACHIEVEMENTS.map(a => { const done = meta.achievements.includes(a.id), r = a.reward;
      const rw = [r.skill && `mở ${SKILLS[r.skill].name}`, r.tickets && `${r.tickets}🎫`, r.craftMats && `${r.craftMats}🔩`].filter(Boolean).join(', ');
      return `<div class="itemrow"><span>${done ? '✅' : '⬜'} <b>${esc(a.name)}</b> — ${esc(a.desc)}</span><span class="sub">${esc(rw)}</span></div>`; }).join('')}
    <p class="sub">Đã hạ ${meta.stats.kills} yêu thú · Lang Vương ${meta.stats.minis} lần · Tiến hóa đã thấy: ${meta.stats.evos.length}</p>
    <div class="row"><button class="ghost" data-a="close">Đóng (Esc)</button></div>`,
  code => { if (code === 'Escape' || code === 'KeyJ') { closeModal(); return true; } return false; });
  $('modal').querySelector('[data-a=close]').addEventListener('click', closeModal);
}
