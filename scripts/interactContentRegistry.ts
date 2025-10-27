import { ethers } from "hardhat";
import { ContentRegistry } from "../typechain-types";
import { somniaExplorer } from "./somniaExplorerAPI";

// Get contract addresses from environment
const CONTENT_REGISTRY_ADDRESS = process.env.CONTENT_REGISTRY_ADDRESS || "";
const TOAST_TOKEN_ADDRESS = process.env.TOAST_TOKEN_ADDRESS || "";

async function main() {
  const contentRegistryAddress = CONTENT_REGISTRY_ADDRESS || "0x0000000000000000000000000000000000000000";
  const toastTokenAddress = TOAST_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000";
  
  if (!CONTENT_REGISTRY_ADDRESS || !TOAST_TOKEN_ADDRESS) {
    console.log("⚠️ Some environment variables not set, using placeholder addresses for testing");
    console.log("   To test with real contracts, set:");
    console.log("   - CONTENT_REGISTRY_ADDRESS");
    console.log("   - TOAST_TOKEN_ADDRESS");
  }
  
  console.log("🔍 Interacting with Content Registry Contract");
  console.log("📍 Content Registry:", contentRegistryAddress);
  console.log("📍 TOAST Token:", toastTokenAddress);
  
  // Get signers
  const [owner, user1, user2, buyer] = await ethers.getSigners();
  console.log("👤 Owner address:", owner.address);
  console.log("👤 User1 address:", user1.address);
  console.log("👤 User2 address:", user2.address);
  console.log("👤 Buyer address:", buyer.address);
  
  // Connect to contracts
  const contentRegistry = await ethers.getContractAt("ContentRegistry", contentRegistryAddress) as unknown as ContentRegistry;
  const toastToken = await ethers.getContractAt("TOASTToken", toastTokenAddress);
  
  console.log("\n📊 Current Contract State:");
  
  // Check if contracts are deployed
  const isContentRegistryDeployed = contentRegistryAddress !== "0x0000000000000000000000000000000000000000";
  const isToastTokenDeployed = toastTokenAddress !== "0x0000000000000000000000000000000000000000";
  
  if (isContentRegistryDeployed) {
    try {
      const totalContent = await contentRegistry.totalContent();
      const roastToken = await contentRegistry.roastToken();
      const registryOwner = await contentRegistry.owner();
      const rewardDistribution = await contentRegistry.rewardDistribution();
      
      console.log("📄 Content Registry:");
      console.log("   Total Content:", totalContent.toString());
      console.log("   ROAST Token:", roastToken);
      console.log("   Owner:", registryOwner);
      console.log("   Reward Distribution:", rewardDistribution);
    } catch (error) {
      console.log("📄 Content Registry: ❌ Error reading contract state");
    }
  } else {
    console.log("📄 Content Registry: ⏳ Not deployed (using placeholder address)");
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
      const registerTx = await contentRegistry.connect(user1).registerContent(
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
      const approveTx = await contentRegistry.connect(owner).approveContent(contentId, price);
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
      const contentOwner = await contentRegistry.getContentOwner(contentId);
      
      console.log("📄 Content Details:");
      console.log("   ID:", content.contentId.toString());
      console.log("   Creator:", content.creator);
      console.log("   Owner:", content.currentOwner);
      console.log("   Price:", ethers.formatEther(content.price), "ROAST");
      console.log("   Available:", content.isAvailable);
      console.log("   Approved:", content.isApproved);
      console.log("   Content Type:", content.contentType);
      console.log("   Is Available (query):", isAvailable);
      console.log("   Owner (query):", contentOwner);
    } catch (error) {
      console.log("❌ Content query failed:", error);
    }
    
    // Test 4: Purchase content (if buyer has tokens)
    console.log("\n4️⃣ Testing content purchase...");
    try {
      // First, give buyer some tokens and approve the contract
      if (isToastTokenDeployed) {
        await toastToken.connect(owner).transfer(buyer.address, ethers.parseEther("1000"));
        await toastToken.connect(buyer).approve(contentRegistryAddress, price);
        
        const purchaseTx = await contentRegistry.connect(buyer).purchaseContent(contentId);
        await purchaseTx.wait();
        console.log("✅ Content purchased successfully");
        console.log("🔗 Transaction:", `https://somnia.w3us.site/tx/${purchaseTx.hash}`);
        
        // Check final state
        const finalContent = await contentRegistry.getContent(contentId);
        console.log("📄 Final Content State:");
        console.log("   Owner:", finalContent.currentOwner);
        console.log("   Available:", finalContent.isAvailable);
      } else {
        console.log("⏳ Skipping purchase test - TOAST token not deployed");
      }
    } catch (error) {
      console.log("❌ Content purchase failed:", error);
    }
    
    // Test 5: Mark content as personalized
    console.log("\n5️⃣ Testing content personalization...");
    try {
      const personalizeTx = await contentRegistry.connect(buyer).markContentAsPersonalized(contentId);
      await personalizeTx.wait();
      console.log("✅ Content marked as personalized successfully");
      console.log("🔗 Transaction:", `https://somnia.w3us.site/tx/${personalizeTx.hash}`);
      
      const personalizedContent = await contentRegistry.getContent(contentId);
      console.log("📄 Personalized Content State:");
      console.log("   Is Personalized:", personalizedContent.isPersonalized);
    } catch (error) {
      console.log("❌ Content personalization failed:", error);
    }
  }
  
  console.log("\n🎉 Content Registry interaction completed successfully!");
  
  // Final summary with explorer links
  console.log("\n🔍 Monitor all transactions on Somnia Shannon Explorer:");
  console.log(`   Content Registry: https://somnia.w3us.site/address/${contentRegistryAddress}`);
  console.log(`   TOAST Token: https://somnia.w3us.site/address/${toastTokenAddress}`);
  console.log(`   Owner: https://somnia.w3us.site/address/${owner.address}`);
  console.log(`   User1: https://somnia.w3us.site/address/${user1.address}`);
  console.log(`   User2: https://somnia.w3us.site/address/${user2.address}`);
  console.log(`   Buyer: https://somnia.w3us.site/address/${buyer.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Interaction failed:", error);
    process.exit(1);
  });
