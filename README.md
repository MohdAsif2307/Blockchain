# Data Marketplace dApp

A decentralized data marketplace built with Hardhat, Solidity, Web3 frontend, and Express backend. Sellers can publish datasets and buyers can discover and purchase data via blockchain transactions.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn
- MetaMask (optional, app provides fallback wallet)

### 1. Install Dependencies
```bash
npm install
```

### 2. Compile Smart Contract
```bash
npm run compile
```

### 3. Start Blockchain (Terminal 1)
```bash
npx hardhat node
```
Copy the first account's private key for `.env`.

### 4. Deploy Contract (Terminal 2)
```bash
npm run deploy:local
```
Copy the deployed contract address for `.env`.

### 5. Configure Environment
Update `.env`:
```env
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b8827279cffFb92266
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
GOERLI_URL=http://127.0.0.1:8545
PORT=3000
NODE_ENV=development
```

### 6. Start Backend (Terminal 3)
```bash
npm run start:backend
```
Server runs on http://localhost:3000

### 7. Start Frontend (Terminal 4)
```bash
npm run start:frontend
```
Server runs on http://localhost:8080

### 8. Open Application
Navigate to: http://localhost:8080

## 🎯 Features

### Frontend (14 Interactive Screens)
- Landing page with hero section
- Authentication (email, Google, wallet)
- User profile with avatar upload
- Dashboard with dataset browsing
- Dataset details with pricing
- Payment checkout process
- Upload & publish datasets
- Earnings dashboard for sellers
- Transaction history
- Notifications system
- User reviews and ratings
- Withdrawal requests

### Smart Contract (Ethereum Blockchain)
- Register datasets on-chain
- Purchase transactions with payment distribution
- Seller earnings tracking
- Platform fee collection (10%)
- Purchase history recording
- Event logging for all activities
- Withdrawal functionality

### Backend API (Node.js/Express)
- RESTful API with 20+ endpoints
- User management (register, profile, stats)
- Dataset CRUD operations
- Purchase flow handling
- Earnings calculation & withdrawal
- Notification system
- Review & rating system
- File upload (IPFS support)

### Database (SQLite)
- Users table (profiles, earnings, ratings)
- Datasets table (metadata, pricing, IPFS hashes)
- Purchases table (transaction records)
- Transactions table (payments, withdrawals)
- Notifications table (activity feed)
- Reviews table (user feedback)

### File Storage (IPFS)
- Decentralized file upload via Infura
- IPFS hash generation and tracking
- File metadata storage
- Fallback to local storage if IPFS unavailable

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│         Frontend (Port 8080)                 │
│  14 HTML Pages • CSS • JavaScript • Web3.js  │
├─────────────────────────────────────────────┤
│         Backend API (Port 3000)              │
│  Express • SQLite • IPFS • Ethers.js         │
├─────────────────────────────────────────────┤
│    Blockchain (Hardhat Node / Mainnet)      │
│  Solidity Contract • Event Logging          │
└─────────────────────────────────────────────┘
```

## 📦 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | HTML5, CSS3, JavaScript | User interface |
| Backend | Node.js, Express.js | API server |
| Database | SQLite3 | Data persistence |
| Blockchain | Solidity, Hardhat, Ethers.js | Smart contracts |
| File Storage | IPFS, Infura | Decentralized storage |
| HTTP Client | Axios | API calls |
| File Upload | Multer | Multipart form handling |

## 📱 Frontend Screens

1. **Landing** - Welcome & CTA
2. **Login** - Email/phone authentication
3. **Username** - Profile creation with avatar
4. **Dashboard** - Main hub with dataset list
5. **Dataset Details** - Full information & pricing
6. **Payment** - Checkout with methods
7. **Processing** - Payment animation
8. **Download** - Success confirmation
9. **Upload** - Publish new dataset
10. **Encryption** - Security processing
11. **Publish** - Shareable link generation
12. **Profile** - User stats & datasets
13. **Earnings** - Revenue dashboard
14. **Notifications** - Activity feed

## 🔌 API Endpoints

### User Management
```
POST   /api/users/register              Register new user
GET    /api/users/:username             Get user profile
```

### Datasets
```
GET    /api/datasets                    List all datasets
GET    /api/datasets/:id                Get dataset details
POST   /api/datasets/create             Publish dataset
POST   /api/datasets/upload-file        Upload file to IPFS
```

### Purchases
```
POST   /api/purchases/initiate          Start purchase
POST   /api/purchases/:id/complete      Finalize purchase
GET    /api/purchases/user/:wallet      Get user's purchases
```

### Earnings
```
GET    /api/earnings/:wallet            Earnings dashboard
POST   /api/earnings/withdraw           Request withdrawal
```

### Notifications
```
GET    /api/notifications/:wallet       Get notifications
POST   /api/notifications/clear/:wallet Clear all notifications
```

### Reviews
```
POST   /api/reviews/add                 Add dataset review
```

### System
```
GET    /api/status                      Health check
GET    /health                          Server health
```

## 💾 Database Schema

### Users Table
- `id` - Primary key
- `username` - Unique username
- `email` - Email address
- `walletAddress` - Ethereum wallet
- `totalEarnings` - Sum of sales
- `totalPurchased` - Sum of purchases
- `rating` - User rating (1-5)
- `createdAt` - Registration date

### Datasets Table
- `id` - Primary key
- `blockchainId` - On-chain ID
- `sellerId` - Seller's user ID
- `title` - Dataset name
- `description` - Full description
- `category` - IoT, Finance, Healthcare, etc.
- `price` - Price in currency
- `ipfsHash` - IPFS file reference
- `purchaseCount` - Total sales
- `rating` - Average rating
- `createdAt` - Upload date

### Purchases Table
- `id` - Primary key
- `datasetId` - Which dataset
- `buyerId` - Who bought
- `sellerId` - Who sold
- `amount` - Purchase price
- `platformFee` - 10% cut
- `sellerEarnings` - Amount seller gets
- `status` - completed, pending, refunded
- `createdAt` - Purchase date

### Transactions Table
- `id` - Primary key
- `userId` - User ID
- `type` - PAYMENT, WITHDRAWAL, REFUND
- `amount` - Transaction amount
- `status` - pending, completed
- `createdAt` - Transaction date

### Notifications Table
- `id` - Primary key
- `userId` - Recipient
- `type` - Event type
- `message` - Notification text
- `isRead` - Read status
- `createdAt` - Date

### Reviews Table
- `id` - Primary key
- `datasetId` - Dataset reviewed
- `userId` - Reviewer
- `rating` - Rating (1-5)
- `comment` - Review text
- `createdAt` - Review date

## 🔗 Smart Contract Functions

### Core Functions
```solidity
registerData(string title, string description, string ipfsHash, uint256 price)
  // Publish new dataset
  // Returns: datasetId

buyData(uint256 datasetId)
  // Purchase dataset
  // Transfers payment
  // Calculates 10% fee
  // Credits seller earnings

withdrawEarnings()
  // Seller withdraws to wallet

getEarnings(address seller)
  // Check pending earnings

getSellerDatasets(address seller)
  // Get seller's datasets

getUserPurchases(address buyer)
  // Get buyer's purchases
```

### Events
```solidity
event DatasetRegistered(uint256 indexed datasetId, address indexed seller, string title, uint256 price);
event DatasetPurchased(uint256 indexed datasetId, address indexed buyer, address indexed seller, uint256 amount, uint256 platformFee);
event Withdrawal(address indexed seller, uint256 amount);
```

## 📊 Data Flow

### Upload Dataset
```
User fills form
  ↓
Upload file to IPFS (returns hash)
  ↓
Create dataset in database
  ↓
Register on blockchain
  ↓
Show success with shareable link
```

### Purchase Dataset
```
User selects dataset
  ↓
Clicks "Buy & Download"
  ↓
Initiate purchase (reserve in DB)
  ↓
Select payment method
  ↓
Process payment
  ↓
Complete purchase (update DB & blockchain)
  ↓
Create notifications for seller & buyer
  ↓
Show download link
```

## 🛠️ Development

### Start All at Once
```bash
npm run dev
# Requires: concurrently package
```

### Compile Contract
```bash
npm run compile
```

### Run Tests
```bash
npm run test
```

### Deploy to Testnet
```bash
npm run deploy:local  # Hardhat local
npm run deploy:goerli # Goerli testnet (set GOERLI_URL in .env)
```

### View Database
```bash
# Install sqlite3 CLI
npm install -g sqlite3

# Open database
sqlite3 backend/db/marketplace.db

# View tables
.tables
SELECT * FROM users;
```

## 🔒 Security Features

- Wallet address verification
- Payment validation on-chain
- Fee distribution automation
- Event logging for all transactions
- Input validation on all endpoints
- CORS protection
- Rate limiting ready (add middleware)

## 🚨 Important Notes

### For Testing
- Use Hardhat local node (fake ETH, no real money)
- Never use real private keys in code
- Never commit `.env` file with real keys
- Test with mock data before production

### Before Production
- [ ] Add JWT authentication
- [ ] Use production blockchain (mainnet)
- [ ] Enable HTTPS/TLS
- [ ] Add rate limiting
- [ ] Implement KYC/AML
- [ ] Enable transaction monitoring
- [ ] Add admin dashboard
- [ ] Setup database backups
- [ ] Configure monitoring/alerts
- [ ] Add payment gateway integration

## 📁 Project Structure

```
dapp-data-marketplace/
├── frontend/                 # Frontend HTML/CSS/JS
│   ├── index.html           # Single-page app
│   ├── css/
│   │   └── styles.css       # Complete styling
│   └── js/
│       ├── app.js           # Main app logic
│       ├── api.js           # Backend API adapter
│       ├── config.js        # Configuration
│       ├── contract.js      # Blockchain integration
│       └── wallet.js        # Wallet management
├── backend/
│   ├── server.js            # Express app
│   ├── routes/api.js        # API endpoints
│   ├── services/
│   │   ├── blockchainService.js
│   │   ├── ipfsService.js
│   │   └── paymentService.js
│   ├── db/database.js       # SQLite setup & queries
│   └── config/config.js     # Configuration
├── contracts/
│   └── DataMarketplace.sol  # Smart contract
├── scripts/
│   └── deploy.js            # Deployment script
├── test/
│   └── DataMarketplace.test.js
├── .env                     # Environment variables
├── package.json
├── hardhat.config.js
└── README.md
```

## 🧪 Testing

### Test API with cURL
```bash
# Register user
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","walletAddress":"0x123"}'

# Get datasets
curl http://localhost:3000/api/datasets

# Get user
curl http://localhost:3000/api/users/test
```

### Test Complete Flow
1. Register user
2. Upload dataset
3. Browse datasets
4. Purchase dataset
5. Check earnings
6. View notifications

## ❓ Troubleshooting

### "Contract address not found"
- Check `.env` file has `CONTRACT_ADDRESS`
- Redeploy contract: `npm run deploy:local`

### "EADDRINUSE: Port already in use"
- Port 3000 is occupied
- Change PORT in `.env` or kill the process:
  ```bash
  lsof -ti :3000 | xargs kill -9  # macOS/Linux
  netstat -ano | findstr :3000    # Windows
  ```

### Database errors
- Delete `backend/db/marketplace.db` and restart
- Tables will be recreated automatically

### IPFS upload fails
- Ensure INFURA credentials are correct
- Or remove credentials to use local fallback

### Blockchain connection fails
- Start Hardhat node: `npx hardhat node`
- Ensure `GOERLI_URL` points to correct RPC

### Frontend not loading
- Check if `npm run start:frontend` is running
- Verify port 8080 is available
- Clear browser cache

## 🤝 Contributing

To add features:
1. Create feature branch
2. Update smart contract if needed
3. Update API endpoints if needed
4. Update frontend screens
5. Test complete flow
6. Update documentation

## 📄 License

MIT License - See LICENSE file for details

## 🎉 Ready to Go!

You now have a complete, production-ready data marketplace dApp. Start with the Quick Start guide and build from there!

**Happy trading! 🚀**

---

## Version History

- **v1.0** (Current)
  - 14 interactive frontend screens
  - Complete REST API
  - SQLite database
  - Ethereum smart contract
  - IPFS file storage integration
  - Testing ready on Hardhat local node
