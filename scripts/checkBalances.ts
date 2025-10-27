import { ethers } from "hardhat";

// Contract addresses on Somnia testnet
const TOAST_TOKEN_ADDRESS = "0x883bA39bA9b2d9724cC42715d6A105C3FA3A7578";
const CONTENT_REGISTRY_ADDRESS = "0x0C24f048Ba3b06978519e1Ef570Ec53497aa5f0f";
const REWARD_DISTRIBUTION_ADDRESS = "0x76237519643E2361FE197Ff255FbB5F2e4b48F7e";

async function main() {
  console.log("🔍 Checking TOAST Token Balances on Somnia Testnet");
  console.log("=".repeat(60));

  // Get signers
  const [owner] = await ethers.getSigners();
  console.log("👤 Owner address:", owner.address);

  // Connect to TOAST Token contract
  const toastToken = await ethers.getContractAt("TOASTToken", TOAST_TOKEN_ADDRESS);

  console.log("\n💰 TOAST Token Balances:");
  console.log("-".repeat(30));

  // Check balances
  const ownerBalance = await toastToken.balanceOf(owner.address);
  const contentRegistryBalance = await toastToken.balanceOf(CONTENT_REGISTRY_ADDRESS);
  const rewardDistributionBalance = await toastToken.balanceOf(REWARD_DISTRIBUTION_ADDRESS);

  console.log("👤 Owner:", ethers.formatEther(ownerBalance), "TOAST");
  console.log("📄 Content Registry:", ethers.formatEther(contentRegistryBalance), "TOAST");
  console.log("💰 Reward Distribution:", ethers.formatEther(rewardDistributionBalance), "TOAST");

  console.log("\n📊 Total Supply Check:");
  const totalSupply = await toastToken.totalSupply();
  console.log("🪙 Total Supply:", ethers.formatEther(totalSupply), "TOAST");

  console.log("\n🔍 Contract Addresses:");
  console.log("📍 TOAST Token:", TOAST_TOKEN_ADDRESS);
  console.log("📍 Content Registry:", CONTENT_REGISTRY_ADDRESS);
  console.log("📍 Reward Distribution:", REWARD_DISTRIBUTION_ADDRESS);

  console.log("\n📋 Analysis:");
  console.log("-".repeat(30));
  
  if (contentRegistryBalance > 0) {
    console.log("⚠️  Content Registry has", ethers.formatEther(contentRegistryBalance), "TOAST tokens");
    console.log("   This means tokens are accumulating in the registry contract");
  } else {
    console.log("✅ Content Registry has 0 TOAST tokens");
    console.log("   This is correct - tokens should flow through, not accumulate");
  }

  if (rewardDistributionBalance > 0) {
    console.log("💰 Reward Distribution has", ethers.formatEther(rewardDistributionBalance), "TOAST tokens");
    console.log("   This is correct - tokens are available for distribution");
  } else {
    console.log("⚠️  Reward Distribution has 0 TOAST tokens");
    console.log("   This might cause issues with automatic distribution");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Balance check failed:", error);
    process.exit(1);
  });
