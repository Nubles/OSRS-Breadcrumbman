import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const API = "https://oldschool.runescape.wiki/api.php";
const OUT = path.resolve("public/wiki-graph.json");
const USER_AGENT = "BreadcrumbmanAtlas/0.2 (https://github.com/Nubles/OSRS-Breadcrumbman)";

const CATEGORY_CONFIG = [
  ["Quests", "quest", 2],
  ["Items", "item", 3],
  ["Monsters", "monster", 3],
  ["Shops", "shop", 2],
  ["Locations", "region", 3],
  ["Transportation", "transport", 3],
  ["Guilds", "guild", 3],
  ["Minigames", "minigame", 3],
  ["Bosses", "boss", 5],
  ["Achievement_Diaries", "diary", 4],
  ["Clue_scrolls", "clue", 3],
  ["Raids", "raid", 6],
  ["Skills", "skill", 2]
];

const HARD_SKIP = [
  "Category:",
  "File:",
  "Template:",
  "Transcript:",
  "Update:",
  "Calculator:",
  "Money making guide",
  "Treasure Trails/Guide",
  "Exchange:"
];

const COMPLETION_EXCLUSIONS = [
  { label: "holiday event", pattern: /\b(holiday|christmas|easter|halloween|thanksgiving|midsummer|birthday|anniversary)\s+(event|reward|item|shop|token|crate|present|balloon|cake|hat|cape|costume)\b/i },
  { label: "seasonal event", pattern: /\b(seasonal|limited-time|limited time|one-off|temporary)\s+(event|reward|item|content|shop)\b/i },
  { label: "no longer obtainable", pattern: /\b(no longer obtainable|unobtainable|discontinued|removed from the game|could only be obtained|was only obtainable|was previously obtainable)\b/i },
  { label: "event-only source", pattern: /\b(obtained from|reward from|rewarded from|purchased from|available during|released during|introduced during).{0,90}\b(christmas|easter|halloween|thanksgiving|midsummer|birthday|anniversary|holiday)\b/i },
  { label: "past event participation", pattern: /\b(first obtained|originally obtained|obtained by participating|obtained during|rewarded for completing).{0,90}\b(event|holiday)\b/i },
  { label: "unreleased content", pattern: /\b(unreleased|not currently available|not available in-game)\b/i },
  { label: "proposed content", pattern: /\b(proposed to players|proposed skill|skill concept|was a skill in development|would not be released|not released in old school runescape)\b/i }
];

const TITLE_EXCLUSIONS = new Map([
  ["unused shops", "unused content"],
  ["taming", "proposed content"],
  ["summoning", "unreleased content"],
  ["warding", "proposed content"]
]);

const limit = Number(process.env.WIKI_LIMIT || "0");
const delayMs = Number(process.env.WIKI_DELAY_MS || "180");

async function api(params) {
  const url = new URL(API);
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  await sleep(delayMs);
  let res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (res.status === 429 || res.status >= 500) {
    await sleep(delayMs * 8);
    res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  }
  if (res.status === 429 || res.status >= 500) {
    await sleep(delayMs * 20);
    res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  }
  if (!res.ok) throw new Error(`Wiki API ${res.status}: ${url}`);
  return res.json();
}

async function categoryMembers(category) {
  const pages = [];
  let cmcontinue;
  do {
    const json = await api({
      action: "query",
      list: "categorymembers",
      cmtitle: `Category:${category}`,
      cmnamespace: 0,
      cmlimit: "500",
      ...(cmcontinue ? { cmcontinue } : {})
    });
    pages.push(...(json.query?.categorymembers || []));
    cmcontinue = json.continue?.cmcontinue;
  } while (cmcontinue && (!limit || pages.length < limit));
  return pages.slice(0, limit || pages.length);
}

async function pageExtracts(titles) {
  const result = new Map();
  for (const chunk of chunks(titles, 50)) {
    const json = await api({
      action: "query",
      prop: "extracts",
      exintro: 1,
      explaintext: 1,
      redirects: 1,
      titles: chunk.join("|")
    });
    for (const page of Object.values(json.query?.pages || {})) {
      if (!page?.title || page.missing !== undefined) continue;
      result.set(page.title, (page.extract || "").replace(/\s+/g, " ").trim());
    }
  }
  return result;
}

async function pageLinks(titles) {
  const result = new Map();
  for (const title of titles) {
    const links = [];
    let plcontinue;
    do {
      const json = await api({
        action: "query",
        prop: "links",
        plnamespace: 0,
        pllimit: "500",
        titles: title,
        ...(plcontinue ? { plcontinue } : {})
      });
      const page = Object.values(json.query?.pages || {})[0];
      links.push(...(page?.links || []).map((link) => link.title));
      plcontinue = json.continue?.plcontinue;
    } while (plcontinue && links.length < 900);
    result.set(title, links);
  }
  return result;
}

function classify(title, categories) {
  const lower = title.toLowerCase();
  if (lower.includes("tombs of amascut") || lower.includes("theatre of blood") || lower.includes("chambers of xeric")) return "raid";
  if (lower.includes("diary")) return "diary";
  if (lower.includes("clue")) return "clue";
  if (lower.includes("guild")) return "guild";
  if (lower.includes("teleport") || lower.includes("fairy ring") || lower.includes("spirit tree")) return "transport";
  return categories[0]?.kind || "item";
}

function tierFor(title, kind, categories) {
  const text = title.toLowerCase();
  if (kind === "raid") return 6;
  if (text.includes("grandmaster") || text.includes("inferno") || text.includes("nex")) return 6;
  if (kind === "boss") return 5;
  if (text.includes("elite") || text.includes("master")) return 5;
  if (kind === "quest") {
    if (text.includes("dragon slayer ii") || text.includes("desert treasure ii") || text.includes("song of the elves")) return 6;
    if (text.includes("desert treasure") || text.includes("regicide")) return 4;
    return 2;
  }
  return Math.max(1, Math.min(6, categories[0]?.tier || 3));
}

function idFor(title) {
  return title
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function shouldSkip(title) {
  return HARD_SKIP.some((entry) => title.startsWith(entry) || title.includes(entry));
}

function completionExclusion(title, kind, summary, categories) {
  const titleReason = TITLE_EXCLUSIONS.get(title.toLowerCase());
  if (titleReason) return titleReason;

  const categoryText = categories.map((item) => item.category.replaceAll("_", " ")).join(" ");
  const text = `${title}. ${summary}. ${categoryText}`;
  for (const rule of COMPLETION_EXCLUSIONS) {
    if (rule.pattern.test(text)) return rule.label;
  }

  if (kind === "item" && /\bcannot be obtained\b/i.test(text)) return "unreleased content";

  const titleLower = title.toLowerCase();
  const seasonalTitle = /\b(christmas|easter|halloween|thanksgiving|midsummer|birthday|anniversary)\b/.test(titleLower);
  const seasonalContext = /\b(event|holiday|diango|toy box|costume room|limited|obtained|reward)\b/i.test(text);
  if (seasonalTitle && seasonalContext) return "seasonal title";

  return "";
}

function chunks(items, size) {
  const out = [];
  for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size));
  return out;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const byTitle = new Map();
  for (const [category, kind, tier] of CATEGORY_CONFIG) {
    const members = await categoryMembers(category);
    for (const page of members) {
      if (!page.title || shouldSkip(page.title)) continue;
      const existing = byTitle.get(page.title) || { title: page.title, categories: [] };
      existing.categories.push({ category, kind, tier });
      byTitle.set(page.title, existing);
    }
  }

  const titles = Array.from(byTitle.keys()).sort();
  const extracts = await pageExtracts(titles);
  const links = await pageLinks(titles);
  const titleSet = new Set(titles);
  const inbound = new Map();
  for (const [title, outgoing] of links.entries()) {
    for (const target of outgoing) {
      if (!titleSet.has(target)) continue;
      inbound.set(target, (inbound.get(target) || 0) + 1);
    }
  }

  const nodes = titles.map((title) => {
    const meta = byTitle.get(title);
    const kind = classify(title, meta.categories);
    const localLinks = (links.get(title) || []).filter((target) => titleSet.has(target));
    const summary = extracts.get(title) || `OSRS Wiki page linked through ${meta.categories.map((item) => item.category.replaceAll("_", " ")).join(", ")}.`;
    return {
      id: idFor(title),
      title,
      kind,
      tier: tierFor(title, kind, meta.categories),
      completion: "playable",
      summary,
      url: `https://oldschool.runescape.wiki/w/${encodeURIComponent(title.replaceAll(" ", "_"))}`,
      categories: meta.categories.map((item) => item.category),
      links: localLinks.map(idFor),
      inbound: inbound.get(title) || 0,
      outbound: localLinks.length
    };
  });

  const playableTitleSet = new Set();
  const excluded = [];
  for (const node of nodes) {
    const meta = byTitle.get(node.title);
    const reason = completionExclusion(node.title, node.kind, node.summary, meta.categories);
    if (reason) {
      excluded.push({
        id: node.id,
        title: node.title,
        kind: node.kind,
        reason,
        url: node.url,
        summary: node.summary.slice(0, 220)
      });
    } else {
      playableTitleSet.add(node.title);
    }
  }

  const titleById = new Map(titles.map((title) => [idFor(title), title]));
  const playableNodes = nodes
    .filter((node) => playableTitleSet.has(node.title))
    .map((node) => ({
      ...node,
      links: node.links.filter((id) => {
        const linkedTitle = titleById.get(id);
        return linkedTitle ? playableTitleSet.has(linkedTitle) : false;
      })
    }));

  const categories = {};
  for (const node of playableNodes) {
    for (const category of node.categories) categories[category] = (categories[category] || 0) + 1;
  }

  const edgeCount = playableNodes.reduce((sum, node) => sum + node.links.length, 0);
  const payload = {
    generatedAt: new Date().toISOString(),
    source: "https://oldschool.runescape.wiki MediaWiki API",
    policy: "completion-safe-v1",
    pageCount: playableNodes.length,
    playableCount: playableNodes.length,
    excludedCount: excluded.length,
    edgeCount,
    categories,
    excluded,
    nodes: playableNodes
  };

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${playableNodes.length} playable pages, excluded ${excluded.length}, and kept ${edgeCount} edges to ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
