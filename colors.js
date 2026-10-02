/* All pigments use an equal fraction of their hue's sRGB chroma ceiling.
   OKLab reference matrices: https://bottosson.github.io/posts/oklab/ */
(() => {
  'use strict';
  const cache = new Map();
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function linearRGB(L, C, H) {
    const a = C * Math.cos(H * Math.PI / 180);
    const b = C * Math.sin(H * Math.PI / 180);
    const l = (L + .3963377774 * a + .2158037573 * b) ** 3;
    const m = (L - .1055613458 * a - .0638541728 * b) ** 3;
    const s = (L - .0894841775 * a - 1.291485548 * b) ** 3;
    return [4.0767416621*l - 3.3077115913*m + .2309699292*s,
      -1.2684380046*l + 2.6097574011*m - .3413193965*s,
      -.0041960863*l - .7034186147*m + 1.707614701*s];
  }
  function ceiling(L, H) {
    const key = `${L}:${H}`;
    if (cache.has(key)) return cache.get(key);
    let lo = 0, hi = .5;
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2;
      const fits = linearRGB(L, mid, H).every(v => v >= -1e-8 && v <= 1 + 1e-8);
      if (fits) lo = mid; else hi = mid;
    }
    if(cache.size>=8192)cache.clear();
    cache.set(key, lo);
    return lo;
  }
  function css(L, C, H, alpha = 1) {
    return `oklch(${L.toFixed(4)} ${C.toFixed(5)} ${(((H % 360) + 360) % 360).toFixed(2)} / ${clamp(alpha, 0, 1).toFixed(3)})`;
  }
  function pigment(hue, lightness = .65, saturation = .8, alpha = 1) {
    const L = clamp(lightness, .01, .99), H = ((hue % 360) + 360) % 360;
    return css(L, ceiling(L, H) * clamp(saturation, 0, 1) * .999, H, alpha);
  }
  function mix(a, b, amount = .5) {
    const t = clamp(amount, 0, 1), L = a.lightness + (b.lightness-a.lightness)*t;
    const ax = a.chroma*Math.cos(a.hue*Math.PI/180), ay = a.chroma*Math.sin(a.hue*Math.PI/180);
    const bx = b.chroma*Math.cos(b.hue*Math.PI/180), by = b.chroma*Math.sin(b.hue*Math.PI/180);
    const x = ax+(bx-ax)*t, y = ay+(by-ay)*t;
    const H = ((Math.atan2(y,x)*180/Math.PI)%360+360)%360;
    return Object.freeze({lightness:L, chroma:Math.min(Math.hypot(x,y),ceiling(L,H)*.998), hue:H});
  }
  function blend(a,b,amount=.5){
    const t=clamp(amount,0,1),delta=((b.hue-a.hue+540)%360)-180;
    const lightness=a.lightness+(b.lightness-a.lightness)*t,hue=(a.hue+delta*t+360)%360;
    const chroma=a.chroma+(b.chroma-a.chroma)*t;
    return Object.freeze({lightness,chroma:Math.min(chroma,ceiling(lightness,hue)*.94),hue});
  }
  function displayPigment(genome,dark=false,depth=1){
    const hue=((genome.hue%360)+360)%360;
    const anchor=((Number.isFinite(genome.pigmentAnchor)?genome.pigmentAnchor:Number.isFinite(genome.founderHue)?genome.founderHue:hue)%360+360)%360;
    const identity=typeof genome.pigmentIdentity==='string'?parseInt(genome.pigmentIdentity,16):NaN;
    const bucket=Number.isFinite(identity)?identity%7:Math.floor(anchor/360*7);
    const family=[25,55,95,145,245,280,310][bucket];
    const delta=((hue-anchor+540)%360)-180;
    const displayHue=Number.isFinite(genome.habitatHue)?genome.habitatHue:family+clamp(delta*.35,-8,8),front=clamp(depth,0,1);
    const habitat=Number.isFinite(genome.habitatHue);
    const lightness=clamp((habitat?(dark?.77:.62):(dark?.715:.565))+(genome.lightness-.65)*.2+(dark?-.025:.025)*(1-front),habitat?(dark?.72:.57):(dark?.67:.53),habitat?(dark?.81:.67):(dark?.755:.6));
    const saturation=clamp((habitat?(dark?.46:.49):(dark?.82:.72))+(genome.chroma-.08)*(habitat?.7:1.6),habitat?.38:(dark?.72:.62),habitat?.58:(dark?.95:.89))*(.88+.12*front);
    return Object.freeze({lightness,chroma:ceiling(lightness,displayHue)*saturation,hue:displayHue});
  }
  globalThis.MicroColor = Object.freeze({ linearRGB, ceiling, pigment, css, mix, blend, displayPigment });
})();
