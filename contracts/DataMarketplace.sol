// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DataMarketplace {
    address public owner;
    uint256 public datasetCount;
    uint256 public platformFeePercentage = 10; // 10% platform fee

    struct Dataset {
        uint256 id;
        address payable seller;
        string title;
        string description;
        string ipfsHash;
        uint256 price;
        uint256 purchaseCount;
        uint256 createdAt;
    }

    struct Purchase {
        uint256 id;
        uint256 datasetId;
        address buyer;
        address seller;
        uint256 amount;
        uint256 timestamp;
    }

    mapping(uint256 => Dataset) public datasets;
    mapping(uint256 => Purchase) public purchases;
    mapping(address => uint256) public sellerEarnings;
    mapping(address => uint256[]) public userPurchases;
    mapping(address => uint256[]) public userDatasets;
    
    uint256 public purchaseCount;

    event DatasetRegistered(
        uint256 indexed id,
        address indexed seller,
        string title,
        uint256 price
    );

    event DatasetPurchased(
        uint256 indexed id,
        uint256 indexed purchaseId,
        address indexed buyer,
        address seller,
        uint256 price,
        uint256 timestamp
    );

    event Withdrawal(address indexed receiver, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function registerData(
        string calldata title,
        string calldata description,
        string calldata ipfsHash,
        uint256 price
    ) external returns (uint256) {
        require(bytes(title).length > 0, "Title is required");
        require(bytes(ipfsHash).length > 0, "IPFS hash is required");
        require(price > 0, "Price must be greater than zero");

        datasetCount += 1;
        datasets[datasetCount] = Dataset(
            datasetCount,
            payable(msg.sender),
            title,
            description,
            ipfsHash,
            price,
            0,
            block.timestamp
        );

        userDatasets[msg.sender].push(datasetCount);

        emit DatasetRegistered(datasetCount, msg.sender, title, price);
        return datasetCount;
    }

    function buyData(uint256 datasetId) external payable {
        Dataset storage dataset = datasets[datasetId];
        require(datasetId > 0 && datasetId <= datasetCount, "Invalid dataset id");
        require(msg.value == dataset.price, "Please send the exact price");
        require(dataset.seller != msg.sender, "Seller cannot buy own dataset");

        // Calculate platform fee and seller earnings
        uint256 platformFee = (msg.value * platformFeePercentage) / 100;
        uint256 sellerAmount = msg.value - platformFee;

        // Update earnings
        sellerEarnings[dataset.seller] += sellerAmount;

        // Record purchase
        purchaseCount += 1;
        purchases[purchaseCount] = Purchase(
            purchaseCount,
            datasetId,
            msg.sender,
            dataset.seller,
            msg.value,
            block.timestamp
        );

        dataset.purchaseCount += 1;
        userPurchases[msg.sender].push(datasetId);

        emit DatasetPurchased(datasetId, purchaseCount, msg.sender, dataset.seller, msg.value, block.timestamp);
    }

    function withdrawEarnings() external {
        uint256 earnings = sellerEarnings[msg.sender];
        require(earnings > 0, "No earnings to withdraw");

        sellerEarnings[msg.sender] = 0;
        payable(msg.sender).transfer(earnings);

        emit Withdrawal(msg.sender, earnings);
    }

    function getDatasetDetail(uint256 datasetId) external view returns (Dataset memory) {
        require(datasetId > 0 && datasetId <= datasetCount, "Invalid dataset id");
        return datasets[datasetId];
    }

    function getSellerDatasets(address seller) external view returns (uint256[] memory) {
        return userDatasets[seller];
    }

    function getUserPurchases(address buyer) external view returns (uint256[] memory) {
        return userPurchases[buyer];
    }

    function getEarnings(address seller) external view returns (uint256) {
        return sellerEarnings[seller];
    }

    function setPlatformFee(uint256 newFeePercentage) external onlyOwner {
        require(newFeePercentage <= 100, "Fee cannot exceed 100%");
        platformFeePercentage = newFeePercentage;
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function withdrawPlatformFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner).transfer(balance);
        emit Withdrawal(owner, balance);
    }
}
