import { useState, useRef } from 'react';
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

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const [tab, setTab] = useState(null);
  const [f, setF] = useState({ username: '', password: '' });
  const [err, setErr] = useState('');
  const userRef = useRef(null);

  const login = async (e) => {
    e.preventDefault();
    try {
      const r = await api('/auth/login', 'POST', f);
      localStorage.setItem('token', r.token);
      localStorage.setItem('user', JSON.stringify(r.user));
      setUser(r.user);
    } catch (x) { setErr(x.message); }
  };
  const logout = () => { localStorage.clear(); setUser(null); setTab(null); };

  if (!user) return (
    <div className="hero">
      <Hero />
      <div className="nav">
        <div className="brand">
          <span className="brand-gem" />
          <span>parkir</span>
        </div>
        <div className="nav-links">
          <span>Check-In</span>
          <span>Check-Out</span>
          <span>Tarif & Area</span>
          <span>SPK Paket 2</span>
        </div>
        <button type="button" className="nav-pill" onClick={() => userRef.current?.focus()}>
          Get started
        </button>
      </div>
      <div className="hero-body">
        <div className="hero-text">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            <span>UKK RPL Paket 2 • Smart Parking</span>
          </div>
          <h1>The Smarter,<br /><span className="hero-grad">Automated</span><br />Smart Parking<br />System</h1>
          <p>Kelola kendaraan masuk & keluar, tarif per jam otomatis, dan rekapitulasi pendapatan real-time sesuai SPK.</p>
          <form onSubmit={login} className="login-card">
            <input ref={userRef} placeholder="Username" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
            <input type="password" placeholder="Password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
            <button>Masuk</button>
            {err && <span className="login-err">{err}</span>}
          </form>
        </div>
      </div>
    </div>
  );

  const menu = MENU[user.role];
  const cur = tab || menu[0];
  const Page = { Masuk, Keluar, Master, Laporan }[cur];
  return (
    <div>
      <div className="app-nav">
        <div className="brand" style={{ marginRight: 14 }}>
          <span className="brand-gem" />
          <span>parkir</span>
        </div>
        {menu.map((m) => (
          <button key={m} className={m === cur ? '' : 'btn-ghost'} onClick={() => setTab(m)} disabled={m === cur}>
            {m}
          </button>
        ))}
        <span className="sp" />
        <span className="role-chip">{user.nama} • {user.role.toUpperCase()}</span>
        <button className="btn-danger" onClick={logout}>Logout</button>
      </div>
      <div className="app-main"><Page /></div>
    </div>
  );
}
