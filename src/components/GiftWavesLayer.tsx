import { forwardRef, useImperativeHandle } from "react";

export interface FlyingTarget {
  userId: string;
  targetX: number;
  targetY: number;
  spreadX: number;
  spreadY: number;
  isOnMic: boolean;
  seatIndex?: number;
  delay?: number;
}

export type GiftWavesHandle = {
  spawn: (gift: { mediaUrl: string | null }, particles: FlyingTarget[]) => void;
};

const GiftWavesLayer = forwardRef<GiftWavesHandle>((_props, ref) => {
  useImperativeHandle(
    ref,
    () => ({
      spawn() {
        // [ezo-fix] تم تعطيل الشلال نهائياً لمنع الوميض الأسود وإرهاق الجوال
        return;
      },
    }),
    []
  );
  return null;
});

GiftWavesLayer.displayName = "GiftWavesLayer";
export default GiftWavesLayer;
