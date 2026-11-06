
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
