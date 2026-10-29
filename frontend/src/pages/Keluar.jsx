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
    <div className="panel-card">
      <h3>Check-Out & Pembayaran Parkir</h3>
      <form onSubmit={cari} className="form-row">
        <input placeholder="Masukkan Plat Nomor / Kode Karcis" value={q} onChange={(e) => setQ(e.target.value)} required />
        <button>Hitung Tarif Keluar</button>
      </form>
      {hit && (
        <div className="stat-banner">
          Kendaraan <b>{hit.plat_nomor}</b> • Durasi <b>{hit.durasi_jam} jam</b> • Total Tagihan:{' '}
          <b>Rp{Number(hit.biaya_total).toLocaleString('id-ID')}</b>{' '}
          <button onClick={bayar} style={{ marginLeft: 12, background: '#f59e0b', color: '#16113a' }}>
            Bayar & Selesaikan
          </button>
        </div>
      )}
      {struk && <div style={{ marginTop: 16 }}><Struk jenis="keluar" data={struk} /></div>}
      {msg && <p style={{ color: '#e11d48', fontWeight: 700 }}>{msg}</p>}
    </div>
  );
}
