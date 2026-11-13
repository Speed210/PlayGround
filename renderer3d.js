import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

export function createBattlefield(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const WORLD = 160;
  const HALF_WORLD = WORLD / 2;
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

  const entityRoot = new THREE.Group(); entityRoot.renderOrder = 3; scene.add(entityRoot);
  const fogCanvas = document.createElement('canvas'); fogCanvas.width = fogCanvas.height = 128;
  const fogContext = fogCanvas.getContext('2d');
  const fogPixels = fogContext.createImageData(128, 128);
  const discovered = new Uint8Array(128 * 128), visibleCells = new Uint8Array(128 * 128);
  const fogTexture = new THREE.CanvasTexture(fogCanvas); fogTexture.colorSpace = THREE.SRGBColorSpace;
  const fogMaterial = new THREE.MeshBasicMaterial({ map: fogTexture, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const fogPlane = new THREE.Mesh(new THREE.PlaneGeometry(WORLD, WORLD), fogMaterial);
  fogPlane.rotation.x = -Math.PI / 2; fogPlane.position.y = .08; fogPlane.renderOrder = 2; scene.add(fogPlane);
  const resourceRoot = new THREE.Group(); scene.add(resourceRoot);
  const transientRoot = new THREE.Group(); scene.add(transientRoot);
  const entities = new Map(), nodes = [], decor = [];
  let aspect = 1, currentZoom = 1, transientKey = '';

  const materials = new Map(), camoMaterials = new Map();
  function mat(color, roughness = .78, metalness = .08) {
    const key = `${color}:${roughness}:${metalness}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
    return materials.get(key);
  }
  function camouflage(base, patches) {
    const key = `${base}:${patches.join(',')}`;
    if (camoMaterials.has(key)) return camoMaterials.get(key);
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 145; i++) {
      const x = Math.random() * 256, y = Math.random() * 256;
      ctx.fillStyle = patches[i % patches.length]; ctx.globalAlpha = .15 + Math.random() * .24;
      ctx.beginPath(); ctx.ellipse(x, y, 5 + Math.random() * 21, 3 + Math.random() * 12, Math.random() * Math.PI, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 1800; i++) {
      ctx.fillStyle = Math.random() > .5 ? '#fff' : '#171a15'; ctx.globalAlpha = Math.random() * .045;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1);
    }
    ctx.globalAlpha = 1;
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(1.6, 1.6); texture.anisotropy = 4;
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: .88, metalness: .04 });
    camoMaterials.set(key, material); return material;
  }
  function basic(color, opacity = 1) {
    return new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, side: THREE.DoubleSide });
  }
  const roundedShape = new THREE.Shape();
  roundedShape.moveTo(-.39, -.5); roundedShape.lineTo(.39, -.5); roundedShape.quadraticCurveTo(.5, -.5, .5, -.39);
  roundedShape.lineTo(.5, .39); roundedShape.quadraticCurveTo(.5, .5, .39, .5); roundedShape.lineTo(-.39, .5);
  roundedShape.quadraticCurveTo(-.5, .5, -.5, .39); roundedShape.lineTo(-.5, -.39); roundedShape.quadraticCurveTo(-.5, -.5, -.39, -.5);
  const roundedUnitGeometry = new THREE.ExtrudeGeometry(roundedShape, { depth: .82, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .09, bevelThickness: .09, curveSegments: 5 });
  roundedUnitGeometry.translate(0, 0, -.41); roundedUnitGeometry.computeBoundingBox();
  function box(parent, name, size, pos, material, cast = true) {
    const geometry = roundedUnitGeometry.clone();
    const bounds = geometry.boundingBox;
    geometry.scale(size[0] / (bounds.max.x - bounds.min.x), size[1] / (bounds.max.y - bounds.min.y), size[2] / (bounds.max.z - bounds.min.z));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name; mesh.position.set(...pos); mesh.castShadow = cast; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function cylinder(parent, name, radiusTop, radiusBottom, height, pos, material, segments = 24) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
    mesh.name = name; mesh.position.set(...pos); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function gableRoof(parent, name, width, height, length, pos, material) {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0); shape.lineTo(width / 2, 0);
    shape.lineTo(width / 2, height * .48); shape.lineTo(0, height);
    shape.lineTo(-width / 2, height * .48); shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .055, bevelThickness: .055 });
    geometry.translate(0, 0, -length / 2);
    const roof = new THREE.Mesh(geometry, material);
    roof.name = name; roof.position.set(...pos); roof.castShadow = true; roof.receiveShadow = true; parent.add(roof); return roof;
  }
  function capsule(parent, name, radius, length, pos, material, axis = 'y') {
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 12), material);
    mesh.name = name; mesh.position.set(...pos);
    if (axis === 'x') mesh.rotation.z = Math.PI / 2;
    if (axis === 'z') mesh.rotation.x = Math.PI / 2;
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function position(obj, x, y, lift = 0) {
    obj.position.set((x - .5) * WORLD * aspect, lift, (y - .5) * WORLD);
  }
  function makeGround() {
    const texture = makeTerrainTexture();
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD, WORLD), new THREE.MeshStandardMaterial({ map: texture, color: '#b0aa7c', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.scale.x = aspect; ground.receiveShadow = true; ground.name = 'terrain'; scene.add(ground);
    const lines = new THREE.Group();
    const points = [[-82, -68], [-48, -42], [-14, -12], [22, 18], [52, 48], [82, 70]];
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
      rock.position.set(Math.sin(i * 17.3) * 75 * aspect, .22, Math.cos(i * 8.7) * 70); rock.scale.set(1.4, .55, .9); rock.rotation.y = i; rock.castShadow = true; scene.add(rock);
    }
  }
  makeGround();

  function resize() {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    aspect = w / h;
    renderer.setSize(w, h, false);
    camera.left = -HALF_WORLD * aspect / currentZoom; camera.right = HALF_WORLD * aspect / currentZoom;
    camera.top = HALF_WORLD / currentZoom; camera.bottom = -HALF_WORLD / currentZoom; camera.updateProjectionMatrix();
    const ground = scene.getObjectByName('terrain'); if (ground) ground.scale.x = aspect;
    fogPlane.scale.x = aspect;
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
    const camoPatches = friendly && faction === 'china' ? ['#744337', '#c18b4d', '#47463a'] : friendly && faction === 'russia' ? ['#394b38', '#8b8456', '#62563e'] : ['#344b4d', '#71816a', '#a09870'];
    const primary = camouflage(p.primary, camoPatches), light = mat(p.light), dark = mat(p.dark), trim = mat(p.trim, .42, .35), glass = mat('#263b3b', .25, .28);
    const metal = mat('#4c5146', .4, .48);
    if (entity.kind === 'hq') {
      box(model, 'command foundation', [14, 1, 12], [0, .52, 0], dark);
      box(model, 'command block', [10.5, 4.2, 8], [0, 2.6, 0], primary);
      gableRoof(model, 'sloped command roof', 11.6, 1.55, 8.9, [0, 4.55, 0], light);
      box(model, 'command wing', [5, 2.5, 5], [-4.3, 1.8, 2.6], dark);
      box(model, 'command glass', [3.2, 1.4, .12], [0, 3.3, -4.06], glass);
      box(model, 'command stripe', [1.1, 3.2, .18], [4.1, 2.6, -4.12], trim);
      for (const side of [-1, 1]) for (const z of [-1.55, 1.25]) {
        box(model, 'armored side window', [.1, .9, 1.35], [side * 5.31, 3.15, z], glass);
        box(model, 'window sill', [.16, .1, 1.5], [side * 5.34, 2.67, z], trim);
      }
      cylinder(model, 'antenna', .09, .12, 3.2, [-5, 6.3, -2.5], metal, 8);
      box(model, 'antenna flag', [.9, .45, .08], [-4.6, 7.3, -2.5], trim);
    } else if (entity.kind === 'refinery') {
      box(model, 'refinery foundation', [13, .8, 10], [0, .42, 0], dark);
      box(model, 'refinery hall', [8, 3.5, 7], [-1.6, 2.3, 0], primary);
      gableRoof(model, 'sloped refinery roof', 8.9, 1.35, 7.9, [-1.6, 4.08, 0], light);
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
      gableRoof(model, 'ventilated power-house roof', 7.7, 1.2, 6.7, [0, 4.18, 0], light);
      for (let i = -1; i <= 1; i++) cylinder(model, 'cooling stack', .5, .72, 4.4, [i * 2.3, 3.8, 3.2], metal, 16);
      for (const x of [-2.1, 2.1]) {
        box(model, 'power-house window', [.72, 1.05, .1], [x, 2.85, -2.96], glass);
        box(model, 'reinforced window sill', [.9, .12, .16], [x, 2.28, -3.02], trim);
      }
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
      gableRoof(model, 'sloped production roof', factory ? 11.2 : 9.7, 1.5, factory ? 8.6 : 7.6, [0, 4.48, 0], light);
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
        const soldier = new THREE.Group();
        soldier.position.set((i % 2 ? 1 : -1) * .82, 0, (i < 2 ? -1 : 1) * .78); model.add(soldier);
        const skin = mat(friendly && faction === 'china' ? '#c59067' : '#b98e6b');
        const clothBase = friendly && faction === 'russia' ? '#55664c' : friendly && faction === 'china' ? '#8b6348' : '#59634d';
        const cloth = camouflage(clothBase, camoPatches);
        const boot = mat('#302f2a'), armor = mat(friendly ? p.primary : '#654334');
        cylinder(soldier, 'neck', .13, .15, .22, [0, 1.48, 0], skin, 8);
        const torso = capsule(soldier, 'field uniform', .29, .46, [0, 1.03, 0], cloth);
        box(soldier, 'plate carrier', [.66, .43, .16], [0, 1.12, -.23], armor);
        box(soldier, 'carrier front panel', [.34, .3, .045], [0, 1.13, -.33], dark);
        for (let pouch = -1; pouch <= 1; pouch++) box(soldier, 'magazine pouch', [.16, .2, .12], [pouch * .2, .99, -.34], trim);
        box(soldier, 'backpack', [.48, .62, .28], [0, 1.15, .31], dark);
        box(soldier, 'shoulder strap', [.1, .62, .09], [-.21, 1.14, -.34], trim).rotation.z = -.25;
        box(soldier, 'shoulder strap', [.1, .62, .09], [.21, 1.14, -.34], trim).rotation.z = .25;
        for (const side of [-1, 1]) {
          const leg = capsule(soldier, 'combat trousers', .145, .36, [side * .19, .39, .02], cloth);
          leg.rotation.x = side * -.05;
          box(soldier, 'knee pad', [.24, .16, .09], [side * .19, .43, -.16], dark);
          capsule(soldier, 'combat boot', .14, .16, [side * .19, .12, -.1], boot, 'z');
          const arm = capsule(soldier, 'uniform sleeve', .13, .35, [side * .43, 1.06, -.06], cloth);
          arm.rotation.z = side * -.2; arm.rotation.x = -.35;
          capsule(soldier, 'elbow pad', .14, .13, [side * .49, .88, -.12], dark, 'x');
          const hand = new THREE.Mesh(new THREE.SphereGeometry(.13, 12, 8), skin);
          hand.position.set(side * .48, .83, -.34); hand.castShadow = true; soldier.add(hand);
        }
        const head = new THREE.Mesh(new THREE.SphereGeometry(.25, 10, 8), skin);
        head.position.set(0, 1.72, -.02); head.castShadow = true; soldier.add(head);
        const helmet = new THREE.Mesh(new THREE.SphereGeometry(.31, 18, 12, 0, Math.PI * 2, 0, Math.PI * .62), friendly && faction === 'china' ? trim : cloth);
        helmet.name = 'composite helmet shell'; helmet.scale.set(1, .9, 1.08); helmet.position.set(0, 1.91, -.02); helmet.castShadow = true; soldier.add(helmet);
        capsule(soldier, 'helmet brim', .08, .42, [0, 1.84, -.04], friendly && faction === 'china' ? trim : cloth, 'x');
        box(soldier, 'helmet insignia', [.12, .12, .04], [0, 1.94, -.29], trim);
        box(soldier, 'eye protection frame', [.4, .11, .08], [0, 1.68, -.235], dark);
        for (const lensX of [-.105, .105]) {
          const lens = new THREE.Mesh(new THREE.SphereGeometry(.075, 12, 8), glass);
          lens.name = 'tactical goggle lens'; lens.scale.set(1, .65, .35); lens.position.set(lensX, 1.68, -.28); soldier.add(lens);
        }
        box(soldier, 'rifle stock', [.15, .16, .42], [.26, 1.18, -.35], dark);
        box(soldier, 'service rifle', [.14, .14, 1.12], [.26, 1.18, -.98], metal);
        cylinder(soldier, 'rifle muzzle', .055, .055, .16, [.26, 1.18, -1.61], dark, 7);
        box(soldier, 'rifle magazine', [.12, .34, .14], [.26, .96, -.87], dark).rotation.x = -.18;
        box(soldier, 'sling', [.06, .48, .06], [.38, .98, -.66], trim).rotation.x = -.45;
        torso.castShadow = true;
      }
    } else {
      const collector = entity.kind === 'collector';
      const scout = entity.kind === 'scout';
      const vehicle = new THREE.Group(); vehicle.name = 'vehicle'; model.add(vehicle);
      if (collector) {
        box(vehicle, 'armored truck chassis', [5.4, .8, 9.4], [0, .78, 0], dark);
        box(vehicle, 'front bumper', [5.1, .32, .35], [0, .88, -4.7], metal);
        box(vehicle, 'truck cab', [4.45, 2.55, 3.6], [0, 2.18, -2.65], primary);
        const cabNose = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), primary); cabNose.name = 'rounded cab nose'; cabNose.scale.set(2.12, .72, .62); cabNose.position.set(0, 1.65, -4.12); cabNose.castShadow = true; vehicle.add(cabNose);
        box(vehicle, 'cab roof', [4.6, .28, 3.5], [0, 3.55, -2.58], light);
        box(vehicle, 'truck windshield', [3.6, 1.15, .12], [0, 2.53, -4.47], glass);
        for (const x of [-1.75, 1.75]) {
          box(vehicle, 'cab side window', [.1, 1.05, 1.55], [x, 2.55, -2.6], glass);
          box(vehicle, 'door handle', [.08, .1, .42], [x * 1.03, 1.95, -1.42], trim);
          box(vehicle, 'headlamp', [.48, .42, .15], [x * .85, 1.2, -4.78], trim);
        }
        box(vehicle, 'ore hopper', [4.7, 1.9, 4.75], [0, 1.95, 2.18], mat('#756a49'));
        box(vehicle, 'hopper cargo', [3.7, .74, 3.65], [0, 3.15, 2.18], mat('#a88748', .55, .25));
        for (const x of [-2.7, 2.7]) for (const z of [-3.35, -.8, 2.65]) {
          cylinder(vehicle, 'truck tire', .82, .82, .58, [x, .78, z], dark, 12).rotation.z = Math.PI / 2;
          cylinder(vehicle, 'wheel hub', .34, .34, .61, [x * 1.01, .78, z], metal, 10).rotation.z = Math.PI / 2;
        }
        box(vehicle, 'exhaust stack', [.25, 1.55, .25], [2.05, 2.25, -.25], metal);
        box(vehicle, 'cargo tie bar', [4.9, .18, .2], [0, 3.05, -.15], trim);
      } else if (scout) {
        box(vehicle, 'recon chassis', [4.5, .72, 7.4], [0, .78, 0], dark);
        const scoutHull = new THREE.Mesh(new THREE.CapsuleGeometry(1.7, 3.05, 5, 16), primary); scoutHull.name = 'rounded scout hull'; scoutHull.rotation.x = Math.PI / 2; scoutHull.scale.set(1, 1, .52); scoutHull.position.set(0, 1.35, .05); scoutHull.castShadow = true; scoutHull.receiveShadow = true; vehicle.add(scoutHull);
        box(vehicle, 'hood armor', [4.25, .48, 2.25], [0, 1.98, -2.12], light);
        box(vehicle, 'windshield', [3.65, 1.02, .12], [0, 2.35, -1.08], glass).rotation.x = -.12;
        box(vehicle, 'roof rack', [3.6, .16, 2.65], [0, 2.96, .3], metal);
        for (const x of [-1, 1]) {
          box(vehicle, 'door armor', [.15, .95, 2.2], [x * 2.25, 1.75, .2], light);
          box(vehicle, 'side glass', [.1, .64, 1.75], [x * 2.34, 2.36, .12], glass);
          box(vehicle, 'headlamp', [.55, .4, .18], [x * 1.55, 1.56, -3.4], trim);
          for (const z of [-2.45, 2.35]) {
            cylinder(vehicle, 'off-road tire', .82, .82, .5, [x * 2.17, .78, z], dark, 12).rotation.z = Math.PI / 2;
            cylinder(vehicle, 'wheel hub', .34, .34, .54, [x * 2.18, .78, z], metal, 10).rotation.z = Math.PI / 2;
          }
        }
        const turret = new THREE.Group(); turret.name = 'turret'; turret.position.set(0, 2.9, .4); vehicle.add(turret);
        box(turret, 'weapon ring', [2.4, .2, 2.4], [0, -.05, 0], dark);
        box(turret, 'scout weapon mount', [2.05, 1.25, 1.9], [0, .62, 0], primary);
        box(turret, 'scout gun barrel', [.22, .22, 3.25], [0, .8, -2.1], metal);
        box(turret, 'radio aerial', [.07, 1.8, .07], [.8, 1.55, .45], dark);
      } else {
        const width = faction === 'china' ? 6.7 : 6.2;
        const length = faction === 'china' ? 9.8 : 9.2;
        box(vehicle, 'lower armored hull', [width, 1.05, length], [0, .82, .05], dark);
        const hull = new THREE.Mesh(new THREE.CapsuleGeometry(width * .36, length * .53, 5, 20), primary);
        hull.name = 'rounded armored upper hull'; hull.rotation.x = Math.PI / 2; hull.scale.set(1, .58, 1); hull.position.set(0, 1.75, .02); hull.castShadow = true; hull.receiveShadow = true; vehicle.add(hull);
        box(vehicle, 'sloped upper glacis', [width - .35, 1.2, 6.2], [0, 1.82, -1.05], primary);
        box(vehicle, 'engine deck', [width - .5, .62, 2.65], [0, 1.72, 3.03], light);
        box(vehicle, 'front glacis plate', [width - .65, .28, .18], [0, 2.25, -4.52], trim);
        for (const x of [-1, 1]) {
          box(vehicle, 'track frame', [1.05, 1.1, 9.8], [x * 3.25, .78, .02], dark);
          for (let i = 0; i < 7; i++) {
            const z = -3.55 + i * 1.18;
            cylinder(vehicle, 'road wheel', .57, .57, .18, [x * 3.25, .75, z], metal, 12).rotation.z = Math.PI / 2;
            cylinder(vehicle, 'wheel hub', .22, .22, .2, [x * 3.37, .75, z], trim, 10).rotation.z = Math.PI / 2;
          }
          for (let i = 0; i < 12; i++) {
            const z = -4.35 + i * .78;
            box(vehicle, 'individual track shoe', [.12, .16, .64], [x * 3.79, 1.22, z], metal, false);
          }
          box(vehicle, 'side armor skirt', [.18, .58, 5.2], [x * 3.82, 1.62, .2], primary);
          for (let i = 0; i < 3; i++) box(vehicle, 'side armor panel', [.2, .75, 1.35], [x * 3.94, 1.65, -1.15 + i * 1.55], light);
        }
        for (let i = 0; i < 5; i++) box(vehicle, 'engine vent', [.18, .08, .48], [-1.5 + i * .75, 2.06, 3.15], dark);
        const turret = new THREE.Group(); turret.name = 'turret'; turret.position.set(0, 2.48, -.35); vehicle.add(turret);
        cylinder(turret, 'turret race', 2.05, 2.2, .35, [0, -.12, 0], metal, 12);
        const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), primary);
        shell.name = 'rounded composite tank turret'; shell.scale.set(2.15, 1.12, 2.45); shell.position.set(0, .38, .12); shell.castShadow = true; shell.receiveShadow = true; turret.add(shell);
        box(turret, 'gun mantlet', [1.3, .92, .9], [0, .5, -1.45], light);
        cylinder(turret, 'main gun barrel', .25, .38, 5.5, [0, .55, -3.9], metal, 12).rotation.x = Math.PI / 2;
        cylinder(turret, 'muzzle brake', .34, .32, .6, [0, .55, -6.73], dark, 10).rotation.x = Math.PI / 2;
        box(turret, 'coaxial gun', [.15, .16, 2.4], [.75, .56, -2.55], dark);
        cylinder(turret, 'commander hatch', .68, .68, .2, [.8, 1.02, .25], metal, 10);
        box(turret, 'sight optic', [.46, .38, .3], [-.85, .82, -.55], trim);
        box(turret, 'turret side applique', [2.25, .75, .32], [1.45, .35, .45], light);
        box(turret, 'turret side applique', [2.25, .75, .32], [-1.45, .35, .45], light);
        for (const x of [-1.85, 1.85]) cylinder(turret, 'smoke launcher', .18, .22, .75, [x, .67, -.9], dark, 8).rotation.x = Math.PI / 2;
        for (let i = 0; i < 4; i++) box(vehicle, 'front headlamp', [.42, .32, .15], [-2.1 + i * 1.4, 1.56, -4.72], trim);
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
    const ring = new THREE.Mesh(new THREE.RingGeometry(.8, 1, 36), basic(friendly ? '#d9f17d' : '#e36c51', .92));
    ring.rotation.x = -Math.PI / 2; ring.position.y = .12; ring.name = 'selection-ring'; group.add(ring);
    const health = new THREE.Group(); health.name = 'health';
    const barWidth = entity.kind === 'hq' || entity.kind === 'refinery' || entity.kind === 'factory' ? 8 : 4.2;
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(barWidth, .48), basic('#1c211c', .9)); bg.rotation.x = -Math.PI / 2; bg.position.y = entity.kind === 'infantry' ? 3.5 : 8.5; health.add(bg);
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(barWidth, .3), basic(friendly ? p.trim : '#e16e54')); fill.rotation.x = -Math.PI / 2; fill.position.set(-barWidth / 2, bg.position.y + .02, 0); fill.name = 'health-fill'; health.add(fill); health.userData.width = barWidth; group.add(health);
    group.userData = { kind: entity.kind, faction, model, selection: ring, health, healthFill: fill };
    return group;
  }

  function updateFog(frame) {
    visibleCells.fill(0);
    const scouts = [...frame.units, ...frame.buildings].filter(e => e.team === 'blue');
    for (const source of scouts) {
      const radius = source.kind === 'hq' ? .13 : source.kind === 'scout' ? .14 : source.kind === 'tank' ? .12 : source.kind === 'infantry' ? .105 : source.kind === 'collector' ? .11 : .085;
      const cx = source.x * 128, cy = source.y * 128, rx = Math.ceil(radius * 128 / aspect), ry = Math.ceil(radius * 128);
      for (let y = Math.max(0, Math.floor(cy - ry)); y < Math.min(128, Math.ceil(cy + ry)); y++) {
        for (let x = Math.max(0, Math.floor(cx - rx)); x < Math.min(128, Math.ceil(cx + rx)); x++) {
          if (Math.hypot(((x + .5) / 128 - source.x) * aspect, (y + .5) / 128 - source.y) <= radius) {
            const i = y * 128 + x; visibleCells[i] = 1; discovered[i] = 1;
          }
        }
      }
    }
    let changed = false;
    for (let i = 0; i < discovered.length; i++) {
      const alpha = discovered[i] ? 0 : 248;
      const p = i * 4;
      if (fogPixels.data[p] !== 0 || fogPixels.data[p + 1] !== 0 || fogPixels.data[p + 2] !== 0 || fogPixels.data[p + 3] !== alpha) {
        fogPixels.data[p] = fogPixels.data[p + 1] = fogPixels.data[p + 2] = 0;
        fogPixels.data[p + 3] = alpha; changed = true;
      }
    }
    if (changed) { fogContext.putImageData(fogPixels, 0, 0); fogTexture.needsUpdate = true; }
  }

  function render(frame) {
    currentZoom = frame.camera.z;
    resize();
    const centerX = (frame.camera.x - .5) * WORLD * aspect;
    const centerZ = (frame.camera.y - .5) * WORLD;
    camera.position.set(centerX, 190, centerZ + 92);
    camera.lookAt(centerX, 0, centerZ);
    camera.rotation.z = 0;
    camera.left = -HALF_WORLD * aspect / currentZoom; camera.right = HALF_WORLD * aspect / currentZoom;
    camera.top = HALF_WORLD / currentZoom; camera.bottom = -HALF_WORLD / currentZoom; camera.updateProjectionMatrix();

    const live = new Set();
    updateFog(frame);
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
      const fogIndex = Math.max(0, Math.min(127, Math.floor(entity.y * 128))) * 128 + Math.max(0, Math.min(127, Math.floor(entity.x * 128)));
      obj.visible = entity.hp > 0 && (entity.team === 'blue' || visibleCells[fogIndex] === 1);
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
      const a = new THREE.Vector3((shot.x - .5) * WORLD * aspect, .72, (shot.y - .5) * WORLD);
      const b = new THREE.Vector3((shot.x + (shot.target.x - shot.x) * t - .5) * WORLD * aspect, .72, (shot.y + (shot.target.y - shot.y) * t - .5) * WORLD);
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
  function resetFog() {
    discovered.fill(0); visibleCells.fill(0);
    for (let i = 0; i < discovered.length; i++) {
      const p = i * 4;
      fogPixels.data[p] = fogPixels.data[p + 1] = fogPixels.data[p + 2] = 0;
      fogPixels.data[p + 3] = 248;
    }
    fogContext.putImageData(fogPixels, 0, 0); fogTexture.needsUpdate = true;
  }

  resize();
  resetFog();
  return { render, resize, resetFog };
}
