// [moorawi-music] MusicPlayer v3 — synced room music player
// - Skips to current position when joining mid-track
// - Pause / Resume synced across all clients
// - Local mute + volume slider (per device)
// - Stop for everyone (starter / owner / admin only)

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import {
  Music, Volume2, VolumeX, X, Loader2, Pause, Play, SkipForward,
} from "lucide-react";

interface Props {
  roomId: Id<"rooms">;
}

export default function MusicPlayer({ roomId }: Props) {
  const deviceId = getDeviceId();
  const current = useQuery(api.music.currentForRoom, { roomId });
  const stopRoom = useMutation(api.music.stopRoom);
  const pauseRoom = useMutation(api.music.pauseRoom);
  const resumeRoom = useMutation(api.music.resumeRoom);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showVolume, setShowVolume] = useState(false);

  // ============ Track change / play / pause ============
  useEffect(() => {
    if (!current || !current.url) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlaying(false);
      return;
    }

    // Same track already loaded
    if (audioRef.current && (audioRef.current as any)._trackId === current.musicId) {
      // Sync play/pause state
      if (current.isPaused && !audioRef.current.paused) {
        audioRef.current.pause();
        setPlaying(false);
      } else if (!current.isPaused && audioRef.current.paused) {
        audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
      }
      return;
    }

    // New track — replace
    if (audioRef.current) audioRef.current.pause();

    setLoading(true);
    const a = new Audio(current.url);
    (a as any)._trackId = current.musicId;
    a.loop = true;
    a.muted = muted;
    a.volume = volume;

    // Sync to current position (skip to it)
    const onLoaded = () => {
      try {
        a.currentTime = Math.max(0, current.positionSec || 0);
      } catch {}
      if (!current.isPaused) {
        a.play().then(() => { setPlaying(true); setLoading(false); }).catch(() => { setPlaying(false); setLoading(false); });
      } else {
        setPlaying(false);
        setLoading(false);
      }
    };
    a.addEventListener("loadedmetadata", onLoaded, { once: true });

    audioRef.current = a;

    return () => {
      a.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.musicId, current?.url]);

  // Sync paused/resumed changes without reloading
  useEffect(() => {
    if (!audioRef.current || !current) return;
    const a = audioRef.current;
    if (current.isPaused && !a.paused) {
      a.pause();
      setPlaying(false);
    } else if (!current.isPaused && a.paused && (a as any)._trackId === current.musicId) {
      a.play().then(() => setPlaying(true)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.isPaused]);

  // Sync mute + volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = muted;
      audioRef.current.volume = volume;
    }
  }, [muted, volume]);

  if (!current) return null;

  const isPaused = current.isPaused;

  const handlePause = () => {
    const pos = audioRef.current?.currentTime ?? 0;
    pauseRoom({ roomId, positionSec: pos, tokenOverride: deviceId }).catch(() => {});
  };

  const handleResume = () => {
    resumeRoom({ roomId, tokenOverride: deviceId }).catch(() => {});
  };

  const handleStop = () => {
    stopRoom({ roomId, tokenOverride: deviceId }).catch(() => {
      // Silent — no permission
    });
  };

  return (
    <div
      className="fixed top-16 right-3 z-[95] bg-gradient-to-br from-purple-600/95 to-pink-600/95 backdrop-blur-xl border border-white/25 rounded-2xl shadow-2xl flex flex-col"
      dir="rtl"
    >
      {/* Main row */}
      <div className="flex items-center gap-2 p-2.5">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          {loading
            ? <Loader2 size={14} className="text-white animate-spin" />
            : <Music size={14} className={`text-white ${playing ? "animate-pulse" : ""}`} />
          }
        </div>

        <div className="flex-1 min-w-0 max-w-[120px]">
          <p className="text-white text-[11px] font-black truncate">{current.name}</p>
          <p className="text-white/70 text-[9px] truncate">بدأه {current.startedByName}</p>
        </div>

        {/* Pause / Resume */}
        <button
          onClick={isPaused ? handleResume : handlePause}
          className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center flex-shrink-0 active:scale-95"
          title={isPaused ? "استئناف" : "إيقاف مؤقت"}
        >
          {isPaused ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}
        </button>

        {/* Volume / mute */}
        <button
          onClick={() => setMuted((m) => !m)}
          onContextMenu={(e) => { e.preventDefault(); setShowVolume((v) => !v); }}
          onClickCapture={() => {}}
          className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition ${
            muted ? "bg-red-500/40 text-white" : "bg-white/20 text-white"
          }`}
          title={muted ? "تشغيل الصوت" : "كتم الصوت"}
        >
          {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
        </button>

        {/* Stop for everyone */}
        <button
          onClick={handleStop}
          className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center flex-shrink-0 active:scale-95"
          title="إيقاف للجميع"
        >
          <X size={12} />
        </button>
      </div>

      {/* Volume slider (toggled via long-press on the mute button — using a small toggle) */}
      <button
        onClick={() => setShowVolume((v) => !v)}
        className="text-white/60 text-[8px] pb-1.5 hover:text-white"
      >
        {showVolume ? "▲ إخفاء الصوت" : "▼ مستوى الصوت"}
      </button>
      {showVolume && (
        <div className="px-3 pb-2 -mt-1">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-full accent-white"
            dir="ltr"
          />
        </div>
      )}
    </div>
  );
}
