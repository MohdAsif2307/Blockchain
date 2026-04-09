// Smart Contract Address - Get this after deploying DataMarketplace.sol
// To deploy: npx hardhat run scripts/deploy.js --network localhost
export const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Deployed on Hardhat local network

// Backend API URL
export const BACKEND_URL = "/api";

// Network Configuration
export const NETWORK_CONFIG = {
  chainId: 31337, // Hardhat local network, update for other networks
  chainName: "Hardhat Local",
  rpcUrl: "http://127.0.0.1:8545",
  nativeSymbol: "ETH"
};
