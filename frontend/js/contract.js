import { CONTRACT_ADDRESS } from "./config.js";
import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.9.0/dist/ethers.min.js";

const contractAddress = CONTRACT_ADDRESS;
const contractABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
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
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "buyer", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "seller", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "price", "type": "uint256" }
    ],
    "name": "DatasetPurchased",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "title", "type": "string" },
      { "internalType": "string", "name": "description", "type": "string" },
      { "internalType": "string", "name": "ipfsHash", "type": "string" },
      { "internalType": "uint256", "name": "price", "type": "uint256" }
    ],
    "name": "registerData",
    "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [ { "internalType": "uint256", "name": "datasetId", "type": "uint256" } ],
    "name": "buyData",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "datasetCount",
    "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDatasets",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "id", "type": "uint256" },
          { "internalType": "address payable", "name": "seller", "type": "address" },
          { "internalType": "string", "name": "title", "type": "string" },
          { "internalType": "string", "name": "description", "type": "string" },
          { "internalType": "string", "name": "ipfsHash", "type": "string" },
          { "internalType": "uint256", "name": "price", "type": "uint256" },
          { "internalType": "bool", "name": "sold", "type": "bool" }
        ],
        "internalType": "struct DataMarketplace.Dataset[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
    "name": "datasets",
    "outputs": [
      { "internalType": "uint256", "name": "id", "type": "uint256" },
      { "internalType": "address payable", "name": "seller", "type": "address" },
      { "internalType": "string", "name": "title", "type": "string" },
      { "internalType": "string", "name": "description", "type": "string" },
      { "internalType": "string", "name": "ipfsHash", "type": "string" },
      { "internalType": "uint256", "name": "price", "type": "uint256" },
      { "internalType": "bool", "name": "sold", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

let provider;
let signer;
let contract;

export async function initializeContract() {
  try {
    if (window.ethereum) {
      console.log("🔌 Connecting to MetaMask...");
      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      console.log("✅ Provider connected & Signer ready:", signer.address);
    } else {
      console.log("🔌 Connecting to RPC: http://127.0.0.1:8545");
      provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      console.log("✅ Provider connected");
      console.log("🔑 Setting up signer");
      signer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
      console.log("✅ Signer ready:", signer.address);
    }
    
    console.log("📄 Contract address:", contractAddress);
    contract = new ethers.Contract(contractAddress, contractABI, signer);
    window.contract = contract;
    console.log("✅ Contract initialized");
    return contract;
  } catch (err) {
    console.error("❌ Contract init failed:", err.message);
    throw err;
  }
}

export async function getDatasetCount() {
  return await contract.datasetCount();
}

export async function getDataset(id) {
  return await contract.datasets(id);
}

export async function getAllDatasets() {
  return await contract.getDatasets();
}

export async function registerDataset(title, description, ipfsHash, priceWei) {
  console.log("📤 registerData transaction");
  console.log("  Title:", title);
  console.log("  Hash:", ipfsHash);
  console.log("  Price:", priceWei.toString());
  
  try {
    console.log("⏳ Sending...");
    const tx = await contract.registerData(title, description, ipfsHash, priceWei, { gasLimit: 2000000 });
    console.log("✅ Sent:", tx.hash);
    
    console.log("⏳ Waiting...");
    const receipt = await tx.wait();
    console.log("✅ Confirmed! Block:", receipt.blockNumber, "Gas:", receipt.gasUsed.toString());
    
    // Parse event
    const event = receipt.logs
      .map(log => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find(parsed => parsed && parsed.name === "DatasetRegistered");
    
    if (!event) {
      throw new Error("Event not found");
    }
    
    console.log("🎉 ID:", event.args.id.toString());
    return { ...receipt, id: event.args.id };
  } catch (err) {
    console.error("❌ registerDataset:", err.message);
    throw err;
  }
}

export async function buyDataset(id, priceWei) {
  if (window.ethereum) {
    const userSigner = await provider.getSigner();
    const connectedContract = contract.connect(userSigner);
    const tx = await connectedContract.buyData(id, { value: priceWei, gasLimit: 2000000 });
    return await tx.wait();
  } else {
    // Use account 1 for buying to avoid seller == buyer
    const buyerSigner = new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", provider); // Hardhat account 1
    const buyerContract = new ethers.Contract(contractAddress, contractABI, buyerSigner);
    const tx = await buyerContract.buyData(id, { value: priceWei, gasLimit: 2000000 });
    return await tx.wait();
  }
}
