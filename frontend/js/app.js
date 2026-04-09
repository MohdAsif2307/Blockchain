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
        appState.currentAccount = accounts[0];
        if (!appState.currentUser) {
          appState.currentUser = { walletAddress: accounts[0] };
        } else {
          appState.currentUser.walletAddress = accounts[0];
        }
        localStorage.setItem("walletAddress", accounts[0]);
      }
      if (!window.contract) {
        initializeContract();
      }
    } catch (err) {
      console.warn("Wallet connect failed", err);
    }
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

function getCurrentWalletAddress() {
  return appState.currentUser?.walletAddress || appState.currentAccount;
}

function loginProvider(method) {
  navigateTo("username");
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

  try {
    showLoading(true);
    const purchase = await initiatePurchase(appState.currentDataset.id, appState.currentUser.walletAddress);

    // Only attempt blockchain purchase if dataset has blockchain ID
    const blockchainId = appState.currentDataset.blockchainId;
    if (blockchainId && blockchainId > 0) {
      if (!window.contract) initializeContract();
      const priceValue = appState.currentDataset.price || 0;
      const priceWei = ethers.parseUnits(String(priceValue), "ether");
      await buyDataset(blockchainId, priceWei);
    } else {
      console.warn("Skipping blockchain purchase - dataset not registered on blockchain");
    }

    await completePurchase(purchase.purchaseId);
    alert("Purchase completed successfully.");
    await loadDatasets();
    navigateTo("download");
  } catch (error) {
    console.error(error);
    alert(error.message || "Purchase failed.");
  } finally {
    showLoading(false);
  }
}

function processPayment() {
  handlePurchase();
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
      initializeContract();
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
  alert("Edit profile is not yet implemented. Stay tuned.");
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

function loginWithGoogle() {
  loginProvider("Google");
}

function loginWithEmail() {
  loginProvider("Email");
}

window.navigateTo = navigateTo;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
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
        appState.currentUser.walletAddress = accounts[0];
        saveCurrentUser();
      }
      await loadDatasets();
    }
  });
}
