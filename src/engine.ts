import { GRAPH_NODES, getLinkedNodes, getNode, RULE_MODES, STARTER_SEEDS } from "./data";
import { BreadcrumbEvent, GraphNode, NodeState, RunState } from "./types";

const STORAGE_KEY = "breadcrumbman-atlas-v1";

export const defaultState: RunState = {
  runName: "Breadcrumbman Atlas",
  ruleMode: "standard",
  activeTab: "atlas",
  selectedNodeId: "lumbridge",
  goalNodeId: "completion-cape",
  seedNodeId: undefined,
  revealedNodeIds: [],
  activeNodeIds: [],
  completedNodeIds: [],
  blockedNodeIds: [],
  breachedNodeIds: [],
  rescueTokens: 1,
  scholarFavour: 0,
  hasSeenOnboarding: false,
  events: [],
  breaches: [],
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
    revealedNodeIds: Array.isArray(input.revealedNodeIds) ? input.revealedNodeIds : [],
    activeNodeIds: Array.isArray(input.activeNodeIds) ? input.activeNodeIds : [],
    completedNodeIds: Array.isArray(input.completedNodeIds) ? input.completedNodeIds : [],
    blockedNodeIds: Array.isArray(input.blockedNodeIds) ? input.blockedNodeIds : [],
    breachedNodeIds: Array.isArray(input.breachedNodeIds) ? input.breachedNodeIds : [],
    events: Array.isArray(input.events) ? input.events : [],
    breaches: Array.isArray(input.breaches) ? input.breaches : [],
    backups: Array.isArray(input.backups) ? input.backups : []
  };
}

export function createStarterState(seedId = STARTER_SEEDS[0]): RunState {
  const seed = getNode(seedId) || getNode("lumbridge")!;
  const starterReveal = revealFromNode(seed.id, defaultState, true);
  return {
    ...defaultState,
    seedNodeId: seed.id,
    selectedNodeId: seed.id,
    revealedNodeIds: unique([seed.id, ...starterReveal.map((node) => node.id)]),
    activeNodeIds: [seed.id],
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
  if (typeof window === "undefined") return createStarterState();
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return createStarterState();
  try {
    return hydrateState(JSON.parse(stored));
  } catch {
    return createStarterState();
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
