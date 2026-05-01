import {
  useTracks,
  ParticipantContext,
  TrackRefContext,
  TrackReferenceOrPlaceholder,
  Chat,
  AudioTrack,
  useLocalParticipant,
  useChat,
} from '@livekit/components-react';
import { Track, LocalParticipant } from 'livekit-client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Volume2, VolumeX, Mic, MicOff, Camera, CameraOff,
  User, MessageSquare, PhoneOff,
} from 'lucide-react';

// ── Disable PiP globally ────────────────────────────────────────
if (typeof document !== 'undefined') {
  document.addEventListener('enterpictureinpicture', (e) => {
    e.preventDefault?.();
    document.exitPictureInPicture?.().catch(() => {});
  }, true);
}

// ── Chat toast notification (portal to body) ────────────────────
// Shows ONLY when player is in fullscreen, and NOT for local user's own messages
interface ToastMsg { id: string; sender: string; text: string; }

function ChatToastPortal() {
  const { chatMessages } = useChat();
  const { localParticipant } = useLocalParticipant();
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastIdRef = useRef<string>('');

  // Track fullscreen state
  useEffect(() => {
    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFSChange);
    document.addEventListener('webkitfullscreenchange', onFSChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFSChange);
      document.removeEventListener('webkitfullscreenchange', onFSChange);
    };
  }, []);

  useEffect(() => {
    if (!isFullscreen) return; // Only show when player is fullscreen
    if (chatMessages.length === 0) return;

    const latest = chatMessages[chatMessages.length - 1];
    const msgId = latest.id ?? String(latest.timestamp);
    if (msgId === lastIdRef.current) return;
    lastIdRef.current = msgId;

    // Skip if this message is from the local user (me)
    if (latest.from?.identity === localParticipant?.identity) return;

    const toast: ToastMsg = {
      id: msgId,
      sender: latest.from?.name || latest.from?.identity || 'Kimdir',
      text: latest.message,
    };

    setToasts(prev => [...prev.slice(-2), toast]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== msgId)), 5000);
  }, [chatMessages, isFullscreen, localParticipant]);

  if (toasts.length === 0) return null;

  return createPortal(
    <div style={{
      position: 'fixed',
      bottom: 80,
      left: 20,
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            background: 'rgba(8,8,8,0.90)',
            border: '1px solid rgba(168,85,247,0.22)',
            borderRadius: 12,
            padding: '8px 12px',
            maxWidth: 260,
            backdropFilter: 'blur(14px)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.7)',
            animation: 'toastIn 0.22s ease',
          }}
        >
          <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a855f7' }}>
            💬 {t.sender}
          </span>
          <span style={{ fontSize: 12, color: '#e4e4e7', wordBreak: 'break-word', lineHeight: 1.4 }}>
            {t.text.length > 80 ? t.text.slice(0, 80) + '…' : t.text}
          </span>
        </div>
      ))}
    </div>,
    document.body,
  );
}

// ── Main sidebar ────────────────────────────────────────────────
export function VideoChatSidebar() {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { updateOnlyOn: [], onlySubscribed: false },
  );

  const { localParticipant, isCameraEnabled, isMicrophoneEnabled } = useLocalParticipant();
  const toggleCamera = () => localParticipant.setCameraEnabled(!isCameraEnabled);
  const toggleMic = () => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);

  const count = tracks.length;

  // ── Calculate participant section height without scroll ─────
  // 16:9 cards in 300px available width:
  //   1 col: card width ~296px → height ~167px
  //   2 col: card width ~144px → height  ~81px
  // Add header (28px) + padding (20px)
  const cardH = count >= 2 ? 81 : 167;
  const rows = count >= 2 ? Math.ceil(count / 2) : 1;
  const participantH = 28 + 20 + rows * cardH + (rows - 1) * 8; // header + padding + rows*cardH + gaps

  return (
    <div style={{ width: 320, minWidth: 320, height: '100%', display: 'flex', flexDirection: 'column', background: '#080808', borderLeft: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>

      {/* Toast portal — renders over the whole page */}
      <ChatToastPortal />

      {/* ── Participants ──────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        height: participantH,
        padding: '10px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        overflow: 'hidden',
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#71717a' }}>
            <User style={{ width: 10, height: 10 }} /> Qatnashuvchilar
          </span>
          <span style={{ background: 'rgba(168,85,247,0.1)', color: '#c084fc', fontSize: 9, fontWeight: 900, padding: '2px 7px', borderRadius: 999 }}>
            {count}
          </span>
        </div>

        {/* Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: count >= 2 ? '1fr 1fr' : '1fr',
          gap: 8,
        }}>
          {tracks.map((trackRef: TrackReferenceOrPlaceholder, index: number) => (
            <ParticipantItem
              key={`${trackRef.participant.sid}_${index}`}
              trackRef={trackRef}
              isLocal={trackRef.participant instanceof LocalParticipant}
              compact={count >= 2}
            />
          ))}
        </div>
      </div>

      {/* ── Chat ─────────────────────────────────────── */}
      <div style={{ flex: '1 1 0%', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        {/* Label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px 5px', flexShrink: 0 }}>
          <MessageSquare style={{ width: 10, height: 10, color: '#a855f7' }} />
          <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#71717a' }}>Jonli Chat</span>
        </div>
        <div style={{ flex: '1 1 0%', overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Chat />
        </div>
      </div>

      {/* ── Controls ─────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        padding: '10px 12px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        background: '#070707',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}>
        <ControlBtn
          onClick={toggleMic}
          label={isMicrophoneEnabled ? "Mikrofon o'chir" : 'Mikrofon yoq'}
          danger={!isMicrophoneEnabled}
        >
          {isMicrophoneEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </ControlBtn>
        <ControlBtn
          onClick={toggleCamera}
          label={isCameraEnabled ? "Kamera o'chir" : 'Kamera yoq'}
          danger={!isCameraEnabled}
        >
          {isCameraEnabled ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
        </ControlBtn>
        <ControlBtn
          alwaysDanger
          onClick={() => { localParticipant.room?.disconnect(); window.location.href = '/dashboard'; }}
          label="Chiqish"
        >
          <PhoneOff className="w-4 h-4" />
        </ControlBtn>
      </div>
    </div>
  );
}

// ── Control button with tooltip ─────────────────────────────────
function ControlBtn({
  children, onClick, label, danger, alwaysDanger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
  alwaysDanger?: boolean;
}) {
  let bg = 'rgba(255,255,255,0.05)';
  let border = 'rgba(255,255,255,0.08)';
  let color = '#d4d4d8';
  let hoverBg = 'rgba(255,255,255,0.1)';

  if (alwaysDanger) {
    bg = 'rgba(239,68,68,0.12)'; border = 'rgba(239,68,68,0.22)'; color = '#f87171'; hoverBg = 'rgba(239,68,68,0.8)';
  } else if (danger) {
    bg = 'rgba(239,68,68,0.12)'; border = 'rgba(239,68,68,0.22)'; color = '#f87171'; hoverBg = 'rgba(239,68,68,0.22)';
  }

  return (
    <div style={{ position: 'relative' }} className="group">
      <button
        onClick={onClick}
        style={{ width: 40, height: 40, borderRadius: 14, border: `1px solid ${border}`, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
        onMouseLeave={e => (e.currentTarget.style.background = bg)}
      >
        {children}
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-zinc-900 border border-white/10 text-white text-[9px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
        {label}
      </span>
    </div>
  );
}

// ── Participant tile ────────────────────────────────────────────
function ParticipantItem({
  trackRef, isLocal, compact,
}: {
  trackRef: TrackReferenceOrPlaceholder;
  isLocal: boolean;
  compact: boolean;
}) {
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isCameraOn = trackRef.participant.isCameraEnabled;
  const isMicOn = trackRef.participant.isMicrophoneEnabled;
  const identity = trackRef.participant.identity || 'User';
  const avatarLetter = identity[0]?.toUpperCase() || '?';

  // Disable PiP
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    (el as any).disablePictureInPicture = true;
    el.setAttribute('disablepictureinpicture', '');
  }, []);

  // Attach track
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const pub = trackRef.publication;
    if (pub?.track) {
      pub.track.attach(el);
      return () => { pub.track?.detach(el); };
    }
  }, [trackRef.publication, isCameraOn]);

  const avSize = compact ? 32 : 44;

  return (
    <div
      className="group"
      style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '16/9', background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <ParticipantContext.Provider value={trackRef.participant}>
        <TrackRefContext.Provider value={trackRef}>

          {/* Video / Avatar */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(24,24,27,0.9)' }}>
            {isCameraOn ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isLocal}
                disablePictureInPicture
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: isLocal ? 'scaleX(-1)' : 'none' }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: avSize, height: avSize, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(168,85,247,0.5),rgba(99,102,241,0.5))', border: '1px solid rgba(168,85,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: avSize * 0.42, fontWeight: 900, color: 'white', userSelect: 'none' }}>
                  {avatarLetter}
                </div>
                {!compact && (
                  <span style={{ fontSize: 8, color: '#71717a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{identity}</span>
                )}
              </div>
            )}
          </div>

          {/* Remote audio */}
          {!isLocal && isMicOn && (
            <div style={{ display: 'none' }}>
              <AudioTrack trackRef={trackRef} volume={muted ? 0 : volume} />
            </div>
          )}

          {/* Name badge — top left */}
          <div style={{ position: 'absolute', top: 4, left: 4, display: 'flex', alignItems: 'center', gap: 3, padding: '2px 6px', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
            {isLocal && <span style={{ fontSize: 7, color: '#a855f7', fontWeight: 900, textTransform: 'uppercase' }}>Sen</span>}
            <span style={{ fontSize: 7, color: '#d4d4d8', fontWeight: 700, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{identity}</span>
          </div>

          {/* Mic + Camera badges — top right */}
          <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
            {/* Camera badge */}
            <div style={{ background: isCameraOn ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${isCameraOn ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 5, padding: '2px 3px', display: 'flex', alignItems: 'center' }}>
              {isCameraOn
                ? <Camera style={{ width: 8, height: 8, color: '#4ade80' }} />
                : <CameraOff style={{ width: 8, height: 8, color: '#f87171' }} />
              }
            </div>
            {/* Mic badge */}
            <div style={{ background: isMicOn ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${isMicOn ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 5, padding: '2px 3px', display: 'flex', alignItems: 'center' }}>
              {isMicOn
                ? <Mic style={{ width: 8, height: 8, color: '#4ade80' }} />
                : <MicOff style={{ width: 8, height: 8, color: '#f87171' }} />
              }
            </div>
          </div>

          {/* Volume control — remote only, slide up on hover */}
          {!isLocal && (
            <div
              className="translate-y-full group-hover:translate-y-0 transition-transform duration-200"
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 8px', background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <button
                onClick={() => setMuted(!muted)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: muted ? '#f87171' : '#a1a1aa', flexShrink: 0 }}
              >
                {muted ? <VolumeX style={{ width: 11, height: 11 }} /> : <Volume2 style={{ width: 11, height: 11 }} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step="any"
                value={muted ? 0 : volume}
                onChange={e => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
                style={{ flex: 1, height: 2, accentColor: '#a855f7', cursor: 'pointer' }}
              />
            </div>
          )}

        </TrackRefContext.Provider>
      </ParticipantContext.Provider>
    </div>
  );
}
