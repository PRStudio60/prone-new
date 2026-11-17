import {
  CategoryId,
  CategoryMeta,
  PRVideo,
  RankedVideoItem,
  SortMode,
  TrendingPeriod,
  VideoCaption,
  VideoCategoryId,
} from '../types/video';

export const MAX_PR_DURATION_SEC = 60;
export const MIN_PR_DURATION_SEC = 30;
export const DURATION_RANGE_ERROR = 'PR動画の尺は30秒以上60秒以内で設定してください';

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'all',
    emoji: '',
    label: 'すべて',
    shortLabel: 'すべて',
    description: 'すべてのジャンルの60秒PR動画',
  },
  {
    id: 'politics',
    emoji: '🏛️',
    label: '🏛️ 政治・行政',
    shortLabel: '政治・行政',
    description: '政策ビジョン、自治体DX、議会・選挙の1分要約',
  },
  {
    id: 'local',
    emoji: '🌍',
    label: '🌍 地域・ローカル',
    shortLabel: '地域・ローカル',
    description: '地方創生、商店街、移住定住、観光スポット紹介',
  },
  {
    id: 'school',
    emoji: '🎒',
    label: '🎒 スクール・部活',
    shortLabel: 'スクール・部活',
    description: '部活動PR、学園祭、研究発表、探究学習の記録',
  },
  {
    id: 'personal',
    emoji: '👤',
    label: '👤 個人',
    shortLabel: '個人',
    description: 'ポートフォリオ、創作物、1分間セルフピッチ',
  },
  {
    id: 'business',
    emoji: '🏢',
    label: '🏢 ビジネス',
    shortLabel: 'ビジネス',
    description: 'SaaSデモ、新製品ローンチ、採用ブランディング',
  },
];

export function getCategoryMeta(id: CategoryId): CategoryMeta {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

export function isValidPrDuration(seconds: number): boolean {
  return (
    Number.isFinite(seconds) &&
    seconds >= MIN_PR_DURATION_SEC &&
    seconds <= MAX_PR_DURATION_SEC
  );
}

export function getDurationValidationError(seconds: number): string | null {
  return isValidPrDuration(seconds) ? null : DURATION_RANGE_ERROR;
}

export function clampDurationSeconds(seconds: number): number {
  if (!Number.isFinite(seconds)) {
    return MAX_PR_DURATION_SEC;
  }
  const rounded = Math.round(seconds);
  return Math.min(MAX_PR_DURATION_SEC, Math.max(MIN_PR_DURATION_SEC, rounded));
}

export function formatTimer(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatRemainingTimer(elapsedSec: number, durationSec: number): string {
  const remaining = Math.max(0, Math.ceil(durationSec - elapsedSec));
  return `-${formatTimer(remaining)}`;
}

export function computeProgressRatio(elapsedSec: number, durationSec: number): number {
  if (durationSec <= 0) return 0;
  return Math.min(1, Math.max(0, elapsedSec / durationSec));
}

export function parseHashtags(input: string): string[] {
  const tokens = input
    .split(/[\s,、]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const unique: string[] = [];
  for (const token of tokens) {
    const normalized = token.startsWith('#') ? token : `#${token}`;
    if (normalized.length > 1 && !unique.includes(normalized)) {
      unique.push(normalized);
    }
    if (unique.length >= 5) break;
  }
  return unique;
}

export function formatCompactCount(value: number): string {
  if (value >= 10000) {
    const man = value / 10000;
    return `${man.toFixed(man >= 10 ? 0 : 1)}万`;
  }
  return value.toLocaleString('ja-JP');
}

export interface FilterVideosOptions {
  category: CategoryId;
  query: string;
  onlyBookmarked?: boolean;
  sortBy?: SortMode;
}

export function filterVideos(
  videos: PRVideo[],
  { category, query, onlyBookmarked = false, sortBy = 'latest' }: FilterVideosOptions
): PRVideo[] {
  const normalizedQuery = query.trim().toLowerCase();

  const filtered = videos.filter((video) => {
    if (category !== 'all' && video.category !== category) {
      return false;
    }
    if (onlyBookmarked && !video.bookmarked) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      video.title,
      video.summary,
      video.creatorName,
      video.creatorRole,
      video.creatorHandle,
      ...video.hashtags,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });

  return [...filtered].sort((a, b) => {
    if (sortBy === 'popular') {
      return b.views - a.views;
    }
    return b.createdAtTs - a.createdAtTs;
  });
}

export function extractTrendingHashtags(videos: PRVideo[], limit = 8): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const video of videos) {
    for (const tag of video.hashtags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function getActiveCaption(video: PRVideo, elapsedSec: number): string {
  if (!video.captions.length) return video.summary;
  let current = video.captions[0].text;
  for (const cap of video.captions) {
    if (elapsedSec >= cap.timeSec) {
      current = cap.text;
    } else {
      break;
    }
  }
  return current;
}

export function isValidCategory(category: string): category is VideoCategoryId {
  return ['politics', 'local', 'school', 'personal', 'business'].includes(category);
}

export interface AICaptionDraft {
  summary: string;
  captions: VideoCaption[];
  suggestedHashtags: string;
}

const CATEGORY_HOOKS: Record<VideoCategoryId, { hook: string; cta: string; defaultTags: string }> = {
  politics: {
    hook: '暮らしと地域の未来を変える具体的な取り組みを、要点だけで60秒に凝縮しました。',
    cta: '政策の背景やスケジュールは、詳細資料リンクからすぐにご確認いただけます。',
    defaultTags: '#政策PR #自治体DX #地域ビジョン',
  },
  local: {
    hook: '地域ならではの風景と人の温もりを、1分間のショートツアーでお届けします。',
    cta: '週末の訪問や移住・出店のご相談はプロフィール窓口からお気軽にどうぞ。',
    defaultTags: '#地方創生 #ローカルPR #まちづくり',
  },
  school: {
    hook: '日々の練習と試行錯誤のリアルな熱量を、60秒のダイジェストにまとめました。',
    cta: '見学・体験や活動への応援メッセージをお待ちしています！',
    defaultTags: '#スクールPR #部活紹介 #探究活動',
  },
  personal: {
    hook: 'これまでの制作物と大切にしている視点を、1分間のセルフピッチとしてご紹介します。',
    cta: 'コラボや制作のご依頼はプロフィールのコンタクト先までご連絡ください。',
    defaultTags: '#個人PR #ポートフォリオ #クリエイター',
  },
  business: {
    hook: '現場の課題を最短距離で解決するプロダクトの核となる価値を、60秒で実演します。',
    cta: '無料トライアルやデモ予約は概要リンクより1分で完了します。',
    defaultTags: '#ビジネスPR #プロダクトデモ #業務効率化',
  },
};

export function generateAiCaptionDraft(params: {
  title: string;
  category: VideoCategoryId;
  hashtagsInput: string;
  durationSec: number;
}): AICaptionDraft {
  const cleanTitle = params.title.trim() || `${getCategoryMeta(params.category).shortLabel}の注目プロジェクト`;
  const tags = parseHashtags(params.hashtagsInput);
  const template = CATEGORY_HOOKS[params.category];
  const primaryTag = tags[0] ?? parseHashtags(template.defaultTags)[0];
  const secondaryTag = tags[1] ?? '';
  const tagPhrase = secondaryTag ? `${primaryTag}・${secondaryTag}` : primaryTag;
  const safeDuration = clampDurationSeconds(params.durationSec);

  const summary = `【${safeDuration}秒要約】「${cleanTitle}」の重要ポイントを整理。${template.hook}${tagPhrase}に関心のある方に向けて、導入から次のアクションまでをテンポよく解説します。`;

  const t1 = Math.max(10, Math.round(safeDuration * 0.25));
  const t2 = Math.max(20, Math.round(safeDuration * 0.55));
  const t3 = Math.max(30, Math.round(safeDuration * 0.8));

  const captions: VideoCaption[] = [
    {
      timeSec: 0,
      text: `00:00 — 「${cleanTitle}」の結論を${safeDuration}秒でお伝えします。`,
    },
    {
      timeSec: t1,
      text: `${formatTimer(t1)} — ${template.hook}`,
    },
    {
      timeSec: t2,
      text: `${formatTimer(t2)} — ${tagPhrase}の視点から見た独自の強みと成果。`,
    },
    {
      timeSec: t3,
      text: `${formatTimer(t3)} — ${template.cta}`,
    },
  ];

  const suggestedHashtags =
    tags.length >= 2 ? tags.join(' ') : `${tags.join(' ')} ${template.defaultTags}`.trim();

  return {
    summary,
    captions,
    suggestedHashtags,
  };
}

export interface ShareUrls {
  shareUrl: string;
  shareText: string;
  xUrl: string;
  lineUrl: string;
  facebookUrl: string;
}

export function buildShareUrls(video: PRVideo, origin: string): ShareUrls {
  const normalizedOrigin = origin.replace(/\/+$/, '');
  const shareUrl = `${normalizedOrigin}/?v=${encodeURIComponent(video.id)}`;
  const tagsText = video.hashtags.slice(0, 3).join(' ');
  const headline = `${video.title}｜PROne（${formatTimer(video.durationSec)}） ${tagsText}`.trim();
  const shareText = `${headline} ${shareUrl}`;

  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    headline
  )}&url=${encodeURIComponent(shareUrl)}`;
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(
    shareUrl
  )}&text=${encodeURIComponent(headline)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    shareUrl
  )}&quote=${encodeURIComponent(headline)}`;

  return {
    shareUrl,
    shareText,
    xUrl,
    lineUrl,
    facebookUrl,
  };
}

export interface CategoryGroup {
  category: CategoryMeta;
  videos: PRVideo[];
}

export function groupVideosByCategory(videos: PRVideo[]): CategoryGroup[] {
  const order: VideoCategoryId[] = ['politics', 'local', 'school', 'personal', 'business'];
  return order
    .map((catId) => ({
      category: getCategoryMeta(catId),
      videos: videos.filter((v) => v.category === catId),
    }))
    .filter((group) => group.videos.length > 0);
}

export function computeTrendingRankings(
  videos: PRVideo[],
  period: TrendingPeriod = 'weekly',
  limit = 5
): RankedVideoItem[] {
  const maxCreatedTs = videos.reduce((max, v) => Math.max(max, v.createdAtTs), 0);

  const scored = videos.map((video) => {
    const engagementRatio = video.views > 0 ? video.likes / video.views : 0;
    if (period === 'alltime') {
      const score = Math.round(video.views + video.likes * 6);
      const pct = Math.max(4, Math.round(engagementRatio * 100));
      return {
        video,
        trendScore: score,
        growthLabel: `好評価率 ${pct}%`,
      };
    }

    // Weekly momentum: combines views, likes weight, and recency boost
    const hoursOld = Math.max(1, (maxCreatedTs - video.createdAtTs) / (1000 * 60 * 60));
    const recencyMultiplier = hoursOld <= 6 ? 1.35 : hoursOld <= 24 ? 1.15 : 1.0;
    const score = Math.round((video.views * 0.6 + video.likes * 12) * recencyMultiplier);
    const growthPct = Math.round(18 + engagementRatio * 240 + (recencyMultiplier - 1) * 100);

    return {
      video,
      trendScore: score,
      growthLabel: `週間 +${growthPct}%`,
    };
  });

  return scored
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, limit)
    .map((item, idx) => ({
      rank: idx + 1,
      video: item.video,
      trendScore: item.trendScore,
      growthLabel: item.growthLabel,
    }));
}
