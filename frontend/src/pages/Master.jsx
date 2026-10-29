import { useEffect, useState } from 'react';
import { api } from '../api.js';

const CFG = {
  users: { pk: 'id_user', fields: ['nama_lengkap', 'username', 'password', 'role'] },
  tarif: { pk: 'id_tarif', fields: ['jenis_kendaraan', 'tarif_per_jam'] },
  area: { pk: 'id_area', fields: ['nama_area', 'kapasitas'] },
};

export default function Master() {
  const [t, setT] = useState('users');
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({});
  const [msg, setMsg] = useState('');
  const { pk, fields } = CFG[t];
  const load = () => api('/' + t).then(setRows);
  useEffect(() => { setF({}); load(); }, [t]);

  const add = async (e) => {
    e.preventDefault();
    try { await api('/' + t, 'POST', f); setF({}); setMsg(''); load(); } catch (x) { setMsg(x.message); }
  };
  const del = (id) => api(`/${t}/${id}`, 'DELETE').then(load).catch((x) => setMsg(x.message));
  return (
    <div>
      {Object.keys(CFG).map((k) => <button key={k} onClick={() => setT(k)} disabled={k === t}>{k}</button>)}
      <form onSubmit={add}>
        {fields.map((k) => <input key={k} placeholder={k} value={f[k] || ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} />)}
        <button>Tambah</button> <b style={{ color: 'red' }}>{msg}</b>
      </form>
      <table border="1" cellPadding="4"><tbody>{rows.map((r) => (
        <tr key={r[pk]}>{fields.filter((k) => k !== 'password').map((k) => <td key={k}>{r[k]}</td>)}
          <td><button onClick={() => del(r[pk])}>Hapus</button></td></tr>))}</tbody></table>
    </div>
  );
}
