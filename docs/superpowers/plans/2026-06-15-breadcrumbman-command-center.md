# Breadcrumbman Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Breadcrumbman feel and play like a richer atlas command center instead of a bare graph viewer.

**Architecture:** Keep the app's existing React/Vite structure. Add pure engine helpers for pressure, recommendations, and milestones, then surface them in the existing dashboard and inspector with focused CSS changes.

**Tech Stack:** React 18, TypeScript, Vite, local TypeScript-powered engine test harness.

---

### Task 1: Engine Mechanics

**Files:**
- Modify: `src/engine.ts`
- Create: `src/engine.test.ts`
- Create: `scripts/run-engine-tests.mjs`
- Modify: `package.json`

- [x] Write failing tests for `analyzeFrontierPressure`, `recommendBestAction`, and `detectMilestones`.
- [x] Add a dependency-free TypeScript test harness using the installed TypeScript compiler.
- [x] Implement the pure engine helpers.
- [x] Run `npm run test:engine` and confirm it passes.

### Task 2: Command Center UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [x] Replace the marketing-style hero copy with a command-center first viewport.
- [x] Show frontier pressure, best action, rescue tokens, route step, and run health.
- [x] Add command cards for next action, milestones, goal route, and recent reveals.
- [x] Add node block/reopen controls to the inspector.

### Task 3: Visual Treatment

**Files:**
- Modify: `src/styles.css`

- [x] Shift the palette from green hero styling to charcoal OSRS command-center styling.
- [x] Add pressure meter, milestone, route, feed, blocked-node, and compact command card styles.
- [x] Remove broad radial orb-style background treatment from the main page.
- [x] Ensure mobile command panels collapse to one column without horizontal overflow.

### Task 4: Verification

**Commands:**
- `npm run test:engine`
- `npm run build`

- [x] Verify the app loads in the browser after onboarding.
- [x] Verify console health has no relevant warnings or errors.
- [x] Verify block/reopen changes visible node state.
- [x] Verify desktop first viewport at 1440x900.
- [x] Verify mobile first viewport at 390x844.
