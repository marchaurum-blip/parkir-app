// Hero 3D halaman depan (Three.js): lantai ubin berparit dengan mobil yang melintas.
// Ubin bereaksi saat form difokus/diketik. Saat login, 4 ubin tengah turun dan kamera
// menyelam ke lubangnya sebelum masuk ke denah basement. Hanya tampil sebelum login.
// Kalau WebGL tidak tersedia, adegan dilewati dan CSS .scene3d-fallback yang tampil.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const S = 2.90;
const GAP = 0.022;
const STEP = S + GAP;
const H = 0.92;
const R_ARC = 1.94;
const GW = 0.52;
const GD = 0.38;
const WORLD_ROT = -0.72;
const WORLD_POS = new THREE.Vector3(2.38, 0, 0.15);
const TAU = Math.PI * 2;

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function kedalamanParitLokal(x, z) {
  const cx = -S / 2;
  const cz = -S / 2;
  const distArc = Math.abs(Math.hypot(x - cx, z - cz) - R_ARC);
  if (distArc >= GW) return 0;
  const nd = distArc / GW;
  const prof = (1 - nd * nd) * smoothstep(1.0, 0.42, nd);
  return -GD * prof;
}

function buatGeometriPalet() {
  const segXZ = 72;
  const segY = 14;
  const geo = new THREE.BoxGeometry(S, H, S, segXZ, segY, segXZ);

  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  const halfH = H / 2;
  const bevelEdge = 0.024;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx0 = norm.getX(i);
    const ny0 = norm.getY(i);
    const nz0 = norm.getZ(i);

    const dxEdge = Math.max(0, Math.abs(x) - (S / 2 - bevelEdge)) / bevelEdge;
    const dzEdge = Math.max(0, Math.abs(z) - (S / 2 - bevelEdge)) / bevelEdge;
    const edgeDrop = -0.011 * (dxEdge * dxEdge + dzEdge * dzEdge);
    const gDrop = kedalamanParitLokal(x, z);

    const uy = (y + halfH) / H;
    const newY = -H + uy * (H + gDrop + edgeDrop);
    pos.setY(i, newY);

    if (ny0 > 0.5) {
      const eps = 0.010;
      const hC = gDrop + edgeDrop;
      const hX = kedalamanParitLokal(x + eps, z) + edgeDrop;
      const hZ = kedalamanParitLokal(x, z + eps) + edgeDrop;
      const gx = ((hC - hX) / eps) * 1.72;
      const gz = ((hC - hZ) / eps) * 1.72;
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

const VERT_PALLET = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  varying vec3 vWorldNorm;
  varying vec3 vOrigNorm;

  void main() {
    vLocalPos = position;
    vOrigNorm = normal;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNorm = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FRAG_PALLET = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  varying vec3 vWorldNorm;
  varying vec3 vOrigNorm;

  uniform vec3 uCarGroupPos;
  uniform vec4 uSlab0;
  uniform vec4 uSlab1;
  uniform vec2 uSlabRot;
  uniform float uGlobalOpen;
  uniform mat4 modelMatrix;

  float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  vec2 toGroupXZ(vec2 worldXZ) {
    vec2 d = worldXZ - vec2(2.38, 0.15);
    float ca = cos(0.72), sa = sin(0.72);
    return mat2(ca, -sa, sa, ca) * d;
  }

  float tinggiParit(vec2 p) {
    float nd = abs(length(p + vec2(1.45)) - 1.94) / 0.52;
    if (nd >= 1.0) return 0.0;
    return -0.38 * (1.0 - nd * nd) * (1.0 - smoothstep(0.42, 1.0, nd));
  }

  float sdRotBox2D(vec2 p, vec2 c, float ang, vec2 hs) {
    vec2 rel = p - c;
    float ca = cos(-ang), sa = sin(-ang);
    vec2 q = abs(mat2(ca, -sa, sa, ca) * rel) - hs;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  }

  void main() {
    vec3 N = normalize(vWorldNorm);
    vec2 gXZ = toGroupXZ(vWorldPos.xz);
    float hParit = tinggiParit(vLocalPos.xz);
    if (vOrigNorm.y > 0.5) {
      float eps = 0.006;
      vec2 grad = vec2(hParit - tinggiParit(vLocalPos.xz + vec2(eps, 0.0)),
                       hParit - tinggiParit(vLocalPos.xz + vec2(0.0, eps))) / eps * 1.72;
      N = normalize(mat3(modelMatrix) * vec3(grad.x, 1.0, grad.y));
    }

    float myLift = max(0.0, vWorldPos.y - vLocalPos.y);
    float isTopFace = step(0.5, vOrigNorm.y);
    float isSideWall = 1.0 - isTopFace;

    vec3 L = normalize(vec3(0.91, 0.32, -0.26));
    vec2 sunDirWorld = normalize(L.xz);
    float caG = cos(0.72), saG = sin(0.72);
    vec2 sunDirGroup = normalize(mat2(caG, -saG, saG, caG) * sunDirWorld);

    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 H = normalize(L + V);

    float grooveDepth = clamp(-hParit / 0.38, 0.0, 1.0) * isTopFace;
    float inGroove = smoothstep(0.012, 0.11, grooveDepth);

    float slopeDot = dot(N.xz, sunDirWorld);
    float rimShadow = smoothstep(-0.04, 0.25, slopeDot);
    float sunWallBoost = smoothstep(0.08, 0.52, slopeDot) * inGroove;
    float grooveShadow = mix(1.0, rimShadow, inGroove);

    vec2 toFragG = gXZ - uCarGroupPos.xz;
    float projAlong = dot(toFragG, -sunDirGroup);
    vec2 perpVec = toFragG - (-sunDirGroup) * clamp(projAlong, -0.08, 2.35);
    float projPerp = length(perpVec);

    float carContact = 1.0 - 0.90 * exp(-dot(toFragG, toFragG) * 6.5);
    float shadowWidth = 0.26 + 0.06 * clamp(projAlong, 0.0, 2.0);
    float carLongShadow = 1.0 - 0.88 * (1.0 - smoothstep(shadowWidth * 0.45, shadowWidth, projPerp))
                        * smoothstep(-0.10, 0.12, projAlong)
                        * (1.0 - smoothstep(1.25, 2.25, projAlong));
    float carShadow = min(carContact, carLongShadow);

    float slabCastShadow = 1.0;
    float halfS = 1.45;

    for (int k = 0; k < 2; k++) {
      vec4 sl = (k == 0) ? uSlab0 : uSlab1;
      float rotK = (k == 0) ? uSlabRot.x : uSlabRot.y;
      if (sl.y > 0.015 && myLift < sl.y - 0.015) {
        float dh = sl.y - myLift;
        vec2 shadowSample = gXZ + sunDirGroup * (dh * 4.1);
        float dBox = sdRotBox2D(shadowSample, vec2(sl.x, sl.z), rotK, vec2(halfS));
        float castMask = smoothstep(0.11, -0.06, dBox);
        float strength = clamp(dh * 4.8, 0.0, 1.0) * 0.84;
        slabCastShadow = min(slabCastShadow, 1.0 - castMask * strength);
      }
    }

    float sideWallShade = mix(1.0, 0.24 + 0.76 * clamp(dot(N.xz, sunDirWorld), 0.0, 1.0), isSideWall);

    vec2 spotCenter = vec2(2.85, -1.55);
    float spotDist = length((vWorldPos.xz - spotCenter) * vec2(0.38, 0.52));
    float spotMask = smoothstep(7.2, 0.8, spotDist);

    vec3 colWarmSun    = vec3(0.992, 0.968, 0.970);
    vec3 colSoftShade  = vec3(0.745, 0.710, 0.875);
    vec3 colDeepShadow = vec3(0.495, 0.445, 0.695);

    float totalShadow = grooveShadow * carShadow * slabCastShadow * sideWallShade;

    float sunFactor = clamp(spotMask * (0.88 + 0.22 * sunWallBoost), 0.0, 1.0);
    vec3 litCol = mix(colSoftShade, colWarmSun, sunFactor);
    vec3 col = mix(colDeepShadow, litCol, totalShadow);

    float edgeDist = min(1.45 - abs(vLocalPos.x), 1.45 - abs(vLocalPos.z));
    float seamLine = 1.0 - smoothstep(0.003, 0.020, edgeDist);
    col *= (1.0 - grooveDepth * 0.08 - seamLine * 0.22);

    if (myLift > 0.015) {
      float topRim = smoothstep(0.028, 0.004, edgeDist) * smoothstep(-0.02, 0.0, vLocalPos.y);
      col = mix(col, vec3(1.0, 0.99, 1.0), topRim * 0.55);
    }

    float grain = (valueNoise(vWorldPos.xz * 90.0) - 0.5) * 0.024;
    col += grain;

    vec2 spCell = floor(vWorldPos.xz * 18.5);
    vec2 spFrac = fract(vWorldPos.xz * 18.5) - 0.5;
    float rnd = hash21(spCell);
    if (rnd > 0.875) {
      vec2 dotOff = vec2(fract(rnd * 17.3) - 0.5, fract(rnd * 31.7) - 0.5) * 0.56;
      float dotR = (rnd > 0.945) ? 0.072 : 0.046;
      float spMask = 1.0 - smoothstep(dotR * 0.45, dotR, length(spFrac - dotOff));
      vec3 dotCol = (rnd > 0.93) ? vec3(0.18, 0.12, 0.34) : vec3(0.42, 0.36, 0.60);
      col = mix(col, dotCol, spMask * 0.32);
    }

    float spec = pow(clamp(dot(N, H), 0.0, 1.0), 28.0) * 0.22 * totalShadow * spotMask;
    col += vec3(1.0, 0.98, 0.96) * spec;

    
    float neonViolet = 0.0;
    float neonMagenta = 0.0;
    float neonCore = 0.0;

    if (myLift > 0.015 && isSideWall > 0.5) {
      float liftInt = clamp(myLift * 4.5, 0.0, 1.45);
      float hAboveFloor = vWorldPos.y;
      float distTube = abs(hAboveFloor - 0.008);
      float maxWallH = max(myLift * 0.42, 0.045);
      float lowWallMask = 1.0 - smoothstep(maxWallH * 0.55, maxWallH, hAboveFloor);

      float barCore = exp(-distTube * 50.0) * lowWallMask * step(-0.10, hAboveFloor);
      float barMag  = exp(-distTube * 22.0) * lowWallMask * step(-0.24, hAboveFloor);
      float barViol = exp(-distTube * 10.0) * (1.0 - smoothstep(maxWallH * 0.8, maxWallH * 1.4, hAboveFloor)) * step(-0.36, hAboveFloor);

      neonCore    += barCore * liftInt * 1.55;
      neonMagenta += barMag  * liftInt * 1.35;
      neonViolet  += barViol * liftInt * 1.25;
    }

    for (int k = 0; k < 2; k++) {
      vec4 sl = (k == 0) ? uSlab0 : uSlab1;
      float rotK = (k == 0) ? uSlabRot.x : uSlabRot.y;

      if (sl.w > 0.01) {
        float sdBox = sdRotBox2D(gXZ, vec2(sl.x, sl.z), rotK, vec2(halfS));
        vec2 rel = gXZ - vec2(sl.x, sl.z);
        vec2 focusDir = (k == 1) ? normalize(vec2(0.32, 0.95)) : normalize(vec2(-0.62, 0.78));
        float sideFocus = 0.28 + 0.72 * smoothstep(-0.45, 0.55, dot(normalize(rel + vec2(1e-4)), focusDir));

        if (myLift < sl.y - 0.015 && sdBox > -0.025) {
          float distEdge = max(sdBox, 0.0);
          float grooveReach = 1.0 + grooveDepth * 1.05;

          float coreLine   = exp(-distEdge * 38.0) * sl.w * sideFocus;
          float magBounce  = exp(-distEdge * (4.6 / grooveReach)) * sl.w * sideFocus;
          float violBounce = exp(-distEdge * (1.65 / grooveReach)) * sl.w * sideFocus;

          neonCore    += coreLine * 1.10;
          neonMagenta += magBounce * 1.25;
          neonViolet  += violBounce * 1.45;
        }
      }
    }

    float extraGlow = uGlobalOpen;
    if (extraGlow > 0.01) {
      float seamDist = max(edgeDist, 0.0);
      float radialMask = smoothstep(10.5, 1.0, length(gXZ));
      float seamGlow = extraGlow * radialMask * 0.45;
      neonCore    += exp(-seamDist * 38.0) * seamGlow * 0.95;
      neonMagenta += exp(-seamDist * 7.5)  * seamGlow * 1.05;
      neonViolet  += exp(-seamDist * 2.4)  * seamGlow * 1.15;
    }

    neonViolet  = clamp(neonViolet, 0.0, 1.0);
    neonMagenta = clamp(neonMagenta, 0.0, 1.0);
    neonCore    = clamp(neonCore, 0.0, 1.0);

    vec3 colViolet  = vec3(0.31, 0.05, 0.86);
    vec3 colMagenta = vec3(0.49, 0.23, 0.93);
    vec3 colCore    = vec3(1.00, 0.90, 1.00);

    col = mix(col, colViolet,  neonViolet * 0.90);
    col = mix(col, colMagenta, neonMagenta * 0.92);
    col = mix(col, colCore,    neonCore);

    if (uSlab1.w > 0.25 || extraGlow > 0.25) {
      float bStr = max(uSlab1.w, extraGlow);
      vec2 beamOrigin = vec2(1.05, -0.45);
      vec2 beamDir = normalize(vec2(0.60, -0.80));
      vec2 toP = vWorldPos.xz - beamOrigin;
      float bAlong = dot(toP, beamDir);
      float bPerp  = length(toP - beamDir * bAlong);
      float beam = exp(-bPerp * bPerp * 3.8) * smoothstep(-0.8, 0.3, bAlong) * smoothstep(5.2, 0.6, bAlong);
      col = mix(col, vec3(1.0, 0.97, 1.0), beam * clamp(bStr * 0.48, 0.0, 0.55));
    }

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function buatMobilGT() {
  const root = new THREE.Group();

  const matGold = new THREE.MeshPhysicalMaterial({
    color: 0x241c3f,
    metalness: 0.55,
    roughness: 0.25,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });
  const matCanopy = new THREE.MeshPhysicalMaterial({
    color: 0x0e0a1c,
    metalness: 0.35,
    roughness: 0.05,
    clearcoat: 1.0,
  });
  const matTrim = new THREE.MeshStandardMaterial({
    color: 0x22183b,
    metalness: 0.60,
    roughness: 0.28,
  });
  const matHeadlight = new THREE.MeshBasicMaterial({ color: 0xfffef2 });
  const matTaillight = new THREE.MeshBasicMaterial({ color: 0x7c3aed });

  const s = new THREE.Shape();
  s.moveTo(1.04, 0.0);
  s.bezierCurveTo(1.04, 0.31, 0.85, 0.42, 0.48, 0.43);
  s.bezierCurveTo(0.18, 0.43, -0.10, 0.40, -0.40, 0.44);
  s.bezierCurveTo(-0.72, 0.45, -0.98, 0.40, -1.02, 0.26);
  s.lineTo(-1.02, -0.26);
  s.bezierCurveTo(-0.98, -0.40, -0.72, -0.45, -0.40, -0.44);
  s.bezierCurveTo(-0.10, -0.40, 0.18, -0.43, 0.48, -0.43);
  s.bezierCurveTo(0.85, -0.42, 1.04, -0.31, 1.04, 0.0);

  const geoHull = new THREE.ExtrudeGeometry(s, {
    depth: 0.22,
    bevelEnabled: true,
    bevelSegments: 8,
    steps: 1,
    bevelSize: 0.08,
    bevelThickness: 0.08,
    curveSegments: 32,
  });
  geoHull.rotateX(-Math.PI / 2);
  const meshHull = new THREE.Mesh(geoHull, matGold);
  meshHull.position.y = 0.14;
  root.add(meshHull);

  const geoCanopy = new THREE.SphereGeometry(0.46, 32, 20);
  geoCanopy.scale(1.22, 0.42, 0.66);
  const meshCanopy = new THREE.Mesh(geoCanopy, matCanopy);
  meshCanopy.position.set(-0.06, 0.36, 0);
  root.add(meshCanopy);

  const hl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.56), matHeadlight);
  hl.position.set(1.06, 0.22, 0);
  root.add(hl);

  const tl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.62), matTaillight);
  tl.position.set(-1.05, 0.25, 0);
  root.add(tl);

  const wheels = [];
  const geoWheel = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 24);
  geoWheel.rotateX(Math.PI / 2);
  for (const x of [-0.58, 0.60]) {
    for (const z of [-0.41, 0.41]) {
      const w = new THREE.Mesh(geoWheel, matTrim);
      w.position.set(x, 0.18, z);
      root.add(w);
      wheels.push(w);
    }
  }

  root.scale.setScalar(0.44);
  root.userData.wheels = wheels;
  return root;
}

// ---------- Cache Geometri Sportbike Detail Tinggi (Extrude & Multi-Part) ----------
let MOTO_GEO = null;
export default function Hero() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    let w = el.clientWidth, h = el.clientHeight;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      el.classList.add('scene3d-fallback');
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(w, h);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const bgSurface = new THREE.Color(0xbfb6df);
    scene.background = bgSurface.clone();

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.75;

    const camera = new THREE.PerspectiveCamera(25, w / h, 0.1, 140);
    const camBase = new THREE.Vector3(0.05, 8.3, 8.1);
    const lookTargetBase = new THREE.Vector3(0.65, -0.20, 0.05);
    camera.position.copy(camBase);
    camera.lookAt(lookTargetBase);

    scene.add(new THREE.HemisphereLight(0xfff8f0, 0x7b6eb2, 0.95));
    const dirLight = new THREE.DirectionalLight(0xfff1de, 3.0);
    dirLight.position.set(8.5, 5.5, -5.5);
    scene.add(dirLight);

    const worldGroup = new THREE.Group();
    worldGroup.position.copy(WORLD_POS);
    worldGroup.rotation.y = WORLD_ROT;
    scene.add(worldGroup);

    const uniforms = {
      uCarGroupPos: { value: new THREE.Vector3() },
      uSlab0: { value: new THREE.Vector4(0.5 * STEP, 0, -0.5 * STEP, 0) },
      uSlab1: { value: new THREE.Vector4(-0.5 * STEP, 0, -0.5 * STEP, 0) },
      uSlabRot: { value: new THREE.Vector2(0, 0) },
      uGlobalOpen: { value: 0.0 },
    };

    const matPallet = new THREE.ShaderMaterial({
      vertexShader: VERT_PALLET,
      fragmentShader: FRAG_PALLET,
      uniforms,
    });

    const geoGrooved = buatGeometriPalet();

    const pallets = {};
    const allPalletList = [];
    for (let gx = -5; gx <= 4; gx++) {
      for (let gz = -5; gz <= 4; gz++) {
        const ix = gx + 0.5;
        const iz = gz + 0.5;

        const mx = ((gx % 2) + 2) % 2;
        const mz = ((gz % 2) + 2) % 2;
        let baseRot = 0;
        if (mx === 0 && mz === 0) baseRot = 0;
        else if (mx === 1 && mz === 0) baseRot = -Math.PI / 2;
        else if (mx === 1 && mz === 1) baseRot = Math.PI;
        else baseRot = Math.PI / 2;

        const pivot = new THREE.Group();
        pivot.position.set(ix * STEP, 0, iz * STEP);

        const mesh = new THREE.Mesh(geoGrooved, matPallet);
        pivot.add(mesh);

        pivot.rotation.y = baseRot;
        pivot.userData.baseRot = baseRot;
        pivot.userData.ix = ix;
        pivot.userData.iz = iz;
        pivot.userData.gx = ix * STEP;
        pivot.userData.gz = iz * STEP;
        pivot.userData.distRing = Math.hypot(ix, iz);
        pivot.userData.seedPhase = ((gx * 3 + gz * 5) & 7) * (TAU / 8);
        worldGroup.add(pivot);

        pallets[`${ix},${iz}`] = pivot;
        allPalletList.push(pivot);
      }
    }

    const mobil = buatMobilGT();
    worldGroup.add(mobil);

    // Cincin gelombang kejut neon di bawah mobil saat tombol dipencet / getaran aktif
    const shockRing = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.62, 32),
      new THREE.MeshBasicMaterial({ color: 0x7c3aed, side: THREE.DoubleSide, transparent: true, opacity: 0.0 })
    );
    shockRing.rotation.x = -Math.PI / 2;
    worldGroup.add(shockRing);

    // Dasar lubang: warnanya sama dengan latar denah supaya perpindahannya menyambung
    const dasarLubang = new THREE.Mesh(
      new THREE.PlaneGeometry(STEP * 2, STEP * 2),
      new THREE.MeshBasicMaterial({ color: 0xf6f5f9, toneMapped: false })
    );
    dasarLubang.rotation.x = -Math.PI / 2;
    dasarLubang.position.y = -0.9;
    dasarLubang.visible = false;
    worldGroup.add(dasarLubang);

    const params = new URLSearchParams(location.search);
    const FIX = params.has('t') ? Number(params.get('t')) : null;
    const FORCE_OPEN = params.get('open') === '1';

    let isFocusedInput = false;
    let typingHold = FORCE_OPEN ? 999 : 0;
    let keyPulse = 0;
    let actionBurst = 0;
    let openSmooth = FORCE_OPEN ? 1.0 : 0.0;
    let extraCarPhase = 0;

    const isFormEl = (elTarget) => {
      if (!elTarget || !elTarget.tagName) return false;
      const tag = elTarget.tagName.toUpperCase();
      return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
    };

    const onFocusIn = (e) => {
      if (isFormEl(e.target)) {
        isFocusedInput = true;
        typingHold = Math.max(typingHold, 1.8);
        keyPulse = Math.min(keyPulse + 0.45, 1.2);
      }
    };
    const onFocusOut = (e) => {
      if (isFormEl(e.target)) {
        isFocusedInput = false;
      }
    };
    const onInputOrKey = (e) => {
      if (isFormEl(e.target) || isFocusedInput) {
        typingHold = 2.4;
        keyPulse = Math.min(keyPulse + 0.55, 1.5);
      }
    };
    let mulaiNyelam = -1;
    const onParkirAksi = (e) => {
      if (e?.detail?.aksi === 'nyelam') {
        mulaiNyelam = clock.getElapsedTime();
        return;
      }
      actionBurst = 1.6;
      typingHold = Math.max(typingHold, 2.2);
      keyPulse = 1.3;
    };

    window.addEventListener('focusin', onFocusIn);
    window.addEventListener('focusout', onFocusOut);
    window.addEventListener('input', onInputOrKey);
    window.addEventListener('keydown', onInputOrKey);
    window.addEventListener('parkir:aksi', onParkirAksi);

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
    let prevT = 0;

    const RING_PALLETS = [
      { key: '0.5,-0.5',  quadAngle: 1.75 * Math.PI, tiltSignX: -1, tiltSignZ:  1, idx: 0 },
      { key: '-0.5,-0.5', quadAngle: 1.25 * Math.PI, tiltSignX:  1, tiltSignZ: -1, idx: 1 },
      { key: '-0.5,0.5',  quadAngle: 0.75 * Math.PI, tiltSignX:  1, tiltSignZ:  1, idx: 2 },
      { key: '0.5,0.5',   quadAngle: 0.25 * Math.PI, tiltSignX: -1, tiltSignZ: -1, idx: 3 },
    ];

    const hitungSiklusUbin = (phase, winStart, winEnd, maxLift = 0.28) => {
      if (phase <= winStart || phase >= winEnd) {
        return { lift: 0, rot: 0, tilt: 0 };
      }
      const u = (phase - winStart) / (winEnd - winStart);
      const lift = smoothstep(0.0, 0.20, u) * (1.0 - smoothstep(0.80, 1.0, u)) * maxLift;
      let rot = 0;
      if (u < 0.18) rot = 0;
      else if (u < 0.45) rot = smoothstep(0.18, 0.45, u) * Math.PI;
      else if (u < 0.55) rot = Math.PI;
      else if (u < 0.82) rot = Math.PI + smoothstep(0.55, 0.82, u) * Math.PI;
      else rot = TAU;
      const tilt = Math.sin(u * TAU) * (lift / maxLift) * 0.065;
      return { lift, rot, tilt };
    };

    let raf;
    const loop = () => {
      const rawT = clock.getElapsedTime();
      const dt = Math.min(rawT - prevT, 0.05);
      prevT = rawT;
      const t = FIX ?? rawT;

      if (!FORCE_OPEN) {
        typingHold = Math.max(0, typingHold - dt);
        keyPulse = Math.max(0, keyPulse - dt * 2.4);
        actionBurst = Math.max(0, actionBurst - dt * 0.9);
      }

      const dive = mulaiNyelam < 0 ? 0 : Math.min(1, (rawT - mulaiNyelam) / 1.1);
      const diveCam = smoothstep(0.18, 1, dive);
      dasarLubang.visible = dive > 0;

      const targetOpen = dive === 0 && (FORCE_OPEN || isFocusedInput || typingHold > 0.05 || actionBurst > 0.05) ? 1.0 : 0.0;
      openSmooth += (targetOpen - openSmooth) * (FORCE_OPEN ? 1.0 : Math.min(1.0, dt * 6.5));
      uniforms.uGlobalOpen.value = openSmooth;

      extraCarPhase += dt * (openSmooth * 0.65 + keyPulse * 0.55 + actionBurst * 0.85);

      const omega = TAU / 8.5;
      const carAngle = t * omega + extraCarPhase + 0.65 * Math.PI;

      // 1. ANIMASI SELURUH UBIN LUAR
      for (const p of allPalletList) {
        const { ix, iz, distRing, seedPhase } = p.userData;
        if (distRing <= 0.8) continue;

        const localPhase = (((t * (TAU / 9.0) + seedPhase) % TAU) + TAU) % TAU;
        const cyc = hitungSiklusUbin(localPhase, 0.15 * TAU, 0.47 * TAU, 0.24);

        const wavePhase = t * 3.6 - distRing * 1.35 + (ix - iz) * 0.55;
        const wave = 0.5 + 0.5 * Math.sin(wavePhase);
        const typeLift = openSmooth * (0.04 + 0.07 * wave);
        const typeRot  = 0;

        const finalLift = Math.max(cyc.lift, typeLift);
        const finalRot  = cyc.rot + typeRot;
        const finalTiltX = cyc.tilt * (ix >= 0 ? 1 : -1) + openSmooth * Math.sin(wavePhase) * 0.015;
        const finalTiltZ = cyc.tilt * (iz >= 0 ? -1 : 1) + openSmooth * Math.cos(wavePhase) * 0.015;

        p.position.set(ix * STEP, finalLift, iz * STEP);
        p.rotation.set(finalTiltX, p.userData.baseRot + finalRot, finalTiltZ);
      }

      // 2. ANIMASI 4 UBIN TENGAH (rata saat mobil lewat)
      let bestSlab0 = { gx: 0.5 * STEP, y: 0, gz: -0.5 * STEP, w: 0, rot: 0 };
      let bestSlab1 = { gx: -0.5 * STEP, y: 0, gz: -0.5 * STEP, w: 0, rot: 0 };

      for (const item of RING_PALLETS) {
        const pObj = pallets[item.key];
        const { ix, iz } = pObj.userData;
        const phase = (((carAngle - item.quadAngle) % TAU) + TAU) % TAU;
        const cyc = hitungSiklusUbin(phase, 0.68 * Math.PI, 1.32 * Math.PI, 0.30);

        const typeLift = openSmooth * 0.07;
        const typeRot  = 0;

        const turun = smoothstep(item.idx * 0.07, 0.42 + item.idx * 0.07, dive) * 1.3;
        const liftY = Math.max(cyc.lift, typeLift) - turun;
        const rotY  = cyc.rot + typeRot;
        const tiltX = cyc.tilt * item.tiltSignX;
        const tiltZ = cyc.tilt * item.tiltSignZ;

        pObj.position.set(ix * STEP, liftY, iz * STEP);
        pObj.rotation.set(tiltX, pObj.userData.baseRot + rotY, tiltZ);

        const glowW = Math.max(cyc.lift / 0.30 * 1.35, openSmooth * 1.15);
        if (item.idx === 0 || (item.idx === 2 && liftY > bestSlab0.y)) {
          bestSlab0 = { gx: pObj.position.x, y: liftY, gz: pObj.position.z, w: glowW, rot: rotY };
        }
        if (item.idx === 1 || (item.idx === 3 && liftY > bestSlab1.y)) {
          bestSlab1 = { gx: pObj.position.x, y: liftY, gz: pObj.position.z, w: glowW, rot: rotY };
        }
      }

      uniforms.uSlab0.value.set(bestSlab0.gx, bestSlab0.y, bestSlab0.gz, bestSlab0.w);
      uniforms.uSlab1.value.set(bestSlab1.gx, bestSlab1.y, bestSlab1.gz, bestSlab1.w);
      uniforms.uSlabRot.value.set(bestSlab0.rot, bestSlab1.rot);

      // 3. MOBIL GT DI ATAS UBIN
      const vibeStrength = Math.min(1.0, openSmooth * 0.75 + keyPulse * 0.65 + actionBurst * 0.85);
      const cxCar = Math.cos(carAngle) * R_ARC;
      const czCar = Math.sin(carAngle) * R_ARC;
      const curKey = `${cxCar >= 0 ? 0.5 : -0.5},${czCar >= 0 ? 0.5 : -0.5}`;
      const curPallet = pallets[curKey];
      const palletLift = curPallet ? curPallet.position.y : 0;
      const palletTiltX = curPallet ? curPallet.rotation.x : 0;
      const palletTiltZ = curPallet ? curPallet.rotation.z : 0;

      // Getaran suspensi saat ada ketikan/aksi
      const suspBounce = Math.sin(t * 32.0) * 0.045 * vibeStrength + Math.abs(Math.cos(t * 18.0)) * 0.07 * actionBurst;
      const carY = palletLift - GD + 0.02 + suspBounce;

      // Drift ekor mobil ke luar tikungan saat getaran tinggi
      const driftYaw = Math.sin(t * 14.0) * 0.16 * vibeStrength + openSmooth * 0.22;
      const carPitch = palletTiltX * 0.85 + Math.sin(t * 24.0) * 0.08 * vibeStrength;
      const carRoll  = 0.15 + palletTiltZ * 0.85 + Math.cos(t * 20.0) * 0.12 * vibeStrength;

      mobil.position.set(cxCar, carY, czCar);
      mobil.rotation.set(carPitch, -carAngle - Math.PI / 2 + driftYaw, carRoll);
      uniforms.uCarGroupPos.value.set(cxCar, carY, czCar);

      // Gelombang kejut neon di bawah roda mobil saat tombol dipencet / ketikan aktif
      shockRing.position.set(cxCar, Math.max(0.02, carY + 0.02), czCar);
      const pulseScale = 1.0 + ((t * 3.5) % 1.0) * (1.4 + vibeStrength * 1.8);
      shockRing.scale.setScalar(pulseScale);
      shockRing.visible = dive === 0;
      shockRing.material.opacity = vibeStrength * (1.0 - ((t * 3.5) % 1.0)) * 0.75;

      for (const wMesh of mobil.userData.wheels) {
        wMesh.rotation.z = -(t * 7.0 + extraCarPhase * 6.5);
      }

      // 4. KAMERA mengikuti mouse
      camera.position.set(
        THREE.MathUtils.lerp(camBase.x + mouse.x * 0.65, WORLD_POS.x, diveCam),
        THREE.MathUtils.lerp(camBase.y - mouse.y * 0.40 + openSmooth * 0.25, -0.75, diveCam),
        THREE.MathUtils.lerp(camBase.z + openSmooth * 0.20, WORLD_POS.z + 0.04, diveCam)
      );
      camera.lookAt(
        THREE.MathUtils.lerp(lookTargetBase.x, WORLD_POS.x, diveCam),
        THREE.MathUtils.lerp(lookTargetBase.y, -4, diveCam),
        THREE.MathUtils.lerp(lookTargetBase.z, WORLD_POS.z, diveCam)
      );

      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('focusout', onFocusOut);
      window.removeEventListener('input', onInputOrKey);
      window.removeEventListener('keydown', onInputOrKey);
      window.removeEventListener('parkir:aksi', onParkirAksi);
      removeEventListener('mousemove', onMove);
      removeEventListener('resize', onResize);
      renderer.dispose();
      pmrem.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={ref} className="scene3d" />;
}
