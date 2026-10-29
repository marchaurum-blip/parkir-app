# UKK RPL 2025/2026 — Paket 2 (SPK Praktik Kejuruan)

- Kode: KM25.4.1.1 | Waktu: 11 jam | Perorangan
- **Judul: Pengembangan Aplikasi Parkir**

## Alat & bahan
PC/laptop (2 GHz, RAM 4 GB), internet ≥1 Mbps, OS, text editor/tools pemrograman, server basis data, debugging tools, aplikasi pengolah kata.

## Soal
Sebagai novice programmer, buat **Aplikasi Parkir dengan 3 level pengguna** (admin, petugas, owner).

### Skema database (database: `parkir`)
| Tabel | Kolom |
|---|---|
| tb_user | id_user int(11) PK, nama_lengkap varchar(50), username varchar(50), password varchar(100), role enum('admin','petugas','owner'), status_aktif tinyint(1) |
| tb_kendaraan | id_kendaraan int(11) PK, plat_nomor varchar(15), jenis_kendaraan varchar(20), warna varchar(20), pemilik varchar(100), id_user int(11) |
| tb_tarif | id_tarif int(11) PK, jenis_kendaraan enum('motor','mobil','lainnya'), tarif_per_jam decimal(10,0) |
| tb_area_parkir | id_area int(11) PK, nama_area varchar(50), kapasitas int(5), terisi int(5) |
| tb_transaksi | id_parkir int(11) PK, id_kendaraan int(11), waktu_masuk datetime, waktu_keluar datetime, id_tarif int(11), durasi_jam int(5), biaya_total decimal(10,0), status enum('masuk','keluar'), id_user int(11), id_area int(11) |
| tb_log_aktivitas | id_log int(11) PK, id_user int(11), aktivitas varchar(100), waktu_aktivitas datetime |

Relasi: tb_transaksi → tb_kendaraan, tb_tarif, tb_user, tb_area_parkir; tb_log_aktivitas → tb_user.

### Fitur per role
| Fitur | Admin | Petugas | Owner |
|---|:-:|:-:|:-:|
| Login / Logout | V | V | V |
| CRUD User | V | | |
| CRUD Tarif Parkir | V | | |
| CRUD Area Parkir | V | | |
| CRUD Kendaraan | V | | |
| Akses Log Aktivitas | V | | |
| Cetak struk parkir | | V | |
| Transaksi | | V | |
| Rekap transaksi sesuai waktu yang diminta | | | V |

---

## 3. Swimlane Diagram Proses Bisnis Sistem Parkir

Berikut adalah diagram Swimlane yang membagi alur kerja secara presisi berdasarkan 4 entitas peran: **Pengendara**, **Petugas Kasir**, **Sistem Aplikasi (Backend)**, dan **Database (`parkir`)**:

### A. Swimlane: Transaksi Kendaraan Masuk (Check-In) & Cetak Struk
```mermaid
sequenceDiagram
    autonumber
    actor Pengendara as Pengendara
    actor Petugas as Petugas Kasir Masuk
    participant Sistem as Sistem / Frontend
    participant Backend as Backend (Node.js)
    participant DB as Database (parkir)

    Pengendara->>Petugas: Membawa Kendaraan ke Pintu Masuk
    Petugas->>Sistem: Input Plat Nomor, Pilih Jenis Tarif (tb_tarif) & Area (tb_area_parkir)
    Sistem->>Backend: Request Transaksi Masuk
    
    Backend->>DB: Cek Plat pada tb_kendaraan & tb_transaksi (status='masuk')
    alt Kendaraan Masih Terdata di Dalam
        DB-->>Backend: Plat masih berstatus 'masuk'
        Backend-->>Sistem: Peringatan: Kendaraan belum checkout
        Sistem-->>Petugas: Tampilkan Notifikasi Kendaraan Masih di Dalam
    else Kuota Area Penuh (terisi >= kapasitas)
        Backend->>DB: Cek kuota pada tb_area_parkir
        DB-->>Backend: Area penuh
        Backend-->>Sistem: Peringatan: Slot Area Parkir Penuh
        Sistem-->>Petugas: Tampilkan Notifikasi Area Penuh
    else Kendaraan Boleh Masuk
        Backend->>DB: INSERT / Ambil id_kendaraan pada tb_kendaraan
        Backend->>DB: INSERT tb_transaksi (waktu_masuk=NOW(), status='masuk', id_user, id_area, id_tarif)
        Backend->>DB: UPDATE tb_area_parkir SET terisi = terisi + 1 WHERE id_area = ?
        Backend->>DB: INSERT tb_log_aktivitas (id_user, aktivitas='Kendaraan Masuk', waktu=NOW())
        DB-->>Backend: Transaksi Berhasil Disimpan
        Backend-->>Sistem: Return Data Transaksi Parkir
        Sistem->>Sistem: Cetak Karcis / Struk Parkir Masuk
        Petugas->>Pengendara: Serahkan Karcis Parkir & Buka Palang Masuk
    end
```

### B. Swimlane: Transaksi Kendaraan Keluar (Check-Out) & Cetak Struk Pembayaran
```mermaid
sequenceDiagram
    autonumber
    actor Pengendara as Pengendara
    actor Petugas as Petugas Kasir Keluar
    participant Sistem as Sistem / Frontend
    participant Backend as Backend (Node.js)
    participant DB as Database (parkir)

    Pengendara->>Petugas: Menyerahkan Karcis Parkir / Sebutkan Plat Nomor
    Petugas->>Sistem: Masukkan Kode Parkir / Plat Nomor
    Sistem->>Backend: Request Hitung Tarif Keluar
    
    Backend->>DB: SELECT tb_transaksi JOIN tb_tarif JOIN tb_kendaraan WHERE status='masuk'
    DB-->>Backend: Return Data waktu_masuk, jenis_kendaraan, tarif_per_jam
    
    Backend->>Backend: Hitung durasi_jam = ceil((NOW() - waktu_masuk) / 1 Jam)
    Backend->>Backend: Hitung biaya_total = durasi_jam * tarif_per_jam
    Backend-->>Sistem: Rincian Durasi Jam & Total Biaya Parkir
    Sistem-->>Petugas: Tampilkan Total Tagihan di Layar
    
    Petugas->>Pengendara: Informasikan Biaya Parkir
    Pengendara->>Petugas: Menyerahkan Uang Pembayaran
    Petugas->>Sistem: Klik Tombol Bayar & Selesaikan Transaksi
    
    Sistem->>Backend: Request Konfirmasi Pembayaran Selesai
    Backend->>DB: UPDATE tb_transaksi SET waktu_keluar=NOW(), durasi_jam=?, biaya_total=?, status='keluar', id_user=? WHERE id_parkir=?
    Backend->>DB: UPDATE tb_area_parkir SET terisi = terisi - 1 WHERE id_area=?
    Backend->>DB: INSERT tb_log_aktivitas (id_user, aktivitas='Kendaraan Keluar Selesai', waktu=NOW())
    DB-->>Backend: Update Selesai
    Backend-->>Sistem: Respon Transaksi Berhasil
    Sistem->>Sistem: Cetak Struk Bukti Pembayaran Parkir
    Petugas->>Pengendara: Serahkan Struk Pembayaran & Buka Palang Keluar
```

### C. Swimlane: Hak Akses Admin (CRUD Master & Log) dan Owner (Rekap Laporan)
```mermaid
sequenceDiagram
    autonumber
    actor User as Pengguna (Admin / Owner)
    participant Sistem as Antarmuka Dashboard
    participant Backend as Backend (server.js)
    participant DB as Database (parkir)

    User->>Sistem: Input Username & Password
    Sistem->>Backend: POST /api/auth/login
    Backend->>DB: SELECT * FROM tb_user WHERE username=? AND status_aktif=1
    DB-->>Backend: Data User & Role ('admin', 'petugas', 'owner')
    Backend->>DB: INSERT tb_log_aktivitas (User Berhasil Login)
    Backend-->>Sistem: Login Sukses + Session Role

    alt Role == 'admin'
        User->>Sistem: Akses CRUD User, CRUD Tarif, CRUD Area, CRUD Kendaraan, atau Log Aktivitas
        Sistem->>Backend: Request Query CRUD Master
        Backend->>DB: INSERT / UPDATE / DELETE pada tabel master
        Backend->>DB: INSERT tb_log_aktivitas
        DB-->>Backend: Data Master Terupdate
        Backend-->>Sistem: Tampilkan Notifikasi Sukses
    else Role == 'owner'
        User->>Sistem: Buka Menu Rekap Transaksi & Filter Tanggal (start_date s/d end_date)
        Sistem->>Backend: GET /api/laporan (Filter waktu_keluar)
        Backend->>DB: SELECT tb_transaksi WHERE status='keluar' AND DATE(waktu_keluar) BETWEEN ? AND ?
        DB-->>Backend: Rekapitulasi Data Transaksi & Total Pendapatan
        Backend-->>Sistem: Tampilkan Tabel Laporan Rekapitulasi
        Sistem->>Sistem: Cetak / Export Rekap Laporan Parkir
    end
```

---

## Langkah kerja
1–4. Siapkan komputer, install OS & software, pastikan jalan.
5. Buat struktur data + akses data (tipe data, control program).
6. Metode Waterfall/prototype: analisis kebutuhan → desain (ERD & diagram program) → implementasi → pengujian → dokumentasi.
7. **Deskripsi + flowchart/pseudocode minimal untuk: (a) login, (b) transaksi, (c) cetak struk.**
8. Dokumentasi per modul: input, proses, output + fungsi/prosedur/method.
9. Buat database dari ERD.
10. Buat folder projek, jalankan aplikasi yang dibutuhkan.
11. Coding guidelines & best practice: query efisien, pakai prosedur & fungsi, pakai array, hindari loop tak perlu, pakai LIMIT untuk data besar.
12. Debugging & perbaiki error.
13. Laporan singkat: fitur yang jalan, bug yang belum diperbaiki, rencana pengembangan.

## Yang dikumpulkan
1. Folder proyek (kode lengkap)
2. Database `.sql`
3. Dokumentasi: ERD, deskripsi program, dokumentasi fungsi/prosedur, debugging
4. Laporan evaluasi singkat
