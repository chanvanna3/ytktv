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
            <span>ជំហានទី ១: ទាញយកសំឡេងកម្រិតច្បាស់ពី YouTube ({progress >= 35 ? 'រួចរាល់' : 'កំពុងទាញយក...'})</span>
          </div>

          <div className={`flex items-center gap-2.5 transition-colors ${
            progress >= 75 ? 'text-emerald-400 font-medium' : stage === 'separating' ? 'text-purple-300 font-semibold' : 'text-slate-500'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              progress >= 75 ? 'bg-emerald-400' : stage === 'separating' ? 'bg-purple-400 animate-ping' : 'bg-slate-700'
            }`} />
            <span>ជំហានទី ២: កាត់សំឡេងច្រៀងចេញ 95%+ ដោយ AI Demucs Neural Network</span>
          </div>

          <div className={`flex items-center gap-2.5 transition-colors ${
            progress >= 98 ? 'text-emerald-400 font-medium' : stage === 'transcribing' ? 'text-cyan-300 font-semibold' : 'text-slate-500'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              progress >= 98 ? 'bg-emerald-400' : stage === 'transcribing' ? 'bg-cyan-400 animate-ping' : 'bg-slate-700'
            }`} />
            <span>ជំហានទី ៣: AI Whisper ស្តាប់ & Transcribe អក្សរខ្មែរ (🇰🇭 Cambodia / Khmer)</span>
          </div>

          <div className={`flex items-center gap-2.5 transition-colors ${
            progress >= 100 ? 'text-emerald-400 font-bold' : 'text-slate-500'
          }`}>
            <div className={`w-2 h-2 rounded-full ${progress >= 100 ? 'bg-emerald-400' : 'bg-slate-700'}`} />
            <span>ជំហានទី ៤: រួចរាល់ ១០០%! ចូលច្រៀងខារ៉ាអូខេភ្លាមៗជាមួយអក្សររត់</span>
          </div>
        </div>

        {/* Instant Auto-Vocal Cut Option (ច្រៀងភ្លាមៗកាត់សម្លេងអូតូ មិនបាច់រង់ចាំ) */}
        {onStartInstantAutoVocalCut && (
          <div className="pt-1">
            <button
              onClick={onStartInstantAutoVocalCut}
              disabled={isInstantCutLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs tracking-wide transition-all shadow-lg shadow-purple-500/30 cursor-pointer disabled:opacity-75"
            >
              {isInstantCutLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                  <span>កំពុងរៀបចំសំឡេងភ្លាមៗ... (សូមរង់ចាំប្រហែល ២ វិនាទី)</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current text-amber-300" />
                  <span>⚡ ច្រៀងជាមួយ Auto Vocal Cut ភ្លាមៗ (កាត់សម្លេងច្រៀងអូតូ - មិនបាច់រង់ចាំ)</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-slate-400 mt-2">
              អាចចូលច្រៀងភ្លាមៗជាមួយមុខងារកាត់សម្លេងច្រៀងអូតូ ខណៈពេល AI បន្តបំបែកភ្លេងសុទ្ធនៅខាងក្រោយ!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
