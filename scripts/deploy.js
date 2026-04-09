const hre = require("hardhat");

async function main() {
  const DataMarketplace = await hre.ethers.getContractFactory("DataMarketplace");
  const marketplace = await DataMarketplace.deploy();

  await marketplace.waitForDeployment();

  console.log("DataMarketplace deployed to:", marketplace.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
