export type NodeKind =
  | "seed"
  | "region"
  | "quest"
  | "item"
  | "monster"
  | "shop"
  | "skill"
  | "transport"
  | "guild"
  | "minigame"
  | "boss"
  | "diary"
  | "clue"
  | "raid"
  | "milestone";

export type ProgressTier = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type NodeState = "hidden" | "revealed" | "active" | "complete" | "blocked" | "breached";
export type RuleMode = "cozy" | "standard" | "strict" | "brutal";
export type AppTab = "atlas" | "wiki" | "pathfinder" | "ledger" | "rules";

export interface WikiGraphNode {
  id: string;
  title: string;
  kind: NodeKind;
  tier: ProgressTier;
  completion?: "playable";
  summary: string;
  url: string;
  categories: string[];
  links: string[];
  inbound: number;
  outbound: number;
}

export interface ExcludedWikiPage {
  id: string;
  title: string;
  kind: NodeKind;
  reason: string;
  url: string;
  summary: string;
}

export interface WikiGraphData {
  generatedAt: string;
  source: string;
  policy?: string;
  pageCount: number;
  playableCount?: number;
  excludedCount?: number;
  edgeCount: number;
  categories: Record<string, number>;
  excluded?: ExcludedWikiPage[];
  nodes: WikiGraphNode[];
}

export interface GraphNode {
  id: string;
  label: string;
  kind: NodeKind;
  tier: ProgressTier;
  region: string;
  summary: string;
  tasks: string[];
  unlocks: string[];
  links: string[];
  tags: string[];
  x: number;
  y: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  reason: string;
}

export interface BreadcrumbEvent {
  id: string;
  type: "seed" | "reveal" | "complete" | "breach" | "rescue" | "goal" | "note";
  title: string;
  detail: string;
  createdAt: number;
  nodeId?: string;
}

export interface BreachRecord {
  id: string;
  nodeId?: string;
  title: string;
  penalty: string;
  resolved: boolean;
  createdAt: number;
  resolvedAt?: number;
}

export interface BackupRecord {
  id: string;
  label: string;
  createdAt: number;
  snapshot: string;
}

export interface RunState {
  runName: string;
  ruleMode: RuleMode;
  activeTab: AppTab;
  selectedNodeId: string;
  goalNodeId: string;
  seedNodeId?: string;
  revealedNodeIds: string[];
  activeNodeIds: string[];
  completedNodeIds: string[];
  blockedNodeIds: string[];
  breachedNodeIds: string[];
  rescueTokens: number;
  scholarFavour: number;
  hasSeenOnboarding: boolean;
  events: BreadcrumbEvent[];
  breaches: BreachRecord[];
  backups: BackupRecord[];
}
