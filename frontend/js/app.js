import { uploadToIPFS } from "./ipfs.js";
import { initializeContract, registerDataset, buyDataset } from "./contract.js";
import {
  fetchDatasetsFromBackend,
  loginUser,
  signupUser,
  createDatasetOnBackend,
  initiatePurchase,
  completePurchase,
  fetchProfile,
  updateProfile,
  uploadAvatar,
  fetchEarnings,
  fetchNotifications
} from "./api.js";
import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.9.0/dist/ethers.min.js";

const appState = {
  currentUser: null,
  currentDataset: null,
  datasets: [],
  notifications: [],
  earnings: null,
  currentAccount: null
};

function showLoading(show = true) {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) {
    overlay.style.display = show ? "flex" : "none";
  }
}

function navigateTo(screenId) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active");
  });

  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add("active");
    window.scrollTo(0, 0);
  }

  if (screenId === "dashboard") {
    loadDashboard();
  }
  if (screenId === "profile") {
    loadProfile();
  }
  if (screenId === "earnings") {
    loadEarnings();
  }
  if (screenId === "notifications") {
    loadNotifications();
  }
}

function saveCurrentUser() {
  if (appState.currentUser) {
    localStorage.setItem("dataMarketplaceUser", JSON.stringify(appState.currentUser));
  }
}

function loadSavedUser() {
  const saved = localStorage.getItem("dataMarketplaceUser");
  if (saved) {
    try {
      appState.currentUser = JSON.parse(saved);
    } catch (err) {
      console.warn("Invalid saved user data", err);
    }
  }
}

async function connectWallet() {
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts && accounts.length) {
        const oldWallet = appState.currentUser?.walletAddress;
        appState.currentAccount = accounts[0];
        if (!appState.currentUser) {
          appState.currentUser = { walletAddress: accounts[0] };
        } else {
          appState.currentUser.walletAddress = accounts[0];
        }
        localStorage.setItem("walletAddress", accounts[0]);

        // Sync MetaMask wallet address to backend if it changed
        if (oldWallet && oldWallet !== accounts[0] && appState.currentUser.username) {
          try {
            console.log("🔄 Syncing MetaMask wallet address to backend...");
            await updateProfile(
              oldWallet,
              appState.currentUser.username,
              appState.currentUser.email || "",
              appState.currentUser.avatar || ""
            );
            // Now update the backend with the new wallet address
            await fetch(`/api/users/${appState.currentUser.id}/wallet`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ walletAddress: accounts[0] })
            });
            console.log("✅ Wallet address synced to backend");
          } catch (syncErr) {
            console.warn("⚠️ Wallet sync failed, will use DB address:", syncErr.message);
            // Revert to old wallet so API calls work with existing DB record
            appState.currentUser.walletAddress = oldWallet;
            appState.currentAccount = oldWallet;
          }
        }
      }
      if (!window.contract) {
        await initializeContract();
      }
    } catch (err) {
      console.warn("Wallet connect failed", err);
    }
  } else {
    // No MetaMask - use the wallet address from the backend user record
    if (appState.currentUser && appState.currentUser.walletAddress) {
      appState.currentAccount = appState.currentUser.walletAddress;
      localStorage.setItem("walletAddress", appState.currentUser.walletAddress);
    } else {
      const fallback = localStorage.getItem("walletAddress");
      if (fallback) {
        appState.currentAccount = fallback;
        if (appState.currentUser) {
          appState.currentUser.walletAddress = fallback;
        }
      } else {
        const generated = `0x${Math.random().toString(16).slice(2, 42).padEnd(40, "0")}`;
        appState.currentAccount = generated;
        localStorage.setItem("walletAddress", generated);
        if (!appState.currentUser) {
          appState.currentUser = { walletAddress: generated };
        }
      }
    }
  }
}

function getCurrentWalletAddress() {
  return appState.currentUser?.walletAddress || appState.currentAccount;
}

// ==================== METAMASK UI & NETWORK ====================

function truncateAddress(addr) {
  if (!addr) return "";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function updateWalletUI() {
  const badge = document.getElementById("walletStatusBadge");
  const addrDisplay = document.getElementById("walletAddressDisplay");
  const metamaskPaymentAddr = document.getElementById("metamaskPaymentAddr");

  if (window.ethereum && appState.currentAccount) {
    if (badge) {
      badge.classList.remove("disconnected");
      badge.classList.add("connected");
      badge.title = appState.currentAccount;
    }
    if (addrDisplay) {
      addrDisplay.textContent = "🦊 " + truncateAddress(appState.currentAccount);
    }
    if (metamaskPaymentAddr) {
      metamaskPaymentAddr.textContent = "(" + truncateAddress(appState.currentAccount) + ")";
    }
  } else {
    if (badge) {
      badge.classList.remove("connected");
      badge.classList.add("disconnected");
    }
    if (addrDisplay) {
      addrDisplay.textContent = "🦊 Connect Wallet";
    }
    if (metamaskPaymentAddr) {
      metamaskPaymentAddr.textContent = "";
    }
  }
}

async function ensureHardhatNetwork() {
  if (!window.ethereum) return;
  
  const chainIdHex = "0x" + (31337).toString(16); // 0x7a69
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }]
    });
    console.log("✅ Switched to Hardhat network");
  } catch (switchErr) {
    // Chain not added yet — add it
    if (switchErr.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: chainIdHex,
            chainName: "Hardhat Local",
            rpcUrls: ["http://127.0.0.1:8545"],
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }
          }]
        });
        console.log("✅ Hardhat network added to MetaMask");
      } catch (addErr) {
        console.error("❌ Failed to add Hardhat network:", addErr);
      }
    } else {
      console.warn("⚠️ Network switch failed:", switchErr.message);
    }
  }
}

async function handleMetaMaskLogin() {
  if (!window.ethereum) {
    alert("❌ MetaMask is not installed. Please install MetaMask extension and try again.");
    return;
  }

  try {
    showLoading(true);
    console.log("🦊 MetaMask login starting...");

    // Switch to Hardhat network first
    await ensureHardhatNetwork();

    // Request accounts
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    if (!accounts || !accounts.length) {
      alert("❌ No MetaMask accounts found. Please unlock MetaMask.");
      return;
    }

    const walletAddress = accounts[0];
    console.log("🦊 MetaMask connected:", walletAddress);
    appState.currentAccount = walletAddress;

    // Try to find existing user by wallet
    try {
      const profileResp = await fetch(`/api/profile?walletAddress=${encodeURIComponent(walletAddress)}`);
      if (profileResp.ok) {
        const profileData = await profileResp.json();
        appState.currentUser = profileData.user;
        console.log("✅ Existing user found:", appState.currentUser.username);
      } else {
        // No user — auto-register with MetaMask wallet
        const username = "user_" + walletAddress.slice(2, 8);
        const result = await signupUser(username, username + "@metamask.local", "metamask_" + walletAddress.slice(0, 10));
        appState.currentUser = result.user;
        // Update wallet address in backend
        await fetch(`/api/users/${appState.currentUser.id}/wallet`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress })
        });
        appState.currentUser.walletAddress = walletAddress;
        console.log("✅ New MetaMask user created:", username);
      }
    } catch (err) {
      console.error("User lookup/create failed:", err);
      appState.currentUser = { walletAddress, username: truncateAddress(walletAddress) };
    }

    saveCurrentUser();
    await initializeContract();
    updateWalletUI();

    console.log("📊 Loading datasets...");
    await loadDatasets();

    alert("✅ MetaMask connected!\nWallet: " + truncateAddress(walletAddress));
    navigateTo("dashboard");
  } catch (error) {
    console.error("❌ MetaMask login error:", error);
    if (error.code === 4001) {
      alert("❌ MetaMask connection was rejected. Please approve the connection.");
    } else {
      alert("❌ MetaMask login failed:\n" + (error.message || error.toString()));
    }
  } finally {
    showLoading(false);
  }
}

async function connectMetaMaskManual() {
  if (!window.ethereum) {
    alert("❌ MetaMask is not installed.\n\nPlease install MetaMask browser extension from https://metamask.io");
    return;
  }

  try {
    await ensureHardhatNetwork();
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    if (accounts && accounts.length) {
      appState.currentAccount = accounts[0];
      if (appState.currentUser) {
        const oldWallet = appState.currentUser.walletAddress;
        appState.currentUser.walletAddress = accounts[0];
        // Sync to backend
        if (appState.currentUser.id && oldWallet !== accounts[0]) {
          await fetch(`/api/users/${appState.currentUser.id}/wallet`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletAddress: accounts[0] })
          });
        }
        saveCurrentUser();
      }
      localStorage.setItem("walletAddress", accounts[0]);
      await initializeContract();
      updateWalletUI();
      alert("✅ MetaMask connected!\nWallet: " + truncateAddress(accounts[0]));
    }
  } catch (err) {
    if (err.code === 4001) {
      alert("MetaMask connection rejected.");
    } else {
      console.error("MetaMask connect error:", err);
      alert("Failed to connect MetaMask: " + err.message);
    }
  }
}


async function handleLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!email || !password) {
    alert("❌ Please enter both email and password.");
    return;
  }

  try {
    showLoading(true);
    console.log("🔄 Attempting login...");
    
    const result = await loginUser(email, password);
    console.log("✅ Login successful");
    
    appState.currentUser = result.user;
    
    await connectWallet();
    
    saveCurrentUser();
    console.log("💾 User saved to localStorage");
    
    console.log("📊 Loading datasets...");
    await loadDatasets();
    console.log("✅ Datasets loaded");
    
    // Clear form
    document.getElementById("loginEmail").value = "";
    document.getElementById("loginPassword").value = "";
    
    alert("✅ Login successful! Welcome back!");
    navigateTo("dashboard");
  } catch (error) {
    console.error("❌ Login error:", error);
    alert("❌ Login failed:\n" + (error.message || error.toString()));
  } finally {
    showLoading(false);
  }
}

async function handleSignup() {
  const username = document.getElementById("signupUsername").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value.trim();
  const confirmPassword = document.getElementById("signupConfirmPassword").value.trim();

  // Validation
  if (!username) {
    alert("❌ Please enter a username.");
    return;
  }
  if (!email) {
    alert("❌ Please enter your email address.");
    return;
  }
  if (!password) {
    alert("❌ Please enter a password.");
    return;
  }
  if (password.length < 6) {
    alert("❌ Password must be at least 6 characters long.");
    return;
  }
  if (password !== confirmPassword) {
    alert("❌ Passwords do not match.");
    return;
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert("❌ Please enter a valid email address.");
    return;
  }

  try {
    showLoading(true);
    console.log("🔄 Processing signup...");
    
    const result = await signupUser(username, email, password);
    console.log("✅ Signup successful");
    
    appState.currentUser = result.user;
    // Initialize wallet balance for new user
    if (!appState.currentUser.walletBalance) {
      appState.currentUser.walletBalance = 5000; // Initial wallet balance for new users
    }
    
    await connectWallet();
    
    saveCurrentUser();
    console.log("💾 User saved to localStorage");
    
    console.log("📊 Loading datasets...");
    await loadDatasets();
    console.log("✅ Datasets loaded");
    
    // Clear form
    document.getElementById("signupUsername").value = "";
    document.getElementById("signupEmail").value = "";
    document.getElementById("signupPassword").value = "";
    document.getElementById("signupConfirmPassword").value = "";
    
    alert("✅ Account created successfully! Welcome to Data Marketplace! 🎉");
    navigateTo("dashboard");
  } catch (error) {
    console.error("❌ Signup error:", error);
    alert("❌ Signup failed:\n" + (error.message || error.toString()));
  } finally {
    showLoading(false);
  }
}

async function completeUsername() {
  const email = document.getElementById("emailInput").value.trim();
  const username = document.getElementById("usernameInput").value.trim();

  console.log("📝 Registration attempt. Email:", email, "Username:", username);

  if (!email) {
    alert("Please enter your email address.");
    return;
  }
  if (!username) {
    alert("Please enter a username.");
    return;
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert("Please enter a valid email address.");
    return;
  }

  const walletAddress = getCurrentWalletAddress() || `0x${Math.random().toString(16).slice(2, 42).padEnd(40, "0")}`;
  console.log("🔑 Wallet Address:", walletAddress);

  try {
    showLoading(true);
    console.log("🔄 Calling loginUser API...");
    const result = await loginUser(email, walletAddress, username);
    console.log("✅ Login successful. User data:", result.user);
    
    appState.currentUser = result.user;
    saveCurrentUser();
    console.log("💾 User saved to localStorage");
    
    console.log("📊 Loading datasets...");
    await loadDatasets();
    console.log("✅ Datasets loaded");
    
    navigateTo("dashboard");
  } catch (error) {
    console.error("❌ Registration error:", error);
    alert(error.message || "Unable to create account.");
  } finally {
    showLoading(false);
  }
}

function logout() {
  if (confirm("Are you sure you want to logout?")) {
    appState.currentUser = null;
    localStorage.removeItem("dataMarketplaceUser");
    navigateTo("landing");
  }
}

function renderDatasets(datasets) {
  const datasetList = document.getElementById("datasetList");
  if (!datasetList) return;

  datasetList.innerHTML = datasets.map((dataset) => `
    <div class="dataset-card" onclick="viewDatasetDetails(${dataset.id})">
      <div class="dataset-card-image">📊</div>
      <div class="dataset-card-content">
        <h3>${dataset.title}</h3>
        <p><strong>Category:</strong> ${dataset.category || "General"}</p>
        <p><strong>Seller:</strong> ${dataset.username || "Unknown"}</p>
        <div class="dataset-card-footer">
          <span class="price">₹${dataset.price}</span>
          <span class="rating">⭐ ${dataset.rating || 0}</span>
        </div>
      </div>
    </div>
  `).join("");
}

function loadDashboard() {
  if (!appState.currentUser) {
    navigateTo("landing");
    return;
  }

  const dashboardUsername = document.getElementById("dashboardUsername");
  const totalEarnings = document.getElementById("totalEarnings");
  if (dashboardUsername) {
    dashboardUsername.textContent = appState.currentUser.username || appState.currentUser.walletAddress || "User";
  }
  if (totalEarnings) {
    totalEarnings.textContent = appState.currentUser.totalEarnings || 0;
  }
  renderDatasets(appState.datasets);
}

async function loadDatasets() {
  try {
    showLoading(true);
    const data = await fetchDatasetsFromBackend();
    appState.datasets = data.datasets || [];
    renderDatasets(appState.datasets);
  } catch (error) {
    console.error(error);
    alert(error.message || "Unable to load datasets.");
  } finally {
    showLoading(false);
  }
}

async function viewDatasetDetails(datasetId) {
  const dataset = appState.datasets.find((d) => d.id === datasetId);
  if (!dataset) {
    alert("Dataset not found.");
    return;
  }

  appState.currentDataset = dataset;
  populateDatasetDetails();
  navigateTo("dataset-details");
}

function populateDatasetDetails() {
  const dataset = appState.currentDataset;
  if (!dataset) return;

  document.getElementById("detail-title").textContent = dataset.title;
  document.getElementById("detail-seller").textContent = dataset.username || "Unknown";
  document.getElementById("detail-rating").textContent = dataset.rating || "0";
  document.getElementById("detail-reviews").textContent = dataset.reviewCount || "0";
  document.getElementById("detail-description").textContent = dataset.description || "No description available.";
  document.getElementById("detail-size").textContent = dataset.fileSize || "N/A";
  document.getElementById("detail-format").textContent = dataset.format || "N/A";
  document.getElementById("detail-records").textContent = dataset.recordCount || "N/A";
  document.getElementById("detail-price").textContent = dataset.price;
  document.getElementById("paymentPrice").textContent = dataset.price;
  const tax = Math.round(dataset.price * 0.18);
  const total = dataset.price + tax;
  document.getElementById("paymentTax").textContent = tax;
  document.getElementById("paymentTotal").textContent = total;
  document.getElementById("paymentBtnAmount").textContent = total;
  document.getElementById("downloadTitle").textContent = dataset.title;
  document.getElementById("downloadDescription").textContent = dataset.description || "Your dataset is ready to download.";

  // Hide buy button if current user is the seller
  const buyButton = document.getElementById("detail-buy-btn");
  if (buyButton && appState.currentUser && dataset.sellerWallet === appState.currentUser.walletAddress) {
    buyButton.style.display = "none";
  } else if (buyButton) {
    buyButton.style.display = "block";
  }
}

function filterByCategory(category) {
  const filtered = category === "All" ? appState.datasets : appState.datasets.filter((d) => d.category === category);
  renderDatasets(filtered);
}

async function handlePurchase() {
  if (!appState.currentUser || !appState.currentUser.walletAddress) {
    alert("Please login before purchasing.");
    return;
  }
  if (!appState.currentDataset) {
    alert("Select a dataset first.");
    return;
  }

  // Prevent users from buying their own datasets
  if (appState.currentDataset.sellerWallet === appState.currentUser.walletAddress) {
    alert("You cannot purchase your own dataset.");
    return;
  }

  const paymentMethod = appState.selectedPaymentMethod || "metamask";

  try {
    showLoading(true);
    console.log("Processing payment via:", paymentMethod);

    const purchase = await initiatePurchase(appState.currentDataset.id, appState.currentUser.walletAddress);

    // Only attempt blockchain purchase if dataset has blockchain ID
    const blockchainId = appState.currentDataset.blockchainId;
    if (blockchainId && blockchainId > 0) {
      // MetaMask payment — use MetaMask signer
      if (paymentMethod === "metamask" && window.ethereum) {
        console.log("🦊 Processing via MetaMask...");
        await ensureHardhatNetwork();
        if (!window.contract) await initializeContract();
        const priceValue = appState.currentDataset.price || 0;
        const priceWei = ethers.parseUnits(String(priceValue), "ether");
        console.log("🦊 MetaMask will prompt for transaction approval...");
        await buyDataset(blockchainId, priceWei);
        console.log("✅ MetaMask transaction confirmed!");
      } else {
        // Fallback: use Hardhat signer for non-MetaMask payments
        if (!window.contract) await initializeContract();
        const priceValue = appState.currentDataset.price || 0;
        const priceWei = ethers.parseUnits(String(priceValue), "ether");
        await buyDataset(blockchainId, priceWei);
        console.log("✅ Blockchain transaction completed via", paymentMethod);
      }

      // If wallet payment was selected, deduct from wallet balance
      if (paymentMethod === "wallet") {
        const totalAmount = appState.currentDataset.price + Math.round(appState.currentDataset.price * 0.18);
        appState.currentUser.walletBalance = (appState.currentUser.walletBalance || 0) - totalAmount;
        saveCurrentUser();
        console.log("Wallet balance deducted. New balance:", appState.currentUser.walletBalance);
      }
    } else {
      console.warn("Skipping blockchain purchase - dataset not registered on blockchain");
    }

    await completePurchase(purchase.purchaseId);
    alert("✅ Purchase completed successfully!");
    await loadDatasets();
    navigateTo("download");
  } catch (error) {
    console.error(error);
    if (error.code === "ACTION_REJECTED" || error.code === 4001) {
      alert("❌ Transaction rejected in MetaMask.\nPlease approve the transaction to complete your purchase.");
    } else {
      alert(error.message || "Purchase failed.");
    }
  } finally {
    showLoading(false);

  }
}

function processPayment() {
  // Get selected payment method
  const selectedPayment = document.querySelector('input[name="payment"]:checked');
  if (!selectedPayment) {
    alert("Please select a payment method.");
    return;
  }

  const paymentMethod = selectedPayment.value;
  console.log('Selected payment method:', paymentMethod);

  // For card payment, ensure form is visible and validated
  if (paymentMethod === 'card') {
    const cardDetails = document.getElementById('cardDetails');
    if (cardDetails) {
      cardDetails.style.display = 'block';
      cardDetails.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // Validate payment method
  if (!validatePaymentMethod(paymentMethod)) {
    return;
  }

  // Store selected payment method for processing
  appState.selectedPaymentMethod = paymentMethod;

  // Proceed with purchase
  handlePurchase();
}

function validatePaymentMethod(method) {
  const total = parseInt(document.getElementById('paymentTotal')?.textContent || '0');
  const currentUser = appState.currentUser || JSON.parse(localStorage.getItem('dataMarketplaceUser') || '{}');

  switch (method) {
    case 'metamask':
      if (!window.ethereum) {
        alert('❌ MetaMask is not installed. Please install MetaMask extension or choose another payment method.');
        return false;
      }
      if (!appState.currentAccount) {
        alert('❌ MetaMask is not connected. Please connect your wallet first.');
        return false;
      }
      return true;

    case 'card':
      const cardNumber = document.getElementById('cardNumber')?.value?.trim();
      const cardExpiry = document.getElementById('cardExpiry')?.value?.trim();
      const cardCVV = document.getElementById('cardCVV')?.value?.trim();
      const cardName = document.getElementById('cardName')?.value?.trim();

      if (!cardNumber || !cardExpiry || !cardCVV || !cardName) {
        alert('Please fill in all card details.');
        return false;
      }

      // Basic validation
      if (cardNumber.replace(/\s/g, '').length < 13) {
        alert('Please enter a valid card number.');
        return false;
      }

      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        alert('Please enter expiry date in MM/YY format.');
        return false;
      }

      if (cardCVV.length < 3) {
        alert('Please enter a valid CVV.');
        return false;
      }

      return true;

    case 'wallet':
      const walletBalance = currentUser.walletBalance || 0;
      if (walletBalance < total) {
        alert(`Insufficient wallet balance. You have ₹${walletBalance} but need ₹${total}. Please choose another payment method.`);
        return false;
      }
      return true;

    case 'upi':
    default:
      return true;
  }
}

function downloadFile() {
  if (!appState.currentDataset) {
    alert("No dataset selected.");
    return;
  }
  alert(`Downloading dataset: ${appState.currentDataset.title}`);
}

function viewInBrowser() {
  if (!appState.currentDataset) {
    alert("No dataset selected.");
    return;
  }
  alert(`Previewing dataset in browser: ${appState.currentDataset.title}`);
}

async function uploadDataset() {
  const title = document.getElementById("uploadTitle").value.trim();
  const description = document.getElementById("uploadDescription").value.trim();
  const price = Number(document.getElementById("uploadPrice").value.trim());
  const category = document.getElementById("uploadCategory").value;
  const file = document.getElementById("dataFile").files[0];

  // Validation
  if (!title) {
    alert("❌ Please enter a dataset title.");
    return;
  }
  if (!description) {
    alert("❌ Please enter a description.");
    return;
  }
  if (!price || price < 1) {
    alert("❌ Please enter a valid price (minimum ₹1).");
    return;
  }
  if (!category || category === "Select Category") {
    alert("❌ Please select a category.");
    return;
  }
  if (!file) {
    alert("❌ Please select a file to upload.");
    return;
  }
  if (!appState.currentUser || !appState.currentUser.walletAddress) {
    alert("❌ Please login before publishing a dataset.");
    return;
  }

  try {
    console.log("📤 Starting upload process...");
    showLoading(true);
    
    // Step 1: Upload file to IPFS
    console.log("📁 Uploading file to IPFS...");
    const fileHash = await uploadToIPFS(file);
    console.log("✅ File uploaded. Hash:", fileHash);
    
    let blockchainId = 0;

    // Step 2: Register on blockchain (required)
    console.log("⛓️ Registering on blockchain...");
    if (!window.contract) {
      console.log("Init contract");
      await initializeContract();
    }
    const hashStr = typeof fileHash === 'object' ? fileHash.hash : fileHash;
    const priceWei = ethers.parseUnits(String(price), "ether");
    console.log("Blockchain params - Hash:", hashStr, "Price:", priceWei.toString());
    
    try {
      const tx = await registerDataset(title, description, hashStr, priceWei);
      blockchainId = tx.id?.toString() || 0;
      console.log("✅ Blockchain ID:", blockchainId);
    } catch (blockchainError) {
      console.error("❌ Blockchain err:", blockchainError.message);
      console.warn("Continuing without blockchain");
    }

    // Step 3: Create dataset on backend
    console.log("💾 Creating dataset on backend...");
    await createDatasetOnBackend({
      title,
      description,
      price,
      category,
      ipfsHash: hashStr,
      format: file.type || "unknown",
      recordCount: 0,
      walletAddress: appState.currentUser.walletAddress,
      blockchainId
    });
    console.log("✅ Dataset created successfully!");
    
    // Clear form
    document.getElementById("uploadTitle").value = "";
    document.getElementById("uploadDescription").value = "";
    document.getElementById("uploadPrice").value = "";
    document.getElementById("uploadCategory").value = "Select Category";
    document.getElementById("dataFile").value = "";
    
    alert("✅ Dataset published successfully! 🎉");
    await loadDatasets();
    navigateTo("dashboard");
  } catch (error) {
    console.error("❌ Upload failed:", error.message);
    console.error("Stack:", error.stack);
    alert("❌ Dataset upload failed:\n" + (error.message || error.toString()));
  } finally {
    showLoading(false);
  }
}

function copyShareLink() {
  const link = `${window.location.origin}/dataset-details.html?id=${appState.currentDataset?.id || ""}`;
  navigator.clipboard.writeText(link).then(() => {
    alert("Share link copied to clipboard!");
  });
}

async function loadProfile() {
  if (!appState.currentUser || !appState.currentUser.walletAddress) {
    navigateTo("landing");
    return;
  }

  try {
    const profile = await fetchProfile(appState.currentUser.walletAddress);
    const user = profile.user || appState.currentUser;

    document.getElementById("profileUsername").textContent = user.username || user.walletAddress || "User";
    if (user.avatar) {
      const avatarImg = document.getElementById("profileAvatar");
      if (avatarImg) avatarImg.src = user.avatar;
    }
    document.getElementById("profileUploaded").textContent = profile.uploadedCount || 0;
    document.getElementById("profilePurchased").textContent = profile.purchasedCount || 0;
    document.getElementById("profileRating").textContent = Number(user.rating || 0).toFixed(1);

    const uploadedList = document.getElementById("uploadedList");
    if (uploadedList) {
      uploadedList.innerHTML = (profile.uploadedDatasets || []).slice(0, 3).map((d) => `
        <div class="dataset-list-item">
          <h4>${d.title}</h4>
          <p>₹${d.price} • ${d.reviewCount || 0} reviews • ⭐ ${d.rating || 0}</p>
        </div>
      `).join("");
    }

    const purchasedList = document.getElementById("purchasedList");
    if (purchasedList) {
      purchasedList.innerHTML = (profile.purchasedDatasets || []).slice(0, 3).map((d) => `
        <div class="dataset-list-item">
          <h4>${d.title}</h4>
          <p>${d.category || "General"} • ${d.fileSize || "N/A"}</p>
        </div>
      `).join("");
    }
  } catch (error) {
    console.error(error);
    alert(error.message || "Unable to load profile.");
  }
}

function editProfile() {
  const panel = document.getElementById("profileEditPanel");
  const message = document.getElementById("profileEditMessage");
  if (!panel) return;

  const usernameInput = document.getElementById("profileEditUsername");
  const emailInput = document.getElementById("profileEditEmail");
  const user = appState.currentUser || {};

  usernameInput.value = user.username || "";
  emailInput.value = user.email || "";
  document.getElementById("profileEditAvatarPreview").src = user.avatar || "https://via.placeholder.com/100";
  message.textContent = "";
  panel.style.display = "block";
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function previewProfileAvatar(event) {
  const file = event.target.files[0];
  const preview = document.getElementById("profileEditAvatarPreview");
  if (file && preview) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

function cancelProfileEdit() {
  const panel = document.getElementById("profileEditPanel");
  if (panel) {
    panel.style.display = "none";
  }
}

async function saveProfile() {
  const usernameInput = document.getElementById("profileEditUsername");
  const emailInput = document.getElementById("profileEditEmail");
  const message = document.getElementById("profileEditMessage");

  const username = usernameInput.value.trim();
  const email = emailInput.value.trim();
  const currentUser = appState.currentUser;

  if (!currentUser?.walletAddress) {
    alert("Please login before editing your profile.");
    return;
  }

  if (!username || !email) {
    message.textContent = "Please provide both username and email.";
    message.style.color = "#d14343";
    return;
  }

  try {
    message.textContent = "Saving profile...";
    message.style.color = "#475569";

    let avatarUrl = currentUser.avatar;
    const avatarFile = document.getElementById("profileEditAvatar")?.files?.[0];
    if (avatarFile) {
      const uploadResult = await uploadAvatar(avatarFile);
      avatarUrl = uploadResult.avatarUrl || uploadResult.url || uploadResult.hash ? `https://ipfs.io/ipfs/${uploadResult.hash}` : avatarUrl;
    }

    const result = await updateProfile(currentUser.walletAddress, username, email, avatarUrl);
    const updatedUser = result.user;

    appState.currentUser = { ...appState.currentUser, ...updatedUser };
    saveCurrentUser();

    document.getElementById("profileUsername").textContent = updatedUser.username || updatedUser.walletAddress || "User";
    if (updatedUser.avatar) {
      const avatarImg = document.getElementById("profileAvatar");
      if (avatarImg) avatarImg.src = updatedUser.avatar;
    }
    message.textContent = "Profile updated successfully.";
    message.style.color = "#1f7a32";
    setTimeout(() => cancelProfileEdit(), 1200);
  } catch (error) {
    message.textContent = error.message || "Unable to update profile.";
    message.style.color = "#d14343";
  }
}

async function loadEarnings() {
  if (!appState.currentUser || !appState.currentUser.walletAddress) {
    navigateTo("landing");
    return;
  }

  try {
    const earnings = await fetchEarnings(appState.currentUser.walletAddress);
    document.getElementById("totalEarningsAmount").textContent = earnings.totalEarnings || earnings.total || 0;
    document.getElementById("pendingPayout").textContent = earnings.pendingEarnings || 0;
    document.getElementById("transactionCount").textContent = earnings.transactionCount || (earnings.history || []).length;
    document.getElementById("availableBalance").textContent = earnings.totalEarnings || earnings.total || 0;

    const transactionList = document.getElementById("transactionList");
    if (transactionList) {
      transactionList.innerHTML = (earnings.transactions || []).map((t) => `
        <div class="transaction-item">
          <div>
            <h4>${t.description || t.title || "Transaction"}</h4>
            <p class="transaction-date">${t.createdAt || t.date || "Unknown date"}</p>
          </div>
          <span class="transaction-amount">${t.amount ? (t.amount >= 0 ? "+" : "-") + "₹" + Math.abs(t.amount) : "₹0"}</span>
        </div>
      `).join("");
    }
  } catch (error) {
    console.error(error);
    alert(error.message || "Unable to load earnings.");
  }
}

function requestWithdrawal() {
  const amount = Number(document.getElementById("withdrawAmount").value);
  const account = document.getElementById("withdrawAccount").value.trim();

  if (!amount || !account) {
    alert("Please enter amount and account details.");
    return;
  }
  if (amount < 100) {
    alert("Minimum withdrawal is ₹100.");
    return;
  }

  alert(`Withdrawal request submitted for ₹${amount} to ${account}.`);
  document.getElementById("withdrawAmount").value = "";
  document.getElementById("withdrawAccount").value = "";
}

async function loadNotifications() {
  if (!appState.currentUser || !appState.currentUser.walletAddress) {
    navigateTo("landing");
    return;
  }

  try {
    const response = await fetchNotifications(appState.currentUser.walletAddress);
    appState.notifications = response.notifications || [];
    const notificationsList = document.getElementById("notificationsList");
    if (!notificationsList) return;

    if (appState.notifications.length === 0) {
      notificationsList.innerHTML = `
        <div class="empty-state">
          <p>📭 No notifications yet</p>
        </div>
      `;
      return;
    }

    notificationsList.innerHTML = appState.notifications.map((n) => `
      <div class="notification-item ${n.isRead ? "" : "unread"}">
        <div class="notification-content">
          <h4>${n.title || "Update"}</h4>
          <p>${n.message || n}</p>
        </div>
        <div class="notification-time">${n.createdAt || "Just now"}</div>
      </div>
    `).join("");
  } catch (error) {
    console.error(error);
    alert(error.message || "Unable to load notifications.");
  }
}

function clearAllNotifications() {
  if (!confirm("Clear all notifications?")) {
    return;
  }
  appState.notifications = [];
  loadNotifications();
}

function loginProvider(method) {
  navigateTo("username");
}

function loginWithGoogle() {
  loginProvider("Google");
}

function loginWithEmail() {
  loginProvider("Email");
}

window.navigateTo = navigateTo;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.handleMetaMaskLogin = handleMetaMaskLogin;
window.connectMetaMaskManual = connectMetaMaskManual;
window.loginWithGoogle = loginWithGoogle;
window.loginWithEmail = loginWithEmail;
window.completeUsername = completeUsername;
window.logout = logout;
window.filterByCategory = filterByCategory;
window.processPayment = processPayment;
window.downloadFile = downloadFile;
window.viewInBrowser = viewInBrowser;
window.uploadDataset = uploadDataset;
window.copyShareLink = copyShareLink;
window.editProfile = editProfile;
window.saveProfile = saveProfile;
window.cancelProfileEdit = cancelProfileEdit;
window.previewProfileAvatar = previewProfileAvatar;
window.requestWithdrawal = requestWithdrawal;
window.clearAllNotifications = clearAllNotifications;
window.viewDatasetDetails = viewDatasetDetails;
window.showNotifications = () => navigateTo("notifications");
window.showProfile = () => navigateTo("profile");

function updateFileLabel() {
  const fileInput = document.getElementById("dataFile");
  const label = document.getElementById("fileLabel");
  if (fileInput.files && fileInput.files[0]) {
    label.textContent = `📎 ${fileInput.files[0].name}`;
  } else {
    label.textContent = "📎 Choose File (CSV, JSON, Excel)";
  }
}

window.updateFileLabel = updateFileLabel;

window.addEventListener("load", async () => {
  loadSavedUser();
  await connectWallet();
  updateWalletUI();
  if (appState.currentUser) {
    await loadDatasets();
    navigateTo("dashboard");
  } else {
    navigateTo("landing");
  }
});

if (window.ethereum) {
  window.ethereum.on("accountsChanged", async (accounts) => {
    if (accounts.length) {
      appState.currentAccount = accounts[0];
      if (appState.currentUser) {
        const oldWallet = appState.currentUser.walletAddress;
        appState.currentUser.walletAddress = accounts[0];
        // Sync new wallet to backend
        if (appState.currentUser.id && oldWallet !== accounts[0]) {
          try {
            await fetch(`/api/users/${appState.currentUser.id}/wallet`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ walletAddress: accounts[0] })
            });
            console.log("✅ Wallet synced after account switch");
          } catch (e) {
            console.warn("Wallet sync failed on account change:", e);
          }
        }
        saveCurrentUser();
      }
      updateWalletUI();
      await initializeContract();
      await loadDatasets();
    } else {
      // Disconnected
      appState.currentAccount = null;
      updateWalletUI();
    }
  });

  window.ethereum.on("chainChanged", () => {
    console.log("🔄 Chain changed, reloading...");
    window.location.reload();
  });
}
