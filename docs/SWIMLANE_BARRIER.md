# Swimlane, Barrier, dan Dokumentasi — Aplikasi Parkir
> Dibuat dengan bantuan Antigravity CLI (Claude Sonnet). Acuan: SPK Paket 2 UKK RPL 2025/2026 ([SPK_II_referensi.md](SPK_II_referensi.md)).

## 1. Barrier FE / BE
| Aturan | Isi |
|---|---|
| Satu-satunya kontak | HTTP JSON ke `/api/*`. FE hanya lewat `frontend/src/api.js`. |
| Tidak berbagi kode | `frontend/` dan `backend/` punya `package.json` dan `node_modules` sendiri. Tidak ada import silang. |
| Akses DB | Hanya BE yang bicara ke MySQL. |
| Aturan bisnis di BE | Biaya, kapasitas, cek role. FE hanya menampilkan. |
| Konfigurasi | FE: `VITE_API_URL`. BE: `.env`. |

## 2. Swimlane (4 lane sesuai SPK: Pengendara, Petugas, Sistem [FE+BE], Database)
### A. Kendaraan masuk dan cetak karcis
```mermaid
sequenceDiagram
  autonumber
  actor Pengendara
  actor Petugas
  participant FE as Sistem: Frontend
  participant BE as Sistem: Backend
  participant DB as Database parkir
  Pengendara->>Petugas: bawa kendaraan ke pintu masuk
  Petugas->>FE: input plat, jenis, area
  FE->>BE: POST /api/transaksi/masuk
  BE->>DB: cek kendaraan masih berstatus masuk, cek kapasitas area
  alt masih di dalam atau area penuh
    BE-->>FE: error
    FE-->>Petugas: notifikasi
  else boleh masuk
    BE->>DB: INSERT tb_transaksi, UPDATE terisi+1, INSERT log (satu transaksi)
    BE-->>FE: data karcis
    FE->>Petugas: cetak karcis
    Petugas->>Pengendara: serahkan karcis
  end
```
### B. Kendaraan keluar dan cetak struk
```mermaid
sequenceDiagram
  autonumber
  actor Pengendara
  actor Petugas
  participant FE as Sistem: Frontend
  participant BE as Sistem: Backend
  participant DB as Database parkir
  Pengendara->>Petugas: serahkan karcis / sebut plat
  Petugas->>FE: input plat atau kode parkir
  FE->>BE: GET /api/transaksi/cari lalu GET /:id/hitung
  BE->>DB: SELECT transaksi aktif + tarif
  BE->>BE: durasi = ceil(selisih jam), biaya = durasi x tarif
  BE-->>FE: durasi dan total
  Petugas->>Pengendara: sebut biaya
  Pengendara->>Petugas: bayar
  Petugas->>FE: klik Bayar dan Selesai
  FE->>BE: POST /api/transaksi/:id/keluar
  BE->>DB: UPDATE transaksi (keluar, id_user), terisi-1, INSERT log
  BE-->>FE: data struk
  FE->>Petugas: cetak struk
  Petugas->>Pengendara: serahkan struk
```
### C. Admin dan Owner
```mermaid
sequenceDiagram
  autonumber
  actor User as Admin / Owner
  participant FE as Sistem: Frontend
  participant BE as Sistem: Backend
  participant DB as Database parkir
  User->>FE: username dan password
  FE->>BE: POST /api/auth/login
  BE->>DB: SELECT tb_user, INSERT log
  BE-->>FE: token JWT + role
  alt admin
    User->>FE: CRUD user, tarif, area, kendaraan, lihat log
    FE->>BE: /api/users /tarif /area /kendaraan /logs
    BE->>DB: INSERT / UPDATE / DELETE / SELECT + log
  else owner
    User->>FE: filter tanggal rekap
    FE->>BE: GET /api/laporan?dari=&sampai=
    BE->>DB: SELECT transaksi status keluar
    BE-->>FE: daftar + total
    FE->>User: cetak / export CSV
  end
```

## 3. ERD
```mermaid
erDiagram
  tb_user ||--o{ tb_kendaraan : memiliki
  tb_user ||--o{ tb_transaksi : memproses
  tb_user ||--o{ tb_log_aktivitas : mencatat
  tb_kendaraan ||--o{ tb_transaksi : terlibat
  tb_tarif ||--o{ tb_transaksi : dipakai
  tb_area_parkir ||--o{ tb_transaksi : lokasi
```

## 4. Flowchart (a) login, (b) transaksi, (c) struk
```mermaid
flowchart TD
  L1([Mulai]) --> L2[Input username dan password] --> L3{User aktif dan password cocok bcrypt?}
  L3 -- tidak --> L4[Tampil error] --> L2
  L3 -- ya --> L5[Buat token JWT, catat log] --> L6[Tampil menu sesuai role] --> L7([Selesai])
```
```mermaid
flowchart TD
  T1([Mulai]) --> T2[Input plat, jenis, area] --> T3{Kendaraan masih masuk atau area penuh?}
  T3 -- ya --> T4[Tolak] --> T9
  T3 -- tidak --> T5[Simpan transaksi masuk, terisi+1] --> T6[Saat keluar: durasi = ceil jam, biaya = durasi x tarif]
  T6 --> T7[Bayar: status keluar, terisi-1] --> T8[Catat log] --> T9([Selesai])
```
```mermaid
flowchart TD
  S1([Transaksi masuk/keluar berhasil]) --> S2[BE kirim data transaksi] --> S3[FE render komponen Struk] --> S4[window.print] --> S5([Selesai])
```

## 5. Dokumentasi modul (input, proses, output)
| Modul | Input | Proses | Output |
|---|---|---|---|
| `POST /auth/login` | username, password | cek tb_user, bcrypt.compare, jwt.sign | token, user |
| `auth(...roles)` | header Bearer token | verifikasi JWT dan role | lanjut / 401 / 403 |
| `crud()` | body sesuai tabel | INSERT/UPDATE/DELETE/SELECT + log | data / id |
| `POST /transaksi/masuk` | plat, jenis, warna, pemilik, id_area | validasi, transaksi atomik | data karcis |
| `GET /transaksi/cari` | q (plat/kode) | cari transaksi status masuk | id_parkir |
| `hitung()` | id_parkir | durasi ceil jam, biaya = jam x tarif | durasi, biaya |
| `POST /transaksi/:id/keluar` | id_parkir | update transaksi dan area, log | data struk |
| `GET /laporan` | dari, sampai | SELECT status keluar | total, daftar |
| FE `api()` | path, method, body | fetch + header JWT | JSON / throw Error |
| FE `Struk` | jenis, data | render + window.print | struk tercetak |

## 6. Pembagian kerja
| Lane | Tugas | Pelaksana |
|---|---|---|
| BE | skema DB, API, auth | Worker (Argon Medium) |
| FE | halaman React | Worker (Argon Medium) |
| Review dan integrasi | cek kontrak, gabung repo | Bos (Sonnet Medium) |
