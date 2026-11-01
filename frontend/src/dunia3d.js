// Dunia 3D tiap role, tiap adegan bereaksi pada tugasnya:
// petugas = gerbang, owner = kota pendapatan, admin = ruang server.
// Render hanya saat ada gerakan supaya ringan. Tanpa WebGL panggung disembunyikan.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const W = {
  latar: 0xf6f5f9, pelat: 0xffffff, dinding: 0xeeecf4, jalan: 0xdedbe8,
  aksen: 0x6d28d9, aksenMuda: 0xa78bfa, gelap: 0x2b2640, kaca: 0x5a5474, redup: 0xcfcbdd,
};
const bahan = (color, roughness = 0.8) => new THREE.MeshStandardMaterial({ color, roughness });

function kotak(lebar, tinggi, dalam, warna, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(lebar, tinggi, dalam), bahan(warna));
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

function bulat(lebar, tinggi, dalam, warna, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(lebar, tinggi, dalam, 3, Math.min(lebar, tinggi, dalam) * 0.22), bahan(warna, 0.4));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function teksLantai(teks, x, z, tinggi = 0.62, warna = '#1b1830') {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 96;
  const c = cv.getContext('2d');
  c.font = '600 56px Inter, system-ui, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = warna;
  c.fillText(teks, 256, 50);
  const peta = new THREE.CanvasTexture(cv);
  peta.colorSpace = THREE.SRGBColorSpace;
  peta.anisotropy = 8;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry((tinggi * 512) / 96, tinggi),
    new THREE.MeshBasicMaterial({ map: peta, transparent: true, toneMapped: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.02, z);
  return m;
}

// Kerangka bersama: kamera, cahaya, tween, hover dan klik
function panggung(el, { posisi, target, fov = 22, aspekAcuan = 3.4, benda = () => [], onHover, onKlik }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch {
    el.style.display = 'none';
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d4ea, 2.3));
  const matahari = new THREE.DirectionalLight(0xffffff, 1.5);
  matahari.position.set(-14, 26, 12);
  matahari.castShadow = true;
  matahari.shadow.mapSize.set(2048, 2048);
  matahari.shadow.radius = 5;
  matahari.shadow.bias = -0.0006;
  Object.assign(matahari.shadow.camera, { left: -34, right: 34, top: 24, bottom: -24, near: 1, far: 90 });
  scene.add(matahari);

  const camera = new THREE.PerspectiveCamera(fov, 1, 1, 400);
  const tgt = new THREE.Vector3(...target);
  const pos = new THREE.Vector3(...posisi);

  const tip = document.createElement('div');
  tip.className = 'denah-tip';
  tip.style.display = 'none';
  el.appendChild(tip);

  const render = () => renderer.render(scene, camera);
  const ukur = () => {
    const w = Math.max(el.clientWidth, 1);
    const h = Math.max(el.clientHeight, 1);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const m = Math.max(1, aspekAcuan / camera.aspect);
    camera.position.copy(tgt).addScaledVector(pos.clone().sub(tgt), m);
    camera.lookAt(tgt);
    render();
  };
  const ro = new ResizeObserver(ukur);
  ro.observe(el);

  const tween = new Set();
  let raf = 0;
  const putar = (now) => {
    for (const o of [...tween]) {
      const t = Math.min(1, (now - o.mulai) / o.ms);
      o.fn(t);
      if (t >= 1) {
        tween.delete(o);
        o.selesai?.();
      }
    }
    render();
    raf = tween.size ? requestAnimationFrame(putar) : 0;
  };
  const gerak = (ms, fn, selesai) => {
    const o = { mulai: performance.now(), ms, fn, selesai };
    tween.add(o);
    if (!raf) raf = requestAnimationFrame(putar);
    return o;
  };

  const ray = new THREE.Raycaster();
  const titik = new THREE.Vector2();
  const kena = (e) => {
    const b = renderer.domElement.getBoundingClientRect();
    titik.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
    ray.setFromCamera(titik, camera);
    return { hit: ray.intersectObjects(benda(), false)[0], x: e.clientX - b.left, y: e.clientY - b.top };
  };
  const onMove = (e) => {
    const { hit, x, y } = kena(e);
    const isi = hit ? onHover?.(hit) : null;
    renderer.domElement.style.cursor = hit && onKlik ? 'pointer' : '';
    tip.style.display = isi ? 'flex' : 'none';
    if (isi) {
      tip.innerHTML = '';
      isi.forEach((teks, i) => {
        const n = document.createElement(i ? 'span' : 'b');
        n.textContent = teks;
        tip.appendChild(n);
      });
      tip.style.left = `${Math.min(x + 14, el.clientWidth - 170)}px`;
      tip.style.top = `${Math.min(y + 14, el.clientHeight - 56)}px`;
    }
  };
  const onLeave = () => { tip.style.display = 'none'; };
  const onClick = (e) => {
    const { hit } = kena(e);
    if (hit) onKlik?.(hit);
  };
  const c = renderer.domElement;
  c.addEventListener('pointermove', onMove);
  c.addEventListener('pointerleave', onLeave);
  c.addEventListener('click', onClick);

  return {
    scene, gerak, render, ukur,
    batal: (o) => tween.delete(o),
    hapus: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      c.removeEventListener('pointermove', onMove);
      c.removeEventListener('pointerleave', onLeave);
      c.removeEventListener('click', onClick);
      scene.traverse((o) => {
        o.geometry?.dispose();
        o.material?.map?.dispose();
        o.material?.dispose();
      });
      renderer.dispose();
      c.remove();
      tip.remove();
    },
  };
}

const halus = (t) => t * t * (3 - 2 * t);

// ---- Petugas: gerbang parkir dan ramp ke basement ----
const DASAR = -2.4;
const tinggiJalan = (x) => (x <= 9 ? 0 : x >= 18 ? DASAR : (DASAR * (x - 9)) / 9);

function buatKendaraan(jenis) {
  const g = new THREE.Group();
  if (jenis === 'motor') {
    g.add(bulat(1.7, 0.42, 0.34, W.gelap, 0, 0.5, 0));
    g.add(bulat(0.56, 0.26, 0.3, W.kaca, -0.16, 0.84, 0));
    g.add(bulat(0.56, 0.5, 0.14, W.gelap, 0.72, 0.26, 0));
    g.add(bulat(0.56, 0.5, 0.14, W.gelap, -0.72, 0.26, 0));
  } else if (jenis === 'lainnya') {
    g.add(bulat(3.5, 1.7, 1.9, W.pelat, -0.6, 1.2, 0));
    g.add(bulat(1.3, 1.25, 1.85, W.gelap, 1.85, 0.98, 0));
    g.add(bulat(0.7, 0.6, 1.72, W.kaca, 2.1, 1.3, 0));
  } else {
    g.add(bulat(3.3, 0.66, 1.62, W.gelap, 0, 0.5, 0));
    g.add(bulat(1.7, 0.56, 1.36, W.kaca, -0.2, 1.02, 0));
  }
  return g;
}

export function buatGerbang(el, arah) {
  const masuk = arah === 'masuk';
  const p = panggung(el, { posisi: [3.5, 12.5, 25], target: [3.5, 1.4, -0.6], fov: 21, aspekAcuan: 3.1 });
  if (!p) return null;
  const { scene, gerak, render } = p;

  // Lantai, jalan, dan lubang ramp
  scene.add(kotak(89, 3, 15, W.pelat, -35.5, -1.5, 0));
  [-4.6, 4.6].forEach((z) => scene.add(kotak(9, 3, 5.8, W.pelat, 13.5, -1.5, z)));
  scene.add(kotak(82, 3, 15, W.pelat, 59, -1.5, 0));
  [-32.5, 32.5].forEach((z) => scene.add(kotak(200, 3, 50, W.pelat, 0, -1.5, z)));
  scene.add(kotak(89, 0.02, 4.2, W.jalan, -35.5, 0.01, 0));
  const ramp = kotak(9.32, 0.1, 3.4, W.jalan, 13.5, DASAR / 2 - 0.06, 0);
  ramp.rotation.z = Math.atan2(DASAR, 9);
  scene.add(ramp);
  const mulut = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3), new THREE.MeshBasicMaterial({ color: 0x17132b }));
  mulut.rotation.y = -Math.PI / 2;
  mulut.position.set(17.98, -1.5, 0);
  scene.add(mulut);
  scene.add(kotak(0.18, 0.14, 3.6, W.aksen, 18, 0.08, 0));
  scene.add(kotak(0.16, 0.02, 4.2, W.aksen, masuk ? -1.1 : 1.1, 0.03, 0));
  scene.add(teksLantai(masuk ? 'MASUK' : 'KELUAR', -7, 3.4, 0.9));
  scene.add(teksLantai('BASEMENT', 13.5, 3.2, 0.8));

  // Pos jaga
  scene.add(kotak(3, 2.3, 2.3, W.pelat, -3.4, 1.15, -3.9));
  scene.add(kotak(3.7, 0.2, 3, W.gelap, -3.4, 2.42, -3.9));
  scene.add(kotak(1.7, 0.9, 0.04, W.kaca, -3.4, 1.45, -2.73));

  // Palang
  scene.add(kotak(0.55, 1.25, 0.55, W.gelap, 0, 0.62, -2.5));
  const engsel = new THREE.Group();
  engsel.position.set(0, 1.16, -2.5);
  const lengan = kotak(0.14, 0.14, 4.7, W.aksen, 0, 0, 2.35);
  engsel.add(lengan);
  scene.add(engsel);

  // Papan info
  scene.add(kotak(0.18, 2.2, 0.18, W.gelap, 2.4, 1.1, -4.6), kotak(0.18, 2.2, 0.18, W.gelap, 7.6, 1.1, -4.6));
  const cv = document.createElement('canvas');
  cv.width = 640; cv.height = 180;
  const ctx = cv.getContext('2d');
  const peta = new THREE.CanvasTexture(cv);
  peta.colorSpace = THREE.SRGBColorSpace;
  peta.anisotropy = 8;
  const layar = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 1.63), new THREE.MeshBasicMaterial({ map: peta, toneMapped: false }));
  layar.position.set(5, 2.4, -4.5);
  layar.rotation.x = -0.32;
  scene.add(layar);

  let kendaraan = null;
  let gerakan = null;
  const taruh = (v, x) => {
    v.position.set(x, tinggiJalan(x), 0);
    const miring = x > 9 && x < 18 ? 0.26 : 0;
    v.rotation.set(0, masuk ? 0 : Math.PI, masuk ? -miring : miring);
  };
  const buang = (v) => {
    if (!v) return;
    scene.remove(v);
    v.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  };
  const palang = (naik, ms = 450) => {
    const dari = engsel.rotation.x;
    const ke = naik ? -1.38 : 0;
    gerak(ms, (t) => { engsel.rotation.x = dari + (ke - dari) * halus(t); });
  };

  return {
    papan(atas, bawah) {
      ctx.fillStyle = '#17132b';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 70px Inter, system-ui, sans-serif';
      ctx.fillText(atas, 320, 88, 590);
      ctx.fillStyle = '#c4b5fd';
      ctx.font = '500 40px Inter, system-ui, sans-serif';
      ctx.fillText(bawah, 320, 145, 590);
      peta.needsUpdate = true;
      render();
    },
    // Kendaraan baru datang dan berhenti di depan palang
    siapkan(jenis) {
      if (gerakan) p.batal(gerakan);
      buang(kendaraan);
      const v = buatKendaraan(jenis);
      kendaraan = v;
      scene.add(v);
      const dari = masuk ? -30 : 19;
      const henti = masuk ? -3.6 : 3.8;
      taruh(v, dari);
      gerakan = gerak(1100, (t) => taruh(v, dari + (henti - dari) * (1 - (1 - t) ** 3)));
    },
    // Palang naik dan kendaraan pergi
    jalan(selesai) {
      const v = kendaraan;
      if (!v) return selesai?.();
      if (gerakan) p.batal(gerakan);
      kendaraan = null;
      palang(true);
      const dari = v.position.x;
      const ke = masuk ? 21 : -32;
      gerakan = gerak(1900, (t) => taruh(v, dari + (ke - dari) * halus(Math.min(1, t * 1.05))), () => {
        buang(v);
        palang(false);
        selesai?.();
      });
    },
    kosongkan() {
      if (gerakan) p.batal(gerakan);
      buang(kendaraan);
      kendaraan = null;
      render();
    },
    hapus: p.hapus,
  };
}

// Tumpukan pelat, dipakai gedung owner dan rak admin
function tumpukan(jumlah, lebar, dalam, tebal, jarak, warna) {
  const m = new THREE.InstancedMesh(new THREE.BoxGeometry(lebar, tebal, dalam), bahan(warna, 0.6), Math.max(jumlah, 1));
  m.count = jumlah;
  const b = new THREE.Object3D();
  for (let i = 0; i < jumlah; i++) {
    b.position.set(0, tebal / 2 + i * (tebal + jarak), 0);
    b.updateMatrix();
    m.setMatrixAt(i, b.matrix);
  }
  m.castShadow = m.receiveShadow = true;
  return m;
}

// ---- Owner: kota pendapatan, satu gedung untuk satu hari ----
export function buatKota(el, { onPilih }) {
  const gedung = [];
  const p = panggung(el, {
    posisi: [-6, 13, 40], target: [0, 2.9, 0], fov: 16,
    benda: () => gedung.map((g) => g.mesh),
    onHover: (hit) => {
      const g = gedung.find((x) => x.mesh === hit.object);
      return g && [g.label, `Rp${g.total.toLocaleString('id-ID')}`, `${g.jumlah} transaksi`];
    },
    onKlik: (hit) => onPilih?.(gedung.find((x) => x.mesh === hit.object)?.tanggal),
  });
  if (!p) return null;
  const { scene, gerak, render } = p;
  scene.add(kotak(200, 0.3, 120, W.pelat, 0, -0.15, 0));
  scene.add(kotak(200, 0.02, 1.4, W.jalan, 0, 0.01, 2.2));
  const isi = new THREE.Group();
  scene.add(isi);

  const warnai = (pilih) => {
    gedung.forEach((g) => {
      const aktif = pilih ? g.tanggal === pilih : g.hariIni;
      g.mesh.material.color.set(aktif ? W.aksen : W.redup);
    });
    render();
  };

  return {
    // hari: [{ tanggal, label, total, jumlah, hariIni }] terurut naik
    perbarui(hari) {
      isi.traverse((o) => { o.geometry?.dispose(); o.material?.map?.dispose(); o.material?.dispose(); });
      isi.clear();
      gedung.length = 0;
      const maks = Math.max(1, ...hari.map((h) => h.total));
      const jarak = Math.min(4.4, 40 / Math.max(hari.length, 1));
      hari.forEach((h, i) => {
        const x = (i - (hari.length - 1) / 2) * jarak;
        const lantai = Math.max(1, Math.round((h.total / maks) * 22));
        const lebar = Math.min(2.5, jarak * 0.68);
        const mesh = tumpukan(lantai, lebar, 2.4, 0.09, 0.2, h.hariIni ? W.aksen : W.redup);
        mesh.position.set(x, 0, 0);
        const inti = kotak(lebar * 0.78, lantai * 0.29, 1.8, W.gelap, 0, (lantai * 0.29) / 2, 0);
        inti.castShadow = false;
        const kelompok = new THREE.Group();
        kelompok.position.x = x;
        mesh.position.x = 0;
        kelompok.add(inti, mesh);
        kelompok.scale.y = 0.001;
        isi.add(kelompok);
        isi.add(teksLantai(h.label, x, 3.6, 0.72));
        gedung.push({ ...h, mesh });
        gerak(650 + i * 45, (t) => { kelompok.scale.y = Math.max(0.001, 1 - (1 - t) ** 3); });
      });
      render();
    },
    pilih: warnai,
    hapus: p.hapus,
  };
}

// ---- Admin: ruang server, satu rak untuk satu tabel ----
export function buatRuangServer(el, { daftar, onPilih }) {
  const rak = [];
  const p = panggung(el, {
    posisi: [-7, 12, 37], target: [0, 2.7, 0], fov: 16, aspekAcuan: 3.1,
    benda: () => rak.map((r) => r.klik),
    onHover: (hit) => {
      const r = rak.find((x) => x.klik === hit.object);
      return r && [r.label, `${r.baris} baris`];
    },
    onKlik: (hit) => onPilih?.(rak.find((x) => x.klik === hit.object)?.kunci),
  });
  if (!p) return null;
  const { scene, gerak, render } = p;
  scene.add(kotak(200, 0.3, 120, W.pelat, 0, -0.15, 0));

  const TINGGI = 5.2;
  daftar.forEach(([kunci, label], i) => {
    const x = (i - (daftar.length - 1) / 2) * 6.4;
    const g = new THREE.Group();
    g.position.x = x;
    [[-1.6, -1.1], [1.6, -1.1], [-1.6, 1.1], [1.6, 1.1]].forEach(([a, b]) => g.add(kotak(0.16, TINGGI, 0.16, W.gelap, a, TINGGI / 2, b)));
    g.add(kotak(3.5, 0.14, 2.5, W.gelap, 0, TINGGI, 0), kotak(3.5, 0.14, 2.5, W.gelap, 0, 0.07, 0));
    const klik = new THREE.Mesh(new THREE.BoxGeometry(3.4, TINGGI, 2.4), new THREE.MeshBasicMaterial({ visible: false }));
    klik.position.y = TINGGI / 2;
    g.add(klik);
    scene.add(g);
    scene.add(teksLantai(label, x, 2.9, 0.66));
    rak.push({ kunci, label, g, klik, baris: 0, pelat: null, lampu: null });
  });

  let dipilih = null;
  const warnai = () => {
    rak.forEach((r) => {
      r.pelat?.material.color.set(r.kunci === dipilih ? W.aksen : W.redup);
      r.lampu?.material.color.set(r.kunci === dipilih ? 0xffffff : W.aksen);
    });
  };

  return {
    // Jumlah pelat mengikuti jumlah baris (skala akar supaya log 200 baris tetap muat)
    isi(kunci, baris) {
      const r = rak.find((x) => x.kunci === kunci);
      if (!r || r.baris === baris) return;
      r.baris = baris;
      [r.pelat, r.lampu].forEach((m) => {
        if (!m) return;
        r.g.remove(m);
        m.geometry.dispose();
        m.material.dispose();
      });
      const n = baris ? Math.min(13, Math.max(1, Math.ceil(Math.sqrt(baris) * 1.5))) : 0;
      r.pelat = tumpukan(n, 3, 2, 0.26, 0.09, W.redup);
      r.pelat.position.y = 0.28;
      r.lampu = tumpukan(n, 0.34, 0.03, 0.08, 0.27, W.aksen);
      r.lampu.position.set(1.1, 0.37, 1.01);
      r.lampu.castShadow = false;
      r.g.add(r.pelat, r.lampu);
      warnai();
      const pelat = r.pelat;
      const lampu = r.lampu;
      gerak(500, (t) => { pelat.scale.y = lampu.scale.y = Math.max(0.001, 1 - (1 - t) ** 3); });
    },
    pilih(kunci) {
      dipilih = kunci;
      warnai();
      render();
    },
    hapus: p.hapus,
  };
}
