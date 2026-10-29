import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Keluar() {
  const [rows, setRows] = useState([]);
  const [hit, setHit] = useState(null);
  const [msg, setMsg] = useState('');
  const load = () => api('/transaksi?status=masuk').then(setRows);
  useEffect(() => { load(); }, []);

  const hitung = (id) => api(`/transaksi/${id}/hitung`).then(setHit).catch((e) => setMsg(e.message));
  const bayar = async () => {
    try { const r = await api(`/transaksi/${hit.id_parkir}/keluar`, 'POST'); setMsg(`Lunas Rp${r.biaya_total}`); setHit(null); load(); }
    catch (e) { setMsg(e.message); }
  };
  return (
    <div>
      <h3>Kendaraan Parkir / Keluar</h3>
      <table border="1" cellPadding="4">
        <thead><tr><th>Plat</th><th>Area</th><th>Masuk</th><th /></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id_parkir}><td>{r.plat_nomor}</td><td>{r.nama_area}</td><td>{r.waktu_masuk}</td>
            <td><button onClick={() => hitung(r.id_parkir)}>Hitung</button></td></tr>))}</tbody>
      </table>
      {hit && <p>{hit.plat_nomor}: {hit.durasi_jam} jam = <b>Rp{hit.biaya_total}</b> <button onClick={bayar}>Bayar & Keluar</button></p>}
      <b>{msg}</b>
    </div>
  );
}
