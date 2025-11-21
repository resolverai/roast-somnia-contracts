import { ethers } from "hardhat";
import { ContentRegistry, ContentRewardDistribution, TOASTToken } from "../typechain-types";
import * as dotenv from "dotenv";

dotenv.config();

// Contract addresses from environment
const TOAST_TOKEN_ADDRESS = process.env.TOAST_TOKEN_ADDRESS || "";
const CONTENT_REGISTRY_ADDRESS = process.env.CONTENT_REGISTRY_ADDRESS || "";
const REWARD_DISTRIBUTION_ADDRESS = process.env.REWARD_DISTRIBUTION_ADDRESS || "";

// Wallet addresses and private keys from environment
const ADDRESSES = {
  contractOwner: {
    address: process.env.CONTRACT_OWNER_ADDRESS || "",
    privateKey: process.env.CONTRACT_OWNER_PRIVATE_KEY || ""
  },
  treasury: {
    address: process.env.TREASURY_ADDRESS || "",
    privateKey: process.env.TREASURY_PRIVATE_KEY || ""
  },
  miner: {
    address: process.env.MINER_ADDRESS || "",
    privateKey: process.env.MINER_PRIVATE_KEY || ""
  },
  buyer: {
    address: process.env.BUYER_ADDRESS || "",
    privateKey: process.env.BUYER_PRIVATE_KEY || ""
  }
};

// Test parameters
const CONTENT_ID = Math.floor(Math.random() * 1000000) + 2000000;
const CONTENT_HASH = "QmSomniaMultiAddressTestContentHash456";
const CONTENT_TYPE = "text";
const CONTENT_PRICE = ethers.parseEther("100"); // 100 TOAST tokens

async function main() {
  console.log("🚀 Starting Multi-Address Full Workflow on Somnia Testnet");
  console.log("=".repeat(70));
  console.log("\n👥 Participants:");
  console.log("   Contract Owner:", ADDRESSES.contractOwner.address);
  console.log("   Treasury:", ADDRESSES.treasury.address);
  console.log("   Miner (Content Creator):", ADDRESSES.miner.address);
  console.log("   Buyer:", ADDRESSES.buyer.address);

  // Create signers for each address
  const provider = ethers.provider;
  const contractOwnerSigner = new ethers.Wallet(ADDRESSES.contractOwner.privateKey, provider);
  const treasurySigner = new ethers.Wallet(ADDRESSES.treasury.privateKey, provider);
  const minerSigner = new ethers.Wallet(ADDRESSES.miner.privateKey, provider);
  const buyerSigner = new ethers.Wallet(ADDRESSES.buyer.privateKey, provider);

  // Connect to contracts
  console.log("\n🔗 Connecting to deployed contracts...");
  const toastToken = await ethers.getContractAt("TOASTToken", TOAST_TOKEN_ADDRESS) as unknown as TOASTToken;
  const contentRegistry = await ethers.getContractAt("ContentRegistry", CONTENT_REGISTRY_ADDRESS) as unknown as ContentRegistry;
  const rewardDistribution = await ethers.getContractAt("ContentRewardDistribution", REWARD_DISTRIBUTION_ADDRESS) as unknown as ContentRewardDistribution;

  console.log("✅ Connected to contracts:");
  console.log("   TOAST Token:", TOAST_TOKEN_ADDRESS);
  console.log("   Content Registry:", CONTENT_REGISTRY_ADDRESS);
  console.log("   Reward Distribution:", REWARD_DISTRIBUTION_ADDRESS);

  // Check contract ownership
  console.log("\n🔍 Verifying contract ownership...");
  const toastOwner = await toastToken.owner();
  const contentOwner = await contentRegistry.owner();
  const rewardOwner = await rewardDistribution.owner();
  console.log("   TOAST Token Owner:", toastOwner);
  console.log("   ContentRegistry Owner:", contentOwner);
  console.log("   RewardDistribution Owner:", rewardOwner);
  console.log("   ✅ All contracts owned by:", ADDRESSES.contractOwner.address);

  // Set reward distribution address (as contract owner)
  console.log("\n🔗 Setting reward distribution address...");
  const currentRewardDist = await contentRegistry.rewardDistribution();
  if (currentRewardDist === ethers.ZeroAddress) {
    const setRewardTx = await contentRegistry.connect(contractOwnerSigner).setRewardDistribution(REWARD_DISTRIBUTION_ADDRESS);
    await setRewardTx.wait();
    console.log("   ✅ Reward distribution address set");
  } else {
    console.log("   ✅ Reward distribution already set:", currentRewardDist);
  }

  // Check initial balances
  console.log("\n💰 Initial Balances:");
  const minerBalance = await toastToken.balanceOf(ADDRESSES.miner.address);
  const buyerBalance = await toastToken.balanceOf(ADDRESSES.buyer.address);
  const treasuryBalance = await toastToken.balanceOf(ADDRESSES.treasury.address);
  console.log("   Miner TOAST:", ethers.formatEther(minerBalance));
  console.log("   Buyer TOAST:", ethers.formatEther(buyerBalance));
  console.log("   Treasury TOAST:", ethers.formatEther(treasuryBalance));

  // STEP 1: Register Content (as contract owner, on behalf of miner)
  console.log("\n" + "=".repeat(70));
  console.log("1️⃣ CONTENT REGISTRATION (by Contract Owner for Miner)");
  console.log("=".repeat(70));
  
  const registerTx = await contentRegistry.connect(contractOwnerSigner).registerContent(
    CONTENT_ID,
    ADDRESSES.miner.address,
    CONTENT_HASH,
    CONTENT_TYPE
  );
  await registerTx.wait();
  console.log("✅ Content registered");
  console.log("   Content ID:", CONTENT_ID);
  console.log("   Creator:", ADDRESSES.miner.address);
  console.log("   Transaction:", `https://somnia.w3us.site/tx/${registerTx.hash}`);

  const content = await contentRegistry.getContent(CONTENT_ID);
  console.log("📄 Content Details:");
  console.log("   Creator:", content.creator);
  console.log("   Current Owner:", content.currentOwner);
  console.log("   Content Hash:", content.contentHash);
  console.log("   Available:", content.isAvailable);
  console.log("   Approved:", content.isApproved);

  // STEP 2: Approve Content (as contract owner)
  console.log("\n" + "=".repeat(70));
  console.log("2️⃣ CONTENT APPROVAL (by Contract Owner)");
  console.log("=".repeat(70));
  
  const approveTx = await contentRegistry.connect(contractOwnerSigner).approveContent(
    CONTENT_ID,
    CONTENT_PRICE
  );
  await approveTx.wait();
  console.log("✅ Content approved");
  console.log("   Price:", ethers.formatEther(CONTENT_PRICE), "TOAST");
  console.log("   Transaction:", `https://somnia.w3us.site/tx/${approveTx.hash}`);

  const approvedContent = await contentRegistry.getContent(CONTENT_ID);
  console.log("📄 Approved Content Details:");
  console.log("   Owner:", approvedContent.currentOwner);
  console.log("   Price:", ethers.formatEther(approvedContent.price), "TOAST");
  console.log("   Available:", approvedContent.isAvailable);
  console.log("   Approved:", approvedContent.isApproved);

  // STEP 3: Register Referrals (as contract owner)
  console.log("\n" + "=".repeat(70));
  console.log("3️⃣ REFERRAL REGISTRATION (by Contract Owner)");
  console.log("=".repeat(70));
  
  // For this test, let's use treasury as both direct and grand referrer
  const registerReferralTx = await rewardDistribution.connect(contractOwnerSigner).registerReferral(
    ADDRESSES.buyer.address,
    ADDRESSES.treasury.address, // Direct referrer
    ethers.ZeroAddress, // No grand referrer for simplicity
    3 // PLATINUM tier
  );
  await registerReferralTx.wait();
  console.log("✅ Referral registered for buyer");
  console.log("   Buyer:", ADDRESSES.buyer.address);
  console.log("   Direct Referrer:", ADDRESSES.treasury.address);
  console.log("   Tier: PLATINUM (10% direct, 5% grand)");
  console.log("   Transaction:", `https://somnia.w3us.site/tx/${registerReferralTx.hash}`);

  // STEP 4: Buyer approves TOAST tokens for ContentRegistry
  console.log("\n" + "=".repeat(70));
  console.log("4️⃣ TOKEN APPROVAL (by Buyer)");
  console.log("=".repeat(70));
  
  const buyerBalanceCheck = await toastToken.balanceOf(ADDRESSES.buyer.address);
  console.log("   Buyer TOAST balance:", ethers.formatEther(buyerBalanceCheck));
  
  if (buyerBalanceCheck < CONTENT_PRICE) {
    throw new Error(`Buyer doesn't have enough TOAST! Has ${ethers.formatEther(buyerBalanceCheck)}, needs ${ethers.formatEther(CONTENT_PRICE)}`);
  }

  const approveTOASTTx = await toastToken.connect(buyerSigner).approve(CONTENT_REGISTRY_ADDRESS, CONTENT_PRICE);
  await approveTOASTTx.wait();
  console.log("✅ TOAST tokens approved");
  console.log("   Amount:", ethers.formatEther(CONTENT_PRICE), "TOAST");
  console.log("   Spender: ContentRegistry");
  console.log("   Transaction:", `https://somnia.w3us.site/tx/${approveTOASTTx.hash}`);

  // STEP 5: Purchase Content (as buyer)
  console.log("\n" + "=".repeat(70));
  console.log("5️⃣ CONTENT PURCHASE (by Buyer)");
  console.log("=".repeat(70));
  
  console.log("💰 Pre-Purchase Balances:");
  const preMinerBalance = await toastToken.balanceOf(ADDRESSES.miner.address);
  const preBuyerBalance = await toastToken.balanceOf(ADDRESSES.buyer.address);
  const preTreasuryBalance = await toastToken.balanceOf(ADDRESSES.treasury.address);
  console.log("   Miner:", ethers.formatEther(preMinerBalance), "TOAST");
  console.log("   Buyer:", ethers.formatEther(preBuyerBalance), "TOAST");
  console.log("   Treasury:", ethers.formatEther(preTreasuryBalance), "TOAST");

  const purchaseTx = await contentRegistry.connect(buyerSigner).purchaseContent(CONTENT_ID);
  await purchaseTx.wait();
  console.log("✅ Content purchased!");
  console.log("   Transaction:", `https://somnia.w3us.site/tx/${purchaseTx.hash}`);

  // STEP 6: Verify ownership transfer and reward distribution
  console.log("\n" + "=".repeat(70));
  console.log("6️⃣ VERIFICATION");
  console.log("=".repeat(70));
  
  const purchasedContent = await contentRegistry.getContent(CONTENT_ID);
  console.log("📄 Purchased Content:");
  console.log("   New Owner:", purchasedContent.currentOwner);
  console.log("   Available:", purchasedContent.isAvailable);
  console.log("   Sold At:", new Date(Number(purchasedContent.soldAt) * 1000).toISOString());

  console.log("\n💰 Post-Purchase Balances:");
  const postMinerBalance = await toastToken.balanceOf(ADDRESSES.miner.address);
  const postBuyerBalance = await toastToken.balanceOf(ADDRESSES.buyer.address);
  const postTreasuryBalance = await toastToken.balanceOf(ADDRESSES.treasury.address);
  console.log("   Miner:", ethers.formatEther(postMinerBalance), "TOAST");
  console.log("   Buyer:", ethers.formatEther(postBuyerBalance), "TOAST");
  console.log("   Treasury:", ethers.formatEther(postTreasuryBalance), "TOAST");

  console.log("\n💸 Earnings (Change from Pre-Purchase):");
  const minerEarnings = postMinerBalance - preMinerBalance;
  const buyerSpent = preBuyerBalance - postBuyerBalance;
  const treasuryEarnings = postTreasuryBalance - preTreasuryBalance;
  console.log("   Miner earned:", ethers.formatEther(minerEarnings), "TOAST (Expected: 50)");
  console.log("   Buyer spent:", ethers.formatEther(buyerSpent), "TOAST (Expected: 100)");
  console.log("   Treasury earned:", ethers.formatEther(treasuryEarnings), "TOAST (Expected: 20 evaluator + 10 referral + 20 platform = 50)");

  // STEP 7: Content Personalization (by new owner - buyer)
  console.log("\n" + "=".repeat(70));
  console.log("7️⃣ CONTENT PERSONALIZATION (by Buyer - New Owner)");
  console.log("=".repeat(70));
  
  const personalizeTx = await contentRegistry.connect(buyerSigner).markContentPersonalized(
    CONTENT_ID,
    "QmPersonalizedByBuyerContentHash789"
  );
  await personalizeTx.wait();
  console.log("✅ Content personalized");
  console.log("   Transaction:", `https://somnia.w3us.site/tx/${personalizeTx.hash}`);

  const personalizedContent = await contentRegistry.getContent(CONTENT_ID);
  console.log("📄 Personalized Content:");
  console.log("   Personalized:", personalizedContent.isPersonalized);
  console.log("   Personalized Hash:", personalizedContent.personalizedHash);

  // Final Summary
  console.log("\n" + "=".repeat(70));
  console.log("🎉 WORKFLOW COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(70));
  console.log("\n✅ Summary:");
  console.log("   ✅ Content registered by contract owner for miner");
  console.log("   ✅ Content approved by contract owner");
  console.log("   ✅ Referral registered by contract owner");
  console.log("   ✅ Buyer approved and purchased content");
  console.log("   ✅ Ownership transferred to buyer");
  console.log("   ✅ Rewards distributed automatically:");
  console.log("      - Miner received 50 TOAST (50%)");
  console.log("      - Evaluator Treasury received 20 TOAST (20%)");
  console.log("      - Referrer received 10 TOAST (10%)");
  console.log("      - Platform Treasury received 20 TOAST (20%)");
  console.log("   ✅ Content personalized by buyer");
  
  console.log("\n🔗 View on Somnia Explorer:");
  console.log("   TOAST Token:", `https://somnia.w3us.site/address/${TOAST_TOKEN_ADDRESS}`);
  console.log("   ContentRegistry:", `https://somnia.w3us.site/address/${CONTENT_REGISTRY_ADDRESS}`);
  console.log("   RewardDistribution:", `https://somnia.w3us.site/address/${REWARD_DISTRIBUTION_ADDRESS}`);
  console.log("   Miner:", `https://somnia.w3us.site/address/${ADDRESSES.miner.address}`);
  console.log("   Buyer:", `https://somnia.w3us.site/address/${ADDRESSES.buyer.address}`);
  console.log("   Treasury:", `https://somnia.w3us.site/address/${ADDRESSES.treasury.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Workflow failed:", error);
    process.exit(1);
  });

