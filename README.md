# Decentralized Data Marketplace

A secure, web3-enabled data marketplace application allowing users to monetize their datasets and purchase data using MetaMask.

The project combines a Node.js/Express backend (with SQLite for fast profile and database metadata storage) and an interactive Vanilla HTML/CSS/JS frontend directly communicating with Ethereum smart contracts through the `ethers.js` library.

---

## 🌟 Features

* **Ethereum & MetaMask Native**: Deep integration with MetaMask. Supports auto-network switching (to Hardhat localhost), transaction signing, and real-time wallet change detection.
* **Smart Contracts**: Backend dataset purchases and dataset registrations are secured by on-chain Solidity smart contracts.
* **Hybrid Storage model**: Sensitive off-chain data (like user emails, profiles) uses an SQLite relational database, with wallet-address syncing between the Web3 extension (MetaMask) and Web2 backend.
* **Premium UI/UX**: Clean glassmorphism aesthetic, responsive login, dynamic notifications, and a categorized real-time dashboard layout. 
* **Flexible Payments**: Support for mock UPI, Card payments, and native Wallet Balance with on-chain Ethereum (ETH) as the default payment mode.

---

## 🛠 Tech Stack

### Frontend
- **HTML/CSS/JS**: Vanilla JS and modern CSS structures (Grid, Flexbox, Animations).
- **Ethers.js (v6)**: Interacts with the blockchain network and users' MetaMask extensions.

### Backend
- **Node.js & Express.js**: Handles API endpoints, serving the frontend, file uploads, and user authentication.
- **SQLite3**: Lightweight, zero-configuration database to store users, dataset metadata, notifications, and transactions securely.
- **Multer**: Used for dataset and avatar file-upload handling.

### Blockchain & Smart Contracts
- **Solidity (v0.8.x)**: Language for defining the DataMarketplace smart contract.
- **Hardhat**: Development environment to compile, deploy, test, and run an Ethereum local network node.

---

## 📸 Screenshots & UI

*(You can add screenshots of your app here)*
- **Landing Page, Dashboard, and Web3 Integration Highlights**

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (Version 18.x recommended. *Note: Hardhat might show warnings on versions above 18, but it generally functions fine locally*)
* [MetaMask Extension](https://metamask.io/) installed in your browser.

### 1. Clone & Install
Clone the repository and install the NPM packages.
```bash
git clone https://github.com/MohdAsif2307/Blockchain.git
cd Blockchain
npm install
```

### 2. Run the Blockchain Network (Hardhat Node)
Open a new terminal window and start the Hardhat local node. Keep this terminal running.
```bash
npx hardhat node
```
This will start a local Ethereum RPC node at `http://127.0.0.1:8545` and provide you with 20 funded test accounts.

### 3. Deploy the Smart Contract
Open a second terminal window and execute the deployment script against your running local node:
```bash
npx hardhat run scripts/deploy.js --network localhost
```
*Note the deployed contract address. Ensure it matches the `CONTRACT_ADDRESS` constant located inside `frontend/js/config.js`.*

*(Optional Registration Script)*
```js
// If you want to automatically mint dummy datasets to the local blockchain, 
// you can run a custom task or ethers.js script with your newly generated contract address. 
```

### 4. Start the Application
Open a third terminal window. Our architecture is configured to have Express serve the frontend files alongside the API, avoiding CORS and standardizing the architecture.
```bash
npm run start:backend
# Or directly: node backend/server.js
```
*The App is now running at `http://localhost:3000`*

---

## 🦊 Configuring MetaMask

To test purchases, you need to connect your MetaMask to your local blockchain:

1. Click on the MetaMask browser extension.
2. The application handles **Auto-Network Switching** upon login to configure `Hardhat Local` automatically, but if you want to add it manually:
    - **Network Name**: Hardhat Local
    - **New RPC URL**: `http://127.0.0.1:8545`
    - **Chain ID**: `31337`
    - **Currency Symbol**: `ETH`
3. Import an Account using one of the **Private Keys** printed by the `npx hardhat node` terminal. *(Account #0 is recommended for buying/admin tasks)*

---

## 📁 Project Structure

```
├── backend/
│   ├── db/            # SQLite Database logic & init (database.js, queries)
│   ├── routes/        # Express API endpoints (api.js)
│   ├── uploads/       # Storage for dataset CSV/JSON + Avatars
│   └── server.js      # App entry point, starts Express 
├── contracts/
│   └── DataMarketplace.sol # Core logic for data listings & purchases
├── frontend/
│   ├── css/           # Styling (styles.css)
│   ├── js/            # Client-Side logic (app.js, api.js, contract.js, ipfs.js)
│   ├── dashboard.html # (Example layout)
│   ├── landing.html   # Single-Page-App main frontend file
│   └── ...            
├── scripts/
│   └── deploy.js      # Hardhat contract deployment instruction
├── hardhat.config.js  # Network environment setup
└── package.json
```

---

## 🔑 Backend API Capabilities

The backend supplies a lightweight but strict API configuration at `/api/*`:
- `POST /api/signup` / `POST /api/login` - Profile interactions.
- `POST /api/users/:id/wallet` - Specifically built to synchronize Metamask wallet connections to the persistent database.
- `GET /api/datasets` - Returns listed market data.
- `POST /api/buy` / `POST /api/payment/complete` - Simulates and tracks web2 transaction flows alongside native Web3.

---

## 🛡 License & Author

Developed and Open-sourced by [MohdAsif2307](https://github.com/MohdAsif2307).
