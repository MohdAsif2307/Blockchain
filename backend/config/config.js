require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 3000,
  PRIVATE_KEY: process.env.PRIVATE_KEY || "",
  GOERLI_URL: process.env.GOERLI_URL || "http://127.0.0.1:8545",
  INFURA_PROJECT_ID: process.env.INFURA_PROJECT_ID || "",
  INFURA_PROJECT_SECRET: process.env.INFURA_PROJECT_SECRET || "",
  CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS || ""
};
