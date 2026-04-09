const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const apiRoutes = require("./routes/api");
const db = require("./db/database");
const { PORT } = require("./config/config");

const app = express();
const frontendPath = path.join(__dirname, "..", "frontend");

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// API Routes
app.use("/api", apiRoutes);

// Static frontend files
app.use(express.static(frontendPath));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    server: "running",
    database: "connected",
    timestamp: new Date().toISOString()
  });
});

// Fallback to index.html for SPA
app.get("*", (req, res) => {
  // If it's an API route that wasn't caught, return 404
  if (req.url.startsWith("/api")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  res.sendFile(path.join(frontendPath, "landing.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   Data Marketplace dApp Backend Running   ║
╠══════════════════════════════════════════╣
║  Server URL: http://localhost:${PORT}         ║
║  API Docs: http://localhost:${PORT}/api       ║
║  Health: http://localhost:${PORT}/health      ║
║  Frontend: http://localhost:${PORT}           ║
╚══════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error("Could not close connections in time, forcefully shutting down");
    process.exit(1);
  }, 10000);
});

module.exports = app;
