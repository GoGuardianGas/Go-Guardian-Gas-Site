/* Automatic review rotation with reader controls and motion preferences. */
(() => {
 const carousel = document.querySelector('.ggs-carousel');
 const slides = Array.from(document.querySelectorAll('.ggs-review-slide'));
 const controls = document.querySelector('.ggs-carousel-controls');
 if (!carousel || !slides.length || !controls) return;
 const position = document.getElementById('review-position');
 const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
 const rotation = document.createElement('button');
 rotation.type = 'button';
 rotation.className = 'btn btn-outline';
 rotation.setAttribute('aria-controls', 'review-slides');
 controls.prepend(rotation);
 let current = 0;
 let timer = null;
 let hovered = false;
 let focused = false;
 let visible = !('IntersectionObserver' in window);
 let playing = !motionPaused();
 function motionPaused() {
  return reduce.matches || document.documentElement.classList.contains('motion-paused');
 }
 function sync() {
  window.clearTimeout(timer);
  timer = null;
  const running = playing && !hovered && !focused && visible && !document.hidden && !motionPaused() && slides.length > 1;
  rotation.textContent = playing ? 'Pause reviews' : 'Play reviews';
  rotation.disabled = motionPaused() || slides.length < 2;
  position.setAttribute('aria-live', running ? 'off' : 'polite');
  if (running) {
   const words = slides[current].textContent.trim().split(/\s+/).length;
   timer = window.setTimeout(() => { show(current + 1); sync(); }, Math.max(12000, words * 300));
  }
 }
 function show(index) {
  current = (index + slides.length) % slides.length;
  slides.forEach((slide, i) => {
   slide.hidden = i !== current;
   slide.setAttribute('role', 'group');
   slide.setAttribute('aria-roledescription', 'slide');
   slide.setAttribute('aria-label', `Review ${i + 1} of ${slides.length}`);
  });
  position.textContent = `Review ${current + 1} of ${slides.length}`;
 }
 function manualStep(step) { playing = false; show(current + step); sync(); }
 document.getElementById('review-prev').addEventListener('click', () => manualStep(-1));
 document.getElementById('review-next').addEventListener('click', () => manualStep(1));
 rotation.addEventListener('click', () => {
  playing = !playing;
  if (playing) focused = false;
  sync();
 });
 carousel.addEventListener('mouseenter', () => { hovered = true; sync(); });
 carousel.addEventListener('mouseleave', () => { hovered = false; sync(); });
 carousel.addEventListener('focusin', () => { focused = true; playing = false; sync(); });
 carousel.addEventListener('focusout', event => {
  if (!carousel.contains(event.relatedTarget)) { focused = false; sync(); }
 });
 carousel.addEventListener('touchstart', () => { playing = false; sync(); }, { passive: true });
 document.addEventListener('visibilitychange', sync);
 reduce.addEventListener('change', () => { if (motionPaused()) playing = false; sync(); });
 new MutationObserver(() => { if (motionPaused()) playing = false; sync(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
 if ('IntersectionObserver' in window) {
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { threshold: 0.15 }).observe(carousel);
 }
 controls.hidden = false;
 show(0);
 sync();
})();
