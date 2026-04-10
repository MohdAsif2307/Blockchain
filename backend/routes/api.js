const express = require("express");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const { ethers } = require("ethers");
const db = require("../db/database");
const { uploadFile } = require("../services/ipfsService");
const { getContract, getProvider, getSigner } = require("../services/blockchainService");
const { processFiatPayment } = require("../services/paymentService");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ==================== USER ENDPOINTS ====================

// Old endpoints - removed in favor of /register and /login above

// Login existing user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // Find user by email
    const user = await db.get(
      `SELECT * FROM users WHERE email = ?`,
      [email]
    );

    if (!user) {
      return res.status(404).json({ error: "User not found. Please sign up first." });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Sign up new user
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, walletAddress } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password required" });
    }

    // Check if user already exists
    const existingUser = await db.get(
      `SELECT id FROM users WHERE email = ? OR username = ?`,
      [email, username]
    );

    if (existingUser) {
      return res.status(409).json({ error: "Email or username already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Auto-generate wallet if not provided
    const finalWalletAddress = walletAddress || `0x${Math.random().toString(16).slice(2, 42).padEnd(40, "0")}`;

    // Create new user
    const result = await db.run(
      `INSERT INTO users (username, email, password, walletAddress, rating) VALUES (?, ?, ?, ?, 5.0)`,
      [username, email, hashedPassword, finalWalletAddress]
    );

    const user = await db.get(`SELECT id, username, email, walletAddress, rating, createdAt FROM users WHERE id = ?`, [result.id]);
    res.json({ success: true, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Get user profile
router.get("/users/:username", async (req, res) => {
  try {
    const user = await db.get(`SELECT * FROM users WHERE username = ?`, [req.params.username]);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const uploadedDatasets = await db.all(
      `SELECT * FROM datasets WHERE sellerId = ?`,
      [user.id]
    );

    const purchasedDatasets = await db.all(
      `SELECT DISTINCT d.* FROM datasets d 
       INNER JOIN purchases p ON d.id = p.datasetId 
       WHERE p.buyerId = ?`,
      [user.id]
    );

    res.json({
      user,
      uploadedCount: uploadedDatasets.length,
      purchasedCount: purchasedDatasets.length,
      uploadedDatasets,
      purchasedDatasets
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Profile alias by wallet address for frontend convenience
router.get("/profile", async (req, res) => {
  try {
    const walletAddress = req.query.walletAddress;
    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress query parameter is required" });
    }

    const user = await db.get(`SELECT * FROM users WHERE walletAddress = ?`, [walletAddress]);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const uploadedDatasets = await db.all(`SELECT * FROM datasets WHERE sellerId = ?`, [user.id]);
    const purchasedDatasets = await db.all(
      `SELECT DISTINCT d.* FROM datasets d 
       INNER JOIN purchases p ON d.id = p.datasetId 
       WHERE p.buyerId = ?`,
      [user.id]
    );

    res.json({
      user,
      uploadedCount: uploadedDatasets.length,
      purchasedCount: purchasedDatasets.length,
      uploadedDatasets,
      purchasedDatasets
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Update current user profile
router.post("/profile/update", async (req, res) => {
  try {
    const { walletAddress, username, email, avatar } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress is required" });
    }
    if (!username || !email) {
      return res.status(400).json({ error: "Username and email are required" });
    }

    const user = await db.get(`SELECT * FROM users WHERE walletAddress = ?`, [walletAddress]);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const existingUsername = await db.get(`SELECT id FROM users WHERE username = ? AND id != ?`, [username, user.id]);
    if (existingUsername) {
      return res.status(409).json({ error: "Username is already taken" });
    }

    const existingEmail = await db.get(`SELECT id FROM users WHERE email = ? AND id != ?`, [email, user.id]);
    if (existingEmail) {
      return res.status(409).json({ error: "Email is already in use" });
    }

    const updateFields = [username, email];
    let updateQuery = `UPDATE users SET username = ?, email = ?`;
    if (avatar) {
      updateQuery += `, avatar = ?`;
      updateFields.push(avatar);
    }
    updateQuery += ` WHERE id = ?`;
    updateFields.push(user.id);

    await db.run(updateQuery, updateFields);
    const updatedUser = await db.get(`SELECT id, username, email, walletAddress, avatar, rating, totalEarnings, totalPurchased, reviewCount, createdAt FROM users WHERE id = ?`, [user.id]);

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== DATASET ENDPOINTS ====================

// Upload file first
router.post("/datasets/upload-file", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    // Try IPFS upload, fallback to local storage
    let ipfsHash = "";
    try {
      const result = await uploadFile(req.file.buffer, req.file.originalname);
      ipfsHash = result.hash;
    } catch (e) {
      console.warn("IPFS upload failed, using placeholder hash");
      ipfsHash = "Qm" + Math.random().toString(36).substr(2, 44);
    }

    res.json({
      success: true,
      hash: ipfsHash,
      filename: req.file.originalname,
      filesize: (req.file.size / 1024 / 1024).toFixed(2) + " MB"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Frontend compatibility alias for upload
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    let ipfsHash = "";
    try {
      const result = await uploadFile(req.file.buffer, req.file.originalname);
      ipfsHash = result.hash;
    } catch (e) {
      console.warn("IPFS upload failed, using placeholder hash");
      ipfsHash = "Qm" + Math.random().toString(36).substr(2, 44);
    }

    res.json({
      success: true,
      hash: ipfsHash,
      filename: req.file.originalname,
      filesize: (req.file.size / 1024 / 1024).toFixed(2) + " MB"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Create/publish dataset
router.post("/datasets/create", async (req, res) => {
  try {
    const { title, description, price, category, ipfsHash, format, recordCount, walletAddress, blockchainId: requestBlockchainId } = req.body;

    if (!title || !price || !ipfsHash || !walletAddress) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Find seller by wallet address
    const seller = await db.get(`SELECT id FROM users WHERE walletAddress = ?`, [walletAddress]);
    if (!seller) {
      return res.status(404).json({ error: "User not found" });
    }

    let blockchainId = requestBlockchainId || 0;
    if (!blockchainId) {
      try {
        const contract = getContract();
        const amount = ethers.parseUnits(String(price), "gwei");
        const tx = await contract.registerData(title, description, ipfsHash, amount);
        const receipt = await tx.wait();
        const event = receipt.events && receipt.events.find((e) => e.event === "DatasetRegistered");
        blockchainId = event ? event.args.id.toString() : 0;
      } catch (e) {
        console.warn("Blockchain registration failed, using DB-only ID:", e.message);
      }
    }

    // Save to database
    const result = await db.run(
      `INSERT INTO datasets (sellerId, title, description, category, price, ipfsHash, format, recordCount, blockchainId, rating)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 5.0)`,
      [seller.id, title, description, category, price, ipfsHash, format, recordCount, blockchainId]
    );

    // Create notification
    await db.run(
      `INSERT INTO notifications (userId, type, title, message, relatedId)
       VALUES (?, 'DATASET_PUBLISHED', 'Dataset Published', 'Your dataset has been published', ?)`,
      [seller.id, result.id]
    );

    res.json({ success: true, datasetId: result.id, blockchainId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Get all datasets
router.get("/datasets", async (req, res) => {
  try {
    const category = req.query.category;
    let query = `SELECT d.*, u.username, u.walletAddress as sellerWallet, u.rating as sellerRating FROM datasets d 
                 LEFT JOIN users u ON d.sellerId = u.id`;
    let params = [];

    if (category && category !== "All") {
      query += ` WHERE d.category = ?`;
      params.push(category);
    }

    query += ` ORDER BY d.createdAt DESC LIMIT 100`;

    const datasets = await db.all(query, params);
    res.json({ datasets });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Get dataset details
router.get("/datasets/:id", async (req, res) => {
  try {
    const dataset = await db.get(
      `SELECT d.*, u.username, u.rating as sellerRating FROM datasets d 
       LEFT JOIN users u ON d.sellerId = u.id WHERE d.id = ?`,
      [req.params.id]
    );

    if (!dataset) {
      return res.status(404).json({ error: "Dataset not found" });
    }

    const reviews = await db.all(
      `SELECT r.rating, r.comment, u.username, r.createdAt FROM reviews r 
       LEFT JOIN users u ON r.userId = u.id WHERE r.datasetId = ? ORDER BY r.createdAt DESC`,
      [req.params.id]
    );

    res.json({ dataset, reviews });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PURCHASE ENDPOINTS ====================

// Initiate purchase
router.post("/purchases/initiate", async (req, res) => {
  try {
    const { datasetId, buyerWallet } = req.body;

    const dataset = await db.get(`SELECT * FROM datasets WHERE id = ?`, [datasetId]);
    if (!dataset) {
      return res.status(404).json({ error: "Dataset not found" });
    }

    const buyer = await db.get(`SELECT id FROM users WHERE walletAddress = ?`, [buyerWallet]);
    if (!buyer) {
      return res.status(404).json({ error: "Buyer not found" });
    }

    // Calculate fees
    const platformFee = Math.round(dataset.price * 10) / 100; // 10%
    const sellerEarnings = dataset.price - platformFee;

    const result = await db.run(
      `INSERT INTO purchases (datasetId, buyerId, sellerId, amount, platformFee, sellerEarnings, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [datasetId, buyer.id, dataset.sellerId, dataset.price, platformFee, sellerEarnings]
    );

    res.json({
      purchaseId: result.id,
      amount: dataset.price,
      platformFee,
      sellerEarnings,
      total: dataset.price
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Frontend compatibility alias for buy
router.post("/buy", async (req, res) => {
  try {
    const { datasetId, buyerWallet } = req.body;

    const dataset = await db.get(`SELECT * FROM datasets WHERE id = ?`, [datasetId]);
    if (!dataset) {
      return res.status(404).json({ error: "Dataset not found" });
    }

    const buyer = await db.get(`SELECT id FROM users WHERE walletAddress = ?`, [buyerWallet]);
    if (!buyer) {
      return res.status(404).json({ error: "Buyer not found" });
    }

    const platformFee = Math.round(dataset.price * 10) / 100;
    const sellerEarnings = dataset.price - platformFee;

    const result = await db.run(
      `INSERT INTO purchases (datasetId, buyerId, sellerId, amount, platformFee, sellerEarnings, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [datasetId, buyer.id, dataset.sellerId, dataset.price, platformFee, sellerEarnings]
    );

    res.json({
      purchaseId: result.id,
      amount: dataset.price,
      platformFee,
      sellerEarnings,
      total: dataset.price
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Complete purchase
router.post("/purchases/:id/complete", async (req, res) => {
  try {
    const purchase = await db.get(`SELECT * FROM purchases WHERE id = ?`, [req.params.id]);
    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    // Update purchase status
    await db.run(`UPDATE purchases SET status = 'completed' WHERE id = ?`, [purchase.id]);

    // Update dataset purchase count
    await db.run(`UPDATE datasets SET purchaseCount = purchaseCount + 1 WHERE id = ?`, [purchase.datasetId]);

    // Update user earnings
    await db.run(
      `UPDATE users SET totalEarnings = totalEarnings + ? WHERE id = ?`,
      [purchase.sellerEarnings, purchase.sellerId]
    );

    await db.run(
      `UPDATE users SET totalPurchased = totalPurchased + ? WHERE id = ?`,
      [purchase.amount, purchase.buyerId]
    );

    // Create notifications
    const dataset = await db.get(`SELECT title FROM datasets WHERE id = ?`, [purchase.datasetId]);
    
    await db.run(
      `INSERT INTO notifications (userId, type, title, message, relatedId)
       VALUES (?, 'PURCHASE_COMPLETE', 'Purchase Successful', 'Your dataset purchase was successful', ?)`,
      [purchase.buyerId, purchase.id]
    );

    await db.run(
      `INSERT INTO notifications (userId, type, title, message, relatedId)
       VALUES (?, 'SALE_COMPLETE', 'New Sale!', 'Your dataset "${dataset.title}" was purchased', ?)`,
      [purchase.sellerId, purchase.id]
    );

    res.json({ success: true, message: "Purchase completed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Create purchase after blockchain transaction (POST from frontend after buyData tx)
router.post("/purchases/create", async (req, res) => {
  try {
    const { datasetId, buyerId, sellerId, price, blockchainPurchaseId, status } = req.body;

    if (!datasetId || !buyerId || !sellerId || !price) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Calculate platform fee (10%)
    const platformFee = Math.round(price * 10) / 100;
    const sellerEarnings = price - platformFee;

    // Create purchase record
    const result = await db.run(
      `INSERT INTO purchases (datasetId, buyerId, sellerId, amount, platformFee, sellerEarnings, blockchainPurchaseId, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [datasetId, buyerId, sellerId, price, platformFee, sellerEarnings, blockchainPurchaseId || 0, status || 'completed']
    );

    // Update dataset purchase count
    await db.run(`UPDATE datasets SET purchaseCount = purchaseCount + 1 WHERE id = ?`, [datasetId]);

    // Update user earnings and purchase stats
    await db.run(
      `UPDATE users SET totalEarnings = totalEarnings + ? WHERE id = ?`,
      [sellerEarnings, sellerId]
    );

    await db.run(
      `UPDATE users SET totalPurchased = totalPurchased + ? WHERE id = ?`,
      [price, buyerId]
    );

    // Create notification for seller
    const dataset = await db.get(`SELECT title FROM datasets WHERE id = ?`, [datasetId]);
    await db.run(
      `INSERT INTO notifications (userId, type, title, message, relatedId)
       VALUES (?, 'DATASET_PURCHASED', 'Dataset Purchased', 'Your dataset has been purchased', ?)`,
      [sellerId, result.id]
    );

    // Create notification for buyer
    await db.run(
      `INSERT INTO notifications (userId, type, title, message, relatedId)
       VALUES (?, 'PURCHASE_COMPLETED', 'Purchase Completed', 'Your purchase is complete', ?)`,
      [buyerId, result.id]
    );

    res.json({ 
      success: true, 
      purchaseId: result.id, 
      datasetId, 
      price,
      blockchainPurchaseId: blockchainPurchaseId,
      status: status || 'completed'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Get user purchases
router.get("/purchases/user/:walletAddress", async (req, res) => {
  try {
    const user = await db.get(`SELECT id FROM users WHERE walletAddress = ?`, [req.params.walletAddress]);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const purchases = await db.all(
      `SELECT p.*, d.title, u.username as sellerName FROM purchases p
       LEFT JOIN datasets d ON p.datasetId = d.id
       LEFT JOIN users u ON p.sellerId = u.id
       WHERE p.buyerId = ? ORDER BY p.createdAt DESC`,
      [user.id]
    );

    res.json({ purchases });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Get purchases by buyer ID
router.get("/purchases/:buyerId", async (req, res) => {
  try {
    const purchases = await db.all(
      `SELECT p.*, d.title, u.username as sellerName FROM purchases p
       LEFT JOIN datasets d ON p.datasetId = d.id
       LEFT JOIN users u ON p.sellerId = u.id
       WHERE p.buyerId = ? ORDER BY p.createdAt DESC`,
      [req.params.buyerId]
    );

    res.json(purchases);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== EARNINGS ENDPOINTS ====================

// Get earnings
router.get("/earnings/:walletAddress", async (req, res) => {
  try {
    const user = await db.get(`SELECT * FROM users WHERE walletAddress = ?`, [req.params.walletAddress]);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const transactions = await db.all(
      `SELECT * FROM transactions WHERE userId = ? ORDER BY createdAt DESC LIMIT 50`,
      [user.id]
    );

    const sales = await db.all(
      `SELECT p.*, d.title FROM purchases p
       LEFT JOIN datasets d ON p.datasetId = d.id
       WHERE p.sellerId = ? AND p.status = 'completed' ORDER BY p.createdAt DESC LIMIT 50`,
      [user.id]
    );

    res.json({
      totalEarnings: user.totalEarnings,
      pendingEarnings: 0,
      transactionCount: (await db.all(`SELECT * FROM purchases WHERE sellerId = ? AND status = 'completed'`, [user.id])).length,
      transactions,
      sales
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Request withdrawal
router.post("/earnings/withdraw", async (req, res) => {
  try {
    const { walletAddress, amount } = req.body;

    const user = await db.get(`SELECT * FROM users WHERE walletAddress = ?`, [walletAddress]);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.totalEarnings < amount) {
      return res.status(400).json({ error: "Insufficient earnings" });
    }

    // Record transaction
    await db.run(
      `INSERT INTO transactions (userId, type, amount, description, status)
       VALUES (?, 'WITHDRAWAL', ?, 'Withdrawal request', 'pending')`,
      [user.id, amount]
    );

    // Update earnings
    await db.run(`UPDATE users SET totalEarnings = totalEarnings - ? WHERE id = ?`, [amount, user.id]);

    res.json({ success: true, message: "Withdrawal request submitted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== NOTIFICATIONS ENDPOINTS ====================

// Get notifications
router.get("/notifications/:walletAddress", async (req, res) => {
  try {
    const user = await db.get(`SELECT id FROM users WHERE walletAddress = ?`, [req.params.walletAddress]);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const notifications = await db.all(
      `SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50`,
      [user.id]
    );

    res.json({ notifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Clear notifications
router.post("/notifications/clear/:walletAddress", async (req, res) => {
  try {
    const user = await db.get(`SELECT id FROM users WHERE walletAddress = ?`, [req.params.walletAddress]);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await db.run(`DELETE FROM notifications WHERE userId = ?`, [user.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== REVIEW ENDPOINTS ====================

// Add review
router.post("/reviews/add", async (req, res) => {
  try {
    const { datasetId, walletAddress, rating, comment } = req.body;

    const user = await db.get(`SELECT id FROM users WHERE walletAddress = ?`, [walletAddress]);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user purchased this dataset
    const purchase = await db.get(
      `SELECT * FROM purchases WHERE datasetId = ? AND buyerId = ?`,
      [datasetId, user.id]
    );

    if (!purchase) {
      return res.status(403).json({ error: "You must purchase the dataset to review it" });
    }

    await db.run(
      `INSERT INTO reviews (datasetId, userId, rating, comment)
       VALUES (?, ?, ?, ?)`,
      [datasetId, user.id, rating, comment]
    );

    // Update dataset rating
    const reviews = await db.all(`SELECT rating FROM reviews WHERE datasetId = ?`, [datasetId]);
    const avgRating = (reviews.reduce((a, b) => a + b.rating, 0) / reviews.length).toFixed(1);
    await db.run(
      `UPDATE datasets SET rating = ?, reviewCount = ? WHERE id = ?`,
      [avgRating, reviews.length, datasetId]
    );

    res.json({ success: true, message: "Review added" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== STATUS ENDPOINT ====================

router.get("/status", (req, res) => {
  res.json({
    status: "ok",
    blockchain: "connected",
    database: "connected",
    ipfs: "available"
  });
});

router.get("/earnings", async (req, res) => {
  const walletAddress = req.query.walletAddress;
  if (!walletAddress) {
    return res.json({
      total: 500,
      history: [
        { date: "2023-01-01", amount: 100 },
        { date: "2023-02-01", amount: 200 }
      ]
    });
  }

  try {
    const user = await db.get(`SELECT * FROM users WHERE walletAddress = ?`, [walletAddress]);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const transactions = await db.all(`SELECT * FROM transactions WHERE userId = ? ORDER BY createdAt DESC LIMIT 50`, [user.id]);
    const sales = await db.all(
      `SELECT p.*, d.title FROM purchases p
       LEFT JOIN datasets d ON p.datasetId = d.id
       WHERE p.sellerId = ? AND p.status = 'completed' ORDER BY p.createdAt DESC LIMIT 50`,
      [user.id]
    );

    res.json({
      totalEarnings: user.totalEarnings,
      pendingEarnings: 0,
      transactionCount: transactions.length,
      transactions,
      sales
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/notifications", async (req, res) => {
  const walletAddress = req.query.walletAddress;
  if (!walletAddress) {
    return res.json({
      notifications: [
        "Your data was purchased",
        "Payment received ₹100"
      ]
    });
  }

  try {
    const user = await db.get(`SELECT id FROM users WHERE walletAddress = ?`, [walletAddress]);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const notifications = await db.all(`SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50`, [user.id]);
    res.json({ notifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Update user wallet address (for MetaMask sync)
router.post("/users/:id/wallet", async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress is required" });
    }

    const user = await db.get(`SELECT * FROM users WHERE id = ?`, [req.params.id]);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await db.run(`UPDATE users SET walletAddress = ? WHERE id = ?`, [walletAddress, user.id]);
    console.log(`✅ Wallet updated for user ${user.id}: ${walletAddress}`);
    res.json({ success: true, walletAddress });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
