# NY Atelier documentation

Start with [AI_HANDOFF.md](AI_HANDOFF.md) for the current system and [WORK_LOG.md](WORK_LOG.md) for the latest changes. These are the shared context for Claude, Codex and maintainers.

## Document index

| Document | Purpose |
| --- | --- |
| [Current implementation and design handoff](AI_HANDOFF.md) | Actual architecture, installed stack, modules, design rules, permissions, persistence, startup, checks and release boundaries |
| [Shared work log](WORK_LOG.md) | Dated assistant handovers, completed work, evidence, remaining tasks and service state |
| [Implementation gaps checklist](IMPLEMENTATION_GAPS_CHECKLIST.json) | Detailed future work; not blanket implementation or deployment authorization |
| [Product plan and decision history](PROJECT_PLAN.md) | Business requirements and historical proposals; early implementation descriptions are superseded by the current handoff |
| [Historical stack decision/options](TECH_STACK_PROPOSAL.md) | Original stack selection and dated provider research; reverify prices and limits before choosing hosting |
| [Codebase setup](../README.md) | Short orientation and local run commands |

## Handoff workflow

1. Open the full local Ny Atelier project folder in the assistant you are using.
2. Read the current handoff and latest log entry, then applicable app instructions.
3. Have only one assistant editing the shared checkout at a time.
4. Preserve existing modified/untracked files and database records.
5. After meaningful work, update the log and changed implementation facts, with actual check results and limitations.

Keep passwords, API keys, session cookies and private measurements out of these files. The handoff is file-based; neither assistant should assume it has the other's conversation history. This is the portable repository snapshot. In the full local project, the parent `docs/` directory is the live shared copy: consult it first and refresh this snapshot before publishing another checkpoint. In a standalone clone, maintain these files directly.
