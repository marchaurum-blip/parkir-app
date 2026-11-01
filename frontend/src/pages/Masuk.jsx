import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import Struk from './Struk.jsx';
import { buatGerbang } from '../dunia3d.js';

export default function Masuk() {
  const [areas, setAreas] = useState([]);
  const [aktif, setAktif] = useState([]);
  const [f, setF] = useState({ plat_nomor: '', jenis_kendaraan: 'motor', warna: '', pemilik: '', id_area: '' });
  const [msg, setMsg] = useState('');
  const [struk, setStruk] = useState(null);

  const load = () => {
    api('/area').then((list) => {
      setAreas(list);
      if (!f.id_area && list.length > 0) {
        const tersedia = list.find((a) => a.terisi < a.kapasitas) || list[0];
        setF((prev) => ({ ...prev, id_area: prev.id_area || String(tersedia.id_area) }));
      }
    });
    api('/transaksi?status=masuk').then(setAktif).catch(() => {});
  };

  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const panggung = useRef(null);
  const gerbang = useRef(null);
  const areaPilih = areas.find((a) => String(a.id_area) === String(f.id_area));

  useEffect(() => {
    gerbang.current = buatGerbang(panggung.current, 'masuk');
    return () => gerbang.current?.hapus();
  }, []);

  useEffect(() => {
    gerbang.current?.siapkan(f.jenis_kendaraan);
  }, [f.jenis_kendaraan]);

  useEffect(() => {
    const sisa = areaPilih ? areaPilih.kapasitas - areaPilih.terisi : null;
    gerbang.current?.papan(f.plat_nomor.toUpperCase() || 'SELAMAT DATANG', areaPilih ? (sisa > 0 ? `${areaPilih.nama_area}: ${sisa} tersedia` : `${areaPilih.nama_area} penuh`) : 'Pilih area parkir');
  }, [f.plat_nomor, f.id_area, areas]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const r = await api('/transaksi/masuk', 'POST', f);
      setStruk(r);
      gerbang.current?.jalan(() => gerbang.current?.siapkan(f.jenis_kendaraan));
      setMsg(`Kendaraan ${r.plat_nomor} berhasil masuk (Karcis #${r.id_parkir})`);
      setF((prev) => ({ ...prev, plat_nomor: '', warna: '', pemilik: '' }));
      load();
    } catch (x) {
      setMsg(x.message);
    }
  };

  return (
    <>
    <div className="panggung" ref={panggung} />
    <div className="panel-card">
      <h3>Kendaraan Masuk</h3>

      <form onSubmit={submit} className="form-row">
        <input
          placeholder="Plat Nomor (mis. B 1234 XYZ)"
          value={f.plat_nomor}
          onChange={set('plat_nomor')}
          required
        />
        <select value={f.jenis_kendaraan} onChange={set('jenis_kendaraan')}>
          <option value="motor">Motor</option>
          <option value="mobil">Mobil</option>
          <option value="lainnya">Lainnya / Truk</option>
        </select>
        <input placeholder="Warna Kendaraan" value={f.warna} onChange={set('warna')} />
        <input placeholder="Nama Pemilik" value={f.pemilik} onChange={set('pemilik')} />
        <select value={f.id_area} onChange={set('id_area')} required>
          <option value="">-- Pilih Area Parkir --</option>
          {areas.map((a) => (
            <option key={a.id_area} value={a.id_area}>
              {a.nama_area} ({a.terisi}/{a.kapasitas})
            </option>
          ))}
        </select>
        <button type="submit">Simpan & Cetak Karcis</button>
        {msg && <span className="pesan">{msg}</span>}
      </form>

      <div className="area-grid">
        {areas.map((a) => {
          const pct = a.kapasitas ? Math.min(100, Math.round((a.terisi / a.kapasitas) * 100)) : 0;
          const terpilih = String(f.id_area) === String(a.id_area);
          return (
            <div
              key={a.id_area}
              className={`area-item ${terpilih ? 'area-item-active' : ''}`}
              onClick={() => {
                setF({ ...f, id_area: String(a.id_area) });
              }}
              style={{ cursor: 'pointer' }}
              title="Klik untuk memilih area parkir ini"
            >
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

      {struk && (
        <div style={{ marginTop: 18 }}>
          <Struk jenis="masuk" data={struk} />
        </div>
      )}

      {aktif.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <p className="judul-kecil">Sedang parkir ({aktif.length})</p>
          <table>
            <thead>
              <tr>
                <th>Kode Karcis</th>
                <th>Plat Nomor</th>
                <th>Jenis</th>
                <th>Area Parkir</th>
                <th>Waktu Masuk</th>
              </tr>
            </thead>
            <tbody>
              {aktif.slice(0, 8).map((t) => (
                <tr key={t.id_parkir}>
                  <td><b>#{t.id_parkir}</b></td>
                  <td><b>{t.plat_nomor}</b></td>
                  <td>{t.jenis_kendaraan}</td>
                  <td>{t.nama_area}</td>
                  <td>{new Date(t.waktu_masuk).toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </>
  );
}
