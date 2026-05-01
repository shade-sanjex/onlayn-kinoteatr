/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_LIVEKIT_URL: string;
  readonly VITE_TMDB_API_KEY: string;
  readonly VITE_YOUTUBE_API_KEY: string;
  readonly VITE_LIVEKIT_API_KEY: string;
  readonly VITE_LIVEKIT_API_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// YouTube IFrame API global typings
interface Window {
  YT: {
    Player: new (
      el: HTMLElement | string,
      opts: {
        videoId: string;
        playerVars?: Record<string, number | string>;
        events?: {
          onReady?: (e: any) => void;
          onStateChange?: (e: any) => void;
          onError?: (e: any) => void;
        };
      }
    ) => any;
    PlayerState: {
      PLAYING: number;
      PAUSED: number;
      BUFFERING: number;
      ENDED: number;
      CUED: number;
    };
  };
  onYouTubeIframeAPIReady?: () => void;
}
