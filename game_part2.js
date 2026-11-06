
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
