import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export default function LottiePlayer({
  src,
  loop = true,
  className = "",
}: {
  src: string;
  loop?: boolean;
  className?: string;
}) {
  return (
    <DotLottieReact
      src={src}
      loop={loop}
      autoplay
      className={className}
    />
  );
}
