import { createPublicClient, http } from 'viem';

async function checkTransaction() {
  const client = createPublicClient({
    chain: { id: 10143 },
    transport: http('https://testnet-rpc.monad.xyz'),
  });
  
  try {
    // Get the specific transaction
    const txHash = '0x8211371d77a2d7556cd2b126119ca42b9e0f6de89f8eb49d519dec478478b6c2';
    
    const receipt = await client.getTransactionReceipt({
      hash: txHash
    });
    
    console.log('Transaction found!');
    console.log('Block:', receipt.blockNumber);
    console.log('Status:', receipt.status);
    console.log('Contract:', receipt.to);
    console.log('Logs:', receipt.logs.length);
    
    // Parse the logs
    for (const log of receipt.logs) {
      console.log('\nLog:');
      console.log('  Address:', log.address);
      console.log('  Topics:', log.topics);
      console.log('  Data:', log.data);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkTransaction();