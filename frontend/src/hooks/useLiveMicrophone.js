import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Hook for live microphone capture with:
 * 1. Active Noise Suppression (កាត់ noise & hiss ចេញ)
 * 2. Ultra Low-Latency Direct Voice Monitoring (ច្រៀងមិន slow / 0ms lag)
 * 3. Studio Pre-amp Boost (180% - 250% full vocals)
 * 4. Dual-stage Anti-Hiss Noise Filters (100Hz Highpass + 9.5kHz Lowpass)
 * 5. Optional Parallel Wet Studio Reverb/Echo
 */
export function useLiveMicrophone() {
  const [isMicActive, setIsMicActive] = useState(false);
  // Default to 1.8x (180% Studio Boost) for rich, full singing voice
  const [micVolume, setMicVolume] = useState(1.8); // 0.0 - 3.0
  // Echo defaults to FALSE so the voice is 100% REAL-TIME (0ms instant response, not slow/laggy!)
  const [isEchoOn, setIsEchoOn] = useState(false);
  const [echoLevel, setEchoLevel] = useState(0.20); // Gentle feedback (0.0 - 0.40)
  const [delayTime, setDelayTime] = useState(0.08); // 80ms tight slapback (fast & smooth, not sluggish 200ms)
  const [isMonitorSpeaker, setIsMonitorSpeaker] = useState(false); // Hear yourself through headphones
  const [isHeadphonesConnected, setIsHeadphonesConnected] = useState(false);
  const [isNoiseCutActive, setIsNoiseCutActive] = useState(true); // Active Noise Cancellation filter
  const [keepMusicNormal, setKeepMusicNormal] = useState(true); // Disable browser/OS ducking to keep music at 100% full volume
  const [micError, setMicError] = useState(null);

  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const highpassNodeRef = useRef(null);
  const lowpassNodeRef = useRef(null);
  const presenceNodeRef = useRef(null);
  const gainNodeRef = useRef(null);
  const delayNodeRef = useRef(null);
  const feedbackNodeRef = useRef(null);
  const echoGainNodeRef = useRef(null);
  const limiterNodeRef = useRef(null);
  const monitorGainNodeRef = useRef(null);
  const isMonitorSpeakerRef = useRef(isMonitorSpeaker);
  const keepMusicNormalRef = useRef(true);

  // Keep refs in sync
  useEffect(() => {
    isMonitorSpeakerRef.current = isMonitorSpeaker;
  }, [isMonitorSpeaker]);

  useEffect(() => {
    keepMusicNormalRef.current = keepMusicNormal;
  }, [keepMusicNormal]);

  // Check if headphones or external headset are detected
  const detectHeadphones = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return false;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasHeadphones = devices.some((device) => {
        const label = (device.label || '').toLowerCase();
        return (
          label.includes('headphone') ||
          label.includes('headset') ||
          label.includes('earphone') ||
          label.includes('airpod') ||
          label.includes('buds') ||
          label.includes('bluetooth') ||
          label.includes('wireless') ||
          label.includes('hands-free')
        );
      });
      return hasHeadphones;
    } catch (e) {
      return false;
    }
  }, []);

  // Listen to device changes (headphones plugged in / unplugged)
  useEffect(() => {
    let isMounted = true;
    const handleDeviceChange = async () => {
      const detected = await detectHeadphones();
      if (!isMounted) return;
      if (detected) {
        setIsHeadphonesConnected(true);
        setIsMonitorSpeaker(true);
      }
    };

    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      handleDeviceChange();
      return () => {
        isMounted = false;
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      };
    }
  }, [detectHeadphones]);

  const startMic = useCallback(async (forcedMonitor) => {
    setMicError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('ឧបករណ៍ ឬ Browser របស់អ្នកមិនគាំទ្រ Microphone ឡើយ។');
      }

      // ULTRA-LOW LATENCY & MUSIC-FIRST CAPTURE:
      // When keepMusicNormal is true (default):
      // Disables WebRTC Echo Cancellation & AGC so Windows and Browser NEVER ducks
      // or lowers the karaoke music when singing into the microphone!
      const isNormal = keepMusicNormalRef.current;
      const audioConstraints = isNormal
        ? {
            echoCancellation: false,
            autoGainControl: false,
            noiseSuppression: false,
            latency: 0,
            channelCount: 1,
            googEchoCancellation: false,
            googAutoGainControl: false,
            googNoiseSuppression: false,
            googHighpassFilter: false,
          }
        : {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            latency: 0,
            channelCount: 1,
          };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      mediaStreamRef.current = stream;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      // latencyHint: 'interactive' requests the smallest buffer size from OS (sub-5ms)
      const ctx = new AudioContext({ latencyHint: 'interactive' });
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      // 1. Anti-Rumble High-pass Filter (100Hz): cuts table bumps, handling noise & AC rumble
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = isNoiseCutActive ? 100 : 40;
      highpassNodeRef.current = highpass;

      // 2. Anti-Hiss Low-pass Filter (9500Hz): cuts high-frequency electronic hiss & static noise
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = isNoiseCutActive ? 9500 : 20000;
      lowpassNodeRef.current = lowpass;

      // 3. Vocal Clarity Presence EQ (3000Hz, +2.8dB boost): makes singing voice crisp, clear, and full
      const presence = ctx.createBiquadFilter();
      presence.type = 'peaking';
      presence.frequency.value = 3000;
      presence.gain.value = 2.8;
      presence.Q.value = 1.0;
      presenceNodeRef.current = presence;

      // 4. Master Mic Pre-amp Gain (180% default boost)
      const gain = ctx.createGain();
      gain.gain.value = micVolume;
      gainNodeRef.current = gain;

      // 5. Fast Vocal Dynamics Limiter (protects ears without choking vocal volume)
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -6;
      limiter.knee.value = 20;
      limiter.ratio.value = 3.5;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.10;
      limiterNodeRef.current = limiter;

      // 6. Monitor Gain: routes microphone into headphones
      const shouldMonitor = typeof forcedMonitor === 'boolean' ? forcedMonitor : isMonitorSpeakerRef.current;
      const monitorGain = ctx.createGain();
      monitorGain.gain.value = shouldMonitor ? 1.0 : 0.0;
      monitorGainNodeRef.current = monitorGain;

      // 7. Parallel Echo & Reverb branch (optional wet effect, NEVER delays the dry voice!)
      const delay = ctx.createDelay(1.0);
      delay.delayTime.value = delayTime; // 0.08s (tight & natural, zero sluggish lag)
      delayNodeRef.current = delay;

      const feedback = ctx.createGain();
      feedback.gain.value = isEchoOn ? Math.min(0.35, echoLevel) : 0;
      feedbackNodeRef.current = feedback;

      const echoGain = ctx.createGain();
      echoGain.gain.value = isEchoOn ? 0.35 : 0.0;
      echoGainNodeRef.current = echoGain;

      // ==========================================
      // SIGNAL ROUTING:
      // 1. Direct Voice Path (REAL-TIME 0ms LATENCY):
      // source -> highpass -> lowpass -> presence -> gain -> monitorGain -> limiter -> destination
      // ==========================================
      source.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(presence);
      presence.connect(gain);

      // Direct dry voice to output with ZERO delay!
      gain.connect(monitorGain);

      // 2. Parallel Wet Echo Loop (Only adds ambiance if enabled):
      gain.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(echoGain);
      echoGain.connect(monitorGain);

      // Output to headphones
      monitorGain.connect(limiter);
      limiter.connect(ctx.destination);

      setIsMicActive(true);
    } catch (err) {
      console.error('Microphone activation failed:', err);
      setMicError(err.message || 'មិនអាចបើក Microphone បានទេ។');
      setIsMicActive(false);
    }
  }, [micVolume, isEchoOn, echoLevel, delayTime, isNoiseCutActive]);

  const stopMic = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsMicActive(false);
  }, []);

  const toggleMic = useCallback(() => {
    if (isMicActive) {
      stopMic();
    } else {
      startMic();
    }
  }, [isMicActive, startMic, stopMic]);

  // Headphone mode toggle: automatically activates microphone and monitoring into headphones
  const toggleHeadphones = useCallback((forcedState) => {
    setIsHeadphonesConnected((prev) => {
      const nextState = typeof forcedState === 'boolean' ? forcedState : !prev;
      setIsMonitorSpeaker(nextState);
      isMonitorSpeakerRef.current = nextState;

      if (nextState) {
        if (!mediaStreamRef.current) {
          startMic(true);
        } else if (monitorGainNodeRef.current && audioContextRef.current) {
          monitorGainNodeRef.current.gain.setTargetAtTime(1.0, audioContextRef.current.currentTime, 0.01);
        }
      } else {
        // Unplugged: immediately mute monitor speaker to prevent howling feedback!
        if (monitorGainNodeRef.current && audioContextRef.current) {
          monitorGainNodeRef.current.gain.setTargetAtTime(0.0, audioContextRef.current.currentTime, 0.01);
        }
      }
      return nextState;
    });
  }, [startMic]);

  // Adjust volume
  useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(micVolume, audioContextRef.current.currentTime, 0.01);
    }
  }, [micVolume]);

  // Adjust monitor speaker gain
  useEffect(() => {
    if (monitorGainNodeRef.current && audioContextRef.current) {
      const target = isMonitorSpeaker ? 1.0 : 0.0;
      monitorGainNodeRef.current.gain.setTargetAtTime(target, audioContextRef.current.currentTime, 0.01);
    }
  }, [isMonitorSpeaker]);

  // Adjust echo level & toggle safely (instantly updates wet gain)
  useEffect(() => {
    if (audioContextRef.current) {
      const now = audioContextRef.current.currentTime;
      if (feedbackNodeRef.current) {
        const safeLevel = Math.min(0.35, Math.max(0, echoLevel));
        const targetGain = isEchoOn ? safeLevel : 0;
        feedbackNodeRef.current.gain.setTargetAtTime(targetGain, now, 0.01);
      }
      if (echoGainNodeRef.current) {
        const targetWet = isEchoOn ? 0.35 : 0.0;
        echoGainNodeRef.current.gain.setTargetAtTime(targetWet, now, 0.01);
      }
    }
  }, [isEchoOn, echoLevel]);

  // Adjust delay time
  useEffect(() => {
    if (delayNodeRef.current && audioContextRef.current) {
      const targetDelay = Math.min(0.4, Math.max(0.04, delayTime));
      delayNodeRef.current.delayTime.setTargetAtTime(targetDelay, audioContextRef.current.currentTime, 0.01);
    }
  }, [delayTime]);

  // Toggle Noise Cut Filter (Hiss & Rumble)
  const toggleNoiseCut = useCallback(() => {
    setIsNoiseCutActive((prev) => {
      const next = !prev;
      if (audioContextRef.current) {
        const now = audioContextRef.current.currentTime;
        if (highpassNodeRef.current) {
          highpassNodeRef.current.frequency.setTargetAtTime(next ? 100 : 40, now, 0.02);
        }
        if (lowpassNodeRef.current) {
          lowpassNodeRef.current.frequency.setTargetAtTime(next ? 9500 : 20000, now, 0.02);
        }
      }
      return next;
    });
  }, []);

  // Preset Echo Profiles (tight & pleasant, not slow)
  const setEchoPreset = useCallback((preset) => {
    setIsEchoOn(true);
    if (preset === 'off') {
      setIsEchoOn(false);
    } else if (preset === 'room') {
      setDelayTime(0.06);
      setEchoLevel(0.15);
    } else if (preset === 'karaoke') {
      setDelayTime(0.09);
      setEchoLevel(0.22);
    } else if (preset === 'concert') {
      setDelayTime(0.16);
      setEchoLevel(0.30);
    }
  }, []);

  // Quick Mic Boost presets
  const setMicBoostPreset = useCallback((level) => {
    if (level === 'normal') setMicVolume(1.0);
    else if (level === 'full') setMicVolume(1.8);
    else if (level === 'boost') setMicVolume(2.5);
  }, []);

  // Toggle Keep Music Normal (No Ducking)
  const toggleKeepMusicNormal = useCallback(() => {
    setKeepMusicNormal((prev) => {
      const next = !prev;
      keepMusicNormalRef.current = next;
      if (isMicActive) {
        stopMic();
        setTimeout(() => {
          startMic();
        }, 120);
      }
      return next;
    });
  }, [isMicActive, startMic, stopMic]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMic();
    };
  }, [stopMic]);

  return {
    isMicActive,
    toggleMic,
    startMic,
    stopMic,
    micVolume,
    setMicVolume,
    setMicBoostPreset,
    isEchoOn,
    setIsEchoOn,
    echoLevel,
    setEchoLevel,
    delayTime,
    setDelayTime,
    setEchoPreset,
    isMonitorSpeaker,
    setIsMonitorSpeaker,
    isHeadphonesConnected,
    setIsHeadphonesConnected,
    toggleHeadphones,
    isNoiseCutActive,
    toggleNoiseCut,
    keepMusicNormal,
    setKeepMusicNormal,
    toggleKeepMusicNormal,
    micError,
    micStream: mediaStreamRef.current,
  };
}
