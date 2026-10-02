/* One shared, manually hidden control bar for the grid and focused petri. */
const MicroNavigation = (() => {
  let collapsed = false;
  const bars = [...document.querySelectorAll('.navigation')];
  function synchronize() {
    for (const bar of bars) {
      const primary = bar.querySelector('.navigation-primary');
      primary.hidden = collapsed;
      primary.inert = collapsed;
      bar.querySelector('.navigation-pull').hidden = !collapsed;
      bar.dataset.collapsed = String(collapsed);
    }
  }
  function show() {
    const activeBar = bars.find(bar => bar.contains(document.activeElement));
    collapsed = false;
    synchronize();
    activeBar?.querySelector('.navigation-primary button').focus({ preventScroll: true });
  }
  for (const bar of bars) {
    const pull = bar.querySelector('.navigation-pull');
    bar.querySelector('[id$="collapse"]').addEventListener('click', () => {
      collapsed = true;
      synchronize();
      pull.focus({ preventScroll: true });
    });
    let startY = null;
    pull.addEventListener('click', show);
    pull.addEventListener('pointerdown', event => {
      startY = event.clientY;
      pull.setPointerCapture(event.pointerId);
    });
    pull.addEventListener('pointerup', event => {
      if (startY !== null && startY - event.clientY > 16) show();
      startY = null;
    });
    pull.addEventListener('pointercancel', () => { startY = null; });
  }
  synchronize();
  return Object.freeze({ show });
})();
