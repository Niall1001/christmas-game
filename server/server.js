import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { LeaderboardService } from './leaderboard-service.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const leaderboard = new LeaderboardService();

// REST API Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Office Survivor Server Running' });
});

app.get('/api/leaderboard', async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const scores = await leaderboard.getTopScores(limit);
  res.json(scores);
});

app.get('/api/leaderboard/daily', async (req, res) => {
  const scores = await leaderboard.getDailyTopScores();
  res.json(scores);
});

app.get('/api/stats', async (req, res) => {
  const stats = await leaderboard.getStats();
  res.json(stats);
});

// WebSocket Events
io.on('connection', (socket) => {
  console.log('✅ Player connected:', socket.id);

  // Send current leaderboard on connect
  socket.on('leaderboard:get', async (callback) => {
    try {
      const scores = await leaderboard.getTopScores(100);
      callback(scores);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      callback([]);
    }
  });

  // Submit score
  socket.on('score:submit', async (data, callback) => {
    try {
      const { username, score, kills, level, wave, timeSurvived, character } = data;

      // Validate data
      if (!username || score === undefined) {
        callback({ success: false, error: 'Invalid data' });
        return;
      }

      // Save score
      const entry = await leaderboard.addScore({
        username: username.substring(0, 20), // limit length
        score,
        kills,
        level,
        wave,
        timeSurvived,
        character
      });

      // Broadcast to all clients
      io.emit('leaderboard:update', entry);

      // Get updated rank
      const rank = await leaderboard.getUserRank(entry.id);

      console.log(`📊 Score submitted: ${username} (${score}) - Rank: ${rank}`);
      callback({ success: true, rank, entry });
    } catch (error) {
      console.error('Error submitting score:', error);
      callback({ success: false, error: 'Server error' });
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Player disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log('');
  console.log('🎮 =======================================');
  console.log('🎮  Office Survivor - Leaderboard Server');
  console.log('🎮 =======================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
  console.log('🎮 =======================================');
  console.log('');
});
