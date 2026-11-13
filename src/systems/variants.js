// M7-10: biến thể bí cảnh. Bốc theo seed bằng luồng ngẫu nhiên riêng (không đụng run.rng -> sim/seed cũ không đổi).
import { RUN_VARIANTS, FEATURES } from '../core/config.js';
import { mulberry32 } from '../core/rng.js';

export function pickVariant(seed, enabled = FEATURES.runVariants) {
  if (!enabled) return 'thuong';
  const ent = Object.entries(RUN_VARIANTS), total = ent.reduce((a, [, v]) => a + v.weight, 0);
  let r = mulberry32((seed ^ 0x9e3779b9) >>> 0)() * total;
  for (const [id, v] of ent) { r -= v.weight; if (r < 0) return id; }
  return ent[ent.length - 1][0];
}

export const variantOf = id => RUN_VARIANTS[id] || RUN_VARIANTS.thuong;
export const vmod = (run, key, def = 1) => { const v = variantOf(run.variant).mods[key]; return v === undefined ? def : v; };
