const download = document.querySelector('.restaurant-guide a[download]');
download.addEventListener('click', () => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'restaurant_gas_checklist_download', {
      send_to: 'G-0X8YZ974BJ',
      file_name: 'GGS_Florida_Restaurant_Gas_Piping_Checklist.pdf',
    });
  }
});

const checklist = document.querySelector('[data-restaurant-checklist]');
const steps = [...checklist.querySelectorAll('input[type="checkbox"]')];
const progress = checklist.querySelector('[data-checklist-progress]');
const storageKey = 'ggs-restaurant-gas-checklist-v1';

function updateProgress() {
  const checked = steps.filter(step => step.checked).map(step => step.name);
  progress.textContent = `${checked.length} of ${steps.length} planning steps checked`;
  return checked;
}

try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (Array.isArray(saved)) {
    steps.forEach(step => { step.checked = saved.includes(step.name); });
  }
} catch {
  // The checklist still works when browser storage is unavailable.
}

function saveProgress() {
  const checked = updateProgress();
  try {
    localStorage.setItem(storageKey, JSON.stringify(checked));
  } catch {
    // Keep the current page interactive when browser storage is unavailable.
  }
}

checklist.addEventListener('change', saveProgress);
checklist.querySelector('[data-checklist-reset]').addEventListener('click', () => {
  steps.forEach(step => { step.checked = false; });
  saveProgress();
  steps[0].focus();
});
updateProgress();
checklist.querySelector('[data-checklist-actions]').hidden = false;
