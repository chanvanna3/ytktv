import React, { useState } from 'react';
import {
  VolumeX,
  Volume2,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Disc3,
  Sparkles,
  Search,
  ExternalLink,
  Music,
  Radio,
  Eye,
  EyeOff,
} from 'lucide-react';

export function KaraokePlayer({
  containerId,
  videoId,
  isPlayerReady,
  playerError,
  audioLoaded,
  currentDriftMs,
  videoTitle,
  onSearchAlternative,
}) {
  const [dismissWarning, setDismissWarning] = useState(false);
  const [videoSize, setVideoSize] = useState(() => {
    try {
      return localStorage.getItem('karaoke_video_size') || 'compact';
    } catch (e) {
      return 'compact';
    }
  });

  const handleSetVideoSize = (size) => {
    setVideoSize(size);
    try {
      localStorage.setItem('karaoke_video_size', size);
    } catch (e) {}
  };

  // Clean title for searching alternatives (remove | AUDIO | RHM, etc.)
  const getCleanSearchQuery = () => {
    if (!videoTitle) return 'រលកបោកខ្សាច់ lyrics';
    return (
      videoTitle
        .replace(/\|\s*AUDIO\s*\|\s*RHM/gi, '')
        .replace(/\[official.*?\]/gi, '')
        .replace(/\(official.*?\)/gi, '')
        .replace(/\|.*?video/gi, '')
        .replace(/\|/g, ' ')
        .trim() + ' lyrics'
    );
  };

  const isRestricted = playerError && (playerError.code === 101 || playerError.code === 150);
  const thumbnailUrl = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;

  return (
    <div className="flex flex-col w-full glass-panel rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Header bar with video title & sync status indicators */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 sm:px-5 py-2.5 sm:py-3.5 bg-slate-900/90 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2 max-w-[240px] sm:max-w-md truncate">
          <Disc3 className="w-4 h-4 text-pink-400 shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
          <span className="font-semibold text-slate-200 truncate">{videoTitle || 'YouTube Video Player'}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Video Size Switcher for Mobile & Desktop */}
          <div className="flex items-center gap-1 bg-slate-950/90 p-0.5 rounded-lg border border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => handleSetVideoSize('compact')}
              className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-all ${
                videoSize === 'compact'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="ទំហំល្មម Phone (Compact 200px) — ទុកកន្លែងមើលអក្សរចម្រៀងស្រួល"
            >
              📱 ល្មម Phone
            </button>
            <button
              type="button"
              onClick={() => handleSetVideoSize('standard')}
              className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-all ${
                videoSize === 'standard'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="ទំហំពេញ (Standard 16:9)"
            >
              📺 16:9
            </button>
            <button
              type="button"
              onClick={() => handleSetVideoSize('mini')}
              className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-all ${
                videoSize === 'mini'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="បង្រួមតូចបំផុត (Mini)"
            >
              🔻 Mini
            </button>
          </div>

          {/* Strictly Muted Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
            {audioLoaded ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-pink-400" />
                <span className="text-[11px] font-medium">AI Stems: Active</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-medium">Audio: Direct</span>
              </>
            )}
          </div>

          {/* AI Audio Status */}
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border text-[10px] sm:text-[11px] font-medium ${
              audioLoaded
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
            }`}
          >
            {audioLoaded ? (
              <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
            ) : (
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 animate-spin" />
            )}
            <span>{audioLoaded ? 'AI Ready (95%+ Cut)' : 'Preparing AI...'}</span>
          </div>
        </div>
      </div>

      {/* Main Video Screen Container - Adapts to videoSize */}
      <div
        className={`relative w-full bg-black overflow-hidden flex items-center justify-center transition-all duration-300 ${
          videoSize === 'compact'
            ? 'h-[200px] sm:h-[300px] md:h-[360px]'
            : videoSize === 'mini'
            ? 'h-24 sm:h-32'
            : 'aspect-video'
        }`}
      >
        {/* The YouTube IFrame target element */}
        <div id={containerId} className="w-full h-full" />

        {/* Embedded Restriction Overlay (Error 101/150) */}
        {isRestricted && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 overflow-y-auto">
            {thumbnailUrl && (
              <div className="relative w-36 aspect-video rounded-xl overflow-hidden mb-3 border border-slate-700 shadow-lg">
                <img src={thumbnailUrl} alt={videoTitle} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                </div>
              </div>
            )}
            <h3 className="text-base font-bold text-slate-100 mb-1">
              ម្ចាស់វីដេអូបិទមិនឱ្យចាក់លើគេហទំព័រក្រៅ (Error {playerError.code})
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
              ម្ចាស់កម្មសិទ្ធិបានបិទការចាក់លើកញ្ចក់ IFrame។ លោកអ្នកអាចស្វែងរកកំណែចម្រៀង Lyrics ផ្សេង ឬបើកលើ YouTube ផ្ទាល់។
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => onSearchAlternative && onSearchAlternative(getCleanSearchQuery())}
                className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-pink-600/30 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>ស្វែងរកបទស្រដៀង (Lyrics)</span>
              </button>
              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>បើកលើ YouTube</span>
              </a>
            </div>
          </div>
        )}

        {/* Generic Error Overlay */}
        {playerError && !isRestricted && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="p-3 bg-rose-500/20 rounded-full mb-3 border border-rose-500/40">
              <AlertTriangle className="w-8 h-8 text-rose-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-1">Player Error ({playerError.code})</h3>
            <p className="text-sm text-slate-300 max-w-md mb-4 leading-relaxed">{playerError.message}</p>
          </div>
        )}

        {/* Initial loading placeholder if IFrame is rendering */}
        {!isPlayerReady && !playerError && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center pointer-events-none">
            <div className="w-10 h-10 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs text-slate-400">Loading YouTube Visual Engine...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default KaraokePlayer;