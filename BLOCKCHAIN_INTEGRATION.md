# Blockchain Integration - Monad Testnet

## Overview
The game now submits player scores to the Monad blockchain when the game ends. This integration uses the Monad Games smart contract to record player achievements on-chain.

## Configuration

### Environment Variables
The following variables are configured in `.env`:

```env
# Contract addresses
VITE_GAME_CONTRACT_ADDRESS=0xceCBFF203C8B6044F52CE23D914A1bfD997541A4
VITE_GAME_ADDRESS=0x4EEabC1552d954c7917e0d1A997500BB50391033

# Private key with GAME_ROLE permission
VITE_WALLET_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE  # ⚠️ NEVER COMMIT THIS

# RPC URL
VITE_RPC_URL=https://testnet-rpc.monad.xyz
```

### Game Wallet
- Address: Derived from your private key (check console logs when app starts)
- This wallet must have the `GAME_ROLE` permission on the contract
- Needs MON tokens for gas fees
- **IMPORTANT**: Never share or commit your private key!

## How It Works

### 1. Game Over Trigger
When the player's game ends, the `gameOver()` function in `Game.ts`:
- Calculates the final score
- Shows a "submitting to blockchain" message
- Calls the `HighScoreManager` to submit the score

### 2. Score Submission
The `HighScoreManager.submitScore()` function:
- Uses the configured private key to sign transactions
- Calls `updatePlayerData` on the smart contract with:
  - `player`: The wallet address the player signed in with via Privy
  - `scoreAmount`: The player's final score
  - `transactionAmount`: Set to 0 (can be used for rewards/fees later)

### 3. Transaction Logs
The contract emits a `PlayerDataUpdated` event with:
- **Topic 1 (game)**: `0x4EEabC1552d954c7917e0d1A997500BB50391033`
- **Topic 2 (player)**: Player's wallet address
- **Topic 3 (scoreAmount)**: Player's score (indexed for queries)
- **Data (transactionAmount)**: Transaction amount (not indexed)

### 4. UI Feedback
The game over screen shows:
- ⏳ "Submitting score..." while transaction is pending
- ✅ "Score submitted to Monad blockchain!" with explorer link when successful
- ⚠️ "Score saved locally" if blockchain submission fails
- 👤 "Connect wallet to save scores on-chain" if no wallet is connected

## Example Transaction
View an example transaction: [Monad Explorer](https://testnet.monadexplorer.com/tx/0xc0d5505042cf2fe01ed8583f9162f346228d4d0fd0e3487e2c23db2eebe8ed5b?tab=Logs)

## Testing

### Prerequisites
1. The game wallet needs MON tokens for gas
2. The wallet must have `GAME_ROLE` permission

### Test Script
Run the test script to verify the integration:
```bash
node test-blockchain.js
```

This will:
1. Check wallet balance
2. Submit a test score
3. Wait for confirmation
4. Display transaction details

### Manual Testing
1. Start the game: `npm run dev`
2. Connect wallet via Privy
3. Play the game and let it end
4. Check console logs for transaction details
5. Verify on [Monad Explorer](https://testnet.monadexplorer.com)

## Troubleshooting

### Common Issues

#### "Insufficient funds"
- The game wallet needs MON tokens
- Fund the wallet address shown in console logs when app starts

#### "GAME_ROLE permission denied"
- The wallet doesn't have permission to call the contract
- Contact the contract owner to grant GAME_ROLE

#### "Network error"
- Check RPC URL is correct: `https://testnet-rpc.monad.xyz`
- Verify internet connection

#### "Score saved locally only"
- Check console for specific error
- Verify all environment variables are set
- Ensure wallet has balance and permissions

## Contract Details

### Contract ABI
```solidity
function updatePlayerData(
    address player,
    uint256 scoreAmount,
    uint256 transactionAmount
) external onlyRole(GAME_ROLE)
```

### Event
```solidity
event PlayerDataUpdated(
    address indexed game,      // Derived from msg.sender
    address indexed player,     // Player's wallet
    uint256 indexed scoreAmount,  // Game score
    uint256 transactionAmount  // Additional value
)
```

## Security Notes
- The private key is stored in `.env` and should NEVER be committed
- The wallet with GAME_ROLE has limited permissions (only updatePlayerData)
- All transactions are signed locally using viem
- Player addresses come from Privy authentication

## Future Enhancements
- Add reward tokens based on score (use transactionAmount)
- Implement score verification/anti-cheat
- Add achievement NFTs for high scores
- Create leaderboard smart contract
- Add gas estimation and optimization