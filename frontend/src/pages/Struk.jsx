// Struk parkir. Dicetak lewat window.print(); hanya area .struk yang tampil saat cetak.
const rp = (n) => 'Rp' + Number(n).toLocaleString('id-ID');
const fmt = (d) => (d ? new Date(d).toLocaleString('id-ID') : '-');

export default function Struk({ jenis, data }) {
  return (
    <div>
      <style>{`@media print { body * { visibility: hidden } .struk, .struk * { visibility: visible } .struk { position: absolute; left: 0; top: 0 } }`}</style>
      <div className="struk" style={{ border: '1px dashed #000', padding: 12, width: 260, fontFamily: 'monospace' }}>
        <b>PARKIR - {jenis === 'masuk' ? 'KARCIS MASUK' : 'STRUK PEMBAYARAN'}</b>
        <div>Kode : {data.id_parkir}</div>
        <div>Plat : {data.plat_nomor}</div>
        {data.nama_area && <div>Area : {data.nama_area}</div>}
        <div>Masuk: {fmt(data.waktu_masuk)}</div>
        {jenis === 'keluar' && <>
          <div>Keluar: {fmt(data.waktu_keluar)}</div>
          <div>Durasi: {data.durasi_jam} jam x {rp(data.tarif_per_jam)}</div>
          <div><b>Total : {rp(data.biaya_total)}</b></div>
        </>}
      </div>
      <button onClick={() => window.print()}>Cetak</button>
    </div>
  );
}
