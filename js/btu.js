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
    dial.setAttribute('aria-label', a.label + ' BTU per hour');
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
    const controls = document.createElement('div');
    controls.className = 'btu-fine-controls';
    const minus = document.createElement('button');
    minus.type = 'button'; minus.textContent = '−';
    minus.setAttribute('aria-label','Decrease ' + a.label + ' by 1,000 BTU/hr');
    const exact = document.createElement('input');
    exact.type = 'number'; exact.min = '0'; exact.max = String(a.max); exact.step = '1';
    exact.value = '0'; exact.inputMode = 'numeric';
    exact.setAttribute('aria-label',a.label + ' exact BTU per hour');
    const plus = document.createElement('button');
    plus.type = 'button'; plus.textContent = '+';
    plus.setAttribute('aria-label','Increase ' + a.label + ' by 1,000 BTU/hr');
    controls.append(minus,exact,plus);
    const note = document.createElement('div');
    note.className = 'btu-dial-hint';
    note.textContent = 'Turn dial or enter exact BTU/hr';
    function setValue(next) {
      const btu = Math.max(0,Math.min(a.max,Math.round(Number(next)||0)));
      dial.value = String(btu);
      exact.value = String(btu);
      state[a.id] = btu;
      knob.style.setProperty('--dial-angle',(-130 + btu/a.max*260) + 'deg');
      row.classList.toggle('active',btu>0);
      value.textContent = btu ? fmt(btu) + ' BTU/hr' : 'OFF · 0 BTU/hr';
      render();
    }
    dial.addEventListener('input',()=>setValue(dial.value));
    exact.addEventListener('change',()=>setValue(exact.value));
    minus.addEventListener('click',()=>setValue((state[a.id]||0)-1000));
    plus.addEventListener('click',()=>setValue((state[a.id]||0)+1000));
    // Direct rotary touch/mouse movement: angle around the knob controls value.
    // The excluded 100-degree bottom arc snaps to the nearest end stop.
    function angleValue(event) {
      const rect = dialWrap.getBoundingClientRect();
      const dx = event.clientX-(rect.left+rect.width/2);
      const dy = event.clientY-(rect.top+rect.height/2);
      const degrees = Math.atan2(dx,-dy)*180/Math.PI;
      const limited = Math.max(-130,Math.min(130,degrees));
      return Math.round((limited+130)/260*a.max);
    }
    let dragging = false;
    dialWrap.addEventListener('pointerdown',event=>{
      if(event.button !== 0 && event.pointerType === 'mouse') return;
      dragging = true;
      dialWrap.setPointerCapture(event.pointerId);
      setValue(angleValue(event));
      event.preventDefault();
    });
    dialWrap.addEventListener('pointermove',event=>{
      if(dragging) {setValue(angleValue(event)); event.preventDefault();}
    });
    function stopDrag(){dragging=false;}
    dialWrap.addEventListener('pointerup',stopDrag);
    dialWrap.addEventListener('pointercancel',stopDrag);
    row.append(name,model,dialWrap,value,controls,note);
    setValue(0);
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
