// Simple in-memory leaderboard storage
// Can be upgraded to PostgreSQL or other database later

export class LeaderboardService {
  constructor() {
    this.scores = [];
    this.nextId = 1;
  }

  async addScore(data) {
    const entry = {
      id: this.nextId++,
      username: data.username,
      score: data.score,
      kills: data.kills,
      level: data.level,
      wave: data.wave,
      timeSurvived: data.timeSurvived,
      character: data.character,
      timestamp: new Date().toISOString()
    };

    this.scores.push(entry);

    // Sort by score descending
    this.scores.sort((a, b) => b.score - a.score);

    // Keep only top 1000 scores
    if (this.scores.length > 1000) {
      this.scores = this.scores.slice(0, 1000);
    }

    console.log(`New score added: ${entry.username} - ${entry.score}`);
    return entry;
  }

  async getTopScores(limit = 100) {
    return this.scores.slice(0, limit);
  }

  async getDailyTopScores() {
    const today = new Date().toISOString().split('T')[0];
    return this.scores
      .filter(s => s.timestamp.startsWith(today))
      .slice(0, 100);
  }

  async getUserRank(entryId) {
    const index = this.scores.findIndex(s => s.id === entryId);
    return index >= 0 ? index + 1 : null;
  }

  async getStats() {
    return {
      totalScores: this.scores.length,
      highestScore: this.scores[0]?.score || 0,
      topPlayer: this.scores[0]?.username || 'None'
    };
  }
}
