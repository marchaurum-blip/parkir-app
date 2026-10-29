import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Struk from './Struk.jsx';

export default function Keluar() {
  const [q, setQ] = useState('');
  const [aktif, setAktif] = useState([]);
  const [hit, setHit] = useState(null);
  const [struk, setStruk] = useState(null);
  const [msg, setMsg] = useState('');

  const muatAktif = () => {
    api('/transaksi?status=masuk').then(setAktif).catch(() => {});
  };

  useEffect(() => { muatAktif(); }, []);

  const hitungDariKodeAtauPlat = async (nilaiCari) => {
    setMsg('');
    setStruk(null);
    setHit(null);
    try {
      const { id_parkir } = await api('/transaksi/cari?q=' + encodeURIComponent(nilaiCari));
      const detail = await api(`/transaksi/${id_parkir}/hitung`);
      setHit(detail);
      window.dispatchEvent(new CustomEvent('parkir:aksi', { detail: { aksi: 'hitung', id_parkir } }));
    } catch (x) {
      setMsg(x.message);
    }
  };

  const cari = async (e) => {
    e.preventDefault();
    await hitungDariKodeAtauPlat(q);
  };

  const bayar = async () => {
    try {
      const selesai = await api(`/transaksi/${hit.id_parkir}/keluar`, 'POST');
      setStruk(selesai);
      setHit(null);
      setQ('');
      muatAktif();
      window.dispatchEvent(new CustomEvent('parkir:aksi', { detail: { aksi: 'keluar', id_parkir: selesai.id_parkir } }));
    } catch (x) {
      setMsg(x.message);
    }
  };

  return (
    <div className="panel-card">
      <h3>📤 Check-Out & Pembayaran Parkir</h3>
      <p style={{ fontSize: 13, color: '#524b70', marginTop: -8, marginBottom: 14 }}>
        Ketik plat nomor / kode karcis, atau klik langsung salah satu kendaraan yang sedang parkir di bawah.
      </p>

      <form onSubmit={cari} className="form-row">
        <input
          placeholder="Masukkan Plat Nomor / Kode Karcis"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          required
        />
        <button type="submit">Hitung Tarif Keluar</button>
      </form>

      {aktif.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#4c1d95', marginBottom: 6 }}>
            Pilih Cepat Kendaraan Sedang Parkir ({aktif.length}):
          </div>
          <div className="mini-chips">
            {aktif.map((t) => (
              <button
                key={t.id_parkir}
                type="button"
                className="role-pill"
                onClick={() => {
                  setQ(t.plat_nomor);
                  hitungDariKodeAtauPlat(t.plat_nomor);
                }}
              >
                🚗 <b>{t.plat_nomor}</b> • Karcis #{t.id_parkir} ({t.nama_area})
              </button>
            ))}
          </div>
        </div>
      )}

      {hit && (
        <div className="stat-banner">
          Kendaraan <b>{hit.plat_nomor}</b> • Durasi <b>{hit.durasi_jam} jam</b> • Total Tagihan:{' '}
          <b>Rp{Number(hit.biaya_total).toLocaleString('id-ID')}</b>{' '}
          <button onClick={bayar} style={{ marginLeft: 12, background: '#f59e0b', color: '#16113a' }}>
            Bayar & Selesaikan
          </button>
        </div>
      )}

      {struk && (
        <div style={{ marginTop: 16 }}>
          <Struk jenis="keluar" data={struk} />
        </div>
      )}

      {msg && <p style={{ color: '#e11d48', fontWeight: 700 }}>{msg}</p>}
    </div>
  );
}
