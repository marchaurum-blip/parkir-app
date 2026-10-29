import { useState } from 'react';
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
      <div className="nav"><span className="logo">Parkir Bebas</span></div>
      <div className="hero-body">
        <div className="hero-text">
          <h1>Parkir lebih rapi, biaya lebih jelas.</h1>
          <p>Catat kendaraan masuk dan keluar, hitung tarif otomatis, dan pantau pendapatan dalam satu aplikasi.</p>
          <form onSubmit={login} className="login-card">
            <input placeholder="Username" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
            <input type="password" placeholder="Password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
            <button>Masuk</button> <span style={{ color: 'red' }}>{err}</span>
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
        <span className="logo">Parkir Bebas</span>
        {menu.map((m) => <button key={m} onClick={() => setTab(m)} disabled={m === cur}>{m}</button>)}
        <span className="sp" />
        <span>{user.nama} ({user.role})</span>
        <button onClick={logout}>Logout</button>
      </div>
      <div className="app-main"><Page /></div>
    </div>
  );
}
