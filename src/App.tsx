import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { GRAPH_EDGES, GRAPH_NODES, getNode, KIND_LABELS, nodeKindColor, RULE_MODES, STARTER_SEEDS, TIER_NAMES } from "./data";
import {
  completeNode,
  createBackup,
  createEvent,
  createId,
  createStarterState,
  analyzeFrontierPressure,
  detectMilestones,
  graphStats,
  hydrateState,
  loadState,
  nodeState,
  recommendBestAction,
  recommendNext,
  rescueReveal,
  routeToGoal,
  saveState,
  unique
} from "./engine";
import { BreachRecord, GraphNode, NodeKind, RuleMode, RunState } from "./types";

function formatDate(value: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

// Custom SVG Icons
function CoinsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="#d9a84f">
      <ellipse cx="12" cy="6" rx="6" ry="2" />
      <path d="M6 6v4c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V6" />
      <path d="M6 10v4c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-4" />
      <path d="M6 14v4c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-4" />
    </svg>
  );
}

function LampIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="#62bfd6" stroke="#111" strokeWidth="1">
      <path d="M12 2C9 2 7 4 7 7c0 3 2.5 5 2.5 7h5c0-2 2.5-4 2.5-7 0-3-2-5-5-5z" />
      <rect x="9.5" y="14" width="5" height="2" rx="0.5" fill="#a17be8" />
      <path d="M8 17h8v3H8z" fill="#d9a84f" />
    </svg>
  );
}

function TeleportIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#a98be4" strokeWidth="2">
      <circle cx="12" cy="12" r="9" strokeDasharray="3,3" />
      <circle cx="12" cy="12" r="6" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function RelicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="#d95c50">
      <path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-1 9H7V9h10v2zm0 4H7v-2h10v2z" />
    </svg>
  );
}

function DefaultPacketIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="#ece7db">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

function getPacketIcon(type: string) {
  switch (type) {
    case "coins": return <CoinsIcon />;
    case "lamp": return <LampIcon />;
    case "teleport": return <TeleportIcon />;
    case "relic": return <RelicIcon />;
    default: return <DefaultPacketIcon />;
  }
}

function App() {
  const [state, setState] = useState<RunState>(() => loadState());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<NodeKind | "all">("all");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [showCompleted, setShowCompleted] = useState(true);
  const [showBreached, setShowBreached] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showBreachModal, setShowBreachModal] = useState(false);
  
  const [runRules, setRunRules] = useState<{ name: string; enabled: boolean }[]>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("breadcrumbman-run-rules");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {}
      }
    }
    return [
      { name: "No Trading", enabled: false },
      { name: "No GE", enabled: false },
      { name: "No Grand Exchange", enabled: false },
      { name: "No Treasure Trails", enabled: false },
      { name: "No Minigames (Except...", enabled: false },
      { name: "No Slayer Unlocks", enabled: false },
      { name: "No PvP", enabled: false },
      { name: "Ironman Mode", enabled: true }
    ];
  });

  const [customRules, setCustomRules] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("breadcrumbman-custom-rules") || "";
    }
    return "";
  });

  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean[]>>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("breadcrumbman-checked-tasks");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {}
      }
    }
    return {};
  });

  const [timeText, setTimeText] = useState("Just now");
  const [lastSaved, setLastSaved] = useState<number>(Date.now());

  const importRef = useRef<HTMLInputElement | null>(null);

  // Save state and update lastSaved timestamp
  useEffect(() => {
    saveState(state);
    setLastSaved(Date.now());
  }, [state]);

  // Persist runRules
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("breadcrumbman-run-rules", JSON.stringify(runRules));
    }
  }, [runRules]);

  // Persist customRules
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("breadcrumbman-custom-rules", customRules);
    }
  }, [customRules]);

  // Persist checkedTasks
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("breadcrumbman-checked-tasks", JSON.stringify(checkedTasks));
    }
  }, [checkedTasks]);

  // Dynamically updating relative time clock for Last Save
  useEffect(() => {
    function getRelativeTime(timestamp: number): string {
      const diffMs = Date.now() - timestamp;
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 5) return "Just now";
      if (diffSec < 60) return `${diffSec}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      return `${diffHr}h ago`;
    }
    const update = () => {
      setTimeText(getRelativeTime(lastSaved));
    };
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [lastSaved]);

  // Compute stats
  const stats = graphStats(state);
  const pressure = analyzeFrontierPressure(state);
  const bestAction = recommendBestAction(state);
  const milestones = detectMilestones(state);
  const route = routeToGoal(state);

  const selectedNode = getNode(state.selectedNodeId) || getNode("lumbridge")!;
  const linkedNodes = selectedNode.links.map(id => getNode(id)).filter(Boolean) as GraphNode[];

  const discoveredCount = state.revealedNodeIds.length;
  const totalProgressPercent = ((discoveredCount / stats.total) * 100).toFixed(1);

  // Dynamic requirements based on checkboxes
  const requirementsList = useMemo(() => {
    const checks = checkedTasks[selectedNode.id] || [];
    const checkedCount = checks.filter(Boolean).length;
    const totalCount = selectedNode.tasks.length;
    const allMet = checkedCount === totalCount;

    if (selectedNode.id === "lumbridge") {
      return [
        { label: "Attack", met: true, isCheck: true },
        { label: "Quests", met: true, isCheck: true },
        { label: "Tasks", met: allMet, value: `${checkedCount} / ${totalCount}` }
      ];
    }
    if (selectedNode.id === "recipe-disaster") {
      return [
        { label: "Cooking (70)", met: true, isCheck: true },
        { label: "Quest Points (175)", met: true, isCheck: true },
        { label: "Tasks", met: allMet, value: `${checkedCount} / ${totalCount}` }
      ];
    }
    return [
      { label: "Prerequisites met", met: true, isCheck: true },
      { label: "Tasks", met: allMet, value: `${checkedCount} / ${totalCount}` }
    ];
  }, [selectedNode.id, selectedNode.tasks, checkedTasks]);

  const nodeProgressPercent = useMemo(() => {
    const tasks = selectedNode.tasks || [];
    if (tasks.length === 0) return 100;
    const checks = checkedTasks[selectedNode.id] || [];
    const checkedCount = checks.filter(Boolean).length;
    return Math.round((checkedCount / tasks.length) * 100);
  }, [selectedNode, checkedTasks]);

  const allTasksDone = useMemo(() => {
    const tasks = selectedNode.tasks || [];
    if (tasks.length === 0) return true;
    const checks = checkedTasks[selectedNode.id] || [];
    return tasks.every((_, idx) => !!checks[idx]);
  }, [selectedNode.id, selectedNode.tasks, checkedTasks]);

  const completionPacketList = useMemo(() => {
    if (selectedNode.id === "lumbridge") {
      return [
        { label: "2,500 Coins", type: "coins" },
        { label: "2,000 XP Lamp", type: "lamp" },
        { label: "1x Teleport", type: "teleport" },
        { label: "Diary Relic", type: "relic" }
      ];
    }
    if (selectedNode.id === "recipe-disaster") {
      return [
        { label: "Barrows Gloves", type: "relic" },
        { label: "20,000 Coins", type: "coins" },
        { label: "XP Lamp", type: "lamp" }
      ];
    }
    return [
      { label: "1,000 Coins", type: "coins" },
      { label: "500 XP Lamp", type: "lamp" }
    ];
  }, [selectedNode.id]);

  const visibleNodes = useMemo(() => {
    return GRAPH_NODES.filter((node) => {
      if (node.tags.includes("dummy")) return false;
      const status = nodeState(node, state);
      if (status === "hidden") return false;
      if (status === "complete" && !showCompleted) return false;
      if (status === "breached" && !showBreached) return false;

      if (selectedType !== "all" && node.kind !== selectedType) return false;
      if (selectedRegion !== "all" && node.region !== selectedRegion) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return node.label.toLowerCase().includes(q) || node.summary.toLowerCase().includes(q);
      }
      return true;
    });
  }, [state, showCompleted, showBreached, selectedType, selectedRegion, searchQuery]);

  function patchState(updater: (current: RunState) => RunState) {
    setState((current) => updater(current));
  }

  function completeSelected() {
    if (!selectedNode) return;
    patchState((current) => completeNode(current, selectedNode.id));
  }

  function useRescue() {
    if (state.rescueTokens <= 0) return;
    patchState(rescueReveal);
  }

  function toggleRule(index: number) {
    setRunRules(current => current.map((rule, idx) => idx === index ? { ...rule, enabled: !rule.enabled } : rule));
  }

  function toggleTaskChecked(nodeId: string, idx: number) {
    setCheckedTasks((current) => {
      const currentChecks = current[nodeId] ? [...current[nodeId]] : [];
      while (currentChecks.length <= idx) {
        currentChecks.push(false);
      }
      currentChecks[idx] = !currentChecks[idx];
      return {
        ...current,
        [nodeId]: currentChecks
      };
    });
  }

  function addBreach(title: string, nodeId: string | undefined, penalty: string) {
    const newBreach: BreachRecord = {
      id: createId("breach"),
      nodeId: nodeId || undefined,
      title: title || (nodeId ? (getNode(nodeId)?.label || "Unknown Node") : "General Breach"),
      penalty,
      resolved: false,
      createdAt: Date.now()
    };
    
    patchState((current) => {
      const nextBreaches = [newBreach, ...current.breaches];
      const nextBreachedNodes = nodeId 
        ? unique([...current.breachedNodeIds, nodeId]) 
        : current.breachedNodeIds;
      
      const newEv = createEvent({
        type: "breach",
        title: "Breach spawned at",
        detail: newBreach.title,
        nodeId: nodeId
      });
      
      return {
        ...current,
        breaches: nextBreaches,
        breachedNodeIds: nextBreachedNodes,
        events: [newEv, ...current.events].slice(0, 120)
      };
    });
  }

  function resolveBreach(breachId: string) {
    patchState((current) => {
      const breach = current.breaches.find((b) => b.id === breachId);
      if (!breach) return current;
      
      const nextBreaches = current.breaches.map((b) => 
        b.id === breachId ? { ...b, resolved: true, resolvedAt: Date.now() } : b
      );
      
      const nextBreachedNodes = breach.nodeId
        ? current.breachedNodeIds.filter((id) => id !== breach.nodeId)
        : current.breachedNodeIds;
        
      const newEv = createEvent({
        type: "rescue",
        title: "Breach resolved",
        detail: breach.title,
        nodeId: breach.nodeId
      });
      
      return {
        ...current,
        breaches: nextBreaches,
        breachedNodeIds: nextBreachedNodes,
        events: [newEv, ...current.events].slice(0, 120)
      };
    });
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
        setState(imported);
      } catch {
        window.alert("Save import failed.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  return (
    <div className="app-shell">
      {/* Top Cockpit Header */}
      <header className="cockpit-topbar">
        <div className="cockpit-brand">
          {/* OSRS Golden Compass Seal */}
          <div className="brand-seal">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="#d9a84f">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.5V13h3.5v-2H13V7.5h-2V11H7.5v2H11v3.5z" />
            </svg>
          </div>
          <div>
            <span>Breadcrumbman Atlas</span>
            <strong>OSRS Wiki-Graph Progression Mode</strong>
          </div>
        </div>

        {/* Header Metrics */}
        <section className="cockpit-resources">
          <article className="metric-box progress-box">
            <span>Total Progress</span>
            <div className="progress-value-row">
              <CoinsIcon />
              <strong>{totalProgressPercent}%</strong>
            </div>
            <div className="header-progress-track">
              <div className="header-progress-fill" style={{ width: `${totalProgressPercent}%` }} />
            </div>
          </article>
          
          <article className="metric-box">
            <span>Nodes Discovered</span>
            <div className="metric-content">
              <span className="metric-icon">📖</span>
              <strong>{discoveredCount} / {stats.total}</strong>
            </div>
          </article>
          
          <article className="metric-box">
            <span>Completed</span>
            <div className="metric-content">
              <span className="metric-icon text-green">✓</span>
              <strong>{state.completedNodeIds.length}</strong>
            </div>
          </article>

          <article className="metric-box">
            <span>Breached</span>
            <div className="metric-content">
              <span className="metric-icon text-red">⚔</span>
              <strong>{state.breachedNodeIds.length}</strong>
            </div>
          </article>

          <article className="metric-box">
            <span>Rescue Tokens</span>
            <div className="metric-content">
              <span className="metric-icon text-cyan">⭕</span>
              <strong>{state.rescueTokens} / 3</strong>
            </div>
          </article>

          <article className="metric-box">
            <span>Scholar Favour</span>
            <div className="metric-content">
              <span className="metric-icon text-purple">✦</span>
              <strong>{state.scholarFavour.toFixed(1)}%</strong>
            </div>
          </article>

          <div className="header-save-section">
            <span className="save-time">
              <span className="clock-icon">🕒</span> Last Save <strong className="time-val">{timeText}</strong>
            </span>
            <button className="settings-gear" onClick={() => setShowGuide(true)} style={{ gap: "4px", padding: "0 8px", fontSize: "0.8rem", display: "flex", alignItems: "center" }}>📖 Guide</button>
            <button className="settings-gear" onClick={() => setShowSettings(!showSettings)}>⚙</button>
          </div>
        </section>
      </header>

      {/* Settings Panel Toggle */}
      {showSettings && (
        <section className="settings-dropdown" style={{ display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: "0.8rem", color: "var(--gold)", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.05em" }}>Rule Mode</h3>
              <select
                value={state.ruleMode}
                onChange={(e) => patchState(current => ({ ...current, ruleMode: e.target.value as RuleMode }))}
                style={{
                  background: "#1b1915",
                  border: "1px solid var(--border)",
                  borderRadius: "4px",
                  padding: "6px 12px",
                  color: "var(--text)",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                <option value="cozy">Cozy Scholar</option>
                <option value="standard">Standard</option>
                <option value="strict">Strict Archivist</option>
                <option value="brutal">Brutal Manuscript</option>
              </select>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", maxWidth: "300px", marginTop: "16px" }}>
              {RULE_MODES[state.ruleMode].description}
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: "0.8rem", color: "var(--gold)", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.05em" }}>Save & Recovery</h3>
            <div className="settings-actions">
              <button onClick={() => patchState(current => ({ ...current, backups: [createBackup(current), ...current.backups].slice(0, 5) }))}>Backup</button>
              <button onClick={exportSave}>Export Save</button>
              <button onClick={() => importRef.current?.click()}>Import Save</button>
              <input ref={importRef} className="hidden" type="file" accept="application/json" onChange={importSave} />
              <button className="danger" onClick={() => { if (window.confirm("Reset run?")) setState(createStarterState()); }}>Reset Run</button>
            </div>
          </div>
        </section>
      )}

      {/* 3-Column Workspace Layout */}
      <div className="dashboard-grid">
        
        {/* Left Column */}
        <aside className="left-sidebar">
          {/* Do This Next Panel */}
          <article className="sidebar-card do-this-next">
            <p className="sidebar-eyebrow">Do this next</p>
            <div className="do-this-next-header">
              <div className="node-kind-badge bg-diary">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5z" />
                </svg>
              </div>
              <div className="do-this-next-title">
                <h3>{bestAction?.node.label || "Lumbridge Hard Diary"}</h3>
                <span className="node-type-label">(Task)</span>
              </div>
              <span className="badge-legal">Legal</span>
            </div>
            
            <div className="do-this-next-body">
              <div className="detail-row">
                <span className="label">Why?</span>
                <span className="value">Opens 6 nodes</span>
              </div>
              <div className="detail-row">
                <span className="label">Leads to:</span>
                <span className="value text-purple clickable" onClick={() => patchState(c => ({ ...c, selectedNodeId: "recipe-disaster" }))}>Recipe for Disaster</span>
              </div>

              <div className="requirements-summary">
                <span className="req-header">Requirements</span>
                <div className="req-badges">
                  <span className="req-badge met">✓ 41 Quests</span>
                  <span className="req-badge">15 Tasks</span>
                </div>
              </div>

              <div className="effort-meter">
                <div className="effort-labels">
                  <span>Estimated Effort</span>
                  <strong>Medium (20-30m)</strong>
                </div>
                <div className="effort-bar-track">
                  <div className="effort-bar-fill" style={{ width: "50%" }} />
                </div>
              </div>

              <button className="btn-route-cape" onClick={() => patchState(c => ({ ...c, selectedNodeId: "completion-cape" }))}>
                Route to Completion Cape <span>›</span>
              </button>
            </div>
          </article>

          {/* Frontier Pressure Panel */}
          <article className="sidebar-card pressure-panel">
            <div className="sidebar-header-row">
              <h3>Frontier Pressure</h3>
              <span className="help-icon">?</span>
              <strong className="pressure-value text-red">{pressure.level.toUpperCase()} {pressure.score}/100</strong>
            </div>
            
            <div className="pressure-meter-segmented">
              {Array.from({ length: 20 }).map((_, idx) => {
                const step = idx * 5;
                let colorClass = "green";
                if (step >= 45 && step < 70) colorClass = "orange";
                if (step >= 70) colorClass = "red";
                const active = pressure.score >= step;
                return (
                  <span key={idx} className={`segment ${colorClass} ${active ? "active" : ""}`} />
                );
              })}
            </div>
            <p className="pressure-desc">Breaches grow faster at high pressure.</p>
            
            <div className="pressure-effects">
              <span className="effects-title">Pressure Effects</span>
              <div className="effect-item">
                <span className="bullet text-red">✦</span>
                <span className="effect-name">Breaches Spread</span>
                <span className="effect-val text-red">+{Math.round(pressure.score * 0.4)}%</span>
              </div>
              <div className="effect-item">
                <span className="bullet text-purple">✦</span>
                <span className="effect-name">Reveal Cost</span>
                <span className="effect-val text-red">+{Math.round(pressure.score * 0.25)}%</span>
              </div>
              <div className="effect-item">
                <span className="bullet text-cyan">✦</span>
                <span className="effect-name">Rescue Cooldown</span>
                <span className="effect-val text-red">+{Math.round(pressure.score * 0.15)}%</span>
              </div>
            </div>
          </article>

          {/* Rescue Tokens Panel */}
          <article className="sidebar-card tokens-panel">
            <div className="sidebar-header-row">
              <h3>Rescue Tokens</h3>
              <strong className="token-ratio">{state.rescueTokens} / 3</strong>
            </div>
            <div className="token-slots-row">
              {Array.from({ length: 3 }).map((_, idx) => {
                const active = state.rescueTokens > idx;
                return (
                  <div key={idx} className={`token-slot ${active ? "filled" : ""}`}>
                    {active && <div className="token-inner" />}
                  </div>
                );
              })}
            </div>
            <div className="token-timer">
              <span>🕒</span> Next token in: <strong>{RULE_MODES[state.ruleMode].rescueEvery - (state.completedNodeIds.length % RULE_MODES[state.ruleMode].rescueEvery)} completions</strong>
            </div>
          </article>

          {/* Scholar Favour Panel */}
          <article className="sidebar-card favour-panel">
            <div className="sidebar-header-row">
              <h3>Scholar Favour</h3>
              <strong className="favour-val">{state.scholarFavour.toFixed(1)}%</strong>
            </div>
            <div className="favour-slider-wrap">
              <div className="favour-track">
                <div className="favour-fill" style={{ width: `${state.scholarFavour}%` }} />
                <div className="favour-thumb" style={{ left: `${state.scholarFavour}%` }} />
              </div>
              <div className="favour-ticks">
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>
            <div className="favour-reward">
              <span className="reward-icon">✦</span> Next Reward @ 75%: <strong className="text-purple">Reveal Discount II</strong>
            </div>
          </article>

          {/* Milestones Panel */}
          <article className="sidebar-card milestones-panel">
            <h3>Milestones</h3>
            <div className="milestones-list">
              <div className={`milestone-item ${parseFloat(totalProgressPercent) >= 25 ? "met" : ""}`}>
                <span className="badge-pct">25%</span>
                <span className="milestone-name">Novice Cartographer</span>
                <span className="status-icon">{parseFloat(totalProgressPercent) >= 25 ? <span className="text-green">✓</span> : "🔒"}</span>
              </div>
              <div className={`milestone-item ${parseFloat(totalProgressPercent) >= 50 ? "met" : ""}`}>
                <span className="badge-pct">50%</span>
                <span className="milestone-name">Atlas Adept</span>
                <span className="status-icon">{parseFloat(totalProgressPercent) >= 50 ? <span className="text-green">✓</span> : "🔒"}</span>
              </div>
              <div className={`milestone-item ${parseFloat(totalProgressPercent) >= 75 ? "met" : ""}`}>
                <span className="badge-pct">75%</span>
                <span className="milestone-name">Scholar's Ally</span>
                <span className="status-icon">{parseFloat(totalProgressPercent) >= 75 ? <span className="text-green">✓</span> : "🔒"}</span>
              </div>
              <div className={`milestone-item ${parseFloat(totalProgressPercent) >= 100 ? "met" : ""}`}>
                <span className="badge-pct">100%</span>
                <span className="milestone-name">Completion Cape</span>
                <span className="status-icon">{parseFloat(totalProgressPercent) >= 100 ? <span className="text-green">✓</span> : "🔒"}</span>
              </div>
            </div>
          </article>
        </aside>

        {/* Center Column (Graph Area) */}
        <section className="center-column">
          {/* Search and Filters Bar */}
          <div className="filters-bar">
            <div className="search-input-wrap">
              <span className="search-icon">🔍</span>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search nodes..."
              />
            </div>
            
            <button className="btn-filter" onClick={() => setShowSettings(!showSettings)}>
              <span className="icon">☰</span> Filters
            </button>

            <select value={selectedType} onChange={e => setSelectedType(e.target.value as NodeKind | "all")}>
              <option value="all">All Types</option>
              {Object.entries(KIND_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>

            <select value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}>
              <option value="all">All Regions</option>
              <option value="Misthalin">Misthalin</option>
              <option value="Asgarnia">Asgarnia</option>
              <option value="Kandarin">Kandarin</option>
              <option value="Morytania">Morytania</option>
              <option value="Global">Global</option>
            </select>

            <label className="checkbox-wrap">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={e => setShowCompleted(e.target.checked)}
              />
              <span className="checkbox-custom" />
              Show Completed
            </label>

            <label className="checkbox-wrap">
              <input
                type="checkbox"
                checked={showBreached}
                onChange={e => setShowBreached(e.target.checked)}
              />
              <span className="checkbox-custom" />
              Show Breached
            </label>

            <button className="btn-fullscreen">⛶</button>
          </div>

          {/* SVG Map Canvas */}
          <GraphCanvas
            state={state}
            nodes={visibleNodes}
            route={route}
            onSelect={id => patchState(c => ({ ...c, selectedNodeId: id }))}
          />
        </section>

        {/* Right Column (Inspector) */}
        <aside className="right-sidebar">
          <article className="sidebar-card inspector-panel">
            <p className="sidebar-eyebrow">Selected Node</p>
            
            <div className="inspector-node-header">
              <div className="node-kind-badge bg-diary">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5z" />
                </svg>
              </div>
              <div className="inspector-node-title">
                <h2>{selectedNode.label} {state.goalNodeId === selectedNode.id && <span style={{ color: "var(--gold)" }}>⭐</span>}</h2>
                <div className="badge-row">
                  <span className="badge-type">(Task)</span>
                  <span className="badge-status-glow legal">Legal</span>
                </div>
              </div>
            </div>

            <div className="inspector-body">
              <div className="section-title">Description</div>
              <p className="node-desc-text">{selectedNode.summary}</p>

              <div className="unlock-leads-row">
                <div className="stat-card">
                  <span className="icon">📖</span>
                  <div>
                    <span>Unlocks</span>
                    <strong>{selectedNode.unlocks.length} nodes</strong>
                  </div>
                </div>
                <div className="stat-card">
                  <span className="icon">➔</span>
                  <div>
                    <span>Leads to</span>
                    <strong className="text-purple">Recipe for Disaster</strong>
                  </div>
                </div>
              </div>

              <div className="section-title">Requirements</div>
              <div className="reqs-checklist">
                {requirementsList.map((req, idx) => (
                  <div key={idx} className="req-check-row">
                    <span className={`check-indicator ${req.met ? "met" : ""}`}>
                      {req.met ? "✓" : "○"}
                    </span>
                    <span className="req-label">{req.label}</span>
                    {req.value && <strong className="req-val">{req.value}</strong>}
                  </div>
                ))}
              </div>

              <div className="section-title">Tasks Checklist</div>
              <div className="tasks-checklist">
                {selectedNode.tasks.map((task, idx) => {
                  const isChecked = !!checkedTasks[selectedNode.id]?.[idx];
                  return (
                    <label key={idx} className={`task-check-row ${isChecked ? "checked" : ""}`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleTaskChecked(selectedNode.id, idx)}
                      />
                      <span className="task-checkbox-custom" />
                      <span className="task-label">{task}</span>
                    </label>
                  );
                })}
              </div>

              <div className="inspector-progress">
                <div className="progress-label-row">
                  <span>Progress</span>
                  <strong>{nodeProgressPercent}%</strong>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${nodeProgressPercent}%` }} />
                </div>
              </div>

              <div className="section-title">Completion Packet</div>
              <div className="packet-grid">
                {completionPacketList.map((item, idx) => (
                  <div key={idx} className="packet-cell">
                    {getPacketIcon(item.type)}
                    <span className="packet-item-label">{item.label}</span>
                  </div>
                ))}
              </div>

              <div className="inspector-actions" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                  <button
                    className="btn-complete-node"
                    disabled={nodeState(selectedNode, state) === "complete" || !allTasksDone}
                    onClick={completeSelected}
                    style={{ flex: 1.5 }}
                  >
                    Complete Node <span>✓</span>
                  </button>
                  <button
                    className="btn-use-rescue"
                    disabled={state.rescueTokens <= 0}
                    onClick={useRescue}
                    style={{ flex: 1 }}
                  >
                    Use Rescue <span className="rescue-subtext">({state.rescueTokens} tokens)</span>
                  </button>
                </div>
                <button
                  className="btn-target-goal"
                  disabled={state.goalNodeId === selectedNode.id}
                  onClick={() => patchState(c => ({ ...c, goalNodeId: selectedNode.id }))}
                  style={{
                    background: state.goalNodeId === selectedNode.id ? "rgba(217, 168, 79, 0.1)" : "rgba(255, 255, 255, 0.03)",
                    border: state.goalNodeId === selectedNode.id ? "1.5px solid var(--gold)" : "1px solid var(--border)",
                    borderRadius: "4px",
                    color: state.goalNodeId === selectedNode.id ? "var(--gold)" : "var(--text)",
                    fontWeight: 700,
                    padding: "8px",
                    cursor: state.goalNodeId === selectedNode.id ? "default" : "pointer",
                    fontSize: "0.78rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    width: "100%",
                    transition: "all 0.2s"
                  }}
                >
                  {state.goalNodeId === selectedNode.id ? "⭐ Current Goal Node" : "🎯 Target as Goal Node"}
                </button>
              </div>

              <div className="section-title">Linked Nodes ({linkedNodes.length})</div>
              <div className="linked-grid-list">
                {linkedNodes.map(link => {
                  const status = nodeState(link, state);
                  return (
                    <button
                      key={link.id}
                      className={`linked-node-card status-${status}`}
                      onClick={() => patchState(c => ({ ...c, selectedNodeId: link.id }))}
                    >
                      <div className="link-bullet" style={{ background: nodeKindColor(link.kind) }} />
                      <div className="link-info">
                        <strong>{link.label}</strong>
                        <span>({KIND_LABELS[link.kind]})</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </article>
        </aside>
      </div>

      {/* Bottom Row Dashboard Panel */}
      <footer className="bottom-dashboard">
        {/* Recent Reveal Events */}
        <section className="bottom-card events-feed-card">
          <h3>Recent Reveal Events</h3>
          <div className="bottom-feed-list">
            {state.events.slice(0, 5).map((ev) => {
              const diffMs = Date.now() - ev.createdAt;
              const diffSec = Math.floor(diffMs / 1000);
              const elapsed = diffSec < 5 ? "Just now" : diffSec < 60 ? `${diffSec}s ago` : `${Math.floor(diffSec / 60)}m ago`;
              return (
                <div key={ev.id} className="feed-row">
                  <span className="feed-time">{elapsed}</span>
                  <span className={`feed-type text-${ev.type === "complete" ? "green" : ev.type === "breach" ? "red" : "gold"}`}>
                    {ev.title}
                  </span>
                  <span className="feed-node-label text-white">{ev.detail}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Breach Ledger */}
        <section className="bottom-card breach-ledger-card">
          <h3>Breach Ledger</h3>
          <div className="bottom-feed-list">
            {state.breaches.filter(br => !br.resolved).map((br) => {
              const isSpreading = br.penalty.includes("Spreading");
              const diffMs = Date.now() - br.createdAt;
              const diffSec = Math.floor(diffMs / 1000);
              const elapsed = diffSec < 60 ? `${diffSec}s ago` : `${Math.floor(diffSec / 60)}m ago`;
              return (
                <div key={br.id} className={`breach-row ${isSpreading ? "spreading" : "stable"}`}>
                  <span className="breach-icon">💀</span>
                  <div className="breach-info">
                    <strong>{br.title}</strong>
                    <span>{br.penalty}</span>
                  </div>
                  <span className="breach-timer">{elapsed}</span>
                </div>
              );
            })}
            {state.breaches.filter(br => !br.resolved).length === 0 && (
              <p className="no-breaches-msg" style={{ fontSize: "0.8rem", color: "var(--muted)", textAlign: "center", margin: "auto" }}>No active breaches</p>
            )}
          </div>
          <button className="btn-view-all-breaches" onClick={() => setShowBreachModal(true)}>View All Breaches</button>
        </section>

        {/* Run Rules */}
        <section className="bottom-card run-rules-card">
          <div className="rules-header">
            <h3>Run Rules</h3>
            <button className="btn-edit-rules" onClick={() => setShowRulesModal(true)}>Edit</button>
          </div>
          <div className="rules-grid-dashboard">
            {runRules.map((rule, idx) => (
              <div key={idx} className={`rule-dash-row ${rule.enabled ? "enabled" : "disabled"}`} onClick={() => toggleRule(idx)}>
                <span className="rule-name">{rule.name}</span>
                <span className="rule-status-badge">{rule.enabled ? "Enabled" : "Disabled"}</span>
              </div>
            ))}
          </div>
        </section>
      </footer>

      {showGuide && (
        <div className="guide-modal-overlay" onClick={() => setShowGuide(false)}>
          <div className="guide-modal-box" onClick={(e) => e.stopPropagation()}>
            <header className="guide-modal-header">
              <h2>📖 Breadcrumbman Atlas - Official Game Guide</h2>
              <button className="guide-close-btn" onClick={() => setShowGuide(false)}>×</button>
            </header>
            <div className="guide-modal-body">
              <section className="guide-section">
                <h3>🧭 Core Concept: "The Wiki as the Map"</h3>
                <p>Normally in OSRS, you have access to the entire world. In Breadcrumbman, <strong>you only have permission to interact with what is unlocked on your Atlas.</strong></p>
                <div className="guide-alert important">
                  <strong>IMPORTANT:</strong> You may only train, fight, buy, travel, quest, or use rewards that connect to your <em>visible legal graph</em>. Accessing hidden content is a <strong>Breach</strong> that must be recorded.
                </div>
              </section>

              <section className="guide-section">
                <h3>📈 Progression & Rule Modes</h3>
                <p>How fast your atlas expands depends on your chosen Rule Mode.</p>
                <table className="guide-table">
                  <thead>
                    <tr>
                      <th>Rule Mode</th>
                      <th>Reveals / Complete</th>
                      <th>Rescues Earned</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Cozy Scholar</td>
                      <td>6</td>
                      <td>Every 3 completes</td>
                      <td>Gentle progression, frequent rescues, ideal for learning.</td>
                    </tr>
                    <tr>
                      <td>Standard</td>
                      <td>4</td>
                      <td>Every 5 completes</td>
                      <td>Balanced expansion with meaningful routing choices.</td>
                    </tr>
                    <tr>
                      <td>Strict Archivist</td>
                      <td>3</td>
                      <td>Every 7 completes</td>
                      <td>Tighter planning required; penalties for illegal progress.</td>
                    </tr>
                    <tr>
                      <td>Brutal Manuscript</td>
                      <td>2</td>
                      <td>Every 10 completes</td>
                      <td>Sparse reveals; rare rescues; high dead-end challenge.</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section className="guide-section">
                <h3>🌡️ Frontier Pressure & Effects</h3>
                <p>Frontier Pressure (0% to 100%) represents the size, tension, and volatility of your active atlas. It is increased by open active nodes, dead ends, blocked paths, and active breaches.</p>
                <div className="guide-alert warning">
                  <strong>WARNING:</strong> At higher pressure levels (Strained & Critical), breaches spread faster (+28%), adjacent page reveal costs increase (+18%), and rescue token cooldowns slow down (+12%). Keep your active list tidy by completing low-tier nodes.
                </div>
              </section>

              <section className="guide-section">
                <h3>🛟 Rescue Tokens & Scholar Favour</h3>
                <p>If you hit a dead end, consume a <strong>Rescue Token</strong> to perform an <strong>Emergency Reveal</strong>, which legalizes the lowest-tier hidden nodes connected to your current border.</p>
                <p>Completing nodes awards <strong>Scholar Favour</strong>. Reaching milestones (25%, 50%, 75%, 100%) unlocks ranks and buffs, such as the <strong>Reveal Discount II</strong> at 75% favour.</p>
              </section>

              <section className="guide-section">
                <h3>💀 The Breach Desk & Ledger</h3>
                <p>A Breach occurs when you break the rules of your layout (e.g., using a locked teleport or shop). You must log it in the Breach Ledger. Breaches carry spreading penalties and must be atoned for by completing adjacent legal nodes.</p>
              </section>

              <section className="guide-section">
                <h3>🏆 Victory Condition: The Completion Cape</h3>
                <p>The ultimate goal is to build an unbroken legal bridge from your starting seed to the <strong>Completion Cape</strong> node (Tier 6) and complete the final completion packet of high-level challenges.</p>
              </section>
            </div>
          </div>
        </div>
      )}

      {showRulesModal && (
        <div className="guide-modal-overlay" onClick={() => setShowRulesModal(false)}>
          <div className="guide-modal-box" onClick={(e) => e.stopPropagation()}>
            <header className="guide-modal-header">
              <h2>⚙ Edit Run Rules</h2>
              <button className="guide-close-btn" onClick={() => setShowRulesModal(false)}>×</button>
            </header>
            <div className="guide-modal-body">
              <section className="guide-section">
                <h3>Standard Restrictions</h3>
                <div className="rules-customizer-grid">
                  {runRules.map((rule, idx) => (
                    <label key={idx} className="rule-checkbox-row">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => toggleRule(idx)}
                      />
                      <span className="checkbox-custom" />
                      <span className="rule-name">{rule.name}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="guide-section">
                <h3>Custom Rules & Notes</h3>
                <p>Type any custom constraints or notes for your Breadcrumbman run below.</p>
                <textarea
                  className="custom-rules-textarea"
                  value={customRules}
                  onChange={(e) => setCustomRules(e.target.value)}
                  placeholder="e.g. Must complete all diaries in Misthalin before crossing borders."
                  rows={4}
                />
              </section>
            </div>
            <footer className="guide-modal-footer" style={{ padding: "12px 20px", background: "#1c1915", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
              <button className="btn-save-modal" onClick={() => setShowRulesModal(false)} style={{ background: "linear-gradient(180deg, #d9a84f, #9c7126)", border: "1px solid #7c581a", color: "#0b0a08", fontWeight: 750, padding: "8px 16px", borderRadius: "4px", cursor: "pointer" }}>Done</button>
            </footer>
          </div>
        </div>
      )}

      {showBreachModal && (
        <div className="guide-modal-overlay" onClick={() => setShowBreachModal(false)}>
          <div className="guide-modal-box" onClick={(e) => e.stopPropagation()}>
            <header className="guide-modal-header">
              <h2>💀 Breach Desk & Ledger</h2>
              <button className="guide-close-btn" onClick={() => setShowBreachModal(false)}>×</button>
            </header>
            <div className="guide-modal-body">
              
              <section className="guide-section">
                <h3>Log a New Breach</h3>
                <div className="breach-form">
                  <div className="form-group" style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "0.8rem", color: "var(--gold)", marginBottom: "4px" }}>Related Node</label>
                    <select id="breach-node-select" style={{ width: "100%", background: "#1b1915", border: "1px solid var(--border)", borderRadius: "4px", padding: "8px", color: "var(--text)" }}>
                      <option value="">None / General Rule Break</option>
                      {GRAPH_NODES.filter(n => !n.id.startsWith("dummy-")).map(n => (
                        <option key={n.id} value={n.id}>{n.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "0.8rem", color: "var(--gold)", marginBottom: "4px" }}>Custom Title (Optional)</label>
                    <input type="text" id="breach-title-input" placeholder="e.g. Unauthorized Teleport" style={{ width: "100%", background: "#1b1915", border: "1px solid var(--border)", borderRadius: "4px", padding: "8px", color: "var(--text)" }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "0.8rem", color: "var(--gold)", marginBottom: "4px" }}>Penalty Type</label>
                    <select id="breach-penalty-select" style={{ width: "100%", background: "#1b1915", border: "1px solid var(--border)", borderRadius: "4px", padding: "8px", color: "var(--text)" }}>
                      <option value="Stable">Stable</option>
                      <option value="Spreading to 1 connected node">Spreading to 1 connected node</option>
                      <option value="Spreading to 2 connected nodes">Spreading to 2 connected nodes</option>
                    </select>
                  </div>
                  <button className="btn-log-breach" style={{ background: "linear-gradient(180deg, #d95c50, #a93c30)", border: "1px solid #7a2820", color: "#ece7db", fontWeight: 750, padding: "8px 16px", borderRadius: "4px", cursor: "pointer", width: "100%" }} onClick={() => {
                    const nodeSel = document.getElementById("breach-node-select") as HTMLSelectElement;
                    const titleInput = document.getElementById("breach-title-input") as HTMLInputElement;
                    const penaltySel = document.getElementById("breach-penalty-select") as HTMLSelectElement;
                    
                    const nodeId = nodeSel.value;
                    const title = titleInput.value;
                    const penalty = penaltySel.value;
                    
                    addBreach(title, nodeId || undefined, penalty);
                    
                    // Reset fields
                    nodeSel.value = "";
                    titleInput.value = "";
                    penaltySel.value = "Stable";
                  }}>
                    Log Breach ⚔
                  </button>
                </div>
              </section>

              <section className="guide-section">
                <h3>Active Breaches ({state.breaches.filter(b => !b.resolved).length})</h3>
                <div className="breach-modal-list" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {state.breaches.filter(b => !b.resolved).map(b => {
                    const isSpreading = b.penalty.includes("Spreading");
                    return (
                      <div key={b.id} className={`breach-list-item active-breach ${isSpreading ? "spreading" : ""}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: isSpreading ? "rgba(217, 92, 80, 0.08)" : "rgba(255,255,255,0.02)", border: "1px solid var(--border)", padding: "8px 12px", borderRadius: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span className="breach-icon">💀</span>
                          <div className="breach-info">
                            <strong>{b.title}</strong>
                            <span style={{ fontSize: "0.72rem", color: "var(--muted)", display: "block" }}>{b.penalty}</span>
                          </div>
                        </div>
                        <button className="btn-resolve-breach" style={{ background: "rgba(91, 191, 134, 0.15)", border: "1px solid var(--green)", color: "var(--green)", fontWeight: 700, padding: "4px 8px", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem" }} onClick={() => resolveBreach(b.id)}>Resolve ✓</button>
                      </div>
                    );
                  })}
                  {state.breaches.filter(b => !b.resolved).length === 0 && (
                    <p className="no-breaches-msg" style={{ fontSize: "0.8rem", color: "var(--muted)" }}>No active breaches. Your atlas is secure.</p>
                  )}
                </div>
              </section>

              <section className="guide-section">
                <h3>Resolved Ledger ({state.breaches.filter(b => b.resolved).length})</h3>
                <div className="breach-modal-list" style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
                  {state.breaches.filter(b => b.resolved).map(b => (
                    <div key={b.id} className="breach-list-item resolved-breach" style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.01)", border: "1px solid var(--border)", padding: "8px 12px", borderRadius: "4px" }}>
                      <span className="breach-icon text-green">✓</span>
                      <div className="breach-info">
                        <strong style={{ textDecoration: "line-through", color: "var(--muted)" }}>{b.title}</strong>
                        <span style={{ fontSize: "0.72rem", color: "var(--muted)", display: "block" }}>{b.penalty} — Resolved</span>
                      </div>
                    </div>
                  ))}
                  {state.breaches.filter(b => b.resolved).length === 0 && (
                    <p className="no-breaches-msg" style={{ fontSize: "0.8rem", color: "var(--muted)" }}>No resolved breaches in this session.</p>
                  )}
                </div>
              </section>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Interactive Graph Canvas Component
function GraphCanvas(props: {
  state: RunState;
  nodes: GraphNode[];
  route: GraphNode[];
  onSelect: (id: string) => void;
}) {
  const { state, nodes, route, onSelect } = props;
  const [zoom, setZoom] = useState(1.32);
  const [pan, setPan] = useState({ x: -150, y: -90 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);
  const [hoveredElement, setHoveredElement] = useState<{
    type: "node" | "edge";
    x: number;
    y: number;
    title: string;
    summary: string;
  } | null>(null);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    if (target.closest('.graph-legend') || target.closest('.graph-controls')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const visible = new Set(nodes.map((node) => node.id));
  const edges = GRAPH_EDGES.filter((edge) => visible.has(edge.from) && visible.has(edge.to));

  const routePairs = useMemo(() => {
    const pairs = new Set<string>();
    for (let i = 0; i < route.length - 1; i++) {
      const u = route[i].id;
      const v = route[i + 1].id;
      pairs.add([u, v].sort().join("::"));
    }
    return pairs;
  }, [route]);

  function isNodeInCategory(node: GraphNode, category: string): boolean {
    const status = nodeState(node, state);
    switch (category) {
      case "legal":
        return status === "active" || status === "revealed";
      case "completed":
        return status === "complete";
      case "breached":
        return status === "breached";
      case "locked":
        return node.label === "?";
      case "special":
        return node.kind === "milestone" || node.tags.includes("keystone");
      default:
        return true;
    }
  }

  function renderNodeIconSVG(node: GraphNode, status: string) {
    const x = node.x;
    const y = node.y;

    const glyph = (() => {
      if (status === "complete") return "\u2713";
      if (status === "breached") return "\u2620";
      if (node.label === "?") return "?";
      if (node.kind === "diary") return "\u25A3";
      if (node.kind === "milestone") return "\u2691";
      if (node.tags.includes("keystone")) return "\u2605";
      return "\u2694";
    })();

    return (
      <text
        x={x}
        y={y + 0.8}
        textAnchor="middle"
        className="node-glyph"
        data-status={status}
      >
        {glyph}
      </text>
    );
  }

  return (
    <div className="graph-container">
      <div className="graph-wrap">
        <svg
          viewBox="0 0 100 80"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="0.6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="routeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.1" result="blur" />
              <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0.95  0 1 0 0 0.7  0 0 1 0 0.25  0 0 0 1 0" result="goldBlur" />
              <feMerge>
                <feMergeNode in="goldBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="atlasVignette" cx="50%" cy="47%" r="58%">
              <stop offset="0%" stopColor="#1a1812" />
              <stop offset="58%" stopColor="#0d1110" />
              <stop offset="100%" stopColor="#050403" />
            </radialGradient>
            <pattern id="atlasStars" width="9" height="9" patternUnits="userSpaceOnUse">
              <circle cx="1.4" cy="2.2" r="0.16" fill="#d9a84f" opacity="0.34" />
              <circle cx="6.7" cy="6.1" r="0.13" fill="#62bfd6" opacity="0.2" />
            </pattern>
          </defs>
          <rect width="100" height="80" fill="url(#atlasVignette)" />
          <rect width="100" height="80" fill="url(#atlasStars)" opacity="0.85" />

          <g transform={`translate(${pan.x / 10} ${pan.y / 10}) scale(${zoom})`}>
            {/* Draw Edges */}
            {edges.map((edge) => {
              const from = getNode(edge.from)!;
              const to = getNode(edge.to)!;
              
              const isRouteEdge = routePairs.has([edge.from, edge.to].sort().join("::"));

              const isDimmed = highlightedCategory
                ? !isNodeInCategory(from, highlightedCategory) || !isNodeInCategory(to, highlightedCategory)
                : false;

              return (
                <g key={`${edge.from}-${edge.to}`}>
                  {isRouteEdge && (
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      className="edge-route-glow"
                    />
                  )}
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    className={`edge ${isRouteEdge ? "route-active" : ""} ${isDimmed ? "dimmed" : ""}`}
                  />
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="transparent"
                    strokeWidth="3"
                    style={{ cursor: "help", pointerEvents: "all" }}
                    onMouseEnter={(e) => {
                      setHoveredElement({
                        type: "edge",
                        x: e.clientX,
                        y: e.clientY,
                        title: `${from.label} ➔ ${to.label}`,
                        summary: edge.reason || "Wiki connection link"
                      });
                    }}
                    onMouseMove={(e) => {
                      setHoveredElement(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
                    }}
                    onMouseLeave={() => {
                      setHoveredElement(null);
                    }}
                  />
                </g>
              );
            })}

            {/* Draw Nodes */}
            {nodes.map((node) => {
              const status = nodeState(node, state);
              const isSelected = state.selectedNodeId === node.id;
              const isDimmed = highlightedCategory
                ? !isNodeInCategory(node, highlightedCategory)
                : false;
              
              return (
                <g
                  key={node.id}
                  className={`graph-node ${status} ${isSelected ? "selected" : ""} ${isDimmed ? "dimmed" : ""}`}
                  onClick={() => onSelect(node.id)}
                  style={{ pointerEvents: "all" }}
                  onMouseEnter={(e) => {
                    setHoveredElement({
                      type: "node",
                      x: e.clientX,
                      y: e.clientY,
                      title: node.label,
                      summary: node.summary
                    });
                  }}
                  onMouseMove={(e) => {
                    setHoveredElement(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
                  }}
                  onMouseLeave={() => {
                    setHoveredElement(null);
                  }}
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={status === "complete" ? 2.65 : 2.45}
                    fill={nodeKindColor(node.kind)}
                    className="node-core"
                  />
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isSelected ? 4.45 : 3.45}
                    className="outer-ring"
                  />
                  {renderNodeIconSVG(node, status)}
                  <text x={node.x} y={node.y + 4.8} className="node-text">
                    {node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* SVG Canvas Overlays */}
      <div className="graph-legend" style={{ pointerEvents: "auto" }}>
        <h4>Legend (Click to highlight)</h4>
        <div
          className={`legend-item clickable-legend ${highlightedCategory === "legal" ? "active-highlight" : ""}`}
          onClick={() => setHighlightedCategory(h => h === "legal" ? null : "legal")}
        >
          <span className="legend-dot legal" /> Legal / Revealed
        </div>
        <div
          className={`legend-item clickable-legend ${highlightedCategory === "completed" ? "active-highlight" : ""}`}
          onClick={() => setHighlightedCategory(h => h === "completed" ? null : "completed")}
        >
          <span className="legend-dot completed" /> Completed
        </div>
        <div
          className={`legend-item clickable-legend ${highlightedCategory === "breached" ? "active-highlight" : ""}`}
          onClick={() => setHighlightedCategory(h => h === "breached" ? null : "breached")}
        >
          <span className="legend-dot breached" /> Breached
        </div>
        <div
          className={`legend-item clickable-legend ${highlightedCategory === "locked" ? "active-highlight" : ""}`}
          onClick={() => setHighlightedCategory(h => h === "locked" ? null : "locked")}
        >
          <span className="legend-dot locked" /> Locked
        </div>
        <div
          className={`legend-item clickable-legend ${highlightedCategory === "special" ? "active-highlight" : ""}`}
          onClick={() => setHighlightedCategory(h => h === "special" ? null : "special")}
        >
          <span className="legend-dot special" /> Special
        </div>
        <div className="legend-item">
          <span className="legend-line route" /> Route
        </div>
        <div className="legend-item">
          <span className="legend-line alt-route" /> Alt. Route
        </div>
      </div>

      <div className="graph-controls">
        <button onClick={() => setZoom(z => Math.min(2.5, z + 0.15))}>+</button>
        <button onClick={() => setZoom(z => Math.max(0.4, z - 0.15))}>-</button>
        <button onClick={handleReset}>🎯</button>
      </div>

      {hoveredElement && (
        <div
          className="canvas-tooltip"
          style={{
            position: "fixed",
            left: hoveredElement.x + 12,
            top: hoveredElement.y + 12,
            pointerEvents: "none",
            zIndex: 2000
          }}
        >
          <strong>{hoveredElement.title}</strong>
          {hoveredElement.summary && <p>{hoveredElement.summary}</p>}
        </div>
      )}
    </div>
  );
}

export default App;
