import AxiosClient from './AxiosClient';

const BANNED_KEYWORDS_STORAGE_KEY = 'comiverse_banned_keywords';

const defaultKeywords = [
  { id: 'kw-1', word: 'toxic_word_1', category: 'Profanity', severity: 'HIGH', addedAt: '2026-07-01' },
  { id: 'kw-2', word: 'spam_link', category: 'Spam / Scam', severity: 'CRITICAL', addedAt: '2026-07-05' },
  { id: 'kw-3', word: 'hate_speech', category: 'Policy Violation', severity: 'CRITICAL', addedAt: '2026-07-10' },
  { id: 'kw-4', word: 'gambling_site', category: 'Adverts', severity: 'MEDIUM', addedAt: '2026-07-15' }
];

const loadLocalKeywords = () => {
  try {
    const stored = localStorage.getItem(BANNED_KEYWORDS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    // Fallback to default
  }
  return [...defaultKeywords];
};

const saveLocalKeywords = (keywords) => {
  try {
    localStorage.setItem(BANNED_KEYWORDS_STORAGE_KEY, JSON.stringify(keywords));
  } catch (e) {
    // Fallback
  }
};

let localKeywords = loadLocalKeywords();

// Flag to indicate if backend has implemented /chat/banned-keywords endpoint
const HAS_BACKEND_ENDPOINT = false;

/**
 * Helper: Converts Vietnamese Telex IME outputs back to original English keystrokes
 * e.g., "sẽ" (typed s-e-x in Telex) -> "sex"
 *       "sẽx" -> "sexx"
 *       "phim sẽ" -> "phim sex"
 */
const convertTelexToAscii = (str) => {
  if (!str) return '';
  return str
    .replace(/ẽ/g, 'ex').replace(/Ẽ/g, 'EX')
    .replace(/ã/g, 'ax').replace(/Ã/g, 'AX')
    .replace(/õ/g, 'ox').replace(/Õ/g, 'OX')
    .replace(/ũ/g, 'ux').replace(/Ũ/g, 'UX')
    .replace(/ĩ/g, 'ix').replace(/Ĩ/g, 'IX')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D');
};

/**
 * Helper: Removes Vietnamese accents & normalizes diacritics
 */
const normalizeText = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase();
};

/**
 * Helper: Converts Leetspeak & Homoglyphs to standard ASCII
 * e.g., 's3x' -> 'sex', 's$x' -> 'sex', 's@x' -> 'sax'
 */
const convertLeetspeak = (str) => {
  if (!str) return '';
  return str
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/5/g, 's')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/!/g, 'i')
    .replace(/7/g, 't');
};

/**
 * Advanced Multi-Pass Client-Side Pre-filter Engine:
 * Intercepts exact matches, Telex IME reverse keystrokes ("sẽ" -> "sex"), leetspeak, 
 * Vietnamese diacritics bypass, and space/punctuation insertion!
 */
export const checkBannedContent = (content) => {
  if (!content || typeof content !== 'string') {
    return { isBanned: false, matchedWord: null };
  }
  
  const rawClean = content.trim().toLowerCase();
  if (!rawClean) return { isBanned: false, matchedWord: null };

  const telexContent = convertTelexToAscii(rawClean).toLowerCase();
  const normContent = normalizeText(rawClean);
  const leetContent = convertLeetspeak(normalizeText(telexContent));
  // Stripped version (removes dots, spaces, dashes inserted to evade filter: "s.e.x" -> "sex")
  const strippedContent = leetContent.replace(/[\s._\-*#@$%^&+=/\\()~|]+/g, '');

  const keywords = loadLocalKeywords();

  for (const item of keywords) {
    if (!item || !item.word) continue;
    
    const origWord = item.word.trim();
    const wordLower = origWord.toLowerCase();
    const wordNorm = normalizeText(wordLower);
    const wordStripped = wordNorm.replace(/[\s._\-*#@$%^&+=/\\()~|]+/g, '');

    if (!wordLower) continue;

    // PASS 1: Exact Match or Substring / Word Boundary on Raw Text
    const escaped = wordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|\\b|_)${escaped}(?:$|\\b|_)`, 'i');

    if (regex.test(rawClean) || rawClean.includes(wordLower)) {
      return {
        isBanned: true,
        matchedWord: item.word,
        category: item.category || 'Profanity',
        severity: item.severity || 'HIGH',
        reason: 'Exact Match'
      };
    }

    // PASS 2: Telex IME Reverse Keystroke Match (e.g. "sẽ" typed via Telex s-e-x -> "sex")
    if (telexContent.includes(wordLower) || telexContent.includes(wordNorm)) {
      return {
        isBanned: true,
        matchedWord: item.word,
        category: item.category || 'Profanity',
        severity: item.severity || 'HIGH',
        reason: 'Telex Keystroke Bypass Intercepted'
      };
    }

    // PASS 3: Diacritics & Accent Normalization Match (e.g., "sẽx" -> "sex")
    const escapedNorm = wordNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexNorm = new RegExp(`(?:^|\\b|_)${escapedNorm}(?:$|\\b|_)`, 'i');

    if (regexNorm.test(normContent) || normContent.includes(wordNorm)) {
      return {
        isBanned: true,
        matchedWord: item.word,
        category: item.category || 'Profanity',
        severity: item.severity || 'HIGH',
        reason: 'Diacritics Bypass Intercepted'
      };
    }

    // PASS 4: Leetspeak & Punctuation Insertion Bypass Match (e.g., "s.e.x", "s 3 x", "s_e_x")
    if (wordStripped.length >= 2 && strippedContent.includes(wordStripped)) {
      return {
        isBanned: true,
        matchedWord: item.word,
        category: item.category || 'Profanity',
        severity: item.severity || 'HIGH',
        reason: 'Leetspeak / Punctuation Bypass Intercepted'
      };
    }
  }

  return { isBanned: false, matchedWord: null };
};

/**
 * Get all active banned keywords for moderator dictionary.
 * Serves from local dictionary instantly to prevent 500 network errors until backend endpoint is deployed.
 */
export const getBannedKeywordsApi = async () => {
  if (HAS_BACKEND_ENDPOINT) {
    try {
      const res = await AxiosClient.get('/chat/banned-keywords');
      if (res?.data?.data && Array.isArray(res.data.data)) {
        return res.data.data;
      }
      if (res?.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (err) {
      // Fallback
    }
  }
  return [...localKeywords];
};

/**
 * Add a new banned keyword to the dictionary.
 */
export const addBannedKeywordApi = async (data) => {
  if (HAS_BACKEND_ENDPOINT) {
    try {
      const res = await AxiosClient.post('/chat/banned-keywords', data);
      if (res?.data?.data) {
        return res.data.data;
      }
    } catch (err) {
      // Fallback
    }
  }

  const newKw = {
    id: `kw-${Date.now()}`,
    word: data.word.trim().toLowerCase(),
    category: data.category || 'General',
    severity: data.severity || 'HIGH',
    addedAt: new Date().toISOString().split('T')[0]
  };
  localKeywords.unshift(newKw);
  saveLocalKeywords(localKeywords);
  return newKw;
};

/**
 * Remove a banned keyword by ID.
 */
export const deleteBannedKeywordApi = async (id) => {
  if (HAS_BACKEND_ENDPOINT) {
    try {
      await AxiosClient.delete(`/chat/banned-keywords/${id}`);
    } catch (err) {
      // Fallback
    }
  }

  localKeywords = localKeywords.filter(k => k.id !== id);
  saveLocalKeywords(localKeywords);
  return { success: true, id };
};
