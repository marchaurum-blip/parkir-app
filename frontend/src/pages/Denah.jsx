// Denah basement: slot tersedia dan analisis per area. 3D kalau ada WebGL, kalau tidak denah 2D.
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { buatDenah, tataZona } from '../denah3d.js';

const rp = (n) => 'Rp' + Number(n).toLocaleString('id-ID');

function infoSlot(s) {
  if (!s.terisi) return { judul: `Slot ${s.kode}`, isi: 'Tersedia' };
  const k = s.kendaraan || {};
  return {
    judul: k.plat_nomor ? `${s.kode}  ${k.plat_nomor}` : `Slot ${s.kode}`,
    isi: k.waktu_masuk
      ? `${k.jenis_kendaraan}, masuk ${new Date(k.waktu_masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
      : 'Terisi',
  };
}

export default function Denah({ role }) {
  const wadah = useRef(null);
  const denah = useRef(null);
  const [data, setData] = useState(null);
  const [tanpa3D, setTanpa3D] = useState(false);
  const [fokus, setFokus] = useState(null);
  const [hover, setHover] = useState(null);
  const [pendapatan, setPendapatan] = useState(null);
  const [err, setErr] = useState('');

  const muat = () => {
    Promise.all([api('/publik/info'), api('/transaksi?status=masuk')])
      .then(([info, kendaraan]) => { setData({ areas: info.areas, kendaraan, waktu: new Date() }); setErr(''); })
      .catch((x) => setErr(x.message));
    if (role !== 'petugas') {
      const hari = new Date().toLocaleDateString('sv-SE');
      api(`/laporan?dari=${hari}&sampai=${hari}`).then((r) => setPendapatan(r.total)).catch(() => {});
    }
  };

  useEffect(() => {
    denah.current = buatDenah(wadah.current, { onHover: setHover });
    if (!denah.current) setTanpa3D(true);
    muat();
    const t = setInterval(muat, 20000);
    return () => { clearInterval(t); denah.current?.hapus(); };
  }, []);

  useEffect(() => {
    if (data) denah.current?.perbarui(data.areas, data.kendaraan);
  }, [data]);

  const pilih = (i) => {
    const baru = fokus === i ? null : i;
    setFokus(baru);
    denah.current?.fokus(baru);
  };

  const tata = useMemo(() => (data ? tataZona(data.areas, data.kendaraan) : null), [data]);
  const areas = data?.areas || [];
  const kapasitas = areas.reduce((s, a) => s + a.kapasitas, 0);
  const terisi = areas.reduce((s, a) => s + a.terisi, 0);
  const tersedia = Math.max(kapasitas - terisi, 0);
  const tip = hover && infoSlot(hover.slot);

  return (
    <div className="denah">
      <aside className="denah-sisi">
        <h3>Denah Basement</h3>
        <div className="denah-utama">
          <span className="stat-label">Slot tersedia</span>
          <span className="denah-angka">{tersedia}</span>
          <span className="stat-label">dari {kapasitas} slot</span>
        </div>
        <div className="denah-baris">
          <div><span className="stat-label">Terisi</span><b>{terisi}</b></div>
          <div><span className="stat-label">Okupansi</span><b>{kapasitas ? Math.round((terisi / kapasitas) * 100) : 0}%</b></div>
          {pendapatan !== null && <div><span className="stat-label">Pendapatan hari ini</span><b>{rp(pendapatan)}</b></div>}
        </div>

        <p className="judul-kecil">Area</p>
        {areas.map((a, i) => {
          const sisa = Math.max(a.kapasitas - a.terisi, 0);
          const pct = a.kapasitas ? Math.min(100, Math.round((a.terisi / a.kapasitas) * 100)) : 0;
          return (
            <button key={a.id_area} type="button" className={`denah-area ${fokus === i ? 'denah-area-aktif' : ''}`} onClick={() => pilih(i)}>
              <span className="area-judul">
                <span>{a.nama_area}</span>
                <span className="area-angka">{a.terisi}/{a.kapasitas}</span>
              </span>
              <span className="area-bar"><span className="area-fill" style={{ width: `${pct}%`, display: 'block' }} /></span>
              <span className={sisa ? 'denah-sisa' : 'denah-penuh'}>{sisa ? `${sisa} slot tersedia` : 'Penuh'}</span>
            </button>
          );
        })}

        <div className="denah-legenda">
          <span><i className="titik-tersedia" />Tersedia</span>
          <span><i className="titik-terisi" />Terisi</span>
        </div>
        <p className="denah-catatan">Jumlah sesuai data. Posisi slot hanya gambaran.</p>
        {err && <p className="pesan-error">{err}</p>}
      </aside>

      <div className="denah-kanvas" ref={wadah}>
        {tip && (
          <div className="denah-tip" style={{ left: hover.x + 14, top: hover.y + 14 }}>
            <b>{tip.judul}</b>
            <span>{tip.isi}</span>
          </div>
        )}
        {tanpa3D && tata && (
          <div className="denah-2d">
            {tata.zona.map((z) => (
              <div key={z.huruf} className="denah-2d-area">
                <p className="judul-kecil">{z.huruf}. {z.area.nama_area}</p>
                <div className="denah-2d-grid" style={{ gridTemplateColumns: `repeat(${z.kolom}, 1fr)` }}>
                  {z.slot.map((s) => (
                    <span key={s.kode} className={s.terisi ? 'slot-terisi' : 'slot-tersedia'} title={`${infoSlot(s).judul}: ${infoSlot(s).isi}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
