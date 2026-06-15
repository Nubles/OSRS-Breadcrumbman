# Breadcrumbman Command Center Design

## Goal

Upgrade Breadcrumbman from a bare atlas viewer into a playable OSRS restriction command center inspired by Fate Locked's dense tracker feel, while preserving Breadcrumbman's wiki-graph identity.

## Direction

Breadcrumbman remains atlas-first. The first viewport should feel like a run cockpit: a dark OSRS-style interface, compact resource cards, a live frontier pressure meter, a clear recommended next breadcrumb, and route context toward the active goal. The app should avoid a marketing-page hero mood and instead prioritize useful run state.

## Mechanics

- Frontier pressure summarizes open active nodes, hidden frontier size, blocked nodes, breaches, dead ends, and mode scarcity.
- Best-action recommendation ranks active legal nodes by seed importance, reveal value, goal-route relevance, link density, and tier accessibility.
- Milestones summarize meaningful run achievements such as first completion, first reveal chain, first transport, first boss, tier-four breakthrough, and first rescue.
- Node inspector supports blocking and reopening nodes so temporarily impossible breadcrumbs stop polluting recommendations.

## UI

- Use a charcoal/black base with amber legal-progress accents, emerald completion, violet blocked-state accents, and red breach/risk accents.
- Keep panels compact with 8px radii or smaller, readable type, clear progress bars, and dense status rows.
- Preserve existing tabs and save/import/export controls, but make the new command-center header and dashboard cards the primary first impression.

## Verification

- Add engine tests for pressure, recommendation, and milestone logic.
- Run `npm run test:engine` and `npm run build`.
- Verify rendered desktop and mobile views in the browser, including node block/reopen interaction and console health.
