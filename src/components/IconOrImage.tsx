// [moorawi-ui] Unified icon renderer — shows uploaded image if present,
// otherwise falls back to lucide icon. Keys map to AssetsPanel UI slots.

import { useAssets } from "../lib/assets";

interface Props {
  assetKey: string;
  Icon: any;
  size?: number;
  className?: string;
  imgClassName?: string;
  fill?: string;
  strokeWidth?: number;
}

export default function IconOrImage({
  assetKey,
  Icon,
  size = 26,
  className = "",
  imgClassName = "",
  fill,
  strokeWidth,
}: Props) {
  const assets = useAssets();
  const src = assets[assetKey];
  if (src) {
    return (
      <img
        src={src}
        alt=""
        draggable={false}
        style={{ width: size, height: size }}
        className={`object-contain ${imgClassName}`}
      />
    );
  }
  return <Icon size={size} className={className} fill={fill} strokeWidth={strokeWidth} />;
}
