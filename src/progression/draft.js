// Bốc 1 trong 3 thẻ. Thuần logic: nhận run + rng, trả thẻ; applyCard áp dụng đúng một lần.
import { RUN } from '../core/config.js';
import { SKILLS, EVOLUTIONS, PASSIVES, ELEMENTS, FALLBACK_CARD } from '../data/skills.js';

export const WEIGHTS = { NEW_SKILL: 1.0, UPGRADE_SKILL: 2.0, PASSIVE: 0.7, EVOLUTION: 100 };   // [THỬ NGHIỆM]
// Công pháp gốc của một công thức tiến hóa mà người chơi đã có công pháp phụ: thẻ nâng cấp của nó nặng gấp bấy nhiêu lần,
// để đã chọn đúng nguyên liệu thì tiến hóa không còn quá phụ thuộc may rủi. [THỬ NGHIỆM]
export const EVO_BASE_UPGRADE_MULT = 3;

export const owns = (run, id) => run.skills.some(s => s.id === id);

// Công pháp gốc nào đang "trên đường tiến hóa" (đã có ít nhất một công pháp phụ của công thức)
export const evolutionPathBase = (run, skillId) =>
  Object.values(EVOLUTIONS).some(e => e.base === skillId && e.needAny.some(id => owns(run, id)));

export function evolutionReady(run, evoId) {
  const e = EVOLUTIONS[evoId];
  const s = run.skills.find(k => k.id === e.base);
  return !!s && !s.evolved && s.level >= SKILLS[e.base].maxLevel && e.needAny.some(id => owns(run, id)) && run.time >= e.minRunTime;
}

// Gợi ý tiến hóa cho một công pháp (hiện trên thẻ, không lộ toàn bộ công thức khác)
export function evolutionHint(skillId) {
  const e = Object.values(EVOLUTIONS).find(x => x.base === skillId);
  return e ? `★ Tiến hóa: ${e.hint}` : '';
}

export function candidates(run) {
  const out = [];
  for (const [id, def] of Object.entries(SKILLS)) {
    if (!def.implemented) continue;
    const s = run.skills.find(k => k.id === id);
    if (!s) {
      if (run.skills.length < RUN.MAX_ACTIVE)
        out.push({ key: 'new:' + id, type: 'NEW_SKILL', id, name: def.name, icon: def.icon, element: def.element, level: 1, desc: def.levelText[0] + '. ' + def.desc, hint: evolutionHint(id), w: WEIGHTS.NEW_SKILL });
    } else if (!s.evolved && s.level < def.maxLevel) {
      out.push({ key: 'up:' + id, type: 'UPGRADE_SKILL', id, name: def.name, icon: def.icon, element: def.element, level: s.level + 1, desc: def.levelText[s.level], hint: evolutionHint(id), w: WEIGHTS.UPGRADE_SKILL * (evolutionPathBase(run, id) ? EVO_BASE_UPGRADE_MULT : 1) });
    }
  }
  const passiveCount = Object.keys(run.passives).length;
  for (const [id, def] of Object.entries(PASSIVES)) {
    const lv = run.passives[id] || 0;
    if (lv >= def.maxLevel || (lv === 0 && passiveCount >= RUN.MAX_PASSIVE)) continue;
    out.push({ key: 'pas:' + id, type: 'PASSIVE', id, name: def.name, icon: def.icon, element: null, level: lv + 1, desc: def.text(lv + 1), hint: '', w: WEIGHTS.PASSIVE });
  }
  for (const [id, e] of Object.entries(EVOLUTIONS)) {
    if (!evolutionReady(run, id)) continue;
    out.push({ key: 'evo:' + id, type: 'EVOLUTION', id, base: e.base, name: e.name, icon: e.icon, element: e.element, level: 'MAX', desc: e.desc, hint: `Thay thế ${SKILLS[e.base].name}`, w: WEIGHTS.EVOLUTION });
  }
  return out;
}

// Chọn tối đa n thẻ không trùng theo trọng số. Thẻ tiến hóa luôn được ưu tiên vào bảng.
export function drawCards(run, rng, n = 3) {
  const pool = candidates(run);
  const picked = [];
  while (picked.length < n && pool.length) {
    const total = pool.reduce((a, c) => a + c.w, 0);
    let r = rng() * total, i = 0;
    for (; i < pool.length - 1; i++) { r -= pool[i].w; if (r < 0) break; }
    picked.push(pool.splice(i, 1)[0]);
  }
  if (!picked.length) picked.push({ ...FALLBACK_CARD, key: FALLBACK_CARD.id, element: null, level: '' });
  return picked;
}

export const elementName = el => el ? ELEMENTS[el].name : 'Bị động';

// Áp dụng thẻ. Trả về false nếu thẻ không còn hợp lệ (bấm trùng/thẻ cũ) — không áp dụng gì cả.
export function applyCard(run, card, deps = {}) {
  if (!card) return false;
  switch (card.type) {
    case 'NEW_SKILL':
      if (owns(run, card.id) || run.skills.length >= RUN.MAX_ACTIVE) return false;
      run.skills.push({ id: card.id, level: 1, evolved: null, st: {} });
      return true;
    case 'UPGRADE_SKILL': {
      const s = run.skills.find(k => k.id === card.id);
      if (!s || s.evolved || s.level !== card.level - 1 || s.level >= SKILLS[card.id].maxLevel) return false;
      s.level++;
      return true;
    }
    case 'PASSIVE': {
      const lv = run.passives[card.id] || 0;
      if (lv !== card.level - 1 || lv >= PASSIVES[card.id].maxLevel) return false;
      run.passives[card.id] = lv + 1;
      if (PASSIVES[card.id].stat === 'maxHp' && deps.onMaxHpChange) deps.onMaxHpChange();
      return true;
    }
    case 'EVOLUTION': {
      if (!evolutionReady(run, card.id)) return false;
      const s = run.skills.find(k => k.id === card.base);
      s.evolved = card.id;
      s.st = {};
      run.evolutions.push(card.id);
      return true;
    }
    case 'FALLBACK':
      if (deps.heal) deps.heal(card.heal);
      return true;
  }
  return false;
}
