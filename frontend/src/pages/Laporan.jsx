import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { buatKota } from '../dunia3d.js';

const tanggalLokal = (w) => new Date(w).toLocaleDateString('sv-SE');
const HARI_KOTA = 14;

// Pendapatan per hari untuk gedung-gedung di kota, hari kosong tetap dapat tempat
function rekapHarian(transaksi) {
  const hari = [...Array(HARI_KOTA).keys()].reverse().map((i) => {
    const t = new Date();
    t.setDate(t.getDate() - i);
    return { tanggal: tanggalLokal(t), label: `${t.getDate()}/${t.getMonth() + 1}`, total: 0, jumlah: 0, hariIni: i === 0 };
  });
  transaksi.forEach((x) => {
    const h = hari.find((a) => a.tanggal === tanggalLokal(x.waktu_keluar));
    if (h) { h.total += Number(x.biaya_total); h.jumlah += 1; }
  });
  return hari.filter((h, i) => h.jumlah || i === HARI_KOTA - 1);
}

export default function Laporan() {
  const [d, setD] = useState({ total: 0, transaksi: [] });
  const [info, setInfo] = useState(null);
  const [r, setR] = useState({ dari: '', sampai: '' });

  const panggung = useRef(null);
  const kota = useRef(null);
  const rentang = useRef(r);
  rentang.current = r;

  const load = (rentang = r) => {
    api(`/laporan?dari=${rentang.dari}&sampai=${rentang.sampai}`).then(setD);
    api('/publik/info').then(setInfo).catch(() => {});
  };

  useEffect(() => {
    load();
    // Klik gedung = lihat transaksi hari itu, klik lagi = semua
    kota.current = buatKota(panggung.current, {
      onPilih: (tanggal) => {
        const baru = rentang.current.dari === tanggal && rentang.current.sampai === tanggal ? { dari: '', sampai: '' } : { dari: tanggal, sampai: tanggal };
        setR(baru);
        load(baru);
        kota.current?.pilih(baru.dari);
      },
    });
    api('/laporan').then((x) => kota.current?.perbarui(rekapHarian(x.transaksi))).catch(() => {});
    return () => kota.current?.hapus();
  }, []);

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
    <>
    <div className="panggung" ref={panggung} />
    <div className="panel-card">
      <h3>Laporan Pendapatan</h3>
      <div className="form-row">
        <input type="date" value={r.dari} onChange={(e) => setR({ ...r, dari: e.target.value })} />
        <input type="date" value={r.sampai} onChange={(e) => setR({ ...r, sampai: e.target.value })} />
        <button onClick={() => { load(); kota.current?.pilih(r.dari === r.sampai ? r.dari : ''); }}>Filter Tanggal</button>
        <button className="btn-ghost" onClick={() => window.print()}>Cetak Rekap</button>
        <button className="btn-ghost" onClick={exportCsv}>Export CSV</button>
      </div>

      <div className="area-grid">
        <div className="area-item">
          <div className="stat-label">Total pendapatan periode</div>
          <div className="stat-nilai">Rp{Number(d.total).toLocaleString('id-ID')}</div>
        </div>
        <div className="area-item">
          <div className="stat-label">Transaksi selesai</div>
          <div className="stat-nilai">{d.transaksi.length}</div>
        </div>
        <div className="area-item">
          <div className="stat-label">Sedang parkir</div>
          <div className="stat-nilai">{info ? info.total_aktif : 0}</div>
        </div>
      </div>

      {info && info.areas && (
        <div className="area-grid">
          {info.areas.map((a) => {
            const pct = a.kapasitas ? Math.min(100, Math.round((a.terisi / a.kapasitas) * 100)) : 0;
            return (
              <div key={a.id_area} className="area-item">
                <div className="area-judul">
                  <span>{a.nama_area}</span>
                  <span className="area-angka">{a.terisi}/{a.kapasitas}</span>
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
    </>
  );
}
