import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Mic2,
  Music,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Play,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Cpu,
  GripVertical,
  Layers,
  Smartphone,
  Edit3,
  SlidersHorizontal,
  RotateCcw,
  Mic,
  MicOff,
  Waves,
  CircleDot,
  X,
  Zap,
  ShieldCheck,
  Headphones,
} from 'lucide-react';
import { useYouTubePlayer } from './hooks/useYouTubePlayer';
import { useAudioSync } from './hooks/useAudioSync';
import { useLiveMicrophone } from './hooks/useLiveMicrophone';
import { useVoiceStudioPro } from './hooks/useVoiceStudioPro';
import { useKaraokeStudio } from './hooks/useKaraokeStudio';
import { SearchAndInput } from './components/SearchAndInput';
import { KaraokePlayer } from './components/KaraokePlayer';
import { KaraokeControls } from './components/KaraokeControls';
import { KaraokeLyrics } from './components/KaraokeLyrics';
import { ProcessingModal } from './components/ProcessingModal';
import { KtvVoiceStudioPro } from './components/KtvVoiceStudioPro';
import { apiUrl } from './utils/api';

export function App() {
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [stems, setStems] = useState({ instrumentalUrl: null, vocalsUrl: null });

  // Processing state for "Process First, Sing When Ready" workflow
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('សូមរង់ចាំបន្តិច AI កំពុងរៀបចំ...');
  const [processingProgress, setProcessingProgress] = useState(10);
  const [processingStage, setProcessingStage] = useState('downloading');
  const [apiError, setApiError] = useState(null);
  const [playbackRate, setPlaybackRateState] = useState(1.0);
  const [isInstantCutLoading, setIsInstantCutLoading] = useState(false);
  const [externalSearchQuery, setExternalSearchQuery] = useState('');
  const [isVoiceStudioOpen, setIsVoiceStudioOpen] = useState(false);

  // References
  const searchSectionRef = useRef(null);
  const playerSectionRef = useRef(null);
  const pollingTimerRef = useRef(null);
  const directAudioUrlRef = useRef(null);

  // Layer Management (Drag & Drop, Reorder, Tabs & Dropdown, Edit)
  // Default layer IDs: 'player' (Video), 'lyrics' (Karaoke Lyrics), 'controls' (Audio Studio Rack)
  const [layersOrder, setLayersOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('karaoke_layers_order');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return ['player', 'lyrics', 'controls'];
  });

  const [activeMobileTab, setActiveMobileTab] = useState('all'); // 'all' | 'lyrics' | 'player' | 'controls'
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draggedLayerId, setDraggedLayerId] = useState(null);
  const [dragOverLayerId, setDragOverLayerId] = useState(null);
  const [externalEditTrigger, setExternalEditTrigger] = useState(0);

  // Mobile Studio Settings Drawer State (ដាក់ Setting ចូលក្នុង Menu លើ Mobile App)
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);
  const [mobileDrawerTab, setMobileDrawerTab] = useState('voice'); // 'voice' | 'music' | 'echo' | 'assistant'

  // Move a layer up or down
  const moveLayer = (id, direction) => {
    setLayersOrder((prev) => {
      const index = prev.indexOf(id);
      if (index === -1) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const newOrder = [...prev];
      const [moved] = newOrder.splice(index, 1);
      newOrder.splice(targetIndex, 0, moved);
      try {
        localStorage.setItem('karaoke_layers_order', JSON.stringify(newOrder));
      } catch (e) {}
      return newOrder;
    });
  };

  const handleDragStart = (e, id) => {
    setDraggedLayerId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverLayerId !== id) {
      setDragOverLayerId(id);
    }
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    const sourceId = draggedLayerId || e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) {
      setDraggedLayerId(null);
      setDragOverLayerId(null);
      return;
    }
    setLayersOrder((prev) => {
      const sourceIndex = prev.indexOf(sourceId);
      const targetIndex = prev.indexOf(targetId);
      if (sourceIndex === -1 || targetIndex === -1) return prev;
      const newOrder = [...prev];
      const [removed] = newOrder.splice(sourceIndex, 1);
      newOrder.splice(targetIndex, 0, removed);
      try {
        localStorage.setItem('karaoke_layers_order', JSON.stringify(newOrder));
      } catch (e) {}
      return newOrder;
    });
    setDraggedLayerId(null);
    setDragOverLayerId(null);
  };

  const applyPresetLayout = (preset) => {
    let newOrder = ['player', 'lyrics', 'controls'];
    if (preset === 'karaoke') {
      newOrder = ['lyrics', 'player', 'controls']; // Lyrics on top for mobile singing!
    } else if (preset === 'cinema') {
      newOrder = ['player', 'lyrics', 'controls'];
    } else if (preset === 'studio') {
      newOrder = ['controls', 'lyrics', 'player'];
    }
    setLayersOrder(newOrder);
    try {
      localStorage.setItem('karaoke_layers_order', JSON.stringify(newOrder));
    } catch (e) {}
  };

  const handleSearchAlternative = useCallback((query) => {
    setExternalSearchQuery(query);
    if (searchSectionRef.current) {
      searchSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Mutable ref to bridge YT state events into the audio sync hook
  const audioStateChangeHandlerRef = useRef(null);

  const onYTStateChange = useCallback((state) => {
    if (audioStateChangeHandlerRef.current) {
      audioStateChangeHandlerRef.current(state);
    }
  }, []);

  // 1. YouTube IFrame Player wrapper hook (Strictly permanently muted)
  const {
    playerRef,
    containerId,
    isPlayerReady,
    playerError,
    playerState,
    playVideo,
    pauseVideo,
    seekTo,
    setPlaybackRate,
  } = useYouTubePlayer({
    videoId: selectedVideoId,
    onStateChange: onYTStateChange,
  });

  // 2. Synchronized audio tracks engine hook (HT-Demucs FT dual tracks)
  const {
    audioMode,
    setAudioMode,
    isVocalOn,
    setIsVocalOn,
    toggleVocals,
    instVolume,
    setInstVolume,
    vocalVolume,
    setVocalVolume,
    audioLoaded,
    currentDriftMs,
    playbackTime,
    audioDuration,
    instAudioElement,
    handlePlayerStateChange,
    seekAudio,
    stopAudio,
  } = useAudioSync({
    instrumentalUrl: stems.instrumentalUrl,
    vocalsUrl: stems.vocalsUrl,
    playerRef: playerRef,
    isPlayerReady: isPlayerReady,
  });

  // 3. KTV Voice Studio PRO Hook (Live Mic, Auto-Tune, 3-Band EQ, Reverb & Echo)
  const micEngine = useVoiceStudioPro({
    karaokeAudioElement: instAudioElement,
  });

  const handleSeek = useCallback((seconds) => {
    if (seekTo) seekTo(seconds);
    if (seekAudio) seekAudio(seconds);
  }, [seekTo, seekAudio]);

  // Connect the handler ref
  audioStateChangeHandlerRef.current = handlePlayerStateChange;

  // 4. Karaoke Audio Studio Hook (Vocal De-Bleed 90%+ Filter & Performance Recording)
  const studioEngine = useKaraokeStudio({
    audioElement: instAudioElement,
    micStream: micEngine.micStream,
  });

  const handleChangePlaybackRate = (rate) => {
    setPlaybackRateState(rate);
    setPlaybackRate(rate);
  };

  // Clear polling on unmount
  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, []);

  // Auto-play when stems are loaded and ready
  useEffect(() => {
    if (audioLoaded && !isProcessing && isPlayerReady) {
      // Auto-start karaoke once 100% ready
      playVideo();
    }
  }, [audioLoaded, isProcessing, isPlayerReady, playVideo]);

  // Handle Video Selection: Enforces "Process First, Sing When Ready" workflow
  const handleSelectVideo = async (videoId, title = '') => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }

    // Instantly terminate and unload any previously playing song audio!
    stopAudio();
    directAudioUrlRef.current = null;
    studioEngine.setAutoVocalCut(false);

    setApiError(null);
    setSelectedVideoId(videoId);
    setVideoTitle(title || `YouTube Video (${videoId})`);
    setStems({ instrumentalUrl: null, vocalsUrl: null });
    setIsProcessing(true);
    setProcessingProgress(15);
    setProcessingStage('downloading');
    setProcessingMessage('កំពុងទាញយកសំឡេងពី YouTube...');

    // Pause video while processing so unseparated audio never plays
    pauseVideo();

    // Smoothly scroll down to player area
    setTimeout(() => {
      if (playerSectionRef.current) {
        playerSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);

    try {
      const response = await fetch(apiUrl('/api/process'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: videoId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Processing error (${response.status})`);
      }

      const initialData = await response.json();

      // Case A: Song was already processed (100% Cached)
      if (initialData.status === 'completed' && initialData.instrumental_url) {
        if (initialData.title) setVideoTitle(initialData.title);
        setProcessingProgress(100);
        setProcessingStage('completed');
        setStems({
          instrumentalUrl: apiUrl(initialData.instrumental_url),
          vocalsUrl: apiUrl(initialData.vocals_url),
        });
        setIsVocalOn(false); // Default: Lead Vocals Muted (Pure Instrumental)
        setIsProcessing(false);
        return;
      }

      // Case B: Background separation job in progress -> Poll /api/status/{videoId} every 1.5s
      pollingTimerRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(apiUrl(`/api/status/${videoId}`));
          if (!pollRes.ok) return;

          const pollData = await pollRes.json();

          if (pollData.direct_audio_url) {
            directAudioUrlRef.current = apiUrl(pollData.direct_audio_url);
          }
          if (pollData.progress) {
            setProcessingProgress(pollData.progress);
          }
          if (pollData.stage) {
            setProcessingStage(pollData.stage);
          }
          if (pollData.message) {
            setProcessingMessage(pollData.message);
          }

          if (pollData.status === 'completed' && pollData.instrumental_url) {
            clearInterval(pollingTimerRef.current);
            pollingTimerRef.current = null;

            if (pollData.title) {
              setVideoTitle(pollData.title);
              try {
                const savedHistory = localStorage.getItem('karaoke_singing_history');
                if (savedHistory) {
                  const list = JSON.parse(savedHistory);
                  const updated = list.map((item) =>
                    item.id === videoId ? { ...item, title: pollData.title } : item
                  );
                  localStorage.setItem('karaoke_singing_history', JSON.stringify(updated));
                  window.dispatchEvent(new Event('karaoke_history_updated'));
                }
              } catch (e) {}
            }
            setProcessingProgress(100);
            setProcessingStage('completed');

            setStems({
              instrumentalUrl: apiUrl(pollData.instrumental_url),
              vocalsUrl: apiUrl(pollData.vocals_url),
            });
            setIsVocalOn(false); // Pure instrumental karaoke!
            setIsProcessing(false); // Dismiss overlay modal and auto-start
          } else if (pollData.status === 'error') {
            clearInterval(pollingTimerRef.current);
            pollingTimerRef.current = null;
            setIsProcessing(false);
            // Notice: If YouTube flagged the datacenter IP, inform user clearly
            console.warn('Backend separation notice, falling back to direct YouTube playback:', pollData.error);
            if (pollData.error && (pollData.error.includes('bot') || pollData.error.includes('Sign in'))) {
              setApiError('YouTube Bot Notice: YouTube តម្រូវឱ្យផ្ទៀងផ្ទាត់ Bot លើ Cloud Server Render សម្រាប់បទនេះ។ កំពុងប្តូរទៅចាក់តាម YouTube ផ្ទាល់។');
            } else {
              setApiError(null);
            }
            setTimeout(() => {
              const player = playerRef.current;
              if (player && typeof player.unMute === 'function') {
                try {
                  player.unMute();
                  player.setVolume(100);
                  player.playVideo();
                } catch (e) {}
              }
            }, 300);
          }
        } catch (e) {
          console.warn('Polling error:', e);
        }
      }, 1500);

    } catch (err) {
      console.warn('Failed to trigger video processing, falling back to direct YouTube playback:', err);
      setIsProcessing(false);
      setApiError(null);
      setTimeout(() => {
        const player = playerRef.current;
        if (player && typeof player.unMute === 'function') {
          try {
            player.unMute();
            player.setVolume(100);
            player.playVideo();
          } catch (e) {}
        }
      }, 300);
    }
  };

  // Auto Vocal Cut / Ready to Sing with True Demucs Instrumental
  const handleStartInstantAutoVocalCut = useCallback(async () => {
    if (!selectedVideoId) return;
    setIsInstantCutLoading(true);

    try {
      const res = await fetch(apiUrl(`/api/status/${selectedVideoId}`));
      if (res.ok) {
        const data = await res.json();
        if (data.instrumental_url) {
          setStems({
            instrumentalUrl: apiUrl(data.instrumental_url),
            vocalsUrl: data.vocals_url ? apiUrl(data.vocals_url) : null,
          });
          setIsVocalOn(false);
          setAudioMode('instrumental');
          setIsInstantCutLoading(false);
          setIsProcessing(false);
          playVideo();
          return;
        }
      }
    } catch (e) {}

    // If Demucs separation is still running, poll dynamically until instrumental is ready
    let attempts = 0;
    const pollInterval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(apiUrl(`/api/status/${selectedVideoId}`));
        if (res.ok) {
          const data = await res.json();
          if (data.instrumental_url) {
            clearInterval(pollInterval);
            setIsInstantCutLoading(false);
            setStems({
              instrumentalUrl: apiUrl(data.instrumental_url),
              vocalsUrl: data.vocals_url ? apiUrl(data.vocals_url) : null,
            });
            setIsVocalOn(false);
            setAudioMode('instrumental');
            setIsProcessing(false);
            playVideo();
            return;
          }
        }
      } catch (e) {}

      if (attempts >= 25) {
        clearInterval(pollInterval);
        setIsInstantCutLoading(false);
      }
    }, 1000);
  }, [selectedVideoId, playVideo, setAudioMode, setIsVocalOn]);

  const isPlaying = playerState === 1; // 1 = YT.PlayerState.PLAYING

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-pink-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 via-purple-600 to-cyan-400 p-0.5 shadow-lg shadow-pink-500/20 overflow-hidden shrink-0">
              <img
                src="/logo.webp"
                alt="Logo"
                className="w-full h-full object-cover rounded-[10px]"
              />
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
                YouTube AI Karaoke Studio 🎤
              </h1>
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-xs sm:text-sm font-black text-pink-400 tracking-wide drop-shadow-sm">
                  (សាខាម្ចាស់ដើម)
                </span>
                <span className="text-slate-600 text-xs">•</span>
                <span className="text-xs text-slate-400 font-semibold tracking-wide">
                  Live Mic & Recording
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* KTV Voice Studio PRO Header Button */}
            <button
              onClick={() => setIsVoiceStudioOpen(true)}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white shadow-lg shadow-purple-500/25 border border-purple-400/40 cursor-pointer transition-all hover:scale-105 active:scale-95"
              title="បើកផ្ទាំង KTV Voice Studio PRO (Auto-Tune & Voice FX)"
            >
              <Mic className="w-3.5 h-3.5 text-white animate-pulse" />
              <span>Voice Studio PRO</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-white/20 font-mono tracking-wider font-extrabold hidden md:inline">
                AUTO-TUNE
              </span>
            </button>

            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-slate-800/80 border border-slate-700 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              AI Model: HT-Demucs FT
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8 ${selectedVideoId ? 'pb-24' : ''}`}>
        {/* Banner / Instructions */}
        {!selectedVideoId && (
          <div className="text-center space-y-4 py-8 relative">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-cyan-500/15 border border-pink-500/30 text-pink-300 text-xs font-semibold shadow-lg shadow-pink-500/10">
              <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
              <span>បច្ចេកវិទ្យា AI ជំនាន់ថ្មី • កាត់សំឡេងច្រៀងចេញ 95%+ ស្អាតគ្មានសម្លេងចាល</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              ប្រែក្លាយបទចម្រៀង YouTube ទៅជា <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400 bg-clip-text text-transparent drop-shadow-sm">
                ភ្លេងខារ៉ាអូខេគុណភាពខ្ពស់
              </span>
            </h2>

            <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              ស្វែងរក ឬ ដាក់តំណភ្ជាប់បទណាក៏បាន — ប្រព័ន្ធ AI Deep Neural Network នឹងបំបែកភ្លេង និងកាត់សំឡេងច្រៀងចេញ 95%+ រួចបើកឲ្យច្រៀងដោយស្វ័យប្រវត្តិតែម្តង!
            </p>
          </div>
        )}

        {/* Global Error Banner */}
        {apiError && (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Processing Notice</p>
              <p className="text-xs text-rose-200/80">{apiError}</p>
            </div>
          </div>
        )}

        {/* Song Input & Search Component */}
        <div ref={searchSectionRef}>
          <SearchAndInput
            onSelectVideo={handleSelectVideo}
            isProcessing={isProcessing}
            externalQuery={externalSearchQuery}
          />
        </div>

        {/* Karaoke Player & Controls View */}
        {selectedVideoId && (
          <div ref={playerSectionRef} className="space-y-6 animate-fade-in pt-4">
            {/* Success Banner when 100% Ready */}
            {audioLoaded && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 shadow-xl flex items-center justify-between gap-4 animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-200">
                      🎉 ភ្លេងខារ៉ាអូខេ 95%+ Vocal Removal រួចរាល់ 100%!
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      សម្លេងអ្នកចម្រៀងដើមត្រូវបាន <strong className="text-emerald-400 font-bold">MUTED</strong>។ អ្នកអាចច្រៀងខារ៉ាអូខេបានភ្លាមៗ!
                    </p>
                  </div>
                </div>

                <button
                  onClick={toggleVocals}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isVocalOn
                      ? 'bg-pink-500 text-white shadow-pink-500/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {isVocalOn ? '🎤 VOCALS: ON' : '🎵 INSTRUMENTAL ONLY'}
                </button>
              </div>
            )}

            {/* Mobile Layout, Tabs (dtab), Dropdown (drop) & Drag-and-Drop Reorder Toolbar */}
            <div className="glass-panel rounded-2xl p-3 sm:p-4 border border-slate-800 shadow-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* 1. Tabs for desktop/tablet & Dropdown for mobile */}
                <div className="flex items-center gap-2 flex-1">
                  {/* Desktop / Tablet Segmented Tabs (dtab) */}
                  <div className="hidden sm:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
                    {[
                      { id: 'all', label: '📱 ទាំងអស់ (All Layers)' },
                      { id: 'lyrics', label: '🎤 ទំនុកច្រៀង (Lyrics Focus)' },
                      { id: 'player', label: '📺 វីដេអូ (Video Player)' },
                      { id: 'controls', label: '🎛️ សំឡេង & អេកូ (Audio Studio)' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveMobileTab(tab.id)}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                          activeMobileTab === tab.id
                            ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md shadow-pink-500/20'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Mobile Screen Dropdown Selector (drop) */}
                  <div className="sm:hidden flex items-center gap-2 w-full">
                    <span className="text-xs text-slate-400 font-semibold shrink-0">មើលតាម:</span>
                    <select
                      value={activeMobileTab}
                      onChange={(e) => setActiveMobileTab(e.target.value)}
                      className="w-full bg-slate-900 border border-pink-500/40 text-pink-300 font-bold text-xs rounded-xl px-3 py-2 focus:outline-none shadow-sm cursor-pointer"
                    >
                      <option value="all">📱 បង្ហាញ Layer ទាំងអស់ (All Layers)</option>
                      <option value="lyrics">🎤 ផ្ដោតលើទំនុកច្រៀង (Lyrics Focus)</option>
                      <option value="player">📺 ផ្ដោតលើវីដេអូ (Video Player)</option>
                      <option value="controls">🎛️ ផ្ដោតលើសំឡេង & អេកូ (Audio Studio)</option>
                    </select>
                  </div>
                </div>

                {/* 2. Action Buttons: Quick Edit Lyrics + Drag & Drop Reorder Toggle */}
                <div className="flex items-center gap-2 justify-between sm:justify-end flex-wrap">
                  {/* Quick Lyrics Edit button */}
                  <button
                    type="button"
                    onClick={() => setExternalEditTrigger((c) => c + 1)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-300 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                    title="កែប្រែទំនុកច្រៀង ឬបិទភ្ជាប់អត្ថបទ (Edit Lyrics)"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-pink-400" />
                    <span>កែ / Paste អក្សរ</span>
                  </button>

                  {/* Reorder Drag & Drop Mode Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsReorderMode(!isReorderMode)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                      isReorderMode
                        ? 'bg-purple-600 text-white border-purple-400 shadow-purple-500/30 ring-2 ring-purple-400/40'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                    title="បើក/បិទ មុខងាររៀបចំ Layer ដោយ Drag & Drop ឬចុចឡើងលើ/ចុះក្រោម"
                  >
                    <GripVertical className="w-3.5 h-3.5 text-purple-300" />
                    <span>{isReorderMode ? '✓ រៀបចំរួចរាល់' : '⠿ រៀបចំ Layer (Drag & Drop)'}</span>
                  </button>
                </div>
              </div>

              {/* Presets Toolbar when in Reorder Mode */}
              {isReorderMode && (
                <div className="p-3 rounded-xl bg-slate-900/95 border border-purple-500/40 flex flex-wrap items-center justify-between gap-2.5 text-xs animate-fade-in">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-slate-200">ជ្រើសរើសទម្រង់ស្រាប់ (Presets):</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => applyPresetLayout('karaoke')}
                      className="px-2.5 py-1 rounded-lg bg-pink-950/90 hover:bg-pink-900 border border-pink-500/50 text-pink-300 text-[11px] font-semibold cursor-pointer"
                      title="អក្សរខារ៉ាអូខេនៅខាងលើគេបង្អស់"
                    >
                      🎤 Mobile Karaoke (Lyrics លើគេ)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetLayout('cinema')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold cursor-pointer"
                      title="វីដេអូចម្រៀងនៅខាងលើគេ"
                    >
                      📺 Cinema (វីដេអូលើគេ)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetLayout('studio')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold cursor-pointer"
                      title="ផ្ទាំងបញ្ជាសំឡេងនៅខាងលើគេ"
                    >
                      🎛️ Studio (កែសំឡេងលើគេ)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetLayout('cinema')}
                      className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 text-[11px] flex items-center gap-1 cursor-pointer"
                      title="កំណត់មកទម្រង់ដើមវិញ"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>លំនាំដើម</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Dynamic Reorderable Layers Container */}
            <div className="space-y-3 sm:space-y-6">
              {layersOrder
                .filter((layerId) => activeMobileTab === 'all' || activeMobileTab === layerId)
                .map((layerId, index) => {
                  let layerContent = null;
                  let layerTitle = '';
                  let layerIcon = null;

                  if (layerId === 'player') {
                    layerTitle = '📺 វីដេអូចម្រៀង (Video Player)';
                    layerIcon = <Play className="w-4 h-4 text-pink-400" />;
                    layerContent = (
                      <KaraokePlayer
                        containerId={containerId}
                        videoId={selectedVideoId}
                        isPlayerReady={isPlayerReady}
                        playerError={playerError}
                        audioLoaded={audioLoaded}
                        currentDriftMs={currentDriftMs}
                        videoTitle={videoTitle}
                        onSearchAlternative={handleSearchAlternative}
                      />
                    );
                  } else if (layerId === 'lyrics') {
                    layerTitle = '🎤 ទំនុកច្រៀងខារ៉ាអូខេ (Synced Lyrics)';
                    layerIcon = <Music className="w-4 h-4 text-emerald-400" />;
                    layerContent = (
                      <KaraokeLyrics
                        key={selectedVideoId}
                        videoId={selectedVideoId}
                        currentTime={playbackTime}
                        onSeek={handleSeek}
                        videoTitle={videoTitle}
                        externalEditTrigger={externalEditTrigger}
                      />
                    );
                  } else if (layerId === 'controls') {
                    layerTitle = '🎛️ ការកំណត់សំឡេង & អេកូ (Audio Studio Rack)';
                    layerIcon = <SlidersHorizontal className="w-4 h-4 text-purple-400" />;
                    layerContent = (
                      <div className="w-full">
                        <KaraokeControls
                          audioMode={audioMode}
                          setAudioMode={setAudioMode}
                          selectedVideoId={selectedVideoId}
                          videoTitle={videoTitle}
                          stems={stems}
                          isVocalOn={isVocalOn}
                          toggleVocals={toggleVocals}
                          instVolume={instVolume}
                          setInstVolume={setInstVolume}
                          vocalVolume={vocalVolume}
                          setVocalVolume={setVocalVolume}
                          playbackTime={playbackTime}
                          audioDuration={audioDuration}
                          isPlaying={isPlaying}
                          audioLoaded={audioLoaded}
                          playbackRate={playbackRate}
                          onChangePlaybackRate={handleChangePlaybackRate}
                          isAutoVocalCutActive={!isVocalOn}
                          toggleAutoVocalCut={toggleVocals}
                          isDeBleedActive={studioEngine.isDeBleedActive}
                          toggleDeBleed={studioEngine.toggleDeBleed}
                          isRecording={studioEngine.isRecording}
                          startRecording={studioEngine.startRecording}
                          stopRecording={studioEngine.stopRecording}
                          recordedAudioUrl={studioEngine.recordedAudioUrl}
                          recordingSeconds={studioEngine.recordingSeconds}
                          isMicActive={micEngine.isMicActive}
                          toggleMic={micEngine.toggleMic}
                          micVolume={micEngine.micVolume}
                          setMicVolume={micEngine.setMicVolume}
                          isEchoOn={micEngine.isEchoOn}
                          setIsEchoOn={micEngine.setIsEchoOn}
                          echoLevel={micEngine.echoLevel}
                          setEchoLevel={micEngine.setEchoLevel}
                          delayTime={micEngine.delayTime}
                          setDelayTime={micEngine.setDelayTime}
                          setEchoPreset={micEngine.setEchoPreset}
                          micError={micEngine.micError}
                          setMicBoostPreset={micEngine.setMicBoostPreset}
                          isHeadphonesConnected={micEngine.isHeadphonesConnected}
                          toggleHeadphones={micEngine.toggleHeadphones}
                          isMonitorSpeaker={micEngine.isMonitorSpeaker}
                          setIsMonitorSpeaker={micEngine.setIsMonitorSpeaker}
                          isNoiseCutActive={micEngine.isNoiseCutActive}
                          toggleNoiseCut={micEngine.toggleNoiseCut}
                          keepMusicNormal={micEngine.keepMusicNormal}
                          toggleKeepMusicNormal={micEngine.toggleKeepMusicNormal}
                          onOpenVoiceStudio={() => setIsVoiceStudioOpen(true)}
                        />
                      </div>
                    );
                  }

                  const isDraggingThis = draggedLayerId === layerId;
                  const isDragOverThis = dragOverLayerId === layerId;

                  return (
                    <div
                      key={layerId}
                      draggable={isReorderMode}
                      onDragStart={(e) => handleDragStart(e, layerId)}
                      onDragOver={(e) => handleDragOver(e, layerId)}
                      onDrop={(e) => handleDrop(e, layerId)}
                      className={`transition-all duration-200 ${
                        layerId === 'player' ? 'sticky top-1 sm:top-2 z-20' : ''
                      } ${
                        isDraggingThis ? 'opacity-40 scale-[0.98]' : ''
                      } ${
                        isDragOverThis ? 'ring-2 ring-pink-500 rounded-2xl shadow-xl' : ''
                      }`}
                    >
                      {/* Layer Header Bar when Reorder Mode is ON */}
                      {isReorderMode && (
                        <div className="flex items-center justify-between px-4 py-2.5 mb-2 rounded-xl bg-slate-900/95 border border-purple-500/40 text-xs shadow-lg animate-fade-in select-none">
                          <div className="flex items-center gap-2.5">
                            <div
                              draggable
                              onDragStart={(e) => handleDragStart(e, layerId)}
                              className="p-1.5 rounded-lg bg-slate-800 text-purple-400 hover:text-white cursor-grab active:cursor-grabbing"
                              title="អូសទម្លាក់ដើម្បីផ្លាស់ប្តូរទីតាំង (Drag & Drop)"
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>
                            <div className="flex items-center gap-2">
                              {layerIcon}
                              <span className="font-bold text-slate-200">{layerTitle}</span>
                            </div>
                          </div>

                          {/* Up & Down Shift buttons for Mobile & Desktop */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-mono mr-1">
                              Layer #{index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => moveLayer(layerId, 'up')}
                              disabled={index === 0}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 cursor-pointer"
                              title="រំកិលឡើងលើ (Move Up)"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveLayer(layerId, 'down')}
                              disabled={index === layersOrder.length - 1}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 cursor-pointer"
                              title="រំកិលចុះក្រោម (Move Down)"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Actual Layer Content */}
                      {layerContent}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Floating Quick Action Dock (សម្រាប់បទពិសោធន៍ Mobile App ដូច Smule / WeSing) */}
      {selectedVideoId && (
        <div className="sm:hidden fixed bottom-3 left-3 right-3 z-40 rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-pink-500/40 p-2 shadow-2xl flex items-center justify-around shadow-pink-500/10 animate-fade-in">
          {/* Headphone Mode Quick Button */}
          <button
            type="button"
            onClick={() => micEngine.toggleHeadphones()}
            className={`p-2 rounded-xl flex flex-col items-center gap-0.5 text-[10px] font-bold cursor-pointer transition-all ${
              micEngine.isHeadphonesConnected
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
                : 'text-amber-400 hover:text-amber-300'
            }`}
            title="ដោតកាសដើម្បីច្រៀងលឺសំឡេងតាម Mic & ភ្លេង"
          >
            <Headphones className={`w-4 h-4 ${micEngine.isHeadphonesConnected ? 'animate-pulse' : ''}`} />
            <span>{micEngine.isHeadphonesConnected ? 'កាស ON' : 'ដោតកាស'}</span>
          </button>

          {/* Mic Button */}
          <button
            type="button"
            onClick={micEngine.toggleMic}
            className={`p-2 rounded-xl flex flex-col items-center gap-0.5 text-[10px] font-bold cursor-pointer transition-all ${
              micEngine.isMicActive ? 'bg-rose-500 text-white shadow-md animate-pulse' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>{micEngine.isMicActive ? 'Mic ON' : 'Mic'}</span>
          </button>

          {/* Vocals Mute/Guide */}
          <button
            type="button"
            onClick={toggleVocals}
            className={`p-2 rounded-xl flex flex-col items-center gap-0.5 text-[10px] font-bold cursor-pointer transition-all ${
              isVocalOn ? 'bg-pink-600 text-white shadow-md' : 'bg-emerald-600/90 text-white shadow-md'
            }`}
          >
            {isVocalOn ? <Mic2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{isVocalOn ? 'Guide ON' : 'ច្រៀងសុទ្ធ'}</span>
          </button>

          {/* Echo */}
          <button
            type="button"
            onClick={() => micEngine.setIsEchoOn(!micEngine.isEchoOn)}
            className={`p-2 rounded-xl flex flex-col items-center gap-0.5 text-[10px] font-bold cursor-pointer transition-all ${
              micEngine.isEchoOn ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Waves className="w-4 h-4" />
            <span>{micEngine.isEchoOn ? 'Echo ON' : 'Echo'}</span>
          </button>

          {/* Settings Drawer Button (ដាក់ setting ចូលក្នុង menu នេះ សម្រាប់ mobile app!) */}
          <button
            type="button"
            onClick={() => setIsMobileSettingsOpen(true)}
            className={`p-2 rounded-xl flex flex-col items-center gap-0.5 text-[10px] font-bold cursor-pointer transition-all ${
              isMobileSettingsOpen
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md shadow-pink-500/30 ring-2 ring-pink-400/50'
                : 'text-pink-400 hover:text-pink-300'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>សារ៉េ</span>
          </button>

          {/* Record Studio */}
          <button
            type="button"
            onClick={studioEngine.isRecording ? studioEngine.stopRecording : studioEngine.startRecording}
            className={`p-2 rounded-xl flex flex-col items-center gap-0.5 text-[10px] font-bold cursor-pointer transition-all ${
              studioEngine.isRecording ? 'bg-rose-600 text-white shadow-md animate-ping' : 'text-rose-400 hover:text-rose-300'
            }`}
          >
            <CircleDot className="w-4 h-4 fill-current" />
            <span>{studioEngine.isRecording ? 'បញ្ឈប់' : 'ថត'}</span>
          </button>
        </div>
      )}

      {/* Mobile Audio Studio Settings Drawer (រៀបចំ Setting ទាំងអស់ចូលក្នុង Menu លើ Mobile) */}
      {isMobileSettingsOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-md animate-fade-in font-sans">
          {/* Click backdrop to close */}
          <div className="flex-1" onClick={() => setIsMobileSettingsOpen(false)} />

          {/* The Bottom Sheet Card */}
          <div className="w-full bg-slate-900/95 border-t border-pink-500/40 rounded-t-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-slide-up">
            {/* Top Drag Handle Bar */}
            <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto -mt-1 mb-2" />

            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/40 text-pink-400">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>🎛️ ការកំណត់សំឡេង (Studio Menu)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    សារ៉េសំឡេងច្រៀង, ភ្លេង, អេកូ & ឌីឡេ
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsMobileSettingsOpen(false)}
                className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Segmented Quick Category Tabs inside Drawer */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setMobileDrawerTab('voice')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-center transition-all cursor-pointer whitespace-nowrap ${
                  mobileDrawerTab === 'voice' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400'
                }`}
              >
                🎤 សំឡេង
              </button>
              <button
                onClick={() => setMobileDrawerTab('music')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-center transition-all cursor-pointer whitespace-nowrap ${
                  mobileDrawerTab === 'music' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400'
                }`}
              >
                🎵 ភ្លេង
              </button>
              <button
                onClick={() => setMobileDrawerTab('echo')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-center transition-all cursor-pointer whitespace-nowrap ${
                  mobileDrawerTab === 'echo' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'
                }`}
              >
                🌊 អេកូ
              </button>
              <button
                onClick={() => setMobileDrawerTab('assistant')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-center transition-all cursor-pointer whitespace-nowrap ${
                  mobileDrawerTab === 'assistant' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400'
                }`}
              >
                ⚡ ជំនួយការ
              </button>
            </div>

            {/* Drawer Tab 1: Voice & Mic Setting */}
            {mobileDrawerTab === 'voice' && (
              <div className="space-y-4 animate-fade-in">
                {/* Headphone Karaoke Monitor Card */}
                <div className={`p-3.5 rounded-2xl border transition-all ${
                  micEngine.isHeadphonesConnected
                    ? 'bg-emerald-950/60 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                    : 'bg-amber-950/40 border-amber-500/50'
                }`}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Headphones className={`w-5 h-5 ${micEngine.isHeadphonesConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
                      <div>
                        <h4 className="text-xs font-bold text-white">
                          {micEngine.isHeadphonesConnected ? 'កាសសកម្ម (Headphones Ready)' : 'តម្រូវឱ្យប្រើកាស (Headphones)'}
                        </h4>
                        <span className="text-[10px] text-slate-300">
                          {micEngine.isHeadphonesConnected ? 'សំឡេង Mic & ភ្លេងរត់ចូលកាសជាមួយគ្នា' : 'ការពារសំឡេងខ្ទរ Echo លើទូរស័ព្ទ'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => micEngine.toggleHeadphones()}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                        micEngine.isHeadphonesConnected
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-md'
                      }`}
                    >
                      {micEngine.isHeadphonesConnected ? '🎧 កាស ON' : '🎧 ដោតកាសហើយ'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {micEngine.isHeadphonesConnected
                      ? '✨ លោកអ្នកអាចច្រៀងលឺសំឡេងខ្លួនឯងតាម Mic បូករួមទាំងភ្លេងរត់ចូលកាសស្របគ្នា 100% ដូចក្នុងបន្ទប់ខារ៉ាអូខេ KTV!'
                      : '💡 ដើម្បីច្រៀងលឺសំឡេងខ្លួនឯងតាម Mic សូមដោតកាសទូរស័ព្ទ រួចចុចប៊ូតុង "ដោតកាសហើយ" ដើម្បីបើក Mic & កាស។'}
                  </p>
                </div>

                {/* Vocal Toggle */}
                <button
                  onClick={toggleVocals}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                    isVocalOn
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {isVocalOn ? <Mic className="w-4 h-4 animate-bounce" /> : <MicOff className="w-4 h-4" />}
                  <span>{isVocalOn ? 'VOCALS: ON (មានសំឡេងដើមនាំមុខ)' : 'VOCALS: MUTED (ច្រៀងសុទ្ធ 100%)'}</span>
                </button>

                {/* Guide Vocal Volume Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>កម្រិតសំឡេងអ្នកចម្រៀងដើម (Guide Vocal):</span>
                    <span className="font-mono text-pink-400 font-bold">{Math.round(vocalVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={vocalVolume}
                    disabled={!isVocalOn}
                    onChange={(e) => setVocalVolume(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
                  />
                </div>

                {/* Quick Vocal Presets */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button onClick={() => setVocalVolume(0)} className="p-1.5 rounded-lg bg-slate-800 text-[10px] text-slate-300 font-mono text-center">0% Mute</button>
                  <button onClick={() => setVocalVolume(0.1)} className="p-1.5 rounded-lg bg-pink-950 border border-pink-500/50 text-[10px] text-pink-300 font-bold font-mono text-center">-90% (10%)</button>
                  <button onClick={() => setVocalVolume(0.25)} className="p-1.5 rounded-lg bg-slate-800 text-[10px] text-slate-300 font-mono text-center">25%</button>
                  <button onClick={() => setVocalVolume(1)} className="p-1.5 rounded-lg bg-slate-800 text-[10px] text-slate-300 font-mono text-center">100%</button>
                </div>

                {/* Mic Gain Slider & Studio Vocal Booster */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-rose-400" />
                      <span className="font-semibold">កម្រិតសំឡេងម៉ៃក្រូហ្វូន (Mic Boost):</span>
                    </span>
                    <span className="font-mono text-rose-400 font-bold text-xs">{Math.round(micEngine.micVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3.0"
                    step="0.05"
                    value={micEngine.micVolume}
                    onChange={(e) => micEngine.setMicVolume(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />

                  {/* Quick Vocal Boost Presets for Mobile */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => micEngine.setMicBoostPreset('normal')}
                      className={`py-1.5 rounded-lg text-[11px] font-mono cursor-pointer transition-all ${
                        Math.round(micEngine.micVolume * 100) === 100
                          ? 'bg-rose-950 border border-rose-500 text-rose-300 font-bold'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      100% ធម្មតា
                    </button>
                    <button
                      type="button"
                      onClick={() => micEngine.setMicBoostPreset('full')}
                      className={`py-1.5 rounded-lg text-[11px] font-mono cursor-pointer transition-all ${
                        Math.round(micEngine.micVolume * 100) === 180
                          ? 'bg-rose-950 border border-rose-500 text-rose-300 font-bold'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      180% សំឡេងពេញ
                    </button>
                    <button
                      type="button"
                      onClick={() => micEngine.setMicBoostPreset('boost')}
                      className={`py-1.5 rounded-lg text-[11px] font-mono cursor-pointer transition-all ${
                        Math.round(micEngine.micVolume * 100) === 250
                          ? 'bg-rose-950 border border-rose-500 text-rose-300 font-bold'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      250% បំពងខ្លាំង
                    </button>
                  </div>

                  {/* Anti-Noise & Hiss Filter Toggle for Mobile */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 mt-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className={`w-4 h-4 ${micEngine.isNoiseCutActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <span className="text-xs font-semibold text-slate-300">កាត់ Noise & Hiss (សំឡេងរំខាន)</span>
                    </div>
                    <button
                      type="button"
                      onClick={micEngine.toggleNoiseCut}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        micEngine.isNoiseCutActive ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {micEngine.isNoiseCutActive ? 'កាត់ NOISE: ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Keep Karaoke Music Normal (No Ducking) Toggle */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 mt-2">
                    <div className="flex items-center gap-2">
                      <Volume2 className={`w-4 h-4 ${micEngine.keepMusicNormal ? 'text-pink-400' : 'text-slate-500'}`} />
                      <div>
                        <span className="text-xs font-semibold text-slate-300 block">រក្សាសំឡេងភ្លេងធម្មតា</span>
                        <span className="text-[10px] text-slate-400">មិនបន្ថយ ឬទម្លាក់ភ្លេងពេលច្រៀង</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={micEngine.toggleKeepMusicNormal}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        micEngine.keepMusicNormal ? 'bg-pink-600 text-white shadow-sm' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {micEngine.keepMusicNormal ? 'ភ្លេងធម្មតា: ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Open Voice Studio PRO from Mobile Drawer */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileSettingsOpen(false);
                      setIsVoiceStudioOpen(true);
                    }}
                    className="w-full mt-2 py-3 px-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-500/25 active:scale-95 transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-white animate-pulse" />
                    <span>🎙️ បើក KTV Voice Studio PRO (Auto-Tune & FX)</span>
                  </button>

                  {/* Keep Karaoke Music Normal (No Ducking) Toggle */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 mt-2">
                    <div className="flex items-center gap-2">
                      <Volume2 className={`w-4 h-4 ${micEngine.keepMusicNormal ? 'text-pink-400' : 'text-slate-500'}`} />
                      <div>
                        <span className="text-xs font-semibold text-slate-300 block">រក្សាសំឡេងភ្លេងធម្មតា</span>
                        <span className="text-[10px] text-slate-400">មិនបន្ថយ ឬទម្លាក់ភ្លេងពេលច្រៀង</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={micEngine.toggleKeepMusicNormal}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        micEngine.keepMusicNormal ? 'bg-pink-600 text-white shadow-sm' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {micEngine.keepMusicNormal ? 'ភ្លេងធម្មតា: ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Open Voice Studio PRO from Mobile Drawer */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileSettingsOpen(false);
                      setIsVoiceStudioOpen(true);
                    }}
                    className="w-full mt-2 py-3 px-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-500/25 active:scale-95 transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-white animate-pulse" />
                    <span>🎙️ បើក KTV Voice Studio PRO (Auto-Tune & FX)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Drawer Tab 2: Music Setting */}
            {mobileDrawerTab === 'music' && (
              <div className="space-y-4 animate-fade-in">
                {/* Music Volume Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-purple-400" />
                      <span>កម្រិតសំឡេងភ្លេង (Instrumental):</span>
                    </span>
                    <span className="font-mono text-purple-400 font-bold">{Math.round(instVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={instVolume}
                    onChange={(e) => setInstVolume(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>

                {/* Speed Buttons */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>ល្បឿនចង្វាក់ភ្លេង:</span>
                    <span className="font-mono font-bold text-pink-400">{playbackRate}x</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[0.8, 1.0, 1.2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => handleChangePlaybackRate(rate)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          playbackRate === rate
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {rate}x {rate === 0.8 ? '(យឺត)' : rate === 1.0 ? '(ធម្មតា)' : '(ញាប់)'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Drawer Tab 3: Echo & Delay Setting */}
            {mobileDrawerTab === 'echo' && (
              <div className="space-y-4 animate-fade-in">
                {/* Vocal Latency & Echo Mode Switch (Real-Time 0ms vs Echo) */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <Zap className={`w-4 h-4 ${!micEngine.isEchoOn ? 'text-amber-400' : 'text-slate-500'}`} />
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">
                        {!micEngine.isEchoOn ? '⚡ សំឡេងផ្ទាល់ (0ms មិន Slow)' : '🌊 សំឡេងអេកូ (Echo Studio)'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {!micEngine.isEchoOn ? 'សំឡេងលឺភ្លាមៗ គ្មាន lag' : 'អេកូបែប Studio Reverb ស្រទន់'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => micEngine.setIsEchoOn(false)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        !micEngine.isEchoOn
                          ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      ⚡ 0ms ផ្ទាល់
                    </button>
                    <button
                      type="button"
                      onClick={() => micEngine.setIsEchoOn(true)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        micEngine.isEchoOn
                          ? 'bg-indigo-600 text-white font-bold shadow-sm'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      🌊 អេកូ
                    </button>
                  </div>
                </div>

                {/* Echo Feedback Wetness Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>កម្រិតអេកូ (Echo Feedback):</span>
                    <span className="font-mono text-indigo-400 font-bold">{Math.round(micEngine.echoLevel * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="0.85"
                    step="0.05"
                    value={micEngine.echoLevel}
                    disabled={!micEngine.isEchoOn}
                    onChange={(e) => micEngine.setEchoLevel(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Delay Time Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>ពេលវេលាឌីឡេ (Delay Time):</span>
                    <span className="font-mono text-cyan-400 font-bold">{Math.round(micEngine.delayTime * 1000)} ms</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.60"
                    step="0.01"
                    value={micEngine.delayTime}
                    disabled={!micEngine.isEchoOn}
                    onChange={(e) => micEngine.setDelayTime(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                {/* Echo Presets */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold">ម៉ូតអេកូពេញនិយម (Presets):</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button onClick={() => micEngine.setEchoPreset('room')} className="p-1.5 rounded-lg bg-slate-800 text-[10px] text-slate-300 font-mono text-center">Room</button>
                    <button onClick={() => micEngine.setEchoPreset('karaoke')} className="p-1.5 rounded-lg bg-indigo-950 border border-indigo-500/50 text-[10px] text-indigo-300 font-bold font-mono text-center">Karaoke</button>
                    <button onClick={() => micEngine.setEchoPreset('concert')} className="p-1.5 rounded-lg bg-slate-800 text-[10px] text-slate-300 font-mono text-center">Concert</button>
                    <button onClick={() => micEngine.setEchoPreset('space')} className="p-1.5 rounded-lg bg-slate-800 text-[10px] text-slate-300 font-mono text-center">Space</button>
                  </div>
                </div>
              </div>
            )}

            {/* Drawer Tab 4: Singing Assistant Suite */}
            {mobileDrawerTab === 'assistant' && (
              <div className="space-y-3 animate-fade-in">
                {/* Auto Vocal Cut */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-purple-400" />
                      <span>Auto Vocal Cut (0s)</span>
                    </h4>
                    <p className="text-[10px] text-slate-400">កាត់សំឡេងច្រៀងភ្លាមៗ 0 វិនាទី</p>
                  </div>
                  <button
                    onClick={studioEngine.toggleAutoVocalCut}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      studioEngine.isAutoVocalCutActive ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {studioEngine.isAutoVocalCutActive ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* AI De-Bleed Filter */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>AI De-Bleed Filter (95%)</span>
                    </h4>
                    <p className="text-[10px] text-slate-400">កម្ចាត់សំឡេងចាលក្នុងភ្លេង</p>
                  </div>
                  <button
                    onClick={studioEngine.toggleDeBleed}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      studioEngine.isDeBleedActive ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {studioEngine.isDeBleedActive ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Edit Lyrics Shortcut */}
                <button
                  onClick={() => {
                    setIsMobileSettingsOpen(false);
                    setExternalEditTrigger((c) => c + 1);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-pink-500/20 border border-pink-500/40 text-pink-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 text-pink-400" />
                  <span>✏️ កែប្រែ ឬ បិទភ្ជាប់អក្សរចម្រៀង (Paste Lyrics)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Processing Wait-to-Sing Card Overlay */}
      <ProcessingModal
        isOpen={isProcessing}
        statusMessage={processingMessage}
        videoTitle={videoTitle}
        progress={processingProgress}
        stage={processingStage}
        onStartInstantAutoVocalCut={handleStartInstantAutoVocalCut}
        isInstantCutLoading={isInstantCutLoading}
      />

      {/* KTV Voice Studio PRO Modal Rack */}
      <KtvVoiceStudioPro
        studio={micEngine}
        isOpen={isVoiceStudioOpen}
        onClose={() => setIsVoiceStudioOpen(false)}
        videoTitle={videoTitle}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-400 font-sans">
        <p className="flex items-center justify-center gap-1.5">
          <span>Prod by :</span>
          <a
            href="https://www.sombokrean.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-pink-400 hover:text-pink-300 transition-colors underline underline-offset-4 cursor-pointer"
          >
            សំបុករៀន
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
