import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.unmock('../../../services/api/BannedKeywordApi');

import {
  getBannedKeywordsApi,
  addBannedKeywordApi,
  deleteBannedKeywordApi,
  checkBannedContent
} from '../../../services/api/BannedKeywordApi';

describe('BannedKeywordApi Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default keywords including newly added keywords (scam_crypto, hate_comment)', async () => {
    const keywords = await getBannedKeywordsApi();
    expect(keywords).toBeDefined();
    expect(Array.isArray(keywords)).toBe(true);
    expect(keywords.length).toBeGreaterThanOrEqual(6);
    
    const words = keywords.map(k => k.word);
    expect(words).toContain('scam_crypto');
    expect(words).toContain('hate_comment');
  });

  it('correctly intercepts banned keywords using checkBannedContent', () => {
    const check1 = checkBannedContent('Check out this scam_crypto offer!');
    expect(check1.isBanned).toBe(true);
    expect(check1.matchedWord).toBe('scam_crypto');

    const check2 = checkBannedContent('Please stop making hate_comment in chat');
    expect(check2.isBanned).toBe(true);
    expect(check2.matchedWord).toBe('hate_comment');

    const checkClean = checkBannedContent('Hello everyone, nice comic today!');
    expect(checkClean.isBanned).toBe(false);
  });

  it('allows adding and removing banned keywords dynamically', async () => {
    const newKw = await addBannedKeywordApi({
      word: 'illegal_site_link',
      category: 'Spam / Scam',
      severity: 'CRITICAL'
    });

    expect(newKw).toBeDefined();
    expect(newKw.word).toBe('illegal_site_link');

    const checkNew = checkBannedContent('Visit illegal_site_link now');
    expect(checkNew.isBanned).toBe(true);

    await deleteBannedKeywordApi(newKw.id);
    const checkAfterDelete = checkBannedContent('Visit illegal_site_link now');
    expect(checkAfterDelete.isBanned).toBe(false);
  });
});
