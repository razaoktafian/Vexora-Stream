/**
 * Vexora Stream - YouTube Connector
 * Penghubung real-time ke YouTube Live Chat tanpa memerlukan kunci API berbayar.
 */

const { LiveChat } = require('youtube-chat');
const { normalizeYouTubeEvent } = require('../services/eventNormalizer');
const queueManager = require('../services/queueManager');

class YouTubeConnector {
  constructor() {
    this.liveChat = null;
    this.currentTarget = '';
    this.displayTarget = '';
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectTimer = null;
    this.viewerPollTimer = null;
    this.autoReconnect = true;
  }

  /**
   * Parse input dari streamer (bisa berupa URL live, video ID, channel ID, atau handle @nama)
   */
  parseInput(input) {
    const raw = String(input || '').trim();
    if (!raw) throw new Error('Target YouTube Live tidak boleh kosong.');

    // 1. Cek apakah format URL:
    // https://www.youtube.com/watch?v=VIDEO_ID
    // https://youtu.be/VIDEO_ID
    // https://www.youtube.com/live/VIDEO_ID
    const watchMatch = raw.match(/(?:watch\?v=|youtu\.be\/|live\/)([a-zA-Z0-9_-]{11})/);
    if (watchMatch) {
      return { liveId: watchMatch[1] };
    }

    // 2. Cek apakah video ID 11 karakter murni (misal: "jfKfPfyJRdk")
    if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) {
      return { liveId: raw };
    }

    // 3. Cek apakah Channel Handle (diawali @, misal: "@WindahBasudara")
    if (raw.startsWith('@')) {
      return { handle: raw };
    }

    // 4. Cek apakah Channel ID (diawali UC...)
    if (raw.startsWith('UC') && raw.length >= 24) {
      return { channelId: raw };
    }

    // Default fallback: coba sebagai handle jika ada spasi/teks atau liveId
    if (raw.includes('youtube.com/@')) {
      const handlePart = raw.split('youtube.com/')[1].split('/')[0].split('?')[0];
      return { handle: handlePart };
    }

    return { handle: `@${raw.replace(/^@/, '')}` };
  }

  async connect(input) {
    const parsedId = this.parseInput(input);
    const targetKey = JSON.stringify(parsedId);

    if (this.isConnected && this.currentTarget === targetKey) {
      return { status: 'already_connected', target: this.currentTarget };
    }

    await this.disconnect();

    this.currentTarget = targetKey;
    this.isConnecting = true;
    this.autoReconnect = true;

    try {
      this.liveChat = new LiveChat(parsedId, 1200);

      this.setupListeners();

      const ok = await this.liveChat.start();
      if (!ok) {
        throw new Error('Gagal memulai YouTube Live Chat. Pastikan channel sedang LIVE.');
      }

      this.isConnected = true;
      this.isConnecting = false;
      const displayTarget = parsedId.liveId || parsedId.handle || parsedId.channelId;
      this.displayTarget = displayTarget;
      queueManager.setYouTubeStatus(true, displayTarget);

      if (this.liveChat.liveId || parsedId.liveId) {
        this.startViewerPolling(this.liveChat.liveId || parsedId.liveId, displayTarget);
      }

      console.log(`[YouTube] Terhubung ke Live Chat target: ${displayTarget}`);
      return { status: 'connected', target: displayTarget, liveId: this.liveChat.liveId };
    } catch (err) {
      this.isConnected = false;
      this.isConnecting = false;
      this.stopViewerPolling();
      queueManager.setYouTubeStatus(false, input, 0);
      console.error(`[YouTube] Gagal terhubung ke ${input}:`, err.message);
      throw err;
    }
  }

  async disconnect() {
    this.autoReconnect = false;
    this.stopViewerPolling();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.liveChat) {
      try {
        this.liveChat.removeAllListeners();
        this.liveChat.stop('User disconnected');
      } catch (e) {
        // Abaikan error saat disconnect
      }
      this.liveChat = null;
    }

    this.isConnected = false;
    this.isConnecting = false;
    queueManager.setYouTubeStatus(false, '', 0);
    console.log(`[YouTube] Koneksi Live Chat dihentikan.`);
  }

  setupListeners() {
    if (!this.liveChat) return;

    this.liveChat.on('start', (liveId) => {
      this.isConnected = true;
      this.isConnecting = false;
      if (liveId) {
        this.startViewerPolling(liveId, this.displayTarget || liveId);
      }
      console.log(`[YouTube] LiveChat session dimulai (Live ID: ${liveId})`);
    });

    this.liveChat.on('chat', (chatItem) => {
      const event = normalizeYouTubeEvent('chat', chatItem);
      if (event) queueManager.addEvent(event);
    });

    this.liveChat.on('end', (reason) => {
      console.log(`[YouTube] LiveChat session berakhir (${reason})`);
      this.isConnected = false;
      this.stopViewerPolling();
      queueManager.setYouTubeStatus(false, '', 0);

      if (this.autoReconnect) {
        this.scheduleReconnect();
      }
    });

    this.liveChat.on('error', (err) => {
      console.error(`[YouTube] Error LiveChat:`, err?.message || err);
      // Jangan langsung putus bila error polling sementara, youtube-chat otomatis retry
    });
  }

  startViewerPolling(liveId, displayTarget) {
    this.stopViewerPolling();
    if (!liveId || typeof fetch !== 'function') return;

    const poll = async () => {
      if (!this.isConnected) return;
      try {
        const res = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(liveId)}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
          }
        });
        if (!res.ok) return;
        const html = await res.text();

        // Cari concurrent viewers dari payload halaman YouTube Live
        let viewers = 0;
        const concurrentMatch = html.match(/"concurrentViewers"\s*:\s*"(\d+)"/);
        const origViewMatch = html.match(/"videoViewCountRenderer"\s*:\s*\{[^}]*"isLive"\s*:\s*true[^}]*"originalViewCount"\s*:\s*"(\d+)"/);
        const runsMatch = html.match(/"videoViewCountRenderer"\s*:\s*\{\s*"viewCount"\s*:\s*\{\s*"runs"\s*:\s*\[\s*\{\s*"text"\s*:\s*"([0-9.,]+)"/);

        if (concurrentMatch) {
          viewers = parseInt(concurrentMatch[1], 10);
        } else if (origViewMatch) {
          viewers = parseInt(origViewMatch[1], 10);
        } else if (runsMatch) {
          viewers = parseInt(runsMatch[1].replace(/[.,]/g, ''), 10);
        }

        if (!Number.isNaN(viewers) && this.isConnected) {
          queueManager.setYouTubeStatus(true, displayTarget, viewers);
        }
      } catch (_) {
        // Abaikan error network sementara saat polling viewer count
      }
    };

    poll();
    this.viewerPollTimer = setInterval(poll, 15000);
  }

  stopViewerPolling() {
    if (this.viewerPollTimer) {
      clearInterval(this.viewerPollTimer);
      this.viewerPollTimer = null;
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    console.log(`[YouTube] Mencoba reconnect otomatis dalam 7 detik...`);
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.autoReconnect && this.currentTarget) {
        try {
          const parsed = JSON.parse(this.currentTarget);
          await this.connect(parsed.liveId || parsed.handle || parsed.channelId);
        } catch (e) {
          this.scheduleReconnect();
        }
      }
    }, 7000);
  }

  getStatus() {
    return {
      connected: this.isConnected,
      connecting: this.isConnecting,
      target: this.currentTarget
    };
  }
}

module.exports = new YouTubeConnector();
