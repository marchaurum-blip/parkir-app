import { useEffect, useState } from 'react';
import { api } from '../api.js';

const CFG = {
  users: { label: '👤 Data User', pk: 'id_user', fields: ['nama_lengkap', 'username', 'password', 'role'] },
  tarif: { label: '🏷️ Tarif Parkir', pk: 'id_tarif', fields: ['jenis_kendaraan', 'tarif_per_jam'] },
  area: { label: '🅿️ Area Parkir', pk: 'id_area', fields: ['nama_area', 'kapasitas'] },
  kendaraan: { label: '🚗 Data Kendaraan', pk: 'id_kendaraan', fields: ['plat_nomor', 'jenis_kendaraan', 'warna', 'pemilik'] },
  logs: { label: '📜 Log Aktivitas', pk: 'id_log', fields: ['username', 'aktivitas', 'waktu_aktivitas'], readOnly: true },
};

export default function Master() {
  const [t, setT] = useState('users');
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({});
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState('');
  const { pk, fields, readOnly } = CFG[t];

  const load = () => api('/' + t).then(setRows);

  useEffect(() => {
    setF({});
    setEditId(null);
    setMsg('');
    load();
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
      window.dispatchEvent(new CustomEvent('parkir:aksi', { detail: { aksi: 'master-save', tabel: t } }));
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
    window.dispatchEvent(new CustomEvent('parkir:aksi', { detail: { aksi: 'master-edit', id: r[pk] } }));
  };

  const del = (id) =>
    api(`/${t}/${id}`, 'DELETE')
      .then(() => {
        window.dispatchEvent(new CustomEvent('parkir:aksi', { detail: { aksi: 'master-delete', id } }));
        load();
      })
      .catch((x) => setMsg(x.message));

  return (
    <div className="panel-card">
      <h3>🛠️ Manajemen Data Master & Log Sistem</h3>
      <div style={{ marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {Object.keys(CFG).map((k) => (
          <button
            key={k}
            className={k === t ? '' : 'btn-ghost'}
            onClick={() => {
              setT(k);
              window.dispatchEvent(new CustomEvent('parkir:aksi', { detail: { aksi: 'master-tab', tab: k } }));
            }}
            disabled={k === t}
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
          <button type="submit">{editId ? '💾 Simpan Perubahan' : '➕ Tambah Data'}</button>
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
          {msg && <b style={{ color: '#6d28d9', marginLeft: 8 }}>{msg}</b>}
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
  );
}
