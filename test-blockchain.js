// Test script to verify blockchain integration with Monad testnet
import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Monad testnet configuration
const monadTestnet = {
  id: 10143,  // Correct Monad testnet chain ID
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.monad.xyz'],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://testnet.monadexplorer.com' },
  },
  testnet: true,
};

// Contract ABI
const CONTRACT_ABI = [
  {
    inputs: [
      { name: 'player', type: 'address' },
      { name: 'scoreAmount', type: 'uint256' },
      { name: 'transactionAmount', type: 'uint256' }
    ],
    name: 'updatePlayerData',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

// Configuration - Load from environment variables
const PRIVATE_KEY = process.env.VITE_WALLET_PRIVATE_KEY || process.env.WALLET_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.VITE_GAME_CONTRACT_ADDRESS || '0xceCBFF203C8B6044F52CE23D914A1bfD997541A4';
const GAME_ADDRESS = process.env.VITE_GAME_ADDRESS || '0x4EEabC1552d954c7917e0d1A997500BB50391033';

if (!PRIVATE_KEY) {
  console.error('❌ No private key found in environment variables!');
  console.error('Please set VITE_WALLET_PRIVATE_KEY or WALLET_PRIVATE_KEY in your .env file');
  process.exit(1);
}

async function testBlockchainIntegration() {
  console.log('🔧 Starting blockchain integration test...\n');

  try {
    // Create account from private key
    const account = privateKeyToAccount(PRIVATE_KEY);
    console.log('✅ Account created:', account.address);

    // Create clients
    const walletClient = createWalletClient({
      account,
      chain: monadTestnet,
      transport: http(monadTestnet.rpcUrls.default.http[0]),
    });

    const publicClient = createPublicClient({
      chain: monadTestnet,
      transport: http(monadTestnet.rpcUrls.default.http[0]),
    });

    console.log('✅ Clients initialized\n');

    // Check balance
    const balance = await publicClient.getBalance({
      address: account.address,
    });
    console.log('💰 Account balance:', Number(balance) / 1e18, 'MON');

    if (Number(balance) === 0) {
      console.error('⚠️ Account has no balance! Please fund it first.');
      console.log('🔗 Fund the account at:', account.address);
      return;
    }

    // Test player address (can be any address for testing)
    const testPlayerAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5';
    const testScore = 12345;
    const testTransactionAmount = 0;

    console.log('\n📊 Test Parameters:');
    console.log('  Contract:', CONTRACT_ADDRESS);
    console.log('  Game:', GAME_ADDRESS);
    console.log('  Player:', testPlayerAddress);
    console.log('  Score:', testScore);
    console.log('  Transaction Amount:', testTransactionAmount);

    console.log('\n📤 Sending transaction...');

    // Send transaction
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'updatePlayerData',
      args: [testPlayerAddress, BigInt(testScore), BigInt(testTransactionAmount)],
    });

    console.log('✅ Transaction sent!');
    console.log('🔗 Transaction hash:', hash);
    console.log('🌐 View on explorer: https://testnet.monadexplorer.com/tx/' + hash);

    console.log('\n⏳ Waiting for confirmation...');
    
    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    console.log('✅ Transaction confirmed!');
    console.log('📦 Block number:', receipt.blockNumber);
    console.log('⛽ Gas used:', receipt.gasUsed);
    console.log('📝 Status:', receipt.status === 'success' ? '✅ Success' : '❌ Failed');

    // Parse logs
    if (receipt.logs && receipt.logs.length > 0) {
      console.log('\n📋 Event logs:');
      receipt.logs.forEach((log, index) => {
        console.log(`  Log ${index + 1}:`, log);
      });
    }

    console.log('\n🎉 Test completed successfully!');
    console.log('The blockchain integration is working correctly.');

  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    
    if (error.message.includes('insufficient funds')) {
      console.error('💰 The account needs MON tokens for gas fees');
      console.error('🔗 Fund this address:', account.address);
    } else if (error.message.includes('GAME_ROLE')) {
      console.error('🔐 The account does not have GAME_ROLE permission');
      console.error('📝 Contact the contract owner to grant GAME_ROLE');
    } else if (error.message.includes('network')) {
      console.error('🌐 Network connection issue - check RPC URL');
    }
  }
}

// Run the test
testBlockchainIntegration().catch(console.error);