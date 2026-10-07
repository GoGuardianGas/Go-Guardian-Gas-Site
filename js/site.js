/* Guardian Gas Solutions — site behavior */

(function () {
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.nav-menu');
  function closeMenu() {
    toggle.classList.remove('open'); menu.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.classList.toggle('open', open); menu.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && menu.classList.contains('open')) { closeMenu(); toggle.focus(); }
    });
    window.matchMedia('(min-width:901px)').addEventListener('change', () => closeMenu());
  }
  const motion = document.querySelector('.motion-toggle');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduce.matches;
  try { paused = paused || localStorage.getItem('ggs-motion-paused') === 'true'; } catch {}
  function applyMotion() {
    document.documentElement.classList.toggle('motion-paused', paused);
    if (motion) { motion.hidden = false; motion.setAttribute('aria-pressed', String(paused)); motion.textContent = paused ? 'Animations paused' : 'Pause animations'; }
  }
  applyMotion();
  if (motion) motion.addEventListener('click', () => {
    paused = !paused; applyMotion();
    try { localStorage.setItem('ggs-motion-paused', String(paused)); } catch {}
  });
  reduce.addEventListener('change', e => { paused = e.matches; applyMotion(); });

  // Scroll-in fade-up + reveal for section headers and stats
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          if (e.target.hasAttribute('data-count')) animateCount(e.target);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

    document.querySelectorAll('.fade-up, .section-header, .stat').forEach(el => io.observe(el));
  } else {
    document.querySelectorAll('.fade-up, .section-header, .stat').forEach(el => el.classList.add('visible'));
  }

  // Count-up animation for any element tagged data-count="<number>"
  function animateCount(el) {
    if (paused) return;
    const target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) return;
    const suffix = el.getAttribute('data-suffix') || '';
    const dur = 1200, start = performance.now();
    function tick(now) {
      if (paused) { el.textContent = target + suffix; return; }
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      const val = target % 1 === 0 ? Math.round(target * eased) : (target * eased).toFixed(1);
      el.textContent = val + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // Nav scroll state — adds shadow when scrolled
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => {
      if (window.scrollY > 30) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
})();
