# CSV-to-CRM Local Database Edition

A powerful, locally-hosted CRM application that works with CSV files and SQLite databases. Perfect for cold calling campaigns with multiple database support.

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation

1. **Clone or download this project**
2. **Run the setup script:**
   
   **Linux/Mac:**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```
   
   **Windows:**
   ```cmd
   setup.bat
   ```

3. **Start the application:**
   ```bash
   npm start
   ```

4. **Open your browser to:**
   ```
   http://localhost:5000
   ```

## 🎯 Features

### 🗄️ Multiple Database Support
- Create and switch between different SQLite databases
- Perfect for organizing different campaigns or clients
- All data stored locally on your machine

### 📊 CSV Import/Export
- Drag & drop CSV import with automatic header detection
- Export your data with all notes and updates
- UTF-8 support for international characters

### 📞 Cold Calling Cockpit
- Dedicated right panel for focused calling workflow
- Quick status updates: "No Answer", "Left VM", "Interested", etc.
- Notes, last contacted tracking, and follow-up scheduling
- Click-to-call phone number detection

### 🎨 Smart Data Rendering
- Clickable links for URLs
- Inline image thumbnails for image URLs
- Responsive table with sorting and pagination
- Search across all fields

### ⌨️ Keyboard Shortcuts
- `←/→` - Navigate between records
- `S` - Export CSV
- `1` - Set status to "No Answer"
- `2` - Set status to "Left Voicemail"
- `3` - Set status to "Interested"
- `4` - Set status to "Not Interested"

### 🌙 Dark Mode
- Toggle between light and dark themes
- Settings persist across sessions

## 🏗️ Architecture

### Backend (Node.js + Express)
- SQLite database for local storage
- RESTful API for data operations
- CSV parsing and file upload handling
- Multiple database management

### Frontend (React)
- Modern React with hooks
- Tailwind CSS for styling
- Framer Motion for animations
- Axios for API communication

## 📁 Project Structure

```
crm-app/
├── server/
│   ├── index.js          # Express server
│   └── databases/        # SQLite database files
├── client/
│   ├── src/
│   │   ├── App.js       # Main React component
│   │   └── index.js     # React entry point
│   ├── public/
│   └── build/           # Production build
├── uploads/             # Temporary CSV uploads
├── package.json         # Server dependencies
├── setup.sh            # Linux/Mac setup script
├── setup.bat           # Windows setup script
└── README.md           # This file
```

## 🔧 Development

### Development Mode (with auto-reload)
```bash
npm run dev
```

This runs both the server and client in development mode with automatic reloading.

### Manual Development
```bash
# Terminal 1: Start server
npm run server

# Terminal 2: Start client
npm run client
```

### Building for Production
```bash
npm run build
```

## 💾 Database Management

### Database Location
- SQLite databases are stored in `server/databases/`
- Each database is a `.db` file
- Data persists between application restarts

### Database Schema
Each database contains:
- `contacts` table: Stores all contact records with notes, status, etc.
- `metadata` table: Stores CSV headers and other configuration

### Switching Databases
1. Click the "Databases" button in the header
2. Select an existing database or create a new one
3. All operations (import, edit, export) apply to the current database

## 🛡️ Privacy & Security

- **100% Local**: All data stays on your machine
- **No Cloud**: No data sent to external servers
- **Offline Capable**: Works without internet connection
- **Data Portability**: Export your data anytime as CSV

## 🔄 Importing Data

### Supported Formats
- CSV files with UTF-8 encoding
- Automatic header detection
- Handles quotes and commas in fields

### Import Process
1. Select or create a database
2. Click "Import CSV" and choose your file
3. Data is automatically parsed and saved
4. Original CSV structure is preserved with added CRM fields

## 📤 Exporting Data

### Export Features
- Exports current database to CSV
- Includes all original fields plus CRM additions:
  - Notes
  - Status
  - LastContacted
  - FollowUpAt
- Timestamped filename for organization

## 🚨 Troubleshooting

### Common Issues

**"No database selected" error:**
- Create a new database using the Database Manager
- Or select an existing database from the list

**CSV import fails:**
- Ensure file is valid CSV format
- Check that file encoding is UTF-8
- Verify file size is reasonable (< 50MB recommended)

**Port 5000 already in use:**
- Stop other applications using port 5000
- Or modify the PORT in `server/index.js`

### Logs
- Server logs appear in the terminal where you ran `npm start`
- Check browser console for client-side errors

## 🤝 Contributing

This is designed to be a self-contained application. To modify:

1. **Backend changes**: Edit `server/index.js`
2. **Frontend changes**: Edit `client/src/App.js`
3. **Dependencies**: Update respective `package.json` files
4. **Rebuild**: Run `npm run build` after changes

## 📄 License

MIT License - feel free to use and modify for your needs.

---

**Happy Cold Calling! 📞✨**
