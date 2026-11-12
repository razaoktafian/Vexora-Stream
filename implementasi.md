# 🚀 Vexora Stream — Rencana Implementasi & Arsitektur Sistem

Dokumen ini memuat analisis mendalam terhadap **RVTik Stream** (https://rvtikstream.com/) serta cetak biru teknis (*blueprint*) pengembangan aplikasi tandingan yang jauh lebih unggul: **Vexora Stream**, dengan pembaruan total pada konsep UI/UX, performa arsitektur, serta **fitur unggulan Unified Multi-Platform Chat Dock (TikTok LIVE + YouTube Live secara simultan)**.

---

## 1. Analisis RVTik Stream vs Vexora Stream

### 🔍 Keterbatasan RVTik Stream Saat Ini:
1. **Hanya Mendukung TikTok**: RVTik Stream murni terkunci pada platform TikTok LIVE saja. Streamer yang melakukan *multistream* (siaran bersamaan ke TikTok dan YouTube) harus membuka dua window/dock terpisah yang merepotkan.
2. **Desain UI Kaku & Monoton**: Nuansa card gelap klasik yang padat (*dense*), kustomisasi terbatas pada preset bawaan, dan navigasi setting yang bercabang.
3. **Tanpa Simulator Offline**: Streamer kesulitan menguji tata letak video reaction, alert gift, dan font overlay di OBS jika akun TikTok sedang tidak siaran live.

### 🌟 Nilai Jual Utama Vexora Stream (Differentiator):
- **🔥 Unified Multi-Platform Dock (TikTok + YouTube Live)**:
  - Membaca chat dan event dari **TikTok LIVE** dan **YouTube Live** dalam **satu dock panel terpadu**.
  - Badge identitas platform visual yang elegan (`[TikTok]` berwarna Cyan-Pink, `[YouTube]` berwarna Ruby-Red).
  - Filter live instan: `[Semua]`, `[Hanya TikTok]`, `[Hanya YouTube]`.
  - Dukungan event monetisasi ganda: **TikTok Gifts** & **YouTube Super Chats / Memberships**.
  - **Unified Pin to Overlay**: Cukup klik 1 komentar (baik dari penonton TikTok maupun YouTube) untuk langsung disorot (*spotlight highlight*) ke overlay layar OBS dengan badge platform aslinya.
  - **Unified Text-To-Speech (TTS)**: Membacakan pesan dari kedua platform secara otomatis dengan penyebutan platform opsional.
- **Modern UI ("Cyber-Obsidian Glass")**: Tampilan studio kelas premium, ultra-clean, responsif untuk OBS Custom Browser Dock, fluid micro-animations, dan tata kelola modular.
- **Offline Event Simulator**: Studio simulator terintegrasi untuk mengetes trigger gift, super chat, audio, dan video reaction tanpa harus live beneran.
- **Ultra Low Latency & High FPS**: Engine rendering overlay 60 FPS hardware-accelerated yang sangat ringan, tidak membebani GPU saat bermain game berat.

---

## 2. Arsitektur Sistem & Tech Stack

```
   ┌──────────────────────────────┐        ┌──────────────────────────────┐
   │      TikTok LIVE Server      │        │     YouTube Live Stream      │
   └──────────────┬───────────────┘        └──────────────┬───────────────┘
                  │ (WebSocket Protobuf)                  │ (Live Chat Scraper/Poller)
                  ▼                                       ▼
   ┌──────────────────────────────────────────────────────────────────────┐
   │                   Vexora Stream Unified Backend                      │
   │  • Node.js + Express + Socket.IO Engine                              │
   │  • TikTok Connector (tiktok-live-connector)                          │
   │  • YouTube Connector (youtube-chat / live chat poller)               │
   │  • Event Normalizer Hub (Standarisasi format event TikTok & YouTube) │
   │  • Smart Queue & Cooldown Manager (Mencegah tabrakan animasi media)  │
   │  • Dual TTS Engine (WebSpeech / Edge TTS)                            │
   │  • Local Database (Konfigurasi, Rules, Soundboard, & Media Storage)  │
   └───────────────────┬──────────────────────────────┬───────────────────┘
                       │                              │
           (Socket.IO Realtime)           (Socket.IO Realtime)
                       ▼                              ▼
     ┌───────────────────────────────────┐  ┌────────────────────────────────────┐
     │    Vexora Studio Dashboard (UI)   │  │     Vexora OBS Overlay Source      │
     │  • Unified Multi-Chat Dock Panel  │  │  • Transparent 1080p/720p Canvas   │
     │  • TikTok & YouTube Connectors    │  │  • Dual-Platform Chat Bubble HUD   │
     │  • Filter Tabs (TikTok/YT/All)    │  │  • Pin Comment Spotlight Popup     │
     │  • Rule Builder (Gift & SuperChat)│  │  • Gift & Super Chat Alerts        │
     │  • Offline Event Simulator        │  │  • Interactive Goals & Cointhon    │
     │  • Soundboard & Live Control      │  │  • Video Reaction Screen (WebM)    │
     └───────────────────────────────────┘  └────────────────────────────────────┘
```

### Rekomendasi Tech Stack:
| Komponen | Pilihan Teknologi | Deskripsi & Alasan |
| :--- | :--- | :--- |
| **Backend & Relay** | **Node.js + Express + Socket.IO** | Arsitektur event-driven non-blocking yang sangat cepat mendistribusikan chat ribuan penonton. |
| **TikTok Connector** | **`tiktok-live-connector`** | Menangkap komentar, gift koin, share, follow, tap like, dan viewer count tanpa login password akun. |
| **YouTube Connector** | **`youtube-chat` / YouTube API Poller** | Menangkap live chat, Super Chat, Super Stickers, dan membership secara langsung via Video ID / URL Live. |
| **Frontend Dashboard** | **HTML5 + Vanilla JS / React + Modern CSS Glassmorphism** | Tampilan futuristik, sangat ringan memori (<40MB RAM), sempurna untuk OBS Custom Dock. |
| **OBS Overlay Engine** | **GPU CSS3 Hardware-Accelerated & Canvas** | Output transparan jernih, kompatibel 100% dengan OBS Browser Source dan TikTok LIVE Studio. |
| **TTS & Media Engine** | **Web Speech API + Edge TTS Engine** | Suara jernih bahasa Indonesia & internasional tanpa perlu sewa API berbayar. |
| **Penyimpanan Lokal** | **LocalStorage + LowDB (JSON/SQLite)** | Menyimpan aturan reaksi gift, antrean musik, soundboard, dan riwayat chat secara lokal. |

---

## 3. Konsep UI/UX Baru & Fitur Unified Dock

### 🎨 Desain Sistem: "Cyber-Obsidian Glass"
- **Palet Warna**:
  - Background Utama: `#08090c` (Obsidian Deep Space)
  - Surface Panel: `#111319` dengan glass border `rgba(255, 255, 255, 0.08)`
  - Identitas TikTok: `#00f2fe` (Neon Cyan) & `#fe2c55` (TikTok Crimson Pink)
  - Identitas YouTube: `#ff0033` (YouTube Ruby Red)
  - Aksen Streamer & Rewards: `#8b5cf6` (Electric Purple) & `#f59e0b` (Gold Amber)
- **Desain Khusus OBS Custom Dock**:
  - Bisa ditarik ke samping (*vertical sidebar*) atau ke bawah (*horizontal bar*) di OBS Studio tanpa merusak tata letak.

### 🖥️ Fitur Utama Vexora Stream:

#### 1. Dual Connection Hub (TikTok & YouTube)
- Input 1: **TikTok Username** (contoh: `@dailylife.emix`).
- Input 2: **YouTube Live ID / URL / Channel** (contoh: `https://youtube.com/watch?v=...` atau `@GamingChannel`).
- Tombol status independen: Streamer bisa mengaktifkan **TikTok saja**, **YouTube saja**, atau **Keduanya Sekaligus (Simultan)**.
- Indikator ping, status koneksi, dan jumlah penonton (*viewers*) gabungan real-time.

#### 2. Unified Multi-Platform Chat Dock
- **Platform Badge & Pembeda Visual**:
  - Chat TikTok memiliki badge mini TikTok dengan border aksen Cyan/Pink.
  - Chat YouTube memiliki badge mini YouTube dengan border aksen Ruby Red.
  - Super Chat dari YouTube ditandai dengan warna kartu sesuai nominal donasi penonton.
  - Gift dari TikTok ditandai dengan ikon gift, nama gift, dan koin.
- **Filter Tab Instan**:
  - `Semua (All)` $\rightarrow$ Gabungan chat TikTok & YouTube mengalir urut waktu.
  - `TikTok Only` $\rightarrow$ Hanya aktivitas TikTok.
  - `YouTube Only` $\rightarrow$ Hanya aktivitas YouTube.
  - `Gifts & SuperChats` $\rightarrow$ Khusus pesan donasi penonton dari kedua platform.
- **One-Click Pin to Overlay**:
  - Streamer cukup menekan tombol pin pada komentar apapun $\rightarrow$ pesan tersebut langsung tampil melayang di layar OBS dengan animasi mewah spotlight!

#### 3. Custom Reaction Rules (Gifts & Super Chats)
- Aturan otomatis untuk merespons dukungan penonton:
  - *TikTok Gift "Rose"* $\rightarrow$ Suara alert pop + icon mawar terbang.
  - *TikTok Gift Paus/Singa / YouTube SuperChat > Rp 50.000* $\rightarrow$ Putar video reaksi layar transparan (WebM green-screen) + confetti full screen.
- *Smart Queue*: Antrean video tidak akan saling menumpuk jika ada rentetan gift bersamaan.

#### 4. Unified Text-to-Speech (TTS)
- Membacakan chat dari TikTok maupun YouTube secara otomatis.
- Konfigurasi filter cerdas:
  - Format pembacaan: *"NamaPengguna: Pesan"* atau *"[YouTube] NamaPengguna: Pesan"*.
  - Opsi: Hanya baca komentar donatur (Gifter TikTok / SuperChat YouTube) atau semua komentar.
  - Tombol darurat: Mute TTS instan dari dock bar.

#### 5. Offline Test Simulator (Studio Pengujian)
- Panel simulasi interaktif tanpa perlu siaran live:
  - Tombol `[Test TikTok Chat]`
  - Tombol `[Test YouTube Chat]`
  - Tombol `[Test TikTok Rose / Big Gift]`
  - Tombol `[Test YouTube Super Chat]`
  - Tombol `[Test Pin Comment to Screen]`
- Sangat mempermudah streamer saat mengatur ukuran font dan posisi overlay di OBS Studio.

---

## 4. Standarisasi Event Normalizer (Data Schema)

Agar dashboard dan overlay dapat menampilkan chat dari TikTok dan YouTube secara mulus tanpa konflik, dibuat skema data terpadu (*Unified Stream Event*):

```json
{
  "id": "evt_1729348123_001",
  "platform": "tiktok", // atau "youtube"
  "type": "chat",       // "chat" | "gift" | "superchat" | "like" | "follow" | "member"
  "user": {
    "username": "gamer_sejati",
    "nickname": "Gamer Sejati ID",
    "avatar": "https://p16-sign.tiktokcdn.com/...",
    "badges": ["subscriber", "moderator"]
  },
  "content": {
    "text": "Halo bang, semangat live multistreaming-nya!",
    "gift": {
      "name": "Rose",
      "count": 5,
      "diamonds": 5
    },
    "superchat": {
      "amount": "Rp 25.000",
      "currency": "IDR",
      "tierColor": "#1e88e5"
    }
  },
  "timestamp": 1729348123450
}
```

---

## 5. Struktur Direktori Proyek

```
Vexora Stream/
├── implementasi.md              # Rencana implementasi & blueprint arsitektur
├── package.json                 # Node dependencies (express, socket.io, tiktok, youtube)
├── server/                      # Backend Service
│   ├── index.js                 # Entry point Express & Socket.IO server
│   ├── connectors/
│   │   ├── tiktokConnector.js   # Client penghubung TikTok LIVE
│   │   └── youtubeConnector.js  # Client penghubung YouTube Live Chat
│   ├── services/
│   │   ├── eventNormalizer.js   # Konversi event TikTok & YT ke Unified Schema
│   │   ├── queueManager.js      # Antrean media & cooldown protection
│   │   └── ttsEngine.js         # Text-to-Speech synthesizer
│   └── routes/
│       ├── session.js           # API start/stop/status sesi koneksi
│       └── config.js            # API simpan & baca setting streamer
├── client/                      # Frontend Studio & Dock
│   ├── index.html               # Halaman Vexora Studio Dashboard & Dock Panel
│   ├── overlay.html             # Halaman Transparan OBS Browser Source
│   ├── src/
│   │   ├── css/
│   │   │   ├── studio.css       # Styling Dashboard Cyber-Obsidian
│   │   │   └── overlay.css      # Styling Animasi Overlay OBS
│   │   ├── js/
│   │   │   ├── app.js           # Main controller & Socket.IO handling
│   │   │   ├── unifiedDock.js   # Logika render chat TikTok + YouTube
│   │   │   ├── pinComment.js    # Logika sorot chat ke layar
│   │   │   └── simulator.js     # Simulator event testing offline
│   │   └── overlay/
│   │       ├── overlayChat.js   # Rendering HUD chat di OBS
│   │       └── overlayAlert.js  # Rendering popup gift/superchat & video
└── assets/                      # Media bawaan
    ├── sounds/                  # Efek suara alert bawaan
    └── badges/                  # Ikon platform TikTok & YouTube
```

---

## 6. Tahapan Eksekusi Pembangunan (Roadmap)

### 📌 Fase 1: Setup Backend & Dual Connector (TikTok + YouTube)
- Inisialisasi dependensi: Express, Socket.IO, `tiktok-live-connector`, dan modul listener live chat YouTube.
- Membangun `eventNormalizer.js` untuk menggabungkan event dari kedua platform ke format seragam.
- Menyediakan endpoint REST & event Socket.IO untuk start/stop koneksi ke masing-masing platform.

### 📌 Fase 2: Pembangunan Unified Dock & Dashboard Baru
- Menerapkan desain `Cyber-Obsidian Glass` dengan hierarki visual modern.
- Membuat bilah koneksi ganda: input akun TikTok dan input URL/ID YouTube Live.
- Membangun antarmuka Live Feed dengan filter: `All`, `TikTok`, `YouTube`, dan `Donations`.
- Integrasi tombol aksi: *Pin to Overlay*, *Mute TTS*, dan *Clear Feed*.

### 📌 Fase 3: Pembuatan OBS Overlay Source Transparan
- Membuat halaman `/overlay.html` yang ringan dan bebas lag di OBS Studio.
- Menampilkan chat mengambang dengan badge platform TikTok / YouTube.
- Menyediakan widget *Spotlight Pin*: saat streamer mengklik chat di dock, animasi pop-up muncul di overlay selama beberapa detik.

### 📌 Fase 4: Sistem Alert Gift, Super Chat & Reaksi Video
- Menambahkan listener animasi untuk Gift TikTok dan Super Chat YouTube.
- Mengatur antrean cerdas (*Smart Queue*) agar animasi donasi tampil bergantian tanpa saling menimpa.
- Fitur penyesuaian durasi dan sound effect.

### 📌 Fase 5: TTS Bersama & Offline Simulator Studio
- Integrasi Text-To-Speech untuk membacakan komentar terpilih dari TikTok maupun YouTube.
- Menyediakan **Test Simulator Bar** lengkap (simulasi chat TikTok, chat YouTube, gift, dan super chat).

### 📌 Fase 6: Uji Coba di OBS Studio, Dokumentasi & Siap Pakai
- Pengujian langsung di OBS Studio (Browser Source & Custom Browser Dock).
- Optimasi konsumsi CPU dan memori.
- Menyusun panduan pemakaian langkah demi langkah (*User Guide*).

---

## 7. Versi Native Rust (Tauri v2)
- Konfigurasi `src-tauri/` telah diinisialisasi lengkap.
- Menggunakan Tauri v2 dengan Microsoft WebView2 bawaan Windows.
- Konsumsi memori turun dari ~300MB (Electron) menjadi ~35-50MB (Rust).
- Skrip eksekusi:
  - `npm run tauri:dev`: Menjalankan background server + native Rust desktop window.
  - `npm run tauri:build`: Membangun installer `.exe` / `.msi`.
- OBS Browser Dock (`/dock.html`) dan Browser Source (`/overlay.html`) tetap berfungsi 100% normal pada port 3333.
