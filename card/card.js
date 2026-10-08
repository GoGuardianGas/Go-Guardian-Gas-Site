(() => {
  const url = 'https://goguardiangas.com/card/';
  const share = document.getElementById('share-button');
  const copy = document.getElementById('copy-button');
  const status = document.getElementById('share-status');
  if (typeof navigator.share === 'function') {
    share.hidden = false;
    share.addEventListener('click', async () => {
      try { await navigator.share({title:'Guardian Gas Solutions',text:'Propane & natural gas services throughout Central Florida. Save our contact or plan your next project.',url}); }
      catch (error) { if (error.name !== 'AbortError') status.textContent = 'Please use Copy Card Link or the link below.'; }
    });
  }
  if (navigator.clipboard && window.isSecureContext) {
    copy.hidden = false;
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(url); status.textContent = 'Card link copied—ready to share.'; }
      catch { status.textContent = 'Press and hold the link below to copy it.'; }
    });
  }
})();
