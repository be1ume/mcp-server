# MCP File-Server Connector: Installation Guide

*Midterms Pt 1 · CS 3A / CS 3B · Windows-first, with notes for macOS and Linux*

## 1. What you are installing

A Node.js + TypeScript MCP server that exposes one sandboxed `workspace/` folder to any MCP client over Streamable HTTP. When everything is running, the chain looks like this:

```
Claude (or any MCP client) -> HTTPS -> ngrok tunnel -> Node.js app (port 3000) -> workspace/
```

The Node app and the tunnel are both kept alive by pm2. The server exposes 8 tools: `list_files`, `read_file`, `write_file`, `str_replace`, `move_file`, `delete_file`, `search_code` and `get_repo_map`.

## 2. Prerequisites

| Requirement | Notes |
| --- | --- |
| Node.js 20.6 or newer | Check with `node -v` |
| npm | Comes with Node.js |
| Git | Check with `git --version` |
| ngrok account | Free is enough. It includes one static domain |
| ngrok agent | Installed in section 9 |
| pm2 | Installed in section 10 |
| Claude account | Custom connectors are available on free plans (limited to one) and paid plans |

On Windows you can install the first three tools with winget, then **close and reopen your terminal**:

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
winget install ngrok.ngrok
```

## 3. Get the code

```powershell
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
```

**Run every command in this guide from the repo root.** The sandbox path `./workspace` is resolved relative to the folder you launch the server from, so starting it elsewhere points the sandbox at the wrong place.

## 4. Project layout

```
<repo-name>/
├── src/
│   ├── server.ts        MCP server, tool definitions, /mcp endpoint
│   ├── oauth.ts         OAuth endpoints used by Claude's connector sign-in
│   ├── sandbox.ts       safePath(): rejects paths outside workspace/
│   └── tools/
│       ├── search.ts    search_code
│       └── repo-map.ts  get_repo_map
├── workspace/           the only folder the tools can touch
│   ├── CHECKPOINTS/
│   ├── PLAN_LOG/
│   └── workspace_1/
└── package.json
```

## 5. Install dependencies and build

```powershell
npm install
npm run build
```

The build compiles `src/` into `dist/`. If your `package.json` has no `build` or `start` script, see Appendix A.

## 6. Configure environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `MCP_AUTH_TOKEN` | Yes | The secret that protects the server. Without it, `/mcp` returns a 500 error |
| `MCP_PUBLIC_URL` | Yes, once the tunnel exists | The public MCP URL, for example `https://your-domain.ngrok-free.dev/mcp`. Include `/mcp` |
| `PORT` | No | Local port. Defaults to `3000` |

The server reads these from its environment, and the simplest way to supply them is a `.env` file in the repo root. Node 20.6 or newer can load it with the `--env-file` flag, so no extra package is needed.

Generate a strong token:

```powershell
node -p "require('node:crypto').randomBytes(32).toString('base64url')"
```
Or Create your own long strong token like `testing12345`

Create a file named `.env` in the repo root (next to `package.json`) with these three lines
(See `.env-example` for reference):
```
MCP_AUTH_TOKEN=paste-your-token-here
MCP_PUBLIC_URL=https://<your-domain>/mcp
PORT=3000
```

Don't wrap values in quotes or put spaces around `=`, and never commit `.env`. It is already in the recommended `.gitignore` (Appendix A). Save the token in a password manager, because you will paste it into Claude's sign-in page in section 11. If you like, commit a `.env.example` with the same keys and fake values so classmates know what to create.

Now make `npm start` load the file by changing the `start` script in `package.json`:

```json
"start": "node --env-file=.env dist/server.js"
```

For `npm run dev`, use `tsx --env-file=.env src/server.ts` the same way.

## 7. Prepare the workspace

Git does not track empty folders, so after a fresh clone create the workspace and the handoff structure (the commands skip anything that already exists):

```powershell
mkdir workspace, workspace/PLAN_LOG, workspace/CHECKPOINTS, workspace/DECISIONS -Force
New-Item workspace/PROJECT_STATE.md -ItemType File
```

If `PROJECT_STATE.md` already exists, the second command prints an error and leaves the file alone. That is fine.

The handoff protocol from the course uses these four items per project:

- `PROJECT_STATE.md`: the current truth, rewritten each session
- `PLAN_LOG/`: plans, written before acting
- `CHECKPOINTS/`: written at handoff between sessions
- `DECISIONS/`: append-only record of decisions

## 8. First run and local tests

```powershell
npm start
```

Expected output:

```
MCP server running at http://localhost:3000/mcp
Workspace: C:\...\<repo-name>\workspace
```

Check that the `Workspace:` line points inside your repo.

**Test 1: the auth gate.** In a second terminal:

```powershell
curl.exe -i -X POST http://localhost:3000/mcp
```

You should get `401 Unauthorized` and a `WWW-Authenticate` header. Use `curl.exe`, not `curl`, because plain `curl` is an alias for a different command in PowerShell.

**Test 2: MCP Inspector.**

```powershell
npx @modelcontextprotocol/inspector
```

In the Inspector window:

1. Set Transport Type to **Streamable HTTP**.
2. Set the URL to `http://localhost:3000/mcp`.
3. In the authentication settings, add your token as a Bearer token (an `Authorization: Bearer <token>` header).
4. Click **Connect**, open the **Tools** tab and click **List Tools**. You should see all 8 tools.
5. Run `list_files` with no path. It should list the contents of `workspace/`.

Stop the server with `Ctrl+C` when both tests pass.

## 9. Expose the server with ngrok

1. Sign up at ngrok.com and copy your authtoken from the dashboard.
2. Register it with the agent:

```powershell
ngrok config add-authtoken <YOUR_NGROK_AUTHTOKEN>
```

3. In the ngrok dashboard, open the **Domains** page and claim your free static domain. It looks like `your-name.ngrok-free.dev` (some accounts get `.ngrok-free.app`).
4. Start the tunnel, with the server running on port 3000:

```powershell
ngrok http --url=https://<your-domain> 3000
```

Older ngrok versions use `--domain=<your-domain>` instead of `--url`.

5. Your connector URL is `https://<your-domain>/mcp`. Put it in .env as MCP\_PUBLIC\_URL, then restart the server:

```powershell
npm start
```

6. Confirm the public endpoint answers:

```powershell
curl.exe https://<your-domain>/.well-known/oauth-protected-resource
```

The JSON response should contain a `resource` field equal to your `MCP_PUBLIC_URL`. On the free plan, a **browser** visiting your domain sees an ngrok warning page once. Click **Visit Site** to continue.

## 10. Keep it running with pm2

Stop the manual server and tunnel, then install pm2:

```powershell
npm install -g pm2
```

Create `ecosystem.config.cjs` in the repo root. It runs both the server and the tunnel
(See `.ecosystem.config.cjs-example` for reference):
```js
module.exports = {
  apps: [
    {
      name: 'mcp-server',
      script: 'dist/server.js',
      cwd: __dirname,
      node_args: '--env-file=.env'
    },
    {
      name: 'ngrok',
      script: 'ngrok',
      args: 'http --url=https://<your-domain> 3000',
      interpreter: 'none'
    }
  ]
};
```

Your token now lives in `.env`, so this file holds no secrets and is safe to commit. `node_args: '--env-file=.env'` makes Node load that file, and `cwd: __dirname` makes both that path and the sandbox resolve from the repo root. If pm2 cannot find ngrok, replace `script: 'ngrok'` with the full path printed by `where.exe ngrok`.

Write that path with forward slashes, for example `C:/Users/<you>/AppData/Local/Microsoft/WindowsApps/ngrok.exe`. Single backslashes inside a JavaScript string are read as escape codes, and pm2 then reports `Script not found` with a garbled path. If pm2 still cannot launch ngrok, use `script: 'cmd'` with `args: '/c ngrok http --url=https://<your-domain> 3000'`.

Start everything and save the process list:

```powershell
pm2 start ecosystem.config.cjs
pm2 status
pm2 logs mcp-server --lines 20
pm2 save
```

**Surviving a reboot.** On Windows, `pm2 startup` is not supported. Open Task Scheduler, create a task that runs **at log on**, and set the action to run `pm2.cmd` (usually `%APPDATA%\npm\pm2.cmd`) with the argument `resurrect`. On macOS or Linux, run `pm2 startup`, execute the command it prints, then run `pm2 save` again.

## 11. Connect Claude

1. Open claude.ai (or Claude Desktop) and go to **Settings, then Connectors**.
2. Click **Add custom connector**.
3. Enter a name (for example `file-server`) and the URL `https://<your-domain>/mcp`. It must match `MCP_PUBLIC_URL` exactly.
4. Click **Add**, then **Connect**. Claude opens your server's **Authorize Claude** page.
5. Paste your `MCP_AUTH_TOKEN` and click **Authorize**.
6. In any chat, click **+**, then **Connectors**, and switch `file-server` on.

Any client that supports a static Bearer token can skip OAuth. For example, in Claude Code:

```powershell
claude mcp add --transport http file-server https://<your-domain>/mcp --header 'Authorization: Bearer <your-token>'
```

## 12. Verify end to end

With the connector enabled, try these prompts in order:

1. *Use the file server to show me the repo map.* The directory tree appears.
2. *Write hello.txt with the text 'it works', then read it back.* The file appears in `workspace/`.
3. *Search the workspace for 'it works'.* `hello.txt` is returned.
4. *Read the file at ../package.json.* This must fail with `Path escapes the workspace sandbox.` If it succeeds, stop and fix the sandbox before using the server.
5. *Delete hello.txt.* Cleans up the test file.

## 13. Day-to-day operation

| Task | Command |
| --- | --- |
| Deploy new code | `git pull`, `npm install`, `npm run build`, `pm2 restart mcp-server` |
| Change a variable | Edit `.env`, then `pm2 restart mcp-server` |
| View logs | `pm2 logs mcp-server` |
| Stop everything | `pm2 stop all` |
| Rotate the token | Change `MCP_AUTH_TOKEN` in `.env`, run `pm2 restart mcp-server`, then reconnect your clients |

OAuth sessions are held in memory, so every restart signs Claude out. It will ask you to authorize again. This is expected. Clients using the static Bearer token are unaffected.

## 14. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `500` with `MCP_AUTH_TOKEN is not configured` | `.env` is missing or misnamed, or the server was not started with `--env-file` | Create `.env` in the repo root, then run `pm2 restart mcp-server` |
| `401 Unauthorized` on `/mcp` | Wrong or expired token | Check the token. For Claude, reconnect the connector |
| `invalid_request` during sign-in, or the connector won't add | The URL in Claude differs from `MCP_PUBLIC_URL` | Make them identical, for example `https://<your-domain>/mcp` |
| Sign-in page says the token was not accepted | The pasted value differs from `MCP_AUTH_TOKEN` | Paste again with no extra spaces |
| Tools fail with `ENOENT` on the workspace | `workspace/` is missing, or the server started from another folder | Create the folder and start from the repo root (pm2: set `cwd`) |
| ngrok says the endpoint is already online | Another ngrok session uses the same domain | Run `pm2 status` and stop duplicates, and close other ngrok terminals |
| `EADDRINUSE` | The port is taken | Change `PORT` and the port in the ngrok command |
| PowerShell blocks `pm2.ps1` | Script execution policy | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, or call `pm2.cmd` |
| pm2 cannot start ngrok | pm2 cannot resolve the command | Use the full path from `where.exe ngrok` |
| Claude asks you to reconnect after a restart | OAuth tokens live in memory | Authorize again. Expected behavior |
| New or changed tools do not show in Claude | The client cached the old tool list | Toggle the connector off and on, or start a new chat |

## 15. Security checklist

- The token is never committed. Keep `.env` in `.gitignore`; `ecosystem.config.cjs` holds no secrets.
- The public endpoint rejects requests without a valid token, and the sign-in page also requires it.
- Every tool path goes through `safePath()`. Re-run the traversal test in section 12 after any change to `sandbox.ts`.
- `write_file`, `str_replace`, `move_file` and `delete_file` are enabled. Review your client's tool approval prompts and keep a backup of important workspace files.
- Treat file contents as data, not instructions. A file in the workspace can carry text aimed at the agent (prompt injection).
