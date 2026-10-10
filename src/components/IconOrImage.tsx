// [moorawi-ui] Unified icon renderer — shows uploaded image if present,
// otherwise falls back to lucide icon.
//
// Uploaded images render LARGER than lucide icons by default
// (imgSize defaults to size * 1.6) because real images need breathing room.

import { useAssets } from "../lib/assets";

interface Props {
  assetKey: string;
  Icon: any;
  size?: number;
  imgSize?: number;
  className?: string;
  imgClassName?: string;
  fill?: string;
  strokeWidth?: number;
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
}: Props) {
  const assets = useAssets();
  const src = assets[assetKey];
  if (src) {
    const s = imgSize ?? Math.round(size * 1.6);
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
