import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

export function createBattlefield(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#71775c');
  scene.fog = new THREE.Fog('#71775c', 125, 230);
  const camera = new THREE.OrthographicCamera(-50, 50, 50, -50, .1, 300);
  camera.up.set(0, 0, -1);
  camera.position.set(0, 120, 60);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight('#e4e6c6', '#353b2d', 2.05));
  const sun = new THREE.DirectionalLight('#fff0cb', 3.1);
  sun.position.set(-38, 70, -28); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -80; sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80; sun.shadow.camera.bottom = -80;
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#b4c6ce', .8); fill.position.set(30, 35, 40); scene.add(fill);

  const entityRoot = new THREE.Group(); scene.add(entityRoot);
  const resourceRoot = new THREE.Group(); scene.add(resourceRoot);
  const transientRoot = new THREE.Group(); scene.add(transientRoot);
  const entities = new Map(), nodes = [], decor = [];
  let aspect = 1, currentZoom = 1, transientKey = '';

  const materials = new Map();
  function mat(color, roughness = .78, metalness = .08) {
    const key = `${color}:${roughness}:${metalness}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
    return materials.get(key);
  }
  function basic(color, opacity = 1) {
    return new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, side: THREE.DoubleSide });
  }
  function box(parent, name, size, pos, material, cast = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.name = name; mesh.position.set(...pos); mesh.castShadow = cast; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function cylinder(parent, name, radiusTop, radiusBottom, height, pos, material, segments = 12) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
    mesh.name = name; mesh.position.set(...pos); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function position(obj, x, y, lift = 0) {
    obj.position.set((x - .5) * 100 * aspect, lift, (y - .5) * 100);
  }
  function makeGround() {
    const texture = makeTerrainTexture();
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ map: texture, color: '#b0aa7c', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.scale.x = aspect; ground.receiveShadow = true; ground.name = 'terrain'; scene.add(ground);
    const lines = new THREE.Group();
    const points = [[-53, -43], [-28, -24], [-8, -8], [12, 12], [30, 28], [53, 44]];
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, z1] = points[i], [x2, z2] = points[i + 1];
      const dx = x2 - x1, dz = z2 - z1, length = Math.hypot(dx, dz), angle = Math.atan2(-dx, dz);
      const road = new THREE.Mesh(new THREE.BoxGeometry(8.5, .15, length + 1), mat('#615d4b', 1, 0));
      road.position.set((x1 + x2) / 2, .03, (z1 + z2) / 2); road.rotation.y = angle; road.receiveShadow = true; lines.add(road);
      const track = new THREE.Mesh(new THREE.BoxGeometry(.14, .025, length), basic('#b9aa78', .42));
      track.position.set((x1 + x2) / 2, .12, (z1 + z2) / 2); track.rotation.y = angle; lines.add(track);
    }
    scene.add(lines);
    for (let i = 0; i < 17; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(.55 + (i % 3) * .22, 0), mat(i % 2 ? '#6d6a56' : '#81785e'));
      rock.position.set(Math.sin(i * 17.3) * 47 * aspect, .22, Math.cos(i * 8.7) * 44); rock.scale.set(1.4, .55, .9); rock.rotation.y = i; rock.castShadow = true; scene.add(rock);
    }
  }
  makeGround();

  function resize() {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    aspect = w / h;
    renderer.setSize(w, h, false);
    camera.left = -50 * aspect / currentZoom; camera.right = 50 * aspect / currentZoom;
    camera.top = 50 / currentZoom; camera.bottom = -50 / currentZoom; camera.updateProjectionMatrix();
    const ground = scene.getObjectByName('terrain'); if (ground) ground.scale.x = aspect;
  }
  function buildEntity(entity, faction) {
    const group = new THREE.Group(), model = new THREE.Group(); group.add(model);
    const friendly = entity.team === 'blue';
    const palettes = {
      usa: { primary: '#587e91', light: '#a9bdac', dark: '#303b3b', trim: '#d3b86e' },
      china: { primary: '#a6473b', light: '#d79552', dark: '#422f2b', trim: '#e5c27b' },
      russia: { primary: '#66764f', light: '#b9a966', dark: '#363c32', trim: '#d7bd75' }
    };
    const p = friendly ? (palettes[faction] || palettes.usa) : { primary: '#794438', light: '#b87654', dark: '#39342e', trim: '#d17b4d' };
    const primary = mat(p.primary), light = mat(p.light), dark = mat(p.dark), trim = mat(p.trim, .42, .35), glass = mat('#263b3b', .25, .28);
    const metal = mat('#4c5146', .4, .48);
    if (entity.kind === 'hq') {
      box(model, 'command foundation', [14, 1, 12], [0, .52, 0], dark);
      box(model, 'command block', [10.5, 4.2, 8], [0, 2.6, 0], primary);
      box(model, 'command roof', [11.5, .8, 8.8], [0, 5, 0], light);
      box(model, 'command wing', [5, 2.5, 5], [-4.3, 1.8, 2.6], dark);
      box(model, 'command glass', [3.2, 1.4, .12], [0, 3.3, -4.06], glass);
      box(model, 'command stripe', [1.1, 3.2, .18], [4.1, 2.6, -4.12], trim);
      cylinder(model, 'antenna', .09, .12, 3.2, [-5, 6.3, -2.5], metal, 8);
      box(model, 'antenna flag', [.9, .45, .08], [-4.6, 7.3, -2.5], trim);
    } else if (entity.kind === 'refinery') {
      box(model, 'refinery foundation', [13, .8, 10], [0, .42, 0], dark);
      box(model, 'refinery hall', [8, 3.5, 7], [-1.6, 2.3, 0], primary);
      box(model, 'refinery roof', [8.8, .65, 7.8], [-1.6, 4.35, 0], light);
      for (let i = 0; i < 2; i++) {
        cylinder(model, 'supply silo', 1.65, 1.85, 5.2, [4.25, 3.05, -2 + i * 4], metal, 14);
        cylinder(model, 'silo cap', 1.7, 1.7, .45, [4.25, 5.85, -2 + i * 4], trim, 14);
        box(model, 'silo band', [3.5, .26, .26], [4.25, 3.5, -2 + i * 4], light);
      }
      box(model, 'loading bay', [3.3, 2.5, .2], [-1.5, 1.75, -3.62], dark);
      box(model, 'loading light', [1.4, .22, .2], [-1.5, 3.5, -3.72], trim);
    } else if (entity.kind === 'power') {
      box(model, 'power foundation', [9, .7, 8], [0, .35, 0], dark);
      box(model, 'power hall', [6.8, 3.8, 5.8], [0, 2.25, 0], primary);
      box(model, 'power roof', [7.6, .65, 6.6], [0, 4.4, 0], light);
      for (let i = -1; i <= 1; i++) cylinder(model, 'cooling stack', .5, .72, 3.6, [i * 2.3, 2.2, 3.2], metal, 10);
      box(model, 'power insignia', [2.4, .15, .12], [0, 3, -2.98], trim);
    } else if (entity.kind === 'tech') {
      box(model, 'research foundation', [12, .8, 10], [0, .4, 0], dark);
      box(model, 'research hall', [8.5, 4.2, 7], [0, 2.5, 0], primary);
      box(model, 'research roof', [9.3, .7, 7.8], [0, 4.95, 0], light);
      cylinder(model, 'radar mast', .2, .28, 4.2, [0, 7, 0], metal, 8);
      const dish = new THREE.Mesh(new THREE.SphereGeometry(1.7, 12, 8, 0, Math.PI * 2, 0, Math.PI * .55), trim);
      dish.position.set(0, 8.5, 0); dish.rotation.x = Math.PI; model.add(dish);
      box(model, 'research entrance', [2.4, 2.8, .18], [0, 1.8, -3.58], dark);
    } else if (entity.kind === 'barracks' || entity.kind === 'factory') {
      const factory = entity.kind === 'factory';
      box(model, 'production foundation', [factory ? 13 : 11, .8, factory ? 10 : 9], [0, .4, 0], dark);
      box(model, 'production hall', [factory ? 10 : 8.5, 4, factory ? 7.5 : 6.5], [0, 2.5, 0], primary);
      box(model, 'production roof', [factory ? 11 : 9.5, .65, factory ? 8.4 : 7.4], [0, 4.85, 0], light);
      box(model, 'garage door', [factory ? 5 : 3.8, 3, .18], [0, 2, -(factory ? 3.85 : 3.35)], dark);
      box(model, 'door stripe', [factory ? 5 : 3.8, .26, .22], [0, 3.2, -(factory ? 3.98 : 3.48)], trim);
      for (let i = -1; i <= 1; i++) box(model, 'roof vent', [1.1, .6, .8], [i * 2.4, 5.45, 1.5], metal);
    } else if (entity.kind === 'defense') {
      cylinder(model, 'defense base', 4.4, 4.8, 1, [0, .5, 0], dark, 12);
      cylinder(model, 'turret ring', 3.2, 3.2, .8, [0, 1.3, 0], trim, 12);
      const turret = new THREE.Group(); turret.name = 'turret'; turret.position.y = 2; model.add(turret);
      box(turret, 'turret housing', [4.5, 2, 4], [0, 0, 0], primary);
      cylinder(turret, 'gun barrel', .34, .42, 5.6, [0, .35, -3.5], metal, 10).rotation.x = Math.PI / 2;
      box(turret, 'turret hatch', [1.7, .25, 1.7], [0, 1.15, 0], light);
    } else if (entity.kind === 'infantry') {
      for (let i = 0; i < 4; i++) {
        const soldier = new THREE.Group(); soldier.position.set((i % 2 ? 1 : -1) * .75, 0, (i < 2 ? -1 : 1) * .72); model.add(soldier);
        cylinder(soldier, 'boots', .34, .4, .35, [0, .22, 0], dark, 7);
        box(soldier, 'uniform', [.65, 1.05, .55], [0, .95, 0], primary);
        const head = new THREE.Mesh(new THREE.SphereGeometry(.31, 8, 7), light); head.position.set(0, 1.72, 0); head.castShadow = true; soldier.add(head);
        box(soldier, 'rifle', [.16, .15, 1.35], [.35, 1.05, -.68], metal);
      }
    } else {
      const collector = entity.kind === 'collector';
      const scout = entity.kind === 'scout';
      const vehicle = new THREE.Group(); vehicle.name = 'vehicle'; model.add(vehicle);
      if (collector) {
        box(vehicle, 'truck chassis', [5.4, 1, 9.2], [0, .8, 0], dark);
        box(vehicle, 'truck cab', [4.5, 2.6, 3.4], [0, 2.2, -2.3], primary);
        box(vehicle, 'truck windshield', [3.6, 1.3, .12], [0, 2.45, -4.02], glass);
        box(vehicle, 'ore hopper', [4.5, 1.8, 4.5], [0, 2, 2.2], mat('#756a49'));
        box(vehicle, 'hopper cargo', [3.4, .8, 3.3], [0, 3, 2.2], mat('#a88748', .55, .25));
        for (const x of [-2.7, 2.7]) for (const z of [-2.8, 2.8]) cylinder(vehicle, 'truck wheel', .95, .95, .55, [x, .72, z], dark, 10).rotation.z = Math.PI / 2;
      } else {
        box(vehicle, 'vehicle hull', [scout ? 4.8 : 6, 1.4, scout ? 7.2 : 9.2], [0, 1.1, 0], primary);
        box(vehicle, 'vehicle deck', [scout ? 4.1 : 5, .7, scout ? 4.6 : 6.1], [0, 2.05, .1], light);
        for (const x of [-1, 1]) box(vehicle, 'track', [1, 1, scout ? 7 : 9.5], [x * (scout ? 2.65 : 3.2), .75, 0], dark);
        const turret = new THREE.Group(); turret.name = 'turret'; turret.position.set(0, 2.5, -.2); vehicle.add(turret);
        if (scout) box(turret, 'scout cabin', [2.5, 1.3, 2.5], [0, .3, 0], primary);
        else cylinder(turret, 'tank turret', 1.8, 2.1, 1.3, [0, .2, 0], primary, 10);
        box(turret, 'main gun', [.42, .42, scout ? 3.6 : 6.2], [0, .35, -3], metal);
      }
    }
    if (friendly && faction === 'usa' && entity.kind === 'hq') {
      const radar = new THREE.Group(); radar.position.set(5.3, 5.2, 1.8); model.add(radar);
      cylinder(radar, 'radar mount', .18, .24, 1.6, [0, .8, 0], metal, 8);
      const dish = new THREE.Mesh(new THREE.SphereGeometry(1.05, 10, 7, 0, Math.PI * 2, 0, Math.PI * .55), trim); dish.position.y = 1.7; dish.rotation.x = Math.PI; radar.add(dish);
    } else if (friendly && faction === 'china' && ['hq','barracks','tech'].includes(entity.kind)) {
      for (const x of [-4.3, 4.3]) {
        cylinder(model, 'red standard pole', .09, .12, 4, [x, 2.2, 2.8], trim, 7);
        box(model, 'red standard', [1.35, .9, .08], [x + .58, 3.4, 2.8], primary);
      }
    } else if (friendly && faction === 'russia' && ['hq','factory','tech'].includes(entity.kind)) {
      for (const x of [-4.1, 4.1]) box(model, 'reinforced armor plate', [1.5, 2.2, 1.1], [x, 1.5, 2.4], metal);
      cylinder(model, 'exhaust stack', .28, .42, 2.1, [4.1, 4.3, -2.7], dark, 8);
    }
    if (friendly && entity.kind === 'infantry' && faction === 'china') {
      box(model, 'field pack', [.55, .8, .45], [0, 1.2, .48], trim);
      box(model, 'rifle stock', [.22, .2, .8], [.35, 1.05, -1.35], primary);
    } else if (friendly && entity.kind === 'infantry' && faction === 'russia') {
      for (const x of [-.9, .9]) box(model, 'reinforced shoulder', [.5, .42, .55], [x, 1.45, 0], trim);
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(.8, 1, 36), basic(friendly ? '#d9f17d' : '#e36c51', .92));
    ring.rotation.x = -Math.PI / 2; ring.position.y = .12; ring.name = 'selection-ring'; group.add(ring);
    const health = new THREE.Group(); health.name = 'health';
    const barWidth = entity.kind === 'hq' || entity.kind === 'refinery' || entity.kind === 'factory' ? 8 : 4.2;
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(barWidth, .48), basic('#1c211c', .9)); bg.rotation.x = -Math.PI / 2; bg.position.y = entity.kind === 'infantry' ? 3.5 : 8.5; health.add(bg);
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(barWidth, .3), basic(friendly ? p.trim : '#e16e54')); fill.rotation.x = -Math.PI / 2; fill.position.set(-barWidth / 2, bg.position.y + .02, 0); fill.name = 'health-fill'; health.add(fill); health.userData.width = barWidth; group.add(health);
    group.userData = { kind: entity.kind, faction, model, selection: ring, health, healthFill: fill };
    return group;
  }

  function render(frame) {
    currentZoom = frame.camera.z;
    resize();
    const centerX = (frame.camera.x - .5) * 100 * aspect;
    const centerZ = (frame.camera.y - .5) * 100;
    camera.position.set(centerX, 120, centerZ + 60);
    camera.lookAt(centerX, 0, centerZ);
    camera.rotation.z = 0;
    camera.left = -50 * aspect / currentZoom; camera.right = 50 * aspect / currentZoom;
    camera.top = 50 / currentZoom; camera.bottom = -50 / currentZoom; camera.updateProjectionMatrix();

    const live = new Set();
    for (const entity of [...frame.buildings, ...frame.units, ...frame.enemies]) {
      live.add(entity.id);
      let obj = entities.get(entity.id);
      if (!obj || obj.userData.kind !== entity.kind || obj.userData.faction !== frame.faction) {
        if (obj) { entityRoot.remove(obj); disposeTree(obj); }
        obj = buildEntity(entity, frame.faction); entities.set(entity.id, obj); entityRoot.add(obj);
      }
      const scale = entity.size ? Math.max(.35, entity.size / 70) : Math.max(.85, entity.radius / 7);
      position(obj, entity.x, entity.y);
      obj.scale.setScalar(scale);
      obj.rotation.y = Math.atan2(frame.camera.x - entity.x, frame.camera.y - entity.y);
      obj.visible = entity.hp > 0;
      obj.userData.selection.visible = entity === frame.selected;
      obj.userData.selection.scale.setScalar(entity.size ? 1 : .6);
      obj.userData.selection.material.opacity = entity.team === 'blue' ? .9 : .65;
      obj.userData.model.rotation.y = entity.target ? Math.atan2(entity.target.x - entity.x, entity.target.y - entity.y) - obj.rotation.y : 0;
      obj.userData.health.visible = entity.hp < entity.max;
      const ratio = Math.max(0, Math.min(1, entity.hp / entity.max));
      obj.userData.healthFill.scale.x = ratio;
      obj.userData.healthFill.position.x = -(obj.userData.health.userData.width * (1 - ratio)) / 2;
      const hopper = obj.getObjectByName('ore hopper');
      if (hopper) hopper.material = entity.carry > 0 ? mat('#b6944d') : mat('#756a49');
      const vehicle = obj.userData.model.getObjectByName('vehicle');
      if (vehicle) vehicle.position.y = entity.kind === 'collector' && entity.harvesting ? Math.sin(frame.time * 2.5) * .08 : 0;
    }
    for (const [id, obj] of entities) if (!live.has(id)) { entityRoot.remove(obj); disposeTree(obj); entities.delete(id); }
    syncResources(frame);
    syncEffects(frame);
    let ghost = scene.getObjectByName('placement-preview');
    if (frame.placement) {
      if (!ghost) {
        ghost = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 8), new THREE.MeshBasicMaterial({ color: '#c8f05b', wireframe: true, transparent: true, opacity: .8 }));
        ghost.name = 'placement-preview'; scene.add(ghost);
      }
      const pointer = frame.pointer || { x: .5, y: .5 };
      position(ghost, pointer.x, pointer.y, 2); ghost.visible = true;
    } else if (ghost) ghost.visible = false;
    renderer.render(scene, camera);
  }

  function syncResources(frame) {
    while (nodes.length > frame.nodes.length) resourceRoot.remove(nodes.pop());
    while (nodes.length < frame.nodes.length) {
      const group = new THREE.Group();
      cylinder(group, 'supply mound', 1.4, 1.9, .45, [0, .18, 0], mat('#514936'), 7);
      for (let i = 0; i < 6; i++) {
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(.65 + (i % 3) * .15, 0), mat(i % 2 ? '#c29c4d' : '#f0d477', .35, .3));
        crystal.position.set(Math.cos(i * 1.05) * .82, .65 + (i % 3) * .22, Math.sin(i * 1.05) * .72); crystal.castShadow = true; group.add(crystal);
      }
      const ring = new THREE.Mesh(new THREE.RingGeometry(2.35, 2.5, 28), basic('#e5c773', .42)); ring.rotation.x = -Math.PI / 2; ring.position.y = .05; group.add(ring);
      nodes.push(group); resourceRoot.add(group);
    }
    frame.nodes.forEach((node, i) => { const group = nodes[i]; position(group, node.x, node.y); group.visible = node.active; group.scale.setScalar(node.active ? .45 + .55 * Math.min(1, node.amount / 900) : .001); });
    while (decor.length > frame.decor.length) resourceRoot.remove(decor.pop());
    while (decor.length < frame.decor.length) {
      const item = frame.decor[decor.length], group = new THREE.Group();
      if (item.kind === 'bush') {
        const green = mat(item.tone > .5 ? '#566346' : '#414f3d');
        for (let j = 0; j < 3; j++) {
          const shrub = new THREE.Mesh(new THREE.IcosahedronGeometry(.45 + j * .12, 1), green);
          shrub.position.set((j - 1) * .42, .42 + (j % 2) * .1, (j % 2) * .28); shrub.scale.y = .62; shrub.castShadow = true; group.add(shrub);
        }
      } else {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(.5, 0), mat(item.tone > .5 ? '#77705c' : '#615e50'));
        rock.scale.set(1.2, .62, .8); rock.position.y = .27; rock.rotation.set(item.rot, item.rot * .7, item.rot * .3); rock.castShadow = true; group.add(rock);
      }
      group.scale.setScalar(Math.max(.45, item.r / 10)); position(group, item.x, item.y); decor.push(group); resourceRoot.add(group);
    }
  }

  function syncEffects(frame) {
    const key = `${frame.shots.length}:${frame.particles.length}:${Math.floor(frame.time * 10)}`;
    if (transientKey === key) return;
    transientKey = key;
    while (transientRoot.children.length) {
      const child = transientRoot.children[0]; transientRoot.remove(child); disposeTree(child);
    }
    for (const shot of frame.shots) {
      if (!shot.target) continue;
      const t = 1 - shot.life / shot.max;
      const a = new THREE.Vector3((shot.x - .5) * 100 * aspect, .72, (shot.y - .5) * 100);
      const b = new THREE.Vector3((shot.x + (shot.target.x - shot.x) * t - .5) * 100 * aspect, .72, (shot.y + (shot.target.y - shot.y) * t - .5) * 100);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, a.distanceTo(b), 5), basic(shot.color));
      beam.position.copy(a).add(b).multiplyScalar(.5); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize()); transientRoot.add(beam);
    }
    for (const particle of frame.particles) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(.35 + (1 - particle.life / particle.max) * 1.7, 8, 6), basic(particle.color, Math.max(.12, particle.life / particle.max)));
      position(mesh, particle.x, particle.y, .8); transientRoot.add(mesh);
    }
  }

  function makeTerrainTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#777451'; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 18000; i++) {
      const v = Math.random(); ctx.globalAlpha = .05 + Math.random() * .14;
      ctx.fillStyle = v > .72 ? '#9a906b' : v > .36 ? '#66694a' : '#4e5941';
      const r = 1 + Math.random() * 5; ctx.beginPath(); ctx.ellipse(Math.random() * 512, Math.random() * 512, r * 2.2, r, Math.random() * 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 18; i++) { ctx.strokeStyle = i % 2 ? '#bcb08020' : '#343d2c20'; ctx.lineWidth = 9 + Math.random() * 16; ctx.beginPath(); ctx.moveTo(-20, i * 31); ctx.bezierCurveTo(120, i * 31 - 24, 320, i * 31 + 48, 540, i * 31 - 12); ctx.stroke(); }
    const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.anisotropy = 4; return texture;
  }

  function disposeTree(root) {
    root.traverse(obj => { if (obj.geometry) obj.geometry.dispose(); });
  }
  resize();
  return { render, resize };
}
