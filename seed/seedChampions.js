// seed/seedChampions.js
import { connectDB, getDB, closeDB } from '../db/mongo.js'; // Adjust path if needed
import { CHAMPIONS_COLLECTION } from '../config/constants.js'; // Adjust path if needed

// Data Dragon champion keys are typically PascalCase (e.g., MissFortune, TwistedFate)
// Roles: Fighter, Mage, Marksman, Assassin, Tank, Support
// Some roles might be less defined, using common perceptions.
const championsData = [
  // A
  { championId: "Aatrox", championName: "Aatrox", primaryRole: "Fighter", secondaryRoles: ["Tank"], tags: ["Melee", "DrainTank", "Darkin"] },
  { championId: "Ahri", championName: "Ahri", primaryRole: "Mage", secondaryRoles: ["Assassin"], tags: ["Ranged", "Mobile", "Charm"] },
  { championId: "Akali", championName: "Akali", primaryRole: "Assassin", secondaryRoles: ["Fighter"], tags: ["Melee", "Mobile", "Stealth"] },
  { championId: "Akshan", championName: "Akshan", primaryRole: "Marksman", secondaryRoles: ["Assassin"], tags: ["Ranged", "Mobile", "Stealth", "Revive"] },
  { championId: "Alistar", championName: "Alistar", primaryRole: "Tank", secondaryRoles: ["Support"], tags: ["Melee", "CC", "Engage"] },
  { championId: "Amumu", championName: "Amumu", primaryRole: "Tank", secondaryRoles: ["Mage", "Jungle"], tags: ["Melee", "CC", "AOE"] },
  { championId: "Anivia", championName: "Anivia", primaryRole: "Mage", secondaryRoles: ["Support"], tags: ["Ranged", "Control", "AOE", "Revive"] },
  { championId: "Annie", championName: "Annie", primaryRole: "Mage", secondaryRoles: [], tags: ["Ranged", "Burst", "Stun"] },
  { championId: "Aphelios", championName: "Aphelios", primaryRole: "Marksman", secondaryRoles: [], tags: ["Ranged", "Versatile", "HighSkillCap"] },
  { championId: "Ashe", championName: "Ashe", primaryRole: "Marksman", secondaryRoles: ["Support"], tags: ["Ranged", "Utility", "Slow", "Stun"] },
  { championId: "AurelionSol", championName: "Aurelion Sol", primaryRole: "Mage", secondaryRoles: [], tags: ["Ranged", "AOE", "Scaling"] },
  { championId: "Azir", championName: "Azir", primaryRole: "Mage", secondaryRoles: ["Marksman"], tags: ["Ranged", "Control", "DPS", "Mobile"] },
  // B
  { championId: "Bard", championName: "Bard", primaryRole: "Support", secondaryRoles: ["Mage"], tags: ["Ranged", "Roam", "Utility", "Heal"] },
  { championId: "Belveth", championName: "Bel'Veth", primaryRole: "Fighter", secondaryRoles: ["Jungle"], tags: ["Melee", "Skirmisher", "Scaling", "Void"] },
  { championId: "Blitzcrank", championName: "Blitzcrank", primaryRole: "Tank", secondaryRoles: ["Support", "Fighter"], tags: ["Melee", "Hook", "CC"] },
  { championId: "Brand", championName: "Brand", primaryRole: "Mage", secondaryRoles: ["Support"], tags: ["Ranged", "AOE", "Burn"] },
  { championId: "Braum", championName: "Braum", primaryRole: "Support", secondaryRoles: ["Tank"], tags: ["Melee", "Peel", "CC", "Shield"] },
  // C
  { championId: "Caitlyn", championName: "Caitlyn", primaryRole: "Marksman", secondaryRoles: [], tags: ["Ranged", "LongRange", "Traps"] },
  { championId: "Camille", championName: "Camille", primaryRole: "Fighter", secondaryRoles: ["Tank", "Top"], tags: ["Melee", "Mobile", "TrueDamage", "Duelist"] },
  { championId: "Cassiopeia", championName: "Cassiopeia", primaryRole: "Mage", secondaryRoles: [], tags: ["Ranged", "DPS", "Poison", "Control"] },
  { championId: "Chogath", championName: "Cho'Gath", primaryRole: "Tank", secondaryRoles: ["Mage", "Top"], tags: ["Melee", "Scaling", "Silence", "TrueDamage", "Void"] },
  { championId: "Corki", championName: "Corki", primaryRole: "Marksman", secondaryRoles: ["Mage", "Mid"], tags: ["Ranged", "Poke", "MagicDamage"] },
  // D
  { championId: "Darius", championName: "Darius", primaryRole: "Fighter", secondaryRoles: ["Tank", "Top"], tags: ["Melee", "Bruiser", "Execute", "Bleed"] },
  { championId: "Diana", championName: "Diana", primaryRole: "Fighter", secondaryRoles: ["Mage", "Assassin", "Jungle"], tags: ["Melee", "Burst", "Engage"] },
  { championId: "Draven", championName: "Draven", primaryRole: "Marksman", secondaryRoles: [], tags: ["Ranged", "HighDamage", "Snowball"] },
  { championId: "DrMundo", championName: "Dr. Mundo", primaryRole: "Fighter", secondaryRoles: ["Tank", "Top", "Jungle"], tags: ["Melee", "Regeneration", "Tanky"] },
  // E
  { championId: "Ekko", championName: "Ekko", primaryRole: "Assassin", secondaryRoles: ["Mage", "Jungle", "Mid"], tags: ["Melee", "Mobile", "Burst", "Rewind"] },
  { championId: "Elise", championName: "Elise", primaryRole: "Mage", secondaryRoles: ["Assassin", "Jungle"], tags: ["Melee", "Ranged", "Burst", "Spider"] },
  { championId: "Evelynn", championName: "Evelynn", primaryRole: "Assassin", secondaryRoles: ["Mage", "Jungle"], tags: ["Melee", "Stealth", "Burst", "Charm"] },
  { championId: "Ezreal", championName: "Ezreal", primaryRole: "Marksman", secondaryRoles: ["Mage"], tags: ["Ranged", "Poke", "Mobile", "Skillshot"] },
  // F
  { championId: "Fiddlesticks", championName: "Fiddlesticks", primaryRole: "Mage", secondaryRoles: ["Support", "Jungle"], tags: ["Ranged", "Fear", "AOE", "Surprise"] },
  { championId: "Fiora", championName: "Fiora", primaryRole: "Fighter", secondaryRoles: ["Assassin", "Top"], tags: ["Melee", "Duelist", "TrueDamage", "Mobile"] },
  { championId: "Fizz", championName: "Fizz", primaryRole: "Assassin", secondaryRoles: ["Mage", "Mid"], tags: ["Melee", "Mobile", "Burst", "Untargetable"] },
  // G
  { championId: "Galio", championName: "Galio", primaryRole: "Tank", secondaryRoles: ["Mage", "Support", "Mid"], tags: ["Melee", "AOE", "CC", "MagicResist"] },
  { championId: "Gangplank", championName: "Gangplank", primaryRole: "Fighter", secondaryRoles: ["Top", "Mid"], tags: ["Melee", "Global", "Barrels", "Crit"] },
  { championId: "Garen", championName: "Garen", primaryRole: "Fighter", secondaryRoles: ["Tank", "Top"], tags: ["Melee", "Tanky", "SpinToWin", "Silence"] },
  { championId: "Gnar", championName: "Gnar", primaryRole: "Fighter", secondaryRoles: ["Tank", "Top"], tags: ["Ranged", "Melee", "Transform", "CC"] },
  { championId: "Gragas", championName: "Gragas", primaryRole: "Fighter", secondaryRoles: ["Mage", "Jungle", "Top"], tags: ["Melee", "AOE", "CC", "Displacement"] },
  { championId: "Graves", championName: "Graves", primaryRole: "Marksman", secondaryRoles: ["Fighter", "Jungle"], tags: ["Ranged", "Burst", "TankyADC"] },
  { championId: "Gwen", championName: "Gwen", primaryRole: "Fighter", secondaryRoles: ["Assassin", "Top"], tags: ["Melee", "TrueDamage", "Untargetable", "DPS"] },
  // H
  { championId: "Hecarim", championName: "Hecarim", primaryRole: "Fighter", secondaryRoles: ["Tank", "Jungle"], tags: ["Melee", "Engage", "Speed", "Fear"] },
  { championId: "Heimerdinger", championName: "Heimerdinger", primaryRole: "Mage", secondaryRoles: ["Support", "Top", "Mid"], tags: ["Ranged", "Turrets", "Control", "Stun"] },
  { championId: "Hwei", championName: "Hwei", primaryRole: "Mage", secondaryRoles: ["Mid", "Support"], tags: ["Ranged", "Versatile", "Artillery", "Control"] },
  // I
  { championId: "Illaoi", championName: "Illaoi", primaryRole: "Fighter", secondaryRoles: ["Tank", "Top"], tags: ["Melee", "Tentacles", "ZoneControl", "Tanky"] },
  { championId: "Irelia", championName: "Irelia", primaryRole: "Fighter", secondaryRoles: ["Assassin", "Top", "Mid"], tags: ["Melee", "Mobile", "Blades", "Stun", "Reset"] },
  { championId: "Ivern", championName: "Ivern", primaryRole: "Support", secondaryRoles: ["Mage", "Jungle"], tags: ["Ranged", "UniqueJungle", "Shield", "CC"] },
  // J
  { championId: "Janna", championName: "Janna", primaryRole: "Support", secondaryRoles: ["Mage"], tags: ["Ranged", "Peel", "Shield", "Disengage"] },
  { championId: "JarvanIV", championName: "Jarvan IV", primaryRole: "Tank", secondaryRoles: ["Fighter", "Jungle"], tags: ["Melee", "Engage", "CC", "Terrain"] },
  { championId: "Jax", championName: "Jax", primaryRole: "Fighter", secondaryRoles: ["Assassin", "Top", "Jungle"], tags: ["Melee", "Duelist", "Scaling", "Dodge"] },
  { championId: "Jayce", championName: "Jayce", primaryRole: "Fighter", secondaryRoles: ["Marksman", "Top", "Mid"], tags: ["Ranged", "Melee", "Poke", "Transform", "Burst"] },
  { championId: "Jhin", championName: "Jhin", primaryRole: "Marksman", secondaryRoles: ["Mage"], tags: ["Ranged", "Execute", "Slow", "Crit"] },
  { championId: "Jinx", championName: "Jinx", primaryRole: "Marksman", secondaryRoles: [], tags: ["Ranged", "Hypercarry", "AOE", "Reset"] },
  // K
  { championId: "Kaisa", championName: "Kai'Sa", primaryRole: "Marksman", secondaryRoles: ["Assassin"], tags: ["Ranged", "Mobile", "HybridDamage", "Evolve", "Void"] },
  { championId: "Kalista", championName: "Kalista", primaryRole: "Marksman", secondaryRoles: [], tags: ["Ranged", "Mobile", "Spears", "SoulBound"] },
  { championId: "Karma", championName: "Karma", primaryRole: "Mage", secondaryRoles: ["Support"], tags: ["Ranged", "Utility", "Shield", "Poke", "Mantra"] },
  { championId: "Karthus", championName: "Karthus", primaryRole: "Mage", secondaryRoles: ["Jungle"], tags: ["Ranged", "Global", "AOE", "DPS", "ReviveDamage"] },
  { championId: "Kassadin", championName: "Kassadin", primaryRole: "Assassin", secondaryRoles: ["Mage", "Mid"], tags: ["Melee", "Mobile", "AntiMage", "Scaling", "Void"] },
  { championId: "Katarina", championName: "Katarina", primaryRole: "Assassin", secondaryRoles: ["Mage", "Mid"], tags: ["Melee", "Mobile", "AOE", "Reset"] },
  { championId: "Kayle", championName: "Kayle", primaryRole: "Fighter", secondaryRoles: ["Support", "Mage", "Top"], tags: ["Melee", "Ranged", "Scaling", "Invulnerability", "HybridDamage"] },
  { championId: "Kayn", championName: "Kayn", primaryRole: "Fighter", secondaryRoles: ["Assassin", "Jungle"], tags: ["Melee", "Transform", "Mobile", "Darkin", "ShadowAssassin"] },
  { championId: "Kennen", championName: "Kennen", primaryRole: "Mage", secondaryRoles: ["Marksman", "Top"], tags: ["Ranged", "AOE", "Stun", "Energy"] },
  { championId: "Khazix", championName: "Kha'Zix", primaryRole: "Assassin", secondaryRoles: ["Fighter", "Jungle"], tags: ["Melee", "Isolation", "Evolve", "Stealth", "Void"] },
  { championId: "Kindred", championName: "Kindred", primaryRole: "Marksman", secondaryRoles: ["Jungle"], tags: ["Ranged", "Mobile", "Scaling", "Invulnerability", "Mark"] },
  { championId: "Kled", championName: "Kled", primaryRole: "Fighter", secondaryRoles: ["Tank", "Top"], tags: ["Melee", "Engage", "Skaarl", "GrievousWounds"] },
  { championId: "KogMaw", championName: "Kog'Maw", primaryRole: "Marksman", secondaryRoles: ["Mage"], tags: ["Ranged", "Hypercarry", "Poke", "TrueDamage", "Void"] },
  { championId: "Ksante", championName: "K'Sante", primaryRole: "Tank", secondaryRoles: ["Fighter", "Top"], tags: ["Melee", "Mobile", "CC", "Transform"] },
  // L
  { championId: "Leblanc", championName: "LeBlanc", primaryRole: "Assassin", secondaryRoles: ["Mage", "Mid"], tags: ["Ranged", "Mobile", "Burst", "Deception"] },
  { championId: "LeeSin", championName: "Lee Sin", primaryRole: "Fighter", secondaryRoles: ["Assassin", "Jungle"], tags: ["Melee", "Mobile", "HighSkillCap", "Kick"] },
  { championId: "Leona", championName: "Leona", primaryRole: "Tank", secondaryRoles: ["Support"], tags: ["Melee", "Engage", "CC", "Stun"] },
  { championId: "Lillia", championName: "Lillia", primaryRole: "Fighter", secondaryRoles: ["Mage", "Jungle"], tags: ["Ranged", "Mobile", "Sleep", "TrueDamage", "DPS"] },
  { championId: "Lissandra", championName: "Lissandra", primaryRole: "Mage", secondaryRoles: ["Mid"], tags: ["Ranged", "Control", "AOE", "CC", "SelfUlt"] },
  { championId: "Lucian", championName: "Lucian", primaryRole: "Marksman", secondaryRoles: [], tags: ["Ranged", "Mobile", "Burst"] },
  { championId: "Lulu", championName: "Lulu", primaryRole: "Support", secondaryRoles: ["Mage"], tags: ["Ranged", "Enchanter", "Polymorph", "Shield", "Buff"] },
  { championId: "Lux", championName: "Lux", primaryRole: "Mage", secondaryRoles: ["Support", "Mid"], tags: ["Ranged", "Burst", "Snare", "Shield", "Laser"] },
  // M
  { championId: "Malphite", championName: "Malphite", primaryRole: "Tank", secondaryRoles: ["Fighter", "Top", "Mid"], tags: ["Melee", "Engage", "AOE", "CC", "Armor"] },
  { championId: "Malzahar", championName: "Malzahar", primaryRole: "Mage", secondaryRoles: ["Mid"], tags: ["Ranged", "Control", "Suppression", "Voidlings", "Void"] },
  { championId: "Maokai", championName: "Maokai", primaryRole: "Tank", secondaryRoles: ["Support", "Jungle", "Top"], tags: ["Melee", "CC", "Saplings", "Engage"] },
  { championId: "MasterYi", championName: "Master Yi", primaryRole: "Assassin", secondaryRoles: ["Fighter", "Jungle"], tags: ["Melee", "Hypercarry", "TrueDamage", "Untargetable", "Reset"] },
  { championId: "Milio", championName: "Milio", primaryRole: "Support", secondaryRoles: ["Enchanter"], tags: ["Ranged", "Heal", "Cleanse", "Buff", "AOE"] },
  { championId: "MissFortune", championName: "Miss Fortune", primaryRole: "Marksman", secondaryRoles: [], tags: ["Ranged", "AOE", "Burst"] },
  { championId: "Mordekaiser", championName: "Mordekaiser", primaryRole: "Fighter", secondaryRoles: ["Mage", "Top"], tags: ["Melee", "Tanky", "RealmOfDeath", "APBruiser"] },
  { championId: "Morgana", championName: "Morgana", primaryRole: "Mage", secondaryRoles: ["Support"], tags: ["Ranged", "Snare", "SpellShield", "AOE"] },
  // N
  { championId: "Naafiri", championName: "Naafiri", primaryRole: "Assassin", secondaryRoles: ["Fighter", "Mid", "Jungle"], tags: ["Melee", "Mobile", "Pack", "Darkin"] },
  { championId: "Nami", championName: "Nami", primaryRole: "Support", secondaryRoles: ["Mage", "Enchanter"], tags: ["Ranged", "Heal", "Bubble", "CC", "Buff"] },
  { championId: "Nasus", championName: "Nasus", primaryRole: "Fighter", secondaryRoles: ["Tank", "Top"], tags: ["Melee", "Scaling", "SiphonStrike", "Wither"] },
  { championId: "Nautilus", championName: "Nautilus", primaryRole: "Tank", secondaryRoles: ["Support"], tags: ["Melee", "Hook", "CC", "Engage"] },
  { championId: "Neeko", championName: "Neeko", primaryRole: "Mage", secondaryRoles: ["Support", "Mid"], tags: ["Ranged", "Disguise", "Snare", "AOE"] },
  { championId: "Nidalee", championName: "Nidalee", primaryRole: "Assassin", secondaryRoles: ["Mage", "Jungle"], tags: ["Ranged", "Melee", "Poke", "Heal", "Transform", "Mobile"] },
  { championId: "Nilah", championName: "Nilah", primaryRole: "Fighter", secondaryRoles: ["Marksman"], tags: ["Melee", "AOE", "Dodge", "ShieldShare"] },
  { championId: "Nocturne", championName: "Nocturne", primaryRole: "Assassin", secondaryRoles: ["Fighter", "Jungle"], tags: ["Melee", "Darkness", "Fear", "Engage"] },
  { championId: "Nunu", championName: "Nunu & Willump", primaryRole: "Tank", secondaryRoles: ["Fighter", "Jungle"], tags: ["Melee", "CC", "Snowball", "ObjectiveControl"] }, // Nunu refers to Nunu & Willump
  // O
  { championId: "Olaf", championName: "Olaf", primaryRole: "Fighter", secondaryRoles: ["Tank", "Jungle", "Top"], tags: ["Melee", "Berserker", "TrueDamage", "Unstoppable"] },
  { championId: "Orianna", championName: "Orianna", primaryRole: "Mage", secondaryRoles: ["Mid"], tags: ["Ranged", "Control", "Ball", "AOE", "Shield"] },
  { championId: "Ornn", championName: "Ornn", primaryRole: "Tank", secondaryRoles: ["Fighter", "Top"], tags: ["Melee", "CC", "Forge", "Engage", "Brittle"] },
  // P
  { championId: "Pantheon", championName: "Pantheon", primaryRole: "Fighter", secondaryRoles: ["Assassin", "Support", "Mid", "Top"], tags: ["Melee", "Global", "Stun", "Block"] },
  { championId: "Poppy", championName: "Poppy", primaryRole: "Tank", secondaryRoles: ["Fighter", "Jungle", "Top"], tags: ["Melee", "CC", "AntiDash", "Displacement"] },
  { championId: "Pyke", championName: "Pyke", primaryRole: "Support", secondaryRoles: ["Assassin"], tags: ["Melee", "Execute", "Stealth", "Hook", "GoldShare"] },
  // Q
  { championId: "Qiyana", championName: "Qiyana", primaryRole: "Assassin", secondaryRoles: ["Fighter", "Mid", "Jungle"], tags: ["Melee", "Elements", "Stealth", "CC", "Burst"] },
  { championId: "Quinn", championName: "Quinn", primaryRole: "Marksman", secondaryRoles: ["Fighter", "Top"], tags: ["Ranged", "Mobile", "Roam", "Blind", "Valor"] },
  // R
  { championId: "Rakan", championName: "Rakan", primaryRole: "Support", secondaryRoles: ["Enchanter"], tags: ["Melee", "Engage", "Mobile", "Charm", "Shield"] },
  { championId: "Rammus", championName: "Rammus", primaryRole: "Tank", secondaryRoles: ["Fighter", "Jungle"], tags: ["Melee", "Taunt", "Speed", "Armor", "OK"] },
  { championId: "RekSai", championName: "Rek'Sai", primaryRole: "Fighter", secondaryRoles: ["Jungle"], tags: ["Melee", "Burrow", "TrueDamage", "KnockUp", "Void"] },
  { championId: "Rell", championName: "Rell", primaryRole: "Tank", secondaryRoles: ["Support"], tags: ["Melee", "Engage", "CC", "ArmorSteal", "Mount"] },
  { championId: "Renata", championName: "Renata Glasc", primaryRole: "Support", secondaryRoles: ["Enchanter", "Controller"], tags: ["Ranged", "Revive", "Berserk", "Shield"] }, // Renata refers to Renata Glasc
  { championId: "Renekton", championName: "Renekton", primaryRole: "Fighter", secondaryRoles: ["Tank", "Top"], tags: ["Melee", "Bruiser", "Stun", "Sustain", "Mobile"] },
  { championId: "Rengar", championName: "Rengar", primaryRole: "Assassin", secondaryRoles: ["Fighter", "Jungle"], tags: ["Melee", "Stealth", "Burst", "Empowered"] },
  { championId: "Riven", championName: "Riven", primaryRole: "Fighter", secondaryRoles: ["Assassin", "Top"], tags: ["Melee", "Mobile", "Combos", "Shield", "Stun"] },
  { championId: "Rumble", championName: "Rumble", primaryRole: "Fighter", secondaryRoles: ["Mage", "Top", "Mid"], tags: ["Melee", "Heat", "AOE", "Slow", "Equalizer"] },
  { championId: "Ryze", championName: "Ryze", primaryRole: "Mage", secondaryRoles: ["Fighter", "Top", "Mid"], tags: ["Ranged", "DPS", "Snare", "Teleport", "Scaling"] },
  // S
  { championId: "Samira", championName: "Samira", primaryRole: "Marksman", secondaryRoles: [], tags: ["Ranged", "Melee", "Style", "AOE", "Reset"] },
  { championId: "Sejuani", championName: "Sejuani", primaryRole: "Tank", secondaryRoles: ["Fighter", "Jungle"], tags: ["Melee", "CC", "Engage", "Stun", "Frost"] },
  { championId: "Senna", championName: "Senna", primaryRole: "Marksman", secondaryRoles: ["Support"], tags: ["Ranged", "Utility", "Heal", "Global", "Scaling", "Souls"] },
  { championId: "Seraphine", championName: "Seraphine", primaryRole: "Mage", secondaryRoles: ["Support", "Mid"], tags: ["Ranged", "AOE", "Charm", "Heal", "Shield", "Echo"] },
  { championId: "Sett", championName: "Sett", primaryRole: "Fighter", secondaryRoles: ["Tank", "Top", "Support"], tags: ["Melee", "Bruiser", "TrueDamage", "Shield", "Grit"] },
  { championId: "Shaco", championName: "Shaco", primaryRole: "Assassin", secondaryRoles: ["Jungle", "Support"], tags: ["Melee", "Stealth", "Boxes", "Fear", "Deception"] },
  { championId: "Shen", championName: "Shen", primaryRole: "Tank", secondaryRoles: ["Fighter", "Top", "Support"], tags: ["Melee", "Global", "Taunt", "Shield", "Energy"] },
  { championId: "Shyvana", championName: "Shyvana", primaryRole: "Fighter", secondaryRoles: ["Tank", "Jungle"], tags: ["Melee", "Dragon", "AOE", "Tanky", "HybridDamage"] },
  { championId: "Singed", championName: "Singed", primaryRole: "Tank", secondaryRoles: ["Fighter", "Top"], tags: ["Melee", "Poison", "Proxy", "Fling"] },
  { championId: "Sion", championName: "Sion", primaryRole: "Tank", secondaryRoles: ["Fighter", "Top"], tags: ["Melee", "CC", "Engage", "Revive", "ScalingHP"] },
  { championId: "Sivir", championName: "Sivir", primaryRole: "Marksman", secondaryRoles: [], tags: ["Ranged", "AOE", "SpellShield", "Utility"] },
  { championId: "Skarner", championName: "Skarner", primaryRole: "Fighter", secondaryRoles: ["Tank", "Jungle"], tags: ["Melee", "CC", "Suppression", "Crystal"] },
  { championId: "Smolder", championName: "Smolder", primaryRole: "Marksman", secondaryRoles: [], tags: ["Ranged", "Scaling", "AOE", "Dragon"] },
  { championId: "Sona", championName: "Sona", primaryRole: "Support", secondaryRoles: ["Mage", "Enchanter"], tags: ["Ranged", "Heal", "Buff", "AOE", "Stun"] },
  { championId: "Soraka", championName: "Soraka", primaryRole: "Support", secondaryRoles: ["Mage", "Enchanter"], tags: ["Ranged", "Heal", "Global", "Silence"] },
  { championId: "Swain", championName: "Swain", primaryRole: "Mage", secondaryRoles: ["Fighter", "Support", "Mid", "Top"], tags: ["Ranged", "DrainTank", "AOE", "CC", "Transform"] },
  { championId: "Sylas", championName: "Sylas", primaryRole: "Mage", secondaryRoles: ["Assassin", "Mid", "Jungle"], tags: ["Melee", "Hijack", "Burst", "Sustain", "Mobile"] },
  { championId: "Syndra", championName: "Syndra", primaryRole: "Mage", secondaryRoles: ["Mid"], tags: ["Ranged", "Burst", "Stun", "Spheres", "Control"] },
  // T
  { championId: "TahmKench", championName: "Tahm Kench", primaryRole: "Support", secondaryRoles: ["Tank", "Top"], tags: ["Melee", "Devour", "Tanky", "Peel"] },
  { championId: "Taliyah", championName: "Taliyah", primaryRole: "Mage", secondaryRoles: ["Jungle", "Mid"], tags: ["Ranged", "Control", "Roam", "Terrain", "AOE"] },
  { championId: "Talon", championName: "Talon", primaryRole: "Assassin", secondaryRoles: ["Mid", "Jungle"], tags: ["Melee", "Parkour", "Burst", "Stealth", "Roam"] },
  { championId: "Taric", championName: "Taric", primaryRole: "Support", secondaryRoles: ["Tank"], tags: ["Melee", "Heal", "Stun", "Invulnerability", "Shield"] },
  { championId: "Teemo", championName: "Teemo", primaryRole: "Marksman", secondaryRoles: ["Assassin", "Mage", "Top"], tags: ["Ranged", "Mushrooms", "Blind", "Poison", "Stealth"] },
  { championId: "Thresh", championName: "Thresh", primaryRole: "Support", secondaryRoles: ["Tank"], tags: ["Ranged", "Hook", "CC", "Lantern", "Souls", "Playmaker"] },
  { championId: "Tristana", championName: "Tristana", primaryRole: "Marksman", secondaryRoles: [], tags: ["Ranged", "Hypercarry", "Reset", "Mobile", "Siege"] },
  { championId: "Trundle", championName: "Trundle", primaryRole: "Fighter", secondaryRoles: ["Tank", "Jungle", "Top"], tags: ["Melee", "Pillar", "StatSteal", "AntiTank"] },
  { championId: "Tryndamere", championName: "Tryndamere", primaryRole: "Fighter", secondaryRoles: ["Assassin", "Top"], tags: ["Melee", "Crit", "UndyingRage", "Splitpush", "Scaling"] },
  { championId: "TwistedFate", championName: "Twisted Fate", primaryRole: "Mage", secondaryRoles: ["Mid"], tags: ["Ranged", "Global", "Stun", "Poke", "Cards"] },
  { championId: "Twitch", championName: "Twitch", primaryRole: "Marksman", secondaryRoles: ["Assassin"], tags: ["Ranged", "Stealth", "TrueDamage", "Poison", "Hypercarry"] },
  // U
  { championId: "Udyr", championName: "Udyr", primaryRole: "Fighter", secondaryRoles: ["Tank", "Jungle"], tags: ["Melee", "Stances", "Tanky", "DPS", "CC"] },
  { championId: "Urgot", championName: "Urgot", primaryRole: "Fighter", secondaryRoles: ["Tank", "Top"], tags: ["Ranged", "Tanky", "Execute", "Fear", "Bruiser"] },
  // V
  { championId: "Varus", championName: "Varus", primaryRole: "Marksman", secondaryRoles: ["Mage"], tags: ["Ranged", "Poke", "CC", "Blight", "Artillery"] },
  { championId: "Vayne", championName: "Vayne", primaryRole: "Marksman", secondaryRoles: [], tags: ["Ranged", "TrueDamage", "Mobile", "Stealth", "AntiTank", "Hypercarry"] },
  { championId: "Veigar", championName: "Veigar", primaryRole: "Mage", secondaryRoles: ["Mid"], tags: ["Ranged", "ScalingAP", "Burst", "Stun", "Cage"] },
  { championId: "Velkoz", championName: "Vel'Koz", primaryRole: "Mage", secondaryRoles: ["Support", "Mid"], tags: ["Ranged", "Poke", "TrueDamage", "Laser", "Void"] },
  { championId: "Vex", championName: "Vex", primaryRole: "Mage", secondaryRoles: ["Mid"], tags: ["Ranged", "AntiMobile", "Fear", "Burst", "Gloomy"] },
  { championId: "Vi", championName: "Vi", primaryRole: "Fighter", secondaryRoles: ["Assassin", "Jungle"], tags: ["Melee", "Engage", "CC", "ArmorShred", "Punch"] },
  { championId: "Viego", championName: "Viego", primaryRole: "Fighter", secondaryRoles: ["Assassin", "Jungle"], tags: ["Melee", "Possession", "Reset", "Stealth", "Sustain"] },
  { championId: "Viktor", championName: "Viktor", primaryRole: "Mage", secondaryRoles: ["Mid"], tags: ["Ranged", "Control", "AOE", "Scaling", "Evolve", "Laser"] },
  { championId: "Vladimir", championName: "Vladimir", primaryRole: "Mage", secondaryRoles: ["Fighter", "Top", "Mid"], tags: ["Ranged", "Sustain", "AOE", "Untargetable", "DrainTank"] },
  { championId: "Volibear", championName: "Volibear", primaryRole: "Fighter", secondaryRoles: ["Tank", "Jungle", "Top"], tags: ["Melee", "Engage", "Stun", "TowerDisable", "Lightning"] },
  // W
  { championId: "Warwick", championName: "Warwick", primaryRole: "Fighter", secondaryRoles: ["Tank", "Jungle"], tags: ["Melee", "Sustain", "Fear", "Suppression", "Chase"] },
  // X
  { championId: "Xayah", championName: "Xayah", primaryRole: "Marksman", secondaryRoles: [], tags: ["Ranged", "AOE", "Feathers", "Untargetable", "CC"] },
  { championId: "Xerath", championName: "Xerath", primaryRole: "Mage", secondaryRoles: ["Support", "Mid"], tags: ["Ranged", "Artillery", "Poke", "Stun", "Siege"] },
  { championId: "XinZhao", championName: "Xin Zhao", primaryRole: "Fighter", secondaryRoles: ["Assassin", "Jungle"], tags: ["Melee", "Engage", "CC", "Challenge", "KnockUp"] },
  // Y
  { championId: "Yasuo", championName: "Yasuo", primaryRole: "Fighter", secondaryRoles: ["Assassin", "Mid", "Top"], tags: ["Melee", "Crit", "Mobile", "Windwall", "KnockUpSynergy"] },
  { championId: "Yone", championName: "Yone", primaryRole: "Assassin", secondaryRoles: ["Fighter", "Mid", "Top"], tags: ["Melee", "Mobile", "MixedDamage", "Spirit", "CC"] },
  { championId: "Yorick", championName: "Yorick", primaryRole: "Fighter", secondaryRoles: ["Tank", "Top"], tags: ["Melee", "Splitpush", "Ghouls", "Maiden", "Cage"] },
  { championId: "Yuumi", championName: "Yuumi", primaryRole: "Support", secondaryRoles: ["Mage", "Enchanter"], tags: ["Ranged", "Attach", "Heal", "Buff", "Untargetable"] },
  // Z
  { championId: "Zac", championName: "Zac", primaryRole: "Tank", secondaryRoles: ["Fighter", "Jungle"], tags: ["Melee", "Engage", "CC", "Blob", "Revive"] },
  { championId: "Zed", championName: "Zed", primaryRole: "Assassin", secondaryRoles: ["Mid"], tags: ["Melee", "Mobile", "Shadows", "Burst", "Execute", "Energy"] },
  { championId: "Zeri", championName: "Zeri", primaryRole: "Marksman", secondaryRoles: [], tags: ["Ranged", "Mobile", "Spark", "DPS", "ShieldSteal"] },
  { championId: "Ziggs", championName: "Ziggs", primaryRole: "Mage", secondaryRoles: ["Mid", "Marksman"], tags: ["Ranged", "Poke", "AOE", "Siege", "Satchel"] },
  { championId: "Zilean", championName: "Zilean", primaryRole: "Support", secondaryRoles: ["Mage"], tags: ["Ranged", "Utility", "Revive", "Stun", "SpeedUp", "Slow"] },
  { championId: "Zoe", championName: "Zoe", primaryRole: "Mage", secondaryRoles: ["Assassin", "Mid"], tags: ["Ranged", "Burst", "Sleep", "Portal", "SpellThief"] },
  { championId: "Zyra", championName: "Zyra", primaryRole: "Mage", secondaryRoles: ["Support"], tags: ["Ranged", "Control", "Plants", "Snare", "AOE", "KnockUp"] },
];


async function seedChampions() {
    let db;
    try {
        db = await connectDB();
        const championsCollection = db.collection(CHAMPIONS_COLLECTION);

        const count = await championsCollection.countDocuments();
        if (count >= championsData.length) { // Check if already seeded or has more
            console.log(`${count} champions already in DB. Seeding skipped/verified.`);
            return;
        }
        
        // If partially seeded or empty, clear and re-seed for consistency
        if (count > 0 && count < championsData.length) {
            console.log(`Partial data found (${count} champions). Clearing and re-seeding...`);
            await championsCollection.deleteMany({});
        } else if (count === 0) {
            console.log("No champions found. Seeding new data...");
        }

        // Prepare data with potential default empty arrays for consistency if needed
        const preparedChampionsData = championsData.map(champ => ({
            ...champ,
            secondaryRoles: champ.secondaryRoles || [],
            tags: champ.tags || []
        }));
        
        const result = await championsCollection.insertMany(preparedChampionsData);
        console.log(`Successfully seeded ${result.insertedCount} champions.`);

    } catch (error) {
        console.error("Error seeding champions:", error);
    } finally {
        if (db) { 
            await closeDB();
        }
    }
}
seedChampions();