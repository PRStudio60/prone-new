import { describe, expect, it } from 'vitest';
import { INITIAL_VIDEOS } from '../../data/initialVideos';
import {
  buildShareUrls,
  clampDurationSeconds,
  computeProgressRatio,
  computeTrendingRankings,
  extractTrendingHashtags,
  filterVideos,
  formatCompactCount,
  formatRemainingTimer,
  formatTimer,
  generateAiCaptionDraft,
  getActiveCaption,
  getDurationValidationError,
  groupVideosByCategory,
  isValidPrDuration,
  parseHashtags,
} from '../videoUtils';

describe('PROne 60-second timer & formatting utilities', () => {
  it('formats seconds into MM:SS with tabular zero-padding', () => {
    expect(formatTimer(60)).toBe('01:00');
    expect(formatTimer(59)).toBe('00:59');
    expect(formatTimer(5)).toBe('00:05');
    expect(formatTimer(0)).toBe('00:00');
    expect(formatTimer(-3)).toBe('00:00');
  });

  it('formats remaining countdown timer accurately', () => {
    expect(formatRemainingTimer(0, 60)).toBe('-01:00');
    expect(formatRemainingTimer(15.2, 60)).toBe('-00:45');
    expect(formatRemainingTimer(60, 60)).toBe('-00:00');
    expect(formatRemainingTimer(70, 60)).toBe('-00:00');
  });

  it('computes normalized progress ratio clamped between 0 and 1', () => {
    expect(computeProgressRatio(0, 60)).toBe(0);
    expect(computeProgressRatio(30, 60)).toBe(0.5);
    expect(computeProgressRatio(60, 60)).toBe(1);
    expect(computeProgressRatio(80, 60)).toBe(1);
    expect(computeProgressRatio(-5, 60)).toBe(0);
    expect(computeProgressRatio(10, 0)).toBe(0);
  });

  it('clamps PR video duration between 30 and 60 seconds', () => {
    expect(clampDurationSeconds(120)).toBe(60);
    expect(clampDurationSeconds(60)).toBe(60);
    expect(clampDurationSeconds(45.6)).toBe(46);
    expect(clampDurationSeconds(30)).toBe(30);
    expect(clampDurationSeconds(15)).toBe(30);
    expect(clampDurationSeconds(Number.NaN)).toBe(60);
  });

  it('validates 30-60 second PR duration bounds and returns inline error message when out of range', () => {
    expect(isValidPrDuration(30)).toBe(true);
    expect(isValidPrDuration(45)).toBe(true);
    expect(isValidPrDuration(60)).toBe(true);
    expect(isValidPrDuration(29)).toBe(false);
    expect(isValidPrDuration(61)).toBe(false);
    expect(isValidPrDuration(Number.NaN)).toBe(false);

    expect(getDurationValidationError(45)).toBeNull();
    expect(getDurationValidationError(29)).toBe('PR動画の尺は30秒以上60秒以内で設定してください');
    expect(getDurationValidationError(61)).toBe('PR動画の尺は30秒以上60秒以内で設定してください');
  });
});

describe('Hashtag parsing and count formatting', () => {
  it('normalizes Japanese and ASCII hashtags and removes duplicates', () => {
    expect(parseHashtags('地方創生 #地方創生 #選挙, 自治体DX')).toEqual([
      '#地方創生',
      '#選挙',
      '#自治体DX',
    ]);
  });

  it('limits parsed hashtags to 5 items', () => {
    expect(parseHashtags('a b c d e f g')).toHaveLength(5);
  });

  it('formats compact Japanese counts cleanly', () => {
    expect(formatCompactCount(840)).toBe('840');
    expect(formatCompactCount(12400)).toBe('1.2万');
    expect(formatCompactCount(105000)).toBe('11万');
  });
});

describe('Category & search filtering', () => {
  it('returns all initial videos when category is all and query is empty', () => {
    const result = filterVideos(INITIAL_VIDEOS, { category: 'all', query: '' });
    expect(result).toHaveLength(INITIAL_VIDEOS.length);
  });

  it('filters strictly by category', () => {
    const politics = filterVideos(INITIAL_VIDEOS, { category: 'politics', query: '' });
    expect(politics.length).toBeGreaterThan(0);
    expect(politics.every((v) => v.category === 'politics')).toBe(true);

    const school = filterVideos(INITIAL_VIDEOS, { category: 'school', query: '' });
    expect(school.length).toBeGreaterThan(0);
    expect(school.every((v) => v.category === 'school')).toBe(true);
  });

  it('filters by hashtag, title, and creator name', () => {
    const byHashtag = filterVideos(INITIAL_VIDEOS, { category: 'all', query: '#地方創生' });
    expect(byHashtag.some((v) => v.hashtags.includes('#地方創生'))).toBe(true);

    const byCreator = filterVideos(INITIAL_VIDEOS, { category: 'all', query: '文京区' });
    expect(byCreator.length).toBeGreaterThan(0);
  });

  it('filters saved/bookmarked videos and sorts by popularity', () => {
    const modified = INITIAL_VIDEOS.map((v, idx) => ({
      ...v,
      bookmarked: idx === 0,
    }));
    const saved = filterVideos(modified, {
      category: 'all',
      query: '',
      onlyBookmarked: true,
    });
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe(INITIAL_VIDEOS[0].id);

    const popular = filterVideos(INITIAL_VIDEOS, {
      category: 'all',
      query: '',
      sortBy: 'popular',
    });
    for (let i = 1; i < popular.length; i++) {
      expect(popular[i - 1].views).toBeGreaterThanOrEqual(popular[i].views);
    }
  });

  it('extracts trending hashtags and active playback captions', () => {
    const tags = extractTrendingHashtags(INITIAL_VIDEOS, 4);
    expect(tags.length).toBeLessThanOrEqual(4);
    expect(tags[0].tag.startsWith('#')).toBe(true);

    const sample = INITIAL_VIDEOS[0];
    expect(getActiveCaption(sample, 0)).toBe(sample.captions[0].text);
    expect(getActiveCaption(sample, 55)).toBe(sample.captions[sample.captions.length - 1].text);
  });
});

describe('AI caption generator, SNS share URLs, and trending rankings', () => {
  it('generates a 60-second summary and 4 timed captions from title and hashtags', () => {
    const draft = generateAiCaptionDraft({
      title: '渋谷区スタートアップ支援',
      category: 'business',
      hashtagsInput: '#スタートアップ #補助金',
      durationSec: 60,
    });

    expect(draft.summary).toContain('渋谷区スタートアップ支援');
    expect(draft.summary).toContain('60秒要約');
    expect(draft.captions).toHaveLength(4);
    expect(draft.captions[0].timeSec).toBe(0);
    expect(draft.captions[3].timeSec).toBeLessThan(60);
  });

  it('builds valid X, LINE, and Facebook share URLs with encoded video parameters', () => {
    const sample = INITIAL_VIDEOS[0];
    const urls = buildShareUrls(sample, 'https://prone.example.com/');

    expect(urls.shareUrl).toBe(`https://prone.example.com/?v=${encodeURIComponent(sample.id)}`);
    expect(urls.shareText).toContain(sample.title);
    expect(urls.shareText).toContain(urls.shareUrl);
    expect(urls.xUrl).toContain('https://twitter.com/intent/tweet?');
    expect(urls.xUrl).toContain(encodeURIComponent(sample.title));
    expect(urls.lineUrl).toContain('https://social-plugins.line.me/lineit/share?');
    expect(urls.lineUrl).toContain(encodeURIComponent(urls.shareUrl));
    expect(urls.facebookUrl).toContain('https://www.facebook.com/sharer/sharer.php?');
    expect(urls.facebookUrl).toContain(encodeURIComponent(urls.shareUrl));
  });

  it('groups saved videos cleanly by category without empty groups', () => {
    const savedSubset = [INITIAL_VIDEOS[0], INITIAL_VIDEOS[3]];
    const groups = groupVideosByCategory(savedSubset);

    expect(groups).toHaveLength(2);
    expect(groups[0].category.id).toBe('politics');
    expect(groups[0].videos).toHaveLength(1);
    expect(groups[1].category.id).toBe('personal');
    expect(groups[1].videos).toHaveLength(1);
  });

  it('computes ordered weekly and all-time trending rankings', () => {
    const weekly = computeTrendingRankings(INITIAL_VIDEOS, 'weekly', 3);
    expect(weekly).toHaveLength(3);
    expect(weekly[0].rank).toBe(1);
    expect(weekly[0].trendScore).toBeGreaterThanOrEqual(weekly[1].trendScore);
    expect(weekly[1].trendScore).toBeGreaterThanOrEqual(weekly[2].trendScore);
    expect(weekly[0].growthLabel).toContain('週間 +');

    const alltime = computeTrendingRankings(INITIAL_VIDEOS, 'alltime', 5);
    expect(alltime).toHaveLength(5);
    expect(alltime[0].growthLabel).toContain('好評価率');
  });

  it('marks all 5 initial platform videos explicitly as sample demo videos within 30-60s', () => {
    expect(INITIAL_VIDEOS).toHaveLength(5);
    expect(INITIAL_VIDEOS.every((v) => v.isSample === true)).toBe(true);
    expect(INITIAL_VIDEOS.every((v) => isValidPrDuration(v.durationSec))).toBe(true);
  });
});
