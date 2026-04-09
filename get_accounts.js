const ethers = require('ethers');

async function getAccounts() {
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  const signer0 = await provider.getSigner(0);
  const signer1 = await provider.getSigner(1);
  
  const addr0 = await signer0.getAddress();
  const addr1 = await signer1.getAddress();
  
  console.log('Hardhat Accounts:');
  console.log(`Account 0: ${addr0}`);
  console.log(`Account 1: ${addr1}`);
}

getAccounts();
