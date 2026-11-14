import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Music,
  Volume2,
  Sliders,
  Radio,
  Sparkles,
  Gauge,
  Waves,
  ShieldCheck,
  Disc,
  Download,
  Square,
  CircleDot,
  VolumeX,
  Zap,
  Settings,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Activity,
  Layers,
  Sparkle,
  Headphones,
} from 'lucide-react';
import { formatTime } from '../utils/youtube';
import { apiUrl } from '../utils/api';

export function KaraokeControls({
  audioMode = 'instrumental',
  setAudioMode,
  selectedVideoId,
  videoTitle,
  stems,
  isVocalOn,
  toggleVocals,
  instVolume,
  setInstVolume,
  vocalVolume,
  setVocalVolume,
  playbackTime,
  audioDuration,
  isPlaying,
  audioLoaded,
  playbackRate,
  onChangePlaybackRate,
  // Auto Vocal Cut
  isAutoVocalCutActive,
  toggleAutoVocalCut,
  // De-Bleed filter
  isDeBleedActive,
  toggleDeBleed,
  // Recording props
  isRecording,
  startRecording,
  stopRecording,
  recordedAudioUrl,
  recordingSeconds,
  // Microphone & Headphone props
  isMicActive,
  toggleMic,
  micVolume,
  setMicVolume,
  isEchoOn,
  setIsEchoOn,
  echoLevel = 0.35,
  setEchoLevel,
  delayTime = 0.22,
  setDelayTime,
  setEchoPreset,
  micError,
  setMicBoostPreset,
  isHeadphonesConnected,
  toggleHeadphones,
  isMonitorSpeaker,
  setIsMonitorSpeaker,
  isNoiseCutActive,
  toggleNoiseCut,
  keepMusicNormal = true,
  toggleKeepMusicNormal,
  onOpenVoiceStudio,
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'voice' | 'music' | 'fx' | 'assistant'
  const [showAdvancedFX, setShowAdvancedFX] = useState(false);

  return (
    <div className="w-full glass-panel rounded-2xl p-5 md:p-6 shadow-2xl border border-slate-800 space-y-6 animate-fade-in font-sans">
      {/* 1. Header Toolbar: Mode, Timers, Speed, VU Meters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <Radio className={`w-4 h-4 ${isPlaying ? 'text-pink-500 animate-pulse' : 'text-slate-600'}`} />
            <span className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase">
              Karaoke Master Studio
            </span>
          </div>

          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800/90 text-pink-400 font-medium border border-slate-700/60">
            {formatTime(playbackTime)} {audioDuration > 0 ? `/ ${formatTime(audioDuration)}` : ''}
          </span>

          {/* Mode Badge */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-sm">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            AI High-Precision (95%+ Vocal Cut)
          </span>
        </div>

        {/* Speed Controls & Live Audio EQ Meters */}
        <div className="flex items-center gap-3">
          {/* Speed / Tempo */}
          <div className="flex items-center gap-1 bg-slate-900/90 px-2 py-1 rounded-lg border border-slate-800 text-xs">
            <Gauge className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-400 text-[11px] mr-1 hidden sm:inline">ល្បឿន:</span>
            {[0.8, 1.0, 1.2].map((rate) => (
              <button
                key={rate}
                onClick={() => onChangePlaybackRate && onChangePlaybackRate(rate)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-all cursor-pointer ${
                  playbackRate === rate
                    ? 'bg-pink-500 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={`ល្បឿនចម្រៀង ${rate}x`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Live EQ Visualizer Bars */}
          <div className="flex items-end gap-1 h-5 px-1 bg-slate-950/60 rounded px-2 py-0.5 border border-slate-900">
            {[35, 75, 50, 95, 60, 85, 45, 100, 70, 50].map((height, i) => (
              <span
                key={i}
                className={`w-1 rounded-t transition-all duration-150 ${
                  isPlaying
                    ? 'bg-gradient-to-t from-pink-500 via-purple-500 to-indigo-400'
                    : 'bg-slate-700 h-1.5'
                }`}
                style={{
                  height: isPlaying ? `${Math.max(15, height * (isPlaying ? 1 : 0.2))}%` : '4px',
                  animationDelay: `${i * 0.08}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 2. Studio Navigation Tabs: Voice, Music, Echo/Delay, Singing Assistants */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md shadow-pink-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>ផ្ទាំងបញ្ជាសរុប (All Controls)</span>
          </button>

          <button
            onClick={() => setActiveTab('voice')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'voice'
                ? 'bg-pink-600 text-white shadow-md shadow-pink-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-pink-400" />
            <span>Voice Setting (សំឡេងច្រៀង)</span>
          </button>

          <button
            onClick={() => setActiveTab('music')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'music'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Music className="w-3.5 h-3.5 text-purple-400" />
            <span>Music Setting (ភ្លេង)</span>
          </button>

          <button
            onClick={() => setActiveTab('fx')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'fx'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Waves className="w-3.5 h-3.5 text-indigo-400" />
            <span>Echo & Delay (អេកូ & ឌីឡេ)</span>
          </button>

          <button
            onClick={() => setActiveTab('assistant')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'assistant'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>ជំនួយការច្រៀង (Singing Assistants)</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
          🎛️ Real-Time Audio DSP Rack
        </span>
      </div>

      {/* 3. Panel Grid - Responsive & Tab Filtered */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* ======================================================== */}
        {/* CARD 1: VOICE SETTING (សំឡេងច្រៀង & អ្នកចម្រៀងដើម) */}
        {/* ======================================================== */}
        {(activeTab === 'all' || activeTab === 'voice') && (
          <div className="flex flex-col justify-between p-4 rounded-xl bg-slate-900/70 border border-slate-800/90 hover:border-pink-500/40 transition-all space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-pink-500/20 text-pink-400">
                    <Mic className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                    Voice Setting (សំឡេងច្រៀង)
                  </span>
                </div>
                <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                  isVocalOn ? 'bg-pink-950 text-pink-300 border border-pink-500/30' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {isVocalOn ? `${Math.round(vocalVolume * 100)}% Guide` : 'MUTED (ច្រៀងសុទ្ធ)'}
                </span>
              </div>

              {/* 3-Mode Audio Selector: Instrumental / Vocals Only / Original */}
              <div className="space-y-1.5 mb-3">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">របៀបចាក់សំឡេង (Audio Mode):</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAudioMode && setAudioMode('instrumental')}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer border ${
                      audioMode === 'instrumental'
                        ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                        : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Music className="w-3.5 h-3.5" />
                    <span>ភ្លេងសុទ្ធ</span>
                    <span className="text-[9px] opacity-80">(No Vocals)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudioMode && setAudioMode('vocals')}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer border ${
                      audioMode === 'vocals'
                        ? 'bg-pink-600 border-pink-400 text-white shadow-lg shadow-pink-500/20'
                        : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>សំឡេងច្រៀង</span>
                    <span className="text-[9px] opacity-80">(Vocals Only)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudioMode && setAudioMode('original')}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer border ${
                      audioMode === 'original'
                        ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-500/20'
                        : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>សំឡេងដើម</span>
                    <span className="text-[9px] opacity-80">(Original)</span>
                  </button>
                </div>
              </div>

              {/* Main Vocal Toggle Button */}
              <button
                onClick={toggleVocals}
                className={`relative flex items-center justify-center gap-2.5 w-full py-3.5 px-4 rounded-xl font-bold text-xs tracking-wide transition-all shadow-lg cursor-pointer ${
                  isVocalOn
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-pink-500/30 hover:brightness-110 ring-2 ring-pink-400/50'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20 ring-2 ring-emerald-400/40'
                }`}
              >
                {isVocalOn ? (
                  <>
                    <Mic className="w-4 h-4 animate-bounce" />
                    <span>VOCALS: ON (មានសំឡេងដើមនាំមុខ)</span>
                  </>
                ) : (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>VOCALS: MUTED (ខារ៉ាអូខេច្រៀងសុទ្ធ 100%)</span>
                  </>
                )}
              </button>

              {/* Dedicated Download Buttons for Separated Tracks */}
              {selectedVideoId && (
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5 mt-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold">
                    <span className="flex items-center gap-1.5 text-cyan-300">
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span>ទាញយកបទចម្រៀង (Download Audio)</span>
                    </span>
                    <span className="text-[9px] text-emerald-400 font-mono">WAV</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <a
                      href={apiUrl(`/api/download/${selectedVideoId}/instrumental`)}
                      download
                      className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer text-center"
                      title="ទាញយកភ្លេងសុទ្ធឥតសំឡេងច្រៀង (no_vocals.wav)"
                    >
                      <Download className="w-3 h-3 shrink-0" />
                      <span>ភ្លេងសុទ្ធ (Instrumental)</span>
                    </a>
                    <a
                      href={apiUrl(`/api/download/${selectedVideoId}/vocals`)}
                      download
                      className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-pink-600/90 hover:bg-pink-500 text-white text-[10px] font-bold shadow-md shadow-pink-500/20 transition-all cursor-pointer text-center"
                      title="ទាញយកសំឡេងច្រៀងសុទ្ធ (vocals.wav)"
                    >
                      <Download className="w-3 h-3 shrink-0" />
                      <span>សំឡេងច្រៀង (Vocals)</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Vocal Volume Slider */}
              <div className="mt-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>កម្រិតសំឡេងអ្នកចម្រៀង (Guide Vocal Volume):</span>
                  <span className="font-mono text-pink-400 font-bold">
                    {isVocalOn ? `${Math.round(vocalVolume * 100)}%` : '0% (Muted)'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={vocalVolume}
                  disabled={!audioLoaded || !isVocalOn}
                  onChange={(e) => setVocalVolume(parseFloat(e.target.value))}
                  className={`w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500 focus:outline-none ${
                    !audioLoaded || !isVocalOn ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                />
              </div>

              {/* Quick Vocal Presets */}
              {audioLoaded && isVocalOn && (
                <div className="grid grid-cols-4 gap-1.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setVocalVolume(0.0)}
                    className="px-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 text-center font-mono cursor-pointer"
                    title="បិទសំឡេង 0%"
                  >
                    0% Mute
                  </button>
                  <button
                    type="button"
                    onClick={() => setVocalVolume(0.10)}
                    className="px-1 py-1 rounded bg-pink-950/90 hover:bg-pink-900 border border-pink-500/40 text-[10px] text-pink-300 text-center font-bold font-mono cursor-pointer"
                    title="បាត់សំឡេងចាល 90% (ឮខ្សឹបៗ 10% ជួយកុំឱ្យភ្លេចទំនុក)"
                  >
                    -90% (10%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setVocalVolume(0.25)}
                    className="px-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 text-center font-mono cursor-pointer"
                    title="សំឡេងអ្នកចម្រៀងកម្រិតស្រាល 25%"
                  >
                    25%
                  </button>
                  <button
                    type="button"
                    onClick={() => setVocalVolume(1.0)}
                    className="px-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 text-center font-mono cursor-pointer"
                    title="សំឡេងអ្នកចម្រៀងពេញ 100%"
                  >
                    100%
                  </button>
                </div>
              )}
            </div>

            <span className="text-[11px] text-slate-400">
              💡 គន្លឹះ៖ ជ្រើសរើស <strong className="text-pink-300">-90% (10%)</strong> ដើម្បីឱ្យឮសំឡេងដើមខ្សឹបៗជួយកុំឱ្យច្រៀងខុសទំនុក។
            </span>
          </div>
        )}

        {/* ======================================================== */}
        {/* CARD 2: MUSIC SETTING (ការកំណត់ភ្លេង) */}
        {/* ======================================================== */}
        {(activeTab === 'all' || activeTab === 'music') && (
          <div className="flex flex-col justify-between p-4 rounded-xl bg-slate-900/70 border border-slate-800/90 hover:border-purple-500/40 transition-all space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                    <Music className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                    Music Setting (ភ្លេង)
                  </span>
                </div>
                <span className="text-[11px] font-mono text-purple-400 font-bold px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/30">
                  {Math.round(instVolume * 100)}%
                </span>
              </div>

              {/* Music Volume Slider */}
              <div className="space-y-1.5 mt-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>កម្រិតសំឡេងភ្លេង (Instrumental Volume):</span>
                  <div className="flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                    <span className="font-mono text-purple-400 font-bold">{Math.round(instVolume * 100)}%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={instVolume}
                  onChange={(e) => setInstVolume(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500 focus:outline-none"
                />
              </div>

              {/* Speed Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-slate-400" />
                    <span>ល្បឿនចង្វាក់ភ្លេង (Playback Tempo):</span>
                  </span>
                  <span className="font-mono font-bold text-pink-400">{playbackRate}x</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { rate: 0.8, label: '0.8x (យឺតស្រួលហាត់)' },
                    { rate: 1.0, label: '1.0x (ធម្មតា)' },
                    { rate: 1.2, label: '1.2x (ញាប់/កន្ត្រាក់)' },
                  ].map((item) => (
                    <button
                      key={item.rate}
                      type="button"
                      onClick={() => onChangePlaybackRate && onChangePlaybackRate(item.rate)}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                        playbackRate === item.rate
                          ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-500/20'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <span className="text-[11px] text-slate-400">
              🎵 ភ្លេងត្រូវបានបំបែកដោយ Demucs Neural Network និងកែសម្រួលដោយ Real-Time Web Audio DSP។
            </span>
          </div>
        )}

        {/* ======================================================== */}
        {/* CARD 3: ECHO & DELAY (អេកូ និង ឌីឡេ - LIVE MIC STUDIO) */}
        {/* ======================================================== */}
        {(activeTab === 'all' || activeTab === 'fx') && (
          <div className="flex flex-col justify-between p-4 rounded-xl bg-slate-900/70 border border-slate-800/90 hover:border-indigo-500/40 transition-all space-y-4">
            <div>
              {/* Headphone Karaoke Monitoring Notice & Quick Toggle */}
              <div className={`p-3 rounded-xl border mb-3 transition-all ${
                isHeadphonesConnected
                  ? 'bg-emerald-950/40 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                  : 'bg-amber-950/30 border-amber-500/40'
              }`}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Headphones className={`w-4 h-4 ${isHeadphonesConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
                    <span className="text-xs font-bold text-white">
                      {isHeadphonesConnected ? '🎧 កាសសកម្ម (Headphones Ready)' : '🎧 តម្រូវឱ្យប្រើកាស (Headphones)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleHeadphones && toggleHeadphones()}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                      isHeadphonesConnected
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-md'
                    }`}
                  >
                    {isHeadphonesConnected ? 'កាស ON' : 'ខ្ញុំបានដោតកាសហើយ'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {isHeadphonesConnected
                    ? '✨ សំឡេងច្រៀងតាម Mic និងភ្លេងរត់ចូលកាសជាមួយគ្នា 100% គ្មានសំឡេងចាល Echo!'
                    : '💡 សូមដោតកាសទូរស័ព្ទដើម្បីច្រៀងលឺសំឡេងខ្លួនឯង និងភ្លេងរត់ចូលកាសជាមួយគ្នា ដោយមិនខ្ទរចាលសំឡេង។'}
                </p>
              </div>

              {/* KTV Voice Studio PRO Shortcut Banner */}
              {onOpenVoiceStudio && (
                <button
                  type="button"
                  onClick={onOpenVoiceStudio}
                  className="w-full mb-3 flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/70 via-indigo-950/70 to-cyan-950/70 border border-purple-500/50 hover:border-purple-400 text-white shadow-xl shadow-purple-500/15 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-600/40 text-purple-300 border border-purple-500/30 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-md">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white group-hover:text-purple-200">
                          KTV Voice Studio PRO
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-purple-500/30 text-purple-300 border border-purple-400/40 uppercase">
                          AI Auto-Tune & Presets
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300 line-clamp-1">
                        បើកផ្ទាំង Studio អាជីព: Auto-Tune, 8 Presets, 3-Band EQ, Reverb, Echo & Record
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition-transform shrink-0 pl-2">
                    បើក Studio &rarr;
                  </span>
                </button>
              )}

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                    <Waves className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                    Echo & Delay (អេកូ & ឌីឡេ)
                  </span>
                </div>

                {/* Mic Switch */}
                <button
                  onClick={toggleMic}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    isMicActive
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 animate-pulse'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  {isMicActive ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                  <span>{isMicActive ? 'MIC ON' : 'បើក MIC'}</span>
                </button>
              </div>

              {/* Vocal Latency & Echo Mode Switch (Real-Time 0ms vs Echo) */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 mb-2">
                <div className="flex items-center gap-2">
                  <Zap className={`w-4 h-4 ${!isEchoOn ? 'text-amber-400' : 'text-slate-500'}`} />
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      {!isEchoOn ? '⚡ សំឡេងផ្ទាល់ (Real-Time 0ms មិន Slow)' : '🌊 សំឡេងអេកូ (Echo Studio)'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {!isEchoOn ? 'សំឡេងលឺភ្លាមៗ គ្មាន delay គ្មាន slow' : 'អេកូបែប Studio Reverb ស្រទន់'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsEchoOn && setIsEchoOn(false)}
                    className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${
                      !isEchoOn
                        ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ⚡ 0ms ផ្ទាល់
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEchoOn && setIsEchoOn(true)}
                    className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${
                      isEchoOn
                        ? 'bg-indigo-600 text-white font-bold shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🌊 អេកូ
                  </button>
                </div>
              </div>

              {/* Noise Cut Filter Toggle (កាត់ Noise & Hiss) */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 mb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className={`w-4 h-4 ${isNoiseCutActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">កាត់ Noise & Hiss (សំឡេងរំខាន)</span>
                    <span className="text-[10px] text-slate-400">កាត់សំឡេងខ្យល់ & រលកសម្លេងអគ្គិសនីចោល</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleNoiseCut && toggleNoiseCut()}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all ${
                    isNoiseCutActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isNoiseCutActive ? 'កាត់ NOISE: ON' : 'OFF'}
                </button>
              </div>

              {/* Keep Music Normal (No Ducking) Toggle */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 mb-3">
                <div className="flex items-center gap-2">
                  <Volume2 className={`w-4 h-4 ${keepMusicNormal ? 'text-pink-400' : 'text-slate-500'}`} />
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">រក្សាសំឡេងភ្លេងធម្មតា (មិនបន្ថយភ្លេង)</span>
                    <span className="text-[10px] text-slate-400">មិនទម្លាក់ ឬបន្ថយសំឡេងភ្លេងឡើយពេលច្រៀងចូល Mic</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleKeepMusicNormal && toggleKeepMusicNormal()}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all ${
                    keepMusicNormal
                      ? 'bg-pink-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title="កុំឱ្យ Browser ឬ Windows បន្ថយសំឡេងភ្លេងពេលច្រៀង"
                >
                  {keepMusicNormal ? 'ភ្លេងធម្មតា: ON' : 'OFF'}
                </button>
              </div>

              {/* Echo Level Slider */}
              <div className="space-y-1.5 mb-3">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>កម្រិតអេកូ (Echo Feedback Wetness):</span>
                  <span className="font-mono text-indigo-400 font-bold">
                    {isEchoOn ? `${Math.round(echoLevel * 100)}%` : 'OFF'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.85"
                  step="0.05"
                  value={echoLevel}
                  disabled={!isEchoOn}
                  onChange={(e) => setEchoLevel && setEchoLevel(parseFloat(e.target.value))}
                  className={`w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none ${
                    !isEchoOn ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                />
              </div>

              {/* Delay Time Slider */}
              <div className="space-y-1.5 mb-3">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>ពេលវេលាឌីឡេ (Delay Time):</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {Math.round(delayTime * 1000)} ms
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.60"
                  step="0.01"
                  value={delayTime}
                  disabled={!isEchoOn}
                  onChange={(e) => setDelayTime && setDelayTime(parseFloat(e.target.value))}
                  className={`w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 focus:outline-none ${
                    !isEchoOn ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                />
              </div>

              {/* Presets for Echo & Delay */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-slate-400 block font-semibold">ម៉ូតអេកូពេញនិយម (Presets):</span>
                <div className="grid grid-cols-4 gap-1">
                  <button
                    type="button"
                    onClick={() => setEchoPreset && setEchoPreset('room')}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-mono text-center cursor-pointer"
                    title="បន្ទប់ធម្មតា (120ms / 25%)"
                  >
                    Room
                  </button>
                  <button
                    type="button"
                    onClick={() => setEchoPreset && setEchoPreset('karaoke')}
                    className="p-1 rounded bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/40 text-[10px] text-indigo-300 font-mono font-bold text-center cursor-pointer"
                    title="បន្ទប់ខារ៉ាអូខេ (220ms / 40%)"
                  >
                    Karaoke
                  </button>
                  <button
                    type="button"
                    onClick={() => setEchoPreset && setEchoPreset('concert')}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-mono text-center cursor-pointer"
                    title="ឆាកតន្ត្រី Concert (350ms / 55%)"
                  >
                    Concert
                  </button>
                  <button
                    type="button"
                    onClick={() => setEchoPreset && setEchoPreset('space')}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-mono text-center cursor-pointer"
                    title="អេកូវែង Space (480ms / 70%)"
                  >
                    Space
                  </button>
                </div>
              </div>

              {/* Mic Gain Slider & Studio Vocal Booster */}
              {isMicActive && (
                <div className="mt-3 pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span className="font-semibold flex items-center gap-1.5">
                      <span>កម្រិតសំឡេងម៉ៃក្រូហ្វូន (Mic Boost):</span>
                      {micVolume >= 1.7 && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-500/40 text-[9px] font-bold">
                          សំឡេងពេញ (Full)
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-rose-400 font-bold text-xs">{Math.round(micVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3.0"
                    step="0.05"
                    value={micVolume}
                    onChange={(e) => setMicVolume && setMicVolume(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />

                  {/* Quick Vocal Boost Presets */}
                  <div className="grid grid-cols-3 gap-1 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setMicBoostPreset ? setMicBoostPreset('normal') : setMicVolume(1.0)}
                      className={`p-1 rounded text-[10px] font-mono cursor-pointer transition-all ${
                        Math.round(micVolume * 100) === 100
                          ? 'bg-rose-950 border border-rose-500 text-rose-300 font-bold'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      100% ធម្មតា
                    </button>
                    <button
                      type="button"
                      onClick={() => setMicBoostPreset ? setMicBoostPreset('full') : setMicVolume(1.8)}
                      className={`p-1 rounded text-[10px] font-mono cursor-pointer transition-all ${
                        Math.round(micVolume * 100) === 180
                          ? 'bg-rose-950 border border-rose-500 text-rose-300 font-bold'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      180% សំឡេងពេញ
                    </button>
                    <button
                      type="button"
                      onClick={() => setMicBoostPreset ? setMicBoostPreset('boost') : setMicVolume(2.5)}
                      className={`p-1 rounded text-[10px] font-mono cursor-pointer transition-all ${
                        Math.round(micVolume * 100) === 250
                          ? 'bg-rose-950 border border-rose-500 text-rose-300 font-bold'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      250% បំពងខ្លាំង
                    </button>
                  </div>
                </div>
              )}

              {micError && (
                <p className="text-xs text-rose-400 mt-2">
                  Microphone Error: {micError}. Please allow microphone permission.
                </p>
              )}
            </div>

            <span className="text-[11px] text-slate-400">
              🎙️ ប្រើកាស (Headphones) ពេលបើក Mic ដើម្បីជៀសវាងសំឡេងចាល feedback ចូលម៉ៃក្រូហ្វូន។
            </span>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 4. SINGING ASSISTANT SUITE (មុខងារជំនួយការច្រៀងពិសេសៗ) */}
      {/* ======================================================== */}
      {(activeTab === 'all' || activeTab === 'assistant') && (
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                មុខងារជំនួយការច្រៀង និងឧបករណ៍ថតចម្រៀង (Singing Assistant Suite)
              </span>
            </div>
            <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              4 មុខងារជំនួយការពិសេស
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Assistant Feature 1: Auto Vocal Cut */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                    <Zap className="w-4 h-4 text-purple-400" />
                    <span>Auto Vocal Cut</span>
                  </div>
                  {toggleAutoVocalCut && (
                    <button
                      onClick={toggleAutoVocalCut}
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-bold cursor-pointer transition-all ${
                        isAutoVocalCutActive
                          ? 'bg-purple-950 border-purple-500 text-purple-300 shadow-sm'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {isAutoVocalCutActive ? 'ON' : 'OFF'}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  កាត់សំឡេងច្រៀងអូតូភ្លាមៗ <strong>0 វិនាទី</strong> (Phase Inversion) ច្រៀងបានភ្លាមដោយមិនបាច់ចាំ AI បំបែកភ្លេងយូរ។
                </p>
              </div>
            </div>

            {/* Assistant Feature 2: De-Bleed Filter */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>AI De-Bleed Filter</span>
                  </div>
                  {toggleDeBleed && (
                    <button
                      onClick={toggleDeBleed}
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-bold cursor-pointer transition-all ${
                        isDeBleedActive
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {isDeBleedActive ? 'ON' : 'OFF'}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  កម្ចាត់សំឡេងខ្សឹបដែលជ្រាបចូលក្នុងភ្លេង (Notch Filters 1.8kHz/3.1kHz) ធ្វើឱ្យភ្លេងកាន់តែស្អាត crisp & clear។
                </p>
              </div>
            </div>

            {/* Assistant Feature 3: 1-2-3 Vocal Countdown */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-pink-300">
                    <Activity className="w-4 h-4 text-pink-400" />
                    <span>1-2-3 Countdown</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-950 border border-pink-500/40 text-pink-300 font-bold">
                    ACTIVE
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  រាប់លេខ <strong>1 2 3</strong> មុនពេលចូលច្រៀង (Intro & Solo Break) ជួយឱ្យចូលចង្វាក់ត្រូវ 100% មិនខុសបន្តិចណាឡើយ។
                </p>
              </div>
            </div>

            {/* Assistant Feature 4: Karaoke Performance Recording Studio */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
                    <CircleDot className={`w-3.5 h-3.5 ${isRecording ? 'text-rose-500 animate-ping' : 'text-rose-400'}`} />
                    <span>ថតសំឡេងច្រៀង (Recorder)</span>
                  </div>
                  {isRecording && (
                    <span className="text-[10px] font-mono text-rose-400 font-bold bg-rose-950 border border-rose-500/40 px-1.5 py-0.5 rounded animate-pulse">
                      REC {formatTime(recordingSeconds)}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                  ថតសំឡេងច្រៀងរបស់អ្នកបញ្ចូលគ្នាជាមួយភ្លេងខារ៉ាអូខេ និងទាញយកទុកស្ដាប់បានភ្លាមៗ។
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={!audioLoaded}
                    className={`flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg text-[11px] font-bold transition-all shadow-md cursor-pointer ${
                      !audioLoaded
                        ? 'bg-slate-800/60 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20'
                    }`}
                  >
                    <CircleDot className="w-3.5 h-3.5 fill-current" />
                    <span>ចាប់ផ្តើមថត</span>
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/40 text-[11px] font-bold transition-all cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>បញ្ឈប់ការថត</span>
                  </button>
                )}

                {recordedAudioUrl && !isRecording && (
                  <a
                    href={recordedAudioUrl}
                    download="my-karaoke-performance.webm"
                    className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-md shadow-emerald-500/30 transition-all cursor-pointer shrink-0"
                    title="ទាញយកបទចម្រៀងដែលបានថតរួច"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
