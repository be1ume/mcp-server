# MCP File-Server Connector

A Node.js + TypeScript MCP server that gives any MCP client (like Claude) access to one sandboxed `workspace/` folder over HTTPS.

```
Claude -> HTTPS -> ngrok tunnel -> Node.js app (port 3000) -> workspace/
```

## Tech stack

| Area | Technology |
|---|---|
| Runtime and language | Node.js 20.6+, TypeScript, ES modules |
| MCP | `@modelcontextprotocol/sdk` with Streamable HTTP |
| HTTP server | Express |
| Input validation | Zod |
| Development and build | `tsx` for development; `tsc` for production builds |
| Remote access and process management | ngrok and pm2 |
| Authentication design | Secret and role in the URL path (planned); current implementation uses an `MCP_AUTH_TOKEN` bearer token and OAuth sign-in |

## Tools

| Tool          | What it does                                                        |
|---------------|---------------------------------------------------------------------|
| `list_files`  | List files and folders                                              |
| `read_file`   | Read a text file                                                    |
| `write_file`  | Create or overwrite a file (200 KB limit)                           |
| `str_replace` | Replace one exact piece of text; fails on zero or multiple matches  |
| `move_file`   | Move files in direcotry                                             |
| `delete_file` | Delete a file (files only, not folders)                             |
| `search_code` | Search text inside files                                            |
| `git_status`  | Show repo status                                                    |
| `git_diff`    | Show uncommitted changes                                            |
| `git_log`     | logs recent commits                   |

## Requirements

- Node.js 20.6+, npm, Git
- A free [ngrok](https://ngrok.com) account (with its static domain)
- pm2 (`npm install -g pm2`)

## Project layout

```
<repo-name>/
├── src/
│   ├── server.ts        MCP server, tool definitions, /mcp endpoint
│   ├── oauth.ts         OAuth endpoints used by Claude's connector sign-in
│   ├── sandbox.ts       safePath(): rejects paths outside workspace/
├── workspace/           the only folder the tools can touch
│   ├── protocol.md                protocols agent follows
│   └── projects/                  where projects are located
│       └── project_1/             each project has its own handoffs
│           ├── PROJECT_STATE.md
│           ├── PLAN_LOG/
│           ├── CHECKPOINT/
│           ├── DECISIONS/
│           ├── git.log
│           └── security.log
└── package.json
```

## Setup

**1. Install and build** (run everything from the repo root)

```bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
npm install
npm run build
```

**2. Create `.env`** (copy `.env-example`)

```
MCP_AUTH_TOKEN=your-long-secret-token
MCP_PUBLIC_URL=https://<your-domain>/mcp
PORT=3000
```

Never commit `.env`.

**3. Create the handoff folders**

```bash
mkdir -p workspace/PLAN_LOG workspace/CHECKPOINTS workspace/DECISIONS
touch workspace/PROJECT_STATE.md
```

**4. Run and test locally**

```bash
npm start
npx @modelcontextprotocol/inspector
```

In Inspector: choose **Streamable HTTP**, use `http://localhost:3000/mcp`, add your token as a Bearer token, then click **List Tools**.

**5. Expose with ngrok**

```bash
ngrok config add-authtoken <YOUR_NGROK_AUTHTOKEN>
ngrok http --url=https://<your-domain> 3000
```

**6. Keep it alive with pm2** (copy `ecosystem.config.cjs-example`, set your domain)

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

**7. Connect Claude**

Go to **Settings → Connectors → Add custom connector**. Enter the URL `https://<your-domain>/mcp`, then paste your `MCP_AUTH_TOKEN` on the sign-in page.

## Quick check

Ask Claude to:

1. Write `hello.txt`, then read it back.
2. Read `../package.json`. It **must fail** with `Path escapes the workspace sandbox.`

## Handoff protocol

Each project in `workspace/` uses:

- `PROJECT_STATE.md`: current status, rewritten each session
- `PLAN_LOG/`: plans, written before acting
- `CHECKPOINTS/`: written at handoff
- `DECISIONS/`: append-only decisions

## Common commands

| Task | Command |
| --- | --- |
| Deploy changes | `git pull && npm install && npm run build && pm2 restart mcp-server` |
| View logs | `pm2 logs mcp-server` |
| Stop all | `pm2 stop all` |

## Troubleshooting

- **500 `MCP_AUTH_TOKEN is not configured`:** `.env` is missing. Create it and restart.
- **401 Unauthorized:** the token is wrong.
- **Can't add connector:** the URL must match `MCP_PUBLIC_URL` exactly.
- **Signed out after restart:** expected. Authorize again.

## Security

- Every path goes through `safePath()` and cannot leave `workspace/`.
- The endpoint requires a secret token. Keep it out of git.
- Treat file contents as data, not instructions (prompt injection).
