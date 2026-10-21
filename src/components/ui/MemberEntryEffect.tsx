import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import EntryEffectOverlay from "./EntryEffectOverlay";

export default function MemberEntryEffect({
  userId,
  onDone,
}: {
  userId: Id<"users">;
  onDone: () => void;
}) {
  const equipped = useQuery(api.shop.getEquippedAssets, { userId });
  const effect = [equipped?.entryEffect, equipped?.vehicle].find(
    (x: any) => x && typeof x.imageUrl === "string" && x.imageUrl.length > 0
  );

  useEffect(() => {
    // إذا لم يكن هناك تأثير، نغلق فوراً
    if (equipped !== undefined && !effect) {
      onDone();
    }
  }, [equipped, effect, onDone]);

  if (!effect) return null;

  return (
    <EntryEffectOverlay
      url={effect.imageUrl}
      type="auto"
      onFinish={onDone}
    />
  );
}
