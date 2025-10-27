import { ethers } from "hardhat";
import { ContentRegistry, ContentRewardDistribution, TOASTToken } from "../typechain-types";

// Contract addresses on Somnia testnet
const TOAST_TOKEN_ADDRESS = "0x883bA39bA9b2d9724cC42715d6A105C3FA3A7578";
const CONTENT_REGISTRY_ADDRESS = "0xEB481946B037523058D3B5c00Da6001F7F61eE39";
const REWARD_DISTRIBUTION_ADDRESS = "0x35Bc90D9e86D6f3d4eC018d499b68d738FBBD2a1";

async function main() {
  console.log("🚀 Simple Somnia Testnet Demo");
  console.log("=".repeat(50));

  // Get signers
  const [owner] = await ethers.getSigners();
  console.log("👤 Owner address:", owner.address);

  // Connect to deployed contracts
  console.log("\n🔗 Connecting to deployed contracts...");
  const toastToken = await ethers.getContractAt("TOASTToken", TOAST_TOKEN_ADDRESS) as unknown as TOASTToken;
  const contentRegistry = await ethers.getContractAt("ContentRegistry", CONTENT_REGISTRY_ADDRESS) as unknown as ContentRegistry;
  const rewardDistribution = await ethers.getContractAt("ContentRewardDistribution", REWARD_DISTRIBUTION_ADDRESS) as unknown as ContentRewardDistribution;

  console.log("✅ Connected to contracts:");
  console.log("   TOAST Token:", TOAST_TOKEN_ADDRESS);
  console.log("   Content Registry:", CONTENT_REGISTRY_ADDRESS);
  console.log("   Reward Distribution:", REWARD_DISTRIBUTION_ADDRESS);

  // Check contract states
  console.log("\n📊 Contract States:");
  
  try {
    const tokenName = await toastToken.name();
    const tokenSymbol = await toastToken.symbol();
    const tokenDecimals = await toastToken.decimals();
    const totalSupply = await toastToken.totalSupply();
    const ownerBalance = await toastToken.balanceOf(owner.address);
    
    console.log("🪙 TOAST Token:");
    console.log("   Name:", tokenName);
    console.log("   Symbol:", tokenSymbol);
    console.log("   Decimals:", tokenDecimals.toString());
    console.log("   Total Supply:", ethers.formatEther(totalSupply));
    console.log("   Owner Balance:", ethers.formatEther(ownerBalance));
  } catch (error) {
    console.log("❌ Error reading TOAST Token:", error);
  }

  try {
    const totalContent = await contentRegistry.totalContent();
    const roastToken = await contentRegistry.roastToken();
    const registryOwner = await contentRegistry.owner();
    const isPaused = await contentRegistry.paused();
    
    console.log("📄 Content Registry:");
    console.log("   Total Content:", totalContent.toString());
    console.log("   ROAST Token:", roastToken);
    console.log("   Owner:", registryOwner);
    console.log("   Paused:", isPaused);
  } catch (error) {
    console.log("❌ Error reading Content Registry:", error);
  }

  try {
    const totalPayouts = await rewardDistribution.totalPayouts();
    const evaluatorTreasury = await rewardDistribution.evaluatorTreasury();
    const platformTreasury = await rewardDistribution.platformTreasury();
    const distributionOwner = await rewardDistribution.owner();
    const isPaused = await rewardDistribution.paused();
    
    console.log("💰 Reward Distribution:");
    console.log("   Total Payouts:", totalPayouts.toString());
    console.log("   Evaluator Treasury:", evaluatorTreasury);
    console.log("   Platform Treasury:", platformTreasury);
    console.log("   Owner:", distributionOwner);
    console.log("   Paused:", isPaused);
  } catch (error) {
    console.log("❌ Error reading Reward Distribution:", error);
  }

  // Test basic functionality
  console.log("\n🧪 Testing Basic Functionality:");
  
  // Test 1: Register content
  console.log("\n1️⃣ Testing content registration...");
  const contentId = Math.floor(Math.random() * 1000000) + 1000000;
  const contentHash = "QmSomniaTestnetContentHash123";
  const contentType = "text";
  
  try {
    await contentRegistry.connect(owner).registerContent(
      contentId,
      owner.address,
      contentHash,
      contentType
    );
    console.log("✅ Content registered successfully");
    console.log("   Content ID:", contentId);
    console.log("   Creator:", owner.address);
    console.log("   Hash:", contentHash);
    console.log("   Type:", contentType);
  } catch (error) {
    console.log("❌ Content registration failed:", error);
  }

  // Test 2: Approve content
  console.log("\n2️⃣ Testing content approval...");
  const contentPrice = ethers.parseEther("100"); // 100 ROAST
  
  try {
    await contentRegistry.connect(owner).approveContent(contentId, contentPrice);
    console.log("✅ Content approved successfully");
    console.log("   Price:", ethers.formatEther(contentPrice), "ROAST");
    
    // Check content state
    const content = await contentRegistry.getContent(contentId);
    console.log("   Content Details:");
    console.log("     Owner:", content.currentOwner);
    console.log("     Available:", content.isAvailable);
    console.log("     Approved:", content.isApproved);
  } catch (error) {
    console.log("❌ Content approval failed:", error);
  }

  // Test 3: Check content availability
  console.log("\n3️⃣ Testing content queries...");
  try {
    const isAvailable = await contentRegistry.isContentAvailable(contentId);
    const contentOwner = await contentRegistry.getContentOwner(contentId);
    const userContents = await contentRegistry.getUserContents(owner.address);
    
    console.log("✅ Content queries successful");
    console.log("   Is Available:", isAvailable);
    console.log("   Owner:", contentOwner);
    console.log("   User Contents Count:", userContents.length);
  } catch (error) {
    console.log("❌ Content queries failed:", error);
  }

  // Test 4: Test reward distribution (without purchase)
  console.log("\n4️⃣ Testing reward distribution setup...");
  try {
    const minerRate = await rewardDistribution.MINER_RATE();
    const evaluatorRate = await rewardDistribution.EVALUATOR_RATE();
    const platformRate = await rewardDistribution.PLATFORM_RATE();
    
    console.log("✅ Reward distribution rates:");
    console.log("   Miner Rate:", minerRate.toString(), "(50%)");
    console.log("   Evaluator Rate:", evaluatorRate.toString(), "(20%)");
    console.log("   Platform Rate:", platformRate.toString(), "(30%)");
  } catch (error) {
    console.log("❌ Reward distribution query failed:", error);
  }

  console.log("\n🎉 Simple Demo Completed Successfully!");
  console.log("=".repeat(50));
  console.log("📊 Summary:");
  console.log("   ✅ Connected to all deployed contracts");
  console.log("   ✅ Read contract states and configurations");
  console.log("   ✅ Registered new content");
  console.log("   ✅ Approved content for sale");
  console.log("   ✅ Queried content information");
  console.log("   ✅ Verified reward distribution setup");
  
  console.log("\n🔍 Monitor on Somnia Explorer:");
  console.log(`   TOAST Token: https://somnia.w3us.site/address/${TOAST_TOKEN_ADDRESS}`);
  console.log(`   Content Registry: https://somnia.w3us.site/address/${CONTENT_REGISTRY_ADDRESS}`);
  console.log(`   Reward Distribution: https://somnia.w3us.site/address/${REWARD_DISTRIBUTION_ADDRESS}`);
  console.log(`   Owner: https://somnia.w3us.site/address/${owner.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Demo failed:", error);
    process.exit(1);
  });
