/**
 * Vexora Stream - Event Normalizer
 * Menstandarisasi event dari TikTok LIVE dan YouTube Live ke dalam Unified Schema.
 */

let eventCounter = 0;

function generateEventId(platform, type) {
  eventCounter = (eventCounter + 1) % 1000000;
  return `vex_${platform}_${type}_${Date.now()}_${eventCounter}`;
}

/**
 * Ekstraksi info user TikTok dari raw payload (kompatibel legacy & modern protobuf v3)
 */
function parseTikTokUser(rawData) {
  const u = rawData.user || {};
  const id = u.id || u.idStr || rawData.userId || rawData.uniqueId || 'anon_tt';
  const username = u.displayId || rawData.uniqueId || u.nickname || 'anonim';
  const nickname = u.nickname || rawData.nickname || u.displayId || rawData.uniqueId || 'Penonton TikTok';

  let avatar = rawData.profilePictureUrl || '';
  if (!avatar && u.avatarThumb?.urlList?.length) {
    avatar = u.avatarThumb.urlList[0];
  } else if (!avatar && u.avatarLarge?.urlList?.length) {
    avatar = u.avatarLarge.urlList[0];
  }
  if (!avatar) {
    avatar = 'https://p16-sign-va.tiktokcdn.com/tos-maliva-avt-0068/default.jpeg';
  }

  const badges = parseTikTokBadges(rawData, u);
  return { id, username, nickname, avatar, badges };
}

/**
 * Parse Badges pengguna TikTok
 */
function parseTikTokBadges(rawData, userObj = {}) {
  const u = rawData.user || userObj || {};
  const badges = [];

  const isMod = rawData.isModerator || u.userAttr?.isAdmin || u.userAttr?.isSuperAdmin;
  if (isMod) badges.push('moderator');

  const isSub = rawData.isSubscriber || u.isSubscribe;
  if (isSub) badges.push('subscriber');

  if (rawData.topGifterRank) badges.push(`top_${rawData.topGifterRank}`);

  if (Array.isArray(rawData.userBadges)) {
    rawData.userBadges.forEach((b) => {
      if (b.type && !badges.includes(b.type)) badges.push(b.type);
    });
  }

  if (Array.isArray(u.badgeList)) {
    u.badgeList.forEach((b) => {
      if (b.sceneType === 8 && !badges.includes('gifter')) badges.push('gifter');
      if (b.sceneType === 10 && !badges.includes('fan')) badges.push('fan');
    });
  }

  return badges;
}

/**
 * Normalisasi event dari TikTok Live Connector
 */
function normalizeTikTokEvent(type, rawData) {
  if (!rawData) return null;
  const timestamp = Date.now();

  switch (type) {
    case 'chat': {
      const user = parseTikTokUser(rawData);
      const text = rawData.content || rawData.comment || '';
      return {
        id: generateEventId('tiktok', 'chat'),
        platform: 'tiktok',
        type: 'chat',
        user,
        content: {
          text,
          emotes: rawData.emotes || []
        },
        timestamp
      };
    }

    case 'member': {
      const user = parseTikTokUser(rawData);
      return {
        id: generateEventId('tiktok', 'member'),
        platform: 'tiktok',
        type: 'member',
        user,
        content: {
          text: '👋 Bergabung ke siaran Live!'
        },
        timestamp
      };
    }

    case 'gift': {
      const user = parseTikTokUser(rawData);
      if (!user.badges.includes('gifter')) {
        user.badges.unshift('gifter');
      }

      const giftInfo = rawData.gift || rawData.giftDetails || {};
      const giftName = giftInfo.name || rawData.giftName || rawData.describe || 'Gift';
      const repeatCount = Number(rawData.repeatCount || giftInfo.repeat_count || 1);
      const diamondCount = Number(giftInfo.diamondCount || rawData.diamondCount || 1);
      const totalDiamonds = diamondCount * repeatCount;
      const giftId = rawData.giftId || giftInfo.id || giftInfo.gift_id;

      let giftPictureUrl = rawData.giftPictureUrl || '';
      if (!giftPictureUrl && giftInfo.image?.urlList?.length) {
        giftPictureUrl = giftInfo.image.urlList[0];
      } else if (!giftPictureUrl && giftInfo.giftImage?.urlList?.length) {
        giftPictureUrl = giftInfo.giftImage.urlList[0];
      }

      return {
        id: generateEventId('tiktok', 'gift'),
        platform: 'tiktok',
        type: 'gift',
        user,
        content: {
          text: `Mengirim ${repeatCount}x ${giftName}`,
          gift: {
            name: giftName,
            id: giftId,
            count: repeatCount,
            diamonds: totalDiamonds,
            icon: giftPictureUrl,
            repeatEnd: Boolean(rawData.repeatEnd)
          }
        },
        timestamp
      };
    }

    case 'like': {
      const user = parseTikTokUser(rawData);
      const likeCount = Number(rawData.count || rawData.likeCount || 1);
      const totalLikes = Number(rawData.total || rawData.totalLikeCount || 0);

      return {
        id: generateEventId('tiktok', 'like'),
        platform: 'tiktok',
        type: 'like',
        user,
        content: {
          likeCount,
          totalLikes,
          text: `Memberikan ${likeCount} Like`
        },
        timestamp
      };
    }

/**
 * Deteksi apakah event TikTok merupakan aksi Share (membagikan live)
 */
function isTikTokShareEvent(type, rawData) {
  if (type === 'share') return true;
  if (type === 'follow') return false;
  if (!rawData) return false;

  // 1. Cek displayType secara eksplisit
  const displayType = String(rawData.displayType || '').toLowerCase();
  if (displayType === 'share' || displayType.includes('share') || displayType.includes('membagikan')) {
    return true;
  }
  if (displayType === 'follow' || displayType.includes('follow') || displayType.includes('mengikuti')) {
    return false;
  }

  // 2. Cek action numeric/string TikTok Protobuf (action 3 = share, action 1 = follow)
  const actionNum = Number(rawData.action);
  if (actionNum === 3) return true;
  if (actionNum === 1) return false;

  // 3. Cek properti share spesifik TikTok WebcastSocialMessage
  if (rawData.shareType !== undefined && rawData.shareType !== null && rawData.shareType !== '' && rawData.shareType !== 0) {
    return true;
  }
  if (rawData.shareTarget !== undefined && rawData.shareTarget !== null && rawData.shareTarget !== '') {
    return true;
  }
  if (Number(rawData.shareCount) > 0) {
    return true;
  }
  if (rawData.shareDisplayStyle) {
    return true;
  }

  // 4. Cek displayText key & defaultPattern
  const displayText = rawData.common?.displayText || rawData.displayText || {};
  const displayKey = String(displayText.key || '').toLowerCase();
  if (displayKey.includes('share') || displayKey.includes('membagikan')) {
    return true;
  }
  if (displayKey.includes('follow') || displayKey.includes('mengikuti')) {
    return false;
  }

  const defaultPattern = String(displayText.defaultPattern || '').toLowerCase();
  if (defaultPattern.includes('share') || defaultPattern.includes('membagikan')) {
    return true;
  }
  if (defaultPattern.includes('follow') || defaultPattern.includes('mengikuti')) {
    return false;
  }

  // 5. Cek label fallback
  const label = String(rawData.label || '').toLowerCase();
  if (label.includes('share') || label.includes('membagikan')) {
    return true;
  }
  if (label.includes('follow') || label.includes('mengikuti')) {
    return false;
  }

  return false;
}

    case 'share':
    case 'follow':
    case 'social': {
      const user = parseTikTokUser(rawData);
      const isShare = isTikTokShareEvent(type, rawData);
      const eventType = isShare ? 'share' : 'follow';
      const userDisplayName = user.nickname || user.username || 'Penonton';

      return {
        id: generateEventId('tiktok', eventType),
        platform: 'tiktok',
        type: eventType,
        user,
        content: {
          text: isShare ? `${userDisplayName} membagikan live` : `${userDisplayName} mulai mengikuti`
        },
        timestamp
      };
    }

    default:
      return null;
  }
}

/**
 * Normalisasi event dari YouTube Live Chat
 */
function normalizeYouTubeEvent(type, rawData) {
  if (!rawData) return null;
  const timestamp = Date.now();

  switch (type) {
    case 'chat': {
      // Cek apakah chat merupakan Super Chat atau Super Sticker
      const isSuperChat = Boolean(rawData.superchat);
      const isMembership = Boolean(rawData.isMembership || rawData.membership);
      const eventType = isSuperChat ? 'superchat' : isMembership ? 'membership' : 'chat';

      // Ekstraksi pesan teks
      let messageText = '';
      if (Array.isArray(rawData.message)) {
        messageText = rawData.message.map((part) => (typeof part === 'string' ? part : part.text || part.altText || '')).join('');
      } else if (typeof rawData.message === 'string') {
        messageText = rawData.message;
      }

      // Ambil avatar terbaik
      let avatarUrl = '';
      if (Array.isArray(rawData.author?.thumbnail?.thumbnails) && rawData.author.thumbnail.thumbnails.length > 0) {
        avatarUrl = rawData.author.thumbnail.thumbnails[rawData.author.thumbnail.thumbnails.length - 1].url;
      } else if (rawData.author?.thumbnailUrl) {
        avatarUrl = rawData.author.thumbnailUrl;
      }

      // Badge YouTube
      const badges = [];
      if (rawData.author?.isOwner) badges.push('owner');
      if (rawData.author?.isModerator) badges.push('moderator');
      if (rawData.author?.isVerified) badges.push('verified');
      if (isMembership || rawData.author?.isMembership) badges.push('member');
      if (isSuperChat) badges.push('superchat');

      const normalized = {
        id: generateEventId('youtube', eventType),
        platform: 'youtube',
        type: eventType,
        user: {
          id: rawData.author?.channelId || rawData.id || 'anon_yt',
          username: rawData.author?.name || 'YouTube User',
          nickname: rawData.author?.name || 'YouTube User',
          avatar: avatarUrl || 'https://www.gstatic.com/youtube/img/branding/favicon/favicon_144x144.png',
          badges
        },
        content: {
          text: messageText || (isSuperChat ? 'Mengirim Super Chat!' : '')
        },
        timestamp
      };

      if (isSuperChat && rawData.superchat) {
        normalized.content.superchat = {
          amount: rawData.superchat.amount || '$0',
          currency: rawData.superchat.currency || 'USD',
          tierColor: rawData.superchat.color || '#1e88e5'
        };
      }

      return normalized;
    }

    default:
      return null;
  }
}

module.exports = {
  normalizeTikTokEvent,
  normalizeYouTubeEvent,
  generateEventId,
  parseTikTokUser,
  parseTikTokBadges
};
