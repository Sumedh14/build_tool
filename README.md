# rbuild

Lightweight CLI build & dev tool for React projects — provides scaffolding, a dev server with HMR, and production builds.

## Quick Start
- Install dependencies:
```bash
npm install
```
- Run CLI (build TS first if you added TS step):
```bash
node bin/rbuild.js help
# create
node bin/rbuild.js create myapp --artifactPath=/path/to/project
# dev server
node bin/rbuild.js dev --artifactPath=/path/to/project
# production build
node bin/rbuild.js build --artifactPath=/path/to/project
# run production artifact locally
node bin/rbuild.js prodRun --artifactPath=/path/to/project
```

## Entry Points
- CLI launcher: [bin/rbuild.js](bin/rbuild.js)  
- Commands router: [lib/cli.js](lib/cli.js)  
- Create template: [lib/create-templates/create.js](lib/create-templates/create.js)  
- Dev server: [lib/server/index.js](lib/server/index.js)  
- Prod build: [lib/build/prodBuild.js](lib/build/prodBuild.js)

## Core Concepts & Architecture
- Command Pattern: each CLI action lives under [lib/commands/](lib/commands/) and exposes `execute()`.
- Plugin Manager: central plugin lifecycle in [lib/plugins/pluginManager.js](lib/plugins/pluginManager.js) with hooks `buildStart`, `transform`, `resolveId`, `buildEnd`.
- Pipeline: transforms act on virtual files `{ path, contents, map?, meta? }`; pipeline implementation at [lib/utils/pipeline.js](lib/utils/pipeline.js) or [lib/pipeline.js](lib/pipeline.js).
- Event Bus: builder/server communication via [lib/utils/events.js](lib/utils/events.js) or [lib/events.js](lib/events.js).
- Logger: scoped logger available at [lib/utils/logger.js](lib/utils/logger.js) or [lib/logger.js](lib/logger.js).

## Plugin API (minimal)
- Export an object: `{ name?: string, buildStart?: fn, transform?: fn(file), resolveId?: fn, buildEnd?: fn }`
- `transform` contract: accept and return a virtual file `{ path, contents, map?, meta? }` (async allowed).

## Recommended Patterns
- Command Pattern for CLI actions.
- Chain of Responsibility / Pipeline for file transforms.
- Strategy pattern for `dev` vs `prod` behaviors.
- Observer (EventEmitter) for HMR and server events.
- Adapter for CJS/ESM interop and resolver logic.
- Dependency Injection for filesystem and logger to aid unit testing.

## TypeScript Migration (incremental)
1. Adding `tsconfig.json` with `"allowJs": true`.
2. Converting orchestration modules first (`cli`, `builder`, `pluginManager`, `logger`, `pipeline`).
3. Adding `types.ts` for `VirtualFile` and `Plugin` and annotate plugin-facing APIs.
4. Use `npm run build:ts` in CI to validate types.

## Testing & CI
- Add unit tests for command classes, plugin manager, and pipeline stages.
- Keep integration tests in `tests/`.
- Add ESLint, Prettier, and a GitHub Actions workflow to run lint/test on PRs.

## Contributing
- Add a plugin under `lib/plugins/` exporting hook object; follow `transform` contract.
- Add a command under `lib/commands/` implementing `execute()` and wire it into `lib/cli.js`.
- Run tests and lint before opening PR.

## Where to start refactoring
1. Stabilize public API: `lib/cli.js`, `lib/plugins/pluginManager.js`, `lib/pipeline.js`.
2. Decouple IO: make transforms operate on virtual files; inject `fs` where needed.
3. Add types & unit tests.

## build_tool
CLI tool for building React applications in both local and production environments.
