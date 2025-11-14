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
      <Card className={`p-3 md:p-6 pixel-box border-cyan-500 ${className}`}>
        <div className="text-center text-white pixel-art">
          <Users className="w-8 h-8 mx-auto mb-2 animate-pulse" />
          <p className="text-[10px] md:text-[12px]">Loading leaderboard...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-3 md:p-6 pixel-box border-cyan-500 ${className}`}>
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h3 className="text-lg md:text-2xl font-bold text-white flex items-center gap-2 pixel-art">
          <Trophy className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" />
          <span className="hidden sm:inline text-[10px] md:text-[12px]">Global Leaderboard</span>
          <span className="sm:hidden text-[10px]">Leaderboard</span>
        </h3>
        <div className={`w-2 h-2 ${connected ? 'bg-green-500' : 'bg-red-500'}`} style={{ imageRendering: 'pixelated' }} />
      </div>

      <div className="space-y-1.5 md:space-y-2 max-h-[60vh] md:max-h-96 overflow-y-auto">
        {scores.map((entry, index) => (
          <div
            key={entry.id}
            className="flex items-center gap-2 md:gap-3 p-2 md:p-3 pixel-box border-slate-600 hover:border-slate-400 transition-colors"
          >
            <div className="w-6 md:w-8 flex justify-center flex-shrink-0">
              {getRankIcon(index + 1)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-bold text-white truncate text-[10px] md:text-[12px] pixel-art">{entry.username}</div>
              <div className="text-[8px] md:text-[10px] text-gray-400 flex items-center gap-1 md:gap-2 pixel-art">
                <span>{getCharacterEmoji(entry.character)}</span>
                <span>{formatTime(entry.timeSurvived)}</span>
                <span className="text-gray-600">•</span>
                <span>Wave {entry.wave}</span>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <div className="text-[10px] md:text-[12px] font-bold text-yellow-400 pixel-art">
                {entry.score.toLocaleString()}
              </div>
              <div className="text-[8px] text-gray-400 pixel-art">
                {entry.kills} kills
              </div>
            </div>
          </div>
        ))}

        {scores.length === 0 && (
          <div className="text-center text-gray-400 py-8 pixel-art">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-[10px]">No scores yet</p>
            <p className="text-[8px]">Be the first to climb the ranks!</p>
          </div>
        )}
      </div>

      {!connected && (
        <div className="mt-4 text-center text-[8px] text-yellow-500 pixel-art">
          ⚠️ Offline - Leaderboard may be outdated
        </div>
      )}
    </Card>
  );
};
