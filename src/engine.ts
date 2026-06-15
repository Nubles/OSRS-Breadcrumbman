import { GRAPH_NODES, getLinkedNodes, getNode, RULE_MODES, STARTER_SEEDS } from "./data";
import { BreadcrumbEvent, GraphNode, NodeState, RunState } from "./types";

const STORAGE_KEY = "breadcrumbman-atlas-v1";

export type PressureLevel = "steady" | "watch" | "strained" | "critical";

export interface FrontierPressure {
  score: number;
  level: PressureLevel;
  openActive: number;
  blocked: number;
  breached: number;
  hiddenFrontier: number;
  deadEnds: number;
  summary: string;
}

export interface ActionRecommendation {
  node: GraphNode;
  score: number;
  reason: string;
}

export interface RunMilestone {
  id: string;
  label: string;
  detail: string;
  tone: "gold" | "green" | "cyan" | "red" | "violet";
}

const dummyCompleted = Array.from({ length: 131 }, (_, i) => `dummy-${i + 1}`);
const dummyRevealed = Array.from({ length: 280 }, (_, i) => `dummy-${i + 1}`);
const dummyBreached = Array.from({ length: 10 }, (_, i) => `dummy-${i + 600}`);

export const defaultState: RunState = {
  runName: "Breadcrumbman Atlas",
  ruleMode: "standard",
  selectedNodeId: "lumbridge",
  goalNodeId: "completion-cape",
  seedNodeId: "bwans",
  revealedNodeIds: [
    "doric-quest", "bwans", "varrock-medium-diary", "cooks-assistant", "recipe-disaster",
    "lumbridge", "ernest-the-chicken", "the-restless-ghost", "completion-cape",
    "plague-city", "underground-pass", "fight-arena", "priest-in-peril", "stronghold-security",
    "fairy-tale-1", "imp-catcher", "animal-magnetism", "dragon-slayer-1", "monkey-madness-1",
    "q-node-1", "q-node-2", "q-node-3", "q-node-4", "q-node-5", "q-node-6", "q-node-7",
    "q-node-8", "q-node-9", "q-node-10", "q-node-11", "q-node-12", "q-node-13",
    ...dummyRevealed
  ],
  activeNodeIds: [
    "lumbridge", "ernest-the-chicken", "the-restless-ghost", "completion-cape",
    "doric-quest", "varrock-medium-diary", "cooks-assistant", "fight-arena",
    "priest-in-peril", "stronghold-security", "fairy-tale-1", "imp-catcher",
    "animal-magnetism", "dragon-slayer-1", "monkey-madness-1"
  ],
  completedNodeIds: ["bwans", "recipe-disaster", ...dummyCompleted],
  blockedNodeIds: [],
  breachedNodeIds: ["plague-city", "underground-pass", ...dummyBreached],
  rescueTokens: 2,
  scholarFavour: 64.2,
  hasSeenOnboarding: true,
  events: [
    {
      id: "event-1",
      type: "reveal",
      title: "Revealed",
      detail: "Ernest the Chicken",
      createdAt: Date.now() - 2 * 60 * 1000,
      nodeId: "ernest-the-chicken"
    },
    {
      id: "event-2",
      type: "complete",
      title: "Completed",
      detail: "Cook's Assistant",
      createdAt: Date.now() - 6 * 60 * 1000,
      nodeId: "cooks-assistant"
    },
    {
      id: "event-3",
      type: "breach",
      title: "Breach spawned at",
      detail: "Plague City",
      createdAt: Date.now() - 18 * 60 * 1000,
      nodeId: "plague-city"
    },
    {
      id: "event-4",
      type: "rescue",
      title: "Used Rescue on",
      detail: "The Restless Ghost",
      createdAt: Date.now() - 27 * 60 * 1000,
      nodeId: "the-restless-ghost"
    },
    {
      id: "event-5",
      type: "reveal",
      title: "Revealed",
      detail: "Varrock Medium Diary",
      createdAt: Date.now() - 34 * 60 * 1000,
      nodeId: "varrock-medium-diary"
    }
  ],
  breaches: [
    {
      id: "breach-1",
      nodeId: "plague-city",
      title: "Plague City",
      penalty: "Spreading to 2 connected nodes",
      resolved: false,
      createdAt: Date.now() - 72 * 60 * 1000
    },
    {
      id: "breach-2",
      nodeId: "underground-pass",
      title: "Underground Pass",
      penalty: "Spreading to 1 connected node",
      resolved: false,
      createdAt: Date.now() - 167 * 60 * 1000
    },
    {
      id: "breach-3",
      nodeId: "fight-arena",
      title: "Fight Arena",
      penalty: "Stable",
      resolved: false,
      createdAt: Date.now() - 211 * 60 * 1000
    }
  ],
  backups: []
};

export function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEvent(event: Omit<BreadcrumbEvent, "id" | "createdAt">): BreadcrumbEvent {
  return { ...event, id: createId("event"), createdAt: Date.now() };
}

export function hydrateState(input: Partial<RunState>): RunState {
  return {
    ...defaultState,
    ...input,
    revealedNodeIds: Array.isArray(input.revealedNodeIds) ? input.revealedNodeIds : defaultState.revealedNodeIds,
    activeNodeIds: Array.isArray(input.activeNodeIds) ? input.activeNodeIds : defaultState.activeNodeIds,
    completedNodeIds: Array.isArray(input.completedNodeIds) ? input.completedNodeIds : defaultState.completedNodeIds,
    blockedNodeIds: Array.isArray(input.blockedNodeIds) ? input.blockedNodeIds : defaultState.blockedNodeIds,
    breachedNodeIds: Array.isArray(input.breachedNodeIds) ? input.breachedNodeIds : defaultState.breachedNodeIds,
    events: Array.isArray(input.events) ? input.events : defaultState.events,
    breaches: Array.isArray(input.breaches) ? input.breaches : defaultState.breaches,
    backups: Array.isArray(input.backups) ? input.backups : []
  };
}

export function createStarterState(seedId = STARTER_SEEDS[0]): RunState {
  const seed = getNode(seedId) || getNode("lumbridge")!;
  const starterReveal = revealFromNode(seed.id, { ...defaultState, completedNodeIds: [], revealedNodeIds: [], activeNodeIds: [] }, true);
  return {
    ...defaultState,
    seedNodeId: seed.id,
    selectedNodeId: seed.id,
    revealedNodeIds: unique([seed.id, ...starterReveal.map((node) => node.id)]),
    activeNodeIds: [seed.id],
    completedNodeIds: [],
    breachedNodeIds: [],
    events: [
      createEvent({
        type: "seed",
        title: "Seed chosen",
        detail: `${seed.label} became the first legal page in the Breadcrumbman atlas.`,
        nodeId: seed.id
      }),
      createEvent({
        type: "reveal",
        title: "First breadcrumbs revealed",
        detail: starterReveal.map((node) => node.label).join(", "),
        nodeId: seed.id
      })
    ]
  };
}

export function loadState(): RunState {
  if (typeof window === "undefined") return defaultState;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return defaultState;
  try {
    return hydrateState(JSON.parse(stored));
  } catch {
    return defaultState;
  }
}

export function saveState(state: RunState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function nodeState(node: GraphNode, state: RunState): NodeState {
  if (state.completedNodeIds.includes(node.id)) return "complete";
  if (state.breachedNodeIds.includes(node.id)) return "breached";
  if (state.blockedNodeIds.includes(node.id)) return "blocked";
  if (state.activeNodeIds.includes(node.id)) return "active";
  if (state.revealedNodeIds.includes(node.id)) return "revealed";
  return "hidden";
}

export function completeNode(state: RunState, nodeId: string): RunState {
  const node = getNode(nodeId);
  if (!node) return state;
  const alreadyComplete = state.completedNodeIds.includes(nodeId);
  const reveal = revealFromNode(nodeId, state);
  const completedCount = alreadyComplete ? state.completedNodeIds.length : state.completedNodeIds.length + 1;
  const mode = RULE_MODES[state.ruleMode];
  const earnsRescue = completedCount > 0 && completedCount % mode.rescueEvery === 0;
  return {
    ...state,
    selectedNodeId: nodeId,
    completedNodeIds: unique([...state.completedNodeIds, nodeId]),
    activeNodeIds: unique([...state.activeNodeIds.filter((id) => id !== nodeId), ...reveal.map((item) => item.id)]),
    revealedNodeIds: unique([...state.revealedNodeIds, nodeId, ...reveal.map((item) => item.id)]),
    rescueTokens: state.rescueTokens + (earnsRescue ? 1 : 0),
    scholarFavour: state.scholarFavour + node.tier + 1,
    events: [
      createEvent({
        type: "complete",
        title: `${node.label} completed`,
        detail: reveal.length
          ? `Revealed ${reveal.map((item) => item.label).join(", ")}.`
          : "No immediate branches remain from this page.",
        nodeId
      }),
      ...(earnsRescue
        ? [
            createEvent({
              type: "rescue",
              title: "Scholar grant earned",
              detail: `After ${completedCount} completions, the archive granted one rescue token.`
            })
          ]
        : []),
      ...state.events
    ].slice(0, 120)
  };
}

export function revealFromNode(nodeId: string, state: RunState, seed = false): GraphNode[] {
  const node = getNode(nodeId);
  if (!node) return [];
  const mode = RULE_MODES[state.ruleMode];
  const visible = new Set([...state.revealedNodeIds, ...state.completedNodeIds, ...state.activeNodeIds]);
  const count = seed ? Math.max(4, mode.revealCount) : mode.revealCount;
  return getLinkedNodes(nodeId)
    .filter((candidate) => !visible.has(candidate.id))
    .sort((a, b) => {
      const tierScore = Math.abs(a.tier - node.tier) - Math.abs(b.tier - node.tier);
      if (tierScore !== 0) return tierScore;
      return a.label.localeCompare(b.label);
    })
    .slice(0, count);
}

export function rescueReveal(state: RunState): RunState {
  if (state.rescueTokens <= 0) return state;
  const visible = new Set([...state.revealedNodeIds, ...state.completedNodeIds, ...state.activeNodeIds]);
  const frontier = GRAPH_NODES.filter((node) => {
    if (visible.has(node.id)) return false;
    return node.links.some((link) => visible.has(link));
  }).sort((a, b) => a.tier - b.tier || a.label.localeCompare(b.label));
  const chosen = frontier.slice(0, RULE_MODES[state.ruleMode].revealCount + 1);
  return {
    ...state,
    rescueTokens: state.rescueTokens - 1,
    revealedNodeIds: unique([...state.revealedNodeIds, ...chosen.map((node) => node.id)]),
    activeNodeIds: unique([...state.activeNodeIds, ...chosen.map((node) => node.id)]),
    events: [
      createEvent({
        type: "rescue",
        title: "Rescue breadcrumbs revealed",
        detail: chosen.length ? chosen.map((node) => node.label).join(", ") : "No rescue branches were available."
      }),
      ...state.events
    ].slice(0, 120)
  };
}

export function recommendNext(state: RunState): GraphNode[] {
  const completed = new Set(state.completedNodeIds);
  return state.activeNodeIds
    .map((id) => getNode(id))
    .filter(Boolean)
    .filter((node) => !completed.has(node!.id)) as GraphNode[];
}

export function analyzeFrontierPressure(state: RunState): FrontierPressure {
  const completed = new Set(state.completedNodeIds);
  const blocked = new Set(state.blockedNodeIds);
  const breached = new Set(state.breachedNodeIds);
  const visible = new Set([...state.revealedNodeIds, ...state.completedNodeIds, ...state.activeNodeIds]);
  const activeNodes = state.activeNodeIds.map((id) => getNode(id)).filter(Boolean) as GraphNode[];
  const openActiveNodes = activeNodes.filter((node) => !completed.has(node.id) && !blocked.has(node.id) && !breached.has(node.id));
  const hiddenFrontier = GRAPH_NODES.filter((node) => {
    if (visible.has(node.id)) return false;
    return node.links.some((link) => visible.has(link));
  }).length;
  const deadEnds = openActiveNodes.filter((node) => node.links.every((link) => visible.has(link))).length;
  const mode = RULE_MODES[state.ruleMode];
  const scarcity = Math.max(0, 7 - mode.revealCount) * 4 + Math.max(0, mode.rescueEvery - 5);
  const score = clamp(
    openActiveNodes.length * 7 +
      state.blockedNodeIds.length * 12 +
      state.breachedNodeIds.length * 14 +
      deadEnds * 8 +
      Math.max(0, 8 - hiddenFrontier) * 2 +
      scarcity,
    0,
    100
  );
  const level: PressureLevel = score >= 72 ? "critical" : score >= 48 ? "strained" : score >= 28 ? "watch" : "steady";
  const summary = `${openActiveNodes.length} open breadcrumb${openActiveNodes.length === 1 ? "" : "s"}, ${hiddenFrontier} hidden frontier ${hiddenFrontier === 1 ? "node" : "nodes"}, ${deadEnds} dead end${deadEnds === 1 ? "" : "s"}.`;
  return {
    score,
    level,
    openActive: openActiveNodes.length,
    blocked: state.blockedNodeIds.length,
    breached: state.breachedNodeIds.length,
    hiddenFrontier,
    deadEnds,
    summary
  };
}

export function recommendBestAction(state: RunState): ActionRecommendation | undefined {
  const completed = new Set(state.completedNodeIds);
  const blocked = new Set(state.blockedNodeIds);
  const breached = new Set(state.breachedNodeIds);
  const goalRoute = routeToGoal(state);
  const goalIndex = new Map(goalRoute.map((node, index) => [node.id, index]));
  const candidates = state.activeNodeIds
    .map((id) => getNode(id))
    .filter(Boolean)
    .filter((node) => !completed.has(node!.id) && !blocked.has(node!.id) && !breached.has(node!.id)) as GraphNode[];

  return candidates
    .map((node) => {
      const revealCount = revealFromNode(node.id, state).length;
      const routeBonus = goalIndex.has(node.id) ? 24 - goalIndex.get(node.id)! * 2 : 0;
      const seedBonus = node.id === state.seedNodeId ? 18 : 0;
      const score = seedBonus + routeBonus + revealCount * 8 + node.links.length * 2 + Math.max(0, 6 - node.tier) * 3;
      const reasonParts = [
        node.id === state.seedNodeId ? "seed anchor" : "",
        revealCount ? `reveals ${revealCount}` : "clears pressure",
        goalIndex.has(node.id) ? "on goal route" : "",
        `${node.links.length} linked pages`
      ].filter(Boolean);
      return { node, score, reason: reasonParts.join(" / ") };
    })
    .sort((a, b) => b.score - a.score || a.node.tier - b.node.tier || a.node.label.localeCompare(b.node.label))[0];
}

export function detectMilestones(state: RunState): RunMilestone[] {
  const completedNodes = state.completedNodeIds.map((id) => getNode(id)).filter(Boolean) as GraphNode[];
  const milestones: RunMilestone[] = [];
  if (completedNodes.length > 0) {
    milestones.push({
      id: "first-completion",
      label: "First breadcrumb sealed",
      detail: `${completedNodes[0].label} proved the run can move.`,
      tone: "gold"
    });
  }
  if (state.revealedNodeIds.length > 1) {
    milestones.push({
      id: "first-reveal",
      label: "First reveal chain",
      detail: `${state.revealedNodeIds.length} legal pages are visible.`,
      tone: "cyan"
    });
  }
  if (completedNodes.some((node) => node.kind === "transport")) {
    milestones.push({
      id: "first-transport",
      label: "Movement web online",
      detail: "A transport breadcrumb is complete.",
      tone: "violet"
    });
  }
  if (completedNodes.some((node) => node.kind === "boss")) {
    milestones.push({
      id: "first-boss",
      label: "First boss branch",
      detail: "PvM is part of the legal atlas now.",
      tone: "red"
    });
  }
  if (completedNodes.some((node) => node.tier >= 4)) {
    milestones.push({
      id: "tier-four-breakthrough",
      label: "Kingdom web breached",
      detail: "A tier 4+ breadcrumb is complete.",
      tone: "green"
    });
  }
  if (state.events.some((event) => event.type === "rescue")) {
    milestones.push({
      id: "first-rescue",
      label: "Archive intervention",
      detail: "A rescue changed the visible frontier.",
      tone: "violet"
    });
  }
  return milestones;
}

export function routeToGoal(state: RunState): GraphNode[] {
  const goal = getNode(state.goalNodeId);
  if (!goal) return [];
  const startIds = state.completedNodeIds.length ? state.completedNodeIds : state.activeNodeIds;
  const queue: string[][] = startIds.map((id) => [id]);
  const seen = new Set(startIds);
  while (queue.length) {
    const path = queue.shift()!;
    const last = path[path.length - 1];
    if (last === goal.id) return path.map((id) => getNode(id)).filter(Boolean) as GraphNode[];
    const node = getNode(last);
    if (!node) continue;
    for (const next of node.links) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push([...path, next]);
    }
  }
  return [goal];
}

export function graphStats(state: RunState) {
  const completed = state.completedNodeIds.length;
  const revealed = state.revealedNodeIds.length;
  const maxTier = Math.max(0, ...state.completedNodeIds.map((id) => getNode(id)?.tier ?? 0));
  const percent = Math.round((completed / GRAPH_NODES.length) * 100);
  return { completed, revealed, maxTier, percent, total: GRAPH_NODES.length };
}

export function createBackup(state: RunState, label = "Manual backup") {
  return {
    id: createId("backup"),
    label,
    createdAt: Date.now(),
    snapshot: JSON.stringify({ ...state, backups: [] })
  };
}

export function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
