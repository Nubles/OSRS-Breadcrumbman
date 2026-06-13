import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { GRAPH_EDGES, GRAPH_NODES, getNode, KIND_LABELS, nodeKindColor, RULE_MODES, STARTER_SEEDS, TIER_NAMES } from "./data";
import {
  completeNode,
  createBackup,
  createEvent,
  createId,
  createStarterState,
  graphStats,
  hydrateState,
  loadState,
  nodeState,
  recommendNext,
  rescueReveal,
  routeToGoal,
  saveState,
  unique
} from "./engine";
import { AppTab, BreachRecord, GraphNode, NodeKind, RuleMode, RunState } from "./types";
import type { WikiGraphData, WikiGraphNode } from "./types";

const tabs: { id: AppTab; label: string; caption: string }[] = [
  { id: "atlas", label: "Atlas", caption: "Reveal and complete nodes" },
  { id: "wiki", label: "Wiki Graph", caption: "Search synced OSRS pages" },
  { id: "pathfinder", label: "Pathfinder", caption: "Plan routes to goals" },
  { id: "ledger", label: "Ledger", caption: "Archive, breaches, saves" },
  { id: "rules", label: "Rules", caption: "Mode variants and codex" }
];

const onboarding = [
  {
    title: "The Wiki Becomes The Map",
    detail: "Breadcrumbman starts from one tiny legal page and grows outward through connected OSRS concepts: quests, items, monsters, shops, regions, transport, bosses, diaries, skills, clues, and raids."
  },
  {
    title: "Every Node Is A Permission",
    detail: "A revealed node is legal to pursue. Complete it, prove the tasks, and the atlas reveals more breadcrumbs from that page."
  },
  {
    title: "Snowball From Seed To Spine",
    detail: "The graph begins with Lumbridge-scale content and grows through transport keystones, questlines, Slayer, clues, bosses, raids, and endgame capstones."
  },
  {
    title: "Dead Ends Are Part Of The Story",
    detail: "If the web gets tight, rescue tokens reveal nearby branches. Strict modes make those rescues rarer and breaches more painful."
  }
];

function formatDate(value: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

function App() {
  const [state, setState] = useState<RunState>(() => loadState());
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [query, setQuery] = useState("");
  const [wikiQuery, setWikiQuery] = useState("");
  const [wikiKindFilter, setWikiKindFilter] = useState<NodeKind | "all">("all");
  const [selectedWikiId, setSelectedWikiId] = useState("");
  const [wikiGraph, setWikiGraph] = useState<WikiGraphData | null>(null);
  const [kindFilter, setKindFilter] = useState<NodeKind | "all">("all");
  const [breachDraft, setBreachDraft] = useState({ title: "", penalty: "", nodeId: "" });
  const importRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => saveState(state), [state]);
  useEffect(() => {
    fetch(`${BASE_URL}wiki-graph.json`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: WikiGraphData | null) => {
        if (!data || !Array.isArray(data.nodes)) return;
        setWikiGraph(data);
        setSelectedWikiId(data.nodes[0]?.id || "");
      })
      .catch(() => undefined);
  }, []);

  const selectedNode = getNode(state.selectedNodeId) || getNode(state.seedNodeId) || GRAPH_NODES[0];
  const stats = graphStats(state);
  const recommendations = recommendNext(state);
  const route = routeToGoal(state);
  const visibleNodes = GRAPH_NODES.filter((node) => nodeState(node, state) !== "hidden");
  const filteredNodes = visibleNodes.filter((node) => {
    const haystack = `${node.label} ${node.kind} ${node.region} ${node.summary} ${node.tags.join(" ")}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (kindFilter === "all" || node.kind === kindFilter);
  });
  const completedNodes = state.completedNodeIds.map((id) => getNode(id)).filter(Boolean) as GraphNode[];
  const goalNode = getNode(state.goalNodeId) || getNode("completion-cape")!;
  const wikiNodes = wikiGraph?.nodes || [];
  const wikiNodeMap = useMemo(() => new Map(wikiNodes.map((node) => [node.id, node])), [wikiNodes]);
  const selectedWikiNode = wikiNodeMap.get(selectedWikiId) || wikiNodes[0];
  const kindCounts = useMemo(() => {
    const counts = new Map<NodeKind, number>();
    for (const node of wikiNodes) counts.set(node.kind, (counts.get(node.kind) || 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [wikiNodes]);
  const campaignHealth = Math.min(100, Math.round((stats.completed * 4 + stats.revealed * 1.4 + state.rescueTokens * 6 + stats.maxTier * 8) / 2));
  const nextBest = recommendations.slice().sort((a, b) => a.tier - b.tier || b.links.length - a.links.length)[0];
  const nearestGoalStep = route.find((node) => !state.completedNodeIds.includes(node.id)) || goalNode;
  const filteredWikiNodes = wikiNodes
    .filter((node) => {
      const haystack = `${node.title} ${node.kind} ${node.summary} ${node.categories.join(" ")}`.toLowerCase();
      return haystack.includes(wikiQuery.toLowerCase()) && (wikiKindFilter === "all" || node.kind === wikiKindFilter);
    })
    .sort((a, b) => b.inbound + b.outbound - (a.inbound + a.outbound))
    .slice(0, 300);

  function patchState(updater: (current: RunState) => RunState) {
    setState((current) => updater(current));
  }

  function chooseSeed(seedId: string) {
    setState(createStarterState(seedId));
  }

  function completeSelected() {
    if (!selectedNode) return;
    patchState((current) => completeNode(current, selectedNode.id));
  }

  function markActive(nodeId: string) {
    patchState((current) => ({
      ...current,
      selectedNodeId: nodeId,
      activeNodeIds: unique([...current.activeNodeIds, nodeId]),
      revealedNodeIds: unique([...current.revealedNodeIds, nodeId])
    }));
  }

  function addBreach() {
    if (!breachDraft.title.trim()) return;
    const related = breachDraft.nodeId || selectedNode.id;
    const breach: BreachRecord = {
      id: createId("breach"),
      nodeId: related,
      title: breachDraft.title,
      penalty: breachDraft.penalty || "Complete one adjacent legal breadcrumb before continuing this branch.",
      resolved: false,
      createdAt: Date.now()
    };
    patchState((current) => ({
      ...current,
      breachedNodeIds: unique([...current.breachedNodeIds, related]),
      breaches: [breach, ...current.breaches],
      events: [
        createEvent({
          type: "breach",
          title: "Breach recorded",
          detail: `${breach.title}: ${breach.penalty}`,
          nodeId: related
        }),
        ...current.events
      ]
    }));
    setBreachDraft({ title: "", penalty: "", nodeId: "" });
  }

  function resolveBreach(id: string) {
    patchState((current) => ({
      ...current,
      breaches: current.breaches.map((breach) =>
        breach.id === id ? { ...breach, resolved: true, resolvedAt: Date.now() } : breach
      )
    }));
  }

  function backupNow() {
    patchState((current) => ({ ...current, backups: [createBackup(current), ...current.backups].slice(0, 8) }));
  }

  function exportSave() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `breadcrumbman-atlas-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function importSave(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = hydrateState(JSON.parse(String(reader.result)));
        setState({ ...imported, backups: [createBackup(state, "Before import"), ...state.backups].slice(0, 8) });
      } catch {
        window.alert("That Breadcrumbman save could not be imported.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function restoreBackup(snapshot: string) {
    const restored = hydrateState(JSON.parse(snapshot));
    setState({ ...restored, backups: state.backups });
  }

  function resetRun() {
    const confirmed = window.confirm("Reset Breadcrumbman and keep a backup of this atlas?");
    if (!confirmed) return;
    setState((current) => ({ ...createStarterState(current.seedNodeId || "lumbridge"), backups: [createBackup(current, "Before reset"), ...current.backups].slice(0, 8) }));
  }

  if (!state.hasSeenOnboarding) {
    const step = onboarding[onboardingStep];
    return (
      <main className="onboarding">
        <section className="onboarding-card">
          <div className="atlas-hero">
            <div className="hero-node main">Lumbridge</div>
            <div className="hero-node n1">Goblin</div>
            <div className="hero-node n2">Cook's Assistant</div>
            <div className="hero-node n3">Fairy rings</div>
            <div className="hero-node n4">Raids</div>
          </div>
          <div>
            <p className="eyebrow">Breadcrumbman briefing {onboardingStep + 1}/4</p>
            <h1>{step.title}</h1>
            <p className="lead">{step.detail}</p>
            <div className="seed-strip">
              {STARTER_SEEDS.map((seed) => {
                const node = getNode(seed)!;
                return <button key={seed} onClick={() => chooseSeed(seed)}>{node.label}</button>;
              })}
            </div>
            <div className="onboarding-actions">
              <button disabled={onboardingStep === 0} onClick={() => setOnboardingStep((value) => Math.max(0, value - 1))}>
                Back
              </button>
              {onboardingStep < onboarding.length - 1 ? (
                <button className="primary" onClick={() => setOnboardingStep((value) => value + 1)}>Next page</button>
              ) : (
                <button className="primary" onClick={() => patchState((current) => ({ ...current, hasSeenOnboarding: true }))}>
                  Open Atlas
                </button>
              )}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <section className="hero-dashboard">
        <div className="hero-copy">
          <span className="atlas-mark">Wiki snowball mode</span>
          <h1>Breadcrumbman Atlas</h1>
          <p>Start with a single OSRS page, reveal connected knowledge, and turn the entire wiki into a living progression web.</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => patchState((current) => ({ ...current, activeTab: "atlas" }))}>Open live atlas</button>
            <button onClick={() => patchState((current) => ({ ...current, activeTab: "wiki" }))}>Search wiki graph</button>
          </div>
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <span className="orbit-node seed">Seed</span>
          <span className="orbit-node quest">Quest</span>
          <span className="orbit-node boss">Boss</span>
          <span className="orbit-node raid">Raid</span>
          <span className="orbit-line l1" />
          <span className="orbit-line l2" />
          <span className="orbit-line l3" />
        </div>
        <div className="hero-metrics">
          <article><span>Campaign health</span><strong>{campaignHealth}%</strong></article>
          <article><span>Next branch</span><strong>{nextBest?.label || "Choose seed"}</strong></article>
          <article><span>Goal step</span><strong>{nearestGoalStep.label}</strong></article>
          <article><span>Wiki layer</span><strong>{wikiGraph?.pageCount || 0} pages</strong></article>
        </div>
      </section>

      <header className="command-header">
        <div className="brand-lockup">
          <div className="brand-seal">BM</div>
          <div>
            <h1>Breadcrumbman Atlas</h1>
            <p>The OSRS Wiki as a snowballing progression web, from one tiny seed to endgame capstones.</p>
          </div>
        </div>
        <section className="resource-bar">
          <article><span>Completed</span><strong>{stats.completed}/{stats.total}</strong></article>
          <article><span>Revealed</span><strong>{stats.revealed}</strong></article>
          <article><span>Tier</span><strong>{TIER_NAMES[stats.maxTier as keyof typeof TIER_NAMES]}</strong></article>
          <article><span>Rescues</span><strong>{state.rescueTokens}</strong></article>
        </section>
        <div className="save-actions">
          <button onClick={backupNow}>Backup</button>
          <button onClick={exportSave}>Export</button>
          <button onClick={() => importRef.current?.click()}>Import</button>
          <input ref={importRef} className="hidden-input" type="file" accept="application/json" onChange={importSave} />
          <button className="danger" onClick={resetRun}>Reset</button>
        </div>
      </header>

      <section className="progress-ribbon">
        <div>
          <span>Run</span>
          <input value={state.runName} onChange={(event) => patchState((current) => ({ ...current, runName: event.target.value }))} />
        </div>
        <div>
          <span>Rule mode</span>
          <select value={state.ruleMode} onChange={(event) => patchState((current) => ({ ...current, ruleMode: event.target.value as RuleMode }))}>
            {Object.entries(RULE_MODES).map(([id, mode]) => <option key={id} value={id}>{mode.label}</option>)}
          </select>
        </div>
        <div>
          <span>Goal</span>
          <select value={state.goalNodeId} onChange={(event) => patchState((current) => ({ ...current, goalNodeId: event.target.value }))}>
            {GRAPH_NODES.filter((node) => node.tier >= 4).map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}
          </select>
        </div>
        <div>
          <span>Atlas completion</span>
          <strong>{stats.percent}%</strong>
        </div>
      </section>

      <section className="insight-strip">
        <article>
          <span>Current seed</span>
          <strong>{getNode(state.seedNodeId)?.label || "Lumbridge"}</strong>
          <small>The root of this account's legal knowledge web.</small>
        </article>
        <article>
          <span>Frontier pressure</span>
          <strong>{state.activeNodeIds.filter((id) => !state.completedNodeIds.includes(id)).length} open</strong>
          <small>Active breadcrumbs waiting to be completed.</small>
        </article>
        <article>
          <span>Scholar favour</span>
          <strong>{state.scholarFavour}</strong>
          <small>Earned by completing higher-tier pages.</small>
        </article>
        <article>
          <span>Wiki density</span>
          <strong>{wikiGraph ? Math.round(wikiGraph.edgeCount / Math.max(1, wikiGraph.pageCount)) : 0}/page</strong>
          <small>Average synced links per wiki page.</small>
        </article>
      </section>

      <nav className="tab-bar" aria-label="Breadcrumbman sections">
        {tabs.map((tab) => (
          <button key={tab.id} className={state.activeTab === tab.id ? "active" : ""} onClick={() => patchState((current) => ({ ...current, activeTab: tab.id }))}>
            <span>{tab.label}</span>
            <small>{tab.caption}</small>
          </button>
        ))}
      </nav>

      <main>
        {state.activeTab === "atlas" && (
          <section className="atlas-layout">
            <div className="atlas-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Live atlas</p>
                  <h2>Legal breadcrumb web</h2>
                  <p>Complete active nodes to reveal more wiki-style branches. Hidden nodes stay off-limits.</p>
                </div>
                <div className="filter-row">
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search visible nodes" />
                  <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value as NodeKind | "all")}>
                    <option value="all">All types</option>
                    {Object.entries(KIND_LABELS).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}
                  </select>
                </div>
              </div>
              <div className="atlas-toolbar">
                <article><span>Visible</span><strong>{visibleNodes.length}</strong></article>
                <article><span>Filtered</span><strong>{filteredNodes.length}</strong></article>
                <article><span>Edges</span><strong>{GRAPH_EDGES.length}</strong></article>
                <article><span>Mode</span><strong>{RULE_MODES[state.ruleMode].label}</strong></article>
              </div>
              <GraphCanvas state={state} nodes={filteredNodes} onSelect={(id) => patchState((current) => ({ ...current, selectedNodeId: id }))} />
            </div>
            <NodeInspector
              node={selectedNode}
              state={state}
              onComplete={completeSelected}
              onActivate={markActive}
              onRescue={() => patchState(rescueReveal)}
            />
          </section>
        )}

        {state.activeTab === "wiki" && (
          <section className="wiki-layout">
            <article className="panel wiki-command">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Synced wiki layer</p>
                  <h2>OSRS Wiki graph foundation</h2>
                  <p>The curated atlas stays playable. This generated layer is the path toward whole-wiki coverage: searchable pages, categories, links, and future reveal candidates.</p>
                </div>
              </div>
              <div className="wiki-stats">
                <article><span>Pages</span><strong>{wikiGraph?.pageCount || 0}</strong></article>
                <article><span>Links</span><strong>{wikiGraph?.edgeCount || 0}</strong></article>
                <article><span>Categories</span><strong>{Object.keys(wikiGraph?.categories || {}).length}</strong></article>
                <article><span>Generated</span><strong>{wikiGraph?.generatedAt === "not-synced" ? "Pending" : "Synced"}</strong></article>
              </div>
              <div className="kind-spectrum">
                {kindCounts.slice(0, 10).map(([kind, count]) => (
                  <button key={kind} onClick={() => setWikiKindFilter(kind)}>
                    <span style={{ background: nodeKindColor(kind), width: `${Math.max(16, Math.min(100, count / Math.max(1, wikiNodes.length) * 280))}%` }} />
                    <strong>{KIND_LABELS[kind]}</strong>
                    <small>{count}</small>
                  </button>
                ))}
              </div>
              <div className="filter-row">
                <input value={wikiQuery} onChange={(event) => setWikiQuery(event.target.value)} placeholder="Search wiki pages, categories, summaries" />
                <select value={wikiKindFilter} onChange={(event) => setWikiKindFilter(event.target.value as NodeKind | "all")}>
                  <option value="all">All wiki types</option>
                  {Object.entries(KIND_LABELS).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}
                </select>
              </div>
              <div className="wiki-results">
                {filteredWikiNodes.map((node) => (
                  <button key={node.id} className={selectedWikiNode?.id === node.id ? "selected" : ""} onClick={() => setSelectedWikiId(node.id)}>
                    <span style={{ color: nodeKindColor(node.kind) }}>{KIND_LABELS[node.kind]}</span>
                    <strong>{node.title}</strong>
                    <small>{node.inbound} in / {node.outbound} out / Tier {node.tier}</small>
                  </button>
                ))}
              </div>
            </article>
            <WikiInspector node={selectedWikiNode} nodeMap={wikiNodeMap} onPick={setSelectedWikiId} />
          </section>
        )}

        {state.activeTab === "pathfinder" && (
          <section className="pathfinder-layout">
            <article className="panel">
              <p className="eyebrow">Recommendations</p>
              <h2>What can I do next?</h2>
              <div className="recommendation-grid">
                {recommendations.slice(0, 12).map((node) => (
                  <button key={node.id} className="recommendation-card" onClick={() => patchState((current) => ({ ...current, activeTab: "atlas", selectedNodeId: node.id }))}>
                    <span style={{ color: nodeKindColor(node.kind) }}>{KIND_LABELS[node.kind]}</span>
                    <strong>{node.label}</strong>
                    <small>{TIER_NAMES[node.tier]} / {node.region}</small>
                    <p>{node.summary}</p>
                  </button>
                ))}
              </div>
            </article>
            <article className="panel route-panel">
              <p className="eyebrow">Route planner</p>
              <h2>Path to {goalNode.label}</h2>
              <div className="route-chain">
                {route.map((node, index) => (
                  <button key={`${node.id}-${index}`} onClick={() => patchState((current) => ({ ...current, activeTab: "atlas", selectedNodeId: node.id }))}>
                    <span>{index + 1}</span>
                    <strong>{node.label}</strong>
                    <small>{KIND_LABELS[node.kind]} / {TIER_NAMES[node.tier]}</small>
                  </button>
                ))}
              </div>
            </article>
          </section>
        )}

        {state.activeTab === "ledger" && (
          <section className="ledger-layout">
            <article className="panel">
              <p className="eyebrow">Legal archive</p>
              <h2>Completed breadcrumbs</h2>
              <div className="archive-grid">
                {completedNodes.map((node) => (
                  <button key={node.id} className="archive-card" onClick={() => patchState((current) => ({ ...current, activeTab: "atlas", selectedNodeId: node.id }))}>
                    <span style={{ color: nodeKindColor(node.kind) }}>{KIND_LABELS[node.kind]}</span>
                    <strong>{node.label}</strong>
                    <small>{node.region} / {TIER_NAMES[node.tier]}</small>
                  </button>
                ))}
              </div>
            </article>
            <article className="panel">
              <p className="eyebrow">Breach desk</p>
              <h2>Keep mistakes playable</h2>
              <div className="breach-form">
                <input value={breachDraft.title} onChange={(event) => setBreachDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Used a locked teleport" />
                <select value={breachDraft.nodeId} onChange={(event) => setBreachDraft((current) => ({ ...current, nodeId: event.target.value }))}>
                  <option value="">Selected node</option>
                  {visibleNodes.map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}
                </select>
                <textarea value={breachDraft.penalty} onChange={(event) => setBreachDraft((current) => ({ ...current, penalty: event.target.value }))} placeholder="Penalty or atonement task" />
                <button className="primary" onClick={addBreach}>Record breach</button>
              </div>
              <div className="breach-list">
                {state.breaches.map((breach) => (
                  <article key={breach.id} className={breach.resolved ? "resolved" : ""}>
                    <div>
                      <strong>{breach.title}</strong>
                      <small>{getNode(breach.nodeId)?.label || "General"} / {formatDate(breach.createdAt)}</small>
                      <p>{breach.penalty}</p>
                    </div>
                    {breach.resolved ? <span className="stamp-ok">Resolved</span> : <button onClick={() => resolveBreach(breach.id)}>Resolve</button>}
                  </article>
                ))}
              </div>
            </article>
            <article className="panel wide">
              <p className="eyebrow">Run log</p>
              <h2>Atlas history</h2>
              <div className="event-feed">
                {state.events.map((event) => (
                  <article key={event.id}>
                    <span>{formatDate(event.createdAt)}</span>
                    <strong>{event.title}</strong>
                    <p>{event.detail}</p>
                  </article>
                ))}
              </div>
            </article>
            <article className="panel wide">
              <p className="eyebrow">Backups</p>
              <h2>Recovery shelf</h2>
              <div className="backup-list">
                {state.backups.map((backup) => (
                  <article key={backup.id}>
                    <div>
                      <strong>{backup.label}</strong>
                      <small>{formatDate(backup.createdAt)}</small>
                    </div>
                    <button onClick={() => restoreBackup(backup.snapshot)}>Restore</button>
                  </article>
                ))}
              </div>
            </article>
          </section>
        )}

        {state.activeTab === "rules" && (
          <section className="rules-grid">
            <article className="panel wide">
              <p className="eyebrow">Mode codex</p>
              <h2>Breadcrumbman rules</h2>
              <p>A node is legal when revealed. Completing it opens linked pages. You may only train, fight, buy, travel, quest, or use rewards that connect to your visible graph. Hidden nodes are future knowledge, not current permission.</p>
            </article>
            {Object.entries(RULE_MODES).map(([id, mode]) => (
              <button key={id} className={`mode-card ${state.ruleMode === id ? "selected" : ""}`} onClick={() => patchState((current) => ({ ...current, ruleMode: id as RuleMode }))}>
                <strong>{mode.label}</strong>
                <span>{mode.revealCount} reveals / rescue every {mode.rescueEvery}</span>
                <p>{mode.description}</p>
              </button>
            ))}
            <article className="panel wide">
              <p className="eyebrow">Progression ladder</p>
              <div className="tier-ladder">
                {Object.entries(TIER_NAMES).map(([tier, label]) => (
                  <article key={tier} className={Number(tier) <= stats.maxTier ? "lit" : ""}>
                    <span>Tier {tier}</span>
                    <strong>{label}</strong>
                    <small>{GRAPH_NODES.filter((node) => node.tier === Number(tier)).length} atlas nodes</small>
                  </article>
                ))}
              </div>
            </article>
          </section>
        )}
      </main>
    </div>
  );
}

function GraphCanvas(props: { state: RunState; nodes: GraphNode[]; onSelect: (id: string) => void }) {
  const { state, nodes, onSelect } = props;
  const visible = new Set(nodes.map((node) => node.id));
  const edges = GRAPH_EDGES.filter((edge) => visible.has(edge.from) && visible.has(edge.to));
  return (
    <div className="graph-wrap">
      <svg viewBox="0 0 100 100" role="img" aria-label="Breadcrumbman atlas graph">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="0.9" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {edges.map((edge) => {
          const from = getNode(edge.from)!;
          const to = getNode(edge.to)!;
          const fromState = nodeState(from, state);
          const toState = nodeState(to, state);
          const strong = fromState === "complete" || toState === "complete";
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              className={strong ? "edge strong" : "edge"}
            />
          );
        })}
        {nodes.map((node) => {
          const status = nodeState(node, state);
          return (
            <g key={node.id} className={`graph-node ${status}`} onClick={() => onSelect(node.id)} tabIndex={0} role="button">
              <circle cx={node.x} cy={node.y} r={status === "complete" ? 1.65 : 1.35} fill={nodeKindColor(node.kind)} />
              <circle cx={node.x} cy={node.y} r={status === "active" ? 2.7 : 2.25} />
              <text x={node.x + 2.2} y={node.y + 0.45}>{node.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function NodeInspector(props: {
  node: GraphNode;
  state: RunState;
  onComplete: () => void;
  onActivate: (nodeId: string) => void;
  onRescue: () => void;
}) {
  const { node, state, onComplete, onActivate, onRescue } = props;
  const status = nodeState(node, state);
  const linked = node.links.map((id) => getNode(id)).filter(Boolean) as GraphNode[];
  return (
    <aside className="node-inspector">
      <div className="node-heading">
        <div>
          <p className="eyebrow">{KIND_LABELS[node.kind]} / {node.region}</p>
          <h2>{node.label}</h2>
          <p>{node.summary}</p>
        </div>
        <span className={`node-status ${status}`}>{status}</span>
      </div>
      <section className="task-list">
        <h3>Completion packet</h3>
        {node.tasks.map((task) => <article key={task}>{task}</article>)}
      </section>
      <section className="node-depth">
        <article><span>Tier</span><strong>{TIER_NAMES[node.tier]}</strong></article>
        <article><span>Links</span><strong>{node.links.length}</strong></article>
        <article><span>Tags</span><strong>{node.tags.length}</strong></article>
      </section>
      <section className="unlock-list">
        <h3>Legalizes</h3>
        {node.unlocks.map((unlock) => <span key={unlock}>{unlock}</span>)}
      </section>
      <section className="linked-list">
        <h3>Known links</h3>
        {linked.map((link) => {
          const linkState = nodeState(link, state);
          return (
            <button key={link.id} onClick={() => onActivate(link.id)} className={linkState}>
              <span style={{ color: nodeKindColor(link.kind) }}>{KIND_LABELS[link.kind]}</span>
              <strong>{link.label}</strong>
              <small>{linkState}</small>
            </button>
          );
        })}
      </section>
      <div className="action-row">
        <button className="primary" disabled={status === "complete" || status === "hidden"} onClick={onComplete}>Complete node</button>
        <button disabled={state.rescueTokens <= 0} onClick={onRescue}>Use rescue</button>
      </div>
    </aside>
  );
}

function WikiInspector(props: {
  node?: WikiGraphNode;
  nodeMap: Map<string, WikiGraphNode>;
  onPick: (id: string) => void;
}) {
  const { node, nodeMap, onPick } = props;
  if (!node) {
    return (
      <aside className="node-inspector">
        <p className="eyebrow">Wiki graph</p>
        <h2>No generated wiki data yet</h2>
        <p>Run the wiki sync script to populate the whole-wiki layer.</p>
      </aside>
    );
  }
  const linked = node.links.map((id) => nodeMap.get(id)).filter(Boolean) as WikiGraphNode[];
  return (
    <aside className="node-inspector wiki-inspector">
      <div className="node-heading">
        <div>
          <p className="eyebrow">{KIND_LABELS[node.kind]} / Tier {node.tier}</p>
          <h2>{node.title}</h2>
          <p>{node.summary || "No extract available from the synced graph yet."}</p>
        </div>
      </div>
      <div className="wiki-link-actions">
        <a href={node.url} target="_blank" rel="noreferrer">Open wiki page</a>
      </div>
      <section className="unlock-list">
        <h3>Categories</h3>
        {node.categories.map((category) => <span key={category}>{category.replace(/_/g, " ")}</span>)}
      </section>
      <section className="linked-list">
        <h3>Synced links</h3>
        {linked.slice(0, 40).map((link) => (
          <button key={link.id} onClick={() => onPick(link.id)}>
            <span style={{ color: nodeKindColor(link.kind) }}>{KIND_LABELS[link.kind]}</span>
            <strong>{link.title}</strong>
            <small>{link.inbound + link.outbound}</small>
          </button>
        ))}
      </section>
    </aside>
  );
}

export default App;

const BASE_URL = import.meta.env?.BASE_URL || "/";
