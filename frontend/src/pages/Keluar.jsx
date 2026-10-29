import { useState } from 'react';
import { api } from '../api.js';
import Struk from './Struk.jsx';

export default function Keluar() {
  const [q, setQ] = useState('');
  const [hit, setHit] = useState(null);
  const [struk, setStruk] = useState(null);
  const [msg, setMsg] = useState('');

  const cari = async (e) => {
    e.preventDefault(); setMsg(''); setStruk(null); setHit(null);
    try { const { id_parkir } = await api('/transaksi/cari?q=' + encodeURIComponent(q)); setHit(await api(`/transaksi/${id_parkir}/hitung`)); }
    catch (x) { setMsg(x.message); }
  };
  const bayar = async () => {
    try { setStruk(await api(`/transaksi/${hit.id_parkir}/keluar`, 'POST')); setHit(null); setQ(''); }
    catch (x) { setMsg(x.message); }
  };
  return (
    <div>
      <h3>Kendaraan Keluar</h3>
      <form onSubmit={cari}>
        <input placeholder="Plat nomor / kode parkir" value={q} onChange={(e) => setQ(e.target.value)} required />
        <button>Hitung Tarif</button>
      </form>
      {hit && <p>{hit.plat_nomor}: {hit.durasi_jam} jam = <b>Rp{hit.biaya_total}</b> <button onClick={bayar}>Bayar & Selesai</button></p>}
      {struk && <Struk jenis="keluar" data={struk} />}
      <b style={{ color: 'red' }}>{msg}</b>
    </div>
  );
}
