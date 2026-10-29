import { useState, useEffect, useRef } from 'react';
import { api } from './api.js';
import Masuk from './pages/Masuk.jsx';
import Keluar from './pages/Keluar.jsx';
import Master from './pages/Master.jsx';
import Laporan from './pages/Laporan.jsx';
import Hero from './Hero.jsx';
import './style.css';

const MENU = {
  petugas: ['Masuk', 'Keluar'],
  admin: ['Masuk', 'Keluar', 'Master', 'Laporan'],
  owner: ['Laporan'],
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
  const [sedangNgetik, setSedangNgetik] = useState(false);
  const [lihat3DPenuh, setLihat3DPenuh] = useState(false);
  const userRef = useRef(null);

  const muatInfoPublik = () => {
    api('/publik/info').then(setInfoPublik).catch(() => {});
  };

  useEffect(() => {
    muatInfoPublik();
  }, [user, tab]);

  const lakukanLogin = async (usernameInput, passwordInput, targetTab = null) => {
    setErr('');
    const uClean = (usernameInput || '').trim().toLowerCase();
    // Jika user mengetik "owner", "admin", atau "petugas" lalu tekan Enter tanpa isi password,
    // otomatis gunakan password default demo '123456' agar langsung masuk mulus!
    const pClean = passwordInput || (['owner', 'admin', 'petugas'].includes(uClean) ? '123456' : '');
    try {
      const r = await api('/auth/login', 'POST', { username: uClean, password: pClean });
      localStorage.setItem('token', r.token);
      localStorage.setItem('user', JSON.stringify(r.user));
      setUser(r.user);
      setTab(targetTab || MENU[r.user.role][0]);
      setLihat3DPenuh(false);
      picuPanggung3D({ aksi: 'login', role: r.user.role });
    } catch (x) {
      setErr(x.message);
    }
  };

  const login = async (e) => {
    e.preventDefault();
    await lakukanLogin(f.username, f.password);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setTab(null);
    setLihat3DPenuh(false);
    picuPanggung3D({ aksi: 'logout' });
  };

  const bukaPreviewNav = (kode) => {
    setNavInfo((lama) => (lama === kode ? null : kode));
    muatInfoPublik();
    picuPanggung3D({ aksi: 'nav', kode });
  };

  const menu = user ? MENU[user.role] : [];
  const cur = user ? (tab && menu.includes(tab) ? tab : menu[0]) : null;
  const Page = cur ? { Masuk, Keluar, Master, Laporan }[cur] : null;

  return (
    <div className="hero">
      {/* Panggung 3D selalu hidup & terhubung dengan ketikan dan aksi di seluruh aplikasi */}
      <Hero />

      {!user ? (
        <>
          <div className="nav">
            <div className="brand" onClick={() => { setNavInfo(null); picuPanggung3D(); }} style={{ cursor: 'pointer' }}>
              <span className="brand-gem" />
              <span>parkir</span>
            </div>
            <div className="nav-links">
              <button type="button" className={`nav-link-btn ${navInfo === 'checkin' ? 'active' : ''}`} onClick={() => bukaPreviewNav('checkin')}>
                Check-In
              </button>
              <button type="button" className={`nav-link-btn ${navInfo === 'checkout' ? 'active' : ''}`} onClick={() => bukaPreviewNav('checkout')}>
                Check-Out
              </button>
              <button type="button" className={`nav-link-btn ${navInfo === 'tarif' ? 'active' : ''}`} onClick={() => bukaPreviewNav('tarif')}>
                Tarif & Area
              </button>
              <button type="button" className={`nav-link-btn ${navInfo === 'spk' ? 'active' : ''}`} onClick={() => bukaPreviewNav('spk')}>
                SPK Paket 2
              </button>
            </div>
            <button
              type="button"
              className="nav-pill"
              onClick={() => {
                userRef.current?.focus();
                picuPanggung3D({ aksi: 'focus-login' });
              }}
            >
              Get started
            </button>
          </div>

          <div className="hero-body">
            <div className="hero-text">
              <div className="hero-badge">
                <span className="hero-badge-dot" />
                <span>
                  {sedangNgetik
                    ? '⚡ Mode Ketik Aktif • Semua Kotak Palet Terbuka'
                    : 'UKK RPL Paket 2 • Smart Parking'}
                </span>
              </div>
              <h1>
                The Smarter,<br />
                <span className="hero-grad">Automated</span><br />
                Smart Parking<br />
                System
              </h1>
              <p>
                Kelola kendaraan masuk & keluar, tarif per jam otomatis, dan rekapitulasi pendapatan real-time sesuai SPK.
              </p>

              <form
                onSubmit={login}
                className={`login-card ${sedangNgetik ? 'login-card-active' : ''}`}
                onFocus={() => setSedangNgetik(true)}
                onBlur={() => setTimeout(() => setSedangNgetik(false), 250)}
              >
                <input
                  ref={userRef}
                  placeholder="Username (owner / petugas / admin)"
                  value={f.username}
                  onChange={(e) => {
                    setF({ ...f, username: e.target.value });
                    setSedangNgetik(true);
                  }}
                />
                <input
                  type="password"
                  placeholder="Password (123456)"
                  value={f.password}
                  onChange={(e) => {
                    setF({ ...f, password: e.target.value });
                    setSedangNgetik(true);
                  }}
                />
                <button type="submit">Masuk</button>

                <div className="quick-roles">
                  <span className="quick-label">Akses Cepat:</span>
                  <button
                    type="button"
                    className="role-pill"
                    onClick={() => {
                      setF({ username: 'petugas', password: '123456' });
                      lakukanLogin('petugas', '123456', 'Masuk');
                    }}
                  >
                    ⚡ Petugas
                  </button>
                  <button
                    type="button"
                    className="role-pill"
                    onClick={() => {
                      setF({ username: 'owner', password: '123456' });
                      lakukanLogin('owner', '123456', 'Laporan');
                    }}
                  >
                    👑 Owner
                  </button>
                  <button
                    type="button"
                    className="role-pill"
                    onClick={() => {
                      setF({ username: 'admin', password: '123456' });
                      lakukanLogin('admin', '123456', 'Master');
                    }}
                  >
                    🛠️ Admin
                  </button>
                </div>

                {err && <span className="login-err">{err}</span>}
              </form>

              {navInfo && (
                <div className="hero-drawer">
                  <div className="hero-drawer-head">
                    <b>
                      {navInfo === 'checkin' && '📥 Modul Check-In Kendaraan Masuk'}
                      {navInfo === 'checkout' && '📤 Modul Check-Out & Hitung Tarif Otomatis'}
                      {navInfo === 'tarif' && '🏷️ Tarif Per Jam & Kapasitas Area Real-Time'}
                      {navInfo === 'spk' && '📊 Rekapitulasi Owner & Standar SPK Paket 2'}
                    </b>
                    <button type="button" className="btn-ghost btn-xs" onClick={() => setNavInfo(null)}>✕</button>
                  </div>

                  {navInfo === 'checkin' && (
                    <div className="hero-drawer-body">
                      <p>Catat plat nomor, jenis kendaraan, pilih slot area, dan cetak karcis masuk instan.</p>
                      {infoPublik && (
                        <div className="mini-chips">
                          {infoPublik.areas.map((a) => (
                            <span key={a.id_area} className="mini-chip">
                              {a.nama_area}: <b>{a.terisi}/{a.kapasitas}</b>
                            </span>
                          ))}
                        </div>
                      )}
                      <button type="button" onClick={() => lakukanLogin('petugas', '123456', 'Masuk')}>
                        Buka Check-In Sekarang (Petugas) →
                      </button>
                    </div>
                  )}

                  {navInfo === 'checkout' && (
                    <div className="hero-drawer-body">
                      <p>
                        Saat ini ada <b>{infoPublik ? infoPublik.total_aktif : 0} kendaraan</b> sedang parkir aktif.
                        Tarif dihitung otomatis per jam (pembulatan ke atas, minimal 1 jam).
                      </p>
                      <button type="button" onClick={() => lakukanLogin('petugas', '123456', 'Keluar')}>
                        Buka Check-Out Sekarang (Petugas) →
                      </button>
                    </div>
                  )}

                  {navInfo === 'tarif' && (
                    <div className="hero-drawer-body">
                      {infoPublik && (
                        <div className="mini-chips">
                          {infoPublik.tarifs.map((t) => (
                            <span key={t.id_tarif} className="mini-chip">
                              {t.jenis_kendaraan.toUpperCase()}: <b>Rp{Number(t.tarif_per_jam).toLocaleString('id-ID')}/jam</b>
                            </span>
                          ))}
                        </div>
                      )}
                      <button type="button" onClick={() => lakukanLogin('admin', '123456', 'Master')}>
                        Kelola Tarif & Area (Admin) →
                      </button>
                    </div>
                  )}

                  {navInfo === 'spk' && (
                    <div className="hero-drawer-body">
                      <p>
                        Total Pendapatan Terkumpul: <b>Rp{Number(infoPublik?.pendapatan || 0).toLocaleString('id-ID')}</b>{' '}
                        ({infoPublik?.total_selesai || 0} transaksi selesai).
                      </p>
                      <button type="button" onClick={() => lakukanLogin('owner', '123456', 'Laporan')}>
                        Masuk Dashboard Owner (Rekap Laporan) →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="dashboard-overlay">
          <div className="app-nav">
            <div className="brand" style={{ marginRight: 10, cursor: 'pointer' }} onClick={() => picuPanggung3D()}>
              <span className="brand-gem" />
              <span>parkir</span>
            </div>
            {menu.map((m) => (
              <button
                key={m}
                className={m === cur ? '' : 'btn-ghost'}
                onClick={() => {
                  setTab(m);
                  setLihat3DPenuh(false);
                  picuPanggung3D({ aksi: 'tab', tab: m });
                }}
                disabled={m === cur && !lihat3DPenuh}
              >
                {m}
              </button>
            ))}
            <span className="sp" />

            {/* Pindah Cepat Antar Role agar semua fitur mudah diuji */}
            <div className="role-switcher">
              {['petugas', 'owner', 'admin'].map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`btn-xs ${user.role === r ? '' : 'btn-ghost'}`}
                  onClick={() => lakukanLogin(r, '123456')}
                  title={`Beralih ke akun ${r}`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn-ghost btn-xs"
              onClick={() => {
                setLihat3DPenuh((v) => !v);
                picuPanggung3D({ aksi: 'toggle-3d' });
              }}
            >
              {lihat3DPenuh ? '📋 Buka Panel' : '👁️ Panggung 3D'}
            </button>

            <span className="role-chip">{user.nama} • {user.role.toUpperCase()}</span>
            <button className="btn-danger" onClick={logout}>Logout</button>
          </div>

          {!lihat3DPenuh && Page && (
            <div className="app-main">
              <Page />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
