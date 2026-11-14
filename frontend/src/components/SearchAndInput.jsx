import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Link2,
  Sparkles,
  Loader2,
  AlertCircle,
  Mic,
  X,
  Clipboard,
  Flame,
  Music2,
  CheckCircle2,
  ArrowRight,
  History,
  Trash2,
  Brain,
  TrendingUp,
} from 'lucide-react';
import { extractVideoId } from '../utils/youtube';

// Helper component for mini audio soundwaves embedded in buttons/pills
function MiniSoundwave({ colorClass = 'text-pink-400' }) {
  return (
    <svg className={`w-7 h-2.5 ${colorClass} opacity-85 shrink-0`} viewBox="0 0 28 10" fill="none">
      <path
        d="M1 5h1.5m1.5-2v4m2-4v8m2-6v4m2-2v4m2-4v8m2-6v4m2-2v4m2-4v8m2-6v4m2-2v4m2-3v6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Preset color themes for cyber neon pills
const PILL_COLORS = [
  {
    borderClass: 'border-pink-500/80 shadow-[0_0_12px_rgba(236,72,153,0.35)]',
    textClass: 'text-pink-200 group-hover:text-white',
    iconClass: 'text-pink-400',
    waveColor: 'text-pink-400',
    icon: Flame,
  },
  {
    borderClass: 'border-purple-500/80 shadow-[0_0_12px_rgba(168,85,247,0.35)]',
    textClass: 'text-purple-200 group-hover:text-white',
    iconClass: 'text-purple-400',
    waveColor: 'text-purple-400',
    icon: Mic,
  },
  {
    borderClass: 'border-cyan-400/80 shadow-[0_0_12px_rgba(6,182,212,0.35)]',
    textClass: 'text-cyan-200 group-hover:text-white',
    iconClass: 'text-cyan-300',
    waveColor: 'text-cyan-400',
    icon: Sparkles,
  },
  {
    borderClass: 'border-violet-500/80 shadow-[0_0_12px_rgba(139,92,246,0.35)]',
    textClass: 'text-violet-200 group-hover:text-white',
    iconClass: 'text-violet-400',
    waveColor: 'text-violet-400',
    icon: Music2,
  },
  {
    borderClass: 'border-fuchsia-500/80 shadow-[0_0_12px_rgba(217,70,239,0.35)]',
    textClass: 'text-fuchsia-200 group-hover:text-white',
    iconClass: 'text-fuchsia-300',
    waveColor: 'text-fuchsia-400',
    icon: Sparkles,
  },
];

// Curated default trending songs
const DEFAULT_PRESETS = [
  { id: 'cI8m3kYmR4I', label: 'HENA - ដោះលែង', tag: 'HENA - ដោះលែង' },
  { id: 'n8_n8A2L4hQ', label: 'ចឺម - មុនបងមានប្រពន្ធ', tag: 'មុនបងមានប្រពន្ធ អូននៅឯណា ចឺម' },
  { id: 'dQw4w9WgXcQ', label: 'Tena - បងក្រ', tag: 'Tena - បងក្រ' },
  { id: 'kJQP7kiw5Fk', label: 'បទឆ្លងឆ្លើយ Karaoke', tag: 'បទឆ្លងឆ្លើយ Karaoke' },
  { id: 'yKNxeF4KMsY', label: 'Coldplay - Yellow', tag: 'Coldplay Yellow' },
];

export function SearchAndInput({ onSelectVideo, isProcessing, externalQuery }) {
  const [activeTab, setActiveTab] = useState('search');
  const [directUrl, setDirectUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [urlError, setUrlError] = useState(null);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Server-synced Singing History & Trending across all browsers & devices
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('karaoke_singing_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [serverTrending, setServerTrending] = useState([]);

  // Fetch history & trending from backend server (syncs across different browsers)
  const fetchServerHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        if (data.history && Array.isArray(data.history)) {
          setHistory(data.history);
          try {
            localStorage.setItem('karaoke_singing_history', JSON.stringify(data.history));
          } catch (e) {}
        }
        if (data.trending && Array.isArray(data.trending)) {
          setServerTrending(data.trending);
        }
      }
    } catch (err) {
      console.warn('Could not fetch server history, using local cache:', err);
    }
  }, []);

  // Sync on mount, when browser tab gains focus, and periodically
  useEffect(() => {
    fetchServerHistory();

    const handleFocus = () => fetchServerHistory();
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('karaoke_singing_history');
        if (saved) setHistory(JSON.parse(saved));
      } catch (e) {}
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('karaoke_history_updated', handleStorageChange);

    // Poll every 8 seconds for real-time sync across different browsers
    const interval = setInterval(fetchServerHistory, 8000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('karaoke_history_updated', handleStorageChange);
      clearInterval(interval);
    };
  }, [fetchServerHistory]);

  // When a song is selected / sung: record locally and on server
  const saveToHistory = async (id, title) => {
    const cleanTitle = title || `YouTube Video (${id})`;

    // 1. Optimistic Local Update
    setHistory((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      const updated = [
        {
          id,
          title: cleanTitle,
          count: (prev.find((p) => p.id === id)?.count || 0) + 1,
          timestamp: Date.now(),
        },
        ...filtered,
      ].slice(0, 15);
      try {
        localStorage.setItem('karaoke_singing_history', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // 2. Server Sync across different browsers
    try {
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: id, title: cleanTitle }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.history) setHistory(data.history);
        if (data.trending) setServerTrending(data.trending);
      }
    } catch (err) {
      console.warn('Server history sync warning:', err);
    }
  };

  const removeFromHistory = async (e, id) => {
    e.stopPropagation();
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem('karaoke_singing_history', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await fetch(`/api/history/${id}`, { method: 'DELETE' });
    } catch (err) {}
  };

  const clearHistory = async (e) => {
    e.stopPropagation();
    setHistory([]);
    setServerTrending([]);
    try {
      localStorage.removeItem('karaoke_singing_history');
      await fetch('/api/history', { method: 'DELETE' });
    } catch (err) {}
  };

  const handleSelectSong = (id, title) => {
    saveToHistory(id, title);
    onSelectVideo(id, title);
  };

  // Build combined trending pills:
  // Songs that were sung jump right into "គំរូពេញនិយម", merged with default presets!
  const trendingPills = useMemo(() => {
    const items = [];
    const seenIds = new Set();

    // 1. First add songs that users have sung across any browser (from serverTrending / history)
    const sungSongs = (serverTrending.length > 0 ? serverTrending : history).slice(0, 6);
    sungSongs.forEach((song) => {
      if (song.id && !seenIds.has(song.id)) {
        seenIds.add(song.id);
        items.push({
          id: song.id,
          label: song.title || `Song ${song.id}`,
          isSung: true,
          count: song.count || 1,
        });
      }
    });

    // 2. Fill remaining slots with default presets
    DEFAULT_PRESETS.forEach((preset) => {
      if (!seenIds.has(preset.id) && items.length < 6) {
        seenIds.add(preset.id);
        items.push({
          id: preset.id,
          label: preset.label,
          tag: preset.tag,
          isSung: false,
        });
      }
    });

    // 3. Attach styling
    return items.map((item, idx) => {
      const colorScheme = PILL_COLORS[idx % PILL_COLORS.length];
      return {
        ...item,
        ...colorScheme,
      };
    });
  }, [serverTrending, history]);

  // Direct URL submission
  const handleDirectUrlSubmit = (e) => {
    e.preventDefault();
    setUrlError(null);

    const videoId = extractVideoId(directUrl);
    if (!videoId) {
      setUrlError('សូមបញ្ចូលតំណភ្ជាប់ YouTube ត្រឹមត្រូវ ឬ Video ID (11 តួអក្សរ)។');
      return;
    }

    handleSelectSong(videoId, `YouTube Video (${videoId})`);
  };

  // Paste from clipboard helper
  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setDirectUrl(text.trim());
          setUrlError(null);
          setCopiedNotification(true);
          setTimeout(() => setCopiedNotification(false), 2000);
        }
      }
    } catch (e) {
      console.warn('Clipboard read permission denied or unavailable:', e);
    }
  };

  // YouTube search submission
  const handleSearchSubmit = async (e, customQuery = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const query = customQuery !== null ? customQuery : searchQuery;
    if (!query.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      if (!response.ok) {
        throw new Error(`Search failed (${response.status})`);
      }
      const data = await response.json();
      setSearchResults(data.items || []);
      if (!data.items || data.items.length === 0) {
        setSearchError('រកមិនឃើញវីដេអូសម្រាប់ពាក្យនេះឡើយ។ សូមសាកល្បងពាក្យគន្លឹះផ្សេងទៀត។');
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchError('មិនអាចទាញយកទិន្នន័យពី YouTube បានឡើយ។ សូមពិនិត្យមើលការតភ្ជាប់អ៊ីនធឺណិត។');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle external search query triggers
  useEffect(() => {
    if (externalQuery && externalQuery.trim()) {
      setActiveTab('search');
      setSearchQuery(externalQuery);
      handleSearchSubmit(null, externalQuery);
    }
  }, [externalQuery]);

  return (
    <div className="relative p-1 rounded-[28px] bg-gradient-to-b from-cyan-500/30 via-slate-800/40 to-pink-500/20 shadow-[0_0_40px_rgba(6,182,212,0.18)] transition-all">
      {/* Sci-Fi HUD Outer Chassis Container */}
      <div className="bg-[#070b19]/95 backdrop-blur-2xl rounded-[26px] p-4 sm:p-7 space-y-6 relative overflow-hidden border border-cyan-500/40 shadow-[inset_0_0_25px_rgba(6,182,212,0.1)]">
        
        {/* 1. Sci-Fi Corner Brackets & Tech Accents */}
        <div className="absolute top-2.5 left-2.5 w-7 h-7 border-t-2 border-l-2 border-cyan-400 pointer-events-none rounded-tl-md">
          <div className="w-1 h-1 bg-cyan-300 mt-1 ml-1" />
        </div>
        <div className="absolute top-2.5 right-2.5 w-7 h-7 border-t-2 border-r-2 border-cyan-400 pointer-events-none rounded-tr-md">
          <div className="w-1 h-1 bg-cyan-300 mt-1 mr-1 ml-auto" />
        </div>
        <div className="absolute bottom-2.5 left-2.5 w-7 h-7 border-b-2 border-l-2 border-cyan-400 pointer-events-none rounded-bl-md">
          <div className="w-1 h-1 bg-cyan-300 mb-1 ml-1" />
        </div>
        <div className="absolute bottom-2.5 right-2.5 w-7 h-7 border-b-2 border-r-2 border-cyan-400 pointer-events-none rounded-br-md">
          <div className="w-1 h-1 bg-cyan-300 mb-1 mr-1 ml-auto" />
        </div>

        {/* Top Edge Tech Accents */}
        <div className="absolute top-0 inset-x-0 flex justify-between items-center px-16 pointer-events-none opacity-60">
          <div className="h-[2px] w-14 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
          <div className="flex gap-1.5 items-center">
            <span className="w-2 h-0.5 bg-cyan-400" />
            <span className="w-4 h-0.5 bg-cyan-400" />
            <span className="w-2 h-0.5 bg-cyan-400" />
          </div>
          <div className="h-[2px] w-14 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
        </div>

        {/* 3D Cyber Perspective Grid Floor in Background */}
        <div className="absolute bottom-0 inset-x-0 h-28 cyber-grid-floor pointer-events-none opacity-45 z-0" />

        {/* Ambient Glow Spots */}
        <div className="pointer-events-none absolute -top-24 -left-20 w-80 h-80 bg-pink-500/15 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-20 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl" />

        {/* =========================================================================
            TOP ROW: Tabs + Plasma Flame Glow + Holographic AI Radar Status
           ========================================================================= */}
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-cyan-500/20 pb-5">
          {/* Left Buttons: Flaming Search Tab + Direct Link Cyber Tab */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            {/* Tab 1: Search YouTube with Flaming Plasma Fire Aura */}
            <div className="relative group">
              {activeTab === 'search' && (
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-rose-500 to-pink-600 rounded-2xl blur-md opacity-85 cyber-flame-glow pointer-events-none" />
              )}
              <button
                onClick={() => setActiveTab('search')}
                className={`relative px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden border ${
                  activeTab === 'search'
                    ? 'bg-gradient-to-r from-rose-600 via-pink-600 to-purple-700 text-white border-pink-300/60 shadow-[0_0_25px_rgba(244,63,94,0.7)] scale-[1.02]'
                    : 'bg-slate-900/90 text-slate-400 border-slate-700/80 hover:border-cyan-400/60 hover:text-cyan-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-white drop-shadow" />
                  <span className="tracking-wide">ស្វែងរកចម្រៀង (Search YouTube)</span>
                </div>
                {/* Embedded Soundwave Under Tab Text */}
                {activeTab === 'search' && (
                  <svg className="w-32 h-1.5 mt-1 text-white/80 opacity-90 cyber-wave-anim" viewBox="0 0 100 8" fill="none">
                    <path
                      d="M0 4 Q 10 1, 20 4 T 40 4 T 60 1 T 80 7 T 100 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </button>
            </div>

            {/* Tab 2: Direct Link (Cyber Slate Chamfered with Cyan Clips) */}
            <div className="relative">
              <button
                onClick={() => setActiveTab('url')}
                className={`relative px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 border ${
                  activeTab === 'url'
                    ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-700 text-white border-cyan-300/80 shadow-[0_0_20px_rgba(6,182,212,0.6)]'
                    : 'bg-slate-900/90 text-cyan-200/90 border-cyan-500/50 hover:bg-cyan-950/40 hover:border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                }`}
              >
                {/* Cyan Corner Tech Clips */}
                <span className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-300" />
                <span className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-300" />

                <Link2 className="w-4 h-4 text-cyan-300" />
                <span>ដាក់តំណភ្ជាប់ (Direct Link)</span>
              </button>
            </div>
          </div>

          {/* Right Side: Circular Holographic AI Radar HUD Widget */}
          <div className="flex items-center gap-3 self-end lg:self-center">
            {/* Spinning AI Hologram Radar Core */}
            <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-emerald-400/80 cyber-radar-spin" />
              <div className="absolute inset-1.5 rounded-full border border-cyan-400/60 cyber-radar-spin-rev" />
              <div className="absolute inset-0 rounded-full border border-emerald-400/50 cyber-radar-ping" />
              <Brain className="w-5 h-5 text-emerald-300 filter drop-shadow-[0_0_8px_rgba(52,211,153,0.9)] relative z-10" />
            </div>

            {/* AI Status Capsule Pill */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-400/60 shadow-[0_0_15px_rgba(16,185,129,0.35)]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              <span className="text-[11px] sm:text-xs font-mono font-semibold text-emerald-300 tracking-wide">
                AI Vocal Separation Ready (95%+)
              </span>
            </div>

            {/* Right Outer Circular Dial Ring */}
            <div className="relative w-9 h-9 hidden xl:flex items-center justify-center shrink-0">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-400/70 border-t-transparent cyber-radar-spin" />
              <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
            </div>
          </div>
        </div>

        {/* =========================================================================
            MIDDLE ROW: Cyber Console Search Input + Pink Neon Audio Wave Search Button
           ========================================================================= */}
        {activeTab === 'search' && (
          <div className="space-y-4 relative z-10">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch gap-3">
              {/* Cyber Console Input Bar with Cyan Glow & Circuit Vents */}
              <div className="relative flex-1 group">
                <div className="relative flex items-center rounded-2xl bg-[#060a17]/90 border-2 border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.35),inset_0_0_15px_rgba(6,182,212,0.12)] focus-within:border-cyan-300 focus-within:shadow-[0_0_28px_rgba(6,182,212,0.55)] transition-all overflow-hidden">
                  <div className="pl-4 pr-2 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 filter drop-shadow-[0_0_8px_rgba(6,182,212,0.9)] transition-colors" />
                  </div>

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="វាយឈ្មោះបទចម្រៀង ឬ តារាចម្រៀង"
                    disabled={isSearching}
                    className="w-full py-4 pr-3 bg-transparent text-slate-100 placeholder-slate-400/90 font-medium text-sm sm:text-base focus:outline-none"
                  />

                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="pr-3 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {/* Right Circuit Vents / Slanted Tech Louvers */}
                  <div className="hidden md:flex items-center gap-1.5 pr-4 pointer-events-none opacity-70">
                    <div className="w-1.5 h-6 bg-cyan-400/30 transform -skew-x-12" />
                    <div className="w-1.5 h-6 bg-cyan-400/50 transform -skew-x-12" />
                    <div className="w-1.5 h-6 bg-cyan-400/70 transform -skew-x-12" />
                    <div className="w-1 h-6 bg-cyan-300 transform -skew-x-12 shadow-[0_0_6px_#22d3ee]" />
                  </div>
                </div>
              </div>

              {/* Pink Neon Search Button with Embedded Horizontal Soundwave */}
              <button
                type="submit"
                disabled={!searchQuery.trim() || isSearching}
                className="relative px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-400 hover:to-purple-500 text-white font-bold text-sm sm:text-base shadow-[0_0_25px_rgba(244,63,94,0.7)] hover:shadow-[0_0_35px_rgba(244,63,94,0.9)] border border-pink-300/40 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center shrink-0 overflow-hidden"
              >
                <svg
                  className="absolute inset-0 w-full h-full opacity-40 pointer-events-none cyber-wave-anim"
                  preserveAspectRatio="none"
                  viewBox="0 0 160 40"
                >
                  <path
                    d="M0 20 Q 20 6, 40 20 T 80 20 T 120 6 T 160 20"
                    stroke="white"
                    strokeWidth="2.5"
                    fill="none"
                  />
                  <path
                    d="M0 20 Q 20 34, 40 20 T 80 20 T 120 34 T 160 20"
                    stroke="white"
                    strokeWidth="1.5"
                    fill="none"
                    opacity="0.6"
                  />
                </svg>

                <span className="relative z-10 flex items-center gap-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>កំពុងស្វែងរក...</span>
                    </>
                  ) : (
                    <span>ស្វែងរក</span>
                  )}
                </span>
              </button>
            </form>

            {/* =========================================================================
                BOTTOM ROW: Trending Pills (គំរូពេញនិយម) & History across different browsers
               ========================================================================= */}
            <div className="space-y-2.5 pt-1">
              {/* 1. Singing History (បទធ្លាប់ច្រៀង - Synced across all browsers) */}
              {history.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap animate-fade-in p-2.5 rounded-2xl bg-slate-950/70 border border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.15)]">
                  <span className="text-xs font-bold text-pink-400 flex items-center gap-1.5 shrink-0 px-1">
                    <History className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                    <span>បទធ្លាប់ច្រៀង (History):</span>
                  </span>

                  {history.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectSong(item.id, item.title)}
                      className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-950/70 hover:bg-pink-900 border border-pink-500/50 text-pink-200 hover:text-white text-xs font-semibold transition-all hover:scale-[1.02] cursor-pointer shadow-[0_0_8px_rgba(236,72,153,0.25)]"
                      title={`ច្រៀងបទនេះម្តងទៀត: ${item.title}`}
                    >
                      <Music2 className="w-3 h-3 text-pink-400 shrink-0 group-hover:rotate-12 transition-transform" />
                      <span className="max-w-[150px] sm:max-w-[180px] truncate">{item.title}</span>
                      <MiniSoundwave colorClass="text-pink-400" />
                      <button
                        type="button"
                        onClick={(e) => removeFromHistory(e, item.id)}
                        className="text-pink-400/70 hover:text-white p-0.5 rounded-full hover:bg-pink-800 transition-colors ml-0.5 cursor-pointer"
                        title="លុបបទនេះចេញពីប្រវត្តិ"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={clearHistory}
                    className="text-[11px] text-slate-400 hover:text-rose-400 underline underline-offset-2 ml-1 cursor-pointer transition-colors"
                    title="សម្អាតប្រវត្តិទាំងអស់"
                  >
                    សម្អាត
                  </button>
                </div>
              )}

              {/* 2. Trending Quick Pills (គំរូពេញនិយម) - Automatically jumps in when sung on ANY browser */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1 shrink-0 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]">
                  <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>គំរូពេញនិយម:</span>
                </span>

                {trendingPills.map((item) => {
                  const IconComponent = item.icon || Flame;
                  return (
                    <button
                      key={item.id || item.tag || item.label}
                      type="button"
                      onClick={() => {
                        // If it is a sung song with video id, play directly; otherwise search
                        if (item.isSung && item.id) {
                          handleSelectSong(item.id, item.label);
                        } else {
                          const query = item.tag || item.label;
                          setSearchQuery(query);
                          handleSearchSubmit(null, query);
                        }
                      }}
                      className={`group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#070b1a]/90 hover:bg-slate-900 border ${item.borderClass} ${item.textClass} text-xs font-medium transition-all hover:scale-[1.04] active:scale-95 cursor-pointer`}
                      title={item.isSung ? `បទច្រៀងពេញនិយម: ${item.label} (ចុចដើម្បីច្រៀងភ្លាមៗ)` : `ស្វែងរក: ${item.label}`}
                    >
                      <IconComponent className={`w-3.5 h-3.5 ${item.iconClass} group-hover:rotate-12 transition-transform`} />
                      <span className="font-semibold max-w-[170px] truncate">{item.label}</span>
                      {/* Mini Audio Soundwave SVG inside each pill */}
                      <MiniSoundwave colorClass={item.waveColor} />
                    </button>
                  );
                })}
              </div>
            </div>

            {searchError && (
              <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-center gap-2.5 text-amber-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{searchError}</span>
              </div>
            )}

            {/* Search Results Grid */}
            {searchResults.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center justify-between pb-3 text-xs text-slate-400 font-medium">
                  <span>លទ្ធផលស្វែងរក ({searchResults.length} វីដេអូ)</span>
                  <span className="text-pink-400">ចុចលើវីដេអូដើម្បីចាប់ផ្តើមច្រៀងខារ៉ាអូខេ</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[490px] overflow-y-auto pr-1 select-none scrollbar-thin scrollbar-thumb-slate-700">
                  {searchResults.map((item) => (
                    <div
                      key={item.videoId}
                      onClick={() => handleSelectSong(item.videoId, item.title)}
                      className="group relative flex flex-col bg-slate-950/70 hover:bg-slate-850 rounded-2xl overflow-hidden border border-slate-800 hover:border-pink-500/60 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-pink-500/10 hover:-translate-y-1"
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />

                        {/* Hover Overlay Button */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3">
                          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs shadow-xl shadow-pink-500/40 transform scale-90 group-hover:scale-100 transition-transform">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>កាត់សំឡេងច្រៀង & ច្រៀង</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 flex flex-col justify-between flex-1 space-y-2.5">
                        <h4
                          className="text-xs sm:text-sm font-bold text-slate-100 line-clamp-2 leading-snug group-hover:text-pink-300 transition-colors"
                          dangerouslySetInnerHTML={{ __html: item.title }}
                        />
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                          <span className="truncate max-w-[140px] font-medium">{item.channelTitle}</span>
                          <span className="text-pink-400 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                            <Mic className="w-3.5 h-3.5" />
                            <span>ច្រៀងភ្លាមៗ</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Direct Link Input */}
        {activeTab === 'url' && (
          <form onSubmit={handleDirectUrlSubmit} className="space-y-4 relative z-10">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>តំណភ្ជាប់វីដេអូ YouTube (YouTube Video URL)</span>
                {copiedNotification && (
                  <span className="text-emerald-400 text-[11px] flex items-center gap-1 animate-fade-in font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>បានបិទភ្ជាប់ពី Clipboard ជោគជ័យ!</span>
                  </span>
                )}
              </label>

              <div className="relative group">
                <div className="relative flex items-center rounded-2xl bg-[#060a17]/90 border-2 border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.35)] focus-within:border-cyan-300 transition-all overflow-hidden">
                  <div className="pl-4 pr-2 flex items-center pointer-events-none">
                    <Link2 className="w-5 h-5 text-cyan-400 filter drop-shadow-[0_0_8px_rgba(6,182,212,0.9)]" />
                  </div>

                  <input
                    type="text"
                    value={directUrl}
                    onChange={(e) => {
                      setDirectUrl(e.target.value);
                      if (urlError) setUrlError(null);
                    }}
                    placeholder="បិទភ្ជាប់តំណ YouTube Link (e.g., https://www.youtube.com/watch?v=... ឬ youtu.be/...)"
                    disabled={isProcessing}
                    className="w-full py-4 pr-28 bg-transparent text-slate-100 placeholder-slate-400/90 font-medium text-sm sm:text-base focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="absolute right-3 h-9 px-3 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-cyan-400/50 shadow-sm"
                  >
                    <Clipboard className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Paste</span>
                  </button>
                </div>
              </div>
            </div>

            {urlError && (
              <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{urlError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>គាំទ្រទាំងតំណ YouTube ធម្មតា, YouTube Shorts, និង ID 11 តួអក្សរ។</span>
              </span>

              <button
                type="submit"
                disabled={!directUrl.trim()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-sm transition-all shadow-[0_0_20px_rgba(6,182,212,0.5)] active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>បំបែកភ្លេងខារ៉ាអូខេ (AI Extract & Sing)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default SearchAndInput;