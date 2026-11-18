import { useEffect } from 'react';
import { PRVideo } from '../types/video';

export const VIDEO_STRUCTURED_DATA_SCRIPT_ID = 'video-structured-data';
export const DEFAULT_SITE_TITLE = 'PROne（ピーアールワン）— 60秒PR動画プラットフォーム';
export const DEFAULT_SITE_DESCRIPTION =
  '政治・地域・学校・個人・ビジネスのPR動画をすべて約1分（60秒）でサクッと視聴・共有できるWebプラットフォーム。';

export interface VideoSeoMetadata {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: 'video.other';
  ogUrl: string;
  twitterCard: 'summary_large_image';
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
}

export interface VideoObjectJsonLd {
  '@context': 'https://schema.org';
  '@type': 'VideoObject';
  name: string;
  description: string;
  thumbnailUrl: string[];
  uploadDate: string;
  duration: string;
  contentUrl: string;
  url: string;
  author: {
    '@type': 'Person';
    name: string;
  };
}

/**
 * 秒数を ISO 8601 形式の期間文字列に変換する (例: 60 -> "PT60S")
 */
export function formatIsoDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 'PT0S';
  }
  const safeSeconds = Math.round(seconds);
  if (safeSeconds <= 60) {
    return `PT${safeSeconds}S`;
  }
  const mins = Math.floor(safeSeconds / 60);
  const rem = safeSeconds % 60;
  return rem > 0 ? `PT${mins}M${rem}S` : `PT${mins}M`;
}

/**
 * UNIXタイムスタンプ(ms)を ISO 8601 形式の日時に変換する
 */
export function toIsoUploadDate(timestampMs: number): string {
  const date = Number.isFinite(timestampMs) ? new Date(timestampMs) : new Date(0);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

/**
 * 相対パスやViteアセットURLをクローラー向けの絶対URLへ正規化する
 */
export function toAbsoluteUrl(pathOrUrl: string, origin: string): string {
  const trimmed = pathOrUrl.trim();
  if (!trimmed) {
    return origin.replace(/\/+$/, '');
  }
  if (/^(https?:|data:|blob:)/i.test(trimmed)) {
    return trimmed;
  }
  const normalizedOrigin = origin.replace(/\/+$/, '');
  try {
    return new URL(trimmed, `${normalizedOrigin}/`).href;
  } catch {
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${normalizedOrigin}${cleanPath}`;
  }
}

export function buildVideoPageUrl(videoId: string, origin: string): string {
  const normalizedOrigin = origin.replace(/\/+$/, '');
  return `${normalizedOrigin}/?v=${encodeURIComponent(videoId)}`;
}

export function buildVideoSeoMetadata(video: PRVideo, origin: string): VideoSeoMetadata {
  const title = `${video.title} | PROne 1分PR動画`;
  const description = video.summary;
  const ogImage = toAbsoluteUrl(video.thumbnailUrl, origin);
  const ogUrl = buildVideoPageUrl(video.id, origin);

  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogImage,
    ogType: 'video.other',
    ogUrl,
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: ogImage,
  };
}

export function buildVideoJsonLd(video: PRVideo, origin: string): VideoObjectJsonLd {
  const pageUrl = buildVideoPageUrl(video.id, origin);
  const hasPublicVideoUrl = Boolean(video.videoUrl && !video.videoUrl.startsWith('blob:'));
  const contentUrl =
    hasPublicVideoUrl && video.videoUrl
      ? toAbsoluteUrl(video.videoUrl, origin)
      : pageUrl;

  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title,
    description: video.summary,
    thumbnailUrl: [toAbsoluteUrl(video.thumbnailUrl, origin)],
    uploadDate: toIsoUploadDate(video.createdAtTs),
    duration: formatIsoDuration(video.durationSec),
    contentUrl,
    url: pageUrl,
    author: {
      '@type': 'Person',
      name: video.creatorName,
    },
  };
}

type MetaAttrKey = 'name' | 'property';

interface ManagedMetaDescriptor {
  attr: MetaAttrKey;
  key: string;
}

const MANAGED_META_DESCRIPTORS: ManagedMetaDescriptor[] = [
  { attr: 'name', key: 'description' },
  { attr: 'property', key: 'og:title' },
  { attr: 'property', key: 'og:description' },
  { attr: 'property', key: 'og:image' },
  { attr: 'property', key: 'og:type' },
  { attr: 'property', key: 'og:url' },
  { attr: 'name', key: 'twitter:card' },
  { attr: 'name', key: 'twitter:title' },
  { attr: 'name', key: 'twitter:description' },
  { attr: 'name', key: 'twitter:image' },
];

interface SeoBaselineSnapshot {
  title: string;
  metaContents: Map<string, string | null>;
}

const baselineByDocument = new WeakMap<Document, SeoBaselineSnapshot>();

function getMetaCacheKey(attr: MetaAttrKey, key: string): string {
  return `${attr}:${key}`;
}

function findMetaElement(
  doc: Document,
  attr: MetaAttrKey,
  key: string
): HTMLMetaElement | null {
  return doc.head.querySelector(`meta[${attr}="${key}"]`);
}

function ensureBaselineSnapshot(doc: Document): SeoBaselineSnapshot {
  const existing = baselineByDocument.get(doc);
  if (existing) {
    return existing;
  }

  const metaContents = new Map<string, string | null>();
  for (const desc of MANAGED_META_DESCRIPTORS) {
    const el = findMetaElement(doc, desc.attr, desc.key);
    metaContents.set(
      getMetaCacheKey(desc.attr, desc.key),
      el ? el.getAttribute('content') ?? '' : null
    );
  }

  const snapshot: SeoBaselineSnapshot = {
    title: doc.title || DEFAULT_SITE_TITLE,
    metaContents,
  };
  baselineByDocument.set(doc, snapshot);
  return snapshot;
}

function upsertMetaTag(
  doc: Document,
  attr: MetaAttrKey,
  key: string,
  content: string
): void {
  let el = findMetaElement(doc, attr, key);
  if (!el) {
    el = doc.createElement('meta');
    el.setAttribute(attr, key);
    el.setAttribute('data-prone-seo', 'dynamic');
    doc.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * 選択された動画のメタタグ・OGP・JSON-LD (VideoObject) を document.head に適用する
 */
export function applyVideoSeo(
  video: PRVideo,
  origin: string,
  doc: Document = document
): void {
  if (!doc?.head) return;

  ensureBaselineSnapshot(doc);

  const meta = buildVideoSeoMetadata(video, origin);
  const jsonLd = buildVideoJsonLd(video, origin);

  doc.title = meta.title;

  upsertMetaTag(doc, 'name', 'description', meta.description);
  upsertMetaTag(doc, 'property', 'og:title', meta.ogTitle);
  upsertMetaTag(doc, 'property', 'og:description', meta.ogDescription);
  upsertMetaTag(doc, 'property', 'og:image', meta.ogImage);
  upsertMetaTag(doc, 'property', 'og:type', meta.ogType);
  upsertMetaTag(doc, 'property', 'og:url', meta.ogUrl);
  upsertMetaTag(doc, 'name', 'twitter:card', meta.twitterCard);
  upsertMetaTag(doc, 'name', 'twitter:title', meta.twitterTitle);
  upsertMetaTag(doc, 'name', 'twitter:description', meta.twitterDescription);
  upsertMetaTag(doc, 'name', 'twitter:image', meta.twitterImage);

  const existingScript = doc.getElementById(VIDEO_STRUCTURED_DATA_SCRIPT_ID);
  if (existingScript) {
    existingScript.remove();
  }

  const script = doc.createElement('script');
  script.id = VIDEO_STRUCTURED_DATA_SCRIPT_ID;
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(jsonLd);
  doc.head.appendChild(script);
}

/**
 * モーダルクローズや動画切り替え時に構造化データ・動的メタタグをクリーンアップして初期状態へ戻す
 */
export function cleanupVideoSeo(doc: Document = document): void {
  if (!doc?.head) return;

  const existingScript = doc.getElementById(VIDEO_STRUCTURED_DATA_SCRIPT_ID);
  if (existingScript) {
    existingScript.remove();
  }

  const snapshot = baselineByDocument.get(doc);
  if (!snapshot) {
    doc.title = DEFAULT_SITE_TITLE;
    const descEl = findMetaElement(doc, 'name', 'description');
    if (descEl) descEl.setAttribute('content', DEFAULT_SITE_DESCRIPTION);
    return;
  }

  doc.title = snapshot.title;

  for (const desc of MANAGED_META_DESCRIPTORS) {
    const cacheKey = getMetaCacheKey(desc.attr, desc.key);
    const originalContent = snapshot.metaContents.get(cacheKey);
    const el = findMetaElement(doc, desc.attr, desc.key);
    if (!el) continue;

    if (originalContent === null || originalContent === undefined) {
      el.remove();
    } else {
      el.setAttribute('content', originalContent);
    }
  }
}

/**
 * SpotlightPlayerModal 等から呼び出す動的SEO React Hook
 */
export function useVideoSeo(video: PRVideo | null): void {
  const videoId = video?.id ?? null;
  const title = video?.title ?? '';
  const summary = video?.summary ?? '';
  const thumbnailUrl = video?.thumbnailUrl ?? '';
  const durationSec = video?.durationSec ?? 0;
  const createdAtTs = video?.createdAtTs ?? 0;
  const videoUrl = video?.videoUrl;
  const creatorName = video?.creatorName ?? '';

  useEffect(() => {
    if (typeof document === 'undefined' || !videoId) {
      return;
    }

    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://prone.app';

    const targetVideo: PRVideo = {
      id: videoId,
      title,
      summary,
      thumbnailUrl,
      durationSec,
      createdAtTs,
      videoUrl,
      creatorName,
      category: 'business',
      creatorHandle: '',
      creatorRole: '',
      creatorInitials: '',
      creatorAccent: '#5E6AD2',
      hashtags: [],
      captions: [],
      views: 0,
      likes: 0,
      postedAtLabel: '',
    };

    applyVideoSeo(targetVideo, origin, document);

    return () => {
      cleanupVideoSeo(document);
    };
  }, [
    videoId,
    title,
    summary,
    thumbnailUrl,
    durationSec,
    createdAtTs,
    videoUrl,
    creatorName,
  ]);
}
