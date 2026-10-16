# MCP File-Server Connector

**Author:** Luciano Martin Mariano | **Course project:** Midterms Pt 1 | **Repository:** https://github.com/be1ume/mcp-server

## Overview

This project provides a Node.js and TypeScript MCP server that lets Claude and other MCP clients access a sandboxed local `workspace/` over HTTP. The connection flow is:

```text
Claude -> HTTPS -> ngrok -> Node.js server (port 3000) -> workspace/
```

## Tech stack

| Area | Technology |
|---|---|
| Runtime and language | Node.js 20.6+, TypeScript, ES modules |
| MCP | `@modelcontextprotocol/sdk` with Streamable HTTP |
| HTTP framework | Express |
| Input validation | Zod |
| Development and build | `tsx` for development; `tsc` for production builds |
| Deployment | ngrok for remote access; pm2 for process management |
| Authentication | `MCP_AUTH_TOKEN` bearer token and OAuth sign-in (implemented); secret and role in the URL path (planned) |

## Tools (11)

| # | Tool | What it does |
|---|---|---|
| 1 | `list_files` | List files and folders |
| 2 | `read_file` | Read a text file |
| 3 | `write_file` | Create or overwrite a file (200 KB limit) |
| 4 | `str_replace` | Replace one exact piece of text; fails on zero or multiple matches |
| 5 | `move_file` | Move a file within the workspace |
| 6 | `delete_file` | Delete a file (files only, not folders) |
| 7 | `search_code` | Search text inside files |
| 8 | `get_repo_map` | Show a map of the repository's files |
| 9 | `git_status` | Show repository status |
| 10 | `git_diff` | Show uncommitted changes |
| 11 | `git_log` | Show recent commits |

## Security and handoff

Workspace paths are checked by `safePath()` to prevent `../` traversal outside `workspace/`. The `/mcp` endpoint requires `MCP_AUTH_TOKEN`; OAuth sign-in is also implemented. Keep `.env` secret and treat workspace content as data, not instructions.

`workspace/PROTOCOL.md` describes how agents use project state, plans, checkpoints, and decision records to hand off work between sessions. The server provides file access, but does not enforce that workflow.

## Run and verify

1. Build with `npm run build`.
2. Start the server and ngrok with `pm2 start .\ecosystem.config.cjs` (Figure 01).
3. Add the ngrok URL (`https://<your-domain>.ngrok-free.dev/mcp`) as a custom connector in Claude (Figure 00) and sign in with the MCP server token (Figure 06).
4. Confirm the 11 tools are listed (Figure 02) and that a tool call works (Figure 03).
5. Quick security check: a request without a bearer token returns `401 Unauthorized` (Figure 04), and a path outside `workspace/` is rejected (Figure 05).

The separate server quick check from the setup notes is to write and read `hello.txt`, then confirm that reading `../package.json` is rejected.

## Demo: two sessions, one project

Two separate agent sessions worked on the same project, `workspace/projects/simple-calculator/`. They shared no chat history; the second session resumed only from the files left by the first. Session 1 ran in Claude and Session 2 ran in ChatGPT, both connected to the same MCP server (Figure 12).

### Session 1: Create the calculator

[Session 1 conversation transcript](https://claude.ai/share/03c24076-99ea-409a-bf76-6f7f8bdddf22)

1. The agent read `PROTOCOL.md`, then created the project structure, `PROJECT_STATE.md`, and the plan `PLAN_LOG/S01_001_initial-calculator.md`.
2. It created `calc.py`, a command-line calculator supporting `+ - * /`, with a clear error message for division by zero instead of a crash.
3. It recorded decision `D001_command-line-arguments-input.md`, explaining why input comes from command-line arguments, and ended with `CHECKPOINTS/S01_checkpoint.md`.
4. The MCP server has no tool for running code, so the agent reported `calc.py` as untested. The author ran it locally: `py calc.py 6 "*" 7` printed `42` (Figure 07).
5. The author committed the work as `fc669a1` (Figure 08).

### Session 2: Resume and add interactive mode

[Session 2 conversation transcript](https://chatgpt.com/share/6ad1c3c9-22c0-83ec-b7ba-1d229da28a8f)

1. The agent started from the files, as the protocol requires, and ran the Git check. It found that the S01 checkpoint said no commits existed, while Git history showed the author had since committed (`fc669a1`), and reported that difference.
2. It planned and added an interactive mode: running `python calc.py` with no arguments starts a loop where expressions such as `2 + 3` are evaluated and `quit` exits.
3. It recorded `D002_interactive-and-cli-input.md` with `Replaces: D001`, leaving the old decision file unedited.
4. It added `test_calc.py`. The test run reported `Ran 6 tests ... OK` (Figure 09).
5. It updated the project state and plan and wrote `CHECKPOINTS/S02_checkpoint.md`. The author committed the work as `0cb29b1` (Figures 10 and 11).

This demonstrates the handoff flow: session 1 saves code and progress in the workspace; session 2 reads those files, detects what changed, extends the code, verifies it, and updates the handoff records.

### Prompts used

```text
Session 1 Prompt:
Read PROTOCOL.md at the workspace root and follow it.

Start a new project called "simple-calculator". Goal: a small Python
command-line calculator that takes two numbers and an operator as arguments,
for example: python calc.py 2 + 3

This session:
1. Create the project structure and PROJECT_STATE.md.
2. Write a plan in PLAN_LOG/.
3. Create calc.py supporting + - * / only. Handle division by zero with a
   clear error message instead of a crash.
4. Record a decision on why input comes from command-line arguments.
5. End the session with a checkpoint.

Don't add any features beyond this. Tell me which files you created or updated.

Session 2 Prompt:
Read PROTOCOL.md at the workspace root and follow it.

Continue the project "simple-calculator".

This session:
1. Start the session per the protocol, including the git check. Tell me
   if anything changed that the last checkpoint doesn't explain.
2. Plan and add an interactive mode: running python calc.py with no
   arguments starts a loop where I type expressions like "2 + 3" and
   type "quit" to exit.
3. Reverse the session 1 input decision: command-line arguments are no
   longer the only input method. Record this as a new decision with
   "Replaces: D001". Don't edit the old decision file.
4. Add a small test file, test_calc.py, covering each operator and division by zero.
5. End the session with a checkpoint, including the Git line.

Tell me which files you created or updated.
```

## Simple calculator project records

The handoff artifacts for `workspace/projects/simple-calculator/` are:

- [PROJECT_STATE.md](../workspace/projects/simple-calculator/PROJECT_STATE.md) — current project status and next steps
- [S01_checkpoint.md](../workspace/projects/simple-calculator/CHECKPOINTS/S01_checkpoint.md) and [S02_checkpoint.md](../workspace/projects/simple-calculator/CHECKPOINTS/S02_checkpoint.md) — session summaries
- [S01_001_initial-calculator.md](../workspace/projects/simple-calculator/PLAN_LOG/S01_001_initial-calculator.md) and [S02_001_interactive-calculator.md](../workspace/projects/simple-calculator/PLAN_LOG/S02_001_interactive-calculator.md) — implementation plans
- [D001_command-line-arguments-input.md](../workspace/projects/simple-calculator/DECISIONS/D001_command-line-arguments-input.md) and [D002_interactive-and-cli-input.md](../workspace/projects/simple-calculator/DECISIONS/D002_interactive-and-cli-input.md) — design decisions (D002 replaces D001)
- [calc.py](../workspace/projects/simple-calculator/calc.py) — the calculator
- [test_calc.py](../workspace/projects/simple-calculator/test_calc.py) — unit tests

## Evidence pictures

These screenshots are in [`docs/evidence/`](./evidence/):

| Figure | File | Shows |
|---|---|---|
| 00 | [00-claude-mcp-connect.png](./evidence/00-claude-mcp-connect.png) | Claude's "Add custom connector" dialog finding the server (401, then sign-in settings found) |
| 01 | [01-pm2-status.png](./evidence/01-pm2-status.png) | pm2 running `mcp-server` and `ngrok` |
| 02 | [02-tool-list.png](./evidence/02-tool-list.png) | The 11 tools available |
| 03 | [03-tool-call.png](./evidence/03-tool-call.png) | A tool call (`read_file` on `PROTOCOL.md`) in the MCP Inspector |
| 04 | [04-auth-without-bearer-token.png](./evidence/04-auth-without-bearer-token.png) | `401 Unauthorized` without a bearer token, locally and through ngrok |
| 05 | [05-sandbox-blocked.png](./evidence/05-sandbox-blocked.png) | A path outside the workspace rejected |
| 06 | [06-oauth-sign-in.png](./evidence/06-oauth-sign-in.png) | The OAuth "Authorize Claude" page |
| 07 | [07-demo-session-1.png](./evidence/07-demo-session-1.png) | Session 1: project files created and `calc.py 6 "*" 7` → `42` |
| 08 | [08-demo-session-1-commits.png](./evidence/08-demo-session-1-commits.png) | Session 1 commit `fc669a1` |
| 09 | [09-demo-session-2.png](./evidence/09-demo-session-2.png) | Session 2: new files and 6 tests passing |
| 10 | [10-demo-session-2-commits.png](./evidence/10-demo-session-2-commits.png) | Session 2 commit `0cb29b1` |
| 11 | [11-git-log.png](./evidence/11-git-log.png) | `git log` showing both session commits |
| 12 | [12-multiple-agent-working.png](./evidence/12-multiple-agent-working.png) | Claude (Session 1) and ChatGPT (Session 2) working on the same project |