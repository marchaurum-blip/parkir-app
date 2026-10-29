// Backend Parkir - Express + mysql2. Dibuat dengan bantuan Antigravity CLI (Claude).
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';

const env = process.env;
const SECRET = env.JWT_SECRET || 'dev-secret';
const db = mysql.createPool({
  host: env.DB_HOST || 'localhost', user: env.DB_USER || 'root',
  password: env.DB_PASS || '', database: env.DB_NAME || 'parkir',
});
const app = express();
app.use(cors({ origin: env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

const wrap = (fn) => (req, res) => fn(req, res).catch((e) => res.status(500).json({ error: e.message }));
const log = (id, aktivitas) => db.query('INSERT INTO tb_log_aktivitas (id_user, aktivitas) VALUES (?,?)', [id, aktivitas]);

// ---- Auth middleware ----
const auth = (...roles) => (req, res, next) => {
  try {
    const t = (req.headers.authorization || '').replace('Bearer ', '');
    req.user = jwt.verify(t, SECRET);
    if (roles.length && !roles.includes(req.user.role)) return res.status(403).json({ error: 'Akses ditolak' });
    next();
  } catch { res.status(401).json({ error: 'Belum login' }); }
};

app.post('/api/auth/login', wrap(async (req, res) => {
  const { username, password } = req.body;
  const [[u]] = await db.query('SELECT * FROM tb_user WHERE username=? AND status_aktif=1', [username]);
  if (!u || !(await bcrypt.compare(password || '', u.password))) return res.status(401).json({ error: 'Username/password salah' });
  await log(u.id_user, 'Login');
  const token = jwt.sign({ id: u.id_user, role: u.role, nama: u.nama_lengkap }, SECRET, { expiresIn: '8h' });
  res.json({ token, user: { id: u.id_user, nama: u.nama_lengkap, role: u.role } });
}));

// Info publik real-time untuk terhubung langsung dengan navigasi halaman depan
app.get('/api/publik/info', wrap(async (_, res) => {
  const [areas] = await db.query('SELECT * FROM tb_area_parkir');
  const [tarifs] = await db.query('SELECT * FROM tb_tarif');
  const [[aktif]] = await db.query("SELECT COUNT(*) total_aktif FROM tb_transaksi WHERE status='masuk'");
  const [[rekap]] = await db.query("SELECT COUNT(*) total_selesai, COALESCE(SUM(biaya_total),0) pendapatan FROM tb_transaksi WHERE status='keluar'");
  res.json({ areas, tarifs, total_aktif: aktif.total_aktif, total_selesai: rekap.total_selesai, pendapatan: rekap.pendapatan });
}));

// ---- CRUD generik ----
function crud(path, table, pk, fields, roles, { hash } = {}) {
  app.get(`/api/${path}`, auth(), wrap(async (_, res) => {
    const cols = hash ? 'id_user,nama_lengkap,username,role,status_aktif' : '*';
    res.json((await db.query(`SELECT ${cols} FROM ${table}`))[0]);
  }));
  const pick = async (b) => {
    const d = Object.fromEntries(fields.filter((f) => b[f] !== undefined).map((f) => [f, b[f]]));
    if (hash && d.password) d.password = await bcrypt.hash(d.password, 10);
    return d;
  };
  app.post(`/api/${path}`, auth(...roles), wrap(async (req, res) => {
    const d = await pick(req.body);
    const [r] = await db.query(`INSERT INTO ${table} SET ?`, [d]);
    await log(req.user.id, `Tambah ${path} #${r.insertId}`);
    res.status(201).json({ id: r.insertId });
  }));
  app.put(`/api/${path}/:id`, auth(...roles), wrap(async (req, res) => {
    await db.query(`UPDATE ${table} SET ? WHERE ${pk}=?`, [await pick(req.body), req.params.id]);
    await log(req.user.id, `Ubah ${path} #${req.params.id}`);
    res.json({ ok: true });
  }));
  app.delete(`/api/${path}/:id`, auth(...roles), wrap(async (req, res) => {
    await db.query(`DELETE FROM ${table} WHERE ${pk}=?`, [req.params.id]);
    await log(req.user.id, `Hapus ${path} #${req.params.id}`);
    res.json({ ok: true });
  }));
}
crud('users', 'tb_user', 'id_user', ['nama_lengkap', 'username', 'password', 'role', 'status_aktif'], ['admin'], { hash: true });
crud('tarif', 'tb_tarif', 'id_tarif', ['jenis_kendaraan', 'tarif_per_jam'], ['admin']);
crud('area', 'tb_area_parkir', 'id_area', ['nama_area', 'kapasitas'], ['admin']);
crud('kendaraan', 'tb_kendaraan', 'id_kendaraan', ['plat_nomor', 'jenis_kendaraan', 'warna', 'pemilik'], ['admin', 'petugas']);

// ---- Transaksi ----
app.get('/api/transaksi', auth(), wrap(async (req, res) => {
  const [r] = await db.query(
    `SELECT t.*, k.plat_nomor, k.jenis_kendaraan, a.nama_area FROM tb_transaksi t
     JOIN tb_kendaraan k USING(id_kendaraan) JOIN tb_area_parkir a USING(id_area)
     ${req.query.status ? 'WHERE t.status=?' : ''} ORDER BY t.waktu_masuk DESC`, [req.query.status].filter(Boolean));
  res.json(r);
}));

app.post('/api/transaksi/masuk', auth('admin', 'petugas'), wrap(async (req, res) => {
  const { plat_nomor, jenis_kendaraan, warna, pemilik, id_area } = req.body;
  const c = await db.getConnection();
  try {
    await c.beginTransaction();
    const [[tarif]] = await c.query('SELECT id_tarif FROM tb_tarif WHERE jenis_kendaraan=?', [jenis_kendaraan]);
    if (!tarif) throw new Error('Tarif jenis kendaraan tidak ada');
    const [[area]] = await c.query('SELECT * FROM tb_area_parkir WHERE id_area=? FOR UPDATE', [id_area]);
    if (!area || area.terisi >= area.kapasitas) throw new Error('Area penuh / tidak ada');
    await c.query('INSERT INTO tb_kendaraan (plat_nomor,jenis_kendaraan,warna,pemilik) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE jenis_kendaraan=VALUES(jenis_kendaraan)',
      [plat_nomor, jenis_kendaraan, warna || '-', pemilik || '-']);
    const [[k]] = await c.query('SELECT id_kendaraan FROM tb_kendaraan WHERE plat_nomor=?', [plat_nomor]);
    const [[aktif]] = await c.query("SELECT 1 x FROM tb_transaksi WHERE id_kendaraan=? AND status='masuk'", [k.id_kendaraan]);
    if (aktif) throw new Error('Kendaraan masih parkir');
    const [r] = await c.query('INSERT INTO tb_transaksi (id_kendaraan,waktu_masuk,id_tarif,id_user,id_area) VALUES (?,NOW(),?,?,?)',
      [k.id_kendaraan, tarif.id_tarif, req.user.id, id_area]);
    await c.query('UPDATE tb_area_parkir SET terisi=terisi+1 WHERE id_area=?', [id_area]);
    await c.query('INSERT INTO tb_log_aktivitas (id_user,aktivitas) VALUES (?,?)', [req.user.id, 'Kendaraan Masuk']);
    const [[struk]] = await c.query(
      `SELECT t.id_parkir, t.waktu_masuk, k.plat_nomor, k.jenis_kendaraan, a.nama_area, tr.tarif_per_jam
       FROM tb_transaksi t JOIN tb_kendaraan k USING(id_kendaraan) JOIN tb_area_parkir a USING(id_area) JOIN tb_tarif tr USING(id_tarif)
       WHERE t.id_parkir=?`, [r.insertId]);
    await c.commit();
    res.status(201).json(struk);
  } catch (e) { await c.rollback(); res.status(400).json({ error: e.message }); } finally { c.release(); }
}));

// Cari transaksi aktif lewat plat nomor atau kode parkir (id_parkir)
app.get('/api/transaksi/cari', auth('admin', 'petugas'), wrap(async (req, res) => {
  const q = req.query.q || '';
  const [[t]] = await db.query(
    `SELECT t.id_parkir FROM tb_transaksi t JOIN tb_kendaraan k USING(id_kendaraan)
     WHERE t.status='masuk' AND (k.plat_nomor=? OR t.id_parkir=?) LIMIT 1`, [q, q]);
  if (!t) return res.status(404).json({ error: 'Kendaraan tidak ditemukan / sudah keluar' });
  res.json(t);
}));

// Biaya selalu dihitung di server: tarif x jam (dibulatkan ke atas, minimal 1 jam)
const hitung = async (c, id) => {
  const [[t]] = await c.query(
    `SELECT t.*, tr.tarif_per_jam, k.plat_nomor, GREATEST(1, CEIL(TIMESTAMPDIFF(MINUTE, t.waktu_masuk, NOW())/60)) jam
     FROM tb_transaksi t JOIN tb_tarif tr USING(id_tarif) JOIN tb_kendaraan k USING(id_kendaraan)
     WHERE t.id_parkir=? AND t.status='masuk'`, [id]);
  if (!t) throw new Error('Transaksi aktif tidak ditemukan');
  return { ...t, durasi_jam: t.jam, biaya_total: t.jam * t.tarif_per_jam };
};
app.get('/api/transaksi/:id/hitung', auth('admin', 'petugas'), wrap(async (req, res) => {
  try { res.json(await hitung(db, req.params.id)); } catch (e) { res.status(404).json({ error: e.message }); }
}));
app.post('/api/transaksi/:id/keluar', auth('admin', 'petugas'), wrap(async (req, res) => {
  const c = await db.getConnection();
  try {
    await c.beginTransaction();
    const t = await hitung(c, req.params.id);
    await c.query("UPDATE tb_transaksi SET waktu_keluar=NOW(), durasi_jam=?, biaya_total=?, status='keluar', id_user=? WHERE id_parkir=?", [t.durasi_jam, t.biaya_total, req.user.id, t.id_parkir]);
    await c.query('UPDATE tb_area_parkir SET terisi=GREATEST(terisi-1,0) WHERE id_area=?', [t.id_area]);
    await c.query('INSERT INTO tb_log_aktivitas (id_user,aktivitas) VALUES (?,?)', [req.user.id, 'Kendaraan Keluar Selesai']);
    const [[w]] = await c.query('SELECT waktu_keluar FROM tb_transaksi WHERE id_parkir=?', [t.id_parkir]);
    await c.commit();
    res.json({ id_parkir: t.id_parkir, plat_nomor: t.plat_nomor, waktu_masuk: t.waktu_masuk, waktu_keluar: w.waktu_keluar,
      tarif_per_jam: t.tarif_per_jam, durasi_jam: t.durasi_jam, biaya_total: t.biaya_total });
  } catch (e) { await c.rollback(); res.status(400).json({ error: e.message }); } finally { c.release(); }
}));

// ---- Owner / laporan ----
app.get('/api/laporan', auth('admin', 'owner'), wrap(async (req, res) => {
  const { dari, sampai } = req.query;
  const [rows] = await db.query(
    `SELECT t.*, k.plat_nomor FROM tb_transaksi t JOIN tb_kendaraan k USING(id_kendaraan)
     WHERE t.status='keluar' AND DATE(t.waktu_keluar) BETWEEN ? AND ? ORDER BY t.waktu_keluar DESC`,
    [dari || '1970-01-01', sampai || '2999-12-31']);
  res.json({ total: rows.reduce((s, r) => s + Number(r.biaya_total), 0), transaksi: rows });
}));
app.get('/api/logs', auth('admin'), wrap(async (_, res) =>
  res.json((await db.query('SELECT l.*, u.username FROM tb_log_aktivitas l LEFT JOIN tb_user u USING(id_user) ORDER BY id_log DESC LIMIT 200'))[0])));

app.listen(env.PORT || 4000, () => console.log('Backend jalan di port', env.PORT || 4000));
