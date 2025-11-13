import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Trophy, Medal, Award, Users } from 'lucide-react';
import { leaderboardService, LeaderboardEntry } from '../services/leaderboard';
import { formatTime } from '../utils/helpers';

interface LeaderboardProps {
  limit?: number;
  className?: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ limit = 10, className = '' }) => {
  const [scores, setScores] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Connect to leaderboard service
    leaderboardService.connect();

    // Get initial leaderboard
    const fetchLeaderboard = () => {
      leaderboardService.getLeaderboard().then(data => {
        setScores(data.slice(0, limit));
        setLoading(false);
      });
    };

    fetchLeaderboard();

    // Listen for connection status
    const handleConnection = (status: boolean) => {
      console.log('Connection status changed:', status);
      setConnected(status);

      // Refresh leaderboard when reconnected
      if (status) {
        console.log('Reconnected - refreshing leaderboard');
        fetchLeaderboard();
      }
    };

    // Listen for live updates
    const handleUpdate = (newEntry: LeaderboardEntry) => {
      console.log('Received leaderboard update:', newEntry);
      setScores(prev => {
        const updated = [...prev, newEntry]
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
        return updated;
      });
    };

    leaderboardService.on('connected', handleConnection);
    leaderboardService.on('update', handleUpdate);

    // Set initial connection status
    setConnected(leaderboardService.isConnected());

    return () => {
      leaderboardService.off('connected', handleConnection);
      leaderboardService.off('update', handleUpdate);
    };
  }, [limit]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-orange-600" />;
      default:
        return <span className="text-gray-500 font-bold w-6 text-center">{rank}</span>;
    }
  };

  const getCharacterEmoji = (character: string) => {
    const emojis: Record<string, string> = {
      'warrior': '⚔️',
      'ranger': '🏹',
      'mage': '🔮'
    };
    return emojis[character] || '🎮';
  };

  if (loading) {
    return (
      <Card className={`p-3 md:p-6 bg-slate-900/90 border-cyan-500/50 ${className}`}>
        <div className="text-center text-white">
          <Users className="w-8 h-8 mx-auto mb-2 animate-pulse" />
          <p className="text-sm md:text-base">Loading leaderboard...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-3 md:p-6 bg-slate-900/90 border-cyan-500/50 ${className}`}>
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h3 className="text-lg md:text-2xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" />
          <span className="hidden sm:inline">Global Leaderboard</span>
          <span className="sm:hidden">Leaderboard</span>
        </h3>
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
      </div>

      <div className="space-y-1.5 md:space-y-2 max-h-[60vh] md:max-h-96 overflow-y-auto">
        {scores.map((entry, index) => (
          <div
            key={entry.id}
            className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
          >
            <div className="w-6 md:w-8 flex justify-center flex-shrink-0">
              {getRankIcon(index + 1)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-bold text-white truncate text-sm md:text-base">{entry.username}</div>
              <div className="text-xs md:text-xs text-gray-400 flex items-center gap-1 md:gap-2">
                <span>{getCharacterEmoji(entry.character)}</span>
                <span>{formatTime(entry.timeSurvived)}</span>
                <span className="text-gray-600">•</span>
                <span>Wave {entry.wave}</span>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <div className="text-base md:text-lg font-bold text-yellow-400">
                {entry.score.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">
                {entry.kills} kills
              </div>
            </div>
          </div>
        ))}

        {scores.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No scores yet</p>
            <p className="text-sm">Be the first to climb the ranks!</p>
          </div>
        )}
      </div>

      {!connected && (
        <div className="mt-4 text-center text-xs text-yellow-500">
          ⚠️ Offline - Leaderboard may be outdated
        </div>
      )}
    </Card>
  );
};
