/**
 * Vexora Stream - Unified Dock Controller
 * Mengelola real-time Socket.IO, Multi Gift Rules, Goals, Leaderboard, Commands, Audio/TTS, dan Tabs.
 */

(function () {
  'use strict';

  // State Aplikasi
  const state = {
    events: [],
    activeFilter: 'all',
    activePlatform: 'all',
    pinnedEvent: null,
    ttsEnabled: localStorage.getItem('vexora_tts_enabled') === 'true',
    ttsVoice: localStorage.getItem('vexora_tts_voice') || 'persona_gadis',
    ttsFormat: localStorage.getItem('vexora_tts_format') || 'name_and_plat',
    soundEnabled: true,
    config: null,
    leaderboard: { topGifters: [], topLikers: [] },
    stats: {
      tiktokConnected: false,
      youtubeConnected: false,
      tiktokViewers: 0,
      youtubeViewers: 0,
      totalLikes: 0,
      totalGifts: 0,
      totalChats: 0
    }
  };

  // Web Audio Synthesizer
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
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.start(now);
        osc.stop(now + 0.5);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch (_) {}
  }

  // Karakter Voice Over Presets
  const VOICE_PERSONAS = {
    persona_gadis: {
      name: '👩 Gadis (Wanita Lembut)',
      lang: 'id-ID',
      pitch: 1.15,
      rate: 1.02,
      gender: 'female'
    },
    persona_ardi: {
      name: '👨 Ardi (Pria Cool & Berat)',
      lang: 'id-ID',
      pitch: 0.8,
      rate: 0.98,
      gender: 'male'
    },
    persona_anime: {
      name: '🌸 Anime Chibi (Ceria & Lucu)',
      lang: 'id-ID',
      pitch: 1.65,
      rate: 1.15,
      gender: 'female'
    },
    persona_robot: {
      name: '🤖 AI Robot (Cyber Synth)',
      lang: 'id-ID',
      pitch: 1.35,
      rate: 1.25,
      gender: 'any'
    },
    persona_radio: {
      name: '🎙️ Penyiar Radio Enerjik',
      lang: 'id-ID',
      pitch: 1.05,
      rate: 1.22,
      gender: 'male'
    },
    persona_bocil: {
      name: '👶 Bocil Cilik (Imut & Gemas)',
      lang: 'id-ID',
      pitch: 1.85,
      rate: 1.1,
      gender: 'female'
    },
    persona_sultan: {
      name: '👑 Sultan Santai (Elegan & Tenang)',
      lang: 'id-ID',
      pitch: 0.72,
      rate: 0.92,
      gender: 'male'
    }
  };

  function applyTtsVoiceSettings(utterance) {
    if (!window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices() || [];
    const selected = state.ttsVoice || 'persona_gadis';

    if (VOICE_PERSONAS[selected]) {
      const persona = VOICE_PERSONAS[selected];
      utterance.pitch = persona.pitch;
      utterance.rate = persona.rate;

      let bestVoice = null;
      const idVoices = voices.filter((v) => v.lang.startsWith('id') || v.lang.includes('ID'));

      if (idVoices.length > 0) {
        if (persona.gender === 'female') {
          bestVoice = idVoices.find((v) => {
            const n = v.name.toLowerCase();
            return n.includes('gadis') || n.includes('female') || n.includes('wanita') || n.includes('siti');
          }) || idVoices[0];
        } else if (persona.gender === 'male') {
          bestVoice = idVoices.find((v) => {
            const n = v.name.toLowerCase();
            return n.includes('ardi') || n.includes('male') || n.includes('pria') || n.includes('budi');
          }) || idVoices[idVoices.length - 1];
        } else {
          bestVoice = idVoices[0];
        }
      }

      if (!bestVoice && voices.length > 0) {
        bestVoice = voices.find((v) => v.lang.startsWith('en')) || voices[0];
      }

      if (bestVoice) {
        utterance.voice = bestVoice;
        utterance.lang = bestVoice.lang;
      } else {
        utterance.lang = 'id-ID';
      }
    } else {
      // Direct system voice selection
      const foundVoice = voices.find((v) => v.name === selected || v.voiceURI === selected);
      if (foundVoice) {
        utterance.voice = foundVoice;
        utterance.lang = foundVoice.lang;
        utterance.pitch = 1.0;
        utterance.rate = 1.05;
      } else {
        utterance.lang = 'id-ID';
        utterance.pitch = 1.0;
        utterance.rate = 1.0;
      }
    }
  }

  function populateTtsVoices() {
    const selects = document.querySelectorAll('#ttsVoiceSelect, #ttsVoiceSelectCard');
    if (selects.length === 0 || !window.speechSynthesis) return;

    const voices = window.speechSynthesis.getVoices() || [];
    const savedVoice = state.ttsVoice || localStorage.getItem('vexora_tts_voice') || 'persona_gadis';

    selects.forEach((select) => {
      select.innerHTML = `
        <optgroup label="🌟 Karakter Suara Vexora">
          <option value="persona_gadis">👩 Gadis (Wanita Lembut)</option>
          <option value="persona_ardi">👨 Ardi (Pria Cool & Berat)</option>
          <option value="persona_anime">🌸 Anime Chibi (Ceria & Lucu)</option>
          <option value="persona_robot">🤖 AI Robot / Cyber Synth</option>
          <option value="persona_radio">🎙️ Penyiar Radio Enerjik</option>
          <option value="persona_bocil">👶 Bocil Cilik (Imut & Gemas)</option>
          <option value="persona_sultan">👑 Sultan Santai (Elegan)</option>
        </optgroup>
      `;

      if (voices.length > 0) {
        const sysGroup = document.createElement('optgroup');
        sysGroup.label = '🌐 Suara Sistem / Browser';

        const sorted = [...voices].sort((a, b) => {
          const aId = a.lang.startsWith('id');
          const bId = b.lang.startsWith('id');
          if (aId && !bId) return -1;
          if (!aId && bId) return 1;
          return a.name.localeCompare(b.name);
        });

        sorted.forEach((v) => {
          const opt = document.createElement('option');
          opt.value = v.name;
          const isId = v.lang.startsWith('id') ? '🇮🇩 ' : '';
          opt.textContent = `${isId}${v.name} (${v.lang})`;
          sysGroup.appendChild(opt);
        });

        select.appendChild(sysGroup);
      }

      select.value = savedVoice;
      if (!select.value) {
        select.value = 'persona_gadis';
      }
    });
  }

  function testTtsVoice() {
    if (!window.speechSynthesis) {
      showToast('Browser tidak mendukung Web Speech TTS.');
      return;
    }
    window.speechSynthesis.cancel();
    const sampleText = 'Halo streamer! Ini adalah contoh suara yang akan membacakan chat penonton di live stream kamu.';
    const utterance = new SpeechSynthesisUtterance(sampleText);
    applyTtsVoiceSettings(utterance);
    window.speechSynthesis.speak(utterance);
    showToast('🔊 Memutar contoh suara TTS...');
  }

  // Text-To-Speech Synthesizer
  function speakMessage(event) {
    if (!state.ttsEnabled || !window.speechSynthesis) return;

    try {
      const platName = event.platform === 'tiktok' ? 'TikTok' : 'YouTube';
      const nickname = event.user?.nickname || 'Penonton';
      const msg = event.content?.text || '';

      let textToSpeak = `${nickname} dari ${platName}: ${msg}`;
      if (state.ttsFormat === 'name_only') {
        textToSpeak = `${nickname}: ${msg}`;
      } else if (state.ttsFormat === 'msg_only') {
        textToSpeak = msg;
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      applyTtsVoiceSettings(utterance);

      window.speechSynthesis.speak(utterance);
    } catch (_) {}
  }

  // URL Backend Server (Otomatis deteksi browser atau desktop app)
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
      socket = { on: () => {}, emit: () => {} };
    }
  } catch (err) {
    console.warn('[Socket] Mode fallback offline:', err);
    socket = { on: () => {}, emit: () => {} };
  }

  // DOM Elements
  const chatStreamEl = document.getElementById('chatStream');
  const emptyStateEl = document.getElementById('emptyState');
  const toastEl = document.getElementById('toastNotice');

  // Connection Elements
  const tkUsernameInput = document.getElementById('tkUsername');
  const tkConnectBtn = document.getElementById('tkConnectBtn');
  const tkCard = document.getElementById('tkCard');

  const ytInput = document.getElementById('ytInput');
  const ytConnectBtn = document.getElementById('ytConnectBtn');
  const ytCard = document.getElementById('ytCard');

  // Stats Elements
  const tkViewerCount = document.getElementById('tkViewerCount');
  const ytViewerCount = document.getElementById('ytViewerCount');
  const totalLikesCount = document.getElementById('totalLikesCount');
  const totalGiftsCount = document.getElementById('totalGiftsCount');
  const totalChatsCount = document.getElementById('totalChatsCount');

  // Multi Gift Rules Elements
  const rulesListContainer = document.getElementById('rulesListContainer');
  const addRuleForm = document.getElementById('addRuleForm');
  const toggleAddRuleFormBtn = document.getElementById('toggleAddRuleFormBtn');
  const saveNewRuleBtn = document.getElementById('saveNewRuleBtn');
  const cancelRuleBtn = document.getElementById('cancelRuleBtn');

  // Goals Elements
  const giftGoalTargetInput = document.getElementById('giftGoalTargetInput');
  const giftGoalBar = document.getElementById('giftGoalBar');
  const giftGoalCurrentText = document.getElementById('giftGoalCurrentText');
  const giftGoalPctText = document.getElementById('giftGoalPctText');
  const saveGiftGoalBtn = document.getElementById('saveGiftGoalBtn');

  const likeGoalTargetInput = document.getElementById('likeGoalTargetInput');
  const likeGoalBar = document.getElementById('likeGoalBar');
  const likeGoalCurrentText = document.getElementById('likeGoalCurrentText');
  const likeGoalPctText = document.getElementById('likeGoalPctText');
  const saveLikeGoalBtn = document.getElementById('saveLikeGoalBtn');

  // Leaderboard Elements
  const topGiftersList = document.getElementById('topGiftersList');
  const topLikersList = document.getElementById('topLikersList');

  // Commands Elements
  const commandsListContainer = document.getElementById('commandsListContainer');
  const addCmdForm = document.getElementById('addCmdForm');
  const toggleAddCmdBtn = document.getElementById('toggleAddCmdBtn');
  const saveNewCmdBtn = document.getElementById('saveNewCmdBtn');
  const cancelCmdBtn = document.getElementById('cancelCmdBtn');

  // Toast Helper
  let toastTimer = null;
  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 3000);
  }

  // Socket Events
  socket.on('connect', () => {
    console.log('[Socket] Terhubung ke Vexora Core Server.');
  });

  socket.on('stats_update', (newStats) => {
    state.stats = { ...state.stats, ...newStats };
    renderStats();
  });

  socket.on('config_update', (config) => {
    state.config = config;
    renderRules();
    renderGoals();
    renderCommands();
  });

  socket.on('goals_update', (goals) => {
    if (state.config) state.config.goals = goals;
    renderGoals();
  });

  socket.on('leaderboard_update', (lb) => {
    state.leaderboard = lb;
    renderLeaderboard();
  });

  socket.on('stream_event', (event) => {
    state.events.push(event);
    if (state.events.length > 200) state.events.shift();

    renderSingleEvent(event);
    playAlertSound(event.type);

    if (event.type === 'chat') {
      speakMessage(event);
    }
  });

  socket.on('history_batch', (history) => {
    if (Array.isArray(history)) {
      state.events = history;
      renderAllEvents();
    }
  });

  socket.on('pin_update', (pinnedData) => {
    state.pinnedEvent = pinnedData;
    renderAllEvents();
    if (pinnedData) {
      showToast(`📌 Komentar dari @${pinnedData.event?.user?.nickname} disematkan ke overlay!`);
    } else {
      showToast('Komentar selesai disematkan.');
    }
  });

  // Render Stats
  function renderStats() {
    if (tkViewerCount) tkViewerCount.textContent = Number(state.stats.tiktokViewers || 0).toLocaleString();
    if (ytViewerCount) ytViewerCount.textContent = Number(state.stats.youtubeViewers || 0).toLocaleString();
    if (totalLikesCount) totalLikesCount.textContent = Number(state.stats.totalLikes || 0).toLocaleString();
    if (totalGiftsCount) totalGiftsCount.textContent = Number(state.stats.totalGifts || 0).toLocaleString();
    if (totalChatsCount) totalChatsCount.textContent = Number(state.stats.totalChats || 0).toLocaleString();

    if (tkCard && tkConnectBtn) {
      if (state.stats.tiktokConnected) {
        tkCard.classList.add('connected-tiktok');
        tkConnectBtn.textContent = 'Disconnect';
        tkConnectBtn.className = 'btn btn-danger btn-sm';
      } else {
        tkCard.classList.remove('connected-tiktok');
        tkConnectBtn.textContent = 'Hubungkan';
        tkConnectBtn.className = 'btn btn-primary btn-sm';
      }
    }

    if (ytCard && ytConnectBtn) {
      if (state.stats.youtubeConnected) {
        ytCard.classList.add('connected-youtube');
        ytConnectBtn.textContent = 'Disconnect';
        ytConnectBtn.className = 'btn btn-danger btn-sm';
      } else {
        ytCard.classList.remove('connected-youtube');
        ytConnectBtn.textContent = 'Hubungkan';
        ytConnectBtn.className = 'btn btn-primary btn-sm';
      }
    }
  }

  // Filter Check
  function shouldDisplayEvent(event) {
    if (state.activePlatform !== 'all' && event.platform !== state.activePlatform) {
      return false;
    }

    if (state.activeFilter === 'chat') {
      return event.type === 'chat';
    } else if (state.activeFilter === 'gift') {
      return event.type === 'gift' || event.type === 'superchat';
    } else if (state.activeFilter === 'like') {
      return event.type === 'like';
    } else if (state.activeFilter === 'pinned') {
      return state.pinnedEvent && state.pinnedEvent.event?.id === event.id;
    }

    return true;
  }

  // Render All Events
  function renderAllEvents() {
    if (!chatStreamEl) return;
    chatStreamEl.innerHTML = '';

    const filtered = state.events.filter(shouldDisplayEvent);

    if (filtered.length === 0) {
      if (emptyStateEl) emptyStateEl.style.display = 'flex';
      return;
    }

    if (emptyStateEl) emptyStateEl.style.display = 'none';

    filtered.forEach((event) => {
      const card = createChatCardElement(event);
      chatStreamEl.appendChild(card);
    });

    chatStreamEl.scrollTop = chatStreamEl.scrollHeight;
  }

  // Append Single Event
  function renderSingleEvent(event) {
    if (!chatStreamEl) return;
    if (!shouldDisplayEvent(event)) return;

    if (emptyStateEl) emptyStateEl.style.display = 'none';

    const card = createChatCardElement(event);
    chatStreamEl.appendChild(card);

    const isScrolledNearBottom =
      chatStreamEl.scrollHeight - chatStreamEl.scrollTop - chatStreamEl.clientHeight < 120;

    if (isScrolledNearBottom) {
      chatStreamEl.scrollTop = chatStreamEl.scrollHeight;
    }
  }

  // Create Chat Card DOM
  function createChatCardElement(event) {
    const card = document.createElement('div');
    const isTK = event.platform === 'tiktok';
    const isPinned = state.pinnedEvent && state.pinnedEvent.event?.id === event.id;

    card.className = `chat-card is-${event.platform} ${event.type === 'gift' ? 'is-gift' : ''} ${
      event.type === 'superchat' ? 'is-superchat' : ''
    } ${event.type === 'member' ? 'is-member' : ''} ${event.type === 'share' ? 'is-share' : ''} ${
      event.type === 'follow' ? 'is-follow' : ''
    } ${isPinned ? 'is-pinned' : ''}`;

    const timeString = new Date(event.timestamp || Date.now()).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const platBadgeClass = isTK ? 'plat-badge-tk' : 'plat-badge-yt';
    const platName = isTK ? 'TikTok' : 'YouTube';

    let contentHtml = '';

    if (event.type === 'gift') {
      const gift = event.content?.gift || {};
      contentHtml = `
        <span class="gift-badge-value">🎁 ${gift.count}x ${gift.name} (${gift.diamonds} 💎)</span>
        <span class="chat-message-text">${event.content?.text || ''}</span>
      `;
    } else if (event.type === 'superchat') {
      const sc = event.content?.superchat || {};
      contentHtml = `
        <span class="superchat-badge-value">💰 ${sc.amount}</span>
        <span class="chat-message-text">${event.content?.text || ''}</span>
      `;
    } else if (event.type === 'like') {
      contentHtml = `<span style="color:#f43f5e;font-weight:600;">❤️ ${event.content?.text || 'Like'}</span>`;
    } else if (event.type === 'member') {
      contentHtml = `<span style="color:#38bdf8;font-weight:600;">👋 ${escapeHtml(event.content?.text || 'Bergabung ke siaran Live!')}</span>`;
    } else if (event.type === 'share') {
      contentHtml = `<span style="color:#10b981;font-weight:600;">🔄 ${escapeHtml(event.content?.text || `${event.user?.nickname || 'Penonton'} membagikan live`)}</span>`;
    } else if (event.type === 'follow') {
      contentHtml = `<span style="color:#a855f7;font-weight:600;">➕ ${escapeHtml(event.content?.text || `${event.user?.nickname || 'Penonton'} mulai mengikuti`)}</span>`;
    } else {
      contentHtml = `<span class="chat-message-text">${escapeHtml(event.content?.text || '')}</span>`;
    }

    card.innerHTML = `
      <img class="chat-avatar" src="${escapeHtml(event.user?.avatar || '')}" alt="" onerror="this.src='https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f464.png'">
      <div class="chat-body">
        <div class="chat-header">
          <span class="chat-badge-plat ${platBadgeClass}">${platName}</span>
          <span class="chat-username" title="${escapeHtml(event.user?.nickname || '')}">${escapeHtml(event.user?.nickname || 'Penonton')}</span>
          <span class="chat-time">${timeString}</span>
        </div>
        <div class="chat-message">
          ${contentHtml}
        </div>
      </div>
      <div class="chat-actions">
        <button class="pin-btn" title="Sematkan ke Overlay OBS (Spotlight)">
          ${isPinned ? '📍 Lepas Pin' : '📌 Pin'}
        </button>
      </div>
    `;

    const pinBtn = card.querySelector('.pin-btn');
    if (pinBtn) {
      pinBtn.addEventListener('click', () => {
        if (isPinned) {
          unpinComment();
        } else {
          pinComment(event);
        }
      });
    }

    return card;
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
        renderAllEvents();
      }
    } catch (e) {
      showToast('Gagal menyematkan komentar.');
    }
  }

  async function unpinComment() {
    try {
      await fetch(BACKEND_URL + '/api/unpin', { method: 'POST' });
      state.pinnedEvent = null;
      renderAllEvents();
    } catch (_) {}
  }

  // Connect TikTok
  async function toggleTikTok() {
    if (state.stats.tiktokConnected) {
      try {
        await fetch(BACKEND_URL + '/api/disconnect/tiktok', { method: 'POST' });
        showToast('Koneksi TikTok dihentikan.');
      } catch (_) {}
    } else {
      const username = tkUsernameInput ? tkUsernameInput.value.trim() : '';
      if (!username) {
        showToast('Masukkan username TikTok terlebih dahulu.');
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
        if (data.ok) {
          showToast(`Berhasil terhubung ke TikTok @${username}!`);
        } else {
          showToast(`Gagal: ${data.message}`);
        }
      } catch (e) {
        showToast('Terjadi kesalahan saat menghubungkan ke TikTok.');
      }
    }
  }

  // Connect YouTube
  async function toggleYouTube() {
    if (state.stats.youtubeConnected) {
      try {
        await fetch(BACKEND_URL + '/api/disconnect/youtube', { method: 'POST' });
        showToast('Koneksi YouTube dihentikan.');
      } catch (_) {}
    } else {
      const input = ytInput ? ytInput.value.trim() : '';
      if (!input) {
        showToast('Masukkan URL / Channel ID / Handle YouTube Live.');
        if (ytInput) ytInput.focus();
        return;
      }

      showToast('Menghubungkan ke YouTube Live Chat...');
      try {
        const res = await fetch(BACKEND_URL + '/api/connect/youtube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input })
        });
        const data = await res.json();
        if (data.ok) {
          showToast(`Berhasil terhubung ke YouTube Live!`);
        } else {
          showToast(`Gagal: ${data.message}`);
        }
      } catch (e) {
        showToast('Terjadi kesalahan saat menghubungkan ke YouTube.');
      }
    }
  }

  // Simulator Triggers
  async function simulateEvent(platform, type, custom = {}) {
    try {
      const res = await fetch(BACKEND_URL + '/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, type, custom })
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`⚡ Simulasi ${platform.toUpperCase()} ${type.toUpperCase()} dikirim.`);
      }
    } catch (_) {
      showToast('Gagal memicu event simulasi.');
    }
  }

  // --- RENDER MULTI GIFT RULES ---
  function renderRules() {
    if (!rulesListContainer || !state.config?.giftRules) return;
    rulesListContainer.innerHTML = '';

    state.config.giftRules.forEach((rule) => {
      const card = document.createElement('div');
      card.className = 'rule-card';

      card.innerHTML = `
        <div class="rule-header">
          <span class="rule-title">${escapeHtml(rule.name)}</span>
          <span class="rule-trigger-pill">Trigger: ${escapeHtml(rule.giftTrigger)} (Min. ${rule.minCoins} 🪙)</span>
        </div>
        <div class="rule-media-preview">
          ${rule.mediaUrl ? `<img src="${escapeHtml(rule.mediaUrl)}" alt="Reaction Preview">` : '<span style="color:var(--text-muted);font-size:12px;">Tanpa Media Video</span>'}
        </div>
        <div class="rule-meta-row">
          <span>🔊 Sound: <strong>${escapeHtml(rule.soundEffect)}</strong></span>
          <span>⏱️ Durasi: <strong>${rule.duration}s</strong></span>
        </div>
        <div style="font-size:12px; color:#cbd5e1; background:rgba(0,0,0,0.3); padding:8px; border-radius:6px;">
          "${escapeHtml(rule.alertText || '')}"
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
          <button class="btn btn-secondary btn-sm test-rule-btn" data-trigger="${escapeHtml(rule.giftTrigger)}">
            ⚡ Test Rule
          </button>
          <button class="btn btn-danger btn-sm del-rule-btn" data-id="${escapeHtml(rule.id)}">
            Hapus
          </button>
        </div>
      `;

      const testBtn = card.querySelector('.test-rule-btn');
      testBtn.addEventListener('click', () => {
        simulateEvent('tiktok', 'gift', { giftName: rule.giftTrigger, count: 1, isBig: rule.minCoins > 100 });
      });

      const delBtn = card.querySelector('.del-rule-btn');
      delBtn.addEventListener('click', async () => {
        await fetch(BACKEND_URL + '/api/rules/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: rule.id })
        });
        showToast('Aturan gift dihapus.');
      });

      rulesListContainer.appendChild(card);
    });
  }

  // --- RENDER GOALS ---
  function renderGoals() {
    const goals = state.config?.goals;
    if (!goals) return;

    if (goals.giftGoal && giftGoalBar && giftGoalCurrentText && giftGoalPctText) {
      const cur = goals.giftGoal.current || 0;
      const tgt = goals.giftGoal.target || 1000;
      const pct = Math.min(100, Math.round((cur / tgt) * 100));

      giftGoalCurrentText.textContent = `Terkumpul: ${cur.toLocaleString()} Coins`;
      giftGoalPctText.textContent = `${pct}%`;
      giftGoalBar.style.width = `${pct}%`;
      if (giftGoalTargetInput) giftGoalTargetInput.value = tgt;
    }

    if (goals.likeGoal && likeGoalBar && likeGoalCurrentText && likeGoalPctText) {
      const cur = goals.likeGoal.current || 0;
      const tgt = goals.likeGoal.target || 5000;
      const pct = Math.min(100, Math.round((cur / tgt) * 100));

      likeGoalCurrentText.textContent = `Terkumpul: ${cur.toLocaleString()} Likes`;
      likeGoalPctText.textContent = `${pct}%`;
      likeGoalBar.style.width = `${pct}%`;
      if (likeGoalTargetInput) likeGoalTargetInput.value = tgt;
    }
  }

  // --- RENDER LEADERBOARD ---
  function renderLeaderboard() {
    if (topGiftersList) {
      topGiftersList.innerHTML = '';
      if (!state.leaderboard.topGifters || state.leaderboard.topGifters.length === 0) {
        topGiftersList.innerHTML = '<p style="font-size: 12px; color: var(--text-muted);">Belum ada gift yang tercatat pada sesi ini.</p>';
      } else {
        state.leaderboard.topGifters.forEach((gifter, idx) => {
          const rankColors = ['gold', 'silver', 'bronze'];
          const rankClass = rankColors[idx] || '';
          const row = document.createElement('div');
          row.className = 'lb-row';
          row.innerHTML = `
            <span class="lb-rank ${rankClass}">#${idx + 1}</span>
            <img style="width:28px;height:28px;border-radius:50%;object-fit:cover;" src="${escapeHtml(gifter.avatar)}" onerror="this.src='https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f464.png'">
            <div class="lb-user-info">
              <div class="lb-name">${escapeHtml(gifter.nickname)}</div>
            </div>
            <div class="lb-score">${gifter.diamonds.toLocaleString()} 🪙</div>
          `;
          topGiftersList.appendChild(row);
        });
      }
    }

    if (topLikersList) {
      topLikersList.innerHTML = '';
      if (!state.leaderboard.topLikers || state.leaderboard.topLikers.length === 0) {
        topLikersList.innerHTML = '<p style="font-size: 12px; color: var(--text-muted);">Belum ada like yang tercatat pada sesi ini.</p>';
      } else {
        state.leaderboard.topLikers.forEach((liker, idx) => {
          const rankColors = ['gold', 'silver', 'bronze'];
          const rankClass = rankColors[idx] || '';
          const row = document.createElement('div');
          row.className = 'lb-row';
          row.innerHTML = `
            <span class="lb-rank ${rankClass}">#${idx + 1}</span>
            <img style="width:28px;height:28px;border-radius:50%;object-fit:cover;" src="${escapeHtml(liker.avatar)}" onerror="this.src='https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f464.png'">
            <div class="lb-user-info">
              <div class="lb-name">${escapeHtml(liker.nickname)}</div>
            </div>
            <div class="lb-score" style="color:#f43f5e;">${liker.likes.toLocaleString()} ❤️</div>
          `;
          topLikersList.appendChild(row);
        });
      }
    }
  }

  // --- RENDER COMMANDS ---
  function renderCommands() {
    if (!commandsListContainer || !state.config?.commands) return;
    commandsListContainer.innerHTML = '';

    state.config.commands.forEach((cmd) => {
      const card = document.createElement('div');
      card.className = 'command-card';

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="cmd-trigger-badge">${escapeHtml(cmd.trigger)}</span>
          <span style="font-size:11px; color:var(--text-muted);">Cooldown: ${cmd.cooldownSec}s</span>
        </div>
        <p class="cmd-response">"${escapeHtml(cmd.response)}"</p>
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:4px;">
          <button class="btn btn-danger btn-sm del-cmd-btn" data-id="${escapeHtml(cmd.id)}">Hapus</button>
        </div>
      `;

      const delBtn = card.querySelector('.del-cmd-btn');
      delBtn.addEventListener('click', async () => {
        await fetch(BACKEND_URL + '/api/commands/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: cmd.id })
        });
        showToast('Command dihapus.');
      });

      commandsListContainer.appendChild(card);
    });
  }

  // Inisialisasi Event Listeners UI
  function initEventListeners() {
    // 1. Navigation Tabs Switching
    const tabBtns = document.querySelectorAll('.main-tab-btn');
    const tabViews = document.querySelectorAll('.tab-view');

    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabBtns.forEach((b) => b.classList.remove('active'));
        tabViews.forEach((v) => v.classList.remove('active'));

        btn.classList.add('active');
        const targetTabId = btn.getAttribute('data-tab');
        const targetView = document.getElementById(targetTabId);
        if (targetView) targetView.classList.add('active');
      });
    });

    if (tkConnectBtn) tkConnectBtn.addEventListener('click', toggleTikTok);
    if (ytConnectBtn) ytConnectBtn.addEventListener('click', toggleYouTube);

    // Platform Filter Buttons
    const platPills = document.querySelectorAll('.plat-pill');
    platPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        platPills.forEach((p) => (p.className = 'plat-pill'));
        const plat = pill.getAttribute('data-plat');
        state.activePlatform = plat;
        if (plat === 'all') pill.classList.add('active-all');
        else if (plat === 'tiktok') pill.classList.add('active-tk');
        else if (plat === 'youtube') pill.classList.add('active-yt');
        renderAllEvents();
      });
    });

    // Type Filter Tabs
    const filterTabs = document.querySelectorAll('.filter-tab');
    filterTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        filterTabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        state.activeFilter = tab.getAttribute('data-filter') || 'all';
        renderAllEvents();
      });
    });

    // Clear Feed
    const clearBtn = document.getElementById('clearFeedBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        await fetch(BACKEND_URL + '/api/clear', { method: 'POST' });
        state.events = [];
        renderAllEvents();
        showToast('Riwayat feed dikosongkan.');
      });
    }

    // TTS Toggle (Top bar & Sidebar Card)
    const ttsToggles = document.querySelectorAll('#ttsToggle, #ttsToggleCard');
    ttsToggles.forEach((toggle) => {
      toggle.checked = state.ttsEnabled;
      toggle.addEventListener('change', (e) => {
        state.ttsEnabled = e.target.checked;
        localStorage.setItem('vexora_tts_enabled', state.ttsEnabled ? 'true' : 'false');
        ttsToggles.forEach((t) => (t.checked = state.ttsEnabled));
        showToast(state.ttsEnabled ? '🔊 Text-To-Speech Diaktifkan.' : '🔇 Text-To-Speech Dimatikan.');
      });
    });

    // TTS Voice Selector (Top bar, Sidebar Card, & Dock)
    const ttsVoiceSelects = document.querySelectorAll('#ttsVoiceSelect, #ttsVoiceSelectCard');
    ttsVoiceSelects.forEach((sel) => {
      sel.addEventListener('change', (e) => {
        state.ttsVoice = e.target.value;
        localStorage.setItem('vexora_tts_voice', state.ttsVoice);
        ttsVoiceSelects.forEach((s) => (s.value = state.ttsVoice));
        const voiceName = e.target.options[e.target.selectedIndex]?.text || '';
        showToast(`🎙️ Suara TTS diatur ke: ${voiceName}`);
        testTtsVoice();
      });
    });

    // TTS Format Selector
    const ttsFormatSelect = document.getElementById('ttsFormatSelect');
    if (ttsFormatSelect) {
      ttsFormatSelect.value = state.ttsFormat;
      ttsFormatSelect.addEventListener('change', (e) => {
        state.ttsFormat = e.target.value;
        localStorage.setItem('vexora_tts_format', state.ttsFormat);
        const formatName = ttsFormatSelect.options[ttsFormatSelect.selectedIndex]?.text || '';
        showToast(`Format bacaan TTS: ${formatName}`);
      });
    }

    // TTS Test Buttons
    const testTtsBtns = document.querySelectorAll('#testTtsBtn, #testTtsCardBtn');
    testTtsBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        testTtsVoice();
      });
    });

    // Stop TTS Button
    const stopTtsBtn = document.getElementById('stopTtsBtn');
    if (stopTtsBtn) {
      stopTtsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
          showToast('⏹️ Suara TTS dihentikan.');
        }
      });
    }

    if (window.speechSynthesis) {
      populateTtsVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = populateTtsVoices;
      }
    }

    // Sound Alerts Toggle
    const soundToggle = document.getElementById('soundToggle');
    if (soundToggle) {
      soundToggle.addEventListener('change', (e) => {
        state.soundEnabled = e.target.checked;
        showToast(state.soundEnabled ? '🔔 Efek Suara Aktif.' : '🔕 Efek Suara Dimatikan.');
      });
    }

    // Copy OBS Overlay URL
    // Modal Salin Link OBS Handlers
    const openObsModalBtn = document.getElementById('openObsModalBtn');
    const openObsModalSidebarBtn = document.getElementById('openObsModalSidebarBtn');
    const closeObsModalBtn = document.getElementById('closeObsModalBtn');
    const obsUrlModal = document.getElementById('obsUrlModal');

    if (openObsModalBtn && obsUrlModal) {
      openObsModalBtn.addEventListener('click', () => {
        obsUrlModal.classList.add('open');
      });
    }

    if (openObsModalSidebarBtn && obsUrlModal) {
      openObsModalSidebarBtn.addEventListener('click', () => {
        obsUrlModal.classList.add('open');
      });
    }

    if (closeObsModalBtn && obsUrlModal) {
      closeObsModalBtn.addEventListener('click', () => {
        obsUrlModal.classList.remove('open');
      });
    }

    if (obsUrlModal) {
      obsUrlModal.addEventListener('click', (e) => {
        if (e.target === obsUrlModal) {
          obsUrlModal.classList.remove('open');
        }
      });
    }

    // Copy OBS Overlay URL Header/General
    const copyOverlayBtn = document.getElementById('copyOverlayBtn');
    if (copyOverlayBtn) {
      copyOverlayBtn.addEventListener('click', () => {
        const overlayUrl = `${window.location.origin}/overlay.html`;
        navigator.clipboard.writeText(overlayUrl).then(() => {
          showToast('📋 URL Overlay OBS berhasil disalin ke clipboard!');
        });
      });
    }

    // Copy Modular Link Buttons (.copy-link-btn) dengan Feedback Visual
    const copyLinkBtns = document.querySelectorAll('.copy-link-btn');
    copyLinkBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const relUrl = btn.getAttribute('data-url');
        const fullUrl = `${window.location.origin}${relUrl}`;
        navigator.clipboard.writeText(fullUrl).then(() => {
          const originalText = btn.innerHTML;
          btn.innerHTML = '✓ Tersalin!';
          btn.style.filter = 'brightness(1.3)';
          setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.filter = '';
          }, 2000);
          showToast(`📋 URL Berhasil Disalin: ${relUrl}`);
        });
      });
    });

    // Test Animation Buttons (.test-anim-btn pada Tab 5)
    const testAnimBtns = document.querySelectorAll('.test-anim-btn');
    testAnimBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = btn.getAttribute('data-type');
        const style = btn.getAttribute('data-style');

        if (type === 'gift') {
          simulateEvent('tiktok', 'gift', {
            giftAnim: style,
            giftName: `Gift (${style.toUpperCase()})`,
            count: 1,
            isBig: style === 'golden' || style === 'aurora'
          });
          showToast(`⚡ Menguji Pop-up Gift Gaya: ${style.toUpperCase()}`);
        } else if (type === 'chat') {
          simulateEvent('tiktok', 'chat', {
            chatAnim: style,
            text: `Komentar pop-up live chat dengan gaya [${style.toUpperCase()}] tampil di OBS! 🔥`
          });
          showToast(`⚡ Menguji Pop-up Live Chat Gaya: ${style.toUpperCase()}`);
        }
      });
    });

    // Card Selection untuk Gaya Gift Animasi
    const giftAnimCards = document.querySelectorAll('.anim-card[data-gift-anim]');
    giftAnimCards.forEach((card) => {
      card.addEventListener('click', () => {
        giftAnimCards.forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        const style = card.getAttribute('data-gift-anim');
        fetch(BACKEND_URL + '/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            overlayTheme: {
              ...state.config?.overlayTheme,
              giftAnim: style
            }
          })
        });
        showToast(`🎁 Gaya Pop-up Gift diatur ke: ${style.toUpperCase()}`);
      });
    });

    // Card Selection untuk Gaya Chat Animasi
    const chatAnimCards = document.querySelectorAll('.anim-card[data-chat-anim]');
    chatAnimCards.forEach((card) => {
      card.addEventListener('click', () => {
        chatAnimCards.forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        const style = card.getAttribute('data-chat-anim');
        fetch(BACKEND_URL + '/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            overlayTheme: {
              ...state.config?.overlayTheme,
              chatAnim: style
            }
          })
        });
        showToast(`💬 Gaya Pop-up Live Chat diatur ke: ${style.toUpperCase()}`);
      });
    });

    // Simulator Buttons
    const simTkChat = document.getElementById('simTkChat');
    if (simTkChat) simTkChat.addEventListener('click', () => simulateEvent('tiktok', 'chat'));

    const simTkGift = document.getElementById('simTkGift');
    if (simTkGift) simTkGift.addEventListener('click', () => simulateEvent('tiktok', 'gift', { count: 10 }));

    const simTkBigGift = document.getElementById('simTkBigGift');
    if (simTkBigGift) simTkBigGift.addEventListener('click', () => simulateEvent('tiktok', 'gift', { isBig: true }));

    const simTkLike = document.getElementById('simTkLike');
    if (simTkLike) simTkLike.addEventListener('click', () => simulateEvent('tiktok', 'like'));

    const simTkJoin = document.getElementById('simTkJoin');
    if (simTkJoin) simTkJoin.addEventListener('click', () => simulateEvent('tiktok', 'member'));

    const simYtChat = document.getElementById('simYtChat');
    if (simYtChat) simYtChat.addEventListener('click', () => simulateEvent('youtube', 'chat'));

    const simYtSC = document.getElementById('simYtSC');
    if (simYtSC) simYtSC.addEventListener('click', () => simulateEvent('youtube', 'superchat', { amount: 'Rp 100.000' }));

    // Rule Form Handlers
    if (toggleAddRuleFormBtn && addRuleForm) {
      toggleAddRuleFormBtn.addEventListener('click', () => {
        addRuleForm.style.display = addRuleForm.style.display === 'none' ? 'block' : 'none';
      });
    }

    if (cancelRuleBtn && addRuleForm) {
      cancelRuleBtn.addEventListener('click', () => {
        addRuleForm.style.display = 'none';
      });
    }

    if (saveNewRuleBtn) {
      saveNewRuleBtn.addEventListener('click', async () => {
        const name = document.getElementById('ruleNameInput').value.trim();
        const trigger = document.getElementById('ruleTriggerInput').value.trim();
        const coins = Number(document.getElementById('ruleCoinsInput').value) || 1;
        const sound = document.getElementById('ruleSoundSelect').value;
        const media = document.getElementById('ruleMediaInput').value.trim();
        const text = document.getElementById('ruleAlertTextInput').value.trim();

        if (!name || !trigger) {
          showToast('Nama aturan dan pemicu gift wajib diisi.');
          return;
        }

        await fetch(BACKEND_URL + '/api/rules/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            giftTrigger: trigger,
            minCoins: coins,
            soundEffect: sound,
            mediaUrl: media,
            alertText: text,
            duration: 5
          })
        });

        if (addRuleForm) addRuleForm.style.display = 'none';
        showToast('Aturan gift baru berhasil disimpan!');
      });
    }

    // Goals Save Handlers
    if (saveGiftGoalBtn && giftGoalTargetInput) {
      saveGiftGoalBtn.addEventListener('click', async () => {
        const target = Number(giftGoalTargetInput.value) || 1000;
        await fetch(BACKEND_URL + '/api/goals/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'giftGoal', target })
        });
        showToast('Target Koin diperbarui.');
      });
    }

    if (saveLikeGoalBtn && likeGoalTargetInput) {
      saveLikeGoalBtn.addEventListener('click', async () => {
        const target = Number(likeGoalTargetInput.value) || 5000;
        await fetch(BACKEND_URL + '/api/goals/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'likeGoal', target })
        });
        showToast('Target Likes diperbarui.');
      });
    }

    // Command Form Handlers
    if (toggleAddCmdBtn && addCmdForm) {
      toggleAddCmdBtn.addEventListener('click', () => {
        addCmdForm.style.display = addCmdForm.style.display === 'none' ? 'block' : 'none';
      });
    }

    if (cancelCmdBtn && addCmdForm) {
      cancelCmdBtn.addEventListener('click', () => {
        addCmdForm.style.display = 'none';
      });
    }

    if (saveNewCmdBtn) {
      saveNewCmdBtn.addEventListener('click', async () => {
        const trigger = document.getElementById('cmdTriggerInput').value.trim();
        const response = document.getElementById('cmdResponseInput').value.trim();
        const cooldown = Number(document.getElementById('cmdCooldownInput').value) || 5;

        if (!trigger || !response) {
          showToast('Trigger dan pesan balasan wajib diisi.');
          return;
        }

        await fetch(BACKEND_URL + '/api/commands/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trigger,
            response,
            cooldownSec: cooldown,
            actionType: 'banner'
          })
        });

        if (addCmdForm) addCmdForm.style.display = 'none';
        showToast('Perintah komentar baru disimpan!');
      });
    }

    // Moderation Save
    const saveModerationBtn = document.getElementById('saveModerationBtn');
    const bannedWordsInput = document.getElementById('bannedWordsInput');
    if (saveModerationBtn && bannedWordsInput) {
      saveModerationBtn.addEventListener('click', async () => {
        const raw = bannedWordsInput.value;
        const words = raw.split(',').map((w) => w.trim()).filter(Boolean);
        await fetch(BACKEND_URL + '/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            moderation: {
              ...state.config?.moderation,
              bannedWords: words
            }
          })
        });
        showToast('Daftar sensor kata kasar berhasil disimpan.');
      });
    }

    // Theme Options Selector
    const themeCards = document.querySelectorAll('.theme-card-option');
    themeCards.forEach((tc) => {
      tc.addEventListener('click', () => {
        themeCards.forEach((c) => c.classList.remove('selected'));
        tc.classList.add('selected');
        const theme = tc.getAttribute('data-theme');
        fetch(BACKEND_URL + '/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            overlayTheme: {
              ...state.config?.overlayTheme,
              stylePreset: theme
            }
          })
        });
        showToast(`Tema overlay diubah ke: ${theme.toUpperCase()}`);
      });
    });

    const saveThemeBtn = document.getElementById('saveThemeBtn');
    if (saveThemeBtn) {
      saveThemeBtn.addEventListener('click', () => {
        showToast('Konfigurasi tema diterapkan ke OBS Browser Source.');
      });
    }
  }

  // Load Initial Status
  async function fetchInitialStatus() {
    try {
      const res = await fetch(BACKEND_URL + '/api/status');
      const data = await res.json();
      if (data.ok) {
        state.stats = data.stats || state.stats;
        state.pinnedEvent = data.pinned || null;
        state.config = data.config || null;
        state.leaderboard = data.leaderboard || state.leaderboard;

        if (Array.isArray(data.history)) {
          state.events = data.history;
        }

        renderStats();
        renderAllEvents();
        renderRules();
        renderGoals();
        renderLeaderboard();
        renderCommands();
      }
    } catch (_) {}
  }

  function startApp() {
    initEventListeners();
    fetchInitialStatus();

    const obsUrlText = document.getElementById('obsUrlText');
    if (obsUrlText) {
      obsUrlText.textContent = `${window.location.origin}/overlay.html`;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
  } else {
    startApp();
  }
})();
