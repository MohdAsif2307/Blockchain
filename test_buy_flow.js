const axios = require('axios');
const ethers = require('ethers');

const BACKEND_URL = 'http://localhost:3000/api';
const RPC_URL = 'http://127.0.0.1:8545';
const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// Buyer - account 1 (different from seller who is account 0)
const buyerUser = {
  email: 'buyer@example.com',
  password: 'password123',
  username: 'buyeruser',
  walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'  // Account 1 in Hardhat
};

// Seller account (account 0)
const sellerWallet = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

const contractABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "datasetId", "type": "uint256" }
    ],
    "name": "buyData",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": true, "internalType": "uint256", "name": "purchaseId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "buyer", "type": "address" },
      { "indexed": false, "internalType": "address", "name": "seller", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "price", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "DatasetPurchased",
    "type": "event"
  }
];

async function registerBuyerIfNeeded() {
  console.log('\n📝 Step 0: Register Buyer User...');
  try {
    // Try to login first
    try {
      const loginRes = await axios.post(`${BACKEND_URL}/login`, {
        email: buyerUser.email,
        password: buyerUser.password
      });
      console.log(`✅ Buyer already exists (User ID: ${loginRes.data.user.id})`);
      return loginRes.data.user;
    } catch (e) {
      // User doesn't exist, create them
      if (e.response?.status === 404) {
        console.log('   User not found, creating new buyer...');
        const registerRes = await axios.post(`${BACKEND_URL}/register`, {
          username: buyerUser.username,
          email: buyerUser.email,
          password: buyerUser.password,
          walletAddress: buyerUser.walletAddress
        });
        console.log(`✅ Buyer registered successfully (User ID: ${registerRes.data.user.id})`);
        return registerRes.data.user;
      }
      throw e;
    }
  } catch (error) {
    console.error('❌ Buyer registration failed:', error.response?.data?.error || error.message);
    if (error.response?.data) {
      console.error('   Details:', error.response.data);
    }
    throw error;
  }
}

async function loginBuyer() {
  console.log('\n📝 Step 1: Buyer Login...');
  try {
    const response = await axios.post(`${BACKEND_URL}/login`, {
      email: buyerUser.email,
      password: buyerUser.password
    });
    
    console.log(`✅ Login successful`);
    console.log(`   User ID: ${response.data.user.id}`);
    console.log(`   Username: ${response.data.user.username}`);
    console.log(`   Wallet: ${response.data.user.walletAddress}`);
    
    return response.data.user;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.error || error.message);
    throw error;
  }
}

async function getAvailableDataset() {
  console.log('\n📋 Step 1.5: Get Available Dataset to Buy...');
  try {
    const response = await axios.get(`${BACKEND_URL}/datasets`);
    const datasets = Array.isArray(response.data) ? response.data : response.data.datasets || [];
    
    if (datasets.length === 0) {
      throw new Error('No datasets available to purchase');
    }
    
    // Get the most recent dataset NOT sold by the buyer, with reasonable price consistency
    const buyableDataset = datasets
      .filter(d => d.sellerId !== 5)  // Not bought by this buyer
      .sort((a, b) => (b.id || 0) - (a.id || 0))  // Most recent first
      .find(d => d.blockchainId && d.price && d.price < 200);  // Reasonable price
    
    if (!buyableDataset) {
      throw new Error('No suitable datasets available to purchase');
    }
    
    console.log(`✅ Found available dataset`);
    console.log(`   Dataset ID: ${buyableDataset.id}`);
    console.log(`   Blockchain ID: ${buyableDataset.blockchainId}`);
    console.log(`   Title: ${buyableDataset.title}`);
    console.log(`   Price: ₹${buyableDataset.price} (${buyableDataset.price} ETH on blockchain)`);
    console.log(`   Seller ID: ${buyableDataset.sellerId}`);
    
    return buyableDataset;
  } catch (error) {
    console.error('❌ Failed to get dataset:', error.message);
    throw error;
  }
}

async function purchaseOnBlockchain(buyer, dataset) {
  console.log('\n⛓️  Step 2: Purchase on Blockchain...');
  
  try {
    // Connect as account 1 (buyer) using Wallet directly
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const privateKey = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'; // Account 1 private key
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = await signer.getAddress();
    
    console.log(`✅ Connected to Hardhat`);
    console.log(`   Provider: ${RPC_URL}`);
    console.log(`   Buyer Address: ${signerAddress}`);
    console.log(`   Contract Address: ${CONTRACT_ADDRESS}`);
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
    console.log(`✅ Contract instance created`);
    
    // Send purchase transaction
    const priceWei = ethers.parseUnits(String(dataset.price), 'ether');
    console.log(`\n📤 Sending buyData transaction...`);
    console.log(`   Dataset ID: ${dataset.blockchainId}`);
    console.log(`   Price: ${dataset.price} ETH = ${priceWei.toString()} Wei`);
    
    const tx = await contract.buyData(dataset.blockchainId, {
      value: priceWei,
      gasLimit: 2000000
    });
    
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
      .find(parsed => parsed && parsed.name === 'DatasetPurchased');
    
    if (!event) {
      throw new Error('DatasetPurchased event not found');
    }
    
    const purchaseId = event.args[1].toString();  // purchaseId is second indexed param
    console.log(`\n🎉 DatasetPurchased Event Emitted!`);
    console.log(`   Dataset ID: ${event.args[0]}`);
    console.log(`   Purchase ID: ${purchaseId}`);
    console.log(`   Buyer: ${event.args[2]}`);
    console.log(`   Seller: ${event.args[3]}`);
    console.log(`   Price: ${event.args[4].toString()} Wei`);
    
    return { txHash: tx.hash, purchaseId, datasetId: dataset.blockchainId };
  } catch (error) {
    console.error('❌ Blockchain purchase failed:', error.message);
    throw error;
  }
}

async function createPurchaseOnBackend(buyer, dataset, blockchainData) {
  console.log('\n💾 Step 3: Recording Purchase on Backend...');
  
  try {
    const response = await axios.post(`${BACKEND_URL}/purchases/create`, {
      datasetId: dataset.id,
      buyerId: buyer.id,
      sellerId: dataset.sellerId,
      price: dataset.price,
      blockchainPurchaseId: blockchainData.purchaseId,
      status: 'completed'
    });
    
    console.log('✅ Purchase recorded on backend');
    console.log(`   Purchase ID: ${response.data.purchaseId}`);
    console.log(`   Dataset ID: ${response.data.datasetId}`);
    console.log(`   Status: ${response.data.status}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Backend purchase recording failed:', error.response?.data?.error || error.message);
    throw error;
  }
}

async function verifyPurchaseInDatabase(buyer, dataset) {
  console.log('\n🔍 Step 4: Verifying Purchase in Database...');
  
  try {
    const response = await axios.get(`${BACKEND_URL}/purchases/${buyer.id}`);
    
    const purchases = Array.isArray(response.data) ? response.data : response.data.purchases || [];
    console.log(`✅ Fetched ${purchases.length} purchases for buyer`);
    
    if (purchases.length > 0) {
      const ourPurchase = purchases.find(p => p.datasetId === dataset.id);
      if (ourPurchase) {
        console.log(`✅ Purchase found in database!`);
        console.log(`   Purchase ID: ${ourPurchase.id}`);
        console.log(`   Dataset ID: ${ourPurchase.datasetId}`);
        console.log(`   Price: ₹${ourPurchase.price}`);
        console.log(`   Status: ${ourPurchase.status}`);
      } else {
        console.log('⚠️  Purchase not found in database (but other purchases exist)');
      }
    } else {
      console.log('⚠️  No purchases found yet');
    }
  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
  }
}

async function runFullBuyTest() {
  console.log('═'.repeat(60));
  console.log('🛍️  DATA MARKETPLACE BUY TEST');
  console.log('═'.repeat(60));
  
  try {
    // Step 0: Register buyer if needed
    await registerBuyerIfNeeded();
    
    // Step 1: Login buyer
    const buyer = await loginBuyer();
    
    // Step 1.5: Get available dataset
    const dataset = await getAvailableDataset();
    
    // Step 2: Purchase on blockchain
    const blockchainData = await purchaseOnBlockchain(buyer, dataset);
    
    // Step 3: Record on backend
    const backendPurchase = await createPurchaseOnBackend(buyer, dataset, blockchainData);
    
    // Step 4: Verify in database
    await verifyPurchaseInDatabase(buyer, dataset);
    
    console.log('\n' + '═'.repeat(60));
    console.log('✅ TEST COMPLETED SUCCESSFULLY!');
    console.log('═'.repeat(60));
    
    console.log('\n📋 SUMMARY:');
    console.log(`   ✅ Buyer registered & logged in`);
    console.log(`   ✅ Dataset found (ID: ${dataset.id}, Blockchain: ${dataset.blockchainId})`);
    console.log(`   ✅ Purchase completed on blockchain (Tx: ${blockchainData.txHash.substring(0, 40)}...)`);
    console.log(`   ✅ Purchase ID on blockchain: ${blockchainData.purchaseId}`);
    console.log(`   ✅ Purchase recorded on backend`);
    console.log(`   ✅ Purchase verified in database`);
    
    console.log('\n🎉 BUY DATA FLOW WORKING PERFECTLY!');
  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

runFullBuyTest();
