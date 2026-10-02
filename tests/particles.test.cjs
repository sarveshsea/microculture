const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = vm.createContext({});
for (const file of ['colors.js', 'biology.js', 'evolution.js', 'particles.js']) {
  const filename = path.join(__dirname, '..', file);
  vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
}
const particles = context.MicroParticles;
const plain = value => JSON.parse(JSON.stringify(value));
const magnitude = dot => Math.hypot(dot.vx, dot.vy);

test('cell samples are deterministic frozen disk points with area coverage', () => {
  const cell = context.MicroEvolution.create(61).colonies[0].cells[0];
  const dots = particles.sample(cell, 1000);
  assert.ok(Object.isFrozen(dots));
  assert.equal(dots.length, 1000);
  assert.deepEqual(plain(dots), plain(particles.sample(cell, 1000)));
  assert.notDeepEqual(plain(dots), plain(particles.sample({ ...cell, seed: cell.seed + 1 }, 1000)));
  dots.forEach(dot => {
    assert.ok(Object.isFrozen(dot));
    assert.ok(Math.hypot(dot.x, dot.y) <= 1.00000001);
    assert.ok(Number.isFinite(dot.radius) && dot.radius > 0);
  });
  const meanRadiusSquared = dots.reduce((sum, dot) => sum + dot.x ** 2 + dot.y ** 2, 0) / dots.length;
  assert.ok(meanRadiusSquared > .4 && meanRadiusSquared < .6);
  const quadrants = [0, 0, 0, 0];
  dots.forEach(dot => quadrants[(dot.x >= 0 ? 1 : 0) + (dot.y >= 0 ? 2 : 0)]++);
  assert.ok(quadrants.every(count => count > 180 && count < 320));
  assert.equal(particles.sample(cell, 0).length, 0);
});

test('analytic spring returns frozen states without mutating input and converges', () => {
  const dot = Object.freeze({ x: .8, y: -.5, vx: .2, vy: -.1 });
  const home = Object.freeze({ x: .1, y: .2 });
  const snapshot = JSON.stringify(dot);
  let state = particles.step(dot, home, null, .016);
  assert.notEqual(state, dot);
  assert.ok(Object.isFrozen(state));
  assert.equal(JSON.stringify(dot), snapshot);
  for (let i = 0; i < 1000; i++) state = particles.step(state, home, null, .016);
  assert.ok(Math.hypot(state.x - home.x, state.y - home.y) < 1e-9);
  assert.ok(magnitude(state) < 1e-9);
});

test('analytic spring is frame independent and clamps dropped frames', () => {
  const dot = { x: .8, y: -.5, vx: .2, vy: -.1 }, home = { x: 0, y: 0 };
  const single = particles.step(dot, home, null, .032);
  const split = particles.step(particles.step(dot, home, null, .016), home, null, .016);
  ['x', 'y', 'vx', 'vy'].forEach(key => assert.ok(Math.abs(single[key] - split[key]) < 1e-10));
  assert.deepEqual(plain(particles.step(dot, home, null, 2)), plain(particles.step(dot, home, null, .05)));
  assert.deepEqual(plain(particles.step(dot, home, null, -.5)), plain(particles.step(dot, home, null, 0)));
  assert.deepEqual(plain(particles.step(dot, home, null, 0)), dot);
});

test('pointer repulsion separates nearby dots then relaxes back to their homes', () => {
  const home = { x: .1, y: 0 }, hand = { x: 0, y: 0, reach: .45 };
  const dot = { ...home, vx: 0, vy: 0 };
  let state = particles.step(dot, home, hand, .05);
  assert.ok(state.x > dot.x && state.vx > 0);
  for (let i = 0; i < 300; i++) state = particles.step(state, home, null, .016);
  assert.ok(Math.hypot(state.x - home.x, state.y - home.y) < 1e-8);
  const far = particles.step(dot, home, { x: 4, y: 4, reach: .45 }, .016);
  assert.deepEqual(plain(far), plain(particles.step(dot, home, null, .016)));
  const coincident = particles.step({ x: 0, y: 0, vx: 0, vy: 0 }, { x: 0, y: 0 }, hand, .05);
  assert.ok(['x', 'y', 'vx', 'vy'].every(key => Number.isFinite(coincident[key])));
});

test('velocity stretching is bounded and tracks direction', () => {
  const still = particles.stretch(0, 0);
  const moving = particles.stretch(1, 0);
  const fast = particles.stretch(100, 100);
  assert.equal(still.scale, 1);
  assert.ok(moving.scale > still.scale);
  for (const shape of [still, moving, fast]) {
    assert.ok(shape.scale >= 1 && shape.scale <= 2.6);
    assert.ok(Number.isFinite(shape.angle));
  }
  assert.ok(Math.abs(particles.stretch(0, 1).angle - Math.PI / 2) < 1e-9);
});

test('speed control spans a stopped simulation through 32 times normal speed', () => {
  assert.equal(particles.speed(0), 0);
  assert.equal(particles.speed(50), 2);
  assert.equal(particles.speed(100), 32);
  assert.equal(particles.speed(-20), 0);
  assert.equal(particles.speed(120), 32);
  assert.equal(particles.speed(25), .125);
});

test('a burst applies a bounded local outward impulse without mutating dots', () => {
  const dot = Object.freeze({ x: .1, y: 0, vx: 0, vy: 0 });
  const burst = particles.burst(dot, { x: 0, y: 0 });
  assert.notEqual(burst, dot);
  assert.ok(Object.isFrozen(burst));
  assert.ok(burst.vx > 0);
  assert.equal(burst.x, dot.x);
  assert.equal(burst.y, dot.y);
  assert.deepEqual(dot, { x: .1, y: 0, vx: 0, vy: 0 });
  assert.deepEqual(plain(particles.burst(dot, { x: 5, y: 5 })), dot);
  const coincident = particles.burst({ x: 0, y: 0, vx: 0, vy: 0 }, { x: 0, y: 0 });
  assert.ok(['x', 'y', 'vx', 'vy'].every(key => Number.isFinite(coincident[key])));
});

test('optical lens has bounded magnification and a smooth identity boundary',()=>{assert.equal(particles.lensScale(0),1.32);assert.equal(particles.lensScale(1),1);assert.equal(particles.lensScale(.5,0),1);assert.ok(particles.lensScale(.99)-1<.001);assert.ok(particles.lensScale(.2)>particles.lensScale(.8));});
