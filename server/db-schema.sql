-- Database schema for Office Survivor Leaderboard
-- PostgreSQL

-- Create leaderboard table
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_timestamp ON leaderboard(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_username ON leaderboard(username);

-- Create view for daily leaderboard
CREATE OR REPLACE VIEW daily_leaderboard AS
SELECT *
FROM leaderboard
WHERE DATE(timestamp) = CURRENT_DATE
ORDER BY score DESC;

-- Create stats view
CREATE OR REPLACE VIEW leaderboard_stats AS
SELECT
    COUNT(*) as total_scores,
    MAX(score) as highest_score,
    (SELECT username FROM leaderboard ORDER BY score DESC LIMIT 1) as top_player,
    COUNT(DISTINCT username) as unique_players,
    AVG(score)::INTEGER as average_score,
    MAX(wave) as highest_wave
FROM leaderboard;
