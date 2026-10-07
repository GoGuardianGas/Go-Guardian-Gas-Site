(function () {
  const cards = [...document.querySelectorAll('.svc-audience-card')];
  const filters = document.querySelector('.svc-filters');
  const status = document.getElementById('svc-filter-status');
  if (filters) {
    filters.hidden = false;
    filters.addEventListener('click', event => {
      const button = event.target.closest('[data-filter]');
      if (!button) return;
      filters.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      let count = 0;
      cards.forEach(card => { card.hidden = button.dataset.filter !== 'all' && card.dataset.group !== button.dataset.filter; if (!card.hidden) count++; });
      status.textContent = count + ' client ' + (count === 1 ? 'type shown.' : 'types shown.');
    });
  }
  function openGuide(scroll) {
    const id = window.location.hash.slice(1);
    const guide = document.getElementById(id);
    if (!guide || !guide.classList.contains('svc-guide')) return;
    document.querySelectorAll('.svc-guide[open]').forEach(item => { if(item !== guide) item.open = false; });
    guide.open = true;
    if (scroll) requestAnimationFrame(() => { guide.scrollIntoView({block:'start',behavior:'instant'}); guide.querySelector('summary').focus({preventScroll:true}); });
  }
  window.addEventListener('hashchange', () => openGuide(true));
  cards.forEach(card => card.addEventListener('click', () => { if (card.hash === window.location.hash) openGuide(true); }));
  // Match the section bar to the actual site header height at every viewport.
  const nav = document.querySelector('.nav');
  function sizeHeader() { if (nav) document.documentElement.style.setProperty('--svc-nav-height', nav.offsetHeight + 'px'); }
  sizeHeader();
  if ('ResizeObserver' in window && nav) new ResizeObserver(sizeHeader).observe(nav);
  window.addEventListener('resize', sizeHeader);
  openGuide(true);
})();
