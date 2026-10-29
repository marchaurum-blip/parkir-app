// Hero 3D Interaktif Penuh (Three.js - Calibrated Blender Shader + "Semua Kotak Kebuka" saat Mengetik/Aksi):
// - Mengikuti referensi g02, g04, g06, g08 secara presisi (pencahayaan grazing sun, bayangan parit,
//   bayangan jatuh memanjang, tekstur micro-terrazzo, dan garis lurus neon di bawah palet).
// - Terhubung penuh dengan UI:
//   * Saat user fokus / mengetik di input mana pun ("pas lagi ngetik, semua kotak itu kebuka"),
//     seluruh kotak palet di sekeliling panggung terangkat & membuka secara mekanis dengan pendaran
//     neon ungu-magenta di setiap tepi bawahnya, serta berdenyut mengikuti ketikan tombol!
//   * Saat login (Owner / Petugas / Admin), pindah menu, atau transaksi Masuk/Keluar, panggung 3D
//     merespons dengan gelombang pembukaan palet dan akselerasi mobil.
// Dibuat dengan bantuan Antigravity CLI.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const S = 2.90;        // Ukuran sisi palet persegi
const GAP = 0.022;     // Celah nat tipis antar palet
const STEP = S + GAP;  // Jarak antar pusat palet
const H = 0.92;        // Ketebalan palet
const R_ARC = 1.94;    // Jari-jari busur cekung dari sudut palet
const GW = 0.52;       // Setengah lebar parit cekung
const GD = 0.38;       // Kedalaman parit cekung
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
  const prof = (1 - nd * nd) * smoothstep(1.0, 0.72, nd);
  return -GD * prof;
}

function buatGeometriPalet(hasGroove = true) {
  const segXZ = hasGroove ? 96 : 8;
  const segY = hasGroove ? 18 : 2;
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

    const gDrop = hasGroove ? kedalamanParitLokal(x, z) : 0;

    const uy = (y + halfH) / H;
    const newY = -H + uy * (H + gDrop + edgeDrop);
    pos.setY(i, newY);

    if (ny0 > 0.5 && hasGroove) {
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
  uniform vec4 uSlab0; // Palet kanan (0.5, -0.5)
  uniform vec4 uSlab1; // Palet atas  (-0.5, -0.5)
  uniform vec2 uSlabRot;
  // Intensitas pembukaan seluruh kotak palet saat user mengetik / klik aksi ("semua kotak kebuka")
  uniform float uGlobalOpen;

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

  float sdRotBox2D(vec2 p, vec2 c, float ang, vec2 hs) {
    vec2 rel = p - c;
    float ca = cos(ang), sa = sin(-ang);
    vec2 q = abs(mat2(ca, -sa, sa, ca) * rel) - hs;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  }

  void main() {
    vec3 N = normalize(vWorldNorm);
    vec2 gXZ = toGroupXZ(vWorldPos.xz);

    float myLift = vWorldPos.y - vLocalPos.y;
    float isTopFace = step(0.5, vOrigNorm.y);
    float isSideWall = 1.0 - isTopFace;

    // 1. ARAH SINAR MATAHARI SUDUT RENDAH DARI KANAN-ATAS LAYAR MENUJU JAM 8:20 (KIRI-BAWAH):
    vec3 L = normalize(vec3(0.91, 0.32, -0.26));
    vec2 sunDirWorld = normalize(L.xz);
    float caG = cos(0.72), saG = sin(0.72);
    vec2 sunDirGroup = normalize(mat2(caG, -saG, saG, caG) * sunDirWorld);

    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 H = normalize(L + V);

    // 2. BAYANGAN TEGAS DI DALAM PARIT CEKUNG (GROOVE SELF-SHADOWING & TERMINATOR):
    float grooveDepth = clamp((-vLocalPos.y) / 0.38, 0.0, 1.0) * isTopFace;
    float inGroove = smoothstep(0.012, 0.11, grooveDepth);

    float slopeDot = dot(N.xz, sunDirWorld);
    float rimShadow = smoothstep(-0.04, 0.25, slopeDot);
    float sunWallBoost = smoothstep(0.08, 0.52, slopeDot) * inGroove;
    float grooveShadow = mix(1.0, rimShadow, inGroove);

    // 3. BAYANGAN JATUH MEMANJANG DARI MOBIL KE ARAH JAM 8:20 (-sunDirGroup):
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

    // 4. BAYANGAN JATUH DARI PALET YANG TERANGKAT KE LANTAI KIRI-BAWAHNYA:
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

    // 5. SPOTLIGHT DIAGONAL HANGAT DARI KANAN-ATAS KE TENGAH LINGKARAN:
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

    if (myLift > 0.02) {
      float topRim = smoothstep(0.028, 0.004, edgeDist) * smoothstep(-0.02, 0.0, vLocalPos.y);
      col = mix(col, vec3(1.0, 0.99, 1.0), topRim * 0.55);
    }

    // 6. TEKSTUR PROSEDURAL HIGH-DPI (MATTE PLASTER GRAIN + SHARP TERRAZZO SPECKLES):
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
      col = mix(col, dotCol, spMask * 0.78);
    }

    float spec = pow(clamp(dot(N, H), 0.0, 1.0), 28.0) * 0.22 * totalShadow * spotMask;
    col += vec3(1.0, 0.98, 0.96) * spec;

    float dCarG = length(gXZ - uCarGroupPos.xz);
    col += vec3(1.0, 0.76, 0.24) * exp(-dCarG * 2.3) * 0.32 * (0.25 + 0.75 * grooveDepth);

    // 7. GARIS LURUS NEON UNGU-MAGENTA DI BAWAH RUSUK PALET YANG TERANGKAT:
    float neonViolet = 0.0;
    float neonMagenta = 0.0;
    float neonCore = 0.0;

    for (int k = 0; k < 2; k++) {
      vec4 sl = (k == 0) ? uSlab0 : uSlab1;
      float rotK = (k == 0) ? uSlabRot.x : uSlabRot.y;

      if (sl.w > 0.01) {
        float sdBox = sdRotBox2D(gXZ, vec2(sl.x, sl.z), rotK, vec2(halfS));

        vec2 rel = gXZ - vec2(sl.x, sl.z);
        vec2 focusDir = (k == 1) ? normalize(vec2(0.32, 0.95)) : normalize(vec2(-0.62, 0.78));
        float sideFocus = 0.25 + 0.75 * smoothstep(-0.45, 0.55, dot(normalize(rel + vec2(1e-4)), focusDir));

        float isThisRaisedSlab = step(0.015, myLift) * (1.0 - step(0.08, abs(myLift - sl.y))) * step(abs(sdBox), 0.06);
        if (isThisRaisedSlab > 0.5 && isSideWall > 0.5) {
          float hAboveFloor = vWorldPos.y;
          float distTube = abs(hAboveFloor - 0.005);
          float maxWallH = sl.y * 0.34;
          float lowWallMask = 1.0 - smoothstep(maxWallH * 0.55, maxWallH, hAboveFloor);

          float barCore = exp(-distTube * 55.0) * lowWallMask * step(-0.08, hAboveFloor);
          float barMag  = exp(-distTube * 24.0) * lowWallMask * step(-0.20, hAboveFloor);
          float barViol = exp(-distTube * 11.0) * (1.0 - smoothstep(maxWallH * 0.8, maxWallH * 1.35, hAboveFloor)) * step(-0.32, hAboveFloor);

          neonCore    += barCore * sl.w * sideFocus * 1.65;
          neonMagenta += barMag  * sl.w * sideFocus * 1.40;
          neonViolet  += barViol * sl.w * sideFocus * 1.25;
        }

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

    // EFEK KHUSUS SAAT MENGETIK / AKSI ("SEMUA KOTAK ITU KEBUKA"):
    // Setiap kotak palet yang ikut terangkat (myLift > 0.018) menyalakan garis neon lurus di rusuk bawahnya
    // dan memendarkan cahaya ungu-magenta di celah nat antar kotak!
    if (uGlobalOpen > 0.01) {
      float liftStr = clamp(myLift * 4.5, 0.0, 1.35) * uGlobalOpen;
      if (isSideWall > 0.5 && myLift > 0.018) {
        float hAbove = vWorldPos.y;
        float dTube = abs(hAbove - 0.005);
        float maxWH = max(myLift * 0.38, 0.04);
        float wMask = 1.0 - smoothstep(maxWH * 0.5, maxWH, hAbove);
        neonCore    += exp(-dTube * 48.0) * wMask * liftStr * 1.45;
        neonMagenta += exp(-dTube * 20.0) * wMask * liftStr * 1.25;
        neonViolet  += exp(-dTube * 9.5)  * liftStr * 1.15;
      }
      // Pendaran neon di sepanjang garis nat (seam) semua kotak yang sedang terbuka
      float seamDist = max(edgeDist, 0.0);
      float radialMask = smoothstep(9.5, 1.5, length(gXZ));
      float seamGlow = uGlobalOpen * radialMask * (1.0 - step(0.10, myLift));
      neonCore    += exp(-seamDist * 42.0) * seamGlow * 0.85;
      neonMagenta += exp(-seamDist * 8.5)  * seamGlow * 0.95;
      neonViolet  += exp(-seamDist * 2.8)  * seamGlow * 1.05;
    }

    neonViolet  = clamp(neonViolet, 0.0, 1.0);
    neonMagenta = clamp(neonMagenta, 0.0, 1.0);
    neonCore    = clamp(neonCore, 0.0, 1.0);

    vec3 colViolet  = vec3(0.31, 0.05, 0.86);
    vec3 colMagenta = vec3(0.98, 0.07, 0.58);
    vec3 colCore    = vec3(1.00, 0.90, 1.00);

    col = mix(col, colViolet,  neonViolet * 0.90);
    col = mix(col, colMagenta, neonMagenta * 0.92);
    col = mix(col, colCore,    neonCore);

    if (uSlab1.w > 0.25 || uGlobalOpen > 0.3) {
      float bStr = max(uSlab1.w, uGlobalOpen * 0.85);
      vec2 beamOrigin = vec2(1.05, -0.45);
      vec2 beamDir = normalize(vec2(0.60, -0.80));
      vec2 toP = vWorldPos.xz - beamOrigin;
      float bAlong = dot(toP, beamDir);
      float bPerp  = length(toP - beamDir * bAlong);
      float beam = exp(-bPerp * bPerp * 3.8) * smoothstep(-0.8, 0.3, bAlong) * smoothstep(5.2, 0.6, bAlong);
      col = mix(col, vec3(1.0, 0.97, 1.0), beam * clamp(bStr * 0.45, 0.0, 0.48));
    }

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function buatMobilGT() {
  const root = new THREE.Group();

  const matGold = new THREE.MeshPhysicalMaterial({
    color: 0xfad161,
    metalness: 0.86,
    roughness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });
  const matCanopy = new THREE.MeshPhysicalMaterial({
    color: 0x1c1236,
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
  const matTaillight = new THREE.MeshBasicMaterial({ color: 0xff2a85 });

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

export default function Hero() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    let w = el.clientWidth, h = el.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbfb6df);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.75;

    const camera = new THREE.PerspectiveCamera(25, w / h, 0.1, 100);
    const camBase = new THREE.Vector3(0.05, 8.3, 8.1);
    const lookTarget = new THREE.Vector3(0.65, -0.20, 0.05);
    camera.position.copy(camBase);
    camera.lookAt(lookTarget);

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

    const geoGrooved = buatGeometriPalet(true);
    const geoFlat = buatGeometriPalet(false);

    const pallets = {};
    const allPalletList = [];
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
        pivot.add(mesh);

        pivot.rotation.y = baseRot;
        pivot.userData.baseRot = baseRot;
        pivot.userData.ix = ix;
        pivot.userData.iz = iz;
        pivot.userData.gx = ix * STEP;
        pivot.userData.gz = iz * STEP;
        pivot.userData.distRing = Math.hypot(ix, iz);
        worldGroup.add(pivot);

        pallets[`${ix},${iz}`] = pivot;
        allPalletList.push(pivot);
      }
    }

    const mobil = buatMobilGT();
    worldGroup.add(mobil);

    const params = new URLSearchParams(location.search);
    const FIX = params.has('t') ? Number(params.get('t')) : null;
    const FORCE_OPEN = params.get('open') === '1';

    // State interaktif yang menghubungkan seluruh input & tombol UI dengan panggung 3D:
    // - isFocusedInput: aktif saat kursor berada di dalam input/select/textarea
    // - typingHold: bertahan beberapa saat setiap kali user mengetik karakter ("pas lagi ngetik, semua kotak itu kebuka")
    // - keyPulse: denyut gelombang mekanis setiap ketikan tombol
    // - actionBurst: gelombang besar saat login (Owner/Petugas/Admin), pindah tab, atau simpan transaksi
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
    const onParkirAksi = () => {
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

    const animasikanPalet = (key, liftY, extraRotY, tiltX = 0, tiltZ = 0) => {
      const p = pallets[key];
      if (!p) return;
      p.position.y = liftY;
      p.rotation.set(tiltX, p.userData.baseRot + extraRotY, tiltZ);
    };

    const RING_PALLETS = [
      { key: '0.5,-0.5',  quadAngle: 1.75 * Math.PI, tiltSignX: -1, tiltSignZ:  1, idx: 0 },
      { key: '-0.5,-0.5', quadAngle: 0.90 * Math.PI, tiltSignX:  1, tiltSignZ: -1, idx: 1 },
    ];

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

      const targetOpen = (FORCE_OPEN || isFocusedInput || typingHold > 0.05 || actionBurst > 0.05) ? 1.0 : 0.0;
      openSmooth += (targetOpen - openSmooth) * (FORCE_OPEN ? 1.0 : Math.min(1.0, dt * 6.5));
      uniforms.uGlobalOpen.value = openSmooth;

      // Saat user mengetik / klik aksi, mobil juga berakselerasi lebih gesit
      extraCarPhase += dt * (openSmooth * 0.65 + keyPulse * 0.55 + actionBurst * 0.85);

      const omega = TAU / 8.0;
      const carAngle = t * omega + extraCarPhase + 0.65 * Math.PI;

      // 1. Jika openSmooth > 0.01 ("PAS LAGI NGETIK, SEMUA KOTAK ITU KEBUKA"):
      //    Seluruh kotak palet di panggung (termasuk ring tengah & sekelilingnya) membuka/terangkat
      //    secara mekanis membentuk gelombang radial dengan celah neon ungu-magenta menyala!
      if (openSmooth > 0.005) {
        for (const p of allPalletList) {
          const { ix, iz, distRing } = p.userData;
          // Jaga palet di pojok kiri-atas belakang teks agar tidak menabrak teks judul
          const inStage = distRing <= 2.65 && !(ix < -1.2 && iz > 0.8);
          if (inStage) {
            const wavePhase = t * 3.8 - distRing * 1.45 + (ix - iz) * 0.55;
            const wave = 0.5 + 0.5 * Math.sin(wavePhase);
            const pulseAdd = keyPulse * 0.12 * Math.cos(distRing * 2.0 - rawT * 8.0);
            const openLift = openSmooth * (0.14 + 0.16 * wave + Math.max(0, pulseAdd));
            const openTiltX = openSmooth * Math.sin(wavePhase) * 0.075 * (ix >= 0 ? 1 : -1);
            const openTiltZ = openSmooth * Math.cos(wavePhase) * 0.075 * (iz >= 0 ? -1 : 1);
            // Kotak-kotak di bagian kanan/atas juga sedikit berputar membuka saat mengetik
            const openRot = (distRing > 1.0 && ix >= -0.5 && iz <= 0.5)
              ? openSmooth * Math.sin(t * 2.0 + ix + iz) * 0.28
              : 0;
            p.position.y = openLift;
            p.rotation.set(openTiltX, p.userData.baseRot + openRot, openTiltZ);
          } else {
            p.position.y = 0;
            p.rotation.set(0, p.userData.baseRot, 0);
          }
        }
      } else {
        for (const p of allPalletList) {
          if (p.userData.distRing > 0.8) {
            p.position.y = 0;
            p.rotation.set(0, p.userData.baseRot, 0);
          }
        }
      }

      // 2. Siklus mekanis utama untuk 2 palet parit cekung (tetap aktif & berpadu mulus dengan efek ketikan):
      const rotVec = [0, 0];

      for (const item of RING_PALLETS) {
        const phase = (((carAngle - item.quadAngle) % TAU) + TAU) % TAU;
        const winStart = 0.58 * Math.PI;
        const winEnd = 1.30 * Math.PI;
        const pObj = pallets[item.key];
        const uSlot = item.idx === 0 ? 'uSlab0' : 'uSlab1';

        if (phase > winStart && phase < winEnd) {
          const u = (phase - winStart) / (winEnd - winStart);

          const liftProfile = smoothstep(0.0, 0.22, u) * (1.0 - smoothstep(0.78, 1.0, u));
          const liftY = Math.max(pObj.position.y, liftProfile * 0.30 + openSmooth * 0.08);

          let rot = 0;
          if (u < 0.20) {
            rot = 0;
          } else if (u < 0.44) {
            rot = smoothstep(0.20, 0.44, u) * Math.PI;
          } else if (u < 0.58) {
            rot = Math.PI;
          } else if (u < 0.80) {
            rot = Math.PI + smoothstep(0.58, 0.80, u) * Math.PI;
          } else {
            rot = TAU;
          }

          const tilt = Math.sin(u * TAU) * liftProfile * 0.08;
          animasikanPalet(item.key, liftY, rot, tilt * item.tiltSignX, tilt * item.tiltSignZ);
          uniforms[uSlot].value.set(pObj.userData.gx, liftY, pObj.userData.gz, Math.max(liftProfile * 1.30, openSmooth * 1.25));
          rotVec[item.idx] = rot;
        } else {
          if (item.key === '0.5,-0.5') {
            const baseStep = 0.095 + openSmooth * 0.16;
            const liftY = Math.max(pObj.position.y, baseStep);
            const rotOpen = openSmooth > 0.1 ? Math.sin(t * 2.6) * openSmooth * 0.35 : 0;
            animasikanPalet(item.key, liftY, rotOpen, pObj.rotation.x, pObj.rotation.z);
            uniforms[uSlot].value.set(pObj.userData.gx, liftY, pObj.userData.gz, 0.22 + openSmooth * 1.10);
            rotVec[item.idx] = rotOpen;
          } else {
            const liftY = Math.max(pObj.position.y, openSmooth * 0.24);
            const rotOpen = openSmooth > 0.1 ? -Math.cos(t * 2.6) * openSmooth * 0.35 : 0;
            animasikanPalet(item.key, liftY, rotOpen, pObj.rotation.x, pObj.rotation.z);
            uniforms[uSlot].value.set(pObj.userData.gx, liftY, pObj.userData.gz, openSmooth * 1.15);
            rotVec[item.idx] = rotOpen;
          }
        }
      }

      uniforms.uSlabRot.value.set(rotVec[0], rotVec[1]);

      const cxCar = Math.cos(carAngle) * R_ARC;
      const czCar = Math.sin(carAngle) * R_ARC;

      const curKey = `${cxCar >= 0 ? 0.5 : -0.5},${czCar >= 0 ? 0.5 : -0.5}`;
      const curPallet = pallets[curKey];
      const palletLift = curPallet ? curPallet.position.y : 0;

      mobil.position.set(cxCar, palletLift - GD + 0.02, czCar);
      const tangentYaw = -carAngle - Math.PI / 2;
      mobil.rotation.set(0, tangentYaw, 0.15);

      uniforms.uCarGroupPos.value.set(cxCar, palletLift - GD + 0.02, czCar);

      for (const wMesh of mobil.userData.wheels) {
        wMesh.rotation.z = -(t * 7.0 + extraCarPhase * 4.0);
      }

      camera.position.set(
        camBase.x + mouse.x * 0.65,
        camBase.y - mouse.y * 0.40 + openSmooth * 0.25,
        camBase.z + openSmooth * 0.20
      );
      camera.lookAt(lookTarget);

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
