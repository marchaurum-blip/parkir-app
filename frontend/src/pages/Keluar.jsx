import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import Struk from './Struk.jsx';
import { buatGerbang } from '../dunia3d.js';

export default function Keluar() {
  const [q, setQ] = useState('');
  const [aktif, setAktif] = useState([]);
  const [hit, setHit] = useState(null);
  const [struk, setStruk] = useState(null);
  const [msg, setMsg] = useState('');

  const muatAktif = () => {
    api('/transaksi?status=masuk').then(setAktif).catch(() => {});
  };

  const panggung = useRef(null);
  const gerbang = useRef(null);

  useEffect(() => {
    muatAktif();
    gerbang.current = buatGerbang(panggung.current, 'keluar');
    gerbang.current?.papan('SIAP MELAYANI', 'Pilih kendaraan yang keluar');
    return () => gerbang.current?.hapus();
  }, []);

  const hitungDariKodeAtauPlat = async (nilaiCari) => {
    setMsg('');
    setStruk(null);
    setHit(null);
    try {
      const { id_parkir } = await api('/transaksi/cari?q=' + encodeURIComponent(nilaiCari));
      const detail = await api(`/transaksi/${id_parkir}/hitung`);
      setHit(detail);
      gerbang.current?.siapkan(aktif.find((t) => t.id_parkir === id_parkir)?.jenis_kendaraan);
      gerbang.current?.papan(detail.plat_nomor, `${detail.durasi_jam} jam, Rp${Number(detail.biaya_total).toLocaleString('id-ID')}`);
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
      gerbang.current?.papan('TERIMA KASIH', selesai.plat_nomor);
      gerbang.current?.jalan();
      setHit(null);
      setQ('');
      muatAktif();
    } catch (x) {
      setMsg(x.message);
    }
  };

  return (
    <>
    <div className="panggung" ref={panggung} />
    <div className="panel-card">
      <h3>Kendaraan Keluar</h3>
      <p className="keterangan">Ketik plat nomor atau kode karcis, atau pilih kendaraan di bawah.</p>

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
        <div style={{ marginTop: 16 }}>
          <p className="judul-kecil">Sedang parkir ({aktif.length})</p>
          <div className="mini-chips">
            {aktif.map((t) => (
              <button
                key={t.id_parkir}
                type="button"
                className="btn-ghost btn-xs"
                onClick={() => {
                  setQ(t.plat_nomor);
                  hitungDariKodeAtauPlat(t.plat_nomor);
                }}
              >
                <b>{t.plat_nomor}</b> #{t.id_parkir}
              </button>
            ))}
          </div>
        </div>
      )}

      {hit && (
        <div className="tagihan">
          <span>
            <b>{hit.plat_nomor}</b>, {hit.durasi_jam} jam, total{' '}
            <b>Rp{Number(hit.biaya_total).toLocaleString('id-ID')}</b>
          </span>
          <button onClick={bayar}>Bayar & Selesaikan</button>
        </div>
      )}

      {struk && (
        <div style={{ marginTop: 16 }}>
          <Struk jenis="keluar" data={struk} />
        </div>
      )}

      {msg && <p className="pesan-error">{msg}</p>}
    </div>
    </>
  );
}
