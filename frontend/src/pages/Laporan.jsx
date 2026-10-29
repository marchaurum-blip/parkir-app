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
    <div className="panel-card">
      <h3>Rekapitulasi Transaksi & Pendapatan Parkir</h3>
      <div className="form-row">
        <input type="date" value={r.dari} onChange={(e) => setR({ ...r, dari: e.target.value })} />
        <input type="date" value={r.sampai} onChange={(e) => setR({ ...r, sampai: e.target.value })} />
        <button onClick={load}>Filter Tanggal</button>
        <button className="btn-ghost" onClick={() => window.print()}>Cetak Rekap</button>
        <button className="btn-ghost" onClick={exportCsv}>Export CSV</button>
      </div>
      <div className="stat-banner">
        Total Pendapatan: <b>Rp{Number(d.total).toLocaleString('id-ID')}</b> ({d.transaksi.length} kendaraan selesai)
      </div>
      <table>
        <thead>
          <tr><th>Plat Nomor</th><th>Waktu Keluar</th><th>Durasi</th><th>Total Biaya</th></tr>
        </thead>
        <tbody>
          {d.transaksi.map((t) => (
            <tr key={t.id_parkir}>
              <td><b>{t.plat_nomor}</b></td>
              <td>{new Date(t.waktu_keluar).toLocaleString('id-ID')}</td>
              <td>{t.durasi_jam} jam</td>
              <td><b>Rp{Number(t.biaya_total).toLocaleString('id-ID')}</b></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
