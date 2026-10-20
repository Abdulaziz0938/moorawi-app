// [ezo-medals] Horizontal medals row — يستخدم MedalBadge الموحد
import MedalBadge from "./ui/MedalBadge";

interface Medal {
  _id: string;
  name: string;
  imageUrl?: string;
  tier: string;
  value?: number;
}

interface Props {
  medals: Medal[];
  max?: number;
  size?: "xs" | "sm" | "md";
}

export default function MedalsRow({ medals, max = 12, size = "sm" }: Props) {
  if (!medals || medals.length === 0) return null;
  const shown = medals.slice(0, max);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {shown.map((m) => (
        <MedalBadge
          key={m._id}
          name={m.name}
          tier={m.tier}
          imageUrl={m.imageUrl}
          size={size}
        />
      ))}
    </div>
  );
}
