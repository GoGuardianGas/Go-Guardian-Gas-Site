/* User-controlled carousel: no automatic movement; all reviews readable without JS. */
(() => {
 const slides = Array.from(document.querySelectorAll('.ggs-review-slide'));
 const controls = document.querySelector('.ggs-carousel-controls');
 if (!slides.length || !controls) return;
 let current = 0;
 function show(index) {
  current = (index + slides.length) % slides.length;
  slides.forEach((slide, i) => {
   slide.hidden = i !== current;
   slide.setAttribute('role', 'group');
   slide.setAttribute('aria-roledescription', 'slide');
   slide.setAttribute('aria-label', `Review ${i + 1} of ${slides.length}`);
  });
  document.getElementById('review-position').textContent = `Review ${current + 1} of ${slides.length}`;
 }
 document.getElementById('review-prev').addEventListener('click', () => show(current - 1));
 document.getElementById('review-next').addEventListener('click', () => show(current + 1));
 controls.hidden = false;
 show(0);
})();
