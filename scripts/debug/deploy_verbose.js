const hre = require("hardhat");

async function main() {
  console.log("Starting deployment...");
  
  try {
    const DataMarketplace = await hre.ethers.getContractFactory("DataMarketplace");
    console.log("Contract factory obtained");
    
    const marketplace = await DataMarketplace.deploy();
    console.log("Deployment transaction sent");
    
    const deployedMarketplace = await marketplace.waitForDeployment();
    console.log("Deployment confirmed");
    
    const address = marketplace.target || marketplace.address;
    console.log("DataMarketplace deployed to:", address);
    console.log("\nUpdate config files with:");
    console.log(`CONTRACT_ADDRESS=${address}`);
  } catch (error) {
    console.error("Deployment error:", error);
    process.exit(1);
  }
}

main();
