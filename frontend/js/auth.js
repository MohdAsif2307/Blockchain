import { loginUser, signupUser } from "./api.js";

function showLoading(show = true) {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) {
    overlay.style.display = show ? "flex" : "none";
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

    // Save user to localStorage
    localStorage.setItem("dataMarketplaceUser", JSON.stringify(result.user));
    console.log("💾 User saved to localStorage");

    // Clear form
    document.getElementById("signupUsername").value = "";
    document.getElementById("signupEmail").value = "";
    document.getElementById("signupPassword").value = "";
    document.getElementById("signupConfirmPassword").value = "";

    alert("✅ Account created successfully! Welcome to Data Marketplace!");
    // Redirect to main app
    window.navigateTo("dashboard");
  } catch (error) {
    console.error("❌ Signup error:", error);
    alert("❌ Signup failed:\n" + (error.message || error.toString()));
  } finally {
    showLoading(false);
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

    // Save user to localStorage
    localStorage.setItem("dataMarketplaceUser", JSON.stringify(result.user));
    console.log("💾 User saved to localStorage");

    // Clear form
    document.getElementById("loginEmail").value = "";
    document.getElementById("loginPassword").value = "";

    alert("✅ Login successful! Welcome back!");
    // Redirect to main app
    window.navigateTo("dashboard");
  } catch (error) {
    console.error("❌ Login error:", error);
    alert("❌ Login failed:\n" + (error.message || error.toString()));
  } finally {
    showLoading(false);
  }
}

// Expose functions to global scope
window.handleSignup = handleSignup;
window.handleLogin = handleLogin;