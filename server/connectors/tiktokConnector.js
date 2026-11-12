/**
 * Vexora Stream - TikTok Connector
 * Penghubung real-time ke TikTok LIVE tanpa memerlukan kata sandi.
 * Menggunakan TikTokLiveConnection modern dari tiktok-live-connector v2.
 */

const { TikTokLiveConnection } = require('tiktok-live-connector');
const { normalizeTikTokEvent } = require('../services/eventNormalizer');
const queueManager = require('../services/queueManager');

class TikTokConnector {
  constructor() {
    this.connection = null;
    this.currentUsername = '';
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectTimer = null;
    this.autoReconnect = true;
  }

  async connect(username) {
    const cleanUser = String(username || '').trim().replace(/^@/, '');
    if (!cleanUser) {
      throw new Error('Username TikTok tidak boleh kosong.');
    }

    if (this.isConnected && this.currentUsername.toLowerCase() === cleanUser.toLowerCase()) {
      return { status: 'already_connected', username: this.currentUsername };
    }

    // Putuskan koneksi sebelumnya jika ada
    await this.disconnect();

    this.currentUsername = cleanUser;
    this.isConnecting = true;
    this.autoReconnect = true;

    try {
      this.connection = new TikTokLiveConnection(cleanUser, {
        processInitialData: false,
        enableExtendedGiftInfo: false // Default false agar tidak membutuhkan API key berbayar
      });

      this.setupListeners();

      const state = await this.connection.connect();
      this.isConnected = true;
      this.isConnecting = false;

      const viewers = Number(state.roomInfo?.data?.user_count || state.roomInfo?.user_count || 0);
      queueManager.setTikTokStatus(true, cleanUser, viewers);

      console.log(`[TikTok] Terhubung ke live stream: @${cleanUser} (Room ID: ${state.roomId})`);
      return { status: 'connected', username: cleanUser, roomId: state.roomId, viewers };
    } catch (err) {
      this.isConnected = false;
      this.isConnecting = false;
      queueManager.setTikTokStatus(false, cleanUser, 0);

      let msg = err.message || 'Gagal terhubung ke TikTok LIVE.';
      if (msg.includes('Failed to retrieve Room ID') || msg.includes("isn't online")) {
        msg = `Streamer @${cleanUser} sedang offline atau belum memulai siaran live.`;
      }
      console.error(`[TikTok] Gagal terhubung ke @${cleanUser}:`, msg);
      throw new Error(msg);
    }
  }

  async disconnect() {
    this.autoReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.connection) {
      try {
        this.connection.removeAllListeners();
        await this.connection.disconnect();
      } catch (e) {
        // Abaikan error saat disconnect
      }
      this.connection = null;
    }

    this.isConnected = false;
    this.isConnecting = false;
    queueManager.setTikTokStatus(false, this.currentUsername, 0);
    console.log(`[TikTok] Koneksi ke @${this.currentUsername} dihentikan.`);
  }

  setupListeners() {
    if (!this.connection) return;

    this.connection.on('chat', (data) => {
      const event = normalizeTikTokEvent('chat', data);
      if (event) queueManager.addEvent(event);
    });

    this.connection.on('member', (data) => {
      const event = normalizeTikTokEvent('member', data);
      if (event) queueManager.addEvent(event);
      if (data && data.memberCount) {
        queueManager.setTikTokStatus(true, this.currentUsername, Number(data.memberCount));
      }
    });

    this.connection.on('gift', (data) => {
      const event = normalizeTikTokEvent('gift', data);
      if (event) queueManager.addEvent(event);
    });

    this.connection.on('like', (data) => {
      const event = normalizeTikTokEvent('like', data);
      if (event) {
        queueManager.addEvent(event);
        const totalLikes = Number(data.total || data.totalLikeCount || 0);
        if (totalLikes > 0) {
          queueManager.updateLikes(totalLikes);
        }
      }
    });

    this.connection.on('social', (data) => {
      const event = normalizeTikTokEvent('social', data);
      if (event) queueManager.addEvent(event);
    });

    this.connection.on('follow', (data) => {
      const event = normalizeTikTokEvent('follow', { ...data, displayType: 'follow' });
      if (event) queueManager.addEvent(event);
    });

    this.connection.on('share', (data) => {
      const event = normalizeTikTokEvent('share', { ...data, displayType: 'share' });
      if (event) queueManager.addEvent(event);
    });

    this.connection.on('roomUser', (data) => {
      const count = Number(data.total || data.viewerCount || data.totalUser || 0);
      if (count > 0) {
        queueManager.setTikTokStatus(true, this.currentUsername, count);
      }
    });

    this.connection.on('streamEnd', () => {
      console.log(`[TikTok] Live stream @${this.currentUsername} telah berakhir.`);
      this.disconnect();
    });

    this.connection.on('disconnected', () => {
      console.log(`[TikTok] Terputus dari live stream @${this.currentUsername}`);
      this.isConnected = false;
      queueManager.setTikTokStatus(false, this.currentUsername, 0);

      if (this.autoReconnect) {
        this.scheduleReconnect();
      }
    });

    this.connection.on('error', (err) => {
      console.error(`[TikTok] Event error:`, err?.info || err?.message || err);
    });
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    console.log(`[TikTok] Mencoba reconnect otomatis dalam 5 detik...`);
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.autoReconnect && this.currentUsername) {
        try {
          await this.connect(this.currentUsername);
        } catch (e) {
          // Jadwalkan ulang jika gagal
          this.scheduleReconnect();
        }
      }
    }, 5000);
  }

  getStatus() {
    return {
      connected: this.isConnected,
      connecting: this.isConnecting,
      username: this.currentUsername
    };
  }
}

module.exports = new TikTokConnector();
