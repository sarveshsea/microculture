const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = vm.createContext({});
for (const file of ['colors.js', 'biology.js', 'evolution.js']) {
  const filename = path.join(__dirname, '..', file);
  vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
}
const evolution = context.MicroEvolution;
const plain = value => JSON.parse(JSON.stringify(value));
const genomeKeys = ['lightness', 'chroma', 'hue', 'rodness', 'branching', 'cohesion', 'metabolism', 'longevity'];
function checkGenome(genome) {
  assert.ok(Object.isFrozen(genome));
  genomeKeys.forEach(key => assert.ok(Number.isFinite(genome[key]), key));
  assert.ok(genome.lightness >= 0 && genome.lightness <= 1);
  assert.ok(genome.chroma >= 0 && genome.chroma <= .5);
  assert.ok(genome.hue >= 0 && genome.hue < 360);
  ['rodness', 'branching', 'cohesion', 'metabolism', 'longevity'].forEach(key => assert.ok(genome[key] >= 0 && genome[key] <= 1, key));
}
function checkWorld(world) {
  assert.ok(Object.isFrozen(world) && Object.isFrozen(world.colonies));
  assert.equal(world.colonies.length, 121);
  const allIds = world.colonies.flatMap(colony => Array.from(colony.cells, cell => cell.id));
  assert.equal(new Set(allIds).size, allIds.length);
  world.colonies.forEach((colony, i) => {
    assert.ok(Object.isFrozen(colony));
    assert.equal(colony.id, i);
    assert.ok(Object.isFrozen(colony.cells) && Object.isFrozen(colony.debris));
    assert.ok(colony.cells.length <= 72 && colony.debris.length <= 60);
    assert.ok(Number.isFinite(colony.nutrient) && colony.nutrient >= .08 && colony.nutrient <= 1);
    assert.ok(Object.isFrozen(colony.branches) && colony.branches.length <= 100);
    colony.branches.forEach(branch => assert.ok(world.time - branch.born < branch.lifespan));
    colony.debris.forEach(fragment => assert.ok(world.time - fragment.born < fragment.lifespan));
    checkGenome(colony.genome);
    assert.equal(new Set(colony.cells.map(cell => cell.id)).size, colony.cells.length);
    colony.cells.forEach(cell => {
      assert.ok(Object.isFrozen(cell) && Object.isFrozen(cell.parentIds));
      assert.ok(Number.isFinite(cell.born) && Number.isFinite(cell.divideAt));
      assert.ok(cell.lifespan >= 20 && cell.lifespan <= 80);
      assert.ok(cell.radius > 0 && Number.isFinite(cell.angle));
      assert.ok(Math.hypot(cell.x, cell.y) <= .88000001);
      checkGenome(cell.genome);
      if (cell.generation > 0) {
        assert.equal(cell.parentIds.length, 2);
        assert.ok(cell.parentIds.every(id => id !== cell.id));
        assert.equal(new Set(cell.parentIds).size, 2);
      }
    });
  });
}

test('initial world is seeded, frozen, and populated with bounded cells', () => {
  const world = evolution.create(42);
  assert.equal(world.time, 0);
  assert.equal(world.seed, 42);
  checkWorld(world);
  assert.deepEqual(plain(world), plain(evolution.create(42)));
  assert.notDeepEqual(plain(world), plain(evolution.create(43)));
  world.colonies.forEach(colony => {
    assert.equal(colony.generation, 0);
    assert.ok(colony.cells.length >= 24 && colony.cells.length <= 46);
    assert.equal(colony.debris.length, 0);
    colony.cells.forEach(cell => {
      assert.equal(cell.generation, 0);
      assert.equal(cell.parentIds.length, 0);
    });
  });
});

test('advancing is immutable and pausing preserves identity', () => {
  const world = evolution.create(1), snapshot = JSON.stringify(world);
  assert.equal(evolution.advance(world, 0), world);
  assert.equal(evolution.advance(world, -1), world);
  const next = evolution.advance(world, 5);
  assert.notEqual(next, world);
  assert.equal(next.time, .25);
  assert.equal(next.seed, world.seed);
  assert.equal(JSON.stringify(world), snapshot);
  assert.deepEqual(plain(next), plain(evolution.advance(world, .25)));
});

test('inheritance blends parental traits with reproducible bounded mutations', () => {
  const world = evolution.create(10);
  const a = world.colonies[0].genome, b = world.colonies[1].genome;
  const child = evolution.breed(a, b, 7);
  checkGenome(child);
  assert.notEqual(child, a);
  assert.notEqual(child, b);
  assert.deepEqual(plain(child), plain(evolution.breed(a, b, 7)));
  assert.notDeepEqual(plain(child), plain(evolution.breed(a, b, 8)));
  for (const key of ['lightness', 'chroma', 'rodness', 'branching', 'cohesion', 'metabolism', 'longevity']) {
    assert.ok(child[key] >= Math.min(a[key], b[key]) - .1 && child[key] <= Math.max(a[key], b[key]) + .1, key);
  }
});

test('life grows from birth then ages toward decay', () => {
  const cell = evolution.create(2).colonies[0].cells[0];
  const ages = [0, .1, .25, .5, .9, 1].map(fraction => evolution.life(cell, cell.born + cell.lifespan * fraction));
  ages.forEach(p => ['growth', 'health', 'decay'].forEach(k => assert.ok(p[k] >= 0 && p[k] <= 1)));
  assert.ok(ages[1].growth > ages[0].growth);
  for (let i = 1; i < ages.length; i++) assert.ok(ages[i].health <= ages[i - 1].health);
  assert.ok(ages.at(-1).decay > ages[0].decay);
});

test('birth separation stops instead of looping forever', () => {
  const cell = evolution.create(3).colonies[0].cells[0];
  const birth = evolution.position(cell, cell.born);
  const mature = evolution.position(cell, cell.born + cell.lifespan);
  const later = evolution.position(cell, cell.born + cell.lifespan * 2);
  assert.notDeepEqual(plain(birth), plain(mature));
  assert.deepEqual(plain(mature), plain(later));
  for (const position of [birth, mature, later]) assert.ok(Math.hypot(position.x, position.y) < 1);
});

test('persistent structure births inherited children and removes old cells over 120 seconds', () => {
  const initial = evolution.create(88);
  const originalIds = initial.colonies.map(colony => new Set(colony.cells.map(cell => cell.id)));
  let world = initial, childrenSeen = false, deathSeen = false;
  for (let step = 0; step < 480; step++) {
    world = evolution.advance(world, .25);
    if (step % 40 === 0 || step === 479) checkWorld(world);
    world.colonies.forEach((colony, i) => {
      if (colony.cells.some(cell => cell.generation > 0)) childrenSeen = true;
      if (initial.colonies[i].cells.some(cell => !colony.cells.some(current => current.id === cell.id))) deathSeen = true;
      colony.cells.filter(cell => cell.generation > 0).forEach(cell => {
        assert.ok(cell.parentIds.every(id => id !== cell.id));
      });
    });
  }
  assert.equal(world.time, 120);
  assert.ok(childrenSeen && deathSeen);
  assert.ok(world.colonies.some((colony, i) => colony.cells.some(cell => !originalIds[i].has(cell.id))));
  assert.notDeepEqual(plain(world.colonies), plain(initial.colonies));
});

function replaceColony(world, index, changes) {
  return Object.freeze({ ...world, colonies: Object.freeze(world.colonies.map((colony, i) =>
    i === index ? Object.freeze({ ...colony, ...changes }) : colony)) });
}

test('a retained spore recolonizes both empty and fully aged populations', () => {
  const world = evolution.create(77);
  const original = world.colonies[0];
  for (const empty of [true, false]) {
    const cells = empty ? Object.freeze([]) : Object.freeze(original.cells.map(cell =>
      Object.freeze({ ...cell, born: -1000 })));
    const exhausted = replaceColony(world, 0, { cells });
    const next = evolution.advance(exhausted, .25), restored = next.colonies[0];
    assert.equal(exhausted.colonies[0].cells, cells);
    assert.equal(restored.cells.length, 1);
    assert.equal(restored.cells[0].id, original.nextId);
    assert.equal(restored.nextId, original.nextId + 1);
    assert.equal(restored.cells[0].generation, 1);
    assert.deepEqual(plain(restored.cells[0].genome), plain(original.genome));
    assert.equal(restored.cells[0].born, next.time);
    assert.equal(restored.cells[0].parentIds.length, 2);
    assert.ok(restored.cells[0].parentIds.every(id => id !== restored.cells[0].id));
    checkWorld(next);
  }
});

test('expired debris and branches disappear without clearing younger structures', () => {
  const world = evolution.create(5), colony = world.colonies[0];
  const cells = Object.freeze(colony.cells.map(cell => Object.freeze({ ...cell, born: 0, divideAt: 100 })));
  const old = Object.freeze({ born: -10, lifespan: 10, genome: colony.genome });
  const young = Object.freeze({ born: 0, lifespan: 10, genome: colony.genome });
  const input = replaceColony(world, 0, { cells, debris: Object.freeze([old, young]), branches: Object.freeze([old, young]) });
  const next = evolution.advance(input, .25).colonies[0];
  assert.deepEqual(Array.from(next.debris), [young]);
  assert.deepEqual(Array.from(next.branches), [young]);
  assert.equal(input.colonies[0].debris.length, 2);
  assert.equal(input.colonies[0].branches.length, 2);
});

test('simultaneous lysis is bounded and retains globally unique descendant IDs', () => {
  const world = evolution.create(99);
  const exhausted = Object.freeze({ ...world, colonies: Object.freeze(world.colonies.map(colony =>
    Object.freeze({ ...colony, cells: Object.freeze(colony.cells.map(cell => Object.freeze({ ...cell, born: -1000 }))) }))) });
  const next = evolution.advance(exhausted, .25);
  checkWorld(next);
  assert.ok(next.colonies.every(colony => colony.debris.length === 60));
  const parentIds = next.colonies.flatMap(colony => Array.from(colony.cells[0].parentIds));
  const childIds = new Set(next.colonies.flatMap(colony => Array.from(colony.cells, cell => cell.id)));
  assert.ok(parentIds.every(id => !childIds.has(id)));
});
