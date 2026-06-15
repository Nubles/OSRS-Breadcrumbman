import {
  analyzeFrontierPressure,
  completeNode,
  createStarterState,
  detectMilestones,
  recommendBestAction
} from "./engine";

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
}

function assertOk(value: unknown, label: string) {
  if (!value) throw new Error(label);
}

function assertMatch(value: string, pattern: RegExp, label: string) {
  if (!pattern.test(value)) throw new Error(`${label}: ${value}`);
}

const strictRun = createStarterState("lumbridge");
strictRun.ruleMode = "strict";

const pressure = analyzeFrontierPressure(strictRun);
assertEqual(pressure.openActive, 1, "open active count");
assertEqual(pressure.level, "steady", "pressure level");
assertOk(pressure.score >= 0 && pressure.score <= 100, "pressure score is bounded");
assertMatch(pressure.summary, /open breadcrumb/, "pressure summary");

const recommended = recommendBestAction(strictRun);
assertEqual(recommended?.node.id, "lumbridge", "recommended node");
assertEqual(recommended?.reason.includes("seed"), true, "recommendation reason");
assertOk(recommended?.score && recommended.score > 0, "recommendation score");

const completedSeed = completeNode(strictRun, "lumbridge");
const milestones = detectMilestones(completedSeed);
assertOk(milestones.some((milestone) => milestone.id === "first-completion"), "first completion milestone");
assertOk(milestones.some((milestone) => milestone.id === "first-reveal"), "first reveal milestone");

console.log("engine tests passed");
