// Ngẫu nhiên có hạt giống. Code mới nhận rng qua tham số để test lặp lại được.

export function mulberry32(seed) {
  let a = seed >>> 0;
  const rng = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.range = (lo, hi) => lo + rng() * (hi - lo);
  rng.int = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
  return rng;
}

// Hash và value-noise dùng để sinh bản đồ (giữ nguyên công thức v0.1 để bản đồ động phủ không đổi)
export function hash(x, y, s, seed) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s + seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function noise(x, y, s, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi, s, seed), b = hash(xi + 1, yi, s, seed), c = hash(xi, yi + 1, s, seed), d = hash(xi + 1, yi + 1, s, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
