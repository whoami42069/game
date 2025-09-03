# Nexus Eternal

A fast-paced 3D space combat game with blockchain integration on Monad testnet.

## 🎮 Game Features

- Intense space combat with waves of enemies
- Boss battles with escalating difficulty
- Power-ups and weapon upgrades
- Multiple arena environments
- Real-time score tracking
- Blockchain-verified high scores

## 🔗 Blockchain Integration

This game integrates with the Monad blockchain to:
- Record player scores on-chain
- Verify achievements
- Maintain a decentralized leaderboard

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- A Monad testnet wallet with MON tokens

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd yeni-deneme
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   # Copy the template
   cp .env.template .env
   
   # Edit .env and add your private key
   # ⚠️ NEVER commit your .env file!
   ```

4. **Configure your wallet:**
   - Add your private key to `VITE_WALLET_PRIVATE_KEY` in `.env`
   - Ensure the wallet has `GAME_ROLE` permission on the contract
   - Fund the wallet with MON tokens for gas fees

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Open in browser:**
   ```
   http://localhost:5173
   ```

## 🔐 Security

**⚠️ IMPORTANT: Security Setup Required!**

Before running the game with blockchain features:

1. **Read [SECURITY.md](./SECURITY.md)** for critical security guidelines
2. **Never commit private keys** to the repository
3. **Use `.env.template`** as a reference for configuration
4. **Check [BLOCKCHAIN_INTEGRATION.md](./BLOCKCHAIN_INTEGRATION.md)** for detailed setup

### Environment Configuration

Required environment variables:
```env
# Your private key (NEVER COMMIT THIS!)
VITE_WALLET_PRIVATE_KEY=0x_your_private_key_here

# Contract addresses (pre-configured for Monad testnet)
VITE_GAME_CONTRACT_ADDRESS=0xceCBFF203C8B6044F52CE23D914A1bfD997541A4
VITE_GAME_ADDRESS=0x4EEabC1552d954c7917e0d1A997500BB50391033

# RPC URL
VITE_RPC_URL=https://testnet-rpc.monad.xyz
```

## 🎯 How to Play

1. **Connect Wallet**: Sign in with Privy to connect your wallet
2. **Select Arena**: Choose your battlefield
3. **Controls**:
   - **WASD**: Move your ship
   - **Mouse**: Aim
   - **Left Click**: Fire primary weapon
   - **Shift**: Boost
   - **Space**: Special ability
   - **R**: Restart (after game over)
   - **M**: Return to menu

4. **Objective**: Survive waves of enemies, defeat bosses, achieve high scores!

## 🏆 Scoring System

- Destroy enemies to earn points
- Collect power-ups for bonuses
- Defeat bosses for massive scores
- Scores are automatically submitted to the blockchain
- View your transaction on [Monad Explorer](https://testnet.monadexplorer.com)

## 🛠️ Development

### Available Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint

# Test blockchain integration
node test-blockchain.js
```

### Project Structure

```
├── src/
│   ├── core/           # Core game systems
│   │   ├── Game.ts     # Main game loop
│   │   ├── HighScoreManager.ts  # Blockchain score submission
│   │   └── ...
│   ├── game/           # Game entities
│   └── ui/             # User interface
├── .env.template       # Environment template (safe to commit)
├── .env               # Your configuration (NEVER COMMIT)
├── SECURITY.md        # Security guidelines
└── BLOCKCHAIN_INTEGRATION.md  # Blockchain setup guide
```

## 📦 Tech Stack

- **Frontend**: TypeScript, Three.js
- **Blockchain**: Viem, Monad Testnet
- **Authentication**: Privy
- **Build Tool**: Vite
- **3D Graphics**: Three.js, WebGL

## 🔧 Troubleshooting

### Common Issues

1. **"Another transaction has higher priority"**
   - The game automatically retries with higher gas
   - Check network congestion on Monad

2. **"Insufficient funds"**
   - Fund your game wallet with MON tokens
   - Check wallet address in console logs

3. **"GAME_ROLE permission denied"**
   - Contact contract owner for permissions
   - Verify wallet address is correct

4. **Score not submitting to blockchain**
   - Check console for error messages
   - Verify all environment variables are set
   - Ensure wallet has MON for gas

## 📝 Documentation

- [Security Guidelines](./SECURITY.md) - **READ THIS FIRST**
- [Blockchain Integration](./BLOCKCHAIN_INTEGRATION.md)
- [Environment Setup](./.env.template)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. **Never commit sensitive data**
4. Test blockchain integration
5. Submit a pull request

## ⚖️ License

[Your License Here]

## 🚨 Security Notice

This project requires a private key for blockchain transactions. 
**NEVER** share or commit your private key. Always follow the [security guidelines](./SECURITY.md).

---

**Remember**: Always check `git status` before committing to ensure no sensitive files are included!