-- Skema sesuai SPK Paket 2 UKK RPL 2025/2026
-- ==========================================================
-- DATABASE RESMI SESUAI SPK PAKET 2 UKK RPL 2025/2026
-- Database: parkir
-- ==========================================================

CREATE DATABASE IF NOT EXISTS parkir;
USE parkir;

-- 1. tb_user
CREATE TABLE IF NOT EXISTS tb_user (
    id_user INT(11) AUTO_INCREMENT PRIMARY KEY,
    nama_lengkap VARCHAR(50) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    role ENUM('admin', 'petugas', 'owner') NOT NULL,
    status_aktif TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. tb_tarif
CREATE TABLE IF NOT EXISTS tb_tarif (
    id_tarif INT(11) AUTO_INCREMENT PRIMARY KEY,
    jenis_kendaraan ENUM('motor', 'mobil', 'lainnya') NOT NULL UNIQUE,
    tarif_per_jam DECIMAL(10, 0) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. tb_area_parkir
CREATE TABLE IF NOT EXISTS tb_area_parkir (
    id_area INT(11) AUTO_INCREMENT PRIMARY KEY,
    nama_area VARCHAR(50) NOT NULL UNIQUE,
    kapasitas INT(5) NOT NULL DEFAULT 0,
    terisi INT(5) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. tb_kendaraan
CREATE TABLE IF NOT EXISTS tb_kendaraan (
    id_kendaraan INT(11) AUTO_INCREMENT PRIMARY KEY,
    plat_nomor VARCHAR(15) NOT NULL UNIQUE,
    jenis_kendaraan VARCHAR(20) NOT NULL,
    warna VARCHAR(20) DEFAULT '-',
    pemilik VARCHAR(100) DEFAULT '-',
    id_user INT(11) NULL,
    FOREIGN KEY (id_user) REFERENCES tb_user(id_user) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. tb_transaksi
CREATE TABLE IF NOT EXISTS tb_transaksi (
    id_parkir INT(11) AUTO_INCREMENT PRIMARY KEY,
    id_kendaraan INT(11) NOT NULL,
    waktu_masuk DATETIME NOT NULL,
    waktu_keluar DATETIME NULL,
    id_tarif INT(11) NOT NULL,
    durasi_jam INT(5) DEFAULT 0,
    biaya_total DECIMAL(10, 0) DEFAULT 0,
    status ENUM('masuk', 'keluar') NOT NULL DEFAULT 'masuk',
    id_user INT(11) NULL,
    id_area INT(11) NOT NULL,
    FOREIGN KEY (id_kendaraan) REFERENCES tb_kendaraan(id_kendaraan) ON UPDATE CASCADE,
    FOREIGN KEY (id_tarif) REFERENCES tb_tarif(id_tarif) ON UPDATE CASCADE,
    FOREIGN KEY (id_user) REFERENCES tb_user(id_user) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (id_area) REFERENCES tb_area_parkir(id_area) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. tb_log_aktivitas
CREATE TABLE IF NOT EXISTS tb_log_aktivitas (
    id_log INT(11) AUTO_INCREMENT PRIMARY KEY,
    id_user INT(11) NULL,
    aktivitas VARCHAR(100) NOT NULL,
    waktu_aktivitas DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_user) REFERENCES tb_user(id_user) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================================
-- DATA AWAL / SEED DATA SESUAI SPK
-- ==========================================================

-- User default (Password semua akun: 123456, disimpan sebagai hash bcrypt)
INSERT INTO tb_user (nama_lengkap, username, password, role, status_aktif) VALUES
('Administrator Utama', 'admin', '$2b$10$Rkrq64WPfAAlAxpkILTJ6uFoD7T/p9nQqQD3TuVV0WohsNQprwL96', 'admin', 1),
('Petugas Kasir 1', 'petugas', '$2b$10$Rkrq64WPfAAlAxpkILTJ6uFoD7T/p9nQqQD3TuVV0WohsNQprwL96', 'petugas', 1),
('Bapak Owner', 'owner', '$2b$10$Rkrq64WPfAAlAxpkILTJ6uFoD7T/p9nQqQD3TuVV0WohsNQprwL96', 'owner', 1)
ON DUPLICATE KEY UPDATE nama_lengkap=VALUES(nama_lengkap);

-- Tarif default
INSERT INTO tb_tarif (jenis_kendaraan, tarif_per_jam) VALUES
('motor', 2000),
('mobil', 5000),
('lainnya', 10000)
ON DUPLICATE KEY UPDATE tarif_per_jam=VALUES(tarif_per_jam);

-- Area default
INSERT INTO tb_area_parkir (nama_area, kapasitas, terisi) VALUES
('Area A (Motor)', 100, 0),
('Area B (Mobil)', 50, 0),
('Area C (Lainnya / Truk)', 20, 0)
ON DUPLICATE KEY UPDATE kapasitas=VALUES(kapasitas);
