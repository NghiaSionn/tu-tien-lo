// M7-08 [GIẢ THUYẾT H3]: Công Pháp Đồ Giám — dựng hoàn toàn từ dữ liệu (skills.js, achievements.js, config), không chép tay ở UI.
// Phân biệt rõ: công pháp CHƯA MỞ (có điều kiện mở, giấu tên) với tiến hóa CHƯA KHÁM PHÁ (chỉ có manh mối, giấu lời giải).
import { SKILLS, EVOLUTIONS, ELEMENTS } from '../data/skills.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { RUN, GACHA, REALM_UNLOCKS } from '../core/config.js';
import { levelName } from './realm.js';

const realmStartOf = id => Object.entries(REALM_UNLOCKS).find(([, u]) => u.skills.includes(id));

export function buildCodex(meta) {
  const unlocked = meta.unlocks?.skills || [];
  const found = new Set(meta.stats?.evos || []);
  const skills = Object.entries(SKILLS).filter(([, d]) => d.implemented).map(([id, d]) => {
    const open = !d.locked || unlocked.includes(id);
    const evo = Object.entries(EVOLUTIONS).find(([, e]) => e.base === id);
    const el = ELEMENTS[d.element];
    if (!open) {
      const ach = ACHIEVEMENTS.find(a => a.reward.skill === id);
      const ways = [ach && `thành tựu ${ach.name} (${ach.desc})`, GACHA.EPIC_SKILLS.includes(id) && 'Truyền Thừa Các'].filter(Boolean);
      return { id, state: 'locked', element: d.element, elementName: el.name, color: el.color, how: ways.join(' hoặc ') || 'chưa rõ' };
    }
    const rs = realmStartOf(id);
    const start = RUN.START_SKILLS.includes(id) || (rs && meta.realmLevel >= +rs[0]);
    return {
      id, state: 'open', name: d.name, icon: d.icon, element: d.element, elementName: el.name, color: el.color, desc: d.desc,
      maxLevel: d.maxLevel, start: !!start, startAt: !start && rs ? levelName(+rs[0]) : null,
      evo: evo ? evo[0] : null,
    };
  });
  const evolutions = Object.entries(EVOLUTIONS).map(([id, e]) => {
    const base = SKILLS[e.base];
    const partEls = [...new Set(e.needAny.map(s => SKILLS[s].element))].map(x => ELEMENTS[x].name);
    if (found.has(id)) return { id, state: 'found', name: e.name, icon: e.icon, color: ELEMENTS[e.element].color, desc: e.desc, recipe: e.hint };
    // manh mối: hệ của gốc + hệ của phần phụ, không nêu tên công pháp
    return { id, state: 'unknown', color: ELEMENTS[e.element].color, clue: `Một công pháp hệ ${ELEMENTS[base.element].name} luyện tới tối đa, hòa với hệ ${partEls.join('/')}…` };
  });
  const noRecipe = skills.filter(s => s.state === 'open' && !s.evo).length;
  return {
    skills, evolutions,
    counts: { open: skills.filter(s => s.state === 'open').length, total: skills.length, found: evolutions.filter(e => e.state === 'found').length, evoTotal: evolutions.length },
    // 1–2 ô "chưa có công thức": báo rằng còn tiến hóa chưa được viết, không hứa nội dung cụ thể
    teaser: noRecipe ? Math.min(2, noRecipe) : 0,
  };
}

// Tiến hóa mới thấy lần đầu (so stats.evos trước/sau khi nhận thưởng)
export const newDiscoveries = (before, after) => (after || []).filter(id => !(before || []).includes(id) && EVOLUTIONS[id]);
