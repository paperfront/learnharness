# Personal fork working agreement

This is Matthew's personal fork: https://github.com/paperfront/learnharness.
The owner explicitly expects substantial changes to match his vision. Inherited
product decisions, prompts, UX, architecture, and upstream planning documents
are a starting point and may be revised to fulfill his requests. Preserve data
integrity and validate changes, but do not treat upstream preferences as fixed
requirements. The current owner's instructions take precedence over inherited
workflow guidance below; avoid repeatedly seeking approval for work already
authorized by his request.

Development delegation preference: use GPT-6.1 Sol agents for most development
work. The coordinating agent owns detailed specifications, scope and acceptance
criteria, review, and delivery coordination. Give implementation agents clear
security, compatibility, validation, and deployment boundaries.

Canonical task board: https://ubuntu-1.tail1441ca.ts.net:8443/index.php/apps/deck/board/4
Columns: Backlog, Ready, In progress, Review, Blocked, Done.
Track requested features and status there, with acceptance criteria, dependencies,
branch/PR links when applicable, and validation evidence. Keep credentials and
private learning data out of cards. Deck runs on the existing IONOS server;
local deployment/access documentation is at
`/Users/mlacayo/projects/wall-e/hosting/README.md`. Modify only this project's board.

Bootstrap reviewed at b277ee3 on 2026-10-25. The application uses Next.js/React
and Electron; `src/agent` contains teaching behavior and tools, `src/core` domain
logic, `src/server` orchestration, and `src/store` local file persistence.
`app/` and `components/` hold routes and UI. Read code alongside the inherited
docs, which include historical descriptions. Dependencies and runtime checks
have not yet been run for this clone. CI uses Node 26; the initial local shell
has Node 23.11.0. Before distributing a fork build, review upstream branding,
Electron app identity, signing configuration, and update/release destinations.

---

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# No guessing

All design authority belongs to the human. **Never guess a design or implementation decision.** If anything is ambiguous — naming, behavior, data shapes, UX, defaults, scope boundaries, prompt wording — STOP and ask with the ask-user-question tool before proceeding. If you are "a little unsure," you are unsure: ask. A wrong guess is far more expensive than a question. Ask early, ask specific, one question per call.

Concretely: first investigate and plan rigorously (asking the user design questions along the way), get the plan approved by the user, and only then implement. Implementation should be mechanical execution of an approved plan — not interpretation.
