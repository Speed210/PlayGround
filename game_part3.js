
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
