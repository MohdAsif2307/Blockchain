# dapp-data-marketplace

A decentralized data marketplace dApp built with Hardhat, Solidity, a Web3 frontend, and an optional Express backend.

## Project Structure

- `contracts/` - Solidity smart contracts
- `scripts/` - Deployment scripts
- `test/` - Smart contract tests
- `frontend/` - Browser UI and Web3 integration
- `backend/` - Optional Express middleware and IPFS support
- `.env` - Private keys and API settings
- `hardhat.config.js` - Hardhat configuration

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`.

3. Compile the contract:
   ```bash
   npm run compile
   ```

4. Start a local Hardhat node:
   ```bash
   npx hardhat node
   ```

5. Deploy to local network:
   ```bash
   npm run deploy:local
   ```

6. Update the contract address in `frontend/js/config.js`:
   ```js
   export const CONTRACT_ADDRESS = "0x...";
   ```

7. Start the backend and serve the frontend together:
   ```bash
   npm run dev
   ```

8. Or run services separately:
   ```bash
   npm run start:backend
   npm run start:frontend
   ```

## Features

- Register datasets with metadata and IPFS hash
- Buy datasets using Ether
- Optional backend for IPFS uploads and API routing

## Notes

- Replace `.env` placeholders with real keys before using Infura or an external network.
- The frontend expects MetaMask to be installed.
