/* Seeded colony metadata, responsive grid geometry and interaction spring. */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function random(seed) {
    let s = seed;
    return () => {
      s |= 0; s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function createCultures(seed, grid = 11) {
    const r = random(seed), middle = (grid - 1) / 2;
    return Object.freeze(Array.from({ length: grid * grid }, (_, id) => {
      const row = Math.floor(id / grid), col = id % grid;
      const d = Math.hypot((col - middle) / Math.max(middle, 1), (row - middle) / Math.max(middle, 1));
      const hue = d < .22 ? 96 : d < .47 ? 58 : d < .69 ? 24 : d < .85 ? 347 : d < 1.05 ? 280 : d < 1.25 ? 230 : 145;
      const type = Math.floor(r() * 7), cultureSeed = Math.floor(r() * 1e9);
      return Object.freeze({ id, row, col, type, seed: cultureSeed, hue: hue + (r() - .5) * 20,
        k: 4 + Math.floor(r() * 7), phase: r() * TAU, size: 1.02 + r() * .19 });
    }));
  }
  function geometry(w, h) {
    const side = Math.min(w * .89, h * .84), gap = side / 11;
    return { side, gap, left: (w - side) / 2, top: (h - side) / 2 };
  }
  function hitTest(x, y, layout) {
    const col = Math.floor((x - layout.left) / layout.gap);
    const row = Math.floor((y - layout.top) / layout.gap);
    return col < 0 || row < 0 || col >= 11 || row >= 11 ? -1 : row * 11 + col;
  }
  function spring(state, target, dt) {
    const step = clamp(dt, .001, .05), stiffness = 260, damping = 30;
    const velocity = state.velocity + (stiffness * (target - state.value) - damping * state.velocity) * step;
    const value = state.value + velocity * step;
    if (Math.abs(target - value) < .0001 && Math.abs(velocity) < .0001) return { value: target, velocity: 0 };
    return { value, velocity };
  }
  globalThis.MicroModel = Object.freeze({ random, createCultures, geometry, hitTest, spring });
})();
