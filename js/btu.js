/* Guardian Gas Solutions — illustrative appliance BTU selection dials.
 * Verify manufacturer nameplate full-load input before system design.
 */

// Appliances shared across both fuels (same max BTU input per series/spec)
const APPLIANCE_DIALS = [
 {id:'generator',label:'Standby Generator',max:500000,step:10000,cat:'power'},
 {id:'tankless',label:'Tankless Water Heater',max:200000,step:5000,cat:'water'},
 {id:'tank-water',label:'Tank Water Heater',max:200000,step:5000,cat:'water'},
 {id:'pool',label:'Pool / Spa Heater',max:1000000,step:10000,cat:'water'},
 {id:'range',label:'Gas Range',max:125000,step:5000,cat:'kitchen'},
 {id:'cooktop',label:'Gas Cooktop',max:100000,step:5000,cat:'kitchen'},
 {id:'oven',label:'Gas Oven',max:75000,step:5000,cat:'kitchen'},
 {id:'dryer',label:'Clothes Dryer',max:22000,step:1000,cat:'laundry'},
 {id:'fireplace',label:'Indoor Fireplace',max:40000,step:5000,cat:'comfort'},
 {id:'furnace',label:'Gas Furnace',max:400000,step:5000,cat:'comfort'},
 {id:'boiler',label:'Boiler',max:1000000,step:10000,cat:'comfort'},
 {id:'firepit',label:'Fire Pit / Fire Feature',max:500000,step:10000,cat:'fire'},
 {id:'grill',label:'Outdoor Grill',max:300000,step:5000,cat:'outdoor'},
 {id:'pizza',label:'Pizza Oven',max:250000,step:5000,cat:'outdoor'},
 {id:'sideburner',label:'Outdoor Side Burner',max:150000,step:5000,cat:'outdoor'}
];
// Illustrative dial limits, not certified appliance capacities. Use actual nameplate
// input for gas-system design; generator full-load input is fuel/model specific.
const APPLIANCES_BY_FUEL={ng:APPLIANCE_DIALS,lp:APPLIANCE_DIALS};

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
  const short = n => (n/1000).toLocaleString('en-US',{maximumFractionDigits:1}) + 'K';
  function render() {
    let total = 0, count = 0;
    appliances().forEach(a => {
      const btu = state[a.id] || 0;
      if (btu > 0) count++;
      total += btu;
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
    model.textContent = 'Dial maximum ' + fmt(a.max) + ' BTU/hr';
    const dialWrap = document.createElement('div');
    dialWrap.className = 'btu-dial-wrap';
    const dial = document.createElement('input');
    dial.type = 'range'; dial.min = '0'; dial.max = String(a.max); dial.step = '1'; dial.value = '0';
    dial.className = 'btu-regulator';
    dial.setAttribute('aria-label', a.label + ' selected BTU per hour, from off to ' + fmt(a.max));
    const knob = document.createElement('div');
    knob.className = 'btu-knob-face';
    knob.setAttribute('aria-hidden','true');
    knob.innerHTML = '<span class="btu-knob-pointer"></span><span class="btu-knob-center"><img src="images/guardian-shield-cobalt-2026.png" alt="" loading="lazy"></span>';
    const marks = document.createElement('div');
    marks.className = 'btu-knob-marks';
    marks.innerHTML = '<span>OFF</span><span>' + short(a.max*.25) + '</span><span>' + short(a.max*.5) + '</span><span>' + short(a.max*.75) + '</span><span>' + short(a.max) + '</span>';
    dialWrap.append(knob,dial,marks);
    const value = document.createElement('output');
    value.className = 'btu-dial-value';
    const note = document.createElement('div');
    note.className = 'btu-dial-hint';
    note.textContent = 'Adjust by 1 BTU/hr per step';
    function update() {
      const btu = Number(dial.value);
      state[a.id] = btu;
      knob.style.setProperty('--dial-angle', (-130 + (btu / a.max) * 260) + 'deg');
      row.classList.toggle('active',btu>0);
      value.textContent = btu === 0 ? 'OFF · 0 BTU/hr' : fmt(btu) + ' BTU/hr';
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
