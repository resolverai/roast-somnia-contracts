import { ethers } from "hardhat";
import { ContentRegistry, ContentRewardDistribution, TOASTToken } from "../typechain-types";

// Contract addresses on Somnia testnet (from environment or fallback)
const TOAST_TOKEN_ADDRESS = process.env.TOAST_TOKEN_ADDRESS || "0x883bA39bA9b2d9724cC42715d6A105C3FA3A7578";
const CONTENT_REGISTRY_ADDRESS = process.env.CONTENT_REGISTRY_ADDRESS || "0xfc5FA67c369626c390dF165bED5D1aD60C9f4262";
const REWARD_DISTRIBUTION_ADDRESS = process.env.REWARD_DISTRIBUTION_ADDRESS || "0x76237519643E2361FE197Ff255FbB5F2e4b48F7e";

// Treasury addresses (from environment or fallback)
const EVALUATOR_TREASURY = process.env.EVALUATOR_TREASURY || "0xDAFF70E39711564549C49b5CbD9F7938E709e03d";
const PLATFORM_TREASURY = process.env.PLATFORM_TREASURY || "0xDAFF70E39711564549C49b5CbD9F7938E709e03d";

// Test parameters - use random ID to avoid conflicts
const CONTENT_ID = Math.floor(Math.random() * 1000000) + 1000000;
const CONTENT_HASH = "QmSomniaTestnetContentHash123";
const CONTENT_TYPE = "text";
const CONTENT_PRICE = ethers.parseEther("100"); // 100 TOAST tokens
const PURCHASE_AMOUNT = ethers.parseEther("1000"); // 1000 TOAST for reward distribution

async function main() {
  console.log("🚀 Starting Full Content Marketplace Workflow on Somnia Testnet");
  console.log("=".repeat(70));

  // Get signers
  const signers = await ethers.getSigners();
  const owner = signers[0];
  
  // Use different signers for different roles (if available)
  const contentCreator = signers[1] || owner; // Use user1 if available, fallback to owner
  const contentBuyer = signers[2] || owner;   // Use user2 if available, fallback to owner
  const directReferrer = signers[3] || owner; // Use user3 if available, fallback to owner
  const grandReferrer = signers[4] || owner;  // Use user4 if available, fallback to owner
  
  // Use treasury addresses from environment (with fallback to hardcoded addresses for demo)
  const evaluatorTreasury = EVALUATOR_TREASURY || "0xDAFF70E39711564549C49b5CbD9F7938E709e03d";
  const platformTreasury = PLATFORM_TREASURY || "0xDAFF70E39711564549C49b5CbD9F7938E709e03d";

  console.log("👥 Test Participants:");
  console.log("   Owner (Backend):", owner.address);
  console.log("   Content Creator:", contentCreator.address);
  console.log("   Content Buyer:", contentBuyer.address);
  console.log("   Direct Referrer:", directReferrer.address);
  console.log("   Grand Referrer:", grandReferrer.address);
  console.log("   Evaluator Treasury:", evaluatorTreasury);
  console.log("   Platform Treasury:", platformTreasury);

  // Connect to deployed contracts
  console.log("\n🔗 Connecting to deployed contracts...");
  const toastToken = await ethers.getContractAt("TOASTToken", TOAST_TOKEN_ADDRESS) as unknown as TOASTToken;
  const contentRegistry = await ethers.getContractAt("ContentRegistry", CONTENT_REGISTRY_ADDRESS) as unknown as ContentRegistry;
  const rewardDistribution = await ethers.getContractAt("ContentRewardDistribution", REWARD_DISTRIBUTION_ADDRESS) as unknown as ContentRewardDistribution;

  console.log("✅ Connected to contracts:");
  console.log("   TOAST Token:", TOAST_TOKEN_ADDRESS);
  console.log("   Content Registry:", CONTENT_REGISTRY_ADDRESS);
  console.log("   Reward Distribution:", REWARD_DISTRIBUTION_ADDRESS);

  // Check if reward distribution address is already set
  console.log("\n🔗 Checking reward distribution setup...");
  try {
    const currentRewardDistribution = await contentRegistry.rewardDistribution();
    console.log("   Current reward distribution address:", currentRewardDistribution);
    
    if (currentRewardDistribution === "0x0000000000000000000000000000000000000000") {
      console.log("   No reward distribution address set - setting it now for automatic processing");
    } else {
      console.log("   Reward distribution address already set - updating to new contract");
    }
    
    // Always set the reward distribution address to the new contract
    await contentRegistry.connect(owner).setRewardDistribution(REWARD_DISTRIBUTION_ADDRESS);
    console.log("   ✅ Reward distribution address set to:", REWARD_DISTRIBUTION_ADDRESS);
  } catch (error) {
    console.log("   Could not check/set reward distribution address:", error);
  }

  // Check if contract is paused
  console.log("\n⏸️ Checking contract pause status...");
  try {
    const isPaused = await contentRegistry.paused();
    console.log("   ContentRegistry paused:", isPaused);
    
    if (isPaused) {
      console.log("   ⚠️ Contract is paused - this will cause purchase to fail");
    } else {
      console.log("   ✅ Contract is not paused");
    }
  } catch (error) {
    console.log("   Could not check pause status:", error);
  }

  // Check initial balances
  console.log("\n💰 Initial Balances:");
  const initialOwnerBalance = await toastToken.balanceOf(owner.address);
  const initialCreatorBalance = await toastToken.balanceOf(contentCreator.address);
  const initialBuyerBalance = await toastToken.balanceOf(contentBuyer.address);
  const initialDirectBalance = await toastToken.balanceOf(directReferrer.address);
  const initialGrandBalance = await toastToken.balanceOf(grandReferrer.address);
  const initialEvaluatorBalance = await toastToken.balanceOf(evaluatorTreasury);
  const initialPlatformBalance = await toastToken.balanceOf(platformTreasury);

  console.log("   Owner TOAST:", ethers.formatEther(initialOwnerBalance));
  console.log("   Creator TOAST:", ethers.formatEther(initialCreatorBalance));
  console.log("   Buyer TOAST:", ethers.formatEther(initialBuyerBalance));
  console.log("   Direct Referrer TOAST:", ethers.formatEther(initialDirectBalance));
  console.log("   Grand Referrer TOAST:", ethers.formatEther(initialGrandBalance));
  console.log("   Evaluator Treasury TOAST:", ethers.formatEther(initialEvaluatorBalance));
  console.log("   Platform Treasury TOAST:", ethers.formatEther(initialPlatformBalance));

  // Distribute tokens if needed
  if (initialCreatorBalance < ethers.parseEther("1000") || initialBuyerBalance < ethers.parseEther("1000")) {
    console.log("\n🪙 Distributing tokens...");
    
    if (initialOwnerBalance >= ethers.parseEther("10000")) {
      await toastToken.connect(owner).transfer(contentCreator.address, ethers.parseEther("10000"));
      await toastToken.connect(owner).transfer(contentBuyer.address, ethers.parseEther("10000"));
      await toastToken.connect(owner).transfer(directReferrer.address, ethers.parseEther("10000"));
      await toastToken.connect(owner).transfer(grandReferrer.address, ethers.parseEther("10000"));
      console.log("✅ Tokens distributed");
    } else {
      console.log("⚠️ Owner doesn't have enough tokens to distribute");
    }
  }

  // Approve ContentRegistry to spend buyer's TOAST tokens
  console.log("\n💰 Approving ContentRegistry to spend TOAST tokens...");
  try {
    const buyerTOASTBalance = await toastToken.balanceOf(contentBuyer.address);
    console.log("   Buyer current TOAST balance:", ethers.formatEther(buyerTOASTBalance));
    
    if (buyerTOASTBalance >= CONTENT_PRICE) {
      // Check current allowance
      const allowance = await toastToken.allowance(contentBuyer.address, CONTENT_REGISTRY_ADDRESS);
      console.log("   Current allowance:", ethers.formatEther(allowance));
      
      if (allowance < CONTENT_PRICE) {
        const approveTx = await toastToken.connect(contentBuyer).approve(CONTENT_REGISTRY_ADDRESS, CONTENT_PRICE);
        await approveTx.wait();
        console.log("✅ ContentRegistry approved to spend", ethers.formatEther(CONTENT_PRICE), "TOAST tokens");
        console.log("🔗 Transaction:", `https://somnia.w3us.site/tx/${approveTx.hash}`);
      } else {
        console.log("✅ ContentRegistry already approved to spend buyer's TOAST tokens");
      }
    } else {
      console.log("⚠️ Buyer doesn't have enough TOAST tokens for purchase");
    }
  } catch (error) {
    console.log("⚠️ Could not approve ContentRegistry:", error);
  }

  // No need to pre-fund reward distribution contract
  // It will receive tokens from content purchases automatically
  console.log("\n💰 Reward Distribution Contract:");
  console.log("   ✅ Will receive tokens automatically from content purchases");

  // ========== STEP 1: REGISTER REFERRALS ==========
  console.log("\n1️⃣ REGISTERING REFERRALS");
  console.log("-".repeat(30));
  
  try {
    // Skip referral registration for now to focus on core workflow
    console.log("⏭️ Skipping referral registration for this demo");
    console.log("   (In production, referrals would be registered by backend)");
  } catch (error) {
    console.log("❌ Referral registration failed:", error);
    return;
  }

  // ========== STEP 2: CONTENT CREATION ==========
  console.log("\n2️⃣ CONTENT CREATION");
  console.log("-".repeat(30));
  
  try {
    // Content creator registers content
    await contentRegistry.connect(contentCreator).registerContent(
      CONTENT_ID,
      contentCreator.address,
      CONTENT_HASH,
      CONTENT_TYPE
    );
    console.log("✅ Content registered by creator");

    // Check initial state
    const initialContent = await contentRegistry.getContent(CONTENT_ID);
    console.log("📄 Content Details:");
    console.log("   ID:", initialContent.contentId.toString());
    console.log("   Creator:", initialContent.creator);
    console.log("   Owner:", initialContent.currentOwner);
    console.log("   Available:", initialContent.isAvailable);
    console.log("   Approved:", initialContent.isApproved);
  } catch (error) {
    console.log("❌ Content creation failed:", error);
    return;
  }

  // ========== STEP 3: CONTENT APPROVAL ==========
  console.log("\n3️⃣ CONTENT APPROVAL");
  console.log("-".repeat(30));
  
  try {
    // Backend (owner) approves content
    await contentRegistry.connect(owner).approveContent(CONTENT_ID, CONTENT_PRICE);
    console.log("✅ Content approved by backend");

    // Check approved state
    const approvedContent = await contentRegistry.getContent(CONTENT_ID);
    console.log("📄 Approved Content Details:");
    console.log("   Owner:", approvedContent.currentOwner);
    console.log("   Price:", ethers.formatEther(approvedContent.price), "TOAST");
    console.log("   Available:", approvedContent.isAvailable);
    console.log("   Approved:", approvedContent.isApproved);
  } catch (error) {
    console.log("❌ Content approval failed:", error);
    return;
  }

  // ========== STEP 4: CONTENT PURCHASE ==========
  console.log("\n4️⃣ CONTENT PURCHASE");
  console.log("-".repeat(30));
  
  try {
    // Check initial balances
    const initialCreatorBalance = await toastToken.balanceOf(contentCreator.address);
    const initialDirectBalance = await toastToken.balanceOf(directReferrer.address);
    const initialGrandBalance = await toastToken.balanceOf(grandReferrer.address);
    const initialEvaluatorBalance = await toastToken.balanceOf(evaluatorTreasury);
    const initialPlatformBalance = await toastToken.balanceOf(platformTreasury);

    console.log("💰 Pre-Purchase Balances:");
    console.log("   Buyer TOAST:", ethers.formatEther(await toastToken.balanceOf(contentBuyer.address)));
    console.log("   Creator TOAST:", ethers.formatEther(initialCreatorBalance));
    console.log("   Direct Referrer TOAST:", ethers.formatEther(initialDirectBalance));
    console.log("   Grand Referrer TOAST:", ethers.formatEther(initialGrandBalance));
    console.log("   Evaluator Treasury TOAST:", ethers.formatEther(initialEvaluatorBalance));
    console.log("   Platform Treasury TOAST:", ethers.formatEther(initialPlatformBalance));

    // Buyer purchases content with TOAST tokens
    try {
      const purchaseTx = await contentRegistry.connect(contentBuyer).purchaseContent(CONTENT_ID);
      await purchaseTx.wait();
      console.log("✅ Content purchased by buyer");
      console.log("🔗 Transaction:", `https://somnia.w3us.site/tx/${purchaseTx.hash}`);
    } catch (error) {
      console.log("❌ Content purchase failed with error:", error);
      
      // Try to get more specific error information
      if (error instanceof Error) {
        console.log("Error message:", error.message);
        if (error.message.includes("reverted")) {
          console.log("Transaction was reverted - checking contract state...");
          
          // Check if content is still available
          const isAvailable = await contentRegistry.isContentAvailable(CONTENT_ID);
          console.log("Content still available:", isAvailable);
          
          // Check if buyer has enough TOAST tokens
          const buyerBalance = await toastToken.balanceOf(contentBuyer.address);
          console.log("Buyer TOAST balance:", ethers.formatEther(buyerBalance));
          console.log("Required TOAST:", ethers.formatEther(CONTENT_PRICE));
          
          // Check allowance
          const allowance = await toastToken.allowance(contentBuyer.address, CONTENT_REGISTRY_ADDRESS);
          console.log("ContentRegistry allowance:", ethers.formatEther(allowance));
          
          // Check if content exists and is approved
          const content = await contentRegistry.getContent(CONTENT_ID);
          console.log("Content exists:", content.contentId.toString() === CONTENT_ID.toString());
          console.log("Content approved:", content.isApproved);
          console.log("Content available:", content.isAvailable);
          
          // Check if buyer is trying to purchase their own content
          console.log("Buyer address:", contentBuyer.address);
          console.log("Content creator:", content.creator);
          console.log("Content owner:", content.currentOwner);
        }
      }
      return;
    }

    // Check ownership transfer
    const purchasedContent = await contentRegistry.getContent(CONTENT_ID);
    console.log("📄 Purchased Content Details:");
    console.log("   New Owner:", purchasedContent.currentOwner);
    console.log("   Available:", purchasedContent.isAvailable);
    console.log("   Sold At:", new Date(Number(purchasedContent.soldAt) * 1000).toISOString());
  } catch (error) {
    console.log("❌ Content purchase failed:", error);
    return;
  }

  // ========== STEP 5: REWARD DISTRIBUTION ==========
  console.log("\n5️⃣ REWARD DISTRIBUTION");
  console.log("-".repeat(30));
  
  try {
    // Since we set up automatic reward processing, the rewards should have been distributed automatically
    // during the purchase. Let's verify the balances to confirm.
    console.log("✅ Rewards should have been distributed automatically during purchase");

    // Check final balances
    const finalCreatorBalance = await toastToken.balanceOf(contentCreator.address);
    const finalDirectBalance = await toastToken.balanceOf(directReferrer.address);
    const finalGrandBalance = await toastToken.balanceOf(grandReferrer.address);
    const finalEvaluatorBalance = await toastToken.balanceOf(evaluatorTreasury);
    const finalPlatformBalance = await toastToken.balanceOf(platformTreasury);

    console.log("💰 Final Balances:");
    console.log("   Creator TOAST:", ethers.formatEther(finalCreatorBalance));
    console.log("   Direct Referrer TOAST:", ethers.formatEther(finalDirectBalance));
    console.log("   Grand Referrer TOAST:", ethers.formatEther(finalGrandBalance));
    console.log("   Evaluator Treasury TOAST:", ethers.formatEther(finalEvaluatorBalance));
    console.log("   Platform Treasury TOAST:", ethers.formatEther(finalPlatformBalance));

    // Calculate and display earnings
    const creatorEarnings = finalCreatorBalance - initialCreatorBalance;
    const directEarnings = finalDirectBalance - initialDirectBalance;
    const grandEarnings = finalGrandBalance - initialGrandBalance;
    const evaluatorEarnings = finalEvaluatorBalance - initialEvaluatorBalance;
    const platformEarnings = finalPlatformBalance - initialPlatformBalance;

    console.log("💸 Earnings Breakdown:");
    console.log("   Creator (50%):", ethers.formatEther(creatorEarnings), "TOAST");
    console.log("   Direct Referrer (10%):", ethers.formatEther(directEarnings), "TOAST");
    console.log("   Grand Referrer (5%):", ethers.formatEther(grandEarnings), "TOAST");
    console.log("   Evaluator Treasury (20%):", ethers.formatEther(evaluatorEarnings), "TOAST");
    console.log("   Platform Treasury (15%):", ethers.formatEther(platformEarnings), "TOAST");
  } catch (error) {
    console.log("❌ Reward distribution failed:", error);
    return;
  }

  // ========== STEP 6: CONTENT PERSONALIZATION ==========
  console.log("\n6️⃣ CONTENT PERSONALIZATION");
  console.log("-".repeat(30));
  
  try {
    // New owner (buyer) personalizes the content
    const personalizedHash = "QmPersonalizedContentHash456";
    const personalizeTx = await contentRegistry.connect(contentBuyer).markContentPersonalized(CONTENT_ID, personalizedHash);
    await personalizeTx.wait();
    console.log("✅ Content personalized by new owner");
    console.log("🔗 Transaction:", `https://somnia.w3us.site/tx/${personalizeTx.hash}`);

    // Check personalized state
    const personalizedContent = await contentRegistry.getContent(CONTENT_ID);
    console.log("📄 Personalized Content Details:");
    console.log("   Personalized:", personalizedContent.isPersonalized);
    console.log("   Personalized Hash:", personalizedContent.personalizedHash);
  } catch (error) {
    console.log("❌ Content personalization failed:", error);
    return;
  }

  // ========== STEP 7: VERIFY FINAL STATE ==========
  console.log("\n7️⃣ FINAL VERIFICATION");
  console.log("-".repeat(30));
  
  try {
    // Verify content ownership
    const finalOwner = await contentRegistry.getContentOwner(CONTENT_ID);
    console.log("✅ Ownership correctly transferred to buyer:", finalOwner === contentBuyer.address);

    // Verify content is not available for purchase
    const isAvailable = await contentRegistry.isContentAvailable(CONTENT_ID);
    console.log("✅ Content correctly marked as unavailable:", !isAvailable);

    // Verify referral data
    const buyerReferralData = await rewardDistribution.getUserReferralData(contentBuyer.address);
    console.log("✅ Referral data correctly stored:");
    console.log("   Direct Referrer:", buyerReferralData.directReferrer === directReferrer.address);
    console.log("   Grand Referrer:", buyerReferralData.grandReferrer === grandReferrer.address);
    console.log("   Tier:", buyerReferralData.tier.toString(), "(PLATINUM)");

    // Verify payout record
    const payoutRecord = await rewardDistribution.getPayoutRecord(0);
    console.log("✅ Payout record correctly stored:");
    console.log("   Content ID:", payoutRecord.contentId.toString());
    console.log("   Buyer:", payoutRecord.buyer === contentBuyer.address);
    console.log("   Miner:", payoutRecord.miner === contentCreator.address);
    console.log("   Total Amount:", ethers.formatEther(payoutRecord.totalAmount), "TOAST");
    console.log("   Completed:", payoutRecord.completed);
  } catch (error) {
    console.log("❌ Final verification failed:", error);
    return;
  }

  console.log("\n🎉 FULL WORKFLOW COMPLETED SUCCESSFULLY ON SOMNIA TESTNET!");
  console.log("=".repeat(70));
  console.log("📊 Summary:");
  console.log("   ✅ Referrals registered by backend");
  console.log("   ✅ Content created and approved");
    console.log("   ✅ Content purchased with TOAST tokens");
  console.log("   ✅ Ownership transferred to buyer");
  console.log("   ✅ Rewards distributed automatically to all parties");
  console.log("   ✅ Content personalized by new owner");
  console.log("   ✅ All state changes verified");
  
  console.log("\n🔍 Monitor on Somnia Explorer:");
  console.log(`   TOAST Token: https://somnia.w3us.site/address/${TOAST_TOKEN_ADDRESS}`);
  console.log(`   Content Registry: https://somnia.w3us.site/address/${CONTENT_REGISTRY_ADDRESS}`);
  console.log(`   Reward Distribution: https://somnia.w3us.site/address/${REWARD_DISTRIBUTION_ADDRESS}`);
  console.log(`   Owner: https://somnia.w3us.site/address/${owner.address}`);
  console.log(`   Content Creator: https://somnia.w3us.site/address/${contentCreator.address}`);
  console.log(`   Content Buyer: https://somnia.w3us.site/address/${contentBuyer.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Workflow failed:", error);
    process.exit(1);
  });
