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
  const listEl = root.querySelector('[data-btu-list]');
  const totalEl = root.querySelector('[data-btu-total]');
  const tankEl = root.querySelector('[data-btu-tank]');
  const tankDescEl = root.querySelector('[data-btu-tank-desc]');
  const tankLabelEl = root.querySelector('[data-btu-tank-label]');
  const countEl = root.querySelector('[data-btu-count]');
  const emptyEl = root.querySelector('[data-btu-empty]');
  const fuelBtns = root.querySelectorAll('[data-fuel-option]');
  if (!listEl) return;
  let fuel = 'ng';
  let state = {};
  const appliances = () => APPLIANCES_BY_FUEL[fuel];
  const fmt = n => Math.round(n).toLocaleString('en-US');
  function render() {
    let total = 0, count = 0;
    appliances().forEach(a => {
      const percent = state[a.id] || 0;
      if (percent > 0) count++;
      total += Math.round(a.btu * percent / 100);
    });
    totalEl.textContent = fmt(total);
    countEl.textContent = count;
    if (tankLabelEl) tankLabelEl.textContent = fuel === 'lp' ? 'Preliminary Tank Guidance' : 'Gas Line Sizing';
    if (!total) {
      tankEl.textContent = '···';
      tankDescEl.textContent = 'Turn an appliance dial to see guidance.';
      emptyEl?.classList.add('is-empty');
    } else if (fuel === 'lp') {
      const rec = calcTank(total);
      tankEl.textContent = rec.size;
      tankDescEl.textContent = rec.desc + ' Confirm vaporization capacity, climate and runtime with GGS.';
      emptyEl?.classList.remove('is-empty');
    } else {
      tankEl.textContent = 'NG Service';
      tankDescEl.textContent = 'Meter and pipe capacity must be checked against appliance nameplates, supply pressure, run lengths and applicable code.';
      emptyEl?.classList.remove('is-empty');
    }
  }
  function makeRow(a) {
    const row = document.createElement('div');
    row.className = 'btu-dial-item';
    const name = document.createElement('div');
    name.className = 'btu-dial-name';
    name.textContent = a.label;
    const model = document.createElement('div');
    model.className = 'btu-dial-model';
    model.textContent = a.model || 'Rated maximum ' + fmt(a.btu) + ' BTU/hr';
    const dialWrap = document.createElement('div');
    dialWrap.className = 'btu-dial-wrap';
    const dial = document.createElement('input');
    dial.type = 'range'; dial.min = '0'; dial.max = '100'; dial.step = '10'; dial.value = '0';
    dial.className = 'btu-regulator';
    dial.setAttribute('aria-label', a.label + ' gas demand, 0 to 100 percent of rated input');
    const knob = document.createElement('div');
    knob.className = 'btu-knob-face';
    knob.setAttribute('aria-hidden','true');
    knob.innerHTML = '<span class="btu-knob-pointer"></span><span class="btu-knob-center"></span>';
    const marks = document.createElement('div');
    marks.className = 'btu-knob-marks';
    marks.innerHTML = '<span>OFF</span><span>25</span><span>50</span><span>75</span><span>100%</span>';
    dialWrap.append(knob,dial,marks);
    const value = document.createElement('output');
    value.className = 'btu-dial-value';
    const note = document.createElement('div');
    note.className = 'btu-dial-hint';
    note.textContent = 'Estimated BTU/hr input';
    function update() {
      const pct = Number(dial.value);
      state[a.id] = pct;
      knob.style.setProperty('--dial-angle', (-130 + pct * 2.6) + 'deg');
      row.classList.toggle('active',pct>0);
      value.textContent = pct === 0 ? 'OFF · 0 BTU/hr' : fmt(a.btu * pct / 100) + ' BTU/hr';
      render();
    }
    dial.addEventListener('input',update);
    row.append(name,model,dialWrap,value,note);
    update();
    return row;
  }
  function buildList() {
    listEl.innerHTML = '';
    appliances().forEach(a => listEl.appendChild(makeRow(a)));
  }
  function setFuel(next) {
    if (next === fuel) return;
    fuel = next; state = {};
    fuelBtns.forEach(b => {
      const active = b.dataset.fuelOption === fuel;
      b.classList.toggle('active',active);
      b.setAttribute('aria-pressed',String(active));
    });
    buildList(); render();
  }
  fuelBtns.forEach(b => {
    b.addEventListener('click',()=>setFuel(b.dataset.fuelOption));
    b.setAttribute('aria-pressed',String(b.dataset.fuelOption === fuel));
  });
  root.querySelector('[data-btu-reset]')?.addEventListener('click',()=>{
    state={}; buildList(); render();
  });
  buildList(); render();
}
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-btu-calculator]').forEach(initBtuCalculator);
});
