// Hero 3D penuh layar (Three.js): lantai berubin, cincin kaca buram yang bentuk jalurnya berubah-ubah,
// lempengan putih dengan tepi neon (bloom), bayangan panjang, debu, dan mobil yang menyusuri jalur.
// Dibuat dengan bantuan Antigravity CLI (Claude).
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const TUBE = 0.45;

// Bentuk jalur: r = R(1 + a cos(m*theta + phi)), diskalakan sx/sz. Antar preset di-morph.
const JALUR = [
  { a: 0, m: 2, phi: 0, sx: 1, sz: 1 },
  { a: 0.35, m: 2, phi: 0, sx: 1.25, sz: 0.8 },
  { a: 0.3, m: 3, phi: 0.5, sx: 1, sz: 1 },
  { a: 0.28, m: 2, phi: Math.PI / 2, sx: 0.8, sz: 1.2 },
];
// Tiap lempengan: [posisi, rotasi, skala] untuk tiap preset.
const LEMPENG = [
  [[[2.2, 0.6, -1.2], [0, 0.3, 0], [3, 0.25, 2]], [[-0.5, 1.4, -2.2], [0.9, 0.8, 0.2], [3, 0.25, 2]], [[1.8, 0.4, 1.8], [0, -0.5, 0], [3, 0.25, 2]], [[-2.6, 1.0, 0.5], [0.4, 1.2, 0.6], [3, 0.25, 2]]],
  [[[-1.8, 0.2, 2.4], [0, -0.6, 0], [2, 0.2, 1.4]], [[2.8, 0.8, 1.2], [0.3, 0.4, 0.9], [2, 0.2, 1.4]], [[-2.4, 0.9, -1.4], [1.2, 0.2, 0], [2, 0.2, 1.4]], [[2.4, 0.3, -2.2], [0, 0.9, 0], [2, 0.2, 1.4]]],
  [[[3.2, 1.4, 2.0], [0.8, 0.2, 0.4], [1.6, 0.18, 1.2]], [[-3, 0.2, 1.2], [0, 0.5, 0], [1.6, 0.18, 1.2]], [[0.6, 1.2, -3], [0.5, 1.0, 0.7], [1.6, 0.18, 1.2]], [[-0.8, 0.3, 2.8], [0, -0.2, 0], [1.6, 0.18, 1.2]]],
];
const NEON = [0xff3df0, 0x8a4dff, 0xc04dff];

const ease = (x) => x * x * (3 - 2 * x);
const lerp = (a, b, t) => a + (b - a) * t;

function titik(p) {
  const N = 14, out = [];
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2;
    const r = 2.7 * (1 + p.a * Math.cos(p.m * th + p.phi));
    out.push(new THREE.Vector3(r * Math.cos(th) * p.sx, TUBE, r * Math.sin(th) * p.sz));
  }
  return out;
}

function buatMobil() {
  const car = new THREE.Group();
  const cat = new THREE.MeshPhysicalMaterial({ color: 0x6d4aff, roughness: 0.25, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.1 });
  const kaca = new THREE.MeshPhysicalMaterial({ color: 0xe9e4ff, roughness: 0.05, metalness: 0.6 });
  const ban = new THREE.MeshStandardMaterial({ color: 0x1b1b2f, roughness: 0.8 });
  const lampu = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd34d).multiplyScalar(3), toneMapped: false });

  const bodi = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.4, 0.8, 4, 0.12), cat);
  bodi.position.y = 0.3;
  const kabin = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.35, 0.72, 4, 0.12), kaca);
  kabin.position.set(-0.1, 0.65, 0);
  car.add(bodi, kabin);
  for (const x of [-0.55, 0.55]) for (const z of [-0.42, 0.42]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.14, 24), ban);
    w.rotation.x = Math.PI / 2; w.position.set(x, 0.18, z); car.add(w);
  }
  for (const z of [-0.25, 0.25]) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), lampu);
    l.position.set(0.85, 0.32, z); car.add(l);
  }
  car.scale.setScalar(0.85);
  car.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return car;
}

function teksturLantai() {
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const g = c.getContext('2d');
  g.fillStyle = '#ddd7f3'; g.fillRect(0, 0, 1024, 1024);
  g.strokeStyle = 'rgba(120,110,170,0.35)'; g.lineWidth = 3;
  g.strokeRect(0, 0, 1024, 1024);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(7, 7);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

export default function Hero() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    let w = el.clientWidth, h = el.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd9d2f3);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.35;

    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
    const camBase = new THREE.Vector3(2, 9.5, 8.5);
    camera.position.copy(camBase);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xcfc6f5, 0.35));
    const sun = new THREE.SpotLight(0xffffff, 115, 0, 0.9, 0.8, 1.6);
    sun.position.set(10, 9, 3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.camera.near = 3; sun.shadow.camera.far = 40;
    scene.add(sun);

    const dunia = new THREE.Group();
    dunia.position.set(2.2, 0, 0);
    scene.add(dunia);

    const lantai = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ map: teksturLantai(), roughness: 0.55 }));
    lantai.rotation.x = -Math.PI / 2; lantai.receiveShadow = true;
    scene.add(lantai);

    // Cincin kaca buram mengikuti jalur yang berubah
    const kacaBuram = new THREE.MeshPhysicalMaterial({
      color: 0xf3efff, transmission: 1, thickness: 0.9, roughness: 0.35, ior: 1.35,
      clearcoat: 1, clearcoatRoughness: 0.25, attenuationColor: new THREE.Color(0xd5c8ff), attenuationDistance: 2.5,
    });
    let tabung = new THREE.Mesh(new THREE.BufferGeometry(), kacaBuram);
    tabung.castShadow = true; tabung.receiveShadow = true;
    dunia.add(tabung);

    // Lempengan putih bertepi neon
    const putih = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 });
    const lempeng = LEMPENG.map((_, i) => {
      const g = new THREE.Group();
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), putih);
      m.castShadow = true; m.receiveShadow = true;
      const warna = new THREE.Color(NEON[i]).multiplyScalar(3);
      const tepi = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.1, 0.03), new THREE.MeshBasicMaterial({ color: warna, toneMapped: false }));
      tepi.position.z = 0.5;
      const cahaya = new THREE.PointLight(NEON[i], 3.5, 4, 2);
      cahaya.position.set(0, 0.6, 0.8);
      g.add(m, tepi, cahaya);
      dunia.add(g);
      return g;
    });

    const mobil = buatMobil();
    dunia.add(mobil);

    // Debu
    const jml = 350, pos = new Float32Array(jml * 3);
    for (let i = 0; i < jml; i++) { pos[i * 3] = (Math.random() - 0.5) * 24; pos[i * 3 + 1] = Math.random() * 6; pos[i * 3 + 2] = (Math.random() - 0.5) * 18; }
    const debuGeo = new THREE.BufferGeometry(); debuGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const debu = new THREE.Points(debuGeo, new THREE.PointsMaterial({ color: 0x2a2540, size: 0.035, sizeAttenuation: true }));
    scene.add(debu);

    // Post-processing: bloom untuk neon
    const target = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
    const composer = new EffectComposer(renderer, target);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 0.6, 0.6, 1.2));
    composer.addPass(new OutputPass());

    const mouse = { x: 0, y: 0 };
    const onMove = (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; };
    addEventListener('mousemove', onMove);
    const onResize = () => {
      w = el.clientWidth; h = el.clientHeight;
      renderer.setSize(w, h); composer.setSize(w, h);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    const HOLD = 4, MORPH = 2.8, SIKLUS = HOLD + MORPH;
    const p = { a: 0, m: 2, phi: 0, sx: 1, sz: 1 };
    let raf;
    const loop = () => {
      const t = clock.getElapsedTime();
      const n = JALUR.length;
      const idx = Math.floor(t / SIKLUS);
      const lokal = t - idx * SIKLUS;
      const k = lokal < HOLD ? 0 : ease((lokal - HOLD) / MORPH);
      const A = JALUR[idx % n], B = JALUR[(idx + 1) % n];
      for (const key of ['a', 'm', 'phi', 'sx', 'sz']) p[key] = lerp(A[key], B[key], k);

      const curve = new THREE.CatmullRomCurve3(titik(p), true, 'centripetal');
      tabung.geometry.dispose();
      tabung.geometry = new THREE.TubeGeometry(curve, 160, TUBE, 28, true);

      lempeng.forEach((g, i) => {
        const a = LEMPENG[i][idx % n], b = LEMPENG[i][(idx + 1) % n];
        g.position.set(lerp(a[0][0], b[0][0], k), lerp(a[0][1], b[0][1], k), lerp(a[0][2], b[0][2], k));
        g.rotation.set(lerp(a[1][0], b[1][0], k), lerp(a[1][1], b[1][1], k), lerp(a[1][2], b[1][2], k));
        g.scale.set(lerp(a[2][0], b[2][0], k), lerp(a[2][1], b[2][1], k), lerp(a[2][2], b[2][2], k));
      });

      // Mobil menyusuri jalur
      const u = (t * 0.05) % 1;
      const pt = curve.getPointAt(u), tg = curve.getTangentAt(u);
      mobil.position.set(pt.x, pt.y + TUBE * 0.9, pt.z);
      mobil.rotation.y = Math.atan2(-tg.z, tg.x);

      debu.rotation.y = t * 0.01;
      camera.position.set(camBase.x + mouse.x * 1.5, camBase.y - mouse.y * 1.0, camBase.z);
      camera.lookAt(2.2, 0, 0);

      composer.render();
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('mousemove', onMove);
      removeEventListener('resize', onResize);
      composer.dispose(); renderer.dispose(); pmrem.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={ref} className="scene3d" />;
}
