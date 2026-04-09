# Data Marketplace dApp - Backend Setup Guide

## Overview
Complete backend system with:
- **Blockchain**: Ethereum smart contract for dataset registry and payments
- **Database**: SQLite with user, dataset, purchase, and transaction tracking
- **API**: RESTful endpoints for all marketplace operations
- **File Storage**: IPFS integration for decentralized file storage
- **Payments**: Cryptocurrency and fiat payment processing

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

This installs:
- `express` - Web framework
- `ethers` - Blockchain interaction
- `sqlite3` - Database
- `axios` - HTTP client
- `multer` - File uploads
- `cors` - Cross-origin requests
- `dotenv` - Environment configuration

### 2. Setup Environment Variables
Update `.env` file:

```env
# Server
PORT=3000
NODE_ENV=development

# Blockchain (for local Hardhat node)
GOERLI_URL=http://127.0.0.1:8545
PRIVATE_KEY=your_private_key_here
CONTRACT_ADDRESS=deployed_contract_address_here

# IPFS (optional)
INFURA_PROJECT_ID=your_infura_id
INFURA_PROJECT_SECRET=your_infura_secret
```

### 3. Compile Smart Contract
```bash
npm run compile
```

### 4. Deploy Contract (Local Hardhat Node)
**Terminal 1 - Start Hardhat node:**
```bash
npx hardhat node
```

**Terminal 2 - Deploy contract:**
```bash
npm run deploy:local
```

Copy the deployed contract address and update `.env`:
```env
CONTRACT_ADDRESS=0x...
```

Also update the private key of the account you're using (Hardhat provides default test accounts).

### 5. Start Backend
```bash
npm run start:backend
```

Backend will be available at:
- **API**: http://localhost:3000/api
- **Health**: http://localhost:3000/health
- **Frontend**: http://localhost:3000

---

## API Endpoints

### User Management

**Register User**
```bash
POST /api/users/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "walletAddress": "0x..."
}
```

**Get User Profile**
```bash
GET /api/users/:username
```

---

### Datasets

**Get All Datasets**
```bash
GET /api/datasets?category=IoT
```

**Get Dataset Details**
```bash
GET /api/datasets/:id
```

**Upload File**
```bash
POST /api/datasets/upload-file
Content-Type: multipart/form-data

file: (binary data)
```

**Create/Publish Dataset**
```bash
POST /api/datasets/create
Content-Type: application/json

{
  "title": "Customer Data",
  "description": "High quality dataset",
  "price": 150,
  "category": "Retail",
  "ipfsHash": "Qm...",
  "format": "CSV",
  "recordCount": 10000,
  "walletAddress": "0x..."
}
```

---

### Purchases

**Initiate Purchase**
```bash
POST /api/purchases/initiate
Content-Type: application/json

{
  "datasetId": 1,
  "buyerWallet": "0x..."
}
```

**Complete Purchase**
```bash
POST /api/purchases/:id/complete
```

**Get User Purchases**
```bash
GET /api/purchases/user/:walletAddress
```

---

### Earnings

**Get Earnings Dashboard**
```bash
GET /api/earnings/:walletAddress
```

**Request Withdrawal**
```bash
POST /api/earnings/withdraw
Content-Type: application/json

{
  "walletAddress": "0x...",
  "amount": 1000
}
```

---

### Notifications

**Get Notifications**
```bash
GET /api/notifications/:walletAddress
```

**Clear Notifications**
```bash
POST /api/notifications/clear/:walletAddress
```

---

### Reviews

**Add Review**
```bash
POST /api/reviews/add
Content-Type: application/json

{
  "datasetId": 1,
  "walletAddress": "0x...",
  "rating": 5,
  "comment": "Great dataset!"
}
```

---

## Database Schema

### Users Table
- `id` - Primary key
- `username` - Unique username
- `email` - Email address
- `walletAddress` - Ethereum wallet
- `avatar` - Profile picture URL
- `totalEarnings` - Total earnings from sales
- `totalPurchased` - Total spent on purchases
- `rating` - User rating (1-5)
- `createdAt` - Registration timestamp

### Datasets Table
- `id` - Primary key
- `blockchainId` - Blockchain contract ID
- `sellerId` - Seller user ID
- `title` - Dataset title
- `description` - Full description
- `category` - Category (IoT, Finance, Healthcare, etc.)
- `price` - Price in currency
- `fileSize` - File size
- `format` - File format (CSV, JSON, etc.)
- `recordCount` - Number of records
- `ipfsHash` - IPFS file hash
- `purchaseCount` - Number of purchases
- `rating` - Average rating
- `createdAt` - Upload timestamp

### Purchases Table
- `id` - Primary key
- `blockchainPurchaseId` - Blockchain purchase ID
- `datasetId` - Dataset ID
- `buyerId` - Buyer user ID
- `sellerId` - Seller user ID
- `amount` - Purchase amount
- `platformFee` - Platform fee (10%)
- `sellerEarnings` - Amount seller receives
- `status` - Status (pending, completed, refunded)
- `createdAt` - Purchase timestamp

### Transactions Table
- `id` - Primary key
- `userId` - User ID
- `type` - Type (PAYMENT, WITHDRAWAL, REFUND, etc.)
- `amount` - Transaction amount
- `description` - Description
- `status` - Status
- `createdAt` - Timestamp

### Notifications Table
- `id` - Primary key
- `userId` - User ID
- `type` - Notification type
- `title` - Title
- `message` - Message content
- `isRead` - Read status
- `createdAt` - Timestamp

---

## Smart Contract Functions

### Core Functions

**registerData()**
- Register a new dataset on blockchain
- Returns: dataset ID

**buyData(uint256 datasetId)**
- Purchase a dataset
- Handles payment and fee distribution
- Emits: DatasetPurchased event

**withdrawEarnings()**
- Withdraw seller earnings to wallet
- Emits: Withdrawal event

**getEarnings(address seller)**
- Get seller's pending earnings
- Returns: amount in wei

### Features
- ✅ Multiple purchases per dataset (unlimited)
- ✅ Seller earnings tracking
- ✅ Platform fee (10% configurable)
- ✅ Purchase history
- ✅ Dataset metadata on-chain
- ✅ Event logging for all transactions

---

## File Upload Flow

1. **Frontend** → Selects file
2. **POST /api/datasets/upload-file** → Uploads to IPFS
3. **IPFS** ← Returns hash
4. **Frontend** → Creates dataset with IPFS hash
5. **POST /api/datasets/create** → Saves to database & blockchain
6. **Smart Contract** → Registers dataset

---

## Payment Flow

1. **User** → Selects dataset and clicks "Buy & Download"
2. **POST /api/purchases/initiate** → Reserves purchase slot
3. **User** → Selects payment method
4. **Payment Processing** → Deducts from user account
5. **POST /api/purchases/:id/complete** → Finalizes purchase
6. **Database** → Updates earnings, creates notifications
7. **Blockchain** → Records transaction (optional)
8. **Frontend** → Shows success with download link

---

## Troubleshooting

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

---

## Development Tips

### View Database
```bash
# Install sqlite3 CLI
npm install -g sqlite3

# Open database
sqlite3 backend/db/marketplace.db

# View tables
.tables
SELECT * FROM users;
SELECT * FROM datasets;
```

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

### Monitor Blockchain
Use Hardhat's built-in tools:
```bash
# In Hardhat terminal
> ethers.provider.getNetwork()
> ethers.provider.getBalance(yourAddress)
```

---

## Security Considerations

⚠️ **Production Checklist:**
- [ ] Use environment-specific configurations
- [ ] Enable HTTPS/TLS
- [ ] Add rate limiting
- [ ] Implement JWT authentication
- [ ] Validate all inputs server-side
- [ ] Use production blockchain (mainnet)
- [ ] Enable database backups
- [ ] Monitor and log transactions
- [ ] Add admin dashboard
- [ ] Implement KYC/AML procedures

---

## Testing

Run tests on smart contract:
```bash
npm run test
```

---

## Support

For issues or questions:
1. Check error logs in console
2. Verify environment variables
3. Ensure ports are available
4. Check blockchain network connection
5. Review API endpoint documentation above

Happy building! 🚀
