import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Laporan() {
  const [d, setD] = useState({ total: 0, transaksi: [] });
  const [r, setR] = useState({ dari: '', sampai: '' });
  const load = () => api(`/laporan?dari=${r.dari}&sampai=${r.sampai}`).then(setD);
  useEffect(() => { load(); }, []);
  return (
    <div>
      <h3>Laporan Pendapatan</h3>
      <input type="date" value={r.dari} onChange={(e) => setR({ ...r, dari: e.target.value })} />
      <input type="date" value={r.sampai} onChange={(e) => setR({ ...r, sampai: e.target.value })} />
      <button onClick={load}>Tampilkan</button>
      <p>Total: <b>Rp{d.total}</b></p>
      <table border="1" cellPadding="4"><tbody>{d.transaksi.map((t) => (
        <tr key={t.id_parkir}><td>{t.plat_nomor}</td><td>{t.waktu_keluar}</td><td>{t.durasi_jam} jam</td><td>Rp{t.biaya_total}</td></tr>))}</tbody></table>
    </div>
  );
}
