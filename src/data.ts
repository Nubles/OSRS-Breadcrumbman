import { GraphEdge, GraphNode, NodeKind, ProgressTier, RuleMode } from "./types";

type NodeInput = Omit<GraphNode, "links"> & { links?: string[] };

export const RULE_MODES: Record<RuleMode, { label: string; revealCount: number; rescueEvery: number; description: string }> = {
  cozy: {
    label: "Cozy Scholar",
    revealCount: 6,
    rescueEvery: 3,
    description: "More branches, frequent rescue tokens, and gentle dead-end protection."
  },
  standard: {
    label: "Standard Breadcrumbman",
    revealCount: 4,
    rescueEvery: 5,
    description: "Balanced expansion with meaningful choices and occasional rescue tokens."
  },
  strict: {
    label: "Strict Archivist",
    revealCount: 3,
    rescueEvery: 7,
    description: "Fewer reveals, tighter planning, and penalties for illegal progress."
  },
  brutal: {
    label: "Brutal Manuscript",
    revealCount: 2,
    rescueEvery: 10,
    description: "Sparse reveals, rare rescues, and harsh dead ends for challenge runs."
  }
};

export const TIER_NAMES: Record<ProgressTier, string> = {
  0: "Seedling",
  1: "Footpath",
  2: "Trail",
  3: "Road",
  4: "Crossing",
  5: "Kingdom Web",
  6: "World Spine"
};

export const KIND_LABELS: Record<NodeKind, string> = {
  seed: "Seed",
  region: "Region",
  quest: "Quest",
  item: "Item",
  monster: "Monster",
  shop: "Shop",
  skill: "Skill",
  transport: "Transport",
  guild: "Guild",
  minigame: "Minigame",
  boss: "Boss",
  diary: "Diary",
  clue: "Clue",
  raid: "Raid",
  milestone: "Milestone"
};

const baseNodes: NodeInput[] = [
  n("lumbridge", "Lumbridge", "seed", 0, "Misthalin", "The default safe seed: tutors, goblins, shops, shrimp, Cook's Assistant, and the first account errands.", ["Complete one Lumbridge errand", "Kill or inspect a local low-level monster", "Use only local shops and resources"], ["Misthalin footpath", "Beginner quests", "Starter combat and gathering"], ["cooks-assistant", "goblin", "shrimp", "lumbridge-shop", "bronze-dagger", "misthalin"], ["starter", "safe"], 50, 46),
  n("bronze-dagger", "Bronze dagger", "item", 0, "Misthalin", "A tiny item seed that grows into smithing, shops, goblins, combat, and early weapon routes.", ["Obtain or buy a bronze dagger legally", "Use it for one legal combat action"], ["Bronze weapons", "Goblin branch", "Smithing thread"], ["goblin", "lumbridge-shop", "smithing", "bronze-weapons"], ["starter", "gear"], 38, 60),
  n("goblin", "Goblin", "monster", 0, "Misthalin", "A classic low-level monster that links into combat, beginner loot, clues, and village quests.", ["Kill 10 goblins", "Record one legal drop", "Bank or use only legal drops"], ["Goblin loot", "Beginner clue chance", "Goblin quest links"], ["bronze-dagger", "beginner-clue", "goblin-diplomacy", "combat-basics"], ["starter", "monster"], 60, 62),
  n("cooks-assistant", "Cook's Assistant", "quest", 0, "Misthalin", "A starter quest that links cooking, cows, chickens, wheat, milk, eggs, and Lumbridge Castle.", ["Complete the quest", "Gather every ingredient from legal nodes"], ["Cooking footpath", "Lumbridge Castle branch", "Quest point route"], ["cooking", "cow", "chicken", "wheat", "lumbridge-castle", "quest-points"], ["starter", "quest"], 66, 40),
  n("shrimp", "Shrimp", "item", 0, "Misthalin", "A simple food seed that opens fishing, cooking, river routes, and early sustain.", ["Catch or cook shrimp legally", "Use it as food in a legal task"], ["Fishing basics", "Cooking basics", "River route"], ["fishing", "cooking", "draynor", "river-lum"], ["starter", "food"], 46, 34),
  n("lumbridge-shop", "Lumbridge General Store", "shop", 1, "Misthalin", "The first legal shop branch for basic supplies, trade rules, and merchant routes.", ["Buy one useful item", "Sell one legal item", "Record what shops may provide"], ["General stores", "Shop legality", "Varrock merchant route"], ["varrock", "bronze-weapons", "coins", "merchant-route"], ["shop"], 74, 55),
  n("misthalin", "Misthalin", "region", 1, "Misthalin", "The first regional branch: Lumbridge, Varrock, Draynor, Edgeville, and basic travel.", ["Complete two Misthalin nodes", "Declare the legal towns", "Choose one expansion border"], ["Misthalin region play", "Varrock and Draynor routes"], ["varrock", "draynor", "edgeville", "misthalin-diary"], ["region"], 56, 26),
  n("cow", "Cow", "monster", 1, "Misthalin", "Cows connect food, leather, crafting, combat training, and early money routes.", ["Kill 15 cows", "Use or tan one hide", "Cook or bank one beef"], ["Leather crafting", "Combat basics", "Food chain"], ["crafting", "combat-basics", "al-kharid", "leather"], ["monster", "resource"], 73, 31),
  n("chicken", "Chicken", "monster", 1, "Misthalin", "Chickens create feathers, eggs, cooking, ranged ammo, and beginner skilling links.", ["Kill 15 chickens", "Collect feathers and eggs", "Use one product legally"], ["Feathers", "Ranged basics", "Cooking links"], ["ranged", "fishing", "cooks-assistant", "feathers"], ["monster", "resource"], 82, 42),
  n("wheat", "Wheat field", "item", 1, "Misthalin", "Wheat opens cooking, flour, windmills, and early production routes.", ["Mill flour", "Use flour in a legal recipe"], ["Cooking production", "Windmill route"], ["cooking", "draynor", "quest-points"], ["resource"], 58, 20),
  n("cooking", "Cooking", "skill", 1, "Misthalin", "A basic skill branch that turns gathered food into legal sustain.", ["Cook three legal foods", "Burning is allowed but logged"], ["Cooked food", "Food sustain", "Recipe quests"], ["shrimp", "cooks-assistant", "fishing", "recipe-disaster"], ["skill"], 38, 24),
  n("fishing", "Fishing", "skill", 1, "Misthalin", "Fishing links rivers, food, feathers, Tempoross, guilds, and travel-heavy clue routes.", ["Catch a legal fish", "Cook or bank the catch"], ["Food routes", "Fishing Guild path", "Tempoross path"], ["shrimp", "tempoross", "fishing-guild", "karamja"], ["skill"], 30, 36),
  n("combat-basics", "Combat basics", "skill", 1, "Misthalin", "Unlocks controlled combat training through legal monsters and weapons.", ["Train one combat stat on legal monsters", "Log the weapon used"], ["Basic combat", "Slayer introduction", "Boss prep"], ["goblin", "cow", "slayer", "hill-giant"], ["skill", "combat"], 68, 72),
  n("crafting", "Crafting", "skill", 1, "Misthalin", "Crafting grows from leather, clay, gems, jewelry, and utility unlocks.", ["Craft one legal item", "Record its source chain"], ["Leather gear", "Jewelry route", "Guild path"], ["leather", "crafting-guild", "sapphire-ring", "al-kharid"], ["skill"], 88, 27),
  n("ranged", "Ranged", "skill", 1, "Misthalin", "Ranged begins with arrows, feathers, bows, shops, and safe-spot routes.", ["Use a legal ranged weapon", "Source ammunition legally"], ["Ranged combat", "Fletching path", "Safe-spot bosses"], ["chicken", "fletching", "combat-basics", "archery-shop"], ["skill", "combat"], 89, 57),
  n("varrock", "Varrock", "region", 2, "Misthalin", "Varrock opens shops, Grand Exchange variants, museum, quests, guards, and diary tasks.", ["Reach Varrock by a legal route", "Use one legal shop or quest start"], ["Varrock city", "Museum", "Diary path"], ["varrock-museum", "varrock-diary", "grand-exchange", "earth-warriors", "demon-slayer"], ["region", "city"], 51, 14),
  n("draynor", "Draynor Village", "region", 2, "Misthalin", "Draynor links fishing, willows, vampires, the manor, and early clue steps.", ["Reach Draynor legally", "Complete one local task"], ["Draynor route", "Vampire Slayer", "Willow skilling"], ["vampire-slayer", "woodcutting", "draynor-manor", "easy-clue"], ["region", "village"], 27, 48),
  n("edgeville", "Edgeville", "region", 2, "Misthalin", "Edgeville connects wilderness borders, monastery prayer, Slayer masters, and transport routes.", ["Reach Edgeville legally", "Declare wilderness border rules"], ["Edgeville route", "Prayer Guild", "Wilderness edge"], ["prayer", "wilderness", "slayer", "monastery"], ["region"], 43, 7),
  n("al-kharid", "Al Kharid", "region", 2, "Kharidian Desert", "Al Kharid opens tanning, desert border play, warriors, gems, and early quests.", ["Pay or route through the gate legally", "Use the tanner or palace branch"], ["Desert border", "Tanning", "Scorpion route"], ["crafting", "desert", "warrior", "gem-shop"], ["region"], 78, 18),
  n("karamja", "Karamja", "region", 2, "Karamja", "Karamja links fishing, bananas, Brimhaven, volcano monsters, and travel permits.", ["Sail to Karamja legally", "Complete one local gather or combat task"], ["Karamja route", "Brimhaven", "Volcano branch"], ["brimhaven", "lesser-demon", "tai-bwo", "karamja-diary", "fishing"], ["region", "island"], 18, 70),
  n("quest-points", "Quest Points", "milestone", 2, "Global", "Quest points are a meta breadcrumb that unlocks guilds, questlines, and account rank.", ["Earn 5 quest points", "Choose one questline branch"], ["Questline expansion", "Champions' Guild route"], ["champions-guild", "dragon-slayer", "recipe-disaster", "demon-slayer"], ["milestone", "quest"], 64, 6),
  n("beginner-clue", "Beginner clues", "clue", 2, "Global", "Clues create mystery branches across shops, towns, items, emotes, and odd requirements.", ["Complete one beginner clue", "Log every required legal step"], ["Clue network", "Reward web", "Easy clue route"], ["easy-clue", "varrock", "draynor", "clue-gear"], ["clue"], 70, 82),
  n("easy-clue", "Easy clues", "clue", 3, "Global", "Easy clues widen the map without forcing hard combat.", ["Complete one easy clue", "Add one clue reward or location branch"], ["Medium clue path", "STASH routes", "Reward web"], ["medium-clue", "falador", "ardougne", "clue-gear"], ["clue"], 76, 88),
  n("medium-clue", "Medium clues", "clue", 3, "Global", "Medium clues start requiring stronger travel, quests, and equipment planning.", ["Complete one medium clue", "Record the blocker that mattered most"], ["Hard clues", "Ranger boot dream", "Transport pressure"], ["hard-clue", "fairy-rings", "teleports", "ranged"], ["clue"], 84, 84),
  n("hard-clue", "Hard clues", "clue", 4, "Global", "Hard clues link to wilderness, quests, teleports, and broader gear checks.", ["Complete one hard clue", "Use only legal teleports and stash items"], ["Elite clue path", "Wilderness branches", "High travel"], ["elite-clue", "wilderness", "barrows", "teleports"], ["clue"], 91, 77),
  n("elite-clue", "Elite clues", "clue", 5, "Global", "Elite clues become a late-game atlas pressure system.", ["Complete one elite clue", "Log every illegal blocker as future target"], ["Master clues", "Endgame clue routes"], ["master-clue", "prifddinas", "zeah", "endgame-atlas"], ["clue"], 94, 65),
  n("master-clue", "Master clues", "clue", 6, "Global", "Master clues demand a mature web of quests, emotes, skills, transport, and bosses.", ["Complete one master clue", "Archive the route as a capstone chain"], ["Completion routes", "Endgame archive"], ["completion-cape", "inferno", "raids"], ["clue", "endgame"], 88, 53),
  n("fairy-rings", "Fairy rings", "transport", 3, "Global", "A massive transport keystone that turns scattered breadcrumbs into a network.", ["Complete the required quest access", "Walk one route before first ring use", "Log the first legal code"], ["Global transport web", "Fremennik and Zanaris links"], ["lost-city", "fremennik", "zanaris", "transport-hub"], ["transport", "keystone"], 34, 58),
  n("teleports", "Teleport spells", "transport", 3, "Global", "Teleports connect Magic, runes, quests, tablets, POH, and clue routing.", ["Unlock one teleport spell or tablet legally", "Record rune source"], ["Magic transport", "Clue speed", "POH route"], ["magic", "poh", "medium-clue", "transport-hub"], ["transport", "magic"], 30, 65),
  n("transport-hub", "Transport hub", "milestone", 4, "Global", "A milestone for accounts with several legal movement systems.", ["Legalize three transport methods", "Create a route rule"], ["Route planning", "World web acceleration"], ["spirit-trees", "poh", "ardougne", "endgame-atlas"], ["milestone", "transport"], 42, 76),
  n("slayer", "Slayer", "skill", 3, "Global", "Slayer creates repeatable contracts, monster unlocks, bosses, masters, and gear sources.", ["Complete one legal Slayer task", "Record the master and task"], ["Slayer contracts", "Task bosses", "Monster web"], ["mazchna", "vannaka", "slayer-helm", "slayer-bosses"], ["skill", "combat"], 58, 80),
  n("mazchna", "Mazchna", "milestone", 3, "Morytania", "Early Slayer master linking Canifis, Priest in Peril, and basic task monsters.", ["Complete one Mazchna task legally"], ["Canifis route", "Morytania branch"], ["morytania", "priest-in-peril", "slayer"], ["slayer"], 48, 84),
  n("vannaka", "Vannaka", "milestone", 3, "Misthalin", "Mid early Slayer master that links Edgeville Dungeon, combat stats, and task chains.", ["Complete one Vannaka task legally"], ["Dungeon tasks", "Combat branch"], ["edgeville", "hill-giant", "slayer"], ["slayer"], 64, 88),
  n("slayer-helm", "Slayer helmet", "item", 4, "Global", "A meaningful Slayer item that depends on points, gear sources, and task rhythm.", ["Unlock or assemble the helmet legally", "Use it only on legal tasks"], ["Slayer gear", "Boss task prep"], ["slayer-bosses", "combat-achievements", "slayer"], ["item", "slayer"], 71, 72),
  n("slayer-bosses", "Slayer bosses", "boss", 5, "Global", "Task-gated bosses like Kraken, Cerberus, Hydra, Sire, Araxxor, and Thermy.", ["Unlock one Slayer boss through legal tasks", "Record task requirement"], ["High Slayer bosses", "Endgame gear"], ["kraken", "cerberus", "hydra", "araxxor", "combat-achievements"], ["boss", "slayer"], 80, 68),
  n("kraken", "Kraken", "boss", 5, "Kandarin", "A Slayer boss branch for trident, magic upgrades, and task-based PvM.", ["Kill Kraken legally on task"], ["Magic gear", "Boss archive"], ["slayer-bosses", "magic", "bossing"], ["boss"], 78, 56),
  n("cerberus", "Cerberus", "boss", 5, "Taverley", "A high-Slayer boss for crystals, boots, prayer pressure, and late combat.", ["Kill Cerberus legally on task"], ["Boot crystals", "Prayer pressure"], ["slayer-bosses", "prayer", "bossing"], ["boss"], 84, 58),
  n("hydra", "Alchemical Hydra", "boss", 6, "Kebos", "A late Slayer boss tying Karuulm, Konar, high Slayer, and endgame ranged/magic gear.", ["Kill Hydra legally on task"], ["Hydra uniques", "Kebos endgame"], ["slayer-bosses", "zeah", "konar", "endgame-atlas"], ["boss", "endgame"], 90, 58),
  n("araxxor", "Araxxor", "boss", 6, "Morytania", "A high-Slayer branch linking Morytania, task rules, and endgame poison/spider routes.", ["Kill Araxxor legally on task"], ["Araxyte web", "Endgame Slayer"], ["slayer-bosses", "morytania", "endgame-atlas"], ["boss", "endgame"], 89, 47),
  n("magic", "Magic", "skill", 3, "Global", "Magic links teleports, spellbooks, rune sourcing, combat styles, and clue routes.", ["Cast one legal utility spell", "Source runes legally"], ["Teleport spells", "Spellbooks", "Mage bosses"], ["teleports", "ancient-magicks", "lunar-spellbook", "god-spells"], ["skill", "magic"], 24, 56),
  n("prayer", "Prayer", "skill", 3, "Global", "Prayer gates protection prayers, chapel routes, Morytania, and boss readiness.", ["Unlock or use one legal prayer tier", "Record bone or ash source"], ["Protection prayers", "Piety path", "Boss sustain"], ["monastery", "piety", "morytania", "barrows"], ["skill"], 38, 13),
  n("woodcutting", "Woodcutting", "skill", 2, "Global", "Woodcutting links Draynor, fletching, canoes, Wintertodt prep, and guild access.", ["Cut one legal log tier", "Use or bank the logs"], ["Logs", "Fletching", "Woodcutting Guild"], ["fletching", "woodcutting-guild", "canoe", "wintertodt"], ["skill"], 19, 35),
  n("fletching", "Fletching", "skill", 2, "Global", "Fletching turns logs and feathers into ranged routes and money-making.", ["Fletch one legal item", "Use legal inputs"], ["Bows", "Arrows", "Ranged support"], ["woodcutting", "ranged", "chicken", "yew-longbow"], ["skill"], 14, 48),
  n("smithing", "Smithing", "skill", 2, "Global", "Smithing links ores, bars, bronze weapons, Blast Furnace, and Foundry.", ["Smith one legal bar or item", "Record ore source"], ["Metal gear", "Foundry", "Blast Furnace"], ["bronze-weapons", "mining-guild", "giants-foundry", "blast-furnace"], ["skill"], 85, 11),
  n("bronze-weapons", "Bronze weapons", "item", 2, "Global", "Early weapon tier that anchors combat, smithing, shops, and gear legality.", ["Obtain three bronze weapon types legally"], ["Gear tier route", "Smithing route"], ["smithing", "combat-basics", "lumbridge-shop", "warriors-guild"], ["item", "gear"], 92, 39),
  n("champions-guild", "Champions' Guild", "guild", 3, "Misthalin", "Quest-point milestone and the door to Dragon Slayer.", ["Enter the guild legally", "Record quest point total"], ["Dragon Slayer route", "Guild branch"], ["quest-points", "dragon-slayer", "combat-basics"], ["guild"], 70, 2),
  n("dragon-slayer", "Dragon Slayer I", "quest", 3, "Global", "A classic account keystone linking QP, anti-dragon gear, Crandor, rune platebody, and dragons.", ["Complete Dragon Slayer I", "Record every prerequisite branch"], ["Dragon access", "Rune platebody", "Crandor"], ["dragons", "rune-gear", "champions-guild", "karamja"], ["quest", "keystone"], 80, 5),
  n("dragons", "Dragons", "monster", 4, "Global", "Dragon monsters bridge anti-dragon gear, prayer, combat, and high-value drops.", ["Kill one legal dragon", "Record shield or protection method"], ["Dragon bones", "Dragon gear", "Vorkath path"], ["dragon-slayer", "prayer", "vorkath", "rune-gear"], ["monster"], 90, 10),
  n("rune-gear", "Rune gear", "item", 4, "Global", "Rune gear is a visible account-power milestone linking quests, shops, smithing, and combat.", ["Equip one rune item legally", "Record exact source"], ["Rune tier", "Warriors' Guild path", "Boss prep"], ["dragon-slayer", "smithing", "warriors-guild", "bossing"], ["item", "gear"], 94, 24),
  n("falador", "Falador", "region", 3, "Asgarnia", "Falador opens mining, crafting, white knights, mole, diaries, and guild routes.", ["Reach Falador legally", "Complete one local branch"], ["Asgarnia route", "Guilds", "Giant Mole"], ["crafting-guild", "mining-guild", "falador-diary", "giant-mole"], ["region"], 16, 20),
  n("crafting-guild", "Crafting Guild", "guild", 3, "Asgarnia", "Crafting milestone linking leather, pottery, gold, jewelry, and Falador.", ["Enter or qualify for the guild", "Craft one legal guild item"], ["Guild crafting", "Jewelry route"], ["crafting", "falador", "sapphire-ring"], ["guild"], 7, 30),
  n("mining-guild", "Mining Guild", "guild", 3, "Asgarnia", "Mining Guild opens ores, coal, smithing, and mining progression.", ["Enter or qualify for the guild", "Mine one legal ore"], ["Ore economy", "Smithing support"], ["smithing", "falador", "blast-furnace"], ["guild"], 8, 17),
  n("giant-mole", "Giant Mole", "boss", 4, "Asgarnia", "A practical early boss branch from Falador, combat basics, and diary utility.", ["Kill Giant Mole legally", "Record light source and escape plan"], ["Bossing", "Falador diary value"], ["falador", "bossing", "combat-achievements"], ["boss"], 9, 8),
  n("morytania", "Morytania", "region", 3, "Morytania", "Morytania links Priest in Peril, Canifis, Barrows, Slayer, Mort'ton, and late quests.", ["Enter Morytania legally", "Complete one local task"], ["Morytania web", "Barrows path", "Vampyre route"], ["priest-in-peril", "barrows", "canifis", "morytania-diary", "sotf"], ["region"], 49, 92),
  n("priest-in-peril", "Priest in Peril", "quest", 3, "Morytania", "The gate quest for Morytania and many dark-region breadcrumbs.", ["Complete Priest in Peril legally"], ["Morytania access", "Canifis"], ["morytania", "barrows", "mazchna"], ["quest"], 40, 92),
  n("barrows", "Barrows", "boss", 4, "Morytania", "Barrows connects prayer, Morytania, runes, medium combat, and powerful gear.", ["Complete one Barrows chest legally", "Record supplies and route"], ["Barrows gear", "Morytania combat"], ["morytania", "prayer", "bossing", "hard-clue"], ["boss", "gear"], 57, 94),
  n("sotf", "Sins of the Father", "quest", 5, "Morytania", "A major Morytania questline for Darkmeyer, Sepulchre, and vampyre endgame.", ["Complete Sins of the Father legally"], ["Darkmeyer", "Hallowed Sepulchre"], ["hallowed-sepulchre", "morytania", "elite-diary"], ["quest"], 63, 90),
  n("hallowed-sepulchre", "Hallowed Sepulchre", "minigame", 5, "Morytania", "A high-skill agility minigame linked to Sins of the Father and late account routing.", ["Complete one legal Sepulchre floor bracket"], ["Agility rewards", "Darkmeyer branch"], ["sotf", "agility", "endgame-atlas"], ["minigame"], 70, 86),
  n("ardougne", "Ardougne", "region", 3, "Kandarin", "Ardougne links thieving, cloaks, fairy tale routes, Kandarin, and westward expansion.", ["Reach Ardougne legally", "Complete one city task"], ["Ardougne cloak", "Kandarin expansion"], ["ardougne-diary", "plague-city", "thieving", "kandarin"], ["region", "city"], 23, 82),
  n("plague-city", "Plague City", "quest", 3, "Kandarin", "A westward questline starter leading toward elf content.", ["Complete Plague City legally"], ["Elf questline start", "Ardougne routes"], ["underground-pass", "ardougne", "kandarin"], ["quest"], 15, 87),
  n("underground-pass", "Underground Pass", "quest", 4, "Kandarin", "A major quest bridge toward Regicide, Tirannwn, Zulrah, and Prifddinas.", ["Complete Underground Pass legally"], ["Elf chain", "Tirannwn route"], ["regicide", "plague-city", "tirannwn"], ["quest"], 10, 76),
  n("regicide", "Regicide", "quest", 4, "Tirannwn", "Opens Tirannwn and Zulrah routes.", ["Complete Regicide legally"], ["Zulrah", "Tirannwn"], ["zulrah", "tirannwn", "underground-pass"], ["quest"], 5, 66),
  n("zulrah", "Zulrah", "boss", 5, "Tirannwn", "A major boss branch for unique gear, scales, and late-game money pressure.", ["Kill Zulrah legally", "Record route and supplies"], ["Zulrah uniques", "Tirannwn bossing"], ["regicide", "bossing", "elite-clue"], ["boss"], 5, 55),
  n("prifddinas", "Prifddinas", "region", 6, "Tirannwn", "A massive late-game city unlocked through the elf grandmaster chain.", ["Unlock Prifddinas legally", "Complete one city activity"], ["Crystal city", "Gauntlet", "Zalcano"], ["song-of-elves", "gauntlet", "zalcano", "endgame-atlas"], ["region", "endgame"], 6, 43),
  n("song-of-elves", "Song of the Elves", "quest", 6, "Tirannwn", "Grandmaster elf capstone opening Prifddinas.", ["Complete Song of the Elves legally"], ["Prifddinas", "Gauntlet", "Zalcano"], ["prifddinas", "gauntlet", "zalcano", "completion-cape"], ["quest", "grandmaster"], 11, 36),
  n("gauntlet", "The Gauntlet", "boss", 6, "Tirannwn", "A self-contained endgame combat branch from Prifddinas.", ["Complete one Gauntlet run legally"], ["Crystal armour path", "Endgame combat"], ["prifddinas", "corrupted-gauntlet", "combat-achievements"], ["boss", "endgame"], 18, 34),
  n("corrupted-gauntlet", "Corrupted Gauntlet", "boss", 6, "Tirannwn", "A high-skill endgame capstone branch.", ["Complete one Corrupted Gauntlet run legally"], ["Enhanced seed chase", "Endgame proof"], ["gauntlet", "endgame-atlas", "combat-achievements"], ["boss", "endgame"], 22, 25),
  n("zeah", "Great Kourend", "region", 4, "Kourend", "Kourend and Kebos open houses, catacombs, farming, Wintertodt, raids, and modern OSRS branches.", ["Reach Kourend legally", "Choose one house or activity branch"], ["Kourend web", "Kebos", "Raids path"], ["wintertodt", "catacombs", "kebos", "chambers", "konar"], ["region"], 57, 15),
  n("wintertodt", "Wintertodt", "minigame", 3, "Kourend", "A practical early skilling boss/minigame linking Firemaking, supplies, crates, and Kourend.", ["Complete one legal Wintertodt kill", "Record crate legality"], ["Firemaking route", "Supply crates"], ["zeah", "firemaking", "collection-log"], ["minigame"], 44, 20),
  n("catacombs", "Catacombs of Kourend", "region", 4, "Kourend", "A monster-dense dungeon linking Slayer, ancient shards, totems, Skotizo, and prayer restore.", ["Kill one legal catacomb monster", "Record shard/totem rule"], ["Catacomb monsters", "Skotizo"], ["skotizo", "slayer", "zeah"], ["region", "dungeon"], 61, 24),
  n("skotizo", "Skotizo", "boss", 4, "Kourend", "A totem-summoned boss linking Catacombs and clue progression.", ["Kill Skotizo legally", "Record totem source"], ["Clue boost", "Demon bossing"], ["catacombs", "hard-clue", "combat-achievements"], ["boss"], 68, 28),
  n("kebos", "Kebos Lowlands", "region", 4, "Kebos", "Kebos opens Farming Guild, Konar, Hydra, Mount Karuulm, and resource routes.", ["Reach Kebos legally", "Complete one Kebos task"], ["Kebos route", "Farming and Slayer"], ["farming-guild", "konar", "hydra", "zeah"], ["region"], 72, 17),
  n("farming-guild", "Farming Guild", "guild", 4, "Kebos", "Farming Guild links contracts, patches, Hespori, and high skilling progression.", ["Enter or qualify for a Farming Guild tier", "Complete one contract"], ["Farming contracts", "Hespori"], ["hespori", "kebos", "farming"], ["guild"], 78, 8),
  n("hespori", "Hespori", "boss", 4, "Kebos", "A farming boss branch from contracts, seeds, and skilling progress.", ["Kill Hespori legally", "Record seed source"], ["Farming boss", "Bucket route"], ["farming-guild", "combat-achievements"], ["boss"], 86, 8),
  n("konar", "Konar", "milestone", 4, "Kebos", "A location-locked Slayer master that naturally fits Breadcrumbman routing.", ["Complete one Konar task legally"], ["Brimstone keys", "Hydra path"], ["kebos", "hydra", "slayer"], ["slayer"], 80, 24),
  n("chambers", "Chambers of Xeric", "raid", 6, "Kourend", "A raid branch from Kourend, prayers, gear prep, and team/endgame rules.", ["Complete one Chambers raid legally", "Record team and gear legality"], ["Raid rewards", "Rigour/Augury"], ["zeah", "rigour", "augury", "raids", "combat-achievements"], ["raid", "endgame"], 58, 3),
  n("desert", "Kharidian Desert", "region", 4, "Desert", "Desert progression links quests, pyramid content, ancients, Tempoross, and raids.", ["Enter deeper desert legally", "Complete one desert branch"], ["Ancients", "ToA", "Desert quests"], ["desert-treasure", "tempoross", "toa", "pyramid-plunder"], ["region"], 91, 16),
  n("desert-treasure", "Desert Treasure I", "quest", 4, "Desert", "Unlocks Ancient Magicks and a major magic/combat route.", ["Complete Desert Treasure I legally"], ["Ancient Magicks", "Desert questline"], ["ancient-magicks", "desert", "dt2"], ["quest"], 96, 32),
  n("ancient-magicks", "Ancient Magicks", "transport", 4, "Desert", "A spellbook branch for teleports, combat, barraging, and late quests.", ["Use Ancient Magicks legally once", "Record spell and rune source"], ["Ancient spellbook", "Magic combat"], ["desert-treasure", "magic", "dt2"], ["magic", "spellbook"], 95, 44),
  n("dt2", "Desert Treasure II", "quest", 6, "Global", "Grandmaster questline for four endgame bosses and major lore routes.", ["Complete Desert Treasure II legally"], ["DT2 bosses", "Endgame magic/combat"], ["vardorvis", "leviathan", "whisperer", "duke", "completion-cape"], ["quest", "grandmaster"], 80, 36),
  n("vardorvis", "Vardorvis", "boss", 6, "Varlamore", "DT2 endgame boss branch.", ["Kill Vardorvis legally"], ["Endgame bossing"], ["dt2", "endgame-atlas", "combat-achievements"], ["boss", "endgame"], 76, 30),
  n("leviathan", "The Leviathan", "boss", 6, "Desert", "DT2 endgame boss branch.", ["Kill The Leviathan legally"], ["Endgame bossing"], ["dt2", "endgame-atlas", "combat-achievements"], ["boss", "endgame"], 84, 32),
  n("whisperer", "The Whisperer", "boss", 6, "Morytania", "DT2 endgame boss branch.", ["Kill The Whisperer legally"], ["Endgame bossing"], ["dt2", "endgame-atlas", "combat-achievements"], ["boss", "endgame"], 82, 42),
  n("duke", "Duke Sucellus", "boss", 6, "Fremennik", "DT2 endgame boss branch.", ["Kill Duke Sucellus legally"], ["Endgame bossing"], ["dt2", "endgame-atlas", "combat-achievements"], ["boss", "endgame"], 72, 39),
  n("toa", "Tombs of Amascut", "raid", 6, "Desert", "A raid branch from desert questing, gear, prayer, and route planning.", ["Complete one ToA raid legally", "Record invocation and gear rule"], ["Masori/Fang route", "Raid archive"], ["desert", "beneath-cursed-sands", "raids", "combat-achievements"], ["raid", "endgame"], 96, 22),
  n("fremennik", "Fremennik Province", "region", 4, "Fremennik", "Fremennik opens trials, islands, lunar magic, dagannoths, and Vorkath routes.", ["Enter Fremennik legally", "Complete one local branch"], ["Fremennik route", "Lunar path"], ["fremennik-trials", "lunar-spellbook", "dagannoth-kings", "vorkath"], ["region"], 38, 90),
  n("fremennik-trials", "Fremennik Trials", "quest", 4, "Fremennik", "A cultural questline gate into Fremennik systems.", ["Complete Fremennik Trials legally"], ["Fremennik access", "Lunar route"], ["fremennik", "lunar-spellbook", "dagannoth-kings"], ["quest"], 28, 91),
  n("lunar-spellbook", "Lunar Spellbook", "transport", 5, "Fremennik", "Lunar magic links utility spells, support, astrals, and Fremennik routing.", ["Unlock and use one Lunar spell legally"], ["Lunar spellbook", "Utility magic"], ["fremennik", "magic", "vorkath"], ["magic", "spellbook"], 31, 78),
  n("dagannoth-kings", "Dagannoth Kings", "boss", 5, "Fremennik", "A classic trio boss branch for rings, combat triangles, and Fremennik routing.", ["Kill one Dagannoth King legally", "Record rotation and supplies"], ["Berserker ring route", "Tribrid combat"], ["fremennik", "bossing", "combat-achievements"], ["boss"], 34, 96),
  n("vorkath", "Vorkath", "boss", 6, "Fremennik", "A Dragon Slayer II boss branch and late-game money route.", ["Kill Vorkath legally", "Record DS2 and gear route"], ["Vorkath money", "Dragon gear"], ["dragon-slayer-2", "dragons", "bossing"], ["boss", "endgame"], 45, 96),
  n("dragon-slayer-2", "Dragon Slayer II", "quest", 6, "Global", "Grandmaster quest opening Vorkath and Myths' Guild.", ["Complete Dragon Slayer II legally"], ["Vorkath", "Myths' Guild", "Endgame dragons"], ["vorkath", "myths-guild", "completion-cape"], ["quest", "grandmaster"], 52, 96),
  n("myths-guild", "Myths' Guild", "guild", 6, "Global", "A major endgame guild milestone.", ["Enter Myths' Guild legally"], ["Endgame guild", "Wrath altar route"], ["dragon-slayer-2", "completion-cape"], ["guild", "endgame"], 58, 96),
  n("bossing", "Bossing license", "milestone", 4, "Global", "A meta milestone for accounts ready to branch into repeatable PvM.", ["Complete three legal boss or combat-prep nodes", "Write your death and supply rule"], ["Boss routes", "Combat achievements"], ["giant-mole", "barrows", "zulrah", "combat-achievements"], ["milestone", "combat"], 72, 50),
  n("combat-achievements", "Combat Achievements", "diary", 5, "Global", "Combat tasks create PvM goals, boss gates, and prestige branches.", ["Complete one Combat Achievement tier task legally"], ["PvM progression", "Boss mastery"], ["bossing", "slayer-bosses", "raids", "inferno"], ["diary", "combat"], 66, 44),
  n("collection-log", "Collection Log", "milestone", 3, "Global", "Collection log slots create repeatable item and boss branches.", ["Log one new unique from legal content", "Choose whether it becomes a breadcrumb"], ["Log hunting", "Reward web"], ["wintertodt", "clue-gear", "bossing", "raids"], ["collection"], 55, 36),
  n("raids", "Raids", "raid", 6, "Global", "The global raid branch connecting ToA, CoX, ToB, and endgame prep.", ["Complete one legal raid", "Archive team, gear, and death rules"], ["Raid endgame", "Mega rares"], ["chambers", "toa", "tob", "endgame-atlas"], ["raid", "endgame"], 66, 14),
  n("tob", "Theatre of Blood", "raid", 6, "Morytania", "A Morytania endgame raid branch.", ["Complete one Theatre of Blood legally"], ["Morytania raid", "Scythe route"], ["morytania", "raids", "combat-achievements"], ["raid", "endgame"], 66, 98),
  n("inferno", "Inferno", "minigame", 6, "Karamja", "The Inferno is a capstone combat challenge.", ["Complete Inferno legally", "Archive gear and supply route"], ["Infernal cape", "Combat capstone"], ["karamja", "combat-achievements", "completion-cape"], ["endgame", "combat"], 18, 58),
  n("completion-cape", "Completion Cape path", "milestone", 6, "Global", "The final archive objective: a mature web across quests, diaries, bosses, raids, skills, and clues.", ["Complete a chosen capstone packet", "Archive the route as final proof"], ["Run completion", "World Spine"], ["master-clue", "raids", "inferno", "endgame-atlas"], ["capstone", "endgame"], 50, 50),
  n("endgame-atlas", "Endgame Atlas", "milestone", 6, "Global", "A late-run planning hub for unresolved boss, raid, clue, diary, and grandmaster branches.", ["Complete five tier 5+ nodes", "Choose a capstone route"], ["Capstone planner", "Completion archive"], ["completion-cape", "raids", "dt2", "song-of-elves", "master-clue"], ["endgame", "planner"], 50, 64)
];

const supplementalNodes: NodeInput[] = [
  n("goblin-diplomacy", "Goblin Diplomacy", "quest", 1, "Asgarnia", "A small quest branch from goblins into dyes, Falador, and early quest points.", ["Complete Goblin Diplomacy legally", "Source every dye through legal routes"], ["Quest points", "Falador route"], ["goblin", "falador", "quest-points"], ["quest"], 68, 66),
  n("lumbridge-castle", "Lumbridge Castle", "region", 1, "Misthalin", "Castle services, Duke Horacio, upstairs banks in permissive rulesets, and early quest context.", ["Visit the castle legally", "Use one allowed service"], ["Castle branch", "Starter services"], ["cooks-assistant", "lumbridge", "quest-points"], ["region"], 60, 33),
  n("river-lum", "River Lum", "region", 1, "Misthalin", "A river route connecting shrimp, fishing, canoe travel, and Misthalin movement.", ["Follow the river route", "Catch or cook one legal fish"], ["River travel", "Fishing chain"], ["shrimp", "fishing", "canoe"], ["region"], 38, 30),
  n("leather", "Leather", "item", 1, "Misthalin", "Cowhide into leather, opening crafting, ranged gear, and shop/tanner routes.", ["Tan one hide legally", "Craft one leather item"], ["Leather gear", "Tanner route"], ["cow", "crafting", "al-kharid"], ["item"], 82, 22),
  n("feathers", "Feathers", "item", 1, "Misthalin", "Chicken feathers tie fishing, fletching, ranged ammo, and early money routes together.", ["Collect feathers legally", "Use them in fishing or arrows"], ["Fishing bait", "Arrow making"], ["chicken", "fishing", "fletching"], ["item"], 22, 41),
  n("coins", "Coins", "item", 1, "Global", "A money-rule branch for shops, tolls, charter fees, and early merchant logic.", ["Earn coins from a legal source", "Spend coins at a legal shop"], ["Shop economy", "Merchant route"], ["lumbridge-shop", "grand-exchange", "merchant-route"], ["item"], 77, 48),
  n("merchant-route", "Merchant route", "shop", 2, "Global", "A shop-to-shop branch for legal buying, selling, and supply rules.", ["Use two legal shops", "Record one banned purchase category"], ["Shop network", "Supply legality"], ["lumbridge-shop", "varrock", "archery-shop", "gem-shop"], ["shop"], 82, 50),
  n("archery-shop", "Archery shop", "shop", 2, "Varrock", "Ranged shops connect arrows, bows, feathers, fletching, and safe combat routes.", ["Buy one legal ranged supply", "Use it in a legal task"], ["Ranged supply route"], ["ranged", "fletching", "varrock"], ["shop"], 93, 63),
  n("gem-shop", "Gem shop", "shop", 2, "Kharidian Desert", "Gem shops link crafting, jewelry teleports, Al Kharid, and clue requirements.", ["Buy or cut one legal gem", "Craft one legal jewelry item"], ["Jewelry route", "Crafting route"], ["al-kharid", "crafting", "sapphire-ring"], ["shop"], 91, 20),
  n("sapphire-ring", "Sapphire ring", "item", 2, "Global", "A jewelry breadcrumb into crafting, enchanting, teleport jewelry, and clue items.", ["Craft or obtain one legally", "Declare enchantment rules"], ["Jewelry utility", "Magic/crafting bridge"], ["crafting", "magic", "gem-shop"], ["item"], 95, 30),
  n("draynor-manor", "Draynor Manor", "region", 2, "Misthalin", "A spooky early branch for quests, vampires, odd items, and clue steps.", ["Enter legally", "Complete one manor task"], ["Vampire route", "Odd item web"], ["draynor", "vampire-slayer", "easy-clue"], ["region"], 20, 54),
  n("vampire-slayer", "Vampire Slayer", "quest", 2, "Misthalin", "A simple combat quest branching from Draynor into melee confidence and quest points.", ["Complete Vampire Slayer legally"], ["Attack XP route", "Quest points"], ["draynor", "combat-basics", "quest-points"], ["quest"], 24, 60),
  n("demon-slayer", "Demon Slayer", "quest", 2, "Misthalin", "Varrock quest branch into Silverlight, demons, and early questing.", ["Complete Demon Slayer legally"], ["Demon branch", "Varrock questing"], ["varrock", "quest-points", "lesser-demon"], ["quest"], 58, 8),
  n("earth-warriors", "Earth warriors", "monster", 3, "Wilderness", "A combat branch linking Varrock, wilderness edge rules, clues, and melee tasks.", ["Kill one legally", "Record wilderness risk rule"], ["Wilderness combat", "Clue pressure"], ["varrock", "wilderness", "hard-clue"], ["monster"], 50, 4),
  n("wilderness", "Wilderness", "region", 4, "Wilderness", "A risk branch for clue steps, bosses, chaos altar, revenants, and strict-mode decisions.", ["Enter legally", "Declare death and item-risk rules"], ["Wildy branches", "Risk content"], ["hard-clue", "earth-warriors", "bossing"], ["region"], 44, 0),
  n("monastery", "Edgeville Monastery", "guild", 2, "Misthalin", "Prayer Guild and monastery branch into prayer training and Edgeville routes.", ["Enter or use the monastery legally", "Complete one prayer action"], ["Prayer training", "Edgeville chapel"], ["edgeville", "prayer", "piety"], ["guild"], 35, 5),
  n("piety", "Piety", "milestone", 5, "Kandarin", "A major prayer milestone requiring quest and stat planning.", ["Unlock Piety legally", "Record first legal use"], ["Melee prayer power", "Boss readiness"], ["prayer", "bossing", "combat-achievements"], ["milestone"], 45, 18),
  n("rigour", "Rigour", "milestone", 6, "Kourend", "A Chambers-linked prayer milestone for ranged endgame.", ["Unlock Rigour legally", "Record scroll source"], ["Ranged endgame", "Raid reward legality"], ["chambers", "raids", "ranged"], ["milestone"], 60, 8),
  n("augury", "Augury", "milestone", 6, "Kourend", "A Chambers-linked prayer milestone for magic endgame.", ["Unlock Augury legally", "Record scroll source"], ["Magic endgame", "Raid reward legality"], ["chambers", "raids", "magic"], ["milestone"], 64, 8),
  n("god-spells", "God spells", "transport", 4, "Wilderness", "Mage Arena spells connect wilderness risk, Magic, capes, and combat unlocks.", ["Cast one god spell legally", "Record wilderness rule"], ["Mage Arena branch", "Magic combat"], ["magic", "wilderness", "combat-achievements"], ["magic"], 30, 45),
  n("poh", "Player-owned house", "region", 4, "Global", "Construction hub for teleports, restoration, storage, and clue-routing power.", ["Build one legal utility", "Record house teleport rules"], ["House utility", "Transport acceleration"], ["teleports", "transport-hub", "construction"], ["region"], 35, 72),
  n("spirit-trees", "Spirit trees", "transport", 4, "Global", "Transport network from farming, quests, and map routing.", ["Use one spirit tree legally", "Record route source"], ["Tree transport", "Farming route"], ["transport-hub", "farming", "gnome-questline"], ["transport"], 38, 82),
  n("zanaris", "Zanaris", "region", 3, "Lost City", "Fairy realm branch linking Lost City, fairy rings, dragon dagger, and clue steps.", ["Enter Zanaris legally", "Complete one local task"], ["Fairy city", "Lost City route"], ["lost-city", "fairy-rings", "medium-clue"], ["region"], 28, 55),
  n("lost-city", "Lost City", "quest", 3, "Global", "A quest keystone for Zanaris, fairy rings, and dragon weapons.", ["Complete Lost City legally"], ["Zanaris", "Fairy rings", "Dragon dagger"], ["zanaris", "fairy-rings", "dragon-slayer"], ["quest"], 25, 52),
  n("brimhaven", "Brimhaven", "region", 3, "Karamja", "Karamja branch into agility arena, dungeon monsters, shops, and travel.", ["Reach Brimhaven legally", "Complete one local task"], ["Brimhaven dungeon", "Agility arena"], ["karamja", "lesser-demon", "agility"], ["region"], 12, 74),
  n("lesser-demon", "Lesser demon", "monster", 3, "Karamja", "Classic demon branch from Karamja volcano, Demon Slayer, and combat training.", ["Kill one legally", "Record safe-spot rule"], ["Demon combat", "Karamja volcano"], ["karamja", "demon-slayer", "combat-basics"], ["monster"], 14, 62),
  n("tai-bwo", "Tai Bwo Wannai", "region", 3, "Karamja", "Karamja village branch for cleanup, trading sticks, jungle quests, and diary tasks.", ["Complete one local task", "Record favour or cleanup rule"], ["Jungle route", "Karamja diary"], ["karamja", "karamja-diary"], ["region"], 8, 82),
  n("tempoross", "Tempoross", "minigame", 3, "Desert", "Fishing boss/minigame branch for food, rewards, and desert sea routes.", ["Complete one Tempoross kill legally", "Record reward pool rule"], ["Fishing rewards", "Spirit flakes"], ["fishing", "desert", "collection-log"], ["minigame"], 88, 8),
  n("fishing-guild", "Fishing Guild", "guild", 3, "Kandarin", "Fishing milestone for higher-tier food and clue routes.", ["Enter or qualify legally", "Catch one guild fish"], ["Food economy", "Guild progress"], ["fishing", "kandarin", "sharks"], ["guild"], 22, 72),
  n("woodcutting-guild", "Woodcutting Guild", "guild", 3, "Kourend", "Woodcutting milestone linking logs, fletching, redwoods, and Kourend.", ["Enter or qualify legally", "Cut one guild log"], ["Log economy", "Kourend skilling"], ["woodcutting", "zeah", "fletching"], ["guild"], 47, 10),
  n("canoe", "Canoe transport", "transport", 2, "Misthalin", "Woodcutting-based river transport that makes early map movement feel earned.", ["Make or ride one canoe legally", "Record allowed stops"], ["River travel", "Woodcutting utility"], ["woodcutting", "river-lum", "edgeville"], ["transport"], 30, 25),
  n("firemaking", "Firemaking", "skill", 2, "Global", "Firemaking branches from logs into Wintertodt, light sources, and clue utility.", ["Light a legal fire", "Use legal logs"], ["Wintertodt access", "Utility fires"], ["woodcutting", "wintertodt"], ["skill"], 40, 16),
  n("farming", "Farming", "skill", 3, "Global", "Farming links patches, contracts, Hespori, herbs, and spirit trees.", ["Complete one legal farming cycle", "Record seed source"], ["Contracts", "Herbs", "Spirit trees"], ["farming-guild", "hespori", "spirit-trees"], ["skill"], 82, 3),
  n("thieving", "Thieving", "skill", 3, "Global", "Thieving connects Ardougne, stalls, Pyramid Plunder, rogues, and money routes.", ["Complete one legal thieving method", "Record target and location"], ["Ardougne skilling", "Pyramid routes"], ["ardougne", "pyramid-plunder"], ["skill"], 18, 92),
  n("agility", "Agility", "skill", 3, "Global", "Agility links shortcuts, rooftops, Sepulchre, graceful, and clue routing.", ["Complete one legal course lap", "Record shortcut rules"], ["Movement upgrades", "Sepulchre prep"], ["brimhaven", "hallowed-sepulchre", "transport-hub"], ["skill"], 20, 66),
  n("pyramid-plunder", "Pyramid Plunder", "minigame", 4, "Desert", "A thieving minigame branch from the desert into sceptres and clue routes.", ["Complete one legal room bracket", "Record reward rule"], ["Thieving minigame", "Desert utility"], ["desert", "thieving", "elite-clue"], ["minigame"], 98, 12),
  n("blast-furnace", "Blast Furnace", "minigame", 4, "Kandarin", "Smithing economy branch for bars, money, and production chains.", ["Use Blast Furnace legally", "Record coal and bar sources"], ["Smithing economy", "Metal production"], ["smithing", "mining-guild", "kandarin"], ["minigame"], 21, 78),
  n("giants-foundry", "Giants' Foundry", "minigame", 3, "Kharidian Desert", "Smithing minigame branch for practical bars, swords, rewards, and XP.", ["Complete one commission legally", "Record input source"], ["Smithing rewards", "Desert utility"], ["smithing", "desert"], ["minigame"], 89, 25),
  n("warriors-guild", "Warriors' Guild", "guild", 4, "Asgarnia", "Combat guild milestone for defenders, melee stats, and gear progression.", ["Enter legally", "Earn or attempt one defender step"], ["Defender route", "Melee progression"], ["rune-gear", "combat-basics", "bossing"], ["guild"], 92, 49),
  n("varrock-museum", "Varrock Museum", "region", 2, "Misthalin", "Museum branch for kudos, Bone Voyage route, natural history, and account lore.", ["Earn one legal kudos source", "Record display or quiz branch"], ["Museum route", "Fossil Island prep"], ["varrock", "quest-points", "dragon-slayer-2"], ["region"], 45, 17),
  n("grand-exchange", "Grand Exchange", "shop", 3, "Misthalin", "A ruleset-sensitive market branch for mains or restricted buy lists.", ["Declare GE rules", "Make one legal transaction if allowed"], ["Market route", "Buy-list rules"], ["varrock", "coins", "merchant-route"], ["shop"], 52, 20),
  n("varrock-diary", "Varrock Diary", "diary", 3, "Misthalin", "Area diary branch for Varrock tasks, utility rewards, and civic progression.", ["Complete one legal Varrock diary task"], ["Diary rewards", "Civic expansion"], ["varrock", "diary-hub", "grand-exchange"], ["diary"], 57, 25),
  n("misthalin-diary", "Lumbridge & Draynor Diary", "diary", 3, "Misthalin", "Starter diary branch that binds Lumbridge, Draynor, skilling, and quest errands.", ["Complete one legal diary task"], ["Diary utility", "Starter mastery"], ["misthalin", "draynor", "diary-hub"], ["diary"], 44, 22),
  n("falador-diary", "Falador Diary", "diary", 4, "Asgarnia", "Asgarnia diary branch tied to mole, mining, white knights, and utility rewards.", ["Complete one legal Falador diary task"], ["Diary utility", "Asgarnia mastery"], ["falador", "giant-mole", "diary-hub"], ["diary"], 12, 12),
  n("karamja-diary", "Karamja Diary", "diary", 4, "Karamja", "Island diary branch for shops, travel, jungles, and combat landmarks.", ["Complete one legal Karamja diary task"], ["Island mastery", "Gloves utility"], ["karamja", "tai-bwo", "inferno", "diary-hub"], ["diary"], 18, 78),
  n("morytania-diary", "Morytania Diary", "diary", 5, "Morytania", "Morytania diary branch for Barrows, slime, ecto routes, and swamp mastery.", ["Complete one legal Morytania diary task"], ["Barrows utility", "Swamp mastery"], ["morytania", "barrows", "diary-hub"], ["diary"], 53, 86),
  n("ardougne-diary", "Ardougne Diary", "diary", 4, "Kandarin", "Ardougne diary branch for cloaks, thieving, farming, and teleport utility.", ["Complete one legal Ardougne diary task"], ["Cloak utility", "Kandarin mastery"], ["ardougne", "thieving", "diary-hub"], ["diary"], 18, 84),
  n("elite-diary", "Elite diary tier", "diary", 5, "Global", "Late diary tier branch that tests broad account maturity.", ["Complete one elite diary task legally"], ["Elite utilities", "Endgame civic proof"], ["morytania-diary", "combat-achievements", "completion-cape"], ["diary"], 58, 78),
  n("diary-hub", "Diary hub", "diary", 4, "Global", "Meta branch for area diaries and civic expansion.", ["Complete three diary tasks across legal areas"], ["Diary progression", "Area mastery"], ["varrock-diary", "falador-diary", "morytania-diary", "elite-diary"], ["diary"], 48, 30),
  n("clue-gear", "Clue gear", "item", 3, "Global", "Reward items, emote gear, stash pieces, and clue-specific legality.", ["Use or archive one clue reward legally", "Record stash rule"], ["Clue reward web", "Fashion/emote requirements"], ["beginner-clue", "easy-clue", "collection-log"], ["item"], 83, 92),
  n("recipe-disaster", "Recipe for Disaster", "quest", 5, "Global", "A long-form questline branch for gloves, subquests, and account breadth.", ["Complete one RFD subquest legally", "Record glove tier"], ["Barrows gloves path", "Quest breadth"], ["cooking", "quest-points", "completion-cape"], ["quest"], 74, 12),
  n("beneath-cursed-sands", "Beneath Cursed Sands", "quest", 5, "Desert", "Quest gate for Tombs of Amascut.", ["Complete Beneath Cursed Sands legally"], ["ToA access", "Desert raid route"], ["desert", "toa"], ["quest"], 94, 18),
  n("tirannwn", "Tirannwn", "region", 5, "Tirannwn", "Elf lands branch connecting Regicide, Zulrah, Prifddinas, and crystal content.", ["Enter Tirannwn legally", "Complete one local task"], ["Elf lands", "Crystal route"], ["regicide", "zulrah", "song-of-elves"], ["region"], 4, 48),
  n("kandarin", "Kandarin", "region", 4, "Kandarin", "Broad western region connecting Ardougne, Seers, Barbarian Outpost, guilds, and bosses.", ["Complete one Kandarin task", "Declare legal towns"], ["Western expansion", "Guilds and quests"], ["ardougne", "fishing-guild", "fremennik"], ["region"], 26, 86),
  n("yew-longbow", "Yew longbow", "item", 4, "Global", "Fletching and alching milestone for money, Magic, and ranged progression.", ["Make or obtain one legally", "Declare alch rules"], ["Fletching economy", "Magic money route"], ["fletching", "magic", "woodcutting"], ["item"], 10, 42),
  n("zalcano", "Zalcano", "boss", 6, "Tirannwn", "Prifddinas skilling boss branch for crystal tools and resource drops.", ["Kill Zalcano legally", "Record team and reward rule"], ["Crystal resources", "Skilling boss"], ["prifddinas", "song-of-elves", "collection-log"], ["boss"], 12, 29),
  n("sharks", "Sharks", "item", 4, "Global", "High food branch from fishing and cooking into boss sustain.", ["Catch, cook, or obtain sharks legally", "Use them in one legal boss prep"], ["High food", "Boss sustain"], ["fishing-guild", "cooking", "bossing"], ["item"], 29, 77),
  n("construction", "Construction", "skill", 4, "Global", "Construction branch for POH utility, teleports, storage, and restoration.", ["Build one legal room or utility", "Record material source"], ["House utility", "Teleport infrastructure"], ["poh", "teleports", "merchant-route"], ["skill"], 36, 67),
  n("gnome-questline", "Gnome questline", "quest", 4, "Kandarin", "Questline branch into spirit trees, travel, and western map routes.", ["Complete one legal gnome quest", "Record travel unlocks"], ["Gnome travel", "Spirit tree route"], ["spirit-trees", "kandarin", "transport-hub"], ["quest"], 32, 84)
];

const allNodeInputs = [...baseNodes, ...supplementalNodes];

export const GRAPH_NODES: GraphNode[] = allNodeInputs.map((node) => ({ ...node, links: node.links ?? [] }));

const nodeById = new Map(GRAPH_NODES.map((node) => [node.id, node]));

export const GRAPH_EDGES: GraphEdge[] = Array.from(
  new Map(
    GRAPH_NODES.flatMap((node) =>
      node.links
        .filter((target) => nodeById.has(target))
        .map((target) => {
          const key = [node.id, target].sort().join("::");
          return [key, { from: node.id, to: target, reason: edgeReason(node, nodeById.get(target)!) }] as const;
        })
    )
  ).values()
);

export const STARTER_SEEDS = ["lumbridge", "bronze-dagger", "goblin", "cooks-assistant", "shrimp"];

export function getNode(id?: string): GraphNode | undefined {
  return id ? nodeById.get(id) : undefined;
}

export function getLinkedNodes(id: string): GraphNode[] {
  const node = getNode(id);
  if (!node) return [];
  return node.links.map((link) => getNode(link)).filter(Boolean) as GraphNode[];
}

export function nodeKindColor(kind: NodeKind): string {
  return {
    seed: "#f0c86a",
    region: "#74c69d",
    quest: "#9bb7ff",
    item: "#e3aa62",
    monster: "#da6f63",
    shop: "#d8c36a",
    skill: "#6ec6d8",
    transport: "#a98be4",
    guild: "#80d58a",
    minigame: "#ef8fc2",
    boss: "#e85f58",
    diary: "#7db5ff",
    clue: "#f0a75c",
    raid: "#ff7d7d",
    milestone: "#ffffff"
  }[kind];
}

function n(
  id: string,
  label: string,
  kind: NodeKind,
  tier: ProgressTier,
  region: string,
  summary: string,
  tasks: string[],
  unlocks: string[],
  links: string[],
  tags: string[],
  x: number,
  y: number
): NodeInput {
  return { id, label, kind, tier, region, summary, tasks, unlocks, links, tags, x, y };
}

function edgeReason(a: GraphNode, b: GraphNode): string {
  if (a.region === b.region && a.region !== "Global") return `${a.region} breadcrumb`;
  if (a.kind === "quest" || b.kind === "quest") return "Quest requirement or reward link";
  if (a.kind === "transport" || b.kind === "transport") return "Travel network link";
  if (a.kind === "boss" || b.kind === "boss") return "Combat progression link";
  if (a.kind === "skill" || b.kind === "skill") return "Skill or resource chain";
  return "Wiki-style related page link";
}
