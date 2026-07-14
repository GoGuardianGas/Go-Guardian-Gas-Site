/* Articles hub — 3D cursor tilt + glow tracking.
   Pointer-driven, disabled on touch and reduced-motion. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = window.matchMedia('(hover: none)').matches;
  if (reduce || touch) return;

  var cards = document.querySelectorAll('.tilt-card');
  var MAX = 8; // degrees

  cards.forEach(function (card) {
    var inner = card.querySelector('.article-card-inner');
    var glow = card.querySelector('.article-card-glow');
    var raf = null;

    function onMove(e) {
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width;   // 0..1
      var py = (e.clientY - r.top) / r.height;   // 0..1
      var rx = (0.5 - py) * MAX * 2;             // rotateX
      var ry = (px - 0.5) * MAX * 2;             // rotateY
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        card.style.transform = 'translateY(-6px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
        if (glow) { glow.style.setProperty('--mx', (px*100).toFixed(1)+'%'); glow.style.setProperty('--my', (py*100).toFixed(1)+'%'); }
      });
    }
    function onLeave() {
      if (raf) cancelAnimationFrame(raf);
      card.style.transform = '';
    }
    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
  });
})();
