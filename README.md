# Aplikasi Parkir (UKK RPL, SPK Paket 2)
Monorepo dengan FE dan BE terpisah. Lihat [docs/SWIMLANE_BARRIER.md](docs/SWIMLANE_BARRIER.md).

## Jalankan
```
mysql -u root < backend/database.sql
cd backend  && npm install && npm start     # port 4000
cd frontend && npm install && npm run dev   # port 5173
```
Akun awal: admin / petugas / owner, password `123456`.
