import { io, Socket } from 'socket.io-client';

export interface LeaderboardEntry {
  id: number;
  username: string;
  score: number;
  kills: number;
  level: number;
  wave: number;
  timeSurvived: number;
  character: string;
  timestamp: string;
}

export interface ScoreSubmission {
  username: string;
  score: number;
  kills: number;
  level: number;
  wave: number;
  timeSurvived: number;
  character: string;
}

export interface SubmitScoreResponse {
  success: boolean;
  rank?: number;
  entry?: LeaderboardEntry;
  error?: string;
}

class LeaderboardService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private connected: boolean = false;

  connect() {
    if (this.socket?.connected) {
      console.log('Already connected to leaderboard server');
      return;
    }

    // If socket exists but is disconnected, reconnect it
    if (this.socket && !this.socket.connected) {
      console.log('Reconnecting existing socket...');
      this.socket.connect();
      return;
    }

    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
    console.log(`Connecting to leaderboard server: ${serverUrl}`);

    this.socket = io(serverUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000
    });

    this.socket.on('leaderboard:update', (entry: LeaderboardEntry) => {
      console.log('Leaderboard updated:', entry);
      this.emit('update', entry);
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to leaderboard server');
      this.connected = true;
      this.emit('connected', true);
    });

    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log(`✅ Reconnected to leaderboard server (attempt ${attemptNumber})`);
      this.connected = true;
      this.emit('connected', true);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log(`❌ Disconnected from leaderboard server: ${reason}`);
      this.connected = false;
      this.emit('connected', false);
    });

    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}...`);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.connected = false;
      this.emit('connected', false);
      this.emit('error', error);
    });
  }

  disconnect() {
    if (this.socket) {
      console.log('Disconnecting from leaderboard server');
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected === true;
  }

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    return new Promise((resolve) => {
      // Try to reconnect if not connected
      if (!this.isConnected()) {
        console.warn('Not connected to leaderboard server, attempting to connect...');
        this.connect();
      }

      if (!this.socket) {
        resolve([]);
        return;
      }

      // Wait a moment for connection if reconnecting
      const attemptFetch = () => {
        if (!this.socket || !this.isConnected()) {
          console.warn('Failed to connect, returning empty leaderboard');
          resolve([]);
          return;
        }

        this.socket.emit('leaderboard:get', (scores: LeaderboardEntry[]) => {
          console.log(`Fetched ${scores.length} leaderboard entries`);
          resolve(scores);
        });
      };

      if (this.isConnected()) {
        attemptFetch();
      } else {
        // Wait for connection
        setTimeout(attemptFetch, 1000);
      }
    });
  }

  async submitScore(data: ScoreSubmission): Promise<SubmitScoreResponse> {
    return new Promise((resolve) => {
      // Try to reconnect if not connected
      if (!this.isConnected()) {
        console.warn('Not connected to leaderboard server, attempting to connect...');
        this.connect();
      }

      if (!this.socket) {
        resolve({ success: false, error: 'Not connected to server' });
        return;
      }

      const attemptSubmit = () => {
        if (!this.socket || !this.isConnected()) {
          console.warn('Failed to connect, score not submitted');
          resolve({ success: false, error: 'Not connected to server' });
          return;
        }

        console.log('Submitting score:', data);
        this.socket.emit('score:submit', data, (response: SubmitScoreResponse) => {
          console.log('Score submission response:', response);
          resolve(response);
        });
      };

      if (this.isConnected()) {
        attemptSubmit();
      } else {
        // Wait for connection
        setTimeout(attemptSubmit, 1000);
      }
    });
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback?: Function) {
    if (!callback) {
      this.listeners.delete(event);
    } else {
      const callbacks = this.listeners.get(event) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => {
      try {
        cb(data);
      } catch (error) {
        console.error(`Error in listener for ${event}:`, error);
      }
    });
  }
}

export const leaderboardService = new LeaderboardService();
