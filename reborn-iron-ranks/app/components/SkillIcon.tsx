import IconImg from "@/app/components/IconImg";

export default function SkillIcon({
  skillId,
  label,
  size = 22,
}: {
  skillId: string;
  label: string;
  size?: number;
}) {
  return (
    <IconImg
      src={`/skills/${skillId}.png`}
      fallbackSrc="/skills/placeholder.png"
      alt={label}
      title={label}
      size={size}
    />
  );
}
