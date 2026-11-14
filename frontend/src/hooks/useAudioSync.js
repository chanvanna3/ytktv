import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * YouTube IFrame State constants
 */
const YT_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5
};

const DRIFT_THRESHOLD_SECONDS = 0.15; // 150ms drift tolerance
const DRIFT_CHECK_INTERVAL_MS = 100;  // 100ms high-precision sync update (10x/sec)

export function useAudioSync({ instrumentalUrl, vocalsUrl, playerRef, isPlayerReady }) {
  // Audio element references
  const instAudioRef = useRef(new Audio());
  const vocalAudioRef = useRef(new Audio());

  // Karaoke controls state: Default to VOCALS MUTED (isVocalOn = false)
  // so the user immediately gets pure AI Instrumental Karaoke!
  const [isVocalOn, setIsVocalOn] = useState(false);
  const [instVolume, setInstVolume] = useState(1.0); // Full instrumental volume
  const [vocalVolume, setVocalVolume] = useState(0.70); // 0.0 - 1.0
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [currentDriftMs, setCurrentDriftMs] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  // Setup audio sources when URLs change
  useEffect(() => {
    const inst = instAudioRef.current;
    const voc = vocalAudioRef.current;

    if (!instrumentalUrl) {
      setAudioLoaded(false);
      setPlaybackTime(0);
      setCurrentDriftMs(0);
      try {
        inst.pause();
        voc.pause();
        inst.src = '';
        voc.src = '';
      } catch (e) {}
      return;
    }

    setAudioLoaded(false);
    setPlaybackTime(0);
    setCurrentDriftMs(0);
    try {
      inst.pause();
      voc.pause();
    } catch (e) {}

    inst.crossOrigin = 'anonymous';
    inst.src = instrumentalUrl;
    inst.preload = 'auto';

    const hasVocals = Boolean(vocalsUrl);
    if (hasVocals) {
      voc.crossOrigin = 'anonymous';
      voc.src = vocalsUrl;
      voc.preload = 'auto';
      voc.volume = vocalVolume;
      voc.muted = !isVocalOn;
    } else {
      voc.src = '';
    }

    inst.volume = instVolume;

    let instReady = false;
    let vocReady = !hasVocals; // If no separate vocalsUrl, vocReady is immediately true!

    const checkBothReady = () => {
      if (instReady && vocReady) {
        if (hasVocals) {
          voc.muted = !isVocalOn;
        }
        inst.volume = instVolume;
        setAudioLoaded(true);
        setAudioDuration(inst.duration || 0);

        // If YouTube player is already playing, start playing synchronized audio immediately!
        const player = playerRef && playerRef.current;
        if (player && typeof player.getPlayerState === 'function') {
          const state = player.getPlayerState();
          if (state === YT_STATE.PLAYING) {
            const ytTime = player.getCurrentTime ? player.getCurrentTime() : 0;
            inst.currentTime = ytTime;
            if (hasVocals) voc.currentTime = ytTime;
            inst.play().catch((err) => console.warn('inst.play() error:', err));
            if (hasVocals) voc.play().catch((err) => console.warn('voc.play() error:', err));
          }
        }
      }
    };

    const handleInstCanPlay = () => {
      instReady = true;
      checkBothReady();
    };

    const handleVocCanPlay = () => {
      vocReady = true;
      checkBothReady();
    };

    inst.addEventListener('canplaythrough', handleInstCanPlay, { once: true });
    if (hasVocals) {
      voc.addEventListener('canplaythrough', handleVocCanPlay, { once: true });
    }

    // Fallback: in case canplaythrough fired immediately or cached
    if (inst.readyState >= 3) instReady = true;
    if (hasVocals && voc.readyState >= 3) vocReady = true;
    checkBothReady();

    return () => {
      inst.removeEventListener('canplaythrough', handleInstCanPlay);
      if (hasVocals) {
        voc.removeEventListener('canplaythrough', handleVocCanPlay);
      }
    };
  }, [instrumentalUrl, vocalsUrl]);

  // Update volume and mute settings in real-time
  useEffect(() => {
    if (instAudioRef.current) {
      instAudioRef.current.volume = instVolume;
    }
  }, [instVolume]);

  useEffect(() => {
    if (vocalAudioRef.current) {
      vocalAudioRef.current.volume = vocalVolume;
      vocalAudioRef.current.muted = !isVocalOn;
    }
  }, [vocalVolume, isVocalOn]);

  // Synchronize audio playback with YouTube Player state
  const handlePlayerStateChange = useCallback((state) => {
    const inst = instAudioRef.current;
    const voc = vocalAudioRef.current;
    const player = playerRef && playerRef.current;

    if (!player || typeof player.getCurrentTime !== 'function') return;

    const hasVocals = Boolean(vocalsUrl);

    if (state === YT_STATE.PLAYING) {
      const ytTime = player.getCurrentTime();
      if (Math.abs(inst.currentTime - ytTime) > 0.05) {
        inst.currentTime = ytTime;
      }
      if (hasVocals && Math.abs(voc.currentTime - ytTime) > 0.05) {
        voc.currentTime = ytTime;
      }

      if (hasVocals) {
        voc.muted = !isVocalOn;
      }

      const p1 = inst.play();
      if (p1 && p1.catch) p1.catch((e) => console.warn('Instrumental playback error:', e));

      if (hasVocals && voc.src) {
        const p2 = voc.play();
        if (p2 && p2.catch) p2.catch((e) => console.warn('Vocals playback error:', e));
      }

    } else if (state === YT_STATE.PAUSED || state === YT_STATE.ENDED) {
      inst.pause();
      if (hasVocals) voc.pause();
    } else if (state === YT_STATE.BUFFERING) {
      inst.pause();
      if (hasVocals) voc.pause();
    }
  }, [playerRef, isVocalOn, vocalsUrl]);

  // Drift Correction Heartbeat Engine (runs every 500ms during playback)
  useEffect(() => {
    const inst = instAudioRef.current;
    const voc = vocalAudioRef.current;
    const hasVocals = Boolean(vocalsUrl);

    const intervalId = setInterval(() => {
      const player = playerRef && playerRef.current;
      if (!player || typeof player.getPlayerState !== 'function' || typeof player.getCurrentTime !== 'function') {
        if (inst && !inst.paused) {
          setPlaybackTime(inst.currentTime);
        }
        return;
      }

      try {
        const state = player.getPlayerState();
        if (state === YT_STATE.PLAYING) {
          const ytTime = player.getCurrentTime();
          setPlaybackTime(ytTime);

          const instDiff = Math.abs(inst.currentTime - ytTime);
          const vocDiff = hasVocals ? Math.abs(voc.currentTime - ytTime) : 0;
          const maxDrift = Math.max(instDiff, vocDiff);
          setCurrentDriftMs(Math.round(maxDrift * 1000));

          if (instDiff > DRIFT_THRESHOLD_SECONDS) {
            inst.currentTime = ytTime;
          }
          if (hasVocals && vocDiff > DRIFT_THRESHOLD_SECONDS) {
            voc.currentTime = ytTime;
          }

          if (inst.paused && audioLoaded) inst.play().catch(() => {});
          if (hasVocals && voc.paused && audioLoaded) voc.play().catch(() => {});
        } else {
          if (inst && !inst.paused) {
            setPlaybackTime(inst.currentTime);
          } else {
            if (!inst.paused) inst.pause();
            if (hasVocals && !voc.paused) voc.pause();
          }
        }
      } catch (err) {
        // Player re-initializing
      }
    }, DRIFT_CHECK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [playerRef, audioLoaded]);

  // Vocal toggle handler (Mute / Unmute vocals in real time)
  const toggleVocals = useCallback(() => {
    setIsVocalOn((prev) => {
      const next = !prev;
      if (vocalAudioRef.current) {
        vocalAudioRef.current.muted = !next;
      }
      return next;
    });
  }, []);

  const seekAudio = useCallback((seconds) => {
    if (instAudioRef.current) instAudioRef.current.currentTime = seconds;
    if (vocalAudioRef.current) vocalAudioRef.current.currentTime = seconds;
    setPlaybackTime(seconds);
  }, []);

  const stopAudio = useCallback(() => {
    const inst = instAudioRef.current;
    const voc = vocalAudioRef.current;
    try {
      inst.pause();
      voc.pause();
      inst.currentTime = 0;
      voc.currentTime = 0;
      inst.removeAttribute('src');
      voc.removeAttribute('src');
      inst.load();
      voc.load();
    } catch (e) {}
    setAudioLoaded(false);
    setPlaybackTime(0);
    setCurrentDriftMs(0);
  }, []);

  return {
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
    instAudioElement: instAudioRef.current,
    handlePlayerStateChange,
    seekAudio,
    stopAudio,
  };
}
