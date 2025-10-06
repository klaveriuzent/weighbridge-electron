# ⚖️ Weighbridge Desktop App

Aplikasi **timbangan mobil berbasis desktop** menggunakan **Electron**, **SQLite**, dan **SerialPort**.  
Dapat berjalan **offline**, membaca data berat dari **port COM**, dan menyimpan hasilnya ke database lokal.

---

## 🚀 Fitur Utama

- Baca data dari **timbangan via port COM** (RS232)
- Simpan otomatis ke **SQLite (offline database)**
- Tampilkan hasil timbangan di UI
- Dapat dijalankan di **Windows (x64)**
- Tidak butuh instalasi server database

---

## 🧩 Teknologi yang Digunakan

| Komponen        | Versi Disarankan |
|-----------------|------------------|
| **Node.js**     | v20.15.0 (LTS)   |
| **Electron**    | v38.2.1          |
| **SerialPort**  | v12.0.0          |
| **better-sqlite3** | v9.4.0        |

---

## 📁 Struktur Folder

```
timbangan-app/
├─ package.json
├─ main.js           # proses utama Electron (window + serial + db)
├─ index.html        # UI sederhana
├─ renderer.js       # logika UI, komunikasi IPC
├─ data.db           # file SQLite otomatis dibuat
├─ rebuild.bat       # script rebuild modul native
└─ node_modules/
```

---

## ⚙️ Langkah Instalasi

1. **Clone / buat project**
   ```bash
   git clone <repo_url> timbangan-app
   cd timbangan-app
   ```

2. **Gunakan Node.js versi 20**
   ```bash
   nvm install 20.15.0
   nvm use 20.15.0
   ```

3. **Install dependensi**
   ```bash
   npm install
   ```

4. **Rebuild modul native agar cocok dengan Electron**
   ```bash
   npm rebuild better-sqlite3 serialport --runtime=electron --target=38.2.1 --disturl=https://electronjs.org/headers
   ```

5. **Jalankan aplikasi**
   ```bash
   npm start
   ```

---

## 🔧 Konfigurasi Port COM

Ubah port sesuai timbangan kamu di file `main.js`:

```js
const port = new SerialPort({ path: 'COM3', baudRate: 9600 });
```

Kalau tidak yakin, cek port yang aktif di **Device Manager → Ports (COM & LPT)**.

---

## 💾 Struktur Database

File `data.db` otomatis dibuat saat aplikasi dijalankan.

Tabel:
```sql
CREATE TABLE IF NOT EXISTS weights (
  id INTEGER PRIMARY KEY,
  value TEXT,
  time TEXT
);
```

---

## 🧱 Rebuild Cepat (Windows)

Gunakan file `rebuild.bat` agar tidak perlu mengetik perintah panjang setiap kali upgrade Electron:

```bat
@echo off
setlocal
set ELECTRON_VER=38.2.1
echo Rebuilding native modules for Electron %ELECTRON_VER%...
npm rebuild better-sqlite3 serialport --runtime=electron --target=%ELECTRON_VER% --disturl=https://electronjs.org/headers
echo Done!
pause
```

Jalankan dengan **double-click** setiap kali ganti versi Electron.

---

## 🧠 Catatan Penting

- Jalankan aplikasi dalam mode **Administrator** jika akses port COM dibatasi.
- Jangan ganti file `data.db` saat aplikasi sedang terbuka.
- Jika muncul error `MODULE_NOT_FOUND` atau `NODE_MODULE_VERSION mismatch`, jalankan `rebuild.bat`.

---

## 📄 Lisensi

Proyek ini bersifat internal.  
© 2025 Jefry Chiedi – All Rights Reserved.
