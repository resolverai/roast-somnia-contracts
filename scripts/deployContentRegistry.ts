import { ethers } from "hardhat";
import { ContentRegistry } from "../typechain-types";
import { somniaExplorer } from "./somniaExplorerAPI";

// Get TOAST token address from environment
const TOAST_TOKEN_ADDRESS = process.env.TOAST_TOKEN_ADDRESS || "";

async function main() {
  console.log("🚀 Starting Content Registry deployment on Somnia Shannon Testnet...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  // Check account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  if (!TOAST_TOKEN_ADDRESS) {
    throw new Error("❌ Please set TOAST_TOKEN_ADDRESS environment variable");
  }
  
  console.log("🔗 Using TOAST Token address:", TOAST_TOKEN_ADDRESS);
  
  // Deploy Content Registry
  console.log("🔨 Deploying Content Registry...");
  const ContentRegistryFactory = await ethers.getContractFactory("ContentRegistry");
  const contentRegistry = await ContentRegistryFactory.deploy(TOAST_TOKEN_ADDRESS) as ContentRegistry;
  
  // Wait for deployment
  await contentRegistry.waitForDeployment();
  const contractAddress = await contentRegistry.getAddress();
  const deploymentTx = contentRegistry.deploymentTransaction();
  
  console.log("✅ Content Registry deployed successfully!");
  console.log("📍 Contract Address:", contractAddress);
  console.log("🔗 Transaction Hash:", deploymentTx?.hash);
  console.log("👤 Deployer Address:", deployer.address);
  
  // Wait for a few block confirmations
  console.log("⏳ Waiting for block confirmations...");
  if (deploymentTx) {
    await deploymentTx.wait(3); // Wait for 3 confirmations
    console.log("✅ Transaction confirmed with 3 blocks");
  }
  
  // Verify deployment by checking basic properties
  console.log("\n🔍 Verifying deployment...");
  const roastToken = await contentRegistry.roastToken();
  const totalContent = await contentRegistry.totalContent();
  const owner = await contentRegistry.owner();
  
  console.log("📊 Contract Details:");
  console.log("   ROAST Token:", roastToken);
  console.log("   Total Content:", totalContent.toString());
  console.log("   Owner:", owner);
  console.log("   Contract Address:", contractAddress);
  
  // Verify ROAST token integration
  if (roastToken.toLowerCase() === TOAST_TOKEN_ADDRESS.toLowerCase()) {
    console.log("✅ ROAST Token integration: PASSED");
  } else {
    console.log("❌ ROAST Token integration: FAILED");
  }
  
  // Query Shannon Explorer for contract info
  console.log("\n🔍 Querying Somnia Shannon Explorer...");
  try {
    const verification = await somniaExplorer.verifyContractDeployment(contractAddress, deploymentTx?.hash || "");
    
    console.log("📋 Explorer Verification:");
    console.log("   Deployment Status:", verification.isDeployed ? "✅ Confirmed" : "❌ Not Found");
    console.log("   Contract Verified:", verification.isVerified ? "✅ Yes" : "⏳ Pending");
    console.log("   Explorer URL:", verification.explorerURL);
    console.log("   Transaction URL:", verification.txURL);
    
    if (verification.addressInfo) {
      console.log("   Deployer Info:", verification.addressInfo.creator_address_hash ? "✅ Found" : "❌ Not Found");
      console.log("   Explorer Balance:", verification.addressInfo.balance, "ETH");
    }
    
  } catch (error) {
    console.log("⚠️ Explorer data not yet indexed or API unavailable");
  }
  
  // Create deployment info
  const deploymentInfo = {
    contractName: "ContentRegistry",
    contractAddress: contractAddress,
    transactionHash: deploymentTx?.hash,
    deployer: deployer.address,
    roastToken: roastToken,
    totalContent: totalContent.toString(),
    owner: owner,
    network: "somniaTestnet",
    timestamp: new Date().toISOString(),
    explorerURL: `https://somnia.w3us.site/address/${contractAddress}`,
    txURL: `https://somnia.w3us.site/tx/${deploymentTx?.hash}`
  };
  
  console.log("\n📄 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n📋 Next Steps:");
  console.log("1. Update your .env file with the contract address:");
  console.log(`   CONTENT_REGISTRY_ADDRESS=${contractAddress}`);
  console.log("2. Deploy ContentRewardDistribution contract");
  console.log("3. Set reward distribution address in Content Registry");
  console.log("4. Test the contracts with interaction scripts");
  
  console.log("\n🎉 Content Registry deployment completed successfully!");
  console.log(`🔗 View contract on explorer: https://somnia.w3us.site/address/${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
