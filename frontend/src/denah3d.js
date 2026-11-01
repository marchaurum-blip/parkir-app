// Denah basement parkir (Three.js). Render hanya saat ada perubahan supaya ringan.
// Database hanya menyimpan jumlah per area, jadi posisi slot di sini tampilan saja:
// jumlah terisinya asli, urutan slotnya tetap tapi bukan posisi nyata di lapangan.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const WARNA = {
  latar: 0xf6f5f9, pelat: 0xffffff, dinding: 0xeeecf4,
  terisi: 0xe4e1ec, tersedia: 0xa78bfa, sorot: 0x6d28d9,
  bodi: 0x2b2640, kaca: 0x5a5474, teks: '#1b1830',
};
const JALUR = 2.3;   // lebar jalan antar baris
const JARAK = 3;     // jarak antar area
const TEPI = 0.9;    // sisa pelat di sekeliling slot

const ukuranSlot = (nama) => {
  if (/motor/i.test(nama)) return { w: 0.74, d: 1.55, h: 0.4, motor: true };
  if (/besar|truk|lain/i.test(nama)) return { w: 1.9, d: 3.9, h: 0.85 };
  return { w: 1.3, d: 2.6, h: 0.48 };
};

// Urutan isi slot yang tersebar tapi selalu sama untuk area yang sama
const urutanSlot = (jumlah) =>
  [...Array(jumlah).keys()].sort((a, b) => ((a + 1) * 2654435761 >>> 7) % 1009 - ((b + 1) * 2654435761 >>> 7) % 1009);

// Hitung posisi semua slot. Dipakai 3D dan denah 2D cadangan.
export function tataZona(areas, kendaraan) {
  let x = 0;
  const zona = areas.map((a, i) => {
    const u = ukuranSlot(a.nama_area);
    const kap = Math.max(Number(a.kapasitas) || 0, 0);
    const kolom = Math.max(3, Math.ceil(Math.sqrt((kap * u.d * 1.6) / u.w)));
    const baris = Math.max(1, Math.ceil(kap / kolom));
    const lebar = kolom * u.w;
    const dalam = baris * u.d + Math.floor(baris / 2) * JALUR;
    const huruf = String.fromCharCode(65 + i);
    const urutan = urutanSlot(kap);
    const milikArea = kendaraan.filter((k) => k.id_area === a.id_area)
      .sort((p, q) => new Date(p.waktu_masuk) - new Date(q.waktu_masuk));
    const isi = new Map();
    urutan.slice(0, Math.min(a.terisi, kap)).forEach((n, idx) => isi.set(n, milikArea[idx] || {}));
    const slot = [...Array(kap).keys()].map((n) => {
      const r = Math.floor(n / kolom);
      return {
        kode: `${huruf}-${n + 1}`, terisi: isi.has(n), kendaraan: isi.get(n) || null, balik: r % 2 === 1,
        x: x + TEPI + ((n % kolom) + 0.5) * u.w,
        z: r * u.d + Math.floor((r + 1) / 2) * JALUR + u.d / 2,
      };
    });
    const z = { area: a, huruf, u, slot, kolom, x0: x, lebar: lebar + TEPI * 2, dalam };
    x += z.lebar + JARAK;
    return z;
  });
  const dalamMaks = Math.max(0, ...zona.map((z) => z.dalam));
  const lebarTotal = x - JARAK;
  zona.forEach((z) => {
    z.x0 -= lebarTotal / 2;
    z.z0 = -z.dalam / 2;
    z.slot.forEach((s) => { s.x -= lebarTotal / 2; s.z -= z.dalam / 2; });
  });
  return { zona, lebarTotal, dalamMaks };
}

function labelLantai(z) {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 128;
  const c = cv.getContext('2d');
  c.font = '600 56px Inter, system-ui, sans-serif';
  c.fillStyle = WARNA.teks;
  c.textBaseline = 'middle';
  const teks = `${z.huruf}   ${z.area.nama_area}`;
  c.fillText(teks, 8, 68);
  const lebarTeks = Math.min(c.measureText(teks).width + 16, 1024);
  const peta = new THREE.CanvasTexture(cv);
  peta.colorSpace = THREE.SRGBColorSpace;
  peta.anisotropy = 8;
  const tinggi = Math.min(1.25, ((z.lebar - 1.4) * 128) / lebarTeks);
  const lebar = (tinggi * 1024) / 128;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(lebar, tinggi),
    new THREE.MeshBasicMaterial({ map: peta, transparent: true, toneMapped: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(z.x0 + 0.7 + lebar / 2, 0.02, z.z0 + z.dalam + 1.6);
  return m;
}

export function buatDenah(el, { onHover }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(WARNA.latar);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d4ea, 2.3));
  const matahari = new THREE.DirectionalLight(0xffffff, 1.5);
  matahari.castShadow = true;
  matahari.shadow.mapSize.set(2048, 2048);
  matahari.shadow.radius = 5;
  matahari.shadow.bias = -0.0006;
  scene.add(matahari, matahari.target);

  const lantai = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.1 }));
  lantai.rotation.x = -Math.PI / 2;
  lantai.position.y = -0.14;
  lantai.receiveShadow = true;
  scene.add(lantai);

  const camera = new THREE.PerspectiveCamera(24, 1, 1, 800);
  const ARAH = new THREE.Vector3(0, 1, 0.66).normalize();
  const cam = { pos: new THREE.Vector3(), tgt: new THREE.Vector3() };

  const sorot = new THREE.Mesh(new THREE.BoxGeometry(1, 0.02, 1), new THREE.MeshBasicMaterial({ color: WARNA.sorot }));
  sorot.visible = false;
  scene.add(sorot);

  const isi = new THREE.Group();
  scene.add(isi);

  let tata = null;
  let meshSlot = null;
  let daftarSlot = [];
  let fokusIdx = null;
  let raf = 0;
  let w = 1, h = 1;

  const render = () => {
    camera.position.copy(cam.pos);
    camera.lookAt(cam.tgt);
    renderer.render(scene, camera);
  };

  const tujuanKamera = () => {
    const z = fokusIdx === null ? null : tata?.zona[fokusIdx];
    const lebar = z ? z.lebar + 3 : (tata?.lebarTotal || 30) + 4;
    const dalam = z ? z.dalam + 7 : (tata?.dalamMaks || 20) + 8;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const jarak = Math.max(lebar / (w / h), dalam) / (2 * tan) * 1.04;
    const tgt = new THREE.Vector3(z ? z.x0 + z.lebar / 2 : 0, 0, z ? 0.7 : 0.7);
    return { pos: tgt.clone().addScaledVector(ARAH, jarak), tgt };
  };

  const gerak = (durasi, dari) => {
    cancelAnimationFrame(raf);
    const tuju = tujuanKamera();
    const awal = dari || { pos: cam.pos.clone(), tgt: cam.tgt.clone() };
    const mulai = performance.now();
    const langkah = (now) => {
      const t = Math.min(1, (now - mulai) / durasi);
      const e = 1 - (1 - t) ** 3;
      cam.pos.lerpVectors(awal.pos, tuju.pos, e);
      cam.tgt.lerpVectors(awal.tgt, tuju.tgt, e);
      render();
      if (t < 1) raf = requestAnimationFrame(langkah);
    };
    raf = requestAnimationFrame(langkah);
  };

  const ukur = () => {
    w = Math.max(el.clientWidth, 1);
    h = Math.max(el.clientHeight, 1);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (tata) {
      const t = tujuanKamera();
      cam.pos.copy(t.pos);
      cam.tgt.copy(t.tgt);
      render();
    }
  };
  const ro = new ResizeObserver(ukur);
  ro.observe(el);
  ukur();

  const bersihkan = () => {
    isi.traverse((o) => {
      o.geometry?.dispose();
      o.material?.map?.dispose();
      o.material?.dispose();
    });
    isi.clear();
  };

  const perbarui = (areas, kendaraan) => {
    const pertama = !tata;
    bersihkan();
    tata = tataZona(areas, kendaraan);
    daftarSlot = [];
    const bantu = new THREE.Object3D();
    const warna = new THREE.Color();

    const matPelat = new THREE.MeshStandardMaterial({ color: WARNA.pelat, roughness: 0.9 });
    const matDinding = new THREE.MeshStandardMaterial({ color: WARNA.dinding, roughness: 0.9 });
    const tiang = (px, pz) => {
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5, 0.5), matDinding.clone());
      t.position.set(px, 0.75, pz);
      t.castShadow = t.receiveShadow = true;
      isi.add(t);
    };
    tata.zona.forEach((z) => {
      const tepiBelakang = z.z0 - TEPI;
      const dalamPelat = z.dalam + TEPI * 2 + 1.9;
      const pelat = new THREE.Mesh(new THREE.BoxGeometry(z.lebar, 0.14, dalamPelat), matPelat.clone());
      pelat.position.set(z.x0 + z.lebar / 2, -0.07, tepiBelakang + dalamPelat / 2);
      pelat.receiveShadow = pelat.castShadow = true;
      isi.add(pelat);
      [[z.lebar, z.x0 + z.lebar / 2, tepiBelakang, 0.18], [0.18, z.x0, tepiBelakang + dalamPelat / 2, dalamPelat], [0.18, z.x0 + z.lebar, tepiBelakang + dalamPelat / 2, dalamPelat]]
        .forEach(([lb, px, pz, dl]) => {
          const d = new THREE.Mesh(new THREE.BoxGeometry(lb, 1.1, dl), matDinding.clone());
          d.position.set(px, 0.55, pz);
          d.castShadow = d.receiveShadow = true;
          isi.add(d);
        });
      // Tiang di sepanjang dinding belakang dan samping
      for (let px = z.x0; px <= z.x0 + z.lebar + 0.01; px += z.lebar / Math.round(z.lebar / 5)) tiang(px, tepiBelakang);
      for (let pz = tepiBelakang + 5; pz < tepiBelakang + dalamPelat - 0.5; pz += 5) {
        tiang(z.x0, pz);
        tiang(z.x0 + z.lebar, pz);
      }
      isi.add(labelLantai(z));
    });

    const semua = tata.zona.flatMap((z) => z.slot.map((s) => ({ ...s, u: z.u, area: z.area })));
    const terisi = semua.filter((s) => s.terisi);

    meshSlot = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.03, 1), new THREE.MeshStandardMaterial({ roughness: 0.8 }), Math.max(semua.length, 1));
    meshSlot.count = semua.length;
    meshSlot.receiveShadow = true;
    semua.forEach((s, i) => {
      bantu.position.set(s.x, 0.015, s.z);
      bantu.rotation.set(0, 0, 0);
      bantu.scale.set(s.u.w * 0.88, 1, s.u.d * 0.93);
      bantu.updateMatrix();
      meshSlot.setMatrixAt(i, bantu.matrix);
      meshSlot.setColorAt(i, warna.set(s.terisi ? WARNA.terisi : WARNA.tersedia));
    });
    daftarSlot = semua;
    isi.add(meshSlot);

    const n = Math.max(terisi.length, 1);
    const bodi = new THREE.InstancedMesh(new RoundedBoxGeometry(1, 1, 1, 3, 0.2), new THREE.MeshStandardMaterial({ color: WARNA.bodi, roughness: 0.45 }), n);
    const kaca = new THREE.InstancedMesh(new RoundedBoxGeometry(1, 1, 1, 3, 0.24), new THREE.MeshStandardMaterial({ color: WARNA.kaca, roughness: 0.25 }), n);
    bodi.count = kaca.count = terisi.length;
    bodi.castShadow = kaca.castShadow = true;
    terisi.forEach((s, i) => {
      const u = s.u;
      const arah = s.balik ? -1 : 1;
      bantu.rotation.set(0, 0, 0);
      bantu.position.set(s.x, u.h / 2 + 0.04, s.z);
      bantu.scale.set(u.w * (u.motor ? 0.36 : 0.68), u.h, u.d * 0.76);
      bantu.updateMatrix();
      bodi.setMatrixAt(i, bantu.matrix);
      bantu.position.set(s.x, u.h + (u.motor ? 0.1 : 0.14), s.z - arah * u.d * 0.04);
      bantu.scale.set(u.w * (u.motor ? 0.22 : 0.56), u.motor ? 0.2 : u.h * 0.62, u.d * (u.motor ? 0.2 : 0.36));
      bantu.updateMatrix();
      kaca.setMatrixAt(i, bantu.matrix);
    });
    isi.add(bodi, kaca);

    const r = Math.max(tata.lebarTotal, tata.dalamMaks) * 0.62 + 6;
    matahari.position.set(-r * 0.55, r * 1.2, r * 0.45);
    Object.assign(matahari.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: r * 3.5 });
    matahari.shadow.camera.updateProjectionMatrix();

    if (pertama) {
      const t = tujuanKamera();
      const tinggi = t.pos.y * 1.5;
      cam.pos.copy(t.pos);
      cam.tgt.copy(t.tgt);
      gerak(1300, { pos: new THREE.Vector3(t.tgt.x, tinggi, t.tgt.z + 0.5), tgt: t.tgt.clone() });
    } else {
      render();
    }
  };

  const ray = new THREE.Raycaster();
  const titik = new THREE.Vector2();
  const onMove = (e) => {
    if (!meshSlot) return;
    const b = renderer.domElement.getBoundingClientRect();
    titik.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
    ray.setFromCamera(titik, camera);
    const hit = ray.intersectObject(meshSlot)[0];
    const s = hit ? daftarSlot[hit.instanceId] : null;
    const adaSebelum = sorot.visible;
    sorot.visible = !!s;
    if (s) {
      sorot.position.set(s.x, 0.005, s.z);
      sorot.scale.set(s.u.w * 1.0, 1, s.u.d * 1.0);
    }
    if (s || adaSebelum) render();
    onHover(s ? { slot: s, x: e.clientX - b.left, y: e.clientY - b.top } : null);
  };
  const onLeave = () => { sorot.visible = false; render(); onHover(null); };
  renderer.domElement.addEventListener('pointermove', onMove);
  renderer.domElement.addEventListener('pointerleave', onLeave);

  return {
    perbarui,
    fokus: (idx) => { fokusIdx = idx; sorot.visible = false; gerak(700); },
    hapus: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerleave', onLeave);
      bersihkan();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    },
  };
}
