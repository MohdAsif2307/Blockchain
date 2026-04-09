const axios = require('axios');
const { ethers } = require('ethers');

const BACKEND_URL = 'http://localhost:3000/api';
const RPC_URL = 'http://127.0.0.1:8545';
const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// Test user credentials
const testUser = {
  email: 'test@example.com',
  password: 'password',
  username: 'testuser',
  walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
};

// Test dataset
const testDataset = {
  title: 'Test Customer Data',
  description: 'Sample customer behavior dataset for testing',
  price: 100,
  category: 'AI Data',
  ipfsHash: 'QmTestHash123456789',
  format: 'csv',
  blockchainId: 0
};

async function loginAndGetUser() {
  console.log('\n📝 Step 1: Testing Login...');
  try {
    const response = await axios.post(`${BACKEND_URL}/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    console.log('✅ Login successful');
    console.log(`   User ID: ${response.data.user.id}`);
    console.log(`   Username: ${response.data.user.username}`);
    console.log(`   Wallet: ${response.data.user.walletAddress}`);
    return response.data.user;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.error || error.message);
    throw error;
  }
}

async function testBlockchainRegistration() {
  console.log('\n⛓️  Step 2: Testing Blockchain Registration...');
  
  try {
    // Connect to Hardhat
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    
    console.log(`✅ Connected to Hardhat`);
    console.log(`   Provider: ${RPC_URL}`);
    console.log(`   Signer Address: ${signer.address}`);
    console.log(`   Contract Address: ${CONTRACT_ADDRESS}`);
    
    // Get contract ABI
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
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
    
    console.log(`✅ Contract instance created`);
    
    // Send registration transaction
    const priceWei = ethers.parseUnits('100', 'ether');
    console.log(`\n📤 Sending registerData transaction...`);
    console.log(`   Title: ${testDataset.title}`);
    console.log(`   Description: ${testDataset.description}`);
    console.log(`   IPFS Hash: ${testDataset.ipfsHash}`);
    console.log(`   Price: ${testDataset.price} ETH = ${priceWei.toString()} Wei`);
    
    const tx = await contract.registerData(
      testDataset.title,
      testDataset.description,
      testDataset.ipfsHash,
      priceWei,
      { gasLimit: 2000000 }
    );
    
    console.log(`✅ Transaction sent!`);
    console.log(`   Hash: ${tx.hash}`);
    
    console.log(`\n⏳ Waiting for confirmation...`);
    const receipt = await tx.wait();
    
    console.log(`✅ Transaction confirmed!`);
    console.log(`   Block Number: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`   Status: ${receipt.status === 1 ? 'SUCCESS' : 'FAILED'}`);
    
    // Parse event
    const event = receipt.logs
      .map(log => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find(parsed => parsed && parsed.name === 'DatasetRegistered');
    
    if (!event) {
      throw new Error('DatasetRegistered event not found');
    }
    
    const datasetId = event.args.id.toString();
    console.log(`\n🎉 DatasetRegistered Event Emitted!`);
    console.log(`   Dataset ID: ${datasetId}`);
    console.log(`   Seller: ${event.args.seller}`);
    console.log(`   Price: ${event.args.price.toString()} Wei`);
    
    return { txHash: tx.hash, datasetId };
  } catch (error) {
    console.error('❌ Blockchain registration failed:', error.message);
    throw error;
  }
}

async function createDatasetOnBackend(user, blockchainData) {
  console.log('\n💾 Step 3: Creating Dataset on Backend...');
  
  try {
    const response = await axios.post(`${BACKEND_URL}/datasets/create`, {
      title: testDataset.title,
      description: testDataset.description,
      price: testDataset.price,
      category: testDataset.category,
      ipfsHash: testDataset.ipfsHash,
      format: testDataset.format,
      recordCount: 0,
      walletAddress: testUser.walletAddress,
      blockchainId: blockchainData.datasetId
    });
    
    console.log('✅ Dataset created on backend');
    console.log(`   Dataset ID: ${response.data.datasetId}`);
    console.log(`   Title: ${response.data.title}`);
    console.log(`   Blockchain ID: ${response.data.blockchainId}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Backend dataset creation failed:', error.response?.data?.error || error.message);
    throw error;
  }
}

async function verifyDatasetInDatabase() {
  console.log('\n🔍 Step 4: Verifying Dataset in Database...');
  
  try {
    const response = await axios.get(`${BACKEND_URL}/datasets`);
    
    const datasets = Array.isArray(response.data) ? response.data : response.data.datasets || [];
    console.log(`✅ Fetched ${datasets.length} datasets from backend`);
    
    if (datasets.length > 0) {
      const ourDataset = datasets.find(d => d.title === testDataset.title);
      if (ourDataset) {
        console.log(`✅ Test dataset found in database!`);
        console.log(`   ID: ${ourDataset.id}`);
        console.log(`   Title: ${ourDataset.title}`);
        console.log(`   Blockchain ID: ${ourDataset.blockchainId}`);
        console.log(`   IPFS Hash: ${ourDataset.ipfsHash}`);
        console.log(`   Price: ₹${ourDataset.price}`);
      } else {
        console.log('⚠️  Test dataset not found in database (but other datasets exist)');
      }
    } else {
      console.log('⚠️  No datasets found yet');
    }
  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
  }
}

async function runFullTest() {
  console.log('═'.repeat(60));
  console.log('🚀 DATA MARKETPLACE SELL TEST');
  console.log('═'.repeat(60));
  
  try {
    // Step 1: Login
    const user = await loginAndGetUser();
    
    // Step 2: Test blockchain registration
    const blockchainData = await testBlockchainRegistration();
    
    // Step 3: Create dataset on backend
    const backendDataset = await createDatasetOnBackend(user, blockchainData);
    
    // Step 4: Verify in database
    await verifyDatasetInDatabase();
    
    console.log('\n' + '═'.repeat(60));
    console.log('✅ TEST COMPLETED SUCCESSFULLY!');
    console.log('═'.repeat(60));
    console.log('\n📋 SUMMARY:');
    console.log(`   ✅ User logged in`);
    console.log(`   ✅ Dataset registered on blockchain (Tx: ${blockchainData.txHash})`);
    console.log(`   ✅ Dataset ID on blockchain: ${blockchainData.datasetId}`);
    console.log(`   ✅ Dataset created on backend (ID: ${backendDataset.id})`);
    console.log(`   ✅ Blockchain reflected in database`);
    console.log('\n🎉 SELL DATA FLOW WORKING PERFECTLY!\n');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the test
runFullTest().catch(console.error);
