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
    try { const r = await api('/transaksi/masuk', 'POST', f); setStruk(r); setMsg('Kendaraan berhasil masuk'); load(); }
    catch (x) { setMsg(x.message); }
  };
  return (
    <div className="panel-card">
      <h3>Check-In Kendaraan Masuk</h3>
      <form onSubmit={submit} className="form-row">
        <input placeholder="Plat Nomor (mis. B 1234 XYZ)" value={f.plat_nomor} onChange={set('plat_nomor')} required />
        <select value={f.jenis_kendaraan} onChange={set('jenis_kendaraan')}>
          <option value="motor">Motor</option>
          <option value="mobil">Mobil</option>
          <option value="lainnya">Lainnya / Truk</option>
        </select>
        <input placeholder="Warna Kendaraan" value={f.warna} onChange={set('warna')} />
        <input placeholder="Nama Pemilik" value={f.pemilik} onChange={set('pemilik')} />
        <select value={f.id_area} onChange={set('id_area')} required>
          <option value="">-- Pilih Area Parkir --</option>
          {areas.map((a) => <option key={a.id_area} value={a.id_area}>{a.nama_area} ({a.terisi}/{a.kapasitas})</option>)}
        </select>
        <button>Simpan & Cetak Karcis</button>
        {msg && <b style={{ color: '#6d28d9', marginLeft: 8 }}>{msg}</b>}
      </form>
      <div className="area-grid">
        {areas.map((a) => {
          const pct = a.kapasitas ? Math.min(100, Math.round((a.terisi / a.kapasitas) * 100)) : 0;
          return (
            <div key={a.id_area} className="area-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                <span>{a.nama_area}</span>
                <span style={{ color: '#7c3aed' }}>{a.terisi} / {a.kapasitas} slot</span>
              </div>
              <div className="area-bar"><div className="area-fill" style={{ width: `${pct}%` }} /></div>
            </div>
          );
        })}
      </div>
      {struk && <div style={{ marginTop: 18 }}><Struk jenis="masuk" data={struk} /></div>}
    </div>
  );
}
