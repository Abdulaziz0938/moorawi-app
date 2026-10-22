import React from "react";
import SvgaPlayer from "./SvgaPlayer";
import LottiePlayer from "./LottiePlayer";

export default function AssetVideo({
  url,
  type = "auto",
  className = "",
  loop = false,
  style,
  ...props
}: {
  url?: string;
  type?: "image" | "video" | "auto" | string;
  className?: string;
  loop?: boolean;
  style?: React.CSSProperties;
  [key: string]: any;
}) {
  if (!url) return null;

  // كشف SVGA (رسوم متحركة) — يُعرض عبر SvgaPlayer
  if (url.toLowerCase().endsWith(".svga")) {
    return <SvgaPlayer src={url} className={className} loops={loop ? 0 : 1} />;
  }

  // كشف Lottie JSON — يُعرض عبر LottiePlayer
  if (url.toLowerCase().endsWith(".json")) {
    return <LottiePlayer src={url} loop={loop} className={className} />;
  }

  // كشف الفيديو
  const isVideo = type === "video" || (type === "auto" && (/\.(mp4|webm|mov|mkv|gif)($|\?|#)/i.test(url) || url.includes("/video/upload/")));

  if (isVideo) {
    return (
      <video
        src={url}
        autoPlay
        loop={loop}
        muted
        playsInline
        className={className}
        style={style}
        {...props}
      />
    );
  }

  return <img src={url} alt="" className={className} style={style} {...props} />;
}
