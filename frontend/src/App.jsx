import { useState } from 'react';
import { api } from './api.js';
import Masuk from './pages/Masuk.jsx';
import Keluar from './pages/Keluar.jsx';
import Master from './pages/Master.jsx';
import Laporan from './pages/Laporan.jsx';

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
    <form onSubmit={login} style={{ maxWidth: 300, margin: '80px auto' }}>
      <h2>Login Parkir</h2>
      <input placeholder="Username" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} /><br />
      <input type="password" placeholder="Password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /><br />
      <button>Masuk</button> <span style={{ color: 'red' }}>{err}</span>
    </form>
  );

  const menu = MENU[user.role];
  const cur = tab || menu[0];
  const Page = { Masuk, Keluar, Master, Laporan }[cur];
  return (
    <div style={{ padding: 20 }}>
      <b>{user.nama} ({user.role})</b>{' '}
      {menu.map((m) => <button key={m} onClick={() => setTab(m)} disabled={m === cur}>{m}</button>)}
      <button onClick={logout}>Logout</button>
      <hr /><Page />
    </div>
  );
}
