import { describe, expect, it } from 'vitest';
import { INITIAL_VIDEOS } from '../../data/initialVideos';
import {
  applyVideoSeo,
  buildVideoJsonLd,
  buildVideoSeoMetadata,
  cleanupVideoSeo,
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_SITE_TITLE,
  formatIsoDuration,
  toAbsoluteUrl,
  toIsoUploadDate,
  VIDEO_STRUCTURED_DATA_SCRIPT_ID,
} from '../seoUtils';

class MockElement {
  tagName: string;
  id = '';
  type = '';
  textContent: string | null = null;
  attrs = new Map<string, string>();
  parent: MockHead | null = null;

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  setAttribute(name: string, value: string): void {
    if (name === 'id') this.id = value;
    if (name === 'type') this.type = value;
    this.attrs.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attrs.get(name) ?? null;
  }

  remove(): void {
    if (this.parent) {
      this.parent.children = this.parent.children.filter((c) => c !== this);
      this.parent = null;
    }
  }
}

class MockHead {
  children: MockElement[] = [];

  appendChild(el: MockElement): MockElement {
    el.parent = this;
    this.children.push(el);
    return el;
  }

  querySelector(selector: string): MockElement | null {
    const match = /^meta\[(name|property)="([^"]+)"\]$/.exec(selector);
    if (!match) return null;
    const [, attr, key] = match;
    return this.children.find(
      (c) => c.tagName === 'META' && c.getAttribute(attr) === key
    ) ?? null;
  }
}

function createMockDocument(): Document {
  const head = new MockHead();

  const desc = new MockElement('meta');
  desc.setAttribute('name', 'description');
  desc.setAttribute('content', DEFAULT_SITE_DESCRIPTION);
  head.appendChild(desc);

  const ogTitle = new MockElement('meta');
  ogTitle.setAttribute('property', 'og:title');
  ogTitle.setAttribute('content', DEFAULT_SITE_TITLE);
  head.appendChild(ogTitle);

  const ogDesc = new MockElement('meta');
  ogDesc.setAttribute('property', 'og:description');
  ogDesc.setAttribute('content', DEFAULT_SITE_DESCRIPTION);
  head.appendChild(ogDesc);

  const ogType = new MockElement('meta');
  ogType.setAttribute('property', 'og:type');
  ogType.setAttribute('content', 'website');
  head.appendChild(ogType);

  const mockDoc = {
    title: DEFAULT_SITE_TITLE,
    head,
    createElement: (tag: string) => new MockElement(tag),
    getElementById: (id: string) => head.children.find((c) => c.id === id) ?? null,
  };

  return mockDoc as unknown as Document;
}

describe('SEO formatting and structured data builders', () => {
  it('converts seconds into ISO 8601 duration strings', () => {
    expect(formatIsoDuration(60)).toBe('PT60S');
    expect(formatIsoDuration(45)).toBe('PT45S');
    expect(formatIsoDuration(30)).toBe('PT30S');
    expect(formatIsoDuration(0)).toBe('PT0S');
    expect(formatIsoDuration(-10)).toBe('PT0S');
    expect(formatIsoDuration(90)).toBe('PT1M30S');
    expect(formatIsoDuration(Number.NaN)).toBe('PT0S');
  });

  it('normalizes relative asset URLs to absolute URLs for crawlers', () => {
    expect(toAbsoluteUrl('/assets/thumb-civic.jpg', 'https://prone.example.com/')).toBe(
      'https://prone.example.com/assets/thumb-civic.jpg'
    );
    expect(toAbsoluteUrl('https://cdn.example.com/poster.jpg', 'https://prone.example.com')).toBe(
      'https://cdn.example.com/poster.jpg'
    );
  });

  it('converts timestamps into ISO 8601 uploadDate strings', () => {
    const ts = Date.UTC(2025, 4, 10, 12, 0, 0);
    expect(toIsoUploadDate(ts)).toBe('2025-05-10T12:00:00.000Z');
  });

  it('builds dynamic title, description, and OGP metadata for a selected video', () => {
    const video = INITIAL_VIDEOS[0];
    const meta = buildVideoSeoMetadata(video, 'https://prone.example.com');

    expect(meta.title).toBe(`${video.title} | PROne 1分PR動画`);
    expect(meta.description).toBe(video.summary);
    expect(meta.ogTitle).toBe(`${video.title} | PROne 1分PR動画`);
    expect(meta.ogDescription).toBe(video.summary);
    expect(meta.ogType).toBe('video.other');
    expect(meta.ogUrl).toBe(`https://prone.example.com/?v=${encodeURIComponent(video.id)}`);
    expect(meta.ogImage.startsWith('https://prone.example.com')).toBe(true);
  });

  it('builds Schema.org VideoObject JSON-LD with required fields and contentUrl fallback', () => {
    const video = INITIAL_VIDEOS[0];
    const jsonLd = buildVideoJsonLd(video, 'https://prone.example.com');

    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('VideoObject');
    expect(jsonLd.name).toBe(video.title);
    expect(jsonLd.description).toBe(video.summary);
    expect(Array.isArray(jsonLd.thumbnailUrl)).toBe(true);
    expect(jsonLd.thumbnailUrl).toHaveLength(1);
    expect(jsonLd.thumbnailUrl[0].startsWith('https://prone.example.com')).toBe(true);
    expect(jsonLd.uploadDate).toBe(new Date(video.createdAtTs).toISOString());
    expect(jsonLd.duration).toBe(formatIsoDuration(video.durationSec));
    expect(jsonLd.contentUrl).toBe(`https://prone.example.com/?v=${encodeURIComponent(video.id)}`);

    // Uses public videoUrl when present (non-blob)
    const videoWithPublicFile = { ...video, videoUrl: '/videos/demo.mp4' };
    const publicJsonLd = buildVideoJsonLd(videoWithPublicFile, 'https://prone.example.com');
    expect(publicJsonLd.contentUrl).toBe('https://prone.example.com/videos/demo.mp4');

    // Ignores ephemeral blob URLs for crawler contentUrl
    const videoWithBlob = { ...video, videoUrl: 'blob:https://prone.example.com/1234' };
    const blobJsonLd = buildVideoJsonLd(videoWithBlob, 'https://prone.example.com');
    expect(blobJsonLd.contentUrl).toBe(`https://prone.example.com/?v=${encodeURIComponent(video.id)}`);
  });
});

describe('DOM applyVideoSeo and cleanupVideoSeo lifecycle', () => {
  it('updates document.title, OGP meta tags, injects JSON-LD, switches cleanly, and restores defaults on cleanup', () => {
    const doc = createMockDocument();
    const first = INITIAL_VIDEOS[0];
    const second = INITIAL_VIDEOS[1];

    // 1. Apply first video SEO
    applyVideoSeo(first, 'https://prone.example.com', doc);

    expect(doc.title).toBe(`${first.title} | PROne 1分PR動画`);
    expect(doc.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      first.summary
    );
    expect(doc.head.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe(
      'video.other'
    );
    expect(doc.head.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(
      toAbsoluteUrl(first.thumbnailUrl, 'https://prone.example.com')
    );

    const script1 = doc.getElementById(VIDEO_STRUCTURED_DATA_SCRIPT_ID);
    expect(script1).not.toBeNull();
    const parsed1 = JSON.parse(script1?.textContent ?? '{}');
    expect(parsed1['@type']).toBe('VideoObject');
    expect(parsed1.name).toBe(first.title);
    expect(parsed1.duration).toBe(formatIsoDuration(first.durationSec));

    // 2. Switch to second video (no duplicate script tags)
    cleanupVideoSeo(doc);
    applyVideoSeo(second, 'https://prone.example.com', doc);

    expect(doc.title).toBe(`${second.title} | PROne 1分PR動画`);
    const script2 = doc.getElementById(VIDEO_STRUCTURED_DATA_SCRIPT_ID);
    expect(script2).not.toBeNull();
    const parsed2 = JSON.parse(script2?.textContent ?? '{}');
    expect(parsed2.name).toBe(second.title);

    // 3. Cleanup on modal close restores initial defaults & removes injected tags
    cleanupVideoSeo(doc);

    expect(doc.getElementById(VIDEO_STRUCTURED_DATA_SCRIPT_ID)).toBeNull();
    expect(doc.title).toBe(DEFAULT_SITE_TITLE);
    expect(doc.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      DEFAULT_SITE_DESCRIPTION
    );
    expect(doc.head.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe(
      'website'
    );
    expect(doc.head.querySelector('meta[property="og:image"]')).toBeNull();
  });
});
