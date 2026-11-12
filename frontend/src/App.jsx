import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  Radio,
  Layers,
  Sparkles,
  Trophy,
  Volume2,
  Copy,
  Play,
  Square,
  Check,
  Heart,
  Gift,
  MessageSquare,
  Users,
  Activity,
  Trash2,
  Send,
  Zap,
  Bell,
  Coffee,
  Globe,
  Plus,
  ShieldCheck,
  Film,
  Music,
  Eye,
  X,
  Sliders,
  Pin,
  Terminal,
  Monitor,
  Palette,
  RefreshCw,
  Crown,
  CheckCircle2,
  Repeat,
  AudioWaveform,
  Star
} from 'lucide-react';

// Deteksi URL Backend Server (Otomatis untuk Browser :3333, Vite dev, maupun Tauri Native App)
const BACKEND_URL =
  typeof window !== 'undefined' &&
  (window.location.port === '3333' || window.location.origin.includes(':3333'))
    ? ''
    : 'http://localhost:3333';

const OBS_BASE_URL = 'http://localhost:3333';

// Custom CSS Keyframes untuk Live Preview Animations
const STUDIO_ANIMATION_STYLES = `
  @keyframes islandExpand {
    0% { transform: scaleX(0.32) scaleY(0.75); opacity: 0.2; filter: blur(4px); }
    65% { transform: scaleX(1.03) scaleY(1.02); opacity: 1; filter: blur(0px); }
    100% { transform: scaleX(1) scaleY(1); opacity: 1; }
  }
  @keyframes elasticBounce {
    0% { transform: scale(0.4) translateY(24px); opacity: 0; }
    55% { transform: scale(1.07) translateY(-4px); opacity: 1; }
    78% { transform: scale(0.97) translateY(2px); }
    100% { transform: scale(1) translateY(0); opacity: 1; }
  }
  @keyframes cyberSlide {
    0% { transform: translateX(-48px) skewX(-6deg); opacity: 0; }
    70% { transform: translateX(6px) skewX(2deg); opacity: 1; }
    100% { transform: translateX(0) skewX(0deg); opacity: 1; }
  }
  @keyframes neonGlitch {
    0% { transform: translate(0); opacity: 0; filter: hue-rotate(90deg); }
    20% { transform: translate(-6px, 3px); opacity: 1; }
    40% { transform: translate(6px, -3px); filter: hue-rotate(-90deg); }
    60% { transform: translate(-3px, -2px); }
    80% { transform: translate(3px, 2px); }
    100% { transform: translate(0); opacity: 1; filter: hue-rotate(0deg); }
  }
  @keyframes floatingGlass {
    0% { transform: translateY(18px) scale(0.94); opacity: 0; }
    100% { transform: translateY(0px) scale(1); opacity: 1; }
  }
  @keyframes idleBob {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-5px); }
  }
  @keyframes liquidStripe {
    0% { background-position: 0 0; }
    100% { background-position: 36px 0; }
  }
  @keyframes floatParticleUp {
    0% { transform: translateY(16px) scale(0.5) rotate(0deg); opacity: 0; }
    25% { opacity: 1; }
    100% { transform: translateY(-85px) scale(1.25) rotate(22deg); opacity: 0; }
  }
  @keyframes eqWave {
    0%, 100% { height: 4px; }
    50% { height: 16px; }
  }
  @keyframes spinSlow {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes pinCountdown {
    0% { width: 100%; }
    100% { width: 0%; }
  }

  .anim-spring-island { animation: islandExpand 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
  .anim-elastic-bounce { animation: elasticBounce 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
  .anim-cyber-slide { animation: cyberSlide 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .anim-neon-glitch { animation: neonGlitch 0.45s steps(2, end) forwards; }
  .anim-floating-glass { animation: floatingGlass 0.55s ease-out forwards; }
  .anim-idle-bob { animation: idleBob 3s ease-in-out infinite; }
  .anim-spin-slow { animation: spinSlow 10s linear infinite; }
  .liquid-bar-stripes {
    background-image: linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.22) 25%,
      transparent 25%,
      transparent 50%,
      rgba(255, 255, 255, 0.22) 50%,
      rgba(255, 255, 255, 0.22) 75%,
      transparent 75%,
      transparent
    );
    background-size: 36px 36px;
    animation: liquidStripe 1.1s linear infinite;
  }
`;

// Daftar Tema Visual yang tersedia untuk Kustomisasi
const OVERLAY_THEMES = [
  {
    id: 'dynamic-island',
    name: 'Dynamic Island',
    subtitle: 'iOS UI Capsule Spring',
    badge: 'Populer'
  },
  {
    id: 'cyber-purple',
    name: 'Gaming Cyber',
    subtitle: 'Neon Purple & Scanline',
    badge: 'Pro'
  },
  {
    id: 'frosted-glass',
    name: 'Minimalist Glass',
    subtitle: 'Apple Frosted Blur UI',
    badge: 'Clean'
  },
  {
    id: 'arcade-8bit',
    name: 'Special Roblox / 8-Bit',
    subtitle: 'Retro Blocky Game Style',
    badge: 'Game'
  },
  {
    id: 'royal-gold',
    name: 'Royal Sultan Gold',
    subtitle: 'Luxury VIP Gold Border',
    badge: 'VIP'
  }
];

// Preset Animasi Masuk
const ANIMATION_PRESETS = [
  { id: 'spring-island', label: 'Spring Island' },
  { id: 'elastic-bounce', label: 'Elastic Bounce' },
  { id: 'cyber-slide', label: 'Cyber Slide' },
  { id: 'neon-glitch', label: 'Neon Glitch' },
  { id: 'floating-glass', label: 'Floating Glass' }
];

// Pool Simulasi Chat untuk Live Preview
const PREVIEW_CHAT_POOL = [
  { user: 'Budi_Santoso', level: 'Lv.25', platform: 'TT', msg: 'Halo bang! Desain Dynamic Island-nya keren banget! 🔥', badgeColor: 'bg-indigo-600' },
  { user: 'Clarissa_22', level: 'Lv.18', platform: 'TT', msg: 'Semangat live-nya kak, udah aku tap-tap layar ❤️', badgeColor: 'bg-pink-600' },
  { user: 'Sultan_Reza', level: 'VIP', platform: 'YT', msg: 'Super Chat Rp 50.000 — Gas terus sampai Mythic!', badgeColor: 'bg-amber-500 text-black', isSuper: true },
  { user: 'Rian_Gamer', level: 'Lv.31', platform: 'TT', msg: 'Wih animasinya mulus banget 60 FPS! 🚀', badgeColor: 'bg-cyan-600' },
  { user: 'NadiaPutri', level: 'Lv.14', platform: 'YT', msg: 'Salam dari Bandung bang, sehat selalu 🙌', badgeColor: 'bg-rose-600' }
];

// Pool Simulasi Gift / Follow / Like untuk Live Preview
const PREVIEW_ALERT_POOL = [
  { user: 'Sultan_Reza', giftName: '1x Paus Menyelam', coins: 2150, combo: 1, quote: 'Terima kasih hiburannya bang, mantap!' },
  { user: 'Clarissa_22', giftName: '15x Mawar Merah', coins: 15, combo: 15, quote: 'Semangat terus live streaming-nya!' },
  { user: 'DimasPratama', giftName: '1x Mahkota Emas', coins: 500, combo: 3, quote: 'GGWP permainan tadi gokil banget!' }
];

// Default Registry Widget Modular
const DEFAULT_WIDGETS = [
  {
    id: 'chat_box',
    name: 'Chat Box Overlay',
    cat: 'chat',
    status: true,
    baseUrl: `${OBS_BASE_URL}/overlay/chat`,
    selectedTheme: 'dynamic-island',
    scale: 100,
    animation: 'spring-island',
    recommendedRes: '500 x 650 px',
    desc: 'Gelembung obrolan penonton transparan di layar OBS'
  },
  {
    id: 'dock_chat',
    name: 'OBS Dock Chat Interaktif',
    cat: 'chat',
    status: true,
    baseUrl: `${OBS_BASE_URL}/dock`,
    selectedTheme: 'cyber-purple',
    scale: 100,
    animation: 'cyber-slide',
    recommendedRes: '380 x 800 px (Custom Dock)',
    desc: 'Panel kontrol chat & moderasi untuk dipasang di jendela OBS'
  },
  {
    id: 'spotlight_pin',
    name: 'Spotlight Pin Komentar',
    cat: 'chat',
    status: true,
    baseUrl: `${OBS_BASE_URL}/overlay/pin`,
    selectedTheme: 'dynamic-island',
    scale: 105,
    animation: 'spring-island',
    recommendedRes: '800 x 250 px',
    desc: 'Menampilkan 1 komentar pilihan streamer secara menonjol'
  },
  {
    id: 'gift_alert',
    name: 'Gift Notification Alert',
    cat: 'alerts',
    status: true,
    baseUrl: `${OBS_BASE_URL}/overlay/gifts`,
    selectedTheme: 'royal-gold',
    scale: 100,
    animation: 'elastic-bounce',
    recommendedRes: '1920 x 1080 px',
    desc: 'Pop-up animasi spesial & suara saat penonton mengirim koin/saweran'
  },
  {
    id: 'follow_alert',
    name: 'Follow & Subscribe Alert',
    cat: 'alerts',
    status: true,
    baseUrl: `${OBS_BASE_URL}/overlay/follow`,
    selectedTheme: 'cyber-purple',
    scale: 100,
    animation: 'cyber-slide',
    recommendedRes: '1280 x 400 px',
    desc: 'Notifikasi ucapan selamat datang untuk follower baru'
  },
  {
    id: 'like_float',
    name: 'Floating Likes & Tap-Tap',
    cat: 'alerts',
    status: true,
    baseUrl: `${OBS_BASE_URL}/overlay/likes`,
    selectedTheme: 'frosted-glass',
    scale: 100,
    animation: 'floating-glass',
    recommendedRes: '400 x 800 px',
    desc: 'Efek partikel hati melayang saat penonton tap layar TikTok'
  },
  {
    id: 'goal_bar',
    name: 'Target Goals Bar',
    cat: 'counters',
    status: true,
    baseUrl: `${OBS_BASE_URL}/overlay/goals`,
    selectedTheme: 'cyber-purple',
    scale: 100,
    animation: 'spring-island',
    recommendedRes: '700 x 180 px',
    desc: 'Progress bar target koin dan likes realtime di layar siaran'
  },
  {
    id: 'viewer_hud',
    name: 'Dual Viewer Counter',
    cat: 'counters',
    status: true,
    baseUrl: `${OBS_BASE_URL}/overlay/viewers`,
    selectedTheme: 'dynamic-island',
    scale: 100,
    animation: 'floating-glass',
    recommendedRes: '450 x 120 px',
    desc: 'Penghitung jumlah penonton aktif gabungan TikTok & YouTube'
  },
  {
    id: 'gift_rank',
    name: 'Top Sultan Leaderboard',
    cat: 'counters',
    status: false,
    baseUrl: `${OBS_BASE_URL}/overlay/leaderboard`,
    selectedTheme: 'royal-gold',
    scale: 100,
    animation: 'elastic-bounce',
    recommendedRes: '450 x 500 px',
    desc: 'Klasemen otomatis Top 3 penyumbang gift terbanyak'
  }
];

// Karakter Voice Over TTS
const VOICE_PROFILES = {
  'Gadis (Wanita Lembut)': { pitch: 1.15, rate: 1.03, gender: 'female' },
  'Bima (Pria Berwibawa)': { pitch: 0.78, rate: 0.96, gender: 'male' },
  'Robot Cyber AI': { pitch: 0.58, rate: 1.08, gender: 'neutral' },
  'Anime Kawaii Voice': { pitch: 1.55, rate: 1.12, gender: 'female' }
};

function formatTime(ts) {
  const d = ts ? new Date(ts) : new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function normalizeEventToMessage(ev) {
  const isGiftLike = ev.type === 'gift' || ev.type === 'superchat';
  let text = ev.content?.text || '';
  if (ev.type === 'gift' && ev.content?.gift) {
    const g = ev.content.gift;
    text = `Mengirim ${g.count || 1}x ${g.name || 'Gift'} (${(g.diamonds || 0).toLocaleString()} Coins)`;
  } else if (ev.type === 'superchat' && ev.content?.superchat) {
    text = `[${ev.content.superchat.amount || 'SuperChat'}] ${text}`;
  }

  return {
    id: ev.id || `${Date.now()}_${Math.random()}`,
    platform: ev.platform || 'tiktok',
    type: isGiftLike ? 'gift' : 'chat',
    eventType: ev.type,
    user: ev.user?.nickname || ev.user?.username || 'Penonton',
    text,
    time: formatTime(ev.timestamp),
    rawEvent: ev
  };
}

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState('widgets');

  // Server & Streaming Engine State
  const [serverOnline, setServerOnline] = useState(false);
  const [pingMs, setPingMs] = useState(0);
  const [engineActive, setEngineActive] = useState(true);
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [tkConnecting, setTkConnecting] = useState(false);
  const [ytConnecting, setYtConnecting] = useState(false);
  const [tiktokUser, setTiktokUser] = useState('');
  const [ytUrl, setYtUrl] = useState('');

  // Live Metrics (Split & Total Viewers)
  const [tiktokViewers, setTiktokViewers] = useState(0);
  const [youtubeViewers, setYoutubeViewers] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);

  // Live Chat Filter & Messages
  const [chatFilter, setChatFilter] = useState('all');
  const [chatInput, setChatInput] = useState('');
  const [pinnedMsg, setPinnedMsg] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [activeAlertToast, setActiveAlertToast] = useState(null);

  // Audio & TTS State
  const [selectedVoice, setSelectedVoice] = useState(
    () => localStorage.getItem('vexora_tts_voice') || 'Gadis (Wanita Lembut)'
  );
  const [isTTSActive, setIsTTSActive] = useState(
    () => localStorage.getItem('vexora_tts_enabled') !== 'false'
  );
  const ttsActiveRef = useRef(isTTSActive);
  const ttsVoiceRef = useRef(selectedVoice);
  useEffect(() => {
    ttsActiveRef.current = isTTSActive;
    localStorage.setItem('vexora_tts_enabled', String(isTTSActive));
  }, [isTTSActive]);
  useEffect(() => {
    ttsVoiceRef.current = selectedVoice;
    localStorage.setItem('vexora_tts_voice', selectedVoice);
  }, [selectedVoice]);

  // Goals & Leaderboard State
  const [coinGoal, setCoinGoal] = useState(1000);
  const [coinCurrent, setCoinCurrent] = useState(0);
  const [likeGoal, setLikeGoal] = useState(5000);
  const [likeCurrent, setLikeCurrent] = useState(0);
  const [leaderboard, setLeaderboard] = useState({ topGifters: [], topLikers: [] });

  // Live Chat Messages State
  const [chatMessages, setChatMessages] = useState([]);
  const seenIdsRef = useRef(new Set());
  const simCounterRef = useRef(0);

  // Multi Gift & Video Rules State
  const [giftRules, setGiftRules] = useState([]);
  const [showAddRuleForm, setShowAddRuleForm] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    giftTrigger: 'Rose',
    minCoins: 1,
    soundEffect: 'fanfare',
    mediaUrl: 'https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif',
    alertText: '{user} mengirim {count}x {gift}!'
  });

  // Custom Commands & Moderation State
  const [commands, setCommands] = useState([]);
  const [showAddCmdForm, setShowAddCmdForm] = useState(false);
  const [newCmd, setNewCmd] = useState({ trigger: '', cooldownSec: 5, response: '' });
  const [bannedWordsText, setBannedWordsText] = useState('kasar, anjing, babi, tolol, spamlink');
  const [fullConfig, setFullConfig] = useState(null);

  // Widget Registry State (Overlay Hub)
  const [widgets, setWidgets] = useState(DEFAULT_WIDGETS);

  // MODAL KUSTOMISASI & LIVE ANIMATION LOOP STATE
  const [customizingWidgetId, setCustomizingWidgetId] = useState(null);
  const [modalTheme, setModalTheme] = useState('dynamic-island');
  const [modalScale, setModalScale] = useState(100);
  const [modalAnimation, setModalAnimation] = useState('spring-island');
  const [previewBg, setPreviewBg] = useState('grid');
  const [previewTriggerKey, setPreviewTriggerKey] = useState(0);
  const [autoLoopPreview, setAutoLoopPreview] = useState(true);
  const [previewStep, setPreviewStep] = useState(0);
  const [modalCopied, setModalCopied] = useState(false);

  const activeCustomWidget = widgets.find((w) => w.id === customizingWidgetId);

  // Toast Helper
  const toastTimerRef = useRef(null);
  const triggerSimulatedAlert = (title, subtitle) => {
    setActiveAlertToast({ title, subtitle });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setActiveAlertToast(null), 3200);
  };

  // Web Speech API TTS Synthesizer
  const speakText = (textToSpeak, force = false) => {
    if ((!force && !ttsActiveRef.current) || typeof window === 'undefined' || !window.speechSynthesis) return;
    if (!textToSpeak) return;

    try {
      const voices = window.speechSynthesis.getVoices() || [];
      const profile = VOICE_PROFILES[ttsVoiceRef.current] || VOICE_PROFILES['Gadis (Wanita Lembut)'];
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.pitch = profile.pitch;
      utterance.rate = profile.rate;

      const idVoices = voices.filter((v) => v.lang.startsWith('id') || v.lang.includes('ID'));
      let chosenVoice = null;
      if (idVoices.length > 0) {
        if (profile.gender === 'female') {
          chosenVoice =
            idVoices.find((v) => /gadis|female|wanita|siti/i.test(v.name)) || idVoices[0];
        } else if (profile.gender === 'male') {
          chosenVoice =
            idVoices.find((v) => /ardi|male|pria|bima|budi/i.test(v.name)) ||
            idVoices[idVoices.length - 1];
        } else {
          chosenVoice = idVoices[0];
        }
      } else if (voices.length > 0) {
        chosenVoice = voices.find((v) => v.lang.startsWith('en')) || voices[0];
      }

      if (chosenVoice) {
        utterance.voice = chosenVoice;
        utterance.lang = chosenVoice.lang;
      } else {
        utterance.lang = 'id-ID';
      }

      if (force) window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch (_) {}
  };

  // Apply Server Config Snapshot
  const applyConfigFromServer = (cfg) => {
    if (!cfg) return;
    setFullConfig(cfg);

    if (typeof cfg.engineActive === 'boolean') {
      setEngineActive(cfg.engineActive);
    }

    if (Array.isArray(cfg.giftRules)) {
      setGiftRules(
        cfg.giftRules.map((r) => ({
          id: r.id,
          name: r.name,
          trigger: `${r.giftTrigger || '*'} (Min. ${r.minCoins || 0})`,
          file: r.mediaUrl ? r.mediaUrl.split('/').pop() || 'reaction.gif' : 'no_media',
          sfx: `${r.soundEffect || 'chime'}.mp3`,
          tts: r.alertText || '',
          raw: r
        }))
      );
    }

    if (Array.isArray(cfg.commands)) {
      setCommands(
        cfg.commands.map((c) => ({
          id: c.id,
          cmd: c.trigger,
          cooldown: `${c.cooldownSec || 5}s`,
          reply: c.response,
          raw: c
        }))
      );
    }

    if (cfg.moderation && Array.isArray(cfg.moderation.bannedWords)) {
      setBannedWordsText(cfg.moderation.bannedWords.join(', '));
    }

    if (cfg.goals) {
      if (cfg.goals.giftGoal) {
        setCoinGoal(Number(cfg.goals.giftGoal.target) || 1000);
        setCoinCurrent(Number(cfg.goals.giftGoal.current) || 0);
      }
      if (cfg.goals.likeGoal) {
        setLikeGoal(Number(cfg.goals.likeGoal.target) || 5000);
        setLikeCurrent(Number(cfg.goals.likeGoal.current) || 0);
      }
    }

    if (cfg.widgetConfigs) {
      setWidgets((prev) =>
        prev.map((w) => {
          const saved = cfg.widgetConfigs[w.id];
          return saved ? { ...w, ...saved } : w;
        })
      );
    }
  };

  // Apply Stats Snapshot
  const applyStatsFromServer = (stats) => {
    if (!stats) return;
    setTiktokConnected(Boolean(stats.tiktokConnected));
    setYoutubeConnected(Boolean(stats.youtubeConnected));
    if (stats.tiktokUsername) setTiktokUser((prev) => prev || stats.tiktokUsername);
    if (stats.youtubeTarget) setYtUrl((prev) => prev || stats.youtubeTarget);
    setTiktokViewers(Number(stats.tiktokViewers) || 0);
    setYoutubeViewers(Number(stats.youtubeViewers) || 0);
    setTotalLikes(Number(stats.totalLikes) || 0);
  };

  // Apply Pin Snapshot
  const applyPinFromServer = (pinnedData) => {
    if (!pinnedData || !pinnedData.event) {
      setPinnedMsg(null);
      return;
    }
    const ev = pinnedData.event;
    setPinnedMsg({
      user: ev.user?.nickname || ev.user?.username || 'Penonton',
      text: ev.content?.text || '',
      platform: ev.platform || 'tiktok',
      rawEvent: ev
    });
  };

  // Hydrate Initial State + Setup Real-Time Socket.IO + Ping Monitor
  useEffect(() => {
    let mounted = true;

    const hydrateStatus = async () => {
      try {
        const t0 = performance.now();
        const res = await fetch(`${BACKEND_URL}/api/status`);
        const data = await res.json();
        const latency = Math.max(1, Math.round(performance.now() - t0));
        if (!mounted) return;

        setServerOnline(true);
        setPingMs(latency);

        if (data.stats) applyStatsFromServer(data.stats);
        if (data.pinned) applyPinFromServer(data.pinned);
        if (data.config) applyConfigFromServer(data.config);
        if (data.leaderboard) setLeaderboard(data.leaderboard);
        if (Array.isArray(data.history)) {
          const mapped = data.history
            .filter((ev) => ['chat', 'gift', 'superchat', 'follow', 'member', 'share', 'host'].includes(ev.type))
            .map((ev) => {
              seenIdsRef.current.add(ev.id);
              return normalizeEventToMessage(ev);
            });
          setChatMessages(mapped);
        }
      } catch (_) {
        if (mounted) setServerOnline(false);
      }
    };

    hydrateStatus();

    const pingInterval = setInterval(async () => {
      try {
        const t0 = performance.now();
        const r = await fetch(`${BACKEND_URL}/api/ping`);
        if (r.ok && mounted) {
          setServerOnline(true);
          setPingMs(Math.max(1, Math.round(performance.now() - t0)));
        }
      } catch (_) {
        if (mounted) setServerOnline(false);
      }
    }, 5000);

    const socket = io(BACKEND_URL || window.location.origin, {
      reconnection: true,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      if (mounted) setServerOnline(true);
    });

    socket.on('disconnect', () => {
      if (mounted) setServerOnline(false);
    });

    socket.on('stats_update', (stats) => {
      if (mounted) applyStatsFromServer(stats);
    });

    socket.on('history_batch', (history) => {
      if (!mounted || !Array.isArray(history)) return;
      const mapped = history
        .filter((ev) => ['chat', 'gift', 'superchat', 'follow', 'member', 'share', 'host'].includes(ev.type))
        .map((ev) => {
          seenIdsRef.current.add(ev.id);
          return normalizeEventToMessage(ev);
        });
      setChatMessages(mapped);
    });

    socket.on('stream_event', (ev) => {
      if (!mounted || !ev || !ev.id) return;
      if (seenIdsRef.current.has(ev.id)) return;
      seenIdsRef.current.add(ev.id);

      if (ev.type === 'like') {
        setTotalLikes((prev) => prev + (Number(ev.content?.likeCount) || 1));
      }

      if (['chat', 'gift', 'superchat', 'follow', 'member', 'share', 'host'].includes(ev.type)) {
        const msgObj = normalizeEventToMessage(ev);
        setChatMessages((prev) => [...prev.slice(-149), msgObj]);

        if (ttsActiveRef.current && ['chat', 'gift', 'superchat'].includes(ev.type)) {
          const platLabel = ev.platform === 'tiktok' ? 'TikTok' : ev.platform === 'youtube' ? 'YouTube' : 'Host';
          speakText(`${msgObj.user} dari ${platLabel}: ${msgObj.text}`);
        }
      }
    });

    socket.on('pin_update', (pinnedData) => {
      if (mounted) applyPinFromServer(pinnedData);
    });

    socket.on('config_update', (cfg) => {
      if (mounted) applyConfigFromServer(cfg);
    });

    socket.on('goals_update', (goals) => {
      if (!mounted || !goals) return;
      if (goals.giftGoal) {
        setCoinGoal(Number(goals.giftGoal.target) || 1000);
        setCoinCurrent(Number(goals.giftGoal.current) || 0);
      }
      if (goals.likeGoal) {
        setLikeGoal(Number(goals.likeGoal.target) || 5000);
        setLikeCurrent(Number(goals.likeGoal.current) || 0);
      }
    });

    socket.on('leaderboard_update', (lb) => {
      if (mounted && lb) setLeaderboard(lb);
    });

    socket.on('rule_triggered', (data) => {
      if (mounted && data?.rule) {
        triggerSimulatedAlert(
          `Rule Terpicu: ${data.rule.name}`,
          `${data.event?.user?.nickname || 'Supporter'} memicu reaksi OBS!`
        );
      }
    });

    return () => {
      mounted = false;
      clearInterval(pingInterval);
      socket.disconnect();
    };
  }, []);

  // Auto-Looping Live Demo Effect saat Modal Kustomisasi dibuka
  useEffect(() => {
    if (!customizingWidgetId || !autoLoopPreview) return;
    const timer = setInterval(() => {
      setPreviewStep((prev) => prev + 1);
      setPreviewTriggerKey((prev) => prev + 1);
    }, 3000);
    return () => clearInterval(timer);
  }, [customizingWidgetId, autoLoopPreview]);

  // Buka Modal Kustomisasi
  const openCustomizeModal = (widget) => {
    setCustomizingWidgetId(widget.id);
    setModalTheme(widget.selectedTheme || 'dynamic-island');
    setModalScale(widget.scale || 100);
    setModalAnimation(widget.animation || 'spring-island');
    setModalCopied(false);
    setAutoLoopPreview(true);
    setPreviewStep(0);
    setPreviewTriggerKey((prev) => prev + 1);
  };

  // Manual Trigger Event di Preview Stage
  const handleManualPreviewTrigger = () => {
    setPreviewStep((prev) => prev + 1);
    setPreviewTriggerKey((prev) => prev + 1);
  };

  // Helper Copy ke Clipboard
  const handleCopy = (text, id) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Persist Widget Configs ke Backend
  const syncWidgetsToBackend = async (updatedWidgets) => {
    const widgetConfigs = {};
    updatedWidgets.forEach((w) => {
      widgetConfigs[w.id] = {
        status: w.status,
        selectedTheme: w.selectedTheme,
        scale: w.scale,
        animation: w.animation
      };
    });

    try {
      await fetch(`${BACKEND_URL}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgetConfigs })
      });
    } catch (_) {}
  };

  // Toggle Status Aktif Widget
  const toggleWidget = (id) => {
    setWidgets((prev) => {
      const next = prev.map((w) => (w.id === id ? { ...w, status: !w.status } : w));
      syncWidgetsToBackend(next);
      return next;
    });
  };

  // Susun URL Dinamis untuk OBS Browser Source
  const getDynamicObsUrl = (widget, theme = modalTheme, scale = modalScale, anim = modalAnimation) => {
    if (!widget) return '';
    return `${widget.baseUrl}?theme=${theme}&scale=${scale}&anim=${anim}`;
  };

  // Simpan & Salin Link dari Modal Kustomisasi
  const handleApplyAndCopyModal = () => {
    if (!activeCustomWidget) return;
    setWidgets((prev) => {
      const next = prev.map((w) =>
        w.id === activeCustomWidget.id
          ? { ...w, selectedTheme: modalTheme, scale: modalScale, animation: modalAnimation, status: true }
          : w
      );
      syncWidgetsToBackend(next);
      return next;
    });

    const url = getDynamicObsUrl(activeCustomWidget, modalTheme, modalScale, modalAnimation);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setModalCopied(true);
    setTimeout(() => setModalCopied(false), 2500);
  };

  // Engine Start / Stop Handler
  const handleToggleEngine = async () => {
    const nextActive = !engineActive;
    try {
      const res = await fetch(`${BACKEND_URL}/api/engine/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextActive })
      });
      const data = await res.json();
      if (data.ok) {
        setEngineActive(nextActive);
        triggerSimulatedAlert(
          nextActive ? 'Engine Diaktifkan' : 'Engine Dihentikan',
          nextActive ? 'Dual Live Engine siap menerima koneksi TikTok & YouTube.' : 'Semua koneksi live diputuskan sementara.'
        );
      }
    } catch (_) {
      triggerSimulatedAlert('Server Tidak Terjangkau', 'Pastikan server lokal port 3333 sedang berjalan.');
    }
  };

  // TikTok Connect / Disconnect
  const handleTikTokToggle = async () => {
    if (tiktokConnected) {
      setTkConnecting(true);
      try {
        await fetch(`${BACKEND_URL}/api/disconnect/tiktok`, { method: 'POST' });
        setTiktokConnected(false);
        triggerSimulatedAlert('TikTok Diputuskan', 'Koneksi TikTok LIVE berhasil dihentikan.');
      } catch (_) {}
      setTkConnecting(false);
      return;
    }

    const cleanUser = tiktokUser.replace(/^@/, '').trim();
    if (!cleanUser) {
      triggerSimulatedAlert('Username Kosong', 'Masukkan username TikTok LIVE terlebih dahulu.');
      return;
    }

    setTkConnecting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/connect/tiktok`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser })
      });
      const data = await res.json();
      if (data.ok) {
        setTiktokConnected(true);
        triggerSimulatedAlert('TikTok Terhubung', `Berhasil terhubung ke @${cleanUser}`);
      } else {
        triggerSimulatedAlert('Gagal Terhubung ke TikTok', data.message || 'Pastikan akun sedang LIVE.');
      }
    } catch (_) {
      triggerSimulatedAlert('Error Koneksi TikTok', 'Tidak dapat menghubungi backend server.');
    }
    setTkConnecting(false);
  };

  // YouTube Connect / Disconnect
  const handleYouTubeToggle = async () => {
    if (youtubeConnected) {
      setYtConnecting(true);
      try {
        await fetch(`${BACKEND_URL}/api/disconnect/youtube`, { method: 'POST' });
        setYoutubeConnected(false);
        triggerSimulatedAlert('YouTube Diputuskan', 'Koneksi YouTube Live berhasil dihentikan.');
      } catch (_) {}
      setYtConnecting(false);
      return;
    }

    const cleanInput = ytUrl.trim();
    if (!cleanInput) {
      triggerSimulatedAlert('Input YouTube Kosong', 'Masukkan URL Live / Video ID / @handle channel.');
      return;
    }

    setYtConnecting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/connect/youtube`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: cleanInput })
      });
      const data = await res.json();
      if (data.ok) {
        setYoutubeConnected(true);
        triggerSimulatedAlert('YouTube Terhubung', 'Berhasil terhubung ke YouTube Live Chat.');
      } else {
        triggerSimulatedAlert('Gagal Terhubung ke YouTube', data.message || 'Pastikan siaran sedang LIVE.');
      }
    } catch (_) {
      triggerSimulatedAlert('Error Koneksi YouTube', 'Tidak dapat menghubungi backend server.');
    }
    setYtConnecting(false);
  };

  // Test Event Button (Top Bar -> Broadcast to Real OBS Overlay!)
  const handleGlobalTestEvent = async () => {
    const seq = [
      { platform: 'tiktok', type: 'gift', custom: { giftName: 'Rose', count: 5 } },
      { platform: 'youtube', type: 'superchat', custom: { amount: 'Rp 50.000' } },
      { platform: 'tiktok', type: 'follow' },
      { platform: 'tiktok', type: 'like' }
    ];
    const picked = seq[simCounterRef.current % seq.length];
    simCounterRef.current += 1;

    try {
      await fetch(`${BACKEND_URL}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(picked)
      });
      triggerSimulatedAlert('Simulasi Event OBS', `Sinyal ${picked.platform.toUpperCase()} (${picked.type}) dikirim ke semua Browser Source.`);
    } catch (_) {
      triggerSimulatedAlert('Gagal Kirim Event', 'Backend server offline.');
    }
  };

  // Simulasi Chat Masuk di Tab Live Chat
  const simulateIncomingChat = async () => {
    const sample = PREVIEW_CHAT_POOL[Math.floor(Math.random() * PREVIEW_CHAT_POOL.length)];
    try {
      await fetch(`${BACKEND_URL}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: sample.platform === 'TT' ? 'tiktok' : 'youtube',
          type: sample.isSuper ? 'superchat' : 'chat',
          custom: {
            username: sample.user.toLowerCase(),
            nickname: sample.user,
            text: sample.msg
          }
        })
      });
    } catch (_) {
      triggerSimulatedAlert('Gagal Simulasi', 'Server tidak merespon.');
    }
  };

  // Clear Feed
  const handleClearFeed = async () => {
    setChatMessages([]);
    seenIdsRef.current.clear();
    try {
      await fetch(`${BACKEND_URL}/api/clear`, { method: 'POST' });
    } catch (_) {}
  };

  // Pin & Unpin Komentar ke OBS Spotlight
  const handlePinMessage = async (msg) => {
    const eventPayload = msg.rawEvent || {
      id: `pin_${msg.id}`,
      platform: msg.platform,
      type: msg.type,
      user: { nickname: msg.user, username: msg.user, avatar: '' },
      content: { text: msg.text }
    };

    setPinnedMsg({ user: msg.user, text: msg.text, platform: msg.platform, rawEvent: eventPayload });
    try {
      await fetch(`${BACKEND_URL}/api/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: eventPayload, duration: 45 })
      });
    } catch (_) {}
  };

  const handleUnpin = async () => {
    setPinnedMsg(null);
    try {
      await fetch(`${BACKEND_URL}/api/unpin`, { method: 'POST' });
    } catch (_) {}
  };

  // Kirim Pesan Moderator ke Backend + OBS
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    setChatInput('');
    try {
      await fetch(`${BACKEND_URL}/api/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, user: 'Moderator (You)' })
      });
    } catch (_) {
      triggerSimulatedAlert('Gagal Kirim Pesan', 'Backend server offline.');
    }
  };

  // CRUD Multi Gift Rules
  const handleAddRule = async (e) => {
    e.preventDefault();
    if (!newRule.name.trim() || !newRule.giftTrigger.trim()) {
      triggerSimulatedAlert('Form Belum Lengkap', 'Nama aturan dan pemicu gift wajib diisi.');
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/rules/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRule.name.trim(),
          giftTrigger: newRule.giftTrigger.trim(),
          minCoins: Number(newRule.minCoins) || 1,
          soundEffect: newRule.soundEffect || 'fanfare',
          mediaUrl: newRule.mediaUrl.trim(),
          alertText: newRule.alertText.trim(),
          duration: 5
        })
      });
      const data = await res.json();
      if (data.ok) {
        setShowAddRuleForm(false);
        setNewRule({
          name: '',
          giftTrigger: 'Rose',
          minCoins: 1,
          soundEffect: 'fanfare',
          mediaUrl: 'https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif',
          alertText: '{user} mengirim {count}x {gift}!'
        });
        triggerSimulatedAlert('Aturan Disimpan', 'Aturan multi-gift baru aktif di OBS.');
      }
    } catch (_) {}
  };

  const handleTestRule = async (rule) => {
    try {
      await fetch(`${BACKEND_URL}/api/rules/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id })
      });
      triggerSimulatedAlert(`Simulasi: ${rule.name}`, `Memutar ${rule.file} + SFX ${rule.sfx} di OBS`);
    } catch (_) {}
  };

  const handleDeleteRule = async (id) => {
    try {
      await fetch(`${BACKEND_URL}/api/rules/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      setGiftRules((prev) => prev.filter((r) => r.id !== id));
    } catch (_) {}
  };

  // Update Goals ke Backend & OBS
  const handleUpdateGoal = async (type, targetVal) => {
    try {
      await fetch(`${BACKEND_URL}/api/goals/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, target: Number(targetVal) })
      });
      triggerSimulatedAlert(
        type === 'giftGoal' ? 'Target Koin Disimpan' : 'Target Likes Disimpan',
        `Target baru ${Number(targetVal).toLocaleString()} telah dikirim ke OBS.`
      );
    } catch (_) {}
  };

  // CRUD Custom Commands & Moderasi
  const handleAddCommand = async (e) => {
    e.preventDefault();
    if (!newCmd.trigger.trim() || !newCmd.response.trim()) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/commands/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger: newCmd.trigger.trim(),
          response: newCmd.response.trim(),
          cooldownSec: Number(newCmd.cooldownSec) || 5,
          actionType: 'banner'
        })
      });
      const data = await res.json();
      if (data.ok) {
        setShowAddCmdForm(false);
        setNewCmd({ trigger: '', cooldownSec: 5, response: '' });
        triggerSimulatedAlert('Command Ditambahkan', 'Perintah chat otomatis siap dipakai.');
      }
    } catch (_) {}
  };

  const handleDeleteCommand = async (id) => {
    try {
      await fetch(`${BACKEND_URL}/api/commands/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      setCommands((prev) => prev.filter((c) => c.id !== id));
    } catch (_) {}
  };

  const handleSaveModeration = async () => {
    const words = bannedWordsText
      .split(',')
      .map((w) => w.trim())
      .filter(Boolean);
    try {
      await fetch(`${BACKEND_URL}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moderation: {
            ...(fullConfig?.moderation || { cooldownSeconds: 3, autoFilterProfanity: true, ttsMinCoins: 0 }),
            bannedWords: words
          }
        })
      });
      triggerSimulatedAlert('Filter Moderasi Diperbarui', `${words.length} kata terlarang akan disensor otomatis.`);
    } catch (_) {}
  };

  // Helper untuk merender Live Preview Widget di dalam Modal dengan Animasi Hidup
  const renderLiveWidgetPreview = () => {
    if (!activeCustomWidget) return null;

    const animClass = `anim-${modalAnimation}`;

    const getThemeClasses = () => {
      switch (modalTheme) {
        case 'dynamic-island':
          return 'bg-black/95 text-white rounded-full border border-white/15 shadow-[0_14px_45px_rgba(0,0,0,0.9)] px-5 py-3';
        case 'cyber-purple':
          return 'bg-[#120B24]/95 text-white rounded-2xl border-2 border-indigo-500 shadow-[0_0_35px_rgba(99,102,241,0.55)] px-5 py-3.5';
        case 'frosted-glass':
          return 'bg-white/15 backdrop-blur-xl text-white rounded-2xl border border-white/30 shadow-2xl px-5 py-3.5';
        case 'arcade-8bit':
          return 'bg-[#18221D] text-emerald-300 rounded-none border-4 border-emerald-400 shadow-[6px_6px_0px_#10B981] px-5 py-3 font-mono';
        case 'royal-gold':
          return 'bg-gradient-to-r from-[#1E170A] via-[#2F230D] to-[#1E170A] text-amber-100 rounded-2xl border-2 border-amber-400/90 shadow-[0_0_35px_rgba(245,158,11,0.45)] px-5 py-3.5';
        default:
          return 'bg-slate-900 text-white rounded-xl border border-slate-700 p-4';
      }
    };

    if (['chat_box', 'dock_chat', 'spotlight_pin'].includes(activeCustomWidget.id)) {
      if (activeCustomWidget.id === 'spotlight_pin') {
        const spotlightItem = PREVIEW_CHAT_POOL[previewStep % PREVIEW_CHAT_POOL.length];
        return (
          <div style={{ transform: `scale(${modalScale / 100})` }} className="max-w-md w-full px-4">
            <div key={previewTriggerKey} className={`${animClass} space-y-2`}>
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                <Pin className="w-3.5 h-3.5 animate-bounce" />
                <span>Pinned Comment Spotlight</span>
              </div>
              <div className={`${getThemeClasses()} relative overflow-hidden`}>
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-indigo-500 p-0.5 shrink-0">
                    <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-xs font-black text-white">
                      {spotlightItem.user.charAt(0)}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full text-white ${spotlightItem.badgeColor}`}>
                        {spotlightItem.level}
                      </span>
                      <span className="text-xs font-bold truncate">{spotlightItem.user}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-slate-300">{spotlightItem.platform}</span>
                    </div>
                    <p className="text-xs text-slate-100 mt-0.5 leading-snug">{spotlightItem.msg}</p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                  <div
                    key={`bar-${previewTriggerKey}`}
                    className="h-full bg-gradient-to-r from-amber-400 to-pink-500"
                    style={{ animation: 'pinCountdown 3s linear forwards' }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      }

      const firstChat = PREVIEW_CHAT_POOL[previewStep % PREVIEW_CHAT_POOL.length];
      const secondChat = PREVIEW_CHAT_POOL[(previewStep + 1) % PREVIEW_CHAT_POOL.length];

      return (
        <div style={{ transform: `scale(${modalScale / 100})` }} className="space-y-3 max-w-md w-full px-4">
          <div className={`${getThemeClasses()} opacity-75 scale-[0.97] transition-all duration-500 flex items-center gap-3.5`}>
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
              {firstChat.user.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full text-white ${firstChat.badgeColor}`}>
                  {firstChat.level}
                </span>
                <span className="text-xs font-bold truncate">{firstChat.user}</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 truncate">{firstChat.msg}</p>
            </div>
          </div>

          <div key={previewTriggerKey} className={`${getThemeClasses()} ${animClass} flex items-center gap-3.5`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shrink-0">
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-xs font-black text-white">
                {secondChat.user.charAt(0)}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full text-white ${secondChat.badgeColor}`}>
                  {secondChat.level}
                </span>
                <span className="text-xs font-bold truncate">{secondChat.user}</span>
                <span className="text-[9px] font-mono px-1.5 rounded bg-white/10 text-cyan-300">{secondChat.platform}</span>
              </div>
              <p className="text-xs text-white mt-0.5 leading-snug">{secondChat.msg}</p>
            </div>
          </div>
        </div>
      );
    }

    if (['gift_alert', 'follow_alert', 'like_float'].includes(activeCustomWidget.id)) {
      const isGift = activeCustomWidget.id === 'gift_alert';
      const isFollow = activeCustomWidget.id === 'follow_alert';
      const alertData = PREVIEW_ALERT_POOL[previewStep % PREVIEW_ALERT_POOL.length];
      const comboCount = ((previewStep % 8) + 1) * 15;

      return (
        <div style={{ transform: `scale(${modalScale / 100})` }} className="max-w-md w-full px-4 relative">
          <div key={`particles-${previewTriggerKey}`} className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {[
              { left: '18%', delay: '0s', color: 'text-pink-400' },
              { left: '35%', delay: '0.15s', color: 'text-amber-400' },
              { left: '65%', delay: '0.08s', color: 'text-cyan-400' },
              { left: '82%', delay: '0.22s', color: 'text-rose-400' }
            ].map((p, idx) => (
              <div
                key={idx}
                className={`absolute bottom-8 ${p.color}`}
                style={{
                  left: p.left,
                  animation: `floatParticleUp 1.6s ease-out ${p.delay} forwards`
                }}
              >
                {isGift ? <Star className="w-5 h-5 fill-current" /> : <Heart className="w-5 h-5 fill-current" />}
              </div>
            ))}
          </div>

          <div key={previewTriggerKey} className={`${getThemeClasses()} ${animClass} text-center space-y-2.5 relative`}>
            <div className="absolute -top-3 -right-2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[11px] font-black shadow-lg animate-bounce">
              {isGift ? `x${alertData.combo} COMBO` : !isFollow ? `${comboCount}x TAP!` : 'NEW!'}
            </div>

            <div className="anim-idle-bob inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-pink-500 to-indigo-500 text-white shadow-xl mx-auto">
              {isGift ? <Gift className="w-7 h-7" /> : isFollow ? <Users className="w-7 h-7" /> : <Heart className="w-7 h-7 fill-white" />}
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-widest font-extrabold opacity-85">
                {isGift ? `🎉 SULTAN GIFT (+${alertData.coins} COINS)` : isFollow ? '✨ FOLLOWER BARU BERGABUNG' : '❤️ LIKE MILESTONE BURST'}
              </div>
              <div className="text-base font-black mt-0.5">
                {isGift
                  ? `${alertData.user} mengirim ${alertData.giftName}!`
                  : isFollow
                  ? `${alertData.user} mulai mengikuti!`
                  : `${alertData.user} mengirim ${comboCount} Likes!`}
              </div>
              <p className="text-xs opacity-90 mt-1 italic">"{alertData.quote}"</p>
            </div>

            {isGift && (
              <div className="pt-1 flex items-center justify-center gap-1">
                <AudioWaveform className="w-3.5 h-3.5 text-cyan-400 mr-1" />
                {[0.1, 0.3, 0.15, 0.4, 0.2, 0.35, 0.12].map((d, i) => (
                  <span
                    key={i}
                    className="w-1 bg-cyan-400 rounded-full"
                    style={{ animation: `eqWave 0.65s ease-in-out ${d}s infinite` }}
                  />
                ))}
                <span className="text-[10px] font-mono text-cyan-300 ml-1.5">TTS Reading...</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeCustomWidget.id === 'goal_bar') {
      const addedCoins = (previewStep % 6) * 140;
      const dynamicCurrent = Math.min(coinGoal, coinCurrent + addedCoins);
      const pct = Math.min(100, Math.round((dynamicCurrent / Math.max(1, coinGoal)) * 100));

      return (
        <div style={{ transform: `scale(${modalScale / 100})` }} className="max-w-md w-full px-4">
          <div key={previewTriggerKey} className={`${getThemeClasses()} ${animClass} space-y-2.5`}>
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-amber-400 animate-bounce" />
                <span>Target Koin Live Stream</span>
              </span>
              <div className="flex items-center gap-2">
                {addedCoins > 0 && (
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 animate-pulse">
                    +140 🪙
                  </span>
                )}
                <span className="font-mono">{dynamicCurrent} / {coinGoal} 🪙 ({pct}%)</span>
              </div>
            </div>
            <div className="w-full h-3.5 bg-black/60 rounded-full overflow-hidden p-0.5 border border-white/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 liquid-bar-stripes transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      );
    }

    if (activeCustomWidget.id === 'viewer_hud') {
      const ttCount = tiktokViewers > 0 ? tiktokViewers : 1180 + (previewStep % 9) * 17;
      const ytCount = youtubeViewers > 0 ? youtubeViewers : 240 + (previewStep % 5) * 6;

      return (
        <div style={{ transform: `scale(${modalScale / 100})` }}>
          <div key={previewTriggerKey} className={`${getThemeClasses()} ${animClass} flex items-center gap-4`}>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-extrabold tracking-wide uppercase">LIVE</span>
            </div>
            <div className="h-4 w-px bg-white/20" />
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <span className="text-pink-400">TikTok:</span>
              <span className="font-mono text-white transition-all">{ttCount.toLocaleString()}</span>
            </div>
            <div className="h-4 w-px bg-white/20" />
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <span className="text-rose-400">YouTube:</span>
              <span className="font-mono text-white transition-all">{ytCount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      );
    }

    // Leaderboard Preview dengan Rank Overtake Animation
    const topSultanCoins = 1500 + (previewStep % 6) * 250;
    const isSwapped = previewStep % 2 === 1;
    const leaderboardRows = isSwapped
      ? [
          { rank: '1', name: 'Clarissa_22', val: `${topSultanCoins.toLocaleString()} 🪙`, isNewTop: true },
          { rank: '2', name: 'Sultan_Reza', val: '1,500 🪙', isNewTop: false },
          { rank: '3', name: 'Dimas_Stream', val: '450 🪙', isNewTop: false }
        ]
      : [
          { rank: '1', name: 'Sultan_Reza', val: `${topSultanCoins.toLocaleString()} 🪙`, isNewTop: true },
          { rank: '2', name: 'Clarissa_22', val: '1,320 🪙', isNewTop: false },
          { rank: '3', name: 'Dimas_Stream', val: '450 🪙', isNewTop: false }
        ];

    return (
      <div style={{ transform: `scale(${modalScale / 100})` }} className="max-w-sm w-full px-4">
        <div key={previewTriggerKey} className={`${getThemeClasses()} ${animClass} space-y-2.5`}>
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider border-b border-white/15 pb-2">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400 anim-idle-bob" />
              <span>Top 3 Sultan Hari Ini</span>
            </div>
            <span className="text-[9px] font-mono text-emerald-400 animate-pulse">LIVE RANK</span>
          </div>
          {leaderboardRows.map((r) => (
            <div
              key={r.name}
              className={`flex items-center justify-between text-xs px-2 py-1 rounded-lg transition-all duration-500 ${
                r.isNewTop ? 'bg-amber-400/15 border border-amber-400/30' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 rounded-full font-bold flex items-center justify-center text-[10px] ${
                    r.rank === '1' ? 'bg-amber-400 text-black' : 'bg-white/10 text-slate-200'
                  }`}
                >
                  #{r.rank}
                </span>
                <span className="font-semibold">{r.name}</span>
              </div>
              <span className="font-mono font-bold text-amber-300">{r.val}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const totalViewers = tiktokViewers + youtubeViewers;
  const formattedLikes = totalLikes >= 1000 ? `${(totalLikes / 1000).toFixed(1)}K` : totalLikes.toLocaleString();

  return (
    <div className="flex h-screen w-full bg-[#0B0D14] text-slate-200 font-sans select-none overflow-hidden antialiased">
      {/* Inject Custom Keyframe Styles */}
      <style>{STUDIO_ANIMATION_STYLES}</style>

      {/* ===================== 1. SLIM STUDIO SIDEBAR ===================== */}
      <aside className="w-64 border-r border-slate-800/80 bg-[#0E111A] flex flex-col justify-between z-20 shrink-0">
        <div>
          {/* Logo Brand Header */}
          <div className="h-16 px-5 border-b border-slate-800/70 flex items-center gap-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 shadow-lg shadow-indigo-500/25 text-white font-black text-lg">
              V
              {engineActive && serverOnline && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-[#0E111A]"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-[15px] tracking-tight">Vexora Stream</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">PRO</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Unified Live Suite v5.2</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Studio Menu</div>

            <button
              onClick={() => setActiveTab('engine')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === 'engine'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Radio className="w-4 h-4" />
                <span>Dual Engine</span>
              </div>
              <span className={`w-2 h-2 rounded-full ${engineActive ? 'bg-emerald-400 ring-2 ring-emerald-400/30' : 'bg-slate-600'}`}></span>
            </button>

            <button
              onClick={() => setActiveTab('widgets')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === 'widgets'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                <span>Overlay Hub</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                {widgets.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4" />
                <span>Live Chat & Dock</span>
              </div>
              <span className="flex h-2 w-2 relative">
                <span className={`animate-pulse rounded-full h-2 w-2 ${chatMessages.length > 0 ? 'bg-rose-500' : 'bg-slate-600'}`}></span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === 'rules'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4" />
                <span>Multi Gift & Rules</span>
              </div>
              <span className="text-[10px] text-amber-400 font-mono">{giftRules.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('goals')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === 'goals'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Trophy className="w-4 h-4" />
                <span>Goals & Leaderboard</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('moderation')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === 'moderation'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Terminal className="w-4 h-4" />
                <span>Commands & Moderasi</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-3 border-t border-slate-800/70 space-y-2 bg-[#0B0D14]">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => triggerSimulatedAlert('Bahasa Aktif', 'Antarmuka menggunakan Bahasa Indonesia (ID).')}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] text-slate-300 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 transition cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>Bahasa: ID</span>
            </button>
            <button
              onClick={() => handleCopy('discord.gg/vexorastream', 'discord_footer')}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] text-slate-300 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 transition cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span>{copiedId === 'discord_footer' ? 'Disalin!' : 'Discord'}</span>
            </button>
          </div>

          <button
            onClick={() => triggerSimulatedAlert('Support Creator', 'Terima kasih telah mendukung pengembangan Vexora Suite!')}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Support Developer</span>
          </button>

          <div className="text-[10px] text-center text-slate-400 pt-1">
            Local Server:{' '}
            <span className={`font-mono ${serverOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
              {serverOnline ? 'localhost:3333' : 'offline'}
            </span>
          </div>
        </div>
      </aside>

      {/* ===================== 2. MAIN WORKSPACE CONTAINER ===================== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0B0D14]">

        {/* TOP STATUS BAR */}
        <header className="h-16 border-b border-slate-800/80 bg-[#0E111A]/90 px-6 flex items-center justify-between gap-4 z-10 shrink-0">

          {/* Platform Status Indicators */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveTab('engine')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition cursor-pointer ${
                tiktokConnected
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${tiktokConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
              <span>TikTok: {tiktokConnected ? `@${tiktokUser || 'live'}` : 'Offline'}</span>
            </button>

            <button
              onClick={() => setActiveTab('engine')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition cursor-pointer ${
                youtubeConnected
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-900/40 text-rose-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${youtubeConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
              <span>YouTube: {youtubeConnected ? 'Live' : 'Standby'}</span>
            </button>

            <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 text-[11px] text-slate-400 bg-slate-900/60 rounded-lg border border-slate-800">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ping: <strong className="text-slate-200 font-mono">{serverOnline ? `${pingMs}ms` : '--'}</strong></span>
            </div>
          </div>

          {/* Quick Metrics Ticker (Termasuk Viewers Terpisah TikTok & YouTube) */}
          <div className="hidden lg:flex items-center gap-3.5 bg-[#131620] border border-slate-800 px-4 py-1.5 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs" title={`TikTok: ${tiktokViewers} | YouTube: ${youtubeViewers}`}>
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400">TT:</span>
              <span className="font-bold text-pink-400 font-mono">{tiktokViewers.toLocaleString()}</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">YT:</span>
              <span className="font-bold text-rose-400 font-mono">{youtubeViewers.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 font-mono">({totalViewers.toLocaleString()})</span>
            </div>
            <div className="w-px h-3 bg-slate-700"></div>
            <div className="flex items-center gap-1.5 text-xs">
              <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500/30" />
              <span className="text-slate-400">Likes:</span>
              <span className="font-bold text-white font-mono">{formattedLikes}</span>
            </div>
            <div className="w-px h-3 bg-slate-700"></div>
            <div className="flex items-center gap-1.5 text-xs">
              <Gift className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Coins:</span>
              <span className="font-bold text-amber-300 font-mono">{coinCurrent.toLocaleString()}</span>
            </div>
          </div>

          {/* Action Hub Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleGlobalTestEvent}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#131620] hover:bg-slate-800 border border-slate-700/80 rounded-xl text-xs font-semibold text-slate-200 transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Test Event</span>
            </button>

            <button
              onClick={() => handleCopy(`${OBS_BASE_URL}/overlay/all`, 'top_obs')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              {copiedId === 'top_obs' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === 'top_obs' ? 'Tersalin!' : 'Salin Semua Link OBS'}</span>
            </button>
          </div>
        </header>

        {/* ===================== 3. VIEWPORT CONTENT ===================== */}
        <main className="flex-1 overflow-y-auto p-6">

          {/* VIEW: 1. OVERLAY HUB */}
          {activeTab === 'widgets' && (
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white tracking-tight">Widget & Overlay Hub</h2>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      Real-time Theme Customizer
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Klik <strong className="text-slate-200">Atur Tema & Preview</strong> pada widget pilihan Anda, pilih gaya visual yang cocok, lalu salin URL otomatis untuk dipasang di OBS Studio.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(`${OBS_BASE_URL}/overlay/all-in-one`, 'all_pack')}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#131620] hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{copiedId === 'all_pack' ? 'Tersalin!' : 'Salin All-in-One Overlay'}</span>
                  </button>
                </div>
              </div>

              {/* KATEGORI 1: CHAT & DOCKS */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    <span>Chat & Docks</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Tampilan komentar & kontrol OBS</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {widgets.filter((w) => w.cat === 'chat').map((item) => {
                    const themeObj = OVERLAY_THEMES.find((t) => t.id === item.selectedTheme);
                    const fullUrl = getDynamicObsUrl(item, item.selectedTheme, item.scale, item.animation);
                    return (
                      <div key={item.id} className="p-4 rounded-2xl bg-[#131620] border border-slate-800/90 hover:border-indigo-500/40 transition-all flex flex-col justify-between group shadow-lg">
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition">{item.name}</h4>
                              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                            </div>
                            <button
                              onClick={() => toggleWidget(item.id)}
                              title={item.status ? 'Widget Aktif' : 'Widget Nonaktif'}
                              className={`w-9 h-5 rounded-full p-0.5 transition duration-200 shrink-0 cursor-pointer ${item.status ? 'bg-indigo-600' : 'bg-slate-800'}`}
                            >
                              <div className={`w-4 h-4 rounded-full bg-white transition transform ${item.status ? 'translate-x-4' : 'translate-x-0'}`}></div>
                            </button>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                              <Palette className="w-3 h-3" />
                              Tema: {themeObj?.name || 'Default'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">Skala {item.scale}%</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
                          <button
                            onClick={() => openCustomizeModal(item)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm shadow-indigo-600/20 transition cursor-pointer"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>Atur Tema & Preview</span>
                          </button>

                          <button
                            onClick={() => handleCopy(fullUrl, item.id)}
                            title="Salin URL OBS Cepat"
                            className="p-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700/70 transition cursor-pointer"
                          >
                            {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* KATEGORI 2: ALERTS & POPUPS */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-pink-400" />
                    <span>Alerts & Popups</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Notifikasi saweran gift, follower & like</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {widgets.filter((w) => w.cat === 'alerts').map((item) => {
                    const themeObj = OVERLAY_THEMES.find((t) => t.id === item.selectedTheme);
                    const fullUrl = getDynamicObsUrl(item, item.selectedTheme, item.scale, item.animation);
                    return (
                      <div key={item.id} className="p-4 rounded-2xl bg-[#131620] border border-slate-800/90 hover:border-pink-500/40 transition-all flex flex-col justify-between group shadow-lg">
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-bold text-white group-hover:text-pink-300 transition">{item.name}</h4>
                              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                            </div>
                            <button
                              onClick={() => toggleWidget(item.id)}
                              className={`w-9 h-5 rounded-full p-0.5 transition duration-200 shrink-0 cursor-pointer ${item.status ? 'bg-pink-600' : 'bg-slate-800'}`}
                            >
                              <div className={`w-4 h-4 rounded-full bg-white transition transform ${item.status ? 'translate-x-4' : 'translate-x-0'}`}></div>
                            </button>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-pink-500/15 text-pink-300 border border-pink-500/25">
                              <Palette className="w-3 h-3" />
                              Tema: {themeObj?.name || 'Default'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">Skala {item.scale}%</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
                          <button
                            onClick={() => openCustomizeModal(item)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm shadow-indigo-600/20 transition cursor-pointer"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>Atur Tema & Preview</span>
                          </button>

                          <button
                            onClick={() => handleCopy(fullUrl, item.id)}
                            title="Salin URL OBS Cepat"
                            className="p-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700/70 transition cursor-pointer"
                          >
                            {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* KATEGORI 3: COUNTERS & GOALS */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>Counters & Goals</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Target progres & klasemen donatur</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {widgets.filter((w) => w.cat === 'counters').map((item) => {
                    const themeObj = OVERLAY_THEMES.find((t) => t.id === item.selectedTheme);
                    const fullUrl = getDynamicObsUrl(item, item.selectedTheme, item.scale, item.animation);
                    return (
                      <div key={item.id} className="p-4 rounded-2xl bg-[#131620] border border-slate-800/90 hover:border-amber-500/40 transition-all flex flex-col justify-between group shadow-lg">
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition">{item.name}</h4>
                              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                            </div>
                            <button
                              onClick={() => toggleWidget(item.id)}
                              className={`w-9 h-5 rounded-full p-0.5 transition duration-200 shrink-0 cursor-pointer ${item.status ? 'bg-amber-600' : 'bg-slate-800'}`}
                            >
                              <div className={`w-4 h-4 rounded-full bg-white transition transform ${item.status ? 'translate-x-4' : 'translate-x-0'}`}></div>
                            </button>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/25">
                              <Palette className="w-3 h-3" />
                              Tema: {themeObj?.name || 'Default'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">Skala {item.scale}%</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
                          <button
                            onClick={() => openCustomizeModal(item)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm shadow-indigo-600/20 transition cursor-pointer"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>Atur Tema & Preview</span>
                          </button>

                          <button
                            onClick={() => handleCopy(fullUrl, item.id)}
                            title="Salin URL OBS Cepat"
                            className="p-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700/70 transition cursor-pointer"
                          >
                            {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: 2. DUAL ENGINE & KONEKSI */}
          {activeTab === 'engine' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="p-6 rounded-2xl bg-gradient-to-r from-[#131620] via-[#151A28] to-indigo-950/40 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`flex h-2.5 w-2.5 rounded-full ${engineActive ? 'bg-emerald-400 ring-4 ring-emerald-400/20' : 'bg-slate-600'}`}></span>
                    <h2 className="text-xl font-bold text-white tracking-tight">Vexora Dual Live Engine</h2>
                  </div>
                  <p className="text-xs text-slate-400 max-w-xl">
                    Hubungkan akun TikTok Live dan YouTube Live secara bersamaan untuk menyatukan chat, alert saweran, dan pembaca suara TTS dalam satu layar OBS.
                  </p>
                </div>

                <button
                  onClick={handleToggleEngine}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-lg cursor-pointer ${
                    engineActive
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                  }`}
                >
                  {engineActive ? <Square className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                  <span>{engineActive ? 'Stop Engine' : 'Start Engine'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* TikTok Card */}
                <div className="p-5 rounded-2xl bg-[#131620] border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-pink-500 font-black border border-slate-700">
                        TT
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">TikTok Live</h3>
                        <p className="text-[11px] text-slate-400">
                          Penonton: <strong className="text-pink-400 font-mono">{tiktokViewers.toLocaleString()}</strong> • Tanpa login password
                        </p>
                      </div>
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                      tiktokConnected
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {tiktokConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-300">Username TikTok</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3.5 top-2.5 text-xs text-slate-400">@</span>
                        <input
                          type="text"
                          value={tiktokUser}
                          onChange={(e) => setTiktokUser(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleTikTokToggle()}
                          placeholder="username_tiktok"
                          className="w-full bg-[#0B0D14] border border-slate-800 rounded-xl py-2 pl-8 pr-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <button
                        onClick={handleTikTokToggle}
                        disabled={tkConnecting}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-60 ${
                          tiktokConnected
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                      >
                        {tkConnecting ? 'Proses...' : tiktokConnected ? 'Putuskan' : 'Hubungkan'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* YouTube Card */}
                <div className="p-5 rounded-2xl bg-[#131620] border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-rose-500 font-black border border-slate-700">
                        YT
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">YouTube Live</h3>
                        <p className="text-[11px] text-slate-400">
                          Penonton: <strong className="text-rose-400 font-mono">{youtubeViewers.toLocaleString()}</strong> • URL / Handle / ID
                        </p>
                      </div>
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                      youtubeConnected
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {youtubeConnected ? 'Connected' : 'Standby'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-300">YouTube Live URL</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={ytUrl}
                        onChange={(e) => setYtUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleYouTubeToggle()}
                        placeholder="https://youtube.com/live/... atau @handle"
                        className="flex-1 bg-[#0B0D14] border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={handleYouTubeToggle}
                        disabled={ytConnecting}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-60 ${
                          youtubeConnected
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-rose-600 hover:bg-rose-500 text-white'
                        }`}
                      >
                        {ytConnecting ? 'Proses...' : youtubeConnected ? 'Putuskan' : 'Hubungkan'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-950/25 border border-indigo-900/40 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                <div className="text-xs space-y-1">
                  <div className="font-semibold text-indigo-200">
                    {serverOnline ? 'Status WebSocket Lokal Siap (Port 3333)' : 'Menunggu Koneksi Backend Server...'}
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Semua overlay yang Anda salin dari tab <strong>Overlay Hub</strong> terhubung otomatis ke server lokal ini tanpa memerlukan internet tambahan untuk rendering OBS.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: 3. LIVE CHAT & DOCK */}
          {activeTab === 'chat' && (
            <div className="h-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-5">
              {/* Left Column: Live Feed */}
              <div className="flex-1 flex flex-col rounded-2xl bg-[#131620] border border-slate-800 overflow-hidden shadow-xl">
                <div className="p-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-[#0E111A]">
                  <div className="flex items-center gap-1.5">
                    {['all', 'gift', 'chat'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setChatFilter(tab)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          chatFilter === tab ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {tab === 'all' ? 'Semua Feed' : tab === 'gift' ? 'Gift & Donasi' : 'Chat Saja'}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={simulateIncomingChat}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold hover:bg-emerald-600/30 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Simulasi Chat Masuk</span>
                    </button>
                    <button
                      onClick={handleClearFeed}
                      className="p-1.5 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                      title="Bersihkan Chat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Pinned Spotlight Banner */}
                {pinnedMsg && (
                  <div className="px-4 py-2.5 bg-indigo-950/40 border-b border-indigo-800/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-[11px] font-bold text-amber-300 shrink-0">{pinnedMsg.user}:</span>
                      <span className="text-xs text-slate-200 truncate">{pinnedMsg.text}</span>
                    </div>
                    <button
                      onClick={handleUnpin}
                      className="text-[10px] text-slate-400 hover:text-white shrink-0 cursor-pointer"
                    >
                      Lepas Pin
                    </button>
                  </div>
                )}

                {/* Messages List */}
                <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
                  {chatMessages.filter((m) => chatFilter === 'all' || m.type === chatFilter).length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12 text-slate-500 text-xs">
                      <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
                      <p>Belum ada pesan masuk. Hubungkan TikTok/YouTube di Dual Engine atau klik "Simulasi Chat Masuk".</p>
                    </div>
                  ) : (
                    chatMessages
                      .filter((m) => chatFilter === 'all' || m.type === chatFilter)
                      .map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-xl border flex items-start justify-between gap-3 transition group ${
                            msg.type === 'gift'
                              ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                              : 'bg-[#0B0D14] border-slate-800/80 text-slate-200'
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase mt-0.5 shrink-0 ${
                                msg.platform === 'tiktok'
                                  ? 'bg-pink-600/30 text-pink-400 border border-pink-500/30'
                                  : msg.platform === 'youtube'
                                  ? 'bg-rose-600/30 text-rose-400 border border-rose-500/30'
                                  : 'bg-indigo-600/30 text-indigo-400'
                              }`}
                            >
                              {msg.platform === 'tiktok' ? 'TT' : msg.platform === 'youtube' ? 'YT' : 'HOST'}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">{msg.user}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{msg.time}</span>
                              </div>
                              <p className="text-xs mt-0.5 break-words">{msg.text}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => handlePinMessage(msg)}
                            title="Sematkan ke Spotlight OBS"
                            className="opacity-0 group-hover:opacity-100 px-2 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-[10px] text-slate-200 hover:text-white flex items-center gap-1 transition shrink-0 cursor-pointer"
                          >
                            <Pin className="w-3 h-3" />
                            <span>Pin</span>
                          </button>
                        </div>
                      ))
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-[#0E111A] flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Kirim pesan moderator..."
                    className="flex-1 bg-[#0B0D14] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim</span>
                  </button>
                </form>
              </div>

              {/* Right Column: Quick TTS & Dock Copy */}
              <div className="w-full lg:w-80 space-y-4 shrink-0">
                <div className="p-4 rounded-2xl bg-[#131620] border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-white">Voice Over TTS</span>
                    </div>
                    <button
                      onClick={() => setIsTTSActive(!isTTSActive)}
                      className={`w-9 h-5 rounded-full p-0.5 transition cursor-pointer ${isTTSActive ? 'bg-cyan-500' : 'bg-slate-800'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition transform ${isTTSActive ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="w-full bg-[#0B0D14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option>Gadis (Wanita Lembut)</option>
                    <option>Bima (Pria Berwibawa)</option>
                    <option>Robot Cyber AI</option>
                    <option>Anime Kawaii Voice</option>
                  </select>

                  <button
                    onClick={() => {
                      speakText('Halo streamer! Ini adalah contoh suara Text To Speech dari Vexora Stream.', true);
                      triggerSimulatedAlert('Uji Suara TTS', `Suara ${selectedVoice} aktif membacakan komentar penonton.`);
                    }}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold transition cursor-pointer"
                  >
                    Test Suara TTS
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-[#131620] border border-slate-800 space-y-2.5">
                  <div className="text-xs font-bold text-white">OBS Custom Browser Dock</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Pasang feed chat gabungan ini langsung ke dalam panel samping OBS Studio Anda:
                  </p>
                  <button
                    onClick={() => handleCopy(`${OBS_BASE_URL}/dock`, 'dock_copy')}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedId === 'dock_copy' ? 'Link Dock Tersalin!' : 'Salin URL Dock OBS'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: 4. MULTI GIFT & VIDEO RULES */}
          {activeTab === 'rules' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-white">Multi Gift & Video Reaction</h2>
                  <p className="text-xs text-slate-400">Putar video animasi WebM/GIF transparan & efek suara saat menerima gift tertentu.</p>
                </div>
                <button
                  onClick={() => setShowAddRuleForm(!showAddRuleForm)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showAddRuleForm ? 'Tutup Form' : 'Tambah Aturan Baru'}</span>
                </button>
              </div>

              {/* Form Tambah Aturan Baru */}
              {showAddRuleForm && (
                <form onSubmit={handleAddRule} className="p-5 rounded-2xl bg-[#131620] border border-indigo-500/40 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Nama Aturan</label>
                      <input
                        type="text"
                        required
                        value={newRule.name}
                        onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                        placeholder="Contoh: Galaxy Whale Reaction"
                        className="w-full bg-[#0B0D14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Pemicu Gift / SuperChat (* untuk semua)</label>
                      <input
                        type="text"
                        required
                        value={newRule.giftTrigger}
                        onChange={(e) => setNewRule({ ...newRule, giftTrigger: e.target.value })}
                        placeholder="Rose / Paus / superchat"
                        className="w-full bg-[#0B0D14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Minimal Koin</label>
                      <input
                        type="number"
                        min="1"
                        value={newRule.minCoins}
                        onChange={(e) => setNewRule({ ...newRule, minCoins: Number(e.target.value) || 1 })}
                        className="w-full bg-[#0B0D14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Efek Suara</label>
                      <select
                        value={newRule.soundEffect}
                        onChange={(e) => setNewRule({ ...newRule, soundEffect: e.target.value })}
                        className="w-full bg-[#0B0D14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="chime">chime.mp3 (Halus)</option>
                        <option value="fanfare">fanfare.mp3 (Sultan)</option>
                        <option value="siren">siren.mp3 (Alert)</option>
                        <option value="gift">gift.mp3 (Koin)</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] text-slate-400 mb-1">URL Media GIF/WebM</label>
                      <input
                        type="text"
                        value={newRule.mediaUrl}
                        onChange={(e) => setNewRule({ ...newRule, mediaUrl: e.target.value })}
                        placeholder="https://media.giphy.com/..."
                        className="w-full bg-[#0B0D14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Teks Alert / TTS ({'{user}'}, {'{count}'}, {'{gift}'})</label>
                    <input
                      type="text"
                      value={newRule.alertText}
                      onChange={(e) => setNewRule({ ...newRule, alertText: e.target.value })}
                      className="w-full bg-[#0B0D14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddRuleForm(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white cursor-pointer"
                    >
                      Simpan Aturan
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {giftRules.map((rule) => (
                  <div key={rule.id} className="p-5 rounded-2xl bg-[#131620] border border-slate-800 space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-white">{rule.name}</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {rule.trigger}
                        </span>
                      </div>

                      <div className="aspect-video rounded-xl bg-[#0B0D14] border border-slate-800 flex items-center justify-center overflow-hidden">
                        {rule.raw?.mediaUrl ? (
                          <img src={rule.raw.mediaUrl} alt={rule.name} className="w-full h-full object-contain" />
                        ) : (
                          <div className="text-center p-3 space-y-1">
                            <Film className="w-6 h-6 text-indigo-400 mx-auto" />
                            <div className="text-[11px] font-medium text-slate-300">{rule.file}</div>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 text-[11px] text-slate-300">
                          <Music className="w-3.5 h-3.5 text-pink-400" />
                          <span>SFX: <strong className="text-white">{rule.sfx}</strong></span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#0B0D14] border border-slate-800 text-[11px] text-slate-400 italic">
                          "{rule.tts}"
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                      <button
                        onClick={() => handleTestRule(rule)}
                        className="flex-1 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        Test Rule
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-2 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: 5. GOALS & LEADERBOARD */}
          {activeTab === 'goals' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="pb-3 border-b border-slate-800">
                <h2 className="text-lg font-bold text-white">Target Live Stream & Leaderboard</h2>
                <p className="text-xs text-slate-400">Target progres otomatis tersinkronisasi dengan widget Goal Bar di OBS.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-5 rounded-2xl bg-[#131620] border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <Gift className="w-4 h-4 text-amber-400" />
                      Target Koin (Gift Goal)
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {coinCurrent.toLocaleString()} / {coinGoal.toLocaleString()} ({Math.min(100, Math.round((coinCurrent / Math.max(1, coinGoal)) * 100))}%)
                    </span>
                  </div>

                  <div className="w-full bg-[#0B0D14] h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (coinCurrent / Math.max(1, coinGoal)) * 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="number"
                      value={coinGoal}
                      onChange={(e) => setCoinGoal(Number(e.target.value) || 100)}
                      className="flex-1 bg-[#0B0D14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                    <button
                      onClick={() => handleUpdateGoal('giftGoal', coinGoal)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                    >
                      Perbarui
                    </button>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#131620] border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <Heart className="w-4 h-4 text-pink-500 fill-pink-500/30" />
                      Target Likes (Like Goal)
                    </span>
                    <span className="text-xs font-mono font-bold text-pink-400">
                      {likeCurrent.toLocaleString()} / {likeGoal.toLocaleString()} ({Math.min(100, Math.round((likeCurrent / Math.max(1, likeGoal)) * 100))}%)
                    </span>
                  </div>

                  <div className="w-full bg-[#0B0D14] h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-pink-600 to-rose-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (likeCurrent / Math.max(1, likeGoal)) * 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="number"
                      value={likeGoal}
                      onChange={(e) => setLikeGoal(Number(e.target.value) || 1000)}
                      className="flex-1 bg-[#0B0D14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                    <button
                      onClick={() => handleUpdateGoal('likeGoal', likeGoal)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                    >
                      Perbarui
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Leaderboard Top Giffters & Top Likers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-5 rounded-2xl bg-[#131620] border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-400" />
                      Top 5 Sultan (Coins)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">REAL-TIME</span>
                  </div>
                  {(leaderboard.topGifters || []).length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">Belum ada donatur gift di sesi ini.</p>
                  ) : (
                    leaderboard.topGifters.map((g, idx) => (
                      <div key={g.username || idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B0D14] border border-slate-800/80 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${idx === 0 ? 'bg-amber-400 text-black' : 'bg-slate-800 text-slate-300'}`}>
                            #{idx + 1}
                          </span>
                          <span className="font-semibold text-white truncate">{g.nickname || g.username}</span>
                        </div>
                        <span className="font-mono font-bold text-amber-300 shrink-0">{Number(g.diamonds || 0).toLocaleString()} 🪙</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-5 rounded-2xl bg-[#131620] border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-400" />
                      Top 5 Pengetuk Layar (Likes)
                    </span>
                    <span className="text-[10px] font-mono text-pink-400">TAP-TAP</span>
                  </div>
                  {(leaderboard.topLikers || []).length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">Belum ada statistik like di sesi ini.</p>
                  ) : (
                    leaderboard.topLikers.map((l, idx) => (
                      <div key={l.username || idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B0D14] border border-slate-800/80 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${idx === 0 ? 'bg-pink-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
                            #{idx + 1}
                          </span>
                          <span className="font-semibold text-white truncate">{l.nickname || l.username}</span>
                        </div>
                        <span className="font-mono font-bold text-pink-300 shrink-0">{Number(l.likes || 0).toLocaleString()} ❤️</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: 6. CUSTOM COMMANDS & MODERASI */}
          {activeTab === 'moderation' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-white">Custom Commands & Moderasi</h2>
                  <p className="text-xs text-slate-400">Atur respon bot otomatis dan filter kata kasar sebelum tampil di OBS.</p>
                </div>
                <button
                  onClick={() => setShowAddCmdForm(!showAddCmdForm)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showAddCmdForm ? 'Tutup Form' : 'Tambah Command'}</span>
                </button>
              </div>

              {showAddCmdForm && (
                <form onSubmit={handleAddCommand} className="p-4 rounded-2xl bg-[#131620] border border-indigo-500/40 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Trigger (!perintah)</label>
                    <input
                      type="text"
                      required
                      value={newCmd.trigger}
                      onChange={(e) => setNewCmd({ ...newCmd, trigger: e.target.value })}
                      placeholder="!mabar"
                      className="w-full bg-[#0B0D14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Cooldown (Detik)</label>
                    <input
                      type="number"
                      min="1"
                      value={newCmd.cooldownSec}
                      onChange={(e) => setNewCmd({ ...newCmd, cooldownSec: Number(e.target.value) || 5 })}
                      className="w-full bg-[#0B0D14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Pesan Balasan Banner</label>
                    <input
                      type="text"
                      required
                      value={newCmd.response}
                      onChange={(e) => setNewCmd({ ...newCmd, response: e.target.value })}
                      placeholder="ID Mabar MLBB: 1234567"
                      className="w-full bg-[#0B0D14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    Simpan Command
                  </button>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {commands.map((c) => (
                  <div key={c.id} className="p-4 rounded-2xl bg-[#131620] border border-slate-800 space-y-2.5 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 font-mono text-xs font-bold">
                          {c.cmd}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">Cooldown: {c.cooldown}</span>
                          <button
                            onClick={() => handleDeleteCommand(c.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                            title="Hapus Command"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">"{c.reply}"</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-5 rounded-2xl bg-[#131620] border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Daftar Kata Diblokir (Auto-Censor ***)</h3>
                <textarea
                  value={bannedWordsText}
                  onChange={(e) => setBannedWordsText(e.target.value)}
                  rows={2}
                  className="w-full bg-[#0B0D14] border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <button
                  onClick={handleSaveModeration}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Simpan Filter Kata
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* =====================================================================
          4. MODAL KUSTOMISASI TEMA & LIVE PREVIEW INTERAKTIF
         ===================================================================== */}
      {activeCustomWidget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-6">
          <div className="w-full max-w-5xl h-[86vh] max-h-[720px] rounded-3xl bg-[#0F121B] border border-slate-800 shadow-[0_25px_70px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden">

            {/* Modal Top Header */}
            <div className="h-14 px-6 border-b border-slate-800/90 bg-[#131622] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-bold text-white">Kustomisasi Tema Overlay</span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs font-semibold text-indigo-400">{activeCustomWidget.name}</span>
              </div>

              <button
                onClick={() => setCustomizingWidgetId(null)}
                className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Split Body */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

              {/* PANEL KIRI: PILIHAN TEMA, PARAMETER & COPY URL */}
              <div className="w-full md:w-88 lg:w-96 border-r border-slate-800/90 bg-[#0E111A] p-5 flex flex-col justify-between overflow-y-auto shrink-0">
                <div className="space-y-5">

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white tracking-tight">Vexora {activeCustomWidget.name.split(' ')[0]} Theme</h3>
                      <p className="text-[11px] text-slate-400">Pilih gaya visual untuk OBS Browser Source</p>
                    </div>
                  </div>

                  {/* Theme Cards Selector */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">1. Pilih Gaya Tema</label>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {OVERLAY_THEMES.map((theme) => {
                        const isSelected = modalTheme === theme.id;
                        return (
                          <button
                            key={theme.id}
                            onClick={() => {
                              setModalTheme(theme.id);
                              setPreviewTriggerKey((prev) => prev + 1);
                            }}
                            className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-950/50 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.18)]'
                                : 'bg-[#141824] border-slate-800/90 hover:border-slate-700'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                                  {theme.name}
                                </span>
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                  {theme.badge}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">{theme.subtitle}</div>
                            </div>

                            <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                              isSelected ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-slate-700'
                            }`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Parameter Tambahan: Skala & Animasi */}
                  <div className="space-y-3 pt-2 border-t border-slate-800/80">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-300">Ukuran Skala Overlay</span>
                        <span className="font-mono font-bold text-indigo-400">{modalScale}%</span>
                      </div>
                      <input
                        type="range"
                        min="70"
                        max="140"
                        step="5"
                        value={modalScale}
                        onChange={(e) => setModalScale(Number(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Animasi Masuk</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {ANIMATION_PRESETS.map((anim) => (
                          <button
                            key={anim.id}
                            onClick={() => {
                              setModalAnimation(anim.id);
                              setPreviewTriggerKey((prev) => prev + 1);
                            }}
                            className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                              modalAnimation === anim.id
                                ? 'bg-indigo-600/25 border-indigo-500 text-indigo-200'
                                : 'bg-[#141824] border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {anim.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Dynamic URL & CTA Apply & Copy */}
                <div className="pt-4 mt-4 border-t border-slate-800 space-y-2.5">
                  <div className="p-2.5 rounded-xl bg-[#090B10] border border-slate-800/90">
                    <div className="text-[10px] text-slate-400 font-semibold mb-0.5">URL Browser Source OBS:</div>
                    <div className="text-[11px] font-mono text-cyan-400 truncate select-all">
                      {getDynamicObsUrl(activeCustomWidget)}
                    </div>
                  </div>

                  <button
                    onClick={handleApplyAndCopyModal}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                      modalCopied
                        ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25'
                        : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-indigo-600/30'
                    }`}
                  >
                    {modalCopied ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Tersalin! Siap Paste di OBS</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Apply & Copy Link OBS</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* PANEL KANAN: KANVAS LIVE PREVIEW INTERAKTIF */}
              <div
                className={`flex-1 relative flex flex-col justify-between overflow-hidden transition-colors duration-300 ${
                  previewBg === 'greenscreen'
                    ? 'bg-[#00B140]'
                    : previewBg === 'game'
                    ? 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900'
                    : 'bg-[#090B10]'
                }`}
                style={
                  previewBg === 'grid'
                    ? {
                        backgroundImage: 'radial-gradient(#262D40 1.2px, transparent 1.2px)',
                        backgroundSize: '22px 22px'
                      }
                    : undefined
                }
              >
                {/* Top Canvas Toolbar */}
                <div className="p-4 flex flex-wrap items-center justify-between gap-2 z-10">
                  <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10">
                    <button
                      onClick={() => setPreviewBg('grid')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                        previewBg === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Dark Grid
                    </button>
                    <button
                      onClick={() => setPreviewBg('game')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                        previewBg === 'game' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Game Scene
                    </button>
                    <button
                      onClick={() => setPreviewBg('greenscreen')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                        previewBg === 'greenscreen' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Green Screen
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAutoLoopPreview(!autoLoopPreview)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-md border text-xs font-semibold transition cursor-pointer ${
                        autoLoopPreview
                          ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                          : 'bg-black/70 border-white/15 text-slate-300 hover:text-white'
                      }`}
                    >
                      <Repeat
                        className={`w-3.5 h-3.5 ${autoLoopPreview ? 'animate-spin' : ''}`}
                        style={autoLoopPreview ? { animationDuration: '4s' } : undefined}
                      />
                      <span>{autoLoopPreview ? 'Auto-Loop: ON' : 'Auto-Loop: OFF'}</span>
                    </button>

                    <button
                      onClick={handleManualPreviewTrigger}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 backdrop-blur-md border border-indigo-400/40 text-xs font-semibold text-white shadow-lg transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Trigger Event Sekarang</span>
                    </button>
                  </div>
                </div>

                {/* Center Live Render Stage */}
                <div className="flex-1 flex items-center justify-center p-6 relative">
                  {previewBg === 'game' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                      <Monitor className="w-64 h-64 text-indigo-300" />
                    </div>
                  )}
                  {renderLiveWidgetPreview()}
                </div>

                {/* Bottom Canvas Info Footer */}
                <div className="px-5 py-3 bg-black/50 backdrop-blur-md border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Preview Rendering Engine • 60 FPS</span>
                  </div>
                  <div>
                    Recommended OBS Size: <strong className="text-slate-200 font-mono">{activeCustomWidget.recommendedRes}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== FLOATING OBS SIMULATION TOAST ===================== */}
      {activeAlertToast && (
        <div className="fixed bottom-6 right-6 z-50 transition-all duration-300">
          <div className="p-4 rounded-2xl bg-[#131622] border border-indigo-500/50 shadow-2xl shadow-indigo-500/20 flex items-center gap-3 max-w-sm">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">{activeAlertToast.title}</div>
              <div className="text-[11px] text-indigo-200 mt-0.5">{activeAlertToast.subtitle}</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
