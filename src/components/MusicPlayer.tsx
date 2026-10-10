// [moorawi-music] MusicPlayer — synced room music player
// Embedded inside MusicSheet (not floating).
// Auto-plays when someone starts a track. Local mute + volume.

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { Music, Volume2, VolumeX, Pause, Play, X, Loader2 } from "lucide-react";

interface Props {
  roomId: Id<"rooms">;
  /** 'inline' = داخل MusicSheet | 'hidden' = لا يعرض UI (فقط يشغّل الصوت) */
  variant?: "inline" | "hidden";
}

export default function MusicPlayer({ roomId, variant = "inline" }: Props) {
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

  // Load / play / pause on track change
  useEffect(() => {
    if (!current || !current.url) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlaying(false);
      return;
    }

    if (audioRef.current && (audioRef.current as any)._trackId === current.musicId) {
      if (current.isPaused && !audioRef.current.paused) {
        audioRef.current.pause();
        setPlaying(false);
      } else if (!current.isPaused && audioRef.current.paused) {
        audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
      }
      return;
    }

    if (audioRef.current) audioRef.current.pause();

    setLoading(true);
    const a = new Audio(current.url);
    (a as any)._trackId = current.musicId;
    a.loop = true;
    a.muted = muted;
    a.volume = volume;

    const onLoaded = () => {
      try {
        a.currentTime = Math.max(0, current.positionSec || 0);
      } catch {}
      if (!current.isPaused) {
        a.play()
          .then(() => { setPlaying(true); setLoading(false); })
          .catch(() => { setPlaying(false); setLoading(false); });
      } else {
        setPlaying(false);
        setLoading(false);
      }
    };
    a.addEventListener("loadedmetadata", onLoaded, { once: true });

    audioRef.current = a;

    return () => { a.pause(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.musicId, current?.url]);

  // Sync pause/resume without reload
  useEffect(() => {
    if (!audioRef.current || !current) return;
    const a = audioRef.current;
    if (current.isPaused && !a.paused) {
      a.pause(); setPlaying(false);
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
  if (variant === "hidden") return null;

  const isPaused = current.isPaused;

  const handlePause = () => {
    const pos = audioRef.current?.currentTime ?? 0;
    pauseRoom({ roomId, positionSec: pos, tokenOverride: deviceId }).catch(() => {});
  };
  const handleResume = () => {
    resumeRoom({ roomId, tokenOverride: deviceId }).catch(() => {});
  };
  const handleStop = () => {
    stopRoom({ roomId, tokenOverride: deviceId }).catch(() => {});
  };

  return (
    <div className="rounded-2xl border border-purple-400/40 bg-gradient-to-br from-purple-600/30 to-pink-600/30 p-3 space-y-2.5" dir="rtl">
      {/* Track info */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          {loading
            ? <Loader2 size={14} className="text-white animate-spin" />
            : <Music size={14} className={`text-white ${playing ? "animate-pulse" : ""}`} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-black truncate">{current.name}</p>
          <p className="text-white/70 text-[10px] truncate">بدأه {current.startedByName}</p>
        </div>
        <span className="text-white/60 text-[9px] px-2 py-0.5 rounded-full bg-white/10">
          {isPaused ? "متوقف" : playing ? "يعمل" : "..."}
        </span>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2">
        <button
          onClick={isPaused ? handleResume : handlePause}
          className="w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center active:scale-95"
          title={isPaused ? "استئناف" : "إيقاف مؤقت"}
        >
          {isPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
        </button>

        <button
          onClick={() => setMuted((m) => !m)}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition active:scale-95 ${muted ? "bg-red-500/50 text-white" : "bg-white/20 text-white"}`}
          title={muted ? "تشغيل الصوت" : "كتم الصوت"}
        >
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>

        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="flex-1 accent-pink-400"
          dir="ltr"
          title="مستوى الصوت"
        />

        <button
          onClick={handleStop}
          className="w-9 h-9 rounded-full bg-red-500/40 text-white flex items-center justify-center active:scale-95"
          title="إيقاف للجميع"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
