// [moorawi-music] MusicPlayer — floating player synced to room music
// Reads currentForRoom and auto-plays when someone starts a track.
// Has LOCAL mute toggle — doesn't affect others.

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { Music, Volume2, VolumeX, X, Loader2 } from "lucide-react";

interface Props {
  roomId: Id<"rooms">;
}

export default function MusicPlayer({ roomId }: Props) {
  const deviceId = getDeviceId();
  const current = useQuery(api.music.currentForRoom, { roomId });
  const stopRoom = useMutation(api.music.stopRoom);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  // React to current music changes
  useEffect(() => {
    if (!current || !current.url) {
      // stop and clean
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlaying(false);
      return;
    }

    // if same track already playing, skip
    if (audioRef.current && (audioRef.current as any)._trackId === current.musicId) {
      return;
    }

    // new track — replace
    if (audioRef.current) {
      audioRef.current.pause();
    }

    setLoading(true);
    const a = new Audio(current.url);
    (a as any)._trackId = current.musicId;
    a.loop = true;
    a.muted = muted;
    a.volume = 0.85;

    a.play()
      .then(() => { setPlaying(true); setLoading(false); })
      .catch(() => { setPlaying(false); setLoading(false); });

    audioRef.current = a;

    return () => { a.pause(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.musicId, current?.url]);

  // Sync mute
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  if (!current) return null;

  const handleStop = () => {
    stopRoom({ roomId, tokenOverride: deviceId }).catch((e) => {
      // Silent — user may not have permission
    });
  };

  return (
    <div
      className="fixed top-16 right-3 z-[95] bg-gradient-to-br from-purple-600/90 to-pink-600/90 backdrop-blur-xl border border-white/20 rounded-2xl p-2.5 shadow-2xl flex items-center gap-2 max-w-[240px]"
      dir="rtl"
    >
      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
        {loading ? <Loader2 size={14} className="text-white animate-spin" /> : <Music size={14} className="text-white" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-white text-[11px] font-black truncate">{current.name}</p>
        <p className="text-white/70 text-[9px] truncate">بدأه {current.startedByName}</p>
      </div>

      <button
        onClick={() => setMuted((m) => !m)}
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition ${
          muted ? "bg-red-500/40 text-white" : "bg-white/20 text-white"
        }`}
        title={muted ? "تشغيل الصوت" : "كتم الصوت"}
      >
        {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
      </button>

      <button
        onClick={handleStop}
        className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center flex-shrink-0"
        title="إيقاف"
      >
        <X size={12} />
      </button>
    </div>
  );
}
