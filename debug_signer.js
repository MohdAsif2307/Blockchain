const ethers = require('ethers');

const RPC_URL = 'http://127.0.0.1:8545';
const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

const contractABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "datasetId", "type": "uint256" }
    ],
    "name": "buyData",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
];

async function debugSigner() {
  console.log('🔍 Debugging signer creation...\n');

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // Test account 0
  console.log('Account 0:');
  const signer0 = await provider.getSigner(0);
  const addr0 = await signer0.getAddress();
  console.log(`  Address: ${addr0}`);

  // Test account 1
  console.log('\nAccount 1:');
  const signer1 = await provider.getSigner(1);
  const addr1 = await signer1.getAddress();
  console.log(`  Address: ${addr1}`);

  // Test contract creation
  console.log('\n📝 Testing contract creation...');
  const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer1);
  console.log('✅ Contract created successfully');

  // Test price calculation
  const price = 100;
  const priceWei = ethers.parseUnits(String(price), 'ether');
  console.log(`\n💰 Price calculation:`);
  console.log(`  Price: ${price} ETH`);
  console.log(`  Wei: ${priceWei.toString()}`);
  console.log(`  Hex: ${priceWei}`);

  // Test transaction preparation (without sending)
  console.log('\n📤 Testing transaction preparation...');
  try {
    const txRequest = await contract.buyData.populateTransaction(1, {
      value: priceWei,
      gasLimit: 2000000
    });

    console.log('✅ Transaction populated successfully');
    console.log('Transaction details:');
    console.log(`  To: ${txRequest.to}`);
    console.log(`  Data: ${txRequest.data}`);
    console.log(`  Value: ${txRequest.value}`);
    console.log(`  Gas Limit: ${txRequest.gasLimit}`);

    // Check if value is correct
    if (txRequest.value === priceWei) {
      console.log('✅ Value is correct');
    } else {
      console.log('❌ Value mismatch!');
      console.log(`  Expected: ${priceWei}`);
      console.log(`  Got: ${txRequest.value}`);
    }

  } catch (error) {
    console.error('❌ Transaction preparation failed:', error.message);
  }
}

debugSigner().catch(console.error);
