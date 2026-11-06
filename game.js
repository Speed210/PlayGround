/* ==========================================================================
   NIGHTFALL — Keep moving. Keep the fire alive.
   A complete, dependency-free survival game with a limited shelter network,
   recruitable companions, and a dark that remembers old ground.
   ========================================================================== */
(() => {
  'use strict';

  /* ---------------------------------------------------------------------
     Helpers
  --------------------------------------------------------------------- */
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const TAU = Math.PI * 2;
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const fmtTime = (s) => {
    s = Math.max(0, Math.ceil(s));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  const setText = (el, text) => {
    if (el && el.textContent !== text) el.textContent = text;
  };
  const roman = (n) => ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] || String(n);

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pointSegDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    if (l2 < 0.0001) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / l2;
    t = clamp(t, 0, 1);
    return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
  }

  /* ---------------------------------------------------------------------
     DOM
  --------------------------------------------------------------------- */
  const canvas = $('world');
  const ctx = canvas.getContext('2d');
  const minimap = $('minimap');
  const mm = minimap.getContext('2d');
  const DOM = {
    hud: $('hud'),
    bestBadge: $('bestBadge'),
    dayLabel: $('dayLabel'),
    phaseChip: $('phaseChip'),
    statusPanel: document.querySelector('.status-panel'),
    timeFill: $('timeFill'),
    timeLeft: $('timeLeft'),
    objective: $('objective'),
    healthFill: $('healthFill'),
    healthText: $('healthText'),
    levelText: $('levelText'),
    xpFill: $('xpFill'),
    statPointsText: $('statPointsText'),
    mapTitle: $('mapTitle'),
    dreadLabel: $('dreadLabel'),
    hauntLabel: $('hauntLabel'),
    kitBtn: $('kitBtn'),
    hudMenuBtn: $('hudMenuBtn'),
    muteBtn: $('muteBtn'),
    pauseBtn: $('pauseBtn'),
    woodCount: $('woodCount'),
    stoneCount: $('stoneCount'),
    scrapCount: $('scrapCount'),
    weaponTier: $('weaponTier'),
    controlHint: $('controlHint'),
    turretText: $('turretText'),
    barrierText: $('barrierText'),
    shelterPanel: $('shelterPanel'),
    shelterName: $('shelterName'),
    shelterPerk: $('shelterPerk'),
    shelterOccupant: $('shelterOccupant'),
    hauntBadge: $('hauntBadge'),
    barricadeText: $('barricadeText'),
    barricadeFill: $('barricadeFill'),
    armorText: $('armorText'),
    threatText: $('threatText'),
    hauntWarning: $('hauntWarning'),
    hauntWarningText: $('hauntWarningText'),
    claimBtn: $('claimBtn'),
    shelterEnterBtn: $('shelterEnterBtn'),
    recallResidentBtn: $('recallResidentBtn'),
    insideGuard: $('insideGuard'),
    insideBanner: $('insideBanner'),
    insideBannerName: $('insideBannerName'),
    fortifyCost: $('fortifyCost'),
    fortifyDesc: $('fortifyDesc'),
    reinforceCost: $('reinforceCost'),
    reinforceDesc: $('reinforceDesc'),
    trapsCost: $('trapsCost'),
    trapsDesc: $('trapsDesc'),
    repairCost: $('repairCost'),
    repairDesc: $('repairDesc'),
    weaponBtn: $('weaponBtn'),
    weaponUpgradeDesc: $('weaponUpgradeDesc'),
    weaponCost: $('weaponCost'),
    interactPrompt: $('interactPrompt'),
    interactKey: $('interactKey'),
    interactText: $('interactText'),
    abilityBar: $('abilityBar'),
    abilitySlots: $('abilitySlots'),
    focusFill: $('focusFill'),
    focusText: $('focusText'),
    toastStack: $('toastStack'),
    centerBanner: $('centerBanner'),
    bannerKicker: $('bannerKicker'),
    bannerTitle: $('bannerTitle'),
    bannerSub: $('bannerSub'),
    teamPanel: $('teamPanel'),
    teamCount: $('teamCount'),
    teamList: $('teamList'),
    joystick: $('joystick'),
    stickNub: $('stickNub'),
    useBtn: $('useBtn'),
    fireBtn: $('fireBtn'),
    crosshair: $('crosshair'),
    damageFlash: $('damageFlash'),
    healFlash: $('healFlash'),
    menuScreen: $('menuScreen'),
    menuMinBtn: $('menuMinBtn'),
    menuCloseBtn: $('menuCloseBtn'),
    menuDock: $('menuDock'),
    menuDockLabel: $('menuDockLabel'),
    resumeMenuBtn: $('resumeMenuBtn'),
    bestDays: $('bestDays'),
    startBtn: $('startBtn'),
    kitScreen: $('kitScreen'),
    kitCloseBtn: $('kitCloseBtn'),
    kitBody: $('kitBody'),
    kitLevel: $('kitLevel'),
    kitXp: $('kitXp'),
    kitPoints: $('kitPoints'),
    kitHint: $('kitHint'),
    kitPanes: {
      stats: $('kitStats'),
      gear: $('kitGear'),
      spells: $('kitSpells'),
      build: $('kitBuild'),
      squad: $('kitSquad')
    },
    pauseScreen: $('pauseScreen'),
    resumeBtn: $('resumeBtn'),
    pauseMenuBtn: $('pauseMenuBtn'),
    pauseRestartBtn: $('pauseRestartBtn'),
    dawnScreen: $('dawnScreen'),
    dawnTitle: $('dawnTitle'),
    dawnText: $('dawnText'),
    dawnNight: $('dawnNight'),
    dawnKills: $('dawnKills'),
    dawnBarricade: $('dawnBarricade'),
    dawnHealth: $('dawnHealth'),
    dawnAdvice: $('dawnAdvice'),
    continueBtn: $('continueBtn'),
    dawnCountdown: $('dawnCountdown'),
    gameoverScreen: $('gameoverScreen'),
    deathText: $('deathText'),
    deathDays: $('deathDays'),
    deathNights: $('deathNights'),
    deathKills: $('deathKills'),
    deathBest: $('deathBest'),
    deathAdvice: $('deathAdvice'),
    retryBtn: $('retryBtn')
  };

  const touchMode = window.matchMedia('(pointer: coarse)').matches;
  if (touchMode) document.body.classList.add('touch');

  /* ---------------------------------------------------------------------
     Storage
  --------------------------------------------------------------------- */
  const BEST_KEY = 'nightfall.best.v1';
  const MUTE_KEY = 'nightfall.mute.v1';
  function loadBest() {
    try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; } catch (e) { return 0; }
  }
  function saveBest(n) {
    try { localStorage.setItem(BEST_KEY, String(n)); } catch (e) { /* private mode */ }
  }
  function loadMuted() {
    try { return localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { return false; }
  }
  function saveMuted(v) {
    try { localStorage.setItem(MUTE_KEY, v ? '1' : '0'); } catch (e) { /* ignore */ }
  }

  /* ---------------------------------------------------------------------
     Audio — entirely synthesised, no external assets
  --------------------------------------------------------------------- */
  const Sound = {
    ctx: null,
    master: null,
    noiseBuffer: null,
    ambientGain: null,
    ambientFilter: null,
    muted: loadMuted(),
    ready: false,

    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.52;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buffer;
      this.ready = true;
      this.startAmbient();
    },

    resume() {
      if (!this.ctx) this.init();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    startAmbient() {
      if (!this.ready || this.ambientGain) return;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 280;
      filter.Q.value = 0.6;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.028;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start();
      this.ambientGain = gain;
      this.ambientFilter = filter;
      const drone = this.ctx.createOscillator();
      const dg = this.ctx.createGain();
      drone.type = 'sine';
      drone.frequency.value = 48;
      dg.gain.value = 0.012;
      drone.connect(dg);
      dg.connect(this.master);
      drone.start();
    },

    setNight(isNight) {
      if (!this.ambientGain) return;
      const t = this.ctx.currentTime;
      this.ambientGain.gain.cancelScheduledValues(t);
      this.ambientGain.gain.linearRampToValueAtTime(isNight ? 0.05 : 0.025, t + 2);
      if (this.ambientFilter) {
        this.ambientFilter.frequency.cancelScheduledValues(t);
        this.ambientFilter.frequency.linearRampToValueAtTime(isNight ? 420 : 260, t + 2);
      }
    },

    setMuted(v) {
      this.muted = v;
      saveMuted(v);
      DOM.muteBtn.classList.toggle('muted', v);
      if (this.master) this.master.gain.value = v ? 0 : 0.52;
    },

    tone(freq, dur, type, vol, slideTo, delay) {
      if (!this.ready || this.muted) return;
      const t = this.ctx.currentTime + (delay || 0);
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.08, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + dur + 0.02);
    },

    noise(dur, vol, freq, type) {
      if (!this.ready || this.muted) return;
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const f = this.ctx.createBiquadFilter();
      f.type = type || 'bandpass';
      f.frequency.value = freq || 900;
      f.Q.value = 0.8;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol || 0.15, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f);
      f.connect(g);
      g.connect(this.master);
      src.start(t);
      src.stop(t + dur + 0.02);
    },

    shoot(tier) {
      this.noise(0.12, 0.17, 1000 + tier * 120, 'highpass');
      this.tone(98 + tier * 9, 0.13, 'square', 0.12, 42);
    },
    hit() { this.tone(160, 0.07, 'triangle', 0.08, 60); },
    kill() { this.noise(0.22, 0.12, 320, 'lowpass'); this.tone(110, 0.3, 'sawtooth', 0.07, 38); },
    hurt() { this.tone(96, 0.3, 'sawtooth', 0.18, 36); this.noise(0.18, 0.13, 260, 'lowpass'); },
    gather() { this.tone(420, 0.07, 'triangle', 0.06, 620); },
    ui() { this.tone(520, 0.06, 'sine', 0.05, 760); },
    deny() { this.tone(180, 0.14, 'square', 0.06, 120); },
    claim() {
      [330, 440, 554].forEach((f, i) => this.tone(f, 0.55, 'sine', 0.055, f, i * 0.08));
    },
    recruit() {
      [392, 523, 659].forEach((f, i) => this.tone(f, 0.45, 'triangle', 0.05, f, i * 0.1));
    },
    night() {
      this.tone(55, 3.4, 'sawtooth', 0.1, 40);
      this.tone(82, 2.8, 'sine', 0.08, 55, 0.4);
      this.noise(2.6, 0.08, 220, 'lowpass');
    },
    dawn() {
      [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 1.2, 'sine', 0.045, f, i * 0.22));
    },
    breach() {
      this.noise(0.6, 0.26, 180, 'lowpass');
      this.tone(70, 0.7, 'sawtooth', 0.16, 32);
    },
    howl() {
      this.tone(rand(220, 320), 1.1, 'sine', 0.035, rand(120, 180));
    }
  };

  /* ---------------------------------------------------------------------
     Constants
  --------------------------------------------------------------------- */
  const WORLD = { w: 3000, h: 2200 };
  const DAY_DURATION = 80;
  const DUSK_DURATION = 12;
  const NIGHT_BASE = 46;
  const CHAPTER_NIGHTS = 8;
  const MAX_TEAM = 2;
  const WALL_RADIUS = 132;

  const CHAPTERS = [
    { name: 'THE VALLEY' },
    { name: 'ASHEN MOOR' },
    { name: 'THE HOLLOW' },
    { name: 'BLACKWATER' },
    { name: 'THE LONG NIGHT' },
    { name: 'WHERE THE LIGHT DIES' }
  ];

  const WEAPONS = [
    { short: 'Mk I', dmg: 34, rate: 0.33, speed: 930 },
    { short: 'Mk II', dmg: 45, rate: 0.27, speed: 1000 },
    { short: 'Mk III', dmg: 57, rate: 0.22, speed: 1060 },
    { short: 'Mk IV', dmg: 72, rate: 0.18, speed: 1140 }
  ];

  /* ---------------------------------------------------------------------
     Progression data — tiers, stat points, gear, spells, turrets, barriers
  --------------------------------------------------------------------- */
  const TIERS = [
    { id: 'common', label: 'Common', color: '#b9b1a3', mult: 1, scrap: 2 },
    { id: 'uncommon', label: 'Uncommon', color: '#81ad89', mult: 1.22, scrap: 3 },
    { id: 'rare', label: 'Rare', color: '#7fa9d0', mult: 1.48, scrap: 5 },
    { id: 'advanced', label: 'Advanced', color: '#b58ad6', mult: 1.78, scrap: 8 },
    { id: 'epic', label: 'Epic', color: '#d77fa0', mult: 2.15, scrap: 12 },
    { id: 'legendary', label: 'Legendary', color: '#e8a34d', mult: 2.6, scrap: 18 },
    { id: 'god', label: 'God', color: '#ffd970', mult: 3.2, scrap: 28 }
  ];

  const STAT_DEFS = [
    { id: 'damage', label: 'Weapon Damage', short: 'DMG', max: 25, desc: 'Bolsters your firearm and every companion shot.', fmt: (v) => `+${v * 8}%` },
    { id: 'speed', label: 'Movement Speed', short: 'SPD', max: 15, desc: 'Longer strides between the trees.', fmt: (v) => `+${v * 3}%` },
    { id: 'mastery', label: 'Weapon Mastery', short: 'MST', max: 6, desc: 'Equip one higher gear tier per point.', fmt: (v) => TIERS[clamp(v, 0, 6)].label },
    { id: 'engineering', label: 'Shelter Engineering', short: 'ENG', max: 20, desc: 'Repairs and fortifications do more work.', fmt: (v) => `+${v * 7}%` },
    { id: 'binding', label: 'Binding', short: 'BND', max: 20, desc: 'Chance an attacking creature becomes a companion.', fmt: (v) => `+${(v * 2.5).toFixed(1)}%` },
    { id: 'crit', label: 'Critical Chance', short: 'CRT', max: 20, desc: 'Chance for a shot to strike a vital point.', fmt: (v) => `+${(v * 1.5).toFixed(1)}%` },
    { id: 'critDmg', label: 'Critical Damage', short: 'CDM', max: 20, desc: 'Extra damage added on critical hits.', fmt: (v) => `+${v * 8}%` },
    { id: 'turret', label: 'Turret Craft', short: 'TRT', max: 9, desc: 'Unlocks turret patterns and stronger builds.', fmt: (v) => `Rank ${v}` },
    { id: 'scavenging', label: 'Scavenging', short: 'SCV', max: 20, desc: 'Better supply crates and equipment drops.', fmt: (v) => `+${v * 2}%` }
  ];

  const EQUIP_SLOTS = [
    { id: 'weapon', label: 'Weapon', creature: true, kinds: ['Gun', 'Katana'], stats: ['dmg', 'crit', 'critDmg'] },
    { id: 'helmet', label: 'Helmet', creature: true, stats: ['armor', 'crit', 'hp'] },
    { id: 'body', label: 'Body Armor', creature: false, stats: ['armor', 'hp', 'dmg'] },
    { id: 'shoes', label: 'Shoes', creature: true, stats: ['speed', 'armor', 'hp'] },
    { id: 'gloves', label: 'Gloves', creature: false, stats: ['dmg', 'crit', 'critDmg'] },
    { id: 'pants', label: 'Pants', creature: false, stats: ['armor', 'hp', 'speed'] },
    { id: 'ring1', label: 'Ring I', creature: false, stats: ['crit', 'critDmg', 'scav', 'binding'] },
    { id: 'ring2', label: 'Ring II', creature: false, stats: ['crit', 'critDmg', 'scav', 'binding'] },
    { id: 'earring1', label: 'Earring I', creature: false, stats: ['binding', 'turret', 'scav', 'engineering'] },
    { id: 'earring2', label: 'Earring II', creature: false, stats: ['binding', 'turret', 'scav', 'engineering'] }
  ];

  const GEAR_STAT_LABELS = {
    dmg: 'DMG', crit: 'CRIT', critDmg: 'CRIT DMG', speed: 'SPD', armor: 'ARMOR',
    hp: 'VITALITY', scav: 'SCAV', binding: 'BIND', engineering: 'ENG', turret: 'TURRET'
  };

  const GEAR_WORDS = {
    weapon: ['Repeater', 'Longrifle', 'Sidearm', 'Carbine', 'Blade', 'Sabre', 'Fang'],
    helmet: ['Hood', 'Visor', 'Cowl', 'Helm', 'Crown'],
    body: ['Coat', 'Cuirass', 'Vest', 'Harness', 'Mantle'],
    shoes: ['Boots', 'Striders', 'Treads', 'Moccasins', 'Greaves'],
    gloves: ['Grips', 'Gloves', 'Gauntlets', 'Wraps', 'Hands'],
    pants: ['Trousers', 'Legwraps', 'Breeches', 'Greaves', 'Slacks'],
    ring1: ['Loop', 'Band', 'Signet', 'Circle'],
    ring2: ['Loop', 'Band', 'Signet', 'Circle'],
    earring1: ['Stud', 'Charm', 'Drop', 'Hoop'],
    earring2: ['Stud', 'Charm', 'Drop', 'Hoop']
  };
  const GEAR_PREFIX = ['Weathered', 'Scavenged', 'Riveted', 'Hollow', 'Ashen', 'Moonlit', 'Ironbound', 'Saint\'s', 'Dread', 'Dawnforged'];

  const ABILITIES = [
    {
      id: 'ember', key: '1', code: 'Digit1', name: 'Emberlance', kind: 'Offense', unlock: 2, cost: 26, cooldown: 4.5,
      desc: 'Hurl a burning lance that pierces the dark and sets flesh alight.'
    },
    {
      id: 'ward', key: '2', code: 'Digit2', name: 'Wardlight', kind: 'Defense', unlock: 3, cost: 34, cooldown: 12,
      desc: 'A halo of old light absorbs damage until it shatters.'
    },
    {
      id: 'frost', key: '3', code: 'Digit3', name: 'Frost Nova', kind: 'Control', unlock: 5, cost: 42, cooldown: 10,
      desc: 'Freeze the air around you. Nearby creatures slow to a crawl.'
    },
    {
      id: 'titan', key: '4', code: 'Digit4', name: 'Titan Step', kind: 'Superhuman', unlock: 7, cost: 54, cooldown: 18,
      desc: 'For a few breaths you move faster, hit harder, and shrug off claws.'
    },
    {
      id: 'rally', key: 'Q', code: 'KeyQ', name: 'Rally', kind: 'Support', unlock: 9, cost: 44, cooldown: 16,
      desc: 'Call every companion home. Heals and steels them for the next wave.'
    }
  ];

  const TURRETS = {
    arrow: { label: 'Arrow Turret', unlock: 0, cost: { wood: 4, stone: 2, scrap: 2 }, dmg: 15, rate: 0.6, range: 370, speed: 780, color: '#d8c08a', desc: 'Cheap, quiet, endlessly useful.' },
    spear: { label: 'Spear Launcher', unlock: 1, cost: { wood: 5, stone: 3, scrap: 3 }, dmg: 30, rate: 0.9, range: 440, speed: 700, pierce: 2, color: '#c9a46d', desc: 'Heavy bolts punch through a line.' },
    cannon: { label: 'Cannonball', unlock: 2, cost: { stone: 6, scrap: 5 }, dmg: 44, rate: 1.7, range: 430, speed: 430, splash: 64, color: '#9aa1a0', desc: 'Slow, loud, and unforgiving in a crowd.' },
    gun: { label: 'Gun Turret', unlock: 3, cost: { scrap: 8, stone: 4 }, dmg: 19, rate: 0.19, range: 400, speed: 1080, color: '#b9c3b0', desc: 'A steady stream of lead.' },
    seismic: { label: 'Seismic Charge', unlock: 4, cost: { stone: 9, scrap: 7 }, dmg: 38, rate: 2.1, range: 205, aoe: 92, slow: true, color: '#b08f6a', desc: 'Hammers the ground and staggers everything near.' },
    flame: { label: 'Flamethrower', unlock: 5, cost: { scrap: 9, wood: 4 }, dmg: 13, rate: 0.16, range: 190, cone: true, burn: true, color: '#e07b43', desc: 'A cone of fire that clings.' },
    tesla: { label: 'Tesla Coil', unlock: 6, cost: { scrap: 12, stone: 5 }, dmg: 30, rate: 1.15, range: 340, chain: 3, color: '#8fd0ff', desc: 'Lightning finds the nearest veins.' },
    mortar: { label: 'Mortar', unlock: 7, cost: { stone: 12, scrap: 10 }, dmg: 62, rate: 2.6, range: 620, splash: 92, color: '#a58c74', desc: 'Lobs shells over the barricade.' },
    bfg: { label: 'BFG', unlock: 8, cost: { scrap: 20, stone: 12, wood: 8 }, dmg: 130, rate: 4.2, range: 760, beam: true, color: '#9be86b', desc: 'The last word. It leaves nothing standing.' }
  };

  const BARRIERS = {
    barbed: { label: 'Barbed Wire', unlock: 0, cost: { scrap: 3, wood: 1 }, integrity: 18, armor: 0.02, trap: 6, color: '#a8a294', desc: 'Cheap wire. It bites anything that presses close.' },
    mud: { label: 'Mud Bank', unlock: 1, cost: { wood: 2, stone: 1 }, integrity: 32, armor: 0, trap: 1, slow: 0.62, color: '#8b6d4c', desc: 'Bogs down the horde at the wall.' },
    wood: { label: 'Wood Wall', unlock: 2, cost: { wood: 6 }, integrity: 72, armor: 0.04, trap: 0, color: '#b07a47', desc: 'Honest timber. Easy to raise, easy to burn.' },
    stone: { label: 'Stone Wall', unlock: 3, cost: { stone: 7 }, integrity: 112, armor: 0.1, trap: 0, color: '#9aa1a0', desc: 'Heavy blocks that turn claws aside.' },
    metal: { label: 'Metal Plating', unlock: 4, cost: { scrap: 8, stone: 5 }, integrity: 150, armor: 0.16, trap: 2, reflect: 0.16, color: '#b7c0be', desc: 'Scrap welded into a cruel shell. Hurts attackers back.' },
    godstone: { label: 'Godstone', unlock: 5, cost: { stone: 12, scrap: 8 }, integrity: 230, armor: 0.24, trap: 10, color: '#ffd970', desc: 'Stone veined with dawnlight. The dark recoils.' }
  };

  const BARRIER_EFFECTS = {
    none: { label: 'No Rune', cost: {}, color: '#8b877c', desc: 'Leave the barrier unwarded.' },
    poison: { label: 'Poison Gas', cost: { scrap: 3 }, color: '#8fd36b', dot: 7, desc: 'Creatures that strike the wall are poisoned.' },
    shock: { label: 'Electricity', cost: { scrap: 4 }, color: '#8fd0ff', zap: 14, desc: 'The wall discharges into everyone nearby.' },
    fire: { label: 'Fire', cost: { wood: 2, scrap: 2 }, color: '#ff9a4f', dot: 9, desc: 'Burning pitch clings to attackers.' },
    freeze: { label: 'Freeze', cost: { stone: 2, scrap: 3 }, color: '#9bdcff', slow: 0.35, desc: 'A cold rune slows everything at the wall.' },
    heal: { label: 'Healing Aura', cost: { wood: 3, stone: 2 }, color: '#9be8a8', heal: 3.2, desc: 'Mends you and your companions while you hold.' }
  };

  const ROLES = {
    scout: { label: 'Scout', hp: 72, dmg: 17, rate: 0.65, range: 370, speed: 156, color: '#8fb7c4', perk: 'Fast, sharp-eyed, quick to fire.' },
    hunter: { label: 'Hunter', hp: 92, dmg: 31, rate: 1.05, range: 405, speed: 126, color: '#d59a5f', perk: 'Heavy rifle. Hits like a closing door.' },
    medic: { label: 'Medic', hp: 82, dmg: 13, rate: 0.9, range: 300, speed: 138, color: '#9dc3a4', perk: 'Mends your wounds while the world bleeds.' },
    engineer: { label: 'Engineer', hp: 100, dmg: 15, rate: 0.95, range: 320, speed: 130, color: '#b9a4c8', perk: 'Patches barricades without being asked.' }
  };

  const NAMES = ['Mira', 'Cole', 'Yara', 'Bram', 'Juno', 'Silas', 'Wren', 'Ossa', 'Tamsin', 'Rook', 'Elia', 'Dane'];

  const ENEMY_TYPES = {
    flesh: {
      scp: 'SCP-610', label: 'The Flesh That Hates', short: 'Flesh That Hates', hp: 34, speed: 56, dmg: 8, atk: 0.95,
      r: 13, wall: 9, color: '#3a2024', eye: '#ff6b45', glow: '214,72,56', map: '#d8563f', kind: 'melee',
      entry: 'A wet, boneless thing that used to be a person. It spreads by touch.'
    },
    statue: {
      scp: 'SCP-173', label: 'The Sculpture', short: 'The Sculpture', hp: 38, speed: 152, dmg: 17, atk: 0.62,
      r: 12, wall: 7, color: '#8d8778', eye: '#e9f2df', glow: '224,234,210', map: '#cfcdb6', kind: 'statue',
      entry: 'Concrete and rebar. It cannot move while you are looking at it.'
    },
    voice: {
      scp: 'SCP-939', label: 'With Many Voices', short: 'Many Voices', hp: 58, speed: 118, dmg: 11, atk: 0.75,
      r: 14, wall: 10, color: '#5e2230', eye: '#ff9b57', glow: '255,138,74', map: '#c05063', kind: 'pack',
      entry: 'It hunts in packs and speaks in the voices of the people it has eaten.'
    },
    doctor: {
      scp: 'SCP-049', label: 'The Plague Doctor', short: 'Plague Doctor', hp: 148, speed: 40, dmg: 23, atk: 1.35,
      r: 18, wall: 17, color: '#1d2022', eye: '#c7efc0', glow: '150,232,148', map: '#93d68d', kind: 'healer',
      entry: 'The cure is worse than the plague. It keeps the outbreak walking.'
    },
    shyguy: {
      scp: 'SCP-096', label: 'The Shy Guy', short: 'Shy Guy', hp: 92, speed: 62, dmg: 18, atk: 0.95,
      r: 15, wall: 13, color: '#c7beaa', eye: '#ff4d4d', glow: '255,78,68', map: '#d9cdb8', kind: 'observer',
      entry: 'Do not look at its face. If you do, there is nowhere far enough to run.'
    },
    oldman: {
      scp: 'SCP-106', label: 'The Old Man', short: 'The Old Man', hp: 86, speed: 44, dmg: 13, atk: 2.2,
      r: 15, wall: 0, color: '#31302b', eye: '#9bff8a', glow: '120,255,110', map: '#8fd07a', kind: 'phaser', ranged: true,
      entry: 'It walks through walls. A barricade is only a suggestion.'
    },
    reptile: {
      scp: 'SCP-682', label: 'The Hard-to-Destroy Reptile', short: 'The Reptile', hp: 420, speed: 36, dmg: 32, atk: 1.55,
      r: 26, wall: 28, color: '#2c3d2c', eye: '#ffd35a', glow: '255,203,84', map: '#b8c56b', kind: 'regen',
      entry: 'It regenerates faster than you can hurt it. Run, or bring a miracle.'
    }
  };

  const SHELTER_DEFS = [
    { id: 'ranger', name: "Ranger's Hut", x: 700, y: 620, base: 150, perk: 'Sturdy walls, clear sightlines.', mod: { dmg: 1.08, spawn: 1, haunt: 1 } },
    { id: 'chapel', name: 'Chapel Ruins', x: 1780, y: 470, base: 130, perk: 'Consecrated ground frays them.', mod: { dmg: 1, spawn: 0.82, haunt: 1 } },
    { id: 'mill', name: 'The Mill House', x: 2400, y: 1100, base: 200, perk: 'Heavy beams. Slow to break.', mod: { dmg: 1, spawn: 1, haunt: 1 } },
    { id: 'watch', name: 'Watchtower', x: 2010, y: 1830, base: 120, perk: 'High ground. Long sightlines.', mod: { dmg: 1.16, spawn: 1.08, haunt: 1 } },
    { id: 'cabin', name: 'Lakeside Cabin', x: 980, y: 1770, base: 150, perk: 'Water masks your scent.', mod: { dmg: 1, spawn: 0.92, haunt: 0.6 } },
    { id: 'farm', name: 'Old Farmstead', x: 420, y: 1320, base: 140, perk: 'Open fields. Nothing sneaks close.', mod: { dmg: 1, spawn: 1, haunt: 1, speed: 1.05 } }
  ];

  /* ---------------------------------------------------------------------
     World data
  --------------------------------------------------------------------- */
  const shelters = [];
  const resourceNodes = [];
  const terrain = {
    patches: [], tufts: [], trees: [], rocks: [],
    flowers: [], mushrooms: [], bones: [], stumps: [], logs: [],
    reeds: [], pebbles: [], graves: [], crops: [], puddles: [], wreck: []
  };
  const pathLinks = [
    ['ranger', 'chapel'], ['chapel', 'mill'], ['mill', 'watch'],
    ['watch', 'cabin'], ['cabin', 'farm'], ['farm', 'ranger'],
    ['ranger', 'mill'], ['chapel', 'cabin']
  ];

  function makeShelter(def) {
    return {
      id: def.id,
      name: def.name,
      x: def.x,
      y: def.y,
      radius: WALL_RADIUS,
      base: def.base,
      perk: def.perk,
      mod: def.mod,
      state: {
        owned: false,
        integrity: 0,
        maxIntegrity: def.base,
        armor: 0,
        traps: 0,
        haunt: 0,
        breached: false,
        collapsed: false,
        hit: 0,
        turret: null,
        barrier: null
      }
    };
  }

  function buildWorld() {
    shelters.length = 0;
    SHELTER_DEFS.forEach((d) => shelters.push(makeShelter(d)));
    const R = mulberry32(0x51a7f00d);

    // broad ground stains
    for (let i = 0; i < 90; i++) {
      terrain.patches.push({
        x: R() * WORLD.w,
        y: R() * WORLD.h,
        rx: 40 + R() * 180,
        ry: 25 + R() * 100,
        a: 0.035 + R() * 0.07,
        tone: R() < 0.45 ? '170,148,104' : R() < 0.55 ? '62,79,58' : '34,52,42'
      });
    }

    // grass tufts
    for (let i = 0; i < 1150; i++) {
      terrain.tufts.push({
        x: 40 + R() * (WORLD.w - 80),
        y: 40 + R() * (WORLD.h - 80),
        s: 2 + R() * 4.5,
        rot: R() * TAU,
        tone: R() < 0.5 ? '88,112,78' : '62,88,62'
      });
    }

    // trees — kept clear of shelter clearings
    let attempts = 0;
    while (terrain.trees.length < 190 && attempts < 1800) {
      attempts++;
      const x = 60 + R() * (WORLD.w - 120);
      const y = 60 + R() * (WORLD.h - 120);
      let ok = true;
      for (const s of shelters) {
        if (dist(x, y, s.x, s.y) < s.radius + 115) { ok = false; break; }
      }
      if (!ok) continue;
      for (const t of terrain.trees) {
        if (dist(x, y, t.x, t.y) < 48) { ok = false; break; }
      }
      if (!ok) continue;
      const kindRoll = R();
      terrain.trees.push({
        x, y,
        r: 17 + R() * 24,
        sway: R() * TAU,
        tone: R() < 0.33 ? 0 : R() < 0.66 ? 1 : 2,
        kind: kindRoll < 0.54 ? 'pine' : kindRoll < 0.83 ? 'oak' : 'dead',
        lean: (R() - 0.5) * 0.2
      });
    }

    // rocks
    for (let i = 0; i < 70; i++) {
      const x = 50 + R() * (WORLD.w - 100);
      const y = 50 + R() * (WORLD.h - 100);
      let ok = true;
      for (const s of shelters) if (dist(x, y, s.x, s.y) < s.radius + 40) ok = false;
      if (!ok) continue;
      terrain.rocks.push({ x, y, r: 4 + R() * 9, tone: R() * 0.3, moss: R() < 0.55 });
    }

    // forest-floor detail
    for (let i = 0; i < 170; i++) {
      terrain.flowers.push({
        x: 50 + R() * (WORLD.w - 100),
        y: 50 + R() * (WORLD.h - 100),
        s: 1.4 + R() * 2.2,
        rot: R() * TAU,
        tone: R() < 0.45 ? '218,202,154' : R() < 0.72 ? '174,124,156' : '146,178,151',
        glow: R() < 0.18
      });
    }
    for (let i = 0; i < 95; i++) {
      terrain.mushrooms.push({
        x: 50 + R() * (WORLD.w - 100),
        y: 50 + R() * (WORLD.h - 100),
        r: 2.2 + R() * 3.4,
        tone: R() < 0.5 ? '156,138,104' : '178,110,92',
        glow: R() < 0.22
      });
    }
    for (let i = 0; i < 260; i++) {
      terrain.pebbles.push({
        x: 40 + R() * (WORLD.w - 80),
        y: 40 + R() * (WORLD.h - 80),
        r: 1 + R() * 2.6,
        tone: 0.1 + R() * 0.22
      });
    }
    for (let i = 0; i < 34; i++) {
      terrain.bones.push({
        x: 60 + R() * (WORLD.w - 120),
        y: 60 + R() * (WORLD.h - 120),
        rot: R() * TAU,
        s: 0.7 + R() * 0.7
      });
    }
    for (let i = 0; i < 42; i++) {
      const x = 60 + R() * (WORLD.w - 120);
      const y = 60 + R() * (WORLD.h - 120);
      let ok = true;
      for (const s of shelters) if (dist(x, y, s.x, s.y) < s.radius + 50) ok = false;
      if (ok) terrain.stumps.push({ x, y, r: 4 + R() * 5, rot: R() * TAU });
    }
    for (let i = 0; i < 24; i++) {
      const x = 60 + R() * (WORLD.w - 120);
      const y = 60 + R() * (WORLD.h - 120);
      let ok = true;
      for (const s of shelters) if (dist(x, y, s.x, s.y) < s.radius + 90) ok = false;
      if (ok) terrain.logs.push({ x, y, len: 16 + R() * 30, rot: R() * TAU, moss: R() < 0.6 });
    }
    for (let i = 0; i < 22; i++) {
      terrain.puddles.push({
        x: 70 + R() * (WORLD.w - 140),
        y: 70 + R() * (WORLD.h - 140),
        rx: 14 + R() * 36,
        ry: 7 + R() * 15,
        rot: R() * TAU
      });
    }
    // containment wreckage: shattered crates, rebar and site signs
    for (let i = 0; i < 38; i++) {
      terrain.wreck.push({
        x: 70 + R() * (WORLD.w - 140),
        y: 70 + R() * (WORLD.h - 140),
        rot: R() * TAU,
        kind: R() < 0.45 ? 'crate' : R() < 0.78 ? 'rebar' : 'sign'
      });
    }

    // the lake by the cabin — reeds and shoreline detail
    for (let i = 0; i < 68; i++) {
      const a = R() * TAU;
      const rr = 0.86 + R() * 0.38;
      terrain.reeds.push({
        x: 1120 + Math.cos(a) * 208 * rr,
        y: 1892 + Math.sin(a) * 100 * rr,
        h: 5 + R() * 11,
        rot: R() * TAU
      });
    }
    // chapel graveyard
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        if (R() < 0.18) continue;
        terrain.graves.push({
          x: 1550 + col * 36 + R() * 8,
          y: 610 + row * 38 + R() * 7,
          rot: (R() - 0.5) * 0.16,
          kind: R() < 0.3 ? 'cross' : 'stone'
        });
      }
    }
    // farm crop rows
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 20; col++) {
        if (R() < 0.13) continue;
        terrain.crops.push({
          x: 250 + col * 13 + R() * 3,
          y: 1490 + row * 15 + R() * 3,
          h: 4 + R() * 5,
          tone: R() < 0.5 ? '134,126,75' : '108,116,70'
        });
      }
    }

    // resource nodes: guaranteed starter ring + procedural scatter
    resourceNodes.length = 0;
    const fixed = [
      { type: 'wood', x: 548, y: 802 }, { type: 'wood', x: 854, y: 730 },
      { type: 'stone', x: 836, y: 498 }, { type: 'scrap', x: 612, y: 902 },
      { type: 'wood', x: 1706, y: 566 }, { type: 'stone', x: 1868, y: 572 },
      { type: 'scrap', x: 2330, y: 1002 }, { type: 'wood', x: 2410, y: 1230 },
      { type: 'stone', x: 1932, y: 1702 }, { type: 'scrap', x: 2100, y: 1940 },
      { type: 'wood', x: 1080, y: 1866 }, { type: 'stone', x: 862, y: 1660 },
      { type: 'wood', x: 520, y: 1430 }, { type: 'scrap', x: 332, y: 1218 }
    ];
    const counts = { wood: 26, stone: 20, scrap: 18 };
    const types = Object.keys(counts);
    types.forEach((type) => {
      for (let i = 0; i < counts[type]; i++) {
        let x = 0;
        let y = 0;
        let ok = false;
        for (let tries = 0; tries < 80 && !ok; tries++) {
          x = 80 + R() * (WORLD.w - 160);
          y = 80 + R() * (WORLD.h - 160);
          ok = true;
          for (const s of shelters) if (dist(x, y, s.x, s.y) < s.radius + 105) ok = false;
          for (const n of resourceNodes) if (dist(x, y, n.x, n.y) < 82) ok = false;
          for (const t of terrain.trees) if (dist(x, y, t.x, t.y) < 42) ok = false;
        }
        if (ok) fixed.push({ type, x, y });
      }
    });
    fixed.forEach((n, i) => {
      const R2 = mulberry32(0x9e37 + i * 97);
      resourceNodes.push({
        id: 'n' + i,
        type: n.type,
        x: n.x,
        y: n.y,
        maxUses: n.type === 'wood' ? 4 : 3,
        uses: n.type === 'wood' ? 4 : 3,
        respawn: 0,
        seed: R2() * 10
      });
    });
  }

  /* ---------------------------------------------------------------------
     Game state
  --------------------------------------------------------------------- */
  const player = {
    x: 700, y: 792, r: 14, speed: 190, aim: -Math.PI / 2,
    invuln: 0, hitFlash: 0, walk: 0, moving: false,
    shield: 0, shieldHp: 0, titan: 0
  };

  const camera = { x: player.x, y: player.y };

  function emptyStats() {
    const s = {};
    STAT_DEFS.forEach((d) => { s[d.id] = 0; });
    return s;
  }

  function emptyEquipment() {
    const e = {};
    EQUIP_SLOTS.forEach((s) => { e[s.id] = null; });
    return e;
  }

  function emptyCompanionEquipment() {
    return { weapon: null, shoes: null, helmet: null };
  }

  const game = {
    mode: 'menu',
    runActive: false,
    menuResume: false,
    inShelter: null,
    seenScp: [],
    day: 1,
    chapter: 1,
    phase: 'day',
    phaseTime: 0,
    phaseDuration: DAY_DURATION,
    health: 100,
    maxHealth: 100,
    kills: 0,
    nightsHeld: 0,
    best: loadBest(),
    resources: { wood: 0, stone: 0, scrap: 0 },
    weaponTier: 1,
    level: 1,
    xp: 0,
    xpNext: 18,
    totalXp: 0,
    statPoints: 0,
    stats: emptyStats(),
    equipment: emptyEquipment(),
    inventory: [],
    supplies: [],
    beams: [],
    focus: 100,
    maxFocus: 100,
    abilityCooldowns: {},
    supplyTimer: 22,
    buildTurretType: 'arrow',
    buildBarrierType: 'wood',
    buildBarrierEffect: 'none',
    lastAbilitySig: '',
    kitTab: 'stats',
    activeShelter: null,
    panelShelter: null,
    prompt: null,
    enemies: [],
    bullets: [],
    projectiles: [],
    particles: [],
    texts: [],
    companions: [],
    team: [],
    time: 0,
    cooldown: 0,
    muzzle: 0,
    shake: 0,
    spawnQueue: 0,
    queueTimer: 0,
    spawnTimer: 0,
    trickle: 3,
    nightDuration: NIGHT_BASE,
    nightKills: 0,
    dawnTimer: 0,
    dyingTimer: 0,
    fireTimer: 0,
    hintTimer: 0,
    lastSig: ''
  };

  let mouse = { x: 0, y: 0, active: false };
  let view = { w: window.innerWidth, h: window.innerHeight, dpr: 1 };
  let lightCanvas = document.createElement('canvas');
  let lightCtx = lightCanvas.getContext('2d');
  let ambientTimer = 0;

  /* ---------------------------------------------------------------------
     Run setup
  --------------------------------------------------------------------- */
  function resetShelters() {
    for (const s of shelters) {
      s.state.owned = false;
      s.state.integrity = 0;
      s.state.maxIntegrity = s.base;
      s.state.armor = 0;
      s.state.traps = 0;
      s.state.haunt = 0;
      s.state.breached = false;
      s.state.collapsed = false;
      s.state.hit = 0;
      s.state.turret = null;
      s.state.barrier = null;
    }
  }

  function resetNodes() {
    for (const n of resourceNodes) {
      n.uses = n.maxUses;
      n.respawn = 0;
    }
  }

  function playerMaxHealth() {
    let bonus = 0;
    for (const slot of Object.values(game.equipment || {})) {
      if (slot && slot.stats && typeof slot.stats.hp === 'number') bonus += slot.stats.hp;
    }
    return 100 + Math.max(0, bonus);
  }

  function resetRun() {
    game.mode = 'playing';
    game.runActive = true;
    game.menuResume = false;
    game.inShelter = null;
    game.seenScp = [];
    game.day = 1;
    game.chapter = 1;
    game.phase = 'day';
    game.phaseTime = 0;
    game.phaseDuration = DAY_DURATION;
    game.health = 100;
    game.maxHealth = 100;
    game.kills = 0;
    game.nightKills = 0;
    game.nightsHeld = 0;
    game.resources.wood = 0;
    game.resources.stone = 0;
    game.resources.scrap = 0;
    game.weaponTier = 1;
    game.level = 1;
    game.xp = 0;
    game.xpNext = 18;
    game.totalXp = 0;
    game.statPoints = 0;
    game.stats = emptyStats();
    game.equipment = emptyEquipment();
    game.inventory.length = 0;
    game.supplies.length = 0;
    game.beams.length = 0;
    game.focus = 100;
    game.maxFocus = 100;
    game.abilityCooldowns = {};
    game.supplyTimer = 22;
    game.buildTurretType = 'arrow';
    game.buildBarrierType = 'wood';
    game.buildBarrierEffect = 'none';
    game.lastAbilitySig = '';
    game.kitTab = 'stats';
    game.activeShelter = null;
    game.panelShelter = null;
    game.prompt = null;
    game.enemies.length = 0;
    game.bullets.length = 0;
    game.projectiles.length = 0;
    game.particles.length = 0;
    game.texts.length = 0;
    game.companions.length = 0;
    game.team.length = 0;
    game.time = 0;
    game.cooldown = 0;
    game.muzzle = 0;
    game.shake = 0;
    game.spawnQueue = 0;
    game.queueTimer = 0;
    game.spawnTimer = 0;
    game.trickle = 3;
    game.nightDuration = NIGHT_BASE;
    game.dawnTimer = 0;
    game.dyingTimer = 0;
    game.fireTimer = 0;
    game.hintTimer = 0;
    game.lastSig = '';
    resetShelters();
    resetNodes();
    player.x = 700;
    player.y = 792;
    player.aim = -Math.PI / 2;
    player.invuln = 0;
    player.hitFlash = 0;
    player.walk = 0;
    player.moving = false;
    player.shield = 0;
    player.shieldHp = 0;
    player.titan = 0;
    game.maxHealth = playerMaxHealth();
    game.health = game.maxHealth;
    camera.x = player.x;
    camera.y = player.y;
    spawnWildCompanions(4);
    game.firing = false;
  }

  /* ---------------------------------------------------------------------
     Companions
  --------------------------------------------------------------------- */
  function spawnWildCompanions(count) {
    const roles = Object.keys(ROLES);
    const usedNames = new Set(game.companions.map((c) => c.name));
    const openNames = NAMES.filter((n) => !usedNames.has(n));
    for (let i = 0; i < count; i++) {
      let x = 0;
      let y = 0;
      let ok = false;
      for (let tries = 0; tries < 120 && !ok; tries++) {
        x = 160 + Math.random() * (WORLD.w - 320);
        y = 160 + Math.random() * (WORLD.h - 320);
        ok = true;
        for (const s of shelters) if (dist(x, y, s.x, s.y) < s.radius + 140) ok = false;
        for (const c of game.companions) if (c.state === 'wild' && dist(x, y, c.x, c.y) < 220) ok = false;
      }
      if (!ok) continue;
      const role = pick(roles);
      const name = openNames.length ? openNames.splice(randInt(0, openNames.length - 1), 1)[0] : pick(NAMES);
      const def = ROLES[role];
      game.companions.push({
        id: 'c' + Math.random().toString(36).slice(2, 9),
        name,
        role,
        state: 'wild',
        x, y,
        hp: def.hp,
        maxHp: def.hp,
        angle: Math.random() * TAU,
        fireTimer: Math.random(),
        seed: Math.random() * 10,
        shelterId: null,
        targetShelterId: null,
        hitFlash: 0
      });
    }
  }

  function teamMembers() {
    return game.companions.filter((c) => c.state === 'team' && c.hp > 0);
  }

  function residents() {
    return game.companions.filter((c) => c.state === 'shelter' && c.hp > 0);
  }

  function companionsAt(shelterId) {
    return game.companions.filter((c) => c.state === 'shelter' && c.shelterId === shelterId && c.hp > 0);
  }

  function residentAt(shelterId) {
    return companionsAt(shelterId)[0] || null;
  }

  function getActiveShelter() {
    return shelters.find((s) => s.id === game.activeShelter) || null;
  }

  function nearestShelter(x, y, includeCollapsed) {
    let best = null;
    let bd = Infinity;
    for (const s of shelters) {
      if (s.state.collapsed && !includeCollapsed) continue;
      const d = dist(x, y, s.x, s.y);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  function recruitCompanion(c) {
    if (teamMembers().length >= MAX_TEAM) {
      toast('TEAM FULL', 'Two is all you can keep alive out here.', 'warn');
      Sound.deny();
      return;
    }
    c.state = 'team';
    c.hp = Math.min(c.maxHp, c.hp + 8);
    c.x = player.x + rand(-24, 24);
    c.y = player.y + rand(20, 34);
    game.team.push(c.id);
    toast('COMPANION JOINED', `${c.name} the ${ROLES[c.role].label} falls in beside you.`, 'good');
    banner('A HAND IN THE DARK', c.name.toUpperCase(), 'Two is all you can keep.', '', 2.2);
    Sound.recruit();
    updateTeamUI(true);
  }

  function sendCompanionToShelter(c) {
    if (c.state !== 'team') return;
    const occupied = new Set(residents().map((r) => r.shelterId));
    let candidates = shelters.filter((s) => !s.state.collapsed && !occupied.has(s.id) && s.id !== game.activeShelter);
    if (!candidates.length) candidates = shelters.filter((s) => !s.state.collapsed && !occupied.has(s.id));
    if (!candidates.length) candidates = shelters.filter((s) => !s.state.collapsed);
    if (!candidates.length) {
      toast('NO SHELTER LEFT', `${c.name} has nowhere to go.`, 'alert');
      return;
    }
    candidates.sort((a, b) => dist(c.x, c.y, a.x, a.y) - dist(c.x, c.y, b.x, b.y));
    const dest = candidates[0];
    c.state = 'travel';
    c.targetShelterId = dest.id;
    c.shelterId = null;
    c.hp = Math.max(1, c.hp);
    game.team = game.team.filter((id) => id !== c.id);
    toast('SENT AHEAD', `${c.name} will hold ${dest.name} until you call.`, '');
    Sound.ui();
    updateTeamUI(true);
  }

  function recallCompanion(c) {
    if (teamMembers().length >= MAX_TEAM) {
      toast('TEAM FULL', 'Send someone away first.', 'warn');
      Sound.deny();
      return;
    }
    c.state = 'team';
    c.shelterId = null;
    c.targetShelterId = null;
    c.x = player.x + rand(-26, 26);
    c.y = player.y + rand(22, 38);
    game.team.push(c.id);
    toast('AT YOUR SIDE', `${c.name} rejoins you.`, 'good');
    Sound.recruit();
    updateTeamUI(true);
  }

  function damageCompanion(c, amount) {
    if (c.hp <= 0 || (c.invuln || 0) > 0) return;
    c.invuln = 0.38;
    c.hp = Math.max(0, c.hp - amount);
    c.hitFlash = 0.18;
    if (c.hp <= 0) {
      c.state = 'dead';
      c.shelterId = null;
      game.team = game.team.filter((id) => id !== c.id);
      spawnMist(c.x, c.y, 18, '#b6a4a0');
      toast('COMPANION LOST', `${c.name} the ${ROLES[c.role].label} is gone.`, 'alert');
      Sound.kill();
      updateTeamUI(true);
    }
  }

  /* ---------------------------------------------------------------------
     Input
  --------------------------------------------------------------------- */
  const keys = new Set();
  const joystick = { active: false, id: null, x: 0, y: 0 };

  function updateAimToMouse() {
    const wx = camera.x + (mouse.x - view.w / 2);
    const wy = camera.y + (mouse.y - view.h / 2);
    player.aim = Math.atan2(wy - player.y, wx - player.x);
  }

  function bindInput() {
    window.addEventListener('resize', resize);

    document.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    });

    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (game.mode !== 'playing') return;
      if (e.button !== 0) return;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      updateAimToMouse();
      game.firing = true;
    });
    window.addEventListener('pointerup', () => { game.firing = false; });
    window.addEventListener('blur', () => { game.firing = false; keys.clear(); });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('keydown', (e) => {
      const code = e.code;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
        if (game.mode === 'playing') e.preventDefault();
      }
      if (e.repeat) return;
      if (code === 'KeyM') { Sound.setMuted(!Sound.muted); return; }
      if (code === 'Escape') {
        if (DOM.menuScreen.classList.contains('minimized')) { expandMenu(); return; }
        if (menuIsOpen()) { closeMenu(); return; }
      }
      if (code === 'Escape' || code === 'KeyP') {
        if (game.mode === 'playing' || game.mode === 'paused') togglePause();
        return;
      }
      if (code === 'Enter') {
        if (menuIsOpen()) { startGame(); return; }
        if (game.mode === 'menu') { expandMenu(); return; }
        if (game.mode === 'dawn') beginNextDay();
        else if (game.mode === 'over') startGame();
        else if (game.mode === 'paused') resumeGame();
        return;
      }
      if (game.mode !== 'playing') return;
      if (code === 'KeyE') { doInteract(); return; }
      if (code === 'KeyR') { buyFort('repair'); return; }
      if (code === 'Space') { game.firing = true; return; }
      keys.add(code);
    });

    document.addEventListener('keyup', (e) => {
      keys.delete(e.code);
      if (e.code === 'Space') game.firing = false;
    });

    // Joystick
    const base = document.querySelector('.stick-base');
    const moveStick = (e) => {
      if (!joystick.active || e.pointerId !== joystick.id) return;
      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const max = rect.width * 0.34;
      const len = Math.hypot(dx, dy);
      if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
      joystick.x = dx / max;
      joystick.y = dy / max;
      DOM.stickNub.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    DOM.joystick.addEventListener('pointerdown', (e) => {
      joystick.active = true;
      joystick.id = e.pointerId;
      DOM.joystick.setPointerCapture(e.pointerId);
      moveStick(e);
      e.preventDefault();
    });
    DOM.joystick.addEventListener('pointermove', moveStick);
    const endStick = (e) => {
      if (joystick.id !== e.pointerId) return;
      joystick.active = false;
      joystick.id = null;
      joystick.x = 0;
      joystick.y = 0;
      DOM.stickNub.style.transform = 'translate(0px, 0px)';
    };
    DOM.joystick.addEventListener('pointerup', endStick);
    DOM.joystick.addEventListener('pointercancel', endStick);

    // Touch fire
    DOM.fireBtn.addEventListener('pointerdown', (e) => {
      if (game.mode !== 'playing') return;
      game.firing = true;
      DOM.fireBtn.classList.add('firing');
      DOM.fireBtn.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    const stopFire = () => {
      game.firing = false;
      DOM.fireBtn.classList.remove('firing');
    };
    DOM.fireBtn.addEventListener('pointerup', stopFire);
    DOM.fireBtn.addEventListener('pointercancel', stopFire);
    DOM.fireBtn.addEventListener('pointerleave', stopFire);
    DOM.useBtn.addEventListener('click', (e) => { e.preventDefault(); doInteract(); });

    // System + menu buttons
    DOM.startBtn.addEventListener('click', startGame);
    DOM.retryBtn.addEventListener('click', startGame);
    DOM.resumeBtn.addEventListener('click', resumeGame);
    DOM.pauseMenuBtn.addEventListener('click', openMenu);
    DOM.pauseRestartBtn.addEventListener('click', startGame);
    DOM.continueBtn.addEventListener('click', beginNextDay);
    DOM.pauseBtn.addEventListener('click', togglePause);
    DOM.hudMenuBtn.addEventListener('click', openMenu);
    DOM.menuMinBtn.addEventListener('click', minimizeMenu);
    DOM.menuCloseBtn.addEventListener('click', closeMenu);
    DOM.menuDock.addEventListener('click', expandMenu);
    DOM.resumeMenuBtn.addEventListener('click', closeMenu);
    DOM.shelterEnterBtn.addEventListener('click', () => {
      const s = game.panelShelter || getActiveShelter();
      if (s) toggleShelterInterior(s);
    });
    DOM.recallResidentBtn.addEventListener('click', () => {
      const s = game.panelShelter || getActiveShelter();
      const resident = s ? companionsAt(s.id)[0] : null;
      if (resident) recallCompanion(resident);
    });
    DOM.muteBtn.addEventListener('click', () => { Sound.resume(); Sound.setMuted(!Sound.muted); });
    DOM.claimBtn.addEventListener('click', () => {
      const s = game.panelShelter;
      if (s) claimShelter(s);
    });
    DOM.weaponBtn.addEventListener('click', () => buyUpgrade());
    document.querySelectorAll('#fortGrid .fort-btn').forEach((btn) => {
      btn.addEventListener('click', () => buyFort(btn.dataset.action));
    });
    DOM.teamList.addEventListener('click', (e) => {
      const btn = e.target.closest('.tc-dismiss');
      if (!btn) return;
      const c = game.companions.find((x) => x.id === btn.dataset.id);
      if (c) sendCompanionToShelter(c);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && game.mode === 'playing') togglePause();
    });
  }

  function resize() {
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    view.dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(view.w * view.dpr);
    canvas.height = Math.floor(view.h * view.dpr);
    canvas.style.width = view.w + 'px';
    canvas.style.height = view.h + 'px';
    lightCanvas.width = canvas.width;
    lightCanvas.height = canvas.height;
  }

  /* ---------------------------------------------------------------------
     Screen flow
  --------------------------------------------------------------------- */
  function hideScreens(except) {
    [DOM.menuScreen, DOM.pauseScreen, DOM.dawnScreen, DOM.gameoverScreen].forEach((el) => {
      if (el !== except) el.classList.add('hidden');
    });
    if (except !== DOM.menuScreen) DOM.menuDock.classList.add('hidden');
  }

  function menuIsOpen() {
    return !DOM.menuScreen.classList.contains('hidden') && !DOM.menuScreen.classList.contains('minimized');
  }

  function syncMenuButtons() {
    const canResume = game.runActive && (game.mode === 'paused' || game.mode === 'playing' || game.mode === 'dying' || game.mode === 'dawn');
    DOM.resumeMenuBtn.hidden = !canResume;
    setText(DOM.startBtn, game.runActive ? 'New Run' : 'Start Game');
    setText(DOM.menuDockLabel, game.runActive ? 'NIGHTFALL // PAUSED' : 'NIGHTFALL');
    DOM.insideBanner.hidden = !game.inShelter;
  }

  function openMenu() {
    if (game.mode === 'dying' || game.mode === 'over') return;
    if (game.mode === 'playing') {
      game.mode = 'paused';
      game.firing = false;
      Sound.ui();
    }
    if (game.mode === 'menu') game.menuResume = false;
    DOM.pauseScreen.classList.add('hidden');
    DOM.kitScreen.classList.add('hidden');
    DOM.menuScreen.classList.remove('hidden', 'minimized');
    DOM.menuDock.classList.add('hidden');
    DOM.hud.classList.add('dim');
    syncMenuButtons();
    Sound.resume();
    Sound.ui();
  }

  function closeMenu() {
    if (DOM.menuScreen.classList.contains('hidden')) return;
    DOM.menuScreen.classList.add('hidden');
    DOM.menuScreen.classList.remove('minimized');
    DOM.menuDock.classList.add('hidden');
    if (game.mode === 'paused') {
      resumeGame();
    } else if (game.mode === 'menu') {
      DOM.menuDock.classList.remove('hidden');
      syncMenuButtons();
    }
  }

  function minimizeMenu() {
    DOM.menuScreen.classList.add('minimized');
    DOM.menuDock.classList.remove('hidden');
    DOM.hud.classList.add('dim');
    syncMenuButtons();
    Sound.ui();
  }

  function expandMenu() {
    if (game.mode === 'dawn' || game.mode === 'over' || game.mode === 'dying') return;
    DOM.menuScreen.classList.remove('hidden', 'minimized');
    DOM.menuDock.classList.add('hidden');
    DOM.pauseScreen.classList.add('hidden');
    syncMenuButtons();
    Sound.ui();
  }

  function startGame() {
    Sound.init();
    Sound.resume();
    keys.clear();
    resetRun();
    hideScreens();
    DOM.menuScreen.classList.remove('minimized');
    DOM.menuDock.classList.add('hidden');
    DOM.insideBanner.hidden = true;
    DOM.hud.classList.add('visible');
    DOM.hud.classList.remove('dim');
    DOM.crosshair.classList.add('active');
    game.mode = 'playing';
    game.phase = 'day';
    game.phaseTime = 0;
    game.phaseDuration = DAY_DURATION;
    game.health = game.maxHealth;
    banner('DAY 1 · SITE-19', 'THE VALLEY WAKES', 'Gather. Claim a shelter. Get inside before dark.', '', 3);
    toast('CONTAINMENT FAILED', 'Six safehouses stand in this chapter. They will not stay fresh forever.', 'good');
    setTimeout(() => {
      if (game.mode === 'playing') toast('THE RULE', 'Never sleep in the same shelter twice unless you must.', 'warn');
    }, 4200);
    setTimeout(() => {
      if (game.mode === 'playing') toast('SURVIVORS', 'Two can walk with you. The rest can hold a shelter — and they can still die there.', '');
    }, 8800);
    Sound.setMuted(Sound.muted);
    updateTeamUI(true);
  }

  function togglePause() {
    if (menuIsOpen()) return;
    if (game.mode === 'playing') {
      game.mode = 'paused';
      game.firing = false;
      DOM.hud.classList.add('dim');
      DOM.pauseScreen.classList.remove('hidden');
      Sound.ui();
    } else if (game.mode === 'paused') {
      resumeGame();
    }
  }

  function resumeGame() {
    if (game.mode !== 'paused') return;
    game.mode = 'playing';
    DOM.hud.classList.remove('dim');
    DOM.pauseScreen.classList.add('hidden');
    Sound.resume();
  }

  function enterDusk() {
    if (game.mode !== 'playing') return;
    game.phase = 'dusk';
    game.phaseTime = 0;
    game.phaseDuration = DUSK_DURATION;
    banner('DUSK', 'THE LIGHT FAILS', 'Get behind a barricade. They come with the dark.', 'dusk', 2.6);
    toast('DUSK', 'Nightfall is close.', 'warn');
    Sound.setNight(true);
  }

  function enterNight() {
    if (game.mode !== 'playing') return;
    game.phase = 'night';
    game.phaseTime = 0;
    game.nightDuration = Math.round(NIGHT_BASE + Math.min(28, (game.day - 1) * 3.2) + (game.chapter - 1) * 4);
    game.phaseDuration = game.nightDuration;
    game.nightKills = 0;
    game.spawnTimer = 2.4;
    game.queueTimer = 0.1;
    const active = getActiveShelter();
    if (active) active.state.breached = active.state.integrity <= 0;
    const haunt = active ? active.state.haunt : 0;
    const spawnMod = active ? active.mod.spawn : 1.12;
    game.spawnQueue = Math.round((4 + game.day * 2 + haunt * 2 + (game.chapter - 1) * 2) * spawnMod);
    game.trickle = Math.max(1.45, 4.7 - game.day * 0.24 - haunt * 0.38);
    spawnResidentRaids();
    banner('NIGHTFALL', 'THEY ARE COMING', active ? `Hold ${active.name} until dawn.` : 'You have no shelter. Keep moving.', 'night', 3.2);
    if (!active) toast('NO SHELTER', 'They will come for you directly. Run. Shoot. Survive.', 'alert');
    else if (haunt >= 2) toast('REMEMBERED GROUND', `${active.name} knows your scent. They are already close.`, 'alert');
    Sound.night();
    Sound.setNight(true);
    game.shake = Math.max(game.shake, 5);
  }

  function endNight() {
    if (game.mode !== 'playing') return;
    showDawn();
  }

  function showDawn() {
    game.mode = 'dawn';
    game.phase = 'dawn';
    game.phaseTime = 0;
    game.phaseDuration = 9;
    game.dawnTimer = 9;
    game.firing = false;
    game.nightsHeld++;
    if (game.nightsHeld > game.best) {
      game.best = game.nightsHeld;
      saveBest(game.best);
    }
    const active = getActiveShelter();
    if (active) active.state.haunt++;
    game.health = Math.min(game.maxHealth, game.health + 18);
    for (const c of game.companions) {
      if (c.state === 'team' || c.state === 'shelter') c.hp = Math.min(c.maxHp, c.hp + 16);
    }
    for (const e of game.enemies) spawnMist(e.x, e.y, 5, '#6d5b68');
    game.enemies.length = 0;
    game.projectiles.length = 0;
    game.bullets.length = 0;
    game.spawnQueue = 0;
    DOM.hud.classList.add('dim');
    const pct = active ? Math.round((active.state.integrity / active.state.maxIntegrity) * 100) : 0;
    setText(DOM.dawnNight, String(game.day));
    setText(DOM.dawnKills, String(game.nightKills));
    setText(DOM.dawnBarricade, pct + '%');
    setText(DOM.dawnHealth, String(Math.ceil(game.health)));
    const advice = active && active.state.haunt >= 2
      ? 'The dark remembers this place. Break camp. Find fresh ground.'
      : active && active.state.haunt === 1
        ? 'They have tasted this ground. Move on before they remember it better.'
        : 'A fresh shelter keeps the dark weak.';
    setText(DOM.dawnAdvice, advice);
    setText(DOM.dawnTitle, game.health > 35 ? 'Dawn breaks.' : 'You crawl into the light.');
    setText(DOM.dawnText, `Night ${game.day} is over. The valley is quiet again — but not for long.`);
    setText(DOM.dawnCountdown, '9');
    DOM.dawnScreen.classList.remove('hidden');
    DOM.crosshair.classList.remove('active');
    flash(DOM.healFlash, 0.65, 900);
    Sound.dawn();
    Sound.setNight(false);
    updateBestBadges();
  }

  function beginNextDay() {
    if (game.mode !== 'dawn') return;
    DOM.dawnScreen.classList.add('hidden');
    DOM.hud.classList.remove('dim');
    game.mode = 'playing';
    game.day++;
    game.phase = 'day';
    game.phaseTime = 0;
    game.phaseDuration = DAY_DURATION;
    game.health = Math.min(game.maxHealth, game.health + 22);
    resetNodes();
    game.enemies.length = 0;
    game.projectiles.length = 0;
    game.bullets.length = 0;
    DOM.crosshair.classList.add('active');
    if (game.nightsHeld > 0 && game.nightsHeld % CHAPTER_NIGHTS === 0) {
      advanceChapter();
    } else {
      banner(`DAY ${game.day}`, 'THE SUN RETURNS', 'Scavenge. Fortify. Choose a different roof.', '', 2.7);
      toast('DAYBREAK', `Night ${game.day - 1} survived. The shelters remember.`, 'good');
    }
    Sound.dawn();
    updateTeamUI(true);
  }

  function advanceChapter() {
    game.chapter = Math.min(CHAPTERS.length, game.chapter + 1);
    for (const s of shelters) {
      if (!s.state.collapsed) s.state.haunt = 0;
      s.state.breached = false;
    }
    let collapsed = null;
    const available = shelters.filter((s) => !s.state.collapsed);
    if (available.length > 4) {
      const eligible = available.filter((s) => s.id !== game.activeShelter && !residentAt(s.id));
      if (eligible.length) {
        collapsed = pick(eligible);
        collapsed.state.collapsed = true;
        collapsed.state.owned = false;
        collapsed.state.integrity = 0;
      }
    }
    const wildCount = game.companions.filter((c) => c.state === 'wild').length;
    if (wildCount < 2) spawnWildCompanions(2);
    const title = CHAPTERS[game.chapter - 1].name;
    banner(`CHAPTER ${roman(game.chapter)}`, title, 'The map is smaller now. The dark is older.', 'night', 3.6);
    if (collapsed) toast('SHELTER LOST', `${collapsed.name} has caved in. Fewer roofs. Harder nights.`, 'alert');
    toast('NEW CHAPTER', 'Old haunts have cooled, but every shelter is now precious.', 'warn');
    Sound.night();
    updateTeamUI(true);
  }

  function die() {
    if (game.mode !== 'playing') return;
    game.mode = 'dying';
    game.dyingTimer = 1.05;
    game.health = 0;
    game.firing = false;
    DOM.hud.classList.add('dim');
    DOM.crosshair.classList.remove('active');
    game.shake = 20;
    flash(DOM.damageFlash, 1, 1200);
    Sound.breach();
    Sound.hurt();
  }

  function finishDeath() {
    game.mode = 'over';
    if (game.nightsHeld > game.best) {
      game.best = game.nightsHeld;
      saveBest(game.best);
    }
    const killed = game.kills;
    setText(DOM.deathText, `They found you on night ${game.day}. The valley keeps what it takes.`);
    setText(DOM.deathDays, String(game.day));
    setText(DOM.deathNights, String(game.nightsHeld));
    setText(DOM.deathKills, String(killed));
    setText(DOM.deathBest, String(game.best));
    const advice = game.nightsHeld < 2
      ? 'Stay light. Move at first light. Never let them learn one place too well.'
      : game.chapter > 1
        ? 'Fewer shelters means harder choices. Send companions ahead to hold the ones you cannot.'
        : 'A remembered shelter draws more of them. Break camp before the sun is high.';
    setText(DOM.deathAdvice, advice);
    DOM.gameoverScreen.classList.remove('hidden');
    updateBestBadges();
    updateTeamUI(true);
  }

  /* ---------------------------------------------------------------------
     Phase + player update
  --------------------------------------------------------------------- */
  function updatePhase(dt) {
    game.phaseTime += dt;
    if (game.phase === 'day') {
      if (game.phaseTime >= DAY_DURATION) enterDusk();
    } else if (game.phase === 'dusk') {
      if (game.phaseTime >= DUSK_DURATION) enterNight();
    } else if (game.phase === 'night') {
      if (game.phaseTime >= game.nightDuration) endNight();
    }
  }

  function updatePlayer(dt) {
    game.cooldown = Math.max(0, game.cooldown - dt);
    game.muzzle = Math.max(0, game.muzzle - dt);
    player.invuln = Math.max(0, player.invuln - dt);
    player.hitFlash = Math.max(0, player.hitFlash - dt);

    let ix = 0;
    let iy = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) iy -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) iy += 1;
    ix += joystick.x;
    iy += joystick.y;
    const inside = game.inShelter ? getActiveShelter() : null;
    if (inside) { ix = 0; iy = 0; }
    const len = Math.hypot(ix, iy);
    if (len > 1) { ix /= len; iy /= len; }
    player.moving = len > 0.08;
    const active = getActiveShelter();
    const speedMod = active && dist(player.x, player.y, active.x, active.y) < active.radius + 30
      ? (active.id === 'farm' ? 1.02 : 1)
      : 1;
    player.x = clamp(player.x + ix * player.speed * speedMod * dt, 34, WORLD.w - 34);
    player.y = clamp(player.y + iy * player.speed * speedMod * dt, 34, WORLD.h - 34);
    if (inside) {
      player.x = inside.x;
      player.y = inside.y + 8;
    }
    if (player.moving) player.walk += dt * 9.5;

    if (touchMode) {
      if (game.firing) {
        const target = nearestEnemy(player.x, player.y, 900);
        if (target) player.aim = Math.atan2(target.y - player.y, target.x - player.x);
      }
    } else if (mouse.active) {
      updateAimToMouse();
    }

    if (game.phase === 'day' && game.health < game.maxHealth) {
      game.health = Math.min(game.maxHealth, game.health + 2.6 * dt);
    }

    if (game.firing && game.cooldown <= 0) shoot();
  }

  /* ---------------------------------------------------------------------
     Interaction
  --------------------------------------------------------------------- */
  function updateInteraction() {
    let bestShelter = null;
    let bestShelterDist = Infinity;
    for (const s of shelters) {
      if (s.state.collapsed) continue;
      const d = dist(player.x, player.y, s.x, s.y);
      if (d < s.radius + 155 && d < bestShelterDist) { bestShelter = s; bestShelterDist = d; }
    }
    game.panelShelter = bestShelter;

    let prompt = null;
    const inside = game.inShelter ? getActiveShelter() : null;
    if (game.inShelter && (!inside || inside.state.integrity <= 0)) {
      game.inShelter = null;
      DOM.insideBanner.hidden = true;
    }
    if (game.inShelter) {
      prompt = { kind: 'shelter', target: inside, action: 'leave', text: `Leave ${inside.name}`, d: -1 };
    }

    if (!game.inShelter) {
      let node = null;
      let nodeDist = Infinity;
      for (const n of resourceNodes) {
        if (n.uses <= 0 || n.respawn > 0) continue;
        const d = dist(player.x, player.y, n.x, n.y);
        if (d < 78 && d < nodeDist) { node = n; nodeDist = d; }
      }

      let wild = null;
      let wildDist = Infinity;
      for (const c of game.companions) {
        if (c.state !== 'wild') continue;
        const d = dist(player.x, player.y, c.x, c.y);
        if (d < 82 && d < wildDist) { wild = c; wildDist = d; }
      }

      if (wild) prompt = { kind: 'recruit', target: wild, action: 'recruit', text: `Recruit ${wild.name} · ${ROLES[wild.role].label}`, d: wildDist };
      if (node && (!prompt || nodeDist < prompt.d)) prompt = { kind: 'node', target: node, action: 'gather', text: `Gather ${node.type}`, d: nodeDist };
      if (bestShelter) {
        let action = null;
        let text = '';
        if (!bestShelter.state.owned) {
          action = 'claim';
          text = `Claim ${bestShelter.name}`;
        } else if (game.activeShelter !== bestShelter.id) {
          action = 'camp';
          text = `Make camp at ${bestShelter.name}`;
        } else {
          action = 'enter';
          text = `Enter ${bestShelter.name}`;
        }
        if (action) {
          const d = Math.max(0, bestShelterDist - bestShelter.radius);
          if (!prompt || d < prompt.d) prompt = { kind: 'shelter', target: bestShelter, action, text, d };
        }
      }
    }
    game.prompt = prompt;
    if (prompt) {
      DOM.interactPrompt.hidden = false;
      setText(DOM.interactText, prompt.text);
    } else {
      DOM.interactPrompt.hidden = true;
    }
  }

  function doInteract() {
    if (game.mode !== 'playing') return;
    const p = game.prompt;
    if (!p) return;
    if (p.action === 'gather') gatherNode(p.target);
    else if (p.action === 'recruit') {
      const c = p.target;
      if (c.state !== 'wild') return;
      if (dist(player.x, player.y, c.x, c.y) > 100) return;
      recruitCompanion(c);
    } else if (p.action === 'claim' || p.action === 'camp') {
      claimShelter(p.target);
    } else if (p.action === 'enter') {
      toggleShelterInterior(p.target);
    } else if (p.action === 'leave') {
      leaveShelter(p.target);
    } else if (p.action === 'recall') {
      const resident = companionsAt(p.target.id)[0];
      if (resident) recallCompanion(resident);
    }
  }

  function gatherNode(n) {
    const amount = n.type === 'wood' ? randInt(2, 3) : n.type === 'stone' ? randInt(2, 3) : randInt(1, 2);
    game.resources[n.type] = (game.resources[n.type] || 0) + amount;
    n.uses--;
    if (n.uses <= 0) n.respawn = 32;
    const color = n.type === 'wood' ? '#b07a47' : n.type === 'stone' ? '#9aa1a0' : '#7fb2a5';
    addText(n.x, n.y - 18, `+${amount} ${n.type.toUpperCase()}`, color);
    spawnSparks(n.x, n.y, 5, color, 1.3);
    Sound.gather();
  }

  function enterShelter(s) {
    const st = s.state;
    if (!st.owned || game.activeShelter !== s.id) {
      toast('NOT YOUR SHELTER', 'Claim it before you hide inside.', 'warn');
      Sound.deny();
      return;
    }
    if (st.integrity <= 0) {
      toast('WALLS BREACHED', 'There is nothing left between you and them.', 'alert');
      Sound.deny();
      return;
    }
    game.inShelter = s.id;
    game.firing = false;
    player.x = s.x;
    player.y = s.y + 8;
    player.invuln = Math.max(player.invuln, 0.6);
    game.prompt = null;
    DOM.insideBanner.hidden = false;
    setText(DOM.insideBannerName, s.name);
    toast('INSIDE', `${s.name} is between you and the dark. Keep the walls standing.`, 'good');
    banner('SHELTER', 'DOORS BARRED', 'The barricade takes the hits now — unless the walls fall.', '', 2.2);
    Sound.claim();
    spawnSparks(s.x, s.y + 20, 10, '#e7b36a', 1.2);
    updateInteraction();
  }

  function leaveShelter(s) {
    if (!s) return;
    game.inShelter = null;
    player.x = s.x;
    player.y = s.y + s.radius + 34;
    player.invuln = Math.max(player.invuln, 0.45);
    game.prompt = null;
    DOM.insideBanner.hidden = true;
    toast('OUTSIDE', 'The night air is colder than you remember.', '');
    Sound.ui();
    updateInteraction();
  }

  function toggleShelterInterior(s) {
    if (game.mode !== 'playing' || !s) return;
    if (game.inShelter === s.id) { leaveShelter(s); return; }
    if (game.inShelter && game.inShelter !== s.id) leaveShelter(getActiveShelter());
    if (s.id !== game.activeShelter || !s.state.owned) {
      toast('NOT YOUR SHELTER', 'Claim it and make camp before you go inside.', 'warn');
      Sound.deny();
      return;
    }
    if (dist(player.x, player.y, s.x, s.y) > s.radius + 70) {
      toast('TOO FAR', `Move closer to ${s.name}.`, 'warn');
      Sound.deny();
      return;
    }
    enterShelter(s);
  }

  function claimShelter(s) {
    if (game.mode !== 'playing' || s.state.collapsed) return;
    const st = s.state;
    if (!st.owned) {
      st.owned = true;
      st.integrity = st.maxIntegrity;
      toast('SHELTER CLAIMED', `${s.name} is yours. Build it up before dark.`, 'good');
      Sound.claim();
    } else if (game.activeShelter !== s.id) {
      st.integrity = Math.max(st.integrity, Math.round(st.maxIntegrity * 0.5));
      toast('CAMP MOVED', `You return to ${s.name}. The walls are patched, not whole.`, '');
      Sound.claim();
    }
    game.activeShelter = s.id;
    st.breached = st.integrity <= 0;
    if (game.inShelter && game.inShelter !== s.id) {
      game.inShelter = null;
      DOM.insideBanner.hidden = true;
    }
    if (st.haunt >= 2) {
      toast('REMEMBERED GROUND', `${s.name} has hosted you too often. The dark is waiting.`, 'alert');
    } else if (st.haunt === 1) {
      toast('WATCHED GROUND', `${s.name} has been used once. Expect company.`, 'warn');
    }
    spawnSparks(s.x, s.y + 30, 14, '#efb661', 2);
    updateTeamUI(true);
  }

  function buyFort(action) {
    const s = game.panelShelter;
    if (game.mode !== 'playing' || !s) return;
    const st = s.state;
    if (!st.owned || game.activeShelter !== s.id) {
      toast('NOT YOUR SHELTER', 'Claim it before you fortify it.', 'warn');
      Sound.deny();
      return;
    }
    const fail = () => { Sound.deny(); flash(DOM.damageFlash, 0.18, 180); };
    if (action === 'fortify') {
      if (game.resources.wood < 3) { toast('NOT ENOUGH WOOD', 'Barricade needs 3 wood.', 'warn'); return fail(); }
      if (st.maxIntegrity >= 360 && st.integrity >= st.maxIntegrity) { toast('FULLY FORTIFIED', 'There is no more wall to build.', 'warn'); return fail(); }
      game.resources.wood -= 3;
      st.maxIntegrity = Math.min(360, st.maxIntegrity + 20);
      st.integrity = Math.min(st.maxIntegrity, st.integrity + 80);
      toast('BARRICADE', `+80 integrity · ${Math.ceil(st.integrity)} / ${st.maxIntegrity}`, 'good');
      Sound.claim();
    } else if (action === 'reinforce') {
      if (game.resources.stone < 3) { toast('NOT ENOUGH STONE', 'Reinforcement needs 3 stone.', 'warn'); return fail(); }
      if (st.armor >= 0.6) { toast('ARMOR MAXED', 'The walls are as braced as they get.', 'warn'); return fail(); }
      game.resources.stone -= 3;
      st.armor = Math.min(0.6, st.armor + 0.1);
      toast('REINFORCED', `Armor now ${Math.round(st.armor * 100)}%.`, 'good');
      Sound.claim();
    } else if (action === 'traps') {
      if (game.resources.scrap < 4) { toast('NOT ENOUGH SCRAP', 'The spike ring needs 4 scrap.', 'warn'); return fail(); }
      if (st.traps >= 45) { toast('TRAPS MAXED', 'The ring is already a hedge of iron.', 'warn'); return fail(); }
      game.resources.scrap -= 4;
      st.traps = Math.min(45, st.traps + 9);
      toast('SPIKE RING', `${st.traps} damage per second at the wall.`, 'good');
      Sound.claim();
    } else if (action === 'repair') {
      if (game.resources.wood < 2) { toast('NOT ENOUGH WOOD', 'Repairs need 2 wood.', 'warn'); return fail(); }
      if (st.integrity >= st.maxIntegrity) { toast('NO REPAIRS NEEDED', 'The barricade is whole.', 'warn'); return fail(); }
      game.resources.wood -= 2;
      st.integrity = Math.min(st.maxIntegrity, st.integrity + 90);
      toast('PATCHED', `Barricade restored to ${Math.ceil(st.integrity)}.`, 'good');
      Sound.claim();
    }
    spawnSparks(s.x, s.y + 22, 10, '#efb661', 1.5);
    updateTeamUI(true);
  }

  function buyUpgrade() {
    if (game.mode !== 'playing') return;
    const cost = 8 + (game.weaponTier - 1) * 6;
    if (game.weaponTier >= WEAPONS.length) {
      toast('REVOLVER MAXED', 'Mk IV is as far as this iron goes.', 'warn');
      Sound.deny();
      return;
    }
    if (game.resources.scrap < cost) {
      toast('NOT ENOUGH SCRAP', `Mk ${roman(game.weaponTier + 1)} needs ${cost} scrap.`, 'warn');
      Sound.deny();
      return;
    }
    game.resources.scrap -= cost;
    game.weaponTier++;
    toast('REVOLVER UPGRADED', `${WEAPONS[game.weaponTier - 1].short} — harder hits, faster hands.`, 'good');
    Sound.claim();
    spawnSparks(player.x, player.y, 12, '#7fb2a5', 1.6);
  }

  /* ---------------------------------------------------------------------
     Particles + floating text
  --------------------------------------------------------------------- */
  function addParticle(p) {
    if (game.particles.length > 420) game.particles.shift();
    game.particles.push(p);
  }

  function spawnMist(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const s = rand(10, 55);
      addParticle({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rand(0.45, 1.15),
        max: 1.15,
        r: rand(2.5, 7),
        color: color || '#4b3947',
        drag: 2.2,
        type: 'mist'
      });
    }
  }

  function spawnSparks(x, y, n, color, scale) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const s = rand(25, 130) * (scale || 1);
      addParticle({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rand(0.2, 0.55),
        max: 0.55,
        r: rand(1, 2.6),
        color: color || '#efb661',
        drag: 3.2,
        gravity: 100,
        type: 'spark'
      });
    }
  }

  function addText(x, y, text, color) {
    if (game.texts.length > 40) game.texts.shift();
    game.texts.push({ x, y, text, color: color || '#efe4cf', life: 1.1, max: 1.1 });
  }

  function emitFireEmbers(dt) {
    game.fireTimer -= dt;
    if (game.fireTimer > 0) return;
    game.fireTimer = 0.08;
    for (const s of shelters) {
      if (s.state.collapsed) continue;
      if (dist(camera.x, camera.y, s.x, s.y) > Math.max(view.w, view.h) * 0.75) continue;
      if (!s.state.owned && s.id !== game.activeShelter) continue;
      addParticle({
        x: s.x + rand(-7, 7),
        y: s.y + 36 + rand(-3, 3),
        vx: rand(-7, 7),
        vy: rand(-36, -60),
        life: rand(0.45, 1.1),
        max: 1.1,
        r: rand(1, 2.8),
        color: Math.random() < 0.35 ? '#ffd08a' : '#e78c3f',
        drag: 0.4,
        type: 'ember'
      });
    }
  }

  function updateParticles(dt) {
    for (let i = game.particles.length - 1; i >= 0; i--) {
      const p = game.particles[i];
      p.life -= dt;
      if (p.life <= 0) { game.particles.splice(i, 1); continue; }
      if (p.drag) {
        const d = Math.max(0, 1 - p.drag * dt);
        p.vx *= d;
        p.vy *= d;
      }
      if (p.gravity) p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === 'mist') p.r += dt * 2.5;
    }
    for (let i = game.texts.length - 1; i >= 0; i--) {
      const t = game.texts[i];
      t.life -= dt;
      t.y -= dt * 25;
      if (t.life <= 0) game.texts.splice(i, 1);
    }
  }

  /* ---------------------------------------------------------------------
     Shooting
  --------------------------------------------------------------------- */
  function nearestEnemy(x, y, range) {
    let best = null;
    let bd = range || Infinity;
    for (const e of game.enemies) {
      if (e.dead) continue;
      const d = dist(x, y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function shoot() {
    const w = WEAPONS[game.weaponTier - 1];
    const active = getActiveShelter();
    const dmgMult = active ? active.mod.dmg : 1;
    const spread = (0.03 - game.weaponTier * 0.004) * (player.moving ? 1.8 : 1);
    const a = player.aim + (Math.random() - 0.5) * spread;
    const bx = player.x + Math.cos(a) * 23;
    const by = player.y + Math.sin(a) * 23;
    game.bullets.push({
      x: bx, y: by, px: bx, py: by,
      vx: Math.cos(a) * w.speed,
      vy: Math.sin(a) * w.speed,
      life: 0.92,
      dmg: w.dmg * dmgMult,
      owner: 'player'
    });
    game.cooldown = w.rate;
    game.muzzle = 0.07;
    game.shake = Math.max(game.shake, 2.4);
    spawnSparks(bx, by, 2, '#ffd490', 0.55);
    Sound.shoot(game.weaponTier);
  }

  function companionShoot(c, target) {
    if (!target || c.fireTimer > 0) return;
    const def = ROLES[c.role];
    const a = Math.atan2(target.y - c.y, target.x - c.x);
    c.angle = a;
    const bx = c.x + Math.cos(a) * 17;
    const by = c.y + Math.sin(a) * 17;
    game.bullets.push({
      x: bx, y: by, px: bx, py: by,
      vx: Math.cos(a) * 980,
      vy: Math.sin(a) * 980,
      life: 0.8,
      dmg: def.dmg,
      owner: c.id
    });
    c.fireTimer = def.rate * rand(0.85, 1.15);
    spawnSparks(bx, by, 1, '#dff0de', 0.5);
  }

  function updateBullets(dt) {
    for (let i = game.bullets.length - 1; i >= 0; i--) {
      const b = game.bullets[i];
      b.life -= dt;
      if (b.life <= 0) { game.bullets.splice(i, 1); continue; }
      b.px = b.x;
      b.py = b.y;
      const nx = b.x + b.vx * dt;
      const ny = b.y + b.vy * dt;
      let hit = null;
      for (const e of game.enemies) {
        if (e.dead) continue;
        if (pointSegDist(e.x, e.y, b.x, b.y, nx, ny) < e.r + 3) { hit = e; break; }
      }
      b.x = nx;
      b.y = ny;
      if (hit) {
        damageEnemy(hit, b.dmg, b.vx, b.vy);
        game.bullets.splice(i, 1);
        continue;
      }
      if (b.x < 20 || b.x > WORLD.w - 20 || b.y < 20 || b.y > WORLD.h - 20) game.bullets.splice(i, 1);
    }
  }

  function damageEnemy(e, dmg, vx, vy) {
    if (e.dead) return;
    // Concrete does not care about bullets, but a frozen SCP-173 is a still target.
    if (e.type === 'statue' && e.frozen) dmg *= 0.72;
    e.hp -= dmg;
    e.hitFlash = 0.13;
    e.lastHit = game.time;
    const m = Math.hypot(vx || 1, vy || 1) || 1;
    e.x += ((vx || 1) / m) * 4;
    e.y += ((vy || 1) / m) * 4;
    spawnMist(e.x, e.y, e.type === 'reptile' ? 5 : 3, '#6c4650');
    Sound.hit();
    if (e.hp <= 0) killEnemy(e);
  }

  function killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    game.kills++;
    game.nightKills++;
    spawnMist(e.x, e.y, e.type === 'reptile' ? 26 : 12, '#5b3c49');
    spawnSparks(e.x, e.y, 6, e.type === 'oldman' ? '#9bff8a' : e.type === 'statue' ? '#c9c4b2' : '#d5533f', 1.1);
    game.shake = Math.max(game.shake, e.type === 'reptile' ? 8 : 2.5);
    Sound.kill();
    // The fallen are salvage: sometimes iron, sometimes timber or stone.
    if (Math.random() < (e.type === 'reptile' ? 0.85 : 0.4)) {
      const roll = Math.random();
      const type = roll < 0.42 ? 'scrap' : roll < 0.72 ? 'wood' : 'stone';
      const count = e.type === 'reptile' ? 3 : 1;
      game.resources[type] += count;
      const color = type === 'wood' ? '#b07a47' : type === 'stone' ? '#9aa1a0' : '#7fb2a5';
      addText(e.x, e.y - 20, `+${count} ${type.toUpperCase()}`, color);
    }
  }

  /* ---------------------------------------------------------------------
     Enemies
  --------------------------------------------------------------------- */
  function pickEnemyType() {
    const r = Math.random();
    const day = game.day + (game.chapter - 1) * 3;
    if (day >= 6 && r < 0.055) return 'reptile';
    if (day >= 4 && r < 0.15) return 'oldman';
    if (day >= 3 && r < 0.27) return 'doctor';
    if (day >= 2 && r < 0.41) return 'shyguy';
    if (day >= 2 && r < 0.56) return 'voice';
    if (r < 0.76) return 'statue';
    return 'flesh';
  }

  function isObserved(e, cone, range) {
    if (game.mode !== 'playing') return false;
    const d = dist(player.x, player.y, e.x, e.y);
    if (d > range) return false;
    let da = Math.atan2(e.y - player.y, e.x - player.x) - player.aim;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    return Math.abs(da) < cone;
  }

  function makeEnemy(type, x, y, raidShelterId) {
    const def = ENEMY_TYPES[type];
    const scale = 1 + (game.day - 1) * 0.19 + (game.chapter - 1) * 0.28;
    return {
      type,
      kind: def.kind,
      x, y,
      r: def.r,
      hp: def.hp * scale,
      maxHp: def.hp * scale,
      speed: def.speed + (game.day - 1) * 1.2 + (game.chapter - 1) * 3,
      dmg: def.dmg + (game.day - 1) * 0.55 + (game.chapter - 1) * 1.2,
      atk: def.atk,
      wall: def.wall,
      ranged: !!def.ranged,
      raidShelterId: raidShelterId || null,
      prefersCompanions: Math.random() < 0.34,
      atkTimer: rand(0.2, 0.9),
      fireTimer: rand(0.8, 2.4),
      observe: 0,
      enraged: false,
      frozen: false,
      lastHit: -99,
      packBoost: 0,
      healPulse: 0,
      phaseGlow: 0,
      regenGlow: 0,
      roar: 0,
      healTimer: rand(0.5, 1.6),
      phaseTimer: rand(2.2, 4.2),
      hitFlash: 0,
      dead: false,
      seed: Math.random() * 10,
      angle: Math.random() * TAU,
      mode: 'player'
    };
  }

  function spawnEnemyAround(center, raidShelterId) {
    let a = Math.random() * TAU;
    let radius = rand(520, 790);
    let x = clamp(center.x + Math.cos(a) * radius, 60, WORLD.w - 60);
    let y = clamp(center.y + Math.sin(a) * radius, 60, WORLD.h - 60);
    if (dist(x, y, player.x, player.y) < 300) {
      x = clamp(x + Math.cos(a) * 280, 60, WORLD.w - 60);
      y = clamp(y + Math.sin(a) * 280, 60, WORLD.h - 60);
    }
    const type = pickEnemyType();
    const e = makeEnemy(type, x, y, raidShelterId);
    game.enemies.push(e);
    spawnMist(x, y, 8, '#4b3947');
    if (!game.seenScp.includes(type)) {
      game.seenScp.push(type);
      const def = ENEMY_TYPES[type];
      toast(`${def.scp} DETECTED`, def.entry, 'alert');
      addText(x, y - 34, def.scp, '#f08b72');
    }
    return e;
  }

  function spawnResidentRaids() {
    const day = game.day;
    for (const c of residents()) {
      const s = shelters.find((x) => x.id === c.shelterId);
      if (!s || s.state.collapsed) continue;
      const count = 1 + Math.floor((day + game.chapter - 1) / 4);
      for (let i = 0; i < count; i++) {
        spawnEnemyAround(s, s.id);
      }
      if (dist(player.x, player.y, s.x, s.y) < 900) {
        toast('COMPANION IN DANGER', `${c.name} is holding ${s.name} alone.`, 'warn');
      }
    }
  }

  function updateSpawning(dt) {
    // Daylight belongs to scavenging. The dark only comes out after dusk.
    if (game.phase !== 'night') return;
    if (game.spawnQueue > 0) {
      game.queueTimer -= dt;
      if (game.queueTimer <= 0) {
        const active = getActiveShelter();
        const center = active && dist(player.x, player.y, active.x, active.y) < 560 ? active : player;
        spawnEnemyAround(center);
        game.spawnQueue--;
        game.queueTimer = 0.3;
      }
    }
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0) {
      const cap = 18 + game.day * 2 + game.chapter * 2;
      if (game.enemies.length < cap) {
        const active = getActiveShelter();
        const center = active && dist(player.x, player.y, active.x, active.y) < 560 ? active : player;
        spawnEnemyAround(center);
        if (Math.random() < 0.28) spawnEnemyAround(center);
      }
      game.spawnTimer = game.trickle * rand(0.72, 1.25);
    }
  }

  function damagePlayer(amount) {
    if (game.mode !== 'playing' || player.invuln > 0) return;
    if (game.inShelter) {
      const s = getActiveShelter();
      amount *= s && s.state.integrity > 0 ? 0.22 : 0.7;
    }
    game.health = Math.max(0, game.health - amount);
    player.invuln = 0.48;
    player.hitFlash = 0.24;
    game.shake = Math.max(game.shake, 9);
    flash(DOM.damageFlash, 0.9, 520);
    Sound.hurt();
    spawnSparks(player.x, player.y, 6, '#d5533f', 1.2);
    if (game.health <= 0) die();
  }

  function damageShelter(s, amount, hx, hy) {
    const st = s.state;
    if (!st.owned) return;
    st.integrity = Math.max(0, st.integrity - amount);
    st.hit = 0.18;
    spawnSparks(hx || s.x, hy || s.y, 4, '#b07a47', 0.8);
    game.shake = Math.max(game.shake, 1.8);
    Sound.hit();
    if (st.integrity <= 0 && !st.breached) {
      st.breached = true;
      toast('BARRICADE BREACHED', `${s.name}'s walls are open. They are inside.`, 'alert');
      banner('THE WALLS FALL', 'FIGHT IN THE OPEN', 'They are through.', 'night', 2.2);
      game.shake = 16;
      Sound.breach();
    }
  }

  function spawnEnemyProjectile(e, target) {
    const a = Math.atan2(target.y - e.y, target.x - e.x);
    game.projectiles.push({
      x: e.x + Math.cos(a) * 16,
      y: e.y + Math.sin(a) * 16,
      vx: Math.cos(a) * 235,
      vy: Math.sin(a) * 235,
      life: 3.4,
      dmg: e.dmg,
      trail: 0
    });
    Sound.tone(180, 0.2, 'sawtooth', 0.04, 90);
  }

  function updateProjectiles(dt) {
    for (let i = game.projectiles.length - 1; i >= 0; i--) {
      const p = game.projectiles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.trail -= dt;
      if (p.trail <= 0) {
        p.trail = 0.055;
        addParticle({ x: p.x, y: p.y, vx: rand(-8, 8), vy: rand(-8, 8), life: 0.35, max: 0.35, r: 3, color: '#8f5db3', drag: 2, type: 'mist' });
      }
      if (dist(p.x, p.y, player.x, player.y) < 18) {
        damagePlayer(p.dmg);
        game.projectiles.splice(i, 1);
        continue;
      }
      if (p.life <= 0) game.projectiles.splice(i, 1);
    }
  }

  function updateEnemies(dt) {
    const active = getActiveShelter();
    for (const e of game.enemies) {
      if (e.dead) continue;
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      e.atkTimer -= dt;
      e.fireTimer -= dt;
      e.phaseTimer = (e.phaseTimer || 0) - dt;
      e.healTimer = (e.healTimer || 0) - dt;
      e.roar = Math.max(0, (e.roar || 0) - dt);
      e.healPulse = Math.max(0, (e.healPulse || 0) - dt);
      e.phaseGlow = Math.max(0, (e.phaseGlow || 0) - dt);
      e.regenGlow = Math.max(0, (e.regenGlow || 0) - dt);

      const def = ENEMY_TYPES[e.type];

      // SCP-682 knits itself back together if it is left alone.
      if (e.type === 'reptile' && game.time - (e.lastHit || -99) > 2.2 && e.hp < e.maxHp) {
        e.hp = Math.min(e.maxHp, e.hp + (10 + game.day * 1.2) * dt);
        e.regenGlow = 0.35;
      }

      // SCP-049 tends the outbreak instead of the patient.
      if (e.type === 'doctor' && e.healTimer <= 0) {
        e.healTimer = 2.4;
        let mended = false;
        for (const other of game.enemies) {
          if (other === e || other.dead || other.hp >= other.maxHp) continue;
          if (dist(e.x, e.y, other.x, other.y) > 245) continue;
          other.hp = Math.min(other.maxHp, other.hp + other.maxHp * 0.18);
          other.healPulse = 0.5;
          mended = true;
          spawnSparks(other.x, other.y - 8, 3, '#a8e69a', 0.9);
        }
        if (mended) {
          e.healPulse = 0.7;
          e.roar = 0.4;
        }
      }

      // SCP-173 locks up under a direct look; SCP-096 does the opposite.
      const watched = isObserved(e, e.type === 'statue' ? 1 : 0.78, e.type === 'statue' ? 700 : 640);
      e.frozen = false;
      if (e.type === 'statue') {
        e.observe = watched ? Math.min(2, e.observe + dt) : 0;
        e.frozen = watched;
      } else if (e.type === 'shyguy') {
        if (watched) {
          e.observe = Math.min(5, e.observe + dt);
          if (!e.enraged) {
            e.enraged = true;
            e.roar = 1.4;
            game.shake = Math.max(game.shake, 6);
            toast('SCP-096 ENRAGED', 'It saw you see it. There is nowhere far enough.', 'alert');
            Sound.tone(90, 0.8, 'sawtooth', 0.05, 55);
          }
        }
      } else {
        e.observe = 0;
      }

      if (e.type === 'statue' && def) e.frozen = watched;

      let targetX = player.x;
      let targetY = player.y;
      let targetType = 'player';
      let targetComp = null;

      // Raiding parties seek a companion left in a shelter.
      if (e.raidShelterId) {
        const raid = shelters.find((s) => s.id === e.raidShelterId);
        const res = raid ? residentAt(raid.id) : null;
        if (res) {
          targetComp = res;
          targetX = res.x;
          targetY = res.y;
          targetType = 'companion';
        } else {
          e.raidShelterId = null;
        }
      }

      // Some of the dark prefers the living that follow you.
      if (!targetComp && e.prefersCompanions) {
        let best = null;
        let bd = 560;
        for (const c of teamMembers()) {
          const d = dist(e.x, e.y, c.x, c.y);
          if (d < bd) { bd = d; best = c; }
        }
        if (best) {
          targetComp = best;
          targetX = best.x;
          targetY = best.y;
          targetType = 'companion';
        }
      }

      // Otherwise: break the barricade, or hunt the player in the open.
      if (!targetComp) {
        const hiding = !!game.inShelter && active && active.state.integrity > 0;
        if (e.type === 'oldman') {
          // SCP-106 walks through barricades and always comes for the player.
          targetType = 'player';
        } else if (hiding) {
          targetType = 'wall';
          targetX = active.x;
          targetY = active.y;
        } else if (active && active.state.owned && active.state.integrity > 0 && !e.ranged && dist(player.x, player.y, active.x, active.y) < active.radius + 55) {
          targetType = 'wall';
          targetX = active.x;
          targetY = active.y;
        } else {
          targetType = 'player';
        }
      }

      let speedMul = 1;
      if (e.type === 'shyguy' && e.enraged) speedMul = 1.6;
      if (e.type === 'statue') speedMul = 1.35;
      if (e.type === 'doctor') speedMul = 0.92;
      if (e.type === 'voice') {
        let pack = 0;
        for (const other of game.enemies) {
          if (other === e || other.dead || other.type !== 'voice') continue;
          if (dist(e.x, e.y, other.x, other.y) < 330) pack++;
        }
        e.packBoost = Math.min(0.44, pack * 0.12);
        speedMul *= 1 + e.packBoost;
      } else {
        e.packBoost = 0;
      }

      if (e.type === 'oldman' && e.phaseTimer <= 0) {
        e.phaseTimer = rand(3.6, 5.8);
        const td = dist(e.x, e.y, targetX, targetY);
        if (td > 120 && td < 560) {
          const a = Math.atan2(targetY - e.y, targetX - e.x);
          const step = Math.min(150, td - 95) * 0.6;
          spawnMist(e.x, e.y, 9, '#3b4634');
          e.x += Math.cos(a) * step;
          e.y += Math.sin(a) * step;
          e.phaseGlow = 0.6;
          spawnMist(e.x, e.y, 11, '#8fbf72');
        }
      }

      let dx;
      let dy;
      let d;
      if (targetType === 'wall') {
        dx = active.x - e.x;
        dy = active.y - e.y;
        d = Math.hypot(dx, dy) || 1;
        const stop = active.radius + 17;
        if (e.type === 'statue' && e.frozen) {
          // It cannot cross the look, even to reach the wall.
          e.angle = Math.atan2(dy, dx);
        } else if (d > stop) {
          const a = Math.atan2(dy, dx) + Math.sin(game.time * 2.1 + e.seed) * 0.17;
          e.x += Math.cos(a) * e.speed * speedMul * dt;
          e.y += Math.sin(a) * e.speed * speedMul * dt;
          e.angle = a;
        } else {
          e.angle = Math.atan2(active.y - e.y, active.x - e.x);
          if (e.atkTimer <= 0) {
            e.atkTimer = e.atk;
            const hx = active.x + Math.cos(e.angle) * active.radius;
            const hy = active.y + Math.sin(e.angle) * active.radius;
            damageShelter(active, e.wall * (1 - active.state.armor), hx, hy);
          }
        }
        if (active.state.traps > 0 && d < active.radius + 32) {
          e.hp -= active.state.traps * dt;
          if (Math.random() < dt * 4) spawnSparks(e.x, e.y, 1, '#7fb2a5', 0.55);
          if (e.hp <= 0) killEnemy(e);
        }
      } else {
        dx = targetX - e.x;
        dy = targetY - e.y;
        d = Math.hypot(dx, dy) || 1;
        if (e.ranged) {
          const desired = 245;
          if (d > desired + 50) {
            const a = Math.atan2(dy, dx);
            e.x += Math.cos(a) * e.speed * speedMul * dt;
            e.y += Math.sin(a) * e.speed * speedMul * dt;
            e.angle = a;
          } else if (d < desired - 70) {
            const a = Math.atan2(dy, dx);
            e.x -= Math.cos(a) * e.speed * speedMul * dt;
            e.y -= Math.sin(a) * e.speed * speedMul * dt;
            e.angle = a + Math.PI;
          } else {
            e.angle = Math.atan2(dy, dx);
          }
          if (e.fireTimer <= 0 && d < 430) {
            e.fireTimer = e.atk;
            spawnEnemyProjectile(e, { x: targetX, y: targetY });
          }
        } else if (e.type === 'statue' && e.frozen) {
          // Frozen mid-stride, one arm reaching for you.
          e.angle = Math.atan2(dy, dx);
        } else {
          const stopDist = targetType === 'companion' ? e.r + 13 : e.r + player.r + 2;
          if (d > stopDist) {
            const a = Math.atan2(dy, dx) + Math.sin(game.time * 2.3 + e.seed) * 0.13;
            e.x += Math.cos(a) * e.speed * speedMul * dt;
            e.y += Math.sin(a) * e.speed * speedMul * dt;
            e.angle = a;
          } else {
            e.angle = Math.atan2(dy, dx);
            if (e.atkTimer <= 0) {
              e.atkTimer = e.atk;
              const hit = e.type === 'shyguy' && e.enraged ? e.dmg * 1.35 : e.dmg;
              if (targetType === 'companion' && targetComp) {
                damageCompanion(targetComp, hit);
                spawnSparks(targetComp.x, targetComp.y, 3, '#a34d3b', 0.8);
              } else {
                damagePlayer(hit);
              }
            }
          }
        }
      }

      // Small tells so the eye can read what each SCP is doing.
      if (e.type === 'oldman' && Math.random() < dt * 3) {
        spawnMist(e.x + rand(-11, 11), e.y + rand(-4, 14), 1, '#3f4c36');
      } else if (e.type === 'shyguy' && e.enraged && Math.random() < dt * 4) {
        spawnMist(e.x + rand(-9, 9), e.y - rand(0, 10), 1, '#8e4b45');
      } else if (e.type === 'reptile' && e.regenGlow > 0 && Math.random() < dt * 6) {
        spawnSparks(e.x + rand(-14, 14), e.y + rand(-8, 8), 1, '#86c47c', 0.6);
      }
      e.x = clamp(e.x, 20, WORLD.w - 20);
      e.y = clamp(e.y, 20, WORLD.h - 20);
    }

    // Soft separation so the horde reads as a horde, not a single blob.
    for (let i = 0; i < game.enemies.length; i++) {
      const a = game.enemies[i];
      if (a.dead) continue;
      for (let j = i + 1; j < game.enemies.length; j++) {
        const b = game.enemies[j];
        if (b.dead) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const min = a.r + b.r + 2;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0.001 && d2 < min * min) {
          const d = Math.sqrt(d2);
          const push = (min - d) / d * 0.33;
          a.x -= dx * push;
          a.y -= dy * push;
          b.x += dx * push;
          b.y += dy * push;
        }
      }
    }

    if (game.enemies.some((e) => e.dead)) game.enemies = game.enemies.filter((e) => !e.dead);
  }

  /* ---------------------------------------------------------------------
     Companions update
  --------------------------------------------------------------------- */
  function updateCompanions(dt) {
    const team = teamMembers();
    for (const c of game.companions) {
      c.hitFlash = Math.max(0, c.hitFlash - dt);
      c.fireTimer = Math.max(0, c.fireTimer - dt);
      c.invuln = Math.max(0, (c.invuln || 0) - dt);

      if (c.state === 'team') {
        const def = ROLES[c.role];
        const idx = team.indexOf(c);
        const back = 62 + idx * 20;
        const side = (idx === 0 ? -1 : 1) * 30;
        const tx = player.x - Math.cos(player.aim) * back - Math.sin(player.aim) * side;
        const ty = player.y - Math.sin(player.aim) * back + Math.cos(player.aim) * side;
        const d = dist(c.x, c.y, tx, ty);
        if (d > 16) {
          const a = Math.atan2(ty - c.y, tx - c.x);
          const rush = d > 440 ? 1.55 : d > 190 ? 1.2 : 1;
          c.x += Math.cos(a) * def.speed * rush * dt;
          c.y += Math.sin(a) * def.speed * rush * dt;
          c.angle = a;
        }
        c.x = clamp(c.x, 26, WORLD.w - 26);
        c.y = clamp(c.y, 26, WORLD.h - 26);
        const target = nearestEnemy(c.x, c.y, def.range);
        if (target) {
          if (d < 30 || !player.moving) c.angle = Math.atan2(target.y - c.y, target.x - c.x);
          companionShoot(c, target);
        }
        if (game.phase === 'day' && c.hp < c.maxHp) c.hp = Math.min(c.maxHp, c.hp + 1.2 * dt);
        if (c.role === 'medic' && dist(c.x, c.y, player.x, player.y) < 190 && game.health < game.maxHealth) {
          game.health = Math.min(game.maxHealth, game.health + 1.8 * dt);
        }
        if (c.role === 'engineer') {
          const s = getActiveShelter();
          if (s && s.state.owned && dist(c.x, c.y, s.x, s.y) < 320 && s.state.integrity < s.state.maxIntegrity) {
            s.state.integrity = Math.min(s.state.maxIntegrity, s.state.integrity + 2.4 * dt);
            if (Math.random() < dt * 3) spawnSparks(s.x, s.y + 20, 1, '#efb661', 0.5);
          }
        }
      } else if (c.state === 'shelter') {
        const s = shelters.find((x) => x.id === c.shelterId);
        if (!s || s.state.collapsed) {
          c.state = 'wild';
          c.shelterId = null;
          continue;
        }
        c.x = s.x + 30;
        c.y = s.y + 42;
        const def = ROLES[c.role];
        const target = nearestEnemy(c.x, c.y, def.range + 20);
        if (target) {
          c.angle = Math.atan2(target.y - c.y, target.x - c.x);
          companionShoot(c, target);
        } else {
          c.angle = Math.sin(game.time * 0.7 + c.seed) * 0.8;
        }
        if (c.hp < c.maxHp) {
          c.hp = Math.min(c.maxHp, c.hp + (game.phase === 'day' ? 2.6 : 0.35) * dt);
        }
      } else if (c.state === 'travel') {
        const s = shelters.find((x) => x.id === c.targetShelterId);
        if (!s || s.state.collapsed) {
          c.state = 'wild';
          c.targetShelterId = null;
          continue;
        }
        const d = dist(c.x, c.y, s.x, s.y);
        if (d > 26) {
          const a = Math.atan2(s.y - c.y, s.x - c.x);
          c.x += Math.cos(a) * 112 * dt;
          c.y += Math.sin(a) * 112 * dt;
          c.angle = a;
        } else {
          c.state = 'shelter';
          c.shelterId = s.id;
          c.x = s.x + 30;
          c.y = s.y + 42;
          toast('SHELTER HELD', `${c.name} is waiting at ${s.name}. They can still be attacked.`, 'warn');
        }
      } else if (c.state === 'wild') {
        c.angle += dt * 0.25;
      }
    }
  }

  /* ---------------------------------------------------------------------
     Main update + camera
  --------------------------------------------------------------------- */
  function clampCam(v, half, max) {
    if (max <= half * 2) return max / 2;
    return clamp(v, half, max - half);
  }

  function updateCamera(dt) {
    const tx = clampCam(player.x, view.w / 2, WORLD.w);
    const ty = clampCam(player.y, view.h / 2, WORLD.h);
    const k = 1 - Math.exp(-6.5 * dt);
    camera.x = lerp(camera.x, tx, k);
    camera.y = lerp(camera.y, ty, k);
    game.shake = Math.max(0, game.shake - 38 * dt);
  }

  function update(dt) {
    game.time += dt;
    emitFireEmbers(dt);
    if (game.phase === 'night' && Math.random() < dt * 0.04) Sound.howl();
    updatePhase(dt);
    if (game.mode !== 'playing') {
      updateParticles(dt);
      updateCamera(dt);
      return;
    }
    updatePlayer(dt);
    if (game.mode !== 'playing') return;
    updateCompanions(dt);
    updateSpawning(dt);
    updateEnemies(dt);
    if (game.mode !== 'playing') return;
    updateBullets(dt);
    updateProjectiles(dt);
    updateParticles(dt);
    updateInteraction();
    updateCamera(dt);
  }

  /* ---------------------------------------------------------------------
     UI: toasts, banner, flashes, team, HUD
  --------------------------------------------------------------------- */
  let bannerTimer = null;

  function toast(title, sub, kind) {
    const el = document.createElement('div');
    el.className = 'toast' + (kind ? ' ' + kind : '');
    const t = document.createElement('div');
    t.className = 't-title';
    t.textContent = title;
    const s = document.createElement('div');
    s.className = 't-sub';
    s.textContent = sub;
    el.appendChild(t);
    el.appendChild(s);
    DOM.toastStack.appendChild(el);
    while (DOM.toastStack.children.length > 3) DOM.toastStack.removeChild(DOM.toastStack.firstChild);
    setTimeout(() => {
      el.classList.add('leaving');
      setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 340);
    }, 3900);
  }

  function banner(kicker, title, sub, kind, duration) {
    setText(DOM.bannerKicker, kicker);
    setText(DOM.bannerTitle, title);
    setText(DOM.bannerSub, sub);
    DOM.centerBanner.className = 'center-banner' + (kind ? ' ' + kind : '');
    void DOM.centerBanner.offsetWidth;
    DOM.centerBanner.classList.add('show');
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => DOM.centerBanner.classList.remove('show'), (duration || 2.6) * 1000);
  }

  function flash(el, opacity, ms) {
    if (!el) return;
    el.style.transition = 'none';
    el.style.opacity = String(opacity);
    void el.offsetWidth;
    el.style.transition = `opacity ${ms || 500}ms ease-out`;
    el.style.opacity = '0';
  }

  function updateBestBadges() {
    setText(DOM.bestBadge, game.best > 0 ? `BEST ${game.best}` : 'BEST —');
    setText(DOM.bestDays, game.best > 0 ? `${game.best} NIGHT${game.best === 1 ? '' : 'S'}` : '—');
  }

  function updateTeamUI(force) {
    const team = teamMembers();
    let sig = String(team.length);
    for (const c of team) sig += `|${c.id}:${Math.round(c.hp)}:${c.role}`;
    if (!force && sig === game.lastSig) return;
    game.lastSig = sig;
    setText(DOM.teamCount, `${team.length} / ${MAX_TEAM}`);
    if (!team.length) {
      DOM.teamList.innerHTML = '<div id="teamEmpty" class="team-empty">No one walks with you.</div>';
      return;
    }
    DOM.teamList.innerHTML = team.map((c) => {
      const def = ROLES[c.role];
      const hp = Math.max(0, Math.round((c.hp / c.maxHp) * 100));
      return `<div class="team-card">
        <i class="tc-dot ${c.role}"></i>
        <div class="tc-main">
          <b>${c.name}</b>
          <span>${def.label} · ${hp <= 25 ? 'Wounded' : 'Following'}</span>
          <div class="tc-hp"><i style="width:${hp}%"></i></div>
        </div>
        <button class="tc-dismiss" type="button" data-id="${c.id}" title="Send to a vacant shelter" aria-label="Send ${c.name} to a shelter">✕</button>
      </div>`;
    }).join('');
  }

  function tonightThreat(s) {
    return (1 + (game.day - 1) * 0.16 + s.state.haunt * 0.55 + (game.chapter - 1) * 0.22) * s.mod.spawn;
  }

  function hauntLabelFor(n) {
    return n <= 0 ? 'FRESH' : n === 1 ? 'WATCHED' : 'REMEMBERED';
  }

  function updateHUD() {
    updateBestBadges();
    updateTeamUI(false);
    if (game.mode === 'menu') return;
    if (game.mode !== 'playing') DOM.interactPrompt.hidden = true;
    DOM.insideBanner.hidden = !game.inShelter;
    if (game.inShelter) {
      const insideName = getActiveShelter();
      if (insideName) setText(DOM.insideBannerName, insideName.name);
    }

    const phaseNames = { day: 'DAYLIGHT', dusk: 'DUSK', night: 'NIGHT', dawn: 'DAWN' };
    setText(DOM.dayLabel, `DAY ${game.day}`);
    setText(DOM.phaseChip, phaseNames[game.phase] || 'DAYLIGHT');
    DOM.phaseChip.className = 'phase-chip ' + game.phase;
    DOM.statusPanel.className = 'status-panel glass phase-' + game.phase;
    setText(DOM.mapTitle, `CH. ${roman(game.chapter)} · ${CHAPTERS[game.chapter - 1].name}`);

    const remain = Math.max(0, game.phaseDuration - game.phaseTime);
    if (game.phase === 'night') setText(DOM.timeLeft, `Dawn in ${fmtTime(remain)}`);
    else if (game.phase === 'dawn') setText(DOM.timeLeft, 'Dawn');
    else setText(DOM.timeLeft, `Nightfall in ${fmtTime(remain)}`);
    DOM.timeFill.style.width = `${clamp((remain / game.phaseDuration) * 100, 0, 100)}%`;

    const active = getActiveShelter();
    if (!active) setText(DOM.objective, game.phase === 'night' ? 'Survive the open' : 'Claim a shelter');
    else if (game.phase === 'night') setText(DOM.objective, active.state.integrity > 0 ? 'Hold until dawn' : 'Fight in the open');
    else if (game.phase === 'dusk') setText(DOM.objective, 'Get inside');
    else if (active.state.integrity < active.state.maxIntegrity * 0.55) setText(DOM.objective, 'Fortify the barricade');
    else setText(DOM.objective, game.day >= 3 ? 'Scout fresh ground' : 'Gather supplies');

    setText(DOM.healthText, String(Math.ceil(game.health)));
    DOM.healthFill.style.width = `${clamp((game.health / game.maxHealth) * 100, 0, 100)}%`;
    DOM.healthFill.classList.toggle('low', game.health < 30);

    setText(DOM.woodCount, String(game.resources.wood));
    setText(DOM.stoneCount, String(game.resources.stone));
    setText(DOM.scrapCount, String(game.resources.scrap));
    setText(DOM.weaponTier, WEAPONS[game.weaponTier - 1].short);

    const dread = 1 + (game.day - 1) * 0.16 + game.nightsHeld * 0.02 + (game.chapter - 1) * 0.3;
    setText(DOM.dreadLabel, `DREAD ${dread.toFixed(1)}`);
    const near = nearestShelter(player.x, player.y, false);
    setText(DOM.hauntLabel, near ? `${hauntLabelFor(near.state.haunt)} GROUND` : 'LOST GROUND');

    const s = game.panelShelter;
    const canPanel = s && (game.mode === 'playing' || game.mode === 'paused' || game.mode === 'dying');
    DOM.shelterPanel.classList.toggle('open', !!canPanel);
    if (canPanel) {
      const st = s.state;
      setText(DOM.shelterName, s.name);
      setText(DOM.shelterPerk, s.perk);
      const residentsHere = companionsAt(s.id);
      if (residentsHere.length) {
        setText(DOM.shelterOccupant, residentsHere.map((c) => `${c.name} · ${Math.ceil(c.hp)}/${c.maxHp} HP`).join(' · '));
        DOM.shelterOccupant.classList.remove('empty');
      } else {
        setText(DOM.shelterOccupant, 'Vacant shelter.');
        DOM.shelterOccupant.classList.add('empty');
      }
      const h = st.haunt;
      setText(DOM.hauntBadge, hauntLabelFor(h));
      DOM.hauntBadge.className = 'haunt-badge ' + (h <= 0 ? 'fresh' : h === 1 ? 'watched' : 'remembered');
      const pct = st.maxIntegrity > 0 ? (st.integrity / st.maxIntegrity) * 100 : 0;
      setText(DOM.barricadeText, `${Math.ceil(st.integrity)} / ${st.maxIntegrity}`);
      DOM.barricadeFill.style.width = `${clamp(pct, 0, 100)}%`;
      DOM.barricadeFill.classList.toggle('danger', pct < 35);
      setText(DOM.armorText, `ARMOR ${Math.round(st.armor * 100)}%`);
      setText(DOM.threatText, `TONIGHT ${tonightThreat(s).toFixed(1)}`);
      DOM.hauntWarning.hidden = h < 2;
      if (h >= 2) setText(DOM.hauntWarningText, 'The dark remembers this place. Stay again and more will come.');

      if (st.collapsed) {
        setText(DOM.claimBtn, 'Shelter Collapsed');
        DOM.claimBtn.disabled = true;
      } else if (!st.owned) {
        setText(DOM.claimBtn, 'Claim Shelter · E');
        DOM.claimBtn.disabled = false;
      } else if (game.activeShelter !== s.id) {
        setText(DOM.claimBtn, 'Make Camp Here · E');
        DOM.claimBtn.disabled = false;
      } else {
        setText(DOM.claimBtn, 'Holding This Shelter');
        DOM.claimBtn.disabled = true;
      }

      const isMine = st.owned && game.activeShelter === s.id;
      const insideHere = game.inShelter === s.id;
      const nearEnough = dist(player.x, player.y, s.x, s.y) <= s.radius + 72;
      DOM.shelterEnterBtn.hidden = !isMine;
      if (isMine) {
        const canEnter = insideHere || (nearEnough && st.integrity > 0);
        DOM.shelterEnterBtn.disabled = !canEnter;
        DOM.shelterEnterBtn.classList.toggle('leave', insideHere);
        setText(DOM.shelterEnterBtn, insideHere
          ? 'Leave Shelter · E'
          : st.integrity > 0 ? 'Enter Shelter · E' : 'Walls Breached');
      }
      DOM.insideGuard.hidden = !insideHere;
      DOM.recallResidentBtn.hidden = !residentsHere.length;
      if (residentsHere.length) setText(DOM.recallResidentBtn, `Call ${residentsHere[0].name} to Your Side`);
      const btns = document.querySelectorAll('#fortGrid .fort-btn');
      const canFort = isMine && game.resources.wood >= 3 && (st.integrity < st.maxIntegrity || st.maxIntegrity < 360);
      const canReinforce = isMine && game.resources.stone >= 3 && st.armor < 0.6;
      const canTraps = isMine && game.resources.scrap >= 4 && st.traps < 45;
      const canRepair = isMine && game.resources.wood >= 2 && st.integrity < st.maxIntegrity;
      if (btns[0]) btns[0].disabled = !canFort;
      if (btns[1]) btns[1].disabled = !canReinforce;
      if (btns[2]) btns[2].disabled = !canTraps;
      if (btns[3]) btns[3].disabled = !canRepair;
      setText(DOM.fortifyCost, '3');
      setText(DOM.reinforceCost, '3');
      setText(DOM.trapsCost, '4');
      setText(DOM.repairCost, '2');
      setText(DOM.fortifyDesc, st.maxIntegrity >= 360 ? 'max integrity' : '+80 integrity');
      setText(DOM.reinforceDesc, st.armor >= 0.6 ? 'armor maxed' : '+10% armor');
      setText(DOM.trapsDesc, st.traps >= 45 ? 'traps maxed' : '+9 damage/sec');
      setText(DOM.repairDesc, '+90 integrity');

      const next = WEAPONS[game.weaponTier];
      const cost = 8 + (game.weaponTier - 1) * 6;
      setText(DOM.weaponCost, game.weaponTier >= WEAPONS.length ? '—' : String(cost));
      setText(DOM.weaponUpgradeDesc, next ? `${next.short} — more damage, faster fire` : 'Maximum tier reached');
      DOM.weaponBtn.disabled = game.weaponTier >= WEAPONS.length || game.resources.scrap < cost;
    }
  }

  function updateCrosshair() {
    if (game.mode !== 'playing' || touchMode) {
      DOM.crosshair.classList.remove('active');
      return;
    }
    DOM.crosshair.classList.add('active');
    DOM.crosshair.style.transform = `translate(${mouse.x - 13}px, ${mouse.y - 13}px)`;
    let hot = false;
    for (const e of game.enemies) {
      const sx = e.x - camera.x + view.w / 2;
      const sy = e.y - camera.y + view.h / 2;
      if (Math.abs(sx - mouse.x) < 26 && Math.abs(sy - mouse.y) < 26) { hot = true; break; }
    }
    DOM.crosshair.classList.toggle('hot', hot);
  }

  /* ---------------------------------------------------------------------
     Rendering — world
  --------------------------------------------------------------------- */
  const rc = { x: 0, y: 0, sx: 0, sy: 0 };

  function beginWorld() {
    rc.x = camera.x;
    rc.y = camera.y;
    const mag = game.shake;
    rc.sx = mag > 0.1 ? rand(-mag, mag) * 0.55 : 0;
    rc.sy = mag > 0.1 ? rand(-mag, mag) * 0.55 : 0;
    ctx.save();
    ctx.translate(view.w / 2 - camera.x + rc.sx, view.h / 2 - camera.y + rc.sy);
  }

  function endWorld() { ctx.restore(); }

  function sxOf(wx) { return wx - rc.x + view.w / 2 + rc.sx; }
  function syOf(wy) { return wy - rc.y + view.h / 2 + rc.sy; }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawGround(bounds) {
    const { left, top, right, bottom } = bounds;
    const inView = (x, y, m) => x >= left - m && x <= right + m && y >= top - m && y <= bottom + m;
    ctx.fillStyle = '#101a14';
    ctx.fillRect(left - 80, top - 80, right - left + 160, bottom - top + 160);

    // The lake by the cabin. Water first, so the shoreline reads on top of it.
    const lake = { x: 1120, y: 1892, rx: 208, ry: 100 };
    if (inView(lake.x, lake.y, 250)) {
      ctx.save();
      const wg = ctx.createRadialGradient(lake.x - 40, lake.y - 22, 8, lake.x, lake.y, lake.rx);
      wg.addColorStop(0, '#16323a');
      wg.addColorStop(0.6, '#0e222b');
      wg.addColorStop(1, '#091820');
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.ellipse(lake.x, lake.y, lake.rx, lake.ry, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(54,82,74,0.55)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(150,190,185,0.14)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9 + Math.sin(game.time * 0.4 + i) * 0.1;
        const rr2 = 22 + i * 23;
        ctx.beginPath();
        ctx.ellipse(lake.x + Math.cos(a) * 24, lake.y + Math.sin(a * 0.7) * 9, rr2, rr2 * 0.17, 0, 0, TAU);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(190,210,200,0.07)';
      ctx.beginPath();
      ctx.ellipse(lake.x - 48, lake.y - 28, 46, 9, -0.16, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // Stagnant pools trapped in the low ground.
    for (const p of terrain.puddles) {
      if (!inView(p.x, p.y, 60)) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = 'rgba(11,29,32,0.8)';
      ctx.beginPath();
      ctx.ellipse(0, 0, p.rx, p.ry, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(110,150,145,0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(180,210,205,0.13)';
      ctx.beginPath();
      ctx.ellipse(-p.rx * 0.18, -p.ry * 0.16, p.rx * 0.36, p.ry * 0.24, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    for (const p of terrain.patches) {
      if (p.x + p.rx < left || p.x - p.rx > right || p.y + p.ry < top || p.y - p.ry > bottom) continue;
      ctx.fillStyle = `rgba(${p.tone},${p.a})`;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, TAU);
      ctx.fill();
    }

    // old trails between shelters
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass === 0 ? 'rgba(126,109,78,0.15)' : 'rgba(148,128,92,0.14)';
      ctx.lineWidth = pass === 0 ? 64 : 26;
      for (const link of pathLinks) {
        const a = shelters.find((s) => s.id === link[0]);
        const b = shelters.find((s) => s.id === link[1]);
        if (!a || !b) continue;
        if (Math.max(a.x, b.x) < left || Math.min(a.x, b.x) > right) continue;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y + 20);
        const mx = (a.x + b.x) / 2 + Math.sin(a.x + b.y) * 40;
        const my = (a.y + b.y) / 2 + Math.cos(a.y + b.x) * 40;
        ctx.quadraticCurveTo(mx, my, b.x, b.y + 20);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Farm rows. Tended once, now gone to seed.
    for (const c of terrain.crops) {
      if (!inView(c.x, c.y, 20)) continue;
      ctx.strokeStyle = `rgba(${c.tone},0.62)`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y + 2);
      ctx.lineTo(c.x + Math.sin(c.x * 0.4) * 1.5, c.y - c.h);
      ctx.stroke();
      ctx.fillStyle = `rgba(${c.tone},0.45)`;
      ctx.beginPath();
      ctx.ellipse(c.x - 1.2, c.y - c.h * 0.55, 1.6, 0.9, -0.5, 0, TAU);
      ctx.fill();
    }

    // grass
    for (const t of terrain.tufts) {
      if (t.x < left || t.x > right || t.y < top || t.y > bottom) continue;
      ctx.strokeStyle = `rgba(${t.tone},0.5)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const s = t.s;
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.x + Math.cos(t.rot) * s, t.y + Math.sin(t.rot) * s);
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.x + Math.cos(t.rot + 1.6) * s * 0.8, t.y + Math.sin(t.rot + 1.6) * s * 0.8);
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.x + Math.cos(t.rot - 1.4) * s * 0.7, t.y + Math.sin(t.rot - 1.4) * s * 0.7);
      ctx.stroke();
    }

    // reeds around the lake shoreline
    for (const rd of terrain.reeds) {
      if (!inView(rd.x, rd.y, 18)) continue;
      const sway = Math.sin(game.time * 0.9 + rd.rot) * 1.7;
      ctx.strokeStyle = 'rgba(96,116,76,0.7)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(rd.x, rd.y + 3);
      ctx.quadraticCurveTo(rd.x + sway * 0.4, rd.y - rd.h * 0.5, rd.x + sway, rd.y - rd.h);
      ctx.stroke();
      ctx.fillStyle = 'rgba(122,104,68,0.75)';
      ctx.beginPath();
      ctx.ellipse(rd.x + sway, rd.y - rd.h - 1.5, 1.5, 4, 0.1, 0, TAU);
      ctx.fill();
    }

    for (const f of terrain.flowers) {
      if (!inView(f.x, f.y, 12)) continue;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      if (f.glow) {
        ctx.fillStyle = `rgba(${f.tone},0.12)`;
        ctx.beginPath();
        ctx.arc(0, 0, f.s * 4.5, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(74,104,70,0.65)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.lineTo(0, -f.s * 2.2);
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = i * (TAU / 4) + 0.4;
        ctx.fillStyle = `rgba(${f.tone},${f.glow ? 0.85 : 0.55})`;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * f.s * 0.9, -f.s * 2.2 + Math.sin(a) * f.s * 0.7, f.s * 0.75, f.s * 0.45, a, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(232,210,142,0.8)';
      ctx.beginPath();
      ctx.arc(0, -f.s * 2.2, f.s * 0.36, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    for (const m of terrain.mushrooms) {
      if (!inView(m.x, m.y, 14)) continue;
      if (m.glow) {
        ctx.fillStyle = `rgba(${m.tone},0.1)`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r * 4, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(196,186,158,0.55)';
      ctx.fillRect(m.x - m.r * 0.22, m.y, m.r * 0.44, m.r * 1.1);
      ctx.fillStyle = `rgba(${m.tone},${m.glow ? 0.85 : 0.68})`;
      ctx.beginPath();
      ctx.ellipse(m.x, m.y, m.r, m.r * 0.62, 0, Math.PI, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(246,238,214,0.38)';
      ctx.beginPath();
      ctx.arc(m.x - m.r * 0.3, m.y - m.r * 0.2, m.r * 0.18, 0, TAU);
      ctx.arc(m.x + m.r * 0.28, m.y - m.r * 0.1, m.r * 0.14, 0, TAU);
      ctx.fill();
    }

    for (const p of terrain.pebbles) {
      if (!inView(p.x, p.y, 8)) continue;
      ctx.fillStyle = `rgba(128,134,126,${0.24 + p.tone})`;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r, p.r * 0.68, 0.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(210,216,204,0.12)';
      ctx.beginPath();
      ctx.ellipse(p.x - p.r * 0.25, p.y - p.r * 0.22, p.r * 0.4, p.r * 0.24, 0.4, 0, TAU);
      ctx.fill();
    }

    for (const b of terrain.bones) {
      if (!inView(b.x, b.y, 26)) continue;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.scale(b.s, b.s);
      ctx.fillStyle = 'rgba(194,188,164,0.52)';
      ctx.beginPath();
      ctx.arc(-8, 0, 3.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(28,32,27,0.65)';
      ctx.beginPath();
      ctx.arc(-9, 0, 1.1, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(188,182,158,0.46)';
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(-2 + i * 3, 0, 5 - i * 0.55, -1.2, 1.2);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(172,166,142,0.4)';
      ctx.beginPath();
      ctx.moveTo(11, -4);
      ctx.lineTo(17, -1);
      ctx.moveTo(11, 2);
      ctx.lineTo(16, 4);
      ctx.stroke();
      ctx.restore();
    }

    for (const st of terrain.stumps) {
      if (!inView(st.x, st.y, 18)) continue;
      ctx.fillStyle = 'rgba(48,38,27,0.72)';
      ctx.beginPath();
      ctx.ellipse(st.x, st.y + 2, st.r, st.r * 0.62, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#5c452c';
      ctx.beginPath();
      ctx.ellipse(st.x, st.y - 2, st.r * 0.82, st.r * 0.5, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(146,116,76,0.55)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.ellipse(st.x, st.y - 2, st.r * 0.82 * (i / 4), st.r * 0.5 * (i / 4), 0, 0, TAU);
        ctx.stroke();
      }
    }

    for (const lg of terrain.logs) {
      if (!inView(lg.x, lg.y, 40)) continue;
      ctx.save();
      ctx.translate(lg.x, lg.y);
      ctx.rotate(lg.rot);
      ctx.fillStyle = 'rgba(4,7,5,0.35)';
      rr(-lg.len * 0.5 + 3, -5, lg.len, 12, 6);
      ctx.fill();
      ctx.fillStyle = '#4e3823';
      rr(-lg.len * 0.5, -6, lg.len, 12, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(126,95,60,0.55)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-lg.len * 0.5 + 4, -6 + i * 2.6);
        ctx.lineTo(lg.len * 0.5 - 4, -6 + i * 2.6);
        ctx.stroke();
      }
      if (lg.moss) {
        ctx.fillStyle = 'rgba(82,112,72,0.5)';
        ctx.beginPath();
        ctx.ellipse(-lg.len * 0.12, -3, lg.len * 0.22, 3, 0, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#2d2117';
      ctx.beginPath();
      ctx.ellipse(lg.len * 0.5 - 3, 0, 3.4, 6, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(158,126,86,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(lg.len * 0.5 - 3, 0, 1.8, 3.4, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    for (const g of terrain.graves) {
      if (!inView(g.x, g.y, 24)) continue;
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.rot);
      ctx.fillStyle = 'rgba(3,7,5,0.38)';
      ctx.beginPath();
      ctx.ellipse(3, 7, 10, 4.5, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#6f726b';
      if (g.kind === 'cross') {
        ctx.fillRect(-2, -18, 4, 24);
        ctx.fillRect(-8, -12, 16, 4);
        ctx.fillStyle = 'rgba(200,204,192,0.16)';
        ctx.fillRect(-2, -18, 1.4, 22);
      } else {
        rr(-7, -17, 14, 24, 6);
        ctx.fill();
        ctx.fillStyle = 'rgba(200,204,192,0.14)';
        rr(-6, -16, 5, 21, 4);
        ctx.fill();
        ctx.strokeStyle = 'rgba(44,48,44,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-3, -9);
        ctx.lineTo(3, -9);
        ctx.moveTo(0, -13);
        ctx.lineTo(0, 1);
        ctx.stroke();
      }
      ctx.restore();
    }

    for (const w of terrain.wreck) {
      if (!inView(w.x, w.y, 34)) continue;
      ctx.save();
      ctx.translate(w.x, w.y);
      ctx.rotate(w.rot);
      if (w.kind === 'crate') {
        ctx.fillStyle = 'rgba(3,7,5,0.36)';
        ctx.fillRect(-11, -4, 25, 15);
        ctx.fillStyle = '#5b4830';
        rr(-12, -10, 24, 20, 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(152,124,82,0.55)';
        ctx.lineWidth = 1.4;
        ctx.strokeRect(-10, -8, 20, 16);
        ctx.beginPath();
        ctx.moveTo(-10, -8);
        ctx.lineTo(10, 8);
        ctx.moveTo(10, -8);
        ctx.lineTo(-10, 8);
        ctx.stroke();
      } else if (w.kind === 'rebar') {
        ctx.strokeStyle = 'rgba(122,88,62,0.68)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(-16 + i * 9, 6);
          ctx.quadraticCurveTo(-10 + i * 9, -8, -4 + i * 9, -10 + (i % 2) * 4);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = '#3b3a31';
        ctx.fillRect(-2, -10, 4, 22);
        ctx.fillStyle = '#b5743d';
        ctx.fillRect(-10, -18, 20, 10);
        ctx.fillStyle = 'rgba(20,20,18,0.8)';
        ctx.fillRect(-10, -14, 20, 2);
        ctx.strokeStyle = 'rgba(30,30,26,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-9, -17, 18, 8);
      }
      ctx.restore();
    }

    for (const r of terrain.rocks) {
      if (r.x < left || r.x > right || r.y < top || r.y > bottom) continue;
      ctx.fillStyle = 'rgba(3,7,5,0.32)';
      ctx.beginPath();
      ctx.ellipse(r.x + 2, r.y + 3, r.r * 1.05, r.r * 0.68, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = `rgba(112,120,112,${0.34 + r.tone})`;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.r, r.r * 0.7, 0.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(196,204,196,0.18)';
      ctx.beginPath();
      ctx.ellipse(r.x - r.r * 0.25, r.y - r.r * 0.28, r.r * 0.52, r.r * 0.3, 0.2, 0, TAU);
      ctx.fill();
      if (r.moss) {
        ctx.fillStyle = 'rgba(68,98,66,0.42)';
        ctx.beginPath();
        ctx.ellipse(r.x + r.r * 0.2, r.y + r.r * 0.12, r.r * 0.55, r.r * 0.32, 0.2, 0, TAU);
        ctx.fill();
      }
    }
  }

  function drawTrees(bounds) {
    const { left, top, right, bottom } = bounds;
    const palettes = [
      ['#121f18', '#1a2b20', '#2b4030'],
      ['#14221a', '#1d3023', '#304733'],
      ['#101b15', '#18261c', '#253a28']
    ];
    for (const t of terrain.trees) {
      if (t.x + t.r * 2 < left || t.x - t.r * 2 > right || t.y + t.r * 2 < top || t.y - t.r * 2 > bottom) continue;
      const pal = palettes[t.tone];
      const sway = Math.sin(game.time * 0.6 + t.sway) * 1.6;
      ctx.save();
      ctx.translate(t.x, t.y);

      // shadow
      ctx.fillStyle = 'rgba(3,8,6,0.4)';
      ctx.beginPath();
      ctx.ellipse(9, 9, t.r * 1.25, t.r * 0.62, 0.28, 0, TAU);
      ctx.fill();

      if (t.kind === 'pine') {
        // trunk
        ctx.fillStyle = '#2a2118';
        ctx.beginPath();
        ctx.moveTo(-4.5, 4);
        ctx.lineTo(-2.8, -t.r * 1.1);
        ctx.lineTo(2.8, -t.r * 1.1);
        ctx.lineTo(4.5, 4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(150,112,74,0.22)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-1.4, 2);
        ctx.lineTo(-1, -t.r);
        ctx.stroke();
        // layered needles
        const tiers = 4;
        for (let i = tiers - 1; i >= 0; i--) {
          const y = -t.r * (0.32 + i * 0.42);
          const w = t.r * (1.02 - i * 0.16);
          ctx.fillStyle = i % 2 === 0 ? pal[0] : pal[1];
          ctx.beginPath();
          ctx.moveTo(sway * (0.3 + i * 0.16), y - t.r * 0.62);
          ctx.quadraticCurveTo(-w * 0.55, y - t.r * 0.16, -w, y);
          ctx.quadraticCurveTo(-w * 0.32, y + t.r * 0.12, 0, y + t.r * 0.04);
          ctx.quadraticCurveTo(w * 0.32, y + t.r * 0.12, w, y);
          ctx.quadraticCurveTo(w * 0.55, y - t.r * 0.16, sway * (0.3 + i * 0.16), y - t.r * 0.62);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = pal[2];
        ctx.beginPath();
        ctx.moveTo(sway, -t.r * 2.02);
        ctx.quadraticCurveTo(-t.r * 0.24, -t.r * 1.7, -t.r * 0.46, -t.r * 1.42);
        ctx.quadraticCurveTo(0, -t.r * 1.52, t.r * 0.2, -t.r * 1.75);
        ctx.closePath();
        ctx.fill();
      } else if (t.kind === 'oak') {
        // gnarled trunk and branches
        ctx.strokeStyle = '#33271b';
        ctx.lineCap = 'round';
        ctx.lineWidth = t.r * 0.2;
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.quadraticCurveTo(-3, -t.r * 0.34, sway * 0.5, -t.r * 0.78);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(96,72,46,0.42)';
        ctx.lineWidth = Math.max(1, t.r * 0.08);
        for (let b = 0; b < 3; b++) {
          const a = -2.2 + b * 0.9;
          ctx.beginPath();
          ctx.moveTo(0, -t.r * 0.52);
          ctx.quadraticCurveTo(Math.cos(a) * t.r * 0.34, -t.r * 0.78, Math.cos(a) * t.r * 0.62, -t.r * 0.96);
          ctx.stroke();
        }
        // canopy clusters
        const clusters = [
          [0, -t.r * 0.9, 0.62],
          [-t.r * 0.5, -t.r * 0.72, 0.48],
          [t.r * 0.48, -t.r * 0.76, 0.46],
          [-t.r * 0.3, -t.r * 1.1, 0.44],
          [t.r * 0.3, -t.r * 1.08, 0.4],
          [0, -t.r * 1.22, 0.32]
        ];
        clusters.forEach((c, i) => {
          ctx.fillStyle = i % 2 === 0 ? pal[0] : pal[1];
          ctx.beginPath();
          ctx.arc(c[0] + sway * 0.6, c[1], t.r * c[2], 0, TAU);
          ctx.fill();
        });
        ctx.fillStyle = pal[2];
        ctx.beginPath();
        ctx.arc(-t.r * 0.22 + sway, -t.r * 1.18, t.r * 0.26, 0, TAU);
        ctx.arc(t.r * 0.18 + sway, -t.r * 1.05, t.r * 0.2, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(184,206,160,0.05)';
        ctx.beginPath();
        ctx.arc(-t.r * 0.34, -t.r * 1.06, t.r * 0.16, 0, TAU);
        ctx.fill();
      } else {
        // dead tree: a crooked black hand against the sky
        ctx.strokeStyle = '#241d17';
        ctx.lineCap = 'round';
        ctx.lineWidth = t.r * 0.15;
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.quadraticCurveTo(-4, -t.r * 0.5, sway, -t.r * 1.25);
        ctx.stroke();
        ctx.lineWidth = t.r * 0.075;
        for (let b = 0; b < 5; b++) {
          const a = -2.5 + b * 0.66;
          const len = t.r * (0.52 + (b % 3) * 0.16);
          ctx.beginPath();
          ctx.moveTo(sway * 0.4, -t.r * (0.45 + (b % 2) * 0.22));
          ctx.quadraticCurveTo(
            Math.cos(a) * len * 0.5 + sway,
            -t.r * 0.75 + Math.sin(a) * len * 0.3,
            Math.cos(a) * len + sway,
            -t.r * 0.92 + Math.sin(a) * len * 0.42
          );
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(122,116,86,0.22)';
        ctx.lineWidth = 1;
        for (let b = 0; b < 3; b++) {
          ctx.beginPath();
          ctx.moveTo(-1, -t.r * (0.4 + b * 0.2));
          ctx.lineTo(1.5, -t.r * (0.5 + b * 0.2));
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  function warmWindow(x, y, w, h, warm) {
    ctx.fillStyle = warm ? '#f0ad5d' : '#3e3428';
    ctx.fillRect(x, y, w, h);
    if (warm) {
      ctx.fillStyle = 'rgba(255,234,176,0.6)';
      ctx.fillRect(x + 1, y + 1, w - 2, h * 0.34);
    }
    ctx.strokeStyle = '#1b1511';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w / 2, y + h);
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x + w, y + h / 2);
    ctx.stroke();
  }

  function drawSmoke(x, y, scale) {
    for (let i = 0; i < 4; i++) {
      const t = (game.time * 0.22 + i * 0.25) % 1;
      const a = (1 - t) * 0.16;
      if (a <= 0) continue;
      ctx.fillStyle = `rgba(158,168,156,${a})`;
      ctx.beginPath();
      ctx.arc(x + Math.sin(game.time * 0.6 + i * 1.7) * 5 * scale, y - t * 34 * scale, (3 + t * 8) * scale, 0, TAU);
      ctx.fill();
    }
  }

  function drawShelterFire(x, y, warm) {
    const pulse = Math.sin(game.time * 8.5 + x) * 0.5 + 0.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(3,5,4,0.36)';
    ctx.beginPath();
    ctx.ellipse(2, 4, 21, 10, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#4f4d43';
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 15, Math.sin(a) * 8, 4.4, 3.2, a, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#2f2419';
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 6, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#6b4b2c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-9, 3);
    ctx.lineTo(9, -3);
    ctx.moveTo(-8, -3);
    ctx.lineTo(8, 4);
    ctx.stroke();
    ctx.fillStyle = warm ? '#e78c3f' : 'rgba(231,140,63,0.4)';
    ctx.beginPath();
    ctx.moveTo(-7, 3);
    ctx.quadraticCurveTo(-5, -12 - pulse * 4, 0, -20 - pulse * 3);
    ctx.quadraticCurveTo(4, -8, 7, 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = warm ? '#ffd490' : 'rgba(255,212,144,0.35)';
    ctx.beginPath();
    ctx.moveTo(-2, 3);
    ctx.quadraticCurveTo(0, -9 - pulse * 2, 2, -13 - pulse * 2);
    ctx.quadraticCurveTo(4, -4, 4, 3);
    ctx.closePath();
    ctx.fill();
    if (warm) {
      ctx.fillStyle = 'rgba(255,210,140,0.9)';
      for (let i = 0; i < 3; i++) {
        const t = (game.time * 0.6 + i * 0.31) % 1;
        ctx.globalAlpha = (1 - t) * 0.7;
        ctx.beginPath();
        ctx.arc(Math.sin(game.time * 3 + i * 2) * 7, -18 - t * 22, 1.4, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawShelterExterior(s, warm) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.fillStyle = 'rgba(2,5,4,0.44)';
    ctx.beginPath();
    ctx.ellipse(13, 26, 91, 45, 0.06, 0, TAU);
    ctx.fill();

    if (s.id === 'chapel') {
      // stone nave
      ctx.fillStyle = '#3c3d38';
      rr(-68, -40, 136, 82, 5);
      ctx.fill();
      ctx.fillStyle = '#4a4b45';
      rr(-62, -34, 124, 68, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(154,154,140,0.18)';
      ctx.lineWidth = 1;
      for (let row = -28; row <= 28; row += 11) {
        ctx.beginPath();
        ctx.moveTo(-60, row);
        ctx.lineTo(60, row);
        ctx.stroke();
      }
      // buttresses
      ctx.fillStyle = '#34352f';
      for (const bx of [-62, -30, 30, 62]) {
        ctx.fillRect(bx - 4, -22, 8, 48);
      }
      // steep roof and broken spire
      ctx.fillStyle = '#242622';
      ctx.beginPath();
      ctx.moveTo(-82, -48);
      ctx.lineTo(82, -48);
      ctx.lineTo(58, -14);
      ctx.lineTo(-58, -14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(132,134,118,0.22)';
      ctx.lineWidth = 1.2;
      for (let i = -72; i <= 72; i += 15) {
        ctx.beginPath();
        ctx.moveTo(i, -45);
        ctx.lineTo(i * 0.78, -16);
        ctx.stroke();
      }
      ctx.fillStyle = '#3b3c36';
      ctx.fillRect(-12, -86, 24, 42);
      ctx.fillStyle = '#242622';
      ctx.beginPath();
      ctx.moveTo(-20, -84);
      ctx.lineTo(0, -108);
      ctx.lineTo(20, -84);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#6b695c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -104);
      ctx.lineTo(0, -92);
      ctx.moveTo(-6, -98);
      ctx.lineTo(6, -98);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(24,24,22,0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -92);
      ctx.lineTo(4, -80);
      ctx.stroke();
      // arched windows and door
      const arch = (x, y, w, h) => {
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        ctx.lineTo(x, y + w * 0.5);
        ctx.quadraticCurveTo(x + w * 0.5, y - w * 0.4, x + w, y + w * 0.5);
        ctx.lineTo(x + w, y + h);
        ctx.closePath();
      };
      ctx.fillStyle = warm ? '#eaa85f' : '#2d2a24';
      arch(-47, -2, 15, 22);
      ctx.fill();
      arch(32, -2, 15, 22);
      ctx.fill();
      ctx.strokeStyle = '#1b1a16';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#26231d';
      arch(-12, 12, 24, 30);
      ctx.fill();
      ctx.strokeStyle = 'rgba(140,132,112,0.28)';
      ctx.stroke();
      // scattered rubble
      ctx.fillStyle = 'rgba(104,104,94,0.48)';
      for (let i = 0; i < 10; i++) {
        const a = i * 2.3;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * (74 + (i % 3) * 9), 34 + Math.sin(a) * 9, 4 + (i % 3) * 3, 2.5 + (i % 2) * 3, a, 0, TAU);
        ctx.fill();
      }
    } else if (s.id === 'mill') {
      // stone base, timber mill body
      ctx.fillStyle = '#3a3a34';
      rr(-66, -26, 132, 68, 4);
      ctx.fill();
      ctx.fillStyle = '#43382b';
      rr(-58, -44, 116, 60, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(146,112,72,0.24)';
      ctx.lineWidth = 1.3;
      for (let i = -50; i <= 50; i += 12) {
        ctx.beginPath();
        ctx.moveTo(i, -42);
        ctx.lineTo(i, 12);
        ctx.stroke();
      }
      ctx.fillStyle = '#251f18';
      ctx.beginPath();
      ctx.moveTo(-74, -48);
      ctx.lineTo(74, -48);
      ctx.lineTo(54, -18);
      ctx.lineTo(-54, -18);
      ctx.closePath();
      ctx.fill();
      // windmill wheel
      const spin = game.time * 0.35 + s.x;
      ctx.save();
      ctx.translate(64, -6);
      ctx.strokeStyle = '#5e4b35';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, TAU);
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = spin + i * (TAU / 4);
        ctx.save();
        ctx.rotate(a);
        ctx.strokeStyle = '#6d573e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(38, 0);
        ctx.stroke();
        ctx.fillStyle = 'rgba(120,104,80,0.62)';
        ctx.beginPath();
        ctx.moveTo(10, -2);
        ctx.lineTo(36, -2);
        ctx.lineTo(36, -15);
        ctx.lineTo(13, -5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(150,124,88,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      warmWindow(-42, -4, 18, 15, warm);
      warmWindow(14, -4, 18, 15, warm);
      ctx.fillStyle = '#251c14';
      rr(-13, 16, 26, 25, 2);
      ctx.fill();
      // grain sacks
      ctx.fillStyle = '#726044';
      ctx.beginPath();
      ctx.ellipse(-56, 34, 9, 12, -0.2, 0, TAU);
      ctx.ellipse(-42, 38, 7, 10, 0.2, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(36,30,20,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-60, 28);
      ctx.lineTo(-52, 30);
      ctx.moveTo(-46, 32);
      ctx.lineTo(-39, 34);
      ctx.stroke();
      ctx.fillStyle = '#3f3328';
      ctx.fillRect(30, -56, 12, 18);
      drawSmoke(36, -58, 0.8);
    } else if (s.id === 'watch') {
      // stilted watchtower
      ctx.strokeStyle = '#4b3826';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-48, 40);
      ctx.lineTo(-30, -28);
      ctx.moveTo(48, 40);
      ctx.lineTo(30, -28);
      ctx.moveTo(-34, 40);
      ctx.lineTo(-18, -24);
      ctx.moveTo(34, 40);
      ctx.lineTo(18, -24);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(120,92,60,0.38)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-44, 20);
      ctx.lineTo(34, 4);
      ctx.moveTo(44, 20);
      ctx.lineTo(-34, 4);
      ctx.stroke();
      // platform and railing
      ctx.fillStyle = '#3a2c1f';
      rr(-58, -34, 116, 24, 3);
      ctx.fill();
      ctx.strokeStyle = '#6b4f32';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-56, -24);
      ctx.lineTo(56, -24);
      ctx.stroke();
      for (let i = -52; i <= 52; i += 13) {
        ctx.beginPath();
        ctx.moveTo(i, -34);
        ctx.lineTo(i, -46);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-56, -44);
      ctx.lineTo(56, -44);
      ctx.stroke();
      // canopy
      ctx.fillStyle = '#241d17';
      ctx.beginPath();
      ctx.moveTo(-68, -60);
      ctx.lineTo(68, -60);
      ctx.lineTo(50, -46);
      ctx.lineTo(-50, -46);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(138,106,68,0.26)';
      ctx.lineWidth = 1;
      for (let i = -58; i <= 58; i += 12) {
        ctx.beginPath();
        ctx.moveTo(i, -58);
        ctx.lineTo(i * 0.8, -47);
        ctx.stroke();
      }
      // ladder
      ctx.strokeStyle = '#5d452e';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-56, 40);
      ctx.lineTo(-38, -28);
      ctx.moveTo(-44, 40);
      ctx.lineTo(-26, -28);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const t = i / 8;
        ctx.beginPath();
        ctx.moveTo(-54 + t * 16, 36 - t * 62);
        ctx.lineTo(-42 + t * 16, 36 - t * 62);
        ctx.stroke();
      }
      // signal lamp and flag
      const pulse = 0.7 + Math.sin(game.time * 3.2 + s.x) * 0.3;
      ctx.fillStyle = `rgba(248,196,112,${0.35 + pulse * 0.35})`;
      ctx.beginPath();
      ctx.arc(8, -34, 5.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffd99a';
      ctx.beginPath();
      ctx.arc(8, -34, 2.2, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(184,150,104,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-36, -60);
      ctx.lineTo(-36, -84);
      ctx.stroke();
      ctx.fillStyle = warm ? 'rgba(190,90,58,0.75)' : 'rgba(130,112,90,0.4)';
      ctx.beginPath();
      ctx.moveTo(-36, -84);
      ctx.lineTo(-14, -78);
      ctx.lineTo(-36, -70);
      ctx.closePath();
      ctx.fill();
    } else if (s.id === 'cabin') {
      // lakeside log cabin
      ctx.fillStyle = '#3e2e20';
      rr(-58, -32, 116, 66, 7);
      ctx.fill();
      ctx.fillStyle = '#493727';
      rr(-52, -26, 104, 54, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(150,112,72,0.26)';
      ctx.lineWidth = 1.3;
      for (let y = -21; y <= 24; y += 8) {
        ctx.beginPath();
        ctx.moveTo(-50, y);
        ctx.lineTo(50, y);
        ctx.stroke();
      }
      ctx.fillStyle = '#2a2016';
      ctx.beginPath();
      ctx.moveTo(-68, -42);
      ctx.lineTo(68, -42);
      ctx.lineTo(50, -8);
      ctx.lineTo(-50, -8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3a2b1d';
      ctx.fillRect(28, -52, 12, 18);
      drawSmoke(34, -54, 0.75);
      warmWindow(-40, 1, 18, 14, warm);
      warmWindow(22, 1, 18, 14, warm);
      ctx.fillStyle = '#241b13';
      rr(-11, 15, 22, 23, 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(239,182,97,0.35)';
      ctx.fillRect(-8, 18, 16, 1.5);
      // net on wall
      ctx.strokeStyle = 'rgba(150,154,132,0.3)';
      ctx.lineWidth = 0.8;
      for (let i = -4; i <= 6; i++) {
        ctx.beginPath();
        ctx.moveTo(-50, 2 + i * 2.3);
        ctx.lineTo(-36, 16 + i * 2.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-36, 2 + i * 2.3);
        ctx.lineTo(-50, 16 + i * 2.3);
        ctx.stroke();
      }
      // dock and boat toward the lake
      ctx.strokeStyle = '#5c442b';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(46, 32);
      ctx.lineTo(104, 62);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(146,112,74,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(44, 38);
      ctx.lineTo(102, 68);
      ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        ctx.beginPath();
        ctx.moveTo(44 + t * 58, 28 + t * 30);
        ctx.lineTo(48 + t * 58, 38 + t * 30);
        ctx.stroke();
      }
      ctx.fillStyle = '#241d17';
      ctx.beginPath();
      ctx.ellipse(103, 72, 16, 6.5, 0.45, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(170,140,96,0.35)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else if (s.id === 'farm') {
      // farmhouse
      ctx.fillStyle = '#3a2d20';
      rr(-72, -30, 70, 64, 4);
      ctx.fill();
      ctx.fillStyle = '#241d16';
      ctx.beginPath();
      ctx.moveTo(-82, -40);
      ctx.lineTo(-2, -40);
      ctx.lineTo(-8, -10);
      ctx.lineTo(-74, -10);
      ctx.closePath();
      ctx.fill();
      warmWindow(-58, 3, 16, 13, warm);
      ctx.fillStyle = '#241b13';
      rr(-34, 12, 20, 22, 2);
      ctx.fill();
      // barn
      ctx.fillStyle = '#5a3126';
      rr(2, -24, 64, 58, 3);
      ctx.fill();
      ctx.fillStyle = '#2c2019';
      ctx.beginPath();
      ctx.moveTo(-2, -28);
      ctx.lineTo(40, -50);
      ctx.lineTo(72, -26);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#42251d';
      ctx.beginPath();
      ctx.moveTo(18, 34);
      ctx.lineTo(18, 0);
      ctx.lineTo(34, -10);
      ctx.lineTo(50, 0);
      ctx.lineTo(50, 34);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(216,206,184,0.36)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, 32);
      ctx.lineTo(48, 2);
      ctx.moveTo(48, 32);
      ctx.lineTo(20, 2);
      ctx.stroke();
      // silo
      ctx.fillStyle = '#565347';
      rr(50, -40, 20, 44, 8);
      ctx.fill();
      ctx.fillStyle = '#6a675a';
      ctx.beginPath();
      ctx.ellipse(60, -40, 10, 5, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(190,190,170,0.18)';
      ctx.lineWidth = 1;
      for (let y = -32; y <= -4; y += 8) {
        ctx.beginPath();
        ctx.moveTo(51, y);
        ctx.lineTo(69, y);
        ctx.stroke();
      }
      // hay bales and fence
      ctx.fillStyle = '#8a744a';
      for (const hx of [-66, -48]) {
        ctx.beginPath();
        ctx.ellipse(hx, 42, 10, 6, 0.1, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(74,60,36,0.55)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(120,94,60,0.44)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(-76 + i * 15, 48);
        ctx.lineTo(-76 + i * 15, 55);
        ctx.stroke();
        if (i < 5) {
          ctx.beginPath();
          ctx.moveTo(-76 + i * 15, 51);
          ctx.lineTo(-61 + i * 15, 51);
          ctx.stroke();
        }
      }
    } else {
      // Ranger's Hut — log walls, porch, woodpile, lantern
      ctx.fillStyle = '#35291d';
      rr(-62, -32, 124, 70, 7);
      ctx.fill();
      ctx.fillStyle = '#413225';
      rr(-56, -26, 112, 58, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(140,104,66,0.26)';
      ctx.lineWidth = 1.3;
      for (let y = -21; y <= 27; y += 9) {
        ctx.beginPath();
        ctx.moveTo(-54, y);
        ctx.lineTo(54, y);
        ctx.stroke();
      }
      ctx.fillStyle = '#251d16';
      ctx.beginPath();
      ctx.moveTo(-74, -44);
      ctx.lineTo(74, -44);
      ctx.lineTo(56, -6);
      ctx.lineTo(-56, -6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(134,100,64,0.24)';
      ctx.lineWidth = 1;
      for (let i = -64; i <= 64; i += 15) {
        ctx.beginPath();
        ctx.moveTo(i, -41);
        ctx.lineTo(i * 0.78, -8);
        ctx.stroke();
      }
      ctx.fillStyle = '#3f3328';
      ctx.fillRect(32, -58, 13, 20);
      drawSmoke(38, -60, 0.85);
      warmWindow(-46, 2, 18, 14, warm);
      warmWindow(27, 2, 18, 14, warm);
      ctx.fillStyle = '#241b13';
      rr(-12, 17, 24, 24, 2);
      ctx.fill();
      // porch
      ctx.fillStyle = '#2d2319';
      rr(-66, 30, 132, 13, 2);
      ctx.fill();
      ctx.strokeStyle = '#5b422a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-58, 30);
      ctx.lineTo(-58, 14);
      ctx.moveTo(58, 30);
      ctx.lineTo(58, 14);
      ctx.stroke();
      // lantern
      ctx.fillStyle = 'rgba(250,190,110,0.22)';
      ctx.beginPath();
      ctx.arc(19, 24, 8, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffd590';
      ctx.beginPath();
      ctx.arc(19, 24, 2.4, 0, TAU);
      ctx.fill();
      // woodpile
      ctx.strokeStyle = '#6b4b2c';
      ctx.lineWidth = 2.2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(74 + (i % 2) * 5, 24 - Math.floor(i / 2) * 7, 5, 0, TAU);
        ctx.stroke();
      }
      // trail sign
      ctx.fillStyle = '#3d3023';
      ctx.fillRect(-74, 26, 4, 22);
      ctx.fillStyle = '#7a5c3a';
      rr(-86, 20, 18, 10, 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(24,20,15,0.6)';
      ctx.fillRect(-82, 24, 10, 1.4);
    }
    ctx.restore();
  }

  function drawShelterInterior(s) {
    ctx.save();
    ctx.translate(s.x, s.y);
    const stone = s.id === 'chapel' || s.id === 'mill';
    const floor = stone ? '#343631' : '#3a2c20';
    const floorLight = stone ? '#454741' : '#4b3828';

    // cutaway shadow and floor plan
    ctx.fillStyle = 'rgba(2,4,3,0.5)';
    ctx.beginPath();
    ctx.ellipse(8, 22, 96, 62, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#241b14';
    rr(-88, -58, 176, 116, 12);
    ctx.fill();
    ctx.fillStyle = floor;
    rr(-79, -48, 158, 96, 7);
    ctx.fill();

    if (stone) {
      ctx.strokeStyle = 'rgba(170,172,158,0.12)';
      ctx.lineWidth = 1;
      for (let row = -40; row <= 40; row += 12) {
        ctx.beginPath();
        ctx.moveTo(-78, row);
        ctx.lineTo(78, row);
        ctx.stroke();
        for (let col = -72; col <= 72; col += 24) {
          const off = (Math.floor((row + 40) / 12) % 2) * 12;
          ctx.beginPath();
          ctx.moveTo(col + off, row);
          ctx.lineTo(col + off, row + 12);
          ctx.stroke();
        }
      }
    } else {
      ctx.strokeStyle = 'rgba(160,118,78,0.18)';
      ctx.lineWidth = 1;
      for (let x = -70; x <= 70; x += 14) {
        ctx.beginPath();
        ctx.moveTo(x, -46);
        ctx.lineTo(x, 46);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(30,22,16,0.38)';
      for (let y = -34; y <= 38; y += 14) {
        ctx.beginPath();
        ctx.moveTo(-76, y);
        ctx.lineTo(76, y);
        ctx.stroke();
      }
    }

    // back wall / cutaway timbers
    ctx.fillStyle = '#2b2118';
    rr(-84, -56, 168, 14, 4);
    ctx.fill();
    ctx.strokeStyle = stone ? 'rgba(176,178,162,0.18)' : 'rgba(184,138,88,0.26)';
    ctx.lineWidth = 2;
    for (let x = -72; x <= 72; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, -54);
      ctx.lineTo(x, -44);
      ctx.stroke();
    }
    // side walls
    ctx.fillStyle = floorLight;
    ctx.fillRect(-86, -44, 10, 88);
    ctx.fillRect(76, -44, 10, 88);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(-86, -44, 10, 88);
    ctx.fillRect(76, -44, 10, 88);

    // rug
    ctx.fillStyle = s.id === 'chapel' ? 'rgba(96,54,46,0.5)' : 'rgba(96,62,40,0.55)';
    rr(-40, -10, 80, 50, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(208,166,104,0.2)';
    ctx.lineWidth = 1.5;
    rr(-34, -4, 68, 38, 6);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(208,166,104,0.12)';
    ctx.beginPath();
    ctx.moveTo(-34, 0);
    ctx.lineTo(34, 0);
    ctx.stroke();

    // warm hearth / lamps
    const glow = 0.55 + Math.sin(game.time * 5 + s.x) * 0.15;
    ctx.fillStyle = `rgba(239,168,92,${0.12 + glow * 0.08})`;
    ctx.beginPath();
    ctx.arc(0, 12, 72, 0, TAU);
    ctx.fill();

    if (s.id === 'ranger' || s.id === 'cabin' || s.id === 'farm') {
      // cot
      ctx.fillStyle = '#2e241b';
      rr(-72, -30, 40, 22, 4);
      ctx.fill();
      ctx.fillStyle = '#6b6650';
      rr(-69, -27, 34, 16, 3);
      ctx.fill();
      ctx.fillStyle = '#8b8268';
      rr(-69, -27, 14, 10, 3);
      ctx.fill();
      // table and map
      ctx.fillStyle = '#5a4029';
      rr(18, -38, 38, 26, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(196,178,128,0.6)';
      ctx.fillRect(23, -33, 28, 16);
      ctx.strokeStyle = 'rgba(80,66,44,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(26, -26);
      ctx.lineTo(47, -33);
      ctx.moveTo(26, -18);
      ctx.lineTo(47, -24);
      ctx.stroke();
      // hearth
      ctx.fillStyle = '#3a3128';
      rr(-82, -12, 16, 46, 4);
      ctx.fill();
      ctx.fillStyle = '#d9843f';
      ctx.beginPath();
      ctx.ellipse(-72, 20, 6, 4 + Math.sin(game.time * 7) * 1.2, 0, 0, TAU);
      ctx.fill();
      // shelves
      ctx.fillStyle = '#3c2d20';
      ctx.fillRect(28, -54, 34, 5);
      ctx.fillStyle = '#7c6239';
      for (let i = 0; i < 4; i++) ctx.fillRect(31 + i * 7, -52, 4, 3);
      // hanging lantern
      ctx.strokeStyle = 'rgba(90,70,46,0.8)';
      ctx.beginPath();
      ctx.moveTo(0, -52);
      ctx.lineTo(0, -40);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,212,144,${0.75 + glow * 0.2})`;
      ctx.beginPath();
      ctx.arc(0, -38, 3.5, 0, TAU);
      ctx.fill();
    } else if (s.id === 'chapel') {
      // pews and altar
      ctx.fillStyle = '#4a3424';
      for (let i = 0; i < 3; i++) {
        rr(-58 + i * 8, -18 + i * 18, 66, 7, 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(150,114,74,0.18)';
        ctx.fillRect(-58 + i * 8, -18 + i * 18, 66, 2);
        ctx.fillStyle = '#4a3424';
      }
      ctx.fillStyle = '#5c4a34';
      rr(26, -42, 46, 14, 3);
      ctx.fill();
      ctx.fillStyle = '#d8c592';
      ctx.fillRect(32, -46, 3, 10);
      ctx.fillRect(58, -46, 3, 10);
      ctx.fillStyle = '#f2c96e';
      ctx.beginPath();
      ctx.arc(33.5, -47, 2.2, 0, TAU);
      ctx.arc(59.5, -47, 2.2, 0, TAU);
      ctx.fill();
      // cross
      ctx.strokeStyle = 'rgba(160,154,132,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(76, -38);
      ctx.lineTo(76, -18);
      ctx.moveTo(70, -30);
      ctx.lineTo(82, -30);
      ctx.stroke();
    } else if (s.id === 'mill') {
      // gears and grain
      ctx.strokeStyle = '#5b4a34';
      ctx.lineWidth = 3;
      for (const g of [[-60, -22, 16], [-28, -34, 10], [52, -26, 12]]) {
        ctx.beginPath();
        ctx.arc(g[0], g[1], g[2], 0, TAU);
        ctx.stroke();
        for (let i = 0; i < 8; i++) {
          const a = i * (TAU / 8);
          ctx.beginPath();
          ctx.moveTo(g[0] + Math.cos(a) * g[2], g[1] + Math.sin(a) * g[2]);
          ctx.lineTo(g[0] + Math.cos(a) * (g[2] + 4), g[1] + Math.sin(a) * (g[2] + 4));
          ctx.stroke();
        }
      }
      ctx.fillStyle = '#6d5a3f';
      ctx.beginPath();
      ctx.ellipse(-52, 30, 12, 15, 0.15, 0, TAU);
      ctx.ellipse(-32, 34, 9, 12, -0.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#5a4029';
      rr(20, -34, 44, 24, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(198,178,124,0.5)';
      ctx.beginPath();
      ctx.ellipse(42, -22, 15, 8, 0, 0, TAU);
      ctx.fill();
    } else if (s.id === 'watch') {
      // tower room: cot, radio, telescope
      ctx.fillStyle = '#2e241b';
      rr(-68, -28, 38, 20, 4);
      ctx.fill();
      ctx.fillStyle = '#756b50';
      rr(-65, -25, 32, 14, 3);
      ctx.fill();
      ctx.fillStyle = '#5a4029';
      rr(18, 18, 42, 25, 3);
      ctx.fill();
      ctx.fillStyle = '#3b3a32';
      rr(24, 8, 20, 12, 2);
      ctx.fill();
      ctx.fillStyle = '#a7c5a2';
      ctx.fillRect(28, 11, 8, 3);
      ctx.strokeStyle = '#6b5a3c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(62, 30);
      ctx.lineTo(48, -2);
      ctx.lineTo(58, -28);
      ctx.stroke();
      ctx.fillStyle = '#8b9a8e';
      ctx.beginPath();
      ctx.arc(48, -2, 4, 0, TAU);
      ctx.fill();
      // hatch
      ctx.strokeStyle = 'rgba(140,110,76,0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-16, 32, 30, 14);
      ctx.beginPath();
      ctx.moveTo(-16, 39);
      ctx.lineTo(14, 39);
      ctx.stroke();
    }

    // subtle interior vignette / roof edge
    ctx.strokeStyle = 'rgba(214,178,118,0.12)';
    ctx.lineWidth = 1.5;
    rr(-82, -51, 164, 102, 8);
    ctx.stroke();
    ctx.restore();
  }

  function drawShelter(s) {
    const st = s.state;
    const active = s.id === game.activeShelter;
    const near = dist(player.x, player.y, s.x, s.y) < 620;
    const inside = game.inShelter === s.id;

    if (st.collapsed) {
      ctx.fillStyle = 'rgba(60,38,24,0.5)';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + 6, 96, 54, 0.2, 0, TAU);
      ctx.fill();
      ctx.save();
      ctx.translate(s.x, s.y + 10);
      ctx.rotate(-0.18);
      ctx.fillStyle = '#3a2b1f';
      ctx.fillRect(-72, -11, 144, 22);
      ctx.rotate(0.43);
      ctx.fillRect(-50, -13, 100, 17);
      ctx.rotate(-0.72);
      ctx.fillRect(-40, -9, 84, 14);
      ctx.restore();
      ctx.fillStyle = 'rgba(120,105,88,0.28)';
      for (let i = 0; i < 18; i++) {
        const a = i * 2.399;
        const r = 26 + (i % 5) * 13;
        ctx.beginPath();
        ctx.arc(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r * 0.72, 5 + (i % 3) * 4, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(140,98,60,0.4)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const a = i * 1.7;
        ctx.beginPath();
        ctx.moveTo(s.x - 40 + i * 18, s.y + 16);
        ctx.lineTo(s.x - 30 + i * 18, s.y - 18 - (i % 2) * 10);
        ctx.stroke();
      }
      if (near) {
        ctx.font = '600 10px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(199,188,170,0.4)';
        ctx.fillText(`${s.name.toUpperCase()} · COLLAPSED`, s.x, s.y - 64);
      }
      return;
    }

    // clearing
    ctx.fillStyle = active ? 'rgba(92,76,48,0.3)' : 'rgba(78,66,45,0.22)';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + 12, 158, 116, 0, 0, TAU);
    ctx.fill();
    if (active) {
      ctx.strokeStyle = 'rgba(239,182,97,0.16)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + 12, 158, 116, 0, 0, TAU);
      ctx.stroke();
    }

    // barricade ring
    if (st.owned) drawBarricade(s);

    if (inside) {
      drawShelterInterior(s);
    } else {
      drawShelterExterior(s, st.owned);
      drawShelterFire(s.x, s.y + 62, st.owned);
    }

    // traps
    if (st.traps > 0) {
      const count = Math.round(st.traps / 3);
      ctx.fillStyle = '#8c9b91';
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU + 0.1;
        const tx = s.x + Math.cos(a) * (s.radius + 17);
        const ty = s.y + Math.sin(a) * (s.radius + 17);
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(a + Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(3.5, 4);
        ctx.lineTo(-3.5, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // label
    if (near && !inside) {
      ctx.font = '600 11px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = active ? 'rgba(244,210,154,0.92)' : st.haunt >= 2 ? 'rgba(240,139,114,0.75)' : 'rgba(239,228,207,0.52)';
      ctx.fillText(s.name.toUpperCase(), s.x, s.y - 72);
    }
  }

  function drawBarricade(s) {
    const st = s.state;
    const frac = st.maxIntegrity > 0 ? clamp(st.integrity / st.maxIntegrity, 0, 1) : 0;
    const count = 28;
    const start = -Math.PI * 0.86;
    const sweep = Math.PI * 1.72;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(start);
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const a = t * sweep;
      const intact = t < frac;
      ctx.save();
      ctx.rotate(a);
      ctx.strokeStyle = intact ? (i % 3 === 0 ? '#9a7040' : '#6b4b2c') : 'rgba(77,55,33,0.35)';
      ctx.lineWidth = intact ? 7 : 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.radius - 4, 0);
      ctx.lineTo(s.radius + 7, 0);
      ctx.stroke();
      if (intact) {
        ctx.strokeStyle = 'rgba(184,139,83,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(s.radius - 2, -2);
        ctx.lineTo(s.radius + 4, -2);
        ctx.stroke();
      }
      ctx.restore();
    }
    // posts
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * TAU;
      ctx.fillStyle = 'rgba(50,36,23,0.9)';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * s.radius, Math.sin(a) * s.radius, 3.5, 0, TAU);
      ctx.fill();
    }
    if (st.hit > 0) {
      ctx.strokeStyle = `rgba(255,180,110,${st.hit * 3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, s.radius, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawNodes(bounds) {
    for (const n of resourceNodes) {
      if (n.x < bounds.left || n.x > bounds.right || n.y < bounds.top || n.y > bounds.bottom) continue;
      const depleted = n.uses <= 0 || n.respawn > 0;
      const hovered = game.prompt && game.prompt.target === n;
      ctx.save();
      ctx.translate(n.x, n.y);
      if (hovered) {
        const pulse = 0.5 + Math.sin(game.time * 5) * 0.25;
        ctx.strokeStyle = `rgba(239,182,97,${0.35 + pulse * 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 25 + Math.sin(game.time * 4) * 3, 0, TAU);
        ctx.stroke();
      }
      if (depleted) {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#3b3125';
        ctx.beginPath();
        ctx.ellipse(0, 4, 12, 5, 0, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
        continue;
      }
      if (n.type === 'wood') {
        ctx.rotate(n.seed);
        ctx.fillStyle = 'rgba(3,7,5,0.35)';
        ctx.beginPath();
        ctx.ellipse(3, 6, 17, 7, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#6e4c2d';
        rr(-15, -5, 30, 10, 5); ctx.fill();
        ctx.fillStyle = '#9a6c3f';
        ctx.beginPath(); ctx.ellipse(13, 0, 4, 4.4, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#c09261';
        ctx.beginPath(); ctx.ellipse(13, 0, 1.8, 2, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#553a23';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-7, -4); ctx.lineTo(-10, -11); ctx.moveTo(2, -5); ctx.lineTo(1, -12); ctx.stroke();
      } else if (n.type === 'stone') {
        ctx.fillStyle = 'rgba(3,7,5,0.32)';
        ctx.beginPath(); ctx.ellipse(2, 6, 15, 7, 0, 0, TAU); ctx.fill();
        const stones = [[-9, 2, 8], [2, -3, 10], [10, 4, 7]];
        for (const [x, y, r] of stones) {
          ctx.fillStyle = '#737b79';
          ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(196,204,198,0.22)';
          ctx.beginPath(); ctx.arc(x - 2, y - 3, r * 0.5, 0, TAU); ctx.fill();
        }
      } else {
        ctx.rotate(n.seed * 0.4);
        ctx.fillStyle = 'rgba(3,7,5,0.32)';
        ctx.beginPath(); ctx.ellipse(2, 6, 15, 7, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#527a72';
        rr(-14, -7, 20, 14, 2); ctx.fill();
        ctx.fillStyle = '#7fb2a5';
        rr(-8, -3, 12, 6, 1); ctx.fill();
        ctx.fillStyle = '#3f5d57';
        ctx.beginPath(); ctx.arc(10, 2, 6, 0, TAU); ctx.fill();
        ctx.fillStyle = '#8caea5';
        ctx.beginPath(); ctx.arc(10, 2, 2.2, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawFigure(x, y, angle, color, opts) {
    opts = opts || {};
    const walk = opts.walk || 0;
    const size = opts.size || 1;
    const role = opts.role || 'scout';
    const bob = Math.sin(walk * 2) * 0.55;
    ctx.save();
    ctx.translate(x, y + bob);

    ctx.fillStyle = 'rgba(2,5,4,0.42)';
    ctx.beginPath();
    ctx.ellipse(0, 14.5 * size, 13.5 * size, 6.2 * size, 0, 0, TAU);
    ctx.fill();

    // pack and bedroll, carried opposite the aim
    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = '#2a241c';
    rr(-17 * size, -6 * size, 9 * size, 12 * size, 3 * size);
    ctx.fill();
    ctx.fillStyle = '#4d3f2d';
    rr(-15.5 * size, -4.5 * size, 5.5 * size, 9 * size, 2 * size);
    ctx.fill();
    ctx.strokeStyle = 'rgba(170,140,94,0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-14 * size, -4 * size);
    ctx.lineTo(-14 * size, 4 * size);
    ctx.stroke();
    ctx.restore();

    const leg = Math.sin(walk) * 4.2 * size;
    ctx.strokeStyle = '#1b221f';
    ctx.lineWidth = 4.2 * size;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4 * size, 7 * size);
    ctx.lineTo(-4 * size + leg, 15.5 * size);
    ctx.moveTo(4 * size, 7 * size);
    ctx.lineTo(4 * size - leg, 15.5 * size);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(116,96,68,0.5)';
    ctx.lineWidth = 1.8 * size;
    ctx.beginPath();
    ctx.moveTo(-4 * size + leg, 14 * size);
    ctx.lineTo(-2 * size + leg, 15.8 * size);
    ctx.moveTo(4 * size - leg, 14 * size);
    ctx.lineTo(2 * size - leg, 15.8 * size);
    ctx.stroke();

    // coat tails
    ctx.fillStyle = 'rgba(20,28,25,0.6)';
    ctx.beginPath();
    ctx.moveTo(-7 * size, 5 * size);
    ctx.quadraticCurveTo(-12 * size, 12 * size, -8 * size + leg * 0.4, 16 * size);
    ctx.lineTo(-2 * size, 6 * size);
    ctx.closePath();
    ctx.fill();

    // torso
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 1 * size, 9.5 * size, 12.5 * size, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(240,236,214,0.16)';
    ctx.beginPath();
    ctx.ellipse(-2.5 * size, -2 * size, 4.3 * size, 6.8 * size, 0.28, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(5,12,10,0.26)';
    ctx.beginPath();
    ctx.ellipse(4 * size, 4 * size, 3 * size, 6 * size, -0.25, 0, TAU);
    ctx.fill();
    // belt and pouches
    ctx.strokeStyle = 'rgba(28,24,18,0.8)';
    ctx.lineWidth = 1.6 * size;
    ctx.beginPath();
    ctx.moveTo(-7 * size, 5 * size);
    ctx.lineTo(7 * size, 5 * size);
    ctx.stroke();
    ctx.fillStyle = '#55452f';
    ctx.fillRect(-5 * size, 4 * size, 3 * size, 4 * size);
    ctx.fillRect(2 * size, 4 * size, 3 * size, 4 * size);

    // off-hand and weapon arm
    ctx.strokeStyle = '#232c28';
    ctx.lineWidth = 3.2 * size;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6 * size, -3 * size);
    ctx.lineTo(-11 * size, 4 * size);
    ctx.stroke();
    ctx.save();
    ctx.rotate(angle);
    ctx.strokeStyle = '#26302b';
    ctx.lineWidth = 3.6 * size;
    ctx.beginPath();
    ctx.moveTo(2 * size, -2 * size);
    ctx.lineTo(13 * size, 1.5 * size);
    ctx.stroke();
    // role-specific weapon silhouette
    if (role === 'hunter') {
      ctx.fillStyle = '#3d3a31';
      ctx.fillRect(11 * size, -0.5 * size, 20 * size, 2.4 * size);
      ctx.fillStyle = '#6f5f43';
      ctx.fillRect(14 * size, -2.2 * size, 5 * size, 2 * size);
      ctx.fillStyle = '#2a2721';
      ctx.fillRect(29 * size, 0, 5 * size, 1.4 * size);
    } else if (role === 'medic') {
      ctx.fillStyle = '#3d3a31';
      ctx.fillRect(11 * size, 0, 10 * size, 2.2 * size);
      ctx.fillStyle = '#8e6a4c';
      ctx.fillRect(9 * size, -1.4 * size, 3 * size, 5 * size);
    } else if (role === 'engineer') {
      ctx.strokeStyle = '#8d9691';
      ctx.lineWidth = 2 * size;
      ctx.beginPath();
      ctx.moveTo(11 * size, 1 * size);
      ctx.lineTo(22 * size, 1 * size);
      ctx.moveTo(20 * size, -2 * size);
      ctx.lineTo(24 * size, 4 * size);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#3d3a31';
      ctx.fillRect(11 * size, 0, 14 * size, 2.1 * size);
      ctx.fillStyle = '#7c6b4e';
      ctx.fillRect(22 * size, -0.2 * size, 4 * size, 2.5 * size);
    }
    ctx.restore();

    // head and scarf
    ctx.fillStyle = '#cda47e';
    ctx.beginPath();
    ctx.arc(0, -10 * size, 6 * size, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,238,206,0.2)';
    ctx.beginPath();
    ctx.arc(-1.5 * size, -11.5 * size, 3.2 * size, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = role === 'scout' ? 'rgba(142,182,196,0.7)' : 'rgba(120,104,82,0.55)';
    ctx.lineWidth = 2 * size;
    ctx.beginPath();
    ctx.arc(0, -6.5 * size, 5.3 * size, 0.16, Math.PI - 0.16);
    ctx.stroke();
    if (opts.hat) {
      ctx.fillStyle = opts.hat;
      ctx.beginPath();
      ctx.ellipse(0, -14 * size, 9 * size, 3.3 * size, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -15.6 * size, 4.4 * size, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(232,224,200,0.14)';
      ctx.beginPath();
      ctx.arc(-1 * size, -16.5 * size, 1.6 * size, 0, TAU);
      ctx.fill();
    }
    // role mark
    ctx.fillStyle = 'rgba(235,228,208,0.68)';
    if (role === 'medic') {
      ctx.fillRect(-1.2 * size, -1.5 * size, 2.4 * size, 6 * size);
      ctx.fillRect(-3 * size, 0.6 * size, 6 * size, 2.4 * size);
    } else if (role === 'engineer') {
      ctx.strokeStyle = 'rgba(235,228,208,0.62)';
      ctx.lineWidth = 1.2 * size;
      ctx.beginPath();
      ctx.arc(0.4 * size, 1.5 * size, 2.4 * size, 0.4, 5.5);
      ctx.stroke();
    } else if (role === 'hunter') {
      ctx.save();
      ctx.rotate(-0.6);
      ctx.fillStyle = 'rgba(235,228,208,0.5)';
      for (let i = 0; i < 3; i++) ctx.fillRect(-4 * size + i * 2.6 * size, 1 * size, 1.2 * size, 3.6 * size);
      ctx.restore();
    }

    if (opts.lantern) {
      ctx.fillStyle = 'rgba(248,180,90,0.3)';
      ctx.beginPath();
      ctx.arc(-12 * size, 2 * size, 10 * size, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(72,56,36,0.9)';
      ctx.lineWidth = 1.2 * size;
      ctx.beginPath();
      ctx.arc(-12 * size, 2 * size, 3 * size, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = '#ffd08a';
      ctx.beginPath();
      ctx.arc(-12 * size, 2 * size, 2.5 * size, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPlayer() {
    const blink = player.invuln > 0 && Math.floor(game.time * 22) % 2 === 0;
    const bob = player.moving ? Math.sin(player.walk * 2) * 0.7 : 0;
    ctx.save();
    ctx.globalAlpha = blink ? 0.55 : 1;
    ctx.translate(player.x, player.y + bob);

    ctx.fillStyle = 'rgba(2,5,4,0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 16, 15, 7, 0, 0, TAU);
    ctx.fill();

    // pack, bedroll, canteen
    ctx.save();
    ctx.rotate(player.aim);
    ctx.fillStyle = '#2c251c';
    rr(-20, -7, 11, 14, 3);
    ctx.fill();
    ctx.fillStyle = '#5b4931';
    rr(-18, -5, 7, 10, 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(186,150,96,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-16.5, -5);
    ctx.lineTo(-16.5, 5);
    ctx.stroke();
    ctx.fillStyle = '#3f5b57';
    ctx.beginPath();
    ctx.ellipse(-20, 0, 3.2, 4.5, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    const leg = Math.sin(player.walk) * 4.8;
    ctx.strokeStyle = '#1a211e';
    ctx.lineWidth = 4.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, 7);
    ctx.lineTo(-4 + leg, 16.5);
    ctx.moveTo(4, 7);
    ctx.lineTo(4 - leg, 16.5);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120,100,70,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4 + leg, 15);
    ctx.lineTo(-2 + leg, 16.8);
    ctx.moveTo(4 - leg, 15);
    ctx.lineTo(2 - leg, 16.8);
    ctx.stroke();

    // long coat tails
    ctx.fillStyle = 'rgba(18,27,24,0.72)';
    ctx.beginPath();
    ctx.moveTo(-8, 4);
    ctx.quadraticCurveTo(-14, 13, -9 + leg * 0.4, 18);
    ctx.lineTo(-1, 6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, 4);
    ctx.quadraticCurveTo(14, 13, 9 - leg * 0.4, 18);
    ctx.lineTo(1, 6);
    ctx.closePath();
    ctx.fill();

    // coat body
    ctx.fillStyle = '#3c514c';
    ctx.beginPath();
    ctx.ellipse(0, 1, 10.5, 13.6, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#4e6962';
    ctx.beginPath();
    ctx.ellipse(-2.4, -2, 4.8, 7.6, 0.25, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(8,16,13,0.28)';
    ctx.beginPath();
    ctx.ellipse(4.5, 4, 3.2, 6.5, -0.25, 0, TAU);
    ctx.fill();
    // shoulder mantle
    ctx.strokeStyle = '#2a3a35';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -4, 8, 3.55, 5.85);
    ctx.stroke();
    // belt, pouches, badge
    ctx.strokeStyle = 'rgba(26,22,16,0.82)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-7.5, 5);
    ctx.lineTo(7.5, 5);
    ctx.stroke();
    ctx.fillStyle = '#5b4a32';
    ctx.fillRect(-6, 4, 3.4, 4.5);
    ctx.fillRect(2.6, 4, 3.4, 4.5);
    ctx.fillStyle = 'rgba(224,196,132,0.8)';
    ctx.fillRect(-1.4, 4.6, 2.8, 2.8);
    // scarf
    ctx.strokeStyle = 'rgba(176,144,98,0.8)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, -6, 5.7, 0.12, Math.PI - 0.12);
    ctx.stroke();

    // lantern hand
    ctx.strokeStyle = '#26302c';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-7, -2);
    ctx.lineTo(-13, 3);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(58,44,28,0.9)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(-13.5, 4, 4, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = 'rgba(248,180,90,0.32)';
    ctx.beginPath();
    ctx.arc(-13.5, 4, 10.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffd08a';
    ctx.beginPath();
    ctx.arc(-13.5, 4, 2.8, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,244,206,0.9)';
    ctx.beginPath();
    ctx.arc(-14.3, 3.2, 1.1, 0, TAU);
    ctx.fill();

    // gun arm
    ctx.save();
    ctx.rotate(player.aim);
    ctx.strokeStyle = '#27322d';
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(1, -2);
    ctx.lineTo(15, 1.5);
    ctx.stroke();
    ctx.fillStyle = '#5f4a33';
    ctx.beginPath();
    ctx.ellipse(14, 1.5, 3.2, 3.8, 0, 0, TAU);
    ctx.fill();
    // revolver
    ctx.fillStyle = '#3b4642';
    rr(15, -1.4, 13, 4, 1.4);
    ctx.fill();
    ctx.fillStyle = '#58645e';
    ctx.fillRect(26, -0.6, 6, 2.3);
    ctx.fillStyle = '#8c7a5e';
    ctx.fillRect(21, -2.2, 4, 2.6);
    ctx.strokeStyle = '#202a26';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(20, 0.6, 2.3, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = 'rgba(210,214,198,0.5)';
    ctx.fillRect(28.5, -0.3, 1.5, 1.4);
    ctx.restore();

    // head, hair, hat
    ctx.fillStyle = '#d0a77f';
    ctx.beginPath();
    ctx.arc(0, -10, 6.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,239,208,0.22)';
    ctx.beginPath();
    ctx.arc(-1.6, -11.4, 3.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#3a2a20';
    ctx.beginPath();
    ctx.arc(0, -13.6, 5.6, Math.PI, TAU);
    ctx.fill();
    ctx.fillStyle = '#2c3a35';
    ctx.beginPath();
    ctx.ellipse(0, -14.8, 9.8, 3.7, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -16.4, 4.7, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(148,132,100,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8.5, -14.6);
    ctx.lineTo(8.5, -14.6);
    ctx.stroke();

    if (player.hitFlash > 0) {
      ctx.fillStyle = `rgba(255,90,70,${player.hitFlash * 2.2})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 18, 0, 0, TAU);
      ctx.fill();
    }
    if (game.muzzle > 0) {
      const mx = Math.cos(player.aim) * 34;
      const my = Math.sin(player.aim) * 34;
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(player.aim);
      ctx.fillStyle = 'rgba(255,210,130,0.95)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(11, -4.5);
      ctx.lineTo(6, 0);
      ctx.lineTo(11, 4.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,246,210,0.9)';
      ctx.beginPath();
      ctx.arc(1, 0, 2.4, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawCompanion(c) {
    if (c.state === 'dead') return;
    const def = ROLES[c.role];
    const blink = c.invuln > 0 && Math.floor(game.time * 22) % 2 === 0;
    ctx.save();
    ctx.globalAlpha = blink ? 0.55 : 1;
    drawFigure(c.x, c.y, c.angle, def.color, {
      size: c.state === 'wild' ? 0.95 : 0.9,
      walk: c.state === 'team' || c.state === 'travel' ? game.time * 8 + c.seed : 0,
      hat: c.state === 'wild' ? '#3a3328' : '#31403a',
      lantern: c.state === 'wild',
      role: c.role
    });
    if (c.hitFlash > 0) {
      ctx.fillStyle = `rgba(255,120,90,${c.hitFlash * 1.8})`;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y - 1, 13, 17, 0, 0, TAU);
      ctx.fill();
    }
    const show = c.state !== 'team' || dist(player.x, player.y, c.x, c.y) < 520;
    if (show) {
      // role marker
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(c.x, c.y - 30, 2.2, 0, TAU);
      ctx.fill();
      ctx.font = '600 9px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = c.state === 'wild' ? 'rgba(244,210,154,0.9)' : 'rgba(214,204,184,0.78)';
      ctx.fillText(c.name.toUpperCase(), c.x, c.y - 25);
      if (c.state === 'wild') {
        const bob = Math.sin(game.time * 2.4 + c.seed) * 2;
        ctx.fillStyle = 'rgba(239,182,97,0.85)';
        ctx.beginPath();
        ctx.moveTo(c.x, c.y - 48 + bob);
        ctx.lineTo(c.x + 5, c.y - 41 + bob);
        ctx.lineTo(c.x, c.y - 34 + bob);
        ctx.lineTo(c.x - 5, c.y - 41 + bob);
        ctx.closePath();
        ctx.fill();
        ctx.font = 'italic 8.5px Georgia, serif';
        ctx.fillStyle = 'rgba(239,182,97,0.66)';
        ctx.fillText(`${def.label.toUpperCase()} · ALONE`, c.x, c.y - 17);
      } else if (c.state === 'shelter') {
        ctx.font = 'italic 8.5px Georgia, serif';
        ctx.fillStyle = 'rgba(127,178,165,0.74)';
        ctx.fillText('HOLDING SHELTER', c.x, c.y - 17);
      } else if (c.state === 'travel') {
        ctx.font = 'italic 8.5px Georgia, serif';
        ctx.fillStyle = 'rgba(199,188,170,0.58)';
        ctx.fillText('MOVING', c.x, c.y - 17);
      }
      if (c.hp < c.maxHp) {
        ctx.fillStyle = 'rgba(4,8,7,0.7)';
        ctx.fillRect(c.x - 13, c.y - 22, 26, 3);
        ctx.fillStyle = c.hp / c.maxHp > 0.3 ? '#8fb98f' : '#d5533f';
        ctx.fillRect(c.x - 13, c.y - 22, 26 * (c.hp / c.maxHp), 3);
      }
    }
    ctx.restore();
  }

  function drawEnemy(e) {
    if (e.dead) return;
    const def = ENEMY_TYPES[e.type];
    const wob = Math.sin(game.time * 4 + e.seed);
    const pulse = 0.5 + Math.sin(game.time * 3.2 + e.seed) * 0.5;
    ctx.save();
    ctx.translate(e.x, e.y);

    // shadow
    ctx.fillStyle = 'rgba(2,4,4,0.48)';
    ctx.beginPath();
    ctx.ellipse(0, e.r * 0.82, e.r * 1.08, e.r * 0.42, 0, 0, TAU);
    ctx.fill();

    if (e.type === 'flesh') {
      // SCP-610 — a person-shaped infection
      ctx.fillStyle = '#3a1e22';
      const lobes = [[0, 0, 11], [-8, 3, 8], [8, 4, 8], [-1, -9, 9], [2, 9, 7]];
      for (const l of lobes) {
        ctx.beginPath();
        ctx.ellipse(l[0] + wob * 0.8, l[1], l[2], l[2] * 0.82, 0.3, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#59262c';
      ctx.beginPath();
      ctx.ellipse(-2, 0, 7, 9, 0.2, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(184,58,52,0.45)';
      ctx.lineWidth = 1.1;
      for (let i = 0; i < 5; i++) {
        const a = i * 1.35 + e.seed;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
        ctx.quadraticCurveTo(Math.cos(a) * 11 + wob, Math.sin(a) * 10, Math.cos(a) * 8, Math.sin(a) * 14);
        ctx.stroke();
      }
      ctx.fillStyle = '#9f4a3b';
      for (let i = 0; i < 6; i++) {
        const a = i * 1.9 + e.seed;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 8, Math.sin(a) * 8, 1.3 + (i % 3) * 0.6, 0, TAU);
        ctx.fill();
      }
      // tendrils
      ctx.strokeStyle = '#4a2228';
      ctx.lineWidth = 2;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * 7, 2);
        ctx.quadraticCurveTo(side * 16, 6 + wob * 3, side * 19, 12 + wob * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(side * 5, -5);
        ctx.quadraticCurveTo(side * 14, -8, side * 16, -14);
        ctx.stroke();
      }
      // mismatched eyes
      ctx.fillStyle = def.eye;
      ctx.shadowColor = def.eye;
      ctx.shadowBlur = 7;
      for (const eye of [[-5, -8, 1.7], [4, -10, 1.3], [0, -2, 1.1]]) {
        ctx.beginPath();
        ctx.arc(eye[0], eye[1], eye[2], 0, TAU);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    } else if (e.type === 'statue') {
      // SCP-173 — concrete, rebar, and a neck that should not turn
      if (!e.frozen) {
        ctx.strokeStyle = 'rgba(176,178,160,0.18)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(-Math.cos(e.angle) * (e.r + 8 + i * 6), -Math.sin(e.angle) * (e.r + 8 + i * 6) + i * 4);
          ctx.lineTo(-Math.cos(e.angle) * (e.r + 20 + i * 8), -Math.sin(e.angle) * (e.r + 20 + i * 8) + i * 4);
          ctx.stroke();
        }
      }
      // legs
      ctx.strokeStyle = '#6f6a5e';
      ctx.lineWidth = 4.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-4, 6);
      ctx.lineTo(-6, 15);
      ctx.moveTo(4, 6);
      ctx.lineTo(6, 15);
      ctx.stroke();
      // torso
      ctx.fillStyle = '#8d8778';
      ctx.beginPath();
      ctx.moveTo(-7, -9);
      ctx.lineTo(6, -10);
      ctx.lineTo(9, 5);
      ctx.lineTo(4, 11);
      ctx.lineTo(-6, 10);
      ctx.lineTo(-9, 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(202,198,178,0.22)';
      ctx.beginPath();
      ctx.moveTo(-6, -8);
      ctx.lineTo(2, -9);
      ctx.lineTo(4, 6);
      ctx.lineTo(-2, 8);
      ctx.closePath();
      ctx.fill();
      // arms
      ctx.strokeStyle = '#7d786b';
      ctx.lineWidth = 3.8;
      ctx.beginPath();
      ctx.moveTo(-7, -4);
      ctx.lineTo(-14, 4 + wob);
      ctx.moveTo(7, -4);
      ctx.lineTo(12, -10);
      ctx.stroke();
      // head
      ctx.fillStyle = '#9c9686';
      ctx.beginPath();
      ctx.arc(0, -14, 5.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#2a2822';
      ctx.beginPath();
      ctx.arc(-2, -15, 1.3, 0, TAU);
      ctx.arc(2.4, -15, 1.3, 0, TAU);
      ctx.fill();
      // cracks and rebar
      ctx.strokeStyle = 'rgba(52,50,44,0.65)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-3, -10);
      ctx.lineTo(1, -4);
      ctx.lineTo(-2, 3);
      ctx.moveTo(5, 0);
      ctx.lineTo(2, 6);
      ctx.stroke();
      ctx.strokeStyle = '#7a4d36';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(6, -8);
      ctx.lineTo(12, -14);
      ctx.moveTo(-2, -18);
      ctx.lineTo(-6, -25);
      ctx.stroke();
      // warning paint
      ctx.fillStyle = 'rgba(146,50,42,0.55)';
      ctx.fillRect(-6, 1, 12, 2);
      if (e.frozen) {
        ctx.strokeStyle = `rgba(228,238,214,${0.25 + pulse * 0.22})`;
        ctx.lineWidth = 1.3;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, e.r + 7, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(228,238,214,0.42)';
        for (let i = 0; i < 4; i++) {
          const a = i * (TAU / 4) + Math.PI / 4;
          ctx.beginPath();
          ctx.arc(0, 0, e.r + 13, a - 0.16, a + 0.16);
          ctx.stroke();
        }
      }
    } else if (e.type === 'voice') {
      // SCP-939 — a blind pack hunter with too many teeth
      ctx.save();
      ctx.rotate(e.angle);
      const stride = Math.sin(game.time * 8 + e.seed) * 3;
      ctx.strokeStyle = '#3a151d';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (const leg of [[-9, -7], [8, -6], [-8, 7], [9, 8]]) {
        ctx.beginPath();
        ctx.moveTo(leg[0], leg[1] * 0.5);
        ctx.lineTo(leg[0] - 5 + stride * Math.sign(leg[0]), leg[1] + 6);
        ctx.lineTo(leg[0] - 8 + stride * Math.sign(leg[0]), leg[1] + 10);
        ctx.stroke();
      }
      // tail
      ctx.strokeStyle = '#4a1c25';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-13, 0);
      ctx.quadraticCurveTo(-24, 2 + wob * 2, -30, -4 + wob * 3);
      ctx.stroke();
      // body
      ctx.fillStyle = '#5e2230';
      ctx.beginPath();
      ctx.ellipse(-2, 0, 15, 9, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#752837';
      ctx.beginPath();
      ctx.ellipse(-2, -2, 11, 5.5, 0.1, 0, TAU);
      ctx.fill();
      // dorsal ridges
      ctx.strokeStyle = '#35141c';
      ctx.lineWidth = 2;
      for (let i = -8; i <= 7; i += 5) {
        ctx.beginPath();
        ctx.moveTo(i, -7);
        ctx.lineTo(i + 1, -12);
        ctx.stroke();
      }
      // head and jaws
      ctx.fillStyle = '#692535';
      ctx.beginPath();
      ctx.ellipse(16, 0, 10, 7, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#1c0c10';
      ctx.beginPath();
      ctx.moveTo(20, 1);
      ctx.lineTo(31, 6 + wob);
      ctx.lineTo(20, 7);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#d8cfbd';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(21 + i * 2.4, 3);
        ctx.lineTo(22.4 + i * 2.4, 6);
        ctx.stroke();
      }
      ctx.strokeStyle = '#a63a45';
      ctx.beginPath();
      ctx.moveTo(19, 4);
      ctx.quadraticCurveTo(26, 7, 30, 5);
      ctx.stroke();
      // sensory pits, no eyes
      ctx.fillStyle = def.eye;
      ctx.shadowColor = def.eye;
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(14, -4, 1.1, 0, TAU);
      ctx.arc(14, 4, 1.1, 0, TAU);
      ctx.arc(19, -2, 0.8, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    } else if (e.type === 'doctor') {
      // SCP-049 — the robe is the last thing you see
      const sway = Math.sin(game.time * 2.4 + e.seed) * 1.4;
      ctx.fillStyle = '#16191a';
      ctx.beginPath();
      ctx.moveTo(-10, 12);
      ctx.quadraticCurveTo(-15 + sway, 0, -8, -12);
      ctx.lineTo(8, -12);
      ctx.quadraticCurveTo(15 + sway, 0, 10, 12);
      ctx.quadraticCurveTo(0, 17, -10, 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#232728';
      ctx.beginPath();
      ctx.moveTo(-8, -10);
      ctx.lineTo(8, -10);
      ctx.lineTo(11, 5);
      ctx.quadraticCurveTo(0, 11, -11, 5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,128,120,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-6, -8);
      ctx.lineTo(-4, 10);
      ctx.moveTo(4, -8);
      ctx.lineTo(3, 11);
      ctx.stroke();
      // arms and gloves
      ctx.strokeStyle = '#1c2020';
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(-8, -6);
      ctx.lineTo(-16, 2 + wob);
      ctx.moveTo(8, -6);
      ctx.lineTo(15, -1 - wob);
      ctx.stroke();
      ctx.fillStyle = '#8fae89';
      ctx.beginPath();
      ctx.arc(-17, 3 + wob, 2.4, 0, TAU);
      ctx.arc(16, -1 - wob, 2.4, 0, TAU);
      ctx.fill();
      // head, beak and hat
      ctx.save();
      ctx.translate(0, -16);
      ctx.rotate(e.angle);
      ctx.fillStyle = '#dad4c2';
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 5.2, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ece6d2';
      ctx.beginPath();
      ctx.moveTo(4, -3.4);
      ctx.quadraticCurveTo(12, -1, 14, 0);
      ctx.quadraticCurveTo(12, 1, 4, 3.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2c2a24';
      ctx.beginPath();
      ctx.arc(1.5, -1.7, 1.2, 0, TAU);
      ctx.arc(1.5, 1.7, 1.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#a8e69a';
      ctx.shadowColor = '#a8e69a';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(1.5, -1.7, 0.55, 0, TAU);
      ctx.arc(1.5, 1.7, 0.55, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
      ctx.fillStyle = '#22211d';
      ctx.beginPath();
      ctx.ellipse(0, -21, 10, 3.4, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#2c2b26';
      ctx.beginPath();
      ctx.arc(0, -23, 5, 0, TAU);
      ctx.fill();
      // cane with green vial
      ctx.strokeStyle = '#5a4b38';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-18, 16);
      ctx.lineTo(-14, -8);
      ctx.stroke();
      ctx.fillStyle = '#9fe08f';
      ctx.beginPath();
      ctx.arc(-18, 15, 2.5, 0, TAU);
      ctx.fill();
      if (e.healPulse > 0) {
        ctx.strokeStyle = `rgba(155,230,145,${e.healPulse * 0.6})`;
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(0, 0, 16 + i * 9 + (1 - e.healPulse) * 12, 0, TAU);
          ctx.stroke();
        }
      }
    } else if (e.type === 'shyguy') {
      // SCP-096 — pale, folded up, and absolutely not to be looked at
      const enraged = e.enraged;
      const skin = enraged ? '#d7c7b8' : '#b9b09f';
      const breathe = Math.sin(game.time * (enraged ? 12 : 3) + e.seed) * (enraged ? 1.8 : 0.7);
      if (enraged) {
        ctx.strokeStyle = `rgba(255,72,58,${0.16 + pulse * 0.16})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -6, 22 + pulse * 4, 0, TAU);
        ctx.stroke();
      }
      // long legs
      ctx.strokeStyle = skin;
      ctx.lineWidth = 3.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-4, 6);
      ctx.lineTo(-8 - (enraged ? 2 : 0), 17);
      ctx.moveTo(4, 6);
      ctx.lineTo(8 + (enraged ? 2 : 0), 17);
      ctx.stroke();
      // torso
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.ellipse(0, 1, 8, 12 + breathe * 0.5, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.ellipse(-2, -3, 3.4, 7, 0.2, 0, TAU);
      ctx.fill();
      // arms
      ctx.strokeStyle = skin;
      ctx.lineWidth = 3.1;
      if (enraged) {
        ctx.beginPath();
        ctx.moveTo(-6, -4);
        ctx.lineTo(-20, -12 - breathe);
        ctx.moveTo(6, -4);
        ctx.lineTo(20, -12 + breathe);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-20, -12 - breathe);
        ctx.lineTo(-24, -4);
        ctx.moveTo(20, -12 + breathe);
        ctx.lineTo(24, -4);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(-6, -3);
        ctx.lineTo(-8, -13);
        ctx.lineTo(-3, -16);
        ctx.moveTo(6, -3);
        ctx.lineTo(8, -13);
        ctx.lineTo(3, -16);
        ctx.stroke();
      }
      // elongated head
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.ellipse(0, -17, 6, 7 + breathe * 0.4, 0, 0, TAU);
      ctx.fill();
      if (enraged) {
        // open mouth, grief-stricken eyes
        ctx.fillStyle = '#1a1012';
        ctx.beginPath();
        ctx.ellipse(0, -13, 3.8, 6.2, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#e8e0cc';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(-3 + i * 2, -17.6);
          ctx.lineTo(-2 + i * 2, -14.8);
          ctx.moveTo(-3 + i * 2, -8.4);
          ctx.lineTo(-2 + i * 2, -11.2);
          ctx.stroke();
        }
        ctx.fillStyle = def.eye;
        ctx.shadowColor = def.eye;
        ctx.shadowBlur = 7;
        ctx.beginPath();
        ctx.arc(-2.4, -20, 1.3, 0, TAU);
        ctx.arc(2.4, -20, 1.3, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(176,38,34,0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-2.4, -18.6);
        ctx.lineTo(-3, -14);
        ctx.moveTo(2.4, -18.6);
        ctx.lineTo(3, -14);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#a39887';
        ctx.beginPath();
        ctx.ellipse(-2.4, -19, 3.1, 4.2, 0.2, 0, TAU);
        ctx.ellipse(2.4, -19, 3.1, 4.2, -0.2, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#8c8171';
        ctx.beginPath();
        ctx.arc(0, -15, 1.4, 0, TAU);
        ctx.fill();
      }
    } else if (e.type === 'oldman') {
      // SCP-106 — corrosion in the shape of a man
      if (e.phaseGlow > 0) {
        ctx.strokeStyle = `rgba(147,255,134,${e.phaseGlow * 0.35})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(-6 - i * 9, 0, e.r + 4 + i * 5, -1.1, 1.1);
          ctx.stroke();
        }
      }
      // drips
      ctx.strokeStyle = 'rgba(24,26,20,0.85)';
      ctx.lineWidth = 2.1;
      for (let i = -2; i <= 2; i++) {
        const len = 9 + ((i + 2) % 3) * 5 + Math.sin(game.time * 2 + i + e.seed) * 2;
        ctx.beginPath();
        ctx.moveTo(i * 4, 6);
        ctx.lineTo(i * 4 + wob, 6 + len);
        ctx.stroke();
      }
      // hunched body
      ctx.fillStyle = '#31302b';
      ctx.beginPath();
      ctx.moveTo(-9, 8);
      ctx.quadraticCurveTo(-13, -4, -5, -14);
      ctx.quadraticCurveTo(2, -18, 8, -11);
      ctx.quadraticCurveTo(13, 0, 9, 9);
      ctx.quadraticCurveTo(0, 14, -9, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(112,112,94,0.2)';
      ctx.beginPath();
      ctx.ellipse(-3, -4, 4, 8, 0.3, 0, TAU);
      ctx.fill();
      // long reaching arms
      ctx.strokeStyle = '#2a2924';
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      const ra = e.angle;
      const rx = Math.cos(ra);
      const ry = Math.sin(ra);
      ctx.beginPath();
      ctx.moveTo(-7, -4);
      ctx.quadraticCurveTo(-8 + rx * 9, -2 + ry * 9, -4 + rx * 19, 2 + ry * 19);
      ctx.moveTo(7, -3);
      ctx.quadraticCurveTo(8 + rx * 7, 1 + ry * 7, 5 + rx * 16, 5 + ry * 16);
      ctx.stroke();
      ctx.fillStyle = '#5d7a4d';
      ctx.beginPath();
      ctx.arc(-4 + rx * 19, 2 + ry * 19, 2.1, 0, TAU);
      ctx.arc(5 + rx * 16, 5 + ry * 16, 2.1, 0, TAU);
      ctx.fill();
      // head
      ctx.fillStyle = '#26261f';
      ctx.beginPath();
      ctx.ellipse(0, -18, 5.4, 6.2, -0.15, 0, TAU);
      ctx.fill();
      ctx.fillStyle = def.eye;
      ctx.shadowColor = def.eye;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(-2, -19, 1.3, 0, TAU);
      ctx.arc(2.4, -19, 1.3, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      // corrosion pool
      ctx.fillStyle = 'rgba(20,24,17,0.62)';
      ctx.beginPath();
      ctx.ellipse(0, 15, 13 + wob * 1.5, 4, 0, 0, TAU);
      ctx.fill();
    } else if (e.type === 'reptile') {
      // SCP-682 — too large, too angry, and already healing
      ctx.save();
      ctx.rotate(e.angle);
      const k = e.r / 24;
      const stride = Math.sin(game.time * 5 + e.seed) * 3;
      // tail
      ctx.strokeStyle = '#22301f';
      ctx.lineWidth = 8 * k;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-18 * k, 0);
      ctx.quadraticCurveTo(-34 * k, 5 * k + wob * 3, -48 * k, -6 * k + wob * 4);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(96,124,76,0.35)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-22 * k, -2);
      ctx.quadraticCurveTo(-34 * k, 3, -45 * k, -5);
      ctx.stroke();
      // legs
      ctx.strokeStyle = '#1d2a1b';
      ctx.lineWidth = 5 * k;
      for (const leg of [[-11, -9], [8, -9], [-11, 9], [8, 9]]) {
        ctx.beginPath();
        ctx.moveTo(leg[0] * k, leg[1] * 0.45 * k);
        ctx.lineTo((leg[0] - 3 + stride * Math.sign(leg[0])) * k, leg[1] * 1.15 * k);
        ctx.lineTo((leg[0] - 7 + stride * Math.sign(leg[0])) * k, leg[1] * 1.45 * k);
        ctx.stroke();
      }
      // body armour
      ctx.fillStyle = '#2c3d2c';
      ctx.beginPath();
      ctx.ellipse(-2 * k, 0, 20 * k, 13 * k, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#3c5238';
      ctx.beginPath();
      ctx.ellipse(-4 * k, -3 * k, 14 * k, 7 * k, 0.1, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(132,156,104,0.28)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(-12 * k + i * 6 * k, 0, 9 * k, -1.1, 1.1);
        ctx.stroke();
      }
      // back spikes
      ctx.fillStyle = '#1b261a';
      for (let i = -2; i <= 2; i++) {
        const sx = (i * 6 - 3) * k;
        ctx.beginPath();
        ctx.moveTo(sx - 3 * k, -11 * k);
        ctx.lineTo(sx, -18 * k - (i % 2) * 3 * k);
        ctx.lineTo(sx + 3 * k, -11 * k);
        ctx.closePath();
        ctx.fill();
      }
      // head and jaws
      ctx.fillStyle = '#34472f';
      ctx.beginPath();
      ctx.ellipse(20 * k, 0, 10 * k, 8 * k, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#10180f';
      ctx.beginPath();
      ctx.moveTo(25 * k, 1 * k);
      ctx.lineTo(40 * k, 8 * k + wob * 1.5);
      ctx.lineTo(25 * k, 9 * k);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#d8d2bc';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo((26 + i * 2.2) * k, 3 * k);
        ctx.lineTo((27 + i * 2.2) * k, 7 * k);
        ctx.stroke();
      }
      // eye
      ctx.fillStyle = def.eye;
      ctx.shadowColor = def.eye;
      ctx.shadowBlur = 7;
      ctx.beginPath();
      ctx.arc(19 * k, -4 * k, 1.8 * k, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      if (e.regenGlow > 0) {
        ctx.strokeStyle = `rgba(143,224,129,${e.regenGlow * 0.55})`;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(0, 0, (14 + i * 7 + pulse * 3) * k, 0, TAU);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // hit flash
    if (e.hitFlash > 0) {
      ctx.fillStyle = `rgba(255,230,210,${e.hitFlash * 2.6})`;
      ctx.beginPath();
      ctx.ellipse(0, -e.r * 0.4, e.r * 0.9, e.r * 1.15, 0, 0, TAU);
      ctx.fill();
    }

    // health and designation
    const barW = Math.max(26, e.r * 1.9);
    const top = -(e.r * 1.55 + 12);
    if (e.hp < e.maxHp) {
      ctx.fillStyle = 'rgba(4,6,8,0.72)';
      ctx.fillRect(-barW / 2, top, barW, 3);
      ctx.fillStyle = e.type === 'statue' ? '#b8b7a8' : e.type === 'oldman' ? '#7fcf78' : '#b5493d';
      ctx.fillRect(-barW / 2, top, barW * clamp(e.hp / e.maxHp, 0, 1), 3);
    }
    const pd = dist(player.x, player.y, e.x, e.y);
    if (pd < 410) {
      ctx.font = '600 8px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = e.type === 'shyguy' && e.enraged ? 'rgba(255,94,78,0.9)' : 'rgba(214,198,174,0.55)';
      ctx.fillText(def.scp, 0, top - 5);
      if (e.type === 'statue' && e.frozen) {
        ctx.fillStyle = 'rgba(228,238,214,0.8)';
        ctx.fillText('OBSERVED', 0, top - 15);
      } else if (e.type === 'shyguy' && e.enraged) {
        ctx.fillStyle = 'rgba(255,94,78,0.9)';
        ctx.fillText('ENRAGED', 0, top - 15);
      }
    }
    ctx.restore();
  }

  function drawParticles() {
    for (const p of game.particles) {
      const a = clamp(p.life / p.max, 0, 1);
      if (p.type === 'mist') {
        ctx.globalAlpha = a * 0.42;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
      } else if (p.type === 'spark') {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
      } else {
        ctx.globalAlpha = a * 0.9;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    for (const t of game.texts) {
      const a = clamp(t.life / t.max, 0, 1);
      ctx.globalAlpha = a;
      ctx.font = '700 11px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------------------------------------------------------------------
     Rendering — light, glow, vignette
  --------------------------------------------------------------------- */
  function darknessLevel() {
    if (game.mode === 'menu') return 0.52;
    if (game.phase === 'night') return 0.83;
    if (game.phase === 'dusk') return 0.44;
    if (game.phase === 'dawn') return 0.24;
    return 0.035;
  }

  function drawLighting(bounds) {
    const dark = darknessLevel();
    if (dark < 0.02) return;
    lightCtx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    lightCtx.clearRect(0, 0, view.w, view.h);
    lightCtx.globalCompositeOperation = 'source-over';
    lightCtx.fillStyle = `rgba(3,6,13,${dark})`;
    lightCtx.fillRect(0, 0, view.w, view.h);
    lightCtx.globalCompositeOperation = 'destination-out';

    const cut = (wx, wy, radius, strength) => {
      const x = sxOf(wx);
      const y = syOf(wy);
      if (x + radius < 0 || x - radius > view.w || y + radius < 0 || y - radius > view.h) return;
      const g = lightCtx.createRadialGradient(x, y, 0, x, y, radius);
      const s = strength === undefined ? 1 : strength;
      g.addColorStop(0, `rgba(0,0,0,${s})`);
      g.addColorStop(0.62, `rgba(0,0,0,${s * 0.72})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lightCtx.fillStyle = g;
      lightCtx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    };

    if (game.mode !== 'menu') {
      const lantern = game.phase === 'night' ? 188 : game.phase === 'dusk' ? 150 : game.phase === 'dawn' ? 230 : 0;
      if (lantern > 0) cut(player.x, player.y, lantern, 0.92);
      else cut(player.x, player.y, 190, 0.35);
    }

    for (const s of shelters) {
      if (s.state.collapsed) continue;
      if (game.mode === 'menu' || s.state.owned || s.id === game.activeShelter) {
        cut(s.x, s.y + 44, game.mode === 'menu' ? 120 : s.id === game.activeShelter ? 190 : 135, 0.95);
      }
    }

    for (const c of game.companions) {
      if (c.state === 'wild' || c.state === 'shelter' || c.state === 'travel') cut(c.x, c.y, 110, 0.6);
    }

    if (game.muzzle > 0) {
      const mx = player.x + Math.cos(player.aim) * 30;
      const my = player.y + Math.sin(player.aim) * 30;
      cut(mx, my, 120, 0.95);
    }

    lightCtx.globalCompositeOperation = 'source-over';
    ctx.drawImage(lightCanvas, 0, 0, view.w, view.h);
  }

  function radialGlow(x, y, radius, rgb, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, `rgba(${rgb},${alpha})`);
    g.addColorStop(0.5, `rgba(${rgb},${alpha * 0.45})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function drawGlowLayer() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // fires and lanterns
    for (const s of shelters) {
      if (s.state.collapsed) continue;
      if (game.mode === 'menu' || s.state.owned || s.id === game.activeShelter) {
        radialGlow(s.x, s.y + 48, 92, '239,150,70', 0.34);
        radialGlow(s.x, s.y + 48, 26, '255,214,150', 0.5);
      }
    }
    if (game.mode !== 'menu') {
      radialGlow(player.x - Math.cos(player.aim) * 8, player.y - Math.sin(player.aim) * 8, 46, '255,190,110', 0.2);
    }
    for (const c of game.companions) {
      if (c.state === 'wild') radialGlow(c.x, c.y + 1, 34, '239,182,97', 0.26);
    }

    // bullet tracers
    ctx.lineCap = 'round';
    for (const b of game.bullets) {
      const friendly = b.owner !== 'player';
      ctx.strokeStyle = friendly ? 'rgba(180,230,190,0.9)' : 'rgba(255,202,120,0.95)';
      ctx.shadowColor = friendly ? 'rgba(130,220,160,0.9)' : 'rgba(255,160,70,0.9)';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(b.px, b.py);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // SCP eyes and signature auras
    for (const e of game.enemies) {
      if (e.dead) continue;
      const def = ENEMY_TYPES[e.type];
      if (!def) continue;
      const pulse = 0.5 + Math.sin(game.time * 3 + e.seed) * 0.5;
      const glowScale = e.type === 'reptile' ? 1.9 : e.type === 'statue' ? 0.7 : 1;
      radialGlow(e.x, e.y - 10, 11 * glowScale, def.glow, (e.type === 'oldman' ? 0.3 : 0.42) * (0.8 + pulse * 0.3));
      if (e.type === 'doctor' && e.healPulse > 0) {
        radialGlow(e.x, e.y, 40 + (1 - e.healPulse) * 30, def.glow, e.healPulse * 0.4);
      }
      if (e.type === 'shyguy' && e.enraged) {
        radialGlow(e.x, e.y - 8, 30 + pulse * 8, '255,64,52', 0.28 + pulse * 0.2);
      }
      if (e.type === 'oldman' && e.phaseGlow > 0) {
        radialGlow(e.x, e.y, 34, '120,255,110', e.phaseGlow * 0.22);
      }
      if (e.type === 'reptile') {
        radialGlow(e.x, e.y, 44, '164,206,96', 0.16 + pulse * 0.08);
      }
      const eyeR = e.type === 'reptile' ? 1.5 : e.type === 'voice' ? 1.05 : 1.35;
      ctx.fillStyle = def.eye;
      ctx.shadowColor = def.eye;
      ctx.shadowBlur = e.type === 'statue' ? 5 : 9;
      ctx.beginPath();
      if (e.type === 'voice') {
        ctx.arc(e.x - 2.4, e.y - 12, eyeR * 0.7, 0, TAU);
        ctx.arc(e.x + 2.4, e.y - 12, eyeR * 0.7, 0, TAU);
      } else if (e.type === 'statue' && e.frozen) {
        ctx.arc(e.x - 2, e.y - 15, eyeR * 0.6, 0, TAU);
        ctx.arc(e.x + 2.4, e.y - 15, eyeR * 0.6, 0, TAU);
      } else {
        ctx.arc(e.x - 2.4, e.y - 11, eyeR * 0.8, 0, TAU);
        ctx.arc(e.x + 2.4, e.y - 11, eyeR * 0.8, 0, TAU);
      }
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    for (const p of game.projectiles) {
      radialGlow(p.x, p.y, 17, '170,100,220', 0.45);
      ctx.fillStyle = '#e0b6ff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.4, 0, TAU);
      ctx.fill();
    }

    if (game.muzzle > 0 && game.mode !== 'menu') {
      const mx = player.x + Math.cos(player.aim) * 30;
      const my = player.y + Math.sin(player.aim) * 30;
      radialGlow(mx, my, 44, '255,200,120', 0.55);
      ctx.fillStyle = 'rgba(255,240,190,0.95)';
      ctx.beginPath();
      ctx.arc(mx, my, 3.2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawVignette() {
    const g = ctx.createRadialGradient(view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.16, view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.62, 'rgba(0,0,0,0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0.72)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, view.w, view.h);
    if (game.mode !== 'menu' && game.health < 34) {
      const pulse = 0.1 + Math.sin(game.time * 5) * 0.045;
      const r = ctx.createRadialGradient(view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.3, view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.7);
      r.addColorStop(0, 'rgba(120,10,8,0)');
      r.addColorStop(1, `rgba(120,10,8,${pulse})`);
      ctx.fillStyle = r;
      ctx.fillRect(0, 0, view.w, view.h);
    }
  }

  /* ---------------------------------------------------------------------
     Rendering — minimap
  --------------------------------------------------------------------- */
  function drawMinimap() {
    const w = 200;
    const h = 132;
    mm.clearRect(0, 0, w, h);
    mm.fillStyle = '#081018';
    mm.fillRect(0, 0, w, h);
    const sc = Math.min((w - 12) / WORLD.w, (h - 12) / WORLD.h);
    const ox = (w - WORLD.w * sc) / 2;
    const oy = (h - WORLD.h * sc) / 2;
    const mx = (x) => ox + x * sc;
    const my = (y) => oy + y * sc;

    mm.strokeStyle = 'rgba(120,104,75,0.18)';
    mm.lineWidth = 2;
    for (const link of pathLinks) {
      const a = shelters.find((s) => s.id === link[0]);
      const b = shelters.find((s) => s.id === link[1]);
      if (!a || !b) continue;
      mm.beginPath();
      mm.moveTo(mx(a.x), my(a.y));
      mm.quadraticCurveTo(mx((a.x + b.x) / 2), my((a.y + b.y) / 2), mx(b.x), my(b.y));
      mm.stroke();
    }

    // shelter markers
    for (const s of shelters) {
      const x = mx(s.x);
      const y = my(s.y);
      if (s.state.collapsed) {
        mm.strokeStyle = 'rgba(120,110,100,0.35)';
        mm.lineWidth = 1;
        mm.beginPath();
        mm.moveTo(x - 3, y - 3); mm.lineTo(x + 3, y + 3);
        mm.moveTo(x + 3, y - 3); mm.lineTo(x - 3, y + 3);
        mm.stroke();
        continue;
      }
      const active = s.id === game.activeShelter;
      mm.fillStyle = active ? '#f4d29a' : s.state.haunt >= 2 ? '#d5533f' : s.state.owned ? '#efb661' : 'rgba(199,188,170,0.55)';
      mm.beginPath();
      mm.moveTo(x, y - 4);
      mm.lineTo(x + 4, y);
      mm.lineTo(x, y + 4);
      mm.lineTo(x - 4, y);
      mm.closePath();
      mm.fill();
      if (active) {
        mm.strokeStyle = 'rgba(244,210,154,0.6)';
        mm.lineWidth = 1;
        mm.beginPath();
        mm.arc(x, y, 7 + Math.sin(game.time * 3) * 1.4, 0, TAU);
        mm.stroke();
      }
    }

    // residents
    for (const c of game.companions) {
      if (c.state !== 'shelter') continue;
      mm.fillStyle = '#7fb2a5';
      mm.beginPath();
      mm.arc(mx(c.x), my(c.y), 2, 0, TAU);
      mm.fill();
    }

    // wild survivors
    for (const c of game.companions) {
      if (c.state !== 'wild') continue;
      mm.fillStyle = 'rgba(239,182,97,0.8)';
      mm.beginPath();
      mm.arc(mx(c.x), my(c.y), 1.8, 0, TAU);
      mm.fill();
    }

    // SCP contacts
    for (const e of game.enemies) {
      if (e.dead) continue;
      const def = ENEMY_TYPES[e.type];
      if (!def) continue;
      const er = e.type === 'reptile' ? 2.8 : e.type === 'statue' ? 1.6 : e.type === 'doctor' ? 1.8 : 1.3;
      mm.fillStyle = def.map;
      mm.beginPath();
      mm.arc(mx(e.x), my(e.y), er, 0, TAU);
      mm.fill();
      if (e.type === 'reptile' || e.type === 'shyguy' && e.enraged) {
        mm.strokeStyle = 'rgba(255,90,60,0.45)';
        mm.lineWidth = 1;
        mm.beginPath();
        mm.arc(mx(e.x), my(e.y), er + 2.4, 0, TAU);
        mm.stroke();
      }
    }

    // player arrow
    const px = mx(player.x);
    const py = my(player.y);
    mm.save();
    mm.translate(px, py);
    mm.rotate(player.aim + Math.PI / 2);
    mm.fillStyle = game.mode === 'menu' ? '#efe4cf' : '#f4e4c4';
    mm.beginPath();
    mm.moveTo(0, -4);
    mm.lineTo(3, 3);
    mm.lineTo(0, 1.6);
    mm.lineTo(-3, 3);
    mm.closePath();
    mm.fill();
    mm.restore();

    // border wash
    mm.strokeStyle = 'rgba(236,219,188,0.08)';
    mm.lineWidth = 1;
    mm.strokeRect(0.5, 0.5, w - 1, h - 1);
  }

  /* ---------------------------------------------------------------------
     Rendering — frame
  --------------------------------------------------------------------- */
  function render() {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.clearRect(0, 0, view.w, view.h);

    if (game.mode === 'menu') {
      const t = performance.now() / 1000;
      camera.x = 1180 + Math.sin(t * 0.035) * 620;
      camera.y = 1010 + Math.cos(t * 0.027) * 340;
    }

    const bounds = {
      left: camera.x - view.w / 2 - 80,
      top: camera.y - view.h / 2 - 80,
      right: camera.x + view.w / 2 + 80,
      bottom: camera.y + view.h / 2 + 80
    };

    beginWorld();
    drawGround(bounds);
    drawTrees(bounds);
    for (const s of shelters) {
      if (s.x < bounds.left - 200 || s.x > bounds.right + 200 || s.y < bounds.top - 200 || s.y > bounds.bottom + 200) continue;
      drawShelter(s);
    }
    drawNodes(bounds);
    const sortedEnemies = game.enemies.slice().sort((a, b) => a.y - b.y);
    for (const e of sortedEnemies) drawEnemy(e);
    const sortedCompanions = game.companions.slice().sort((a, b) => a.y - b.y);
    for (const c of sortedCompanions) {
      if (c.state === 'dead') continue;
      if (c.x < bounds.left - 50 || c.x > bounds.right + 50 || c.y < bounds.top - 50 || c.y > bounds.bottom + 50) continue;
      drawCompanion(c);
    }
    if (game.mode !== 'menu') drawPlayer();
    drawParticles();
    endWorld();

    drawLighting(bounds);

    beginWorld();
    drawGlowLayer();
    endWorld();

    drawVignette();
    updateCrosshair();
    drawMinimap();
  }

  /* ---------------------------------------------------------------------
     Main loop
  --------------------------------------------------------------------- */
  let lastFrame = performance.now();

  function frame(now) {
    const dt = Math.min(0.1, Math.max(0.001, (now - lastFrame) / 1000));
    lastFrame = now;

    if (game.mode === 'playing') {
      update(dt);
    } else if (game.mode === 'dying') {
      game.time += dt;
      game.dyingTimer -= dt;
      updateParticles(dt);
      updateCamera(dt);
      game.shake = Math.max(0, game.shake - 38 * dt);
      if (game.dyingTimer <= 0) finishDeath();
    } else if (game.mode === 'dawn') {
      game.time += dt;
      game.dawnTimer -= dt;
      emitFireEmbers(dt);
      updateParticles(dt);
      updateCamera(dt);
      setText(DOM.dawnCountdown, String(Math.max(0, Math.ceil(game.dawnTimer))));
      if (game.dawnTimer <= 0) beginNextDay();
    } else if (game.mode === 'menu') {
      game.time += dt;
    }

    render();
    updateHUD();
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------------------
     Debug hook (development / verification only)
  --------------------------------------------------------------------- */
  window.__NIGHTFALL__ = {
    game,
    player,
    shelters,
    ENEMY_TYPES,
    start() { startGame(); },
    spawn(type = 'flesh', count = 1, distance = 240) {
      const out = [];
      for (let i = 0; i < count; i++) {
        const a = (i / Math.max(1, count)) * TAU + Math.random() * 0.5;
        const x = clamp(player.x + Math.cos(a) * distance, 40, WORLD.w - 40);
        const y = clamp(player.y + Math.sin(a) * distance, 40, WORLD.h - 40);
        const e = makeEnemy(ENEMY_TYPES[type] ? type : 'flesh', x, y);
        game.enemies.push(e);
        out.push(e);
      }
      return out;
    },
    spawnRoster() {
      const types = Object.keys(ENEMY_TYPES);
      return types.map((t, i) => this.spawn(t, 1, 200 + i * 28)[0]);
    },
    claim(id = 'ranger') {
      const s = shelters.find((x) => x.id === id);
      if (!s) return null;
      s.state.owned = true;
      s.state.integrity = s.state.maxIntegrity;
      game.activeShelter = s.id;
      return s;
    },
    enter(id = 'ranger') {
      const s = this.claim(id);
      if (!s) return null;
      player.x = s.x;
      player.y = s.y + 8;
      enterShelter(s);
      return s;
    },
    leave() {
      const s = getActiveShelter();
      if (s) leaveShelter(s);
      return !!s;
    },
    teleport(shelterId = 'ranger', dx = 0, dy = 90) {
      const s = shelters.find((x) => x.id === shelterId);
      if (!s) return null;
      player.x = s.x + dx;
      player.y = s.y + dy;
      return { x: player.x, y: player.y };
    },
    night() {
      game.phase = 'night';
      game.phaseTime = 0;
      game.phaseDuration = 150;
      return game.phase;
    },
    day() {
      game.phase = 'day';
      game.phaseTime = 0;
      game.phaseDuration = DAY_DURATION;
      return game.phase;
    },
    clearEnemies() { game.enemies.length = 0; },
    damage(amount = 10) { damagePlayer(amount); return game.health; }
  };

  /* ---------------------------------------------------------------------
     Init
  --------------------------------------------------------------------- */
  function init() {
    buildWorld();
    resetRun();
    game.runActive = false;
    game.mode = 'menu';
    game.phase = 'dusk';
    game.phaseTime = 0;
    game.phaseDuration = DUSK_DURATION;
    hideScreens(DOM.menuScreen);
    DOM.hud.classList.remove('visible');
    DOM.crosshair.classList.remove('active');
    DOM.interactPrompt.hidden = true;
    Sound.setMuted(Sound.muted);
    updateBestBadges();
    updateTeamUI(true);
    bindInput();
    resize();
    requestAnimationFrame(frame);
  }

  init();
})();
