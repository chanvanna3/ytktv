import React from 'react';
import { Sparkles, Loader2, Disc3, ShieldCheck, Cpu, Zap, Play } from 'lucide-react';

export function ProcessingModal({
  isOpen,
  statusMessage,
  videoTitle,
  progress = 10,
  stage = 'downloading',
  onStartInstantAutoVocalCut,
  isInstantCutLoading = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg p-7 rounded-3xl glass-panel border border-pink-500/30 shadow-2xl text-center space-y-6 bg-slate-900/95 relative overflow-hidden">
        {/* Glow ambient background effect */}
        <div className="absolute -top-20 -left-20 w-44 h-44 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Central Animated AI Hologram Disk */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center pt-1">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-pink-500/30 to-purple-500/30 animate-ping" />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-cyan-400 p-0.5 shadow-xl shadow-pink-500/30 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Disc3 className="w-10 h-10 text-pink-400 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
          </div>
        </div>

        {/* Title & Badge */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-300 text-xs font-semibold">
            <Cpu className="w-3.5 h-3.5 text-pink-400" />
            <span>AI Demucs High-Precision Engine</span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-100 tracking-tight">
            សូមរង់ចាំបន្តិច AI កំពុងបំប្លែងភ្លេងខារ៉ាអូខេ...
          </h3>
          <p className="text-xs text-slate-400 line-clamp-1 px-4">
            {videoTitle || 'កំពុងដំណើរការបទចម្រៀង YouTube...'}
          </p>
        </div>

        {/* Animated Progress Bar & Percentage */}
        <div className="space-y-2.5 px-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-400" />
              <span>{statusMessage || 'AI កំពុងដំណើរការ...'}</span>
            </span>
            <span className="text-pink-400 font-extrabold text-sm tracking-wider">
              {Math.min(100, Math.max(0, Math.round(progress)))}%
            </span>
          </div>

          <div className="w-full bg-slate-800/90 rounded-full h-3 p-0.5 overflow-hidden border border-slate-700/60 shadow-inner">
            <div
              className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 h-full rounded-full transition-all duration-300 ease-out shadow-lg shadow-pink-500/40 relative"
              style={{ width: `${Math.min(100, Math.max(8, progress))}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
            </div>
          </div>
        </div>

        {/* Dynamic 4-Step Process Indicator */}
        <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800/90 text-left space-y-2.5 text-xs">
          <div className={`flex items-center gap-2.5 transition-colors ${
            progress >= 35 ? 'text-emerald-400 font-medium' : stage === 'downloading' ? 'text-pink-300 font-semibold' : 'text-slate-500'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              progress >= 35 ? 'bg-emerald-400' : stage === 'downloading' ? 'bg-pink-400 animate-ping' : 'bg-slate-700'
            }`} />
            <span>ជំហានទី ១: Downloading audio... ({progress >= 35 ? 'រួចរាល់' : 'កំពុងទាញយក...'})</span>
          </div>

          <div className={`flex items-center gap-2.5 transition-colors ${
            progress >= 90 ? 'text-emerald-400 font-medium' : stage === 'separating' ? 'text-purple-300 font-semibold' : 'text-slate-500'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              progress >= 90 ? 'bg-emerald-400' : stage === 'separating' ? 'bg-purple-400 animate-ping' : 'bg-slate-700'
            }`} />
            <span>ជំហានទី ២: Separating vocals with AI (Demucs Neural Network)</span>
          </div>

          <div className={`flex items-center gap-2.5 transition-colors ${
            progress >= 95 ? 'text-emerald-400 font-medium' : stage === 'ready_to_sing' ? 'text-emerald-300 font-semibold' : 'text-slate-500'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              progress >= 95 ? 'bg-emerald-400' : 'bg-slate-700'
            }`} />
            <span>ជំហានទី ៣: Vocal cut completed! Ready to sing / download instrumental.</span>
          </div>

          <div className={`flex items-center gap-2.5 transition-colors ${
            progress >= 100 ? 'text-emerald-400 font-bold' : 'text-slate-500'
          }`}>
            <div className={`w-2 h-2 rounded-full ${progress >= 100 ? 'bg-emerald-400' : 'bg-slate-700'}`} />
            <span>ជំហានទី ៤: រួចរាល់ ១០០%! ភ្លេងសុទ្ធ និងអក្សរចម្រៀងបានភ្ជាប់គ្នាជោគជ័យ</span>
          </div>
        </div>

        {/* Action Button: Check & Sing with Separated Instrumental */}
        {onStartInstantAutoVocalCut && (
          <div className="pt-1">
            <button
              onClick={onStartInstantAutoVocalCut}
              disabled={isInstantCutLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs tracking-wide transition-all shadow-lg shadow-purple-500/30 cursor-pointer disabled:opacity-75"
            >
              {isInstantCutLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                  <span>AI កំពុងបំបែកភ្លេងសុទ្ធ (Demucs AI Separation)... សូមរង់ចាំបន្តិច</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current text-amber-300" />
                  <span>⚡ ចូលច្រៀងភ្លាមៗជាមួយភ្លេងសុទ្ធ (Instrumental Track)</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-slate-400 mt-2">
              ភ្លេងសុទ្ធ (no_vocals.wav) ត្រូវបំបែកដាច់ពីសំឡេងច្រៀងដោយ AI Demucs 100%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
