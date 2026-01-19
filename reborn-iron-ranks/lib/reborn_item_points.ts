// lib/reborn_item_points.ts

export type ItemDef = {
  id: string;            // stable key (slug)
  name: string;          // display name
  points: number | null; // null = required item (hard gate, no points)
  group?: string;        // section/category for UI grouping
  notes?: string;        // "*", "**", "***", "†" etc
};

export type Requirement =
  | { type: "allOf"; itemIds: string[]; label?: string }
  | { type: "anyOf"; itemIds: string[]; label?: string };

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/\*\*\*|\*\*|\*/g, "")
    .replace(/[†]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function item(name: string, points: number | null, group: string, notes?: string): ItemDef {
  return { id: slugify(name), name, points, group, notes };
}

export const REQUIRED_REQUIREMENTS: Requirement[] = [
  {
    type: "allOf",
    label: "Required Items",
    itemIds: [
      slugify("Elite Void Top"),
      slugify("Elite Void Robe"),
      slugify("Void Knight Gloves"),
      slugify("Void Melee Helm"),
      slugify("Void Mage Helm"),
      slugify("Void Ranger Helm"),
      slugify("Abyssal Tentacle"),
      slugify("Barrows Gloves"),
      slugify("Fighter Torso"),
      slugify("Dragon Defender"),
      slugify("Salve (ei)"),
      slugify("Fire cape"),
      slugify("Warped sceptre"),
      slugify("Dragon Sword"),
      slugify("Ava's Assembler"),
      slugify("Rune Crossbow"),
      slugify("Helm of Neitiznot"),
      slugify("Berserker Ring (i)"),
    ],
  },
  {
    // "Dragon Warhammer or BGS"
    type: "anyOf",
    label: "Dragon Warhammer or BGS",
    itemIds: [slugify("Dragon Warhammer"), slugify("Bandos Godsword")],
  },
];

export const ITEMS: ItemDef[] = [
  // Required Items (hard gates, no points)
  item("Elite Void Top", null, "Required Items"),
  item("Elite Void Robe", null, "Required Items"),
  item("Void Knight Gloves", null, "Required Items"),
  item("Void Melee Helm", null, "Required Items", "***"),
  item("Void Mage Helm", null, "Required Items", "***"),
  item("Void Ranger Helm", null, "Required Items"),
  item("Abyssal Tentacle", null, "Required Items"),
  item("Barrows Gloves", null, "Required Items"),
  item("Fighter Torso", null, "Required Items"),
  item("Dragon Defender", null, "Required Items"),
  item("Salve (ei)", null, "Required Items"),
  item("Fire cape", null, "Required Items"),
  item("Warped sceptre", null, "Required Items"),
  item("Dragon Sword", null, "Required Items"),
  item("Ava's Assembler", null, "Required Items"),
  item("Rune Crossbow", null, "Required Items"),
  item("Helm of Neitiznot", null, "Required Items"),
  item("Berserker Ring (i)", null, "Required Items"),
  // For the OR requirement, we still include both items here so they can be checked manually
  item("Dragon Warhammer", null, "Required Items"),
  item("Bandos Godsword", null, "Required Items"),

  // God Wars Dungeon
  item("Armadyl Godsword", 16, "God Wars Dungeon"),
  item("Armadyl Helmet", 12, "God Wars Dungeon"),
  item("Armadyl Chestplate", 12, "God Wars Dungeon"),
  item("Armadyl Chainskirt", 12, "God Wars Dungeon"),
  item("Saradomin Godsword", 15, "God Wars Dungeon"),
  item("Armadyl Crossbow", 15, "God Wars Dungeon"),
  item("Bandos Chestplate", 13, "God Wars Dungeon"),
  item("Bandos Tassets", 13, "God Wars Dungeon"),
  item("Bandos Boots", 13, "God Wars Dungeon", "*"),
  item("Zamorak Godsword", 17, "God Wars Dungeon"),
  item("Staff of the Dead", 17, "God Wars Dungeon", "*"),
  item("Zamorakian Spear", 5, "God Wars Dungeon"),
  item("Ancient Godsword", 72, "God Wars Dungeon"),
  item("Zaryte Crossbow", 65, "God Wars Dungeon"),
  item("Torva Full helm", 65, "God Wars Dungeon"),
  item("Torva Platebody", 65, "God Wars Dungeon"),
  item("Torva Platelegs", 65, "God Wars Dungeon"),
  item("Zaryte Vambraces", 43, "God Wars Dungeon"),

  // Yama
  item("Soulflame horn", 15, "Yama"),
  item("Oathplate helm", 30, "Yama", "†"),
  item("Oathplate chest", 30, "Yama", "†"),
  item("Oathplate legs", 30, "Yama", "†"),

  // Doom of Mokhaiotl
  item("Avernic treads", 37, "Doom of Mokhaiotl"),
  item("Eye of ayak", 34, "Doom of Mokhaiotl"),
  item("Confliction gauntlets", 23, "Doom of Mokhaiotl"),

  // Zulrah
  item("Trident of the Swamp", 11, "Zulrah"),
  item("Serpentine Helm", 11, "Zulrah"),
  item("Toxic Blowpipe", 11, "Zulrah"),

  // Chambers of Xeric
  item("Twisted Bow", 100, "Chambers of Xeric"),
  item("Kodai Wand", 100, "Chambers of Xeric"),
  item("Elder Maul", 100, "Chambers of Xeric"),
  item("Ancestral Hat", 65, "Chambers of Xeric"),
  item("Ancestral Robe Top", 65, "Chambers of Xeric"),
  item("Ancestral Robe Bottom", 65, "Chambers of Xeric"),
  item("Dragon Claws", 65, "Chambers of Xeric"),
  item("Dinh's Bulwark", 55, "Chambers of Xeric"),
  item("Dragon Hunter Crossbow", 50, "Chambers of Xeric"),
  item("Twisted Buckler", 50, "Chambers of Xeric"),
  item("Dexterous Prayer Scroll", 10, "Chambers of Xeric"),
  item("Arcane Prayer Scroll", 10, "Chambers of Xeric"),

  // Theatre of Blood
  item("Scythe of Vitur", 89, "Theatre of Blood"),
  item("Ghrazi Rapier", 44, "Theatre of Blood"),
  item("Sanguinesti Staff", 44, "Theatre of Blood"),
  item("Justiciar Faceguard", 35, "Theatre of Blood"),
  item("Justiciar Chestguard", 35, "Theatre of Blood"),
  item("Justiciar Legguards", 35, "Theatre of Blood"),
  item("Avernic Defender", 12, "Theatre of Blood"),

  // Tombs of Amascut
  item("Tumeken's Shadow", 70, "Tombs of Amascut"),
  item("Masori Mask (f)", 34, "Tombs of Amascut"),
  item("Masori Body (f)", 34, "Tombs of Amascut"),
  item("Masori Chaps (f)", 34, "Tombs of Amascut"),
  item("Elidinis' Ward", 19, "Tombs of Amascut", "**"),
  item("Osmumten's Fang", 8, "Tombs of Amascut"),
  item("Lightbearer", 8, "Tombs of Amascut"),

  // Gauntlet
  item("Bow of Faerdhinen", 56, "Gauntlet"),
  item("Blade of Saeldor", 48, "Gauntlet"),
  item("Crystal Helm", 7, "Gauntlet"),
  item("Crystal Body", 21, "Gauntlet"),
  item("Crystal Legs", 14, "Gauntlet"),

  // The Nightmare
  item("Eldritch nightmare staff", 111, "The Nightmare"),
  item("Harmonised nightmare staff", 130, "The Nightmare"),
  item("Volatile nightmare staff", 111, "The Nightmare"),
  item("Inquisitor's Mace", 87, "The Nightmare"),
  item("Inquisitor's great helm", 43, "The Nightmare")
,
  item("Inquisitor's Hauberk", 43, "The Nightmare"),
  item("Inquisitor's Plateskirt", 43, "The Nightmare"),
  item("Nightmare Staff", 25, "The Nightmare"),

  // Corporeal Beast
  item("Elysian Spirit Shield", 199, "Corporeal Beast"),
  item("Arcane Spirit Shield", 69, "Corporeal Beast", "**"),
  item("Spectral Spirit Shield", 69, "Corporeal Beast"),

  // Misc
  item("Dragonfire Shield", 43, "Misc"),
  item("Ancient Wyvern Shield", 43, "Misc"),
  item("Dragonfire Ward", 43, "Misc"),
  item("Imbued Heart", 65, "Misc"),
  item("Saturated Heart", 8, "Misc"),
  item("Infernal Cape", 25, "Misc"),
  item("Neitiznot Faceguard", 14, "Misc"),
  item("Ring of Suffering", 18, "Misc"),
  item("Amulet of Torture", 15, "Misc"),
  item("Necklace of Anguish", 18, "Misc"),
  item("Tormented Bracelet", 18, "Misc"),
  item("Occult Necklace", 4, "Misc"),
  item("Primordial Boots", 9, "Misc"),
  item("Pegasian Boots", 9, "Misc"),
  item("Eternal Boots", 9, "Misc"),
  item("Guardian Boots", 15, "Misc"),
  item("Ferocious Gloves", 18, "Misc"),
  item("Dragon Pickaxe", 9, "Misc"),
  item("Trident of the Seas", 8, "Misc"),
  item("Abyssal Bludgeon", 15, "Misc"),
  item("Dragon Hunter Lance", 35, "Misc"),
  item("Swift Blade", 18, "Misc"),
  item("Ham Joint", 23, "Misc"),
  item("Ancient Sceptre", 2, "Misc"),
  item("Venator Bow", 20, "Misc"),
  item("Dizana's quiver", 25, "Misc"),
  item("Burning claws", 25, "Misc"),
  item("Emberlight", 12, "Misc"),
  item("Purging staff", 12, "Misc"),
  item("Scorching bow", 12, "Misc"),
  item("Amulet of rancour", 16, "Misc"),
  item("Noxious halberd", 14, "Misc"),
  item("Aranea boots", 6, "Misc"),
  item("Tonalztics of ralos", 19, "Misc"),

  // Wilderness Drops
  item("Treasonous ring", 13, "Wilderness Drops", "*"),
  item("Tyrannical ring", 17, "Wilderness Drops", "*"),
  item("Ring of the gods", 19, "Wilderness Drops", "*"),
  item("Amulet of avarice", 27, "Wilderness Drops"),
  item("Voidwaker", 50, "Wilderness Drops"),
  item("Craw's bow", 40, "Wilderness Drops"),
  item("Webweaver bow", 6, "Wilderness Drops"),
  item("Thammaron's sceptre", 40, "Wilderness Drops"),
  item("Accursed sceptre", 9, "Wilderness Drops"),
  item("Viggora's chainmace", 40, "Wilderness Drops"),
  item("Ursine chainmace", 7, "Wilderness Drops"),

  // Desert Treasure Drops
  item("Ultor ring", 27, "Desert Treasure Drops"),
  item("Bellator ring", 18, "Desert Treasure Drops"),
  item("Venator ring", 22, "Desert Treasure Drops"),
  item("Magus ring", 23, "Desert Treasure Drops"),
  item("Virtus mask", 20, "Desert Treasure Drops"),
  item("Virtus robe top", 20, "Desert Treasure Drops"),
  item("Virtus robe bottom", 20, "Desert Treasure Drops"),
  item("Soulreaper axe", 59, "Desert Treasure Drops"),
];

export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(
  ITEMS.map((it) => [it.id, it])
);
