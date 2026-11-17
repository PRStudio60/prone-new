import React, { useState } from 'react';
import { Clock, Upload, Wand2, X } from 'lucide-react';
import { CATEGORY_THUMBNAILS } from '../data/thumbnails';
import { NewVideoInput, VideoCaption, VideoCategoryId } from '../types/video';
import {
  CATEGORIES,
  MAX_PR_DURATION_SEC,
  MIN_PR_DURATION_SEC,
  clampDurationSeconds,
  formatTimer,
  generateAiCaptionDraft,
  getDurationValidationError,
  isValidPrDuration,
  parseHashtags,
} from '../utils/videoUtils';

interface PostVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: NewVideoInput) => void;
}

export const PostVideoModal: React.FC<PostVideoModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState<VideoCategoryId>('business');
  const [durationSec, setDurationSec] = useState<number>(60);
  const [creatorName, setCreatorName] = useState('');
  const [creatorRole, setCreatorRole] = useState('');
  const [hashtagsInput, setHashtagsInput] = useState('#PR動画 #60秒ピッチ');
  const [videoUrl, setVideoUrl] = useState<string | undefined>(undefined);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [durationNotice, setDurationNotice] = useState<string>('');
  const [generatedCaptions, setGeneratedCaptions] = useState<VideoCaption[] | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const selectableCategories = CATEGORIES.filter((c) => c.id !== 'all');
  const parsedTags = parseHashtags(hashtagsInput);
  const durationError = getDurationValidationError(durationSec);
  const isDurationInvalid = durationError !== null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setVideoUrl(objectUrl);
    setUploadedFileName(file.name);
    setDurationNotice('');

    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.src = objectUrl;
    probe.onloadedmetadata = () => {
      const rawSec = probe.duration;
      if (Number.isFinite(rawSec) && rawSec > 0) {
        const rounded = Math.round(rawSec);
        setDurationSec(rounded);
        if (isValidPrDuration(rounded)) {
          setDurationNotice(`選択動画の長さ（${formatTimer(rounded)}）を自動設定しました。`);
        }
      }
    };
  };

  const handleGenerateAiCaption = () => {
    setErrorMsg('');
    setIsGeneratingAi(true);

    window.setTimeout(() => {
      const draft = generateAiCaptionDraft({
        title,
        category,
        hashtagsInput,
        durationSec,
      });
      setSummary(draft.summary);
      setGeneratedCaptions(draft.captions);
      setHashtagsInput(draft.suggestedHashtags);
      setIsGeneratingAi(false);
    }, 350);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (durationError) {
      setErrorMsg(durationError);
      return;
    }
    if (!title.trim()) {
      setErrorMsg('PR動画のタイトルを入力してください。');
      return;
    }
    if (!creatorName.trim()) {
      setErrorMsg('投稿者名または団体名を入力してください。');
      return;
    }

    onSubmit({
      title: title.trim(),
      summary:
        summary.trim() ||
        '60秒で要点を伝えるPR動画です。詳細やお問い合わせはプロフィールからご覧ください。',
      category,
      durationSec: clampDurationSeconds(durationSec),
      creatorName: creatorName.trim(),
      creatorRole: creatorRole.trim() || 'クリエイター',
      hashtagsInput,
      thumbnailUrl: CATEGORY_THUMBNAILS[category],
      videoUrl,
      captions: generatedCaptions ?? undefined,
    });

    setTitle('');
    setSummary('');
    setCreatorName('');
    setCreatorRole('');
    setHashtagsInput('#PR動画 #60秒ピッチ');
    setDurationSec(60);
    setVideoUrl(undefined);
    setUploadedFileName('');
    setDurationNotice('');
    setGeneratedCaptions(null);
    setErrorMsg('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F1117]/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--border-hairline)]">
          <div>
            <h2 id="post-modal-title" className="text-base font-semibold text-[var(--text-primary)]">
              60秒PR動画を投稿する
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              すべての動画は30秒（00:30）〜60秒（01:00）の範囲でタイムラインに公開されます。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-colors cursor-pointer"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div
              role="alert"
              className="text-xs text-[#F59EA9] bg-[#F06B7E]/10 border border-[#F06B7E]/40 rounded-lg px-3 py-2"
            >
              {errorMsg}
            </div>
          )}

          {/* Category Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-secondary)]">
              カテゴリ
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {selectableCategories.map((cat) => {
                const active = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id as VideoCategoryId)}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium text-left transition-colors whitespace-nowrap truncate cursor-pointer ${
                      active
                        ? 'bg-[#5E6AD2]/18 border-[#5E6AD2] text-[var(--text-primary)]'
                        : 'bg-[var(--bg-input)] border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="pr-title" className="block text-xs font-medium text-[var(--text-secondary)]">
              タイトル <span className="text-[#5E6AD2]">*</span>
            </label>
            <input
              id="pr-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="例：1分でわかる！渋谷区スタートアップ支援プログラム"
              maxLength={80}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hairline)] text-sm text-[var(--text-primary)] placeholder-[var(--text-subtle)] focus:outline-none focus:border-[#5E6AD2]"
            />
          </div>

          {/* Creator Name & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="pr-creator" className="block text-xs font-medium text-[var(--text-secondary)]">
                投稿者名・団体名 <span className="text-[#5E6AD2]">*</span>
              </label>
              <input
                id="pr-creator"
                type="text"
                value={creatorName}
                onChange={(e) => {
                  setCreatorName(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="例：山田 太郎 / ○○高校放送部"
                className="w-full px-3.5 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hairline)] text-sm text-[var(--text-primary)] placeholder-[var(--text-subtle)] focus:outline-none focus:border-[#5E6AD2]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="pr-role" className="block text-xs font-medium text-[var(--text-secondary)]">
                肩書き・地域（任意）
              </label>
              <input
                id="pr-role"
                type="text"
                value={creatorRole}
                onChange={(e) => setCreatorRole(e.target.value)}
                placeholder="例：広報担当 / 北海道札幌市"
                className="w-full px-3.5 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hairline)] text-sm text-[var(--text-primary)] placeholder-[var(--text-subtle)] focus:outline-none focus:border-[#5E6AD2]"
              />
            </div>
          </div>

          {/* 30-60 Second Timer Duration Control & Video Upload */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                className={`p-3.5 rounded-lg bg-[var(--bg-input)] border space-y-2 transition-colors ${
                  isDurationInvalid ? 'border-[#F06B7E]/70' : 'border-[var(--border-hairline)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
                    <Clock className="w-3.5 h-3.5 text-[#5E6AD2]" />
                    PR尺（30〜60秒）
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={Number.isFinite(durationSec) ? durationSec : ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setDurationSec(raw === '' ? Number.NaN : Number(raw));
                      }}
                      aria-label="PR動画の秒数入力"
                      className="w-14 px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-right text-xs font-mono tabular-nums text-[var(--text-primary)] focus:outline-none focus:border-[#5E6AD2]"
                    />
                    <span className="text-[11px] font-mono tabular-nums text-[var(--text-muted)]">
                      秒 ({isDurationInvalid ? '--:--' : formatTimer(durationSec)})
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min={MIN_PR_DURATION_SEC}
                  max={MAX_PR_DURATION_SEC}
                  value={clampDurationSeconds(durationSec)}
                  onChange={(e) => setDurationSec(Number(e.target.value))}
                  aria-label="PR動画の長さ（30〜60秒スライダー）"
                  className="w-full accent-[#5E6AD2] cursor-pointer"
                />
                <p className="text-[11px] text-[var(--text-subtle)]">
                  ※30秒〜60秒の範囲で設定できます
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hairline)] flex flex-col justify-between gap-2">
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  動画ファイル（任意）
                </span>
                <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border-hairline)] hover:border-[#5E6AD2] text-xs text-[var(--text-primary)] cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5 text-[#5E6AD2]" />
                  <span className="truncate max-w-[180px]">
                    {uploadedFileName || 'MP4 / WebMを選択'}
                  </span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {durationError && (
              <p
                role="alert"
                className="text-xs text-[#F59EA9] bg-[#F06B7E]/10 border border-[#F06B7E]/40 rounded-lg px-3 py-2"
              >
                {durationError}
              </p>
            )}

            {!durationError && durationNotice && (
              <p className="text-xs text-[#5E6AD2]">{durationNotice}</p>
            )}
          </div>

          {/* Hashtags */}
          <div className="space-y-1.5">
            <label htmlFor="pr-hashtags" className="block text-xs font-medium text-[var(--text-secondary)]">
              ハッシュタグ（スペース区切り・最大5つ）
            </label>
            <input
              id="pr-hashtags"
              type="text"
              value={hashtagsInput}
              onChange={(e) => setHashtagsInput(e.target.value)}
              placeholder="#地方創生 #選挙 #部活PR"
              className="w-full px-3.5 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hairline)] text-sm text-[var(--text-primary)] placeholder-[var(--text-subtle)] focus:outline-none focus:border-[#5E6AD2]"
            />
            {parsedTags.length > 0 && (
              <div className="flex flex-wrap gap-2.5 pt-1 text-xs text-[var(--text-muted)]">
                {parsedTags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* Summary + AI Caption Generator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="pr-summary" className="block text-xs font-medium text-[var(--text-secondary)]">
                1分間の要点メッセージ・キャプション
              </label>
              <button
                type="button"
                onClick={handleGenerateAiCaption}
                disabled={isGeneratingAi}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#5E6AD2]/14 border border-[#5E6AD2]/60 hover:bg-[#5E6AD2]/22 text-xs font-medium text-[#5E6AD2] dark:text-[#A6B0FA] transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
              >
                <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isGeneratingAi ? '生成中...' : 'AIキャプション自動生成'}</span>
              </button>
            </div>

            <textarea
              id="pr-summary"
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="視聴者に60秒で伝えたいポイントを入力、または「AIキャプション自動生成」で下書きを作成できます。"
              maxLength={240}
              className="w-full px-3.5 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hairline)] text-sm text-[var(--text-primary)] placeholder-[var(--text-subtle)] focus:outline-none focus:border-[#5E6AD2] resize-none"
            />

            {generatedCaptions && generatedCaptions.length > 0 && (
              <div className="p-3 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hairline)] space-y-1.5">
                <p className="text-[11px] font-medium text-[var(--text-secondary)]">
                  自動生成された60秒タイムライン字幕（公開時に動画プレイヤーと連動します）
                </p>
                <ul className="space-y-1">
                  {generatedCaptions.map((cap) => (
                    <li
                      key={cap.timeSec}
                      className="text-[11px] text-[var(--text-muted)] leading-relaxed"
                    >
                      {cap.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Submit Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-hairline)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isDurationInvalid}
              className="px-4 py-2 rounded-lg bg-[#5E6AD2] hover:bg-[#6B77DE] text-xs font-medium text-white transition-colors cursor-pointer whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-[#5E6AD2]"
            >
              タイムラインに公開
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
