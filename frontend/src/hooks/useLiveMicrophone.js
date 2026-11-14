import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Hook for live microphone capture with optional echo/delay and gain control,
 * allowing users to sing directly along with the karaoke track through headphones/speakers.
 */
export function useLiveMicrophone() {
  const [isMicActive, setIsMicActive] = useState(false);
  const [micVolume, setMicVolume] = useState(0.85); // 0.0 - 1.5
  const [isEchoOn, setIsEchoOn] = useState(false);
  const [echoLevel, setEchoLevel] = useState(0.35); // 0.0 - 0.85 (Feedback Gain)
  const [delayTime, setDelayTime] = useState(0.22); // 0.05 - 0.60s (Delay in seconds)
  const [micError, setMicError] = useState(null);

  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const gainNodeRef = useRef(null);
  const delayNodeRef = useRef(null);
  const feedbackNodeRef = useRef(null);

  const startMic = useCallback(async () => {
    setMicError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported by your browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      const gain = ctx.createGain();
      gain.gain.value = micVolume;
      gainNodeRef.current = gain;

      // Delay / Echo effect nodes
      const delay = ctx.createDelay(1.0); // max delay 1.0s
      delay.delayTime.value = delayTime;
      delayNodeRef.current = delay;

      const feedback = ctx.createGain();
      feedback.gain.value = isEchoOn ? echoLevel : 0;
      feedbackNodeRef.current = feedback;

      // Routing:
      // source -> gain -> destination
      // source -> delay -> feedback -> delay
      // delay -> destination
      source.connect(gain);
      gain.connect(ctx.destination);

      source.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(ctx.destination);

      setIsMicActive(true);
    } catch (err) {
      console.error('Microphone activation failed:', err);
      setMicError(err.message || 'Could not access microphone.');
      setIsMicActive(false);
    }
  }, [micVolume, isEchoOn, echoLevel, delayTime]);

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

  // Adjust volume
  useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(micVolume, audioContextRef.current.currentTime, 0.03);
    }
  }, [micVolume]);

  // Adjust echo level & toggle
  useEffect(() => {
    if (feedbackNodeRef.current && audioContextRef.current) {
      const targetGain = isEchoOn ? Math.min(0.85, Math.max(0, echoLevel)) : 0;
      feedbackNodeRef.current.gain.setTargetAtTime(targetGain, audioContextRef.current.currentTime, 0.03);
    }
  }, [isEchoOn, echoLevel]);

  // Adjust delay time
  useEffect(() => {
    if (delayNodeRef.current && audioContextRef.current) {
      const targetDelay = Math.min(0.8, Math.max(0.04, delayTime));
      delayNodeRef.current.delayTime.setTargetAtTime(targetDelay, audioContextRef.current.currentTime, 0.03);
    }
  }, [delayTime]);

  // Preset Echo / Delay Profiles
  const setEchoPreset = useCallback((preset) => {
    setIsEchoOn(true);
    if (preset === 'room') {
      setDelayTime(0.12);
      setEchoLevel(0.25);
    } else if (preset === 'karaoke') {
      setDelayTime(0.22);
      setEchoLevel(0.40);
    } else if (preset === 'concert') {
      setDelayTime(0.35);
      setEchoLevel(0.55);
    } else if (preset === 'space') {
      setDelayTime(0.48);
      setEchoLevel(0.70);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMic();
    };
  }, [stopMic]);

  return {
    isMicActive,
    toggleMic,
    micVolume,
    setMicVolume,
    isEchoOn,
    setIsEchoOn,
    echoLevel,
    setEchoLevel,
    delayTime,
    setDelayTime,
    setEchoPreset,
    micError,
    micStream: mediaStreamRef.current,
  };
}
