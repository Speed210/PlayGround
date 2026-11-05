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
    mapTitle: $('mapTitle'),
    dreadLabel: $('dreadLabel'),
    hauntLabel: $('hauntLabel'),
    muteBtn: $('muteBtn'),
    pauseBtn: $('pauseBtn'),
    woodCount: $('woodCount'),
    stoneCount: $('stoneCount'),
    scrapCount: $('scrapCount'),
    weaponTier: $('weaponTier'),
    controlHint: $('controlHint'),
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
    menuScreen: $('menuScreen'),
    bestDays: $('bestDays'),
    startBtn: $('startBtn'),
    pauseScreen: $('pauseScreen'),
    resumeBtn: $('resumeBtn'),
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

  const ROLES = {
    scout: { label: 'Scout', hp: 72, dmg: 17, rate: 0.65, range: 370, speed: 156, color: '#8fb7c4', perk: 'Fast, sharp-eyed, quick to fire.' },
    hunter: { label: 'Hunter', hp: 92, dmg: 31, rate: 1.05, range: 405, speed: 126, color: '#d59a5f', perk: 'Heavy rifle. Hits like a closing door.' },
    medic: { label: 'Medic', hp: 82, dmg: 13, rate: 0.9, range: 300, speed: 138, color: '#9dc3a4', perk: 'Mends your wounds while the world bleeds.' },
    engineer: { label: 'Engineer', hp: 100, dmg: 15, rate: 0.95, range: 320, speed: 130, color: '#b9a4c8', perk: 'Patches barricades without being asked.' }
  };

  const NAMES = ['Mira', 'Cole', 'Yara', 'Bram', 'Juno', 'Silas', 'Wren', 'Ossa', 'Tamsin', 'Rook', 'Elia', 'Dane'];

  const ENEMY_TYPES = {
    walker: { hp: 32, speed: 52, dmg: 9, atk: 0.95, r: 12, wall: 9, color: '#241a1e', eye: '#ff5b38', label: 'Shade' },
    crawler: { hp: 18, speed: 94, dmg: 5, atk: 0.55, r: 9, wall: 5, color: '#2b1a1f', eye: '#ff7a45', label: 'Crawler' },
    brute: { hp: 108, speed: 37, dmg: 20, atk: 1.5, r: 19, wall: 19, color: '#1d161b', eye: '#ff3b24', label: 'Brute' },
    wraith: { hp: 48, speed: 46, dmg: 8, atk: 2.7, r: 13, wall: 0, color: '#251d31', eye: '#c77bff', label: 'Wraith', ranged: true }
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
  const terrain = { patches: [], tufts: [], trees: [], rocks: [] };
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
        hit: 0
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
    while (terrain.trees.length < 155 && attempts < 1400) {
      attempts++;
      const x = 60 + R() * (WORLD.w - 120);
      const y = 60 + R() * (WORLD.h - 120);
      let ok = true;
      for (const s of shelters) {
        if (dist(x, y, s.x, s.y) < s.radius + 115) { ok = false; break; }
      }
      if (!ok) continue;
      for (const t of terrain.trees) {
        if (dist(x, y, t.x, t.y) < 52) { ok = false; break; }
      }
      if (!ok) continue;
      terrain.trees.push({
        x, y,
        r: 18 + R() * 22,
        sway: R() * TAU,
        tone: R() < 0.33 ? 0 : R() < 0.66 ? 1 : 2
      });
    }

    // rocks
    for (let i = 0; i < 70; i++) {
      const x = 50 + R() * (WORLD.w - 100);
      const y = 50 + R() * (WORLD.h - 100);
      let ok = true;
      for (const s of shelters) if (dist(x, y, s.x, s.y) < s.radius + 40) ok = false;
      if (!ok) continue;
      terrain.rocks.push({ x, y, r: 4 + R() * 9, tone: R() * 0.3 });
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
    invuln: 0, hitFlash: 0, walk: 0, moving: false
  };

  const camera = { x: player.x, y: player.y };

  const game = {
    mode: 'menu',
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
      if (code === 'Escape' || code === 'KeyP') {
        if (game.mode === 'playing' || game.mode === 'paused') togglePause();
        return;
      }
      if (code === 'Enter') {
        if (game.mode === 'menu') startGame();
        else if (game.mode === 'dawn') beginNextDay();
        else if (game.mode === 'over') startGame();
        else if (game.mode === 'paused') resumeGame();
        return;
      }
      if (game.mode !== 'playing') return;
      if (code === 'KeyE') { doInteract(); return; }
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
    DOM.pauseRestartBtn.addEventListener('click', startGame);
    DOM.continueBtn.addEventListener('click', beginNextDay);
    DOM.pauseBtn.addEventListener('click', togglePause);
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
  }

  function startGame() {
    Sound.init();
    Sound.resume();
    keys.clear();
    resetRun();
    hideScreens();
    DOM.hud.classList.add('visible');
    DOM.hud.classList.remove('dim');
    DOM.crosshair.classList.add('active');
    game.mode = 'playing';
    game.phase = 'day';
    game.phaseTime = 0;
    game.phaseDuration = DAY_DURATION;
    game.health = game.maxHealth;
    banner('DAY 1', 'THE VALLEY WAKES', 'Gather. Claim a shelter. Do not be caught in the open.', '', 3);
    toast('DAYLIGHT', 'Six shelters stand in this chapter. They will not stay fresh forever.', 'good');
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
        : 'A remembered shelter breeds demons. Break camp before the sun is high.';
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
    const len = Math.hypot(ix, iy);
    if (len > 1) { ix /= len; iy /= len; }
    player.moving = len > 0.08;
    const active = getActiveShelter();
    const speedMod = active && dist(player.x, player.y, active.x, active.y) < active.radius + 30
      ? (active.id === 'farm' ? 1.02 : 1)
      : 1;
    player.x = clamp(player.x + ix * player.speed * speedMod * dt, 34, WORLD.w - 34);
    player.y = clamp(player.y + iy * player.speed * speedMod * dt, 34, WORLD.h - 34);
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
    if (wild) prompt = { kind: 'recruit', target: wild, action: 'recruit', text: `Recruit ${wild.name} · ${ROLES[wild.role].label}`, d: wildDist };
    if (node && (!prompt || nodeDist < prompt.d)) prompt = { kind: 'node', target: node, action: 'gather', text: `Gather ${node.type}`, d: nodeDist };
    if (bestShelter) {
      const residentsHere = companionsAt(bestShelter.id);
      let action = null;
      let text = '';
      if (!bestShelter.state.owned) {
        action = 'claim';
        text = `Claim ${bestShelter.name}`;
      } else if (residentsHere.length && teamMembers().length < MAX_TEAM) {
        action = 'recall';
        text = `Call ${residentsHere[0].name} to your side`;
      } else if (game.activeShelter !== bestShelter.id) {
        action = 'camp';
        text = `Make camp at ${bestShelter.name}`;
      }
      if (action) {
        const d = Math.max(0, bestShelterDist - bestShelter.radius);
        if (!prompt || d < prompt.d) prompt = { kind: 'shelter', target: bestShelter, action, text, d };
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
    e.hp -= dmg;
    e.hitFlash = 0.13;
    const m = Math.hypot(vx || 1, vy || 1) || 1;
    e.x += ((vx || 1) / m) * 4;
    e.y += ((vy || 1) / m) * 4;
    spawnMist(e.x, e.y, e.type === 'brute' ? 5 : 3, '#6c4650');
    Sound.hit();
    if (e.hp <= 0) killEnemy(e);
  }

  function killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    game.kills++;
    game.nightKills++;
    spawnMist(e.x, e.y, e.type === 'brute' ? 22 : 12, '#5b3c49');
    spawnSparks(e.x, e.y, 6, e.type === 'wraith' ? '#c77bff' : '#d5533f', 1.1);
    game.shake = Math.max(game.shake, e.type === 'brute' ? 6 : 2.5);
    Sound.kill();
    if (Math.random() < (e.type === 'brute' ? 0.5 : 0.24)) {
      game.resources.scrap++;
      addText(e.x, e.y - 20, '+1 SCRAP', '#7fb2a5');
    }
  }

  /* ---------------------------------------------------------------------
     Enemies
  --------------------------------------------------------------------- */
  function pickEnemyType() {
    const r = Math.random();
    const day = game.day + (game.chapter - 1) * 3;
    if (day >= 3 && r < 0.13) return 'wraith';
    if (day >= 2 && r < 0.31) return 'brute';
    if (r < 0.58) return 'crawler';
    return 'walker';
  }

  function makeEnemy(type, x, y, raidShelterId) {
    const def = ENEMY_TYPES[type];
    const scale = 1 + (game.day - 1) * 0.19 + (game.chapter - 1) * 0.28;
    return {
      type,
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

      // Otherwise: hold the shelter wall, or hunt the player.
      if (!targetComp) {
        if (!e.ranged && active && active.state.integrity > 0 && dist(player.x, player.y, active.x, active.y) < active.radius + 80) {
          targetType = 'wall';
          targetX = active.x;
          targetY = active.y;
        } else {
          targetType = 'player';
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
        if (d > stop) {
          const a = Math.atan2(dy, dx) + Math.sin(game.time * 2.1 + e.seed) * 0.17;
          e.x += Math.cos(a) * e.speed * dt;
          e.y += Math.sin(a) * e.speed * dt;
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
            e.x += Math.cos(a) * e.speed * dt;
            e.y += Math.sin(a) * e.speed * dt;
            e.angle = a;
          } else if (d < desired - 70) {
            const a = Math.atan2(dy, dx);
            e.x -= Math.cos(a) * e.speed * dt;
            e.y -= Math.sin(a) * e.speed * dt;
            e.angle = a + Math.PI;
          } else {
            e.angle = Math.atan2(dy, dx);
          }
          if (e.fireTimer <= 0 && d < 430) {
            e.fireTimer = e.atk;
            spawnEnemyProjectile(e, { x: targetX, y: targetY });
          }
        } else {
          const stopDist = targetType === 'companion' ? e.r + 13 : e.r + player.r + 2;
          if (d > stopDist) {
            const a = Math.atan2(dy, dx) + Math.sin(game.time * 2.3 + e.seed) * 0.13;
            e.x += Math.cos(a) * e.speed * dt;
            e.y += Math.sin(a) * e.speed * dt;
            e.angle = a;
          } else {
            e.angle = Math.atan2(dy, dx);
            if (e.atkTimer <= 0) {
              e.atkTimer = e.atk;
              if (targetType === 'companion' && targetComp) {
                damageCompanion(targetComp, e.dmg);
                spawnSparks(targetComp.x, targetComp.y, 3, '#a34d3b', 0.8);
              } else {
                damagePlayer(e.dmg);
              }
            }
          }
        }
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
      if (h >= 2) setText(DOM.hauntWarningText, 'The dark remembers this place. Stay again and demons will rise.');

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
    ctx.fillStyle = '#101a14';
    ctx.fillRect(left - 80, top - 80, right - left + 160, bottom - top + 160);

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

    for (const r of terrain.rocks) {
      if (r.x < left || r.x > right || r.y < top || r.y > bottom) continue;
      ctx.fillStyle = `rgba(112,120,112,${0.28 + r.tone})`;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.r, r.r * 0.7, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(32,40,34,0.5)';
      ctx.beginPath();
      ctx.ellipse(r.x + 2, r.y + 3, r.r * 0.8, r.r * 0.45, 0, 0, TAU);
      ctx.fill();
    }
  }

  function drawTrees(bounds) {
    const { left, top, right, bottom } = bounds;
    const palettes = [
      ['#16251c', '#1d3125', '#29402d'],
      ['#18251b', '#203224', '#2c452f'],
      ['#142119', '#1b2b20', '#243827']
    ];
    for (const t of terrain.trees) {
      if (t.x + t.r * 2 < left || t.x - t.r * 2 > right || t.y + t.r * 2 < top || t.y - t.r * 2 > bottom) continue;
      const pal = palettes[t.tone];
      ctx.fillStyle = 'rgba(3,8,6,0.38)';
      ctx.beginPath();
      ctx.ellipse(t.x + 9, t.y + 12, t.r * 1.25, t.r * 0.7, 0.3, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#2a2118';
      ctx.fillRect(t.x - 3, t.y - 2, 6, t.r * 0.95);
      const sway = Math.sin(game.time * 0.6 + t.sway) * 1.5;
      ctx.fillStyle = pal[0];
      ctx.beginPath();
      ctx.arc(t.x + sway, t.y - t.r * 0.38, t.r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = pal[1];
      ctx.beginPath();
      ctx.arc(t.x - t.r * 0.42, t.y - t.r * 0.5, t.r * 0.74, 0, TAU);
      ctx.arc(t.x + t.r * 0.48, t.y - t.r * 0.52, t.r * 0.67, 0, TAU);
      ctx.fill();
      ctx.fillStyle = pal[2];
      ctx.beginPath();
      ctx.arc(t.x - t.r * 0.2 + sway, t.y - t.r * 0.88, t.r * 0.43, 0, TAU);
      ctx.fill();
    }
  }

  function drawShelter(s) {
    const st = s.state;
    const active = s.id === game.activeShelter;
    const near = dist(player.x, player.y, s.x, s.y) < 620;

    if (st.collapsed) {
      ctx.fillStyle = 'rgba(60,38,24,0.5)';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + 6, 94, 52, 0.2, 0, TAU);
      ctx.fill();
      ctx.save();
      ctx.translate(s.x, s.y + 10);
      ctx.rotate(-0.18);
      ctx.fillStyle = '#3a2b1f';
      ctx.fillRect(-70, -10, 140, 20);
      ctx.rotate(0.43);
      ctx.fillRect(-48, -12, 96, 16);
      ctx.restore();
      ctx.fillStyle = 'rgba(120,105,88,0.28)';
      for (let i = 0; i < 16; i++) {
        const a = i * 2.399;
        const r = 26 + (i % 5) * 13;
        ctx.beginPath();
        ctx.arc(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r * 0.72, 5 + (i % 3) * 4, 0, TAU);
        ctx.fill();
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

    // cabin
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.fillStyle = 'rgba(2,5,4,0.42)';
    ctx.beginPath();
    ctx.ellipse(11, 28, 84, 42, 0.08, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#2c241d';
    rr(-62, -36, 124, 72, 8);
    ctx.fill();
    ctx.fillStyle = '#352a20';
    rr(-56, -30, 112, 58, 4);
    ctx.fill();

    // roof
    ctx.fillStyle = '#241d18';
    ctx.beginPath();
    ctx.moveTo(-74, -46);
    ctx.lineTo(74, -46);
    ctx.lineTo(58, 4);
    ctx.lineTo(-58, 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,92,62,0.24)';
    ctx.lineWidth = 1;
    for (let i = -64; i <= 64; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, -42);
      ctx.lineTo(i * 0.78, 1);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(150,116,76,0.3)';
    ctx.beginPath();
    ctx.moveTo(-68, -42);
    ctx.lineTo(68, -42);
    ctx.stroke();

    // chimney
    ctx.fillStyle = '#3f3328';
    ctx.fillRect(34, -57, 13, 20);
    ctx.fillStyle = 'rgba(160,130,95,0.18)';
    ctx.fillRect(34, -57, 13, 3);

    // windows
    const warm = st.owned;
    ctx.fillStyle = warm ? '#f0ad5d' : '#4a3b2b';
    ctx.fillRect(-42, -16, 18, 14);
    ctx.fillRect(26, -16, 18, 14);
    ctx.strokeStyle = '#1b1511';
    ctx.lineWidth = 2;
    ctx.strokeRect(-42, -16, 18, 14);
    ctx.strokeRect(26, -16, 18, 14);
    ctx.beginPath();
    ctx.moveTo(-33, -16); ctx.lineTo(-33, -2);
    ctx.moveTo(35, -16); ctx.lineTo(35, -2);
    ctx.stroke();

    // door
    ctx.fillStyle = '#1c1713';
    ctx.fillRect(-12, 17, 24, 21);
    ctx.fillStyle = 'rgba(239,182,97,0.32)';
    ctx.fillRect(-9, 20, 18, 1);

    // fire pit
    const pulse = Math.sin(game.time * 8.5 + s.x) * 0.5 + 0.5;
    ctx.fillStyle = '#2f2419';
    ctx.beginPath();
    ctx.ellipse(0, 55, 15, 8, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#6b4b2c';
    ctx.fillRect(-11, 52, 22, 4);
    ctx.fillStyle = warm ? '#e78c3f' : 'rgba(231,140,63,0.42)';
    ctx.beginPath();
    ctx.moveTo(-7, 52);
    ctx.quadraticCurveTo(-4, 38 - pulse * 3, 1, 30 - pulse * 2);
    ctx.quadraticCurveTo(5, 42, 8, 52);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = warm ? '#ffd490' : 'rgba(255,212,144,0.4)';
    ctx.beginPath();
    ctx.moveTo(-2, 52);
    ctx.quadraticCurveTo(1, 42 - pulse * 2, 3, 38 - pulse * 2);
    ctx.quadraticCurveTo(5, 46, 5, 52);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

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
    if (near) {
      ctx.font = '600 11px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = active ? 'rgba(244,210,154,0.92)' : st.haunt >= 2 ? 'rgba(240,139,114,0.75)' : 'rgba(239,228,207,0.52)';
      ctx.fillText(s.name.toUpperCase(), s.x, s.y - 66);
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
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(2,5,4,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 14 * size, 13 * size, 6 * size, 0, 0, TAU);
    ctx.fill();
    const leg = Math.sin(walk) * 4;
    ctx.strokeStyle = '#1d2522';
    ctx.lineWidth = 4 * size;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4 * size, 7 * size);
    ctx.lineTo(-4 * size + leg, 16 * size);
    ctx.moveTo(4 * size, 7 * size);
    ctx.lineTo(4 * size - leg, 16 * size);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 1, 9 * size, 12 * size, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(239,228,207,0.18)';
    ctx.beginPath();
    ctx.ellipse(-2 * size, -2 * size, 4 * size, 6 * size, 0.3, 0, TAU);
    ctx.fill();
    // gun arm
    ctx.save();
    ctx.rotate(angle);
    ctx.strokeStyle = '#1d2522';
    ctx.lineWidth = 3.5 * size;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(15 * size, 2);
    ctx.stroke();
    ctx.fillStyle = '#3b4642';
    ctx.fillRect(13 * size, -1 * size, 10 * size, 3 * size);
    ctx.restore();
    // head
    ctx.fillStyle = '#caa27d';
    ctx.beginPath();
    ctx.arc(0, -10 * size, 6 * size, 0, TAU);
    ctx.fill();
    if (opts.hat) {
      ctx.fillStyle = opts.hat;
      ctx.beginPath();
      ctx.ellipse(0, -14 * size, 9 * size, 3.4 * size, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -15.5 * size, 4.5 * size, 0, TAU);
      ctx.fill();
    }
    // lantern
    if (opts.lantern) {
      ctx.fillStyle = 'rgba(248,180,90,0.28)';
      ctx.beginPath();
      ctx.arc(-12 * size, 1 * size, 9 * size, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffd08a';
      ctx.beginPath();
      ctx.arc(-12 * size, 1 * size, 2.6 * size, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPlayer() {
    const blink = player.invuln > 0 && Math.floor(game.time * 22) % 2 === 0;
    ctx.save();
    ctx.globalAlpha = blink ? 0.55 : 1;
    ctx.translate(player.x, player.y);
    ctx.fillStyle = 'rgba(2,5,4,0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 15, 15, 7, 0, 0, TAU);
    ctx.fill();
    const leg = Math.sin(player.walk) * 4.5;
    ctx.strokeStyle = '#1a211e';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, 7);
    ctx.lineTo(-4 + leg, 17);
    ctx.moveTo(4, 7);
    ctx.lineTo(4 - leg, 17);
    ctx.stroke();
    // coat
    ctx.fillStyle = '#3c514c';
    ctx.beginPath();
    ctx.ellipse(0, 1, 10, 13, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#4c6660';
    ctx.beginPath();
    ctx.ellipse(-2, -1, 5, 7, 0.25, 0, TAU);
    ctx.fill();
    // lantern
    ctx.fillStyle = 'rgba(248,180,90,0.3)';
    ctx.beginPath();
    ctx.arc(-13, 2, 10, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffd08a';
    ctx.beginPath();
    ctx.arc(-13, 2, 2.8, 0, TAU);
    ctx.fill();
    // gun arm
    ctx.save();
    ctx.rotate(player.aim);
    ctx.strokeStyle = '#27322d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(17, 2);
    ctx.stroke();
    ctx.fillStyle = '#4b5751';
    ctx.fillRect(15, -1.5, 12, 4);
    ctx.fillStyle = '#8c7a5e';
    ctx.fillRect(23, -1, 4, 2.5);
    ctx.restore();
    // head + hat
    ctx.fillStyle = '#d0a77f';
    ctx.beginPath();
    ctx.arc(0, -10, 6.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2c3a35';
    ctx.beginPath();
    ctx.ellipse(0, -14.5, 9.5, 3.6, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -16, 4.6, 0, TAU);
    ctx.fill();
    if (player.hitFlash > 0) {
      ctx.fillStyle = `rgba(255,90,70,${player.hitFlash * 2.2})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 18, 0, 0, TAU);
      ctx.fill();
    }
    if (game.muzzle > 0) {
      const mx = Math.cos(player.aim) * 29;
      const my = Math.sin(player.aim) * 29;
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(player.aim);
      ctx.fillStyle = 'rgba(255,210,130,0.95)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(9, -4);
      ctx.lineTo(5, 0);
      ctx.lineTo(9, 4);
      ctx.closePath();
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
      lantern: c.state === 'wild'
    });
    if (c.hitFlash > 0) {
      ctx.fillStyle = `rgba(255,120,90,${c.hitFlash * 1.8})`;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y - 1, 13, 17, 0, 0, TAU);
      ctx.fill();
    }
    // labels and small hp bar
    const show = c.state !== 'team' || dist(player.x, player.y, c.x, c.y) < 520;
    if (show) {
      ctx.font = '600 9px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = c.state === 'wild' ? 'rgba(244,210,154,0.85)' : 'rgba(199,188,170,0.72)';
      ctx.fillText(c.name.toUpperCase(), c.x, c.y - 26);
      if (c.state === 'wild') {
        const bob = Math.sin(game.time * 2.4 + c.seed) * 2;
        ctx.fillStyle = 'rgba(239,182,97,0.8)';
        ctx.beginPath();
        ctx.moveTo(c.x, c.y - 43 + bob);
        ctx.lineTo(c.x + 5, c.y - 36 + bob);
        ctx.lineTo(c.x, c.y - 29 + bob);
        ctx.lineTo(c.x - 5, c.y - 36 + bob);
        ctx.closePath();
        ctx.fill();
        ctx.font = 'italic 9px Georgia, serif';
        ctx.fillStyle = 'rgba(239,182,97,0.58)';
        ctx.fillText(ROLES[c.role].label.toUpperCase(), c.x, c.y - 18);
      }
      if (c.hp < c.maxHp) {
        ctx.fillStyle = 'rgba(4,8,7,0.6)';
        ctx.fillRect(c.x - 12, c.y - 22, 24, 2.5);
        ctx.fillStyle = c.hp / c.maxHp > 0.3 ? '#8fb98f' : '#d5533f';
        ctx.fillRect(c.x - 12, c.y - 22, 24 * (c.hp / c.maxHp), 2.5);
      }
    }
    ctx.restore();
  }

  function drawEnemy(e) {
    if (e.dead) return;
    const def = ENEMY_TYPES[e.type];
    const wob = Math.sin(game.time * 4 + e.seed);
    const s = e.type === 'brute' ? 1.35 : e.type === 'crawler' ? 0.78 : 1;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.fillStyle = 'rgba(2,4,4,0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 12 * s, 12 * s, 5.5 * s, 0, 0, TAU);
    ctx.fill();
    if (e.type === 'wraith') {
      ctx.globalAlpha = 0.78 + wob * 0.08;
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.moveTo(-9, 8);
      ctx.quadraticCurveTo(-14 + wob * 2, -8, 0, -18);
      ctx.quadraticCurveTo(14 + wob * 2, -8, 9, 8);
      ctx.quadraticCurveTo(4, 14, 0, 8);
      ctx.quadraticCurveTo(-4, 14, -9, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(150,95,190,0.35)';
      ctx.lineWidth = 1.2;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 4, 4);
        ctx.quadraticCurveTo(i * 7 + wob * 3, 14, i * 5, 18);
        ctx.stroke();
      }
    } else {
      const leg = Math.sin(game.time * 7 + e.seed) * 3;
      ctx.strokeStyle = '#160f12';
      ctx.lineWidth = 3.4 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-3 * s, 5 * s);
      ctx.lineTo(-3 * s + leg, 13 * s);
      ctx.moveTo(3 * s, 5 * s);
      ctx.lineTo(3 * s - leg, 13 * s);
      ctx.stroke();
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 8.5 * s, 12 * s, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.moveTo(-4 * s, -2);
      ctx.lineTo(-12 * s, 5 + wob * 2);
      ctx.moveTo(4 * s, -2);
      ctx.lineTo(12 * s, 5 - wob * 2);
      ctx.stroke();
      ctx.fillStyle = '#1c1416';
      ctx.beginPath();
      ctx.arc(0, -10 * s, 5.4 * s, 0, TAU);
      ctx.fill();
    }
    // eyes
    const ex = 2.2 * s;
    const ey = -10 * s;
    ctx.fillStyle = def.eye;
    ctx.shadowColor = def.eye;
    ctx.shadowBlur = 7;
    ctx.beginPath();
    ctx.arc(-ex, ey, 1.5 * s, 0, TAU);
    ctx.arc(ex, ey + 0.5, 1.5 * s, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (e.hitFlash > 0) {
      ctx.fillStyle = `rgba(255,230,210,${e.hitFlash * 3})`;
      ctx.beginPath();
      ctx.ellipse(0, -2, 11 * s, 15 * s, 0, 0, TAU);
      ctx.fill();
    }
    if (e.hp < e.maxHp) {
      ctx.fillStyle = 'rgba(4,6,8,0.7)';
      ctx.fillRect(-11, -22 * s, 22, 2.5);
      ctx.fillStyle = '#b5493d';
      ctx.fillRect(-11, -22 * s, 22 * clamp(e.hp / e.maxHp, 0, 1), 2.5);
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

    // enemy eyes and wraith fire
    for (const e of game.enemies) {
      if (e.dead) continue;
      const def = ENEMY_TYPES[e.type];
      const sz = e.type === 'brute' ? 2.6 : e.type === 'crawler' ? 1.5 : 2;
      radialGlow(e.x, e.y - 10, 9, '255,80,52', e.type === 'wraith' ? 0.25 : 0.5);
      ctx.fillStyle = def.eye;
      ctx.shadowColor = def.eye;
      ctx.shadowBlur = 9;
      ctx.beginPath();
      ctx.arc(e.x - 2.2, e.y - 10, sz * 0.75, 0, TAU);
      ctx.arc(e.x + 2.2, e.y - 10, sz * 0.75, 0, TAU);
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

    // enemies
    for (const e of game.enemies) {
      if (e.dead) continue;
      mm.fillStyle = e.type === 'wraith' ? 'rgba(199,123,255,0.8)' : 'rgba(221,87,67,0.72)';
      mm.beginPath();
      mm.arc(mx(e.x), my(e.y), 1.2, 0, TAU);
      mm.fill();
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
    const dt = Math.min(0.05, Math.max(0.001, (now - lastFrame) / 1000));
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
     Init
  --------------------------------------------------------------------- */
  function init() {
    buildWorld();
    resetRun();
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
