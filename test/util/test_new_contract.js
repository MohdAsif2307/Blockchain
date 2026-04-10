const ethers = require('ethers');

const RPC_URL = 'http://127.0.0.1:8545';
const NEW_CONTRACT_ADDRESS = '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0';

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

async function testEventEmission() {
  console.log('🔌 Connecting to Hardhat...');
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const accounts = await provider.listAccounts();
  
  const signer = await provider.getSigner(0);
  const signerAddress = await signer.getAddress();
  console.log(`✅ Signer: ${signerAddress}`);

  const contract = new ethers.Contract(NEW_CONTRACT_ADDRESS, contractABI, signer);
  console.log(`✅ Contract instance created for: ${NEW_CONTRACT_ADDRESS}\n`);

  // Send transaction
  console.log('📤 Sending registerData transaction with new contract...');
  const tx = await contract.registerData(
    'New Test Dataset',
    'Testing event emission with new contract',
    'QmNewTestHash123456',
    ethers.parseUnits('50', 'ether'),
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
  console.log('\n🔍 Receipt Analysis:');
  console.log(`   Total logs: ${receipt.logs.length}`);
  
  if (receipt.logs.length === 0) {
    console.log('   ❌ NO LOGS FOUND IN RECEIPT!');
    console.log('\n   This could mean:');
    console.log('   1. The contract function didn\'t emit any events');
    console.log('   2. The event definition is wrong');
    console.log('   3. There\'s an issue with the contract');
  } else {
    console.log('\n   Logs found:');
    receipt.logs.forEach((log, i) => {
      console.log(`\n   Log ${i}:`);
      console.log(`     - Address: ${log.address}`);
      console.log(`     - Topics: ${log.topics.length}`);
      
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed) {
          console.log(`     - ✅ Parsed Event: ${parsed.name}`);
          console.log(`     - Args: ${JSON.stringify(parsed.args, null, 2)}`);
        }
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
    console.log(`✅✅✅ SUCCESS! DatasetRegistered event found!`);
    console.log(`   Dataset ID: ${event.args.id}`);
    console.log(`   Seller: ${event.args.seller}`);
    console.log(`   Title: ${event.args.title}`);
    console.log(`   Price: ${event.args.price.toString()}`);
  } else {
    console.log(`❌ DatasetRegistered event NOT found`);
  }
}

testEventEmission().catch(console.error);
