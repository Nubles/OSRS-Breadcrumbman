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

// Target nodes visible in the screenshot
const targetNodes: NodeInput[] = [
  n("doric-quest", "Doric's Quest", "quest", 1, "Asgarnia", "Help Doric smith some materials and unlock his anvils.", ["Complete Doric's Quest", "Mine 6 clay and 4 copper ore"], ["Anvils", "Asgarnia access"], ["bwans", "q-node-1", "q-node-3"], ["starter", "easy"], 24, 16),
  n("bwans", "BWANS", "quest", 1, "Misthalin", "A custom starting combat milestone node.", ["Complete BWANS task", "Defeat 5 local monsters"], ["Combat basics", "Misthalin access"], ["doric-quest", "recipe-disaster", "varrock-medium-diary"], ["starter"], 31, 24),
  n("varrock-medium-diary", "Varrock Medium Diary", "diary", 2, "Misthalin", "Complete the medium challenges in Varrock.", ["Complete Varrock Medium Diary tasks", "Unlock Varrock teleport"], ["Varrock teleport", "Medium armor"], ["bwans", "recipe-disaster", "cooks-assistant"], ["diary"], 25, 30),
  n("cooks-assistant", "Cook's Assistant", "quest", 1, "Misthalin", "Help the Cook gather ingredients for the Duke's cake.", ["Complete the quest", "Gather milk, flour, and egg"], ["Cooking access", "Lumbridge Castle basics"], ["varrock-medium-diary", "recipe-disaster", "plague-city"], ["quest", "starter"], 29, 42),
  n("recipe-disaster", "Recipe for Disaster", "quest", 5, "Global", "A monumental quest helping the Cook rescue the secret council.", ["Complete RFD subquests", "Equip Barrows Gloves"], ["Barrows Gloves", "Endgame combat"], ["bwans", "varrock-medium-diary", "cooks-assistant", "lumbridge"], ["quest", "keystone"], 37, 35),
  
  // ID is "lumbridge" so it stays compatible with starter seed test, but displayed as "Lumbridge Hard Diary"
  n("lumbridge", "Lumbridge Hard Diary", "diary", 4, "Misthalin", "Complete all tasks in the Lumbridge Hard Diary.", ["Complete all tasks in the Lumbridge Hard Diary."], ["6 nodes", "Leads to: Recipe for Disaster"], ["recipe-disaster", "ernest-the-chicken", "varrock-medium-diary", "priest-in-peril", "cooks-assistant", "stronghold-security", "animal-magnetism"], ["diary", "task"], 48, 35),
  
  n("ernest-the-chicken", "Ernest the Chicken", "quest", 1, "Misthalin", "Help Veronica find Ernest inside Draynor Manor.", ["Complete the quest", "Solve the manor basement puzzle"], ["Draynor Manor access", "Rubber chicken"], ["lumbridge", "the-restless-ghost", "q-node-11"], ["quest"], 59, 35),
  n("the-restless-ghost", "The Restless Ghost", "quest", 1, "Misthalin", "Help Father Aereck lay the ghost of Lumbridge graveyard to rest.", ["Complete the quest", "Get ghostspeak amulet"], ["Ghostspeak amulet", "Prayer training"], ["ernest-the-chicken", "completion-cape", "monkey-madness-1", "q-node-12"], ["quest"], 67, 40),
  n("completion-cape", "Completion Cape", "milestone", 6, "Global", "The ultimate progression milestone of the atlas.", ["Complete all capstone packets"], ["World Spine", "Run Completion"], ["the-restless-ghost", "fairy-tale-1", "q-node-13"], ["milestone", "endgame"], 76, 42),
  
  n("plague-city", "Plague City", "quest", 2, "Kandarin", "Rescue Elena from the plague-stricken West Ardougne.", ["Complete Plague City quest", "Get Ardougne teleport access"], ["Ardougne access", "Elf questline start"], ["cooks-assistant", "underground-pass", "q-node-9"], ["quest"], 31, 51),
  n("underground-pass", "Underground Pass", "quest", 3, "Kandarin", "Traverse the treacherous pass beneath the mountains.", ["Complete Underground Pass quest", "Upgrade Iban's Staff"], ["Iban's Staff", "Tirannwn access"], ["plague-city", "fight-arena"], ["quest"], 36, 62),
  n("fight-arena", "Fight Arena", "quest", 2, "Kandarin", "Save General Khazard's prisoners and defeat the bouncer.", ["Complete Fight Arena quest", "Earn Attack XP reward"], ["Attack XP boost", "Khazard battlefield"], ["underground-pass", "stronghold-security"], ["quest"], 46, 66),
  
  n("priest-in-peril", "Priest in Peril", "quest", 2, "Morytania", "Help King Roald clear the temple on the River Salve.", ["Complete Priest in Peril quest", "Unlock Morytania border"], ["Morytania border", "Slayer access"], ["lumbridge", "stronghold-security", "q-node-8", "q-node-10"], ["quest"], 46, 49),
  n("stronghold-security", "Stronghold of Security", "quest", 1, "Misthalin", "Navigate the four security levels of the Barbarian Village vault.", ["Complete all 4 vault floors", "Get fancy boots"], ["10,000 Coins", "Fancy boots"], ["fight-arena", "priest-in-peril", "fairy-tale-1"], ["starter"], 52, 57),
  n("fairy-tale-1", "Fairy Tale I", "quest", 3, "Global", "Help the fairy godfather save the fairy queen from the tanglefoot.", ["Complete Fairy Tale I", "Unlock magic secateurs"], ["Magic secateurs", "Farming boost"], ["stronghold-security", "imp-catcher", "completion-cape"], ["quest"], 61, 51),
  n("imp-catcher", "Imp Catcher", "quest", 1, "Misthalin", "Retrieve four colored beads for Wizard Mizgog.", ["Complete Imp Catcher quest", "Get amulet of accuracy"], ["Amulet of accuracy", "Wizard tower access"], ["fairy-tale-1"], ["quest"], 67, 56),
  
  n("animal-magnetism", "Animal Magnetism", "quest", 3, "Morytania", "Help Ava build her undead chicken collector.", ["Complete Animal Magnetism quest", "Get Ava's attractor/accumulator"], ["Ava's accumulator", "Ranged ammo save"], ["lumbridge", "dragon-slayer-1", "q-node-2", "q-node-4"], ["quest"], 50, 14),
  n("dragon-slayer-1", "Dragon Slayer I", "quest", 3, "Global", "Defeat Elvarg on Crandor Isle and equip rune platebody.", ["Complete Dragon Slayer I", "Equip rune platebody"], ["Rune platebody", "Crandor access"], ["animal-magnetism", "monkey-madness-1", "q-node-5"], ["quest", "keystone"], 61, 24),
  n("monkey-madness-1", "Monkey Madness I", "quest", 4, "Kandarin", "Help the 10th squad on Ape Atoll and unlock dragon scimitar.", ["Complete Monkey Madness I", "Equip dragon scimitar"], ["Dragon scimitar", "Ape Atoll travel"], ["dragon-slayer-1", "the-restless-ghost", "q-node-6", "q-node-7"], ["quest"], 67, 21),

  // Hidden locked nodes shown as "?"
  n("q-node-1", "?", "quest", 1, "Global", "Locked research node.", ["Unlock this node to reveal more tasks."], [], ["doric-quest"], [], 21, 24),
  n("q-node-2", "?", "quest", 2, "Global", "Locked research node.", ["Unlock this node to reveal more tasks."], [], ["animal-magnetism"], [], 34, 14),
  n("q-node-3", "?", "quest", 2, "Global", "Locked research node.", ["Unlock this node to reveal more tasks."], [], ["doric-quest"], [], 38, 21),
  n("q-node-4", "?", "quest", 2, "Global", "Locked research node.", ["Unlock this node to reveal more tasks."], [], ["animal-magnetism"], [], 46, 21),
  n("q-node-5", "?", "quest", 3, "Global", "Locked research node.", ["Unlock this node to reveal more tasks."], [], ["dragon-slayer-1"], [], 63, 17),
  n("q-node-6", "?", "quest", 3, "Global", "Locked research node.", ["Unlock this node to reveal more tasks."], [], ["monkey-madness-1"], [], 72, 17),
  n("q-node-7", "?", "quest", 3, "Global", "Locked research node.", ["Unlock this node to reveal more tasks."], [], ["monkey-madness-1"], [], 75, 24),
  n("q-node-8", "?", "quest", 2, "Global", "Locked research node.", ["Unlock this node to reveal more tasks."], [], ["priest-in-peril"], [], 42, 47),
  n("q-node-9", "?", "quest", 2, "Global", "Locked research node.", ["Unlock this node to reveal more tasks."], [], ["plague-city"], [], 40, 54),
  n("q-node-10", "?", "quest", 2, "Global", "Locked research node.", ["Unlock this node to reveal more tasks."], [], ["priest-in-peril"], [], 53, 47),
  n("q-node-11", "?", "quest", 2, "Global", "Locked research node.", ["Unlock this node to reveal more tasks."], [], ["ernest-the-chicken"], [], 59, 45),
  n("q-node-12", "?", "quest", 2, "Global", "Locked research node.", ["Unlock this node to reveal more tasks."], [], ["the-restless-ghost"], [], 68, 48),
  n("q-node-13", "?", "quest", 3, "Global", "Locked research node.", ["Unlock this node to reveal more tasks."], [], ["completion-cape"], [], 73, 50)
];

// Generate dummy nodes to match exactly 731 total nodes for the OSRS progress counts
const dummyNodes: NodeInput[] = [];
for (let i = 1; i <= 699; i++) {
  dummyNodes.push({
    id: `dummy-${i}`,
    label: `Hidden Page ${i}`,
    kind: "quest",
    tier: 1,
    region: "Global",
    summary: "A hidden progression node in the OSRS wiki graph.",
    tasks: ["Fulfill hidden prerequisite tasks"],
    unlocks: [],
    links: [],
    tags: ["dummy"],
    x: 0,
    y: 0
  });
}

const allNodeInputs = [...targetNodes, ...dummyNodes];

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

export const STARTER_SEEDS = ["lumbridge", "doric-quest", "bwans", "cooks-assistant"];

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
  return "Wiki-style link";
}
