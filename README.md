# ⚖️ Weighbridge Desktop App

Aplikasi **timbangan mobil berbasis desktop** menggunakan **Electron**, **React + Ant Design (UI)**, **SQLite**, dan **SerialPort**.  
Dapat berjalan **offline**, membaca data berat dari **port COM (RS232)**, dan menyimpan hasilnya ke **database lokal**.

---

## 🚀 Fitur Utama

- 🔌 Baca data otomatis dari **alat timbangan via port COM**
- 💾 Simpan hasil ke **SQLite (better-sqlite3)** — tanpa server eksternal
- 🧠 UI modern berbasis **React + Ant Design**
- 📊 Menampilkan data timbangan dan histori di tampilan desktop
- 🖥️ Build ke **Windows (x64)** — bisa **installer** atau **portable (tanpa install)**
- 📴 Dapat digunakan **offline penuh**

---

## 🧩 Teknologi yang Digunakan

| Komponen             | Versi Disarankan |
|----------------------|------------------|
| **Node.js**          | v20.15.0 (LTS)   |
| **Electron**         | v38.2.1          |
| **React**            | v19.x            |
| **Ant Design (antd)**| v5.27.x          |
| **better-sqlite3**   | v12.4.x          |
| **SerialPort**       | v13.0.x          |
| **Vite**             | v5.4.x           |

---

## 📁 Struktur Folder

```
weighbridge-electron/
├─ main.js                 # Proses utama Electron
├─ preload.js              # (opsional) Jembatan IPC ke renderer
├─ data.db                 # Database lokal SQLite
├─ vite.config.js          # Konfigurasi build React (Vite)
├─ package.json            # Script dan konfigurasi build
│
├─ renderer/               # Frontend (React + Ant Design)
│  ├─ index.html           # Entry HTML untuk Vite
│  ├─ main.jsx             # Entry point React
│  ├─ App.jsx              # Layout utama UI
│  ├─ components/          # Komponen kecil (UI reusable)
│  │   ├─ HeaderBar.jsx
│  │   └─ WeightTable.jsx
│  ├─ pages/
│  │   └─ Dashboard.jsx
│  └─ utils/
│      └─ formatDate.js
│
├─ dist/                   # Hasil build React (otomatis)
├─ release/                # Hasil build .exe (Electron Builder)
└─ node_modules/
```

---

## ⚙️ Instalasi & Menjalankan Aplikasi

1. **Clone repository**
   ```bash
   git clone <repo_url> weighbridge-electron
   cd weighbridge-electron
   ```

2. **Gunakan Node.js versi 20**
   ```bash
   nvm install 20.15.0
   nvm use 20.15.0
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Jalankan dalam mode pengembangan**
   ```bash
   npm run dev
   ```
   ➜ Membuka Electron window dengan live reload dari Vite (`localhost:5173`)

5. **Jalankan dalam mode produksi (offline)**
   ```bash
   npm start
   ```
   ➜ Menjalankan hasil build React dari folder `dist/`

---

## 🧱 Build Menjadi File `.exe`

### 🔹 Portable (langsung jalan tanpa install)
```bash
npm run portable
```
Hasil:
```
release/Weighbridge-1.0.0.exe
```

### 🔹 Installer versi setup wizard
```bash
npm run dist
```
Hasil:
```
release/Weighbridge Setup 1.0.0.exe
```

> 💡 Jika build pertama kali gagal karena `symbolic link` error,  
> jalankan terminal **Run as Administrator** atau aktifkan **Developer Mode** di Windows.

---

## 🔌 Konfigurasi Port COM

Edit file `main.js`:

```js
const port = new SerialPort({
  path: 'COM3',      // sesuaikan dengan port timbangan kamu
  baudRate: 9600
});
```

Untuk mengecek port aktif:
> Device Manager → Ports (COM & LPT)

---

## 💾 Struktur Database (SQLite)

File `data.db` otomatis dibuat di root folder aplikasi.

Tabel:
```sql
CREATE TABLE IF NOT EXISTS weights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  value TEXT,
  time TEXT
);
```

---

## 🧠 Tips & Catatan Penting

- Jalankan **CMD/PowerShell as Administrator** jika akses ke port COM diblok.
- File `data.db` aman dihapus → akan dibuat ulang otomatis.
- Jika error `MODULE_NOT_FOUND` atau `NODE_MODULE_VERSION mismatch`, jalankan:
  ```bash
  npm rebuild better-sqlite3 serialport --runtime=electron --target=38.2.1 --disturl=https://electronjs.org/headers
  ```
- Build pertama kali butuh koneksi internet (download Electron & native binaries).
- Setelah itu build bisa dilakukan **offline sepenuhnya** (pakai cache lokal).

---

## 🧰 Skrip Rebuild Cepat (Windows)

File `rebuild.bat`:

```bat
@echo off
setlocal
set ELECTRON_VER=38.2.1
echo Rebuilding native modules for Electron %ELECTRON_VER%...
npm rebuild better-sqlite3 serialport --runtime=electron --target=%ELECTRON_VER% --disturl=https://electronjs.org/headers
echo Done!
pause
```

---

## 🧾 Troubleshooting Umum

| Error / Masalah | Solusi |
|-----------------|---------|
| `Cannot create symbolic link` | Jalankan CMD as Administrator atau aktifkan Developer Mode |
| `MODULE_NOT_FOUND` | Jalankan `npm rebuild` atau `rebuild.bat` |
| Aplikasi tidak terbuka saat `npm start` | Pastikan `dist/index.html` sudah ada (jalankan `npm run build`) |
| Port COM tidak terbaca | Pastikan device RS232 muncul di Device Manager |

---

## 📄 Lisensi

Proyek ini bersifat **internal dan non-komersial**.  
© 2025 **Jefry Chiedi** — All Rights Reserved.

---

> **Catatan:**  
> Build portable `.exe` dapat dijalankan langsung di Windows tanpa instalasi,  
> cocok untuk distribusi internal (mis. operator timbang di lapangan).
