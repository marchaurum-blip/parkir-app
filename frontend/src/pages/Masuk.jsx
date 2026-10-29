import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Struk from './Struk.jsx';

export default function Masuk() {
  const [areas, setAreas] = useState([]);
  const [f, setF] = useState({ plat_nomor: '', jenis_kendaraan: 'motor', warna: '', pemilik: '', id_area: '' });
  const [msg, setMsg] = useState('');
  const [struk, setStruk] = useState(null);
  const load = () => api('/area').then(setAreas);
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try { const r = await api('/transaksi/masuk', 'POST', f); setStruk(r); setMsg('Tercatat'); load(); }
    catch (x) { setMsg(x.message); }
  };
  return (
    <form onSubmit={submit}>
      <h3>Kendaraan Masuk</h3>
      <input placeholder="Plat nomor" value={f.plat_nomor} onChange={set('plat_nomor')} required />
      <select value={f.jenis_kendaraan} onChange={set('jenis_kendaraan')}>
        <option>motor</option><option>mobil</option><option>lainnya</option>
      </select>
      <input placeholder="Warna" value={f.warna} onChange={set('warna')} />
      <input placeholder="Pemilik" value={f.pemilik} onChange={set('pemilik')} />
      <select value={f.id_area} onChange={set('id_area')} required>
        <option value="">-- area --</option>
        {areas.map((a) => <option key={a.id_area} value={a.id_area}>{a.nama_area} ({a.terisi}/{a.kapasitas})</option>)}
      </select>
      <button>Simpan</button> <b>{msg}</b>
      {struk && <Struk jenis="masuk" data={struk} />}
    </form>
  );
}
