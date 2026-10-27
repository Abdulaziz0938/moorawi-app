// [ezo-music] MusicPlayer â€” ONE audio element, shared across all instances
// - variant="hidden" (RoomView): drives the actual playback
// - variant="inline" (MusicSheet): UI only, reads state from the global audio

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { Music, Volume2, VolumeX, Pause, Play, X, Loader2 } from "lucide-react";
import { getActiveToken } from "../lib/session";

// â•گâ•گâ•گ MODULE SINGLETON â€” exactly ONE <audio> in the entire app â•گâ•گâ•گ
let __audio: HTMLAudioElement | null = null;
let __audioTrackId: string | null = null;
let __isPlaying = false;
const __listeners = new Set<() => void>();

function notify() { __listeners.forEach(fn => fn()); }

function ensureAudio(url: string, trackId: string): HTMLAudioElement {
  if (__audio && __audioTrackId === trackId) return __audio;
  if (__audio) {
    try { __audio.pause(); } catch {}
    try { __audio.src = ""; } catch {}
    __audio = null;
    __audioTrackId = null;
    __isPlaying = false;
  }
  __audio = new Audio(url);
  __audio.loop = true;
  __audioTrackId = trackId;
  __audio.addEventListener("play", () => { __isPlaying = true; notify(); });
  __audio.addEventListener("pause", () => { __isPlaying = false; notify(); });
  __audio.addEventListener("ended", () => { __isPlaying = false; notify(); });
  return __audio;
}

function playAudio(seekTo?: number) {
  if (!__audio) return;
  if (seekTo != null && seekTo > 0 && Math.abs(__audio.currentTime - seekTo) > 2) {
    try { __audio.currentTime = seekTo; } catch {}
  }
  __audio.play().catch(() => {});
}

function pauseAudio() {
  if (__audio) { try { __audio.pause(); } catch {} }
}

function stopAudio() {
  if (__audio) {
    try { __audio.pause(); } catch {}
    try { __audio.src = ""; } catch {}
    __audio = null;
    __audioTrackId = null;
    __isPlaying = false;
    notify();
  }
}

function setMute(m: boolean) { if (__audio) __audio.muted = m; }
function setVol(v: number) { if (__audio) __audio.volume = v; }
function getPlaying() { return __isPlaying; }

function subscribe(cb: () => void): () => void {
  __listeners.add(cb);
  return () => { __listeners.delete(cb); };
}

interface Props {
  roomId: Id<"rooms">;
  variant?: "inline" | "hidden";
}

export default function MusicPlayer({ roomId, variant = "inline" }: Props) {
  const deviceId = getDeviceId();
  const current = useQuery(api.music.currentForRoom, { roomId });
  const stopRoom = useMutation(api.music.stopRoom);
  const pauseRoom = useMutation(api.music.pauseRoom);
  const resumeRoom = useMutation(api.music.resumeRoom);

  const [muted, setMutedState] = useState(false);
  const [volume, setVolumeState] = useState(0.85);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  // Subscribe to global playing state
  useEffect(() => {
    setPlaying(getPlaying());
    return subscribe(() => setPlaying(getPlaying()));
  }, []);

  // ONLY the hidden variant drives the audio engine
  useEffect(() => {
    if (variant !== "hidden") return;

    if (!current || !current.url) {
      stopAudio();
      setLoading(false);
      return;
    }

    setLoading(true);
    const a = ensureAudio(current.url, String(current.musicId));
    a.muted = muted;
    a.volume = volume;

    if (current.isPaused) {
      pauseAudio();
      setLoading(false);
    } else {
      playAudio(current.positionSec);
      // approximate â€” real loading state resolved after play promise
      setTimeout(() => setLoading(false), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.musicId, current?.url, current?.isPaused, variant]);

  // Sync mute/volume (both variants can change it; last wins)
  useEffect(() => {
    setMute(muted);
    setVol(volume);
  }, [muted, volume]);

  if (!current) return null;
  if (variant === "hidden") return null;

  const isPaused = current.isPaused;

  const handlePause = () => {
    pauseAudio();
    pauseRoom({
      roomId,
      positionSec: __audio?.currentTime ?? 0,
      tokenOverride: getActiveToken() ?? deviceId,
    }).catch(() => {});
  };

  const handleResume = () => {
    resumeRoom({ roomId, tokenOverride: getActiveToken() ?? deviceId }).catch(() => {});
  };

  const handleStop = () => {
    stopAudio();
    stopRoom({ roomId, tokenOverride: getActiveToken() ?? deviceId }).catch(() => {});
  };

  return (
    <div className="rounded-2xl border border-purple-400/40 bg-gradient-to-br from-purple-600/30 to-pink-600/30 p-3 space-y-2.5" dir="rtl">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          {loading
            ? <Loader2 size={14} className="text-white animate-spin" />
            : <Music size={14} className={`text-white ${playing ? "animate-pulse" : ""}`} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-black truncate">{current.name}</p>
          <p className="text-white/70 text-[10px] truncate">ط¨ط¯ط£ظ‡ {current.startedByName}</p>
        </div>
        <span className="text-white/60 text-[9px] px-2 py-0.5 rounded-full bg-white/10">
          {isPaused ? "ظ…طھظˆظ‚ظپ" : playing ? "ظٹط¹ظ…ظ„" : "..."}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={isPaused ? handleResume : handlePause}
          className="w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center active:scale-95"
        >
          {isPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
        </button>

        <button
          onClick={() => setMutedState((m) => !m)}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition active:scale-95 ${muted ? "bg-red-500/50 text-white" : "bg-white/20 text-white"}`}
        >
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>

        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => setVolumeState(Number(e.target.value))}
          className="flex-1 accent-pink-400"
          dir="ltr"
        />

        <button
          onClick={handleStop}
          className="w-9 h-9 rounded-full bg-red-500/40 text-white flex items-center justify-center active:scale-95"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

