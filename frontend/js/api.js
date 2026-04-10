import { BACKEND_URL } from "./config.js";

function buildBackendUrl(path, params = {}) {
  const url = new URL(path, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });
  return url.pathname + url.search;
}

export async function fetchDatasetsFromBackend() {
  const response = await fetch(`${BACKEND_URL}/datasets`);
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || "Backend dataset fetch failed");
  }
  return await response.json();
}

export async function uploadFileToBackend(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BACKEND_URL}/upload`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || "Backend IPFS upload failed");
  }

  return await response.json();
}

export async function loginUser(email, password) {
  console.log("🔐 Logging in with email:", email);
  
  const response = await fetch(`${BACKEND_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: "Unknown error" }));
    console.error("❌ Login failed:", response.status, errorBody);
    throw new Error(errorBody.error || `Login failed (HTTP ${response.status})`);
  }

  const result = await response.json();
  console.log("✅ Login successful. User ID:", result.user?.id);
  return result;
}

export async function signupUser(username, email, password) {
  console.log("📝 Signing up user:", username, email);
  
  const response = await fetch(`${BACKEND_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: "Unknown error" }));
    console.error("❌ Signup failed:", response.status, errorBody);
    throw new Error(errorBody.error || `Signup failed (HTTP ${response.status})`);
  }

  const result = await response.json();
  console.log("✅ Signup successful. User ID:", result.user?.id);
  return result;
}

export async function createDatasetOnBackend(dataset) {
  console.log("📝 Creating dataset:", dataset.title);
  
  const response = await fetch(`${BACKEND_URL}/datasets/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dataset)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: "Unknown error" }));
    console.error("❌ Dataset creation failed:", response.status, errorBody);
    throw new Error(errorBody.error || `Dataset creation failed (HTTP ${response.status})`);
  }

  const result = await response.json();
  console.log("✅ Dataset created with ID:", result.datasetId);
  return result;
}

export async function initiatePurchase(datasetId, buyerWallet) {
  const response = await fetch(`${BACKEND_URL}/buy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ datasetId, buyerWallet })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || "Purchase initiation failed");
  }

  return await response.json();
}

export async function completePurchase(purchaseId) {
  const response = await fetch(`${BACKEND_URL}/purchases/${purchaseId}/complete`, {
    method: "POST"
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || "Purchase completion failed");
  }

  return await response.json();
}

export async function addReview(datasetId, walletAddress, rating, comment) {
  const response = await fetch(`${BACKEND_URL}/reviews/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ datasetId, walletAddress, rating, comment })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || "Review submission failed");
  }

  return await response.json();
}

export async function fetchProfile(walletAddress) {
  const response = await fetch(buildBackendUrl(`${BACKEND_URL}/profile`, { walletAddress }));
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || "Profile fetch failed");
  }
  return await response.json();
}

export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BACKEND_URL}/upload`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errorBody.error || "Avatar upload failed");
  }

  return await response.json();
}

export async function updateProfile(walletAddress, username, email, avatar) {
  const response = await fetch(`${BACKEND_URL}/profile/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress, username, email, avatar })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errorBody.error || "Profile update failed");
  }

  return await response.json();
}
export async function fetchEarnings(walletAddress) {
  const response = await fetch(buildBackendUrl(`${BACKEND_URL}/earnings`, { walletAddress }));
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || "Earnings fetch failed");
  }
  return await response.json();
}

export async function fetchNotifications(walletAddress) {
  const response = await fetch(buildBackendUrl(`${BACKEND_URL}/notifications`, { walletAddress }));
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || "Notifications fetch failed");
  }
  return await response.json();
}
