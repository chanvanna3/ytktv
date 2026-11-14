import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Web Audio Studio Engine for Karaoke:
 * 1. Auto Vocal Cut (កាត់សម្លេងច្រៀងអូតូភ្លាមៗ 0 វិនាទី - Center-Channel Phase Inversion)
 * 2. Vocal De-Bleed Suppressor (កម្ចាត់សម្លេងចាល 90% - Vocal Residue Notch Filters)
 * 3. Karaoke Performance Recorder (ថតសម្លេងច្រៀង និងភ្លេងខារ៉ាអូខេ រួចទាញយកជា Audio File)
 */
export function useKaraokeStudio({ audioElement, micStream = null }) {
  // De-Bleed Filter state (for AI-separated stems)
  const [isDeBleedActive, setIsDeBleedActive] = useState(true);

  // Auto Vocal Cut state (Instant real-time vocal cancellation)
  const [isAutoVocalCutActive, setIsAutoVocalCutActive] = useState(false);

  // Performance Recorder state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Web Audio Context & Node Refs
  const audioCtxRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const deBleedFilter1Ref = useRef(null);
  const deBleedFilter2Ref = useRef(null);
  const dryGainRef = useRef(null);
  const wetGainRef = useRef(null);
  const bassFilterRef = useRef(null);
  const highFilterRef = useRef(null);
  const centerCancelGainRef = useRef(null);

  // Recording nodes
  const recordDestRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordTimerRef = useRef(null);

  // Initialize Web Audio graph
  const initAudioNodes = useCallback(() => {
    if (!audioElement || audioCtxRef.current) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaElementSource(audioElement);
      sourceNodeRef.current = source;

      // --- PATH A: Normal / De-Bleed Filter Path ---
      // 1. Vocal De-Bleed Notch 1 (1.8kHz Vocal Formant Cut -14dB)
      const deBleed1 = ctx.createBiquadFilter();
      deBleed1.type = 'peaking';
      deBleed1.frequency.value = 1800;
      deBleed1.Q.value = 2.0;
      deBleed1.gain.value = isDeBleedActive ? -14 : 0;
      deBleedFilter1Ref.current = deBleed1;

      // 2. Vocal De-Bleed Notch 2 (3.1kHz Vocal Sibilance/Presence Cut -12dB)
      const deBleed2 = ctx.createBiquadFilter();
      deBleed2.type = 'peaking';
      deBleed2.frequency.value = 3100;
      deBleed2.Q.value = 2.2;
      deBleed2.gain.value = isDeBleedActive ? -12 : 0;
      deBleedFilter2Ref.current = deBleed2;

      const dryGain = ctx.createGain();
      dryGain.gain.value = isAutoVocalCutActive ? 0.0 : 1.0;
      dryGainRef.current = dryGain;

      source.connect(deBleed1);
      deBleed1.connect(deBleed2);
      deBleed2.connect(dryGain);

      // --- PATH B: Real-Time Auto Vocal Cut (Phase Inversion Left - Right) ---
      const splitter = ctx.createChannelSplitter(2);
      const inverter = ctx.createGain();
      inverter.gain.value = -1.0;

      const centerCancelGain = ctx.createGain();
      centerCancelGain.gain.value = 0.95; // Strong vocal attenuation
      centerCancelGainRef.current = centerCancelGain;

      // Split audio into Left (0) and Right (1)
      source.connect(splitter);
      splitter.connect(centerCancelGain, 0); // L
      splitter.connect(inverter, 1);        // R
      inverter.connect(centerCancelGain);   // L - R (cancels center vocal)

      // Bass preservation (< 220Hz mono bass / kick)
      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowpass';
      bassFilter.frequency.value = 220;
      bassFilterRef.current = bassFilter;

      // High preservation (> 5000Hz cymbals / atmosphere)
      const highFilter = ctx.createBiquadFilter();
      highFilter.type = 'highpass';
      highFilter.frequency.value = 5000;
      highFilterRef.current = highFilter;

      source.connect(bassFilter);
      source.connect(highFilter);

      const wetGain = ctx.createGain();
      wetGain.gain.value = isAutoVocalCutActive ? 1.0 : 0.0;
      wetGainRef.current = wetGain;

      centerCancelGain.connect(wetGain);
      bassFilter.connect(wetGain);
      highFilter.connect(wetGain);

      // --- 3. Output & Recording Routing ---
      const recordDest = ctx.createMediaStreamDestination();
      recordDestRef.current = recordDest;

      // Route both paths to destination and record destination
      dryGain.connect(ctx.destination);
      dryGain.connect(recordDest);

      wetGain.connect(ctx.destination);
      wetGain.connect(recordDest);

    } catch (e) {
      console.warn('Web Audio initialization notice:', e);
    }
  }, [audioElement, isAutoVocalCutActive, isDeBleedActive]);

  // Auto-resume AudioContext on playback
  useEffect(() => {
    if (!audioElement) return;
    const handlePlay = () => {
      if (!audioCtxRef.current) initAudioNodes();
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    };
    audioElement.addEventListener('play', handlePlay);
    return () => {
      audioElement.removeEventListener('play', handlePlay);
    };
  }, [audioElement, initAudioNodes]);

  // Toggle Auto Vocal Cut (Instant Vocal Cut without waiting)
  const toggleAutoVocalCut = useCallback(() => {
    if (!audioCtxRef.current) initAudioNodes();
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    setIsAutoVocalCutActive((prev) => {
      const next = !prev;
      if (dryGainRef.current && wetGainRef.current) {
        dryGainRef.current.gain.value = next ? 0.0 : 1.0;
        wetGainRef.current.gain.value = next ? 1.0 : 0.0;
      }
      return next;
    });
  }, [initAudioNodes]);

  const setAutoVocalCut = useCallback((active) => {
    if (!audioCtxRef.current) initAudioNodes();
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    setIsAutoVocalCutActive(active);
    if (dryGainRef.current && wetGainRef.current) {
      dryGainRef.current.gain.value = active ? 0.0 : 1.0;
      wetGainRef.current.gain.value = active ? 1.0 : 0.0;
    }
  }, [initAudioNodes]);

  // Toggle De-Bleed Filter (កាត់សម្លេងចាល 90%)
  const toggleDeBleed = useCallback(() => {
    if (!audioCtxRef.current) initAudioNodes();
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    setIsDeBleedActive((prev) => {
      const next = !prev;
      if (deBleedFilter1Ref.current) deBleedFilter1Ref.current.gain.value = next ? -14 : 0;
      if (deBleedFilter2Ref.current) deBleedFilter2Ref.current.gain.value = next ? -12 : 0;
      return next;
    });
  }, [initAudioNodes]);

  // Karaoke Performance Recorder (ថតសម្លេងច្រៀងខារ៉ាអូខេ)
  const startRecording = useCallback(async () => {
    if (!audioCtxRef.current) initAudioNodes();
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }

    try {
      const dest = recordDestRef.current;
      if (!dest) return;

      // If mic is active, mix mic into record destination
      if (micStream && audioCtxRef.current) {
        try {
          const micSource = audioCtxRef.current.createMediaStreamSource(micStream);
          micSource.connect(dest);
        } catch (e) {}
      }

      const stream = dest.stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg',
      });

      recordedChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mediaRecorder.mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);
      };

      mediaRecorder.start(250);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Recording failed to start:', err);
    }
  }, [initAudioNodes, micStream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setIsRecording(false);
  }, []);

  return {
    // Auto Vocal Cut
    isAutoVocalCutActive,
    toggleAutoVocalCut,
    setAutoVocalCut,
    // De-Bleed Filter
    isDeBleedActive,
    toggleDeBleed,
    // Recording features
    isRecording,
    startRecording,
    stopRecording,
    recordedAudioUrl,
    recordingSeconds,
  };
}
