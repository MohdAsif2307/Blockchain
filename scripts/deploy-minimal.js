const hre = require("hardhat");

async function main() {
  console.log("Starting deployment...");
  console.log("Network:", hre.network.name);
  
  const DataMarketplace = await hre.ethers.getContractFactory("DataMarketplace");
  console.log("Got contract factory");
  
  const marketplace = await DataMarketplace.deploy();
  console.log("Deploy transaction sent");
  console.log("Transaction hash:", marketplace.deploymentTransaction()?.hash);
  
  // Immediately show the target address without waiting
  const address = marketplace.target || marketplace.address;
  console.log("========================================");
  console.log("DataMarketplace deployed to:", address);
  console.log("========================================");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exitCode = 1;
});
