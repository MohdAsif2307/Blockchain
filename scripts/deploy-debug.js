const hre = require("hardhat");

async function main() {
  try {
    console.log("1. Starting deployment...");
    console.log("2. Network:", hre.network.name);
    
    console.log("3. Getting contract factory...");
    const DataMarketplace = await hre.ethers.getContractFactory("DataMarketplace");
    console.log("4. Got contract factory, deploying...");
    
    const marketplace = await DataMarketplace.deploy();
    console.log("5. Deploy called, marketplace object created");
    console.log("6. Marketplace object keys:", Object.keys(marketplace).slice(0, 10));
    
    const address = marketplace.target || marketplace.address;
    console.log("========================================");
    console.log("CONTRACT ADDRESS:", address);
    console.log("========================================");
    
    console.log("7. Deployment script completed successfully");
  } catch (error) {
    console.error("CAUGHT ERROR:", error.message);
    console.error("Stack:", error.stack);
    throw error;
  }
}

main();
