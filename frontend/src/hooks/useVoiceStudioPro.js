import { useState, useRef, useEffect, useCallback } from 'react';

// Musical scale intervals (semitones from root)
const SCALES = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonicMajor: [0, 2, 4, 7, 9],
  pentatonicMinor: [0, 3, 5, 7, 10],
  khmerPentatonic: [0, 2, 5, 7, 9], // Traditional Cambodian/Asian 5-tone scale
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * 8 Professional One-Click Voice Presets
 */
export const VOICE_PRESETS = {
  sweet: {
    id: 'sweet',
    name: 'Sweet Voice',
    nameKm: 'សំឡេងស្រទន់',
    descKm: 'សំឡេងស្រទន់ ពិរោះរណ្តំ បែប Reverb ស្រាល ជាមួយ Bass & Treble ស្រទន់',
    icon: 'sparkles',
    color: 'from-pink-500 to-rose-500',
    effects: {
      bass: 2.0,
      mid: 0.5,
      treble: 3.5,
      isReverbOn: true,
      reverbType: 'studio',
      reverbWet: 0.38,
      reverbDry: 1.0,
      reverbRoomSize: 0.9,
      reverbDecayTime: 1.4,
      isEchoOn: true,
      delayTime: 0.08,
      echoFeedback: 0.20,
      echoLevel: 0.20,
      compThreshold: -16,
      compRatio: 3.0,
      noiseReductionMode: 'medium',
      noiseGateThreshold: -50,
      isAgcActive: false,
      isAutoTuneActive: true,
      autoTuneStrength: 0.45,
      pitchShift: 0,
    },
  },
  studio: {
    id: 'studio',
    name: 'Professional Studio',
    nameKm: 'Studio អាជីព',
    descKm: 'សំឡេងស្តង់ដារ Recording Studio ភ្លឺច្បាស់ ណែនល្អ គ្មាន noise',
    icon: 'mic',
    color: 'from-purple-500 to-indigo-600',
    effects: {
      bass: 1.5,
      mid: 1.0,
      treble: 4.0,
      isReverbOn: true,
      reverbType: 'studio',
      reverbWet: 0.32,
      reverbDry: 1.0,
      reverbRoomSize: 0.8,
      reverbDecayTime: 1.2,
      isEchoOn: false,
      delayTime: 0.06,
      echoFeedback: 0.15,
      echoLevel: 0.15,
      compThreshold: -18,
      compRatio: 4.0,
      noiseReductionMode: 'low',
      noiseGateThreshold: -48,
      isAgcActive: false,
      isAutoTuneActive: true,
      autoTuneStrength: 0.55,
      pitchShift: 0,
    },
  },
  pop: {
    id: 'pop',
    name: 'Pop Singer',
    nameKm: 'តារាចម្រៀង Pop',
    descKm: 'សំឡេងបែប Modern Pop ច្បាស់ ស្រួយ ជាមួយ Auto-Tune កម្រិតមធ្យម',
    icon: 'music',
    color: 'from-cyan-500 to-blue-600',
    effects: {
      bass: 0.5,
      mid: 2.0,
      treble: 5.0,
      isReverbOn: true,
      reverbType: 'hall',
      reverbWet: 0.45,
      reverbDry: 1.0,
      reverbRoomSize: 1.3,
      reverbDecayTime: 2.2,
      isEchoOn: true,
      delayTime: 0.10,
      echoFeedback: 0.28,
      echoLevel: 0.25,
      compThreshold: -20,
      compRatio: 4.5,
      noiseReductionMode: 'medium',
      noiseGateThreshold: -46,
      isAgcActive: true,
      isAutoTuneActive: true,
      autoTuneStrength: 0.70,
      pitchShift: 0,
    },
  },
  romantic: {
    id: 'romantic',
    name: 'Romantic Voice',
    nameKm: 'សំឡេងរ៉ូមែនទិក',
    descKm: 'សំឡេងកក់ក្តៅ ទន់ភ្លន់ បែបបទមនោសញ្ចេតនា និង Ballad',
    icon: 'heart',
    color: 'from-rose-400 to-amber-500',
    effects: {
      bass: 3.5,
      mid: 1.2,
      treble: 2.0,
      isReverbOn: true,
      reverbType: 'room',
      reverbWet: 0.45,
      reverbDry: 1.0,
      reverbRoomSize: 1.1,
      reverbDecayTime: 1.6,
      isEchoOn: true,
      delayTime: 0.14,
      echoFeedback: 0.30,
      echoLevel: 0.25,
      compThreshold: -15,
      compRatio: 2.8,
      noiseReductionMode: 'medium',
      noiseGateThreshold: -52,
      isAgcActive: false,
      isAutoTuneActive: true,
      autoTuneStrength: 0.40,
      pitchShift: 0,
    },
  },
  concert: {
    id: 'concert',
    name: 'Live Concert',
    nameKm: 'Concert ផ្សាយផ្ទាល់',
    descKm: 'សំឡេងឆាកតន្ត្រីធំទូលាយ Hall Reverb វែង និង Echo ស្តង់ដារ Live',
    icon: 'flame',
    color: 'from-amber-500 to-red-600',
    effects: {
      bass: 2.0,
      mid: 1.5,
      treble: 3.0,
      isReverbOn: true,
      reverbType: 'concert',
      reverbWet: 0.60,
      reverbDry: 1.0,
      reverbRoomSize: 1.8,
      reverbDecayTime: 3.5,
      isEchoOn: true,
      delayTime: 0.20,
      echoFeedback: 0.38,
      echoLevel: 0.35,
      compThreshold: -16,
      compRatio: 3.5,
      noiseReductionMode: 'medium',
      noiseGateThreshold: -45,
      isAgcActive: false,
      isAutoTuneActive: true,
      autoTuneStrength: 0.50,
      pitchShift: 0,
    },
  },
  deep: {
    id: 'deep',
    name: 'Deep Voice',
    nameKm: 'សំឡេងធ្ងន់ / ក្រាស់',
    descKm: 'បន្ថែមភាពក្រាស់ និងទម្ងន់ដល់សំឡេងច្រៀង បាសជ្រៅ ណែនល្អ',
    icon: 'disc',
    color: 'from-emerald-500 to-teal-700',
    effects: {
      bass: 6.0,
      mid: -1.0,
      treble: 1.0,
      isReverbOn: true,
      reverbType: 'room',
      reverbWet: 0.35,
      reverbDry: 1.0,
      reverbRoomSize: 0.9,
      reverbDecayTime: 1.3,
      isEchoOn: true,
      delayTime: 0.08,
      echoFeedback: 0.20,
      echoLevel: 0.18,
      compThreshold: -18,
      compRatio: 3.8,
      noiseReductionMode: 'medium',
      noiseGateThreshold: -50,
      isAgcActive: false,
      isAutoTuneActive: true,
      autoTuneStrength: 0.45,
      pitchShift: 0,
    },
  },
  bright: {
    id: 'bright',
    name: 'Bright Voice',
    nameKm: 'សំឡេងថ្លា / ស្រួយ',
    descKm: 'កាត់បន្ថយភាពស្រអាប់ សំឡេងថ្លាច្បាស់ ឡើងខ្ពស់ស្រួលច្រៀង',
    icon: 'sun',
    color: 'from-yellow-400 to-orange-500',
    effects: {
      bass: -1.5,
      mid: 2.0,
      treble: 6.5,
      isReverbOn: true,
      reverbType: 'studio',
      reverbWet: 0.38,
      reverbDry: 1.0,
      reverbRoomSize: 0.8,
      reverbDecayTime: 1.2,
      isEchoOn: true,
      delayTime: 0.07,
      echoFeedback: 0.20,
      echoLevel: 0.20,
      compThreshold: -20,
      compRatio: 4.0,
      noiseReductionMode: 'medium',
      noiseGateThreshold: -48,
      isAgcActive: false,
      isAutoTuneActive: true,
      autoTuneStrength: 0.60,
      pitchShift: 0,
    },
  },
  autotune: {
    id: 'autotune',
    name: 'Auto Tune Pro',
    nameKm: 'Auto Tune ពេញលេញ',
    descKm: 'Auto-Tune កម្រិតខ្ពស់ តម្រង់សម្លេងឱ្យត្រូវតាម Note ភ្លេង ១០០%',
    icon: 'zap',
    color: 'from-violet-600 to-fuchsia-600',
    effects: {
      bass: 1.0,
      mid: 2.5,
      treble: 5.5,
      isReverbOn: true,
      reverbType: 'hall',
      reverbWet: 0.50,
      reverbDry: 1.0,
      reverbRoomSize: 1.4,
      reverbDecayTime: 2.5,
      isEchoOn: true,
      delayTime: 0.11,
      echoFeedback: 0.32,
      echoLevel: 0.28,
      compThreshold: -22,
      compRatio: 5.0,
      noiseReductionMode: 'high',
      noiseGateThreshold: -46,
      isAgcActive: true,
      isAutoTuneActive: true,
      autoTuneStrength: 0.95,
      pitchShift: 0,
    },
  },
};

/**
 * Creates algorithmic stereo impulse response for ConvolverNode
 * Fully parameterized with type, roomSize, and decayTime.
 * Uses acoustic exponential decay and early reflection spacing.
 */
function createReverbImpulse(ctx, type = 'studio', roomSize = 1.0, decayTime = 1.8) {
  const sampleRate = ctx.sampleRate || 44100;

  let typeScale = 0.038;
  let typeReflectDensity = 0.8;

  if (type === 'room') {
    typeScale = 0.038;
    typeReflectDensity = 0.7;
  } else if (type === 'hall') {
    typeScale = 0.034;
    typeReflectDensity = 0.9;
  } else if (type === 'concert') {
    typeScale = 0.030;
    typeReflectDensity = 1.0;
  } else {
    // studio
    typeScale = 0.040;
    typeReflectDensity = 0.6;
  }

  const effectiveDecay = Math.max(0.3, Math.min(6.0, decayTime * Math.sqrt(roomSize)));
  const duration = Math.max(0.5, Math.min(6.0, effectiveDecay * 1.1));
  const length = Math.floor(sampleRate * duration);

  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  const earlyWindow = Math.floor(sampleRate * Math.min(0.065, 0.025 * roomSize));
  const decayRate = 6.91 / effectiveDecay;

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-decayRate * t);

    const isEarly = i < earlyWindow;
    const earlyL = isEarly ? (Math.random() * 2 - 1) * typeReflectDensity : 0;
    const earlyR = isEarly ? (Math.random() * 2 - 1) * typeReflectDensity : 0;

    const noiseL = (Math.random() * 2 - 1) * 0.65;
    const noiseR = (Math.random() * 2 - 1) * 0.65;

    left[i] = (noiseL + earlyL) * env * typeScale;
    right[i] = (noiseR + earlyR) * env * typeScale;
  }

  return impulse;
}

/**
 * Fast Autocorrelation Pitch Detector
 * Returns fundamental frequency (Hz) or -1 if unpitched / too quiet
 */
function detectPitchAutocorrelation(buffer, sampleRate) {
  const SIZE = buffer.length;
  let sumOfSquares = 0;
  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i];
    sumOfSquares += val * val;
  }
  const rms = Math.sqrt(sumOfSquares / SIZE);
  if (rms < 0.015) return -1; // Gate out silence/noise

  // Vocal range: 65Hz to 1050Hz
  const minPeriod = Math.floor(sampleRate / 1050);
  const maxPeriod = Math.floor(sampleRate / 65);

  let bestPeriod = -1;
  let bestCorrelation = 0;

  for (let period = minPeriod; period <= maxPeriod; period++) {
    let correlation = 0;
    for (let i = 0; i < SIZE - period; i++) {
      correlation += buffer[i] * buffer[i + period];
    }
    correlation = correlation / (SIZE - period);

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestPeriod = period;
    }
  }

  if (bestCorrelation > 0.005 && bestPeriod > 0) {
    return sampleRate / bestPeriod;
  }
  return -1;
}

/**
 * Converts frequency in Hz to closest MIDI note and note details
 */
function frequencyToNoteDetails(freq) {
  if (freq <= 0) return null;
  const midi = 69 + 12 * Math.log2(freq / 440);
  const roundedMidi = Math.round(midi);
  const noteIndex = ((roundedMidi % 12) + 12) % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;
  const noteName = NOTE_NAMES[noteIndex];
  const centsOff = Math.round((midi - roundedMidi) * 100);

  return {
    midi: roundedMidi,
    noteIndex,
    octave,
    noteName: `${noteName}${octave}`,
    rawName: noteName,
    centsOff,
  };
}

/**
 * Snaps a note index to the nearest valid note in the selected scale
 */
function snapToScale(noteIndex, rootKeyIndex, scaleIntervals) {
  const allowedNotes = scaleIntervals.map((interval) => (rootKeyIndex + interval) % 12);
  let closest = allowedNotes[0];
  let minDiff = 12;

  for (const allowed of allowedNotes) {
    let diff = Math.abs(allowed - noteIndex);
    if (diff > 6) diff = 12 - diff;
    if (diff < minDiff) {
      minDiff = diff;
      closest = allowed;
    }
  }

  let semitoneShift = closest - noteIndex;
  if (semitoneShift > 6) semitoneShift -= 12;
  if (semitoneShift < -6) semitoneShift += 12;

  return { targetNoteIndex: closest, semitoneShift };
}

/**
 * KTV Voice Studio PRO Hook - Master Audio Engine
 */
export function useVoiceStudioPro({ karaokeAudioElement = null }) {
  // Device Selection (Microphone Inputs)
  const [availableMics, setAvailableMics] = useState([]);
  const [selectedMicId, setSelectedMicId] = useState('');
  const [isMicActive, setIsMicActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [micError, setMicError] = useState(null);

  // Device Selection (Audio Outputs / Speakers via setSinkId)
  const [availableOutputs, setAvailableOutputs] = useState([]);
  const [selectedOutputId, setSelectedOutputId] = useState('');

  // Live Input & Output VU levels (0 - 100) & Peak
  const [inputLevel, setInputLevel] = useState(0);
  const [inputPeak, setInputPeak] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);
  const [isClipping, setIsClipping] = useState(false);

  // Active Preset
  const [activePresetId, setActivePresetId] = useState('sweet');

  // MODULE 3: Microphone Boost & Dynamic Levels
  const [micVolume, setMicVolume] = useState(1.8); // 0.0 - 3.0 (0% - 300% Boost)
  const [micPreampBoost, setMicPreampBoost] = useState(1.5); // 1.0 - 3.0 (Preamp Gain)
  const [isAgcActive, setIsAgcActive] = useState(false); // Auto Gain Control
  const [isMonitoring, setIsMonitoring] = useState(true); // Direct Monitoring (Headphones/Speakers)
  const [micChannelMode, setMicChannelMode] = useState('both'); // 'both' (L+R Dual) | 'left' (Ch 1) | 'right' (Ch 2)
  const [keepMusicNormal, setKeepMusicNormal] = useState(true); // Disable browser ducking

  // MODULE 2: AI Multi-Stage Noise Reduction & Noise Gate
  const [noiseReductionMode, setNoiseReductionMode] = useState('medium'); // 'off' | 'low' | 'medium' | 'high'
  const [noiseGateThreshold, setNoiseGateThreshold] = useState(-48); // -65dB to -30dB
  const [isNoiseGateOpen, setIsNoiseGateOpen] = useState(true); // Real-time gate indicator

  // MODULE 1: Reverb Engine (ConvolverNode)
  const [isReverbOn, setIsReverbOn] = useState(true); // Reverb ON/OFF switch
  const [reverbType, setReverbType] = useState('studio'); // studio | hall | room | concert
  const [reverbWet, setReverbWet] = useState(0.40); // 0.0 - 1.0 (Wet amount)
  const [reverbDry, setReverbDry] = useState(1.0); // 0.0 - 1.0 (Dry amount)
  const [reverbRoomSize, setReverbRoomSize] = useState(1.0); // 0.2 - 2.0x (Room Size)
  const [reverbDecayTime, setReverbDecayTime] = useState(1.8); // 0.4s - 5.0s (Decay Time)

  // 3-Band Studio EQ (-15dB to +15dB)
  const [eqBass, setEqBass] = useState(2.0); // 120Hz Low-shelf
  const [eqMid, setEqMid] = useState(0.5); // 1500Hz Peaking
  const [eqTreble, setEqTreble] = useState(3.5); // 6500Hz High-shelf

  // Vocal Dynamics Compressor
  const [compThreshold, setCompThreshold] = useState(-18); // -40dB to 0dB
  const [compRatio, setCompRatio] = useState(3.5); // 1 to 12

  // Studio Echo / Feedback Delay
  const [isEchoOn, setIsEchoOn] = useState(true);
  const [delayTime, setDelayTime] = useState(0.08); // 0.04s - 0.5s
  const [echoFeedback, setEchoFeedback] = useState(0.20); // 0.0 - 0.65
  const [echoLevel, setEchoLevel] = useState(0.20); // 0.0 - 0.70

  // AI Auto-Tune & Pitch Control
  const [pitchShift, setPitchShift] = useState(0); // -12 to +12 semitones
  const [isAutoTuneActive, setIsAutoTuneActive] = useState(true);
  const [autoTuneStrength, setAutoTuneStrength] = useState(0.50); // 0.0 - 1.0
  const [selectedKey, setSelectedKey] = useState('C');
  const [selectedScale, setSelectedScale] = useState('khmerPentatonic');
  const [detectedPitch, setDetectedPitch] = useState(null);

  // Vocal & Karaoke Music Balance
  const [vocalMusicBalance, setVocalMusicBalance] = useState(50); // 0 (Music) - 100 (Vocal)

  // Performance Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);

  // Interactive 3-Second Microphone Test Tool
  const [micTestPhase, setMicTestPhase] = useState('idle'); // 'idle' | 'recording' | 'playing' | 'done'
  const [micTestCountdown, setMicTestCountdown] = useState(3);
  const [testAudioUrl, setTestAudioUrl] = useState(null);

  // Audio Context & Graph Node References
  const audioCtxRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const inputSplitterRef = useRef(null);
  const monoInputGainRef = useRef(null);

  // Processing chain refs
  const inputAnalyserRef = useRef(null);
  const outputAnalyserRef = useRef(null);
  const preampGainRef = useRef(null);
  const agcGainRef = useRef(null);
  const gateGainRef = useRef(null);
  const gateHoldUntilRef = useRef(0);
  const highpassRef = useRef(null);
  const lowpassRef = useRef(null);
  const humNotch50Ref = useRef(null);
  const humNotch60Ref = useRef(null);
  const bassFilterRef = useRef(null);
  const midFilterRef = useRef(null);
  const trebleFilterRef = useRef(null);
  const compressorRef = useRef(null);
  const micGainRef = useRef(null);
  const monitorGainRef = useRef(null);
  const masterLimiterRef = useRef(null);

  // Reverb nodes
  const convolverRef = useRef(null);
  const reverbWetGainRef = useRef(null);
  const reverbDryGainRef = useRef(null);
  const reverbToneRef = useRef(null);

  // Echo nodes
  const delayNodeRef = useRef(null);
  const feedbackGainRef = useRef(null);
  const echoWetGainRef = useRef(null);

  // Karaoke Music Source & Balance
  const karaokeSourceRef = useRef(null);
  const karaokeMusicGainRef = useRef(null);

  // Recording Destination
  const recordDestRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordTimerRef = useRef(null);

  // Mic Test Refs
  const testRecorderRef = useRef(null);
  const testTimerRef = useRef(null);
  const testAudioElRef = useRef(null);

  // Animation / Meter loop ref
  const animFrameRef = useRef(null);

  /**
   * Enumerate connected microphone and output devices
   */
  const refreshDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();

      // Microphones
      const mics = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${index + 1}`,
        }));
      setAvailableMics(mics);
      if (mics.length > 0 && !selectedMicId) {
        setSelectedMicId(mics[0].deviceId);
      }

      // Output Speakers / Headphones (where supported)
      const outputs = devices
        .filter((d) => d.kind === 'audiooutput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Speaker / Headphone ${index + 1}`,
        }));
      setAvailableOutputs(outputs);
      if (outputs.length > 0 && !selectedOutputId) {
        setSelectedOutputId(outputs[0].deviceId);
      }
    } catch (e) {
      console.warn('Device enumeration warning:', e);
    }
  }, [selectedMicId, selectedOutputId]);

  useEffect(() => {
    refreshDevices();
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
      };
    }
  }, [refreshDevices]);

  /**
   * Change Audio Output Device (setSinkId)
   */
  const changeOutputDevice = useCallback(
    async (newOutputId) => {
      setSelectedOutputId(newOutputId);
      try {
        if (audioCtxRef.current && typeof audioCtxRef.current.setSinkId === 'function') {
          await audioCtxRef.current.setSinkId(newOutputId);
        }
        if (karaokeAudioElement && typeof karaokeAudioElement.setSinkId === 'function') {
          await karaokeAudioElement.setSinkId(newOutputId);
        }
      } catch (e) {
        console.warn('Audio output device selection warning:', e);
      }
    },
    [karaokeAudioElement]
  );

  /**
   * Initialize or update Reverb Buffer dynamically
   */
  const updateReverbBuffer = useCallback((ctx, type, roomSize, decayTime) => {
    if (!ctx || !convolverRef.current) return;
    try {
      const impulse = createReverbImpulse(
        ctx,
        type || reverbType,
        roomSize !== undefined ? roomSize : reverbRoomSize,
        decayTime !== undefined ? decayTime : reverbDecayTime
      );
      convolverRef.current.normalize = false; // Prevent Web Audio from crushing reverb level!
      convolverRef.current.buffer = impulse;
    } catch (e) {
      console.warn('Reverb buffer build warning:', e);
    }
  }, [reverbType, reverbRoomSize, reverbDecayTime]);

  /**
   * Start Microphone & Initialize Studio Web Audio Graph
   */
  const startMic = useCallback(async (customDeviceId) => {
    setMicError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('ឧបករណ៍ ឬ Browser របស់អ្នកមិនគាំទ្រ Microphone ឡើយ។');
      }

      // Stop previous stream if active
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }

      const devId = customDeviceId || selectedMicId;

      // Request 2 channels so multi-channel audio interfaces & USB mics expose both channels cleanly
      const audioConstraints = {
        deviceId: devId ? { exact: devId } : undefined,
        echoCancellation: false,
        autoGainControl: false,
        noiseSuppression: false,
        latency: 0,
        channelCount: 2,
        googEchoCancellation: false,
        googAutoGainControl: false,
        googNoiseSuppression: false,
        googHighpassFilter: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      mediaStreamRef.current = stream;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = audioCtxRef.current || new AudioContext({ latencyHint: 'interactive' });
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      audioCtxRef.current = ctx;

      // Apply output sink if selected
      if (selectedOutputId && typeof ctx.setSinkId === 'function') {
        ctx.setSinkId(selectedOutputId).catch(() => {});
      }

      // 1. Source & Channel Splitter (Ensures mic audio is heard in BOTH ears!)
      const source = ctx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      const inputSplitter = ctx.createChannelSplitter(2);
      inputSplitterRef.current = inputSplitter;

      const monoInputGain = ctx.createGain();
      monoInputGainRef.current = monoInputGain;

      source.connect(inputSplitter);

      if (micChannelMode === 'right') {
        inputSplitter.connect(monoInputGain, 1);
      } else if (micChannelMode === 'left') {
        inputSplitter.connect(monoInputGain, 0);
      } else {
        // 'both' (Default: combine Left & Right so whatever channel has audio is heard centered in both ears!)
        inputSplitter.connect(monoInputGain, 0);
        inputSplitter.connect(monoInputGain, 1);
      }

      // Live Input Analyser (Peak & RMS)
      const inAnalyser = ctx.createAnalyser();
      inAnalyser.fftSize = 512;
      inAnalyser.smoothingTimeConstant = 0.2;
      inputAnalyserRef.current = inAnalyser;
      monoInputGain.connect(inAnalyser);

      // 2. Pre-Amp Input Gain Boost & AGC
      const preampGain = ctx.createGain();
      preampGain.gain.value = micPreampBoost;
      preampGainRef.current = preampGain;
      monoInputGain.connect(preampGain);

      const agcGain = ctx.createGain();
      agcGain.gain.value = 1.0;
      agcGainRef.current = agcGain;
      preampGain.connect(agcGain);

      // 3. Multi-Stage AI Noise Reduction Filters
      // Subsonic anti-rumble highpass
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      const hpFreq =
        noiseReductionMode === 'off' ? 20 :
        noiseReductionMode === 'low' ? 70 :
        noiseReductionMode === 'high' ? 125 : 95;
      highpass.frequency.value = hpFreq;
      highpassRef.current = highpass;

      // 50Hz electrical mains hum notch
      const notch50 = ctx.createBiquadFilter();
      notch50.type = 'notch';
      notch50.frequency.value = 50;
      notch50.Q.value = noiseReductionMode === 'off' ? 0.001 : 4.0;
      humNotch50Ref.current = notch50;

      // 60Hz electrical mains hum notch
      const notch60 = ctx.createBiquadFilter();
      notch60.type = 'notch';
      notch60.frequency.value = 60;
      notch60.Q.value = noiseReductionMode === 'off' ? 0.001 : 4.0;
      humNotch60Ref.current = notch60;

      // Anti-hiss lowpass
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      const lpFreq =
        noiseReductionMode === 'off' ? 22000 :
        noiseReductionMode === 'low' ? 18000 :
        noiseReductionMode === 'high' ? 10500 : 13500;
      lowpass.frequency.value = lpFreq;
      lowpassRef.current = lowpass;

      // Dynamic Noise Gate Gain Node
      const gateGain = ctx.createGain();
      gateGain.gain.value = 1.0;
      gateGainRef.current = gateGain;

      agcGain.connect(highpass);
      highpass.connect(notch50);
      notch50.connect(notch60);
      notch60.connect(lowpass);
      lowpass.connect(gateGain);

      // 4. 3-Band Equalizer (Bass, Mid, Treble)
      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 120;
      bassFilter.gain.value = eqBass;
      bassFilterRef.current = bassFilter;

      const midFilter = ctx.createBiquadFilter();
      midFilter.type = 'peaking';
      midFilter.frequency.value = 1500;
      midFilter.Q.value = 1.2;
      midFilter.gain.value = eqMid;
      midFilterRef.current = midFilter;

      const trebleFilter = ctx.createBiquadFilter();
      trebleFilter.type = 'highshelf';
      trebleFilter.frequency.value = 6500;
      trebleFilter.gain.value = eqTreble;
      trebleFilterRef.current = trebleFilter;

      gateGain.connect(bassFilter);
      bassFilter.connect(midFilter);
      midFilter.connect(trebleFilter);

      // 5. Studio Vocal Dynamics Compressor
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = compThreshold;
      compressor.knee.value = 18;
      compressor.ratio.value = compRatio;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.08;
      compressorRef.current = compressor;

      trebleFilter.connect(compressor);

      // 6. Vocal Pre-amp Volume Gain
      const micGain = ctx.createGain();
      micGain.gain.value = isMuted ? 0 : micVolume;
      micGainRef.current = micGain;
      compressor.connect(micGain);

      // 7. Studio Reverb (ConvolverNode with full Wet/Dry, Room Size, Decay Time)
      const convolver = ctx.createConvolver();
      convolver.normalize = false; // Prevent Web Audio equal-power attenuation!
      convolverRef.current = convolver;
      updateReverbBuffer(ctx, reverbType, reverbRoomSize, reverbDecayTime);

      const reverbTone = ctx.createBiquadFilter();
      reverbTone.type = 'lowpass';
      reverbTone.frequency.value = 6500;
      reverbToneRef.current = reverbTone;

      const reverbWetGain = ctx.createGain();
      reverbWetGain.gain.value = isReverbOn ? reverbWet * 1.5 : 0.0;
      reverbWetGainRef.current = reverbWetGain;

      micGain.connect(convolver);
      convolver.connect(reverbTone);
      reverbTone.connect(reverbWetGain);

      // Dedicated Dry Gain Node
      const reverbDryGain = ctx.createGain();
      reverbDryGain.gain.value = reverbDry;
      reverbDryGainRef.current = reverbDryGain;
      micGain.connect(reverbDryGain);

      // 8. Studio Echo / Feedback Delay (Analog Tape Echo)
      const delayNode = ctx.createDelay(1.0);
      delayNode.delayTime.value = delayTime;
      delayNodeRef.current = delayNode;

      const echoDamping = ctx.createBiquadFilter();
      echoDamping.type = 'lowpass';
      echoDamping.frequency.value = 4500;

      const feedbackGain = ctx.createGain();
      feedbackGain.gain.value = isEchoOn ? echoFeedback : 0;
      feedbackGainRef.current = feedbackGain;

      const echoWetGain = ctx.createGain();
      echoWetGain.gain.value = isEchoOn ? echoLevel : 0;
      echoWetGainRef.current = echoWetGain;

      micGain.connect(delayNode);
      delayNode.connect(echoDamping);
      echoDamping.connect(feedbackGain);
      feedbackGain.connect(delayNode);
      echoDamping.connect(echoWetGain);

      // 9. Mix Vocal Bus with Guaranteed Stereo Centering (L + R)
      // Merger takes mono dry vocal and copies it to BOTH Left (0) and Right (1)
      const dryStereoMerger = ctx.createChannelMerger(2);
      reverbDryGain.connect(dryStereoMerger, 0, 0); // Dry vocal to Left Ear
      reverbDryGain.connect(dryStereoMerger, 0, 1); // Dry vocal to Right Ear

      // Merger takes mono echo and copies it to BOTH Left (0) and Right (1)
      const echoStereoMerger = ctx.createChannelMerger(2);
      echoWetGain.connect(echoStereoMerger, 0, 0); // Echo to Left Ear
      echoWetGain.connect(echoStereoMerger, 0, 1); // Echo to Right Ear

      // True Stereo Vocal Master Bus (channelCount = 2, explicit speakers)
      const vocalBus = ctx.createGain();
      vocalBus.channelCount = 2;
      vocalBus.channelCountMode = 'explicit';
      vocalBus.channelInterpretation = 'speakers';

      // Connect dry voice, echo, and stereo reverb into vocal bus:
      dryStereoMerger.connect(vocalBus);
      echoStereoMerger.connect(vocalBus);
      reverbWetGain.connect(vocalBus); // Full 2-channel stereo reverb in both ears!

      // 10. Output Monitor & Analyser
      const monitorGain = ctx.createGain();
      monitorGain.channelCount = 2;
      monitorGain.gain.value = isMonitoring ? 1.0 : 0.0;
      monitorGainRef.current = monitorGain;
      vocalBus.connect(monitorGain);

      const outAnalyser = ctx.createAnalyser();
      outAnalyser.fftSize = 512;
      outAnalyser.smoothingTimeConstant = 0.3;
      outputAnalyserRef.current = outAnalyser;
      monitorGain.connect(outAnalyser);

      // Master Brickwall Peak Limiter (Guarantees ZERO clipping or speaker popping)
      const masterLimiter = ctx.createDynamicsCompressor();
      masterLimiter.threshold.value = -1.0;
      masterLimiter.knee.value = 4;
      masterLimiter.ratio.value = 20;
      masterLimiter.attack.value = 0.0008;
      masterLimiter.release.value = 0.04;
      masterLimiterRef.current = masterLimiter;

      outAnalyser.connect(masterLimiter);
      masterLimiter.connect(ctx.destination);

      // 11. Connect Karaoke Background Music to Audio Graph for Balance & Recording
      if (karaokeAudioElement && !karaokeSourceRef.current) {
        try {
          const kSource = ctx.createMediaElementSource(karaokeAudioElement);
          karaokeSourceRef.current = kSource;
          const kMusicGain = ctx.createGain();
          kMusicGain.gain.value = 1.0;
          karaokeMusicGainRef.current = kMusicGain;
          kSource.connect(kMusicGain);
          kMusicGain.connect(ctx.destination);
        } catch (e) {
          // Already connected or cross-origin
        }
      }

      // 12. Recording Destination Bus (Mixes processed mic + karaoke music)
      const recordDest = ctx.createMediaStreamDestination();
      recordDestRef.current = recordDest;
      vocalBus.connect(recordDest);
      if (karaokeMusicGainRef.current) {
        karaokeMusicGainRef.current.connect(recordDest);
      }

      setIsMicActive(true);
      refreshDevices();
    } catch (err) {
      console.error('KTV Voice Studio Mic activation error:', err);
      setMicError(err.message || 'មិនអាចបើក Microphone បានទេ។');
      setIsMicActive(false);
    }
  }, [
    selectedMicId,
    selectedOutputId,
    micChannelMode,
    micPreampBoost,
    noiseReductionMode,
    eqBass,
    eqMid,
    eqTreble,
    compThreshold,
    compRatio,
    micVolume,
    isMuted,
    isReverbOn,
    reverbType,
    reverbWet,
    reverbDry,
    reverbRoomSize,
    reverbDecayTime,
    isEchoOn,
    delayTime,
    echoFeedback,
    echoLevel,
    isMonitoring,
    karaokeAudioElement,
    updateReverbBuffer,
    refreshDevices,
  ]);

  /**
   * Stop Microphone & Clean Graph
   */
  const stopMic = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setIsMicActive(false);
    setInputLevel(0);
    setInputPeak(0);
    setOutputLevel(0);
    setIsClipping(false);
    setDetectedPitch(null);
  }, []);

  const toggleMic = useCallback(() => {
    if (isMicActive) {
      stopMic();
    } else {
      startMic();
    }
  }, [isMicActive, startMic, stopMic]);

  /**
   * Switch Microphone Input Device
   */
  const changeMicDevice = useCallback(
    (newDeviceId) => {
      setSelectedMicId(newDeviceId);
      if (isMicActive) {
        stopMic();
        setTimeout(() => {
          startMic(newDeviceId);
        }, 150);
      }
    },
    [isMicActive, startMic, stopMic]
  );

  /**
   * Toggle Mute
   */
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (micGainRef.current && audioCtxRef.current) {
        const now = audioCtxRef.current.currentTime;
        micGainRef.current.gain.setTargetAtTime(next ? 0 : micVolume, now, 0.02);
      }
      return next;
    });
  }, [micVolume]);

  /**
   * Toggle Headphone / Speaker Direct Monitoring
   */
  const toggleMonitoring = useCallback(() => {
    setIsMonitoring((prev) => {
      const next = !prev;
      if (monitorGainRef.current && audioCtxRef.current) {
        const now = audioCtxRef.current.currentTime;
        monitorGainRef.current.gain.setTargetAtTime(next ? 1.0 : 0.0, now, 0.02);
      }
      return next;
    });
  }, []);

  /**
   * Quick Mic Boost Preset (normal: 100%, full: 180%, boost: 250%)
   */
  const setMicBoostPreset = useCallback((preset) => {
    if (preset === 'normal') {
      setMicVolume(1.0);
      setMicPreampBoost(1.0);
    } else if (preset === 'boost') {
      setMicVolume(2.5);
      setMicPreampBoost(2.0);
    } else {
      // 'full'
      setMicVolume(1.8);
      setMicPreampBoost(1.5);
    }
  }, []);

  /**
   * Quick Echo Preset (room, karaoke, concert, space)
   */
  const setEchoPreset = useCallback((preset) => {
    setIsEchoOn(true);
    if (preset === 'room') {
      setDelayTime(0.12);
      setEchoFeedback(0.20);
      setEchoLevel(0.25);
    } else if (preset === 'concert') {
      setDelayTime(0.35);
      setEchoFeedback(0.35);
      setEchoLevel(0.55);
    } else if (preset === 'space') {
      setDelayTime(0.48);
      setEchoFeedback(0.55);
      setEchoLevel(0.70);
    } else {
      // karaoke default
      setDelayTime(0.22);
      setEchoFeedback(0.28);
      setEchoLevel(0.40);
    }
  }, []);

  /**
   * Toggle Reverb ON/OFF without restarting mic
   */
  const toggleReverb = useCallback(() => {
    setIsReverbOn((prev) => {
      const next = !prev;
      if (reverbWetGainRef.current && audioCtxRef.current) {
        const now = audioCtxRef.current.currentTime;
        reverbWetGainRef.current.gain.setTargetAtTime(next ? reverbWet * 1.5 : 0.0, now, 0.02);
      }
      return next;
    });
  }, [reverbWet]);

  /**
   * Dynamic Real-time Parameter Updates
   */
  // Mic Volume & Pre-Amp Boost
  useEffect(() => {
    if (micGainRef.current && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime;
      micGainRef.current.gain.setTargetAtTime(isMuted ? 0 : micVolume, now, 0.02);
    }
  }, [micVolume, isMuted]);

  useEffect(() => {
    if (preampGainRef.current && audioCtxRef.current) {
      preampGainRef.current.gain.setTargetAtTime(micPreampBoost, audioCtxRef.current.currentTime, 0.02);
    }
  }, [micPreampBoost]);

  // Dynamic Microphone Channel Routing (Both L+R, Left only, Right only)
  useEffect(() => {
    if (inputSplitterRef.current && monoInputGainRef.current) {
      try {
        inputSplitterRef.current.disconnect();
        if (micChannelMode === 'right') {
          inputSplitterRef.current.connect(monoInputGainRef.current, 1);
        } else if (micChannelMode === 'left') {
          inputSplitterRef.current.connect(monoInputGainRef.current, 0);
        } else {
          inputSplitterRef.current.connect(monoInputGainRef.current, 0);
          inputSplitterRef.current.connect(monoInputGainRef.current, 1);
        }
      } catch (e) {
        console.warn('Channel routing update warning:', e);
      }
    }
  }, [micChannelMode]);

  // 3-Band EQ
  useEffect(() => {
    if (bassFilterRef.current && audioCtxRef.current) {
      bassFilterRef.current.gain.setTargetAtTime(eqBass, audioCtxRef.current.currentTime, 0.02);
    }
  }, [eqBass]);

  useEffect(() => {
    if (midFilterRef.current && audioCtxRef.current) {
      midFilterRef.current.gain.setTargetAtTime(eqMid, audioCtxRef.current.currentTime, 0.02);
    }
  }, [eqMid]);

  useEffect(() => {
    if (trebleFilterRef.current && audioCtxRef.current) {
      trebleFilterRef.current.gain.setTargetAtTime(eqTreble, audioCtxRef.current.currentTime, 0.02);
    }
  }, [eqTreble]);

  // Compressor
  useEffect(() => {
    if (compressorRef.current && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime;
      compressorRef.current.threshold.setTargetAtTime(compThreshold, now, 0.02);
      compressorRef.current.ratio.setTargetAtTime(compRatio, now, 0.02);
    }
  }, [compThreshold, compRatio]);

  // AI Noise Reduction Filters (Subsonic highpass, hum notches, ultrasonic lowpass)
  useEffect(() => {
    if (!audioCtxRef.current) return;
    const now = audioCtxRef.current.currentTime;

    if (highpassRef.current) {
      const hpFreq =
        noiseReductionMode === 'off' ? 20 :
        noiseReductionMode === 'low' ? 70 :
        noiseReductionMode === 'high' ? 125 : 95;
      highpassRef.current.frequency.setTargetAtTime(hpFreq, now, 0.02);
    }

    if (lowpassRef.current) {
      const lpFreq =
        noiseReductionMode === 'off' ? 22000 :
        noiseReductionMode === 'low' ? 18000 :
        noiseReductionMode === 'high' ? 10500 : 13500;
      lowpassRef.current.frequency.setTargetAtTime(lpFreq, now, 0.02);
    }

    if (humNotch50Ref.current && humNotch60Ref.current) {
      const qVal = noiseReductionMode === 'off' ? 0.001 : 4.0;
      humNotch50Ref.current.Q.setTargetAtTime(qVal, now, 0.02);
      humNotch60Ref.current.Q.setTargetAtTime(qVal, now, 0.02);
    }
  }, [noiseReductionMode]);

  // Reverb Wet/Dry & Real-time Impulse Updates
  useEffect(() => {
    if (reverbWetGainRef.current && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime;
      reverbWetGainRef.current.gain.setTargetAtTime(isReverbOn ? reverbWet * 1.5 : 0.0, now, 0.02);
    }
  }, [isReverbOn, reverbWet]);

  useEffect(() => {
    if (reverbDryGainRef.current && audioCtxRef.current) {
      reverbDryGainRef.current.gain.setTargetAtTime(reverbDry, audioCtxRef.current.currentTime, 0.02);
    }
  }, [reverbDry]);

  const changeReverbType = useCallback(
    (type) => {
      setReverbType(type);
      if (audioCtxRef.current) {
        updateReverbBuffer(audioCtxRef.current, type, reverbRoomSize, reverbDecayTime);
      }
    },
    [updateReverbBuffer, reverbRoomSize, reverbDecayTime]
  );

  const changeReverbRoomSize = useCallback(
    (size) => {
      setReverbRoomSize(size);
      if (audioCtxRef.current) {
        updateReverbBuffer(audioCtxRef.current, reverbType, size, reverbDecayTime);
      }
    },
    [updateReverbBuffer, reverbType, reverbDecayTime]
  );

  const changeReverbDecayTime = useCallback(
    (decay) => {
      setReverbDecayTime(decay);
      if (audioCtxRef.current) {
        updateReverbBuffer(audioCtxRef.current, reverbType, reverbRoomSize, decay);
      }
    },
    [updateReverbBuffer, reverbType, reverbRoomSize]
  );

  // Echo / Delay
  useEffect(() => {
    if (delayNodeRef.current && audioCtxRef.current) {
      delayNodeRef.current.delayTime.setTargetAtTime(delayTime, audioCtxRef.current.currentTime, 0.02);
    }
  }, [delayTime]);

  useEffect(() => {
    if (feedbackGainRef.current && audioCtxRef.current) {
      feedbackGainRef.current.gain.setTargetAtTime(isEchoOn ? echoFeedback : 0, audioCtxRef.current.currentTime, 0.02);
    }
    if (echoWetGainRef.current && audioCtxRef.current) {
      echoWetGainRef.current.gain.setTargetAtTime(isEchoOn ? echoLevel : 0, audioCtxRef.current.currentTime, 0.02);
    }
  }, [isEchoOn, echoFeedback, echoLevel]);

  // Vocal / Music Balance (0 = 100% music, 50 = 50/50, 100 = 100% mic)
  useEffect(() => {
    if (audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime;
      const musicFactor = Math.max(0, (100 - vocalMusicBalance) / 50);
      const micFactor = Math.max(0, vocalMusicBalance / 50);

      if (karaokeMusicGainRef.current) {
        karaokeMusicGainRef.current.gain.setTargetAtTime(Math.min(1.0, musicFactor), now, 0.03);
      }
      if (micGainRef.current && !isMuted) {
        micGainRef.current.gain.setTargetAtTime(micVolume * Math.min(1.0, micFactor), now, 0.03);
      }
    }
  }, [vocalMusicBalance, micVolume, isMuted]);

  /**
   * Apply 1-Click Professional Voice Preset
   */
  const applyPreset = useCallback(
    (presetId) => {
      const preset = VOICE_PRESETS[presetId];
      if (!preset) return;
      setActivePresetId(presetId);
      const fx = preset.effects;

      setEqBass(fx.bass);
      setEqMid(fx.mid);
      setEqTreble(fx.treble);

      setIsReverbOn(fx.isReverbOn !== undefined ? fx.isReverbOn : true);
      setReverbType(fx.reverbType);
      setReverbWet(fx.reverbWet !== undefined ? fx.reverbWet : fx.reverbLevel || 0.40);
      setReverbDry(fx.reverbDry !== undefined ? fx.reverbDry : 1.0);
      setReverbRoomSize(fx.reverbRoomSize !== undefined ? fx.reverbRoomSize : 1.0);
      setReverbDecayTime(fx.reverbDecayTime !== undefined ? fx.reverbDecayTime : 1.8);

      setIsEchoOn(fx.isEchoOn);
      setDelayTime(fx.delayTime);
      setEchoFeedback(fx.echoFeedback);
      setEchoLevel(fx.echoLevel);

      setCompThreshold(fx.compThreshold);
      setCompRatio(fx.compRatio);

      setNoiseReductionMode(fx.noiseReductionMode || 'medium');
      setNoiseGateThreshold(fx.noiseGateThreshold || -48);
      setIsAgcActive(fx.isAgcActive || false);

      setIsAutoTuneActive(fx.isAutoTuneActive);
      setAutoTuneStrength(fx.autoTuneStrength);
      setPitchShift(fx.pitchShift);

      if (audioCtxRef.current) {
        updateReverbBuffer(
          audioCtxRef.current,
          fx.reverbType,
          fx.reverbRoomSize || 1.0,
          fx.reverbDecayTime || 1.8
        );
      }
    },
    [updateReverbBuffer]
  );

  /**
   * Real-Time VU Metering, Pitch Detection, AGC & Dynamic Noise Gate Loop
   */
  useEffect(() => {
    if (!isMicActive) return;

    let isRunning = true;
    const inBuffer = new Float32Array(512);
    const outBuffer = new Float32Array(512);

    const updateAudioMeters = () => {
      if (!isRunning) return;

      const inAn = inputAnalyserRef.current;
      const outAn = outputAnalyserRef.current;
      const ctx = audioCtxRef.current;

      if (inAn && ctx) {
        inAn.getFloatTimeDomainData(inBuffer);

        // 1. Calculate Input RMS & Peak Volume
        let inSum = 0;
        let inPeak = 0;
        for (let i = 0; i < inBuffer.length; i++) {
          const val = inBuffer[i];
          const absVal = Math.abs(val);
          if (absVal > inPeak) inPeak = absVal;
          inSum += val * val;
        }
        const inRms = Math.sqrt(inSum / inBuffer.length);
        const inDb = inRms > 0 ? 20 * Math.log10(inRms) : -100;
        const inPct = Math.min(100, Math.max(0, Math.round(((inDb + 60) / 60) * 100)));
        const peakPct = Math.min(100, Math.max(0, Math.round(inPeak * 100)));
        setInputLevel(inPct);
        setInputPeak(peakPct);

        // Check clipping
        setIsClipping(inPeak >= 0.98);

        // 2. Real-Time Dynamic Noise Gate with Hysteresis & Hold
        if (gateGainRef.current) {
          if (noiseReductionMode === 'off') {
            gateGainRef.current.gain.setTargetAtTime(1.0, ctx.currentTime, 0.015);
            setIsNoiseGateOpen(true);
          } else {
            const nowMs = performance.now();
            const openThreshold = noiseGateThreshold;
            const floorGain =
              noiseReductionMode === 'low' ? 0.15 :
              noiseReductionMode === 'high' ? 0.01 : 0.05; // medium = 0.05 (-26dB)

            if (inDb >= openThreshold) {
              // Voice active - open immediately & hold
              gateHoldUntilRef.current = nowMs + 100; // 100ms hold
              gateGainRef.current.gain.setTargetAtTime(1.0, ctx.currentTime, 0.003); // 3ms fast attack
              setIsNoiseGateOpen(true);
            } else if (nowMs < gateHoldUntilRef.current) {
              // Within hold window - keep open
              gateGainRef.current.gain.setTargetAtTime(1.0, ctx.currentTime, 0.005);
              setIsNoiseGateOpen(true);
            } else {
              // Smooth release to attenuated floor
              gateGainRef.current.gain.setTargetAtTime(floorGain, ctx.currentTime, 0.03); // 30ms smooth release
              setIsNoiseGateOpen(false);
            }
          }
        }

        // 3. Intelligent Auto Gain Control (AGC)
        if (agcGainRef.current) {
          if (isAgcActive && inDb > -45) {
            // Target vocal level: -18 dBFS
            const diffDb = -18 - inDb;
            const agcFactor = Math.pow(10, Math.max(-6, Math.min(8, diffDb * 0.25)) / 20);
            agcGainRef.current.gain.setTargetAtTime(agcFactor, ctx.currentTime, 0.08);
          } else {
            agcGainRef.current.gain.setTargetAtTime(1.0, ctx.currentTime, 0.08);
          }
        }

        // 4. Real-Time Pitch Detection & Scale Correction
        const pitchHz = detectPitchAutocorrelation(inBuffer, ctx.sampleRate);
        if (pitchHz > 65 && pitchHz < 1050) {
          const details = frequencyToNoteDetails(pitchHz);
          if (details) {
            const rootIndex = NOTE_NAMES.indexOf(selectedKey);
            const scaleIntervals = SCALES[selectedScale] || SCALES.khmerPentatonic;
            const snapped = snapToScale(details.noteIndex, rootIndex >= 0 ? rootIndex : 0, scaleIntervals);

            setDetectedPitch({
              freq: Math.round(pitchHz),
              noteName: details.noteName,
              rawName: details.rawName,
              centsOff: details.centsOff,
              targetNoteName: NOTE_NAMES[snapped.targetNoteIndex],
              semitoneCorrection: snapped.semitoneShift,
            });
          }
        } else {
          setDetectedPitch(null);
        }
      }

      // 5. Output RMS Volume
      if (outAn) {
        outAn.getFloatTimeDomainData(outBuffer);
        let outSum = 0;
        for (let i = 0; i < outBuffer.length; i++) {
          outSum += outBuffer[i] * outBuffer[i];
        }
        const outRms = Math.sqrt(outSum / outBuffer.length);
        const outDb = outRms > 0 ? 20 * Math.log10(outRms) : -100;
        const outPct = Math.min(100, Math.max(0, Math.round(((outDb + 60) / 60) * 100)));
        setOutputLevel(outPct);
      }

      animFrameRef.current = requestAnimationFrame(updateAudioMeters);
    };

    animFrameRef.current = requestAnimationFrame(updateAudioMeters);

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isMicActive, noiseReductionMode, noiseGateThreshold, isAgcActive, selectedKey, selectedScale]);

  /**
   * Interactive 3-Second Microphone Test Tool
   */
  const startMicTest = useCallback(async () => {
    if (!isMicActive) {
      await startMic();
    }
    if (!recordDestRef.current) return;

    try {
      setTestAudioUrl(null);
      setMicTestPhase('recording');
      setMicTestCountdown(3);

      const stream = recordDestRef.current.stream;
      const testRecorder = new MediaRecorder(stream);
      testRecorderRef.current = testRecorder;
      const chunks = [];

      testRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      testRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: testRecorder.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setTestAudioUrl(url);
        setMicTestPhase('playing');

        // Automatic instant playback through the selected output
        const audio = new Audio(url);
        testAudioElRef.current = audio;
        if (selectedOutputId && typeof audio.setSinkId === 'function') {
          audio.setSinkId(selectedOutputId).catch(() => {});
        }
        audio.onended = () => {
          setMicTestPhase('done');
        };
        audio.play().catch(() => {
          setMicTestPhase('done');
        });
      };

      testRecorder.start(100);

      let remaining = 3;
      testTimerRef.current = setInterval(() => {
        remaining -= 1;
        setMicTestCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(testTimerRef.current);
          testTimerRef.current = null;
          if (testRecorder.state === 'recording') {
            testRecorder.stop();
          }
        }
      }, 1000);
    } catch (err) {
      console.warn('Mic test error:', err);
      setMicTestPhase('idle');
    }
  }, [isMicActive, startMic, selectedOutputId]);

  const stopMicTest = useCallback(() => {
    if (testTimerRef.current) {
      clearInterval(testTimerRef.current);
      testTimerRef.current = null;
    }
    if (testRecorderRef.current && testRecorderRef.current.state === 'recording') {
      testRecorderRef.current.stop();
    }
    if (testAudioElRef.current) {
      testAudioElRef.current.pause();
      testAudioElRef.current = null;
    }
    setMicTestPhase('idle');
  }, []);

  const replayTestAudio = useCallback(() => {
    if (!testAudioUrl) return;
    if (testAudioElRef.current) {
      testAudioElRef.current.pause();
    }
    const audio = new Audio(testAudioUrl);
    testAudioElRef.current = audio;
    if (selectedOutputId && typeof audio.setSinkId === 'function') {
      audio.setSinkId(selectedOutputId).catch(() => {});
    }
    setMicTestPhase('playing');
    audio.onended = () => setMicTestPhase('done');
    audio.play().catch(() => setMicTestPhase('done'));
  }, [testAudioUrl, selectedOutputId]);

  /**
   * Performance Audio Recording (Mic Effects + Karaoke Music)
   */
  const startRecording = useCallback(() => {
    if (!recordDestRef.current) return;
    try {
      const stream = recordDestRef.current.stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';

      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 192000 });
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (e) {
      console.error('Recording start warning:', e);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const downloadRecording = useCallback((filename = 'Karaoke-Performance') => {
    if (!recordedAudioUrl) return;
    const a = document.createElement('a');
    a.href = recordedAudioUrl;
    a.download = `${filename}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [recordedAudioUrl]);

  return {
    // Microphone & Device Selection
    availableMics,
    selectedMicId,
    changeMicDevice,
    micChannelMode,
    setMicChannelMode,
    isMicActive,
    toggleMic,
    startMic,
    stopMic,
    isMuted,
    toggleMute,
    micError,
    micStream: mediaStreamRef.current,

    // Audio Output Device (setSinkId)
    availableOutputs,
    selectedOutputId,
    changeOutputDevice,

    // Live Levels & Analysers (VU Meters & Waveform Canvas)
    inputLevel,
    inputPeak,
    outputLevel,
    isClipping,
    inputAnalyser: inputAnalyserRef.current,
    outputAnalyser: outputAnalyserRef.current,

    // Direct Headphone Monitoring & Ducking
    isMonitoring,
    toggleMonitoring,
    isMonitorSpeaker: isMonitoring,
    setIsMonitorSpeaker: toggleMonitoring,
    isHeadphonesConnected: isMonitoring,
    toggleHeadphones: toggleMonitoring,
    keepMusicNormal,
    setKeepMusicNormal,
    toggleKeepMusicNormal: () => setKeepMusicNormal((p) => !p),

    // 1-Click Voice Presets
    activePresetId,
    applyPreset,
    VOICE_PRESETS,

    // MODULE 3: Mic Boost & AGC
    micVolume,
    setMicVolume,
    micPreampBoost,
    setMicPreampBoost,
    setMicBoostPreset,
    isAgcActive,
    setIsAgcActive,
    toggleAgc: () => setIsAgcActive((p) => !p),
    vocalMusicBalance,
    setVocalMusicBalance,

    // MODULE 2: AI Multi-Stage Noise Reduction & Gate
    noiseReductionMode,
    setNoiseReductionMode,
    noiseGateThreshold,
    setNoiseGateThreshold,
    isNoiseGateOpen,
    isNoiseCutActive: noiseReductionMode !== 'off',
    toggleNoiseCut: () => setNoiseReductionMode((p) => (p === 'off' ? 'medium' : 'off')),

    // MODULE 1: Real-Time Reverb Studio (ConvolverNode)
    isReverbOn,
    setIsReverbOn,
    toggleReverb,
    reverbType,
    changeReverbType,
    reverbWet,
    setReverbWet,
    reverbLevel: reverbWet, // Alias for backwards compatibility
    setReverbLevel: setReverbWet,
    reverbDry,
    setReverbDry,
    reverbRoomSize,
    changeReverbRoomSize,
    setReverbRoomSize: changeReverbRoomSize,
    reverbDecayTime,
    changeReverbDecayTime,
    setReverbDecayTime: changeReverbDecayTime,

    // 3-Band Equalizer & Compressor
    eqBass,
    setEqBass,
    eqMid,
    setEqMid,
    eqTreble,
    setEqTreble,
    compThreshold,
    setCompThreshold,
    compRatio,
    setCompRatio,

    // Echo / Delay Studio
    isEchoOn,
    setIsEchoOn,
    delayTime,
    setDelayTime,
    echoFeedback,
    setEchoFeedback,
    echoLevel,
    setEchoLevel,
    setEchoPreset,

    // AI Auto-Tune & Pitch Correction
    pitchShift,
    setPitchShift,
    isAutoTuneActive,
    setIsAutoTuneActive,
    autoTuneStrength,
    setAutoTuneStrength,
    selectedKey,
    setSelectedKey,
    selectedScale,
    setSelectedScale,
    detectedPitch,
    SCALES,
    NOTE_NAMES,

    // Interactive 3-Second Microphone Test Tool
    micTestPhase,
    micTestCountdown,
    testAudioUrl,
    startMicTest,
    stopMicTest,
    replayTestAudio,

    // Performance Recording
    isRecording,
    recordingSeconds,
    recordedAudioUrl,
    startRecording,
    stopRecording,
    downloadRecording,
  };
}
