// [ezo-live-pk] نافذة قبول دعوة PK للضيفة
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { getDeviceId } from "../../lib/device";
import { getActiveToken } from "../../lib/session";
import { dialog } from "../../lib/dialog";
import VipAvatar from "../ui/VipAvatar";
import { Swords, Loader2, X, Users } from "lucide-react";

interface Props {
  streamId: string;
  onDecline: () => void;
  onAccepted: (streamId: string) => void;
}

export default function PKAcceptModal({ streamId, onDecline, onAccepted }: Props) {
  const deviceId = getDeviceId();
  const token = getActiveToken() ?? deviceId;
  const stream = useQuery(api.live.getStream, { streamId: streamId as Id<"liveStreams"> });
  const notifs = useQuery(api.notifications.listMine, { tokenOverride: token });
  const invite = (notifs ?? []).find(
    (n: any) =>
      (n.actionType === "pk_invite" || n.actionType === "cohost_invite") &&
      String(n.actionPayload) === String(streamId) &&
      !n.readAt
  );
  const isPK = invite?.actionType === "pk_invite";
  const acceptPK = useMutation(api.live.acceptPK);
  const declinePK = useMutation(api.live.declinePK);
  const [busy, setBusy] = useState(false);

  const handleAccept = async () => {
    setBusy(true);
    try {
      await acceptPK({ streamId: streamId as Id<"liveStreams">, tokenOverride: token });
      onAccepted(streamId);
    } catch (e: any) {
      dialog.alert(e?.message || "فشل قبول الدعوة");
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    try {
      await declinePK({ streamId: streamId as Id<"liveStreams">, tokenOverride: token });
    } catch {}
    onDecline();
  };

  if (!stream || stream.status !== "live") return null;

  return (
    <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-md flex items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 to-black rounded-3xl border border-amber-400/40 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isPK ? "bg-amber-500/20" : "bg-cyan-500/20"
            }`}>
              {isPK ? (
                <Swords size={20} className="text-amber-400" />
              ) : (
                <Users size={20} className="text-cyan-400" />
              )}
            </div>
            <div>
              <h2 className="text-white text-base font-black">
                {isPK ? "دعوة منافسة PK" : "دعوة للجلوس"}
              </h2>
              <p className="text-white/50 text-[10px]">
                {isPK ? "5 دقائق — الهدايا تحدد الفائزة" : "بث مشترك بدون منافسة"}
              </p>
            </div>
          </div>
          <button
            onClick={handleDecline}
            disabled={busy}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95 disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col items-center text-center">
          <VipAvatar
            src={stream.hostAvatarUrl}
            name={stream.hostName}
            size={80}
            vip={stream.hostVipLevel ?? 0}
          />
          <p className="text-white font-black mt-3 text-lg">{stream.hostName}</p>
          <p className="text-white/60 text-xs mt-1 leading-relaxed">
            {isPK
              ? "تدعوك لمنافسة PK مباشرة الآن"
              : "تدعوك للجلوس معها في بثها"}
          </p>
        </div>

        <div className="p-4 pt-0 flex gap-2">
          <button
            onClick={handleDecline}
            disabled={busy}
            className="flex-1 h-12 rounded-2xl bg-white/10 text-white font-black text-sm active:scale-95 disabled:opacity-40"
          >
            رفض
          </button>
          <button
            onClick={handleAccept}
            disabled={busy}
            className={`flex-1 h-12 rounded-2xl text-white font-black text-sm active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2 ${
              isPK
                ? "bg-gradient-to-r from-amber-500 to-orange-600"
                : "bg-gradient-to-r from-cyan-500 to-blue-600"
            }`}
          >
            {busy ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isPK ? (
              <><Swords size={16} />قبول التحدي</>
            ) : (
              <><Users size={16} />قبول الجلوس</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
