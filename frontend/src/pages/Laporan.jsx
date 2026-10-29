import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Laporan() {
  const [d, setD] = useState({ total: 0, transaksi: [] });
  const [info, setInfo] = useState(null);
  const [r, setR] = useState({ dari: '', sampai: '' });

  const load = () => {
    api(`/laporan?dari=${r.dari}&sampai=${r.sampai}`).then(setD);
    api('/publik/info').then(setInfo).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const exportCsv = () => {
    const rows = [
      'plat,waktu_keluar,durasi_jam,biaya_total',
      ...d.transaksi.map((t) => [t.plat_nomor, t.waktu_keluar, t.durasi_jam, t.biaya_total].join(',')),
    ];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
    a.download = 'rekap-parkir.csv';
    a.click();
  };

  return (
    <div className="panel-card">
      <h3>👑 Dashboard Owner • Rekapitulasi Transaksi & Pendapatan</h3>
      <div className="form-row">
        <input type="date" value={r.dari} onChange={(e) => setR({ ...r, dari: e.target.value })} />
        <input type="date" value={r.sampai} onChange={(e) => setR({ ...r, sampai: e.target.value })} />
        <button
          onClick={() => {
            load();
            window.dispatchEvent(new CustomEvent('parkir:aksi', { detail: { aksi: 'filter-laporan' } }));
          }}
        >
          Filter Tanggal
        </button>
        <button className="btn-ghost" onClick={() => window.print()}>
          🖨️ Cetak Rekap
        </button>
        <button className="btn-ghost" onClick={exportCsv}>
          📥 Export CSV
        </button>
      </div>

      <div className="area-grid" style={{ marginTop: 14, marginBottom: 8 }}>
        <div className="area-item">
          <div style={{ fontSize: 12, color: '#524b70', fontWeight: 600 }}>TOTAL PENDAPATAN PERIODE</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#5b21b6', marginTop: 4 }}>
            Rp{Number(d.total).toLocaleString('id-ID')}
          </div>
        </div>
        <div className="area-item">
          <div style={{ fontSize: 12, color: '#524b70', fontWeight: 600 }}>TRANSAKSI SELESAI</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#9333ea', marginTop: 4 }}>
            {d.transaksi.length} Kendaraan
          </div>
        </div>
        <div className="area-item">
          <div style={{ fontSize: 12, color: '#524b70', fontWeight: 600 }}>KENDARAAN SEDANG PARKIR</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#db2777', marginTop: 4 }}>
            {info ? info.total_aktif : 0} Unit Aktif
          </div>
        </div>
      </div>

      {info && info.areas && (
        <div className="area-grid" style={{ marginTop: 10 }}>
          {info.areas.map((a) => {
            const pct = a.kapasitas ? Math.min(100, Math.round((a.terisi / a.kapasitas) * 100)) : 0;
            return (
              <div key={a.id_area} className="area-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                  <span>{a.nama_area}</span>
                  <span style={{ color: '#7c3aed' }}>{a.terisi} / {a.kapasitas} slot ({pct}%)</span>
                </div>
                <div className="area-bar">
                  <div className="area-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Kode</th>
            <th>Plat Nomor</th>
            <th>Waktu Masuk</th>
            <th>Waktu Keluar</th>
            <th>Durasi</th>
            <th>Total Biaya</th>
          </tr>
        </thead>
        <tbody>
          {d.transaksi.map((t) => (
            <tr key={t.id_parkir}>
              <td>#{t.id_parkir}</td>
              <td><b>{t.plat_nomor}</b></td>
              <td>{new Date(t.waktu_masuk).toLocaleString('id-ID')}</td>
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
