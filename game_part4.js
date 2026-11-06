
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
