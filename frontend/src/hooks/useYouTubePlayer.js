import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook to manage YouTube IFrame Player API initialization and lifecycle.
 * Enforces strict permanent mute so YouTube serves purely as the synchronized visual lyrics display.
 */
export function useYouTubePlayer({ videoId, onStateChange, onReady }) {
  const playerRef = useRef(null);
  const containerId = useRef(`yt-player-${Math.random().toString(36).substring(2, 9)}`);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState(null);
  const [playerState, setPlayerState] = useState(-1); // -1: unstarted

  // Load YouTube IFrame API script once globally
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize or re-create YouTube player when videoId changes
  useEffect(() => {
    if (!videoId) return;

    let destroyed = false;
    setIsPlayerReady(false);
    setPlayerError(null);

    const initPlayer = () => {
      if (destroyed || !window.YT || !window.YT.Player) return;

      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying prior YT player instance:', e);
        }
      }

      const player = new window.YT.Player(containerId.current, {
        host: 'https://www.youtube-nocookie.com',
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          enablejsapi: 1,
          playsinline: 1,
          fs: 1,
        },
        events: {
          onReady: (event) => {
            if (destroyed) return;
            try {
              // Strictly enforce mute so original audio never plays
              event.target.mute();
              event.target.setVolume(0);
            } catch (err) {
              console.warn('onReady mute setup warning:', err);
            }
            setIsPlayerReady(true);
            if (onReady) onReady(event.target);
          },
          onStateChange: (event) => {
            if (destroyed) return;
            try {
              // Double enforce mute on every state change
              if (!event.target.isMuted()) {
                event.target.mute();
                event.target.setVolume(0);
              }
            } catch (err) {}
            setPlayerState(event.data);
            if (onStateChange) onStateChange(event.data, event.target);
          },
          onError: (event) => {
            if (destroyed) return;
            const code = event.data;
            let message = 'An unexpected player error occurred.';

            if (code === 101 || code === 150) {
              message = 'Embedding Disabled: The video owner has blocked embedded playback (Error 101/150). Please choose another video or search for an alternate upload.';
            } else if (code === 100) {
              message = 'Video Not Found: This video may have been removed or marked private.';
            } else if (code === 2) {
              message = 'Invalid Video ID: The provided YouTube video parameter is invalid.';
            }

            console.error(`[YouTube IFrame Error ${code}]:`, message);
            setPlayerError({ code, message });
          }
        }
      });

      playerRef.current = player;
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        initPlayer();
      };
    }

    return () => {
      destroyed = true;
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (e) {}
      }
    };
  }, [videoId]);

  const playVideo = useCallback(() => {
    if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
      try {
        playerRef.current.mute();
        playerRef.current.setVolume(0);
        playerRef.current.playVideo();
      } catch (e) {}
    }
  }, []);

  const pauseVideo = useCallback(() => {
    if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
      try {
        playerRef.current.pauseVideo();
      } catch (e) {}
    }
  }, []);

  const seekTo = useCallback((seconds) => {
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(seconds, true);
    }
  }, []);

  const setPlaybackRate = useCallback((rate) => {
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
      playerRef.current.setPlaybackRate(rate);
    }
  }, []);

  return {
    playerRef,
    containerId: containerId.current,
    isPlayerReady,
    playerError,
    playerState,
    playVideo,
    pauseVideo,
    seekTo,
    setPlaybackRate,
  };
}
