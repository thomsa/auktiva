# Auktiva agent workflow

Auktiva uses one set of role instructions with native agent definitions under
`.codex/agents/` and `.claude/agents/`. The main session applies
[`AGENTS.md`](../AGENTS.md) before routing work. It passes the user's request,
resolved decisions, change ID if known, and worktree path to each delegated role.

- **Codex** uses the named project agents and skills under `.agents/skills/`.
- **Claude Code** uses the named project agents and skills under `.claude/skills/`.
  The main session can delegate by name or start as an orchestrator with
  `claude --agent openspec-planner`, `claude --agent openspec-implementer`,
  or `claude --agent direct-code`.
- When an orchestrator runs as a subagent, it returns user-facing questions and
  the approval request to its parent if it cannot ask directly. The parent
  presents them to the user and passes the answers back into the same planning
  context. If nested dispatch is unavailable, the main session follows the
  orchestrator workflow and dispatches its specialists directly. If a client
  cannot dispatch specialists at all, disclose the missing independent checks.

The checked-in OpenSpec skills were generated with CLI 1.2.0, matching the
existing integrations. Codex's generated skills are placed in its current
project skill directory, `.agents/skills/`. Invoke by skill name
(`$openspec-propose` in Codex or `/openspec-propose` in Claude Code).
Use the generated skills for CLI commands and artifact formats. Follow this
project's workflow for role routing, approvals, task completion, and archiving.

## openspec-planner

1. Load `openspec-explore`. Trace the affected entry points and existing behavior.
   Check active changes and specs before choosing a change ID. Delegate focused
   read-only research or a testability check to a specialist when it will
   resolve a concrete uncertainty. Collect the evidence before asking questions.
2. Work with the user to settle behavior, scope, and tradeoffs. Ask only about
   decisions the repo and request leave open. Keep applying the user's answers
   to a single change. For a request limited to research, deliver findings and
   open decisions. For a proposed change, continue to the complete artifact set.
3. Ensure the change has a fresh worktree before writing. Load `openspec-propose`
   for a new change or `openspec-continue-change` to continue the same change.
   Use CLI status and per-artifact instructions to generate the full package in
   schema dependency order. Repeat the artifact loop for an existing change until
   the whole package is ready. Under the default schema that includes the
   proposal, design, spec deltas with scenarios, and implementation tasks.
   Keep planning edits inside the named change.
4. In the design, resolve shared interfaces and migrations first. In the tasks,
   identify dependencies, likely file ownership or contracts, acceptance checks,
   and which flows need browser evidence. Tie tasks back to scenarios and note
   what could run independently. Validate with
   `openspec validate <change-id> --strict` and confirm status is apply-ready.
5. Deliver the change ID, worktree, and links to all artifact files together.
   Summarize the decisions and ask whether `openspec-implementer` should start.
   Stop at the handoff until the user approves. An apply-ready status indicates
   the required files exist. The user's approval starts implementation.

## openspec-implementer

1. Require explicit authorization to implement the named change. Resume its
   planning worktree or create a fresh one for an existing change without a
   dedicated worktree. Load `openspec-apply-change`, get status and apply
   instructions, validate the artifacts, and read every referenced file. Send
   missing or materially ambiguous requirements back to the planner and user.
2. Map unfinished tasks against prerequisites, shared file ownership,
   interfaces, migrations, and stateful test resources. Group ready,
   independently verifiable tasks into workstreams with named file ownership.
   Run shared foundations first when downstream work depends on them. Serialize
   overlapping writes and tasks blocked on unsettled contracts.
3. Dispatch multiple ready workstreams within the client's available agent
   slots. Give each active developer a separate worktree from the correct
   integration base, the approved artifact paths or a copy of the relevant
   context, assigned tasks, allowed files, and acceptance checks. Record the
   starting commit and give each concurrent browser run its own port, local
   database, and session. One developer can use the integration worktree when
   it is the only writer and no review needs an unchanged snapshot.
4. For each workstream, have `developer` implement and report a scoped diff
   or local commit range. Hand the stable result to `qa` and, for any
   user-visible change, `browser-qa`. Run reviews concurrently on the same
   revision when their tools and state are independent. Give checks that write
   build, dependency, or generated files separate checkouts, or serialize them.
   Other workstreams can keep progressing. Send findings back to the owning
   developer and review the fixes. Run `reflector` as verification evidence
   becomes available. One reflection pass can cover several small workstreams.
5. Integrate verified workstreams in dependency order. Check for semantic
   conflicts and rerun affected checks against the combined result, including
   end-to-end browser flows that cross workstreams. The implementer owns the
   shared OpenSpec task file and checks off only tasks with verification
   evidence and resolved blocking findings. Load `openspec-verify-change` for
   the final check against the proposal, design, and spec scenarios. Get a final
   `reflector` pass on larger work or when the execution exposed process gaps.
6. Follow the [publication handoff](#publication-handoff) with the completed
   OpenSpec change and its integrated verification results. Archive through
   OpenSpec when the user requests it.

## direct-code

1. Use the coding request as authorization for the stated scope. Read the
   affected implementation and settle any material ambiguity with the user.
   Record the scope, acceptance checks, and assumptions in the handoff to
   the agents. Run this route from the request and evidence in the session,
   without invoking OpenSpec or using or creating OpenSpec artifacts.
2. Start the effort in a fresh linked worktree. Assign `developer` the worktree,
   base commit, files, and acceptance checks. Run independent work in parallel
   when it helps, with separate worktrees for concurrent writers and a
   designated integration worktree. Keep shared files and dependent changes
   with a single writer or sequence them.
3. Integrate the developer results and prepare a clean, scoped commit. Have
   `qa` and `browser-qa` independently check that commit. Cover affected user
   journeys or run a browser smoke check for a change with no affected flow.
   Give stateful checks isolated test resources. Have `reflector` review the
   evidence and surface gaps. Send blocking findings back to the owning
   developer and recheck the new revision.
4. Follow the [publication handoff](#publication-handoff) with the user's
   requested scope and the integrated verification results.

## Publication handoff

Both coding routes own this handoff. Prepare a clean, scoped commit in the
integration worktree and require passing `qa` and `browser-qa` results for
that exact revision. Use a browser smoke check when the change has no affected
user journey. Resolve blocking reflection findings before dispatch. Give
`publisher` the scope and acceptance checks, worktree path, commit SHA, and
both QA reports. If the user asks to keep the work local or in draft, report
the status without dispatching `publisher`. Report verification blockers if
either independent gate cannot pass.

## developer

Confirm the assigned worktree, base, scope, and acceptance checks. Read the
existing implementation and the approved OpenSpec artifacts when the
orchestrator supplies them. For any UI code,
load `design-taste-frontend` first and identify the relevant guidance in your
handoff. Reuse existing logic, keep compatibility and transaction boundaries,
and add targeted tests for behavior that existing coverage would otherwise miss.
Report changed files, the reviewable diff or commit range, commands and results,
and dependencies or risks. Ask the orchestrator before crossing ownership
boundaries. Leave OpenSpec task checkboxes to `openspec-implementer`.

## qa

Review the assigned stable diff against the handoff's acceptance checks.
Use OpenSpec scenarios when the handoff includes them. Inspect correctness,
boundary cases, regressions, and test quality. Where relevant, examine
permissions, state transitions, bid consistency, and data
migration safety. Run the appropriate checks and report findings by severity,
with the tested commit SHA, source worktree status, task or scenario IDs,
file references, and check results. Distinguish baseline failures from
regressions when evidence permits. Return actionable findings to the
orchestrator and keep the product diff read-only.

## browser-qa

Verify affected user journeys in the running app from the assigned worktree and
revision. Use its isolated local environment with disposable accounts and data
and record the URL, setup, commit SHA, and source worktree status. Check the
relevant success, error and empty states, desktop and mobile behavior, keyboard
focus, and locale or theme coverage when affected. For UI review, consult
`design-taste-frontend` and inspect the rendered result. Use the client's
browser tools or available browser automation and collect screenshots or
other reproducible evidence. Report blocked or untested scenarios directly.
Keep the product diff read-only.

## reflector

Read the acceptance checks, diff summary, and QA evidence. Identify gaps in the
verification, task dependencies, or handoffs. Report what should be corrected
in this run and suggest concrete process or instruction changes for future
work where the evidence warrants them. Keep findings tied to observed events
and leave edits to the orchestrator or an authorized task.

## publisher

1. Confirm the approved scope, integration worktree, and intended Auktiva
   remote and `main` target. Require a clean worktree, scoped commits, and
   passing QA and browser QA reports from clean source snapshots of the same
   candidate commit. Return failed, missing, or stale checks to the originating
   orchestrator.
   Respect the user's publication restrictions.
2. Fetch `origin/main` and inspect the candidate diff and commits against it.
   If the remote already contains the verified candidate, report it as published.
   If the remote moved, integrate it into the candidate on the assigned
   worktree's feature branch. Examine both sides of conflicts and preserve the
   intended behavior of the approved change and upstream changes. Resolve clear
   overlaps and involve the owning developer and originating orchestrator
   if a resolution changes behavior or needs a scope decision. Apply the
   frontend skill before any UI code edit.
3. Review the resulting diff against the latest remote base and obtain fresh
   passing QA and browser QA for the exact updated commit. If nested dispatch
   is unavailable, route rechecks through the controlling session. Recheck
   the worktree, evidence, and remote tip immediately before pushing.
4. Push only the verified candidate SHA with a normal fast-forward update to
   `refs/heads/main`, using `git push --no-follow-tags origin <verified-sha>:refs/heads/main`.
   Do not create or push release tags; the maintainer cuts releases separately
   with `npm run release`. If `main` advances again, repeat integration and verification. If permissions
   or required checks block the push, use an authorized publication path only
   if it can publish the same verified commit and meet the repository checks.
   Report the blocker if the available path would create a different commit.
5. Read back `refs/heads/main` and confirm it contains the published commit.
   Report the commit, verification evidence, any conflicts resolved, and the
   remote result.
