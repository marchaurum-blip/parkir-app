import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Laporan() {
  const [d, setD] = useState({ total: 0, transaksi: [] });
  const [r, setR] = useState({ dari: '', sampai: '' });
  const load = () => api(`/laporan?dari=${r.dari}&sampai=${r.sampai}`).then(setD);
  useEffect(() => { load(); }, []);
  const exportCsv = () => {
    const rows = ['plat,waktu_keluar,durasi_jam,biaya_total', ...d.transaksi.map((t) => [t.plat_nomor, t.waktu_keluar, t.durasi_jam, t.biaya_total].join(','))];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
    a.download = 'rekap-parkir.csv'; a.click();
  };
  return (
    <div>
      <h3>Laporan Pendapatan</h3>
      <input type="date" value={r.dari} onChange={(e) => setR({ ...r, dari: e.target.value })} />
      <input type="date" value={r.sampai} onChange={(e) => setR({ ...r, sampai: e.target.value })} />
      <button onClick={load}>Tampilkan</button>
      <button onClick={() => window.print()}>Cetak</button>
      <button onClick={exportCsv}>Export CSV</button>
      <p>Total: <b>Rp{d.total}</b></p>
      <table border="1" cellPadding="4"><tbody>{d.transaksi.map((t) => (
        <tr key={t.id_parkir}><td>{t.plat_nomor}</td><td>{t.waktu_keluar}</td><td>{t.durasi_jam} jam</td><td>Rp{t.biaya_total}</td></tr>))}</tbody></table>
    </div>
  );
}
