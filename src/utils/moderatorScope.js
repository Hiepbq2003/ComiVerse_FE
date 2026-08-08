import { getAuth } from './Auth';

/**
 * Returns the array of normalized moderation languages assigned to the user.
 * Falls back to ['japanese', 'korean'] if no explicit scope is assigned to a moderator.
 */
export function getModeratorScope(user) {
  if (!user) {
    const auth = getAuth();
    user = auth?.user;
  }
  if (!user) return [];

  if (Array.isArray(user.assignedLanguages) && user.assignedLanguages.length > 0) {
    return user.assignedLanguages.map(l => String(l).toLowerCase().trim());
  }

  return [];
}

export function isScopeGlobal(scope, user) {
  if (user?.role?.toUpperCase() === 'ADMIN') return true;
  if (!scope || scope.length === 0) return false;
  if (scope.length >= 7) return true;
  return scope.some(s => {
    const lower = String(s).toLowerCase().trim();
    return ['global', 'all', 'any', '*'].includes(lower) || lower.includes('all language');
  });
}

/**
 * Checks whether a given comic or submission language falls within the moderator's assigned scope.
 * If moderator scope contains global/all/any/star, returns true.
 * If language is missing or unknown, returns false (unless scope is global/all).
 */
export function isLanguageInModeratorScope(langStr, user) {
  const scope = getModeratorScope(user);
  if (isScopeGlobal(scope, user)) {
    return true;
  }
  if (!langStr) return false;

  const n = String(langStr).toLowerCase().trim();
  if (!n || n === 'unknown' || n === 'original raw' || n === 'original author') return false;

  return scope.some(s => {
    if (!s) return false;
    if (n === s) return true;
    if (n.includes(s) || s.includes(n)) return true;

    // Standard language code and name equivalencies
    if ((s === 'japanese' || s === 'japan') && (n === 'ja' || n === 'jp' || n.includes('japan'))) return true;
    if ((s === 'korean' || s === 'korea') && (n === 'ko' || n === 'kr' || n.includes('korea'))) return true;
    if ((s === 'chinese' || s === 'china') && (n === 'zh' || n === 'cn' || n.includes('chin'))) return true;
    if ((s === 'english' || s === 'eng') && (n === 'en' || n === 'us' || n.includes('eng'))) return true;
    if ((s === 'vietnamese' || s === 'vietnam') && (n === 'vi' || n === 'vn' || n.includes('viet') || n === 'việt nam')) return true;
    return false;
  });
}
