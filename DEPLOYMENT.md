# 🚀 Complete Deployment Guide - Office Survivor

This guide covers deploying your Office Survivor game to Railway with PostgreSQL database.

## 📋 Prerequisites

- GitHub account
- Railway account (https://railway.app)
- Vercel account (https://vercel.com) - Optional for frontend

## 🗂️ Project Structure

```
christmas game/
├── src/                    # Frontend React code
├── server/                 # Backend Node.js server
│   ├── server.js          # Main server file
│   ├── leaderboard-service.js  # Database service
│   ├── db-schema.sql      # Database schema
│   └── .env              # Environment variables
├── package.json           # Frontend dependencies
└── railway.json          # Railway config
```

## 🎯 Deployment Steps

### Part 1: Setup GitHub Repository

1. **Initialize Git** (if not already done)
   ```bash
   cd "/Users/niall.walters/Desktop/christmas game"
   git init
   ```

2. **Add .gitignore** (important!)
   ```bash
   echo "node_modules
   dist
   .env
   .DS_Store
   *.log
   server/node_modules
   server/.env" > .gitignore
   ```

3. **Commit and Push**
   ```bash
   git add .
   git commit -m "Initial commit - Office Survivor ready for deployment"
   git branch -M main
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

### Part 2: Deploy Backend to Railway

#### Step 1: Create Railway Project

1. Go to https://railway.app/
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub
5. Select your repository

#### Step 2: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will provision a PostgreSQL database
4. Wait for it to be ready (green checkmark)

#### Step 3: Configure Backend Service

1. Click on your **backend service** (the one that was created from your repo)
2. Go to **"Settings"** tab
3. Set **Root Directory**: `server`
4. Go to **"Variables"** tab
5. Add these variables:
   ```
   NODE_ENV=production
   PORT=3001
   CLIENT_URL=*
   ```

6. Railway will automatically add `DATABASE_URL` from your PostgreSQL service

#### Step 4: Deploy Backend

1. Railway will automatically deploy
2. Wait for deployment to complete
3. Check **"Deployments"** tab for status
4. Copy your backend URL (looks like: `https://your-app.up.railway.app`)

#### Step 5: Verify Backend

1. Visit: `https://your-app.up.railway.app/api/health`
2. Should see: `{"status":"ok","message":"Office Survivor Server Running"}`
3. Check logs in Railway dashboard:
   ```
   ✅ Database connection established
   ✅ Database schema initialized
   🚀 Server running on port 3001
   ```

### Part 3: Deploy Frontend to Vercel

#### Step 1: Import Project

1. Go to https://vercel.com
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository
4. Select the repository

#### Step 2: Configure Build Settings

Configure these settings:
- **Framework Preset**: Vite
- **Root Directory**: `./` (leave as default)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

#### Step 3: Add Environment Variables

Add this environment variable:
```
VITE_SERVER_URL=https://your-railway-backend.up.railway.app
```
(Replace with your actual Railway backend URL)

#### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for build to complete
3. Copy your Vercel URL

#### Step 5: Update Backend CORS

1. Go back to Railway
2. Click on your backend service
3. Go to **"Variables"** tab
4. Update `CLIENT_URL` to your Vercel URL:
   ```
   CLIENT_URL=https://your-vercel-app.vercel.app
   ```
5. Railway will automatically redeploy

### Part 4: Test Your Deployment

1. **Visit your Vercel URL**
2. **Open Browser Console** (F12)
3. **Look for**:
   ```
   Connecting to leaderboard server: https://your-backend.up.railway.app
   ✅ Connected to leaderboard server
   ```
4. **Play the game** and submit a score
5. **Check leaderboard** updates in real-time

## 🗄️ Database Management

### Access Database

1. In Railway, click your PostgreSQL service
2. Go to **"Data"** tab - view data directly in browser
3. Or use **"Connect"** tab for connection string

### Run Queries

```bash
# Connect via CLI
psql YOUR_DATABASE_URL

# View top scores
SELECT * FROM leaderboard ORDER BY score DESC LIMIT 10;

# View stats
SELECT COUNT(*) as total_entries,
       MAX(score) as high_score,
       COUNT(DISTINCT username) as unique_players
FROM leaderboard;
```

### Backup Database

Railway provides automatic daily backups. To manually backup:

```bash
# Export
pg_dump YOUR_DATABASE_URL > backup.sql

# Import
psql YOUR_DATABASE_URL < backup.sql
```

## 🔧 Environment Variables Reference

### Backend (Railway)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | Auto-set by Railway |
| `PORT` | Server port | `3001` (auto-set) |
| `CLIENT_URL` | Frontend URL for CORS | `https://your-app.vercel.app` |
| `NODE_ENV` | Environment | `production` |

### Frontend (Vercel)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SERVER_URL` | Backend API URL | `https://your-backend.up.railway.app` |

## 🐛 Troubleshooting

### Backend won't start

**Check Railway logs for:**
- ❌ Database connection errors → Verify DATABASE_URL is set
- ❌ Port binding errors → Railway sets PORT automatically
- ❌ Module not found → Check package.json dependencies

**Fix:**
```bash
cd server
npm install
git add .
git commit -m "Fix dependencies"
git push
```

### Frontend can't connect to backend

**Symptoms:** Leaderboard shows "Offline" or empty

**Solutions:**
1. Check browser console for connection errors
2. Verify `VITE_SERVER_URL` in Vercel matches Railway backend URL
3. Check `CLIENT_URL` in Railway backend variables
4. Ensure Railway backend is deployed and running

### Database connection errors

**Error:** `connect ECONNREFUSED`

**Solutions:**
1. Verify DATABASE_URL is set in Railway
2. Check PostgreSQL service is running
3. Restart backend service in Railway

### CORS errors

**Error:** `Access-Control-Allow-Origin`

**Fix:** Update `CLIENT_URL` in Railway to match your Vercel domain

## 🎨 Custom Domain (Optional)

### Add Custom Domain to Vercel

1. In Vercel project → **"Settings"** → **"Domains"**
2. Add your domain
3. Update DNS records as instructed
4. Update `CLIENT_URL` in Railway to new domain

### Add Custom Domain to Railway

1. In Railway project → **"Settings"** → **"Domains"**
2. Add your domain
3. Update DNS records
4. Update `VITE_SERVER_URL` in Vercel

## 📊 Monitoring

### Railway

- **Metrics**: CPU, Memory, Network usage
- **Logs**: Real-time application logs
- **Deployments**: History and rollback

### Vercel

- **Analytics**: Page views, performance
- **Logs**: Build and runtime logs
- **Deployments**: Preview and production

## 🔐 Security Checklist

- ✅ `.env` files not committed to Git
- ✅ Database URL uses SSL (Railway default)
- ✅ CORS properly configured
- ✅ Environment variables set correctly
- ✅ Production mode enabled

## 🚀 Updates and Redeployment

### Update Code

```bash
# Make changes
git add .
git commit -m "Update game features"
git push
```

Both Railway and Vercel will automatically deploy new changes!

### Manual Redeploy

**Railway:** Click "Deploy" button in dashboard

**Vercel:** Click "Redeploy" in deployments tab

## 📈 Scaling

### Railway

- Automatically scales with traffic
- Upgrade plan for more resources
- Add read replicas for database (Pro plan)

### Vercel

- Automatically handles traffic spikes
- Global CDN for fast loading worldwide
- Edge functions for low latency

## 🆘 Get Help

- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/

---

## ✅ Deployment Checklist

Before going live:

- [ ] Backend deployed to Railway
- [ ] PostgreSQL database provisioned
- [ ] Database schema initialized (check logs)
- [ ] Backend health endpoint working
- [ ] Frontend deployed to Vercel
- [ ] Environment variables set correctly
- [ ] CORS configured properly
- [ ] Test game works end-to-end
- [ ] Leaderboard updates in real-time
- [ ] Scores persist after page refresh

**Congratulations! Your game is now live!** 🎮✨

Share your game URL with friends and watch the leaderboard heat up!
