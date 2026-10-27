// [ezo-ui] Unified icon renderer — shows uploaded image if present,
// otherwise falls back to lucide icon.
//
// Uploaded images render LARGER than lucide icons by default
// (imgSize defaults to size * 1.6) because real images need breathing room.

import { useAssets } from "../lib/assets";


function isVideoUrl(url: string): boolean {
  if (!url) return false;
  // Cloudinary video resource type
  if (url.includes("/video/upload/")) return true;
  // امتدادات فيديو شائعة
  const lower = url.split("?")[0].toLowerCase();
  return /\.(mp4|webm|mov|m4v|ogv)$/.test(lower);
}

interface Props {
  assetKey: string;
  Icon: any;
  size?: number;
  imgSize?: number;
  className?: string;
  imgClassName?: string;
  fill?: string;
  strokeWidth?: number;
  /** When true, image fills 100% of its parent (parent must have size) */
  fillParent?: boolean;
}

export default function IconOrImage({
  assetKey,
  Icon,
  size = 26,
  imgSize,
  className = "",
  imgClassName = "",
  fill,
  strokeWidth,
  fillParent = false,
}: Props) {
  const assets = useAssets();
  const src = assets[assetKey];
  if (src) {
    const isVideo = isVideoUrl(src);
    const s = imgSize ?? Math.round(size * 1.6);

    // Common attrs for video (autoplay + muted + loop for icon-style)
    const videoAttrs = {
      autoPlay: true,
      muted: true,
      loop: true,
      playsInline: true,
      preload: "metadata" as const,
    };

    if (fillParent) {
      if (isVideo) {
        return (
          <video
            src={src}
            {...videoAttrs}
            className={`w-full h-full object-contain ${imgClassName}`}
          />
        );
      }
      return (
        <img
          src={src}
          alt=""
          draggable={false}
          className={`w-full h-full object-contain ${imgClassName}`}
        />
      );
    }

    if (isVideo) {
      return (
        <video
          src={src}
          {...videoAttrs}
          style={{ width: s, height: s }}
          className={`object-contain ${imgClassName}`}
        />
      );
    }

    return (
      <img
        src={src}
        alt=""
        draggable={false}
        style={{ width: s, height: s }}
        className={`object-contain ${imgClassName}`}
      />
    );
  }
  return <Icon size={size} className={className} fill={fill} strokeWidth={strokeWidth} />;
}
