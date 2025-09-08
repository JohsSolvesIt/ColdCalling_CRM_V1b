# 🚀 Netlify + Neon Deployment Guide

This guide will help you deploy your CRM application to Netlify with Neon PostgreSQL.

## 📋 Prerequisites

1. **Netlify Account**: Sign up at [netlify.com](https://netlify.com)
2. **Neon Account**: Sign up at [neon.tech](https://neon.tech)
3. **GitHub Repository**: Your code should be in a GitHub repository

## 🗄️ Step 1: Set up Neon Database

### 1.1 Create Neon Project
1. Go to [console.neon.tech](https://console.neon.tech)
2. Click "Create Project"
3. Choose a project name (e.g., "crm-production")
4. Select your preferred region
5. Click "Create Project"

### 1.2 Get Connection Details
1. In your Neon dashboard, go to "Connection Details"
2. Copy the **Connection String** (looks like: `postgresql://username:password@hostname:5432/database?sslmode=require`)
3. Save this for later - you'll need it for Netlify

### 1.3 Create Database Schema
1. Click "SQL Editor" in Neon dashboard
2. Copy and paste the contents of `chromeExtensionRealtor/database/schema.sql`
3. Run the SQL to create all tables and views
4. Copy and paste the contents of `chromeExtensionRealtor/database/crm_migration.sql`
5. Run this SQL to add CRM fields

## 🚀 Step 2: Deploy to Netlify

### 2.1 Connect Repository
1. Go to [app.netlify.com](https://app.netlify.com)
2. Click "New site from Git"
3. Choose GitHub and authorize access
4. Select your CRM repository
5. Set build settings:
   - **Base directory**: `crm-app`
   - **Build command**: `npm run netlify-build`
   - **Publish directory**: `crm-app/client/build`

### 2.2 Configure Environment Variables
1. In Netlify, go to Site Settings → Environment Variables
2. Add these variables:

```bash
# Required - Neon Database
DATABASE_URL=postgresql://username:password@hostname:5432/database?sslmode=require
NODE_ENV=production

# Email Service (if using)
BREVO_API_KEY=your_brevo_api_key
SENDER_EMAIL=your_email@domain.com
SENDER_NAME=Your Name

# SMS Service (if using)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_phone
```

### 2.3 Deploy
1. Click "Deploy site"
2. Wait for build to complete (usually 2-5 minutes)
3. Your site will be available at `https://random-name.netlify.app`

## 🔧 Step 3: Migrate Data (if needed)

If you have existing data in your local PostgreSQL:

### 3.1 Export Local Data
```bash
# Export from local PostgreSQL
pg_dump -h localhost -U postgres -d realtor_data > backup.sql
```

### 3.2 Import to Neon
1. In Neon SQL Editor, run your backup.sql file
2. Or use psql with your Neon connection string:
```bash
psql "postgresql://username:password@hostname:5432/database?sslmode=require" < backup.sql
```

## ✅ Step 4: Verify Deployment

### 4.1 Test Basic Functionality
1. Visit your Netlify site URL
2. Check that the CRM loads properly
3. Test database connectivity at: `https://your-site.netlify.app/api/database/status`
4. Try loading contacts: `https://your-site.netlify.app/api/contacts`

### 4.2 Test Key Features
- [ ] View contacts/agents
- [ ] Search functionality
- [ ] Update contact information
- [ ] Send SMS (if configured)
- [ ] Send emails (if configured)

## 🎯 Step 5: Post-Deployment Setup

### 5.1 Custom Domain (Optional)
1. In Netlify: Site Settings → Domain Management
2. Add your custom domain
3. Netlify will handle SSL certificates automatically

### 5.2 Environment-Specific Settings
- **Development**: Keep using local PostgreSQL + Chrome Extension
- **Production**: Uses Neon PostgreSQL directly
- **Staging**: Create a separate Neon branch for testing

## 🔍 Troubleshooting

### Common Issues:

**Build Fails**
- Check build logs in Netlify
- Ensure all dependencies are listed in package.json
- Verify Node.js version compatibility

**Database Connection Fails**
- Double-check DATABASE_URL format
- Ensure Neon database is active (not sleeping)
- Check SSL requirements

**API Routes Don't Work**
- Verify `netlify.toml` configuration
- Check function deployment in Netlify dashboard
- Look at function logs for errors

**Missing Data**
- Confirm schema was created in Neon
- Check if data migration completed successfully
- Verify table permissions

## 📞 Support

- **Netlify Issues**: [docs.netlify.com](https://docs.netlify.com)
- **Neon Issues**: [neon.tech/docs](https://neon.tech/docs)
- **Application Issues**: Check your Netlify function logs

## 🎉 Success!

Your CRM is now running on:
- **Frontend**: Netlify CDN (fast global delivery)
- **Backend**: Netlify Functions (serverless)
- **Database**: Neon PostgreSQL (serverless, auto-scaling)

This setup provides:
- ✅ Automatic scaling
- ✅ Global CDN
- ✅ Automatic SSL
- ✅ Backup and recovery
- ✅ Cost-effective serverless architecture
