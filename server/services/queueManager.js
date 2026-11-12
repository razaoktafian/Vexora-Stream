/**
 * Vexora Stream - Queue & State Manager
 * Mengelola state sesi real-time, riwayat event, antrean alert, dan pesan yang disematkan (pinned).
 */

class QueueManager {
  constructor() {
    this.historyLimit = 150;
    this.eventHistory = [];
    this.pinnedComment = null;
    this.pinTimer = null;

    this.stats = {
      tiktokConnected: false,
      youtubeConnected: false,
      tiktokUsername: '',
      youtubeTarget: '',
      tiktokViewers: 0,
      youtubeViewers: 0,
      totalLikes: 0,
      totalGifts: 0,
      totalChats: 0,
      startedAt: Date.now()
    };

    this.subscribers = new Set();
  }

  addEvent(event) {
    if (!event || !event.id) return;

    // Tambahkan ke riwayat
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.historyLimit) {
      this.eventHistory.shift();
    }

    // Update metrik
    if (event.type === 'chat') {
      this.stats.totalChats += 1;
    } else if (event.type === 'gift' || event.type === 'superchat') {
      this.stats.totalGifts += 1;
    } else if (event.type === 'like') {
      this.stats.totalLikes += (event.content?.likeCount || 1);
    }

    // Beritahukan subscriber
    this.notifySubscribers('event', event);
  }

  setTikTokStatus(connected, username = '', viewers = 0) {
    this.stats.tiktokConnected = connected;
    if (username) this.stats.tiktokUsername = username;
    if (viewers !== undefined) this.stats.tiktokViewers = viewers;
    this.notifySubscribers('stats', this.getStats());
  }

  setYouTubeStatus(connected, target = '', viewers = 0) {
    this.stats.youtubeConnected = connected;
    if (target) this.stats.youtubeTarget = target;
    if (viewers !== undefined) this.stats.youtubeViewers = viewers;
    this.notifySubscribers('stats', this.getStats());
  }

  updateLikes(count) {
    this.stats.totalLikes = count;
    this.notifySubscribers('stats', this.getStats());
  }

  pinComment(event, durationSeconds = 30) {
    if (this.pinTimer) {
      clearTimeout(this.pinTimer);
      this.pinTimer = null;
    }

    this.pinnedComment = {
      event,
      pinnedAt: Date.now(),
      duration: durationSeconds,
      expiresAt: Date.now() + (durationSeconds * 1000)
    };

    this.notifySubscribers('pin', this.pinnedComment);

    if (durationSeconds > 0) {
      this.pinTimer = setTimeout(() => {
        this.unpinComment();
      }, durationSeconds * 1000);
    }

    return this.pinnedComment;
  }

  unpinComment() {
    if (this.pinTimer) {
      clearTimeout(this.pinTimer);
      this.pinTimer = null;
    }
    this.pinnedComment = null;
    this.notifySubscribers('pin', null);
  }

  getPinnedComment() {
    if (this.pinnedComment && this.pinnedComment.expiresAt < Date.now()) {
      this.unpinComment();
      return null;
    }
    return this.pinnedComment;
  }

  getHistory(limit = 50) {
    return this.eventHistory.slice(-limit);
  }

  getStats() {
    return {
      ...this.stats,
      uptimeSeconds: Math.floor((Date.now() - this.stats.startedAt) / 1000)
    };
  }

  clearHistory() {
    this.eventHistory = [];
    this.stats.totalChats = 0;
    this.stats.totalGifts = 0;
    this.stats.totalLikes = 0;
    this.notifySubscribers('stats', this.getStats());
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers(type, data) {
    for (const callback of this.subscribers) {
      try {
        callback(type, data);
      } catch (err) {
        console.error('Subscriber callback error:', err);
      }
    }
  }
}

module.exports = new QueueManager();
