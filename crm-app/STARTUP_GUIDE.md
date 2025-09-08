# 🚀 ColdCalling CRM - Quick Start

## One Simple Command to Start Everything

### Linux/Mac:
```bash
./start.sh
```

### Windows:
```cmd
start.bat
```

That's it! The script automatically:
- ✅ Checks for Node.js and npm
- ✅ Installs missing dependencies
- ✅ Cleans up conflicting processes
- ✅ Starts both frontend and backend servers
- ✅ Opens your browser automatically

## What You'll Get

- **Frontend**: http://localhost:3000 (React app with hot reload)
- **Backend**: http://localhost:5000 (Express API server)
- **Live Development**: Changes auto-reload/restart automatically

## First Time Setup

Just run the startup script - it handles everything automatically!

## 🔧 Requirements

- **Node.js** (v14 or higher) - Download from [nodejs.org](https://nodejs.org/)
- **npm** (comes with Node.js)

## � Tips

- Press `Ctrl+C` to stop both servers
- Frontend changes reload instantly
- Backend changes restart the server automatically
- Your browser opens automatically to the app

## �️ What Gets Created

```
crm-app/
├── node_modules/          # Backend dependencies (auto-installed)
├── client/
│   ├── node_modules/      # Frontend dependencies (auto-installed)
│   └── src/              # Your React app
├── server/               # Your Express API
├── databases/            # SQLite databases (auto-created)
└── start.sh / start.bat  # One-click startup!
```

## 🎯 SMS Feature

Once the app is running:
1. Install the Android SMS app (APK provided separately)
2. Connect your phone to the same WiFi network
3. Follow the in-app pairing instructions
4. Start sending texts directly from the CRM!

## ❓ Troubleshooting

**Script won't run (Linux/Mac)?**
```bash
chmod +x start.sh
```

**Port already in use?**
The script automatically kills conflicting processes.

**Dependencies fail to install?**
Check your internet connection and try again.

**Need help?**
All output is clearly labeled - look for ❌ error messages in the terminal.
