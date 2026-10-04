/* Guardian Gas Solutions — BTU Calculator (fuel-aware)
 * Generac loads use model-specific published full-load ft³/hr, converted
 * using Generac's factors: NG × 1,000; LP vapor × 2,500 BTU/ft³.
 * Other appliance estimates use the GGS internal capacity charts.
 *
 * For gas design / pipe sizing we use the 100% full-load number.
 */

// Appliances shared across both fuels (same max BTU input per series/spec)
const SHARED = [
  // Tankless water heaters (Rinnai 160/180/199 series — same NG/LP max input)
  { id: 'tankless-199', label: 'Tankless Water Heater (199 series)', btu: 199000, cat: 'water' },
  { id: 'tankless-180', label: 'Tankless Water Heater (180 series)', btu: 180000, cat: 'water' },
  { id: 'tankless-160', label: 'Tankless Water Heater (160 series)', btu: 160000, cat: 'water' },
  { id: 'tank-wh',      label: 'Tank Water Heater (40 gal)',         btu: 40000,  cat: 'water' },
  { id: 'pool-heater',  label: 'Pool / Spa Heater',                  btu: 250000, cat: 'water' },
  // Cooking — ranges / cooktops / ovens
  { id: 'range',        label: 'Standard Gas Range',                 btu: 65000,  cat: 'kitchen' },
  { id: 'range-4b',     label: 'Basic 4-Burner Range',               btu: 50000,  cat: 'kitchen' },
  { id: 'range-5b',     label: '5-Burner Residential Range',         btu: 65000,  cat: 'kitchen' },
  { id: 'pro-range-30', label: 'Pro-Style Range (30")',             btu: 90000,  cat: 'kitchen' },
  { id: 'pro-range-36', label: 'Pro-Style Range (36")',             btu: 120000, cat: 'kitchen' },
  { id: 'pro-range-48', label: 'Pro-Style Range (48")',             btu: 150000, cat: 'kitchen' },
  { id: 'cooktop',      label: 'Gas Cooktop',                        btu: 65000,  cat: 'kitchen' },
  { id: 'oven',         label: 'Gas Oven',                           btu: 25000,  cat: 'kitchen' },
  { id: 'dryer',        label: 'Gas Clothes Dryer',                  btu: 35000,  cat: 'laundry' },
  // Comfort & heating
  { id: 'fireplace',    label: 'Indoor Gas Fireplace',               btu: 60000,  cat: 'comfort' },
  { id: 'furnace',      label: 'Gas Furnace',                        btu: 100000, cat: 'comfort' },
  { id: 'boiler',       label: 'Residential Boiler',                 btu: 250000, cat: 'comfort' },
  // Fire features
  { id: 'firepit-small',label: 'Small Gas Fire Pit / Bowl',          btu: 60000,  cat: 'fire' },
  { id: 'firepit',      label: 'Standard Gas Fire Pit',              btu: 100000, cat: 'fire' },
  { id: 'firepit-lg',   label: 'Large Residential Fire Pit',         btu: 150000, cat: 'fire' },
  { id: 'fire-table',   label: 'Linear Fire Feature / Table',        btu: 125000, cat: 'fire' },
  { id: 'outdoor-fp',   label: 'Outdoor Fireplace Burner',           btu: 150000, cat: 'fire' },
  // Outdoor / summer kitchens
  { id: 'grill-island', label: 'Basic Grill Island',                 btu: 90000,  cat: 'outdoor' },
  { id: 'grill-side',   label: 'Grill + Side Burner',                btu: 120000, cat: 'outdoor' },
  { id: 'grill-power',  label: 'Grill + Power Burner',               btu: 160000, cat: 'outdoor' },
  { id: 'grill-pizza',  label: 'Grill + Side Burner + Pizza Oven',   btu: 200000, cat: 'outdoor' },
  { id: 'kitchen-full', label: 'Grill + Pizza Oven + Fire Feature',  btu: 300000, cat: 'outdoor' },
];

// Next-generation 22–28 kW: Generac A0005151077, full-load fuel table.
// https://productmanuals.generac.com/api/manualfiles/G0072820/A0005151077/0
// Guardian 26 kW 7290/7291: Generac A0002026894.
// https://productmanuals.generac.com/api/manualfiles/G0072910/A0002026894/0
// Guardian 20 kW 7038-1/7039-1: 20-24kw-guardian-standby-generator-specsheet.pdf
// Guardian 16 kW 7035/7036: 16-22kw-guardian-standby-generator-specsheet.pdf
// Guardian 10/14/18 kW: 10kw-14kw-18kw_guardian-series_aircooled-gasengine_specsheet.pdf
// (The three PDFs above are in Generac's /globalassets/products/residential/standby-generators/spec-sheets/.)
const GENERAC_MODELS = [
  { id: 'gen-28', kw: 28, models: '7282 / 7329', ngCfh: 297, lpCfh: 144 },
  { id: 'gen-26', kw: 26, models: '7327 / 7328', ngCfh: 316, lpCfh: 144 },
  { id: 'gen-26-guardian', kw: 26, models: '7290 / 7291', ngCfh: 333, lpCfh: 132 },
  { id: 'gen-24', kw: 24, models: '7261 / 7326', ngCfh: 291, lpCfh: 135 },
  { id: 'gen-22', kw: 22, models: '7260 / 7325', ngCfh: 311, lpCfh: 135 },
  { id: 'gen-20', kw: 20, models: '7038-1 / 7039-1', ngCfh: 301, lpCfh: 130 },
  { id: 'gen-18', kw: 18, models: '7226 / 7228', ngCfh: 247, lpCfh: 110 },
  { id: 'gen-16', kw: 16, models: '7035 / 7036', ngCfh: 309, lpCfh: 107 },
  { id: 'gen-14', kw: 14, models: '7223 / 7224 / 7225', ngCfh: 256, lpCfh: 112 },
  { id: 'gen-10', kw: 10, models: '7171 / 7172', ngCfh: 127, lpCfh: 54 },
];

function generatorsForFuel(fuel) {
  return GENERAC_MODELS.map(g => ({
    id: `${g.id}-${fuel}`,
    label: `Generac Standby Generator ${g.kw} kW`,
    model: `Models ${g.models}`,
    btu: fuel === 'lp' ? g.lpCfh * 2500 : g.ngCfh * 1000,
    cat: 'power',
  }));
}
const GEN_NG = generatorsForFuel('ng');
const GEN_LP = generatorsForFuel('lp');

// Full appliance set per fuel: generators first, then shared appliances
const APPLIANCES_BY_FUEL = {
  ng: [...GEN_NG, ...SHARED],
  lp: [...GEN_LP, ...SHARED],
};

// Tank size recommendation table (LP). For NG there is no tank, so we show
// a service-size note instead.
const TANK_SIZES = [
  { max: 75000,  size: '120 gal',     desc: 'Above-ground residential. Good for 1–2 small appliances.' },
  { max: 150000, size: '250 gal',     desc: 'Above-ground residential. Mid-range home use.' },
  { max: 250000, size: '320 gal',     desc: 'Above-ground residential. Full home or generator-equipped.' },
  { max: 400000, size: '500 gal',     desc: 'Above- or below-ground. Large home or commercial.' },
  { max: 700000, size: '1,000 gal',   desc: 'Above- or below-ground. Heavy commercial or community.' },
  { max: Infinity, size: '1,000+ gal (multi-tank)', desc: 'Distribution systems or large commercial. Custom-sized.' },
];

function calcTank(totalBtu) {
  return TANK_SIZES.find(t => totalBtu <= t.max);
}

function initBtuCalculator(root) {
  if (!root) return;

  const listEl     = root.querySelector('[data-btu-list]');
  const totalEl    = root.querySelector('[data-btu-total]');
  const tankEl     = root.querySelector('[data-btu-tank]');
  const tankDescEl = root.querySelector('[data-btu-tank-desc]');
  const tankLabelEl= root.querySelector('[data-btu-tank-label]');
  const countEl    = root.querySelector('[data-btu-count]');
  const emptyEl    = root.querySelector('[data-btu-empty]');
  const resetBtn   = root.querySelector('[data-btu-reset]');
  const fuelBtns   = root.querySelectorAll('[data-fuel-option]');
  if (!listEl) return;

  let fuel = 'ng';      // default
  let state = {};       // id -> qty (reset when fuel changes)

  function appliances() { return APPLIANCES_BY_FUEL[fuel]; }

  function render() {
    let totalBtu = 0, totalCount = 0;
    appliances().forEach(a => {
      const q = state[a.id] || 0;
      totalBtu += a.btu * q;
      totalCount += q;
    });

    totalEl.textContent = totalBtu.toLocaleString();
    countEl.textContent = totalCount;

    if (fuel === 'lp') {
      if (tankLabelEl) tankLabelEl.textContent = 'Recommended Tank';
      const rec = calcTank(totalBtu);
      if (totalBtu === 0) {
        tankEl.textContent = '···';
        tankDescEl.textContent = 'Add appliances to see a recommendation.';
        emptyEl?.classList.add('is-empty');
      } else {
        tankEl.textContent = rec.size;
        tankDescEl.textContent = rec.desc;
        emptyEl?.classList.remove('is-empty');
      }
    } else {
      // Natural gas: no tank — show meter/line sizing guidance instead
      if (tankLabelEl) tankLabelEl.textContent = 'Gas Line Sizing';
      if (totalBtu === 0) {
        tankEl.textContent = '···';
        tankDescEl.textContent = 'Add appliances to see sizing guidance.';
        emptyEl?.classList.add('is-empty');
      } else {
        tankEl.textContent = 'NG Service';
        tankDescEl.textContent = 'Natural gas needs no tank. Pipe and meter are sized for this full load per NFPA 54 / FBC tables.';
        emptyEl?.classList.remove('is-empty');
      }
    }
  }

  function makeRow(a) {
    const row = document.createElement('div');
    row.className = 'btu-row';
    row.innerHTML = `
      <div class="btu-row-label">
        <span class="btu-row-name">${a.label}</span>
        ${a.model ? `<span class="btu-row-model">${a.model}</span>` : ''}
        <span class="btu-row-btu">${a.btu.toLocaleString()} BTU/hr</span>
      </div>
      <div class="btu-row-qty">
        <button type="button" class="btu-qty-btn" data-action="dec" aria-label="Decrease ${a.label}">−</button>
        <span class="btu-qty-val" data-qty="${a.id}">0</span>
        <button type="button" class="btu-qty-btn" data-action="inc" aria-label="Increase ${a.label}">+</button>
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

  function buildList() {
    listEl.innerHTML = '';
    appliances().forEach(a => listEl.appendChild(makeRow(a)));
  }

  function setFuel(next) {
    if (next === fuel) return;
    fuel = next;
    state = {};                       // clear selections on fuel switch
    fuelBtns.forEach(b => {
      const on = b.dataset.fuelOption === fuel;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    buildList();
    render();
  }

  fuelBtns.forEach(b => {
    b.addEventListener('click', () => setFuel(b.dataset.fuelOption));
    b.setAttribute('aria-pressed', b.dataset.fuelOption === fuel ? 'true' : 'false');
    if (b.dataset.fuelOption === fuel) b.classList.add('active');
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state = {};
      root.querySelectorAll('[data-qty]').forEach(el => {
        el.textContent = '0';
        el.closest('.btu-row')?.classList.remove('active');
      });
      render();
    });
  }

  buildList();
  render();
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-btu-calculator]').forEach(initBtuCalculator);
});
