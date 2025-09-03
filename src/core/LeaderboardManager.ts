export interface LeaderboardEntry {
  address: string;
  score: number;
  timestamp: number;
  displayName?: string;
  transactionHash?: string;
}

export class LeaderboardManager {
  private static readonly LEADERBOARD_KEY = 'nexus_global_leaderboard';
  private static readonly MAX_ENTRIES = 10;
  private leaderboard: LeaderboardEntry[] = [];
  
  constructor() {
    this.loadLeaderboard();
  }
  
  private loadLeaderboard(): void {
    try {
      const stored = localStorage.getItem(LeaderboardManager.LEADERBOARD_KEY);
      if (stored) {
        this.leaderboard = JSON.parse(stored);
        // Sort by score descending
        this.leaderboard.sort((a, b) => b.score - a.score);
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      this.leaderboard = [];
    }
  }
  
  private saveLeaderboard(): void {
    try {
      localStorage.setItem(LeaderboardManager.LEADERBOARD_KEY, JSON.stringify(this.leaderboard));
    } catch (error) {
      console.error('Failed to save leaderboard:', error);
    }
  }
  
  addScore(address: string, score: number, transactionHash?: string): boolean {
    // Check if this address already has an entry
    const existingIndex = this.leaderboard.findIndex(entry => entry.address === address);
    
    if (existingIndex !== -1) {
      // Update only if new score is higher
      if (score > this.leaderboard[existingIndex].score) {
        this.leaderboard[existingIndex].score = score;
        this.leaderboard[existingIndex].timestamp = Date.now();
        if (transactionHash) {
          this.leaderboard[existingIndex].transactionHash = transactionHash;
        }
        this.sortAndTrim();
        this.saveLeaderboard();
        return true;
      }
      return false;
    } else {
      // Add new entry
      const entry: LeaderboardEntry = {
        address,
        score,
        timestamp: Date.now()
      };
      if (transactionHash) {
        entry.transactionHash = transactionHash;
      }
      this.leaderboard.push(entry);
      this.sortAndTrim();
      this.saveLeaderboard();
      return true;
    }
  }
  
  private sortAndTrim(): void {
    // Sort by score descending
    this.leaderboard.sort((a, b) => b.score - a.score);
    // Keep only top entries
    if (this.leaderboard.length > LeaderboardManager.MAX_ENTRIES) {
      this.leaderboard = this.leaderboard.slice(0, LeaderboardManager.MAX_ENTRIES);
    }
  }
  
  getTopScores(limit: number = 5): LeaderboardEntry[] {
    return this.leaderboard.slice(0, limit);
  }
  
  getRank(address: string): number {
    const index = this.leaderboard.findIndex(entry => entry.address === address);
    return index === -1 ? -1 : index + 1;
  }
  
  formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
  
  formatScore(score: number): string {
    return score.toLocaleString();
  }
  
  isInLeaderboard(address: string): boolean {
    return this.leaderboard.some(entry => entry.address === address);
  }
  
  getLeaderboardHTML(): string {
    if (this.leaderboard.length === 0) {
      return '<div class="leaderboard-empty">No scores yet. Be the first!</div>';
    }
    
    const entries = this.getTopScores(5);
    let html = '<div class="leaderboard-entries">';
    
    // Add CSS for hover effects
    html += `
      <style>
        .leaderboard-address-link {
          font-family: 'JetBrains Mono', monospace;
          color: #00D4FF;
          font-size: 0.9rem;
          text-decoration: none;
          transition: color 0.2s ease;
          cursor: pointer;
        }
        .leaderboard-address-link:hover {
          color: #00ff88 !important;
          text-decoration: underline !important;
        }
      </style>
    `;
    
    entries.forEach((entry, index) => {
      const rank = index + 1;
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
      const isTop3 = rank <= 3;
      
      // Debug log
      console.log(`Leaderboard entry ${rank}: address=${entry.address}, txHash=${entry.transactionHash}`);
      
      html += `
        <div class="leaderboard-entry ${isTop3 ? 'top-3' : ''}" style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.6rem 0.8rem;
          margin-bottom: 0.4rem;
          background: ${isTop3 ? 'rgba(139, 95, 191, 0.1)' : 'rgba(0, 212, 255, 0.05)'};
          border-left: 3px solid ${isTop3 ? '#FFD700' : '#00D4FF'};
          border-radius: 4px;
          transition: all 0.2s ease;
        ">
          <div style="display: flex; align-items: center; gap: 0.8rem;">
            <span class="rank" style="
              font-size: ${isTop3 ? '1.2rem' : '1rem'};
              width: 30px;
              text-align: center;
            ">${medal}</span>
            ${entry.displayName ? `
              <span style="color: #FFD700; font-weight: 600;">${entry.displayName}</span>
              <span style="color: #00D4FF; font-size: 0.8rem;">(${this.formatAddress(entry.address)})</span>
            ` : `
              <a href="https://testnet.monadexplorer.com/address/${entry.address}" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 class="leaderboard-address-link"
                 title="${entry.transactionHash ? 'View transaction' : 'View address'}">
                ${this.formatAddress(entry.address)} 🔗
              </a>
            `}
          </div>
          <span class="score" style="
            font-family: 'Orbitron', monospace;
            color: ${isTop3 ? '#FFD700' : '#00ff88'};
            font-size: ${isTop3 ? '1.1rem' : '1rem'};
            font-weight: 700;
          ">${this.formatScore(entry.score)}</span>
        </div>
      `;
    });
    
    html += '</div>';
    return html;
  }
  
  // Fetch leaderboard data from Monad Games API
  async syncWithBlockchain(): Promise<void> {
    try {
      console.log('🔄 Syncing leaderboard with Monad Games API...');
      
      // Fetch from Monad Games leaderboard API using CORS proxy
      const originalUrl = 'https://monad-games-id-site.vercel.app/api/leaderboard?page=1&gameId=261&sortBy=scores&limit=10';
      // Try multiple CORS proxies in case one fails
      const corsProxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(originalUrl)}`,
        `https://proxy.cors.sh/${originalUrl}`
      ];
      
      console.log('📡 Fetching from Monad Games API via CORS proxy');
      
      let response;
      for (const proxyUrl of corsProxies) {
        try {
          response = await fetch(proxyUrl);
          if (response.ok) break;
        } catch (e) {
          console.warn('Proxy failed, trying next:', e);
        }
      }
      
      if (!response || !response.ok) {
        throw new Error(response ? `API request failed: ${response.status}` : 'All CORS proxies failed');
      }
      
      const data = await response.json();
      console.log('📦 API Response:', data);
      
      if (data.data && data.data.length > 0) {
        // Clear existing leaderboard to replace with API data
        this.leaderboard = [];
        
        // Add API scores to leaderboard
        for (const entry of data.data) {
          this.leaderboard.push({
            address: entry.walletAddress,
            score: entry.score,
            timestamp: Date.now(),
            displayName: entry.username, // Include username from API
            transactionHash: '' // API doesn't provide tx hash
          });
        }
        
        // Already sorted by API, just save
        this.saveLeaderboard();
        
        console.log(`✅ Synced ${this.leaderboard.length} scores from Monad Games API`);
      } else {
        console.log('ℹ️ No scores found in API');
      }
    } catch (error) {
      console.error('❌ Failed to sync with Monad Games API:', error);
      
      // Fallback to blockchain method
      try {
        const { highScoreManager } = await import('./HighScoreManager');
        const blockchainScores = await highScoreManager.fetchAllGameScores();
        
        if (blockchainScores.length > 0) {
          this.leaderboard = [];
          for (const entry of blockchainScores) {
            this.leaderboard.push({
              address: entry.player,
              score: entry.score,
              timestamp: Date.now(),
              transactionHash: entry.transactionHash
            });
          }
          this.sortAndTrim();
          this.saveLeaderboard();
          console.log(`✅ Synced ${this.leaderboard.length} scores from blockchain fallback`);
        }
      } catch (blockchainError) {
        console.error('❌ Blockchain fallback also failed:', blockchainError);
      }
    }
  }
  
  // Test method to add a sample entry with transaction hash
  addTestEntry(): void {
    const testAddress = '0x1234567890abcdef1234567890abcdef12345678';
    const testScore = 999999;
    const testTxHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    this.addScore(testAddress, testScore, testTxHash);
    console.log('Test entry added to leaderboard with transaction hash');
  }
}

export const leaderboardManager = new LeaderboardManager();