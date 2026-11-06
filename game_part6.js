
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
