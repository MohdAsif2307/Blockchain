const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const { GOERLI_URL, PRIVATE_KEY, CONTRACT_ADDRESS } = require("../config/config");

function getProvider() {
  return new ethers.JsonRpcProvider(GOERLI_URL || "http://127.0.0.1:8545");
}

function getSigner(provider) {
  if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY must be set in environment variables");
  }
  return new ethers.Wallet(PRIVATE_KEY, provider);
}

function getContractAbi() {
  const artifactPath = path.join(__dirname, "..", "..", "artifacts", "contracts", "DataMarketplace.sol", "DataMarketplace.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  return artifact.abi;
}

function getContract() {
  if (!CONTRACT_ADDRESS) {
    throw new Error("CONTRACT_ADDRESS must be set in environment variables");
  }
  const provider = getProvider();
  const signer = getSigner(provider);
  const abi = getContractAbi();
  return new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
}

module.exports = {
  getProvider,
  getSigner,
  getContract
};
