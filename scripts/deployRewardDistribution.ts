import { ethers } from "hardhat";
import { ContentRewardDistribution } from "../typechain-types";
import { somniaExplorer } from "./somniaExplorerAPI";

// Get addresses from environment
const TOAST_TOKEN_ADDRESS = process.env.TOAST_TOKEN_ADDRESS || "";
const EVALUATOR_TREASURY = process.env.EVALUATOR_TREASURY || "";
const PLATFORM_TREASURY = process.env.PLATFORM_TREASURY || "";

async function main() {
  console.log("🚀 Starting Content Reward Distribution deployment on Somnia Shannon Testnet...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  // Check account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  // Validate required addresses
  if (!TOAST_TOKEN_ADDRESS) {
    throw new Error("❌ Please set TOAST_TOKEN_ADDRESS environment variable");
  }
  
  if (!EVALUATOR_TREASURY) {
    throw new Error("❌ Please set EVALUATOR_TREASURY environment variable");
  }
  
  if (!PLATFORM_TREASURY) {
    throw new Error("❌ Please set PLATFORM_TREASURY environment variable");
  }
  
  console.log("🔗 Using addresses:");
  console.log("   TOAST Token:", TOAST_TOKEN_ADDRESS);
  console.log("   Evaluator Treasury:", EVALUATOR_TREASURY);
  console.log("   Platform Treasury:", PLATFORM_TREASURY);
  
  // Deploy Content Reward Distribution
  console.log("🔨 Deploying Content Reward Distribution...");
  const RewardDistributionFactory = await ethers.getContractFactory("ContentRewardDistribution");
  const rewardDistribution = await RewardDistributionFactory.deploy(
    TOAST_TOKEN_ADDRESS,
    EVALUATOR_TREASURY,
    PLATFORM_TREASURY
  ) as ContentRewardDistribution;
  
  // Wait for deployment
  await rewardDistribution.waitForDeployment();
  const contractAddress = await rewardDistribution.getAddress();
  const deploymentTx = rewardDistribution.deploymentTransaction();
  
  console.log("✅ Content Reward Distribution deployed successfully!");
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
  const roastToken = await rewardDistribution.roastToken();
  const evaluatorTreasury = await rewardDistribution.evaluatorTreasury();
  const platformTreasury = await rewardDistribution.platformTreasury();
  const totalPayouts = await rewardDistribution.totalPayouts();
  const owner = await rewardDistribution.owner();
  
  console.log("📊 Contract Details:");
  console.log("   ROAST Token:", roastToken);
  console.log("   Evaluator Treasury:", evaluatorTreasury);
  console.log("   Platform Treasury:", platformTreasury);
  console.log("   Total Payouts:", totalPayouts.toString());
  console.log("   Owner:", owner);
  console.log("   Contract Address:", contractAddress);
  
  // Verify address integrations
  const addressChecks = [
    { name: "ROAST Token", expected: TOAST_TOKEN_ADDRESS, actual: roastToken },
    { name: "Evaluator Treasury", expected: EVALUATOR_TREASURY, actual: evaluatorTreasury },
    { name: "Platform Treasury", expected: PLATFORM_TREASURY, actual: platformTreasury }
  ];
  
  console.log("\n🔍 Address Verification:");
  addressChecks.forEach(check => {
    const passed = check.actual.toLowerCase() === check.expected.toLowerCase();
    console.log(`   ${check.name}: ${passed ? "✅ PASSED" : "❌ FAILED"}`);
  });
  
  // Check referral rates
  console.log("\n📊 Referral Rates Configuration:");
  const tiers = ["SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "UNICORN"];
  for (let i = 0; i < tiers.length; i++) {
    const directRate = await rewardDistribution.directReferrerRates(i);
    const grandRate = await rewardDistribution.grandReferrerRates(i);
    console.log(`   ${tiers[i]}: Direct ${(Number(directRate) / 100).toFixed(2)}%, Grand ${(Number(grandRate) / 100).toFixed(2)}%`);
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
    contractName: "ContentRewardDistribution",
    contractAddress: contractAddress,
    transactionHash: deploymentTx?.hash,
    deployer: deployer.address,
    roastToken: roastToken,
    evaluatorTreasury: evaluatorTreasury,
    platformTreasury: platformTreasury,
    totalPayouts: totalPayouts.toString(),
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
  console.log(`   REWARD_DISTRIBUTION_ADDRESS=${contractAddress}`);
  console.log("2. Set reward distribution address in Content Registry");
  console.log("3. Test the contracts with interaction scripts");
  console.log("4. Register some test referrals");
  
  console.log("\n🎉 Content Reward Distribution deployment completed successfully!");
  console.log(`🔗 View contract on explorer: https://somnia.w3us.site/address/${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
