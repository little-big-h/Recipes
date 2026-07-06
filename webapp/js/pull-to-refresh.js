// Custom pull-to-refresh gesture. iOS Safari only offers this natively for
// a plain browser tab, not for a home-screen-installed (standalone) PWA —
// since this app is meant to be installed, the gesture has to be built by
// hand. Only engages when the page is scrolled to the top.

const THRESHOLD = 64;
const MAX_PULL = 100;
const RESISTANCE = 0.5;

export function initPullToRefresh(onRefresh) {
  const indicator = document.getElementById('ptr-indicator');
  const label = indicator?.querySelector('.ptr-label');
  if (!indicator || !label) return;

  let startY = null;
  let pulling = false;
  let refreshing = false;
  let armed = false;

  const atTop = () => window.scrollY <= 0;

  function setHeight(px) {
    indicator.style.height = `${px}px`;
  }

  function setArmed(next) {
    if (next === armed) return;
    armed = next;
    indicator.classList.toggle('armed', armed);
    label.textContent = armed ? 'Release to refresh' : 'Pull to refresh';
  }

  function settle() {
    indicator.style.transition = 'height 0.2s ease';
    setHeight(0);
    setArmed(false);
  }

  document.addEventListener(
    'touchstart',
    (e) => {
      if (refreshing || !atTop()) {
        startY = null;
        return;
      }
      startY = e.touches[0].clientY;
      pulling = true;
      indicator.style.transition = '';
    },
    { passive: true }
  );

  document.addEventListener(
    'touchmove',
    (e) => {
      if (!pulling || startY === null || refreshing) return;
      const delta = e.touches[0].clientY - startY;
      if (delta <= 0 || !atTop()) {
        pulling = false;
        return;
      }
      setHeight(Math.min(MAX_PULL, delta * RESISTANCE));
      setArmed(delta * RESISTANCE >= THRESHOLD);
      e.preventDefault();
    },
    { passive: false }
  );

  document.addEventListener('touchend', async () => {
    if (!pulling) return;
    pulling = false;

    if (!armed || refreshing) {
      settle();
      return;
    }

    refreshing = true;
    indicator.classList.add('refreshing');
    label.textContent = 'Refreshing…';
    indicator.style.transition = 'height 0.2s ease';
    setHeight(48);

    try {
      await onRefresh();
    } finally {
      indicator.classList.remove('refreshing');
      settle();
      refreshing = false;
    }
  });
}
