/* Guardian Gas Solutions — Gas Storm Readiness Checklist
 * Interactive checkboxes with localStorage persistence,
 * print and email options.
 */

const STORAGE_KEY = 'ggs-storm-checklist-v1';

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch {}
}

function clearState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

function initChecklist(root) {
  if (!root) return;

  const checks = root.querySelectorAll('input[type="checkbox"][data-check]');
  const progressBar = root.querySelector('[data-check-progress]');
  const progressLabel = root.querySelector('[data-check-progress-label]');
  const completeCountEl = root.querySelector('[data-check-complete]');
  const totalCountEl = root.querySelector('[data-check-total]');
  const resetBtn = root.querySelector('[data-check-reset]');
  const printBtn = root.querySelector('[data-check-print]');
  const emailBtn = root.querySelector('[data-check-email]');

  const state = loadState();

  // restore state
  checks.forEach(c => {
    const id = c.dataset.check;
    if (state[id]) c.checked = true;
  });

  function update() {
    let done = 0;
    checks.forEach(c => {
      if (c.checked) done++;
      c.closest('.check-item')?.classList.toggle('checked', c.checked);
    });
    const total = checks.length;
    const pct = total ? Math.round((done / total) * 100) : 0;

    if (progressBar) progressBar.style.width = pct + '%';
    if (progressLabel) progressLabel.textContent = pct + '%';
    if (completeCountEl) completeCountEl.textContent = done;
    if (totalCountEl) totalCountEl.textContent = total;
  }

  checks.forEach(c => {
    c.addEventListener('change', () => {
      state[c.dataset.check] = c.checked;
      saveState(state);
      update();
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (!confirm('Clear all checked items and start over?')) return;
      checks.forEach(c => { c.checked = false; });
      clearState();
      update();
    });
  }

  if (printBtn) {
    printBtn.addEventListener('click', () => window.print());
  }

  if (emailBtn) {
    emailBtn.addEventListener('click', () => {
      // build a text summary of completed/incomplete and open email modal
      const items = [];
      root.querySelectorAll('.check-item').forEach(item => {
        const cb = item.querySelector('input[type="checkbox"]');
        const lbl = item.querySelector('.check-label-text')?.textContent.trim();
        if (cb && lbl) {
          items.push(`${cb.checked ? '[x]' : '[ ]'} ${lbl}`);
        }
      });
      const summary = items.join('\n');
      const subject = encodeURIComponent('My Gas Storm Readiness Checklist');
      const body = encodeURIComponent(
        `Here is my completed Gas Storm Readiness Checklist from GoGuardianGas.com:\n\n` +
        summary +
        `\n\n— Sent from Guardian Gas Solutions storm readiness tool.`
      );
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    });
  }

  update();
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-checklist]').forEach(initChecklist);
});
