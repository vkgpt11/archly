# Dependency upgrade plan

This plan keeps dependency modernization incremental. Each stage must pass lint, unit tests, backend tests, Playwright journeys, accessibility checks, the 300-node/500-connection performance test, production builds, and vulnerability scans before merging.

## Continuous maintenance

- Dependabot checks npm and Maven weekly and GitHub Actions monthly.
- Patch and minor upgrades may be grouped only when they share a subsystem and remain backward compatible.
- Security updates rated high or critical take priority and should be isolated from feature work.
- Record baseline bundle sizes and canvas performance before and after every major upgrade.

## Major-upgrade sequence

| Stage | Scope | Main risks | Exit criteria |
| --- | --- | --- | --- |
| 1 | ESLint, TypeScript and type packages | New static-analysis failures | Zero lint warnings and clean TypeScript build |
| 2 | Vitest and Testing Library | Changed mocks, timers and JSDOM behavior | All unit and integration tests pass without compatibility shims |
| 3 | Vite and React plugin | Build output, environment handling and chunking | Production build, lazy loading and bundle budgets remain healthy |
| 4 | React and React DOM 19 | Effect timing, ref handling and third-party peer support | Editor, autosave, canvas and Strict Mode journeys pass |
| 5 | TipTap 3 extensions as one coordinated set | Stored HTML compatibility, commands and extension APIs | Existing documents render identically; sanitization and Markdown tests pass |
| 6 | OAuth library/tooling | Sign-in callback and token lifecycle changes | Verified Gmail acceptance and all rejection cases pass in browser and backend tests |
| 7 | React Flow, icons and export libraries | Canvas serialization and visual/export regressions | Saved diagrams, icons, PNG/SVG/clipboard export and 300/500 benchmark pass |

Do not combine stages 3–7 in one pull request. TipTap packages must stay on the same major version, and React should move only after its canvas and editor dependencies declare compatible peer ranges.
