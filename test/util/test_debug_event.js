const ethers = require('ethers');

const RPC_URL = 'http://127.0.0.1:8545';
const CONTRACT_ADDRESS = '0x610178dA211FEF7D417bC0e6FeD39F05609AD788';

const contractABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "title", "type": "string" },
      { "internalType": "string", "name": "description", "type": "string" },
      { "internalType": "string", "name": "ipfsHash", "type": "string" },
      { "internalType": "uint256", "name": "price", "type": "uint256" }
    ],
    "name": "registerData",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "seller", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "title", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "price", "type": "uint256" }
    ],
    "name": "DatasetRegistered",
    "type": "event"
  }
];

async function testEvent() {
  console.log('🔌 Connecting to Hardhat...');
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const accounts = await provider.listAccounts();
  console.log(`✅ Connected. ${accounts.length} accounts available`);

  const signer = await provider.getSigner(0);
  const signerAddress = await signer.getAddress();
  console.log(`✅ Signer: ${signerAddress}`);

  const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
  console.log(`✅ Contract instance created`);

  // Send transaction
  console.log('\n📤 Sending registerData transaction...');
  const tx = await contract.registerData(
    'Test Dataset',
    'Testing event emission',
    'QmTestHash123456789',
    ethers.parseUnits('100', 'ether'),
    { gasLimit: 2000000 }
  );

  console.log(`✅ Transaction sent! Hash: ${tx.hash}`);

  // Wait for receipt
  console.log('\n⏳ Waiting for confirmation...');
  const receipt = await tx.wait();

  console.log(`✅ Transaction confirmed!`);
  console.log(`   Block Number: ${receipt.blockNumber}`);
  console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
  console.log(`   Status: ${receipt.status === 1 ? 'SUCCESS' : 'FAILED'}`);

  // Debug receipt
  console.log('\n🔍 Receipt Debug Info:');
  console.log(`   Total logs: ${receipt.logs.length}`);
  console.log(`   Full receipt logs array:`);
  
  if (receipt.logs.length === 0) {
    console.log('   ❌ NO LOGS FOUND IN RECEIPT!');
  } else {
    receipt.logs.forEach((log, i) => {
      console.log(`\n   Log ${i}:`);
      console.log(`     - Address: ${log.address}`);
      console.log(`     - Topics: ${log.topics.length} topics`);
      console.log(`     - Data: ${log.data}`);
      
      try {
        const parsed = contract.interface.parseLog(log);
        console.log(`     - Parsed Event: ${parsed.name}`);
      } catch (e) {
        console.log(`     - Failed to parse: ${e.message}`);
      }
    });
  }

  // Try to find the event
  console.log('\n🔎 Searching for DatasetRegistered event...');
  const event = receipt.logs
    .map(log => {
      try {
        return contract.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find(parsed => parsed && parsed.name === 'DatasetRegistered');

  if (event) {
    console.log(`✅ Event found!`);
    console.log(`   Dataset ID: ${event.args.id}`);
    console.log(`   Seller: ${event.args.seller}`);
    console.log(`   Title: ${event.args.title}`);
    console.log(`   Price: ${event.args.price.toString()}`);
  } else {
    console.log(`❌ Event NOT found!`);
  }
}

testEvent().catch(console.error);
