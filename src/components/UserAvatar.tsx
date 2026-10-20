import { getOptimizedImageUrl } from "../lib/imageUtils";
import AssetVideo from "./ui/AssetVideo";
// [moorawi] Unified user avatar — Single Source of Truth
// Uses /avatar.png (admin-managed default) when user has no image.

interface Props {
  avatarUrl?: string | null;
  name?: string | null;
  size?: number | string;
  className?: string;
  rounded?: string;
  alt?: string;
}

export default function UserAvatar({
  avatarUrl,
  name,
  size,
  className = "",
  rounded = "rounded-full",
  alt,
}: Props) {
  const src = avatarUrl || "/avatar.png";
  const style = size ? { width: size, height: size } : undefined;
  
  // إذا كان الرابط فيديو، لا نستخدم getOptimizedImageUrl لأنه سيخربه
  const isVideo = /\.(mp4|webm|mov|mkv|gif)($|\?|#)/i.test(src) || src.includes("/video/upload/");
  const finalSrc = isVideo ? src : getOptimizedImageUrl(src, 120, 120);

  return (
    <AssetVideo
      url={finalSrc}
      type={isVideo ? "video" : "image"}
      className={`object-cover ${rounded} ${className}`}
      style={style}
      draggable={false}
    />
  );
}
