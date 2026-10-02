const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../biology.js'), 'utf8'), context, { filename: path.join(__dirname, '../biology.js') });
const model = context.MicroModel;
const plain = value => JSON.parse(JSON.stringify(value));

test('random is reproducible and bounded', () => {
  const a = model.random(47), b = model.random(47), c = model.random(48);
  const first = Array.from({ length: 1000 }, () => a());
  assert.deepEqual(first, Array.from({ length: 1000 }, () => b()));
  assert.notDeepEqual(first, Array.from({ length: 1000 }, () => c()));
  assert.ok(first.every(x => x >= 0 && x < 1));
});

test('cultures are deterministic, immutable biological descriptors', () => {
  const cultures = model.createCultures(123);
  assert.equal(cultures.length, 121);
  assert.ok(Object.isFrozen(cultures));
  assert.deepEqual(plain(cultures), plain(model.createCultures(123)));
  assert.notDeepEqual(plain(cultures), plain(model.createCultures(124)));
  cultures.forEach((spec, i) => {
    assert.equal(spec.id, i);
    assert.equal(spec.row, Math.floor(i / 11));
    assert.equal(spec.col, i % 11);
    assert.ok(Number.isInteger(spec.type) && spec.type >= 0 && spec.type <= 6);
    ['hue', 'seed', 'size'].forEach(key => assert.ok(Number.isFinite(spec[key])));
    assert.ok(Object.isFrozen(spec));
  });
  assert.equal(model.createCultures(123, 4).length, 16);
});

test('geometry centers the grid and hit testing identifies cultures', () => {
  for (const [w, h] of [[1440, 900], [390, 844], [3840, 2160]]) {
    const layout = model.geometry(w, h);
    assert.ok(layout.side > 0 && layout.gap > 0);
    assert.ok(layout.left >= 0 && layout.top >= 0);
    assert.ok(Math.abs(layout.left * 2 + layout.side - w) < 1e-6);
    assert.ok(Math.abs(layout.top * 2 + layout.side - h) < 1e-6);
    assert.equal(model.hitTest(-100, -100, layout), -1);
    for (let row = 0; row < 11; row++) for (let col = 0; col < 11; col++) {
      assert.equal(model.hitTest(layout.left + (col + .5) * layout.gap, layout.top + (row + .5) * layout.gap, layout), row * 11 + col);
    }
  }
});

test('spring creates new states, converges, and clamps long frames', () => {
  const initial = { value: 0, velocity: 0 };
  const next = model.spring(initial, 1, 1 / 60);
  assert.deepEqual(initial, { value: 0, velocity: 0 });
  assert.notEqual(next, initial);
  assert.ok(next.value > 0 && Number.isFinite(next.velocity));
  assert.deepEqual(plain(model.spring(initial, 1, 10)), plain(model.spring(initial, 1, .05)));
  assert.deepEqual(plain(model.spring(initial, 1, 0)), plain(model.spring(initial, 1, .001)));
  let state = initial;
  for (let i = 0; i < 600; i++) state = model.spring(state, 1, 1 / 60);
  assert.ok(Math.abs(state.value - 1) < .001 && Math.abs(state.velocity) < .001);
});

test('hit testing excludes all four edges outside the grid', () => {
  const layout = model.geometry(1000, 1000);
  const { left, top, side } = layout;
  assert.equal(model.hitTest(left, top, layout), 0);
  assert.equal(model.hitTest(left + side - .001, top + side - .001, layout), 120);
  assert.equal(model.hitTest(left - .001, top, layout), -1);
  assert.equal(model.hitTest(left, top - .001, layout), -1);
  assert.equal(model.hitTest(left + side, top, layout), -1);
  assert.equal(model.hitTest(left, top + side, layout), -1);
});

test('single-cell descriptors and settled spring are stable', () => {
  const cultures = model.createCultures(9, 1);
  assert.equal(cultures.length, 1);
  assert.equal(cultures[0].row, 0);
  assert.equal(cultures[0].col, 0);
  assert.deepEqual(plain(model.spring({ value: 1, velocity: 0 }, 1, .016)), { value: 1, velocity: 0 });
});
