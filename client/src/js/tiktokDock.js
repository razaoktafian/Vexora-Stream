/**
 * Vexora Stream - TikTok Live Style OBS Dock Controller
 * Menghadirkan tampilan persis TikTok LIVE dengan konektor terpadu TikTok & YouTube.
 */

(function () {
  'use strict';

  // State OBS Dock
  const state = {
    events: [],
    recentGifts: [],
    activeFilter: 'all',
    activePlatform: 'all',
    pinnedEvent: null,
    autoScrollLocked: false,
    ttsEnabled: localStorage.getItem('vexora_tts_enabled') === 'true',
    ttsVoice: localStorage.getItem('vexora_tts_voice') || 'persona_gadis',
    soundEnabled: true,
    liveStartTime: null,
    config: null,
    giftCounts: {
      rose: 0,
      tiktok: 0,
      gg: 0,
      heart: 0,
      donut: 0,
      crown: 0
    },
    stats: {
      tiktokConnected: false,
      youtubeConnected: false,
      tiktokViewers: 0,
      youtubeViewers: 0,
      totalLikes: 0,
      totalGifts: 0,
      totalChats: 0,
      startedAt: null
    }
  };

  // Web Audio Synthesizer untuk Alert Beep
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  function playAlertSound(type = 'chat') {
    if (!state.soundEnabled) return;
    try {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      const now = audioCtx.currentTime;

      if (type === 'gift' || type === 'superchat') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880.0, now + 0.08);
        osc.frequency.setValueAtTime(1174.66, now + 0.16);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      }
    } catch (_) { }
  }

  // Voice Personas TTS
  const VOICE_PERSONAS = {
    persona_gadis: { name: '👩 Gadis (Wanita Lembut)', pitch: 1.15, rate: 1.02, gender: 'female' },
    persona_ardi: { name: '👨 Ardi (Pria Cool)', pitch: 0.8, rate: 0.98, gender: 'male' },
    persona_anime: { name: '🌸 Anime Chibi', pitch: 1.65, rate: 1.15, gender: 'female' },
    persona_robot: { name: '🤖 AI Robot', pitch: 1.35, rate: 1.25, gender: 'any' },
    persona_radio: { name: '🎙️ Penyiar Radio', pitch: 1.05, rate: 1.22, gender: 'male' },
    persona_bocil: { name: '👶 Bocil Cilik', pitch: 1.85, rate: 1.1, gender: 'female' },
    persona_sultan: { name: '👑 Sultan Santai', pitch: 0.72, rate: 0.92, gender: 'male' }
  };

  function applyTtsVoiceSettings(utterance) {
    if (!window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices() || [];
    const selected = state.ttsVoice || 'persona_gadis';
    const persona = VOICE_PERSONAS[selected];

    if (persona) {
      utterance.pitch = persona.pitch;
      utterance.rate = persona.rate;
      const idVoices = voices.filter((v) => v.lang.startsWith('id') || v.lang.includes('ID'));
      let bestVoice = null;
      if (idVoices.length > 0) {
        if (persona.gender === 'female') {
          bestVoice = idVoices.find(v => /gadis|female|wanita|siti/i.test(v.name)) || idVoices[0];
        } else if (persona.gender === 'male') {
          bestVoice = idVoices.find(v => /ardi|male|pria|budi/i.test(v.name)) || idVoices[idVoices.length - 1];
        } else {
          bestVoice = idVoices[0];
        }
      }
      utterance.voice = bestVoice || voices[0] || null;
      utterance.lang = utterance.voice ? utterance.voice.lang : 'id-ID';
    }
  }

  function speakMessage(event) {
    if (!state.ttsEnabled || !window.speechSynthesis) return;
    try {
      const nickname = event.user?.nickname || 'Penonton';
      const msg = event.content?.text || '';
      if (!msg) return;
      const text = `${nickname}: ${msg}`;
      const utterance = new SpeechSynthesisUtterance(text);
      applyTtsVoiceSettings(utterance);
      window.speechSynthesis.speak(utterance);
    } catch (_) { }
  }

  // URL Backend Server
  const BACKEND_URL = (window.location.port === '3333' || window.location.origin.includes('3333')) ? '' : 'http://localhost:3333';

  // Inisialisasi Socket.IO dengan proteksi fallback
  let socket;
  try {
    if (typeof io !== 'undefined') {
      socket = io(BACKEND_URL || undefined, {
        reconnection: true,
        transports: ['websocket', 'polling']
      });
    } else {
      socket = { on: () => { }, emit: () => { } };
    }
  } catch (err) {
    socket = { on: () => { }, emit: () => { } };
  }

  // DOM Elements
  const liveBadgeGroup = document.getElementById('liveBadgeGroup');
  const standbyBadgeGroup = document.getElementById('standbyBadgeGroup');
  const liveTimerEl = document.getElementById('liveTimer');
  const chatStreamEl = document.getElementById('chatStream');
  const emptyStateEl = document.getElementById('emptyState');
  const toastEl = document.getElementById('toastNotice');
  const giftAlertsContainer = document.getElementById('giftAlertsContainer');

  // Metrics Elements
  const metricTkViewers = document.getElementById('metricTkViewers');
  const metricYtViewers = document.getElementById('metricYtViewers');
  const metricViewers = document.getElementById('metricViewers');
  const metricTotalViews = document.getElementById('metricTotalViews');
  const metricGifts = document.getElementById('metricGifts');
  const metricFollowers = document.getElementById('metricFollowers');
  const metricLikes = document.getElementById('metricLikes');

  // Connection Elements (Image 2)
  const connectionPanel = document.getElementById('connectionPanel');
  const toggleConnectPanelBtn = document.getElementById('toggleConnectPanelBtn');
  const tkUsernameInput = document.getElementById('tkUsername');
  const tkConnectBtn = document.getElementById('tkConnectBtn');
  const ytInput = document.getElementById('ytInput');
  const ytConnectBtn = document.getElementById('ytConnectBtn');

  // Goal Elements
  const goalTitleEl = document.getElementById('goalTitle');
  const goalCountEl = document.getElementById('goalCount');
  const goalProgressBar = document.getElementById('goalProgressBar');
  const goalDiamondsEl = document.getElementById('goalDiamonds');

  // Mini Gift Track Elements
  const countRose = document.getElementById('countRose');
  const countTiktok = document.getElementById('countTiktok');
  const countGg = document.getElementById('countGg');
  const countHeart = document.getElementById('countHeart');
  const countDonut = document.getElementById('countDonut');
  const countCrown = document.getElementById('countCrown');

  // Header & Settings Elements
  const lockScrollBtn = document.getElementById('lockScrollBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsDrawer = document.getElementById('settingsDrawer');
  const ttsToggle = document.getElementById('ttsToggle');
  const ttsVoiceSelect = document.getElementById('ttsVoiceSelect');
  const testTtsBtn = document.getElementById('testTtsBtn');
  const soundToggle = document.getElementById('soundToggle');
  const clearFeedBtn = document.getElementById('clearFeedBtn');

  // Bottom Input
  const commentInput = document.getElementById('commentInput');
  const sendCommentBtn = document.getElementById('sendCommentBtn');
  const emojiQuickBtn = document.getElementById('emojiQuickBtn');

  // Live Timer Interval (HH:MM:SS) - Hanya berjalan jika live terhubung
  function startLiveTimer() {
    setInterval(() => {
      const isConnected = state.stats.tiktokConnected || state.stats.youtubeConnected;
      if (!isConnected) {
        state.liveStartTime = null;
        if (liveTimerEl) liveTimerEl.textContent = '00:00:00';
        return;
      }
      if (!state.liveStartTime) {
        state.liveStartTime = state.stats.startedAt ? Number(state.stats.startedAt) : Date.now();
      }
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - state.liveStartTime) / 1000));
      const hrs = String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0');
      const mins = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0');
      const secs = String(elapsedSeconds % 60).padStart(2, '0');
      if (liveTimerEl) liveTimerEl.textContent = `${hrs}:${mins}:${secs}`;
    }, 1000);
  }

  // Toast Helper
  let toastTimer = null;
  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 2800);
  }

  // Number Formatter (e.g. 1573 -> "1.573")
  function formatNumber(num) {
    return Number(num || 0).toLocaleString('id-ID');
  }

  // Socket Events Listeners
  socket.on('connect', () => {
    console.log('[OBS Dock] Terhubung ke Vexora Core Server.');
    fetchStatus();
  });

  socket.on('stats_update', (newStats) => {
    state.stats = { ...state.stats, ...newStats };
    renderStats();
  });

  socket.on('config_update', (config) => {
    state.config = config;
    renderGoal();
  });

  socket.on('goals_update', (goals) => {
    if (state.config) state.config.goals = goals;
    renderGoal();
  });

  socket.on('stream_event', (event) => {
    state.events.push(event);
    if (state.events.length > 250) state.events.shift();

    // Gift Handling
    if (event.type === 'gift' || event.type === 'superchat') {
      trackGiftCounters(event);
      addRecentGiftAlert(event);
    }

    renderSingleChat(event);
    playAlertSound(event.type);

    if (event.type === 'chat') {
      speakMessage(event);
    }
  });

  socket.on('history_batch', (history) => {
    if (Array.isArray(history)) {
      state.events = history;
      renderAllChats();
    }
  });

  socket.on('pin_update', (pinnedData) => {
    state.pinnedEvent = pinnedData;
    renderAllChats();
    if (pinnedData) {
      showToast(`📌 Disematkan: "${pinnedData.event?.content?.text || ''}"`);
    }
  });

  // Fetch Status Awal
  async function fetchStatus() {
    try {
      const res = await fetch(BACKEND_URL + '/api/status');
      const data = await res.json();
      if (data.ok) {
        if (data.stats) state.stats = { ...state.stats, ...data.stats };
        if (data.config) state.config = data.config;
        if (data.pinned) state.pinnedEvent = data.pinned;
        if (Array.isArray(data.history)) state.events = data.history;
        renderStats();
        renderGoal();
        renderAllChats();
      }
    } catch (_) { }
  }

  // Render Stats & Connection Buttons
  function renderStats() {
    const isConnected = Boolean(state.stats.tiktokConnected || state.stats.youtubeConnected);

    // Toggle Badge LIVE & Timer: Muncul HANYA saat live streaming sudah terhubung
    if (liveBadgeGroup) {
      liveBadgeGroup.style.display = isConnected ? 'flex' : 'none';
    }
    if (standbyBadgeGroup) {
      standbyBadgeGroup.style.display = isConnected ? 'none' : 'inline-flex';
    }

    const tkViewers = Number(state.stats.tiktokViewers || 0);
    const ytViewers = Number(state.stats.youtubeViewers || 0);
    const totalViewers = tkViewers + ytViewers;

    if (metricTkViewers) metricTkViewers.textContent = formatNumber(tkViewers);
    if (metricYtViewers) metricYtViewers.textContent = formatNumber(ytViewers);
    if (metricViewers) metricViewers.textContent = formatNumber(totalViewers);

    // Total Views (jika element terpisah ada)
    const totalViews = isConnected ? (totalViewers + Number(state.stats.totalChats || 0)) : 0;
    if (metricTotalViews) metricTotalViews.textContent = formatNumber(totalViews);

    // Gifts
    if (metricGifts) metricGifts.textContent = formatNumber(state.stats.totalGifts || 0);

    // Followers / Shares
    const followers = isConnected ? (state.config?.goals?.followerGoal?.current || 0) : 0;
    if (metricFollowers) metricFollowers.textContent = formatNumber(followers);

    // Likes
    if (metricLikes) metricLikes.textContent = formatNumber(state.stats.totalLikes || 0);

    // TikTok Button
    if (tkConnectBtn) {
      if (state.stats.tiktokConnected) {
        tkConnectBtn.textContent = 'Disconnect';
        tkConnectBtn.classList.add('connected');
      } else {
        tkConnectBtn.textContent = 'Hubungkan';
        tkConnectBtn.classList.remove('connected');
      }
    }

    // YouTube Button
    if (ytConnectBtn) {
      if (state.stats.youtubeConnected) {
        ytConnectBtn.textContent = 'Disconnect';
        ytConnectBtn.classList.add('connected');
      } else {
        ytConnectBtn.textContent = 'Hubungkan';
        ytConnectBtn.classList.remove('connected');
      }
    }
  }

  // Render Goal Tracker Card
  function renderGoal() {
    const goal = state.config?.goals?.followerGoal || state.config?.goals?.giftGoal;
    const current = goal ? (goal.current || 0) : 0;
    const target = goal ? (goal.target || 50) : 50;
    const title = goal?.title || 'Target Follower Baru';

    if (goalTitleEl) goalTitleEl.textContent = title;
    if (goalCountEl) goalCountEl.textContent = `${current}/${target}`;
    if (goalProgressBar) {
      const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
      goalProgressBar.style.width = `${pct}%`;
    }

    const diamonds = Number(state.stats.totalGifts || 0) * 10;
    if (goalDiamondsEl) goalDiamondsEl.innerHTML = `💎 x${diamonds}`;
  }

  // Track & Update Mini Gift Counters
  function trackGiftCounters(event) {
    const giftName = (event.content?.gift?.name || '').toLowerCase();
    const count = Number(event.content?.gift?.count || 1);

    if (giftName.includes('rose') || giftName.includes('mawar')) {
      state.giftCounts.rose += count;
    } else if (giftName.includes('tiktok')) {
      state.giftCounts.tiktok += count;
    } else if (giftName.includes('gg') || giftName.includes('good')) {
      state.giftCounts.gg += count;
    } else if (giftName.includes('heart') || giftName.includes('hati') || giftName.includes('love')) {
      state.giftCounts.heart += count;
    } else if (giftName.includes('donut') || giftName.includes('donat')) {
      state.giftCounts.donut += count;
    } else {
      state.giftCounts.crown += count;
    }

    if (countRose) countRose.textContent = state.giftCounts.rose;
    if (countTiktok) countTiktok.textContent = state.giftCounts.tiktok;
    if (countGg) countGg.textContent = state.giftCounts.gg;
    if (countHeart) countHeart.textContent = state.giftCounts.heart;
    if (countDonut) countDonut.textContent = state.giftCounts.donut;
    if (countCrown) countCrown.textContent = state.giftCounts.crown;
  }

  // Add Recent Gift Alert Pill (Image 1 style)
  function addRecentGiftAlert(event) {
    if (!giftAlertsContainer) return;

    const nickname = event.user?.nickname || 'Penonton';
    const avatar = event.user?.avatar || 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f464.png';
    const giftName = event.content?.gift?.name || (event.type === 'superchat' ? 'Super Chat' : 'Gift');
    const giftCount = event.content?.gift?.count || 1;

    let giftIcon = '🎁';
    const lower = giftName.toLowerCase();
    if (lower.includes('rose') || lower.includes('mawar')) giftIcon = '🌹';
    else if (lower.includes('tiktok')) giftIcon = '🎵';
    else if (lower.includes('gg')) giftIcon = '🪅';
    else if (lower.includes('heart') || lower.includes('hati')) giftIcon = '💖';
    else if (lower.includes('donut')) giftIcon = '🍩';
    else if (lower.includes('crown') || lower.includes('mahkota')) giftIcon = '👑';

    const pill = document.createElement('div');
    pill.className = 'gift-alert-pill';
    pill.innerHTML = `
      <img class="gift-alert-avatar" src="${escapeHtml(avatar)}" onerror="this.src='https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f464.png'">
      <div class="gift-alert-text">
        <span class="sender-name">${escapeHtml(nickname)}</span>
        <span class="action-text">sent</span>
        <span class="gift-name-icon">${escapeHtml(giftName)} ${giftIcon}</span>
      </div>
      <span class="gift-alert-qty">x${giftCount}</span>
    `;

    giftAlertsContainer.prepend(pill);

    // Keep at most 3 recent gift pills
    while (giftAlertsContainer.children.length > 3) {
      giftAlertsContainer.removeChild(giftAlertsContainer.lastChild);
    }
  }

  // Filter Check
  function shouldDisplayEvent(event) {
    if (state.activePlatform !== 'all' && event.platform !== state.activePlatform) {
      return false;
    }
    if (state.activeFilter === 'chat') return event.type === 'chat';
    if (state.activeFilter === 'gift') return event.type === 'gift' || event.type === 'superchat';
    if (state.activeFilter === 'pinned') return state.pinnedEvent && state.pinnedEvent.event?.id === event.id;
    return true;
  }

  // Render All Chats
  function renderAllChats() {
    if (!chatStreamEl) return;
    chatStreamEl.innerHTML = '';

    const filtered = state.events.filter(shouldDisplayEvent);
    if (filtered.length === 0) {
      if (emptyStateEl) emptyStateEl.style.display = 'flex';
      return;
    }

    if (emptyStateEl) emptyStateEl.style.display = 'none';

    filtered.forEach((event) => {
      const bubble = createTikTokBubbleElement(event);
      chatStreamEl.appendChild(bubble);
    });

    scrollToBottom();
  }

  // Append Single Chat
  function renderSingleChat(event) {
    if (!chatStreamEl || !shouldDisplayEvent(event)) return;
    if (emptyStateEl) emptyStateEl.style.display = 'none';

    const bubble = createTikTokBubbleElement(event);
    chatStreamEl.appendChild(bubble);

    scrollToBottom();
  }

  function scrollToBottom() {
    if (state.autoScrollLocked || !chatStreamEl) return;
    chatStreamEl.scrollTop = chatStreamEl.scrollHeight;
  }

  // Create TikTok-style Chat Bubble
  function createTikTokBubbleElement(event) {
    const isTK = event.platform === 'tiktok';
    const isPinned = state.pinnedEvent && state.pinnedEvent.event?.id === event.id;
    const nickname = event.user?.nickname || 'Penonton';
    const avatar = event.user?.avatar || 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f464.png';

    // Member Join special row
    if (event.type === 'member') {
      const joinEl = document.createElement('div');
      joinEl.className = 'tk-join-bubble';
      joinEl.innerHTML = `
        <img class="tk-avatar" style="width:20px;height:20px;" src="${escapeHtml(avatar)}" onerror="this.src='https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f464.png'">
        <span class="tk-level-badge">▲ 1</span>
        <span class="tk-join-text"><strong>${escapeHtml(nickname)}</strong> joined</span>
      `;
      return joinEl;
    }

    const bubble = document.createElement('div');
    bubble.className = `tk-chat-bubble ${isPinned ? 'is-pinned' : ''}`;

    // Random or assigned level for authentic TikTok look
    const userLevel = event.user?.level || (Math.floor(Math.abs(hashString(nickname)) % 8) + 2);
    const hasHeartFan = (hashString(nickname) % 3 === 0);
    const isRankGifter = (hashString(nickname) % 7 === 0);

    let badgesHtml = `<span class="tk-level-badge">▲ ${userLevel}</span>`;
    if (hasHeartFan) {
      badgesHtml += `<span class="tk-fan-badge">💖 ${escapeHtml(nickname)}</span>`;
    }
    if (isRankGifter) {
      badgesHtml += `<span class="tk-rank-badge">📛 No. 2</span>`;
    }

    const platMiniBadge = isTK
      ? `<span class="plat-mini-badge plat-mini-tk">TK</span>`
      : `<span class="plat-mini-badge plat-mini-yt">YT</span>`;

    let msgContent = escapeHtml(event.content?.text || '');
    if (event.type === 'gift') {
      const g = event.content?.gift || {};
      msgContent = `<span style="color:#f59e0b;font-weight:700;">🎁 Mengirim ${g.count || 1}x ${escapeHtml(g.name || 'Hadiah')} (${g.diamonds || 1} 💎)</span>`;
    } else if (event.type === 'superchat') {
      const sc = event.content?.superchat || {};
      msgContent = `<span style="color:#ef4444;font-weight:700;">💰 Super Chat: ${sc.amount || ''} — ${msgContent}</span>`;
    } else if (event.type === 'like') {
      msgContent = `<span style="color:#f43f5e;font-weight:600;">❤️ Mengirim Likes!</span>`;
    } else if (event.type === 'follow') {
      msgContent = `<span style="color:#a855f7;font-weight:600;">➕ Mulai mengikuti streamer</span>`;
    } else if (event.type === 'share') {
      msgContent = `<span style="color:#10b981;font-weight:600;">🔄 Membagikan Live Streaming</span>`;
    }

    bubble.innerHTML = `
      <img class="tk-avatar" src="${escapeHtml(avatar)}" onerror="this.src='https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f464.png'">
      <div class="tk-msg-content">
        <div class="tk-msg-header">
          ${platMiniBadge}
          ${badgesHtml}
          <span class="tk-username" title="${escapeHtml(nickname)}">${escapeHtml(nickname)}</span>
        </div>
        <div class="tk-msg-text">${msgContent}</div>
      </div>
      <button class="tk-pin-btn" title="Sematkan komentar ke Overlay OBS">
        ${isPinned ? '📍 Lepas' : '📌 Pin'}
      </button>
    `;

    const pinBtn = bubble.querySelector('.tk-pin-btn');
    if (pinBtn) {
      pinBtn.addEventListener('click', () => {
        if (isPinned) unpinComment();
        else pinComment(event);
      });
    }

    return bubble;
  }

  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Pin & Unpin Actions
  async function pinComment(event) {
    try {
      const res = await fetch(BACKEND_URL + '/api/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, duration: 45 })
      });
      const data = await res.json();
      if (data.ok) {
        state.pinnedEvent = data.pinned;
        renderAllChats();
        showToast('📌 Komentar disematkan ke OBS Overlay!');
      }
    } catch (_) { }
  }

  async function unpinComment() {
    try {
      await fetch(BACKEND_URL + '/api/unpin', { method: 'POST' });
      state.pinnedEvent = null;
      renderAllChats();
      showToast('Komentar selesai disematkan.');
    } catch (_) { }
  }

  // Connect TikTok
  async function toggleTikTok() {
    if (state.stats.tiktokConnected) {
      try {
        await fetch(BACKEND_URL + '/api/disconnect/tiktok', { method: 'POST' });
        showToast('Koneksi TikTok diputus.');
      } catch (_) { }
    } else {
      const username = tkUsernameInput ? tkUsernameInput.value.trim() : '';
      if (!username) {
        showToast('Ketik username TikTok terlebih dahulu.');
        if (tkUsernameInput) tkUsernameInput.focus();
        return;
      }
      showToast(`Menghubungkan ke TikTok @${username}...`);
      try {
        const res = await fetch(BACKEND_URL + '/api/connect/tiktok', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        });
        const data = await res.json();
        if (data.ok) showToast(`Terhubung ke TikTok @${username}!`);
        else showToast(`Gagal: ${data.message}`);
      } catch (e) {
        showToast('Gagal menghubungkan ke TikTok.');
      }
    }
  }

  // Connect YouTube
  async function toggleYouTube() {
    if (state.stats.youtubeConnected) {
      try {
        await fetch(BACKEND_URL + '/api/disconnect/youtube', { method: 'POST' });
        showToast('Koneksi YouTube diputus.');
      } catch (_) { }
    } else {
      const input = ytInput ? ytInput.value.trim() : '';
      if (!input) {
        showToast('Ketik VideoID / URL siaran YouTube Live.');
        if (ytInput) ytInput.focus();
        return;
      }
      showToast('Menghubungkan ke YouTube Live...');
      try {
        const res = await fetch(BACKEND_URL + '/api/connect/youtube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input })
        });
        const data = await res.json();
        if (data.ok) showToast('Terhubung ke YouTube Live!');
        else showToast(`Gagal: ${data.message}`);
      } catch (e) {
        showToast('Gagal menghubungkan ke YouTube.');
      }
    }
  }

  // Send Local Streamer Comment / Announcement
  function sendStreamerComment() {
    if (!commentInput) return;
    const text = commentInput.value.trim();
    if (!text) return;

    const mockEvent = {
      id: 'streamer-' + Date.now(),
      platform: 'tiktok',
      type: 'chat',
      timestamp: Date.now(),
      user: {
        nickname: 'Streamer (Host)',
        username: 'host',
        avatar: 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f451.png',
        level: 99
      },
      content: { text: text }
    };

    socket.emit('stream_event', mockEvent);
    state.events.push(mockEvent);
    renderSingleChat(mockEvent);
    commentInput.value = '';
    showToast('Pesan terkirim ke feed!');
  }

  // Bind Listeners
  function initDock() {
    startLiveTimer();

    // Toggle Connection Bar (🔗 button)
    if (toggleConnectPanelBtn && connectionPanel) {
      toggleConnectPanelBtn.addEventListener('click', () => {
        connectionPanel.classList.toggle('collapsed');
        toggleConnectPanelBtn.classList.toggle('active');
      });
    }

    // Connect Buttons
    if (tkConnectBtn) tkConnectBtn.addEventListener('click', toggleTikTok);
    if (ytConnectBtn) ytConnectBtn.addEventListener('click', toggleYouTube);

    if (tkUsernameInput) {
      tkUsernameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') toggleTikTok();
      });
    }
    if (ytInput) {
      ytInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') toggleYouTube();
      });
    }

    // Lock Auto-Scroll (🔒 button)
    if (lockScrollBtn) {
      lockScrollBtn.addEventListener('click', () => {
        state.autoScrollLocked = !state.autoScrollLocked;
        lockScrollBtn.classList.toggle('active', state.autoScrollLocked);
        showToast(state.autoScrollLocked ? '🔒 Auto-scroll Dikunci.' : '🔓 Auto-scroll Mengikuti Chat Baru.');
      });
    }

    // Settings Drawer Toggle (⚙️ button)
    if (settingsBtn && settingsDrawer) {
      settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsDrawer.classList.toggle('open');
      });

      document.addEventListener('click', (e) => {
        if (!settingsDrawer.contains(e.target) && e.target !== settingsBtn) {
          settingsDrawer.classList.remove('open');
        }
      });
    }

    // TTS Toggle & Voice Select
    if (ttsToggle) {
      ttsToggle.checked = state.ttsEnabled;
      ttsToggle.addEventListener('change', (e) => {
        state.ttsEnabled = e.target.checked;
        localStorage.setItem('vexora_tts_enabled', state.ttsEnabled ? 'true' : 'false');
        showToast(state.ttsEnabled ? '🔊 TTS Aktif' : '🔇 TTS Mati');
      });
    }

    if (ttsVoiceSelect) {
      ttsVoiceSelect.value = state.ttsVoice;
      ttsVoiceSelect.addEventListener('change', (e) => {
        state.ttsVoice = e.target.value;
        localStorage.setItem('vexora_tts_voice', state.ttsVoice);
        showToast(`Suara: ${e.target.options[e.target.selectedIndex]?.text}`);
      });
    }

    if (testTtsBtn) {
      testTtsBtn.addEventListener('click', () => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance('Halo streamer! Suara TTS sudah aktif.');
        applyTtsVoiceSettings(utt);
        window.speechSynthesis.speak(utt);
      });
    }

    if (soundToggle) {
      soundToggle.checked = state.soundEnabled;
      soundToggle.addEventListener('change', (e) => {
        state.soundEnabled = e.target.checked;
      });
    }

    if (clearFeedBtn) {
      clearFeedBtn.addEventListener('click', async () => {
        try {
          await fetch(BACKEND_URL + '/api/clear', { method: 'POST' });
        } catch (_) { }
        state.events = [];
        renderAllChats();
        showToast('Feed chat dikosongkan.');
      });
    }

    // Comment Input & Send Button
    if (sendCommentBtn) {
      sendCommentBtn.addEventListener('click', sendStreamerComment);
    }
    if (commentInput) {
      commentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendStreamerComment();
      });
    }

    if (emojiQuickBtn && commentInput) {
      emojiQuickBtn.addEventListener('click', () => {
        const emojis = ['❤️', '🔥', '👏', '🎁', '🚀', '✨'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        commentInput.value += randomEmoji;
        commentInput.focus();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDock);
  } else {
    initDock();
  }
})();

