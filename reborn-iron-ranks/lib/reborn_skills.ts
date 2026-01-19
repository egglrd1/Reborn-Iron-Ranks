export type SkillId =
  | "attack"
  | "strength"
  | "defence"
  | "ranged"
  | "prayer"
  | "magic"
  | "runecraft"
  | "construction"
  | "hitpoints"
  | "agility"
  | "herblore"
  | "thieving"
  | "crafting"
  | "fletching"
  | "slayer"
  | "hunter"
  | "mining"
  | "smithing"
  | "fishing"
  | "cooking"
  | "firemaking"
  | "woodcutting"
  | "farming";

export const SKILLS: { id: SkillId; label: string }[] = [
  { id: "attack", label: "Attack" },
  { id: "strength", label: "Strength" },
  { id: "defence", label: "Defence" },
  { id: "ranged", label: "Ranged" },
  { id: "prayer", label: "Prayer" },
  { id: "magic", label: "Magic" },
  { id: "runecraft", label: "Runecraft" },
  { id: "construction", label: "Construction" },
  { id: "hitpoints", label: "Hitpoints" },
  { id: "agility", label: "Agility" },
  { id: "herblore", label: "Herblore" },
  { id: "thieving", label: "Thieving" },
  { id: "crafting", label: "Crafting" },
  { id: "fletching", label: "Fletching" },
  { id: "slayer", label: "Slayer" },
  { id: "hunter", label: "Hunter" },
  { id: "mining", label: "Mining" },
  { id: "smithing", label: "Smithing" },
  { id: "fishing", label: "Fishing" },
  { id: "cooking", label: "Cooking" },
  { id: "firemaking", label: "Firemaking" },
  { id: "woodcutting", label: "Woodcutting" },
  { id: "farming", label: "Farming" },
];
