# Porting ColdCalling CRM to Windows

This guide explains how to run and support the ColdCalling CRM stack on Windows, what breaks when moving from Linux, and the lowest-effort paths to get productive.

## What’s in this repo (at a glance)

- crm-app (Node/Express backend + React frontend)
  - Server: Node.js + Express + sqlite3/pg
  - Client: Create React App (CRA)
  - Scripts: many Linux-only bash scripts (start.sh, start-dev.sh, etc.)
- vvebjs (Node utilities/servers for the website builder)
  - Uses better-sqlite3 and small Node servers (simple-server.js, save-server.js)
  - package.json script uses rm -rf (Linux-only)
- chromeExtensionRealtor/backend (Node/Express + Postgres)
- Various utility bash scripts across the repo

The application code is cross-platform JavaScript. The automation around it is Linux-centric.

## TL;DR options

- Easiest: Use WSL2 on Windows and keep using the existing bash scripts unchanged.
- Native Windows: Replace shell-specific commands with cross-platform Node tools and npm scripts. Small refactors are needed, especially for process/port cleanup and file ops.
- Containers: Use Docker Compose to run services consistently on Windows/Linux. More setup, but fully portable.

## Porting status summary

- App code (Node, React): OK on Windows
- Dev tooling in bash scripts: Needs changes or WSL
- Native modules: better-sqlite3 may need Windows build tools; sqlite3 usually ships prebuilt binaries for common Node versions
- Hardcoded Linux paths: Must be removed or made relative

## Key Linux-only bits to address

The following are used in scripts and will not work natively on Windows PowerShell/cmd:

- Process/port tooling: lsof, pgrep, pkill, xargs, kill -9
- Text/file ops: sed -i, rm -rf, cp with Unix options
- Assumptions: #!/bin/bash shebang, direct executable .js with shebang
- Utilities: curl (not guaranteed on Windows; PowerShell has Invoke-WebRequest)

Recommended cross-platform replacements (add as devDependencies where relevant):

- Port cleanup: kill-port or find-process + tree-kill
- Parallel/startup orchestration: concurrently, wait-on
- Environment variables: cross-env
- File removal: rimraf or del-cli
- In-file replace: replace-in-file
- Open browser: open (aka opn)

Example installation (run in each Node package that needs it):

- rimraf, kill-port, wait-on, cross-env, replace-in-file, open

## Hardcoded Linux paths to fix

Search results show absolute Linux paths baked in. Replace with relative paths or use path.join/process.cwd():

- vvebjs/enhanced-realtor-generator.js
  - this.baseDir = '/home/realm/Documents/ColdCalling CRM B-extract.8.22 -.BETA35'
- vvebjs/vvebjs-realtor-generator.js
  - this.baseDir = '/home/realm/Documents/ColdCalling CRM B-extract.8.22 -.BETA35'
- test-phone-formatting.sh
  - cd /home/realm/Documents/ColdCalling\\ CRM\\ B-extract.8.22\\ -.BETA35/crm-app
- ensure-save-server.sh
  - SAVE_SERVER_DIR="/home/realm/Documents/ColdCalling CRM B-extract.8.22 -.BETA35/vvebjs"
- modular-website-system/test-testimonials.js
  - fs.writeFileSync('/home/realm/Documents/ColdCalling CRM B-extract.8.22 -.BETA35/debug-website.html', ...)

Action: rewrite to use relative locations from repo root or computed paths via Node’s path.resolve. Avoid absolute, user-specific file system roots.

## Component-by-component guidance

### crm-app (primary server + client)

- package.json scripts are Windows-friendly:
  - "dev": concurrently to run backend and frontend
  - "server": nodemon server/index.js
  - "client": cd client && npm start
  - "start": node server/index.js
- What breaks: start.sh and start-dev.sh use Linux-only tools (lsof, pkill, sed, etc.).

Low-effort paths:

- Use npm scripts directly instead of bash:
  - In crm-app directory:
    - npm install
    - cd client && npm install && cd ..
    - npm run dev
- If ports are stuck on Windows, use one of:
  - npx kill-port 3000 5000 5001 3030 3031
  - Or PowerShell: netstat -ano | findstr :5000 then taskkill /PID <pid> /F

Optional improvements (native Windows friendliness):

- Add kill-port and wait-on to dev workflow, e.g.:
  - "predev": "kill-port 3000 5000 || exit 0"
  - "dev": "concurrently \"npm run server\" \"npm run client\""

### vvebjs (website builder helpers)

- package.json contains scripts:
  - "serve-realtor": node simple-server.js (OK on Windows)
  - "start-save-server": node save-server.js (OK on Windows)
  - "clean-realtors": rm -rf generated-realtors/* (NOT OK on Windows)
- Replace rm -rf with rimraf:
  - npm i -D rimraf
  - Change script to: "clean-realtors": "rimraf \"generated-realtors/*\""
- better-sqlite3 may require compile tools on Windows:
  - Install msbuild/Visual Studio Build Tools and Python (see below), or use prebuilt releases compatible with your Node version.

### chromeExtensionRealtor/backend

- Node + Express + Postgres; scripts are OK on Windows
- .env example defaults to PORT=3001; start.sh rewrites this to 5001 on Linux using sed
  - On Windows, set the port manually in chromeExtensionRealtor/backend/.env (PORT=5001) to match the rest of the system if you rely on the bash script’s conventions

## Prerequisites for native Windows (no WSL)

- Node.js 18+ and npm
- Git (optional but convenient)
- For native modules:
  - Windows Build Tools (Visual Studio Build Tools with C++ workload)
  - Python 3.x in PATH

These are needed for better-sqlite3 and sometimes sqlite3 if no prebuilt binary matches your Node version.

## Recommended Windows workflows

### Option A: WSL2 (easiest)

- Install WSL2 and a Linux distro (Ubuntu recommended)
- Inside WSL:
  - Install Node.js and npm
  - Use the existing bash scripts as-is (start.sh, etc.)

Pros: zero script changes. Cons: cross-filesystem access between Windows and WSL needs care.

### Option B: Native Windows (PowerShell/cmd)

- Do not use the bash scripts. Use npm scripts and minimal cross-platform helpers.
- Per package setup:
  1) crm-app
     - npm install
     - cd client && npm install && cd ..
     - npm run dev
  2) vvebjs
     - npm install
     - If using clean-realtors, add rimraf and update the script as described
     - To serve: npm run serve-realtor
     - To start save server: npm run start-save-server
  3) chromeExtensionRealtor/backend
     - npm install
     - Copy .env.example to .env and set PORT=5001 (or leave at 3001 and adjust where needed)
     - npm start

- If ports are busy on Windows, free them using one of:
  - npx kill-port 3000 5000 5001 3030 3031
  - PowerShell netstat + taskkill

### Option C: Docker (portable)

- Create a docker-compose.yml that defines services for:
  - crm-app server (Node)
  - client build served by server or a static nginx (optional)
  - vvebjs servers (optional)
  - chromeExtensionRealtor/backend (Node + Postgres)

This brings consistency but adds container overhead.

## What you don’t need to change

- The package.json scripts for crm-app already use cross-platform tools (concurrently, nodemon). They run fine on Windows.
- CRA dev server runs on Windows unchanged.

## What you should change (actionable list)

- Replace Linux-only rimraf/rm commands:
  - vvebjs/package.json → replace "rm -rf generated-realtors/*" with rimraf
- Remove hardcoded absolute Linux paths (see list above)
- Avoid sed -i in scripts; replace with replace-in-file or write a tiny Node script to mutate .env
- Avoid lsof/pgrep/pkill in startup flows; either:
  - Drop port-kill entirely and rely on OS to reclaim ports after app exit
  - Or add kill-port in npm prestart scripts

## Can this run on Windows without hard work?

- Yes, the core apps (backend, frontend, extension backend, vvebjs servers) run on Windows via Node/npm.
- Minimal friction items:
  - Do not use the bash scripts; use package.json scripts instead
  - Change one vvebjs script to rimraf
  - Ensure .env files are edited manually instead of sed
  - Install Windows build tools for better-sqlite3 (one-time)
- If you prefer zero changes, use WSL2.

## Appendix: Linux vs Windows command map

- rm -rf path → rimraf path (npm package) or PowerShell Remove-Item -Recurse -Force
- lsof -ti :PORT → PowerShell: netstat -ano | findstr :PORT
- kill -9 PID → taskkill /PID PID /F
- pgrep/pkill pattern → tasklist | findstr pattern + taskkill /PID
- sed -i 's/a/b/' file → replace-in-file (npm) or PowerShell -replace in a script
- curl http://… → PowerShell Invoke-WebRequest or npm axios/node-fetch in a small script

## Quick verification checklist

- [ ] crm-app: npm run dev works and opens http://localhost:3000
- [ ] Server reachable at http://localhost:5000
- [ ] vvebjs: npm run serve-realtor responds at http://localhost:3030
- [ ] vvebjs save server: npm run start-save-server responds at http://localhost:3031/health
- [ ] chromeExtensionRealtor/backend: npm start responds at http://localhost:5001/health (or 3001 if unchanged)
- [ ] No scripts rely on absolute /home/... paths
- [ ] If better-sqlite3 is used, Windows build tools are installed

---

If you want, we can add a small cross-platform start script (Node) that replaces start.sh and works on Windows and Linux alike. Let me know and I’ll wire it up with kill-port, wait-on, and proper health checks.
