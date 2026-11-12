/**
 * Vexora Stream - Core Server
 * Express + Socket.IO Unified Backend Engine dengan Multi Gift Rules, Goals, Commands, & Leaderboard
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const tiktokConnector = require('./connectors/tiktokConnector');
const youtubeConnector = require('./connectors/youtubeConnector');
const queueManager = require('./services/queueManager');
const rulesManager = require('./services/rulesManager');
const { generateEventId } = require('./services/eventNormalizer');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3333;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend
const clientPath = path.join(__dirname, '../client');
const assetsPath = path.join(__dirname, '../assets');

app.use(express.static(clientPath));
app.use('/assets', express.static(assetsPath));

// Ensure assets directories exist (hanya jika di luar asar)
try {
  if (!__dirname.includes('app.asar')) {
    const soundsDir = path.join(assetsPath, 'sounds');
    const mediaDir = path.join(assetsPath, 'media');
    if (!fs.existsSync(soundsDir)) fs.mkdirSync(soundsDir, { recursive: true });
    if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
  }
} catch (e) {
  // Abaikan error di environment asar
}

// Hubungkan QueueManager ke Socket.IO & Rules Engine
queueManager.subscribe((type, data) => {
  if (type === 'event') {
    // 1. Filter kata kasar jika ada
    if (data.content && data.content.text) {
      data.content.text = rulesManager.filterProfanity(data.content.text);
    }

    // 2. Track Goals & Leaderboard
    rulesManager.trackEventForGoals(data);
    rulesManager.trackLeaderboard(data);

    // Kirim event biasa
    io.emit('stream_event', data);
    io.emit('goals_update', rulesManager.getConfig().goals);
    io.emit('leaderboard_update', rulesManager.getLeaderboard());

    // 3. Cek apakah memicu Multi Gift Rule
    if (data.type === 'gift' || data.type === 'superchat') {
      const matchedRule = rulesManager.matchGiftRule(data);
      if (matchedRule) {
        data.hasRule = true;
        io.emit('rule_triggered', {
          rule: matchedRule,
          event: data
        });
      }
    }

    // 4. Cek apakah chat adalah Custom Command (misal: !discord)
    if (data.type === 'chat' && data.content?.text) {
      const cmdMatch = rulesManager.matchCommand(data.content.text);
      if (cmdMatch && !cmdMatch.onCooldown) {
        io.emit('command_triggered', {
          command: cmdMatch.command,
          user: data.user
        });
      }
    }
  } else if (type === 'stats') {
    io.emit('stats_update', data);
  } else if (type === 'pin') {
    io.emit('pin_update', data);
  }
});

// REST API Endpoints

/**
 * Status koneksi dan metrik live saat ini
 */
app.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    stats: queueManager.getStats(),
    pinned: queueManager.getPinnedComment(),
    history: queueManager.getHistory(30),
    config: rulesManager.getConfig(),
    leaderboard: rulesManager.getLeaderboard()
  });
});

/**
 * Hubungkan ke TikTok LIVE
 */
app.post('/api/connect/tiktok', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ ok: false, message: 'Username TikTok wajib diisi.' });
  }

  try {
    const result = await tiktokConnector.connect(username);
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message || 'Gagal terhubung ke TikTok LIVE.' });
  }
});

/**
 * Putuskan koneksi TikTok LIVE
 */
app.post('/api/disconnect/tiktok', async (req, res) => {
  try {
    await tiktokConnector.disconnect();
    res.json({ ok: true, message: 'Koneksi TikTok dihentikan.' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * Hubungkan ke YouTube Live Chat
 */
app.post('/api/connect/youtube', async (req, res) => {
  const { input } = req.body;
  if (!input) {
    return res.status(400).json({ ok: false, message: 'URL/ID Channel YouTube Live wajib diisi.' });
  }

  try {
    const result = await youtubeConnector.connect(input);
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message || 'Gagal terhubung ke YouTube Live Chat.' });
  }
});

/**
 * Putuskan koneksi YouTube Live Chat
 */
app.post('/api/disconnect/youtube', async (req, res) => {
  try {
    await youtubeConnector.disconnect();
    res.json({ ok: true, message: 'Koneksi YouTube dihentikan.' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * Sematkan komentar ke layar (Pin to Overlay)
 */
app.post('/api/pin', (req, res) => {
  const { event, duration = 30 } = req.body;
  if (!event) {
    return res.status(400).json({ ok: false, message: 'Data komentar wajib ada.' });
  }

  const pinned = queueManager.pinComment(event, Number(duration) || 30);
  res.json({ ok: true, pinned });
});

/**
 * Hapus pin komentar dari layar (Unpin)
 */
app.post('/api/unpin', (req, res) => {
  queueManager.unpinComment();
  res.json({ ok: true, message: 'Pin komentar dilepas.' });
});

/**
 * Bersihkan riwayat feed
 */
app.post('/api/clear', (req, res) => {
  queueManager.clearHistory();
  res.json({ ok: true, message: 'Riwayat dibersihkan.' });
});

// --- Config, Rules, Goals, & Commands Endpoints ---

app.get('/api/config', (req, res) => {
  res.json({
    ok: true,
    config: rulesManager.getConfig(),
    leaderboard: rulesManager.getLeaderboard()
  });
});

app.post('/api/config', (req, res) => {
  const updated = rulesManager.updateConfig(req.body);
  io.emit('config_update', updated);
  res.json({ ok: true, config: updated });
});

// Multi Gift Rules
app.post('/api/rules/add', (req, res) => {
  const newRule = rulesManager.addRule(req.body);
  io.emit('config_update', rulesManager.getConfig());
  res.json({ ok: true, rule: newRule });
});

app.post('/api/rules/update', (req, res) => {
  const { id, rule } = req.body;
  const updated = rulesManager.updateRule(id, rule);
  io.emit('config_update', rulesManager.getConfig());
  res.json({ ok: true, rule: updated });
});

app.post('/api/rules/delete', (req, res) => {
  const { id } = req.body;
  rulesManager.deleteRule(id);
  io.emit('config_update', rulesManager.getConfig());
  res.json({ ok: true, message: 'Rule dihapus.' });
});

// Goals
app.post('/api/goals/update', (req, res) => {
  const { type, target, current } = req.body;
  const updated = rulesManager.updateGoal(type, target, current);
  io.emit('goals_update', rulesManager.getConfig().goals);
  res.json({ ok: true, goal: updated });
});

// Commands
app.post('/api/commands/add', (req, res) => {
  const newCmd = rulesManager.addCommand(req.body);
  io.emit('config_update', rulesManager.getConfig());
  res.json({ ok: true, command: newCmd });
});

app.post('/api/commands/delete', (req, res) => {
  const { id } = req.body;
  rulesManager.deleteCommand(id);
  io.emit('config_update', rulesManager.getConfig());
  res.json({ ok: true, message: 'Command dihapus.' });
});

app.get('/api/leaderboard', (req, res) => {
  res.json({ ok: true, leaderboard: rulesManager.getLeaderboard() });
});

/**
 * Offline Event Simulator (Untuk testing layout, rules, dan animasi)
 */
app.post('/api/simulate', (req, res) => {
  const { platform = 'tiktok', type = 'chat', custom = {} } = req.body;
  const timestamp = Date.now();

  let simulatedEvent = null;

  if (platform === 'tiktok') {
    if (type === 'chat') {
      simulatedEvent = {
        id: generateEventId('tiktok', 'chat'),
        platform: 'tiktok',
        type: 'chat',
        user: {
          id: 'sim_tk_1',
          username: custom.username || 'dimas_streamer',
          nickname: custom.nickname || 'Dimas Pratama',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
          badges: ['subscriber']
        },
        content: {
          text: custom.text || 'Keren banget overlay-nya bang! Coba ketik !discord 🔥'
        },
        timestamp
      };
    } else if (type === 'gift') {
      const isBig = custom.isBig || false;
      const giftName = isBig ? 'Paus' : (custom.giftName || 'Rose');
      const count = custom.count || (isBig ? 1 : 10);
      const diamonds = isBig ? 1000 : 10;

      simulatedEvent = {
        id: generateEventId('tiktok', 'gift'),
        platform: 'tiktok',
        type: 'gift',
        user: {
          id: 'sim_tk_sultan',
          username: custom.username || 'sultan_gabut',
          nickname: custom.nickname || 'Sultan Gabut',
          avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop&crop=face',
          badges: ['top_1', 'gifter']
        },
        content: {
          text: `Mengirim ${count}x ${giftName}`,
          gift: {
            name: giftName,
            count,
            diamonds,
            icon: isBig
              ? 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f40b.png'
              : 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f339.png'
          }
        },
        timestamp
      };
    } else if (type === 'like') {
      simulatedEvent = {
        id: generateEventId('tiktok', 'like'),
        platform: 'tiktok',
        type: 'like',
        user: {
          id: 'sim_tk_like',
          username: 'penonton_setia',
          nickname: 'Penonton Setia',
          avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop&crop=face',
          badges: []
        },
        content: {
          likeCount: 25,
          text: 'Mengirim 25x Tap Like'
        },
        timestamp
      };
    } else if (type === 'member' || type === 'join') {
      simulatedEvent = {
        id: generateEventId('tiktok', 'member'),
        platform: 'tiktok',
        type: 'member',
        user: {
          id: 'sim_tk_join',
          username: custom.username || 'user_baru_gabung',
          nickname: custom.nickname || 'Penonton Baru',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
          badges: []
        },
        content: {
          text: '👋 Bergabung ke siaran Live!'
        },
        timestamp
      };
    } else if (type === 'share') {
      const user = {
        id: 'sim_tk_share',
        username: custom.username || 'penonton_share',
        nickname: custom.nickname || 'Rina Melati',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
        badges: []
      };
      simulatedEvent = {
        id: generateEventId('tiktok', 'share'),
        platform: 'tiktok',
        type: 'share',
        user,
        content: {
          text: custom.text || `${user.nickname} membagikan live`
        },
        timestamp
      };
    } else if (type === 'follow') {
      const user = {
        id: 'sim_tk_follow',
        username: custom.username || 'penonton_follow',
        nickname: custom.nickname || 'Fajar Nugraha',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
        badges: []
      };
      simulatedEvent = {
        id: generateEventId('tiktok', 'follow'),
        platform: 'tiktok',
        type: 'follow',
        user,
        content: {
          text: custom.text || `${user.nickname} mulai mengikuti`
        },
        timestamp
      };
    }
  } else if (platform === 'youtube') {
    if (type === 'chat') {
      simulatedEvent = {
        id: generateEventId('youtube', 'chat'),
        platform: 'youtube',
        type: 'chat',
        user: {
          id: 'sim_yt_1',
          username: custom.username || 'Rian YouTube',
          nickname: custom.nickname || 'Rian Gamers ID',
          avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face',
          badges: ['member']
        },
        content: {
          text: custom.text || 'Gokil streaming YouTube + TikTok dalam 1 dock! Mantap bang!'
        },
        timestamp
      };
    } else if (type === 'superchat') {
      simulatedEvent = {
        id: generateEventId('youtube', 'superchat'),
        platform: 'youtube',
        type: 'superchat',
        user: {
          id: 'sim_yt_sc',
          username: custom.username || 'Budi Donatur',
          nickname: custom.nickname || 'Budi Santoso',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
          badges: ['superchat']
        },
        content: {
          text: custom.text || 'Semangat terus kontennya bang, ini traktiran kopi! ☕',
          superchat: {
            amount: custom.amount || 'Rp 50.000',
            currency: 'IDR',
            tierColor: '#e91e63'
          }
        },
        timestamp
      };
    }
  }

  if (simulatedEvent) {
    if (custom) simulatedEvent.custom = custom;
    queueManager.addEvent(simulatedEvent);
    return res.json({ ok: true, event: simulatedEvent });
  }

  res.status(400).json({ ok: false, message: 'Jenis simulasi tidak valid.' });
});

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  // Kirim state awal
  socket.emit('stats_update', queueManager.getStats());
  socket.emit('history_batch', queueManager.getHistory(50));
  socket.emit('config_update', rulesManager.getConfig());
  socket.emit('goals_update', rulesManager.getConfig().goals);
  socket.emit('leaderboard_update', rulesManager.getLeaderboard());

  const currentPin = queueManager.getPinnedComment();
  if (currentPin) {
    socket.emit('pin_update', currentPin);
  }

  socket.on('pin_request', (data) => {
    if (data && data.event) {
      queueManager.pinComment(data.event, data.duration || 30);
    }
  });

  socket.on('unpin_request', () => {
    queueManager.unpinComment();
  });
});

// Error handling jika port sudah dipakai
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[Core] Port ${PORT} sedang dipakai. Server mungkin sudah berjalan.`);
  } else {
    console.error('[Core] Server error:', err);
  }
});

// Jalankan Server
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  🚀 VEXORA STREAM SERVER RUNNING ON PORT ${PORT}`);
  console.log(`  👉 Studio Dashboard: http://localhost:${PORT}`);
  console.log(`  👉 OBS Overlay URL:  http://localhost:${PORT}/overlay.html`);
  console.log(`======================================================\n`);
});

module.exports = { app, server, io, PORT };
