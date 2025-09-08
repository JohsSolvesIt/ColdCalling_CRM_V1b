# 🚀 Complete Netlify CLI Deployment Guide

## 🎯 Quick Start Options

### Option 1: Complete Automated Deployment
Run this for a full end-to-end setup:
```bash
./deploy-to-netlify.sh
```

### Option 2: Manual Step-by-Step
If you prefer more control:

#### Step 1: Create Netlify Site
```bash
# Auto-generated name
netlify sites:create --repo https://github.com/JohsSolvesIt/ColdCalling_CRM_V1b

# Or with custom name
netlify sites:create --name my-crm-app --repo https://github.com/JohsSolvesIt/ColdCalling_CRM_V1b
```

#### Step 2: Set Environment Variables
```bash
# Required variables
netlify env:set DATABASE_URL "postgresql://user:pass@host:5432/db?sslmode=require"
netlify env:set NODE_ENV "production"

# Optional: Email service
netlify env:set BREVO_API_KEY "your_brevo_key"
netlify env:set SENDER_EMAIL "your@email.com"
netlify env:set SENDER_NAME "Your Name"

# Optional: SMS service
netlify env:set TWILIO_ACCOUNT_SID "your_twilio_sid"
netlify env:set TWILIO_AUTH_TOKEN "your_twilio_token"
netlify env:set TWILIO_PHONE_NUMBER "+1234567890"
```

#### Step 3: Deploy
```bash
netlify deploy --prod
```

### Option 3: Link Existing Site
If you already have a Netlify site:
```bash
./link-netlify-site.sh
```

## 🗄️ Database Prerequisites

Before deploying, make sure you have:

1. **Neon Account**: [console.neon.tech](https://console.neon.tech)
2. **Database Setup**: Run `./setup-neon-db.sh` first
3. **Connection String**: Your `postgresql://...` URL

## 🔧 Deployment Features

### What Gets Configured:
- ✅ **Serverless Functions**: API endpoints at `/.netlify/functions/api/*`
- ✅ **React Build**: Optimized production build
- ✅ **Environment Variables**: Database and service credentials
- ✅ **Auto-Deploy**: Connected to your GitHub repository
- ✅ **SSL Certificate**: Automatic HTTPS
- ✅ **CDN**: Global content delivery

### Build Configuration:
- **Base Directory**: `crm-app`
- **Build Command**: `npm run netlify-build`
- **Publish Directory**: `crm-app/client/build`
- **Functions Directory**: `netlify/functions`

## 🧪 Testing Your Deployment

After deployment, test these endpoints:

```bash
# Replace YOUR_SITE_URL with your actual Netlify URL

# 1. Database connectivity
curl https://YOUR_SITE_URL/.netlify/functions/api/database/status

# 2. Contacts API
curl https://YOUR_SITE_URL/.netlify/functions/api/contacts

# 3. Frontend
open https://YOUR_SITE_URL
```

## 🎛️ Environment Variables Reference

### Required:
- `DATABASE_URL` - Your Neon PostgreSQL connection string
- `NODE_ENV` - Set to "production"

### Optional Email (Brevo):
- `BREVO_API_KEY` - Your Brevo API key
- `SENDER_EMAIL` - Email address for sending
- `SENDER_NAME` - Display name for emails

### Optional SMS (Twilio):
- `TWILIO_ACCOUNT_SID` - Your Twilio account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio auth token
- `TWILIO_PHONE_NUMBER` - Your Twilio phone number

## 🔍 Troubleshooting

### Build Fails:
```bash
# Check build logs
netlify deploy --prod --debug

# Test build locally
cd crm-app && npm run netlify-build
```

### Environment Variables:
```bash
# List all variables
netlify env:list

# Update a variable
netlify env:set KEY new_value

# Delete a variable
netlify env:unset KEY
```

### Database Issues:
```bash
# Test your database connection
./test-neon-connection.sh "your-connection-string"

# Check if Neon database is active
# (Go to console.neon.tech to wake it up if sleeping)
```

### Function Errors:
```bash
# View function logs
netlify functions:list
netlify logs
```

## 🚀 Advanced Features

### Custom Domain:
```bash
netlify domains:add yourdomain.com
```

### Branch Deploys:
```bash
# Deploy specific branch
netlify deploy --prod --dir=crm-app/client/build --functions=netlify/functions
```

### Local Testing:
```bash
# Test functions locally
netlify dev
```

## 📊 What You Get

After successful deployment:

- 🌐 **Live URL**: `https://your-site.netlify.app`
- 🗄️ **Database**: Neon PostgreSQL (serverless)
- 🔧 **API**: Netlify Functions (serverless)
- 📱 **Frontend**: React app on global CDN
- 🔒 **Security**: HTTPS + environment variables
- 📈 **Monitoring**: Built-in analytics and logs

Your CRM is now production-ready! 🎉
