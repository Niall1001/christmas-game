# 🗄️ Database Setup Guide

Your Office Survivor game now uses **PostgreSQL** for persistent leaderboard storage!

## 🚀 Quick Start

### Option 1: Docker (Recommended)

The easiest way to get started! Docker will handle everything for you.

1. **Install Docker**
   - macOS: Download Docker Desktop from https://www.docker.com/products/docker-desktop
   - Windows: Download Docker Desktop from https://www.docker.com/products/docker-desktop
   - Linux: Follow instructions at https://docs.docker.com/engine/install/

2. **Start PostgreSQL Database**
   ```bash
   # Start the database (from project root)
   docker-compose up -d

   # Check if it's running
   docker-compose ps

   # View logs
   docker-compose logs -f postgres
   ```

3. **Configure Environment**
   ```bash
   cd server
   cp .env.example .env
   ```

   Edit `.env` and set:
   ```
   DATABASE_URL=postgresql://gameserver:gamepass123@localhost:5434/office_survivor
   ```

   **Note:** Using port 5434 to avoid conflicts with other PostgreSQL instances.

4. **Install Dependencies**
   ```bash
   npm install
   ```

5. **Start Server**
   ```bash
   npm start
   ```

6. **Stop Database** (when done)
   ```bash
   docker-compose down
   # Or to remove data as well:
   docker-compose down -v
   ```

### Option 2: Local PostgreSQL Installation

If you prefer to install PostgreSQL directly on your machine:

1. **Install PostgreSQL**
   ```bash
   # macOS (using Homebrew)
   brew install postgresql@15
   brew services start postgresql@15

   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib

   # Windows
   # Download from: https://www.postgresql.org/download/windows/
   ```

2. **Create Database**
   ```bash
   # Access PostgreSQL
   psql postgres

   # Create database
   CREATE DATABASE office_survivor;

   # Create user (optional)
   CREATE USER gameserver WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE office_survivor TO gameserver;

   # Exit
   \q
   ```

3. **Configure Environment**
   ```bash
   cd server
   cp .env.example .env
   ```

   Edit `.env` and set:
   ```
   DATABASE_URL=postgresql://localhost:5432/office_survivor
   # Or with custom user:
   # DATABASE_URL=postgresql://gameserver:your_password@localhost:5432/office_survivor
   ```

4. **Install Dependencies**
   ```bash
   npm install
   ```

5. **Initialize Database** (Optional - happens automatically on first run)
   ```bash
   node init-db.js
   ```

6. **Start Server**
   ```bash
   npm start
   ```

## ☁️ Railway Deployment

### Step 1: Add PostgreSQL to Railway

1. Go to your Railway project
2. Click **"+ New"** → **"Database"** → **"PostgreSQL"**
3. Railway will create a PostgreSQL database automatically

### Step 2: Get Database URL

1. Click on your PostgreSQL service
2. Go to **"Variables"** tab
3. Copy the `DATABASE_URL` value

### Step 3: Add to Backend Service

1. Click on your backend service
2. Go to **"Variables"** tab
3. Add/Update:
   ```
   DATABASE_URL=postgresql://...   (paste the URL from PostgreSQL service)
   NODE_ENV=production
   CLIENT_URL=https://your-frontend-url.vercel.app
   ```

4. **Redeploy** - Railway will automatically redeploy with the new variables

### Step 4: Verify

Check your backend logs in Railway:
- ✅ "Database connection established"
- ✅ "Database schema initialized"

## 🔧 Database Management

### View Current Data

```bash
psql $DATABASE_URL
```

```sql
-- View all scores
SELECT * FROM leaderboard ORDER BY score DESC LIMIT 10;

-- View daily leaderboard
SELECT * FROM daily_leaderboard LIMIT 10;

-- View stats
SELECT * FROM leaderboard_stats;

-- Count total entries
SELECT COUNT(*) FROM leaderboard;
```

### Clear Leaderboard

```sql
-- Clear all scores (use with caution!)
TRUNCATE TABLE leaderboard;

-- Delete scores older than 30 days
DELETE FROM leaderboard WHERE timestamp < NOW() - INTERVAL '30 days';

-- Delete scores from specific user
DELETE FROM leaderboard WHERE username = 'testuser';
```

### Backup Database

```bash
# Export database
pg_dump $DATABASE_URL > backup.sql

# Import database
psql $DATABASE_URL < backup.sql
```

## 📊 Database Schema

### Leaderboard Table

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| username | VARCHAR(20) | Player name |
| score | INTEGER | Final score |
| kills | INTEGER | Enemy kills |
| level | INTEGER | Player level |
| wave | INTEGER | Wave reached |
| time_survived | INTEGER | Survival time (seconds) |
| character | VARCHAR(20) | Character class |
| timestamp | TIMESTAMPTZ | Score submission time |
| created_at | TIMESTAMPTZ | Record creation time |

### Indexes

- `idx_leaderboard_score` - Fast score lookups
- `idx_leaderboard_timestamp` - Fast date filtering
- `idx_leaderboard_username` - Fast username searches

## 🐛 Troubleshooting

### Docker Issues

**Container won't start:**
```bash
# Check if port 5432 is already in use
lsof -i :5432

# If PostgreSQL is running locally, stop it first
brew services stop postgresql@15  # macOS
sudo systemctl stop postgresql    # Linux

# Restart Docker container
docker-compose restart
```

**Can't connect to Docker database:**
```bash
# Verify container is running
docker-compose ps

# Check container logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U gameserver -d office_survivor
```

**Reset Docker database:**
```bash
# Stop and remove everything including data
docker-compose down -v

# Start fresh
docker-compose up -d
```

### "Connection Refused" Error

**Problem:** Can't connect to database

**Solutions:**
1. Check if PostgreSQL is running: `pg_isready`
2. Verify DATABASE_URL in .env
3. Check PostgreSQL is listening on correct port: `psql -h localhost -p 5432`
4. If using Docker, ensure container is running: `docker-compose ps`

### "Database does not exist" Error

**Solution:** Create the database:
```bash
createdb office_survivor
```

### "Permission denied" Error

**Solution:** Grant permissions:
```sql
GRANT ALL PRIVILEGES ON DATABASE office_survivor TO your_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_user;
```

### Railway Connection Issues

**Solutions:**
1. Verify DATABASE_URL is copied correctly
2. Check Railway PostgreSQL service is running
3. Ensure backend service has DATABASE_URL variable
4. Check Railway logs for detailed error messages

## 🔐 Security Best Practices

1. **Never commit** `.env` files to git
2. **Use strong passwords** for production databases
3. **Rotate credentials** regularly
4. **Enable SSL** for production connections (Railway does this automatically)
5. **Backup regularly** - Railway provides automatic backups

## 📈 Performance Tips

1. **Connection Pooling** - Already configured (max 20 connections)
2. **Indexes** - Already optimized for common queries
3. **Cleanup old data** - Run periodic cleanup for scores older than X days
4. **Monitor** - Use Railway's metrics to track database performance

## 🆘 Need Help?

- **Railway Docs:** https://docs.railway.app/databases/postgresql
- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **GitHub Issues:** Create an issue in your repository

---

**Your leaderboard is now powered by PostgreSQL!** 🎮✨
