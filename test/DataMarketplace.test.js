const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DataMarketplace", function () {
  let marketplace;
  let seller;
  let buyer;
  let owner;

  beforeEach(async function () {
    [owner, seller, buyer] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("DataMarketplace");
    marketplace = await factory.deploy();
    await marketplace.deployed();
  });

  it("registers a dataset", async function () {
    const tx = await marketplace.connect(seller).registerData(
      "Research Dataset",
      "High-value dataset for ML training",
      "QmExampleHash",
      ethers.parseEther("0.1")
    );

    await tx.wait();

    const dataset = await marketplace.datasets(1);
    expect(dataset.id).to.equal(1);
    expect(dataset.seller).to.equal(seller.address);
    expect(dataset.title).to.equal("Research Dataset");
    expect(dataset.price).to.equal(ethers.parseEther("0.1"));
    expect(dataset.sold).to.equal(false);
  });

  it("allows a buyer to purchase a dataset", async function () {
    await marketplace.connect(seller).registerData(
      "Research Dataset",
      "High-value dataset for ML training",
      "QmExampleHash",
      ethers.parseEther("0.1")
    );

    const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);

    const tx = await marketplace.connect(buyer).buyData(1, {
      value: ethers.parseEther("0.1")
    });
    await tx.wait();

    const dataset = await marketplace.datasets(1);
    expect(dataset.sold).to.equal(true);

    const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
    expect(sellerBalanceAfter).to.be.gt(sellerBalanceBefore);
  });

  it("only owner can withdraw contract balance", async function () {
    await expect(marketplace.connect(buyer).withdraw()).to.be.revertedWith("Only owner can call this");
  });
});
