import { createBattlefield } from './renderer3d.js';

(() => {
  'use strict';
  const canvas = document.getElementById('battlefield');
  const renderer = createBattlefield(canvas);
  const $ = id => document.getElementById(id);
  const factions = {
    usa: {
      label: 'UNITED STATES',
      buildings: { hq: 'Command Center', refinery: 'Supply Depot', power: 'Cold Fusion Reactor', barracks: 'Barracks', factory: 'War Factory', defense: 'Patriot Battery', tech: 'Strategy Center' },
      units: { infantry: 'Ranger Squad', scout: 'Humvee', tank: 'Paladin Tank', collector: 'Chinook Supply Truck', artillery: 'Crusader Artillery' },
      stats: { infantry: [52, 48, 115, 8, .82], scout: [88, 69, 140, 11, .72], tank: [175, 36, 166, 23, 1.2], collector: [125, 40, 0, 0, 1], artillery: [145, 28, 230, 34, 2] },
      bonus: 'Precision weapons · balanced forces'
    },
    china: {
      label: 'CHINA',
      buildings: { hq: 'War Command', refinery: 'Supply Center', power: 'Nuclear Reactor', barracks: 'PLA Barracks', factory: 'War Factory', defense: 'Gattling Cannon', tech: 'Propaganda Center' },
      units: { infantry: 'Red Guard', scout: 'Gatling Tank', tank: 'Dragon Tank', collector: 'Supply Truck', artillery: 'Inferno Cannon' },
      stats: { infantry: [43, 53, 105, 7, .66], scout: [95, 55, 128, 14, .54], tank: [160, 32, 145, 24, 1.08], collector: [120, 43, 0, 0, 1], artillery: [125, 25, 205, 30, 1.8] },
      bonus: 'Fast production · massed firepower'
    },
    russia: {
      label: 'RUSSIA',
      buildings: { hq: 'Field Headquarters', refinery: 'Ore Processing Plant', power: 'Thermal Power Plant', barracks: 'Training Hall', factory: 'Armor Plant', defense: 'Sentry Cannon', tech: 'Battle Command' },
      units: { infantry: 'Conscripts', scout: 'BTR Scout', tank: 'T-90 Tank', collector: 'Ore Truck', artillery: 'Msta Howitzer' },
      stats: { infantry: [60, 42, 110, 9, .92], scout: [110, 53, 135, 12, .88], tank: [205, 29, 158, 28, 1.35], collector: [145, 36, 0, 0, 1], artillery: [170, 23, 218, 37, 2.1] },
      bonus: 'Armored resilience · heavy guns'
    }
  };
  const prices = { refinery: 650, power: 450, barracks: 600, factory: 950, defense: 550, tech: 1050, infantry: 240, scout: 520, tank: 900, collector: 650, artillery: 1150 };
  const unitMeta = {
    infantry: { radius: 9, type: 'Infantry', icon: '♟', building: 'barracks' },
    scout: { radius: 12, type: 'Recon', icon: '◈', building: 'factory' },
    tank: { radius: 15, type: 'Armor', icon: '▰', building: 'factory' },
    collector: { radius: 13, type: 'Harvester', icon: '⬡', building: 'factory' },
    artillery: { radius: 16, type: 'Artillery', icon: '▰', building: 'tech' }
  };
  const structureMeta = {
    hq: { hp: 680, size: 45, type: 'Command Center', icon: '⌂' },
    refinery: { hp: 390, size: 38, type: 'Supply', icon: '⬡' },
    power: { hp: 270, size: 31, type: 'Power', icon: 'ϟ' },
    barracks: { hp: 310, size: 34, type: 'Infantry Production', icon: '▤' },
    factory: { hp: 390, size: 40, type: 'Vehicle Production', icon: '▰' },
    defense: { hp: 330, size: 29, type: 'Defense', icon: '⊕' },
    tech: { hp: 350, size: 38, type: 'Technology', icon: '⌬' }
  };
  const ui = { credits: $('credits'), income: $('income'), power: $('power'), army: $('army-count'), type: $('selection-type'), name: $('selection-name'), icon: $('selection-icon'), health: $('selection-health'), toast: $('toast'), start: $('start-screen'), pause: $('pause-screen'), end: $('end-screen'), objective: $('objective-card') };
  let width = 0, height = 0, faction = 'usa', playing = false, paused = false, over = false;
  let credits = 2600, time = 0, last = 0, toastTime = 0, action = 'select', selected = null, placement = null, tab = 'structures', serial = 0;
  let units = [], buildings = [], enemies = [], nodes = [], decor = [], shots = [], particles = [];
  let camera = { x: .5, y: .5, z: 1 }, enemyClock = 34, pointer = { x: .5, y: .5 }, panPointer = null;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rand = (a, b) => a + Math.random() * (b - a);
  const dist = (a, b) => { const p = toScreen(a.x, a.y), q = toScreen(b.x, b.y); return Math.hypot((p.x - q.x) * width, (p.y - q.y) * height); };
  function resize() { const r = canvas.getBoundingClientRect(); width = r.width; height = r.height; renderer.resize(); }
  function toScreen(x, y) { return { x: (x - camera.x) * camera.z + .5, y: (y - camera.y) * camera.z + .5 }; }
  function toWorld(x, y) { return { x: (x / width - .5) / camera.z + camera.x, y: (y / height - .5) / camera.z + camera.y }; }
  function friendlyName(kind) { return factions[faction].buildings[kind] || factions[faction].units[kind]; }
  function makeBuilding(kind, team, x, y) {
    const s = structureMeta[kind];
    const name = team === 'blue' ? friendlyName(kind) : kind === 'hq' ? 'Enemy Command Center' : `Hostile ${s.type}`;
    return { id: `b${++serial}`, kind, team, x, y, hp: s.hp, max: s.hp, size: s.size, type: s.type, icon: s.icon, name,
      range: kind === 'hq' ? 155 : kind === 'defense' ? 190 : 0, damage: kind === 'hq' ? 8 : kind === 'defense' ? 17 : 0, rate: kind === 'hq' ? 1.35 : .95, cool: rand(.2, 1), target: null };
  }
  function makeUnit(kind, team, x, y) {
    const meta = unitMeta[kind], values = factions[faction].stats[kind], [hp, speed, range, damage, rate] = values;
    return { id: `u${++serial}`, kind, team, x, y, hp, max: hp, speed, range, damage, rate, radius: meta.radius, type: meta.type, icon: meta.icon,
      name: team === 'blue' ? friendlyName(kind) : kind === 'tank' || kind === 'artillery' ? 'Hostile Armor' : 'Hostile Infantry',
      cool: rand(.1, .8), target: null, move: null, harvestNode: null, harvesting: false, carry: 0 };
  }
  function setup() {
    units = []; buildings = []; enemies = []; shots = []; particles = []; serial = 0; credits = 2600; time = 0; enemyClock = 34;
    camera = { x: .5, y: .5, z: 1 }; placement = null; action = 'select'; selected = null;
    buildings.push(makeBuilding('hq', 'blue', .13, .52), makeBuilding('refinery', 'blue', .225, .52), makeBuilding('hq', 'red', .88, .46));
    units.push(makeUnit('scout', 'blue', .18, .61), makeUnit('infantry', 'blue', .19, .65), makeUnit('infantry', 'blue', .205, .69));
    nodes = []; decor = [];
    let seed = 29481; const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 32; i++) nodes.push({ x: .08 + random() * .84, y: .07 + random() * .86, amount: 900, active: true });
    for (let i = 0; i < 360; i++) { const x = random(), y = random(); if ((x < .24 && y > .38 && y < .72) || (x > .77 && y > .3 && y < .62)) continue; decor.push({ x, y, r: 2 + random() * 11, kind: random() < .67 ? 'bush' : 'rock', tone: random(), rot: random() }); }
    const truck = makeUnit('collector', 'blue', .255, .59);
    truck.harvesting = true; truck.harvestNode = nearestNode(truck); truck.move = truck.harvestNode ? { x: truck.harvestNode.x, y: truck.harvestNode.y } : null; units.push(truck);
    selected = buildings[0]; refreshUI(); renderBuilds();
  }
  function nearestNode(from) { return nodes.filter(n => n.active).sort((a, b) => Math.hypot((a.x - from.x) * width, (a.y - from.y) * height) - Math.hypot((b.x - from.x) * width, (b.y - from.y) * height))[0]; }
  function toast(text) { ui.toast.textContent = text; ui.toast.classList.add('show'); toastTime = 2.4; }
  function has(kind) { return buildings.some(b => b.team === 'blue' && b.kind === kind); }
  function available(kind) {
    if (['refinery', 'power'].includes(kind)) return true;
    if (kind === 'barracks') return has('power');
    if (kind === 'factory' || kind === 'defense' || kind === 'infantry') return has('barracks');
    if (kind === 'tech') return has('factory');
    if (kind === 'artillery') return has('tech');
    if (['tank', 'scout', 'collector'].includes(kind)) return has('factory');
    return false;
  }
  function powerState() {
    const supply = buildings.filter(b => b.team === 'blue' && b.kind === 'power').length * 100;
    const demand = buildings.filter(b => b.team === 'blue').reduce((n, b) => n + ({ refinery: 8, barracks: 12, factory: 28, defense: 18, tech: 24 }[b.kind] || 0), 0);
    return { supply, demand, low: supply < demand };
  }
  function refreshUI() {
    ui.credits.textContent = Math.floor(credits).toLocaleString();
    const collectors = units.filter(u => u.team === 'blue' && u.kind === 'collector').length;
    ui.income.textContent = collectors ? `+$${collectors * 600}/min` : '+$0/min';
    ui.army.textContent = String(units.filter(u => u.team === 'blue').length).padStart(2, '0');
    const grid = powerState(); ui.power.textContent = grid.low ? 'LOW' : grid.supply ? 'STABLE' : 'OFFLINE'; ui.power.style.color = grid.low || !grid.supply ? '#e5a84c' : '';
    if (selected) { ui.type.textContent = selected.type || 'UNIT'; ui.name.textContent = selected.name; ui.icon.textContent = selected.icon || '⌖'; ui.health.style.width = `${100 * selected.hp / selected.max}%`; ui.health.style.background = selected.hp / selected.max < .3 ? '#df6451' : '#c8f05b'; }
    else { ui.type.textContent = 'BATTLEFIELD'; ui.name.textContent = 'Select a unit or building'; ui.icon.textContent = '⌖'; ui.health.style.width = '0%'; }
    document.querySelectorAll('.action-card').forEach(b => b.classList.toggle('selected-action', b.dataset.action === action));
    document.querySelectorAll('.build-card').forEach(b => { const kind = b.dataset.build; b.disabled = credits < prices[kind] || !available(kind) || !playing || paused || over; b.classList.toggle('locked', !available(kind)); });
  }
  function renderBuilds() {
    const list = $('build-list'), f = factions[faction];
    const items = tab === 'structures' ? [
      ['refinery', f.buildings.refinery, 'Collect field supplies'], ['power', f.buildings.power, 'Required for barracks'], ['barracks', f.buildings.barracks, 'Unlock infantry & defenses'], ['factory', f.buildings.factory, 'Unlock vehicles'], ['tech', f.buildings.tech, 'Unlock advanced armor']
    ] : tab === 'units' ? [
      ['infantry', f.units.infantry, 'Rifle squad · Barracks'], ['scout', f.units.scout, 'Fast reconnaissance · Factory'], ['tank', f.units.tank, 'Main battle tank · Factory'], ['collector', f.units.collector, 'Supply harvester · Factory'], ['artillery', f.units.artillery, 'Long-range siege · Tech']
    ] : [['defense', f.buildings.defense, 'Automated perimeter gun · Barracks']];
    $('build-category').textContent = tab.toUpperCase();
    list.innerHTML = items.map(([key, label, sub]) => `<button class="build-card" data-build="${key}" title="${sub}"><span class="unit-art ${key}-art">${unitMeta[key]?.icon || structureMeta[key]?.icon}</span><span class="build-copy"><b>${label}</b><small>${sub} · $${prices[key].toLocaleString()}</small></span><span class="build-price">${prices[key]}</span></button>`).join('');
    list.querySelectorAll('.build-card').forEach(b => b.onclick = () => beginBuild(b.dataset.build)); refreshUI();
  }
  function beginBuild(kind) {
    if (!playing || paused || over) return;
    if (credits < prices[kind]) { toast('NOT ENOUGH SUPPLIES'); return; }
    if (!available(kind)) { toast(kind === 'power' ? 'BUILD A POWER PLANT FIRST' : kind === 'barracks' ? 'BUILD A POWER PLANT FIRST' : kind === 'factory' || kind === 'defense' || kind === 'infantry' ? 'BUILD A BARRACKS FIRST' : 'BUILD THE REQUIRED TECHNOLOGY'); return; }
    credits -= prices[kind];
    if (unitMeta[kind]) {
      const sourceKind = unitMeta[kind].building;
      const source = buildings.find(b => b.team === 'blue' && b.kind === sourceKind) || buildings.find(b => b.team === 'blue' && b.kind === 'hq');
      const u = makeUnit(kind, 'blue', source.x + .045, source.y + .035); u.move = { x: source.x + .09, y: source.y + .075 }; units.push(u);
      if (kind === 'collector') { u.harvesting = true; u.harvestNode = nearestNode(u); u.move = u.harvestNode ? { x: u.harvestNode.x, y: u.harvestNode.y } : null; }
      toast(`${u.name.toUpperCase()} DEPLOYED`);
    } else { placement = kind; toast(`SELECT AN OPEN LOCATION FOR ${friendlyName(kind).toUpperCase()}`); }
    refreshUI();
  }
  function handleMap(e) {
    if (e.button === 2 || e.button === 1) { panPointer = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture?.(e.pointerId); return; }
    if (!playing || paused || over) return;
    const r = canvas.getBoundingClientRect(), p = { x: e.clientX - r.left, y: e.clientY - r.top }, w = toWorld(p.x, p.y);
    if (placement) {
      if (w.x < .025 || w.x > .975 || w.y < .03 || w.y > .97) { toast('LOCATION OUTSIDE THEATER'); return; }
      if (buildings.some(b => dist(b, w) < b.size + 28) || units.some(u => dist(u, w) < 24)) { toast('LOCATION OBSTRUCTED'); return; }
      buildings.push(makeBuilding(placement, 'blue', w.x, w.y)); toast(`${friendlyName(placement).toUpperCase()} OPERATIONAL`); placement = null; refreshUI(); return;
    }
    const actors = [...enemies, ...buildings, ...units].reverse(), hit = actors.find(a => dist(a, w) < (a.size || a.radius * 2 || 14) + 12);
    if (action === 'move' && selected?.team === 'blue' && unitMeta[selected.kind]) { selected.move = w; selected.target = null; selected.harvesting = false; action = 'select'; refreshUI(); return; }
    if (action === 'harvest') {
      if (selected?.kind === 'collector') { const node = nearestNode(w); if (node) { selected.harvestNode = node; selected.harvesting = true; selected.move = { x: node.x, y: node.y }; toast('SUPPLY ROUTE SET'); } }
      else toast('SELECT A HARVESTER FIRST'); action = 'select'; refreshUI(); return;
    }
    if (action === 'attack') {
      if (selected?.team === 'blue' && unitMeta[selected.kind]) { if (hit?.team === 'red') { selected.target = hit; selected.move = null; } else { selected.target = null; selected.move = w; } }
      action = 'select'; refreshUI(); return;
    }
    if (hit) {
      if (hit.team === 'red') { if (selected?.team === 'blue' && unitMeta[selected.kind]) { selected.target = hit; selected.move = null; } else toast('SELECT A COMBAT UNIT'); }
      else { selected = hit; refreshUI(); } return;
    }
    if (selected && unitMeta[selected.kind]) { selected.move = w; selected.target = null; selected.harvesting = false; toast('ORDERS RECEIVED'); }
    else { selected = null; refreshUI(); }
  }
  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect(); pointer = toWorld(e.clientX - r.left, e.clientY - r.top); pointer.x = clamp(pointer.x, 0, 1); pointer.y = clamp(pointer.y, 0, 1);
    if (panPointer) { const dx = e.clientX - panPointer.x, dy = e.clientY - panPointer.y; camera.x -= dx / Math.max(1, width) / camera.z; camera.y -= dy / Math.max(1, height) / camera.z; camera.x = clamp(camera.x, 0, 1); camera.y = clamp(camera.y, 0, 1); panPointer = { x: e.clientX, y: e.clientY }; }
  });
  canvas.addEventListener('pointerup', () => { panPointer = null; }); canvas.addEventListener('pointercancel', () => { panPointer = null; }); canvas.addEventListener('pointerdown', handleMap);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  document.querySelectorAll('.action-card').forEach(b => b.onclick = () => { if (!playing) return; action = b.dataset.action; if (action !== 'select') toast(action === 'move' ? 'SELECT DESTINATION' : action === 'harvest' ? 'SELECT A HARVESTER' : 'SELECT A HOSTILE TARGET'); refreshUI(); });
  document.querySelectorAll('.build-tab').forEach(b => b.onclick = () => { tab = b.dataset.tab; document.querySelectorAll('.build-tab').forEach(t => t.classList.toggle('active', t === b)); renderBuilds(); });
  document.querySelectorAll('.faction-option').forEach(b => b.onclick = () => { faction = b.dataset.faction; document.querySelectorAll('.faction-option').forEach(t => t.classList.toggle('active', t === b)); $('deploy-faction').textContent = faction.toUpperCase(); $('faction-label').textContent = factions[faction].label; renderBuilds(); });
  $('start-btn').onclick = () => { ui.start.classList.add('hidden'); $('faction-label').textContent = factions[faction].label; setup(); playing = true; last = performance.now(); toast(`${factions[faction].label} DEPLOYED · BUILD POWER, THEN BARRACKS`); refreshUI(); };
  $('pause-btn').onclick = () => { if (!playing || over) return; paused = !paused; ui.pause.classList.toggle('hidden', !paused); $('pause-btn').textContent = paused ? '▶' : 'Ⅱ'; last = performance.now(); };
  $('resume-btn').onclick = () => $('pause-btn').click();
  $('restart-btn').onclick = $('again-btn').onclick = () => { setup(); ui.end.classList.add('hidden'); ui.pause.classList.add('hidden'); ui.start.classList.remove('hidden'); playing = false; paused = false; refreshUI(); };
  $('sound-btn').onclick = e => { e.currentTarget.classList.toggle('muted'); toast(`SOUND ${e.currentTarget.classList.contains('muted') ? 'OFF' : 'ON'}`); };
  window.addEventListener('keydown', e => {
    if (['INPUT', 'BUTTON'].includes(document.activeElement.tagName) && e.key !== 'Escape') return;
    if (e.key === 'Escape') { if (placement) { credits += prices[placement]; placement = null; toast('PLACEMENT CANCELLED · SUPPLIES REFUNDED'); refreshUI(); } else if (playing) $('pause-btn').click(); }
    const k = e.key.toLowerCase(); if (k === 'q') document.querySelector('[data-action="select"]').click(); if (k === 'w') document.querySelector('[data-action="move"]').click(); if (k === 'e') document.querySelector('[data-action="attack"]').click(); if (k === 'r') document.querySelector('[data-action="harvest"]').click();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { e.preventDefault(); camera.y += k === 'arrowup' ? -.04 : k === 'arrowdown' ? .04 : 0; camera.x += k === 'arrowleft' ? -.04 : k === 'arrowright' ? .04 : 0; camera.x = clamp(camera.x, 0, 1); camera.y = clamp(camera.y, 0, 1); }
  });
  canvas.addEventListener('wheel', e => { e.preventDefault(); camera.z = clamp(camera.z * (e.deltaY < 0 ? 1.12 : .9), .75, 2.2); }, { passive: false });
  function valid(a) { return !!a && a.hp > 0 && (units.includes(a) || buildings.includes(a) || enemies.includes(a)); }
  function fire(a, b) { shots.push({ x: a.x, y: a.y, target: b, damage: a.damage, life: .2, max: .2, color: a.team === 'blue' ? '#d9f17d' : '#ef7859' }); a.cool = a.rate; }
  function destroy(a) {
    if (units.includes(a)) units = units.filter(v => v !== a); else if (enemies.includes(a)) enemies = enemies.filter(v => v !== a); else buildings = buildings.filter(v => v !== a);
    if (selected === a) selected = null; for (let i = 0; i < 10; i++) particles.push({ x: a.x + rand(-.025, .025), y: a.y + rand(-.025, .025), life: rand(.3, .7), max: .7, color: '#ffb958' });
    if (a.team === 'red') toast('HOSTILE DESTROYED');
  }
  function spawnEnemy() {
    const kind = time > 110 && Math.random() < .4 ? 'tank' : 'infantry'; const u = makeUnit(kind, 'red', .85 + rand(-.03, .06), .43 + rand(-.1, .12));
    u.name = kind === 'tank' ? 'Hostile Armor' : 'Hostile Infantry'; u.hp = u.max = kind === 'tank' ? 125 : 48; u.damage = kind === 'tank' ? 15 : 6; u.speed = kind === 'tank' ? 25 : 34; u.move = { x: .13, y: .52 }; enemies.push(u);
  }
  function finish(win) {
    over = true; playing = false; ui.end.classList.remove('hidden'); $('end-kicker').textContent = win ? 'OPERATION COMPLETE' : 'FIELD REPORT'; $('end-title').textContent = win ? 'VICTORY' : 'DEFEAT';
    $('end-copy').textContent = win ? 'Enemy command center neutralized. The frontier is yours.' : 'Your command center has fallen. Regroup and try another faction.'; ui.objective.classList.toggle('done', win);
  }
  function update(dt) {
    if (!playing || paused || over) return;
    time += dt; enemyClock -= dt; if (enemyClock <= 0) { spawnEnemy(); enemyClock = Math.max(9, 20 - time * .012) + rand(-2, 3); }
    for (const u of [...units, ...enemies, ...buildings]) {
      if (u.hp <= 0) continue; u.cool -= dt;
      const refinery = buildings.find(b => b.team === 'blue' && b.kind === 'refinery');
      if (u.kind === 'collector' && u.team === 'blue' && u.harvesting) {
        const node = u.harvestNode;
        if (!node || !node.active || u.carry >= 300) { u.harvesting = false; u.harvestNode = null; u.move = refinery ? { x: refinery.x, y: refinery.y } : null; }
        else if (dist(u, node) < 22) { u.move = null; const amount = Math.min(13 * dt, 300 - u.carry, node.amount); u.carry += amount; node.amount -= amount; if (node.amount <= 0) node.active = false; }
      }
      if (u.kind === 'collector' && u.team === 'blue' && !u.harvesting && u.carry > 0 && refinery && dist(u, refinery) < 38) {
        credits += u.carry; u.carry = 0; const node = nearestNode(u); if (node) { u.harvestNode = node; u.harvesting = true; u.move = { x: node.x, y: node.y }; }
      }
      const combat = (unitMeta[u.kind] && u.range > 0) || u.kind === 'hq' || u.kind === 'defense';
      if (combat) {
        if (u.target && (!valid(u.target) || dist(u, u.target) > u.range * 1.8)) u.target = null;
        if (!u.target) { let nearest = null, nd = Infinity; const candidates = u.team === 'blue' ? [...enemies, ...buildings.filter(b => b.team === 'red')] : [...units.filter(v => v.team === 'blue'), ...buildings.filter(b => b.team === 'blue')];
          for (const v of candidates) { const d = dist(u, v); if (d < u.range && d < nd) { nearest = v; nd = d; } } if (nearest) u.target = nearest; }
        if (u.target) {
          const targetDistance = dist(u, u.target);
          if (targetDistance <= u.range) { u.move = null; if (u.cool <= 0 && u.damage) fire(u, u.target); continue; }
          if (unitMeta[u.kind]) u.move = { x: u.target.x, y: u.target.y };
        }
      }
      const dest = u.move || (u.team === 'red' && unitMeta[u.kind] ? { x: .13, y: .52 } : null);
      if (dest && unitMeta[u.kind]) { const dx = (dest.x - u.x) * width, dy = (dest.y - u.y) * height, d = Math.hypot(dx, dy); if (d > 9) { const step = Math.min(d, u.speed * dt); u.x = clamp(u.x + dx / d * step / width, .01, .99); u.y = clamp(u.y + dy / d * step / height, .01, .99); } else if (u.move) u.move = null; }
    }
    for (const s of shots) { s.life -= dt; if (s.life <= 0 && valid(s.target)) { s.target.hp -= s.damage; particles.push({ x: s.target.x, y: s.target.y, life: .32, max: .32, color: s.color }); if (s.target.hp <= 0) destroy(s.target); } }
    shots = shots.filter(s => s.life > 0); particles.forEach(p => p.life -= dt); particles = particles.filter(p => p.life > 0);
    if (toastTime > 0 && ((toastTime -= dt) <= 0)) ui.toast.classList.remove('show');
    const enemyHQ = buildings.some(b => b.team === 'red' && b.kind === 'hq'), ownHQ = buildings.some(b => b.team === 'blue' && b.kind === 'hq');
    if (!enemyHQ) finish(true); else if (!ownHQ) finish(false);
    $('clock').textContent = `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(Math.floor(time % 60)).padStart(2, '0')}`; refreshUI();
  }
  function draw() { if (width && height) renderer.render({ faction, camera, selected, buildings, units, enemies, nodes, decor, shots, particles, placement, pointer, time }); }
  function loop(now) { const dt = Math.min(.05, (now - last) / 1000 || 0); last = now; update(dt); draw(); requestAnimationFrame(loop); }
  setup(); window.addEventListener('resize', resize); resize(); requestAnimationFrame(loop);
})();
