// Hero 3D (Three.js - Continuous Cyclic Rotating Groove Pallets + GT Coupe):
// Setiap palet persegi memiliki pahatan busur cekung 90 derajat di sudut lokalnya.
// Gerakan mobil dan putaran keempat palet dikendalikan oleh fase sudut siklis kontinu
// (modulo 2*PI dengan rotasi 0 -> PI -> 2*PI yang ekuivalen dengan 0), sehingga
// animasi berjalan 100% siklis (seamless infinite loop) tanpa pernah melompat/mengulang kasar.
// Dibuat dengan bantuan Antigravity CLI.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const S = 2.86;        // Ukuran sisi tiap palet persegi
const GAP = 0.024;     // Celah nat antar palet
const STEP = S + GAP;  // Jarak antar pusat palet
const H = 0.62;        // Ketebalan palet
const R_ARC = 1.92;    // Jari-jari busur cekung dari sudut palet
const GW = 0.52;       // Setengah lebar parit cekung
const GD = 0.34;       // Kedalaman parit cekung
const TAU = Math.PI * 2;

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Tekstur permukaan keramik berbintik halus (speckled terrazzo)
function buatTeksturKeramik() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 420; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 0.7 + Math.random() * 1.3;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(65, 50, 105, 0.42)' : 'rgba(110, 95, 150, 0.28)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function kedalamanParitLokal(x, z) {
  const cx = -S / 2;
  const cz = -S / 2;
  const distArc = Math.abs(Math.hypot(x - cx, z - cz) - R_ARC);
  if (distArc >= GW) return 0;
  const nd = distArc / GW;
  const prof = (1 - nd * nd) * smoothstep(1.0, 0.76, nd);
  return -GD * prof;
}

function buatGeometriPalet(hasGroove = true) {
  const segXZ = hasGroove ? 84 : 4;
  const segY = hasGroove ? 10 : 1;
  const geo = new THREE.BoxGeometry(S, H, S, segXZ, segY, segXZ);

  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  const halfH = H / 2;
  const bevelEdge = 0.032;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx0 = norm.getX(i);
    const ny0 = norm.getY(i);
    const nz0 = norm.getZ(i);

    const dxEdge = Math.max(0, Math.abs(x) - (S / 2 - bevelEdge)) / bevelEdge;
    const dzEdge = Math.max(0, Math.abs(z) - (S / 2 - bevelEdge)) / bevelEdge;
    const edgeDrop = -0.015 * (dxEdge * dxEdge + dzEdge * dzEdge);

    const gDrop = hasGroove ? kedalamanParitLokal(x, z) : 0;

    const uy = (y + halfH) / H;
    const newY = -halfH + uy * (H + gDrop + edgeDrop);
    pos.setY(i, newY);

    if (ny0 > 0.5 && hasGroove) {
      const eps = 0.012;
      const hC = gDrop + edgeDrop;
      const hX = kedalamanParitLokal(x + eps, z) + edgeDrop;
      const hZ = kedalamanParitLokal(x, z + eps) + edgeDrop;
      const gx = (hC - hX) / eps;
      const gz = (hC - hZ) / eps;
      const len = Math.hypot(gx, 1.0, gz);
      norm.setXYZ(i, gx / len, 1.0 / len, gz / len);
    } else {
      norm.setXYZ(i, nx0, ny0, nz0);
    }
  }

  pos.needsUpdate = true;
  norm.needsUpdate = true;
  return geo;
}

function buatMobilGT() {
  const root = new THREE.Group();

  const matBody = new THREE.MeshPhysicalMaterial({
    color: 0xf5c24c,
    metalness: 0.78,
    roughness: 0.14,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });
  const matGlass = new THREE.MeshPhysicalMaterial({
    color: 0x16112b,
    metalness: 0.25,
    roughness: 0.06,
    clearcoat: 1.0,
  });
  const matCarbon = new THREE.MeshStandardMaterial({
    color: 0x1b1530,
    metalness: 0.5,
    roughness: 0.35,
  });
  const matHeadlight = new THREE.MeshBasicMaterial({ color: 0xfffce8 });
  const matTaillight = new THREE.MeshBasicMaterial({ color: 0xff1e75 });

  const s = new THREE.Shape();
  s.moveTo(1.06, 0.0);
  s.bezierCurveTo(1.06, 0.32, 0.88, 0.43, 0.52, 0.44);
  s.bezierCurveTo(0.22, 0.44, -0.05, 0.40, -0.35, 0.45);
  s.bezierCurveTo(-0.70, 0.47, -0.98, 0.42, -1.04, 0.28);
  s.lineTo(-1.04, -0.28);
  s.bezierCurveTo(-0.98, -0.42, -0.70, -0.47, -0.35, -0.45);
  s.bezierCurveTo(-0.05, -0.40, 0.22, -0.44, 0.52, -0.44);
  s.bezierCurveTo(0.88, -0.43, 1.06, -0.32, 1.06, 0.0);

  const geoHull = new THREE.ExtrudeGeometry(s, {
    depth: 0.13,
    bevelEnabled: true,
    bevelSegments: 12,
    steps: 1,
    bevelSize: 0.11,
    bevelThickness: 0.12,
  });
  geoHull.rotateX(Math.PI / 2);
  geoHull.center();
  const hull = new THREE.Mesh(geoHull, matBody);
  hull.position.y = 0.23;
  hull.castShadow = true;
  hull.receiveShadow = true;
  root.add(hull);

  const sc = new THREE.Shape();
  sc.moveTo(0.36, 0.0);
  sc.bezierCurveTo(0.36, 0.24, 0.20, 0.31, -0.05, 0.30);
  sc.bezierCurveTo(-0.38, 0.29, -0.68, 0.25, -0.76, 0.16);
  sc.lineTo(-0.76, -0.16);
  sc.bezierCurveTo(-0.68, -0.25, -0.38, -0.29, -0.05, -0.30);
  sc.bezierCurveTo(0.20, -0.31, 0.36, -0.24, 0.36, 0.0);

  const geoCabin = new THREE.ExtrudeGeometry(sc, {
    depth: 0.08,
    bevelEnabled: true,
    bevelSegments: 10,
    steps: 1,
    bevelSize: 0.10,
    bevelThickness: 0.11,
  });
  geoCabin.rotateX(Math.PI / 2);
  geoCabin.center();
  const cabin = new THREE.Mesh(geoCabin, matGlass);
  cabin.position.set(-0.14, 0.38, 0);
  cabin.castShadow = true;
  root.add(cabin);

  const sr = new THREE.Shape();
  sr.moveTo(0.08, 0.0);
  sr.bezierCurveTo(0.08, 0.19, -0.05, 0.23, -0.25, 0.22);
  sr.bezierCurveTo(-0.46, 0.21, -0.58, 0.18, -0.60, 0.12);
  sr.lineTo(-0.60, -0.12);
  sr.bezierCurveTo(-0.58, -0.18, -0.46, -0.21, -0.25, -0.22);
  sr.bezierCurveTo(-0.05, -0.23, 0.08, -0.19, 0.08, 0.0);

  const geoRoof = new THREE.ExtrudeGeometry(sr, {
    depth: 0.03,
    bevelEnabled: true,
    bevelSegments: 6,
    steps: 1,
    bevelSize: 0.04,
    bevelThickness: 0.04,
  });
  geoRoof.rotateX(Math.PI / 2);
  geoRoof.center();
  const roof = new THREE.Mesh(geoRoof, matBody);
  roof.position.set(-0.22, 0.48, 0);
  root.add(roof);

  for (const z of [-0.28, 0.28]) {
    const hl = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.04, 0.12, 2, 0.015), matHeadlight);
    hl.position.set(0.98, 0.24, z);
    hl.rotation.y = z > 0 ? -0.32 : 0.32;
    root.add(hl);
  }
  const tl = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.045, 0.66, 2, 0.015), matTaillight);
  tl.position.set(-1.07, 0.26, 0);
  root.add(tl);

  const geoTire = new THREE.CylinderGeometry(0.19, 0.19, 0.14, 24);
  geoTire.rotateX(Math.PI / 2);
  const wheels = [];
  for (const x of [-0.62, 0.62]) {
    for (const z of [-0.45, 0.45]) {
      const w = new THREE.Mesh(geoTire, matCarbon);
      w.position.set(x, 0.19, z);
      root.add(w);
      wheels.push(w);
    }
  }

  root.scale.setScalar(0.45);
  root.userData.wheels = wheels;
  return root;
}

export default function Hero() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    let w = el.clientWidth, h = el.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd5cef0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.42;

    const camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 100);
    const camBase = new THREE.Vector3(0.35, 8.6, 5.8);
    const lookTarget = new THREE.Vector3(0.85, -0.15, 0.05);
    camera.position.copy(camBase);
    camera.lookAt(lookTarget);

    const hemi = new THREE.HemisphereLight(0xe2dcf8, 0x8e82be, 0.88);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff4ea, 3.1);
    sun.position.set(8.5, 6.2, -5.5);
    sun.target.position.set(2.0, 0, 0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 28;
    const dCam = 9.5;
    sun.shadow.camera.left = -dCam;
    sun.shadow.camera.right = dCam;
    sun.shadow.camera.top = dCam;
    sun.shadow.camera.bottom = -dCam;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    scene.add(sun, sun.target);

    const worldGroup = new THREE.Group();
    worldGroup.position.set(2.20, 0, 0.10);
    worldGroup.rotation.y = -0.58;
    scene.add(worldGroup);

    const texKeramik = buatTeksturKeramik();
    const matPallet = new THREE.MeshStandardMaterial({
      color: 0xf7f4fc,
      map: texKeramik,
      roughness: 0.52,
      metalness: 0.04,
    });

    const geoGrooved = buatGeometriPalet(true);
    const geoFlat = buatGeometriPalet(false);

    const matNeonFloor = new THREE.MeshBasicMaterial({ color: 0xd926ff });
    const neonBase = new THREE.Mesh(new THREE.PlaneGeometry(STEP * 3.2, STEP * 3.2), matNeonFloor);
    neonBase.rotation.x = -Math.PI / 2;
    neonBase.position.y = -H + 0.02;
    worldGroup.add(neonBase);

    const pallets = {};
    for (let gx = -5; gx <= 4; gx++) {
      for (let gz = -5; gz <= 4; gz++) {
        const ix = gx + 0.5;
        const iz = gz + 0.5;

        let hasGroove = false;
        let baseRot = 0;

        if (ix === 0.5 && iz === 0.5) { hasGroove = true; baseRot = 0; }
        else if (ix === -0.5 && iz === 0.5) { hasGroove = true; baseRot = -Math.PI / 2; }
        else if (ix === -0.5 && iz === -0.5) { hasGroove = true; baseRot = Math.PI; }
        else if (ix === 0.5 && iz === -0.5) { hasGroove = true; baseRot = Math.PI / 2; }
        else if (ix === -0.5 && iz === -1.5) { hasGroove = true; baseRot = 0; }
        else if (ix === 0.5 && iz === -1.5) { hasGroove = true; baseRot = Math.PI; }

        const pivot = new THREE.Group();
        pivot.position.set(ix * STEP, 0, iz * STEP);

        const mesh = new THREE.Mesh(hasGroove ? geoGrooved : geoFlat, matPallet);
        mesh.position.y = -H / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        pivot.add(mesh);

        if (hasGroove) {
          const matRimNeon = new THREE.MeshBasicMaterial({ color: 0xe62eff });
          const neonSkirt = new THREE.Mesh(new THREE.BoxGeometry(S - 0.02, 0.08, S - 0.02), matRimNeon);
          neonSkirt.position.y = -H + 0.05;
          pivot.add(neonSkirt);

          const pLight = new THREE.PointLight(0xc81eff, 0, 4.5, 1.8);
          pLight.position.set(0, -H * 0.4, 0);
          pivot.add(pLight);
          pivot.userData.pLight = pLight;
          pivot.userData.neonSkirt = neonSkirt;
        }

        pivot.rotation.y = baseRot;
        pivot.userData.baseRot = baseRot;
        worldGroup.add(pivot);

        pallets[`${ix},${iz}`] = pivot;
      }
    }

    const mobil = buatMobilGT();
    worldGroup.add(mobil);

    const carGlow = new THREE.PointLight(0xffb830, 1.4, 2.2, 2.0);
    mobil.add(carGlow);
    carGlow.position.set(0, 0.35, 0);

    const mouse = { x: 0, y: 0 };
    const onMove = (e) => {
      mouse.x = e.clientX / innerWidth - 0.5;
      mouse.y = e.clientY / innerHeight - 0.5;
    };
    addEventListener('mousemove', onMove);

    const onResize = () => {
      w = el.clientWidth;
      h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    const params = new URLSearchParams(location.search);
    const FIX = params.has('t') ? Number(params.get('t')) : null;

    const animasikanPalet = (key, liftAmount, extraRotY, tiltX = 0, tiltZ = 0) => {
      const p = pallets[key];
      if (!p) return;
      p.position.y = liftAmount * 0.38;
      p.rotation.set(tiltX, p.userData.baseRot + extraRotY, tiltZ);
      if (p.userData.pLight) {
        const glow = Math.min(1, liftAmount * 2.2 + Math.abs(tiltX) * 3.0);
        p.userData.pLight.intensity = glow * 9.0;
        p.userData.neonSkirt.visible = glow > 0.02;
      }
    };

    // Daftar 4 palet utama beserta sudut kuadrannya di lingkaran:
    // Setiap palet terangkat dan berputar 360 derajat (0 -> PI -> 2*PI) secara mulus
    // tepat ketika mobil berada di belahan lingkaran seberangnya!
    // Karena 2*PI secara geometris identik dengan 0, maka saat palet mendarat kembali,
    // tidak pernah ada lompatan/reset sama sekali (100% siklis kontinu!).
    const RING_PALLETS = [
      { key: '0.5,0.5',   quadAngle: 0.25 * Math.PI, tiltSignX: -1, tiltSignZ: -1 },
      { key: '-0.5,0.5',  quadAngle: 0.75 * Math.PI, tiltSignX:  1, tiltSignZ:  1 },
      { key: '-0.5,-0.5', quadAngle: 1.25 * Math.PI, tiltSignX:  1, tiltSignZ: -1 },
      { key: '0.5,-0.5',  quadAngle: 1.75 * Math.PI, tiltSignX: -1, tiltSignZ:  1 },
    ];

    let raf;
    const loop = () => {
      const t = FIX ?? clock.getElapsedTime();

      // 1. Sudut mobil bertambah secara linear & kontinu tanpa pemotongan if/else (tidak pernah melompat!)
      // Kecepatan: 1 putaran penuh setiap 8 detik
      const omega = TAU / 8.0;
      const carAngle = t * omega + 0.65 * Math.PI;

      // 2. Evaluasi gelombang siklis untuk keempat palet utama
      for (const item of RING_PALLETS) {
        // Selisih fase sudut antara mobil dan pusat kuadran palet (selalu di [0 .. 2*PI))
        const phase = (((carAngle - item.quadAngle) % TAU) + TAU) % TAU;

        // Ketika phase berada di jendela [0.65*PI .. 1.55*PI], mobil sedang berada di seberang palet ini.
        // Palet ini terangkat mulus, berputar 0 -> PI (membentuk S-curve/C-shape) -> 2*PI (kembali bulatan), lalu mendarat!
        const winStart = 0.65 * Math.PI;
        const winEnd = 1.55 * Math.PI;

        if (phase > winStart && phase < winEnd) {
          const u = (phase - winStart) / (winEnd - winStart); // 0 .. 1 kontinu
          const s = Math.sin(u * Math.PI);
          const lift = s * s; // C^1 smooth: mulai dari 0 dengan turunan 0, naik ke 1, kembali ke 0 dengan turunan 0

          // Putaran 2 tahap yang mulus dari 0 -> PI (tahan sebentar agar S-curve terlihat jelas) -> 2*PI:
          let rot = 0;
          if (u < 0.42) {
            rot = smoothstep(0.0, 0.42, u) * Math.PI;
          } else if (u < 0.58) {
            rot = Math.PI;
          } else {
            rot = Math.PI + smoothstep(0.58, 1.0, u) * Math.PI;
          }

          const tilt = Math.sin(u * TAU) * s * 0.16;
          animasikanPalet(item.key, lift, rot, tilt * item.tiltSignX, tilt * item.tiltSignZ);
        } else {
          animasikanPalet(item.key, 0, 0, 0, 0);
        }
      }

      // 3. Posisi & orientasi mobil mengikuti bulatan cekung secara kontinu
      const cxCar = Math.cos(carAngle) * R_ARC;
      const czCar = Math.sin(carAngle) * R_ARC;

      mobil.position.set(cxCar, -GD + 0.02, czCar);
      const tangentYaw = -carAngle - Math.PI / 2;
      mobil.rotation.set(0, tangentYaw, 0.15);

      for (const wMesh of mobil.userData.wheels) {
        wMesh.rotation.z = -t * 7.0;
      }

      camera.position.set(
        camBase.x + mouse.x * 0.7,
        camBase.y - mouse.y * 0.45,
        camBase.z
      );
      camera.lookAt(lookTarget);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('mousemove', onMove);
      removeEventListener('resize', onResize);
      renderer.dispose();
      pmrem.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={ref} className="scene3d" />;
}
