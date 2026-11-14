import React, { useState, useEffect, useRef } from 'react';
import {
  Mic2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Music,
  Radio,
  FileText,
  CheckCircle2,
  Loader2,
  Waves,
  Timer,
  Edit3,
  RefreshCw,
  X,
  Check,
  ClipboardPaste,
} from 'lucide-react';
import { formatTime } from '../utils/youtube';
import { apiUrl } from '../utils/api';

// Helper to detect if a text represents an instrumental interlude / music notes
const isMusicInterludeText = (text) => {
  if (!text) return true;
  const clean = text.trim();
  const lower = clean.toLowerCase();
  return (
    clean === '♪♪♪' ||
    clean === '♪' ||
    clean === '♪♪' ||
    /^[♪\s\-~_♫.]+$/.test(clean) ||
    lower.includes('[music]') ||
    lower.includes('(music)') ||
    lower.includes('[instrumental]') ||
    lower.includes('(instrumental)') ||
    lower.includes('[intro]') ||
    lower.includes('[solo]') ||
    lower.includes('[guitar') ||
    lower.includes('[ភ្លេង') ||
    clean.includes('ភ្លេង') ||
    lower.includes('[เพลง]') ||
    lower.includes('เพลง') ||
    lower.includes('[applause]') ||
    clean === '...' ||
    clean === '---'
  );
};

export function KaraokeLyrics({
  videoId,
  currentTime = 0,
  onSeek,
  videoTitle,
  externalEditTrigger,
}) {
  const [lyrics, setLyrics] = useState([]);
  const [source, setSource] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedLang, setSelectedLang] = useState('km'); // 'km' = Khmer / Cambodia (Default)
  const [fontSize, setFontSize] = useState(() => {
    try {
      return localStorage.getItem('karaoke_lyrics_font_size') || 'normal';
    } catch (e) {
      return 'normal';
    }
  });

  const [lyricsViewMode, setLyricsViewMode] = useState(() => {
    try {
      return localStorage.getItem('karaoke_lyrics_view_mode') || 'both';
    } catch (e) {
      return 'both';
    }
  });

  const handleSetFontSize = (size) => {
    setFontSize(size);
    try {
      localStorage.setItem('karaoke_lyrics_font_size', size);
    } catch (e) {}
  };

  const handleSetLyricsViewMode = (mode) => {
    setLyricsViewMode(mode);
    try {
      localStorage.setItem('karaoke_lyrics_view_mode', mode);
    } catch (e) {}
  };

  // Edit / Paste Lyrics Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [rawTextInput, setRawTextInput] = useState('');
  const [isSavingLyrics, setIsSavingLyrics] = useState(false);
  const [modalStatusMsg, setModalStatusMsg] = useState(null);

  const containerRef = useRef(null);
  const activeLineRef = useRef(null);

  // Trigger openEditModal from external props (e.g. mobile bar or header)
  useEffect(() => {
    if (externalEditTrigger) {
      openEditModal();
    }
  }, [externalEditTrigger]);

  // Fetch lyrics whenever videoId changes — IMMEDIATELY flush old song lyrics!
  useEffect(() => {
    // 1. Immediately wipe previous song's lyrics so they NEVER leak into the new song
    setLyrics([]);
    setSource(null);
    setError(null);

    if (!videoId) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    const fetchLyrics = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(apiUrl(`/api/lyrics/${videoId}?lang=${selectedLang}`));
        if (!res.ok) throw new Error(`Lyrics fetch failed (${res.status})`);
        const data = await res.json();

        if (!isCancelled) {
          if (data.status === 'success' && Array.isArray(data.lyrics) && data.lyrics.length > 0) {
            setLyrics(data.lyrics);
            setSource(data.source);
          } else {
            setLyrics([]);
            setSource(null);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('Lyrics notice for', videoId, err);
          setError('មិនអាចទាញយកអក្សរខារ៉ាអូខេបាននៅពេលនេះ។');
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    fetchLyrics();

    return () => {
      isCancelled = true;
    };
  }, [videoId]);

  // --- PRECISE MILLISECOND TIMESTAMP RESOLVER ---

  // 1. Find the active line index based on sorted timestamps
  let activeIndex = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (currentTime >= lyrics[i].start) {
      activeIndex = i;
    } else {
      break;
    }
  }

  // 2. Find the next singing line (starting after currentTime with real words)
  let nextSingingLine = null;
  let nextSingingIndex = -1;

  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].start > currentTime && !isMusicInterludeText(lyrics[i].text)) {
      nextSingingLine = lyrics[i];
      nextSingingIndex = i;
      break;
    }
  }

  const currentLine = activeIndex >= 0 ? lyrics[activeIndex] : null;

  // 3. Check if nextSingingLine is following an Intro or an Instrumental Break (Gap >= 4.0s)
  let isComingFromInstrumental = false;

  if (nextSingingLine && nextSingingIndex >= 0) {
    // Case A: Song Opening Intro (first vocal line with intro >= 3s)
    const isFirstSingingLine = !lyrics.slice(0, nextSingingIndex).some((l) => !isMusicInterludeText(l.text));
    if (isFirstSingingLine && nextSingingLine.start >= 3.0) {
      isComingFromInstrumental = true;
    } else if (nextSingingIndex > 0) {
      // Case B: Preceding line was explicitly music (♪♪♪ or [ភ្លេង...])
      const prevLine = lyrics[nextSingingIndex - 1];
      if (isMusicInterludeText(prevLine.text)) {
        isComingFromInstrumental = true;
      } else {
        // Case C: Major Instrumental break (gap >= 4.0s)
        const prevEnd = prevLine.end && prevLine.end > prevLine.start
          ? Math.min(prevLine.end, prevLine.start + 5.0)
          : prevLine.start + 3.0;
        const gap = nextSingingLine.start - prevEnd;
        if (gap >= 4.0) {
          isComingFromInstrumental = true;
        }
      }
    }
  }

  // 4. Calculate Countdown: 1 2 3 ONLY after Intro or Instrumental break
  let countdownNumber = 0; // 3, 2, 1
  if (isComingFromInstrumental && nextSingingLine) {
    const timeUntil = nextSingingLine.start - currentTime;
    if (timeUntil > 0.05 && timeUntil <= 3.2) {
      countdownNumber = Math.ceil(timeUntil); // 3, 2, 1
    }
  }

  // 5. Determine if we are in an instrumental break
  const isInstrumental = (() => {
    if (!lyrics.length) return false;
    // Before line 0 (Song Opening Intro)
    if (activeIndex === -1) return true;
    // Current line is explicitly music/instrumental
    if (currentLine && isMusicInterludeText(currentLine.text)) return true;
    // Current line ended and there is a major gap (>= 4.0s) before next line
    if (currentLine) {
      const lineEnd = currentLine.end && currentLine.end > currentLine.start
        ? Math.min(currentLine.end, currentLine.start + 5.0)
        : currentLine.start + 3.5;
      if (currentTime > lineEnd + 0.3) {
        if (nextSingingLine && (nextSingingLine.start - lineEnd) >= 4.0) return true;
      }
    }
    return false;
  })();

  const isActivelySinging = !isInstrumental && currentLine && !isMusicInterludeText(currentLine.text);

  // Auto-scroll ONLY inside the lyrics container — NEVER scroll or jump the page window (វីដេអូមិនបាត់ឡើយ)
  useEffect(() => {
    if (autoScroll && activeLineRef.current && containerRef.current) {
      const container = containerRef.current;
      const activeEl = activeLineRef.current;

      const activeOffsetTop = activeEl.offsetTop;
      const targetScroll = activeOffsetTop - (container.clientHeight / 2) + (activeEl.clientHeight / 2);

      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth',
      });
    }
  }, [activeIndex, nextSingingIndex, autoScroll]);

  const handleManualTranscribe = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/lyrics/${videoId}`));
      const data = await res.json();
      if (data.status === 'success' && data.lyrics) {
        setLyrics(data.lyrics);
        setSource(data.source);
      } else {
        setError('រកមិនឃើញអត្ថបទចម្រៀងសម្រាប់បទនេះឡើយ។');
      }
    } catch (e) {
      setError('ការទាញយកអក្សរចម្រៀងបរាជ័យ។');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = () => {
    if (lyrics.length > 0 && !rawTextInput) {
      const existing = lyrics
        .filter((l) => !isMusicInterludeText(l.text))
        .map((l) => l.text)
        .join('\n');
      setRawTextInput(existing);
    }
    setModalStatusMsg(null);
    setIsEditModalOpen(true);
  };

  const handleSavePastedLyrics = async () => {
    if (!rawTextInput.trim() || !videoId) return;
    setIsSavingLyrics(true);
    setModalStatusMsg(null);
    try {
      const res = await fetch(apiUrl(`/api/lyrics/${videoId}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: rawTextInput.trim() }),
      });
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.lyrics)) {
        setLyrics(data.lyrics);
        setSource(data.source || 'user_edited');
        setModalStatusMsg({ type: 'success', text: 'រក្សាទុកទំនុកច្រៀងជោគជ័យ! អក្សរនឹងរត់តាមបទចម្រៀង។' });
        setTimeout(() => setIsEditModalOpen(false), 800);
      } else {
        setModalStatusMsg({ type: 'error', text: 'មិនអាចរក្សាទុកបានទេ សូមសាកល្បងម្តងទៀត' });
      }
    } catch (e) {
      setModalStatusMsg({ type: 'error', text: 'កំហុសបណ្តាញពេលរក្សាទុកទំនុកច្រៀង' });
    } finally {
      setIsSavingLyrics(false);
    }
  };

  const handleForceWhisper = async (lang = selectedLang) => {
    if (!videoId) return;
    setIsSavingLyrics(true);
    const langLabel = lang === 'km' ? 'ភាសាខ្មែរ (Cambodia)' : lang === 'en' ? 'English' : 'Auto';
    setModalStatusMsg({
      type: 'info',
      text: `AI Whisper កំពុងស្តាប់សំឡេងច្រៀង និង Transcribe ជា ${langLabel} (សូមរង់ចាំបន្តិច)...`,
    });
    try {
      const res = await fetch(apiUrl(`/api/lyrics/${videoId}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_whisper: true, language: lang }),
      });
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.lyrics) && data.lyrics.length > 0) {
        setLyrics(data.lyrics);
        setSource(data.source);
        setModalStatusMsg({ type: 'success', text: `AI Whisper Transcribe ជា ${langLabel} ជោគជ័យ!` });
        setTimeout(() => setIsEditModalOpen(false), 900);
      } else {
        setModalStatusMsg({
          type: 'error',
          text: 'AI Whisper រកមិនឃើញពាក្យច្រៀងច្បាស់លាស់។ សូម Copy ទំនុកច្រៀងមក Paste ជំនួសវិញ!',
        });
      }
    } catch (e) {
      setModalStatusMsg({ type: 'error', text: 'កំហុសបណ្តាញពេល Transcribe' });
    } finally {
      setIsSavingLyrics(false);
    }
  };

  const handleLanguageSwitch = async (newLang) => {
    setSelectedLang(newLang);
    if (!videoId) return;
    setIsLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/lyrics/${videoId}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_whisper: true, language: newLang }),
      });
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.lyrics) && data.lyrics.length > 0) {
        setLyrics(data.lyrics);
        setSource(data.source);
      }
    } catch (e) {
      console.warn('Language switch notice:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full glass-panel rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900/80 animate-fade-in transition-all">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/70 border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-pink-500/20 border border-pink-500/40 flex items-center justify-center">
            <Mic2 className="w-3.5 h-3.5 text-pink-400" />
          </div>
          <div>
            <h4 className="font-bold text-slate-200 flex items-center gap-2 text-xs sm:text-sm">
              <span>អក្សរខារ៉ាអូខេរត់តាមភ្លេង (Synced Karaoke Lyrics)</span>
              {lyrics.length > 0 && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-mono">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  {source === 'youtube_captions' ? 'YouTube Synced' : source === 'user_edited' ? 'Custom Lyrics' : 'AI Whisper Synced'} ({lyrics.length} ឃ្លា)
                </span>
              )}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {isLoading && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-pink-400 font-medium animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>AI កំពុងរៀបចំ...</span>
            </span>
          )}

          {/* Font Size Selector (A- / A / A+) for Mobile Phone Screens */}
          <div className="flex items-center gap-0.5 bg-slate-800/90 p-0.5 rounded-xl border border-slate-700/80 text-[11px] shadow-inner">
            <span className="text-[10px] text-slate-400 font-semibold px-1 hidden sm:inline">អក្សរ:</span>
            <button
              type="button"
              onClick={() => handleSetFontSize('compact')}
              className={`px-1.5 py-0.5 rounded font-bold cursor-pointer transition-all ${
                fontSize === 'compact' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="ទំហំតូចល្មម Phone (Compact)"
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => handleSetFontSize('normal')}
              className={`px-1.5 py-0.5 rounded font-bold cursor-pointer transition-all ${
                fontSize === 'normal' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="ទំហំធម្មតាល្មម (Normal)"
            >
              A
            </button>
            <button
              type="button"
              onClick={() => handleSetFontSize('large')}
              className={`px-1.5 py-0.5 rounded font-bold cursor-pointer transition-all ${
                fontSize === 'large' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="ទំហំធំច្បាស់ (Large)"
            >
              A+
            </button>
          </div>

          {/* Language Selector Pill */}
          <div className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl bg-slate-800/90 border border-slate-700/80 text-[11px] sm:text-xs shadow-inner">
            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">ភាសា:</span>
            <select
              value={selectedLang}
              onChange={(e) => handleLanguageSwitch(e.target.value)}
              className="bg-transparent text-pink-300 font-bold text-[11px] sm:text-xs focus:outline-none cursor-pointer"
            >
              <option value="km" className="bg-slate-900 text-slate-100">🇰🇭 ខ្មែរ (KH)</option>
              <option value="en" className="bg-slate-900 text-slate-100">🇺🇸 English</option>
              <option value="auto" className="bg-slate-900 text-slate-100">🌐 Auto</option>
            </select>
          </div>

          <button
            onClick={openEditModal}
            title="កែប្រែ ឬ បិទភ្ជាប់ទំនុកច្រៀងចម្រៀង"
            className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-300 hover:text-pink-100 text-[11px] font-semibold transition-all cursor-pointer shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden sm:inline">កែ / Paste អក្សរ</span>
            <span className="sm:hidden">កែ</span>
          </button>

          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-all cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isExpanded ? 'បង្រួម' : 'ពង្រីក'}</span>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 sm:p-5 space-y-3 sm:space-y-4">
          {/* Sub-bar: View Mode Switcher (Stage vs List vs Both) for Phones */}
          <div className="flex items-center justify-between text-xs px-1 text-slate-400">
            <span className="text-[11px] font-semibold text-slate-300">
              {lyricsViewMode === 'stage' ? '🎤 ផ្ដោតលើឆាកច្រៀង' : lyricsViewMode === 'list' ? '📜 បញ្ជីអក្សរចម្រៀង' : '✨ ឆាកច្រៀង + បញ្ជីអក្សរ'}
            </span>
            <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => handleSetLyricsViewMode('stage')}
                className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-all ${
                  lyricsViewMode === 'stage' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="ផ្ដោតលើឆាកច្រៀងធំច្បាស់ (Stage Only — ល្អបំផុតសម្រាប់ទូរស័ព្ទដៃ)"
              >
                🎤 ឆាកច្រៀង
              </button>
              <button
                type="button"
                onClick={() => handleSetLyricsViewMode('both')}
                className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-all ${
                  lyricsViewMode === 'both' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="បង្ហាញទាំងឆាកច្រៀង និងបញ្ជីអក្សរ (Both)"
              >
                ✨ ទាំងពីរ
              </button>
              <button
                type="button"
                onClick={() => handleSetLyricsViewMode('list')}
                className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-all ${
                  lyricsViewMode === 'list' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="បង្ហាញតែបញ្ជីអក្សរចម្រៀង (List Only)"
              >
                📜 បញ្ជី
              </button>
            </div>
          </div>

          {/* Main Karaoke Stage Screen */}
          {lyricsViewMode !== 'list' && (
            <div className="p-3.5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-pink-500/30 text-center space-y-3 relative overflow-hidden shadow-2xl min-h-[110px] sm:min-h-[140px] flex flex-col items-center justify-center">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-12 bg-pink-500/15 blur-2xl pointer-events-none" />

              {/* --- SCENARIO 1: COUNTDOWN 1 2 3 ONLY AFTER INTRO / INSTRUMENTAL BREAK --- */}
              {countdownNumber > 0 && nextSingingLine ? (
                <div className="space-y-2 sm:space-y-3 animate-fade-in py-1 w-full">
                  <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold text-xs tracking-wider uppercase">
                    <Timer className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    <span>ត្រៀមច្រៀង (GET READY)</span>
                  </div>

                  {/* The 1 2 3 Countdown Circles */}
                  <div className="flex items-center justify-center gap-2.5 sm:gap-3.5">
                    {[1, 2, 3].map((step) => {
                      // Step 1: 3s left, Step 2: 2s left, Step 3: 1s left
                      const isLit = (4 - countdownNumber) >= step;
                      const isCurrent = (4 - countdownNumber) === step;

                      return (
                        <div
                          key={step}
                          className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-extrabold text-lg sm:text-2xl transition-all duration-200 select-none ${
                            isCurrent
                              ? 'bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 text-white scale-125 shadow-xl shadow-pink-500/60 ring-4 ring-pink-400/50 animate-bounce'
                              : isLit
                              ? 'bg-emerald-900/80 border border-emerald-500/50 text-emerald-300 scale-105'
                              : 'bg-slate-900/90 border border-slate-800 text-slate-600'
                          }`}
                        >
                          {step}
                        </div>
                      );
                    })}
                  </div>

                  {/* Upcoming Singing Line Preview */}
                  <div className="space-y-0.5 px-3">
                    <p className="text-[11px] sm:text-xs font-bold text-pink-300">
                      {countdownNumber === 1 ? '🔥 ច្រៀង!' : '🎵 ត្រៀមចូលបទ...'}
                    </p>
                    <p className="text-sm sm:text-xl font-extrabold text-slate-100 line-clamp-2 leading-relaxed">
                      "{nextSingingLine.text}"
                    </p>
                  </div>
                </div>
              ) : isActivelySinging && currentLine ? (
                /* --- SCENARIO 2: ACTIVELY SINGING (លោតចូលកន្លែងច្រៀង) --- */
                <div className="space-y-1.5 sm:space-y-2 animate-fade-in w-full px-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-pink-500/15 text-pink-300 text-[10px] font-mono tracking-wider uppercase border border-pink-500/30">
                    <Music className="w-3 h-3 text-pink-400 animate-bounce" />
                    <span>កំពុងច្រៀង (Now Singing)</span>
                  </div>

                  {/* Big Glowing Karaoke Bouncing Text with dynamic font size */}
                  <p
                    className={`font-extrabold tracking-wide bg-gradient-to-r from-pink-400 via-rose-300 to-cyan-300 bg-clip-text text-transparent animate-pulse drop-shadow-lg transition-all duration-150 leading-relaxed break-words px-1 ${
                      fontSize === 'compact'
                        ? 'text-lg sm:text-2xl md:text-3xl'
                        : fontSize === 'large'
                        ? 'text-2xl sm:text-4xl md:text-5xl'
                        : 'text-xl sm:text-3xl md:text-4xl'
                    }`}
                  >
                    {currentLine.text}
                  </p>

                  {/* Next line preview */}
                  {nextSingingLine && (
                    <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-1 pt-0.5">
                      <span className="text-slate-500 font-semibold mr-1">បន្ទាប់:</span>
                      <span className="text-slate-300">{nextSingingLine.text}</span>
                    </p>
                  )}
                </div>
              ) : (
                /* --- SCENARIO 3: INSTRUMENTAL INTERLUDE / INTRO (ភ្លេង...) --- */
                <div className="space-y-2 sm:space-y-2.5 animate-fade-in py-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold">
                    <Waves className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                    <span>ភ្លេងកំដរ / ភ្លេងទោល (Instrumental Break)</span>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <Music className="w-5 h-5 text-pink-400 animate-bounce" />
                    <p className="text-2xl sm:text-3xl font-extrabold tracking-wider bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                      🎵 [ភ្លេង...]
                    </p>
                    <Music className="w-5 h-5 text-cyan-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>

                  {/* Animated Equalizer Waves */}
                  <div className="flex items-end justify-center gap-1.5 h-6">
                    {[35, 70, 95, 55, 85, 40, 100, 65, 50, 90, 60, 80, 45, 75].map((h, i) => (
                      <span
                        key={i}
                        className="w-1.5 rounded-t bg-gradient-to-t from-pink-500 via-purple-500 to-cyan-400 opacity-80 animate-pulse"
                        style={{
                          height: `${h}%`,
                          animationDuration: '0.6s',
                          animationDelay: `${(i * 0.07).toFixed(2)}s`,
                        }}
                      />
                    ))}
                  </div>

                  {nextSingingLine && (
                    <p className="text-xs text-slate-400 pt-1">
                      <span className="text-slate-500 font-semibold mr-1">ត្រៀមច្រៀងបន្ទាប់:</span>
                      <span className="text-slate-300 font-medium">"{nextSingingLine.text}"</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Interactive Scrollable Lyrics List */}
          {lyricsViewMode !== 'stage' && (
            lyrics.length > 0 ? (
              <div
                ref={containerRef}
                className="max-h-52 sm:max-h-56 overflow-y-auto space-y-1.5 pr-2 select-none scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
              >
              {lyrics.map((line, idx) => {
                const isMusic = isMusicInterludeText(line.text);
                const isActive = idx === activeIndex;
                const isNext = idx === nextSingingIndex;
                const isPast = activeIndex !== -1 && idx < activeIndex;

                return (
                  <div
                    key={line.id ?? idx}
                    ref={isActive || isNext ? activeLineRef : null}
                    onClick={() => onSeek && onSeek(line.start)}
                    className={`group flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-pink-500/25 via-purple-500/20 to-transparent border-l-4 border-pink-500 text-pink-200 font-bold shadow-md scale-[1.01]'
                        : isNext && countdownNumber > 0
                        ? 'bg-amber-500/10 border-l-4 border-amber-400 text-amber-200 font-semibold'
                        : isPast
                        ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className={`text-[10px] font-mono shrink-0 ${
                        isActive ? 'text-pink-400 font-extrabold' : isNext && countdownNumber > 0 ? 'text-amber-400 font-bold' : 'text-slate-600'
                      }`}>
                        {formatTime(line.start)}
                      </span>

                      {isMusic ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-950/70 border border-purple-500/30 text-purple-300 text-xs">
                          <Music className="w-3 h-3 text-purple-400" />
                          <span>🎵 [ភ្លេង...]</span>
                        </span>
                      ) : (
                        <span className="truncate">{line.text}</span>
                      )}
                    </div>

                    {isActive && (
                      <span className="shrink-0 flex items-center gap-1 text-[11px] text-pink-400 font-mono">
                        <Radio className="w-3 h-3 animate-ping" />
                      </span>
                    )}

                    {isNext && countdownNumber > 0 && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold animate-pulse">
                        ត្រៀម ({countdownNumber}s)
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            !isLoading && (
              <div className="p-6 text-center space-y-3 bg-slate-950/40 rounded-2xl border border-slate-800/60">
                <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  មិនទាន់មានអក្សរខារ៉ាអូខេរត់សម្រាប់បទនេះនៅឡើយទេ
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    onClick={openEditModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs transition-all shadow-md shadow-pink-500/20 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>✏️ បិទភ្ជាប់ទំនុកច្រៀងផ្ទាល់ខ្លួន (Paste Lyrics)</span>
                  </button>
                  <button
                    onClick={handleManualTranscribe}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs transition-all border border-slate-700 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                    <span>Transcribe ដោយ AI Whisper</span>
                  </button>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {/* Edit & Paste Lyrics Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xl bg-slate-900 border border-pink-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-200 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-pink-500/20 flex items-center justify-center border border-pink-500/40">
                  <Edit3 className="w-4 h-4 text-pink-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">✏️ កែប្រែ ឬ បិទភ្ជាប់ទំនុកច្រៀង (Lyrics Editor)</h3>
                  <p className="text-xs text-slate-400">
                    ប្រសិនបើ AI Transcribe មិនសូវត្រូវ អ្នកអាច Paste ទំនុកច្រៀងខ្មែរនៅទីនេះបានភ្លាមៗ!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>ទំនុកច្រៀង (១ បន្ទាត់ = ១ ឃ្លា)</span>
                <span className="text-[11px] text-pink-400 font-normal">
                  ប្រព័ន្ធនឹងបែងចែកនាទីច្រៀងស្វ័យប្រវត្តិ
                </span>
              </label>
              <textarea
                value={rawTextInput}
                onChange={(e) => setRawTextInput(e.target.value)}
                placeholder="បិទភ្ជាប់ទំនុកច្រៀងខ្មែរនៅទីនេះ...&#10;ឧទាហរណ៍៖&#10;មុនបងមានប្រពន្ធ អូននៅឯណា...&#10;ហេតុអ្វីទើបតែមកជួបគ្នាពេលនេះ...&#10;បងមិនដឹងថាអូនឯកា..."
                rows={9}
                className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-slate-200 text-sm focus:outline-none focus:border-pink-500/60 focus:ring-1 focus:ring-pink-500/40 font-sans resize-y leading-relaxed"
              />
            </div>

            {modalStatusMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  modalStatusMsg.type === 'success'
                    ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
                    : modalStatusMsg.type === 'info'
                    ? 'bg-sky-950/80 border border-sky-500/50 text-sky-300'
                    : 'bg-rose-950/80 border border-rose-500/50 text-rose-300'
                }`}
              >
                {modalStatusMsg.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                )}
                <span>{modalStatusMsg.text}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">ភាសា:</span>
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-pink-300 font-bold text-xs focus:outline-none cursor-pointer"
                >
                  <option value="km">🇰🇭 ភាសាខ្មែរ (Cambodia / Khmer)</option>
                  <option value="en">🇺🇸 English</option>
                  <option value="auto">🌐 ស្វ័យប្រវត្តិ (Auto Detect)</option>
                </select>

                <button
                  onClick={() => handleForceWhisper(selectedLang)}
                  disabled={isSavingLyrics}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer border border-slate-700 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSavingLyrics ? 'animate-spin' : ''}`} />
                  <span>Transcribe ឡើងវិញ</span>
                </button>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  បោះបង់
                </button>
                <button
                  onClick={handleSavePastedLyrics}
                  disabled={isSavingLyrics || !rawTextInput.trim()}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-pink-500/25 cursor-pointer disabled:opacity-50"
                >
                  {isSavingLyrics ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>រក្សាទុកទំនុកច្រៀង</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default KaraokeLyrics;
