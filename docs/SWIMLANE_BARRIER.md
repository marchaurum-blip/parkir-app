# Swimlane & Barrier FE / BE — Aplikasi Parkir
> Dokumen ini dibuat dengan bantuan Antigravity CLI (Claude Sonnet). Acuan: SPK Paket 2 UKK RPL 2025/2026.

## Barrier (batas FE dan BE)
| Aturan | Isi |
|---|---|
| Satu-satunya kontak | HTTP JSON ke `/api/*`. FE hanya lewat `frontend/src/api.js`. |
| Tidak berbagi kode | `frontend/` dan `backend/` punya `package.json` dan `node_modules` sendiri. Tidak ada import silang. |
| Tidak berbagi akses DB | Hanya BE yang bicara ke MySQL. FE tidak tahu skema. |
| Aturan bisnis di BE | Biaya parkir, kapasitas area, dan cek role dihitung di BE. FE hanya menampilkan. |
| Konfigurasi | FE: `VITE_API_URL`. BE: `.env` (DB, JWT, CORS). |

## Swimlane: Kendaraan Masuk
```mermaid
sequenceDiagram
  participant P as Petugas
  participant FE as Frontend (React)
  participant BE as Backend (Express)
  participant DB as MySQL
  P->>FE: isi plat, jenis, area
  FE->>BE: POST /api/transaksi/masuk (JWT)
  BE->>BE: cek role, tarif, kapasitas area
  BE->>DB: INSERT transaksi, area.terisi+1 (transaksi atomik)
  BE-->>FE: id_parkir
  FE-->>P: tiket
```

## Swimlane: Kendaraan Keluar
```mermaid
sequenceDiagram
  participant P as Petugas
  participant FE as Frontend
  participant BE as Backend
  participant DB as MySQL
  P->>FE: pilih kendaraan, klik Hitung
  FE->>BE: GET /api/transaksi/:id/hitung
  BE-->>FE: durasi_jam, biaya_total
  P->>FE: Bayar & Keluar
  FE->>BE: POST /api/transaksi/:id/keluar
  BE->>DB: UPDATE transaksi (keluar), area.terisi-1
  BE-->>FE: lunas
```

## Swimlane: Admin dan Owner
- Admin: CRUD `/api/users`, `/api/tarif`, `/api/area`, `/api/kendaraan`, lihat `/api/logs`.
- Owner: `GET /api/laporan?dari=&sampai=` (rekap pendapatan).

## Kontrak API
| Method | Path | Role |
|---|---|---|
| POST | /auth/login | publik |
| GET/POST/PUT/DELETE | /users, /tarif, /area | GET semua role login; tulis admin |
| GET/POST/PUT/DELETE | /kendaraan | tulis admin, petugas |
| POST | /transaksi/masuk | admin, petugas |
| GET | /transaksi?status=masuk | login |
| GET | /transaksi/:id/hitung | admin, petugas |
| POST | /transaksi/:id/keluar | admin, petugas |
| GET | /laporan | admin, owner |
| GET | /logs | admin |

## Pembagian kerja
| Lane | Tugas | Pelaksana |
|---|---|---|
| BE | skema DB, API, auth | Worker (Argon Medium) |
| FE | halaman React | Worker (Argon Medium) |
| Review & integrasi | cek kontrak, gabung repo | Bos (Sonnet Medium) |
