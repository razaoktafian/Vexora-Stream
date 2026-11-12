/**
 * Vexora Stream - OBS Overlay Engine (Modular Suite v5.2)
 * Mendukung path route (/overlay/chat, /overlay/gifts, /overlay/follow, /overlay/likes,
 * /overlay/goals, /overlay/viewers, /overlay/leaderboard, /overlay/pin, /overlay/all)
 * serta parameter tema (?theme=dynamic-island|cyber-purple|frosted-glass|arcade-8bit|royal-gold),
 * skala (?scale=100), animasi (?anim=spring-island|elastic-bounce|cyber-slide|neon-glitch|floating-glass),
 * dan sinkronisasi penuh dengan Studio Dashboard via Socket.IO.
 */

(function () {
  'use strict';

  const socket = io({
    reconnection: true,
    transports: ['websocket', 'polling']
  });

  // DOM Elements
  const overlayViewport = document.getElementById('overlayViewport');
  const chatHudStack = document.getElementById('chatHudStack');

  // Dual Viewer Counter
  const viewerHudContainer = document.getElementById('viewerHudContainer');
  const hudTkViewers = document.getElementById('hudTkViewers');
  const hudYtViewers = document.getElementById('hudYtViewers');

  // Leaderboard HUD
  const leaderboardOverlayContainer = document.getElementById('leaderboardOverlayContainer');
  const leaderboardHudList = document.getElementById('leaderboardHudList');

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

  // Floating Likes
  const likesFloatContainer = document.getElementById('likesFloatContainer');

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

  // Determine active widget from URL path (/overlay/chat) OR query (?widget=chat)
  const urlParams = new URLSearchParams(window.location.search);
  const pathMatch = window.location.pathname.match(/\/overlay\/([a-z0-9-_]+)/i);
  const pathWidget = pathMatch ? pathMatch[1].toLowerCase() : null;
  let activeWidget = (urlParams.get('widget') || pathWidget || 'all').toLowerCase();
  if (activeWidget === 'all-in-one') activeWidget = 'all';

  const VALID_THEMES = ['dynamic-island', 'cyber-purple', 'frosted-glass', 'arcade-8bit', 'royal-gold'];
  const VALID_ANIMS = ['spring-island', 'elastic-bounce', 'cyber-slide', 'neon-glitch', 'floating-glass'];
  const VALID_CHAT_STYLES = ['bubble', 'cyber', 'neon', 'editorial', 'bounce'];
  const VALID_GIFT_STYLES = ['cyber', 'golden', 'aurora', 'arcade', 'glass'];

  const WIDGET_ID_MAP = {
    chat: 'chat_box',
    pin: 'spotlight_pin',
    gifts: 'gift_alert',
    alerts: 'gift_alert',
    follow: 'follow_alert',
    likes: 'like_float',
    goals: 'goal_bar',
    viewers: 'viewer_hud',
    leaderboard: 'gift_rank'
  };

  let activeTheme = (urlParams.get('theme') || '').toLowerCase();
  let activeAnim = (urlParams.get('anim') || '').toLowerCase();
  let activeScale = Number(urlParams.get('scale')) || 100;
  let activeGiftAnim = (urlParams.get('giftAnim') || 'cyber').toLowerCase();
  let activeChatAnim = (urlParams.get('chatAnim') || 'bubble').toLowerCase();

  if (!VALID_GIFT_STYLES.includes(activeGiftAnim)) activeGiftAnim = 'cyber';
  if (!VALID_CHAT_STYLES.includes(activeChatAnim)) activeChatAnim = 'bubble';

  function applyVisualCustomization(theme, anim, scale) {
    VALID_THEMES.forEach((t) => document.body.classList.remove(`theme-${t}`));
    VALID_ANIMS.forEach((a) => document.body.classList.remove(`anim-${a}`));

    if (theme && VALID_THEMES.includes(theme)) {
      document.body.classList.add(`theme-${theme}`);
    }
    if (anim && VALID_ANIMS.includes(anim)) {
      document.body.classList.add(`anim-${anim}`);
    }
    if (overlayViewport && scale && scale !== 100) {
      const ratio = Math.max(0.7, Math.min(1.4, scale / 100));
      overlayViewport.style.zoom = String(ratio);
    } else if (overlayViewport) {
      overlayViewport.style.zoom = '1';
    }
  }

  function applyChatStyleClass(styleName) {
    if (!chatHudStack) return;
    const target = VALID_CHAT_STYLES.includes(styleName) ? styleName : activeChatAnim;
    VALID_CHAT_STYLES.forEach((s) => chatHudStack.classList.remove(`chat-style-${s}`));
    chatHudStack.classList.add(`chat-style-${target}`);
  }

  function applyWidgetVisibility(widgetConfigs) {
    const isEnabled = (id, defaultVal = true) => {
      if (!widgetConfigs || !widgetConfigs[id]) return defaultVal;
      return widgetConfigs[id].status !== false;
    };

    const showChat = activeWidget === 'chat' || (activeWidget === 'all' && isEnabled('chat_box'));
    const showPin = activeWidget === 'pin' || (activeWidget === 'all' && isEnabled('spotlight_pin'));
    const showAlerts = ['gifts', 'alerts', 'follow'].includes(activeWidget) ||
      (activeWidget === 'all' && (isEnabled('gift_alert') || isEnabled('follow_alert')));
    const showLikes = activeWidget === 'likes' || (activeWidget === 'all' && isEnabled('like_float'));
    const showGoals = activeWidget === 'goals' || (activeWidget === 'all' && isEnabled('goal_bar'));
    const showViewers = activeWidget === 'viewers' || (activeWidget === 'all' && isEnabled('viewer_hud'));
    const showLeaderboard = activeWidget === 'leaderboard' || (activeWidget === 'all' && isEnabled('gift_rank', false));
    const showCmd = ['all', 'gifts', 'alerts', 'chat'].includes(activeWidget);

    if (chatHudStack) chatHudStack.style.display = showChat ? 'flex' : 'none';
    if (spotlightContainer) spotlightContainer.style.display = showPin ? '' : 'none';
    if (alertContainer) alertContainer.style.display = showAlerts ? 'flex' : 'none';
    if (likesFloatContainer) likesFloatContainer.style.display = showLikes ? 'block' : 'none';
    if (overlayGoalsContainer) overlayGoalsContainer.style.display = showGoals ? 'flex' : 'none';
    if (viewerHudContainer) viewerHudContainer.style.display = showViewers ? 'block' : 'none';
    if (leaderboardOverlayContainer) leaderboardOverlayContainer.style.display = showLeaderboard ? 'block' : 'none';
    if (commandBanner) commandBanner.style.display = showCmd ? '' : 'none';
  }

  applyChatStyleClass(activeChatAnim);
  applyVisualCustomization(activeTheme, activeAnim, activeScale);
  applyWidgetVisibility(null);

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
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.12);
        osc.frequency.setValueAtTime(783.99, now + 0.24);
        osc.frequency.setValueAtTime(1046.50, now + 0.36);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        osc.start(now);
        osc.stop(now + 1.2);
      } else if (soundType === 'gift') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880.0, now + 0.1);
        osc.frequency.setValueAtTime(1174.66, now + 0.2);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.1, now);
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

  socket.on('stats_update', (stats) => {
    if (!stats) return;
    if (hudTkViewers) hudTkViewers.textContent = (Number(stats.tiktokViewers) || 0).toLocaleString();
    if (hudYtViewers) hudYtViewers.textContent = (Number(stats.youtubeViewers) || 0).toLocaleString();
  });

  socket.on('config_update', (config) => {
    if (!config) return;

    if (config.widgetConfigs) {
      applyWidgetVisibility(config.widgetConfigs);

      // Jika URL tidak menimpa theme/scale/anim, pakai setting tersimpan di Studio
      const targetWidgetId = WIDGET_ID_MAP[activeWidget];
      const saved = targetWidgetId ? config.widgetConfigs[targetWidgetId] : config.widgetConfigs.chat_box;
      if (saved) {
        const themeToUse = urlParams.get('theme') ? activeTheme : saved.selectedTheme;
        const animToUse = urlParams.get('anim') ? activeAnim : saved.animation;
        const scaleToUse = urlParams.get('scale') ? activeScale : saved.scale;
        applyVisualCustomization(themeToUse, animToUse, scaleToUse);
      }
    }

    if (config.overlayTheme) {
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
    if (!event) return;

    if (event.type === 'chat' || event.type === 'member' || event.type === 'share' || event.type === 'host') {
      appendHudChat(event);
      playChime('chat');
    } else if (event.type === 'follow') {
      appendHudChat(event);
      if (activeWidget === 'follow' || activeWidget === 'all') {
        triggerFollowAlert(event);
        playChime('gift');
      }
    } else if (event.type === 'like') {
      spawnFloatingLikes(event.content?.likeCount || 5);
    } else if (event.type === 'gift' || event.type === 'superchat') {
      appendHudChat(event);
      if (!event.hasRule && (activeWidget === 'gifts' || activeWidget === 'alerts' || activeWidget === 'all')) {
        triggerStandardAlert(event);
        playChime('gift');
      }
    }
  });

  socket.on('rule_triggered', (data) => {
    if (data && data.rule && (activeWidget === 'gifts' || activeWidget === 'alerts' || activeWidget === 'all')) {
      triggerCustomRuleAlert(data.rule, data.event);
      playChime(data.rule.soundEffect || 'fanfare');
    }
  });

  socket.on('goals_update', (goals) => {
    if (!goals) return;

    if (goals.giftGoal && giftGoalNumbers && giftGoalFill) {
      const cur = goals.giftGoal.current || 0;
      const tgt = Math.max(1, goals.giftGoal.target || 1000);
      const pct = Math.min(100, Math.round((cur / tgt) * 100));
      giftGoalNumbers.textContent = `${cur.toLocaleString()} / ${tgt.toLocaleString()} 🪙 (${pct}%)`;
      giftGoalFill.style.width = `${pct}%`;
    }

    if (goals.likeGoal && likeGoalNumbers && likeGoalFill) {
      const cur = goals.likeGoal.current || 0;
      const tgt = Math.max(1, goals.likeGoal.target || 5000);
      const pct = Math.min(100, Math.round((cur / tgt) * 100));
      likeGoalNumbers.textContent = `${cur.toLocaleString()} / ${tgt.toLocaleString()} ❤️ (${pct}%)`;
      likeGoalFill.style.width = `${pct}%`;
    }
  });

  socket.on('leaderboard_update', (leaderboard) => {
    if (!leaderboardHudList || !leaderboard) return;
    const gifters = (leaderboard.topGifters || []).slice(0, 3);
    if (gifters.length === 0) {
      leaderboardHudList.innerHTML = '<div class="lb-empty-row">Menunggu gift pertama...</div>';
      return;
    }

    leaderboardHudList.innerHTML = gifters.map((g, idx) => `
      <div class="lb-hud-row ${idx === 0 ? 'top-1' : ''}">
        <div class="lb-hud-left">
          <span class="lb-rank-badge">#${idx + 1}</span>
          <span class="lb-user-name">${escapeHtml(g.nickname || g.username)}</span>
        </div>
        <span class="lb-user-val">${Number(g.diamonds || 0).toLocaleString()} 🪙</span>
      </div>
    `).join('');
  });

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

  function spawnFloatingLikes(count = 5) {
    if (!likesFloatContainer) return;
    const hearts = ['❤️', '💖', '💕', '💗', '🔥'];
    const total = Math.min(12, Math.max(3, Math.round(count / 3)));

    for (let i = 0; i < total; i++) {
      setTimeout(() => {
        const el = document.createElement('span');
        el.className = 'like-heart-particle';
        el.textContent = hearts[i % hearts.length];
        el.style.left = `${15 + Math.random() * 70}%`;
        likesFloatContainer.appendChild(el);
        setTimeout(() => {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 2300);
      }, i * 110);
    }
  }

  function renderSpotlightPin(pinnedData) {
    if (!spotlightContainer) return;

    if (!pinnedData || !pinnedData.event) {
      spotlightContainer.classList.remove('active');
      return;
    }

    const event = pinnedData.event;
    const isTK = event.platform === 'tiktok';
    const isHost = event.platform === 'host';

    if (spotlightAvatar) {
      spotlightAvatar.style.display = event.user?.avatar ? '' : 'none';
      spotlightAvatar.src = event.user?.avatar || '';
    }
    if (spotlightName) spotlightName.textContent = event.user?.nickname || event.user?.username || 'Penonton';
    if (spotlightText) spotlightText.textContent = event.content?.text || '';

    if (spotlightPlatBadge) {
      spotlightPlatBadge.textContent = isHost ? 'HOST' : isTK ? 'TikTok' : 'YouTube';
      spotlightPlatBadge.style.color = isHost ? '#818cf8' : isTK ? '#00f2fe' : '#ff4d6d';
    }

    spotlightContainer.classList.add('active');
  }

  function appendHudChat(event) {
    if (!chatHudStack) return;

    if (event.type === 'chat' && event.custom) {
      const candidateStyle = event.custom.chatAnim || event.custom.style;
      if (candidateStyle && VALID_CHAT_STYLES.includes(candidateStyle)) {
        applyChatStyleClass(candidateStyle);
      }
    }

    const isTK = event.platform === 'tiktok';
    const isHost = event.platform === 'host';
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
        <span class="hud-gift-info">🎁 ${gift.count || 1}x ${escapeHtml(gift.name || 'Gift')}</span>
        <span class="hud-text">${escapeHtml(event.content?.text || '')}</span>
      `;
    } else if (isSC) {
      const sc = event.content?.superchat || {};
      bodyHtml = `
        <span class="hud-sc-info">💰 ${escapeHtml(sc.amount || '')}</span>
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

    const platBadgeLabel = isHost ? 'HOST' : isTK ? 'TK' : 'YT';
    const platBadgeClass = isHost ? 'hud-badge-tk' : isTK ? 'hud-badge-tk' : 'hud-badge-yt';

    item.innerHTML = `
      <img class="hud-avatar" src="${escapeHtml(event.user?.avatar || '')}" alt="" onerror="this.src='https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f464.png'">
      <div class="hud-content">
        <div class="hud-header">
          <span class="hud-plat-badge ${platBadgeClass}">${platBadgeLabel}</span>
          <span class="hud-name">${escapeHtml(event.user?.nickname || event.user?.username || 'Penonton')}</span>
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

  function triggerFollowAlert(event) {
    alertQueue.push({ type: 'follow', event });
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
      const isSC = event?.type === 'superchat';

      if (alertCard) alertCard.className = `alert-card ${isSC ? 'superchat-alert' : 'gift-alert'} gift-${activeGiftAnim}`;
      if (alertIcon) alertIcon.textContent = isSC ? '💰' : '🌟';
      if (alertTitle) alertTitle.textContent = (rule.name || 'GIFT RULE').toUpperCase();
      if (alertUser) alertUser.textContent = event?.user?.nickname || 'Supporter';

      let template = rule.alertText || '';
      template = template
        .replace('{user}', event?.user?.nickname || 'Supporter')
        .replace('{count}', event?.content?.gift?.count || 1)
        .replace('{gift}', event?.content?.gift?.name || 'Hadiah')
        .replace('{amount}', event?.content?.superchat?.amount || 'Donasi');

      if (alertAmount) alertAmount.textContent = template;

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
    } else if (item.type === 'follow') {
      const { event } = item;
      if (reactionVideoBox) reactionVideoBox.classList.remove('active');
      if (alertCard) alertCard.className = `alert-card gift-${activeGiftAnim}`;
      if (alertIcon) alertIcon.textContent = '✨';
      if (alertTitle) alertTitle.textContent = 'FOLLOWER BARU BERGABUNG!';
      if (alertUser) alertUser.textContent = event.user?.nickname || event.user?.username || 'Penonton';
      if (alertAmount) alertAmount.textContent = event.content?.text || 'Terima kasih sudah follow!';

      if (alertContainer) alertContainer.classList.add('show');
      setTimeout(() => {
        if (alertContainer) alertContainer.classList.remove('show');
        setTimeout(() => {
          isAlertPlaying = false;
          processAlertQueue();
        }, 500);
      }, 4200);
    } else {
      const { event } = item;
      const isGift = event.type === 'gift';

      if (reactionVideoBox) reactionVideoBox.classList.remove('active');
      const testGiftStyle = event.custom?.giftAnim || (isGift ? event.custom?.style : null);
      const chosenGiftAnim = (testGiftStyle && VALID_GIFT_STYLES.includes(testGiftStyle)) ? testGiftStyle : activeGiftAnim;
      if (alertCard) alertCard.className = `alert-card gift-${chosenGiftAnim}`;
      if (alertIcon) alertIcon.textContent = isGift ? '🎁' : '💰';
      if (alertTitle) alertTitle.textContent = isGift ? 'NEW TIKTOK GIFT!' : 'YOUTUBE SUPER CHAT!';
      if (alertUser) alertUser.textContent = event.user?.nickname || 'Supporter';

      if (alertAmount) {
        if (isGift) {
          const gift = event.content?.gift || {};
          alertAmount.textContent = `${gift.count || 1}x ${gift.name || 'Gift'} (${gift.diamonds || 1} Coins)`;
        } else {
          const sc = event.content?.superchat || {};
          alertAmount.textContent = `${sc.amount || ''} - "${event.content?.text || ''}"`;
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
