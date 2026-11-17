export type CategoryId =
  | 'all'
  | 'politics'
  | 'local'
  | 'school'
  | 'personal'
  | 'business';

export type VideoCategoryId = Exclude<CategoryId, 'all'>;

export interface CategoryMeta {
  id: CategoryId;
  emoji: string;
  label: string;
  shortLabel: string;
  description: string;
}

export interface VideoCaption {
  timeSec: number;
  text: string;
}

export interface PRVideo {
  id: string;
  title: string;
  summary: string;
  category: VideoCategoryId;
  durationSec: number;
  creatorName: string;
  creatorHandle: string;
  creatorRole: string;
  creatorInitials: string;
  creatorAccent: string;
  hashtags: string[];
  thumbnailUrl: string;
  videoUrl?: string;
  captions: VideoCaption[];
  views: number;
  likes: number;
  postedAtLabel: string;
  createdAtTs: number;
  liked?: boolean;
  bookmarked?: boolean;
  isSample?: boolean;
}

export type SortMode = 'latest' | 'popular';
export type ViewMode = 'timeline' | 'trending' | 'saved';
export type TrendingPeriod = 'weekly' | 'alltime';

export interface NewVideoInput {
  title: string;
  summary: string;
  category: VideoCategoryId;
  durationSec: number;
  creatorName: string;
  creatorRole: string;
  hashtagsInput: string;
  thumbnailUrl: string;
  videoUrl?: string;
  captions?: VideoCaption[];
}

export interface RankedVideoItem {
  rank: number;
  video: PRVideo;
  trendScore: number;
  growthLabel: string;
}
