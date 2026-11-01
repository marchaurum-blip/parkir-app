import { useState, useEffect, useRef } from 'react';
import { api } from './api.js';
import Denah from './pages/Denah.jsx';
import Masuk from './pages/Masuk.jsx';
import Keluar from './pages/Keluar.jsx';
import Master from './pages/Master.jsx';
import Laporan from './pages/Laporan.jsx';
import Hero from './Hero.jsx';
import './style.css';

const MENU = {
  petugas: ['Masuk', 'Keluar', 'Denah'],
  admin: ['Master', 'Masuk', 'Keluar', 'Laporan', 'Denah'],
  owner: ['Laporan', 'Denah'],
};

const picuPanggung3D = (detail = {}) => {
  window.dispatchEvent(new CustomEvent('parkir:aksi', { detail }));
};

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const [tab, setTab] = useState(null);
  const [f, setF] = useState({ username: '', password: '' });
  const [err, setErr] = useState('');
  const [infoPublik, setInfoPublik] = useState(null);
  const [navInfo, setNavInfo] = useState(null);
  const [nyelam, setNyelam] = useState(false);
  const userRef = useRef(null);

  const muatInfoPublik = () => {
    api('/publik/info').then(setInfoPublik).catch(() => {});
  };

  useEffect(() => {
    if (!user) muatInfoPublik();
  }, [user]);

  const login = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const r = await api('/auth/login', 'POST', { username: f.username.trim().toLowerCase(), password: f.password });
      localStorage.setItem('token', r.token);
      localStorage.setItem('user', JSON.stringify(r.user));
      setNavInfo(null);
      const masuk = () => {
        setUser(r.user);
        setTab(MENU[r.user.role][0]);
        setF({ username: '', password: '' });
        setNyelam(false);
      };
      // Tanpa WebGL tidak ada adegan menyelam, langsung masuk
      if (document.querySelector('.scene3d-fallback')) return masuk();
      setNyelam(true);
      picuPanggung3D({ aksi: 'nyelam' });
      setTimeout(masuk, 1200);
    } catch (x) {
      setErr(x.message);
    }
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setTab(null);
  };

  const bukaPreviewNav = (kode) => {
    setNavInfo((lama) => (lama === kode ? null : kode));
    muatInfoPublik();
    picuPanggung3D({ aksi: 'nav', kode });
  };

  if (user) {
    const menu = MENU[user.role];
    const cur = tab && menu.includes(tab) ? tab : menu[0];
    const Page = { Masuk, Keluar, Master, Laporan }[cur];

    return (
      <div className="app-shell">
        <div className="app-nav">
          <div className="brand">
            <span className="brand-gem" />
            <span>parkir</span>
          </div>
          {menu.map((m) => (
            <button key={m} className={`tab ${m === cur ? 'tab-active' : ''}`} onClick={() => setTab(m)}>
              {m}
            </button>
          ))}
          <span className="sp" />
          <span className="role-chip">{user.nama} ({user.role})</span>
          <button className="btn-ghost" onClick={logout}>Logout</button>
        </div>
        {cur === 'Denah' ? <Denah role={user.role} /> : (
          <div className="app-main">
            <Page />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`hero ${nyelam ? 'hero-nyelam' : ''}`}>
      <Hero />

      <div className="nav">
        <div className="brand" onClick={() => setNavInfo(null)} style={{ cursor: 'pointer' }}>
          <span className="brand-gem" />
          <span>parkir</span>
        </div>
        <div className="nav-links">
          {[['checkin', 'Check-In'], ['checkout', 'Check-Out'], ['tarif', 'Tarif & Area'], ['spk', 'SPK Paket 2']].map(([kode, label]) => (
            <button
              key={kode}
              type="button"
              className={`nav-link-btn ${navInfo === kode ? 'active' : ''}`}
              onClick={() => bukaPreviewNav(kode)}
            >
              {label}
            </button>
          ))}
        </div>
        <button type="button" className="nav-pill" onClick={() => userRef.current?.focus()}>
          Masuk
        </button>
      </div>

      <div className="hero-body">
        <div className="hero-text">
          <div className="hero-badge">UKK RPL Paket 2</div>
          <h1>Parkir tertib, tarif dihitung otomatis.</h1>
          <p>Catat kendaraan masuk dan keluar, cetak karcis, dan pantau pendapatan dari satu tempat.</p>

          <form onSubmit={login} className="login-card">
            <input
              ref={userRef}
              placeholder="Username"
              autoComplete="username"
              value={f.username}
              onChange={(e) => setF({ ...f, username: e.target.value })}
            />
            <input
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              value={f.password}
              onChange={(e) => setF({ ...f, password: e.target.value })}
            />
            <button type="submit">Masuk</button>
            {err && <span className="login-err">{err}</span>}
          </form>

          {navInfo && (
            <div className="hero-drawer">
              <div className="hero-drawer-head">
                <b>
                  {navInfo === 'checkin' && 'Check-In Kendaraan'}
                  {navInfo === 'checkout' && 'Check-Out Kendaraan'}
                  {navInfo === 'tarif' && 'Tarif & Kapasitas Area'}
                  {navInfo === 'spk' && 'Rekap & Standar SPK Paket 2'}
                </b>
                <button type="button" className="btn-ghost btn-xs" onClick={() => setNavInfo(null)}>Tutup</button>
              </div>

              {navInfo === 'checkin' && (
                <div className="hero-drawer-body">
                  <p>Catat plat nomor, jenis kendaraan, pilih area, lalu cetak karcis masuk.</p>
                  {infoPublik && (
                    <div className="mini-chips">
                      {infoPublik.areas.map((a) => (
                        <span key={a.id_area} className="mini-chip">
                          {a.nama_area}: <b>{a.terisi}/{a.kapasitas}</b>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {navInfo === 'checkout' && (
                <div className="hero-drawer-body">
                  <p>
                    Saat ini ada <b>{infoPublik ? infoPublik.total_aktif : 0} kendaraan</b> sedang parkir.
                    Tarif dihitung per jam, dibulatkan ke atas, minimal 1 jam.
                  </p>
                </div>
              )}

              {navInfo === 'tarif' && (
                <div className="hero-drawer-body">
                  {infoPublik && (
                    <div className="mini-chips">
                      {infoPublik.tarifs.map((t) => (
                        <span key={t.id_tarif} className="mini-chip">
                          {t.jenis_kendaraan}: <b>Rp{Number(t.tarif_per_jam).toLocaleString('id-ID')}/jam</b>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {navInfo === 'spk' && (
                <div className="hero-drawer-body">
                  <p>
                    Total pendapatan: <b>Rp{Number(infoPublik?.pendapatan || 0).toLocaleString('id-ID')}</b>{' '}
                    dari {infoPublik?.total_selesai || 0} transaksi selesai.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
