/* Guardian Gas Solutions — BTU Calculator
 * Industry standard BTU/hr ratings for residential gas appliances.
 * Source values are typical mid-range residential ratings.
 */

const APPLIANCES = [
  // [id, label, BTU/hr sizing load, category]
  // Generators: 100% full-load gas-sizing BTU from GGS/Generac chart. NG and LP differ, so each is listed separately.
  { id: 'gen-26-lp',  label: 'Whole-Home Generator 22–26kW — LP',  btu: 357000, cat: 'power' },
  { id: 'gen-26-ng',  label: 'Whole-Home Generator 22–26kW — NG',  btu: 333000, cat: 'power' },
  { id: 'gen-20-lp',  label: 'Whole-Home Generator 18–20kW — LP',  btu: 357000, cat: 'power' },
  { id: 'gen-20-ng',  label: 'Whole-Home Generator 18–20kW — NG',  btu: 307000, cat: 'power' },
  { id: 'gen-16-lp',  label: 'Standby Generator 16kW — LP',        btu: 283000, cat: 'power' },
  { id: 'gen-16-ng',  label: 'Standby Generator 16kW — NG',        btu: 309000, cat: 'power' },
  { id: 'gen-14-lp',  label: 'Standby Generator 14kW — LP',        btu: 233000, cat: 'power' },
  { id: 'gen-14-ng',  label: 'Standby Generator 14kW — NG',        btu: 256000, cat: 'power' },
  { id: 'gen-10-lp',  label: 'Standby Generator 10kW — LP',        btu: 130000, cat: 'power' },
  { id: 'gen-10-ng',  label: 'Standby Generator 10kW — NG',        btu: 127000, cat: 'power' },
  // Tankless water heaters — NG and LP carry the same max BTU input per series
  { id: 'tankless-199', label: 'Tankless Water Heater (199 series)', btu: 199000, cat: 'water' },
  { id: 'tankless-180', label: 'Tankless Water Heater (180 series)', btu: 180000, cat: 'water' },
  { id: 'tankless-160', label: 'Tankless Water Heater (160 series)', btu: 160000, cat: 'water' },
  { id: 'tank-wh',      label: 'Tank Water Heater (40 gal)',         btu: 40000,  cat: 'water' },
  { id: 'pool-heater',  label: 'Pool / Spa Heater',                  btu: 250000, cat: 'water' },
  // Cooking
  { id: 'range',        label: 'Standard Gas Range',                 btu: 65000,  cat: 'kitchen' },
  { id: 'pro-range-30', label: 'Pro-Style Range (30")',             btu: 90000,  cat: 'kitchen' },
  { id: 'pro-range-36', label: 'Pro-Style Range (36")',             btu: 120000, cat: 'kitchen' },
  { id: 'cooktop',      label: 'Gas Cooktop',                        btu: 65000,  cat: 'kitchen' },
  { id: 'oven',         label: 'Gas Oven',                           btu: 25000,  cat: 'kitchen' },
  { id: 'dryer',        label: 'Gas Clothes Dryer',                  btu: 35000,  cat: 'laundry' },
  // Outdoor kitchens
  { id: 'grill-island', label: 'Grill Island',                       btu: 90000,  cat: 'outdoor' },
  { id: 'grill-side',   label: 'Grill + Side Burner',                btu: 120000, cat: 'outdoor' },
  { id: 'outdoor-kitchen', label: 'Full Outdoor Kitchen (grill + pizza + fire)', btu: 250000, cat: 'outdoor' },
  // Comfort & fire features
  { id: 'fireplace',    label: 'Indoor Gas Fireplace',               btu: 60000,  cat: 'comfort' },
  { id: 'outdoor-fp',   label: 'Outdoor Fireplace',                  btu: 100000, cat: 'comfort' },
  { id: 'firepit',      label: 'Gas Fire Pit',                       btu: 100000, cat: 'comfort' },
  { id: 'fire-table',   label: 'Linear Fire Feature / Table',        btu: 125000, cat: 'comfort' },
  { id: 'furnace',      label: 'Gas Furnace',                        btu: 100000, cat: 'comfort' },
  { id: 'boiler',       label: 'Residential Boiler',                 btu: 200000, cat: 'comfort' },
];

// Tank size recommendation table
// Based on total BTU/hr load + buffer for vaporization rate (cold weather)
// Propane vaporization roughly 4 cubic feet per square foot of wet surface area per hour
const TANK_SIZES = [
  { max: 75000,  size: '120 gal',     desc: 'Above-ground residential. Good for 1-2 small appliances.' },
  { max: 150000, size: '250 gal',     desc: 'Above-ground residential. Mid-range home use.' },
  { max: 250000, size: '320 gal',     desc: 'Above-ground residential. Full home or generator-equipped.' },
  { max: 400000, size: '500 gal',     desc: 'Above- or below-ground. Large home or commercial.' },
  { max: 700000, size: '1,000 gal',   desc: 'Above- or below-ground. Heavy commercial or community.' },
  { max: Infinity, size: '1,000+ gal (multi-tank)', desc: 'Distribution systems or large commercial. Custom-sized.' },
];

function calcBtuRecommendation(totalBtu) {
  return TANK_SIZES.find(t => totalBtu <= t.max);
}

function initBtuCalculator(root) {
  if (!root) return;

  // build appliance list with quantity selectors
  const listEl = root.querySelector('[data-btu-list]');
  const totalEl = root.querySelector('[data-btu-total]');
  const tankEl = root.querySelector('[data-btu-tank]');
  const tankDescEl = root.querySelector('[data-btu-tank-desc]');
  const countEl = root.querySelector('[data-btu-count]');
  const emptyEl = root.querySelector('[data-btu-empty]');
  const resetBtn = root.querySelector('[data-btu-reset]');

  if (!listEl) return;

  const state = {}; // id -> qty

  function render() {
    let totalBtu = 0;
    let totalCount = 0;
    APPLIANCES.forEach(a => {
      const q = state[a.id] || 0;
      totalBtu += a.btu * q;
      totalCount += q;
    });

    totalEl.textContent = totalBtu.toLocaleString();
    countEl.textContent = totalCount;
    const rec = calcBtuRecommendation(totalBtu);
    if (totalBtu === 0) {
      tankEl.textContent = '···';
      tankDescEl.textContent = 'Add appliances to see a recommendation.';
      emptyEl?.classList.add('is-empty');
    } else {
      tankEl.textContent = rec.size;
      tankDescEl.textContent = rec.desc;
      emptyEl?.classList.remove('is-empty');
    }
  }

  function makeRow(a) {
    const row = document.createElement('div');
    row.className = 'btu-row';
    row.innerHTML = `
      <div class="btu-row-label">
        <span class="btu-row-name">${a.label}</span>
        <span class="btu-row-btu">${a.btu.toLocaleString()} BTU/hr</span>
      </div>
      <div class="btu-row-qty">
        <button type="button" class="btu-qty-btn" data-action="dec" aria-label="Decrease">−</button>
        <span class="btu-qty-val" data-qty="${a.id}">0</span>
        <button type="button" class="btu-qty-btn" data-action="inc" aria-label="Increase">+</button>
      </div>
    `;
    row.querySelectorAll('.btu-qty-btn').forEach(b => {
      b.addEventListener('click', () => {
        const cur = state[a.id] || 0;
        if (b.dataset.action === 'inc') state[a.id] = cur + 1;
        else if (cur > 0) state[a.id] = cur - 1;
        row.querySelector(`[data-qty="${a.id}"]`).textContent = state[a.id] || 0;
        row.classList.toggle('active', (state[a.id] || 0) > 0);
        render();
      });
    });
    return row;
  }

  APPLIANCES.forEach(a => listEl.appendChild(makeRow(a)));

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      APPLIANCES.forEach(a => {
        state[a.id] = 0;
        const el = root.querySelector(`[data-qty="${a.id}"]`);
        if (el) el.textContent = '0';
        el?.closest('.btu-row')?.classList.remove('active');
      });
      render();
    });
  }

  render();
}

// auto-init
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-btu-calculator]').forEach(initBtuCalculator);
});
