import { ethers } from "hardhat";
import { ContentRewardDistribution, TOASTToken } from "../typechain-types";
import { somniaExplorer } from "./somniaExplorerAPI";

// Get contract addresses from environment
const REWARD_DISTRIBUTION_ADDRESS = process.env.REWARD_DISTRIBUTION_ADDRESS || "";
const TOAST_TOKEN_ADDRESS = process.env.TOAST_TOKEN_ADDRESS || "";
const EVALUATOR_TREASURY = process.env.EVALUATOR_TREASURY || "";
const PLATFORM_TREASURY = process.env.PLATFORM_TREASURY || "";

async function main() {
  const rewardDistributionAddress = REWARD_DISTRIBUTION_ADDRESS || "0x0000000000000000000000000000000000000000";
  const toastTokenAddress = TOAST_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000";
  const evaluatorTreasury = EVALUATOR_TREASURY || "0x0000000000000000000000000000000000000000";
  const platformTreasury = PLATFORM_TREASURY || "0x0000000000000000000000000000000000000000";
  
  if (!REWARD_DISTRIBUTION_ADDRESS || !TOAST_TOKEN_ADDRESS) {
    console.log("⚠️ Some environment variables not set, using placeholder addresses for testing");
    console.log("   To test with real contracts, set:");
    console.log("   - REWARD_DISTRIBUTION_ADDRESS");
    console.log("   - TOAST_TOKEN_ADDRESS");
  }
  
  console.log("🔍 Interacting with Reward Distribution Contract");
  console.log("📍 Reward Distribution:", rewardDistributionAddress);
  console.log("📍 TOAST Token:", toastTokenAddress);
  console.log("📍 Evaluator Treasury:", evaluatorTreasury);
  console.log("📍 Platform Treasury:", platformTreasury);
  
  // Get signers
  const [owner, user1, user2, buyer, directReferrer, grandReferrer] = await ethers.getSigners();
  console.log("👤 Owner address:", owner.address);
  console.log("👤 User1 address:", user1.address);
  console.log("👤 User2 address:", user2.address);
  console.log("👤 Buyer address:", buyer.address);
  console.log("👤 Direct Referrer:", directReferrer.address);
  console.log("👤 Grand Referrer:", grandReferrer.address);
  
  // Connect to contracts
  const rewardDistribution = await ethers.getContractAt("ContentRewardDistribution", rewardDistributionAddress) as unknown as ContentRewardDistribution;
  const toastToken = await ethers.getContractAt("TOASTToken", toastTokenAddress);
  
  console.log("\n📊 Current Contract State:");
  
  // Check if contracts are deployed
  const isRewardDistributionDeployed = rewardDistributionAddress !== "0x0000000000000000000000000000000000000000";
  const isToastTokenDeployed = toastTokenAddress !== "0x0000000000000000000000000000000000000000";
  
  if (isRewardDistributionDeployed) {
    try {
      const totalPayouts = await rewardDistribution.totalPayouts();
      const evaluatorTreasuryAddr = await rewardDistribution.evaluatorTreasury();
      const platformTreasuryAddr = await rewardDistribution.platformTreasury();
      const distributionOwner = await rewardDistribution.owner();
      
      console.log("💰 Reward Distribution:");
      console.log("   Total Payouts:", totalPayouts.toString());
      console.log("   Evaluator Treasury:", evaluatorTreasuryAddr);
      console.log("   Platform Treasury:", platformTreasuryAddr);
      console.log("   Owner:", distributionOwner);
    } catch (error) {
      console.log("💰 Reward Distribution: ❌ Error reading contract state");
    }
  } else {
    console.log("💰 Reward Distribution: ⏳ Not deployed (using placeholder address)");
  }
  
  if (isToastTokenDeployed) {
    try {
      const tokenName = await toastToken.name();
      const tokenSymbol = await toastToken.symbol();
      const totalSupply = await toastToken.totalSupply();
      const ownerBalance = await toastToken.balanceOf(owner.address);
      
      console.log("🪙 TOAST Token:");
      console.log("   Name:", tokenName);
      console.log("   Symbol:", tokenSymbol);
      console.log("   Total Supply:", ethers.formatEther(totalSupply));
      console.log("   Owner Balance:", ethers.formatEther(ownerBalance));
    } catch (error) {
      console.log("🪙 TOAST Token: ❌ Error reading contract state");
    }
  } else {
    console.log("🪙 TOAST Token: ⏳ Not deployed (using placeholder address)");
  }
  
  console.log("\n🔄 Testing Reward Distribution Functions...");
  
  if (!isRewardDistributionDeployed) {
    console.log("⏳ Skipping Reward Distribution tests - contract not deployed");
  } else {
    // Test 1: Register referrals
    console.log("\n1️⃣ Registering test referrals...");
    try {
      // Register buyer with SILVER tier referral
      const registerReferralTx = await rewardDistribution.connect(owner).registerReferral(
        buyer.address,
        directReferrer.address,
        grandReferrer.address,
        0 // SILVER tier
      );
      await registerReferralTx.wait();
      console.log("✅ Referral registered successfully (SILVER tier)");
      console.log("🔗 Transaction:", `https://somnia.w3us.site/tx/${registerReferralTx.hash}`);
    } catch (error) {
      console.log("❌ Referral registration failed:", error);
    }
    
    // Test 2: Check referral data
    console.log("\n2️⃣ Checking referral data...");
    try {
      const referralData = await rewardDistribution.getUserReferralData(buyer.address);
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
    
    // Test 3: Calculate referral payout
    console.log("\n3️⃣ Calculating referral payout...");
    try {
      const purchaseAmount = ethers.parseEther("1000"); // 1000 ROAST
      const [directAmount, grandAmount, totalAmount] = await rewardDistribution.calculateReferralPayout(
        buyer.address,
        purchaseAmount
      );
      
      console.log("💰 Referral Payout Calculation (SILVER tier):");
      console.log("   Purchase Amount:", ethers.formatEther(purchaseAmount), "ROAST");
      console.log("   Direct Referrer Amount:", ethers.formatEther(directAmount), "ROAST (5%)");
      console.log("   Grand Referrer Amount:", ethers.formatEther(grandAmount), "ROAST (2.5%)");
      console.log("   Total Referral Amount:", ethers.formatEther(totalAmount), "ROAST (7.5%)");
    } catch (error) {
      console.log("❌ Referral calculation failed:", error);
    }
    
    // Test 4: Update referral tier
    console.log("\n4️⃣ Updating referral tier to GOLD...");
    try {
      const updateTierTx = await rewardDistribution.connect(owner).updateReferralTier(buyer.address, 1); // GOLD
      await updateTierTx.wait();
      console.log("✅ Referral tier updated to GOLD successfully");
      console.log("🔗 Transaction:", `https://somnia.w3us.site/tx/${updateTierTx.hash}`);
      
      // Recalculate with GOLD tier
      const purchaseAmount = ethers.parseEther("1000");
      const [directAmount, grandAmount, totalAmount] = await rewardDistribution.calculateReferralPayout(
        buyer.address,
        purchaseAmount
      );
      
      console.log("💰 Referral Payout Calculation (GOLD tier):");
      console.log("   Purchase Amount:", ethers.formatEther(purchaseAmount), "ROAST");
      console.log("   Direct Referrer Amount:", ethers.formatEther(directAmount), "ROAST (7.5%)");
      console.log("   Grand Referrer Amount:", ethers.formatEther(grandAmount), "ROAST (3.75%)");
      console.log("   Total Referral Amount:", ethers.formatEther(totalAmount), "ROAST (11.25%)");
    } catch (error) {
      console.log("❌ Referral tier update failed:", error);
    }
    
    // Test 5: Process content purchase (if tokens are available)
    console.log("\n5️⃣ Testing content purchase processing...");
    try {
      if (isToastTokenDeployed) {
        // Give the contract some tokens to distribute
        await toastToken.connect(owner).transfer(rewardDistributionAddress, ethers.parseEther("10000"));
        
        const purchaseAmount = ethers.parseEther("1000"); // 1000 ROAST
        const processTx = await rewardDistribution.connect(owner).processContentPurchase(
          user1.address, // miner
          buyer.address, // buyer with referral
          purchaseAmount
        );
        await processTx.wait();
        console.log("✅ Content purchase processed successfully");
        console.log("🔗 Transaction:", `https://somnia.w3us.site/tx/${processTx.hash}`);
        
        // Check balances after processing
        const minerBalance = await toastToken.balanceOf(user1.address);
        const evaluatorBalance = await toastToken.balanceOf(evaluatorTreasury);
        const platformBalance = await toastToken.balanceOf(platformTreasury);
        const directBalance = await toastToken.balanceOf(directReferrer.address);
        const grandBalance = await toastToken.balanceOf(grandReferrer.address);
        
        console.log("📊 Balances After Processing:");
        console.log("   Miner Balance:", ethers.formatEther(minerBalance), "ROAST");
        console.log("   Evaluator Treasury:", ethers.formatEther(evaluatorBalance), "ROAST");
        console.log("   Platform Treasury:", ethers.formatEther(platformBalance), "ROAST");
        console.log("   Direct Referrer:", ethers.formatEther(directBalance), "ROAST");
        console.log("   Grand Referrer:", ethers.formatEther(grandBalance), "ROAST");
      } else {
        console.log("⏳ Skipping purchase processing test - TOAST token not deployed");
      }
    } catch (error) {
      console.log("❌ Content purchase processing failed:", error);
    }
    
    // Test 6: Check payout history
    console.log("\n6️⃣ Checking payout history...");
    try {
      const totalPayouts = await rewardDistribution.totalPayouts();
      console.log("📊 Payout History:");
      console.log("   Total Payouts:", totalPayouts.toString());
      
      if (totalPayouts > 0) {
        const payout = await rewardDistribution.getPayout(0);
        console.log("   Latest Payout:");
        console.log("     Miner:", payout.miner);
        console.log("     Buyer:", payout.buyer);
        console.log("     Amount:", ethers.formatEther(payout.amount), "ROAST");
        console.log("     Miner Amount:", ethers.formatEther(payout.minerAmount), "ROAST");
        console.log("     Timestamp:", new Date(Number(payout.timestamp) * 1000).toISOString());
      }
    } catch (error) {
      console.log("❌ Payout history query failed:", error);
    }
  }
  
  console.log("\n🎉 Reward Distribution interaction completed successfully!");
  
  // Final summary with explorer links
  console.log("\n🔍 Monitor all transactions on Somnia Shannon Explorer:");
  console.log(`   Reward Distribution: https://somnia.w3us.site/address/${rewardDistributionAddress}`);
  console.log(`   TOAST Token: https://somnia.w3us.site/address/${toastTokenAddress}`);
  console.log(`   Evaluator Treasury: https://somnia.w3us.site/address/${evaluatorTreasury}`);
  console.log(`   Platform Treasury: https://somnia.w3us.site/address/${platformTreasury}`);
  console.log(`   Owner: https://somnia.w3us.site/address/${owner.address}`);
  console.log(`   User1: https://somnia.w3us.site/address/${user1.address}`);
  console.log(`   Buyer: https://somnia.w3us.site/address/${buyer.address}`);
  console.log(`   Direct Referrer: https://somnia.w3us.site/address/${directReferrer.address}`);
  console.log(`   Grand Referrer: https://somnia.w3us.site/address/${grandReferrer.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Interaction failed:", error);
    process.exit(1);
  });
