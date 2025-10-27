import { ethers } from "hardhat";
import { ContentRegistry, ContentRewardDistribution } from "../typechain-types";
import { somniaExplorer } from "./somniaExplorerAPI";

// Get contract addresses from environment
const CONTENT_REGISTRY_ADDRESS = process.env.CONTENT_REGISTRY_ADDRESS || "";
const REWARD_DISTRIBUTION_ADDRESS = process.env.REWARD_DISTRIBUTION_ADDRESS || "";
const TOAST_TOKEN_ADDRESS = process.env.TOAST_TOKEN_ADDRESS || "";

async function main() {
  // For testing purposes, use placeholder addresses if not set
  const contentRegistryAddress = CONTENT_REGISTRY_ADDRESS || "0x0000000000000000000000000000000000000000";
  const rewardDistributionAddress = REWARD_DISTRIBUTION_ADDRESS || "0x0000000000000000000000000000000000000000";
  const toastTokenAddress = TOAST_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000";
  
  if (!CONTENT_REGISTRY_ADDRESS || !REWARD_DISTRIBUTION_ADDRESS || !TOAST_TOKEN_ADDRESS) {
    console.log("⚠️ Some environment variables not set, using placeholder addresses for testing");
    console.log("   To test with real contracts, set:");
    console.log("   - CONTENT_REGISTRY_ADDRESS");
    console.log("   - REWARD_DISTRIBUTION_ADDRESS");
    console.log("   - TOAST_TOKEN_ADDRESS");
  }
  
  console.log("🔍 Interacting with Content Contracts");
  console.log("📍 Content Registry:", contentRegistryAddress);
  console.log("📍 Reward Distribution:", rewardDistributionAddress);
  console.log("📍 TOAST Token:", toastTokenAddress);
  
  // Get signers
  const [owner, user1, user2, user3] = await ethers.getSigners();
  console.log("👤 Owner address:", owner.address);
  console.log("👤 User1 address:", user1.address);
  console.log("👤 User2 address:", user2.address);
  console.log("👤 User3 address:", user3.address);
  
  // Connect to contracts
  const contentRegistry = await ethers.getContractAt("ContentRegistry", contentRegistryAddress) as unknown as ContentRegistry;
  const rewardDistribution = await ethers.getContractAt("ContentRewardDistribution", rewardDistributionAddress) as unknown as ContentRewardDistribution;
  const toastToken = await ethers.getContractAt("TOASTToken", toastTokenAddress);
  
  console.log("\n📊 Current Contract State:");
  
  // Check if contracts are deployed (not placeholder addresses)
  const isContentRegistryDeployed = contentRegistryAddress !== "0x0000000000000000000000000000000000000000";
  const isRewardDistributionDeployed = rewardDistributionAddress !== "0x0000000000000000000000000000000000000000";
  const isToastTokenDeployed = toastTokenAddress !== "0x0000000000000000000000000000000000000000";
  
  if (isContentRegistryDeployed) {
    try {
      // Content Registry state
      const totalContent = await contentRegistry.totalContent();
      const roastToken = await contentRegistry.roastToken();
      const registryOwner = await contentRegistry.owner();
      
      console.log("📄 Content Registry:");
      console.log("   Total Content:", totalContent.toString());
      console.log("   ROAST Token:", roastToken);
      console.log("   Owner:", registryOwner);
    } catch (error) {
      console.log("📄 Content Registry: ❌ Error reading contract state");
    }
  } else {
    console.log("📄 Content Registry: ⏳ Not deployed (using placeholder address)");
  }
  
  if (isRewardDistributionDeployed) {
    try {
      // Reward Distribution state
      const totalPayouts = await rewardDistribution.totalPayouts();
      const evaluatorTreasury = await rewardDistribution.evaluatorTreasury();
      const platformTreasury = await rewardDistribution.platformTreasury();
      const distributionOwner = await rewardDistribution.owner();
      
      console.log("💰 Reward Distribution:");
      console.log("   Total Payouts:", totalPayouts.toString());
      console.log("   Evaluator Treasury:", evaluatorTreasury);
      console.log("   Platform Treasury:", platformTreasury);
      console.log("   Owner:", distributionOwner);
    } catch (error) {
      console.log("💰 Reward Distribution: ❌ Error reading contract state");
    }
  } else {
    console.log("💰 Reward Distribution: ⏳ Not deployed (using placeholder address)");
  }
  
  if (isToastTokenDeployed) {
    try {
      // TOAST Token state
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
      console.log("🪙 TOAST Token: ❌ Error reading contract state");
    }
  } else {
    console.log("🪙 TOAST Token: ⏳ Not deployed (using placeholder address)");
  }
  
  console.log("\n🔄 Testing Content Registry Functions...");
  
  if (!isContentRegistryDeployed) {
    console.log("⏳ Skipping Content Registry tests - contract not deployed");
  } else {
    // Test 1: Register content
    console.log("\n1️⃣ Registering test content...");
    const contentId = 1;
    const contentHash = "QmTestContentHash123";
    const contentType = "text";
    
    try {
      const registerTx = await contentRegistry.registerContent(
        contentId,
        user1.address,
        contentHash,
        contentType
      );
      await registerTx.wait();
      console.log("✅ Content registered successfully");
      console.log("🔗 Transaction:", `https://somnia.w3us.site/tx/${registerTx.hash}`);
    } catch (error) {
      console.log("❌ Content registration failed:", error);
    }
    // Test 2: Approve content
    console.log("\n2️⃣ Approving content...");
    const price = ethers.parseEther("100"); // 100 ROAST
    
    try {
      const approveTx = await contentRegistry.approveContent(contentId, price);
      await approveTx.wait();
      console.log("✅ Content approved successfully");
      console.log("🔗 Transaction:", `https://somnia.w3us.site/tx/${approveTx.hash}`);
    } catch (error) {
      console.log("❌ Content approval failed:", error);
    }
    
    // Test 3: Check content state
    console.log("\n3️⃣ Checking content state...");
    try {
      const content = await contentRegistry.getContent(contentId);
      const isAvailable = await contentRegistry.isContentAvailable(contentId);
      const owner = await contentRegistry.getContentOwner(contentId);
      
      console.log("📄 Content Details:");
      console.log("   ID:", content.contentId.toString());
      console.log("   Creator:", content.creator);
      console.log("   Owner:", content.currentOwner);
      console.log("   Price:", ethers.formatEther(content.price), "ROAST");
      console.log("   Available:", content.isAvailable);
      console.log("   Approved:", content.isApproved);
      console.log("   Content Type:", content.contentType);
      console.log("   Is Available (query):", isAvailable);
      console.log("   Owner (query):", owner);
    } catch (error) {
      console.log("❌ Content query failed:", error);
    }
  }
  
  // Test 4: Register referrals
  console.log("\n4️⃣ Registering test referrals...");
  if (!isRewardDistributionDeployed) {
    console.log("⏳ Skipping referral tests - Reward Distribution contract not deployed");
  } else {
    try {
      // Register user2 as SILVER tier with user1 as direct referrer
      const registerReferralTx = await rewardDistribution.registerReferral(
        user2.address,
        user1.address, // direct referrer
        user3.address, // grand referrer
        0 // SILVER tier
      );
      await registerReferralTx.wait();
      console.log("✅ Referral registered successfully");
      console.log("🔗 Transaction:", `https://somnia.w3us.site/tx/${registerReferralTx.hash}`);
    } catch (error) {
      console.log("❌ Referral registration failed:", error);
    }
    
    // Test 5: Check referral data
    console.log("\n5️⃣ Checking referral data...");
    try {
      const referralData = await rewardDistribution.getUserReferralData(user2.address);
      console.log("📊 Referral Data:");
      console.log("   Direct Referrer:", referralData.directReferrer);
      console.log("   Grand Referrer:", referralData.grandReferrer);
      console.log("   Tier:", referralData.tier.toString());
      console.log("   Active:", referralData.isActive);
      console.log("   Total Earnings:", ethers.formatEther(referralData.totalEarnings), "ROAST");
      console.log("   Total Referrals:", referralData.totalReferrals.toString());
    } catch (error) {
      console.log("❌ Referral query failed:", error);
    }
    
    // Test 6: Calculate referral payout
    console.log("\n6️⃣ Calculating referral payout...");
    try {
      const purchaseAmount = ethers.parseEther("1000"); // 1000 ROAST
      const [directAmount, grandAmount, totalAmount] = await rewardDistribution.calculateReferralPayout(
        user2.address,
        purchaseAmount
      );
      
      console.log("💰 Referral Payout Calculation:");
      console.log("   Purchase Amount:", ethers.formatEther(purchaseAmount), "ROAST");
      console.log("   Direct Referrer Amount:", ethers.formatEther(directAmount), "ROAST");
      console.log("   Grand Referrer Amount:", ethers.formatEther(grandAmount), "ROAST");
      console.log("   Total Referral Amount:", ethers.formatEther(totalAmount), "ROAST");
    } catch (error) {
      console.log("❌ Referral calculation failed:", error);
    }
  }
  
  // Test 7: Set reward distribution in content registry
  console.log("\n7️⃣ Setting reward distribution address...");
  if (isContentRegistryDeployed && isRewardDistributionDeployed) {
    try {
      const setRewardTx = await contentRegistry.setRewardDistribution(rewardDistributionAddress);
      await setRewardTx.wait();
      console.log("✅ Reward distribution address set successfully");
      console.log("🔗 Transaction:", `https://somnia.w3us.site/tx/${setRewardTx.hash}`);
    } catch (error) {
      console.log("❌ Setting reward distribution failed:", error);
    }
  } else {
    console.log("⏳ Skipping reward distribution setup - contracts not deployed");
  }
  
  // Test 8: Check final state
  console.log("\n8️⃣ Checking final contract state...");
  try {
    if (isContentRegistryDeployed) {
      const finalTotalContent = await contentRegistry.totalContent();
      console.log("📊 Final State:");
      console.log("   Total Content:", finalTotalContent.toString());
    }
    if (isRewardDistributionDeployed) {
      const finalTotalPayouts = await rewardDistribution.totalPayouts();
      console.log("   Total Payouts:", finalTotalPayouts.toString());
    }
  } catch (error) {
    console.log("❌ Final state query failed:", error);
  }
  
  console.log("\n🎉 All interactions completed successfully!");
  
  // Final summary with explorer links
  console.log("\n🔍 Monitor all transactions on Somnia Shannon Explorer:");
  console.log(`   Content Registry: https://somnia.w3us.site/address/${contentRegistryAddress}`);
  console.log(`   Reward Distribution: https://somnia.w3us.site/address/${rewardDistributionAddress}`);
  console.log(`   TOAST Token: https://somnia.w3us.site/address/${toastTokenAddress}`);
  console.log(`   Owner: https://somnia.w3us.site/address/${owner.address}`);
  console.log(`   User1: https://somnia.w3us.site/address/${user1.address}`);
  console.log(`   User2: https://somnia.w3us.site/address/${user2.address}`);
  console.log(`   User3: https://somnia.w3us.site/address/${user3.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Interaction failed:", error);
    process.exit(1);
  });
