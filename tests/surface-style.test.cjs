const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const css = fs.readFileSync(require('node:path').join(__dirname, '../styles.css'), 'utf8');
test('surfaces never blur, glow, or shadow the artwork', () => {
  assert.doesNotMatch(css, /(?:backdrop-filter|filter)\s*:\s*(?!none)[^;}]*blur\(/);
  assert.doesNotMatch(css, /(?:box-shadow|text-shadow)\s*:\s*(?!none)[^;}]+/);
  assert.doesNotMatch(css, /body::after/);
});
test('navigation retains touch, hidden-control, and crisp surface contracts', () => {
  assert.match(css, /--hairline:\s*\.35px/);
  assert.match(css, /--touch-target:\s*44px/);
  assert.match(css, /\.navigation \[hidden\]\s*\{\s*display:\s*none!important/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /prefers-reduced-motion/);
});
