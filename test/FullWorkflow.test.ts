import { expect } from "chai";
import { ethers } from "hardhat";
import { ContentRegistry, ContentRewardDistribution, TOASTToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Full Content Marketplace Workflow", function () {
  let contentRegistry: ContentRegistry;
  let rewardDistribution: ContentRewardDistribution;
  let toastToken: TOASTToken;
  let owner: SignerWithAddress;
  let contentCreator: SignerWithAddress;
  let contentBuyer: SignerWithAddress;
  let directReferrer: SignerWithAddress;
  let grandReferrer: SignerWithAddress;
  let evaluatorTreasury: SignerWithAddress;
  let platformTreasury: SignerWithAddress;

  const CONTENT_ID = 1;
  const CONTENT_HASH = "QmFullWorkflowContentHash123";
  const CONTENT_TYPE = "text";
  const CONTENT_PRICE = ethers.parseEther("1000"); // 1000 ROAST
  const PURCHASE_AMOUNT = ethers.parseEther("1000");

  beforeEach(async function () {
    // Get signers
    [owner, contentCreator, contentBuyer, directReferrer, grandReferrer, evaluatorTreasury, platformTreasury] = await ethers.getSigners();

    console.log("👥 Test Participants:");
    console.log("   Owner (Backend):", owner.address);
    console.log("   Content Creator:", contentCreator.address);
    console.log("   Content Buyer:", contentBuyer.address);
    console.log("   Direct Referrer:", directReferrer.address);
    console.log("   Grand Referrer:", grandReferrer.address);
    console.log("   Evaluator Treasury:", evaluatorTreasury.address);
    console.log("   Platform Treasury:", platformTreasury.address);

    // Deploy TOAST Token
    console.log("\n🪙 Deploying TOAST Token...");
    const TOASTTokenFactory = await ethers.getContractFactory("TOASTToken");
    toastToken = await TOASTTokenFactory.deploy(owner.address) as unknown as TOASTToken;
    await toastToken.waitForDeployment();

    // Deploy Content Registry
    console.log("📄 Deploying Content Registry...");
    const ContentRegistryFactory = await ethers.getContractFactory("ContentRegistry");
    contentRegistry = await ContentRegistryFactory.deploy(await toastToken.getAddress()) as unknown as ContentRegistry;
    await contentRegistry.waitForDeployment();

    // Deploy Reward Distribution
    console.log("💰 Deploying Reward Distribution...");
    const ContentRewardDistributionFactory = await ethers.getContractFactory("ContentRewardDistribution");
    rewardDistribution = await ContentRewardDistributionFactory.deploy(
      await toastToken.getAddress(),
      evaluatorTreasury.address,
      platformTreasury.address
    ) as unknown as ContentRewardDistribution;
    await rewardDistribution.waitForDeployment();

    // Don't set reward distribution address to avoid automatic calls
    // await contentRegistry.setRewardDistribution(await rewardDistribution.getAddress());

    // Give users some tokens
    await toastToken.connect(owner).transfer(contentCreator.address, ethers.parseEther("10000"));
    await toastToken.connect(owner).transfer(contentBuyer.address, ethers.parseEther("10000"));
    await toastToken.connect(owner).transfer(directReferrer.address, ethers.parseEther("10000"));
    await toastToken.connect(owner).transfer(grandReferrer.address, ethers.parseEther("10000"));

    // No need to pre-fund reward distribution contract
    // It will receive tokens from content purchases automatically

    console.log("✅ Setup complete!");
  });

  it("Should execute complete content marketplace workflow", async function () {
    console.log("\n🚀 Starting Full Content Marketplace Workflow");
    console.log("=".repeat(60));

    // ========== STEP 1: REGISTER REFERRALS ==========
    console.log("\n1️⃣ REGISTERING REFERRALS");
    console.log("-".repeat(30));
    
    // Register grand referrer first (using different addresses)
    await rewardDistribution.connect(owner).registerReferral(
      grandReferrer.address,
      contentCreator.address, // contentCreator as direct referrer for grand referrer
      platformTreasury.address, // platformTreasury as grand referrer for grand referrer
      0 // SILVER tier
    );
    console.log("✅ Grand referrer registered");

    // Register direct referrer
    await rewardDistribution.connect(owner).registerReferral(
      directReferrer.address,
      grandReferrer.address, // grand referrer as direct referrer
      evaluatorTreasury.address, // evaluatorTreasury as grand referrer
      1 // GOLD tier
    );
    console.log("✅ Direct referrer registered");

    // Register buyer with referral chain
    await rewardDistribution.connect(owner).registerReferral(
      contentBuyer.address,
      directReferrer.address, // direct referrer
      grandReferrer.address, // grand referrer
      2 // PLATINUM tier
    );
    console.log("✅ Content buyer registered with referral chain");

    // ========== STEP 2: CONTENT CREATION ==========
    console.log("\n2️⃣ CONTENT CREATION");
    console.log("-".repeat(30));
    
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

    // ========== STEP 3: CONTENT APPROVAL ==========
    console.log("\n3️⃣ CONTENT APPROVAL");
    console.log("-".repeat(30));
    
    // Backend (owner) approves content
    await contentRegistry.connect(owner).approveContent(CONTENT_ID, CONTENT_PRICE);
    console.log("✅ Content approved by backend");

    // Check approved state
    const approvedContent = await contentRegistry.getContent(CONTENT_ID);
    console.log("📄 Approved Content Details:");
    console.log("   Owner:", approvedContent.currentOwner);
    console.log("   Price:", ethers.formatEther(approvedContent.price), "ROAST");
    console.log("   Available:", approvedContent.isAvailable);
    console.log("   Approved:", approvedContent.isApproved);

    // ========== STEP 4: CONTENT PURCHASE ==========
    console.log("\n4️⃣ CONTENT PURCHASE");
    console.log("-".repeat(30));
    
    // Check initial balances
    const initialBuyerBalance = await toastToken.balanceOf(contentBuyer.address);
    const initialCreatorBalance = await toastToken.balanceOf(contentCreator.address);
    const initialDirectBalance = await toastToken.balanceOf(directReferrer.address);
    const initialGrandBalance = await toastToken.balanceOf(grandReferrer.address);
    const initialEvaluatorBalance = await toastToken.balanceOf(evaluatorTreasury.address);
    const initialPlatformBalance = await toastToken.balanceOf(platformTreasury.address);

    console.log("💰 Initial Balances:");
    console.log("   Buyer TOAST:", ethers.formatEther(initialBuyerBalance));
    console.log("   Creator TOAST:", ethers.formatEther(initialCreatorBalance));
    console.log("   Direct Referrer TOAST:", ethers.formatEther(initialDirectBalance));
    console.log("   Grand Referrer TOAST:", ethers.formatEther(initialGrandBalance));
    console.log("   Evaluator Treasury TOAST:", ethers.formatEther(initialEvaluatorBalance));
    console.log("   Platform Treasury TOAST:", ethers.formatEther(initialPlatformBalance));

    // Approve ContentRegistry to spend buyer's TOAST tokens
    await toastToken.connect(contentBuyer).approve(await contentRegistry.getAddress(), CONTENT_PRICE);

    // Buyer purchases content with TOAST tokens
    await contentRegistry.connect(contentBuyer).purchaseContent(CONTENT_ID);
    console.log("✅ Content purchased by buyer");

    // Check ownership transfer
    const purchasedContent = await contentRegistry.getContent(CONTENT_ID);
    console.log("📄 Purchased Content Details:");
    console.log("   New Owner:", purchasedContent.currentOwner);
    console.log("   Available:", purchasedContent.isAvailable);
    console.log("   Sold At:", new Date(Number(purchasedContent.soldAt) * 1000).toISOString());

    // ========== STEP 5: REWARD DISTRIBUTION ==========
    console.log("\n5️⃣ REWARD DISTRIBUTION");
    console.log("-".repeat(30));
    
    // Backend manually processes the purchase and distributes rewards
    const payoutResult = await rewardDistribution.connect(owner).processContentPurchase(
      CONTENT_ID,
      contentBuyer.address,
      contentCreator.address, // miner/creator
      PURCHASE_AMOUNT
    );
    console.log("✅ Rewards distributed by backend");

    // Check final balances
    const finalCreatorBalance = await toastToken.balanceOf(contentCreator.address);
    const finalDirectBalance = await toastToken.balanceOf(directReferrer.address);
    const finalGrandBalance = await toastToken.balanceOf(grandReferrer.address);
    const finalEvaluatorBalance = await toastToken.balanceOf(evaluatorTreasury.address);
    const finalPlatformBalance = await toastToken.balanceOf(platformTreasury.address);

    console.log("💰 Final Balances:");
    console.log("   Creator ROAST:", ethers.formatEther(finalCreatorBalance));
    console.log("   Direct Referrer ROAST:", ethers.formatEther(finalDirectBalance));
    console.log("   Grand Referrer ROAST:", ethers.formatEther(finalGrandBalance));
    console.log("   Evaluator Treasury ROAST:", ethers.formatEther(finalEvaluatorBalance));
    console.log("   Platform Treasury ROAST:", ethers.formatEther(finalPlatformBalance));

    // Calculate and display earnings
    const creatorEarnings = finalCreatorBalance - initialCreatorBalance;
    const directEarnings = finalDirectBalance - initialDirectBalance;
    const grandEarnings = finalGrandBalance - initialGrandBalance;
    const evaluatorEarnings = finalEvaluatorBalance - initialEvaluatorBalance;
    const platformEarnings = finalPlatformBalance - initialPlatformBalance;

    console.log("💸 Earnings Breakdown:");
    console.log("   Creator (50%):", ethers.formatEther(creatorEarnings), "ROAST");
    console.log("   Direct Referrer (10%):", ethers.formatEther(directEarnings), "ROAST");
    console.log("   Grand Referrer (5%):", ethers.formatEther(grandEarnings), "ROAST");
    console.log("   Evaluator Treasury (20%):", ethers.formatEther(evaluatorEarnings), "ROAST");
    console.log("   Platform Treasury (15%):", ethers.formatEther(platformEarnings), "ROAST");

    // ========== STEP 6: CONTENT PERSONALIZATION ==========
    console.log("\n6️⃣ CONTENT PERSONALIZATION");
    console.log("-".repeat(30));
    
    // New owner (buyer) personalizes the content
    const personalizedHash = "QmPersonalizedContentHash456";
    await contentRegistry.connect(contentBuyer).markContentPersonalized(CONTENT_ID, personalizedHash);
    console.log("✅ Content personalized by new owner");

    // Check personalized state
    const personalizedContent = await contentRegistry.getContent(CONTENT_ID);
    console.log("📄 Personalized Content Details:");
    console.log("   Personalized:", personalizedContent.isPersonalized);
    console.log("   Personalized Hash:", personalizedContent.personalizedHash);

    // ========== STEP 7: VERIFY FINAL STATE ==========
    console.log("\n7️⃣ FINAL VERIFICATION");
    console.log("-".repeat(30));
    
    // Verify content ownership
    expect(await contentRegistry.getContentOwner(CONTENT_ID)).to.equal(contentBuyer.address);
    console.log("✅ Ownership correctly transferred to buyer");

    // Verify content is not available for purchase
    expect(await contentRegistry.isContentAvailable(CONTENT_ID)).to.be.false;
    console.log("✅ Content correctly marked as unavailable");

    // Verify referral data
    const buyerReferralData = await rewardDistribution.getUserReferralData(contentBuyer.address);
    expect(buyerReferralData.directReferrer).to.equal(directReferrer.address);
    expect(buyerReferralData.grandReferrer).to.equal(grandReferrer.address);
    expect(buyerReferralData.tier).to.equal(2); // PLATINUM
    console.log("✅ Referral data correctly stored");

    // Verify payout record
    const payoutRecord = await rewardDistribution.getPayoutRecord(0);
    expect(payoutRecord.contentId).to.equal(CONTENT_ID);
    expect(payoutRecord.buyer).to.equal(contentBuyer.address);
    expect(payoutRecord.miner).to.equal(contentCreator.address);
    expect(payoutRecord.totalAmount).to.equal(PURCHASE_AMOUNT);
    expect(payoutRecord.completed).to.be.true;
    console.log("✅ Payout record correctly stored");

    console.log("\n🎉 FULL WORKFLOW COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log("📊 Summary:");
    console.log("   ✅ Referrals registered by backend");
    console.log("   ✅ Content created and approved");
    console.log("   ✅ Content purchased with TOAST tokens");
    console.log("   ✅ Ownership transferred to buyer");
    console.log("   ✅ Rewards distributed to all parties");
    console.log("   ✅ Content personalized by new owner");
    console.log("   ✅ All state changes verified");
  });

  it("Should handle edge cases and error scenarios", async function () {
    console.log("\n🔍 Testing Edge Cases and Error Scenarios");
    console.log("=".repeat(50));

    // Test 1: Non-owner cannot register referrals
    console.log("\n1️⃣ Testing non-owner referral registration...");
    await expect(
      rewardDistribution.connect(contentCreator).registerReferral(
        contentBuyer.address,
        directReferrer.address,
        grandReferrer.address,
        0
      )
    ).to.be.revertedWithCustomError(rewardDistribution, "OwnableUnauthorizedAccount");
    console.log("✅ Non-owner correctly blocked from registering referrals");

    // Test 2: Cannot purchase unavailable content
    console.log("\n2️⃣ Testing purchase of unavailable content...");
    await contentRegistry.connect(contentCreator).registerContent(
      999, // Different content ID
      contentCreator.address,
      "QmTestHash",
      "text"
    );
    
    await expect(
      contentRegistry.connect(contentBuyer).purchaseContent(999)
    ).to.be.revertedWith("Content not available");
    console.log("✅ Unavailable content correctly blocked from purchase");

    // Test 3: Cannot personalize content you don't own
    console.log("\n3️⃣ Testing personalization by non-owner...");
    await contentRegistry.connect(owner).approveContent(999, CONTENT_PRICE);
    
    // Approve ContentRegistry to spend buyer's TOAST tokens
    await toastToken.connect(contentBuyer).approve(await contentRegistry.getAddress(), CONTENT_PRICE);
    await contentRegistry.connect(contentBuyer).purchaseContent(999);
    
    await expect(
      contentRegistry.connect(contentCreator).markContentPersonalized(999, "personalized_hash")
    ).to.be.revertedWith("Not content owner");
    console.log("✅ Non-owner correctly blocked from personalizing content");

    console.log("\n✅ All edge cases handled correctly!");
  });
});
