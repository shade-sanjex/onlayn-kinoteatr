import { useEffect, useRef, useState, useCallback } from 'react';
import { useRoomContext } from '@livekit/components-react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  FastForward,
  Loader2,
  Keyboard
} from 'lucide-react';

interface SyncPlayerProps {
  url: string;
}

function isYouTubeUrl(url: string) {
  return /youtube\.com|youtu\.be/.test(url);
}

function getYouTubeId(url: string) {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Native HTML5 player (for direct file URLs / Supabase Storage)
// ──────────────────────────────────────────────────────────────────────────────
interface NativePlayerProps {
  url: string;
  playing: boolean;
  muted: boolean;
  volume: number;
  onReady: () => void;
  onProgress: (played: number, playedSeconds: number) => void;
  onDuration: (d: number) => void;
  onBuffer: () => void;
  onBufferEnd: () => void;
  onPlay: () => void;
  onPause: () => void;
  onError: (msg: string) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}

function NativePlayer({
  url, playing, muted, volume,
  onReady, onProgress, onDuration, onBuffer, onBufferEnd, onPlay, onPause, onError,
  videoRef
}: NativePlayerProps) {
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    playing ? v.play().catch(() => {}) : v.pause();
  }, [playing, videoRef]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = volume;
    v.muted = muted;
  }, [volume, muted, videoRef]);

  return (
    <video
      ref={videoRef}
      src={url}
      className="w-full h-full object-contain"
      onCanPlay={onReady}
      onLoadedMetadata={(e) => onDuration((e.target as HTMLVideoElement).duration)}
      onTimeUpdate={(e) => {
        const v = e.target as HTMLVideoElement;
        if (v.duration) onProgress(v.currentTime / v.duration, v.currentTime);
      }}
      onWaiting={onBuffer}
      onPlaying={onBufferEnd}
      onPlay={onPlay}
      onPause={onPause}
      onError={(e) => {
        const v = e.target as HTMLVideoElement;
        const errMap: Record<number, string> = {
          1: 'Foydalanuvchi videoni to\'xtatdi.',
          2: 'Noto\'g\'ri video manbasi.',
          3: 'Video dekodlanmadi (format xatosi).',
          4: 'Video yuklanmadi (server yoki CORS muammosi).',
        };
        onError(errMap[v.error?.code ?? 0] || 'Video yuklanmadi. URL ni tekshiring.');
      }}
      playsInline
      preload="auto"
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// YouTube iframe player wrapper
// ──────────────────────────────────────────────────────────────────────────────
interface YouTubePlayerProps {
  videoId: string;
  playing: boolean;
  muted: boolean;
  volume: number;
  onReady: () => void;
  onProgress: (played: number, playedSeconds: number) => void;
  onDuration: (d: number) => void;
  onBuffer: () => void;
  onBufferEnd: () => void;
  onPlay: () => void;
  onPause: () => void;
  onError: (msg: string) => void;
  ytRef: React.MutableRefObject<any>;
}

function YouTubePlayer({
  videoId, playing, muted, volume,
  onReady, onProgress, onDuration, onBuffer, onBufferEnd, onPlay, onPause, onError,
  ytRef
}: YouTubePlayerProps) {
  const iframeRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Store callbacks in refs so the stale-closure-safe useEffect can call them
  const cbReady = useRef(onReady); cbReady.current = onReady;
  const cbProgress = useRef(onProgress); cbProgress.current = onProgress;
  const cbDuration = useRef(onDuration); cbDuration.current = onDuration;
  const cbBuffer = useRef(onBuffer); cbBuffer.current = onBuffer;
  const cbBufferEnd = useRef(onBufferEnd); cbBufferEnd.current = onBufferEnd;
  const cbPlay = useRef(onPlay); cbPlay.current = onPlay;
  const cbPause = useRef(onPause); cbPause.current = onPause;
  const cbError = useRef(onError); cbError.current = onError;
  const mutedRef = useRef(muted); mutedRef.current = muted;
  const volumeRef = useRef(volume); volumeRef.current = volume;

  useEffect(() => {
    let mounted = true;

    const init = () => {
      if (!mounted || !iframeRef.current) return;
      ytRef.current = new window.YT.Player(iframeRef.current, {
        videoId,
        playerVars: { autoplay: 0, controls: 0, rel: 0, modestbranding: 1, enablejsapi: 1 },
        events: {
          onReady: (e: any) => {
            cbDuration.current(e.target.getDuration());
            if (mutedRef.current) e.target.mute(); else e.target.unMute();
            e.target.setVolume(volumeRef.current * 100);
            cbReady.current();
            intervalRef.current = setInterval(() => {
              if (!mounted) return;
              const p = ytRef.current;
              if (p?.getDuration) {
                const cur = p.getCurrentTime();
                const dur = p.getDuration();
                if (dur) cbProgress.current(cur / dur, cur);
              }
            }, 500);
          },
          onStateChange: (e: any) => {
            if (!mounted) return;
            const YTS = window.YT?.PlayerState;
            if (!YTS) return;
            if (e.data === YTS.BUFFERING) cbBuffer.current();
            if (e.data === YTS.PLAYING) { cbBufferEnd.current(); cbPlay.current(); }
            if (e.data === YTS.PAUSED) cbPause.current();
            if (e.data === YTS.ENDED) cbPause.current();
            // State 5 = video cued but embed is disabled
            if (e.data === 5) cbError.current('Bu YouTube videosi embed qilishga ruxsat bermaydi. Boshqa video yoki to\'g\'ridan-to\'g\'ri havola ishlating.');
          },
          onError: (e: any) => {
            if (!mounted) return;
            const codes: Record<number, string> = {
              2: 'Noto\'g\'ri video ID.',
              5: 'HTML5 pleyer xatosi.',
              100: 'Video topilmadi yoki o\'chirilgan.',
              101: 'Bu video embed qilishga ruxsat bermaydi.',
              150: 'Bu video embed qilishga ruxsat bermaydi.',
            };
            cbError.current(codes[e.data] || `YouTube xatosi (kod: ${e.data}). Boshqa video ishlating.`);
          }
        }
      });
    };

    const loadAndInit = () => {
      if (window.YT?.Player) {
        init();
      } else {
        const prev = (window as any).onYouTubeIframeAPIReady;
        (window as any).onYouTubeIframeAPIReady = () => {
          prev?.();
          init();
        };
        if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
          const tag = document.createElement('script');
          tag.src = 'https://www.youtube.com/iframe_api';
          document.head.appendChild(tag);
        }
      }
    };

    loadAndInit();

    return () => {
      mounted = false;
      clearInterval(intervalRef.current);
      try { ytRef.current?.destroy?.(); } catch {}
      ytRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  useEffect(() => {
    const p = ytRef.current;
    if (!p) return;
    if (playing) p.playVideo?.();
    else p.pauseVideo?.();
  }, [playing, ytRef]);

  useEffect(() => {
    const p = ytRef.current;
    if (!p) return;
    if (muted) p.mute?.(); else p.unMute?.();
    p.setVolume?.(volume * 100);
  }, [muted, volume, ytRef]);

  return <div ref={iframeRef} className="w-full h-full" />;
}

// ──────────────────────────────────────────────────────────────────────────────
// Main SyncPlayer
// ──────────────────────────────────────────────────────────────────────────────
export function SyncPlayer({ url }: SyncPlayerProps) {
  const room = useRoomContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytRef = useRef<any>(null);

  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [played, setPlayed] = useState(0);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [ready, setReady] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const isInternalChange = useRef(false);
  const isYT = isYouTubeUrl(url);
  const ytId = isYT ? getYouTubeId(url) : null;

  // Reset state when URL changes
  useEffect(() => {
    setPlaying(false);
    setPlayed(0);
    setPlayedSeconds(0);
    setDuration(0);
    setReady(false);
    setBuffering(false);
    setPlayerError(null);
  }, [url]);

  // ── Seek helpers ────────────────────────────────────────────────────────────
  const seekTo = useCallback((seconds: number) => {
    if (isYT) {
      ytRef.current?.seekTo?.(seconds, true);
    } else {
      if (videoRef.current) videoRef.current.currentTime = seconds;
    }
  }, [isYT]);

  const getCurrentTime = useCallback((): number => {
    if (isYT) return ytRef.current?.getCurrentTime?.() ?? 0;
    return videoRef.current?.currentTime ?? 0;
  }, [isYT]);

  // ── Sync broadcast ──────────────────────────────────────────────────────────
  const broadcastState = useCallback(async (state: { type: string; time: number }) => {
    if (!room || room.state !== 'connected') return;
    try {
      const data = new TextEncoder().encode(JSON.stringify(state));
      await room.localParticipant.publishData(data, { reliable: true });
    } catch (error) {
      console.error('Sync error:', error);
    }
  }, [room]);

  // ── Receive sync events ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!room) return;
    const handleData = (payload: Uint8Array) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));
        isInternalChange.current = true;
        if (msg.type === 'play') {
          if (Math.abs(getCurrentTime() - msg.time) > 2) seekTo(msg.time);
          setPlaying(true);
        } else if (msg.type === 'pause') {
          setPlaying(false);
        } else if (msg.type === 'seek') {
          seekTo(msg.time);
        }
        setTimeout(() => { isInternalChange.current = false; }, 600);
      } catch (e) {
        console.error('Data handle error:', e);
      }
    };
    room.on('dataReceived', handleData);
    return () => { room.off('dataReceived', handleData); };
  }, [room, seekTo, getCurrentTime]);

  // ── Toggle play ─────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const next = !playing;
    setPlaying(next);
    broadcastState({ type: next ? 'play' : 'pause', time: getCurrentTime() });
  }, [playing, broadcastState, getCurrentTime]);

  // ── Progress handler ────────────────────────────────────────────────────────
  const handleProgress = useCallback((p: number, ps: number) => {
    if (!seeking) {
      setPlayed(p);
      setPlayedSeconds(ps);
    }
  }, [seeking]);

  // ── Seek bar ────────────────────────────────────────────────────────────────
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayed(parseFloat(e.target.value));
  };
  const handleSeekMouseDown = () => setSeeking(true);
  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    setSeeking(false);
    const frac = parseFloat((e.target as HTMLInputElement).value);
    const time = frac * duration;
    seekTo(time);
    broadcastState({ type: 'seek', time });
  };

  // ── Fullscreen ──────────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't fire if focused in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          togglePlay();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyM':
          e.preventDefault();
          setMuted(m => !m);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekTo(Math.min(getCurrentTime() + 10, duration));
          broadcastState({ type: 'seek', time: Math.min(getCurrentTime() + 10, duration) });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekTo(Math.max(getCurrentTime() - 10, 0));
          broadcastState({ type: 'seek', time: Math.max(getCurrentTime() - 10, 0) });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(v => Math.min(v + 0.1, 1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(v => Math.max(v - 0.1, 0));
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, toggleFullscreen, seekTo, getCurrentTime, duration, broadcastState]);

  // ── Format time ─────────────────────────────────────────────────────────────
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    if (h) return `${h}:${m.toString().padStart(2, '0')}:${s}`;
    return `${m}:${s}`;
  };

  // ── Native video events (broadcast) ────────────────────────────────────────
  const handleNativePlay = useCallback(() => {
    if (!isInternalChange.current) broadcastState({ type: 'play', time: getCurrentTime() });
  }, [broadcastState, getCurrentTime]);
  const handleNativePause = useCallback(() => {
    if (!isInternalChange.current) broadcastState({ type: 'pause', time: getCurrentTime() });
  }, [broadcastState, getCurrentTime]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={`w-full h-full bg-black relative group flex items-center justify-center overflow-hidden shadow-2xl focus:outline-none ${isFullscreen ? '' : 'rounded-3xl border border-white/5'}`}
      onDoubleClick={toggleFullscreen}
    >
      {/* ── Video Layer ── */}
      {isYT && ytId ? (
        <YouTubePlayer
          videoId={ytId}
          playing={playing}
          muted={muted}
          volume={volume}
          onReady={() => { setReady(true); setPlayerError(null); }}
          onProgress={handleProgress}
          onDuration={setDuration}
          onBuffer={() => setBuffering(true)}
          onBufferEnd={() => setBuffering(false)}
          onPlay={handleNativePlay}
          onPause={handleNativePause}
          onError={setPlayerError}
          ytRef={ytRef}
        />
      ) : (
        <NativePlayer
          url={url}
          playing={playing}
          muted={muted}
          volume={volume}
          onReady={() => { setReady(true); setPlayerError(null); }}
          onProgress={handleProgress}
          onDuration={setDuration}
          onBuffer={() => setBuffering(true)}
          onBufferEnd={() => setBuffering(false)}
          onPlay={handleNativePlay}
          onPause={handleNativePause}
          onError={setPlayerError}
          videoRef={videoRef}
        />
      )}

      {/* ── Buffering Spinner ── */}
      {(buffering || !ready) && !playerError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-20">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
        </div>
      )}

      {/* ── Player Error ── */}
      {playerError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-[25] bg-black/70 backdrop-blur-sm p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-white font-black text-base mb-2">Video yuklanmadi</h3>
          <p className="text-zinc-400 text-xs max-w-sm leading-relaxed">{playerError}</p>
          <button
            onClick={() => setPlayerError(null)}
            className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs font-black text-white transition-all"
          >
            Yopish
          </button>
        </div>
      )}

      {/* ── Controls Overlay ── */}
      <div
        className={`absolute inset-0 z-30 bg-gradient-to-t from-black/95 via-black/10 to-black/50 transition-opacity duration-300
          ${playing ? 'opacity-0' : 'opacity-100'} group-hover:opacity-100 group-focus:opacity-100
          flex flex-col justify-end`}
      >
        {/* Keyboard hint */}
        <button
          onClick={() => setShowHint(h => !h)}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white transition-all"
          title="Klaviatura yorliqlari"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {showHint && (
          <div className="absolute top-14 right-4 bg-black/90 border border-white/10 rounded-2xl p-4 text-[10px] text-zinc-300 space-y-1.5 font-mono z-40 backdrop-blur-md">
            <p><span className="text-purple-400 font-bold">Space / K</span> — Play / Pause</p>
            <p><span className="text-purple-400 font-bold">F</span> — To'liq ekran</p>
            <p><span className="text-purple-400 font-bold">M</span> — Ovoz o'chirish</p>
            <p><span className="text-purple-400 font-bold">← →</span> — 10 sek o'tkazish</p>
            <p><span className="text-purple-400 font-bold">↑ ↓</span> — Ovoz balandligi</p>
            <p><span className="text-purple-400 font-bold">2× klik</span> — To'liq ekran</p>
          </div>
        )}

        {/* Progress Bar */}
        <div className="px-6 pb-4 pt-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-bold text-zinc-400 tabular-nums w-14 text-right shrink-0">
              {formatTime(playedSeconds)}
            </span>
            <div className="flex-1 relative h-1 group/bar cursor-pointer">
              <input
                type="range"
                min={0}
                max={0.999999}
                step="any"
                value={played}
                onMouseDown={handleSeekMouseDown}
                onChange={handleSeekChange}
                onMouseUp={handleSeekMouseUp}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              {/* Track background */}
              <div className="absolute inset-y-0 w-full rounded-full bg-white/10 group-hover/bar:h-[6px] h-[4px] top-1/2 -translate-y-1/2 transition-all" />
              {/* Progress fill */}
              <div
                className="absolute inset-y-0 rounded-full bg-purple-500 group-hover/bar:h-[6px] h-[4px] top-1/2 -translate-y-1/2 transition-all pointer-events-none"
                style={{ width: `${played * 100}%` }}
              />
              {/* Thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg pointer-events-none opacity-0 group-hover/bar:opacity-100 transition-opacity"
                style={{ left: `calc(${played * 100}% - 6px)` }}
              />
            </div>
            <span className="text-xs font-bold text-zinc-500 tabular-nums w-14 shrink-0">
              {formatTime(duration)}
            </span>
          </div>

          {/* Bottom Controls Row */}
          <div className="flex items-center justify-between">
            {/* Left: seek back, play, seek fwd, volume */}
            <div className="flex items-center gap-3 sm:gap-5">
              <button
                onClick={() => { seekTo(Math.max(getCurrentTime() - 10, 0)); broadcastState({ type: 'seek', time: Math.max(getCurrentTime() - 10, 0) }); }}
                className="text-zinc-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/10"
                title="10 sek orqaga (←)"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              {/* Play / Pause — big button */}
              <button
                onClick={togglePlay}
                className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black hover:scale-110 transition-transform shadow-xl"
                title="Play/Pause (Space)"
              >
                {playing
                  ? <Pause className="w-6 h-6" fill="currentColor" />
                  : <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
                }
              </button>

              <button
                onClick={() => { seekTo(Math.min(getCurrentTime() + 10, duration)); broadcastState({ type: 'seek', time: Math.min(getCurrentTime() + 10, duration) }); }}
                className="text-zinc-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/10"
                title="10 sek oldinga (→)"
              >
                <FastForward className="w-5 h-5" />
              </button>

              {/* Volume */}
              <div className="hidden sm:flex items-center gap-2 ml-2">
                <button
                  onClick={() => setMuted(m => !m)}
                  className="text-zinc-400 hover:text-white transition-colors p-1"
                  title="Ovoz o'chirish (M)"
                >
                  {muted || volume === 0
                    ? <VolumeX className="w-5 h-5" />
                    : <Volume2 className="w-5 h-5" />
                  }
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step="any"
                  value={muted ? 0 : volume}
                  onChange={e => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
                  className="w-20 accent-purple-500 h-1 appearance-none bg-white/10 rounded-full cursor-pointer"
                />
              </div>
            </div>

            {/* Right: fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-3 text-zinc-400 hover:text-white transition-all hover:bg-white/10 rounded-2xl"
              title={isFullscreen ? "Kichraytirish (F)" : "To'liq ekran (F)"}
            >
              {isFullscreen
                ? <Minimize className="w-5 h-5" />
                : <Maximize className="w-5 h-5" />
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
