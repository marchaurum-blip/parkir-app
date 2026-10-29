import { useEffect, useState } from 'react';
import { api } from '../api.js';

const CFG = {
  users: { pk: 'id_user', fields: ['nama_lengkap', 'username', 'password', 'role'] },
  tarif: { pk: 'id_tarif', fields: ['jenis_kendaraan', 'tarif_per_jam'] },
  area: { pk: 'id_area', fields: ['nama_area', 'kapasitas'] },
  kendaraan: { pk: 'id_kendaraan', fields: ['plat_nomor', 'jenis_kendaraan', 'warna', 'pemilik'] },
  logs: { pk: 'id_log', fields: ['username', 'aktivitas', 'waktu_aktivitas'], readOnly: true },
};

export default function Master() {
  const [t, setT] = useState('users');
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({});
  const [msg, setMsg] = useState('');
  const { pk, fields, readOnly } = CFG[t];
  const load = () => api('/' + t).then(setRows);
  useEffect(() => { setF({}); load(); }, [t]);

  const add = async (e) => {
    e.preventDefault();
    try { await api('/' + t, 'POST', f); setF({}); setMsg(''); load(); } catch (x) { setMsg(x.message); }
  };
  const edit = async (r) => {
    const body = {};
    for (const k of fields) {
      const v = prompt(k + (k === 'password' ? ' (kosong = tidak diubah)' : ''), k === 'password' ? '' : r[k]);
      if (v === null) return;
      if (v !== '' || k !== 'password') body[k] = v;
    }
    try { await api(`/${t}/${r[pk]}`, 'PUT', body); load(); } catch (x) { setMsg(x.message); }
  };
  const del = (id) => api(`/${t}/${id}`, 'DELETE').then(load).catch((x) => setMsg(x.message));
  return (
    <div>
      {Object.keys(CFG).map((k) => <button key={k} onClick={() => setT(k)} disabled={k === t}>{k}</button>)}
      {!readOnly && <form onSubmit={add}>
        {fields.map((k) => <input key={k} placeholder={k} value={f[k] || ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} />)}
        <button>Tambah</button> <b style={{ color: 'red' }}>{msg}</b>
      </form>}
      <table border="1" cellPadding="4"><tbody>{rows.map((r) => (
        <tr key={r[pk]}>{fields.filter((k) => k !== 'password').map((k) => <td key={k}>{r[k]}</td>)}
          {!readOnly && <td><button onClick={() => edit(r)}>Ubah</button> <button onClick={() => del(r[pk])}>Hapus</button></td>}</tr>))}</tbody></table>
    </div>
  );
}
