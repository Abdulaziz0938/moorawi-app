import { getOptimizedImageUrl } from "../lib/imageUtils";
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
  return (
    <img
      src={getOptimizedImageUrl(src, 120, 120)}
      alt={alt ?? name ?? ""}
      className={`object-cover ${rounded} ${className}`}
      style={style}
      draggable={false}
    />
  );
}
