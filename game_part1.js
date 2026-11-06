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
