/* ==========================================================================
   NIGHTFALL — CONTAINMENT PROTOCOL
   A dependency-free SCP survival game.
   Seven nights per region. Six shelters. One reptile that will not die.
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

  function shade(hex, amt) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = clamp(Math.round(r + amt * 255), 0, 255);
    g = clamp(Math.round(g + amt * 255), 0, 255);
    b = clamp(Math.round(b + amt * 255), 0, 255);
    return `rgb(${r},${g},${b})`;
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
    safeChip: $('safeChip'),
    bossChip: $('bossChip'),
    mobileChip: $('mobileChip'),
    mapTitle: $('mapTitle'),
    dreadLabel: $('dreadLabel'),
    hauntLabel: $('hauntLabel'),
    kitBtn: $('kitBtn'),
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
    bossBar: $('bossBar'),
    bossName: $('bossName'),
    bossFill: $('bossFill'),
    bossPhase: $('bossPhase'),
    bossSub: $('bossSub'),
    menuScreen: $('menuScreen'),
    menuDock: $('menuDock'),
    pauseDock: $('pauseDock'),
    bestDays: $('bestDays'),
    startBtn: $('startBtn'),
    menuMinBtn: $('menuMinBtn'),
    menuCloseBtn: $('menuCloseBtn'),
    mobileToggle: $('mobileToggle'),
    mobileToggleText: $('mobileToggleText'),
    guideBtn: $('guideBtn'),
    guideScreen: $('guideScreen'),
    guideBody: $('guideBody'),
    guideCloseBtn: $('guideCloseBtn'),
    guideMobileBtn: $('guideMobileBtn'),
    pauseScreen: $('pauseScreen'),
    pauseMinBtn: $('pauseMinBtn'),
    pauseCloseBtn: $('pauseCloseBtn'),
    resumeBtn: $('resumeBtn'),
    pauseGuideBtn: $('pauseGuideBtn'),
    pauseRestartBtn: $('pauseRestartBtn'),
    pauseMenuBtn: $('pauseMenuBtn'),
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
    chapterScreen: $('chapterScreen'),
    chapterRoman: $('chapterRoman'),
    chapterText: $('chapterText'),
    nextChapterName: $('nextChapterName'),
    nextChapterSub: $('nextChapterSub'),
    nextChapterDesc: $('nextChapterDesc'),
    chapterNights: $('chapterNights'),
    chapterKills: $('chapterKills'),
    chapterTeam: $('chapterTeam'),
    chapterCount: $('chapterCount'),
    chapterBtn: $('chapterBtn'),
    gameoverScreen: $('gameoverScreen'),
    deathText: $('deathText'),
    deathDays: $('deathDays'),
    deathNights: $('deathNights'),
    deathKills: $('deathKills'),
    deathBest: $('deathBest'),
    deathAdvice: $('deathAdvice'),
    retryBtn: $('retryBtn'),
    deathMenuBtn: $('deathMenuBtn')
  };

  /* ---------------------------------------------------------------------
     Storage
  --------------------------------------------------------------------- */
  const BEST_KEY = 'nightfall.best.v2';
  const MUTE_KEY = 'nightfall.mute.v1';
  const MOBILE_KEY = 'nightfall.mobile.v1';
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
  function loadMobile() {
    try { return localStorage.getItem(MOBILE_KEY) === '1'; } catch (e) { return false; }
  }
  function saveMobile(v) {
    try { localStorage.setItem(MOBILE_KEY, v ? '1' : '0'); } catch (e) { /* ignore */ }
  }

  /* ---------------------------------------------------------------------
     Audio — entirely synthesised
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
      this.master.gain.value = this.muted ? 0 : 0.5;
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
      gain.gain.value = 0.026;
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
      this.ambientGain.gain.linearRampToValueAtTime(isNight ? 0.048 : 0.024, t + 2);
      if (this.ambientFilter) {
        this.ambientFilter.frequency.cancelScheduledValues(t);
        this.ambientFilter.frequency.linearRampToValueAtTime(isNight ? 420 : 260, t + 2);
      }
    },

    setMuted(v) {
      this.muted = v;
      saveMuted(v);
      DOM.muteBtn.classList.toggle('muted', v);
      if (this.master) this.master.gain.value = v ? 0 : 0.5;
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
    claim() { [330, 440, 554].forEach((f, i) => this.tone(f, 0.55, 'sine', 0.055, f, i * 0.08)); },
    recruit() { [392, 523, 659].forEach((f, i) => this.tone(f, 0.45, 'triangle', 0.05, f, i * 0.1)); },
    night() {
      this.tone(55, 3.4, 'sawtooth', 0.1, 40);
      this.tone(82, 2.8, 'sine', 0.08, 55, 0.4);
      this.noise(2.6, 0.08, 220, 'lowpass');
    },
    dawn() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 1.2, 'sine', 0.045, f, i * 0.22)); },
    breach() { this.noise(0.6, 0.26, 180, 'lowpass'); this.tone(70, 0.7, 'sawtooth', 0.16, 32); },
    howl() { this.tone(rand(220, 320), 1.1, 'sine', 0.035, rand(120, 180)); },
    bossRoar() {
      this.tone(48, 2.2, 'sawtooth', 0.2, 30);
      this.tone(73, 1.8, 'square', 0.09, 42);
      this.noise(1.8, 0.16, 150, 'lowpass');
    }
  };

  /* ---------------------------------------------------------------------
     Data
  --------------------------------------------------------------------- */
  const WORLD = { w: 3000, h: 2200 };
  const DAY_DURATION = 78;
  const DUSK_DURATION = 12;
  const NIGHT_BASE = 48;
  const CHAPTER_NIGHTS = 7;
  const MAX_TEAM = 2;
  const WALL_RADIUS = 132;

  const WEAPONS = [
    { short: 'Mk I', dmg: 36, rate: 0.33, speed: 940 },
    { short: 'Mk II', dmg: 48, rate: 0.27, speed: 1020 },
    { short: 'Mk III', dmg: 61, rate: 0.22, speed: 1080 },
    { short: 'Mk IV', dmg: 78, rate: 0.18, speed: 1160 }
  ];

  const REGIONS = [
    {
      id: 'valley', name: 'THE VALLEY', sub: 'Pacific Northwest · USA', roman: 'I',
      accent: '#efb661', base: '#0e1a13', ground: ['#0f1a13', '#152219', '#1d2d1f'],
      grass: '#5b7a4f', path: '#7e6d4e', water: '#2d5a5c', tree: 'pine',
      pool: ['scp173', 'scp939', 'scp610', 'scp049'],
      treeCount: 175, tuftCount: 1300, rockCount: 90, waterCount: 4, propKind: 'grave',
      shelters: [
        { id: 'ranger', name: "Ranger's Hut", x: 700, y: 620, base: 160, style: 'cabin', perk: 'Sturdy log walls, clear sightlines.' },
        { id: 'chapel', name: 'Chapel Ruins', x: 1780, y: 470, base: 145, style: 'chapel', perk: 'Consecrated ground frays them.' },
        { id: 'mill', name: 'The Mill House', x: 2400, y: 1100, base: 215, style: 'mill', perk: 'Heavy beams. Slow to break.' },
        { id: 'watch', name: 'Watchtower', x: 2010, y: 1830, base: 130, style: 'tower', perk: 'High ground. Long sightlines.' },
        { id: 'cabin', name: 'Lakeside Cabin', x: 980, y: 1770, base: 165, style: 'cabin', perk: 'Water masks your scent.' },
        { id: 'farm', name: 'Old Farmstead', x: 420, y: 1320, base: 150, style: 'barn', perk: 'Open fields. Nothing sneaks close.' }
      ],
      links: [['ranger', 'chapel'], ['chapel', 'mill'], ['mill', 'watch'], ['watch', 'cabin'], ['cabin', 'farm'], ['farm', 'ranger'], ['ranger', 'mill'], ['chapel', 'cabin']]
    },
    {
      id: 'mexico', name: 'SIERRA SOMBRA', sub: 'Sonoran Desert · Mexico', roman: 'II',
      accent: '#e8a34d', base: '#1a0f0a', ground: ['#251710', '#332014', '#432b18'],
      grass: '#96733b', path: '#ad8a5e', water: '#38636b', tree: 'cactus',
      pool: ['scp610', 'scp939', 'scp106', 'scp457'],
      treeCount: 105, tuftCount: 620, rockCount: 150, waterCount: 1, propKind: 'bones',
      shelters: [
        { id: 'hacienda', name: 'Casa Sombra', x: 700, y: 620, base: 170, style: 'hacienda', perk: 'Thick adobe. Heat and claws slide off.' },
        { id: 'mission', name: 'Mission de la Cruz', x: 1780, y: 470, base: 150, style: 'mission', perk: 'The bell still rings at dusk.' },
        { id: 'mine', name: 'La Mina Vieja', x: 2400, y: 1100, base: 220, style: 'mine', perk: 'Deep shafts. Something answers.' },
        { id: 'aqueduct', name: 'The Aqueduct', x: 2010, y: 1830, base: 135, style: 'aqueduct', perk: 'Stone arches. Long sightlines.' },
        { id: 'ranch', name: 'Rancho Seco', x: 980, y: 1770, base: 165, style: 'ranch', perk: 'Dry ground. Dust gives them away.' },
        { id: 'cantina', name: 'Cantina del Sol', x: 420, y: 1320, base: 150, style: 'cantina', perk: 'A last drink before the dark.' }
      ],
      links: [['hacienda', 'mission'], ['mission', 'mine'], ['mine', 'aqueduct'], ['aqueduct', 'ranch'], ['ranch', 'cantina'], ['cantina', 'hacienda'], ['hacienda', 'mine'], ['mission', 'ranch']]
    },
    {
      id: 'japan', name: 'YUREI NO MORI', sub: 'Aokigahara · Japan', roman: 'III',
      accent: '#e6a0b4', base: '#0b1116', ground: ['#0d1517', '#142021', '#1b2b28'],
      grass: '#4f7a63', path: '#6f7a6a', water: '#31565e', tree: 'bamboo',
      pool: ['scp096', 'scp049', 'scp173', 'scp106'],
      treeCount: 195, tuftCount: 1100, rockCount: 100, waterCount: 3, propKind: 'lantern',
      shelters: [
        { id: 'shrine', name: 'Kitsune Shrine', x: 700, y: 620, base: 165, style: 'shrine', perk: 'Fox spirits keep the threshold.' },
        { id: 'temple', name: 'Mori Temple', x: 1780, y: 470, base: 155, style: 'temple', perk: 'Old sutras hold the walls together.' },
        { id: 'dojo', name: 'The Dojo', x: 2400, y: 1100, base: 210, style: 'dojo', perk: 'Open floor. Nowhere to hide.' },
        { id: 'pagoda', name: 'Five-Tier Pagoda', x: 2010, y: 1830, base: 140, style: 'pagoda', perk: 'High bells. Long sightlines.' },
        { id: 'teahouse', name: 'Tea House', x: 980, y: 1770, base: 160, style: 'teahouse', perk: 'Paper walls. Warm light.' },
        { id: 'gate', name: 'The Broken Torii', x: 420, y: 1320, base: 150, style: 'gate', perk: 'A boundary. Some things still respect it.' }
      ],
      links: [['shrine', 'temple'], ['temple', 'dojo'], ['dojo', 'pagoda'], ['pagoda', 'teahouse'], ['teahouse', 'gate'], ['gate', 'shrine'], ['shrine', 'dojo'], ['temple', 'teahouse']]
    }
  ];

  const SCP_TYPES = {
    scp173: {
      name: 'SCP-173', label: 'THE SCULPTURE', kind: 'statue',
      hp: 120, speed: 92, dmg: 24, atk: 0.72, r: 14, wall: 15, color: '#b9b3a0', eye: '#161616',
      threat: 'HIGH', desc: 'Concrete and rebar. It only moves when no one is looking.'
    },
    scp096: {
      name: 'SCP-096', label: 'THE SHY GUY', kind: 'shy',
      hp: 190, speed: 62, dmg: 34, atk: 0.95, r: 16, wall: 12, color: '#d8cfc2', eye: '#a02828',
      threat: 'HIGH', desc: 'Do not look at its face. When provoked, nothing outruns it.'
    },
    scp106: {
      name: 'SCP-106', label: 'THE OLD MAN', kind: 'oldman',
      hp: 280, speed: 42, dmg: 28, atk: 1.35, r: 18, wall: 30, color: '#182018', eye: '#93ff8a',
      threat: 'HIGH', desc: 'Corrodes solid matter. The barricade is its favourite meal.'
    },
    scp049: {
      name: 'SCP-049', label: 'THE PLAGUE DOCTOR', kind: 'doctor',
      hp: 160, speed: 54, dmg: 18, atk: 1.5, r: 15, wall: 8, color: '#201d24', eye: '#e9e2cf', ranged: true,
      threat: 'MEDIUM', desc: 'It insists the cure is painless. It is not.'
    },
    scp939: {
      name: 'SCP-939', label: 'WITH MANY VOICES', kind: 'pack',
      hp: 105, speed: 126, dmg: 20, atk: 0.62, r: 13, wall: 7, color: '#7c1f1c', eye: '#ff9a5e',
      threat: 'HIGH', desc: 'Blind pack hunters that mimic the voices of the dead.'
    },
    scp610: {
      name: 'SCP-610', label: 'THE FLESH THAT HATES', kind: 'flesh',
      hp: 78, speed: 104, dmg: 14, atk: 0.5, r: 11, wall: 5, color: '#8f3a30', eye: '#ff6a4a',
      threat: 'LOW', desc: 'A crawling infection. Where one lands, more follow.'
    },
    scp457: {
      name: 'SCP-457', label: 'BURNING MAN', kind: 'fire',
      hp: 135, speed: 66, dmg: 22, atk: 1.1, r: 14, wall: 11, color: '#e07b43', eye: '#ffd36b', ranged: true,
      threat: 'MEDIUM', desc: 'A living flame that grows when it feeds.'
    },
    scp682: {
      name: 'SCP-682', label: 'HARD-TO-DESTROY REPTILE', kind: 'boss',
      hp: 2400, speed: 46, dmg: 42, atk: 1.3, r: 38, wall: 55, color: '#3c4a32', eye: '#ff4b2f',
      threat: 'APOCALYPSE', desc: 'The one they could not kill. It remembers every wound.'
    }
  };

  const ROLES = {
    scout: { label: 'Scout', hp: 74, dmg: 17, rate: 0.65, range: 370, speed: 156, perk: 'Fast, sharp-eyed, quick to fire.' },
    hunter: { label: 'Hunter', hp: 94, dmg: 32, rate: 1.05, range: 405, speed: 126, perk: 'Heavy rifle. Hits like a closing door.' },
    medic: { label: 'Medic', hp: 84, dmg: 13, rate: 0.9, range: 300, speed: 138, perk: 'Mends your wounds while the world bleeds.' },
    engineer: { label: 'Engineer', hp: 102, dmg: 15, rate: 0.95, range: 320, speed: 130, perk: 'Patches barricades without being asked.' }
  };

  const NAMES = ['Mira', 'Cole', 'Yara', 'Bram', 'Juno', 'Silas', 'Wren', 'Ossa', 'Tamsin', 'Rook', 'Elia', 'Dane', 'Nadia', 'Tomas', 'Aiko', 'Ren'];

  /* ---------------------------------------------------------------------
     World
  --------------------------------------------------------------------- */
  const shelters = [];
  const resourceNodes = [];
  const terrain = { patches: [], tufts: [], trees: [], rocks: [], water: [], props: [], specks: [] };
  let pathLinks = [];
  let currentRegion = REGIONS[0];
  let groundPattern = null;

  function makeShelter(def) {
    return {
      id: def.id, name: def.name, x: def.x, y: def.y, radius: WALL_RADIUS,
      base: def.base, perk: def.perk, style: def.style,
      state: {
        owned: false, integrity: 0, maxIntegrity: def.base, armor: 0, traps: 0,
        haunt: 0, breached: false, collapsed: false, hit: 0
      }
    };
  }

  function makeGroundTexture(region) {
    const c = document.createElement('canvas');
    c.width = 192; c.height = 192;
    const g = c.getContext('2d');
    g.fillStyle = region.ground[0];
    g.fillRect(0, 0, 192, 192);
    const R = mulberry32(0x5eed + region.id.length * 999);
    for (let i = 0; i < 1500; i++) {
      const x = R() * 192, y = R() * 192, s = 0.4 + R() * 1.8;
      const tone = R();
      if (region.id === 'mexico') g.fillStyle = tone < 0.5 ? 'rgba(96,64,36,0.20)' : 'rgba(42,24,14,0.30)';
      else if (region.id === 'japan') g.fillStyle = tone < 0.5 ? 'rgba(52,82,66,0.18)' : 'rgba(10,22,20,0.28)';
      else g.fillStyle = tone < 0.5 ? 'rgba(55,80,52,0.18)' : 'rgba(12,24,17,0.28)';
      g.fillRect(x, y, s, s * (1 + R()));
    }
    if (region.id === 'mexico') {
      g.strokeStyle = 'rgba(30,17,10,0.25)';
      for (let i = 0; i < 20; i++) {
        g.lineWidth = 0.6 + R();
        g.beginPath();
        let x = R() * 192, y = R() * 192;
        g.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += (R() - 0.5) * 30; y += (R() - 0.5) * 30; g.lineTo(x, y); }
        g.stroke();
      }
    }
    return c;
  }

  function buildWorld(regionIndex) {
    currentRegion = REGIONS[regionIndex] || REGIONS[0];
    const R = mulberry32(0x51a7f00d + regionIndex * 777);
    const region = currentRegion;

    shelters.length = 0;
    region.shelters.forEach((d) => shelters.push(makeShelter(d)));
    pathLinks = region.links.map((l) => l.slice());

    terrain.patches.length = 0;
    terrain.tufts.length = 0;
    terrain.trees.length = 0;
    terrain.rocks.length = 0;
    terrain.water.length = 0;
    terrain.props.length = 0;
    terrain.specks.length = 0;

    for (let i = 0; i < 110; i++) {
      terrain.patches.push({
        x: R() * WORLD.w, y: R() * WORLD.h,
        rx: 40 + R() * 190, ry: 25 + R() * 110,
        a: 0.03 + R() * 0.075,
        tone: region.id === 'mexico'
          ? (R() < 0.5 ? '150,110,66' : '72,46,28')
          : region.id === 'japan'
            ? (R() < 0.5 ? '62,96,78' : '20,42,38')
            : (R() < 0.45 ? '145,124,86' : R() < 0.55 ? '54,76,52' : '28,46,36')
      });
    }

    for (let i = 0; i < 900; i++) {
      terrain.specks.push({
        x: 20 + R() * (WORLD.w - 40), y: 20 + R() * (WORLD.h - 40),
        r: 0.5 + R() * 2.2,
        a: 0.08 + R() * 0.22,
        tone: R() < 0.5 ? region.grass : pathToRgb(region.path)
      });
    }

    for (let i = 0; i < region.tuftCount; i++) {
      terrain.tufts.push({
        x: 40 + R() * (WORLD.w - 80), y: 40 + R() * (WORLD.h - 80),
        s: 2 + R() * 4.8, rot: R() * TAU,
        tone: R() < 0.5 ? region.grass : shadeHex(region.grass, -0.12)
      });
    }

    for (let i = 0; i < region.waterCount; i++) {
      let x, y, ok;
      let tries = 0;
      do {
        x = 300 + R() * (WORLD.w - 600);
        y = 300 + R() * (WORLD.h - 600);
        ok = true;
        for (const s of shelters) if (dist(x, y, s.x, s.y) < s.radius + 240) ok = false;
        tries++;
      } while (!ok && tries < 40);
      terrain.water.push({ x, y, rx: 120 + R() * 170, ry: 70 + R() * 90, seed: R() * 10 });
    }

    let attempts = 0;
    while (terrain.trees.length < region.treeCount && attempts < 2200) {
      attempts++;
      const x = 60 + R() * (WORLD.w - 120);
      const y = 60 + R() * (WORLD.h - 120);
      let ok = true;
      for (const s of shelters) if (dist(x, y, s.x, s.y) < s.radius + 118) { ok = false; break; }
      if (!ok) continue;
      for (const t of terrain.trees) if (dist(x, y, t.x, t.y) < 54) { ok = false; break; }
      if (!ok) continue;
      for (const w of terrain.water) if (dist(x, y, w.x, w.y) < w.rx * 0.85) { ok = false; break; }
      if (!ok) continue;
      terrain.trees.push({
        x, y, r: 16 + R() * 24, sway: R() * TAU,
        tone: Math.floor(R() * 3), kind: region.tree,
        blight: R() < 0.22
      });
    }

    for (let i = 0; i < region.rockCount; i++) {
      const x = 50 + R() * (WORLD.w - 100);
      const y = 50 + R() * (WORLD.h - 100);
      let ok = true;
      for (const s of shelters) if (dist(x, y, s.x, s.y) < s.radius + 45) ok = false;
      if (!ok) continue;
      terrain.rocks.push({ x, y, r: 4 + R() * 11, tone: R() * 0.3, kind: region.id === 'mexico' && R() < 0.5 ? 'mesa' : 'stone' });
    }

    for (let i = 0; i < 44; i++) {
      const x = 80 + R() * (WORLD.w - 160);
      const y = 80 + R() * (WORLD.h - 160);
      let ok = true;
      for (const s of shelters) if (dist(x, y, s.x, s.y) < s.radius + 70) ok = false;
      if (!ok) continue;
      terrain.props.push({ x, y, kind: region.propKind, seed: R() * 10, rot: R() * TAU });
    }

    resourceNodes.length = 0;
    const fixed = [];
    region.shelters.forEach((s) => {
      fixed.push({ type: 'wood', x: s.x + 160, y: s.y + 110 });
      fixed.push({ type: 'stone', x: s.x - 150, y: s.y + 130 });
      fixed.push({ type: 'scrap', x: s.x + 20, y: s.y - 165 });
    });
    const counts = { wood: 26, stone: 22, scrap: 20 };
    Object.keys(counts).forEach((type) => {
      for (let i = 0; i < counts[type]; i++) {
        let x = 0, y = 0, ok = false;
        for (let tries = 0; tries < 90 && !ok; tries++) {
          x = 80 + R() * (WORLD.w - 160);
          y = 80 + R() * (WORLD.h - 160);
          ok = true;
          for (const s of shelters) if (dist(x, y, s.x, s.y) < s.radius + 110) ok = false;
          for (const n of fixed) if (dist(x, y, n.x, n.y) < 74) ok = false;
          for (const t of terrain.trees) if (dist(x, y, t.x, t.y) < 40) ok = false;
        }
        if (ok) fixed.push({ type, x, y });
      }
    });
    fixed.forEach((n, i) => {
      const R2 = mulberry32(0x9e37 + i * 97 + regionIndex * 31);
      resourceNodes.push({
        id: 'n' + i, type: n.type, x: clamp(n.x, 40, WORLD.w - 40), y: clamp(n.y, 40, WORLD.h - 40),
        maxUses: n.type === 'wood' ? 4 : 3, uses: n.type === 'wood' ? 4 : 3,
        respawn: 0, seed: R2() * 10
      });
    });

    groundPattern = ctx.createPattern(makeGroundTexture(region), 'repeat');
  }

  function pathToRgb(hex) {
    const h = hex.replace('#', '');
    const n = parseInt(h, 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }
  function shadeHex(hex, amt) {
    const h = hex.replace('#', '');
    const n = parseInt(h, 16);
    const r = clamp(Math.round(((n >> 16) & 255) * (1 + amt)), 0, 255);
    const g = clamp(Math.round(((n >> 8) & 255) * (1 + amt)), 0, 255);
    const b = clamp(Math.round((n & 255) * (1 + amt)), 0, 255);
    return `rgb(${r},${g},${b})`;
  }

  /* ---------------------------------------------------------------------
     State
  --------------------------------------------------------------------- */
  const player = {
    x: 700, y: 792, r: 14, speed: 194, aim: -Math.PI / 2,
    invuln: 0, hitFlash: 0, walk: 0, moving: false
  };
  const camera = { x: player.x, y: player.y };
  let mouse = { x: 0, y: 0, active: false };
  let view = { w: window.innerWidth, h: window.innerHeight, dpr: 1 };
  const lightCanvas = document.createElement('canvas');
  const lightCtx = lightCanvas.getContext('2d');

  const touchDevice = window.matchMedia('(pointer: coarse)').matches;
  let mobileMode = loadMobile() || touchDevice;

  const game = {
    mode: 'menu', day: 1, chapter: 1, cycle: 1, phase: 'day',
    phaseTime: 0, phaseDuration: DAY_DURATION,
    health: 100, maxHealth: 100, kills: 0, nightsHeld: 0, best: loadBest(),
    resources: { wood: 0, stone: 0, scrap: 0 },
    weaponTier: 1, focus: 100,
    activeShelter: null, panelShelter: null, inside: false, insideShelter: null,
    prompt: null, enemies: [], bullets: [], projectiles: [], particles: [], texts: [],
    companions: [], team: [], time: 0, cooldown: 0, muzzle: 0, shake: 0,
    spawnQueue: 0, queueTimer: 0, spawnTimer: 0, trickle: 3,
    nightDuration: NIGHT_BASE, nightKills: 0, dawnTimer: 0, dyingTimer: 0,
    fireTimer: 0, hintTimer: 0, lastSig: '',
    boss: null, bossActive: false, bossDefeatTimer: 0, bossFight: false,
    menuMinimized: false, pauseMinimized: false, guideReturn: null,
    firing: false
  };

  let bannerTimer = null;
  let ambientTimer = 0;

  /* ---------------------------------------------------------------------
     Run setup
  --------------------------------------------------------------------- */
  function playerMaxHealth() {
    return 100 + (game.chapter - 1) * 18;
  }

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
    }
  }

  function resetNodes() {
    for (const n of resourceNodes) {
      n.uses = n.maxUses;
      n.respawn = 0;
    }
  }

  function resetRun() {
    game.mode = 'playing';
    game.day = 1;
    game.chapter = 1;
    game.cycle = 1;
    game.phase = 'day';
    game.phaseTime = 0;
    game.phaseDuration = DAY_DURATION;
    game.health = 100;
    game.maxHealth = playerMaxHealth();
    game.kills = 0;
    game.nightKills = 0;
    game.nightsHeld = 0;
    game.resources.wood = 0;
    game.resources.stone = 0;
    game.resources.scrap = 0;
    game.weaponTier = 1;
    game.focus = 100;
    game.activeShelter = null;
    game.panelShelter = null;
    game.inside = false;
    game.insideShelter = null;
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
    game.boss = null;
    game.bossActive = false;
    game.bossDefeatTimer = 0;
    game.bossFight = false;
    game.firing = false;

    buildWorld(0);
    resetShelters();
    resetNodes();
    player.x = 700;
    player.y = 792;
    player.aim = -Math.PI / 2;
    player.invuln = 0;
    player.hitFlash = 0;
    player.walk = 0;
    player.moving = false;
    game.maxHealth = playerMaxHealth();
    game.health = game.maxHealth;
    camera.x = player.x;
    camera.y = player.y;
    spawnWildCompanions(4);
  }

  function nextChapterSetup() {
    game.chapter++;
    if (game.chapter > REGIONS.length) {
      game.chapter = 1;
      game.cycle++;
    }
    game.day = 1;
    game.phase = 'day';
    game.phaseTime = 0;
    game.phaseDuration = DAY_DURATION;
    game.nightsHeld = 0;
    game.nightKills = 0;
    game.activeShelter = null;
    game.panelShelter = null;
    game.inside = false;
    game.insideShelter = null;
    game.enemies.length = 0;
    game.bullets.length = 0;
    game.projectiles.length = 0;
    game.companions.length = 0;
    game.team.length = 0;
    game.boss = null;
    game.bossActive = false;
    game.bossDefeatTimer = 0;
    game.bossFight = false;
    game.maxHealth = playerMaxHealth();
    game.health = game.maxHealth;
    game.resources.wood += 6;
    game.resources.stone += 5;
    game.resources.scrap += 5;

    buildWorld(game.chapter - 1);
    resetShelters();
    resetNodes();
    player.x = 700;
    player.y = 792;
    player.aim = -Math.PI / 2;
    camera.x = player.x;
    camera.y = player.y;
    spawnWildCompanions(5);
    game.mode = 'playing';
    DOM.chapterScreen.classList.add('hidden');
    DOM.dawnScreen.classList.add('hidden');
    hideScreens();
    DOM.hud.classList.add('visible');
    DOM.hud.classList.remove('dim');
    DOM.crosshair.classList.add('active');
    const r = currentRegion;
    banner(`CHAPTER ${roman(game.chapter)}`, r.name, `${r.sub} · ${r.id === 'mexico' ? 'The heat hides them well.' : r.id === 'japan' ? 'The forest is listening.' : 'The valley remembers.'}`, '', 3.6);
    toast('NEW REGION', `${r.name}. New shelters, new SCPs, the same seven nights.`, 'good');
    Sound.night();
    updateTeamUI(true);
  }

  /* ---------------------------------------------------------------------
     Companions
  --------------------------------------------------------------------- */
  function spawnWildCompanions(count) {
    const roles = Object.keys(ROLES);
    const usedNames = new Set(game.companions.map((c) => c.name));
    const openNames = NAMES.filter((n) => !usedNames.has(n));
    for (let i = 0; i < count; i++) {
      let x = 0, y = 0, ok = false;
      for (let tries = 0; tries < 140 && !ok; tries++) {
        x = 160 + Math.random() * (WORLD.w - 320);
        y = 160 + Math.random() * (WORLD.h - 320);
        ok = true;
        for (const s of shelters) if (dist(x, y, s.x, s.y) < s.radius + 140) ok = false;
        for (const c of game.companions) if (c.state === 'wild' && dist(x, y, c.x, c.y) < 220) ok = false;
        for (const w of terrain.water) if (dist(x, y, w.x, w.y) < w.rx) ok = false;
      }
      if (!ok) continue;
      const role = pick(roles);
      const name = openNames.length ? openNames.splice(randInt(0, openNames.length - 1), 1)[0] : pick(NAMES);
      const def = ROLES[role];
      game.companions.push({
        id: 'c' + Math.random().toString(36).slice(2, 9),
        name, role, state: 'wild', x, y,
        hp: def.hp, maxHp: def.hp, angle: Math.random() * TAU,
        fireTimer: Math.random(), seed: Math.random() * 10,
        shelterId: null, targetShelterId: null, hitFlash: 0, invuln: 0
      });
    }
  }

  function teamMembers() { return game.companions.filter((c) => c.state === 'team' && c.hp > 0); }
  function residents() { return game.companions.filter((c) => c.state === 'shelter' && c.hp > 0); }
  function companionsAt(shelterId) {
    return game.companions.filter((c) => c.state === 'shelter' && c.shelterId === shelterId && c.hp > 0);
  }
  function residentAt(shelterId) { return companionsAt(shelterId)[0] || null; }
  function getActiveShelter() { return shelters.find((s) => s.id === game.activeShelter) || null; }
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
      if (code === 'KeyG') { openGuide(); return; }
      if (code === 'Escape' || code === 'KeyP') {
        if (!DOM.guideScreen.classList.contains('hidden')) { closeGuide(); return; }
        if (game.mode === 'playing' || game.mode === 'paused') togglePause();
        return;
      }
      if (code === 'Enter') {
        if (game.mode === 'menu') startGame();
        else if (game.mode === 'dawn') beginNextDay();
        else if (game.mode === 'chapter') nextChapter();
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

    // Menus
    DOM.startBtn.addEventListener('click', startGame);
    DOM.retryBtn.addEventListener('click', startGame);
    DOM.resumeBtn.addEventListener('click', resumeGame);
    DOM.pauseRestartBtn.addEventListener('click', startGame);
    DOM.continueBtn.addEventListener('click', beginNextDay);
    DOM.chapterBtn.addEventListener('click', nextChapter);
    DOM.pauseBtn.addEventListener('click', togglePause);
    DOM.muteBtn.addEventListener('click', () => { Sound.resume(); Sound.setMuted(!Sound.muted); });
    DOM.claimBtn.addEventListener('click', () => {
      const s = game.panelShelter || getActiveShelter();
      if (s) shelterButtonAction(s);
    });
    DOM.weaponBtn.addEventListener('click', buyUpgrade);
    document.querySelectorAll('#fortGrid .fort-btn').forEach((btn) => {
      btn.addEventListener('click', () => buyFort(btn.dataset.action));
    });
    DOM.teamList.addEventListener('click', (e) => {
      const btn = e.target.closest('.tc-dismiss');
      if (!btn) return;
      const c = game.companions.find((x) => x.id === btn.dataset.id);
      if (c) sendCompanionToShelter(c);
    });

    DOM.menuMinBtn.addEventListener('click', () => minimizeMenu(false));
    DOM.menuCloseBtn.addEventListener('click', () => minimizeMenu(true));
    DOM.menuDock.addEventListener('click', restoreMenu);
    DOM.pauseMinBtn.addEventListener('click', minimizePause);
    DOM.pauseCloseBtn.addEventListener('click', resumeGame);
    DOM.pauseDock.addEventListener('click', restorePause);
    DOM.pauseMenuBtn.addEventListener('click', returnToMenu);
    DOM.deathMenuBtn.addEventListener('click', returnToMenu);
    DOM.mobileToggle.addEventListener('click', () => setMobileMode(!mobileMode));
    DOM.guideBtn.addEventListener('click', openGuide);
    DOM.pauseGuideBtn.addEventListener('click', openGuide);
    DOM.kitBtn.addEventListener('click', openGuide);
    DOM.guideCloseBtn.addEventListener('click', closeGuide);
    DOM.guideMobileBtn.addEventListener('click', () => setMobileMode(!mobileMode));

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
     Menu / guide / mobile
  --------------------------------------------------------------------- */
  function setMobileMode(on) {
    mobileMode = !!on;
    saveMobile(mobileMode);
    document.body.classList.toggle('mobile-mode', mobileMode);
    document.body.classList.toggle('touch', mobileMode || touchDevice);
    setText(DOM.mobileToggleText, `Mobile Mode: ${mobileMode ? 'On' : 'Off'}`);
    DOM.mobileToggle.setAttribute('aria-pressed', mobileMode ? 'true' : 'false');
    DOM.mobileToggle.classList.toggle('active', mobileMode);
    DOM.mobileChip.hidden = !mobileMode;
    resize();
    Sound.ui();
  }

  function minimizeMenu(closed) {
    game.menuMinimized = true;
    DOM.menuScreen.classList.add('menu-gone');
    DOM.menuDock.hidden = false;
    DOM.menuDock.querySelector('small').textContent = closed ? 'MENU CLOSED' : 'MENU MINIMIZED';
    Sound.ui();
  }

  function restoreMenu() {
    game.menuMinimized = false;
    DOM.menuScreen.classList.remove('menu-gone');
    DOM.menuDock.hidden = true;
    Sound.ui();
  }

  function minimizePause() {
    if (game.mode !== 'paused') return;
    game.pauseMinimized = true;
    DOM.pauseScreen.classList.add('hidden');
    DOM.pauseDock.hidden = false;
    Sound.ui();
  }

  function restorePause() {
    if (game.mode !== 'paused') return;
    game.pauseMinimized = false;
    DOM.pauseDock.hidden = true;
    DOM.pauseScreen.classList.remove('hidden');
    Sound.ui();
  }

  function openGuide() {
    if (!DOM.guideScreen.classList.contains('hidden')) { closeGuide(); return; }
    game.guideReturn = game.mode;
    if (game.mode === 'playing') {
      game.mode = 'paused';
      DOM.hud.classList.add('dim');
      DOM.pauseDock.hidden = true;
    }
    renderGuide();
    DOM.guideScreen.classList.remove('hidden');
    Sound.ui();
  }

  function closeGuide() {
    DOM.guideScreen.classList.add('hidden');
    if (game.guideReturn === 'playing' && game.mode === 'paused') {
      game.mode = 'playing';
      DOM.hud.classList.remove('dim');
    }
    game.guideReturn = null;
    Sound.ui();
  }

  function renderGuide() {
    const order = ['scp173', 'scp096', 'scp106', 'scp049', 'scp939', 'scp610', 'scp457'];
    const cards = order.map((id) => {
      const d = SCP_TYPES[id];
      const tag = d.threat === 'HIGH' ? 'high' : d.threat === 'MEDIUM' ? 'med' : 'low';
      return `<article class="scp-card ${tag}">
        <div class="scp-icon ${d.kind}">${d.kind === 'statue' ? '▥' : d.kind === 'shy' ? '◉' : d.kind === 'oldman' ? '☠' : d.kind === 'doctor' ? '⚕' : d.kind === 'pack' ? '◈' : d.kind === 'fire' ? '♨' : '❋'}</div>
        <div class="scp-copy">
          <div class="scp-id">${d.name}<span>${d.threat}</span></div>
          <b>${d.label}</b>
          <p>${d.desc}</p>
          <small>HP ${d.hp} · SPD ${d.speed} · DMG ${d.dmg} · WALL ${d.wall}</small>
        </div>
      </article>`;
    }).join('');
    const boss = SCP_TYPES.scp682;
    const regionList = REGIONS.map((r, i) => `<div class="guide-region ${i === game.chapter - 1 ? 'active' : ''}"><span>${roman(i + 1)}</span><b>${r.name}</b><small>${r.sub}</small></div>`).join('');
    DOM.guideBody.innerHTML = `
      <div class="guide-section">
        <h3>Containment Roster</h3>
        <div class="scp-grid">${cards}</div>
      </div>
      <div class="guide-section boss-entry">
        <div class="boss-emblem">☣</div>
        <div>
          <div class="scp-id">${boss.name}<span>APOCALYPSE</span></div>
          <b>${boss.label}</b>
          <p>${boss.desc} Appears on the seventh night of every region. Kill it before dawn can break.</p>
        </div>
      </div>
      <div class="guide-section">
        <h3>Region Route</h3>
        <div class="guide-regions">${regionList}</div>
      </div>
      <div class="guide-section">
        <h3>Survival Protocol</h3>
        <ul class="guide-list">
          <li><b>Enter a shelter</b> to break line of sight. Most SCPs will attack the barricade instead of you.</li>
          <li><b>Repair and fortify</b> before dusk. Once the wall falls, nothing inside is safe.</li>
          <li><b>Never reuse a shelter</b> without expecting stronger SCPs. The dark remembers ground.</li>
          <li><b>SCP-173</b> slows while you look at it. <b>SCP-096</b> is dormant until you shoot it.</li>
        </ul>
      </div>`;
  }

  /* ---------------------------------------------------------------------
     Screens
  --------------------------------------------------------------------- */
  function hideScreens(except) {
    [DOM.menuScreen, DOM.pauseScreen, DOM.dawnScreen, DOM.chapterScreen, DOM.gameoverScreen].forEach((el) => {
      if (el !== except) el.classList.add('hidden');
    });
    DOM.pauseDock.hidden = true;
    if (except !== DOM.menuScreen) DOM.menuDock.hidden = true;
  }

  function startGame() {
    Sound.init();
    Sound.resume();
    keys.clear();
    resetRun();
    hideScreens();
    DOM.menuDock.hidden = true;
    DOM.guideScreen.classList.add('hidden');
    DOM.hud.classList.add('visible');
    DOM.hud.classList.remove('dim');
    DOM.crosshair.classList.add('active');
    game.mode = 'playing';
    const r = currentRegion;
    banner(`CHAPTER ${roman(game.chapter)}`, r.name, `${r.sub} · Seven nights. One boss.`, '', 3.4);
    toast('DAYLIGHT', `${r.name}. Six shelters. They will not stay fresh forever.`, 'good');
    setTimeout(() => {
      if (game.mode === 'playing') toast('THE RULE', 'Never sleep in the same shelter twice unless you must.', 'warn');
    }, 4200);
    setTimeout(() => {
      if (game.mode === 'playing') toast('SHELTERS', 'Press E inside a shelter to hide behind the barricade.', '');
    }, 8800);
    Sound.setMuted(Sound.muted);
    updateTeamUI(true);
  }

  function returnToMenu() {
    game.mode = 'menu';
    hideScreens(DOM.menuScreen);
    DOM.menuScreen.classList.remove('menu-gone');
    DOM.menuDock.hidden = true;
    DOM.pauseDock.hidden = true;
    DOM.guideScreen.classList.add('hidden');
    DOM.hud.classList.remove('visible');
    DOM.hud.classList.remove('dim');
    DOM.crosshair.classList.remove('active');
    DOM.interactPrompt.hidden = true;
    resetRun();
    game.mode = 'menu';
    game.phase = 'dusk';
    game.phaseDuration = DUSK_DURATION;
    game.phaseTime = 0;
    hideScreens(DOM.menuScreen);
    DOM.hud.classList.remove('visible');
    updateBestBadges();
    updateTeamUI(true);
  }

  function togglePause() {
    if (game.mode === 'playing') {
      game.mode = 'paused';
      game.firing = false;
      DOM.hud.classList.add('dim');
      DOM.pauseScreen.classList.remove('hidden');
      DOM.pauseDock.hidden = true;
      Sound.ui();
    } else if (game.mode === 'paused') {
      resumeGame();
    }
  }

  function resumeGame() {
    if (game.mode !== 'paused') return;
    game.mode = 'playing';
    game.pauseMinimized = false;
    DOM.hud.classList.remove('dim');
    DOM.pauseScreen.classList.add('hidden');
    DOM.pauseDock.hidden = true;
    DOM.guideScreen.classList.add('hidden');
    Sound.resume();
  }

  function enterDusk() {
    if (game.mode !== 'playing') return;
    game.phase = 'dusk';
    game.phaseTime = 0;
    game.phaseDuration = DUSK_DURATION;
    banner('DUSK', 'THE LIGHT FAILS', 'Get inside a shelter. They come with the dark.', 'dusk', 2.6);
    toast('DUSK', 'Nightfall is close. Enter a shelter if you can.', 'warn');
    Sound.setNight(true);
  }

  function enterNight() {
    if (game.mode !== 'playing') return;
    game.phase = 'night';
    game.phaseTime = 0;
    game.nightDuration = Math.round(NIGHT_BASE + Math.min(28, (game.day - 1) * 3.4) + (game.chapter - 1) * 5);
    game.phaseDuration = game.day >= CHAPTER_NIGHTS ? 150 : game.nightDuration;
    game.nightKills = 0;
    game.spawnTimer = 2.2;
    game.queueTimer = 0.1;
    const active = getActiveShelter();
    if (active) active.state.breached = active.state.integrity <= 0;
    const haunt = active ? active.state.haunt : 0;
    game.spawnQueue = Math.round((5 + game.day * 2.2 + haunt * 2 + (game.chapter - 1) * 3) * 1.08);
    game.trickle = Math.max(1.25, 4.6 - game.day * 0.24 - haunt * 0.34 - (game.chapter - 1) * 0.2);
    spawnResidentRaids();

    if (game.day >= CHAPTER_NIGHTS) {
      game.bossFight = true;
      spawnBoss();
      banner('NIGHT SEVEN', 'SCP-682 HAS BREACHED', 'Nothing ends until it does.', 'boss', 4.2);
      toast('EXTREME THREAT', 'SCP-682 is awake. Kill it to finish the chapter.', 'alert');
      Sound.bossRoar();
    } else {
      banner('NIGHTFALL', 'THEY ARE COMING', active ? `Hold ${active.name} until dawn.` : 'You have no shelter. Keep moving.', 'night', 3.2);
      if (!active) toast('NO SHELTER', 'They will come for you directly. Run. Shoot. Survive.', 'alert');
      else if (haunt >= 2) toast('REMEMBERED GROUND', `${active.name} knows your scent. They are already close.`, 'alert');
      Sound.night();
    }
    Sound.setNight(true);
    game.shake = Math.max(game.shake, 5);
  }

  function endNight() {
    if (game.mode !== 'playing') return;
    game.nightsHeld++;
    if (game.nightsHeld > game.best) {
      game.best = game.nightsHeld;
      saveBest(game.best);
    }
    for (const c of game.companions) {
      if (c.state === 'team' || c.state === 'shelter') c.hp = Math.min(c.maxHp, c.hp + 16);
    }
    for (const e of game.enemies) if (!e.dead) spawnMist(e.x, e.y, 5, '#6d5b68');
    game.enemies.length = 0;
    game.projectiles.length = 0;
    game.bullets.length = 0;
    game.boss = null;
    game.bossActive = false;
    game.bossFight = false;
    game.spawnQueue = 0;
    game.firing = false;
    DOM.crosshair.classList.remove('active');
    if (game.day >= CHAPTER_NIGHTS) showChapterComplete();
    else showDawn();
  }

  function showDawn() {
    game.mode = 'dawn';
    game.phase = 'dawn';
    game.phaseTime = 0;
    game.phaseDuration = 9;
    game.dawnTimer = 9;
    game.health = Math.min(game.maxHealth, game.health + 18);
    const active = getActiveShelter();
    if (active) active.state.haunt++;
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
    setText(DOM.dawnText, `Night ${game.day} is over in ${currentRegion.name}. The region is quiet again — but not for long.`);
    setText(DOM.dawnCountdown, '9');
    DOM.dawnScreen.classList.remove('hidden');
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
    game.boss = null;
    game.bossActive = false;
    game.bossFight = false;
    DOM.crosshair.classList.add('active');
    const active = getActiveShelter();
    if (active) active.state.breached = false;
    if (game.day === 7) {
      banner('DAY 7', 'THE FINAL NIGHT', 'SCP-682 wakes at dusk. Fortify everything.', 'boss', 3.4);
      toast('BOSS NIGHT', 'SCP-682 will breach at nightfall. Prepare.', 'alert');
    } else {
      banner(`DAY ${game.day}`, 'THE SUN RETURNS', 'Scavenge. Fortify. Choose a different roof.', '', 2.7);
      toast('DAYBREAK', `Night ${game.day - 1} survived. The shelters remember.`, 'good');
    }
    Sound.dawn();
    updateTeamUI(true);
  }

  function showChapterComplete() {
    game.mode = 'chapter';
    game.phase = 'dawn';
    game.health = Math.min(game.maxHealth, game.health + 30);
    DOM.hud.classList.add('dim');
    setText(DOM.chapterRoman, roman(game.chapter));
    const finalChapter = game.chapter >= REGIONS.length;
    if (finalChapter) {
      setText(DOM.chapterText, `Every region on the route is contained. SCP-682 was driven back into the dark. The Foundation will not thank you — but the sun is still up.`);
      setText(DOM.nextChapterName, 'NEW CYCLE');
      setText(DOM.nextChapterSub, 'THE VALLEY · HARDER');
      setText(DOM.nextChapterDesc, 'The route begins again. SCPs are stronger, and the shelters remember more.');
      DOM.chapterBtn.textContent = 'Begin New Cycle';
    } else {
      const next = REGIONS[game.chapter];
      setText(DOM.chapterText, `SCP-682 has been driven back. ${currentRegion.name} is scarred, but the road continues into ${next.name}.`);
      setText(DOM.nextChapterName, next.name);
      setText(DOM.nextChapterSub, next.sub);
      setText(DOM.nextChapterDesc, next.id === 'mexico'
        ? 'Heat, dust, and something old beneath the sand. New SCPs. The same seven nights.'
        : 'Bamboo, mist, and a forest that listens. New SCPs. The same seven nights.');
      DOM.chapterBtn.textContent = 'Travel to Next Region';
    }
    setText(DOM.chapterNights, String(game.nightsHeld));
    setText(DOM.chapterKills, String(game.kills));
    setText(DOM.chapterTeam, String(teamMembers().length));
    setText(DOM.chapterCount, `${game.chapter} / ${REGIONS.length}`);
    DOM.chapterScreen.classList.remove('hidden');
    Sound.dawn();
    Sound.setNight(false);
    updateBestBadges();
  }

  function nextChapter() {
    if (game.mode !== 'chapter') return;
    Sound.resume();
    nextChapterSetup();
  }

  /* ---------------------------------------------------------------------
     Phase + player
  --------------------------------------------------------------------- */
  function updatePhase(dt) {
    game.phaseTime += dt;
    if (game.phase === 'day') {
      if (game.phaseTime >= DAY_DURATION) enterDusk();
    } else if (game.phase === 'dusk') {
      if (game.phaseTime >= DUSK_DURATION) enterNight();
    } else if (game.phase === 'night') {
      if (game.day >= CHAPTER_NIGHTS) {
        if (!game.bossActive) {
          game.bossDefeatTimer -= dt;
          if (game.bossDefeatTimer <= 0) endNight();
        }
      } else if (game.phaseTime >= game.nightDuration) {
        endNight();
      }
    }
  }

  function updatePlayer(dt) {
    game.cooldown = Math.max(0, game.cooldown - dt);
    game.muzzle = Math.max(0, game.muzzle - dt);
    player.invuln = Math.max(0, player.invuln - dt);
    player.hitFlash = Math.max(0, player.hitFlash - dt);

    let ix = 0, iy = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) iy -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) iy += 1;
    ix += joystick.x;
    iy += joystick.y;
    const len = Math.hypot(ix, iy);
    if (len > 1) { ix /= len; iy /= len; }
    player.moving = len > 0.08;

    const active = getActiveShelter();
    let speed = player.speed;
    if (game.inside && active) speed *= 0.48;
    player.x = clamp(player.x + ix * speed * dt, 34, WORLD.w - 34);
    player.y = clamp(player.y + iy * speed * dt, 34, WORLD.h - 34);
    if (game.inside && active) {
      const d = dist(player.x, player.y, active.x, active.y);
      const max = active.radius * 0.5;
      if (d > max) {
        const a = Math.atan2(player.y - active.y, player.x - active.x);
        player.x = active.x + Math.cos(a) * max;
        player.y = active.y + Math.sin(a) * max;
      }
    }
    if (player.moving) player.walk += dt * 9.5;

    if (mobileMode || touchDevice) {
      if (game.firing) {
        const target = nearestEnemy(player.x, player.y, 900);
        if (target) player.aim = Math.atan2(target.y - player.y, target.x - player.x);
      } else if (player.moving) {
        player.aim = Math.atan2(iy, ix);
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
     Interaction + shelter
  --------------------------------------------------------------------- */
  function nearestShelterInRange(x, y, range) {
    let best = null;
    let bd = range || Infinity;
    for (const s of shelters) {
      if (s.state.collapsed) continue;
      const d = dist(x, y, s.x, s.y);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  function updateInteraction() {
    let bestShelter = null;
    let bestShelterDist = Infinity;
    for (const s of shelters) {
      if (s.state.collapsed) continue;
      const d = dist(player.x, player.y, s.x, s.y);
      if (d < s.radius + 165 && d < bestShelterDist) { bestShelter = s; bestShelterDist = d; }
    }
    game.panelShelter = bestShelter;

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

    let prompt = null;
    if (game.inside) {
      prompt = { kind: 'shelter', target: getActiveShelter(), action: 'exit', text: 'Leave shelter', d: -1 };
    } else {
      if (wild) prompt = { kind: 'recruit', target: wild, action: 'recruit', text: `Recruit ${wild.name} · ${ROLES[wild.role].label}`, d: wildDist };
      if (node && (!prompt || nodeDist < prompt.d)) prompt = { kind: 'node', target: node, action: 'gather', text: `Gather ${node.type}`, d: nodeDist };
      if (bestShelter) {
        const residentsHere = companionsAt(bestShelter.id);
        let action = null;
        let text = '';
        if (!bestShelter.state.owned) {
          action = 'claim';
          text = `Claim ${bestShelter.name}`;
        } else if (game.activeShelter !== bestShelter.id) {
          action = 'camp';
          text = `Make camp at ${bestShelter.name}`;
        } else if (residentsHere.length && teamMembers().length < MAX_TEAM) {
          action = 'recall';
          text = `Call ${residentsHere[0].name} to your side`;
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
      setText(DOM.interactKey, prompt.action === 'exit' ? 'E' : 'E');
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
    } else if (p.action === 'recall') {
      const resident = companionsAt(p.target.id)[0];
      if (resident) recallCompanion(resident);
    } else if (p.action === 'enter') {
      enterShelter(p.target);
    } else if (p.action === 'exit') {
      exitShelter();
    }
  }

  function shelterButtonAction(s) {
    if (!s) return;
    if (!s.state.owned) claimShelter(s);
    else if (game.activeShelter !== s.id) claimShelter(s);
    else if (game.inside) exitShelter();
    else enterShelter(s);
  }

  function enterShelter(s) {
    if (!s || s.state.collapsed || !s.state.owned || game.activeShelter !== s.id) {
      toast('CLAIM IT FIRST', 'You need to own this shelter before you can hide inside.', 'warn');
      Sound.deny();
      return;
    }
    game.inside = true;
    game.insideShelter = s.id;
    player.x = s.x;
    player.y = s.y + 12;
    player.aim = Math.PI / 2;
    banner('INSIDE', 'PROTECTED', 'The barricade takes the hits now.', '', 1.8);
    toast('SHELTER ENTERED', 'SCPs will target the barricade. If it falls, they will reach you.', 'good');
    spawnSparks(s.x, s.y + 20, 8, '#efb661', 1.2);
    Sound.claim();
    updateInteraction();
  }

  function exitShelter() {
    const s = getActiveShelter();
    if (!s) { game.inside = false; return; }
    game.inside = false;
    game.insideShelter = null;
    const a = Math.PI * 0.5;
    player.x = s.x + Math.cos(a) * (s.radius + 26);
    player.y = s.y + Math.sin(a) * (s.radius + 26);
    toast('LEFT SHELTER', 'You are exposed again.', 'warn');
    Sound.ui();
    updateInteraction();
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

  function claimShelter(s) {
    if (game.mode !== 'playing' || s.state.collapsed) return;
    const st = s.state;
    if (!st.owned) {
      st.owned = true;
      st.integrity = st.maxIntegrity;
      toast('SHELTER CLAIMED', `${s.name} is yours. Fortify it, then get inside before dark.`, 'good');
      Sound.claim();
    } else if (game.activeShelter !== s.id) {
      st.integrity = Math.max(st.integrity, Math.round(st.maxIntegrity * 0.5));
      toast('CAMP MOVED', `You return to ${s.name}. The walls are patched, not whole.`, '');
      Sound.claim();
    }
    game.activeShelter = s.id;
    st.breached = st.integrity <= 0;
    if (st.haunt >= 2) {
      toast('REMEMBERED GROUND', `${s.name} has hosted you too often. The dark is waiting.`, 'alert');
    } else if (st.haunt === 1) {
      toast('WATCHED GROUND', `${s.name} has been used once. Expect company.`, 'warn');
    }
    spawnSparks(s.x, s.y + 30, 14, '#efb661', 2);
    // Claiming the shelter you are standing in immediately gets you behind the wall.
    if (!game.inside && dist(player.x, player.y, s.x, s.y) < s.radius + 30) {
      game.inside = true;
      game.insideShelter = s.id;
      player.x = s.x;
      player.y = s.y + 12;
      toast('INSIDE', 'The barricade is between you and them.', 'good');
    }
    updateTeamUI(true);
    updateInteraction();
  }

  function buyFort(action) {
    const s = game.panelShelter || getActiveShelter();
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
      if (st.maxIntegrity >= 400 && st.integrity >= st.maxIntegrity) { toast('FULLY FORTIFIED', 'There is no more wall to build.', 'warn'); return fail(); }
      game.resources.wood -= 3;
      st.maxIntegrity = Math.min(400, st.maxIntegrity + 22);
      st.integrity = Math.min(st.maxIntegrity, st.integrity + 85);
      toast('BARRICADE', `+85 integrity · ${Math.ceil(st.integrity)} / ${st.maxIntegrity}`, 'good');
      Sound.claim();
    } else if (action === 'reinforce') {
      if (game.resources.stone < 3) { toast('NOT ENOUGH STONE', 'Reinforcement needs 3 stone.', 'warn'); return fail(); }
      if (st.armor >= 0.65) { toast('ARMOR MAXED', 'The walls are as braced as they get.', 'warn'); return fail(); }
      game.resources.stone -= 3;
      st.armor = Math.min(0.65, st.armor + 0.1);
      toast('REINFORCED', `Armor now ${Math.round(st.armor * 100)}%.`, 'good');
      Sound.claim();
    } else if (action === 'traps') {
      if (game.resources.scrap < 4) { toast('NOT ENOUGH SCRAP', 'The spike ring needs 4 scrap.', 'warn'); return fail(); }
      if (st.traps >= 52) { toast('TRAPS MAXED', 'The ring is already a hedge of iron.', 'warn'); return fail(); }
      game.resources.scrap -= 4;
      st.traps = Math.min(52, st.traps + 10);
      toast('SPIKE RING', `${st.traps} damage per second at the wall.`, 'good');
      Sound.claim();
    } else if (action === 'repair') {
      if (game.resources.wood < 2) { toast('NOT ENOUGH WOOD', 'Repairs need 2 wood.', 'warn'); return fail(); }
      if (st.integrity >= st.maxIntegrity) { toast('NO REPAIRS NEEDED', 'The barricade is whole.', 'warn'); return fail(); }
      game.resources.wood -= 2;
      st.integrity = Math.min(st.maxIntegrity, st.integrity + 95);
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
    if (game.particles.length > 480) game.particles.shift();
    game.particles.push(p);
  }
  function spawnMist(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const s = rand(10, 55);
      addParticle({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.45, 1.15), max: 1.15, r: rand(2.5, 7), color: color || '#4b3947', drag: 2.2, type: 'mist' });
    }
  }
  function spawnSparks(x, y, n, color, scale) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const s = rand(25, 130) * (scale || 1);
      addParticle({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.2, 0.55), max: 0.55, r: rand(1, 2.6), color: color || '#efb661', drag: 3.2, gravity: 100, type: 'spark' });
    }
  }
  function addText(x, y, text, color) {
    if (game.texts.length > 40) game.texts.shift();
    game.texts.push({ x, y, text, color: color || '#efe4cf', life: 1.1, max: 1.1 });
  }
  function emitFireEmbers(dt) {
    game.fireTimer -= dt;
    if (game.fireTimer > 0) return;
    game.fireTimer = 0.075;
    for (const s of shelters) {
      if (s.state.collapsed) continue;
      if (dist(camera.x, camera.y, s.x, s.y) > Math.max(view.w, view.h) * 0.75) continue;
      if (!s.state.owned && s.id !== game.activeShelter) continue;
      addParticle({
        x: s.x + rand(-7, 7), y: s.y + 36 + rand(-3, 3),
        vx: rand(-7, 7), vy: rand(-36, -60), life: rand(0.45, 1.1), max: 1.1,
        r: rand(1, 2.8), color: Math.random() < 0.35 ? '#ffd08a' : '#e78c3f', drag: 0.4, type: 'ember'
      });
    }
    if (game.phase === 'night' && Math.random() < 0.55) {
      addParticle({
        x: player.x + rand(-260, 260), y: player.y + rand(-180, 180),
        vx: rand(-4, 4), vy: rand(-10, -24), life: rand(1, 2), max: 2,
        r: rand(0.7, 1.8), color: '#cfe08c', drag: 0.2, type: 'ember'
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
        p.vx *= d; p.vy *= d;
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
    const spread = (0.03 - game.weaponTier * 0.004) * (player.moving ? 1.8 : 1) + (game.inside ? 0.012 : 0);
    const a = player.aim + (Math.random() - 0.5) * spread;
    const bx = player.x + Math.cos(a) * 23;
    const by = player.y + Math.sin(a) * 23;
    game.bullets.push({ x: bx, y: by, px: bx, py: by, vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed, life: 0.92, dmg: w.dmg, owner: 'player' });
    game.cooldown = w.rate;
    game.muzzle = 0.07;
    game.shake = Math.max(game.shake, 2.2);
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
    game.bullets.push({ x: bx, y: by, px: bx, py: by, vx: Math.cos(a) * 980, vy: Math.sin(a) * 980, life: 0.8, dmg: def.dmg, owner: c.id });
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
    e.hp -= dmg;
    e.hitFlash = 0.13;
    if (e.kind === 'shy' && !e.enraged) {
      e.enraged = true;
      toast('SCP-096 ENRAGED', 'You looked. It knows. Run.', 'alert');
      Sound.bossRoar();
      game.shake = Math.max(game.shake, 8);
    }
    const m = Math.hypot(vx || 1, vy || 1) || 1;
    e.x += ((vx || 1) / m) * (e.isBoss ? 1 : 4);
    e.y += ((vy || 1) / m) * (e.isBoss ? 1 : 4);
    spawnMist(e.x, e.y, e.isBoss ? 12 : e.r > 15 ? 5 : 3, '#6c4650');
    Sound.hit();
    if (e.hp <= 0) killEnemy(e);
  }

  function killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    game.kills++;
    game.nightKills++;
    const big = e.isBoss || e.r > 16;
    spawnMist(e.x, e.y, big ? 30 : 12, '#5b3c49');
    spawnSparks(e.x, e.y, big ? 18 : 6, e.kind === 'doctor' ? '#c9d6a8' : e.kind === 'fire' ? '#ffb04f' : '#d5533f', big ? 2.2 : 1.1);
    game.shake = Math.max(game.shake, big ? 12 : 2.5);
    Sound.kill();
    if (e.isBoss) {
      game.bossActive = false;
      game.boss = null;
      game.bossDefeatTimer = 5.2;
      banner('SCP-682 DOWN', 'THE REPTILE FALLS', 'Dawn is coming. Finish the chapter.', 'boss', 4.2);
      toast('BOSS CONTAINED', 'SCP-682 has stopped moving. For now.', 'good');
      flash(DOM.healFlash, 0.7, 1200);
      Sound.bossRoar();
      return;
    }
    if (Math.random() < (e.r > 15 ? 0.75 : 0.4)) {
      const roll = Math.random();
      const type = roll < 0.42 ? 'scrap' : roll < 0.72 ? 'wood' : 'stone';
      game.resources[type]++;
      const color = type === 'wood' ? '#b07a47' : type === 'stone' ? '#9aa1a0' : '#7fb2a5';
      addText(e.x, e.y - 20, `+1 ${type.toUpperCase()}`, color);
    }
  }

  /* ---------------------------------------------------------------------
     Spawning
  --------------------------------------------------------------------- */
  function pickEnemyType() {
    const pool = currentRegion.pool.slice();
    const day = game.day + (game.chapter - 1) * 2 - 1;
    if (day < 2) return pool[Math.random() < 0.6 ? 2 : 0] || pool[0];
    const roll = Math.random();
    if (roll < 0.18) return pool[0];
    if (roll < 0.36) return pool[1];
    if (roll < 0.58) return pool[2];
    if (roll < 0.72 && pool[3]) return pool[3];
    return pool[randInt(0, pool.length - 1)];
  }

  function makeEnemy(type, x, y, raidShelterId) {
    const def = SCP_TYPES[type] || SCP_TYPES.scp173;
    const scale = 1 + (game.day - 1) * 0.15 + (game.chapter - 1) * 0.32 + (game.cycle - 1) * 0.3;
    return {
      type, kind: def.kind, name: def.name, label: def.label,
      x, y, r: def.r,
      hp: def.hp * scale, maxHp: def.hp * scale,
      speed: def.speed + (game.day - 1) * 1.1 + (game.chapter - 1) * 3.2,
      dmg: def.dmg + (game.day - 1) * 0.6 + (game.chapter - 1) * 1.6,
      atk: def.atk, wall: def.wall * (1 + (game.chapter - 1) * 0.18),
      ranged: !!def.ranged, color: def.color, eye: def.eye,
      raidShelterId: raidShelterId || null,
      prefersCompanions: Math.random() < 0.34,
      atkTimer: rand(0.2, 0.9), fireTimer: rand(0.8, 2.4),
      hitFlash: 0, dead: false, seed: Math.random() * 10,
      angle: Math.random() * TAU, enraged: false, isBoss: false,
      arm: Math.random() * TAU, spawn: 0
    };
  }

  function spawnEnemyAround(center, raidShelterId) {
    let a = Math.random() * TAU;
    let radius = rand(520, 800);
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
    return e;
  }

  function spawnBoss() {
    const a = Math.random() * TAU;
    const center = getActiveShelter() || player;
    let x = clamp(center.x + Math.cos(a) * 640, 120, WORLD.w - 120);
    let y = clamp(center.y + Math.sin(a) * 640, 120, WORLD.h - 120);
    const def = SCP_TYPES.scp682;
    const scale = 1 + (game.chapter - 1) * 0.55 + (game.cycle - 1) * 0.4;
    const boss = {
      type: 'scp682', kind: 'boss', name: 'SCP-682', label: 'HARD-TO-DESTROY REPTILE',
      x, y, r: 42,
      hp: def.hp * scale, maxHp: def.hp * scale,
      speed: def.speed + game.chapter * 4,
      dmg: def.dmg + (game.chapter - 1) * 8,
      atk: def.atk, wall: def.wall * (1 + (game.chapter - 1) * 0.25),
      ranged: false, color: def.color, eye: def.eye,
      raidShelterId: null, prefersCompanions: false,
      atkTimer: 1.4, fireTimer: 4.2, roarTimer: 9,
      hitFlash: 0, dead: false, seed: Math.random() * 10,
      angle: Math.atan2(player.y - y, player.x - x), enraged: false,
      isBoss: true, spawn: 0, phase: 1
    };
    game.enemies.push(boss);
    game.boss = boss;
    game.bossActive = true;
    spawnMist(x, y, 40, '#485a3b');
    spawnSparks(x, y, 26, '#ff5a36', 2.6);
  }

  function spawnResidentRaids() {
    const day = game.day;
    for (const c of residents()) {
      const s = shelters.find((x) => x.id === c.shelterId);
      if (!s || s.state.collapsed) continue;
      const count = 1 + Math.floor((day + game.chapter - 1) / 4);
      for (let i = 0; i < count; i++) spawnEnemyAround(s, s.id);
      if (dist(player.x, player.y, s.x, s.y) < 900) {
        toast('COMPANION IN DANGER', `${c.name} is holding ${s.name} alone.`, 'warn');
      }
    }
  }

  function updateSpawning(dt) {
    if (game.phase !== 'night') return;
    if (game.bossFight && game.bossActive) {
      game.spawnTimer -= dt;
      if (game.spawnTimer <= 0) {
        const cap = 16 + game.chapter * 3;
        if (game.enemies.length < cap) {
          const center = game.boss || player;
          const e = spawnEnemyAround(center);
          if (e) e.enraged = e.kind === 'shy';
        }
        game.spawnTimer = 7.5 + Math.random() * 3;
      }
      return;
    }
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
      if (game.inside && game.insideShelter === s.id) {
        toast('THE WALLS FALL', 'They are inside. Get out or fight.', 'alert');
        banner('BARRICADE BREACHED', 'FIGHT IN THE OPEN', 'There is no protection left.', 'night', 2.4);
      } else {
        toast('BARRICADE BREACHED', `${s.name}'s walls are open. They are inside.`, 'alert');
        banner('THE WALLS FALL', 'FIGHT IN THE OPEN', 'They are through.', 'night', 2.2);
      }
      game.shake = 16;
      Sound.breach();
    }
  }

  function spawnEnemyProjectile(e, target, dmgOverride) {
    const a = Math.atan2(target.y - e.y, target.x - e.x);
    const kind = e.kind;
    game.projectiles.push({
      x: e.x + Math.cos(a) * (e.r + 4), y: e.y + Math.sin(a) * (e.r + 4),
      vx: Math.cos(a) * (kind === 'boss' ? 300 : 245),
      vy: Math.sin(a) * (kind === 'boss' ? 300 : 245),
      life: 3.4, dmg: dmgOverride || e.dmg,
      color: kind === 'doctor' ? '#c9dba8' : kind === 'fire' ? '#ff9a4f' : kind === 'boss' ? '#9cff5e' : '#a77bd0',
      r: kind === 'boss' ? 7 : 4.2
    });
    Sound.tone(kind === 'fire' ? 240 : 180, 0.2, 'sawtooth', 0.04, kind === 'fire' ? 120 : 90);
  }

  function updateProjectiles(dt) {
    for (let i = game.projectiles.length - 1; i >= 0; i--) {
      const p = game.projectiles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (Math.random() < dt * 22) {
        addParticle({ x: p.x, y: p.y, vx: rand(-8, 8), vy: rand(-8, 8), life: 0.35, max: 0.35, r: 3, color: p.color, drag: 2, type: 'mist' });
      }
      // intact barricade absorbs projectiles aimed at someone inside
      const active = getActiveShelter();
      if (game.inside && active && game.insideShelter === active.id && active.state.integrity > 0) {
        if (dist(p.x, p.y, active.x, active.y) < active.radius + 12) {
          spawnSparks(p.x, p.y, 4, p.color, 0.8);
          game.projectiles.splice(i, 1);
          continue;
        }
      }
      if (dist(p.x, p.y, player.x, player.y) < 18) {
        damagePlayer(p.dmg);
        game.projectiles.splice(i, 1);
        continue;
      }
      if (p.life <= 0) game.projectiles.splice(i, 1);
    }
  }

  /* ---------------------------------------------------------------------
     HUD + feedback
  --------------------------------------------------------------------- */
  function flash(el, strength, ms) {
    if (!el) return;
    el.style.transition = 'none';
    el.style.opacity = String(clamp(strength, 0, 1));
    void el.offsetWidth;
    el.style.transition = `opacity ${ms || 500}ms ease-out`;
    el.style.opacity = '0';
  }

  function toast(kicker, text, tone) {
    if (!DOM.toastStack) return;
    const el = document.createElement('div');
    el.className = 'toast' + (tone ? ' ' + tone : '');
    const k = document.createElement('b');
    k.textContent = kicker || '';
    const p = document.createElement('span');
    p.textContent = text || '';
    el.appendChild(k);
    el.appendChild(p);
    DOM.toastStack.appendChild(el);
    while (DOM.toastStack.children.length > 4) DOM.toastStack.removeChild(DOM.toastStack.firstChild);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 420);
    }, 4200);
  }

  function banner(kicker, title, sub, style, duration) {
    const el = DOM.centerBanner;
    if (!el) return;
    setText(DOM.bannerKicker, kicker || '');
    setText(DOM.bannerTitle, title || '');
    setText(DOM.bannerSub, sub || '');
    el.className = 'center-banner show' + (style ? ' ' + style : '');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => {
      el.classList.remove('show');
    }, Math.max(900, (duration || 2.6) * 1000));
  }

  function updateBestBadges() {
    setText(DOM.bestBadge, game.best > 0 ? `BEST ${game.best}` : 'BEST —');
    setText(DOM.bestDays, game.best > 0 ? String(game.best) : '—');
  }

  let teamSignature = '';
  function updateTeamUI(force) {
    if (!DOM.teamList) return;
    const visible = game.companions.filter((c) => c.state === 'team' || c.state === 'shelter' || c.state === 'travel');
    const sig = visible.map((c) => `${c.id}:${c.state}:${Math.ceil(c.hp)}:${c.shelterId || ''}`).join('|') +
      `|${teamMembers().length}`;
    if (!force && sig === teamSignature) return;
    teamSignature = sig;

    setText(DOM.teamCount, `${teamMembers().length} / ${MAX_TEAM}`);
    if (!visible.length) {
      DOM.teamList.innerHTML = '<div class="team-empty">No one walks with you. Find survivors in the wild.</div>';
      return;
    }
    DOM.teamList.innerHTML = visible.map((c) => {
      const def = ROLES[c.role];
      const pct = Math.max(0, Math.min(100, (c.hp / c.maxHp) * 100));
      const where = c.state === 'team' ? 'AT YOUR SIDE'
        : c.state === 'travel' ? 'MOVING TO SHELTER'
          : 'HOLDING ' + (shelters.find((s) => s.id === c.shelterId) || { name: 'SHELTER' }).name.toUpperCase();
      const btn = c.state === 'team'
        ? `<button class="tc-dismiss" type="button" data-id="${c.id}" title="Send ${c.name} to a shelter" aria-label="Send ${c.name} to a shelter">↗</button>`
        : '';
      return `<div class="team-card">
        <span class="tc-dot ${c.role}"></span>
        <div class="tc-main">
          <b>${c.name}</b>
          <span>${def.label.toUpperCase()} · ${where}</span>
          <div class="tc-hp"><i style="width:${pct}%"></i></div>
        </div>${btn}
      </div>`;
    }).join('');
  }

  function shelterDread() {
    const base = 1 + (game.day - 1) * 0.24 + (game.chapter - 1) * 0.55 + (game.cycle - 1) * 0.5;
    return base + (game.phase === 'night' ? 0.65 : game.phase === 'dusk' ? 0.25 : 0);
  }

  function updateShelterPanel() {
    const s = game.panelShelter || (game.inside ? getActiveShelter() : null);
    DOM.shelterPanel.classList.toggle('open', !!s);
    if (!s) return;
    const st = s.state;
    setText(DOM.shelterName, s.name);
    setText(DOM.shelterPerk, s.perk);
    const occupant = residentAt(s.id);
    const occText = occupant
      ? `${occupant.name} · ${ROLES[occupant.role].label} is holding this shelter`
      : st.owned ? (game.inside && game.insideShelter === s.id ? 'You are inside. The barricade is holding.' : 'Yours. Vacant.') : 'Unclaimed shelter.';
    setText(DOM.shelterOccupant, occText);
    DOM.shelterOccupant.classList.toggle('empty', !occupant && !st.owned);

    const badge = DOM.hauntBadge;
    badge.classList.remove('fresh', 'worn', 'haunted', 'collapsed');
    if (st.collapsed) { badge.textContent = 'LOST'; badge.classList.add('collapsed'); }
    else if (st.integrity <= 0) { badge.textContent = 'BREACHED'; badge.classList.add('haunted'); }
    else if (st.haunt >= 2) { badge.textContent = 'REMEMBERED'; badge.classList.add('haunted'); }
    else if (st.haunt === 1) { badge.textContent = 'WATCHED'; badge.classList.add('worn'); }
    else { badge.textContent = 'FRESH'; badge.classList.add('fresh'); }

    const max = Math.max(1, st.maxIntegrity);
    const pct = Math.round((Math.max(0, st.integrity) / max) * 100);
    setText(DOM.barricadeText, `${Math.ceil(Math.max(0, st.integrity))} / ${Math.ceil(max)}`);
    DOM.barricadeFill.style.width = pct + '%';
    DOM.barricadeFill.classList.toggle('critical', pct < 28);
    setText(DOM.armorText, `ARMOR ${Math.round(st.armor * 100)}%`);
    setText(DOM.threatText, `TONIGHT ${shelterDread().toFixed(1)}`);
    setText(DOM.turretText, st.traps > 0 ? `SPIKES — ${st.traps} DPS` : 'SPIKES — NONE');
    setText(DOM.barrierText, st.owned ? 'BARRIER — HOLDING' : 'BARRIER — NONE');
    DOM.hauntWarning.hidden = st.haunt < 1 || !st.owned;
    if (!DOM.hauntWarning.hidden) {
      setText(DOM.hauntWarningText, st.haunt >= 2
        ? 'The dark remembers this place. Expect a much heavier assault tonight.'
        : 'This ground has been used once. They will come in greater numbers.');
    }

    const claim = DOM.claimBtn;
    if (!st.owned) claim.innerHTML = 'Claim Shelter <kbd>E</kbd>';
    else if (game.activeShelter !== s.id) claim.innerHTML = 'Make Camp Here <kbd>E</kbd>';
    else if (game.inside) claim.innerHTML = 'Leave Shelter <kbd>E</kbd>';
    else if (residentAt(s.id) && teamMembers().length < MAX_TEAM) claim.innerHTML = 'Call Survivor <kbd>E</kbd>';
    else claim.innerHTML = 'Enter Shelter <kbd>E</kbd>';
    claim.classList.toggle('danger', game.inside);

    const canFort = st.owned && game.activeShelter === s.id;
    const buttons = DOM.shelterPanel.querySelectorAll('#fortGrid .fort-btn');
    buttons.forEach((btn) => { btn.disabled = !canFort; });
    setText(DOM.fortifyDesc, `+85 · max ${Math.ceil(max)}`);
    setText(DOM.reinforceDesc, `${Math.round(st.armor * 100)}% armor`);
    setText(DOM.trapsDesc, st.traps > 0 ? `${st.traps} damage / sec` : '+10 damage / sec');
    setText(DOM.repairDesc, `${Math.ceil(Math.max(0, st.integrity))} / ${Math.ceil(max)}`);

    const nextTier = Math.min(WEAPONS.length, game.weaponTier + 1);
    setText(DOM.weaponTier, WEAPONS[game.weaponTier - 1].short);
    setText(DOM.weaponUpgradeDesc, game.weaponTier >= WEAPONS.length
      ? 'Maximum calibre reached'
      : `${WEAPONS[game.weaponTier - 1].short} → ${WEAPONS[nextTier - 1].short} · more damage, faster fire`);
    setText(DOM.weaponCost, game.weaponTier >= WEAPONS.length ? '—' : String(8 + (game.weaponTier - 1) * 6));
    DOM.weaponBtn.disabled = !canFort || game.weaponTier >= WEAPONS.length;
  }

  function updateHUD() {
    const phase = game.phase;
    const label = phase === 'day' ? 'DAYLIGHT' : phase === 'dusk' ? 'DUSK' : phase === 'night' ? 'NIGHTFALL' : 'DAWN';
    setText(DOM.dayLabel, phase === 'day' ? `DAY ${game.day}` : phase === 'dawn' ? `DAWN ${game.day}` : `NIGHT ${game.day}`);
    setText(DOM.phaseChip, label);
    DOM.phaseChip.className = 'phase-chip ' + phase;
    const frac = clamp(game.phaseTime / Math.max(1, game.phaseDuration), 0, 1);
    DOM.timeFill.style.width = (frac * 100).toFixed(1) + '%';
    DOM.timeFill.classList.toggle('danger', phase === 'night' && frac > 0.78);
    let timeText;
    if (phase === 'day') timeText = `Nightfall in ${fmtTime(DAY_DURATION - game.phaseTime)}`;
    else if (phase === 'dusk') timeText = `Dark in ${fmtTime(DUSK_DURATION - game.phaseTime)}`;
    else if (phase === 'night') timeText = game.day >= CHAPTER_NIGHTS
      ? (game.bossActive ? 'SCP-682 IS AWAKE' : 'DAWN IS CLOSE')
      : `Dawn in ${fmtTime(game.nightDuration - game.phaseTime)}`;
    else timeText = 'The sun is rising';
    setText(DOM.timeLeft, timeText);

    const active = getActiveShelter();
    let objective;
    if (game.inside && active) objective = `Hold ${active.name}`;
    else if (phase === 'night') objective = active ? 'Reach your shelter' : 'No shelter — keep moving';
    else if (phase === 'dusk') objective = active ? 'Get behind the barricade' : 'Claim a shelter now';
    else if (phase === 'day' && game.day === CHAPTER_NIGHTS) objective = 'Fortify everything';
    else objective = active ? 'Fortify, scavenge, move on' : 'Claim a shelter';
    setText(DOM.objective, objective);

    const hpPct = clamp(game.health / Math.max(1, game.maxHealth), 0, 1) * 100;
    DOM.healthFill.style.width = hpPct.toFixed(1) + '%';
    DOM.healthFill.classList.toggle('low', hpPct < 32);
    setText(DOM.healthText, String(Math.ceil(game.health)));

    DOM.safeChip.hidden = !game.inside;
    DOM.bossChip.hidden = !(game.bossActive || game.day >= CHAPTER_NIGHTS);
    setText(DOM.bossChip, game.bossActive ? 'SCP-682 ACTIVE' : game.day >= CHAPTER_NIGHTS ? 'BOSS NIGHT' : 'BOSS NIGHT');
    DOM.mobileChip.hidden = !mobileMode;

    setText(DOM.mapTitle, `CH. ${roman(game.chapter)} · ${currentRegion.name}`);
    setText(DOM.dreadLabel, `DREAD ${shelterDread().toFixed(1)}`);
    const hauntLabel = !active ? 'NO CAMP' : active.state.haunt >= 2 ? 'REMEMBERED GROUND' : active.state.haunt === 1 ? 'WATCHED GROUND' : 'FRESH GROUND';
    setText(DOM.hauntLabel, hauntLabel);

    setText(DOM.woodCount, String(game.resources.wood));
    setText(DOM.stoneCount, String(game.resources.stone));
    setText(DOM.scrapCount, String(game.resources.scrap));
    updateShelterPanel();
    updateTeamUI(false);
    updateBossUI();
    updateCrosshair();
    updateBestBadges();
  }

  function updateBossUI() {
    const boss = game.boss;
    const on = game.bossActive && boss && !boss.dead;
    DOM.bossBar.hidden = !on;
    if (!on) return;
    const pct = clamp(boss.hp / Math.max(1, boss.maxHp), 0, 1);
    const phase = pct > 0.66 ? 1 : pct > 0.33 ? 2 : 3;
    setText(DOM.bossName, boss.name);
    setText(DOM.bossPhase, `PHASE ${roman(phase)}`);
    setText(DOM.bossSub, `${boss.label} · ${phase === 3 ? 'ENRAGED · DO NOT LET IT REACH THE WALL' : phase === 2 ? 'ADAPTING · IT IS LEARNING' : 'CONTAINMENT FAILING'}`);
    DOM.bossFill.style.width = (pct * 100).toFixed(1) + '%';
    DOM.bossFill.classList.toggle('phase2', phase === 2);
    DOM.bossFill.classList.toggle('phase3', phase === 3);
    DOM.bossBar.classList.toggle('enraged', phase === 3);
  }

  function updateCrosshair() {
    if (!DOM.crosshair) return;
    let sx, sy;
    if (game.mode === 'playing' && mouse.active && !mobileMode) {
      sx = mouse.x;
      sy = mouse.y;
    } else {
      sx = view.w / 2 + Math.cos(player.aim) * Math.min(view.w, view.h) * 0.18;
      sy = view.h / 2 + Math.sin(player.aim) * Math.min(view.w, view.h) * 0.18;
    }
    DOM.crosshair.style.transform = `translate(${sx - 13}px, ${sy - 13}px)`;
    let hot = false;
    if (game.mode === 'playing') {
      const wx = camera.x + (sx - view.w / 2);
      const wy = camera.y + (sy - view.h / 2);
      for (const e of game.enemies) {
        if (!e.dead && dist(wx, wy, e.x, e.y) < e.r + 16) { hot = true; break; }
      }
    }
    DOM.crosshair.classList.toggle('hot', hot);
  }

  /* ---------------------------------------------------------------------
     Enemy AI
  --------------------------------------------------------------------- */
  function angleDiff(a, b) {
    let d = (a - b + Math.PI) % TAU;
    if (d < 0) d += TAU;
    return d - Math.PI;
  }

  function enemyTarget(e) {
    const active = getActiveShelter();
    if (game.inside && active && !active.state.collapsed && active.state.integrity > 0) {
      return { kind: 'shelter', shelter: active, x: active.x, y: active.y };
    }
    if (e.raidShelterId) {
      const s = shelters.find((x) => x.id === e.raidShelterId);
      if (s && !s.state.collapsed && s.state.owned && s.state.integrity > 0) {
        return { kind: 'shelter', shelter: s, x: s.x, y: s.y };
      }
      const resident = s ? companionsAt(s.id)[0] : null;
      if (resident) return { kind: 'companion', companion: resident, x: resident.x, y: resident.y };
    }
    let best = null;
    let bd = Infinity;
    for (const c of teamMembers()) {
      const d = dist(e.x, e.y, c.x, c.y);
      const weighted = e.prefersCompanions ? d * 0.55 : d;
      if (d < 620 && weighted < bd) { bd = weighted; best = c; }
    }
    if (best && (e.prefersCompanions || bd < dist(e.x, e.y, player.x, player.y) * 0.82)) {
      return { kind: 'companion', companion: best, x: best.x, y: best.y };
    }
    return { kind: 'player', x: player.x, y: player.y };
  }

  function moveEnemyToward(e, tx, ty, speed, dt) {
    const dx = tx - e.x;
    const dy = ty - e.y;
    const len = Math.hypot(dx, dy) || 1;
    e.angle = Math.atan2(dy, dx);
    e.x = clamp(e.x + (dx / len) * speed * dt, 24, WORLD.w - 24);
    e.y = clamp(e.y + (dy / len) * speed * dt, 24, WORLD.h - 24);
    e.arm += dt * 2.4;
  }

  function updateEnemies(dt) {
    for (let i = game.enemies.length - 1; i >= 0; i--) {
      const e = game.enemies[i];
      if (!e || e.dead) { if (e && e.dead) game.enemies.splice(i, 1); continue; }
      e.spawn = Math.min(1, (e.spawn || 0) + dt * 1.8);
      e.hitFlash = Math.max(0, (e.hitFlash || 0) - dt);
      e.atkTimer = (e.atkTimer || 0) - dt;
      e.fireTimer = (e.fireTimer || 0) - dt;
      e.arm = (e.arm || 0) + dt * 2.2;

      if (e.isBoss) updateBossAI(e, dt);

      const target = enemyTarget(e);
      const dx = target.x - e.x;
      const dy = target.y - e.y;
      const d = Math.hypot(dx, dy) || 1;

      let observed = false;
      if (e.kind === 'statue' && !game.inside) {
        const toE = Math.atan2(e.y - player.y, e.x - player.x);
        observed = d < 860 && Math.abs(angleDiff(player.aim, toE)) < 0.58;
      }
      if (e.kind === 'shy' && !e.enraged && d > 145) observed = true;

      const isRanged = e.ranged || (e.isBoss && e.phase >= 2);
      const stop = target.kind === 'shelter'
        ? target.shelter.radius + e.r + 6
        : e.r + (target.kind === 'companion' ? 14 : player.r) + 8;

      if (isRanged) {
        const preferred = e.kind === 'boss' ? 330 : e.kind === 'fire' ? 250 : 320;
        if (d > preferred + 50) moveEnemyToward(e, target.x, target.y, e.speed, dt);
        else if (d < preferred - 90) moveEnemyToward(e, e.x * 2 - target.x, e.y * 2 - target.y, e.speed * 0.85, dt);
        else {
          e.angle = Math.atan2(dy, dx);
          const strafe = e.seed > 5 ? 1 : -1;
          e.x = clamp(e.x + Math.cos(e.angle + Math.PI / 2) * strafe * e.speed * 0.3 * dt, 24, WORLD.w - 24);
          e.y = clamp(e.y + Math.sin(e.angle + Math.PI / 2) * strafe * e.speed * 0.3 * dt, 24, WORLD.h - 24);
        }
        if (e.fireTimer <= 0 && d < 560) {
          if (e.isBoss) {
            const spread = e.phase >= 3 ? 3 : 1;
            for (let k = 0; k < spread; k++) {
              const aim = Math.atan2(dy, dx) + (k - (spread - 1) / 2) * 0.16;
              const tx = e.x + Math.cos(aim) * 200;
              const ty = e.y + Math.sin(aim) * 200;
              spawnEnemyProjectile(e, { x: tx, y: ty }, e.dmg * 0.7);
            }
            e.fireTimer = e.phase >= 3 ? 2.1 : 3.2;
          } else {
            spawnEnemyProjectile(e, target);
            e.fireTimer = e.kind === 'fire' ? rand(1.8, 2.8) : rand(2.4, 3.6);
          }
        }
        if (d < stop + 18 && e.atkTimer <= 0 && target.kind !== 'shelter') {
          if (target.kind === 'companion') damageCompanion(target.companion, e.dmg * 0.7);
          else damagePlayer(e.dmg * 0.7);
          e.atkTimer = e.atk + 0.3;
        }
      } else if (!observed) {
        if (d > stop) moveEnemyToward(e, target.x, target.y, e.speed * (e.isBoss ? 1 + (e.phase - 1) * 0.16 : 1), dt);
        else if (e.atkTimer <= 0) {
          if (target.kind === 'shelter') {
            const sx = e.x + Math.cos(e.angle) * e.r;
            const sy = e.y + Math.sin(e.angle) * e.r;
            damageShelter(target.shelter, e.wall * (1 - target.shelter.state.armor), sx, sy);
            if (target.shelter.state.traps > 0) {
              e.hp -= target.shelter.state.traps * 0.45;
              if (e.hp <= 0) killEnemy(e);
            }
          } else if (target.kind === 'companion') {
            damageCompanion(target.companion, e.dmg);
          } else {
            damagePlayer(e.dmg);
          }
          e.atkTimer = e.atk;
          e.arm += 1.8;
        }
      } else if (e.kind === 'statue' && observed) {
        // Held in place by the light of your attention.
        e.atkTimer = Math.max(e.atkTimer, 0.15);
      }

      // Shelter spike rings punish anything that lingers at the wall.
      for (const s of shelters) {
        if (s.state.traps <= 0 || s.state.collapsed) continue;
        if (dist(e.x, e.y, s.x, s.y) > s.radius + 74) continue;
        e.trapTimer = (e.trapTimer || 0) - dt;
        if (e.trapTimer <= 0) {
          e.trapTimer = 0.5;
          e.hp -= s.state.traps * 0.55;
          spawnSparks(e.x, e.y, 3, '#c9b89b', 0.7);
          if (e.hp <= 0) { killEnemy(e); break; }
        }
      }
      if (e.dead) continue;
      if (Math.random() < dt * 1.3) spawnMist(e.x + rand(-8, 8), e.y + rand(2, 12), 1, e.kind === 'fire' ? '#a75a2d' : '#29242c');
    }
  }

  function updateBossAI(e, dt) {
    const ratio = e.hp / Math.max(1, e.maxHp);
    const phase = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
    if (phase !== e.phase) {
      e.phase = phase;
      game.shake = 18;
      banner('SCP-682', phase === 2 ? 'IT IS ADAPTING' : 'THE REPTILE IS ENRAGED', phase === 2 ? 'Its hide thickens. It learns your pattern.' : 'Do not let it reach the barricade.', 'boss', 2.8);
      toast('BOSS PHASE', phase === 2 ? 'SCP-682 is adapting. Expect ranged bursts.' : 'SCP-682 is enraged. It will not stop.', 'alert');
      Sound.bossRoar();
      spawnMist(e.x, e.y, 26, '#485a3b');
      if (phase >= 2) {
        for (let i = 0; i < 2 + phase; i++) {
          const a = Math.random() * TAU;
          const x = clamp(e.x + Math.cos(a) * 80, 60, WORLD.w - 60);
          const y = clamp(e.y + Math.sin(a) * 80, 60, WORLD.h - 60);
          const add = makeEnemy(pickEnemyType(), x, y, null);
          add.enraged = add.kind === 'shy';
          game.enemies.push(add);
        }
      }
    }
    e.roarTimer = (e.roarTimer || 0) - dt;
    if (e.roarTimer <= 0) {
      e.roarTimer = e.phase >= 3 ? 7.5 : 11;
      Sound.bossRoar();
      game.shake = Math.max(game.shake, 7);
      if (e.phase >= 2) {
        const target = enemyTarget(e);
        for (let i = -1; i <= 1; i++) {
          const a = Math.atan2(target.y - e.y, target.x - e.x) + i * 0.2;
          game.projectiles.push({
            x: e.x + Math.cos(a) * (e.r + 8), y: e.y + Math.sin(a) * (e.r + 8),
            vx: Math.cos(a) * 280, vy: Math.sin(a) * 280, life: 3.2,
            dmg: e.dmg * 0.6, color: '#9cff5e', r: 6
          });
        }
      }
    }
  }

  /* ---------------------------------------------------------------------
     Companion AI
  --------------------------------------------------------------------- */
  function updateCompanions(dt) {
    const active = getActiveShelter();
    for (const c of game.companions) {
      if (c.hp <= 0) continue;
      c.invuln = Math.max(0, (c.invuln || 0) - dt);
      c.hitFlash = Math.max(0, (c.hitFlash || 0) - dt);
      c.fireTimer = (c.fireTimer || 0) - dt;
      const def = ROLES[c.role];

      if (c.state === 'wild') {
        c.angle += dt * 0.2;
        if (Math.random() < dt * 0.4) c.x = clamp(c.x + rand(-18, 18), 30, WORLD.w - 30);
        if (Math.random() < dt * 0.4) c.y = clamp(c.y + rand(-18, 18), 30, WORLD.h - 30);
        continue;
      }

      if (c.state === 'travel') {
        const s = shelters.find((x) => x.id === c.targetShelterId);
        if (!s || s.state.collapsed) {
          c.state = 'team';
          c.targetShelterId = null;
          if (game.team.length < MAX_TEAM) game.team.push(c.id);
          toast('SHELTER LOST', `${c.name} doubles back to your side.`, 'warn');
          updateTeamUI(true);
          continue;
        }
        const d = dist(c.x, c.y, s.x, s.y);
        if (d > s.radius * 0.55) {
          const a = Math.atan2(s.y - c.y, s.x - c.x);
          c.angle = a;
          c.x += Math.cos(a) * def.speed * 0.9 * dt;
          c.y += Math.sin(a) * def.speed * 0.9 * dt;
        } else {
          c.state = 'shelter';
          c.shelterId = s.id;
          c.targetShelterId = null;
          c.x = s.x + Math.cos(c.seed) * s.radius * 0.32;
          c.y = s.y + Math.sin(c.seed) * s.radius * 0.32;
          toast('SHELTER HELD', `${c.name} is holding ${s.name}.`, 'good');
          Sound.recruit();
          updateTeamUI(true);
        }
        const near = nearestEnemy(c.x, c.y, def.range);
        if (near) companionShoot(c, near);
        continue;
      }

      if (c.state === 'shelter') {
        const s = shelters.find((x) => x.id === c.shelterId);
        if (!s || s.state.collapsed) {
          c.state = game.team.length < MAX_TEAM ? 'team' : 'travel';
          c.shelterId = null;
          if (c.state === 'travel') c.targetShelterId = nearestShelter(c.x, c.y)?.id || null;
          updateTeamUI(true);
          continue;
        }
        c.x = s.x + Math.cos(c.seed) * s.radius * 0.32;
        c.y = s.y + Math.sin(c.seed) * s.radius * 0.32;
        const near = nearestEnemy(c.x, c.y, def.range + 40);
        if (near) companionShoot(c, near);
        continue;
      }

      // Team member.
      const idx = Math.max(0, teamMembers().indexOf(c));
      const side = idx % 2 === 0 ? -1 : 1;
      const formX = player.x + Math.cos(player.aim + Math.PI + side * 0.65) * 46;
      const formY = player.y + Math.sin(player.aim + Math.PI + side * 0.65) * 46;
      const d = dist(c.x, c.y, formX, formY);
      if (d > 560) {
        c.x = player.x + rand(-38, 38);
        c.y = player.y + rand(26, 48);
      } else if (d > 58) {
        const a = Math.atan2(formY - c.y, formX - c.x);
        c.angle = a;
        c.x += Math.cos(a) * def.speed * dt;
        c.y += Math.sin(a) * def.speed * dt;
      } else {
        c.angle = player.aim;
      }
      c.x = clamp(c.x, 26, WORLD.w - 26);
      c.y = clamp(c.y, 26, WORLD.h - 26);

      const target = nearestEnemy(c.x, c.y, def.range);
      if (target) companionShoot(c, target);

      if (c.role === 'medic' && game.health < game.maxHealth && dist(c.x, c.y, player.x, player.y) < 200) {
        game.health = Math.min(game.maxHealth, game.health + 3.4 * dt);
        if (Math.random() < dt * 3) spawnSparks(player.x, player.y, 1, '#a9d7ad', 0.5);
      }
      if (c.role === 'engineer' && active && active.state.owned && game.activeShelter === active.id && active.state.integrity < active.state.maxIntegrity) {
        if (dist(c.x, c.y, active.x, active.y) < active.radius + 90) {
          active.state.integrity = Math.min(active.state.maxIntegrity, active.state.integrity + 4.2 * dt);
          if (Math.random() < dt * 2.6) spawnSparks(active.x + rand(-40, 40), active.y + rand(-24, 24), 1, '#b07a47', 0.6);
        }
      }
    }
  }

  /* ---------------------------------------------------------------------
     Camera + main update
  --------------------------------------------------------------------- */
  function updateCamera(dt) {
    const halfW = view.w / 2;
    const halfH = view.h / 2;
    let tx = player.x;
    let ty = player.y;
    if (game.mode === 'playing' && !game.inside) {
      tx += Math.cos(player.aim) * 42;
      ty += Math.sin(player.aim) * 42;
    }
    if (game.mode === 'menu') {
      tx = WORLD.w * 0.5 + Math.cos(game.time * 0.035) * 240;
      ty = WORLD.h * 0.5 + Math.sin(game.time * 0.027) * 160;
    }
    const k = 1 - Math.exp(-dt * (game.mode === 'menu' ? 1.2 : 6.5));
    camera.x = lerp(camera.x, tx, k);
    camera.y = lerp(camera.y, ty, k);
    if (WORLD.w <= view.w) camera.x = WORLD.w / 2;
    else camera.x = clamp(camera.x, halfW - 60, WORLD.w - halfW + 60);
    if (WORLD.h <= view.h) camera.y = WORLD.h / 2;
    else camera.y = clamp(camera.y, halfH - 60, WORLD.h - halfH + 60);
  }

  function updateDawn(dt) {
    if (game.mode !== 'dawn') return;
    game.dawnTimer -= dt;
    setText(DOM.dawnCountdown, String(Math.max(0, Math.ceil(game.dawnTimer))));
    if (game.dawnTimer <= 0) beginNextDay();
  }

  function updateDying(dt) {
    if (game.mode !== 'dying') return;
    game.dyingTimer -= dt;
    game.shake = Math.max(0, game.shake - dt * 10);
    if (game.dyingTimer <= 0) finishDeath();
  }

  function update(dt) {
    game.time += dt;
    if (game.mode !== 'playing') {
      updateCamera(dt);
      return;
    }

    updatePhase(dt);
    if (game.mode !== 'playing') { updateCamera(dt); return; }

    updatePlayer(dt);
    updateSpawning(dt);
    updateEnemies(dt);
    updateCompanions(dt);
    updateBullets(dt);
    updateProjectiles(dt);
    updateParticles(dt);
    emitFireEmbers(dt);
    updateInteraction();
    game.shake = Math.max(0, game.shake - dt * 30);
    game.muzzle = Math.max(0, game.muzzle - dt);

    ambientTimer -= dt;
    if (ambientTimer <= 0) {
      ambientTimer = rand(9, 20);
      if (game.phase === 'night' && Sound.ready) Sound.howl();
    }

    updateHUD();
    updateCamera(dt);
    if (game.health <= 0) die();
  }

  function die() {
    if (game.mode !== 'playing' || game.health > 0) return;
    game.mode = 'dying';
    game.dyingTimer = 1.5;
    game.firing = false;
    player.invuln = 99;
    DOM.crosshair.classList.remove('active');
    DOM.interactPrompt.hidden = true;
    DOM.hud.classList.add('dim');
    game.shake = 18;
    spawnMist(player.x, player.y, 32, '#6a2530');
    Sound.breach();
    banner('YOU DIED', 'THE DARK CLAIMS YOU', 'There is always one more night.', 'boss', 4);
  }

  function finishDeath() {
    game.mode = 'over';
    game.phase = 'dawn';
    DOM.crosshair.classList.remove('active');
    setText(DOM.deathText, game.nightsHeld > 0
      ? `They found you on night ${game.day} in ${currentRegion.name}. The barricade did not hold.`
      : `They found you before you found a shelter in ${currentRegion.name}.`);
    setText(DOM.deathDays, String(game.day));
    setText(DOM.deathNights, String(game.nightsHeld));
    setText(DOM.deathKills, String(game.kills));
    setText(DOM.deathBest, String(game.best));
    const advice = game.inside
      ? 'Never let a barricade fall to zero. Repair before dusk, and keep a fallback shelter.'
      : 'Step inside a shelter before nightfall. In the open, every SCP can reach you.';
    setText(DOM.deathAdvice, advice);
    DOM.gameoverScreen.classList.remove('hidden');
    updateBestBadges();
    updateTeamUI(true);
  }

  /* ---------------------------------------------------------------------
     Rendering — terrain, props, shelters
  --------------------------------------------------------------------- */
  function onScreen(x, y, pad) {
    const p = pad || 140;
    return x > camera.x - view.w / 2 - p && x < camera.x + view.w / 2 + p &&
      y > camera.y - view.h / 2 - p && y < camera.y + view.h / 2 + p;
  }

  function drawGround() {
    const r = currentRegion;
    ctx.fillStyle = r.base;
    ctx.fillRect(0, 0, WORLD.w, WORLD.h);
    if (groundPattern) {
      ctx.fillStyle = groundPattern;
      ctx.fillRect(0, 0, WORLD.w, WORLD.h);
    }

    for (const p of terrain.patches) {
      if (!onScreen(p.x, p.y, Math.max(p.rx, p.ry) + 40)) continue;
      ctx.save();
      ctx.globalAlpha = p.a;
      ctx.fillStyle = `rgb(${p.tone})`;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    for (const w of terrain.water) {
      if (!onScreen(w.x, w.y, w.rx + 80)) continue;
      const grd = ctx.createRadialGradient(w.x - w.rx * 0.2, w.y - w.ry * 0.3, 4, w.x, w.y, w.rx);
      grd.addColorStop(0, shadeHex(r.water, 0.22));
      grd.addColorStop(0.55, r.water);
      grd.addColorStop(1, shadeHex(r.water, -0.35));
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(w.x, w.y, w.rx, w.ry, Math.sin(w.seed) * 0.2, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(205,230,220,0.11)';
      ctx.lineWidth = 2;
      ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const yy = w.y - w.ry * 0.55 + (i / 5) * w.ry * 1.1;
        const ox = Math.sin(game.time * 0.4 + i + w.seed) * 12;
        ctx.strokeStyle = `rgba(198,226,220,${0.045 + i * 0.008})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(w.x + ox, yy, w.rx * (0.24 + i * 0.06), w.ry * 0.07, 0, 0, TAU);
        ctx.stroke();
      }
    }

    // Paths first, then ground clutter so the tracks feel worn into the terrain.
    const pathRgb = pathToRgb(r.path);
    for (const link of pathLinks) {
      const a = shelters.find((s) => s.id === link[0]);
      const b = shelters.find((s) => s.id === link[1]);
      if (!a || !b) continue;
      if (!onScreen((a.x + b.x) / 2, (a.y + b.y) / 2, Math.hypot(a.x - b.x, a.y - b.y) / 2 + 100)) continue;
      const mx = (a.x + b.x) / 2 + Math.sin(a.x * 0.013 + b.y * 0.008) * 95;
      const my = (a.y + b.y) / 2 + Math.cos(a.y * 0.011 + b.x * 0.006) * 70;
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(${pathRgb},0.13)`;
      ctx.lineWidth = 46;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(mx, my, b.x, b.y);
      ctx.stroke();
      ctx.strokeStyle = `rgba(${pathRgb},0.31)`;
      ctx.lineWidth = 24;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(mx, my, b.x, b.y);
      ctx.stroke();
      ctx.strokeStyle = `rgba(${pathRgb},0.22)`;
      ctx.lineWidth = 2;
      ctx.setLineDash([11, 23]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(mx, my, b.x, b.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const s of terrain.specks) {
      if (!onScreen(s.x, s.y, 30)) continue;
      ctx.globalAlpha = s.a;
      ctx.fillStyle = s.tone;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const t of terrain.tufts) {
      if (!onScreen(t.x, t.y, 20)) continue;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.rot);
      ctx.strokeStyle = t.tone;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -t.s * 2);
      ctx.moveTo(0, 0);
      ctx.lineTo(t.s * 0.7, -t.s * 1.3);
      ctx.moveTo(0, 0);
      ctx.lineTo(-t.s * 0.55, -t.s * 1.5);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawProps() {
    for (const p of terrain.props) {
      if (!onScreen(p.x, p.y, 70)) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.kind === 'grave') {
        ctx.fillStyle = 'rgba(8,10,12,0.35)';
        ctx.beginPath();
        ctx.ellipse(4, 5, 22, 9, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#4a4c45';
        ctx.beginPath();
        ctx.ellipse(0, 3, 18, 6, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#6d7066';
        ctx.fillRect(-4, -21, 8, 24);
        ctx.fillRect(-11, -14, 22, 6);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(-3, -19, 2, 19);
      } else if (p.kind === 'bones') {
        ctx.fillStyle = 'rgba(8,10,12,0.32)';
        ctx.beginPath();
        ctx.ellipse(2, 4, 21, 8, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#b7af97';
        ctx.lineWidth = 2.4;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.ellipse(0, 0, 8 + i * 2.4, 2.2 + i * 0.5, 0.12, 0.3, Math.PI - 0.3);
          ctx.stroke();
        }
        ctx.fillStyle = '#c9c1a8';
        ctx.beginPath();
        ctx.arc(-9, -5, 5.4, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#2a251d';
        ctx.beginPath();
        ctx.arc(-10.6, -6, 1.25, 0, TAU);
        ctx.arc(-7.2, -6, 1.25, 0, TAU);
        ctx.fill();
      } else {
        // Japanese stone lantern
        const flicker = 0.6 + Math.sin(game.time * 2 + p.seed) * 0.18;
        ctx.fillStyle = 'rgba(10,12,12,0.35)';
        ctx.beginPath();
        ctx.ellipse(2, 5, 18, 7, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#5f665e';
        ctx.fillRect(-4, -2, 8, 14);
        ctx.fillRect(-9, 7, 18, 5);
        ctx.fillStyle = '#7c8177';
        ctx.beginPath();
        ctx.moveTo(-13, -6);
        ctx.lineTo(13, -6);
        ctx.lineTo(8, -14);
        ctx.lineTo(-8, -14);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = `rgba(246,196,110,${flicker})`;
        ctx.fillRect(-5, -10, 10, 8);
        ctx.fillStyle = 'rgba(246,196,110,0.12)';
        ctx.beginPath();
        ctx.arc(0, -7, 28, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawTrees() {
    for (const t of terrain.trees) {
      if (!onScreen(t.x, t.y, t.r + 60)) continue;
      const sway = Math.sin(game.time * 0.55 + t.sway) * 0.025;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(sway);
      ctx.fillStyle = 'rgba(4,8,8,0.32)';
      ctx.beginPath();
      ctx.ellipse(7, 6, t.r * 0.85, t.r * 0.3, 0.1, 0, TAU);
      ctx.fill();

      if (t.kind === 'cactus') {
        const grd = ctx.createLinearGradient(-t.r, 0, t.r, 0);
        grd.addColorStop(0, t.blight ? '#4f5332' : '#3f6139');
        grd.addColorStop(0.5, t.blight ? '#6b693e' : '#557d46');
        grd.addColorStop(1, t.blight ? '#3b3c28' : '#2f4b2d');
        ctx.fillStyle = grd;
        ctx.fillRect(-t.r * 0.22, -t.r * 2.1, t.r * 0.44, t.r * 2.2);
        ctx.beginPath();
        ctx.ellipse(0, -t.r * 2.1, t.r * 0.22, t.r * 0.28, 0, 0, TAU);
        ctx.fill();
        ctx.fillRect(-t.r * 0.95, -t.r * 1.25, t.r * 0.7, t.r * 0.24);
        ctx.fillRect(-t.r * 0.95, -t.r * 1.25, t.r * 0.24, t.r * 0.75);
        ctx.fillRect(t.r * 0.25, -t.r * 1.55, t.r * 0.7, t.r * 0.22);
        ctx.fillRect(t.r * 0.72, -t.r * 1.55, t.r * 0.22, t.r * 0.55);
        ctx.strokeStyle = 'rgba(225,214,160,0.25)';
        ctx.lineWidth = 0.7;
        for (let i = 0; i < 7; i++) {
          const yy = -4 - i * (t.r * 2.0 / 7);
          ctx.beginPath();
          ctx.moveTo(-t.r * 0.22, yy);
          ctx.lineTo(-t.r * 0.42, yy - 2);
          ctx.moveTo(t.r * 0.22, yy);
          ctx.lineTo(t.r * 0.42, yy - 2);
          ctx.stroke();
        }
      } else if (t.kind === 'bamboo') {
        const tones = ['#4f6d51', '#5f7f5b', '#3d5b45'];
        for (let i = 0; i < 5; i++) {
          const ox = (i - 2) * t.r * 0.22;
          const hgt = t.r * (1.7 + (i % 3) * 0.26);
          ctx.strokeStyle = tones[i % 3];
          ctx.lineWidth = 2.1;
          ctx.beginPath();
          ctx.moveTo(ox, 2);
          ctx.quadraticCurveTo(ox + 5, -hgt * 0.5, ox + (i - 2) * 2, -hgt);
          ctx.stroke();
          ctx.fillStyle = tones[(i + 1) % 3];
          for (let k = 0; k < 4; k++) {
            const ly = -hgt * (0.45 + k * 0.14);
            const dir = k % 2 ? 1 : -1;
            ctx.beginPath();
            ctx.ellipse(ox + dir * 10 + (i - 2) * 2, ly, 9, 2.2, dir * 0.5, 0, TAU);
            ctx.fill();
          }
        }
      } else {
        const greens = t.blight
          ? ['#39453a', '#44513f', '#2c362d']
          : ['#1e3a2b', '#294b34', '#355b3b'];
        ctx.fillStyle = '#32271c';
        ctx.fillRect(-2.4, -t.r * 0.2, 4.8, t.r * 0.75);
        for (let layer = 0; layer < 4; layer++) {
          const ly = -t.r * (0.2 + layer * 0.42);
          const w = t.r * (0.92 - layer * 0.15);
          ctx.fillStyle = greens[layer % greens.length];
          ctx.beginPath();
          ctx.moveTo(-w, ly + t.r * 0.22);
          ctx.lineTo(0, ly - t.r * 0.55);
          ctx.lineTo(w, ly + t.r * 0.22);
          ctx.lineTo(w * 0.62, ly + t.r * 0.34);
          ctx.lineTo(0, ly - t.r * 0.12);
          ctx.lineTo(-w * 0.62, ly + t.r * 0.34);
          ctx.closePath();
          ctx.fill();
        }
        if (t.blight) {
          ctx.strokeStyle = 'rgba(190,210,170,0.2)';
          ctx.lineWidth = 0.8;
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(-t.r * 0.5 + i * t.r * 0.3, -t.r * 0.3);
            ctx.lineTo(-t.r * 0.2 + i * t.r * 0.2, -t.r * 1.6);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }
  }

  function drawResourceNodes() {
    for (const n of resourceNodes) {
      if (n.uses <= 0 && n.respawn > 0) continue;
      if (!onScreen(n.x, n.y, 50)) continue;
      const d = dist(player.x, player.y, n.x, n.y);
      const near = d < 100;
      ctx.save();
      ctx.translate(n.x, n.y);
      ctx.fillStyle = 'rgba(4,7,7,0.34)';
      ctx.beginPath();
      ctx.ellipse(3, 5, 18, 7, 0.1, 0, TAU);
      ctx.fill();
      if (n.type === 'wood') {
        ctx.strokeStyle = '#6d4a2c';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          ctx.save();
          ctx.rotate(-0.35 + i * 0.18);
          ctx.beginPath();
          ctx.moveTo(-14 + i * 3, -4 + i * 3);
          ctx.lineTo(13 + i * 3, -8 + i * 3);
          ctx.stroke();
          ctx.restore();
        }
        ctx.fillStyle = '#b07a47';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(-13 + i * 3, -4 + i * 3, 3, 0, TAU);
          ctx.fill();
        }
      } else if (n.type === 'stone') {
        const stones = [[-9, 0, 8], [4, -4, 10], [11, 5, 6]];
        stones.forEach((st, idx) => {
          const grd = ctx.createRadialGradient(st[0] - 2, st[1] - 3, 1, st[0], st[1], st[2] + 3);
          grd.addColorStop(0, '#b4b9b4');
          grd.addColorStop(1, '#666b68');
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.ellipse(st[0], st[1], st[2], st[2] * 0.7, idx * 0.4, 0, TAU);
          ctx.fill();
        });
      } else {
        ctx.fillStyle = '#4c6a63';
        ctx.fillRect(-13, -3, 26, 8);
        ctx.fillStyle = '#7fb2a5';
        ctx.fillRect(-10, -6, 8, 5);
        ctx.fillRect(4, -7, 7, 6);
        ctx.strokeStyle = 'rgba(200,240,225,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-10, 1);
        ctx.lineTo(10, 1);
        ctx.stroke();
      }
      if (near) {
        ctx.strokeStyle = 'rgba(239,182,97,0.45)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, 24 + Math.sin(game.time * 3) * 2, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }
  }

  const SHELTER_PALETTES = {
    cabin: { wall: '#4b3826', wall2: '#5d4630', roof: '#2a241d', trim: '#7b5a3a' },
    chapel: { wall: '#5c5a4f', wall2: '#6b695c', roof: '#302f2a', trim: '#8b8775' },
    mill: { wall: '#5a4a36', wall2: '#6c5a42', roof: '#2f2921', trim: '#8b6b48' },
    tower: { wall: '#4a3d2c', wall2: '#5d4c37', roof: '#2c251d', trim: '#80633f' },
    barn: { wall: '#613a2d', wall2: '#764637', roof: '#33251f', trim: '#a16f50' },
    hacienda: { wall: '#a77a52', wall2: '#b98a60', roof: '#6f4a32', trim: '#d0a170' },
    mission: { wall: '#c2ab85', wall2: '#d2bc97', roof: '#7b5638', trim: '#e0cda5' },
    mine: { wall: '#5e4b34', wall2: '#6f5a3f', roof: '#3a2d20', trim: '#8f7650' },
    aqueduct: { wall: '#8a7b62', wall2: '#9b8b70', roof: '#5e5140', trim: '#b3a184' },
    ranch: { wall: '#9b7352', wall2: '#ac815e', roof: '#5f4630', trim: '#c99d72' },
    cantina: { wall: '#a06c46', wall2: '#b47b51', roof: '#5c3b2a', trim: '#d1a06f' },
    shrine: { wall: '#743d32', wall2: '#8c4b3d', roof: '#38251f', trim: '#c16950' },
    temple: { wall: '#4c3b2d', wall2: '#5c4936', roof: '#25211c', trim: '#8b6747' },
    dojo: { wall: '#4b3728', wall2: '#5b442f', roof: '#2b241c', trim: '#8a6544' },
    pagoda: { wall: '#6d4a35', wall2: '#7f583e', roof: '#2d211c', trim: '#b88357' },
    teahouse: { wall: '#7a6046', wall2: '#8b7052', roof: '#33291f', trim: '#bb9368' },
    gate: { wall: '#7b3e33', wall2: '#914a3b', roof: '#3b261f', trim: '#c46b52' }
  };

  function roundRectPath(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawRoofGable(x, y, w, h, color, trim) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - w / 2 - 8, y);
    ctx.lineTo(x, y - h);
    ctx.lineTo(x + w / 2 + 8, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = trim;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x - w / 2 - 8, y);
    ctx.lineTo(x, y - h);
    ctx.lineTo(x + w / 2 + 8, y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const t = i / 5;
      ctx.beginPath();
      ctx.moveTo(x - w / 2 - 8 + (w / 2 + 8) * t, y - h * t);
      ctx.lineTo(x + w / 2 + 8 - (w / 2 + 8) * t, y - h * t);
      ctx.stroke();
    }
  }

  function drawWindow(x, y, w, h, warm) {
    ctx.fillStyle = warm ? 'rgba(247,192,98,0.88)' : 'rgba(45,57,66,0.85)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(16,14,12,0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w / 2, y + h);
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x + w, y + h / 2);
    ctx.stroke();
    if (warm) {
      ctx.fillStyle = 'rgba(247,192,98,0.14)';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, 22, 0, TAU);
      ctx.fill();
    }
  }

  function drawShelterBuilding(s) {
    const pal = SHELTER_PALETTES[s.style] || SHELTER_PALETTES.cabin;
    const warm = s.state.owned || s.state.haunt > 0;
    const y = s.y + 6;
    const wallW = 118;
    const wallH = 72;

    ctx.save();
    ctx.translate(s.x, y);

    // Structure shadow and foundation.
    ctx.fillStyle = 'rgba(3,6,7,0.42)';
    ctx.beginPath();
    ctx.ellipse(6, 34, 78, 26, 0.04, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    roundRectPath(-wallW / 2 - 5, -32, wallW + 10, wallH + 10, 7);
    ctx.fill();

    if (s.style === 'tower') {
      // Watchtower: braced legs and a raised cabin.
      ctx.strokeStyle = pal.wall;
      ctx.lineWidth = 7;
      for (const lx of [-36, 36]) {
        ctx.beginPath();
        ctx.moveTo(lx, 30);
        ctx.lineTo(lx * 0.62, -50);
        ctx.stroke();
      }
      ctx.strokeStyle = pal.trim;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-34, 8);
      ctx.lineTo(34, -20);
      ctx.moveTo(34, 8);
      ctx.lineTo(-34, -20);
      ctx.stroke();
      ctx.fillStyle = pal.wall2;
      roundRectPath(-40, -86, 80, 45, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.24)';
      ctx.fillRect(-40, -48, 80, 6);
      drawWindow(-20, -74, 15, 18, warm);
      drawWindow(7, -74, 15, 18, warm);
      drawRoofGable(0, -86, 92, 35, pal.roof, pal.trim);
      ctx.fillStyle = pal.trim;
      ctx.fillRect(-49, -57, 98, 3);
      ctx.strokeStyle = 'rgba(230,210,170,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-43, -30);
      ctx.lineTo(43, -30);
      ctx.stroke();
      for (let i = -40; i <= 40; i += 10) {
        ctx.beginPath();
        ctx.moveTo(i, -30);
        ctx.lineTo(i, -22);
        ctx.stroke();
      }
    } else if (s.style === 'mine') {
      // Mine entrance carved into a rocky hill.
      const grd = ctx.createRadialGradient(0, 2, 12, 0, 8, 88);
      grd.addColorStop(0, '#4b3b2a');
      grd.addColorStop(0.6, '#3c3126');
      grd.addColorStop(1, '#29251f');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(0, 8, 86, 56, 0, Math.PI, TAU);
      ctx.fill();
      ctx.fillStyle = '#11100e';
      ctx.beginPath();
      ctx.ellipse(0, 18, 42, 34, 0, Math.PI, TAU);
      ctx.fill();
      ctx.strokeStyle = pal.trim;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(0, 18, 44, 36, 0, Math.PI, TAU);
      ctx.stroke();
      ctx.strokeStyle = pal.wall;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(-46, 22);
      ctx.lineTo(-46, -20);
      ctx.lineTo(46, -20);
      ctx.lineTo(46, 22);
      ctx.stroke();
      ctx.strokeStyle = '#6f6a5d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-34, 38);
      ctx.lineTo(34, 12);
      ctx.moveTo(-30, 44);
      ctx.lineTo(38, 18);
      ctx.stroke();
      ctx.fillStyle = 'rgba(247,166,80,0.75)';
      ctx.beginPath();
      ctx.arc(0, -2, 4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(247,166,80,0.09)';
      ctx.beginPath();
      ctx.arc(0, -2, 34, 0, TAU);
      ctx.fill();
    } else if (s.style === 'aqueduct') {
      // Stone arches.
      ctx.fillStyle = pal.wall;
      ctx.fillRect(-78, -18, 156, 24);
      ctx.fillRect(-78, -48, 156, 12);
      for (let i = -1; i <= 1; i++) {
        const ax = i * 48;
        ctx.fillStyle = 'rgba(16,13,10,0.65)';
        ctx.beginPath();
        ctx.moveTo(ax - 14, 6);
        ctx.lineTo(ax - 14, -18);
        ctx.arc(ax, -18, 14, Math.PI, TAU);
        ctx.lineTo(ax + 14, 6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = pal.trim;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ax, -18, 17, Math.PI, TAU);
        ctx.stroke();
      }
      ctx.fillStyle = pal.trim;
      for (let i = -72; i <= 72; i += 18) ctx.fillRect(i, -22, 2, 5);
      ctx.fillStyle = 'rgba(247,192,98,0.5)';
      ctx.beginPath();
      ctx.arc(0, -30, 3, 0, TAU);
      ctx.fill();
    } else if (s.style === 'shrine' || s.style === 'gate') {
      // Torii gate and a small shrine hall behind it.
      const gateScale = s.style === 'gate' ? 1.08 : 1;
      ctx.save();
      ctx.scale(gateScale, gateScale);
      ctx.fillStyle = pal.trim;
      ctx.fillRect(-58, -72, 116, 8);
      ctx.fillRect(-52, -60, 104, 5);
      ctx.fillStyle = pal.wall;
      ctx.fillRect(-46, -64, 10, 70);
      ctx.fillRect(36, -64, 10, 70);
      ctx.fillStyle = pal.roof;
      ctx.beginPath();
      ctx.moveTo(-68, -76);
      ctx.lineTo(0, -84);
      ctx.lineTo(68, -76);
      ctx.lineTo(54, -70);
      ctx.lineTo(-54, -70);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (s.style === 'shrine') {
        ctx.fillStyle = pal.wall2;
        roundRectPath(-38, -44, 76, 46, 3);
        ctx.fill();
        ctx.fillStyle = pal.roof;
        ctx.beginPath();
        ctx.moveTo(-50, -44);
        ctx.lineTo(0, -62);
        ctx.lineTo(50, -44);
        ctx.closePath();
        ctx.fill();
        drawWindow(-15, -30, 12, 15, warm);
        drawWindow(4, -30, 12, 15, warm);
      }
    } else if (s.style === 'pagoda') {
      ctx.fillStyle = pal.wall;
      ctx.fillRect(-33, -44, 66, 58);
      for (let tier = 0; tier < 4; tier++) {
        const ty = -38 - tier * 18;
        const tw = 58 + tier * 16;
        ctx.fillStyle = tier % 2 ? pal.roof : shadeHex(pal.roof, 0.05);
        ctx.beginPath();
        ctx.moveTo(-tw / 2 - 15, ty);
        ctx.quadraticCurveTo(-tw / 2, ty - 12, 0, ty - 15);
        ctx.quadraticCurveTo(tw / 2, ty - 12, tw / 2 + 15, ty);
        ctx.quadraticCurveTo(0, ty + 8, -tw / 2 - 15, ty);
        ctx.fill();
        ctx.strokeStyle = pal.trim;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      drawWindow(-16, -30, 12, 16, warm);
      drawWindow(5, -30, 12, 16, warm);
      ctx.strokeStyle = pal.trim;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -38);
      ctx.lineTo(0, -106);
      ctx.stroke();
      ctx.fillStyle = 'rgba(247,192,98,0.85)';
      ctx.beginPath();
      ctx.arc(0, -108, 3, 0, TAU);
      ctx.fill();
    } else if (s.style === 'temple') {
      // Broad hall and sweeping roof.
      ctx.fillStyle = pal.wall;
      ctx.fillRect(-66, -40, 132, 58);
      for (let i = -60; i <= 60; i += 20) {
        ctx.fillStyle = pal.wall2;
        ctx.fillRect(i, -38, 4, 54);
      }
      drawWindow(-38, -27, 16, 18, warm);
      drawWindow(-8, -27, 16, 18, warm);
      drawWindow(22, -27, 16, 18, warm);
      ctx.fillStyle = pal.roof;
      ctx.beginPath();
      ctx.moveTo(-98, -37);
      ctx.quadraticCurveTo(-68, -62, -34, -58);
      ctx.quadraticCurveTo(0, -72, 34, -58);
      ctx.quadraticCurveTo(68, -62, 98, -37);
      ctx.quadraticCurveTo(58, -25, 0, -27);
      ctx.quadraticCurveTo(-58, -25, -98, -37);
      ctx.fill();
      ctx.strokeStyle = pal.trim;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.24)';
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 20, -52);
        ctx.lineTo(i * 27, -28);
        ctx.stroke();
      }
    } else if (s.style === 'dojo') {
      ctx.fillStyle = pal.wall;
      roundRectPath(-72, -38, 144, 54, 3);
      ctx.fill();
      ctx.fillStyle = pal.wall2;
      ctx.fillRect(-72, -4, 144, 20);
      ctx.fillStyle = 'rgba(18,12,9,0.5)';
      ctx.fillRect(-18, -34, 36, 48);
      for (let i = -64; i <= 64; i += 16) {
        ctx.strokeStyle = 'rgba(20,14,10,0.28)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(i, -36);
        ctx.lineTo(i, 14);
        ctx.stroke();
      }
      ctx.fillStyle = pal.roof;
      ctx.beginPath();
      ctx.moveTo(-88, -37);
      ctx.quadraticCurveTo(0, -72, 88, -37);
      ctx.lineTo(74, -30);
      ctx.quadraticCurveTo(0, -57, -74, -30);
      ctx.closePath();
      ctx.fill();
      drawWindow(-55, -24, 18, 14, warm);
      drawWindow(37, -24, 18, 14, warm);
    } else if (s.style === 'teahouse') {
      ctx.fillStyle = pal.wall;
      roundRectPath(-54, -38, 108, 54, 3);
      ctx.fill();
      ctx.fillStyle = pal.wall2;
      ctx.fillRect(-54, -8, 108, 24);
      ctx.fillStyle = warm ? 'rgba(246,196,108,0.72)' : 'rgba(80,66,50,0.8)';
      ctx.fillRect(-38, -27, 26, 22);
      ctx.fillRect(4, -27, 30, 22);
      ctx.strokeStyle = 'rgba(26,20,15,0.6)';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-36 + i * 11, -26);
        ctx.lineTo(-36 + i * 11, -6);
        ctx.moveTo(6 + i * 10, -26);
        ctx.lineTo(6 + i * 10, -6);
        ctx.stroke();
      }
      drawRoofGable(0, -38, 120, 36, pal.roof, pal.trim);
      ctx.fillStyle = pal.trim;
      ctx.fillRect(-58, -13, 116, 3);
    } else if (s.style === 'hacienda') {
      ctx.fillStyle = pal.wall;
      roundRectPath(-70, -40, 140, 58, 4);
      ctx.fill();
      ctx.fillStyle = pal.wall2;
      ctx.fillRect(-70, -6, 140, 24);
      ctx.fillStyle = 'rgba(18,12,10,0.46)';
      ctx.beginPath();
      ctx.arc(0, 8, 20, Math.PI, TAU);
      ctx.lineTo(20, 16);
      ctx.lineTo(-20, 16);
      ctx.closePath();
      ctx.fill();
      drawWindow(-50, -26, 17, 20, warm);
      drawWindow(33, -26, 17, 20, warm);
      ctx.fillStyle = pal.roof;
      ctx.fillRect(-78, -48, 156, 11);
      ctx.fillStyle = pal.trim;
      for (let i = -66; i <= 66; i += 16) ctx.fillRect(i, -45, 3, 8);
      ctx.fillStyle = pal.wall2;
      ctx.fillRect(-50, -64, 100, 16);
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      for (let i = -46; i <= 46; i += 14) ctx.fillRect(i, -64, 1, 16);
    } else {
      // Gabled timber / adobe houses: cabin, chapel, mill, barn, mission, ranch, cantina.
      ctx.fillStyle = pal.wall;
      roundRectPath(-wallW / 2, -34, wallW, wallH, 3);
      ctx.fill();
      ctx.fillStyle = pal.wall2;
      ctx.fillRect(-wallW / 2, -2, wallW, 22);
      for (let i = -wallW / 2 + 8; i < wallW / 2; i += 15) {
        ctx.strokeStyle = 'rgba(24,17,12,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(i, -30);
        ctx.lineTo(i, 30);
        ctx.stroke();
      }
      const doorW = s.style === 'barn' ? 34 : 22;
      ctx.fillStyle = 'rgba(16,12,9,0.72)';
      roundRectPath(-doorW / 2, 2, doorW, 30, 2);
      ctx.fill();
      drawWindow(-wallW / 2 + 15, -18, 16, 18, warm);
      drawWindow(wallW / 2 - 31, -18, 16, 18, warm);
      drawRoofGable(0, -34, wallW, s.style === 'chapel' ? 54 : 38, pal.roof, pal.trim);
      if (s.style === 'chapel' || s.style === 'mission') {
        ctx.fillStyle = pal.trim;
        ctx.fillRect(-2, -96, 4, 24);
        ctx.fillRect(-10, -89, 20, 4);
        ctx.strokeStyle = 'rgba(250,232,190,0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, -98, 16, 0, TAU);
        ctx.stroke();
      }
      if (s.style === 'mill') {
        const wheel = game.time * 0.25;
        ctx.save();
        ctx.translate(66, -4);
        ctx.strokeStyle = '#6d5336';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 23, 0, TAU);
        ctx.stroke();
        for (let i = 0; i < 8; i++) {
          const a = wheel + i * (TAU / 8);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * 23, Math.sin(a) * 23);
          ctx.stroke();
        }
        ctx.restore();
      }
      if (s.style === 'cantina') {
        ctx.fillStyle = '#7c3d2f';
        for (let i = -54; i <= 54; i += 18) {
          ctx.fillStyle = i % 36 === 0 ? '#8e4736' : '#b6875d';
          ctx.fillRect(i, -30, 18, 8);
        }
        ctx.fillStyle = 'rgba(247,192,98,0.55)';
        ctx.beginPath();
        ctx.arc(0, 34, 4, 0, TAU);
        ctx.fill();
      }
      if (s.style === 'ranch') {
        ctx.strokeStyle = '#6b563c';
        ctx.lineWidth = 2;
        for (let i = -1; i <= 1; i += 2) {
          ctx.beginPath();
          ctx.moveTo(i * 76, 20);
          ctx.lineTo(i * 76, 40);
          ctx.moveTo(i * 64, 28);
          ctx.lineTo(i * 88, 28);
          ctx.stroke();
        }
      }
    }

    // Warm lanterns / fire barrel at the entrance of owned shelters.
    if (s.state.owned) {
      const flick = 0.74 + Math.sin(game.time * 7 + s.x) * 0.18;
      drawShelterFire(46, 31, flick);
      ctx.fillStyle = `rgba(247,180,90,${0.06 + flick * 0.04})`;
      ctx.beginPath();
      ctx.arc(46, 27, 56, 0, TAU);
      ctx.fill();
    }

    ctx.restore();

    drawBarricade(s);
    drawShelterLabel(s);
  }

  function drawShelterFire(x, y, flick) {
    ctx.fillStyle = 'rgba(20,14,10,0.8)';
    ctx.beginPath();
    ctx.ellipse(x, y, 8, 3.4, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(244,150,68,0.9)';
    ctx.beginPath();
    ctx.moveTo(x - 4, y);
    ctx.quadraticCurveTo(x - 6, y - 12 - flick * 4, x, y - 17 - flick * 5);
    ctx.quadraticCurveTo(x + 5, y - 9, x + 4, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,220,140,0.9)';
    ctx.beginPath();
    ctx.moveTo(x - 2, y);
    ctx.quadraticCurveTo(x - 2, y - 8, x + 1, y - 10);
    ctx.quadraticCurveTo(x + 3, y - 5, x + 2, y);
    ctx.closePath();
    ctx.fill();
  }

  function drawBarricade(s) {
    const st = s.state;
    if (s.state.collapsed) return;
    const pct = st.owned ? clamp(st.integrity / Math.max(1, st.maxIntegrity), 0, 1) : 0;
    const base = s.radius * 0.84;
    const segments = 26;
    const gaps = st.owned && pct < 0.55 ? Math.round((1 - pct) * 7) : 0;
    ctx.save();
    ctx.translate(s.x, s.y + 6);
    for (let i = 0; i < segments; i++) {
      if (gaps && i % 4 === 0 && i / 4 < gaps) continue;
      const a = (i / segments) * TAU;
      if (Math.abs(angleDiff(a, Math.PI / 2)) < 0.14) continue; // gap for the door
      const px = Math.cos(a) * (base + Math.sin(i * 13.2) * 3);
      const py = Math.sin(a) * (base * 0.82 + Math.cos(i * 7.4) * 3);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(a + Math.PI / 2);
      if (st.owned) {
        const tone = pct > 0.55 ? '#7d5b38' : pct > 0.2 ? '#684a30' : '#493323';
        ctx.fillStyle = tone;
        ctx.fillRect(-7, -4, 14, 11);
        ctx.fillStyle = 'rgba(35,24,16,0.5)';
        ctx.fillRect(-7, -4, 14, 2);
        ctx.strokeStyle = 'rgba(26,18,12,0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(0, 7);
        ctx.stroke();
        if (i % 2 === 0) {
          ctx.fillStyle = 'rgba(190,190,180,0.45)';
          ctx.beginPath();
          ctx.moveTo(-2, -4);
          ctx.lineTo(0, -14);
          ctx.lineTo(3, -4);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        ctx.fillStyle = 'rgba(91,71,48,0.6)';
        ctx.fillRect(-5, -3, 10, 8);
        ctx.strokeStyle = 'rgba(25,19,14,0.42)';
        ctx.strokeRect(-5, -3, 10, 8);
      }
      ctx.restore();
    }
    // Corner stakes glow softly while the shelter is intact.
    if (st.owned && pct > 0) {
      ctx.strokeStyle = `rgba(239,182,97,${0.13 + pct * 0.12})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 8]);
      ctx.beginPath();
      ctx.ellipse(0, 0, base + 8, base * 0.82 + 8, 0, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  function drawShelterLabel(s) {
    if (!onScreen(s.x, s.y - 80, 180)) return;
    const d = dist(player.x, player.y, s.x, s.y);
    const active = game.activeShelter === s.id;
    if (d > 440 && !active) return;
    const label = s.name.toUpperCase();
    ctx.save();
    ctx.font = '700 9px "Segoe UI", system-ui, sans-serif';
    const w = Math.max(60, ctx.measureText(label).width + 18);
    ctx.fillStyle = 'rgba(7,11,17,0.7)';
    roundRectPath(s.x - w / 2, s.y - 122, w, 16, 3);
    ctx.fill();
    ctx.strokeStyle = active ? 'rgba(239,182,97,0.55)' : 'rgba(236,219,188,0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = active ? '#efb661' : 'rgba(236,219,188,0.7)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, s.x, s.y - 113.5);
    if (s.state.owned) {
      ctx.fillStyle = 'rgba(239,182,97,0.9)';
      ctx.beginPath();
      ctx.arc(s.x + w / 2 + 8, s.y - 114, 3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---------------------------------------------------------------------
     Rendering — characters
  --------------------------------------------------------------------- */
  function drawShadow(x, y, rx, ry, alpha) {
    ctx.fillStyle = `rgba(3,6,7,${alpha || 0.38})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
    ctx.fill();
  }

  function drawHuman(x, y, angle, opts) {
    const o = opts || {};
    const scale = o.scale || 1;
    const walk = o.walk || 0;
    const step = Math.sin(walk) * 4;
    const skin = o.skin || '#c89f7d';
    const coat = o.coat || '#3f4c3d';
    const coat2 = o.coat2 || '#54624e';
    const pants = o.pants || '#2c302b';
    const accent = o.accent || '#efb661';
    const facing = Math.cos(angle) < -0.15 ? -1 : 1;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    drawShadow(0, 4, 12, 4.6, 0.34);

    // Legs
    ctx.strokeStyle = pants;
    ctx.lineWidth = 4.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-3.4, 1);
    ctx.lineTo(-4 - step * 0.42, 10);
    ctx.moveTo(3.4, 1);
    ctx.lineTo(4 + step * 0.42, 10);
    ctx.stroke();
    ctx.fillStyle = '#241f1b';
    ctx.beginPath();
    ctx.ellipse(-4 - step * 0.42, 10.4, 3, 1.8, 0, 0, TAU);
    ctx.ellipse(4 + step * 0.42, 10.4, 3, 1.8, 0, 0, TAU);
    ctx.fill();

    // Backpack / bedroll
    ctx.fillStyle = o.pack || '#5a4630';
    roundRectPath(-8.5, -17, 17, 15, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(20,16,12,0.35)';
    ctx.fillRect(-7.5, -13, 15, 2);

    // Coat body
    ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.moveTo(-8, -19);
    ctx.quadraticCurveTo(-10, -7, -6.5, 4);
    ctx.lineTo(6.5, 4);
    ctx.quadraticCurveTo(10, -7, 8, -19);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = coat2;
    ctx.beginPath();
    ctx.moveTo(-2, -19);
    ctx.lineTo(2, -19);
    ctx.lineTo(1, 2);
    ctx.lineTo(-1, 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(16,14,12,0.62)';
    ctx.fillRect(-8, -2, 16, 3);
    ctx.fillStyle = accent;
    ctx.fillRect(-1.4, -2.6, 2.8, 2.8);

    // Arms and weapon, aimed at the cursor.
    ctx.save();
    ctx.translate(0, -14);
    ctx.rotate(angle);
    ctx.strokeStyle = coat;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(12, 1.4);
    ctx.stroke();
    ctx.strokeStyle = skin;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(11, 1);
    ctx.lineTo(16, 1);
    ctx.stroke();
    // Revolver
    ctx.fillStyle = '#4e5254';
    ctx.fillRect(14, -1.2, 15, 3.4);
    ctx.fillStyle = '#777b7c';
    ctx.fillRect(14, -1.2, 5, 3.4);
    ctx.fillStyle = '#2e2721';
    ctx.fillRect(15, 1.8, 4, 4.5);
    ctx.fillStyle = '#a58d68';
    ctx.beginPath();
    ctx.arc(21, 0.5, 2.2, 0, TAU);
    ctx.fill();
    if (o.muzzle > 0) {
      ctx.fillStyle = 'rgba(255,228,154,0.9)';
      ctx.beginPath();
      ctx.moveTo(29, 0.4);
      ctx.lineTo(41, -5.5);
      ctx.lineTo(38, 0.4);
      ctx.lineTo(41, 6.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,196,90,0.22)';
      ctx.beginPath();
      ctx.arc(32, 0.4, 18, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // Offhand
    ctx.strokeStyle = coat2;
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.moveTo(facing * 7.6, -13);
    ctx.lineTo(facing * 9.5, -4);
    ctx.stroke();

    // Head
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(0, -27, 7.8, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.arc(facing * 2, -27, 7.2, 0, TAU);
    ctx.fill();
    // Hair / hat
    if (o.hat === 'helmet') {
      ctx.fillStyle = '#5d6153';
      ctx.beginPath();
      ctx.arc(0, -29, 9, Math.PI, TAU);
      ctx.fill();
      ctx.fillRect(-10, -29, 20, 2.4);
    } else if (o.hat === 'hood') {
      ctx.fillStyle = o.hood || '#353d31';
      ctx.beginPath();
      ctx.moveTo(-9, -26);
      ctx.quadraticCurveTo(-11, -38, 0, -38);
      ctx.quadraticCurveTo(11, -38, 9, -26);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(facing, -27, 6.8, 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = o.hair || '#33261c';
      ctx.beginPath();
      ctx.arc(0, -30, 7.8, Math.PI * 0.96, Math.PI * 2.06);
      ctx.fill();
      if (o.hat === 'brim') {
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.ellipse(0, -32, 12, 2.6, 0, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, -34, 5.6, Math.PI, TAU);
        ctx.fill();
      }
    }
    // Face
    ctx.fillStyle = '#241d18';
    if (facing > 0) {
      ctx.beginPath();
      ctx.arc(3.2, -28, 1.15, 0, TAU);
      ctx.arc(6.4, -28, 1.05, 0, TAU);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(-3.2, -28, 1.15, 0, TAU);
      ctx.arc(-6.4, -28, 1.05, 0, TAU);
      ctx.fill();
    }
    if (o.scarf) {
      ctx.fillStyle = o.scarf;
      ctx.beginPath();
      ctx.moveTo(-7, -21);
      ctx.quadraticCurveTo(0, -18, 7, -21);
      ctx.lineTo(5, -15);
      ctx.quadraticCurveTo(0, -13, -5, -15);
      ctx.closePath();
      ctx.fill();
    }
    if (o.hitFlash > 0) {
      ctx.fillStyle = `rgba(230,80,58,${Math.min(0.55, o.hitFlash * 2.6)})`;
      ctx.beginPath();
      ctx.arc(0, -13, 22, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPlayer() {
    if (game.mode === 'menu') {
      drawHuman(player.x, player.y, player.aim, {
        walk: 0, coat: '#334534', coat2: '#465c45', accent: '#efb661',
        hat: 'brim', scarf: '#8f3f34', pack: '#59452f', muzzle: 0
      });
      return;
    }
    const inside = game.inside;
    if (inside) {
      ctx.strokeStyle = 'rgba(127,178,165,0.3)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(player.x, player.y, 26 + Math.sin(game.time * 2.5) * 2, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    drawHuman(player.x, player.y, player.aim, {
      walk: player.walk,
      coat: player.hitFlash > 0 ? '#6e3e36' : '#334534',
      coat2: player.hitFlash > 0 ? '#8f5041' : '#465c45',
      accent: '#efb661', hat: 'brim', scarf: '#8f3f34', pack: '#59452f',
      muzzle: game.muzzle, hitFlash: player.hitFlash,
      skin: player.invuln > 0 && Math.floor(game.time * 20) % 2 === 0 ? '#e4c3a2' : '#c89f7d'
    });
    if (player.invuln > 0 && player.invuln < 1) {
      ctx.strokeStyle = 'rgba(239,182,97,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(player.x, player.y - 14, 24, 0, TAU);
      ctx.stroke();
    }
  }

  function drawCompanions() {
    for (const c of game.companions) {
      if (c.hp <= 0) continue;
      if (!onScreen(c.x, c.y, 100)) continue;
      const role = ROLES[c.role];
      const colors = c.role === 'scout'
        ? { coat: '#3d4d54', coat2: '#4f646d', accent: '#8fb7c4' }
        : c.role === 'hunter'
          ? { coat: '#5a452f', coat2: '#70583c', accent: '#d59a5f' }
          : c.role === 'medic'
            ? { coat: '#465540', coat2: '#5b6e53', accent: '#9dc3a4' }
            : { coat: '#4a4055', coat2: '#5d506b', accent: '#b9a4c8' };
      const isWild = c.state === 'wild';
      drawHuman(c.x, c.y, c.angle, {
        walk: game.time * 3 + c.seed,
        coat: colors.coat, coat2: colors.coat2, accent: colors.accent,
        hat: c.role === 'scout' ? 'helmet' : c.role === 'medic' ? 'hood' : 'brim',
        hood: colors.coat2,
        hair: c.role === 'hunter' ? '#4a2f20' : '#2d2117',
        pack: c.state === 'travel' ? '#7b5a37' : '#51402c',
        scarf: c.role === 'medic' ? '#8fa88e' : null,
        scale: c.role === 'scout' ? 0.94 : 1,
        hitFlash: c.hitFlash,
        muzzle: 0
      });

      if (isWild) {
        const bob = Math.sin(game.time * 3 + c.seed) * 2;
        ctx.fillStyle = 'rgba(7,11,17,0.72)';
        ctx.beginPath();
        ctx.arc(c.x, c.y - 48 + bob, 3.4, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(239,182,97,0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(c.x, c.y - 48 + bob, 8, 0, TAU);
        ctx.stroke();
        if (dist(player.x, player.y, c.x, c.y) < 120) {
          ctx.fillStyle = 'rgba(236,219,188,0.72)';
          ctx.font = '700 8px "Segoe UI", system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(role.label.toUpperCase(), c.x, c.y - 60);
        }
      } else {
        const w = 46;
        ctx.fillStyle = 'rgba(7,11,17,0.64)';
        roundRectPath(c.x - w / 2, c.y - 50, w, 11, 2);
        ctx.fill();
        ctx.fillStyle = roleColor(c.role);
        ctx.fillRect(c.x - w / 2 + 2, c.y - 43, (w - 4) * clamp(c.hp / c.maxHp, 0, 1), 2.4);
        ctx.fillStyle = 'rgba(236,219,188,0.78)';
        ctx.font = '600 7px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(c.name.toUpperCase(), c.x, c.y - 52);
      }
    }
  }

  function roleColor(role) {
    return role === 'scout' ? '#8fb7c4' : role === 'hunter' ? '#d59a5f' : role === 'medic' ? '#9dc3a4' : '#b9a4c8';
  }

  /* ---------------------------------------------------------------------
     Rendering — SCPs
  --------------------------------------------------------------------- */
  function drawEnemy(e) {
    if (!onScreen(e.x, e.y, 120)) return;
    const fade = e.spawn === undefined ? 1 : clamp(e.spawn, 0, 1);
    ctx.save();
    ctx.globalAlpha = fade;
    drawShadow(e.x, e.y + e.r * 0.45, e.r * 0.9, e.r * 0.32, 0.36);
    switch (e.kind) {
      case 'statue': drawSCP173(e); break;
      case 'shy': drawSCP096(e); break;
      case 'oldman': drawSCP106(e); break;
      case 'doctor': drawSCP049(e); break;
      case 'pack': drawSCP939(e); break;
      case 'flesh': drawSCP610(e); break;
      case 'fire': drawSCP457(e); break;
      case 'boss': drawSCP682(e); break;
      default: drawSCP173(e);
    }
    if (e.hitFlash > 0) {
      ctx.globalAlpha = Math.min(0.55, e.hitFlash * 3);
      ctx.fillStyle = '#ffe1c8';
      ctx.beginPath();
      ctx.arc(e.x, e.y - e.r * 0.2, e.r * 1.15, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = fade;
    }
    if (!e.isBoss) drawEnemyHealth(e);
    ctx.restore();
  }

  function drawEnemyHealth(e) {
    const d = dist(player.x, player.y, e.x, e.y);
    if (d > 520 || e.hp >= e.maxHp) return;
    const w = Math.max(26, e.r * 2.4);
    ctx.fillStyle = 'rgba(7,8,10,0.7)';
    ctx.fillRect(e.x - w / 2, e.y - e.r - 25, w, 4);
    ctx.fillStyle = e.hp / e.maxHp > 0.38 ? '#c96a52' : '#e4a15e';
    ctx.fillRect(e.x - w / 2 + 1, e.y - e.r - 24, (w - 2) * clamp(e.hp / e.maxHp, 0, 1), 2);
    if (d < 190) {
      ctx.fillStyle = 'rgba(224,207,182,0.68)';
      ctx.font = '600 7px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(e.name, e.x, e.y - e.r - 31);
    }
  }

  function drawSCP173(e) {
    const x = e.x, y = e.y;
    const a = e.angle;
    const observed = !game.inside && Math.abs(angleDiff(player.aim, Math.atan2(y - player.y, x - player.x))) < 0.58 && dist(x, y, player.x, player.y) < 860;
    if (observed) {
      ctx.strokeStyle = 'rgba(180,225,255,0.24)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 7]);
      ctx.beginPath();
      ctx.arc(x, y, e.r + 20, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.save();
    ctx.translate(x, y);
    // Concrete torso
    ctx.fillStyle = '#a9a492';
    ctx.beginPath();
    ctx.moveTo(-12, -24);
    ctx.quadraticCurveTo(-15, 8, -8, 17);
    ctx.lineTo(8, 17);
    ctx.quadraticCurveTo(15, 8, 12, -24);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8c8777';
    ctx.beginPath();
    ctx.moveTo(-8, -16);
    ctx.lineTo(5, -12);
    ctx.lineTo(9, 16);
    ctx.lineTo(2, 17);
    ctx.closePath();
    ctx.fill();
    // Arms
    ctx.fillStyle = '#b7b19e';
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.rotate(a + side * 0.32);
      ctx.beginPath();
      ctx.moveTo(side * 7, -19);
      ctx.lineTo(side * 7 + 5, -2);
      ctx.lineTo(side * 4, 4);
      ctx.lineTo(side * 2, -16);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // Head
    ctx.fillStyle = '#c2bca8';
    ctx.beginPath();
    ctx.arc(0, -31, 9.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#3c3a34';
    ctx.beginPath();
    ctx.arc(-3.2, -32, 1.5, 0, TAU);
    ctx.arc(3.2, -32, 1.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#44423b';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-4, -25);
    ctx.lineTo(4, -27);
    ctx.stroke();
    // Rebar / cracks
    ctx.strokeStyle = 'rgba(67,52,40,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-10, -8);
    ctx.lineTo(-5, -4);
    ctx.lineTo(-8, 3);
    ctx.moveTo(9, 7);
    ctx.lineTo(4, 11);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(155,143,116,0.9)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-11, -23);
    ctx.lineTo(-14, -33);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(220,235,255,0.35)';
    for (let i = 0; i < 5; i++) {
      const aa = game.time * 0.05 + i * 1.2;
      ctx.beginPath();
      ctx.moveTo(-6 + i * 3, -35);
      ctx.lineTo(-6 + i * 3 + Math.cos(aa) * 7, -42);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSCP096(e) {
    const x = e.x, y = e.y;
    const enraged = e.enraged;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = enraged ? '#c9b8ae' : '#b7ada4';
    ctx.fillStyle = enraged ? '#c4b5aa' : '#ccc2b8';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    // Long arms and legs
    ctx.beginPath();
    ctx.moveTo(-6, -16);
    ctx.quadraticCurveTo(-20, -2, -17, 13);
    ctx.moveTo(6, -16);
    ctx.quadraticCurveTo(18, 2, 15, 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-5, 8);
    ctx.lineTo(-10 - Math.sin(game.time * 3) * 2, 26);
    ctx.moveTo(5, 8);
    ctx.lineTo(10 + Math.sin(game.time * 3) * 2, 26);
    ctx.stroke();
    // Torso
    ctx.beginPath();
    ctx.moveTo(-10, -26);
    ctx.quadraticCurveTo(-13, -6, -7, 10);
    ctx.lineTo(7, 10);
    ctx.quadraticCurveTo(13, -6, 10, -26);
    ctx.closePath();
    ctx.fill();
    // Ribs
    ctx.strokeStyle = 'rgba(130,112,103,0.55)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(0, -14 + i * 5, 7 - i * 0.5, 2, 0, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
    // Head
    ctx.fillStyle = enraged ? '#d7c6ba' : '#d8cfc6';
    ctx.beginPath();
    ctx.ellipse(0, -33, 7.6, 9.4, 0, 0, TAU);
    ctx.fill();
    if (enraged) {
      ctx.fillStyle = '#501515';
      ctx.beginPath();
      ctx.ellipse(0, -28, 5.5, 7, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ff5a4a';
      ctx.beginPath();
      ctx.arc(-2.8, -35, 1.5, 0, TAU);
      ctx.arc(2.8, -35, 1.5, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,8,8,0.8)';
      ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 2, -23);
        ctx.lineTo(i * 2.2, -15);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#9e9188';
      // hands covering the face
      ctx.beginPath();
      ctx.ellipse(-4, -30, 4.4, 6.2, -0.2, 0, TAU);
      ctx.ellipse(4, -30, 4.4, 6.2, 0.2, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(90,77,70,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-8, -33);
      ctx.lineTo(-2, -30);
      ctx.moveTo(8, -33);
      ctx.lineTo(2, -30);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSCP106(e) {
    const x = e.x, y = e.y;
    ctx.save();
    ctx.translate(x, y);
    const aura = ctx.createRadialGradient(0, -8, 6, 0, -8, e.r * 2.4);
    aura.addColorStop(0, 'rgba(50,80,39,0.18)');
    aura.addColorStop(1, 'rgba(10,20,10,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, -8, e.r * 2.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#11170f';
    ctx.beginPath();
    ctx.moveTo(-11, 15);
    ctx.quadraticCurveTo(-16, -8, -8, -25);
    ctx.lineTo(8, -25);
    ctx.quadraticCurveTo(16, -8, 11, 15);
    ctx.closePath();
    ctx.fill();
    // long arms
    ctx.strokeStyle = '#151b12';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, -18);
    ctx.quadraticCurveTo(-22, -4, -18, 17);
    ctx.moveTo(8, -18);
    ctx.quadraticCurveTo(20, 0, 17, 16);
    ctx.stroke();
    // corroded drips
    ctx.strokeStyle = 'rgba(70,92,46,0.4)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(-7 + i * 3.5, 10);
      ctx.lineTo(-8 + i * 3.5, 20 + Math.sin(game.time * 2 + i) * 4);
      ctx.stroke();
    }
    // head
    ctx.fillStyle = '#1b2218';
    ctx.beginPath();
    ctx.arc(0, -33, 8.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#a7ff9a';
    ctx.beginPath();
    ctx.arc(-3, -34, 1.5, 0, TAU);
    ctx.arc(3, -34, 1.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(140,255,120,0.18)';
    ctx.beginPath();
    ctx.arc(0, -34, 12, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(124,150,84,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -33, 11, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function drawSCP049(e) {
    const x = e.x, y = e.y;
    ctx.save();
    ctx.translate(x, y);
    // Robe
    ctx.fillStyle = '#17151a';
    ctx.beginPath();
    ctx.moveTo(-15, 25);
    ctx.quadraticCurveTo(-17, -5, -9, -22);
    ctx.lineTo(9, -22);
    ctx.quadraticCurveTo(17, -5, 15, 25);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#24212a';
    ctx.beginPath();
    ctx.moveTo(-6, -18);
    ctx.lineTo(2, -18);
    ctx.lineTo(8, 20);
    ctx.lineTo(-4, 20);
    ctx.closePath();
    ctx.fill();
    // Shoulders/arms
    ctx.strokeStyle = '#211e26';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-9, -16);
    ctx.lineTo(-18, -2);
    ctx.lineTo(-17, 9);
    ctx.moveTo(9, -16);
    ctx.lineTo(18, -3);
    ctx.lineTo(16, 9);
    ctx.stroke();
    // Hat brim
    ctx.fillStyle = '#26232b';
    ctx.beginPath();
    ctx.ellipse(0, -35, 17, 4.2, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -38, 8, Math.PI, TAU);
    ctx.fill();
    // Beak mask
    ctx.fillStyle = '#ded6c2';
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.quadraticCurveTo(9, -35, 7, -24);
    ctx.quadraticCurveTo(3, -16, 0, -15);
    ctx.quadraticCurveTo(-6, -18, -7, -26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#151318';
    ctx.beginPath();
    ctx.arc(-2.6, -31, 1.7, 0, TAU);
    ctx.arc(2.6, -31, 1.7, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#c9c0aa';
    ctx.beginPath();
    ctx.moveTo(4, -26);
    ctx.lineTo(20, -23);
    ctx.lineTo(5, -21);
    ctx.closePath();
    ctx.fill();
    // Reanimating fluid glow at the hands
    ctx.fillStyle = 'rgba(170,220,145,0.32)';
    ctx.beginPath();
    ctx.arc(16, 9, 6, 0, TAU);
    ctx.arc(-17, 9, 5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawSCP939(e) {
    const x = e.x, y = e.y;
    const run = Math.sin(game.time * 9 + e.seed) * 4;
    ctx.save();
    ctx.translate(x, y);
    // quadruped body
    ctx.fillStyle = '#6e1b1a';
    ctx.beginPath();
    ctx.ellipse(0, -5, 20, 12, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#84221f';
    ctx.beginPath();
    ctx.ellipse(-2, -9, 14, 7, 0, 0, TAU);
    ctx.fill();
    // legs
    ctx.strokeStyle = '#5b1616';
    ctx.lineWidth = 4.4;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const lx = -14 + i * 9;
      const dir = i % 2 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(lx, 4);
      ctx.lineTo(lx + dir * 3, 13 + run * dir);
      ctx.stroke();
    }
    // neck and elongated head
    ctx.strokeStyle = '#7c1f1c';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(9, -10);
    ctx.quadraticCurveTo(24, -17, 31, -17);
    ctx.stroke();
    ctx.fillStyle = '#8b2520';
    ctx.beginPath();
    ctx.ellipse(34, -17, 12, 6.5, 0.1, 0, TAU);
    ctx.fill();
    // mouth and teeth
    ctx.fillStyle = '#2b0908';
    ctx.beginPath();
    ctx.moveTo(29, -14);
    ctx.quadraticCurveTo(44, -12, 45, -17);
    ctx.quadraticCurveTo(38, -23, 29, -21);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#e4d9b5';
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(31 + i * 2.7, -15);
      ctx.lineTo(32 + i * 2.7, -11.5);
      ctx.stroke();
    }
    // no eyes, sensory pits
    ctx.fillStyle = 'rgba(255,150,95,0.72)';
    ctx.beginPath();
    ctx.arc(28, -20, 1.2, 0, TAU);
    ctx.arc(31, -21, 0.9, 0, TAU);
    ctx.fill();
    // dorsal spines
    ctx.strokeStyle = '#3d0e0d';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(-10 + i * 5, -14);
      ctx.lineTo(-12 + i * 5, -21);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSCP610(e) {
    const x = e.x, y = e.y;
    const pulse = 1 + Math.sin(game.time * 3.2 + e.seed) * 0.07;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, 2 - pulse);
    // crawling flesh mass
    ctx.fillStyle = '#7e2b25';
    ctx.beginPath();
    ctx.ellipse(0, -2, 20, 13, 0.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#a64a3a';
    ctx.beginPath();
    ctx.ellipse(-5, -8, 12, 7, -0.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#5f201d';
    ctx.beginPath();
    ctx.ellipse(8, 2, 9, 5, 0.4, 0, TAU);
    ctx.fill();
    // tendrils
    ctx.strokeStyle = '#8f3a30';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const aa = (i / 7) * TAU;
      const len = 18 + Math.sin(game.time * 2.5 + i) * 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(aa) * 10, Math.sin(aa) * 7);
      ctx.quadraticCurveTo(Math.cos(aa) * (len + 5), Math.sin(aa) * (len * 0.7), Math.cos(aa + 0.5) * len, Math.sin(aa + 0.5) * len * 0.8);
      ctx.stroke();
    }
    // pustules / eyes
    ctx.fillStyle = '#ff7a52';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(-9 + i * 5.5, -7 + (i % 2) * 4, 1.3, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,90,60,0.12)';
    ctx.beginPath();
    ctx.arc(0, 0, 38, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawSCP457(e) {
    const x = e.x, y = e.y;
    const flick = Math.sin(game.time * 12 + e.seed) * 0.18;
    ctx.save();
    ctx.translate(x, y);
    const aura = ctx.createRadialGradient(0, -8, 4, 0, -8, 48);
    aura.addColorStop(0, 'rgba(255,150,60,0.34)');
    aura.addColorStop(0.5, 'rgba(220,90,30,0.12)');
    aura.addColorStop(1, 'rgba(220,90,30,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, -8, 48, 0, TAU);
    ctx.fill();
    // Humanoid flame silhouette
    ctx.fillStyle = `rgba(224,110,48,${0.9 + flick})`;
    ctx.beginPath();
    ctx.moveTo(-13, 17);
    ctx.quadraticCurveTo(-17, -8, -8, -22);
    ctx.quadraticCurveTo(-3, -30, 0, -38 + flick * 8);
    ctx.quadraticCurveTo(7, -27, 9, -20);
    ctx.quadraticCurveTo(18, -5, 13, 17);
    ctx.quadraticCurveTo(4, 24, -13, 17);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,210,100,0.75)';
    ctx.beginPath();
    ctx.moveTo(-6, 11);
    ctx.quadraticCurveTo(-8, -8, 0, -24 + flick * 5);
    ctx.quadraticCurveTo(8, -7, 6, 11);
    ctx.closePath();
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#2a130b';
    ctx.beginPath();
    ctx.arc(-3.3, -24, 1.4, 0, TAU);
    ctx.arc(3.3, -24, 1.4, 0, TAU);
    ctx.fill();
    // Licking flames
    ctx.fillStyle = 'rgba(255,140,50,0.60)';
    for (let i = 0; i < 5; i++) {
      const aa = game.time * 4 + i * 1.6 + e.seed;
      ctx.beginPath();
      ctx.ellipse(Math.cos(aa) * 10, -28 + Math.sin(aa) * 8, 4, 10, aa * 0.2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSCP682(e) {
    const x = e.x, y = e.y;
    const phase = e.phase || 1;
    const scale = 1 + (phase - 1) * 0.05;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    // Aura
    const aura = ctx.createRadialGradient(0, -20, 10, 0, -20, 108);
    aura.addColorStop(0, phase >= 3 ? 'rgba(255,66,36,0.18)' : 'rgba(120,160,80,0.12)');
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, -20, 108, 0, TAU);
    ctx.fill();

    // Tail
    ctx.strokeStyle = '#34412c';
    ctx.lineWidth = 15;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-20, 18);
    ctx.quadraticCurveTo(-60, 35, -82, 12 + Math.sin(game.time * 2.2) * 10);
    ctx.stroke();
    ctx.strokeStyle = '#445434';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-55, 27);
    ctx.quadraticCurveTo(-78, 26, -96, 8);
    ctx.stroke();

    // Legs
    ctx.strokeStyle = '#33402b';
    ctx.lineWidth = 13;
    for (let i = -1; i <= 1; i += 2) {
      ctx.beginPath();
      ctx.moveTo(i * 22, 8);
      ctx.lineTo(i * 34, 34);
      ctx.lineTo(i * 40, 36);
      ctx.moveTo(i * 12, 12);
      ctx.lineTo(i * 15, 38);
      ctx.stroke();
    }
    // Body
    const grd = ctx.createLinearGradient(-35, -40, 38, 30);
    grd.addColorStop(0, phase >= 3 ? '#52623e' : '#465538');
    grd.addColorStop(0.55, '#39472f');
    grd.addColorStop(1, '#273322');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(0, -6, 40, 28, -0.06, 0, TAU);
    ctx.fill();
    // Scars and plates
    ctx.strokeStyle = 'rgba(160,180,120,0.25)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.moveTo(-26 + i * 8, -26);
      ctx.quadraticCurveTo(-22 + i * 8, -10, -26 + i * 8, 10);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(20,26,16,0.45)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-31, -18 + i * 9);
      ctx.lineTo(-12, -14 + i * 8);
      ctx.lineTo(2, -19 + i * 7);
      ctx.stroke();
    }
    // Dorsal spines
    ctx.fillStyle = '#6b7b4b';
    for (let i = 0; i < 6; i++) {
      const px = -20 + i * 8;
      ctx.beginPath();
      ctx.moveTo(px - 3, -28);
      ctx.lineTo(px + 1, -43 - (i % 3) * 4);
      ctx.lineTo(px + 4, -27);
      ctx.closePath();
      ctx.fill();
    }
    // Head
    ctx.fillStyle = '#3f4e33';
    ctx.beginPath();
    ctx.ellipse(36, -17, 26, 19, 0.08, 0, TAU);
    ctx.fill();
    // Jaw
    ctx.fillStyle = '#2c3725';
    ctx.beginPath();
    ctx.moveTo(20, -7);
    ctx.quadraticCurveTo(47, -2, 64, -13);
    ctx.quadraticCurveTo(49, -23, 24, -22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#b6bd96';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) {
      const tx = 27 + i * 5;
      ctx.beginPath();
      ctx.moveTo(tx, -12);
      ctx.lineTo(tx + 1.5, -6);
      ctx.stroke();
    }
    // Eye
    ctx.fillStyle = phase >= 3 ? '#ff3b20' : '#ff6a3a';
    ctx.beginPath();
    ctx.ellipse(45, -23, 4.4, 3.2, 0.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1a0d08';
    ctx.beginPath();
    ctx.ellipse(46, -23, 1.2, 2.6, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,90,50,0.18)';
    ctx.beginPath();
    ctx.arc(45, -23, 16, 0, TAU);
    ctx.fill();
    // Breath
    if (Math.sin(game.time * 2.2) > 0.55) {
      ctx.fillStyle = 'rgba(160,190,130,0.10)';
      ctx.beginPath();
      ctx.ellipse(66, -12, 12, 4, 0.1, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // Boss name tag when close.
    ctx.fillStyle = 'rgba(236,219,188,0.8)';
    ctx.font = '700 8px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCP-682', x, y - 74);
  }

  /* ---------------------------------------------------------------------
     Rendering — effects
  --------------------------------------------------------------------- */
  function drawParticles() {
    for (const p of game.particles) {
      if (!onScreen(p.x, p.y, 30)) continue;
      const a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a * (p.type === 'mist' ? 0.42 : 0.85);
      ctx.fillStyle = p.color;
      if (p.type === 'spark') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      } else if (p.type === 'ember') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 1.2, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    for (const t of game.texts) {
      const a = clamp(t.life / t.max, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = t.color;
      ctx.font = '700 10px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawBullets() {
    ctx.globalCompositeOperation = 'lighter';
    for (const b of game.bullets) {
      if (!onScreen(b.x, b.y, 30)) continue;
      ctx.strokeStyle = 'rgba(255,225,160,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b.px, b.py);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,180,90,0.28)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(b.px, b.py);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawProjectiles() {
    ctx.globalCompositeOperation = 'lighter';
    for (const p of game.projectiles) {
      if (!onScreen(p.x, p.y, 40)) continue;
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.2);
      grd.addColorStop(0, p.color);
      grd.addColorStop(0.4, p.color);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff2d0';
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, p.r * 0.55), 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawGlows() {
    ctx.globalCompositeOperation = 'lighter';
    for (const s of shelters) {
      if (!s.state.owned) continue;
      if (!onScreen(s.x, s.y, 260)) continue;
      const grd = ctx.createRadialGradient(s.x + 46, s.y + 26, 2, s.x + 46, s.y + 26, 120);
      grd.addColorStop(0, 'rgba(247,188,100,0.13)');
      grd.addColorStop(1, 'rgba(247,188,100,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(s.x + 46, s.y + 26, 120, 0, TAU);
      ctx.fill();
    }
    for (const e of game.enemies) {
      if (e.kind !== 'fire' && e.kind !== 'boss') continue;
      if (!onScreen(e.x, e.y, 180)) continue;
      const grd = ctx.createRadialGradient(e.x, e.y - 10, 2, e.x, e.y - 10, e.isBoss ? 140 : 80);
      grd.addColorStop(0, e.isBoss ? 'rgba(160,255,90,0.08)' : 'rgba(255,150,60,0.16)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(e.x, e.y - 10, e.isBoss ? 140 : 80, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------------------------------------------------------------------
     Lighting + weather
  --------------------------------------------------------------------- */
  function darknessLevel() {
    let dark;
    if (game.mode === 'menu') dark = 0.42;
    else if (game.mode === 'paused' || game.mode === 'over' || game.mode === 'chapter') {
      dark = game.phase === 'night' ? 0.58 : 0.32;
    } else if (game.phase === 'day') dark = 0.03;
    else if (game.phase === 'dusk') dark = 0.16 + clamp(game.phaseTime / Math.max(1, DUSK_DURATION), 0, 1) * 0.38;
    else if (game.phase === 'night') dark = 0.6;
    else dark = 0.23;
    if (currentRegion.id === 'japan' && game.phase !== 'day') dark += 0.035;
    return clamp(dark, 0, 0.68);
  }

  function cutLight(x, y, radius, strength) {
    const grd = lightCtx.createRadialGradient(x, y, 0, x, y, radius);
    const s = strength === undefined ? 1 : strength;
    grd.addColorStop(0, `rgba(0,0,0,${0.94 * s})`);
    grd.addColorStop(0.42, `rgba(0,0,0,${0.55 * s})`);
    grd.addColorStop(0.76, `rgba(0,0,0,${0.16 * s})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    lightCtx.fillStyle = grd;
    lightCtx.beginPath();
    lightCtx.arc(x, y, radius, 0, TAU);
    lightCtx.fill();
  }

  function drawLighting() {
    const dark = darknessLevel();
    if (dark <= 0.015) return;
    const dpr = view.dpr;
    lightCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lightCtx.globalCompositeOperation = 'source-over';
    lightCtx.clearRect(0, 0, view.w, view.h);
    lightCtx.fillStyle = `rgba(3,7,14,${dark})`;
    lightCtx.fillRect(0, 0, view.w, view.h);

    const toScreen = (x, y) => ({ x: x - camera.x + view.w / 2, y: y - camera.y + view.h / 2 });
    lightCtx.globalCompositeOperation = 'destination-out';

    const p = toScreen(player.x, player.y - 10);
    cutLight(p.x, p.y, game.inside ? 150 : 230, game.inside ? 0.82 : 1);
    if (player.moving) {
      const back = toScreen(player.x - Math.cos(player.aim) * 38, player.y - Math.sin(player.aim) * 38);
      cutLight(back.x, back.y, 95, 0.5);
    }

    for (const s of shelters) {
      if (s.state.collapsed) continue;
      const sp = toScreen(s.x + 20, s.y + 12);
      if (sp.x < -240 || sp.x > view.w + 240 || sp.y < -240 || sp.y > view.h + 240) continue;
      const strength = s.state.owned ? 0.92 : 0.28;
      cutLight(sp.x, sp.y, s.state.owned ? 178 : 90, strength);
    }

    if (game.muzzle > 0) {
      const m = toScreen(player.x + Math.cos(player.aim) * 30, player.y - 14 + Math.sin(player.aim) * 30);
      cutLight(m.x, m.y, 105, 0.85);
    }
    for (const e of game.enemies) {
      if (e.kind === 'fire' || (e.isBoss && e.phase >= 2)) {
        const ep = toScreen(e.x, e.y - 10);
        cutLight(ep.x, ep.y, e.isBoss ? 120 : 80, 0.55);
      }
    }

    lightCtx.globalCompositeOperation = 'source-over';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(lightCanvas, 0, 0, view.w, view.h);
  }

  function drawWeather() {
    const t = game.time;
    const phaseDark = game.phase === 'night' || game.phase === 'dusk' || game.mode === 'menu';
    ctx.save();
    if (currentRegion.id === 'valley') {
      const intensity = phaseDark ? 0.24 : 0.1;
      ctx.strokeStyle = `rgba(185,210,220,${intensity})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 90; i++) {
        const x = ((i * 137.3 + t * 180) % (view.w + 90)) - 45;
        const y = ((i * 71.7 + t * 620) % (view.h + 80)) - 40;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 5, y + 19);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(150,170,175,0.018)';
      ctx.fillRect(0, 0, view.w, view.h);
    } else if (currentRegion.id === 'mexico') {
      for (let i = 0; i < 65; i++) {
        const x = ((i * 173.1 + t * 16 + Math.sin(i + t * 0.2) * 30) % (view.w + 80)) - 40;
        const y = ((i * 91.7 + Math.sin(t * 0.3 + i) * 26) % (view.h + 60)) - 30;
        ctx.fillStyle = `rgba(222,188,132,${0.03 + (i % 4) * 0.014})`;
        ctx.beginPath();
        ctx.arc(x, y, 0.8 + (i % 3) * 0.6, 0, TAU);
        ctx.fill();
      }
      const heat = ctx.createLinearGradient(0, 0, 0, view.h);
      heat.addColorStop(0, 'rgba(226,158,74,0.035)');
      heat.addColorStop(0.6, 'rgba(226,158,74,0.01)');
      heat.addColorStop(1, 'rgba(226,158,74,0)');
      ctx.fillStyle = heat;
      ctx.fillRect(0, 0, view.w, view.h);
    } else {
      for (let band = 0; band < 4; band++) {
        const y = ((band * 180 + t * 9) % (view.h + 260)) - 130;
        const grd = ctx.createLinearGradient(0, y - 70, 0, y + 70);
        grd.addColorStop(0, 'rgba(180,205,195,0)');
        grd.addColorStop(0.5, `rgba(180,205,195,${phaseDark ? 0.045 : 0.025})`);
        grd.addColorStop(1, 'rgba(180,205,195,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, y - 70, view.w, 140);
      }
      for (let i = 0; i < 22; i++) {
        const x = ((i * 211.7 + Math.sin(t * 0.4 + i) * 65) % (view.w + 60)) - 30;
        const y = ((i * 123.4 + Math.cos(t * 0.31 + i * 2) * 45) % (view.h + 60)) - 30;
        const a = 0.18 + Math.sin(t * 2.2 + i) * 0.14;
        ctx.fillStyle = `rgba(219,238,160,${Math.max(0, a)})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.25, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(219,238,160,0.08)';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawVignette() {
    const night = game.phase === 'night' ? 0.34 : 0.24;
    const grd = ctx.createRadialGradient(
      view.w / 2, view.h * 0.46, Math.min(view.w, view.h) * 0.22,
      view.w / 2, view.h * 0.5, Math.max(view.w, view.h) * 0.78
    );
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(0.66, `rgba(0,0,0,${night * 0.19})`);
    grd.addColorStop(1, `rgba(0,0,0,${night * 0.68})`);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, view.w, view.h);
    if (game.phase === 'night') {
      ctx.fillStyle = 'rgba(10,18,34,0.055)';
      ctx.fillRect(0, 0, view.w, view.h);
    }
    // Film grain, very light.
    ctx.globalAlpha = 0.035;
    for (let i = 0; i < 80; i++) {
      const x = (i * 97.13 + game.time * 37) % view.w;
      const y = (i * 53.71 + game.time * 61) % view.h;
      ctx.fillStyle = i % 2 ? '#f1e7d2' : '#000000';
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------------------------------------------------------------------
     Scene + frame
  --------------------------------------------------------------------- */
  function renderScene() {
    const sx = game.shake > 0 ? (Math.random() - 0.5) * game.shake : 0;
    const sy = game.shake > 0 ? (Math.random() - 0.5) * game.shake : 0;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.clearRect(0, 0, view.w, view.h);
    ctx.fillStyle = currentRegion.base;
    ctx.fillRect(0, 0, view.w, view.h);

    ctx.save();
    ctx.translate(
      Math.round(view.w / 2 - camera.x + sx),
      Math.round(view.h / 2 - camera.y + sy)
    );

    drawGround();
    drawProps();
    drawTrees();
    drawResourceNodes();
    for (const s of shelters) {
      if (onScreen(s.x, s.y, s.radius + 170)) drawShelterBuilding(s);
    }
    drawCompanions();
    for (const e of game.enemies) drawEnemy(e);
    drawPlayer();
    drawParticles();
    drawBullets();
    drawProjectiles();
    ctx.restore();

    drawLighting();

    // Additive glows sit above the darkness mask.
    ctx.save();
    ctx.translate(
      Math.round(view.w / 2 - camera.x + sx),
      Math.round(view.h / 2 - camera.y + sy)
    );
    drawGlows();
    ctx.restore();

    drawWeather();
    drawVignette();
  }

  function renderMinimap() {
    const cw = minimap.width;
    const ch = minimap.height;
    mm.clearRect(0, 0, cw, ch);
    mm.fillStyle = currentRegion.base;
    mm.fillRect(0, 0, cw, ch);

    const pad = 7;
    const scale = Math.min((cw - pad * 2) / WORLD.w, (ch - pad * 2) / WORLD.h);
    const ox = (cw - WORLD.w * scale) / 2;
    const oy = (ch - WORLD.h * scale) / 2;

    mm.save();
    mm.translate(ox, oy);
    mm.scale(scale, scale);

    // Ground wash
    mm.fillStyle = currentRegion.id === 'mexico' ? 'rgba(93,62,35,0.55)' : currentRegion.id === 'japan' ? 'rgba(22,48,43,0.6)' : 'rgba(25,48,33,0.62)';
    mm.fillRect(0, 0, WORLD.w, WORLD.h);
    // Water
    for (const w of terrain.water) {
      mm.fillStyle = 'rgba(56,104,108,0.7)';
      mm.beginPath();
      mm.ellipse(w.x, w.y, w.rx, w.ry, 0, 0, TAU);
      mm.fill();
    }
    // Paths
    mm.strokeStyle = 'rgba(164,141,98,0.36)';
    mm.lineWidth = 14;
    mm.lineCap = 'round';
    for (const link of pathLinks) {
      const a = shelters.find((s) => s.id === link[0]);
      const b = shelters.find((s) => s.id === link[1]);
      if (!a || !b) continue;
      mm.beginPath();
      mm.moveTo(a.x, a.y);
      mm.lineTo(b.x, b.y);
      mm.stroke();
    }
    // Shelters
    for (const s of shelters) {
      const owned = s.state.owned;
      mm.fillStyle = s.state.collapsed ? 'rgba(80,70,60,0.4)' : owned ? 'rgba(239,182,97,0.95)' : 'rgba(214,196,158,0.5)';
      mm.fillRect(s.x - 14, s.y - 14, 28, 28);
      if (game.activeShelter === s.id) {
        mm.strokeStyle = 'rgba(255,228,168,0.9)';
        mm.lineWidth = 7;
        mm.strokeRect(s.x - 23, s.y - 23, 46, 46);
      }
    }
    // Companions
    for (const c of game.companions) {
      if (c.hp <= 0) continue;
      mm.fillStyle = c.state === 'wild' ? 'rgba(144,199,191,0.55)' : roleColor(c.role);
      mm.beginPath();
      mm.arc(c.x, c.y, 9, 0, TAU);
      mm.fill();
    }
    // Enemies
    for (const e of game.enemies) {
      if (e.dead) continue;
      if (e.isBoss) {
        const pulse = 0.65 + Math.sin(game.time * 6) * 0.3;
        mm.fillStyle = `rgba(255,75,47,${pulse})`;
        mm.beginPath();
        mm.arc(e.x, e.y, 26, 0, TAU);
        mm.fill();
        mm.strokeStyle = 'rgba(255,130,90,0.8)';
        mm.lineWidth = 5;
        mm.beginPath();
        mm.arc(e.x, e.y, 38, 0, TAU);
        mm.stroke();
      } else {
        mm.fillStyle = e.kind === 'statue' ? 'rgba(205,201,188,0.85)' : 'rgba(206,80,63,0.85)';
        mm.beginPath();
        mm.arc(e.x, e.y, Math.max(6, e.r * 0.5), 0, TAU);
        mm.fill();
      }
    }
    // Objective ring around current camp
    const active = getActiveShelter();
    if (active) {
      mm.strokeStyle = 'rgba(239,182,97,0.28)';
      mm.lineWidth = 8;
      mm.setLineDash([22, 18]);
      mm.beginPath();
      mm.arc(active.x, active.y, 210, 0, TAU);
      mm.stroke();
      mm.setLineDash([]);
    }
    // Player arrow
    mm.save();
    mm.translate(player.x, player.y);
    mm.rotate(player.aim);
    mm.fillStyle = '#ffe4a8';
    mm.beginPath();
    mm.moveTo(18, 0);
    mm.lineTo(-10, 11);
    mm.lineTo(-5, 0);
    mm.lineTo(-10, -11);
    mm.closePath();
    mm.fill();
    mm.strokeStyle = 'rgba(10,12,10,0.8)';
    mm.lineWidth = 3;
    mm.stroke();
    mm.restore();
    mm.restore();

    // Compass / scanline overlay
    mm.strokeStyle = 'rgba(236,219,188,0.09)';
    mm.lineWidth = 1;
    for (let y = 0; y < ch; y += 4) {
      mm.beginPath();
      mm.moveTo(0, y);
      mm.lineTo(cw, y);
      mm.stroke();
    }
    mm.fillStyle = 'rgba(239,182,97,0.72)';
    mm.font = '700 9px "Segoe UI", system-ui, sans-serif';
    mm.textAlign = 'center';
    mm.fillText('N', cw / 2, 10);
  }

  function render() {
    renderScene();
    renderMinimap();
  }

  let lastFrame = 0;
  function frame(now) {
    if (!lastFrame) lastFrame = now;
    const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    update(dt);
    updateDawn(dt);
    updateDying(dt);
    render();
    requestAnimationFrame(frame);
  }

  function init() {
    resize();
    buildWorld(0);
    resetShelters();
    resetNodes();
    game.companions.length = 0;
    spawnWildCompanions(4);
    game.mode = 'menu';
    game.chapter = 1;
    game.day = 1;
    game.phase = 'dusk';
    game.phaseTime = DUSK_DURATION * 0.45;
    game.phaseDuration = DUSK_DURATION;
    game.best = loadBest();
    game.mode = 'menu';
    player.x = 700;
    player.y = 792;
    player.aim = -0.7;
    camera.x = WORLD.w / 2;
    camera.y = WORLD.h / 2;

    bindInput();
    setMobileMode(mobileMode);
    DOM.menuScreen.classList.remove('hidden');
    DOM.menuScreen.classList.remove('menu-gone');
    DOM.menuDock.hidden = true;
    DOM.pauseDock.hidden = true;
    DOM.hud.classList.remove('visible');
    updateBestBadges();
    updateTeamUI(true);
    updateHUD();
    Sound.setMuted(Sound.muted);
    document.addEventListener('pointerdown', () => Sound.resume(), { once: true });
    document.addEventListener('keydown', () => Sound.resume(), { once: true });
    requestAnimationFrame(frame);
  }

  init();
})();
