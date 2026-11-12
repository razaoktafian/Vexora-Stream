/**
 * Vexora Stream - Rules, Goals, Commands & Moderation Manager
 * Mengatur Multi Gift Rules, Custom Chat Commands, Goals Tracker, Leaderboard, dan Moderasi Kata.
 */

const fs = require('fs');
const path = require('path');

const dataDir = process.env.VEXORA_DATA_DIR || path.join(__dirname, '../data');
const CONFIG_PATH = path.join(dataDir, 'streamConfig.json');

// Pastikan folder data ada
try {
  if (!dataDir.includes('app.asar') && !fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
} catch (e) {
  // Abaikan
}

class RulesManager {
  constructor() {
    this.config = {
      // 1. Multi Gift Rules
      giftRules: [
        {
          id: 'rule_rose',
          name: 'Rose Reaction',
          giftTrigger: 'Rose',
          minCoins: 1,
          soundEffect: 'chime',
          mediaUrl: 'https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif',
          alertText: '{user} mengirim {count}x Rose! Mawar cantik untuk live stream!',
          duration: 4,
          enabled: true
        },
        {
          id: 'rule_paus',
          name: 'Paus Menyelam / Big Gift',
          giftTrigger: 'Paus',
          minCoins: 500,
          soundEffect: 'fanfare',
          mediaUrl: 'https://media.giphy.com/media/FaKV1cVKlVRxC/giphy.gif',
          alertText: '🚨 SULTAN ALERT! {user} mengirim {gift}! Terima kasih banyak!',
          duration: 7,
          enabled: true
        },
        {
          id: 'rule_superchat',
          name: 'YouTube Super Chat',
          giftTrigger: 'superchat',
          minCoins: 1,
          soundEffect: 'siren',
          mediaUrl: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
          alertText: '💰 SUPER CHAT DITERIMA! {user} mendonasikan {amount}!',
          duration: 6,
          enabled: true
        }
      ],

      // 2. Goal & Counter Tracker
      goals: {
        giftGoal: {
          enabled: true,
          title: 'Target Koin Live',
          current: 0,
          target: 1000,
          unit: 'Coins'
        },
        likeGoal: {
          enabled: true,
          title: 'Target Likes',
          current: 0,
          target: 5000,
          unit: 'Likes'
        },
        followerGoal: {
          enabled: false,
          title: 'Target Follower Baru',
          current: 0,
          target: 50,
          unit: 'Followers'
        }
      },

      // 3. Custom Chat Commands (contoh: !discord, !sosmed)
      commands: [
        {
          id: 'cmd_discord',
          trigger: '!discord',
          actionType: 'banner', // 'banner', 'tts', 'sound'
          response: 'Gabung ke Komunitas Discord kita di: discord.gg/vexorastream',
          cooldownSec: 5,
          enabled: true
        },
        {
          id: 'cmd_sosmed',
          trigger: '!sosmed',
          actionType: 'banner',
          response: 'Follow TikTok & YouTube kita ya guys! Jangan lupa share siaran ini!',
          cooldownSec: 5,
          enabled: true
        },
        {
          id: 'cmd_rules',
          trigger: '!rules',
          actionType: 'banner',
          response: 'Aturan Live: Saling menghormati, no SARA, no spam, santai dan nikmati!',
          cooldownSec: 5,
          enabled: true
        }
      ],

      // 4. Queue, Cooldown & Moderasi
      moderation: {
        bannedWords: ['kasar', 'anjing', 'babi', 'tolol', 'spamlink'],
        cooldownSeconds: 3,
        autoFilterProfanity: true,
        ttsMinCoins: 0 // 0 = semua chat, >0 = hanya gift/donatur
      },

      // 5. Tema & Kustomisasi Overlay
      overlayTheme: {
        stylePreset: 'cyber', // 'cyber', 'neon', 'minimal'
        chatPosition: 'bottom-left', // 'bottom-left', 'bottom-right', 'top-left', 'top-right'
        fontSize: '14px',
        opacity: 0.9,
        showPlatformBadge: true,
        showGoals: true,
        showLeaderboard: true,
        chatFadeDelaySec: 20
      },

      // 6. Status Engine & Konfigurasi Widget Modular
      engineActive: true,
      ttsSettings: {
        enabled: true,
        voice: 'Gadis (Wanita Lembut)'
      },
      widgetConfigs: {
        chat_box: { status: true, selectedTheme: 'dynamic-island', scale: 100, animation: 'spring-island' },
        dock_chat: { status: true, selectedTheme: 'cyber-purple', scale: 100, animation: 'cyber-slide' },
        spotlight_pin: { status: true, selectedTheme: 'dynamic-island', scale: 105, animation: 'spring-island' },
        gift_alert: { status: true, selectedTheme: 'royal-gold', scale: 100, animation: 'elastic-bounce' },
        follow_alert: { status: true, selectedTheme: 'cyber-purple', scale: 100, animation: 'cyber-slide' },
        like_float: { status: true, selectedTheme: 'frosted-glass', scale: 100, animation: 'floating-glass' },
        goal_bar: { status: true, selectedTheme: 'cyber-purple', scale: 100, animation: 'spring-island' },
        viewer_hud: { status: true, selectedTheme: 'dynamic-island', scale: 100, animation: 'floating-glass' },
        gift_rank: { status: false, selectedTheme: 'royal-gold', scale: 100, animation: 'elastic-bounce' }
      }
    };

    // Leaderboard in-memory
    this.leaderboard = {
      topGifters: {}, // username -> { nickname, avatar, diamonds, platform }
      topLikers: {}   // username -> { nickname, avatar, likes, platform }
    };

    this.commandCooldowns = new Map(); // trigger -> timestamp

    this.loadFromDisk();
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        this.config = { ...this.config, ...parsed };
      }
    } catch (err) {
      console.warn('Gagal memuat config dari disk, memakai default:', err.message);
    }
  }

  saveToDisk() {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2), 'utf8');
    } catch (err) {
      console.error('Gagal menyimpan config ke disk:', err.message);
    }
  }

  getConfig() {
    return this.config;
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.saveToDisk();
    return this.config;
  }

  // --- Multi Gift Rules ---
  addRule(rule) {
    rule.id = `rule_${Date.now()}`;
    rule.enabled = rule.enabled !== false;
    this.config.giftRules.push(rule);
    this.saveToDisk();
    return rule;
  }

  deleteRule(id) {
    this.config.giftRules = this.config.giftRules.filter((r) => r.id !== id);
    this.saveToDisk();
    return true;
  }

  updateRule(id, updatedRule) {
    const idx = this.config.giftRules.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.config.giftRules[idx] = { ...this.config.giftRules[idx], ...updatedRule };
      this.saveToDisk();
      return this.config.giftRules[idx];
    }
    return null;
  }

  matchGiftRule(event) {
    if (event.type !== 'gift' && event.type !== 'superchat') return null;

    for (const rule of this.config.giftRules) {
      if (!rule.enabled) continue;

      if (event.type === 'gift') {
        const giftName = event.content?.gift?.name || '';
        const diamonds = event.content?.gift?.diamonds || 0;

        const matchName = rule.giftTrigger === '*' ||
          giftName.toLowerCase().includes(rule.giftTrigger.toLowerCase()) ||
          rule.giftTrigger.toLowerCase() === 'gift';

        const matchCoins = diamonds >= (rule.minCoins || 0);

        if (matchName && matchCoins) {
          return rule;
        }
      } else if (event.type === 'superchat') {
        if (rule.giftTrigger.toLowerCase() === 'superchat' || rule.giftTrigger === '*') {
          return rule;
        }
      }
    }
    return null;
  }

  // --- Commands ---
  addCommand(cmd) {
    cmd.id = `cmd_${Date.now()}`;
    cmd.trigger = cmd.trigger.startsWith('!') ? cmd.trigger : `!${cmd.trigger}`;
    cmd.enabled = cmd.enabled !== false;
    cmd.cooldownSec = Number(cmd.cooldownSec) || 5;
    this.config.commands.push(cmd);
    this.saveToDisk();
    return cmd;
  }

  deleteCommand(id) {
    this.config.commands = this.config.commands.filter((c) => c.id !== id);
    this.saveToDisk();
    return true;
  }

  matchCommand(text) {
    const cleanText = String(text || '').trim().toLowerCase();
    const now = Date.now();

    for (const cmd of this.config.commands) {
      if (!cmd.enabled) continue;
      const trig = cmd.trigger.toLowerCase();

      if (cleanText === trig || cleanText.startsWith(`${trig} `)) {
        const lastTriggered = this.commandCooldowns.get(trig) || 0;
        const cooldownMs = (cmd.cooldownSec || 5) * 1000;

        if (now - lastTriggered < cooldownMs) {
          return { command: cmd, onCooldown: true };
        }

        this.commandCooldowns.set(trig, now);
        return { command: cmd, onCooldown: false };
      }
    }
    return null;
  }

  // --- Moderasi Kata Kasar ---
  filterProfanity(text) {
    if (!this.config.moderation.autoFilterProfanity) return text;
    let filtered = String(text || '');
    for (const word of this.config.moderation.bannedWords) {
      const regex = new RegExp(word, 'gi');
      filtered = filtered.replace(regex, '***');
    }
    return filtered;
  }

  // --- Goals Update ---
  trackEventForGoals(event) {
    if (event.type === 'gift') {
      const coins = event.content?.gift?.diamonds || 0;
      this.config.goals.giftGoal.current += coins;
    } else if (event.type === 'like') {
      const likes = event.content?.likeCount || 1;
      this.config.goals.likeGoal.current += likes;
    } else if (event.type === 'follow') {
      this.config.goals.followerGoal.current += 1;
    }
  }

  updateGoal(type, target, current) {
    if (this.config.goals[type]) {
      if (target !== undefined) this.config.goals[type].target = Number(target);
      if (current !== undefined) this.config.goals[type].current = Number(current);
      this.saveToDisk();
      return this.config.goals[type];
    }
    return null;
  }

  // --- Leaderboard Tracking ---
  trackLeaderboard(event) {
    const userId = event.user?.username || event.user?.id;
    if (!userId) return;

    if (event.type === 'gift' || event.type === 'superchat') {
      const coins = event.type === 'gift' ? (event.content?.gift?.diamonds || 1) : 100;
      if (!this.leaderboard.topGifters[userId]) {
        this.leaderboard.topGifters[userId] = {
          username: userId,
          nickname: event.user?.nickname || userId,
          avatar: event.user?.avatar || '',
          platform: event.platform,
          diamonds: 0
        };
      }
      this.leaderboard.topGifters[userId].diamonds += coins;
    } else if (event.type === 'like') {
      const likes = event.content?.likeCount || 1;
      if (!this.leaderboard.topLikers[userId]) {
        this.leaderboard.topLikers[userId] = {
          username: userId,
          nickname: event.user?.nickname || userId,
          avatar: event.user?.avatar || '',
          platform: event.platform,
          likes: 0
        };
      }
      this.leaderboard.topLikers[userId].likes += likes;
    }
  }

  getLeaderboard() {
    const topGiftersArray = Object.values(this.leaderboard.topGifters)
      .sort((a, b) => b.diamonds - a.diamonds)
      .slice(0, 5);

    const topLikersArray = Object.values(this.leaderboard.topLikers)
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 5);

    return {
      topGifters: topGiftersArray,
      topLikers: topLikersArray
    };
  }
}

module.exports = new RulesManager();
