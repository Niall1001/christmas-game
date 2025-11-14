// PostgreSQL-based leaderboard storage
import pg from 'pg';
const { Pool } = pg;

export class LeaderboardService {
  constructor() {
    // Initialize PostgreSQL connection pool
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    this.pool.on('connect', () => {
      console.log('✅ Database connection established');
    });

    this.pool.on('error', (err) => {
      console.error('❌ Unexpected database error:', err);
    });

    // Initialize database schema
    this.initializeDatabase();
  }

  async initializeDatabase() {
    const client = await this.pool.connect();
    try {
      // Create leaderboard table
      await client.query(`
        CREATE TABLE IF NOT EXISTS leaderboard (
          id SERIAL PRIMARY KEY,
          username VARCHAR(20) NOT NULL,
          score INTEGER NOT NULL,
          kills INTEGER NOT NULL DEFAULT 0,
          level INTEGER NOT NULL DEFAULT 1,
          wave INTEGER NOT NULL DEFAULT 1,
          time_survived INTEGER NOT NULL DEFAULT 0,
          character VARCHAR(20) NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC);
        CREATE INDEX IF NOT EXISTS idx_leaderboard_timestamp ON leaderboard(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_leaderboard_username ON leaderboard(username);
      `);

      console.log('✅ Database schema initialized');
    } catch (error) {
      console.error('❌ Error initializing database:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async addScore(data) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO leaderboard
         (username, score, kills, level, wave, time_survived, character, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING id, username, score, kills, level, wave, time_survived as "timeSurvived",
                   character, timestamp`,
        [
          data.username,
          data.score,
          data.kills,
          data.level,
          data.wave,
          data.timeSurvived,
          data.character
        ]
      );

      const entry = result.rows[0];
      console.log(`📊 New score added: ${entry.username} - ${entry.score}`);

      return entry;
    } catch (error) {
      console.error('❌ Error adding score:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getTopScores(limit = 100) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT id, username, score, kills, level, wave,
                time_survived as "timeSurvived", character, timestamp
         FROM leaderboard
         ORDER BY score DESC, timestamp ASC
         LIMIT $1`,
        [limit]
      );

      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching top scores:', error);
      return [];
    } finally {
      client.release();
    }
  }

  async getDailyTopScores() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT id, username, score, kills, level, wave,
                time_survived as "timeSurvived", character, timestamp
         FROM leaderboard
         WHERE DATE(timestamp) = CURRENT_DATE
         ORDER BY score DESC, timestamp ASC
         LIMIT 100`
      );

      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching daily scores:', error);
      return [];
    } finally {
      client.release();
    }
  }

  async getUserRank(entryId) {
    const client = await this.pool.connect();
    try {
      // Get the score of the entry
      const scoreResult = await client.query(
        `SELECT score FROM leaderboard WHERE id = $1`,
        [entryId]
      );

      if (scoreResult.rows.length === 0) {
        return null;
      }

      const score = scoreResult.rows[0].score;

      // Count how many scores are higher
      const rankResult = await client.query(
        `SELECT COUNT(*) + 1 as rank
         FROM leaderboard
         WHERE score > $1`,
        [score]
      );

      return parseInt(rankResult.rows[0].rank);
    } catch (error) {
      console.error('❌ Error getting user rank:', error);
      return null;
    } finally {
      client.release();
    }
  }

  async getStats() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT
          COUNT(*)::INTEGER as "totalScores",
          COALESCE(MAX(score), 0)::INTEGER as "highestScore",
          (SELECT username FROM leaderboard ORDER BY score DESC LIMIT 1) as "topPlayer",
          COUNT(DISTINCT username)::INTEGER as "uniquePlayers",
          COALESCE(AVG(score)::INTEGER, 0) as "averageScore",
          COALESCE(MAX(wave), 0)::INTEGER as "highestWave"
        FROM leaderboard
      `);

      return result.rows[0];
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
      return {
        totalScores: 0,
        highestScore: 0,
        topPlayer: 'None',
        uniquePlayers: 0,
        averageScore: 0,
        highestWave: 0
      };
    } finally {
      client.release();
    }
  }

  // Cleanup method to close pool connections
  async close() {
    await this.pool.end();
    console.log('🔌 Database connection pool closed');
  }
}
