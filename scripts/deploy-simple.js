const hre = require("hardhat");

async function main() {
  try {
    console.log("1. Starting deployment...");
    
    // Get signers
    const [deployer] = await hre.ethers.getSigners();
    console.log("2. Deployer address:", deployer.address);
    
    console.log("3. Getting contract factory...");
    const DataMarketplace = await hre.ethers.getContractFactory("DataMarketplace");
    console.log("4. Contract factory obtained");
    
    console.log("5. Deploying...");
    const marketplace = await DataMarketplace.deploy();
    console.log("6. Contract deployed");
    
    const address = marketplace.target || marketplace.address;
    console.log("\n========================================");
    console.log("CONTRACT ADDRESS:", address);
    console.log("========================================\n");
    
  } catch (error) {
    console.error("ERROR:", error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

main();
