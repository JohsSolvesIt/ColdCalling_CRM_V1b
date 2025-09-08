# 🗄️ Neon Database Setup Guide

## Quick Setup Process

### Step 1: Create Neon Project
1. Go to [console.neon.tech](https://console.neon.tech)
2. Click "Create Project"
3. Project name: `crm-production`
4. Choose your region (closest to your users)
5. Click "Create Project"

### Step 2: Get Connection String
1. In your Neon dashboard, look for "Connection Details"
2. Copy the **Connection string** (it looks like this):
   ```
   postgresql://username:password@hostname:5432/database?sslmode=require
   ```
3. Save this string - you'll need it for the setup script

### Step 3: Run Local Setup Script
```bash
# Run the automated setup script
./setup-neon-db.sh
```

The script will:
- ✅ Test your connection
- ✅ Create all required tables
- ✅ Set up indexes for performance
- ✅ Create views for analytics
- ✅ Give you the DATABASE_URL for Netlify

### Step 4: Test Your Setup (Optional)
```bash
# Test that everything works
./test-neon-connection.sh 'your-connection-string-here'
```

## What Gets Created

### Tables:
- **agents** - Real estate agent information + CRM fields
- **properties** - Property listings linked to agents  
- **extraction_logs** - Chrome extension activity logs
- **recommendations** - Testimonials and reviews

### Views:
- **agent_stats** - Analytics for each agent (property counts, pricing, CRM status)
- **recent_extractions** - Recent Chrome extension activity

### Features:
- 🔄 **Auto-updating timestamps**
- 📊 **Performance indexes** 
- 🔐 **UUID primary keys**
- 📱 **CRM fields** (notes, status, follow-up dates)
- 🗂️ **JSON fields** for flexible data storage

## Troubleshooting

### Connection Issues:
- Make sure your Neon project is active (not paused)
- Check that the connection string is copied correctly
- Ensure you have internet connection

### Permission Issues:
- The setup script requires `psql` (PostgreSQL client)
- Install with: `sudo apt install postgresql-client`

### Schema Issues:
- The script is idempotent (safe to run multiple times)
- If tables already exist, it will skip creation
- Check the output for any error messages

## Next Steps

After successful database setup:

1. **Copy your DATABASE_URL** (the connection string)
2. **Deploy to Netlify** using your GitHub repository
3. **Add environment variables** in Netlify:
   - `DATABASE_URL=your-connection-string`
   - `NODE_ENV=production`

Your CRM will then be live and ready to use! 🚀
