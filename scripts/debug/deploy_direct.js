const fs = require('fs');
const path = require('path');
const ethers = require('ethers');

async function deploy() {
  console.log('🚀 Starting deployment...\n');
  
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  const accounts = await provider.listAccounts();
  const signer = accounts[0];
  
  console.log(`📝 Signer: ${signer}`);
  const signerAddress = await provider.getSigner();
  console.log(`✅ Using account: ${signerAddress || signer}\n`);
  
  // Read contract ABI and bytecode from artifacts
  const artifactPath = path.join(__dirname, 'artifacts', 'contracts', 'DataMarketplace.sol', 'DataMarketplace.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  
  console.log('📚 Contract details:');
  console.log(`   - Name: ${artifact.contractName}`);
  console.log(`   - ABI Functions: ${artifact.abi.filter(x => x.type === 'function').length}`);
  console.log(`   - ABI Events: ${artifact.abi.filter(x => x.type === 'event').length}\n`);
  
  // Check DatasetRegistered event in ABI
  const datasetRegisteredEvent = artifact.abi.find(x => x.type === 'event' && x.name === 'DatasetRegistered');
  if (datasetRegisteredEvent) {
    console.log('✅ DatasetRegistered event found in ABI:');
    console.log(`   Inputs: ${datasetRegisteredEvent.inputs.length}`);
    datasetRegisteredEvent.inputs.forEach((input, i) => {
      console.log(`     ${i+1}. ${input.name}: ${input.type} (indexed: ${input.indexed})`);
    });
    console.log('');
  } else {
    console.log('❌ DatasetRegistered event NOT found in ABI\n');
  }
  
  // Deploy the contract
  console.log('📤 Deploying contract...');
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
  const contract = await factory.deploy();
  
  console.log(`✅ Deployment transaction sent: ${contract.deploymentTransaction()?.hash || 'N/A'}`);
  
  console.log('⏳ Waiting for deployment confirmation...');
  const deployedContract = await contract.waitForDeployment();
  const address = await deployedContract.getAddress();
  
  console.log(`\n✅ Contract deployed successfully!`);
  console.log(`📍 Address: ${address}`);
  console.log(`\n🔧 Update your config files with:`);
  console.log(`CONTRACT_ADDRESS=${address}`);
  
  return address;
}

deploy().catch(error => {
  console.error('❌ Deployment failed:');
  console.error(error.message);
  process.exit(1);
});
