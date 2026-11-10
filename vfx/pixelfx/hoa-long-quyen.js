// Hỏa Long Quyển (Tu Tiên Lộ): a small fire whirlwind for a 12 x 25 px hero, two flame ribbons coiling up a
// translucent funnel like a dragon wrapping a pillar. Fire tongues, puffs and smoke use the fire _lib helpers,
// whose recipes are adapted from Sprite Fusion's open-source fire
// (https://www.spritefusion.com/pixel-art-vfx/fire), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, mix, hex, clamp, WHITE, TAU } from "../../core/index.js";
import { noiseFor, hotFirst, flameTongue, firePuff, smokePuff, looped, drift, floorLight, LAYERS, BACK_LAYERS } from "./_lib.js";

export const meta = {
  name: "Hoa Long Quyen",
  desc: "A small fire whirlwind: two thick flame ribbons coil up a glowing funnel like a dragon round a pillar, a whirling ring of tongues at its foot, sparks flung off.",
  tags: ["fire", "tornado", "vortex", "dragon", "xianxia", "loop", "small"],
  size: [56, 60],
  origin: [28, 54],
  duration: 1.2,
  loop: true,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#3a0e0c", "#7a1a12", "#bf2a18", "#ec5418", "#ff8a26", "#ffbf3a", "#ffe26a", "#fff4b0", "#ffffff"],
    height: 36,
    seed: 7,
  },
};

const D = meta.duration, NL = noiseFor(D), SMOKE1 = hex("#4f4a5a");

export function draw(p, t, o) {
  const F = fit(o.palette, 9), H = hotFirst(F), S = o.seed, HT = o.height, ph = t / D;
  const N = (rate, seed = 0, off = 0) => NL(t, rate, seed, off);
  const GLOW = mix(mix(H[3], H[4], 0.5), WHITE, 0.2), SMOKE = mix(SMOKE1, H[6], 0.2);
  // the funnel: a thin foot, flaring to the top, its spine swaying once a loop
  const cx = (v) => 1.6 * Math.sin(ph * TAU + v * 3) * v;
  const rad = (v) => 2 + 9 * Math.pow(v, 1.2);
  const ang = (v, k) => ph * TAU * 2 + v * 7.5 + k * Math.PI;   // two ribbons, half a turn apart

  const ribbon = (front) => {
    for (let k = 0; k < 2; k++) {
      for (let y = -1; y >= -HT; y -= 0.5) {
        const v = -y / HT, a = ang(v, k), z = Math.sin(a);
        if (z >= 0 !== front) continue;
        const x = cx(v) + Math.cos(a) * rad(v);
        // a shaded tube: dark rim, coloured body, hot core facing us; cooling toward the top, far side dimmer
        const heat = (front ? 0.6 + 0.4 * z : 0.3 + 0.2 * -z) - 0.3 * v + 0.1 * N(6, S + k * 9, y * 0.2);
        const c = heat > 0.85 ? H[1] : heat > 0.7 ? H[2] : heat > 0.54 ? H[3] : heat > 0.38 ? H[4] : heat > 0.22 ? H[5] : H[6];
        const w = front ? (v < 0.85 ? 2 : 1) : 1;
        p.px(x - 1, y + 0.5, front ? H[Math.min(8, 6 + (v > 0.5 ? 1 : 0))] : H[7]);
        p.px(x, y, c);
        if (w > 1) p.px(x + 1, y, heat > 0.7 ? H[3] : H[5]);
        if (front && z > 0.82 && heat > 0.62) p.px(x, y, H[0]);
        // licks trailing off the front coil, flickering up and back
        if (front && z > 0.2 && (Math.round(y * 2 + k * 5) % 9) === 0) flameTongue(p, x, y, 2 + 2.5 * (0.5 + 0.5 * N(8, S + k * 31, y * 0.3)), 0.8, -Math.sin(a) * 1.5, N, S + k * 40 + Math.round(-y), H, LAYERS);
        if (front && heat > 0.7 && (Math.round(y * 2) & 3) === 0) p.light(x, y, H[3], 0.3);
      }
    }
  };

  // the rim: the funnel comes apart at the top into a crown of tongues
  const rim = (front) => {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU - ph * TAU * 2, z = Math.sin(a);
      if (z >= 0 !== front) continue;
      const n = (S * 7 + i) * 17, R = rad(1) * 0.9, h = (3 + 3.5 * (0.5 + 0.5 * N(6, n))) * (front ? 1 : 0.7);
      flameTongue(p, cx(1) + Math.cos(a) * R, -HT + 1 + z * R * 0.3, h, 1.1, Math.cos(a + Math.PI / 2) * 2, N, n, H, front ? LAYERS : BACK_LAYERS);
    }
  };

  // the dragon's head: where ribbon 0 leaves the funnel at the top, a bright flare that breathes
  const head = () => {
    const v = 1, a = ang(v, 0), z = Math.sin(a);
    const x = cx(v) + Math.cos(a) * (rad(v) + 1), y = -HT - 1, k = 0.7 + 0.3 * Math.sin(ph * TAU * 3);
    flameTongue(p, x, y, 4 + 2 * k, 1.4, Math.cos(a) * 2, N, S + 77, H, LAYERS);
    p.px(x, y - 1, H[0]);
    p.glow(x, y - 1, 7, H[2], 0.5 * k * (z >= 0 ? 1 : 0.6));
  };

  const ring = (front) => {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + ph * TAU * 2, z = Math.sin(a);
      if (z >= 0 !== front) continue;
      const n = (S * 5 + i) * 13, R = 8 + 1.2 * N(2, n), h = (3 + 3 * (0.5 + 0.5 * N(5, n + 1))) * (front ? 1 : 0.75);
      flameTongue(p, Math.cos(a) * R, z * R * 0.3, h, 1, -Math.cos(a + Math.PI / 2) * 2, N, n, H, front ? LAYERS : BACK_LAYERS);
    }
  };

  const embers = [];
  looped(t, D, 14, S + 500, (r) => ({ v0: r.range(0.05, 0.6), rise: r.range(0.25, 0.5), a: r.range(0, TAU), w: r.range(5, 8), out: r.range(2, 6), life: r.range(0.6, 1.2) }), (q, age) => {
    const v = Math.min(1, q.v0 + q.rise * age), R = rad(v) + q.out + age * 3, a = q.a + q.w * age;
    embers.push({ x: cx(v) + Math.cos(a) * R, y: -v * HT + Math.sin(a) * R * 0.3, z: Math.sin(a), k: 1 - age / q.life });
  });
  const drawEmbers = (front) => {
    for (const e of embers) {
      if (e.z >= 0 !== front || e.k <= 0) continue;
      p.px(e.x, e.y, e.k > 0.6 ? H[1] : e.k > 0.3 ? H[3] : H[5]);
      if (front) p.light(e.x, e.y, H[3], 0.3 * e.k);
    }
  };

  // smoke curling from the top
  looped(t, D, 4, S + 300, (r) => ({ a: r.range(0, TAU), life: r.range(0.5, 0.8), s: r.range(1, 1.8), vy: -r.range(8, 14) }), (q, age) => {
    const R = rad(1) * (0.7 + age * 0.6), a = q.a + age * 4;
    smokePuff(p, cx(1) + Math.cos(a) * R, -HT - 1 + q.vy * age + Math.sin(a) * R * 0.3, 1 - age / q.life, q.s, SMOKE);
  });

  const fl = 0.85 + 0.15 * N(7, S + 1);
  floorLight(p, 0, 0.5, 20, 4, GLOW, 0.35 * fl);
  drawEmbers(false);
  ring(false);
  rim(false);
  ribbon(false);
  // the funnel itself: a faint translucent body so the ribbons read as wrapped round something
  for (let y = -2; y >= -HT; y -= 2) {
    const v = -y / HT;
    p.disc(cx(v), y, rad(v) * 0.8, v < 0.4 ? H[3] : v < 0.75 ? H[4] : H[5], 0.16 * (1 - v * 0.6));
    if ((y & 3) === 0) p.glow(cx(v), y, rad(v) + 4, GLOW, 0.1 * fl * (1 - v * 0.5));
  }
  ribbon(true);
  // sparks flung off the coils
  looped(t, D, 18, S + 200, (r) => ({ v: r.range(0.1, 0.9), side: r.sign(), sp: r.range(14, 30), life: r.range(0.2, 0.4), s: r.range(0.9, 1.6), f: r.next() }), (q, age) => {
    const x0 = cx(q.v) + q.side * rad(q.v), y0 = -q.v * HT;
    const [x, y] = drift(x0, y0, q.side * q.sp, -q.sp * 0.5, age, 0, -40, 3, 3);
    firePuff(p, x, y, 1 - age / q.life, q.s, q.f, H, 0.08, -q.side * 0.6, -0.8);
  });
  ring(true);
  rim(true);
  head();
  drawEmbers(true);
  p.glow(0, -HT * 0.5, 30, GLOW, 0.2 * fl);
  p.glow(0, -3, 9, H[2], 0.25 * fl);
}
