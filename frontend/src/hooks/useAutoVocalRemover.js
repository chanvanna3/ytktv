import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Real-Time Auto Vocal Canceler (កាត់សម្លេងច្រៀងអូតូ 0 វិនាទី)
 * Uses Web Audio Mid-Side Phase Inversion & Band-Limited Center Channel Cancellation.
 * - Cancels center-panned lead vocals (Left - Right).
 * - Preserves mono low bass & kick (< 220Hz).
 * - Preserves stereo ambience (> 5kHz).
 */
export function useAutoVocalRemover({ audioElement }) {
  const [isAutoVocalCutActive, setIsAutoVocalCutActive] = useState(false);
  const [vocalCutDepth, setVocalCutDepth] = useState(0.85); // 0.0 - 1.0 (85% default cut)

  const audioCtxRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const splitterRef = useRef(null);
  const mergerRef = useRef(null);
  const inverterRef = useRef(null);
  const bassFilterRef = useRef(null);
  const highFilterRef = useRef(null);
  const dryGainRef = useRef(null);
  const wetGainRef = useRef(null);

  const initAutoVocalNodes = useCallback(() => {
    if (!audioElement || audioCtxRef.current) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaElementSource(audioElement);
      sourceNodeRef.current = source;

      // Split stereo channels (0: Left, 1: Right)
      const splitter = ctx.createChannelSplitter(2);
      splitterRef.current = splitter;

      // Invert Right Channel (gain = -1) to subtract (Left - Right)
      const inverter = ctx.createGain();
      inverter.gain.value = -1.0;
      inverterRef.current = inverter;

      // Low-pass filter to keep bass & drums punchy (< 220Hz)
      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowpass';
      bassFilter.frequency.value = 220;
      bassFilterRef.current = bassFilter;

      // High-pass filter to keep stereo air and cymbals (> 5000Hz)
      const highFilter = ctx.createBiquadFilter();
      highFilter.type = 'highpass';
      highFilter.frequency.value = 5000;
      highFilterRef.current = highFilter;

      // Merge nodes
      const centerCancelGain = ctx.createGain();
      centerCancelGain.gain.value = vocalCutDepth;

      const dryGain = ctx.createGain();
      dryGain.gain.value = isAutoVocalCutActive ? 0.0 : 1.0;
      dryGainRef.current = dryGain;

      const wetGain = ctx.createGain();
      wetGain.gain.value = isAutoVocalCutActive ? 1.0 : 0.0;
      wetGainRef.current = wetGain;

      // Routing for Dry path
      source.connect(dryGain);
      dryGain.connect(ctx.destination);

      // Routing for Center-Channel Cancel path:
      // source -> splitter
      // splitter[0] (L) -> centerCancel
      // splitter[1] (R) -> inverter (-1) -> centerCancel
      source.connect(splitter);
      splitter.connect(centerCancelGain, 0); // L
      splitter.connect(inverter, 1);        // R
      inverter.connect(centerCancelGain);   // L - R

      // Also preserve low bass & highs
      source.connect(bassFilter);
      source.connect(highFilter);

      bassFilter.connect(wetGain);
      highFilter.connect(wetGain);
      centerCancelGain.connect(wetGain);

      wetGain.connect(ctx.destination);

    } catch (err) {
      console.warn('Auto Vocal Remover AudioContext notice:', err);
    }
  }, [audioElement, isAutoVocalCutActive, vocalCutDepth]);

  const toggleAutoVocalCut = useCallback(() => {
    if (!audioCtxRef.current) initAutoVocalNodes();
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    setIsAutoVocalCutActive((prev) => {
      const next = !prev;
      if (dryGainRef.current) dryGainRef.current.gain.value = next ? 0.0 : 1.0;
      if (wetGainRef.current) wetGainRef.current.gain.value = next ? 1.0 : 0.0;
      return next;
    });
  }, [initAutoVocalNodes]);

  return {
    isAutoVocalCutActive,
    toggleAutoVocalCut,
    vocalCutDepth,
    setVocalCutDepth,
  };
}
