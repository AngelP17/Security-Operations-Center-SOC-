# ForgeSentinel Monorepo Management

ForgeSentinel is currently a polyglot application repository rather than a package-manager workspace. The repo contains a Next.js frontend at the root, a FastAPI backend under `apps/api`, legacy Vite/Firebase code under `src`, and shared frontend runtime code under `components` and `lib`.

## Current Ownership Map

| Area | Path | Role | Primary Commands |
| --- | --- | --- | --- |
| Web app | `app`, `components`, `lib`, `public` | Next.js command interface and frontend data clients | `npm run dev:web`, `npm run verify:web` |
| API app | `apps/api` | FastAPI service, scan pipeline, risk engine, incidents, replay | `npm run dev:api`, `npm run verify:api` |
| Legacy frontend | `src` | Older Vite/Firebase surface, excluded from root TypeScript checks | `npm run vite:dev`, `npm run vite:build` |
| Python tests | `tests` | API tests | `npm run test:api` |
| QA scripts | `scripts` | GPT taste and local frontend review tooling | `npm run qa:frontend` |

## Verification Contract

Use these commands as the root quality gate:

```bash
npm run verify:web
npm run verify:api
npm run verify
```

`verify:web` runs TypeScript and the Next build. `verify:api` runs Ruff, a lightweight API config typecheck, and pytest through the existing `api-venv`. A stricter `npm run typecheck:api:strict` target is available, but it currently exposes existing SQLAlchemy ORM typing debt and should be treated as a hardening backlog item rather than the default merge gate. The combined `verify` command is intentionally explicit so CI can fail on either side without hiding which application broke.

## Dependency Boundary

The root `package.json` owns the Next/Vite JavaScript dependency graph. The backend owns Python dependencies in `apps/api/requirements.txt` and currently also relies on the root `api-venv`. Avoid importing backend code from the frontend or frontend code from the backend; share only API contracts and generated artifacts when needed.

The repo should not add npm workspaces yet because `apps/api` is Python-only and has no `package.json`. Adding a workspace declaration now would create the appearance of a JavaScript monorepo without giving builds, dependency installation, or caching a real project graph.

## Recommended Next Steps

1. Move legacy Vite code into `apps/legacy-web` if it is still needed, or remove it after confirming Next has replaced it.
2. Move the Next app into `apps/web` only when deployment and import aliases are ready for the path change.
3. Extract shared frontend primitives into `packages/ui` and shared contracts into `packages/contracts` once there are at least two active consumers.
4. Add Turborepo after `apps/web` and at least one `packages/*` workspace exist. At that point, cache `build`, `typecheck`, `lint`, and `test` targets.
5. Add CI steps that run `npm ci`, `npm run verify:web`, and `npm run verify:api` with the Python environment restored from `apps/api/requirements.txt`.

## Turborepo Readiness Criteria

Do not introduce `turbo.json` until these are true:

- There are two or more JavaScript packages with their own `package.json` files.
- Shared packages have explicit `exports` fields.
- Root scripts can delegate to package scripts without relying on path-specific shell commands.
- Build outputs are clear enough to cache, such as `.next/**`, `dist/**`, and generated contract files.
