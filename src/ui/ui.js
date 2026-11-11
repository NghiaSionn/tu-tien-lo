// Giao diện DOM: HUD động phủ, HUD bí cảnh, các bảng (chuẩn bị, chọn thẻ, kết quả, tạm dừng, cài đặt), nhật ký.
import { RUN, ITEMS, BOSS } from '../core/config.js';
import { levelName, maxHp, atk, need, isMajor, MAX_L } from '../progression/realm.js';
import { xpToNext } from '../progression/runxp.js';
import { medRate, canBreak, isFull } from '../systems/cultivation.js';
import { SKILLS, ELEMENTS, PASSIVES } from '../data/skills.js';
import { elementName, evolutionHint } from '../progression/draft.js';
import { skillName, skillElement, skillKind, skillParams } from '../systems/combat.js';
import { REALM } from '../core/config.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtTime = t => { t = Math.max(0, Math.floor(t)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

export function log(msg, cls = '') {
  const el = document.createElement('div');
  el.textContent = msg; el.className = cls;
  const box = $('log'); box.appendChild(el);
  while (box.children.length > 5) box.firstChild.remove();
  setTimeout(() => { el.style.opacity = 0; }, 6000);
  setTimeout(() => el.remove(), 7200);
}

export function setMode(mode) { document.body.dataset.mode = mode; }

export function hubHud(meta, p, trib, nearPortal) {
  const L = meta.realmLevel, n = need(L), mh = maxHp(L), full = isFull(meta);
  $('realm').textContent = levelName(L);
  $('hpTxt').textContent = `${Math.ceil(meta.hp)} / ${mh}`;
  $('hpFill').style.width = meta.hp / mh * 100 + '%';
  $('tvTxt').textContent = `${Math.floor(meta.cultivationXp)} / ${n}` + (p.med ? `  (+${medRate(L, p.inForm).toFixed(1)}/s)` : '');
  $('tvFill').style.width = meta.cultivationXp / n * 100 + '%';
  $('tvFill').classList.toggle('full', full);
  $('atkTxt').textContent = atk(L);
  $('stoneTxt').textContent = meta.linhThach;
  $('pillTxt').textContent = meta.pills;
  $('lqTxt').textContent = meta.lingQi; $('matTxt').textContent = meta.craftMats; $('ticketTxt').textContent = meta.coDuyenTicket;
  $('btnMed').classList.toggle('on', p.med);
  const ok = canBreak(meta) && !trib;
  $('btnBreak').classList.toggle('ready', ok);
  $('btnBreak').disabled = !ok;
  $('btnBreak').textContent = isMajor(L) ? `Độ kiếp ${Math.round(REALM.MAJOR_CHANCE * 100)}% (B)` : 'Đột phá (B)';
  $('btnPill').disabled = meta.pills <= 0 || full || L >= MAX_L;
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
      return `<div class="slot${s.evolved ? ' evo' : ''}" style="--c:${el.color}" title="${esc(skillName(s))}"><span>${SKILLS[s.id].icon}</span><b>${s.evolved ? '★' : s.level}</b><i data-i="${i}"></i></div>`;
    }).join('') + Object.entries(run.passives).map(([id, lv]) => `<div class="slot pas" title="${esc(PASSIVES[id].name)}"><span>${PASSIVES[id].icon}</span><b>${lv}</b></div>`).join('');
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

export function showPrepare(meta, onPick, onCancel) {
  const opts = RUN.START_SKILLS.map(id => SKILLS[id]);
  open(`<h2>Bí Cảnh · Rừng Linh Thú</h2>
    <p class="sub">${esc(levelName(meta.realmLevel))} · Công ${atk(meta.realmLevel)} · Khí huyết ${maxHp(meta.realmLevel)}</p>
    <p class="sub">${esc(BOSS.MINI.name)} chặn đường lúc ${fmtTime(BOSS.MINI.AT)}; ${esc(BOSS.FINAL.name)} xuất hiện lúc ${fmtTime(BOSS.FINAL.AT)} — hạ nó để vượt bí cảnh. Đánh yêu thú lấy chiến ý, đủ thì chọn công pháp mới. Chết trong bí cảnh không mất tu vi hay cảnh giới.</p>
    <h3>Chọn công pháp khởi đầu</h3>
    <div class="cards">${opts.map((d, i) => `<button class="card" data-i="${i}" style="--c:${ELEMENTS[d.element].color}">
      <span class="key">${i + 1}</span><span class="ic">${d.icon}</span><b>${esc(d.name)}</b><em>${esc(ELEMENTS[d.element].name)}</em><p>${esc(d.desc)}</p></button>`).join('')}</div>
    <div class="row"><button class="ghost" data-act="cancel">Hủy (Esc)</button></div>`,
  code => {
    const i = { Digit1: 0, Digit2: 1, Digit3: 2 }[code];
    if (i != null) { pick(i); return true; }
    if (code === 'Escape') { closeModal(); onCancel(); return true; }
    return false;
  });
  const pick = i => { closeModal(); onPick(RUN.START_SKILLS[i]); };
  $('modal').querySelectorAll('.card').forEach(b => b.addEventListener('click', () => pick(+b.dataset.i)));
  $('modal').querySelector('[data-act=cancel]').addEventListener('click', () => { closeModal(); onCancel(); });
}

// Bảng chọn thẻ: một lần chọn duy nhất; khóa input ngắn khi vừa mở để không bấm nhầm/bấm đúp.
export function showDraft(run, cards, onPick) {
  let done = false;
  const openedAt = performance.now();
  const pick = i => {
    if (done || i < 0 || i >= cards.length) return;
    if (performance.now() - openedAt < RUN.DRAFT_INPUT_DELAY * 1000) return;
    done = true;
    closeModal();
    onPick(cards[i]);
  };
  const typeName = { NEW_SKILL: 'Công pháp mới', UPGRADE_SKILL: 'Nâng cấp', PASSIVE: 'Bị động', EVOLUTION: 'TIẾN HÓA', FALLBACK: 'Dự phòng' };
  open(`<h2>Lên cấp ${run.level - run.pendingDrafts + 1}</h2>
    <p class="sub">Chọn 1 trong ${cards.length}${run.pendingDrafts > 1 ? ` · còn ${run.pendingDrafts - 1} lượt chọn` : ''}</p>
    <div class="cards">${cards.map((c, i) => `<button class="card t-${c.type}" data-i="${i}" style="--c:${c.element ? ELEMENTS[c.element].color : '#ffd978'}">
      <span class="key">${i + 1}</span><span class="ic">${c.icon}</span><b>${esc(c.name)}</b>
      <em>${esc(typeName[c.type])}${c.element ? ' · ' + esc(elementName(c.element)) : ''}${c.level !== '' ?` · ${c.type === 'EVOLUTION' ? 'MAX' : 'Cấp ' + c.level}` : ''}</em>
      <p>${esc(c.desc)}</p>${c.hint ? `<small>${esc(c.hint)}</small>` : ''}</button>`).join('')}</div>`,
  code => {
    const i = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[code];
    if (i != null) { pick(i); return true; }
    return false;
  });
  $('modal').querySelectorAll('.card').forEach(b => b.addEventListener('click', () => pick(+b.dataset.i)));
}

export function showPause(onResume, onLeave) {
  open(`<h2>Tạm dừng</h2><p class="sub">Trận đấu đang dừng. Rời bí cảnh sẽ kết thúc lượt này.</p>
    <div class="row"><button data-act="resume">Tiếp tục (Esc)</button><button class="ghost" data-act="leave">Rời bí cảnh</button></div>`,
  code => { if (code === 'Escape' || code === 'KeyP') { closeModal(); onResume(); return true; } return false; });
  $('modal').querySelector('[data-act=resume]').addEventListener('click', () => { closeModal(); onResume(); });
  $('modal').querySelector('[data-act=leave]').addEventListener('click', () => { closeModal(); onLeave(); });
}

export function showResults(run, reward, onClose) {
  const title = { WIN: `Hạ ${BOSS.FINAL.name}, vượt qua bí cảnh!`, LOSE: 'Trọng thương, rời bí cảnh', ABANDON: 'Đã rời bí cảnh', TIMEOUT: 'Hết thời gian, bí cảnh khép lại' }[run.outcome];
  const downs = run.rewards.map(r => BOSS[r.kind].name);
  const skills = run.skills.map(s => `${SKILLS[s.id].icon} ${esc(skillName(s))}${s.evolved ? ' ★' : ' cấp ' + s.level}`).join('<br>');
  const pas = Object.entries(run.passives).map(([id, lv]) => `${PASSIVES[id].icon} ${esc(PASSIVES[id].name)} ${lv}`).join(' · ');
  let closed = false;
  const close = () => { if (closed) return; closed = true; closeModal(); onClose(); };
  open(`<h2 class="${run.outcome === 'WIN' ? 'win' : 'lose'}">${title}</h2>
    <div class="stats"><div><b>${fmtTime(run.time)}</b>thời gian</div><div><b>${run.level}</b>cấp chiến đấu</div><div><b>${run.kills}</b>yêu thú</div><div><b>${run.evolutions.length}</b>tiến hóa</div></div>
    ${downs.length ? `<p class="sub">Đã hạ: ${downs.map(esc).join(', ')}</p>` : ''}
    <h3>Công pháp</h3><p>${skills}</p>${pas ? `<p class="sub">${pas}</p>` : ''}
    <h3>Mang về động phủ</h3>
    <div class="stats reward">${[['💎', 'linhThach', 'linh thạch'], ['✨', 'lingQi', 'linh khí'], ['🔩', 'craftMats', 'luyện liệu'], ['🎫', 'tickets', 'vé Cơ Duyên']]
      .map(([ic, k, name]) => `<div><b>${ic} +${reward ? reward[k] : 0}</b>${name}</div>`).join('')}</div>
    ${reward && reward.firstClear ? '<p class="sub">Lần đầu hạ Yêu Vương: thêm vé Cơ Duyên.</p>' : ''}
    <p class="sub">${run.outcome === 'WIN' ? 'Thắng: thưởng ×1,5.' : 'Thưởng theo tiến độ đã đạt.'} Cảnh giới, tu vi, đồ không đổi. Linh khí và luyện liệu sẽ dùng ở bản sau.</p>
    <div class="row"><button data-act="close">Nhận thưởng · về động phủ (Enter)</button></div>`,
  code => { if (code === 'Enter' || code === 'Escape' || code === 'Space') { close(); return true; } return false; });
  $('modal').querySelector('[data-act=close]').addEventListener('click', close);
}

export function showSettings(meta, h) {
  const s = meta.settings;
  open(`<h2>Cài đặt</h2>
    <label class="opt"><input type="checkbox" id="optReduce" ${s.reduceEffects ? 'checked' : ''}> Giảm hiệu ứng (ít hạt, chớp nhẹ)</label>
    <label class="opt"><input type="checkbox" id="optShake" ${s.screenShake ? 'checked' : ''}> Rung màn hình</label>
    <h3>Dữ liệu</h3>
    <p class="sub">Tiến độ lưu trong trình duyệt này. Nên xuất bản sao trước khi xóa dữ liệu trình duyệt.</p>
    <div class="row"><button data-act="export">Xuất save (.json)</button><button data-act="import">Nhập save…</button><input type="file" id="importFile" accept="application/json,.json" hidden></div>
    <div class="row"><button class="ghost danger" data-act="reset">Chơi lại từ đầu</button><button data-act="close">Đóng (Esc)</button></div>`,
  code => { if (code === 'Escape') { closeModal(); h.onClose(); return true; } return false; });
  const m = $('modal');
  m.querySelector('#optReduce').addEventListener('change', e => h.onSetting('reduceEffects', e.target.checked));
  m.querySelector('#optShake').addEventListener('change', e => h.onSetting('screenShake', e.target.checked));
  m.querySelector('[data-act=export]').addEventListener('click', h.onExport);
  const file = m.querySelector('#importFile');
  m.querySelector('[data-act=import]').addEventListener('click', () => file.click());
  file.addEventListener('change', async () => { const f = file.files[0]; if (f) h.onImport(await f.text()); });
  m.querySelector('[data-act=reset]').addEventListener('click', h.onReset);
  m.querySelector('[data-act=close]').addEventListener('click', () => { closeModal(); h.onClose(); });
}

export { fmtTime, evolutionHint };
