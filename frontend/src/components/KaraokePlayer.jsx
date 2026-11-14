import React, { useState } from 'react';
import {
  VolumeX,
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
            <VolumeX className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-[11px] font-medium">YT Audio: Muted</span>
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
            <span>
              {audioLoaded ? 'AI Ready (95%+ Cut)' : 'Preparing...'}
            </span>
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

        {/* Studio Karaoke Visualizer Mode when Embedding is Restricted (Error 101/150) */}
        {isRestricted && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-between p-6 overflow-hidden bg-slate-950 select-none animate-fade-in">
            {/* Blurred Album Art Background with Ambient Lighting */}
            {thumbnailUrl && (
              <div
                className="absolute inset-0 bg-cover bg-center filter blur-2xl opacity-25 scale-110 pointer-events-none transition-all duration-700"
                style={{ backgroundImage: `url(${thumbnailUrl})` }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none" />

            {/* Top Bar inside Visualizer */}
            <div className="relative z-10 w-full flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-300 font-semibold shadow-sm">
                <Radio className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                <span>Karaoke Studio Visualizer Active</span>
              </span>

              <button
                onClick={() => setDismissWarning((prev) => !prev)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer text-[11px]"
              >
                {dismissWarning ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>{dismissWarning ? 'បង្ហាញព័ត៌មាន (Show Info)' : 'លាក់ព័ត៌មាន (Hide Info)'}</span>
              </button>
            </div>

            {/* Central Animated Music Stage */}
            <div className="relative z-10 flex flex-col items-center text-center space-y-3 max-w-lg mx-auto my-auto">
              {/* Glowing Vinyl Disk */}
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-pink-500/30 via-purple-500/30 to-cyan-500/30 animate-ping opacity-60 pointer-events-none" />
                <div className="relative w-full h-full rounded-full bg-slate-900 border-4 border-slate-800 shadow-2xl p-1 flex items-center justify-center overflow-hidden animate-spin" style={{ animationDuration: '8s' }}>
                  {thumbnailUrl ? (
                    <img src={thumbnailUrl} alt="Album Art" className="w-full h-full object-cover rounded-full opacity-80" />
                  ) : (
                    <Disc3 className="w-16 h-16 text-pink-400" />
                  )}
                  {/* Center vinyl hole */}
                  <div className="absolute w-7 h-7 bg-slate-950 border-2 border-pink-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-pink-400 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Title & Status */}
              <div className="space-y-1 px-4">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-100 line-clamp-2 leading-snug">
                  {videoTitle || 'បទចម្រៀងខារ៉ាអូខេ'}
                </h3>
                <p className="text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ភ្លេងខារ៉ាអូខេ AI (95%+ Vocal Cut) កំពុងចាក់ជូនច្រៀង!</span>
                </p>
              </div>

              {/* Warning and Action Card */}
              {!dismissWarning && (
                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-xl space-y-3 text-xs animate-fade-in">
                  <div className="flex items-start gap-2.5 text-left text-slate-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      ម្ចាស់បទដើមបានបិទការបញ្ចាំងវីដេអូខាងក្រៅ (Embed Restricted Error 101/150) ប៉ុន្តែភ្លេងខារ៉ាអូខេ AI នៅតែដំណើរការ និងច្រៀងបានធម្មតា!
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {onSearchAlternative && (
                      <button
                        onClick={() => onSearchAlternative(getCleanSearchQuery())}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold text-xs tracking-wide transition-all shadow-md shadow-pink-500/20 cursor-pointer"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>ស្វែងរកវីដេអូ Lyrics ជំនួសភ្លាមៗ</span>
                      </button>
                    )}

                    <a
                      href={`https://www.youtube.com/watch?v=${videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-medium text-xs transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>មើលវីដេអូលើ YouTube</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Live Equalizer Spectrum Waves */}
            <div className="relative z-10 w-full flex items-end justify-center gap-1.5 h-7 pb-1">
              {[35, 60, 85, 45, 95, 70, 50, 100, 65, 80, 55, 90, 40, 75, 60, 85, 50, 70].map((h, i) => (
                <span
                  key={i}
                  className="w-1.5 rounded-t bg-gradient-to-t from-pink-500 via-purple-500 to-cyan-400 opacity-80 animate-pulse"
                  style={{
                    height: `${h}%`,
                    animationDelay: `${(i * 0.1).toFixed(1)}s`,
                    animationDuration: '0.8s',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Generic Error Overlay for other errors */}
        {playerError && !isRestricted && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="p-3 bg-rose-500/20 rounded-full mb-3 border border-rose-500/40">
              <AlertTriangle className="w-8 h-8 text-rose-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-1">Player Error ({playerError.code})</h3>
            <p className="text-sm text-slate-300 max-w-md mb-4 leading-relaxed">
              {playerError.message}
            </p>
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
