import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { buatRuangServer } from '../dunia3d.js';

const CFG = {
  users: { label: 'Data User', pk: 'id_user', fields: ['nama_lengkap', 'username', 'password', 'role'] },
  tarif: { label: 'Tarif Parkir', pk: 'id_tarif', fields: ['jenis_kendaraan', 'tarif_per_jam'] },
  area: { label: 'Area Parkir', pk: 'id_area', fields: ['nama_area', 'kapasitas'] },
  kendaraan: { label: 'Data Kendaraan', pk: 'id_kendaraan', fields: ['plat_nomor', 'jenis_kendaraan', 'warna', 'pemilik'] },
  logs: { label: 'Log Aktivitas', pk: 'id_log', fields: ['username', 'aktivitas', 'waktu_aktivitas'], readOnly: true },
};

export default function Master() {
  const [t, setT] = useState('users');
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({});
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState('');
  const { pk, fields, readOnly } = CFG[t];

  const panggung = useRef(null);
  const ruang = useRef(null);

  const load = () => api('/' + t).then((r) => { setRows(r); ruang.current?.isi(t, r.length); });

  useEffect(() => {
    ruang.current = buatRuangServer(panggung.current, {
      daftar: Object.entries(CFG).map(([k, v]) => [k, v.label]),
      onPilih: setT,
    });
    ruang.current?.pilih(t);
    Object.keys(CFG).forEach((k) => api('/' + k).then((r) => ruang.current?.isi(k, r.length)).catch(() => {}));
    return () => ruang.current?.hapus();
  }, []);

  useEffect(() => {
    setF({});
    setEditId(null);
    setMsg('');
    load();
    ruang.current?.pilih(t);
  }, [t]);

  const simpan = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        const body = {};
        for (const k of fields) {
          if (k === 'password' && !f[k]) continue;
          if (f[k] !== undefined) body[k] = f[k];
        }
        await api(`/${t}/${editId}`, 'PUT', body);
        setMsg('Data berhasil diperbarui');
      } else {
        await api('/' + t, 'POST', f);
        setMsg('Data baru berhasil ditambahkan');
      }
      setF({});
      setEditId(null);
      load();
    } catch (x) {
      setMsg(x.message);
    }
  };

  const mulaiEdit = (r) => {
    const nextF = {};
    for (const k of fields) {
      nextF[k] = k === 'password' ? '' : (r[k] ?? '');
    }
    setF(nextF);
    setEditId(r[pk]);
    setMsg('');
  };

  const del = (id) =>
    api(`/${t}/${id}`, 'DELETE')
      .then(() => {
        load();
      })
      .catch((x) => setMsg(x.message));

  return (
    <>
    <div className="panggung" ref={panggung} />
    <div className="panel-card">
      <h3>Data Master</h3>
      <div style={{ marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {Object.keys(CFG).map((k) => (
          <button
            key={k}
            className={`tab ${k === t ? 'tab-active' : ''}`}
            onClick={() => setT(k)}
          >
            {CFG[k].label}
          </button>
        ))}
      </div>

      {!readOnly && (
        <form onSubmit={simpan} className="form-row" style={{ marginBottom: 12 }}>
          {fields.map((k) => (
            <input
              key={k}
              placeholder={k === 'password' && editId ? 'password baru (opsional)' : k.replace('_', ' ')}
              value={f[k] || ''}
              onChange={(e) => setF({ ...f, [k]: e.target.value })}
            />
          ))}
          <button type="submit">{editId ? 'Simpan Perubahan' : 'Tambah Data'}</button>
          {editId && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setEditId(null);
                setF({});
              }}
            >
              Batal
            </button>
          )}
          {msg && <span className="pesan">{msg}</span>}
        </form>
      )}

      <table>
        <thead>
          <tr>
            {fields.filter((k) => k !== 'password').map((k) => (
              <th key={k}>{k.replace('_', ' ')}</th>
            ))}
            {!readOnly && <th>Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[pk]} className={editId === r[pk] ? 'row-editing' : ''}>
              {fields.filter((k) => k !== 'password').map((k) => (
                <td key={k}>{r[k]}</td>
              ))}
              {!readOnly && (
                <td>
                  <button type="button" className="btn-ghost" onClick={() => mulaiEdit(r)}>
                    Ubah
                  </button>
                  <button type="button" className="btn-danger" onClick={() => del(r[pk])}>
                    Hapus
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}
