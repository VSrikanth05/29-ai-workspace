# Milestone 1: Platform foundation

## Architecture

Next.js and NestJS are independently deployable applications joined through a
same-origin API rewrite. App Router provides server-first route composition;
client providers are limited to theme, TanStack Query, Radix tooltip context,
and Zustand workspace interaction state.

## Folder structure

The frontend uses `app`, `components/{ui,layout,providers}`, `features`,
`config`, `stores`, `lib`, and `test`. Backend module boundaries are unchanged.

## Database changes

None. Workspace ownership, collections, artifacts, billing, and teams require
explicit domain design in later milestones and are not represented by
speculative columns.

## API endpoints

No NestJS changes. Next.js adds `GET /healthz` and proxies `/api/*` to existing
backend endpoints.

## Frontend implementation

- Original 29 AI Workspace visual language and brand system.
- Responsive platform navigation and dashboard.
- Three-column Sources, Conversation, and AI Studio workspace.
- Mobile workspace tabs and bottom navigation; tablet and desktop layouts.
- Light, dark, and system themes with reduced-motion support.
- Typed registry containing exactly 29 tools across seven categories.
- Accessible source selection, search, prompt starters, landmarks, labels,
  keyboard focus, disabled states, and empty states.

## Backend implementation

No domain implementation was required. Existing production NestJS capabilities
and contracts remain available behind the Next.js proxy.

## Tests

Registry invariants, source selection, AI Studio search/detail behavior, and
responsive workspace state are covered with Vitest and Testing Library.

## Acceptance criteria

- Next.js 15 and React 19 production build succeeds.
- Strict TypeScript and zero-warning ESLint pass.
- Exactly 29 unique tools are registered across all categories.
- Workspace exposes accessible Sources, Conversation, and AI Studio regions.
- Layout supports desktop, tablet, mobile, and all three theme preferences.
- Existing backend tests/build remain green and APIs/database are unchanged.
- Docker and CI use the Next.js standalone runtime.

## Documentation updates

README, architecture, API contract, frontend migration, deployment, and this
milestone record are updated.
