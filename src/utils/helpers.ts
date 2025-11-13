import { leaderboardService } from '../services/leaderboard';

export const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const getXPForLevel = (level: number) => {
  // Easier progression - 50 XP for first level, then increases by 50 each level
  return Math.floor(50 + (level - 1) * 50);
};

export const saveGameStats = async (game: any, username?: string) => {
  const stats = {
    score: game.score,
    kills: game.kills,
    level: game.player.level,
    wave: game.wave,
    timeSurvived: Math.floor(game.gameTime),
    character: game.player.characterClass,
    date: new Date().toISOString()
  };

  // Save to localStorage (keep existing functionality)
  const allStats = JSON.parse(localStorage.getItem('officeGame_stats') || '[]');
  allStats.push(stats);
  localStorage.setItem('officeGame_stats', JSON.stringify(allStats));

  // Update high score
  const highScore = parseInt(localStorage.getItem('officeGame_highScore') || '0');
  if (stats.score > highScore) {
    localStorage.setItem('officeGame_highScore', stats.score.toString());
  }

  // Submit to global leaderboard if username is provided
  if (username && username.trim()) {
    try {
      const result = await leaderboardService.submitScore({
        username: username.trim(),
        score: stats.score,
        kills: stats.kills,
        level: stats.level,
        wave: stats.wave,
        timeSurvived: stats.timeSurvived,
        character: stats.character
      });

      if (result.success) {
        console.log(`Score submitted! Rank: ${result.rank}`);
        return result;
      } else {
        console.warn('Score submission failed:', result.error);
      }
    } catch (error) {
      console.error('Error submitting score:', error);
    }
  }

  return null;
};
