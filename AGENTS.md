# Auktiva agent instructions

## Route every coding effort

- When the user asks any agent to research or investigate something in Auktiva, or to design or plan a change, use `openspec-planner`. Carry the user's context and questions into the planner. For an explicitly research-only request, use the planner's explore phase and deliver findings. If your role cannot delegate, return the request to the controlling session for routing.
- Work through open decisions with the user. Once the plan is ready, present the proposal, design, spec deltas, and tasks together. Ask whether `openspec-implementer` should start and wait for explicit approval of that named change.
- Route an explicit go-ahead to implement a named OpenSpec plan, or work on an existing approved OpenSpec change, to `openspec-implementer`.
- Route all other coding requests, including fixes and refactors, to `direct-code` before editing. It uses the request and acceptance checks to drive development without OpenSpec artifacts. Code reading needed to carry out a fix stays in that coding route. Keep follow-up fixes for an active effort with its current orchestrator.
- Both coding routes delegate to `developer`, `qa`, `browser-qa`, and `reflector`. Specialists execute assignments within the chosen route. Hand the integrated change to `publisher` after QA and browser QA pass for the same revision and blocking findings are resolved. Respect any user instruction to leave the result local or in a draft. The [agent workflow](docs/agent-workflow.md) defines the roles and handoffs.

## Use fresh Git worktrees

- Start every new Auktiva coding effort in a fresh linked Git worktree before writing files. Prefer a worktree created for this effort by the client. Otherwise create one from the intended base with Git and record its absolute path, branch, and base commit. Keep the primary checkout and other efforts' worktrees free of your edits.
- Research can be read-only in the current checkout. Create the change's worktree before writing OpenSpec artifacts. Resume that same worktree when the user approves the change.
- Give each concurrent writer a separate worktree and exclusive ownership of its assigned files. Pass the absolute worktree path to every agent and verify `git rev-parse --show-toplevel` before editing or starting services. Let reviewers share a stable snapshot for read-only inspection.
- Use independent local test data and ports for concurrent browser sessions or other stateful checks. Give checks that write shared build outputs, dependencies, or generated files separate checkouts, or run them in sequence. Preserve unrelated work and follow the user's instructions for commits, pushes, and PRs.

## Build and verify

- Before writing or changing any UI code, load and apply `design-taste-frontend` in the agent that will edit it. This covers components, styles, layout, and user-facing interaction code, including fixes after review. Resolve the skill from the active client. If it is unavailable, report the blocker and continue independent work while resolving it. Use the existing Auktiva UI patterns, accessible controls, responsive layouts, and localization.
- Keep changes scoped. Reuse the Pages Router, shared components, handlers, and services where they already fit. Review permissions, bid invariants, state consistency, and compatibility with existing records when relevant. Include migrations for Prisma schema changes and update affected translations together.
- Use `.nvmrc` and `npm ci` for local setup. Generate the Prisma client with `npm run db:generate` before checks that import it. Run the relevant existing tests via `npx tsx --test <test-files>`, lint via `npm run lint`, type-check via `npx tsc --noEmit`, and run `npm run build` when build behavior is in scope. Use a local SQLite database for development checks. Report exact commands and failures or coverage gaps.
