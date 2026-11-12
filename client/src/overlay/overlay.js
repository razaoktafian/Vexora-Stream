/**
 * Vexora Stream - OBS Overlay Engine
 * Menangani rendering chat mengambang, spotlight pin, video reaction gift rules, goals, dan command banner.
 */

(function () {
  'use strict';

  const socket = io({
    reconnection: true,
    transports: ['websocket', 'polling']
  });

  // DOM Elements
  const chatHudStack = document.getElementById('chatHudStack');

  // Spotlight Pin
  const spotlightContainer = document.getElementById('spotlightContainer');
  const spotlightAvatar = document.getElementById('spotlightAvatar');
  const spotlightName = document.getElementById('spotlightName');
  const spotlightText = document.getElementById('spotlightText');
  const spotlightPlatBadge = document.getElementById('spotlightPlatBadge');

  // Alert & Video Reaction
  const alertContainer = document.getElementById('alertContainer');
  const alertCard = document.getElementById('alertCard');
  const alertIcon = document.getElementById('alertIcon');
  const alertTitle = document.getElementById('alertTitle');
  const alertUser = document.getElementById('alertUser');
  const alertAmount = document.getElementById('alertAmount');
  const reactionVideoBox = document.getElementById('reactionVideoBox');
  const reactionImg = document.getElementById('reactionImg');

  // Goals HUD
  const overlayGoalsContainer = document.getElementById('overlayGoalsContainer');
  const giftGoalNumbers = document.getElementById('giftGoalNumbers');
  const giftGoalFill = document.getElementById('giftGoalFill');
  const likeGoalNumbers = document.getElementById('likeGoalNumbers');
  const likeGoalFill = document.getElementById('likeGoalFill');

  // Command Banner
  const commandBanner = document.getElementById('commandBanner');
  const cmdBannerHeader = document.getElementById('cmdBannerHeader');
  const cmdBannerText = document.getElementById('cmdBannerText');
  let cmdBannerTimer = null;

  // Parsing parameter query modular: ?widget=chat | alerts | goals | pin | all
  const urlParams = new URLSearchParams(window.location.search);
  const activeWidget = (urlParams.get('widget') || 'all').toLowerCase();

  // Gaya animasi 5 Gift & 5 Chat
  const VALID_CHAT_STYLES = ['bubble', 'cyber', 'neon', 'editorial', 'bounce'];
  const VALID_GIFT_STYLES = ['cyber', 'golden', 'aurora', 'arcade', 'glass'];

  let activeGiftAnim = (urlParams.get('giftAnim') || 'cyber').toLowerCase();
  let activeChatAnim = (urlParams.get('chatAnim') || 'bubble').toLowerCase();

  if (!VALID_GIFT_STYLES.includes(activeGiftAnim)) activeGiftAnim = 'cyber';
  if (!VALID_CHAT_STYLES.includes(activeChatAnim)) activeChatAnim = 'bubble';

  function applyChatStyleClass(styleName) {
    if (!chatHudStack) return;
    const target = VALID_CHAT_STYLES.includes(styleName) ? styleName : activeChatAnim;
    VALID_CHAT_STYLES.forEach((s) => chatHudStack.classList.remove(`chat-style-${s}`));
    chatHudStack.classList.add(`chat-style-${target}`);
  }

  applyChatStyleClass(activeChatAnim);

  // Atur visibilitas widget berdasarkan URL parameter
  if (activeWidget === 'chat') {
    if (overlayGoalsContainer) overlayGoalsContainer.style.display = 'none';
    if (spotlightContainer) spotlightContainer.style.display = 'none';
    if (alertContainer) alertContainer.style.display = 'none';
    if (commandBanner) commandBanner.style.display = 'none';
  } else if (activeWidget === 'alerts') {
    if (chatHudStack) chatHudStack.style.display = 'none';
    if (overlayGoalsContainer) overlayGoalsContainer.style.display = 'none';
    if (spotlightContainer) spotlightContainer.style.display = 'none';
  } else if (activeWidget === 'goals') {
    if (chatHudStack) chatHudStack.style.display = 'none';
    if (alertContainer) alertContainer.style.display = 'none';
    if (spotlightContainer) spotlightContainer.style.display = 'none';
    if (commandBanner) commandBanner.style.display = 'none';
  } else if (activeWidget === 'pin') {
    if (chatHudStack) chatHudStack.style.display = 'none';
    if (alertContainer) alertContainer.style.display = 'none';
    if (overlayGoalsContainer) overlayGoalsContainer.style.display = 'none';
    if (commandBanner) commandBanner.style.display = 'none';
  }

  // Web Audio Synthesizer untuk OBS
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  function playChime(soundType = 'chime') {
    try {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      const now = audioCtx.currentTime;

      if (soundType === 'fanfare' || soundType === 'siren') {
        // Melodi perayaan meriah
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.24); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.36); // C6

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.start(now);
        osc.stop(now + 1.2);
      } else if (soundType === 'gift') {
        // Nada koin ceria
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880.0, now + 0.1);
        osc.frequency.setValueAtTime(1174.66, now + 0.2);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.start(now);
        osc.stop(now + 0.6);
      } else {
        // Nada chat halus
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (_) {}
  }

  // Socket Events
  socket.on('connect', () => {
    console.log('[OBS Overlay] Terhubung ke Vexora Core Server.');
  });

  socket.on('config_update', (config) => {
    if (config && config.overlayTheme) {
      if (!urlParams.get('giftAnim') && config.overlayTheme.giftAnim) {
        activeGiftAnim = config.overlayTheme.giftAnim.toLowerCase();
      }
      if (!urlParams.get('chatAnim') && config.overlayTheme.chatAnim) {
        activeChatAnim = config.overlayTheme.chatAnim.toLowerCase();
        applyChatStyleClass(activeChatAnim);
      }
    }
  });

  socket.on('stream_event', (event) => {
    if (event.type === 'chat' || event.type === 'member' || event.type === 'share' || event.type === 'follow') {
      appendHudChat(event);
      playChime('chat');
    } else if (event.type === 'gift' || event.type === 'superchat') {
      appendHudChat(event);
      // Pemicu pop-up alert gift jika tidak ditangani oleh rule video khusus
      if (!event.hasRule) {
        triggerStandardAlert(event);
        playChime('gift');
      }
    }
  });

  // Multi Gift Rule Triggered (Reaksi Video / Suara / Pesan Khusus)
  socket.on('rule_triggered', (data) => {
    if (data && data.rule) {
      triggerCustomRuleAlert(data.rule, data.event);
      playChime(data.rule.soundEffect || 'fanfare');
    }
  });

  // Goals Update
  socket.on('goals_update', (goals) => {
    if (!goals) return;

    if (goals.giftGoal && giftGoalNumbers && giftGoalFill) {
      const cur = goals.giftGoal.current || 0;
      const tgt = goals.giftGoal.target || 1000;
      const pct = Math.min(100, Math.round((cur / tgt) * 100));
      giftGoalNumbers.textContent = `${cur.toLocaleString()} / ${tgt.toLocaleString()} 🪙 (${pct}%)`;
      giftGoalFill.style.width = `${pct}%`;
    }

    if (goals.likeGoal && likeGoalNumbers && likeGoalFill) {
      const cur = goals.likeGoal.current || 0;
      const tgt = goals.likeGoal.target || 5000;
      const pct = Math.min(100, Math.round((cur / tgt) * 100));
      likeGoalNumbers.textContent = `${cur.toLocaleString()} / ${tgt.toLocaleString()} ❤️ (${pct}%)`;
      likeGoalFill.style.width = `${pct}%`;
    }
  });

  // Custom Command Triggered
  socket.on('command_triggered', (data) => {
    if (!commandBanner || !data || !data.command) return;

    if (cmdBannerHeader) {
      cmdBannerHeader.textContent = `⚡ COMMAND: ${data.command.trigger.toUpperCase()}`;
    }
    if (cmdBannerText) {
      cmdBannerText.textContent = data.command.response;
    }

    commandBanner.classList.add('show');
    clearTimeout(cmdBannerTimer);
    cmdBannerTimer = setTimeout(() => {
      commandBanner.classList.remove('show');
    }, 7000);
  });

  socket.on('pin_update', (pinnedData) => {
    renderSpotlightPin(pinnedData);
  });

  // Spotlight Pin Render
  function renderSpotlightPin(pinnedData) {
    if (!spotlightContainer) return;

    if (!pinnedData || !pinnedData.event) {
      spotlightContainer.classList.remove('active');
      return;
    }

    const event = pinnedData.event;
    const isTK = event.platform === 'tiktok';

    if (spotlightAvatar) spotlightAvatar.src = event.user?.avatar || '';
    if (spotlightName) spotlightName.textContent = event.user?.nickname || event.user?.username || 'Penonton';
    if (spotlightText) spotlightText.textContent = event.content?.text || '';

    if (spotlightPlatBadge) {
      spotlightPlatBadge.textContent = isTK ? 'TikTok' : 'YouTube';
      spotlightPlatBadge.style.color = isTK ? '#00f2fe' : '#ff4d6d';
    }

    spotlightContainer.classList.add('active');
  }

  // Floating Chat Item
  function appendHudChat(event) {
    if (!chatHudStack) return;

    // Hanya terapkan chat style jika ini adalah event CHAT dan memiliki chatAnim yang valid
    if (event.type === 'chat' && event.custom) {
      const candidateStyle = event.custom.chatAnim || event.custom.style;
      if (candidateStyle && VALID_CHAT_STYLES.includes(candidateStyle)) {
        applyChatStyleClass(candidateStyle);
      }
    }

    const isTK = event.platform === 'tiktok';
    const isGift = event.type === 'gift';
    const isSC = event.type === 'superchat';
    const isMember = event.type === 'member';
    const isShare = event.type === 'share';
    const isFollow = event.type === 'follow';

    const item = document.createElement('div');
    item.className = `hud-item is-${event.platform} ${isGift ? 'is-gift' : ''} ${isSC ? 'is-superchat' : ''} ${isMember ? 'is-member' : ''} ${isShare ? 'is-share' : ''} ${isFollow ? 'is-follow' : ''}`;

    let bodyHtml = '';
    if (isGift) {
      const gift = event.content?.gift || {};
      bodyHtml = `
        <span class="hud-gift-info">🎁 ${gift.count}x ${gift.name}</span>
        <span class="hud-text">${escapeHtml(event.content?.text || '')}</span>
      `;
    } else if (isSC) {
      const sc = event.content?.superchat || {};
      bodyHtml = `
        <span class="hud-sc-info">💰 ${sc.amount}</span>
        <span class="hud-text">${escapeHtml(event.content?.text || '')}</span>
      `;
    } else if (isMember) {
      bodyHtml = `<span class="hud-text" style="color:#38bdf8;font-weight:600;">${escapeHtml(event.content?.text || '👋 Bergabung ke Live')}</span>`;
    } else if (isShare) {
      bodyHtml = `<span class="hud-text" style="color:#10b981;font-weight:600;">🔄 ${escapeHtml(event.content?.text || `${event.user?.nickname || 'Penonton'} membagikan live`)}</span>`;
    } else if (isFollow) {
      bodyHtml = `<span class="hud-text" style="color:#a855f7;font-weight:600;">➕ ${escapeHtml(event.content?.text || `${event.user?.nickname || 'Penonton'} mulai mengikuti`)}</span>`;
    } else {
      bodyHtml = `<span class="hud-text">${escapeHtml(event.content?.text || '')}</span>`;
    }

    item.innerHTML = `
      <img class="hud-avatar" src="${escapeHtml(event.user?.avatar || '')}" alt="" onerror="this.src='https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f464.png'">
      <div class="hud-content">
        <div class="hud-header">
          <span class="hud-plat-badge ${isTK ? 'hud-badge-tk' : 'hud-badge-yt'}">${isTK ? 'TK' : 'YT'}</span>
          <span class="hud-name">${escapeHtml(event.user?.nickname || 'Penonton')}</span>
        </div>
        <div>${bodyHtml}</div>
      </div>
    `;

    chatHudStack.appendChild(item);

    while (chatHudStack.children.length > 6) {
      chatHudStack.removeChild(chatHudStack.firstChild);
    }

    setTimeout(() => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        if (item.parentNode) item.parentNode.removeChild(item);
      }, 500);
    }, 18000);
  }

  // Queue System untuk Alert
  const alertQueue = [];
  let isAlertPlaying = false;

  function triggerStandardAlert(event) {
    alertQueue.push({ type: 'standard', event });
    processAlertQueue();
  }

  function triggerCustomRuleAlert(rule, event) {
    alertQueue.push({ type: 'custom_rule', rule, event });
    processAlertQueue();
  }

  function processAlertQueue() {
    if (isAlertPlaying || alertQueue.length === 0) return;
    isAlertPlaying = true;

    const item = alertQueue.shift();

    if (item.type === 'custom_rule') {
      const { rule, event } = item;
      const isSC = event.type === 'superchat';

      if (alertCard) alertCard.className = `alert-card ${isSC ? 'superchat-alert' : 'gift-alert'}`;
      if (alertIcon) alertIcon.textContent = isSC ? '💰' : '🌟';
      if (alertTitle) alertTitle.textContent = rule.name.toUpperCase();
      if (alertUser) alertUser.textContent = event.user?.nickname || 'Supporter';

      let template = rule.alertText || '';
      template = template
        .replace('{user}', event.user?.nickname || 'Supporter')
        .replace('{count}', event.content?.gift?.count || 1)
        .replace('{gift}', event.content?.gift?.name || 'Hadiah')
        .replace('{amount}', event.content?.superchat?.amount || 'Donasi');

      if (alertAmount) alertAmount.textContent = template;

      // Video / GIF Reaction
      if (rule.mediaUrl && reactionVideoBox && reactionImg) {
        reactionImg.src = rule.mediaUrl;
        reactionVideoBox.classList.add('active');
      } else if (reactionVideoBox) {
        reactionVideoBox.classList.remove('active');
      }

      if (alertContainer) alertContainer.classList.add('show');

      const durationMs = (rule.duration || 5) * 1000;
      setTimeout(() => {
        if (alertContainer) alertContainer.classList.remove('show');
        if (reactionVideoBox) reactionVideoBox.classList.remove('active');
        setTimeout(() => {
          isAlertPlaying = false;
          processAlertQueue();
        }, 500);
      }, durationMs);

    } else {
      // Standard Alert
      const { event } = item;
      const isGift = event.type === 'gift';

      if (reactionVideoBox) reactionVideoBox.classList.remove('active');
      const testGiftStyle = event.custom?.giftAnim || (isGift ? event.custom?.style : null);
      const chosenGiftAnim = (testGiftStyle && VALID_GIFT_STYLES.includes(testGiftStyle)) ? testGiftStyle : activeGiftAnim;
      const giftStyleClass = `alert-card gift-${chosenGiftAnim}`;
      if (alertCard) alertCard.className = giftStyleClass;
      if (alertIcon) alertIcon.textContent = isGift ? '🎁' : '💰';
      if (alertTitle) alertTitle.textContent = isGift ? 'NEW TIKTOK GIFT!' : 'YOUTUBE SUPER CHAT!';
      if (alertUser) alertUser.textContent = event.user?.nickname || 'Supporter';

      if (alertAmount) {
        if (isGift) {
          const gift = event.content?.gift || {};
          alertAmount.textContent = `${gift.count}x ${gift.name} (${gift.diamonds} Coins)`;
        } else {
          const sc = event.content?.superchat || {};
          alertAmount.textContent = `${sc.amount} - "${event.content?.text || ''}"`;
        }
      }

      if (alertContainer) alertContainer.classList.add('show');

      setTimeout(() => {
        if (alertContainer) alertContainer.classList.remove('show');
        setTimeout(() => {
          isAlertPlaying = false;
          processAlertQueue();
        }, 500);
      }, 5000);
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
