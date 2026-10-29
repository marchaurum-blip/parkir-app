// Hero 3D (Three.js - Rich Color Grading, Iridescent Crystal Prism Wings, Headlight Beams,
// Floating Sparkles, & Cyclic Rotating Groove Pallets + Detailed GT Supercar):
// Menggabungkan seluruh elemen visual terbaik dari video referensi (g01..g09).
// Dibuat dengan bantuan Antigravity CLI.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const S = 2.90;
const GAP = 0.022;
const STEP = S + GAP;
const H = 0.68;
const R_ARC = 1.94;
const GW = 0.50;
const GD = 0.36;
const TAU = Math.PI * 2;

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Tekstur keramik berbintik halus (speckled terrazzo) dengan variasi warna ungu/emas mikro
function buatTeksturKeramik() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 520; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 0.6 + Math.random() * 1.35;
    ctx.fillStyle =
      i % 4 === 0
        ? 'rgba(52, 36, 98, 0.48)'
        : i % 4 === 1
        ? 'rgba(124, 58, 237, 0.32)'
        : 'rgba(100, 88, 145, 0.28)';
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
  const prof = (1 - nd * nd) * smoothstep(1.0, 0.74, nd);
  return -GD * prof;
}

function buatGeometriPalet(hasGroove = true) {
  const segXZ = hasGroove ? 88 : 6;
  const segY = hasGroove ? 10 : 2;
  const geo = new THREE.BoxGeometry(S, H, S, segXZ, segY, segXZ);

  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  const halfH = H / 2;
  const bevelEdge = 0.030;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx0 = norm.getX(i);
    const ny0 = norm.getY(i);
    const nz0 = norm.getZ(i);

    const dxEdge = Math.max(0, Math.abs(x) - (S / 2 - bevelEdge)) / bevelEdge;
    const dzEdge = Math.max(0, Math.abs(z) - (S / 2 - bevelEdge)) / bevelEdge;
    const edgeDrop = -0.014 * (dxEdge * dxEdge + dzEdge * dzEdge);

    const gDrop = hasGroove ? kedalamanParitLokal(x, z) : 0;

    const uy = (y + halfH) / H;
    const newY = -halfH + uy * (H + gDrop + edgeDrop);
    pos.setY(i, newY);

    if (ny0 > 0.5 && hasGroove) {
      const eps = 0.010;
      const hC = gDrop + edgeDrop;
      const hX = kedalamanParitLokal(x + eps, z) + edgeDrop;
      const hZ = kedalamanParitLokal(x, z + eps) + edgeDrop;
      const gx = ((hC - hX) / eps) * 1.42;
      const gz = ((hC - hZ) / eps) * 1.42;
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

// Material PBR Palet dengan color-grading kaya:
// Warm Peach-Cream Sunlight + Deep Periwinkle Shadows + Dual-Tone Cyber Violet & Hot Magenta Neon
// + Sorotan lampu depan mobil (Headlight Cone) di dalam parit cekung!
function buatMaterialPalet(texKeramik, neonUniforms) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xfffdff,
    map: texKeramik,
    roughness: 0.44,
    metalness: 0.04,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uCarWorldPos = neonUniforms.uCarWorldPos;
    shader.uniforms.uCarWorldDir = neonUniforms.uCarWorldDir;
    shader.uniforms.uNeonPos0 = neonUniforms.uNeonPos0;
    shader.uniforms.uNeonPos1 = neonUniforms.uNeonPos1;
    shader.uniforms.uNeonStr0 = neonUniforms.uNeonStr0;
    shader.uniforms.uNeonStr1 = neonUniforms.uNeonStr1;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        varying vec3 vWorldPosition;
        varying vec3 vLocalPosition;
        varying vec3 vOrigNormal;
        `
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `
        #include <begin_vertex>
        vLocalPosition = position;
        vOrigNormal = normal;
        vec4 wpCustom = modelMatrix * vec4(position, 1.0);
        vWorldPosition = wpCustom.xyz;
        `
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        varying vec3 vWorldPosition;
        varying vec3 vLocalPosition;
        varying vec3 vOrigNormal;
        uniform vec3 uCarWorldPos;
        uniform vec3 uCarWorldDir;
        uniform vec3 uNeonPos0;
        uniform vec3 uNeonPos1;
        uniform float uNeonStr0;
        uniform float uNeonStr1;
        `
      )
      .replace(
        '#include <dithering_fragment>',
        /* glsl */ `
        // 1. Gradasi sinematik (Warm Peach-Cream di pusat kanan-atas vs Deep Lavender di kiri/bawah):
        vec2 spotCenter = vec2(3.1, -1.5);
        float distSpot = length((vWorldPosition.xz - spotCenter) * vec2(0.40, 0.56));
        float vignette = smoothstep(8.4, 1.0, distSpot);
        vec3 shadowTint = vec3(0.73, 0.69, 0.89);
        vec3 warmHighlight = vec3(1.04, 0.99, 0.96);
        gl_FragColor.rgb = mix(gl_FragColor.rgb * shadowTint, gl_FragColor.rgb * warmHighlight, 0.26 + 0.74 * vignette);

        // 2. Kontras dalam parit cekung (Crevice AO + sentuhan warna lavender-indigo di dasar parit):
        float grooveDepthFactor = clamp((-vLocalPosition.y) / 0.36, 0.0, 1.0);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * vec3(0.80, 0.75, 0.94), grooveDepthFactor * 0.50);

        // 3. Pantulan emas hangat dari bodi mobil + Sorotan lampu depan (Headlight Beam) & lampu belakang (Taillight Red-Pink):
        vec3 toFrag = vWorldPosition - uCarWorldPos;
        float dCar = length(toFrag);
        float carBounce = exp(-dCar * 2.0) * 0.34 * (0.3 + 0.7 * grooveDepthFactor);
        gl_FragColor.rgb += vec3(1.0, 0.76, 0.25) * carBounce;

        // Kerucut sorotan lampu depan mobil di sepanjang parit di depannya
        vec2 dir2D = normalize(uCarWorldDir.xz + vec2(1e-5));
        float forwardProj = dot(toFrag.xz, dir2D);
        float sideProj = abs(dot(toFrag.xz, vec2(-dir2D.y, dir2D.x)));
        float headlightCone = smoothstep(0.1, 1.8, forwardProj) * (1.0 - smoothstep(1.8, 3.8, forwardProj))
                            * exp(-sideProj * sideProj * 9.0) * (0.3 + 0.7 * grooveDepthFactor);
        gl_FragColor.rgb += vec3(1.0, 0.94, 0.76) * headlightCone * 0.32;

        // Pendaran merah-magenta di belakang mobil dari lampu belakang LED
        float tailProj = dot(toFrag.xz, -dir2D);
        float tailGlow = smoothstep(0.0, 0.9, tailProj) * (1.0 - smoothstep(0.9, 2.0, tailProj))
                       * exp(-sideProj * sideProj * 12.0) * (0.4 + 0.6 * grooveDepthFactor);
        gl_FragColor.rgb += vec3(1.0, 0.15, 0.55) * tailGlow * 0.28;

        // 4. Pendaran NEON UNGU-MAGENTA-CYAN di celah bawah palet yang terangkat:
        float dN0 = length(vWorldPosition.xz - uNeonPos0.xz);
        float dN1 = length(vWorldPosition.xz - uNeonPos1.xz);

        float isSideWall = step(abs(vOrigNormal.y), 0.5);
        float bottomMask = smoothstep(0.06, -0.26, vLocalPosition.y);
        float raisedMask = smoothstep(0.02, 0.16, vWorldPosition.y + 0.18);

        float sideNeon0 = isSideWall * bottomMask * raisedMask * exp(-dN0 * 0.85) * uNeonStr0;
        float sideNeon1 = isSideWall * bottomMask * raisedMask * exp(-dN1 * 0.85) * uNeonStr1;

        float floorMask = smoothstep(0.18, -0.02, vWorldPosition.y);
        float ringGlow0 = floorMask * exp(-abs(dN0 - 1.35) * 2.0) * uNeonStr0 * 0.92;
        float ringGlow1 = floorMask * exp(-abs(dN1 - 1.35) * 2.0) * uNeonStr1 * 0.92;

        float totalNeon = clamp(sideNeon0 + sideNeon1 + ringGlow0 + ringGlow1, 0.0, 1.7);
        vec3 colIndigo  = vec3(0.38, 0.12, 0.96);
        vec3 colMagenta = vec3(0.98, 0.15, 0.90);
        vec3 colHotPink = vec3(1.00, 0.78, 1.00);
        vec3 neonCol = mix(colIndigo, colMagenta, clamp(totalNeon * 0.72, 0.0, 1.0));

        gl_FragColor.rgb = mix(gl_FragColor.rgb, neonCol, clamp(totalNeon * 0.82, 0.0, 0.90));
        float hotCore = clamp((sideNeon0 + sideNeon1) * 1.2, 0.0, 0.96);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, colHotPink, hotCore);

        #include <dithering_fragment>
        `
      );
  };

  return mat;
}

// Mobil konsep GT Supercar 3D yang diperkaya dengan warna dua-nada (Liquid Gold & Deep Amethyst),
// garis balap ungu metalik, velg bintang emas, serta lampu LED depan & belakang menyala.
function buatMobilGT() {
  const root = new THREE.Group();

  const matBody = new THREE.MeshPhysicalMaterial({
    color: 0xffcf54,
    metalness: 0.82,
    roughness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });
  const matStripe = new THREE.MeshPhysicalMaterial({
    color: 0x5b21b6,
    metalness: 0.65,
    roughness: 0.18,
    clearcoat: 1.0,
  });
  const matGlass = new THREE.MeshPhysicalMaterial({
    color: 0x150f2e,
    metalness: 0.30,
    roughness: 0.05,
    clearcoat: 1.0,
  });
  const matCarbon = new THREE.MeshStandardMaterial({
    color: 0x1b1433,
    metalness: 0.55,
    roughness: 0.32,
  });
  const matRimGold = new THREE.MeshStandardMaterial({
    color: 0xffe89e,
    metalness: 0.92,
    roughness: 0.15,
  });
  const matHeadlight = new THREE.MeshBasicMaterial({ color: 0xfffef0 });
  const matTaillight = new THREE.MeshBasicMaterial({ color: 0xff1a75 });
  const matNeonUnderglow = new THREE.MeshBasicMaterial({ color: 0xc026d3 });

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
    depth: 0.14,
    bevelEnabled: true,
    bevelSegments: 12,
    steps: 1,
    bevelSize: 0.11,
    bevelThickness: 0.12,
  });
  geoHull.rotateX(Math.PI / 2);
  geoHull.center();
  const hull = new THREE.Mesh(geoHull, matBody);
  hull.position.y = 0.24;
  hull.castShadow = true;
  hull.receiveShadow = true;
  root.add(hull);

  // Aksen garis tengah ungu amethyst di kap mesin & buritan
  const hoodStripe = new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.03, 0.18, 3, 0.01), matStripe);
  hoodStripe.position.set(0.56, 0.355, 0);
  root.add(hoodStripe);

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
  cabin.position.set(-0.14, 0.39, 0);
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
  roof.position.set(-0.22, 0.49, 0);
  roof.castShadow = true;
  root.add(roof);

  // Spoiler belakang & Underglow tipis
  const spoiler = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.04, 0.76, 3, 0.015), matStripe);
  spoiler.position.set(-0.98, 0.37, 0);
  root.add(spoiler);

  const underglow = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.02, 0.72, 2, 0.01), matNeonUnderglow);
  underglow.position.set(0, 0.09, 0);
  root.add(underglow);

  for (const z of [-0.28, 0.28]) {
    const hl = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.045, 0.13, 2, 0.015), matHeadlight);
    hl.position.set(0.98, 0.25, z);
    hl.rotation.y = z > 0 ? -0.32 : 0.32;
    root.add(hl);
  }
  const tl = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.05, 0.68, 2, 0.015), matTaillight);
  tl.position.set(-1.07, 0.27, 0);
  root.add(tl);

  const geoTire = new THREE.CylinderGeometry(0.19, 0.19, 0.14, 24);
  geoTire.rotateX(Math.PI / 2);
  const geoRim = new THREE.CylinderGeometry(0.12, 0.12, 0.15, 12);
  geoRim.rotateX(Math.PI / 2);
  const wheels = [];
  for (const x of [-0.62, 0.62]) {
    for (const z of [-0.45, 0.45]) {
      const wg = new THREE.Group();
      const w = new THREE.Mesh(geoTire, matCarbon);
      const r = new THREE.Mesh(geoRim, matRimGold);
      w.castShadow = true;
      wg.add(w, r);
      wg.position.set(x, 0.19, z);
      root.add(wg);
      wheels.push(wg);
    }
  }

  root.scale.setScalar(0.46);
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
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xc4bce4);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.42;

    const camera = new THREE.PerspectiveCamera(25, w / h, 0.1, 100);
    const camBase = new THREE.Vector3(0.05, 8.3, 8.1);
    const lookTarget = new THREE.Vector3(0.65, -0.20, 0.05);
    camera.position.copy(camBase);
    camera.lookAt(lookTarget);

    const hemi = new THREE.HemisphereLight(0xdcd4f8, 0x7a6eb2, 0.74);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff4e8, 3.6);
    sun.position.set(10.5, 4.1, 1.8);
    sun.target.position.set(1.8, 0, 0.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 28;
    const dCam = 9.0;
    sun.shadow.camera.left = -dCam;
    sun.shadow.camera.right = dCam;
    sun.shadow.camera.top = dCam;
    sun.shadow.camera.bottom = -dCam;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.018;
    scene.add(sun, sun.target);

    const worldGroup = new THREE.Group();
    worldGroup.position.set(2.38, 0, 0.15);
    worldGroup.rotation.y = -0.72;
    scene.add(worldGroup);

    const neonUniforms = {
      uCarWorldPos: { value: new THREE.Vector3() },
      uCarWorldDir: { value: new THREE.Vector3(1, 0, 0) },
      uNeonPos0: { value: new THREE.Vector3() },
      uNeonPos1: { value: new THREE.Vector3() },
      uNeonStr0: { value: 0.0 },
      uNeonStr1: { value: 0.0 },
    };

    const texKeramik = buatTeksturKeramik();
    const matPallet = buatMaterialPalet(texKeramik, neonUniforms);

    const geoGrooved = buatGeometriPalet(true);
    const geoFlat = buatGeometriPalet(false);

    const matNeonFloor = new THREE.MeshBasicMaterial({ color: 0xe026ff });
    const neonBase = new THREE.Mesh(new THREE.PlaneGeometry(STEP * 3.2, STEP * 3.2), matNeonFloor);
    neonBase.rotation.x = -Math.PI / 2;
    neonBase.position.y = -H + 0.02;
    worldGroup.add(neonBase);

    // Material sayap kaca kristal iridescent (muncul di tepi palet saat berputar seperti di g01.jpg & g04.jpg)
    const matPrismGlass = new THREE.MeshPhysicalMaterial({
      color: 0xf5d0fe,
      emissive: 0xa21caf,
      emissiveIntensity: 0.35,
      transmission: 0.86,
      transparent: true,
      opacity: 0.92,
      roughness: 0.10,
      ior: 1.48,
      thickness: 0.5,
      clearcoat: 1.0,
    });

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

        // Panel sirip kaca kristal (crystal fin) di bawah tepi palet aktif
        if (hasGroove && !(ix === -0.5 && iz === 0.5)) {
          const prismFin = new THREE.Mesh(new RoundedBoxGeometry(S * 0.92, 0.04, 0.55, 3, 0.015), matPrismGlass);
          prismFin.position.set(0, -0.18, -S / 2 + 0.15);
          prismFin.rotation.x = 0.45;
          prismFin.visible = false;
          pivot.add(prismFin);
          pivot.userData.prismFin = prismFin;
        }

        pivot.rotation.y = baseRot;
        pivot.userData.baseRot = baseRot;
        worldGroup.add(pivot);

        pallets[`${ix},${iz}`] = pivot;
      }
    }

    const mobil = buatMobilGT();
    worldGroup.add(mobil);

    // Partikel debu kristal melayang lembut di udara (floating sparkles)
    const pCount = 90;
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.35) * 14;
      pPos[i * 3 + 1] = 0.2 + Math.random() * 2.8;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    const geoSparkle = new THREE.BufferGeometry();
    geoSparkle.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const matSparkle = new THREE.PointsMaterial({
      color: 0xf5d0fe,
      size: 0.045,
      transparent: true,
      opacity: 0.65,
    });
    const sparkles = new THREE.Points(geoSparkle, matSparkle);
    scene.add(sparkles);

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
      p.position.y = liftAmount * 0.35;
      p.rotation.set(tiltX, p.userData.baseRot + extraRotY, tiltZ);
      if (p.userData.prismFin) {
        p.userData.prismFin.visible = liftAmount > 0.12;
        p.userData.prismFin.scale.setScalar(Math.min(1, liftAmount * 1.4));
      }
    };

    const RING_PALLETS = [
      { key: '0.5,0.5',   quadAngle: 0.25 * Math.PI, tiltSignX: -1, tiltSignZ: -1 },
      { key: '-0.5,-0.5', quadAngle: 1.25 * Math.PI, tiltSignX:  1, tiltSignZ: -1 },
      { key: '0.5,-0.5',  quadAngle: 1.75 * Math.PI, tiltSignX: -1, tiltSignZ:  1 },
    ];

    const tmpVec = new THREE.Vector3();
    const nextVec = new THREE.Vector3();
    let raf;
    const loop = () => {
      const t = FIX ?? clock.getElapsedTime();

      const omega = TAU / 8.0;
      const carAngle = t * omega + 0.65 * Math.PI;

      const activeNeons = [];
      for (const item of RING_PALLETS) {
        const phase = (((carAngle - item.quadAngle) % TAU) + TAU) % TAU;
        const winStart = 0.65 * Math.PI;
        const winEnd = 1.55 * Math.PI;

        if (phase > winStart && phase < winEnd) {
          const u = (phase - winStart) / (winEnd - winStart);
          const s = Math.sin(u * Math.PI);
          const lift = s * s;

          let rot = 0;
          if (u < 0.42) {
            rot = smoothstep(0.0, 0.42, u) * Math.PI;
          } else if (u < 0.58) {
            rot = Math.PI;
          } else {
            rot = Math.PI + smoothstep(0.58, 1.0, u) * Math.PI;
          }

          const tilt = Math.sin(u * TAU) * s * 0.14;
          animasikanPalet(item.key, lift, rot, tilt * item.tiltSignX, tilt * item.tiltSignZ);

          const pObj = pallets[item.key];
          pObj.getWorldPosition(tmpVec);
          activeNeons.push({ pos: tmpVec.clone(), str: lift * 1.45 });
        } else {
          if (item.key === '0.5,-0.5') {
            const edgeDist = Math.min(Math.abs(phase - winStart), Math.abs(phase - winEnd));
            const subtleStep = smoothstep(0.0, 0.35, edgeDist) * 0.24;
            animasikanPalet(item.key, subtleStep, 0, 0, 0);
            const pObj = pallets[item.key];
            pObj.getWorldPosition(tmpVec);
            activeNeons.push({ pos: tmpVec.clone(), str: subtleStep * 1.45 });
          } else {
            animasikanPalet(item.key, 0, 0, 0, 0);
          }
        }
      }

      activeNeons.sort((a, b) => b.str - a.str);
      if (activeNeons[0]) {
        neonUniforms.uNeonPos0.value.copy(activeNeons[0].pos);
        neonUniforms.uNeonStr0.value = activeNeons[0].str;
      } else {
        neonUniforms.uNeonStr0.value = 0;
      }
      if (activeNeons[1]) {
        neonUniforms.uNeonPos1.value.copy(activeNeons[1].pos);
        neonUniforms.uNeonStr1.value = activeNeons[1].str;
      } else {
        neonUniforms.uNeonStr1.value = 0;
      }

      const cxCar = Math.cos(carAngle) * R_ARC;
      const czCar = Math.sin(carAngle) * R_ARC;
      const cxNext = Math.cos(carAngle + 0.05) * R_ARC;
      const czNext = Math.sin(carAngle + 0.05) * R_ARC;

      const curKey = `${cxCar >= 0 ? 0.5 : -0.5},${czCar >= 0 ? 0.5 : -0.5}`;
      const curPallet = pallets[curKey];
      const palletLift = curPallet ? curPallet.position.y : 0;

      mobil.position.set(cxCar, palletLift - GD + 0.03, czCar);
      const tangentYaw = -carAngle - Math.PI / 2;
      mobil.rotation.set(0, tangentYaw, 0.16);

      mobil.getWorldPosition(neonUniforms.uCarWorldPos.value);
      nextVec.set(cxNext, palletLift - GD + 0.03, czNext);
      worldGroup.localToWorld(nextVec);
      neonUniforms.uCarWorldDir.value.subVectors(nextVec, neonUniforms.uCarWorldPos.value).normalize();

      for (const wMesh of mobil.userData.wheels) {
        wMesh.rotation.z = -t * 7.0;
      }

      sparkles.rotation.y = t * 0.04;

      camera.position.set(
        camBase.x + mouse.x * 0.65,
        camBase.y - mouse.y * 0.40,
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
