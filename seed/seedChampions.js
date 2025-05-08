import { connectDB, getDB, closeDB } from '../db/mongo.js';
import { CHAMPIONS_COLLECTION } from '../config/constants.js';

const championsData = [
    // Category: Fighters
    { championId: "garen", championName: "Garen", primaryRole: "Fighter", secondaryRoles: ["Tank"], tags: ["Melee", "Tanky", "SpinToWin", "Demacia"] },
    { championId: "darius", championName: "Darius", primaryRole: "Fighter", secondaryRoles: ["Tank"], tags: ["Melee", "Bruiser", "Execute", "Noxus"] },
    { championId: "sett", championName: "Sett", primaryRole: "Fighter", secondaryRoles: [], tags: ["Melee", "Bruiser", "WomboCombo", "Ionia"] },
    { championId: "irelia", championName: "Irelia", primaryRole: "Fighter", secondaryRoles: ["Assassin"], tags: ["Melee", "Mobile", "Blades", "Ionia"] },
    { championId: "riven", championName: "Riven", primaryRole: "Fighter", secondaryRoles: ["Assassin"], tags: ["Melee", "Mobile", "Combos", "Noxus"] },

    // Category: Mages
    { championId: "ahri", championName: "Ahri", primaryRole: "Mage", secondaryRoles: ["Assassin"], tags: ["Ranged", "Mobile", "Charm", "Ionia"] },
    { championId: "lux", championName: "Lux", primaryRole: "Mage", secondaryRoles: ["Support"], tags: ["Ranged", "Burst", "Laser", "Demacia"] },
    { championId: "vex", championName: "Vex", primaryRole: "Mage", secondaryRoles: [], tags: ["Ranged", "Anti-Mobile", "Gloomy", "ShadowIsles"] },
    { championId: "orianna", championName: "Orianna", primaryRole: "Mage", secondaryRoles: [], tags: ["Ranged", "Control", "Ball", "Piltover"] },
    { championId: "syndra", championName: "Syndra", primaryRole: "Mage", secondaryRoles: [], tags: ["Ranged", "Burst", "Spheres", "Ionia"] },

    // Category: Marksmen (ADC)
    { championId: "jinx", championName: "Jinx", primaryRole: "Marksman", secondaryRoles: [], tags: ["Ranged", "Hypercarry", "Rockets", "Zaun"] },
    { championId: "caitlyn", championName: "Caitlyn", primaryRole: "Marksman", secondaryRoles: [], tags: ["Ranged", "LongRange", "Traps", "Piltover"] },
    { championId: "missfortune", championName: "Miss Fortune", primaryRole: "Marksman", secondaryRoles: [], tags: ["Ranged", "AOE", "Guns", "Bilgewater"] },
    { championId: "kaisa", championName: "Kai'Sa", primaryRole: "Marksman", secondaryRoles: ["Assassin"], tags: ["Ranged", "Mobile", "HybridDamage", "Void"] },
    { championId: "zeri", championName: "Zeri", primaryRole: "Marksman", secondaryRoles: [], tags: ["Ranged", "Mobile", "Spark", "Zaun"] },

    // Category: Assassins
    { championId: "zed", championName: "Zed", primaryRole: "Assassin", secondaryRoles: [], tags: ["Melee", "Mobile", "Shadows", "Ionia"] },
    { championId: "akali", championName: "Akali", primaryRole: "Assassin", secondaryRoles: ["Fighter"], tags: ["Melee", "Mobile", "Shroud", "Ionia"] },
    { championId: "katarina", championName: "Katarina", primaryRole: "Assassin", secondaryRoles: [], tags: ["Melee", "Mobile", "Resets", "Noxus"] },
    { championId: "qiyana", championName: "Qiyana", primaryRole: "Assassin", secondaryRoles: [], tags: ["Melee", "Mobile", "Elements", "Ixtal"] },
    { championId: "talon", championName: "Talon", primaryRole: "Assassin", secondaryRoles: [], tags: ["Melee", "Mobile", "Parkour", "Noxus"] },

    // Category: Tanks
    { championId: "ornn", championName: "Ornn", primaryRole: "Tank", secondaryRoles: ["Fighter"], tags: ["Melee", "CC", "Forge", "Freljord"] },
    { championId: "malphite", championName: "Malphite", primaryRole: "Tank", secondaryRoles: ["Fighter"], tags: ["Melee", "AOECC", "RockSolid", "Ixtal"] }, // Shurima/Ixtal
    { championId: "maokai", championName: "Maokai", primaryRole: "Tank", secondaryRoles: ["Support"], tags: ["Melee", "CC", "Saplings", "ShadowIsles"] },
    { championId: "sejuani", championName: "Sejuani", primaryRole: "Tank", secondaryRoles: ["Fighter"], tags: ["Melee", "CC", "Boar", "Freljord"] },
    { championId: "zac", championName: "Zac", primaryRole: "Tank", secondaryRoles: ["Fighter"], tags: ["Melee", "CC", "Blob", "Zaun"] },

    // Category: Supports
    { championId: "leona", championName: "Leona", primaryRole: "Support", secondaryRoles: ["Tank"], tags: ["Melee", "CC", "Sunlight", "Targon"] },
    { championId: "thresh", championName: "Thresh", primaryRole: "Support", secondaryRoles: ["Tank"], tags: ["Ranged", "CC", "Lantern", "ShadowIsles"] },
    { championId: "lulu", championName: "Lulu", primaryRole: "Support", secondaryRoles: ["Mage"], tags: ["Ranged", "Enchanter", "Polymorph", "BandleCity"] },
    { championId: "soraka", championName: "Soraka", primaryRole: "Support", secondaryRoles: [], tags: ["Ranged", "Healer", "Silence", "Targon"] },
    { championId: "janna", championName: "Janna", primaryRole: "Support", secondaryRoles: [], tags: ["Ranged", "Peel", "Tornado", "Zaun"] },

    // Adding more champions to reach ~50
    // Fighters
    { championId: "aatrox", championName: "Aatrox", primaryRole: "Fighter", secondaryRoles: [], tags: ["Melee", "DrainTank", "Darkin", "Runeterra"] },
    { championId: "camille", championName: "Camille", primaryRole: "Fighter", secondaryRoles: ["Assassin"], tags: ["Melee", "Mobile", "TrueDamage", "Piltover"] },
    { championId: "fiora", championName: "Fiora", primaryRole: "Fighter", secondaryRoles: [], tags: ["Melee", "Duelist", "Vitals", "Demacia"] },
    // Mages
    { championId: "annie", championName: "Annie", primaryRole: "Mage", secondaryRoles: [], tags: ["Ranged", "Burst", "Tibbers", "Noxus"] }, // Or Runeterra
    { championId: "viktor", championName: "Viktor", primaryRole: "Mage", secondaryRoles: [], tags: ["Ranged", "Control", "Evolution", "Zaun"] },
    // Marksmen
    { championId: "ashe", championName: "Ashe", primaryRole: "Marksman", secondaryRoles: [], tags: ["Ranged", "Utility", "Slow", "Freljord"] },
    { championId: "ezreal", championName: "Ezreal", primaryRole: "Marksman", secondaryRoles: ["Mage"], tags: ["Ranged", "Poke", "Mobile", "Piltover"] },
    // Assassins
    { championId: "khazix", championName: "Kha'Zix", primaryRole: "Assassin", secondaryRoles: ["Fighter"], tags: ["Melee", "Isolation", "Evolve", "Void"] },
    { championId: "ekko", championName: "Ekko", primaryRole: "Assassin", secondaryRoles: ["Mage"], tags: ["Melee", "Mobile", "Rewind", "Zaun"] },
    // Tanks
    { championId: "shen", championName: "Shen", primaryRole: "Tank", secondaryRoles: ["Fighter"], tags: ["Melee", "Global", "Taunt", "Ionia"] },
    { championId: "nautilus", championName: "Nautilus", primaryRole: "Tank", secondaryRoles: ["Support"], tags: ["Melee", "CC", "Anchor", "Bilgewater"] },
    // Supports
    { championId: "nami", championName: "Nami", primaryRole: "Support", secondaryRoles: ["Mage"], tags: ["Ranged", "Healer", "Bubble", "Marai"] }, // Bilgewater / Marai
    { championId: "blitzcrank", championName: "Blitzcrank", primaryRole: "Support", secondaryRoles: ["Tank"], tags: ["Melee", "Hook", "Robot", "Zaun"] },

    // Final few to reach 50 (approx)
    { championId: "yasuo", championName: "Yasuo", primaryRole: "Fighter", secondaryRoles: ["Assassin"], tags: ["Melee", "Mobile", "Windwall", "Ionia"] },
    { championId: "yone", championName: "Yone", primaryRole: "Fighter", secondaryRoles: ["Assassin"], tags: ["Melee", "Mobile", "Spirit", "Ionia"] },
    { championId: "masteryi", championName: "Master Yi", primaryRole: "Assassin", secondaryRoles: ["Fighter"], tags: ["Melee", "Hypercarry", "AlphaStrike", "Ionia"] },
    { championId: "tryndamere", championName: "Tryndamere", primaryRole: "Fighter", secondaryRoles: [], tags: ["Melee", "Crit", "UndyingRage", "Freljord"] },
    { championId: "lucian", championName: "Lucian", primaryRole: "Marksman", secondaryRoles: [], tags: ["Ranged", "Mobile", "Burst", "Demacia"] }, // Or Runeterra
    { championId: "karma", championName: "Karma", primaryRole: "Mage", secondaryRoles: ["Support"], tags: ["Ranged", "Utility", "Mantra", "Ionia"] },
    { championId: "zyra", championName: "Zyra", primaryRole: "Mage", secondaryRoles: ["Support"], tags: ["Ranged", "Control", "Plants", "Ixtal"] } // Or Kumungu
];

async function seedChampions() {
    let db;
    try {
        db = await connectDB();
        const championsCollection = db.collection(CHAMPIONS_COLLECTION);

        // await championsCollection.deleteMany({});
        //////console.log("Cleared existing champions.");

        // Check if champions already exist to prevent duplicates if not clearing
        const existingCount = await championsCollection.countDocuments();
        if (existingCount > 0) {
            console.log(`${existingCount} champions already exist in the database. Seeding skipped.`);
            return;
        }

        const result = await championsCollection.insertMany(championsData);
        console.log(`Successfully seeded ${result.insertedCount} champions.`);

    } catch (error) {
        console.error("Error seeding champions:", error);
    } finally {
        if (db) { 
            await closeDB();
        }
    }
}

// To run this seeder: node seed/seedChampions.js
// Make sure your package.json has "type": "module"
// And that db/mongo.js and config/constants.js are correctly referenced.
seedChampions();