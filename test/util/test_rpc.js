const ethers = require('ethers');

async function test() {
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  
  try {
    const chainId = await provider.getNetwork();
    console.log('✅ RPC Connected!');
    console.log('Chain ID:', chainId.chainId);
    console.log('Network:', chainId.name);
    
    const blockNumber = await provider.getBlockNumber();
    console.log('Current Block:', blockNumber);
    
    const accounts = await provider.listAccounts();
    console.log('Available Accounts:', accounts.length);
  } catch (error) {
    console.error('❌ RPC Error:', error.message);
  }
}

test();
