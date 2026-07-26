import stompService from '../services/websocket/StompService';

export const getAuth = () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (token && token !== 'undefined' && token !== 'null') {
    try {
      if (user && user !== 'undefined' && user !== 'null') {
        return {
          token,
          user: JSON.parse(user)
        };
      }
    } catch (e) {
      console.error("Failed to parse user from localStorage", e);
    }
    return { token, user: null };
  }
  return null;
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('refreshToken');
  try {
    stompService.disconnect();
  } catch (e) {
    console.warn("Failed to disconnect WebSocket on logout:", e);
  }
};

export const setAuth = (token, user, refreshToken) => {
  if (!token || token === 'undefined' || token === 'null') {
    clearAuth();
    return;
  }
  localStorage.setItem('token', token);
  if (user && user !== 'undefined' && user !== 'null') {
    localStorage.setItem('user', typeof user === 'string' ? user : JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  } else {
    localStorage.removeItem('refreshToken');
  }
};

/**
 * Dispatch real-time system notification to target user bell icon dropdown
 */
export const pushUserNotification = (targetIdOrName, notifData) => {
  if (!targetIdOrName) return;

  const notifObj = {
    id: notifData.id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    title: notifData.title || 'System Notification',
    message: notifData.message || '',
    type: notifData.type || 'SYSTEM',
    targetUserId: String(targetIdOrName),
    isRead: false,
    createdAt: notifData.createdAt || new Date().toISOString()
  };

  const userKey = `comiverse_user_notifications_${targetIdOrName}`;
  try {
    const raw = localStorage.getItem(userKey);
    const existing = raw ? JSON.parse(raw) : [];
    const updated = [notifObj, ...existing].slice(0, 50);
    localStorage.setItem(userKey, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to persist user notification:', e);
  }

  try {
    window.dispatchEvent(new CustomEvent('notification:refresh'));
  } catch (e) {}
};

/**
 * Set user chat restriction (MUTE or BAN)
 */
export const setUserChatRestriction = (targetIdOrName, restriction) => {
  if (!targetIdOrName) return;
  const key = `comiverse_chat_restriction_${targetIdOrName}`;
  try {
    if (!restriction) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(restriction));
    }
  } catch (e) {
    console.warn('Failed to set chat restriction:', e);
  }
};

/**
 * Graduated Warning Penalty Policy:
 * Strike 1 -> 1 Hour MUTE
 * Strike 2 -> 5 Days MUTE (120 Hours)
 * Strike 3+ -> Permanent BAN
 */
export const issueUserWarningStrike = (targetIdOrName, reason = '') => {
  if (!targetIdOrName) return { strikeCount: 0, penaltyType: null };

  const warnKey = `comiverse_user_warnings_${targetIdOrName}`;
  let currentCount = 0;
  try {
    const raw = localStorage.getItem(warnKey);
    currentCount = raw ? parseInt(raw, 10) : 0;
  } catch (e) {}

  const nextCount = currentCount + 1;
  try {
    localStorage.setItem(warnKey, String(nextCount));
  } catch (e) {}

  let penaltyType = 'MUTE';
  let durationMs = 0;
  let notifTitle = '';
  let notifMessage = '';

  if (nextCount === 1) {
    // 1 warn -> 1 Hour MUTE
    durationMs = 1 * 3600 * 1000;
    const until = new Date(Date.now() + durationMs).toISOString();
    const restriction = { type: 'MUTE', reason: reason || '1st Warning Strike Penalty (1 Hour Chat Mute)', until, strikeCount: 1 };
    setUserChatRestriction(targetIdOrName, restriction);

    notifTitle = '⚠️ 1st Warning Strike — Muted for 1 Hour';
    notifMessage = `You received your 1st warning strike from a Moderator for chat violation. Your chat access is muted for 1 hour.`;
  } else if (nextCount === 2) {
    // 2 warns -> 5 Days MUTE (120 Hours)
    durationMs = 5 * 24 * 3600 * 1000;
    const until = new Date(Date.now() + durationMs).toISOString();
    const restriction = { type: 'MUTE', reason: reason || '2nd Warning Strike Penalty (5 Days Chat Mute)', until, strikeCount: 2 };
    setUserChatRestriction(targetIdOrName, restriction);

    notifTitle = '⚠️⚠️ 2nd Warning Strike — Muted for 5 Days';
    notifMessage = `You received your 2nd warning strike from a Moderator. Your chat access is muted for 5 days. Next strike will result in a permanent ban.`;
  } else {
    // 3+ warns -> Permanent BAN
    penaltyType = 'BAN';
    const restriction = { type: 'BAN', reason: reason || '3rd Warning Strike Penalty (Permanent Chat Ban)', strikeCount: nextCount };
    setUserChatRestriction(targetIdOrName, restriction);

    notifTitle = '🚫 3rd Warning Strike — Permanent Chat Ban';
    notifMessage = `You received your 3rd warning strike from a Moderator. Your chat privileges have been permanently banned.`;
  }

  pushUserNotification(targetIdOrName, {
    title: notifTitle,
    message: notifMessage,
    type: 'SYSTEM'
  });

  return {
    strikeCount: nextCount,
    penaltyType,
    durationLabel: nextCount === 1 ? '1 hour' : (nextCount === 2 ? '5 days' : 'Permanent Ban')
  };
};

/**
 * Get current warning strike count for target user
 */
export const getUserWarningCount = (targetIdOrName) => {
  if (!targetIdOrName) return 0;
  try {
    const raw = localStorage.getItem(`comiverse_user_warnings_${targetIdOrName}`);
    return raw ? parseInt(raw, 10) : 0;
  } catch (e) {
    return 0;
  }
};

/**
 * Check if current logged-in user is muted or banned from chat
 */
export const getUserChatRestriction = (userObj) => {
  if (!userObj) return null;
  const targetKeys = [
    userObj.id,
    userObj.userId,
    userObj.username,
    userObj.fullName
  ].filter(Boolean);

  for (const k of targetKeys) {
    try {
      const raw = localStorage.getItem(`comiverse_chat_restriction_${k}`);
      if (raw) {
        const res = JSON.parse(raw);
        if (res.type === 'BAN') {
          return { isRestricted: true, type: 'BAN', reason: res.reason || 'Banned by Moderator' };
        }
        if (res.type === 'MUTE') {
          const untilDate = new Date(res.until);
          if (untilDate > new Date()) {
            return { isRestricted: true, type: 'MUTE', reason: res.reason || 'Muted by Moderator', until: res.until };
          }
        }
      }
    } catch (e) {}
  }
  return null;
};
