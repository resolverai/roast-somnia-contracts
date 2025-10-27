import { ethers } from "hardhat";
import { TOASTToken } from "../typechain-types";
import { somniaExplorer } from "./somniaExplorerAPI";

async function main() {
  console.log("🚀 Starting TOAST Token deployment on Somnia Shannon Testnet...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    throw new Error("❌ Deployer account has no ETH for gas fees");
  }
  
  // Deploy TOAST Token
  console.log("🔨 Deploying TOAST Token...");
  const TOASTTokenFactory = await ethers.getContractFactory("TOASTToken");
  
  // Deploy with deployer as initial owner
  const toastToken = await TOASTTokenFactory.deploy(deployer.address) as TOASTToken;
  
  // Wait for deployment
  await toastToken.waitForDeployment();
  const contractAddress = await toastToken.getAddress();
  const deploymentTx = toastToken.deploymentTransaction();
  
  console.log("✅ TOAST Token deployed successfully!");
  console.log("📍 Contract Address:", contractAddress);
  console.log("🔗 Transaction Hash:", deploymentTx?.hash);
  console.log("👤 Owner Address:", deployer.address);
  
  // Wait for a few block confirmations
  console.log("⏳ Waiting for block confirmations...");
  if (deploymentTx) {
    await deploymentTx.wait(3); // Wait for 3 confirmations
    console.log("✅ Transaction confirmed with 3 blocks");
  }
  
  // Verify deployment by checking basic properties
  console.log("\n🔍 Verifying deployment...");
  const name = await toastToken.name();
  const symbol = await toastToken.symbol();
  const decimals = await toastToken.decimals();
  const totalSupply = await toastToken.totalSupply();
  const ownerBalance = await toastToken.balanceOf(deployer.address);
  const version = await toastToken.version();
  
  console.log("📊 Token Details:");
  console.log("   Name:", name);
  console.log("   Symbol:", symbol);
  console.log("   Decimals:", decimals);
  console.log("   Total Supply:", ethers.formatEther(totalSupply), "TOAST");
  console.log("   Owner Balance:", ethers.formatEther(ownerBalance), "TOAST");
  console.log("   Contract Version:", version);
  
  // Verify the total supply is correct (1 billion tokens)
  const expectedSupply = ethers.parseEther("1000000000"); // 1 billion
  if (totalSupply === expectedSupply) {
    console.log("✅ Total supply verification: PASSED");
  } else {
    console.log("❌ Total supply verification: FAILED");
    console.log("   Expected:", ethers.formatEther(expectedSupply));
    console.log("   Actual:", ethers.formatEther(totalSupply));
  }
  
  // Check if owner has all tokens initially
  if (ownerBalance === totalSupply) {
    console.log("✅ Owner balance verification: PASSED");
  } else {
    console.log("❌ Owner balance verification: FAILED");
  }
  
  // Interact with Somnia Shannon Explorer API
  console.log("\n🔍 Querying Somnia Shannon Explorer...");
  try {
    if (deploymentTx?.hash) {
      // Verify deployment on explorer
      const verification = await somniaExplorer.verifyContractDeployment(
        contractAddress,
        deploymentTx.hash
      );
      
      console.log("📋 Explorer Verification:");
      console.log("   Deployment Status:", verification.isDeployed ? "✅ Confirmed" : "❌ Failed");
      console.log("   Contract Verified:", verification.isVerified ? "✅ Yes" : "⏳ Pending");
      console.log("   Explorer URL:", verification.explorerURL);
      console.log("   Transaction URL:", verification.txURL);
      
      // Get account balance from explorer
      try {
        const deployerInfo = await somniaExplorer.getAddressInfo(deployer.address);
        console.log("   Deployer Info:", deployerInfo.hash ? "✅ Found" : "⏳ Indexing");
        if (deployerInfo.coin_balance) {
          console.log("   Explorer Balance:", ethers.formatEther(deployerInfo.coin_balance), "ETH");
        }
      } catch (error) {
        console.log("   Deployer Info: ⏳ Not yet indexed");
      }
      
      // Get token info from explorer
      try {
        const tokenInfo = await somniaExplorer.getTOASTTokenInfo(contractAddress);
        console.log("   Token Info:", tokenInfo.tokenInfo ? "✅ Found" : "⏳ Indexing");
        if (tokenInfo.addressInfo) {
          console.log("   Contract Type:", tokenInfo.addressInfo.is_contract ? "✅ Contract" : "❓ Unknown");
        }
      } catch (error) {
        console.log("   Token Info: ⏳ Indexing in progress...");
      }
    }
  } catch (error) {
    console.log("⚠️ Explorer API query failed (this is normal for new deployments):", error.message);
  }
  
  console.log("\n🎉 Deployment completed successfully!");
  console.log("🔗 Add this contract address to your environment variables:");
  console.log(`TOAST_TOKEN_ADDRESS=${contractAddress}`);
  
  // Save deployment info to a file
  const deploymentInfo = {
    network: "somniaTestnet",
    contractAddress: contractAddress,
    deployerAddress: deployer.address,
    deploymentTime: new Date().toISOString(),
    transactionHash: deploymentTx?.hash,
    blockNumber: deploymentTx?.blockNumber,
    gasUsed: deploymentTx?.gasLimit?.toString(),
    explorerURL: `https://somnia.w3us.site/address/${contractAddress}`,
    transactionURL: deploymentTx?.hash ? `https://somnia.w3us.site/tx/${deploymentTx.hash}` : undefined,
    tokenDetails: {
      name: name,
      symbol: symbol,
      decimals: decimals,
      totalSupply: ethers.formatEther(totalSupply),
      version: version
    }
  };
  
  console.log("\n📄 Deployment Summary:");
  // Convert BigInt values to strings for JSON serialization
  const deploymentSummary = {
    ...deploymentInfo,
    totalSupply: deploymentInfo.totalSupply.toString(),
    ownerBalance: deploymentInfo.ownerBalance.toString(),
    decimals: deploymentInfo.decimals.toString()
  };
  console.log(JSON.stringify(deploymentSummary, null, 2));
  
  console.log("\n📋 Next Steps:");
  console.log("1. Update your .env file with the contract address");
  console.log("2. Verify the contract on Somnia Explorer (may take a few minutes)");
  console.log("3. Run interaction script to test the deployed contract");
  console.log("4. Monitor the contract on the explorer dashboard");
  
  return {
    toastToken,
    contractAddress,
    deploymentInfo
  };
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
