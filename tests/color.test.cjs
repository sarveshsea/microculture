const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../colors.js'), 'utf8'), context, { filename: path.join(__dirname, '../colors.js') });
const color = context.MicroColor;

test('neutral OKLCH converts to linear gray', () => {
  for (const L of [0, .3, .65, 1]) {
    const rgb = color.linearRGB(L, 0, 180);
    assert.equal(rgb.length, 3);
    rgb.forEach(channel => assert.ok(Math.abs(channel - L ** 3) < 1e-6));
  }
});

test('gamut ceiling remains in sRGB and is close to the boundary', () => {
  for (const L of [.3, .5, .65, .8]) for (let H = 0; H < 360; H += 15) {
    const C = color.ceiling(L, H);
    assert.ok(Number.isFinite(C) && C > 0 && C < .5);
    const rgb = color.linearRGB(L, C, H);
    assert.ok(rgb.every(x => x >= -1e-6 && x <= 1.000001));
    const outside = color.linearRGB(L, C + .002, H);
    assert.ok(outside.some(x => x < 0 || x > 1));
  }
});

test('CSS pigment uses OKLCH and scales chroma to gamut', () => {
  for (const H of [0, 80, 160, 240, 320]) {
    const css = color.pigment(H, .65, .8, .5);
    assert.match(css, /^oklch\(/);
    const values = css.match(/[-+]?(?:\d*\.)?\d+/g).map(Number);
    const [L, C, hue, alpha] = values;
    const normalizedL = L > 1 ? L / 100 : L;
    assert.ok(Math.abs(normalizedL - .65) < .001);
    assert.ok(Math.abs(C - color.ceiling(.65, H) * .8) < .001);
    assert.ok(Math.abs(hue - H) < .001);
    assert.equal(alpha, .5);
    assert.ok(color.linearRGB(normalizedL, C, hue).every(x => x >= -1e-5 && x <= 1.00001));
  }
  assert.match(color.css(.7, .1, 40, .3), /^oklch\(/);
});

test('pigments clamp boundary inputs and wrap hue consistently', () => {
  assert.equal(color.pigment(-40), color.pigment(320));
  assert.equal(color.pigment(680), color.pigment(320));
  assert.equal(color.pigment(40, -1, -1, -1), color.pigment(40, .01, 0, 0));
  assert.equal(color.pigment(40, 2, 2, 2), color.pigment(40, .99, 1, 1));
  assert.equal(color.pigment(40), color.pigment(40, .65, .8, 1));
  assert.equal(color.css(.65, .1, -40), color.css(.65, .1, 320, 1));
});

test('inherited color mixes through Cartesian OKLab and remains in gamut', () => {
  const a = { lightness: .65, chroma: .07, hue: 350 };
  const b = { lightness: .65, chroma: .07, hue: 10 };
  const middle = color.mix(a, b, .5);
  assert.ok(Object.isFrozen(middle));
  assert.ok(Math.min(Math.abs(middle.hue), Math.abs(middle.hue - 360)) < 1e-6);
  assert.ok(Math.abs(middle.lightness - .65) < 1e-6);
  assert.ok(Math.abs(middle.chroma - .07 * Math.cos(Math.PI / 18)) < 1e-6);
  for (const [t, expected] of [[0, a], [1, b]]) {
    const mixed = color.mix(a, b, t);
    ['lightness', 'chroma', 'hue'].forEach(k => assert.ok(Math.abs(mixed[k] - expected[k]) < 1e-6));
  }
  const extreme = color.mix({ lightness: .8, chroma: .8, hue: 80 }, b, .25);
  assert.ok(color.linearRGB(extreme.lightness, extreme.chroma, extreme.hue).every(v => v >= -1e-6 && v <= 1.000001));
});
test('perceptual hue blending follows the short arc and keeps pigment chroma',()=>{const a={lightness:.64,chroma:.1,hue:350},b={lightness:.68,chroma:.1,hue:10},m=color.blend(a,b,.5);assert.ok(m.hue<1||m.hue>359);assert.ok(m.chroma>.09);assert.ok(m.chroma<=color.ceiling(m.lightness,m.hue));assert.ok(Object.isFrozen(m));});
test('display palette covers every ROYGBIV family in both themes',()=>{for(const dark of [false,true]){const hues=new Set();for(let i=0;i<70;i++){const p=color.displayPigment({hue:30,pigmentAnchor:30,pigmentIdentity:i.toString(16),lightness:.65,chroma:.08},dark);hues.add(p.hue);assert.ok(color.linearRGB(p.lightness,p.chroma,p.hue).every(v=>v>=-1e-6&&v<=1.000001));}assert.deepEqual([...hues].sort((a,b)=>a-b),[25,55,95,145,245,280,310]);}});
test('display mutations follow anchored short arcs without hue family jumps',()=>{for(const anchor of [49,210,265,359]){const a=color.displayPigment({hue:anchor-.01,pigmentAnchor:anchor,lightness:.65,chroma:.08},false),b=color.displayPigment({hue:anchor+.01,pigmentAnchor:anchor,lightness:.65,chroma:.08},false);assert.ok(Math.abs(a.hue-b.hue)<.02);}const front=color.displayPigment({hue:190,lightness:.65,chroma:.08},false,1),back=color.displayPigment({hue:190,lightness:.65,chroma:.08},false,0);assert.ok(front.chroma>=back.chroma);});
test('light display pigments preserve visible contrast against the neutral white ground',()=>{for(const hue of [18,195,225,250,280,315])for(const depth of [0,1]){const p=color.displayPigment({hue,lightness:.65,chroma:.08},false,depth),rgb=color.linearRGB(p.lightness,p.chroma,p.hue),luminance=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;assert.ok(p.lightness>=.53&&p.lightness<=.6);assert.ok((1+.05)/(luminance+.05)>3);}});


test("dark pigments retain jewel color instead of pale haze",()=>{for(const hue of [205,250,285]){const p=color.displayPigment({hue,lightness:.65,chroma:.1},true);assert.ok(p.lightness<.755);assert.ok(p.chroma/color.ceiling(p.lightness,p.hue)>.76);}});

test('nature habitats soften chroma while retaining legible light and dark pigments',()=>{
 for(const hue of [25,55,95,145,195,245,280,355])for(const dark of [false,true]){
 const pigment=color.displayPigment({hue,habitatHue:hue,chroma:.08,lightness:.65},dark);
 const saturation=pigment.chroma/color.ceiling(pigment.lightness,hue);
 assert.ok(saturation>=.38&&saturation<=.58);
 assert.ok(dark?pigment.lightness>=.72: pigment.lightness<=.67);
 assert.ok(color.linearRGB(pigment.lightness,pigment.chroma,hue).every(v=>v>=0&&v<=1));
 }
});
